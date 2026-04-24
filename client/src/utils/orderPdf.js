import jsPDF from 'jspdf';
import { formatDate, formatWeight } from './formatters';

const BRAND = {
  charcoal: '#1f1d1a',
  gold: '#b68a3f',
  goldSoft: '#efe1bf',
  paper: '#f8f4ec',
  line: '#d8cbb6',
  muted: '#6f685f',
};

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function imageToDataUrl(url) {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const image = await loadImage(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext('2d');
      if (!context) return await blobToDataUrl(blob);

      context.drawImage(image, 0, 0);
      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

function buildItems(sourceItems = []) {
  return sourceItems.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    customization: item.customization || {},
    product: item.product || {},
  }));
}

function mapCart(cart) {
  return {
    kind: 'cart',
    title: 'De Arté Cart Catalogue',
    reference: 'Draft Catalogue',
    status: 'In progress',
    paymentMethod: '',
    shippingAddress: '',
    notes: cart?.specialInstructions || '',
    createdAt: new Date(),
    items: buildItems(cart?.items),
  };
}

function mapOrder(order) {
  return {
    kind: 'order',
    title: 'De Arté Order Catalogue',
    reference: order?.orderId || 'Order',
    status: order?.status || '',
    paymentMethod: order?.paymentMethod || '',
    shippingAddress: order?.shippingAddress || '',
    notes: order?.notes || '',
    createdAt: order?.createdAt || new Date(),
    items: buildItems(order?.items),
  };
}

function drawHeader(doc, title, reference, kind, pageNumberLabel = '') {
  const width = doc.internal.pageSize.getWidth();

  doc.setFillColor(BRAND.charcoal);
  doc.rect(0, 0, width, 22, 'F');

  doc.setFillColor(BRAND.gold);
  doc.rect(0, 22, width, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('De Arté', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Private jewellery catalogue and order summary', 14, 18);

  doc.setTextColor(236, 230, 219);
  doc.setFontSize(11);
  doc.text(title, width - 14, 11, { align: 'right' });
  doc.setFontSize(7.5);
  doc.text(`${kind === 'cart' ? 'Draft' : 'Order'} reference: ${reference}`, width - 14, 16, { align: 'right' });

  if (pageNumberLabel) {
    doc.setFontSize(7);
    doc.text(pageNumberLabel, width - 14, 20.5, { align: 'right' });
  }

  doc.setTextColor(31, 29, 26);
}

function drawSummaryCard(doc, x, y, w, label, value) {
  doc.setDrawColor(BRAND.line);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, 18, 2, 2, 'FD');
  doc.setTextColor(BRAND.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(label, x + 3, y + 6);
  doc.setTextColor(BRAND.charcoal);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(normalizeText(value) || '—', x + 3, y + 12.5);
}

function drawInfoBlock(doc, x, y, w, title, lines) {
  const lineHeight = 4.4;
  const height = 12 + lines.length * lineHeight;

  doc.setDrawColor(BRAND.line);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, height, 2, 2, 'FD');

  doc.setTextColor(BRAND.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(title, x + 3, y + 5);

  doc.setTextColor(BRAND.charcoal);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  lines.forEach((line, index) => {
    const rendered = normalizeText(line) || '—';
    doc.text(rendered, x + 3, y + 10 + index * lineHeight);
  });

  return height;
}

function drawItemCard(doc, item, imageDataUrl, x, y, w, h) {
  doc.setDrawColor(BRAND.line);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFillColor(BRAND.paper);
  doc.roundedRect(x + 3, y + 3, 28, h - 6, 1.5, 1.5, 'F');

  if (imageDataUrl) {
    try {
      doc.addImage(imageDataUrl, 'PNG', x + 4.2, y + 4.2, 25.6, h - 8.4, undefined, 'FAST');
    } catch {
      doc.setTextColor(BRAND.gold);
      doc.setFontSize(9);
      doc.text('Image', x + 11, y + h / 2);
    }
  } else {
    doc.setTextColor(BRAND.gold);
    doc.setFontSize(9);
    doc.text('Image', x + 11, y + h / 2);
  }

  const product = item.product || {};
  const detailsX = x + 36;
  const rightX = x + w - 36;

  doc.setTextColor(BRAND.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(product.styleCode || 'STYLE', detailsX, y + 7);

  doc.setTextColor(BRAND.charcoal);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(normalizeText(product.name) || 'Selected piece', w - 75);
  doc.text(titleLines.slice(0, 2), detailsX, y + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.setTextColor(BRAND.muted);
  doc.text(`Qty: ${item.quantity}`, detailsX, y + 21);
  doc.text(`Diamond: ${formatWeight(product.diamondWeight || 0, 'ct')}`, detailsX, y + 25.5);
  doc.text(`Gold: ${formatWeight(product.goldWeight || 0, 'g')}`, detailsX, y + 30);

  const customization = [
    item.customization?.goldColor,
    item.customization?.goldCarat,
    item.customization?.diamondQuality,
  ].filter(Boolean).join(' • ');

  if (customization) {
    const customizationLines = doc.splitTextToSize(`Customization: ${customization}`, w - 75);
    doc.text(customizationLines.slice(0, 2), detailsX, y + 34.5);
  }

  doc.setDrawColor(BRAND.gold);
  doc.setFillColor(BRAND.goldSoft);
  doc.roundedRect(rightX - 17, y + 13.5, 17, 6, 1.5, 1.5, 'FD');
  doc.setTextColor(BRAND.charcoal);
  doc.setFontSize(7);
  doc.text('Selected', rightX - 8.5, y + 17.5, { align: 'center' });
}

async function generatePdf({ payload, user, filename }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = width - margin * 2;

  const preloadedImages = await Promise.all(
    payload.items.map(async (item) => ({
      id: item.id,
      dataUrl: await imageToDataUrl(item.product?.images?.[0] || ''),
    })),
  );

  drawHeader(doc, payload.title, payload.reference, payload.kind);

  doc.setTextColor(BRAND.charcoal);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(normalizeText(payload.kind === 'cart' ? 'Draft catalogue ready for approval.' : 'Confirmed order catalogue for record keeping.'), margin, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(BRAND.muted);
  doc.text(`Created on ${formatDate(payload.createdAt)}`, width - margin, 34, { align: 'right' });

  const summaryY = 40;
  const summaryGap = 4;
  const summaryCardWidth = (contentWidth - summaryGap) / 2;

  drawSummaryCard(doc, margin, summaryY, summaryCardWidth, payload.kind === 'cart' ? 'Items in draft' : 'Items in order', String(payload.items.length));
  drawSummaryCard(doc, margin + summaryCardWidth + summaryGap, summaryY, summaryCardWidth, 'Reference', payload.reference);

  const infoY = 62;
  const infoGap = 4;
  const infoCardWidth = (contentWidth - infoGap) / 2;

  const buyerLines = [
    user?.name || 'Buyer',
    user?.companyName ? `Company: ${user.companyName}` : '',
    user?.email ? `Email: ${user.email}` : '',
    user?.mobile ? `Mobile: ${user.mobile}` : '',
    user?.city ? `City: ${user.city}` : '',
  ].filter(Boolean);

  const orderLines = [
    payload.status ? `Status: ${payload.status}` : '',
    payload.shippingAddress ? `Shipping: ${payload.shippingAddress}` : '',
    payload.notes ? `Notes: ${payload.notes}` : '',
  ].filter(Boolean);

  const buyerHeight = drawInfoBlock(doc, margin, infoY, infoCardWidth, 'Buyer details', buyerLines);
  const orderHeight = drawInfoBlock(doc, margin + infoCardWidth + infoGap, infoY, infoCardWidth, payload.kind === 'cart' ? 'Draft notes' : 'Order details', orderLines.length ? orderLines : ['No extra details recorded']);

  let y = infoY + Math.max(buyerHeight, orderHeight) + 10;

  doc.setTextColor(BRAND.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Selected pieces', margin, y);
  y += 4;

  const cardHeight = 40;
  const cardGap = 4;

  for (const [index, item] of payload.items.entries()) {
    if (y + cardHeight > height - 18) {
      doc.addPage();
      drawHeader(doc, payload.title, payload.reference, payload.kind, `Page ${doc.getNumberOfPages()}`);
      y = 26;
    }

    drawItemCard(doc, item, preloadedImages[index]?.dataUrl, margin, y, contentWidth, cardHeight);
    y += cardHeight + cardGap;
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const footerY = height - 9;
    doc.setDrawColor(BRAND.line);
    doc.line(margin, footerY - 3, width - margin, footerY - 3);
    doc.setTextColor(BRAND.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('De Arté private catalogue', margin, footerY);
    doc.text(`Page ${page} of ${pages}`, width - margin, footerY, { align: 'right' });
  }

  doc.save(filename);
}

export async function downloadDeArteCartPdf({ cart, user, filename } = {}) {
  await generatePdf({
    payload: mapCart(cart),
    user,
    filename: filename || 'dearte-cart-catalogue.pdf',
  });
}

export async function downloadDeArteOrderPdf({ order, user, filename } = {}) {
  await generatePdf({
    payload: mapOrder(order),
    user,
    filename: filename || `dearte-order-${normalizeText(order?.orderId || 'summary').replace(/\s+/g, '-').toLowerCase()}.pdf`,
  });
}