import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import {
  getIntegrationStatus,
  regeneratePairingCode,
  updateTelegramConfig,
  updateWhatsAppConfig,
  simulateChatMessage,
  telegramWebhook,
  whatsappWebhook,
} from '../controllers/botIntegrationController';

const router = Router();

// 1. Authenticated User Endpoints
router.get('/status', authenticateJWT, getIntegrationStatus);
router.post('/pairing-code', authenticateJWT, regeneratePairingCode);
router.post('/telegram/config', authenticateJWT, updateTelegramConfig);
router.post('/whatsapp/config', authenticateJWT, updateWhatsAppConfig);
router.post('/simulate', authenticateJWT, simulateChatMessage);

// 2. Public Webhooks for Telegram Bot & WhatsApp Gateways
router.post('/telegram/webhook', telegramWebhook);
router.post('/whatsapp/webhook', whatsappWebhook);

// Meta Cloud API Webhook Verification (GET request with hub.challenge)
router.get('/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe') {
      res.status(200).send(challenge);
      return;
    }
    res.sendStatus(403);
    return;
  }
  res.json({ status: 'WhatsApp webhook active' });
});

export default router;
