import { Copy, Minus, Plus, Ruler, Trash2 } from 'lucide-react';
import { Select } from '../ui/Select';
import { goldColorSwatch } from '../../utils/productVariants';

/**
 * The combinations queued for a single add-to-cart.
 *
 * Every row carries its own colour, karat, quality and — for a sized style —
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
  const diamondQualities = options?.diamondQualities || [];

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="lux-label">Your combinations</p>
        {chart ? (
          <button
            type="button"
            onClick={onOpenChart}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--color-primary)] transition hover:underline"
          >
            <Ruler className="h-3.5 w-3.5" />
            Size Guide
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => {
          const sizeOptions = (chart?.rows || []).map((row) => ({
            value: row.size,
            label: row.size,
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
              className={`space-y-3 border p-3 transition ${
                index === activeIndex
                  ? 'border-[var(--color-border-active)] bg-[var(--color-surface-alt)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  <span
                    className="h-3.5 w-3.5 border border-[var(--color-border)]"
                    style={{ backgroundColor: goldColorSwatch(line.goldColor) }}
                  />
                  Combination {index + 1}
                </span>
                <div className="flex items-center gap-1.5">
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
                    className="border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove this combination"
                    disabled={lines.length <= 1}
                    onClick={() => removeLine(index)}
                    className="border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-40 disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-text)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Select
                  label="Gold Colour"
                  buttonClassName="min-h-10 bg-[var(--color-surface)] py-2 text-sm"
                  options={goldColors}
                  value={line.goldColor}
                  placeholder="Choose colour"
                  onChange={(goldColor) => updateLine(index, { goldColor })}
                />
                <Select
                  label="Gold Carat"
                  buttonClassName="min-h-10 bg-[var(--color-surface)] py-2 text-sm"
                  options={goldCarats}
                  value={line.goldCarat}
                  placeholder="Choose karat"
                  onChange={(goldCarat) => updateLine(index, { goldCarat })}
                />
                <Select
                  label="Diamond Quality"
                  buttonClassName="min-h-10 bg-[var(--color-surface)] py-2 text-sm"
                  options={diamondQualities}
                  value={line.diamondQuality}
                  placeholder="Choose quality"
                  onChange={(diamondQuality) => updateLine(index, { diamondQuality })}
                />
                {chart ? (
                  <Select
                    label={chart.noun}
                    buttonClassName="min-h-10 bg-[var(--color-surface)] py-2 text-sm"
                    options={sizeOptions}
                    value={line.size}
                    placeholder={`Choose ${chart.noun.toLowerCase()}`}
                    onChange={(size) => updateLine(index, { size })}
                  />
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--color-text-muted)]">Quantity</span>
                <div className="flex items-center border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                    onClick={() => updateLine(index, { quantity: Math.max(1, quantity - 1) })}
                    className="p-3 text-[var(--color-text)] transition hover:text-[var(--color-primary)] disabled:opacity-40 disabled:hover:text-[var(--color-text)]"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-10 text-center text-sm tabular-nums text-[var(--color-text)]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => updateLine(index, { quantity: quantity + 1 })}
                    className="p-3 text-[var(--color-text)] transition hover:text-[var(--color-primary)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={addLine}
          disabled={noSizesLeft}
          className="inline-flex items-center gap-2 border border-dashed border-[var(--color-border-active)] px-4 py-2.5 text-xs uppercase tracking-[0.14em] text-[var(--color-primary)] transition hover:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed disabled:border-[var(--color-border)] disabled:text-[var(--color-text-muted)] disabled:hover:bg-transparent"
        >
          <Plus className="h-3.5 w-3.5" />
          Add another combination
        </button>

        <p className="text-xs text-[var(--color-text-muted)]">
          {lines.length} {lines.length === 1 ? 'combination' : 'combinations'} · {totalUnits}{' '}
          {totalUnits === 1 ? 'piece' : 'pieces'}
        </p>
      </div>
    </div>
  );
}
