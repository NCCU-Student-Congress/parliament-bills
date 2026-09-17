// server/api/secretariat/auth.post.ts
import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { createAuthToken, getSecretariatPassword, setAuthSessionCookie } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  // 從請求體中讀取客戶端提交的密碼
  const { password } = await readBody(event);

  // 從環境變數中獲取正確的密碼
  const correctPassword = getSecretariatPassword(event);

  // 進行密碼比對
  if (password === correctPassword) {
    const token = await createAuthToken(event, 'secretariat_admin');
    setAuthSessionCookie(event, token);

    // 密碼正確，回傳成功狀態
    return { authenticated: true, role: 'secretariat_admin', message: '驗證成功！' };
  }

  // 密碼錯誤，回傳失敗狀態
  // 為了安全，不應該明確指出是密碼錯誤，可以回傳通用錯誤訊息
  setResponseStatus(event, 401);
  return { authenticated: false, message: '驗證失敗，請檢查密碼。' };
});
