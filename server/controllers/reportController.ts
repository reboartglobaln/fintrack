import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { loadDb } from '../services/dbStore';

export const getSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const db = loadDb();

    const userTx = db.transactions.filter((t) => t.user_id === userId);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    const currentMonthPrefix = `${currentYear}-${pad(currentMonth)}`;
    const lastMonthDate = new Date(currentYear, now.getMonth() - 1, 1);
    const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${pad(lastMonthDate.getMonth() + 1)}`;

    // Total balance (all time)
    const totalIncomeAllTime = userTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenseAllTime = userTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totalBalance = totalIncomeAllTime - totalExpenseAllTime;

    // Current month calculations
    const currentMonthTx = userTx.filter((t) => t.date.startsWith(currentMonthPrefix));
    const currentMonthIncome = currentMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const currentMonthExpense = currentMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const currentMonthNet = currentMonthIncome - currentMonthExpense;
    const savingsRate = currentMonthIncome > 0 ? Math.round((currentMonthNet / currentMonthIncome) * 100) : 0;

    // Last month calculations for growth %
    const lastMonthTx = userTx.filter((t) => t.date.startsWith(lastMonthPrefix));
    const lastMonthIncome = lastMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const lastMonthExpense = lastMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const calcGrowth = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const incomeGrowth = calcGrowth(currentMonthIncome, lastMonthIncome);
    const expenseGrowth = calcGrowth(currentMonthExpense, lastMonthExpense);

    // Recent 5 transactions
    const recent = [...userTx]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((tx) => {
        const category = db.categories.find((c) => c.id === tx.category_id);
        return { ...tx, category };
      });

    // Top expense categories
    const categoryTotals: Record<number, number> = {};
    currentMonthTx
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        categoryTotals[t.category_id] = (categoryTotals[t.category_id] || 0) + t.amount;
      });

    const topCategories = Object.entries(categoryTotals)
      .map(([catId, amount]) => {
        const cat = db.categories.find((c) => c.id === Number(catId));
        return {
          id: Number(catId),
          name: cat?.name || 'Lainnya',
          color: cat?.color || '#0ea5e9',
          icon: cat?.icon || 'Tag',
          amount,
          percentage: currentMonthExpense > 0 ? Math.round((amount / currentMonthExpense) * 100) : 0,
        };
      })
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

    const db = loadDb();
    const userTx = db.transactions.filter((t) => t.user_id === userId);

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

      const monthTx = userTx.filter((t) => t.date.startsWith(prefix));
      const inc = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

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

    const db = loadDb();
    let txs = db.transactions.filter((t) => t.user_id === userId && t.type === type);

    if (startDate && typeof startDate === 'string') {
      txs = txs.filter((t) => t.date >= startDate);
    }
    if (endDate && typeof endDate === 'string') {
      txs = txs.filter((t) => t.date <= endDate);
    }

    const catMap: Record<number, number> = {};
    let total = 0;

    txs.forEach((t) => {
      catMap[t.category_id] = (catMap[t.category_id] || 0) + t.amount;
      total += t.amount;
    });

    const breakdown = Object.entries(catMap).map(([catId, amount]) => {
      const cat = db.categories.find((c) => c.id === Number(catId));
      return {
        id: Number(catId),
        name: cat?.name || 'Kategori Lain',
        icon: cat?.icon || 'Tag',
        color: cat?.color || '#94a3b8',
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      };
    }).sort((a, b) => b.amount - a.amount);

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

    const db = loadDb();
    let txs = db.transactions.filter((t) => t.user_id === userId);

    if (startDate && typeof startDate === 'string') txs = txs.filter((t) => t.date >= startDate);
    if (endDate && typeof endDate === 'string') txs = txs.filter((t) => t.date <= endDate);
    if (type && type !== 'all') txs = txs.filter((t) => t.type === type);
    if (category_id && category_id !== 'all') txs = txs.filter((t) => t.category_id === Number(category_id));

    // Sort by date descending
    txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Build CSV content
    const headers = ['ID', 'Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Nominal', 'Mata Uang', 'Transaksi Berulang'];
    const rows = txs.map((t) => {
      const cat = db.categories.find((c) => c.id === t.category_id);
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
