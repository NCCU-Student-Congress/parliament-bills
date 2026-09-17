import { createError, defineEventHandler, getQuery, sendRedirect } from 'h3';
import { isPermissionRole } from '../../../../shared/types/auth';
import {
  createAuthToken,
  getSafeRedirectPath,
  hashToken,
  isFutureIsoDate,
  setAuthSessionCookie,
} from '../../../utils/auth';
import { useD1Database } from '../../../utils/d1';

interface LoginTokenRow {
  id: number;
  user_id: number;
  email: string;
  redirect_path: string | null;
  expires_at: string;
  consumed_at: string | null;
  user_email: string;
  permission_role: string;
}

interface D1RunResult {
  meta?: {
    changes?: number;
  };
}

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token;

  if (typeof token !== 'string' || !token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: '登入連結不正確',
    });
  }

  const db = useD1Database(event);
  const tokenHash = await hashToken(token);
  const row = await db
    .prepare(
      `SELECT
         auth_login_tokens.id,
         auth_login_tokens.user_id,
         auth_login_tokens.email,
         auth_login_tokens.redirect_path,
         auth_login_tokens.expires_at,
         auth_login_tokens.consumed_at,
         users.email AS user_email,
         users.permission_role
       FROM auth_login_tokens
       INNER JOIN users ON users.id = auth_login_tokens.user_id
       WHERE auth_login_tokens.token_hash = ?
       LIMIT 1`,
    )
    .bind(tokenHash)
    .first<LoginTokenRow>();

  if (
    !row ||
    row.consumed_at ||
    !isFutureIsoDate(row.expires_at) ||
    !isPermissionRole(row.permission_role)
  ) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: '登入連結已失效，請重新申請',
    });
  }

  const consumeResult = await db
    .prepare(
      `UPDATE auth_login_tokens
       SET consumed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND consumed_at IS NULL`,
    )
    .bind(row.id)
    .run<D1RunResult>();

  if (consumeResult?.meta?.changes !== 1) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: '登入連結已失效，請重新申請',
    });
  }

  const authToken = await createAuthToken(event, {
    id: row.user_id,
    email: row.user_email,
    role: row.permission_role,
  });
  setAuthSessionCookie(event, authToken);

  return sendRedirect(event, getSafeRedirectPath(row.redirect_path), 302);
});
