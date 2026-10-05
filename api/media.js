import { MAIN, withTimeout } from './_main.js';
import { slotFor } from '../netlify/lib/analytics.mjs';

// GET /media/:name on the mirror (rewritten to /api/media?name=...) -> CV / photo uploaded on the
// main site; falls back to the static copy shipped with the mirror.
const TYPES = /^(application\/pdf|image\/(jpeg|png|webp))$/;
export async function GET(req) {
  const name = new URL(req.url).searchParams.get('name') || '';
  const slot = slotFor(name);
  if (!slot) return new Response('Not found', { status: 404 });
  const fallback = () => slot.fallback
    ? new Response(null, { status: 302, headers: { location: slot.fallback, 'cache-control': 'no-cache' } })
    : new Response('Not found', { status: 404 });
  const t = withTimeout(6000);
  try {
    const r = await fetch(MAIN + '/media/' + encodeURIComponent(name), { signal: t.signal, redirect: 'manual' });
    const type = (r.headers.get('content-type') || '').split(';')[0];
    if (r.status !== 200 || !TYPES.test(type)) return fallback();
    const data = await r.arrayBuffer();
    return new Response(data, { status: 200, headers: {
      'content-type': type,
      'content-length': String(data.byteLength),
      'content-disposition': `inline; filename="${slot.file}"`,
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
      'content-security-policy': slot.kind === 'pdf' ? "frame-ancestors 'self'" : "default-src 'none'; frame-ancestors 'self'; sandbox",
      'cross-origin-resource-policy': 'same-origin',
      ...(slot.kind === 'pdf' ? { 'x-robots-tag': 'noindex' } : {})
    } });
  } catch {
    return fallback();
  } finally { t.done(); }
}
