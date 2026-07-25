import { ChevronDown, Download, Search, Share2, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { useProducts, useProduct } from '../hooks/useProducts';
import { useFilters } from '../hooks/useFilters';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { orderService } from '../services/orderService';
import { userService } from '../services/userService';
import { Button, EmptyState, LoadingBlock, Panel, SectionHeading, StatusBadge, WeightDisclaimerTrigger } from '../components/ui/Primitives';
import { Select } from '../components/ui/Select';
import { ProductCard } from '../components/product/ProductCard';
import { ProductFilters } from '../components/product/ProductFilters';
import { SizeChartModal } from '../components/product/SizeChartModal';
import { CombinationSelector } from '../components/product/CombinationSelector';
import { defaultSizeFor, resolveSizeChart } from '../data/sizeMaster';
import { downloadDeArteCartPdf, downloadDeArteOrderPdf } from '../utils/orderPdf';
import { formatDate, formatWeight } from '../utils/formatters';
import { DIAMOND_QUALITY } from '../utils/constants';
import {
  customizationChips,
  customizationSummary,
  diamondWeightFor,
  goldColorSwatch,
  goldWeightFor,
  variantImage,
  variantImages,
} from '../utils/productVariants';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkoutSchema } from '../utils/validators';
import { useCollections, useOccasions } from '../hooks/useProducts';

function ShopCategoryDiamondIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M24 6L41 18.5L24 42L7 18.5L24 6Z" stroke="#002130" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M7 18.5H41" stroke="#002130" strokeWidth="1.35" />
      <path d="M13.5 18.5L24 6L34.5 18.5" stroke="#002130" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function ShopCategoryCard({ label, categorySlug, imageSrc, className, to }) {
  const target = to || `/products?category=${encodeURIComponent(categorySlug)}`;

  return (
    <Link
      to={target}
      className={`group relative isolate block overflow-hidden bg-neutral-200 ${className ?? ''}`}
    >
      <img
        src={imageSrc}
        alt=""
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

  const navy = '#002130';

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock label="Loading collections..." /></div>;
  }

  return (
    <section className="page-shell animate-page-enter pb-10 pt-6 sm:pb-20 sm:pt-16 md:pb-28 md:pt-20">
      <Helmet>
        <title>Collections | DeArte Jewellery</title>
        <meta
          name="description"
          content="Discover curated jewellery collections like Ocean Collection, Lunar Collection, and more."
        />
      </Helmet>

      <header className="mb-6 text-center sm:mb-12 md:mb-14">
        <ShopCategoryDiamondIcon className="mx-auto h-9 w-9 sm:h-12 sm:w-12 md:h-[52px] md:w-[52px]" />
        <h1
          className="mt-4 text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] sm:mt-5 sm:text-[2rem] md:text-[2.25rem]"
          style={{ color: navy }}
        >
          Shop by Collection
        </h1>
        <p
          className="mx-auto mt-3 max-w-[40rem] text-[0.9375rem] leading-relaxed sm:text-lg"
          style={{ color: `${navy}CC` }}
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
                  src={collection.image}
                  alt={collection.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              ) : null}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            </div>
            <div className="space-y-1 p-2.5 sm:space-y-2 sm:p-5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.2em]">Collection</p>
              <h2 className="lux-heading text-[15px] text-[var(--color-text)] sm:text-2xl">{collection.name}</h2>
              <p className="text-[10px] leading-snug text-[var(--color-text-muted)] sm:text-sm">Tap to shop the pieces curated under this collection story.</p>
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

  const navy = '#002130';

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock label="Loading occasions..." /></div>;
  }

  const occasions = data || [];

  return (
    <section className="page-shell animate-page-enter pb-10 pt-6 sm:pb-20 sm:pt-16 md:pb-28 md:pt-20">
      <Helmet>
        <title>Occasions | DeArte Jewellery</title>
        <meta
          name="description"
          content="Shop lab-grown diamond jewellery by occasion — bridal, everyday, gifting, and more."
        />
      </Helmet>

      <header className="mb-6 text-center sm:mb-12 md:mb-14">
        <ShopCategoryDiamondIcon className="mx-auto h-9 w-9 sm:h-12 sm:w-12 md:h-[52px] md:w-[52px]" />
        <h1
          className="mt-4 text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] sm:mt-5 sm:text-[2rem] md:text-[2.25rem]"
          style={{ color: navy }}
        >
          Shop by Occasion
        </h1>
        <p
          className="mx-auto mt-3 max-w-[40rem] text-[0.9375rem] leading-relaxed sm:text-lg"
          style={{ color: `${navy}CC` }}
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
                <ShopCategoryDiamondIcon className="h-14 w-14 opacity-60 transition duration-500 group-hover:scale-[1.08] group-hover:opacity-90 sm:h-16 sm:w-16" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 via-black/5 to-transparent" />
              </div>
              <div className="space-y-1 p-2.5 sm:space-y-2 sm:p-5">
                <p className="text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.2em]">Occasion</p>
                <h2 className="lux-heading text-[15px] text-[var(--color-text)] sm:text-2xl">{occasion.name}</h2>
                <p className="text-[10px] leading-snug text-[var(--color-text-muted)] sm:text-sm">Tap to shop the pieces styled for {occasion.name.toLowerCase()}.</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No occasions yet"
          description="Occasions are drawn from the catalogue. Check back once pieces have been tagged."
          action={<Link to="/products"><Button>Browse products</Button></Link>}
        />
      )}
    </section>
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
  const pageScope = `${activeCategory}::${activeSubCategory}::${activeCollection}::${activeOccasion}::${activeSearch}`;
  const [paging, setPaging] = useState({ scope: pageScope, page: 1 });
  const { filters, sort, setSort, setFilter, resetFilters } = useFilters();
  const page = paging.scope === pageScope ? paging.page : 1;
  const [searchDraft, setSearchDraft] = useState(activeSearch);

  useEffect(() => {
    const urlSort = searchParams.get('sort');
    if (urlSort && urlSort !== sort) {
      setSort(urlSort);
    }
  }, [searchParams, setSort, sort]);

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

  const { data, isLoading, isFetching, isPlaceholderData } = useProducts(params);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const dropSearchParam = (key) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete(key);
        return next;
      },
      { replace: true },
    );

  const clearAll = () => {
    resetFilters();
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
  if (isLoading || !data) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock label="Curating product library..." /></div>;
  }

  const isRefreshing = isFetching && isPlaceholderData;

  return (
    <section className="page-shell section-gap">
      <SectionHeading
        eyebrow="Products"
        title={activeSubCategory || activeCategory || activeCollection || activeOccasion || 'Shop by Product'}
        description="Browse jewellery by product type first, then refine by collection, metal, and stock status."
      />
      {!isAuthenticated ? (
        <Panel className="mb-4 flex flex-col gap-2.5 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="text-[12px] leading-relaxed text-[var(--color-text-muted)] sm:text-sm">
            You're viewing a small preview of our catalogue. Sign in to your buyer account to browse the full collection.
          </p>
          <Link to="/login" className="shrink-0">
            <Button>Sign in to see more</Button>
          </Link>
        </Panel>
      ) : null}
      <div className="space-y-3.5 sm:space-y-6">
        {!activeCategory && !activeSubCategory && !activeCollection && !activeOccasion && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PRODUCT_CATEGORY_TILES.map((tile) => (
              <ShopCategoryCard
                key={tile.label}
                label={tile.label}
                categorySlug={tile.categorySlug}
                imageSrc={tile.imageSrc}
                className="aspect-square min-h-[9rem] w-full sm:aspect-[4/5] sm:min-h-[17rem]"
              />
            ))}
          </div>
        )}
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
        <ProductFilters
          filters={data.filters}
          activeFilters={filters}
          setFilter={setFilter}
        />
        <div className="lux-panel flex flex-col gap-2.5 p-3 sm:gap-4 sm:p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[12px] text-[var(--color-text-muted)] sm:text-sm">{data.total} items found</p>
            {activeChips.length ? (
              <div className="mt-1.5 space-y-2 sm:mt-2 sm:space-y-3">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {activeChips.map((chip) => (
                    <span
                      key={chip.key}
                      className="flex items-center gap-1 border border-[var(--color-border)] bg-[var(--color-surface-alt)] py-0.5 pl-2 pr-0.5 text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-muted)] sm:gap-2 sm:py-1 sm:pl-3 sm:pr-1 sm:text-xs sm:tracking-[0.08em]"
                    >
                      {chip.label}
                      <button
                        type="button"
                        onClick={chip.onRemove}
                        aria-label={`Remove filter ${chip.label}`}
                        className="flex h-4 w-4 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] sm:h-5 sm:w-5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-primary)] underline sm:text-xs sm:tracking-[0.12em]"
                >
                  Clear All
                </button>
              </div>
            ) : null}
          </div>
          <Select
            className="w-full sm:w-64"
            value={sort}
            onChange={(value) => {
              setSort(value);
              setSearchParams(value ? { sort: value } : {});
            }}
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

        <div
          className={`grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 xl:grid-cols-4 transition-opacity duration-200 ${
            isRefreshing ? 'pointer-events-none opacity-60' : 'opacity-100'
          }`}
        >
          {data.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* One row at every width — stacked full-width pagers wasted three
            screens' worth of height on a phone. */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" onClick={() => setPaging((current) => ({ scope: pageScope, page: Math.max(1, current.scope === pageScope ? current.page - 1 : 1) }))} disabled={page === 1}>
            Previous
          </Button>
          <p className="text-[12px] text-[var(--color-text-muted)] sm:text-sm">
            Page {data.page} of {data.totalPages}
          </p>
          <Button variant="secondary" onClick={() => setPaging((current) => ({ scope: pageScope, page: Math.min(data.totalPages, current.scope === pageScope ? current.page + 1 : 2) }))} disabled={page >= data.totalPages}>
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ProductDetailPage() {
  const { styleCode } = useParams();
  const [activeImage, setActiveImage] = useState(0);
  const [note, setNote] = useState('');
  const [lineState, setLineState] = useState({ productId: null, lines: [], activeIndex: 0 });
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const { data, isLoading } = useProduct(styleCode);
  const { cart, addToCart } = useCart();
  const { wishlist, addToWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [wishlistCollectionId, setWishlistCollectionId] = useState('');

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

  if (!data) {
    return (
      <section className="page-shell section-gap">
        <EmptyState
          title="Product not available"
          description={
            isAuthenticated
              ? "This piece isn't in your assigned catalogue."
              : "This piece isn't part of the preview. Sign in to your buyer account to view the full catalogue."
          }
          action={
            isAuthenticated ? (
              <Link to="/products"><Button>Browse products</Button></Link>
            ) : (
              <Link to="/login"><Button>Sign in</Button></Link>
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

  return (
    <section className="page-shell section-gap">
      <div className="grid gap-5 sm:gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-2.5 sm:space-y-4">
          <Panel className="overflow-hidden p-0">
            <TransformWrapper>
              <TransformComponent wrapperClass="h-full w-full">
                <img src={activeImages[safeActiveImage] || data.images[0]} alt={data.name} className="h-[240px] w-full object-cover sm:h-[500px] lg:h-[620px]" />
              </TransformComponent>
            </TransformWrapper>
          </Panel>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {activeImages.map((image, index) => (
              <button key={image} className={`overflow-hidden border ${index === safeActiveImage ? 'border-[var(--color-border-active)]' : 'border-[var(--color-border)]'}`} onClick={() => setActiveImage(index)}>
                <img src={image} alt="" className="h-14 w-full object-cover sm:h-24" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 sm:space-y-6">
          <div>
            <p className="font-[var(--font-accent)] text-[10px] tracking-[0.25em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.3em]">{data.styleCode}</p>
            <h1 className="lux-heading mt-1 text-2xl sm:mt-3 sm:text-5xl">{data.name}</h1>
            <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)] sm:mt-3 sm:text-sm">
              {data.category} &gt; {data.subCategory} &gt; {data.collection}
            </p>
            {data.occasions?.length ? (
              <div className="mt-2.5 sm:mt-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.2em]">Perfect for</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 sm:mt-2 sm:gap-2">
                  {data.occasions.map((occasion) => (
                    <span
                      key={occasion}
                      className="border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-1 text-[10px] text-[var(--color-text)] sm:px-3 sm:py-1.5 sm:text-xs"
                    >
                      {occasion}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <Panel>
            {/* Two up even on the narrowest screen: one spec per row turned a
                short weight table into a full page of scrolling. */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
              {data.specifications.map((spec, specIndex) => (
                <div key={`${spec.attribute}-${specIndex}`} className="border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-2 sm:p-4">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[9px] uppercase leading-tight tracking-[0.1em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.2em]">{spec.attribute}</p>
                    {spec.attribute?.toLowerCase().includes('weight') && (
                      <WeightDisclaimerTrigger />
                    )}
                  </div>
                  <p className="mt-0.5 text-[13px] leading-tight text-[var(--color-text)] sm:mt-2 sm:text-sm">{spec.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 border-t border-[var(--color-border)] pt-2.5 text-[10px] text-[var(--color-text-muted)] sm:mt-4 sm:pt-4 sm:text-xs">
              <span>* All weights mentioned are approximate.</span>
              <WeightDisclaimerTrigger />
            </div>
          </Panel>

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

          <div className="flex flex-col gap-2 sm:gap-3">
            <Button
              className="w-full"
              disabled={Boolean(sizeChart) && !orderLines.every((line) => line.size)}
              onClick={() =>
                requireAuth(() =>
                  addToCart({
                    productId: data.id,
                    customization: { note },
                    lines: orderLines,
                  }),
                )
              }
            >
              {orderLines.length > 1 ? `Add ${orderLines.length} Combinations to Cart` : 'Add to Cart'}
            </Button>
            {existingCartLines.length ? (
              <Link to="/cart" className="text-center text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] sm:text-xs">
                Already in your cart: {existingCartLines.reduce((sum, line) => sum + line.quantity, 0)} pieces across{' '}
                {existingCartLines.length} {existingCartLines.length === 1 ? 'combination' : 'combinations'}
              </Link>
            ) : null}
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
              className="inline-flex items-center gap-2 transition hover:text-[var(--color-primary)]"
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Product link copied');
              }}
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
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

/**
 * One cart line. Everything shown here is resolved from the line's own
 * customization — image, chips and weights — so two lines of the same style at
 * different colours or karats never read as the same piece.
 */
function CartLine({ item, onUpdate, onRemove }) {
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
            src={image}
            alt={`${product.name}${customization.goldColor ? ` in ${customization.goldColor}` : ''}`}
            className="h-20 w-20 object-cover sm:h-28 sm:w-28"
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
          <p className="font-[var(--font-accent)] text-[10px] tracking-[0.16em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.2em]">{product.styleCode}</p>
          <h3 className="mt-1 text-[13px] font-semibold leading-tight text-[var(--color-text)] sm:mt-1.5 sm:text-lg">{product.name}</h3>

          <div className="mt-2 flex flex-wrap gap-1 sm:mt-2.5 sm:gap-1.5">
            {customizationChips(customization, { sizeNoun: chart?.noun || 'Size' }).map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1 border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-1.5 py-0.5 text-[10px] text-[var(--color-text)] sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs"
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

          <p className="mt-1.5 flex items-center gap-1.5 text-[10px] leading-snug text-[var(--color-text-muted)] sm:mt-2 sm:text-xs">
            <span>
              Gold {formatWeight(goldWeight, 'g')}
              {customization.goldCarat ? ` (${customization.goldCarat})` : ''} · Diamond {formatWeight(diamondWeight, 'ct')}
            </span>
            <WeightDisclaimerTrigger />
          </p>

          {customization.note ? (
            <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)] sm:mt-2 sm:text-sm">
              <span className="text-[var(--color-text)]">Custom request:</span> {customization.note}
            </p>
          ) : null}

          <div className="mt-2.5 border-t border-[var(--color-border)] pt-2.5 sm:mt-3 sm:pt-3">
            <p className="lux-label mb-1.5 text-[9px] sm:mb-2 sm:text-[10px]">Edit this piece</p>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {options.goldColors?.length ? (
                <Select
                  options={options.goldColors}
                  value={customization.goldColor}
                  placeholder="Gold colour"
                  onChange={(goldColor) => editSelection({ goldColor })}
                />
              ) : null}
              {options.goldCarats?.length ? (
                <Select
                  options={options.goldCarats}
                  value={customization.goldCarat}
                  placeholder="Gold karat"
                  onChange={(goldCarat) => editSelection({ goldCarat })}
                />
              ) : null}
              {chart ? (
                <Select
                  options={chart.rows.map((row) => ({ value: row.size, label: row.size, hint: row.hint }))}
                  value={customization.size}
                  placeholder={chart.noun}
                  onChange={(size) => editSelection({ size })}
                />
              ) : null}
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-[var(--color-text-muted)] sm:mt-2 sm:text-[11px]">
              Changing an option here updates this line only. If it matches another line in your cart, the two are combined.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[var(--color-border)]">
            <button
              className="flex h-8 w-8 items-center justify-center text-base text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] sm:h-9 sm:w-9 sm:text-lg"
              onClick={() => onUpdate(item.id, { quantity: Math.max(1, item.quantity - 1) })}
            >
              −
            </button>
            <span className="w-7 border-x border-[var(--color-border)] text-center text-[13px] font-medium text-[var(--color-text)] sm:w-8 sm:text-sm">
              {item.quantity}
            </span>
            <button
              className="flex h-8 w-8 items-center justify-center text-base text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] sm:h-9 sm:w-9 sm:text-lg"
              onClick={() => onUpdate(item.id, { quantity: item.quantity + 1 })}
            >
              +
            </button>
          </div>
          <button
            onClick={() => onRemove(item.id)}
            aria-label="Remove from cart"
            className="flex h-8 w-8 items-center justify-center border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:border-red-300 hover:text-red-500 sm:h-9 sm:w-9"
          >
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
    </Panel>
  );
}

export function CartPage() {
  const { cart, updateCart, removeFromCart } = useCart();
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: userService.profile });
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const totalDiamondWeight = cart.items.reduce(
    (sum, item) => sum + diamondWeightFor(item.product) * (item.quantity || 1),
    0,
  );
  // Karat-aware: a 9K line weighs its own 9K figure, not the style's default.
  const totalGoldWeight = cart.items.reduce(
    (sum, item) => sum + goldWeightFor(item.product, item.customization?.goldCarat) * (item.quantity || 1),
    0,
  );
  const totalPieces = cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      await downloadDeArteCartPdf({ cart, user: profile || {} });
      toast.success('Cart PDF downloaded');
    } catch (error) {
      toast.error(error?.message || 'Could not generate PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!cart.items.length) {
    return (
      <section className="page-shell section-gap">
        <EmptyState
          title="Your cart is empty"
          description="Start with collections, new arrivals, or best sellers to curate your next buyer order."
          action={<Link to="/products"><Button>Browse Collections</Button></Link>}
        />
      </section>
    );
  }

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Cart" title="Order review without visible pricing." description="Pricing will be confirmed by your sales representative." />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {cart.items.map((item) => (
            <CartLine key={item.id} item={item} onUpdate={updateCart} onRemove={removeFromCart} />
          ))}
        </div>

        <Panel className="h-fit space-y-3 sm:space-y-5">
          <p className="lux-label text-[10px] sm:text-xs">Order Summary</p>
          <div className="space-y-2 border-t border-[var(--color-border)] pt-3 sm:space-y-3 sm:pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--color-text-muted)] sm:text-sm">
                Total Pieces
                <span className="mt-0.5 block text-[10px] sm:text-xs">
                  across {cart.items.length} {cart.items.length === 1 ? 'variant' : 'variants'}
                </span>
              </span>
              <span className="text-2xl font-light text-[var(--color-primary)] sm:text-3xl">{totalPieces}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)] sm:text-sm">
                Total Diamond Weight
                <WeightDisclaimerTrigger />
              </span>
              <span className="text-base font-light text-[var(--color-primary)] sm:text-xl">{totalDiamondWeight.toFixed(2)} ct</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)] sm:text-sm">
                Total Gold Weight
                <WeightDisclaimerTrigger />
              </span>
              <span className="text-base font-light text-[var(--color-primary)] sm:text-xl">{totalGoldWeight.toFixed(2)} g</span>
            </div>
          </div>
          <div className="space-y-1.5 border-t border-[var(--color-border)] pt-3 text-[12px] text-[var(--color-text-muted)] sm:pt-4 sm:text-sm">
            <p>Pricing confirmed by your sales representative after review.</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] sm:text-xs">
              <span>* All weights are approximate and for reference only.</span>
              <WeightDisclaimerTrigger />
            </p>
            {cart.specialInstructions ? (
              <p className="mt-2">Note: {cart.specialInstructions}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:gap-3">
            <Button variant="secondary" className="w-full" icon={Download} loading={isDownloadingPdf} onClick={handleDownloadPdf}>
              Download Catalogue PDF
            </Button>
            <Link to="/checkout">
              <Button className="w-full">Proceed to Checkout</Button>
            </Link>
          </div>
          <Link to="/products" className="inline-flex text-[12px] text-[var(--color-primary)] hover:underline sm:text-sm">
            Continue Shopping
          </Link>
        </Panel>
      </div>
    </section>
  );
}

const WISHLIST_TAB =
  'whitespace-nowrap border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] transition sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.12em]';

export function WishlistPage() {
  const { wishlist, removeFromWishlist, createWishlistCollection } = useWishlist();
  const { addToCart } = useCart();
  const [collectionName, setCollectionName] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const visibleItems = useMemo(() => {
    if (activeTab === 'all') return wishlist.items;
    return wishlist.items.filter((i) => i.collectionId === activeTab);
  }, [wishlist.items, activeTab]);

  const getCollectionName = (collectionId) =>
    wishlist.collections.find((c) => c.id === collectionId)?.name || 'My Wishlist';

  return (
    <section className="page-shell section-gap">
      <SectionHeading
        eyebrow="Wishlist"
        title="Named collections for buyer planning"
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
      </div>

      {/* Create collection */}
      <Panel className="mb-4 flex flex-col gap-2.5 sm:mb-6 sm:gap-4 md:flex-row md:items-center">
        <input
          value={collectionName}
          onChange={(event) => setCollectionName(event.target.value)}
          className="flex-1 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)] sm:px-4 sm:py-3 sm:text-base"
          placeholder="New collection name (e.g. Wedding Season)"
        />
        <Button
          onClick={() =>
            collectionName &&
            createWishlistCollection({ name: collectionName }).then(() => setCollectionName(''))
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

            return (
            <Panel key={item.id}>
              <Link to={`/products/${item.product.styleCode}`}>
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="mb-2.5 h-36 w-full object-cover transition duration-300 hover:opacity-90 sm:mb-4 sm:h-72"
                />
              </Link>
              <span className="mb-2 inline-block border border-[var(--color-border)] px-1.5 py-px text-[9px] uppercase tracking-[0.14em] text-[var(--color-primary)] sm:mb-3 sm:px-2 sm:py-0.5 sm:text-[10px] sm:tracking-[0.2em]">
                {getCollectionName(item.collectionId)}
              </span>
              <p className="font-[var(--font-accent)] text-[9px] tracking-[0.22em] text-[var(--color-text-muted)] sm:text-xs sm:tracking-[0.3em]">
                {item.product.styleCode}
              </p>
              <h3 className="mt-1 line-clamp-2 text-[13px] font-semibold leading-tight text-[var(--color-text)] sm:mt-1.5 sm:text-xl">
                {item.product.name}
              </h3>
              <div className="mt-2.5 flex flex-col gap-1.5 sm:mt-5 sm:flex-row sm:gap-3">
                {needsSize ? (
                  <Link to={`/products/${item.product.styleCode}`} className="w-full sm:flex-1">
                    <Button className="w-full">Choose Size</Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full sm:flex-1"
                    onClick={() =>
                      addToCart({
                        productId: item.product.id,
                        quantity: 1,
                        customization: {
                          goldColor: item.product.customizationOptions.goldColors[0],
                          goldCarat: item.product.customizationOptions.goldCarats[0],
                          diamondQuality: DIAMOND_QUALITY,
                        },
                      })
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

export function CheckoutPage() {
  const { cart, refreshCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const steps = ['Notes', 'Review'];
  const form = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      notes: '',
    },
  });
  const {
    formState: { isSubmitting },
  } = form;
  const reviewValues = form.getValues();

  const handleNextStep = () => {
    setStep((value) => Math.min(steps.length - 1, value + 1));
  };

  const placeOrder = form.handleSubmit(async (values) => {
    try {
      const order = await orderService.create(values);
      await refreshCart();
      navigate('/profile', {
        state: {
          successMessage: `Order placed successfully. Order ID: ${order.orderId}`,
        },
      });
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Could not place order';
      toast.error(msg);
    }
  });

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Checkout" title="Multi-step approval-ready checkout" />
      <div className="mb-5 flex gap-3 sm:mb-8 sm:gap-4">
        {steps.map((label, index) => (
          <div key={label} className="flex-1">
            <div
              className={`mb-2 h-0.5 w-full transition-colors sm:mb-2.5 ${index <= step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
            />
            <div className={`text-[10px] transition-colors sm:text-xs ${index <= step ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
              <span className="block font-semibold">{String(index + 1).padStart(2, '0')}</span>
              <span className="uppercase tracking-[0.08em]">{label}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          {/* The order is placed from the Place Order button only. Native form
              submission stays disabled so no stray submit (Enter key, or a
              button React re-typed mid-click) can skip the review step. */}
          <form className="space-y-4 sm:space-y-5" onSubmit={(event) => event.preventDefault()}>
            {step === 0 ? (
              <textarea {...form.register('notes')} placeholder="Special instructions and delivery preferences" className="min-h-[110px] w-full border border-[var(--color-border)] bg-transparent p-3 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)] sm:min-h-[160px] sm:p-4 sm:text-base" />
            ) : null}
            {step === 1 ? (
              <div className="space-y-4">
                <p className="text-[13px] text-[var(--color-text-muted)] sm:text-sm">Notes: {reviewValues.notes || 'No notes added'}</p>
              </div>
            ) : null}

            <div className="flex justify-between gap-3">
              <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>
                Back
              </Button>
              {/* Distinct keys keep these as separate DOM nodes: without them
                  React reuses one <button> and patching its type during the
                  click made the browser submit the form on the same click. */}
              {step < steps.length - 1 ? (
                <Button key="next-step" type="button" onClick={handleNextStep}>
                  Next Step
                </Button>
              ) : (
                <Button key="place-order" type="button" loading={isSubmitting} disabled={isSubmitting} onClick={placeOrder}>
                  Place Order
                </Button>
              )}
            </div>
          </form>
        </Panel>
        <Panel>
          <p className="lux-label mb-3 text-[10px] sm:mb-4 sm:text-xs">Review Summary</p>
          <div className="space-y-2.5 sm:space-y-4">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2.5 sm:gap-4 sm:pb-4">
                <img
                  src={variantImage(item.product, item.customization)}
                  alt={item.product.name}
                  className="h-12 w-12 flex-shrink-0 object-cover sm:h-16 sm:w-16"
                />
                <div className="min-w-0">
                  <p className="text-[13px] text-[var(--color-text)] sm:text-base">{item.product.name}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] sm:text-xs">
                    Qty {item.quantity} •{' '}
                    {customizationSummary(item.customization, {
                      sizeNoun: resolveSizeChart(item.product)?.noun || 'Size',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

export function CataloguePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['catalogues'],
    queryFn: orderService.catalogues,
  });

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock label="Loading private catalogues..." /></div>;
  }

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Catalogues" title="Assigned private lookbooks" description="Sales-rep curated catalogues visible only to approved buyers." />
      <div className="grid gap-6 lg:grid-cols-2">
        {data.map((catalogue) => (
          <Panel key={catalogue.id}>
            <div className="mb-4 grid grid-cols-3 gap-3">
              {catalogue.products.slice(0, 3).map((product) => (
                <img key={product.id} src={product.images[0]} alt={product.name} className="h-32 w-full object-cover" />
              ))}
            </div>
            <h3 className="text-2xl font-semibold text-[var(--color-text)]">{catalogue.name}</h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{catalogue.description}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              {formatDate(catalogue.createdAt)} • {catalogue.productIds.length} Items
            </p>
          </Panel>
        ))}
      </div>
    </section>
  );
}

function OrderHistoryRow({ order, downloading, onDownload }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [submitting, setSubmitting] = useState(false);

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
      toast.error(error?.response?.data?.message || error?.message || 'Could not submit change request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <tr className="border-t border-[var(--color-border)] text-[var(--color-text)]">
        <td className="whitespace-nowrap py-2.5 pr-3 sm:py-4">{order.orderId}</td>
        <td className="whitespace-nowrap py-2.5 pr-3 sm:py-4">{formatDate(order.date)}</td>
        <td className="py-2.5 pr-3 sm:py-4">{order.items.length}</td>
        <td className="py-2.5 pr-3 sm:py-4"><StatusBadge status={order.status} /></td>
        <td className="py-2.5 text-right sm:py-4">
          <div className="flex items-center justify-end gap-1">
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
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-[var(--color-border)]">
          <td colSpan={5} className="bg-[var(--color-surface-alt)] px-4 py-4">
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:flex-row">
                  <img
                    src={variantImage(item.product, item.customization) || item.product?.media?.[0]?.secureUrl}
                    alt={item.product?.name || 'Product'}
                    className="h-12 w-12 flex-shrink-0 border border-[var(--color-border)] object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{item.product?.name}</p>
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
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: userService.profile });
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: orderService.list });
  const [downloadingOrderId, setDownloadingOrderId] = useState(null);

  const handleDownloadOrder = async (order) => {
    try {
      setDownloadingOrderId(order.id);
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
      <SectionHeading eyebrow="Profile" title="Buyer account and order history" />
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <p className="lux-label mb-3 text-[10px] sm:mb-4 sm:text-xs">My Profile</p>
          {profile ? (
            <div className="space-y-2 text-[13px] text-[var(--color-text-muted)] sm:space-y-4 sm:text-sm">
              <p><span className="text-[var(--color-text)] font-medium">Name:</span> {profile.name}</p>
              <p><span className="text-[var(--color-text)] font-medium">Email:</span> {profile.email}</p>
              <p><span className="text-[var(--color-text)] font-medium">Company:</span> {profile.companyName}</p>
              <p><span className="text-[var(--color-text)] font-medium">City:</span> {profile.city}</p>
              <p><span className="text-[var(--color-text)] font-medium">GST:</span> {profile.gstNumber || 'Not provided'}</p>
            </div>
          ) : <LoadingBlock label="Loading profile..." />}
        </Panel>
        <Panel>
          <p className="lux-label mb-3 text-[10px] sm:mb-4 sm:text-xs">Order History</p>
          <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[520px] text-left text-[12px] sm:min-w-0 sm:text-sm">
              <thead className="text-[var(--color-text-muted)]">
                <tr>
                  <th className="whitespace-nowrap pb-2.5 pr-3 sm:pb-4">Order ID</th>
                  <th className="whitespace-nowrap pb-2.5 pr-3 sm:pb-4">Date</th>
                  <th className="pb-2.5 pr-3 sm:pb-4">Items</th>
                  <th className="pb-2.5 pr-3 sm:pb-4">Status</th>
                  <th className="pb-2.5 text-right sm:pb-4">Actions</th>
                </tr>
              </thead>
              <tbody>
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
        </Panel>
      </div>
    </section>
  );
}
