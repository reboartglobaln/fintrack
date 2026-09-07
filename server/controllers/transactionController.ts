import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import { Transaction, Category, Budget, RecurringRule } from '../models/index';
import { convertCurrency } from '../services/currencyService';

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const {
      startDate,
      endDate,
      type,
      category_id,
      search,
      page = '1',
      limit = '10',
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const where: any = { user_id: userId };

    if (startDate && typeof startDate === 'string') {
      where.date = { ...where.date, [Op.gte]: startDate };
    }
    if (endDate && typeof endDate === 'string') {
      where.date = { ...where.date, [Op.lte]: endDate };
    }
    if (type && type !== 'all' && (type === 'income' || type === 'expense')) {
      where.type = type;
    }
    if (category_id && category_id !== 'all') {
      where.category_id = Number(category_id);
    }
    if (search && typeof search === 'string' && search.trim() !== '') {
      where.description = { [Op.iLike]: `%${search.trim()}%` };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);

    const orderField = sortBy === 'amount' ? 'amount' : 'date';
    const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category' }],
      order: [[orderField, orderDir]],
      offset: (pageNum - 1) * limitNum,
      limit: limitNum,
    });

    const totalPages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat transaksi.', error: (error as Error).message });
  }
};

export const getTransactionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const txId = Number(req.params.id);

    const tx = await Transaction.findOne({
      where: { id: txId, user_id: userId },
      include: [{ model: Category, as: 'category' }],
    });

    if (!tx) {
      res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
      return;
    }

    res.json({ success: true, data: tx });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat data transaksi.' });
  }
};

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const {
      amount,
      description,
      category_id,
      date,
      type,
      is_recurring = false,
      recurring_interval = null,
      currency = 'IDR',
    } = req.body;

    const category = await Category.findByPk(Number(category_id));
    if (!category) {
      res.status(400).json({ success: false, message: 'Kategori yang dipilih tidak valid.' });
      return;
    }

    const newTx = await Transaction.create({
      user_id: userId,
      category_id: Number(category_id),
      amount: Number(amount),
      description,
      date,
      type,
      is_recurring: Boolean(is_recurring),
      recurring_interval: is_recurring ? recurring_interval : null,
      currency: currency || 'IDR',
      exchange_rate: 1.0,
    });

    if (is_recurring && recurring_interval) {
      const d = new Date(date);
      if (recurring_interval === 'daily') d.setDate(d.getDate() + 1);
      else if (recurring_interval === 'weekly') d.setDate(d.getDate() + 7);
      else if (recurring_interval === 'monthly') d.setMonth(d.getMonth() + 1);
      else if (recurring_interval === 'yearly') d.setFullYear(d.getFullYear() + 1);

      const nextRun = d.toISOString().split('T')[0];

      await RecurringRule.create({
        user_id: userId,
        category_id: Number(category_id),
        amount: Number(amount),
        description,
        type,
        recurring_interval,
        next_run_date: nextRun,
        last_run_date: date,
        is_active: true,
      });
    }

    let budgetAlert = null;
    if (type === 'expense') {
      const txDate = new Date(date);
      const txMonth = txDate.getMonth() + 1;
      const txYear = txDate.getFullYear();
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const startDate = `${txYear}-${pad(txMonth)}-01`;
      const endDate = `${txYear}-${pad(txMonth)}-31`;

      const budget = await Budget.findOne({
        where: { user_id: userId, category_id: Number(category_id), month: txMonth, year: txYear },
      });

      if (budget && Number(budget.amount) > 0) {
        const totalSpent = (await Transaction.sum('amount', {
          where: {
            user_id: userId,
            category_id: Number(category_id),
            type: 'expense',
            date: { [Op.gte]: startDate, [Op.lte]: endDate },
          },
        })) || 0;

        const percentage = Math.round((totalSpent / Number(budget.amount)) * 100);
        const threshold = budget.alert_threshold || 80;

        if (percentage >= 100) {
          budgetAlert = {
            categoryName: category.name,
            spent: totalSpent,
            budgetAmount: Number(budget.amount),
            percentage,
            level: 'danger',
            message: `⚠️ PERINGATAN ANGGARAN (100%+): Pengeluaran untuk "${category.name}" telah melampaui batas anggaran (${percentage}%)!`,
          };
        } else if (percentage >= threshold) {
          budgetAlert = {
            categoryName: category.name,
            spent: totalSpent,
            budgetAmount: Number(budget.amount),
            percentage,
            level: 'warning',
            message: `⚠️ PERINGATAN ANGGARAN (${threshold}%+): Pengeluaran untuk "${category.name}" telah mencapai ${percentage}% dari batas anggaran!`,
          };
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Transaksi berhasil disimpan.',
      data: {
        ...newTx.get({ plain: true }),
        category,
      },
      budgetAlert,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal membuat transaksi baru.', error: (error as Error).message });
  }
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const txId = Number(req.params.id);
    const { amount, description, category_id, date, type, is_recurring, recurring_interval, currency } = req.body;

    const tx = await Transaction.findOne({ where: { id: txId, user_id: userId } });

    if (!tx) {
      res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
      return;
    }

    const updates: any = {};
    if (amount !== undefined) updates.amount = Number(amount);
    if (description !== undefined) updates.description = description;
    if (category_id !== undefined) updates.category_id = Number(category_id);
    if (date !== undefined) updates.date = date;
    if (type !== undefined) updates.type = type;
    if (is_recurring !== undefined) updates.is_recurring = Boolean(is_recurring);
    if (recurring_interval !== undefined) updates.recurring_interval = recurring_interval;
    if (currency !== undefined) updates.currency = currency;

    await tx.update(updates);

    const category = await Category.findByPk(tx.category_id);

    let budgetAlert = null;
    if (tx.type === 'expense') {
      const txDate = new Date(tx.date);
      const txMonth = txDate.getMonth() + 1;
      const txYear = txDate.getFullYear();
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const startDate = `${txYear}-${pad(txMonth)}-01`;
      const endDate = `${txYear}-${pad(txMonth)}-31`;

      const budget = await Budget.findOne({
        where: { user_id: userId, category_id: tx.category_id, month: txMonth, year: txYear },
      });

      if (budget && Number(budget.amount) > 0) {
        const totalSpent = (await Transaction.sum('amount', {
          where: {
            user_id: userId,
            category_id: tx.category_id,
            type: 'expense',
            date: { [Op.gte]: startDate, [Op.lte]: endDate },
          },
        })) || 0;

        const percentage = Math.round((totalSpent / Number(budget.amount)) * 100);
        const threshold = budget.alert_threshold || 80;

        if (percentage >= 100) {
          budgetAlert = {
            categoryName: category?.name || 'Kategori',
            spent: totalSpent,
            budgetAmount: Number(budget.amount),
            percentage,
            level: 'danger',
            message: `⚠️ PERINGATAN ANGGARAN (100%+): Pengeluaran untuk "${category?.name}" telah melampaui batas anggaran (${percentage}%)!`,
          };
        } else if (percentage >= threshold) {
          budgetAlert = {
            categoryName: category?.name || 'Kategori',
            spent: totalSpent,
            budgetAmount: Number(budget.amount),
            percentage,
            level: 'warning',
            message: `⚠️ PERINGATAN ANGGARAN (${threshold}%+): Pengeluaran untuk "${category?.name}" telah mencapai ${percentage}% dari batas anggaran!`,
          };
        }
      }
    }

    res.json({
      success: true,
      message: 'Transaksi berhasil diperbarui.',
      data: {
        ...tx.get({ plain: true }),
        category,
      },
      budgetAlert,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui transaksi.' });
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const txId = Number(req.params.id);

    const deleted = await Transaction.destroy({ where: { id: txId, user_id: userId } });
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
      return;
    }

    res.json({
      success: true,
      message: 'Transaksi berhasil dihapus.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus transaksi.' });
  }
};
