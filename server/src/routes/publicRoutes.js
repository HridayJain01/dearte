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
import { PushSubscription } from '../models/PushSubscription.js';
import { getPushConfigStatus, validSubscription } from '../services/webPush.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { productAccessFilter } from '../utils/catalogAccess.js';
import { getGuestCatalogue } from '../utils/guestCatalogue.js';
import {
  asString,
  containsMatcher,
  escapeRegex,
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
      return query.sort({ isBestSeller: -1, orderCount: -1 });
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
    Product.find({ isBestSeller: true, status: 'Active', ...access }).sort({ orderCount: -1 }).populate(productPopulate).limit(10),
    // The home page shows one featured testimonial plus three, and only the
    // newest popup; the full testimonial list has its own endpoint.
    Testimonial.find({ status: 'Approved' }).sort({ createdAt: -1 }).limit(4),
    Event.find({ active: true }).sort({ date: 1 }).limit(6),
    TrustedBrand.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 }),
    SiteSettings.findOne(),
    PopupAd.find({ active: true }).sort({ createdAt: -1 }).limit(1),
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
  } = req.query;

  const filter = { status: 'Active' };

  // "Best Sellers" / "New Arrivals" name a subset of the catalogue, not an
  // ordering — both the nav links and the dropdown mean "show me only these".
  // Without this the page sorted the flagged ones first and still listed all 331.
  if (sort === 'best-sellers') filter.isBestSeller = true;
  if (sort === 'new-arrivals') filter.isNewArrival = true;

  // Every value below is coerced to a primitive string first. Express parses
  // `?status[$ne]=x` into an object, so passing query values straight into
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

  // Free-text search spans the product's own metadata plus the taxonomy it
  // points at (category / sub category / collection / metal colour), which live
  // in separate collections and so have to be resolved to ids first. Multiple
  // words are ANDed, so "rose gold studs" narrows instead of widening — each
  // word may land on a different field.
  const searchTerms = asString(search, { maxLength: 120 })
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (searchTerms.length) {
    const termClauses = await Promise.all(
      searchTerms.map(async (term) => {
        const matcher = containsMatcher(term, { maxLength: 120 });
        const byName = { $or: [{ name: matcher }, { slug: matcher }] };
        const [categoryIds, subCategoryIds, collectionIds, metalColorIds] = await Promise.all([
          Category.find(byName).select('_id'),
          SubCategory.find(byName).select('_id'),
          Collection.find(byName).select('_id'),
          MetalOption.find({ name: matcher }).select('_id'),
        ]);

        const clause = [
          { styleCode: matcher },
          { name: matcher },
          { description: matcher },
          { sku: matcher },
          { metalType: matcher },
          { metal: matcher },
          { diamondQuality: matcher },
          { settingType: matcher },
          { occasion: matcher },
          { occasions: matcher },
          { 'specifications.attribute': matcher },
          { 'specifications.value': matcher },
          { 'colorVariants.color': matcher },
        ];
        if (categoryIds.length) clause.push({ category: { $in: categoryIds.map((item) => item._id) } });
        if (subCategoryIds.length) clause.push({ subCategory: { $in: subCategoryIds.map((item) => item._id) } });
        if (collectionIds.length) clause.push({ collection: { $in: collectionIds.map((item) => item._id) } });
        if (metalColorIds.length) clause.push({ metalColor: { $in: metalColorIds.map((item) => item._id) } });

        return { $or: clause };
      }),
    );

    filter.$and = termClauses;
  }

  // Bounded so a caller cannot request the whole catalogue in one query.
  const { page: currentPage, limit: pageSize } = parsePagination({ page, limit });

  // Restrict everything to what this buyer is allowed to see.
  const accessFilter = productAccessFilter(req.user, req.guestCatalogue);
  const scopedFilter = withAccess(filter, accessFilter);

  // Facets are cross-filtered: each dropdown lists only the values that still
  // have products once every OTHER active filter is applied. Its own field is
  // excluded so the options already picked in that dropdown stay selectable and
  // siblings can still be added. This works in both directions — picking a
  // category narrows the sub-category list, and picking a sub-category narrows
  // the category list.
  const facetFilter = (excludeKey) => {
    const clone = { ...filter };
    delete clone[excludeKey];
    return withAccess(clone, accessFilter);
  };

  const [
    items,
    total,
    allCategories,
    allCollections,
    metalColors,
    allSubCategories,
    occasionValues,
    facetCategoryIds,
    facetSubCategoryIds,
    facetCollectionIds,
    facetMetalColorIds,
  ] = await Promise.all([
    applySort(Product.find(scopedFilter).populate(productPopulate), sort)
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize),
    Product.countDocuments(scopedFilter),
    Category.find({ active: true }).sort({ name: 1 }),
    Collection.find({ active: true }).select('name').sort({ name: 1 }),
    MetalOption.find({ active: true }).sort({ name: 1 }),
    SubCategory.find({ active: true }).populate('category').sort({ name: 1 }),
    Product.distinct('occasions', facetFilter('occasions')),
    Product.distinct('category', facetFilter('category')),
    Product.distinct('subCategory', facetFilter('subCategory')),
    Product.distinct('collection', facetFilter('collection')),
    Product.distinct('metalColor', facetFilter('metalColor')),
  ]);

  const toIdSet = (values) => new Set(values.filter(Boolean).map(String));
  const availableCategoryIds = toIdSet(facetCategoryIds);
  const availableSubCategoryIds = toIdSet(facetSubCategoryIds);
  const availableCollectionIds = toIdSet(facetCollectionIds);
  const availableMetalColorIds = toIdSet(facetMetalColorIds);

  // No second access check here: the distinct() calls above already ran through
  // accessFilter, so these ids ARE the taxonomy behind the products this visitor
  // can see. Keeping one source of truth is why a facet can't list a category
  // whose products are hidden, or hide a category whose products are shown.
  const collections = allCollections.filter((item) => availableCollectionIds.has(String(item._id)));
  const categories = allCategories.filter((cat) => availableCategoryIds.has(String(cat._id)));
  const subCategories = allSubCategories.filter((sub) => availableSubCategoryIds.has(String(sub._id)));

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
      metalColors: metalColors
        .filter((item) => availableMetalColorIds.has(String(item._id)))
        .map((item) => item.name),
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
  const products = await Product.find({ isBestSeller: true, status: 'Active', ...access }).sort({ orderCount: -1 }).populate(productPopulate);
  return sendSuccess(res, products.map(serializeProduct));
});

router.get('/products/:styleCode', async (req, res) => {
  const access = productAccessFilter(req.user, req.guestCatalogue);
  // A product outside the visitor's catalogue is a 404, same as a bad style code.
  const product = await Product.findOne(
    withAccess({ styleCode: req.params.styleCode }, access),
  ).populate(productPopulate);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

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

// Powers the "Products" nav dropdown (category -> sub category). Open to guests
// so the menu is never empty before sign-in — the category names are already
// public on the products page tiles, and /products still scopes the results
// themselves. A logged-in restricted buyer only sees their granted categories.
router.get('/nav/categories', async (req, res) => {
  // Only offer taxonomy the visitor can actually land on: a category or sub
  // category with no live product behind it opens an empty results page.
  const access = productAccessFilter(req.user, req.guestCatalogue);
  const stockedFilter = withAccess({ status: 'Active' }, access);

  const [categories, subCategories, stockedCategoryIds, stockedSubCategoryIds] = await Promise.all([
    Category.find({ active: true }).sort({ name: 1 }),
    SubCategory.find({ active: true }).populate('category').sort({ name: 1 }),
    Product.distinct('category', stockedFilter),
    Product.distinct('subCategory', stockedFilter),
  ]);

  const stockedCategories = new Set(stockedCategoryIds.filter(Boolean).map(String));
  const stockedSubCategories = new Set(stockedSubCategoryIds.filter(Boolean).map(String));
  const visible = categories.filter((cat) => stockedCategories.has(String(cat._id)));

  return sendSuccess(
    res,
    visible.map((cat) => ({
      ...serializeTaxonomy(cat),
      subCategories: subCategories
        .filter(
          (sub) =>
            String(sub.category?._id) === String(cat._id) && stockedSubCategories.has(String(sub._id)),
        )
        .map((sub) => sub.name),
    })),
  );
});

router.get('/collections', requireAuth, async (req, res) => {
  // Same rule as everywhere else: list the collections that still have a product
  // this user can see, so the menu never links to an empty results page.
  const access = productAccessFilter(req.user, req.guestCatalogue);
  const stockedIds = await Product.distinct('collection', withAccess({ status: 'Active' }, access));
  const collections = await Collection.find({ active: true, _id: { $in: stockedIds.filter(Boolean) } })
    .populate(['category', 'subCategory'])
    .sort({ name: 1 });
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

// Notifications for the installed app (services/webPush.js). The key is public by
// design: the phone needs it to subscribe. Blank means push is not set up yet.
router.get('/push/key', (_req, res) => sendSuccess(res, { publicKey: getPushConfigStatus().publicKey }));

// The app re-sends its subscription on every start. Upserting by endpoint keeps
// one row per phone, and a later sign-in links that phone to the buyer. Endpoints
// a push service has dropped are deleted by the next broadcast.
router.post('/push/subscribe', async (req, res) => {
  const subscription = validSubscription(req.body);
  if (!subscription) return sendError(res, 'Invalid push subscription', 400);
  await PushSubscription.updateOne(
    { endpoint: subscription.endpoint },
    { $set: { keys: subscription.keys, ...(req.user ? { user: req.user._id } : {}) } },
    { upsert: true },
  );
  return sendSuccess(res, null, 'Subscribed');
});

// The account page's "Notifications" switch turning off. Knowing the endpoint is
// proof enough: only the phone that holds it can read it.
router.post('/push/unsubscribe', async (req, res) => {
  const endpoint = asString(req.body?.endpoint, { maxLength: 1000 });
  if (endpoint) await PushSubscription.deleteOne({ endpoint });
  return sendSuccess(res, null, 'Unsubscribed');
});

export default router;
