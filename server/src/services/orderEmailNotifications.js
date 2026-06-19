/**
 * Order/promotional EMAIL notifications.
 *
 * Mirrors orderWhatsappNotifications.js so the two channels stay consistent:
 *   - notifyEmailOrderPlaced  → buyer + ops recipients, with order PDF attached
 *   - notifyEmailOrderStatus  → buyer only, admin-confirmed
 *   - broadcastEmailToUsers   → promotional blasts
 *
 * Everything no-ops cleanly when email isn't configured, and all callers run
 * these fire-and-forget so a delivery failure never blocks an order.
 */

import { SiteSettings } from '../models/index.js';
import { isEmailConfigured, sendEmail } from './email/transport.js';
import { orderChangeRequestEmail, orderPlacedEmail, orderStatusEmail, promoEmail } from './email/templates.js';
import { serializeOrder } from '../utils/serializers.js';
import { generateOrderPdfBuffer } from '../utils/orderPdfKit.js';

/** Split a comma/space/semicolon list into trimmed, valid-looking emails. */
function parseEmailList(value) {
  if (!value) return [];
  return String(value)
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
}

function opsEmailsFromSources(siteDoc) {
  const envList = parseEmailList(process.env.EMAIL_ADMIN_RECIPIENTS || '');
  const dbList = parseEmailList(siteDoc?.orderNotificationEmails || '');
  return [...new Set([...envList, ...dbList])];
}

async function fetchSite() {
  return SiteSettings.findOne().sort({ updatedAt: -1 }).lean();
}

function buyerEmail(order) {
  const email = order?.user?.email;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || '')) ? String(email).toLowerCase() : '';
}

function orderPdfFilename(order) {
  return `dearte-order-${String(order.orderId || 'summary').replace(/\s+/g, '-').toLowerCase()}.pdf`;
}

/**
 * Order placed → summary email + PDF to buyer, and a copy to each ops recipient.
 * @param {Object} orderPopulated  populated Order mongoose doc
 */
export async function notifyEmailOrderPlaced(orderPopulated) {
  if (!isEmailConfigured()) return { skipped: true, reason: 'not_configured' };

  const site = (await fetchSite()) || {};
  const order = serializeOrder(orderPopulated);

  let attachments;
  try {
    const pdfBuf = await generateOrderPdfBuffer(orderPopulated);
    attachments = [{ filename: orderPdfFilename(order), content: pdfBuf, contentType: 'application/pdf' }];
  } catch (e) {
    console.error('[email] order PDF generation failed', e.message);
    attachments = undefined; // still send the HTML summary without the attachment
  }

  const results = [];

  const buyer = buyerEmail(order);
  if (buyer) {
    try {
      const msg = orderPlacedEmail(order, { site });
      await sendEmail({ to: buyer, ...msg, attachments });
      results.push({ to: buyer, ok: true, role: 'buyer' });
    } catch (e) {
      console.error('[email] buyer order-placed failed', e.message);
      results.push({ to: buyer, ok: false, role: 'buyer', error: e.message });
    }
  }

  const opsRecipients = opsEmailsFromSources(site);
  if (opsRecipients.length) {
    try {
      const msg = orderPlacedEmail(order, { site, forOps: true });
      await sendEmail({ to: opsRecipients, ...msg, attachments });
      results.push({ to: opsRecipients, ok: true, role: 'admin' });
    } catch (e) {
      console.error('[email] ops order-placed failed', e.message);
      results.push({ to: opsRecipients, ok: false, role: 'admin', error: e.message });
    }
  }

  return { skipped: false, results };
}

/**
 * Notify buyer after an admin-approved status change.
 */
export async function notifyEmailOrderStatus(orderPopulated, { previousStatus, nextStatus, customNote }) {
  if (!isEmailConfigured()) return { skipped: true, reason: 'not_configured' };

  const order = serializeOrder(orderPopulated);
  const buyer = buyerEmail(order);
  if (!buyer) return { skipped: true, reason: 'no_buyer_email' };

  const site = (await fetchSite()) || {};
  try {
    const msg = orderStatusEmail(order, {
      previousStatus,
      nextStatus,
      customNote: (customNote || '').trim(),
      site,
    });
    await sendEmail({ to: buyer, ...msg });
    return { skipped: false, ok: true, to: buyer };
  } catch (e) {
    console.error('[email] status update failed', e.message);
    return { skipped: false, ok: false, error: e.message };
  }
}

/**
 * Buyer raised change request(s) on order line item(s) → notify ops recipients.
 * @param {Object} orderPopulated  populated Order mongoose doc
 * @param {Object} payload { requests: [{ productLabel, message }] }
 */
export async function notifyEmailOrderChangeRequest(orderPopulated, { requests = [] } = {}) {
  if (!isEmailConfigured()) return { skipped: true, reason: 'not_configured' };

  const site = (await fetchSite()) || {};
  const opsRecipients = opsEmailsFromSources(site);
  if (!opsRecipients.length) return { skipped: true, reason: 'no_ops_recipients' };

  const order = serializeOrder(orderPopulated);
  try {
    const msg = orderChangeRequestEmail(order, { requests, site });
    await sendEmail({ to: opsRecipients, ...msg });
    return { skipped: false, ok: true, to: opsRecipients };
  } catch (e) {
    console.error('[email] change-request notify failed', e.message);
    return { skipped: false, ok: false, error: e.message };
  }
}

/**
 * Admin-initiated promotional broadcast.
 * @param {Array} users   buyer docs (need .email / .name)
 * @param {Object} payload { subject, heading, bodyHtml, bodyText, ctaLabel, ctaUrl }
 */
export async function broadcastEmailToUsers(users, payload) {
  if (!isEmailConfigured()) {
    throw new Error('Email integration is not configured on the server.');
  }
  const { subject, heading, bodyHtml, bodyText, ctaLabel, ctaUrl } = payload || {};
  if (!String(subject || '').trim()) throw new Error('Subject is required.');
  if (!String(bodyHtml || bodyText || '').trim()) throw new Error('Message body is required.');

  const site = (await fetchSite()) || {};
  const delay = Number(process.env.EMAIL_SEND_DELAY_MS || 400);
  const results = [];

  for (const user of users) {
    const to = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(user?.email || ''))
      ? String(user.email).toLowerCase()
      : '';
    if (!to) {
      results.push({ userId: String(user?._id || user?.id || ''), skipped: true, reason: 'no_email' });
      continue;
    }
    try {
      const msg = promoEmail({ subject, heading, bodyHtml, bodyText, ctaLabel, ctaUrl, site });
      await sendEmail({ to, ...msg });
      results.push({ userId: String(user._id || user.id), ok: true, to });
    } catch (e) {
      results.push({ userId: String(user._id || user.id), ok: false, to, error: e.message });
    }
    await new Promise((r) => setTimeout(r, delay));
  }
  return results;
}
