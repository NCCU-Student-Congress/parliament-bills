import type { H3Event } from 'h3';
import { createError, getCookie, setCookie } from 'h3';
import type { PermissionRole } from '../../shared/types/auth';

const SESSION_COOKIE = 'secretariat_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();

interface AuthSession {
  role: PermissionRole;
  exp: number;
}

interface CloudflareEventContext {
  env?: Record<string, unknown>;
}

function getEnv(event: H3Event, key: string) {
  const context = event.context as { cloudflare?: CloudflareEventContext };
  const cloudflareValue = context.cloudflare?.env?.[key];
  if (typeof cloudflareValue === 'string' && cloudflareValue) return cloudflareValue;
  return process.env[key] || '';
}

function getSessionSecret(event: H3Event) {
  const secret = getEnv(event, 'AUTH_SECRET') || getEnv(event, 'SEC_PASSWORD');

  if (!secret) {
    throw createError({
      statusCode: 500,
      statusMessage: '尚未設定 AUTH_SECRET 或 SEC_PASSWORD',
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

export async function createAuthToken(event: H3Event, role: PermissionRole) {
  const session: AuthSession = {
    role,
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
    secure: getEnv(event, 'NODE_ENV') === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
}

export async function requireRole(event: H3Event, roles: PermissionRole[]) {
  const session = await readAuthSession(event);

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' });
  }

  if (!roles.includes(session.role)) {
    throw createError({ statusCode: 403, statusMessage: '權限不足' });
  }

  return session;
}

export function getSecretariatPassword(event: H3Event) {
  const password = getEnv(event, 'SEC_PASSWORD');

  if (!password) {
    throw createError({ statusCode: 500, statusMessage: '尚未設定 SEC_PASSWORD' });
  }

  return password;
}
