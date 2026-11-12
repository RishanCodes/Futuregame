/* PIXEL QUEST — core: namespace, math, seeded RNG, noise, storage, events */
'use strict';
const PQ = (window.PQ = window.PQ || {});
PQ.VERSION = '1.0.0';
PQ.SAVE_VERSION = 1;
PQ.T = 16; // tile size in pixels

const U = (PQ.U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  angle: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
  angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; },
  smooth: (t) => t * t * (3 - 2 * t),
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  rand: (a = 0, b = 1) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  weighted(list, rnd = Math.random) { // [[value, weight]]
    let t = 0; for (const e of list) t += e[1];
    let r = rnd() * t;
    for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; }
    return list[list.length - 1][0];
  },
  esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  fmt: (n) => Math.floor(n).toLocaleString('en-US'),
  uid: () => Math.random().toString(36).slice(2, 10),
  fmtTime(sec) { sec = Math.floor(sec); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h ? h + 'h ' + m + 'm' : m + 'm'; },
  hash2(x, y, s = 0) { // well-mixed integer hash -> [0,1)
    let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul((s | 0) ^ 0x9e3779b9, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  },
  hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; },
  rgbToHex(r, g, b) { return '#' + ((1 << 24) | (U.clamp(r | 0, 0, 255) << 16) | (U.clamp(g | 0, 0, 255) << 8) | U.clamp(b | 0, 0, 255)).toString(16).slice(1); },
  shade(hex, amt) { // amt -1..1 darken/lighten
    const [r, g, b] = U.hexToRgb(hex);
    if (amt < 0) return U.rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
    return U.rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  },
  mix(a, b, t) { const A = U.hexToRgb(a), B = U.hexToRgb(b); return U.rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); },
});

/* ---------- seeded RNG (mulberry32) ---------- */
PQ.RNG = function (seed) {
  let a = seed >>> 0;
  const f = function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.chance = (p) => f() < p;
  f.range = (lo, hi) => lo + f() * (hi - lo);
  return f;
};

/* ---------- value noise with fractal octaves ---------- */
PQ.Noise = function (seed) {
  const s = seed % 100000;
  const v = (x, y) => U.hash2(x, y, s);
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = U.smooth(xf), w = U.smooth(yf);
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
  return {
    n2,
    fbm(x, y, oct = 4, lac = 2, gain = 0.5) {
      let amp = 1, f = 1, sum = 0, norm = 0;
      for (let i = 0; i < oct; i++) { sum += n2(x * f + i * 17.3, y * f - i * 9.1) * amp; norm += amp; amp *= gain; f *= lac; }
      return sum / norm;
    },
  };
};

/* ---------- storage that never throws ---------- */
PQ.Store = {
  ok: false,
  init() {
    try { localStorage.setItem('__pq', '1'); localStorage.removeItem('__pq'); this.ok = true; } catch (e) { this.ok = false; }
    return this.ok;
  },
  get(k) { if (!this.ok) return null; try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { if (!this.ok) return false; try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { if (!this.ok) return; try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

/* ---------- tiny event bus ---------- */
PQ.Bus = {
  h: {},
  on(e, f) { (this.h[e] = this.h[e] || []).push(f); },
  emit(e, a, b, c) { const l = this.h[e]; if (l) for (let i = 0; i < l.length; i++) l[i](a, b, c); },
};

/* ---------- canvas helper ---------- */
PQ.canvas = function (w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
};
