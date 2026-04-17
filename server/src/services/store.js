import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedData } from '../data/seed.js';
import { normalizeProduct } from '../utils/productNormalize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data/runtime-db.json');

const buildDefaults = () => {
  const seeded = structuredClone(seedData);

  return {
    ...seeded,
    emailSettings: seeded.emailSettings || {
      smtpHost: 'smtp.gmail.com',
      smtpPort: '587',
      smtpUser: 'care@deartejewellery.com',
      fromEmail: 'care@deartejewellery.com',
      enquiryInbox: 'sales@deartejewellery.com',
    },
    pincodes: seeded.pincodes || ['400002', '400004', '400051', '380009'],
    categoryManager:
      seeded.categoryManager ||
      Array.from(new Set(seeded.products.map((product) => product.category))).map((name) => ({
        id: `category-${name.toLowerCase().replaceAll(/\s+/g, '-')}`,
        name,
        image: seeded.products.find((product) => product.category === name)?.images?.[0] || '',
      })),
    subCategoryManager:
      seeded.subCategoryManager ||
      Array.from(new Set(seeded.products.map((product) => `${product.category}|||${product.subCategory}`))).map((item) => {
        const [category, name] = item.split('|||');
        return {
          id: `subcategory-${name.toLowerCase().replaceAll(/\s+/g, '-')}`,
          category,
          name,
        };
      }),
    collectionManager:
      seeded.collectionManager ||
      Array.from(
        new Set(
          seeded.products.map(
            (product) => `${product.category}|||${product.subCategory}|||${product.collection}|||${product.images[0]}`,
          ),
        ),
      ).map((item) => {
        const [category, subCategory, name, image] = item.split('|||');
        return {
          id: `collection-${name.toLowerCase().replaceAll(/\s+/g, '-')}`,
          category,
          subCategory,
          name,
          image,
        };
      }),
    integrationSettings: seeded.integrationSettings || {
      erpName: 'Smart Jewel ERP Plus',
      erpBaseUrl: 'https://erp.example.com/api',
      erpApiKey: 'erp-demo-key',
      imageCdnBaseUrl: 'https://cdn.example.com/dearte',
      syncIntervalHours: 3,
      orderImportEnabled: true,
      inventoryPushEnabled: true,
      customerExportEnabled: true,
    },
  };
};

const ensureRuntimeDb = () => {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, `${JSON.stringify(buildDefaults(), null, 2)}\n`, 'utf-8');
  }
};

const loadDb = () => {
  ensureRuntimeDb();
  const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  const defaults = buildDefaults();

  const merged = {
    ...defaults,
    ...raw,
    emailSettings: { ...defaults.emailSettings, ...(raw.emailSettings || {}) },
    integrationSettings: { ...defaults.integrationSettings, ...(raw.integrationSettings || {}) },
    promotions: {
      ...defaults.promotions,
      ...(raw.promotions || {}),
    },
  };

  (merged.products || []).forEach((product) => normalizeProduct(product));
  if (!merged.inventoryMovements) merged.inventoryMovements = [];

  return merged;
};

export const db = loadDb();

export const saveDb = () => {
  fs.writeFileSync(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, 'utf-8');
};

export const getProductById = (id) => db.products.find((product) => product.id === id);
export const getProductByStyleCode = (styleCode) =>
  db.products.find((product) => product.styleCode === styleCode);

export const getCategories = () => {
  const grouped = new Map();

  db.products.forEach((product) => {
    if (!grouped.has(product.category)) {
      grouped.set(product.category, {
        name: product.category,
        subCategories: new Set(),
        image: product.images[0],
      });
    }

    grouped.get(product.category).subCategories.add(product.subCategory);
  });

  return Array.from(grouped.values()).map((category) => ({
    name: category.name,
    image: category.image,
    subCategories: Array.from(category.subCategories),
  }));
};

export const getCollections = () => {
  const collectionMap = new Map();

  db.products.forEach((product) => {
    if (!collectionMap.has(product.collection)) {
      collectionMap.set(product.collection, {
        name: product.collection,
        category: product.category,
        subCategory: product.subCategory,
        image: product.images[0],
      });
    }
  });

  return Array.from(collectionMap.values());
};

export const enrichCart = (cart) => ({
  ...cart,
  items: cart.items.map((item) => ({
    ...item,
    product: getProductById(item.productId),
  })),
});

export const enrichWishlist = (wishlist) => ({
  ...wishlist,
  items: wishlist.items.map((item) => ({
    ...item,
    product: getProductById(item.productId),
  })),
});

export const enrichOrder = (order) => ({
  ...order,
  items: order.items.map((item) => ({
    ...item,
    product: getProductById(item.productId),
  })),
  user: db.users.find((user) => user.id === order.userId),
});

export const getDashboardData = () => {
  const activeUsers = db.users.filter((user) => user.status === 'Active' && user.role === 'buyer').length;
  const inactiveUsers = db.users.filter((user) => user.status === 'Inactive' && user.role === 'buyer').length;
  const totalOrders = db.orders.length;
  const pendingOrders = db.orders.filter((order) =>
    ['Pending', 'Reviewed', 'Approved', 'Processing'].includes(order.status),
  ).length;
  const today = new Date().toISOString().slice(0, 10);
  const todayRegistrations = db.users.filter((user) => user.registeredAt.startsWith(today)).length;
  const todayOrders = db.orders.filter((order) => order.date.startsWith(today)).length;

  return {
    kpis: [
      { label: 'Total Registered Users', value: db.users.filter((user) => user.role === 'buyer').length },
      { label: 'Active Users', value: activeUsers },
      { label: 'Inactive Users', value: inactiveUsers },
      { label: 'Total Orders', value: totalOrders },
      { label: 'Pending Orders', value: pendingOrders },
      { label: "Today's Registrations", value: todayRegistrations },
      { label: "Today's Orders", value: todayOrders },
    ],
    orderTrend: [
      { day: 'Apr 01', orders: 2 },
      { day: 'Apr 04', orders: 4 },
      { day: 'Apr 07', orders: 3 },
      { day: 'Apr 10', orders: 6 },
      { day: 'Apr 13', orders: 5 },
    ],
    categoryChart: getCategories().map((category) => ({
      name: category.name,
      value: db.products
        .filter((product) => product.category === category.name)
        .reduce((sum, product) => sum + product.orderCount, 0),
    })),
    orderTypeSplit: [
      {
        name: 'Ready Stock',
        value: db.products.filter((product) => product.stockType === 'Ready Stock').length,
      },
      {
        name: 'Make to Order',
        value: db.products.filter((product) => product.stockType === 'Make to Order').length,
      },
    ],
  };
};
