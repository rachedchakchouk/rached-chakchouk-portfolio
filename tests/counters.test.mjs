import test from 'node:test';
import assert from 'node:assert/strict';
import { hit, count, clearHits } from '../netlify/lib/analytics.mjs';
import { memoryStore } from './memory-store.mjs';

test('parallel hits are all counted (no lost update)', async () => {
  const s = memoryStore();
  await Promise.all(Array.from({ length: 25 }, () => hit(s, 'login-fail/abc', 60000)));
  assert.equal((await count(s, 'login-fail/abc')).n, 25);
});

test('expired hits are ignored and cleaned up', async () => {
  const s = memoryStore(), now = Date.now();
  await hit(s, 'k', 1000, now - 5000);
  await hit(s, 'k', 60000, now);
  const c = await count(s, 'k', now);
  assert.equal(c.n, 1);
  assert.ok(c.until > now);
  await new Promise(r => setTimeout(r, 10));
  assert.equal((await s.list({ prefix: 'k/' })).blobs.length, 1);
});

test('counters with a common prefix stay separate', async () => {
  const s = memoryStore();
  await hit(s, 'forgot/all', 60000);
  await hit(s, 'forgot/a', 60000);
  await hit(s, 'forgot/ab', 60000);
  assert.equal((await count(s, 'forgot/a')).n, 1);
  assert.equal((await count(s, 'forgot/all')).n, 1);
});

test('clearHits resets a counter', async () => {
  const s = memoryStore();
  await hit(s, 'x', 60000); await hit(s, 'x', 60000);
  await clearHits(s, 'x');
  assert.equal(await count(s, 'x'), null);
});
