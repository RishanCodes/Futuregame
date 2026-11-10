/* SHATTERPOINT — core utilities, storage and save system */
'use strict';
const SP = (window.SP = window.SP || {});

SP.VERSION = '1.0.0';

/* ---------- math / misc helpers ---------- */
SP.U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a = 0, b = 1) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  smooth: (t) => t * t * (3 - 2 * t),
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeIn: (t) => t * t,
  /* frame-rate independent exponential damping */
  damp: (a, b, lambda, dt) => b + (a - b) * Math.exp(-lambda * dt),
  angNorm(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  },
  angDiff(a, b) { return SP.U.angNorm(b - a); },
  dampAngle(a, b, lambda, dt) {
    const d = SP.U.angDiff(a, b);
    return a + d * (1 - Math.exp(-lambda * dt));
  },
  uid: () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4),
  fmt: (n) => Math.round(n).toLocaleString('en-US'),
  fmtTime(s) {
    s = Math.max(0, s);
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  },
  weighted(entries) { // [[value, weight], ...]
    let tot = 0;
    for (const e of entries) tot += e[1];
    let r = Math.random() * tot;
    for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
    return entries[entries.length - 1][0];
  },
  esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  deepClone: (o) => JSON.parse(JSON.stringify(o)),
};

/* ---------- safe storage ---------- */
SP.Store = {
  ok: false,
  init() {
    try {
      const k = '__sp_probe';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      this.ok = true;
    } catch (e) { this.ok = false; }
    return this.ok;
  },
  get(k) {
    if (!this.ok) return null;
    try { return localStorage.getItem(k); } catch (e) { return null; }
  },
  set(k, v) {
    if (!this.ok) return false;
    try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
  },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

/* ---------- save system ---------- */
SP.SAVE_KEY = 'shatterpoint.save.v1';

SP.defaultSettings = () => ({
  quality: 'auto',          // auto | low | medium | high
  showFps: false,
  master: 0.8, sfx: 0.9, muted: false,
  camSens: 1.0, invertY: false, camDist: 6.2,
  difficulty: 'normal',     // easy | normal | hard | nightmare
  touch: 'auto',            // auto | on | off
  touchScale: 1.0,
  leftHanded: false,
  screenShake: true,
  autoLock: true,
});

SP.defaultKeybinds = () => ({
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
  jump: 'Space', sprint: 'ShiftLeft', dodge: 'KeyQ', skill: 'KeyE',
  ab0: 'KeyR', ab1: 'KeyT', block: 'KeyF', lock: 'Tab', mom: 'KeyX',
  light: 'Mouse0', heavy: 'Mouse2', pause: 'KeyP',
  camLeft: 'ArrowLeft', camRight: 'ArrowRight', camUp: 'ArrowUp', camDown: 'ArrowDown',
});

SP.defaultSave = () => ({
  v: 1,
  created: Date.now(),
  name: 'NOVA',
  appearance: {
    face: 0, skin: 2, hairStyle: 1, hairColor: 0, eyeColor: 0,
    height: 1.0, build: 1.0, shoulders: 1.0,
    styles: { head: 'visor', torso: 'runner', arms: 'wraps', legs: 'cargo', feet: 'boots' },
    colors: { primary: '#1b2030', secondary: '#c9d2e3', accent: '#2fb4ff' },
  },
  level: 1, xp: 0, credits: 400, shards: 10,
  inventory: [], // filled by SP.Items.starterKit()
  equipped: { weapon: null, head: null, torso: null, arms: null, legs: null, feet: null },
  abilities: { owned: { phase: 1, repair: 1 }, slots: ['phase', 'repair'] },
  mastery: { katana: 0, hammer: 0, daggers: 0, rifle: 0, gauntlets: 0, spear: 0 },
  campaign: { cleared: {}, bonus: {}, bosses: {} },
  challenges: {},
  survival: { bestWave: 0, bestScore: 0 },
  bossRush: { best: 0, cleared: false },
  unlockedStyles: ['visor', 'runner', 'wraps', 'cargo', 'boots', 'bare', 'tank', 'none', 'shorts', 'sneakers'],
  unlockedColors: [],
  stats: { matches: 0, wins: 0, kills: 0, parries: 0, finishers: 0, playTime: 0 },
  settings: SP.defaultSettings(),
  keybinds: SP.defaultKeybinds(),
  touchLayout: {},
  seenTutorial: false,
});

SP.Save = {
  data: null,
  status: 'new', // new | loaded | recovered | unavailable
  lastSaved: 0,

  /* merge saved object onto defaults so new fields always exist */
  validate(obj) {
    const def = SP.defaultSave();
    if (!obj || typeof obj !== 'object') return def;
    const out = def;
    const mergeInto = (dst, src) => {
      for (const k in src) {
        if (!(k in dst)) { dst[k] = src[k]; continue; }
        const dv = dst[k], sv = src[k];
        if (dv && typeof dv === 'object' && !Array.isArray(dv) && sv && typeof sv === 'object' && !Array.isArray(sv)) mergeInto(dv, sv);
        else if (Array.isArray(dv) && Array.isArray(sv)) dst[k] = sv;
        else if (typeof dv === typeof sv || dv === null) dst[k] = sv;
      }
    };
    mergeInto(out, obj);
    // sanity
    out.level = SP.U.clamp(Math.floor(+out.level || 1), 1, 60);
    out.xp = Math.max(0, +out.xp || 0);
    out.credits = Math.max(0, Math.floor(+out.credits || 0));
    out.shards = Math.max(0, Math.floor(+out.shards || 0));
    out.inventory = (out.inventory || []).filter((it) => it && it.id && (it.kind === 'weapon' || it.kind === 'armor'));
    if (!Array.isArray(out.abilities.slots)) out.abilities.slots = ['phase', null];
    return out;
  },

  load() {
    SP.Store.init();
    let raw = SP.Store.get(SP.SAVE_KEY);
    if (!SP.Store.ok) this.status = 'unavailable';
    if (raw) {
      try {
        this.data = this.validate(JSON.parse(raw));
        this.status = 'loaded';
      } catch (e) {
        // corrupted — keep a backup copy and start fresh
        SP.Store.set(SP.SAVE_KEY + '.corrupt', raw);
        this.data = SP.defaultSave();
        this.status = 'recovered';
      }
    } else {
      this.data = SP.defaultSave();
      if (this.status !== 'unavailable') this.status = 'new';
    }
    SP.Items.ensureStarter(this.data);
    return this.data;
  },

  save() {
    if (!this.data) return false;
    const ok = SP.Store.set(SP.SAVE_KEY, JSON.stringify(this.data));
    if (ok) this.lastSaved = Date.now();
    return ok;
  },

  exportString() {
    const json = JSON.stringify(this.data);
    return 'SP1:' + btoa(unescape(encodeURIComponent(json)));
  },

  importString(str) {
    str = (str || '').trim();
    if (!str.startsWith('SP1:')) throw new Error('This is not a SHATTERPOINT save code. Codes start with "SP1:".');
    let obj;
    try { obj = JSON.parse(decodeURIComponent(escape(atob(str.slice(4))))); } catch (e) { throw new Error('The save code is damaged or incomplete. Copy the whole code and try again.'); }
    if (!obj || obj.v !== 1) throw new Error('The save code is from an unsupported version.');
    this.data = this.validate(obj);
    SP.Items.ensureStarter(this.data);
    this.save();
    return true;
  },

  reset() {
    this.data = SP.defaultSave();
    SP.Items.ensureStarter(this.data);
    this.save();
  },
};

/* ---------- simple event bus ---------- */
SP.Bus = {
  h: {},
  on(ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); },
  emit(ev, a, b, c) { const l = this.h[ev]; if (l) for (const f of l) f(a, b, c); },
};
