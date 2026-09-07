import { Request, Response } from 'express';
import axios from 'axios';
import { AuthRequest } from '../middleware/auth';
import { loadDb, saveDb, DbUser } from '../services/dbStore';
import { handleIncomingChatMessage } from '../services/chatParserService';

export const getIntegrationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const db = loadDb();
    const user = db.users.find((u) => u.id === userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    // Ensure pairing codes exist
    if (!user.telegram_pairing_code) {
      user.telegram_pairing_code = `FT-${Math.floor(1000 + Math.random() * 9000)}`;
      saveDb(db);
    }
    if (!user.whatsapp_pairing_code) {
      user.whatsapp_pairing_code = `WA-${Math.floor(1000 + Math.random() * 9000)}`;
      saveDb(db);
    }

    res.json({
      success: true,
      data: {
        telegram_chat_id: user.telegram_chat_id || null,
        telegram_username: user.telegram_username || null,
        telegram_bot_token: user.telegram_bot_token ? '***' + user.telegram_bot_token.slice(-6) : null,
        telegram_pairing_code: user.telegram_pairing_code,
        whatsapp_phone: user.whatsapp_phone || null,
        whatsapp_pairing_code: user.whatsapp_pairing_code,
        webhook_url_telegram: `${baseUrl}/api/integrations/telegram/webhook`,
        webhook_url_whatsapp: `${baseUrl}/api/integrations/whatsapp/webhook`,
        is_telegram_connected: Boolean(user.telegram_chat_id),
        is_whatsapp_connected: Boolean(user.whatsapp_phone),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil status integrasi.' });
  }
};

export const regeneratePairingCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { platform } = req.body; // 'telegram' | 'whatsapp' | 'all'
    const db = loadDb();
    const user = db.users.find((u) => u.id === userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    if (platform === 'telegram' || platform === 'all') {
      user.telegram_pairing_code = `FT-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    if (platform === 'whatsapp' || platform === 'all') {
      user.whatsapp_pairing_code = `WA-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    saveDb(db);

    res.json({
      success: true,
      message: 'Kode pairing baru berhasil dibuat.',
      data: {
        telegram_pairing_code: user.telegram_pairing_code,
        whatsapp_pairing_code: user.whatsapp_pairing_code,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal membuat kode pairing baru.' });
  }
};

export const updateTelegramConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { chat_id, username, bot_token, auto_set_webhook } = req.body;
    const db = loadDb();
    const user = db.users.find((u) => u.id === userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    if (chat_id !== undefined) {
      user.telegram_chat_id = chat_id ? String(chat_id).trim() : null;
    }
    if (username !== undefined) {
      user.telegram_username = username ? String(username).replace(/^@/, '').trim() : null;
    }
    if (bot_token !== undefined) {
      user.telegram_bot_token = bot_token ? String(bot_token).trim() : null;
    }

    user.updated_at = new Date().toISOString();
    saveDb(db);

    let webhookSetMessage = '';
    // Optional: auto configure webhook if bot_token provided
    if (auto_set_webhook && user.telegram_bot_token) {
      try {
        const host = req.get('host') || 'localhost:3000';
        const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
        const webhookUrl = `${protocol}://${host}/api/integrations/telegram/webhook`;
        
        await axios.post(`https://api.telegram.org/bot${user.telegram_bot_token}/setWebhook`, {
          url: webhookUrl,
        });
        webhookSetMessage = ` Webhook Telegram berhasil didaftarkan ke ${webhookUrl}.`;
      } catch (err: any) {
        webhookSetMessage = ` (Catatan: Pendaftaran webhook otomatis gagal: ${err.message || 'Periksa token bot Anda'})`;
      }
    }

    res.json({
      success: true,
      message: `Konfigurasi Telegram berhasil diperbarui.${webhookSetMessage}`,
      data: {
        telegram_chat_id: user.telegram_chat_id,
        telegram_username: user.telegram_username,
        is_telegram_connected: Boolean(user.telegram_chat_id),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui konfigurasi Telegram.' });
  }
};

export const updateWhatsAppConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { phone } = req.body;
    const db = loadDb();
    const user = db.users.find((u) => u.id === userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    // Clean phone number (format e.g. +6281234567890)
    let cleanPhone: string | null = null;
    if (phone) {
      let p = String(phone).trim().replace(/[\s-]/g, '');
      if (p.startsWith('08')) {
        p = '+62' + p.slice(1);
      } else if (p.startsWith('62')) {
        p = '+' + p;
      } else if (!p.startsWith('+')) {
        p = '+' + p;
      }
      cleanPhone = p;
    }

    user.whatsapp_phone = cleanPhone;
    user.updated_at = new Date().toISOString();
    saveDb(db);

    res.json({
      success: true,
      message: 'Nomor WhatsApp berhasil diperbarui.',
      data: {
        whatsapp_phone: user.whatsapp_phone,
        is_whatsapp_connected: Boolean(user.whatsapp_phone),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui nomor WhatsApp.' });
  }
};

export const simulateChatMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { platform = 'telegram', message } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({ success: false, message: 'Pesan chat wajib diisi.' });
      return;
    }

    const db = loadDb();
    const user = db.users.find((u) => u.id === userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    const result = await handleIncomingChatMessage({
      platform: platform === 'whatsapp' ? 'whatsapp' : 'telegram',
      text: message.trim(),
      user,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ success: false, message: 'Gagal memproses simulasi chat.' });
  }
};

/**
 * Public Webhook for Telegram Bot API
 */
export const telegramWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const update = req.body;
    // Telegram Update Structure
    const message = update?.message || update?.edited_message;
    if (!message || !message.text) {
      res.status(200).json({ ok: true });
      return;
    }

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const username = message.from?.username || '';
    const db = loadDb();

    // 1. Handle pairing command e.g. "/start link_FT-1234" or "/link FT-1234" or "/hubungkan FT-1234"
    const linkMatch = text.match(/^\/(?:start\s+link_|link\s+|hubungkan\s+)([a-zA-Z0-9_-]+)/i);
    if (linkMatch) {
      const code = linkMatch[1].toUpperCase();
      const matchedUser = db.users.find(
        (u) => u.telegram_pairing_code && u.telegram_pairing_code.toUpperCase() === code
      );

      if (matchedUser) {
        matchedUser.telegram_chat_id = chatId;
        if (username) matchedUser.telegram_username = username;
        matchedUser.updated_at = new Date().toISOString();
        saveDb(db);

        const reply =
          `🎉 *Akun Telegram Berhasil Terhubung!*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `Halo *${matchedUser.name}*, akun Telegram Anda kini resmi tertaut dengan FinTrack.\n\n` +
          `Sekarang Anda dapat langsung mencatat keuangan dengan mengetik pesan biasa seperti:\n` +
          `• _Makan siang 25k_\n` +
          `• _Bensin Pertamax 50rb_\n` +
          `• _+5000000 Gaji bulanan_\n\n` +
          `Ketik */bantuan* kapan saja untuk panduan lengkap!`;

        // Attempt to reply via Telegram Bot API if bot token is present
        if (matchedUser.telegram_bot_token) {
          try {
            await axios.post(`https://api.telegram.org/bot${matchedUser.telegram_bot_token}/sendMessage`, {
              chat_id: chatId,
              text: reply,
              parse_mode: 'Markdown',
            });
          } catch (e) {
            console.error('Failed to send Telegram reply:', e);
          }
        }

        res.status(200).json({ ok: true, reply });
        return;
      } else {
        const reply = `❌ Kode pairing *${code}* tidak valid atau telah kedaluwarsa. Silakan periksa kembali di menu "WA & Telegram Bot" aplikasi FinTrack.`;
        res.status(200).json({ ok: true, reply });
        return;
      }
    }

    // 2. Find user by Telegram Chat ID
    const user = db.users.find((u) => u.telegram_chat_id === chatId);

    if (!user) {
      const reply =
        `👋 *Halo dari FinTrack Bot!*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Telegram ID Anda (${chatId}) belum terhubung dengan akun FinTrack.\n\n` +
        `*Cara Menghubungkan:*\n` +
        `1. Buka aplikasi FinTrack\n` +
        `2. Masuk ke menu *WA & Telegram Bot*\n` +
        `3. Salin Kode Pairing Anda (misal: *FT-7291*)\n` +
        `4. Kirimkan pesan ke sini:\n` +
        `   /link KODE_ANDA\n` +
        `   _(Contoh: /link FT-7291)_`;

      res.status(200).json({ ok: true, reply });
      return;
    }

    // 3. Process financial message
    const result = await handleIncomingChatMessage({
      platform: 'telegram',
      text,
      user,
    });

    // Send back reply if user configured bot token
    if (user.telegram_bot_token) {
      try {
        await axios.post(`https://api.telegram.org/bot${user.telegram_bot_token}/sendMessage`, {
          chat_id: chatId,
          text: result.reply,
          parse_mode: 'Markdown',
        });
      } catch (e) {
        console.error('Failed to send Telegram reply:', e);
      }
    }

    res.status(200).json({ ok: true, reply: result.reply });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.status(200).json({ ok: false, message: 'Internal error' });
  }
};

/**
 * Public Webhook for WhatsApp (Twilio, Meta Cloud API, Fonnte, or Generic Gateway)
 */
export const whatsappWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body;
    let senderPhone = '';
    let messageText = '';

    // A. Twilio format
    if (body.From && body.Body) {
      senderPhone = body.From.replace('whatsapp:', '');
      messageText = body.Body;
    }
    // B. Meta Cloud API format
    else if (body.entry && body.entry[0]?.changes[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      senderPhone = '+' + msg.from;
      messageText = msg.text?.body || '';
    }
    // C. Generic / Fonnte / Baileys webhook format: { sender: '62812...', message: '...' }
    else if (body.sender && body.message) {
      let s = String(body.sender).replace(/[\s-]/g, '');
      if (!s.startsWith('+')) s = '+' + s;
      senderPhone = s;
      messageText = String(body.message);
    }
    // D. Direct test payload: { phone, message }
    else if (body.phone && body.message) {
      senderPhone = String(body.phone);
      messageText = String(body.message);
    }

    if (!senderPhone || !messageText) {
      res.status(200).json({ ok: true, message: 'No valid message received' });
      return;
    }

    const cleanSender = senderPhone.trim();
    const cleanText = messageText.trim();
    const db = loadDb();

    // 1. Check for pairing code: "/link WA-1234" or "/hubungkan WA-1234"
    const linkMatch = cleanText.match(/^\/(?:link\s+|hubungkan\s+)([a-zA-Z0-9_-]+)/i);
    if (linkMatch) {
      const code = linkMatch[1].toUpperCase();
      const matchedUser = db.users.find(
        (u) => u.whatsapp_pairing_code && u.whatsapp_pairing_code.toUpperCase() === code
      );

      if (matchedUser) {
        matchedUser.whatsapp_phone = cleanSender;
        matchedUser.updated_at = new Date().toISOString();
        saveDb(db);

        const reply =
          `🎉 *Nomor WhatsApp Berhasil Terhubung!*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `Halo *${matchedUser.name}*, nomor WhatsApp Anda (${cleanSender}) kini terhubung dengan FinTrack.\n\n` +
          `Mulai sekarang, Anda bisa langsung mencatat pengeluaran atau pemasukan langsung dari WhatsApp:\n` +
          `• _Makan siang 25k_\n` +
          `• _Beli token PLN 100rb_\n` +
          `• _+2500000 Gaji freelance_\n\n` +
          `Ketik */saldo* untuk cek saldo, atau */bantuan* untuk bantuan lengkap.`;

        // If Twilio format, reply with TwiML
        if (body.From) {
          res.set('Content-Type', 'text/xml');
          res.send(`<Response><Message>${reply.replace(/[*_]/g, '')}</Message></Response>`);
          return;
        }

        res.status(200).json({ ok: true, reply });
        return;
      } else {
        const reply = `❌ Kode pairing WhatsApp *${code}* tidak ditemukan. Silakan cek di menu "WA & Telegram Bot" aplikasi FinTrack.`;
        res.status(200).json({ ok: true, reply });
        return;
      }
    }

    // 2. Find user matching whatsapp_phone
    // Normalize phone matching: +6281234567890 vs 6281234567890 vs 081234567890
    const normalizedSender = cleanSender.replace(/^\+/, '').replace(/^0/, '62');
    const user = db.users.find((u) => {
      if (!u.whatsapp_phone) return false;
      const normalizedUserPhone = u.whatsapp_phone.replace(/[\s+-]/g, '').replace(/^0/, '62');
      return normalizedUserPhone === normalizedSender;
    });

    if (!user) {
      const reply =
        `👋 *Halo dari FinTrack WhatsApp Bot!*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Nomor WhatsApp Anda (${cleanSender}) belum ditautkan ke akun FinTrack.\n\n` +
        `*Cara Menghubungkan:*\n` +
        `1. Masuk ke aplikasi FinTrack > Menu *WA & Telegram Bot*\n` +
        `2. Temukan Kode Pairing WhatsApp Anda (misal: *WA-7291*)\n` +
        `3. Balas ke pesan ini dengan format:\n` +
        `   /link KODE_ANDA\n` +
        `   _(Contoh: /link WA-7291)_`;

      if (body.From) {
        res.set('Content-Type', 'text/xml');
        res.send(`<Response><Message>${reply.replace(/[*_]/g, '')}</Message></Response>`);
        return;
      }

      res.status(200).json({ ok: true, reply });
      return;
    }

    // 3. Process the chat message
    const result = await handleIncomingChatMessage({
      platform: 'whatsapp',
      text: cleanText,
      user,
    });

    if (body.From) {
      res.set('Content-Type', 'text/xml');
      res.send(`<Response><Message>${result.reply.replace(/[*_]/g, '')}</Message></Response>`);
      return;
    }

    res.status(200).json({ ok: true, reply: result.reply });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(200).json({ ok: false, message: 'Internal error' });
  }
};
