import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import { Budget, Category, Transaction } from '../models/index';

export const getBudgets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();

    const budgets = await Budget.findAll({
      where: { user_id: userId, month, year },
      include: [{ model: Category, as: 'category' }],
    });

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const startDate = `${year}-${pad(month)}-01`;
    const endDate = `${year}-${pad(month)}-31`;

    const enrichedBudgets = await Promise.all(
      budgets.map(async (b) => {
        const spent = (await Transaction.sum('amount', {
          where: {
            user_id: userId,
            category_id: b.category_id,
            type: 'expense',
            date: { [Op.gte]: startDate, [Op.lte]: endDate },
          },
        })) || 0;

        const percentage = b.amount > 0 ? Math.round((spent / Number(b.amount)) * 100) : 0;
        let status: 'safe' | 'warning' | 'danger' = 'safe';
        if (percentage >= 100) {
          status = 'danger';
        } else if (percentage >= (b.alert_threshold || 80)) {
          status = 'warning';
        }

        const plain = b.get({ plain: true });
        return {
          ...plain,
          spent,
          remaining: Math.max(0, Number(b.amount) - spent),
          percentage,
          status,
        };
      })
    );

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

    const existing = await Budget.findOne({
      where: {
        user_id: userId,
        category_id: Number(category_id),
        month: Number(month),
        year: Number(year),
      },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: 'Anggaran untuk kategori dan periode ini sudah ada. Silakan edit anggaran yang ada.',
      });
      return;
    }

    const newBudget = await Budget.create({
      user_id: userId,
      category_id: Number(category_id),
      month: Number(month),
      year: Number(year),
      amount: Number(amount),
      alert_threshold: Number(alert_threshold),
    });

    const category = await Category.findByPk(Number(category_id));

    res.status(201).json({
      success: true,
      message: 'Anggaran kategori berhasil dibuat.',
      data: {
        ...newBudget.get({ plain: true }),
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

    const budget = await Budget.findOne({ where: { id: budgetId, user_id: userId } });

    if (!budget) {
      res.status(404).json({ success: false, message: 'Anggaran tidak ditemukan.' });
      return;
    }

    const updates: any = {};
    if (amount !== undefined) updates.amount = Number(amount);
    if (alert_threshold !== undefined) updates.alert_threshold = Number(alert_threshold);

    await budget.update(updates);

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

    const deleted = await Budget.destroy({ where: { id: budgetId, user_id: userId } });
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Anggaran tidak ditemukan.' });
      return;
    }

    res.json({ success: true, message: 'Anggaran berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus anggaran.' });
  }
};
