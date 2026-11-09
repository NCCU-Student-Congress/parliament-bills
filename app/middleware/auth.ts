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
    const session = await $fetch<{ authenticated: boolean }>('/api/secretariat/session').catch(
      () => ({ authenticated: false }),
    );

    if (session.authenticated) {
      sessionStorage.setItem('secretariat_authenticated', 'true');
      return;
    }

    sessionStorage.removeItem('secretariat_authenticated');
    return navigateTo({ path: '/secretariat/login', query: { redirect: to.fullPath } });
  }
});
