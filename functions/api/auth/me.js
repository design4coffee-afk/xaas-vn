import { json, unauthorized, badRequest, hashPassword, verifyPassword } from '../../_lib/helpers.js';

export async function onRequestGet({ data }) {
  if (!data.account) return unauthorized();
  return json(data.account);
}

// PUT /api/auth/me — update own name / email / password.
// Changing email or password requires the correct currentPassword.
export async function onRequestPut({ request, data, env }) {
  if (!data.account) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Dữ liệu không hợp lệ');

  const acc = await env.DB.prepare(
    'SELECT id, role, name, company, email, password_hash, password_salt FROM accounts WHERE id = ?'
  ).bind(data.account.id).first();
  if (!acc) return unauthorized();

  const wantsEmailChange = body.email && body.email.trim().toLowerCase() !== acc.email.toLowerCase();
  const wantsPasswordChange = !!body.newPassword;

  if (wantsEmailChange || wantsPasswordChange) {
    if (!body.currentPassword || !(await verifyPassword(body.currentPassword, acc.password_salt, acc.password_hash))) {
      return badRequest('Mật khẩu hiện tại không đúng.');
    }
  }

  const name = body.name !== undefined ? body.name.trim() : acc.name;
  let email = acc.email;
  if (wantsEmailChange) {
    email = body.email.trim().toLowerCase();
    const clash = await env.DB.prepare('SELECT id FROM accounts WHERE email = ? AND id != ?').bind(email, acc.id).first();
    if (clash) return badRequest('Email này đã được dùng bởi tài khoản khác.');
  }

  let passwordHash = acc.password_hash;
  let passwordSalt = acc.password_salt;
  if (wantsPasswordChange) {
    if (body.newPassword.length < 6) return badRequest('Mật khẩu mới cần tối thiểu 6 ký tự.');
    passwordSalt = crypto.randomUUID().replace(/-/g, '');
    passwordHash = await hashPassword(body.newPassword, passwordSalt);
  }

  await env.DB.prepare(
    'UPDATE accounts SET name = ?, email = ?, password_hash = ?, password_salt = ? WHERE id = ?'
  ).bind(name, email, passwordHash, passwordSalt, acc.id).run();

  return json({ id: acc.id, role: acc.role, name, company: acc.company, email });
}
