// One-time setup endpoint: creates the first admin account.
// Protected by the ADMIN_BOOTSTRAP_SECRET env var (set via
// `wrangler pages secret put ADMIN_BOOTSTRAP_SECRET`), and refuses
// to run again once any admin account already exists.
import { hashPassword, randomHex, json, badRequest, forbidden } from '../../_lib/helpers.js';

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Dữ liệu không hợp lệ');

  if (!env.ADMIN_BOOTSTRAP_SECRET || body.secret !== env.ADMIN_BOOTSTRAP_SECRET) {
    return forbidden('Sai mã bootstrap.');
  }

  const alreadyAdmin = await env.DB.prepare("SELECT id FROM accounts WHERE role = 'admin' LIMIT 1").first();
  if (alreadyAdmin) return forbidden('Đã tồn tại tài khoản quản trị viên — endpoint này chỉ dùng một lần.');

  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!name || !email || password.length < 6) return badRequest('Thiếu thông tin hoặc mật khẩu quá ngắn.');

  const id = 'admin_' + randomHex(6);
  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);

  await env.DB.prepare(
    'INSERT INTO accounts (id, role, name, email, password_hash, password_salt) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, 'admin', name, email, hash, salt).run();

  return json({ ok: true, id, email });
}
