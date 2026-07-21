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
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import {
  productAccessFilter,
  canAccessProduct,
  filterCategoriesForUser,
  filterCollectionsForUser,
  allowedCollectionIds,
} from '../utils/catalogAccess.js';
import { getGuestCatalogue } from '../utils/guestCatalogue.js';
import {
  asString,
  containsMatcher,
  escapeRegex,
  oneOf,
  parsePagination,
  toNumber,
} from '../utils/validation.js';

const router = express.Router();

// Populate req.user when a session cookie is present so catalogue endpoints can
// scope results to the buyer's granted categories/collections. Browsing routes
// additionally enforce login via requireAuth.
router.use(optionalAuth);

// For logged-out visitors, load the admin-configured guest catalogue rules once
// per request (cached) so every catalogue endpoint scopes results the same way.
router.use(async (req, _res, next) => {
  try {
    req.guestCatalogue = req.user ? null : await getGuestCatalogue();
  } catch (error) {
    req.guestCatalogue = null;
  }
  return next();
});

// Merge a base Mongo filter with a per-user access filter without clobbering an
// existing $or (e.g. search). Uses $and when the access filter is non-empty.
function withAccess(filter, accessFilter) {
  if (!accessFilter || Object.keys(accessFilter).length === 0) return filter;
  return { $and: [filter, accessFilter] };
}

// `occasions` is free text off the Excel import, so distinct() hands back nulls,
// blanks and stray casing. Normalise before either facet leaves the server.
function cleanOccasions(values) {
  const seen = new Map();
  for (const value of values || []) {
    const name = typeof value === 'string' ? value.trim() : '';
    if (!name) continue;
    const key = name.toLowerCase();
    if (!seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

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

router.get('/site/home', async (req, res) => {
  // Homepage teasers stay public, but a logged-in restricted buyer should only
  // see products from categories/collections they're allowed to view.
  const access = productAccessFilter(req.user, req.guestCatalogue);
  const [banners, newArrivals, bestSellers, testimonials, events, trustedBrands, siteSettings, popupAds] = await Promise.all([
    Banner.find({ active: true }).sort({ sortOrder: 1 }),
    Product.find({ isNewArrival: true, status: 'Active', ...access }).populate(productPopulate).limit(10),
    Product.find({ status: 'Active', ...access }).sort({ orderCount: -1 }).populate(productPopulate).limit(10),
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

// Browsing is open to guests, who are scoped to the showToGuests teaser via
// productAccessFilter; logged-in buyers see their full granted catalogue.
router.get('/products', async (req, res) => {
  const {
    category,
    subCategory,
    collection,
    occasion,
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
    const categoryNames = toNameList(category);
    if (categoryNames.length) {
      const categories = await Category.find({
        $or: categoryNames.flatMap((name) => [
          { name },
          { slug: name },
          { name: { $regex: escapeRegex(name), $options: 'i' } },
        ]),
      }).select('_id');
      if (categories.length) {
        filter.category = { $in: categories.map((item) => item._id) };
      }
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
  // Occasions live on the product as a free-text array (populated by the Excel
  // importer), not as a taxonomy collection, so this matches names directly.
  if (asString(occasion)) {
    const occasionNames = toNameList(occasion);
    if (occasionNames.length) {
      filter.occasions = { $in: occasionNames };
    }
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

  // Restrict everything to what this buyer is allowed to see.
  const accessFilter = productAccessFilter(req.user, req.guestCatalogue);
  const scopedFilter = withAccess(filter, accessFilter);

  // Facet list is scoped to access but NOT to the current filter, so the
  // Occasion dropdown keeps showing every option the buyer may pick.
  const [items, total, allCategories, allCollections, metalColors, allSubCategories, occasionValues] = await Promise.all([
    applySort(Product.find(scopedFilter).populate(productPopulate), sort)
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize),
    Product.countDocuments(scopedFilter),
    Category.find({ active: true }).sort({ name: 1 }),
    Collection.find({ active: true }).populate(['category', 'subCategory']).sort({ name: 1 }),
    MetalOption.find({ active: true }).sort({ name: 1 }),
    SubCategory.find({ active: true }).populate('category').sort({ name: 1 }),
    Product.distinct('occasions', withAccess({ status: 'Active' }, accessFilter)),
  ]);

  // Scope the filter facets to the buyer's access. Categories that only contain
  // a granted collection are kept so the buyer can still navigate to them.
  const collections = filterCollectionsForUser(req.user, allCollections, req.guestCatalogue);
  const grantedCollectionIds = new Set(
    req.user ? allowedCollectionIds(req.user) : (req.guestCatalogue?.collections || []).map(String),
  );
  const extraCategoryIds = allCollections
    .filter((col) => grantedCollectionIds.has(String(col._id)))
    .map((col) => String(col.category?._id || col.category || ''));
  const categories = filterCategoriesForUser(req.user, allCategories, extraCategoryIds, req.guestCatalogue);
  const visibleCategoryIds = new Set(categories.map((cat) => String(cat._id)));

  // A guest may be granted a sub-category directly (without its parent category),
  // so surface those in the facet too.
  const guestSubCategoryIds = new Set((req.guestCatalogue?.subCategories || []).map(String));
  const subCategories = allSubCategories.filter(
    (sub) =>
      visibleCategoryIds.has(String(sub.category?._id)) || guestSubCategoryIds.has(String(sub._id)),
  );

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
      occasions: cleanOccasions(occasionValues),
      metalColors: metalColors.map((item) => item.name),
      diamondRange: [0.1, 2.0],
      goldRange: [2, 20],
    },
  });
});

router.get('/products/new-arrivals', async (req, res) => {
  const access = productAccessFilter(req.user, req.guestCatalogue);
  const products = await Product.find({ isNewArrival: true, status: 'Active', ...access }).populate(productPopulate);
  return sendSuccess(res, products.map(serializeProduct));
});

router.get('/products/best-sellers', async (req, res) => {
  const access = productAccessFilter(req.user, req.guestCatalogue);
  const products = await Product.find({ status: 'Active', ...access }).sort({ orderCount: -1 }).populate(productPopulate);
  return sendSuccess(res, products.map(serializeProduct));
});

router.get('/products/:styleCode', async (req, res) => {
  const product = await Product.findOne({ styleCode: req.params.styleCode }).populate(productPopulate);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  // Hide products outside the buyer's granted catalogue (same as not found).
  if (!canAccessProduct(req.user, product, req.guestCatalogue)) {
    return sendError(res, 'Product not found', 404);
  }

  const access = productAccessFilter(req.user, req.guestCatalogue);
  const related = await Product.find(
    withAccess(
      {
        _id: { $ne: product._id },
        status: 'Active',
        $or: [{ collection: product.collection?._id }, { category: product.category?._id }],
      },
      access,
    ),
  )
    .populate(productPopulate)
    .limit(6);

  return sendSuccess(res, { ...serializeProduct(product), relatedProducts: related.map(serializeProduct) });
});

router.get('/categories', requireAuth, async (req, res) => {
  const [categories, collections] = await Promise.all([
    Category.find({ active: true }).sort({ name: 1 }),
    Collection.find({ active: true }).select('category').sort({ name: 1 }),
  ]);
  const grantedCollectionIds = new Set(allowedCollectionIds(req.user));
  const extraCategoryIds = collections
    .filter((col) => grantedCollectionIds.has(String(col._id)))
    .map((col) => String(col.category?._id || col.category || ''));
  const visible = filterCategoriesForUser(req.user, categories, extraCategoryIds);
  return sendSuccess(res, visible.map(serializeTaxonomy));
});

router.get('/collections', requireAuth, async (req, res) => {
  const all = await Collection.find({ active: true }).populate(['category', 'subCategory']).sort({ name: 1 });
  const collections = filterCollectionsForUser(req.user, all);
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

// Powers the "Occasions" nav dropdown. Open to guests (scoped to the teaser
// catalogue by productAccessFilter) so the menu is never empty before sign-in.
router.get('/occasions', async (req, res) => {
  const access = productAccessFilter(req.user, req.guestCatalogue);
  const values = await Product.distinct('occasions', withAccess({ status: 'Active' }, access));
  return sendSuccess(res, cleanOccasions(values).map((name) => ({ name })));
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
