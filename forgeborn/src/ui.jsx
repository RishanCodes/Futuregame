// FORGEBORN — shared UI pieces and the store hook.
import React, { createContext, useContext, useSyncExternalStore, useEffect } from 'react';
import { MATS, RARITIES, GRADES, ELEMENTS, BLUEPRINTS, CATEGORIES, TRAITS, COMPONENTS, ENCHANTS, QUALITY } from './data.js';
import { matCount, fmt } from './engine.js';
import { MatIcon, WeaponArt, Icon } from './art.jsx';

export const StoreCtx = createContext(null);
export function useGame() {
  const store = useContext(StoreCtx);
  const s = useSyncExternalStore(store.subscribe, store.get, store.get);
  return [s, store];
}
export const NavCtx = createContext({ go: () => {} });
export const useNav = () => useContext(NavCtx);

export function Bar({ v, max, color, label, small, children }) {
  const p = max > 0 ? Math.max(0, Math.min(1, v / max)) : 0;
  return (
    <div className={'bar ' + (small ? 'small' : '')} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemax={Math.round(max)} aria-label={label}>
      <span className="bar-fill" style={{ width: `${p * 100}%`, background: color }} />
      <span className="bar-text">{children != null ? children : `${label ? label + ' ' : ''}${fmt(v)} / ${fmt(max)}`}</span>
    </div>
  );
}

export function Modal({ title, onClose, children, wide, className, closeLabel = 'Close' }) {
  useEffect(() => {
    if (!onClose) return undefined;
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={title}>
      <div className={'modal panel ' + (wide ? 'wide ' : '') + (className || '')}>
        <div className="modal-head">
          <h2>{title}</h2>
          {onClose && <button type="button" className="icon-btn" onClick={onClose} aria-label={closeLabel}><Icon name="close" /></button>}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function MatChip({ id, n, have, q }) {
  const m = MATS[id]; if (!m) return null;
  const short = have != null && have < n;
  return (
    <span className={'chip ' + (short ? 'short' : '')} title={m.src}>
      <MatIcon id={id} size={20} q={q || 0} />
      <span>{n != null ? n + ' ' : ''}{m.name}{have != null ? <em> ({have})</em> : null}</span>
    </span>
  );
}
export function CostList({ s, cost, gold }) {
  return (
    <div className="chips">
      {gold ? <span className={'chip ' + (s.player.gold < gold ? 'short' : '')}><span className="coin" />{fmt(gold)} gold</span> : null}
      {Object.entries(cost || {}).map(([k, n]) => <MatChip key={k} id={k} n={n} have={matCount(s, k)} />)}
    </div>
  );
}

export function RarityName({ r }) { const R = RARITIES[r] || RARITIES[0]; return <span className="rarity" style={{ color: R.color }}>{R.name}</span>; }
export function GradeName({ g }) { const G = GRADES[g] || GRADES[0]; return <span className="grade" style={{ color: G.color }}>{G.name}</span>; }

export function statRows(st, cat) {
  const rows = [
    ['Attack', st.attack], ['Speed', st.speed], ['Critical', st.crit + '%'], ['Crit damage', '+' + st.critDmg + '%'], ['Guard', st.guard],
  ];
  if (st.arcana) rows.push(['Arcana', st.arcana]);
  if (st.pierce) rows.push(['Armor pierce', Math.round(st.pierce * 100) + '%']);
  if (st.elem && st.elem !== 'none') rows.push(['Element', ELEMENTS[st.elem].name]);
  if (st.status) rows.push(['Status chance', Math.round(st.status * 100) + '%']);
  if (st.lifesteal) rows.push(['Lifesteal', Math.round(st.lifesteal * 100) + '%']);
  if (st.bleed) rows.push(['Bleed chance', Math.round(st.bleed * 100) + '%']);
  return rows;
}
export function StatTable({ st, compare }) {
  const rows = statRows(st);
  const cmp = compare ? Object.fromEntries(statRows(compare).map((r) => [r[0], r[1]])) : null;
  const num = (v) => (typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')));
  return (
    <dl className="stat-table">
      {rows.map(([k, v]) => {
        let d = null;
        if (cmp && cmp[k] != null && k !== 'Element') {
          const dv = num(v) - num(cmp[k]);
          if (!Number.isNaN(dv) && dv !== 0) d = <span className={dv > 0 ? 'up' : 'down'}>{dv > 0 ? '+' : ''}{Math.round(dv)}</span>;
        }
        return <React.Fragment key={k}><dt>{k}</dt><dd>{v}{d}</dd></React.Fragment>;
      })}
    </dl>
  );
}
export function TraitList({ traits }) {
  if (!traits || !traits.length) return <p className="muted small">No special traits.</p>;
  return <ul className="traits">{traits.map((t) => <li key={t.id}><b>{TRAITS[t.id].name}</b> <span>{TRAITS[t.id].desc(t.v)}</span></li>)}</ul>;
}
export function WeaponCard({ it, equipped, onClick, compact, selected }) {
  const R = RARITIES[it.rarity];
  return (
    <button type="button" className={'wcard ' + (compact ? 'compact ' : '') + (selected ? 'selected ' : '')} style={{ '--rc': R.color }} onClick={onClick}>
      <div className="wcard-art"><WeaponArt item={it} size={compact ? 56 : 72} /></div>
      <div className="wcard-body">
        <div className="wcard-name">{it.name}</div>
        <div className="wcard-sub"><RarityName r={it.rarity} /> · {CATEGORIES[it.cat].name}</div>
        <div className="wcard-stats"><span>ATK {it.stats.attack}</span>{it.stats.arcana > 4 && <span>ARC {it.stats.arcana}</span>}<span>{GRADES[it.grade].name.split(' ')[0]}</span></div>
      </div>
      <div className="wcard-flags">{equipped && <span className="tag gold">Equipped</span>}{it.locked && <Icon name="lock" size={14} />}{it.fav && <span className="fav">★</span>}</div>
    </button>
  );
}
export function weaponBreakdown(it) {
  const bp = BLUEPRINTS[it.bp]; const m = MATS[it.mat];
  const lines = [
    [`Blueprint: ${bp.name}`, `Tier ${bp.tier} structure. Sets the base power multiplier ×${bp.base.power}, speed ${bp.base.speed}, crit ${bp.base.crit}%.`],
    [`Material: ${QUALITY[it.q]} ${m.name}`, `Material strength ${m.power}${it.q ? ` (+${it.q * 5}% from quality)` : ''}.${m.elem ? ` Natural ${ELEMENTS[m.elem].name} affinity.` : ''}`],
  ];
  for (const c of it.comps) lines.push([`Component: ${COMPONENTS[c].name}`, COMPONENTS[c].desc]);
  if (it.ench) lines.push([`Enchantment: ${ENCHANTS[it.ench].name}`, `${ENCHANTS[it.ench].desc} Potency ${Math.round((it.stats.potency || 0) * 100)}% from your rune work.`]);
  lines.push([`Craftsmanship: ${GRADES[it.grade].name} (${it.score})`, `Your forging performance scales power by ×${(0.75 + 0.5 * it.score / 100).toFixed(2)}.`]);
  return lines;
}
export function Section({ title, children, right, className }) {
  return (
    <section className={'section ' + (className || '')}>
      {(title || right) && <div className="section-head"><h3>{title}</h3>{right}</div>}
      {children}
    </section>
  );
}
export function Empty({ children }) { return <div className="empty">{children}</div>; }
