// middleware/auth.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app';

export default defineNuxtRouteMiddleware(async (to) => {
  const session = await getRecentSessionCheck();

  if (process.client) {
    if (session.authenticated) sessionStorage.setItem('secretariat_authenticated', 'true');
    else sessionStorage.removeItem('secretariat_authenticated');
  }

  if (!session.authenticated) {
    return navigateTo({ path: '/secretariat/login', query: { redirect: to.fullPath } });
  }
});
