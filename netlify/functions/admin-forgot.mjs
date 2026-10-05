import { visitorHash, bump, peek } from '../lib/analytics.mjs';
import { secStore, loadState, saveState, hashPassword, makeTempPassword, sendMail, adminEmail, maskEmail, sameOrigin, TEMP_TTL } from '../lib/auth.mjs';

// POST /api/admin/forgot -> e-mails a one-time temporary password (valid 15 min) to the
// fixed admin address (ADMIN_EMAIL env, never taken from the request).
// The current password keeps working until it is changed. Limits: 3 / visitor / hour, 6 / day overall.
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', ...extra }
});
const HOUR = 3600 * 1000;

export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!Netlify.env.get('DASHBOARD_PASSWORD')) return json({ error: 'not_configured' }, 503);
  if (!Netlify.env.get('RESEND_API_KEY')) return json({ error: 'mail_not_configured' }, 503);

  const sec = secStore();
  const who = await visitorHash(context.ip || '', 'forgot', Netlify.env.get('ANALYTICS_SALT') || 'rc-portfolio', 'auth');
  const mine = await peek(sec, 'forgot/' + who), all = await peek(sec, 'forgot/all');
  if ((mine && mine.n >= 3) || (all && all.n >= 6)) {
    const until = Math.max(mine && mine.n >= 3 ? mine.until : 0, all && all.n >= 6 ? all.until : 0);
    const retry = Math.ceil((until - Date.now()) / 1000);
    return json({ error: 'too_many', retryAfter: retry }, 429, { 'retry-after': String(retry) });
  }
  await bump(sec, 'forgot/' + who, HOUR);
  await bump(sec, 'forgot/all', 24 * HOUR);

  const temp = makeTempPassword();
  const to = adminEmail();
  const sent = await sendMail(to, 'Mot de passe provisoire — Portfolio Analytics',
    'Bonjour Rached,\n\n' +
    'Une demande de mot de passe oublié a été faite sur le dashboard de votre portfolio.\n\n' +
    'Mot de passe provisoire : ' + temp + '\n\n' +
    'Il est valable 15 minutes et ne peut servir qu’une seule fois. Après connexion, vous devrez choisir un nouveau mot de passe.\n' +
    'Votre mot de passe actuel reste valable tant que vous ne l’avez pas changé.\n\n' +
    'Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet e-mail.\n\n' +
    'https://rached-chakchouk.netlify.app/dashboard/');
  if (!sent.ok) return json({ error: sent.reason }, 502);

  const state = await loadState(sec);
  state.temp = { hash: await hashPassword(temp), exp: Date.now() + TEMP_TTL };
  await saveState(state, sec);
  return json({ ok: true, to: maskEmail(to), validMinutes: TEMP_TTL / 60000 });
};

export const config = { path: '/api/admin/forgot' };
