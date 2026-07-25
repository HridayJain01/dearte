import { useEffect, useRef, useState } from 'react';
import { Panel } from '../ui/Primitives';
import { Select } from '../ui/Select';

const toggleArrayValue = (values, value) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

// Closing is handled by the panel-level click-outside handler, so this takes no
// onClose of its own.
function FilterDropdown({ label, name, openFilter, onToggle, children }) {
  const isOpen = openFilter === name;

  return (
    // Mobile widens the open filter to the full row and drops the panel in
    // flow beneath it: a 220px flyout anchored to a chip near the right edge
    // would otherwise hang off the screen.
    <div className={`relative ${isOpen ? 'max-sm:w-full' : ''}`}>
      <button
        onClick={() => onToggle(name)}
        className={`whitespace-nowrap border bg-[var(--color-surface)] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.06em] sm:px-4 sm:py-2.5 sm:text-[12px] sm:tracking-[0.12em] ${
          isOpen
            ? 'border-[var(--color-border-active)] text-[var(--color-primary)]'
            : 'border-[var(--color-border)] text-[var(--color-text)]'
        }`}
      >
        {label}
      </button>
      {isOpen && (
        <div className="z-30 border border-[var(--color-border)] bg-[var(--color-surface)] max-sm:mt-1.5 max-sm:w-full sm:absolute sm:left-0 sm:top-full sm:mt-2 sm:shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

// The API cross-filters the facets, so a value can drop out of the list while
// it is still selected. Keep selected values on screen so they stay untickable.
const withSelected = (options, selected) => [
  ...new Set([...(options || []), ...(selected || [])]),
];

export function ProductFilters({ filters, activeFilters, setFilter }) {
  const [openFilter, setOpenFilter] = useState(null);
  const panelRef = useRef(null);
  const categories = withSelected(
    filters.categories?.map((category) => category.name),
    activeFilters.category,
  ).map((name) => ({ name }));
  const subCategories = withSelected(
    filters.categories?.flatMap((category) => category.subCategories),
    activeFilters.subCategory,
  );
  const collections = withSelected(
    filters.collections?.map((collection) => collection.name),
    activeFilters.collection,
  ).map((name) => ({ name }));
  const occasions = withSelected(filters.occasions, activeFilters.occasion);
  const metalColors = withSelected(filters.metalColors, activeFilters.metalColor);

  const toggle = (name) => setOpenFilter((prev) => (prev === name ? null : name));
  const close = () => setOpenFilter(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={panelRef}>
    <Panel className="space-y-2.5 sm:space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
        <FilterDropdown label="Category" name="category" openFilter={openFilter} onToggle={toggle} onClose={close}>
          <div className="max-h-56 min-w-[220px] overflow-auto p-2.5 sm:max-h-64 sm:p-4">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] sm:block sm:space-y-2 sm:text-sm">
              {categories.length ? (
                categories.map((category) => (
                  <label key={category.name} className="flex cursor-pointer items-center gap-2 text-[var(--color-text)] sm:gap-3">
                    <input
                      type="checkbox"
                      checked={activeFilters.category.includes(category.name)}
                      onChange={() => {
                        setFilter('category', toggleArrayValue(activeFilters.category, category.name));
                        close();
                      }}
                    />
                    {category.name}
                  </label>
                ))
              ) : (
                <p className="text-[var(--color-text-muted)]">No categories available.</p>
              )}
            </div>
          </div>
        </FilterDropdown>

        <FilterDropdown label="Sub Category" name="subCategory" openFilter={openFilter} onToggle={toggle} onClose={close}>
          <div className="max-h-56 min-w-[220px] overflow-auto p-2.5 sm:max-h-64 sm:p-4">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] sm:block sm:space-y-2 sm:text-sm">
              {subCategories.length ? (
                subCategories.map((subCategory) => (
                <label key={subCategory} className="flex cursor-pointer items-center gap-2 text-[var(--color-text)] sm:gap-3">
                  <input
                    type="checkbox"
                    checked={activeFilters.subCategory.includes(subCategory)}
                    onChange={() => {
                      setFilter('subCategory', toggleArrayValue(activeFilters.subCategory, subCategory));
                      close();
                    }}
                  />
                  {subCategory}
                </label>
                ))
              ) : (
                <p className="text-[var(--color-text-muted)]">No sub categories available.</p>
              )}
            </div>
          </div>
        </FilterDropdown>

        <FilterDropdown label="Collection" name="collection" openFilter={openFilter} onToggle={toggle} onClose={close}>
          <div className="max-h-56 min-w-[220px] overflow-auto p-2.5 sm:max-h-64 sm:p-4">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] sm:block sm:space-y-2 sm:text-sm">
              {collections.length ? (
                collections.map((collection) => (
                <label key={collection.name} className="flex cursor-pointer items-center gap-2 text-[var(--color-text)] sm:gap-3">
                  <input
                    type="checkbox"
                    checked={activeFilters.collection.includes(collection.name)}
                    onChange={() => {
                      setFilter('collection', toggleArrayValue(activeFilters.collection, collection.name));
                      close();
                    }}
                  />
                  {collection.name}
                </label>
                ))
              ) : (
                <p className="text-[var(--color-text-muted)]">No collections available.</p>
              )}
            </div>
          </div>
        </FilterDropdown>

        <FilterDropdown label="Occasion" name="occasion" openFilter={openFilter} onToggle={toggle} onClose={close}>
          <div className="max-h-56 min-w-[220px] overflow-auto p-2.5 sm:max-h-64 sm:p-4">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] sm:block sm:space-y-2 sm:text-sm">
              {occasions.length ? (
                occasions.map((occasion) => (
                  <label key={occasion} className="flex cursor-pointer items-center gap-2 text-[var(--color-text)] sm:gap-3">
                    <input
                      type="checkbox"
                      checked={activeFilters.occasion.includes(occasion)}
                      onChange={() => {
                        setFilter('occasion', toggleArrayValue(activeFilters.occasion, occasion));
                        close();
                      }}
                    />
                    {occasion}
                  </label>
                ))
              ) : (
                <p className="text-[var(--color-text-muted)]">No occasions tagged yet.</p>
              )}
            </div>
          </div>
        </FilterDropdown>

        <FilterDropdown label="Metal Color" name="metalColor" openFilter={openFilter} onToggle={toggle} onClose={close}>
          <div className="min-w-[220px] p-2.5 sm:p-4">
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {metalColors.length ? (
                metalColors.map((metalColor) => (
                <button
                  key={metalColor}
                  onClick={() => {
                    setFilter('metalColor', toggleArrayValue(activeFilters.metalColor, metalColor));
                    close();
                  }}
                  className={`border px-2 py-1 text-[10px] uppercase tracking-[0.06em] sm:px-3 sm:py-2 sm:text-xs sm:tracking-[0.08em] ${
                    activeFilters.metalColor.includes(metalColor)
                      ? 'border-[var(--color-border-active)] bg-[var(--color-surface-alt)] text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                  }`}
                >
                  {metalColor}
                </button>
                ))
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">No metal colors available.</p>
              )}
            </div>
          </div>
        </FilterDropdown>

        <FilterDropdown label="Weight Range" name="weightRange" openFilter={openFilter} onToggle={toggle} onClose={close}>
          <div className="min-w-[240px] p-2.5 sm:min-w-[260px] sm:p-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <label className="text-[12px] sm:text-sm">
                <span className="mb-1 block text-[var(--color-text-muted)] sm:mb-2">Diamond Min</span>
                <input
                  type="number"
                  value={activeFilters.diamondMin}
                  onChange={(event) => setFilter('diamondMin', event.target.value)}
                  className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)] sm:px-3 sm:py-2"
                />
              </label>
              <label className="text-[12px] sm:text-sm">
                <span className="mb-1 block text-[var(--color-text-muted)] sm:mb-2">Diamond Max</span>
                <input
                  type="number"
                  value={activeFilters.diamondMax}
                  onChange={(event) => setFilter('diamondMax', event.target.value)}
                  className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)] sm:px-3 sm:py-2"
                />
              </label>
              <label className="text-[12px] sm:text-sm">
                <span className="mb-1 block text-[var(--color-text-muted)] sm:mb-2">Gold Min</span>
                <input
                  type="number"
                  value={activeFilters.goldMin}
                  onChange={(event) => setFilter('goldMin', event.target.value)}
                  className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)] sm:px-3 sm:py-2"
                />
              </label>
              <label className="text-[12px] sm:text-sm">
                <span className="mb-1 block text-[var(--color-text-muted)] sm:mb-2">Gold Max</span>
                <input
                  type="number"
                  value={activeFilters.goldMax}
                  onChange={(event) => setFilter('goldMax', event.target.value)}
                  className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[var(--color-text)] outline-none focus:border-[var(--color-border-active)] sm:px-3 sm:py-2"
                />
              </label>
            </div>
            <button
              className="mt-3 text-xs text-[var(--color-primary)] underline"
              onClick={close}
            >
              Done
            </button>
          </div>
        </FilterDropdown>

      </div>

      <div className="text-[10px] text-[var(--color-text-muted)] sm:text-xs">
        Use the dropdowns above to refine by style, material, and weight.
      </div>
    </Panel>
    </div>
  );
}
