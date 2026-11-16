// FORGEBORN — the Forge: weapon design, the multi-stage forging session and the reveal.
import React, { useEffect, useMemo, useState } from 'react';
import { BLUEPRINTS, MATS, COMPONENTS, ENCHANTS, SLOT_NAMES, CATEGORIES, LOCATIONS, RARITIES, GRADES, QUALITY, SMELT, ELEMENTS, REGIONS } from '../data.js';
import * as G from '../engine.js';
import { useGame, Modal, CostList, MatChip, RarityName, GradeName, StatTable, TraitList, weaponBreakdown, Section, Empty } from '../ui.jsx';
import { WeaponArt, MatIcon, Icon } from '../art.jsx';
import { QTE_COMPONENTS, STAGE_INFO } from '../qte.jsx';
import { sfx } from '../sfx.js';

const SECRET_WHERE = (() => {
  const m = {};
  for (const id in LOCATIONS) for (const [t, key] of LOCATIONS[id].secrets || []) m[key] = { loc: id, t };
  return m;
})();
function whereHint(key) { const w = SECRET_WHERE[key]; return w ? `Discovered by exploring ${LOCATIONS[w.loc].name} (${w.t}%).` : key === 'bp:phoenix' ? 'A Legacy perk.' : 'Unknown.'; }

function Smelter({ s, store }) {
  const [q, setQ] = useState(0);
  const lvl = G.upg(s, 'refinery');
  if (!lvl) return <Empty>Build the Material Refinery in Upgrades to smelt steel ingots{ s.smith.level < 2 ? ' (requires Blacksmith mastery 2)' : ''}.</Empty>;
  return (
    <div className="list">
      <div className="tabs small">{QUALITY.map((n, i) => <button type="button" key={n} className={q === i ? 'on' : ''} onClick={() => setQ(i)}>{n} input</button>)}</div>
      {SMELT.map((r) => {
        const locked = lvl < r.lvl || (r.crucible && !G.upg(s, 'crucible'));
        const main = (s.mats[r.main] || [0, 0, 0])[q];
        const others = { ...r.inputs }; delete others[r.main];
        const maxN = locked ? 0 : Math.min(Math.floor(main / r.inputs[r.main]), ...Object.entries(others).map(([k, n]) => Math.floor(G.matCount(s, k) / n)), r.gold ? Math.floor(s.player.gold / r.gold) : 99);
        const go = (n) => store.mutate((d, st) => { const made = G.smelt(d, r.id, q, n, st); if (made) { st.toast(`Smelted ${made} ${QUALITY[q]} ${MATS[r.out].name}.`, 'upgrade'); sfx.smelt(); } });
        return (
          <div key={r.id} className={'list-row ' + (locked ? 'locked' : '')}>
            <MatIcon id={r.out} size={34} q={q} />
            <div className="grow">
              <b>{MATS[r.out].name}</b>{locked && <span className="tag">Refinery {r.lvl}{r.crucible ? ' + Crucible' : ''}</span>}
              <div className="chips tight">{Object.entries(r.inputs).map(([k, n]) => <MatChip key={k} id={k} n={n} have={k === r.main ? main : G.matCount(s, k)} q={k === r.main ? q : 0} />)}<span className="chip"><span className="coin" />{r.gold}</span></div>
            </div>
            <div className="col-btns">
              <button type="button" className="btn small" disabled={maxN < 1} onClick={() => go(1)}>Smelt</button>
              <button type="button" className="btn small ghost" disabled={maxN < 2} onClick={() => go(maxN)}>All ({Math.max(0, maxN)})</button>
            </div>
          </div>
        );
      })}
      <p className="muted small">The output keeps the quality of the main ingredient you choose.</p>
    </div>
  );
}

function Design({ s, store, spec, setSpec, onBegin }) {
  const [tab, setTab] = useState('forge');
  const bp = BLUEPRINTS[spec.bp];
  const slotsN = G.smithSlots(s);
  const metals = Object.keys(MATS).filter((k) => MATS[k].kind === 'metal');
  const problems = G.forgeProblems(s, spec);
  const cost = G.forgeCost(s, spec);
  const stages = G.forgeStages(s, spec);
  const pv = G.previewWeapon(s, spec);
  const allBps = Object.keys(BLUEPRINTS).filter((b) => !BLUEPRINTS[b].legacy || s.blueprints.includes(b));
  const setBp = (b) => { const nb = BLUEPRINTS[b]; setSpec({ ...spec, bp: b, comps: (spec.comps || []).filter((c) => nb.slots.includes(COMPONENTS[c].slot)).slice(0, slotsN) }); };
  const usedSlots = bp.slots.slice(0, slotsN);
  const compFor = (slot) => (spec.comps || []).find((c) => COMPONENTS[c].slot === slot) || '';
  const setComp = (slot, id) => { const rest = (spec.comps || []).filter((c) => COMPONENTS[c].slot !== slot); setSpec({ ...spec, comps: id ? [...rest, id] : rest }); };
  const tablets = G.matCount(s, 'runetablet');
  const studyable = Object.keys(ENCHANTS).filter((e) => !s.enchants.includes(e) && SECRET_WHERE['ench:' + e] && G.regionUnlocked(s, LOCATIONS[SECRET_WHERE['ench:' + e].loc].region));
  const study = () => store.mutate((d, st) => { if (G.matCount(d, 'runetablet') < 1 || !studyable.length) return; G.spendMat(d, 'runetablet', 1); const e = studyable.sort((a, b) => ENCHANTS[a].tier - ENCHANTS[b].tier)[0]; G.applySecret(d, 'ench:' + e, st); });
  const range = (k, fmt = (v) => v) => { const a = pv.lo[k]; const b = pv.hi[k]; return a === b ? fmt(a) : `${fmt(a)}–${fmt(b)}`; };
  const exact = s.smith.level >= 4;
  const avg = s.records.history.length ? Math.round(s.records.history.slice(0, 8).reduce((a, h) => a + h.score, 0) / Math.min(8, s.records.history.length)) : 50;
  const atAvg = exact ? G.weaponStats(spec, avg, { temper: G.tal(s, 'temper'), runescholar: G.tal(s, 'runescholar'), rarity: G.rarityFor(spec, avg, 0.5) }) : null;
  const previewItem = { ...spec, rarity: pv.rhi, stats: pv.hi, seed: 12345 };
  return (
    <div className="forge-design">
      <div className="tabs">
        <button type="button" className={tab === 'forge' ? 'on' : ''} onClick={() => setTab('forge')}>Design a weapon</button>
        <button type="button" className={tab === 'smelt' ? 'on' : ''} onClick={() => setTab('smelt')}>Smelter</button>
      </div>
      {tab === 'smelt' ? <div className="panel pad"><Smelter s={s} store={store} /></div> : (
        <div className="forge-grid">
          <div className="forge-col">
            <Section title="1 · Blueprint">
              <div className="bp-grid">
                {allBps.map((b) => {
                  const B = BLUEPRINTS[b]; const known = s.blueprints.includes(b);
                  return (
                    <button type="button" key={b} disabled={!known} className={'bp-card ' + (spec.bp === b ? 'on' : '')} onClick={() => setBp(b)} title={known ? B.desc : whereHint('bp:' + b)}>
                      <WeaponArt spec={{ bp: b, mat: known ? 'steel' : 'iron', comps: [] }} size={44} glow={false} className={known ? '' : 'unknown'} />
                      <span className="bp-name">{known ? B.name : 'Undiscovered'}</span>
                      <span className="bp-sub">{known ? `${CATEGORIES[B.cat].name} · T${B.tier}` : `T${B.tier} ${CATEGORIES[B.cat].name}`}</span>
                    </button>
                  );
                })}
              </div>
              <p className="muted small">{bp.desc}</p>
            </Section>
            <Section title="2 · Primary material" right={<span className="muted small">Uses {cost.primary}</span>}>
              <div className="mat-grid">
                {metals.filter((k) => G.matCount(s, k) > 0 || s.codex.mats[k]).map((k) => {
                  const M = MATS[k]; const a = s.mats[k] || [0, 0, 0];
                  return (
                    <div key={k} className={'mat-pick ' + (spec.mat === k ? 'on' : '')}>
                      <div className="mat-pick-head"><MatIcon id={k} size={28} /><div><b>{M.name}</b><div className="muted small">Strength {M.power} · T{M.tier}{M.elem ? ' · ' + ELEMENTS[M.elem].name : ''}</div></div></div>
                      <div className="q-row">{[0, 1, 2].map((q) => <button type="button" key={q} className={'q-btn q' + q + (spec.mat === k && (spec.q || 0) === q ? ' on' : '')} disabled={a[q] < 1} onClick={() => setSpec({ ...spec, mat: k, q })}>{QUALITY[q][0]} {a[q]}</button>)}</div>
                    </div>
                  );
                })}
                {metals.every((k) => !G.matCount(s, k)) && <Empty>No metals. Mine ore from deposits on the World map.</Empty>}
              </div>
            </Section>
            <Section title="3 · Components" right={<span className="muted small">{slotsN} slot{slotsN > 1 ? 's' : ''} (Blacksmith mastery)</span>}>
              {usedSlots.map((slot) => {
                const opts = Object.keys(COMPONENTS).filter((c) => COMPONENTS[c].slot === slot);
                return (
                  <div key={slot} className="comp-slot">
                    <div className="comp-slot-name">{SLOT_NAMES[slot]}</div>
                    <div className="comp-opts">
                      <button type="button" className={'comp ' + (!compFor(slot) ? 'on' : '')} onClick={() => setComp(slot, '')}>None</button>
                      {opts.filter((c) => Object.keys(COMPONENTS[c].cost).every((k) => s.codex.mats[k])).map((c) => {
                        const C = COMPONENTS[c]; const ok = G.hasMats(s, C.cost);
                        return <button type="button" key={c} className={'comp ' + (compFor(slot) === c ? 'on ' : '') + (ok ? '' : 'short')} onClick={() => setComp(slot, c)} title={Object.entries(C.cost).map(([k, n]) => `${n} ${MATS[k].name}`).join(', ')}><b>{C.name}</b><span>{C.desc}</span></button>;
                      })}
                    </div>
                  </div>
                );
              })}
              {bp.slots.length > slotsN && <p className="muted small">{bp.slots.length - slotsN} more slot{bp.slots.length - slotsN > 1 ? 's' : ''} unlock with Blacksmith mastery.</p>}
            </Section>
            <Section title="4 · Enchantment">
              {!G.upg(s, 'workbench') ? <p className="muted small">Build the Runic Workbench (Upgrades) to enchant weapons. It needs a Rune Tablet, found exploring ruins and caves.</p> : (
                <>
                  <div className="comp-opts">
                    <button type="button" className={'comp ' + (!spec.ench ? 'on' : '')} onClick={() => setSpec({ ...spec, ench: null })}>None</button>
                    {s.enchants.map((e) => { const E = ENCHANTS[e]; const tierOk = E.tier === 1 || G.upg(s, 'chamber') >= E.tier - 1; return (
                      <button type="button" key={e} className={'comp ' + (spec.ench === e ? 'on ' : '') + (G.hasMats(s, E.cost) && tierOk ? '' : 'short')} onClick={() => setSpec({ ...spec, ench: e })} style={{ '--ec': ELEMENTS[E.elem].color }}><b className="ench-name">{E.name} <small>T{E.tier}</small></b><span>{E.desc}</span></button>
                    ); })}
                  </div>
                  {s.enchants.length === 0 && <p className="muted small">You know no enchantments yet. Explore to discover them, or study a Rune Tablet.</p>}
                  <div className="row gap wrap"><button type="button" className="btn small ghost" disabled={tablets < 1 || !studyable.length} onClick={study}>Study a Rune Tablet ({tablets})</button><span className="muted small">{studyable.length ? 'Teaches an enchantment from a region you have reached.' : 'No more enchantments to learn from tablets in the regions you have reached.'}</span></div>
                </>
              )}
            </Section>
          </div>
          <div className="forge-col preview-col">
            <div className="panel preview">
              <div className="preview-art"><WeaponArt spec={previewItem} size={170} /></div>
              <div className="preview-head">
                <h3>{bp.name}</h3>
                <p className="muted small">{QUALITY[spec.q || 0]} {MATS[spec.mat] ? MATS[spec.mat].name : '—'}{spec.ench ? ' · ' + ENCHANTS[spec.ench].name : ''}</p>
                <p className="small">Possible rarity: <RarityName r={pv.rlo} /> to <RarityName r={pv.rhi} /></p>
              </div>
              <dl className="stat-table">
                <dt>Attack</dt><dd>{range('attack')}</dd>
                <dt>Speed</dt><dd>{range('speed')}</dd>
                <dt>Critical</dt><dd>{range('crit', (v) => v + '%')}</dd>
                <dt>Guard</dt><dd>{range('guard')}</dd>
                {(pv.hi.arcana > 0) && <><dt>Arcana</dt><dd>{range('arcana')}</dd></>}
                {pv.hi.pierce > 0 && <><dt>Pierce</dt><dd>{Math.round(pv.hi.pierce * 100)}%</dd></>}
                {pv.hi.elem !== 'none' && <><dt>Element</dt><dd style={{ color: ELEMENTS[pv.hi.elem].color }}>{ELEMENTS[pv.hi.elem].name}</dd></>}
                {pv.hi.status > 0 && <><dt>Status chance</dt><dd>{range('status', (v) => Math.round(v * 100) + '%')}</dd></>}
              </dl>
              {atAvg && <p className="small">At your recent average craftsmanship ({avg}): <b>ATK {atAvg.attack}</b>{atAvg.arcana ? ` · ARC ${atAvg.arcana}` : ''}</p>}
              <p className="muted small">Low end assumes poor forging (20), high end flawless (100). Material and blueprint set the ceiling; your hands decide where you land.</p>
              <div className="stage-list">
                {stages.map((st, i) => <span key={i} className="stage-chip">{i + 1}. {STAGE_INFO[st.id].name} <em>×{st.w}</em></span>)}
              </div>
              <h4>Cost</h4>
              <div className="chips">
                {MATS[spec.mat] && <MatChip id={spec.mat} n={cost.primary} have={(s.mats[spec.mat] || [0, 0, 0])[spec.q || 0]} q={spec.q || 0} />}
              </div>
              <CostList s={s} cost={cost.other} />
              {problems.length > 0 && <ul className="problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
              {s.player.blessing ? <p className="good small">Blessed: +5 craftsmanship on this forging.</p> : null}
              <button type="button" className="btn primary big full" disabled={problems.length > 0} onClick={onBegin}><Icon name="forge" size={20} /> Begin forging</button>
              {s.legacy.perks.trials && <label className="check"><input id="trialmode" type="checkbox" checked={!!s.settings.trial} onChange={(e) => store.mutate((d) => { d.settings.trial = e.target.checked; })} /> Trial Forging: harder timing, +30% Blacksmith XP, bonus trait chance</label>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Session({ s, spec, onDone, onAbandon }) {
  const stages = useMemo(() => G.forgeStages(s, spec), []); // eslint-disable-line
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState('intro');
  const [results, setResults] = useState([]);
  const [paused, setPaused] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const boxRef = React.useRef(null);
  useEffect(() => { try { if (boxRef.current) boxRef.current.scrollIntoView({ block: 'start', behavior: 'auto' }); } catch (e) { /* ignore */ } }, [i, phase]);
  useEffect(() => {
    const v = () => { if (document.hidden) setPaused(true); };
    document.addEventListener('visibilitychange', v); window.addEventListener('blur', v);
    return () => { document.removeEventListener('visibilitychange', v); window.removeEventListener('blur', v); };
  }, []);
  const stage = stages[i];
  const cfg = useMemo(() => G.qteConfig(s, spec, stage.id), [i]); // eslint-disable-line
  const Q = QTE_COMPONENTS[stage.id];
  const recover = s.smith.level >= 10 && !results.some((r) => r.recovered);
  const finishStage = (r) => {
    const rr = { id: stage.id, w: stage.w, ...r };
    const nr = [...results, rr];
    setResults(nr); setPhase('result'); setTimeout(() => sfx.stageDone(r.score), 120);
  };
  const next = () => {
    if (i + 1 >= stages.length) { onDone(results); return; }
    setI(i + 1); setPhase('intro'); setRunKey(runKey + 1);
  };
  const last = results[results.length - 1];
  const grade = (sc) => (sc >= 95 ? 'Perfect' : sc >= 80 ? 'Excellent' : sc >= 60 ? 'Good' : sc >= 35 ? 'Poor' : 'Miss');
  return (
    <div className="session panel" ref={boxRef}>
      <div className="session-head">
        <div className="session-steps">{stages.map((st, k) => <span key={k} className={'step ' + (k < i || (k === i && phase === 'result') ? 'done' : k === i ? 'cur' : '')}>{STAGE_INFO[st.id].name}{results[k] ? <em> {Math.round(results[k].score)}</em> : null}</span>)}</div>
        <div className="row gap">
          {phase === 'play' && <button type="button" className="icon-btn" onClick={() => setPaused(true)} aria-label="Pause"><Icon name="pause" /></button>}
          <button type="button" className="btn small ghost" onClick={() => { setPaused(true); setConfirmQuit(true); }}>Abandon</button>
        </div>
      </div>
      <div className="session-body">
        {phase === 'intro' && (
          <div className="stage-intro">
            <div className="eyebrow">Stage {i + 1} of {stages.length} · weight ×{stage.w}</div>
            <h2>{STAGE_INFO[stage.id].name}</h2>
            <p className="lead">{STAGE_INFO[stage.id].short}</p>
            <p>{STAGE_INFO[stage.id].how}</p>
            {s.records.best[stage.id] != null && <p className="muted small">Your best: {s.records.best[stage.id]}</p>}
            <button type="button" className="btn primary big" onClick={() => { setPhase('play'); setPaused(false); }}>Start</button>
          </div>
        )}
        {phase === 'play' && (
          <div className="stage-play">
            <h3 className="stage-title">{STAGE_INFO[stage.id].name}</h3>
            <Q key={runKey} cfg={cfg} paused={paused} spec={spec} recover={recover} onDone={finishStage} />
            {paused && !confirmQuit && <div className="pause-cover"><div><h3>Paused</h3><p className="muted">Timing is frozen until you resume.</p><button type="button" className="btn primary big" onClick={() => setPaused(false)}><Icon name="play" /> Resume</button></div></div>}
          </div>
        )}
        {phase === 'result' && last && (
          <div className="stage-result">
            <div className={'big-score ' + ({ Perfect: 'g-perfect', Excellent: 'g-excellent', Good: 'g-good', Poor: 'g-poor', Miss: 'g-miss' })[grade(last.score)]}>{Math.round(last.score)}</div>
            <div className="lead">{grade(last.score)} {STAGE_INFO[stage.id].name}</div>
            {last.grades && <div className="chips">{last.grades.map((g, k) => <span key={k} className={'chip grade-chip ' + ({ Perfect: 'g-perfect', Excellent: 'g-excellent', Good: 'g-good', Poor: 'g-poor', Miss: 'g-miss' })[g]}>{g}</span>)}</div>}
            {last.detail && <p className="muted">{last.detail}</p>}
            <button type="button" className="btn primary big" onClick={next} autoFocus>{i + 1 >= stages.length ? 'Reveal the weapon' : 'Next stage'}</button>
          </div>
        )}
      </div>
      {confirmQuit && (
        <Modal title="Abandon forging?" onClose={() => { setConfirmQuit(false); }}>
          <p>Your metal and components are kept{results.length ? ', but the coal already burned in the furnace is lost' : ''}.</p>
          <div className="row gap"><button type="button" className="btn danger" onClick={() => onAbandon(results.length > 0)}>Abandon</button><button type="button" className="btn" onClick={() => setConfirmQuit(false)}>Keep forging</button></div>
        </Modal>
      )}
    </div>
  );
}

function Reveal({ s, store, item, onAgain }) {
  const [view, setView] = useState('main');
  const [confirm, setConfirm] = useState(false);
  const it = s.items.find((x) => x.uid === item.uid) || item;
  const R = RARITIES[it.rarity]; const Gr = GRADES[it.grade];
  const cur = G.equippedWeapon(s);
  const gone = !s.items.find((x) => x.uid === item.uid);
  useEffect(() => { sfx.reveal(it.rarity); }, []);
  return (
    <div className="reveal panel" style={{ '--rc': R.color }}>
      <div className="reveal-burst" />
      <div className="reveal-art"><WeaponArt item={it} size={220} /></div>
      <div className="reveal-info">
        <div className="eyebrow"><RarityName r={it.rarity} /> · {CATEGORIES[it.cat].name}</div>
        <h2 className="reveal-name">{it.name}</h2>
        <p><GradeName g={it.grade} /> craftsmanship · score {it.score}</p>
        <div className="stage-scores">{it.stages.map((st, i) => <span key={i} className="stage-chip">{STAGE_INFO[st.id].name} <b>{st.score}</b></span>)}</div>
        {gone ? <p className="muted">This weapon was salvaged.</p> : (
          <div className="tabs small">
            <button type="button" className={view === 'main' ? 'on' : ''} onClick={() => setView('main')}>Attributes</button>
            <button type="button" className={view === 'inspect' ? 'on' : ''} onClick={() => setView('inspect')}>Inspect</button>
            {cur && cur.uid !== it.uid && <button type="button" className={view === 'compare' ? 'on' : ''} onClick={() => setView('compare')}>Compare</button>}
          </div>
        )}
        {view === 'main' && <><StatTable st={it.stats} /><TraitList traits={it.traits} /></>}
        {view === 'inspect' && <ul className="breakdown">{weaponBreakdown(it).map(([a, b]) => <li key={a}><b>{a}</b><span>{b}</span></li>)}</ul>}
        {view === 'compare' && cur && <div className="compare"><div><h4>{it.name}</h4><StatTable st={it.stats} compare={cur.stats} /></div><div><h4>{cur.name} (equipped)</h4><StatTable st={cur.stats} /></div></div>}
        {!gone && (
          <div className="row gap wrap">
            <button type="button" className="btn primary" disabled={s.equipped === it.uid} onClick={() => store.mutate((d) => { G.equip(d, it.uid); store.toast(`Equipped ${it.name}.`, 'info'); })}>{s.equipped === it.uid ? 'Equipped' : 'Equip'}</button>
            <button type="button" className="btn" onClick={onAgain}>Keep and forge another</button>
            <button type="button" className="btn ghost danger" disabled={s.equipped === it.uid} onClick={() => setConfirm(true)}>Salvage</button>
          </div>
        )}
        {gone && <button type="button" className="btn primary" onClick={onAgain}>Forge another</button>}
      </div>
      {confirm && (
        <Modal title="Salvage this weapon?" onClose={() => setConfirm(false)}>
          <p>{it.name} will be destroyed. You recover:</p>
          <div className="chips">{Object.entries(G.salvageReturn(s, it)).map(([k, n]) => <MatChip key={k} id={k} n={n} />)}</div>
          <div className="row gap"><button type="button" className="btn danger" onClick={() => { store.mutate((d, st) => G.salvage(d, it.uid, st)); setConfirm(false); }}>Salvage</button><button type="button" className="btn" onClick={() => setConfirm(false)}>Cancel</button></div>
        </Modal>
      )}
    </div>
  );
}

export default function ForgeScreen() {
  const [s, store] = useGame();
  const [spec, setSpec] = useState(() => ({ bp: s.blueprints[0] || 'arming', mat: 'iron', q: 0, comps: [], ench: null }));
  const [mode, setMode] = useState('design');
  const [made, setMade] = useState(null);
  const [lastSpec, setLastSpec] = useState(null);
  const begin = () => { if (G.forgeProblems(s, spec).length) return; setLastSpec(spec); setMode('session'); };
  const done = (results) => {
    const item = store.mutate((d, st) => G.completeForge(d, lastSpec, results, st));
    store.burst(item.rarity >= 4 ? 'legendary' : 'forge');
    setMade(item); setMode('reveal');
  };
  const abandon = (burned) => {
    if (burned) store.mutate((d) => { const c = BLUEPRINTS[lastSpec.bp].extra.coal || 0; if (c) G.spendMat(d, 'coal', c); });
    setMode('design');
  };
  const starlit = s.settings.starlit;
  return (
    <div className={'screen forge ' + (starlit ? 'starlit' : '')}>
      <div className="forge-banner">
        <div className="forge-fire" aria-hidden="true"><span /><span /><span /></div>
        <div>
          <h1>Hearthstone Forge</h1>
          <p className="muted">Blacksmith mastery {s.smith.level} · <span className="small">{G.fmt(s.smith.xp)} / {G.fmt(G.smithXpToNext(s.smith.level))} XP</span></p>
        </div>
      </div>
      {mode === 'design' && <Design s={s} store={store} spec={spec} setSpec={setSpec} onBegin={begin} />}
      {mode === 'session' && <Session s={s} spec={lastSpec} onDone={done} onAbandon={abandon} />}
      {mode === 'reveal' && made && <Reveal s={s} store={store} item={made} onAgain={() => { setMode('design'); setMade(null); }} />}
    </div>
  );
}
export { REGIONS };
