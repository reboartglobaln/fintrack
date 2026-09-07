import React, { useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  FileDown,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { IncomeExpenseChart } from '../components/charts/IncomeExpenseChart';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { SummaryData, TrendData, CategoryBreakdownItem } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';

interface ReportsPageProps {
  summary: SummaryData | null;
  trend: TrendData | null;
  breakdown: CategoryBreakdownItem[];
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  summary,
  trend,
  breakdown,
  onExportCSV,
  onExportPDF,
}) => {
  const { formatMoney } = useCurrency();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const income = summary?.monthIncome || 0;
  const expense = summary?.monthExpense || 0;
  const net = income - expense;
  const savingsRate = summary?.savingsRate || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Financial Reports & Analytics
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Visualisasi mendalam performa arus kas, rasio tabungan, dan distribusi beban.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCSV}
            leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Ekspor CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onExportPDF}
            leftIcon={<FileDown className="w-3.5 h-3.5" />}
          >
            Unduh Laporan PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Pemasukan
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            {formatMoney(income)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Pengeluaran
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            {formatMoney(expense)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Arus Kas Bersih
            </span>
          </div>
          <p
            className={`text-3xl font-extrabold tracking-tight ${
              net >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {formatMoney(net)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
              <PiggyBank className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tingkat Tabungan
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            {savingsRate}%
          </p>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-white">
            Historical Trend
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
            Fluktuasi pendapatan vs belanja bulanan
          </p>
          {trend ? (
            <IncomeExpenseChart data={trend} isDark={isDark} />
          ) : (
            <div className="h-72 flex items-center justify-center text-xs text-slate-400">
              Memuat grafik tren...
            </div>
          )}
        </div>

        <div className="lg:col-span-5 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-white">
            Expenditure Structure
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
            Persentase alokasi pos anggaran
          </p>
          <CategoryPieChart items={breakdown} isDark={isDark} />
        </div>
      </div>

      {/* Breakdown Details Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-white">
            Category Breakdown Details
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Data kuantitatif beban pengeluaran terperinci
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6">Allocation</th>
                <th className="py-3.5 px-6 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {breakdown.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: item.color }}
                      >
                        <CategoryIcon name={item.icon} className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.name}
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3 max-w-xs">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <span className="w-12 text-right font-bold text-slate-700 dark:text-slate-300 text-xs">
                        {item.percentage}%
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-6 text-right font-bold text-slate-800 dark:text-white whitespace-nowrap">
                    {formatMoney(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
