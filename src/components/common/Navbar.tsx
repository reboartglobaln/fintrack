import React, { useState, useRef, useEffect } from 'react';
import {
  Wallet,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Menu,
  Coins,
  FileCode2,
  Bell,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenDocs?: () => void;
  onNavigateToBudgets?: () => void;
  currentTab?: string;
  budgetAlerts?: Array<{
    categoryName: string;
    percentage: number;
    threshold: number;
    isExceeded: boolean;
    spent?: number;
    amount?: number;
  }>;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenDocs,
  onNavigateToBudgets,
  currentTab = 'dashboard',
  budgetAlerts = [],
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { selectedCurrency, currencies, changeCurrency, formatMoney } = useCurrency();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setIsCurrencyOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Ringkasan arus kas dan performa keuangan Anda' },
    transactions: { title: 'Daftar Transaksi', subtitle: 'Catat, filter, dan kelola semua riwayat pemasukan & pengeluaran' },
    reports: { title: 'Laporan Finansial', subtitle: 'Analisis mendalam, tren bulanan, dan ekspor data CSV/PDF' },
    budgets: { title: 'Anggaran & Budget', subtitle: 'Tetapkan batas pengeluaran kategori dan kendalikan gaya hidup' },
    categories: { title: 'Kategori Keuangan', subtitle: 'Atur pos-pos anggaran sesuai kebutuhan finansial Anda' },
    recurring: { title: 'Transaksi Rutin & Berulang', subtitle: 'Otomatisasi pencatatan tagihan, gaji, dan langganan berkala' },
    docs: { title: 'Dokumentasi Sistem & API', subtitle: 'Arsitektur REST API, skema database, dan panduan integrasi' },
  };

  const activeInfo = tabTitles[currentTab] || { title: 'FinTrack', subtitle: 'Aplikasi Keuangan Pribadi' };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 sm:h-20 px-4 sm:px-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Left: Mobile Toggle & Header Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500 text-white shadow-sm">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-base font-bold text-slate-800 dark:text-white">FinTrack</span>
        </div>

        {/* Desktop View Title */}
        <div className="hidden lg:block">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
            {activeInfo.title}
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {activeInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* API Docs / Panduan Arsitektur */}
        {onOpenDocs && (
          <button
            onClick={onOpenDocs}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-lg border border-sky-200/80 dark:border-sky-800 transition-colors"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Dokumentasi API</span>
          </button>
        )}

        {/* Currency Selector */}
        <div className="relative" ref={currencyRef}>
          <button
            onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold">{selectedCurrency}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isCurrencyOpen && (
            <div className="absolute right-0 mt-2 w-48 py-1.5 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Mata Uang Dasar
              </div>
              {currencies.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    changeCurrency(c.code);
                    setIsCurrencyOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                    selectedCurrency === c.code
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-center font-bold text-slate-400">{c.symbol}</span>
                    <span>{c.code}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell for Budget Alerts (80% & 100%) */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
            title="Notifikasi Peringatan Anggaran"
            aria-label="Buka notifikasi anggaran"
          >
            <Bell className="w-4 h-4" />
            {budgetAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {budgetAlerts.length}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 py-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-sky-500" />
                    <span>Notifikasi Anggaran ({budgetAlerts.length})</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Peringatan ambang batas 80% & 100%
                  </p>
                </div>
                {onNavigateToBudgets && (
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      onNavigateToBudgets();
                    }}
                    className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>Atur</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {budgetAlerts.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Semua Anggaran Terkendali
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Belum ada kategori yang mencapai batas 80% atau 100% bulan ini.
                    </p>
                  </div>
                ) : (
                  budgetAlerts.map((alert, idx) => {
                    const is100 = alert.isExceeded || alert.percentage >= 100;
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 flex items-start gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                          is100 ? 'bg-rose-50/30 dark:bg-rose-950/20' : 'bg-amber-50/30 dark:bg-amber-950/20'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            is100
                              ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {is100 ? (
                            <AlertCircle className="w-4 h-4" />
                          ) : (
                            <AlertTriangle className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                              {alert.categoryName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                is100
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {alert.percentage}%
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                            {is100
                              ? '🚨 Pengeluaran telah melampaui batas anggaran (100%+).'
                              : `⚠️ Pengeluaran telah mencapai batas peringatan dini (${alert.threshold}%+).`}
                          </p>

                          {alert.spent !== undefined && alert.amount !== undefined && (
                            <div className="mt-1.5 text-[10px] text-slate-400 flex items-center justify-between">
                              <span>Terpakai: {formatMoney(alert.spent)}</span>
                              <span>Batas: {formatMoney(alert.amount)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {budgetAlerts.length > 0 && onNavigateToBudgets && (
                <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      onNavigateToBudgets();
                    }}
                    className="w-full py-1.5 text-center text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60 rounded-lg transition-colors"
                  >
                    Buka Halaman Anggaran &rarr;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          title={`Ganti ke mode ${theme === 'dark' ? 'terang' : 'gelap'}`}
          aria-label="Toggle tema gelap/terang"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-700">
              <img
                src={
                  user?.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || 'User')}`
                }
                alt={user?.name || 'User'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="hidden sm:block text-xs font-bold text-slate-700 dark:text-slate-200 max-w-[100px] truncate text-left">
              {user?.name || 'Akun'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 py-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {user?.email}
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-medium text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Aplikasi</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
