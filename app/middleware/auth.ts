// middleware/auth.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app';

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) {
    const session = await useRequestFetch()<{
      authenticated: boolean;
    }>('/api/secretariat/session').catch(() => ({ authenticated: false }));

    if (!session.authenticated) {
      return navigateTo({ path: '/secretariat/login', query: { redirect: to.fullPath } });
    }

    return;
  }

  if (process.client) {
    const isAuthenticated = sessionStorage.getItem('secretariat_authenticated') === 'true';

    if (isAuthenticated) {
      return;
    }

    const session = await $fetch<{ authenticated: boolean }>('/api/secretariat/session').catch(
      () => ({ authenticated: false }),
    );

    if (session.authenticated) {
      sessionStorage.setItem('secretariat_authenticated', 'true');
      return;
    }

    return navigateTo({ path: '/secretariat/login', query: { redirect: to.fullPath } });
  }
});
