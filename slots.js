// Pure slot logic: no DOM, so it runs under `node --test`.

export const LABELS = ['CARB', 'PROTEIN', 'VEGGIE', 'FLAVOR', 'TOPPER', 'EXTRA'];

// Allergen codes used in each item's `a` string. Best guess only: recipes vary, check labels.
export const ALLERGENS = [
  { id: 'g', name: 'GLUTEN' }, { id: 'd', name: 'DAIRY' }, { id: 'e', name: 'EGG' }, { id: 'f', name: 'FISH' },
  { id: 's', name: 'SHELLFISH' }, { id: 'y', name: 'SOY' }, { id: 'm', name: 'SESAME' }, { id: 'r', name: 'PORK' },
  { id: 'p', name: 'PEANUTS' }, { id: 'n', name: 'TREE NUTS' },
];

// t = diet tags: v vegan, k keto-friendly, p premium, x exclusive to the High Roller table.
// a = allergen codes (see ALLERGENS).
const i = (e, n, t = '', a = '') => ({ e, n, t, a });

export const POOLS = [
  [i('🍚', 'Jasmine Rice', 'v'), i('🍙', 'Brown Rice', 'v'), i('🌾', 'Couscous', 'v', 'g'), i('🥣', 'Quinoa', 'v'),
   i('🍠', 'Sweet Potato', 'v'), i('🥦', 'Cauli Rice', 'vk'), i('🍝', 'Orzo', 'v', 'g'), i('🌰', 'Farro', 'v', 'g'),
   i('🥒', 'Zucchini Noodles', 'vk'), i('🥬', 'Lettuce Wrap', 'vk'), i('🍄', 'Truffle Risotto', 'x', 'd')],
  [i('🥩', 'Ground Beef', 'k'), i('🦃', 'Ground Turkey', 'k'), i('🌭', 'Chorizo', 'k', 'r'), i('🍗', 'Grilled Chicken', 'k'),
   i('🥩', 'Steak', 'kp'), i('🐟', 'Salmon', 'kp', 'f'), i('🦐', 'Shrimp', 'kp', 's'), i('🧈', 'Tofu', 'vk', 'y'),
   i('🌮', 'Birria', 'kp'), i('🌱', 'Tempeh', 'vk', 'y'), i('🧆', 'Chickpeas', 'v'), i('🍲', 'Lentils', 'v'),
   i('🥩', 'Wagyu', 'kpx'), i('🦞', 'Lobster', 'kpx', 's')],
  [i('🌽', 'Roast Corn', 'v'), i('🥦', 'Broccoli', 'vk'), i('🌶️', 'Bell Pepper', 'vk'), i('🌰', 'Black Beans', 'v'),
   i('🥒', 'Cucumber', 'vk'), i('🥬', 'Spinach', 'vk'), i('🥗', 'Roast Zucchini', 'vk'), i('🟢', 'Edamame', 'vk', 'y'), i('🍄', 'Mushrooms', 'vk')],
  [i('🍯', 'Hot Honey', 'p'), i('🌶️', 'Gochujang', 'v', 'yg'), i('🧄', 'Garlic Butter', 'kp', 'd'), i('🍶', 'Teriyaki', 'v', 'yg'),
   i('🌶️', 'Chipotle Mayo', 'k', 'e'), i('🧂', 'Tajín', 'vk'), i('🥯', 'Everything Bagel', 'vk', 'gm'), i('🔥', 'Buffalo', 'k', 'd'),
   i('🍄', 'Truffle Aioli', 'kpx', 'e'), i('🥜', 'Peanut Sauce', 'v', 'py'), i('🌿', 'Pesto', 'k', 'nd')],
  [i('🍳', 'Fried Egg', 'k', 'e'), i('🥑', 'Avocado', 'vkp'), i('🍅', 'Salsa', 'vk'), i('🧀', 'Cotija', 'k', 'd'),
   i('🥚', 'Jammy Egg', 'kp', 'e'), i('🥑', 'Guac', 'vk'), i('🧀', 'Feta', 'k', 'd'), i('🥬', 'Kimchi', 'k', 'fs'),
   i('🧀', 'Burrata', 'kpx', 'd'), i('⚫', 'Caviar', 'kpx', 'f')],
  [i('🥒', 'Pickles', 'vk'), i('🍅', 'Pico', 'vk'), i('🧅', 'Crispy Onion', 'v', 'g'), i('🧅', 'Pickled Onion', 'vk'),
   i('⚪', 'Sesame Seeds', 'vk', 'm'), i('🌶️', 'Sriracha', 'vk'), i('🥫', 'Yum Yum Sauce', 'k', 'e'),
   i('🧀', 'Hot Cheetos Dust', '', 'd'), i('🥜', 'Crushed Peanuts', 'vk', 'p'), i('✨', 'Gold Flakes', 'x')],
];

// `need` maps a reel index to the tag its items must carry; `luxe` unlocks x-tagged items.
export const TABLES = [
  { id: 'open', name: 'OPEN FLOOR', rule: 'anything goes', e: '🎰', need: {} },
  { id: 'roller', name: 'HIGH ROLLER', rule: 'premium proteins, wagyu, caviar, gold', e: '🥩', luxe: true, need: { 1: 'p', 3: 'p', 4: 'p' } },
  { id: 'keto', name: 'KETO LOUNGE', rule: 'low-carb on every reel', e: '🔥', need: { 0: 'k', 1: 'k', 2: 'k', 3: 'k', 4: 'k', 5: 'k' } },
  { id: 'vault', name: 'VEGGIE VAULT', rule: '100% plant-based', e: '🌱', need: { 0: 'v', 1: 'v', 2: 'v', 3: 'v', 4: 'v', 5: 'v' } },
];

export const tableById = (id) => TABLES.find((t) => t.id === id) ?? TABLES[0];

// Pools for a table, minus anything containing an allergen id in `avoid` or named in `blocked`.
export const poolsFor = (table, avoid = [], blocked = []) =>
  POOLS.map((pool, k) => pool.filter((it) =>
    (table.luxe || !it.t.includes('x')) &&
    (!table.need[k] || it.t.includes(table.need[k])) &&
    !blocked.includes(it.n) &&
    !avoid.some((a) => it.a.includes(a))));

// Reel indexes with nothing left to spin.
export const emptyReels = (pools) => pools.flatMap((p, k) => (p.length ? [] : [k]));

export const TITLES = ['HIGH ROLLER', 'HOOLIGAN', 'JACKPOT SPECIAL', 'BIG SPENDER', 'LUCKY SEVEN', 'WHALE'];

const pick = (list, rand) => list[Math.floor(rand() * list.length)];

// held[i] keeps prev[i]; everything else is a fresh random pick.
export function spin(pools, held, prev, rand) {
  return pools.map((pool, k) => (held[k] && prev ? prev[k] : pick(pool, rand)));
}

// Random item from pool that isn't `not` (for reel neighbours); `not` itself if it's the only one.
export function pickOther(pool, not, rand) {
  const rest = pool.filter((x) => x.n !== not.n);
  return rest.length ? pick(rest, rand) : not;
}

// A reel needs at least 3 distinct rows to scroll cleanly, so short pools repeat.
export function ringOf(pool) {
  const ring = [...pool];
  while (ring.length < 3) ring.push(...pool);
  return ring;
}

export function bowlName(result, rand) {
  return `THE ${result[3].n.toUpperCase()} ${pick(TITLES, rand)}`;
}

export function recipeText(result, name, table = TABLES[0]) {
  return [
    `SLOP BOWL: ${name}`,
    ...(table.id === 'open' ? [] : [`TABLE: ${table.name}`]),
    ...result.map((it, k) => `${LABELS[k]}: ${it.n}`),
    'slopslots',
  ].join('\n');
}

export const SHARE_URL = 'https://slopslots.happyham.games';

export const shareText = (result, name) =>
  `I won dinner at SLOP SLOTS 🎰 "${name}": ${result.map((it) => it.n).join(' + ')}`;

// Intent URLs for the big networks. Discord has no share URL, so the app copies the text instead.
export function shareLinks(text, url = SHARE_URL) {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  return [
    { id: 'x', name: 'X', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { id: 'facebook', name: 'FACEBOOK', href: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}` },
    { id: 'reddit', name: 'REDDIT', href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { id: 'whatsapp', name: 'WHATSAPP', href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
    { id: 'telegram', name: 'TELEGRAM', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { id: 'bluesky', name: 'BLUESKY', href: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${text} ${url}`)}` },
  ];
}

/* ---------- owner config (admin page) + synced settings ---------- */
// Pristine built-ins, so the admin page can show what a config hides.
export const BASE_POOLS = POOLS.map((p) => [...p]);
const BASE_TABLE_COUNT = TABLES.length;
export const TAGS = [{ id: 'v', name: 'VEGAN' }, { id: 'k', name: 'KETO' }, { id: 'p', name: 'PREMIUM' }, { id: 'x', name: 'VIP ONLY' }];
export const EMPTY_CONFIG = { items: [], hide: [], tables: [] };

const str = (v, max, what) => {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`bad ${what}`);
  return v.trim();
};
const codes = (v, allowed, what) => {
  if (typeof v !== 'string' || [...v].some((c) => !allowed.includes(c))) throw new Error(`bad ${what}`);
  return [...new Set(v)].join('');
};
const list = (v, max, what) => {
  if (!Array.isArray(v) || v.length > max) throw new Error(`bad ${what}`);
  return v;
};

// Validates untrusted config (server and client both use this). Throws on anything odd.
export function cleanConfig(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('bad config');
  const tagIds = TAGS.map((t) => t.id);
  const allergenIds = ALLERGENS.map((a) => a.id);
  const items = list(raw.items ?? [], 60, 'items').map((it) => {
    if (!Number.isInteger(it?.r) || it.r < 0 || it.r >= LABELS.length) throw new Error('bad reel');
    return { r: it.r, e: str(it.e, 8, 'emoji'), n: str(it.n, 30, 'name'),
      t: codes(it.t ?? '', tagIds, 'tags'), a: codes(it.a ?? '', allergenIds, 'allergens') };
  });
  const hide = list(raw.hide ?? [], 200, 'hide').map((n) => str(n, 30, 'hide'));
  const tables = list(raw.tables ?? [], 8, 'tables').map((t) => {
    const need = {};
    for (const [k, tag] of Object.entries(t?.need ?? {})) {
      if (!(Number(k) >= 0 && Number(k) < LABELS.length) || !tagIds.includes(tag)) throw new Error('bad need');
      need[k] = tag;
    }
    const id = str(t.id, 20, 'table id');
    if (!/^[a-z0-9-]{2,20}$/.test(id) || ['open', 'roller', 'keto', 'vault'].includes(id)) throw new Error('bad table id');
    return { id, name: str(t.name, 20, 'table name').toUpperCase(), rule: str(t.rule, 60, 'rule'),
      e: str(t.e, 8, 'table emoji'), luxe: t.luxe === true, need };
  });
  if (new Set(tables.map((t) => t.id)).size !== tables.length) throw new Error('dup table');
  return { items, hide, tables };
}

// Rebuild POOLS/TABLES in place from the built-ins plus `cfg`. Never empties a reel or duplicates a name.
export function applyConfig(cfg) {
  const { items, hide, tables } = cleanConfig(cfg ?? EMPTY_CONFIG);
  const taken = new Set(BASE_POOLS.flat().map((it) => it.n));
  POOLS.forEach((pool, k) => {
    pool.length = 0;
    pool.push(...BASE_POOLS[k]);
  });
  for (const it of items) {
    if (taken.has(it.n)) continue;
    taken.add(it.n);
    POOLS[it.r].push(i(it.e, it.n, it.t, it.a));
  }
  POOLS.forEach((pool, k) => {
    for (const n of hide) {
      const at = pool.findIndex((it) => it.n === n);
      if (at >= 0 && pool.length > 3) pool.splice(at, 1);
    }
  });
  TABLES.length = BASE_TABLE_COUNT;
  TABLES.push(...tables);
}

// Per-user synced prefs (no profile data, just choices).
export function cleanSettings(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('bad settings');
  const allergenIds = ALLERGENS.map((a) => a.id);
  return {
    table: str(raw.table ?? 'open', 20, 'table'),
    avoid: list(raw.avoid ?? [], 20, 'avoid').filter((a) => allergenIds.includes(a)),
    blocked: list(raw.blocked ?? [], 200, 'blocked').map((n) => str(n, 30, 'blocked')),
  };
}
