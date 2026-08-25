-- ============================================================
-- XaaS.vn — D1 schema + seed data
-- Apply with:
--   wrangler d1 execute xaas_vn_db --remote --file=./schema.sql
-- (drop --remote to apply to your local dev DB instead)
-- ============================================================

DROP TABLE IF EXISTS pricing_tiers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS accounts;

-- ---------- accounts & sessions ----------
CREATE TABLE accounts (
  id            TEXT PRIMARY KEY,
  role          TEXT NOT NULL CHECK(role IN ('user','admin')),
  name          TEXT NOT NULL,
  company       TEXT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  token       TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);
CREATE INDEX idx_sessions_account ON sessions(account_id);

-- ---------- login rate limiting ----------
CREATE TABLE login_attempts (
  email        TEXT PRIMARY KEY,
  fail_count   INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT
);

-- ---------- password reset ----------
CREATE TABLE password_resets (
  token       TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL
);
CREATE INDEX idx_resets_account ON password_resets(account_id);

-- ---------- categories ----------
CREATE TABLE categories (
  id     TEXT PRIMARY KEY,     -- 'iaas' | 'paas' | 'saas' | 'ai'
  name   TEXT NOT NULL,
  color  TEXT NOT NULL,
  color2 TEXT NOT NULL,
  description TEXT
);

INSERT INTO categories (id,name,color,color2,description) VALUES
 ('iaas','IaaS','#2454FF','#1E43E0','Máy chủ, lưu trữ, mạng và trung tâm dữ liệu.'),
 ('paas','PaaS','#7B3FF2','#6A2FE0','Môi trường triển khai và công cụ cho nhà phát triển.'),
 ('saas','SaaS','#0FA968','#0C9260','Phần mềm sẵn dùng cho vận hành doanh nghiệp.'),
 ('ai','AIaaS','#FF3D81','#FF6B35','Mô hình AI và API trí tuệ nhân tạo theo yêu cầu.');

-- ---------- companies ----------
CREATE TABLE companies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  mark        TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('draft','pending','published','rejected','hidden')),
  verified    INTEGER NOT NULL DEFAULT 0,   -- 0/1
  rating      REAL NOT NULL DEFAULT 0,
  website     TEXT,
  description TEXT,
  founded     TEXT,                         -- optional: "1994"
  headquarters TEXT,                        -- optional: "Hà Nội, VN"
  team_size   TEXT,                         -- optional: "1.000+ nhân sự"
  logo_url    TEXT,                          -- optional: /api/images/<key> (R2-backed)
  owner_id    TEXT REFERENCES accounts(id),
  reason      TEXT,                          -- rejection reason, if any
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_companies_owner ON companies(owner_id);
CREATE INDEX idx_companies_status ON companies(status);

-- ---------- products & pricing tiers ----------
CREATE TABLE products (
  id          TEXT PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  from_price  TEXT
);
CREATE INDEX idx_products_company ON products(company_id);

CREATE TABLE pricing_tiers (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  price       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_tiers_product ON pricing_tiers(product_id);

-- ---------- reviews ----------
CREATE TABLE reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_name   TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  text        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('published','pending','hidden')),
  reply       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_reviews_company ON reviews(company_id);

-- ============================================================
-- Seed data — mirrors the earlier localStorage prototype
-- (accounts are NOT seeded here — passwords must be hashed via
--  the API; see README "Tạo tài khoản đầu tiên")
-- ============================================================

INSERT INTO companies (id,name,mark,category_id,status,verified,rating,website,description,founded,headquarters,team_size,owner_id,reason,updated_at) VALUES
 (1,'MISA','MI','saas','published',1,4.6,'misa.vn','Phần mềm kế toán và quản trị doanh nghiệp.','1994','Hà Nội, VN','1.000+ nhân sự',NULL,NULL,'2026-08-12'),
 (2,'KiotViet','KV','saas','published',1,4.4,'kiotviet.vn','Quản lý bán hàng đa kênh.',NULL,'Hà Nội, VN',NULL,NULL,NULL,'2026-08-10'),
 (3,'FPT Cloud','FC','iaas','published',0,4.3,'fptcloud.com','Hạ tầng điện toán đám mây make in Vietnam.',NULL,'TP.HCM, VN',NULL,NULL,NULL,'2026-08-09'),
 (4,'Vercel','VE','paas','published',1,4.7,'vercel.com','Triển khai frontend tối ưu cho Next.js.',NULL,'Toàn cầu',NULL,NULL,NULL,'2026-08-08'),
 (5,'OpenAI','OA','ai','published',1,4.6,'openai.com','Mô hình ngôn ngữ và API GPT.',NULL,'Toàn cầu',NULL,NULL,NULL,'2026-08-07'),
 (6,'Base.vn','BA','saas','pending',0,0,'base.vn','Bộ ứng dụng quản trị doanh nghiệp.',NULL,'Hà Nội, VN',NULL,NULL,NULL,'2026-08-14'),
 (7,'Bizfly Cloud','BF','iaas','pending',0,0,'bizflycloud.vn','Máy chủ ảo và CDN trong nước.',NULL,'Hà Nội, VN',NULL,NULL,NULL,'2026-08-14'),
 (8,'Anthropic','AN','ai','hidden',1,4.8,'anthropic.com','Mô hình Claude, tập trung AI an toàn.',NULL,'Toàn cầu',NULL,NULL,NULL,'2026-08-02'),
 (9,'Haravan','HV','paas','published',0,4.2,'haravan.com','Nền tảng thương mại đa kênh.',NULL,'TP.HCM, VN',NULL,NULL,NULL,'2026-08-05'),
 (10,'Zalo AI','ZA','ai','pending',0,0,'zalo.ai','AI xử lý ngôn ngữ và giọng nói tiếng Việt.',NULL,'TP.HCM, VN',NULL,NULL,NULL,'2026-08-14'),
 (101,'MISA meInvoice','ME','saas','pending',0,0,'meinvoice.vn','Hóa đơn điện tử tuân thủ quy định thuế mới nhất.',NULL,'Hà Nội, VN',NULL,NULL,NULL,'2026-08-14'),
 (102,'MISA Cloud CRM','MC','saas','rejected',0,0,'crm.misa.vn','Giải pháp CRM cho đội ngũ bán hàng.',NULL,'Hà Nội, VN',NULL,NULL,'Mô tả trùng lặp với sản phẩm AMIS đã đăng — vui lòng làm rõ điểm khác biệt và bổ sung website chính thức.','2026-08-11'),
 (103,'MISA Nhân sự Lite','ML','saas','draft',0,0,'',NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-01');

-- owner_id left NULL above — update once your first accounts exist, e.g.:
--   UPDATE companies SET owner_id='u1' WHERE id IN (1,101,102,103);

INSERT INTO products (id,company_id,name,from_price) VALUES
 ('p1',1,'MISA AMIS Kế toán','167.000₫/tháng'),
 ('p2',1,'MISA AMIS Bán hàng','229.000₫/tháng'),
 ('p3',1,'MISA meInvoice','99.000₫/tháng'),
 ('p4',2,'KiotViet Bán lẻ','189.000₫/tháng'),
 ('p5',4,'Vercel Pro','$20/tháng');

INSERT INTO pricing_tiers (id,product_id,name,price,sort_order) VALUES
 ('t1','p1','Khởi đầu','167.000₫',1),('t2','p1','Doanh nghiệp','399.000₫',2),('t3','p1','Tập đoàn','Liên hệ',3),
 ('t4','p2','Cơ bản','229.000₫',1),('t5','p2','Chuyên nghiệp','459.000₫',2),('t6','p2','Doanh nghiệp','Liên hệ',3),
 ('t7','p3','200 số/năm','99.000₫',1),('t8','p3','1.000 số/năm','249.000₫',2),('t9','p3','Không giới hạn','Liên hệ',3),
 ('t10','p4','Cơ bản','189.000₫',1),('t11','p4','Phổ biến','329.000₫',2),('t12','p4','Chuỗi','Liên hệ',3),
 ('t13','p5','Hobby','$0',1),('t14','p5','Pro','$20',2),('t15','p5','Enterprise','Liên hệ',3);

INSERT INTO reviews (id,company_id,user_name,rating,text,status,reply) VALUES
 (1,1,'Trần Hòa',5,'Chuyển từ Excel sang MISA giúp tiết kiệm rất nhiều thời gian đối chiếu sổ sách.','published',NULL),
 (2,1,'Nguyễn Minh',4,'Gói Khởi đầu đủ dùng cho cửa hàng nhỏ, giá hợp lý.','published','Cảm ơn anh Minh đã góp ý, đội ngũ MISA đang cải thiện hiệu năng app trong bản cập nhật tới ạ!'),
 (3,2,'Lê Anh',3,'App đôi lúc còn giật khi đồng bộ nhiều chi nhánh cùng lúc.','pending',NULL),
 (4,4,'Phạm Đức',5,'Triển khai cực nhanh, preview mỗi pull request rất tiện.','published',NULL),
 (5,3,'Ẩn danh',1,'spam quảng cáo không liên quan tới dịch vụ.','hidden',NULL);
