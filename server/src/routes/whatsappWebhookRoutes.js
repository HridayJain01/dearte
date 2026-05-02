import express from 'express';

const router = express.Router();

/**
 * Meta webhook verification (GET). Subscribe in WhatsApp Developer Console with this verify token & URL.
 * POST echoes 200 until you parse inbound messaging.
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';

  if (mode === 'subscribe' && expectedToken && token === expectedToken) {
    return res.status(200).send(challenge);
  }

  if (mode === 'subscribe' && token && challenge) {
    return res.sendStatus(403);
  }

  return res.sendStatus(400);
});

router.post('/webhook', express.json({ limit: '1mb' }), (_req, res) => res.sendStatus(200));

router.get('/webhook-health', (_req, res) => {
  res.json({ ok: true, note: 'Use GET /whatsapp/webhook for Meta verification handshake.' });
});

export default router;
