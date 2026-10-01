/*
 * Service worker: lets the installed app open without a connection.
 *
 *   - Pages go to the network first, so a deploy is live on the next load.
 *     Offline, the last page shell we saw is served instead: every route boots
 *     the same SPA, and React Router renders whichever URL was asked for.
 *   - /assets/* is content-hashed by Vite, so a cached copy can never be stale.
 *   - /api/* and every other origin are left alone. Prices, stock and sessions
 *     must always come from the server, never from a copy on the device.
 *
 * Bump CACHE to throw away every client's cache on their next visit.
 */
const CACHE = 'dearte-v1';
const SHELL = '/';
const MAX_ASSETS = 100;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') event.respondWith(page(event));
  else if (url.pathname.startsWith('/assets/')) event.respondWith(asset(event));
});

async function page(event) {
  try {
    const response = await fetch(event.request);
    if (response.status === 200 && isHtml(response)) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(SHELL, copy)));
    }
    return response;
  } catch {
    return (await caches.match(SHELL)) || Response.error();
  }
}

async function asset(event) {
  const cached = await caches.match(event.request);
  if (cached) return cached;

  const response = await fetch(event.request);
  // Vercel's SPA rewrite answers a missing chunk with index.html and a 200;
  // caching that under a .js URL would pin the broken answer forever.
  if (response.status === 200 && !isHtml(response)) {
    const copy = response.clone();
    event.waitUntil(storeAsset(event.request, copy));
  }
  return response;
}

async function storeAsset(request, response) {
  const cache = await caches.open(CACHE);
  await cache.put(request, response);
  // ponytail: FIFO cap so chunks from old deploys don't pile up forever. Oldest
  // first can evict a chunk still in use; it is simply refetched on next use.
  const assets = (await cache.keys()).filter((key) => new URL(key.url).pathname.startsWith('/assets/'));
  await Promise.all(assets.slice(0, -MAX_ASSETS).map((key) => cache.delete(key)));
}

function isHtml(response) {
  return (response.headers.get('content-type') || '').includes('text/html');
}

/*
 * Notifications sent from Admin → Broadcasts (server/src/services/webPush.js).
 * Every push must show a notification: iOS withdraws push from an app that
 * receives one silently.
 */
self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(message.title || 'DeArte Jewellery', {
      body: message.body || '',
      icon: '/icon-192.png',
      data: { url: message.url || '/' },
    }),
  );
});

// Opens the page the notification links to, in the app window if one is open.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin);
  const url = target.origin === self.location.origin ? target.href : `${self.location.origin}/`;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'navigate' in client);
      return open
        ? open.focus().then((client) => client.navigate(url)).catch(() => self.clients.openWindow(url))
        : self.clients.openWindow(url);
    }),
  );
});
