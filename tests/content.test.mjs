import test from 'node:test';
import assert from 'node:assert/strict';
import { safeUrl, sanitizeContent, makeToken, verifyToken, checkUpload, safeEqual } from '../netlify/lib/analytics.mjs';

test('dangerous URLs are removed from edited content', () => {
  for (const u of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,x', '//evil.example/x', 'vbscript:x']) assert.equal(safeUrl(u), '');
  for (const u of ['https://github.com/x', '/projects/a.png', '#contact']) assert.equal(safeUrl(u), u);
  assert.equal(sanitizeContent({ url: 'javascript:alert(1)', shots: ['javascript:x', '/a.png'] }).url, '');
  assert.deepEqual(sanitizeContent({ shots: ['javascript:x', '/a.png'] }).shots, ['/a.png']);
});
test('session tokens: valid, expired, forged, other secret', async () => {
  const { token } = await makeToken('s3cret');
  assert.equal(await verifyToken(token, 's3cret'), 'm');
  assert.equal(await verifyToken(token, 'other'), false);
  assert.equal(await verifyToken(token.replace('.m.', '.t.'), 's3cret'), false);
  assert.equal(await verifyToken(token, 's3cret', Date.now() + 3 * 3600 * 1000), false);
});
test('uploads are checked by real file signature', () => {
  assert.equal(checkUpload('cv-fr.pdf', new TextEncoder().encode('<html>')).error, 'not_pdf');
  assert.equal(checkUpload('photo', new TextEncoder().encode('%PDF-1.7')).error, 'not_image');
  assert.equal(checkUpload('cv-fr.pdf', new TextEncoder().encode('%PDF-1.7 x')).type, 'application/pdf');
  assert.equal(checkUpload('../etc/passwd', new Uint8Array([1])).error, 'unknown_slot');
});
test('constant-time comparison', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
});
