import { verifyPassword, json, badRequest, unauthorized, sessionCookieHeader, createSession } from '../../_lib/helpers.js';

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Dữ liệu không hợp lệ');

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!email || !password) return badRequest('Vui lòng nhập email và mật khẩu.');

  const acc = await env.DB.prepare(
    'SELECT id, role, name, company, password_hash, password_salt FROM accounts WHERE email = ?'
  ).bind(email).first();

  if (!acc || !(await verifyPassword(password, acc.password_salt, acc.password_hash))) {
    return unauthorized('Email hoặc mật khẩu không đúng.');
  }

  const token = await createSession(env.DB, acc.id);
  return json(
    { id: acc.id, role: acc.role, name: acc.name, company: acc.company },
    200,
    { 'Set-Cookie': sessionCookieHeader(token) }
  );
}
