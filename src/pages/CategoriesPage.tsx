import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Tag,
  Target,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { Modal } from '../components/common/Modal';
import { Category, TransactionType, Budget } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface CategoriesPageProps {
  categories: Category[];
  budgets?: Budget[];
  onOpenCreateModal: () => void;
  onEditCategory: (cat: Category) => void;
  onDeleteCategory: (id: number) => Promise<boolean>;
  onOpenCreateBudget?: (categoryId?: number) => void;
  onEditBudget?: (budget: Budget) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  categories,
  budgets = [],
  onOpenCreateModal,
  onEditCategory,
  onDeleteCategory,
  onOpenCreateBudget,
  onEditBudget,
}) => {
  const { formatMoney } = useCurrency();
  const [activeType, setActiveType] = useState<TransactionType>('expense');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === activeType);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const ok = await onDeleteCategory(deleteTarget.id);
    setIsDeleting(false);
    if (ok) setDeleteTarget(null);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Categories & Budgeting
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Kelola kategori transaksi dan pantau capaian anggaran serta ambang batas 80%/100%.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCreateBudget && activeType === 'expense' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenCreateBudget()}
              leftIcon={<Target className="w-3.5 h-3.5 text-sky-500" />}
            >
              + Anggaran Baru
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCreateModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Tambah Kategori
          </Button>
        </div>
      </div>

      {/* Tabs for Expense vs Income */}
      <div className="flex items-center gap-1.5 p-1 max-w-xs bg-slate-100 dark:bg-slate-800/80 rounded-xl">
        <button
          onClick={() => setActiveType('expense')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeType === 'expense'
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Pengeluaran
        </button>
        <button
          onClick={() => setActiveType('income')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeType === 'income'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Pemasukan
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((cat) => {
          const budget = activeType === 'expense' ? budgets.find((b) => b.category_id === cat.id) : null;
          const spent = budget?.spent || 0;
          const cap = budget?.amount || 0;
          const percentage = budget?.percentage || (cap > 0 ? Math.round((spent / cap) * 100) : 0);
          const threshold = budget?.alert_threshold || 80;
          const isDanger = percentage >= 100;
          const isWarning = percentage >= threshold && !isDanger;

          return (
            <div
              key={cat.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Category Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                    style={{ backgroundColor: cat.color || '#0ea5e9' }}
                  >
                    <CategoryIcon name={cat.icon} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {cat.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      {cat.is_default ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          <ShieldCheck className="w-3 h-3 text-sky-500" />
                          <span>System</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md">
                          <Tag className="w-3 h-3" />
                          <span>Custom</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions for custom categories */}
                <div className="flex items-center gap-1">
                  {!cat.is_default && (
                    <>
                      <button
                        onClick={() => onEditCategory(cat)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Kategori"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Budget Progress Bar Section (For Expense Categories) */}
              {activeType === 'expense' && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  {budget ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Target className="w-3 h-3 text-sky-500" />
                          <span>Anggaran: {formatMoney(cap)}</span>
                        </span>

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

                      {/* Visual Progress Bar */}
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Terpakai: {formatMoney(spent)}</span>
                        {onEditBudget && (
                          <button
                            onClick={() => onEditBudget(budget)}
                            className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
                          >
                            <Settings className="w-3 h-3" />
                            <span>Edit Limit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-1 text-xs">
                      <span className="text-[11px] text-slate-400">Belum ada anggaran bulan ini</span>
                      {onOpenCreateBudget && (
                        <button
                          onClick={() => onOpenCreateBudget(cat.id)}
                          className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Set Anggaran</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Kategori"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Hapus kategori <strong className="text-slate-900 dark:text-white">"{deleteTarget?.name}"</strong>?
            Kategori ini hanya dapat dihapus jika tidak sedang digunakan oleh transaksi yang ada.
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
