# XaaS.vn — Toàn bộ project (site tĩnh + backend thật)

Đây là bản tổng hợp đầy đủ mọi thứ đã làm cho XaaS.vn: 6 trang giao diện
+ backend thật chạy trên Cloudflare Pages Functions + D1. Toàn bộ nằm
chung 1 thư mục gốc — deploy 1 lần là có cả site lẫn API.

## Danh sách trang (ở gốc thư mục)

| File | Trang | Ghi chú |
|---|---|---|
| `index.html` | Trang chủ | Demo stack diagram, danh mục, big tech, doanh nghiệp nổi bật |
| `category.html` | Danh mục (archive) | 1 template dùng chung cho cả IaaS/PaaS/SaaS/AIaaS, chuyển tab đổi màu |
| `company-detail.html` | Chi tiết công ty | Demo MISA — tổng quan, tính năng, sản phẩm nổi bật + bảng giá lọc AJAX, đánh giá |
| `auth.html` | Đăng nhập / Đăng ký | Gọi API thật, tự chuyển vào dashboard theo role |
| `admin-dashboard.html` | Bảng quản trị | Toàn quyền: duyệt/từ chối, xác minh, preview, sản phẩm & giá, kiểm duyệt đánh giá |
| `user-dashboard.html` | Bảng điều khiển doanh nghiệp | Chỉ quản lý listing của chính mình: tạo/sửa/gửi duyệt, trả lời đánh giá |

`index.html`, `category.html`, `company-detail.html` giờ đã nối API công khai
thật (`/api/public/...`, không cần đăng nhập) — 3 trang còn lại đã nối API
riêng theo role từ trước. Toàn bộ 6 trang đều đọc dữ liệu thật từ D1.

## Backend (Cloudflare Pages Functions + D1)

Backend thay thế hoàn toàn `localStorage` bằng database D1 thật + API
chạy trên cùng domain Cloudflare Pages với site tĩnh.

## Cấu trúc

```
xaas-vn-complete/
├── index.html, category.html, company-detail.html    # trang tĩnh (demo data)
├── auth.html, admin-dashboard.html, user-dashboard.html   # đã nối API thật
├── schema.sql                     # database schema + seed data
├── wrangler.toml                  # cấu hình Pages + D1 binding
├── scripts/bootstrap.mjs          # script tạo admin + demo account + gán owner (1 lệnh)
└── functions/
    ├── _middleware.js             # gắn session vào mọi request
    ├── _lib/helpers.js            # hash mật khẩu, session, response helpers
    └── api/
        ├── auth/
        │   ├── register.js        # POST   /api/auth/register
        │   ├── login.js           # POST   /api/auth/login
        │   ├── logout.js          # POST   /api/auth/logout
        │   ├── me.js               # GET    /api/auth/me
        │   └── bootstrap-admin.js # POST   /api/auth/bootstrap-admin (dùng 1 lần)
        ├── companies/
        │   ├── index.js           # GET/POST /api/companies
        │   ├── [id].js            # GET/PUT/DELETE /api/companies/:id
        │   └── [id]/
        │       ├── status.js      # POST /api/companies/:id/status   (admin)
        │       ├── verify.js      # POST /api/companies/:id/verify  (admin)
        │       └── products.js    # GET/POST /api/companies/:id/products
        ├── products/
        │   └── [id].js            # PUT/DELETE /api/products/:id
        └── reviews/
            ├── index.js           # GET /api/reviews
            └── [id]/
                ├── reply.js       # POST /api/reviews/:id/reply
                └── status.js      # POST /api/reviews/:id/status    (admin)
```

Đặt thư mục `functions/` này ở **gốc repo**, cùng cấp với các file HTML tĩnh
(`index.html`, `auth.html`, `admin-dashboard.html`, `user-dashboard.html`,
`category.html`, `company-detail.html`...) — Cloudflare Pages sẽ tự nhận diện
và deploy cả static site lẫn API cùng lúc, cùng domain, không cần lo CORS.

## 1. Cài Wrangler & đăng nhập

```bash
npm install -g wrangler
wrangler login
```

## 2. Tạo D1 database

```bash
wrangler d1 create xaas_vn_db
```

Lệnh trên trả về một `database_id` — copy giá trị đó vào `wrangler.toml`,
thay cho `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

## 3. Áp dụng schema

```bash
# database thật (production)
wrangler d1 execute xaas_vn_db --remote --file=./schema.sql

# hoặc database local để dev thử trước
wrangler d1 execute xaas_vn_db --local --file=./schema.sql
```

## 4. Đặt secret cho bootstrap admin

```bash
wrangler pages secret put ADMIN_BOOTSTRAP_SECRET
# nhập một chuỗi bí mật bất kỳ, ví dụ: 8f3a1c9e2b7d4f6a
```

## 5. Deploy lên Cloudflare Pages

Nếu project Pages đã nối với repo GitHub (theo đúng flow bạn đang dùng cho
các site XaaS.vn khác), chỉ cần push code lên GitHub — Cloudflare Pages tự
build & deploy, bao gồm cả `functions/`.

Hoặc deploy thủ công:
```bash
wrangler pages deploy . --project-name=xaas-vn
```

**Quan trọng:** vào Cloudflare dashboard → project Pages → Settings →
Functions → D1 database bindings → thêm binding `DB` trỏ tới `xaas_vn_db`
(bước này KHÔNG tự động xảy ra chỉ nhờ `wrangler.toml` khi deploy qua Git
integration — cần gắn tay trên dashboard, hoặc dùng `wrangler pages deploy`
với `wrangler.toml` đã cấu hình đúng).

## 6. Tạo tài khoản admin + tài khoản demo + gán chủ sở hữu — chỉ 1 lệnh

Thay vì làm thủ công từng bước (bootstrap admin → đăng ký user demo → gán
`owner_id`), chạy script có sẵn:

```bash
node scripts/bootstrap.mjs --url https://xaas.vn --secret 8f3a1c9e2b7d4f6a
```

Script này tự động:
1. Gọi `/api/auth/bootstrap-admin` tạo tài khoản admin (`admin@xaas.vn` / `admin123`)
2. Gọi `/api/auth/register` tạo tài khoản doanh nghiệp demo (`vana@misa.vn` / `demo123`)
3. Chạy `wrangler d1 execute` gán tài khoản đó làm chủ sở hữu 4 công ty MISA
   seed sẵn (id 1, 101, 102, 103)

Yêu cầu: Node 18+, đã `wrangler login`, đã áp `schema.sql`, đã set
`ADMIN_BOOTSTRAP_SECRET` (bước 4). Script tự bỏ qua an toàn nếu tài khoản
đã tồn tại từ lần chạy trước — chạy lại nhiều lần không sao.

Có thể đổi email/mật khẩu/tên qua flag, ví dụ:
```bash
node scripts/bootstrap.mjs --url https://xaas.vn --secret 8f3a1c9e2b7d4f6a \
  --admin-password "mot-mat-khau-manh" --user-password "mot-mat-khau-khac"
```
Xem đầy đủ flag trong phần comment đầu file `scripts/bootstrap.mjs`.
Dùng database local thay vì production: thêm `--local`.

**⚠️ Đổi mật khẩu mặc định** (`admin123`, `demo123`) trước khi dùng cho môi
trường thật — đây chỉ là mật khẩu demo để test nhanh luồng end-to-end.
Đổi ngay trong dashboard: đăng nhập admin → **Cài đặt → "Tài khoản quản trị
viên"** (hoặc user → **Hồ sơ tài khoản → "Thông tin đăng nhập"**) → nhập
mật khẩu hiện tại + email/mật khẩu mới → Lưu. Không cần chạm vào database.

**Lưu ý bảo mật:** `auth.html` KHÔNG còn nút "đăng nhập nhanh demo admin"
(đã gỡ bỏ) — nút đó từng cho phép bất kỳ ai vào thẳng quyền admin chỉ bằng
1 click mà không cần mật khẩu, rất nguy hiểm nếu để công khai. Chỉ còn nút
demo phía doanh nghiệp (`vana@misa.vn`). Đăng nhập admin luôn phải qua form
email/mật khẩu thật.

### Cách làm thủ công (nếu không muốn dùng script)

<details>
<summary>Bấm để xem</summary>

```bash
# 1. Tạo admin
curl -X POST https://xaas.vn/api/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{"secret":"8f3a1c9e2b7d4f6a","name":"Alex","email":"admin@xaas.vn","password":"mot-mat-khau-manh"}'

# 2. Đăng ký tài khoản doanh nghiệp (hoặc dùng tab "Đăng ký doanh nghiệp" trên auth.html)
curl -X POST https://xaas.vn/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Nguyễn Văn A","company":"MISA","email":"vana@misa.vn","password":"demo123"}'
# → lấy "id" trong response

# 3. Gán chủ sở hữu cho 4 công ty MISA seed sẵn
wrangler d1 execute xaas_vn_db --remote \
  --command="UPDATE companies SET owner_id='<id-vừa-lấy>' WHERE id IN (1,101,102,103)"
```
</details>

(id tài khoản lấy từ response của `/api/auth/register`, hoặc bảng `accounts`.)

## API tóm tắt

| Method | Endpoint                          | Quyền                          |
|--------|------------------------------------|---------------------------------|
| GET    | `/api/public/categories`           | công khai — dùng cho trang chủ & danh mục |
| GET    | `/api/public/companies`            | công khai — chỉ trả doanh nghiệp `published`; hỗ trợ `?cat=`, `?search=`, `?sort=`, `?limit=` |
| GET    | `/api/public/companies/:id`        | công khai — chi tiết 1 công ty (kèm sản phẩm + đánh giá `published`), 404 nếu chưa duyệt |
| POST   | `/api/auth/register`               | công khai                       |
| POST   | `/api/auth/login`                  | công khai                       |
| POST   | `/api/auth/logout`                 | đã đăng nhập                    |
| GET    | `/api/auth/me`                     | đã đăng nhập                    |
| PUT    | `/api/auth/me`                     | đã đăng nhập — đổi tên/email/mật khẩu của chính mình |
| GET    | `/api/companies`                   | đã đăng nhập (user: chỉ của mình)|
| POST   | `/api/companies`                   | đã đăng nhập                    |
| GET/PUT/DELETE | `/api/companies/:id`       | chủ sở hữu hoặc admin (xóa: chỉ admin) |
| POST   | `/api/companies/:id/status`        | admin                           |
| POST   | `/api/companies/:id/verify`        | admin                           |
| GET/POST | `/api/companies/:id/products`    | chủ sở hữu hoặc admin           |
| PUT/DELETE | `/api/products/:id`            | chủ sở hữu hoặc admin           |
| GET    | `/api/reviews`                     | đã đăng nhập (user: chỉ của mình)|
| POST   | `/api/reviews/:id/reply`           | chủ sở hữu hoặc admin           |
| POST   | `/api/reviews/:id/status`          | admin                           |

Ba endpoint `/api/public/...` đầu bảng không cần cookie/session — dùng cho
`index.html`, `category.html`, `company-detail.html` để hiển thị dữ liệu
công khai cho khách truy cập chưa đăng nhập.

Session lưu qua cookie `xaas_session` (HttpOnly, Secure, SameSite=Lax, 7
ngày) — không cần header `Authorization` thủ công, `fetch(..., {credentials:
'include'})` là đủ (frontend đã tự cập nhật).

## Bảo mật đã áp dụng

- Mật khẩu hash bằng PBKDF2-SHA256 (100.000 vòng lặp) + salt riêng từng user,
  không lưu plaintext.
- Cookie session `HttpOnly` (JS không đọc được) + `Secure` + `SameSite=Lax`.
- Mọi endpoint ghi dữ liệu đều kiểm tra quyền sở hữu (`owner_id`) hoặc vai trò
  `admin` trước khi cho phép.
- `bootstrap-admin` tự khóa sau lần dùng đầu tiên.

## Còn thiếu (nên làm tiếp nếu lên production thật)

- Rate limiting cho `/api/auth/login` (chống brute-force).
- Endpoint "quên mật khẩu" (hiện chỉ có nút placeholder ở frontend).
- Kiểm tra `Origin`/CSRF token nếu sau này API được gọi từ domain khác.
- Ảnh/logo doanh nghiệp: hiện schema chưa có cột lưu ảnh — cần thêm
  Cloudflare Images hoặc R2 nếu muốn upload ảnh thật.
