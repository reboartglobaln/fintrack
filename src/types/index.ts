export type TransactionType = 'income' | 'expense';

export type RecurringInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  base_currency: string;
  auth_provider?: 'local' | 'google';
  created_at?: string;
}

export interface Category {
  id: number;
  user_id?: number | null;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  is_default: boolean;
  created_at?: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  description: string;
  date: string;
  type: TransactionType;
  is_recurring: boolean;
  recurring_interval?: RecurringInterval | null;
  currency: string;
  exchange_rate: number;
  category?: Category;
  created_at?: string;
  updated_at?: string;
}

export interface Budget {
  id: number;
  user_id: number;
  category_id: number;
  month: number;
  year: number;
  amount: number;
  alert_threshold: number;
  category?: Category;
  spent?: number;
  remaining?: number;
  percentage?: number;
  status?: 'safe' | 'warning' | 'danger';
  created_at?: string;
}

export interface RecurringRule {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  description: string;
  type: TransactionType;
  recurring_interval: RecurringInterval;
  next_run_date: string;
  last_run_date: string | null;
  is_active: boolean;
  category?: Category;
  created_at?: string;
}

export interface SummaryData {
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
  monthNetSavings: number;
  savingsRate: number;
  incomeGrowth: number;
  expenseGrowth: number;
  period: {
    month: number;
    year: number;
  };
  recentTransactions: Transaction[];
  topExpenseCategories: {
    id: number;
    name: string;
    color: string;
    icon: string;
    amount: number;
    percentage: number;
  }[];
}

export interface TrendData {
  labels: string[];
  income: number[];
  expense: number[];
  net: number[];
}

export interface CategoryBreakdownItem {
  id: number;
  name: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rateToIdr: number;
}

export interface BotIntegrationStatus {
  telegram_chat_id: string | null;
  telegram_username: string | null;
  telegram_bot_token: string | null;
  telegram_pairing_code: string;
  whatsapp_phone: string | null;
  whatsapp_pairing_code: string;
  webhook_url_telegram: string;
  webhook_url_whatsapp: string;
  is_telegram_connected: boolean;
  is_whatsapp_connected: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: User;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  errors?: Record<string, string>;
}
