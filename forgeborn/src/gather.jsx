// FORGEBORN — active gathering minigames: mining deposits and foraging.
import React, { useRef, useState, useCallback } from 'react';
import { MATS, PICKAXES } from './data.js';
import { useLoop } from './qte.jsx';
import { MatIcon } from './art.jsx';
import { sfx } from './sfx.js';
import { weighted } from './engine.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
function useForce() { const [, set] = useState(0); return useCallback(() => set((n) => (n + 1) & 0xffff), []); }

// Rock polygon points around center
function rockPath(seed, r, cx = 100, cy = 100) {
  const pts = []; const n = 11;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const k = 0.82 + 0.18 * Math.abs(Math.sin(seed * 13.7 + i * 2.3)); pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * 0.86]); }
  return 'M' + pts.map((p) => p.join(' ')).join(' L') + 'Z';
}

export function MiningGame({ deposit, pickTier, geologist = 0, onFinish, onCancel }) {
  const force = useForce();
  const M = MATS[deposit.mat];
  const pick = PICKAXES[pickTier];
  const hard = M.hard || 1;
  const layerHP = 100 * (1 + 0.15 * Math.max(0, hard - 1)) / (1 + 0.12 * (pick.tier - hard));
  const S = useRef(null);
  if (!S.current) S.current = { t: 0, layer: 0, dmg: 0, swings: pick.swings, strikes: 0, weakHits: 0, wp: null, gap: 0.5, cool: 0, pocketRoll: Math.random() < deposit.pocket, pocket: null, pocketAt: rand(1.5, 4), pocketGot: false, chips: [], shake: 0, done: false, msg: '', seed: Math.random() * 10 };
  const st = S.current;
  const life = (1.15 - 0.06 * Math.max(0, hard - 1)) * (1 + 0.2 * geologist) * (1 + 0.05 * (pick.tier - hard));
  const end = () => { if (st.done) return; st.done = true; force(); };
  useLoop((dt) => {
    if (st.done) return;
    st.t += dt; st.cool = Math.max(0, st.cool - dt); st.shake = Math.max(0, st.shake - dt);
    if (st.wp) { st.wp.life -= dt; if (st.wp.life <= 0) { st.wp = null; st.gap = rand(0.15, 0.45); } }
    else { st.gap -= dt; if (st.gap <= 0) { const r = 58 - st.layer * (40 / deposit.layers); const a = rand(0, Math.PI * 2); const d = rand(0, r * 0.75); st.wp = { x: 100 + Math.cos(a) * d, y: 100 + Math.sin(a) * d * 0.86, life, max: life }; } }
    if (st.pocketRoll && !st.pocket && !st.pocketGot && st.t > st.pocketAt) { const a = rand(0, Math.PI * 2); st.pocket = { x: 100 + Math.cos(a) * 30, y: 100 + Math.sin(a) * 26, life: 1.4 }; }
    if (st.pocket) { st.pocket.life -= dt; if (st.pocket.life <= 0) { st.pocket = null; st.pocketRoll = false; st.msg = 'The glint faded…'; } }
    st.chips = st.chips.filter((c) => { c.life -= dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; return c.life > 0; });
    force();
  }, !st.done);
  const strike = (e) => {
    e.preventDefault();
    if (st.done || st.cool > 0 || st.swings <= 0) return;
    const svg = e.currentTarget; const r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 200; const y = (e.clientY - r.top) / r.height * 200;
    st.cool = 0.16; st.swings--; st.strikes++;
    // pocket first
    if (st.pocket && Math.hypot(x - st.pocket.x, y - st.pocket.y) < 16) { st.pocketGot = true; st.pocket = null; st.pocketRoll = false; st.msg = 'Rare pocket found!'; sfx.pocket(); st.swings++; st.strikes--; force(); return; }
    let dmg; let weak = false;
    if (st.wp && Math.hypot(x - st.wp.x, y - st.wp.y) < 15) { weak = true; dmg = 46 * pick.power * (0.85 + 0.3 * (st.wp.life / st.wp.max)); st.weakHits++; st.wp = null; st.gap = rand(0.1, 0.3); sfx.pickStrike(true); st.msg = 'Weak point!'; }
    else { dmg = 13 * pick.power; sfx.pickStrike(false); st.msg = ''; }
    st.shake = weak ? 0.18 : 0.08;
    for (let k = 0; k < (weak ? 9 : 4); k++) st.chips.push({ x, y, vx: rand(-120, 120), vy: rand(-180, -40), life: rand(0.3, 0.6), c: weak ? M.color : '#7a6a5a' });
    st.dmg += dmg;
    while (st.dmg >= layerHP && st.layer < deposit.layers) { st.dmg -= layerHP; st.layer++; sfx.layerBreak(st.layer >= deposit.layers); st.msg = st.layer >= deposit.layers ? 'Deposit broken open!' : `Layer ${st.layer} cracked!`; }
    if (st.layer >= deposit.layers || st.swings <= 0) setTimeout(end, 350);
    force();
  };
  const layersLeft = deposit.layers - st.layer;
  const rings = Array.from({ length: deposit.layers }, (_, i) => i).filter((i) => i >= st.layer);
  const prec = st.strikes ? st.weakHits / st.strikes : 0;
  if (st.done) {
    return (
      <div className="mining done-panel">
        <h3>Mining complete</h3>
        <p>{st.layer}/{deposit.layers} layers broken · {st.weakHits}/{st.strikes} weak-point strikes ({Math.round(prec * 100)}% precision){st.pocketGot ? ' · rare pocket!' : ''}</p>
        <p className="muted">Precision decides ore quality: 45%+ gives Refined, 70%+ on a fully broken deposit gives Pristine.</p>
        <button type="button" className="btn primary" onClick={() => onFinish({ layers: st.layer, weakHits: st.weakHits, strikes: st.strikes, pocket: st.pocketGot })}>Collect</button>
      </div>
    );
  }
  return (
    <div className="mining">
      <div className="mining-head">
        <MatIcon id={deposit.mat} size={30} />
        <div><b>{M.name} deposit</b>{deposit.rich && <span className="tag gold">Rich</span>}<div className="muted small">{pick.name} · {layersLeft} layer{layersLeft === 1 ? '' : 's'} left</div></div>
        <div className="swings" aria-label={`${st.swings} swings left`}>{Array.from({ length: pick.swings }, (_, i) => <span key={i} className={i < st.swings ? 'on' : ''} />)}</div>
      </div>
      <svg viewBox="0 0 200 200" className={'rock-svg ' + (st.shake > 0 ? 'shake' : '')} onPointerDown={strike}>
        <defs><radialGradient id="oreG" cx="45%" cy="40%" r="60%"><stop offset="0" stopColor={M.color} /><stop offset="1" stopColor={M.dark} /></radialGradient></defs>
        <ellipse cx="100" cy="176" rx="76" ry="10" fill="#000" opacity="0.35" />
        {rings.map((i) => { const r = 82 - i * (52 / deposit.layers); return <path key={i} d={rockPath(st.seed + i, r)} fill={i === deposit.layers - 1 ? 'url(#oreG)' : i % 2 ? '#5a4c40' : '#6a5a4c'} stroke="#2a221c" strokeWidth="2" />; })}
        {rings.length > 0 && <path d={rockPath(st.seed + st.layer, 82 - st.layer * (52 / deposit.layers))} fill="none" stroke="#000" strokeOpacity={clamp(st.dmg / layerHP, 0, 1) * 0.7} strokeWidth="1.5" strokeDasharray="6 4" />}
        {Array.from({ length: 6 }, (_, i) => <circle key={i} cx={70 + (i * 37) % 60} cy={78 + (i * 23) % 50} r="2.2" fill={M.color} opacity="0.7" />)}
        {st.wp && <g className="weakpoint"><circle cx={st.wp.x} cy={st.wp.y} r="13" fill="none" stroke="#ffd25a" strokeWidth="2" strokeDasharray={`${82 * st.wp.life / st.wp.max} 82`} transform={`rotate(-90 ${st.wp.x} ${st.wp.y})`} /><path d={`M${st.wp.x - 7} ${st.wp.y - 2} L${st.wp.x - 1} ${st.wp.y + 1} L${st.wp.x + 2} ${st.wp.y - 6} L${st.wp.x + 7} ${st.wp.y + 3}`} stroke="#fff3b0" strokeWidth="2.2" fill="none" /></g>}
        {st.pocket && <g className="pocket"><circle cx={st.pocket.x} cy={st.pocket.y} r="11" fill="#fff" opacity="0.25" /><path d={`M${st.pocket.x} ${st.pocket.y - 10} L${st.pocket.x + 3} ${st.pocket.y - 3} L${st.pocket.x + 10} ${st.pocket.y} L${st.pocket.x + 3} ${st.pocket.y + 3} L${st.pocket.x} ${st.pocket.y + 10} L${st.pocket.x - 3} ${st.pocket.y + 3} L${st.pocket.x - 10} ${st.pocket.y} L${st.pocket.x - 3} ${st.pocket.y - 3}Z`} fill="#fffbe0" /></g>}
        {st.chips.map((c, i) => <rect key={i} x={c.x} y={c.y} width="3" height="3" fill={c.c} opacity={c.life * 2} />)}
        <rect x="40" y="190" width="120" height="5" rx="2.5" fill="#000" opacity="0.5" />
        <rect x="40" y="190" width={120 * clamp(st.dmg / layerHP, 0, 1)} height="5" rx="2.5" fill="#ffb347" />
      </svg>
      <div className="mining-foot">
        <span className={'mining-msg ' + (st.msg.includes('pocket') ? 'rare' : '')}>{st.msg || 'Strike the glowing cracks.'}</span>
        <span className="muted small">Precision {Math.round(prec * 100)}%</span>
      </div>
      <p className="qte-hint">Tap the glowing crack before it fades for a heavy strike. Anywhere else is a glancing blow. A white glint is a rare pocket: tap it fast.</p>
      <div className="row gap"><button type="button" className="btn ghost" onClick={() => (st.strikes ? end() : onCancel())}>{st.strikes ? 'Stop and collect' : 'Leave deposit'}</button></div>
    </div>
  );
}

export function ForageGame({ table, herbalist = 0, sickle = 0, onFinish }) {
  const force = useForce();
  const S = useRef(null);
  const dur = 10 + herbalist;
  if (!S.current) S.current = { t: 0, items: [], spawn: 0.2, picks: {}, picked: 0, thorns: 0, done: false, pops: [] };
  const st = S.current;
  useLoop((dt) => {
    if (st.done) return;
    st.t += dt; st.spawn -= dt;
    if (st.spawn <= 0 && st.t < dur - 0.8) {
      st.spawn = rand(0.45, 0.8) / (1 + sickle * 0.12);
      const roll = Math.random();
      const kind = roll < 0.12 ? 'thorn' : roll < 0.2 ? 'glimmer' : 'plant';
      const mat = kind === 'glimmer' ? [...table].sort((a, b) => a[1] - b[1])[0][0] : weighted(table);
      st.items.push({ id: Math.random(), x: rand(10, 90), y: rand(30, 88), kind, mat, life: rand(1.6, 2.4) + sickle * 0.2, max: 2.4 });
    }
    st.items = st.items.filter((it) => { it.life -= dt; return it.life > 0; });
    st.pops = st.pops.filter((p) => { p.life -= dt; return p.life > 0; });
    if (st.t >= dur) { st.done = true; }
    force();
  }, !st.done);
  const take = (it) => (e) => {
    e.preventDefault(); e.stopPropagation();
    if (st.done) return;
    st.items = st.items.filter((x) => x !== it);
    if (it.kind === 'thorn') { st.thorns++; st.t = Math.min(dur, st.t + 1); sfx.thorn(); st.pops.push({ x: it.x, y: it.y, text: 'Ouch! −1s', life: 0.8, bad: true }); force(); return; }
    const n = it.kind === 'glimmer' ? 2 : 1;
    st.picks[it.mat] = (st.picks[it.mat] || 0) + n; st.picked += n;
    sfx.pluck(it.kind === 'glimmer');
    st.pops.push({ x: it.x, y: it.y, text: `+${n} ${MATS[it.mat].name}`, life: 0.8 });
    force();
  };
  if (st.done) {
    return (
      <div className="forage done-panel">
        <h3>Foraging complete</h3>
        <div className="chips">{Object.keys(st.picks).length ? Object.entries(st.picks).map(([k, n]) => <span key={k} className="chip"><MatIcon id={k} size={20} /> {n} {MATS[k].name}</span>) : <span className="muted">Nothing gathered.</span>}</div>
        <p className="muted small">Your sickle and Herbalist talent add to the final yield.</p>
        <button type="button" className="btn primary" onClick={() => onFinish(st.picks)}>Collect</button>
      </div>
    );
  }
  return (
    <div className="forage">
      <div className="forage-field">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="forage-bg" aria-hidden="true">
          <rect width="100" height="100" fill="#1c2a18" />
          {Array.from({ length: 40 }, (_, i) => <path key={i} d={`M${(i * 13) % 100} ${100} q1 -${6 + (i % 5) * 2} ${2 - (i % 3)} -${10 + (i % 4) * 3}`} stroke="#2f4a26" strokeWidth="0.8" fill="none" />)}
        </svg>
        {st.items.map((it) => {
          const k = clamp(it.life / 0.4, 0, 1); const grow = clamp((it.max - it.life) / 0.3, 0.3, 1);
          return (
            <button type="button" key={it.id} className={'forage-item ' + it.kind} style={{ left: `${it.x}%`, top: `${it.y}%`, opacity: k, transform: `translate(-50%,-50%) scale(${grow})` }} onPointerDown={take(it)} aria-label={it.kind === 'thorn' ? 'Thorn weed' : MATS[it.mat].name}>
              {it.kind === 'thorn' ? <svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 2v20M4 6l8 5 8-5M4 16l8-4 8 4" stroke="#8a3a3a" strokeWidth="2.4" fill="none" /></svg> : <MatIcon id={it.mat} size={it.kind === 'glimmer' ? 38 : 32} />}
            </button>
          );
        })}
        {st.pops.map((p, i) => <div key={i} className={'forage-pop ' + (p.bad ? 'bad' : '')} style={{ left: `${p.x}%`, top: `${p.y}%` }}>{p.text}</div>)}
      </div>
      <div className="timebar"><span style={{ width: `${(1 - st.t / dur) * 100}%` }} /></div>
      <p className="qte-hint">Tap plants before they wilt. Golden glimmers are rare finds worth double. Avoid red thorn weeds (−1 second).</p>
    </div>
  );
}
