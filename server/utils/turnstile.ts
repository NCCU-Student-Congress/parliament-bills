import type { H3Event } from 'h3';
import { createError, getRequestHeader, getRequestURL } from 'h3';
import { getEnv } from './auth';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SITEVERIFY_TIMEOUT_MS = 10_000;
const MAX_TOKEN_LENGTH = 2048;
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

interface SiteverifyResult {
  success?: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
  metadata?: {
    result_with_testing_key?: boolean;
  };
}

function rejectVerification(): never {
  throw createError({
    statusCode: 403,
    statusMessage: 'Forbidden',
    message: '人機驗證未通過，請重新驗證後再試一次。',
  });
}

// TURNSTILE_HOSTNAMES lists the frontend hostnames allowed to mint tokens. Without it, only the
// hostname that received this request is allowed, because the form posts to its own origin.
function getExpectedHostnames(event: H3Event) {
  const hostnames = getEnv(event, 'TURNSTILE_HOSTNAMES')
    .split(',')
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);

  return new Set(hostnames.length ? hostnames : [getRequestURL(event).hostname]);
}

export async function verifyTurnstileToken(event: H3Event, token: unknown, expectedAction: string) {
  const secret = getEnv(event, 'TURNSTILE_SECRET');

  if (!secret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server Misconfigured',
      message: '尚未設定 TURNSTILE_SECRET',
    });
  }

  if (typeof token !== 'string' || !token || token.length > MAX_TOKEN_LENGTH) {
    rejectVerification();
  }

  const body = new URLSearchParams({ secret, response: token });
  const remoteIp = getRequestHeader(event, 'cf-connecting-ip');
  if (remoteIp) body.set('remoteip', remoteIp);

  let result: SiteverifyResult;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
      body,
    });
    if (!response.ok) throw new Error(`siteverify ${response.status}`);
    result = (await response.json()) as SiteverifyResult;
  } catch (error) {
    console.error('[turnstile] siteverify request failed:', error);
    rejectVerification();
  }

  if (result.success !== true) {
    rejectVerification();
  }

  // Cloudflare's test secrets return no action and hostname "example.com". Accept them only on a
  // local host so a test secret set in production never lets requests through.
  if (result.metadata?.result_with_testing_key) {
    if (!LOCAL_HOSTNAMES.has(getRequestURL(event).hostname)) rejectVerification();
    return;
  }

  if (
    result.action !== expectedAction ||
    !getExpectedHostnames(event).has(result.hostname?.toLowerCase() ?? '')
  ) {
    rejectVerification();
  }
}
