import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import authRoutes from './server/routes/authRoutes';
import transactionRoutes from './server/routes/transactionRoutes';
import categoryRoutes from './server/routes/categoryRoutes';
import budgetRoutes from './server/routes/budgetRoutes';
import recurringRoutes from './server/routes/recurringRoutes';
import reportRoutes from './server/routes/reportRoutes';
import systemRoutes from './server/routes/systemRoutes';
import botIntegrationRoutes from './server/routes/botIntegrationRoutes';
import { handleGoogleOAuthCallback } from './server/controllers/googleAuthController';
import { errorHandler } from './server/middleware/errorHandler';
import { rateLimiter } from './server/middleware/rateLimiter';
import { loadDb } from './server/services/dbStore';
import { testDbConnection } from './server/config/database';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const app = express();

// Initialize internal database store
loadDb();

// Test PostgreSQL connection if configured
testDbConnection();

// 1. Security & Core Middlewares
app.use((req, res, next) => {
  // Prevent MIME-sniffing and cross-site scripting
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Allow iframe embedding specifically for the AI Studio live preview container
  res.removeHeader('X-Frame-Options');
  next();
});

// Enable CORS
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing with sanitization limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiter for API endpoints
app.use('/api', rateLimiter({ windowMs: 15 * 60 * 1000, max: 1000 }));

// 2. RESTful API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/integrations', botIntegrationRoutes);

// Google OAuth 2.0 Popup Callback route
app.get(['/auth/callback', '/auth/callback/'], handleGoogleOAuthCallback);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'FinTrack API Server',
    time: new Date().toISOString(),
  });
});

// Centralized Error Handling Middleware for API routes
app.use('/api', errorHandler);

// 3. Vite Middleware (Development) / Static Files (Production)
async function startServer() {
  const isDev = process.env.NODE_ENV === 'development';
  const isProductionBundle = typeof __filename !== 'undefined' && __filename.endsWith('.cjs');

  if (isDev && !isProductionBundle) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite dev middleware not available, falling back to static files.');
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FinTrack server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
