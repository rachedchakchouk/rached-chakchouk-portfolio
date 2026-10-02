import { getStore } from '@netlify/blobs';
import { day, aggregate, safeEqual } from '../lib/analytics.mjs';

// GET /api/stats?days=30  — requires "Authorization: Bearer <DASHBOARD_PASSWORD>".
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }
});

export default async (req) => {
  const secret = Netlify.env.get('DASHBOARD_PASSWORD');
  if (!secret) return json({ error: 'not_configured' }, 503);
  const auth = req.headers.get('authorization') || '';
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!given || !safeEqual(given, secret)) {
    await new Promise(r => setTimeout(r, 600)); // slow down brute force
    return json({ error: 'unauthorized' }, 401);
  }

  const days = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get('days') || '30', 10) || 30, 1), 90);
  const store = getStore('analytics');
  const now = Date.now();
  const keys = [];
  for (let i = 0; i < days; i++) {
    const { blobs } = await store.list({ prefix: `e/${day(now - i * 86400000)}/` });
    for (const b of blobs) keys.push(b.key);
  }
  const events = [];
  for (let i = 0; i < keys.length; i += 50) {
    const batch = await Promise.all(keys.slice(i, i + 50).map(k => store.get(k, { type: 'json' }).catch(() => null)));
    for (const e of batch) if (e) events.push(e);
  }
  return json(aggregate(events, days, now));
};

export const config = { path: '/api/stats' };
