import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POOLS, spin, pickOther, bowlName, recipeText } from './slots.js';

const seeded = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const none = Array(6).fill(false);

test('pools are sane', () => {
  assert.equal(POOLS.length, 6);
  for (const p of POOLS) {
    assert.ok(p.length >= 6);
    assert.equal(new Set(p.map((x) => x.n)).size, p.length);
  }
});

test('spin picks from each pool and is repeatable', () => {
  const a = spin(POOLS, none, null, seeded(1));
  const b = spin(POOLS, none, null, seeded(1));
  assert.deepEqual(a, b);
  a.forEach((it, k) => assert.ok(POOLS[k].includes(it)));
});

test('held reels keep their value', () => {
  const prev = spin(POOLS, none, null, seeded(2));
  const held = [true, false, true, false, true, false];
  for (let s = 3; s < 30; s++) {
    const next = spin(POOLS, held, prev, seeded(s));
    held.forEach((h, k) => h && assert.equal(next[k], prev[k]));
  }
});

test('pickOther never returns the excluded item', () => {
  const r = seeded(9);
  for (let n = 0; n < 100; n++) assert.notEqual(pickOther(POOLS[0], POOLS[0][0], r).n, POOLS[0][0].n);
});

test('bowlName and recipeText', () => {
  const res = spin(POOLS, none, null, seeded(4));
  const name = bowlName(res, seeded(5));
  assert.ok(name.startsWith(`THE ${res[3].n.toUpperCase()} `));
  assert.equal(recipeText(res, name).split('\n').length, 8);
});
