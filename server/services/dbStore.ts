import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface DbUser {
  id: number;
  name: string;
  email: string;
  password: string;
  avatar: string;
  base_currency: string;
  reset_token: string | null;
  reset_token_expiry: string | null;
  // Google Auth
  google_id?: string | null;
  auth_provider?: 'local' | 'google' | null;
  // WA & Telegram Bot Integrations
  telegram_chat_id?: string | null;
  telegram_username?: string | null;
  telegram_bot_token?: string | null;
  telegram_pairing_code?: string | null;
  whatsapp_phone?: string | null;
  whatsapp_pairing_code?: string | null;
  webhook_secret?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: number;
  user_id: number | null; // null means default system category
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbTransaction {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense';
  is_recurring: boolean;
  recurring_interval?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  currency: string;
  exchange_rate: number;
  created_at: string;
  updated_at: string;
}

export interface DbBudget {
  id: number;
  user_id: number;
  category_id: number;
  month: number;
  year: number;
  amount: number;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface DbRecurringRule {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  recurring_interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_run_date: string;
  last_run_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinTrackData {
  users: DbUser[];
  categories: DbCategory[];
  transactions: DbTransaction[];
  budgets: DbBudget[];
  recurring_rules: DbRecurringRule[];
  nextIds: {
    users: number;
    categories: number;
    transactions: number;
    budgets: number;
    recurring_rules: number;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'fintrack_data.json');

const DEFAULT_CATEGORIES: Omit<DbCategory, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  { name: 'Gaji Pokok', icon: 'Briefcase', color: '#10b981', type: 'income', is_default: true },
  { name: 'Freelance & Bisnis', icon: 'Laptop', color: '#0ea5e9', type: 'income', is_default: true },
  { name: 'Investasi & Dividen', icon: 'TrendingUp', color: '#8b5cf6', type: 'income', is_default: true },
  { name: 'Hadiah & Bonus', icon: 'Gift', color: '#ec4899', type: 'income', is_default: true },
  { name: 'Makanan & Minuman', icon: 'Utensils', color: '#f97316', type: 'expense', is_default: true },
  { name: 'Transportasi', icon: 'Car', color: '#0284c7', type: 'expense', is_default: true },
  { name: 'Tempat Tinggal', icon: 'Home', color: '#6366f1', type: 'expense', is_default: true },
  { name: 'Tagihan & Utilitas', icon: 'Zap', color: '#eab308', type: 'expense', is_default: true },
  { name: 'Kesehatan & Medis', icon: 'HeartPulse', color: '#ef4444', type: 'expense', is_default: true },
  { name: 'Belanja & Hiburan', icon: 'ShoppingBag', color: '#d946ef', type: 'expense', is_default: true },
  { name: 'Pendidikan', icon: 'GraduationCap', color: '#14b8a6', type: 'expense', is_default: true },
  { name: 'Tabungan & Dana Darurat', icon: 'PiggyBank', color: '#10b981', type: 'expense', is_default: true },
];

let memoryDb: FinTrackData | null = null;

function ensureDirectoryExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getInitialData(): FinTrackData {
  const now = new Date().toISOString();

  let catId = 1;
  const categories: DbCategory[] = DEFAULT_CATEGORIES.map((cat) => ({
    ...cat,
    id: catId++,
    user_id: 1,
    created_at: now,
    updated_at: now,
  }));

  // Generate realistic seed transactions for this month and last month
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const txDate = (day: number, monthOffset = 0) => {
    let d = new Date(currentYear, currentDate.getMonth() + monthOffset, day);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const getCatIdByName = (name: string) => categories.find((c) => c.name === name)?.id || 1;

  let txId = 1;
  const transactions: DbTransaction[] = [
    // Current Month Income
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Gaji Pokok'),
      amount: 17500000,
      description: 'Gaji Bulanan Tech Lead',
      date: txDate(1, 0),
      type: 'income',
      is_recurring: true,
      recurring_interval: 'monthly',
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Freelance & Bisnis'),
      amount: 4200000,
      description: 'Project Web Application Redesign',
      date: txDate(4, 0),
      type: 'income',
      is_recurring: false,
      recurring_interval: null,
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Investasi & Dividen'),
      amount: 850000,
      description: 'Dividen Saham BBCA & Reksadana',
      date: txDate(5, 0),
      type: 'income',
      is_recurring: false,
      recurring_interval: null,
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
    // Current Month Expenses
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Tempat Tinggal'),
      amount: 3200000,
      description: 'Sewa Apartemen & Biaya IPL Bulanan',
      date: txDate(2, 0),
      type: 'expense',
      is_recurring: true,
      recurring_interval: 'monthly',
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Tagihan & Utilitas'),
      amount: 680000,
      description: 'Listrik PLN & Wi-Fi Indihome Fiber',
      date: txDate(3, 0),
      type: 'expense',
      is_recurring: true,
      recurring_interval: 'monthly',
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Makanan & Minuman'),
      amount: 1450000,
      description: 'Belanja Mingguan Supermarket & Dapur',
      date: txDate(3, 0),
      type: 'expense',
      is_recurring: false,
      recurring_interval: null,
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Transportasi'),
      amount: 450000,
      description: 'Bensin Shell V-Power & Tol Trans Jawa',
      date: txDate(5, 0),
      type: 'expense',
      is_recurring: false,
      recurring_interval: null,
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Belanja & Hiburan'),
      amount: 380000,
      description: 'Langganan Netflix & Spotify Family',
      date: txDate(5, 0),
      type: 'expense',
      is_recurring: true,
      recurring_interval: 'monthly',
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Makanan & Minuman'),
      amount: 285000,
      description: 'Makan Siang & Kopi Tim Kantor',
      date: txDate(6, 0),
      type: 'expense',
      is_recurring: false,
      recurring_interval: null,
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Tabungan & Dana Darurat'),
      amount: 4000000,
      description: 'Autodebit Rekening Dana Darurat',
      date: txDate(2, 0),
      type: 'expense',
      is_recurring: true,
      recurring_interval: 'monthly',
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
    // Last Month Transactions for Trend Charts
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Gaji Pokok'),
      amount: 17500000,
      description: 'Gaji Bulan Lalu',
      date: txDate(1, -1),
      type: 'income',
      is_recurring: true,
      recurring_interval: 'monthly',
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Freelance & Bisnis'),
      amount: 3000000,
      description: 'Konsultasi Arsitektur Database',
      date: txDate(15, -1),
      type: 'income',
      is_recurring: false,
      recurring_interval: null,
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Makanan & Minuman'),
      amount: 3100000,
      description: 'Total Konsumsi & Cafe Bulan Lalu',
      date: txDate(18, -1),
      type: 'expense',
      is_recurring: false,
      recurring_interval: null,
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Tempat Tinggal'),
      amount: 3200000,
      description: 'Sewa Bulan Lalu',
      date: txDate(2, -1),
      type: 'expense',
      is_recurring: true,
      recurring_interval: 'monthly',
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
    {
      id: txId++,
      user_id: 1,
      category_id: getCatIdByName('Transportasi'),
      amount: 920000,
      description: 'Bensin & Servis Rutin Motor/Mobil',
      date: txDate(20, -1),
      type: 'expense',
      is_recurring: false,
      recurring_interval: null,
      currency: 'IDR',
      exchange_rate: 1.0,
      created_at: now,
      updated_at: now,
    },
  ];

  let bgId = 1;
  const budgets: DbBudget[] = [
    {
      id: bgId++,
      user_id: 1,
      category_id: getCatIdByName('Makanan & Minuman'),
      month: currentMonth,
      year: currentYear,
      amount: 3500000,
      alert_threshold: 80,
      created_at: now,
      updated_at: now,
    },
    {
      id: bgId++,
      user_id: 1,
      category_id: getCatIdByName('Transportasi'),
      month: currentMonth,
      year: currentYear,
      amount: 1000000,
      alert_threshold: 80,
      created_at: now,
      updated_at: now,
    },
    {
      id: bgId++,
      user_id: 1,
      category_id: getCatIdByName('Belanja & Hiburan'),
      month: currentMonth,
      year: currentYear,
      amount: 800000,
      alert_threshold: 80,
      created_at: now,
      updated_at: now,
    },
    {
      id: bgId++,
      user_id: 1,
      category_id: getCatIdByName('Tagihan & Utilitas'),
      month: currentMonth,
      year: currentYear,
      amount: 900000,
      alert_threshold: 80,
      created_at: now,
      updated_at: now,
    },
  ];

  let rcId = 1;
  const recurring_rules: DbRecurringRule[] = [
    {
      id: rcId++,
      user_id: 1,
      category_id: getCatIdByName('Gaji Pokok'),
      amount: 17500000,
      description: 'Gaji Bulanan Tech Lead',
      type: 'income',
      recurring_interval: 'monthly',
      next_run_date: `${currentYear}-${pad(currentMonth === 12 ? 1 : currentMonth + 1)}-01`,
      last_run_date: txDate(1, 0),
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: rcId++,
      user_id: 1,
      category_id: getCatIdByName('Tempat Tinggal'),
      amount: 3200000,
      description: 'Sewa Apartemen & IPL',
      type: 'expense',
      recurring_interval: 'monthly',
      next_run_date: `${currentYear}-${pad(currentMonth === 12 ? 1 : currentMonth + 1)}-02`,
      last_run_date: txDate(2, 0),
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: rcId++,
      user_id: 1,
      category_id: getCatIdByName('Belanja & Hiburan'),
      amount: 380000,
      description: 'Langganan Streaming & Musik',
      type: 'expense',
      recurring_interval: 'monthly',
      next_run_date: `${currentYear}-${pad(currentMonth === 12 ? 1 : currentMonth + 1)}-05`,
      last_run_date: txDate(5, 0),
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  return {
    users: [],
    categories,
    transactions: [],
    budgets: [],
    recurring_rules: [],
    nextIds: {
      users: 1,
      categories: catId,
      transactions: 1,
      budgets: 1,
      recurring_rules: 1,
    },
  };
}

export function loadDb(): FinTrackData {
  if (memoryDb) return memoryDb;

  ensureDirectoryExists(DATA_DIR);

  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      memoryDb = JSON.parse(raw);
      if (memoryDb && memoryDb.users && memoryDb.transactions) {
        // Purge any legacy demo user and associated mock records
        const hasDemo = memoryDb.users.some((u: DbUser) => u.email === 'demo@fintrack.id');
        if (hasDemo) {
          memoryDb.users = memoryDb.users.filter((u: DbUser) => u.email !== 'demo@fintrack.id');
          memoryDb.transactions = memoryDb.transactions.filter((t: DbTransaction) => t.user_id !== 1);
          memoryDb.budgets = memoryDb.budgets.filter((b: DbBudget) => b.user_id !== 1);
          memoryDb.recurring_rules = memoryDb.recurring_rules.filter((r: DbRecurringRule) => r.user_id !== 1);
          saveDb(memoryDb);
        }
        return memoryDb;
      }
    } catch (e) {
      console.error('Error reading db file, regenerating defaults:', e);
    }
  }

  const initial = getInitialData();
  saveDb(initial);
  memoryDb = initial;
  return memoryDb;
}

export function saveDb(data: FinTrackData): void {
  ensureDirectoryExists(DATA_DIR);
  memoryDb = data;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write db file:', err);
  }
}

export function seedDefaultCategoriesForUser(userId: number): DbCategory[] {
  const db = loadDb();
  const now = new Date().toISOString();
  const created: DbCategory[] = [];

  DEFAULT_CATEGORIES.forEach((template) => {
    const newCat: DbCategory = {
      id: db.nextIds.categories++,
      user_id: userId,
      name: template.name,
      icon: template.icon,
      color: template.color,
      type: template.type,
      is_default: true,
      created_at: now,
      updated_at: now,
    };
    db.categories.push(newCat);
    created.push(newCat);
  });

  saveDb(db);
  return created;
}
