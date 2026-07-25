// Throwaway harness: drives the real api.js interceptors against the mock API.
import api, { markSessionEnded, markSessionStarted, onSessionExpired } from './services/api';

const log = document.getElementById('log');
const lines = [];
const write = (line) => {
  lines.push(line);
  log.textContent = lines.join('\n');
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const counters = () => api.get('/__counters', { skipSessionRefresh: true }).then((r) => r.data.data);

async function run() {
  markSessionEnded();
  let expiredEvents = 0;
  onSessionExpired(() => {
    expiredEvents += 1;
  });

  // 1. Guest, before logging in.
  const guest = await api.get('/products');
  write(`1. guest -> products=${guest.data.data.total} authenticated=${guest.data.data.authenticated}`);

  // 2. Log in (the mock's access cookie lives 6s instead of 15m).
  const login = await api.post('/auth/login', { email: 'buyer@example.com' });
  markSessionStarted(login.data.data.sessionExpiresAt);
  const fresh = await api.get('/products');
  write(`2. logged in -> products=${fresh.data.data.total} authenticated=${fresh.data.data.authenticated}`);

  // 3. Idle past the access-cookie lifetime, then browse again — the exact case
  //    that used to silently fall back to the restricted guest catalogue.
  await wait(7000);
  const before = await counters();
  const [p1, p2, cart1] = await Promise.all([
    api.get('/products'),
    api.get('/products'),
    api.get('/cart'),
  ]);
  const after = await counters();
  write(
    `3. after 7s idle -> products=${p1.data.data.total}/${p2.data.data.total} ` +
      `authenticated=${p1.data.data.authenticated} cart=${cart1.status} ` +
      `refreshCalls=${after.refresh - before.refresh} (expect 1)`,
  );

  // 4. Stale expiry (a slept laptop, a clock skew): the client still believes the
  //    session is live, so only the 401 retry can rescue the request.
  markSessionStarted(Date.now() + 10 * 60 * 1000);
  await wait(7000);
  const beforeRetry = await counters();
  const cart2 = await api.get('/cart');
  const products3 = await api.get('/products');
  const afterRetry = await counters();
  write(
    `4. stale expiry -> cart=${cart2.status} products=${products3.data.data.total} ` +
      `authenticated=${products3.data.data.authenticated} ` +
      `refreshCalls=${afterRetry.refresh - beforeRetry.refresh} (expect 1)`,
  );

  // 5. After logout nothing tries to renew anything.
  markSessionEnded();
  await wait(7000);
  const beforeGuest = await counters();
  const guestAgain = await api.get('/products');
  const afterGuest = await counters();
  write(
    `5. after logout -> products=${guestAgain.data.data.total} ` +
      `authenticated=${guestAgain.data.data.authenticated} ` +
      `refreshCalls=${afterGuest.refresh - beforeGuest.refresh} (expect 0) ` +
      `storedMarker=${Boolean(localStorage.getItem('dearte:sessionExpiresAt'))}`,
  );
  write(`expiredEvents=${expiredEvents}`);
  write('DONE');
}

run().catch((error) => write(`FAILED: ${error.message}`));
