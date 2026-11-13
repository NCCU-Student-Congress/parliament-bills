// useFetch for public API data that may already have been prefetched by app/plugins/prefetch-data.
export function usePrefetchableFetch<T>(url: string) {
  // A plain signature keeps $fetch's route-typing from expanding over every API path.
  const fetcher = useRequestFetch() as (request: string) => Promise<T>;
  return useAsyncData<T>(
    url,
    () => {
      const entry = takePrefetchedData(url);
      if (!entry) return fetcher(url);
      return (entry.promise as Promise<T>).catch(() => fetcher(url));
    },
    {
      getCachedData(key, nuxtApp, ctx) {
        if (nuxtApp.isHydrating) return nuxtApp.payload.data[key];
        if (ctx.cause !== 'initial' || !peekPrefetchedData(url)?.resolved) return undefined;
        return takePrefetchedData(url)?.data as T;
      },
    },
  );
}
