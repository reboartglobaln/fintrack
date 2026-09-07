import React, { useState } from 'react';
import {
  Code2,
  CheckCircle2,
  Server,
  Database,
  Layers,
  Container,
  Terminal,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lock,
  Unlock,
  Copy,
  Check,
  Sparkles,
  Bot,
  FileText,
  ShieldCheck,
  KeyRound,
  Filter,
} from 'lucide-react';
import api from '../api/axios';

interface ApiEndpointItem {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  category: 'google' | 'auth' | 'transactions' | 'categories' | 'budgets' | 'recurring' | 'bots' | 'reports';
  categoryLabel: string;
  desc: string;
  isProtected: boolean;
  requestBody?: string;
  queryParams?: string;
  responseSample?: string;
}

export const DocsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'solutions' | 'api' | 'markdown' | 'docker'>('api');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [testResult, setTestResult] = useState<{ endpoint: string; data: any; status: number } | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [isMarkdownCopied, setIsMarkdownCopied] = useState(false);

  const testApi = async (endpoint: string) => {
    setTestingEndpoint(endpoint);
    try {
      const res = await api.get(endpoint);
      setTestResult({ endpoint, data: res.data, status: res.status });
    } catch (err: any) {
      setTestResult({
        endpoint,
        data: err.response?.data || { error: err.message },
        status: err.response?.status || 500,
      });
    } finally {
      setTestingEndpoint(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(id);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const solutions = [
    {
      id: 1,
      title: '1. Penanganan SequelizeUniqueConstraintError',
      issue: 'Error ketika user mendaftar dengan email yang sudah ada atau membuat kategori duplikat.',
      solution:
        'Tangani error di controller atau middleware error handler global dengan mengecek nama error: if (err.name === "SequelizeUniqueConstraintError"). Ekstrak pesan spesifik dari err.errors[0].message dan kembalikan status HTTP 409 Conflict dengan JSON ramah pengguna (contoh: "Alamat email ini telah terdaftar").',
      codeSnippet: `// server/middleware/errorHandler.ts
if (err.name === 'SequelizeUniqueConstraintError') {
  const field = err.errors?.[0]?.path || 'bidang';
  return res.status(409).json({
    success: false,
    message: \`Data pada \${field} sudah terdaftar dalam sistem.\`,
  });
}`,
    },
    {
      id: 2,
      title: '2. Strategi JWT Expiration & Auto-Logout / Refresh Token',
      issue: 'Token JWT memiliki masa berlaku (contoh: 7 hari). Saat kedaluwarsa, request gagal tanpa UX yang jelas.',
      solution:
        'Pasang Axios Response Interceptor di frontend. Jika API mengembalikan status 401 Unauthorized, sistem otomatis membersihkan localStorage (token & profil user) dan memicu event "fintrack_auth_logout" agar tampilan beralih mulus ke login form tanpa crash atau loop tanpa akhir.',
      codeSnippet: `// src/api/axios.ts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fintrack_token');
      window.dispatchEvent(new Event('fintrack_auth_logout'));
    }
    return Promise.reject(error);
  }
);`,
    },
    {
      id: 3,
      title: '3. State Management Hydration & Sinkronisasi Token',
      issue: 'State React reset saat halaman di-refresh (F5), menyebabkan user terlempar ke login meski token masih valid.',
      solution:
        'Di AuthProvider (React Context), inisialisasi state user & token langsung dari localStorage secara sinkron, kemudian jalankan verifikasi latar belakang ke endpoint GET /api/auth/me untuk memvalidasi token dan menyegarkan data user terbaru.',
      codeSnippet: `// src/context/AuthContext.tsx
const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('fintrack_user') || 'null'));
const [token, setToken] = useState(() => localStorage.getItem('fintrack_token'));

useEffect(() => {
  if (token) {
    api.get('/auth/me').then(res => setUser(res.data.user)).catch(logout);
  }
}, []);`,
    },
    {
      id: 4,
      title: '4. Chart.js Ghosting & Proper Instance Destroy',
      issue: 'Canvas Chart.js tidak merender dengan benar atau melempar error "Canvas is already in use. Chart with id \'0\' must be destroyed".',
      solution:
        'Gunakan useRef untuk menyimpan referensi instance Chart.js. Sebelum membuat grafik baru di useEffect atau saat component unmount, panggil chartInstanceRef.current.destroy() untuk membersihkan memori canvas.',
      codeSnippet: `// src/components/charts/IncomeExpenseChart.tsx
const chartRef = useRef<Chart | null>(null);

useEffect(() => {
  if (chartRef.current) chartRef.current.destroy();
  chartRef.current = new Chart(ctx, { /* config */ });
  return () => { if (chartRef.current) chartRef.current.destroy(); };
}, [data]);`,
    },
    {
      id: 5,
      title: '5. Mobile Responsiveness (Flexbox, Grid, & Touch Targets)',
      issue: 'Tampilan tabel meluber ke samping pada layar smartphone dan tombol aksi terlalu kecil untuk disentuh.',
      solution:
        'Bungkus tabel dalam div container "overflow-x-auto". Terapkan layout CSS Grid adaptif (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4), serta pastikan target sentuh (touch targets) memiliki ukuran minimal 44px (p-2 / py-2.5) dengan transisi state active:scale-98.',
      codeSnippet: `<!-- Layout Adaptif -->
<div className="overflow-x-auto w-full">
  <table className="w-full text-left text-xs whitespace-nowrap sm:whitespace-normal">...</table>
</div>`,
    },
    {
      id: 6,
      title: '6. Konfigurasi CORS & Kredensial Lintas Domain',
      issue: 'Request API diblokir oleh browser karena perbedaan origin/port antara Vite (frontend) dan Express (backend).',
      solution:
        'Konfigurasi middleware CORS di Express dengan origin dinamis atau whitelist, allow headers Content-Type & Authorization, serta credentials: true untuk mendukung session cookies atau JWT authorization headers.',
      codeSnippet: `// server.ts
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));`,
    },
    {
      id: 7,
      title: '7. Database Indexing & Pagination untuk Skalabilitas Tinggi',
      issue: 'Query melambat saat transaksi mencapai puluhan ribu baris data.',
      solution:
        'Buat indeks PostgreSQL pada kolom kunci: CREATE INDEX idx_trans_user_date ON transactions(user_id, date DESC), serta terapkan Pagination berbasis Limit & Offset pada endpoint GET /api/transactions agar backend hanya mengambil 10-20 baris per halaman.',
      codeSnippet: `-- database/schema.sql
CREATE INDEX idx_trans_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_trans_user_type ON transactions(user_id, type);
CREATE INDEX idx_trans_category ON transactions(category_id);`,
    },
    {
      id: 8,
      title: '8. Arsitektur Google OAuth 2.0 & Cross-Origin Pop-up postMessage Handshake',
      issue: 'Di dalam sandboxed iframe atau cross-origin runtime, redirect OAuth penuh (window.location.href) memblokir third-party cookies dan Google melarang framing iframe (X-Frame-Options: SAMEORIGIN).',
      solution:
        'Gunakan alur Google Sign-In berbasis popup window independen. Frontend membuka URL otorisasi Google melalui window.open(), Google mengarahkan kembali ke endpoint backend Express /auth/callback. Backend menukarkan authorization code dengan profil Google via Axios, membuat/mencocokkan sesi user di database, lalu mengirimkan event aman window.opener.postMessage({ type: "GOOGLE_AUTH_SUCCESS", token, user }) dan menutup popup secara otomatis.',
      codeSnippet: `// server/controllers/googleAuthController.ts
// Setelah pertukaran code & pembuatan token JWT di backend Express:
res.send(\`
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'GOOGLE_AUTH_SUCCESS',
        token: \${JSON.stringify(token)},
        user: \${JSON.stringify(userPayload)},
        isNew: \${isNew}
      }, '*');
      window.close();
    }
  </script>
\`);`,
    },
  ];

  const apiEndpoints: ApiEndpointItem[] = [
    // 1. Google OAuth 2.0
    {
      method: 'GET',
      path: '/api/auth/google/url',
      category: 'google',
      categoryLabel: 'Google OAuth 2.0',
      desc: 'Cek status konfigurasi & ambil URL otorisasi Google OAuth 2.0 resmi beserta callback URL',
      isProtected: false,
      queryParams: '?origin=https://ais-dev-...',
      responseSample: `{
  "success": true,
  "configured": true,
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "redirectUri": "https://ais-dev-psthdo7fwdvzivkaczrcnn-194164145577.asia-southeast1.run.app/auth/callback"
}`,
    },
    {
      method: 'GET',
      path: '/auth/callback',
      category: 'google',
      categoryLabel: 'Google OAuth 2.0',
      desc: 'Callback redirect handler popup yang menukarkan auth code ke Google Token Endpoint dan mengirim JWT via postMessage',
      isProtected: false,
      queryParams: '?code=4/0Abc...&state=optional',
      responseSample: `<!-- HTML Pop-up closer with window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', token, user }) -->`,
    },
    {
      method: 'POST',
      path: '/api/auth/google/credential',
      category: 'google',
      categoryLabel: 'Google OAuth 2.0',
      desc: 'Verifikasi credential ID Token dari Google Identity Services (One Tap) dan sinkronkan pengguna',
      isProtected: false,
      requestBody: `{
  "credential": "<GOOGLE_ID_TOKEN_JWT>"
}`,
      responseSample: `{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "name": "User", "email": "user@gmail.com", "avatar": "https://..." }
}`,
    },
    {
      method: 'POST',
      path: '/api/auth/google/mock-login',
      category: 'google',
      categoryLabel: 'Google OAuth 2.0',
      desc: 'Simulasi/sandbox 1-klik akun Google untuk pengujian instan tanpa setup GCP eksternal',
      isProtected: false,
      requestBody: `{
  "email": "recobocil.art@gmail.com",
  "name": "Recobocil Art",
  "picture": "https://lh3.googleusercontent.com/a/default"
}`,
      responseSample: `{
  "success": true,
  "message": "Berhasil masuk dengan akun Google!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "name": "Recobocil Art", "email": "recobocil.art@gmail.com" }
}`,
    },

    // 2. Autentikasi & Akun
    {
      method: 'POST',
      path: '/api/auth/register',
      category: 'auth',
      categoryLabel: 'Autentikasi & Akun',
      desc: 'Pendaftaran akun pengguna baru dengan email & password lokal (otomatis seeding 12 kategori bawaan)',
      isProtected: false,
      requestBody: `{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "Password123!"
}`,
    },
    {
      method: 'POST',
      path: '/api/auth/login',
      category: 'auth',
      categoryLabel: 'Autentikasi & Akun',
      desc: 'Login akun lokal untuk mendapatkan JWT Bearer Token',
      isProtected: false,
      requestBody: `{
  "email": "budi@example.com",
  "password": "Password123!"
}`,
    },
    {
      method: 'GET',
      path: '/api/auth/me',
      category: 'auth',
      categoryLabel: 'Autentikasi & Akun',
      desc: 'Ambil profil lengkap pengguna yang sedang aktif dari header Authorization',
      isProtected: true,
      responseSample: `{
  "success": true,
  "user": {
    "id": 1,
    "name": "Recobocil Art",
    "email": "recobocil.art@gmail.com",
    "avatar": "https://...",
    "base_currency": "IDR",
    "auth_provider": "google"
  }
}`,
    },
    {
      method: 'PATCH',
      path: '/api/auth/currency',
      category: 'auth',
      categoryLabel: 'Autentikasi & Akun',
      desc: 'Perbarui preferensi mata uang dasar pengguna (IDR, USD, EUR, SGD, JPY)',
      isProtected: true,
      requestBody: `{ "base_currency": "USD" }`,
    },
    {
      method: 'POST',
      path: '/api/auth/forgot-password',
      category: 'auth',
      categoryLabel: 'Autentikasi & Akun',
      desc: 'Permintaan reset password akun lokal dan pembuatan reset token',
      isProtected: false,
      requestBody: `{ "email": "user@example.com" }`,
    },
    {
      method: 'POST',
      path: '/api/auth/reset-password',
      category: 'auth',
      categoryLabel: 'Autentikasi & Akun',
      desc: 'Konfirmasi pengaturan ulang password dengan token valid',
      isProtected: false,
      requestBody: `{
  "email": "user@example.com",
  "token": "token123",
  "newPassword": "NewPassword2026!"
}`,
    },

    // 3. Transaksi Keuangan
    {
      method: 'GET',
      path: '/api/transactions',
      category: 'transactions',
      categoryLabel: 'Transaksi Keuangan',
      desc: 'Ambil daftar transaksi keuangan pengguna dengan filter tanggal, kategori, dan paginasi',
      isProtected: true,
      queryParams: '?page=1&limit=20&type=expense&category_id=5&search=makan',
    },
    {
      method: 'POST',
      path: '/api/transactions',
      category: 'transactions',
      categoryLabel: 'Transaksi Keuangan',
      desc: 'Tambah transaksi pemasukan atau pengeluaran baru dengan validasi data',
      isProtected: true,
      requestBody: `{
  "category_id": 5,
  "amount": 45000,
  "description": "Makan Siang Nasi Padang",
  "date": "2026-09-07",
  "type": "expense",
  "currency": "IDR"
}`,
    },
    {
      method: 'PUT',
      path: '/api/transactions/:id',
      category: 'transactions',
      categoryLabel: 'Transaksi Keuangan',
      desc: 'Perbarui data transaksi keuangan berdasarkan ID',
      isProtected: true,
      requestBody: `{
  "amount": 50000,
  "description": "Makan Siang + Es Teh"
}`,
    },
    {
      method: 'DELETE',
      path: '/api/transactions/:id',
      category: 'transactions',
      categoryLabel: 'Transaksi Keuangan',
      desc: 'Hapus transaksi keuangan milik pengguna',
      isProtected: true,
    },

    // 4. Kategori Keuangan
    {
      method: 'GET',
      path: '/api/categories',
      category: 'categories',
      categoryLabel: 'Kategori Keuangan',
      desc: 'Ambil semua kategori (kategori default sistem dan kategori kustom pengguna)',
      isProtected: true,
    },
    {
      method: 'POST',
      path: '/api/categories',
      category: 'categories',
      categoryLabel: 'Kategori Keuangan',
      desc: 'Buat kategori kustom baru untuk pemasukan atau pengeluaran',
      isProtected: true,
      requestBody: `{
  "name": "Kopi & Kafe",
  "icon": "Coffee",
  "color": "#8b5cf6",
  "type": "expense"
}`,
    },
    {
      method: 'DELETE',
      path: '/api/categories/:id',
      category: 'categories',
      categoryLabel: 'Kategori Keuangan',
      desc: 'Hapus kategori kustom pengguna',
      isProtected: true,
    },

    // 5. Anggaran (Budgets)
    {
      method: 'GET',
      path: '/api/budgets',
      category: 'budgets',
      categoryLabel: 'Anggaran Bulanan',
      desc: 'Ambil data plafon anggaran, pengeluaran aktual, dan persentase realisasi per kategori',
      isProtected: true,
      queryParams: '?month=9&year=2026',
    },
    {
      method: 'POST',
      path: '/api/budgets',
      category: 'budgets',
      categoryLabel: 'Anggaran Bulanan',
      desc: 'Pasang atau perbarui batas anggaran bulanan per kategori',
      isProtected: true,
      requestBody: `{
  "category_id": 5,
  "month": 9,
  "year": 2026,
  "amount": 2500000,
  "alert_threshold": 80
}`,
    },

    // 6. Transaksi Berulang (Recurring)
    {
      method: 'GET',
      path: '/api/recurring',
      category: 'recurring',
      categoryLabel: 'Transaksi Berulang',
      desc: 'Daftar aturan transaksi berulang aktif dan jadwal eksekusi berikutnya',
      isProtected: true,
    },
    {
      method: 'POST',
      path: '/api/recurring',
      category: 'recurring',
      categoryLabel: 'Transaksi Berulang',
      desc: 'Buat jadwal pencatatan transaksi berulang otomatis (harian, mingguan, bulanan)',
      isProtected: true,
      requestBody: `{
  "category_id": 8,
  "amount": 350000,
  "description": "Internet Indihome",
  "type": "expense",
  "recurring_interval": "monthly",
  "next_run_date": "2026-10-01"
}`,
    },
    {
      method: 'POST',
      path: '/api/recurring/process',
      category: 'recurring',
      categoryLabel: 'Transaksi Berulang',
      desc: 'Jalankan otomasi transaksi berulang yang telah jatuh tempo (cron trigger)',
      isProtected: true,
    },

    // 7. Integrasi Bot WhatsApp & Telegram
    {
      method: 'GET',
      path: '/api/integrations/status',
      category: 'bots',
      categoryLabel: 'Bot WhatsApp & Telegram',
      desc: 'Ambil status koneksi bot WhatsApp & Telegram serta pairing code aktif',
      isProtected: true,
    },
    {
      method: 'POST',
      path: '/api/integrations/pairing-code',
      category: 'bots',
      categoryLabel: 'Bot WhatsApp & Telegram',
      desc: 'Hasilkan kode pairing baru untuk menghubungkan akun Telegram / WhatsApp',
      isProtected: true,
    },
    {
      method: 'POST',
      path: '/api/integrations/simulate',
      category: 'bots',
      categoryLabel: 'Bot WhatsApp & Telegram',
      desc: 'Simulasi pesan natural language (contoh: "makan siang 35rb") untuk pencatatan instan',
      isProtected: true,
      requestBody: `{
  "channel": "telegram",
  "message": "makan siang soto ayam 25000"
}`,
    },
    {
      method: 'POST',
      path: '/api/integrations/telegram/webhook',
      category: 'bots',
      categoryLabel: 'Bot WhatsApp & Telegram',
      desc: 'Webhook publik untuk menerima update pesan dari Telegram Bot API',
      isProtected: false,
    },
    {
      method: 'POST',
      path: '/api/integrations/whatsapp/webhook',
      category: 'bots',
      categoryLabel: 'Bot WhatsApp & Telegram',
      desc: 'Webhook publik untuk menerima pesan masuk dari WhatsApp Cloud API',
      isProtected: false,
    },

    // 8. Laporan & Sistem
    {
      method: 'GET',
      path: '/api/reports/summary',
      category: 'reports',
      categoryLabel: 'Laporan & Sistem',
      desc: 'Ringkasan total saldo, pemasukan, pengeluaran, dan rasio tabungan pengguna',
      isProtected: true,
    },
    {
      method: 'GET',
      path: '/api/reports/trend',
      category: 'reports',
      categoryLabel: 'Laporan & Sistem',
      desc: 'Data tren 6 bulan untuk grafik perbandingan pemasukan vs pengeluaran',
      isProtected: true,
    },
    {
      method: 'GET',
      path: '/api/system/health',
      category: 'reports',
      categoryLabel: 'Laporan & Sistem',
      desc: 'Pemeriksaan status kesehatan server, uptime, dan versi lingkungan',
      isProtected: false,
    },
    {
      method: 'GET',
      path: '/api/system/currencies',
      category: 'reports',
      categoryLabel: 'Laporan & Sistem',
      desc: 'Daftar kurs mata uang internasional aktif (IDR, USD, EUR, SGD, JPY)',
      isProtected: false,
    },
  ];

  const categories = [
    { id: 'all', label: 'Semua Endpoint' },
    { id: 'google', label: 'Google OAuth 2.0 (Baru)' },
    { id: 'auth', label: 'Autentikasi & Akun' },
    { id: 'transactions', label: 'Transaksi' },
    { id: 'categories', label: 'Kategori' },
    { id: 'budgets', label: 'Anggaran' },
    { id: 'recurring', label: 'Recurring' },
    { id: 'bots', label: 'Bot WhatsApp / Telegram' },
    { id: 'reports', label: 'Laporan & Sistem' },
  ];

  const filteredEndpoints =
    selectedCategory === 'all'
      ? apiEndpoints
      : apiEndpoints.filter((ep) => ep.category === selectedCategory);

  const markdownDocs = `# FinTrack REST API Documentation
Base URL: /api
Auth: JWT Bearer Token (Authorization: Bearer <token>)

Endpoints Summary:
1. Google OAuth 2.0
- GET  /api/auth/google/url          (Cek status konfigurasi & auth URL Google)
- GET  /auth/callback                 (Callback handler popup postMessage)
- POST /api/auth/google/credential   (Verifikasi ID Token Google One Tap)
- POST /api/auth/google/mock-login   (Simulasi login/registrasi instan Google)

2. Autentikasi & Akun
- POST  /api/auth/register           (Daftar akun lokal)
- POST  /api/auth/login              (Login akun lokal & dapatkan JWT)
- GET   /api/auth/me                 (Ambil profil user aktif - Protected)
- PATCH /api/auth/currency           (Update mata uang dasar - Protected)
- POST  /api/auth/forgot-password    (Permintaan reset password)
- POST  /api/auth/reset-password     (Reset password dengan token)

3. Transaksi & Kategori
- GET    /api/transactions           (Daftar transaksi dengan filter & paginasi)
- POST   /api/transactions           (Catat transaksi baru)
- PUT    /api/transactions/:id       (Update transaksi)
- DELETE /api/transactions/:id       (Hapus transaksi)
- GET    /api/categories             (Daftar kategori)
- POST   /api/categories             (Buat kategori baru)

4. Anggaran & Recurring
- GET  /api/budgets                  (Monitoring anggaran bulanan)
- POST /api/budgets                  (Set anggaran kategori)
- GET  /api/recurring                (Daftar recurring rules)
- POST /api/recurring                (Buat recurring rule)
- POST /api/recurring/process        (Trigger eksekusi recurring yang jatuh tempo)

5. Bot WhatsApp & Telegram
- GET  /api/integrations/status      (Status integrasi bot & pairing code)
- POST /api/integrations/pairing-code(Generate pairing code baru)
- POST /api/integrations/simulate    (Simulasi input chat transaksi otomatis)
- POST /api/integrations/telegram/webhook (Webhook Telegram Bot API)
- POST /api/integrations/whatsapp/webhook (Webhook WhatsApp Cloud API)

6. Laporan & Sistem
- GET /api/reports/summary           (Ringkasan total saldo & tabungan)
- GET /api/reports/trend             (Tren finansial 6 bulan)
- GET /api/system/health             (Health check status)
- GET /api/system/currencies         (Daftar nilai tukar mata uang)`;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownDocs);
    setIsMarkdownCopied(true);
    setTimeout(() => setIsMarkdownCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              Architecture & API Documentation
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              v2.1 Google OAuth Ready
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Dokumentasi lengkap REST API FinTrack, integrasi Google Sign-In, webhook bot chat, dan solusi arsitektur backend.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveSection('api')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeSection === 'api'
                ? 'bg-white dark:bg-slate-900 text-sky-500 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            REST API Explorer
          </button>
          <button
            onClick={() => setActiveSection('solutions')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeSection === 'solutions'
                ? 'bg-white dark:bg-slate-900 text-sky-500 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Solusi Arsitektur (8 Topik)
          </button>
          <button
            onClick={() => setActiveSection('markdown')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeSection === 'markdown'
                ? 'bg-white dark:bg-slate-900 text-sky-500 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Spesifikasi Markdown
          </button>
          <button
            onClick={() => setActiveSection('docker')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeSection === 'docker'
                ? 'bg-white dark:bg-slate-900 text-sky-500 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Container className="w-3.5 h-3.5" />
            Docker & Deploy
          </button>
        </div>
      </div>

      {/* SECTION 1: REST API EXPLORER */}
      {activeSection === 'api' && (
        <div className="space-y-6">
          {/* Quick Notice Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-200 dark:border-sky-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />
              <p className="text-slate-700 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white font-semibold">Update Progres Terkini:</strong> Penambahan endpoint Google OAuth 2.0 (`/api/auth/google/*` dan `/auth/callback`), integrasi profil Google ID, serta webhook bot WhatsApp & Telegram.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Lock className="w-3 h-3 text-amber-500" /> Protected (JWT)
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                <Unlock className="w-3 h-3 text-emerald-500" /> Public
              </span>
            </div>
          </div>

          {/* Filter Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Endpoints Table / Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                  Daftar Endpoint ({filteredEndpoints.length})
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Klik pada baris endpoint untuk melihat parameter, request body, dan format response.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEndpoints.map((ep, idx) => {
                const isExpanded = expandedItem === `${ep.method}-${ep.path}`;
                const methodColor =
                  ep.method === 'GET'
                    ? 'bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400'
                    : ep.method === 'POST'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                    : ep.method === 'PUT' || ep.method === 'PATCH'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400';

                return (
                  <div key={idx} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <div
                      onClick={() =>
                        setExpandedItem(isExpanded ? null : `${ep.method}-${ep.path}`)
                      }
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs cursor-pointer select-none"
                    >
                      <div className="flex items-start md:items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider shrink-0 ${methodColor}`}
                        >
                          {ep.method}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                              {ep.path}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              {ep.categoryLabel}
                            </span>
                            {ep.isProtected ? (
                              <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
                                <Lock className="w-2.5 h-2.5" /> JWT Bearer
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                                <Unlock className="w-2.5 h-2.5" /> Public
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 line-clamp-1">
                            {ep.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => copyToClipboard(ep.path, `${ep.method}-${ep.path}`)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Salin path endpoint"
                        >
                          {copiedPath === `${ep.method}-${ep.path}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {ep.method === 'GET' && !ep.path.includes(':') && (
                          <button
                            onClick={() => testApi(ep.path)}
                            disabled={testingEndpoint === ep.path}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 dark:hover:bg-sky-900 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors"
                          >
                            {testingEndpoint === ep.path ? 'Menguji...' : 'Test API'}
                          </button>
                        )}

                        <button
                          onClick={() =>
                            setExpandedItem(isExpanded ? null : `${ep.method}-${ep.path}`)
                          }
                          className="p-1 text-slate-400"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail View */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80 text-xs space-y-3">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                          <p className="font-semibold text-slate-800 dark:text-white">
                            Deskripsi Fungsional:
                          </p>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                            {ep.desc}
                          </p>
                        </div>

                        {ep.queryParams && (
                          <div className="space-y-1">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                              Query Parameters:
                            </span>
                            <div className="bg-slate-900 p-2.5 rounded-lg text-emerald-400 font-mono text-[11px]">
                              {ep.queryParams}
                            </div>
                          </div>
                        )}

                        {ep.requestBody && (
                          <div className="space-y-1">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                              Request Payload JSON:
                            </span>
                            <pre className="bg-slate-950 p-3 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto border border-slate-800">
                              {ep.requestBody}
                            </pre>
                          </div>
                        )}

                        {ep.responseSample && (
                          <div className="space-y-1">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                              Sample Response JSON:
                            </span>
                            <pre className="bg-slate-950 p-3 rounded-lg text-emerald-300 font-mono text-[11px] overflow-x-auto border border-slate-800">
                              {ep.responseSample}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Test Output Console */}
          {testResult && (
            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono shadow-xl">
              <div className="flex items-center justify-between text-slate-400 pb-2 mb-3 border-b border-slate-800">
                <span className="font-bold flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-sky-400" />
                  Hasil Response: {testResult.endpoint}
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                      testResult.status < 400
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    HTTP {testResult.status}
                  </span>
                  <button
                    onClick={() => setTestResult(null)}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Tutup
                  </button>
                </div>
              </div>
              <pre className="text-emerald-300 overflow-x-auto max-h-80 leading-relaxed">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: SOLUTIONS TO ARCHITECTURE CHALLENGES */}
      {activeSection === 'solutions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 font-medium">
            Penjelasan komprehensif implementasi teknis dan penyelesaian masalah arsitektur backend, autentikasi Google OAuth lintas domain, dan basis data:
          </div>

          <div className="grid grid-cols-1 gap-6">
            {solutions.map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    {item.title}
                  </h3>
                </div>

                <div className="text-xs space-y-1.5 leading-relaxed">
                  <p className="text-slate-500 dark:text-slate-400">
                    <strong className="text-rose-500">Tantangan:</strong> {item.issue}
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong className="text-emerald-600 dark:text-emerald-400">Solusi FinTrack:</strong>{' '}
                    {item.solution}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4 overflow-x-auto text-[11px] font-mono text-slate-300 border border-slate-800">
                  <pre>{item.codeSnippet}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: FULL MARKDOWN SPEC */}
      {activeSection === 'markdown' && (
        <div className="space-y-4">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-sky-500" />
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                    Spesifikasi API Markdown (/docs/API_DOCUMENTATION.md)
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Dokumen spesifikasi format teks Markdown siap pakai untuk Postman, Swagger, atau dokumentasi tim.
                  </p>
                </div>
              </div>

              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors self-start sm:self-auto shrink-0 shadow-sm"
              >
                {isMarkdownCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Salin Semua Markdown
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl text-slate-200 font-mono text-xs overflow-x-auto max-h-[600px] border border-slate-800 leading-relaxed">
              <pre>{markdownDocs}</pre>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: DOCKER & DEPLOYMENT */}
      {activeSection === 'docker' && (
        <div className="space-y-4">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <Container className="w-5 h-5 text-sky-500" />
              <h3 className="font-bold text-slate-800 dark:text-white">
                Perintah Menjalankan Docker Compose
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Seluruh layanan (PostgreSQL, Backend Express, dan Nginx Reverse Proxy) telah dikonfigurasi dalam berkas <code className="text-sky-500 font-mono">docker-compose.yml</code>.
            </p>

            <div className="bg-slate-950 text-slate-300 p-4 rounded-xl font-mono text-xs space-y-2 border border-slate-800">
              <p className="text-slate-500"># 1. Menjalankan seluruh stack layanan di latar belakang</p>
              <p className="text-emerald-400">docker-compose up -d --build</p>
              <p className="text-slate-500 mt-2"># 2. Melihat status container aktif</p>
              <p className="text-emerald-400">docker-compose ps</p>
              <p className="text-slate-500 mt-2"># 3. Melihat log transaksi dan audit API</p>
              <p className="text-emerald-400">docker-compose logs -f backend</p>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-2">
                Pemetaan Port Produksi & Konfigurasi Google Cloud:
              </h4>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-5">
                <li>Port 80: Nginx Frontend & Reverse Proxy ke API</li>
                <li>Port 3000: Express Backend Service</li>
                <li>Port 5432: PostgreSQL Database Engine</li>
                <li>
                  <strong className="text-sky-500">Authorized Redirect URI (Google Console):</strong>{' '}
                  <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                    https://ais-dev-psthdo7fwdvzivkaczrcnn-194164145577.asia-southeast1.run.app/auth/callback
                  </code>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
