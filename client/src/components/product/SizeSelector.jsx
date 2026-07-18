import { Minus, Plus, Ruler, Trash2 } from 'lucide-react';
import { Select } from '../ui/Select';

/**
 * Size + quantity rows for a sized style.
 *
 * Each row becomes its own cart line, so a buyer can order the same design in
 * several sizes without leaving the product page. A size already used by
 * another row is disabled rather than hidden, which keeps the list stable.
 */
export function SizeSelector({ chart, lines, onChange, onOpenChart, maxQuantity }) {
  const updateLine = (index, patch) => {
    onChange(lines.map((line, current) => (current === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index) => {
    onChange(lines.filter((_, current) => current !== index));
  };

  const addLine = () => {
    const used = new Set(lines.map((line) => line.size));
    const nextSize = chart.rows.find((row) => !used.has(row.size));
    onChange([...lines, { size: nextSize?.size || '', quantity: 1 }]);
  };

  const totalUnits = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const allSizesUsed = lines.length >= chart.rows.length;
  const atStockCeiling = Number.isFinite(maxQuantity) && totalUnits >= maxQuantity;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="lux-label">{chart.noun}</p>
        <button
          type="button"
          onClick={onOpenChart}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--color-primary)] transition hover:underline"
        >
          <Ruler className="h-3.5 w-3.5" />
          Size Guide
        </button>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => {
          const usedElsewhere = new Set(
            lines.filter((_, current) => current !== index).map((entry) => entry.size),
          );

          const options = chart.rows.map((row) => ({
            value: row.size,
            label: row.size,
            hint: row.hint,
            disabled: usedElsewhere.has(row.size),
          }));

          const quantity = Number(line.quantity || 1);
          const otherUnits = totalUnits - quantity;
          const canIncrease = !Number.isFinite(maxQuantity) || otherUnits + quantity + 1 <= maxQuantity;

          return (
            <div
              // Keyed by position, not by size: keying on the value would
              // remount the row on every change and steal keyboard focus.
              key={index}
              className="flex flex-col gap-3 border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3 sm:flex-row sm:items-center"
            >
              <Select
                className="flex-1"
                buttonClassName="bg-[var(--color-surface)]"
                options={options}
                value={line.size}
                placeholder={`Choose ${chart.noun.toLowerCase()}`}
                onChange={(size) => updateLine(index, { size })}
              />

              <div className="flex items-center justify-between gap-2 sm:justify-start">
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
                    disabled={!canIncrease}
                    onClick={() => updateLine(index, { quantity: quantity + 1 })}
                    className="p-3 text-[var(--color-text)] transition hover:text-[var(--color-primary)] disabled:opacity-40 disabled:hover:text-[var(--color-text)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  aria-label="Remove this size"
                  disabled={lines.length <= 1}
                  onClick={() => removeLine(index)}
                  className="border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-40 disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-text)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={addLine}
          disabled={allSizesUsed || atStockCeiling}
          className="inline-flex items-center gap-2 border border-dashed border-[var(--color-border-active)] px-4 py-2.5 text-xs uppercase tracking-[0.14em] text-[var(--color-primary)] transition hover:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed disabled:border-[var(--color-border)] disabled:text-[var(--color-text-muted)] disabled:hover:bg-transparent"
        >
          <Plus className="h-3.5 w-3.5" />
          Add another size
        </button>

        <p className="text-xs text-[var(--color-text-muted)]">
          {lines.length} {lines.length === 1 ? 'size' : 'sizes'} · {totalUnits}{' '}
          {totalUnits === 1 ? 'piece' : 'pieces'}
        </p>
      </div>
    </div>
  );
}
