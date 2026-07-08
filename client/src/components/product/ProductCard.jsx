import { Heart, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Primitives';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { formatWeight } from '../../utils/formatters';

export function ProductCard({ product }) {
  const { isAuthenticated } = useAuth();
  const { cart, addToCart, updateCart, removeFromCart } = useCart();
  const { addToWishlist } = useWishlist();
  const navigate = useNavigate();

  const cartItem = cart?.items?.find((i) => i.product?.id === product.id);
  const isOutOfStock = product.stockType === 'Ready Stock' && (product.stockQuantity ?? 0) <= 0;

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
        <div className="relative h-56 overflow-hidden bg-[var(--color-surface)] sm:h-72">
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-contain p-5 transition-transform duration-700 [transition-timing-function:var(--ease-lux)] group-hover:scale-[1.06]"
          />
          <p className="absolute left-4 top-4 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Sale
          </p>
          <button
            className="absolute right-4 top-3 z-10 p-2 text-[var(--color-primary)] transition duration-300 hover:scale-110 hover:[&>svg]:fill-[var(--color-primary)]"
            aria-label="Add to wishlist"
            onClick={(e) => {
              e.preventDefault();
              ensureAuth(() => addToWishlist({ productId: product.id }));
            }}
          >
            <Heart className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 border-t border-[var(--color-border)] p-4 sm:p-5">
          <div className="grid grid-cols-[1fr_auto] items-start gap-3">
            <div>
              <p className="line-clamp-2 font-serif text-xl leading-[1.25] text-[var(--color-text)] sm:text-[1.35rem]">
                {product.name}
              </p>
              <p className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                {product.styleCode}
              </p>
            </div>
          </div>

          <p className="text-xs text-[var(--color-text-muted)]">
            Diamond: {formatWeight(product.diamondWeight, 'ct')} | Gold: {formatWeight(product.goldWeight, 'g')}
          </p>

          <div className="pt-1">
            {cartItem ? (
              <div className="flex w-full items-center border border-[var(--color-border)]">
                <button
                  className="flex h-11 flex-1 items-center justify-center text-xl leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
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
                <span className="w-10 border-x border-[var(--color-border)] text-center text-sm font-medium text-[var(--color-text)]">
                  {cartItem.quantity}
                </span>
                <button
                  className="flex h-11 flex-1 items-center justify-center text-xl leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
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
                className="w-full border border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:border-[var(--color-border-active)] hover:bg-[var(--color-surface-alt)]"
                icon={ShoppingBag}
                disabled={isOutOfStock}
                onClick={(e) => {
                  e.preventDefault();
                  ensureAuth(() =>
                    addToCart({
                      productId: product.id,
                      quantity: 1,
                      customization: {
                        goldColor: product.customizationOptions.goldColors[0],
                        goldCarat: product.customizationOptions.goldCarats[1] || product.customizationOptions.goldCarats[0],
                        diamondQuality: product.customizationOptions.diamondQualities[1] || product.customizationOptions.diamondQualities[0],
                      },
                    }),
                  );
                }}
              >
                {isOutOfStock ? 'Out of stock' : 'Add to cart'}
              </Button>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            {/* Decorative metal-tone chips — content colours, not UI tokens */}
            {['#ddd', '#ececec', '#d9d9d9', '#f0efe9', '#f2d5b6'].map((swatch) => (
              <span
                key={`${product.id}-${swatch}`}
                className="h-4 w-4 border border-[var(--color-border)]"
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
        </div>
      </Link>
    </article>
  );
}
