import { normalizeAsset, normalizeAssetArray } from './assets.js';

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

export function serializeProduct(doc) {
  if (!doc) return null;
  const categoryName = doc.category?.name || doc.categoryName || '';
  const subCategoryName = doc.subCategory?.name || doc.subCategoryName || '';
  const collectionName = doc.collection?.name || doc.collectionName || '';
  const metalColorName = doc.metalColor?.name || doc.metalColorName || '';

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
    media: normalizeAssetArray(doc.media),
    images: normalizeAssetArray(doc.media).map((item) => item.secureUrl),
    customizationOptions: doc.customizationOptions,
    specifications: doc.specifications || [],
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
