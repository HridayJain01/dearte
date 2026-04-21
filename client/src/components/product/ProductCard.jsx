import { Heart, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Primitives';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { formatWeight } from '../../utils/formatters';

export function ProductCard({ product }) {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { addToWishlist } = useWishlist();
  const navigate = useNavigate();

  const ensureAuth = async (action) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    await action();
  };

  return (
    <article className="group overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] p-0 transition duration-200 hover:border-[var(--color-border-active)]">
      <Link to={`/products/${product.styleCode}`} className="block relative">
        <div className="relative h-56 overflow-hidden bg-[#f6f6f6] sm:h-72">
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-contain p-5 transition duration-300 group-hover:scale-[1.03]"
          />
          <p className="absolute left-4 top-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[#9b6d1e]">
            Sale
          </p>
          <button
            className="absolute right-4 top-3 z-10 p-2 text-[#9b6d1e] transition hover:scale-110 hover:[&>svg]:fill-[#9b6d1e]"
            onClick={(e) => {
              e.preventDefault();
              ensureAuth(() => addToWishlist({ productId: product.id }));
            }}
          >
            <Heart className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <div className="grid grid-cols-[1fr_auto] items-start gap-3">
            <div>
              <p className="line-clamp-2 font-['Jost'] text-[19px] leading-[1.2] tracking-[0.01em] text-[#151515] uppercase">
                {product.name}
              </p>
              <p className="mt-1 font-['Jost'] text-xs tracking-[0.06em] text-[var(--color-text-muted)] uppercase">
                {product.styleCode}
              </p>
            </div>
            
          </div>

          <p className="text-xs text-[var(--color-text-muted)]">
            Diamond: {formatWeight(product.diamondWeight, 'ct')} | Gold: {formatWeight(product.goldWeight, 'g')}
          </p>

          <div className="pt-1">
            <Button
              variant="secondary"
              className="w-full border-[#ddd] bg-transparent text-[#303030] hover:bg-[var(--color-surface-alt)]"
              icon={ShoppingBag}
              disabled={product.stockType === 'Ready Stock' && (product.stockQuantity ?? 0) <= 0}
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
                )
              }}
            >
              {product.stockType === 'Ready Stock' && (product.stockQuantity ?? 0) <= 0 ? 'Out of stock' : 'Add to cart'}
            </Button>
          </div>

          <div className="flex gap-3 pt-1">
            {['#ddd', '#ececec', '#d9d9d9', '#f0efe9', '#f2d5b6'].map((swatch) => (
              <span
                key={`${product.id}-${swatch}`}
                className="h-5 w-5 rounded-full border border-[#cfcfcf]"
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
        </div>
      </Link>
    </article>
  );
}
