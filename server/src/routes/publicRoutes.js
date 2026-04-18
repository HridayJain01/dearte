import express from 'express';
import {
  Banner,
  Category,
  Collection,
  Event,
  MetalOption,
  PopupAd,
  Product,
  SiteSettings,
  SubCategory,
  Testimonial,
} from '../models/index.js';
import { seedData } from '../data/seed.js';
import { sendError, sendSuccess } from '../utils/responses.js';
import {
  serializeProduct,
  serializeTaxonomy,
  serializeMetalOption,
} from '../utils/serializers.js';

const router = express.Router();

const productPopulate = [
  { path: 'category' },
  { path: 'subCategory' },
  { path: 'collection' },
  { path: 'metalColor' },
];

function applySort(query, sort) {
  switch (sort) {
    case 'diamond-asc':
      return query.sort({ diamondWeight: 1 });
    case 'diamond-desc':
      return query.sort({ diamondWeight: -1 });
    case 'gold-asc':
      return query.sort({ goldWeight: 1 });
    case 'gold-desc':
      return query.sort({ goldWeight: -1 });
    case 'best-sellers':
      return query.sort({ orderCount: -1 });
    case 'new-arrivals':
      return query.sort({ isNewArrival: -1, createdAt: -1 });
    default:
      return query.sort({ createdAt: -1 });
  }
}

router.get('/site/home', async (_req, res) => {
  const [banners, newArrivals, bestSellers, testimonials, siteSettings, popupAds] = await Promise.all([
    Banner.find({ active: true }).sort({ sortOrder: 1 }),
    Product.find({ isNewArrival: true, status: 'Active' }).populate(productPopulate).limit(10),
    Product.find({ status: 'Active' }).sort({ orderCount: -1 }).populate(productPopulate).limit(10),
    Testimonial.find({ status: 'Approved' }).sort({ createdAt: -1 }),
    SiteSettings.findOne(),
    PopupAd.find({ active: true }).sort({ createdAt: -1 }),
  ]);

  return sendSuccess(res, {
    banners: banners.map((banner) => ({
      id: String(banner._id),
      title: banner.title,
      subtitle: banner.subtitle,
      ctaLabel: banner.ctaLabel,
      ctaLink: banner.ctaLink,
      image: banner.image?.secureUrl || '',
      active: banner.active,
    })),
    newArrivals: newArrivals.map(serializeProduct),
    bestSellers: bestSellers.map(serializeProduct),
    companyInfo: seedData.companyInfo,
    testimonials: testimonials.map((item) => ({
      id: String(item._id),
      name: item.name,
      company: item.company,
      rating: item.rating,
      status: item.status,
      review: item.review,
      avatar: item.avatar?.secureUrl || '',
    })),
    siteSettings: siteSettings || seedData.siteSettings,
    popupAds: popupAds.map((item) => ({
      id: String(item._id),
      image: item.image?.secureUrl || '',
      frequency: item.frequency,
      startDate: item.startDate,
      endDate: item.endDate,
      active: item.active,
    })),
  });
});

router.get('/products', async (req, res) => {
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

  const filter = { status: 'Active' };

  if (category) {
    const categories = await Category.find({
      $or: [{ name: category }, { slug: category }, { name: { $regex: String(category), $options: 'i' } }],
    }).select('_id');
    if (categories.length) {
      filter.category = { $in: categories.map((item) => item._id) };
    }
  }
  if (subCategory) {
    const names = String(subCategory).split(',').map((item) => item.trim()).filter(Boolean);
    const subCategories = await SubCategory.find({ name: { $in: names } }).select('_id');
    filter.subCategory = { $in: subCategories.map((item) => item._id) };
  }
  if (collection) {
    const names = String(collection).split(',').map((item) => item.trim()).filter(Boolean);
    const collectionsFound = await Collection.find({ name: { $in: names } }).select('_id');
    filter.collection = { $in: collectionsFound.map((item) => item._id) };
  }
  if (metalColor) {
    const names = String(metalColor).split(',').map((item) => item.trim()).filter(Boolean);
    const colors = await MetalOption.find({ name: { $in: names } }).select('_id');
    filter.metalColor = { $in: colors.map((item) => item._id) };
  }
  if (stockType) filter.stockType = stockType;
  if (diamondMin || diamondMax) {
    filter.diamondWeight = {};
    if (diamondMin) filter.diamondWeight.$gte = Number(diamondMin);
    if (diamondMax) filter.diamondWeight.$lte = Number(diamondMax);
  }
  if (goldMin || goldMax) {
    filter.goldWeight = {};
    if (goldMin) filter.goldWeight.$gte = Number(goldMin);
    if (goldMax) filter.goldWeight.$lte = Number(goldMax);
  }
  if (search) {
    filter.$or = [
      { styleCode: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const currentPage = Number(page);
  const pageSize = Number(limit);

  const [items, total, categories, collections, metalColors] = await Promise.all([
    applySort(Product.find(filter).populate(productPopulate), sort)
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize),
    Product.countDocuments(filter),
    Category.find({ active: true }).sort({ name: 1 }),
    Collection.find({ active: true }).populate(['category', 'subCategory']).sort({ name: 1 }),
    MetalOption.find({ active: true }).sort({ name: 1 }),
  ]);

  const subCategories = await SubCategory.find({ active: true }).populate('category').sort({ name: 1 });

  return sendSuccess(res, {
    items: items.map(serializeProduct),
    total,
    page: currentPage,
    totalPages: Math.ceil(total / pageSize),
    filters: {
      categories: categories.map((cat) => ({
        ...serializeTaxonomy(cat),
        subCategories: subCategories
          .filter((sub) => String(sub.category?._id) === String(cat._id))
          .map((sub) => sub.name),
      })),
      collections: collections.map((item) => ({
        id: String(item._id),
        name: item.name,
      })),
      metalColors: metalColors.map((item) => item.name),
      diamondRange: [0.1, 2.0],
      goldRange: [2, 20],
    },
  });
});

router.get('/products/new-arrivals', async (_req, res) => {
  const products = await Product.find({ isNewArrival: true, status: 'Active' }).populate(productPopulate);
  return sendSuccess(res, products.map(serializeProduct));
});

router.get('/products/best-sellers', async (_req, res) => {
  const products = await Product.find({ status: 'Active' }).sort({ orderCount: -1 }).populate(productPopulate);
  return sendSuccess(res, products.map(serializeProduct));
});

router.get('/products/:styleCode', async (req, res) => {
  const product = await Product.findOne({ styleCode: req.params.styleCode }).populate(productPopulate);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  const related = await Product.find({
    _id: { $ne: product._id },
    status: 'Active',
    $or: [{ collection: product.collection?._id }, { category: product.category?._id }],
  })
    .populate(productPopulate)
    .limit(6);

  return sendSuccess(res, { ...serializeProduct(product), relatedProducts: related.map(serializeProduct) });
});

router.get('/categories', async (_req, res) => {
  const categories = await Category.find({ active: true }).sort({ name: 1 });
  return sendSuccess(res, categories.map(serializeTaxonomy));
});

router.get('/collections', async (_req, res) => {
  const collections = await Collection.find({ active: true }).populate(['category', 'subCategory']).sort({ name: 1 });
  return sendSuccess(
    res,
    collections.map((item) => ({
      id: String(item._id),
      name: item.name,
      categoryId: item.category ? String(item.category._id) : '',
      subCategoryId: item.subCategory ? String(item.subCategory._id) : '',
      image: item.image?.secureUrl || '',
    })),
  );
});

router.get('/events', async (_req, res) => {
  const events = await Event.find({ active: true }).sort({ date: 1 });
  return sendSuccess(
    res,
    events.map((event) => ({
      id: String(event._id),
      title: event.title,
      date: event.date,
      description: event.description,
      image: event.image?.secureUrl || '',
    })),
  );
});

router.get('/testimonials', async (_req, res) => {
  const testimonials = await Testimonial.find({ status: 'Approved' }).sort({ createdAt: -1 });
  return sendSuccess(
    res,
    testimonials.map((item) => ({
      id: String(item._id),
      name: item.name,
      company: item.company,
      rating: item.rating,
      status: item.status,
      review: item.review,
      avatar: item.avatar?.secureUrl || '',
    })),
  );
});

router.get('/careers', (_req, res) => sendSuccess(res, seedData.careers));
router.get('/faq', (_req, res) => sendSuccess(res, seedData.faq));
router.get('/site/contact', async (_req, res) => {
  const siteSettings = await SiteSettings.findOne();
  return sendSuccess(res, siteSettings || seedData.siteSettings);
});

router.get('/site/static/:slug', (req, res) => {
  const page = seedData.staticPages[req.params.slug];

  if (!page) {
    return sendError(res, 'Page not found', 404);
  }

  return sendSuccess(res, page);
});

router.get('/education/:slug', (req, res) => {
  const page = seedData.education[req.params.slug];
  if (!page) {
    return sendError(res, 'Education page not found', 404);
  }

  return sendSuccess(res, page);
});

export default router;
