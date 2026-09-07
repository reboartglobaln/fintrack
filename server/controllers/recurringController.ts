import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { loadDb, saveDb, DbRecurringRule, DbTransaction } from '../services/dbStore';

function calculateNextDate(currentDateStr: string, interval: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
  const d = new Date(currentDateStr);
  if (interval === 'daily') d.setDate(d.getDate() + 1);
  else if (interval === 'weekly') d.setDate(d.getDate() + 7);
  else if (interval === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (interval === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

export const getRecurringRules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const db = loadDb();

    const rules = db.recurring_rules
      .filter((r) => r.user_id === userId)
      .map((r) => {
        const category = db.categories.find((c) => c.id === r.category_id);
        return {
          ...r,
          category,
        };
      });

    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat aturan transaksi berulang.' });
  }
};

export const createRecurringRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { category_id, amount, description, type, recurring_interval, start_date } = req.body;

    if (!category_id || !amount || !description || !type || !recurring_interval) {
      res.status(400).json({ success: false, message: 'Semua field wajib diisi.' });
      return;
    }

    const db = loadDb();
    const now = new Date().toISOString();
    const nextDate = start_date || new Date().toISOString().split('T')[0];

    const newRule: DbRecurringRule = {
      id: db.nextIds.recurring_rules++,
      user_id: userId,
      category_id: Number(category_id),
      amount: Number(amount),
      description,
      type,
      recurring_interval,
      next_run_date: nextDate,
      last_run_date: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    db.recurring_rules.push(newRule);
    saveDb(db);

    const category = db.categories.find((c) => c.id === newRule.category_id);

    res.status(201).json({
      success: true,
      message: 'Transaksi berulang berhasil ditambahkan.',
      data: { ...newRule, category },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal membuat transaksi berulang.' });
  }
};

export const toggleRecurringRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const ruleId = Number(req.params.id);
    const db = loadDb();

    const rule = db.recurring_rules.find((r) => r.id === ruleId && r.user_id === userId);
    if (!rule) {
      res.status(404).json({ success: false, message: 'Aturan transaksi berulang tidak ditemukan.' });
      return;
    }

    rule.is_active = !rule.is_active;
    rule.updated_at = new Date().toISOString();
    saveDb(db);

    res.json({
      success: true,
      message: `Transaksi berulang berhasil ${rule.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`,
      data: rule,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengubah status transaksi berulang.' });
  }
};

export const deleteRecurringRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const ruleId = Number(req.params.id);
    const db = loadDb();

    const idx = db.recurring_rules.findIndex((r) => r.id === ruleId && r.user_id === userId);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Aturan transaksi berulang tidak ditemukan.' });
      return;
    }

    db.recurring_rules.splice(idx, 1);
    saveDb(db);

    res.json({ success: true, message: 'Transaksi berulang berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus aturan transaksi berulang.' });
  }
};

export const processDueRecurring = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const db = loadDb();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const dueRules = db.recurring_rules.filter(
      (r) => r.user_id === userId && r.is_active && r.next_run_date <= today
    );

    let processedCount = 0;

    dueRules.forEach((rule) => {
      // 1. Create transaction
      const newTx: DbTransaction = {
        id: db.nextIds.transactions++,
        user_id: userId,
        category_id: rule.category_id,
        amount: rule.amount,
        description: `[Otomatis] ${rule.description}`,
        date: today,
        type: rule.type,
        is_recurring: true,
        recurring_interval: rule.recurring_interval,
        currency: 'IDR',
        exchange_rate: 1.0,
        created_at: now,
        updated_at: now,
      };

      db.transactions.push(newTx);

      // 2. Advance next_run_date
      rule.last_run_date = today;
      rule.next_run_date = calculateNextDate(rule.next_run_date, rule.recurring_interval);
      rule.updated_at = now;
      processedCount++;
    });

    if (processedCount > 0) {
      saveDb(db);
    }

    res.json({
      success: true,
      message: `${processedCount} transaksi berulang yang jatuh tempo berhasil diproses.`,
      processedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memproses transaksi berulang.' });
  }
};
