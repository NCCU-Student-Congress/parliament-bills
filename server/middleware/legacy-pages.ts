import { defineEventHandler, getRequestURL, sendRedirect } from 'h3';

// Keep bookmarked pages and already-sent magic links working after the route rename.
export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  const path = url.pathname.replace(/\/$/, '') || '/';

  let destination: string | undefined;
  if (path === '/secretariat/login') destination = '/login';
  else if (path === '/secretariat/verify') destination = '/login/verify';
  else if (path === '/bill') destination = '/sessions';
  else if (path === '/bill/new') destination = '/proposals/new';
  else {
    const proposal = path.match(/^\/bill\/proposal\/([^/]+)$/);
    const meeting = path.match(/^\/bill\/([^/]+)\/meetings\/([^/]+)$/);
    const session = path.match(/^\/bill\/([^/]+)$/);

    if (proposal) destination = `/proposals/${proposal[1]}`;
    else if (meeting) destination = `/sessions/${meeting[1]}/meetings/${meeting[2]}`;
    else if (session) destination = `/sessions/${session[1]}`;
  }

  if (destination) return sendRedirect(event, `${destination}${url.search}`, 308);
});
