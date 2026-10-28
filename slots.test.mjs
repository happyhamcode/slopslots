import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POOLS, TABLES, ALLERGENS, tableById, poolsFor, emptyReels, ringOf, spin, pickOther, bowlName, recipeText, shareLinks, shareText } from './slots.js';

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

test('every table has a playable pool on every reel', () => {
  for (const t of TABLES) {
    const pools = poolsFor(t);
    pools.forEach((p, k) => assert.ok(p.length >= 3, `${t.id} reel ${k} has ${p.length}`));
  }
});

test('table rules hold', () => {
  const names = (t) => poolsFor(t).flat();
  assert.ok(!names(tableById('open')).some((it) => it.t.includes('x')));
  assert.ok(names(tableById('roller')).some((it) => it.t.includes('x')));
  assert.ok(poolsFor(tableById('roller'))[1].every((it) => it.t.includes('p')));
  assert.ok(names(tableById('keto')).every((it) => it.t.includes('k')));
  assert.ok(names(tableById('vault')).every((it) => it.t.includes('v')));
  assert.equal(tableById('nope').id, 'open');
});

test('allergen codes are all known', () => {
  const ids = ALLERGENS.map((a) => a.id);
  for (const it of POOLS.flat()) for (const c of it.a) assert.ok(ids.includes(c), `${it.n}: ${c}`);
});

test('avoiding an allergen removes every item that has it', () => {
  const open = tableById('open');
  for (const { id } of ALLERGENS) {
    const pools = poolsFor(open, [id]);
    assert.ok(pools.flat().every((it) => !it.a.includes(id)), id);
  }
  assert.deepEqual(emptyReels(poolsFor(open, ALLERGENS.map((a) => a.id))), []);
});

test('table + allergens can leave a reel empty, and short pools still scroll', () => {
  assert.ok(emptyReels([[], [1], []]).length === 2);
  assert.equal(ringOf([1]).length, 3);
  assert.ok(ringOf([1, 2]).length >= 3);
  assert.equal(pickOther([{ n: 'a' }], { n: 'a' }, () => 0).n, 'a');
});

test('no icon needs a new emoji font (Unicode 13+ shows as an empty box on older devices)', () => {
  for (const it of POOLS.flat()) {
    for (const ch of it.e) {
      const cp = ch.codePointAt(0);
      assert.ok(cp < 0x1faa0 || cp > 0x1faff, `${it.n} uses ${ch}`);
    }
    assert.ok(it.e.length > 0, it.n);
  }
});

test('blocked ingredients never appear, on any table', () => {
  const blocked = ['Bell Pepper', 'Steak', 'Pesto'];
  for (const t of TABLES) assert.ok(poolsFor(t, [], blocked).flat().every((it) => !blocked.includes(it.n)), t.id);
});

test('blocking a whole reel is detected', () => {
  const all = POOLS[2].map((it) => it.n);
  assert.deepEqual(emptyReels(poolsFor(tableById('open'), [], all)), [2]);
});

test('share links carry the text and url, encoded', () => {
  const links = shareLinks('a & b "c"', 'https://x.test/?q=1');
  assert.ok(links.length >= 5);
  for (const l of links) {
    assert.ok(l.href.startsWith('https://'), l.id);
    assert.ok(!l.href.includes(' ') && !l.href.includes('"'), l.id);
    assert.ok(l.href.includes(encodeURIComponent('a & b')), l.id);
  }
  assert.equal(shareText(spin(POOLS, none, null, seeded(7)), 'X').split(' + ').length, 6);
});
