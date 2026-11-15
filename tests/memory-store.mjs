// In-memory stand-in for a Netlify Blobs store (get / set / setJSON / list / delete / getWithMetadata + onlyIfMatch / onlyIfNew).
export function memoryStore() {
  const m = new Map(); let v = 0;
  const put = (k, val, o = {}) => {
    const cur = m.get(k);
    if (o.onlyIfNew && cur) return { modified: false };
    if (o.onlyIfMatch && (!cur || cur.etag !== o.onlyIfMatch)) return { modified: false };
    const etag = '"' + (++v) + '"'; m.set(k, { val, etag }); return { modified: true, etag };
  };
  return {
    map: m,
    async set(k, val, o) { return put(k, val, o); },
    async setJSON(k, val, o) { return put(k, JSON.stringify(val), o); },
    async get(k, o = {}) { const e = m.get(k); if (!e) return null; return o.type === 'json' ? JSON.parse(e.val) : e.val; },
    async getWithMetadata(k, o = {}) { const e = m.get(k); if (!e) return null; return { data: o.type === 'json' ? JSON.parse(e.val) : e.val, etag: e.etag, metadata: {} }; },
    async list({ prefix = '' } = {}) { return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key, etag: m.get(key).etag })) }; },
    async delete(k) { m.delete(k); }
  };
}
