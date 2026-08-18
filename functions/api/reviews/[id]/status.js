import { json, unauthorized, forbidden, notFound, badRequest } from '../../../_lib/helpers.js';

export async function onRequestPost({ request, params, data, env }) {
  if (!data.account) return unauthorized();
  if (data.account.role !== 'admin') return forbidden('Chỉ quản trị viên được kiểm duyệt đánh giá.');

  const review = await env.DB.prepare('SELECT * FROM reviews WHERE id = ?').bind(params.id).first();
  if (!review) return notFound();

  const body = await request.json().catch(() => null);
  const status = body && body.status;
  if (!['published', 'pending', 'hidden'].includes(status)) return badRequest('Trạng thái không hợp lệ.');

  await env.DB.prepare('UPDATE reviews SET status = ? WHERE id = ?').bind(status, params.id).run();
  return json({ ok: true, status });
}
