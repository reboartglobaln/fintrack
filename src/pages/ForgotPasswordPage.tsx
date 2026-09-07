import React, { useState } from 'react';
import { Wallet, Mail, Lock, KeyRound, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';

interface ForgotPasswordPageProps {
  onNavigateToLogin: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigateToLogin }) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Masukkan alamat email.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      showToast(res.data.message || 'Token reset telah dikirim ke email.', 'success');
      if (res.data.resetToken) {
        setToken(res.data.resetToken);
      }
      setStep('reset');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal memproses permintaan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPassword) {
      showToast('Lengkapi token dan kata sandi baru.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, newPassword });
      showToast(res.data.message || 'Kata sandi berhasil diperbarui. Silakan login.', 'success');
      onNavigateToLogin();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Token tidak valid atau kedaluwarsa.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 text-white shadow-xl shadow-sky-500/25 mb-3">
            <Wallet className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            FinTrack
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pemulihan Akses Akun Anda
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8">
          {step === 'request' ? (
            <form onSubmit={handleRequestToken} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Lupa Kata Sandi?
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Masukkan email akun Anda. Kami akan membuat token reset untuk Anda.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Alamat Email Terdaftar
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Kirim Token Reset
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Buat Sandi Baru
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Masukkan token reset dan kata sandi baru Anda.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Token Reset
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Masukkan token dari email/layar"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                Perbarui Kata Sandi
              </Button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Halaman Masuk</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
