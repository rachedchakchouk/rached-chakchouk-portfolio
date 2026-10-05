import { authorized, makeToken, visitorHash, bump, peek } from '../lib/analytics.mjs';
import { secStore, loadState, saveState, signingKey, checkPassword, hashPassword, passwordProblem, sameOrigin } from '../lib/auth.mjs';

// POST /api/admin/password {current?, next} (Bearer session token) -> new {token, exp}.
// Normal sessions must confirm the current password; sessions opened with the temporary
// password skip that step. Changing the password signs out every other session.
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', ...extra }
});
const MAX_FAILS = 5, LOCK_MS = 15 * 60 * 1000;

export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!Netlify.env.get('DASHBOARD_PASSWORD')) return json({ error: 'not_configured' }, 503);
  const sec = secStore();
  const state = await loadState(sec);
  const kind = await authorized(req, signingKey(state));
  if (!kind) return json({ error: 'unauthorized' }, 401);

  const raw = await req.text();
  if (raw.length > 1024) return json({ error: 'bad_request' }, 400);
  let body; try { body = JSON.parse(raw); } catch { return json({ error: 'bad_request' }, 400); }

  if (kind === 'm') {
    const who = await visitorHash(context.ip || '', 'login', Netlify.env.get('ANALYTICS_SALT') || 'rc-portfolio', 'auth');
    const key = 'login-fail/' + who;
    const lock = await peek(sec, key);
    if (lock && lock.n >= MAX_FAILS) return json({ error: 'locked', retryAfter: Math.ceil((lock.until - Date.now()) / 1000) }, 429);
    if ((await checkPassword(body.current, state)) !== 'main') {
      await new Promise(r => setTimeout(r, 700));
      await bump(sec, key, LOCK_MS);
      return json({ error: 'wrong_current' }, 403);
    }
  }
  const problem = passwordProblem(body.next);
  if (problem) return json({ error: problem }, 400);
  if (await checkPassword(body.next, { ...state, temp: null }) === 'main') return json({ error: 'same_as_before' }, 400);

  state.hash = await hashPassword(body.next);
  state.gen = (state.gen || 0) + 1;
  state.changedAt = Date.now();
  delete state.temp;
  await saveState(state, sec);
  return json(await makeToken(signingKey(state), 'm'));
};

export const config = { path: '/api/admin/password' };
