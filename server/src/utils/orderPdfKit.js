/**
 * Server-side order catalogue PDF (pdfkit).
 *
 * Replicates the rich client-side download (client/src/utils/orderPdf.js, jsPDF)
 * so the PDF attached to emails / WhatsApp matches the one buyers download:
 * charcoal header + logo, summary cards, buyer/order info blocks, image item
 * cards, and a page footer. The client version can't run server-side (it relies
 * on browser canvas/Image), so the layout is mirrored here in pdfkit.
 */

import PDFDocument from 'pdfkit';
import { serializeProduct } from './serializers.js';
import { drawBrandLogo } from './brandLogo.js';

const BRAND = {
  charcoal: '#1f1d1a',
  gold: '#b68a3f',
  goldSoft: '#efe1bf',
  paper: '#f8f4ec',
  line: '#d8cbb6',
  muted: '#6f685f',
  headerTitle: '#ece6db',
  white: '#ffffff',
};

// The client lays everything out in millimetres on A4; pdfkit works in points.
const MM = 2.83465;
const mm = (v) => v * MM;
// jsPDF places text by baseline, pdfkit by the top of the line box. Shift up so
// the two engines land glyphs at roughly the same vertical position.
const BASELINE = 0.78;

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function formatWeight(value, unit) {
  return `${Number(value || 0).toFixed(2)} ${unit}`;
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value || Date.now()));
  } catch {
    return '—';
  }
}

/** Force Cloudinary URLs to a small JPEG pdfkit can embed (it only does JPEG/PNG). */
function toEmbeddableImageUrl(url) {
  if (!url) return '';
  if (url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/f_jpg,q_auto,w_260,h_260,c_fill/');
  }
  return url;
}

async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    const res = await fetch(toEmbeddableImageUrl(url));
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function text(doc, str, xMm, yBaselineMm, opts = {}) {
  const { size = 10, font = 'Helvetica', color = BRAND.charcoal, align = 'left', widthMm } = opts;
  doc.font(font).fontSize(size).fillColor(color);
  const x = mm(xMm);
  const yTop = mm(yBaselineMm) - size * BASELINE;
  const value = String(str ?? '');
  if (align === 'right') {
    doc.text(value, x - doc.widthOfString(value), yTop, { lineBreak: false });
  } else if (align === 'center') {
    doc.text(value, x - doc.widthOfString(value) / 2, yTop, { lineBreak: false });
  } else if (widthMm) {
    doc.text(value, x, yTop, { width: mm(widthMm), lineBreak: true, height: size * 2.4, ellipsis: true });
  } else {
    doc.text(value, x, yTop, { lineBreak: false });
  }
}

function box(doc, xMm, yMm, wMm, hMm, { r = 2, fill, stroke } = {}) {
  doc.lineWidth(0.5);
  doc.roundedRect(mm(xMm), mm(yMm), mm(wMm), mm(hMm), mm(r));
  if (fill && stroke) doc.fillAndStroke(fill, stroke);
  else if (fill) doc.fill(fill);
  else if (stroke) doc.stroke(stroke);
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

async function drawHeader(doc, title, reference, pageNumberLabel = '') {
  doc.rect(0, 0, mm(PAGE_W), mm(22)).fill(BRAND.charcoal);
  doc.rect(0, mm(22), mm(PAGE_W), mm(2)).fill(BRAND.gold);

  // White logo plate + vector brand logo on top.
  box(doc, 14, 4, 50, 14, { r: 1.5, fill: BRAND.white });
  try {
    await drawBrandLogo(doc, { x: mm(23.4), y: mm(6), width: mm(31.5) });
  } catch {
    text(doc, 'De Arté', 22, 13, { size: 12, font: 'Helvetica-Bold', color: BRAND.charcoal });
  }

  text(doc, 'Private jewellery catalogue and order summary', 14, 20.5, { size: 8, color: BRAND.white });
  text(doc, title, PAGE_W - 14, 11, { size: 11, color: BRAND.headerTitle, align: 'right' });
  text(doc, `Order reference: ${reference}`, PAGE_W - 14, 16, {
    size: 7.5,
    color: BRAND.headerTitle,
    align: 'right',
  });
  if (pageNumberLabel) {
    text(doc, pageNumberLabel, PAGE_W - 14, 20.5, { size: 7, color: BRAND.headerTitle, align: 'right' });
  }
}

function drawSummaryCard(doc, xMm, yMm, wMm, label, value) {
  box(doc, xMm, yMm, wMm, 18, { r: 2, fill: BRAND.white, stroke: BRAND.line });
  text(doc, label, xMm + 3, yMm + 6, { size: 7.5, color: BRAND.muted });
  text(doc, normalizeText(value) || '—', xMm + 3, yMm + 12.5, {
    size: 10,
    font: 'Helvetica-Bold',
    color: BRAND.charcoal,
  });
}

function drawInfoBlock(doc, xMm, yMm, wMm, title, lines) {
  const lineHeight = 4.4;
  const height = 12 + lines.length * lineHeight;
  box(doc, xMm, yMm, wMm, height, { r: 2, fill: BRAND.white, stroke: BRAND.line });
  text(doc, title, xMm + 3, yMm + 5, { size: 8, font: 'Helvetica-Bold', color: BRAND.gold });
  lines.forEach((line, index) => {
    text(doc, normalizeText(line) || '—', xMm + 3, yMm + 10 + index * lineHeight, {
      size: 8.5,
      color: BRAND.charcoal,
      widthMm: wMm - 6,
    });
  });
  return height;
}

function drawItemCard(doc, item, imageBuffer, xMm, yMm, wMm, hMm) {
  box(doc, xMm, yMm, wMm, hMm, { r: 2, fill: BRAND.white, stroke: BRAND.line });
  box(doc, xMm + 3, yMm + 3, 28, hMm - 6, { r: 1.5, fill: BRAND.paper });

  if (imageBuffer) {
    try {
      doc.image(imageBuffer, mm(xMm + 4.2), mm(yMm + 4.2), {
        fit: [mm(25.6), mm(hMm - 8.4)],
        align: 'center',
        valign: 'center',
      });
    } catch {
      text(doc, 'Image', xMm + 11, yMm + hMm / 2, { size: 9, color: BRAND.gold });
    }
  } else {
    text(doc, 'Image', xMm + 11, yMm + hMm / 2, { size: 9, color: BRAND.gold });
  }

  const product = item.product || {};
  const detailsX = xMm + 36;
  const rightX = xMm + wMm - 36;
  const detailWidth = wMm - 75;

  text(doc, product.styleCode || 'STYLE', detailsX, yMm + 7, {
    size: 8,
    font: 'Helvetica-Bold',
    color: BRAND.gold,
  });
  text(doc, normalizeText(product.name) || 'Selected piece', detailsX, yMm + 12.5, {
    size: 13,
    font: 'Helvetica-Bold',
    color: BRAND.charcoal,
    widthMm: detailWidth,
  });

  text(doc, `Qty: ${item.quantity}`, detailsX, yMm + 21, { size: 8.3, color: BRAND.muted });
  text(doc, `Diamond: ${formatWeight(product.diamondWeight, 'ct')}`, detailsX, yMm + 25.5, {
    size: 8.3,
    color: BRAND.muted,
  });
  text(doc, `Gold: ${formatWeight(product.goldWeight, 'g')}`, detailsX, yMm + 30, {
    size: 8.3,
    color: BRAND.muted,
  });

  const customization = [
    item.customization?.goldColor,
    item.customization?.goldCarat,
    item.customization?.diamondQuality,
  ]
    .filter(Boolean)
    .join(' • ');
  if (customization) {
    text(doc, `Customization: ${customization}`, detailsX, yMm + 34.5, {
      size: 8.3,
      color: BRAND.muted,
      widthMm: detailWidth,
    });
  }
  if (item.customization?.note) {
    text(doc, `Custom request: ${item.customization.note}`, detailsX, yMm + 39, {
      size: 8.3,
      color: BRAND.muted,
      widthMm: detailWidth,
    });
  }

  box(doc, rightX - 17, yMm + 13.5, 17, 6, { r: 1.5, fill: BRAND.goldSoft, stroke: BRAND.gold });
  text(doc, 'Selected', rightX - 8.5, yMm + 17.5, { size: 7, color: BRAND.charcoal, align: 'center' });
}

export function generateOrderPdfBuffer(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    (async () => {
      const buyer = order.user || {};
      const reference = order.orderId || 'Order';
      const title = 'De Arté Order Catalogue';

      const items = (order.items || []).map((item) => ({
        quantity: item.quantity,
        customization: item.customization || {},
        product: serializeProduct(item.product) || {},
      }));

      const imageBuffers = await Promise.all(
        items.map((item) => fetchImageBuffer(item.product?.images?.[0] || '')),
      );

      await drawHeader(doc, title, reference);

      text(doc, 'Confirmed order catalogue for record keeping.', MARGIN, 34, {
        size: 10,
        color: BRAND.charcoal,
      });
      text(doc, `Created on ${formatDate(order.createdAt)}`, PAGE_W - MARGIN, 34, {
        size: 8.5,
        color: BRAND.muted,
        align: 'right',
      });

      const summaryGap = 4;
      const cardW = (CONTENT_W - summaryGap) / 2;
      const totalGold = items.reduce(
        (sum, it) => sum + Number(it.product?.goldWeight || 0) * (Number(it.quantity) || 1),
        0,
      );
      const totalCarats = items.reduce(
        (sum, it) => sum + Number(it.product?.diamondWeight || 0) * (Number(it.quantity) || 1),
        0,
      );

      drawSummaryCard(doc, MARGIN, 40, cardW, 'Items in order', String(items.length));
      drawSummaryCard(doc, MARGIN + cardW + summaryGap, 40, cardW, 'Reference', reference);
      drawSummaryCard(doc, MARGIN, 62, cardW, 'Total gold weight', formatWeight(totalGold, 'g'));
      drawSummaryCard(
        doc,
        MARGIN + cardW + summaryGap,
        62,
        cardW,
        'Total diamond carats',
        formatWeight(totalCarats, 'ct'),
      );

      const infoY = 84;
      const buyerLines = [
        buyer.name || 'Buyer',
        buyer.companyName ? `Company: ${buyer.companyName}` : '',
        buyer.email ? `Email: ${buyer.email}` : '',
        buyer.mobile ? `Mobile: ${buyer.mobile}` : '',
        buyer.city ? `City: ${buyer.city}` : '',
      ].filter(Boolean);
      const orderLines = [
        order.status ? `Status: ${order.status}` : '',
        order.notes ? `Notes: ${order.notes}` : '',
      ].filter(Boolean);

      const buyerHeight = drawInfoBlock(doc, MARGIN, infoY, cardW, 'Buyer details', buyerLines);
      const orderHeight = drawInfoBlock(
        doc,
        MARGIN + cardW + summaryGap,
        infoY,
        cardW,
        'Order details',
        orderLines.length ? orderLines : ['No extra details recorded'],
      );

      let y = infoY + Math.max(buyerHeight, orderHeight) + 10;
      text(doc, 'Selected pieces', MARGIN, y, { size: 11, font: 'Helvetica-Bold', color: BRAND.gold });
      y += 4;

      const cardHeight = 40;
      const cardGap = 4;

      for (let index = 0; index < items.length; index += 1) {
        if (y + cardHeight > PAGE_H - 18) {
          doc.addPage();
          // eslint-disable-next-line no-await-in-loop
          await drawHeader(doc, title, reference, `Page ${doc.bufferedPageRange().count}`);
          y = 26;
        }
        drawItemCard(doc, items[index], imageBuffers[index], MARGIN, y, CONTENT_W, cardHeight);
        y += cardHeight + cardGap;
      }

      // Footer on every page.
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        const footerY = PAGE_H - 9;
        doc.lineWidth(0.5).strokeColor(BRAND.line);
        doc
          .moveTo(mm(MARGIN), mm(footerY - 3))
          .lineTo(mm(PAGE_W - MARGIN), mm(footerY - 3))
          .stroke();
        text(doc, 'De Arté private catalogue', MARGIN, footerY, { size: 7, color: BRAND.muted });
        text(doc, `Page ${i + 1} of ${range.count}`, PAGE_W - MARGIN, footerY, {
          size: 7,
          color: BRAND.muted,
          align: 'right',
        });
      }

      doc.end();
    })().catch(reject);
  });
}
