import { Request, Response, NextFunction } from 'express';

// Sanitizes and strips potentially dangerous HTML/script tags
export function sanitizeString(val: any): string {
  if (typeof val !== 'string') return '';
  return val.replace(/[<>]/g, '').trim();
}

export function validateRegister(req: Request, res: Response, next: NextFunction): void {
  const { name, email, password } = req.body;
  const errors: Record<string, string> = {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.name = 'Nama lengkap wajib diisi minimal 2 karakter.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(String(email).toLowerCase())) {
    errors.email = 'Format alamat email tidak valid.';
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.password = 'Kata sandi wajib diisi minimal 6 karakter.';
  }

  if (Object.keys(errors).length > 0) {
    res.status(400).json({
      success: false,
      message: 'Validasi form gagal.',
      errors,
    });
    return;
  }

  req.body.name = sanitizeString(name);
  req.body.email = String(email).trim().toLowerCase();
  next();
}

export function validateLogin(req: Request, res: Response, next: NextFunction): void {
  const { email, password } = req.body;
  const errors: Record<string, string> = {};

  if (!email) {
    errors.email = 'Alamat email wajib diisi.';
  }

  if (!password) {
    errors.password = 'Kata sandi wajib diisi.';
  }

  if (Object.keys(errors).length > 0) {
    res.status(400).json({
      success: false,
      message: 'Email dan kata sandi wajib diisi.',
      errors,
    });
    return;
  }

  req.body.email = String(email).trim().toLowerCase();
  next();
}

export function validateTransaction(req: Request, res: Response, next: NextFunction): void {
  const { amount, description, category_id, date, type } = req.body;
  const errors: Record<string, string> = {};

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    errors.amount = 'Jumlah nominal harus berupa angka lebih besar dari 0.';
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    errors.description = 'Deskripsi transaksi wajib diisi.';
  }

  if (!category_id || isNaN(Number(category_id))) {
    errors.category_id = 'Kategori transaksi wajib dipilih.';
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.date = 'Format tanggal harus YYYY-MM-DD.';
  }

  if (!type || !['income', 'expense'].includes(type)) {
    errors.type = 'Tipe transaksi harus berupa "income" atau "expense".';
  }

  if (Object.keys(errors).length > 0) {
    res.status(400).json({
      success: false,
      message: 'Validasi transaksi gagal.',
      errors,
    });
    return;
  }

  req.body.amount = numAmount;
  req.body.category_id = Number(category_id);
  req.body.description = sanitizeString(description);
  next();
}

export function validateCategory(req: Request, res: Response, next: NextFunction): void {
  const { name, type } = req.body;
  const errors: Record<string, string> = {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Nama kategori wajib diisi.';
  }

  if (!type || !['income', 'expense'].includes(type)) {
    errors.type = 'Tipe kategori harus berupa "income" atau "expense".';
  }

  if (Object.keys(errors).length > 0) {
    res.status(400).json({
      success: false,
      message: 'Validasi kategori gagal.',
      errors,
    });
    return;
  }

  req.body.name = sanitizeString(name);
  next();
}

export function validateBudget(req: Request, res: Response, next: NextFunction): void {
  const { category_id, amount, month, year } = req.body;
  const errors: Record<string, string> = {};

  if (!category_id || isNaN(Number(category_id))) {
    errors.category_id = 'Kategori wajib dipilih.';
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    errors.amount = 'Nominal budget harus lebih besar dari 0.';
  }

  const numMonth = Number(month);
  if (isNaN(numMonth) || numMonth < 1 || numMonth > 12) {
    errors.month = 'Bulan harus di antara 1 dan 12.';
  }

  const numYear = Number(year);
  if (isNaN(numYear) || numYear < 2000) {
    errors.year = 'Tahun tidak valid.';
  }

  if (Object.keys(errors).length > 0) {
    res.status(400).json({
      success: false,
      message: 'Validasi budget gagal.',
      errors,
    });
    return;
  }

  req.body.category_id = Number(category_id);
  req.body.amount = numAmount;
  req.body.month = numMonth;
  req.body.year = numYear;
  next();
}
