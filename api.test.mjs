import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POOLS, TABLES, BASE_POOLS, applyConfig, cleanConfig, poolsFor, tableById, emptyReels } from './slots.js';
import { route } from './lib/api.js';

const mem = () => { const m = new Map(); return { get: async (k) => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); }, m }; };
const users = { adm: { id: '111111', name: 'Boss' }, joe: { id: '222222', name: 'Joe' } };
const mk = () => ({ store: mem(), discord: async (t) => users[t] ?? null, adminId: '111111' });
const cfg = { items: [{ r: 2, e: '🥕', n: 'Carrot', t: 'vk', a: '' }], hide: ['Bell Pepper'],
  tables: [{ id: 'carrot-club', name: 'carrot club', rule: 'carrots', e: '🥕', need: { 2: 'k' } }] };

test('config: anyone reads, only the admin writes, junk is rejected', async () => {
  const d = mk();
  assert.equal((await route({ method: 'GET', name: 'config' }, d)).status, 200);
  assert.equal((await route({ method: 'PUT', name: 'config', body: cfg }, d)).status, 401);
  assert.equal((await route({ method: 'PUT', name: 'config', token: 'joe', body: cfg }, d)).status, 403);
  assert.equal((await route({ method: 'PUT', name: 'config', token: 'adm', body: { items: [{ r: 9 }] } }, d)).status, 400);
  assert.equal((await route({ method: 'PUT', name: 'config', token: 'adm', body: cfg }, d)).status, 200);
  assert.equal((await route({ method: 'GET', name: 'config' }, d)).json.items[0].n, 'Carrot');
});

test('no admin id configured means nobody is admin', async () => {
  const d = { ...mk(), adminId: undefined };
  assert.equal((await route({ method: 'PUT', name: 'config', token: 'adm', body: cfg }, d)).status, 403);
  assert.equal((await route({ method: 'GET', name: 'me', token: 'adm' }, d)).json.admin, false);
});

test('settings are per user and store no identity', async () => {
  const d = mk();
  const s = { table: 'keto', avoid: ['g', 'zzz'], blocked: ['Steak'] };
  assert.equal((await route({ method: 'PUT', name: 'settings', token: 'joe', body: s }, d)).json.avoid.join(), 'g');
  assert.equal((await route({ method: 'GET', name: 'settings', token: 'adm' }, d)).json, null);
  assert.equal((await route({ method: 'GET', name: 'settings', token: 'joe' }, d)).json.table, 'keto');
  for (const [k, v] of d.store.m) assert.ok(!k.includes('222222') && !v.includes('222222') && !v.includes('Joe'));
});

test('applyConfig adds, hides, never empties a reel, and resets cleanly', () => {
  applyConfig(cfg);
  assert.ok(POOLS[2].some((it) => it.n === 'Carrot'));
  assert.ok(!POOLS[2].some((it) => it.n === 'Bell Pepper'));
  assert.ok(TABLES.some((t) => t.id === 'carrot-club'));
  applyConfig({ hide: BASE_POOLS[0].map((it) => it.n) });
  assert.ok(POOLS[0].length >= 3 && emptyReels(POOLS).length === 0);
  applyConfig({ items: [{ r: 0, e: '🍚', n: 'Jasmine Rice', t: '', a: '' }] });
  assert.equal(POOLS[0].filter((it) => it.n === 'Jasmine Rice').length, 1);
  applyConfig(null);
  assert.deepEqual(POOLS.map((p) => p.length), BASE_POOLS.map((p) => p.length));
  assert.equal(TABLES.length, 4);
});

test('cleanConfig rejects hostile tables', () => {
  for (const t of [{ id: 'open', name: 'x', rule: 'x', e: 'x' }, { id: 'Bad Id', name: 'x', rule: 'x', e: 'x' },
    { id: 'ok-id', name: 'x', rule: 'x', e: 'x', need: { 9: 'k' } }]) assert.throws(() => cleanConfig({ tables: [t] }));
});
