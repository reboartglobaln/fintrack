import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Category, Transaction, TransactionType, RecurringInterval } from '../../types';
import { CategoryIcon } from '../common/CategoryIcon';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<boolean>;
  categories: Category[];
  initialData?: Transaction | null;
  defaultType?: TransactionType;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  initialData,
  defaultType = 'expense',
}) => {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number | string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringInterval, setRecurringInterval] = useState<RecurringInterval>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setDescription(initialData.description);
      setCategoryId(initialData.category_id);
      setDate(initialData.date);
      setIsRecurring(Boolean(initialData.is_recurring));
      setRecurringInterval(initialData.recurring_interval || 'monthly');
    } else {
      setType(defaultType);
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsRecurring(false);
      setRecurringInterval('monthly');
      // Set default category according to type
      const firstCat = categories.find((c) => c.type === defaultType);
      if (firstCat) setCategoryId(firstCat.id);
    }
    setErrors({});
  }, [initialData, defaultType, categories, isOpen]);

  // When type toggles, pick an appropriate category if current doesn't match
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const validCat = categories.find((c) => c.type === newType);
    if (validCat) setCategoryId(validCat.id);
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errs.amount = 'Nominal harus berupa angka lebih besar dari 0.';
    }
    if (!description.trim()) {
      errs.description = 'Deskripsi transaksi wajib diisi.';
    }
    if (!categoryId) {
      errs.category_id = 'Pilih salah satu kategori.';
    }
    if (!date) {
      errs.date = 'Pilih tanggal transaksi.';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmit({
      amount: numAmount,
      description: description.trim(),
      category_id: Number(categoryId),
      date,
      type,
      is_recurring: isRecurring,
      recurring_interval: isRecurring ? recurringInterval : null,
    });
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Transaksi' : 'Catat Transaksi Baru'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Selector (Pemasukan vs Pengeluaran) */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Tipe Transaksi
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Pemasukan
            </button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nominal (Rp) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">Rp</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              step="any"
              className="w-full pl-11 pr-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
          {errors.amount && <p className="mt-1 text-xs text-rose-500">{errors.amount}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Kategori <span className="text-rose-500">*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="" disabled>
              -- Pilih Kategori --
            </option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.category_id && <p className="mt-1 text-xs text-rose-500">{errors.category_id}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Deskripsi / Catatan <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contoh: Belanja Bulanan di Supermarket"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
          {errors.description && <p className="mt-1 text-xs text-rose-500">{errors.description}</p>}
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Tanggal <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
          {errors.date && <p className="mt-1 text-xs text-rose-500">{errors.date}</p>}
        </div>

        {/* Recurring Toggle */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Transaksi Berulang (Recurring)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ulangi transaksi ini secara otomatis setiap periode.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
            />
          </div>

          {isRecurring && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Interval Pengulangan
              </label>
              <select
                value={recurringInterval}
                onChange={(e) => setRecurringInterval(e.target.value as RecurringInterval)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="daily">Harian (Setiap Hari)</option>
                <option value="weekly">Mingguan (Setiap Minggu)</option>
                <option value="monthly">Bulanan (Setiap Bulan)</option>
                <option value="yearly">Tahunan (Setiap Tahun)</option>
              </select>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {initialData ? 'Simpan Perubahan' : 'Catat Transaksi'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
