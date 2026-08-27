import { json, badRequest, sendEmail } from '../../_lib/helpers.js';

const SUBJECT_LABEL = {
  general: 'Câu hỏi chung',
  listing: 'Về doanh nghiệp đã đăng / báo sai thông tin',
  partnership: 'Hợp tác',
  support: 'Hỗ trợ kỹ thuật',
};

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Dữ liệu không hợp lệ');

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const subject = SUBJECT_LABEL[body.subject] ? body.subject : 'general';
  const message = (body.message || '').trim();

  if (!name || !email || !message) return badRequest('Vui lòng điền đầy đủ họ tên, email và nội dung.');
  if (message.length > 4000) return badRequest('Nội dung quá dài (tối đa 4000 ký tự).');

  await env.DB.prepare(
    'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)'
  ).bind(name, email, subject, message).run();

  if (env.CONTACT_TO_EMAIL) {
    await sendEmail(env, {
      to: env.CONTACT_TO_EMAIL,
      subject: `[XaaS.vn liên hệ] ${SUBJECT_LABEL[subject]} — ${name}`,
      html: `
        <p><b>Từ:</b> ${name} (${email})</p>
        <p><b>Chủ đề:</b> ${SUBJECT_LABEL[subject]}</p>
        <p><b>Nội dung:</b></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });
  }

  return json({ ok: true, message: 'Đã gửi! Chúng tôi sẽ phản hồi sớm nhất có thể.' }, 201);
}
