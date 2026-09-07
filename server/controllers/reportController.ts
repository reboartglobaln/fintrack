import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import { Transaction, Category } from '../models/index';

export const getSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    const currentMonthPrefix = `${currentYear}-${pad(currentMonth)}`;
    const lastMonthDate = new Date(currentYear, now.getMonth() - 1, 1);
    const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${pad(lastMonthDate.getMonth() + 1)}`;

    // Total balance (all time)
    const totalIncomeAllTime = (await Transaction.sum('amount', { where: { user_id: userId, type: 'income' } })) || 0;
    const totalExpenseAllTime = (await Transaction.sum('amount', { where: { user_id: userId, type: 'expense' } })) || 0;
    const totalBalance = totalIncomeAllTime - totalExpenseAllTime;

    // Current month calculations
    const currentMonthIncome = (await Transaction.sum('amount', { 
      where: { user_id: userId, type: 'income', date: { [Op.startsWith]: currentMonthPrefix } } 
    })) || 0;
    const currentMonthExpense = (await Transaction.sum('amount', { 
      where: { user_id: userId, type: 'expense', date: { [Op.startsWith]: currentMonthPrefix } } 
    })) || 0;
    const currentMonthNet = currentMonthIncome - currentMonthExpense;
    const savingsRate = currentMonthIncome > 0 ? Math.round((currentMonthNet / currentMonthIncome) * 100) : 0;

    // Last month calculations for growth %
    const lastMonthIncome = (await Transaction.sum('amount', { 
      where: { user_id: userId, type: 'income', date: { [Op.startsWith]: lastMonthPrefix } } 
    })) || 0;
    const lastMonthExpense = (await Transaction.sum('amount', { 
      where: { user_id: userId, type: 'expense', date: { [Op.startsWith]: lastMonthPrefix } } 
    })) || 0;

    const calcGrowth = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const incomeGrowth = calcGrowth(currentMonthIncome, lastMonthIncome);
    const expenseGrowth = calcGrowth(currentMonthExpense, lastMonthExpense);

    // Recent 5 transactions
    const recent = await Transaction.findAll({
      where: { user_id: userId },
      order: [['date', 'DESC']],
      limit: 5,
      include: [{ model: Category, as: 'category' }]
    });

    // Top expense categories
    const currentMonthExpenseTx = await Transaction.findAll({
      where: { user_id: userId, type: 'expense', date: { [Op.startsWith]: currentMonthPrefix } },
      include: [{ model: Category, as: 'category' }]
    });

    const categoryTotals: Record<number, { amount: number, category: any }> = {};
    currentMonthExpenseTx.forEach(t => {
      const amount = Number(t.amount);
      if (!categoryTotals[t.category_id]) {
        categoryTotals[t.category_id] = { amount: 0, category: t.get({plain:true}).category };
      }
      categoryTotals[t.category_id].amount += amount;
    });

    const topCategories = Object.values(categoryTotals)
      .map(item => ({
        id: item.category?.id || 0,
        name: item.category?.name || 'Lainnya',
        color: item.category?.color || '#0ea5e9',
        icon: item.category?.icon || 'Tag',
        amount: item.amount,
        percentage: currentMonthExpense > 0 ? Math.round((item.amount / currentMonthExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    res.json({
      success: true,
      data: {
        totalBalance,
        monthIncome: currentMonthIncome,
        monthExpense: currentMonthExpense,
        monthNetSavings: currentMonthNet,
        savingsRate,
        incomeGrowth,
        expenseGrowth,
        period: {
          month: currentMonth,
          year: currentYear,
        },
        recentTransactions: recent,
        topExpenseCategories: topCategories,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat ringkasan keuangan.' });
  }
};

export const getTrend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { months = '6' } = req.query;
    const monthCount = Math.min(12, Math.max(3, parseInt(months as string, 10) || 6));

    const now = new Date();
    const labels: string[] = [];
    const incomeData: number[] = [];
    const expenseData: number[] = [];
    const netData: number[] = [];

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const prefix = `${year}-${pad(month)}`;

      labels.push(`${monthNames[d.getMonth()]} ${year}`);

      const inc = (await Transaction.sum('amount', { where: { user_id: userId, type: 'income', date: { [Op.startsWith]: prefix } } })) || 0;
      const exp = (await Transaction.sum('amount', { where: { user_id: userId, type: 'expense', date: { [Op.startsWith]: prefix } } })) || 0;

      incomeData.push(inc);
      expenseData.push(exp);
      netData.push(inc - exp);
    }

    res.json({
      success: true,
      data: {
        labels,
        income: incomeData,
        expense: expenseData,
        net: netData,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat data tren keuangan.' });
  }
};

export const getCategoryBreakdown = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { type = 'expense', startDate, endDate } = req.query;

    const where: any = { user_id: userId, type };

    if (startDate && typeof startDate === 'string') {
      where.date = { ...where.date, [Op.gte]: startDate };
    }
    if (endDate && typeof endDate === 'string') {
      where.date = { ...where.date, [Op.lte]: endDate };
    }

    const txs = await Transaction.findAll({ 
      where,
      include: [{ model: Category, as: 'category' }]
    });

    const catMap: Record<number, { amount: number, category: any }> = {};
    let total = 0;

    txs.forEach((t) => {
      const amount = Number(t.amount);
      if (!catMap[t.category_id]) {
        catMap[t.category_id] = { amount: 0, category: t.get({plain:true}).category };
      }
      catMap[t.category_id].amount += amount;
      total += amount;
    });

    const breakdown = Object.values(catMap).map(item => ({
      id: item.category?.id || 0,
      name: item.category?.name || 'Kategori Lain',
      icon: item.category?.icon || 'Tag',
      color: item.category?.color || '#94a3b8',
      amount: item.amount,
      percentage: total > 0 ? Math.round((item.amount / total) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    res.json({
      success: true,
      total,
      data: breakdown,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat rincian kategori.' });
  }
};

export const exportCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { startDate, endDate, type, category_id } = req.query;

    const where: any = { user_id: userId };

    if (startDate && typeof startDate === 'string') where.date = { ...where.date, [Op.gte]: startDate };
    if (endDate && typeof endDate === 'string') where.date = { ...where.date, [Op.lte]: endDate };
    if (type && type !== 'all') where.type = type;
    if (category_id && category_id !== 'all') where.category_id = Number(category_id);

    const txs = await Transaction.findAll({
      where,
      include: [{ model: Category, as: 'category' }],
      order: [['date', 'DESC']]
    });

    // Build CSV content
    const headers = ['ID', 'Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Nominal', 'Mata Uang', 'Transaksi Berulang'];
    const rows = txs.map((t) => {
      const plain = t.get({plain:true});
      const cat = plain.category;
      const safeDesc = `"${t.description.replace(/"/g, '""')}"`;
      const catName = `"${(cat?.name || 'Umum').replace(/"/g, '""')}"`;
      const typeLabel = t.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
      const recurringLabel = t.is_recurring ? `Ya (${t.recurring_interval || 'berulang'})` : 'Tidak';

      return [t.id, t.date, safeDesc, catName, typeLabel, t.amount, t.currency || 'IDR', recurringLabel].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="fintrack_laporan_transaksi.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengekspor data ke CSV.' });
  }
};
