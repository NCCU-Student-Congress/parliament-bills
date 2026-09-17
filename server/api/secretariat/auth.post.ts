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

const LOGIN_TOKEN_TTL_SECONDS = 60 * 10;
const BYPASS_ADMIN_INPUT = 'admin';
const DEFAULT_BYPASS_ADMIN_EMAIL = 'test@test.test';

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
  const redirectPath = getSafeRedirectPath(body?.redirect);

  if (!email) {
    return getGenericResponse();
  }

  const db = useD1Database(event);
  let targetEmail = email;

  if (email === BYPASS_ADMIN_INPUT && isAuthBypassEnabled(event)) {
    targetEmail =
      normalizeEmail(getEnv(event, 'AUTH_BYPASS_ADMIN_EMAIL')) || DEFAULT_BYPASS_ADMIN_EMAIL;

    await db
      .prepare(
        `INSERT INTO users (name, email, permission_role, committee_ids)
         VALUES (?, ?, 'secretariat_admin', '[]')
         ON CONFLICT(email) DO UPDATE SET
           permission_role = 'secretariat_admin',
           committee_ids = '[]',
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind('開發管理員', targetEmail)
      .run();
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

  const sessionUser = {
    id: user.id,
    email: user.email,
    role: user.permission_role,
  };

  const token = createRandomToken();
  const tokenHash = await hashToken(token);
  const expiresAt = getIsoDateAfterSeconds(LOGIN_TOKEN_TTL_SECONDS);

  await db
    .prepare(
      `INSERT INTO auth_login_tokens (user_id, email, token_hash, redirect_path, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(user.id, user.email, tokenHash, redirectPath, expiresAt)
    .run();

  const origin = getRequestURL(event).origin;
  const loginUrl = `${origin}/api/secretariat/auth/verify?token=${encodeURIComponent(token)}`;

  if (email === BYPASS_ADMIN_INPUT && isAuthBypassEnabled(event)) {
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
