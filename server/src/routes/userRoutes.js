import express from 'express';
import {
  Catalogue,
  Order,
  Product,
  User,
} from '../models/index.js';
import { sendError, sendSuccess } from '../utils/responses.js';
import { serializeCatalogue, serializeOrder, serializeProduct, serializeUser } from '../utils/serializers.js';

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
  const product = await Product.findById(productId).populate(productPopulate);
  return product;
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
  const allowed = [
    'name',
    'mobile',
    'address',
    'city',
    'state',
    'country',
    'pinCode',
    'companyName',
    'gstNumber',
    'kycDocuments',
  ];

  for (const key of allowed) {
    if (key in req.body) {
      req.user[key] = req.body[key];
    }
  }

  await req.user.save();
  return sendSuccess(res, serializeUser(req.user), 'Profile updated');
});

router.get('/cart', async (req, res) => {
  await populateUserCommerceState(req.user);
  return sendSuccess(res, serializeCart(req.user));
});

router.post('/cart/add', async (req, res) => {
  const { productId, quantity = 1, customization = {} } = req.body;
  const product = await getProductByClientId(productId);

  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  const addQty = Number(quantity || 1);
  if (addQty < 1) {
    return sendError(res, 'Quantity must be at least 1', 400);
  }

  const existing = (req.user.cart?.items || []).find(
    (item) =>
      String(item.product) === String(productId) &&
      item.customization?.goldColor === customization.goldColor &&
      item.customization?.goldCarat === customization.goldCarat &&
      item.customization?.diamondQuality === customization.diamondQuality,
  );

  const nextTotal = totalUnitsForProductInCart(req.user, productId) + addQty;
  if (product.stockType === 'Ready Stock' && nextTotal > product.stockQuantity) {
    return sendError(res, `Only ${product.stockQuantity} unit(s) available for this style.`, 409);
  }

  if (!req.user.cart) {
    req.user.cart = { items: [], specialInstructions: '' };
  }

  if (existing) {
    existing.quantity += addQty;
  } else {
    req.user.cart.items.push({
      product: product._id,
      quantity: addQty,
      customization: {
        goldColor: customization.goldColor || product.customizationOptions?.goldColors?.[0] || '',
        goldCarat: customization.goldCarat || product.customizationOptions?.goldCarats?.[0] || '',
        diamondQuality:
          customization.diamondQuality || product.customizationOptions?.diamondQualities?.[0] || '',
      },
    });
  }

  product.cartAdds += addQty;
  await Promise.all([req.user.save(), product.save()]);
  await populateUserCommerceState(req.user);

  return sendSuccess(res, serializeCart(req.user), 'Item added to cart');
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
    item.customization = {
      ...item.customization,
      ...req.body.customization,
    };
  }

  if (req.body.specialInstructions !== undefined) {
    req.user.cart.specialInstructions = req.body.specialInstructions;
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
    orderId: `DAR-ORD-${Math.floor(Math.random() * 9000 + 1000)}`,
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
    paymentMethod: req.body.paymentMethod || 'Cash on Delivery',
    shippingAddress: req.body.shippingAddress || '',
    notes: req.body.notes || req.user.cart?.specialInstructions || '',
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
  const order = await Order.findOne({
    $or: [{ _id: req.params.id }, { orderId: req.params.id }],
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

router.get('/catalogues', async (req, res) => {
  const catalogues = await Catalogue.find({
    assignedUsers: req.user._id,
    archived: false,
    active: true,
  })
    .sort({ createdAt: -1 })
    .populate([
      { path: 'assignedUsers' },
      {
        path: 'products',
        populate: productPopulate,
      },
    ]);

  return sendSuccess(res, catalogues.map(serializeCatalogue));
});

export default router;
