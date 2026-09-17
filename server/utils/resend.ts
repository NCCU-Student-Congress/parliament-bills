import type { H3Event } from 'h3';
import { createError } from 'h3';
import { getEnv } from './auth';

interface SendLoginEmailOptions {
  to: string;
  loginUrl: string;
  expiresInMinutes: number;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getFromAddress(event: H3Event) {
  const email = getEnv(event, 'RESEND_FROM_EMAIL');
  const name = getEnv(event, 'RESEND_FROM_NAME');

  if (!email) {
    throw createError({ statusCode: 500, statusMessage: '尚未設定 RESEND_FROM_EMAIL' });
  }

  return name ? `${name} <${email}>` : email;
}

export async function sendLoginEmail(event: H3Event, options: SendLoginEmailOptions) {
  const apiKey = getEnv(event, 'RESEND_API_KEY');

  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: '尚未設定 RESEND_API_KEY' });
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
    throw createError({
      statusCode: 502,
      statusMessage: '驗證信寄送失敗，請稍後再試',
    });
  }
}
