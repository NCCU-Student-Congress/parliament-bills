import { onMounted } from 'vue';

// Secretariat data: show the copy this tab loaded on an earlier visit at once, then refetch it in
// the background, since another admin may have changed it meanwhile. The first visit renders the
// page right away and lets each card show its own spinner until its data arrives.
export function useAdminFetch<T>(url: string) {
  let servedFromCache = false;
  const result = useFetch<T>(url, {
    ...FRESH_FETCH_OPTIONS,
    key: `admin:${url}`,
    lazy: true,
    getCachedData(key, nuxtApp, ctx) {
      if (nuxtApp.isHydrating) return nuxtApp.payload.data[key];
      if (ctx.cause !== 'initial') return undefined;
      const cached = nuxtApp.payload.data[key];
      servedFromCache = cached !== undefined;
      return cached;
    },
  });

  onMounted(() => {
    if (servedFromCache) void result.refresh();
  });

  return result;
}
