import { Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, Category } from '../models/index';

const JWT_SECRET = process.env.JWT_SECRET || 'fintrack_super_secret_jwt_key_2026_change_in_production';

const DEFAULT_CATEGORIES = [
  { name: 'Gaji Pokok', icon: 'Briefcase', color: '#10b981', type: 'income' as const, is_default: true },
  { name: 'Freelance & Bisnis', icon: 'Laptop', color: '#0ea5e9', type: 'income' as const, is_default: true },
  { name: 'Investasi & Dividen', icon: 'TrendingUp', color: '#8b5cf6', type: 'income' as const, is_default: true },
  { name: 'Hadiah & Bonus', icon: 'Gift', color: '#ec4899', type: 'income' as const, is_default: true },
  { name: 'Makanan & Minuman', icon: 'Utensils', color: '#f97316', type: 'expense' as const, is_default: true },
  { name: 'Transportasi', icon: 'Car', color: '#0284c7', type: 'expense' as const, is_default: true },
  { name: 'Tempat Tinggal', icon: 'Home', color: '#6366f1', type: 'expense' as const, is_default: true },
  { name: 'Tagihan & Utilitas', icon: 'Zap', color: '#eab308', type: 'expense' as const, is_default: true },
  { name: 'Kesehatan & Medis', icon: 'HeartPulse', color: '#ef4444', type: 'expense' as const, is_default: true },
  { name: 'Belanja & Hiburan', icon: 'ShoppingBag', color: '#d946ef', type: 'expense' as const, is_default: true },
  { name: 'Pendidikan', icon: 'GraduationCap', color: '#14b8a6', type: 'expense' as const, is_default: true },
  { name: 'Tabungan & Dana Darurat', icon: 'PiggyBank', color: '#10b981', type: 'expense' as const, is_default: true },
];

async function seedDefaultCategoriesForUser(userId: number): Promise<void> {
  try {
    const items = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId }));
    await Category.bulkCreate(items);
  } catch (err) {
    console.warn('Failed to seed default categories:', (err as Error).message);
  }
}

export const getGoogleRedirectUri = (req: Request): string => {
  const originQuery = req.query.origin as string;
  if (originQuery && (originQuery.startsWith('http://') || originQuery.startsWith('https://'))) {
    return `${originQuery.replace(/\/$/, '')}/auth/callback`;
  }

  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL' && (process.env.APP_URL.startsWith('http://') || process.env.APP_URL.startsWith('https://'))) {
    return `${process.env.APP_URL.replace(/\/$/, '')}/auth/callback`;
  }

  const originHeader = req.get('origin');
  if (originHeader && (originHeader.startsWith('http://') || originHeader.startsWith('https://'))) {
    return `${originHeader.replace(/\/$/, '')}/auth/callback`;
  }

  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}/auth/callback`;
};

export const getGoogleAuthUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = getGoogleRedirectUri(req);

    if (!clientId) {
      res.json({
        success: true,
        configured: false,
        message: 'GOOGLE_CLIENT_ID belum dikonfigurasi di Environment Variables.',
        redirectUri,
        callbackDevUrl: 'https://ais-dev-psthdo7fwdvzivkaczrcnn-194164145577.asia-southeast1.run.app/auth/callback',
        callbackSharedUrl: 'https://ais-pre-psthdo7fwdvzivkaczrcnn-194164145577.asia-southeast1.run.app/auth/callback',
      });
      return;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    res.json({
      success: true,
      configured: true,
      url,
      redirectUri,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghasilkan URL autentikasi Google.',
      error: error.message,
    });
  }
};

export const findOrCreateGoogleUser = async (googleProfile: {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}) => {
  const normalizedEmail = googleProfile.email.toLowerCase().trim();

  let user = await User.findOne({ where: { email: normalizedEmail } });
  let isNew = false;

  if (!user) {
    isNew = true;
    const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
    const displayName = googleProfile.name || normalizedEmail.split('@')[0];

    user = await User.create({
      name: displayName,
      email: normalizedEmail,
      password: randomPassword,
      avatar:
        googleProfile.picture ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
      base_currency: 'IDR',
      // Note: If you want to store google_id and auth_provider, you will need to add those columns to the User model.
      // Assuming they are not in the current User model based on User.ts, we will just create the user.
    });

    await seedDefaultCategoriesForUser(user.id);
  } else {
    // If the columns existed, we would update them here. 
    // For now we just update the avatar if necessary.
    const updates: any = {};
    if (googleProfile.picture && (!user.avatar || user.avatar.includes('dicebear'))) {
      updates.avatar = googleProfile.picture;
    }
    
    if (Object.keys(updates).length > 0) {
      await user.update(updates);
    }
  }

  return { user, isNew };
};

export const handleGoogleOAuthCallback = async (req: Request, res: Response): Promise<void> => {
  const { code, error, error_description } = req.query;

  if (error) {
    const errorMsg = String(error_description || error || 'Autentikasi Google dibatalkan.');
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Sign-In Error</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
            .card { background: #1e293b; padding: 24px; border-radius: 16px; text-align: center; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
          </style>
        </head>
        <body>
          <div class="card">
            <h3 style="color: #ef4444; margin-top: 0;">Gagal Masuk dengan Google</h3>
            <p style="font-size: 14px; opacity: 0.8;">${errorMsg}</p>
            <p style="font-size: 12px; opacity: 0.6;">Jendela ini akan tertutup otomatis...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', message: ${JSON.stringify(errorMsg)} }, '*');
              setTimeout(function() { window.close(); }, 1500);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
    return;
  }

  if (!code) {
    res.status(400).send('Authorization code tidak ditemukan.');
    return;
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = getGoogleRedirectUri(req);

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET belum dikonfigurasi di server.');
    }

    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token } = tokenResponse.data;

    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const googleUser = profileResponse.data;
    if (!googleUser?.email) {
      throw new Error('Tidak dapat memperoleh alamat email dari akun Google.');
    }

    const { user, isNew } = await findOrCreateGoogleUser({
      sub: googleUser.sub || `google-${Date.now()}`,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      base_currency: user.base_currency || 'IDR',
    };

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Sign-In Berhasil</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
            .card { background: #1e293b; padding: 24px; border-radius: 16px; text-align: center; max-width: 360px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
            .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #38bdf8; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h3 style="margin-top: 0; color: #38bdf8;">${isNew ? 'Registrasi Google Berhasil!' : 'Login Google Berhasil!'}</h3>
            <p style="font-size: 14px; opacity: 0.8;">Menyinkronkan sesi Anda ke FinTrack...</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GOOGLE_AUTH_SUCCESS',
                  token: ${JSON.stringify(token)},
                  user: ${JSON.stringify(userPayload)},
                  isNew: ${isNew}
                }, '*');
                setTimeout(function() { window.close(); }, 800);
              } else {
                window.location.href = '/';
              }
            } catch (e) {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    const errorMsg = err.response?.data?.error_description || err.message || 'Terjadi kesalahan saat memproses token Google.';
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Autentikasi Gagal</title></head>
        <body style="font-family: sans-serif; padding: 24px; background: #0f172a; color: white; text-align: center;">
          <h3 style="color: #ef4444;">Gagal Menyelesaikan Autentikasi Google</h3>
          <p>${errorMsg}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', message: ${JSON.stringify(errorMsg)} }, '*');
              setTimeout(function() { window.close(); }, 2500);
            }
          </script>
        </body>
      </html>
    `);
  }
};

export const handleGoogleCredential = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({ success: false, message: 'Google credential token wajib disertakan.' });
      return;
    }

    const parts = credential.split('.');
    if (parts.length < 2) {
      res.status(400).json({ success: false, message: 'Format token Google tidak valid.' });
      return;
    }

    const payloadRaw = Buffer.from(parts[1], 'base64').toString('utf-8');
    const payload = JSON.parse(payloadRaw);

    if (!payload.email) {
      res.status(400).json({ success: false, message: 'Email tidak ditemukan di dalam token Google.' });
      return;
    }

    const { user, isNew } = await findOrCreateGoogleUser({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: isNew ? 'Registrasi dengan Google berhasil!' : 'Login dengan Google berhasil!',
      token,
      isNew,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        base_currency: user.base_currency || 'IDR',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal memverifikasi akun Google.',
      error: error.message,
    });
  }
};

export const handleGoogleMockLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email = 'recobocil.art@gmail.com', name = 'Recobocil Art', picture } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const avatarUrl =
      picture ||
      `https://lh3.googleusercontent.com/a/default-user=s96-c`;

    const { user, isNew } = await findOrCreateGoogleUser({
      sub: `google-sim-${Math.abs(normalizedEmail.split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0))}`,
      email: normalizedEmail,
      name: name || 'Google User',
      picture: avatarUrl,
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: isNew ? 'Akun berhasil didaftarkan via Google!' : 'Berhasil masuk dengan akun Google!',
      token,
      isNew,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        base_currency: user.base_currency || 'IDR',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal melakukan login Google.',
      error: error.message,
    });
  }
};
