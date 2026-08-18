import { json, companyRowToJson } from '../../../_lib/helpers.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const cat = url.searchParams.get('cat');
  const search = (url.searchParams.get('search') || '').trim();
  const sort = url.searchParams.get('sort') || 'rating'; // rating | new
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 100);

  let sql = `SELECT * FROM companies WHERE status = 'published'`;
  const binds = [];
  if (cat) { sql += ` AND category_id = ?`; binds.push(cat); }
  if (search) { sql += ` AND name LIKE ?`; binds.push(`%${search}%`); }
  sql += sort === 'new' ? ` ORDER BY updated_at DESC` : ` ORDER BY rating DESC`;
  sql += ` LIMIT ?`; binds.push(limit);

  const rows = await env.DB.prepare(sql).bind(...binds).all();
  return json(rows.results.map(companyRowToJson));
}
