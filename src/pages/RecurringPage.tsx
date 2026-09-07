import React, { useState } from 'react';
import {
  Repeat,
  Plus,
  Play,
  Calendar,
  Trash2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { Modal } from '../components/common/Modal';
import { RecurringRule, Category, TransactionType, RecurringInterval } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { formatDate } from '../utils/formatters';

interface RecurringPageProps {
  recurringRules: RecurringRule[];
  categories: Category[];
  onCreateRecurring: (data: any) => Promise<boolean>;
  onToggleActive: (id: number) => Promise<boolean>;
  onDeleteRule: (id: number) => Promise<boolean>;
  onProcessDue: () => Promise<void>;
  isProcessing?: boolean;
}

export const RecurringPage: React.FC<RecurringPageProps> = ({
  recurringRules,
  categories,
  onCreateRecurring,
  onToggleActive,
  onDeleteRule,
  onProcessDue,
  isProcessing = false,
}) => {
  const { formatMoney } = useCurrency();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | string>('');
  const [interval, setInterval] = useState<RecurringInterval>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<RecurringRule | null>(null);

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleOpenCreate = () => {
    setType('expense');
    setAmount('');
    setDescription('');
    setInterval('monthly');
    setStartDate(new Date().toISOString().split('T')[0]);
    const first = categories.find((c) => c.type === 'expense');
    if (first) setCategoryId(first.id);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!description.trim()) {
      setError('Deskripsi transaksi berulang wajib diisi.');
      return;
    }
    if (!categoryId) {
      setError('Pilih kategori.');
      return;
    }
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Nominal harus lebih besar dari 0.');
      return;
    }

    setIsSubmitting(true);
    const ok = await onCreateRecurring({
      amount: numAmount,
      description: description.trim(),
      category_id: Number(categoryId),
      type,
      recurring_interval: interval,
      next_run_date: startDate,
    });
    setIsSubmitting(false);

    if (ok) setIsModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Recurring Transactions & Automation
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Jadwalkan gaji bulanan, langganan streaming, listrik, atau sewa rumah secara otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onProcessDue}
            isLoading={isProcessing}
            leftIcon={<Play className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Proses Jatuh Tempo Sekarang
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Tambah Transaksi Berulang
          </Button>
        </div>
      </div>

      {/* Rules List */}
      {recurringRules.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Repeat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            Belum Ada Transaksi Berulang
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Hemat waktu dengan menjadwalkan transaksi rutin Anda di sini.
          </p>
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            Buat Aturan Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recurringRules.map((rule) => {
            const isIncome = rule.type === 'income';
            const intervalLabel = {
              daily: 'Setiap Hari',
              weekly: 'Setiap Minggu',
              monthly: 'Setiap Bulan',
              yearly: 'Setiap Tahun',
            }[rule.recurring_interval];

            return (
              <div
                key={rule.id}
                className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border transition-all ${
                  rule.is_active
                    ? 'border-slate-200 dark:border-slate-800 shadow-sm'
                    : 'border-slate-200/50 dark:border-slate-800/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: rule.category?.color || '#0ea5e9' }}
                    >
                      <CategoryIcon name={rule.category?.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                        {rule.description}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {rule.category?.name || 'Umum'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isIncome
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {isIncome ? 'Pemasukan' : 'Pengeluaran'}
                  </span>
                </div>

                <div className="mt-4">
                  <p
                    className={`text-2xl font-extrabold tracking-tight ${
                      isIncome ? 'text-emerald-500' : 'text-slate-800 dark:text-white'
                    }`}
                  >
                    {isIncome ? '+' : '-'} {formatMoney(rule.amount)}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Frekuensi:</span>
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {intervalLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Jatuh Tempo:</span>
                    </span>
                    <span className="font-semibold text-sky-500">
                      {formatDate(rule.next_run_date, 'medium')}
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => onToggleActive(rule.id)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                      rule.is_active
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {rule.is_active ? 'Status: Aktif' : 'Status: Nonaktif'}
                  </button>

                  <button
                    onClick={() => setDeleteTarget(rule)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Hapus Aturan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Recurring Rule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Jadwalkan Transaksi Berulang"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Tipe Transaksi
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  const cat = categories.find((c) => c.type === 'expense');
                  if (cat) setCategoryId(cat.id);
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Pengeluaran Rutin
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  const cat = categories.find((c) => c.type === 'income');
                  if (cat) setCategoryId(cat.id);
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  type === 'income'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Pemasukan Rutin
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Tagihan WiFi / Gaji Bulanan"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nominal (Rp) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
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
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Interval */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Interval
              </label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value as RecurringInterval)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
                <option value="yearly">Tahunan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mulai Dari Tanggal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Jadwalkan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Jadwal Berulang"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Hapus jadwal berulang <strong className="text-slate-900 dark:text-white">"{deleteTarget?.description}"</strong>?
          </p>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={async () => {
                if (deleteTarget) {
                  await onDeleteRule(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
