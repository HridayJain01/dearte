import { readFile } from 'node:fs/promises';

const logoSvgUrl = new URL('../../../client/src/assets/de_arte_jewels_logo.svg', import.meta.url);

let cachedLogo;

async function getLogoMarkup() {
  if (!cachedLogo) {
    cachedLogo = readFile(logoSvgUrl, 'utf8');
  }

  return cachedLogo;
}

function parseSvgPaths(svgMarkup) {
  const fillMatch = /\.cls-1\s*\{\s*fill:\s*([^;]+);\s*\}[\s\S]*?\.cls-2\s*\{\s*fill:\s*([^;]+);\s*\}/m.exec(svgMarkup);
  const fillByClass = {
    'cls-1': fillMatch?.[1]?.trim() || '#6C0020',
    'cls-2': fillMatch?.[2]?.trim() || '#C63D5B',
  };

  const paths = [];
  const pathPattern = /<path\s+class="([^"]+)"\s+d="([^"]+)"\s*\/>/g;
  let match;
  while ((match = pathPattern.exec(svgMarkup))) {
    paths.push({ className: match[1], d: match[2] });
  }

  const viewBoxMatch = /viewBox="([^"]+)"/.exec(svgMarkup);
  const [minX = 0, minY = 0, vbWidth = 1000, vbHeight = 320] = (viewBoxMatch?.[1] || '0 0 1000 320')
    .split(/\s+/)
    .map(Number);

  return {
    fillByClass,
    paths,
    viewBox: { minX, minY, vbWidth, vbHeight },
  };
}

export async function drawBrandLogo(doc, { x, y, width }) {
  const svgMarkup = await getLogoMarkup();
  const { fillByClass, paths, viewBox } = parseSvgPaths(svgMarkup);
  const scale = width / viewBox.vbWidth;
  const height = viewBox.vbHeight * scale;

  doc.save();
  doc.translate(x, y);
  doc.scale(scale);
  doc.translate(-viewBox.minX, -viewBox.minY);

  for (const path of paths) {
    doc.path(path.d).fill(fillByClass[path.className] || fillByClass['cls-1']);
  }

  doc.restore();

  return { height };
}