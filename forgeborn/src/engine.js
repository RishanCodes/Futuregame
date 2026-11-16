// FORGEBORN — game state, persistence and core rules (pure-ish functions that mutate a draft).
import {
  MATS, QUALITY, QUALITY_BONUS, RARITIES, GRADES, ELEMENTS, BLUEPRINTS, TIER_MULT, COMPONENTS, ENCHANTS, TRAITS,
  REGIONS, LOCATIONS, ENEMIES, EVENTS, QUESTS, TALENTS, SMITH_UNLOCKS, SKILLS, MASTERY_PASSIVES, FORGE_UPGRADES,
  PICKAXES, SICKLES, LENSES, SMELT, CONSUMABLES, ACHIEVEMENTS, LEGACY_PERKS, CATEGORIES,
} from './data.js';

export const SAVE_VERSION = 1;
const KEY = 'forgeborn.save';
const BAK = 'forgeborn.save.backup';

// ---------- small utils ----------
export const rnd = Math.random;
export const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const fmt = (n) => (n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k' : Math.round(n).toLocaleString('en-US'));
export function weighted(list) {
  const tot = list.reduce((a, x) => a + x[1], 0);
  let r = rnd() * tot;
  for (const x of list) { r -= x[1]; if (r <= 0) return x[0]; }
  return list[list.length - 1][0];
}
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

// Symmetric location links.
export const LINKS = (() => {
  const m = {};
  for (const id in LOCATIONS) m[id] = new Set(LOCATIONS[id].links || []);
  for (const id in LOCATIONS) for (const l of LOCATIONS[id].links || []) if (m[l]) m[l].add(id);
  const out = {};
  for (const id in m) out[id] = [...m[id]];
  return out;
})();

// ---------- new game ----------
export function newGame(legacy) {
  const lg = legacy || { lp: 0, spent: 0, perks: {}, count: 0, hall: [], everBosses: {}, codex: null, records: null, achievements: {}, stats: null };
  const s = {
    v: SAVE_VERSION, created: Date.now(), saved: 0,
    player: { name: 'Smith', level: 1, xp: 0, gold: 40, hp: null, tp: 0, talents: {}, respecs: 0, loc: 'hearth', blessing: 0 },
    smith: { level: 1, xp: 0 },
    mastery: Object.fromEntries(Object.keys(CATEGORIES).map((c) => [c, { lvl: 0, xp: 0 }])),
    mats: {}, items: [], equipped: null, consumables: { tonic: 3, draught: 1 },
    blueprints: Object.keys(BLUEPRINTS).filter((b) => BLUEPRINTS[b].start), enchants: [],
    world: { regions: ['emberfall'], seen: {}, progress: {}, deposits: {}, cleared: {} },
    quests: {}, bosses: {}, upgrades: {}, tools: { pick: 0, sickle: 0, lens: 0 },
    achievements: lg.achievements || {},
    stats: Object.assign({ crafted: 0, perfects: 0, mined: 0, pockets: 0, wins: 0, losses: 0, forages: 0, smelted: 0, enchanted: 0, salvaged: 0, bestGrade: -1, bestRarity: -1, maxHit: 0, flawless: 0, fullyExplored: 0, explores: 0 }, lg.stats ? { ...lg.stats, fullyExplored: 0 } : {}),
    codex: lg.codex || { mats: {}, enemies: {}, bps: {}, locs: {} },
    records: lg.records || { best: {}, history: [] },
    legacy: { lp: lg.lp, spent: lg.spent, perks: lg.perks, count: lg.count, hall: lg.hall, everBosses: lg.everBosses },
    settings: { reducedMotion: false, combatTiming: true, relaxed: false, sound: true, trial: false, confirmSalvage: true },
    battle: null, log: [], tutorial: 1,
  };
  for (const id in LOCATIONS) { if (LOCATIONS[id].start) s.world.seen[id] = true; }
  // starting kit
  addMat(s, 'iron', 6); addMat(s, 'coal', 4); addMat(s, 'oakwood', 3); addMat(s, 'leather', 2); addMat(s, 'copper', 2);
  const P = lg.perks || {};
  if (P.satchel) { addMat(s, 'iron', 10 * P.satchel); addMat(s, 'coal', 10 * P.satchel); addMat(s, 'oakwood', 10 * P.satchel); s.player.gold += 40 * P.satchel; }
  if (P.wanderer) { for (const id in LOCATIONS) if (LOCATIONS[id].region === 'emberfall' && LOCATIONS[id].type !== 'boss') s.world.seen[id] = true; s.tools.pick = 1; }
  if (P.memory) { s.upgrades.refinery = 1; s.upgrades.workbench = 1; s.enchants.push('ember'); }
  if (P.phoenix) s.blueprints.push('phoenix');
  if (P.starlit) s.settings.starlit = true;
  if (lg.count > 0) s.tutorial = 0;
  s.player.hp = playerStats(s).maxHp;
  return s;
}

// ---------- persistence ----------
export const storage = { status: 'unknown', note: '' };

function lsGet(k) { return window.localStorage.getItem(k); }
function lsSet(k, v) { window.localStorage.setItem(k, v); }

export function validate(obj) {
  if (!obj || typeof obj !== 'object') return 'Not a save object.';
  if (typeof obj.v !== 'number') return 'Missing version.';
  if (obj.v > SAVE_VERSION) return 'This save is from a newer version of the game.';
  if (!obj.player || !obj.mats || !Array.isArray(obj.items) || !obj.world) return 'Save is missing core data.';
  return null;
}
export function migrate(obj) {
  // Fill any fields added since the save was written, without discarding progress.
  const base = newGame();
  const fill = (dst, src) => { for (const k in src) { if (dst[k] === undefined) dst[k] = src[k]; else if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) fill(dst[k], src[k]); } };
  if (!obj.legacy) obj.legacy = base.legacy;
  for (const k of ['player', 'smith', 'mastery', 'world', 'tools', 'stats', 'codex', 'records', 'settings', 'legacy']) { if (!obj[k]) obj[k] = base[k]; else fill(obj[k], base[k]); }
  for (const k of ['quests', 'bosses', 'upgrades', 'achievements', 'consumables']) if (!obj[k]) obj[k] = {};
  if (!obj.blueprints) obj.blueprints = base.blueprints;
  if (!obj.enchants) obj.enchants = [];
  obj.items = obj.items.filter((it) => it && BLUEPRINTS[it.bp] && MATS[it.mat]);
  if (obj.equipped && !obj.items.find((i) => i.uid === obj.equipped)) obj.equipped = null;
  if (!LOCATIONS[obj.player.loc]) obj.player.loc = 'hearth';
  if (obj.battle && (!obj.battle.e || !ENEMIES[obj.battle.enemyId])) obj.battle = null;
  obj.v = SAVE_VERSION;
  return obj;
}

export function loadGame(hotData) {
  if (hotData && hotData.state && !validate(hotData.state)) { storage.status = hotData.storage || 'ok'; return migrate(hotData.state); }
  let raw = null;
  try { raw = lsGet(KEY); storage.status = 'ok'; } catch (e) {
    storage.status = 'blocked';
    storage.note = 'Browser storage is unavailable here, so progress cannot be saved automatically. Use Settings → Export to keep a copy.';
    return newGame();
  }
  if (!raw) { storage.note = ''; return newGame(); }
  try {
    const obj = JSON.parse(raw);
    const err = validate(obj);
    if (err) throw new Error(err);
    return migrate(obj);
  } catch (e) {
    // Keep the unreadable save, try the backup.
    try { lsSet('forgeborn.save.corrupt', raw); } catch (_) { /* ignore */ }
    try {
      const b = lsGet(BAK);
      if (b) { const obj = JSON.parse(b); if (!validate(obj)) { storage.note = 'Your latest save could not be read, so the backup copy was loaded. The unreadable save was kept as "forgeborn.save.corrupt".'; return migrate(obj); } }
    } catch (_) { /* fall through */ }
    storage.note = 'Your save could not be read (' + e.message + '). A new game was started; the old data was kept as "forgeborn.save.corrupt".';
    return newGame();
  }
}

let lastBackup = 0;
export function saveGame(s, manual) {
  if (storage.status === 'blocked') return false;
  try {
    const copy = { ...s, saved: Date.now() };
    const json = JSON.stringify(copy);
    const now = Date.now();
    if (manual || now - lastBackup > 180000) {
      const prev = lsGet(KEY);
      if (prev) lsSet(BAK, prev);
      lastBackup = now;
    }
    lsSet(KEY, json);
    s.saved = copy.saved;
    return true;
  } catch (e) {
    storage.note = 'Saving failed (' + (e && e.name) + '). Storage may be full or blocked. Export your save from Settings.';
    return false;
  }
}
export function exportSave(s) {
  const json = JSON.stringify(s);
  return 'FGB1:' + btoa(unescape(encodeURIComponent(json)));
}
export function importSave(text) {
  const t = (text || '').trim();
  let json = t;
  if (t.startsWith('FGB1:')) json = decodeURIComponent(escape(atob(t.slice(5))));
  const obj = JSON.parse(json);
  const err = validate(obj);
  if (err) throw new Error(err);
  return migrate(obj);
}
export function wipeSave() { try { window.localStorage.removeItem(KEY); window.localStorage.removeItem(BAK); } catch (_) { /* ignore */ } }

// ---------- store ----------
export function createStore(initial) {
  const listeners = new Set();
  const store = {
    s: initial, toasts: [], fx: [],
    get() { return store.s; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit() { for (const l of listeners) l(); },
    mutate(fn) {
      const d = structuredClone(store.s);
      const out = fn(d, store);
      checkProgress(d, store);
      store.s = d;
      store.emit();
      store.dirty = true;
      return out;
    },
    replace(s) { store.s = s; store.emit(); store.dirty = true; },
    toast(text, kind = 'info', icon) { store.toasts.push({ id: uid(), text, kind, icon, t: Date.now() }); if (store.toasts.length > 6) store.toasts.shift(); },
    burst(kind) { store.fx.push({ id: uid(), kind }); },
  };
  return store;
}

// ---------- materials ----------
export function matCount(s, id) { const a = s.mats[id]; return a ? a[0] + a[1] + a[2] : 0; }
export function matQ(s, id, q) { const a = s.mats[id]; return a ? a[q] : 0; }
export function addMat(s, id, n, q = 0, st) {
  if (!MATS[id] || n <= 0) return;
  if (!s.mats[id]) s.mats[id] = [0, 0, 0];
  s.mats[id][q] += n;
  if (s.codex && !s.codex.mats[id]) { s.codex.mats[id] = 1; if (st) st.toast('New material discovered: ' + MATS[id].name, 'discover'); }
}
// Spend lowest quality first. Returns list of [id,q,n] actually spent.
export function spendMat(s, id, n) {
  const a = s.mats[id]; const spent = [];
  if (!a) return spent;
  for (let q = 0; q < 3 && n > 0; q++) { const t = Math.min(a[q], n); if (t > 0) { a[q] -= t; n -= t; spent.push([id, q, t]); } }
  return spent;
}
export function hasMats(s, cost) { for (const id in cost || {}) if (matCount(s, id) < cost[id]) return false; return true; }
export function missingMats(s, cost) {
  const out = [];
  for (const id in cost || {}) { const have = matCount(s, id); if (have < cost[id]) out.push({ id, need: cost[id], have }); }
  return out;
}
export function canAfford(s, c) { return (!c.gold || s.player.gold >= c.gold) && hasMats(s, c.mats || {}); }
export function payCost(s, c) { if (c.gold) s.player.gold -= c.gold; for (const id in c.mats || {}) spendMat(s, id, c.mats[id]); }
export function matValue(id) { const m = MATS[id]; const t = m.tier || 1; return Math.round(2 * t * t + (m.kind === 'boss' ? 40 * t : 0) + (m.kind === 'gem' ? 6 * t : 0)); }

export function goldGain(s, n) {
  const mult = (1 + 0.15 * (s.legacy.perks.favor || 0)) * (1 + 0.05 * s.legacy.count);
  const g = Math.round(n * mult);
  s.player.gold += g;
  return g;
}

// ---------- progression ----------
export const xpToNext = (lvl) => Math.round(25 * Math.pow(lvl, 1.5));
export const smithXpToNext = (lvl) => Math.round(60 * Math.pow(lvl, 1.45));
export const masteryXpToNext = (lvl) => Math.round(40 * Math.pow(lvl + 1, 1.6));

export function gainXP(s, n, st) {
  n = Math.round(n * (1 + 0.05 * s.legacy.count));
  s.player.xp += n;
  let up = false;
  while (s.player.xp >= xpToNext(s.player.level) && s.player.level < 60) {
    s.player.xp -= xpToNext(s.player.level); s.player.level++; s.player.tp++; up = true;
  }
  if (up && st) { st.toast(`Level up! You are now level ${s.player.level}. +1 talent point.`, 'level'); st.burst('level'); s.player.hp = playerStats(s).maxHp; }
  return n;
}
export function gainSmithXP(s, n, st) {
  s.smith.xp += Math.round(n);
  while (s.smith.xp >= smithXpToNext(s.smith.level) && s.smith.level < 30) {
    s.smith.xp -= smithXpToNext(s.smith.level); s.smith.level++;
    const u = SMITH_UNLOCKS.find((x) => x.lvl === s.smith.level);
    if (st) st.toast(`Blacksmith mastery ${s.smith.level}!` + (u ? ' Unlocked: ' + u.text : ''), 'level');
  }
}
export function gainMastery(s, cat, n, st) {
  const m = s.mastery[cat]; if (!m) return;
  m.xp += Math.round(n);
  while (m.xp >= masteryXpToNext(m.lvl) && m.lvl < 10) {
    m.xp -= masteryXpToNext(m.lvl); m.lvl++;
    if (st) {
      const sk = SKILLS[cat].find((x) => x.lvl === m.lvl);
      const pa = MASTERY_PASSIVES[cat].find((x) => x[0] === m.lvl);
      st.toast(`${CATEGORIES[cat].name} mastery ${m.lvl}!` + (sk ? ` New skill: ${sk.name}.` : '') + (pa ? ` ${pa[1]}` : ''), 'level');
    }
  }
}
export const tal = (s, id) => s.player.talents[id] || 0;
export const upg = (s, id) => s.upgrades[id] || 0;
export const masteryLvl = (s, cat) => (s.mastery[cat] ? s.mastery[cat].lvl : 0);
export const hasPassive = (s, cat, lvl) => masteryLvl(s, cat) >= lvl;

export function smithSlots(s) {
  const L = s.smith.level;
  let n = L >= 8 ? 4 : L >= 6 ? 3 : L >= 3 ? 2 : 1;
  if (upg(s, 'crucible')) n++;
  return Math.min(4, n);
}
export function treePoints(s, tree) { let n = 0; for (const id in s.player.talents) if (TALENTS[id] && TALENTS[id].tree === tree) n += s.player.talents[id]; return n; }
export function canLearn(s, id) {
  const t = TALENTS[id];
  if (s.player.tp <= 0 || tal(s, id) >= t.max) return false;
  const pts = treePoints(s, t.tree);
  if (t.need && pts < t.need) return false;
  if (t.row > 0 && pts < t.row * 2) return false;
  return true;
}
export function respecCost(s) { return s.player.respecs === 0 ? 0 : 50 * s.player.respecs * s.player.level; }

// ---------- weapons ----------
export function getItem(s, id) { return s.items.find((i) => i.uid === id); }
export function equippedWeapon(s) { return s.equipped ? getItem(s, s.equipped) : null; }

export function gradeFor(score) { let g = GRADES[0]; GRADES.forEach((x, i) => { if (score >= x.min) g = { ...x, idx: i }; }); if (g.idx === undefined) g = { ...GRADES[0], idx: 0 }; return g; }

// Weapon power per stat. Material strength and craftsmanship are separate multipliers.
export function weaponStats(spec, score, opts = {}) {
  const bp = BLUEPRINTS[spec.bp]; const m = MATS[spec.mat];
  const q = spec.q || 0; const comps = (spec.comps || []).map((c) => COMPONENTS[c]).filter(Boolean);
  const ench = spec.ench ? ENCHANTS[spec.ench] : null;
  const craftM = 0.75 + 0.5 * clamp(score, 0, 100) / 100;
  const qB = QUALITY_BONUS[q];
  const rarity = RARITIES[opts.rarity || 0];
  const traits = opts.traits || [];
  const tsum = (stat) => traits.filter((t) => TRAITS[t.id].stat === stat).reduce((a, t) => a + t.v, 0);
  const csum = (k) => comps.reduce((a, c) => a + (c.mods[k] || 0), 0);
  const temper = opts.temper && score >= 55 ? opts.temper * 0.03 : 0;
  const pmult = (1 + csum('mult') + tsum('mult') / 100 + temper) * rarity.mult;
  const power = m.power * bp.base.power * TIER_MULT[bp.tier] * craftM * (1 + qB) * pmult;
  const runesScore = opts.runes != null ? opts.runes : score;
  const potency = ench ? (0.6 + 0.6 * runesScore / 100) * (1 + comps.reduce((a, c) => a + (c.ench || 0), 0) + 0.1 * (opts.runescholar || 0)) : 0;
  const elem = bp.fixedElem || (ench && ench.elem) || (comps.find((c) => c.elem) || {}).elem || m.elem || 'none';
  const baseStatus = ench ? ench.chance * potency : elem !== 'none' ? 0.1 : 0;
  const st = {
    attack: Math.max(1, Math.round(power * 2.2)),
    speed: Math.round(bp.base.speed + (m.speed || 0) + csum('speed') + tsum('speed')),
    crit: Math.round(bp.base.crit + (m.crit || 0) + csum('crit') + tsum('crit')),
    critDmg: 50 + tsum('critDmg'),
    guard: Math.round((bp.base.guard + (m.guard || 0) + csum('guard')) * (0.85 + 0.3 * score / 100) * (1 + 0.25 * (TIER_MULT[bp.tier] - 1) * 4) + tsum('guard')),
    arcana: Math.round(m.power * (bp.base.arcana || 0) * TIER_MULT[bp.tier] * craftM * (1 + qB) * rarity.mult + (m.arcana || 0) + csum('arcana') + tsum('arcana')),
    pierce: Math.min(0.7, (bp.base.pierce || 0) + (m.pierce || 0) + csum('pierce') + (ench && ench.pierce ? ench.pierce : 0) + tsum('pierce') / 100),
    elem,
    status: Math.min(0.75, baseStatus + comps.reduce((a, c) => a + (c.status || 0), 0) + tsum('status') / 100),
    elemBonus: ench ? ench.bonus * potency : elem !== 'none' ? 0.03 : 0,
    lifesteal: (ench && ench.lifesteal ? ench.lifesteal * potency : 0) + comps.reduce((a, c) => a + (c.lifesteal || 0), 0) + tsum('lifesteal') / 100,
    bleed: comps.reduce((a, c) => a + (c.bleed || 0), 0),
    sunder: tsum('sunder') / 100, stagger: tsum('stagger') / 100, beast: tsum('beast') / 100, barrier: tsum('barrier'),
    rebirth: traits.some((t) => t.id === 'rebirth'), parry: comps.reduce((a, c) => a + (c.parry || 0), 0),
    potency,
  };
  return st;
}

export function rarityFor(spec, score, roll) {
  const bp = BLUEPRINTS[spec.bp]; const m = MATS[spec.mat];
  const comps = (spec.comps || []).map((c) => COMPONENTS[c]);
  const ench = spec.ench ? ENCHANTS[spec.ench] : null;
  const g = gradeFor(score).idx;
  const bossComp = comps.some((c) => Object.keys(c.cost).some((k) => MATS[k].kind === 'boss')) ? 0.6 : 0;
  const pts = (m.tier - 1) * 1.2 + (bp.tier - 1) * 0.5 + comps.length * 0.35 + (ench ? 0.5 + ench.tier * 0.3 : 0) + g * 0.35 + QUALITY_BONUS[spec.q || 0] * 3 + roll * 1.2 + bossComp + (bp.legacy ? 0.8 : 0);
  const th = [1.4, 2.8, 4.4, 6.2, 8.0, 9.6];
  let r = 0; while (r < th.length && pts >= th[r]) r++;
  return r;
}

const NAME_A = {
  fire: ['Ember', 'Ashen', 'Cinder', 'Blaze', 'Pyre', 'Scorch'], frost: ['Rime', 'Frost', 'Winter', 'Glacier', 'Hoar'], storm: ['Storm', 'Thunder', 'Static', 'Tempest', 'Volt'],
  venom: ['Venom', 'Thorn', 'Blight', 'Viper'], blood: ['Blood', 'Crimson', 'Red', 'Sanguine'], void: ['Void', 'Hollow', 'Night', 'Umbral', 'Gloom'], light: ['Dawn', 'Radiant', 'Sun', 'Halo'], astral: ['Star', 'Moon', 'Astral', 'Comet', 'Nova'],
};
const NAME_M = { iron: ['Iron', 'Grey', 'Hearth'], copper: ['Copper', 'Bright', 'Russet'], silver: ['Silver', 'Moon', 'Pale'], steel: ['Steel', 'True', 'Tempered'], silversteel: ['Silver', 'Pale', 'Gleam'], emberstone: ['Ember', 'Magma'], frostglass: ['Frost', 'Glass'], stormite: ['Storm', 'Thunder'], mithril: ['Mithril', 'Elven', 'Feather'], voidore: ['Void', 'Shade'], dragonbone: ['Wyrm', 'Dragon', 'Bone'], astral: ['Star', 'Astral'], celestial: ['Celestial', 'Heaven'], starforged: ['Starforged', 'Eternal', 'Crown'] };
const NAME_COMPOUND = { fire: ['heart', 'fall', 'brand', 'born'], frost: ['bite', 'fall', 'bound', 'song'], storm: ['call', 'born', 'crown', 'break'], venom: ['kiss', 'weave', 'root'], blood: ['thirst', 'oath', 'song'], void: ['fall', 'veil', 'reach'], light: ['break', 'fire', 'song'], astral: ['fall', 'woven', 'song', 'light'], none: ['forged', 'bound', 'true', 'hold'] };
const NOUN = { sword: ['Edge', 'Blade', 'Fang', 'Brand', 'Oath'], dagger: ['Fang', 'Sting', 'Whisper', 'Kiss', 'Needle'], greatsword: ['Cleaver', 'Reaver', 'Ruin', 'Greatblade'], spear: ['Piercer', 'Lance', 'Spire', 'Talon'], hammer: ['Breaker', 'Maul', 'Crusher', 'Anvil'], staff: ['Staff', 'Rod', 'Scepter', 'Branch', 'Wand'] };
const OF = { fire: ['Embers', 'the Pyre', 'Ash'], frost: ['Winter', 'the Glacier', 'Rime'], storm: ['Thunder', 'the Tempest', 'Storms'], venom: ['Thorns', 'the Viper'], blood: ['the Hunt', 'Red Oaths'], void: ['the Void', 'Nightfall'], light: ['Dawn', 'the Sun'], astral: ['the Stars', 'Falling Stars', 'Heaven'], none: ['the Valley', 'the Forge', 'Iron Will', 'the Mountain'] };
const TITLE = { sword: 'Crown', dagger: 'Whisper', greatsword: 'Ruin', spear: 'Spire', hammer: 'Hammer', staff: 'Scepter' };

export function weaponName(spec, rarity, elem, existing) {
  const bp = BLUEPRINTS[spec.bp]; const cat = bp.cat;
  for (let tries = 0; tries < 8; tries++) {
    let n;
    const A = elem !== 'none' ? pick(NAME_A[elem]) : pick(NAME_M[spec.mat] || ['Iron']);
    if (rarity <= 0) n = `${MATS[spec.mat].name.replace(/ (Ore|Ingot)$/, '')} ${bp.name}`;
    else if (rarity <= 2) n = A + pick(NOUN[cat]).toLowerCase();
    else {
      const k = rnd();
      if (k < 0.4) n = A + pick(NAME_COMPOUND[elem] || NAME_COMPOUND.none) + ' ' + pick(NOUN[cat]);
      else if (k < 0.7) n = pick(NOUN[cat]) + ' of ' + pick(OF[elem] || OF.none);
      else n = (rarity >= 5 ? TITLE[cat] : A + pick(NAME_COMPOUND[elem] || NAME_COMPOUND.none)) + ' of ' + pick(OF[elem] || OF.none);
    }
    if (!existing.has(n)) return n;
  }
  return `${pick(NAME_A[elem] || ['Hearth'])} ${pick(NOUN[cat])} ${['II', 'III', 'IV', 'V'][ri(0, 3)]}`;
}

function rollTraits(spec, score, rarityIdx, s, trial) {
  const bp = BLUEPRINTS[spec.bp]; const cat = bp.cat; const grade = gradeFor(score);
  let n = RARITIES[rarityIdx].traits;
  if (tal(s, 'legendtouch') && grade.idx >= 4) n++;
  if (trial && rnd() < 0.5) n++;
  const pref = { sword: ['keen', 'balanced', 'tempered', 'vampiric'], dagger: ['keen', 'brutal', 'balanced', 'catalyst'], greatsword: ['brutal', 'staggering', 'sundering', 'tempered'], spear: ['piercing', 'keen', 'hunter', 'sundering'], hammer: ['staggering', 'sundering', 'tempered', 'warding'], staff: ['resonant', 'catalyst', 'warding', 'vampiric'] }[cat];
  const pool = Object.keys(TRAITS).filter((t) => !TRAITS[t].fixed && (!TRAITS[t].needGrade || grade.idx >= 4));
  const out = [];
  if (bp.legacy) out.push({ id: 'rebirth', v: 1 });
  const used = new Set(out.map((t) => t.id));
  for (let i = 0; i < n; i++) {
    const cand = (rnd() < 0.6 ? pref : pool).filter((t) => !used.has(t) && pool.includes(t));
    if (!cand.length) break;
    const id = pick(cand); used.add(id);
    const T = TRAITS[id];
    const v = Math.round(T.min + (T.max - T.min) * (0.25 + 0.75 * score / 100) * (0.85 + rnd() * 0.3));
    out.push({ id, v: clamp(v, T.min, T.max) });
  }
  return out;
}

// Forge validation: returns list of problems with hints.
export function forgeProblems(s, spec) {
  const out = [];
  const bp = BLUEPRINTS[spec.bp]; if (!bp) return ['Choose a blueprint.'];
  const m = MATS[spec.mat];
  if (!m) { out.push('Choose a primary material.'); return out; }
  if (m.tier >= 3 && upg(s, 'furnace') < 1) out.push('Tier 3+ materials need the Advanced Furnace (Upgrades).');
  if (m.tier >= 4 && upg(s, 'furnace') < 2) out.push('Tier 4+ materials need Advanced Furnace level 2.');
  if (m.tier >= 5 && (!upg(s, 'crucible') || s.smith.level < 12)) out.push('Tier 5 materials need the Legendary Crucible and Blacksmith mastery 12.');
  if (bp.crucible && !upg(s, 'crucible')) out.push('This blueprint needs the Legendary Crucible.');
  if (bp.anvil && upg(s, 'anvil') < bp.anvil) out.push(`This blueprint needs Reinforced Anvil level ${bp.anvil}.`);
  const cost = forgeCost(s, spec);
  if ((s.mats[spec.mat] || [0, 0, 0])[spec.q || 0] < cost.primary) out.push(`Need ${cost.primary} ${QUALITY[spec.q || 0]} ${m.name} (have ${(s.mats[spec.mat] || [0, 0, 0])[spec.q || 0]}). ${m.src || ''}`);
  for (const x of missingMats(s, cost.other)) out.push(`Need ${x.need} ${MATS[x.id].name} (have ${x.have}). ${MATS[x.id].src || ''}`);
  if (spec.ench) {
    const e = ENCHANTS[spec.ench];
    if (!upg(s, 'workbench')) out.push('Enchanting needs the Runic Workbench.');
    if (e.tier >= 2 && upg(s, 'chamber') < e.tier - 1) out.push(`${e.name} needs Enchantment Chamber level ${e.tier - 1}.`);
  }
  return out;
}
export function forgeCost(s, spec) {
  const bp = BLUEPRINTS[spec.bp];
  let primary = bp.ore - (s.smith.level >= 5 && bp.ore >= 4 ? 1 : 0);
  const other = {};
  const add = (c) => { for (const k in c) other[k] = (other[k] || 0) + c[k]; };
  add(bp.extra);
  for (const c of spec.comps || []) if (COMPONENTS[c]) add(COMPONENTS[c].cost);
  if (spec.ench) add(ENCHANTS[spec.ench].cost);
  if (other[spec.mat]) { primary += 0; }
  return { primary, other };
}
export function forgeStages(s, spec) {
  const bp = BLUEPRINTS[spec.bp];
  let st = bp.stages.map((x) => ({ id: x[0], w: x[1] }));
  const hasCore = (spec.comps || []).some((c) => COMPONENTS[c] && COMPONENTS[c].slot === 'core');
  if (spec.ench && !st.find((x) => x.id === 'runes')) st.splice(st.length - (st[st.length - 1].id === 'quench' ? 1 : 0), 0, { id: 'runes', w: 1.1 });
  if ((hasCore && MATS[spec.mat].tier >= 3 || (spec.ench && ENCHANTS[spec.ench].tier >= 3)) && !st.find((x) => x.id === 'mana')) st.splice(st.length - (st[st.length - 1].id === 'quench' ? 1 : 0), 0, { id: 'mana', w: 1 });
  return st;
}
// QTE difficulty profile from recipe + upgrades.
export function qteConfig(s, spec, stageId) {
  const bp = BLUEPRINTS[spec.bp]; const m = MATS[spec.mat];
  const d = clamp((bp.tier + m.tier) / 2, 1, 5); // 1..5
  const comps = (spec.comps || []).map((c) => COMPONENTS[c]).filter(Boolean);
  const stab = comps.reduce((a, c) => a + (c.stab || 0), 0);
  const relaxed = s.settings.relaxed ? 0.25 : 0;
  const trial = s.settings.trial && s.legacy.perks.trials ? 0.2 : 0;
  const assist = 1 + stab + relaxed - trial;
  const perfAssist = 1 + 0.04 * tal(s, 'steady');
  const cat = bp.cat;
  const ench = spec.ench ? ENCHANTS[spec.ench] : null;
  switch (stageId) {
    case 'circular': return { d, cat, rounds: d >= 4 ? 6 : 5, speed: 0.55 + d * 0.12 + trial * 0.6 + (cat === 'dagger' ? 0.15 : 0), zone: (34 - d * 3) * assist, perfect: (7 - d * 0.6) * perfAssist * (1 + 0.06 * upg(s, 'hammer')) * (1 + stab), multi: d >= 3 && cat !== 'hammer', alternate: d >= 2, wobble: d >= 3 ? 0.35 * (1 - 0.25 * upg(s, 'hammer')) : 0 };
    case 'furnace': return { d, duration: cat === 'dagger' ? 14 : cat === 'greatsword' ? 20 : 17, band: (190 - d * 18) * assist, drift: (0.7 + d * 0.22) * (1 - 0.15 * upg(s, 'furnace')) * (1 - 0.15 * tal(s, 'heat')), shifts: 1 + Math.min(3, Math.floor(d)), center: 700 + m.tier * 90, matColor: m.color };
    case 'hammer': return { d, cat, assist: assist * (1 + 0.06 * upg(s, 'anvil')), perfAssist, magic: !!ench || cat === 'staff', strikes: { dagger: 14, sword: 11, spear: 10, greatsword: 9, hammer: 8, staff: 9 }[cat] + Math.floor(d / 2), window: { dagger: 0.85, sword: 1.1, spear: 1.0, greatsword: 1.45, hammer: 1.3, staff: 1.15 }[cat] * (1.15 - d * 0.06), heavy: cat === 'hammer' || cat === 'greatsword', overlap: cat === 'dagger' ? 2 : d >= 3 ? 2 : 1, matColor: m.color };
    case 'quench': return { d, pulses: 3 + Math.min(2, Math.floor((d - 1) / 1.5)), speed: 0.8 + d * 0.13 + trial, tol: (10 - d) * assist * (1 + 0.1 * upg(s, 'quench')) * perfAssist, breathe: d >= 3, double: d >= 4, cat, matColor: m.color };
    case 'runes': { const r = ench ? ench.runes : { glyphs: 2, nodes: 5 }; return { d, glyphs: r.glyphs + (d >= 4 ? 1 : 0), nodes: r.nodes, memory: !!r.memory || trial > 0, time: d >= 3 || r.memory ? Math.round((9 + r.nodes * 1.2) / (1 - relaxed * 0.5)) : 0, radius: 1 + 0.18 * upg(s, 'workbench') + relaxed, elem: ench ? ench.elem : 'light' }; }
    case 'mana': return { d, duration: 15, band: (0.22 - d * 0.015) * assist, drift: (0.5 + d * 0.12) * (1 - 0.15 * upg(s, 'chamber')), coupling: 0.25 + d * 0.06 };
    default: return { d };
  }
}

export function previewWeapon(s, spec) {
  const temper = tal(s, 'temper'); const rs = tal(s, 'runescholar');
  const lo = weaponStats(spec, 20, { temper, runescholar: rs, rarity: rarityFor(spec, 20, 0) });
  const hi = weaponStats(spec, 100, { temper, runescholar: rs, rarity: rarityFor(spec, 100, 1) });
  return { lo, hi, rlo: rarityFor(spec, 20, 0), rhi: rarityFor(spec, 100, 1) };
}

// Combine stage scores into craftsmanship. results: [{id, score, w, grades:[]}]
export function craftScore(s, results) {
  const tw = results.reduce((a, r) => a + r.w, 0);
  let sc = results.reduce((a, r) => a + r.score * r.w, 0) / (tw || 1);
  sc += 1.5 * (s.legacy.perks.hands || 0);
  if (s.player.blessing) sc += 5;
  if (s.settings.relaxed) sc *= 0.9;
  return clamp(Math.round(sc * 10) / 10, 0, 100);
}

export function completeForge(s, spec, results, st) {
  const bp = BLUEPRINTS[spec.bp]; const m = MATS[spec.mat];
  const cost = forgeCost(s, spec);
  // spend
  const spent = [];
  s.mats[spec.mat][spec.q || 0] -= cost.primary; spent.push([spec.mat, spec.q || 0, cost.primary]);
  for (const id in cost.other) spent.push(...spendMat(s, id, cost.other[id]));
  let refunded = false;
  if (rnd() < 0.12 * tal(s, 'thrifty')) { s.mats[spec.mat][spec.q || 0] += 1; refunded = true; spent[0][2] -= 1; }
  const score = craftScore(s, results);
  s.player.blessing = 0;
  const grade = gradeFor(score);
  const trial = s.settings.trial && s.legacy.perks.trials;
  const rarity = rarityFor(spec, score, rnd());
  const traits = rollTraits(spec, score, rarity, s, trial);
  const runes = results.find((r) => r.id === 'runes');
  const stats = weaponStats(spec, score, { rarity, traits, temper: tal(s, 'temper'), runescholar: tal(s, 'runescholar'), runes: runes ? runes.score : null });
  const names = new Set(s.items.map((i) => i.name));
  const item = {
    uid: uid(), bp: spec.bp, cat: bp.cat, mat: spec.mat, q: spec.q || 0, comps: [...(spec.comps || [])], ench: spec.ench || null,
    score, grade: grade.idx, rarity, traits, stats, name: weaponName(spec, rarity, stats.elem, names),
    stages: results.map((r) => ({ id: r.id, score: Math.round(r.score) })), seed: Math.floor(rnd() * 1e9), created: Date.now(), locked: false, fav: false,
    spent: spent.filter((x) => x[2] > 0).map((x) => [x[0], x[2]]),
  };
  s.items.push(item);
  // stats & xp
  s.stats.crafted++;
  if (spec.ench) s.stats.enchanted++;
  s.stats.bestGrade = Math.max(s.stats.bestGrade, grade.idx);
  s.stats.bestRarity = Math.max(s.stats.bestRarity, rarity);
  const perfects = results.reduce((a, r) => a + (r.perfects || 0), 0);
  s.stats.perfects += perfects;
  if (results.every((r) => r.score >= 99.5)) s.stats.flawless++;
  for (const r of results) { const b = s.records.best[r.id] || 0; if (r.score > b) s.records.best[r.id] = Math.round(r.score); }
  if (!s.records.best.total || score > s.records.best.total) s.records.best.total = score;
  s.records.history.unshift({ name: item.name, bp: spec.bp, mat: spec.mat, score, grade: grade.idx, rarity, t: Date.now(), stages: item.stages });
  s.records.history = s.records.history.slice(0, 30);
  s.codex.bps[spec.bp] = (s.codex.bps[spec.bp] || 0) + 1;
  const sxp = (20 + bp.tier * 12 + m.tier * 14) * (0.5 + score / 100) * (trial ? 1.3 : 1);
  gainSmithXP(s, sxp, st);
  gainXP(s, 6 + m.tier * 4, st);
  track(s, 'craft', { mat: spec.mat, tier: m.tier, grade: grade.idx, ench: !!spec.ench }, st);
  if (perfects) track(s, 'perfect', { n: perfects }, st);
  if (refunded && st) st.toast('Thrifty Smith: 1 ' + m.name + ' refunded.', 'info');
  return item;
}

export function salvageReturn(s, it) {
  const rate = tal(s, 'salvager') ? 0.5 : 0.4;
  const out = {};
  for (const [id, n] of it.spent || []) { const r = Math.floor(n * rate); if (r > 0) out[id] = (out[id] || 0) + r; }
  return out;
}
export function sellValue(it) { return Math.round(it.stats.attack * 0.6 + it.stats.arcana * 0.4 + it.rarity * it.rarity * 8 + 5); }
export function salvage(s, uidv, st) {
  const it = getItem(s, uidv);
  if (!it || it.locked || s.equipped === uidv) return false;
  const back = salvageReturn(s, it);
  for (const id in back) addMat(s, id, back[id], 0, st);
  s.items = s.items.filter((i) => i.uid !== uidv);
  s.stats.salvaged++;
  return back;
}
export function sellItem(s, uidv) {
  const it = getItem(s, uidv);
  if (!it || it.locked || s.equipped === uidv) return 0;
  const g = goldGain(s, sellValue(it));
  s.items = s.items.filter((i) => i.uid !== uidv);
  return g;
}
export function equip(s, uidv) {
  const before = playerStats(s).maxHp;
  s.equipped = uidv;
  const after = playerStats(s).maxHp;
  s.player.hp = clamp(Math.round(s.player.hp * after / Math.max(1, before)), 1, after);
}

// ---------- derived player stats ----------
export function playerStats(s, weaponOverride) {
  const w = weaponOverride !== undefined ? weaponOverride : equippedWeapon(s);
  const L = s.player.level;
  const ws = w ? w.stats : { attack: 8, speed: 8, crit: 5, critDmg: 50, guard: 1, arcana: 0, pierce: 0, elem: 'none', status: 0, elemBonus: 0, lifesteal: 0, bleed: 0, sunder: 0, stagger: 0, beast: 0, barrier: 0, parry: 0 };
  const cat = w ? w.cat : null;
  const maxHp = Math.round((70 + 14 * (L - 1)) * (1 + 0.1 * tal(s, 'vigor')) + ws.guard * 1.5);
  const arcana = ws.arcana + L;
  return {
    ...ws, cat, weapon: w,
    attack: Math.round(ws.attack * (1 + 0.03 * (L - 1))),
    guard: Math.round(ws.guard + L * 0.5),
    arcana, maxHp,
    pierce: Math.min(0.75, ws.pierce + (cat === 'spear' && hasPassive(s, 'spear', 2) ? 0.12 : 0)),
    maxSta: 100, staRegen: Math.round(14 + ws.speed * 0.3 + 5 * tal(s, 'rhythm')),
    maxMana: Math.round(30 + arcana * 1.2 + 15 * tal(s, 'reservoir')),
    manaRegen: Math.round(6 + 2 * tal(s, 'reservoir') + (cat === 'staff' && hasPassive(s, 'staff', 2) ? 4 : 0) + arcana * 0.05),
    defendCut: 0.5 + 0.08 * tal(s, 'ironguard'),
    timingAssist: 1 + 0.15 * tal(s, 'timing') + (s.settings.relaxed ? 0.25 : 0) + (ws.parry || 0),
  };
}

// ---------- world ----------
export function locVisible(s, id) { const L = LOCATIONS[id]; return s.world.regions.includes(L.region) && !!s.world.seen[id]; }
export function regionUnlocked(s, r) { return s.world.regions.includes(r); }
export function unlockRegion(s, r, st) {
  if (s.world.regions.includes(r)) return;
  s.world.regions.push(r);
  for (const id in LOCATIONS) { const L = LOCATIONS[id]; if (L.region === r && !L.hidden) s.world.seen[id] = true; }
  if (st) { st.toast(`New region unlocked: ${REGIONS[r].name}!`, 'discover'); st.burst('region'); }
}
function revealLinked(s, id, st) {
  const p = s.world.progress[id] || 0;
  for (const l of LINKS[id]) {
    const L = LOCATIONS[l];
    if (s.world.seen[l] || L.secretBoss || L.region !== LOCATIONS[id].region) continue;
    if (p >= (L.type === 'boss' ? 70 : 50)) { s.world.seen[l] = true; if (st) st.toast(`Discovered: ${L.name}`, 'discover'); }
  }
}
export function applySecret(s, key, st) {
  const [kind, id] = key.split(':');
  if (kind === 'bp' && !s.blueprints.includes(id)) { s.blueprints.push(id); if (st) { st.toast(`Blueprint discovered: ${BLUEPRINTS[id].name}!`, 'rare'); st.burst('rare'); } return `Blueprint: ${BLUEPRINTS[id].name}`; }
  if (kind === 'ench' && !s.enchants.includes(id)) { s.enchants.push(id); if (st) { st.toast(`Enchantment learned: ${ENCHANTS[id].name}!`, 'rare'); st.burst('rare'); } return `Enchantment: ${ENCHANTS[id].name}`; }
  if (kind === 'loc' && !s.world.seen[id]) { s.world.seen[id] = true; if (st) st.toast(`Discovered: ${LOCATIONS[id].name}`, 'discover'); return `Location: ${LOCATIONS[id].name}`; }
  return null;
}
function regionMats(region) {
  const pool = new Set();
  for (const id in LOCATIONS) { const L = LOCATIONS[id]; if (L.region !== region) continue; (L.deposits || []).forEach((d) => pool.add(d[0])); (L.forage || []).forEach((d) => pool.add(d[0])); (L.gems || []).forEach((g) => pool.add(g)); }
  return [...pool].filter((m) => MATS[m].kind !== 'essence' || region === 'astral');
}
export function rollRegionMats(s, region, n, st) {
  const pool = regionMats(region); const got = {};
  for (let i = 0; i < n; i++) { const m = pick(pool); const q = rnd() < 0.15 ? 1 : 0; const k = ri(1, 2); addMat(s, m, k, q, st); got[m] = (got[m] || 0) + k; }
  return got;
}
export function newDeposit(s, locId, forceMat) {
  const L = LOCATIONS[locId];
  if (!L.deposits) return null;
  const mat = forceMat || weighted(L.deposits);
  const M = MATS[mat];
  const lensT = s.tools.lens;
  return { id: uid(), mat, layers: clamp((M.tier || 1) + ri(1, 2), 2, 6), rich: rnd() < 0.12 + 0.12 * lensT, pocket: Math.min(0.6, 0.12 + 0.08 * tal(s, 'treasure') + 0.06 * lensT) };
}

// Exploration roll -> event descriptor handled by the UI.
export function explore(s, locId, st) {
  const L = LOCATIONS[locId];
  const prog0 = s.world.progress[locId] || 0;
  const gain = Math.round(ri(6, 10) * (1 + 0.25 * tal(s, 'pathfinder')));
  const prog = Math.min(100, prog0 + gain);
  s.world.progress[locId] = prog;
  s.stats.explores++;
  if (prog0 < 100 && prog >= 100) { s.stats.fullyExplored++; if (st) st.toast(`${L.name} fully explored!`, 'discover'); }
  gainXP(s, 3 + REGIONS[L.region].tier * 2, st);
  if (tal(s, 'fieldcamp')) s.player.hp = Math.min(playerStats(s).maxHp, s.player.hp + Math.round(playerStats(s).maxHp * 0.06));
  const found = [];
  for (const [t, key] of L.secrets || []) if (prog0 < t && prog >= t) { const r = applySecret(s, key, st); if (r) found.push(r); }
  revealLinked(s, locId, st);
  track(s, 'explore', { loc: locId }, st);
  if (found.length) return { type: 'secret', found, gain };
  const deps = s.world.deposits[locId] || [];
  const w = { mine: [['deposit', 45], ['battle', 20], ['story', 15], ['treasure', 10], ['forage', L.forage ? 10 : 0]], wild: [['forage', 30], ['battle', 30], ['story', 20], ['deposit', 10], ['treasure', 10]], ruin: [['battle', 30], ['deposit', 25], ['story', 20], ['treasure', 15], ['forage', L.forage ? 10 : 0]], outpost: [['forage', 30], ['story', 30], ['battle', 25], ['treasure', 15]] }[L.type] || [['story', 1]];
  let type = weighted(w.filter((x) => x[1] > 0 && (x[0] !== 'deposit' || (L.deposits && deps.length < 4)) && (x[0] !== 'forage' || L.forage)));
  if (s.stats.explores <= 2 && L.deposits && deps.length < 4) type = 'deposit'; // first explorations teach mining
  if (type === 'deposit') {
    const d = newDeposit(s, locId);
    s.world.deposits[locId] = [...deps, d];
    return { type: 'deposit', deposit: d, gain };
  }
  if (type === 'battle') return { type: 'battle', enemy: pick(L.enemies), gain };
  if (type === 'forage') return { type: 'forage', gain };
  if (type === 'treasure') {
    const g = goldGain(s, ri(5, 12) * REGIONS[L.region].tier);
    const mats = rollRegionMats(s, L.region, 1 + (tal(s, 'fortune') ? 1 : 0), st);
    return { type: 'treasure', gold: g, mats, gain };
  }
  const evs = EVENTS.filter((e) => e.regions.includes(L.region));
  return { type: 'story', event: pick(evs).id, gain };
}

// Resolve a narrative choice. Returns {text, followup?: {type:'battle'|'mine'|'forage', ...}, got}
export function resolveChoice(s, locId, eventId, ci, st) {
  const ev = EVENTS.find((e) => e.id === eventId); const ch = ev.choices[ci]; const L = LOCATIONS[locId];
  const P = playerStats(s);
  if (ch.req) {
    if (ch.req.stat && (P[ch.req.stat === 'power' ? 'attack' : ch.req.stat] || 0) < ch.req.min) return { text: 'You are not able to do that yet.', blocked: true };
    if (ch.req.smith && s.smith.level < ch.req.smith) return { text: `Requires Blacksmith mastery ${ch.req.smith}.`, blocked: true };
  }
  if (ch.cost) {
    if (ch.cost.gold && s.player.gold < ch.cost.gold) return { text: 'You cannot afford that.', blocked: true };
    if (ch.cost.mats && !hasMats(s, ch.cost.mats)) return { text: 'You lack the materials.', blocked: true };
    if (ch.cost.item && !(s.consumables[ch.cost.item] > 0)) return { text: `You have no ${CONSUMABLES[ch.cost.item].name}.`, blocked: true };
    if (ch.cost.gold) s.player.gold -= ch.cost.gold;
    if (ch.cost.mats) for (const k in ch.cost.mats) spendMat(s, k, ch.cost.mats[k]);
    if (ch.cost.item) s.consumables[ch.cost.item]--;
  }
  let o = ch.out;
  if (o.chance != null && rnd() > o.chance + (tal(s, 'fortune') ? 0.1 : 0)) o = o.fail || {};
  const got = {}; let followup = null; const lines = [o.text || ''];
  if (o.mats) for (const k in o.mats) { addMat(s, k, o.mats[k], 0, st); got[k] = o.mats[k]; }
  if (o.roll === 'regionmats') Object.assign(got, rollRegionMats(s, L.region, 2 + (tal(s, 'fortune') ? 1 : 0), st));
  if (o.gold) { const g = goldGain(s, o.gold * REGIONS[L.region].tier); lines.push(`+${g} gold`); }
  if (o.xp) { const x = gainXP(s, o.xp * REGIONS[L.region].tier, st); lines.push(`+${x} XP`); }
  if (o.smithxp) { gainSmithXP(s, o.smithxp * REGIONS[L.region].tier, st); lines.push('+Blacksmith mastery'); }
  if (o.hp) { const mh = P.maxHp; s.player.hp = clamp(s.player.hp + Math.round(mh * o.hp / 100), 1, mh); lines.push(o.hp > 0 ? `Recovered ${o.hp}% HP` : `Lost ${-o.hp}% HP`); }
  if (o.progress) { s.world.progress[locId] = Math.min(100, (s.world.progress[locId] || 0) + o.progress); revealLinked(s, locId, st); }
  if (o.buff === 'blessing') s.player.blessing = 1;
  if (o.deposit && L.deposits) { const deps = s.world.deposits[locId] || []; for (let i = 0; i < o.deposit && deps.length < 4; i++) deps.push(newDeposit(s, locId)); s.world.deposits[locId] = deps; lines.push('New deposits marked on your map.'); }
  if (o.battle) followup = { type: 'battle', enemy: o.battle === 'region' ? pick(L.enemies || ['boar']) : o.battle, bonus: o.bonus };
  if (o.mine) {
    let mloc = locId;
    if (!L.deposits) { const alt = Object.keys(LOCATIONS).find((k) => LOCATIONS[k].region === L.region && LOCATIONS[k].deposits); mloc = alt; }
    if (mloc) { const d = newDeposit(s, mloc); followup = { type: 'mine', deposit: d, loc: mloc, temp: true }; }
  }
  if (o.forage) followup = { type: 'forage' };
  return { text: lines.filter(Boolean).join(' '), got, followup };
}

export function finishMining(s, locId, dep, res, st) {
  // res: {layers, total, weakHits, strikes, pocket}
  const M = MATS[dep.mat];
  const precision = res.strikes ? res.weakHits / res.strikes : 0;
  const frac = res.layers / dep.layers;
  let n = Math.round((1 + res.layers * 0.9) * (1 + 0.15 * tal(s, 'prospector')) * (dep.rich ? 1.5 : 1));
  if (frac < 1) n = Math.max(res.layers > 0 ? 1 : 0, Math.round(n * 0.7));
  const q = precision >= 0.7 && frac >= 1 ? 2 : precision >= 0.45 ? 1 : 0;
  const got = [];
  if (n > 0) { addMat(s, dep.mat, n, M.kind === 'fuel' ? 0 : q, st); got.push([dep.mat, n, M.kind === 'fuel' ? 0 : q]); }
  const L = LOCATIONS[locId];
  if (res.pocket) {
    s.stats.pockets++;
    const gem = L.gems ? pick(L.gems) : dep.mat;
    const k = ri(1, 2) + (tal(s, 'fortune') ? 1 : 0);
    addMat(s, gem, k, 1, st); got.push([gem, k, 1]);
    track(s, 'pocket', {}, st);
    if (st) st.burst('rare');
  }
  if (dep.mat !== 'coal' && frac >= 1 && rnd() < 0.35) { addMat(s, 'coal', 1, 0, st); got.push(['coal', 1, 0]); }
  s.world.deposits[locId] = (s.world.deposits[locId] || []).filter((d) => d.id !== dep.id);
  s.stats.mined++;
  gainXP(s, 4 + (M.tier || 1) * 3, st);
  track(s, 'mine', { mat: dep.mat }, st);
  return { got, q, precision };
}
export function forageTable(s, locId) {
  const L = LOCATIONS[locId];
  if (L.forage) return L.forage;
  const alt = Object.values(LOCATIONS).find((x) => x.region === L.region && x.forage);
  return alt ? alt.forage : [['oakwood', 1]];
}
export function finishForage(s, locId, picks, st) {
  const bonus = 1 + 0.2 * tal(s, 'herbalist') + 0.15 * (SICKLES[s.tools.sickle].bonus || 0);
  const got = {};
  let total = 0;
  for (const k in picks) {
    if (!MATS[k]) continue;
    const n = Math.min(10, Math.round(picks[k] * bonus));
    total += n;
    if (total > 24) break;
    addMat(s, k, n, 0, st); got[k] = n;
  }
  s.stats.forages++;
  gainXP(s, 3 + REGIONS[LOCATIONS[locId].region].tier * 2, st);
  track(s, 'forage', {}, st);
  return got;
}

export function rest(s) { const P = playerStats(s); s.player.hp = P.maxHp; }
export const canRestAt = (locId) => ['home', 'outpost'].includes(LOCATIONS[locId].type);

export function smelt(s, rid, q, times, st) {
  const r = SMELT.find((x) => x.id === rid);
  let made = 0;
  for (let i = 0; i < times; i++) {
    if (upg(s, 'refinery') < r.lvl || (r.crucible && !upg(s, 'crucible'))) break;
    if (s.player.gold < r.gold) break;
    const main = s.mats[r.main] || [0, 0, 0];
    if (main[q] < r.inputs[r.main]) break;
    const others = { ...r.inputs }; delete others[r.main];
    if (!hasMats(s, others)) break;
    main[q] -= r.inputs[r.main];
    for (const k in others) spendMat(s, k, others[k]);
    s.player.gold -= r.gold;
    addMat(s, r.out, 1, q, st);
    made++;
  }
  if (made) { s.stats.smelted += made; track(s, 'smelt', { n: made }, st); gainSmithXP(s, made * 6 * MATS[r.out].tier, st); }
  return made;
}

// ---------- quests & achievements ----------
export function questUnlocked(s, q) { return !q.req || (s.quests[q.req] && s.quests[q.req].done); }
export function track(s, type, p, st) {
  for (const q of QUESTS) {
    if (!questUnlocked(s, q)) continue;
    const qs = s.quests[q.id] || (s.quests[q.id] = { n: 0, done: false, claimed: false });
    if (qs.done) continue;
    let inc = 0;
    switch (q.type) {
      case 'craft': if (type === 'craft') inc = 1; break;
      case 'craftmat': if (type === 'craft' && p.mat === q.mat) inc = 1; break;
      case 'enchant': if (type === 'craft' && p.ench) inc = 1; break;
      case 'grade': if (type === 'craft' && p.grade >= ['flawed', 'standard', 'fine', 'superior', 'masterwork', 'legendary'].indexOf(q.grade)) inc = 1; break;
      case 'gradetier': if (type === 'craft' && p.tier >= q.tier && p.grade >= ['flawed', 'standard', 'fine', 'superior', 'masterwork', 'legendary'].indexOf(q.grade)) inc = 1; break;
      case 'mine': if (type === 'mine') inc = 1; break;
      case 'minemat': if (type === 'mine' && p.mat === q.mat) inc = 1; break;
      case 'defeat': if (type === 'win') inc = 1; break;
      case 'boss': if (type === 'win' && p.enemy === q.target) inc = 1; break;
      case 'forage': if (type === 'forage') inc = 1; break;
      case 'perfect': if (type === 'perfect') inc = p.n; break;
      case 'smelt': if (type === 'smelt') inc = p.n; break;
      case 'pocket': if (type === 'pocket') inc = 1; break;
      case 'prestige': if (type === 'prestige') inc = 1; break;
      default: break;
    }
    if (inc) {
      qs.n = Math.min(q.n, qs.n + inc);
      if (qs.n >= q.n) { qs.done = true; if (st) st.toast(`Quest complete: ${q.name}. Claim your reward in Quests.`, 'quest'); }
    }
  }
}
export function claimQuest(s, id, st) {
  const q = QUESTS.find((x) => x.id === id); const qs = s.quests[id];
  if (!qs || !qs.done || qs.claimed) return;
  qs.claimed = true;
  const r = q.reward;
  if (r.gold) goldGain(s, r.gold);
  if (r.xp) gainXP(s, r.xp, st);
  if (r.smithxp) gainSmithXP(s, r.smithxp, st);
  if (r.lp) s.legacy.lp += r.lp;
  for (const k in r.mats || {}) addMat(s, k, r.mats[k], 0, st);
  for (const k in r.items || {}) s.consumables[k] = (s.consumables[k] || 0) + r.items[k];
  if (st) st.burst('quest');
}
function checkProgress(s, st) {
  // passive quest types computed from state
  for (const q of QUESTS) {
    if (!questUnlocked(s, q)) continue;
    const qs = s.quests[q.id] || (s.quests[q.id] = { n: 0, done: false, claimed: false });
    if (qs.done) continue;
    let v = null;
    if (q.type === 'discover') v = Object.keys(s.codex.mats).length;
    if (q.type === 'mastery') v = Math.max(...Object.values(s.mastery).map((m) => m.lvl));
    if (q.type === 'boss' && s.bosses[q.target]) v = 1;
    if (v != null) { qs.n = Math.min(q.n, v); if (qs.n >= q.n) { qs.done = true; if (st) st.toast(`Quest complete: ${q.name}`, 'quest'); } }
  }
  s.stats.level = s.player.level; s.stats.smithLevel = s.smith.level;
  for (const a of ACHIEVEMENTS) {
    if (s.achievements[a.id]) continue;
    let ok = false;
    if (a.boss) ok = !!s.bosses[a.boss] || !!(s.legacy.everBosses && s.legacy.everBosses[a.boss]);
    else ok = (s.stats[a.stat] || 0) >= a.n;
    if (ok) { s.achievements[a.id] = Date.now(); if (st) { st.toast(`Achievement unlocked: ${a.name}`, 'achieve'); } }
  }
  if (s.bosses.sovereign && !s.world.seen.sanctum) { s.world.seen.sanctum = true; if (st) st.toast('A hidden light flickers above the Observatory: the Echo Sanctum.', 'discover'); }
}

// ---------- upgrades & shop ----------
export function upgradeCost(s, id) { const U = FORGE_UPGRADES[id]; const lvl = upg(s, id); return lvl >= U.max ? null : U.costs[lvl]; }
export function buyUpgrade(s, id, st) {
  const c = upgradeCost(s, id); if (!c || !canAfford(s, c)) return false;
  const U = FORGE_UPGRADES[id];
  if (U.smith && s.smith.level < U.smith) return false;
  payCost(s, c); s.upgrades[id] = upg(s, id) + 1;
  if (st) { st.toast(`${U.name} upgraded to level ${s.upgrades[id]}!`, 'upgrade'); st.burst('upgrade'); }
  return true;
}
export function buyTool(s, kind, st) {
  const list = { pick: PICKAXES, sickle: SICKLES, lens: LENSES }[kind];
  const next = list[s.tools[kind] + 1]; if (!next || !canAfford(s, next.cost)) return false;
  payCost(s, next.cost); s.tools[kind]++;
  if (st) { st.toast(`Acquired: ${next.name}!`, 'upgrade'); st.burst('upgrade'); }
  return true;
}
export function shopPrice(s, entry) { return entry.kind === 'item' ? CONSUMABLES[entry.id].price : entry.price; }

// ---------- prestige ----------
export function legacyPoints(s) {
  const bossesN = Object.keys(s.bosses).filter((b) => ENEMIES[b].boss).length;
  return Math.floor(s.player.level / 2 + s.smith.level + bossesN * 3 + Object.keys(s.achievements).length * 0.5 + Math.max(0, s.stats.bestRarity));
}
export function canRekindle(s) { return !!s.bosses.sovereign; }
export function rekindle(s) {
  const gained = legacyPoints(s);
  const heir = s.legacy.perks.heirloom ? equippedWeapon(s) : null;
  const everBosses = { ...(s.legacy.everBosses || {}) }; for (const b in s.bosses) everBosses[b] = true;
  const hall = [...(s.legacy.hall || [])];
  const best = [...s.items].sort((a, b) => b.rarity - a.rarity || b.score - a.score)[0];
  if (best) hall.unshift({ name: best.name, rarity: best.rarity, score: best.score, bp: best.bp, mat: best.mat, life: s.legacy.count + 1, t: Date.now() });
  const stats = { ...s.stats }; stats.prestiges = (stats.prestiges || 0) + 1;
  const n = newGame({ lp: s.legacy.lp + gained, spent: s.legacy.spent, perks: s.legacy.perks, count: s.legacy.count + 1, hall: hall.slice(0, 12), everBosses, codex: s.codex, records: s.records, achievements: s.achievements, stats });
  n.settings = { ...s.settings };
  n.smith.level = Math.max(1, Math.floor(s.smith.level / 2));
  if (heir) { n.items.push(heir); n.equipped = heir.uid; }
  n.quests.q13 = { n: 1, done: true, claimed: false };
  for (const q of QUESTS) if (q.main && q.id !== 'q13') n.quests[q.id] = undefined;
  n.player.hp = playerStats(n).maxHp;
  return { state: n, gained };
}
export function buyPerk(s, id) {
  const P = LEGACY_PERKS[id]; const r = s.legacy.perks[id] || 0;
  if (r >= P.max) return false;
  const c = P.cost(r);
  if (s.legacy.lp < c) return false;
  s.legacy.lp -= c; s.legacy.spent += c; s.legacy.perks[id] = r + 1;
  if (id === 'phoenix' && !s.blueprints.includes('phoenix')) s.blueprints.push('phoenix');
  if (id === 'starlit') s.settings.starlit = true;
  return true;
}
// Enemy scaling with rekindles.
export const ngScale = (s) => 1 + 0.25 * s.legacy.count;
export { QUALITY, RARITIES, GRADES, ELEMENTS };
