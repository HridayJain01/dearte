import { Heart, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button } from '../ui/Primitives';
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
    <article className="group lux-panel overflow-hidden p-0 transition duration-200 hover:border-[var(--color-primary)]">
      <Link to={`/products/${product.styleCode}`} className="block relative">
        <div className="relative h-64 overflow-hidden sm:h-80">
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <button 
            className="absolute right-4 top-4 z-10 text-[var(--color-primary)] hover:scale-110 transition p-2 bg-[var(--color-surface)]/80 backdrop-blur-sm shadow-sm hover:[&>svg]:fill-[var(--color-primary)]"
            onClick={(e) => { 
               e.preventDefault(); 
               ensureAuth(() => addToWishlist({ productId: product.id })); 
            }}
          >
            <Heart className="h-4 w-4" />
          </button>
          
          <div className="absolute left-4 top-4 flex gap-2">
            <Badge tone="lab">Lab Grown</Badge>
            <Badge tone="accent">{product.customizationOptions?.goldCarats?.[0] || '14KT'}</Badge>
          </div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none">
             <span className="bg-[var(--color-primary)] text-white px-5 py-2 text-xs font-semibold tracking-widest uppercase shadow-md">Quick View</span>
          </div>
        </div>

        <div className="space-y-3 p-5 bg-[var(--color-surface)] relative z-20">
          <p className="font-[var(--font-accent)] text-xs tracking-[0.2em] text-[var(--color-text-muted)]">{product.styleCode}</p>
          <div>
            <h3 className="line-clamp-1 font-[var(--font-serif)] text-xl text-[var(--color-primary)] sm:text-2xl">
              {product.name}
            </h3>
            <div className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">
              <p>Diamond: {formatWeight(product.diamondWeight, 'ct')} • Gold: {formatWeight(product.goldWeight, 'g')}</p>
            </div>
          </div>
          <div className="pt-3">
            <Button
              variant="secondary"
              className="w-full"
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
        </div>
      </Link>
    </article>
  );
}
