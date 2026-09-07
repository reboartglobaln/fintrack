import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { loadDb, saveDb, DbTransaction } from '../services/dbStore';
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

    const db = loadDb();

    // 1. Filter by user
    let results = db.transactions.filter((t) => t.user_id === userId);

    // 2. Filter by date range
    if (startDate && typeof startDate === 'string') {
      results = results.filter((t) => t.date >= startDate);
    }
    if (endDate && typeof endDate === 'string') {
      results = results.filter((t) => t.date <= endDate);
    }

    // 3. Filter by type
    if (type && type !== 'all' && (type === 'income' || type === 'expense')) {
      results = results.filter((t) => t.type === type);
    }

    // 4. Filter by category
    if (category_id && category_id !== 'all') {
      const catId = Number(category_id);
      results = results.filter((t) => t.category_id === catId);
    }

    // 5. Search by description
    if (search && typeof search === 'string' && search.trim() !== '') {
      const query = search.trim().toLowerCase();
      results = results.filter((t) => t.description.toLowerCase().includes(query));
    }

    // 6. Sort
    results.sort((a, b) => {
      if (sortBy === 'amount') {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      // default sortBy date
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    const total = results.length;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const totalPages = Math.ceil(total / limitNum);

    const paginated = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    // Attach category object for frontend convenience
    const enriched = paginated.map((tx) => {
      const category = db.categories.find((c) => c.id === tx.category_id) || {
        id: tx.category_id,
        name: 'Umum',
        icon: 'Tag',
        color: '#94a3b8',
        type: tx.type,
      };
      return {
        ...tx,
        category,
      };
    });

    res.json({
      success: true,
      data: enriched,
      pagination: {
        total,
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
    const db = loadDb();

    const tx = db.transactions.find((t) => t.id === txId && t.user_id === userId);
    if (!tx) {
      res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
      return;
    }

    const category = db.categories.find((c) => c.id === tx.category_id);

    res.json({
      success: true,
      data: {
        ...tx,
        category,
      },
    });
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

    const db = loadDb();

    // Verify category exists
    const category = db.categories.find((c) => c.id === Number(category_id));
    if (!category) {
      res.status(400).json({ success: false, message: 'Kategori yang dipilih tidak valid.' });
      return;
    }

    const now = new Date().toISOString();
    const newTx: DbTransaction = {
      id: db.nextIds.transactions++,
      user_id: userId,
      category_id: Number(category_id),
      amount: Number(amount),
      description,
      date,
      type: type as 'income' | 'expense',
      is_recurring: Boolean(is_recurring),
      recurring_interval: is_recurring ? recurring_interval : null,
      currency: currency || 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    };

    db.transactions.push(newTx);

    // If recurring was flagged, create a recurring rule automatically if not existing
    if (is_recurring && recurring_interval) {
      // calculate next run date
      const d = new Date(date);
      if (recurring_interval === 'daily') d.setDate(d.getDate() + 1);
      else if (recurring_interval === 'weekly') d.setDate(d.getDate() + 7);
      else if (recurring_interval === 'monthly') d.setMonth(d.getMonth() + 1);
      else if (recurring_interval === 'yearly') d.setFullYear(d.getFullYear() + 1);

      const nextRun = d.toISOString().split('T')[0];

      db.recurring_rules.push({
        id: db.nextIds.recurring_rules++,
        user_id: userId,
        category_id: Number(category_id),
        amount: Number(amount),
        description,
        type: type as 'income' | 'expense',
        recurring_interval,
        next_run_date: nextRun,
        last_run_date: date,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }

    // Check budget limit & threshold notification for expense
    let budgetAlert = null;
    if (newTx.type === 'expense') {
      const txDate = new Date(newTx.date);
      const txMonth = txDate.getMonth() + 1;
      const txYear = txDate.getFullYear();

      const budget = db.budgets.find(
        (b) =>
          b.user_id === userId &&
          b.category_id === newTx.category_id &&
          b.month === txMonth &&
          b.year === txYear
      );

      if (budget && budget.amount > 0) {
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        const monthPrefix = `${txYear}-${pad(txMonth)}`;
        const totalSpent = db.transactions
          .filter(
            (t) =>
              t.user_id === userId &&
              t.category_id === newTx.category_id &&
              t.type === 'expense' &&
              t.date.startsWith(monthPrefix)
          )
          .reduce((sum, t) => sum + t.amount, 0);

        const percentage = Math.round((totalSpent / budget.amount) * 100);
        const threshold = budget.alert_threshold || 80;

        if (percentage >= 100) {
          budgetAlert = {
            categoryName: category.name,
            spent: totalSpent,
            budgetAmount: budget.amount,
            percentage,
            level: 'danger',
            message: `⚠️ PERINGATAN ANGGARAN (100%+): Pengeluaran untuk "${category.name}" telah melampaui batas anggaran (${percentage}%)!`,
          };
        } else if (percentage >= threshold) {
          budgetAlert = {
            categoryName: category.name,
            spent: totalSpent,
            budgetAmount: budget.amount,
            percentage,
            level: 'warning',
            message: `⚠️ PERINGATAN ANGGARAN (${threshold}%+): Pengeluaran untuk "${category.name}" telah mencapai ${percentage}% dari batas anggaran!`,
          };
        }
      }
    }

    saveDb(db);

    res.status(201).json({
      success: true,
      message: 'Transaksi berhasil disimpan.',
      data: {
        ...newTx,
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

    const db = loadDb();
    const tx = db.transactions.find((t) => t.id === txId && t.user_id === userId);

    if (!tx) {
      res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
      return;
    }

    if (amount !== undefined) tx.amount = Number(amount);
    if (description !== undefined) tx.description = description;
    if (category_id !== undefined) tx.category_id = Number(category_id);
    if (date !== undefined) tx.date = date;
    if (type !== undefined) tx.type = type;
    if (is_recurring !== undefined) tx.is_recurring = Boolean(is_recurring);
    if (recurring_interval !== undefined) tx.recurring_interval = recurring_interval;
    if (currency !== undefined) tx.currency = currency;
    tx.updated_at = new Date().toISOString();

    const category = db.categories.find((c) => c.id === tx.category_id);

    // Check budget limit & threshold notification for expense update
    let budgetAlert = null;
    if (tx.type === 'expense') {
      const txDate = new Date(tx.date);
      const txMonth = txDate.getMonth() + 1;
      const txYear = txDate.getFullYear();

      const budget = db.budgets.find(
        (b) =>
          b.user_id === userId &&
          b.category_id === tx.category_id &&
          b.month === txMonth &&
          b.year === txYear
      );

      if (budget && budget.amount > 0) {
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        const monthPrefix = `${txYear}-${pad(txMonth)}`;
        const totalSpent = db.transactions
          .filter(
            (t) =>
              t.user_id === userId &&
              t.category_id === tx.category_id &&
              t.type === 'expense' &&
              t.date.startsWith(monthPrefix)
          )
          .reduce((sum, t) => sum + t.amount, 0);

        const percentage = Math.round((totalSpent / budget.amount) * 100);
        const threshold = budget.alert_threshold || 80;

        if (percentage >= 100) {
          budgetAlert = {
            categoryName: category?.name || 'Kategori',
            spent: totalSpent,
            budgetAmount: budget.amount,
            percentage,
            level: 'danger',
            message: `⚠️ PERINGATAN ANGGARAN (100%+): Pengeluaran untuk "${category?.name}" telah melampaui batas anggaran (${percentage}%)!`,
          };
        } else if (percentage >= threshold) {
          budgetAlert = {
            categoryName: category?.name || 'Kategori',
            spent: totalSpent,
            budgetAmount: budget.amount,
            percentage,
            level: 'warning',
            message: `⚠️ PERINGATAN ANGGARAN (${threshold}%+): Pengeluaran untuk "${category?.name}" telah mencapai ${percentage}% dari batas anggaran!`,
          };
        }
      }
    }

    saveDb(db);

    res.json({
      success: true,
      message: 'Transaksi berhasil diperbarui.',
      data: {
        ...tx,
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
    const db = loadDb();

    const index = db.transactions.findIndex((t) => t.id === txId && t.user_id === userId);
    if (index === -1) {
      res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
      return;
    }

    db.transactions.splice(index, 1);
    saveDb(db);

    res.json({
      success: true,
      message: 'Transaksi berhasil dihapus.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus transaksi.' });
  }
};
