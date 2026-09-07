import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  Minus,
  FileDown,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Target,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';
import { SummaryCard } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { IncomeExpenseChart } from '../components/charts/IncomeExpenseChart';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { SummaryData, TrendData, Category, Transaction, TransactionType, Budget } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { formatDate } from '../utils/formatters';

interface DashboardPageProps {
  summary: SummaryData | null;
  trend: TrendData | null;
  categories: Category[];
  budgets?: Budget[];
  onOpenTransactionModal: (type: TransactionType) => void;
  onNavigateToTransactions: () => void;
  onNavigateToBudgets: () => void;
  onOpenCreateBudget?: () => void;
  onNavigateToBot?: () => void;
  onExportPDF: () => void;
  overBudgets?: Array<{
    categoryName: string;
    percentage: number;
    threshold?: number;
    isExceeded?: boolean;
  }>;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  summary,
  trend,
  categories,
  budgets = [],
  onOpenTransactionModal,
  onNavigateToTransactions,
  onNavigateToBudgets,
  onOpenCreateBudget,
  onNavigateToBot,
  onExportPDF,
  overBudgets = [],
}) => {
  const { formatMoney } = useCurrency();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const balance = summary?.totalBalance ?? 0;
  const monthIncome = summary?.monthIncome ?? 0;
  const monthExpense = summary?.monthExpense ?? 0;
  const savingsRate = summary?.savingsRate ?? 0;
  const recentTransactions = summary?.recentTransactions ?? [];

  // Calculate aggregate budget stats
  const totalBudgetCap = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalBudgetSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const overallBudgetPercentage = totalBudgetCap > 0 ? Math.round((totalBudgetSpent / totalBudgetCap) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Financial Overview
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Ringkasan arus kas, pengeluaran, dan capaian target tabungan Anda bulan ini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateToBot && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToBot}
              leftIcon={<MessageCircle className="w-3.5 h-3.5 text-emerald-500" />}
            >
              Catat via WA / Telegram
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPDF}
            leftIcon={<FileDown className="w-3.5 h-3.5 text-slate-500" />}
          >
            Ekspor PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenTransactionModal('income')}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Pemasukan
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenTransactionModal('expense')}
            leftIcon={<Minus className="w-3.5 h-3.5" />}
          >
            Pengeluaran
          </Button>
        </div>
      </div>

      {/* Budget Threshold Notification Banner (80% & 100%) */}
      {overBudgets.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Peringatan Anggaran: {overBudgets.length} Kategori Mencapai Ambang Batas 80% / 100%!
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {overBudgets.map((b, idx) => {
                  const is100 = (b.percentage || 0) >= 100;
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        is100
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                      }`}
                    >
                      {is100 ? <AlertCircle className="w-3 h-3 text-rose-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                      <span>{b.categoryName}: {b.percentage}% {is100 ? '(Overbudget 100%)' : '(Waspada 80%+)'}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <button
            onClick={onNavigateToBudgets}
            className="text-xs font-bold text-amber-900 dark:text-amber-200 hover:underline flex items-center gap-1 shrink-0 self-end sm:self-center"
          >
            <span>Buka Detail Anggaran</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Balance"
          value={formatMoney(balance)}
          subtitle="Akumulasi semua pemasukan bersih"
          icon={<Wallet className="w-5 h-5" />}
          iconBgColor="bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400"
        />

        <SummaryCard
          title="Monthly Income"
          value={formatMoney(monthIncome)}
          growth={summary?.incomeGrowth}
          icon={<TrendingUp className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
        />

        <SummaryCard
          title="Monthly Expenses"
          value={formatMoney(monthExpense)}
          growth={summary?.expenseGrowth}
          icon={<TrendingDown className="w-5 h-5" />}
          iconBgColor="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
        />

        <SummaryCard
          title="Savings Rate"
          value={`${savingsRate}%`}
          subtitle={`Net: ${formatMoney(summary?.monthNetSavings ?? 0)}`}
          icon={<PiggyBank className="w-5 h-5" />}
          iconBgColor="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
        />
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Trend Bar Chart */}
        <div className="lg:col-span-8 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">
                Cashflow Trend
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Income vs Expense over past 6 months
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Pemasukan
              </span>
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Pengeluaran
              </span>
            </div>
          </div>

          {trend ? (
            <IncomeExpenseChart data={trend} isDark={isDark} />
          ) : (
            <div className="h-72 flex items-center justify-center text-xs text-slate-400">
              Memuat data grafik tren...
            </div>
          )}
        </div>

        {/* Expense Category Breakdown Doughnut Chart */}
        <div className="lg:col-span-4 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">
              Category Breakdown
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
              Distribusi pengeluaran bulan ini
            </p>

            <CategoryPieChart
              items={summary?.topExpenseCategories || []}
              isDark={isDark}
            />
          </div>

          {/* Quick Category List */}
          {summary?.topExpenseCategories && summary.topExpenseCategories.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              {summary.topExpenseCategories.slice(0, 3).map((cat) => (
                <div key={cat.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-slate-600 dark:text-slate-300 truncate font-medium">
                      {cat.name}
                    </span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {formatMoney(cat.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Budgeting & Progress Bars Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white">
                Progres Anggaran Kategori Bulan Ini
              </h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Pantau batas pengeluaran kategori dengan notifikasi otomatis ambang batas 80% dan 100%.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCreateBudget && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenCreateBudget}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Atur Anggaran
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToBudgets}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Semua Anggaran
            </Button>
          </div>
        </div>

        {budgets.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Target className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Belum ada anggaran yang ditetapkan untuk bulan ini.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Tetapkan batas anggaran pengeluaran untuk menerima peringatan dini otomatis di 80% dan 100%.
            </p>
            {onOpenCreateBudget && (
              <button
                onClick={onOpenCreateBudget}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tetapkan Anggaran Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map((b) => {
              const spent = b.spent || 0;
              const cap = b.amount || 1;
              const percentage = b.percentage || Math.round((spent / cap) * 100);
              const threshold = b.alert_threshold || 80;
              const isDanger = percentage >= 100;
              const isWarning = percentage >= threshold && !isDanger;

              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isDanger
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                      : isWarning
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CategoryIcon
                        icon={b.category?.icon || 'Tag'}
                        color={b.category?.color || '#0ea5e9'}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          {b.category?.name || 'Kategori'}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Target: {formatMoney(cap)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isDanger ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded">
                          <AlertCircle className="w-3 h-3" />
                          <span>{percentage}% (Melebihi 100%)</span>
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{percentage}% (Waspada {threshold}%)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{percentage}% (Aman)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar with 80% & 100% threshold markers */}
                  <div className="relative w-full h-2.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-full overflow-hidden my-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDanger
                          ? 'bg-rose-500'
                          : isWarning
                          ? 'bg-amber-500'
                          : 'bg-sky-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    <span>
                      Terpakai: <strong className="text-slate-700 dark:text-slate-200">{formatMoney(spent)}</strong>
                    </span>
                    <span>
                      {isDanger ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          Kelebihan: {formatMoney(spent - cap)}
                        </span>
                      ) : (
                        <span>
                          Sisa: <strong className="text-emerald-600 dark:text-emerald-400">{formatMoney(Math.max(0, cap - spent))}</strong>
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">
              Recent Transactions
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              5 aktivitas transaksi finansial terakhir Anda
            </p>
          </div>
          <button
            onClick={onNavigateToTransactions}
            className="text-xs font-bold text-sky-500 hover:text-sky-600 hover:underline inline-flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            Belum ada transaksi yang tercatat. Tekan tombol di atas untuk mencatat!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-6">Transaction</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {recentTransactions.map((t) => {
                  const isIncome = t.type === 'income';
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-6 font-semibold text-slate-800 dark:text-white max-w-xs truncate">
                        {t.description}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <CategoryIcon name={t.category?.icon} className="w-3.5 h-3.5 text-slate-500" />
                          <span>{t.category?.name || 'Umum'}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400 dark:text-slate-400 text-xs whitespace-nowrap">
                        {formatDate(t.date, 'short')}
                      </td>
                      <td
                        className={`py-4 px-6 font-bold whitespace-nowrap ${
                          isIncome
                            ? 'text-emerald-500'
                            : 'text-slate-800 dark:text-white'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {formatMoney(t.amount)}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isIncome
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isIncome ? 'Completed' : 'Expense'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
