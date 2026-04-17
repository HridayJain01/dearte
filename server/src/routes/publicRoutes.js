import express from 'express';
import { db, getCategories, getCollections, getProductByStyleCode } from '../services/store.js';
import { sortBannersByOrder } from '../utils/inventory.js';
import { sendError, sendSuccess } from '../utils/responses.js';

const router = express.Router();

const sortProducts = (products, sort) => {
  const list = [...products];

  switch (sort) {
    case 'diamond-asc':
      return list.sort((a, b) => a.diamondWeight - b.diamondWeight);
    case 'diamond-desc':
      return list.sort((a, b) => b.diamondWeight - a.diamondWeight);
    case 'gold-asc':
      return list.sort((a, b) => a.goldWeight - b.goldWeight);
    case 'gold-desc':
      return list.sort((a, b) => b.goldWeight - a.goldWeight);
    case 'best-sellers':
      return list.sort((a, b) => b.orderCount - a.orderCount);
    case 'new-arrivals':
      return list.sort((a, b) => Number(b.isNewArrival) - Number(a.isNewArrival));
    default:
      return list;
  }
};

router.get('/site/home', (req, res) => {
  const newArrivals = db.products.filter((product) => product.isNewArrival).slice(0, 10);
  const bestSellers = [...db.products]
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 10);

  const activeBanners = db.banners.filter((banner) => banner.active);
  const banners = sortBannersByOrder(activeBanners, db.promotions.bannersOrder || []);
  const today = new Date().toISOString().slice(0, 10);
  const popupAds = db.promotions.popupAds.filter((entry) => {
    if (!entry.active) return false;
    if (!entry.startDate || !entry.endDate) return true;
    return entry.startDate <= today && entry.endDate >= today;
  });

  return sendSuccess(res, {
    banners,
    newArrivals,
    bestSellers,
    companyInfo: db.companyInfo,
    testimonials: db.testimonials.filter((testimonial) => testimonial.status === 'Approved'),
    siteSettings: db.siteSettings,
    popupAds,
  });
});

router.get('/products', (req, res) => {
  let products = [...db.products];
  const {
    category,
    subCategory,
    collection,
    metalColor,
    diamondMin,
    diamondMax,
    goldMin,
    goldMax,
    search,
    sort,
    page = 1,
    limit = 24,
    stockType,
  } = req.query;

  if (category) {
    products = products.filter((product) => product.category === category);
  }

  if (subCategory) {
    const subCategories = String(subCategory).split(',');
    products = products.filter((product) => subCategories.includes(product.subCategory));
  }

  if (collection) {
    const collections = String(collection).split(',');
    products = products.filter((product) => collections.includes(product.collection));
  }

  if (metalColor) {
    const metalColors = String(metalColor).split(',');
    products = products.filter((product) => metalColors.includes(product.metalColor));
  }

  if (stockType) {
    products = products.filter((product) => product.stockType === stockType);
  }

  if (diamondMin) {
    products = products.filter((product) => product.diamondWeight >= Number(diamondMin));
  }

  if (diamondMax) {
    products = products.filter((product) => product.diamondWeight <= Number(diamondMax));
  }

  if (goldMin) {
    products = products.filter((product) => product.goldWeight >= Number(goldMin));
  }

  if (goldMax) {
    products = products.filter((product) => product.goldWeight <= Number(goldMax));
  }

  if (search) {
    const keyword = String(search).toLowerCase();
    products = products.filter((product) =>
      [product.styleCode, product.name, product.category, product.collection]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }

  products = sortProducts(products, sort);

  const currentPage = Number(page);
  const pageSize = Number(limit);
  const paginatedProducts = products.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return sendSuccess(res, {
    items: paginatedProducts,
    total: products.length,
    page: currentPage,
    totalPages: Math.ceil(products.length / pageSize),
    filters: {
      categories: getCategories(),
      collections: getCollections(),
      metalColors: ['Yellow Gold', 'Rose Gold', 'White Gold', 'Platinum'],
      diamondRange: [0.1, 2.0],
      goldRange: [2, 20],
    },
  });
});

router.get('/products/new-arrivals', (req, res) =>
  sendSuccess(
    res,
    db.products.filter((product) => product.isNewArrival),
  ),
);

router.get('/products/best-sellers', (req, res) =>
  sendSuccess(
    res,
    [...db.products].sort((a, b) => b.orderCount - a.orderCount),
  ),
);

router.get('/products/:styleCode', (req, res) => {
  const product = getProductByStyleCode(req.params.styleCode);

  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  const relatedProducts = db.products.filter(
    (item) =>
      item.styleCode !== product.styleCode &&
      (item.collection === product.collection || item.category === product.category),
  );

  return sendSuccess(res, { ...product, relatedProducts: relatedProducts.slice(0, 6) });
});

router.get('/categories', (req, res) => sendSuccess(res, getCategories()));
router.get('/collections', (req, res) => sendSuccess(res, getCollections()));
router.get('/events', (req, res) => sendSuccess(res, db.events));
router.get('/testimonials', (req, res) =>
  sendSuccess(res, db.testimonials.filter((testimonial) => testimonial.status === 'Approved')),
);
router.get('/careers', (req, res) => sendSuccess(res, db.careers));
router.get('/faq', (req, res) => sendSuccess(res, db.faq));
router.get('/site/contact', (req, res) => sendSuccess(res, db.siteSettings));

router.get('/site/static/:slug', (req, res) => {
  const page = db.staticPages[req.params.slug];

  if (!page) {
    return sendError(res, 'Page not found', 404);
  }

  return sendSuccess(res, page);
});

router.get('/education/:slug', (req, res) => {
  const page = db.education[req.params.slug];

  if (!page) {
    return sendError(res, 'Education page not found', 404);
  }

  return sendSuccess(res, page);
});

export default router;
