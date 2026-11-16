// FORGEBORN — procedural SVG artwork: weapons, enemies, materials, scenes and icons.
import React, { useId } from 'react';
import { MATS, BLUEPRINTS, COMPONENTS, ELEMENTS, RARITIES, REGIONS } from './data.js';

// ---------- icons ----------
const IP = {
  world: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 0c3 3 3 17 0 20M12 2c-3 3-3 17 0 20M2 12h20M4 7h16M4 17h16',
  forge: 'M3 9h14l-2 3h-3v3l3 4H6l3-4v-3H5zM17 9c2 0 4 1 4 3h-4',
  battle: 'M4 4l9 9M4 4h4M4 4v4M20 4l-9 9M20 4h-4M20 4v4M8 14l-3 3 2 2 3-3M16 14l3 3-2 2-3-3',
  bag: 'M6 8h12l1 12H5zM9 8V6a3 3 0 016 0v2',
  hero: 'M12 3a4 4 0 110 8 4 4 0 010-8zM4 21c1-5 4-7 8-7s7 2 8 7',
  upgrade: 'M12 3l6 6h-4v6h-4V9H6zM5 19h14v2H5z',
  codex: 'M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h10M9 8h6',
  quest: 'M7 3h10v18l-5-3-5 3zM10 8h4M10 12h4',
  legacy: 'M12 2c1 4 6 6 6 11a6 6 0 01-12 0c0-3 2-4 3-6 0 2 1 3 2 3 0-3-1-5 1-8z',
  gear: 'M12 8a4 4 0 110 8 4 4 0 010-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  sword: 'M14 4h6v6L9 21l-2-2 0 0-3 1 1-3-2-2z',
  fang: 'M6 4c0 8 3 14 6 16 3-2 6-8 6-16-2 3-4 4-6 4S8 7 6 4z',
  heavy: 'M4 10h16v6H4zM12 16v6M8 4l4 4 4-4',
  multi: 'M4 6l6 6-6 6M11 6l6 6-6 6M18 6v12',
  fire: 'M12 2c2 5 7 7 7 12a7 7 0 01-14 0c0-4 3-5 4-8 1 2 1 3 3 4 0-3-1-5 0-8z',
  shield: 'M12 2l8 3v7c0 5-4 8-8 10-4-2-8-5-8-10V5z',
  counter: 'M4 12a8 8 0 0114-5M20 12a8 8 0 01-14 5M18 3v4h-4M6 21v-4h4',
  charge: 'M13 2L4 14h7l-1 8 9-12h-7z',
  frost: 'M12 2v20M3 7l18 10M3 17L21 7M9 4l3 2 3-2M9 20l3-2 3 2',
  storm: 'M13 2L5 13h6l-2 9 9-12h-6z',
  venom: 'M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z',
  heal: 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z',
  buff: 'M12 3l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z',
  coin: 'M12 4a8 8 0 100 16 8 8 0 000-16zM12 8v8M9 10h5a1 1 0 010 2h-4a1 1 0 000 2h5',
  break: 'M12 2l8 3v7c0 5-4 8-8 10-4-2-8-5-8-10V5zM12 6l-2 5 4 2-2 5',
  thorns: 'M12 2v20M5 6l7 4M19 6l-7 4M5 14l7 4M19 14l-7 4',
  star: 'M12 2l2.5 7H22l-6 4.5 2.5 7.5-6.5-4.5L5.5 21 8 13.5 2 9h7.5z',
  phase: 'M12 3a9 9 0 100 18A6 6 0 0112 3z',
  void: 'M12 4a8 8 0 100 16 8 8 0 000-16zM12 9a3 3 0 100 6 3 3 0 000-6z',
  light: 'M12 7a5 5 0 100 10 5 5 0 000-10zM12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2',
  pick: 'M3 21l10-10M10 4c4-1 8 1 10 5-3-2-6-2-9-1zM8 8l3 3',
  leaf: 'M5 19C5 9 11 4 20 4c0 9-5 15-15 15zM5 19l8-8',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  lock: 'M6 11h12v10H6zM8 11V8a4 4 0 018 0v3',
  heart: 'M12 21s-8-5-8-11a4 4 0 018-1 4 4 0 018 1c0 6-8 11-8 11z',
  save: 'M5 3h12l3 3v15H4V3zM8 3v5h7V3M8 21v-7h8v7',
  flee: 'M14 4a2 2 0 110 4 2 2 0 010-4zM6 21l3-6 3 2v4M9 15l2-6 4 3 3-1M4 10l4-2',
  potion: 'M10 2h4v4l4 6v7a3 3 0 01-3 3H9a3 3 0 01-3-3v-7l4-6z',
  close: 'M5 5l14 14M19 5L5 19',
  check: 'M4 12l5 5L20 6',
  pause: 'M7 4h3v16H7zM14 4h3v16h-3z',
  play: 'M7 4l13 8-13 8z',
  refresh: 'M4 12a8 8 0 0114-5l2-2v6h-6l2-2a5 5 0 10 1 6',
  map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',
  rest: 'M3 18h18M5 18v-6h14v6M7 12V9h4v3M3 21v-3M21 21v-3',
  shop: 'M4 9l2-5h12l2 5M4 9h16v11H4zM9 20v-6h6v6',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v6M12 7h.01',
  trophy: 'M7 4h10v5a5 5 0 01-10 0zM7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4M12 14v4M8 21h8',
};
export function Icon({ name, size = 20, stroke = 'currentColor', fill = 'none', sw = 1.8, style, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={style} className={className} aria-hidden="true">
      <path d={IP[name] || IP.info} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------- materials ----------
export function MatIcon({ id, size = 28, q = 0 }) {
  const m = MATS[id]; if (!m) return null;
  const c = m.color; const d = m.dark;
  const uidp = useId().replace(/:/g, '');
  const g = `mg${uidp}`;
  let shape;
  const ingot = ['steel', 'silversteel', 'starforged'].includes(id);
  switch (ingot ? 'ingot' : m.kind) {
    case 'ingot': shape = <><path d="M6 22 L10 12 H26 L30 22 Z" fill={`url(#${g})`} stroke={d} strokeWidth="1.2" /><path d="M10 12 H26 L24 15 H12 Z" fill="#fff" opacity="0.35" /></>; break;
    case 'metal': shape = <><path d="M8 24 L5 15 L11 7 L21 5 L29 11 L30 21 L22 29 L12 28 Z" fill={`url(#${g})`} stroke={d} strokeWidth="1.2" /><path d="M11 7 L21 5 L18 13 L11 14 Z" fill="#fff" opacity="0.28" /><circle cx="20" cy="19" r="2.4" fill={c} opacity="0.9" /><circle cx="13" cy="21" r="1.6" fill={c} opacity="0.8" /></>; break;
    case 'fuel': shape = <path d="M7 23 L6 14 L13 8 L23 9 L29 16 L26 26 L15 28 Z" fill="#26262c" stroke="#55555f" strokeWidth="1.2" />; break;
    case 'gem': shape = <><path d="M18 4 L29 13 L18 31 L7 13 Z" fill={`url(#${g})`} stroke={d} strokeWidth="1.2" /><path d="M7 13 H29 M18 4 L13 13 L18 31 L23 13 Z" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.8" /></>; break;
    case 'wood': shape = <><rect x="5" y="12" width="26" height="12" rx="6" fill={c} stroke={d} strokeWidth="1.2" /><ellipse cx="28" cy="18" rx="4" ry="6" fill={d} /><ellipse cx="28" cy="18" rx="2" ry="3.4" fill={c} /></>; break;
    case 'hide': shape = <path d="M8 8 Q18 4 28 8 L30 16 Q26 20 29 28 Q18 31 7 28 Q10 20 6 16 Z" fill={c} stroke={d} strokeWidth="1.2" />; break;
    case 'herb': shape = <><path d="M18 31 V14" stroke="#4a7a3a" strokeWidth="2" /><path d="M18 18 C8 18 6 8 10 5 C16 7 18 12 18 18 Z M18 16 C26 16 30 8 27 4 C21 6 18 10 18 16 Z" fill={c} stroke={d} strokeWidth="1" /></>; break;
    case 'monster': shape = <><path d="M18 4 C26 12 29 18 29 22 A11 11 0 0 1 7 22 C7 18 10 12 18 4 Z" fill={`url(#${g})`} stroke={d} strokeWidth="1.2" /><circle cx="14" cy="20" r="2.5" fill="#fff" opacity="0.45" /></>; break;
    case 'relic': shape = <><rect x="8" y="5" width="20" height="26" rx="3" fill={c} stroke={d} strokeWidth="1.2" /><path d="M12 11 L18 15 L24 11 M12 19 H24 M14 24 L18 21 L22 24" stroke={d} strokeWidth="1.4" fill="none" /></>; break;
    case 'essence': shape = <><circle cx="18" cy="18" r="11" fill={`url(#${g})`} /><circle cx="18" cy="18" r="5" fill="#fff" opacity="0.8" /></>; break;
    case 'boss': default: shape = <><path d="M18 3 L22 13 L32 14 L24 21 L27 31 L18 25 L9 31 L12 21 L4 14 L14 13 Z" fill={`url(#${g})`} stroke={d} strokeWidth="1.2" /></>; break;
  }
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true" className="maticon">
      <defs><radialGradient id={g} cx="35%" cy="30%" r="75%"><stop offset="0" stopColor="#fff" stopOpacity="0.7" /><stop offset="0.35" stopColor={c} /><stop offset="1" stopColor={d} /></radialGradient></defs>
      {q > 0 && <circle cx="18" cy="18" r="17" fill="none" stroke={q === 2 ? '#ffd76a' : '#9ec9ff'} strokeWidth="1.4" strokeDasharray={q === 2 ? '0' : '3 3'} opacity="0.9" />}
      {shape}
    </svg>
  );
}

// ---------- weapons ----------
const WOOD = { oakwood: '#a8773f', ironwood: '#6d5a48', spiritwood: '#9bd6b0' };
export function WeaponArt({ item, spec, size = 120, glow = true, className }) {
  const it = item || spec || {};
  const bp = BLUEPRINTS[it.bp] || BLUEPRINTS.arming;
  const m = MATS[it.mat] || MATS.iron;
  const comps = (it.comps || []).map((c) => COMPONENTS[c]).filter(Boolean);
  const elem = (it.stats && it.stats.elem) || (it.ench ? null : m.elem) || 'none';
  const ec = ELEMENTS[elem] ? ELEMENTS[elem].color : '#fff';
  const rar = RARITIES[it.rarity || 0];
  const id = useId().replace(/:/g, '');
  const seed = it.seed || 7;
  const v = (k) => ((seed >> k) & 7) / 7; // 0..1 variation
  const gripC = comps.find((c) => c.slot === 'grip'); const guardC = comps.find((c) => c.slot === 'guard'); const coreC = comps.find((c) => c.slot === 'core'); const fit = comps.find((c) => c.slot === 'fitting');
  const gripCol = gripC ? MATS[Object.keys(gripC.cost)[0]].color : '#5a3a22';
  const guardCol = guardC ? MATS[Object.keys(guardC.cost)[0]].color : m.dark;
  const gem = coreC ? MATS[Object.keys(coreC.cost)[0]].color : null;
  const woodK = Object.keys(bp.extra).find((k) => WOOD[k]);
  const wood = woodK ? WOOD[woodK] : '#7a5530';
  const serr = fit && fit.bleed;
  const runes = !!it.ench;
  const T = bp.tier;
  const metal = `url(#wm${id})`;
  let parts;
  const runeMarks = (x, y1, y2) => runes && <g opacity="0.95">{Array.from({ length: 4 }, (_, i) => { const y = y1 + (y2 - y1) * (i + 0.5) / 4; return <path key={i} d={`M${x - 1.6} ${y - 1.6} L${x + 1.6} ${y} L${x - 1.6} ${y + 1.6}`} stroke={ec} strokeWidth="0.9" fill="none" className="runeglow" />; })}</g>;
  switch (bp.cat) {
    case 'dagger': {
      const top = 26 - T * 2; const w = 4.5 + v(1) * 1.5; const kris = it.bp === 'shadowkris';
      const blade = kris ? `M50 ${top} C${50 + w} ${top + 8} ${50 - w} ${top + 16} ${50 + w} ${top + 24} C${50 + w + 1} ${top + 30} ${50 + w} 60 ${50 + w} 62 L${50 - w} 62 C${50 - w} 58 ${50 - w - 2} ${top + 30} ${50 - w} ${top + 22} C${50 - w} ${top + 14} ${50 + w - 2} ${top + 8} 50 ${top} Z` : `M50 ${top} L${50 + w} ${top + 12} L${50 + w} 62 L${50 - w} 62 L${50 - w} ${top + 12} Z`;
      parts = <>
        <path d={blade} fill={metal} stroke={m.dark} strokeWidth="0.8" />
        {serr && <path d={`M${50 + w} ${top + 16} l2 2 -2 2 2 2 -2 2 2 2 -2 2`} stroke={m.dark} strokeWidth="1" fill="none" />}
        <path d={`M50 ${top + 3} V60`} stroke="#fff" strokeOpacity="0.4" strokeWidth="0.8" />
        {runeMarks(50, top + 14, 58)}
        <rect x={50 - 9 - v(2) * 3} y="62" width={18 + v(2) * 6} height="4" rx="2" fill={guardCol} stroke="#00000055" strokeWidth="0.6" />
        <rect x="47.3" y="66" width="5.4" height="16" rx="1.5" fill={gripCol} />
        <path d="M47.3 69 H52.7 M47.3 73 H52.7 M47.3 77 H52.7" stroke="#0004" strokeWidth="0.8" />
        <circle cx="50" cy="85" r={3.4} fill={gem || guardCol} stroke="#0006" strokeWidth="0.6" />
      </>;
      break;
    }
    case 'greatsword': {
      const w = 7 + v(1) * 2; const top = 3;
      parts = <>
        <path d={`M50 ${top} L${50 + w} ${top + 10} L${50 + w + 1} 64 L${50 - w - 1} 64 L${50 - w} ${top + 10} Z`} fill={metal} stroke={m.dark} strokeWidth="0.8" />
        {serr && <path d={`M${50 + w} 18 l2.5 2.5 -2.5 2.5 2.5 2.5 -2.5 2.5 2.5 2.5 -2.5 2.5 2.5 2.5 -2.5 2.5`} stroke={m.dark} strokeWidth="1" fill="none" />}
        <path d={`M50 ${top + 6} V60`} stroke={m.dark} strokeOpacity="0.6" strokeWidth="2" />
        <path d={`M48.6 ${top + 8} V58`} stroke="#fff" strokeOpacity="0.35" strokeWidth="0.8" />
        {runeMarks(50, 16, 58)}
        <path d={`M${30 - v(3) * 4} 64 Q50 ${60 - v(4) * 3} ${70 + v(3) * 4} 64 L${68 + v(3) * 4} 69 Q50 66 ${32 - v(3) * 4} 69 Z`} fill={guardCol} stroke="#0006" strokeWidth="0.6" />
        <rect x="47" y="69" width="6" height="20" rx="1.5" fill={gripCol} />
        <path d="M47 72 L53 75 M47 77 L53 80 M47 82 L53 85" stroke="#0005" strokeWidth="0.8" />
        <circle cx="50" cy="92" r="4" fill={gem || guardCol} stroke="#0006" strokeWidth="0.6" />
        {gem && <circle cx="50" cy="66.5" r="2.2" fill={gem} />}
      </>;
      break;
    }
    case 'spear': {
      const head = it.bp === 'stormlance' ? 'M50 2 L57 20 L53 34 L47 34 L43 20 Z' : it.bp === 'warpike' ? 'M50 2 L54 12 L54 32 L46 32 L46 12 Z' : 'M50 4 C57 14 57 24 52 33 L48 33 C43 24 43 14 50 4 Z';
      parts = <>
        <rect x="48.2" y="32" width="3.6" height="64" rx="1.5" fill={wood} stroke="#0004" strokeWidth="0.5" />
        <path d={head} fill={metal} stroke={m.dark} strokeWidth="0.8" />
        {it.bp === 'warpike' && <path d="M54 22 L62 18 L54 27 Z" fill={metal} stroke={m.dark} strokeWidth="0.6" />}
        <path d="M50 8 V30" stroke="#fff" strokeOpacity="0.4" strokeWidth="0.8" />
        {runeMarks(50, 12, 30)}
        <rect x="46.5" y="33" width="7" height="4" rx="1" fill={guardCol} />
        <rect x="47.5" y="58" width="5" height="14" rx="1.5" fill={gripCol} />
        {gem && <circle cx="50" cy="40" r="2.4" fill={gem} />}
        <path d="M48 96 L50 99 L52 96" fill={m.dark} />
      </>;
      break;
    }
    case 'hammer': {
      const hw = it.bp === 'earthshaker' ? 22 : it.bp === 'warhammer' ? 18 : 15; const hh = it.bp === 'earthshaker' ? 20 : 16;
      parts = <>
        <rect x="48" y="24" width="4" height="72" rx="1.5" fill={wood} stroke="#0004" strokeWidth="0.5" />
        <path d={`M${50 - hw} ${14} L${50 + hw} ${14} L${50 + hw + 2} ${14 + hh} L${50 - hw - 2} ${14 + hh} Z`} fill={metal} stroke={m.dark} strokeWidth="0.9" />
        {it.bp !== 'mallet' && <path d={`M${50 + hw + 1} 18 L${50 + hw + 10} ${14 + hh / 2} L${50 + hw + 1} ${10 + hh}`} fill={metal} stroke={m.dark} strokeWidth="0.7" />}
        <path d={`M${50 - hw + 2} 16 H${50 + hw - 2}`} stroke="#fff" strokeOpacity="0.4" strokeWidth="1" />
        {runes && <path d={`M${50 - 6} ${14 + hh / 2} L50 ${16} L${50 + 6} ${14 + hh / 2} L50 ${12 + hh}Z`} stroke={ec} strokeWidth="1" fill="none" className="runeglow" />}
        {gem && <circle cx="50" cy={14 + hh / 2} r="3" fill={gem} stroke="#0006" strokeWidth="0.6" />}
        <rect x="46.5" y="36" width="7" height="4" rx="1" fill={guardCol} />
        <rect x="47.4" y="72" width="5.2" height="18" rx="1.5" fill={gripCol} />
        <circle cx="50" cy="93" r="3" fill={guardCol} />
      </>;
      break;
    }
    case 'staff': {
      const orb = gem || m.color;
      parts = <>
        <path d="M49 22 C47 40 52 60 49 96 L51.5 96 C54 60 49.5 40 52 22 Z" fill={wood} stroke="#0004" strokeWidth="0.5" />
        <path d={`M50 22 C40 20 38 8 44 4 C42 10 46 14 50 14 C54 14 58 10 56 4 C62 8 60 20 50 22 Z`} fill={metal} stroke={m.dark} strokeWidth="0.8" />
        <circle cx="50" cy="11" r="5.2" fill={orb} stroke="#fff" strokeOpacity="0.6" strokeWidth="0.8" className="orbglow" />
        <circle cx="48.4" cy="9.4" r="1.6" fill="#fff" opacity="0.8" />
        {runeMarks(50.5, 30, 56)}
        <rect x="47.6" y="58" width="5" height="14" rx="1.5" fill={gripCol} />
        <path d="M48 95 L50 99 L52 95" fill={m.dark} />
      </>;
      break;
    }
    case 'sword': default: {
      const w = 4.6 + v(1) * 1.6 + (T >= 3 ? 0.6 : 0); const top = 8 - T;
      const tip = it.bp === 'runeblade' ? `M50 ${top} L${50 + w} ${top + 6}` : `M50 ${top} L${50 + w} ${top + 10}`;
      parts = <>
        <path d={`${tip} L${50 + w} 62 L${50 - w} 62 L${50 - w} ${top + (it.bp === 'runeblade' ? 6 : 10)} Z`} fill={metal} stroke={m.dark} strokeWidth="0.8" />
        {serr && <path d={`M${50 + w} 20 l2 2 -2 2 2 2 -2 2 2 2 -2 2 2 2 -2 2`} stroke={m.dark} strokeWidth="1" fill="none" />}
        <path d={`M50 ${top + 10} V58`} stroke={m.dark} strokeOpacity="0.55" strokeWidth="1.6" />
        <path d={`M48.8 ${top + 10} V58`} stroke="#fff" strokeOpacity="0.4" strokeWidth="0.7" />
        {runeMarks(50, top + 14, 58)}
        {it.bp === 'starfall' && <path d="M50 20 l1.5 3 3 .4 -2.2 2 .6 3 -2.9-1.5 -2.9 1.5 .6-3 -2.2-2 3-.4z" fill="#fff8c8" className="runeglow" />}
        <path d={`M${36 - v(3) * 5} 62 L${64 + v(3) * 5} 62 L${62 + v(3) * 5} 66.5 L${38 - v(3) * 5} 66.5 Z`} fill={guardCol} stroke="#0006" strokeWidth="0.6" />
        {gem && <circle cx="50" cy="64.2" r="2.3" fill={gem} />}
        <rect x="47.4" y="66.5" width="5.2" height="17" rx="1.5" fill={gripCol} />
        <path d="M47.4 69 L52.6 71.5 M47.4 73.5 L52.6 76 M47.4 78 L52.6 80.5" stroke="#0005" strokeWidth="0.8" />
        <path d="M50 83 L54 87 L50 91 L46 87 Z" fill={gem || guardCol} stroke="#0006" strokeWidth="0.6" />
      </>;
    }
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={'weapon-art ' + (className || '')} aria-hidden="true">
      <defs>
        <linearGradient id={`wm${id}`} x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0" stopColor={m.dark} /><stop offset="0.45" stopColor={m.color} /><stop offset="0.55" stopColor="#ffffff" stopOpacity="0.9" /><stop offset="0.62" stopColor={m.color} /><stop offset="1" stopColor={m.dark} />
        </linearGradient>
        <radialGradient id={`wa${id}`}><stop offset="0" stopColor={elem !== 'none' ? ec : rar.color} stopOpacity="0.55" /><stop offset="1" stopColor={rar.color} stopOpacity="0" /></radialGradient>
      </defs>
      {glow && (it.rarity || 0) >= 2 && <circle cx="50" cy="50" r="48" fill={`url(#wa${id})`} className="aura" />}
      <g transform="rotate(45 50 50)">{parts}</g>
    </svg>
  );
}

// ---------- enemies ----------
export function EnemyArt({ enemy, size = 180, hit, className }) {
  const a = enemy.art; const b = a.body; const c = a.accent;
  const id = useId().replace(/:/g, '');
  const g = `url(#eb${id})`;
  let body;
  const eyes = (x1, x2, y, r = 3, col = c) => <><circle cx={x1} cy={y} r={r} fill={col} className="eye" /><circle cx={x2} cy={y} r={r} fill={col} className="eye" /></>;
  switch (a.shape) {
    case 'beast': body = <><ellipse cx="100" cy="125" rx="62" ry="38" fill={g} /><path d="M50 105 L60 80 L72 100 L82 74 L94 98 L106 72 L118 96 L130 76 L140 102" fill={c} opacity="0.8" /><ellipse cx="52" cy="128" rx="26" ry="22" fill={g} /><path d="M32 138 Q26 124 36 120" stroke="#fff6d8" strokeWidth="5" fill="none" strokeLinecap="round" /><rect x="70" y="150" width="12" height="26" rx="5" fill={b} /><rect x="120" y="150" width="12" height="26" rx="5" fill={b} />{eyes(44, 58, 122, 3, '#ffdf6a')}</>; break;
    case 'slime': body = <><path d="M40 160 Q30 100 100 70 Q170 100 160 160 Z" fill={g} /><ellipse cx="80" cy="100" rx="16" ry="8" fill="#fff" opacity="0.35" />{eyes(82, 118, 122, 6, '#2a1206')}<path d="M88 140 Q100 148 112 140" stroke="#2a1206" strokeWidth="3" fill="none" /></>; break;
    case 'bats': body = <>{[[70, 80, 1], [125, 70, 0.8], [100, 120, 1.1], [55, 135, 0.7], [145, 125, 0.85]].map(([x, y, s], i) => <g key={i} transform={`translate(${x} ${y}) scale(${s})`} className={`bat bat${i}`}><path d="M0 0 Q-14 -14 -30 -6 Q-22 0 -24 8 Q-14 2 -8 8 Q-4 2 0 6 Q4 2 8 8 Q14 2 24 8 Q22 0 30 -6 Q14 -14 0 0Z" fill={b} /><circle cx="-3" cy="0" r="1.6" fill={c} /><circle cx="3" cy="0" r="1.6" fill={c} /></g>)}</>; break;
    case 'wolf': body = <><path d="M40 140 Q50 95 100 95 Q150 95 160 140 Q130 160 70 160Z" fill={g} /><path d="M38 118 L28 72 L52 96 Z M70 100 L62 64 L84 92Z" fill={b} /><path d="M20 120 Q30 90 60 92 Q80 100 78 124 Q60 140 30 136Z" fill={g} /><path d="M20 124 L34 130 L26 134Z" fill="#fff" />{eyes(40, 58, 110, 3.2, c)}<path d="M150 130 Q190 110 178 80" stroke={b} strokeWidth="12" fill="none" strokeLinecap="round" />{a.boss && <path d="M60 94 Q80 70 100 92 Q120 66 140 94" stroke={c} strokeWidth="4" fill="none" className="flame" />}<rect x="60" y="150" width="12" height="28" rx="5" fill={b} /><rect x="128" y="150" width="12" height="28" rx="5" fill={b} /></>; break;
    case 'golem': body = <><rect x="60" y="70" width="80" height="82" rx="10" fill={g} /><rect x="74" y="34" width="52" height="44" rx="8" fill={g} /><rect x="28" y="78" width="30" height="70" rx="12" fill={g} /><rect x="142" y="78" width="30" height="70" rx="12" fill={g} /><rect x="70" y="150" width="22" height="30" rx="5" fill={b} /><rect x="108" y="150" width="22" height="30" rx="5" fill={b} /><path d="M80 90 L95 110 L88 130 M120 88 L110 108 L118 128" stroke={c} strokeWidth="3" fill="none" className="eye" />{eyes(90, 110, 56, 4.5, c)}</>; break;
    case 'bird': body = <><path d="M100 60 Q130 90 120 140 L80 140 Q70 90 100 60Z" fill={g} /><path d="M90 90 Q40 60 10 90 Q40 100 50 120 Q70 110 90 120Z M110 90 Q160 60 190 90 Q160 100 150 120 Q130 110 110 120Z" fill={b} className="wing" /><circle cx="100" cy="62" r="18" fill={g} /><path d="M100 70 L108 80 L100 78Z" fill="#ffcf5a" />{eyes(93, 107, 60, 2.6, c)}<path d="M86 140 L80 172 M114 140 L120 172" stroke={b} strokeWidth="5" /></>; break;
    case 'knight': body = <><path d="M60 80 L140 80 L150 150 L50 150Z" fill={g} /><rect x="76" y="30" width="48" height="52" rx="14" fill={g} /><rect x="82" y="50" width="36" height="6" fill="#111" /><rect x="82" y="50" width="36" height="6" fill={c} opacity="0.7" className="eye" /><path d="M40 90 L60 84 L64 140 L42 150Z" fill={b} /><path d="M150 76 L176 80 L170 150 L148 130Z" fill={c} opacity="0.85" /><path d="M150 80 L190 20" stroke="#c8ccd8" strokeWidth="6" strokeLinecap="round" /><rect x="66" y="150" width="24" height="30" rx="4" fill={b} /><rect x="110" y="150" width="24" height="30" rx="4" fill={b} />{a.crown && <path d="M76 30 L82 14 L92 26 L100 10 L108 26 L118 14 L124 30Z" fill={c} />}</>; break;
    case 'wisp': body = <><circle cx="100" cy="100" r="46" fill={c} opacity="0.15" className="pulse" /><circle cx="100" cy="100" r="30" fill={g} /><path d="M100 130 Q90 160 100 185 Q110 160 100 130" fill={b} opacity="0.6" />{eyes(90, 110, 96, 4, '#0a3a30')}</>; break;
    case 'plant': body = <><path d="M60 170 Q50 120 80 100 Q60 70 100 50 Q140 70 120 100 Q150 120 140 170Z" fill={g} /><path d="M70 110 L40 96 M130 110 L160 92 M80 80 L58 60 M120 80 L146 58" stroke={b} strokeWidth="6" strokeLinecap="round" /><path d="M40 96 l-6 -4 M160 92 l6 -6 M58 60 l-6 -4 M146 58 l6 -4" stroke={c} strokeWidth="3" />{eyes(88, 112, 90, 4, c)}<path d="M88 112 Q100 104 112 112" stroke="#111" strokeWidth="3" fill="none" /></>; break;
    case 'tree': body = <><path d="M80 180 L86 110 L60 70 L90 90 L100 40 L110 90 L140 66 L114 110 L120 180Z" fill={b} /><circle cx="100" cy="70" r="56" fill={g} opacity="0.85" /><circle cx="60" cy="90" r="30" fill={g} opacity="0.8" /><circle cx="140" cy="90" r="30" fill={g} opacity="0.8" />{eyes(88, 112, 120, 5, c)}<path d="M86 140 Q100 132 114 140" stroke={c} strokeWidth="3" fill="none" />{a.boss && <><circle cx="70" cy="60" r="6" fill={c} className="pulse" /><circle cx="134" cy="66" r="5" fill={c} className="pulse" /><circle cx="100" cy="30" r="6" fill={c} className="pulse" /></>}</>; break;
    case 'construct': body = <><path d="M100 30 L130 60 L120 150 L80 150 L70 60Z" fill={g} /><circle cx="100" cy="90" r="14" fill={c} className="pulse" /><path d="M70 64 L36 90 L44 132 M130 64 L164 90 L156 132" stroke={b} strokeWidth="10" strokeLinecap="round" fill="none" /><path d="M86 150 L80 180 M114 150 L120 180" stroke={b} strokeWidth="10" strokeLinecap="round" /><path d="M88 52 H112" stroke={c} strokeWidth="4" className="eye" /></>; break;
    case 'wraith': body = <><path d="M100 30 Q150 40 145 110 Q150 150 170 180 Q140 168 125 178 Q112 160 100 180 Q88 160 75 178 Q60 168 30 180 Q50 150 55 110 Q50 40 100 30Z" fill={g} opacity="0.92" className="float" /><path d="M72 70 Q100 56 128 70 Q128 100 100 106 Q72 100 72 70Z" fill="#000" opacity="0.6" />{eyes(88, 112, 82, 5, c)}</>; break;
    case 'lizard': body = <><path d="M30 140 Q60 100 110 110 Q150 116 170 140 Q130 150 90 150 Q50 156 30 140Z" fill={g} /><path d="M20 132 Q30 110 56 116 L60 136 Q40 146 20 132Z" fill={g} />{eyes(36, 46, 124, 2.8, c)}<path d="M60 108 L70 94 L80 108 L90 92 L100 108 L110 94 L120 110" fill={c} /><path d="M170 140 Q190 150 196 170" stroke={b} strokeWidth="10" fill="none" strokeLinecap="round" /><path d="M64 148 L58 170 M140 146 L148 168" stroke={b} strokeWidth="8" strokeLinecap="round" /></>; break;
    case 'dragon': body = <><path d="M40 120 Q20 40 90 70 L100 100Z M160 120 Q180 40 110 70 L100 100Z" fill={b} opacity="0.85" className="wing" /><ellipse cx="100" cy="130" rx="46" ry="36" fill={g} /><path d="M100 100 Q96 70 110 52" stroke={b} strokeWidth="18" fill="none" strokeLinecap="round" /><path d="M96 40 Q120 30 136 46 L124 60 Q108 62 100 54Z" fill={g} />{eyes(112, 124, 46, 3, c)}<path d="M104 36 L96 22 M118 34 L116 18" stroke={c} strokeWidth="3" />{a.boss && <path d="M136 50 Q156 50 170 62" stroke={c} strokeWidth="4" fill="none" className="flame" />}<path d="M80 160 L74 180 M120 160 L126 180" stroke={b} strokeWidth="10" strokeLinecap="round" /></>; break;
    case 'sovereign': body = <><path d="M100 40 Q160 60 160 130 Q160 170 180 190 L20 190 Q40 170 40 130 Q40 60 100 40Z" fill={g} className="float" /><path d="M72 48 L80 20 L92 40 L100 14 L108 40 L120 20 L128 48Z" fill={c} className="pulse" /><ellipse cx="100" cy="86" rx="26" ry="30" fill="#000" opacity="0.85" />{eyes(90, 110, 84, 4, c)}<circle cx="100" cy="140" r="10" fill={c} opacity="0.5" className="pulse" /></>; break;
    case 'smith': body = <><path d="M60 80 L140 80 L150 160 L50 160Z" fill={g} /><circle cx="100" cy="56" r="26" fill={g} /><path d="M78 60 Q100 92 122 60 Q118 84 100 88 Q82 84 78 60Z" fill={c} opacity="0.5" />{eyes(90, 110, 52, 3.6, c)}<path d="M150 90 L176 40" stroke={b} strokeWidth="6" /><rect x="160" y="24" width="32" height="20" rx="3" fill={c} className="pulse" /><path d="M50 100 L30 140" stroke={b} strokeWidth="12" strokeLinecap="round" /><rect x="66" y="160" width="24" height="24" rx="4" fill={b} /><rect x="110" y="160" width="24" height="24" rx="4" fill={b} /></>; break;
    case 'humanoid': default: body = <><path d="M70 80 L130 80 L138 150 L62 150Z" fill={g} /><circle cx="100" cy="58" r="22" fill="#d8b090" /><path d="M76 56 Q100 24 124 56 Q124 40 100 34 Q76 40 76 56Z" fill={b} /><rect x="78" y="58" width="44" height="10" fill={c} opacity="0.9" />{eyes(92, 108, 54, 2.4, '#1a0a0a')}<path d="M138 90 L168 60" stroke="#c8ccd8" strokeWidth="5" strokeLinecap="round" /><path d="M62 90 L40 130" stroke={b} strokeWidth="10" strokeLinecap="round" /><rect x="72" y="150" width="20" height="30" rx="4" fill={b} /><rect x="108" y="150" width="20" height="30" rx="4" fill={b} />{a.crown && <path d="M80 36 L86 22 L94 32 L100 18 L106 32 L114 22 L120 36Z" fill={c} />}</>; break;
  }
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={'enemy-art ' + (hit ? 'hit ' : '') + (className || '')} aria-hidden="true">
      <defs><radialGradient id={`eb${id}`} cx="40%" cy="30%" r="80%"><stop offset="0" stopColor={c} stopOpacity="0.55" /><stop offset="0.4" stopColor={b} /><stop offset="1" stopColor="#000" stopOpacity="0.85" /></radialGradient></defs>
      <ellipse cx="100" cy="186" rx="60" ry="8" fill="#000" opacity="0.35" />
      <g className="enemy-body">{body}</g>
    </svg>
  );
}

// ---------- scenes ----------
const SKY = {
  emberfall: ['#3a1c14', '#a2482a', '#f0a05a'], ironspine: ['#141c2a', '#3a5270', '#a8c0d8'], wilds: ['#060f12', '#12303a', '#2f6b5a'],
  ashen: ['#120606', '#4a120a', '#d8501e'], astral: ['#04030f', '#1a1450', '#5a3aa0'],
};
export function Scene({ region, type, height = 150, className }) {
  const id = useId().replace(/:/g, '');
  const [a, b, c] = SKY[region] || SKY.emberfall;
  const r = REGIONS[region] || REGIONS.emberfall;
  let land;
  switch (region) {
    case 'ironspine': land = <><path d="M0 120 L50 50 L80 80 L130 20 L180 90 L220 40 L270 100 L320 30 L370 85 L400 60 L400 160 L0 160Z" fill="#26303e" /><path d="M130 20 L145 40 L120 42Z M320 30 L338 52 L306 50Z M220 40 L232 56 L210 56Z" fill="#e8f2ff" /><path d="M0 140 L80 110 L160 130 L260 105 L400 130 L400 160 L0 160Z" fill="#161c26" /></>; break;
    case 'wilds': land = <><circle cx="320" cy="40" r="22" fill="#e8f0ff" opacity="0.9" />{Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${i * 30 - 5} 160 L${i * 30 + 10} ${70 + (i * 37) % 40} L${i * 30 + 25} 160Z`} fill={i % 2 ? '#0c2420' : '#12302a'} />)}{Array.from({ length: 10 }, (_, i) => <circle key={'m' + i} cx={(i * 47) % 400} cy={80 + (i * 29) % 60} r="1.8" fill="#9effd8" className="mote" style={{ animationDelay: i * 0.4 + 's' }} />)}</>; break;
    case 'ashen': land = <><path d="M120 160 L200 40 L230 40 L310 160Z" fill="#2a0e08" /><path d="M200 40 L215 30 L230 40 L222 60 L210 58Z" fill="#ff6a1a" className="flame" /><path d="M212 60 Q206 100 196 160 L206 160 Q214 110 218 60Z" fill="#ff7a2a" opacity="0.8" /><path d="M0 140 Q100 120 200 145 T400 135 L400 160 L0 160Z" fill="#1a0806" /><path d="M0 152 Q60 146 120 154 T260 150 T400 154" stroke="#ff5a1a" strokeWidth="2" fill="none" opacity="0.7" /></>; break;
    case 'astral': land = <>{Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(i * 97) % 400} cy={(i * 53) % 120} r={i % 5 === 0 ? 1.6 : 0.9} fill="#fff" className="twinkle" style={{ animationDelay: (i % 7) * 0.5 + 's' }} />)}<path d="M40 110 Q90 96 140 110 L120 130 Q90 146 60 130Z" fill="#2a2058" /><path d="M230 80 Q300 64 360 82 L340 104 Q300 124 250 102Z" fill="#33286a" /><path d="M170 140 Q210 130 250 140 L236 152 Q210 160 184 152Z" fill="#2a2058" /></>; break;
    case 'emberfall': default: land = <><circle cx="320" cy="50" r="26" fill="#ffd08a" opacity="0.8" /><path d="M0 110 Q80 70 160 100 T320 90 T400 100 L400 160 L0 160Z" fill="#5a2a18" /><path d="M0 130 Q100 110 200 128 T400 124 L400 160 L0 160Z" fill="#3a1a10" />{Array.from({ length: 9 }, (_, i) => <g key={i} transform={`translate(${20 + i * 45} ${118 - (i % 3) * 6})`}><rect x="-2" y="0" width="4" height="16" fill="#2a140a" /><circle cx="0" cy="-4" r="12" fill={i % 2 ? '#c0502a' : '#e07a30'} /></g>)}</>;
  }
  let over = null;
  switch (type) {
    case 'home': over = <g transform="translate(70 92)"><rect x="0" y="20" width="70" height="44" fill="#3a2216" /><path d="M-6 22 L35 -6 L76 22Z" fill="#5a2e1a" /><rect x="50" y="-4" width="10" height="20" fill="#3a2216" /><rect x="10" y="34" width="20" height="30" fill="#ffb347" className="forgeglow" /><circle cx="56" cy="-10" r="5" fill="#bbb" opacity="0.5" className="smoke" /></g>; break;
    case 'mine': over = <g transform="translate(150 96)"><path d="M0 64 L0 20 Q40 -10 80 20 L80 64Z" fill="#1a1210" /><path d="M8 64 L8 24 Q40 0 72 24 L72 64Z" fill="#050303" /><rect x="0" y="18" width="80" height="6" fill="#6a4a2a" /><rect x="4" y="18" width="6" height="46" fill="#6a4a2a" /><rect x="70" y="18" width="6" height="46" fill="#6a4a2a" /><circle cx="40" cy="44" r="3" fill="#ffcf6a" className="forgeglow" /></g>; break;
    case 'ruin': over = <g transform="translate(130 70)" fill="#00000088">{[0, 34, 68, 102].map((x, i) => <rect key={i} x={x} y={i % 2 ? 30 : 10} width="16" height={i % 2 ? 60 : 80} />)}<rect x="-6" y="4" width="64" height="10" /></g>; break;
    case 'boss': over = <g transform="translate(170 80)"><circle cx="30" cy="30" r="40" fill={r.color} opacity="0.18" className="pulse" /><path d="M10 30 Q30 -4 50 30 Q50 52 40 56 L20 56 Q10 52 10 30Z" fill="#e8dcc8" /><circle cx="22" cy="30" r="6" fill="#000" /><circle cx="38" cy="30" r="6" fill="#000" /><path d="M24 48 V56 M30 48 V56 M36 48 V56" stroke="#000" strokeWidth="2" /></g>; break;
    case 'outpost': over = <g transform="translate(110 100)"><path d="M0 56 L30 6 L60 56Z" fill="#7a4a2a" /><path d="M70 56 L95 16 L120 56Z" fill="#5a3a22" /><circle cx="86" cy="56" r="6" fill="#ff8a2a" className="forgeglow" /></g>; break;
    default: break;
  }
  return (
    <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" width="100%" height={height} className={'scene ' + (className || '')} aria-hidden="true">
      <defs><linearGradient id={`sk${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="0.6" stopColor={b} /><stop offset="1" stopColor={c} /></linearGradient></defs>
      <rect width="400" height="160" fill={`url(#sk${id})`} />
      {land}{over}
    </svg>
  );
}

export function RarityGem({ r, size = 12 }) {
  const R = RARITIES[r] || RARITIES[0];
  return <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true"><path d="M6 0 L12 6 L6 12 L0 6Z" fill={R.color} /></svg>;
}
