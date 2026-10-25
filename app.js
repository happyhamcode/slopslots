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
    if (spinning) { stopReel(k); return; }
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

/* Manual stop: a reel free-runs over its pool (4 cycles tall, wrapping between
   cycles 2 and 3) until stopReel() eases it onto its precomputed result. */
const SPEED = 14; // rows per second while spinning
const STOP_MS = reduce ? 0 : 700;
const runners = [];
let next = current;

function startReel(k) {
  const { reel, strip } = cols[k];
  const pool = POOLS[k];
  const L = pool.length;
  strip.replaceChildren(...Array.from({ length: L * 4 }, (_, n) => sym(pool[n % L], false)));
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
  const pool = POOLS[k];
  const L = pool.length;
  const item = next[k];
  const idx = pool.indexOf(item);
  let final = L + idx;
  while (final < r.p + 2) final += L;
  const anim = strip.animate(
    [{ transform: `translateY(${center(strip, r.p)}px)` }, { transform: `translateY(${center(strip, final)}px)` }],
    { duration: STOP_MS, easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'forwards' },
  );
  setTimeout(() => reel.classList.remove('moving'), STOP_MS * 0.5);
  anim.finished.then(() => {
    anim.cancel();
    rest[k] = [pool[(idx - 1 + L) % L], item, pool[(idx + 1) % L]];
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

/* ---------- spin ---------- */
const msg = (t) => { $('#msg').textContent = t; };
const setBusy = (b) => {
  spinning = b;
  $('#machine').classList.toggle('busy', b);
  for (const id of ['#spin', '#max', '#again']) $(id).disabled = b;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const JACKPOT_DELAY_MS = 1000;

// HOLD buttons double as STOP buttons while the reels run.
function paintHold(k, mode) {
  const { hold } = cols[k];
  hold.classList.toggle('stop', mode === 'stop');
  hold.disabled = mode === 'off';
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
  next = spin(POOLS, held, current, rand);
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
  await Promise.all(live);
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
  if (e.code === 'Space' && !e.target.closest?.('button, dialog')) {
    e.preventDefault();
    if (spinning) stopNext(); else doSpin();
  }
});
addEventListener('resize', () => { if (!spinning) paintAll(); });

paintMute();
renderPanels();
document.fonts.ready.then(paintAll);
paintAll();
