// Turns any failure (an API call, a page that failed to download, a bug while
// rendering) into words a buyer can act on, plus a technical line to quote when
// reporting it. The point: "check your connection" only when it's the connection.

// How each browser words a lazy page chunk that failed to download.
const CHUNK_LOAD_ERROR =
  /dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading chunk|ChunkLoadError/i;

const BY_STATUS = {
  401: ['Your session has ended.', 'Sign in again to continue.'],
  403: ["You don't have access to this.", 'Your account cannot open this. Contact your DeArte representative if you think it should.'],
  404: ["We couldn't find that.", 'It may have been removed, or the link is wrong.'],
  429: ['Too many requests.', 'Please wait a minute, then try again.'],
};

export function describeError(error) {
  const response = error?.response;
  const status = response?.status;
  const serverMessage = typeof response?.data?.message === 'string' ? response.data.message : '';
  const request = error?.config?.url
    ? `${(error.config.method || 'get').toUpperCase()} ${error.config.baseURL || ''}${error.config.url}`
    : '';
  // Vercel's request id finds this exact call in the deployment logs.
  const ref = response?.headers?.['x-vercel-id'];
  const detail = error?.isAxiosError
    ? [status ? `HTTP ${status}` : '', request, serverMessage || error.message, ref ? `ref ${ref}` : '']
        .filter(Boolean)
        .join(' · ')
    : `${error?.name || 'Error'}: ${error?.message || String(error)}`;
  const result = (title, description) => ({ title, description, detail });

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return result("You're offline.", 'Reconnect to the internet, then try again.');
  }
  if (CHUNK_LOAD_ERROR.test(String(error?.message))) {
    return result(
      "This page didn't finish downloading.",
      'The connection dropped, or the site was updated while this tab was open. Reloading fetches the latest version.',
    );
  }
  if (error?.isAxiosError && !response) {
    return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      ? result('The server took too long to answer.', 'It may be busy or starting up. Try again in a moment.')
      : result("Can't reach the DeArte server.", 'Your internet may be down, or the server is unavailable right now.');
  }
  // The app reaches the API through Vercel's /api rewrite, so an API that is
  // down, crashed or timed out arrives as a 502/503/504 from Vercel rather than
  // as a network error.
  if (status === 502 || status === 503 || status === 504) {
    return result('The server is unavailable right now.', 'It may be restarting or overloaded. Try again in a minute.');
  }
  if (status >= 500) {
    return result('The server ran into a problem.', "It isn't something you did. Try again in a minute; if it keeps happening, let us know.");
  }
  if (status) {
    const [title, description] = BY_STATUS[status] || ['That request was refused.', 'Please check the details and try again.'];
    return result(title, serverMessage && status !== 401 ? serverMessage : description);
  }
  return result('Something broke on this page.', "This is a problem on our side, not your connection. Reload, or go back and keep browsing.");
}

// One sentence for a toast: the server's own reason when it gave one (it names
// the actual problem, e.g. "Product not found"), else the description above.
export function errorMessage(error, fallback) {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;
  if (status < 500 && typeof serverMessage === 'string' && serverMessage) return serverMessage;
  if (status < 500 && fallback) return fallback;
  const { title, description } = describeError(error);
  return `${title} ${description}`;
}
