import jsPDF from 'jspdf';
import { BRAND, getBrandLogoDataUrl, normalizeText } from './orderPdf';
import { formatDate, formatWeight } from './formatters';
import { diamondWeightFor, goldWeightFor, variantImage } from './productVariants';
import { productDisplayName } from './productTitle';

/*
 * The AI catalogue builder's lookbook: a title page, then six pieces per A4
 * page. It shares the order PDF's colours and logo; order and cart PDFs are
 * untouched.
 */

// The built-in PDF fonts only cover Latin-1, so typographic punctuation from
// the model or a product name is flattened rather than printed as garbage.
const plain = (value) =>
  normalizeText(value)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...');

// Photos go in as ~900 px JPEGs: embedding full-size PNGs made a 24-piece book tens of MB.
async function loadPhoto(url, maxSide = 900) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const bitmap = await createImageBitmap(await response.blob());
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    // JPEG has no transparency: paint white first so cut-out photos don't turn black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height };
  } catch {
    return null;
  }
}

function drawHeader(doc, logo, title) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(BRAND.charcoal);
  doc.rect(0, 0, width, 22, 'F');
  doc.setFillColor(BRAND.gold);
  doc.rect(0, 22, width, 2, 'F');
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 4, 50, 14, 1.5, 1.5, 'F');
    doc.addImage(logo, 'PNG', 16, 5.1, 46, 12.1, undefined, 'FAST');
  }
  doc.setTextColor(236, 230, 219);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(title, width - 90)[0] || '', width - 14, 12, { align: 'right' });
  doc.setFontSize(7.5);
  doc.text('Private jewellery lookbook', width - 14, 17, { align: 'right' });
}

function drawCard(doc, product, photo, x, y, w, h) {
  doc.setDrawColor(BRAND.line);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  const box = { x: x + 3, y: y + 3, w: w - 6, h: h - 27 };
  doc.setFillColor(BRAND.paper);
  doc.roundedRect(box.x, box.y, box.w, box.h, 1.5, 1.5, 'F');
  if (photo) {
    // Fit inside the panel without stretching.
    const scale = Math.min(box.w / photo.width, box.h / photo.height);
    const imageW = photo.width * scale;
    const imageH = photo.height * scale;
    try {
      doc.addImage(photo.dataUrl, 'JPEG', box.x + (box.w - imageW) / 2, box.y + (box.h - imageH) / 2, imageW, imageH, undefined, 'FAST');
    } catch {
      // An unreadable photo leaves the panel empty rather than failing the book.
    }
  }

  const textX = x + 3.5;
  const textY = box.y + box.h + 5;
  doc.setTextColor(BRAND.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(plain(product.styleCode), textX, textY);

  doc.setTextColor(BRAND.charcoal);
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(plain(productDisplayName(product)), w - 7)[0] || '', textX, textY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(BRAND.muted);
  doc.text(doc.splitTextToSize(plain([product.category, product.subCategory].filter(Boolean).join(' · ')), w - 7)[0] || '', textX, textY + 10);
  doc.text(
    `Diamond ${formatWeight(diamondWeightFor(product), 'ct')} · Gold ${formatWeight(goldWeightFor(product, '18K'), 'g')} (18K)`,
    textX,
    textY + 14.5,
  );
}

export async function downloadLookbookPdf({ title, intro, products = [], user, filename } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = width - margin * 2;
  const gap = 6;
  const cardW = (contentWidth - gap) / 2;
  const cardH = 76;
  const bookTitle = plain(title) || 'A DeArte selection';

  const [logo, photos] = await Promise.all([
    getBrandLogoDataUrl(),
    // The colour the grid card shows, so the book matches the screen.
    Promise.all(
      products.map((product) =>
        loadPhoto(variantImage(product, { goldColor: product.firstColor || product.customizationOptions?.goldColors?.[0] })),
      ),
    ),
  ]);

  drawHeader(doc, logo, bookTitle);
  let y = 38;
  doc.setTextColor(BRAND.charcoal);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(bookTitle, contentWidth).slice(0, 2);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8;

  if (plain(intro)) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(BRAND.muted);
    const introLines = doc.splitTextToSize(plain(intro), contentWidth).slice(0, 5);
    doc.text(introLines, margin, y);
    y += introLines.length * 5;
  }

  doc.setFontSize(8.5);
  doc.setTextColor(BRAND.muted);
  const preparedFor = plain(user?.companyName || user?.name);
  doc.text(
    [preparedFor && `Prepared for ${preparedFor}`, formatDate(new Date()), `${products.length} ${products.length === 1 ? 'piece' : 'pieces'}`]
      .filter(Boolean)
      .join(' · '),
    margin,
    y + 2,
  );
  y += 8;

  products.forEach((product, index) => {
    const column = index % 2;
    if (column === 0 && index > 0) y += cardH + gap;
    if (column === 0 && y + cardH > height - 16) {
      doc.addPage();
      drawHeader(doc, logo, bookTitle);
      y = 30;
    }
    drawCard(doc, product, photos[index], margin + column * (cardW + gap), y, cardW, cardH);
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const footerY = height - 9;
    doc.setDrawColor(BRAND.line);
    doc.line(margin, footerY - 3, width - margin, footerY - 3);
    doc.setTextColor(BRAND.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('De Arté private lookbook', margin, footerY);
    doc.text(`Page ${page} of ${pages}`, width - margin, footerY, { align: 'right' });
  }

  const slug = bookTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  doc.save(filename || `dearte-lookbook-${slug || 'selection'}.pdf`);
}
