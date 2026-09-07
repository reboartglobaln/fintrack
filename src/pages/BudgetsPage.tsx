import React, { useState } from 'react';
import {
  PiggyBank,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Calendar,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { Modal } from '../components/common/Modal';
import { Budget } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { getMonthName } from '../utils/formatters';

interface BudgetsPageProps {
  budgets: Budget[];
  currentMonth: number;
  currentYear: number;
  onChangePeriod: (month: number, year: number) => void;
  onOpenCreateModal: () => void;
  onEditBudget: (budget: Budget) => void;
  onDeleteBudget: (id: number) => Promise<boolean>;
}

export const BudgetsPage: React.FC<BudgetsPageProps> = ({
  budgets,
  currentMonth,
  currentYear,
  onChangePeriod,
  onOpenCreateModal,
  onEditBudget,
  onDeleteBudget,
}) => {
  const { formatMoney } = useCurrency();
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Compute aggregate statistics
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const ok = await onDeleteBudget(deleteTarget.id);
    setIsDeleting(false);
    if (ok) setDeleteTarget(null);
  };

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Budgets & Spending Limits
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Kendalikan pengeluaran bulanan agar tidak melampaui kemampuan finansial Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month / Year Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <select
              value={currentMonth}
              onChange={(e) => onChangePeriod(Number(e.target.value), currentYear)}
              className="px-1.5 py-0.5 bg-transparent font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m)}
                </option>
              ))}
            </select>
            <select
              value={currentYear}
              onChange={(e) => onChangePeriod(currentMonth, Number(e.target.value))}
              className="px-1.5 py-0.5 bg-transparent font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCreateModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Atur Anggaran
          </Button>
        </div>
      </div>

      {/* Aggregate Overview Card */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Budget Cap
            </span>
            <p className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight mt-1">
              {formatMoney(totalBudget)}
            </p>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Spent
            </span>
            <p className="text-3xl font-extrabold text-rose-500 tracking-tight mt-1">
              {formatMoney(totalSpent)}
            </p>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Remaining Budget
            </span>
            <p
              className={`text-3xl font-extrabold tracking-tight mt-1 ${
                totalBudget - totalSpent < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-500'
              }`}
            >
              {formatMoney(Math.max(totalBudget - totalSpent, 0))}
            </p>
          </div>
        </div>

        {/* Aggregate Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-600 dark:text-slate-300">
              Penggunaan Anggaran Keseluruhan ({getMonthName(currentMonth)} {currentYear})
            </span>
            <span
              className={`font-bold ${
                overallPercentage >= 100
                  ? 'text-rose-600'
                  : overallPercentage >= 80
                  ? 'text-amber-500'
                  : 'text-sky-500'
              }`}
            >
              {overallPercentage}% Terpakai
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overallPercentage >= 100
                  ? 'bg-rose-500'
                  : overallPercentage >= 80
                  ? 'bg-amber-500'
                  : 'bg-sky-500'
              }`}
              style={{ width: `${Math.min(overallPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Budgets Grid */}
      {budgets.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <PiggyBank className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            Belum Ada Batas Anggaran untuk Periode Ini
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Tetapkan batas anggaran untuk kategori seperti Makanan, Transportasi, atau Belanja.
          </p>
          <Button variant="primary" size="sm" onClick={onOpenCreateModal}>
            Buat Anggaran Sekarang
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map((b) => {
            const spent = b.spent || 0;
            const pct = b.percentage || 0;
            const status = b.status || 'safe';

            const statusBadge = {
              safe: {
                bg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
                icon: CheckCircle2,
                label: 'Aman',
              },
              warning: {
                bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
                icon: AlertTriangle,
                label: 'Peringatan',
              },
              danger: {
                bg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300',
                icon: AlertCircle,
                label: 'Melebihi Batas',
              },
            }[status];

            const StatusIcon = statusBadge.icon;

            return (
              <div
                key={b.id}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: b.category?.color || '#0ea5e9' }}
                    >
                      <CategoryIcon name={b.category?.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {b.category?.name || 'Kategori'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Batas: {formatMoney(b.amount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge.bg}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusBadge.label}</span>
                    </span>

                    <button
                      onClick={() => onEditBudget(b)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 rounded-lg transition-colors"
                      title="Edit Anggaran"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(b)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Hapus Anggaran"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Terpakai: <strong className="text-slate-900 dark:text-white">{formatMoney(spent)}</strong>
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        status === 'danger'
                          ? 'bg-rose-500'
                          : status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-sky-500'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Sisa: {formatMoney(Math.max(b.amount - spent, 0))}</span>
                  <span>Alert pada {b.alert_threshold}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Target Anggaran"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Hapus batas anggaran untuk kategori{' '}
            <strong className="text-slate-900 dark:text-white">
              "{deleteTarget?.category?.name}"
            </strong>
            ?
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
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
