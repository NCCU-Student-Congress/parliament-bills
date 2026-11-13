import type { H3Event } from 'h3';
import { createError, deleteCookie, getCookie, getRequestURL, setCookie } from 'h3';
import type { PermissionRole } from '../../shared/types/auth';
import { isPermissionRole } from '../../shared/types/auth';
import { useD1Database } from './d1';

const SESSION_COOKIE = 'secretariat_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();

export interface AuthSession {
  userId: number;
  email: string;
  role: PermissionRole;
  exp: number;
}

interface CloudflareEventContext {
  env?: Record<string, unknown>;
}

export function getEnv(event: H3Event, key: string) {
  const context = event.context as { cloudflare?: CloudflareEventContext };
  const cloudflareValue = context.cloudflare?.env?.[key];
  if (typeof cloudflareValue === 'string' && cloudflareValue) return cloudflareValue;
  return process.env[key] || '';
}

function getSessionSecret(event: H3Event) {
  const secret = getEnv(event, 'AUTH_SECRET');

  if (!secret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server Misconfigured',
      message: '尚未設定 AUTH_SECRET',
    });
  }

  return secret;
}

function encodeBase64Url(value: string | ArrayBuffer) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : new Uint8Array(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function signPayload(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return encodeBase64Url(signature);
}

function signaturesMatch(actual: string, expected: string) {
  if (actual.length !== expected.length) return false;

  let diff = 0;
  for (let index = 0; index < actual.length; index += 1) {
    diff |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }

  return diff === 0;
}

function shouldUseSecureCookie(event: H3Event) {
  const url = getRequestURL(event);
  return url.protocol === 'https:';
}

export async function createAuthToken(
  event: H3Event,
  user: { id: number; email: string; role: PermissionRole },
) {
  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const payload = encodeBase64Url(JSON.stringify(session));
  const signature = await signPayload(getSessionSecret(event), payload);
  return `${payload}.${signature}`;
}

export async function readAuthSession(event: H3Event): Promise<AuthSession | null> {
  const token = getCookie(event, SESSION_COOKIE);
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = await signPayload(getSessionSecret(event), payload);
  if (!signaturesMatch(signature, expected)) return null;

  try {
    const session = JSON.parse(decodeBase64Url(payload)) as AuthSession;

    if (session.exp <= Date.now()) return null;
    if (!Number.isInteger(session.userId) || session.userId < 0) return null;
    if (typeof session.email !== 'string' || !session.email) return null;
    if (session.role !== 'legislator' && session.role !== 'secretariat_admin') return null;

    return session;
  } catch {
    return null;
  }
}

export function setAuthSessionCookie(event: H3Event, token: string) {
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(event),
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
}

export function clearAuthSessionCookie(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, {
    path: '/',
    sameSite: 'lax',
    secure: shouldUseSecureCookie(event),
  });
}

// The cookie only proves who logged in; the users row decides whether that person still has access.
export async function readCurrentSession(event: H3Event): Promise<AuthSession | null> {
  const session = await readAuthSession(event);
  if (!session) return null;

  const user = await useD1Database(event)
    .prepare('SELECT email, permission_role FROM users WHERE id = ? LIMIT 1')
    .bind(session.userId)
    .first<{ email: string; permission_role: string }>();

  if (
    !user ||
    !isPermissionRole(user.permission_role) ||
    user.email.toLowerCase() !== session.email.toLowerCase()
  ) {
    clearAuthSessionCookie(event);
    return null;
  }

  return { ...session, email: user.email, role: user.permission_role };
}

export async function requireRole(event: H3Event, roles: PermissionRole[]) {
  const session = await readCurrentSession(event);

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: '請先登入',
    });
  }

  if (!roles.includes(session.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: '權限不足',
    });
  }

  return session;
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

// The bypass only works on a local host, so a stray production setting cannot enable it.
export function isAuthBypassEnabled(event: H3Event) {
  if (!['1', 'true'].includes(getEnv(event, 'AUTH_BYPASS').toLowerCase())) return false;
  return LOCAL_HOSTNAMES.has(getRequestURL(event).hostname);
}

const REDIRECT_BASE = 'http://redirect.invalid';

export function getSafeRedirectPath(value: unknown, fallback = '/bill') {
  if (typeof value !== 'string') return fallback;
  // Browsers read a backslash as "/" and drop tabs and newlines, so "/\host" would leave the site.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;

  let url: URL;
  try {
    url = new URL(value, REDIRECT_BASE);
  } catch {
    return fallback;
  }

  if (url.origin !== REDIRECT_BASE || url.pathname.startsWith('/api/')) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function createRandomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes.buffer);
}

export async function hashToken(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return encodeBase64Url(digest);
}

export function getIsoDateAfterSeconds(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function isFutureIsoDate(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp > Date.now();
}
