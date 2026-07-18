import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { Button } from './Primitives';

export function WeightDisclaimerTrigger({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`inline-flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-300 ${className}`}
        title="Weight Disclaimer"
        aria-label="View weight disclaimer"
      >
        <Info className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-[var(--scrim-veil)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={handleClose}
        >
          <div
            className="animate-hero-entry relative w-full max-w-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-[var(--shadow-lifted)] text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gold line matching DeArte luxury brand theme */}
            <span className="gold-hairline pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-[var(--color-accent)]" aria-hidden="true" />
            
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-300"
              aria-label="Close disclaimer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="lux-heading text-2xl mb-4">Weight Disclaimer</h3>
            <p className="text-[14px] text-[var(--color-text-muted)] leading-relaxed font-sans">
              All weights mentioned are approximate and intended for reference only. Final product weight may vary.
            </p>

            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleClose}
                className="px-6"
              >
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
