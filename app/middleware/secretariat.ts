import { defineNuxtRouteMiddleware, navigateTo } from '#app';

interface SessionResponse {
  authenticated: boolean;
  role?: string;
}

export default defineNuxtRouteMiddleware(async (to) => {
  const session: SessionResponse = await (
    process.server
      ? useRequestFetch()<SessionResponse>('/api/secretariat/session')
      : $fetch<SessionResponse>('/api/secretariat/session')
  ).catch(() => ({ authenticated: false }));

  if (!session.authenticated) {
    return navigateTo({ path: '/secretariat/login', query: { redirect: to.fullPath } });
  }

  if (session.role !== 'secretariat_admin') {
    return navigateTo('/bill');
  }
});
