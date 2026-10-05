import { getStore } from '@netlify/blobs';
import { MEDIA, slotFor, checkUpload, authorized } from '../lib/analytics.mjs';
import { adminKey } from '../lib/auth.mjs';

// /api/admin/media  — GET: status · PUT ?name=: upload (raw body) · DELETE ?name=: back to the original file.
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }
});

export default async (req) => {
  const secret = await adminKey();
  if (!secret) return json({ error: 'not_configured' }, 503);
  if ((await authorized(req, secret)) !== 'm') return json({ error: 'unauthorized' }, 401);

  const store = getStore('media');
  const name = new URL(req.url).searchParams.get('name');

  if (req.method === 'GET') {
    const { blobs } = await store.list();
    const names = [...new Set([...Object.keys(MEDIA), ...blobs.map(b => b.key).filter(k => slotFor(k))])];
    const items = await Promise.all(names.map(async (n) => {
      const m = await store.getMetadata(n).catch(() => null);
      return { name: n, kind: slotFor(n).kind, fixed: !!MEDIA[n], custom: !!m, size: m?.metadata?.size || null, updated: m?.metadata?.updated || null, contentType: m?.metadata?.contentType || null, original: m?.metadata?.original || null };
    }));
    return json({ items });
  }

  const slot = slotFor(name);
  if (!slot) return json({ error: 'unknown_slot' }, 400);

  if (req.method === 'PUT') {
    const len = Number(req.headers.get('content-length') || 0);
    if (len > slot.max) return json({ error: 'too_large', max: slot.max }, 413);
    const bytes = new Uint8Array(await req.arrayBuffer());
    const check = checkUpload(name, bytes);
    if (check.error) return json(check, check.error === 'too_large' ? 413 : 415);
    const original = (req.headers.get('x-file-name') || '').replace(/[^\w.\- ]/g, '').slice(0, 80);
    const metadata = { contentType: check.type, size: bytes.length, updated: Date.now(), original };
    await store.set(name, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), { metadata });
    return json({ ok: true, name, ...metadata });
  }

  if (req.method === 'DELETE') {
    await store.delete(name);
    return json({ ok: true, name, custom: false });
  }

  return json({ error: 'method_not_allowed' }, 405);
};

export const config = { path: '/api/admin/media' };
