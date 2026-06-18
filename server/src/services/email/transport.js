/**
 * Email transport — Nodemailer over SMTP (Gmail by default).
 *
 * Outbound only. Designed to be swappable: every other module talks to this
 * file through isEmailConfigured / getEmailConfigStatus / sendEmail, so moving
 * to a custom domain (or to Resend/SES) later is a one-file change.
 *
 * Required env:
 *   EMAIL_USER        e.g. hridaymjain@gmail.com   (SMTP auth user)
 *   EMAIL_PASSWORD    Gmail App Password (16 chars, NOT the account password)
 * Optional env:
 *   EMAIL_FROM        e.g. "De Arté <hridaymjain@gmail.com>" (defaults to EMAIL_USER)
 *   EMAIL_ENABLED     set to "false" to hard-disable sending
 *   SMTP_HOST         defaults to smtp.gmail.com
 *   SMTP_PORT         defaults to 465
 *   SMTP_SECURE       defaults to "true" (465 = SSL). Set "false" for 587 STARTTLS.
 */

import nodemailer from 'nodemailer';

function smtpUser() {
  return process.env.EMAIL_USER || '';
}

function smtpPass() {
  return process.env.EMAIL_PASSWORD || '';
}

export function emailFromAddress() {
  return process.env.EMAIL_FROM || smtpUser();
}

export function isEmailConfigured() {
  if (process.env.EMAIL_ENABLED === 'false') return false;
  return Boolean(smtpUser() && smtpPass());
}

export function getEmailConfigStatus() {
  const missing = [];
  if (!smtpUser()) missing.push('EMAIL_USER');
  if (!smtpPass()) missing.push('EMAIL_PASSWORD');
  if (process.env.EMAIL_ENABLED === 'false') {
    return { configured: false, disabled: true, missing: ['EMAIL_ENABLED=false'] };
  }
  return { configured: isEmailConfigured(), from: emailFromAddress(), missing };
}

let cachedTransporter;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure =
    process.env.SMTP_SECURE != null ? process.env.SMTP_SECURE !== 'false' : port === 465;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: { user: smtpUser(), pass: smtpPass() },
  });
  return cachedTransporter;
}

/**
 * Send a single email.
 * @param {Object} opts
 * @param {string|string[]} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.text]   plain-text fallback
 * @param {Array<{filename:string, content:Buffer, contentType?:string}>} [opts.attachments]
 */
export async function sendEmail({ to, subject, html, text, attachments }) {
  if (!isEmailConfigured()) {
    throw new Error('Email is not configured on the server.');
  }
  const recipients = Array.isArray(to) ? to.filter(Boolean) : to;
  if (!recipients || (Array.isArray(recipients) && !recipients.length)) {
    throw new Error('Email recipient is required.');
  }
  return getTransporter().sendMail({
    from: emailFromAddress(),
    to: recipients,
    subject: String(subject || '').slice(0, 250),
    html,
    text,
    attachments,
  });
}
