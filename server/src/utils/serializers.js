import { normalizeAsset, normalizeAssetArray } from './assets.js';

const NINE_K_GROSS_RE = /^\s*(gross\s*wt|grosswt)\s*[\(\[]?\s*9\s*[kK][tT]?\s*[\)\]]?\s*$/i;
const NINE_K_NET_RE = /^\s*(net\s*wt|netwt)\s*[\(\[]?\s*9\s*[kK][tT]?\s*[\)\]]?\s*$/i;

function normalizeProductSpecifications(specs = []) {
  const normalized = specs.map((spec) => {
    // Read fields explicitly: `spec` may be a Mongoose subdocument, and spreading
    // it with `{ ...spec }` copies internal props instead of attribute/value,
    // which previously blanked out the 9K weights.
    const attribute = String(spec.attribute || '');
    const value = spec.value;
    if (NINE_K_GROSS_RE.test(attribute)) return { attribute: 'Gross Wt(9K)', value };
    if (NINE_K_NET_RE.test(attribute)) return { attribute: 'Net Wt(9K)', value };
    return { attribute, value };
  });

  const diamondIdx = normalized.findIndex((s) => s.attribute === 'Diamond Wt');
  if (diamondIdx !== -1 && diamondIdx !== normalized.length - 1) {
    const [diamondSpec] = normalized.splice(diamondIdx, 1);
    normalized.push(diamondSpec);
  }
  return normalized;
}

export function serializeTaxonomy(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    image: normalizeAsset(doc.image),
    active: doc.active,
  };
}

export function serializeMetalOption(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    name: doc.name,
    group: doc.group,
    swatch: normalizeAsset(doc.swatch),
    active: doc.active,
  };
}

export function serializeTrustedBrand(doc) {
  if (!doc) return null;

  return {
    id: String(doc._id),
    name: doc.name,
    sector: doc.sector,
    websiteUrl: doc.websiteUrl,
    logo: normalizeAsset(doc.logo),
    active: doc.active,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function serializeProduct(doc) {
  if (!doc) return null;
  const categoryName = doc.category?.name || doc.categoryName || '';
  const subCategoryName = doc.subCategory?.name || doc.subCategoryName || '';
  const collectionName = doc.collection?.name || doc.collectionName || '';
  const metalColorName = doc.metalColor?.name || doc.metalColorName || '';
  const colorVariants = (doc.colorVariants || []).map((variant) => ({
    color: variant.color,
    views: (variant.views || []).map((view) => ({
      view: view.view,
      asset: normalizeAsset(view.asset),
    })),
  }));
  const fallbackMedia = normalizeAssetArray(doc.media);
  const primaryVariantImages = colorVariants[0]?.views?.map((item) => item.asset).filter((item) => item.secureUrl) || [];
  const media = fallbackMedia.length ? fallbackMedia : primaryVariantImages;
  const goldColors = colorVariants.length
    ? colorVariants.map((variant) => variant.color).filter(Boolean)
    : doc.customizationOptions?.goldColors || [];

  return {
    id: String(doc._id),
    styleCode: doc.styleCode,
    name: doc.name,
    description: doc.description,
    category: categoryName,
    categoryId: doc.category?._id ? String(doc.category._id) : doc.category ? String(doc.category) : '',
    subCategory: subCategoryName,
    subCategoryId: doc.subCategory?._id ? String(doc.subCategory._id) : doc.subCategory ? String(doc.subCategory) : '',
    collection: collectionName,
    collectionId: doc.collection?._id ? String(doc.collection._id) : doc.collection ? String(doc.collection) : '',
    metalType: doc.metalType,
    metal: doc.metal,
    metalColor: metalColorName,
    metalColorId: doc.metalColor?._id ? String(doc.metalColor._id) : doc.metalColor ? String(doc.metalColor) : '',
    diamondWeight: doc.diamondWeight,
    goldWeight: doc.goldWeight,
    diamondQuality: doc.diamondQuality,
    settingType: doc.settingType,
    occasion: doc.occasion,
    sku: doc.sku,
    stockType: doc.stockType,
    stockQuantity: doc.stockQuantity,
    status: doc.status,
    isNewArrival: doc.isNewArrival,
    isBestSeller: doc.isBestSeller,
    showToGuests: doc.showToGuests,
    media,
    images: media.map((item) => item.secureUrl),
    colorVariants,
    customizationOptions: (() => {
      const base = doc.customizationOptions?.toObject?.() || doc.customizationOptions || {};
      const rawCarats = base.goldCarats || [];
      const normalizedSpecs = normalizeProductSpecifications(doc.specifications || []);
      // Pull every karat referenced by a weight spec (e.g. "Gold Wt (9K)") so the
      // carat selector matches what the specifications actually list.
      const caratsFromSpecs = [];
      normalizedSpecs.forEach((s) => {
        const match = String(s.attribute || '').match(/(\d+)\s*k\b/i);
        if (match) {
          const carat = `${match[1]}K`;
          if (!caratsFromSpecs.includes(carat)) caratsFromSpecs.push(carat);
        }
      });
      const ordered = ['9K', '14K', '18K'];
      const goldCaratsFinal = [...new Set([...rawCarats, ...caratsFromSpecs])].sort(
        (a, b) => ordered.indexOf(a) - ordered.indexOf(b),
      );
      return { ...base, goldColors, goldCarats: goldCaratsFinal.length ? goldCaratsFinal : rawCarats };
    })(),
    specifications: normalizeProductSpecifications(doc.specifications || []),
    views: doc.views,
    cartAdds: doc.cartAdds,
    orderCount: doc.orderCount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function serializeUser(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    mobile: doc.mobile,
    address: doc.address,
    city: doc.city,
    state: doc.state,
    country: doc.country,
    pinCode: doc.pinCode,
    companyName: doc.companyName,
    gstNumber: doc.gstNumber,
    role: doc.role,
    status: doc.status,
    registeredAt: doc.registeredAt,
    kycDocuments: doc.kycDocuments || [],
    catalogAccess: {
      mode: doc.catalogAccess?.mode || 'all',
      categories: (doc.catalogAccess?.categories || []).map((value) => String(value?._id || value)),
      collections: (doc.catalogAccess?.collections || []).map((value) => String(value?._id || value)),
    },
  };
}

export function serializeOrder(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    orderId: doc.orderId,
    user: serializeUser(doc.user),
    status: doc.status,
    statusHistory: (doc.statusHistory || []).map((entry) => ({
      status: entry.status,
      note: entry.note,
      changedAt: entry.changedAt,
      changedBy: entry.changedBy ? serializeUser(entry.changedBy) : null,
    })),
    paymentMethod: doc.paymentMethod,
    shippingAddress: doc.shippingAddress,
    notes: doc.notes,
    items: (doc.items || []).map((item) => ({
      id: String(item._id),
      quantity: item.quantity,
      customization: item.customization,
      product: serializeProduct(item.product),
      changeRequests: (item.changeRequests || []).map((cr) => ({
        id: String(cr._id),
        message: cr.message,
        status: cr.status,
        createdAt: cr.createdAt,
        resolvedAt: cr.resolvedAt,
      })),
    })),
    stockDeducted: doc.stockDeducted,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    date: doc.createdAt,
  };
}

export function serializeCatalogue(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    name: doc.name,
    description: doc.description,
    coverImage: normalizeAsset(doc.coverImage),
    products: (doc.products || []).map(serializeProduct),
    productIds: (doc.products || []).map((item) => String(item._id || item)),
    assignedUsers: (doc.assignedUsers || []).map(serializeUser),
    assignedUserIds: (doc.assignedUsers || []).map((item) => String(item._id || item)),
    active: doc.active,
    archived: doc.archived,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
