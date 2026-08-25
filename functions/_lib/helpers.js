// ============================================================
// Shared helpers for XaaS.vn Pages Functions
// ============================================================

const PBKDF2_ITERATIONS = 100000;
const SESSION_COOKIE = 'xaas_session';
const SESSION_DAYS = 7;

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return bufToHex(arr.buffer);
}

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return bufToHex(bits);
}

async function verifyPassword(password, salt, hash) {
  const computed = await hashPassword(password, salt);
  return computed === hash;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}

function badRequest(message) { return json({ error: message }, 400); }
function unauthorized(message = 'Chưa đăng nhập') { return json({ error: message }, 401); }
function forbidden(message = 'Không có quyền thực hiện') { return json({ error: message }, 403); }
function notFound(message = 'Không tìm thấy') { return json({ error: message }, 404); }

function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  const out = {};
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function sessionCookieHeader(token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function createSession(db, accountId) {
  const token = randomHex(24);
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.prepare('INSERT INTO sessions (token, account_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, accountId, expires).run();
  return token;
}

// Reads the session cookie, looks up the account. Returns null if absent/expired.
async function getSessionAccount(request, db) {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const row = await db.prepare(
    `SELECT a.id, a.role, a.name, a.company, a.email
     FROM sessions s JOIN accounts a ON a.id = s.account_id
     WHERE s.token = ? AND s.expires_at > datetime('now')`
  ).bind(token).first();
  return row || null;
}

function companyRowToJson(row) {
  return {
    id: row.id,
    name: row.name,
    mark: row.mark,
    cat: row.category_id,
    status: row.status,
    verified: !!row.verified,
    rating: row.rating,
    website: row.website,
    desc: row.description,
    founded: row.founded || null,
    headquarters: row.headquarters || null,
    teamSize: row.team_size || null,
    logoUrl: row.logo_url || null,
    owner: row.owner_id,
    reason: row.reason,
    updated: row.updated_at,
  };
}

// ---------- login rate limiting ----------
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function checkLoginLock(db, email) {
  const row = await db.prepare('SELECT fail_count, locked_until FROM login_attempts WHERE email = ?').bind(email).first();
  if (!row) return { locked: false };
  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(row.locked_until) - new Date()) / 60000);
    return { locked: true, minutesLeft };
  }
  return { locked: false };
}

async function recordFailedLogin(db, email) {
  const row = await db.prepare('SELECT fail_count FROM login_attempts WHERE email = ?').bind(email).first();
  const nextCount = (row?.fail_count || 0) + 1;
  const lockedUntil = nextCount >= MAX_FAILED_ATTEMPTS
    ? new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString()
    : null;
  await db.prepare(
    `INSERT INTO login_attempts (email, fail_count, locked_until) VALUES (?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET fail_count = excluded.fail_count, locked_until = excluded.locked_until`
  ).bind(email, nextCount, lockedUntil).run();
  return { lockedUntil };
}

async function clearLoginAttempts(db, email) {
  await db.prepare('DELETE FROM login_attempts WHERE email = ?').bind(email).run();
}

// ---------- password reset ----------
async function createPasswordReset(db, accountId) {
  const token = randomHex(24);
  const expires = new Date(Date.now() + 30 * 60000).toISOString(); // 30 minutes
  await db.prepare('INSERT INTO password_resets (token, account_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, accountId, expires).run();
  return token;
}

async function consumePasswordReset(db, token) {
  const row = await db.prepare(
    `SELECT pr.account_id, pr.expires_at FROM password_resets pr WHERE pr.token = ?`
  ).bind(token).first();
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) return null;
  return row.account_id;
}

async function deletePasswordReset(db, token) {
  await db.prepare('DELETE FROM password_resets WHERE token = ?').bind(token).run();
}

// Sends a transactional email via Resend (https://resend.com), if RESEND_API_KEY
// is configured. Silently no-ops otherwise (dev/local without an email provider).
async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) return { sent: false, reason: 'RESEND_API_KEY not set' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM || 'XaaS.vn <no-reply@xaas.vn>',
      to: [to], subject, html,
    }),
  });
  return { sent: res.ok, status: res.status };
}

export {
  hashPassword, verifyPassword, randomHex,
  json, badRequest, unauthorized, forbidden, notFound,
  sessionCookieHeader, clearSessionCookieHeader, createSession, getSessionAccount,
  companyRowToJson,
  checkLoginLock, recordFailedLogin, clearLoginAttempts,
  createPasswordReset, consumePasswordReset, deletePasswordReset, sendEmail,
};
