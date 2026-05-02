/**
 * WhatsApp Cloud API (Meta Graph) — outbound messages only for this integration.
 */

import { Blob } from 'node:buffer';

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${API_VERSION}`;

function phoneNumberId() {
  return process.env.WHATSAPP_PHONE_NUMBER_ID || '';
}

function accessToken() {
  return process.env.WHATSAPP_ACCESS_TOKEN || '';
}

export function isWhatsappConfigured() {
  if (process.env.WHATSAPP_ENABLED === 'false') return false;
  return Boolean(phoneNumberId() && accessToken());
}

export function getWhatsappConfigStatus() {
  const configured = isWhatsappConfigured();
  const missing = [];
  if (!phoneNumberId()) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!accessToken()) missing.push('WHATSAPP_ACCESS_TOKEN');
  if (process.env.WHATSAPP_ENABLED === 'false') {
    return { configured: false, disabled: true, missing: ['WHATSAPP_ENABLED=false'] };
  }
  return { configured, missing: configured ? [] : missing };
}

async function graphFetch(path, init = {}) {
  const url = path.startsWith('http') ? path : `${GRAPH_BASE}${path}`;
  const headers = {
    Authorization: `Bearer ${accessToken()}`,
    ...init.headers,
  };
  const response = await fetch(url, { ...init, headers });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errMsg = json?.error?.message || response.statusText || 'WhatsApp API error';
    const err = new Error(errMsg);
    err.status = response.status;
    err.details = json?.error;
    throw err;
  }
  return json;
}

/** Upload temporary media for sending document/image from buffer */
export async function uploadWhatsappMedia({ buffer, mimeType, filename = 'file' }) {
  const pnid = phoneNumberId();
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType || 'application/octet-stream');
  const blob = new Blob([buffer], { type: mimeType || 'application/octet-stream' });
  form.append('file', blob, filename);

  const url = `${GRAPH_BASE}/${pnid}/media`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken()}` },
    body: form,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errMsg = json?.error?.message || response.statusText || 'WhatsApp media upload failed';
    const err = new Error(errMsg);
    err.status = response.status;
    err.details = json?.error;
    throw err;
  }
  return json?.id || json?.media?.[0]?.id || '';
}

/** Send arbitrary messages payload blocks (single message object). */
export async function sendRawMessage(payload) {
  const pnid = phoneNumberId();
  return graphFetch(`/${pnid}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      ...payload,
    }),
  });
}

export async function sendTextToE164Digits(toDigits, body) {
  const text = String(body || '').trim().slice(0, 4096);
  if (!text) throw new Error('WhatsApp body is empty.');
  return sendRawMessage({
    to: String(toDigits).replace(/\D/g, ''),
    type: 'text',
    text: { preview_url: false, body: text },
  });
}

export async function sendDocumentBuffer({ toDigits, buffer, mimeType = 'application/pdf', filename, caption }) {
  const mediaId = await uploadWhatsappMedia({
    buffer,
    mimeType,
    filename: filename || 'document.pdf',
  });
  const cap = caption ? String(caption).trim().slice(0, 1024) : undefined;
  return sendRawMessage({
    to: String(toDigits).replace(/\D/g, ''),
    type: 'document',
    document: {
      id: mediaId,
      filename: filename || 'document.pdf',
      ...(cap ? { caption: cap } : {}),
    },
  });
}

/**
 * Broadcast helper: attachment via public HTTPS link (must be reachable by Meta).
 */
export async function sendWithMediaLink({ toDigits, message, mediaKind, mediaUrl, mediaFilename }) {
  const to = String(toDigits).replace(/\D/g, '');
  const kind = String(mediaKind || 'none');

  if (kind === 'none' || !mediaUrl) {
    return sendTextToE164Digits(to, message);
  }

  const caption = kind === 'image' || kind === 'video' ? String(message || '').slice(0, 1024) : undefined;

  if (kind === 'image') {
    return sendRawMessage({
      to,
      type: 'image',
      image: { link: mediaUrl, ...(caption !== undefined ? { caption } : {}) },
    });
  }

  if (kind === 'video') {
    return sendRawMessage({
      to,
      type: 'video',
      video: { link: mediaUrl, ...(caption !== undefined ? { caption } : {}) },
    });
  }

  if (kind === 'document') {
    const msg = String(message || '').trim().slice(0, 1024);
    return sendRawMessage({
      to,
      type: 'document',
      document: {
        link: mediaUrl,
        filename: mediaFilename || 'attachment.pdf',
        ...(msg ? { caption: msg } : {}),
      },
    });
  }

  throw new Error(`Unsupported mediaKind: ${kind}`);
}
