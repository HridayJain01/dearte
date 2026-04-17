import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

function shouldShowPopup(ad) {
  if (!ad?.id || !ad?.image) return false;
  const key = `dearte-popup-${ad.id}`;
  if (ad.frequency === 'once_per_session') {
    if (sessionStorage.getItem(key)) return false;
  }
  if (ad.frequency === 'once_per_day') {
    const day = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(key) === day) return false;
  }
  return true;
}

export function PopupPromo({ ads }) {
  const ad = ads?.[0];
  const canShow = useMemo(() => shouldShowPopup(ad), [ad]);

  const [dismissed, setDismissed] = useState(false);
  const open = canShow && !dismissed;

  if (!open || !ad?.image) return null;

  const dismiss = () => {
    setDismissed(true);
    const key = `dearte-popup-${ad.id}`;
    if (ad.frequency === 'once_per_session') {
      sessionStorage.setItem(key, '1');
    }
    if (ad.frequency === 'once_per_day') {
      localStorage.setItem(key, new Date().toISOString().slice(0, 10));
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" role="dialog">
      <div className="relative max-h-[90vh] max-w-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 bg-[var(--color-primary)] p-2 text-white hover:bg-[var(--color-primary-hover)]"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <img src={ad.image} alt="" className="max-h-[80vh] w-full object-contain" />
      </div>
    </div>
  );
}
