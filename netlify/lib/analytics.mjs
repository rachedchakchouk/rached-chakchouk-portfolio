// Shared, framework-free helpers for the visit analytics (unit-testable).

export const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|linkedinbot|embedly|preview|headless|lighthouse|pingdom|uptime|curl|wget|python-requests|axios|go-http/i;

export const EVENTS = new Set([
  'cv_download', 'cv_view', 'linkedin', 'github', 'project_open', 'contact_submit', 'email_copy', 'phone_copy'
]);

export function day(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10); // UTC YYYY-MM-DD
}

export function parseUA(ua = '') {
  const device = /ipad|tablet/i.test(ua) ? 'Tablet' : /mobi|android|iphone/i.test(ua) ? 'Mobile' : 'Desktop';
  let browser = 'Other';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';
  let os = 'Other';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/iphone|ipad|ios/i.test(ua)) os = 'iOS';
  else if (/mac os/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';
  return { device, browser, os };
}

export function sourceOf(referrer = '', siteHost = '') {
  if (!referrer) return 'Direct';
  let host;
  try { host = new URL(referrer).hostname.replace(/^www\./, ''); } catch { return 'Direct'; }
  if (!host || host === siteHost) return 'Direct';
  if (/linkedin\.|lnkd\.in/.test(host)) return 'LinkedIn';
  if (/google\./.test(host)) return 'Google';
  if (/github\.com/.test(host)) return 'GitHub';
  if (/bing\.com/.test(host)) return 'Bing';
  if (/facebook\.|fb\./.test(host)) return 'Facebook';
  if (/t\.co$|twitter\.|x\.com/.test(host)) return 'X / Twitter';
  if (/mail\.|outlook\.|gmail/.test(host)) return 'E-mail';
  return host;
}

export function clean(str, max = 120) {
  return String(str ?? '').replace(/[\u0000-\u001f<>]/g, '').slice(0, max);
}

export async function visitorHash(ip, ua, salt, d) {
  const data = new TextEncoder().encode(`${salt}|${d}|${ip}|${ua}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a = '', b = '') {
  const x = new TextEncoder().encode(String(a)), y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function inc(map, key, n = 1) { if (key) map[key] = (map[key] || 0) + n; }
function top(map, n = 10) { return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label, value })); }

// events: [{t:'pv'|'ev', ts, d, v, path, src, country, cc, city, device, browser, os, lang, name, label}]
export function aggregate(events, days, now = Date.now()) {
  const series = [];
  for (let i = days - 1; i >= 0; i--) series.push({ date: day(now - i * 86400000), visits: 0, visitors: 0 });
  const idx = Object.fromEntries(series.map((s, i) => [s.date, i]));
  const uniqPerDay = {}, uniqAll = new Set();
  const countries = {}, cities = {}, sources = {}, devices = {}, browsers = {}, oses = {}, langs = {}, actions = {}, projects = {};
  const recent = [];
  let visits = 0;
  for (const e of events) {
    if (!(e.d in idx)) continue;
    if (e.t === 'pv') {
      visits++;
      series[idx[e.d]].visits++;
      (uniqPerDay[e.d] ||= new Set()).add(e.v);
      uniqAll.add(e.v);
      inc(countries, e.country || 'Unknown'); inc(cities, e.city ? `${e.city}, ${e.cc || ''}`.trim() : null);
      inc(sources, e.src); inc(devices, e.device); inc(browsers, e.browser); inc(oses, e.os); inc(langs, e.lang);
      recent.push({ ts: e.ts, country: e.country, cc: e.cc, city: e.city, src: e.src, device: e.device, browser: e.browser });
    } else if (e.t === 'ev') {
      inc(actions, e.name);
      if (e.name === 'project_open') inc(projects, e.label);
    }
  }
  for (const s of series) s.visitors = uniqPerDay[s.date]?.size || 0;
  recent.sort((a, b) => b.ts - a.ts);
  return {
    range: { days, from: series[0].date, to: series[series.length - 1].date },
    totals: { visits, visitors: uniqAll.size, countries: Object.keys(countries).filter(c => c !== 'Unknown').length, actions: Object.values(actions).reduce((a, b) => a + b, 0) },
    series,
    countries: top(countries, 15), cities: top(cities, 10), sources: top(sources, 10),
    devices: top(devices), browsers: top(browsers), os: top(oses), languages: top(langs),
    actions: top(actions, 20), projects: top(projects),
    recent: recent.slice(0, 25)
  };
}

// ---- media management (CV PDFs + profile photo) ----
export const MEDIA = {
  'cv-fr.pdf': { kind: 'pdf', fallback: '/Rached_Chakchouk_CV_FR.pdf', file: 'Rached_Chakchouk_CV_FR.pdf', max: 4 * 1024 * 1024 },
  'cv-en.pdf': { kind: 'pdf', fallback: '/Rached_Chakchouk_CV_EN.pdf', file: 'Rached_Chakchouk_Resume.pdf', max: 4 * 1024 * 1024 },
  'photo': { kind: 'image', fallback: '/photo.jpg', file: 'Rached_Chakchouk.jpg', max: 3 * 1024 * 1024 }
};

export function sniff(bytes) {
  const b = bytes;
  if (b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return 'application/pdf';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

export function slotFor(name) {
  if (MEDIA[name]) return MEDIA[name];
  if (/^img-[a-z0-9-]{1,40}$/.test(name || '')) return { kind: 'image', fallback: null, file: name + '.img', max: 3 * 1024 * 1024 };
  return null;
}

export function checkUpload(name, bytes) {
  const slot = slotFor(name);
  if (!slot) return { error: 'unknown_slot' };
  if (!bytes || !bytes.length) return { error: 'empty' };
  if (bytes.length > slot.max) return { error: 'too_large', max: slot.max };
  const type = sniff(bytes);
  if (slot.kind === 'pdf' && type !== 'application/pdf') return { error: 'not_pdf' };
  if (slot.kind === 'image' && !/^image\/(jpeg|png|webp)$/.test(type || '')) return { error: 'not_image' };
  return { type };
}

// ---- admin sessions (short-lived signed tokens; the password itself is only sent once, to /api/admin/login) ----
const b64u = (buf) => Buffer.from(buf).toString('base64url');
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)));
}
export const TOKEN_TTL = 2 * 60 * 60 * 1000; // 2 h
export async function makeToken(secret, now = Date.now()) {
  const exp = now + TOKEN_TTL, payload = 'v1.' + exp;
  return { token: payload + '.' + await hmac('rc-admin|' + secret, payload), exp };
}
export async function verifyToken(token, secret, now = Date.now()) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const exp = Number(parts[1]);
  if (!exp || exp < now || exp > now + TOKEN_TTL + 60000) return false;
  return safeEqual(parts[2], await hmac('rc-admin|' + secret, parts[0] + '.' + parts[1]));
}
export async function authorized(req, secret) {
  const auth = req.headers.get('authorization') || '';
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (given && secret && await verifyToken(given, secret)) return true;
  await new Promise(r => setTimeout(r, 400));
  return false;
}

// ---- simple counters in Netlify Blobs (rate limiting) ----
export async function bump(store, key, ttlMs) {
  const now = Date.now();
  const cur = await store.get(key, { type: 'json' }).catch(() => null);
  const rec = cur && cur.until > now ? cur : { n: 0, until: now + ttlMs };
  rec.n++;
  await store.setJSON(key, rec);
  return rec;
}
export async function peek(store, key) {
  const cur = await store.get(key, { type: 'json' }).catch(() => null);
  return cur && cur.until > Date.now() ? cur : null;
}

// ---- editable site content ----
const URL_KEYS = new Set(['url', 'logoImg']);
const SAFE_URL = /^(https:\/\/|http:\/\/|\/(?!\/)|[\w.-]+\/[\w./-]*$|#)/;
export function safeUrl(u) { u = String(u || '').trim(); return !u || SAFE_URL.test(u) ? u.slice(0, 500) : ''; }

export function sanitizeContent(c, depth = 0) {
  if (depth > 8) return null;
  if (Array.isArray(c)) return c.slice(0, 200).map(v => sanitizeContent(v, depth + 1));
  if (c && typeof c === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(c).slice(0, 60)) {
      if (!/^[\w-]{1,40}$/.test(k)) continue;
      if (URL_KEYS.has(k)) o[k] = safeUrl(v);
      else if (k === 'shots' && Array.isArray(v)) o[k] = v.slice(0, 12).map(safeUrl).filter(Boolean);
      else o[k] = sanitizeContent(v, depth + 1);
    }
    return o;
  }
  if (typeof c === 'string') return c.slice(0, 4000);
  if (typeof c === 'number' || typeof c === 'boolean' || c === null) return c;
  return null;
}

export function validContent(c) {
  if (!c || typeof c !== 'object' || c.version !== 1) return false;
  for (const k of ['skills', 'experiences', 'internships', 'projects', 'education', 'languages']) if (!Array.isArray(c[k])) return false;
  return true;
}
