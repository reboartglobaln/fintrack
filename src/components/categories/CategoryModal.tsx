import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Category, TransactionType } from '../../types';
import { AVAILABLE_ICONS, CategoryIcon } from '../common/CategoryIcon';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<boolean>;
  initialData?: Category | null;
}

const COLOR_PRESETS = [
  '#0ea5e9', // Sky
  '#10b981', // Emerald
  '#ef4444', // Rose
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#64748b', // Slate
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState('#0ea5e9');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setIcon(initialData.icon || 'Tag');
      setColor(initialData.color || '#0ea5e9');
    } else {
      setName('');
      setType('expense');
      setIcon('Tag');
      setColor('#0ea5e9');
    }
    setError('');
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama kategori wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmit({
      name: name.trim(),
      type,
      icon,
      color,
    });
    setIsSubmitting(false);

    if (success) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Kategori' : 'Tambah Kategori Kustom'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type selector */}
        {!initialData && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Tipe Kategori
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  type === 'income'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Pemasukan
              </button>
            </div>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nama Kategori <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Langganan SaaS / Kursus Desain"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
          {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Pilih Warna Aksen
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  color === c ? 'scale-110 border-slate-900 dark:border-white ring-2 ring-sky-400' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Icon Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Pilih Ikon
          </label>
          <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/40">
            {AVAILABLE_ICONS.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all ${
                  icon === iconName
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <CategoryIcon name={iconName} className="w-5 h-5 mb-1" />
                <span className="text-[10px] truncate max-w-full">{iconName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: color }}
          >
            <CategoryIcon name={icon} className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {name || 'Nama Kategori'}
            </p>
            <p className="text-[11px] text-slate-400">
              {type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {initialData ? 'Perbarui Kategori' : 'Simpan Kategori'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
