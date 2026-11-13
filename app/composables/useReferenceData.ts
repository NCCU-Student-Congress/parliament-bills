import type { NuxtApp } from '#app';
import type { Committee, Session } from '~~/shared/types/bill';

// Sessions and committees rarely change, so client-side navigation reuses the copy this tab
// already loaded instead of waiting on D1 again. An explicit refresh() still refetches, which
// keeps the admin page current after it edits them.
function reuseLoadedData(key: string, nuxtApp: NuxtApp, ctx: { cause: string }) {
  if (ctx.cause === 'refresh:manual' || ctx.cause === 'refresh:hook') return undefined;
  return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
}

export const useSessions = () =>
  useFetch<Session[]>('/api/sessions', { key: 'sessions', getCachedData: reuseLoadedData });

export const useCommittees = () =>
  useFetch<Committee[]>('/api/committees', { key: 'committees', getCachedData: reuseLoadedData });
