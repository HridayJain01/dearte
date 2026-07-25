import { Heart, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, WeightDisclaimerTrigger } from '../ui/Primitives';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { formatWeight } from '../../utils/formatters';
import { DIAMOND_QUALITY } from '../../utils/constants';
import { resolveSizeChart } from '../../data/sizeMaster';
import { goldColorSwatch, sameCustomization, variantImages } from '../../utils/productVariants';

export function ProductCard({ product }) {
  const { isAuthenticated } = useAuth();
  const { cart, addToCart, updateCart, removeFromCart } = useCart();
  const { addToWishlist } = useWishlist();
  const navigate = useNavigate();
  // Sized styles cannot be added blind from a grid card — the buyer picks a
  // size on the product page instead.
  const needsSize = Boolean(resolveSizeChart(product));

  const options = product.customizationOptions || {};
  // The single combination this card adds. It has to be spelled out because the
  // stepper below may only drive that one line.
  const quickAddCustomization = {
    goldColor: options.goldColors?.[0] || '',
    goldCarat: options.goldCarats?.[1] || options.goldCarats?.[0] || '',
    diamondQuality: DIAMOND_QUALITY,
  };

  const productLines = cart?.items?.filter((i) => i.product?.id === product.id) || [];
  // Match on the full combination, not just the product: a style already in the
  // cart in another colour or karat must still be addable from the grid.
  const cartItem = productLines.find((i) => sameCustomization(i.customization, quickAddCustomization));
  const otherVariantCount = productLines.length - (cartItem ? 1 : 0);

  const swatches = (options.goldColors?.length ? options.goldColors : ['Yellow Gold']).slice(0, 5);

  const ensureAuth = async (action) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    await action();
  };

  return (
    <article className="group relative h-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] p-0 transition-all duration-500 [transition-timing-function:var(--ease-lux)] hover:border-[var(--color-border-active)] hover:shadow-[var(--shadow-lifted)]">
      <span
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px origin-left scale-x-0 bg-[var(--color-accent)] transition-transform duration-500 [transition-timing-function:var(--ease-lux)] group-hover:scale-x-100"
        aria-hidden
      />
      <Link to={`/products/${product.styleCode}`} className="block relative">
        <div className="relative h-40 overflow-hidden bg-[var(--color-surface)] sm:h-72">
          <img
            src={variantImages(product, quickAddCustomization.goldColor)[0]}
            alt={product.name}
            className="h-full w-full object-contain p-3 transition-transform duration-700 [transition-timing-function:var(--ease-lux)] group-hover:scale-[1.06] sm:p-5"
          />
          <p className="absolute left-2.5 top-2.5 text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--color-primary)] sm:left-4 sm:top-4 sm:text-[11px]">
            Sale
          </p>
          <button
            className="absolute right-1.5 top-1.5 z-10 p-1.5 text-[var(--color-primary)] transition duration-300 hover:scale-110 hover:[&>svg]:fill-[var(--color-primary)] sm:right-4 sm:top-3 sm:p-2"
            aria-label="Add to wishlist"
            onClick={(e) => {
              e.preventDefault();
              ensureAuth(() => addToWishlist({ productId: product.id }));
            }}
          >
            <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        <div className="space-y-1.5 border-t border-[var(--color-border)] p-2.5 sm:space-y-3 sm:p-5">
          <div className="grid grid-cols-[1fr_auto] items-start gap-3">
            <div>
              <p className="line-clamp-2 font-serif text-[13px] leading-[1.25] text-[var(--color-text)] sm:text-[1.35rem]">
                {product.name}
              </p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] sm:mt-1.5 sm:text-[11px]">
                {product.styleCode}
              </p>
            </div>
          </div>

          <p className="flex items-center gap-1 text-[10px] leading-snug text-[var(--color-text-muted)] sm:gap-1.5 sm:text-xs">
            <span>
              Diamond: {formatWeight(product.diamondWeight, 'ct')} | Gold: {formatWeight(product.goldWeight, 'g')}
            </span>
            <WeightDisclaimerTrigger />
          </p>

          <div className="pt-0.5 sm:pt-1">
            {cartItem && !needsSize ? (
              <div className="flex w-full items-center border border-[var(--color-border)]">
                <button
                  className="flex h-9 flex-1 items-center justify-center text-lg leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] sm:h-11 sm:text-xl"
                  onClick={(e) => {
                    e.preventDefault();
                    ensureAuth(() =>
                      cartItem.quantity <= 1
                        ? removeFromCart(cartItem.id)
                        : updateCart(cartItem.id, { quantity: cartItem.quantity - 1 }),
                    );
                  }}
                >
                  −
                </button>
                <span className="w-8 border-x border-[var(--color-border)] text-center text-[13px] font-medium text-[var(--color-text)] sm:w-10 sm:text-sm">
                  {cartItem.quantity}
                </span>
                <button
                  className="flex h-9 flex-1 items-center justify-center text-lg leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] sm:h-11 sm:text-xl"
                  onClick={(e) => {
                    e.preventDefault();
                    ensureAuth(() => updateCart(cartItem.id, { quantity: cartItem.quantity + 1 }));
                  }}
                >
                  +
                </button>
              </div>
            ) : (
              <Button
                variant="secondary"
                className="w-full border border-[var(--color-border)] bg-transparent px-1.5 text-[var(--color-text)] hover:border-[var(--color-border-active)] hover:bg-[var(--color-surface-alt)] sm:px-5"
                icon={ShoppingBag}
                onClick={(e) => {
                  // A sized style can't be added from the grid: the size has to be
                  // chosen on the product page first.
                  if (needsSize) return;
                  e.preventDefault();
                  ensureAuth(() =>
                    addToCart({
                      productId: product.id,
                      quantity: 1,
                      customization: quickAddCustomization,
                    }),
                  );
                }}
              >
                {needsSize ? 'Select size' : 'Add to cart'}
              </Button>
            )}
            {otherVariantCount ? (
              <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-muted)] sm:mt-1.5 sm:text-[10px] sm:tracking-[0.12em]">
                {otherVariantCount} other {otherVariantCount === 1 ? 'variant' : 'variants'} in cart
              </p>
            ) : null}
          </div>

          <div className="flex gap-1.5 pt-0.5 sm:gap-3 sm:pt-1">
            {/* Metal tones this style is actually offered in */}
            {swatches.map((color) => (
              <span
                key={`${product.id}-${color}`}
                title={color}
                className="h-3 w-3 border border-[var(--color-border)] sm:h-4 sm:w-4"
                style={{ backgroundColor: goldColorSwatch(color) }}
              />
            ))}
          </div>
        </div>
      </Link>
    </article>
  );
}
