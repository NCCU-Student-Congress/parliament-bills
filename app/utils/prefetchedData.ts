// Data fetched in the background for links the visitor can see, so following one shows the page
// without waiting on the network. Each copy serves one page load, for at most a minute.
const PREFETCH_MAX_AGE_MS = 60 * 1000;

interface PrefetchedEntry {
  promise: Promise<unknown>;
  data?: unknown;
  resolved: boolean;
  fetchedAt: number;
  writeToken: string;
}

const entries = new Map<string, PrefetchedEntry>();

// The server changes this cookie on every write, so a copy fetched before the visitor's own
// change is never shown after it.
function currentWriteToken() {
  return document.cookie.match(/(?:^|;\s*)recent_write=([^;]*)/)?.[1] ?? '';
}

export function peekPrefetchedData(url: string) {
  if (import.meta.server) return undefined;
  const entry = entries.get(url);
  if (!entry) return undefined;
  if (
    Date.now() - entry.fetchedAt > PREFETCH_MAX_AGE_MS ||
    entry.writeToken !== currentWriteToken()
  ) {
    entries.delete(url);
    return undefined;
  }
  return entry;
}

export function takePrefetchedData(url: string) {
  const entry = peekPrefetchedData(url);
  if (entry) entries.delete(url);
  return entry;
}

export function prefetchData(url: string) {
  if (peekPrefetchedData(url)) return;
  const entry: PrefetchedEntry = {
    promise: Promise.resolve(),
    resolved: false,
    fetchedAt: Date.now(),
    writeToken: currentWriteToken(),
  };
  entry.promise = $fetch(url).then(
    (data) => {
      entry.data = data;
      entry.resolved = true;
      return data;
    },
    (error) => {
      if (entries.get(url) === entry) entries.delete(url);
      throw error;
    },
  );
  // A failed prefetch is retried by the page itself, so it needs no handler here.
  entry.promise.catch(() => {});
  entries.set(url, entry);
}
