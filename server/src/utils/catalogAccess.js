// Central place for "who can see which part of the catalogue" rules.
//
// Roles:
//   - admin / sales  -> full catalogue, always.
//   - buyer          -> full catalogue if catalogAccess.mode === 'all',
//                       otherwise limited to the granted categories/collections.
//   - guest (no user) -> only the small teaser of products flagged showToGuests.

const FULL_ACCESS_ROLES = new Set(['admin', 'sales']);

export function hasFullCatalogAccess(user) {
  if (!user) return false;
  if (FULL_ACCESS_ROLES.has(user.role)) return true;
  return (user.catalogAccess?.mode || 'all') === 'all';
}

function idStrings(list) {
  return (list || []).map((value) => String(value?._id || value)).filter(Boolean);
}

export function allowedCategoryIds(user) {
  return idStrings(user?.catalogAccess?.categories);
}

export function allowedCollectionIds(user) {
  return idStrings(user?.catalogAccess?.collections);
}

// Product-query clauses (OR-ed together) describing what a logged-out guest may
// browse, driven by the admin-configured guest catalogue rules. Falls back to
// the legacy `showToGuests` teaser when no rules are configured.
export function guestCatalogueClauses(guestCatalogue) {
  const gc = guestCatalogue || {};
  const clauses = [];
  // includeFlagged defaults to true so an unconfigured store behaves exactly as
  // before (guests see the per-product teaser only).
  if (gc.includeFlagged !== false) clauses.push({ showToGuests: true });
  if (gc.categories?.length) clauses.push({ category: { $in: gc.categories } });
  if (gc.subCategories?.length) clauses.push({ subCategory: { $in: gc.subCategories } });
  if (gc.collections?.length) clauses.push({ collection: { $in: gc.collections } });
  if (gc.occasions?.length) clauses.push({ occasions: { $in: gc.occasions } });
  return clauses;
}

// Mongo filter fragment to merge into Product queries so a user only sees
// products they are allowed to. Returns:
//   - {}                      -> no restriction (full access)
//   - { $or: [...] }          -> restricted to granted categories/collections
//   - { _id: { $in: [] } }    -> restricted but nothing granted (sees nothing)
export function productAccessFilter(user, guestCatalogue) {
  // Logged-out guests see the admin-curated guest catalogue (teaser products
  // plus any selected categories / sub-categories / collections / occasions).
  if (!user) {
    const clauses = guestCatalogueClauses(guestCatalogue);
    if (!clauses.length) return { _id: { $in: [] } };
    return clauses.length === 1 ? clauses[0] : { $or: clauses };
  }
  if (hasFullCatalogAccess(user)) return {};

  const categories = allowedCategoryIds(user);
  const collections = allowedCollectionIds(user);

  const clauses = [];
  if (categories.length) clauses.push({ category: { $in: categories } });
  if (collections.length) clauses.push({ collection: { $in: collections } });

  if (!clauses.length) return { _id: { $in: [] } };
  return { $or: clauses };
}

// Whether a single (populated or raw) product is visible to the user.
export function canAccessProduct(user, product, guestCatalogue) {
  if (hasFullCatalogAccess(user)) return true;
  if (!product) return false;
  // Guests may open any product matched by the guest catalogue rules.
  if (!user) {
    const gc = guestCatalogue || {};
    if (gc.includeFlagged !== false && product.showToGuests) return true;

    const categoryId = String(product.category?._id || product.category || '');
    const subCategoryId = String(product.subCategory?._id || product.subCategory || '');
    const collectionId = String(product.collection?._id || product.collection || '');
    const occasions = Array.isArray(product.occasions) ? product.occasions : [];

    return (
      (categoryId && (gc.categories || []).map(String).includes(categoryId)) ||
      (subCategoryId && (gc.subCategories || []).map(String).includes(subCategoryId)) ||
      (collectionId && (gc.collections || []).map(String).includes(collectionId)) ||
      occasions.some((value) => (gc.occasions || []).includes(value))
    );
  }

  const categories = new Set(allowedCategoryIds(user));
  const collections = new Set(allowedCollectionIds(user));

  const categoryId = String(product.category?._id || product.category || '');
  const collectionId = String(product.collection?._id || product.collection || '');

  return (
    (categoryId && categories.has(categoryId)) ||
    (collectionId && collections.has(collectionId))
  );
}

// Filter a list of category documents down to those the user may see.
// `extraCategoryIds` lets the caller include parent categories of granted
// collections (so a buyer granted only a collection can still reach its category).
export function filterCategoriesForUser(user, categories, extraCategoryIds = [], guestCatalogue) {
  if (hasFullCatalogAccess(user)) return categories;
  // Guests see the categories the admin exposed via the guest catalogue rules.
  if (!user) {
    const gc = guestCatalogue || {};
    const allowed = new Set([...(gc.categories || []).map(String), ...extraCategoryIds.map(String)]);
    return categories.filter((cat) => allowed.has(String(cat._id)));
  }
  const allowed = new Set([...allowedCategoryIds(user), ...extraCategoryIds.map(String)]);
  return categories.filter((cat) => allowed.has(String(cat._id)));
}

// Filter a list of collection documents down to those the user may see.
// A collection is visible if it's directly granted OR its parent category is granted.
export function filterCollectionsForUser(user, collections, guestCatalogue) {
  if (hasFullCatalogAccess(user)) return collections;
  const gc = guestCatalogue || {};
  const allowedCats = new Set(user ? allowedCategoryIds(user) : (gc.categories || []).map(String));
  const allowedCols = new Set(user ? allowedCollectionIds(user) : (gc.collections || []).map(String));
  return collections.filter((col) => {
    const colId = String(col._id);
    const catId = String(col.category?._id || col.category || '');
    return allowedCols.has(colId) || (catId && allowedCats.has(catId));
  });
}

// Public-facing summary of a user's access, for the /me payload.
export function catalogAccessDto(user) {
  return {
    mode: hasFullCatalogAccess(user) ? 'all' : 'restricted',
    categories: allowedCategoryIds(user),
    collections: allowedCollectionIds(user),
  };
}
