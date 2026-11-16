// FORGEBORN — turn-based combat engine. Operates on s.battle inside store.mutate.
import { ENEMIES, MOVES, SKILLS, CONSUMABLES, ELEMENTS, REGIONS, LOCATIONS, MATS, CATEGORIES } from './data.js';
import { playerStats, rnd, ri, pick, clamp, goldGain, gainXP, gainMastery, addMat, track, unlockRegion, hasPassive, tal, ngScale, getItem, equip } from './engine.js';

export const STATUS_INFO = {
  burn: { name: 'Burn', color: '#ff7a2e', desc: 'Takes fire damage each turn. Stacks to 3.' },
  frost: { name: 'Frost', color: '#7fd8ff', desc: '−10% damage dealt per stack. At 3 stacks, frozen for one turn.' },
  shock: { name: 'Shock', color: '#ffe066', desc: 'The next hit taken deals +25%.' },
  bleed: { name: 'Bleed', color: '#e0405a', desc: 'Takes damage each turn that ignores defense. Stacks to 5.' },
  poison: { name: 'Poison', color: '#8be05a', desc: 'Takes damage each turn and heals 50% less. Stacks to 3.' },
  armorbreak: { name: 'Armor Break', color: '#c9a0ff', desc: 'Defense reduced by 40%.' },
  regen: { name: 'Regeneration', color: '#7affb0', desc: 'Heals 5% of max HP each turn.' },
  empower: { name: 'Empowered', color: '#ffb347', desc: 'Next attack deals +50%.' },
  guard: { name: 'Guarding', color: '#a8c8ff', desc: 'Takes 50% less damage until its next turn.' },
  counter: { name: 'Riposte', color: '#ffd27a', desc: 'Will counter the next attack.' },
  thorns: { name: 'Thorn Shell', color: '#6aff8a', desc: 'Reflects 30% of damage taken back at the attacker.' },
  evade: { name: 'Evasive', color: '#c8f0ff', desc: 'Will evade the next attack.' },
  charged: { name: 'Charged', color: '#ffcf5a', desc: 'Next attack deals +120%.' },
  ward: { name: 'Mana Ward', color: '#9ab8ff', desc: 'A barrier absorbs damage.' },
};
const MAXST = { burn: 3, frost: 3, bleed: 5, poison: 3 };
const DUR = { burn: 3, frost: 3, shock: 2, bleed: 3, poison: 4, armorbreak: 3, regen: 3, empower: 2, guard: 1, counter: 1, thorns: 2, evade: 1, charged: 2 };

function addStatus(t, id, stacks = 1, pow = 0, turns) {
  const cur = t.st[id];
  if (id === 'frost' && t.frostImm > 0) return false;
  const max = id === 'bleed' ? (t.bleedMax || 5) : (MAXST[id] || 1);
  if (cur) { cur.n = Math.min(max, cur.n + stacks); cur.t = Math.max(cur.t, turns || DUR[id]); cur.pow = Math.max(cur.pow || 0, pow); }
  else t.st[id] = { n: Math.min(max, stacks), t: turns || DUR[id] || 2, pow };
  return true;
}
const has = (t, id) => !!t.st[id];

function log(b, text, kind = '') { b.log.push({ text, kind, id: b.seq = (b.seq || 0) + 1 }); if (b.log.length > 40) b.log.shift(); }
function floater(b, who, text, kind) { b.floats.push({ who, text, kind, id: b.seq = (b.seq || 0) + 1 }); if (b.floats.length > 8) b.floats.shift(); }

export function startBattle(s, enemyId, ctx = {}) {
  const E = ENEMIES[enemyId];
  const P = playerStats(s);
  const sc = ngScale(s);
  const b = {
    enemyId, ctx, turn: 1, stage: 'player', over: null, log: [], floats: [], seq: 0, lastActs: [],
    e: { hp: Math.round(E.hp * sc), maxHp: Math.round(E.hp * sc), atk: E.atk * sc, def: E.def * (1 + 0.1 * s.legacy.count), st: {}, stagger: 0, staggerMax: Math.round(E.hp * sc * (E.boss ? 0.28 : 0.45)), staggerImm: 0, ccImm: 0, frostImm: 0, plates: E.plates || 0, phase: E.ai === 'boss_sovereign' ? 'astral' : null, enraged: false, heals: 0, heat: 0, mirror: null, repeat: 0, intent: null, nextForced: null, dodge: E.dodge || 0 },
    p: { hp: clamp(s.player.hp, 1, P.maxHp), sta: 60, mana: P.maxMana, st: {}, fury: 0, defending: false, barrier: P.barrier || 0, usedUnbroken: false, usedRebirth: false, firstStrike: true, frostImm: 0, ccImm: 0, bleedMax: 5 },
    inspected: !!s.codex.enemies[enemyId],
  };
  if (!s.codex.enemies[enemyId]) s.codex.enemies[enemyId] = { seen: 1, kills: 0 };
  s.battle = b;
  log(b, `${E.name} appears!`, 'title');
  if (E.boss) log(b, E.desc, 'info');
  chooseIntent(s);
  return b;
}

// ---------- intents & AI ----------
function chooseIntent(s) {
  const b = s.battle; const E = ENEMIES[b.enemyId]; const e = b.e;
  if (e.nextForced) { e.intent = e.nextForced; e.nextForced = null; return; }
  const hpf = e.hp / e.maxHp;
  const mv = E.moves;
  let m;
  const w = (list) => { const tot = list.reduce((a, x) => a + x[1], 0); let r = rnd() * tot; for (const x of list) { r -= x[1]; if (r <= 0) return x[0]; } return list[0][0]; };
  const playerDefensive = b.lastActs.slice(-2).filter((a) => a === 'defend').length >= 2;
  const playerAggro = b.lastActs.slice(-3).filter((a) => a === 'attack' || a === 'skill').length >= 3;
  switch (E.ai) {
    case 'aggressive': m = w(mv.map((x) => [x, x === 'strike' ? 3 : MOVES[x].kind === 'heavy' ? 1.2 : 2])); break;
    case 'swift': m = w(mv.map((x) => [x, MOVES[x].kind === 'multi' ? 3 : 2])); break;
    case 'magical': m = w(mv.map((x) => { const st = MOVES[x].status; return [x, st && !has(b.p, st[0]) ? 3 : MOVES[x].kind === 'heal' ? (hpf < 0.5 ? 3 : 0.2) : 1.5]; })); break;
    case 'heavy': m = b.turn % 3 === 0 && mv.includes('windup') ? 'windup' : w(mv.filter((x) => x !== 'windup').map((x) => [x, MOVES[x].kind === 'heal' ? (hpf < 0.6 ? 2 : 0) : 2])); break;
    case 'defensive': m = w(mv.map((x) => { const k = MOVES[x].kind; return [x, k === 'guard' ? (hpf < 0.5 ? 3 : 1.2) : k === 'counter' ? (playerAggro ? 3 : 1) : x === 'sunder' ? (playerDefensive ? 3 : 1) : k === 'charge' ? 0.8 : 2]; })); break;
    case 'tactical': m = w(mv.map((x) => { const k = MOVES[x].kind; return [x, k === 'counter' ? (playerAggro ? 3.5 : 0.6) : x === 'sunder' || x === 'steal' ? (playerDefensive ? 3 : 1) : k === 'heal' ? (hpf < 0.4 && e.heals < 2 ? 4 : 0) : k === 'guard' ? (hpf < 0.35 ? 2.5 : 0.5) : k === 'charge' ? (b.p.hp / playerStats(s).maxHp < 0.5 ? 2 : 0.8) : 2]; })); break;
    case 'boss_grimjaw': m = ['bite', 'spit', 'howl', 'gore', 'bite', e.enraged ? 'gore' : 'spit'][(b.turn - 1) % 6]; break;
    case 'boss_korrath': m = e.plates < 3 && b.turn % 4 === 0 ? 'plates' : ['strike', 'strike', 'windup'][(b.turn - 1) % 3]; break;
    case 'boss_sylvara': m = !has(e, 'thorns') && b.turn % (hpf < 0.4 ? 3 : 4) === 1 ? 'thorns' : hpf < 0.5 && e.heals < 2 && rnd() < 0.4 ? 'heal' : w([['poison', 2], ['strike', 2], ['flurry', 1.5]]); break;
    case 'boss_pyraxis': m = b.turn % 4 === 3 ? 'inhale' : w([['bite', 2], ['fireball', 2], ['flurry', 1.5]]); break;
    case 'boss_sovereign': m = b.turn % 6 === 5 ? 'starfallm' : b.turn % 3 === 0 ? 'phaseshift' : w([['voidlash', 2], ['smite', 2], ['strike', 1]]); break;
    case 'boss_echo': m = b.turn === 1 || b.turn % 4 === 0 ? 'mirror' : b.turn % 5 === 2 ? 'windup' : w([['strike', 2], ['riposte', 1.2], ['flurry', 1.5]]); break;
    default: m = pick(mv);
  }
  if (m === 'windup' && E.ai === 'boss_korrath') e.nextForcedAfter = 'quake';
  e.intent = m;
}

export function intentInfo(b) {
  const m = MOVES[b.e.intent]; if (!m) return null;
  const E = ENEMIES[b.enemyId];
  let text = m.tele || '';
  if (b.e.intent === 'starfallm') text = 'A star is falling. Defend!';
  if (b.e.intent === 'phaseshift') text = `Shifting into the ${b.e.phase === 'astral' ? 'Void' : 'Astral'} phase.`;
  const dmg = ['attack', 'heavy', 'multi', 'magic', 'counter'].includes(m.kind) ? Math.round(b.e.atk * (m.mult || 1) * (m.hits || 1) * (has(b.e, 'empower') ? 1.5 : 1)) : 0;
  return { name: m.name, kind: m.kind, icon: m.icon, text, dmg, heavy: m.kind === 'heavy', E };
}

// ---------- damage ----------
function elemMult(b, elem) {
  const E = ENEMIES[b.enemyId]; let m = 1;
  if (!elem || elem === 'none') return 1;
  if ((E.weak || []).includes(elem)) m *= 1.35;
  if ((E.resist || []).includes(elem)) m *= 0.6;
  if (elem === 'light' && (E.tags || []).includes('void')) m *= 1.3;
  if (b.e.phase) {
    const good = b.e.phase === 'astral' ? ['void'] : ['light', 'astral'];
    const bad = b.e.phase === 'astral' ? ['astral', 'light'] : ['void'];
    if (good.includes(elem)) m *= 1.5; else if (bad.includes(elem)) m *= 0.5; else m *= 0.75;
  }
  if (b.e.mirror && b.e.mirror === elem) m *= 0.5;
  return m;
}

function hitEnemy(s, P, mult, opt = {}) {
  const b = s.battle; const e = b.e; const E = ENEMIES[b.enemyId];
  if (e.dodge && !opt.sure && rnd() < e.dodge * (opt.timing >= 1.3 ? 0.3 : 1)) { floater(b, 'e', 'Miss', 'miss'); log(b, `${E.name} evades your strike.`); return 0; }
  const cat = P.cat;
  let raw = (opt.spell ? P.arcana * 1.7 + P.attack * 0.35 : P.attack) * mult * (opt.timing || 1);
  if (has(b.p, 'charged') && !opt.dot) { raw *= 2.2; delete b.p.st.charged; opt.charged = true; }
  if (cat === 'sword' && hasPassive(s, 'sword', 4) && b.p.sta > 50) raw *= 1.12;
  if (cat === 'dagger' && hasPassive(s, 'dagger', 8) && e.hp / e.maxHp < 0.3) raw *= 1.5;
  if ((E.tags || []).includes('beast') && P.beast) raw *= 1 + P.beast;
  if (has(b.p, 'frost')) raw *= 1 - 0.1 * b.p.st.frost.n;
  const staggered = e.skip;
  if (staggered && tal(s, 'executioner')) raw *= 1.25;
  if (staggered === 'stagger' && cat === 'hammer' && hasPassive(s, 'hammer', 4)) raw *= 1.3;
  raw *= elemMult(b, P.elem) * (1 + (P.elem !== 'none' ? P.elemBonus : 0));
  let pierce = P.pierce + (opt.pierce || 0) + (cat === 'greatsword' && hasPassive(s, 'greatsword', 2) ? 0.15 : 0);
  let def = e.def * (has(e, 'armorbreak') ? 0.6 : 1) * (1 - clamp(pierce, 0, 0.8));
  let dmg = raw * 50 / (50 + def);
  // crit
  let critC = P.crit / 100 + (opt.crit || 0);
  let crit = rnd() < critC || opt.forceCrit || has(b.p, 'nextcrit') || (cat === 'spear' && b.p.firstStrike && hasPassive(s, 'spear', 4));
  if (has(b.p, 'nextcrit')) delete b.p.st.nextcrit;
  if (crit) dmg *= 1 + P.critDmg / 100;
  if (has(e, 'shock')) { dmg *= 1.25; delete e.st.shock; }
  if (has(e, 'guard') && !opt.breakGuard) dmg *= 0.5;
  if (e.plates > 0) dmg *= 1 - 0.2 * e.plates;
  dmg = Math.max(1, Math.round(dmg * (0.94 + rnd() * 0.12)));
  e.hp = Math.max(0, e.hp - dmg);
  b.p.firstStrike = false;
  s.stats.maxHit = Math.max(s.stats.maxHit, dmg);
  floater(b, 'e', (crit ? 'CRIT ' : '') + dmg, crit ? 'crit' : 'dmg');
  b.p.fury = Math.min(100, b.p.fury + (crit ? 12 : 7));
  if (crit && cat === 'dagger' && hasPassive(s, 'dagger', 2)) b.p.sta = Math.min(100, b.p.sta + 8);
  // lifesteal
  if (P.lifesteal > 0) { const h = Math.round(dmg * P.lifesteal * (has(b.p, 'poison') ? 0.5 : 1)); if (h > 0) { b.p.hp = Math.min(P.maxHp, b.p.hp + h); floater(b, 'p', '+' + h, 'heal'); } }
  // thorns
  if (has(e, 'thorns')) { const r = Math.round(dmg * 0.3); b.p.hp = Math.max(1, b.p.hp - r); floater(b, 'p', '-' + r, 'dmg'); log(b, `Thorns reflect ${r} damage.`, 'bad'); }
  // statuses from weapon
  const elStatus = P.elem && ELEMENTS[P.elem].status;
  const stMult = (opt.statusMult || 1) * (cat === 'staff' && hasPassive(s, 'staff', 8) && opt.spell ? 2 : 1);
  const applyEl = (n) => applyElementStatus(s, P, n);
  if (elStatus && rnd() < P.status * stMult) applyEl(opt.statusStacks || 1);
  if (opt.statusStacks && elStatus && !opt.statusApplied) applyEl(opt.statusStacks);
  if (P.bleed && rnd() < P.bleed) { addStatus(e, 'bleed', 1, P.attack * 0.1); log(b, `${E.name} is bleeding.`); }
  if (P.sunder && rnd() < P.sunder) breakArmor(s, P);
  // stagger
  const stg = dmg * (opt.stagger || 1) * (1 + (P.stagger || 0)) * (cat === 'hammer' ? 1.5 : cat === 'greatsword' ? 1.2 : 1) * (cat === 'hammer' && hasPassive(s, 'hammer', 2) ? 1.25 : 1) * (opt.charged && cat === 'greatsword' && hasPassive(s, 'greatsword', 4) ? 2 : 1);
  addStagger(s, stg, P);
  // staff fusion
  if (cat === 'staff' && hasPassive(s, 'staff', 4) && has(e, 'burn') && has(e, 'frost')) {
    const td = Math.round(P.arcana * 3 * elemMult(b, 'fire'));
    e.hp = Math.max(0, e.hp - td); delete e.st.burn; delete e.st.frost;
    floater(b, 'e', 'THERMAL SHOCK ' + td, 'crit'); log(b, `Elemental Fusion! Thermal Shock deals ${td}.`, 'good');
  }
  return dmg;
}
function applyElementStatus(s, P, n) {
  const b = s.battle; const e = b.e; const E = ENEMIES[b.enemyId];
  const id = ELEMENTS[P.elem].status; if (!id) return;
  if (id === 'regen') { addStatus(b.p, 'regen', 1, 0); log(b, 'Radiance restores you.', 'good'); return; }
  if (id === 'armorbreak') { breakArmor(s, P); return; }
  if (id === 'burn' && E.ai === 'boss_pyraxis') { log(b, 'Molten Scales: Pyraxis is immune to Burn.', 'info'); return; }
  if (P.elem === 'astral') addStatus(e, 'burn', n, P.attack * 0.12);
  if (id === 'frost') {
    if (addStatus(e, 'frost', n)) {
      if (e.ai === 'boss_pyraxis' || E.ai === 'boss_pyraxis') e.heat = Math.max(0, e.heat - 2);
      if (e.st.frost.n >= 3 && e.ccImm <= 0) { e.skip = 'frozen'; delete e.st.frost; e.frostImm = 3; log(b, `${E.name} is frozen solid!`, 'good'); floater(b, 'e', 'FROZEN', 'status'); }
    }
  } else addStatus(e, id, n, P.attack * (id === 'bleed' ? 0.1 : id === 'poison' ? 0.1 : 0.15));
  if (id !== 'frost') floater(b, 'e', ELEMENTS[P.elem].name, 'status');
}
function breakArmor(s, P) {
  const b = s.battle; const e = b.e; const E = ENEMIES[b.enemyId];
  const extra = P.cat === 'spear' && hasPassive(s, 'spear', 8) ? 2 : 0;
  addStatus(e, 'armorbreak', 1, 0, 3 + extra);
  if (e.plates > 0) { e.plates--; log(b, `A granite plate shatters! (${e.plates} left)`, 'good'); floater(b, 'e', 'PLATE BROKEN', 'crit'); }
  else log(b, `${E.name}'s armor is broken.`, 'good');
}
function addStagger(s, amt, P) {
  const b = s.battle; const e = b.e; const E = ENEMIES[b.enemyId];
  if (e.staggerImm > 0 || e.ccImm > 0 || e.skip) return;
  e.stagger += amt;
  if (e.stagger >= e.staggerMax) {
    e.stagger = 0; e.skip = 'stagger'; e.staggerImm = 3;
    if (e.plates > 0) { e.plates--; log(b, `Staggered! A plate cracks away. (${e.plates} left)`, 'good'); }
    log(b, `${E.name} is staggered and will lose its next action!`, 'good'); floater(b, 'e', 'STAGGER', 'status');
    if (P.cat === 'hammer' && hasPassive(s, 'hammer', 8)) b.p.sta = Math.min(100, b.p.sta + 25);
    if (e.intent && MOVES[e.intent].kind === 'charge') e.nextForced = null;
  }
}

// ---------- player actions ----------
export function availableSkills(s) {
  const w = getItem(s, s.equipped); if (!w) return [];
  return SKILLS[w.cat].filter((k) => (s.mastery[w.cat].lvl >= k.lvl) || k.lvl === 1);
}
export function skillUsable(s, sk) {
  const b = s.battle; const P = playerStats(s);
  let sta = sk.cost.sta || 0;
  if (sk.id === 'gather' && hasPassive(s, 'greatsword', 8)) sta = 0;
  return b.p.sta >= sta && b.p.mana >= (sk.cost.mana || 0) && (sk.cost.mana ? P.maxMana > 0 : true);
}

// act: {type:'attack'|'skill'|'defend'|'special'|'item'|'swap'|'flee', id}
export function playerAction(s, act, timing, st) {
  const b = s.battle; if (!b || b.stage !== 'player' || b.over) return;
  const P = playerStats(s); const E = ENEMIES[b.enemyId]; const e = b.e;
  b.p.defending = false;
  const tm = timing == null ? 1 : timing;
  if (tm >= 1.3) { b.p.fury = Math.min(100, b.p.fury + 10); floater(b, 'p', 'PERFECT', 'perfect'); }
  b.lastActs.push(act.type === 'skill' ? 'skill' : act.type); if (b.lastActs.length > 6) b.lastActs.shift();
  if (E.ai === 'boss_echo') { const k = act.type + ':' + (act.id || ''); if (k === b.lastKey) { e.repeat = Math.min(5, e.repeat + 1); log(b, `The Echo learns your rhythm. (+${e.repeat * 10}% damage)`, 'bad'); } else e.repeat = 0; b.lastKey = k; }
  const counterHit = () => {
    if (has(e, 'counter') && act.type !== 'defend' && act.type !== 'item') {
      delete e.st.counter;
      const d = enemyDamage(s, P, e.atk * 1.2, false);
      log(b, `${E.name} ripostes for ${d}!`, 'bad');
    }
  };
  switch (act.type) {
    case 'attack': {
      const d = hitEnemy(s, P, 1, { timing: tm });
      if (d) log(b, `You strike for ${d}.`);
      b.p.sta = Math.min(100, b.p.sta + 8);
      counterHit();
      break;
    }
    case 'skill': {
      const sk = SKILLS[P.cat].find((k) => k.id === act.id);
      if (!sk || !skillUsable(s, sk)) return;
      b.p.sta -= sk.id === 'gather' && hasPassive(s, 'greatsword', 8) ? 0 : (sk.cost.sta || 0); b.p.mana -= sk.cost.mana || 0;
      doSkill(s, P, sk, tm);
      if (!['riposte', 'shadowstep', 'gather', 'ward'].includes(sk.id)) counterHit();
      break;
    }
    case 'defend': {
      b.p.defending = true;
      b.p.sta = Math.min(100, b.p.sta + 15);
      log(b, 'You raise your guard.');
      break;
    }
    case 'special': {
      if (b.p.fury < 100) return;
      b.p.fury = 0;
      const name = { sword: 'Thousand Cuts', dagger: 'Death\'s Whisper', greatsword: 'Worldsplitter', spear: 'Heavenpiercer', hammer: 'Anvilfall', staff: 'Forgefire Nova', null: 'Forgefire Fist' }[P.cat];
      const d = hitEnemy(s, P, 2.8, { timing: tm, sure: true, breakGuard: true, statusStacks: 2, spell: P.cat === 'staff', stagger: 1.5 });
      log(b, `${name}! The forge's fury deals ${d}.`, 'good');
      if (has(e, 'counter')) delete e.st.counter;
      if (st) st.burst('special');
      break;
    }
    case 'item': {
      const C = CONSUMABLES[act.id];
      if (!C || !(s.consumables[act.id] > 0)) return;
      s.consumables[act.id]--;
      if (C.heal) { const h = Math.round(P.maxHp * C.heal * (has(b.p, 'poison') ? 0.5 : 1)); b.p.hp = Math.min(P.maxHp, b.p.hp + h); floater(b, 'p', '+' + h, 'heal'); log(b, `You drink a ${C.name} (+${h} HP).`, 'good'); }
      if (C.sta) { b.p.sta = Math.min(100, b.p.sta + C.sta); log(b, `+${C.sta} stamina.`, 'good'); }
      if (C.mana) { b.p.mana = Math.min(P.maxMana, b.p.mana + C.mana); log(b, `+${C.mana} mana.`, 'good'); }
      if (C.cleanse) { for (const k of ['burn', 'frost', 'shock', 'bleed', 'poison', 'armorbreak']) delete b.p.st[k]; log(b, 'Your ailments wash away.', 'good'); }
      if (C.full) { b.p.hp = P.maxHp; b.p.sta = 100; b.p.mana = P.maxMana; log(b, 'You feel completely renewed.', 'good'); }
      if (C.bomb) {
        const d = Math.round(Math.max(20, P.attack * 1.6) * elemMult(b, 'fire'));
        e.hp = Math.max(0, e.hp - d); floater(b, 'e', d + '', 'dmg');
        if (E.ai !== 'boss_pyraxis') addStatus(e, 'burn', 2, P.attack * 0.15);
        log(b, `The fire bomb explodes for ${d}.`, 'good');
      }
      break;
    }
    case 'swap': {
      const it = getItem(s, act.id); if (!it) return;
      const ratio = b.p.hp / P.maxHp;
      equip(s, act.id);
      const P2 = playerStats(s);
      b.p.hp = Math.max(1, Math.round(P2.maxHp * ratio));
      b.p.mana = Math.min(b.p.mana, P2.maxMana);
      log(b, `You switch to ${it.name}.`);
      break;
    }
    case 'flee': {
      if (E.boss || E.elite) return;
      if (rnd() < 0.55 + P.speed * 0.012) { log(b, 'You escape!', 'info'); endBattle(s, 'fled', st); return; }
      log(b, 'You fail to escape!', 'bad');
      break;
    }
    default: return;
  }
  if (e.hp <= 0) { endBattle(s, 'win', st); return; }
  if (b.p.hp <= 0) { if (!tryCheatDeath(s, P)) { endBattle(s, 'lose', st); return; } }
  b.stage = 'enemy';
}

function doSkill(s, P, sk, tm) {
  const b = s.battle; const e = b.e;
  const L = (t) => log(b, t);
  switch (sk.id) {
    case 'riposte': b.p.defending = true; addStatus(b.p, 'counter', 1, 1.3); L('You settle into Riposte Stance.'); break;
    case 'cleave': { const d = hitEnemy(s, P, 1.7, { timing: tm }); L(`Cleaving Arc hits for ${d}.`); break; }
    case 'bladedance': { let t = 0; for (let i = 0; i < 3 && e.hp > 0; i++) t += hitEnemy(s, P, 0.75, { timing: tm }); L(`Blade Dance! ${t} total.`); break; }
    case 'twinstrike': { let t = 0; for (let i = 0; i < 2 && e.hp > 0; i++) t += hitEnemy(s, P, 0.65, { timing: tm, crit: 0.2 }); L(`Twin Strike for ${t}.`); break; }
    case 'shadowstep': addStatus(b.p, 'evade', 1); addStatus(b.p, 'nextcrit', 1, 0, 3); L('You melt into the shadows.'); break;
    case 'lacerate': { const d = hitEnemy(s, P, 0.9, { timing: tm }); addStatus(e, 'bleed', 2, P.attack * 0.1); L(`Lacerate cuts for ${d} and opens wounds.`); break; }
    case 'gather': addStatus(b.p, 'charged', 1); b.p.gathering = true; L('You gather your strength.'); break;
    case 'overhead': { const d = hitEnemy(s, P, 2.2, { timing: tm, stagger: 2 }); L(`Overhead Smash crashes down for ${d}!`); break; }
    case 'whirlwind': { const d = hitEnemy(s, P, 1.5, { timing: tm }); breakArmor(s, P); L(`Whirlwind tears through for ${d}.`); break; }
    case 'thrust': { const d = hitEnemy(s, P, 1.3, { timing: tm, pierce: 0.5 }); L(`Piercing Thrust for ${d}.`); break; }
    case 'impale': { const d = hitEnemy(s, P, 1.0, { timing: tm }); addStatus(e, 'bleed', 1, P.attack * 0.1); breakArmor(s, P); L(`Impale for ${d}.`); break; }
    case 'vault': { const d = hitEnemy(s, P, 1.8, { timing: tm }); addStatus(b.p, 'evade', 1); L(`Vault Strike for ${d}. You land out of reach.`); break; }
    case 'crush': { const d = hitEnemy(s, P, 1.5, { timing: tm, stagger: 2 }); L(`Crushing Blow for ${d}.`); break; }
    case 'shieldbreak': { delete e.st.guard; const d = hitEnemy(s, P, 1.1, { timing: tm, breakGuard: true }); breakArmor(s, P); L(`Shield Breaker for ${d}.`); break; }
    case 'earthquake': { const d = hitEnemy(s, P, 1.4, { timing: tm }); addStagger(s, e.staggerMax * 0.5, P); L(`The ground heaves! ${d} damage.`); break; }
    case 'bolt': { const d = hitEnemy(s, P, 1.5, { timing: tm, spell: true, statusMult: 2 }); L(`Arcane Bolt for ${d}.`); break; }
    case 'surge': { const d = hitEnemy(s, P, 0.9, { timing: tm, spell: true, statusStacks: 2 }); L(`Elemental Surge for ${d}.`); break; }
    case 'ward': { b.p.barrier += Math.round(P.arcana * 3); b.p.sta = Math.min(100, b.p.sta + 15); L(`A Mana Ward absorbs the next ${Math.round(P.arcana * 3)} damage.`); break; }
    default: break;
  }
}

function tryCheatDeath(s, P) {
  const b = s.battle;
  if (P.rebirth && !b.p.usedRebirth) { b.p.usedRebirth = true; b.p.hp = Math.round(P.maxHp * 0.3); log(b, 'Rebirth! You rise from the flames.', 'good'); floater(b, 'p', 'REBIRTH', 'perfect'); return true; }
  if (tal(s, 'unbroken') && !b.p.usedUnbroken) { b.p.usedUnbroken = true; b.p.hp = 1; log(b, 'Unbroken! You refuse to fall.', 'good'); floater(b, 'p', 'UNBROKEN', 'perfect'); return true; }
  return false;
}

// Damage to player. Returns actual damage.
function enemyDamage(s, P, raw, isHeavy, defense) {
  const b = s.battle; const e = b.e; const E = ENEMIES[b.enemyId];
  if (has(b.p, 'evade')) { delete b.p.st.evade; floater(b, 'p', 'EVADE', 'miss'); log(b, 'You evade the attack.', 'good'); return 0; }
  raw *= 1 + 0.1 * e.repeat;
  if (has(e, 'frost')) raw *= 1 - 0.1 * e.st.frost.n;
  let dmg = raw * 30 / (30 + P.guard * (has(b.p, 'armorbreak') ? 0.6 : 1));
  if (b.p.defending) dmg *= 1 - P.defendCut;
  if (b.p.gathering) dmg *= 0.75;
  if (defense) dmg *= defense;
  if (has(b.p, 'shock')) { dmg *= 1.25; delete b.p.st.shock; }
  dmg = Math.round(dmg * (0.92 + rnd() * 0.16));
  if (b.p.barrier > 0) { const a = Math.min(b.p.barrier, dmg); b.p.barrier -= a; dmg -= a; if (a) floater(b, 'p', 'Barrier ' + a, 'miss'); }
  dmg = Math.max(0, dmg);
  b.p.hp = Math.max(0, b.p.hp - dmg);
  b.p.fury = Math.min(100, b.p.fury + 5);
  if (dmg) floater(b, 'p', '-' + dmg, isHeavy ? 'crit' : 'dmg');
  return dmg;
}

// Whether the coming enemy action allows a defense timing QTE.
export function needsDefense(s) {
  const b = s.battle; if (!b || b.stage !== 'enemy' || b.e.skip) return null;
  const m = MOVES[b.e.intent]; if (!m) return null;
  const attacking = ['attack', 'heavy', 'multi', 'magic'].includes(m.kind);
  if (!attacking) return null;
  if (b.p.defending) return { mode: 'block', heavy: m.kind === 'heavy' };
  if (m.kind === 'heavy') return { mode: 'dodge', heavy: true };
  return null;
}

// defRes: null | {grade:'perfect'|'good'|'miss'}
export function enemyAction(s, defRes, st) {
  const b = s.battle; if (!b || b.stage !== 'enemy' || b.over) return;
  const P = playerStats(s); const E = ENEMIES[b.enemyId]; const e = b.e;
  // enemy status ticks
  for (const id of ['burn', 'bleed', 'poison']) if (has(e, id)) {
    const d = Math.max(1, Math.round(e.st[id].pow * e.st[id].n * (id === 'bleed' ? 1 : 50 / (50 + e.def * 0.5))));
    e.hp = Math.max(0, e.hp - d); floater(b, 'e', d + '', 'dot'); log(b, `${STATUS_INFO[id].name} deals ${d} to ${E.name}.`);
  }
  if (has(e, 'regen')) { const h = Math.round(e.maxHp * 0.05); e.hp = Math.min(e.maxHp, e.hp + h); }
  if (e.hp <= 0) { endBattle(s, 'win', st); return; }
  delete e.st.guard;
  // phase 2 triggers
  if (!e.enraged && e.hp / e.maxHp < 0.5 && E.boss) {
    e.enraged = true;
    const msg = { boss_grimjaw: 'Grimjaw\'s fur bursts into flame! Its bites now burn.', boss_korrath: 'Korrath\'s eyes blaze. The mountain shakes.', boss_sylvara: 'Sylvara screams. Thorns erupt everywhere.', boss_pyraxis: 'Pyraxis roars. The caldera\'s heat begins to rise!', boss_sovereign: 'The Sovereign\'s crown blazes with stolen starlight.', boss_echo: 'The Echo raises its hammer as you once did.' }[E.ai];
    if (msg) log(b, msg, 'bad');
    e.atk *= 1.12;
  }
  const defMult = !defRes ? 1 : defRes.grade === 'perfect' ? (b.p.defending ? 0.25 : 0.5) : defRes.grade === 'good' ? (b.p.defending ? 0.7 : 0.85) : 1;
  if (defRes && defRes.grade === 'perfect') { floater(b, 'p', b.p.defending ? 'PERFECT BLOCK' : 'DEFLECT', 'perfect'); b.p.fury = Math.min(100, b.p.fury + 10); }
  if (e.skip) {
    log(b, `${E.name} is ${e.skip === 'frozen' ? 'frozen' : 'staggered'} and cannot act.`, 'good');
    e.skip = null; e.ccImm = 2;
    if (MOVES[e.intent] && MOVES[e.intent].kind === 'charge') log(b, 'Its charged attack is broken!', 'good');
  } else {
    const mid = e.intent; const m = MOVES[mid];
    const emp = has(e, 'empower') && ['attack', 'heavy', 'multi', 'magic'].includes(m.kind) ? 1.5 : 1;
    if (emp > 1) delete e.st.empower;
    let atk = e.atk * emp;
    if (E.ai === 'boss_grimjaw' && e.enraged && mid === 'bite') addStatus(b.p, 'burn', 1, e.atk * 0.15);
    const doHit = (mult, heavy) => {
      const d = enemyDamage(s, P, atk * mult, heavy, defMult);
      return d;
    };
    switch (m.kind) {
      case 'attack': case 'magic': case 'heavy': {
        const d = doHit(m.mult, m.kind === 'heavy');
        log(b, `${E.name} uses ${m.name} for ${d}.`, 'bad');
        if (m.status && d > 0 && rnd() < m.status[1]) { addStatus(b.p, m.status[0], 1, e.atk * 0.12); if (m.status[0] === 'frost' && b.p.st.frost && b.p.st.frost.n >= 3 && b.p.ccImm <= 0) { b.p.frozen = true; delete b.p.st.frost; b.p.frostImm = 3; log(b, 'You are frozen and will lose your next turn!', 'bad'); } else log(b, `You suffer ${STATUS_INFO[m.status[0]].name}.`, 'bad'); }
        if (m.steal && d > 0) { const g = Math.min(s.player.gold, ri(3, 8) * REGIONS[E.region].tier); s.player.gold -= g; if (g) log(b, `${E.name} steals ${g} gold!`, 'bad'); b.stolen = (b.stolen || 0) + g; }
        if (m.stagger && d > 0 && !b.p.defending) { b.p.sta = Math.max(0, b.p.sta - 25); log(b, 'The blow knocks the wind out of you (−25 stamina).', 'bad'); }
        break;
      }
      case 'multi': { let t = 0; for (let i = 0; i < m.hits; i++) t += doHit(m.mult, false); log(b, `${E.name} uses ${m.name}: ${m.hits} hits for ${t}.`, 'bad'); break; }
      case 'guard': addStatus(e, 'guard', 1); log(b, `${E.name} raises its guard.`); break;
      case 'counter': addStatus(e, 'counter', 1, 0, 2); log(b, `${E.name} takes a Riposte Stance. Attacking now will provoke a counter.`, 'info'); break;
      case 'charge': e.nextForced = m.next; log(b, `${E.name}: ${m.tele}`, 'info'); break;
      case 'buff': addStatus(e, 'empower', 1); log(b, `${E.name} uses ${m.name}. Its next attack is empowered.`, 'info'); break;
      case 'heal': { const h = Math.round(e.maxHp * m.amt * (has(e, 'poison') ? 0.5 : 1)); e.hp = Math.min(e.maxHp, e.hp + h); e.heals++; floater(b, 'e', '+' + h, 'heal'); log(b, `${E.name} heals ${h}.`, 'bad'); break; }
      case 'plates': e.plates = Math.min(3, e.plates + 1); log(b, `Korrath regrows a granite plate. (${e.plates})`, 'bad'); break;
      case 'thorns': addStatus(e, 'thorns', 1, 0, 2); log(b, 'A shell of thorns surrounds Sylvara!', 'bad'); break;
      case 'phase': e.phase = e.phase === 'astral' ? 'void' : 'astral'; log(b, `The Sovereign shifts into its ${e.phase === 'astral' ? 'Astral' : 'Void'} phase. ${e.phase === 'astral' ? 'Void' : 'Radiance and Astral'} weapons now harm it most.`, 'info'); break;
      case 'mirror': { e.mirror = P.elem; log(b, `The Echo copies your weapon${P.elem !== 'none' ? ' and now resists ' + ELEMENTS[P.elem].name : ''}.`, 'info'); break; }
      default: break;
    }
    // counter on perfect block
    if (defRes && defRes.grade === 'perfect' && b.p.defending && ['attack', 'heavy', 'multi', 'magic'].includes(m.kind)) {
      const cmult = has(b.p, 'counter') ? 1.3 : (P.cat === 'sword' && hasPassive(s, 'sword', 2)) ? 0.8 : 0;
      if (cmult) { const d = hitEnemy(s, P, cmult, { forceCrit: P.cat === 'sword' && hasPassive(s, 'sword', 8), sure: true }); log(b, `Counterattack for ${d}!`, 'good'); }
    } else if (has(b.p, 'counter') && ['attack', 'heavy', 'multi', 'magic'].includes(m.kind)) {
      const d = hitEnemy(s, P, 1.0, { sure: true }); log(b, `Riposte for ${d}.`, 'good');
    }
    delete b.p.st.counter;
  }
  // Pyraxis heat
  if (E.ai === 'boss_pyraxis' && e.enraged) { e.heat = Math.min(6, e.heat + 1); const d = Math.round(P.maxHp * 0.01 * e.heat); b.p.hp = Math.max(1, b.p.hp - d); log(b, `The rising heat sears you for ${d}. (Heat ${e.heat}; Frost cools it)`, 'bad'); }
  if (e.hp <= 0) { endBattle(s, 'win', st); return; }
  if (b.p.hp <= 0 && !tryCheatDeath(s, P)) { endBattle(s, 'lose', st); return; }
  startPlayerTurn(s, st);
}

function tickStatuses(t) {
  for (const k in t.st) { t.st[k].t--; if (t.st[k].t <= 0) delete t.st[k]; }
  if (t.frostImm > 0) t.frostImm--; if (t.ccImm > 0) t.ccImm--; if (t.staggerImm > 0) t.staggerImm--;
}

function startPlayerTurn(s, st) {
  const b = s.battle; const P = playerStats(s); const e = b.e;
  b.turn++;
  b.p.gathering = false;
  tickStatuses(e);
  // player dots
  for (const id of ['burn', 'bleed', 'poison']) if (has(b.p, id)) {
    const d = Math.max(1, Math.round(b.p.st[id].pow * b.p.st[id].n * (id === 'bleed' ? 1 : 30 / (30 + P.guard * 0.5))));
    b.p.hp = Math.max(0, b.p.hp - d); floater(b, 'p', '-' + d, 'dot'); log(b, `${STATUS_INFO[id].name} deals ${d} to you.`, 'bad');
  }
  if (has(b.p, 'regen')) { const h = Math.round(P.maxHp * 0.05 * (has(b.p, 'poison') ? 0.5 : 1)); b.p.hp = Math.min(P.maxHp, b.p.hp + h); floater(b, 'p', '+' + h, 'heal'); }
  tickStatuses(b.p);
  if (b.p.hp <= 0 && !tryCheatDeath(s, P)) { endBattle(s, 'lose', st); return; }
  b.p.sta = Math.min(100, b.p.sta + P.staRegen);
  b.p.mana = Math.min(P.maxMana, b.p.mana + P.manaRegen);
  chooseIntent(s);
  if (b.p.frozen) {
    b.p.frozen = false; b.p.ccImm = 2; log(b, 'You are frozen and lose your turn.', 'bad');
    b.stage = 'enemy';
    return;
  }
  b.stage = 'player';
}

export function endBattle(s, result, st) {
  const b = s.battle; const E = ENEMIES[b.enemyId];
  b.over = result; b.stage = 'over';
  const P = playerStats(s);
  const rw = { xp: 0, gold: 0, mats: [], unlocks: [] };
  if (result === 'win') {
    const sc = 1 + 0.2 * s.legacy.count;
    rw.xp = gainXP(s, E.xp * sc, st);
    rw.gold = goldGain(s, ri(E.gold[0], E.gold[1]) * sc + (b.stolen || 0));
    for (const [mat, ch, lo, hi] of E.drops) {
      if (rnd() < ch) {
        const n = ri(lo, hi) + (E.boss && tal(s, 'fortune') ? 1 : 0) + (b.ctx.bonus === 'hoard' ? 1 : 0);
        const q = E.boss ? 2 : E.elite ? 1 : rnd() < 0.1 ? 1 : 0;
        addMat(s, mat, n, MATS[mat].kind === 'metal' || MATS[mat].kind === 'gem' ? q : 0, st); rw.mats.push([mat, n]);
      }
    }
    if (b.ctx.bonus === 'hoard') { const g = goldGain(s, 10 * REGIONS[E.region].tier); rw.gold += g; }
    if (P.cat) gainMastery(s, P.cat, E.xp * 0.7 * (E.boss ? 1.5 : 1), st);
    s.codex.enemies[b.enemyId].kills = (s.codex.enemies[b.enemyId].kills || 0) + 1;
    s.stats.wins++;
    if (E.boss || E.elite) {
      const first = !s.bosses[b.enemyId];
      s.bosses[b.enemyId] = (s.bosses[b.enemyId] || 0) + 1;
      if (first && E.boss) {
        const next = { grimjaw: 'ironspine', korrath: 'wilds', sylvara: 'ashen', pyraxis: 'astral' }[b.enemyId];
        if (next) { unlockRegion(s, next, st); rw.unlocks.push('Region: ' + ({ ironspine: 'Ironspine Highlands', wilds: 'Whispering Wilds', ashen: 'Ashen Wastes', astral: 'Astral Expanse' })[next]); }
        if (st) st.burst('boss');
      }
    }
    s.player.hp = Math.min(P.maxHp, b.p.hp + Math.round(P.maxHp * 0.15));
    track(s, 'win', { enemy: b.enemyId }, st);
  } else if (result === 'lose') {
    const lost = Math.floor(s.player.gold * 0.1);
    s.player.gold -= lost; rw.lost = lost;
    s.stats.losses++;
    s.player.loc = 'hearth';
    s.player.hp = P.maxHp;
  } else {
    s.player.hp = Math.max(1, b.p.hp);
  }
  b.rewards = rw;
}
export function closeBattle(s) { s.battle = null; }

export { CATEGORIES, LOCATIONS };
