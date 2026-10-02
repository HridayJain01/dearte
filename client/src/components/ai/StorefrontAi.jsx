import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Camera, Download, LoaderCircle, Sparkles, X } from 'lucide-react';
import { Button, Panel } from '../ui/Primitives';
import { ProductCard } from '../product/ProductCard';
import { useAiFeatures } from '../../hooks/useAiFeatures';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { aiErrorMessage, aiService } from '../../services/aiService';
import { userService } from '../../services/userService';
import { cdnImage } from '../../utils/formatters';
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
      <p className="lux-label text-[11px] sm:text-xs">Time to restock</p>
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
                  <img src={cdnImage(item.product.images[0], 112)} alt="" className="h-full w-full object-contain p-1" loading="lazy" />
                ) : null}
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/products/${item.product.styleCode}`} className="block truncate text-[13px] font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] sm:text-sm">
                  {productDisplayName(item.product)}
                </Link>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)] sm:text-xs">
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

// Phones take 3–12 MB photos; the model needs a fraction of that. Shrinking in
// the browser keeps the upload small and under the API's 1 MB body limit.
async function shrinkPhoto(file, maxSide = 768) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.85);
}

function PhotoResults({ result, preview, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[var(--scrim-veil)] p-3 sm:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pieces similar to your photo"
        className="w-full max-w-6xl border border-[var(--color-border)] bg-[var(--color-primary-bg)] p-4 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          {preview ? <img src={preview} alt="Your photo" className="h-16 w-16 flex-none border border-[var(--color-border)] object-cover sm:h-20 sm:w-20" /> : null}
          <div className="min-w-0 flex-1">
            <p className="lux-label text-[11px] sm:text-xs">Shop by photo</p>
            <h2 className="lux-heading mt-1 text-xl sm:text-3xl">{result.items.length ? 'Closest pieces in the catalogue' : 'No close match yet'}</h2>
            {result.seen?.length ? (
              <p className="mt-1 text-[12px] text-[var(--color-text-muted)] sm:text-sm">We saw: {result.seen.join(' · ')}</p>
            ) : null}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        {result.items.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-6 lg:grid-cols-4">
            {result.items.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">{result.message || 'Try a clearer photo of a single piece, or use the filters.'}</p>
        )}
      </div>
    </div>
  );
}

/** Camera button next to the products search box: a photo in, similar styles out. */
export function PhotoSearchButton() {
  const features = useAiFeatures();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState('');
  const close = useCallback(() => setResult(null), []);
  if (!features.photoSearch) return null;

  const onPick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      let image;
      try {
        image = await shrinkPhoto(file);
      } catch {
        toast.error("Couldn't read that photo. Try a JPEG or PNG.");
        return;
      }
      const found = await aiService.photoSearch(image);
      setPreview(image);
      setResult(found);
    } catch (error) {
      toast.error(aiErrorMessage(error, 'Photo search is unavailable right now.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Find pieces like a photo"
        aria-label="Search by photo"
        className={SEARCH_SIDE_BUTTON}
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
        <span className="max-sm:sr-only">Photo</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      {result ? <PhotoResults result={result} preview={preview} onClose={close} /> : null}
    </>
  );
}

const FIELD =
  'w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-border-active)]';

/**
 * "Build a lookbook with AI" on the Catalogues page: a brief in, a selection
 * of the buyer's own visible styles out, to trim and download as a PDF.
 */
export function CatalogueBuilder() {
  const features = useAiFeatures();
  const { user } = useAuth();
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [book, setBook] = useState(null);
  const [downloading, setDownloading] = useState(false);
  if (!features.catalogueBuilder) return null;

  const build = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      setBook(await aiService.buildCatalogue(brief.trim()));
    } catch (error) {
      toast.error(aiErrorMessage(error, 'The catalogue builder is unavailable right now.'));
    } finally {
      setBusy(false);
    }
  };

  const edit = (patch) => setBook((current) => ({ ...current, ...patch }));
  const remove = (id) => setBook((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));

  const download = async () => {
    setDownloading(true);
    try {
      const { downloadLookbookPdf } = await import('../../utils/lookbookPdf');
      await downloadLookbookPdf({ title: book.title, intro: book.intro, products: book.items, user });
    } catch {
      toast.error('Could not create the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Panel className="mb-6 space-y-4 sm:mb-8">
      <div>
        <p className="lux-label text-[11px] sm:text-xs">Build a lookbook with AI</p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)] sm:text-sm">
          Describe the selection you need. Remove pieces and edit the wording, then download it as a PDF.
        </p>
      </div>
      <form onSubmit={build} className="flex flex-col gap-3 sm:flex-row">
        <input
          className={FIELD}
          value={brief}
          maxLength={300}
          aria-label="Describe the lookbook"
          placeholder="e.g. 24 rose gold bridal pieces under 6 g for a wedding-season display"
          onChange={(event) => setBrief(event.target.value)}
        />
        <Button type="submit" icon={Sparkles} loading={busy} disabled={busy || brief.trim().length < 3}>
          Build
        </Button>
      </form>

      {book ? (
        <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--color-text-muted)]">Title</span>
            <input className={FIELD} value={book.title} maxLength={60} onChange={(event) => edit({ title: event.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--color-text-muted)]">Introduction</span>
            <textarea className={`${FIELD} min-h-[72px]`} value={book.intro} maxLength={280} onChange={(event) => edit({ intro: event.target.value })} />
          </label>
          <p className="text-[12px] text-[var(--color-text-muted)] sm:text-xs">
            {book.understood.length ? `Chosen by: ${book.understood.join(' · ')}.` : 'Nothing in the brief matched a filter, so this is a spread of the catalogue.'}
            {book.relaxed.length ? ` Too few styles matched exactly, so these were loosened: ${book.relaxed.join(', ')}.` : ''}
            {` ${book.items.length} ${book.items.length === 1 ? 'piece' : 'pieces'}`}
            {book.items.length < book.requested ? ` (you asked for ${book.requested}).` : '.'}
          </p>
          {book.items.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
              {book.items.map((product) => (
                <div key={product.id} className="relative">
                  <ProductCard product={product} />
                  <button
                    type="button"
                    onClick={() => remove(product.id)}
                    aria-label={`Remove ${productDisplayName(product)} from the lookbook`}
                    title="Remove from the lookbook"
                    className="absolute left-1.5 top-1.5 z-20 border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-[var(--color-text-muted)] transition hover:border-[var(--color-border-active)] hover:text-[var(--color-primary)] sm:left-3 sm:top-3"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">{book.message || 'No styles in your catalogue match that yet. Try a broader brief.'}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button icon={Download} loading={downloading} disabled={downloading || !book.items.length} onClick={download}>
              Download PDF
            </Button>
            <Button variant="ghost" onClick={() => setBook(null)}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
