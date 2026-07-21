import express from 'express';
import mongoose from 'mongoose';
import {
  Banner,
  Catalogue,
  Category,
  Collection,
  Event,
  MetalOption,
  Order,
  PopupAd,
  Product,
  SiteSettings,
  SubCategory,
  Testimonial,
  TrustedBrand,
  User,
} from '../models/index.js';
import { cloudinary } from '../config/cloudinary.js';
import { seedData } from '../data/seed.js';
import { normalizeAsset, normalizeAssetArray } from '../utils/assets.js';
import { sendError, sendSuccess } from '../utils/responses.js';
import { escapeRegex } from '../utils/validation.js';
import {
  serializeCatalogue,
  serializeMetalOption,
  serializeOrder,
  serializeProduct,
  serializeTaxonomy,
  serializeUser,
  serializeTrustedBrand,
} from '../utils/serializers.js';
import { slugify } from '../utils/slugify.js';
import { getWhatsappConfigStatus } from '../services/whatsapp/metaCloudApi.js';
import {
  broadcastWhatsappToUsers,
  notifyWhatsappOrderStatus,
} from '../services/orderWhatsappNotifications.js';
import { getEmailConfigStatus } from '../services/email/transport.js';
import { invalidateGuestCatalogueCache } from '../utils/guestCatalogue.js';
import {
  broadcastEmailToUsers,
  notifyEmailOrderStatus,
} from '../services/orderEmailNotifications.js';

const router = express.Router();

// Every query in the import loop pays a round trip to Atlas, so the writes go out a
// batch at a time instead of one by one.
const IMPORT_WRITE_CONCURRENCY = 10;

async function mapWithConcurrency(items, limit, handler) {
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await handler(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

const productPopulate = [
  { path: 'category' },
  { path: 'subCategory' },
  { path: 'collection' },
  { path: 'metalColor' },
];

const orderPopulate = [
  { path: 'user' },
  { path: 'statusHistory.changedBy' },
  {
    path: 'items.product',
    populate: productPopulate,
  },
];

const ACTIVE_STOCK_STATUSES = new Set(['Approved', 'Processing', 'Shipped', 'Fulfilled']);

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function toObjectId(value, fieldName) {
  if (!isObjectId(value)) {
    const error = new Error(`${fieldName} is invalid`);
    error.status = 400;
    throw error;
  }

  return new mongoose.Types.ObjectId(value);
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return Boolean(value);
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function pickFirstDefined(record, keys) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== '') {
      return record[key];
    }
  }

  return '';
}

function parseNumber(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback;
  const normalized = typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundWeight(value) {
  return Math.round(parseNumber(value, 0) * 1000) / 1000;
}

function dedupeStrings(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function normalizeWeightsInput(input) {
  const source = input && typeof input === 'object' ? input : {};
  const karat = (value) => ({
    k18: roundWeight(value?.k18),
    k14: roundWeight(value?.k14),
    k9: roundWeight(value?.k9),
  });

  return {
    gross: karat(source.gross),
    net: karat(source.net),
    diamond: roundWeight(source.diamond),
    colourStone: roundWeight(source.colourStone),
  };
}

function normalizeColorVariantsInput(input = []) {
  return (Array.isArray(input) ? input : [])
    .map((variant) => ({
      color: String(variant?.color || '').trim(),
      views: (Array.isArray(variant?.views) ? variant.views : [])
        .map((view) => ({
          view: String(view?.view || '').trim(),
          asset: normalizeAsset(view?.asset || view),
        }))
        .filter((view) => view.view && view.asset.secureUrl),
    }))
    .filter((variant) => variant.color && variant.views.length);
}

function buildPrimaryMedia(colorVariants = []) {
  return (colorVariants[0]?.views || []).map((entry) => normalizeAsset(entry.asset)).filter((asset) => asset.secureUrl);
}

function mergeCustomizationOptions(bodyOptions, currentOptions, colorVariants) {
  const incoming = bodyOptions || currentOptions || {};
  const derivedColors = dedupeStrings(colorVariants.map((variant) => variant.color));

  return {
    goldColors: derivedColors.length
      ? derivedColors
      : dedupeStrings(incoming.goldColors || ['Yellow Gold', 'Rose Gold', 'White Gold']),
    goldCarats: dedupeStrings(incoming.goldCarats || ['9K', '14K', '18K']),
    diamondQualities: dedupeStrings(incoming.diamondQualities || ['SI-IJ', 'VS-GH', 'VVS-EF']),
  };
}

function inferCloudinaryPublicId(secureUrl = '') {
  if (!secureUrl || !secureUrl.includes('/upload/')) return '';

  const [pathWithoutQuery] = secureUrl.split('?');
  const uploadIndex = pathWithoutQuery.indexOf('/upload/');
  if (uploadIndex === -1) return '';

  let remainder = pathWithoutQuery.slice(uploadIndex + '/upload/'.length);
  const parts = remainder.split('/').filter(Boolean);
  let assetPathStart = 0;

  while (assetPathStart < parts.length) {
    const part = parts[assetPathStart];
    if (/^v\d+$/.test(part)) {
      assetPathStart += 1;
      break;
    }
    if (!part.includes('_') && !part.includes(',')) {
      break;
    }
    assetPathStart += 1;
  }

  const assetPath = parts.slice(assetPathStart).join('/');
  return assetPath.replace(/\.[^.]+$/, '');
}

function createCloudinaryAsset({ secureUrl, alt = '', publicId = '' }) {
  const normalizedUrl = String(secureUrl || '').trim();
  return normalizeAsset({
    secureUrl: normalizedUrl,
    publicId: publicId || inferCloudinaryPublicId(normalizedUrl),
    alt,
  });
}

function joinCloudinaryBaseUrl(baseUrl, fileName) {
  const safeBaseUrl = String(baseUrl || '').trim().replace(/\/+$/, '');
  const safeFileName = String(fileName || '').trim().replace(/^\/+/, '');
  if (!safeBaseUrl || !safeFileName) return '';
  return `${safeBaseUrl}/${safeFileName}`;
}

// The upload sheet is one row per IMAGE: Style No x Colour x View. Rows for the same
// Style No collapse into a single product whose colorVariants hold the images.
const METAL_COLOR_LABELS = {
  rg: 'Rose Gold',
  wg: 'White Gold',
  yg: 'Yellow Gold',
  pg: 'Pink Gold',
  rosegold: 'Rose Gold',
  whitegold: 'White Gold',
  yellowgold: 'Yellow Gold',
};

// Compulsory per the upload spec. Sub Category, Collection, Occasions and
// Colour Stone Wt are intentionally absent - those may be blank.
const REQUIRED_IMPORT_FIELDS = [
  ['Style No', ['styleno', 'stylecode', 'style', 'collectionstyleno']],
  ['Category', ['category']],
  ['Colour', ['colour', 'color', 'metalcolor']],
  ['View', ['view', 'imageview', 'angle']],
  ['File Name', ['filename', 'file', 'image', 'imagename']],
  ['Gross Wt(18kt)', ['grosswt18kt', 'grosswt18k']],
  ['Gross Wt(14kt)', ['grosswt14kt', 'grosswt14k']],
  ['Gross Wt(9kt)', ['grosswt9kt', 'grosswt9k']],
  ['Net Wt(18kt)', ['netwt18kt', 'netwt18k']],
  ['Net Wt(14kt)', ['netwt14kt', 'netwt14k']],
  ['Net Wt(9kt)', ['netwt9kt', 'netwt9k']],
];

function normalizeMetalColorName(value) {
  const raw = String(value || '').trim();
  return METAL_COLOR_LABELS[normalizeHeader(raw)] || raw;
}

function readOccasions(row) {
  return dedupeStrings([
    pickFirstDefined(row, ['occasion1', 'occasion']),
    pickFirstDefined(row, ['occasion2']),
    pickFirstDefined(row, ['occasion3']),
    pickFirstDefined(row, ['occasion4']),
  ]);
}

function readWeights(row) {
  // Sheet values arrive as raw floats (11.991000000000001); weights are quoted to 3 dp.
  const at = (keys) => roundWeight(parseNumber(pickFirstDefined(row, keys), 0));
  return {
    gross: {
      k18: at(['grosswt18kt', 'grosswt18k']),
      k14: at(['grosswt14kt', 'grosswt14k']),
      k9: at(['grosswt9kt', 'grosswt9k']),
    },
    net: {
      k18: at(['netwt18kt', 'netwt18k']),
      k14: at(['netwt14kt', 'netwt14k']),
      k9: at(['netwt9kt', 'netwt9k']),
    },
    diamond: at(['diamondwtct', 'diamondwt', 'diamondweight']),
    colourStone: at(['colourstonewtct', 'colourstonewt', 'colorstonewt', 'stoneweight']),
  };
}

// A file name encodes Style.View.Colour_WM.ext. If the Colour column disagrees with
// the file name the row is malformed (e.g. "ABR00361.Right.LEFT.WG_WM.jpg"), and we
// skip it rather than create a bogus colour variant.
function fileNameColorMismatch(fileName, color) {
  const base = String(fileName || '').trim().replace(/\.[^.]+$/, '');
  const segments = base.split('.');
  if (segments.length !== 3) return `File Name "${fileName}" is not Style.View.Colour format`;
  const fromFile = normalizeHeader(segments[2].split('_')[0]);
  if (fromFile && fromFile !== normalizeHeader(color)) {
    return `Colour "${color}" does not match File Name "${fileName}"`;
  }
  return '';
}

// Effectively-unlimited default stock for bulk-imported Ready Stock products so
// they are always purchasable. Admins can still adjust per product afterward.
const BULK_IMPORT_DEFAULT_STOCK = 999;

function buildBulkImportPayloads(rows = [], options = {}) {
  const productsByStyle = new Map();
  const errors = [];

  rows.forEach((rawRow, index) => {
    const row = {};
    for (const [key, value] of Object.entries(rawRow || {})) {
      row[normalizeHeader(key)] = value;
    }
    if (!Object.keys(row).length) return;

    // Sheet row number: +2 for the header row and 1-based indexing.
    const rowNumber = parseNumber(pickFirstDefined(row, ['srno', 'sr', 'serialno']), index + 1);
    const styleCode = String(
      pickFirstDefined(row, ['styleno', 'stylecode', 'style', 'collectionstyleno']),
    ).trim();

    const missing = REQUIRED_IMPORT_FIELDS
      .filter(([, keys]) => !String(pickFirstDefined(row, keys)).trim())
      .map(([label]) => label);
    if (missing.length) {
      errors.push({ row: rowNumber, styleCode, reason: `Missing required: ${missing.join(', ')}` });
      return;
    }

    const color = normalizeMetalColorName(pickFirstDefined(row, ['colour', 'color', 'metalcolor']));
    const view = String(pickFirstDefined(row, ['view', 'imageview', 'angle'])).trim();
    const fileName = String(pickFirstDefined(row, ['filename', 'file', 'image', 'imagename'])).trim();

    const mismatch = fileNameColorMismatch(
      fileName,
      pickFirstDefined(row, ['colour', 'color', 'metalcolor']),
    );
    if (mismatch) {
      errors.push({ row: rowNumber, styleCode, reason: mismatch });
      return;
    }

    const secureUrl = String(
      pickFirstDefined(row, ['cloudinaryurl', 'imagelink', 'imageurl', 'url', 'secureurl']),
    ).trim() || joinCloudinaryBaseUrl(options.cloudinaryBaseUrl, fileName);
    if (!secureUrl) {
      errors.push({
        row: rowNumber,
        styleCode,
        reason: 'No image URL: provide a Cloudinary base URL or an image URL column',
      });
      return;
    }

    const weights = readWeights(row);
    const current = productsByStyle.get(styleCode) || {
      styleCode,
      name: String(pickFirstDefined(row, ['productname', 'name'])).trim() || styleCode,
      description: '',
      metalType: String(pickFirstDefined(row, ['metaltype'])).trim(),
      metal: String(pickFirstDefined(row, ['metal'])).trim(),
      weights,
      occasions: readOccasions(row),
      diamondQuality: String(pickFirstDefined(row, ['diamondquality'])).trim() || 'VS-GH',
      settingType: String(pickFirstDefined(row, ['settingtype'])).trim(),
      sku: String(pickFirstDefined(row, ['sku'])).trim() || styleCode,
      stockType: options.stockType || 'Ready Stock',
      // Bulk-imported products should be purchasable immediately. The UI no
      // longer collects a per-import quantity, so default to an effectively
      // unlimited count rather than 0 (which would mark every style out of stock).
      stockQuantity: Number(options.stockQuantity ?? BULK_IMPORT_DEFAULT_STOCK),
      status: options.status || 'Active',
      isNewArrival: parseBoolean(options.isNewArrival, false),
      isBestSeller: parseBoolean(options.isBestSeller, false),
      colorVariantsMap: new Map(),
      // Taxonomy is per row in this sheet; the first row for a style wins.
      rawCategory: String(pickFirstDefined(row, ['category'])).trim(),
      rawSubCategory: String(pickFirstDefined(row, ['subcategory'])).trim(),
      rawCollection: String(pickFirstDefined(row, ['collection'])).trim(),
      rows: [],
    };

    current.rows.push(rowNumber);
    if (!current.occasions.length) current.occasions = readOccasions(row);

    const views = current.colorVariantsMap.get(color) || new Map();
    views.set(view, {
      view,
      asset: createCloudinaryAsset({ secureUrl, alt: `${styleCode} ${color} ${view}` }),
    });
    current.colorVariantsMap.set(color, views);

    productsByStyle.set(styleCode, current);
  });

  const payloads = [...productsByStyle.values()].map((item) => {
    const colorVariants = [...item.colorVariantsMap.entries()].map(([color, views]) => ({
      color,
      views: [...views.values()].sort((a, b) => a.view.localeCompare(b.view)),
    }));
    const { weights } = item;

    return {
      styleCode: item.styleCode,
      name: item.name,
      description: item.description,
      rawCategory: item.rawCategory,
      rawSubCategory: item.rawSubCategory,
      rawCollection: item.rawCollection,
      metalType: item.metalType,
      metal: item.metal,
      weights,
      // Legacy flat fields, derived from the 18kt figures.
      diamondWeight: weights.diamond,
      goldWeight: weights.net.k18,
      diamondQuality: item.diamondQuality,
      settingType: item.settingType,
      occasion: item.occasions[0] || '',
      occasions: item.occasions,
      sku: item.sku,
      stockType: item.stockType,
      stockQuantity: item.stockQuantity,
      status: item.status,
      isNewArrival: item.isNewArrival,
      isBestSeller: item.isBestSeller,
      media: buildPrimaryMedia(colorVariants),
      colorVariants,
      customizationOptions: {
        goldColors: colorVariants.map((variant) => variant.color),
        goldCarats: ['9K', '14K', '18K'],
        diamondQualities: ['SI-IJ', item.diamondQuality || 'VS-GH', 'VVS-EF'],
      },
      specifications: [
        ['Gross Wt (18kt)', weights.gross.k18],
        ['Gross Wt (14kt)', weights.gross.k14],
        ['Gross Wt (9kt)', weights.gross.k9],
        ['Net Wt (18kt)', weights.net.k18],
        ['Net Wt (14kt)', weights.net.k14],
        ['Net Wt (9kt)', weights.net.k9],
        ['Diamond Wt (ct)', weights.diamond],
        ['Colour Stone Wt (ct)', weights.colourStone],
      ]
        .filter(([, value]) => value > 0)
        .map(([attribute, value]) => ({ attribute, value: String(value) })),
    };
  });

  return { payloads, errors };
}

// Auto-creates taxonomy referenced by the sheet, reusing existing docs by slug so a
// re-upload does not duplicate them. Returns the ids plus what it had to create.
function createTaxonomyResolver() {
  const created = { categories: [], subCategories: [], collections: [], metalColors: [] };
  const cache = new Map();

  async function resolve(kind, Model, name, extra = {}) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    const slug = slugify(trimmed);
    const cacheKey = `${kind}:${slug}:${extra.category || ''}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    let doc = await Model.findOne(kind === 'metalColors' ? { name: trimmed } : { slug });
    if (!doc) {
      doc = await Model.create(
        kind === 'metalColors' ? { name: trimmed } : { name: trimmed, slug, ...extra },
      );
      created[kind].push(trimmed);
    }
    cache.set(cacheKey, doc._id);
    return doc._id;
  }

  return {
    created,
    category: (name) => resolve('categories', Category, name),
    subCategory: (name, categoryId) =>
      resolve('subCategories', SubCategory, name, { category: categoryId }),
    collection: (name, categoryId, subCategoryId) =>
      resolve('collections', Collection, name, {
        category: categoryId,
        subCategory: subCategoryId || null,
      }),
    metalColor: (name) => resolve('metalColors', MetalOption, name),
  };
}

function sanitizeProductPayload(body, currentProduct = null) {
  const mediaInput = body.media || body.images || currentProduct?.media || [];
  const colorVariants = normalizeColorVariantsInput(body.colorVariants || currentProduct?.colorVariants || []);
  const media = normalizeAssetArray(mediaInput);
  const derivedMedia = colorVariants.length ? buildPrimaryMedia(colorVariants) : media;

  return {
    styleCode: String(body.styleCode || currentProduct?.styleCode || '').trim(),
    name: String(body.name || currentProduct?.name || '').trim(),
    description: body.description ?? currentProduct?.description ?? '',
    category: body.categoryId
      ? toObjectId(body.categoryId, 'categoryId')
      : currentProduct?.category,
    subCategory: body.subCategoryId
      ? toObjectId(body.subCategoryId, 'subCategoryId')
      : currentProduct?.subCategory,
    collection: body.collectionId
      ? toObjectId(body.collectionId, 'collectionId')
      : currentProduct?.collection,
    metalType: body.metalType ?? currentProduct?.metalType ?? '',
    metalColor: body.metalColorId
      ? toObjectId(body.metalColorId, 'metalColorId')
      : currentProduct?.metalColor,
    metal: body.metal ?? currentProduct?.metal ?? '',
    diamondWeight: Number(body.diamondWeight ?? currentProduct?.diamondWeight ?? 0),
    goldWeight: Number(body.goldWeight ?? currentProduct?.goldWeight ?? 0),
    weights: normalizeWeightsInput(body.weights ?? currentProduct?.weights),
    diamondQuality: body.diamondQuality ?? currentProduct?.diamondQuality ?? '',
    settingType: body.settingType ?? currentProduct?.settingType ?? '',
    occasion: body.occasion ?? currentProduct?.occasion ?? '',
    occasions: dedupeStrings(body.occasions ?? currentProduct?.occasions ?? []),
    sku: body.sku ?? currentProduct?.sku ?? '',
    stockType: body.stockType ?? currentProduct?.stockType ?? 'Ready Stock',
    stockQuantity: Number(body.stockQuantity ?? currentProduct?.stockQuantity ?? 0),
    status: body.status ?? currentProduct?.status ?? 'Active',
    isNewArrival: parseBoolean(body.isNewArrival, currentProduct?.isNewArrival ?? false),
    isBestSeller: parseBoolean(body.isBestSeller, currentProduct?.isBestSeller ?? false),
    showToGuests: parseBoolean(body.showToGuests, currentProduct?.showToGuests ?? false),
    media: derivedMedia,
    colorVariants,
    customizationOptions: mergeCustomizationOptions(
      body.customizationOptions,
      currentProduct?.customizationOptions,
      colorVariants,
    ),
    specifications: Array.isArray(body.specifications)
      ? body.specifications
      : currentProduct?.specifications || [],
  };
}

const GUEST_ACCESS_KEYS = [
  'showPopupPromo',
  'showHeroSlider',
  'showBrandExpression',
  'showProcessImage',
  'showCollections',
  'showBestSellers',
  'showNewArrivals',
  'showTestimonials',
  'showEvents',
  'showTrustedBrands',
  'showCTABanner',
  'pageProducts',
  'pageCollections',
  'pageEvents',
  'pageTestimonials',
  'pageTrustedBrands',
];

function plainSubdoc(value) {
  if (!value) return {};
  return typeof value.toObject === 'function' ? value.toObject() : { ...value };
}

// Merge incoming guest-access toggles over the stored values so a partial save
// never wipes untouched keys. Only known boolean keys survive.
function sanitizeGuestAccess(body, current) {
  const base = plainSubdoc(current?.guestAccess);
  const incoming = body?.guestAccess || {};
  const result = {};
  for (const key of GUEST_ACCESS_KEYS) {
    if (incoming[key] !== undefined) result[key] = Boolean(incoming[key]);
    else if (base[key] !== undefined) result[key] = base[key];
  }
  return result;
}

function toObjectIdArray(list) {
  return Array.isArray(list)
    ? list.filter((id) => isObjectId(id)).map((id) => new mongoose.Types.ObjectId(String(id)))
    : [];
}

// The set of products a guest may browse, addressed by any taxonomy identifier.
// Each field is only overwritten when the client explicitly sends it.
function sanitizeGuestCatalogue(body, current) {
  const cur = plainSubdoc(current?.guestCatalogue);
  const incoming = body?.guestCatalogue;
  const pick = (key, fallback) => (incoming && incoming[key] !== undefined ? incoming[key] : fallback);
  return {
    includeFlagged:
      incoming && incoming.includeFlagged !== undefined
        ? Boolean(incoming.includeFlagged)
        : cur.includeFlagged ?? true,
    categories: incoming && incoming.categories !== undefined ? toObjectIdArray(incoming.categories) : cur.categories || [],
    subCategories:
      incoming && incoming.subCategories !== undefined ? toObjectIdArray(incoming.subCategories) : cur.subCategories || [],
    collections:
      incoming && incoming.collections !== undefined ? toObjectIdArray(incoming.collections) : cur.collections || [],
    occasions: Array.isArray(pick('occasions', cur.occasions))
      ? pick('occasions', cur.occasions)
          .map((value) => String(value).trim())
          .filter(Boolean)
          .slice(0, 100)
      : [],
  };
}

function sanitizeSiteSettings(body, current = null) {
  return {
    companyName: body.companyName ?? current?.companyName ?? '',
    email: body.email ?? current?.email ?? '',
    phone: body.phone ?? current?.phone ?? '',
    whatsapp: body.whatsapp ?? current?.whatsapp ?? '',
    instagram: body.instagram ?? current?.instagram ?? '',
    linkedin: body.linkedin ?? current?.linkedin ?? '',
    facebook: body.facebook ?? current?.facebook ?? '',
    address: body.address ?? current?.address ?? '',
    hours: body.hours ?? current?.hours ?? '',
    mapsEmbed: body.mapsEmbed ?? current?.mapsEmbed ?? '',
    newsletterBlurb: body.newsletterBlurb ?? current?.newsletterBlurb ?? '',
    whatsappOperationsNumbers: body.whatsappOperationsNumbers ?? current?.whatsappOperationsNumbers ?? '',
    orderNotificationEmails: body.orderNotificationEmails ?? current?.orderNotificationEmails ?? '',
    guestAccess: sanitizeGuestAccess(body, current),
    guestCatalogue: sanitizeGuestCatalogue(body, current),
  };
}

function sanitizeCataloguePayload(body, current = null) {
  return {
    name: String(body.name || current?.name || '').trim(),
    description: body.description ?? current?.description ?? '',
    coverImage: normalizeAsset(body.coverImage || current?.coverImage || {}),
    products: Array.isArray(body.productIds)
      ? body.productIds.filter(isObjectId).map((id) => new mongoose.Types.ObjectId(id))
      : current?.products || [],
    assignedUsers: Array.isArray(body.assignedUserIds)
      ? body.assignedUserIds.filter(isObjectId).map((id) => new mongoose.Types.ObjectId(id))
      : current?.assignedUsers || [],
    active: parseBoolean(body.active, current?.active ?? true),
    archived: parseBoolean(body.archived, current?.archived ?? false),
  };
}

async function restoreStockForOrder(order) {
  for (const item of order.items) {
    const productId = item.product?._id || item.product;
    const product = await Product.findById(productId);
    if (product?.stockType === 'Ready Stock') {
      product.stockQuantity += item.quantity;
      await product.save();
    }
  }

  order.stockDeducted = false;
}

async function deductStockForOrder(order) {
  if (order.stockDeducted) return;

  for (const item of order.items) {
    const productId = item.product?._id || item.product;
    const product = await Product.findById(productId);

    if (!product) {
      throw new Error('Unable to deduct stock because a product is missing.');
    }

    if (product.stockType === 'Ready Stock') {
      if (product.stockQuantity < item.quantity) {
        throw new Error(`Only ${product.stockQuantity} unit(s) available for ${product.styleCode}.`);
      }

      product.stockQuantity -= item.quantity;
      await product.save();
    }
  }

  order.stockDeducted = true;
}

async function serializePromotionsPayload() {
  const [banners, popupAds, events] = await Promise.all([
    Banner.find().sort({ sortOrder: 1, createdAt: 1 }),
    PopupAd.find().sort({ createdAt: -1 }),
    Event.find().sort({ date: 1 }),
  ]);

  return {
    banners: banners.map((banner) => ({
      id: String(banner._id),
      title: banner.title,
      subtitle: banner.subtitle,
      ctaLabel: banner.ctaLabel,
      ctaLink: banner.ctaLink,
      image: normalizeAsset(banner.image),
      active: banner.active,
      sortOrder: banner.sortOrder,
    })),
    bannersOrder: banners.map((banner) => String(banner._id)),
    popupAds: popupAds.map((popup) => ({
      id: String(popup._id),
      image: normalizeAsset(popup.image),
      frequency: popup.frequency,
      startDate: popup.startDate,
      endDate: popup.endDate,
      active: popup.active,
    })),
    events: events.map((event) => ({
      id: String(event._id),
      title: event.title,
      date: event.date,
      description: event.description,
      image: normalizeAsset(event.image),
      active: event.active,
    })),
  };
}

router.get('/whatsapp/status', (_req, res) => sendSuccess(res, getWhatsappConfigStatus()));

router.post('/whatsapp/broadcast', async (req, res) => {
  const {
    audience,
    userIds = [],
    message = '',
    mediaKind = 'none',
    mediaUrl = '',
    mediaFilename,
  } = req.body || {};

  if (!['all_active_buyers', 'selected'].includes(audience)) {
    return sendError(res, 'audience must be all_active_buyers or selected', 400);
  }

  const trimmedUrl = typeof mediaUrl === 'string' ? mediaUrl.trim() : '';
  if (trimmedUrl && (!trimmedUrl.startsWith('https://') || trimmedUrl.includes(' '))) {
    return sendError(
      res,
      'mediaUrl must be an https:// URL accessible to WhatsApp servers (typically a Cloudinary CDN link).',
      400,
    );
  }

  let usersQuery;
  if (audience === 'all_active_buyers') {
    usersQuery = User.find({ role: 'buyer', status: 'Active' }).sort({ createdAt: -1 });
  } else {
    const objectIds = (Array.isArray(userIds) ? userIds : [])
      .filter((id) => isObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (!objectIds.length) {
      return sendError(res, 'userIds required when audience is selected', 400);
    }

    // The admin user list (and selection UI) includes both buyers and sales
    // accounts, so an explicit selection must honor either role — otherwise
    // selected sales recipients are silently dropped.
    usersQuery = User.find({ _id: { $in: objectIds }, role: { $in: ['buyer', 'sales'] } });
  }

  const users = await usersQuery.exec();

  const text = typeof message === 'string' ? message.trim() : '';
  const kind =
    trimmedUrl &&
    typeof mediaKind === 'string' &&
    ['none', 'image', 'video', 'document'].includes(mediaKind)
      ? mediaKind
      : trimmedUrl
        ? 'image'
        : 'none';

  if (!text && kind === 'none') {
    return sendError(res, 'message or media attachment is required', 400);
  }

  try {
    const results = await broadcastWhatsappToUsers(users, {
      message: text,
      mediaKind: trimmedUrl ? kind : 'none',
      mediaUrl: trimmedUrl,
      mediaFilename,
    });

    const sent = results.filter((r) => r.ok).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => r.ok === false).length;

    return sendSuccess(
      res,
      { results, totals: { sent, skipped, failed, targeted: users.length } },
      'Broadcast finished',
    );
  } catch (error) {
    return sendError(res, error.message, 400);
  }
});

router.get('/email/status', (_req, res) => sendSuccess(res, getEmailConfigStatus()));

router.post('/email/broadcast', async (req, res) => {
  const {
    audience,
    userIds = [],
    subject = '',
    heading = '',
    bodyHtml = '',
    bodyText = '',
    ctaLabel = '',
    ctaUrl = '',
  } = req.body || {};

  if (!['all_active_buyers', 'selected'].includes(audience)) {
    return sendError(res, 'audience must be all_active_buyers or selected', 400);
  }
  if (!String(subject || '').trim()) {
    return sendError(res, 'subject is required', 400);
  }
  if (!String(bodyHtml || bodyText || '').trim()) {
    return sendError(res, 'message body is required', 400);
  }

  const trimmedCtaUrl = typeof ctaUrl === 'string' ? ctaUrl.trim() : '';
  if (trimmedCtaUrl && !/^https?:\/\//.test(trimmedCtaUrl)) {
    return sendError(res, 'ctaUrl must be an http(s) URL', 400);
  }

  let usersQuery;
  if (audience === 'all_active_buyers') {
    usersQuery = User.find({ role: 'buyer', status: 'Active' }).sort({ createdAt: -1 });
  } else {
    const objectIds = (Array.isArray(userIds) ? userIds : [])
      .filter((id) => isObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (!objectIds.length) {
      return sendError(res, 'userIds required when audience is selected', 400);
    }
    // The admin user list (and selection UI) includes both buyers and sales
    // accounts, so an explicit selection must honor either role — otherwise
    // selected sales recipients are silently dropped.
    usersQuery = User.find({ _id: { $in: objectIds }, role: { $in: ['buyer', 'sales'] } });
  }

  const users = await usersQuery.exec();

  try {
    const results = await broadcastEmailToUsers(users, {
      subject: String(subject).trim(),
      heading: String(heading || '').trim(),
      bodyHtml,
      bodyText,
      ctaLabel: String(ctaLabel || '').trim(),
      ctaUrl: trimmedCtaUrl,
    });

    const sent = results.filter((r) => r.ok).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => r.ok === false).length;

    return sendSuccess(
      res,
      { results, totals: { sent, skipped, failed, targeted: users.length } },
      'Broadcast finished',
    );
  } catch (error) {
    return sendError(res, error.message, 400);
  }
});

router.get('/dashboard', async (_req, res) => {
  const [buyers, products, orders, catalogues, pendingBuyers, newProducts, recentOrders] =
    await Promise.all([
      User.countDocuments({ role: 'buyer' }),
      Product.countDocuments(),
      Order.countDocuments(),
      Catalogue.countDocuments({ archived: false }),
      User.countDocuments({ role: 'buyer', status: 'Inactive' }),
      Product.countDocuments({ isNewArrival: true }),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate(orderPopulate),
    ]);

  return sendSuccess(res, {
    stats: {
      buyers,
      products,
      orders,
      catalogues,
      pendingBuyers,
      newProducts,
    },
    recentOrders: recentOrders.map(serializeOrder),
  });
});

router.get('/users', async (_req, res) => {
  const users = await User.find({ role: { $in: ['buyer', 'sales'] } }).sort({ createdAt: -1 });
  return sendSuccess(res, users.map(serializeUser));
});

router.put('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return sendError(res, 'User not found', 404);

  const allowed = [
    'name',
    'email',
    'mobile',
    'address',
    'city',
    'state',
    'country',
    'pinCode',
    'companyName',
    'gstNumber',
    'status',
  ];

  for (const field of allowed) {
    if (field in req.body) {
      user[field] = req.body[field];
    }
  }

  // Role: only buyer <-> sales can be toggled here (never promote to admin via this route).
  if ('role' in req.body && ['buyer', 'sales'].includes(req.body.role)) {
    user.role = req.body.role;
  }

  // Catalogue access: which categories/collections a buyer may view.
  if (req.body.catalogAccess && typeof req.body.catalogAccess === 'object') {
    const { mode, categories, collections } = req.body.catalogAccess;
    if (mode === 'all' || mode === 'restricted') {
      user.catalogAccess.mode = mode;
    }
    if (Array.isArray(categories)) {
      user.catalogAccess.categories = categories.filter((id) => isObjectId(id)).map((id) => toObjectId(id, 'category'));
    }
    if (Array.isArray(collections)) {
      user.catalogAccess.collections = collections.filter((id) => isObjectId(id)).map((id) => toObjectId(id, 'collection'));
    }
  }

  await user.save();
  return sendSuccess(res, serializeUser(user), 'User updated');
});

router.get('/products', async (req, res) => {
  const query = {};
  const search = String(req.query.search || '').trim();

  if (search) {
    query.$or = [
      { styleCode: { $regex: escapeRegex(search), $options: 'i' } },
      { name: { $regex: escapeRegex(search), $options: 'i' } },
      { sku: { $regex: escapeRegex(search), $options: 'i' } },
    ];
  }

  if (req.query.categoryId && isObjectId(req.query.categoryId)) {
    query.category = req.query.categoryId;
  }

  if (req.query.collectionId && isObjectId(req.query.collectionId)) {
    query.collection = req.query.collectionId;
  }

  const products = await Product.find(query)
    .sort({ updatedAt: -1 })
    .populate(productPopulate);

  return sendSuccess(res, products.map(serializeProduct));
});

router.get('/products/search', async (req, res) => {
  const search = String(req.query.query || '').trim();
  const query = search
    ? {
        $or: [
          { styleCode: { $regex: escapeRegex(search), $options: 'i' } },
          { name: { $regex: escapeRegex(search), $options: 'i' } },
        ],
      }
    : {};

  if (req.query.categoryId && isObjectId(req.query.categoryId)) {
    query.category = req.query.categoryId;
  }

  if (req.query.collectionId && isObjectId(req.query.collectionId)) {
    query.collection = req.query.collectionId;
  }

  const products = await Product.find(query)
    .limit(20)
    .sort({ updatedAt: -1 })
    .populate(productPopulate);

  return sendSuccess(res, products.map(serializeProduct));
});

router.post('/products', async (req, res) => {
  try {
    const payload = sanitizeProductPayload(req.body);
    const product = await Product.create(payload);
    await product.populate(productPopulate);
    return sendSuccess(res, serializeProduct(product), 'Product created');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
});

router.put('/products/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return sendError(res, 'Product not found', 404);

  try {
    Object.assign(product, sanitizeProductPayload(req.body, product));
    await product.save();
    await product.populate(productPopulate);
    return sendSuccess(res, serializeProduct(product), 'Product updated');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
});

router.post('/products/bulk-import', async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) {
      return sendError(res, 'Spreadsheet rows are required for bulk import', 400);
    }

    // Taxonomy now comes from the sheet itself, one value per row, so the caller no
    // longer supplies a single category/collection for the whole upload.
    const { payloads, errors } = buildBulkImportPayloads(rows, {
      cloudinaryBaseUrl: req.body.cloudinaryBaseUrl,
      stockType: req.body.stockType,
      stockQuantity: req.body.stockQuantity,
      status: req.body.status,
      isNewArrival: req.body.isNewArrival,
      isBestSeller: req.body.isBestSeller,
    });


    const taxonomy = createTaxonomyResolver();
    const results = [];

    // Taxonomy resolution stays sequential: the resolver's in-process cache is what
    // stops two rows from creating the same category twice, and it only holds if the
    // lookups don't overlap.
    const resolvedPayloads = [];
    for (const payload of payloads) {
      try {
        const categoryId = await taxonomy.category(payload.rawCategory);
        const subCategoryId = await taxonomy.subCategory(payload.rawSubCategory, categoryId);
        const collectionId = await taxonomy.collection(
          payload.rawCollection,
          categoryId,
          subCategoryId,
        );
        // Register every colour the style ships in, so metal-colour filters see all
        // of them; the first one becomes the product's default metalColor.
        const metalColorIds = [];
        for (const variant of payload.colorVariants) {
          metalColorIds.push(await taxonomy.metalColor(variant.color));
        }

        resolvedPayloads.push({
          ...payload,
          categoryId,
          subCategoryId,
          collectionId,
          metalColorId: metalColorIds[0],
        });
      } catch (error) {
        // One bad style must not abort the remaining 40-odd in the sheet.
        errors.push({ styleCode: payload.styleCode, reason: error.message });
      }
    }

    if (!resolvedPayloads.length) {
      return sendError(
        res,
        `No importable rows found${errors.length ? `: ${errors[0].reason}` : '. Check that the sheet has Style No, Category, Colour, View, File Name and all six weight columns.'}`,
        400,
      );
    }

    // One lookup for the whole sheet, rather than a findOne per style.
    const existing = await Product.find({
      styleCode: { $in: resolvedPayloads.map((item) => item.styleCode) },
    });
    const existingByStyleCode = new Map(existing.map((doc) => [doc.styleCode, doc]));

    // Each payload is already grouped by style code, so no two writes touch the same
    // document and they can safely go out in parallel.
    const written = new Array(resolvedPayloads.length);
    await mapWithConcurrency(resolvedPayloads, IMPORT_WRITE_CONCURRENCY, async (resolved, index) => {
      try {
        const current = existingByStyleCode.get(resolved.styleCode);

        if (current) {
          Object.assign(current, sanitizeProductPayload(resolved, current));
          await current.save();
          written[index] = { action: 'updated', product: current };
        } else {
          written[index] = {
            action: 'created',
            product: await Product.create(sanitizeProductPayload(resolved)),
          };
        }
      } catch (error) {
        errors.push({ styleCode: resolved.styleCode, reason: error.message });
      }
    });

    // Populating the batch in one pass costs four queries in total instead of four
    // per style.
    const imported = written.filter(Boolean);
    await Product.populate(imported.map((item) => item.product), productPopulate);
    results.push(
      ...imported.map((item) => ({
        action: item.action,
        product: serializeProduct(item.product),
      })),
    );

    return sendSuccess(
      res,
      {
        summary: {
          totalRows: rows.length,
          totalProducts: results.length,
          created: results.filter((item) => item.action === 'created').length,
          updated: results.filter((item) => item.action === 'updated').length,
          skippedRows: errors.length,
          createdTaxonomy: taxonomy.created,
        },
        errors,
        results,
      },
      errors.length
        ? `Bulk import completed with ${errors.length} skipped row(s)`
        : 'Bulk import completed',
    );
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
});

router.delete('/products/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return sendError(res, 'Product not found', 404);

  await product.deleteOne();
  return sendSuccess(res, null, 'Product deleted');
});

router.get('/categories', async (_req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  return sendSuccess(res, categories.map(serializeTaxonomy));
});

router.post('/categories', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return sendError(res, 'Category name is required', 400);

  const category = await Category.create({
    name,
    slug: slugify(req.body.slug || name),
    image: normalizeAsset(req.body.image),
    active: parseBoolean(req.body.active, true),
  });

  return sendSuccess(res, serializeTaxonomy(category), 'Category created');
});

router.put('/categories/:id', async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return sendError(res, 'Category not found', 404);

  category.name = req.body.name ?? category.name;
  category.slug = slugify(req.body.slug || req.body.name || category.slug);
  if (req.body.image !== undefined) category.image = normalizeAsset(req.body.image);
  if (req.body.active !== undefined) category.active = parseBoolean(req.body.active, category.active);
  await category.save();

  return sendSuccess(res, serializeTaxonomy(category), 'Category updated');
});

router.delete('/categories/:id', async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return sendError(res, 'Category not found', 404);
  await category.deleteOne();
  return sendSuccess(res, null, 'Category deleted');
});

router.get('/subcategories', async (req, res) => {
  const query = req.query.categoryId && isObjectId(req.query.categoryId)
    ? { category: req.query.categoryId }
    : {};
  const subCategories = await SubCategory.find(query).sort({ name: 1 }).populate('category');
  return sendSuccess(
    res,
    subCategories.map((item) => ({
      ...serializeTaxonomy(item),
      categoryId: String(item.category?._id || item.category),
      categoryName: item.category?.name || '',
    })),
  );
});

router.post('/subcategories', async (req, res) => {
  try {
    const subCategory = await SubCategory.create({
      name: String(req.body.name || '').trim(),
      slug: slugify(req.body.slug || req.body.name || ''),
      category: toObjectId(req.body.categoryId, 'categoryId'),
      image: normalizeAsset(req.body.image),
      active: parseBoolean(req.body.active, true),
    });
    await subCategory.populate('category');
    return sendSuccess(
      res,
      {
        ...serializeTaxonomy(subCategory),
        categoryId: String(subCategory.category?._id || subCategory.category),
        categoryName: subCategory.category?.name || '',
      },
      'Sub-category created',
    );
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
});

router.put('/subcategories/:id', async (req, res) => {
  const subCategory = await SubCategory.findById(req.params.id);
  if (!subCategory) return sendError(res, 'Sub-category not found', 404);

  try {
    if (req.body.name !== undefined) subCategory.name = req.body.name;
    if (req.body.slug !== undefined || req.body.name !== undefined) {
      subCategory.slug = slugify(req.body.slug || req.body.name || subCategory.slug);
    }
    if (req.body.categoryId) subCategory.category = toObjectId(req.body.categoryId, 'categoryId');
    if (req.body.image !== undefined) subCategory.image = normalizeAsset(req.body.image);
    if (req.body.active !== undefined) {
      subCategory.active = parseBoolean(req.body.active, subCategory.active);
    }
    await subCategory.save();
    await subCategory.populate('category');
    return sendSuccess(
      res,
      {
        ...serializeTaxonomy(subCategory),
        categoryId: String(subCategory.category?._id || subCategory.category),
        categoryName: subCategory.category?.name || '',
      },
      'Sub-category updated',
    );
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
});

router.delete('/subcategories/:id', async (req, res) => {
  const subCategory = await SubCategory.findById(req.params.id);
  if (!subCategory) return sendError(res, 'Sub-category not found', 404);
  await subCategory.deleteOne();
  return sendSuccess(res, null, 'Sub-category deleted');
});

router.get('/collections', async (req, res) => {
  const query = {};
  if (req.query.categoryId && isObjectId(req.query.categoryId)) {
    query.category = req.query.categoryId;
  }
  if (req.query.subCategoryId && isObjectId(req.query.subCategoryId)) {
    query.subCategory = req.query.subCategoryId;
  }

  const collections = await Collection.find(query)
    .sort({ name: 1 })
    .populate(['category', 'subCategory']);

  return sendSuccess(
    res,
    collections.map((item) => ({
      ...serializeTaxonomy(item),
      categoryId: String(item.category?._id || item.category),
      categoryName: item.category?.name || '',
      subCategoryId: item.subCategory ? String(item.subCategory._id || item.subCategory) : '',
      subCategoryName: item.subCategory?.name || '',
    })),
  );
});

router.post('/collections', async (req, res) => {
  try {
    const collection = await Collection.create({
      name: String(req.body.name || '').trim(),
      slug: slugify(req.body.slug || req.body.name || ''),
      category: toObjectId(req.body.categoryId, 'categoryId'),
      subCategory: toObjectId(req.body.subCategoryId, 'subCategoryId'),
      image: normalizeAsset(req.body.image),
      active: parseBoolean(req.body.active, true),
    });
    await collection.populate(['category', 'subCategory']);
    return sendSuccess(
      res,
      {
        ...serializeTaxonomy(collection),
        categoryId: String(collection.category?._id || collection.category),
        categoryName: collection.category?.name || '',
        subCategoryId: String(collection.subCategory?._id || collection.subCategory),
        subCategoryName: collection.subCategory?.name || '',
      },
      'Collection created',
    );
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
});

router.put('/collections/:id', async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) return sendError(res, 'Collection not found', 404);

  try {
    if (req.body.name !== undefined) collection.name = req.body.name;
    if (req.body.slug !== undefined || req.body.name !== undefined) {
      collection.slug = slugify(req.body.slug || req.body.name || collection.slug);
    }
    if (req.body.categoryId) collection.category = toObjectId(req.body.categoryId, 'categoryId');
    if (req.body.subCategoryId) {
      collection.subCategory = toObjectId(req.body.subCategoryId, 'subCategoryId');
    }
    if (req.body.image !== undefined) collection.image = normalizeAsset(req.body.image);
    if (req.body.active !== undefined) {
      collection.active = parseBoolean(req.body.active, collection.active);
    }
    await collection.save();
    await collection.populate(['category', 'subCategory']);
    return sendSuccess(
      res,
      {
        ...serializeTaxonomy(collection),
        categoryId: String(collection.category?._id || collection.category),
        categoryName: collection.category?.name || '',
        subCategoryId: String(collection.subCategory?._id || collection.subCategory),
        subCategoryName: collection.subCategory?.name || '',
      },
      'Collection updated',
    );
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
});

router.delete('/collections/:id', async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) return sendError(res, 'Collection not found', 404);
  await collection.deleteOne();
  return sendSuccess(res, null, 'Collection deleted');
});

router.get('/metal-options', async (_req, res) => {
  const metalOptions = await MetalOption.find().sort({ name: 1 });
  return sendSuccess(res, metalOptions.map(serializeMetalOption));
});

router.post('/metal-options', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return sendError(res, 'Metal option name is required', 400);

  const option = await MetalOption.create({
    name,
    group: req.body.group || 'Metal Color',
    swatch: normalizeAsset(req.body.swatch),
    active: parseBoolean(req.body.active, true),
  });

  return sendSuccess(res, serializeMetalOption(option), 'Metal option created');
});

router.put('/metal-options/:id', async (req, res) => {
  const option = await MetalOption.findById(req.params.id);
  if (!option) return sendError(res, 'Metal option not found', 404);

  if (req.body.name !== undefined) option.name = req.body.name;
  if (req.body.group !== undefined) option.group = req.body.group;
  if (req.body.swatch !== undefined) option.swatch = normalizeAsset(req.body.swatch);
  if (req.body.active !== undefined) option.active = parseBoolean(req.body.active, option.active);
  await option.save();

  return sendSuccess(res, serializeMetalOption(option), 'Metal option updated');
});

router.delete('/metal-options/:id', async (req, res) => {
  const option = await MetalOption.findById(req.params.id);
  if (!option) return sendError(res, 'Metal option not found', 404);
  await option.deleteOne();
  return sendSuccess(res, null, 'Metal option deleted');
});

router.get('/orders', async (_req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).populate(orderPopulate);
  return sendSuccess(res, orders.map(serializeOrder));
});

router.get('/orders/:id', async (req, res) => {
  const query = isObjectId(req.params.id)
    ? { $or: [{ _id: req.params.id }, { orderId: req.params.id }] }
    : { orderId: req.params.id };
  const order = await Order.findOne(query).populate(orderPopulate);

  if (!order) return sendError(res, 'Order not found', 404);
  return sendSuccess(res, serializeOrder(order));
});

router.patch('/orders/:id/change-requests/:requestId', async (req, res) => {
  const query = isObjectId(req.params.id)
    ? { $or: [{ _id: req.params.id }, { orderId: req.params.id }] }
    : { orderId: req.params.id };
  const order = await Order.findOne(query);
  if (!order) return sendError(res, 'Order not found', 404);

  const status = String(req.body.status || 'Resolved');

  let changeRequest = null;
  for (const item of order.items) {
    const found = item.changeRequests?.id(req.params.requestId);
    if (found) {
      changeRequest = found;
      break;
    }
  }

  if (!changeRequest) return sendError(res, 'Change request not found', 404);

  changeRequest.status = status;
  changeRequest.resolvedAt = status === 'Resolved' ? new Date() : null;

  await order.save();
  await order.populate(orderPopulate);
  return sendSuccess(res, serializeOrder(order), 'Change request updated');
});

router.put('/orders/:id', async (req, res) => {
  const query = isObjectId(req.params.id)
    ? { $or: [{ _id: req.params.id }, { orderId: req.params.id }] }
    : { orderId: req.params.id };
  const order = await Order.findOne(query);
  if (!order) return sendError(res, 'Order not found', 404);

  const previousStatus = order.status;
  const nextStatus = req.body.status ?? order.status;

  const notifyCustomerViaWhatsapp = parseBoolean(req.body.notifyCustomerViaWhatsapp, false);
  const notifyCustomerViaEmail = parseBoolean(req.body.notifyCustomerViaEmail, false);
  const notifyCustomerMessage =
    typeof req.body.notifyCustomerMessage === 'string' ? req.body.notifyCustomerMessage : '';

  if (req.body.shippingAddress !== undefined) order.shippingAddress = req.body.shippingAddress;
  if (req.body.notes !== undefined) order.notes = req.body.notes;
  if (req.body.paymentMethod !== undefined) order.paymentMethod = req.body.paymentMethod;
  if (req.body.status !== undefined) order.status = req.body.status;

  if (Array.isArray(req.body.items)) {
    if (order.stockDeducted) {
      await restoreStockForOrder(order);
    }

    order.items = req.body.items
      .filter((item) => item.productId && isObjectId(item.productId))
      .map((item) => ({
        product: new mongoose.Types.ObjectId(item.productId),
        quantity: Number(item.quantity || 1),
        customization: item.customization || {},
      }));
  }

  if (nextStatus !== previousStatus || req.body.statusNote) {
    order.statusHistory.push({
      status: nextStatus,
      note: req.body.statusNote || `Status updated from ${previousStatus} to ${nextStatus}`,
      changedAt: new Date(),
      changedBy: req.user._id,
    });
  }

  try {
    if (!order.stockDeducted && ACTIVE_STOCK_STATUSES.has(nextStatus)) {
      await deductStockForOrder(order);
    }

    if (order.stockDeducted && ['Cancelled', 'Rejected', 'Pending'].includes(nextStatus)) {
      await restoreStockForOrder(order);
    }

    await order.save();
    await order.populate(orderPopulate);

    if (nextStatus !== previousStatus) {
      if (notifyCustomerViaWhatsapp) {
        setImmediate(() => {
          notifyWhatsappOrderStatus(order, {
            previousStatus,
            nextStatus,
            customNote: notifyCustomerMessage.trim(),
          }).catch((e) => console.error('[whatsapp] status notify failed', e.message));
        });
      }
      if (notifyCustomerViaEmail) {
        setImmediate(() => {
          notifyEmailOrderStatus(order, {
            previousStatus,
            nextStatus,
            customNote: notifyCustomerMessage.trim(),
          }).catch((e) => console.error('[email] status notify failed', e.message));
        });
      }
    }

    return sendSuccess(res, serializeOrder(order), 'Order updated');
  } catch (error) {
    return sendError(res, error.message, 409);
  }
});

router.get('/catalogues', async (req, res) => {
  const search = String(req.query.search || '').trim();
  const query = search
    ? {
        name: { $regex: escapeRegex(search), $options: 'i' },
      }
    : {};

  const catalogues = await Catalogue.find(query)
    .sort({ createdAt: -1 })
    .populate([
      { path: 'assignedUsers' },
      { path: 'products', populate: productPopulate },
    ]);

  return sendSuccess(res, catalogues.map(serializeCatalogue));
});

router.post('/catalogues', async (req, res) => {
  try {
    const catalogue = await Catalogue.create(sanitizeCataloguePayload(req.body));
    await catalogue.populate([
      { path: 'assignedUsers' },
      { path: 'products', populate: productPopulate },
    ]);
    return sendSuccess(res, serializeCatalogue(catalogue), 'Catalogue created');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
});

router.put('/catalogues/:id', async (req, res) => {
  const catalogue = await Catalogue.findById(req.params.id);
  if (!catalogue) return sendError(res, 'Catalogue not found', 404);

  try {
    Object.assign(catalogue, sanitizeCataloguePayload(req.body, catalogue));
    await catalogue.save();
    await catalogue.populate([
      { path: 'assignedUsers' },
      { path: 'products', populate: productPopulate },
    ]);
    return sendSuccess(res, serializeCatalogue(catalogue), 'Catalogue updated');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
});

router.delete('/catalogues/:id', async (req, res) => {
  const catalogue = await Catalogue.findById(req.params.id);
  if (!catalogue) return sendError(res, 'Catalogue not found', 404);
  await catalogue.deleteOne();
  return sendSuccess(res, null, 'Catalogue deleted');
});

router.get('/promotions', async (_req, res) => {
  return sendSuccess(res, await serializePromotionsPayload());
});

router.post('/promotions/banners', async (req, res) => {
  const banner = await Banner.create({
    title: req.body.title || '',
    subtitle: req.body.subtitle || '',
    ctaLabel: req.body.ctaLabel || '',
    ctaLink: req.body.ctaLink || '',
    image: normalizeAsset(req.body.image),
    active: parseBoolean(req.body.active, true),
    sortOrder:
      (await Banner.countDocuments()) + 1,
  });

  return sendSuccess(
    res,
    {
      id: String(banner._id),
      title: banner.title,
      subtitle: banner.subtitle,
      ctaLabel: banner.ctaLabel,
      ctaLink: banner.ctaLink,
      image: normalizeAsset(banner.image),
      active: banner.active,
      sortOrder: banner.sortOrder,
    },
    'Banner created',
  );
});

router.put('/promotions/banners/:id', async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) return sendError(res, 'Banner not found', 404);

  banner.title = req.body.title ?? banner.title;
  banner.subtitle = req.body.subtitle ?? banner.subtitle;
  banner.ctaLabel = req.body.ctaLabel ?? banner.ctaLabel;
  banner.ctaLink = req.body.ctaLink ?? banner.ctaLink;
  if (req.body.image !== undefined) banner.image = normalizeAsset(req.body.image);
  if (req.body.active !== undefined) banner.active = parseBoolean(req.body.active, banner.active);
  await banner.save();

  return sendSuccess(
    res,
    {
      id: String(banner._id),
      title: banner.title,
      subtitle: banner.subtitle,
      ctaLabel: banner.ctaLabel,
      ctaLink: banner.ctaLink,
      image: normalizeAsset(banner.image),
      active: banner.active,
      sortOrder: banner.sortOrder,
    },
    'Banner updated',
  );
});

router.delete('/promotions/banners/:id', async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) return sendError(res, 'Banner not found', 404);
  await banner.deleteOne();
  return sendSuccess(res, null, 'Banner deleted');
});

router.put('/promotions/banners-order', async (req, res) => {
  const order = Array.isArray(req.body.order) ? req.body.order : null;
  if (!order) return sendError(res, 'order must be an array of banner ids', 400);

  await Promise.all(
    order.map((id, index) =>
      Banner.findByIdAndUpdate(id, { sortOrder: index + 1 }),
    ),
  );

  return sendSuccess(res, { bannersOrder: order }, 'Banner order updated');
});

router.post('/promotions/popup-ads', async (req, res) => {
  const popup = await PopupAd.create({
    image: normalizeAsset(req.body.image),
    frequency: req.body.frequency || 'once_per_session',
    startDate: req.body.startDate || null,
    endDate: req.body.endDate || null,
    active: parseBoolean(req.body.active, true),
  });

  return sendSuccess(
    res,
    {
      id: String(popup._id),
      image: normalizeAsset(popup.image),
      frequency: popup.frequency,
      startDate: popup.startDate,
      endDate: popup.endDate,
      active: popup.active,
    },
    'Popup ad created',
  );
});

router.put('/promotions/popup-ads/:id', async (req, res) => {
  const popup = await PopupAd.findById(req.params.id);
  if (!popup) return sendError(res, 'Popup ad not found', 404);

  if (req.body.image !== undefined) popup.image = normalizeAsset(req.body.image);
  if (req.body.frequency !== undefined) popup.frequency = req.body.frequency;
  if (req.body.startDate !== undefined) popup.startDate = req.body.startDate || null;
  if (req.body.endDate !== undefined) popup.endDate = req.body.endDate || null;
  if (req.body.active !== undefined) popup.active = parseBoolean(req.body.active, popup.active);
  await popup.save();

  return sendSuccess(
    res,
    {
      id: String(popup._id),
      image: normalizeAsset(popup.image),
      frequency: popup.frequency,
      startDate: popup.startDate,
      endDate: popup.endDate,
      active: popup.active,
    },
    'Popup ad updated',
  );
});

router.delete('/promotions/popup-ads/:id', async (req, res) => {
  const popup = await PopupAd.findById(req.params.id);
  if (!popup) return sendError(res, 'Popup ad not found', 404);
  await popup.deleteOne();
  return sendSuccess(res, null, 'Popup ad deleted');
});

router.post('/events', async (req, res) => {
  const event = await Event.create({
    title: req.body.title || '',
    date: req.body.date,
    description: req.body.description || '',
    image: normalizeAsset(req.body.image),
    active: parseBoolean(req.body.active, true),
  });

  return sendSuccess(
    res,
    {
      id: String(event._id),
      title: event.title,
      date: event.date,
      description: event.description,
      image: normalizeAsset(event.image),
      active: event.active,
    },
    'Event created',
  );
});

router.put('/events/:id', async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return sendError(res, 'Event not found', 404);

  event.title = req.body.title ?? event.title;
  event.date = req.body.date ?? event.date;
  event.description = req.body.description ?? event.description;
  if (req.body.image !== undefined) event.image = normalizeAsset(req.body.image);
  if (req.body.active !== undefined) event.active = parseBoolean(req.body.active, event.active);
  await event.save();

  return sendSuccess(
    res,
    {
      id: String(event._id),
      title: event.title,
      date: event.date,
      description: event.description,
      image: normalizeAsset(event.image),
      active: event.active,
    },
    'Event updated',
  );
});

router.delete('/events/:id', async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return sendError(res, 'Event not found', 404);
  await event.deleteOne();
  return sendSuccess(res, null, 'Event deleted');
});

router.get('/config', async (_req, res) => {
  const [siteSettings, categories, subCategories, collections, metalOptions, trustedBrands, occasionValues] =
    await Promise.all([
      SiteSettings.findOne().sort({ createdAt: -1 }),
      Category.find().sort({ name: 1 }),
      SubCategory.find().sort({ name: 1 }).populate('category'),
      Collection.find().sort({ name: 1 }).populate(['category', 'subCategory']),
      MetalOption.find().sort({ name: 1 }),
      TrustedBrand.find().sort({ sortOrder: 1, createdAt: 1 }),
      Product.distinct('occasions'),
    ]);

  // Free-text occasions off the Excel import: drop blanks, de-dupe case-insensitively.
  const occasions = [
    ...new Map(
      (occasionValues || [])
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
        .map((name) => [name.toLowerCase(), name]),
    ).values(),
  ].sort((a, b) => a.localeCompare(b));

  return sendSuccess(res, {
    siteSettings: siteSettings ? sanitizeSiteSettings(siteSettings, siteSettings) : sanitizeSiteSettings({}),
    categories: categories.map(serializeTaxonomy),
    subCategories: subCategories.map((item) => ({
      ...serializeTaxonomy(item),
      categoryId: String(item.category?._id || item.category),
      categoryName: item.category?.name || '',
    })),
    collections: collections.map((item) => ({
      ...serializeTaxonomy(item),
      categoryId: String(item.category?._id || item.category),
      categoryName: item.category?.name || '',
      subCategoryId: item.subCategory ? String(item.subCategory._id || item.subCategory) : '',
      subCategoryName: item.subCategory?.name || '',
    })),
    metalOptions: metalOptions.map(serializeMetalOption),
    trustedBrands: trustedBrands.map(serializeTrustedBrand),
    occasions,
  });
});

router.put('/config', async (req, res) => {
  let siteSettings = await SiteSettings.findOne().sort({ createdAt: -1 });
  if (!siteSettings) {
    siteSettings = await SiteSettings.create(sanitizeSiteSettings(req.body.siteSettings || {}));
  } else if (req.body.siteSettings) {
    Object.assign(siteSettings, sanitizeSiteSettings(req.body.siteSettings, siteSettings));
    await siteSettings.save();
  }

  // Guest catalogue / access rules changed — drop the cached copy the public
  // routes read so visitors see the update without waiting for the TTL.
  invalidateGuestCatalogueCache();

  return sendSuccess(
    res,
    {
      siteSettings: sanitizeSiteSettings(siteSettings, siteSettings),
    },
    'Configuration updated',
  );
});

router.get('/trusted-brands', async (_req, res) => {
  const trustedBrands = await TrustedBrand.find().sort({ sortOrder: 1, createdAt: 1 });
  return sendSuccess(res, trustedBrands.map(serializeTrustedBrand));
});

router.post('/trusted-brands', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return sendError(res, 'Brand name is required', 400);

  const trustedBrand = await TrustedBrand.create({
    name,
    sector: String(req.body.sector || '').trim(),
    websiteUrl: String(req.body.websiteUrl || '').trim(),
    logo: normalizeAsset(req.body.logo),
    active: parseBoolean(req.body.active, true),
    sortOrder: Number(req.body.sortOrder || 0),
  });

  return sendSuccess(res, serializeTrustedBrand(trustedBrand), 'Brand created');
});

router.put('/trusted-brands/:id', async (req, res) => {
  const trustedBrand = await TrustedBrand.findById(req.params.id);
  if (!trustedBrand) return sendError(res, 'Brand not found', 404);

  if (req.body.name !== undefined) trustedBrand.name = req.body.name;
  if (req.body.sector !== undefined) trustedBrand.sector = req.body.sector;
  if (req.body.websiteUrl !== undefined) trustedBrand.websiteUrl = req.body.websiteUrl;
  if (req.body.logo !== undefined) trustedBrand.logo = normalizeAsset(req.body.logo);
  if (req.body.active !== undefined) trustedBrand.active = parseBoolean(req.body.active, trustedBrand.active);
  if (req.body.sortOrder !== undefined) trustedBrand.sortOrder = Number(req.body.sortOrder);

  await trustedBrand.save();
  return sendSuccess(res, serializeTrustedBrand(trustedBrand), 'Brand updated');
});

router.delete('/trusted-brands/:id', async (req, res) => {
  const trustedBrand = await TrustedBrand.findById(req.params.id);
  if (!trustedBrand) return sendError(res, 'Brand not found', 404);

  await trustedBrand.deleteOne();
  return sendSuccess(res, null, 'Brand deleted');
});

router.get('/testimonials', async (_req, res) => {
  const testimonials = await Testimonial.find().sort({ createdAt: -1 });
  return sendSuccess(
    res,
    testimonials.map((item) => ({
      id: String(item._id),
      name: item.name,
      company: item.company,
      rating: item.rating,
      status: item.status,
      review: item.review,
      avatar: normalizeAsset(item.avatar),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  );
});

router.post('/testimonials', async (req, res) => {
  const testimonial = await Testimonial.create({
    name: req.body.name || '',
    company: req.body.company || '',
    rating: Number(req.body.rating || 5),
    status: req.body.status || 'Pending',
    review: req.body.review || '',
    avatar: normalizeAsset(req.body.avatar),
  });

  return sendSuccess(
    res,
    {
      id: String(testimonial._id),
      name: testimonial.name,
      company: testimonial.company,
      rating: testimonial.rating,
      status: testimonial.status,
      review: testimonial.review,
      avatar: normalizeAsset(testimonial.avatar),
    },
    'Testimonial created',
  );
});

router.put('/testimonials/:id', async (req, res) => {
  const testimonial = await Testimonial.findById(req.params.id);
  if (!testimonial) return sendError(res, 'Testimonial not found', 404);

  testimonial.name = req.body.name ?? testimonial.name;
  testimonial.company = req.body.company ?? testimonial.company;
  testimonial.rating = Number(req.body.rating ?? testimonial.rating);
  testimonial.status = req.body.status ?? testimonial.status;
  testimonial.review = req.body.review ?? testimonial.review;
  if (req.body.avatar !== undefined) testimonial.avatar = normalizeAsset(req.body.avatar);
  await testimonial.save();

  return sendSuccess(
    res,
    {
      id: String(testimonial._id),
      name: testimonial.name,
      company: testimonial.company,
      rating: testimonial.rating,
      status: testimonial.status,
      review: testimonial.review,
      avatar: normalizeAsset(testimonial.avatar),
    },
    'Testimonial updated',
  );
});

router.delete('/testimonials/:id', async (req, res) => {
  const testimonial = await Testimonial.findById(req.params.id);
  if (!testimonial) return sendError(res, 'Testimonial not found', 404);
  await testimonial.deleteOne();
  return sendSuccess(res, null, 'Testimonial deleted');
});

router.get('/roles', (_req, res) => sendSuccess(res, seedData.roles));

router.get('/reports/:type', async (req, res) => {
  const { type } = req.params;

  if (type === 'product-wise') {
    const products = await Product.find().sort({ orderCount: -1 }).populate(productPopulate);
    return sendSuccess(
      res,
      products.map((product) => ({
        styleCode: product.styleCode,
        product: product.name,
        category: product.category?.name || '',
        views: product.views,
        cartAdds: product.cartAdds,
        orders: product.orderCount,
      })),
    );
  }

  if (type === 'category-wise') {
    const products = await Product.find().populate('category');
    const grouped = new Map();

    for (const product of products) {
      const name = product.category?.name || 'Uncategorized';
      if (!grouped.has(name)) {
        grouped.set(name, { category: name, views: 0, cartAdds: 0, orders: 0 });
      }

      const bucket = grouped.get(name);
      bucket.views += product.views || 0;
      bucket.cartAdds += product.cartAdds || 0;
      bucket.orders += product.orderCount || 0;
    }

    return sendSuccess(res, Array.from(grouped.values()));
  }

  if (type === 'login-log') {
    return sendSuccess(res, seedData.reports.loginLog);
  }

  if (type === 'user-orders') {
    const buyers = await User.find({ role: 'buyer' });
    const orders = await Order.find();
    return sendSuccess(
      res,
      buyers.map((buyer) => ({
        user: buyer.name,
        company: buyer.companyName,
        orders: orders.filter((order) => String(order.user) === String(buyer._id)).length,
      })),
    );
  }

  return sendError(res, 'Unknown report type', 404);
});

router.post('/uploads/sign', async (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = req.body.folder || 'dearte/uploads';
  const paramsToSign = {
    timestamp,
    folder,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET,
  );

  return sendSuccess(res, {
    timestamp,
    signature,
    folder,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  });
});

router.delete('/uploads/:publicId', async (req, res) => {
  const publicId = decodeURIComponent(req.params.publicId);
  await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'image' });
  return sendSuccess(res, null, 'Asset deleted');
});

export default router;
