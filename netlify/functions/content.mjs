import { getStore } from '@netlify/blobs';

// GET /api/content  — public: the content edited from the dashboard (404 = use the defaults built into the page).
export default async () => {
  const data = await getStore('content').get('site', { type: 'text' }).catch(() => null);
  if (!data) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-cache' } });
  return new Response(data, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' } });
};

export const config = { path: '/api/content' };
