import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import {
  Transaction,
  Category,
  Budget,
  RecurringRule,
  SummaryData,
  TrendData,
  CategoryBreakdownItem,
  User,
} from '../types';
import { useToast } from '../context/ToastContext';
import { useCurrency } from '../context/CurrencyContext';
import { exportTransactionsPDF } from '../utils/pdfExport';

export function useFinance(user: User | null) {
  const { showToast } = useToast();
  const { selectedCurrency, exchangeRate } = useCurrency();

  // Primary Domain Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownItem[]>([]);

  // Selected Budget Period
  const [budgetMonth, setBudgetMonth] = useState<number>(new Date().getMonth() + 1);
  const [budgetYear, setBudgetYear] = useState<number>(new Date().getFullYear());

  // Loading flags
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessingRecurring, setIsProcessingRecurring] = useState<boolean>(false);

  // 1. Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      if (res.data?.success) {
        setCategories(res.data.data);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // 2. Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await api.get('/transactions', { params: { limit: 100 } });
      if (res.data?.success) {
        setTransactions(res.data.data);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // 3. Fetch Budgets
  const fetchBudgets = useCallback(async (month: number, year: number) => {
    try {
      const res = await api.get('/budgets', { params: { month, year } });
      if (res.data?.success) {
        setBudgets(res.data.data);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // 4. Fetch Recurring Rules
  const fetchRecurringRules = useCallback(async () => {
    try {
      const res = await api.get('/recurring');
      if (res.data?.success) {
        setRecurringRules(res.data.data);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // 5. Fetch Reports & Analytics
  const fetchReports = useCallback(async () => {
    try {
      const [sumRes, trendRes, breakRes] = await Promise.all([
        api.get('/reports/summary'),
        api.get('/reports/trend'),
        api.get('/reports/breakdown'),
      ]);

      if (sumRes.data?.success) setSummary(sumRes.data.data);
      if (trendRes.data?.success) setTrend(trendRes.data.data);
      if (breakRes.data?.success) setBreakdown(breakRes.data.data);
    } catch (e) {
      // ignore
    }
  }, []);

  // Master refresh
  const refreshAll = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    await Promise.all([
      fetchCategories(),
      fetchTransactions(),
      fetchBudgets(budgetMonth, budgetYear),
      fetchRecurringRules(),
      fetchReports(),
    ]);
    setIsLoading(false);
  }, [
    user,
    fetchCategories,
    fetchTransactions,
    fetchBudgets,
    budgetMonth,
    budgetYear,
    fetchRecurringRules,
    fetchReports,
  ]);

  useEffect(() => {
    if (user) {
      refreshAll();
    }
  }, [user, refreshAll]);

  // Update budget period
  const changeBudgetPeriod = (m: number, y: number) => {
    setBudgetMonth(m);
    setBudgetYear(y);
    fetchBudgets(m, y);
  };

  // --- TRANSACTIONS CRUD ---
  const createTransaction = async (data: any): Promise<boolean> => {
    try {
      const res = await api.post('/transactions', data);
      if (res.data?.success) {
        showToast('Transaksi berhasil dicatat!', 'success');

        // Check if budget threshold notification was triggered
        if (res.data.budgetAlert) {
          const alert = res.data.budgetAlert;
          setTimeout(() => {
            showToast(alert.message, alert.level === 'danger' ? 'error' : 'warning');
          }, 300);
        }

        refreshAll();
        return true;
      }
      showToast(res.data?.message || 'Gagal menyimpan transaksi.', 'error');
      return false;
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal menyimpan transaksi.', 'error');
      return false;
    }
  };

  const updateTransaction = async (id: number, data: any): Promise<boolean> => {
    try {
      const res = await api.put(`/transactions/${id}`, data);
      if (res.data?.success) {
        showToast('Transaksi berhasil diperbarui.', 'success');

        // Check if budget threshold notification was triggered
        if (res.data.budgetAlert) {
          const alert = res.data.budgetAlert;
          setTimeout(() => {
            showToast(alert.message, alert.level === 'danger' ? 'error' : 'warning');
          }, 300);
        }

        refreshAll();
        return true;
      }
      showToast(res.data?.message || 'Gagal mengupdate transaksi.', 'error');
      return false;
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal mengupdate transaksi.', 'error');
      return false;
    }
  };

  const deleteTransaction = async (id: number): Promise<boolean> => {
    try {
      const res = await api.delete(`/transactions/${id}`);
      if (res.data?.success) {
        showToast('Transaksi telah dihapus.', 'success');
        refreshAll();
        return true;
      }
      showToast(res.data?.message || 'Gagal menghapus transaksi.', 'error');
      return false;
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal menghapus transaksi.', 'error');
      return false;
    }
  };

  // --- CATEGORIES CRUD ---
  const createCategory = async (data: any): Promise<boolean> => {
    try {
      const res = await api.post('/categories', data);
      if (res.data?.success) {
        showToast('Kategori kustom berhasil ditambahkan!', 'success');
        fetchCategories();
        return true;
      }
      showToast(res.data?.message || 'Gagal menambahkan kategori.', 'error');
      return false;
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal menambahkan kategori.', 'error');
      return false;
    }
  };

  const updateCategory = async (id: number, data: any): Promise<boolean> => {
    try {
      const res = await api.put(`/categories/${id}`, data);
      if (res.data?.success) {
        showToast('Kategori berhasil diperbarui.', 'success');
        fetchCategories();
        return true;
      }
      showToast(res.data?.message || 'Gagal memperbarui kategori.', 'error');
      return false;
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal memperbarui kategori.', 'error');
      return false;
    }
  };

  const deleteCategory = async (id: number): Promise<boolean> => {
    try {
      const res = await api.delete(`/categories/${id}`);
      if (res.data?.success) {
        showToast('Kategori telah dihapus.', 'success');
        fetchCategories();
        return true;
      }
      showToast(res.data?.message || 'Gagal menghapus kategori.', 'error');
      return false;
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal menghapus kategori.', 'error');
      return false;
    }
  };

  // --- BUDGETS CRUD ---
  const saveBudget = async (data: any): Promise<boolean> => {
    try {
      const res = await api.post('/budgets', data);
      if (res.data?.success) {
        showToast('Target anggaran berhasil disimpan.', 'success');
        fetchBudgets(budgetMonth, budgetYear);
        return true;
      }
      showToast(res.data?.message || 'Gagal menyimpan anggaran.', 'error');
      return false;
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal menyimpan anggaran.', 'error');
      return false;
    }
  };

  const updateBudget = async (id: number, data: any): Promise<boolean> => {
    try {
      const res = await api.put(`/budgets/${id}`, data);
      if (res.data?.success) {
        showToast('Anggaran berhasil diperbarui.', 'success');
        fetchBudgets(budgetMonth, budgetYear);
        return true;
      }
      showToast(res.data?.message || 'Gagal memperbarui anggaran.', 'error');
      return false;
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal memperbarui anggaran.', 'error');
      return false;
    }
  };

  const deleteBudget = async (id: number): Promise<boolean> => {
    try {
      const res = await api.delete(`/budgets/${id}`);
      if (res.data?.success) {
        showToast('Anggaran telah dihapus.', 'success');
        fetchBudgets(budgetMonth, budgetYear);
        return true;
      }
      showToast(res.data?.message || 'Gagal menghapus anggaran.', 'error');
      return false;
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal menghapus anggaran.', 'error');
      return false;
    }
  };

  // --- RECURRING RULES ---
  const createRecurring = async (data: any): Promise<boolean> => {
    try {
      const res = await api.post('/recurring', data);
      if (res.data?.success) {
        showToast('Jadwal transaksi berulang berhasil dibuat!', 'success');
        fetchRecurringRules();
        return true;
      }
      showToast(res.data?.message || 'Gagal membuat jadwal berulang.', 'error');
      return false;
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal membuat jadwal berulang.', 'error');
      return false;
    }
  };

  const toggleRecurringActive = async (id: number): Promise<boolean> => {
    try {
      const res = await api.patch(`/recurring/${id}/toggle`);
      if (res.data?.success) {
        showToast('Status transaksi berulang telah diperbarui.', 'info');
        fetchRecurringRules();
        return true;
      }
      return false;
    } catch (err: any) {
      showToast('Gagal mengubah status.', 'error');
      return false;
    }
  };

  const deleteRecurringRule = async (id: number): Promise<boolean> => {
    try {
      const res = await api.delete(`/recurring/${id}`);
      if (res.data?.success) {
        showToast('Jadwal berulang telah dihapus.', 'success');
        fetchRecurringRules();
        return true;
      }
      return false;
    } catch (err: any) {
      showToast('Gagal menghapus jadwal berulang.', 'error');
      return false;
    }
  };

  const processDueRecurring = async () => {
    setIsProcessingRecurring(true);
    try {
      const res = await api.post('/recurring/process');
      if (res.data?.success) {
        const count = res.data.data?.processedCount || 0;
        showToast(`Selesai diproses: ${count} transaksi telah otomatis dicatat!`, 'success');
        refreshAll();
      }
    } catch (err: any) {
      showToast('Gagal memproses transaksi jatuh tempo.', 'error');
    } finally {
      setIsProcessingRecurring(false);
    }
  };

  // --- EXPORTS ---
  const exportCSV = () => {
    window.open('/api/reports/export/csv', '_blank');
  };

  const exportPDF = () => {
    exportTransactionsPDF(transactions, user, 'Semua Transaksi', selectedCurrency, exchangeRate);
  };

  // Over-budget detectors & alert notifications
  const overBudgets = budgets
    .filter((b) => (b.percentage || 0) >= (b.alert_threshold || 80))
    .map((b) => ({
      budgetId: b.id,
      categoryId: b.category_id,
      categoryName: b.category?.name || 'Kategori',
      categoryColor: b.category?.color || '#0ea5e9',
      categoryIcon: b.category?.icon || 'Tag',
      spent: b.spent || 0,
      amount: b.amount,
      percentage: b.percentage || 0,
      threshold: b.alert_threshold || 80,
      isExceeded: (b.percentage || 0) >= 100,
    }));

  return {
    transactions,
    categories,
    budgets,
    recurringRules,
    summary,
    trend,
    breakdown,
    budgetMonth,
    budgetYear,
    isLoading,
    isProcessingRecurring,
    overBudgets,
    changeBudgetPeriod,
    refreshAll,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    createCategory,
    updateCategory,
    deleteCategory,
    saveBudget,
    updateBudget,
    deleteBudget,
    createRecurring,
    toggleRecurringActive,
    deleteRecurringRule,
    processDueRecurring,
    exportCSV,
    exportPDF,
  };
}
