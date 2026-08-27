# XaaS.vn — Toàn bộ project (site tĩnh + backend thật)

Đây là bản tổng hợp đầy đủ mọi thứ đã làm cho XaaS.vn: 7 trang giao diện
+ backend thật chạy trên Cloudflare Pages Functions + D1 + R2. Toàn bộ nằm
chung 1 thư mục gốc — deploy 1 lần là có cả site lẫn API.

## Danh sách trang (ở gốc thư mục)

| File | Trang | Ghi chú |
|---|---|---|
| `index.html` | Trang chủ | Stack diagram, danh mục (số liệu thật), doanh nghiệp nổi bật (dữ liệu thật) |
| `category.html` | Danh mục (archive) | 1 template dùng chung cho cả IaaS/PaaS/SaaS/AIaaS, tìm kiếm thật, dữ liệu thật |
| `company-detail.html` | Chi tiết công ty | Đọc `?id=`, dữ liệu thật: mô tả, sản phẩm + bảng giá lọc AJAX, đánh giá (viết được thật), lưu/chia sẻ |
| `gioi-thieu.html` | Giới thiệu | Sứ mệnh, cách hoạt động, cam kết, CTA đăng ký |
| `lien-he.html` | Liên hệ | Form liên hệ thật — lưu vào D1 (`contact_messages`), tùy chọn email cho admin qua Resend |
| `dieu-khoan.html` | Điều khoản dịch vụ | Nội dung điều khoản đầy đủ |
| `auth.html` | Đăng nhập / Đăng ký | Gọi API thật, hỗ trợ `?tab=register`, quên mật khẩu, tự chuyển vào dashboard theo role |
| `reset-password.html` | Đặt lại mật khẩu | Trang đích của link trong email quên mật khẩu |
| `admin-dashboard.html` | Bảng quản trị | Toàn quyền: duyệt/từ chối, xác minh, preview, upload logo, sản phẩm & giá, kiểm duyệt đánh giá, đổi tài khoản; drawer menu mobile |
| `user-dashboard.html` | Bảng điều khiển doanh nghiệp | Chỉ quản lý listing của chính mình: tạo/sửa/gửi duyệt, upload logo, trả lời đánh giá, đổi tài khoản; drawer menu mobile |

Toàn bộ 10 trang đều đọc/ghi dữ liệu thật từ D1 — không còn trang nào dùng
mock data hay `localStorage` cho dữ liệu nghiệp vụ (riêng "Lưu vào danh
sách" trên trang chi tiết vẫn dùng `localStorage` có chủ đích, vì đó là
tính năng ẩn danh không cần tài khoản).

## Backend (Cloudflare Pages Functions + D1 + R2)

Backend thay thế hoàn toàn `localStorage` bằng database D1 thật + API
chạy trên cùng domain Cloudflare Pages với site tĩnh, cộng thêm R2 để
lưu logo doanh nghiệp.

## Cấu trúc

```
xaas-vn-complete/
├── index.html, category.html, company-detail.html, gioi-thieu.html   # trang công khai (dữ liệu thật)
├── lien-he.html, dieu-khoan.html                                     # Liên hệ (form thật), Điều khoản
├── auth.html, reset-password.html                                    # xác thực
├── admin-dashboard.html, user-dashboard.html                         # đã nối API thật
├── robots.txt                     # cho phép crawl + trỏ sitemap
├── schema.sql                     # database schema + seed data
├── wrangler.toml                  # cấu hình Pages + D1 + R2 binding
├── scripts/bootstrap.mjs          # script tạo admin + demo account + gán owner (1 lệnh)
└── functions/
    ├── _middleware.js             # gắn session vào mọi request
    ├── _lib/helpers.js            # hash mật khẩu, session, rate-limit, reset password, response helpers
    ├── sitemap.xml.js             # GET /sitemap.xml — tự sinh từ danh sách công ty đã duyệt
    ├── company/[id].js            # GET /company/:id — trang chia sẻ có OG tags + JSON-LD, redirect vào company-detail.html
    └── api/
        ├── auth/
        │   ├── register.js         # POST /api/auth/register
        │   ├── login.js            # POST /api/auth/login (có rate-limit)
        │   ├── logout.js           # POST /api/auth/logout
        │   ├── me.js                # GET/PUT /api/auth/me (đổi tên/email/mật khẩu)
        │   ├── forgot-password.js  # POST /api/auth/forgot-password
        │   ├── reset-password.js  # POST /api/auth/reset-password
        │   └── bootstrap-admin.js # POST /api/auth/bootstrap-admin (dùng 1 lần)
        ├── companies/
        │   ├── index.js            # GET/POST /api/companies
        │   ├── [id].js             # GET/PUT/DELETE /api/companies/:id
        │   └── [id]/
        │       ├── status.js       # POST /api/companies/:id/status   (admin)
        │       ├── verify.js       # POST /api/companies/:id/verify  (admin)
        │       ├── products.js     # GET/POST /api/companies/:id/products
        │       └── logo.js         # POST /api/companies/:id/logo (upload ảnh vào R2)
        ├── products/
        │   └── [id].js             # PUT/DELETE /api/products/:id
        ├── images/
        │   └── [[path]].js         # GET /api/images/* — phục vụ ảnh từ R2
        ├── public/
        │   ├── categories.js       # GET /api/public/categories
        │   ├── contact.js          # POST /api/public/contact
        │   └── companies/
        │       ├── index.js        # GET /api/public/companies
        │       └── [id].js         # GET /api/public/companies/:id
        │       └── [id]/
        │           └── reviews.js  # POST /api/public/companies/:id/reviews
        ├── contact/
        │   ├── index.js            # GET /api/contact (admin)
        │   ├── [id].js             # DELETE /api/contact/:id (admin)
        │   └── [id]/
        │       └── read.js         # POST /api/contact/:id/read (admin)
        └── reviews/
            ├── index.js            # GET /api/reviews
            └── [id]/
                ├── reply.js        # POST /api/reviews/:id/reply
                └── status.js       # POST /api/reviews/:id/status    (admin)
```

Đặt thư mục `functions/` này ở **gốc repo**, cùng cấp với các file HTML tĩnh
— Cloudflare Pages sẽ tự nhận diện và deploy cả static site lẫn API cùng
lúc, cùng domain, không cần lo CORS.

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

## 4. Tạo R2 bucket cho logo doanh nghiệp

```bash
wrangler r2 bucket create xaas-vn-logos
```

Không cần copy id nào cả — `wrangler.toml` đã trỏ sẵn `bucket_name =
"xaas-vn-logos"` khớp với tên trên. Bỏ qua bước này nếu tạm thời chưa cần
tính năng upload logo (site vẫn chạy bình thường, chỉ là nút upload logo
sẽ báo lỗi "Chưa cấu hình R2 bucket").

## 5. Đặt secret cho bootstrap admin (+ email, tùy chọn)

```bash
wrangler pages secret put ADMIN_BOOTSTRAP_SECRET
# nhập một chuỗi bí mật bất kỳ, ví dụ: 8f3a1c9e2b7d4f6a
```

**Tùy chọn — để email "quên mật khẩu" thật sự được gửi đi:**
Tạo tài khoản miễn phí tại [resend.com](https://resend.com), lấy API key,
rồi:
```bash
wrangler pages secret put RESEND_API_KEY
wrangler pages secret put EMAIL_FROM
# ví dụ giá trị EMAIL_FROM: XaaS.vn <no-reply@xaas.vn>
# (cần xác minh domain gửi email trên Resend trước khi dùng địa chỉ @xaas.vn)
```
Nếu bỏ qua bước này, tính năng quên mật khẩu vẫn hoạt động về mặt logic
(tạo token, người dùng có thể tự lấy link từ bảng `password_resets` qua
`wrangler d1 execute` để test) nhưng sẽ **không gửi email thật**.

## 6. Deploy lên Cloudflare Pages

Nếu project Pages đã nối với repo GitHub (theo đúng flow bạn đang dùng cho
các site XaaS.vn khác), chỉ cần push code lên GitHub — Cloudflare Pages tự
build & deploy, bao gồm cả `functions/`.

Hoặc deploy thủ công:
```bash
wrangler pages deploy . --project-name=xaas-vn
```

**Quan trọng:** vào Cloudflare dashboard → project Pages → Settings →
Functions → thêm 2 binding:
- **D1 database bindings** → binding `DB` trỏ tới `xaas_vn_db`
- **R2 bucket bindings** → binding `LOGOS` trỏ tới `xaas-vn-logos`

(bước này KHÔNG tự động xảy ra chỉ nhờ `wrangler.toml` khi deploy qua Git
integration — cần gắn tay trên dashboard, hoặc dùng `wrangler pages deploy`
với `wrangler.toml` đã cấu hình đúng).

## 7. Tạo tài khoản admin + tài khoản demo + gán chủ sở hữu — chỉ 1 lệnh

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
| GET    | `/api/images/*`                    | công khai — phục vụ logo từ R2 |
| GET    | `/sitemap.xml`                     | công khai — tự sinh từ danh sách công ty đã duyệt |
| GET    | `/company/:id`                     | công khai — trang chia sẻ có OG tags, redirect vào `company-detail.html` |
| POST   | `/api/public/companies/:id/reviews` | công khai — gửi đánh giá mới (trạng thái `pending`, chờ admin duyệt) |
| POST   | `/api/public/contact`               | công khai — form Liên hệ, lưu vào `contact_messages` |
| GET    | `/api/contact`                      | admin — danh sách tin nhắn liên hệ |
| POST   | `/api/contact/:id/read`             | admin — đánh dấu đã đọc/chưa đọc |
| DELETE | `/api/contact/:id`                  | admin — xóa tin nhắn |
| POST   | `/api/auth/register`               | công khai                       |
| POST   | `/api/auth/login`                  | công khai — khóa 15 phút sau 5 lần sai |
| POST   | `/api/auth/logout`                 | đã đăng nhập                    |
| POST   | `/api/auth/forgot-password`        | công khai — luôn trả lời chung chung (chống dò email) |
| POST   | `/api/auth/reset-password`         | công khai — cần token hợp lệ từ email |
| GET    | `/api/auth/me`                     | đã đăng nhập                    |
| PUT    | `/api/auth/me`                     | đã đăng nhập — đổi tên/email/mật khẩu của chính mình |
| GET    | `/api/companies`                   | đã đăng nhập (user: chỉ của mình)|
| POST   | `/api/companies`                   | đã đăng nhập                    |
| GET/PUT/DELETE | `/api/companies/:id`       | chủ sở hữu hoặc admin (xóa: chỉ admin) |
| POST   | `/api/companies/:id/status`        | admin                           |
| POST   | `/api/companies/:id/verify`        | admin                           |
| POST   | `/api/companies/:id/logo`          | chủ sở hữu hoặc admin — upload logo (multipart, tối đa 2MB) |
| GET/POST | `/api/companies/:id/products`    | chủ sở hữu hoặc admin           |
| PUT/DELETE | `/api/products/:id`            | chủ sở hữu hoặc admin           |
| GET    | `/api/reviews`                     | đã đăng nhập (user: chỉ của mình)|
| POST   | `/api/reviews/:id/reply`           | chủ sở hữu hoặc admin           |
| POST   | `/api/reviews/:id/status`          | admin                           |

Các endpoint `/api/public/...`, `/api/images/*`, `/sitemap.xml`, `/company/:id`
không cần cookie/session — dùng cho khách truy cập chưa đăng nhập.

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
- Đăng nhập sai quá 5 lần liên tiếp → khóa tài khoản 15 phút (`login_attempts`).
- Quên mật khẩu: token dùng 1 lần, hết hạn sau 30 phút, không tiết lộ email
  có tồn tại hay không; đặt lại mật khẩu thành công sẽ đăng xuất mọi session
  cũ của tài khoản đó.
- Không còn nút đăng nhập nhanh nào bỏ qua mật khẩu — kể cả tài khoản demo.

## SEO đã áp dụng

- `sitemap.xml` tự sinh từ danh sách công ty `published` + các trang tĩnh
  chính, cập nhật `lastmod` theo dữ liệu thật.
- `robots.txt` cho phép crawl trang công khai, chặn dashboard/`/api/`.
- `/company/:id` là URL chia sẻ đẹp, server-render `<title>`, `og:title`,
  `og:description`, `og:image` (logo nếu có), Twitter Card, và JSON-LD
  `schema.org/Organization` — để link chia sẻ trên Facebook/Zalo/Twitter
  hiện đúng ảnh/tiêu đề thay vì trang trắng. Người dùng thật được redirect
  ngay vào `company-detail.html?id=X` để xem bản tương tác đầy đủ.
- Nút "Chia sẻ" trên trang chi tiết công ty copy đúng link `/company/:id`
  này (dùng Web Share API trên di động nếu trình duyệt hỗ trợ).

## Còn thiếu (nên làm tiếp nếu lên production thật)

- Domain thật (`xaas.vn`) chưa gắn — vào Cloudflare Pages project → Custom
  domains → Add domain, rồi trỏ DNS theo hướng dẫn hiện trên dashboard.
- Cloudflare Web Analytics chưa bật — vào dashboard → Analytics & Logs →
  Web Analytics → Add site → lấy đoạn script → dán vào trước `</body>` của
  cả 8 trang HTML (hiện dùng số liệu "lượt xem" demo, chưa phải số thật).
- Kiểm tra `Origin`/CSRF token nếu sau này API được gọi từ domain khác
  ngoài chính site này.
- Sao lưu D1 định kỳ: `wrangler d1 export xaas_vn_db --remote --output=backup.sql`.
- "Đăng doanh nghiệp" hiện chỉ tạo được đúng 1 doanh nghiệp mỗi request qua
  form — nếu cần nhập hàng loạt (bulk import) sẽ cần thêm endpoint riêng.
- Link mạng xã hội (LinkedIn/Facebook) ở footer vẫn là `#` placeholder —
  thay bằng link thật khi có tài khoản mạng xã hội chính thức. Link Email
  đã trỏ thật tới `mailto:hello@xaas.vn`.
- Tin nhắn liên hệ (`contact_messages`) giờ đã có màn hình riêng trong admin
  dashboard (mục "Tin nhắn") — xem danh sách, đánh dấu đã đọc/chưa đọc, trả
  lời qua email (mở sẵn `mailto:`), hoặc xóa.
