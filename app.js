import {
  TABLES, POOLS, ALLERGENS, LABELS, tableById, poolsFor, emptyReels, ringOf,
  spin, bowlName, recipeText, shareLinks, shareText, SHARE_URL,
  BASE_POOLS, TAGS, EMPTY_CONFIG, applyConfig, cleanConfig, cleanSettings,
} from './slots.js';
import { ICONS as BRAND } from './icons.js';

const $ = (s) => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
// Public id of the Discord application. Empty = login hidden. Register this site's origin + "/" as its redirect.
const DISCORD_CLIENT_ID = '1566779549105266698';

let onSet = () => {};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } onSet(k); },
};

/* ---------- owner config: extra ingredients, hidden ones, custom tables ---------- */
let config = EMPTY_CONFIG;
try {
  const r = await fetch('/api/config', { signal: AbortSignal.timeout(2000) });
  if (r.ok) { config = cleanConfig(await r.json()); applyConfig(config); }
} catch { /* built-ins only: the site never depends on the API */ }

const START_CREDITS = 20;
const ICONS = ['👑', '💎', '🎰', '🔥'];
const FAKE = [
  { who: 'sk8rgrl99', name: 'Teriyaki Tofu Bowl' }, { who: 'DaRkAnGeL', name: 'Birria + Rice' },
  { who: 'mom_of_3', name: 'Quinoa Chaos' }, { who: '~*brad*~', name: 'Gochujang Beef' },
];

/* ---------- state ---------- */
let table = tableById(store.get('table', 'open'));
let avoid = store.get('avoid', []).filter((a) => ALLERGENS.some((x) => x.id === a));
const known = (n) => POOLS.some((p) => p.some((it) => it.n === n));
let blocked = store.get('blocked', []).filter(known);
let pools = poolsFor(table, avoid, blocked);
if (emptyReels(pools).length) { table = TABLES[0]; avoid = []; blocked = []; pools = poolsFor(table, avoid, blocked); }
let rings = pools.map(ringOf);

const randomItem = (k) => pools[k][Math.floor(rand() * pools[k].length)];
const neighbors = (k, item) => {
  const ring = rings[k];
  const L = ring.length;
  const idx = ring.indexOf(item);
  return [ring[(idx - 1 + L) % L], item, ring[(idx + 1) % L]];
};

// Saved locks are item names; keep the ones still on this table.
const savedLocks = store.get('locks', []);
let held = LABELS.map((_, k) => pools[k].some((it) => it.n === savedLocks[k]));
let current = LABELS.map((_, k) => (held[k] ? pools[k].find((it) => it.n === savedLocks[k]) : randomItem(k)));
let rest = current.map((it, k) => neighbors(k, it));
let next = current;

let credits = store.get('credits', START_CREDITS);
let won = store.get('won', 0);
let streak = store.get('streak', 0);
let history = store.get('history', FAKE);
let muted = store.get('muted', false);
let spinning = false;
let cal = 1337420;

const saveLocks = () => store.set('locks', held.map((h, k) => (h ? current[k].n : null)));

/* ---------- DOM build ---------- */
const sym = (it, dim) => {
  const d = document.createElement('div');
  d.className = 'sym' + (dim ? ' dim' : '');
  const e = document.createElement('span');
  e.className = 'e'; e.textContent = it.e;
  d.append(e, it.n);
  return d;
};

const cols = LABELS.map((label, k) => {
  const col = document.createElement('div');
  const plate = Object.assign(document.createElement('button'), { className: 'plate', type: 'button', textContent: `${label} ▾` });
  plate.setAttribute('aria-label', `Choose a ${label} and lock it`);
  plate.onclick = () => openPicker(k);
  const reel = Object.assign(document.createElement('div'), { className: 'reel' });
  const strip = Object.assign(document.createElement('div'), { className: 'strip' });
  reel.append(strip);
  const hold = Object.assign(document.createElement('button'), { className: 'hold', type: 'button' });
  hold.setAttribute('aria-pressed', 'false');
  hold.onclick = () => {
    if (spinning) { stopReel(k); return; }
    held[k] = !held[k];
    saveLocks();
    paintHold(k, 'hold');
  };
  col.append(plate, reel, hold);
  $('#reels').append(col);
  return { reel, strip, hold, plate };
});
$('#reels').append(Object.assign(document.createElement('div'), { className: 'payline' }));

$('#bulbs').append(...Array.from({ length: 30 }, (_, n) => {
  const b = document.createElement('i'); b.style.setProperty('--n', n); return b;
}));

/* ---------- reel geometry ---------- */
const center = (strip, idx) => {
  const row = strip.firstElementChild.offsetHeight;
  return (strip.parentElement.clientHeight - row) / 2 - idx * row;
};
function paint(k) {
  const { strip } = cols[k];
  strip.replaceChildren(...rest[k].map((it, n) => sym(it, n !== 1)));
  strip.style.transform = `translateY(${center(strip, 1)}px)`;
}
const paintAll = () => cols.forEach((_, k) => paint(k));

/* Manual stop: a reel free-runs over its ring (4 cycles tall, wrapping between
   cycles 2 and 3) until stopReel() eases it onto its precomputed result. */
const SPEED = 14; // rows per second while spinning
const STOP_MS = reduce ? 0 : 700;
const runners = [];

function startReel(k) {
  const { reel, strip } = cols[k];
  const ring = rings[k];
  const L = ring.length;
  strip.replaceChildren(...Array.from({ length: L * 4 }, (_, n) => sym(ring[n % L], false)));
  const r = { p: L + Math.floor(rand() * L), t: performance.now(), stopping: false };
  r.done = new Promise((res) => { r.finish = res; });
  runners[k] = r;
  if (!reduce) reel.classList.add('moving');
  const frame = (now) => {
    r.p += ((now - r.t) / 1000) * SPEED;
    r.t = now;
    if (r.p >= 2 * L) r.p -= L;
    strip.style.transform = `translateY(${center(strip, r.p)}px)`;
    r.raf = requestAnimationFrame(frame);
  };
  r.raf = requestAnimationFrame(frame);
}

function stopReel(k) {
  const r = runners[k];
  if (!r || r.stopping) return;
  r.stopping = true;
  cancelAnimationFrame(r.raf);
  const { reel, strip, hold } = cols[k];
  hold.disabled = true;
  const L = rings[k].length;
  const item = next[k];
  let final = L + rings[k].indexOf(item);
  while (final < r.p + 2) final += L;
  const anim = strip.animate(
    [{ transform: `translateY(${center(strip, r.p)}px)` }, { transform: `translateY(${center(strip, final)}px)` }],
    { duration: STOP_MS, easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'forwards' },
  );
  setTimeout(() => reel.classList.remove('moving'), STOP_MS * 0.5);
  anim.finished.then(() => {
    anim.cancel();
    rest[k] = neighbors(k, item);
    paint(k);
    reel.classList.remove('moving');
    tone(300 + k * 60, 0.07, 'square', 0.04);
    r.finish();
  });
}

const stopNext = () => {
  const k = runners.findIndex((r, n) => r && !held[n] && !r.stopping);
  if (k >= 0) stopReel(k);
};

/* ---------- sound ---------- */
let ac;
function unlock() {
  try { ac ??= new AudioContext(); if (ac.state === 'suspended') ac.resume(); } catch { /* no audio */ }
}
function tone(freq, dur = 0.08, type = 'square', vol = 0.05, at = 0) {
  if (muted || !ac) return;
  const t = ac.currentTime + at;
  const o = ac.createOscillator(); const g = ac.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
}
const muteBtn = $('#mute');
const paintMute = () => { muteBtn.textContent = muted ? 'SOUND: OFF' : 'SOUND: ON'; };
muteBtn.onclick = () => { muted = !muted; store.set('muted', muted); paintMute(); };

/* ---------- panels ---------- */
function renderPanels() {
  $('#credits').textContent = credits;
  $('#won').textContent = won;
  $('#streak').textContent = 'x' + streak;
  $('#winners').replaceChildren(...history.slice(0, 4).map((h, n) => {
    const row = Object.assign(document.createElement('div'), { className: 'row' });
    const e = Object.assign(document.createElement('span'), { className: 'e', textContent: ICONS[n % 4] });
    const t = document.createElement('span');
    t.append(Object.assign(document.createElement('b'), { textContent: h.who }), document.createElement('br'), h.name);
    row.append(e, t);
    return row;
  }));
}
setInterval(() => {
  cal += 1 + Math.floor(rand() * 40);
  $('#cal').textContent = cal.toLocaleString('en-US');
}, 900);

/* ---------- tables, allergies, reel picker ---------- */
const msg = (t) => { $('#msg').textContent = t; };

for (const t of TABLES) {
  const chip = Object.assign(document.createElement('button'), { className: 'chip', type: 'button', textContent: `${t.e} ${t.name}` });
  chip.dataset.table = t.id;
  chip.onclick = () => setTable(t.id);
  $('#tables').append(chip);

  const row = document.createElement('button');
  row.type = 'button'; row.className = 'row tbl'; row.dataset.table = t.id;
  const e = Object.assign(document.createElement('span'), { className: 'e', textContent: t.e });
  const txt = document.createElement('span');
  txt.append(Object.assign(document.createElement('b'), { textContent: t.name }), document.createElement('br'), t.rule);
  row.append(e, txt);
  row.onclick = () => setTable(t.id);
  $('#tables-list').append(row);
}
const ingsBtn = Object.assign(document.createElement('button'), { className: 'chip warn', type: 'button', id: 'ings-btn' });
ingsBtn.onclick = () => { renderIngs(); $('#ings').showModal(); };
$('#tables').append(ingsBtn);

function renderTables() {
  document.querySelectorAll('[data-table]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.table === table.id)));
  const hidden = avoid.length + blocked.length;
  ingsBtn.textContent = `🥄 EDIT INGREDIENTS${hidden ? ` (${hidden})` : ''}`;
}

// Pools changed (table or allergies): drop locks that no longer fit, re-roll reels showing banned items.
function rebuild() {
  rings = pools.map(ringOf);
  cols.forEach((_, k) => {
    if (!pools[k].includes(current[k])) { held[k] = false; current[k] = randomItem(k); }
    rest[k] = neighbors(k, current[k]);
    paintHold(k, 'hold');
  });
  next = current;
  paintAll();
  renderTables();
  saveLocks();
}

function setTable(id) {
  if (spinning) return;
  const t = tableById(id);
  const np = poolsFor(t, avoid, blocked);
  const bad = emptyReels(np);
  if (bad.length) { msg(`${t.name} HAS NO ${LABELS[bad[0]]} FOR YOUR AVOIDS`); return; }
  table = t; pools = np;
  store.set('table', t.id);
  rebuild();
  msg(`WELCOME TO ${t.name}`);
}

const allergyOpts = $('#allergy-opts');
for (const a of ALLERGENS) {
  const cb = Object.assign(document.createElement('input'), { type: 'checkbox', value: a.id, checked: avoid.includes(a.id) });
  cb.onchange = () => {
    const wanted = [...allergyOpts.querySelectorAll('input:checked')].map((c) => c.value);
    const np = poolsFor(table, wanted, blocked);
    const bad = emptyReels(np);
    if (bad.length) {
      cb.checked = !cb.checked;
      ingsErr(`NOTHING LEFT ON ${LABELS[bad[0]]} AT ${table.name}. TRY ANOTHER TABLE.`);
      return;
    }
    ingsErr('');
    avoid = wanted; pools = np;
    store.set('avoid', avoid);
    rebuild();
    renderIngs();
  };
  const label = Object.assign(document.createElement('label'), { className: 'chk' });
  label.append(cb, ` ${a.name}`);
  allergyOpts.append(label);
}

/* ---------- ingredient picker (per-reel blacklist) ---------- */
let ingReel = 0;
const ingsErr = (t) => { $('#ings-err').textContent = t; };

// Apply a new blocked list unless it would empty a reel. Returns whether it applied.
function applyBlocked(next) {
  const np = poolsFor(table, avoid, next);
  const bad = emptyReels(np);
  if (bad.length) { ingsErr(`NEED AT LEAST ONE ${LABELS[bad[0]]} AT ${table.name}.`); return false; }
  ingsErr('');
  blocked = next; pools = np;
  store.set('blocked', blocked);
  rebuild();
  return true;
}

function renderIngs() {
  const opts = poolsFor(table, avoid)[ingReel];
  $('#ings-tabs').replaceChildren(...LABELS.map((label, k) => {
    const b = Object.assign(document.createElement('button'), { className: 'opt tab', type: 'button', textContent: label });
    b.setAttribute('aria-pressed', String(k === ingReel));
    b.onclick = () => { ingReel = k; ingsErr(''); renderIngs(); };
    return b;
  }));
  $('#ings-opts').replaceChildren(...opts.map((it) => {
    const cb = Object.assign(document.createElement('input'), { type: 'checkbox', checked: blocked.includes(it.n) });
    cb.onchange = () => {
      if (!applyBlocked(cb.checked ? [...blocked, it.n] : blocked.filter((n) => n !== it.n))) cb.checked = !cb.checked;
    };
    const label = Object.assign(document.createElement('label'), { className: 'chk' });
    label.append(cb, ' ', Object.assign(document.createElement('span'), { className: 'e', textContent: it.e }), ` ${it.n}`);
    return label;
  }));
}
$('#ings-reset').onclick = () => {
  allergyOpts.querySelectorAll('input').forEach((c) => { c.checked = false; });
  avoid = []; blocked = []; pools = poolsFor(table, avoid, blocked);
  store.set('avoid', avoid); store.set('blocked', blocked);
  ingsErr('');
  rebuild();
  renderIngs();
};
$('#ings-ok').onclick = () => $('#ings').close();

function setLock(k, item) {
  if (item) { held[k] = true; current[k] = item; rest[k] = neighbors(k, item); paint(k); } else held[k] = false;
  paintHold(k, 'hold');
  saveLocks();
  $('#picker').close();
}
function openPicker(k) {
  if (spinning) return;
  $('#picker-title').textContent = `SET ${LABELS[k]}`;
  const any = Object.assign(document.createElement('button'), { className: 'opt any', type: 'button', textContent: '🎲 ANY (UNLOCK)' });
  any.setAttribute('aria-pressed', String(!held[k]));
  any.onclick = () => setLock(k, null);
  $('#picker-opts').replaceChildren(any, ...pools[k].map((it) => {
    const b = Object.assign(document.createElement('button'), { className: 'opt', type: 'button', textContent: `${it.e} ${it.n}` });
    b.setAttribute('aria-pressed', String(held[k] && current[k] === it));
    b.onclick = () => setLock(k, it);
    return b;
  }));
  $('#picker').showModal();
}
$('#picker-close').onclick = () => $('#picker').close();

/* ---------- spin ---------- */
const setBusy = (b) => {
  spinning = b;
  $('#machine').classList.toggle('busy', b);
  for (const id of ['#spin', '#max', '#again']) $(id).disabled = b;
  document.querySelectorAll('.plate, [data-table], #ings-btn').forEach((x) => { x.disabled = b; });
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const JACKPOT_DELAY_MS = 500;

// HOLD buttons double as STOP buttons while the reels run.
function paintHold(k, mode) {
  const { hold } = cols[k];
  hold.classList.toggle('stop', mode === 'stop');
  hold.disabled = mode === 'off';
  hold.setAttribute('aria-pressed', String(held[k]));
  hold.textContent = mode === 'stop' ? 'STOP' : held[k] ? 'HELD' : 'HOLD';
  hold.setAttribute('aria-label', `${mode === 'stop' ? 'Stop' : 'Hold'} ${LABELS[k]} reel`);
}

async function doSpin() {
  if (spinning) return;
  unlock();
  const dlg = $('#win');
  if (dlg.open) dlg.close();
  setBusy(true);
  const refill = credits <= 0;
  if (refill) credits = START_CREDITS;
  credits--;
  renderPanels();
  next = spin(pools, held, current, rand);
  $('#lever').classList.add('pulled');
  setTimeout(() => $('#lever').classList.remove('pulled'), 300);
  tone(180, 0.15, 'sawtooth', 0.05);
  const live = [];
  cols.forEach((_, k) => {
    if (held[k]) { paintHold(k, 'off'); return; }
    startReel(k);
    paintHold(k, 'stop');
    live.push(runners[k].done);
  });
  msg((refill ? 'FREE REFILL! ' : '') + (live.length ? 'PRESS STOP ON EACH REEL' : ''));
  const spinBtn = $('#spin');
  if (live.length) { spinBtn.textContent = 'STOP ALL'; spinBtn.disabled = false; }
  await Promise.all(live);
  spinBtn.textContent = 'SPIN';
  spinBtn.disabled = true;
  current = next;
  cols.forEach((_, k) => paintHold(k, 'off'));
  msg('CALCULATING SLOP…');
  await sleep(JACKPOT_DELAY_MS);
  msg('');
  cols.forEach((_, k) => paintHold(k, 'hold'));
  finish();
}

function finish() {
  const name = bowlName(current, rand);
  won++;
  streak = /rice/i.test(current[0].n) ? 0 : streak + 1;
  history = [{ who: 'YOU', name: name.replace(/^THE /, '') }, ...history].slice(0, 4);
  store.set('credits', credits); store.set('won', won); store.set('streak', streak); store.set('history', history);
  renderPanels();
  setBusy(false);
  showWin(name);
}

function showWin(name) {
  $('#win-title').textContent = table.id === 'open' ? '★ YOUR SLOP BOWL ★' : `★ ${table.name} BOWL ★`;
  $('#win-name').textContent = `"${name}"`;
  $('#win-table').replaceChildren(...current.map((it, k) => {
    const tr = document.createElement('tr');
    const th = Object.assign(document.createElement('th'), { textContent: LABELS[k] });
    th.scope = 'row';
    tr.append(th,
      Object.assign(document.createElement('td'), { className: 'e', textContent: it.e }),
      Object.assign(document.createElement('td'), { className: 'n', textContent: it.n.toUpperCase() }));
    return tr;
  }));
  $('#coins').replaceChildren(...Array.from({ length: 6 }, () => {
    const c = document.createElement('span');
    c.className = 'coin';
    c.style.cssText = `--s:${26 + Math.floor(rand() * 40)}px;` +
      (rand() < 0.5 ? `left:${-40 + rand() * 30}px;` : `right:${-40 + rand() * 30}px;`) +
      (rand() < 0.5 ? `top:${rand() * 60 + 20}%;` : `bottom:${-30 + rand() * 20}px;`) +
      `animation-delay:${-rand() * 1.6}s`;
    return c;
  }));
  $('#win').showModal();
  [523, 659, 784, 1047].forEach((f, n) => tone(f, 0.18, 'triangle', 0.08, n * 0.12));
  $('#again').focus();
}

/* ---------- discord login, synced settings, admin ---------- */
const SYNCED = ['table', 'avoid', 'blocked'];
let session = store.get('session', null); // { token, exp }
let me = null; // { name, admin }
let pulling = false;
let pushTimer;

const api = async (path, method = 'GET', body) => {
  const r = await fetch(`/api/${path}`, {
    method, body: body && JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
  });
  if (!r.ok) throw Object.assign(new Error((await r.json().catch(() => ({}))).error ?? 'request failed'), { status: r.status });
  return r.json();
};

function takeLoginRedirect() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (!h.get('access_token')) return;
  window.history.replaceState(null, '', location.pathname + location.search); // not `history`: that's the spin log above
  if (!h.get('state') || h.get('state') !== store.get('oauth', null)) return;
  store.set('oauth', null);
  session = { token: h.get('access_token'), exp: Date.now() + Number(h.get('expires_in') || 0) * 1000 };
  store.set('session', session);
}

function renderAcct() {
  $('#acct').hidden = !DISCORD_CLIENT_ID;
  $('#who').textContent = me ? `HI ${me.name.toUpperCase()}` : '';
  $('#admin-btn').hidden = !me?.admin;
  $('#login').textContent = me ? 'LOG OUT' : 'LOGIN WITH DISCORD';
}

$('#login').onclick = () => {
  if (me) { session = null; me = null; store.set('session', null); renderAcct(); return; }
  const state = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  store.set('oauth', state);
  location.href = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&scope=identify&state=${state}&redirect_uri=${encodeURIComponent(`${location.origin}/`)}`;
};

function pushSettings() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => api('settings', 'PUT', { table: table.id, avoid, blocked }).catch(() => {}), 800);
}
onSet = (k) => { if (session && !pulling && SYNCED.includes(k)) pushSettings(); };

function applyRemote(raw) {
  const s = cleanSettings(raw);
  const bl = s.blocked.filter(known);
  const t = tableById(s.table);
  const np = poolsFor(t, s.avoid, bl);
  if (emptyReels(np).length || spinning) return;
  pulling = true;
  table = t; avoid = s.avoid; blocked = bl; pools = np;
  store.set('table', t.id); store.set('avoid', avoid); store.set('blocked', blocked);
  pulling = false;
  allergyOpts.querySelectorAll('input').forEach((c) => { c.checked = avoid.includes(c.value); });
  rebuild();
}

async function initAuth() {
  if (!DISCORD_CLIENT_ID) return;
  takeLoginRedirect();
  renderAcct();
  if (!session || session.exp < Date.now()) { session = null; return; }
  try {
    me = await api('me');
    const remote = await api('settings');
    if (remote) applyRemote(remote); else pushSettings();
  } catch (e) {
    if (e.status === 401) { session = null; me = null; store.set('session', null); }
  }
  renderAcct();
}

/* admin: edits a draft of the owner config; the server only accepts it from the owner's Discord id */
let draft;
let adminReel = 0;
const adminErr = (t) => { $('#admin-err').textContent = t; };
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
const checkRow = (id, name) => { const cb = el('input', { type: 'checkbox', value: id }); return el('label', { className: 'chk' }, cb, ` ${name}`); };
const checked = (box) => [...box.querySelectorAll('input:checked')].map((c) => c.value).join('');

$('#ai-tags').append(...TAGS.map((t) => checkRow(t.id, t.name)));
$('#ai-allergens').append(...ALLERGENS.map((a) => checkRow(a.id, a.name)));
$('#at-need').append(...LABELS.map((label, k) => {
  const sel = el('select', { id: `need-${k}` }, el('option', { value: '', textContent: 'ANY' }),
    ...TAGS.filter((t) => t.id !== 'x').map((t) => el('option', { value: t.id, textContent: t.name })));
  return el('label', { className: 'chk' }, `${label} `, sel);
}));

function renderAdmin() {
  $('#admin-tabs').replaceChildren(...LABELS.map((label, k) => {
    const b = el('button', { className: 'opt tab', type: 'button', textContent: label });
    b.setAttribute('aria-pressed', String(k === adminReel));
    b.onclick = () => { adminReel = k; renderAdmin(); };
    return b;
  }));
  const custom = draft.items.filter((it) => it.r === adminReel);
  $('#admin-items').replaceChildren(...[...BASE_POOLS[adminReel], ...custom].map((it) => {
    const cb = el('input', { type: 'checkbox', checked: !draft.hide.includes(it.n) });
    cb.onchange = () => { draft.hide = cb.checked ? draft.hide.filter((n) => n !== it.n) : [...draft.hide, it.n]; };
    const label = el('label', { className: 'chk' }, cb, ' ', el('span', { className: 'e', textContent: it.e }), ` ${it.n}`);
    if (custom.includes(it)) {
      const x = el('button', { className: 'link', type: 'button', textContent: '✕', title: 'Remove' });
      x.setAttribute('aria-label', `Remove ${it.n}`);
      x.onclick = (ev) => { ev.preventDefault(); draft.items = draft.items.filter((o) => o !== it); renderAdmin(); };
      label.append(x);
    }
    return label;
  }));
  $('#admin-tables').replaceChildren(...draft.tables.map((t) => {
    const x = el('button', { className: 'link', type: 'button', textContent: 'REMOVE' });
    x.onclick = () => { draft.tables = draft.tables.filter((o) => o !== t); renderAdmin(); };
    return el('div', { className: 'row' }, el('span', { textContent: `${t.e} ${t.name}: ${t.rule}` }), x);
  }));
}

// Validate the draft the same way the server will; roll the change back and show why if it fails.
const tryDraft = (undo) => {
  try { cleanConfig(draft); adminErr(''); return true; } catch (e) { undo(); adminErr(e.message.toUpperCase()); return false; }
};

$('#admin-btn').onclick = () => { draft = structuredClone(config); adminReel = 0; adminErr(''); renderAdmin(); $('#admin').showModal(); };
$('#admin-cancel').onclick = () => $('#admin').close();
$('#ai-add').onclick = () => {
  const n = $('#ai-n').value.trim();
  if (BASE_POOLS.flat().some((it) => it.n === n) || draft.items.some((it) => it.n === n)) { adminErr('NAME ALREADY EXISTS'); return; }
  const it = { r: adminReel, e: $('#ai-e').value.trim(), n, t: checked($('#ai-tags')), a: checked($('#ai-allergens')) };
  draft.items.push(it);
  if (!tryDraft(() => draft.items.pop())) return;
  $('#ai-e').value = ''; $('#ai-n').value = '';
  $('#admin-add').querySelectorAll('input:checked').forEach((c) => { c.checked = false; });
  renderAdmin();
};
$('#at-add').onclick = () => {
  const name = $('#at-n').value.trim();
  const need = {};
  LABELS.forEach((_, k) => { const v = $(`#need-${k}`).value; if (v) need[k] = v; });
  draft.tables.push({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name, rule: $('#at-r').value.trim(),
    e: $('#at-e').value.trim(), luxe: $('#at-luxe').checked, need });
  if (!tryDraft(() => draft.tables.pop())) return;
  for (const id of ['#at-e', '#at-n', '#at-r']) $(id).value = '';
  renderAdmin();
};
$('#admin-save').onclick = async () => {
  try { await api('config', 'PUT', cleanConfig(draft)); location.reload(); }
  catch (e) { adminErr(e.message.toUpperCase()); }
};

/* ---------- wiring ---------- */
$('#spin').onclick = () => (spinning ? runners.forEach((_, k) => !held[k] && stopReel(k)) : doSpin());
$('#lever').onclick = doSpin;
$('#again').onclick = doSpin;
$('#max').onclick = () => {
  held = held.map(() => false);
  saveLocks();
  cols.forEach((_, k) => paintHold(k, 'hold'));
  doSpin();
};
$('#close').onclick = () => $('#win').close();
$('#copy').onclick = async () => {
  const btn = $('#copy');
  const name = $('#win-name').textContent.replace(/"/g, '');
  const old = btn.innerHTML;
  try { await navigator.clipboard.writeText(recipeText(current, name, table)); btn.textContent = 'COPIED!'; }
  catch { btn.textContent = 'NOPE'; }
  setTimeout(() => { btn.innerHTML = old; }, 1500);
};
/* ---------- share ---------- */
const icon = (id) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', BRAND[id]);
  svg.append(p);
  return svg;
};
const shareItem = (tag, id, name, props) => {
  const n = Object.assign(document.createElement(tag), { className: 'opt', ...props });
  n.append(icon(id), name);
  return n;
};
$('#share-btn').onclick = () => {
  const text = shareText(current, $('#win-name').textContent.replace(/"/g, ''));
  const note = (t) => { $('#share-msg').textContent = t; };
  note('');
  const links = shareLinks(text).map((l) => shareItem('a', l.id, l.name, { href: l.href, target: '_blank', rel: 'noopener noreferrer' }));
  const discord = shareItem('button', 'discord', 'DISCORD', { type: 'button' });
  discord.onclick = async () => {
    try { await navigator.clipboard.writeText(`${text} ${SHARE_URL}`); note('COPIED! PASTE IT IN DISCORD'); }
    catch { note('COULD NOT COPY, TRY COPY RECIPE'); }
    open('https://discord.com/channels/@me', '_blank', 'noopener,noreferrer');
  };
  const extra = [discord];
  if (navigator.share) {
    const native = shareItem('button', 'more', 'MORE…', { type: 'button' });
    native.onclick = () => navigator.share({ text, url: SHARE_URL }).catch(() => {});
    extra.push(native);
  }
  $('#share-opts').replaceChildren(...links, ...extra);
  $('#share').showModal();
};
$('#share-close').onclick = () => $('#share').close();

addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.target.closest?.('button, dialog')) {
    e.preventDefault();
    if (spinning) stopNext(); else doSpin();
  }
});
addEventListener('resize', () => { if (!spinning) paintAll(); });

paintMute();
renderPanels();
renderTables();
cols.forEach((_, k) => paintHold(k, 'hold'));
document.fonts.ready.then(paintAll);
paintAll();
initAuth();
