import { Copy, Minus, Plus, Ruler, Trash2 } from 'lucide-react';
import { Select } from '../ui/Select';
import { sizeLabel } from '../../data/sizeMaster';
import { goldColorSwatch } from '../../utils/productVariants';
import { DIAMOND_QUALITY } from '../../utils/constants';

/**
 * The combinations queued for a single add-to-cart.
 *
 * Every row carries its own colour, karat and — for a sized style —
 * size, because each row becomes its own cart line. A buyer ordering Rose Gold
 * 14K in one size and White Gold 9K in another does it here, in one place,
 * rather than adding, re-selecting and adding again.
 */
export function CombinationSelector({
  chart,
  options,
  lines,
  onChange,
  onOpenChart,
  activeIndex = 0,
  onActivate,
}) {
  const goldColors = options?.goldColors || [];
  const goldCarats = options?.goldCarats || [];

  const updateLine = (index, patch) => {
    onActivate?.(index);
    onChange(lines.map((line, current) => (current === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index) => {
    onChange(lines.filter((_, current) => current !== index));
    onActivate?.(Math.max(0, index - 1));
  };

  // Seeded from the row the buyer was last working on, moved to the next unused
  // size so a sized style never opens on a duplicate row.
  const addLine = () => {
    const source = lines[activeIndex] || lines[lines.length - 1] || {};
    const used = new Set(lines.map((line) => line.size));
    const nextSize = chart ? chart.rows.find((row) => !used.has(row.size))?.size || '' : '';
    onChange([...lines, { ...source, size: nextSize, quantity: 1 }]);
    onActivate?.(lines.length);
  };

  const totalUnits = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const noSizesLeft = Boolean(chart) && lines.length >= chart.rows.length;

  return (
    <div className="space-y-2.5 sm:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="lux-label text-[10px] sm:text-xs">Your combinations</p>
        {chart ? (
          <button
            type="button"
            onClick={onOpenChart}
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[var(--color-primary)] transition hover:underline sm:gap-2 sm:text-xs sm:tracking-[0.14em]"
          >
            <Ruler className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Size Guide
          </button>
        ) : null}
      </div>

      <div className="space-y-2 sm:space-y-3">
        {lines.map((line, index) => {
          const sizeOptions = (chart?.rows || []).map((row) => ({
            value: row.size,
            label: sizeLabel(row.size),
            hint: row.hint,
            // The same size in a different colour or karat is a legitimate
            // combination, so only block a size already taken by a row that is
            // otherwise identical to this one.
            disabled: lines.some(
              (entry, current) =>
                current !== index &&
                entry.size === row.size &&
                entry.goldColor === line.goldColor &&
                entry.goldCarat === line.goldCarat &&
                entry.diamondQuality === line.diamondQuality,
            ),
          }));

          const quantity = Number(line.quantity || 1);

          return (
            <div
              // Keyed by position, not by value: keying on the combination would
              // remount the row on every change and steal keyboard focus.
              key={index}
              onFocusCapture={() => onActivate?.(index)}
              className={`space-y-2 border p-2 transition sm:space-y-3 sm:p-3 ${
                index === activeIndex
                  ? 'border-[var(--color-border-active)] bg-[var(--color-surface-alt)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-muted)] sm:gap-2 sm:text-[11px] sm:tracking-[0.14em]">
                  <span
                    className="h-3 w-3 border border-[var(--color-border)] sm:h-3.5 sm:w-3.5"
                    style={{ backgroundColor: goldColorSwatch(line.goldColor) }}
                  />
                  Combination {index + 1}
                </span>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <button
                    type="button"
                    aria-label="Duplicate this combination"
                    onClick={() => {
                      onChange([
                        ...lines.slice(0, index + 1),
                        { ...line, quantity: 1 },
                        ...lines.slice(index + 1),
                      ]);
                      onActivate?.(index + 1);
                    }}
                    className="border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] sm:p-2"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove this combination"
                    disabled={lines.length <= 1}
                    onClick={() => removeLine(index)}
                    className="border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-40 disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-text)] sm:p-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Two up from the smallest screen — these four controls stacked
                  full width made a single combination taller than a phone. */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <Select
                  label="Gold Colour"
                  buttonClassName="bg-[var(--color-surface)]"
                  options={goldColors}
                  value={line.goldColor}
                  placeholder="Choose colour"
                  onChange={(goldColor) => updateLine(index, { goldColor })}
                />
                <Select
                  label="Gold Carat"
                  buttonClassName="bg-[var(--color-surface)]"
                  options={goldCarats}
                  value={line.goldCarat}
                  placeholder="Choose karat"
                  onChange={(goldCarat) => updateLine(index, { goldCarat })}
                />
                <div>
                  <p className="mb-1 text-[11px] text-[var(--color-text-muted)] sm:mb-2 sm:text-sm">Diamond Quality</p>
                  <div className="flex min-h-9 items-center border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 sm:min-h-12 sm:px-4 sm:py-3">
                    <p className="text-[13px] text-[var(--color-text)] sm:text-sm">{DIAMOND_QUALITY}</p>
                  </div>
                </div>
                {chart ? (
                  <Select
                    label={chart.noun}
                    buttonClassName="bg-[var(--color-surface)]"
                    options={sizeOptions}
                    value={line.size}
                    placeholder={`Choose ${chart.noun.toLowerCase()}`}
                    onChange={(size) => updateLine(index, { size })}
                  />
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--color-text-muted)] sm:text-xs">Quantity</span>
                <div className="flex items-center border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                    onClick={() => updateLine(index, { quantity: Math.max(1, quantity - 1) })}
                    className="p-2 text-[var(--color-text)] transition hover:text-[var(--color-primary)] disabled:opacity-40 disabled:hover:text-[var(--color-text)] sm:p-3"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-8 text-center text-[13px] tabular-nums text-[var(--color-text)] sm:min-w-10 sm:text-sm">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => updateLine(index, { quantity: quantity + 1 })}
                    className="p-2 text-[var(--color-text)] transition hover:text-[var(--color-primary)] sm:p-3"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <button
          type="button"
          onClick={addLine}
          disabled={noSizesLeft}
          className="inline-flex items-center gap-1.5 whitespace-nowrap border border-dashed border-[var(--color-border-active)] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.08em] text-[var(--color-primary)] transition hover:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed disabled:border-[var(--color-border)] disabled:text-[var(--color-text-muted)] disabled:hover:bg-transparent sm:gap-2 sm:px-4 sm:py-2.5 sm:text-xs sm:tracking-[0.14em]"
        >
          <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          Add another combination
        </button>

        <p className="text-[10px] text-[var(--color-text-muted)] sm:text-xs">
          {lines.length} {lines.length === 1 ? 'combination' : 'combinations'} · {totalUnits}{' '}
          {totalUnits === 1 ? 'piece' : 'pieces'}
        </p>
      </div>
    </div>
  );
}
