import { json, unauthorized, forbidden, notFound, badRequest, randomHex, companyRowToJson } from '../../../_lib/helpers.js';

const ALLOWED_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export async function onRequestPost({ request, params, data, env }) {
  if (!data.account) return unauthorized();
  const company = await env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(params.id).first();
  if (!company) return notFound();
  if (data.account.role !== 'admin' && company.owner_id !== data.account.id) return forbidden();

  if (!env.LOGOS) return badRequest('Chưa cấu hình R2 bucket (binding "LOGOS") cho project này.');

  const form = await request.formData().catch(() => null);
  const file = form && form.get('file');
  if (!file || typeof file === 'string') return badRequest('Thiếu file ảnh (field "file").');

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return badRequest('Chỉ hỗ trợ ảnh PNG, JPEG, WebP hoặc SVG.');
  if (file.size > MAX_BYTES) return badRequest('Ảnh vượt quá 2MB.');

  const key = `logos/${params.id}-${randomHex(6)}.${ext}`;
  await env.LOGOS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });

  const logoUrl = `/api/images/${key}`;
  await env.DB.prepare(`UPDATE companies SET logo_url = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(logoUrl, params.id).run();

  const updated = await env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(params.id).first();
  return json(companyRowToJson(updated));
}
