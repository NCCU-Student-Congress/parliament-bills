import { onMounted } from 'vue';

// Data that may have changed since this tab last loaded it: show that earlier copy at once, then
// refetch in the background. The first visit renders the page right away and lets the page show
// its own loading state until the data arrives.
export function useRevalidatingFetch<T>(url: string) {
  let servedFromCache = false;
  const result = useFetch<T>(url, {
    ...FRESH_FETCH_OPTIONS,
    key: `revalidating:${url}`,
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
