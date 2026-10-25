import { POOLS, LABELS, spin, pickOther, bowlName, recipeText } from './slots.js';

const $ = (s) => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

const START_CREDITS = 20;
const ICONS = ['👑', '💎', '🎰', '🔥'];
const FAKE = [
  { who: 'sk8rgrl99', name: 'Teriyaki Tofu Bowl' }, { who: 'DaRkAnGeL', name: 'Birria + Rice' },
  { who: 'mom_of_3', name: 'Quinoa Chaos' }, { who: '~*brad*~', name: 'Gochujang Beef' },
];

let held = Array(6).fill(false);
let current = spin(POOLS, held, null, rand);
let rest = current.map((it, k) => [pickOther(POOLS[k], it, rand), it, pickOther(POOLS[k], it, rand)]);
let credits = store.get('credits', START_CREDITS);
let won = store.get('won', 0);
let streak = store.get('streak', 0);
let history = store.get('history', FAKE);
let muted = store.get('muted', false);
let spinning = false;
let cal = 1337420;

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
  const plate = Object.assign(document.createElement('div'), { className: 'plate', textContent: label });
  const reel = Object.assign(document.createElement('div'), { className: 'reel' });
  const strip = Object.assign(document.createElement('div'), { className: 'strip' });
  reel.append(strip);
  const hold = Object.assign(document.createElement('button'), { className: 'hold', type: 'button', textContent: 'HOLD' });
  hold.setAttribute('aria-pressed', 'false');
  hold.setAttribute('aria-label', `Hold ${label} reel`);
  hold.onclick = () => {
    held[k] = !held[k];
    hold.setAttribute('aria-pressed', String(held[k]));
    hold.textContent = held[k] ? 'HELD' : 'HOLD';
  };
  col.append(plate, reel, hold);
  $('#reels').append(col);
  return { reel, strip, hold };
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

function animateReel(k, item, ms) {
  const { reel, strip } = cols[k];
  const pool = POOLS[k];
  const fill = Array.from({ length: 16 }, () => pool[Math.floor(rand() * pool.length)]);
  const after = [pickOther(pool, item, rand), item, pickOther(pool, item, rand)];
  const items = [...rest[k], ...fill, ...after];
  strip.replaceChildren(...items.map((it) => sym(it, false)));
  const from = center(strip, 1);
  const to = center(strip, items.length - 2);
  reel.classList.add('moving');
  const unblur = setTimeout(() => reel.classList.remove('moving'), ms * 0.8);
  const anim = strip.animate(
    [{ transform: `translateY(${from}px)` }, { transform: `translateY(${to}px)` }],
    { duration: ms, easing: 'cubic-bezier(.12,.62,.2,1)', fill: 'forwards' },
  );
  return anim.finished.then(() => {
    clearTimeout(unblur);
    anim.cancel();
    rest[k] = after;
    paint(k);
    reel.classList.remove('moving');
    tone(300 + k * 60, 0.07, 'square', 0.04);
  });
}

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

/* ---------- spin ---------- */
const msg = (t) => { $('#msg').textContent = t; };
const setBusy = (b) => {
  spinning = b;
  $('#machine').classList.toggle('busy', b);
  for (const id of ['#spin', '#max', '#again']) $(id).disabled = b;
  cols.forEach((c) => { c.hold.disabled = b; });
};

async function doSpin() {
  if (spinning) return;
  unlock();
  const dlg = $('#win');
  if (dlg.open) dlg.close();
  setBusy(true);
  if (credits <= 0) { credits = START_CREDITS; msg('FREE REFILL!'); } else msg('');
  credits--;
  renderPanels();
  const next = spin(POOLS, held, current, rand);
  $('#lever').classList.add('pulled');
  setTimeout(() => $('#lever').classList.remove('pulled'), 300);
  tone(180, 0.15, 'sawtooth', 0.05);
  await Promise.all(next.map((it, k) =>
    (held[k] ? Promise.resolve() : animateReel(k, it, reduce ? 0 : 900 + k * 300))));
  current = next;
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

/* ---------- wiring ---------- */
$('#spin').onclick = doSpin;
$('#lever').onclick = doSpin;
$('#again').onclick = doSpin;
$('#max').onclick = () => {
  held = held.map(() => false);
  cols.forEach((c) => { c.hold.setAttribute('aria-pressed', 'false'); c.hold.textContent = 'HOLD'; });
  doSpin();
};
$('#close').onclick = () => $('#win').close();
$('#copy').onclick = async () => {
  const btn = $('#copy');
  const name = $('#win-name').textContent.replace(/"/g, '');
  const old = btn.innerHTML;
  try { await navigator.clipboard.writeText(recipeText(current, name)); btn.textContent = 'COPIED!'; }
  catch { btn.textContent = 'NOPE'; }
  setTimeout(() => { btn.innerHTML = old; }, 1500);
};
addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.target.closest?.('button, dialog')) { e.preventDefault(); doSpin(); }
});
addEventListener('resize', () => { if (!spinning) paintAll(); });

paintMute();
renderPanels();
document.fonts.ready.then(paintAll);
paintAll();
