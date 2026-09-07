import { Router, Request, Response } from 'express';
import { SUPPORTED_CURRENCIES, convertCurrency } from '../services/currencyService';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'FinTrack API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

router.get('/currencies', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: Object.values(SUPPORTED_CURRENCIES),
    base: 'IDR',
  });
});

router.get('/currencies/convert', (req: Request, res: Response) => {
  const { amount = '1', from = 'IDR', to = 'USD' } = req.query;
  const numAmount = parseFloat(amount as string) || 0;
  const converted = convertCurrency(numAmount, from as string, to as string);

  res.json({
    success: true,
    amount: numAmount,
    from,
    to,
    converted,
    timestamp: new Date().toISOString(),
  });
});

export default router;
