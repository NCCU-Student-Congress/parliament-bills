// Secretariat tools must see every edit at once, including other admins', so they skip the
// Cloudflare cache that serves public pages.
export const FRESH_FETCH_OPTIONS = { headers: { 'cache-control': 'no-cache' } };
