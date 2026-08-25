// functions/sitemap.xml.js -> served at /sitemap.xml
export async function onRequestGet({ env, request }) {
  const origin = new URL(request.url).origin;

  const staticPages = ['/', '/category.html', '/gioi-thieu.html', '/auth.html'];

  let companies = [];
  try {
    const rows = await env.DB.prepare(
      `SELECT id, updated_at FROM companies WHERE status = 'published'`
    ).all();
    companies = rows.results;
  } catch (e) {
    // DB not reachable — still return a valid sitemap with just static pages
  }

  const urls = [
    ...staticPages.map(p => `  <url><loc>${origin}${p}</loc><changefreq>weekly</changefreq></url>`),
    ...companies.map(c => `  <url><loc>${origin}/company-detail.html?id=${c.id}</loc><lastmod>${(c.updated_at || '').slice(0, 10)}</lastmod><changefreq>weekly</changefreq></url>`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
