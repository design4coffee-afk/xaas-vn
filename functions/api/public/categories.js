import { json } from '../../_lib/helpers.js';

const CAT_META = {
  iaas:{name:'IaaS', full:'Hạ tầng dưới dạng dịch vụ', color:'#2454FF', color2:'#1E43E0'},
  paas:{name:'PaaS', full:'Nền tảng dưới dạng dịch vụ', color:'#7B3FF2', color2:'#6A2FE0'},
  saas:{name:'SaaS', full:'Phần mềm dưới dạng dịch vụ', color:'#0FA968', color2:'#0C9260'},
  ai:{name:'AIaaS', full:'Trí tuệ nhân tạo dưới dạng dịch vụ', color:'#FF3D81', color2:'#FF6B35'},
};

export async function onRequestGet({ env }) {
  const rows = await env.DB.prepare(
    `SELECT c.id, c.name, c.description,
            (SELECT COUNT(*) FROM companies WHERE category_id = c.id AND status = 'published') AS count,
            (SELECT AVG(rating) FROM companies WHERE category_id = c.id AND status = 'published' AND rating > 0) AS avg_rating
     FROM categories c`
  ).all();

  const out = rows.results.map(r => ({
    id: r.id,
    name: CAT_META[r.id]?.name || r.id,
    full: CAT_META[r.id]?.full || '',
    color: CAT_META[r.id]?.color,
    color2: CAT_META[r.id]?.color2,
    desc: r.description,
    count: r.count,
    avgRating: r.avg_rating ? Math.round(r.avg_rating * 10) / 10 : 0,
  }));
  return json(out);
}
