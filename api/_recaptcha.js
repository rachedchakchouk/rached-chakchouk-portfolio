// Google reCAPTCHA v3 verification for the contact form (Vercel functions).
//
// Vercel environment variables:
//   RECAPTCHA_SECRET_KEY  secret key (server side only). When set, every message MUST carry a valid token.
//   RECAPTCHA_SITE_KEY    public site key, injected into the page at build time (scripts/vercel-build.mjs).
//   RECAPTCHA_MIN_SCORE   optional, 0.0 – 1.0 (default 0.5). Lower = more permissive.
const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
export const ACTION = 'contact';
const TOKEN_RE = /^[\w-]{20,4000}$/;

export const recaptchaEnabled = () => !!process.env.RECAPTCHA_SECRET_KEY;

function minScore() {
  const n = Number(process.env.RECAPTCHA_MIN_SCORE);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.5;
}

export function clientIp(req) {
  return (req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0] || '').trim();
}

// Returns { ok: true, score } or { ok: false, reason }.
// `fetchImpl` is injectable for tests.
export async function verifyRecaptcha(token, { ip = '', hostname = '', fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return { ok: false, reason: 'not_configured' };
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return { ok: false, reason: 'missing_token' };
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), timeoutMs);
  let data;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set('remoteip', ip);
    const r = await fetchImpl(VERIFY_URL, {
      method: 'POST', signal: c.signal,
      headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: body.toString()
    });
    if (!r.ok) return { ok: false, reason: 'verify_http_' + r.status };
    data = await r.json();
  } catch {
    return { ok: false, reason: 'verify_unreachable' };
  } finally { clearTimeout(timer); }

  if (!data || data.success !== true) return { ok: false, reason: 'invalid_token' };
  if (data.action !== ACTION) return { ok: false, reason: 'wrong_action' };
  if (hostname && data.hostname && data.hostname !== hostname) return { ok: false, reason: 'wrong_hostname' };
  // tokens are valid 2 minutes; reject anything older (replays of a captured token)
  const ts = Date.parse(data.challenge_ts || '');
  if (!ts || Date.now() - ts > 2 * 60 * 1000 + 30000) return { ok: false, reason: 'expired' };
  const score = typeof data.score === 'number' ? data.score : 0;
  if (score < minScore()) return { ok: false, reason: 'low_score', score };
  return { ok: true, score };
}
