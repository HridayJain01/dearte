/**
 * Lightweight server-side order summary PDF for WhatsApp (pdfkit).
 */

import PDFDocument from 'pdfkit';
import { serializeProduct } from './serializers.js';
import { drawBrandLogo } from './brandLogo.js';

function productLine(productDoc) {
  const p =
    productDoc?.styleCode != null || productDoc?.name != null ? productDoc : serializeProduct(productDoc);
  if (!p) return '(Unknown item)';
  return `${p.styleCode || '—'} — ${p.name || 'Product'}${p.stockType ? ` (${p.stockType})` : ''}`.trim();
}

export function generateOrderPdfBuffer(order) {
  return new Promise((resolve, reject) => {
    const buyer = order.user;
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks = [];

    doc.on('data', (c) => chunks.push(c));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    (async () => {
      const logo = await drawBrandLogo(doc, { x: 205, y: 28, width: 185 });
      doc.y = 28 + logo.height + 10;

      doc.fontSize(10).fillColor('#6f685f').text('Private jewellery order summary — for record keeping', { align: 'center' });
      doc.moveDown(1.2);

      doc.fontSize(18).fillColor('#1f1d1a').text('Order catalogue', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(12).fillColor('#1f1d1a');
      doc.text(`Order reference: ${order.orderId || '—'}`);
      doc.text(`Placed: ${order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 16).replace('T', ' ') : '—'} UTC`);
      doc.text(`Status: ${order.status || 'Pending'}`);
      doc.moveDown();

      doc.fontSize(11).fillColor('#b68a3f').text('Buyer');
      doc.fontSize(10).fillColor('#1f1d1a');
      if (buyer) {
        doc.text(`${buyer.name || '—'}${buyer.companyName ? ` — ${buyer.companyName}` : ''}`);
        doc.text(`${buyer.email || ''}`);
        doc.text(`${buyer.mobile || ''}`);
      } else {
        doc.text('—');
      }
      doc.moveDown();

      doc.fontSize(11).fillColor('#b68a3f').text('Line items');
      doc.fontSize(10).fillColor('#1f1d1a');
      for (const item of order.items || []) {
        const qty = item.quantity || 0;
        const line = productLine(item.product);
        const c = item.customization || {};
        const extras = [c.goldColor, c.goldCarat, c.diamondQuality].filter(Boolean).join(' · ');
        doc.text(`${qty}x ${line}`);
        if (extras) doc.fillColor('#6f685f').text(`    ${extras}`).fillColor('#1f1d1a');
        if (c.note) doc.fillColor('#6f685f').text(`    Custom request: ${c.note}`).fillColor('#1f1d1a');
      }
      // compute and print totals: total gold weight (g) and total diamond carats (ct)
      const totalGold = (order.items || []).reduce((s, it) => s + ((it.product?.goldWeight || 0) * (it.quantity || 0)), 0);
      const totalCarats = (order.items || []).reduce((s, it) => s + ((it.product?.diamondWeight || 0) * (it.quantity || 0)), 0);
      doc.moveDown();
      doc.fontSize(11).fillColor('#b68a3f').text('Totals');
      doc.fontSize(10).fillColor('#1f1d1a');
      doc.text(`Total gold weight: ${Number(totalGold || 0).toFixed(2)} g`);
      doc.text(`Total diamond carats: ${Number(totalCarats || 0).toFixed(2)} ct`);
      doc.moveDown();

      doc.fontSize(11).fillColor('#b68a3f').text('Notes');
      doc.fontSize(10).fillColor('#1f1d1a');
      doc.text(String(order.notes || '(None)'));

      doc.end();
    })().catch(reject);
  });
}
