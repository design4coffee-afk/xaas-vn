// functions/company/[id].js -> /company/:id
// A lightweight, crawler-friendly share URL: renders real <title>/OG/meta tags
// server-side (so link previews on Facebook/Zalo/Twitter look correct), then
// redirects human visitors straight into the interactive company-detail.html.
const CAT_NAME = { iaas: 'IaaS', paas: 'PaaS', saas: 'SaaS', ai: 'AIaaS' };

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function onRequestGet({ params, request, env }) {
  const origin = new URL(request.url).origin;
  const destination = `${origin}/company-detail.html?id=${params.id}`;

  const company = await env.DB.prepare(
    `SELECT * FROM companies WHERE id = ? AND status = 'published'`
  ).bind(params.id).first();

  if (!company) {
    return new Response('Không tìm thấy doanh nghiệp này.', { status: 404 });
  }

  const catName = CAT_NAME[company.category_id] || company.category_id;
  const title = `${company.name} — ${catName} · XaaS.vn`;
  const description = (company.description || `Thông tin doanh nghiệp ${company.name} trên XaaS.vn — thư mục dịch vụ SaaS, PaaS, IaaS và AIaaS tại Việt Nam.`).slice(0, 200);
  const image = company.logo_url ? `${origin}${company.logo_url}` : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    description: company.description || undefined,
    url: company.website ? (company.website.startsWith('http') ? company.website : `https://${company.website}`) : undefined,
    logo: image || undefined,
  };

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${destination}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${destination}">
${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${image ? `<meta name="twitter:image" content="${esc(image)}">` : ''}
<meta http-equiv="refresh" content="0; url=${destination}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<script>window.location.replace(${JSON.stringify(destination)});</script>
</head>
<body>
  <p>Đang chuyển đến trang <a href="${destination}">${esc(company.name)}</a>...</p>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
