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
  User,
} from '../models/index.js';
import { cloudinary } from '../config/cloudinary.js';
import { seedData } from '../data/seed.js';
import { normalizeAsset, normalizeAssetArray } from '../utils/assets.js';
import { sendError, sendSuccess } from '../utils/responses.js';
import {
  serializeCatalogue,
  serializeMetalOption,
  serializeOrder,
  serializeProduct,
  serializeTaxonomy,
  serializeUser,
} from '../utils/serializers.js';
import { slugify } from '../utils/slugify.js';

const router = express.Router();

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

function sanitizeProductPayload(body, currentProduct = null) {
  const mediaInput = body.media || body.images || currentProduct?.media || [];

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
    diamondQuality: body.diamondQuality ?? currentProduct?.diamondQuality ?? '',
    settingType: body.settingType ?? currentProduct?.settingType ?? '',
    occasion: body.occasion ?? currentProduct?.occasion ?? '',
    sku: body.sku ?? currentProduct?.sku ?? '',
    stockType: body.stockType ?? currentProduct?.stockType ?? 'Ready Stock',
    stockQuantity: Number(body.stockQuantity ?? currentProduct?.stockQuantity ?? 0),
    status: body.status ?? currentProduct?.status ?? 'Active',
    isNewArrival: parseBoolean(body.isNewArrival, currentProduct?.isNewArrival ?? false),
    isBestSeller: parseBoolean(body.isBestSeller, currentProduct?.isBestSeller ?? false),
    media: normalizeAssetArray(mediaInput),
    customizationOptions: body.customizationOptions || currentProduct?.customizationOptions,
    specifications: Array.isArray(body.specifications)
      ? body.specifications
      : currentProduct?.specifications || [],
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
  const users = await User.find({ role: 'buyer' }).sort({ createdAt: -1 });
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

  await user.save();
  return sendSuccess(res, serializeUser(user), 'User updated');
});

router.get('/products', async (req, res) => {
  const query = {};
  const search = String(req.query.search || '').trim();

  if (search) {
    query.$or = [
      { styleCode: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
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
          { styleCode: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
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
      subCategoryId: String(item.subCategory?._id || item.subCategory),
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

router.put('/orders/:id', async (req, res) => {
  const query = isObjectId(req.params.id)
    ? { $or: [{ _id: req.params.id }, { orderId: req.params.id }] }
    : { orderId: req.params.id };
  const order = await Order.findOne(query);
  if (!order) return sendError(res, 'Order not found', 404);

  const previousStatus = order.status;
  const nextStatus = req.body.status ?? order.status;

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
    return sendSuccess(res, serializeOrder(order), 'Order updated');
  } catch (error) {
    return sendError(res, error.message, 409);
  }
});

router.get('/catalogues', async (req, res) => {
  const search = String(req.query.search || '').trim();
  const query = search
    ? {
        name: { $regex: search, $options: 'i' },
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
  const [siteSettings, categories, subCategories, collections, metalOptions] = await Promise.all([
    SiteSettings.findOne().sort({ createdAt: -1 }),
    Category.find().sort({ name: 1 }),
    SubCategory.find().sort({ name: 1 }).populate('category'),
    Collection.find().sort({ name: 1 }).populate(['category', 'subCategory']),
    MetalOption.find().sort({ name: 1 }),
  ]);

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
      subCategoryId: String(item.subCategory?._id || item.subCategory),
      subCategoryName: item.subCategory?.name || '',
    })),
    metalOptions: metalOptions.map(serializeMetalOption),
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

  return sendSuccess(
    res,
    {
      siteSettings: sanitizeSiteSettings(siteSettings, siteSettings),
    },
    'Configuration updated',
  );
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
