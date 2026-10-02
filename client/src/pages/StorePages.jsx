import { ChevronDown, Download, MessageCircleMore, Pencil, Search, Share2, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { useProducts, useProduct } from '../hooks/useProducts';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { useSiteSettings, whatsappHref } from '../hooks/useSiteSettings';
import { recentlyViewed, rememberViewed } from '../utils/recentlyViewed';
import { orderService } from '../services/orderService';
import { userService } from '../services/userService';
import { BottomSheet, Button, EmptyState, ErrorState, LoadingBlock, PageError, Panel, SectionHeading, StatusBadge, WeightDisclaimerTrigger } from '../components/ui/Primitives';
import { Select } from '../components/ui/Select';
import { ProductCard } from '../components/product/ProductCard';
import { Seo } from '../components/seo/Seo';
import { FilterSheetButton, FilterSidebar } from '../components/product/ProductFilters';
import { SizeChartModal } from '../components/product/SizeChartModal';
import { CombinationSelector } from '../components/product/CombinationSelector';
import { CatalogueBuilder, PhotoSearchButton, RestockPanel, SmartSearchButton } from '../components/ai/StorefrontAi';
import { defaultSizeFor, resolveSizeChart, sizeLabel } from '../data/sizeMaster';
import { cdnImage, formatDate, formatWeight } from '../utils/formatters';
import { DIAMOND_QUALITY } from '../utils/constants';
import { routeSeo } from '../utils/seoRoutes';
import { breadcrumbSchema, clampDescription, itemListSchema, productSchema } from '../utils/seo';
import { errorMessage } from '../utils/errors';
import { productDescription, productDisplayName, productTitle } from '../utils/productTitle';
import {
  customizationChips,
  customizationSummary,
  diamondWeightFor,
  goldColorSwatch,
  goldWeightFor,
  totalDiamondWeight,
  totalGoldWeight,
  totalPieces,
  variantImage,
  variantImages,
} from '../utils/productVariants';
import { useCollections, useOccasions } from '../hooks/useProducts';

function ShopCategoryDiamondIcon({ className }) {
  // Strokes inherit currentColor so the icon stays inside the token system.
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M24 6L41 18.5L24 42L7 18.5L24 6Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M7 18.5H41" stroke="currentColor" strokeWidth="1.35" />
      <path d="M13.5 18.5L24 6L34.5 18.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function ShopCategoryCard({ label, categorySlug, imageSrc, className, to }) {
  const target = to || `/products?category=${encodeURIComponent(categorySlug)}`;

  return (
    <Link
      to={target}
      className={`group relative isolate block overflow-hidden bg-[var(--color-surface-alt)] ${className ?? ''}`}
    >
      <img
        src={imageSrc}
        alt=""
        // This tile grid is the top block of /products, so it holds the page's
        // LCP element whenever no filter is applied.
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition duration-[480ms] ease-out group-hover:scale-[1.03]"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-black/62 via-black/28 to-transparent"
        aria-hidden
      />
      <span className="absolute bottom-[1.125rem] left-[1.125rem] z-10 text-[1.0625rem] font-medium leading-tight tracking-[-0.01em] text-white sm:bottom-5 sm:left-5 sm:text-xl">
        {label}
      </span>
    </Link>
  );
}

// `categorySlug` must match a category name in the product master
// (server/src/data/taxonomy.js) or the tile links to an empty result set.
const PRODUCT_CATEGORY_TILES = [
  { label: 'Rings', categorySlug: 'Rings', imageSrc: '/images/shop-category/rings.jpg' },
  { label: 'Earring', categorySlug: 'Earring', imageSrc: '/images/shop-category/earrings.jpg' },
  { label: 'Bracelet', categorySlug: 'Bracelet', imageSrc: '/images/shop-category/bracelets.jpg' },
  { label: 'Pendant', categorySlug: 'Pendant', imageSrc: '/images/shop-category/pendants.jpg' },
];

/** Shop-by-collection landing: curated collection cards like Ocean Collection, Lunar Collection, and more. */
export function CollectionsPage() {
  const { data, isLoading } = useCollections();

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock label="Loading collections..." /></div>;
  }

  return (
    <section className="page-shell animate-page-enter pb-10 pt-6 sm:pb-20 sm:pt-16 md:pb-28 md:pt-20">
      <Seo
        {...routeSeo('/collections')}
        path="/collections"
        schema={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Collections', path: '/collections' },
          ]),
          itemListSchema(
            data.map((collection) => ({
              name: collection.name,
              path: `/products?collection=${encodeURIComponent(collection.name)}`,
            })),
            { name: 'DeArte jewellery collections' },
          ),
        ]}
      />

      <header className="mb-6 text-center sm:mb-12 md:mb-14">
        <ShopCategoryDiamondIcon className="mx-auto h-9 w-9 text-[var(--color-accent)] sm:h-12 sm:w-12 md:h-[52px] md:w-[52px]" />
        <h1
          className="mt-4 text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-primary)] sm:mt-5 sm:text-[2rem] md:text-[2.25rem]"
        >
          Shop by Collection
        </h1>
        <p
          className="mx-auto mt-3 max-w-[40rem] text-[0.9375rem] leading-relaxed text-[var(--color-text-muted)] sm:text-lg"
        >
          Browse the curated collection families that shape each story, mood, and launch.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((collection) => (
          <Link
            key={collection.id}
            to={`/products?collection=${encodeURIComponent(collection.name)}`}
            className="group overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] transition duration-300 hover:-translate-y-1 hover:border-[var(--color-border-active)] hover:shadow-lg"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-alt)]">
              {collection.image ? (
                <img
                  src={cdnImage(collection.image, 900)}
                  alt={collection.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            </div>
            <div className="space-y-1 p-2.5 sm:space-y-2 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.2em]">Collection</p>
              <h2 className="lux-heading text-[15px] text-[var(--color-text)] sm:text-2xl">{collection.name}</h2>
              <p className="text-[12px] leading-snug text-[var(--color-text-muted)] sm:text-sm">Tap to shop the pieces curated under this collection story.</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Shop-by-occasion landing: mirrors the Collections frame, cards jump to the occasion-filtered products. */
export function OccasionsPage() {
  const { data, isLoading } = useOccasions();

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock label="Loading occasions..." /></div>;
  }

  const occasions = data || [];

  return (
    <section className="page-shell animate-page-enter pb-10 pt-6 sm:pb-20 sm:pt-16 md:pb-28 md:pt-20">
      <Seo
        {...routeSeo('/occasions')}
        path="/occasions"
        schema={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Occasions', path: '/occasions' },
          ]),
          itemListSchema(
            occasions.map((occasion) => ({
              name: occasion.name,
              path: `/products?occasion=${encodeURIComponent(occasion.name)}`,
            })),
            { name: 'Shop jewellery by occasion' },
          ),
        ]}
      />

      <header className="mb-6 text-center sm:mb-12 md:mb-14">
        <ShopCategoryDiamondIcon className="mx-auto h-9 w-9 text-[var(--color-accent)] sm:h-12 sm:w-12 md:h-[52px] md:w-[52px]" />
        <h1
          className="mt-4 text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-primary)] sm:mt-5 sm:text-[2rem] md:text-[2.25rem]"
        >
          Shop by Occasion
        </h1>
        <p
          className="mx-auto mt-3 max-w-[40rem] text-[0.9375rem] leading-relaxed text-[var(--color-text-muted)] sm:text-lg"
        >
          Find the piece made for the moment — bridal vows, everyday shine, or the perfect gift.
        </p>
      </header>

      {occasions.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {occasions.map((occasion) => (
            <Link
              key={occasion.name}
              to={`/products?occasion=${encodeURIComponent(occasion.name)}`}
              className="group overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] transition duration-300 hover:-translate-y-1 hover:border-[var(--color-border-active)] hover:shadow-lg"
            >
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--color-primary-bg)] via-[var(--color-surface-alt)] to-[var(--color-surface)]">
                <ShopCategoryDiamondIcon className="h-14 w-14 text-[var(--color-primary)] opacity-60 transition duration-500 group-hover:scale-[1.08] group-hover:opacity-90 sm:h-16 sm:w-16" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 via-black/5 to-transparent" />
              </div>
              <div className="space-y-1 p-2.5 sm:space-y-2 sm:p-5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.2em]">Occasion</p>
                <h2 className="lux-heading text-[15px] text-[var(--color-text)] sm:text-2xl">{occasion.name}</h2>
                <p className="text-[12px] leading-snug text-[var(--color-text-muted)] sm:text-sm">Tap to shop the pieces styled for {occasion.name.toLowerCase()}.</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No occasions yet"
          description="Occasions are drawn from the catalogue. Check back once pieces have been tagged."
          action={<Button as={Link} to="/products">Browse products</Button>}
        />
      )}
    </section>
  );
}

// Filter-dropdown picks live in the URL rather than app state, so a filtered
// view can be bookmarked or shared and Back returns to it. The keys differ from
// the nav's single-value `category`/`collection`/... params, which name the page
// and its canonical; a ticked checkbox does neither.
const FILTER_PARAMS = { category: 'cat', subCategory: 'sub', collection: 'coll', occasion: 'occ', metalColor: 'metal' };
const RANGE_PARAMS = ['diamondMin', 'diamondMax', 'goldMin', 'goldMax'];

function ProductGridSkeleton() {
  return (
    <div className="page-shell section-gap">
      <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading products">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="animate-pulse">
            <div className="h-40 bg-[var(--color-surface-alt)] sm:h-72" />
            <div className="mt-3 h-2.5 w-1/3 bg-[var(--color-surface-alt)]" />
            <div className="mt-2 h-3.5 w-3/4 bg-[var(--color-surface-alt)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductListPage() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = category ? decodeURIComponent(category) : searchParams.get('category') || '';
  // Set by the header's category dropdown, which links straight to a sub category.
  const activeSubCategory = searchParams.get('subCategory') || '';
  const activeCollection = searchParams.get('collection') || '';
  const activeOccasion = searchParams.get('occasion') || '';
  const activeSearch = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const filters = useMemo(
    () => ({
      ...Object.fromEntries(Object.entries(FILTER_PARAMS).map(([field, key]) => [field, searchParams.getAll(key)])),
      ...Object.fromEntries(RANGE_PARAMS.map((field) => [field, searchParams.get(field) || ''])),
    }),
    [searchParams],
  );
  const [searchDraft, setSearchDraft] = useState(activeSearch);

  // Any refinement starts the results again from page 1.
  const updateParams = (mutate) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete('page');
        mutate(next);
        return next;
      },
      { replace: true },
    );

  const setFilter = (field, value) =>
    updateParams((next) => {
      const key = FILTER_PARAMS[field] || field;
      next.delete(key);
      [].concat(value).filter((item) => item !== '').forEach((item) => next.append(key, item));
    });

  const setSort = (value) => updateParams((next) => (value ? next.set('sort', value) : next.delete('sort')));

  // Pushed, not replaced, so Back steps through pages like any other site.
  const setPage = (value) =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value > 1) next.set('page', String(value));
      else next.delete('page');
      return next;
    });

  // Smart search describes a fresh query, so it replaces every filter rather
  // than stacking on them. Pushed, so Back returns to the previous results.
  const applySmartSearch = (result) =>
    setSearchParams(() => {
      const next = new URLSearchParams();
      Object.entries(FILTER_PARAMS).forEach(([field, key]) => (result[field] || []).forEach((value) => next.append(key, value)));
      RANGE_PARAMS.forEach((field) => {
        if (result[field] !== null && result[field] !== undefined && result[field] !== '') next.set(field, String(result[field]));
      });
      if (result.search) next.set('search', result.search);
      if (result.sort) next.set('sort', result.sort);
      return next;
    });

  // Keep the box in sync when the URL changes from outside (header search,
  // back button, a shared link).
  useEffect(() => {
    setSearchDraft(activeSearch);
  }, [activeSearch]);

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    if (searchDraft === activeSearch) return undefined;
    const timer = setTimeout(() => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.delete('page');
          if (searchDraft.trim()) next.set('search', searchDraft.trim());
          else next.delete('search');
          return next;
        },
        { replace: true },
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [searchDraft, activeSearch, setSearchParams]);

  const params = useMemo(
    () => ({
      page,
      limit: 24,
      category: activeCategory || filters.category.join(','),
      collection: activeCollection || filters.collection.join(','),
      occasion: activeOccasion || filters.occasion.join(','),
      search: activeSearch,
      sort,
      subCategory: activeSubCategory || filters.subCategory.join(','),
      metalColor: filters.metalColor.join(','),
      diamondMin: filters.diamondMin,
      diamondMax: filters.diamondMax,
      goldMin: filters.goldMin,
      goldMax: filters.goldMax,
    }),
    [activeCategory, activeSubCategory, activeCollection, activeOccasion, activeSearch, filters, page, sort],
  );

  const { data, isLoading, isFetching, isPlaceholderData, isLoadingError, error, refetch } = useProducts(params);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const dropSearchParam = (key) => updateParams((next) => next.delete(key));

  const clearAll = () => {
    setSearchParams(sort ? { sort } : {});
    if (category) navigate('/products');
  };

  // Chips mirror every active refinement, whether it came from the URL (a
  // category route / query param) or from the filter dropdowns, so each one
  // needs its own removal path.
  const activeChips = [
    activeCategory && {
      key: `url:category:${activeCategory}`,
      label: activeCategory,
      // A /products/:category route has no query param to drop.
      onRemove: () => (category ? navigate('/products') : dropSearchParam('category')),
    },
    activeSubCategory && {
      key: `url:subCategory:${activeSubCategory}`,
      label: activeSubCategory,
      onRemove: () => dropSearchParam('subCategory'),
    },
    activeCollection && {
      key: `url:collection:${activeCollection}`,
      label: activeCollection,
      onRemove: () => dropSearchParam('collection'),
    },
    activeOccasion && {
      key: `url:occasion:${activeOccasion}`,
      label: activeOccasion,
      onRemove: () => dropSearchParam('occasion'),
    },
    activeSearch && {
      key: `url:search:${activeSearch}`,
      label: `Search: ${activeSearch}`,
      onRemove: () => setSearchDraft(''),
    },
    ...['category', 'subCategory', 'collection', 'occasion', 'metalColor'].flatMap((field) =>
      filters[field].map((value) => ({
        key: `${field}:${value}`,
        label: value,
        onRemove: () =>
          setFilter(
            field,
            filters[field].filter((item) => item !== value),
          ),
      })),
    ),
    ...[
      ['diamondMin', 'Diamond Min'],
      ['diamondMax', 'Diamond Max'],
      ['goldMin', 'Gold Min'],
      ['goldMax', 'Gold Max'],
    ]
      .filter(([field]) => filters[field] !== '' && filters[field] !== undefined && filters[field] !== null)
      .map(([field, label]) => ({
        key: field,
        label: `${label}: ${filters[field]}`,
        onRemove: () => setFilter(field, ''),
      })),
  ].filter(Boolean);

  // Only the very first load (no data yet) blanks the page. Once we have
  // results, filter changes keep the previous list on screen and update in
  // place — see `placeholderData: keepPreviousData` in useProducts.
  if (isLoadingError) {
    return <PageError error={error} onRetry={refetch} retrying={isFetching} />;
  }
  if (isLoading || !data) {
    return <ProductGridSkeleton />;
  }

  const isRefreshing = isFetching && isPlaceholderData;

  // A facet view is a landing page in its own right ("diamond stud earrings"),
  // so it gets its own title, description and canonical rather than being
  // folded into /products. Sort and page are left out of the canonical: they
  // reorder the same set, they do not make a different page.
  const facetLabel = [activeSubCategory, activeCategory, activeCollection, activeOccasion].filter(Boolean).join(' ');
  const canonicalParams = new URLSearchParams();
  if (activeCategory) canonicalParams.set('category', activeCategory);
  if (activeSubCategory) canonicalParams.set('subCategory', activeSubCategory);
  if (activeCollection) canonicalParams.set('collection', activeCollection);
  if (activeOccasion) canonicalParams.set('occasion', activeOccasion);
  const canonicalQuery = canonicalParams.toString();
  const canonicalPath = canonicalQuery ? `/products?${canonicalQuery}` : '/products';

  const listSeo = facetLabel
    ? {
        title: `${facetLabel} — Wholesale Jewellery`,
        description: clampDescription(
          `Browse DeArte's ${facetLabel.toLowerCase()} range: lab-grown diamond pieces in 9K, 14K and 18K gold, filterable by metal colour, gold weight and diamond weight for trade buyers.`,
        ),
      }
    : routeSeo('/products');

  // Search results and pages 2+ are kept out of the index: they are permutations
  // of pages that are already indexed, and letting a crawler enumerate them is
  // how a modest catalogue turns into thousands of near-duplicate URLs.
  const listNoindex = Boolean(activeSearch) || page > 1;

  return (
    <section className="page-shell section-gap">
      <Seo
        {...listSeo}
        path={canonicalPath}
        noindex={listNoindex}
        schema={
          listNoindex
            ? null
            : breadcrumbSchema(
                [
                  { name: 'Home', path: '/' },
                  { name: 'Products', path: '/products' },
                  facetLabel ? { name: facetLabel, path: canonicalPath } : null,
                ].filter(Boolean),
              )
        }
      />
      <SectionHeading
        as="h1"
        eyebrow="Products"
        title={activeSubCategory || activeCategory || activeCollection || activeOccasion || 'Shop by Product'}
      />
      {!isAuthenticated ? (
        <Panel className="mb-4 flex flex-col gap-2.5 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="text-[12px] leading-relaxed text-[var(--color-text-muted)] sm:text-sm">
            You're viewing a small preview of our catalogue. Sign in to your buyer account to browse the full collection.
          </p>
          <Button as={Link} to="/login" className="shrink-0">Sign in to see more</Button>
        </Panel>
      ) : null}
      <div className="space-y-3 sm:space-y-5">
        {/* A short row of tiles, not a 2x2 wall: the tiles used to fill the
            first screen and push every product below the fold. */}
        {!activeCategory && !activeSubCategory && !activeCollection && !activeOccasion && (
          <div className="snap-rail -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:gap-3 sm:px-0">
            {PRODUCT_CATEGORY_TILES.map((tile) => (
              <ShopCategoryCard
                key={tile.label}
                label={tile.label}
                categorySlug={tile.categorySlug}
                imageSrc={tile.imageSrc}
                className="h-24 w-32 flex-none snap-start sm:h-36 sm:w-60 lg:w-auto lg:flex-1"
              />
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)] sm:left-4 sm:h-4 sm:w-4" />
            <input
              id="product-search"
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search style, category, collection, metal"
              aria-label="Search products"
              className="min-h-10 w-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-9 text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-active)] sm:min-h-12 sm:py-3 sm:pl-11 sm:pr-11 sm:text-sm"
            />
            {searchDraft ? (
              <button
                type="button"
                onClick={() => setSearchDraft('')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] sm:right-2 sm:h-9 sm:w-9"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {/* Both render nothing unless switched on in AI Studio. */}
          <SmartSearchButton query={searchDraft} onApply={applySmartSearch} />
          <PhotoSearchButton />
        </div>
        <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-8">
          <aside aria-label="Filters" className="max-lg:hidden lg:sticky lg:top-28 lg:max-h-[calc(100svh-8rem)] lg:overflow-y-auto">
            <FilterSidebar filters={data.filters} activeFilters={filters} setFilter={setFilter} />
          </aside>

          <div className="min-w-0 space-y-3 sm:space-y-5">
            {/* Stays under the header while the grid scrolls on phones and
                tablets, so filters and sort are one tap away at any depth. */}
            <div className="sticky top-14 z-30 -mx-3 flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-primary-bg)]/95 px-3 py-2 backdrop-blur sm:top-[88px] lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
              <div className="lg:hidden">
                <FilterSheetButton total={data.total} onClear={clearAll} filters={data.filters} activeFilters={filters} setFilter={setFilter} />
              </div>
              <p className="min-w-0 flex-1 truncate text-[12px] text-[var(--color-text-muted)] sm:text-sm">
                {data.total} {data.total === 1 ? 'piece' : 'pieces'}
              </p>
              <Select
                className="w-40 shrink-0 sm:w-64"
                value={sort}
                onChange={setSort}
                options={[
                  { value: '', label: 'Featured' },
                  { value: 'diamond-asc', label: 'Diamond Wt. Low to High' },
                  { value: 'diamond-desc', label: 'Diamond Wt. High to Low' },
                  { value: 'gold-asc', label: 'Gold Wt. Low to High' },
                  { value: 'gold-desc', label: 'Gold Wt. High to Low' },
                  { value: 'best-sellers', label: 'Best Sellers' },
                  { value: 'new-arrivals', label: 'New Arrivals' },
                ]}
              />
            </div>

            {activeChips.length ? (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {activeChips.map((chip) => (
                  <span
                    key={chip.key}
                    className="flex items-center gap-1 border border-[var(--color-border)] bg-[var(--color-surface-alt)] pl-2.5 text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.08em]"
                  >
                    {chip.label}
                    <button
                      type="button"
                      onClick={chip.onRemove}
                      aria-label={`Remove filter ${chip.label}`}
                      className="flex h-10 w-10 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={clearAll}
                  className="min-h-10 px-1 text-[11px] uppercase tracking-[0.1em] text-[var(--color-primary)] underline sm:text-xs sm:tracking-[0.12em]"
                >
                  Clear all
                </button>
              </div>
            ) : null}

            <div
              className={`grid grid-cols-2 gap-3 transition-opacity duration-200 sm:gap-5 lg:grid-cols-3 2xl:grid-cols-4 ${
                isRefreshing ? 'pointer-events-none opacity-60' : 'opacity-100'
              }`}
            >
              {data.items.map((product, index) => (
                // The first row is the one that can hold the LCP element.
                <ProductCard key={product.id} product={product} priority={index < 4} />
              ))}
            </div>

            {/* One row at every width — stacked full-width pagers wasted three
                screens' worth of height on a phone. */}
            <div className="flex items-center justify-between gap-3">
              <Button variant="secondary" onClick={() => setPage(page - 1)} disabled={page === 1}>
                Previous
              </Button>
              <p className="text-[12px] text-[var(--color-text-muted)] sm:text-sm">
                Page {data.page} of {data.totalPages}
              </p>
              <Button variant="secondary" onClick={() => setPage(Math.min(data.totalPages, page + 1))} disabled={page >= data.totalPages}>
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const CARAT_COLUMNS = [
  ['18K', 'k18'],
  ['14K', 'k14'],
  ['9K', 'k9'],
];
// Weight rows the importer writes into specifications; the table below shows
// them from `weights` instead, so they are not listed twice.
const WEIGHT_SPEC_ROW = /^(gross|net|gold|diamond|colou?r ?stone)/i;

/**
 * Gross and net weight per karat as one small table (it used to be seven
 * boxes and most of a phone screen). The karat the buyer has picked is
 * highlighted. Styles imported before per-karat weights existed fall back to
 * their specification rows.
 */
function WeightTable({ product, carat }) {
  const weights = product.weights || {};
  const columns = CARAT_COLUMNS.filter(([, key]) => Number(weights.gross?.[key]) > 0 || Number(weights.net?.[key]) > 0);
  const specs = (product.specifications || []).filter((spec) => !columns.length || !WEIGHT_SPEC_ROW.test(String(spec.attribute || '').trim()));
  const diamond = Number(weights.diamond || product.diamondWeight || 0);
  const colourStone = Number(weights.colourStone || 0);
  const active = String(carat || '').replace(/\s/g, '').toUpperCase();

  return (
    <Panel>
      {columns.length ? (
        <table className="w-full text-left text-[13px] sm:text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              <th className="pb-2 font-normal">Weight (g)</th>
              {columns.map(([label]) => (
                <th key={label} className={`pb-2 text-right ${active === label ? 'font-semibold text-[var(--color-primary)]' : 'font-normal'}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Gross', 'gross'],
              ['Net', 'net'],
            ].map(([label, group]) => (
              <tr key={group} className="border-t border-[var(--color-border)]">
                <th className="py-2 font-normal text-[var(--color-text-muted)]">{label}</th>
                {columns.map(([columnLabel, key]) => (
                  <td
                    key={key}
                    className={`py-2 text-right tabular-nums ${active === columnLabel ? 'bg-[var(--color-surface-alt)] font-semibold text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}
                  >
                    {Number(weights[group]?.[key]) || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {columns.length && (diamond || colourStone) ? (
        <p className="mt-1 border-t border-[var(--color-border)] pt-2 text-[13px] text-[var(--color-text)] sm:text-sm">
          {diamond ? <>Diamond <span className="font-semibold tabular-nums">{diamond} ct</span></> : null}
          {diamond && colourStone ? ' · ' : null}
          {colourStone ? <>Colour stone <span className="font-semibold tabular-nums">{colourStone} ct</span></> : null}
        </p>
      ) : null}
      {specs.length ? (
        <div className={`grid grid-cols-2 gap-1.5 sm:gap-3 ${columns.length ? 'mt-3' : ''}`}>
          {specs.map((spec, specIndex) => (
            <div key={`${spec.attribute}-${specIndex}`} className="border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-2 sm:p-4">
              <p className="text-[11px] uppercase leading-tight tracking-[0.1em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.2em]">{spec.attribute}</p>
              <p className="mt-0.5 text-[13px] leading-tight text-[var(--color-text)] sm:mt-2 sm:text-sm">{spec.value}</p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-2.5 flex items-center gap-1.5 border-t border-[var(--color-border)] pt-2.5 text-[12px] text-[var(--color-text-muted)] sm:mt-3 sm:pt-3 sm:text-xs">
        <span>* All weights are approximate.</span>
        <WeightDisclaimerTrigger />
      </div>
    </Panel>
  );
}

export function ProductDetailPage() {
  const { styleCode } = useParams();
  const [activeImage, setActiveImage] = useState(0);
  const [note, setNote] = useState('');
  const [lineState, setLineState] = useState({ productId: null, lines: [], activeIndex: 0 });
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const { data, isLoading, isLoadingError, error, refetch, isFetching } = useProduct(styleCode);
  const { cart, addToCart } = useCart();
  const { wishlist, addToWishlist } = useWishlist();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [wishlistCollectionId, setWishlistCollectionId] = useState('');
  const settings = useSiteSettings();

  // Read before this visit is recorded, so the rail shows where the buyer came from.
  const recent = useMemo(
    () => (data ? recentlyViewed(user?.id).filter((item) => item.id !== data.id).slice(0, 8) : []),
    [data, user?.id],
  );
  useEffect(() => {
    if (data) rememberViewed(data, user?.id);
  }, [data, user?.id]);

  const sizeChart = useMemo(() => resolveSizeChart(data || {}), [data]);

  const availableGoldColors = data?.customizationOptions?.goldColors || [];
  const availableGoldCarats = data?.customizationOptions?.goldCarats || [];

  // The combination a fresh row starts from: the first photographed colour, and
  // the mid option of each remaining axis.
  const defaultCombination = {
    goldColor: data?.colorVariants?.[0]?.color || availableGoldColors[0] || '',
    goldCarat: availableGoldCarats[1] || availableGoldCarats[0] || '',
    diamondQuality: DIAMOND_QUALITY,
    size: sizeChart ? defaultSizeFor(data) : '',
    quantity: 1,
  };

  // Derived rather than synced through an effect: until the buyer touches the
  // builder, a product shows a single default row.
  const orderLines = lineState.productId === data?.id ? lineState.lines : [defaultCombination];
  const activeIndex = Math.min(lineState.productId === data?.id ? lineState.activeIndex : 0, orderLines.length - 1);
  const activeLine = orderLines[activeIndex] || defaultCombination;

  const setOrderLines = (lines) =>
    setLineState((current) => ({
      productId: data?.id,
      lines,
      activeIndex: Math.min(current.productId === data?.id ? current.activeIndex : 0, Math.max(0, lines.length - 1)),
    }));

  const setActiveIndex = (index) =>
    setLineState((current) => ({
      productId: data?.id,
      lines: current.productId === data?.id ? current.lines : orderLines,
      activeIndex: index,
    }));

  // The gallery follows the row the buyer is working on.
  const activeImages = variantImages(data, activeLine.goldColor);
  const safeActiveImage = activeImages[activeImage] ? activeImage : 0;

  // Every line of this style already in the cart, so the buyer can see what a
  // repeat visit would be adding to.
  const existingCartLines = cart?.items?.filter((i) => i.product?.id === data?.id) || [];
  const effectiveWishlistCollectionId = wishlistCollectionId || wishlist?.collections?.[0]?.id || '';

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock label="Preparing product atelier..." /></div>;
  }

  // A 404 is the server saying "no such style for you" (below); anything else
  // (offline, server down) is a failure worth naming.
  if (isLoadingError && error?.response?.status !== 404) {
    return <PageError error={error} onRetry={refetch} retrying={isFetching} />;
  }

  if (!data) {
    return (
      <section className="page-shell section-gap">
        {/* Either the style does not exist or it is outside this buyer's
            catalogue. Both are dead ends for a crawler, so do not index them. */}
        <Seo title="Product not available" noindex />
        <EmptyState
          title="Product not available"
          description={
            isAuthenticated
              ? "This piece isn't in your assigned catalogue."
              : "This piece isn't part of the preview. Sign in to your buyer account to view the full catalogue."
          }
          action={
            isAuthenticated ? (
              <Button as={Link} to="/products">Browse products</Button>
            ) : (
              <Button as={Link} to="/login">Sign in</Button>
            )
          }
        />
      </section>
    );
  }

  const requireAuth = async (callback) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    await callback();
  };

  const detailPath = `/products/${data.styleCode}`;
  // The bulk import leaves `name` equal to the style code and `description`
  // empty, so both are derived from the specification data instead.
  const displayName = productDisplayName(data);

  return (
    <section className="page-shell section-gap">
      <Seo
        title={productTitle(data)}
        description={productDescription(data)}
        path={detailPath}
        type="product"
        image={data.images?.[0]}
        imageAlt={displayName}
        schema={[
          productSchema(data, { path: detailPath }),
          breadcrumbSchema(
            [
              { name: 'Home', path: '/' },
              { name: 'Products', path: '/products' },
              data.category ? { name: data.category, path: `/products?category=${encodeURIComponent(data.category)}` } : null,
              { name: displayName, path: detailPath },
            ].filter(Boolean),
          ),
        ]}
      />
      <div className="grid gap-5 sm:gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="space-y-2.5 sm:space-y-4 lg:sticky lg:top-28">
          <Panel className="overflow-hidden p-0">
            <TransformWrapper>
              {/* The zoom library sizes its own wrapper and content to
                  `fit-content`, so the image — a flex item asking for `w-full`
                  against an indefinite width — falls back to its aspect ratio at
                  the fixed height and hangs on the left of the frame. Only shows
                  on mobile, where that height is narrower than the column. The
                  `!` is needed because the library injects its CSS at runtime,
                  after the Tailwind sheet. */}
              <TransformComponent
                wrapperClass="!h-full !w-full"
                contentClass="!h-full !w-full items-center justify-center"
              >
                {/* The product page's LCP element. */}
                <img
                  src={cdnImage(activeImages[safeActiveImage] || data.images[0], 1600)}
                  alt={`${displayName} — style ${data.styleCode} in ${activeLine.goldColor || data.metalColor || 'gold'}`}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-[240px] w-full object-cover sm:h-[500px] lg:h-[620px]"
                />
              </TransformComponent>
            </TransformWrapper>
          </Panel>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {activeImages.map((image, index) => (
              <button key={image} className={`overflow-hidden border ${index === safeActiveImage ? 'border-[var(--color-border-active)]' : 'border-[var(--color-border)]'}`} onClick={() => setActiveImage(index)}>
                {/* The thumbnail is the button's only content, so an empty alt
                    would leave the control with no accessible name at all. */}
                <img
                  src={cdnImage(image, 240)}
                  alt={`${displayName} view ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-14 w-full object-cover sm:h-24"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 sm:space-y-6">
          <div>
            <p className="font-[var(--font-accent)] text-[11px] tracking-[0.25em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.3em]">{data.styleCode}</p>
            {/* The style code already sits directly above this as the eyebrow,
                so nothing is lost by giving the heading a readable name. */}
            <h1 className="lux-heading mt-1 text-2xl sm:mt-3 sm:text-5xl">{displayName}</h1>
            {/* A real breadcrumb rather than a static string: it mirrors the
                BreadcrumbList in the head, it stops rendering a dangling "&gt;"
                for the styles that have no collection, and every crumb is a link
                back to a facet page that wants the internal link. */}
            <nav aria-label="Breadcrumb" className="mt-1.5 text-xs text-[var(--color-text-muted)] sm:mt-3 sm:text-sm">
              <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                {[
                  { label: 'Products', to: '/products' },
                  data.category
                    ? { label: data.category, to: `/products?category=${encodeURIComponent(data.category)}` }
                    : null,
                  data.subCategory
                    ? {
                        label: data.subCategory,
                        to: `/products?category=${encodeURIComponent(data.category)}&subCategory=${encodeURIComponent(data.subCategory)}`,
                      }
                    : null,
                  data.collection
                    ? { label: data.collection, to: `/products?collection=${encodeURIComponent(data.collection)}` }
                    : null,
                ]
                  .filter(Boolean)
                  .map((crumb, index) => (
                    <li key={crumb.to} className="flex items-center gap-1.5">
                      {index > 0 ? <span aria-hidden>&gt;</span> : null}
                      <Link to={crumb.to} className="tap-area transition hover:text-[var(--color-primary)]">
                        {crumb.label}
                      </Link>
                    </li>
                  ))}
              </ol>
            </nav>
            {data.occasions?.length ? (
              <div className="mt-2.5 sm:mt-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.2em]">Perfect for</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 sm:mt-2 sm:gap-2">
                  {data.occasions.map((occasion) => (
                    <span
                      key={occasion}
                      className="border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-1 text-[12px] text-[var(--color-text)] sm:px-3 sm:py-1.5 sm:text-xs"
                    >
                      {occasion}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <WeightTable product={data} carat={activeLine.goldCarat} />

          <Panel>
            <CombinationSelector
              chart={sizeChart}
              options={{
                goldColors: availableGoldColors,
                goldCarats: availableGoldCarats,
              }}
              lines={orderLines}
              onChange={setOrderLines}
              activeIndex={activeIndex}
              onActivate={(index) => {
                setActiveIndex(index);
                setActiveImage(0);
              }}
              onOpenChart={() => setIsSizeChartOpen(true)}
            />
            <label className="mt-3.5 block text-[12px] sm:mt-5 sm:text-sm">
              <span className="mb-1.5 block text-[var(--color-text-muted)] sm:mb-2">
                Custom request (optional) — applies to every combination above
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. engrave initials, alter chain length, special finishing..."
                className="min-h-[68px] w-full border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)] sm:min-h-[96px] sm:p-3 sm:text-base"
              />
            </label>
          </Panel>

          {/* Sticky within this column: it rides the bottom edge from the moment
              the details start until the buyer scrolls past them, so the main
              action is never a scroll away. */}
          <div className="sticky bottom-0 z-20 -mx-3 space-y-1.5 border-t border-[var(--color-border)] bg-[var(--color-primary-bg)]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur sm:mx-0 sm:px-0">
            <Button
              className="w-full"
              disabled={Boolean(sizeChart) && !orderLines.every((line) => line.size)}
              onClick={() =>
                requireAuth(() =>
                  addToCart(
                    {
                      productId: data.id,
                      customization: { note },
                      lines: orderLines,
                    },
                    {
                      product: data,
                      // The active row is the one the buyer was last touching,
                      // so its photo is the one they expect to see back.
                      customization: activeLine,
                      lineCount: orderLines.length,
                      pieceCount: orderLines.reduce((sum, line) => sum + Number(line.quantity || 1), 0),
                    },
                  ),
                )
              }
            >
              {orderLines.length > 1 ? `Add ${orderLines.length} Combinations to Cart` : 'Add to Cart'}
            </Button>
            {existingCartLines.length ? (
              <Link to="/cart" className="block text-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                Already in your cart: {existingCartLines.reduce((sum, line) => sum + line.quantity, 0)} pieces across{' '}
                {existingCartLines.length} {existingCartLines.length === 1 ? 'combination' : 'combinations'}
              </Link>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="flex items-stretch gap-2">
              {(wishlist?.collections?.length ?? 0) > 1 && (
                <select
                  className="flex-1 border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)] sm:px-3 sm:py-2 sm:text-sm"
                  value={effectiveWishlistCollectionId}
                  onChange={(e) => setWishlistCollectionId(e.target.value)}
                >
                  {wishlist.collections.map((col) => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
              )}
              <Button
                variant="secondary"
                className={(wishlist?.collections?.length ?? 0) > 1 ? '' : 'w-full'}
                onClick={() => requireAuth(() => addToWishlist({ productId: data.id, collectionId: effectiveWishlistCollectionId || undefined }))}
              >
                Add to Wishlist
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--color-text-muted)] sm:text-sm">
            <button
              className="inline-flex min-h-10 items-center gap-2 transition hover:text-[var(--color-primary)]"
              onClick={async () => {
                // Phones open the OS share sheet (WhatsApp, Messages...); desktops copy.
                if (navigator.share) {
                  try {
                    await navigator.share({ title: `${displayName} (${data.styleCode})`, url: window.location.href });
                  } catch {
                    // Dismissing the sheet rejects; nothing to report.
                  }
                  return;
                }
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Product link copied');
              }}
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            {settings.whatsapp ? (
              <a
                className="inline-flex min-h-10 items-center gap-2 transition hover:text-[var(--color-primary)]"
                href={(() => {
                  // Style code and the combination being viewed, so the sales team
                  // can answer without asking which piece the buyer means.
                  const url = new URL(whatsappHref(settings.whatsapp));
                  const combination = [activeLine.goldColor, activeLine.goldCarat, activeLine.size && `Size ${activeLine.size}`]
                    .filter(Boolean)
                    .join(', ');
                  url.searchParams.set(
                    'text',
                    `Hi, I'd like to enquire about ${displayName} (Style ${data.styleCode})${combination ? ` in ${combination}` : ''}.\n${window.location.href}`,
                  );
                  return url.toString();
                })()}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircleMore className="h-4 w-4" />
                Enquire on WhatsApp
              </a>
            ) : null}
          </div>

        </div>
      </div>

      <section className="pt-6 sm:pt-16">
        <SectionHeading eyebrow="Related Products" title="More from this design story" />
        <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.relatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <RecentlyViewedRail products={recent} />

      <SizeChartModal
        chart={sizeChart}
        open={isSizeChartOpen}
        onClose={() => setIsSizeChartOpen(false)}
        selectedSize={activeLine.size}
        onSelectSize={(size) => {
          // Applies to the row being worked on; the others stay untouched.
          setOrderLines(orderLines.map((line, index) => (index === activeIndex ? { ...line, size } : line)));
          setIsSizeChartOpen(false);
        }}
      />
    </section>
  );
}

function RecentlyViewedRail({ products }) {
  if (!products.length) return null;
  return (
    <section className="pt-6 sm:pt-16">
      <SectionHeading eyebrow="Recently Viewed" title="Pieces you looked at" />
      <div className="hide-scrollbar snap-rail flex gap-3 overflow-x-auto pb-4 sm:gap-6">
        {products.map((product) => (
          <div key={product.id} className="min-w-[160px] max-w-[160px] flex-none snap-start sm:min-w-[280px] sm:max-w-[280px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * One cart line. Everything shown here is resolved from the line's own
 * customization — image, chips and weights — so two lines of the same style at
 * different colours or karats never read as the same piece.
 */
// One tap per option instead of a dropdown: inside a sheet, a dropdown's list
// would be clipped by the sheet's own scroll area.
function OptionChips({ legend, options, value, onChange, swatch }) {
  return (
    <fieldset className="mb-4">
      <legend className="mb-2 text-[12px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const optionValue = option.value ?? option;
          const selected = value === optionValue;
          return (
            <button
              key={optionValue}
              type="button"
              aria-pressed={selected}
              onClick={() => !selected && onChange(optionValue)}
              className={`inline-flex min-h-10 min-w-12 items-center justify-center gap-2 border px-3 text-[13px] ${
                selected
                  ? 'border-[var(--color-border-active)] bg-[var(--color-surface-alt)] font-semibold text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              {swatch ? <span className="h-3.5 w-3.5 border border-[var(--color-border)]" style={{ backgroundColor: swatch(optionValue) }} /> : null}
              {option.label ?? option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function CartLine({ item, onUpdate, onRemove }) {
  const editRef = useRef(null);
  const product = item.product || {};
  const customization = item.customization || {};
  const chart = resolveSizeChart(product);
  const options = product.customizationOptions || {};
  const image = variantImage(product, customization);
  const swatch = goldColorSwatch(customization.goldColor);
  const goldWeight = goldWeightFor(product, customization.goldCarat);
  const diamondWeight = diamondWeightFor(product);

  const editSelection = (patch) => onUpdate(item.id, { customization: patch });

  return (
    // Mobile keeps the thumbnail beside the copy rather than above it: a
    // full-width photo per line turned a five-item cart into a long scroll.
    <Panel className="flex flex-row gap-3 sm:items-start sm:gap-4">
      <div className="flex-shrink-0">
        <div className="relative">
          <img
            src={cdnImage(image, 240)}
            alt={`${productDisplayName(product)}${customization.goldColor ? ` in ${customization.goldColor}` : ''}`}
            className="h-16 w-16 object-cover sm:h-28 sm:w-28"
          />
          {customization.goldColor ? (
            <span
              title={customization.goldColor}
              className="absolute bottom-1.5 right-1.5 h-3 w-3 border border-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] sm:h-4 sm:w-4"
              style={{ backgroundColor: swatch }}
            />
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-[var(--font-accent)] text-[11px] tracking-[0.16em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.2em]">{product.styleCode}</p>
          <h3 className="mt-1 text-[13px] font-semibold leading-tight text-[var(--color-text)] sm:mt-1.5 sm:text-lg">{productDisplayName(product)}</h3>

          <div className="mt-2 flex flex-wrap gap-1 sm:mt-2.5 sm:gap-1.5">
            {customizationChips(customization, { sizeNoun: chart?.noun || 'Size' }).map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1 border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-1.5 py-0.5 text-[12px] text-[var(--color-text)] sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs"
              >
                {chip.swatch ? (
                  <span
                    className="h-3 w-3 border border-[var(--color-border)]"
                    style={{ backgroundColor: chip.swatch }}
                  />
                ) : null}
                <span className="text-[var(--color-text-muted)]">{chip.label}:</span>
                {chip.value}
              </span>
            ))}
          </div>

          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] leading-snug text-[var(--color-text-muted)] sm:mt-2 sm:text-xs">
            <span>
              Gold {formatWeight(goldWeight, 'g')}
              {customization.goldCarat ? ` (${customization.goldCarat})` : ''} · Diamond {formatWeight(diamondWeight, 'ct')}
            </span>
            <WeightDisclaimerTrigger />
          </p>

          {customization.note ? (
            <p className="mt-1.5 text-xs text-[var(--color-text-muted)] sm:mt-2 sm:text-sm">
              <span className="text-[var(--color-text)]">Custom request:</span> {customization.note}
            </p>
          ) : null}

        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex items-center border border-[var(--color-border)]">
            <button
              className="flex h-10 w-10 items-center justify-center text-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
              onClick={() => onUpdate(item.id, { quantity: Math.max(1, item.quantity - 1) })}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-7 border-x border-[var(--color-border)] text-center text-[13px] font-medium text-[var(--color-text)] sm:w-8 sm:text-sm">
              {item.quantity}
            </span>
            <button
              className="flex h-10 w-10 items-center justify-center text-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
              onClick={() => onUpdate(item.id, { quantity: item.quantity + 1 })}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => editRef.current?.showModal()}
            className="inline-flex h-10 items-center gap-1.5 border border-[var(--color-border)] px-2.5 text-[12px] uppercase tracking-[0.1em] text-[var(--color-primary)] transition hover:border-[var(--color-border-active)]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            onClick={() => onRemove(item.id)}
            aria-label="Remove from cart"
            className="flex h-10 w-10 items-center justify-center border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:border-[var(--color-border-active)] hover:text-[var(--color-primary)]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <BottomSheet sheetRef={editRef} title={`Edit ${product.styleCode || 'piece'}`}>
        {options.goldColors?.length ? (
          <OptionChips legend="Gold colour" options={options.goldColors} value={customization.goldColor} swatch={goldColorSwatch} onChange={(goldColor) => editSelection({ goldColor })} />
        ) : null}
        {options.goldCarats?.length ? (
          <OptionChips legend="Gold karat" options={options.goldCarats} value={customization.goldCarat} onChange={(goldCarat) => editSelection({ goldCarat })} />
        ) : null}
        {chart ? (
          <OptionChips
            legend={chart.noun}
            options={chart.rows.map((row) => ({ value: row.size, label: sizeLabel(row.size) }))}
            value={customization.size}
            onChange={(size) => editSelection({ size })}
          />
        ) : null}
        <p className="pb-2 text-[12px] leading-snug text-[var(--color-text-muted)]">
          Changes save as you tap. If this matches another line in your cart, the two are combined.
        </p>
      </BottomSheet>
    </Panel>
  );
}

export function CartPage() {
  const { cart, updateCart, removeFromCart, error: cartError, refreshCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  // Styles already in the cart are left out: the rail is for what to add next.
  const inCart = new Set(cart.items.map((item) => item.product?.id));
  const recent = recentlyViewed(user?.id).filter((product) => !inCart.has(product.id)).slice(0, 8);
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: userService.profile });
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const orderSheetRef = useRef(null);

  // Karat-aware, and shared with both PDFs and the admin order panel, so the
  // document the buyer receives quotes exactly what this summary showed them.
  const diamondWeightTotal = totalDiamondWeight(cart.items);
  const goldWeightTotal = totalGoldWeight(cart.items);
  const pieces = totalPieces(cart.items);

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      // Loaded on click: see the note on the orderPdf chunk — the PDF stack
      // is far too heavy to sit in the product pages' critical path.
      const { downloadDeArteCartPdf } = await import('../utils/orderPdf');
      await downloadDeArteCartPdf({ cart, user: profile || {} });
      toast.success('Cart PDF downloaded');
    } catch (error) {
      toast.error(error?.message || 'Could not generate PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Checkout used to be a separate two-step page for this one notes field.
  const placeOrder = async () => {
    if (placing) return;
    setPlacing(true);
    try {
      const order = await orderService.create({ notes });
      await refreshCart();
      // A toast, not router state: the account page never read that state, so
      // buyers used to land there with no confirmation at all.
      toast.success(`Order placed. Order ID: ${order.orderId}`);
      navigate('/profile');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not place order'));
      setPlacing(false);
    }
  };

  if (cartError) {
    return <PageError error={cartError} onRetry={refreshCart} />;
  }

  if (!cart.items.length) {
    return (
      <section className="page-shell section-gap">
        <EmptyState
          title="Your cart is empty"
          description="Start with collections, new arrivals, or best sellers to curate your next buyer order."
          action={<Button as={Link} to="/products">Browse products</Button>}
        />
        <RecentlyViewedRail products={recent} />
      </section>
    );
  }

  const totals = (
    <dl className="space-y-2">
      <div className="flex items-baseline justify-between">
        <dt className="text-[13px] text-[var(--color-text-muted)] sm:text-sm">
          Pieces <span className="text-[12px]">· {cart.items.length} {cart.items.length === 1 ? 'line' : 'lines'}</span>
        </dt>
        <dd className="text-2xl font-light text-[var(--color-primary)]">{pieces}</dd>
      </div>
      <div className="flex items-baseline justify-between">
        <dt className="flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)] sm:text-sm">
          Diamond weight
          <WeightDisclaimerTrigger />
        </dt>
        <dd className="text-base font-light text-[var(--color-primary)] sm:text-xl">{diamondWeightTotal.toFixed(2)} ct</dd>
      </div>
      <div className="flex items-baseline justify-between">
        <dt className="flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)] sm:text-sm">
          Gold weight
          <WeightDisclaimerTrigger />
        </dt>
        <dd className="text-base font-light text-[var(--color-primary)] sm:text-xl">{goldWeightTotal.toFixed(2)} g</dd>
      </div>
    </dl>
  );

  const notesField = (
    <label className="block text-[13px] text-[var(--color-text-muted)] sm:text-sm">
      <span className="mb-1.5 block">Order notes (optional)</span>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Delivery preferences, deadlines, anything your sales representative should know"
        className="min-h-[88px] w-full border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[16px] text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)] sm:text-sm"
      />
    </label>
  );

  const pdfButton = (
    <Button variant="secondary" className="w-full" icon={Download} loading={isDownloadingPdf} onClick={handleDownloadPdf}>
      Download PDF
    </Button>
  );

  return (
    <section className="page-shell section-gap">
      {/* Buyer-session page: nothing here is meaningful to a crawler, and indexing it would only add a thin, empty result. */}
      <Seo title="Cart" noindex />
      <SectionHeading as="h1" eyebrow="Cart" title="Your cart" description="Pricing will be confirmed by your sales representative." />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="space-y-3 sm:space-y-4">
          {/* Newest first. The API appends each new line, so the buyer would
              otherwise have to scroll past a long cart to see what they just
              added. Copied before reversing — `cart.items` is shared state. */}
          {[...cart.items].reverse().map((item) => (
            <CartLine key={item.id} item={item} onUpdate={updateCart} onRemove={removeFromCart} />
          ))}
        </div>

        {/* Desktop: the summary and the order button stay in view beside the lines. */}
        <Panel className="space-y-4 max-lg:hidden lg:sticky lg:top-28">
          <p className="lux-label text-xs">Order summary</p>
          {totals}
          {notesField}
          <Button className="w-full" loading={placing} disabled={placing} onClick={placeOrder}>
            Place order
          </Button>
          {pdfButton}
          <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            * All weights are approximate.
            <WeightDisclaimerTrigger />
          </p>
        </Panel>
      </div>

      <RecentlyViewedRail products={recent} />

      {/* Phones and tablets: totals ride the bottom edge; the order button opens
          a short confirm sheet with the notes field. */}
      <div className="sticky bottom-0 z-20 -mx-3 mt-4 flex items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-primary-bg)]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur sm:mx-0 sm:px-0 lg:hidden">
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[15px] font-semibold text-[var(--color-primary)]">
            {pieces} {pieces === 1 ? 'piece' : 'pieces'}
          </p>
          <p className="text-[12px] text-[var(--color-text-muted)]">
            {diamondWeightTotal.toFixed(2)} ct · {goldWeightTotal.toFixed(2)} g
          </p>
        </div>
        <Button className="shrink-0" onClick={() => orderSheetRef.current?.showModal()}>
          Place order
        </Button>
      </div>

      <BottomSheet
        sheetRef={orderSheetRef}
        title="Place order"
        footer={
          <div className="space-y-2">
            <Button className="w-full" loading={placing} disabled={placing} onClick={placeOrder}>
              Place order
            </Button>
            {pdfButton}
          </div>
        }
      >
        <div className="space-y-4">
          {totals}
          {notesField}
        </div>
      </BottomSheet>
    </section>
  );
}

// Opens cleanly in Excel and Sheets: every cell quoted, and a BOM so ₹/é
// survive Excel's default encoding.
function downloadWishlistCsv(items, collectionName, fileName) {
  const rows = [
    ['Collection', 'Style Code', 'Name', 'Category', 'Diamond Wt (ct)', 'Gold Colours', 'Gold Karats', 'Link'],
    ...items.map((item) => [
      collectionName(item.collectionId),
      item.product.styleCode,
      productDisplayName(item.product),
      item.product.category || '',
      diamondWeightFor(item.product) || '',
      (item.product.customizationOptions?.goldColors || []).join(' / '),
      (item.product.customizationOptions?.goldCarats || []).join(' / '),
      `${window.location.origin}/products/${item.product.styleCode}`,
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  link.download = `${fileName.replace(/[^\w-]+/g, '-')}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

const WISHLIST_TAB =
  'min-h-10 whitespace-nowrap border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] transition sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.12em]';

export function WishlistPage() {
  const { wishlist, removeFromWishlist, createWishlistCollection, error: wishlistError, refreshWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [collectionName, setCollectionName] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const visibleItems = useMemo(() => {
    if (activeTab === 'all') return wishlist.items;
    return wishlist.items.filter((i) => i.collectionId === activeTab);
  }, [wishlist.items, activeTab]);

  const getCollectionName = (collectionId) =>
    wishlist.collections.find((c) => c.id === collectionId)?.name || 'My Wishlist';

  if (wishlistError) {
    return <PageError error={wishlistError} onRetry={refreshWishlist} />;
  }

  return (
    <section className="page-shell section-gap">
      {/* Buyer-session page: nothing here is meaningful to a crawler, and indexing it would only add a thin, empty result. */}
      <Seo title="Wishlist" noindex />
      <SectionHeading
        as="h1"
        eyebrow="Wishlist"
        title="Saved pieces"
        description="Create themed groups like Wedding Season or Export Order, then move them to cart when ready."
      />

      {/* Collection tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5 sm:mb-6 sm:gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`${WISHLIST_TAB} ${
            activeTab === 'all'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
              : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-active)]'
          }`}
        >
          All ({wishlist.items.length})
        </button>
        {wishlist.collections.map((col) => {
          const count = wishlist.items.filter((i) => i.collectionId === col.id).length;
          return (
            <button
              key={col.id}
              onClick={() => setActiveTab(col.id)}
              className={`${WISHLIST_TAB} ${
                activeTab === col.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-active)]'
              }`}
            >
              {col.name} ({count})
            </button>
          );
        })}
        {visibleItems.length ? (
          <Button
            variant="ghost"
            icon={Download}
            className="ml-auto"
            onClick={() =>
              downloadWishlistCsv(
                visibleItems,
                getCollectionName,
                activeTab === 'all' ? 'dearte-wishlist' : `dearte-${getCollectionName(activeTab)}`,
              )
            }
          >
            Export CSV
          </Button>
        ) : null}
      </div>

      {/* Create collection */}
      <Panel className="mb-4 flex flex-col gap-2.5 sm:mb-6 sm:gap-4 md:flex-row md:items-center">
        <input
          value={collectionName}
          onChange={(event) => setCollectionName(event.target.value)}
          aria-label="New collection name"
          className="flex-1 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)] sm:px-4 sm:py-3 sm:text-base"
          placeholder="New collection name (e.g. Wedding Season)"
        />
        <Button
          onClick={() =>
            collectionName &&
            createWishlistCollection({ name: collectionName }).then((ok) => ok && setCollectionName(''))
          }
        >
          Create Collection
        </Button>
      </Panel>

      {/* Items grid */}
      {!visibleItems.length ? (
        <EmptyState
          title={activeTab === 'all' ? 'No saved pieces yet' : 'No items in this collection'}
          description={
            activeTab === 'all'
              ? 'Start saving products into buyer-specific collections for later review.'
              : 'Browse products and save them to this collection from any product page.'
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => {
            // Sized styles need a deliberate size choice, so send the buyer to
            // the product page rather than guessing one on their behalf.
            const needsSize = Boolean(resolveSizeChart(item.product));
            const quickAdd = {
              goldColor: item.product.customizationOptions.goldColors[0],
              goldCarat: item.product.customizationOptions.goldCarats[0],
              diamondQuality: DIAMOND_QUALITY,
            };

            return (
            <Panel key={item.id}>
              <Link to={`/products/${item.product.styleCode}`}>
                <img
                  src={cdnImage(item.product.images[0], 640)}
                  alt={productDisplayName(item.product)}
                  className="mb-2.5 h-36 w-full object-cover transition duration-300 hover:opacity-90 sm:mb-4 sm:h-72"
                  loading="lazy"
                  decoding="async"
                />
              </Link>
              <span className="mb-2 inline-block border border-[var(--color-border)] px-1.5 py-px text-[11px] uppercase tracking-[0.14em] text-[var(--color-primary)] sm:mb-3 sm:px-2 sm:py-0.5 sm:text-[11px] sm:tracking-[0.2em]">
                {getCollectionName(item.collectionId)}
              </span>
              <p className="font-[var(--font-accent)] text-[11px] tracking-[0.22em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.3em]">
                {item.product.styleCode}
              </p>
              <h3 className="mt-1 line-clamp-2 text-[13px] font-semibold leading-tight text-[var(--color-text)] sm:mt-1.5 sm:text-xl">
                {productDisplayName(item.product)}
              </h3>
              <div className="mt-2.5 flex flex-col gap-1.5 sm:mt-5 sm:flex-row sm:gap-3">
                {needsSize ? (
                  <Button as={Link} to={`/products/${item.product.styleCode}`} className="w-full sm:flex-1">Choose Size</Button>
                ) : (
                  <Button
                    className="w-full sm:flex-1"
                    onClick={() =>
                      addToCart(
                        { productId: item.product.id, quantity: 1, customization: quickAdd },
                        { product: item.product, customization: quickAdd },
                      )
                    }
                  >
                    Move to Cart
                  </Button>
                )}
                <Button
                  variant="secondary"
                  className="w-full sm:flex-1"
                  onClick={() => removeFromWishlist(item.id)}
                >
                  Remove
                </Button>
              </div>
            </Panel>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function CataloguePage() {
  const { data, isLoading, isLoadingError, error, refetch, isFetching } = useQuery({
    queryKey: ['catalogues'],
    queryFn: orderService.catalogues,
  });
  const [openId, setOpenId] = useState(null);

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock label="Loading private catalogues..." /></div>;
  }

  if (isLoadingError) {
    return <PageError error={error} onRetry={refetch} retrying={isFetching} />;
  }

  return (
    <section className="page-shell section-gap">
      {/* Buyer-session page: nothing here is meaningful to a crawler, and indexing it would only add a thin, empty result. */}
      <Seo title="My Catalogues" noindex />
      <SectionHeading as="h1" eyebrow="Catalogues" title="Catalogues shared with you" description="Picked for you by your sales representative." />
      <CatalogueBuilder />
      <div className="grid gap-6 lg:grid-cols-2">
        {data.map((catalogue) => {
          const open = openId === catalogue.id;
          return (
            <Panel key={catalogue.id} className={open ? 'lg:col-span-2' : ''}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : catalogue.id)}
                aria-expanded={open}
                className="block w-full text-left"
              >
                <div className="mb-4 grid grid-cols-3 gap-3">
                  {catalogue.products.slice(0, 3).map((product) => (
                    <img key={product.id} src={cdnImage(product.images[0], 400)} alt={productDisplayName(product)} className="h-32 w-full object-cover" loading="lazy" decoding="async" />
                  ))}
                </div>
                <h3 className="text-2xl font-semibold text-[var(--color-text)]">{catalogue.name}</h3>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">{catalogue.description}</p>
                <p className="mt-3 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  <span>{formatDate(catalogue.createdAt)} • {catalogue.productIds.length} Items</span>
                  <span className="flex items-center gap-1 text-[var(--color-primary)]">
                    {open ? 'Hide pieces' : 'View all pieces'}
                    <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
                  </span>
                </p>
              </button>
              {open ? (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                  {catalogue.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : null}
            </Panel>
          );
        })}
      </div>
    </section>
  );
}

function OrderHistoryRow({ order, downloading, onDownload }) {
  const queryClient = useQueryClient();
  const { refreshCart } = useCart();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [reordering, setReordering] = useState(false);

  // One add per style carrying every ordered combination, then a single cart
  // refresh, so a 20-line order is one toast rather than twenty. Sequential:
  // each add rewrites the same cart document on the server. Styles since
  // removed from the catalogue are skipped and counted.
  const handleOrderAgain = async () => {
    const byProduct = new Map();
    let skipped = 0;
    for (const item of order.items) {
      if (!item.product?.id) {
        skipped += 1;
        continue;
      }
      const { goldColor, goldCarat, size, note } = item.customization || {};
      const lines = byProduct.get(item.product.id) || [];
      lines.push({ goldColor, goldCarat, size, note, quantity: item.quantity });
      byProduct.set(item.product.id, lines);
    }

    setReordering(true);
    for (const [productId, lines] of byProduct) {
      try {
        await userService.addToCart({ productId, lines });
      } catch {
        skipped += lines.length;
      }
    }
    await refreshCart();
    setReordering(false);

    if (skipped === order.items.length) {
      toast.error('None of these pieces can be ordered any more.');
      return;
    }
    toast.success(skipped ? `Added to cart. ${skipped} unavailable item(s) skipped.` : 'Order added to your cart');
    navigate('/cart');
  };

  const setDraft = (itemId, value) =>
    setDrafts((current) => ({ ...current, [itemId]: value }));

  const handleSubmit = async () => {
    const requests = order.items
      .map((item) => ({ itemId: item.id, message: (drafts[item.id] || '').trim() }))
      .filter((entry) => entry.message);

    if (!requests.length) {
      toast.error('Add a request to at least one item.');
      return;
    }

    try {
      setSubmitting(true);
      await orderService.submitChangeRequests(order.id, requests);
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      setDrafts({});
      toast.success('Change request submitted.');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not submit change request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <tr className="border-t border-[var(--color-border)] text-[var(--color-text)] max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-1 max-sm:py-3">
        <td className="whitespace-nowrap py-2.5 pr-3 font-medium sm:py-4 sm:font-normal max-sm:py-0">{order.orderId}</td>
        <td className="whitespace-nowrap py-2.5 pr-3 sm:py-4 max-sm:row-start-2 max-sm:py-0 max-sm:text-[var(--color-text-muted)]">{formatDate(order.date)}</td>
        <td className="py-2.5 pr-3 sm:py-4 max-sm:row-start-2 max-sm:py-0 max-sm:pr-0 max-sm:text-right max-sm:text-[var(--color-text-muted)]">
          {order.items.length}
          <span className="sm:hidden"> {order.items.length === 1 ? 'item' : 'items'}</span>
        </td>
        <td className="py-2.5 pr-3 sm:py-4 max-sm:col-start-2 max-sm:row-start-1 max-sm:py-0 max-sm:pr-0 max-sm:text-right"><StatusBadge status={order.status} /></td>
        <td className="py-2.5 text-right sm:py-4 max-sm:col-span-2 max-sm:py-0">
          <div className="flex flex-wrap items-center justify-end gap-1 max-sm:justify-start">
            <Button
              variant="ghost"
              icon={ChevronDown}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Hide items' : 'View items'}
            </Button>
            <Button
              variant="ghost"
              icon={Download}
              loading={downloading}
              onClick={() => onDownload(order)}
            >
              PDF
            </Button>
            <Button variant="ghost" loading={reordering} onClick={handleOrderAgain}>
              Order again
            </Button>
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-[var(--color-border)] max-sm:block">
          <td colSpan={5} className="bg-[var(--color-surface-alt)] px-4 py-4 max-sm:block max-sm:px-3">
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:flex-row">
                  <img
                    src={cdnImage(variantImage(item.product, item.customization) || item.product?.media?.[0]?.secureUrl, 96)}
                    alt={productDisplayName(item.product) || 'Product'}
                    className="h-12 w-12 flex-shrink-0 border border-[var(--color-border)] object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      {/* Imported styles carry the code as their name; the code is on the next line. */}
                      <p className="text-sm font-medium text-[var(--color-text)]">{productDisplayName(item.product)}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{item.product?.styleCode} • Qty {item.quantity}</p>
                      {/* The ordered combination, so a buyer can tell two lines of
                          the same style apart when raising a change request. */}
                      <p className="mt-0.5 text-xs text-[var(--color-text)]">
                        {customizationSummary(item.customization, {
                          sizeNoun: resolveSizeChart(item.product)?.noun || 'Size',
                        })}
                      </p>
                      {item.customization?.note ? (
                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                          Custom request: {item.customization.note}
                        </p>
                      ) : null}
                    </div>
                    {(item.changeRequests || []).map((cr) => (
                      <div key={cr.id} className="flex items-start justify-between gap-2 border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2">
                        <p className="text-xs text-[var(--color-text)]">{cr.message}</p>
                        <StatusBadge status={cr.status} />
                      </div>
                    ))}
                    <textarea
                      className="min-h-[60px] w-full border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)]"
                      placeholder="Custom request or issue for this piece (optional)"
                      value={drafts[item.id] || ''}
                      onChange={(event) => setDraft(item.id, event.target.value)}
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <Button loading={submitting} onClick={handleSubmit}>Submit change request</Button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function ProfilePage() {
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: userService.profile });
  const ordersQuery = useQuery({ queryKey: ['orders'], queryFn: orderService.list });
  const profile = profileQuery.data;
  const orders = ordersQuery.data || [];
  const [downloadingOrderId, setDownloadingOrderId] = useState(null);

  const handleDownloadOrder = async (order) => {
    try {
      setDownloadingOrderId(order.id);
      const { downloadDeArteOrderPdf } = await import('../utils/orderPdf');
      await downloadDeArteOrderPdf({ order, user: order.user || profile || {} });
      toast.success(`Downloaded ${order.orderId}`);
    } catch (error) {
      toast.error(error?.message || 'Could not generate order PDF');
    } finally {
      setDownloadingOrderId(null);
    }
  };

  return (
    <section className="page-shell section-gap">
      {/* Buyer-session page: nothing here is meaningful to a crawler, and indexing it would only add a thin, empty result. */}
      <Seo title="My Account" noindex />
      <SectionHeading as="h1" eyebrow="Account" title="Your account and orders" />
      {/* Renders nothing unless restock suggestions are on and something is due. */}
      <RestockPanel />
      <Link to="/catalogue" className="mb-4 flex items-center justify-between gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] transition hover:border-[var(--color-accent)] sm:mb-6">
        <span><span className="font-medium">My Catalogues</span> — pieces shared with you and the AI catalogue builder</span>
        <span className="text-[var(--color-primary)]">Open →</span>
      </Link>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <p className="lux-label mb-3 text-[11px] sm:mb-4 sm:text-xs">My Profile</p>
          {profile ? (
            <div className="space-y-2 text-[13px] text-[var(--color-text-muted)] sm:space-y-4 sm:text-sm">
              <p><span className="text-[var(--color-text)] font-medium">Name:</span> {profile.name}</p>
              <p><span className="text-[var(--color-text)] font-medium">Email:</span> {profile.email}</p>
              <p><span className="text-[var(--color-text)] font-medium">Company:</span> {profile.companyName}</p>
              <p><span className="text-[var(--color-text)] font-medium">City:</span> {profile.city}</p>
              <p><span className="text-[var(--color-text)] font-medium">GST:</span> {profile.gstNumber || 'Not provided'}</p>
            </div>
          ) : profileQuery.isLoadingError ? (
            <ErrorState error={profileQuery.error} onRetry={profileQuery.refetch} retrying={profileQuery.isFetching} />
          ) : <LoadingBlock label="Loading profile..." />}
        </Panel>
        <Panel>
          <p className="lux-label mb-3 text-[11px] sm:mb-4 sm:text-xs">Order History</p>
          {ordersQuery.isLoadingError ? (
            <ErrorState error={ordersQuery.error} onRetry={ordersQuery.refetch} retrying={ordersQuery.isFetching} />
          ) : (
          <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            <table className="w-full text-left text-[13px] sm:text-sm max-sm:block">
              <thead className="text-[var(--color-text-muted)] max-sm:hidden">
                <tr>
                  <th className="whitespace-nowrap pb-2.5 pr-3 sm:pb-4">Order ID</th>
                  <th className="whitespace-nowrap pb-2.5 pr-3 sm:pb-4">Date</th>
                  <th className="pb-2.5 pr-3 sm:pb-4">Items</th>
                  <th className="pb-2.5 pr-3 sm:pb-4">Status</th>
                  <th className="pb-2.5 text-right sm:pb-4">Actions</th>
                </tr>
              </thead>
              <tbody className="max-sm:block">
                {orders.map((order) => (
                  <OrderHistoryRow
                    key={order.id}
                    order={order}
                    downloading={downloadingOrderId === order.id}
                    onDownload={handleDownloadOrder}
                  />
                ))}
              </tbody>
            </table>
          </div>
          )}
        </Panel>
      </div>
    </section>
  );
}
