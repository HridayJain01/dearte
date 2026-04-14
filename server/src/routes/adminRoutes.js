import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, enrichOrder, getDashboardData, saveDb } from '../services/store.js';
import { sendSuccess, sendError } from '../utils/responses.js';

const router = express.Router();

const findById = (collection, id) => collection.find((entry) => entry.id === id);
const removeById = (collection, id) => {
  const index = collection.findIndex((entry) => entry.id === id);
  if (index === -1) return false;
  collection.splice(index, 1);
  return true;
};

router.get('/dashboard', (req, res) => sendSuccess(res, getDashboardData()));

router.get('/users', (req, res) => sendSuccess(res, db.users.filter((user) => user.role === 'buyer')));

router.put('/users/:id', (req, res) => {
  const user = findById(db.users, req.params.id);
  if (!user) return sendError(res, 'User not found', 404);
  Object.assign(user, req.body);
  saveDb();
  return sendSuccess(res, user, 'User updated');
});

router.get('/products', (req, res) => sendSuccess(res, db.products));

router.post('/products', (req, res) => {
  const product = {
    id: uuidv4(),
    status: 'Active',
    syncStatus: 'Manual',
    lastUpdated: new Date().toISOString(),
    images: [],
    customizationOptions: {
      goldColors: ['Yellow Gold', 'Rose Gold', 'White Gold'],
      goldCarats: ['14K', '18K', '22K'],
      diamondQualities: ['SI-IJ', 'VS-GH', 'VVS-EF'],
    },
    specifications: [],
    views: 0,
    cartAdds: 0,
    orderCount: 0,
    isNewArrival: false,
    isBestSeller: false,
    ...req.body,
  };
  db.products.unshift(product);
  saveDb();
  return sendSuccess(res, product, 'Product created');
});

router.put('/products/:id', (req, res) => {
  const product = findById(db.products, req.params.id);
  if (!product) return sendError(res, 'Product not found', 404);
  Object.assign(product, req.body, { lastUpdated: new Date().toISOString() });
  saveDb();
  return sendSuccess(res, product, 'Product updated');
});

router.delete('/products/:id', (req, res) => {
  if (!removeById(db.products, req.params.id)) return sendError(res, 'Product not found', 404);
  saveDb();
  return sendSuccess(res, null, 'Product deleted');
});

router.get('/orders', (req, res) => sendSuccess(res, db.orders.map((order) => enrichOrder(order))));

router.put('/orders/:id', (req, res) => {
  const order = db.orders.find((entry) => entry.id === req.params.id || entry.orderId === req.params.id);
  if (!order) return sendError(res, 'Order not found', 404);
  Object.assign(order, req.body);
  saveDb();
  return sendSuccess(res, enrichOrder(order), 'Order updated');
});

router.get('/catalogues', (req, res) =>
  sendSuccess(
    res,
    db.catalogues.map((catalogue) => ({
      ...catalogue,
      products: catalogue.productIds.map((productId) => db.products.find((product) => product.id === productId)).filter(Boolean),
      assignedUsers: catalogue.assignedUserIds.map((userId) => db.users.find((user) => user.id === userId)).filter(Boolean),
    })),
  ),
);

router.post('/catalogues', (req, res) => {
  const catalogue = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    name: '',
    description: '',
    productIds: [],
    assignedUserIds: [],
    coverImage: '',
    ...req.body,
  };
  db.catalogues.unshift(catalogue);
  saveDb();
  return sendSuccess(res, catalogue, 'Catalogue created');
});

router.put('/catalogues/:id', (req, res) => {
  const catalogue = findById(db.catalogues, req.params.id);
  if (!catalogue) return sendError(res, 'Catalogue not found', 404);
  Object.assign(catalogue, req.body);
  saveDb();
  return sendSuccess(res, catalogue, 'Catalogue updated');
});

router.delete('/catalogues/:id', (req, res) => {
  if (!removeById(db.catalogues, req.params.id)) return sendError(res, 'Catalogue not found', 404);
  saveDb();
  return sendSuccess(res, null, 'Catalogue deleted');
});

router.get('/promotions', (req, res) =>
  sendSuccess(res, {
    banners: db.banners,
    popupAds: db.promotions.popupAds,
    events: db.events,
  }),
);

router.post('/promotions/banners', (req, res) => {
  const banner = { id: uuidv4(), active: true, ...req.body };
  db.banners.unshift(banner);
  db.promotions.bannersOrder = [banner.id, ...(db.promotions.bannersOrder || [])];
  saveDb();
  return sendSuccess(res, banner, 'Banner created');
});

router.put('/promotions/banners/:id', (req, res) => {
  const banner = findById(db.banners, req.params.id);
  if (!banner) return sendError(res, 'Banner not found', 404);
  Object.assign(banner, req.body);
  saveDb();
  return sendSuccess(res, banner, 'Banner updated');
});

router.delete('/promotions/banners/:id', (req, res) => {
  if (!removeById(db.banners, req.params.id)) return sendError(res, 'Banner not found', 404);
  db.promotions.bannersOrder = (db.promotions.bannersOrder || []).filter((id) => id !== req.params.id);
  saveDb();
  return sendSuccess(res, null, 'Banner deleted');
});

router.post('/promotions/popup-ads', (req, res) => {
  const popup = { id: uuidv4(), active: true, ...req.body };
  db.promotions.popupAds.unshift(popup);
  saveDb();
  return sendSuccess(res, popup, 'Popup ad created');
});

router.put('/promotions/popup-ads/:id', (req, res) => {
  const popup = findById(db.promotions.popupAds, req.params.id);
  if (!popup) return sendError(res, 'Popup ad not found', 404);
  Object.assign(popup, req.body);
  saveDb();
  return sendSuccess(res, popup, 'Popup ad updated');
});

router.delete('/promotions/popup-ads/:id', (req, res) => {
  if (!removeById(db.promotions.popupAds, req.params.id)) return sendError(res, 'Popup ad not found', 404);
  saveDb();
  return sendSuccess(res, null, 'Popup ad deleted');
});

router.post('/events', (req, res) => {
  const event = { id: uuidv4(), ...req.body };
  db.events.unshift(event);
  saveDb();
  return sendSuccess(res, event, 'Event created');
});

router.put('/events/:id', (req, res) => {
  const event = findById(db.events, req.params.id);
  if (!event) return sendError(res, 'Event not found', 404);
  Object.assign(event, req.body);
  saveDb();
  return sendSuccess(res, event, 'Event updated');
});

router.delete('/events/:id', (req, res) => {
  if (!removeById(db.events, req.params.id)) return sendError(res, 'Event not found', 404);
  saveDb();
  return sendSuccess(res, null, 'Event deleted');
});

router.get('/config', (req, res) =>
  sendSuccess(res, {
    categoryManager: db.categoryManager,
    subCategoryManager: db.subCategoryManager,
    collectionManager: db.collectionManager,
    siteSettings: db.siteSettings,
    emailSettings: db.emailSettings,
    pincodes: db.pincodes,
    integrationSettings: db.integrationSettings,
  }),
);

router.put('/config', (req, res) => {
  if (req.body.siteSettings) Object.assign(db.siteSettings, req.body.siteSettings);
  if (req.body.emailSettings) Object.assign(db.emailSettings, req.body.emailSettings);
  if (req.body.integrationSettings) Object.assign(db.integrationSettings, req.body.integrationSettings);
  if (req.body.pincodes) db.pincodes = req.body.pincodes;
  if (req.body.categoryManager) db.categoryManager = req.body.categoryManager;
  if (req.body.subCategoryManager) db.subCategoryManager = req.body.subCategoryManager;
  if (req.body.collectionManager) db.collectionManager = req.body.collectionManager;
  saveDb();
  return sendSuccess(
    res,
    {
      categoryManager: db.categoryManager,
      subCategoryManager: db.subCategoryManager,
      collectionManager: db.collectionManager,
      siteSettings: db.siteSettings,
      emailSettings: db.emailSettings,
      pincodes: db.pincodes,
      integrationSettings: db.integrationSettings,
    },
    'Configuration updated',
  );
});

router.get('/testimonials', (req, res) => sendSuccess(res, db.testimonials));

router.post('/testimonials', (req, res) => {
  const testimonial = { id: uuidv4(), status: 'Pending', rating: 5, ...req.body };
  db.testimonials.unshift(testimonial);
  saveDb();
  return sendSuccess(res, testimonial, 'Testimonial created');
});

router.put('/testimonials/:id', (req, res) => {
  const testimonial = findById(db.testimonials, req.params.id);
  if (!testimonial) return sendError(res, 'Testimonial not found', 404);
  Object.assign(testimonial, req.body);
  saveDb();
  return sendSuccess(res, testimonial, 'Testimonial updated');
});

router.delete('/testimonials/:id', (req, res) => {
  if (!removeById(db.testimonials, req.params.id)) return sendError(res, 'Testimonial not found', 404);
  saveDb();
  return sendSuccess(res, null, 'Testimonial deleted');
});

router.get('/roles', (req, res) => sendSuccess(res, db.roles));

router.post('/roles', (req, res) => {
  const role = { id: uuidv4(), permissions: [], ...req.body };
  db.roles.push(role);
  saveDb();
  return sendSuccess(res, role, 'Role created');
});

router.get('/reports/:type', (req, res) => {
  const { type } = req.params;

  if (type === 'product-wise') {
    return sendSuccess(
      res,
      db.products.map((product) => ({
        styleCode: product.styleCode,
        product: product.name,
        views: product.views,
        cartAdds: product.cartAdds,
        orders: product.orderCount,
      })),
    );
  }

  if (type === 'category-wise') {
    return sendSuccess(
      res,
      Array.from(new Set(db.products.map((product) => product.category))).map((category) => ({
        category,
        views: db.products
          .filter((product) => product.category === category)
          .reduce((sum, product) => sum + product.views, 0),
        cartAdds: db.products
          .filter((product) => product.category === category)
          .reduce((sum, product) => sum + product.cartAdds, 0),
        orders: db.products
          .filter((product) => product.category === category)
          .reduce((sum, product) => sum + product.orderCount, 0),
      })),
    );
  }

  if (type === 'login-log') {
    return sendSuccess(res, db.reports.loginLog);
  }

  if (type === 'user-orders') {
    return sendSuccess(
      res,
      db.users
        .filter((user) => user.role === 'buyer')
        .map((user) => ({
          user: user.name,
          company: user.companyName,
          orders: db.orders.filter((order) => order.userId === user.id).length,
        })),
    );
  }

  return sendError(res, 'Unknown report type', 404);
});

router.get('/sync', (req, res) =>
  sendSuccess(res, {
    logs: db.syncLogs,
    integrationSettings: db.integrationSettings,
  }),
);

router.post('/sync', (req, res) => {
  const log = {
    id: uuidv4(),
    time: new Date().toISOString(),
    recordsSynced: db.products.length,
    errors: 0,
    status: 'Success',
    nextRun: new Date(Date.now() + 1000 * 60 * 60 * Number(db.integrationSettings.syncIntervalHours || 3)).toISOString(),
  };

  db.syncLogs.unshift(log);
  saveDb();
  return sendSuccess(res, log, 'Sync triggered successfully');
});

export default router;
