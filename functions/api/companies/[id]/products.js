import { json, unauthorized, forbidden, notFound, badRequest, randomHex } from '../../../_lib/helpers.js';

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

  const products = await env.DB.prepare('SELECT * FROM products WHERE company_id = ?').bind(params.id).all();
  const out = [];
  for (const p of products.results) {
    const tiers = await env.DB.prepare('SELECT * FROM pricing_tiers WHERE product_id = ? ORDER BY sort_order')
      .bind(p.id).all();
    out.push({
      id: p.id, name: p.name, from: p.from_price,
      tiers: tiers.results.map(t => ({ id: t.id, name: t.name, price: t.price })),
    });
  }
  return json(out);
}

// POST — create a product (with optional initial tiers)
export async function onRequestPost({ request, params, data, env }) {
  if (!data.account) return unauthorized();
  const company = await loadCompany(env, params.id);
  if (!company) return notFound();
  if (!canAccess(data.account, company)) return forbidden();

  const body = await request.json().catch(() => null);
  if (!body || !body.name) return badRequest('Thiếu tên sản phẩm.');

  const id = 'p_' + randomHex(6);
  const tiers = Array.isArray(body.tiers) && body.tiers.length ? body.tiers : [{ name: 'Cơ bản', price: 'Liên hệ' }];
  const fromPrice = tiers[0].price;

  await env.DB.prepare('INSERT INTO products (id, company_id, name, from_price) VALUES (?, ?, ?, ?)')
    .bind(id, params.id, body.name.trim(), fromPrice).run();

  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    await env.DB.prepare('INSERT INTO pricing_tiers (id, product_id, name, price, sort_order) VALUES (?, ?, ?, ?, ?)')
      .bind('t_' + randomHex(6), id, t.name, t.price, i).run();
  }

  return json({ id, name: body.name.trim(), from: fromPrice, tiers }, 201);
}
