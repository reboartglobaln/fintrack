import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import { RecurringRule, Transaction, Category } from '../models/index';

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

    const rules = await RecurringRule.findAll({
      where: { user_id: userId },
      include: [{ model: Category, as: 'category' }]
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

    const nextDate = start_date || new Date().toISOString().split('T')[0];

    const newRule = await RecurringRule.create({
      user_id: userId,
      category_id: Number(category_id),
      amount: Number(amount),
      description,
      type,
      recurring_interval,
      next_run_date: nextDate,
      last_run_date: null,
      is_active: true,
    });

    const category = await Category.findByPk(Number(category_id));

    res.status(201).json({
      success: true,
      message: 'Transaksi berulang berhasil ditambahkan.',
      data: { ...newRule.get({ plain: true }), category },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal membuat transaksi berulang.' });
  }
};

export const toggleRecurringRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const ruleId = Number(req.params.id);

    const rule = await RecurringRule.findOne({ where: { id: ruleId, user_id: userId } });
    if (!rule) {
      res.status(404).json({ success: false, message: 'Aturan transaksi berulang tidak ditemukan.' });
      return;
    }

    await rule.update({ is_active: !rule.is_active });

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

    const deleted = await RecurringRule.destroy({ where: { id: ruleId, user_id: userId } });
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Aturan transaksi berulang tidak ditemukan.' });
      return;
    }

    res.json({ success: true, message: 'Transaksi berulang berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus aturan transaksi berulang.' });
  }
};

export const processDueRecurring = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const today = new Date().toISOString().split('T')[0];

    const dueRules = await RecurringRule.findAll({
      where: {
        user_id: userId,
        is_active: true,
        next_run_date: { [Op.lte]: today }
      }
    });

    let processedCount = 0;

    for (const rule of dueRules) {
      await Transaction.create({
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
      });

      await rule.update({
        last_run_date: today,
        next_run_date: calculateNextDate(rule.next_run_date, rule.recurring_interval)
      });
      processedCount++;
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
