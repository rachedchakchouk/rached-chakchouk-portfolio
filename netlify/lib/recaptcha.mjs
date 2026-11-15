// Google reCAPTCHA v3 server-side verification (contact form, admin login, forgotten password).
//
// Environment variables (Netlify; RECAPTCHA_SITE_KEY also on Vercel, where it is injected into the pages at build time):
//   RECAPTCHA_SITE_KEY    public site key (domains: rached-chakchouk.vercel.app and rached-chakchouk.netlify.app)
//   RECAPTCHA_SECRET_KEY  secret key. When set, the protected endpoints REQUIRE a valid token.
//   RECAPTCHA_MIN_SCORE   optional, 0.0 – 1.0 (default 0.5)
const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const TOKEN_RE = /^[\w-]{20,4000}$/;
export const SITE_HOSTS = ['rached-chakchouk.vercel.app', 'rached-chakchouk.netlify.app'];

export const env = (k) => (typeof Netlify !== 'undefined' && Netlify.env ? Netlify.env.get(k) : process.env[k]);
export const recaptchaEnabled = () => !!env('RECAPTCHA_SECRET_KEY');

function minScore() {
  const raw = env('RECAPTCHA_MIN_SCORE');
  const n = raw ? Number(raw) : NaN;
  return n >= 0 && n <= 1 ? n : 0.5;
}

// -> { ok: true, score } | { ok: false, reason[, score] }   (`fetchImpl` is injectable for tests)
export async function verifyRecaptcha(token, { action, ip = '', hosts = SITE_HOSTS, fetchImpl = fetch, timeoutMs = 5000, now = Date.now() } = {}) {
  const secret = env('RECAPTCHA_SECRET_KEY');
  if (!secret) return { ok: false, reason: 'not_configured' };
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return { ok: false, reason: 'missing_token' };
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), timeoutMs);
  let data;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set('remoteip', ip);
    const r = await fetchImpl(VERIFY_URL, { method: 'POST', signal: c.signal,
      headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    if (!r.ok) return { ok: false, reason: 'verify_http_' + r.status };
    data = await r.json();
  } catch {
    return { ok: false, reason: 'verify_unreachable' };
  } finally { clearTimeout(timer); }

  if (!data || data.success !== true) return { ok: false, reason: 'invalid_token' };
  if (data.action !== action) return { ok: false, reason: 'wrong_action' };
  if (!hosts.includes(data.hostname)) return { ok: false, reason: 'wrong_hostname' };
  // tokens are valid 2 minutes and single-use (Google refuses a second check)
  const ts = Date.parse(data.challenge_ts || '');
  if (!ts || now - ts > 150000) return { ok: false, reason: 'expired' };
  const score = typeof data.score === 'number' ? data.score : 0;
  if (score < minScore()) return { ok: false, reason: 'low_score', score };
  return { ok: true, score };
}

// Convenience for endpoints: null when OK (or reCAPTCHA not configured), otherwise a ready Response.
export async function requireRecaptcha(token, action, ip, json) {
  if (!recaptchaEnabled()) return null;
  const check = await verifyRecaptcha(token, { action, ip });
  if (check.ok) return null;
  console.warn(`reCAPTCHA refused for "${action}": ${check.reason}${check.score != null ? ' (score ' + check.score + ')' : ''}`);
  const down = check.reason.startsWith('verify_');
  return json({ error: down ? 'captcha_unavailable' : 'captcha_failed' }, down ? 503 : 403);
}
