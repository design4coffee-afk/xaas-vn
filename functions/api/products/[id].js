import { json, unauthorized, forbidden, notFound, badRequest, randomHex } from '../../_lib/helpers.js';

async function loadProductWithCompany(env, id) {
  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
  if (!product) return null;
  const company = await env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(product.company_id).first();
  return { product, company };
}
function canAccess(account, company) {
  return account.role === 'admin' || company.owner_id === account.id;
}

// PUT — replace name/tiers wholesale (simplest correct approach for a small tier list)
export async function onRequestPut({ request, params, data, env }) {
  if (!data.account) return unauthorized();
  const found = await loadProductWithCompany(env, params.id);
  if (!found) return notFound();
  if (!canAccess(data.account, found.company)) return forbidden();

  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Dữ liệu không hợp lệ');

  const name = body.name !== undefined ? body.name.trim() : found.product.name;
  const tiers = Array.isArray(body.tiers) ? body.tiers : null;

  if (tiers) {
    await env.DB.prepare('DELETE FROM pricing_tiers WHERE product_id = ?').bind(params.id).run();
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      await env.DB.prepare('INSERT INTO pricing_tiers (id, product_id, name, price, sort_order) VALUES (?, ?, ?, ?, ?)')
        .bind(t.id || ('t_' + randomHex(6)), params.id, t.name, t.price, i).run();
    }
  }
  const fromPrice = tiers && tiers[0] ? tiers[0].price : found.product.from_price;

  await env.DB.prepare('UPDATE products SET name = ?, from_price = ? WHERE id = ?')
    .bind(name, fromPrice, params.id).run();

  const updatedTiers = await env.DB.prepare('SELECT * FROM pricing_tiers WHERE product_id = ? ORDER BY sort_order')
    .bind(params.id).all();
  return json({ id: params.id, name, from: fromPrice, tiers: updatedTiers.results.map(t => ({ id: t.id, name: t.name, price: t.price })) });
}

export async function onRequestDelete({ params, data, env }) {
  if (!data.account) return unauthorized();
  const found = await loadProductWithCompany(env, params.id);
  if (!found) return notFound();
  if (!canAccess(data.account, found.company)) return forbidden();

  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}
