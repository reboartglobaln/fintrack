import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Error caught in handler]:', err);

  // Sequelize specific error handling
  if (err.name === 'SequelizeUniqueConstraintError') {
    res.status(409).json({
      success: false,
      message: 'Data sudah ada di sistem (duplikasi email atau nama kategori unik).',
      errors: err.errors ? err.errors.map((e: any) => e.message) : undefined,
    });
    return;
  }

  if (err.name === 'SequelizeValidationError') {
    res.status(400).json({
      success: false,
      message: 'Validasi database Sequelize gagal.',
      errors: err.errors ? err.errors.map((e: any) => e.message) : undefined,
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Terjadi kesalahan internal pada server.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
