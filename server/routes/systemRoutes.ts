import { Router, Request, Response } from 'express';
import { SUPPORTED_CURRENCIES, convertCurrency } from '../services/currencyService';
import { testSupabaseConnection, isSupabaseConfigured } from '../services/supabase';
import { testDbConnection } from '../config/database';

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

router.get('/database-status', async (req: Request, res: Response) => {
  const supabaseConfigured = isSupabaseConfigured();
  const supabaseCheck = await testSupabaseConnection();
  const postgresConnected = await testDbConnection();

  res.json({
    success: true,
    mode: supabaseConfigured ? 'supabase' : postgresConnected ? 'postgresql' : 'json_store',
    supabase: {
      configured: supabaseConfigured,
      connected: supabaseCheck.connected,
      message: supabaseCheck.message,
    },
    postgresql: {
      connected: postgresConnected,
    },
    demo_mode: false,
    timestamp: new Date().toISOString(),
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
