import { json, unauthorized, forbidden, notFound, badRequest, companyRowToJson } from '../../_lib/helpers.js';

async function loadCompany(env, id) {
  return env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(id).first();
}
function canAccess(account, company) {
  return account.role === 'admin' || company.owner_id === account.id;
}

export async function onRequestGet({ params, data, env }) {
  if (!data.account) return unauthorized();
  const company = await loadCompany(env, params.id);
  if (!company) return notFound();
  if (!canAccess(data.account, company)) return forbidden();
  return json(companyRowToJson(company));
}

// PUT — edit name/category/website/description (+ status/verified for admin).
// A non-admin owner editing their own listing always resets status to
// 'draft' or 'pending' (never straight to 'published') — mirrors the
// "gửi duyệt" workflow from the dashboard.
export async function onRequestPut({ request, params, data, env }) {
  if (!data.account) return unauthorized();
  const company = await loadCompany(env, params.id);
  if (!company) return notFound();
  if (!canAccess(data.account, company)) return forbidden();

  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Dữ liệu không hợp lệ');

  const name = (body.name || company.name).trim();
  const cat = ['iaas', 'paas', 'saas', 'ai'].includes(body.cat) ? body.cat : company.category_id;
  const website = body.website !== undefined ? body.website.trim() : company.website;
  const desc = body.desc !== undefined ? body.desc.trim() : company.description;

  let status = company.status;
  let reason = company.reason;
  let verified = !!company.verified;

  if (data.account.role === 'admin') {
    if (body.status && ['draft', 'pending', 'published', 'rejected', 'hidden'].includes(body.status)) status = body.status;
    if (typeof body.verified === 'boolean') verified = body.verified;
    if (body.reason !== undefined) reason = body.reason;
  } else if (body.status === 'draft' || body.status === 'pending') {
    status = body.status;
    reason = null; // resubmitting clears any prior rejection reason
  }

  await env.DB.prepare(
    `UPDATE companies SET name=?, category_id=?, website=?, description=?, status=?, reason=?, verified=?, updated_at=datetime('now')
     WHERE id=?`
  ).bind(name, cat, website, desc, status, reason, verified ? 1 : 0, params.id).run();

  const updated = await loadCompany(env, params.id);
  return json(companyRowToJson(updated));
}

export async function onRequestDelete({ params, data, env }) {
  if (!data.account) return unauthorized();
  if (data.account.role !== 'admin') return forbidden('Chỉ quản trị viên được xóa doanh nghiệp.');
  const company = await loadCompany(env, params.id);
  if (!company) return notFound();
  await env.DB.prepare('DELETE FROM companies WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}
