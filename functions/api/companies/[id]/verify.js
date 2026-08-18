import { json, unauthorized, forbidden, notFound, companyRowToJson } from '../../../_lib/helpers.js';

export async function onRequestPost({ params, data, env }) {
  if (!data.account) return unauthorized();
  if (data.account.role !== 'admin') return forbidden('Chỉ quản trị viên được xác minh doanh nghiệp.');

  const company = await env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(params.id).first();
  if (!company) return notFound();

  const nextVerified = company.verified ? 0 : 1;
  await env.DB.prepare(`UPDATE companies SET verified = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(nextVerified, params.id).run();

  const updated = await env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(params.id).first();
  return json(companyRowToJson(updated));
}
