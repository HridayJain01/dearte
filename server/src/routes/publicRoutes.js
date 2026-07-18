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
  TrustedBrand,
} from '../models/index.js';
import { seedData } from '../data/seed.js';
import { sendError, sendSuccess } from '../utils/responses.js';
import {
  serializeProduct,
  serializeTaxonomy,
  serializeMetalOption,
  serializeTrustedBrand,
} from '../utils/serializers.js';
import { sanitizeSiteSettingsForPublic } from '../utils/siteSettingsPublic.js';
import {
  asString,
  containsMatcher,
  escapeRegex,
  oneOf,
  parsePagination,
  toNumber,
} from '../utils/validation.js';

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
  const [banners, newArrivals, bestSellers, testimonials, events, trustedBrands, siteSettings, popupAds] = await Promise.all([
    Banner.find({ active: true }).sort({ sortOrder: 1 }),
    Product.find({ isNewArrival: true, status: 'Active' }).populate(productPopulate).limit(10),
    Product.find({ status: 'Active' }).sort({ orderCount: -1 }).populate(productPopulate).limit(10),
    Testimonial.find({ status: 'Approved' }).sort({ createdAt: -1 }),
    Event.find({ active: true }).sort({ date: 1 }).limit(6),
    TrustedBrand.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 }),
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
    events: events.map((event) => ({
      id: String(event._id),
      title: event.title,
      date: event.date,
      description: event.description,
      image: event.image?.secureUrl || '',
    })),
    trustedBrands: trustedBrands.map(serializeTrustedBrand),
    siteSettings: sanitizeSiteSettingsForPublic(siteSettings) || seedData.siteSettings,
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

  // Every value below is coerced to a primitive string first. Express parses
  // `?stockType[$ne]=x` into an object, so passing query values straight into
  // a filter would let a caller inject Mongo operators. User text that reaches
  // $regex is escaped so it matches literally instead of compiling into a
  // pattern that can hang the event loop.
  const toNameList = (value) =>
    asString(value, { maxLength: 500 })
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 25);

  if (asString(category)) {
    const safeCategory = asString(category);
    const categories = await Category.find({
      $or: [
        { name: safeCategory },
        { slug: safeCategory },
        { name: { $regex: escapeRegex(safeCategory), $options: 'i' } },
      ],
    }).select('_id');
    if (categories.length) {
      filter.category = { $in: categories.map((item) => item._id) };
    }
  }
  if (asString(subCategory)) {
    const subCategories = await SubCategory.find({ name: { $in: toNameList(subCategory) } }).select('_id');
    filter.subCategory = { $in: subCategories.map((item) => item._id) };
  }
  if (asString(collection)) {
    const collectionsFound = await Collection.find({ name: { $in: toNameList(collection) } }).select('_id');
    filter.collection = { $in: collectionsFound.map((item) => item._id) };
  }
  if (asString(metalColor)) {
    const colors = await MetalOption.find({ name: { $in: toNameList(metalColor) } }).select('_id');
    filter.metalColor = { $in: colors.map((item) => item._id) };
  }

  const safeStockType = oneOf(stockType, ['Ready Stock', 'Made to Order']);
  if (safeStockType) filter.stockType = safeStockType;

  const diamondLow = toNumber(diamondMin);
  const diamondHigh = toNumber(diamondMax);
  if (diamondLow !== null || diamondHigh !== null) {
    filter.diamondWeight = {};
    if (diamondLow !== null) filter.diamondWeight.$gte = diamondLow;
    if (diamondHigh !== null) filter.diamondWeight.$lte = diamondHigh;
  }

  const goldLow = toNumber(goldMin);
  const goldHigh = toNumber(goldMax);
  if (goldLow !== null || goldHigh !== null) {
    filter.goldWeight = {};
    if (goldLow !== null) filter.goldWeight.$gte = goldLow;
    if (goldHigh !== null) filter.goldWeight.$lte = goldHigh;
  }

  const searchMatcher = containsMatcher(search, { maxLength: 120 });
  if (searchMatcher) {
    filter.$or = [
      { styleCode: searchMatcher },
      { name: searchMatcher },
      { description: searchMatcher },
    ];
  }

  // Bounded so a caller cannot request the whole catalogue in one query.
  const { page: currentPage, limit: pageSize } = parsePagination({ page, limit });

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

router.get('/trusted-by', async (_req, res) => {
  const trustedBrands = await TrustedBrand.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 });
  return sendSuccess(res, trustedBrands.map(serializeTrustedBrand));
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
  return sendSuccess(res, sanitizeSiteSettingsForPublic(siteSettings) || seedData.siteSettings);
});

// `Object.hasOwn` guards the lookup: a bare index would resolve `__proto__` or
// `constructor` and leak internal objects to an unauthenticated caller.
router.get('/site/static/:slug', (req, res) => {
  const slug = String(req.params.slug);

  if (!Object.hasOwn(seedData.staticPages, slug)) {
    return sendError(res, 'Page not found', 404);
  }

  return sendSuccess(res, seedData.staticPages[slug]);
});

router.get('/education/:slug', (req, res) => {
  const slug = String(req.params.slug);

  if (!Object.hasOwn(seedData.education, slug)) {
    return sendError(res, 'Education page not found', 404);
  }

  return sendSuccess(res, seedData.education[slug]);
});

export default router;
