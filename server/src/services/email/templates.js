/**
 * Branded HTML email templates for De Arté.
 *
 * Each builder returns { subject, html, text }. They operate on the serialized
 * order shape (see serializeOrder) so the data matches what the app already uses.
 *
 * Email clients are hostile to modern CSS, so everything here is inline styles
 * and table-free-ish simple blocks that render consistently across Gmail/Outlook.
 */

const BRAND = {
  maroon: '#6C0020',
  rose: '#C63D5B',
  gold: '#b68a3f',
  ink: '#1f1d1a',
  muted: '#6f685f',
  bg: '#faf7f2',
  border: '#e6ddcf',
};

const BRAND_NAME = 'De Arté';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(value);
  }
}

function shell({ heading, intro, bodyHtml, site }) {
  const companyName = site?.companyName || BRAND_NAME;
  const contactBits = [site?.email, site?.phone, site?.address]
    .filter(Boolean)
    .map((b) => esc(b))
    .join(' &nbsp;•&nbsp; ');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:Georgia,'Times New Roman',serif;color:${BRAND.ink};">
    <div style="text-align:center;padding:8px 0 20px;">
      <span style="font-size:26px;letter-spacing:3px;color:${BRAND.maroon};font-weight:bold;">${esc(BRAND_NAME)}</span>
      <div style="font-size:11px;letter-spacing:2px;color:${BRAND.gold};text-transform:uppercase;margin-top:4px;">Fine Jewellery</div>
    </div>
    <div style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:12px;padding:28px 28px 24px;">
      <h1 style="margin:0 0 8px;font-size:20px;color:${BRAND.maroon};">${esc(heading)}</h1>
      ${intro ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:${BRAND.ink};">${intro}</p>` : ''}
      ${bodyHtml || ''}
    </div>
    <div style="text-align:center;padding:18px 8px 4px;font-size:11px;line-height:1.6;color:${BRAND.muted};font-family:Arial,sans-serif;">
      <div>${esc(companyName)}</div>
      ${contactBits ? `<div style="margin-top:4px;">${contactBits}</div>` : ''}
      <div style="margin-top:8px;color:#a99;">This is an automated message regarding your order.</div>
    </div>
  </div>
</body></html>`;
}

function itemsTable(items = []) {
  const rows = items
    .map((item) => {
      const p = item.product || {};
      const c = item.customization || {};
      const extras = [c.goldColor, c.goldCarat, c.diamondQuality].filter(Boolean).join(' · ');
      const title = `${p.styleCode ? esc(p.styleCode) + ' — ' : ''}${esc(p.name || 'Product')}`;
      return `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid ${BRAND.border};font-size:13px;font-family:Arial,sans-serif;">
          <div style="color:${BRAND.ink};font-weight:bold;">${title}</div>
          ${extras ? `<div style="color:${BRAND.muted};font-size:12px;margin-top:2px;">${esc(extras)}</div>` : ''}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid ${BRAND.border};font-size:13px;text-align:center;font-family:Arial,sans-serif;">${Number(item.quantity || 0)}</td>
      </tr>`;
    })
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:6px 0 4px;">
    <thead>
      <tr>
        <th align="left" style="padding:6px 8px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${BRAND.gold};font-family:Arial,sans-serif;border-bottom:2px solid ${BRAND.gold};">Item</th>
        <th align="center" style="padding:6px 8px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${BRAND.gold};font-family:Arial,sans-serif;border-bottom:2px solid ${BRAND.gold};">Qty</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td style="padding:10px 8px;color:${BRAND.muted};">No items.</td><td></td></tr>`}</tbody>
  </table>`;
}

function metaBlock(order) {
  const rows = [
    ['Order reference', order.orderId],
    ['Placed', formatDate(order.createdAt || order.date)],
    ['Status', order.status],
    ['Payment', order.paymentMethod || '—'],
  ];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 18px;background:${BRAND.bg};border-radius:8px;">
    ${rows
      .map(
        ([k, v]) => `<tr>
          <td style="padding:8px 12px;font-size:12px;color:${BRAND.muted};font-family:Arial,sans-serif;width:130px;">${esc(k)}</td>
          <td style="padding:8px 12px;font-size:13px;color:${BRAND.ink};font-family:Arial,sans-serif;font-weight:bold;">${esc(v || '—')}</td>
        </tr>`,
      )
      .join('')}
  </table>`;
}

function statusBadge(status) {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${BRAND.maroon};color:#fff;font-size:12px;font-family:Arial,sans-serif;letter-spacing:.5px;">${esc(status)}</span>`;
}

/** ORDER PLACED — to buyer (and ops copy uses the same body). */
export function orderPlacedEmail(order, { site, forOps = false } = {}) {
  const name = order.user?.name || 'there';
  const heading = forOps ? `New order ${order.orderId}` : 'Thank you for your order';
  const intro = forOps
    ? `A new order has been placed by <strong>${esc(order.user?.name || '—')}</strong> (${esc(order.user?.email || '—')}${order.user?.mobile ? ', ' + esc(order.user.mobile) : ''}).`
    : `Dear ${esc(name)}, we've received your order and our team is reviewing it. A summary is below, and the full catalogue PDF is attached for your records.`;

  const bodyHtml = `${metaBlock(order)}${itemsTable(order.items)}${
    order.shippingAddress
      ? `<p style="margin:16px 0 0;font-size:13px;font-family:Arial,sans-serif;"><strong style="color:${BRAND.gold};">Shipping:</strong> ${esc(order.shippingAddress)}</p>`
      : ''
  }${
    order.notes
      ? `<p style="margin:8px 0 0;font-size:13px;font-family:Arial,sans-serif;color:${BRAND.muted};"><strong style="color:${BRAND.gold};">Notes:</strong> ${esc(order.notes)}</p>`
      : ''
  }`;

  const text = `${forOps ? `New order ${order.orderId}` : `Thank you for your order, ${name}`}.
Order: ${order.orderId}
Status: ${order.status}
Items: ${(order.items || []).map((i) => `${i.quantity}x ${i.product?.name || 'Product'}`).join(', ')}`;

  return {
    subject: forOps
      ? `New order ${order.orderId} — ${order.user?.name || 'buyer'}`
      : `${BRAND_NAME} — Order ${order.orderId} received`,
    html: shell({ heading, intro, bodyHtml, site }),
    text,
  };
}

/** ORDER STATUS UPDATE — to buyer, admin-confirmed. */
export function orderStatusEmail(order, { previousStatus, nextStatus, customNote, site } = {}) {
  const name = order.user?.name || 'there';
  const intro = `Dear ${esc(name)}, there's an update on your order <strong>${esc(order.orderId)}</strong>.`;
  const bodyHtml = `
    <div style="text-align:center;margin:6px 0 18px;font-family:Arial,sans-serif;font-size:14px;">
      <span style="color:${BRAND.muted};">${esc(previousStatus || '—')}</span>
      <span style="color:${BRAND.gold};padding:0 8px;">&rarr;</span>
      ${statusBadge(nextStatus || order.status)}
    </div>
    ${customNote ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;background:${BRAND.bg};padding:12px 14px;border-radius:8px;">${esc(customNote)}</p>` : ''}
    ${metaBlock(order)}${itemsTable(order.items)}`;

  const text = `Order ${order.orderId} status: ${previousStatus} -> ${nextStatus}.${customNote ? `\n${customNote}` : ''}`;

  return {
    subject: `${BRAND_NAME} — Order ${order.orderId} is now ${nextStatus || order.status}`,
    html: shell({ heading: 'Order status updated', intro, bodyHtml, site }),
    text,
  };
}

/** PROMOTIONAL broadcast — admin-authored subject + body. */
export function promoEmail({ subject, heading, bodyHtml, bodyText, ctaLabel, ctaUrl, site }) {
  const cta =
    ctaLabel && ctaUrl
      ? `<div style="text-align:center;margin:22px 0 6px;">
           <a href="${esc(ctaUrl)}" style="display:inline-block;background:${BRAND.maroon};color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-family:Arial,sans-serif;font-size:14px;letter-spacing:.5px;">${esc(ctaLabel)}</a>
         </div>`
      : '';
  return {
    subject: subject || `${BRAND_NAME} — News`,
    html: shell({
      heading: heading || subject || 'A note from De Arté',
      intro: '',
      bodyHtml: `<div style="font-size:14px;line-height:1.7;font-family:Arial,sans-serif;color:${BRAND.ink};">${bodyHtml || ''}</div>${cta}`,
      site,
    }),
    text: bodyText || stripHtml(bodyHtml || ''),
  };
}

function stripHtml(html) {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
