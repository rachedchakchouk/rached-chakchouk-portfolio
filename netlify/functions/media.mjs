import { getStore } from '@netlify/blobs';
import { slotFor } from '../lib/analytics.mjs';

// GET /media/:name  — serves the uploaded CV / photo, or redirects to the original static file.
export default async (req, context) => {
  const name = context.params?.name;
  const slot = slotFor(name);
  if (!slot) return new Response('Not found', { status: 404 });
  const store = getStore('media');
  const res = await store.getWithMetadata(name, { type: 'arrayBuffer' }).catch(() => null);
  if (!res || !res.data) {
    if (!slot.fallback) return new Response('Not found', { status: 404 });
    return new Response(null, { status: 302, headers: { location: slot.fallback, 'cache-control': 'no-cache' } });
  }
  const meta = res.metadata || {};
  const etag = `"${meta.updated || 'v'}"`;
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag } });
  return new Response(res.data, {
    status: 200,
    headers: {
      'content-type': meta.contentType || 'application/octet-stream',
      'content-length': String(res.data.byteLength),
      'content-disposition': `inline; filename="${slot.file}"`,
      'cache-control': 'public, max-age=0, must-revalidate',
      etag,
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
      'content-security-policy': "frame-ancestors 'self'",
      ...(slot.kind === 'pdf' ? { 'x-robots-tag': 'noindex' } : {})
    }
  });
};

export const config = { path: '/media/:name' };
