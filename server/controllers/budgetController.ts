import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { loadDb, saveDb, DbBudget } from '../services/dbStore';

export const getBudgets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();

    const db = loadDb();
    const budgets = db.budgets.filter(
      (b) => b.user_id === userId && b.month === month && b.year === year
    );

    // Calculate actual spent per budget category in this month
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const monthPrefix = `${year}-${pad(month)}`;

    const enrichedBudgets = budgets.map((b) => {
      const category = db.categories.find((c) => c.id === b.category_id);
      const spent = db.transactions
        .filter(
          (t) =>
            t.user_id === userId &&
            t.category_id === b.category_id &&
            t.type === 'expense' &&
            t.date.startsWith(monthPrefix)
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (percentage >= 100) {
        status = 'danger';
      } else if (percentage >= (b.alert_threshold || 80)) {
        status = 'warning';
      }

      return {
        ...b,
        category,
        spent,
        remaining: Math.max(0, b.amount - spent),
        percentage,
        status,
      };
    });

    res.json({
      success: true,
      month,
      year,
      data: enrichedBudgets,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat anggaran.', error: (error as Error).message });
  }
};

export const createBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { category_id, month, year, amount, alert_threshold = 80 } = req.body;

    const db = loadDb();

    // Check if budget for this category and month/year already exists
    const existing = db.budgets.find(
      (b) =>
        b.user_id === userId &&
        b.category_id === Number(category_id) &&
        b.month === Number(month) &&
        b.year === Number(year)
    );

    if (existing) {
      res.status(409).json({
        success: false,
        message: 'Anggaran untuk kategori dan periode ini sudah ada. Silakan edit anggaran yang ada.',
      });
      return;
    }

    const now = new Date().toISOString();
    const newBudget: DbBudget = {
      id: db.nextIds.budgets++,
      user_id: userId,
      category_id: Number(category_id),
      month: Number(month),
      year: Number(year),
      amount: Number(amount),
      alert_threshold: Number(alert_threshold),
      created_at: now,
      updated_at: now,
    };

    db.budgets.push(newBudget);
    saveDb(db);

    const category = db.categories.find((c) => c.id === newBudget.category_id);

    res.status(201).json({
      success: true,
      message: 'Anggaran kategori berhasil dibuat.',
      data: {
        ...newBudget,
        category,
        spent: 0,
        remaining: newBudget.amount,
        percentage: 0,
        status: 'safe',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal membuat anggaran.' });
  }
};

export const updateBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const budgetId = Number(req.params.id);
    const { amount, alert_threshold } = req.body;

    const db = loadDb();
    const budget = db.budgets.find((b) => b.id === budgetId && b.user_id === userId);

    if (!budget) {
      res.status(404).json({ success: false, message: 'Anggaran tidak ditemukan.' });
      return;
    }

    if (amount !== undefined) budget.amount = Number(amount);
    if (alert_threshold !== undefined) budget.alert_threshold = Number(alert_threshold);
    budget.updated_at = new Date().toISOString();

    saveDb(db);

    res.json({
      success: true,
      message: 'Anggaran berhasil diperbarui.',
      data: budget,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui anggaran.' });
  }
};

export const deleteBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const budgetId = Number(req.params.id);
    const db = loadDb();

    const idx = db.budgets.findIndex((b) => b.id === budgetId && b.user_id === userId);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Anggaran tidak ditemukan.' });
      return;
    }

    db.budgets.splice(idx, 1);
    saveDb(db);

    res.json({ success: true, message: 'Anggaran berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus anggaran.' });
  }
};
