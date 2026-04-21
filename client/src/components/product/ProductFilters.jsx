import { Button, Panel } from '../ui/Primitives';

const toggleArrayValue = (values, value) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

export function ProductFilters({ filters, activeFilters, setFilter, resetFilters }) {
  return (
    <Panel className="space-y-6 xl:sticky xl:top-28">
      <div>
        <p className="lux-label mb-3">Sub Category</p>
        <div className="space-y-2 text-sm">
          {filters.categories?.flatMap((category) => category.subCategories).map((subCategory) => (
            <label key={subCategory} className="flex items-center gap-3">
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

      <div>
        <p className="lux-label mb-3">Collection</p>
        <div className="space-y-2 text-sm">
          {filters.collections?.map((collection) => (
            <label key={collection.name} className="flex items-center gap-3">
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

      <div>
        <p className="lux-label mb-3">Metal Color</p>
        <div className="flex flex-wrap gap-2">
          {filters.metalColors?.map((metalColor) => (
            <button
              key={metalColor}
              onClick={() => setFilter('metalColor', toggleArrayValue(activeFilters.metalColor, metalColor))}
              className={`border px-3 py-2 text-xs ${activeFilters.metalColor.includes(metalColor) ? 'border-[var(--color-border-active)] bg-[var(--color-surface-alt)] text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
            >
              {metalColor}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-2 block text-[var(--color-text-muted)]">Diamond Min</span>
          <input
            type="number"
            value={activeFilters.diamondMin}
            onChange={(event) => setFilter('diamondMin', event.target.value)}
            className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-border-active)] outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="mb-2 block text-[var(--color-text-muted)]">Diamond Max</span>
          <input
            type="number"
            value={activeFilters.diamondMax}
            onChange={(event) => setFilter('diamondMax', event.target.value)}
            className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-border-active)] outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="mb-2 block text-[var(--color-text-muted)]">Gold Min</span>
          <input
            type="number"
            value={activeFilters.goldMin}
            onChange={(event) => setFilter('goldMin', event.target.value)}
            className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-border-active)] outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="mb-2 block text-[var(--color-text-muted)]">Gold Max</span>
          <input
            type="number"
            value={activeFilters.goldMax}
            onChange={(event) => setFilter('goldMax', event.target.value)}
            className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-border-active)] outline-none"
          />
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm text-[var(--color-text-muted)]">Order Type</p>
        <select
          value={activeFilters.stockType}
          onChange={(event) => setFilter('stockType', event.target.value)}
          className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-[var(--color-text)] focus:border-[var(--color-border-active)] outline-none"
        >
          <option value="">All</option>
          <option value="Ready Stock">Ready Stock</option>
          <option value="Make to Order">Make to Order</option>
        </select>
      </div>

      <Button variant="ghost" className="w-full justify-start px-0" onClick={resetFilters}>
        Clear All Filters
      </Button>
    </Panel>
  );
}
