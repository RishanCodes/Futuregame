// FORGEBORN — turn-based battle screen with timing interactions.
import React, { useEffect, useRef, useState } from 'react';
import { ENEMIES, MOVES, CONSUMABLES, SKILLS, ELEMENTS, LOCATIONS, MATS, REGIONS, CATEGORIES } from '../data.js';
import * as G from '../engine.js';
import * as C from '../combat.js';
import { useGame, useNav, Bar, Modal, MatChip, Section, Empty } from '../ui.jsx';
import { EnemyArt, Icon, WeaponArt, Scene } from '../art.jsx';
import { AttackTiming, DefenseTiming } from '../qte.jsx';
import { sfx } from '../sfx.js';

function StatusRow({ st }) {
  const keys = Object.keys(st || {}).filter((k) => C.STATUS_INFO[k]);
  if (!keys.length) return <div className="status-row" />;
  return <div className="status-row">{keys.map((k) => <span key={k} className="status" style={{ '--sc': C.STATUS_INFO[k].color }} title={C.STATUS_INFO[k].desc}>{C.STATUS_INFO[k].name}{st[k].n > 1 ? ` ×${st[k].n}` : ''}<em>{st[k].t}</em></span>)}</div>;
}
function Floats({ list, who }) {
  return <div className="floats">{list.filter((f) => f.who === who).slice(-4).map((f) => <span key={f.id} className={'float ' + f.kind}>{f.text}</span>)}</div>;
}

function Arena() {
  const [s, store] = useGame();
  const nav = useNav();
  const fights = [];
  for (const id in LOCATIONS) { const L = LOCATIONS[id]; if (!G.locVisible(s, id)) continue; if (L.boss && s.bosses[L.boss]) fights.push({ e: L.boss, loc: id, kind: 'Boss rematch' }); if (L.elite && s.bosses[L.elite]) fights.push({ e: L.elite, loc: id, kind: 'Elite rematch' }); }
  const go = (e, loc) => { store.mutate((d) => C.startBattle(d, e, { loc })); };
  const P = G.playerStats(s);
  return (
    <div className="screen battle-idle">
      <div className="panel pad">
        <h2>No battle in progress</h2>
        <p className="muted">Battles begin when you explore, hunt creatures or challenge a boss on the World map. Your HP carries between fights: rest at Hearthstone Forge or Cinderfall Outpost.</p>
        <Bar v={s.player.hp} max={P.maxHp} color="var(--hp)" label="HP" />
        <div className="row gap wrap" style={{ marginTop: 12 }}><button type="button" className="btn primary" onClick={() => nav.go('world')}><Icon name="world" size={18} /> Open the World map</button></div>
      </div>
      <Section title="Rematches">
        {fights.length === 0 ? <Empty>Defeat bosses and elite champions to fight them again here for their materials.</Empty> : (
          <div className="list">{fights.map((f) => <div key={f.e} className="list-row"><EnemyArt enemy={ENEMIES[f.e]} size={54} /><div className="grow"><b>{ENEMIES[f.e].name}</b><div className="muted small">{f.kind} · {LOCATIONS[f.loc].name} · defeated {s.bosses[f.e]}×</div></div><button type="button" className="btn small danger" onClick={() => go(f.e, f.loc)}>Fight</button></div>)}</div>
        )}
      </Section>
    </div>
  );
}

export default function BattleScreen() {
  const [s, store] = useGame();
  const nav = useNav();
  const b = s.battle;
  const [menu, setMenu] = useState(null); // 'skills' | 'items' | 'inspect'
  const [timing, setTiming] = useState(null); // {act}
  const [defense, setDefense] = useState(null);
  const [hitFx, setHitFx] = useState(0);
  const logRef = useRef(null);
  const busy = useRef(false);
  // Sound follows the combat events the engine records.
  const lastFloat = useRef(b && b.floats.length ? b.floats[b.floats.length - 1].id : 0);
  useEffect(() => {
    if (!b) { lastFloat.current = 0; return; }
    const fresh = b.floats.filter((f) => f.id > lastFloat.current);
    if (b.floats.length) lastFloat.current = b.floats[b.floats.length - 1].id;
    fresh.slice(0, 4).forEach((f, i) => setTimeout(() => {
      const txt = String(f.text);
      if (f.kind === 'perfect') { if (/BLOCK|DEFLECT/.test(txt)) sfx.block(true); else if (/REBIRTH|UNBROKEN/.test(txt)) sfx.heal(); }
      else if (f.kind === 'heal') sfx.heal();
      else if (f.kind === 'miss') { if (/Barrier/.test(txt)) sfx.block(false); else sfx.swing(); }
      else if (f.who === 'e' && (f.kind === 'dmg' || f.kind === 'crit')) sfx.hit(f.kind === 'crit');
      else if (f.who === 'p' && (f.kind === 'dmg' || f.kind === 'crit')) { if (b.p.defending) sfx.block(false); sfx.hurt(f.kind === 'crit'); }
      else if (f.kind === 'status') sfx.discover();
    }, i * 90));
  }, [b && b.floats.length && b.floats[b.floats.length - 1].id]);
  const overRef = useRef(null);
  useEffect(() => { const o = b && b.over; if (o && o !== overRef.current) { if (o === 'win') sfx.victory(ENEMIES[b.enemyId].boss); else if (o === 'lose') sfx.defeat(); } overRef.current = o || null; }, [b && b.over]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [b && b.log.length]);
  // Drive the enemy phase.
  useEffect(() => {
    if (!b || b.stage !== 'enemy' || defense || busy.current) return undefined;
    busy.current = true;
    const t = setTimeout(() => {
      busy.current = false;
      const cur = store.get().battle; if (!cur || cur.stage !== 'enemy') return;
      const need = C.needsDefense(store.get());
      if (need && store.get().settings.combatTiming) setDefense(need);
      else { store.mutate((d, st) => C.enemyAction(d, need && !d.settings.combatTiming ? { grade: 'good' } : null, st)); }
    }, s.settings.reducedMotion ? 250 : 650);
    return () => { clearTimeout(t); busy.current = false; };
  }, [b && b.stage, b && b.turn, defense]);
  if (!b) return <Arena />;
  const E = ENEMIES[b.enemyId]; const P = G.playerStats(s); const e = b.e;
  const intent = C.intentInfo(b);
  const skills = C.availableSkills(s);
  const allSkills = P.cat ? SKILLS[P.cat] : [];
  const canAct = b.stage === 'player' && !b.over && !timing && !defense;
  const doAct = (act, timed) => {
    setMenu(null);
    if (timed && s.settings.combatTiming) { setTiming({ act }); return; }
    store.mutate((d, st) => C.playerAction(d, act, timed ? 1 : null, st));
    if (act.type === 'special') sfx.special(); else if (act.type === 'skill' && P.cat === 'staff') sfx.spell(); else if (act.type !== 'defend' && act.type !== 'item' && act.type !== 'swap' && act.type !== 'flee') sfx.swing();
    if (act.type !== 'defend' && act.type !== 'item') setHitFx((n) => n + 1);
  };
  const onTiming = (mult) => { const act = timing.act; setTiming(null); if (act.type === 'special') sfx.special(); else if (act.type === 'skill' && P.cat === 'staff') sfx.spell(); store.mutate((d, st) => C.playerAction(d, act, mult, st)); setHitFx((n) => n + 1); };
  const onDefense = (res) => { setDefense(null); store.mutate((d, st) => C.enemyAction(d, res, st)); };
  const close = () => { const res = b.over; store.mutate((d) => C.closeBattle(d)); nav.go(res === 'lose' ? 'world' : 'world'); };
  const L = LOCATIONS[b.ctx.loc] || LOCATIONS.hearth;
  const weapons = s.items.filter((i) => i.uid !== s.equipped).sort((a, c) => c.stats.attack - a.stats.attack).slice(0, 8);
  const speedF = 1 + (P.speed - 10) * 0.015;
  return (
    <div className={'screen battle ' + (E.boss ? 'boss' : '')}>
      <div className="battlefield panel">
        <div className="bf-scene"><Scene region={E.region} type={E.boss ? 'boss' : L.type} height={260} /></div>
        <div className="bf-enemy">
          <div className="combatant-head">
            <div><div className="eyebrow">{E.boss ? 'Boss' : E.elite ? 'Elite' : REGIONS[E.region].name}</div><h2>{E.name}</h2></div>
            <button type="button" className="btn small ghost" onClick={() => setMenu(menu === 'inspect' ? null : 'inspect')}><Icon name="eye" size={16} /> Inspect</button>
          </div>
          <Bar v={e.hp} max={e.maxHp} color="var(--enemy)" label="HP" />
          <div className="mini-bars">
            <Bar v={e.stagger} max={e.staggerMax} color="var(--stagger)" small>{e.staggerImm > 0 ? 'Stagger immune' : 'Stagger'}</Bar>
            {e.plates > 0 && <span className="tag">Granite plates ×{e.plates} (−{e.plates * 20}% damage taken)</span>}
            {e.phase && <span className="tag" style={{ color: e.phase === 'astral' ? '#9ff0ff' : '#b48aff' }}>{e.phase === 'astral' ? 'Astral phase · weak to Void' : 'Void phase · weak to Radiance/Astral'}</span>}
            {e.heat > 0 && <span className="tag bad">Heat {e.heat}</span>}
            {e.mirror && e.mirror !== 'none' && <span className="tag">Resists {ELEMENTS[e.mirror].name}</span>}
          </div>
          <StatusRow st={e.st} />
          <div className="enemy-stage"><EnemyArt key={hitFx} enemy={E} size={200} hit={hitFx > 0} /><Floats list={b.floats} who="e" /></div>
          {intent && !b.over && (
            <div className={'intent ' + (intent.heavy ? 'heavy' : '')}>
              <Icon name={intent.icon} size={20} />
              <div><b>{e.skip ? (e.skip === 'frozen' ? 'Frozen' : 'Staggered') : 'Next: ' + intent.name}</b>{!e.skip && intent.dmg > 0 && <span className="muted"> · about {Math.round(intent.dmg * 30 / (30 + P.guard))} damage</span>}{!e.skip && intent.text && <div className="small">{intent.text}</div>}{e.skip && <div className="small">It will lose its next action.</div>}</div>
            </div>
          )}
        </div>
        <div className="bf-player">
          <div className="combatant-head">
            <div className="row gap"><WeaponArt item={P.weapon || { bp: 'arming', mat: 'iron', comps: [] }} size={44} /><div><div className="eyebrow">{P.weapon ? CATEGORIES[P.cat].name : 'Unarmed'}</div><b>{P.weapon ? P.weapon.name : 'Bare fists'}</b></div></div>
            <Floats list={b.floats} who="p" />
          </div>
          <Bar v={b.p.hp} max={P.maxHp} color="var(--hp)" label="HP" />
          <div className="two-bars"><Bar v={b.p.sta} max={100} color="var(--sta)" small label="Stamina" /><Bar v={b.p.mana} max={P.maxMana} color="var(--mana)" small label="Mana" /></div>
          <Bar v={b.p.fury} max={100} color="var(--fury)" small>{b.p.fury >= 100 ? 'Forge Fury ready!' : `Forge Fury ${Math.round(b.p.fury)}%`}</Bar>
          {b.p.barrier > 0 && <span className="tag">Barrier {b.p.barrier}</span>}
          <StatusRow st={b.p.st} />
        </div>
      </div>
      <div className="battle-side">
        {timing && <div className="timing-wrap panel"><AttackTiming assist={P.timingAssist} speed={speedF} onDone={onTiming} /></div>}
        {defense && <div className="timing-wrap panel"><DefenseTiming assist={P.timingAssist} heavy={defense.heavy} mode={defense.mode} onDone={onDefense} /></div>}
        {!b.over && !timing && !defense && (
          <div className="actions panel">
            <div className="act-grid">
              <button type="button" className="act" disabled={!canAct} onClick={() => doAct({ type: 'attack' }, true)}><Icon name="sword" /><span>Attack</span><em>+8 stamina</em></button>
              <button type="button" className="act" disabled={!canAct || !P.weapon} onClick={() => setMenu(menu === 'skills' ? null : 'skills')}><Icon name="charge" /><span>Skills</span><em>{skills.length} known</em></button>
              <button type="button" className="act" disabled={!canAct} onClick={() => doAct({ type: 'defend' })}><Icon name="shield" /><span>Defend</span><em>−{Math.round(P.defendCut * 100)}% dmg, +15 sta</em></button>
              <button type="button" className={'act special ' + (b.p.fury >= 100 ? 'ready' : '')} disabled={!canAct || b.p.fury < 100} onClick={() => doAct({ type: 'special' }, true)}><Icon name="fire" /><span>Special</span><em>Forge Fury</em></button>
              <button type="button" className="act" disabled={!canAct} onClick={() => setMenu(menu === 'items' ? null : 'items')}><Icon name="potion" /><span>Items</span><em>Potions, swap</em></button>
              <button type="button" className="act" disabled={!canAct || E.boss || E.elite} onClick={() => doAct({ type: 'flee' })}><Icon name="flee" /><span>Retreat</span><em>{E.boss || E.elite ? 'Not possible' : 'Chance'}</em></button>
            </div>
            {b.stage === 'enemy' && <p className="muted small center">{E.name} is acting…</p>}
            {menu === 'skills' && (
              <div className="submenu">
                {allSkills.map((k) => {
                  const known = skills.includes(k); const ok = known && C.skillUsable(s, k);
                  return <button type="button" key={k.id} className="sub-btn" disabled={!canAct || !ok} onClick={() => doAct({ type: 'skill', id: k.id }, k.timed)}><b>{k.name}</b><span className="muted small">{known ? k.desc : `Unlocks at ${CATEGORIES[P.cat].name} mastery ${k.lvl}`}</span><em>{k.cost.sta ? `${k.cost.sta} sta` : `${k.cost.mana} mana`}</em></button>;
                })}
              </div>
            )}
            {menu === 'items' && (
              <div className="submenu">
                {Object.keys(CONSUMABLES).filter((k) => s.consumables[k] > 0).map((k) => <button type="button" key={k} className="sub-btn" disabled={!canAct} onClick={() => doAct({ type: 'item', id: k })}><b>{CONSUMABLES[k].name} ×{s.consumables[k]}</b><span className="muted small">{CONSUMABLES[k].desc}</span></button>)}
                {Object.keys(CONSUMABLES).every((k) => !(s.consumables[k] > 0)) && <p className="muted small">No consumables. Buy them from a merchant.</p>}
                {weapons.length > 0 && <div className="sub-label">Swap weapon (uses your turn)</div>}
                {weapons.map((w) => <button type="button" key={w.uid} className="sub-btn" disabled={!canAct} onClick={() => doAct({ type: 'swap', id: w.uid })}><b>{w.name}</b><span className="muted small">{CATEGORIES[w.cat].name} · ATK {w.stats.attack}{w.stats.elem !== 'none' ? ' · ' + ELEMENTS[w.stats.elem].name : ''}</span></button>)}
              </div>
            )}
            {menu === 'inspect' && (
              <div className="submenu inspect">
                <p>{E.desc}</p>
                <dl className="stat-table">
                  <dt>Attack</dt><dd>{Math.round(e.atk)}</dd><dt>Defense</dt><dd>{Math.round(e.def)}{e.st.armorbreak ? ' (broken)' : ''}</dd>
                  <dt>Weak to</dt><dd>{(E.weak || []).map((w) => ELEMENTS[w].name).join(', ') || '—'}</dd>
                  <dt>Resists</dt><dd>{(E.resist || []).map((w) => ELEMENTS[w].name).join(', ') || '—'}</dd>
                  <dt>Behavior</dt><dd>{{ aggressive: 'Aggressive', defensive: 'Defensive: guards and counters', magical: 'Caster: inflicts statuses', heavy: 'Heavy: telegraphed slams', tactical: 'Tactical: reacts to your habits', swift: 'Swift: multi-hits, evasive' }[E.ai] || 'Unique'}</dd>
                  <dt>Moves</dt><dd>{E.moves.map((m) => MOVES[m].name).join(', ')}</dd>
                  {E.dodge ? <><dt>Evasion</dt><dd>{Math.round(E.dodge * 100)}%</dd></> : null}
                </dl>
                <p className="muted small">Your weapon element: {ELEMENTS[P.elem].name}{P.elem !== 'none' && (E.weak || []).includes(P.elem) ? ' (super effective)' : P.elem !== 'none' && (E.resist || []).includes(P.elem) ? ' (resisted)' : ''}</p>
              </div>
            )}
          </div>
        )}
        {b.over && (
          <div className={'battle-end panel ' + b.over}>
            <h2>{b.over === 'win' ? (E.boss ? 'Boss defeated!' : 'Victory') : b.over === 'lose' ? 'Defeated' : 'Escaped'}</h2>
            {b.over === 'win' && b.rewards && (
              <>
                <div className="chips"><span className="chip">+{b.rewards.xp} XP</span><span className="chip"><span className="coin" />+{b.rewards.gold}</span>{b.rewards.mats.map(([k, n]) => <MatChip key={k} id={k} n={n} />)}</div>
                {b.rewards.unlocks.map((u) => <p key={u} className="gold-text">Unlocked: {u}</p>)}
                <p className="muted small">You catch your breath and recover 15% HP.</p>
              </>
            )}
            {b.over === 'lose' && <p>You wake at Hearthstone Forge, bandaged and sore. You lost {b.rewards.lost} gold. Your materials are safe.</p>}
            <button type="button" className="btn primary big" onClick={close}>Continue</button>
          </div>
        )}
        <div className="battle-log panel" ref={logRef} aria-live="polite">
          {b.log.slice(-18).map((l) => <p key={l.id} className={'log ' + l.kind}>{l.text}</p>)}
        </div>
      </div>
    </div>
  );
}
