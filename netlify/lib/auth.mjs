import { getStore } from '@netlify/blobs';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { safeEqual } from './analytics.mjs';

// Admin password state, kept in the "security" blob store under "auth/state":
//   { hash?: 's1$<salt>$<key>', gen: <number>, temp?: { hash, exp } }
// - hash: password set from the dashboard (overrides DASHBOARD_PASSWORD once set)
// - gen:  bumped on every password change -> all existing sessions are invalidated
// - temp: one-time temporary password sent by e-mail ("mot de passe oublié"), 15 min
const KEY = 'auth/state';
export const TEMP_TTL = 15 * 60 * 1000;
export const MIN_LEN = 10;
export const DEFAULT_ADMIN_EMAIL = 'rached.chakchouk@esprit.tn';

const N = 16384, R = 8, P = 1, LEN = 32;
const kdf = (pw, salt) => new Promise((ok, ko) => scrypt(String(pw), salt, LEN, { N, r: R, p: P }, (e, k) => e ? ko(e) : ok(k)));

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  return 's1$' + salt.toString('base64url') + '$' + (await kdf(pw, salt)).toString('base64url');
}
export async function verifyHash(pw, stored) {
  const [v, s, k] = String(stored || '').split('$');
  if (v !== 's1' || !s || !k) return false;
  const want = Buffer.from(k, 'base64url'), got = await kdf(pw, Buffer.from(s, 'base64url'));
  return want.length === got.length && timingSafeEqual(want, got);
}

export const secStore = () => getStore('security');
export async function loadState(store = secStore()) {
  const s = await store.get(KEY, { type: 'json' }).catch(() => null);
  return s && typeof s === 'object' ? { gen: 0, ...s } : { gen: 0 };
}
export const saveState = (state, store = secStore()) => store.setJSON(KEY, state);

// Key used to sign session tokens: master env secret + generation counter.
export function signingKey(state) {
  const env = Netlify.env.get('DASHBOARD_PASSWORD');
  return env ? env + '|g' + (state.gen || 0) : null;
}
// Convenience for protected endpoints.
export async function adminKey() {
  if (!Netlify.env.get('DASHBOARD_PASSWORD')) return null;
  return signingKey(await loadState());
}

// 'main' | 'temp' | false
export async function checkPassword(pw, state) {
  if (typeof pw !== 'string' || !pw || pw.length > 200) return false;
  const main = state.hash ? await verifyHash(pw, state.hash) : safeEqual(pw, Netlify.env.get('DASHBOARD_PASSWORD') || '');
  if (main) return 'main';
  if (state.temp && state.temp.exp > Date.now() && await verifyHash(pw, state.temp.hash)) return 'temp';
  return false;
}

// Readable temporary password (no 0/O/1/l/I), ~71 bits of entropy.
export function makeTempPassword() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const b = randomBytes(12);
  let s = '';
  for (let i = 0; i < 12; i++) s += A[b[i] % A.length];
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8);
}

export function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < MIN_LEN) return 'too_short';
  if (pw.length > 200) return 'too_long';
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(pw)).length;
  if (kinds < 3) return 'too_simple';
  return null;
}

export const adminEmail = () => Netlify.env.get('ADMIN_EMAIL') || DEFAULT_ADMIN_EMAIL;
export const maskEmail = (e) => e.replace(/^(.)[^@]*(@.*)$/, '$1•••$2');

// E-mail through Resend (https://resend.com) — needs RESEND_API_KEY in Netlify env.
export async function sendMail(to, subject, text) {
  const key = Netlify.env.get('RESEND_API_KEY');
  if (!key) return { ok: false, reason: 'mail_not_configured' };
  const from = Netlify.env.get('MAIL_FROM') || 'Portfolio Rached <onboarding@resend.dev>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text })
  }).catch(() => null);
  return r && r.ok ? { ok: true } : { ok: false, reason: 'mail_failed', status: r ? r.status : 0 };
}

export function sameOrigin(req) {
  const o = req.headers.get('origin');
  if (!o) return true;
  try { return new URL(o).host === new URL(req.url).host; } catch { return false; }
}
