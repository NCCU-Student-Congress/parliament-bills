export interface SecretariatSessionResponse {
  authenticated: boolean;
  role?: string;
}

// The latest session check in this browser tab. The header refreshes it on every page, so the
// secretariat middleware can reuse it instead of making the admin page wait for another check.
export const useSecretariatSessionCheck = () =>
  useState<{ session: SecretariatSessionResponse; checkedAt: number } | null>(
    'secretariat-session-check',
    () => null,
  );
