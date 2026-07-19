import { useEffect, useRef, useState } from 'react';
import { Button, Panel } from '../ui/Primitives';
import { Select } from '../ui/Select';

const toggleArrayValue = (values, value) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

// Closing is handled by the panel-level click-outside handler, so this takes no
// onClose of its own.
function FilterDropdown({ label, name, openFilter, onToggle, children }) {
  const isOpen = openFilter === name;

  return (
    <div className="relative">
      <button
        onClick={() => onToggle(name)}
        className={`border px-4 py-2.5 text-[12px] uppercase tracking-[0.12em] bg-[var(--color-surface)] ${
          isOpen
            ? 'border-[var(--color-border-active)] text-[var(--color-primary)]'
            : 'border-[var(--color-border)] text-[var(--color-text)]'
        }`}
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-30 mt-2 border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

export function ProductFilters({ filters, activeFilters, setFilter, resetFilters }) {
  const [openFilter, setOpenFilter] = useState(null);
  const panelRef = useRef(null);
  const subCategories = filters.categories?.flatMap((category) => category.subCategories) || [];

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
    <Panel className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <FilterDropdown label="Sub Category" name="subCategory" openFilter={openFilter} onToggle={toggle} onClose={close}>
          <div className="max-h-64 min-w-[220px] overflow-auto p-4">
            <div className="space-y-2 text-sm">
              {subCategories.map((subCategory) => (
                <label key={subCategory} className="flex cursor-pointer items-center gap-3 text-[var(--color-text)]">
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
              ))}
            </div>
          </div>
        </FilterDropdown>

        <FilterDropdown label="Collection" name="collection" openFilter={openFilter} onToggle={toggle} onClose={close}>
          <div className="max-h-64 min-w-[220px] overflow-auto p-4">
            <div className="space-y-2 text-sm">
              {filters.collections?.map((collection) => (
                <label key={collection.name} className="flex cursor-pointer items-center gap-3 text-[var(--color-text)]">
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
              ))}
            </div>
          </div>
        </FilterDropdown>

        <FilterDropdown label="Occasion" name="occasion" openFilter={openFilter} onToggle={toggle} onClose={close}>
          <div className="max-h-64 min-w-[220px] overflow-auto p-4">
            <div className="space-y-2 text-sm">
              {filters.occasions?.length ? (
                filters.occasions.map((occasion) => (
                  <label key={occasion} className="flex cursor-pointer items-center gap-3 text-[var(--color-text)]">
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
          <div className="min-w-[220px] p-4">
            <div className="flex flex-wrap gap-2">
              {filters.metalColors?.map((metalColor) => (
                <button
                  key={metalColor}
                  onClick={() => {
                    setFilter('metalColor', toggleArrayValue(activeFilters.metalColor, metalColor));
                    close();
                  }}
                  className={`border px-3 py-2 text-xs uppercase tracking-[0.08em] ${
                    activeFilters.metalColor.includes(metalColor)
                      ? 'border-[var(--color-border-active)] bg-[var(--color-surface-alt)] text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                  }`}
                >
                  {metalColor}
                </button>
              ))}
            </div>
          </div>
        </FilterDropdown>

        <FilterDropdown label="Weight Range" name="weightRange" openFilter={openFilter} onToggle={toggle} onClose={close}>
          <div className="min-w-[260px] p-4">
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
            <button
              className="mt-3 text-xs text-[var(--color-primary)] underline"
              onClick={close}
            >
              Done
            </button>
          </div>
        </FilterDropdown>

        <FilterDropdown label="Order Type" name="orderType" openFilter={openFilter} onToggle={toggle} onClose={close}>
          <div className="min-w-[220px] p-4">
            <Select
              value={activeFilters.stockType}
              onChange={(value) => {
                setFilter('stockType', value);
                close();
              }}
              options={[
                { value: '', label: 'All' },
                { value: 'Ready Stock', label: 'Ready Stock' },
                { value: 'Make to Order', label: 'Make to Order' },
              ]}
            />
          </div>
        </FilterDropdown>

        <Button variant="ghost" className="min-h-[42px] px-3" onClick={resetFilters}>
          Clear All
        </Button>
      </div>

      <div className="text-xs text-[var(--color-text-muted)]">
        Use the dropdowns above to refine by style, material, and weight.
      </div>
    </Panel>
    </div>
  );
}
