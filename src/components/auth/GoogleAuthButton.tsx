import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  X,
  ShieldCheck,
} from 'lucide-react';

interface GoogleAuthButtonProps {
  mode?: 'login' | 'register';
  className?: string;
  onSuccess?: () => void;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  mode = 'login',
  className = '',
  onSuccess,
}) => {
  const { loginWithGooglePopup, loginWithGoogleMock } = useAuth();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [copiedDev, setCopiedDev] = useState(false);
  const [copiedShared, setCopiedShared] = useState(false);

  // Custom demo Google account fields
  const [demoEmail, setDemoEmail] = useState('recobocil.art@gmail.com');
  const [demoName, setDemoName] = useState('Recobocil Art');
  const [isSubmittingMock, setIsSubmittingMock] = useState(false);

  const devCallback = 'https://ais-dev-psthdo7fwdvzivkaczrcnn-194164145577.asia-southeast1.run.app/auth/callback';
  const sharedCallback = 'https://ais-pre-psthdo7fwdvzivkaczrcnn-194164145577.asia-southeast1.run.app/auth/callback';

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const res = await loginWithGooglePopup();

      if (res.notConfigured) {
        setShowConfigModal(true);
        setIsLoading(false);
        return;
      }

      if (res.success) {
        showToast(
          res.message || (mode === 'register' ? 'Registrasi dengan Google berhasil!' : 'Login dengan Google berhasil!'),
          'success'
        );
        onSuccess?.();
      } else {
        if (res.message) {
          showToast(res.message, 'error');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memulai autentikasi Google.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulatedGoogleAuth = async () => {
    if (!demoEmail) {
      showToast('Email akun Google wajib diisi.', 'error');
      return;
    }

    setIsSubmittingMock(true);
    try {
      const res = await loginWithGoogleMock(demoEmail, demoName);
      if (res.success) {
        setShowConfigModal(false);
        showToast(
          res.message || (mode === 'register' ? 'Akun Google berhasil terdaftar!' : 'Berhasil masuk dengan akun Google!'),
          'success'
        );
        onSuccess?.();
      } else {
        showToast(res.message || 'Gagal melakukan login simulasi Google.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan saat memproses akun Google.', 'error');
    } finally {
      setIsSubmittingMock(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'dev' | 'shared') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'dev') {
        setCopiedDev(true);
        setTimeout(() => setCopiedDev(false), 2000);
      } else {
        setCopiedShared(true);
        setTimeout(() => setCopiedShared(false), 2000);
      }
      showToast('Callback URL berhasil disalin!', 'success');
    } catch (e) {
      showToast('Gagal menyalin URL.', 'error');
    }
  };

  return (
    <>
      <button
        id={`btn-google-${mode}`}
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all duration-200 shadow-sm active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>
          {mode === 'register' ? 'Daftar dengan Google' : 'Masuk dengan Google'}
        </span>
      </button>

      {/* Google OAuth Guidance & Sandbox Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
            {/* Close Button */}
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Autentikasi Akun Google
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {mode === 'register'
                    ? 'Daftarkan akun FinTrack baru menggunakan Google'
                    : 'Masuk ke FinTrack menggunakan akun Google Anda'}
                </p>
              </div>
            </div>

            {/* Quick 1-Click Sandbox Login */}
            <div className="p-4 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 mb-5">
              <div className="flex items-start gap-2.5 mb-3">
                <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-sky-900 dark:text-sky-200">
                    Coba Langsung dengan Akun Google Anda
                  </h4>
                  <p className="text-[11px] text-sky-700/80 dark:text-sky-300/80 leading-relaxed">
                    Uji coba registrasi & login akun Google secara instan di lingkungan preview tanpa konfigurasi kunci API eksternal.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Email Akun Google
                  </label>
                  <input
                    type="email"
                    value={demoEmail}
                    onChange={(e) => setDemoEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Nama Akun Google
                  </label>
                  <input
                    type="text"
                    value={demoName}
                    onChange={(e) => setDemoName(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSimulatedGoogleAuth}
                  disabled={isSubmittingMock}
                  className="w-full mt-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-60"
                >
                  {isSubmittingMock ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {mode === 'register' ? 'Daftar Sekarang dengan Akun Google Ini' : 'Masuk Sekarang dengan Akun Google Ini'}
                  </span>
                </button>
              </div>
            </div>

            {/* Production Credentials Configuration Info */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Konfigurasi Google Cloud Console (Opsional)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                Untuk menghubungkan langsung ke login pop-up resmi Google, tambahkan <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">GOOGLE_CLIENT_ID</code> dan <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">GOOGLE_CLIENT_SECRET</code> pada menu Settings. Daftarkan URL berikut sebagai Authorized Redirect URI:
              </p>

              {/* Dev Callback URL */}
              <div className="mb-2">
                <div className="text-[10px] text-slate-400 font-medium mb-1">Development Callback URI:</div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-mono select-all">
                  <span className="truncate pr-2">{devCallback}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(devCallback, 'dev')}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    title="Salin URL"
                  >
                    {copiedDev ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Shared Callback URL */}
              <div>
                <div className="text-[10px] text-slate-400 font-medium mb-1">Shared App Callback URI:</div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-mono select-all">
                  <span className="truncate pr-2">{sharedCallback}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sharedCallback, 'shared')}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    title="Salin URL"
                  >
                    {copiedShared ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
