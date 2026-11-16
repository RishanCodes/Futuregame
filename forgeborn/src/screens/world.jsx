// FORGEBORN — World map, locations, exploration events, mining, foraging and the merchant.
import React, { useState } from 'react';
import { REGIONS, LOCATIONS, ENEMIES, MATS, EVENTS, SHOP, CONSUMABLES, PICKAXES } from '../data.js';
import * as G from '../engine.js';
import { startBattle } from '../combat.js';
import { useGame, useNav, Modal, Bar, MatChip, Section } from '../ui.jsx';
import { Scene, MatIcon, Icon, EnemyArt } from '../art.jsx';
import { MiningGame, ForageGame } from '../gather.jsx';
import { sfx } from '../sfx.js';

const BLOBS = {
  emberfall: 'M30 360 Q120 320 250 335 Q380 325 412 420 Q425 540 330 610 Q200 640 80 612 Q18 560 30 460 Z',
  ironspine: 'M30 40 Q150 8 300 28 Q425 60 412 200 Q402 300 300 318 Q160 330 60 300 Q8 200 30 40 Z',
  wilds: 'M450 196 Q520 138 640 148 Q775 168 792 290 Q792 420 700 452 Q560 472 478 420 Q420 320 450 196 Z',
  ashen: 'M650 470 Q720 418 860 405 Q985 418 992 520 Q992 622 880 632 Q720 632 660 582 Q618 520 650 470 Z',
  astral: 'M740 36 Q820 -2 942 16 Q1000 60 992 180 Q982 272 880 282 Q780 282 750 200 Q718 110 740 36 Z',
};
const LABEL = { emberfall: [200, 600], ironspine: [210, 300], wilds: [620, 440], ashen: [820, 590], astral: [860, 272] };
const BOSS_OF = { ironspine: 'Grimjaw', wilds: 'Korrath', ashen: 'Sylvara', astral: 'Pyraxis' };

function MapDecor({ region }) {
  switch (region) {
    case 'emberfall': return <g opacity="0.55">{[[80, 460], [120, 570], [250, 410], [300, 560], [360, 470], [210, 600], [60, 520]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}><rect x="-2" y="0" width="4" height="10" fill="#3a1a0a" /><circle r="10" cy="-2" fill={i % 2 ? '#c0502a' : '#e07a30'} /></g>)}</g>;
    case 'ironspine': return <g opacity="0.6">{[[80, 110], [160, 60], [280, 70], [360, 220], [80, 250], [300, 260]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}><path d="M-24 18 L0 -22 L24 18Z" fill="#5a6a80" /><path d="M-7 -10 L0 -22 L7 -10Z" fill="#eef4ff" /></g>)}</g>;
    case 'wilds': return <g opacity="0.55">{[[480, 260], [560, 200], [700, 230], [760, 380], [540, 420], [660, 330], [500, 360]].map(([x, y], i) => <path key={i} transform={`translate(${x} ${y})`} d="M0 -22 L12 10 L-12 10Z" fill={i % 2 ? '#1e5a40' : '#2a7a52'} />)}</g>;
    case 'ashen': return <g opacity="0.65"><path d="M900 520 L930 470 L960 520Z" fill="#3a1410" /><path d="M925 478 L935 470 L944 478" stroke="#ff6a1a" strokeWidth="4" fill="none" /><path d="M670 600 Q760 580 840 600 T990 590" stroke="#ff5a1a" strokeWidth="3" fill="none" opacity="0.7" /></g>;
    case 'astral': return <g>{Array.from({ length: 22 }, (_, i) => <circle key={i} cx={760 + (i * 53) % 220} cy={30 + (i * 37) % 230} r={i % 4 ? 1.4 : 2.4} fill="#fff" className="twinkle" style={{ animationDelay: (i % 6) * 0.4 + 's' }} />)}</g>;
    default: return null;
  }
}

function WorldMap({ s, onPick }) {
  const cur = s.player.loc;
  const vis = Object.keys(LOCATIONS).filter((id) => G.locVisible(s, id));
  const edges = [];
  for (const a of vis) for (const b of G.LINKS[a]) if (a < b && vis.includes(b)) edges.push([a, b]);
  return (
    <svg viewBox="0 0 1000 640" className="worldmap" role="img" aria-label="World map">
      <defs>
        <radialGradient id="fog" cx="50%" cy="45%" r="65%"><stop offset="0" stopColor="#221c26" /><stop offset="1" stopColor="#0e0b10" /></radialGradient>
        <filter id="fogblur"><feGaussianBlur stdDeviation="6" /></filter>
        <radialGradient id="sea" cx="50%" cy="50%" r="70%"><stop offset="0" stopColor="#1a2030" /><stop offset="1" stopColor="#0a0c14" /></radialGradient>
      </defs>
      <rect width="1000" height="640" fill="url(#sea)" />
      {Object.keys(REGIONS).map((r) => {
        const open = G.regionUnlocked(s, r);
        return (
          <g key={r}>
            <path d={BLOBS[r]} fill={REGIONS[r].color} opacity={open ? 0.28 : 0.08} stroke={REGIONS[r].color} strokeOpacity={open ? 0.8 : 0.3} strokeWidth="2" />
            {open ? <MapDecor region={r} /> : <path d={BLOBS[r]} fill="url(#fog)" opacity="0.9" />}
            {!open && <g filter="url(#fogblur)" opacity="0.5">{[0, 1, 2].map((i) => <ellipse key={i} cx={LABEL[r][0] + (i - 1) * 70} cy={LABEL[r][1] - 90 + i * 30} rx="80" ry="26" fill="#3a3040" />)}</g>}
          </g>
        );
      })}
      {Object.keys(REGIONS).map((r) => {
        const open = G.regionUnlocked(s, r);
        return (
          <g key={'l' + r} pointerEvents="none">
            <text x={LABEL[r][0]} y={LABEL[r][1]} textAnchor="middle" className={'map-region ' + (open ? '' : 'locked')}>{REGIONS[r].name}</text>
            {!open && <text x={LABEL[r][0]} y={LABEL[r][1] + 22} textAnchor="middle" className="map-sealed">Sealed · defeat {BOSS_OF[r]}</text>}
          </g>
        );
      })}
      {edges.map(([a, b]) => <line key={a + b} x1={LOCATIONS[a].x} y1={LOCATIONS[a].y} x2={LOCATIONS[b].x} y2={LOCATIONS[b].y} stroke="#e8c88a" strokeOpacity="0.45" strokeWidth="2.5" strokeDasharray="6 7" />)}
      {vis.map((id) => {
        const L = LOCATIONS[id]; const p = s.world.progress[id] || 0; const here = id === cur;
        const deps = (s.world.deposits[id] || []).length;
        const boss = L.type === 'boss'; const beaten = boss && s.bosses[L.boss];
        return (
          <g key={id} className={'map-node ' + (here ? 'here ' : '') + L.type} onClick={() => onPick(id)} role="button" tabIndex={0} aria-label={L.name} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(id); } }}>
            <circle cx={L.x} cy={L.y} r="26" fill="transparent" />
            {here && <circle cx={L.x} cy={L.y} r="25" fill="none" stroke="#ffd27a" strokeWidth="2.5" className="pulse" />}
            <circle cx={L.x} cy={L.y} r="17" fill={boss ? (beaten ? '#4a3a2a' : '#5a1010') : '#2a2018'} stroke={boss ? '#ff6a4a' : REGIONS[L.region].color} strokeWidth="2.5" />
            {L.type !== 'boss' && L.type !== 'home' && L.type !== 'outpost' && <circle cx={L.x} cy={L.y} r="17" fill="none" stroke="#ffd27a" strokeWidth="3" strokeDasharray={`${(p / 100) * 107} 107`} transform={`rotate(-90 ${L.x} ${L.y})`} />}
            <g transform={`translate(${L.x - 10} ${L.y - 10}) scale(0.84)`}><path d={{ home: 'M3 11 L12 4 L21 11 V20 H3Z', mine: 'M3 21 L10 8 L14 14 L17 10 L21 21Z', wild: 'M12 3 L19 17 H5Z', ruin: 'M5 20 V8 M10 20 V5 M14 20 V8 M19 20 V5 M3 5 H21', boss: 'M5 10 Q12 0 19 10 Q19 17 15 18 H9 Q5 17 5 10Z', outpost: 'M3 20 L9 8 L15 20Z M13 20 L17 12 L21 20' }[L.type]} fill="none" stroke="#f3dfb5" strokeWidth="2.2" strokeLinejoin="round" /></g>
            {deps > 0 && <g><circle cx={L.x + 13} cy={L.y - 12} r="8" fill="#d8962a" /><text x={L.x + 13} y={L.y - 8.5} textAnchor="middle" className="map-badge">{deps}</text></g>}
            <text x={L.x} y={L.y + 38} textAnchor="middle" className="map-label">{L.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Shop({ s, store, onClose }) {
  const [tab, setTab] = useState('buy');
  const avail = SHOP.filter((e) => !e.region || G.regionUnlocked(s, e.region));
  const sellable = Object.keys(s.mats).filter((k) => G.matCount(s, k) > 0 && MATS[k].kind !== 'boss');
  const buy = (e, n) => store.mutate((d) => {
    const price = G.shopPrice(d, e) * n; if (d.player.gold < price) return;
    d.player.gold -= price; if (e.kind === 'item') d.consumables[e.id] = (d.consumables[e.id] || 0) + n; else G.addMat(d, e.id, n);
    sfx.coin();
  });
  const sell = (k, n) => store.mutate((d) => { const got = G.spendMat(d, k, n).reduce((a, x) => a + x[2], 0); if (got) { G.goldGain(d, Math.max(1, Math.floor(G.matValue(k) * 0.5)) * got); sfx.coin(); } });
  return (
    <Modal title="Merchant" onClose={onClose}>
      <div className="tabs small"><button type="button" className={tab === 'buy' ? 'on' : ''} onClick={() => setTab('buy')}>Buy</button><button type="button" className={tab === 'sell' ? 'on' : ''} onClick={() => setTab('sell')}>Sell materials</button></div>
      <p className="muted">You have <b className="gold-text">{G.fmt(s.player.gold)}</b> gold.</p>
      {tab === 'buy' ? (
        <div className="list">
          {avail.map((e) => {
            const price = G.shopPrice(s, e); const name = e.kind === 'item' ? CONSUMABLES[e.id].name : MATS[e.id].name;
            const owned = e.kind === 'item' ? s.consumables[e.id] || 0 : G.matCount(s, e.id);
            return (
              <div key={e.id} className="list-row">
                {e.kind === 'mat' ? <MatIcon id={e.id} size={28} /> : <Icon name="potion" size={26} stroke="#ffb3a0" />}
                <div className="grow"><b>{name}</b><div className="muted small">{e.kind === 'item' ? CONSUMABLES[e.id].desc : MATS[e.id].desc} · owned {owned}</div></div>
                <button type="button" className="btn small" disabled={s.player.gold < price} onClick={() => buy(e, 1)}>{price}g</button>
                <button type="button" className="btn small ghost" disabled={s.player.gold < price * 5} onClick={() => buy(e, 5)}>×5</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="list">
          {sellable.length === 0 && <p className="muted">Nothing to sell.</p>}
          {sellable.map((k) => { const v = Math.max(1, Math.floor(G.matValue(k) * 0.5)); const n = G.matCount(s, k); return (
            <div key={k} className="list-row"><MatIcon id={k} size={28} /><div className="grow"><b>{MATS[k].name}</b><div className="muted small">{n} owned · {v}g each</div></div>
              <button type="button" className="btn small" onClick={() => sell(k, 1)}>Sell 1</button><button type="button" className="btn small ghost" onClick={() => sell(k, n)}>All</button></div>
          ); })}
        </div>
      )}
    </Modal>
  );
}

function EventModal({ s, store, ev, locId, onClose, onMine, onForage, onBattle }) {
  const L = LOCATIONS[locId];
  const [res, setRes] = useState(null);
  if (ev.type === 'secret') return <Modal title="Discovery!" onClose={onClose}><div className="discover-burst" /><ul className="found">{ev.found.map((f) => <li key={f}>{f}</li>)}</ul><p className="muted">+{ev.gain}% explored</p><button type="button" className="btn primary" onClick={onClose}>Continue</button></Modal>;
  if (ev.type === 'deposit') { const M = MATS[ev.deposit.mat]; const can = s.tools.pick + 1 >= (M.hard || 1); return (
    <Modal title="Deposit found" onClose={onClose}>
      <div className="event-hero"><MatIcon id={ev.deposit.mat} size={64} /><div><h3>{M.name}</h3><p>{ev.deposit.layers} layers{ev.deposit.rich ? ' · Rich vein (+50% ore)' : ''}</p>{!can && <p className="bad">Needs a {PICKAXES[(M.hard || 1) - 1].name}. Upgrade your pickaxe in Upgrades → Tools.</p>}</div></div>
      <p className="muted">The deposit is marked on your map. You can mine it now or later.</p>
      <div className="row gap"><button type="button" className="btn primary" disabled={!can} onClick={() => onMine(ev.deposit)}>Mine now</button><button type="button" className="btn ghost" onClick={onClose}>Later</button></div>
    </Modal>
  ); }
  if (ev.type === 'battle') { const E = ENEMIES[ev.enemy]; return (
    <Modal title="Ambush!">
      <div className="event-hero"><EnemyArt enemy={E} size={110} /><div><h3>{E.name}</h3><p className="muted">{E.desc}</p></div></div>
      <div className="row gap"><button type="button" className="btn primary" onClick={() => onBattle(ev.enemy, ev.bonus)}>Fight</button><button type="button" className="btn ghost" onClick={onClose}>Slip away</button></div>
    </Modal>
  ); }
  if (ev.type === 'forage') return <Modal title="Foraging spot" onClose={onClose}><p>You spot a patch of useful plants and wood.</p><div className="row gap"><button type="button" className="btn primary" onClick={onForage}>Gather</button><button type="button" className="btn ghost" onClick={onClose}>Move on</button></div></Modal>;
  if (ev.type === 'treasure') return <Modal title="Treasure!" onClose={onClose}><p>You find a forgotten cache.</p><div className="chips"><span className="chip"><span className="coin" />{ev.gold} gold</span>{Object.entries(ev.mats).map(([k, n]) => <MatChip key={k} id={k} n={n} />)}</div><button type="button" className="btn primary" onClick={onClose}>Take it</button></Modal>;
  const E = EVENTS.find((x) => x.id === ev.event);
  const choose = (i) => {
    const r = store.mutate((d, st) => G.resolveChoice(d, locId, E.id, i, st));
    if (r.blocked) { setRes({ ...r, retry: true }); return; }
    setRes(r);
  };
  const P = G.playerStats(s);
  return (
    <Modal title={E.title} onClose={res && !res.followup ? onClose : undefined}>
      <Scene region={L.region} type={L.type} height={110} />
      <p className="event-text">{E.text}</p>
      {!res || res.retry ? (
        <>
          {res && res.retry && <p className="bad">{res.text}</p>}
          <div className="choices">
            {E.choices.map((c, i) => {
              let lock = '';
              if (c.req && c.req.stat) { const have = c.req.stat === 'power' ? P.attack : P[c.req.stat]; if (have < c.req.min) lock = `Needs ${c.req.stat === 'power' ? 'attack' : c.req.stat} ${c.req.min} (you have ${have})`; }
              if (c.req && c.req.smith && s.smith.level < c.req.smith) lock = `Needs Blacksmith mastery ${c.req.smith}`;
              return <button type="button" key={i} className="btn choice" disabled={!!lock} onClick={() => choose(i)}>{c.label}{lock && <span className="muted small"> · {lock}</span>}{c.out.chance != null && !lock && <span className="muted small"> · risky</span>}</button>;
            })}
          </div>
        </>
      ) : (
        <>
          <p className="event-result">{res.text}</p>
          {Object.keys(res.got || {}).length > 0 && <div className="chips">{Object.entries(res.got).map(([k, n]) => <MatChip key={k} id={k} n={n} />)}</div>}
          {res.followup ? (
            <button type="button" className="btn primary" onClick={() => {
              const f = res.followup;
              if (f.type === 'battle') onBattle(f.enemy, f.bonus);
              else if (f.type === 'mine') onMine(f.deposit, f.loc, true);
              else if (f.type === 'forage') onForage();
            }}>{res.followup.type === 'battle' ? 'Fight' : res.followup.type === 'mine' ? 'Start mining' : 'Start gathering'}</button>
          ) : <button type="button" className="btn primary" onClick={onClose}>Continue</button>}
        </>
      )}
    </Modal>
  );
}

export default function WorldScreen() {
  const [s, store] = useGame();
  const nav = useNav();
  const [ev, setEv] = useState(null);
  const [mine, setMine] = useState(null); // {deposit, loc, temp}
  const [mineRes, setMineRes] = useState(null);
  const [forage, setForage] = useState(null);
  const [forageRes, setForageRes] = useState(null);
  const [shop, setShop] = useState(false);
  const loc = s.player.loc; const L = LOCATIONS[loc]; const R = REGIONS[L.region];
  const P = G.playerStats(s);
  const prog = s.world.progress[loc] || 0;
  const deps = s.world.deposits[loc] || [];
  const travel = (id) => { if (id === loc) return; store.mutate((d) => { d.player.loc = id; if (!d.codex.locs[id]) d.codex.locs[id] = 1; }); setEv(null); };
  const doExplore = () => { const r = store.mutate((d, st) => G.explore(d, loc, st)); sfx.pick(); setEv(r); };
  const fight = (enemy, bonus) => { setEv(null); const cb = store.get().battle; if (cb && !cb.over) { nav.go('battle'); return; } store.mutate((d) => startBattle(d, enemy, { loc, bonus })); nav.go('battle'); };
  const startMine = (deposit, mloc, temp) => {
    setEv(null);
    if (s.tools.pick + 1 < (MATS[deposit.mat].hard || 1)) {
      store.mutate((d) => { if (temp) d.world.deposits[mloc] = [...(d.world.deposits[mloc] || []), deposit].slice(-4); });
      store.toast(`You need a ${PICKAXES[(MATS[deposit.mat].hard || 1) - 1].name} for ${MATS[deposit.mat].name}. The deposit is marked on your map.`, 'info');
      return;
    }
    setMine({ deposit, loc: mloc || loc, temp });
  };
  const finishMine = (res) => {
    const m = mine; setMine(null);
    const out = store.mutate((d, st) => {
      if (m.temp) { d.world.deposits[m.loc] = [...(d.world.deposits[m.loc] || []), m.deposit]; }
      return G.finishMining(d, m.loc, m.deposit, res, st);
    });
    setMineRes(out);
  };
  const finishForage = (picks) => { const got = store.mutate((d, st) => G.finishForage(d, loc, picks, st)); setForage(null); setForageRes(got); };
  const bossE = L.boss ? ENEMIES[L.boss] : null;
  const eliteE = L.elite ? ENEMIES[L.elite] : null;
  const pickTier = s.tools.pick + 1;
  return (
    <div className="screen world">
      <div className="world-grid">
        <div className="panel map-panel">
          <WorldMap s={s} onPick={travel} />
          <p className="muted small map-help">Tap a location to travel there. Gold rings show exploration progress; badges count known deposits.</p>
        </div>
        <div className="panel loc-panel">
          <Scene region={L.region} type={L.type} height={140} />
          <div className="loc-head">
            <div><div className="eyebrow" style={{ color: R.color }}>{R.name}</div><h2>{L.name}</h2></div>
            <div className="hp-mini"><Bar v={s.player.hp} max={P.maxHp} color="var(--hp)" label="HP" small /></div>
          </div>
          <p className="loc-desc">{L.desc}</p>
          {L.type !== 'home' && L.type !== 'boss' && <div className="prog-row"><span>Explored</span><Bar v={prog} max={100} color="var(--gold)" small>{prog}%</Bar></div>}
          <div className="loc-actions">
            {L.type !== 'home' && L.type !== 'boss' && <button type="button" className="btn primary" onClick={doExplore}><Icon name="map" size={18} /> Explore</button>}
            {L.forage && <button type="button" className="btn" onClick={() => setForage(true)}><Icon name="leaf" size={18} /> Forage</button>}
            {L.enemies && <button type="button" className="btn" onClick={() => fight(G.pick(L.enemies))}><Icon name="battle" size={18} /> Hunt</button>}
            {eliteE && prog >= 40 && <button type="button" className="btn danger" onClick={() => fight(L.elite)}><Icon name="trophy" size={18} /> Challenge {eliteE.name.split(' ').slice(-1)[0]}</button>}
            {eliteE && prog < 40 && <span className="muted small">A powerful foe lurks here. Explore 40% to find it.</span>}
            {bossE && <button type="button" className="btn danger big" onClick={() => fight(L.boss)}><Icon name="battle" size={18} /> {s.bosses[L.boss] ? 'Rematch' : 'Challenge'} {bossE.name.split(',')[0]}</button>}
            {G.canRestAt(loc) && <button type="button" className="btn" disabled={s.player.hp >= P.maxHp} onClick={() => store.mutate((d) => { G.rest(d); store.toast('You rest and recover fully.', 'info'); })}><Icon name="rest" size={18} /> Rest</button>}
            {G.canRestAt(loc) && <button type="button" className="btn" onClick={() => setShop(true)}><Icon name="shop" size={18} /> Merchant</button>}
            {L.type === 'home' && <button type="button" className="btn" onClick={() => nav.go('forge')}><Icon name="forge" size={18} /> Go to the forge</button>}
          </div>
          {bossE && <div className="boss-brief"><EnemyArt enemy={bossE} size={96} /><div><b>{bossE.name}</b><p className="muted small">{bossE.desc}</p>{bossE.reward && <p className="small gold-text">{bossE.reward}</p>}</div></div>}
          {L.deposits && (
            <Section title="Deposits" right={<span className="muted small">Pickaxe tier {pickTier}</span>}>
              {deps.length === 0 ? <p className="muted small">No known deposits. Explore to find veins of {[...new Set(L.deposits.map((d) => MATS[d[0]].name))].join(', ')}.</p> : (
                <div className="list">
                  {deps.map((d) => { const M = MATS[d.mat]; const ok = pickTier >= (M.hard || 1); return (
                    <div key={d.id} className="list-row"><MatIcon id={d.mat} size={30} /><div className="grow"><b>{M.name}</b>{d.rich && <span className="tag gold">Rich</span>}<div className="muted small">{d.layers} layers{!ok ? ` · needs ${PICKAXES[(M.hard || 1) - 1].name}` : ''}{s.tools.lens ? ` · ${Math.round(d.pocket * 100)}% pocket chance` : ''}</div></div>
                      <button type="button" className="btn small primary" disabled={!ok} onClick={() => startMine(d)}><Icon name="pick" size={16} /> Mine</button></div>
                  ); })}
                </div>
              )}
            </Section>
          )}
          {L.enemies && <Section title="Creatures"><div className="enemy-strip">{L.enemies.map((e) => <div key={e} className="enemy-mini" title={ENEMIES[e].desc}><EnemyArt enemy={ENEMIES[e]} size={54} /><span>{s.codex.enemies[e] ? ENEMIES[e].name : '???'}</span></div>)}</div></Section>}
        </div>
      </div>
      {ev && <EventModal s={s} store={store} ev={ev} locId={loc} onClose={() => setEv(null)} onMine={startMine} onForage={() => { setEv(null); setForage(true); }} onBattle={fight} />}
      {mine && <Modal title="Mining"><MiningGame deposit={mine.deposit} pickTier={s.tools.pick} geologist={G.tal(s, 'geologist')} onFinish={finishMine} onCancel={() => { const m = mine; setMine(null); if (m.temp) store.mutate((d) => { d.world.deposits[m.loc] = [...(d.world.deposits[m.loc] || []), m.deposit].slice(-4); }); }} /></Modal>}
      {mineRes && <Modal title="Ore collected" onClose={() => setMineRes(null)}><div className="chips">{mineRes.got.map(([k, n, q]) => <MatChip key={k + q} id={k} n={n} q={q} />)}</div><p className="muted">{mineRes.got.length ? `Quality: ${G.QUALITY[mineRes.q]} (precision ${Math.round(mineRes.precision * 100)}%)` : 'You did not break any layer.'}</p><button type="button" className="btn primary" onClick={() => setMineRes(null)}>Continue</button></Modal>}
      {forage && <Modal title="Foraging"><ForageGame table={G.forageTable(s, loc)} herbalist={G.tal(s, 'herbalist')} sickle={s.tools.sickle} onFinish={finishForage} /></Modal>}
      {forageRes && <Modal title="Gathered" onClose={() => setForageRes(null)}><div className="chips">{Object.entries(forageRes).map(([k, n]) => <MatChip key={k} id={k} n={n} />)}</div>{!Object.keys(forageRes).length && <p className="muted">Nothing this time.</p>}<button type="button" className="btn primary" onClick={() => setForageRes(null)}>Continue</button></Modal>}
      {shop && <Shop s={s} store={store} onClose={() => setShop(false)} />}
    </div>
  );
}
