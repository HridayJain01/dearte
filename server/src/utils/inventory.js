import { v4 as uuidv4 } from 'uuid';
import { db, getProductById, saveDb } from '../services/store.js';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function totalUnitsForProductInCart(cart, productId) {
  return cart.items.filter((i) => i.productId === productId).reduce((s, i) => s + i.quantity, 0);
}

export function validateReadyStockForCart(cart) {
  for (const item of cart.items) {
    const product = getProductById(item.productId);
    if (!product || product.stockType !== 'Ready Stock') continue;
    const total = totalUnitsForProductInCart(cart, item.productId);
    if (total > product.stockQuantity) {
      return `Insufficient stock for ${product.styleCode}: ${product.stockQuantity} available, ${total} in cart.`;
    }
  }
  return null;
}

export function validateOrderLinesForStock(order) {
  const byProduct = new Map();
  for (const line of order.items) {
    const product = getProductById(line.productId);
    if (!product || product.stockType !== 'Ready Stock') continue;
    const q = (byProduct.get(line.productId) || 0) + line.quantity;
    byProduct.set(line.productId, q);
    if (q > product.stockQuantity) {
      return `Insufficient stock for ${product.styleCode}.`;
    }
  }
  return null;
}

function appendMovement({ productId, orderId, delta, reason }) {
  if (!db.inventoryMovements) db.inventoryMovements = [];
  db.inventoryMovements.unshift({
    id: uuidv4(),
    productId,
    orderId: orderId || null,
    delta,
    reason,
    at: new Date().toISOString(),
  });
}

export function deductStockForOrder(order) {
  const readyLines = order.items.filter((line) => {
    const product = getProductById(line.productId);
    return product?.stockType === 'Ready Stock';
  });

  for (const line of readyLines) {
    const product = getProductById(line.productId);
    if (product.stockQuantity < line.quantity) {
      throw new Error(`Insufficient stock for ${product.styleCode}`);
    }
  }

  let anyReady = false;
  for (const line of order.items) {
    const product = getProductById(line.productId);
    if (!product) continue;
    if (product.stockType === 'Ready Stock') {
      product.stockQuantity -= line.quantity;
      anyReady = true;
      appendMovement({
        productId: product.id,
        orderId: order.orderId,
        delta: -line.quantity,
        reason: 'order',
      });
    }
    product.orderCount = num(product.orderCount) + line.quantity;
  }

  order.stockDeducted = anyReady;
}

export function restoreStockForOrder(order) {
  if (!order.stockDeducted) return;

  for (const line of order.items) {
    const product = getProductById(line.productId);
    if (!product || product.stockType !== 'Ready Stock') continue;
    product.stockQuantity += line.quantity;
    appendMovement({
      productId: product.id,
      orderId: order.orderId,
      delta: line.quantity,
      reason: 'cancel',
    });
  }
  order.stockDeducted = false;
}

export function sortBannersByOrder(banners, orderIds = []) {
  const map = new Map(orderIds.map((id, i) => [id, i]));
  return [...banners].sort((a, b) => (map.get(a.id) ?? 9999) - (map.get(b.id) ?? 9999));
}
