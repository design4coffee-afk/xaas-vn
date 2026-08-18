import { json, notFound, companyRowToJson } from '../../../_lib/helpers.js';

export async function onRequestGet({ params, env }) {
  const company = await env.DB.prepare(
    `SELECT * FROM companies WHERE id = ? AND status = 'published'`
  ).bind(params.id).first();
  if (!company) return notFound('Không tìm thấy doanh nghiệp hoặc chưa được duyệt.');

  const products = await env.DB.prepare('SELECT * FROM products WHERE company_id = ?').bind(params.id).all();
  const productList = [];
  for (const p of products.results) {
    const tiers = await env.DB.prepare('SELECT * FROM pricing_tiers WHERE product_id = ? ORDER BY sort_order')
      .bind(p.id).all();
    productList.push({
      id: p.id, name: p.name, from: p.from_price,
      tiers: tiers.results.map(t => ({ id: t.id, name: t.name, price: t.price })),
    });
  }

  const reviews = await env.DB.prepare(
    `SELECT id, user_name, rating, text, reply FROM reviews WHERE company_id = ? AND status = 'published' ORDER BY created_at DESC`
  ).bind(params.id).all();

  return json({
    ...companyRowToJson(company),
    products: productList,
    reviews: reviews.results.map(r => ({ id: r.id, user: r.user_name, rating: r.rating, text: r.text, reply: r.reply })),
  });
}
