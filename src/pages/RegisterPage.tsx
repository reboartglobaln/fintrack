import React, { useState } from 'react';
import { Wallet, Lock, Mail, User as UserIcon, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { GoogleAuthButton } from '../components/auth/GoogleAuthButton';

interface RegisterPageProps {
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateToLogin }) => {
  const { register } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'Nama lengkap wajib diisi.';
    if (!email.trim()) errs.email = 'Alamat email wajib diisi.';
    if (!password) errs.password = 'Kata sandi minimal 6 karakter.';
    else if (password.length < 6) errs.password = 'Kata sandi minimal 6 karakter.';

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Konfirmasi kata sandi tidak cocok.';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    const res = await register(name.trim(), email.trim(), password);
    setIsLoading(false);

    if (res.success) {
      showToast('Pendaftaran berhasil! Selamat datang di FinTrack.', 'success');
    } else {
      showToast(res.message || 'Pendaftaran gagal.', 'error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-500 text-white shadow-md shadow-sky-500/20 mb-3">
            <Wallet className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            FinTrack
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Buat akun dan mulai mengendalikan keuangan Anda hari ini.
          </p>
        </div>

        {/* Register Box */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-5">
            Daftar Akun Baru
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kata Sandi (Min. 6 Karakter)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ulangi Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-rose-500">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-4"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Daftar Sekarang
            </Button>
          </form>

          {/* Social Auth Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">
                atau daftar dengan
              </span>
            </div>
          </div>

          <GoogleAuthButton mode="register" />

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sudah memiliki akun?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-sky-600 hover:text-sky-700 dark:text-sky-400 font-bold ml-1"
              >
                Masuk di Sini
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
