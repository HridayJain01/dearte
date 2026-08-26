import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Check, X } from 'lucide-react';
import { goldColorSwatch, variantImage } from '../../utils/productVariants';
import { resolveSizeChart, sizeLabel } from '../../data/sizeMaster';

/**
 * The add-to-cart confirmation.
 *
 * A plain "Added to cart" leaves the buyer guessing which combination landed —
 * the same style in two colours is two lines, and the grid's quick-add picks
 * the combination on their behalf. Showing the photo of the exact variant makes
 * the result checkable without opening the cart.
 */
export function CartToast({ id, product, customization, lineCount = 1, pieceCount = 1 }) {
  const image = variantImage(product, customization);
  const swatch = goldColorSwatch(customization?.goldColor);

  // Deliberately narrower than `customizationSummary`: at this width the full
  // version truncates, and it is the size that gets cut. Diamond quality is the
  // one house grade on every piece, so it is the facet worth dropping.
  const summary = [
    customization?.goldColor,
    customization?.goldCarat,
    resolveSizeChart(product || {}) && customization?.size ? sizeLabel(customization.size) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="pointer-events-auto flex w-[min(21rem,calc(100vw-2rem))] items-start gap-3 border border-[var(--color-border-active)] bg-[var(--color-surface)] p-3 shadow-[0_24px_48px_-24px_rgba(58,26,40,0.45)]">
      {image ? (
        <div className="relative shrink-0">
          <img src={image} alt="" className="h-14 w-14 object-cover" loading="lazy" decoding="async" />
          {customization?.goldColor ? (
            <span
              className="absolute bottom-1 right-1 h-2.5 w-2.5 border border-white shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
              style={{ backgroundColor: swatch }}
            />
          ) : null}
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--color-primary)]">
          <Check className="h-3 w-3 shrink-0" />
          {lineCount > 1 ? `${lineCount} combinations added` : 'Added to cart'}
        </p>
        <p className="mt-1 truncate text-[13px] font-semibold leading-tight text-[var(--color-text)]">
          {product?.name}
        </p>
        {summary ? (
          <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{summary}</p>
        ) : null}
        {/* Only worth stating when it isn't the obvious single piece. */}
        {lineCount > 1 || pieceCount > 1 ? (
          <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
            {pieceCount} {pieceCount === 1 ? 'piece' : 'pieces'}
          </p>
        ) : null}
        <Link
          to="/cart"
          onClick={() => toast.dismiss(id)}
          className="mt-1.5 inline-block text-[11px] uppercase tracking-[0.12em] text-[var(--color-primary)] transition hover:underline"
        >
          View cart
        </Link>
      </div>

      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => toast.dismiss(id)}
        className="shrink-0 text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
