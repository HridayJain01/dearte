import { useState } from 'react';
import { Info } from 'lucide-react';

export function WeightDisclaimerTrigger({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false);

  const show = () => setIsOpen(true);
  const hide = () => setIsOpen(false);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        type="button"
        onClick={handleClick}
        onFocus={show}
        onBlur={hide}
        className="inline-flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-300"
        aria-label="View weight disclaimer"
      >
        <Info className="h-4 w-4" />
      </button>

      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-[250] mb-2 w-56 -translate-x-1/2 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left text-[12px] font-sans leading-relaxed text-[var(--color-text-muted)] shadow-[var(--shadow-lifted)] transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="gold-hairline pointer-events-none absolute inset-x-0 top-0 h-px bg-[var(--color-accent)]" aria-hidden="true" />
        All weights mentioned are approximate and intended for reference only. Final product weight may vary.
      </span>
    </span>
  );
}
