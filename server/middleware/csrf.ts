import { createError, defineEventHandler, getRequestHeader, getRequestHost } from 'h3';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isSameHost(origin: string, host: string) {
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// SameSite=Lax still sends the session cookie from sibling subdomains, so state-changing API
// requests must come from this host. Only the host is compared because on Workers the request
// protocol is inferred from x-forwarded-proto. Requests without browser origin headers carry no
// ambient cookies from another site and are left to the normal auth checks.
export default defineEventHandler((event) => {
  if (SAFE_METHODS.has(event.method) || !event.path.startsWith('/api/')) return;

  const fetchSite = getRequestHeader(event, 'sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: '不允許跨站請求' });
  }

  const origin = getRequestHeader(event, 'origin');
  if (origin && !isSameHost(origin, getRequestHost(event))) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: '不允許跨站請求' });
  }
});
