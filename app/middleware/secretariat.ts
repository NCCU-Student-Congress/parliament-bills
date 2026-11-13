import { defineNuxtRouteMiddleware, navigateTo } from '#app';

// Every admin API checks the session itself; this check only sends people to the right page, so a
// result from the last minute is good enough. Logging in or out reloads the whole page.
const SESSION_CHECK_MAX_AGE_MS = 60 * 1000;

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Switching admin tabs only changes the query, so it never waits on a session round trip.
  if (process.client && to.path === from.path) return;

  const lastCheck = useSecretariatSessionCheck();
  let session =
    process.client &&
    lastCheck.value &&
    Date.now() - lastCheck.value.checkedAt < SESSION_CHECK_MAX_AGE_MS
      ? lastCheck.value.session
      : null;

  if (!session) {
    session = await (
      process.server
        ? useRequestFetch()<SecretariatSessionResponse>('/api/secretariat/session')
        : $fetch<SecretariatSessionResponse>('/api/secretariat/session')
    ).catch(() => ({ authenticated: false }));
    if (process.client && session.authenticated) {
      lastCheck.value = { session, checkedAt: Date.now() };
    }
  }

  if (!session.authenticated) {
    return navigateTo({ path: '/secretariat/login', query: { redirect: to.fullPath } });
  }

  if (session.role !== 'secretariat_admin') {
    return navigateTo('/bill');
  }
});
