// Pure slot logic: no DOM, so it runs under `node --test`.

export const LABELS = ['CARB', 'PROTEIN', 'VEGGIE', 'FLAVOR', 'TOPPER', 'EXTRA'];

const i = (e, n) => ({ e, n });

export const POOLS = [
  [i('🍚', 'Jasmine Rice'), i('🍙', 'Brown Rice'), i('🌾', 'Couscous'), i('🥣', 'Quinoa'),
   i('🍠', 'Sweet Potato'), i('🥦', 'Cauli Rice'), i('🍝', 'Orzo'), i('🌰', 'Farro')],
  [i('🥩', 'Ground Beef'), i('🦃', 'Ground Turkey'), i('🌭', 'Chorizo'), i('🍗', 'Grilled Chicken'),
   i('🥩', 'Steak'), i('🐟', 'Salmon'), i('🦐', 'Shrimp'), i('🧈', 'Tofu'), i('🌮', 'Birria')],
  [i('🌽', 'Roast Corn'), i('🥦', 'Broccoli'), i('🫑', 'Bell Pepper'), i('🫘', 'Black Beans'),
   i('🥒', 'Cucumber'), i('🥬', 'Spinach'), i('🥗', 'Roast Zucchini'), i('🫛', 'Edamame')],
  [i('🍯', 'Hot Honey'), i('🌶️', 'Gochujang'), i('🧄', 'Garlic Butter'), i('🍶', 'Teriyaki'),
   i('🌶️', 'Chipotle Mayo'), i('🧂', 'Tajín'), i('🥯', 'Everything Bagel'), i('🔥', 'Buffalo')],
  [i('🍳', 'Fried Egg'), i('🥑', 'Avocado'), i('🍅', 'Salsa'), i('🧀', 'Cotija'),
   i('🥚', 'Jammy Egg'), i('🥑', 'Guac'), i('🧀', 'Feta'), i('🥬', 'Kimchi')],
  [i('🥒', 'Pickles'), i('🍅', 'Pico'), i('🧅', 'Crispy Onion'), i('🧅', 'Pickled Onion'),
   i('⚪', 'Sesame Seeds'), i('🌶️', 'Sriracha'), i('🥫', 'Yum Yum Sauce'), i('🧀', 'Hot Cheetos Dust')],
];

export const TITLES = ['HIGH ROLLER', 'HOOLIGAN', 'JACKPOT SPECIAL', 'BIG SPENDER', 'LUCKY SEVEN', 'WHALE'];

const pick = (list, rand) => list[Math.floor(rand() * list.length)];

// held[i] keeps prev[i]; everything else is a fresh random pick.
export function spin(pools, held, prev, rand) {
  return pools.map((pool, k) => (held[k] && prev ? prev[k] : pick(pool, rand)));
}

// Random item from pool that isn't `not` (for reel neighbours).
export function pickOther(pool, not, rand) {
  const rest = pool.filter((x) => x.n !== not.n);
  return pick(rest, rand);
}

export function bowlName(result, rand) {
  return `THE ${result[3].n.toUpperCase()} ${pick(TITLES, rand)}`;
}

export function recipeText(result, name) {
  return [`SLOP BOWL: ${name}`, ...result.map((it, k) => `${LABELS[k]}: ${it.n}`), 'slopslots'].join('\n');
}
