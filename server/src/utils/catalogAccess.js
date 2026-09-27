// Who may see which products. There are exactly two kinds of visitor:
//
//   signed out ("guest")  -> the admin-configured guest catalogue
//                            (SiteSettings.guestCatalogue): products flagged
//                            showToGuests, optionally every best seller and/or
//                            new arrival, plus any selected categories /
//                            sub-categories / collections / occasions.
//
//   signed in             -> admin & sales: the whole catalogue.
//                            buyer: the whole catalogue, unless their
//                            catalogAccess.mode is 'restricted', in which case
//                            only their granted categories / collections.
//
// One rule, one shape: every catalogue query merges productAccessFilter().
// Visible taxonomy (filter facets, nav menus) is NOT computed separately — it is
// derived from the products that survive this filter, via Product.distinct(), so
// a facet can never disagree with the results it claims to describe.

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

// Mongo filter fragment to merge into Product queries. Returns:
//   {}                    -> no restriction (full access)
//   { <field>: {$in} }    -> a single allowed dimension
//   { $or: [...] }        -> several allowed dimensions
//   { _id: { $in: [] } }  -> restricted, but nothing granted (sees nothing)
export function productAccessFilter(user, guestCatalogue) {
  if (hasFullCatalogAccess(user)) return {};

  const gc = guestCatalogue || {};
  const clauses = [];

  if (user) {
    // Restricted buyer: granted categories / collections.
    push(clauses, 'category', allowedCategoryIds(user));
    push(clauses, 'collection', allowedCollectionIds(user));
  } else {
    // Guest: the teaser flag defaults on, so an unconfigured store behaves as
    // it always did (guests see only per-product showToGuests picks).
    if (gc.includeFlagged !== false) clauses.push({ showToGuests: true });
    // Flag-based rules: catalogue-wide, so a product flagged best seller / new
    // arrival tomorrow reaches guests without anyone editing these settings.
    if (gc.includeBestSellers) clauses.push({ isBestSeller: true });
    if (gc.includeNewArrivals) clauses.push({ isNewArrival: true });
    push(clauses, 'category', gc.categories);
    push(clauses, 'subCategory', gc.subCategories);
    push(clauses, 'collection', gc.collections);
    push(clauses, 'occasions', gc.occasions);
  }

  if (!clauses.length) return { _id: { $in: [] } };
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

function push(clauses, field, values) {
  if (values?.length) clauses.push({ [field]: { $in: values } });
}

// Public-facing summary of a user's access, for the /me payload.
export function catalogAccessDto(user) {
  return {
    mode: hasFullCatalogAccess(user) ? 'all' : 'restricted',
    categories: allowedCategoryIds(user),
    collections: allowedCollectionIds(user),
  };
}
