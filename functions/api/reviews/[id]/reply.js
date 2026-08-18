import { json, unauthorized, forbidden, notFound, badRequest } from '../../../_lib/helpers.js';

export async function onRequestPost({ request, params, data, env }) {
  if (!data.account) return unauthorized();

  const review = await env.DB.prepare('SELECT * FROM reviews WHERE id = ?').bind(params.id).first();
  if (!review) return notFound();
  const company = await env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(review.company_id).first();

  if (data.account.role !== 'admin' && company.owner_id !== data.account.id) return forbidden();

  const body = await request.json().catch(() => null);
  const reply = body && body.reply ? body.reply.trim() : '';
  if (!reply) return badRequest('Nội dung phản hồi không được để trống.');

  await env.DB.prepare('UPDATE reviews SET reply = ? WHERE id = ?').bind(reply, params.id).run();
  return json({ ok: true, reply });
}
