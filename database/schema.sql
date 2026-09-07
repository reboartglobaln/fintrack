-- ========================================================================
-- FinTrack - Personal Finance Tracker Database Schema (PostgreSQL)
-- ========================================================================

-- 1. Enable UUID Extension (Optional, using SERIAL/BIGSERIAL or UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    base_currency VARCHAR(10) DEFAULT 'IDR',
    reset_token VARCHAR(255) NULL,
    reset_token_expiry TIMESTAMP WITH TIME ZONE NULL,
    -- Google OAuth 2.0
    google_id VARCHAR(255) NULL,
    auth_provider VARCHAR(50) DEFAULT 'local',
    -- WhatsApp & Telegram Bot Integrations
    telegram_chat_id VARCHAR(100) NULL,
    telegram_username VARCHAR(100) NULL,
    whatsapp_phone VARCHAR(50) NULL,
    pairing_code VARCHAR(20) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast user lookup by email & Google ID
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_pairing_code ON users(pairing_code);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'Tag',
    color VARCHAR(20) NOT NULL DEFAULT '#0ea5e9',
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_category_name_type UNIQUE (user_id, name, type)
);

-- Index for category queries by user
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);

-- 4. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description VARCHAR(255) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_interval VARCHAR(20) NULL CHECK (recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
    currency VARCHAR(10) DEFAULT 'IDR',
    exchange_rate NUMERIC(12, 6) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optimized indices for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- 5. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold BETWEEN 50 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_category_month_year UNIQUE (user_id, category_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets(user_id, year, month);

-- 6. RECURRING RULES TABLE
CREATE TABLE IF NOT EXISTS recurring_rules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    recurring_interval VARCHAR(20) NOT NULL CHECK (recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
    next_run_date DATE NOT NULL,
    last_run_date DATE NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recurring_due ON recurring_rules(is_active, next_run_date);

-- 7. DEFAULT CATEGORIES SEED DATA
-- (Inserted automatically per user or as system templates)
INSERT INTO categories (user_id, name, icon, color, type, is_default) VALUES
(NULL, 'Gaji Pokok', 'Briefcase', '#10b981', 'income', TRUE),
(NULL, 'Freelance & Bisnis', 'Laptop', '#0ea5e9', 'income', TRUE),
(NULL, 'Investasi & Dividen', 'TrendingUp', '#8b5cf6', 'income', TRUE),
(NULL, 'Hadiah & Bonus', 'Gift', '#ec4899', 'income', TRUE),
(NULL, 'Makanan & Minuman', 'Utensils', '#f97316', 'expense', TRUE),
(NULL, 'Transportasi', 'Car', '#0284c7', 'expense', TRUE),
(NULL, 'Tempat Tinggal & Sewa', 'Home', '#6366f1', 'expense', TRUE),
(NULL, 'Tagihan & Utilitas', 'Zap', '#eab308', 'expense', TRUE),
(NULL, 'Kesehatan & Obat', 'HeartPulse', '#ef4444', 'expense', TRUE),
(NULL, 'Belanja & Hiburan', 'ShoppingBag', '#d946ef', 'expense', TRUE),
(NULL, 'Pendidikan & Buku', 'GraduationCap', '#14b8a6', 'expense', TRUE),
(NULL, 'Tabungan & Darurat', 'PiggyBank', '#10b981', 'expense', TRUE)
ON CONFLICT DO NOTHING;
