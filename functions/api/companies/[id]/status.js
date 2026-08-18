import { json, unauthorized, forbidden, notFound, badRequest, companyRowToJson } from '../../../_lib/helpers.js';

export async function onRequestPost({ request, params, data, env }) {
  if (!data.account) return unauthorized();
  if (data.account.role !== 'admin') return forbidden('Chỉ quản trị viên được duyệt doanh nghiệp.');

  const company = await env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(params.id).first();
  if (!company) return notFound();

  const body = await request.json().catch(() => null);
  const status = body && body.status;
  if (!['draft', 'pending', 'published', 'rejected', 'hidden'].includes(status)) {
    return badRequest('Trạng thái không hợp lệ.');
  }
  const reason = status === 'rejected' ? (body.reason || null) : null;

  await env.DB.prepare(
    `UPDATE companies SET status = ?, reason = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(status, reason, params.id).run();

  const updated = await env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(params.id).first();
  return json(companyRowToJson(updated));
}
