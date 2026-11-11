import type { H3Event } from 'h3';
import { createError } from 'h3';
import { getEnv } from './auth';

interface SendLoginEmailOptions {
  to: string;
  loginUrl: string;
  expiresInMinutes: number;
}

const DEFAULT_FROM_EMAIL = 'bill@notify.nccusc.org';
const DEFAULT_FROM_NAME = '政大學生議會議案系統';

function getFromAddress(event: H3Event) {
  const email = getEnv(event, 'RESEND_FROM_EMAIL') || DEFAULT_FROM_EMAIL;
  const name = getEnv(event, 'RESEND_FROM_NAME') || DEFAULT_FROM_NAME;
  return `${name} <${email}>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendLoginEmail(event: H3Event, options: SendLoginEmailOptions) {
  const apiKey = getEnv(event, 'RESEND_API_KEY');

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server Misconfigured',
      message: '尚未設定 RESEND_API_KEY',
    });
  }

  const safeLoginUrl = escapeHtml(options.loginUrl);
  const subject = '議案系統登入連結';
  const text = [
    '請使用以下連結登入議案系統：',
    options.loginUrl,
    '',
    `此連結將於 ${options.expiresInMinutes} 分鐘後失效，且只能使用一次。`,
    '如果你沒有要求登入，請忽略這封信。',
  ].join('\n');
  const html = [
    '<p>請使用以下連結登入議案系統：</p>',
    `<p><a href="${safeLoginUrl}">登入議案系統</a></p>`,
    `<p>此連結將於 ${options.expiresInMinutes} 分鐘後失效，且只能使用一次。</p>`,
    '<p>如果你沒有要求登入，請忽略這封信。</p>',
  ].join('');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `login/${options.to}/${Date.now()}`,
      'User-Agent': 'parliament-bills/1.0',
    },
    body: JSON.stringify({
      from: getFromAddress(event),
      to: [options.to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const resendError = (await response.json().catch(() => null)) as {
      name?: unknown;
      message?: unknown;
    } | null;
    console.error('[resend] 登入信寄送失敗', {
      status: response.status,
      code: typeof resendError?.name === 'string' ? resendError.name : 'unknown',
      message: typeof resendError?.message === 'string' ? resendError.message : response.statusText,
    });

    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: '驗證信寄送失敗，請稍後再試',
    });
  }
}
