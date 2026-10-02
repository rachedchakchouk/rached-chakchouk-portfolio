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
