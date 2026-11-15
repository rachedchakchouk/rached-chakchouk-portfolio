import { hit, count, clean } from '../lib/analytics.mjs';
import { secStore, sendMail, adminEmail } from '../lib/auth.mjs';
import { requireRecaptcha, SITE_HOSTS, env } from '../lib/recaptcha.mjs';

// POST /api/contact  — contact form of both addresses (Vercel rewrites its /api/contact here).
// Replaces Netlify Forms: there is no longer any public form endpoint that skips these checks.
//   1. browser request from the site itself (Origin required)   2. size, type and field checks + honeypot
//   3. Google reCAPTCHA v3 (when RECAPTCHA_SECRET_KEY is set)    4. rate limits   5. e-mail via Resend
const json = (data, status = 200) => new Response(data == null ? null : JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }
});
const MIN = 60 * 1000, HOUR = 60 * MIN;
// global limits (all senders together): requests proxied by Vercel all share Vercel's address,
// so a per-address limit would block real visitors; reCAPTCHA filters bots before these counters.
const LIMITS = [['contact/hour', 20, HOUR], ['contact/day', 60, 24 * HOUR]];
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  let originHost = '';
  try { originHost = new URL(req.headers.get('origin') || '').host; } catch { /* missing / invalid */ }
  if (!SITE_HOSTS.includes(originHost)) return json({ error: 'forbidden' }, 403);
  const type = (req.headers.get('content-type') || '').split(';')[0].trim();
  if (type !== 'application/x-www-form-urlencoded') return json({ error: 'unsupported_media_type' }, 415);
  const raw = await req.text();
  if (raw.length > 20000) return json({ error: 'too_large' }, 413);
  const f = new URLSearchParams(raw);
  if (f.get('_gotcha')) return json(null, 204); // honeypot filled: pretend success
  const name = clean(f.get('name'), 100).trim();
  const email = String(f.get('email') || '').trim().slice(0, 200);
  const message = String(f.get('message') || '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, 5000);
  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 10) return json({ error: 'invalid_fields' }, 400);

  // client IP only when the request reaches Netlify directly (behind the Vercel rewrite it is Vercel's)
  const direct = originHost === new URL(req.url).host;
  const refused = await requireRecaptcha(f.get('recaptcha'), 'contact', direct ? context.ip : '', json);
  if (refused) return refused;

  if (!env('RESEND_API_KEY')) return json({ error: 'mail_not_configured' }, 503);
  const sec = secStore();
  for (const [key, max] of LIMITS) {
    const c = await count(sec, key);
    if (c && c.n >= max) return json({ error: 'too_many' }, 429);
  }
  for (const [key, , ttl] of LIMITS) await hit(sec, key, ttl);

  const sent = await sendMail(adminEmail(), 'Portfolio — message de ' + name,
    'Nouveau message depuis le formulaire de contact (' + originHost + ').\n\n' +
    'Nom : ' + name + '\nE-mail : ' + email + '\n\n' + message +
    '\n\n— Répondre à cet e-mail répond directement à l’expéditeur.', email);
  if (!sent.ok) { console.error('contact: e-mail not sent', sent); return json({ error: 'mail_failed' }, 502); }

  // form posted without JavaScript: go to the thank-you page
  if ((req.headers.get('sec-fetch-mode') || '') === 'navigate') return new Response(null, { status: 303, headers: { location: '/merci/' } });
  return json(null, 204);
};

export const config = { path: '/api/contact' };
