import { MAIN, withTimeout } from './_main.js';

// GET /api/content on the mirror -> same content as the main site (edited from the dashboard).
// 204 when the main site is unreachable: the page then keeps its built-in content.
export async function GET() {
  const t = withTimeout();
  try {
    const r = await fetch(MAIN + '/api/content', { signal: t.signal, headers: { accept: 'application/json' } });
    if (!r.ok) return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
    const body = await r.text();
    JSON.parse(body); // only pass through valid JSON
    return new Response(body, { status: 200, headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600',
      'x-content-type-options': 'nosniff'
    } });
  } catch {
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  } finally { t.done(); }
}
