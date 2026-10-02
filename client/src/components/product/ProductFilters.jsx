import { useRef, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { BottomSheet, Button } from '../ui/Primitives';

const toggleArrayValue = (values, value) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

// The API cross-filters the facets, so a value can drop out of the list while
// it is still selected. Keep selected values on screen so they stay untickable.
const withSelected = (options, selected) => [
  ...new Set([...(options || []), ...(selected || [])]),
];

const RANGE_FIELDS = [
  ['diamondMin', 'Diamond min (ct)'],
  ['diamondMax', 'Diamond max (ct)'],
  ['goldMin', 'Gold min (g)'],
  ['goldMax', 'Gold max (g)'],
];

const LIST_FIELDS = ['category', 'subCategory', 'collection', 'occasion', 'metalColor'];

/** How many refinements are on, for the phone button's badge. */
function activeFilterCount(activeFilters) {
  return (
    LIST_FIELDS.reduce((sum, field) => sum + (activeFilters[field]?.length || 0), 0) +
    RANGE_FIELDS.filter(([field]) => activeFilters[field] !== '' && activeFilters[field] != null).length
  );
}

// Native <details>: an accordion with no state to manage. Long lists show a few
// rows and a "Show all" so the panel never turns into its own long scroll.
function Group({ title, selectedCount = 0, defaultOpen = false, children }) {
  return (
    <details open={defaultOpen || selectedCount > 0} className="group border-b border-[var(--color-border)] last:border-b-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--color-text)] [&::-webkit-details-marker]:hidden">
        <span>
          {title}
          {selectedCount ? <span className="ml-1.5 text-[var(--color-primary)]">({selectedCount})</span> : null}
        </span>
        <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)] transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  );
}

const VISIBLE_ROWS = 8;

function CheckList({ options, selected, onChange, empty }) {
  const [showAll, setShowAll] = useState(false);
  if (!options.length) return <p className="text-[13px] text-[var(--color-text-muted)]">{empty}</p>;
  const shown = showAll ? options : options.slice(0, VISIBLE_ROWS);

  return (
    <div>
      {shown.map((option) => (
        <label key={option} className="flex min-h-10 cursor-pointer items-center gap-3 text-[14px] text-[var(--color-text)]">
          <input type="checkbox" checked={selected.includes(option)} onChange={() => onChange(toggleArrayValue(selected, option))} />
          {option}
        </label>
      ))}
      {options.length > VISIBLE_ROWS ? (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="mt-1 min-h-10 text-[12px] uppercase tracking-[0.1em] text-[var(--color-primary)] underline underline-offset-4"
        >
          {showAll ? 'Show fewer' : `Show all ${options.length}`}
        </button>
      ) : null}
    </div>
  );
}

function FilterGroups({ filters, activeFilters, setFilter }) {
  const list = (field, options, empty) => (
    <CheckList
      options={withSelected(options, activeFilters[field])}
      selected={activeFilters[field]}
      onChange={(value) => setFilter(field, value)}
      empty={empty}
    />
  );
  const rangeCount = RANGE_FIELDS.filter(([field]) => activeFilters[field] !== '' && activeFilters[field] != null).length;

  return (
    <div>
      <Group title="Category" selectedCount={activeFilters.category.length} defaultOpen>
        {list('category', filters.categories?.map((category) => category.name), 'No categories available.')}
      </Group>
      <Group title="Style" selectedCount={activeFilters.subCategory.length}>
        {list('subCategory', filters.categories?.flatMap((category) => category.subCategories), 'No styles available.')}
      </Group>
      <Group title="Collection" selectedCount={activeFilters.collection.length}>
        {list('collection', filters.collections?.map((collection) => collection.name), 'No collections available.')}
      </Group>
      <Group title="Occasion" selectedCount={activeFilters.occasion.length}>
        {list('occasion', filters.occasions, 'No occasions tagged yet.')}
      </Group>
      <Group title="Metal colour" selectedCount={activeFilters.metalColor.length}>
        <div className="flex flex-wrap gap-2">
          {withSelected(filters.metalColors, activeFilters.metalColor).map((metalColor) => {
            const on = activeFilters.metalColor.includes(metalColor);
            return (
              <button
                key={metalColor}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter('metalColor', toggleArrayValue(activeFilters.metalColor, metalColor))}
                className={`min-h-10 border px-3 text-[12px] uppercase tracking-[0.08em] ${
                  on
                    ? 'border-[var(--color-border-active)] bg-[var(--color-surface-alt)] text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                }`}
              >
                {metalColor}
              </button>
            );
          })}
        </div>
      </Group>
      <Group title="Weight" selectedCount={rangeCount}>
        <div className="grid grid-cols-2 gap-3">
          {RANGE_FIELDS.map(([field, label]) => (
            <label key={field} className="text-[12px] text-[var(--color-text-muted)]">
              <span className="mb-1.5 block">{label}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={activeFilters[field]}
                onChange={(event) => setFilter(field, event.target.value)}
                className="min-h-10 w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[16px] text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)] sm:text-sm"
              />
            </label>
          ))}
        </div>
      </Group>
    </div>
  );
}

/** Desktop: the filters live in a column beside the grid, always open. */
export function FilterSidebar(props) {
  return (
    <div className="lux-panel px-4 py-2">
      <FilterGroups {...props} />
    </div>
  );
}

/**
 * Phone and tablet: one button that opens every filter in a bottom sheet. The
 * results update behind it as boxes are ticked, so the footer button only closes.
 */
export function FilterSheetButton({ total, onClear, ...props }) {
  const sheetRef = useRef(null);
  const count = activeFilterCount(props.activeFilters);

  return (
    <>
      <button
        type="button"
        onClick={() => sheetRef.current?.showModal()}
        className="inline-flex min-h-11 shrink-0 items-center gap-2 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] font-medium uppercase tracking-[0.1em] text-[var(--color-text)]"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {count ? <span className="bg-[var(--color-primary)] px-1.5 text-[12px] leading-5 text-white">{count}</span> : null}
      </button>
      <BottomSheet
        sheetRef={sheetRef}
        title="Filters"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" disabled={!count} onClick={onClear}>
              Clear all
            </Button>
            <Button className="flex-[2]" onClick={() => sheetRef.current?.close()}>
              Show {total} {total === 1 ? 'piece' : 'pieces'}
            </Button>
          </div>
        }
      >
        <FilterGroups {...props} />
      </BottomSheet>
    </>
  );
}
