import { ChevronDown, Download, Share2, Trash2 } from 'lucide-react';
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
import { SizeSelector } from '../components/product/SizeSelector';
import { defaultSizeFor, resolveSizeChart } from '../data/sizeMaster';
import { downloadDeArteCartPdf, downloadDeArteOrderPdf } from '../utils/orderPdf';
import { formatDate } from '../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkoutSchema } from '../utils/validators';
import { useCollections } from '../hooks/useProducts';

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

const PRODUCT_CATEGORY_TILES = [
  { label: 'Rings', categorySlug: 'Rings', imageSrc: '/images/shop-category/rings.jpg' },
  { label: 'Earrings', categorySlug: 'Earrings', imageSrc: '/images/shop-category/earrings.jpg' },
  { label: 'Bracelets', categorySlug: 'Bracelets', imageSrc: '/images/shop-category/bracelets.jpg' },
  { label: 'Pendants', categorySlug: 'Necklaces', imageSrc: '/images/shop-category/pendants.jpg' },
];

/** Shop-by-collection landing: curated collection cards like Ocean Collection, Lunar Collection, and more. */
export function CollectionsPage() {
  const { data, isLoading } = useCollections();

  const navy = '#002130';

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock label="Loading collections..." /></div>;
  }

  return (
    <section className="page-shell animate-page-enter pb-14 pt-12 sm:pb-20 sm:pt-16 md:pb-28 md:pt-20">
      <Helmet>
        <title>Collections | DeArte Jewellery</title>
        <meta
          name="description"
          content="Discover curated jewellery collections like Ocean Collection, Lunar Collection, and more."
        />
      </Helmet>

      <header className="mb-10 text-center sm:mb-12 md:mb-14">
        <ShopCategoryDiamondIcon className="mx-auto h-11 w-11 sm:h-12 sm:w-12 md:h-[52px] md:w-[52px]" />
        <h1
          className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[2rem] md:text-[2.25rem]"
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
            <div className="space-y-2 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Collection</p>
              <h2 className="lux-heading text-2xl text-[var(--color-text)]">{collection.name}</h2>
              <p className="text-sm text-[var(--color-text-muted)]">Tap to shop the pieces curated under this collection story.</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ProductListPage() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = category ? decodeURIComponent(category) : searchParams.get('category') || '';
  const activeCollection = searchParams.get('collection') || '';
  const pageScope = `${activeCategory}::${activeCollection}`;
  const [paging, setPaging] = useState({ scope: pageScope, page: 1 });
  const { filters, sort, setSort, setFilter, resetFilters } = useFilters();
  const page = paging.scope === pageScope ? paging.page : 1;

  useEffect(() => {
    const urlSort = searchParams.get('sort');
    if (urlSort && urlSort !== sort) {
      setSort(urlSort);
    }
  }, [searchParams, setSort, sort]);

  const params = useMemo(
    () => ({
      page,
      limit: 6,
      category: activeCategory,
      collection: activeCollection || filters.collection.join(','),
      sort,
      subCategory: filters.subCategory.join(','),
      metalColor: filters.metalColor.join(','),
      diamondMin: filters.diamondMin,
      diamondMax: filters.diamondMax,
      goldMin: filters.goldMin,
      goldMax: filters.goldMax,
      stockType: filters.stockType,
    }),
    [activeCategory, activeCollection, filters, page, sort],
  );

  const { data, isLoading } = useProducts(params);
  const { isAuthenticated } = useAuth();

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock label="Curating product library..." /></div>;
  }

  return (
    <section className="page-shell section-gap">
      <SectionHeading
        eyebrow="Products"
        title={activeCategory || activeCollection || 'Shop by Product'}
        description="Browse jewellery by product type first, then refine by collection, metal, and stock status."
      />
      {!isAuthenticated ? (
        <Panel className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">
            You're viewing a small preview of our catalogue. Sign in to your buyer account to browse the full collection.
          </p>
          <Link to="/login" className="shrink-0">
            <Button>Sign in to see more</Button>
          </Link>
        </Panel>
      ) : null}
      <div className="space-y-6">
        {!activeCategory && !activeCollection && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PRODUCT_CATEGORY_TILES.map((tile) => (
              <ShopCategoryCard
                key={tile.label}
                label={tile.label}
                categorySlug={tile.categorySlug}
                imageSrc={tile.imageSrc}
                className="aspect-[4/5] min-h-[17rem] w-full"
              />
            ))}
          </div>
        )}
        <ProductFilters
          filters={data.filters}
          activeFilters={filters}
          setFilter={setFilter}
          resetFilters={() => {
            resetFilters();
            setSearchParams(sort ? { sort } : {});
          }}
        />
        <div className="lux-panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">{data.total} items found</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[activeCategory, activeCollection, ...filters.subCategory, ...filters.collection, ...filters.metalColor, filters.stockType]
                .filter(Boolean)
                .map((chip) => (
                  <span key={chip} className="border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-1 text-xs tracking-[0.08em] text-[var(--color-text-muted)] uppercase">
                    {chip}
                  </span>
                ))}
            </div>
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

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {data.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="secondary" onClick={() => setPaging((current) => ({ scope: pageScope, page: Math.max(1, current.scope === pageScope ? current.page - 1 : 1) }))} disabled={page === 1}>
            Previous
          </Button>
          <p className="text-sm text-[var(--color-text-muted)]">
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
  const [selection, setSelection] = useState({
    goldColor: '',
    goldCarat: '',
    diamondQuality: '',
    note: '',
  });
  const [sizeState, setSizeState] = useState({ productId: null, lines: [] });
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const { data, isLoading } = useProduct(styleCode);
  const { cart, addToCart, updateCart, removeFromCart } = useCart();
  const { wishlist, addToWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [wishlistCollectionId, setWishlistCollectionId] = useState('');

  const sizeChart = useMemo(() => resolveSizeChart(data || {}), [data]);

  // Derived rather than synced through an effect: until the buyer touches the
  // picker, a product falls back to a single mid-range row from its chart.
  const sizeLines =
    sizeState.productId === data?.id
      ? sizeState.lines
      : sizeChart
        ? [{ size: defaultSizeFor(data), quantity: 1 }]
        : [];

  const setSizeLines = (update) =>
    setSizeState((current) => ({
      productId: data?.id,
      lines: typeof update === 'function' ? update(current.productId === data?.id ? current.lines : sizeLines) : update,
    }));

  const availableGoldColors = data?.customizationOptions?.goldColors || [];
  const availableGoldCarats = data?.customizationOptions?.goldCarats || [];
  const availableDiamondQualities = data?.customizationOptions?.diamondQualities || [];
  const effectiveSelection = {
    goldColor: availableGoldColors.includes(selection.goldColor)
      ? selection.goldColor
      : data?.colorVariants?.[0]?.color || availableGoldColors[0] || '',
    goldCarat: availableGoldCarats.includes(selection.goldCarat)
      ? selection.goldCarat
      : availableGoldCarats[1] || availableGoldCarats[0] || '',
    diamondQuality: availableDiamondQualities.includes(selection.diamondQuality)
      ? selection.diamondQuality
      : availableDiamondQualities[1] || availableDiamondQualities[0] || '',
    note: selection.note || '',
  };
  const selectedVariant = data?.colorVariants?.find((variant) => variant.color === effectiveSelection.goldColor);
  const activeImages = selectedVariant?.views?.map((item) => item.asset?.secureUrl).filter(Boolean)?.length
    ? selectedVariant.views.map((item) => item.asset.secureUrl).filter(Boolean)
    : data?.images || [];
  const safeActiveImage = activeImages[activeImage] ? activeImage : 0;

  const cartItem = cart?.items?.find(
    (i) =>
      i.product?.id === data?.id &&
      i.customization?.goldColor === effectiveSelection.goldColor &&
      i.customization?.goldCarat === effectiveSelection.goldCarat &&
      i.customization?.diamondQuality === effectiveSelection.diamondQuality &&
      (i.customization?.note || '') === effectiveSelection.note,
  );
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
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Panel className="overflow-hidden p-0">
            <TransformWrapper>
              <TransformComponent wrapperClass="h-full w-full">
                <img src={activeImages[safeActiveImage] || data.images[0]} alt={data.name} className="h-[360px] w-full object-cover sm:h-[500px] lg:h-[620px]" />
              </TransformComponent>
            </TransformWrapper>
          </Panel>
          <div className="grid grid-cols-4 gap-3">
            {activeImages.map((image, index) => (
              <button key={image} className={`overflow-hidden border ${index === safeActiveImage ? 'border-[var(--color-border-active)]' : 'border-[var(--color-border)]'}`} onClick={() => setActiveImage(index)}>
                <img src={image} alt="" className="h-16 w-full object-cover sm:h-24" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="font-[var(--font-accent)] text-xs tracking-[0.3em] text-[var(--color-text-muted)]">{data.styleCode}</p>
            <h1 className="lux-heading mt-3 text-5xl">{data.name}</h1>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              {data.category} &gt; {data.subCategory} &gt; {data.collection}
            </p>
          </div>

          <Panel>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.specifications.map((spec, specIndex) => (
                <div key={`${spec.attribute}-${specIndex}`} className="border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{spec.attribute}</p>
                    {spec.attribute?.toLowerCase().includes('weight') && (
                      <WeightDisclaimerTrigger />
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-text)]">{spec.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-1.5 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-text-muted)]">
              <span>* All weights mentioned are approximate.</span>
              <WeightDisclaimerTrigger />
            </div>
          </Panel>

          <Panel>
            <p className="lux-label mb-4">Customization</p>
            <div className="grid gap-4 md:grid-cols-3">
              <Select
                label="Gold Color"
                options={availableGoldColors}
                value={effectiveSelection.goldColor}
                onChange={(option) => {
                  setSelection((current) => ({ ...current, goldColor: option }));
                  setActiveImage(0);
                }}
              />
              <Select
                label="Gold Carat"
                options={availableGoldCarats}
                value={effectiveSelection.goldCarat}
                onChange={(option) => setSelection((current) => ({ ...current, goldCarat: option }))}
              />
              <Select
                label="Diamond Quality"
                options={availableDiamondQualities}
                value={effectiveSelection.diamondQuality}
                onChange={(option) => setSelection((current) => ({ ...current, diamondQuality: option }))}
              />
            </div>
            <label className="mt-4 block text-sm">
              <span className="mb-2 block text-[var(--color-text-muted)]">Custom request for this piece (optional)</span>
              <textarea
                value={selection.note}
                onChange={(event) => setSelection((current) => ({ ...current, note: event.target.value }))}
                placeholder="e.g. engrave initials, specific ring size, alter chain length, special finishing..."
                className="min-h-[96px] w-full border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)]"
              />
            </label>
            <div className="mt-5 border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 text-sm text-[var(--color-text-muted)]">
              Your Selection: {effectiveSelection.goldColor}, {effectiveSelection.goldCarat}, {effectiveSelection.diamondQuality}
              {effectiveSelection.note ? <span className="mt-1 block">Custom request: {effectiveSelection.note}</span> : null}
            </div>
          </Panel>

          {sizeChart ? (
            <Panel>
              <SizeSelector
                chart={sizeChart}
                lines={sizeLines}
                onChange={setSizeLines}
                onOpenChart={() => setIsSizeChartOpen(true)}
                maxQuantity={data.stockType === 'Ready Stock' ? data.stockQuantity ?? 0 : undefined}
              />
            </Panel>
          ) : null}

          {data.stockType === 'Ready Stock' ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              {data.stockQuantity > 0 ? (
                <span>{data.stockQuantity} in stock</span>
              ) : (
                <span className="text-[var(--color-primary)]">Out of stock</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">Made to order — not held as finished stock.</p>
          )}
          <div className="flex flex-col gap-3">
            {cartItem && !sizeChart ? (
              <div className="flex w-full items-center border border-[var(--color-border)]">
                <button
                  className="flex h-12 flex-1 items-center justify-center text-2xl leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
                  onClick={() =>
                    requireAuth(() =>
                      cartItem.quantity <= 1
                        ? removeFromCart(cartItem.id)
                        : updateCart(cartItem.id, { quantity: cartItem.quantity - 1 }),
                    )
                  }
                >
                  −
                </button>
                <span className="min-w-[3rem] border-x border-[var(--color-border)] py-3 text-center text-sm font-medium text-[var(--color-text)]">
                  {cartItem.quantity}
                </span>
                <button
                  className="flex h-12 flex-1 items-center justify-center text-2xl leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
                  onClick={() => requireAuth(() => updateCart(cartItem.id, { quantity: cartItem.quantity + 1 }))}
                >
                  +
                </button>
              </div>
            ) : (
              <Button
                className="w-full"
                disabled={
                  (data.stockType === 'Ready Stock' && (data.stockQuantity ?? 0) <= 0) ||
                  (sizeChart && !sizeLines.every((line) => line.size))
                }
                onClick={() =>
                  requireAuth(() =>
                    addToCart({
                      productId: data.id,
                      customization: effectiveSelection,
                      ...(sizeChart ? { lines: sizeLines } : { quantity: 1 }),
                    }),
                  )
                }
              >
                {sizeChart && sizeLines.length > 1 ? `Add ${sizeLines.length} Sizes to Cart` : 'Add to Cart'}
              </Button>
            )}
            <div className="flex items-stretch gap-2">
              {(wishlist?.collections?.length ?? 0) > 1 && (
                <select
                  className="flex-1 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)]"
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

          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
            <span>{data.stockType}</span>
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

      <section className="pt-10 sm:pt-16">
        <SectionHeading eyebrow="Related Products" title="More from this design story" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.relatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <SizeChartModal
        chart={sizeChart}
        open={isSizeChartOpen}
        onClose={() => setIsSizeChartOpen(false)}
        selectedSize={sizeLines[0]?.size}
        onSelectSize={(size) => {
          // Applies to the first row; further rows stay under the buyer's control.
          setSizeLines((current) =>
            current.length
              ? current.map((line, index) => (index === 0 ? { ...line, size } : line))
              : [{ size, quantity: 1 }],
          );
          setIsSizeChartOpen(false);
        }}
      />
    </section>
  );
}

export function CartPage() {
  const { cart, updateCart, removeFromCart } = useCart();
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: userService.profile });
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const totalDiamondWeight = cart.items.reduce((sum, item) => sum + (Number(item.product?.diamondWeight || 0) * (item.quantity || 1)), 0);
  const totalGoldWeight = cart.items.reduce((sum, item) => sum + (Number(item.product?.goldWeight || 0) * (item.quantity || 1)), 0);

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
          {cart.items.map((item) => {
            const itemChart = resolveSizeChart(item.product);

            return (
            <Panel key={item.id} className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <img
                src={item.product.images[0]}
                alt={item.product.name}
                className="h-40 w-full flex-shrink-0 object-cover sm:h-28 sm:w-28"
              />
              <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-[var(--font-accent)] text-xs tracking-[0.2em] text-[var(--color-text-muted)]">{item.product.styleCode}</p>
                  <h3 className="mt-1.5 text-lg font-semibold leading-tight text-[var(--color-text)]">{item.product.name}</h3>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    {item.customization.goldColor} · {item.customization.goldCarat} · {item.customization.diamondQuality}
                  </p>
                  {itemChart && item.customization.size ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-1 text-xs text-[var(--color-primary)]">
                        {itemChart.noun}: {item.customization.size}
                      </span>
                      <Select
                        className="w-44"
                        buttonClassName="min-h-9 py-1.5 text-xs"
                        options={itemChart.rows.map((row) => ({ value: row.size, label: row.size, hint: row.hint }))}
                        value={item.customization.size}
                        onChange={(size) => updateCart(item.id, { customization: { size } })}
                      />
                    </div>
                  ) : null}
                  {item.customization.note ? (
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      <span className="text-[var(--color-text)]">Custom request:</span> {item.customization.note}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-[var(--color-border)]">
                    <button
                      className="flex h-9 w-9 items-center justify-center text-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
                      onClick={() => updateCart(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                    >
                      −
                    </button>
                    <span className="w-8 border-x border-[var(--color-border)] text-center text-sm font-medium text-[var(--color-text)]">
                      {item.quantity}
                    </span>
                    <button
                      className="flex h-9 w-9 items-center justify-center text-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
                      onClick={() => updateCart(item.id, { quantity: item.quantity + 1 })}
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="flex h-9 w-9 items-center justify-center border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:border-red-300 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Panel>
            );
          })}
        </div>

        <Panel className="h-fit space-y-5">
          <p className="lux-label">Order Summary</p>
          <div className="border-t border-[var(--color-border)] pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">Total Items</span>
              <span className="text-3xl font-light text-[var(--color-primary)]">{cart.items.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                Total Diamond Weight
                <WeightDisclaimerTrigger />
              </span>
              <span className="text-xl font-light text-[var(--color-primary)]">{totalDiamondWeight.toFixed(2)} ct</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                Total Gold Weight
                <WeightDisclaimerTrigger />
              </span>
              <span className="text-xl font-light text-[var(--color-primary)]">{totalGoldWeight.toFixed(2)} g</span>
            </div>
          </div>
          <div className="space-y-1.5 border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-text-muted)]">
            <p>Pricing confirmed by your sales representative after review.</p>
            <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mt-1.5">
              <span>* All weights are approximate and for reference only.</span>
              <WeightDisclaimerTrigger />
            </p>
            {cart.specialInstructions ? (
              <p className="mt-2">Note: {cart.specialInstructions}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3">
            <Button variant="secondary" className="w-full" icon={Download} loading={isDownloadingPdf} onClick={handleDownloadPdf}>
              Download Catalogue PDF
            </Button>
            <Link to="/checkout">
              <Button className="w-full">Proceed to Checkout</Button>
            </Link>
          </div>
          <Link to="/products" className="inline-flex text-sm text-[var(--color-primary)] hover:underline">
            Continue Shopping
          </Link>
        </Panel>
      </div>
    </section>
  );
}

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
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] border transition ${
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
              className={`px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] border transition ${
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
      <Panel className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        <input
          value={collectionName}
          onChange={(event) => setCollectionName(event.target.value)}
          className="flex-1 border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 outline-none focus:border-[var(--color-border-active)] text-[var(--color-text)]"
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
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
                  className="mb-4 h-56 w-full object-cover transition duration-300 hover:opacity-90 sm:h-72"
                />
              </Link>
              <span className="mb-3 inline-block border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--color-primary)]">
                {getCollectionName(item.collectionId)}
              </span>
              <p className="font-[var(--font-accent)] text-xs tracking-[0.3em] text-[var(--color-text-muted)]">
                {item.product.styleCode}
              </p>
              <h3 className="mt-1.5 text-xl font-semibold text-[var(--color-text)]">
                {item.product.name}
              </h3>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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
                          diamondQuality: item.product.customizationOptions.diamondQualities[0],
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

  const handleNextStep = async () => {
    setStep((value) => Math.min(steps.length - 1, value + 1));
  };

  const onSubmit = form.handleSubmit(async (values) => {
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
      <div className="mb-8 flex gap-4">
        {steps.map((label, index) => (
          <div key={label} className="flex-1">
            <div
              className={`mb-2.5 h-0.5 w-full transition-colors ${index <= step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
            />
            <div className={`text-xs transition-colors ${index <= step ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
              <span className="block font-semibold">{String(index + 1).padStart(2, '0')}</span>
              <span className="uppercase tracking-[0.08em]">{label}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <form className="space-y-5" onSubmit={onSubmit}>
            {step === 0 ? (
              <textarea {...form.register('notes')} placeholder="Special instructions and delivery preferences" className="min-h-[160px] w-full border border-[var(--color-border)] bg-transparent p-4 outline-none focus:border-[var(--color-border-active)] text-[var(--color-text)]" />
            ) : null}
            {step === 1 ? (
              <div className="space-y-4">
                <p className="text-sm text-[var(--color-text-muted)]">Notes: {reviewValues.notes || 'No notes added'}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button type="button" onClick={handleNextStep}>
                  Next Step
                </Button>
              ) : (
                <Button type="submit" loading={isSubmitting}>Place Order</Button>
              )}
            </div>
          </form>
        </Panel>
        <Panel>
          <p className="lux-label mb-4">Review Summary</p>
          <div className="space-y-4">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 border-b border-[var(--color-border)] pb-4">
                <img src={item.product.images[0]} alt={item.product.name} className="h-16 w-16 object-cover" />
                <div>
                  <p className="text-[var(--color-text)]">{item.product.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Qty {item.quantity} • {item.customization.goldCarat}
                    {item.customization.size ? ` • Size ${item.customization.size}` : ''}
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
        <td className="py-4">{order.orderId}</td>
        <td className="py-4">{formatDate(order.date)}</td>
        <td className="py-4">{order.items.length}</td>
        <td className="py-4"><StatusBadge status={order.status} /></td>
        <td className="py-4 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              className="px-3 py-2 text-[11px]"
              icon={ChevronDown}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Hide items' : 'View items'}
            </Button>
            <Button
              variant="ghost"
              className="px-3 py-2 text-[11px]"
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
                    src={item.product?.images?.[0] || item.product?.media?.[0]?.secureUrl}
                    alt={item.product?.name || 'Product'}
                    className="h-12 w-12 flex-shrink-0 border border-[var(--color-border)] object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{item.product?.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{item.product?.styleCode} • Qty {item.quantity}</p>
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
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <p className="lux-label mb-4">My Profile</p>
          {profile ? (
            <div className="space-y-4 text-sm text-[var(--color-text-muted)]">
              <p><span className="text-[var(--color-text)] font-medium">Name:</span> {profile.name}</p>
              <p><span className="text-[var(--color-text)] font-medium">Email:</span> {profile.email}</p>
              <p><span className="text-[var(--color-text)] font-medium">Company:</span> {profile.companyName}</p>
              <p><span className="text-[var(--color-text)] font-medium">City:</span> {profile.city}</p>
              <p><span className="text-[var(--color-text)] font-medium">GST:</span> {profile.gstNumber || 'Not provided'}</p>
            </div>
          ) : <LoadingBlock label="Loading profile..." />}
        </Panel>
        <Panel>
          <p className="lux-label mb-4">Order History</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[var(--color-text-muted)]">
                <tr>
                  <th className="pb-4">Order ID</th>
                  <th className="pb-4">Date</th>
                  <th className="pb-4">Items</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4 text-right">Actions</th>
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
