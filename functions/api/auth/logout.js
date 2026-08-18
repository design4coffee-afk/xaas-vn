import { json, clearSessionCookieHeader } from '../../_lib/helpers.js';

export async function onRequestPost({ request, env }) {
  const cookies = (request.headers.get('Cookie') || '');
  const match = cookies.match(/xaas_session=([^;]+)/);
  if (match) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(decodeURIComponent(match[1])).run();
  }
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookieHeader() });
}
