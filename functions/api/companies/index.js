import { json, unauthorized, badRequest, companyRowToJson } from '../../_lib/helpers.js';

// GET /api/companies
// - admin: sees every company
// - user:  sees only companies they own
export async function onRequestGet({ data, env }) {
  if (!data.account) return unauthorized();

  const rows = data.account.role === 'admin'
    ? await env.DB.prepare('SELECT * FROM companies ORDER BY updated_at DESC').all()
    : await env.DB.prepare('SELECT * FROM companies WHERE owner_id = ? ORDER BY updated_at DESC')
        .bind(data.account.id).all();

  return json(rows.results.map(companyRowToJson));
}

// POST /api/companies — create a new listing
// - user:  status forced to 'draft' or 'pending' (whatever the client asked for), owner = self
// - admin: may set any status directly, owner defaults to 'admin' unless provided
export async function onRequestPost({ request, data, env }) {
  if (!data.account) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body || !body.name) return badRequest('Thiếu tên doanh nghiệp.');

  const name = body.name.trim();
  const cat = ['iaas', 'paas', 'saas', 'ai'].includes(body.cat) ? body.cat : 'saas';
  const website = (body.website || '').trim();
  const desc = (body.desc || '').trim();
  const mark = name.slice(0, 2).toUpperCase();

  let status, owner;
  if (data.account.role === 'admin') {
    status = ['draft', 'pending', 'published', 'rejected', 'hidden'].includes(body.status) ? body.status : 'pending';
    owner = body.owner || 'admin';
  } else {
    status = body.status === 'draft' ? 'draft' : 'pending';
    owner = data.account.id;
  }

  const result = await env.DB.prepare(
    `INSERT INTO companies (name, mark, category_id, status, verified, rating, website, description, owner_id, updated_at)
     VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, datetime('now'))`
  ).bind(name, mark, cat, status, website, desc, owner).run();

  const row = await env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(result.meta.last_row_id).first();
  return json(companyRowToJson(row), 201);
}
