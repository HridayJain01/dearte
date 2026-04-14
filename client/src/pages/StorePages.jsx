import { Share2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { useProducts, useProduct } from '../hooks/useProducts';
import { useFilters } from '../hooks/useFilters';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { orderService } from '../services/orderService';
import { userService } from '../services/userService';
import { Button, EmptyState, LoadingBlock, Panel, SectionHeading } from '../components/ui/Primitives';
import { ProductCard } from '../components/product/ProductCard';
import { ProductFilters } from '../components/product/ProductFilters';
import { formatDate } from '../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkoutSchema } from '../utils/validators';

export function ProductListPage() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const { filters, sort, setSort, setFilter, resetFilters } = useFilters();
  const activeCategory = category ? decodeURIComponent(category) : searchParams.get('category') || '';

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
      sort,
      subCategory: filters.subCategory.join(','),
      collection: filters.collection.join(','),
      metalColor: filters.metalColor.join(','),
      diamondMin: filters.diamondMin,
      diamondMax: filters.diamondMax,
      goldMin: filters.goldMin,
      goldMax: filters.goldMax,
      stockType: filters.stockType,
    }),
    [activeCategory, filters, page, sort],
  );

  const { data, isLoading } = useProducts(params);

  if (isLoading) {
    return <div className="page-shell py-16"><LoadingBlock label="Curating product library..." /></div>;
  }

  return (
    <section className="page-shell section-gap">
      <SectionHeading
        eyebrow="Collections"
        title={activeCategory || 'All Jewellery Collections'}
        description="Explore ready stock and make-to-order jewellery without exposing buyer pricing."
      />
      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <ProductFilters
          filters={data.filters}
          activeFilters={filters}
          setFilter={setFilter}
          resetFilters={() => {
            resetFilters();
            setSearchParams(sort ? { sort } : {});
          }}
        />
        <div className="space-y-6">
          <div className="lux-panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-[var(--color-muted)]">{data.total} items found</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[...filters.subCategory, ...filters.collection, ...filters.metalColor, filters.stockType]
                  .filter(Boolean)
                  .map((chip) => (
                    <span key={chip} className="rounded-full bg-[var(--color-primary-bg)] border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-muted)]">
                      {chip}
                    </span>
                  ))}
              </div>
            </div>
            <select
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-primary-bg)] text-[var(--color-heading)] px-4 py-3"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setSearchParams(event.target.value ? { sort: event.target.value } : {});
              }}
            >
              <option value="">Featured</option>
              <option value="diamond-asc">Diamond Wt. Low to High</option>
              <option value="diamond-desc">Diamond Wt. High to Low</option>
              <option value="gold-asc">Gold Wt. Low to High</option>
              <option value="gold-desc">Gold Wt. High to Low</option>
              <option value="best-sellers">Best Sellers</option>
              <option value="new-arrivals">New Arrivals</option>
            </select>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>
              Previous
            </Button>
            <p className="text-sm text-[var(--color-muted)]">
              Page {data.page} of {data.totalPages}
            </p>
            <Button variant="secondary" onClick={() => setPage((value) => Math.min(data.totalPages, value + 1))} disabled={page >= data.totalPages}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProductDetailPage() {
  const { styleCode } = useParams();
  const [activeImage, setActiveImage] = useState(0);
  const { data, isLoading } = useProduct(styleCode);
  const { addToCart } = useCart();
  const { addToWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="page-shell py-16"><LoadingBlock label="Preparing product atelier..." /></div>;
  }

  const requireAuth = async (callback) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    await callback();
  };

  const defaultSelection = {
    goldColor: data.customizationOptions.goldColors[0],
    goldCarat: data.customizationOptions.goldCarats[1] || data.customizationOptions.goldCarats[0],
    diamondQuality: data.customizationOptions.diamondQualities[1] || data.customizationOptions.diamondQualities[0],
  };

  const ProductDetailContent = ({ product }) => {
    const [selection, setSelection] = useState(defaultSelection);

    return (
      <>
        <div className="space-y-6">
          <div>
            <p className="font-[var(--font-accent)] text-xs tracking-[0.3em] text-[var(--color-muted)]">{product.styleCode}</p>
            <h1 className="lux-heading mt-3 text-5xl">{product.name}</h1>
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              {product.category} &gt; {product.subCategory} &gt; {product.collection}
            </p>
          </div>

          <Panel>
            <div className="grid gap-3 sm:grid-cols-2">
              {product.specifications.map((spec) => (
                <div key={spec.attribute} className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-primary-bg)] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">{spec.attribute}</p>
                  <p className="mt-2 text-sm">{spec.value}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <p className="lux-label mb-4">Customization</p>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm">
                <span className="mb-2 block text-[var(--color-muted)]">Gold Color</span>
                <select className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary-bg)] text-[var(--color-heading)] px-3 py-3" value={selection.goldColor} onChange={(event) => setSelection((current) => ({ ...current, goldColor: event.target.value }))}>
                  {product.customizationOptions.goldColors.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-2 block text-[var(--color-muted)]">Gold Carat</span>
                <select className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary-bg)] text-[var(--color-heading)] px-3 py-3" value={selection.goldCarat} onChange={(event) => setSelection((current) => ({ ...current, goldCarat: event.target.value }))}>
                  {product.customizationOptions.goldCarats.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-2 block text-[var(--color-muted)]">Diamond Quality</span>
                <select className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary-bg)] text-[var(--color-heading)] px-3 py-3" value={selection.diamondQuality} onChange={(event) => setSelection((current) => ({ ...current, diamondQuality: event.target.value }))}>
                  {product.customizationOptions.diamondQualities.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-5 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-primary-bg)] p-4 text-sm text-[var(--color-muted)]">
              Your Selection: {selection.goldColor}, {selection.goldCarat}, {selection.diamondQuality}
            </div>
          </Panel>

          <div className="flex flex-wrap gap-3">
            <Button className="flex-1" onClick={() => requireAuth(() => addToCart({ productId: product.id, quantity: 1, customization: selection }))}>
              Add to Cart
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => requireAuth(() => addToWishlist({ productId: product.id }))}>
              Add to Wishlist
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted)]">
            <span>{product.stockType}</span>
            <button
              className="inline-flex items-center gap-2"
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Product link copied');
              }}
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>

          <Panel>
            <p className="lux-label mb-3">Education Teaser</p>
            <h3 className="text-2xl font-semibold">Need help explaining quality? Start with our diamond guide.</h3>
            <Link to="/education/diamond" className="mt-4 inline-flex text-sm text-[var(--color-champagne)]">
              Explore Diamond Education
            </Link>
          </Panel>
        </div>
      </>
    );
  };

  return (
    <section className="page-shell section-gap">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Panel className="overflow-hidden p-0">
            <TransformWrapper>
              <TransformComponent wrapperClass="h-full w-full">
                <img src={data.images[activeImage]} alt={data.name} className="h-[620px] w-full object-cover" />
              </TransformComponent>
            </TransformWrapper>
          </Panel>
          <div className="grid grid-cols-4 gap-3">
            {data.images.map((image, index) => (
              <button key={image} className={`overflow-hidden rounded-3xl border ${index === activeImage ? 'border-[var(--color-rose-petal)]' : 'border-[var(--color-border)]'}`} onClick={() => setActiveImage(index)}>
                <img src={image} alt="" className="h-24 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <ProductDetailContent key={data.id} product={data} />
      </div>

      <section className="pt-16">
        <SectionHeading eyebrow="Related Products" title="More from this design story" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.relatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </section>
  );
}

export function CartPage() {
  const { cart, updateCart, removeFromCart } = useCart();

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
            <Panel key={item.id} className="flex flex-col gap-4 md:flex-row">
              <img src={item.product.images[0]} alt={item.product.name} className="h-24 w-24 rounded-3xl object-cover" />
              <div className="flex-1">
                <p className="font-[var(--font-accent)] text-xs tracking-[0.2em] text-[var(--color-muted)]">{item.product.styleCode}</p>
                <h3 className="mt-2 text-xl font-semibold">{item.product.name}</h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {item.customization.goldColor}, {item.customization.goldCarat}, {item.customization.diamondQuality}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={() => updateCart(item.id, { quantity: Math.max(1, item.quantity - 1) })}>-</Button>
                <span>{item.quantity}</span>
                <Button variant="secondary" onClick={() => updateCart(item.id, { quantity: item.quantity + 1 })}>+</Button>
                <button onClick={() => removeFromCart(item.id)} className="rounded-full border border-[var(--color-border)] p-3 text-[var(--color-heading)] hover:text-red-500 hover:border-red-500 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Panel>
          ))}
        </div>

        <Panel className="h-fit space-y-4">
          <p className="lux-label">Order Summary</p>
          <p className="text-4xl font-semibold">{cart.items.length} Items</p>
          <p className="text-sm text-[var(--color-muted)]">Pricing will be confirmed by your sales representative after review.</p>
          <p className="text-sm text-[var(--color-muted)]">Special Instructions: {cart.specialInstructions || 'Add at checkout'}</p>
          <Link to="/checkout">
            <Button className="mt-4 w-full">Proceed to Checkout</Button>
          </Link>
          <Link to="/products" className="inline-flex text-sm text-[var(--color-champagne)]">Continue Shopping</Link>
        </Panel>
      </div>
    </section>
  );
}

export function WishlistPage() {
  const { wishlist, removeFromWishlist, createWishlistCollection } = useWishlist();
  const { addToCart } = useCart();
  const [collectionName, setCollectionName] = useState('');

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Wishlist" title="Named collections for buyer planning" description="Create themed groups like Wedding Season or Export Order, then move them to cart when ready." />
      <Panel className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        <input
          value={collectionName}
          onChange={(event) => setCollectionName(event.target.value)}
          className="flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-primary-bg)] px-4 py-3 outline-none focus:border-[var(--color-rose-petal)] text-[var(--color-heading)]"
          placeholder="Create wishlist collection"
        />
        <Button onClick={() => collectionName && createWishlistCollection({ name: collectionName }).then(() => setCollectionName(''))}>
          Create Collection
        </Button>
      </Panel>
      {!wishlist.items.length ? (
        <EmptyState title="No saved pieces yet" description="Start saving products into buyer-specific collections for later review." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {wishlist.items.map((item) => (
            <Panel key={item.id}>
              <img src={item.product.images[0]} alt={item.product.name} className="mb-4 h-72 w-full rounded-3xl object-cover" />
              <p className="font-[var(--font-accent)] text-xs tracking-[0.3em] text-[var(--color-muted)]">{item.product.styleCode}</p>
              <h3 className="mt-3 text-2xl font-semibold">{item.product.name}</h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Collection: {wishlist.collections.find((collection) => collection.id === item.collectionId)?.name || 'My Wishlist'}
              </p>
              <div className="mt-5 flex gap-3">
                <Button className="flex-1" onClick={() => addToCart({ productId: item.product.id, quantity: 1, customization: { goldColor: item.product.customizationOptions.goldColors[0], goldCarat: item.product.customizationOptions.goldCarats[0], diamondQuality: item.product.customizationOptions.diamondQualities[0] } })}>
                  Move to Cart
                </Button>
                <Button variant="secondary" className="flex-1" onClick={() => removeFromWishlist(item.id)}>
                  Remove
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </section>
  );
}

export function CheckoutPage() {
  const { cart, refreshCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const steps = ['Shipping', 'Notes', 'Payment', 'Review'];
  const form = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingAddress: '',
      notes: '',
      paymentMethod: 'Cash on Delivery',
    },
  });
  const reviewValues = form.getValues();

  const onSubmit = form.handleSubmit(async (values) => {
    const order = await orderService.create(values);
    await refreshCart();
    navigate('/profile', {
      state: {
        successMessage: `Order placed successfully. Order ID: ${order.orderId}`,
      },
    });
  });

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Checkout" title="Multi-step approval-ready checkout" />
      <div className="mb-8 grid gap-3 md:grid-cols-4">
        {steps.map((label, index) => (
          <div key={label} className={`rounded-full border px-4 py-3 text-sm ${index <= step ? 'border-[var(--color-rose-gold)] text-[var(--color-champagne)]' : 'border-white/10 text-[var(--color-muted)]'}`}>
            {index + 1}. {label}
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <form className="space-y-5" onSubmit={onSubmit}>
            {step === 0 ? (
              <textarea {...form.register('shippingAddress')} placeholder="Shipping address" className="min-h-[160px] w-full rounded-[28px] border border-[var(--color-border)] bg-transparent p-4 outline-none focus:border-[var(--color-rose-petal)] text-[var(--color-heading)]" />
            ) : null}
            {step === 1 ? (
              <textarea {...form.register('notes')} placeholder="Special instructions and delivery preferences" className="min-h-[160px] w-full rounded-[28px] border border-[var(--color-border)] bg-transparent p-4 outline-none focus:border-[var(--color-rose-petal)] text-[var(--color-heading)]" />
            ) : null}
            {step === 2 ? (
              <div className="grid gap-4">
                <label className="rounded-[28px] border border-white/10 p-4">
                  <input type="radio" value="Cash on Delivery" {...form.register('paymentMethod')} className="mr-3" />
                  Cash on Delivery
                </label>
                <label className="rounded-[28px] border border-white/10 p-4">
                  <input type="radio" value="Offline Payment" {...form.register('paymentMethod')} className="mr-3" />
                  Offline Payment (bank details shared post-review)
                </label>
              </div>
            ) : null}
            {step === 3 ? (
              <div className="space-y-4">
                <p className="text-sm text-[var(--color-muted)]">Shipping: {reviewValues.shippingAddress || 'Add address in previous step'}</p>
                <p className="text-sm text-[var(--color-muted)]">Notes: {reviewValues.notes || 'No notes added'}</p>
                <p className="text-sm text-[var(--color-muted)]">Payment: {reviewValues.paymentMethod}</p>
              </div>
            ) : null}

            <div className="flex justify-between">
              <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}>
                  Next Step
                </Button>
              ) : (
                <Button type="submit">Place Order</Button>
              )}
            </div>
          </form>
        </Panel>
        <Panel>
          <p className="lux-label mb-4">Review Summary</p>
          <div className="space-y-4">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 border-b border-[var(--color-border)] pb-4">
                <img src={item.product.images[0]} alt={item.product.name} className="h-16 w-16 rounded-2xl object-cover" />
                <div>
                  <p>{item.product.name}</p>
                  <p className="text-xs text-[var(--color-muted)]">Qty {item.quantity} • {item.customization.goldCarat}</p>
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
    return <div className="page-shell py-16"><LoadingBlock label="Loading private catalogues..." /></div>;
  }

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Catalogues" title="Assigned private lookbooks" description="Sales-rep curated catalogues visible only to approved buyers." />
      <div className="grid gap-6 lg:grid-cols-2">
        {data.map((catalogue) => (
          <Panel key={catalogue.id}>
            <div className="mb-4 grid grid-cols-3 gap-3">
              {catalogue.products.slice(0, 3).map((product) => (
                <img key={product.id} src={product.images[0]} alt={product.name} className="h-32 w-full rounded-3xl object-cover" />
              ))}
            </div>
            <h3 className="text-2xl font-semibold">{catalogue.name}</h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{catalogue.description}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
              {formatDate(catalogue.createdAt)} • {catalogue.productIds.length} Items
            </p>
          </Panel>
        ))}
      </div>
    </section>
  );
}

export function ProfilePage() {
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: userService.profile });
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: orderService.list });

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Profile" title="Buyer account and order history" />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <p className="lux-label mb-4">My Profile</p>
          {profile ? (
            <div className="space-y-4 text-sm text-[var(--color-muted)]">
              <p><span className="text-[var(--color-heading)] font-medium">Name:</span> {profile.name}</p>
              <p><span className="text-[var(--color-heading)] font-medium">Email:</span> {profile.email}</p>
              <p><span className="text-[var(--color-heading)] font-medium">Company:</span> {profile.companyName}</p>
              <p><span className="text-[var(--color-heading)] font-medium">City:</span> {profile.city}</p>
              <p><span className="text-[var(--color-heading)] font-medium">GST:</span> {profile.gstNumber || 'Not provided'}</p>
            </div>
          ) : <LoadingBlock label="Loading profile..." />}
        </Panel>
        <Panel>
          <p className="lux-label mb-4">Order History</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[var(--color-muted)]">
                <tr>
                  <th className="pb-4">Order ID</th>
                  <th className="pb-4">Date</th>
                  <th className="pb-4">Items</th>
                  <th className="pb-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-[var(--color-border)] text-[var(--color-body)]">
                    <td className="py-4">{order.orderId}</td>
                    <td className="py-4">{formatDate(order.date)}</td>
                    <td className="py-4">{order.items.length}</td>
                    <td className="py-4">{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </section>
  );
}
