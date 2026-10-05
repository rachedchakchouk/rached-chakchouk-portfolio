import { getStore } from '@netlify/blobs';
import { authorized, sanitizeContent, validContent } from '../lib/analytics.mjs';
import { adminKey } from '../lib/auth.mjs';

// /api/admin/content  — GET current (or null) · PUT save · DELETE back to the defaults built into the page.
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }
});

export default async (req) => {
  const secret = await adminKey();
  if (!secret) return json({ error: 'not_configured' }, 503);
  if ((await authorized(req, secret)) !== 'm') return json({ error: 'unauthorized' }, 401);
  const store = getStore('content');

  if (req.method === 'GET') {
    const data = await store.get('site', { type: 'json' }).catch(() => null);
    const meta = await store.getMetadata('site').catch(() => null);
    return json({ content: data, updated: meta?.metadata?.updated || null });
  }
  if (req.method === 'PUT') {
    const raw = await req.text();
    if (raw.length > 400 * 1024) return json({ error: 'too_large' }, 413);
    let body; try { body = JSON.parse(raw); } catch { return json({ error: 'bad_json' }, 400); }
    const clean = sanitizeContent(body);
    if (!validContent(clean)) return json({ error: 'invalid_content' }, 422);
    const updated = Date.now();
    await store.set('site', JSON.stringify(clean), { metadata: { updated } });
    return json({ ok: true, updated });
  }
  if (req.method === 'DELETE') {
    await store.delete('site');
    return json({ ok: true, reset: true });
  }
  return json({ error: 'method_not_allowed' }, 405);
};

export const config = { path: '/api/admin/content' };
