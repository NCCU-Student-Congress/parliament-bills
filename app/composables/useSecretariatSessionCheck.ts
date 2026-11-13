import type { PermissionRole } from '~~/shared/types/auth';

export interface SecretariatSessionResponse {
  authenticated: boolean;
  userId?: number;
  name?: string;
  email?: string;
  role?: PermissionRole;
}

// The latest session check in this browser tab. The header refreshes it on every page and the
// login middlewares fill it on the server, so pages can show who is logged in and middlewares can
// reuse a recent check instead of waiting for another one.
export const useSecretariatSessionCheck = () =>
  useState<{ session: SecretariatSessionResponse; checkedAt: number } | null>(
    'secretariat-session-check',
    () => null,
  );

// A check from the server render carries checkedAt 0: good for display, but the first client
// navigation still checks again because the two clocks may differ.
export function toSessionCheck(session: SecretariatSessionResponse) {
  return session.authenticated ? { session, checkedAt: import.meta.client ? Date.now() : 0 } : null;
}

const SESSION_CHECK_MAX_AGE_MS = 60 * 1000;

// Every protected API checks the session itself; the middlewares only send people to the right
// page, so a check from the last minute is good enough. Logging in or out reloads the whole page.
export async function getRecentSessionCheck() {
  // Take the state before awaiting: the Nuxt context is not kept across an await on the server.
  const state = useSecretariatSessionCheck();
  const lastCheck = state.value;
  if (
    import.meta.client &&
    lastCheck &&
    Date.now() - lastCheck.checkedAt < SESSION_CHECK_MAX_AGE_MS
  ) {
    return lastCheck.session;
  }

  const session = await (
    import.meta.server
      ? useRequestFetch()<SecretariatSessionResponse>('/api/secretariat/session')
      : $fetch<SecretariatSessionResponse>('/api/secretariat/session')
  ).catch((): SecretariatSessionResponse => ({ authenticated: false }));
  state.value = toSessionCheck(session);
  return session;
}
