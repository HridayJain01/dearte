import { useEffect, useState } from 'react';
import { BellRing, Download, Share, SquarePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { unwrap } from '../../services/api';
import { Button } from '../ui/Primitives';

/*
 * On the website: an invitation to install the app — Chrome/Edge/Android get
 * the browser's own install dialog, iPhone and iPad get the two Share-sheet taps.
 * Inside the installed app: an invitation to turn on notifications, which the
 * admin sends from Admin → Broadcasts (server/src/services/webPush.js).
 *
 * "Not now" holds either one back for two weeks, per device.
 */
const SNOOZE_KEY = 'dearte:appPromptSnoozedAt';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
// Lets the page settle (and any promo popup open first) before asking anything.
const SHOW_AFTER_MS = 4000;

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
// iPadOS reports itself as a Mac; the touch screen gives it away.
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const canPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function snoozed() {
  try {
    return Date.now() - Number(window.localStorage.getItem(SNOOZE_KEY) || 0) < SNOOZE_MS;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  } catch {
    // Private mode: the prompt simply comes back next visit.
  }
}

const base64UrlBytes = (text) =>
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)), (char) => char.charCodeAt(0));

// Subscribes (or reuses this phone's subscription) and hands it to the API. Run on
// every start of the app once allowed, so the server's copy never goes stale.
async function subscribe(publicKey) {
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlBytes(publicKey) }));
  await api.post('/push/subscribe', subscription.toJSON());
}

export function AppInstallPrompt() {
  const [mode, setMode] = useState(null); // 'install' | 'ios' | 'push'
  const [installEvent, setInstallEvent] = useState(null);
  const [publicKey, setPublicKey] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let timer;
    let cancelled = false;
    // Never on top of the promo popup or another modal: wait until it is closed.
    const showSoon = (next) => {
      clearTimeout(timer);
      timer = setTimeout(function show() {
        if (document.querySelector('[aria-modal="true"]')) timer = setTimeout(show, SHOW_AFTER_MS);
        else setMode(next);
      }, SHOW_AFTER_MS);
    };

    if (isStandalone()) {
      if (!canPush() || Notification.permission === 'denied') return undefined;
      unwrap(api.get('/push/key'))
        .then(({ publicKey: key }) => {
          if (cancelled || !key) return;
          if (Notification.permission === 'granted') subscribe(key).catch(() => {});
          else if (!snoozed()) {
            setPublicKey(key);
            showSoon('push');
          }
        })
        .catch(() => {});
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    if (snoozed()) return undefined;
    // Chrome, Edge and Samsung Internet announce that the site can be installed;
    // holding the event back lets the button below open the real install dialog.
    const onInstallable = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      showSoon('install');
    };
    const onInstalled = () => {
      snooze();
      setMode(null);
    };
    window.addEventListener('beforeinstallprompt', onInstallable);
    window.addEventListener('appinstalled', onInstalled);
    // Safari has no install event; on iPhone and iPad the steps are shown instead.
    if (isIos()) showSoon('ios');
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onInstallable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!mode) return null;

  const close = () => {
    snooze();
    setMode(null);
  };

  const install = async () => {
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome !== 'accepted') snooze();
    setMode(null);
  };

  const turnOnNotifications = async () => {
    setBusy(true);
    try {
      if ((await Notification.requestPermission()) === 'granted') {
        await subscribe(publicKey);
        toast.success('Notifications are on');
      }
      setMode(null);
    } catch {
      toast.error('Could not turn on notifications. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const copy = {
    install: ['Get the DeArte app', 'Opens straight from your home screen, loads faster and keeps working offline.'],
    ios: ['Get the DeArte app', null],
    push: ['Turn on notifications', 'Be the first to hear about new collections and offers.'],
  }[mode];

  return (
    <div
      role="dialog"
      aria-label={copy[0]}
      className="fixed inset-x-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))_+_3.5rem)] z-40 border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-lifted)] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[22rem]"
    >
      <div className="flex items-start gap-3">
        <img src="/icon-192.png" alt="" className="h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-lg leading-tight text-[var(--color-primary)]">{copy[0]}</p>
          {copy[1] ? (
            <p className="mt-1 text-[13px] leading-snug text-[var(--color-text-muted)]">{copy[1]}</p>
          ) : (
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
              Tap <Share className="inline h-4 w-4 align-text-bottom text-[var(--color-primary)]" role="img" aria-label="Share" />, then{' '}
              <span className="whitespace-nowrap font-medium text-[var(--color-text)]">Add to Home Screen <SquarePlus className="inline h-4 w-4 align-text-bottom" aria-hidden /></span>.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Not now"
          className="-mr-2 -mt-2 inline-flex h-10 w-10 shrink-0 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {mode === 'ios' ? null : (
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>Not now</Button>
          {mode === 'install' ? (
            <Button icon={Download} onClick={install}>Install app</Button>
          ) : (
            <Button icon={BellRing} loading={busy} disabled={busy} onClick={turnOnNotifications}>Turn on</Button>
          )}
        </div>
      )}
    </div>
  );
}
