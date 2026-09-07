import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  FileDown,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Repeat,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { Modal } from '../components/common/Modal';
import { Transaction, Category, TransactionType } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { formatDate } from '../utils/formatters';

interface TransactionsPageProps {
  transactions: Transaction[];
  categories: Category[];
  onOpenCreateModal: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: number) => Promise<boolean>;
  onExportCSV: () => void;
  onExportPDF: () => void;
  isLoading?: boolean;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions,
  categories,
  onOpenCreateModal,
  onEditTransaction,
  onDeleteTransaction,
  onExportCSV,
  onExportPDF,
  isLoading = false,
}) => {
  const { formatMoney } = useCurrency();

  // Filters State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered & Searched Data
  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      // Type filter
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && item.category_id !== Number(categoryFilter)) return false;

      // Search keyword (description and category name)
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchDesc = item.description?.toLowerCase().includes(query);
        const matchCat = item.category?.name?.toLowerCase().includes(query);
        if (!matchDesc && !matchCat) return false;
      }

      // Date Range
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;

      return true;
    });
  }, [transactions, typeFilter, categoryFilter, search, startDate, endDate]);

  // Aggregate metrics for filtered data
  const filteredMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    });
    return {
      income,
      expense,
      net: income - expense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Date Presets
  const setPresetDate = (preset: 'today' | '7days' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const startStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      setStartDate(startStr);
      setEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      const startStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const endStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`;
      setStartDate(startStr);
      setEndDate(endStr);
    } else if (preset === 'lastMonth') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startStr = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}-01`;
      const lastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
      const endStr = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}-${pad(lastDay)}`;
      setStartDate(startStr);
      setEndDate(endStr);
    }
    setCurrentPage(1);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const success = await onDeleteTransaction(deleteTarget.id);
    setIsDeleting(false);
    if (success) {
      setDeleteTarget(null);
    }
  };

  const selectedCategoryName = useMemo(() => {
    if (categoryFilter === 'all') return '';
    return categories.find((c) => c.id === Number(categoryFilter))?.name || '';
  }, [categoryFilter, categories]);

  const hasActiveFilters = Boolean(
    search.trim() || typeFilter !== 'all' || categoryFilter !== 'all' || startDate || endDate
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Transactions History
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Pencarian cerdas dan penyaringan multi-kriteria untuk riwayat keuangan Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCSV}
            leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Ekspor CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPDF}
            leftIcon={<FileDown className="w-3.5 h-3.5 text-rose-500" />}
          >
            Ekspor PDF
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCreateModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Catat Transaksi
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari kata kunci deskripsi atau kategori..."
              className="w-full pl-10 pr-9 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Hapus pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="lg:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="all">Semua Tipe (Pemasukan & Pengeluaran)</option>
              <option value="income">🟢 Pemasukan Saja</option>
              <option value="expense">🔴 Pengeluaran Saja</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === 'income' ? 'Pemasukan' : 'Pengeluaran'})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="lg:col-span-2 flex items-center">
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                hasActiveFilters
                  ? 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border-sky-200 dark:border-sky-800 cursor-pointer'
                  : 'text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Date Range Sub-row & Quick Presets */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Rentang:</span>
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Hapus filter tanggal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Presets */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] text-slate-400 mr-1">Preset:</span>
            <button
              onClick={() => setPresetDate('today')}
              className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
            >
              Hari Ini
            </button>
            <button
              onClick={() => setPresetDate('7days')}
              className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
            >
              7 Hari
            </button>
            <button
              onClick={() => setPresetDate('thisMonth')}
              className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setPresetDate('lastMonth')}
              className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
            >
              Bulan Lalu
            </button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <span className="text-[11px] text-slate-400">Filter Aktif:</span>

            {search.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                <span>Kata Kunci: "{search}"</span>
                <button onClick={() => setSearch('')} className="hover:opacity-75">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {typeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                <span>Tipe: {typeFilter === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span>
                <button onClick={() => setTypeFilter('all')} className="hover:opacity-75">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {categoryFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                <span>Kategori: {selectedCategoryName}</span>
                <button onClick={() => setCategoryFilter('all')} className="hover:opacity-75">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                <span>Tanggal: {startDate || '...'} s/d {endDate || '...'}</span>
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="hover:opacity-75"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filtered Summary Mini-Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="px-3 py-1.5 border-r border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-400">Total Transaksi</span>
          <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
            {filteredMetrics.count} data
          </p>
        </div>
        <div className="px-3 py-1.5 sm:border-r border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            <span>Pemasukan Terfilter</span>
          </span>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            +{formatMoney(filteredMetrics.income)}
          </p>
        </div>
        <div className="px-3 py-1.5 border-r border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ArrowDownLeft className="w-3 h-3 text-rose-500" />
            <span>Pengeluaran Terfilter</span>
          </span>
          <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
            -{formatMoney(filteredMetrics.expense)}
          </p>
        </div>
        <div className="px-3 py-1.5">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Wallet className="w-3 h-3 text-sky-500" />
            <span>Arus Kas Bersih</span>
          </span>
          <p
            className={`text-sm font-bold mt-0.5 ${
              filteredMetrics.net >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatMoney(filteredMetrics.net)}
          </p>
        </div>
      </div>

      {/* Transactions Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-sm text-slate-400">Memuat transaksi...</div>
        ) : paginatedTransactions.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-400">
            Tidak ada transaksi yang cocok dengan kriteria pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6 text-right">Amount</th>
                  <th className="py-3.5 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {paginatedTransactions.map((item) => {
                  const isIncome = item.type === 'income';
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-4 px-6 text-slate-400 dark:text-slate-400 text-xs whitespace-nowrap">
                        {formatDate(item.date, 'medium')}
                      </td>

                      {/* Category */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <CategoryIcon name={item.category?.icon} className="w-3.5 h-3.5 text-slate-500" />
                          <span>{item.category?.name || 'Umum'}</span>
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-4 px-6 font-semibold text-slate-800 dark:text-white max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{item.description}</span>
                          {item.is_recurring && (
                            <span
                              title={`Berulang (${item.recurring_interval})`}
                              className="inline-flex items-center p-0.5 rounded text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60"
                            >
                              <Repeat className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isIncome
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {isIncome ? 'Pemasukan' : 'Pengeluaran'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td
                        className={`py-4 px-6 text-right font-bold whitespace-nowrap ${
                          isIncome
                            ? 'text-emerald-500'
                            : 'text-slate-800 dark:text-white'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {formatMoney(item.amount)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onEditTransaction(item)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Transaksi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredTransactions.length > 0 && (
          <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Menampilkan{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              -{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}
              </span>{' '}
              dari{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {filteredTransactions.length}
              </span>{' '}
              transaksi
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Transaksi"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Apakah Anda yakin ingin menghapus transaksi{' '}
            <strong className="text-slate-900 dark:text-white">"{deleteTarget?.description}"</strong>{' '}
            sebesar <strong className="text-rose-500">{formatMoney(deleteTarget?.amount || 0)}</strong>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={confirmDelete}
              isLoading={isDeleting}
            >
              Hapus Sekarang
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
