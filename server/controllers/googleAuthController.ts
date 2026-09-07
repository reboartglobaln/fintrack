import { Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { loadDb, saveDb, seedDefaultCategoriesForUser, DbUser } from '../services/dbStore';

const JWT_SECRET = process.env.JWT_SECRET || 'fintrack_super_secret_jwt_key_2026_change_in_production';

// Helper to determine the redirect URI safely
export const getGoogleRedirectUri = (req: Request): string => {
  // If query specifies origin, use that
  const originQuery = req.query.origin as string;
  if (originQuery && (originQuery.startsWith('http://') || originQuery.startsWith('https://'))) {
    return `${originQuery.replace(/\/$/, '')}/auth/callback`;
  }

  // Fallback to APP_URL environment variable (ignore placeholder)
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL' && (process.env.APP_URL.startsWith('http://') || process.env.APP_URL.startsWith('https://'))) {
    return `${process.env.APP_URL.replace(/\/$/, '')}/auth/callback`;
  }

  // Fallback to request origin header or host
  const originHeader = req.get('origin');
  if (originHeader && (originHeader.startsWith('http://') || originHeader.startsWith('https://'))) {
    return `${originHeader.replace(/\/$/, '')}/auth/callback`;
  }

  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}/auth/callback`;
};

/**
 * 1. GET /api/auth/google/url
 * Returns Google OAuth URL if configured, or configuration status & guidance.
 */
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

/**
 * Helper to find or create a user in local dbStore from Google profile
 */
export const findOrCreateGoogleUser = async (googleProfile: {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}): Promise<{ user: DbUser; isNew: boolean }> => {
  const db = loadDb();
  const normalizedEmail = googleProfile.email.toLowerCase().trim();

  let user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  let isNew = false;

  if (!user) {
    isNew = true;
    const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
    const now = new Date().toISOString();
    const displayName = googleProfile.name || normalizedEmail.split('@')[0];

    user = {
      id: db.nextIds.users++,
      name: displayName,
      email: normalizedEmail,
      password: randomPassword,
      avatar:
        googleProfile.picture ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
      base_currency: 'IDR',
      google_id: googleProfile.sub,
      auth_provider: 'google',
      reset_token: null,
      reset_token_expiry: null,
      created_at: now,
      updated_at: now,
    };

    db.users.push(user);
    saveDb(db);

    // Seed default starter categories for new user
    seedDefaultCategoriesForUser(user.id);
  } else {
    // Existing user: associate Google ID and update picture if provided
    let updated = false;
    if (!user.google_id) {
      user.google_id = googleProfile.sub;
      updated = true;
    }
    if (googleProfile.picture && (!user.avatar || user.avatar.includes('dicebear'))) {
      user.avatar = googleProfile.picture;
      updated = true;
    }
    if (user.auth_provider !== 'google') {
      user.auth_provider = 'google';
      updated = true;
    }
    if (updated) {
      user.updated_at = new Date().toISOString();
      saveDb(db);
    }
  }

  return { user, isNew };
};

/**
 * 2. GET /auth/callback (and /auth/callback/)
 * Google redirects here in popup window.
 * Exchanges authorization code for tokens, retrieves profile, logs user in,
 * and passes postMessage to opener window before closing.
 */
export const handleGoogleOAuthCallback = async (req: Request, res: Response): Promise<void> => {
  const { code, error, error_description } = req.query;

  // Handle errors from Google
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

    // Exchange code for tokens
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

    // Fetch user profile from Google UserInfo endpoint
    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const googleUser = profileResponse.data;
    if (!googleUser?.email) {
      throw new Error('Tidak dapat memperoleh alamat email dari akun Google.');
    }

    // Find or create local user
    const { user, isNew } = await findOrCreateGoogleUser({
      sub: googleUser.sub || `google-${Date.now()}`,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    });

    // Generate JWT token
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

    // Return HTML that posts message to opener and closes
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

/**
 * 3. POST /api/auth/google/credential
 * Handles Google ID Token (from Google Identity Services / GSI SDK)
 */
export const handleGoogleCredential = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({ success: false, message: 'Google credential token wajib disertakan.' });
      return;
    }

    // Decode JWT payload safely (Google ID tokens are standard JWTs with payload as part 2)
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

/**
 * 4. POST /api/auth/google/mock-login
 * Seamless One-Click Google Register & Login for sandbox/preview testing.
 * Uses real Google profile format so users can test immediately.
 */
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
