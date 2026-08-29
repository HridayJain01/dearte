import axios from 'axios';

// The API is always reached through the app's own origin: Vite proxies /api in
// development (vite.config.js) and Vercel rewrites it in production
// (client/vercel.json). This is not cosmetic. Pointing the browser straight at
// the API's own domain makes the session cookies third-party, and every WebKit
// browser — which on iOS means *every* browser — drops third-party cookies
// outright. Login would return 200, the cookies would never be stored, and the
// next request would 401 into "Your session expired".
const baseURL = '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
  // Marks every request as a same-origin XHR. The API requires this custom header
  // on state-changing calls as a CSRF defense — a cross-site forgery cannot set it
  // without a CORS preflight that the server's origin allow-list rejects.
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  // Generous enough for a large bulk import, but bounded so a stalled request
  // surfaces as an error instead of hanging the admin UI forever.
  timeout: 180000,
});

/*
 * Session keep-alive.
 *
 * The API issues a short-lived access cookie next to a 14-day refresh cookie.
 * Nothing renews the access cookie while the app is open, so on an idle tab it
 * simply lapses: catalogue requests then arrive unauthenticated and come back
 * with the restricted guest listing, and buyer-only calls fail with 401. A
 * reload used to be the only cure, because mounting the app calls /auth/me,
 * which mints a new access cookie off the refresh cookie.
 *
 * So the client tracks when the access cookie dies (the API reports it) and
 * renews it just before that — and, as a safety net, retries once after any
 * unexpected 401.
 */
const SESSION_STORAGE_KEY = 'dearte:sessionExpiresAt';
// Renew this far ahead of the real expiry, so a request never races the cookie.
const REFRESH_SKEW_MS = 60 * 1000;
// Assumed access-cookie lifetime when the API did not report one.
const FALLBACK_SESSION_MS = 14 * 60 * 1000;
// Past the refresh cookie's own lifetime there is no session left to renew.
const REFRESH_COOKIE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const expiryListeners = new Set();
let refreshPromise = null;

function readStoredExpiry() {
  try {
    const stored = Number(window.localStorage.getItem(SESSION_STORAGE_KEY));
    if (!Number.isFinite(stored) || stored <= 0) return 0;
    return Date.now() - stored > REFRESH_COOKIE_MAX_AGE_MS ? 0 : stored;
  } catch {
    return 0;
  }
}

// Survives a reload so the first catalogue request of a new page load renews the
// session before firing, rather than rendering guest results while /auth/me is
// still in flight.
let sessionExpiresAt = readStoredExpiry();
let renewAt = sessionExpiresAt - REFRESH_SKEW_MS;

export function markSessionStarted(expiresAt) {
  sessionExpiresAt = Number(expiresAt) || Date.now() + FALLBACK_SESSION_MS;
  // Never spend more than half the token's life inside the safety margin: were
  // the API ever configured with a very short access token, a fixed margin would
  // put every single request behind its own renewal.
  const skew = Math.min(REFRESH_SKEW_MS, Math.max(0, (sessionExpiresAt - Date.now()) / 2));
  renewAt = sessionExpiresAt - skew;
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, String(sessionExpiresAt));
  } catch {
    /* storage unavailable — the in-memory expiry still covers this tab */
  }
}

export function markSessionEnded() {
  sessionExpiresAt = 0;
  renewAt = 0;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* nothing to clean up */
  }
}

export function hasSession() {
  return sessionExpiresAt > 0;
}

/** Notifies subscribers (AuthContext) that the session could not be renewed. */
export function onSessionExpired(listener) {
  expiryListeners.add(listener);
  return () => expiryListeners.delete(listener);
}

// The session endpoints manage their own cookies, so they must never be gated
// on — or retried through — the renewal below.
function isSessionEndpoint(url = '') {
  return String(url).startsWith('/auth/');
}

/**
 * Renews the access cookie. Single-flight: concurrent callers share one request
 * so a burst of requests after an idle spell does not fire a burst of refreshes.
 */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh', null, { skipSessionRefresh: true })
      .then((response) => {
        markSessionStarted(response.data?.data?.sessionExpiresAt);
        return response;
      })
      .catch((error) => {
        // Only a definitive answer from the API ends the session; a network blip
        // leaves the stored expiry in place so the next request can try again.
        if (error.response) {
          markSessionEnded();
          expiryListeners.forEach((listener) => listener());
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use(async (config) => {
  if (config.skipSessionRefresh || isSessionEndpoint(config.url)) return config;
  if (!hasSession() || Date.now() < renewAt) return config;

  // A failed renewal still lets the request through: it simply goes out as a
  // guest, which is the correct result for a session that is genuinely over.
  await refreshSession().catch(() => null);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const isRetryable =
      error.response?.status === 401 &&
      config &&
      !config.skipSessionRefresh &&
      !config.sessionRetry &&
      !isSessionEndpoint(config.url) &&
      hasSession();

    if (!isRetryable) return Promise.reject(error);

    config.sessionRetry = true;

    try {
      await refreshSession();
    } catch {
      return Promise.reject(error);
    }

    return api(config);
  },
);

export const unwrap = async (request) => {
  const response = await request;
  return response.data.data;
};

export default api;
