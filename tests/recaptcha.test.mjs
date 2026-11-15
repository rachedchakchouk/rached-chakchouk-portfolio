import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyRecaptcha, requireRecaptcha } from '../netlify/lib/recaptcha.mjs';

const TK = 'x'.repeat(40);
const ok = (extra = {}) => ({ success: true, action: 'contact', hostname: 'rached-chakchouk.vercel.app', score: 0.9, challenge_ts: new Date().toISOString(), ...extra });
const g = (data, status = 200) => async () => ({ ok: status < 400, status, json: async () => data });
const v = (data, o = {}) => verifyRecaptcha(o.token ?? TK, { action: 'contact', fetchImpl: g(data, o.status), ...o });

test.beforeEach(() => { process.env.RECAPTCHA_SECRET_KEY = 'secret'; delete process.env.RECAPTCHA_MIN_SCORE; });
test.after(() => { delete process.env.RECAPTCHA_SECRET_KEY; });

test('valid token accepted, secret and ip sent to Google', async () => {
  let body;
  const r = await verifyRecaptcha(TK, { action: 'contact', ip: '1.2.3.4', fetchImpl: async (u, o) => { body = o.body; return g(ok())(); } });
  assert.equal(r.ok, true);
  assert.match(body, /secret=secret/); assert.match(body, /remoteip=1\.2\.3\.4/);
});
test('both site addresses are accepted', async () => {
  assert.equal((await v(ok({ hostname: 'rached-chakchouk.netlify.app' }))).ok, true);
});
test('refusals', async () => {
  assert.equal((await v(ok(), { token: '' })).reason, 'missing_token');
  assert.equal((await v(ok(), { token: 'bad token!' })).reason, 'missing_token');
  assert.equal((await v({ success: false })).reason, 'invalid_token');
  assert.equal((await v(ok({ action: 'login' }))).reason, 'wrong_action');
  assert.equal((await v(ok({ hostname: 'evil.example' }))).reason, 'wrong_hostname');
  assert.equal((await v(ok({ challenge_ts: new Date(Date.now() - 600000).toISOString() }))).reason, 'expired');
  assert.equal((await v(ok({ score: 0.2 }))).reason, 'low_score');
  assert.equal((await v(ok(), { status: 500 })).reason, 'verify_http_500');
  assert.equal((await verifyRecaptcha(TK, { action: 'contact', fetchImpl: async () => { throw new Error('net'); } })).reason, 'verify_unreachable');
});
test('RECAPTCHA_MIN_SCORE is honoured', async () => {
  process.env.RECAPTCHA_MIN_SCORE = '0.1';
  assert.equal((await v(ok({ score: 0.2 }))).ok, true);
  process.env.RECAPTCHA_MIN_SCORE = 'nonsense';
  assert.equal((await v(ok({ score: 0.2 }))).reason, 'low_score');
});
test('not configured: verify refuses, requireRecaptcha lets the request through', async () => {
  delete process.env.RECAPTCHA_SECRET_KEY;
  assert.equal((await v(ok())).reason, 'not_configured');
  assert.equal(await requireRecaptcha('', 'contact', '', () => 'refused'), null);
});
test('requireRecaptcha: 403 on a bad token', async () => {
  const res = await requireRecaptcha('', 'login', '', (d, s) => ({ d, s }));
  assert.deepEqual(res, { d: { error: 'captcha_failed' }, s: 403 });
});
