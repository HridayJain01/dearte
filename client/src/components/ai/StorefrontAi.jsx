import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { Button, Panel } from '../ui/Primitives';
import { useAiFeatures } from '../../hooks/useAiFeatures';
import { useCart } from '../../hooks/useCart';
import { aiErrorMessage, aiService } from '../../services/aiService';
import { userService } from '../../services/userService';
import { productDisplayName } from '../../utils/productTitle';
import { formatDate } from '../../utils/formatters';

/*
 * The buyer-facing AI controls. Each one checks its own switch from AI Studio
 * and renders nothing when it is off, so the page around it is unchanged.
 */

/** "Time to restock": styles this buyer usually reorders, from their own order history. */
export function RestockPanel() {
  const features = useAiFeatures();
  const queryClient = useQueryClient();
  const { refreshCart } = useCart();
  const [adding, setAdding] = useState(null);
  const { data } = useQuery({
    queryKey: ['ai-restock'],
    queryFn: aiService.reorderSuggestions,
    enabled: Boolean(features.restock),
    retry: false,
  });

  const items = data || [];
  if (!features.restock || !items.length) return null;

  const add = async (item) => {
    setAdding(item.productId);
    try {
      // The same call "Order again" makes: the last combinations, as they were.
      await userService.addToCart({ productId: item.product.id, lines: item.lines });
      await refreshCart();
      toast.success(`${productDisplayName(item.product)} added to cart`);
      queryClient.invalidateQueries({ queryKey: ['ai-restock'] });
    } catch (error) {
      toast.error(aiErrorMessage(error, 'Could not add this piece. Open it to choose the options.'));
    } finally {
      setAdding(null);
    }
  };

  return (
    <Panel className="mb-4 sm:mb-6">
      <p className="lux-label text-[10px] sm:text-xs">Time to restock</p>
      <p className="mt-1 text-[13px] text-[var(--color-text-muted)] sm:text-sm">
        Going by how often you have ordered them, these pieces are due for a reorder.
      </p>
      <ul className="mt-3 divide-y divide-[var(--color-border)] sm:mt-4">
        {items.map((item) => {
          const pieces = item.lines.reduce((sum, line) => sum + line.quantity, 0);
          return (
            <li key={item.productId} className="flex items-center gap-3 py-3">
              <Link to={`/products/${item.product.styleCode}`} className="h-14 w-14 flex-none border border-[var(--color-border)] bg-[var(--color-surface)]">
                {item.product.images?.[0] ? (
                  <img src={item.product.images[0]} alt="" className="h-full w-full object-contain p-1" loading="lazy" />
                ) : null}
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/products/${item.product.styleCode}`} className="block truncate text-[13px] font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] sm:text-sm">
                  {productDisplayName(item.product)}
                </Link>
                <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)] sm:text-xs">
                  Style {item.product.styleCode} · last ordered {formatDate(item.lastOrderedAt)} · {pieces} pcs · usually every {item.cycleDays} days
                </p>
              </div>
              <Button variant="secondary" loading={adding === item.productId} onClick={() => add(item)}>
                Add to cart
              </Button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// Square, bordered, same height as the products search box beside it.
const SEARCH_SIDE_BUTTON =
  'inline-flex min-h-10 flex-none items-center justify-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-primary)] transition hover:border-[var(--color-border-active)] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-12 sm:px-4';

/**
 * ✨ next to the products search box: turns a sentence into the page's own
 * filters. `onApply` receives { category: [], subCategory: [], …, search, sort }.
 */
export function SmartSearchButton({ query, onApply }) {
  const features = useAiFeatures();
  const [busy, setBusy] = useState(false);
  if (!features.smartSearch) return null;

  const text = query.trim();
  const ready = text.split(/\s+/).filter(Boolean).length >= 3;

  const run = async () => {
    setBusy(true);
    try {
      const result = await aiService.smartSearch(text);
      onApply(result.params);
      toast.success(result.understood?.length ? `Showing ${result.understood.join(' · ')}` : 'Showing everything that matches');
    } catch (error) {
      toast.error(aiErrorMessage(error, 'Smart search is unavailable right now. The filters still work.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy || !ready}
      title={ready ? 'Turn this description into filters' : 'Describe what you want in a few words, e.g. “rose gold bridal studs under 4 g”'}
      aria-label="Smart search: turn this description into filters"
      className={SEARCH_SIDE_BUTTON}
    >
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
      <span className="max-sm:sr-only">Smart search</span>
    </button>
  );
}
