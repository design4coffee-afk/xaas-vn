#!/usr/bin/env node
// ============================================================
// XaaS.vn — one-shot post-deploy bootstrap
//
// Does, in order:
//   1. Creates the first admin account (via /api/auth/bootstrap-admin)
//   2. Registers the demo business account (vana@misa.vn / MISA)
//   3. Assigns that account as owner_id of the 4 seeded MISA
//      companies (ids 1, 101, 102, 103) via `wrangler d1 execute`
//
// Requires: Node 18+ (built-in fetch), wrangler installed & logged in,
// schema.sql already applied, ADMIN_BOOTSTRAP_SECRET already set.
//
// Usage:
//   node scripts/bootstrap.mjs --url https://xaas.vn --secret 1234zxcv
//
// Optional flags:
//   --db <name>        D1 database name       (default: xaas_vn_db)
//   --local            run wrangler against the local dev DB instead of --remote
//   --admin-email       (default: xaphucom@gmail.com)
//   --admin-password    (default: 1234zxcv — CHANGE THIS for anything real)
//   --admin-name         (default: Alex)
//   --user-email        (default: vana@misa.vn)
//   --user-password      (default: demo123 — CHANGE THIS for anything real)
//   --user-name          (default: Nguyễn Văn A)
//   --user-company       (default: MISA)
// ============================================================

import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { out[key] = next; i++; }
      else { out[key] = true; }
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

const BASE_URL = (args.url || '').replace(/\/$/, '');
const SECRET = args.secret;
const DB_NAME = args.db || 'xaas_vn_db';
const REMOTE_FLAG = args.local ? '--local' : '--remote';

const ADMIN_EMAIL = args['admin-email'] || 'admin@xaas.vn';
const ADMIN_PASSWORD = args['admin-password'] || 'admin123';
const ADMIN_NAME = args['admin-name'] || 'Alex';

const USER_EMAIL = args['user-email'] || 'vana@misa.vn';
const USER_PASSWORD = args['user-password'] || 'demo123';
const USER_NAME = args['user-name'] || 'Nguyễn Văn A';
const USER_COMPANY = args['user-company'] || 'MISA';

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

if (!BASE_URL) fail('Thiếu --url, ví dụ: --url https://xaas.vn (không có dấu / cuối)');
if (!SECRET) fail('Thiếu --secret — chính là ADMIN_BOOTSTRAP_SECRET bạn đã set bằng `wrangler pages secret put`');

async function postJson(path, body) {
  const res = await fetch(BASE_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch (e) {}
  return { ok: res.ok, status: res.status, body: json };
}

async function main() {
  console.log(`\n🔧 XaaS.vn bootstrap — target: ${BASE_URL}\n`);

  // ---------- 1. admin account ----------
  console.log('1/3  Tạo tài khoản quản trị viên...');
  const adminRes = await postJson('/api/auth/bootstrap-admin', {
    secret: SECRET, name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
  });
  if (adminRes.ok) {
    console.log(`     ✅ Đã tạo admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else if (adminRes.status === 403 && /đã tồn tại/i.test(adminRes.body?.error || '')) {
    console.log('     ⏭️  Đã có tài khoản admin từ trước — bỏ qua bước này.');
  } else {
    fail(`Tạo admin thất bại (${adminRes.status}): ${adminRes.body?.error || 'lỗi không xác định'}`);
  }

  // ---------- 2. demo business account ----------
  console.log('2/3  Đăng ký tài khoản doanh nghiệp demo...');
  const userRes = await postJson('/api/auth/register', {
    name: USER_NAME, company: USER_COMPANY, email: USER_EMAIL, password: USER_PASSWORD,
  });

  let ownerId = null;
  if (userRes.ok) {
    ownerId = userRes.body.id;
    console.log(`     ✅ Đã tạo tài khoản: ${USER_EMAIL} / ${USER_PASSWORD}  (id: ${ownerId})`);
  } else if (userRes.status === 400 && /đã được đăng ký/i.test(userRes.body?.error || '')) {
    console.log('     ⏭️  Email này đã đăng ký từ trước — bỏ qua tạo mới.');
    console.log('        (Không thể tự dò lại id tài khoản cũ vì lý do bảo mật.');
    console.log('         Nếu cần gán lại owner, chạy thủ công lệnh wrangler ở bước 3 với id đúng.)');
  } else {
    fail(`Đăng ký tài khoản demo thất bại (${userRes.status}): ${userRes.body?.error || 'lỗi không xác định'}`);
  }

  // ---------- 3. assign ownership of the seeded MISA companies ----------
  if (!ownerId) {
    console.log('3/3  Bỏ qua gán chủ sở hữu (không có id tài khoản mới).');
    console.log('\n✅ Hoàn tất (một phần) — kiểm tra lại các dòng ⏭️ ở trên nếu cần xử lý thủ công.\n');
    return;
  }

  console.log('3/3  Gán chủ sở hữu cho 4 doanh nghiệp MISA seed sẵn (id 1, 101, 102, 103)...');
  const sql = `UPDATE companies SET owner_id='${ownerId}' WHERE id IN (1,101,102,103)`;
  const result = spawnSync(
    'wrangler',
    ['d1', 'execute', DB_NAME, REMOTE_FLAG, `--command=${sql}`],
    { stdio: 'inherit', shell: process.platform === 'win32' }
  );

  if (result.status !== 0) {
    fail('Lệnh `wrangler d1 execute` thất bại — kiểm tra đã `wrangler login` và tên database đúng chưa (--db).');
  }

  console.log(`
✅ Hoàn tất!

  Quản trị viên : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}
  Doanh nghiệp  : ${USER_EMAIL} / ${USER_PASSWORD}  (đã gán làm chủ MISA, MISA meInvoice, MISA Cloud CRM, MISA Nhân sự Lite)

  Đăng nhập thử tại: ${BASE_URL}/auth.html

  ⚠️  Đổi mật khẩu 2 tài khoản trên trước khi dùng cho môi trường thật —
      đây chỉ là mật khẩu demo để bạn test nhanh luồng end-to-end.
`);
}

main().catch(err => fail(err.message || String(err)));
