import { json, unauthorized, forbidden } from '../../_lib/helpers.js';

export async function onRequestGet({ data, env }) {
  if (!data.account) return unauthorized();
  if (data.account.role !== 'admin') return forbidden('Chỉ quản trị viên được xem tin nhắn liên hệ.');

  const rows = await env.DB.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
  return json(rows.results.map(r => ({
    id: r.id, name: r.name, email: r.email, subject: r.subject, message: r.message,
    read: !!r.is_read, createdAt: r.created_at,
  })));
}
