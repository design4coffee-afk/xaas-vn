import { json, badRequest, hashPassword, randomHex, consumePasswordReset, deletePasswordReset } from '../../_lib/helpers.js';

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Dữ liệu không hợp lệ');

  const token = body.token;
  const newPassword = body.newPassword || '';
  if (!token) return badRequest('Thiếu mã đặt lại mật khẩu.');
  if (newPassword.length < 6) return badRequest('Mật khẩu mới cần tối thiểu 6 ký tự.');

  const accountId = await consumePasswordReset(env.DB, token);
  if (!accountId) return badRequest('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');

  const salt = randomHex(16);
  const hash = await hashPassword(newPassword, salt);
  await env.DB.prepare('UPDATE accounts SET password_hash = ?, password_salt = ? WHERE id = ?')
    .bind(hash, salt, accountId).run();

  // Token is single-use; invalidate it and log out any existing sessions for safety.
  await deletePasswordReset(env.DB, token);
  await env.DB.prepare('DELETE FROM sessions WHERE account_id = ?').bind(accountId).run();

  return json({ ok: true, message: 'Đã đặt lại mật khẩu — vui lòng đăng nhập lại.' });
}
