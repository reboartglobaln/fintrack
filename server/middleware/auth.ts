import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/index';

const JWT_SECRET = process.env.JWT_SECRET || 'fintrack_super_secret_jwt_key_2026_change_in_production';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    base_currency: string;
  };
}

export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Akses ditolak: Token otentikasi tidak ditemukan.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      name: string;
    };

    const user = await User.findByPk(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Pengguna tidak ditemukan atau sesi telah berakhir.',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      base_currency: user.base_currency || 'IDR',
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token otentikasi tidak valid atau telah kedaluwarsa.',
      error: (error as Error).message,
    });
  }
};
