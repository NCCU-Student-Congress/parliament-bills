import { defineEventHandler, getRequestURL, readBody } from 'h3';
import { isPermissionRole } from '../../../shared/types/auth';
import {
  createRandomToken,
  getEnv,
  getIsoDateAfterSeconds,
  getSafeRedirectPath,
  hashToken,
  isAuthBypassEnabled,
} from '../../utils/auth';
import { useD1Database } from '../../utils/d1';
import { sendLoginEmail } from '../../utils/resend';
import { verifyTurnstileToken } from '../../utils/turnstile';

const LOGIN_TOKEN_TTL_SECONDS = 60 * 10;
const LOGIN_EMAIL_COOLDOWN_SECONDS = 60;
const LOGIN_EMAILS_PER_HOUR = 5;
const BYPASS_ADMIN_INPUT = 'admin';
const DEFAULT_BYPASS_ADMIN_EMAIL = 'test@test.test';
const TURNSTILE_ACTION = 'login';

interface D1RunResult {
  meta?: {
    changes?: number;
  };
}

interface UserRow {
  id: number;
  email: string;
  permission_role: string;
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getGenericResponse() {
  return {
    sent: true,
    message: '如果此信箱具備登入權限，我們已寄出登入連結。',
  };
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const email = normalizeEmail(body?.email);

  if (!email) {
    return getGenericResponse();
  }

  const isBypassLogin = email === BYPASS_ADMIN_INPUT && isAuthBypassEnabled(event);

  // The local bypass never sends email, so it skips Turnstile; every other request must pass first.
  if (!isBypassLogin) {
    await verifyTurnstileToken(event, body?.turnstileToken, TURNSTILE_ACTION);
  }

  const db = useD1Database(event);
  let targetEmail = email;

  if (isBypassLogin) {
    targetEmail =
      normalizeEmail(getEnv(event, 'AUTH_BYPASS_ADMIN_EMAIL')) || DEFAULT_BYPASS_ADMIN_EMAIL;

    await db.batch([
      db
        .prepare(
          `INSERT INTO users (name, email, permission_role)
           VALUES (?, ?, 'secretariat_admin')
           ON CONFLICT(email) DO UPDATE SET
             permission_role = 'secretariat_admin',
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind('開發管理員', targetEmail),
      db
        .prepare(
          'DELETE FROM user_committees WHERE user_id = (SELECT id FROM users WHERE email = ?)',
        )
        .bind(targetEmail),
    ]);
  }

  const user = await db
    .prepare(
      `SELECT id, email, permission_role
       FROM users
       WHERE lower(email) = ?
       LIMIT 1`,
    )
    .bind(targetEmail)
    .first<UserRow>();

  if (!user || !isPermissionRole(user.permission_role)) {
    return getGenericResponse();
  }
  const redirectPath = getSafeRedirectPath(
    body?.redirect,
    user.permission_role === 'secretariat_admin' ? '/admin' : '/bill',
  );

  const token = createRandomToken();
  const tokenHash = await hashToken(token);
  const expiresAt = getIsoDateAfterSeconds(LOGIN_TOKEN_TTL_SECONDS);

  // The limits are checked inside the INSERT so parallel requests cannot all pass them.
  // Only tokens that expired over an hour ago are removed, so the hourly count stays intact.
  const inserted = await db.batch<D1RunResult>([
    db
      .prepare('DELETE FROM auth_login_tokens WHERE expires_at < ?')
      .bind(getIsoDateAfterSeconds(-60 * 60)),
    db
      .prepare(
        `INSERT INTO auth_login_tokens (user_id, token_hash, redirect_path, expires_at)
         SELECT ?, ?, ?, ?
         WHERE ? OR (
           NOT EXISTS (
             SELECT 1 FROM auth_login_tokens
             WHERE user_id = ? AND created_at > datetime('now', ?)
           )
           AND (
             SELECT COUNT(*) FROM auth_login_tokens
             WHERE user_id = ? AND created_at > datetime('now', '-1 hour')
           ) < ?
         )`,
      )
      .bind(
        user.id,
        tokenHash,
        redirectPath,
        expiresAt,
        isBypassLogin ? 1 : 0,
        user.id,
        `-${LOGIN_EMAIL_COOLDOWN_SECONDS} seconds`,
        user.id,
        LOGIN_EMAILS_PER_HOUR,
      ),
  ]);

  if (inserted[1]?.meta?.changes !== 1) {
    return getGenericResponse();
  }

  const origin = getRequestURL(event).origin;
  const loginUrl = `${origin}/secretariat/verify?token=${encodeURIComponent(token)}`;

  if (isBypassLogin) {
    console.info(`[auth] Bypass admin login link: ${loginUrl}`);

    return {
      sent: true,
      message: '開發登入連結已輸出到 server terminal。',
    };
  }

  await sendLoginEmail(event, {
    to: user.email,
    loginUrl,
    expiresInMinutes: LOGIN_TOKEN_TTL_SECONDS / 60,
  });

  return getGenericResponse();
});
