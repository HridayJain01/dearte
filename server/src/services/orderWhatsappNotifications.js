import { SiteSettings } from '../models/index.js';
import {
  sendDocumentBuffer,
  sendTextToE164Digits,
  isWhatsappConfigured,
  sendWithMediaLink,
} from './whatsapp/metaCloudApi.js';
import { normalizeWhatsappDigits, parsePhoneNumberList } from './whatsapp/phone.js';
import { generateOrderPdfBuffer } from '../utils/orderPdfKit.js';

function opsNumbersFromSources(siteDoc) {
  const envList = parsePhoneNumberList(process.env.WHATSAPP_ADMIN_NUMBERS || '');
  const dbRaw = siteDoc?.whatsappOperationsNumbers || '';
  const dbList = parsePhoneNumberList(dbRaw);
  const uniq = new Set([
    ...envList.map((n) => normalizeWhatsappDigits(n)).filter(Boolean),
    ...dbList.map((n) => normalizeWhatsappDigits(n)).filter(Boolean),
  ]);
  return [...uniq];
}

async function fetchSiteOpsNumbers() {
  const siteSettings = await SiteSettings.findOne().sort({ updatedAt: -1 }).lean();
  return opsNumbersFromSources(siteSettings || {});
}

function buyerDigits(user) {
  return normalizeWhatsappDigits(user?.mobile || '');
}

/**
 * Order placed → PDF to buyer + each ops number on file.
 */
export async function notifyWhatsappOrderPlaced(orderPopulated) {
  if (!isWhatsappConfigured()) return { skipped: true, reason: 'not_configured' };

  let pdfBuf;
  try {
    pdfBuf = await generateOrderPdfBuffer(orderPopulated);
  } catch (e) {
    console.error('[whatsapp] order PDF generation failed', e.message);
    return { skipped: true, reason: 'pdf_failed', error: e.message };
  }

  const caption = [
    `Hello from De Arté. Your order *${orderPopulated.orderId}* has been placed.`,
    'Order catalogue PDF attached for your records.',
  ].join(' ');

  const adminCaption = [`New buyer order`, `*${orderPopulated.orderId}* placed.`].join(' — ');
  const filename = `dearte-order-${String(orderPopulated.orderId || 'summary').replace(/\s+/g, '-').toLowerCase()}.pdf`;

  const results = [];

  const buyer = buyerDigits(orderPopulated.user);
  if (buyer) {
    try {
      await sendDocumentBuffer({
        toDigits: buyer,
        buffer: pdfBuf,
        filename,
        mimeType: 'application/pdf',
        caption,
      });
      results.push({ to: buyer, ok: true, role: 'buyer' });
    } catch (e) {
      console.error('[whatsapp] buyer delivery failed', e.message);
      results.push({ to: buyer, ok: false, role: 'buyer', error: e.message });
    }
  }

  const opsRecipients = await fetchSiteOpsNumbers();
  for (const digits of opsRecipients) {
    try {
      await sendDocumentBuffer({
        toDigits: digits,
        buffer: pdfBuf,
        filename,
        mimeType: 'application/pdf',
        caption: `${adminCaption} Buyer mobile on file.`,
      });
      results.push({ to: digits, ok: true, role: 'admin' });
    } catch (e) {
      console.error('[whatsapp] admin delivery failed', digits, e.message);
      results.push({ to: digits, ok: false, role: 'admin', error: e.message });
    }
  }

  return { skipped: false, results };
}

/**
 * Notify buyer after admin-approved status update.
 */
export async function notifyWhatsappOrderStatus(orderPopulated, { previousStatus, nextStatus, customNote }) {
  if (!isWhatsappConfigured()) return { skipped: true, reason: 'not_configured' };

  const buyer = buyerDigits(orderPopulated.user);
  if (!buyer) return { skipped: true, reason: 'no_buyer_mobile' };

  const name = orderPopulated.user?.name || 'there';
  const tail = customNote ? ` ${customNote.trim()}` : '';
  const body = `Dear ${name}, your De Arté order *${orderPopulated.orderId}* moved from "${previousStatus}" to *${nextStatus}*.${tail}`;

  try {
    await sendTextToE164Digits(buyer, body);
    return { skipped: false, ok: true, to: buyer };
  } catch (e) {
    console.error('[whatsapp] status update message failed', e.message);
    return { skipped: false, ok: false, error: e.message };
  }
}

/** Admin-initiated broadcasts with optional link media */
export async function broadcastWhatsappToUsers(users, payload) {
  if (!isWhatsappConfigured()) {
    throw new Error('WhatsApp integration is not configured on the server.');
  }

  const { message, mediaKind = 'none', mediaUrl = '', mediaFilename } = payload;
  const trimmed = String(message || '').trim();
  if (!trimmed && (mediaKind === 'none' || !mediaUrl)) {
    throw new Error('Message or media is required.');
  }

  const results = [];
  for (const user of users) {
    const digits = buyerDigits(user);
    if (!digits) {
      results.push({ userId: String(user._id || user.id), skipped: true, reason: 'no_mobile' });
      continue;
    }
    try {
      await sendWithMediaLink({
        toDigits: digits,
        message: trimmed,
        mediaKind,
        mediaUrl,
        mediaFilename,
      });
      results.push({ userId: String(user._id || user.id), ok: true, to: digits });
    } catch (e) {
      results.push({
        userId: String(user._id || user.id),
        ok: false,
        to: digits,
        error: e.message,
      });
    }
    await new Promise((r) => setTimeout(r, Number(process.env.WHATSAPP_SEND_DELAY_MS || 350)));
  }
  return results;
}
