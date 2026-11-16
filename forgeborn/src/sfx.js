// FORGEBORN — procedural audio engine (WebAudio, no samples).
// Signal path: voices -> bus -> [dry -> master] + [send -> reverb -> master] -> compressor -> out.
// Metal sounds use modal synthesis (inharmonic partials with independent decays), layered
// with noise transients, low "weight" thumps and spark crackle so strikes feel physical.

let ctx = null; let master = null; let bus = null; let send = null; let noiseBuf = null;
let enabled = true; let volume = 0.8;
const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;

export function setSound(on) { enabled = on; if (!on) { furnace.stop(); mana.stop(); } }
export function setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05); }

function makeImpulse(c, secs = 2.4, decay = 2.6) {
  const len = Math.floor(c.sampleRate * secs); const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 200 ? i / 200 : 1); }
  }
  return buf;
}
function init() {
  if (!AC) return null;
  if (ctx) return ctx;
  try {
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = volume;
    master.connect(comp); comp.connect(ctx.destination);
    const verb = ctx.createConvolver(); verb.buffer = makeImpulse(ctx);
    const wet = ctx.createGain(); wet.gain.value = 0.32;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 6500;
    send = ctx.createGain(); send.gain.value = 1;
    send.connect(verb); verb.connect(tone); tone.connect(wet); wet.connect(master);
    bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master);
    const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ctx = null; }
  return ctx;
}
function ready() {
  if (!enabled) return null;
  const c = init(); if (!c) return null;
  if (c.state === 'suspended') c.resume();
  return c;
}
if (typeof window !== 'undefined') {
  const unlock = () => { if (enabled) { const c = init(); if (c && c.state === 'suspended') c.resume(); } };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

// ---------- primitives ----------
function out(node, pan = 0, rev = 0.2) {
  let n = node;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; }
  n.connect(bus);
  if (rev > 0) { const s = ctx.createGain(); s.gain.value = rev; n.connect(s); s.connect(send); }
}
// Single oscillator voice with exponential envelope.
function osc({ f, type = 'sine', t = 0, a = 0.003, d = 0.3, v = 0.2, to, slideT, pan, rev = 0.2, detune = 0 }) {
  const c = ctx; const t0 = c.currentTime + t;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); o.detune.value = detune;
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + (slideT || d));
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  o.connect(g); out(g, pan, rev); o.start(t0); o.stop(t0 + a + d + 0.05);
}
// Filtered noise burst, optional filter sweep.
function noise({ t = 0, a = 0.002, d = 0.2, v = 0.2, type = 'bandpass', f = 2000, to, Q = 1, pan, rev = 0.15, rate = 1 }) {
  const c = ctx; const t0 = c.currentTime + t;
  const src = c.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = rate;
  const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t0); fl.Q.value = Q;
  if (to) fl.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + a + d);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  src.connect(fl); fl.connect(g); out(g, pan, rev);
  const off = Math.random() * 1.5; src.start(t0, off); src.stop(t0 + a + d + 0.05);
}
// Modal metal: inharmonic partials of a struck bar/plate.
const BAR = [1, 2.76, 5.40, 8.93, 13.34];
const PLATE = [1, 1.59, 2.14, 2.30, 2.65, 2.92, 3.50];
function metal({ f, t = 0, v = 0.25, ring = 1, bright = 1, modes = BAR, pan, rev = 0.3 }) {
  modes.forEach((r, i) => {
    const amp = v * Math.pow(0.62, i) * (i > 1 ? bright : 1);
    osc({ f: f * r * (1 + (Math.random() - 0.5) * 0.004), t, a: 0.001, d: ring * (1.6 / (1 + i * 0.9)), v: amp, pan, rev });
  });
}
function sparks({ t = 0, n = 8, spread = 0.25, v = 0.06, pan }) {
  for (let i = 0; i < n; i++) noise({ t: t + Math.random() * spread, d: 0.012 + Math.random() * 0.02, v: v * (0.5 + Math.random()), type: 'highpass', f: 5000 + Math.random() * 4000, pan: pan != null ? pan : (Math.random() - 0.5) * 0.8, rev: 0.1 });
}
function thump({ t = 0, f = 110, to = 45, d = 0.18, v = 0.4 }) { osc({ f, to, t, a: 0.002, d, v, rev: 0.05 }); }
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const note = (base, semis) => base * Math.pow(2, semis / 12);
function bell({ f, t = 0, v = 0.15, d = 1.4, pan, rev = 0.45 }) {
  osc({ f, t, d, v, pan, rev }); osc({ f: f * 2.01, t, d: d * 0.6, v: v * 0.35, pan, rev }); osc({ f: f * 3.02, t, d: d * 0.3, v: v * 0.15, pan, rev });
}
function chord(fs, opt = {}) { fs.forEach((f, i) => bell({ f, t: (opt.t || 0) + i * (opt.stagger || 0), v: opt.v || 0.1, d: opt.d || 1.6, rev: 0.5 })); }

// ---------- loops ----------
// Furnace: a fire roar (brown-ish noise) whose body follows the heat, plus crackle and a bellows whoosh.
export const furnace = {
  nodes: null, crackT: 0,
  start() {
    const c = ready(); if (!c || this.nodes) return;
    const src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = 0.7;
    const roar = c.createGain(); roar.gain.value = 0.0001;
    src.connect(lp); lp.connect(roar); out(roar, 0, 0.15);
    const src2 = c.createBufferSource(); src2.buffer = noiseBuf; src2.loop = true; src2.playbackRate.value = 0.7;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.9;
    const wind = c.createGain(); wind.gain.value = 0.0001;
    src2.connect(bp); bp.connect(wind); out(wind, 0.15, 0.1);
    const hum = c.createOscillator(); hum.type = 'sine'; hum.frequency.value = 55;
    const humG = c.createGain(); humG.gain.value = 0.0001; hum.connect(humG); out(humG, 0, 0);
    src.start(); src2.start(Math.random()); hum.start();
    this.nodes = { src, src2, lp, roar, bp, wind, hum, humG };
  },
  update(h, holding, over, dt) {
    const n = this.nodes; if (!n || !ctx) return;
    const t = ctx.currentTime;
    n.roar.gain.setTargetAtTime(0.06 + h * 0.32, t, 0.08);
    n.lp.frequency.setTargetAtTime(220 + h * 900, t, 0.1);
    n.wind.gain.setTargetAtTime(holding ? 0.22 : 0.0001, t, holding ? 0.05 : 0.12);
    n.bp.frequency.setTargetAtTime(holding ? 900 + h * 600 : 500, t, 0.1);
    n.humG.gain.setTargetAtTime(over ? 0.12 : 0.0001, t, 0.1);
    n.hum.frequency.setTargetAtTime(over ? 48 + Math.random() * 6 : 55, t, 0.1);
    this.crackT -= dt;
    if (this.crackT <= 0) { this.crackT = 0.05 + Math.random() * (0.5 - h * 0.35); noise({ d: 0.01 + Math.random() * 0.02, v: 0.05 + h * 0.12, type: 'highpass', f: 1800 + Math.random() * 3000, pan: (Math.random() - 0.5) * 0.6, rev: 0.05 }); }
  },
  stop() {
    const n = this.nodes; if (!n) return; this.nodes = null;
    const t = ctx.currentTime;
    for (const g of [n.roar, n.wind, n.humG]) g.gain.setTargetAtTime(0.0001, t, 0.08);
    setTimeout(() => { try { n.src.stop(); n.src2.stop(); n.hum.stop(); } catch (e) { /* stopped */ } }, 500);
  },
};
// Mana: two detuned voices tied to the two energies; consonant when balanced, beating when not.
export const mana = {
  nodes: null,
  start() {
    const c = ready(); if (!c || this.nodes) return;
    const mk = (type, pan) => { const o = c.createOscillator(); o.type = type; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400; const g = c.createGain(); g.gain.value = 0.0001; o.connect(f); f.connect(g); out(g, pan, 0.5); o.start(); return { o, g, f }; };
    const lfo = c.createOscillator(); lfo.frequency.value = 5; const lg = c.createGain(); lg.gain.value = 0; lfo.connect(lg); lfo.start();
    const A = mk('triangle', -0.4); const E = mk('sawtooth', 0.4); lg.connect(A.o.frequency); lg.connect(E.o.frequency);
    this.nodes = { A, E, lfo, lg };
  },
  update(a, e, inA, inE) {
    const n = this.nodes; if (!n || !ctx) return;
    const t = ctx.currentTime; const base = 196;
    n.A.o.frequency.setTargetAtTime(inA ? base : base * (0.85 + a * 0.3), t, 0.06);
    n.E.o.frequency.setTargetAtTime(inE ? base * 1.5 : base * 1.5 * (0.85 + e * 0.3), t, 0.06);
    n.A.g.gain.setTargetAtTime(0.07, t, 0.1); n.E.g.gain.setTargetAtTime(inE ? 0.035 : 0.05, t, 0.1);
    n.E.f.frequency.setTargetAtTime(inE ? 900 : 2600, t, 0.1);
    n.lg.gain.setTargetAtTime(inA && inE ? 1.5 : 9, t, 0.15);
  },
  stop() {
    const n = this.nodes; if (!n) return; this.nodes = null;
    const t = ctx.currentTime; n.A.g.gain.setTargetAtTime(0.0001, t, 0.1); n.E.g.gain.setTargetAtTime(0.0001, t, 0.1);
    setTimeout(() => { try { n.A.o.stop(); n.E.o.stop(); n.lfo.stop(); } catch (e) { /* stopped */ } }, 600);
  },
};

const G = (fn) => (...args) => { if (!ready()) return; try { fn(...args); } catch (e) { /* audio is optional */ } };
const GRADE_Q = { Perfect: 1, Excellent: 0.8, Good: 0.6, Poor: 0.3, Miss: 0 };

export const sfx = {
  // ===== forging =====
  // Circular Precision: a shaping tap on hot metal; higher grades ring truer.
  shape: G((grade) => {
    const q = GRADE_Q[grade] ?? 0.5;
    if (grade === 'Miss') { thump({ f: 140, to: 60, v: 0.35 }); noise({ d: 0.12, v: 0.12, type: 'lowpass', f: 600 }); osc({ f: 92, type: 'sawtooth', d: 0.18, v: 0.05, to: 70 }); return; }
    thump({ f: 160, to: 70, v: 0.3, d: 0.12 });
    noise({ d: 0.03, v: 0.25, type: 'highpass', f: 2500 });
    metal({ f: 520 + q * 260, v: 0.12 + q * 0.1, ring: 0.4 + q * 0.9, bright: 0.5 + q * 0.6 });
    sparks({ n: 3 + Math.round(q * 8), v: 0.04 + q * 0.04 });
    if (grade === 'Perfect') { bell({ f: 1568, t: 0.03, v: 0.09, d: 1.2 }); bell({ f: 2093, t: 0.09, v: 0.06, d: 1.0 }); }
  }),
  // Hammering Pattern: a full anvil blow with weight, ring and a shower of sparks.
  anvil: G((grade, heavy, pan = 0) => {
    const q = GRADE_Q[grade] ?? 0.5;
    if (grade === 'Miss') { thump({ f: 90, to: 50, v: 0.3 }); noise({ d: 0.2, v: 0.08, type: 'lowpass', f: 400 }); return; }
    const w = heavy ? 1.4 : 1;
    thump({ f: heavy ? 95 : 130, to: 40, v: 0.5 * w, d: heavy ? 0.3 : 0.16 });
    noise({ d: 0.025, v: 0.35, type: 'highpass', f: 3000, pan });
    noise({ d: 0.09 * w, v: 0.18 * w, type: 'bandpass', f: 1200, Q: 0.8, pan });
    metal({ f: (heavy ? 330 : 440) * (0.92 + q * 0.16), v: 0.16 + q * 0.12, ring: 0.6 + q * 1.1, bright: 0.6 + q * 0.5, pan, rev: 0.35 });
    metal({ f: 1240 + q * 200, v: 0.05 + q * 0.05, ring: 0.25 + q * 0.4, modes: PLATE, pan, rev: 0.2 });
    sparks({ n: 4 + Math.round(q * 12) + (heavy ? 6 : 0), spread: 0.3, v: 0.05 + q * 0.04, pan });
    if (grade === 'Perfect') bell({ f: heavy ? 1318 : 1760, t: 0.02, v: 0.07, d: 1.3, pan });
  }),
  hold: G(() => { osc({ f: 180, to: 360, d: 0.45, v: 0.05, type: 'triangle', slideT: 0.45 }); }),
  wrong: G(() => { thump({ f: 120, to: 60, v: 0.25 }); osc({ f: 233, type: 'square', d: 0.16, v: 0.04 }); osc({ f: 247, type: 'square', d: 0.16, v: 0.04 }); }),
  // Quenching: violent sizzle and steam, bubbling, then the cooling metal pings.
  quench: G((grade) => {
    const q = GRADE_Q[grade] ?? 0.5;
    if (grade === 'Miss') { noise({ d: 0.25, v: 0.1, type: 'bandpass', f: 1800, to: 900, Q: 0.6 }); osc({ f: 200, to: 90, d: 0.25, v: 0.08, type: 'sawtooth' }); return; }
    noise({ a: 0.005, d: 0.5 + q * 0.9, v: 0.3 + q * 0.12, type: 'bandpass', f: 7000, to: 1600, Q: 0.7, rev: 0.25 });
    noise({ a: 0.02, d: 0.9 + q * 0.8, v: 0.12, type: 'highpass', f: 4500, to: 2500, rev: 0.3 });
    noise({ d: 0.35, v: 0.2, type: 'lowpass', f: 500, to: 150 });
    for (let i = 0; i < 6 + q * 10; i++) osc({ f: 250 + Math.random() * 600, to: 500 + Math.random() * 900, t: 0.05 + Math.random() * 0.7, d: 0.04, v: 0.04, rev: 0.1 });
    if (q >= 0.6) metal({ f: 1800 + q * 400, t: 0.45, v: 0.05 + q * 0.04, ring: 0.6, modes: PLATE, rev: 0.4 });
    if (grade === 'Perfect') { bell({ f: 1047, t: 0.5, v: 0.08 }); bell({ f: 1568, t: 0.62, v: 0.07 }); }
  }),
  // Rune Enchanting: each correct node rises through a pentatonic scale.
  rune: G((step = 0, elemHue = 0) => {
    const f = note(392 * (1 + elemHue * 0.06), PENTA[Math.min(PENTA.length - 1, step)]);
    bell({ f, v: 0.24, d: 1.2, pan: ((step % 5) - 2) * 0.2 });
    osc({ f: f / 2, type: 'triangle', d: 0.45, v: 0.09, rev: 0.5 });
    noise({ d: 0.15, v: 0.03, type: 'highpass', f: 6000, rev: 0.6 });
  }),
  runeGrab: G(() => { osc({ f: 330, to: 660, d: 0.2, v: 0.06, type: 'sine', rev: 0.5 }); }),
  runeBad: G(() => { osc({ f: 185, type: 'sawtooth', d: 0.25, v: 0.07, to: 150 }); osc({ f: 196, type: 'sawtooth', d: 0.25, v: 0.07, to: 160 }); noise({ d: 0.2, v: 0.08, type: 'bandpass', f: 900, Q: 3 }); }),
  runeBreak: G(() => { osc({ f: 520, to: 140, d: 0.35, v: 0.08, type: 'triangle' }); noise({ d: 0.3, v: 0.06, type: 'bandpass', f: 2000, to: 400 }); }),
  glyph: G((clean) => { const base = 523; [0, 4, 7, 12, clean ? 16 : null].filter((x) => x != null).forEach((s, i) => bell({ f: note(base, s), t: i * 0.06, v: 0.08, d: 1.6 })); noise({ d: 0.8, v: 0.04, type: 'highpass', f: 7000, rev: 0.8 }); }),
  manaPulse: G(() => { bell({ f: 784, v: 0.06, d: 0.9 }); bell({ f: 1175, t: 0.05, v: 0.05, d: 0.9 }); }),
  surge: G(() => { osc({ f: 120, to: 480, d: 0.5, v: 0.08, type: 'sawtooth', slideT: 0.5 }); noise({ d: 0.5, v: 0.08, type: 'bandpass', f: 400, to: 3000 }); }),
  heatTick: G(() => { bell({ f: 659, v: 0.05, d: 0.6 }); }),
  draft: G(() => { noise({ a: 0.1, d: 0.6, v: 0.15, type: 'bandpass', f: 1500, to: 400, Q: 0.6 }); }),
  // Stage finished: a short tonic resolution scaled by the score.
  stageDone: G((score) => {
    const q = score / 100;
    if (q < 0.35) { osc({ f: 294, d: 0.4, v: 0.08, type: 'triangle' }); osc({ f: 277, t: 0.12, d: 0.5, v: 0.07, type: 'triangle' }); return; }
    metal({ f: 440, v: 0.12, ring: 1.2, bright: 0.8 });
    const notes = q >= 0.95 ? [0, 4, 7, 12, 16] : q >= 0.8 ? [0, 4, 7, 12] : q >= 0.6 ? [0, 4, 7] : [0, 7];
    chord(notes.map((s) => note(523, s)), { stagger: 0.07, v: 0.07, t: 0.08 });
  }),
  // Weapon reveal: a final anvil blow, a rising swell and a chord that grows with rarity.
  reveal: G((rarity = 0) => {
    thump({ f: 80, to: 35, v: 0.55, d: 0.5 });
    metal({ f: 294, v: 0.22, ring: 2.2, bright: 0.9, rev: 0.6 });
    noise({ a: 0.6, d: 0.6, v: 0.08, type: 'highpass', f: 2000, to: 9000, rev: 0.6 });
    sparks({ n: 18, spread: 0.6, v: 0.06 });
    const scale = [[0, 7], [0, 4, 7], [0, 4, 7, 12], [0, 4, 7, 11, 14], [0, 4, 7, 12, 16, 19], [-12, 0, 4, 7, 12, 16, 19], [-12, 0, 7, 12, 16, 19, 24, 28]][Math.min(6, rarity)];
    chord(scale.map((s) => note(392, s)), { t: 0.35, stagger: 0.09, v: 0.06 + rarity * 0.008, d: 2 + rarity * 0.3 });
    if (rarity >= 4) for (let i = 0; i < 10; i++) bell({ f: note(1568, PENTA[i % PENTA.length]), t: 0.9 + i * 0.05, v: 0.03, d: 1, pan: (Math.random() - 0.5) });
  }),
  smelt: G(() => { thump({ f: 70, to: 40, v: 0.3, d: 0.4 }); noise({ d: 0.8, v: 0.15, type: 'lowpass', f: 900, to: 200 }); noise({ t: 0.3, d: 0.5, v: 0.1, type: 'bandpass', f: 5000, to: 1500 }); metal({ f: 660, t: 0.4, v: 0.08, ring: 0.8 }); }),

  // ===== gathering =====
  pickStrike: G((weak) => {
    thump({ f: weak ? 150 : 110, to: 45, v: 0.45, d: 0.14 });
    noise({ d: 0.06, v: 0.3, type: 'lowpass', f: weak ? 2200 : 1200 });
    noise({ d: 0.02, v: weak ? 0.35 : 0.15, type: 'highpass', f: 3500 });
    if (weak) { metal({ f: 980, v: 0.08, ring: 0.3, modes: PLATE }); for (let i = 0; i < 5; i++) noise({ t: 0.03 + i * 0.03 + Math.random() * 0.02, d: 0.03, v: 0.08, type: 'bandpass', f: 1500 + Math.random() * 1500, Q: 2 }); }
  }),
  layerBreak: G((last) => {
    thump({ f: 90, to: 35, v: 0.5, d: 0.35 });
    for (let i = 0; i < 14; i++) noise({ t: Math.random() * 0.5, d: 0.04 + Math.random() * 0.08, v: 0.12, type: 'lowpass', f: 600 + Math.random() * 1500, pan: (Math.random() - 0.5) * 0.8 });
    if (last) { metal({ f: 700, t: 0.15, v: 0.1, ring: 1, modes: PLATE }); bell({ f: 1047, t: 0.25, v: 0.06 }); }
  }),
  pocket: G(() => { [0, 4, 7, 12, 16, 19].forEach((s, i) => bell({ f: note(1047, s), t: i * 0.05, v: 0.06, d: 1.2, pan: (i - 2.5) * 0.15 })); noise({ d: 0.6, v: 0.05, type: 'highpass', f: 8000, rev: 0.8 }); }),
  pluck: G((rare) => { noise({ d: 0.08, v: 0.12, type: 'bandpass', f: 3200, Q: 0.8 }); osc({ f: rare ? 880 : 520 + Math.random() * 120, to: rare ? 1320 : 680, d: 0.15, v: 0.07, type: 'triangle', slideT: 0.08 }); if (rare) bell({ f: 1760, t: 0.05, v: 0.05 }); }),
  thorn: G(() => { osc({ f: 220, to: 110, d: 0.2, v: 0.08, type: 'sawtooth' }); noise({ d: 0.1, v: 0.08, type: 'bandpass', f: 2500 }); }),

  // ===== combat =====
  swing: G(() => { noise({ a: 0.03, d: 0.16, v: 0.16, type: 'bandpass', f: 600, to: 3500, Q: 1.2 }); }),
  hit: G((crit) => {
    noise({ d: 0.05, v: 0.45, type: 'lowpass', f: 1800 }); thump({ f: 140, to: 50, v: 0.6, d: 0.17 });
    noise({ d: 0.12, v: 0.12, type: 'bandpass', f: 900, Q: 1 });
    if (crit) { metal({ f: 880, v: 0.1, ring: 0.6 }); osc({ f: 1760, to: 880, d: 0.25, v: 0.06, type: 'triangle' }); sparks({ n: 6 }); }
  }),
  hurt: G((heavy) => { thump({ f: heavy ? 90 : 120, to: 40, v: heavy ? 0.55 : 0.4, d: heavy ? 0.3 : 0.18 }); noise({ d: heavy ? 0.2 : 0.1, v: 0.18, type: 'lowpass', f: 700 }); }),
  block: G((perfect) => {
    thump({ f: 120, to: 60, v: 0.3, d: 0.1 });
    metal({ f: perfect ? 740 : 520, v: perfect ? 0.18 : 0.12, ring: perfect ? 1.1 : 0.5, modes: PLATE, rev: 0.35 });
    noise({ d: 0.03, v: 0.25, type: 'highpass', f: 3000 });
    if (perfect) { sparks({ n: 8 }); bell({ f: 1480, t: 0.03, v: 0.07 }); }
  }),
  spell: G(() => { osc({ f: 300, to: 1200, d: 0.35, v: 0.07, type: 'sawtooth', slideT: 0.3 }); noise({ d: 0.4, v: 0.08, type: 'bandpass', f: 1000, to: 6000 }); bell({ f: 1319, t: 0.2, v: 0.06 }); }),
  special: G(() => { thump({ f: 70, to: 30, v: 0.6, d: 0.6 }); noise({ a: 0.2, d: 0.5, v: 0.15, type: 'bandpass', f: 200, to: 4000 }); metal({ f: 220, t: 0.25, v: 0.2, ring: 2, rev: 0.6 }); chord([note(262, 0), note(262, 7), note(262, 12)], { t: 0.3, v: 0.07 }); }),
  heal: G(() => { [0, 4, 7, 12].forEach((s, i) => bell({ f: note(659, s), t: i * 0.06, v: 0.05, d: 0.9 })); }),
  victory: G((boss) => { const s = boss ? [0, 4, 7, 12, 16, 19, 24] : [0, 4, 7, 12]; chord(s.map((x) => note(392, x)), { stagger: 0.1, v: 0.08, d: 2 }); metal({ f: 392, t: 0.05, v: 0.12, ring: 1.6 }); }),
  defeat: G(() => { [0, -3, -7, -12].forEach((s, i) => osc({ f: note(330, s), t: i * 0.22, d: 0.6, v: 0.08, type: 'triangle', rev: 0.5 })); }),
  timingTick: G(() => { osc({ f: 1200, d: 0.03, v: 0.03, type: 'square', rev: 0 }); }),

  // ===== UI / rewards =====
  click: G(() => { noise({ d: 0.015, v: 0.08, type: 'bandpass', f: 2400, Q: 2, rev: 0 }); }),
  coin: G(() => { [0, 0.07, 0.11].forEach((t, i) => metal({ f: 2400 + i * 300 + Math.random() * 200, t, v: 0.05, ring: 0.25, modes: PLATE, rev: 0.15 })); }),
  level: G(() => { metal({ f: 523, v: 0.12, ring: 1.4 }); [0, 4, 7, 12, 16].forEach((s, i) => bell({ f: note(523, s), t: 0.1 + i * 0.08, v: 0.08, d: 1.6 })); }),
  upgrade: G(() => { thump({ f: 110, to: 45, v: 0.4 }); metal({ f: 392, v: 0.16, ring: 1.4 }); metal({ f: 523, t: 0.25, v: 0.14, ring: 1.6 }); chord([note(523, 0), note(523, 7), note(523, 12)], { t: 0.45, v: 0.06 }); }),
  discover: G(() => { [7, 12, 16, 19].forEach((s, i) => bell({ f: note(523, s), t: i * 0.07, v: 0.06, d: 1.4 })); }),

  // ===== legacy names used by older call sites =====
  perfect: G(() => sfx.shape('Perfect')), good: G(() => sfx.shape('Good')), poor: G(() => sfx.shape('Poor')), miss: G(() => sfx.shape('Miss')),
  clang: G(() => sfx.anvil('Good', true)), strike: G(() => sfx.anvil('Good')), steam: G(() => sfx.quench('Good')),
  bad: G(() => sfx.wrong()), rock: G(() => sfx.pickStrike(true)), pick: G(() => sfx.pluck(false)),
};
