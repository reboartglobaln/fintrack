import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Category, Budget } from '../../types';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<boolean>;
  categories: Category[];
  initialData?: Budget | null;
  currentMonth: number;
  currentYear: number;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  initialData,
  currentMonth,
  currentYear,
}) => {
  const [categoryId, setCategoryId] = useState<number | string>('');
  const [amount, setAmount] = useState('');
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Only show expense categories for budgeting
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  useEffect(() => {
    if (initialData) {
      setCategoryId(initialData.category_id);
      setAmount(initialData.amount.toString());
      setAlertThreshold(initialData.alert_threshold || 80);
    } else {
      setAmount('');
      setAlertThreshold(80);
      if (expenseCategories.length > 0) {
        setCategoryId(expenseCategories[0].id);
      }
    }
    setError('');
  }, [initialData, categories, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!categoryId) {
      setError('Pilih kategori pengeluaran.');
      return;
    }
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Nominal batas anggaran harus lebih besar dari 0.');
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmit({
      category_id: Number(categoryId),
      month: currentMonth,
      year: currentYear,
      amount: numAmount,
      alert_threshold: alertThreshold,
    });
    setIsSubmitting(false);

    if (success) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Batas Anggaran' : 'Atur Anggaran Baru'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Kategori Pengeluaran <span className="text-rose-500">*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={Boolean(initialData)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-60"
          >
            <option value="" disabled>
              -- Pilih Kategori --
            </option>
            {expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Limit */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Batas Maksimal Nominal (Rp) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">Rp</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 3000000"
              min="1"
              className="w-full pl-11 pr-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Alert Threshold */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Peringatan Dini Penggunaan
            </label>
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
              {alertThreshold}%
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="100"
            step="5"
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Sistem akan memberi lencana kuning saat penggunaan mencapai {alertThreshold}%, dan merah saat 100%.
          </p>
        </div>

        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {initialData ? 'Perbarui Anggaran' : 'Tetapkan Anggaran'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
