import { useEffect } from 'react';
import api from '../services/api';

export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const canPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const base64UrlBytes = (text) =>
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)), (char) => char.charCodeAt(0));

// Subscribes (or reuses this phone's subscription) and hands it to the API. Run on
// every start of the app once allowed, so the server's copy never goes stale.
export async function subscribe(publicKey) {
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlBytes(publicKey) }));
  await api.post('/push/subscribe', subscription.toJSON());
}

export async function currentSubscription() {
  return (await navigator.serviceWorker.ready).pushManager.getSubscription();
}

export async function unsubscribe() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}

// Re-sends this phone's subscription whenever the signed-in person changes, so a
// phone that switches accounts (or an admin who never sees the storefront) is
// linked to whoever is using it now. Only an existing one: a phone switched off
// on the account page stays off.
export function usePushLink(userId) {
  useEffect(() => {
    if (!userId || !isStandalone() || !canPush() || Notification.permission !== 'granted') return;
    currentSubscription()
      .then((subscription) => subscription && api.post('/push/subscribe', subscription.toJSON()))
      .catch(() => {});
  }, [userId]);
}

