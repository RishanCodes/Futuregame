// FORGEBORN — QTE engine. Each forging challenge is its own interaction with frame-time
// simulation in refs (independent of React render rate). Inputs are evaluated at the
// moment of the event by extrapolating from the last simulated frame.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sfx, furnace as furnaceSnd, mana as manaSnd } from './sfx.js';
import { WeaponArt } from './art.jsx';
import { ELEMENTS } from './data.js';

export const GRADE_PTS = { Perfect: 100, Excellent: 85, Good: 65, Poor: 35, Miss: 0 };
export const GRADE_CLASS = { Perfect: 'g-perfect', Excellent: 'g-excellent', Good: 'g-good', Poor: 'g-poor', Miss: 'g-miss' };
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

export function useLoop(cb, active) {
  const ref = useRef(cb); ref.current = cb;
  useEffect(() => {
    if (!active) return undefined;
    let raf; let last = performance.now();
    const f = (now) => { const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; ref.current(dt, now); raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}
function useForce() { const [, set] = useState(0); return useCallback(() => set((n) => (n + 1) & 0xffff), []); }
function useKey(handler, active) {
  const ref = useRef(handler); ref.current = handler;
  useEffect(() => {
    if (!active) return undefined;
    const d = (e) => ref.current(e, true); const u = (e) => ref.current(e, false);
    window.addEventListener('keydown', d); window.addEventListener('keyup', u);
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u); };
  }, [active]);
}
function useCanvas(size) {
  const ref = useRef(null);
  const get = () => {
    const c = ref.current; if (!c) return null;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth || size; const h = c.clientHeight || size;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, w, h };
  };
  return [ref, get];
}
function css(name, fallback) { try { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fallback; } catch (e) { return fallback; } }

function GradePop({ grade, k }) {
  if (!grade) return null;
  return <div key={k} className={'grade-pop ' + GRADE_CLASS[grade]}>{grade}</div>;
}
function RoundPips({ total, results }) {
  return <div className="pips">{Array.from({ length: total }, (_, i) => <span key={i} className={'pip ' + (results[i] ? GRADE_CLASS[results[i]] : '')} />)}</div>;
}

// =============== QTE 1: CIRCULAR PRECISION ===============
// A pointer rotates around a ring. Tap while it is inside the green arc; the gold core is Perfect.
export function CircularQTE({ cfg, paused, onDone, recover }) {
  const [cref, getC] = useCanvas(300);
  const force = useForce();
  const S = useRef(null);
  const newRound = (i) => {
    const dir = cfg.alternate && i % 2 === 1 ? -1 : 1;
    const half = (cfg.zone / 2) * Math.PI / 180; const perf = Math.min(half * 0.8, (cfg.perfect / 2) * Math.PI / 180);
    const zones = [];
    const multi = cfg.multi && i >= 2 && i % 2 === 0;
    const n = multi ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const travel = multi ? (k === 0 ? rand(1.4, 2.4) : rand(3.6, 4.9)) : rand(1.9, 5.0); // radians after start
      zones.push({ c: -Math.PI / 2 + dir * travel, half: multi ? half * 0.8 : half, perf: multi ? perf * 0.9 : perf });
    }
    return { dir, zones, travel: 0, phase: 'spin', resT: 0, t: 0 };
  };
  if (!S.current) S.current = { i: 0, results: [], scores: [], r: null, last: performance.now(), grade: null, gk: 0, recovered: false, done: false };
  if (!S.current.r) S.current.r = newRound(0);
  const st = S.current;

  const speedAt = (t) => cfg.speed * TAU * (1 + (cfg.wobble || 0) * Math.sin(t * 3.1));
  const judge = (extra) => {
    const r = st.r; if (r.phase !== 'spin' || st.done) return;
    const travel = r.travel + speedAt(r.t) * extra;
    const ang = -Math.PI / 2 + r.dir * travel;
    let best = Infinity; let z = null;
    for (const zz of r.zones) { let d = Math.abs(((ang - zz.c) % TAU + TAU * 1.5) % TAU - Math.PI); if (d < best) { best = d; z = zz; } }
    let g = 'Miss';
    if (best <= z.perf) g = 'Perfect';
    else if (best <= z.perf + (z.half - z.perf) * 0.4) g = 'Excellent';
    else if (best <= z.perf + (z.half - z.perf) * 0.8) g = 'Good';
    else if (best <= z.half) g = 'Poor';
    finishRound(g, ang);
  };
  const finishRound = (g, ang) => {
    if (g === 'Miss' && recover && !st.recovered) { st.recovered = true; g = 'Poor'; }
    st.results.push(g); st.scores.push(GRADE_PTS[g]); st.r.phase = 'result'; st.r.resT = 0; st.r.hitAng = ang;
    st.grade = g; st.gk++;
    sfx.shape(g);
    force();
  };
  useLoop((dt, now) => {
    const r = st.r; st.last = now;
    if (st.done) return;
    if (r.phase === 'spin') {
      r.t += dt; r.travel += speedAt(r.t) * dt;
      // past every zone by a margin and almost a full turn: miss
      const maxZ = Math.max(...r.zones.map((z) => Math.abs(z.c + Math.PI / 2)));
      if (r.travel > Math.max(TAU * 1.02, maxZ + r.zones[0].half + 0.35)) finishRound('Miss', -Math.PI / 2 + r.dir * r.travel);
    } else {
      r.resT += dt;
      if (r.resT > 0.7) {
        st.i++;
        if (st.i >= cfg.rounds) {
          st.done = true;
          const score = st.scores.reduce((a, b) => a + b, 0) / cfg.rounds;
          setTimeout(() => onDone({ score, perfects: st.results.filter((x) => x === 'Perfect').length, grades: st.results }), 250);
        } else st.r = newRound(st.i);
        force();
      }
    }
    draw();
  }, !paused);
  const draw = () => {
    const c = getC(); if (!c) return; const { g, w, h } = c; const r = st.r;
    const cx = w / 2; const cy = h / 2; const R = Math.min(w, h) * 0.4;
    g.clearRect(0, 0, w, h);
    // track
    g.lineWidth = 16; g.strokeStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    // ticks
    g.strokeStyle = 'rgba(255,220,160,0.25)'; g.lineWidth = 2;
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a) * (R + 12), cy + Math.sin(a) * (R + 12)); g.lineTo(cx + Math.cos(a) * (R + (k % 6 ? 16 : 20)), cy + Math.sin(a) * (R + (k % 6 ? 16 : 20))); g.stroke(); }
    // zones
    for (const z of r.zones) {
      g.lineWidth = 16; g.strokeStyle = '#3fbf6a'; g.beginPath(); g.arc(cx, cy, R, z.c - z.half, z.c + z.half); g.stroke();
      g.strokeStyle = '#7ff0a0'; g.lineWidth = 16; g.beginPath(); g.arc(cx, cy, R, z.c - z.perf - (z.half - z.perf) * 0.4, z.c + z.perf + (z.half - z.perf) * 0.4); g.globalAlpha = 0.5; g.stroke(); g.globalAlpha = 1;
      g.strokeStyle = '#ffd25a'; g.lineWidth = 18; g.beginPath(); g.arc(cx, cy, R, z.c - z.perf, z.c + z.perf); g.stroke();
    }
    // start marker
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(cx, cy - R - 26, 3, 0, TAU); g.fill();
    // direction hint
    g.fillStyle = 'rgba(255,210,150,0.6)'; g.font = '600 12px "Alegreya Sans", sans-serif'; g.textAlign = 'center';
    g.fillText(r.dir > 0 ? 'clockwise ↻' : '↺ counter-clockwise', cx, cy + R * 0.55);
    // pointer
    const ang = r.phase === 'spin' ? -Math.PI / 2 + r.dir * r.travel : r.hitAng;
    const px = cx + Math.cos(ang) * R; const py = cy + Math.sin(ang) * R;
    g.strokeStyle = 'rgba(255,180,80,0.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(px, py); g.stroke();
    g.shadowColor = '#ffb347'; g.shadowBlur = 18; g.fillStyle = '#fff3d6'; g.beginPath(); g.arc(px, py, 10, 0, TAU); g.fill(); g.shadowBlur = 0;
    g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(cx, cy, 30, 0, TAU); g.fill();
    g.strokeStyle = '#c8963c'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#ffd9a0'; g.font = '700 16px "Cinzel", serif'; g.fillText(`${Math.min(st.i + 1, cfg.rounds)}/${cfg.rounds}`, cx, cy + 6);
  };
  useEffect(() => { draw(); });
  const tap = (e) => { if (e) e.preventDefault(); judge(Math.max(0, (performance.now() - st.last) / 1000)); };
  useKey((e, down) => { if (down && (e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); if (!paused) tap(); } }, true);
  return (
    <div className="qte qte-circular">
      <div className="qte-stage" onPointerDown={(e) => !paused && tap(e)}>
        <canvas ref={cref} className="qte-canvas sq" />
        <GradePop grade={st.r.phase === 'result' ? st.grade : null} k={st.gk} />
      </div>
      <RoundPips total={cfg.rounds} results={st.results} />
      <p className="qte-hint">Tap the circle (or press Space) when the pointer is inside the green arc. Gold is Perfect.</p>
    </div>
  );
}

// =============== QTE 2: FURNACE TEMPERATURE CONTROL ===============
// Hold the bellows to raise the fire; the metal temperature follows the fire with lag.
export function FurnaceQTE({ cfg, paused, onDone }) {
  const force = useForce();
  const S = useRef(null);
  if (!S.current) {
    const shifts = []; for (let k = 1; k <= cfg.shifts; k++) shifts.push({ at: cfg.duration * k / (cfg.shifts + 1) + rand(-1, 1), to: clamp(cfg.center + rand(-220, 220), 450, 1350) });
    S.current = { t: 0, T: 420, h: 0, hold: false, target: cfg.center, next: null, shifts, inT: 0, over: 0, under: 0, stabAcc: 0, stabN: 0, streak: 0, perfects: 0, gust: 0, gustNext: rand(4, 7), done: false, prevT: 420, trace: [] };
  }
  const st = S.current;
  useLoop((dt) => {
    if (st.done) return;
    st.t += dt;
    st.h += ((st.hold ? 1 : 0) - st.h) * Math.min(1, dt * 2.4);
    const drift = (Math.sin(st.t * 1.3) + 0.6 * Math.sin(st.t * 2.9 + 1.1)) * cfg.drift * 70;
    if (cfg.d >= 2 && st.t > st.gustNext) { st.gust = 0.7; st.gustNext = st.t + rand(4, 7); sfx.draft(); }
    let gustV = 0; if (st.gust > 0) { st.gust -= dt; gustV = -160 * cfg.drift; }
    const eq = 250 + st.h * 1350;
    const dT = (eq - st.T) * 0.85 + drift + gustV;
    st.T = clamp(st.T + dT * dt, 0, 1700);
    // targets
    for (const sh of st.shifts) {
      if (!sh.warned && st.t > sh.at - 1.6) { sh.warned = true; st.next = sh.to; }
      if (!sh.applied && st.t > sh.at) { sh.applied = true; st.target = sh.to; st.next = null; }
    }
    const lo = st.target - cfg.band / 2; const hi = st.target + cfg.band / 2;
    if (st.T >= lo && st.T <= hi) {
      st.inT += dt; st.stabAcc += Math.abs(dT); st.stabN += dt; st.streak += dt;
      if (st.streak >= 3) { st.perfects++; st.streak -= 3; sfx.heatTick(); }
    } else { st.streak = 0; if (st.T > hi + 120) st.over += dt; if (st.T < lo - 120) st.under += dt; }
    furnaceSnd.update(st.h, st.hold, st.T > st.target + cfg.band / 2 + 120, dt);
    if (st.t > (st.trace.length + 1) * 0.12) { st.trace.push([st.t, st.T, st.target]); if (st.trace.length > 400) st.trace.shift(); }
    if (st.t >= cfg.duration) {
      st.done = true; furnaceSnd.stop();
      const inFrac = st.inT / cfg.duration;
      const stab = st.stabN > 0 ? clamp(1 - (st.stabAcc / st.stabN) / 420, 0, 1) : 0;
      const ext = (st.over + st.under) / cfg.duration;
      const score = clamp(100 * (0.74 * Math.min(1, inFrac * 1.08) + 0.16 * stab * Math.min(1, inFrac * 2) + 0.1 * (1 - Math.min(1, ext * 2))), 0, 100);
      setTimeout(() => onDone({ score, perfects: st.perfects, detail: `In range ${Math.round(inFrac * 100)}% · stability ${Math.round(stab * 100)}% · overheated ${st.over.toFixed(1)}s · underheated ${st.under.toFixed(1)}s` }), 300);
    }
    force();
  }, !paused);
  const setHold = (v) => { st.hold = v; };
  useKey((e, down) => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); if (!paused) setHold(down); } }, true);
  useEffect(() => { if (paused) { st.hold = false; furnaceSnd.stop(); } else if (!st.done) furnaceSnd.start(); }, [paused]);
  useEffect(() => () => furnaceSnd.stop(), []);
  const lo = st.target - cfg.band / 2; const hi = st.target + cfg.band / 2;
  const inBand = st.T >= lo && st.T <= hi;
  const y = (T) => 190 - clamp((T - 150) / 1400, 0, 1) * 180;
  const hot = st.T / 1600;
  const metal = `hsl(${clamp(10 + hot * 45, 0, 60)}, ${clamp(40 + hot * 60, 0, 100)}%, ${clamp(18 + hot * 62, 10, 92)}%)`;
  const status = st.T > hi + 120 ? 'Overheating!' : st.T < lo - 120 ? 'Too cold' : inBand ? 'Holding steady' : st.T > hi ? 'A little hot' : 'A little cool';
  const tr = st.trace;
  const tracePath = tr.length > 1 ? tr.map((p, i) => `${i ? 'L' : 'M'}${(i / (tr.length - 1)) * 120} ${y(p[1])}`).join(' ') : '';
  return (
    <div className="qte qte-furnace">
      <div className="furnace-wrap">
        <svg viewBox="0 0 220 200" className="furnace-svg" aria-hidden="true">
          <defs>
            <radialGradient id="fireG" cx="50%" cy="80%" r="70%"><stop offset="0" stopColor="#fff6c8" /><stop offset="0.35" stopColor="#ffb347" /><stop offset="0.8" stopColor="#d8401a" /><stop offset="1" stopColor="#d8401a" stopOpacity="0" /></radialGradient>
          </defs>
          <path d="M20 190 L20 70 Q20 30 70 24 L150 24 Q200 30 200 70 L200 190 Z" fill="#2a1e1a" stroke="#5a4030" strokeWidth="3" />
          <path d="M44 190 L44 92 Q44 64 110 60 Q176 64 176 92 L176 190 Z" fill="#0a0604" />
          <ellipse cx="110" cy={178} rx={40 + st.h * 40} ry={14 + st.h * 52} fill="url(#fireG)" className="fire-flicker" opacity={0.35 + st.h * 0.65} />
          <rect x="62" y="132" width="96" height="12" rx="4" fill={metal} style={{ filter: `drop-shadow(0 0 ${4 + hot * 14}px ${metal})` }} />
          {st.gust > 0 && <text x="110" y="52" textAnchor="middle" className="svg-warn">Cold draft!</text>}
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={30 + i * 34} y="190" width="24" height="8" fill="#3a2a22" />)}
        </svg>
        <svg viewBox="0 0 70 200" className="gauge-svg" aria-label={`Temperature ${Math.round(st.T)} degrees`}>
          <rect x="22" y="8" width="26" height="184" rx="13" fill="#140e0c" stroke="#6a5038" strokeWidth="2" />
          {st.next != null && <rect x="18" y={y(st.next + cfg.band / 2)} width="34" height={y(st.next - cfg.band / 2) - y(st.next + cfg.band / 2)} fill="none" stroke="#ffd25a" strokeDasharray="3 3" strokeWidth="1.5" className="blink" />}
          <rect x="22" y={y(hi)} width="26" height={y(lo) - y(hi)} fill="#3fbf6a" opacity="0.55" />
          <rect x="27" y={y(st.T)} width="16" height={190 - y(st.T)} rx="8" fill={inBand ? '#7ff0a0' : st.T > hi ? '#ff6a3a' : '#6aa8ff'} />
          <path d={`M14 ${y(st.T)} L22 ${y(st.T) - 5} L22 ${y(st.T) + 5}Z`} fill="#fff" />
          <text x="35" y="198" textAnchor="middle" className="svg-small">°C</text>
        </svg>
      </div>
      <div className="furnace-readout">
        <div className={'temp ' + (inBand ? 'ok' : 'bad')}>{Math.round(st.T)}°C</div>
        <div className="muted">Target {Math.round(lo)}–{Math.round(hi)}°C · {status}</div>
        <svg viewBox="0 0 120 200" className="trace" preserveAspectRatio="none" aria-hidden="true"><path d={tracePath} stroke="#ffb347" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" /></svg>
      </div>
      <div className="timebar"><span style={{ width: `${clamp(st.t / cfg.duration, 0, 1) * 100}%` }} /></div>
      <button type="button" className={'btn bellows ' + (st.hold ? 'held' : '')} onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); if (!paused) setHold(true); }} onPointerUp={() => setHold(false)} onPointerCancel={() => setHold(false)} onLostPointerCapture={() => setHold(false)} onContextMenu={(e) => e.preventDefault()}>
        {st.hold ? 'Pumping…' : 'Hold to pump the bellows'}
      </button>
      <p className="qte-hint">The fire responds slowly. Pulse the bellows to keep the metal inside the green band. A dashed band warns of a new target. Hold Space on a keyboard.</p>
    </div>
  );
}

// =============== QTE 3: HAMMERING PATTERN ===============
// Strike points light up on the workpiece. Strike each when it flashes gold; heavy points are held and released.
const STRIKE_LAYOUT = {
  dagger: [[28, 50], [40, 46], [52, 52], [64, 47], [74, 51]],
  sword: [[20, 50], [33, 44], [46, 54], [59, 45], [72, 53], [84, 48]],
  greatsword: [[16, 50], [30, 42], [44, 56], [58, 42], [72, 56], [86, 48]],
  spear: [[22, 52], [36, 47], [50, 52], [64, 46], [80, 50]],
  hammer: [[30, 42], [50, 38], [70, 42], [40, 60], [60, 60]],
  staff: [[22, 50], [38, 44], [54, 54], [70, 44], [84, 50]],
};
export function HammerQTE({ cfg, paused, onDone, spec }) {
  const force = useForce();
  const S = useRef(null);
  const pts = STRIKE_LAYOUT[cfg.cat] || STRIKE_LAYOUT.sword;
  if (!S.current) {
    const W = cfg.window * cfg.assist;
    const seq = []; let t = 0.9; let prev = -1;
    for (let i = 0; i < cfg.strikes; i++) {
      let p; do { p = Math.floor(Math.random() * pts.length); } while (p === prev);
      prev = p;
      const type = cfg.heavy && i % 3 === 2 ? 'heavy' : 'normal';
      seq.push({ p, t0: t, w: type === 'heavy' ? W + 0.7 : W, type, res: null });
      if (cfg.magic && i % 3 === 1) { let q; do { q = Math.floor(Math.random() * pts.length); } while (q === p); seq.push({ p: q, t0: t + W * 0.2, w: W * 0.9, type: 'decoy', res: null }); }
      t += (type === 'heavy' ? W + 0.5 : W) * (cfg.overlap > 1 ? 0.55 : 0.88);
    }
    S.current = { t: 0, seq, combo: 0, maxCombo: 0, wrong: 0, sparks: [], dents: [], last: performance.now(), done: false, grade: null, gk: 0, hold: null };
  }
  const st = S.current;
  const real = st.seq.filter((x) => x.type !== 'decoy');
  const peakOf = (x) => x.t0 + x.w * 0.45;
  const pop = (g, p) => { st.grade = g; st.gk++; st.gp = p; };
  const resolveStrike = (x, g, now) => {
    x.res = g; const pt = pts[x.p];
    if (g === 'Miss' || g === 'Poor') { st.combo = 0; } else { st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo); }
    if (g !== 'Miss') { st.dents.push({ x: pt[0] + rand(-2, 2), y: pt[1] + rand(-2, 2) }); for (let k = 0; k < (g === 'Perfect' ? 10 : 5); k++) st.sparks.push({ x: pt[0], y: pt[1], vx: rand(-40, 40), vy: rand(-60, -10), life: rand(0.3, 0.6) }); }
    sfx.anvil(g, x.type === 'heavy', (pt[0] - 50) / 60);
    pop(g, x.p);
  };
  const gradeAt = (x, time) => {
    const off = Math.abs(time - peakOf(x)) / x.w;
    return off <= 0.12 * cfg.perfAssist ? 'Perfect' : off <= 0.3 ? 'Good' : 'Poor';
  };
  useLoop((dt, now) => {
    st.last = now;
    if (st.done) return;
    st.t += dt;
    for (const x of st.seq) {
      if (x.res) continue;
      if (st.t > x.t0 + x.w) {
        if (x.type === 'decoy') x.res = 'Avoided';
        else if (st.hold && st.hold.x === x) { /* resolves on release */ } else resolveStrike(x, 'Miss', now);
      }
    }
    if (st.hold && !st.hold.x.res) {
      st.hold.charge = Math.min(1, st.hold.charge + dt / 0.5);
      if (st.t > st.hold.x.t0 + st.hold.x.w + 0.4) { resolveStrike(st.hold.x, 'Poor', now); st.hold = null; }
    }
    st.sparks = st.sparks.filter((s) => { s.life -= dt; s.x += s.vx * dt * 0.3; s.y += s.vy * dt * 0.3; s.vy += 120 * dt; return s.life > 0; });
    if (st.seq.every((x) => x.res)) {
      st.done = true;
      const scores = real.map((x) => GRADE_PTS[x.res] != null ? (x.res === 'Good' ? 75 : x.res === 'Poor' ? 45 : GRADE_PTS[x.res]) : 0);
      const avg = scores.reduce((a, b) => a + b, 0) / real.length;
      const score = clamp(avg * (0.88 + 0.12 * st.maxCombo / real.length) - st.wrong * 5, 0, 100);
      setTimeout(() => onDone({ score, perfects: real.filter((x) => x.res === 'Perfect').length, detail: `${real.filter((x) => x.res !== 'Miss').length}/${real.length} strikes landed · best combo ${st.maxCombo} · ${st.wrong} wrong strikes` }), 400);
    }
    force();
  }, !paused);
  const strike = (pi, extra = 0, isUp) => {
    if (paused || st.done) return;
    const time = st.t + extra;
    if (isUp) {
      if (!st.hold) return;
      const h = st.hold; st.hold = null;
      if (h.x.res) return;
      if (h.charge < 1) { resolveStrike(h.x, 'Poor'); return; }
      resolveStrike(h.x, time - h.fullAt <= 0.3 ? 'Perfect' : 'Good');
      return;
    }
    const act = st.seq.filter((x) => !x.res && x.p === pi && time >= x.t0 && time <= x.t0 + x.w);
    const decoy = act.find((x) => x.type === 'decoy');
    const target = act.find((x) => x.type !== 'decoy');
    if (decoy && !target) { decoy.res = 'Struck'; st.wrong++; st.combo = 0; sfx.runeBad(); pop('Miss', pi); return; }
    if (!target) { st.wrong++; st.combo = 0; sfx.wrong(); st.grade = 'Wrong'; st.gk++; st.gp = pi; return; }
    if (target.type === 'heavy') { st.hold = { x: target, charge: 0, fullAt: time + 0.5 }; sfx.hold(); return; }
    resolveStrike(target, gradeAt(target, time));
  };
  useKey((e, down) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= pts.length) { e.preventDefault(); if (down && !e.repeat) strike(n - 1, (performance.now() - st.last) / 1000); else if (!down) strike(n - 1, (performance.now() - st.last) / 1000, true); }
  }, true);
  const color = cfg.matColor || '#ccc';
  const blade = { dagger: 'M20 50 L72 44 L82 50 L72 56 Z', sword: 'M12 50 L82 45 L94 50 L82 55 Z', greatsword: 'M8 50 L80 41 L96 50 L80 59 Z', spear: 'M14 51 L70 49 L72 44 L92 50 L72 56 L70 51 Z', hammer: 'M22 32 L78 32 L80 68 L20 68 Z', staff: 'M10 50 Q50 44 90 50 Q50 56 10 50 Z' }[cfg.cat];
  const hit = (pi) => (e) => { e.preventDefault(); strike(pi, (performance.now() - st.last) / 1000); };
  const up = (pi) => (e) => { e.preventDefault(); strike(pi, (performance.now() - st.last) / 1000, true); };
  const done = real.filter((x) => x.res).length;
  return (
    <div className="qte qte-hammer">
      <div className="anvil-stage">
        <svg viewBox="0 22 100 74" className="anvil-svg">
          <defs><linearGradient id="hotmetal" x1="0" x2="1"><stop offset="0" stopColor="#ff7a2e" /><stop offset="0.5" stopColor="#ffd27a" /><stop offset="1" stopColor={color} /></linearGradient></defs>
          <path d="M6 70 L94 70 L86 78 L64 80 L66 92 L34 92 L36 80 L14 78 Z" fill="#2d2a2e" stroke="#4a454c" strokeWidth="0.8" />
          <path d="M2 66 L98 66 L94 72 L6 72 Z" fill="#3a363c" />
          <path d={blade} fill="url(#hotmetal)" stroke="#8a3a10" strokeWidth="0.6" className="hot-blade" transform="translate(0 6)" />
          {st.dents.map((d, i) => <circle key={i} cx={d.x} cy={d.y + 6} r="0.9" fill="#00000055" />)}
          {pts.map((p, pi) => {
            const act = st.seq.filter((x) => !x.res && x.p === pi && st.t >= x.t0 - 0.35 && st.t <= x.t0 + x.w);
            const x = act.find((a) => a.type !== 'decoy') || act[0];
            let ring = null; let cls = 'spt idle';
            if (x) {
              const pre = st.t < x.t0;
              const prog = clamp((st.t - x.t0) / x.w, 0, 1);
              const peak = Math.abs(st.t - peakOf(x)) / x.w <= 0.12 * cfg.perfAssist;
              cls = 'spt ' + (pre ? 'pre' : x.type === 'decoy' ? 'decoy' : peak ? 'peak' : 'live') + (x.type === 'heavy' ? ' heavy' : '');
              const r = 7.2; const len = TAU * r;
              ring = !pre && <circle cx={p[0]} cy={p[1] + 6} r={r} fill="none" stroke={x.type === 'decoy' ? '#b06bff' : '#ffd25a'} strokeWidth="1.2" strokeDasharray={`${len * (1 - prog)} ${len}`} transform={`rotate(-90 ${p[0]} ${p[1] + 6})`} />;
            }
            const holdC = st.hold && st.hold.x.p === pi ? st.hold.charge : 0;
            return (
              <g key={pi} className={cls} onPointerDown={hit(pi)} onPointerUp={up(pi)} onPointerCancel={up(pi)} style={{ cursor: 'pointer' }}>
                <circle cx={p[0]} cy={p[1] + 6} r="9" fill="transparent" />
                <circle cx={p[0]} cy={p[1] + 6} r="4.6" className="spt-core" />
                {x && x.type === 'decoy' && <path d={`M${p[0] - 2.4} ${p[1] + 3.6} l4.8 4.8 M${p[0] + 2.4} ${p[1] + 3.6} l-4.8 4.8`} stroke="#fff" strokeWidth="1" />}
                {x && x.type === 'heavy' && <text x={p[0]} y={p[1] - 4} textAnchor="middle" className="svg-tiny">HOLD</text>}
                {holdC > 0 && <circle cx={p[0]} cy={p[1] + 6} r="5.8" fill="none" stroke="#7ff0a0" strokeWidth="1.6" strokeDasharray={`${TAU * 5.8 * holdC} 99`} transform={`rotate(-90 ${p[0]} ${p[1] + 6})`} />}
                {ring}
                <text x={p[0]} y={p[1] + 19} textAnchor="middle" className="svg-tiny key">{pi + 1}</text>
              </g>
            );
          })}
          {st.sparks.map((s, i) => <circle key={'s' + i} cx={s.x} cy={s.y + 6} r="0.7" fill="#ffe08a" opacity={s.life * 2} />)}
        </svg>
        {st.grade && <div key={st.gk} className={'grade-pop small ' + (GRADE_CLASS[st.grade] || 'g-miss')} style={{ left: `${pts[st.gp] ? pts[st.gp][0] : 50}%` }}>{st.grade}</div>}
      </div>
      <div className="hammer-meta"><span>Strikes {done}/{real.length}</span><span>Combo ×{st.combo}</span>{st.wrong > 0 && <span className="bad">Wrong {st.wrong}</span>}</div>
      <p className="qte-hint">Strike a point when it flashes gold, before its ring runs out. HOLD points: press until the green ring fills, then release.{cfg.magic ? ' Never strike purple ✕ runes.' : ''} Keys 1–{pts.length}.</p>
    </div>
  );
}

// =============== QTE 4: QUENCHING PULSE ===============
// A ring contracts (or expands) radially toward the weapon's outline. Trigger as it aligns.
export function QuenchQTE({ cfg, paused, onDone, spec, recover }) {
  const [cref, getC] = useCanvas(300);
  const force = useForce();
  const S = useRef(null);
  const makePulse = (i) => {
    const expand = cfg.d >= 2 && i % 2 === 1;
    const rings = [{ r: expand ? 0.12 : 1.0, dir: expand ? 1 : -1, res: null, t: 0 }];
    if (cfg.double && i % 2 === 0 && i > 0) rings.push({ r: 1.35, dir: -1, res: null, t: 0, delay: 0 });
    return { rings, expand };
  };
  if (!S.current) S.current = { i: 0, pulse: makePulse(0), results: [], wait: 0.6, last: performance.now(), steam: [], done: false, grade: null, gk: 0, recovered: false };
  const st = S.current;
  const R0 = 0.55;
  const speed = (ring) => cfg.speed * 0.42 * (cfg.breathe ? 1 + 0.45 * Math.sin(ring.t * 5) : 1);
  const tolN = cfg.tol / 100;
  const grade = (diff) => diff <= tolN * 0.35 ? 'Perfect' : diff <= tolN * 0.7 ? 'Excellent' : diff <= tolN ? 'Good' : diff <= tolN * 1.8 ? 'Poor' : 'Miss';
  const record = (ring, g) => {
    if (g === 'Miss' && recover && !st.recovered) { st.recovered = true; g = 'Poor'; }
    ring.res = g; st.results.push(g); st.grade = g; st.gk++;
    sfx.quench(g);
    if (g !== 'Miss') { for (let k = 0; k < (g === 'Perfect' ? 26 : 12); k++) st.steam.push({ a: rand(0, TAU), r: R0, v: rand(0.1, 0.35), life: rand(0.6, 1.2) }); }
  };
  const totalRings = useRef(0);
  useLoop((dt, now) => {
    st.last = now;
    if (st.done) return;
    if (st.wait > 0) { st.wait -= dt; }
    else {
      for (const ring of st.pulse.rings) {
        if (ring.res) continue;
        ring.t += dt; ring.r += ring.dir * speed(ring) * dt;
        if ((ring.dir < 0 && ring.r < R0 - tolN * 2.2) || (ring.dir > 0 && ring.r > R0 + tolN * 2.2)) record(ring, 'Miss');
      }
      if (st.pulse.rings.every((r) => r.res)) {
        st.i++;
        if (st.i >= cfg.pulses) {
          st.done = true;
          const score = st.results.reduce((a, g) => a + GRADE_PTS[g], 0) / st.results.length;
          setTimeout(() => onDone({ score, perfects: st.results.filter((g) => g === 'Perfect').length, grades: st.results }), 600);
        } else { st.pulse = makePulse(st.i); st.wait = 0.55; }
      }
    }
    st.steam = st.steam.filter((p) => { p.life -= dt; p.r += p.v * dt; return p.life > 0; });
    draw();
    force();
  }, !paused);
  const draw = () => {
    const c = getC(); if (!c) return; const { g, w, h } = c;
    const cx = w / 2; const cy = h / 2; const U = Math.min(w, h) / 2;
    g.clearRect(0, 0, w, h);
    const cool = st.i / cfg.pulses;
    // target outline
    g.lineWidth = 3; g.strokeStyle = 'rgba(160,220,255,0.9)'; g.beginPath(); g.arc(cx, cy, R0 * U, 0, TAU); g.stroke();
    g.lineWidth = Math.max(2, tolN * 2 * U); g.strokeStyle = 'rgba(120,200,255,0.16)'; g.beginPath(); g.arc(cx, cy, R0 * U, 0, TAU); g.stroke();
    g.lineWidth = Math.max(1.5, tolN * 0.7 * U); g.strokeStyle = 'rgba(255,215,110,0.35)'; g.beginPath(); g.arc(cx, cy, R0 * U, 0, TAU); g.stroke();
    // hot glow fading
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, R0 * U);
    grd.addColorStop(0, `rgba(255,${140 + cool * 80},60,${0.35 * (1 - cool)})`); grd.addColorStop(1, 'rgba(255,90,30,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, R0 * U, 0, TAU); g.fill();
    // rings
    if (st.wait <= 0) for (const ring of st.pulse.rings) {
      if (ring.res || ring.r > 1.3) continue;
      const near = Math.abs(ring.r - R0) <= tolN;
      g.lineWidth = 4; g.strokeStyle = near ? '#ffd25a' : '#e8f6ff'; g.shadowColor = near ? '#ffd25a' : '#8fd8ff'; g.shadowBlur = 14;
      g.beginPath(); g.arc(cx, cy, Math.max(2, ring.r * U), 0, TAU); g.stroke(); g.shadowBlur = 0;
    }
    // steam
    for (const p of st.steam) { g.fillStyle = `rgba(230,240,255,${Math.min(0.5, p.life * 0.5)})`; g.beginPath(); g.arc(cx + Math.cos(p.a) * p.r * U, cy + Math.sin(p.a) * p.r * U, 3 + (1.2 - p.life) * 8, 0, TAU); g.fill(); }
    g.fillStyle = '#d8ecff'; g.font = '700 14px "Cinzel", serif'; g.textAlign = 'center';
    g.fillText(`Pulse ${Math.min(st.i + 1, cfg.pulses)}/${cfg.pulses}`, cx, h - 10);
    if (st.pulse.expand && st.wait <= 0) { g.font = '600 12px "Alegreya Sans", sans-serif'; g.fillStyle = 'rgba(200,230,255,0.7)'; g.fillText('expanding pulse', cx, 18); }
  };
  const tap = (e) => {
    if (e) e.preventDefault();
    if (paused || st.done || st.wait > 0) return;
    const extra = Math.max(0, (performance.now() - st.last) / 1000);
    const live = st.pulse.rings.filter((r) => !r.res && r.r <= 1.3);
    if (!live.length) return;
    let best = null; let bd = Infinity;
    for (const r of live) { const rr = r.r + r.dir * speed(r) * extra; const d = Math.abs(rr - R0); if (d < bd) { bd = d; best = r; } }
    record(best, grade(bd));
  };
  useKey((e, down) => { if (down && (e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); tap(); } }, true);
  return (
    <div className="qte qte-quench">
      <div className="qte-stage" onPointerDown={tap}>
        <div className="quench-weapon" style={{ filter: `saturate(${0.4 + st.i / cfg.pulses}) brightness(${1.4 - 0.4 * st.i / cfg.pulses})` }}><WeaponArt spec={spec} size={150} glow={false} /></div>
        <canvas ref={cref} className="qte-canvas sq" />
        <GradePop grade={st.grade} k={st.gk} />
      </div>
      <RoundPips total={cfg.pulses + (cfg.double ? Math.floor((cfg.pulses - 1) / 2) : 0)} results={st.results} />
      <p className="qte-hint">Tap (or Space) when the ring meets the blue outline. Some pulses expand from the center.</p>
    </div>
  );
}

// =============== QTE 5: RUNE ENCHANTING ===============
// Trace glyphs by dragging through rune nodes in order without lifting or touching wrong nodes.
export function RunesQTE({ cfg, paused, onDone }) {
  const force = useForce();
  const svgRef = useRef(null);
  const S = useRef(null);
  const n = cfg.nodes;
  const nodes = useRef(null);
  if (!nodes.current) {
    const arr = [];
    const ring = n >= 7 ? n - 1 : n;
    for (let i = 0; i < ring; i++) { const a = -Math.PI / 2 + i * TAU / ring; arr.push([50 + Math.cos(a) * 36, 50 + Math.sin(a) * 36]); }
    if (ring < n) arr.push([50, 50]);
    nodes.current = arr;
  }
  const N = nodes.current;
  const makeGlyph = () => {
    const len = clamp(3 + Math.floor(cfg.d * 0.8) + Math.floor(Math.random() * 2), 4, n);
    const order = []; const used = new Set(); let cur = Math.floor(Math.random() * n);
    order.push(cur); used.add(cur);
    while (order.length < len) { const opts = [...Array(n).keys()].filter((k) => !used.has(k)); cur = opts[Math.floor(Math.random() * opts.length)]; order.push(cur); used.add(cur); }
    return { order, prog: 1, invalid: 0, breaks: 0, done: false };
  };
  if (!S.current) S.current = { gi: 0, glyph: makeGlyph(), scores: [], t: 0, gt: 0, drag: false, ptr: null, lastWrong: -1, show: cfg.memory ? 2.4 : Infinity, flash: 0, done: false, perfects: 0, msg: '' };
  const st = S.current;
  const hitR = 7.5 * cfg.radius;
  const finish = () => {
    st.done = true;
    const avg = st.scores.reduce((a, b) => a + b, 0) / cfg.glyphs;
    setTimeout(() => onDone({ score: clamp(avg, 0, 100), perfects: st.perfects, detail: `${st.scores.length}/${cfg.glyphs} glyphs completed` }), 500);
  };
  const glyphScore = (g, timeUsed) => {
    const L = g.order.length;
    const acc = L / (L + g.invalid * 1.2 + g.breaks * 0.6);
    const target = 1.2 + L * 0.7;
    const speed = clamp(1 - (timeUsed - target) / (target * 2), 0, 1);
    return acc * 85 + speed * 15;
  };
  useLoop((dt) => {
    if (st.done) return;
    st.t += dt; st.gt += dt; if (st.show !== Infinity) st.show -= dt; if (st.flash > 0) st.flash -= dt;
    if (cfg.time && st.t >= cfg.time) {
      // time out: partial credit for current glyph, zero for the rest
      const g = st.glyph; const frac = (g.prog - 1) / (g.order.length - 1);
      st.scores.push(glyphScore(g, st.gt) * frac * 0.6);
      st.msg = 'Out of time';
      finish();
    }
    force();
  }, !paused);
  const toLocal = (e) => {
    const svg = svgRef.current; if (!svg) return null;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM(); if (!m) return null;
    const p = pt.matrixTransform(m.inverse()); return [p.x, p.y];
  };
  const nodeAt = (p) => { for (let i = 0; i < N.length; i++) { const dx = N[i][0] - p[0]; const dy = N[i][1] - p[1]; if (dx * dx + dy * dy <= hitR * hitR) return i; } return -1; };
  const down = (e) => {
    if (paused || st.done) return; e.preventDefault();
    const p = toLocal(e); if (!p) return;
    const k = nodeAt(p); const g = st.glyph;
    const lastNode = g.order[g.prog - 1];
    if (k === lastNode) { st.drag = true; st.ptr = p; try { svgRef.current.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } sfx.runeGrab(); }
    else if (k >= 0) { g.invalid++; st.flash = 0.3; st.lastWrong = k; sfx.runeBad(); }
  };
  const move = (e) => {
    if (!st.drag || paused || st.done) return;
    const p = toLocal(e); if (!p) return; st.ptr = p;
    const k = nodeAt(p); const g = st.glyph;
    if (k < 0) { st.lastWrong = -1; return; }
    const expected = g.order[g.prog];
    if (k === expected) {
      sfx.rune(g.prog + st.gi * 2); g.prog++; st.lastWrong = -1;
      if (g.prog >= g.order.length) {
        const sc = glyphScore(g, st.gt); st.scores.push(sc); if (g.invalid === 0 && g.breaks === 0) st.perfects++; sfx.glyph(g.invalid === 0 && g.breaks === 0);
        st.drag = false; st.gi++; st.gt = 0;
        if (st.gi >= cfg.glyphs) finish(); else { st.glyph = makeGlyph(); st.show = cfg.memory ? 2.0 : Infinity; }
      }
    } else if (!g.order.slice(0, g.prog).includes(k) && k !== st.lastWrong) { g.invalid++; st.lastWrong = k; st.flash = 0.3; sfx.runeBad(); }
  };
  const up = () => { if (st.drag && !st.done) { st.drag = false; const g = st.glyph; if (g.prog < g.order.length) { g.breaks++; sfx.runeBreak(); st.msg = 'The rune line broke. Resume from the last lit node.'; } } };
  const g = st.glyph;
  const color = ELEMENTS[cfg.elem] ? ELEMENTS[cfg.elem].color : '#9ff0ff';
  const showGuide = st.show > 0;
  const path = g.order.map((k, i) => `${i ? 'L' : 'M'}${N[k][0]} ${N[k][1]}`).join(' ');
  const done = g.order.slice(0, g.prog);
  const donePath = done.map((k, i) => `${i ? 'L' : 'M'}${N[k][0]} ${N[k][1]}`).join(' ');
  const last = N[g.order[g.prog - 1]];
  return (
    <div className="qte qte-runes">
      <div className={'rune-stage ' + (st.flash > 0 ? 'flash' : '')}>
        <svg ref={svgRef} viewBox="0 0 100 100" className="rune-svg" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}>
          <defs><filter id="rglow"><feGaussianBlur stdDeviation="1.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
          <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeOpacity="0.18" strokeWidth="0.6" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeOpacity="0.1" strokeWidth="3" strokeDasharray="1 3" className="spin-slow" />
          {showGuide && <path d={path} fill="none" stroke={color} strokeOpacity="0.28" strokeWidth="2" strokeDasharray="2 2" />}
          <path d={donePath} fill="none" stroke={color} strokeWidth="2.4" filter="url(#rglow)" strokeLinecap="round" strokeLinejoin="round" />
          {st.drag && st.ptr && <line x1={last[0]} y1={last[1]} x2={st.ptr[0]} y2={st.ptr[1]} stroke={color} strokeWidth="1.6" strokeOpacity="0.8" strokeLinecap="round" />}
          {N.map((p, k) => {
            const idx = g.order.indexOf(k); const lit = done.includes(k); const isNext = g.order[g.prog] === k; const isStart = g.order[g.prog - 1] === k;
            return (
              <g key={k}>
                <circle cx={p[0]} cy={p[1]} r={hitR} fill="transparent" />
                <circle cx={p[0]} cy={p[1]} r={4.2 * cfg.radius} fill={lit ? color : '#1a1530'} stroke={st.lastWrong === k && st.flash > 0 ? '#ff4a4a' : color} strokeWidth={isStart ? 1.6 : 0.8} filter={lit ? 'url(#rglow)' : undefined} className={isStart && !st.drag ? 'pulse' : ''} />
                {showGuide && idx >= 0 && <text x={p[0]} y={p[1] + 1.6} textAnchor="middle" className="svg-rune-num">{idx + 1}</text>}
                {!showGuide && isNext && cfg.d < 2 && <circle cx={p[0]} cy={p[1]} r="6" fill="none" stroke={color} strokeOpacity="0.4" />}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="hammer-meta"><span>Glyph {Math.min(st.gi + 1, cfg.glyphs)}/{cfg.glyphs}</span><span>Invalid {g.invalid}</span>{cfg.time ? <span className={cfg.time - st.t < 5 ? 'bad' : ''}>{Math.max(0, cfg.time - st.t).toFixed(1)}s</span> : <span>{st.gt.toFixed(1)}s</span>}</div>
      {st.msg && <p className="qte-msg">{st.msg}</p>}
      <p className="qte-hint">Press the glowing node, then drag through the numbered runes in order without lifting.{cfg.memory ? ' Memorize the pattern: it fades after a moment.' : ''}</p>
    </div>
  );
}

// =============== QTE 6: MANA STABILIZATION ===============
// Two coupled energies drift. Drag the two dampers so both stay in their bands.
export function ManaQTE({ cfg, paused, onDone }) {
  const force = useForce();
  const S = useRef(null);
  if (!S.current) S.current = { t: 0, A: 0.5, E: 0.5, cA: 0.5, cE: 0.5, inBoth: 0, inOne: 0, jitter: 0, done: false, perfects: 0, streak: 0, surge: 0, surgeNext: rand(3, 5), keys: {} };
  const st = S.current;
  const bandC = (t, k) => 0.5 + 0.22 * Math.sin(t * (0.35 + k * 0.17) + k * 2);
  useLoop((dt) => {
    if (st.done) return;
    st.t += dt;
    // keyboard steering
    const kspd = 0.9 * dt;
    if (st.keys.KeyW) st.cA = clamp(st.cA + kspd, 0, 1); if (st.keys.KeyS) st.cA = clamp(st.cA - kspd, 0, 1);
    if (st.keys.ArrowUp) st.cE = clamp(st.cE + kspd, 0, 1); if (st.keys.ArrowDown) st.cE = clamp(st.cE - kspd, 0, 1);
    if (st.t > st.surgeNext) { sfx.surge(); st.surge = 0.8; st.surgeK = Math.random() < 0.5 ? 'A' : 'E'; st.surgeD = Math.random() < 0.5 ? 1 : -1; st.surgeNext = st.t + rand(3, 5); }
    let sA = 0; let sE = 0;
    if (st.surge > 0) { st.surge -= dt; if (st.surgeK === 'A') sA = 0.5 * st.surgeD * cfg.drift; else sE = 0.5 * st.surgeD * cfg.drift; }
    const nA = (Math.sin(st.t * 2.1) * 0.6 + Math.sin(st.t * 4.7 + 1) * 0.4) * cfg.drift * 0.35;
    const nE = (Math.sin(st.t * 1.7 + 2) * 0.6 + Math.sin(st.t * 5.3) * 0.4) * cfg.drift * 0.35;
    const dA = (st.cA - st.A) * 1.6 + nA + sA - cfg.coupling * (st.E - 0.5) * 0.9;
    const dE = (st.cE - st.E) * 1.6 + nE + sE + cfg.coupling * (st.A - 0.5) * 1.2;
    st.A = clamp(st.A + dA * dt, 0, 1); st.E = clamp(st.E + dE * dt, 0, 1);
    const inA = Math.abs(st.A - bandC(st.t, 0)) <= cfg.band / 2; const inE = Math.abs(st.E - bandC(st.t, 1)) <= cfg.band / 2;
    if (inA && inE) { st.inBoth += dt; st.streak += dt; if (st.streak >= 3) { st.perfects++; st.streak -= 3; sfx.manaPulse(); } } else st.streak = 0;
    manaSnd.update(st.A, st.E, inA, inE);
    if (inA || inE) st.inOne += dt;
    st.jitter += (Math.abs(dA) + Math.abs(dE)) * dt;
    if (st.t >= cfg.duration) {
      st.done = true;
      manaSnd.stop();
      const both = st.inBoth / cfg.duration; const one = st.inOne / cfg.duration;
      const stab = clamp(1 - st.jitter / cfg.duration / 0.9, 0, 1);
      const score = clamp(100 * (0.72 * Math.min(1, both * 1.1) + 0.14 * one + 0.14 * stab * Math.min(1, both * 2)), 0, 100);
      setTimeout(() => onDone({ score, perfects: st.perfects, detail: `Both balanced ${Math.round(both * 100)}% · one balanced ${Math.round(one * 100)}%` }), 300);
    }
    force();
  }, !paused);
  useEffect(() => { if (paused) manaSnd.stop(); else if (!st.done) manaSnd.start(); }, [paused]);
  useEffect(() => () => manaSnd.stop(), []);
  useKey((e, d) => { if (['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'].includes(e.code)) { e.preventDefault(); st.keys[e.code] = d && !paused; } }, true);
  const drag = (which) => {
    const onMove = (e, el) => { const r = el.getBoundingClientRect(); const v = clamp(1 - (e.clientY - r.top) / r.height, 0, 1); if (which === 'A') st.cA = v; else st.cE = v; };
    return {
      onPointerDown: (e) => { if (paused) return; e.preventDefault(); const el = e.currentTarget; try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } el.dataset.drag = '1'; onMove(e, el); },
      onPointerMove: (e) => { if (e.currentTarget.dataset.drag === '1' && !paused) onMove(e, e.currentTarget); },
      onPointerUp: (e) => { e.currentTarget.dataset.drag = ''; },
      onPointerCancel: (e) => { e.currentTarget.dataset.drag = ''; },
    };
  };
  const bA = bandC(st.t, 0); const bE = bandC(st.t, 1);
  const inA = Math.abs(st.A - bA) <= cfg.band / 2; const inE = Math.abs(st.E - bE) <= cfg.band / 2;
  const Gauge = ({ v, c, band, label, color, ok, which }) => (
    <div className="mana-col">
      <div className="mana-label" style={{ color }}>{label}</div>
      <div className="mana-gauge" {...drag(which)}>
        <div className="mana-band" style={{ bottom: `${(band - cfg.band / 2) * 100}%`, height: `${cfg.band * 100}%` }} />
        <div className="mana-fill" style={{ height: `${v * 100}%`, background: ok ? color : '#ff6a5a' }} />
        <div className="mana-handle" style={{ bottom: `calc(${c * 100}% - 14px)` }}><span>≡</span></div>
      </div>
      <div className="mana-keys">{which === 'A' ? 'W / S' : '↑ / ↓'}</div>
    </div>
  );
  const bal = (inA ? 0.5 : 0) + (inE ? 0.5 : 0);
  return (
    <div className="qte qte-mana">
      <div className="mana-stage">
        <Gauge v={st.A} c={st.cA} band={bA} label="Arcane" color="#b48aff" ok={inA} which="A" />
        <div className="mana-orb-wrap">
          <div className={'mana-orb ' + (bal === 1 ? 'stable' : bal ? 'wobble' : 'chaos')} style={{ transform: `translate(${(st.E - st.A) * 30}px, ${(0.5 - (st.A + st.E) / 2) * 40}px) scale(${0.8 + bal * 0.3})` }} />
          <div className="mana-state">{bal === 1 ? 'Stable' : bal ? 'Unsteady' : 'Volatile'}</div>
          {st.surge > 0 && <div className="svg-warn-html">{st.surgeK === 'A' ? 'Arcane' : 'Elemental'} surge!</div>}
        </div>
        <Gauge v={st.E} c={st.cE} band={bE} label="Elemental" color="#5ad8ff" ok={inE} which="E" />
      </div>
      <div className="timebar"><span style={{ width: `${clamp(st.t / cfg.duration, 0, 1) * 100}%` }} /></div>
      <p className="qte-hint">Drag each damper (≡) to steer its energy into the moving band. The energies push on each other: raising Arcane lifts Elemental.</p>
    </div>
  );
}

// =============== Combat timing ===============
export function AttackTiming({ assist = 1, speed = 1, onDone, paused }) {
  const force = useForce();
  const S = useRef(null);
  if (!S.current) S.current = { t: 0, dur: 1.0 / speed, sweet: rand(0.55, 0.78), done: false, last: performance.now(), res: null };
  const st = S.current;
  const sw = 0.05 * assist; const gw = 0.14 * assist;
  const finish = (pos) => {
    if (st.done) return; st.done = true;
    const d = pos == null ? 9 : Math.abs(pos - st.sweet);
    const res = d <= sw ? { mult: 1.3, label: 'Perfect' } : d <= gw ? { mult: 1.12, label: 'Good' } : pos == null ? { mult: 0.85, label: 'Late' } : { mult: 0.92, label: 'Off' };
    st.res = res; sfx.swing();
    force(); setTimeout(() => onDone(res.mult, res.label), 380);
  };
  useLoop((dt, now) => { st.last = now; if (st.done) return; st.t += dt; if (st.t >= st.dur) finish(null); force(); }, !paused);
  const tap = (e) => { if (e) e.preventDefault(); if (st.done || paused) return; finish(clamp((st.t + (performance.now() - st.last) / 1000) / st.dur, 0, 1)); };
  useKey((e, d) => { if (d && (e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); tap(); } }, true);
  const pos = clamp(st.t / st.dur, 0, 1);
  return (
    <div className="ctiming" onPointerDown={tap} role="button" aria-label="Strike now">
      <div className="ct-label">{st.res ? st.res.label : 'Strike!'}</div>
      <div className="ct-bar">
        <div className="ct-good" style={{ left: `${(st.sweet - gw) * 100}%`, width: `${gw * 200}%` }} />
        <div className="ct-sweet" style={{ left: `${(st.sweet - sw) * 100}%`, width: `${sw * 200}%` }} />
        <div className="ct-mark" style={{ left: `${pos * 100}%` }} />
      </div>
      <div className="ct-sub">Tap or press Space in the gold</div>
    </div>
  );
}
export function DefenseTiming({ assist = 1, heavy, mode, onDone, paused }) {
  const force = useForce();
  const S = useRef(null);
  if (!S.current) S.current = { t: 0, dur: heavy ? 1.05 : 0.85, done: false, last: performance.now(), res: null };
  const st = S.current;
  const pw = 0.075 * assist; const gw = 0.17 * assist;
  const finish = (t) => {
    if (st.done) return; st.done = true;
    const d = t == null ? 9 : Math.abs(t - st.dur);
    const grade = d <= pw ? 'perfect' : d <= gw ? 'good' : 'miss';
    st.res = grade;
    force(); setTimeout(() => onDone({ grade }), 320);
  };
  useLoop((dt, now) => { st.last = now; if (st.done) return; st.t += dt; if (st.t > st.dur + gw + 0.05) finish(null); force(); }, !paused);
  const tap = (e) => { if (e) e.preventDefault(); if (st.done || paused) return; const t = st.t + (performance.now() - st.last) / 1000; finish(t < st.dur - 0.35 ? -9 : t); };
  useKey((e, d) => { if (d && (e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); tap(); } }, true);
  const p = clamp(st.t / st.dur, 0, 1.2);
  return (
    <div className={'ctiming def ' + (heavy ? 'heavy' : '')} onPointerDown={tap} role="button" aria-label={mode === 'block' ? 'Block now' : 'Dodge now'}>
      <div className="ct-label">{st.res ? ({ perfect: mode === 'block' ? 'Perfect Block!' : 'Deflected!', good: 'Braced', miss: 'Too slow' })[st.res] : mode === 'block' ? 'Block!' : 'Brace!'}</div>
      <div className="def-lane">
        <div className="def-shield" />
        <div className="def-zone" style={{ width: `${gw * 100 / st.dur * 1.2}%` }} />
        <div className="def-strike" style={{ right: `${(1 - Math.min(1, p)) * 88}%` }} />
      </div>
      <div className="ct-sub">Tap or Space as the strike reaches your shield</div>
    </div>
  );
}

export const STAGE_INFO = {
  furnace: { name: 'Furnace Heat', short: 'Keep the metal at working temperature.', how: 'Hold the bellows button to feed the fire and release to let it cool. The metal follows the fire slowly, so pulse it. Stay inside the green band; a dashed band warns of the next target.' },
  circular: { name: 'Circular Precision', short: 'Shape the metal with precise timing.', how: 'A pointer travels around the ring. Tap anywhere on the ring (or press Space) while it is inside the green arc. The gold center scores Perfect. The pointer resets for each attempt.' },
  hammer: { name: 'Hammering Pattern', short: 'Strike the workpiece in sequence.', how: 'Points light up across the blade. Strike each one when it flashes gold, before its ring empties. HOLD points: press until the green ring fills, then release. Purple ✕ runes are traps.' },
  quench: { name: 'Quenching Pulse', short: 'Quench at the exact moment.', how: 'A ring contracts toward the blue outline around the weapon, or expands from the center. Tap the moment it lines up with the outline.' },
  runes: { name: 'Rune Enchanting', short: 'Channel the enchantment along its runes.', how: 'Press the glowing rune node and drag through the numbered nodes in order without lifting. Touching a wrong node leaks energy. Lifting breaks the line; resume from the last lit node.' },
  mana: { name: 'Mana Stabilization', short: 'Balance two coupled energies.', how: 'Drag the two dampers to steer Arcane and Elemental energy into their moving bands. They push on each other, so correct gently. Keys: W/S and ↑/↓.' },
};
export const QTE_COMPONENTS = { circular: CircularQTE, furnace: FurnaceQTE, hammer: HammerQTE, quench: QuenchQTE, runes: RunesQTE, mana: ManaQTE };
