import { makeToken, visitorHash, hit, count, clearHits } from '../lib/analytics.mjs';
import { requireRecaptcha } from '../lib/recaptcha.mjs';
import { secStore, loadState, saveState, signingKey, checkPassword, sameOrigin, GLOBAL_FAIL_MAX, GLOBAL_FAIL_WINDOW } from '../lib/auth.mjs';

// POST /api/admin/login {password} -> {token, exp, mustChange}.
// Accepts the current admin password, or the one-time temporary password sent by e-mail
// (then mustChange=true and the session can only be used to set a new password).
// 5 failed attempts from the same visitor lock logins for 15 minutes.
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', ...extra }
});
const MAX_FAILS = 5, LOCK_MS = 15 * 60 * 1000;

export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!Netlify.env.get('DASHBOARD_PASSWORD')) return json({ error: 'not_configured' }, 503);
  const raw = await req.text();
  if (raw.length > 8192) return json({ error: 'bad_request' }, 400);
  let body; try { body = JSON.parse(raw); } catch { return json({ error: 'bad_request' }, 400); }

  // reCAPTCHA first: scripted attempts are refused before they count towards the lock,
  // so nobody can lock the real admin out by sending wrong passwords from a script
  const refused = await requireRecaptcha(body.recaptcha, 'login', context.ip || '', json);
  if (refused) return refused;

  const sec = secStore();
  const who = await visitorHash(context.ip || '', 'login', Netlify.env.get('ANALYTICS_SALT') || 'rc-portfolio', 'auth');
  const key = 'login-fail/' + who;
  const lock = await count(sec, key), all = await count(sec, 'login-fail/all');
  if ((lock && lock.n >= MAX_FAILS) || (all && all.n >= GLOBAL_FAIL_MAX)) {
    const until = Math.max(lock && lock.n >= MAX_FAILS ? lock.until : 0, all && all.n >= GLOBAL_FAIL_MAX ? all.until : 0);
    const retry = Math.ceil((until - Date.now()) / 1000);
    return json({ error: 'locked', retryAfter: retry }, 429, { 'retry-after': String(retry) });
  }
  const state = await loadState(sec);
  const kind = await checkPassword(body.password, state);
  if (!kind) {
    await new Promise(r => setTimeout(r, 700));
    const rec = await hit(sec, key, LOCK_MS);
    await hit(sec, 'login-fail/all', GLOBAL_FAIL_WINDOW);
    return json({ error: 'unauthorized', remaining: Math.max(0, MAX_FAILS - rec.n) }, 401);
  }
  await clearHits(sec, key);
  if (kind === 'temp') { delete state.temp; await saveState(state, sec); } // single use
  return json(await makeToken(signingKey(state), kind === 'temp' ? 't' : 'm'));
};

export const config = { path: '/api/admin/login' };
