// Catch-all route: functions/api/images/[[path]].js matches /api/images/*
export async function onRequestGet({ params, env }) {
  if (!env.LOGOS) return new Response('R2 bucket not configured', { status: 500 });

  const key = Array.isArray(params.path) ? params.path.join('/') : params.path;
  const object = await env.LOGOS.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
}
