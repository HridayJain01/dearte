import { Button, Panel } from '../ui/Primitives';

const toggleArrayValue = (values, value) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

export function ProductFilters({ filters, activeFilters, setFilter, resetFilters }) {
  const subCategories = filters.categories?.flatMap((category) => category.subCategories) || [];

  return (
    <Panel className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <details className="group relative">
          <summary className="cursor-pointer list-none border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[12px] uppercase tracking-[0.12em] text-[var(--color-text)]">
            Sub Category
          </summary>
          <div className="absolute left-0 top-full z-30 mt-2 max-h-64 min-w-[220px] overflow-auto border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg">
            <div className="space-y-2 text-sm">
              {subCategories.map((subCategory) => (
                <label key={subCategory} className="flex items-center gap-3 text-[var(--color-text)]">
                  <input
                    type="checkbox"
                    checked={activeFilters.subCategory.includes(subCategory)}
                    onChange={() => setFilter('subCategory', toggleArrayValue(activeFilters.subCategory, subCategory))}
                  />
                  {subCategory}
                </label>
              ))}
            </div>
          </div>
        </details>

        <details className="group relative">
          <summary className="cursor-pointer list-none border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[12px] uppercase tracking-[0.12em] text-[var(--color-text)]">
            Collection
          </summary>
          <div className="absolute left-0 top-full z-30 mt-2 max-h-64 min-w-[220px] overflow-auto border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg">
            <div className="space-y-2 text-sm">
              {filters.collections?.map((collection) => (
                <label key={collection.name} className="flex items-center gap-3 text-[var(--color-text)]">
                  <input
                    type="checkbox"
                    checked={activeFilters.collection.includes(collection.name)}
                    onChange={() => setFilter('collection', toggleArrayValue(activeFilters.collection, collection.name))}
                  />
                  {collection.name}
                </label>
              ))}
            </div>
          </div>
        </details>

        <details className="group relative">
          <summary className="cursor-pointer list-none border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[12px] uppercase tracking-[0.12em] text-[var(--color-text)]">
            Metal Color
          </summary>
          <div className="absolute left-0 top-full z-30 mt-2 min-w-[220px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg">
            <div className="flex flex-wrap gap-2">
              {filters.metalColors?.map((metalColor) => (
                <button
                  key={metalColor}
                  onClick={() => setFilter('metalColor', toggleArrayValue(activeFilters.metalColor, metalColor))}
                  className={`border px-3 py-2 text-xs uppercase tracking-[0.08em] ${activeFilters.metalColor.includes(metalColor) ? 'border-[var(--color-border-active)] bg-[var(--color-surface-alt)] text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                >
                  {metalColor}
                </button>
              ))}
            </div>
          </div>
        </details>

        <details className="group relative">
          <summary className="cursor-pointer list-none border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[12px] uppercase tracking-[0.12em] text-[var(--color-text)]">
            Weight Range
          </summary>
          <div className="absolute left-0 top-full z-30 mt-2 min-w-[260px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block text-[var(--color-text-muted)]">Diamond Min</span>
                <input
                  type="number"
                  value={activeFilters.diamondMin}
                  onChange={(event) => setFilter('diamondMin', event.target.value)}
                  className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)]"
                />
              </label>
              <label className="text-sm">
                <span className="mb-2 block text-[var(--color-text-muted)]">Diamond Max</span>
                <input
                  type="number"
                  value={activeFilters.diamondMax}
                  onChange={(event) => setFilter('diamondMax', event.target.value)}
                  className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)]"
                />
              </label>
              <label className="text-sm">
                <span className="mb-2 block text-[var(--color-text-muted)]">Gold Min</span>
                <input
                  type="number"
                  value={activeFilters.goldMin}
                  onChange={(event) => setFilter('goldMin', event.target.value)}
                  className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)]"
                />
              </label>
              <label className="text-sm">
                <span className="mb-2 block text-[var(--color-text-muted)]">Gold Max</span>
                <input
                  type="number"
                  value={activeFilters.goldMax}
                  onChange={(event) => setFilter('goldMax', event.target.value)}
                  className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)]"
                />
              </label>
            </div>
          </div>
        </details>

        <details className="group relative">
          <summary className="cursor-pointer list-none border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[12px] uppercase tracking-[0.12em] text-[var(--color-text)]">
            Order Type
          </summary>
          <div className="absolute left-0 top-full z-30 mt-2 min-w-[220px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg">
            <select
              value={activeFilters.stockType}
              onChange={(event) => setFilter('stockType', event.target.value)}
              className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)]"
            >
              <option value="">All</option>
              <option value="Ready Stock">Ready Stock</option>
              <option value="Make to Order">Make to Order</option>
            </select>
          </div>
        </details>

        <Button variant="ghost" className="min-h-[42px] px-3" onClick={resetFilters}>
          Clear All
        </Button>
      </div>

      <div className="text-xs text-[var(--color-text-muted)]">
        Use the dropdowns above to refine by style, material, and weight.
      </div>
    </Panel>
  );
}
