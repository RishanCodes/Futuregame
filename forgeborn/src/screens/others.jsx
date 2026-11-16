// FORGEBORN — Inventory, Character, Upgrades, Codex, Quests, Legacy and Settings screens.
import React, { useMemo, useState } from 'react';
import {
  MATS, MAT_KINDS, BLUEPRINTS, CATEGORIES, RARITIES, GRADES, ENEMIES, REGIONS, LOCATIONS, QUESTS, ACHIEVEMENTS, TALENTS, TALENT_TREES,
  SKILLS, MASTERY_PASSIVES, SMITH_UNLOCKS, FORGE_UPGRADES, PICKAXES, SICKLES, LENSES, CONSUMABLES, LEGACY_PERKS, ENCHANTS, ELEMENTS, QUALITY,
} from '../data.js';
import * as G from '../engine.js';
import { useGame, useNav, Modal, Bar, CostList, MatChip, RarityName, GradeName, StatTable, TraitList, WeaponCard, weaponBreakdown, Section, Empty } from '../ui.jsx';
import { WeaponArt, MatIcon, Icon, EnemyArt, Scene } from '../art.jsx';
import { STAGE_INFO } from '../qte.jsx';
import { setSound } from '../sfx.js';

// ================= INVENTORY =================
function WeaponDetail({ s, store, it, onClose }) {
  const [view, setView] = useState('stats');
  const [confirm, setConfirm] = useState(null);
  const cur = G.equippedWeapon(s);
  const eq = s.equipped === it.uid;
  return (
    <Modal title={it.name} onClose={onClose} wide>
      <div className="detail" style={{ '--rc': RARITIES[it.rarity].color }}>
        <div className="detail-art"><WeaponArt item={it} size={180} /></div>
        <div className="detail-info">
          <p><RarityName r={it.rarity} /> {CATEGORIES[it.cat].name} · <GradeName g={it.grade} /> ({it.score})</p>
          <div className="tabs small">
            <button type="button" className={view === 'stats' ? 'on' : ''} onClick={() => setView('stats')}>Attributes</button>
            <button type="button" className={view === 'inspect' ? 'on' : ''} onClick={() => setView('inspect')}>How it was made</button>
            {cur && !eq && <button type="button" className={view === 'cmp' ? 'on' : ''} onClick={() => setView('cmp')}>Compare</button>}
          </div>
          {view === 'stats' && <><StatTable st={it.stats} /><TraitList traits={it.traits} /></>}
          {view === 'inspect' && <><ul className="breakdown">{weaponBreakdown(it).map(([a, b]) => <li key={a}><b>{a}</b><span>{b}</span></li>)}</ul><div className="stage-scores">{it.stages.map((st, i) => <span key={i} className="stage-chip">{STAGE_INFO[st.id].name} <b>{st.score}</b></span>)}</div></>}
          {view === 'cmp' && cur && <div className="compare"><div><h4>This weapon</h4><StatTable st={it.stats} compare={cur.stats} /></div><div><h4>{cur.name}</h4><StatTable st={cur.stats} /></div></div>}
          <div className="row gap wrap">
            <button type="button" className="btn primary" onClick={() => store.mutate((d) => { if (eq) { d.equipped = null; d.player.hp = Math.min(d.player.hp, G.playerStats(d).maxHp); } else G.equip(d, it.uid); })}>{eq ? 'Unequip' : 'Equip'}</button>
            <button type="button" className="btn" onClick={() => store.mutate((d) => { const x = G.getItem(d, it.uid); x.locked = !x.locked; })}><Icon name="lock" size={16} /> {it.locked ? 'Unlock' : 'Lock'}</button>
            <button type="button" className="btn" onClick={() => store.mutate((d) => { const x = G.getItem(d, it.uid); x.fav = !x.fav; })}>{it.fav ? '★ Unfavorite' : '☆ Favorite'}</button>
            <button type="button" className="btn ghost danger" disabled={eq || it.locked} onClick={() => setConfirm('salvage')}>Salvage</button>
            <button type="button" className="btn ghost" disabled={eq || it.locked} onClick={() => setConfirm('sell')}>Sell ({G.sellValue(it)}g)</button>
          </div>
          {(eq || it.locked) && <p className="muted small">{eq ? 'Equipped weapons' : 'Locked weapons'} cannot be salvaged or sold.</p>}
        </div>
      </div>
      {confirm && (
        <Modal title={confirm === 'salvage' ? 'Salvage weapon?' : 'Sell weapon?'} onClose={() => setConfirm(null)}>
          {confirm === 'salvage' ? <><p>Destroy {it.name} and recover part of its materials:</p><div className="chips">{Object.entries(G.salvageReturn(s, it)).map(([k, n]) => <MatChip key={k} id={k} n={n} />)}{!Object.keys(G.salvageReturn(s, it)).length && <span className="muted">Nothing recoverable.</span>}</div></> : <p>Sell {it.name} for {G.sellValue(it)} gold (before Merchant's Favor bonuses)?</p>}
          <div className="row gap"><button type="button" className="btn danger" onClick={() => { store.mutate((d, st) => (confirm === 'salvage' ? G.salvage(d, it.uid, st) : G.sellItem(d, it.uid))); setConfirm(null); onClose(); }}>{confirm === 'salvage' ? 'Salvage' : 'Sell'}</button><button type="button" className="btn" onClick={() => setConfirm(null)}>Cancel</button></div>
        </Modal>
      )}
    </Modal>
  );
}

export function InventoryScreen() {
  const [s, store] = useGame();
  const [tab, setTab] = useState('weapons');
  const [sort, setSort] = useState('rarity');
  const [cat, setCat] = useState('all');
  const [sel, setSel] = useState(null);
  const [matSel, setMatSel] = useState(null);
  const items = useMemo(() => {
    let l = s.items.filter((i) => cat === 'all' || (cat === 'fav' ? i.fav : i.cat === cat));
    const f = { rarity: (a, b) => b.rarity - a.rarity || b.stats.attack - a.stats.attack, attack: (a, b) => b.stats.attack - a.stats.attack, newest: (a, b) => b.created - a.created, craft: (a, b) => b.score - a.score }[sort];
    return [...l].sort(f);
  }, [s.items, sort, cat]);
  const selIt = sel && s.items.find((i) => i.uid === sel);
  const kinds = Object.keys(MAT_KINDS).filter((k) => Object.keys(s.mats).some((m) => MATS[m].kind === k && G.matCount(s, m) > 0));
  return (
    <div className="screen inventory">
      <div className="tabs">
        <button type="button" className={tab === 'weapons' ? 'on' : ''} onClick={() => setTab('weapons')}>Weapons ({s.items.length})</button>
        <button type="button" className={tab === 'mats' ? 'on' : ''} onClick={() => setTab('mats')}>Materials</button>
        <button type="button" className={tab === 'items' ? 'on' : ''} onClick={() => setTab('items')}>Consumables</button>
      </div>
      {tab === 'weapons' && (
        <>
          <div className="filters">
            <label htmlFor="inv-sort">Sort</label>
            <select id="inv-sort" value={sort} onChange={(e) => setSort(e.target.value)}><option value="rarity">Rarity</option><option value="attack">Attack</option><option value="craft">Craftsmanship</option><option value="newest">Newest</option></select>
            <label htmlFor="inv-cat">Show</label>
            <select id="inv-cat" value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All</option><option value="fav">Favorites</option>{Object.keys(CATEGORIES).map((c) => <option key={c} value={c}>{CATEGORIES[c].name}</option>)}</select>
          </div>
          {items.length === 0 ? <Empty>No weapons yet. Forge one at the Forge.</Empty> : <div className="wgrid">{items.map((it) => <WeaponCard key={it.uid} it={it} equipped={s.equipped === it.uid} onClick={() => setSel(it.uid)} />)}</div>}
        </>
      )}
      {tab === 'mats' && (
        <div className="mat-sections">
          {kinds.length === 0 && <Empty>Your satchel is empty.</Empty>}
          {kinds.map((k) => (
            <Section key={k} title={MAT_KINDS[k]}>
              <div className="mat-list">
                {Object.keys(MATS).filter((m) => MATS[m].kind === k && G.matCount(s, m) > 0).map((m) => {
                  const a = s.mats[m];
                  return (
                    <button type="button" key={m} className="mat-row" onClick={() => setMatSel(m)}>
                      <MatIcon id={m} size={32} q={a[2] ? 2 : a[1] ? 1 : 0} />
                      <span className="grow"><b>{MATS[m].name}</b><span className="muted small">T{MATS[m].tier}</span></span>
                      <span className="qcounts">{a[0] > 0 && <span className="q0">{a[0]}</span>}{a[1] > 0 && <span className="q1">{a[1]}</span>}{a[2] > 0 && <span className="q2">{a[2]}</span>}</span>
                    </button>
                  );
                })}
              </div>
            </Section>
          ))}
          <p className="muted small">Counts: white Common · blue Refined · gold Pristine. Higher quality adds 5% / 10% power when used as a primary material.</p>
        </div>
      )}
      {tab === 'items' && (
        <div className="list">
          {Object.keys(CONSUMABLES).map((k) => <div key={k} className="list-row"><Icon name="potion" size={26} stroke="#ffb3a0" /><div className="grow"><b>{CONSUMABLES[k].name}</b><div className="muted small">{CONSUMABLES[k].desc}</div></div><b>×{s.consumables[k] || 0}</b></div>)}
          <p className="muted small">Buy consumables from the merchant at Hearthstone Forge or Cinderfall Outpost. Use them in battle from the Items menu.</p>
        </div>
      )}
      {selIt && <WeaponDetail s={s} store={store} it={selIt} onClose={() => setSel(null)} />}
      {matSel && <Modal title={MATS[matSel].name} onClose={() => setMatSel(null)}><div className="event-hero"><MatIcon id={matSel} size={64} /><div><p>{MATS[matSel].desc}</p><p className="muted small">Source: {MATS[matSel].src}</p>{MATS[matSel].power && <p className="small">Material strength {MATS[matSel].power} · tier {MATS[matSel].tier}</p>}<p className="small">{QUALITY.map((q, i) => `${q} ${(s.mats[matSel] || [0, 0, 0])[i]}`).join(' · ')}</p></div></div></Modal>}
    </div>
  );
}

// ================= CHARACTER =================
export function CharacterScreen() {
  const [s, store] = useGame();
  const [respec, setRespec] = useState(false);
  const P = G.playerStats(s);
  const rc = G.respecCost(s);
  const spent = Object.values(s.player.talents).reduce((a, b) => a + b, 0);
  return (
    <div className="screen character">
      <div className="char-grid">
        <div className="panel pad">
          <h2>{s.legacy.count ? `Rekindled Smith · Life ${s.legacy.count + 1}` : 'The Smith'}</h2>
          <p>Level {s.player.level}</p>
          <Bar v={s.player.xp} max={G.xpToNext(s.player.level)} color="var(--xp)" label="XP" />
          <Bar v={s.player.hp} max={P.maxHp} color="var(--hp)" label="HP" />
          <dl className="stat-table">
            <dt>Attack</dt><dd>{P.attack}</dd><dt>Arcana</dt><dd>{P.arcana}</dd><dt>Speed</dt><dd>{P.speed}</dd><dt>Critical</dt><dd>{P.crit}% (+{P.critDmg}%)</dd><dt>Guard</dt><dd>{P.guard}</dd>
            <dt>Armor pierce</dt><dd>{Math.round(P.pierce * 100)}%</dd><dt>Stamina / turn</dt><dd>{P.staRegen}</dd><dt>Mana</dt><dd>{P.maxMana} (+{P.manaRegen}/turn)</dd><dt>Defend</dt><dd>−{Math.round(P.defendCut * 100)}% damage</dd><dt>Gold</dt><dd>{G.fmt(s.player.gold)}</dd>
          </dl>
        </div>
        <div className="panel pad">
          <h3>Blacksmith mastery {s.smith.level}</h3>
          <Bar v={s.smith.xp} max={G.smithXpToNext(s.smith.level)} color="var(--gold)" label="XP" />
          <ul className="unlocks">{SMITH_UNLOCKS.map((u) => <li key={u.lvl} className={s.smith.level >= u.lvl ? 'got' : ''}><b>{u.lvl}</b> {u.text}</li>)}</ul>
          <p className="muted small">Earned by forging. Higher scores and better materials earn more.</p>
        </div>
      </div>
      <Section title={`Talents · ${s.player.tp} point${s.player.tp === 1 ? '' : 's'} available`} right={<button type="button" className="btn small ghost" disabled={!spent} onClick={() => setRespec(true)}>Reset talents{rc ? ` (${rc}g)` : ' (free)'}</button>}>
        <div className="trees">
          {Object.keys(TALENT_TREES).map((tr) => {
            const T = TALENT_TREES[tr]; const pts = G.treePoints(s, tr);
            return (
              <div key={tr} className="tree panel" style={{ '--tc': T.color }}>
                <h4>{T.name} <span className="muted small">{pts} pts</span></h4>
                <p className="muted small">{T.desc}</p>
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="tree-row">
                    {row > 0 && <div className="row-req">{row === 3 ? `Capstone · ${TALENTS[Object.keys(TALENTS).find((k) => TALENTS[k].tree === tr && TALENTS[k].row === 3)].need} pts` : `${row * 2} pts in tree`}</div>}
                    {Object.keys(TALENTS).filter((k) => TALENTS[k].tree === tr && TALENTS[k].row === row).map((k) => {
                      const t = TALENTS[k]; const r = G.tal(s, k); const can = G.canLearn(s, k);
                      return (
                        <button type="button" key={k} className={'talent ' + (r ? 'has ' : '') + (r >= t.max ? 'max' : '')} disabled={!can} onClick={() => store.mutate((d) => { if (G.canLearn(d, k)) { d.player.talents[k] = G.tal(d, k) + 1; d.player.tp--; } })}>
                          <b>{t.name} <span className="rank">{r}/{t.max}</span></b>
                          <span className="small">{t.desc(Math.max(1, r + (r < t.max ? 1 : 0)))}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Section>
      <Section title="Weapon mastery">
        <div className="mastery-grid">
          {Object.keys(CATEGORIES).map((c) => {
            const m = s.mastery[c];
            return (
              <div key={c} className="panel pad mastery">
                <h4>{CATEGORIES[c].name} <span className="muted small">level {m.lvl}</span></h4>
                <Bar v={m.xp} max={G.masteryXpToNext(m.lvl)} color="var(--xp)" small />
                <ul className="unlocks">
                  {SKILLS[c].map((k) => <li key={k.id} className={m.lvl >= k.lvl || k.lvl === 1 ? 'got' : ''}><b>{k.lvl}</b> Skill: {k.name}</li>)}
                  {MASTERY_PASSIVES[c].map(([l, t]) => <li key={l} className={m.lvl >= l ? 'got' : ''}><b>{l}</b> {t}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="muted small">Win battles with a weapon category equipped to raise its mastery.</p>
      </Section>
      {respec && <Modal title="Reset talents?" onClose={() => setRespec(false)}><p>Refund all {spent} talent points{rc ? ` for ${rc} gold` : '. Your first reset is free'}.</p><div className="row gap"><button type="button" className="btn primary" disabled={s.player.gold < rc} onClick={() => { store.mutate((d) => { d.player.gold -= G.respecCost(d); d.player.tp += Object.values(d.player.talents).reduce((a, b) => a + b, 0); d.player.talents = {}; d.player.respecs++; d.player.hp = Math.min(d.player.hp, G.playerStats(d).maxHp); }); setRespec(false); }}>Reset</button><button type="button" className="btn" onClick={() => setRespec(false)}>Cancel</button></div></Modal>}
    </div>
  );
}

// ================= UPGRADES =================
export function UpgradesScreen() {
  const [s, store] = useGame();
  const tools = [['pick', 'Pickaxe', PICKAXES, 'Higher tiers break harder ore and strike harder.'], ['sickle', 'Sickle', SICKLES, 'Better foraging yields and slower wilting.'], ['lens', 'Lens', LENSES, 'Reveals pocket chances and finds richer deposits.']];
  return (
    <div className="screen upgrades">
      <Section title="Forge workshop">
        <div className="up-grid">
          {Object.keys(FORGE_UPGRADES).map((id) => {
            const U = FORGE_UPGRADES[id]; const lvl = G.upg(s, id); const c = G.upgradeCost(s, id);
            const smithLock = U.smith && s.smith.level < U.smith;
            return (
              <div key={id} className={'panel pad up-card ' + (lvl ? 'built' : '')}>
                <div className="up-head"><h4>{U.name}</h4><span className="lvl">{lvl}/{U.max}</span></div>
                <div className="pips">{Array.from({ length: U.max }, (_, i) => <span key={i} className={'pip ' + (i < lvl ? 'g-perfect' : '')} />)}</div>
                <p className="small">{U.desc}</p>
                {c ? <><CostList s={s} cost={c.mats} gold={c.gold} />{smithLock && <p className="bad small">Requires Blacksmith mastery {U.smith}.</p>}<button type="button" className="btn primary" disabled={!G.canAfford(s, c) || smithLock} onClick={() => store.mutate((d, st) => G.buyUpgrade(d, id, st))}>{lvl ? 'Upgrade' : 'Build'}</button></> : <p className="good small">Fully upgraded.</p>}
              </div>
            );
          })}
        </div>
      </Section>
      <Section title="Gathering tools">
        <div className="up-grid">
          {tools.map(([k, name, list, desc]) => {
            const cur = list[s.tools[k]]; const next = list[s.tools[k] + 1];
            return (
              <div key={k} className="panel pad up-card">
                <div className="up-head"><h4>{name}: {cur.name}</h4><span className="lvl">{s.tools[k] + (k === 'pick' ? 1 : 0)}/{list.length - (k === 'pick' ? 0 : 1)}</span></div>
                <p className="small">{desc}{k === 'pick' ? ` Current: tier ${cur.tier}, ${cur.swings} swings, ×${cur.power} power.` : ''}</p>
                {next ? <><p className="small">Next: <b>{next.name}</b>{k === 'pick' ? ` (tier ${next.tier})` : ''}</p><CostList s={s} cost={next.cost.mats} gold={next.cost.gold} /><button type="button" className="btn primary" disabled={!G.canAfford(s, next.cost)} onClick={() => store.mutate((d, st) => G.buyTool(d, k, st))}>Craft</button></> : <p className="good small">Best tool owned.</p>}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ================= CODEX =================
export function CodexScreen() {
  const [s] = useGame();
  const [tab, setTab] = useState('mats');
  const [sel, setSel] = useState(null);
  return (
    <div className="screen codex">
      <div className="tabs">
        {[['mats', 'Materials'], ['beasts', 'Bestiary'], ['bps', 'Blueprints'], ['ench', 'Enchantments'], ['records', 'Forging records'], ['lore', 'Regions']].map(([k, n]) => <button type="button" key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{n}</button>)}
      </div>
      {tab === 'mats' && <><p className="muted small">{Object.keys(s.codex.mats).length} / {Object.keys(MATS).length} discovered</p><div className="codex-grid">{Object.keys(MATS).map((m) => { const k = s.codex.mats[m]; return <div key={m} className={'codex-card ' + (k ? '' : 'unknown')}>{k ? <MatIcon id={m} size={36} /> : <span className="q">?</span>}<div><b>{k ? MATS[m].name : 'Undiscovered'}</b><p className="small muted">{k ? MATS[m].desc : ''}</p><p className="small">{MATS[m].src}</p></div></div>; })}</div></>}
      {tab === 'beasts' && <div className="codex-grid">{Object.keys(ENEMIES).map((e) => { const c = s.codex.enemies[e]; const E = ENEMIES[e]; return <button type="button" key={e} className={'codex-card ' + (c ? '' : 'unknown')} onClick={() => c && setSel(e)}>{c ? <EnemyArt enemy={E} size={56} /> : <span className="q">?</span>}<div><b>{c ? E.name : '???'}</b><p className="small muted">{REGIONS[E.region].name}{E.boss ? ' · Boss' : E.elite ? ' · Elite' : ''}{c ? ` · defeated ${c.kills || 0}` : ''}</p></div></button>; })}</div>}
      {tab === 'bps' && <div className="codex-grid">{Object.keys(BLUEPRINTS).filter((b) => !BLUEPRINTS[b].legacy || s.blueprints.includes(b)).map((b) => { const B = BLUEPRINTS[b]; const k = s.blueprints.includes(b); return <div key={b} className={'codex-card ' + (k ? '' : 'unknown')}><WeaponArt spec={{ bp: b, mat: 'steel', comps: [] }} size={48} glow={false} className={k ? '' : 'unknown'} /><div><b>{k ? B.name : 'Undiscovered blueprint'}</b><p className="small muted">{CATEGORIES[B.cat].name} · tier {B.tier}{k ? ` · forged ${s.codex.bps[b] || 0}×` : ''}</p><p className="small">{k ? B.desc : 'Found through exploration.'}</p></div></div>; })}</div>}
      {tab === 'ench' && <div className="codex-grid">{Object.keys(ENCHANTS).map((e) => { const E = ENCHANTS[e]; const k = s.enchants.includes(e); return <div key={e} className={'codex-card ' + (k ? '' : 'unknown')}><span className="ench-dot" style={{ background: ELEMENTS[E.elem].color }} /><div><b>{k ? E.name : 'Unknown enchantment'}</b><p className="small muted">Tier {E.tier} · {ELEMENTS[E.elem].name}</p><p className="small">{k ? E.desc : 'Discovered in the wild or studied from Rune Tablets.'}</p></div></div>; })}</div>}
      {tab === 'records' && (
        <div className="records">
          <div className="panel pad"><h3>Personal bests</h3><dl className="stat-table">{Object.keys(STAGE_INFO).map((k) => <React.Fragment key={k}><dt>{STAGE_INFO[k].name}</dt><dd>{s.records.best[k] != null ? s.records.best[k] : '—'}</dd></React.Fragment>)}<dt>Best craftsmanship</dt><dd>{s.records.best.total || '—'}</dd><dt>Weapons forged</dt><dd>{s.stats.crafted}</dd><dt>Perfect timings</dt><dd>{s.stats.perfects}</dd><dt>Deposits mined</dt><dd>{s.stats.mined}</dd><dt>Battles won</dt><dd>{s.stats.wins}</dd><dt>Highest hit</dt><dd>{G.fmt(s.stats.maxHit)}</dd></dl></div>
          <div className="panel pad"><h3>Recent forgings</h3>{s.records.history.length === 0 ? <p className="muted">Nothing forged yet.</p> : <ul className="history">{s.records.history.map((h, i) => <li key={i}><b style={{ color: RARITIES[h.rarity].color }}>{h.name}</b> <span className="muted small">{BLUEPRINTS[h.bp].name} · {MATS[h.mat].name}</span> <span className="small"><GradeName g={h.grade} /> {h.score}</span></li>)}</ul>}</div>
          {s.legacy.hall && s.legacy.hall.length > 0 && <div className="panel pad"><h3>Hall of Legends</h3><ul className="history">{s.legacy.hall.map((h, i) => <li key={i}><b style={{ color: RARITIES[h.rarity].color }}>{h.name}</b> <span className="muted small">Life {h.life} · {BLUEPRINTS[h.bp].name}</span></li>)}</ul></div>}
        </div>
      )}
      {tab === 'lore' && <div className="lore">{Object.keys(REGIONS).map((r) => { const open = G.regionUnlocked(s, r); return <div key={r} className="panel lore-card"><Scene region={r} type={open ? 'wild' : null} height={90} /><div className="pad"><h3 style={{ color: REGIONS[r].color }}>{open ? REGIONS[r].name : 'Sealed region'}</h3><p className="small">{open ? REGIONS[r].desc : 'Defeat the guardian of the previous region to open the way.'}</p>{open && <ul className="small">{Object.keys(LOCATIONS).filter((l) => LOCATIONS[l].region === r && G.locVisible(s, l)).map((l) => <li key={l}>{LOCATIONS[l].name} · {s.world.progress[l] || 0}%</li>)}</ul>}</div></div>; })}</div>}
      {sel && <Modal title={ENEMIES[sel].name} onClose={() => setSel(null)}><div className="event-hero"><EnemyArt enemy={ENEMIES[sel]} size={140} /><div><p>{ENEMIES[sel].desc}</p><p className="small">Weak to: {(ENEMIES[sel].weak || []).map((w) => ELEMENTS[w].name).join(', ') || '—'} · Resists: {(ENEMIES[sel].resist || []).map((w) => ELEMENTS[w].name).join(', ') || '—'}</p><p className="small">Drops: {ENEMIES[sel].drops.map((d) => MATS[d[0]].name).join(', ')}</p>{ENEMIES[sel].reward && <p className="gold-text small">{ENEMIES[sel].reward}</p>}</div></div></Modal>}
    </div>
  );
}

// ================= QUESTS =================
function rewardText(r) {
  const p = [];
  if (r.gold) p.push(`${r.gold} gold`); if (r.xp) p.push(`${r.xp} XP`); if (r.smithxp) p.push(`${r.smithxp} smith XP`); if (r.lp) p.push(`${r.lp} Legacy Points`);
  for (const k in r.mats || {}) p.push(`${r.mats[k]} ${MATS[k].name}`); for (const k in r.items || {}) p.push(`${r.items[k]} ${CONSUMABLES[k].name}`);
  return p.join(', ');
}
export function QuestsScreen() {
  const [s, store] = useGame();
  const [tab, setTab] = useState('quests');
  const row = (q) => {
    const st = s.quests[q.id] || { n: 0 }; const open = G.questUnlocked(s, q) || st.done;
    if (!open) return null;
    return (
      <div key={q.id} className={'quest panel pad ' + (st.claimed ? 'claimed' : st.done ? 'done' : '')}>
        <div className="quest-head"><b>{q.name}</b>{q.main && <span className="tag gold">Main</span>}</div>
        <p className="small">{q.desc}</p>
        <Bar v={st.n || 0} max={q.n} color="var(--gold)" small>{Math.min(st.n || 0, q.n)} / {q.n}</Bar>
        <p className="muted small">Reward: {rewardText(q.reward)}</p>
        {st.done && !st.claimed && <button type="button" className="btn primary small" onClick={() => store.mutate((d, stt) => G.claimQuest(d, q.id, stt))}>Claim reward</button>}
        {st.claimed && <span className="good small">Completed</span>}
      </div>
    );
  };
  const nextMain = QUESTS.find((q) => q.main && !(s.quests[q.id] && s.quests[q.id].claimed));
  return (
    <div className="screen quests">
      <div className="tabs"><button type="button" className={tab === 'quests' ? 'on' : ''} onClick={() => setTab('quests')}>Quests</button><button type="button" className={tab === 'ach' ? 'on' : ''} onClick={() => setTab('ach')}>Achievements ({Object.keys(s.achievements).length}/{ACHIEVEMENTS.length})</button></div>
      {tab === 'quests' && (
        <>
          {nextMain && <p className="muted">Current goal: <b className="gold-text">{nextMain.name}</b> — {nextMain.desc}</p>}
          <Section title="Main story"><div className="quest-grid">{QUESTS.filter((q) => q.main).map(row)}</div></Section>
          <Section title="Side quests and bounties"><div className="quest-grid">{QUESTS.filter((q) => !q.main).map(row)}</div></Section>
        </>
      )}
      {tab === 'ach' && <div className="ach-grid">{ACHIEVEMENTS.map((a) => { const got = s.achievements[a.id]; return <div key={a.id} className={'ach ' + (got ? 'got' : '')}><Icon name="trophy" size={24} /><div><b>{a.name}</b><p className="small muted">{a.desc}</p></div></div>; })}</div>}
    </div>
  );
}

// ================= LEGACY =================
export function LegacyScreen({ onRekindle }) {
  const [s, store] = useGame();
  const [confirm, setConfirm] = useState(0);
  const lp = G.legacyPoints(s);
  const can = G.canRekindle(s);
  return (
    <div className="screen legacy">
      <div className="panel pad legacy-hero">
        <div className="legacy-flame" aria-hidden="true" />
        <div>
          <h1>Rekindling the Eternal Forge</h1>
          <p>When the Hollow Sovereign falls, you may return your fire to the first forge and begin a new life as a smith. You lose your worldly progress but keep what your hands have learned, earning Legacy Points to spend on permanent perks.</p>
          <p>Rekindled {s.legacy.count}× · <b className="gold-text">{s.legacy.lp} Legacy Points</b> to spend</p>
        </div>
      </div>
      <div className="legacy-cols">
        <div className="panel pad">
          <h3>What resets</h3>
          <ul className="small">
            <li>Character level, XP, gold and talents</li><li>All materials and consumables</li><li>All weapons (except one Heirloom, if you own that perk)</li><li>Blueprints and enchantments (except legacy blueprints)</li><li>World exploration, regions, deposits, quests and boss progress</li><li>Forge upgrades and tools (Ember Memory keeps two)</li><li>Weapon mastery; Blacksmith mastery drops to half (rounded down)</li>
          </ul>
          <h3>What stays</h3>
          <ul className="small"><li>Legacy Points and perks</li><li>Achievements, Codex, forging records and the Hall of Legends</li><li>Settings</li><li>Half your Blacksmith mastery</li></ul>
          <h3>Each rekindling also</h3>
          <ul className="small"><li>+5% XP and gold permanently (stacks)</li><li>Enemies grow 25% stronger and give 20% more rewards</li><li>Places your best weapon in the Hall of Legends</li></ul>
        </div>
        <div className="panel pad">
          <h3>Rekindle now</h3>
          {can ? <p>You would gain <b className="gold-text">{lp} Legacy Points</b> (level, Blacksmith mastery, bosses defeated, achievements and best rarity).</p> : <p className="muted">Defeat the Hollow Sovereign in the Astral Expanse to unlock rekindling. Current estimate: {lp} Legacy Points.</p>}
          {confirm === 0 && <button type="button" className="btn danger big" disabled={!can} onClick={() => setConfirm(1)}>Rekindle the Eternal Forge</button>}
          {confirm === 1 && <div className="confirm-box"><p><b>This resets your current life.</b> Make sure you have read what resets. Consider exporting a save from Settings first.</p><div className="row gap"><button type="button" className="btn danger" onClick={() => { onRekindle(); setConfirm(0); }}>Yes, rekindle</button><button type="button" className="btn" onClick={() => setConfirm(0)}>Cancel</button></div></div>}
        </div>
      </div>
      <Section title="Legacy perks">
        <div className="up-grid">
          {Object.keys(LEGACY_PERKS).map((id) => {
            const P = LEGACY_PERKS[id]; const r = s.legacy.perks[id] || 0; const c = r < P.max ? P.cost(r) : null;
            return (
              <div key={id} className={'panel pad up-card ' + (r ? 'built' : '')}>
                <div className="up-head"><h4>{P.name}</h4><span className="lvl">{r}/{P.max}</span></div>
                <p className="small">{P.desc(Math.max(1, r))}</p>
                {c != null ? <button type="button" className="btn primary" disabled={s.legacy.lp < c} onClick={() => store.mutate((d) => G.buyPerk(d, id))}>Learn ({c} LP)</button> : <p className="good small">Mastered.</p>}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ================= SETTINGS =================
export function SettingsScreen({ onImport, onReset, saveNow }) {
  const [s, store] = useGame();
  const [exp, setExp] = useState('');
  const [imp, setImp] = useState('');
  const [msg, setMsg] = useState('');
  const [reset, setReset] = useState(0);
  const set = (k, v) => store.mutate((d) => { d.settings[k] = v; if (k === 'sound') setSound(v); });
  const toggles = [
    ['combatTiming', 'Combat timing prompts', 'Attack and defense timing in battle. When off, timed actions resolve as average and defense as a normal brace.'],
    ['relaxed', 'Relaxed timing (accessibility)', 'All timing windows 25% wider. Final craftsmanship ×0.9 to keep it fair.'],
    ['reducedMotion', 'Reduce motion', 'Fewer particles, shakes and flashes. Also follows your system setting.'],
    ['sound', 'Sound effects', 'Short synthesized sounds for hits and timings.'],
  ];
  const copy = async () => { try { await navigator.clipboard.writeText(exp); setMsg('Copied to clipboard.'); } catch (e) { setMsg('Copy failed. Select the text and copy it manually.'); } };
  return (
    <div className="screen settings">
      <Section title="Gameplay">
        <div className="list">{toggles.map(([k, n, d]) => <label key={k} className="list-row toggle" htmlFor={'set-' + k}><div className="grow"><b>{n}</b><div className="muted small">{d}</div></div><input id={'set-' + k} type="checkbox" checked={!!s.settings[k]} onChange={(e) => set(k, e.target.checked)} /></label>)}</div>
      </Section>
      <Section title="Save data">
        <div className="panel pad">
          <p className="small">{G.storage.status === 'blocked' ? <span className="bad">Browser storage is unavailable here. Progress is not saved between visits. Export your save to keep it.</span> : <>Progress autosaves in this browser after every significant action. Saves stay on this device and browser only; clearing site data or using a private window removes them.</>}</p>
          {G.storage.note && <p className="bad small">{G.storage.note}</p>}
          <p className="muted small">Last saved: {s.saved ? new Date(s.saved).toLocaleString() : 'not yet'} · save version {G.SAVE_VERSION}</p>
          <div className="row gap wrap">
            <button type="button" className="btn primary" onClick={() => { const ok = saveNow(); setMsg(ok ? 'Game saved. A backup copy was also kept.' : 'Could not save: storage is unavailable.'); }}><Icon name="save" size={16} /> Save now</button>
            <button type="button" className="btn" onClick={() => { setExp(G.exportSave(s)); setMsg('Export created. Copy it somewhere safe.'); }}>Export save</button>
          </div>
          {exp && <><textarea id="export-box" className="savebox" readOnly value={exp} onFocus={(e) => e.target.select()} /><button type="button" className="btn small" onClick={copy}>Copy</button></>}
          <label htmlFor="import-box" className="small">Import a save</label>
          <textarea id="import-box" className="savebox" value={imp} placeholder="Paste an exported save (starts with FGB1:)" onChange={(e) => setImp(e.target.value)} />
          <button type="button" className="btn" disabled={!imp.trim()} onClick={() => { try { const st = G.importSave(imp); onImport(st); setImp(''); setMsg('Save imported.'); } catch (e) { setMsg('That save could not be loaded: ' + e.message); } }}>Load imported save</button>
          {msg && <p className="good small">{msg}</p>}
        </div>
      </Section>
      <Section title="Danger zone">
        <div className="panel pad">
          {reset === 0 && <button type="button" className="btn danger" onClick={() => setReset(1)}>Start a new game</button>}
          {reset === 1 && <div className="confirm-box"><p>This erases this browser's save, including legacy progress. Export first if you want to keep it.</p><div className="row gap"><button type="button" className="btn danger" onClick={() => { onReset(); setReset(0); }}>Erase and restart</button><button type="button" className="btn" onClick={() => setReset(0)}>Cancel</button></div></div>}
        </div>
      </Section>
      <Section title="Controls">
        <div className="panel pad small">
          <p><b>Forging:</b> Circular Precision and Quenching use tap or Space. Furnace: hold the button or Space. Hammering: tap points or keys 1–7. Runes: drag with mouse or finger. Mana: drag the dampers, or W/S and ↑/↓.</p>
          <p><b>Battle:</b> timing prompts use tap or Space.</p>
          <p><b>Anywhere:</b> Escape closes dialogs.</p>
        </div>
      </Section>
    </div>
  );
}
export { G };
