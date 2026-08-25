import {
  verifyPassword, json, badRequest, unauthorized, sessionCookieHeader, createSession,
  checkLoginLock, recordFailedLogin, clearLoginAttempts,
} from '../../_lib/helpers.js';

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Dữ liệu không hợp lệ');

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!email || !password) return badRequest('Vui lòng nhập email và mật khẩu.');

  const lock = await checkLoginLock(env.DB, email);
  if (lock.locked) {
    return json({ error: `Tài khoản tạm khóa do đăng nhập sai quá nhiều lần. Thử lại sau ${lock.minutesLeft} phút.` }, 429);
  }

  const acc = await env.DB.prepare(
    'SELECT id, role, name, company, email, password_hash, password_salt FROM accounts WHERE email = ?'
  ).bind(email).first();

  if (!acc || !(await verifyPassword(password, acc.password_salt, acc.password_hash))) {
    const result = await recordFailedLogin(env.DB, email);
    if (result.lockedUntil) {
      return json({ error: 'Sai mật khẩu quá 5 lần — tài khoản tạm khóa 15 phút để bảo vệ.' }, 429);
    }
    return unauthorized('Email hoặc mật khẩu không đúng.');
  }

  await clearLoginAttempts(env.DB, email);
  const token = await createSession(env.DB, acc.id);
  return json(
    { id: acc.id, role: acc.role, name: acc.name, company: acc.company, email: acc.email },
    200,
    { 'Set-Cookie': sessionCookieHeader(token) }
  );
}
