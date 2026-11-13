import { defineNuxtRouteMiddleware, navigateTo } from '#app';

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Switching admin tabs only changes the query, so it never waits on a session round trip.
  if (process.client && to.path === from.path) return;

  const session = await getRecentSessionCheck();

  if (!session.authenticated) {
    return navigateTo({ path: '/secretariat/login', query: { redirect: to.fullPath } });
  }

  if (session.role !== 'secretariat_admin') {
    return navigateTo('/bill');
  }
});
