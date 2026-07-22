import crypto from 'crypto';
import express from 'express';
import {
  Catalogue,
  Order,
  Product,
  User,
} from '../models/index.js';
import { sendError, sendSuccess } from '../utils/responses.js';
import { serializeCatalogue, serializeOrder, serializeProduct, serializeUser } from '../utils/serializers.js';
import { notifyWhatsappOrderPlaced } from '../services/orderWhatsappNotifications.js';
import { notifyEmailOrderPlaced, notifyEmailOrderChangeRequest } from '../services/orderEmailNotifications.js';
import { defaultSizeFor, isValidSize, resolveSizeChart } from '../data/sizeMaster.js';
import { asString, isObjectId } from '../utils/validation.js';

const router = express.Router();

const productPopulate = [
  { path: 'category' },
  { path: 'subCategory' },
  { path: 'collection' },
  { path: 'metalColor' },
];

async function populateUserCommerceState(user) {
  await user.populate([
    { path: 'cart.items.product', populate: productPopulate },
    { path: 'wishlist.items.product', populate: productPopulate },
  ]);
  return user;
}

function ensureWishlist(user) {
  if (!user.wishlist) {
    user.wishlist = { collections: [], items: [] };
  }

  if (!Array.isArray(user.wishlist.collections) || !user.wishlist.collections.length) {
    user.wishlist.collections = [{ name: 'My Wishlist' }];
  }

  if (!Array.isArray(user.wishlist.items)) {
    user.wishlist.items = [];
  }
}

function serializeCart(user) {
  return {
    items: (user.cart?.items || []).map((item) => ({
      id: String(item._id),
      quantity: item.quantity,
      customization: item.customization,
      product: serializeProduct(item.product),
    })),
    specialInstructions: user.cart?.specialInstructions || '',
  };
}

function serializeWishlist(user) {
  ensureWishlist(user);

  return {
    collections: (user.wishlist.collections || []).map((collection) => ({
      id: String(collection._id),
      name: collection.name,
    })),
    items: (user.wishlist.items || []).map((item) => ({
      id: String(item._id),
      collectionId: String(item.collectionId),
      product: serializeProduct(item.product),
    })),
  };
}

async function getProductByClientId(productId) {
  // Guard the cast: a body value like `{"$ne": null}` would otherwise reach
  // Mongoose and throw, and a malformed id should read as "not found".
  const id = productId && typeof productId === 'object' && productId._id ? productId._id : productId;
  if (!isObjectId(String(id))) {
    return null;
  }

  const product = await Product.findById(String(id)).populate(productPopulate);
  return product;
}

/**
 * The size master is keyed off category names, so resolve against the
 * populated product rather than the raw ObjectId refs.
 */
function sizeContextFor(product) {
  return { category: product.category?.name || '', subCategory: product.subCategory?.name || '' };
}

/**
 * Two cart lines are the same line only when every customisation axis matches,
 * size included — that is what lets one style sit in the cart at two sizes.
 */
function isSameCartLine(item, productId, customization) {
  return (
    String(item.product?._id || item.product) === String(productId) &&
    item.customization?.goldColor === customization.goldColor &&
    item.customization?.goldCarat === customization.goldCarat &&
    item.customization?.diamondQuality === customization.diamondQuality &&
    (item.customization?.size || '') === (customization.size || '') &&
    (item.customization?.note || '') === (customization.note || '')
  );
}

function totalUnitsForProductInCart(user, productId, excludeItemId = null) {
  return (user.cart?.items || []).reduce((sum, item) => {
    if (String(item.product) !== String(productId) && String(item.product?._id) !== String(productId)) {
      return sum;
    }

    if (excludeItemId && String(item._id) === String(excludeItemId)) {
      return sum;
    }

    return sum + Number(item.quantity || 0);
  }, 0);
}

async function validateReadyStockOrThrow(orderLikeItems) {
  for (const line of orderLikeItems) {
    const product = await Product.findById(line.product);
    if (!product) {
      throw new Error('One or more products are unavailable.');
    }

    if (product.stockType === 'Ready Stock' && Number(line.quantity || 0) > Number(product.stockQuantity || 0)) {
      throw new Error(`Only ${product.stockQuantity} unit(s) available for ${product.styleCode}.`);
    }
  }
}

async function deductOrderStock(order) {
  if (order.stockDeducted) return;

  for (const line of order.items) {
    const product = await Product.findById(line.product);

    if (!product) {
      throw new Error('Unable to deduct stock because a product is missing.');
    }

    if (product.stockType === 'Ready Stock') {
      if (product.stockQuantity < line.quantity) {
        throw new Error(`Only ${product.stockQuantity} unit(s) available for ${product.styleCode}.`);
      }

      product.stockQuantity -= line.quantity;
      await product.save();
    }
  }

  order.stockDeducted = true;
}

router.get('/profile', async (req, res) => sendSuccess(res, serializeUser(req.user)));

router.put('/profile', async (req, res) => {
  // Field-by-field with explicit lengths. `role` and `status` are intentionally
  // absent: an allow-list is what keeps a buyer from promoting themselves.
  const allowed = {
    name: 120,
    mobile: 32,
    address: 500,
    city: 120,
    state: 120,
    country: 120,
    pinCode: 20,
    companyName: 200,
    gstNumber: 32,
  };

  for (const [key, maxLength] of Object.entries(allowed)) {
    if (key in req.body) {
      req.user[key] = asString(req.body[key], { maxLength });
    }
  }

  if (Array.isArray(req.body.kycDocuments)) {
    req.user.kycDocuments = req.body.kycDocuments
      .slice(0, 20)
      .map((entry) => asString(entry, { maxLength: 200 }))
      .filter(Boolean);
  }

  await req.user.save();
  return sendSuccess(res, serializeUser(req.user), 'Profile updated');
});

router.get('/cart', async (req, res) => {
  await populateUserCommerceState(req.user);
  return sendSuccess(res, serializeCart(req.user));
});

router.post('/cart/add', async (req, res) => {
  const { productId, quantity = 1, customization = {}, lines } = req.body;
  const product = await getProductByClientId(productId);

  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  const sizeContext = sizeContextFor(product);
  const chart = resolveSizeChart(sizeContext);

  // A sized style can be added at several sizes in one go. Everything else
  // funnels through the same path as a single anonymous line.
  const requestedLines = Array.isArray(lines) && lines.length
    ? lines
    : [{ size: customization.size, quantity }];

  const normalizedLines = [];
  for (const line of requestedLines) {
    const lineQty = Number(line.quantity || 1);
    if (!Number.isFinite(lineQty) || lineQty < 1) {
      return sendError(res, 'Quantity must be at least 1', 400);
    }

    const size = chart ? String(line.size || '') : '';
    if (chart && !size) {
      return sendError(res, `Please choose a ${chart.noun.toLowerCase()} before adding to cart.`, 400);
    }

    if (chart && !isValidSize(sizeContext, size)) {
      return sendError(res, `"${size}" is not a valid ${chart.noun.toLowerCase()} for this style.`, 400);
    }

    normalizedLines.push({ size, quantity: lineQty });
  }

  // Same size requested twice in one payload — fold it into a single line.
  const mergedLines = [];
  for (const line of normalizedLines) {
    const match = mergedLines.find((entry) => entry.size === line.size);
    if (match) {
      match.quantity += line.quantity;
    } else {
      mergedLines.push({ ...line });
    }
  }

  const addQty = mergedLines.reduce((sum, line) => sum + line.quantity, 0);
  const nextTotal = totalUnitsForProductInCart(req.user, productId) + addQty;
  if (product.stockType === 'Ready Stock' && nextTotal > product.stockQuantity) {
    return sendError(res, `Only ${product.stockQuantity} unit(s) available for this style.`, 409);
  }

  if (!req.user.cart) {
    req.user.cart = { items: [], specialInstructions: '' };
  }

  const baseCustomization = {
    goldColor: customization.goldColor || product.customizationOptions?.goldColors?.[0] || '',
    goldCarat: customization.goldCarat || product.customizationOptions?.goldCarats?.[0] || '',
    diamondQuality:
      customization.diamondQuality || product.customizationOptions?.diamondQualities?.[0] || '',
    note: asString(customization.note, { maxLength: 2000 }),
  };

  for (const line of mergedLines) {
    const lineCustomization = { ...baseCustomization, size: line.size };
    const existing = (req.user.cart.items || []).find((item) =>
      isSameCartLine(item, productId, lineCustomization),
    );

    if (existing) {
      existing.quantity += line.quantity;
    } else {
      req.user.cart.items.push({
        product: product._id,
        quantity: line.quantity,
        customization: lineCustomization,
      });
    }
  }

  product.cartAdds += addQty;
  await Promise.all([req.user.save(), product.save()]);
  await populateUserCommerceState(req.user);

  const message = mergedLines.length > 1
    ? `${mergedLines.length} sizes added to cart`
    : 'Item added to cart';

  return sendSuccess(res, serializeCart(req.user), message);
});

router.put('/cart/:itemId', async (req, res) => {
  const item = (req.user.cart?.items || []).id(req.params.itemId);
  if (!item) {
    return sendError(res, 'Cart item not found', 404);
  }

  const product = await getProductByClientId(item.product);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  if (req.body.quantity !== undefined) {
    const quantity = Number(req.body.quantity);
    if (quantity < 1) {
      return sendError(res, 'Quantity must be at least 1', 400);
    }

    if (product.stockType === 'Ready Stock') {
      const totalWithoutItem = totalUnitsForProductInCart(req.user, item.product, item._id);
      if (totalWithoutItem + quantity > product.stockQuantity) {
        return sendError(res, `Only ${product.stockQuantity} unit(s) available for this style.`, 409);
      }
    }

    item.quantity = quantity;
  }

  if (req.body.customization) {
    // Build the merged value explicitly: spreading the Mongoose nested path
    // would drag internal properties onto the document.
    const current = item.customization || {};
    const incoming = req.body.customization;
    const next = {
      goldColor: incoming.goldColor ?? current.goldColor ?? '',
      goldCarat: incoming.goldCarat ?? current.goldCarat ?? '',
      diamondQuality: incoming.diamondQuality ?? current.diamondQuality ?? '',
      size: current.size ?? '',
    };

    if (incoming.size !== undefined) {
      const sizeContext = sizeContextFor(product);
      const chart = resolveSizeChart(sizeContext);
      next.size = chart ? String(incoming.size || '') : '';

      if (chart && !isValidSize(sizeContext, next.size)) {
        return sendError(res, `"${next.size}" is not a valid ${chart.noun.toLowerCase()} for this style.`, 400);
      }
    }

    // Re-sizing onto a line that already exists should merge, not duplicate.
    const duplicate = (req.user.cart.items || []).find(
      (other) => String(other._id) !== String(item._id) && isSameCartLine(other, item.product, next),
    );

    if (duplicate) {
      duplicate.quantity += item.quantity;
      item.deleteOne();
      await req.user.save();
      await populateUserCommerceState(req.user);
      return sendSuccess(res, serializeCart(req.user), 'Cart updated');
    }

    item.customization = next;
  }

  if (req.body.specialInstructions !== undefined) {
    req.user.cart.specialInstructions = asString(req.body.specialInstructions, { maxLength: 2000 });
  }

  await req.user.save();
  await populateUserCommerceState(req.user);
  return sendSuccess(res, serializeCart(req.user), 'Cart updated');
});

router.delete('/cart/:itemId', async (req, res) => {
  const item = (req.user.cart?.items || []).id(req.params.itemId);
  if (!item) {
    return sendError(res, 'Cart item not found', 404);
  }

  item.deleteOne();
  await req.user.save();
  await populateUserCommerceState(req.user);
  return sendSuccess(res, serializeCart(req.user), 'Item removed from cart');
});

router.get('/wishlist', async (req, res) => {
  ensureWishlist(req.user);
  await populateUserCommerceState(req.user);
  return sendSuccess(res, serializeWishlist(req.user));
});

router.post('/wishlist/add', async (req, res) => {
  const { productId, collectionId } = req.body;
  const product = await getProductByClientId(productId);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  ensureWishlist(req.user);
  const resolvedCollectionId =
    collectionId || String(req.user.wishlist.collections[0]?._id || '');

  const collectionExists = req.user.wishlist.collections.some(
    (entry) => String(entry._id) === String(resolvedCollectionId),
  );

  if (!collectionExists) {
    return sendError(res, 'Wishlist collection not found', 404);
  }

  const duplicate = req.user.wishlist.items.some(
    (item) =>
      String(item.product) === String(productId) &&
      String(item.collectionId) === String(resolvedCollectionId),
  );

  if (!duplicate) {
    req.user.wishlist.items.push({
      product: product._id,
      collectionId: resolvedCollectionId,
    });
    await req.user.save();
  }

  await populateUserCommerceState(req.user);
  return sendSuccess(res, serializeWishlist(req.user), 'Added to wishlist');
});

router.post('/wishlist/collections', async (req, res) => {
  ensureWishlist(req.user);
  const name = String(req.body.name || '').trim();
  if (!name) {
    return sendError(res, 'Collection name is required', 400);
  }

  req.user.wishlist.collections.push({ name });
  await req.user.save();
  await populateUserCommerceState(req.user);
  return sendSuccess(res, serializeWishlist(req.user), 'Wishlist collection created');
});

router.delete('/wishlist/:itemId', async (req, res) => {
  const item = (req.user.wishlist?.items || []).id(req.params.itemId);
  if (!item) {
    return sendError(res, 'Wishlist item not found', 404);
  }

  item.deleteOne();
  await req.user.save();
  await populateUserCommerceState(req.user);
  return sendSuccess(res, serializeWishlist(req.user), 'Removed from wishlist');
});

/**
 * `orderId` carries a unique index, but the old generator drew from only 9,000
 * values — a collision (and a hard 500 on checkout) became more likely than not
 * after about 110 orders. A time prefix plus 5 random bytes removes both the
 * collision risk and the ability to guess neighbouring order ids.
 */
function generateOrderId() {
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `DAR-ORD-${stamp}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

router.post('/orders', async (req, res) => {
  await populateUserCommerceState(req.user);

  const cartItems = req.user.cart?.items || [];
  if (!cartItems.length) {
    return sendError(res, 'Cart is empty');
  }

  try {
    await validateReadyStockOrThrow(
      cartItems.map((item) => ({
        product: item.product?._id || item.product,
        quantity: item.quantity,
      })),
    );
  } catch (error) {
    return sendError(res, error.message, 409);
  }

  const order = new Order({
    orderId: generateOrderId(),
    user: req.user._id,
    status: 'Pending',
    statusHistory: [
      {
        status: 'Pending',
        note: 'Order placed by buyer.',
        changedAt: new Date(),
        changedBy: req.user._id,
      },
    ],
    paymentMethod: ['Cash on Delivery', 'Offline Payment'].includes(req.body.paymentMethod)
      ? req.body.paymentMethod
      : 'Cash on Delivery',
    shippingAddress: asString(req.body.shippingAddress, { maxLength: 500 }),
    notes: asString(req.body.notes, { maxLength: 2000 }) || req.user.cart?.specialInstructions || '',
    items: cartItems.map((item) => ({
      product: item.product?._id || item.product,
      quantity: item.quantity,
      customization: item.customization,
    })),
    stockDeducted: false,
  });

  try {
    await deductOrderStock(order);
    await order.save();
    req.user.cart.items = [];
    req.user.cart.specialInstructions = '';
    await req.user.save();
  } catch (error) {
    return sendError(res, error.message || 'Unable to place order', 409);
  }

  await order.populate([
    { path: 'user' },
    {
      path: 'items.product',
      populate: productPopulate,
    },
    { path: 'statusHistory.changedBy' },
  ]);

  setImmediate(() => {
    notifyWhatsappOrderPlaced(order).catch((e) =>
      console.error('[whatsapp] order-placed notifications failed', e.message),
    );
    notifyEmailOrderPlaced(order).catch((e) =>
      console.error('[email] order-placed notifications failed', e.message),
    );
  });

  return sendSuccess(res, serializeOrder(order), 'Order placed successfully');
});

router.get('/orders', async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate([
      { path: 'user' },
      { path: 'statusHistory.changedBy' },
      {
        path: 'items.product',
        populate: productPopulate,
      },
    ]);

  return sendSuccess(res, orders.map(serializeOrder));
});

router.get('/orders/:id', async (req, res) => {
  // A non-ObjectId path segment used to reach the `_id` branch and surface as a
  // 500 with Mongoose cast internals; only match on `_id` when it can be one.
  const identifier = String(req.params.id);
  const matchers = [{ orderId: identifier }];
  if (isObjectId(identifier)) {
    matchers.unshift({ _id: identifier });
  }

  const order = await Order.findOne({
    $or: matchers,
    user: req.user._id,
  }).populate([
    { path: 'user' },
    { path: 'statusHistory.changedBy' },
    {
      path: 'items.product',
      populate: productPopulate,
    },
  ]);

  if (!order) {
    return sendError(res, 'Order not found', 404);
  }

  return sendSuccess(res, serializeOrder(order));
});

router.post('/orders/:id/change-requests', async (req, res) => {
  // Guard the `_id` branch: a non-ObjectId path segment would otherwise throw a
  // Mongoose CastError instead of reading as a clean 404 (matches GET /orders/:id).
  const identifier = String(req.params.id);
  const matchers = [{ orderId: identifier }];
  if (isObjectId(identifier)) {
    matchers.unshift({ _id: identifier });
  }

  const order = await Order.findOne({
    $or: matchers,
    user: req.user._id,
  });

  if (!order) {
    return sendError(res, 'Order not found', 404);
  }

  const incoming = Array.isArray(req.body.requests) ? req.body.requests : [];
  const accepted = [];

  for (const entry of incoming) {
    const message = String(entry?.message || '').trim();
    if (!message) continue;

    const item = order.items.id(entry.itemId);
    if (!item) continue;

    item.changeRequests.push({ message, status: 'Open' });
    accepted.push({ itemId: String(item._id), message });
  }

  if (!accepted.length) {
    return sendError(res, 'No change requests provided');
  }

  await order.save();
  await order.populate([
    { path: 'user' },
    { path: 'statusHistory.changedBy' },
    {
      path: 'items.product',
      populate: productPopulate,
    },
  ]);

  const requestsForEmail = accepted.map((entry) => {
    const item = order.items.id(entry.itemId);
    const product = item?.product;
    const productLabel = product
      ? `${product.styleCode ? product.styleCode + ' — ' : ''}${product.name || 'Product'}`
      : 'Product';
    return { productLabel, message: entry.message };
  });

  setImmediate(() => {
    notifyEmailOrderChangeRequest(order, { requests: requestsForEmail }).catch((e) =>
      console.error('[email] change-request notifications failed', e.message),
    );
  });

  return sendSuccess(res, serializeOrder(order), 'Change request submitted');
});

router.get('/catalogues', async (req, res) => {
  const catalogues = await Catalogue.find({
    assignedUsers: req.user._id,
    archived: false,
    active: true,
  })
    .sort({ createdAt: -1 })
    // Deliberately not populating `assignedUsers`: a buyer only needs the products,
    // and the assigned list holds other buyers' contact PII.
    .populate([
      {
        path: 'products',
        populate: productPopulate,
      },
    ]);

  return sendSuccess(res, catalogues.map((catalogue) => serializeCatalogue(catalogue, { includeAssignedUsers: false })));
});

export default router;
