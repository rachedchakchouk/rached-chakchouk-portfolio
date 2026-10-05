import { getStore } from '@netlify/blobs';
import { BOT_RE, EVENTS, day, parseUA, sourceOf, clean, visitorHash, bump } from '../lib/analytics.mjs';

// POST /api/track  — cookieless, IP is never stored (only a daily-salted hash for unique counts).
export default async (req, context) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(req.url).host) return new Response(null, { status: 403 });
  const ua = req.headers.get('user-agent') || '';
  if (BOT_RE.test(ua)) return new Response(null, { status: 204 });

  const raw = await req.text();
  if (raw.length > 2048) return new Response('Payload too large', { status: 413 });
  let body;
  try { body = JSON.parse(raw); } catch { return new Response('Bad request', { status: 400 }); }

  const now = Date.now(), d = day(now);
  const host = new URL(req.url).hostname.replace(/^www\./, '');
  const salt = Netlify.env.get('ANALYTICS_SALT') || 'rc-portfolio';
  const v = await visitorHash(context.ip || '', ua, salt, d);
  const geo = context.geo || {};
  const base = { ts: now, d, v };
  let rec;

  if (body.type === 'pageview') {
    rec = {
      ...base, t: 'pv',
      path: clean(body.path, 80) || '/',
      src: sourceOf(clean(body.ref, 300), host),
      country: clean(geo.country?.name, 60) || 'Unknown', cc: clean(geo.country?.code, 4),
      city: clean(geo.city, 60), lang: clean(body.lang, 10),
      ...parseUA(ua)
    };
  } else if (body.type === 'event' && EVENTS.has(body.name)) {
    rec = { ...base, t: 'ev', name: body.name, label: clean(body.label, 60) };
  } else {
    return new Response('Unknown event', { status: 400 });
  }

  // abuse protection: max 40 events / visitor / 10 min, max 5000 events / day overall
  const sec = getStore('security');
  const perVisitor = await bump(sec, `rl/${v}`, 10 * 60 * 1000);
  if (perVisitor.n > 40) return new Response(null, { status: 429 });
  const perDay = await bump(sec, `cap/${d}`, 26 * 60 * 60 * 1000);
  if (perDay.n > 5000) return new Response(null, { status: 429 });

  const store = getStore('analytics');
  const key = `e/${d}/${now}-${Math.random().toString(36).slice(2, 8)}`;
  await store.setJSON(key, rec);
  return new Response(null, { status: 204 });
};

export const config = { path: '/api/track' };
