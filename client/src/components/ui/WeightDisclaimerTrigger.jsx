import { useLayoutEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';

const WEIGHT_NOTE = 'All weights mentioned are approximate and intended for reference only. Final product weight may vary.';

export function WeightDisclaimerTrigger({ className = '', text = WEIGHT_NOTE, label = 'View weight disclaimer' }) {
  const [isOpen, setIsOpen] = useState(false);
  const tipRef = useRef(null);

  // Icons often sit at a card's right edge; nudge the open tooltip back inside
  // the viewport instead of letting it widen the page.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!isOpen || !tip) return;
    const { left, right } = tip.getBoundingClientRect();
    const edge = 8;
    tip.style.marginLeft = `${left < edge ? edge - left : Math.min(0, window.innerWidth - edge - right)}px`;
  }, [isOpen]);

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
        className="-m-2.5 inline-flex items-center justify-center p-2.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-300"
        aria-label={label}
      >
        <Info className="h-4 w-4" />
      </button>

      {/* Not rendered while closed: an invisible 224px box still widened the
          page on phones and let it scroll sideways. */}
      {isOpen ? (
        <span
          ref={tipRef}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-[250] mb-2 w-56 -translate-x-1/2 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left text-[12px] font-sans leading-relaxed text-[var(--color-text-muted)] shadow-[var(--shadow-lifted)]"
        >
          <span className="gold-hairline pointer-events-none absolute inset-x-0 top-0 h-px bg-[var(--color-accent)]" aria-hidden="true" />
          {text}
        </span>
      ) : null}
    </span>
  );
}
