import { parseTermCode } from '~~/shared/utils/term';

// The API calls each public page makes on load, so they can start while its link is only visible.
function apiUrlsForPage(pathname: string): string[] {
  if (pathname === '/bill') return ['/api/meetings/scheduled'];

  const meeting = pathname.match(/^\/bill\/([^/]+)\/meetings\/(\d+)$/);
  if (meeting) {
    const term = parseTermCode(meeting[1]);
    const id = Number(meeting[2]);
    if (!term || !id) return [];
    return [
      `/api/meetings/scheduled?session=${term}`,
      `/api/meetings/${id}/proposals`,
      `/api/meetings/${id}/agenda`,
    ];
  }

  const proposal = pathname.match(/^\/bill\/proposal\/(\d+)$/);
  if (proposal) {
    const id = Number.parseInt(proposal[1]!, 10);
    return id ? [`/api/proposals/${id}`] : [];
  }

  const session = pathname.match(/^\/bill\/([^/]+)$/);
  if (session) {
    const term = parseTermCode(session[1]);
    return term ? [`/api/meetings/scheduled?session=${term}`] : [];
  }

  return [];
}

// Session and committee names, which useSessions and useCommittees keep for the whole tab.
function referenceDataForPage(pathname: string): Record<string, string> {
  if (pathname.startsWith('/bill/proposal/') || pathname === '/bill/new') {
    return { sessions: '/api/sessions', committees: '/api/committees' };
  }
  if (pathname === '/bill' || /^\/bill\/[^/]+$/.test(pathname)) {
    return { sessions: '/api/sessions' };
  }
  return {};
}

export default defineNuxtPlugin((nuxtApp) => {
  const referenceRequests = new Set<string>();

  nuxtApp.hook('link:prefetch', (link) => {
    const { pathname } = new URL(link, window.location.origin);
    for (const url of apiUrlsForPage(pathname)) prefetchData(url);

    for (const [key, url] of Object.entries(referenceDataForPage(pathname))) {
      if (nuxtApp.payload.data[key] || referenceRequests.has(key)) continue;
      referenceRequests.add(key);
      $fetch(url)
        .then((data) => {
          nuxtApp.payload.data[key] ??= data;
        })
        .catch(() => {})
        .finally(() => referenceRequests.delete(key));
    }
  });
});
