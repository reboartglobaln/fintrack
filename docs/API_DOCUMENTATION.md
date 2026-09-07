# 📚 Dokumentasi API FinTrack - Personal Finance Tracker

Dokumentasi lengkap REST API FinTrack, mencakup autentikasi Google OAuth 2.0, manajemen akun, pencatatan transaksi, anggaran (budgets), transaksi berulang (recurring), webhook bot WhatsApp & Telegram, serta laporan keuangan.

---

## 🌐 Informasi Dasar & Base URL

- **Development URL**: `https://ais-dev-psthdo7fwdvzivkaczrcnn-194164145577.asia-southeast1.run.app`
- **Shared Preview URL**: `https://ais-pre-psthdo7fwdvzivkaczrcnn-194164145577.asia-southeast1.run.app`
- **Prefix API**: `/api`
- **Format Data**: JSON (`Content-Type: application/json`)
- **Skema Autentikasi**: JWT Bearer Token (`Authorization: Bearer <token>`)

---

## 🔐 1. Autentikasi & Akun Pengguna

### 1.1 Registrasi Akun Lokal
- **Method**: `POST`
- **Endpoint**: `/api/auth/register`
- **Deskripsi**: Mendaftarkan pengguna baru dengan email dan password lokal. Otomatis menginisialisasi 12 kategori keuangan default.
- **Request Body**:
```json
{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "Password123!"
}
```
- **Response 201 Created**:
```json
{
  "success": true,
  "message": "Registrasi akun berhasil.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Budi%20Santoso",
    "base_currency": "IDR",
    "auth_provider": "local"
  }
}
```

### 1.2 Login Akun Lokal
- **Method**: `POST`
- **Endpoint**: `/api/auth/login`
- **Deskripsi**: Masuk dengan email & password terdaftar untuk mendapatkan token JWT.
- **Request Body**:
```json
{
  "email": "budi@example.com",
  "password": "Password123!"
}
```
- **Response 200 OK**:
```json
{
  "success": true,
  "message": "Login berhasil.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### 1.3 Permintaan Reset Password
- **Method**: `POST`
- **Endpoint**: `/api/auth/forgot-password`
- **Request Body**:
```json
{ "email": "budi@example.com" }
```
- **Response 200 OK**:
```json
{
  "success": true,
  "message": "Token reset password berhasil dibuat.",
  "resetToken": "abcd1234efgh5678"
}
```

### 1.4 Eksekusi Reset Password
- **Method**: `POST`
- **Endpoint**: `/api/auth/reset-password`
- **Request Body**:
```json
{
  "email": "budi@example.com",
  "token": "abcd1234efgh5678",
  "newPassword": "NewPassword2026!"
}
```

### 1.5 Ambil Data Profil Pengguna Aktif (Protected)
- **Method**: `GET`
- **Endpoint**: `/api/auth/me`
- **Header**: `Authorization: Bearer <token>`
- **Response 200 OK**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Recobocil Art",
    "email": "recobocil.art@gmail.com",
    "avatar": "https://lh3.googleusercontent.com/...",
    "base_currency": "IDR",
    "auth_provider": "google"
  }
}
```

### 1.6 Update Mata Uang Dasar Pengguna (Protected)
- **Method**: `PATCH`
- **Endpoint**: `/api/auth/currency`
- **Header**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{ "base_currency": "USD" }
```

---

## 🔑 2. Google OAuth 2.0 Integration

### 2.1 Cek Konfigurasi & URL Otorisasi Google
- **Method**: `GET`
- **Endpoint**: `/api/auth/google/url`
- **Query Params**:
  - `origin` *(opsional)*: URL asal aplikasi frontend pemanggil (e.g. `https://ais-dev-...`)
- **Deskripsi**: Mengembalikan URL otorisasi Google OAuth 2.0 resmi dan callback URL yang valid. Jika `GOOGLE_CLIENT_ID` belum diisi di environment, sistem mengembalikan panduan setup dan URL redirect yang harus didaftarkan di Google Cloud Console.
- **Response 200 OK (Terkonfigurasi)**:
```json
{
  "success": true,
  "configured": true,
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=openid+email+profile",
  "redirectUri": "https://ais-dev-psthdo7fwdvzivkaczrcnn-194164145577.asia-southeast1.run.app/auth/callback"
}
```

### 2.2 Google OAuth Callback Handler (Pop-up Window)
- **Method**: `GET`
- **Endpoint**: `/auth/callback`
- **Deskripsi**: Endpoint tujuan redirect Google setelah otorisasi pengguna di jendela pop-up.
  1. Menerima query parameter `code` dari Google.
  2. Menukarkan code ke Google Token Endpoint (`https://oauth2.googleapis.com/token`) menggunakan `GOOGLE_CLIENT_SECRET`.
  3. Mengambil profil pengguna dari `https://www.googleapis.com/oauth2/v3/userinfo`.
  4. Mencocokkan pengguna lokal atau membuat akun baru secara otomatis (beserta kategori default).
  5. Menghasilkan JWT token FinTrack.
  6. Mengirimkan postMessage ke jendela induk:
     ```javascript
     window.opener.postMessage({
       type: 'GOOGLE_AUTH_SUCCESS',
       token: 'eyJhbGciOi...',
       user: { id: 1, name: '...', email: '...', avatar: '...' },
       isNew: false
     }, '*');
     window.close();
     ```

### 2.3 Verifikasi Google Credential (Google Identity Services / One Tap)
- **Method**: `POST`
- **Endpoint**: `/api/auth/google/credential`
- **Deskripsi**: Menerima token ID Google JWT dari SDK Google Identity Services di frontend, mendekode payload profil secara aman, dan mengautentikasi pengguna.
- **Request Body**:
```json
{
  "credential": "<GOOGLE_ID_TOKEN>"
}
```

### 2.4 Google Sandbox / Instant Simulation Login
- **Method**: `POST`
- **Endpoint**: `/api/auth/google/mock-login`
- **Deskripsi**: Memungkinkan pengujian pendaftaran dan login Google 1-klik secara instan di sandbox preview tanpa perlu mengatur Google Cloud Console terlebih dahulu.
- **Request Body**:
```json
{
  "email": "recobocil.art@gmail.com",
  "name": "Recobocil Art",
  "picture": "https://lh3.googleusercontent.com/a/default-user"
}
```
- **Response 200 OK**:
```json
{
  "success": true,
  "message": "Berhasil masuk dengan akun Google!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isNew": false,
  "user": {
    "id": 1,
    "name": "Recobocil Art",
    "email": "recobocil.art@gmail.com",
    "avatar": "https://lh3.googleusercontent.com/a/default-user",
    "base_currency": "IDR"
  }
}
```

---

## 💰 3. Transaksi Keuangan (Protected)

Header wajib: `Authorization: Bearer <token>`

### 3.1 Ambil Daftar Transaksi
- **Method**: `GET`
- **Endpoint**: `/api/transactions`
- **Query Params**:
  - `page` (default: 1): Nomor halaman
  - `limit` (default: 20): Jumlah item per halaman
  - `type` ('income' | 'expense'): Filter jenis transaksi
  - `category_id`: Filter ID kategori
  - `start_date` / `end_date`: Filter rentang tanggal (`YYYY-MM-DD`)
  - `search`: Pencarian deskripsi transaksi
- **Response 200 OK**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "category_id": 5,
      "amount": 45000,
      "description": "Makan Siang Nasi Padang",
      "date": "2026-09-07",
      "type": "expense",
      "currency": "IDR",
      "exchange_rate": 1.0,
      "category_name": "Makanan & Minuman",
      "category_icon": "Utensils",
      "category_color": "#f97316"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### 3.2 Tambah Transaksi Baru
- **Method**: `POST`
- **Endpoint**: `/api/transactions`
- **Request Body**:
```json
{
  "category_id": 5,
  "amount": 45000,
  "description": "Makan Siang Nasi Padang",
  "date": "2026-09-07",
  "type": "expense",
  "currency": "IDR"
}
```

### 3.3 Ubah Transaksi
- **Method**: `PUT`
- **Endpoint**: `/api/transactions/:id`

### 3.4 Hapus Transaksi
- **Method**: `DELETE`
- **Endpoint**: `/api/transactions/:id`

---

## 🏷️ 4. Kategori Keuangan (Protected)

Header wajib: `Authorization: Bearer <token>`

### 4.1 Ambil Semua Kategori
- **Method**: `GET`
- **Endpoint**: `/api/categories`
- **Response 200 OK**: Mengembalikan daftar kategori sistem bawaan dan kategori kustom pengguna.

### 4.2 Tambah Kategori Kustom
- **Method**: `POST`
- **Endpoint**: `/api/categories`
- **Request Body**:
```json
{
  "name": "Kopi & Kafe",
  "icon": "Coffee",
  "color": "#8b5cf6",
  "type": "expense"
}
```

### 4.3 Hapus Kategori Kustom
- **Method**: `DELETE`
- **Endpoint**: `/api/categories/:id`

---

## 🎯 5. Anggaran Bulanan (Budgets) (Protected)

Header wajib: `Authorization: Bearer <token>`

### 5.1 Ambil Data Anggaran
- **Method**: `GET`
- **Endpoint**: `/api/budgets`
- **Query Params**: `month` (1-12), `year` (e.g. 2026)
- **Response 200 OK**: Menampilkan target anggaran dan perhitungan realisasi pengeluaran aktual serta persentase pemakaian (`spent`, `percentage`, `status`).

### 5.2 Pasang / Perbarui Plafon Anggaran
- **Method**: `POST`
- **Endpoint**: `/api/budgets`
- **Request Body**:
```json
{
  "category_id": 5,
  "month": 9,
  "year": 2026,
  "amount": 2500000,
  "alert_threshold": 80
}
```

---

## 🔁 6. Transaksi Berulang (Recurring Rules) (Protected)

Header wajib: `Authorization: Bearer <token>`

### 6.1 Daftar Transaksi Berulang
- **Method**: `GET`
- **Endpoint**: `/api/recurring`

### 6.2 Buat Jadwal Transaksi Berulang
- **Method**: `POST`
- **Endpoint**: `/api/recurring`
- **Request Body**:
```json
{
  "category_id": 8,
  "amount": 350000,
  "description": "Langganan Internet Indihome",
  "type": "expense",
  "recurring_interval": "monthly",
  "next_run_date": "2026-10-01"
}
```

### 6.3 Eksekusi Otomatisasi Transaksi Jatuh Tempo
- **Method**: `POST`
- **Endpoint**: `/api/recurring/process`
- **Deskripsi**: Mengecek semua aturan transaksi berulang yang telah mencapai `next_run_date`, otomatis membuat transaksi baru, dan memperbarui tanggal eksekusi berikutnya.

---

## 🤖 7. Integrasi Bot WhatsApp & Telegram

### 7.1 Status Integrasi & Pairing Code (Protected)
- **Method**: `GET`
- **Endpoint**: `/api/integrations/status`
- **Response**: Mengembalikan status koneksi WhatsApp & Telegram serta `pairing_code` aktif untuk menghubungkan akun.

### 7.2 Regenerate Pairing Code (Protected)
- **Method**: `POST`
- **Endpoint**: `/api/integrations/pairing-code`

### 7.3 Simulasi Chat Message (Protected)
- **Method**: `POST`
- **Endpoint**: `/api/integrations/simulate`
- **Deskripsi**: Menguji engine parsing bahasa alami untuk pencatatan otomatis transaksi (contoh format: `makan siang 35rb`, `gaji bulanan 10jt`, `laporan`).
- **Request Body**:
```json
{
  "channel": "telegram",
  "message": "makan siang nasi padang 35rb"
}
```

### 7.4 Webhook Publik Telegram
- **Method**: `POST`
- **Endpoint**: `/api/integrations/telegram/webhook`
- **Deskripsi**: Menerima payload update pesan dari Telegram Bot API.

### 7.5 Webhook Publik WhatsApp (Meta Cloud API / Gateway)
- **Method**: `GET` & `POST`
- **Endpoint**: `/api/integrations/whatsapp/webhook`
- **GET**: Verifikasi `hub.challenge` dari Meta Cloud API.
- **POST**: Menerima pesan masuk WhatsApp dan mencatat transaksi ke database pengguna yang terpasangkan.

---

## 📊 8. Laporan & Sistem

### 8.1 Ringkasan Keuangan
- **Method**: `GET`
- **Endpoint**: `/api/reports/summary`
- **Header**: `Authorization: Bearer <token>`
- **Response**: Total pemasukan, pengeluaran, saldo bersih, dan persentase tabungan.

### 8.2 Tren Finansial 6 Bulan
- **Method**: `GET`
- **Endpoint**: `/api/reports/trend`
- **Header**: `Authorization: Bearer <token>`

### 8.3 Health Check Server
- **Method**: `GET`
- **Endpoint**: `/api/system/health`
- **Public**: Ya

### 8.4 Konversi Kurs Mata Uang
- **Method**: `GET`
- **Endpoint**: `/api/system/currencies/convert?amount=100000&from=IDR&to=USD`
- **Public**: Ya
