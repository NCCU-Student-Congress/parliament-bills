import type { H3Event } from 'h3';
import {
  defineEventHandler,
  getCookie,
  getRequestHeader,
  getRequestURL,
  setCookie,
  setResponseHeader,
} from 'h3';

// Public reads are cached in the Cloudflare data center for this long. Someone who just changed
// data skips the cache for the same window, so only other visitors can see an older copy.
export const EDGE_CACHE_TTL_SECONDS = 60 * 5;

const RECENT_WRITE_COOKIE = 'recent_write';

interface CloudflareCacheStorage {
  default: Cache;
}

interface EdgeCacheContext {
  waitUntil?: (promise: Promise<unknown>) => void;
  cloudflare?: { url?: URL };
}

function getEdgeCache() {
  // Only the Workers runtime (production and wrangler dev) provides caches.default.
  return (globalThis as { caches?: Partial<CloudflareCacheStorage> }).caches?.default;
}

function shouldBypassCache(event: H3Event) {
  if (getCookie(event, RECENT_WRITE_COOKIE)) return true;
  return /\bno-cache\b/i.test(getRequestHeader(event, 'cache-control') ?? '');
}

// SSR calls the API in-process over http, so key entries by the public origin of the incoming
// request to share them with the browser's https requests.
function getCacheKey(event: H3Event) {
  const { origin, pathname, search } = getRequestURL(event);
  const publicOrigin = (event.context as EdgeCacheContext).cloudflare?.url?.origin ?? origin;
  return new Request(`${publicOrigin}${pathname}${search}`, { method: 'GET' });
}

export function markRecentWrite(event: H3Event) {
  setCookie(event, RECENT_WRITE_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: getRequestURL(event).protocol === 'https:',
    // A slower reader can store a copy fetched just before the write; outlast that copy too.
    maxAge: EDGE_CACHE_TTL_SECONDS + 60,
    path: '/',
  });
}

// Wraps a public GET handler whose response is the same for every visitor. Requests that bypass
// the cache still store their fresh result, so the next visitor in this data center sees it too.
export function defineEdgeCachedEventHandler<T>(handler: (event: H3Event) => Promise<T> | T) {
  return defineEventHandler(async (event) => {
    const cache = getEdgeCache();
    if (!cache || event.method !== 'GET') return handler(event);

    const key = getCacheKey(event);

    if (!shouldBypassCache(event)) {
      const cached = await cache.match(key);
      if (cached) {
        setResponseHeader(event, 'content-type', 'application/json; charset=utf-8');
        return cached.text();
      }
    }

    const data = await handler(event);
    const stored = cache.put(
      key,
      new Response(JSON.stringify(data), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': `public, max-age=${EDGE_CACHE_TTL_SECONDS}`,
        },
      }),
    );
    const { waitUntil } = event.context as EdgeCacheContext;
    if (waitUntil) waitUntil(stored);
    else await stored;

    return data;
  });
}
