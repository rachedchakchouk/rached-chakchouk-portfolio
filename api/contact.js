import { MAIN, withTimeout } from './_main.js';
import { recaptchaEnabled, verifyRecaptcha, clientIp } from './_recaptcha.js';

// POST /api/contact on the mirror -> forwards the message to the main site's Netlify form "contact",
// so it arrives in Netlify -> Forms and by e-mail exactly like on the main site.
// Protected by Google reCAPTCHA v3 when RECAPTCHA_SECRET_KEY is set (see api/_recaptcha.js).
export async function POST(req) {
  // Browsers always send Origin on a POST: requests without it (scripts, bots) are refused.
  const origin = req.headers.get('origin');
  try { if (!origin || new URL(origin).host !== new URL(req.url).host) return new Response(null, { status: 403 }); }
  catch { return new Response(null, { status: 403 }); }
  const type = (req.headers.get('content-type') || '').split(';')[0].trim();
  if (type !== 'application/x-www-form-urlencoded') return new Response(null, { status: 415 });
  const raw = await req.text();
  if (raw.length > 20000) return new Response(null, { status: 413 });
  const f = new URLSearchParams(raw);
  if (f.get('_gotcha')) return new Response(null, { status: 204 }); // bot
  const name = (f.get('name') || '').trim().slice(0, 100);
  const email = (f.get('email') || '').trim().slice(0, 200);
  const message = (f.get('message') || '').trim().slice(0, 5000);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || message.length < 10) return new Response(null, { status: 400 });
  if (recaptchaEnabled()) {
    const check = await verifyRecaptcha(f.get('recaptcha'), { ip: clientIp(req), hostname: new URL(req.url).hostname });
    if (!check.ok) {
      console.warn('contact: reCAPTCHA refused (' + check.reason + (check.score != null ? ', score ' + check.score : '') + ')');
      const unavailable = check.reason.startsWith('verify_');
      return new Response(JSON.stringify({ error: unavailable ? 'captcha_unavailable' : 'captcha_failed' }), {
        status: unavailable ? 503 : 403, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
      });
    }
  }
  const t = withTimeout(8000);
  try {
    const body = new URLSearchParams({ 'form-name': 'contact', name, email, message: message + '\n\n(envoyé depuis rached-chakchouk.vercel.app)', _gotcha: '' });
    const r = await fetch(MAIN + '/', { method: 'POST', signal: t.signal, redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    return new Response(null, { status: r.status < 400 ? 204 : 502 });
  } catch {
    return new Response(null, { status: 502 });
  } finally { t.done(); }
}
