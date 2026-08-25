import { json, badRequest, createPasswordReset, sendEmail } from '../../_lib/helpers.js';

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  const email = body && (body.email || '').trim().toLowerCase();
  if (!email) return badRequest('Vui lòng nhập email.');

  // Always return the same generic message whether or not the email exists,
  // to avoid leaking which emails are registered (account enumeration).
  const GENERIC_OK = { ok: true, message: 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu.' };

  const acc = await env.DB.prepare('SELECT id, name FROM accounts WHERE email = ?').bind(email).first();
  if (!acc) return json(GENERIC_OK);

  const token = await createPasswordReset(env.DB, acc.id);
  const resetUrl = `${new URL(request.url).origin}/reset-password.html?token=${token}`;

  await sendEmail(env, {
    to: email,
    subject: 'Đặt lại mật khẩu XaaS.vn',
    html: `
      <p>Chào ${acc.name || ''},</p>
      <p>Bấm vào link dưới đây để đặt lại mật khẩu (hiệu lực trong 30 phút):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, có thể bỏ qua email này.</p>
    `,
  });

  return json(GENERIC_OK);
}
