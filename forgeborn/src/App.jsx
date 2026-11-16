// FORGEBORN — application shell: navigation, header, toasts, effects, autosave.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { QUESTS } from './data.js';
import * as G from './engine.js';
import { StoreCtx, NavCtx, useGame, Modal, Bar } from './ui.jsx';
import { Icon } from './art.jsx';
import WorldScreen from './screens/world.jsx';
import ForgeScreen from './screens/forge.jsx';
import BattleScreen from './screens/battle.jsx';
import { InventoryScreen, CharacterScreen, UpgradesScreen, CodexScreen, QuestsScreen, LegacyScreen, SettingsScreen } from './screens/others.jsx';
import { setSound, sfx } from './sfx.js';

const TABS = [
  { id: 'world', name: 'World', icon: 'world', primary: true },
  { id: 'forge', name: 'Forge', icon: 'forge', primary: true },
  { id: 'battle', name: 'Battle', icon: 'battle', primary: true },
  { id: 'bag', name: 'Inventory', short: 'Bag', icon: 'bag', primary: true },
  { id: 'hero', name: 'Character', short: 'Hero', icon: 'hero' },
  { id: 'upgrades', name: 'Upgrades', icon: 'upgrade' },
  { id: 'quests', name: 'Quests', icon: 'quest' },
  { id: 'codex', name: 'Codex', icon: 'codex' },
  { id: 'legacy', name: 'Legacy', icon: 'legacy' },
  { id: 'settings', name: 'Settings', icon: 'gear' },
];

function Toasts({ store }) {
  const [, force] = useState(0);
  useEffect(() => store.subscribe(() => force((n) => n + 1)), [store]);
  useEffect(() => {
    const t = setInterval(() => { const now = Date.now(); const before = store.toasts.length; store.toasts = store.toasts.filter((x) => now - x.t < 4200); if (store.toasts.length !== before) force((n) => n + 1); }, 400);
    return () => clearInterval(t);
  }, [store]);
  return <div className="toasts" aria-live="polite">{store.toasts.map((t) => <div key={t.id} className={'toast ' + t.kind}>{t.text}</div>)}</div>;
}
function Bursts({ store, reduced }) {
  const [list, setList] = useState([]);
  useEffect(() => store.subscribe(() => {
    if (!store.fx.length) return;
    const add = store.fx.splice(0);
    for (const f of add) { if (f.kind === 'level') sfx.level(); }
    if (reduced) return;
    setList((l) => [...l, ...add].slice(-4));
    for (const f of add) setTimeout(() => setList((l) => l.filter((x) => x.id !== f.id)), 1600);
  }), [store, reduced]);
  return <div className="bursts" aria-hidden="true">{list.map((b) => <div key={b.id} className={'burst ' + b.kind}>{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--a': `${i * 20}deg`, '--d': `${(i % 3) * 0.06}s` }} />)}</div>)}</div>;
}
function Embers() {
  return <div className="embers" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.83) % 9}s`, animationDuration: `${8 + (i % 5) * 2}s` }} />)}</div>;
}

function Welcome({ onClose }) {
  return (
    <Modal title="Welcome to Hearthstone Forge" onClose={onClose}>
      <p className="lead">Your grandmother's forge is cold, and the valley needs a smith.</p>
      <ol className="welcome-steps">
        <li><b>Explore</b> the World map to find ore deposits, plants, secrets and trouble.</li>
        <li><b>Gather</b> by mining deposits and foraging. Precise strikes give better ore.</li>
        <li><b>Forge</b> weapons from a blueprint, a metal, components and enchantments. Every stage is a hands-on challenge, and your performance sets the craftsmanship.</li>
        <li><b>Fight</b> in turn-based battles where your weapon decides your skills.</li>
        <li><b>Upgrade</b> your forge, tools and talents to reach new regions and materials.</li>
      </ol>
      <p className="muted small">Start by forging an Arming Sword or Iron Dirk from the iron you have. Your progress saves automatically in this browser.</p>
      <button type="button" className="btn primary big full" onClick={onClose}>Light the forge</button>
    </Modal>
  );
}

function Shell({ store }) {
  const [s] = useGame();
  const [tab, setTab] = useState(() => (s.battle ? 'battle' : s.tutorial ? 'forge' : 'world'));
  const [more, setMore] = useState(false);
  const [rekindled, setRekindled] = useState(null);
  const [mq, setMq] = useState(false);
  useEffect(() => { try { const m = window.matchMedia('(prefers-reduced-motion: reduce)'); setMq(m.matches); const f = (e) => setMq(e.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); } catch (e) { return undefined; } }, []);
  useEffect(() => { setSound(s.settings.sound); }, [s.settings.sound]);
  const reduced = s.settings.reducedMotion || mq;
  const nav = useMemo(() => ({ go: (t) => { setTab(t); setMore(false); try { window.scrollTo(0, 0); } catch (e) { /* ignore */ } } }), []);
  const P = G.playerStats(s);
  const claimable = QUESTS.filter((q) => s.quests[q.id] && s.quests[q.id].done && !s.quests[q.id].claimed).length;
  const nextMain = QUESTS.find((q) => q.main && !(s.quests[q.id] && s.quests[q.id].claimed));
  const inBattle = s.battle && !s.battle.over;
  const saveNow = () => { const ok = G.saveGame(store.s, true); store.dirty = false; store.emit(); return ok; };
  const onImport = (st) => { store.replace(st); G.saveGame(store.s, true); nav.go('world'); };
  const onReset = () => { G.wipeSave(); const n = G.newGame(); store.replace(n); G.saveGame(store.s, true); nav.go('forge'); };
  const onRekindle = () => { const { state, gained } = G.rekindle(store.s); store.replace(state); G.saveGame(store.s, true); setRekindled(gained); nav.go('forge'); };
  const badge = (id) => (id === 'battle' && inBattle ? '!' : id === 'quests' && claimable ? claimable : id === 'hero' && s.player.tp ? s.player.tp : null);
  const screen = {
    world: <WorldScreen />, forge: <ForgeScreen />, battle: <BattleScreen />, bag: <InventoryScreen />, hero: <CharacterScreen />, upgrades: <UpgradesScreen />,
    codex: <CodexScreen />, quests: <QuestsScreen />, legacy: <LegacyScreen onRekindle={onRekindle} />, settings: <SettingsScreen onImport={onImport} onReset={onReset} saveNow={saveNow} />,
  }[tab];
  return (
    <NavCtx.Provider value={nav}>
      <div className={'app ' + (reduced ? 'rm ' : '') + (s.settings.starlit ? 'starlit ' : '')}>
        <Embers />
        <header className="topbar">
          <div className="brand"><span className="brand-mark" aria-hidden="true" /><div><div className="brand-name">Forgeborn</div><div className="brand-sub">Legacy of the Forge</div></div></div>
          <div className="top-stats">
            <span className="ts" title="Character level"><Icon name="hero" size={16} /> Lv {s.player.level}</span>
            <span className="ts" title="Blacksmith mastery"><Icon name="forge" size={16} /> {s.smith.level}</span>
            <span className="ts gold-text" title="Gold"><span className="coin" /> {G.fmt(s.player.gold)}</span>
            <span className="ts hp" title="Health"><Bar v={inBattle ? s.battle.p.hp : s.player.hp} max={P.maxHp} color="var(--hp)" small>HP {Math.round(inBattle ? s.battle.p.hp : s.player.hp)}</Bar></span>
          </div>
          <nav className="topnav" aria-label="Main">
            {TABS.map((t) => <button type="button" key={t.id} className={'nav-btn ' + (tab === t.id ? 'on' : '')} onClick={() => nav.go(t.id)} aria-current={tab === t.id ? 'page' : undefined}><Icon name={t.icon} size={18} /><span>{t.name}</span>{badge(t.id) != null && <em className="badge">{badge(t.id)}</em>}</button>)}
          </nav>
        </header>
        {G.storage.status === 'blocked' && <div className="notice bad">Browser storage is unavailable, so progress will not persist. Export your save from Settings to keep it.</div>}
        {G.storage.note && G.storage.status !== 'blocked' && <div className="notice">{G.storage.note}</div>}
        {nextMain && tab !== 'battle' && <button type="button" className="goal" onClick={() => nav.go('quests')}><Icon name="quest" size={16} /> <span><b>{nextMain.name}:</b> {nextMain.desc}</span></button>}
        <main className="main">{screen}</main>
        <nav className="bottomnav" aria-label="Main">
          {TABS.filter((t) => t.primary).map((t) => <button type="button" key={t.id} className={'bn ' + (tab === t.id ? 'on' : '')} onClick={() => nav.go(t.id)}><Icon name={t.icon} size={22} /><span>{t.short || t.name}</span>{badge(t.id) != null && <em className="badge">{badge(t.id)}</em>}</button>)}
          <button type="button" className={'bn ' + (!TABS.find((t) => t.id === tab).primary ? 'on' : '')} onClick={() => setMore(!more)}><Icon name="more" size={22} sw={3.4} /><span>More</span>{(claimable || s.player.tp) ? <em className="badge">•</em> : null}</button>
        </nav>
        {more && (
          <div className="more-sheet" onClick={() => setMore(false)}>
            <div className="more-panel panel" onClick={(e) => e.stopPropagation()}>
              {TABS.filter((t) => !t.primary).map((t) => <button type="button" key={t.id} className="more-btn" onClick={() => nav.go(t.id)}><Icon name={t.icon} size={24} /><span>{t.name}</span>{badge(t.id) != null && <em className="badge">{badge(t.id)}</em>}</button>)}
            </div>
          </div>
        )}
        <Toasts store={store} />
        <Bursts store={store} reduced={reduced} />
        {s.tutorial === 1 && <Welcome onClose={() => store.mutate((d) => { d.tutorial = 0; })} />}
        {rekindled != null && <Modal title="The forge burns anew" onClose={() => setRekindled(null)}><p>You gained <b className="gold-text">{rekindled} Legacy Points</b>. Spend them in the Legacy tab. A new life begins at Hearthstone Forge.</p><button type="button" className="btn primary" onClick={() => { setRekindled(null); nav.go('legacy'); }}>Spend Legacy Points</button></Modal>}
      </div>
    </NavCtx.Provider>
  );
}

export default function App({ store }) {
  const timer = useRef(null);
  useEffect(() => {
    const unsub = store.subscribe(() => {
      if (!store.dirty) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { if (store.dirty) { G.saveGame(store.s); store.dirty = false; } }, 700);
    });
    const flush = () => { if (store.dirty) { G.saveGame(store.s); store.dirty = false; } };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
    return () => { unsub(); window.removeEventListener('pagehide', flush); };
  }, [store]);
  return <StoreCtx.Provider value={store}><Shell store={store} /></StoreCtx.Provider>;
}
