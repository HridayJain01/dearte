/**
 * Normalize buyer/admin phone numbers into digits-only WhatsApp recipient ids (international format, no "+").
 */

const DEFAULT_CC = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '91';

export function normalizeWhatsappDigits(raw, defaultCountryCode = DEFAULT_CC) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length >= 11 && digits.startsWith(defaultCountryCode)) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith('91')) return digits;

  if (digits.length === 10) {
    const cc = String(defaultCountryCode).replace(/\D/g, '');
    return `${cc}${digits}`;
  }

  if (digits.length >= 11) {
    return digits;
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return digits;
  }

  return '';
}

export function parsePhoneNumberList(value) {
  if (!value) return [];
  return String(value)
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
