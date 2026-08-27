import { json, unauthorized, forbidden, notFound } from '../../_lib/helpers.js';

export async function onRequestDelete({ params, data, env }) {
  if (!data.account) return unauthorized();
  if (data.account.role !== 'admin') return forbidden('Chỉ quản trị viên được xóa tin nhắn liên hệ.');

  const row = await env.DB.prepare('SELECT id FROM contact_messages WHERE id = ?').bind(params.id).first();
  if (!row) return notFound();

  await env.DB.prepare('DELETE FROM contact_messages WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}
