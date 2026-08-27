import { json, badRequest, notFound } from '../../../../_lib/helpers.js';

// Public endpoint — anyone can submit a review for a published company.
// Reviews start as 'pending' and only appear once an admin approves them
// (see POST /api/reviews/:id/status), which keeps spam/abuse out of public view.
export async function onRequestPost({ request, params, env }) {
  const company = await env.DB.prepare(
    `SELECT id FROM companies WHERE id = ? AND status = 'published'`
  ).bind(params.id).first();
  if (!company) return notFound('Không tìm thấy doanh nghiệp hoặc chưa được duyệt.');

  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Dữ liệu không hợp lệ');

  const userName = (body.user || '').trim();
  const rating = parseInt(body.rating, 10);
  const text = (body.text || '').trim();

  if (!userName) return badRequest('Vui lòng nhập tên của bạn.');
  if (!rating || rating < 1 || rating > 5) return badRequest('Vui lòng chọn số sao từ 1 đến 5.');
  if (!text || text.length < 10) return badRequest('Nội dung đánh giá cần tối thiểu 10 ký tự.');
  if (text.length > 2000) return badRequest('Nội dung đánh giá quá dài (tối đa 2000 ký tự).');

  await env.DB.prepare(
    `INSERT INTO reviews (company_id, user_name, rating, text, status) VALUES (?, ?, ?, ?, 'pending')`
  ).bind(params.id, userName, rating, text).run();

  return json({ ok: true, message: 'Cảm ơn bạn! Đánh giá đang chờ duyệt và sẽ hiển thị công khai sau khi được kiểm duyệt.' }, 201);
}
