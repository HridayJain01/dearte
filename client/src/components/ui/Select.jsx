import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Themed replacement for the native <select>.
 *
 * Options may be plain strings or `{ value, label, hint, disabled }` objects —
 * the hint renders as muted secondary text, which is what lets the size picker
 * show international equivalents beside each size.
 */
export function Select({
  options = [],
  value,
  onChange,
  label,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  buttonClassName = '',
  renderValue,
  id,
}) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const typeaheadRef = useRef({ query: '', timer: null });

  const normalized = useMemo(
    () =>
      options.map((option) =>
        typeof option === 'string' || typeof option === 'number'
          ? { value: String(option), label: String(option) }
          : { ...option, value: String(option.value), label: option.label ?? String(option.value) },
      ),
    [options],
  );

  const selectedIndex = normalized.findIndex((option) => option.value === String(value ?? ''));
  const selected = selectedIndex >= 0 ? normalized[selectedIndex] : null;

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  // Measure at the moment of opening: the list flips above the control when
  // there is not enough room below, so a long chart is never clipped.
  const openList = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 280 && rect.top > spaceBelow);
    }

    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close();
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, close]);

  // Keep the highlighted row in view during keyboard navigation.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current?.children?.[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const commit = (option) => {
    if (option.disabled) return;
    onChange?.(option.value, option);
    close();
    buttonRef.current?.focus();
  };

  const step = (from, direction) => {
    const count = normalized.length;
    if (!count) return -1;

    for (let offset = 1; offset <= count; offset += 1) {
      const next = (((from + direction * offset) % count) + count) % count;
      if (!normalized[next]?.disabled) return next;
    }
    return from;
  };

  const handleTypeahead = (character) => {
    const state = typeaheadRef.current;
    window.clearTimeout(state.timer);
    state.query += character.toLowerCase();
    state.timer = window.setTimeout(() => {
      state.query = '';
    }, 600);

    const match = normalized.findIndex(
      (option) => !option.disabled && option.label.toLowerCase().startsWith(state.query),
    );

    if (match >= 0) {
      if (open) setActiveIndex(match);
      else commit(normalized[match]);
    }
  };

  const handleKeyDown = (event) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!open) {
          openList();
          return;
        }
        setActiveIndex((current) => step(current < 0 ? 0 : current, event.key === 'ArrowDown' ? 1 : -1));
        return;
      }
      case 'Home':
      case 'End': {
        if (!open) return;
        event.preventDefault();
        setActiveIndex(event.key === 'Home' ? step(-1, 1) : step(normalized.length, -1));
        return;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (!open) openList();
        else if (normalized[activeIndex]) commit(normalized[activeIndex]);
        return;
      }
      case 'Escape': {
        if (open) {
          event.preventDefault();
          close();
        }
        return;
      }
      case 'Tab': {
        if (open) close();
        return;
      }
      default: {
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          handleTypeahead(event.key);
        }
      }
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label ? (
        <span id={`${controlId}-label`} className="mb-2 block text-sm text-[var(--color-text-muted)]">
          {label}
        </span>
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        id={controlId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${controlId}-label ${controlId}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleKeyDown}
        className={`flex min-h-12 w-full items-center justify-between gap-3 border bg-[var(--color-surface)] px-4 py-3 text-left text-sm transition duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
          open
            ? 'border-[var(--color-border-active)] shadow-[0_8px_24px_-16px_rgba(107,15,46,0.55)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-border-active)]'
        } ${buttonClassName}`}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            renderValue?.(selected) ?? (
              <span className="flex items-baseline gap-2">
                <span className="text-[var(--color-text)]">{selected.label}</span>
                {selected.hint ? (
                  <span className="truncate text-xs text-[var(--color-text-muted)]">{selected.hint}</span>
                ) : null}
              </span>
            )
          ) : (
            <span className="text-[var(--color-text-muted)]">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--color-primary)] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open ? (
        <ul
          ref={listRef}
          role="listbox"
          aria-labelledby={label ? `${controlId}-label` : undefined}
          className={`absolute z-40 max-h-72 w-full overflow-y-auto border border-[var(--color-border-active)] bg-[var(--color-surface)] py-1 shadow-[0_24px_48px_-24px_rgba(58,26,40,0.45)] ${
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {normalized.length ? (
            normalized.map((option, index) => {
              const isSelected = option.value === String(value ?? '');
              const isActive = index === activeIndex;

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commit(option)}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors duration-150 ${
                    option.disabled
                      ? 'cursor-not-allowed text-[var(--color-text-muted)] opacity-50'
                      : isActive
                        ? 'bg-[var(--color-surface-alt)] text-[var(--color-text)]'
                        : 'text-[var(--color-text)]'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${isSelected ? 'text-[var(--color-primary)]' : ''}`}>
                      {option.label}
                    </span>
                    {option.hint ? (
                      <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">
                        {option.hint}
                      </span>
                    ) : null}
                  </span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0 text-[var(--color-primary)]" /> : null}
                </li>
              );
            })
          ) : (
            <li className="px-4 py-3 text-sm text-[var(--color-text-muted)]">No options available</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
