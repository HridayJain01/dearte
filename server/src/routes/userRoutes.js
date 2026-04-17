import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, enrichCart, enrichOrder, enrichWishlist, saveDb, getProductById } from '../services/store.js';
import {
  validateReadyStockForCart,
  validateOrderLinesForStock,
  deductStockForOrder,
  totalUnitsForProductInCart,
} from '../utils/inventory.js';
import { sendError, sendSuccess } from '../utils/responses.js';

const router = express.Router();

const getOrCreateCart = (userId) => {
  let cart = db.carts.find((entry) => entry.userId === userId);

  if (!cart) {
    cart = { userId, items: [], specialInstructions: '' };
    db.carts.push(cart);
  }

  return cart;
};

const getOrCreateWishlist = (userId) => {
  let wishlist = db.wishlists.find((entry) => entry.userId === userId);

  if (!wishlist) {
    wishlist = { userId, collections: [{ id: 'default', name: 'My Wishlist' }], items: [] };
    db.wishlists.push(wishlist);
  }

  return wishlist;
};

router.get('/profile', (req, res) => {
  const { passwordHash, ...safeUser } = req.user;
  return sendSuccess(res, safeUser);
});

router.put('/profile', (req, res) => {
  Object.assign(req.user, req.body);
  saveDb();
  const { passwordHash, ...safeUser } = req.user;
  return sendSuccess(res, safeUser, 'Profile updated');
});

router.get('/cart', (req, res) => sendSuccess(res, enrichCart(getOrCreateCart(req.user.id))));

router.post('/cart/add', (req, res) => {
  const cart = getOrCreateCart(req.user.id);
  const product = getProductById(req.body.productId);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  const addQty = req.body.quantity || 1;
  const existing = cart.items.find(
    (item) =>
      item.productId === req.body.productId &&
      item.customization.goldColor === req.body.customization.goldColor &&
      item.customization.goldCarat === req.body.customization.goldCarat &&
      item.customization.diamondQuality === req.body.customization.diamondQuality,
  );

  const nextTotal = totalUnitsForProductInCart(cart, req.body.productId) + addQty;

  if (product.stockType === 'Ready Stock' && nextTotal > product.stockQuantity) {
    return sendError(res, `Only ${product.stockQuantity} unit(s) available for this style.`, 409);
  }

  if (existing) {
    existing.quantity += addQty;
  } else {
    cart.items.push({
      id: uuidv4(),
      productId: req.body.productId,
      quantity: addQty,
      customization: req.body.customization,
    });
  }

  saveDb();
  return sendSuccess(res, enrichCart(cart), 'Item added to cart');
});

router.put('/cart/:itemId', (req, res) => {
  const cart = getOrCreateCart(req.user.id);
  const item = cart.items.find((entry) => entry.id === req.params.itemId);

  if (!item) {
    return sendError(res, 'Cart item not found', 404);
  }

  const product = getProductById(item.productId);
  if (req.body.quantity !== undefined) {
    const newQty = Number(req.body.quantity);
    if (product?.stockType === 'Ready Stock') {
      const totalWithout = totalUnitsForProductInCart(cart, item.productId) - item.quantity;
      if (totalWithout + newQty > product.stockQuantity) {
        return sendError(res, `Only ${product.stockQuantity} unit(s) available for this style.`, 409);
      }
    }
  }

  Object.assign(item, req.body);
  saveDb();
  return sendSuccess(res, enrichCart(cart), 'Cart updated');
});

router.delete('/cart/:itemId', (req, res) => {
  const cart = getOrCreateCart(req.user.id);
  cart.items = cart.items.filter((entry) => entry.id !== req.params.itemId);
  saveDb();
  return sendSuccess(res, enrichCart(cart), 'Item removed from cart');
});

router.get('/wishlist', (req, res) =>
  sendSuccess(res, enrichWishlist(getOrCreateWishlist(req.user.id))),
);

router.post('/wishlist/add', (req, res) => {
  const wishlist = getOrCreateWishlist(req.user.id);
  wishlist.items.push({
    id: uuidv4(),
    productId: req.body.productId,
    collectionId: req.body.collectionId || wishlist.collections[0]?.id || 'default',
  });
  saveDb();
  return sendSuccess(res, enrichWishlist(wishlist), 'Added to wishlist');
});

router.post('/wishlist/collections', (req, res) => {
  const wishlist = getOrCreateWishlist(req.user.id);
  const collection = { id: uuidv4(), name: req.body.name };
  wishlist.collections.push(collection);
  saveDb();
  return sendSuccess(res, enrichWishlist(wishlist), 'Wishlist collection created');
});

router.delete('/wishlist/:itemId', (req, res) => {
  const wishlist = getOrCreateWishlist(req.user.id);
  wishlist.items = wishlist.items.filter((entry) => entry.id !== req.params.itemId);
  saveDb();
  return sendSuccess(res, enrichWishlist(wishlist), 'Removed from wishlist');
});

router.post('/orders', (req, res) => {
  const cart = getOrCreateCart(req.user.id);

  if (!cart.items.length) {
    return sendError(res, 'Cart is empty');
  }

  const stockErr = validateReadyStockForCart(cart);
  if (stockErr) {
    return sendError(res, stockErr, 409);
  }

  const order = {
    id: uuidv4(),
    orderId: `DAR-ORD-${Math.floor(Math.random() * 9000 + 1000)}`,
    userId: req.user.id,
    date: new Date().toISOString(),
    status: 'Pending',
    paymentMethod: req.body.paymentMethod,
    orderTypeSplit: [
      ...new Set(
        cart.items.map(
          (item) => db.products.find((product) => product.id === item.productId)?.stockType || 'Make to Order',
        ),
      ),
    ],
    shippingAddress: req.body.shippingAddress,
    notes: req.body.notes,
    items: cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      customization: item.customization,
    })),
    stockDeducted: false,
  };

  const lineErr = validateOrderLinesForStock(order);
  if (lineErr) {
    return sendError(res, lineErr, 409);
  }

  try {
    deductStockForOrder(order);
  } catch (error) {
    return sendError(res, error.message || 'Unable to place order', 409);
  }

  db.orders.unshift(order);
  cart.items = [];
  cart.specialInstructions = '';
  saveDb();

  return sendSuccess(res, enrichOrder(order), 'Order placed successfully');
});

router.get('/orders', (req, res) =>
  sendSuccess(
    res,
    db.orders.filter((order) => order.userId === req.user.id).map((order) => enrichOrder(order)),
  ),
);

router.get('/orders/:id', (req, res) => {
  const order = db.orders.find((entry) => entry.id === req.params.id || entry.orderId === req.params.id);

  if (!order || order.userId !== req.user.id) {
    return sendError(res, 'Order not found', 404);
  }

  return sendSuccess(res, enrichOrder(order));
});

router.get('/catalogues', (req, res) => {
  const catalogues = db.catalogues
    .filter((catalogue) => catalogue.assignedUserIds.includes(req.user.id))
    .map((catalogue) => ({
      ...catalogue,
      products: catalogue.productIds.map((productId) =>
        db.products.find((product) => product.id === productId),
      ),
    }));

  return sendSuccess(res, catalogues);
});

export default router;
