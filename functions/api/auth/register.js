import { hashPassword, randomHex, json, badRequest, sessionCookieHeader, createSession } from '../../_lib/helpers.js';

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Dữ liệu không hợp lệ');

  const name = (body.name || '').trim();
  const company = (body.company || '').trim() || null;
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!name || !email || !password) return badRequest('Vui lòng điền đầy đủ họ tên, email và mật khẩu.');
  if (password.length < 6) return badRequest('Mật khẩu cần tối thiểu 6 ký tự.');

  const existing = await env.DB.prepare('SELECT id FROM accounts WHERE email = ?').bind(email).first();
  if (existing) return badRequest('Email này đã được đăng ký.');

  const id = 'u' + randomHex(8);
  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);

  await env.DB.prepare(
    'INSERT INTO accounts (id, role, name, company, email, password_hash, password_salt) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, 'user', name, company, email, hash, salt).run();

  const token = await createSession(env.DB, id);
  return json(
    { id, role: 'user', name, company },
    201,
    { 'Set-Cookie': sessionCookieHeader(token) }
  );
}
