import { json, unauthorized, forbidden, notFound } from '../../../_lib/helpers.js';

export async function onRequestPost({ params, data, env }) {
  if (!data.account) return unauthorized();
  if (data.account.role !== 'admin') return forbidden('Chỉ quản trị viên được thao tác tin nhắn liên hệ.');

  const row = await env.DB.prepare('SELECT id, is_read FROM contact_messages WHERE id = ?').bind(params.id).first();
  if (!row) return notFound();

  const nextRead = row.is_read ? 0 : 1;
  await env.DB.prepare('UPDATE contact_messages SET is_read = ? WHERE id = ?').bind(nextRead, params.id).run();
  return json({ ok: true, read: !!nextRead });
}
