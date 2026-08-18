import { json, unauthorized } from '../../_lib/helpers.js';

export async function onRequestGet({ data, env }) {
  if (!data.account) return unauthorized();

  const sql = data.account.role === 'admin'
    ? `SELECT r.*, c.name AS company_name, c.mark AS company_mark, c.category_id AS company_cat
       FROM reviews r JOIN companies c ON c.id = r.company_id
       ORDER BY r.created_at DESC`
    : `SELECT r.*, c.name AS company_name, c.mark AS company_mark, c.category_id AS company_cat
       FROM reviews r JOIN companies c ON c.id = r.company_id
       WHERE c.owner_id = ?
       ORDER BY r.created_at DESC`;

  const stmt = data.account.role === 'admin' ? env.DB.prepare(sql) : env.DB.prepare(sql).bind(data.account.id);
  const rows = await stmt.all();

  return json(rows.results.map(r => ({
    id: r.id, coId: r.company_id, co: r.company_name, mark: r.company_mark, cat: r.company_cat,
    user: r.user_name, rating: r.rating, text: r.text, status: r.status, reply: r.reply,
  })));
}
