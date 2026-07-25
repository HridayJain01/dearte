import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Ruler, X } from 'lucide-react';

const MEASURING_TIPS = {
  ring: [
    'Wrap a strip of paper around the base of the finger, mark where it overlaps, then measure the length in millimetres against the Inside Circumference column.',
    'Measure at the end of the day when fingers are at their largest, and size up if the knuckle is noticeably wider than the base.',
  ],
  bangle: [
    'Bring the thumb towards the little finger and measure the widest part of the folded hand.',
    'Match that measurement to the Inside Diameter column — a bangle must clear the knuckles to slide on.',
  ],
  kada: [
    'Bring the thumb towards the little finger and measure the widest part of the folded hand.',
    'A kada sits closer to the wrist than a bangle, so prefer the snugger size when between two.',
  ],
  bracelet: [
    'Measure around the wrist just below the wrist bone, keeping the tape snug but not tight.',
    'Add roughly half an inch for a comfortable drape, or a full inch for a looser fit.',
  ],
  necklace: [
    'Measure around the base of the neck, then choose a length based on where the piece should fall.',
    '16 inch sits at the collarbone, 18 inch just below it, and 22 inch and longer rest on the chest.',
  ],
  anklet: [
    'Measure around the ankle just above the ankle bone.',
    'Add about half an inch so the anklet moves freely rather than gripping the skin.',
  ],
};

/**
 * Full size master for one category, rendered as a comparison table with the
 * customer's current selection highlighted and clickable.
 */
export function SizeChartModal({ chart, open, onClose, selectedSize, onSelectSize }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !chart) return null;

  const tips = MEASURING_TIPS[chart.key] || [];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(58,26,40,0.55)] p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${chart.label} size chart`}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_40px_80px_-32px_rgba(58,26,40,0.6)] sm:max-h-[85vh]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-3 py-2.5 sm:gap-4 sm:px-7 sm:py-5">
          <div className="flex items-start gap-2 sm:gap-3">
            <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)] sm:mt-1 sm:h-5 sm:w-5" />
            <div>
              <p className="lux-label text-[10px] sm:text-xs">Size Guide</p>
              <h2 className="lux-heading mt-0.5 text-lg sm:mt-1 sm:text-3xl">{chart.label} Sizes</h2>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)] sm:mt-1 sm:text-xs">
                {chart.rows.length} sizes · international conversions included
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close size guide"
            className="border border-[var(--color-border)] p-1.5 text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] sm:p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-[13px] sm:min-w-[520px] sm:text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--color-surface-alt)]">
                <tr>
                  {chart.columns.map((column, index) => (
                    <th
                      key={column}
                      scope="col"
                      className={`px-2.5 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] sm:px-4 sm:py-3 sm:text-[11px] sm:tracking-[0.14em] ${
                        index === 0 ? 'text-[var(--color-primary)]' : ''
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.rows.map((row) => {
                  const isSelected = row.size === selectedSize;

                  return (
                    <tr
                      key={row.size}
                      onClick={() => onSelectSize?.(row.size)}
                      className={`cursor-pointer border-t border-[var(--color-border)] transition-colors duration-150 ${
                        isSelected
                          ? 'bg-[var(--color-primary-bg)]'
                          : 'hover:bg-[var(--color-surface-alt)]'
                      }`}
                    >
                      {row.cells.map((cell, index) => (
                        <td
                          key={chart.columns[index]}
                          className={`px-2.5 py-2 sm:px-4 sm:py-3 ${
                            index === 0
                              ? `font-medium ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`
                              : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          {index === 0 && isSelected ? `${cell} ✓` : cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {tips.length ? (
            <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-3 sm:px-7 sm:py-5">
              <p className="lux-label mb-2 text-[10px] sm:mb-3 sm:text-xs">How to measure</p>
              <ul className="space-y-1.5 sm:space-y-2">
                {tips.map((tip) => (
                  <li key={tip} className="flex gap-2 text-[11px] leading-relaxed text-[var(--color-text-muted)] sm:gap-3 sm:text-sm">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-primary)] sm:mt-2" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-3 py-2.5 sm:gap-4 sm:px-7 sm:py-4">
          <p className="text-[10px] leading-snug text-[var(--color-text-muted)] sm:text-xs">
            Tap any row to apply that size. Unsure? Your sales representative can confirm before production.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-[var(--color-primary)] transition hover:underline sm:text-xs sm:tracking-[0.14em]"
          >
            Done
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
