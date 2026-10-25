// Pure slot logic: no DOM, so it runs under `node --test`.

export const LABELS = ['CARB', 'PROTEIN', 'VEGGIE', 'FLAVOR', 'TOPPER', 'EXTRA'];

// Allergen codes used in each item's `a` string. Best guess only: recipes vary, check labels.
export const ALLERGENS = [
  { id: 'g', name: 'GLUTEN' }, { id: 'd', name: 'DAIRY' }, { id: 'e', name: 'EGG' }, { id: 'f', name: 'FISH' },
  { id: 's', name: 'SHELLFISH' }, { id: 'y', name: 'SOY' }, { id: 'm', name: 'SESAME' }, { id: 'r', name: 'PORK' },
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
   i('🌮', 'Birria', 'kp'), i('🌱', 'Tempeh', 'vk', 'y'), i('🫘', 'Chickpeas', 'v'), i('🍲', 'Lentils', 'v'),
   i('🥩', 'Wagyu', 'kpx'), i('🦞', 'Lobster', 'kpx', 's')],
  [i('🌽', 'Roast Corn', 'v'), i('🥦', 'Broccoli', 'vk'), i('🫑', 'Bell Pepper', 'vk'), i('🫘', 'Black Beans', 'v'),
   i('🥒', 'Cucumber', 'vk'), i('🥬', 'Spinach', 'vk'), i('🥗', 'Roast Zucchini', 'vk'), i('🫛', 'Edamame', 'vk', 'y')],
  [i('🍯', 'Hot Honey', 'p'), i('🌶️', 'Gochujang', 'v', 'yg'), i('🧄', 'Garlic Butter', 'kp', 'd'), i('🍶', 'Teriyaki', 'v', 'yg'),
   i('🌶️', 'Chipotle Mayo', 'k', 'e'), i('🧂', 'Tajín', 'vk'), i('🥯', 'Everything Bagel', 'vk', 'gm'), i('🔥', 'Buffalo', 'k', 'd'),
   i('🍄', 'Truffle Aioli', 'kpx', 'e')],
  [i('🍳', 'Fried Egg', 'k', 'e'), i('🥑', 'Avocado', 'vkp'), i('🍅', 'Salsa', 'vk'), i('🧀', 'Cotija', 'k', 'd'),
   i('🥚', 'Jammy Egg', 'kp', 'e'), i('🥑', 'Guac', 'vk'), i('🧀', 'Feta', 'k', 'd'), i('🥬', 'Kimchi', 'k', 'fs'),
   i('🧀', 'Burrata', 'kpx', 'd'), i('⚫', 'Caviar', 'kpx', 'f')],
  [i('🥒', 'Pickles', 'vk'), i('🍅', 'Pico', 'vk'), i('🧅', 'Crispy Onion', 'v', 'g'), i('🧅', 'Pickled Onion', 'vk'),
   i('⚪', 'Sesame Seeds', 'vk', 'm'), i('🌶️', 'Sriracha', 'vk'), i('🥫', 'Yum Yum Sauce', 'k', 'e'),
   i('🧀', 'Hot Cheetos Dust', '', 'd'), i('✨', 'Gold Flakes', 'x')],
];

// `need` maps a reel index to the tag its items must carry; `luxe` unlocks x-tagged items.
export const TABLES = [
  { id: 'open', name: 'OPEN FLOOR', rule: 'anything goes', e: '🎰', need: {} },
  { id: 'roller', name: 'HIGH ROLLER', rule: 'premium proteins, wagyu, caviar, gold', e: '🥩', luxe: true, need: { 1: 'p', 3: 'p', 4: 'p' } },
  { id: 'keto', name: 'KETO LOUNGE', rule: 'low-carb on every reel', e: '🔥', need: { 0: 'k', 1: 'k', 2: 'k', 3: 'k', 4: 'k', 5: 'k' } },
  { id: 'vault', name: 'VEGGIE VAULT', rule: '100% plant-based', e: '🌱', need: { 0: 'v', 1: 'v', 2: 'v', 3: 'v', 4: 'v', 5: 'v' } },
];

export const tableById = (id) => TABLES.find((t) => t.id === id) ?? TABLES[0];

// Pools for a table, minus anything containing an allergen id listed in `avoid`.
export const poolsFor = (table, avoid = []) =>
  POOLS.map((pool, k) => pool.filter((it) =>
    (table.luxe || !it.t.includes('x')) &&
    (!table.need[k] || it.t.includes(table.need[k])) &&
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
