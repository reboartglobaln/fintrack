import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipMap = new Map<string, RateLimitRecord>();

export const rateLimiter = (options = { windowMs: 15 * 60 * 1000, max: 200 }) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = ipMap.get(ip);

    if (!record || now > record.resetTime) {
      ipMap.set(ip, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      next();
      return;
    }

    if (record.count >= options.max) {
      res.status(429).json({
        success: false,
        message: 'Terlalu banyak permintaan dari IP ini. Silakan coba lagi nanti.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }

    record.count++;
    next();
  };
};

export const authRateLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30, // 30 attempts per 5 minutes
});
