import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loadDb, saveDb, seedDefaultCategoriesForUser } from '../services/dbStore';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'fintrack_super_secret_jwt_key_2026_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    const db = loadDb();

    // Check if user already exists
    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'Alamat email sudah terdaftar. Silakan gunakan email lain atau login.',
      });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const now = new Date().toISOString();

    const newUser = {
      id: db.nextIds.users++,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      base_currency: 'IDR',
      reset_token: null,
      reset_token_expiry: null,
      created_at: now,
      updated_at: now,
    };

    db.users.push(newUser);
    saveDb(db);

    // Automatically seed default categories for the new user
    seedDefaultCategoriesForUser(newUser.id);

    // Sign JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Selamat datang di FinTrack.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        base_currency: newUser.base_currency,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal melakukan registrasi pengguna.',
      error: (error as Error).message,
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const db = loadDb();

    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Email atau kata sandi tidak sesuai.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Email atau kata sandi tidak sesuai.',
      });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        base_currency: user.base_currency || 'IDR',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal memproses login.',
      error: (error as Error).message,
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = loadDb();
    const user = db.users.find((u) => u.id === req.user?.id);

    if (!user) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        base_currency: user.base_currency || 'IDR',
        created_at: user.created_at,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data profil.', error: (error as Error).message });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email wajib diisi.' });
      return;
    }

    const db = loadDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // For security, don't leak user existence
      res.json({
        success: true,
        message: 'Jika email terdaftar, instruksi reset kata sandi telah dikirimkan ke email Anda.',
      });
      return;
    }

    // Generate random 6-character token for simple usability
    const resetToken = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    user.reset_token = resetToken;
    user.reset_token_expiry = expiry;
    saveDb(db);

    res.json({
      success: true,
      message: `Kode verifikasi reset password telah dikirim ke ${email}. (Kode Demo: ${resetToken})`,
      demoResetToken: resetToken,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memproses permintaan lupa password.', error: (error as Error).message });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, reset_token, new_password } = req.body;

    if (!email || !reset_token || !new_password) {
      res.status(400).json({ success: false, message: 'Email, token reset, dan kata sandi baru wajib diisi.' });
      return;
    }

    if (new_password.length < 6) {
      res.status(400).json({ success: false, message: 'Kata sandi baru minimal 6 karakter.' });
      return;
    }

    const db = loadDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.reset_token !== reset_token) {
      res.status(400).json({ success: false, message: 'Token reset tidak valid atau telah kedaluwarsa.' });
      return;
    }

    if (user.reset_token_expiry && new Date() > new Date(user.reset_token_expiry)) {
      res.status(400).json({ success: false, message: 'Token reset telah kedaluwarsa.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(new_password, salt);
    user.reset_token = null;
    user.reset_token_expiry = null;
    user.updated_at = new Date().toISOString();

    saveDb(db);

    res.json({
      success: true,
      message: 'Kata sandi berhasil diperbarui. Silakan login kembali dengan sandi baru.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengatur ulang kata sandi.', error: (error as Error).message });
  }
};

export const updateCurrency = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currency } = req.body;
    if (!currency) {
      res.status(400).json({ success: false, message: 'Kode mata uang wajib diisi.' });
      return;
    }

    const db = loadDb();
    const user = db.users.find((u) => u.id === req.user?.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    user.base_currency = currency.toUpperCase();
    user.updated_at = new Date().toISOString();
    saveDb(db);

    res.json({
      success: true,
      message: `Mata uang dasar diperbarui menjadi ${user.base_currency}.`,
      base_currency: user.base_currency,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui preferensi mata uang.' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    message: 'Logout berhasil. Sesi telah diakhiri di sisi klien.',
  });
};
