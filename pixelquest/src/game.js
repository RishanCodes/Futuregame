/* PIXEL QUEST — game core: state, maps, spawning, interaction, combat, loot, progression, persistence */
'use strict';
(function () {
  const T = PQ.T, TL = PQ.TILE, U = PQ.U, D = PQ.D, Inv = PQ.Inv, FX = PQ.FX, Ent = PQ.Ent;
  const G = (PQ.G = { maps: {}, ents: [], t: 0, running: false, fogs: {} });

  /* =========================================================
     world persistence layer
     ========================================================= */
  const W2 = (PQ.World2 = {
    rec(mapId) { const w = G.save.world; return (w[mapId] = w[mapId] || { gone: {}, opened: {}, tiles: {}, flags: {} }); },
    apply(m) {
      const r = W2.rec(m.id);
      m.byId = {};
      for (const o of m.objs) m.byId[o.id] = o;
      for (const id in r.opened) if (m.byId[id]) m.byId[id].opened = 1;
      for (const id in r.gone) { const o = m.byId[id]; if (!o) continue; if (o.k === 'ruinwall' || o.k === 'decor') m.removeObj(o); else if (o.k === 'bush') o.picked = 1; else o.gone = 1; }
      for (const i in r.tiles) m.tiles[+i] = r.tiles[i];
      if (r.flags.bar != null) m.barState = r.flags.bar;
      for (const id in r.flags) if (id.startsWith('open:') && m.byId[id.slice(5)]) m.byId[id.slice(5)].open = 1, m.byId[id.slice(5)].solid = false;
      for (const id in r.flags) if (id.startsWith('plate:') && m.byId[id.slice(6)]) m.byId[id.slice(6)].on = 1;
      m.chunks.clear(); m._mapDirty = true;
    },
    gone(m, o, days) {
      const r = W2.rec(m.id);
      r.gone[o.id] = { d: G.save.day, r: days };
      if (o.k === 'bush') o.picked = 1; else if (o.k === 'ruinwall') m.removeObj(o); else o.gone = 1;
      m._mapDirty = true;
    },
    setTile(m, x, y, t) { W2.rec(m.id).tiles[m.idx(x, y)] = t; },
    flag(m, k, v) { W2.rec(m.id).flags[k] = v; },
    respawn() {
      const day = G.save.day;
      for (const mid in G.save.world) {
        const r = G.save.world[mid];
        for (const id in r.gone) {
          const g = r.gone[id];
          if (g.r && day >= g.d + g.r) {
            delete r.gone[id];
            const m = G.maps[mid]; const o = m && m.byId && m.byId[id];
            if (o) { o.gone = 0; o.picked = 0; o.hits = 0; }
          }
        }
      }
    },
  });

  /* =========================================================
     lifecycle
     ========================================================= */
  G.newGame = function (slot, name, look) {
    const s = PQ.Save.fresh(slot, name, look);
    PQ.Save.starter(s);
    G.load(s, true);
  };
  G.load = function (save, isNew) {
    G.save = save;
    G.maps = {}; G.fogs = {};
    G.maps.world = PQ.World.genOverworld(save.seed);
    W2.apply(G.maps.world);
    if (save.events.bridge) G.buildBridge(true);
    if (save.events.gate) G.openPortal(true);
    G.maps.home = PQ.World.genHome(save.home.upgraded);
    G.placeDecor();
    G.fogs.world = new PQ.Fog(G.maps.world.w, G.maps.world.h, save.fog.world);
    G.recalc();
    G.player = new Ent.Player(save.look);
    if (isNew) {
      save.hp = G.stats.maxHp; save.mp = G.stats.maxMp; save.sta = G.stats.maxSta;
      PQ.Time.roll && 0;
      PQ.Weather.roll();
      G.enterMap('home', 'entry', true);
      PQ.Quests.start('m1', true);
      PQ.UI.banner('Pixel Quest', 'Day 1 - The tremors begin');
      setTimeout(() => PQ.UI.dialog({ name: 'Narrator', text: 'You wake in your cottage on the edge of Willowbrook. The ground has been shaking at night... Elder Maren will know what is happening. Step outside and find her in the village square.' }), 600);
    } else {
      const p = save.pos || { map: 'home', x: 6 * T, y: 7 * T };
      G.enterMap(p.map, { x: p.x, y: p.y }, true);
    }
    PQ.Quests.check();
    G.running = true; G.lastSave = 0; G.autosaveT = 0;
  };

  G.getMap = function (id) {
    if (G.maps[id]) return G.maps[id];
    let m;
    if (id === 'shadow') m = PQ.World.genShadow(G.save.seed);
    else if (id.startsWith('dng_')) m = PQ.World.genDungeon(id.slice(4), G.save.seed);
    else if (id === 'home') m = PQ.World.genHome(G.save.home.upgraded);
    if (!m) return null;
    W2.apply(m);
    G.maps[id] = m;
    if (!G.fogs[id]) G.fogs[id] = new PQ.Fog(m.w, m.h, G.save.fog[id]);
    return m;
  };

  G.enterMap = function (id, where, instant) {
    const go = () => {
      const m = G.getMap(id);
      if (!m) return;
      G.map = m;
      G.ents = [];
      FX.clear(); Ent.clearTimers();
      G.bossFight = null; G.darkPhase = 0; G.pull = null;
      let x, y;
      if (typeof where === 'string') { const sp = m.spots[where] || m.spots.entry || { x: 5, y: 5 }; x = sp.x * T + 8; y = sp.y * T + 12; }
      else { x = where.x; y = where.y; }
      const p = G.player;
      p.x = x; p.y = y; p.state = 'idle'; p.atk = null; p.roll = null; p.hop = null; p.charging = false; p.inv = 1;
      // nudge out of walls
      if (Ent.blocked(m, p.x, p.y, p.hw, p.hh, false, p)) { outer: for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (!Ent.blocked(m, p.x + dx * 8, p.y + dy * 8, p.hw, p.hh, false, p)) { p.x += dx * 8; p.y += dy * 8; break outer; } } }
      G.snapCam = true;
      for (const mb of m.mobs) G.spawnEnemy(mb.e, mb.x * T + 8, mb.y * T + 12, { fixed: 1 });
      if (m.id === 'world') G.spawnNPCs();
      G.spawnCompanion();
      G.region = null;
      G.updateRegion(true);
      if (m.kind === 'dungeon') PQ.UI.banner(m.name, PQ.D.REGIONS[m.def.region].name);
      if (m.id === 'home') PQ.UI.banner('Home', 'Sleep, store, craft and cook');
      PQ.Audio.music(m.music || (D.REGIONS[G.region] ? D.REGIONS[G.region].music : 'meadow'));
      if (!instant) G.autosave();
    };
    if (instant) go(); else PQ.UI.fade(go);
  };

  G.updateRegion = function (force) {
    const m = G.map, p = G.player;
    if (m.kind !== 'overworld') { G.region = m.def ? m.def.region : 'greenfields'; return; }
    const r = m.region(Math.floor(p.x / T), Math.floor(p.y / T));
    if (r !== G.region) {
      const first = !G.save.regions || !G.save.regions[r];
      G.save.regions = G.save.regions || {}; G.save.regions[r] = 1;
      G.region = r;
      G.ents = G.ents.filter((e) => !(e.isEnemy && !e.fixed && !e.isBoss) || e.dead);
      if (!force || first) PQ.UI.banner(D.REGIONS[r].name, first ? 'Discovered!' : '');
      if (first && !force) G.gainXp(30 * D.REGIONS[r].tier);
      PQ.Audio.music(D.REGIONS[r].music);
      G.save.locName = D.REGIONS[r].name;
    }
  };

  G.recalc = function () {
    G.stats = PQ.Stats.compute(G.save);
    const s = G.save;
    s.hp = Math.min(s.hp, G.stats.maxHp); s.mp = Math.min(s.mp, G.stats.maxMp); s.sta = Math.min(s.sta, G.stats.maxSta);
  };
  G.skill = (id) => G.save.skills[id] || 0;

  G.autosave = function () {
    if (!G.save || G.player.state === 'dead') return false;
    const p = G.player;
    if (G.map) G.save.pos = { map: G.map.kind === 'dungeon' && G.bossFight ? G.map.id : G.map.id, x: p.x, y: p.y };
    const ok = PQ.Save.write(G.save, G.fogs);
    G.lastSave = Date.now();
    PQ.UI.saveIndicator(ok);
    return ok;
  };

  /* =========================================================
     main update
     ========================================================= */
  G.update = function (dt, inp) {
    const s = G.save, p = G.player, st = G.stats;
    G.t += dt; s.played += dt;
    if (G.hitstop > 0) { G.hitstop -= dt; dt *= 0.08; }
    PQ.Time.update(dt);
    for (const k in s.buffs) if (s.buffs[k] > 0) { s.buffs[k] -= dt; if (s.buffs[k] <= 0) { delete s.buffs[k]; G.recalc(); } }
    Ent.tickTimers(dt);
    // regen
    const combat = G.ents.some((e) => e.isEnemy && !e.dead && !e.dormant && U.dist(e.x, e.y, p.x, p.y) < 140);
    G.inCombat = combat;
    if (!p.atk && !p.roll && p.state !== 'run') s.sta = Math.min(st.maxSta, s.sta + 28 * st.staRegen * dt);
    s.mp = Math.min(st.maxMp, s.mp + 2.2 * st.mpRegen * dt);
    if (st.regen) s.hp = Math.min(st.maxHp, s.hp + st.regen * dt);
    if (!combat && s.hp < st.maxHp) s.hp = Math.min(st.maxHp, s.hp + 0.6 * dt);
    G.updatePlayer(dt, inp);
    // entities
    for (const e of G.ents) if (!e.dead || e.dying) e.update(dt, G);
    G.ents = G.ents.filter((e) => !e.dead || (e.isEnemy && e.deathT > 0 && (e.deathT -= dt) > 0));
    FX.update(dt);
    PQ.Fishing.update(dt, G, inp.hold.attack || inp.hold.interact, inp.press.attack || inp.press.interact);
    // fog of war & region
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
    if (Math.floor(G.t * 4) !== Math.floor((G.t - dt) * 4)) { const f = G.fogs[G.map.id]; if (f) f.reveal(tx, ty, G.map.kind === 'dungeon' ? 7 : 11); G.updateRegion(); }
    G.spawnTick(dt);
    G.envTick(dt);
    G.bossTick(dt);
    // autosave
    G.autosaveT += dt;
    if (G.autosaveT > 90) { G.autosaveT = 0; if (!G.bossFight) G.autosave(); }
  };

  /* environment: cold, lava crust, quicksand pull, plates */
  G.envTick = function (dt) {
    const p = G.player, m = G.map, s = G.save;
    const tx = Math.floor(p.x / T), ty = Math.floor((p.y - 2) / T);
    G.cold = 0;
    if (m.id === 'world' && m.region(tx, ty) === 'frostfall' && G.stats.ice < 25) {
      let warm = false;
      for (const o of m.objs) if (o.warm && Math.abs(o.x - tx) < 5 && Math.abs(o.y - ty) < 5) { warm = true; break; }
      if (!warm && !m.safe.some(([a, b, c, d]) => tx >= a && tx <= c && ty >= b && ty <= d)) {
        G.coldT = (G.coldT || 0) + dt; G.cold = 1;
        if (G.coldT > 3) { G.coldDmg = (G.coldDmg || 0) + dt; if (G.coldDmg > 1.5) { G.coldDmg = 0; G.hurtPlayer(G.stats.maxHp * 0.04, null, null, null, true); FX.text(p.x, p.y - 22, 'Freezing!', '#a8e8ff'); if (!G.coldTip) { G.coldTip = 1; PQ.UI.toast('Freezing! Wear a Fur Cloak (Workbench: 5 Pelts, 6 Fiber) or stay near campfires.', 'warn'); } } }
      } else G.coldT = 0;
    } else G.coldT = 0;
    // lava crust timers
    if (G.crust) for (let i = G.crust.length - 1; i >= 0; i--) { const c = G.crust[i]; c.t -= dt; if (c.t <= 0) { const pt = Math.floor(p.x / T), py2 = Math.floor((p.y - 2) / T); if (Math.abs(pt - c.x) <= 1 && Math.abs(py2 - c.y) <= 1) { c.t = 2; continue; } if (m.id === 'world') m.set(c.x, c.y, TL.LAVA); G.crust.splice(i, 1); } }
    // vortex pull
    if (G.pull) { G.pull.t -= dt; const a = Math.atan2(G.pull.y - p.y, G.pull.x - p.x); Ent.move(p, Math.cos(a) * G.pull.s * dt, Math.sin(a) * G.pull.s * dt, m); if (G.pull.t <= 0) G.pull = null; }
    // pressure plates
    if (m.kind === 'dungeon') {
      const o = m.obj(tx, ty);
      if (o && o.k === 'plate' && !o.on) {
        o.on = 1; W2.flag(m, 'plate:' + o.id, 1); PQ.Audio.play('click'); FX.burst(tx * T + 8, ty * T + 8, '#9dffd0', 8);
        const group = m.objs.filter((q) => q.k === 'plate' && q.group === o.group);
        if (group.every((q) => q.on)) { for (const d of m.objs) if (d.k === 'door' && d.lock === 'plates' && d.group === o.group) G.openDoor(d); PQ.UI.toast('The sealed door grinds open!'); }
        else PQ.UI.toast(group.filter((q) => q.on).length + ' of ' + group.length + ' plates pressed');
      }
    }
    // status effects on the player
    const stt = p.status;
    for (const k in stt) if (stt[k] > 0) stt[k] -= dt;
    if (stt.poison > 0 || stt.burn > 0) { G.dotT = (G.dotT || 0) + dt; if (G.dotT > 0.8) { G.dotT = 0; G.hurtPlayer(G.stats.maxHp * (stt.burn > 0 ? 0.025 : 0.018), null, null, null, true); FX.burst(p.x, p.y - 8, stt.burn > 0 ? '#ff9a2e' : '#9a6aff', 3, { speed: 10, up: 30, grav: -20 }); } }
  };

  /* walkability that knows about the Glacier Charm */
  G.walkAt = function (tx, ty, ent) {
    const m = G.map;
    const w = m.walk(tx, ty);
    if (w === 0 && ent && ent.isPlayer && m.t(tx, ty) === TL.LAVA && Inv.count(G.save, 'glacier_charm') && m.id === 'world') {
      m.set(tx, ty, TL.CRUST); G.crust = G.crust || []; G.crust.push({ x: tx, y: ty, t: 14 });
      FX.burst(tx * T + 8, ty * T + 8, ['#a8e8ff', '#ffffff'], 6, { speed: 30 });
      if (!G.crustTip) { G.crustTip = 1; PQ.UI.toast('The Glacier Charm cools the lava beneath your feet!'); }
      return 1;
    }
    return w;
  };

  /* =========================================================
     player control
     ========================================================= */
  G.updatePlayer = function (dt, inp) {
    const p = G.player, s = G.save, st = G.stats, m = G.map;
    p.t += dt;
    if (p.flash > 0) p.flash -= dt;
    if (p.inv > 0) p.inv -= dt;
    if (p.comboT > 0) p.comboT -= dt;
    if (p.cd > 0) p.cd -= dt;
    if (p.state === 'dead') return;
    if (Math.abs(p.kbx) + Math.abs(p.kby) > 1) { Ent.move(p, p.kbx * dt, p.kby * dt, m); p.kbx *= 1 - dt * 10; p.kby *= 1 - dt * 10; }
    if (p.state === 'fish') { if (inp.press.dodge || Math.hypot(inp.mx, inp.my) > 0.6) PQ.Fishing.stop('You reel in your line.'); return; }
    // ledge hop
    if (p.hop) {
      p.hop.t += dt; const k = Math.min(1, p.hop.t / p.hop.dur);
      p.x = U.lerp(p.hop.x0, p.hop.x1, k); p.y = U.lerp(p.hop.y0, p.hop.y1, k);
      if (k >= 1) { p.hop = null; FX.dust(p.x, p.y); PQ.Audio.play('land'); }
      return;
    }
    // dodge roll
    if (p.roll) {
      p.roll.t += dt;
      const k = 1 - p.roll.t / p.roll.dur;
      Ent.move(p, p.roll.dx * 190 * k * dt, p.roll.dy * 190 * k * dt, m);
      if (Math.random() < 0.4) FX.dust(p.x, p.y);
      if (p.roll.t >= p.roll.dur) p.roll = null;
      return;
    }
    // aim
    let mx = inp.mx, my = inp.my;
    const mag = Math.hypot(mx, my);
    let aim = p.ang;
    if (inp.aim != null) aim = inp.aim;
    else if (mag > 0.2) aim = Math.atan2(my, mx);
    // auto-aim assist on touch / no mouse: nearest enemy roughly ahead
    if (inp.autoAim && (inp.press.attack || p.charging)) { const t = G.nearestEnemy(p.x, p.y, 120, mag > 0.2 ? aim : null); if (t) aim = Math.atan2(t.y - 6 - (p.y - 6), t.x - p.x); }
    // dodge
    if (inp.press.dodge && !p.swimming) {
      const cost = st.rollCost;
      if (s.sta >= cost) {
        s.sta -= cost;
        const a = mag > 0.2 ? Math.atan2(my, mx) : (p.face === 'left' ? Math.PI : p.face === 'right' ? 0 : p.face === 'up' ? -Math.PI / 2 : Math.PI / 2);
        p.roll = { t: 0, dur: 0.32, dx: Math.cos(a), dy: Math.sin(a) };
        p.inv = Math.max(p.inv, 0.26); p.atk = null; p.charging = false;
        PQ.Audio.play('roll');
        return;
      } else FX.text(p.x, p.y - 24, 'Tired!', '#ffd75a', false, 0.6);
    }
    // ability & quick items
    if (inp.press.ability) G.useAbility(aim);
    for (let i = 0; i < 4; i++) if (inp.press['q' + i]) G.useHot(i);
    // interact
    if (inp.press.interact) { if (!G.interact()) { /* nothing */ } }
    // attack
    G.handleAttack(dt, inp, aim);
    // movement
    const swim = p.swimming, climb = p.climbing;
    let speed = 66 * (1 + st.spd / 100);
    const running = (inp.run || mag > 0.95 && inp.touch) && mag > 0.2 && s.sta > 5 && !swim && !climb;
    if (running) { speed *= 1.42; s.sta -= 7 * dt; }
    if (swim) speed *= 0.55; if (climb) speed *= 0.6;
    if (p.atk) speed *= p.atk.move != null ? p.atk.move : 0.35;
    if (p.charging) speed *= 0.5;
    if (p.status.chill > 0) speed *= 0.6;
    if (PQ.Weather.cur() === 'sandstorm') speed *= 0.9;
    if (mag > 0.15) {
      const k = Math.min(1, mag);
      const dx = mx / mag * speed * k * dt, dy = my / mag * speed * k * dt;
      // ledge: walking south into a cliff with open ground beyond
      const fx = Math.floor(p.x / T), fy = Math.floor((p.y + dy + 2) / T);
      if (dy > 0 && Math.abs(dy) > Math.abs(dx) && m.t(fx, fy) === TL.CLIFF && m.kind === 'overworld') {
        const land = [fy + 1, fy + 2].find((yy) => G.walkAt(fx, yy, p) && m.t(fx, yy) !== TL.CLIFF);
        if (land != null) { p.hop = { t: 0, dur: 0.38, x0: p.x, y0: p.y, x1: fx * T + 8, y1: land * T + 10 }; PQ.Audio.play('jump'); p.face = 'down'; return; }
      }
      Ent.move(p, dx, dy, m);
      if (!p.atk && !p.charging) p.face = Ent.dirOf(Math.atan2(my, mx));
      p.state = running ? 'run' : 'walk';
      p.animT += dt * (running ? 1.5 : 1);
      if (running && Math.random() < 0.15) FX.dust(p.x, p.y);
    } else { p.state = 'idle'; p.animT += dt; }
    if (p.atk && p.atk.lock != null) { p.face = Ent.dirOf(p.atk.lock); p.ang = p.atk.lock; }
    else { if (p.atk || p.charging) p.face = Ent.dirOf(aim); p.ang = aim; }
  };

  G.nearestEnemy = function (x, y, r, dirAng) {
    let best = null, bd = r;
    for (const e of G.ents) {
      if (!e.isEnemy || e.dead || e.dormant || e.untargetable) continue;
      const d = U.dist(x, y, e.x, e.y);
      if (d > bd) continue;
      if (dirAng != null && Math.abs(U.angDiff(dirAng, Math.atan2(e.y - y, e.x - x))) > 1.3) continue;
      bd = d; best = e;
    }
    return best;
  };

  /* ---------------- attacks ---------------- */
  G.handleAttack = function (dt, inp, aim) {
    const p = G.player, s = G.save, st = G.stats, w = st.weapon;
    if (p.swimming) { if (inp.press.attack) FX.text(p.x, p.y - 24, "Can't attack while swimming", '#a8e8ff', false, 0.8); return; }
    const cls = w.wclass;
    // swing in progress
    if (p.atk) {
      const a = p.atk;
      a.t += dt;
      a.ang = a.lock != null ? a.lock : a.ang;
      if (!a.hit && a.t >= a.dur * (a.hitAt || 0.35)) { a.hit = true; G.meleeHit(a); }
      if (a.lunge && a.t < a.dur * 0.6) Ent.move(p, Math.cos(a.ang) * 180 * dt, Math.sin(a.ang) * 180 * dt, G.map);
      if (inp.press.attack && a.t > a.dur * 0.45) p.buffered = true;
      if (a.t >= a.dur) { p.atk = null; if (p.buffered) { p.buffered = false; G.swing(aim, false); } }
      return;
    }
    const ranged = cls === 'bow', magic = cls === 'staff';
    if (inp.press.attack) {
      p.chargeStart = G.t;
      if (ranged) { p.charging = true; p.charge = 0; }
      else if (magic) { G.castBolt(aim, false); p.charging = true; p.charge = -0.3; }
      else { G.swing(aim, false); p.charging = true; p.charge = -0.2; }
    }
    if (p.charging) {
      if (inp.hold.attack) { p.charge += dt; if (p.charge > 0.05 && Math.floor(p.charge * 10) !== Math.floor((p.charge - dt) * 10) && p.charge >= p.chargeMax() && p.charge - dt < p.chargeMax()) PQ.Audio.play('charged'); }
      else {
        const full = p.charge >= p.chargeMax();
        p.charging = false;
        if (ranged) G.fireArrow(aim, U.clamp(p.charge / p.chargeMax(), 0.15, 1));
        else if (magic && full) G.castBolt(aim, true);
        else if (full) G.swing(aim, true);
        p.charge = 0;
      }
    }
  };
  G.swing = function (aim, charged) {
    const p = G.player, s = G.save, st = G.stats, w = st.weapon;
    const cls = w.wclass;
    const cost = charged ? 22 : cls === 'greatsword' ? 14 : cls === 'dagger' ? 4 : 7;
    if (s.sta < cost * 0.5) { FX.text(p.x, p.y - 24, 'Tired!', '#ffd75a', false, 0.6); return; }
    s.sta = Math.max(0, s.sta - cost);
    const maxC = cls === 'dagger' ? 4 : cls === 'greatsword' ? 2 : 3;
    p.combo = p.comboT > 0 ? (p.combo + 1) % maxC : 0; p.comboT = 0.7;
    const last = p.combo === maxC - 1;
    const a = { t: 0, dur: 1 / w.rate * (charged ? 1.5 : 1), ang: aim, arc: w.arc, range: w.range, dir: p.combo % 2 ? -1 : 1, mult: (last ? 1.35 : 1) * (charged ? (cls === 'greatsword' ? 2.6 : cls === 'dagger' ? 1.9 : 2.3) : 1), kb: w.kb * (last ? 1.6 : 1), charged, hitAt: 0.35 };
    if (charged && cls === 'sword') { a.spin = 1; a.range += 6; }
    if (charged && cls === 'dagger') { a.lunge = 1; a.thrust = 1; a.hitAt = 0.45; p.inv = Math.max(p.inv, 0.3); }
    if (charged && cls === 'greatsword') { a.slam = 1; a.hitAt = 0.55; }
    if (cls === 'dagger' && !charged) a.thrust = p.combo % 2 === 1;
    if (cls === 'greatsword') a.move = 0.15;
    p.atk = a;
    PQ.Audio.play(charged ? 'heavy' : cls === 'greatsword' ? 'swingHeavy' : 'swing');
  };
  G.meleeHit = function (a) {
    const p = G.player, st = G.stats, w = st.weapon;
    const px = p.x, py = p.y - 6;
    let hits = 0;
    const base = w.dmg * a.mult * st.meleeMult;
    if (a.slam) {
      const cx = px + Math.cos(a.ang) * 20, cy = py + Math.sin(a.ang) * 14;
      FX.hazard({ kind: 'circle', x: cx, y: cy + 6, r: 40, delay: 0, dmg: base, friendly: 1, color: '#e8dcc0', el: w.element, shake: 0.5, sfx: 'thud' });
      return;
    }
    for (const e of G.ents) {
      if (e.dead || e.untargetable) continue;
      if (!(e.isEnemy || (e.isCritter && e.wild))) continue;
      const d = U.dist(px, py, e.x, e.y - (e.hit_h || 6));
      if (d > a.range + e.r) continue;
      if (!a.spin && Math.abs(U.angDiff(a.ang, Math.atan2(e.y - (e.hit_h || 6) - py, e.x - px))) > a.arc / 2 + 0.25 && d > e.r + 4) continue;
      if (e.isCritter) { G.hitCritter(e, base); continue; }
      if (e.dormant) e.dormant = false;
      G.damageEnemy(e, base, { kb: a.kb, fx: px, fy: py, el: w.element, melee: 1, heavy: a.charged || w.wclass === 'greatsword' });
      hits++;
    }
    // world interactions by weapon: crystal switches, grass
    const tx = Math.floor((px + Math.cos(a.ang) * 14) / T), ty = Math.floor((py + 6 + Math.sin(a.ang) * 12) / T);
    const o = G.map.obj(tx, ty);
    if (o && o.k === 'switch') G.hitSwitch(o);
    if (!hits) { if (st.passives.has('wave') && G.save.hp >= G.stats.maxHp - 0.5) G.shoot({ kind: 'orb', color: '#c8d0ff', ang: a.ang, spd: 200, dmg: base * 0.7, pierce: 3, r: 5, life: 0.7, el: 'ice', trail: '#e8f0ff' }); }
    else if (st.passives.has('wave') && G.save.hp >= G.stats.maxHp - 0.5) G.shoot({ kind: 'orb', color: '#c8d0ff', ang: a.ang, spd: 200, dmg: base * 0.7, pierce: 3, r: 5, life: 0.7, el: 'ice', trail: '#e8f0ff' });
  };
  G.shoot = function (o) {
    const p = G.player;
    const pr = new Ent.Proj({ x: p.x + Math.cos(o.ang) * 8, y: p.y - 2 + Math.sin(o.ang) * 6, vx: Math.cos(o.ang) * o.spd, vy: Math.sin(o.ang) * o.spd, friendly: 1, dmg: o.dmg, kind: o.kind, color: o.color, r: o.r || 3, life: o.life || 1.4, pierce: o.pierce || 0, el: o.el, aoe: o.aoe, trail: o.trail, glowR: o.glow, crit: o.crit, bomb: o.bomb, kb: o.kb });
    G.ents.push(pr);
    return pr;
  };
  G.fireArrow = function (aim, draw) {
    const s = G.save, st = G.stats, w = st.weapon;
    if (!Inv.remove(s, 'arrow', 1)) { PQ.UI.toast('Out of arrows! Craft them at a workbench (2 Wood, 1 Stone).'); PQ.Audio.play('fail'); return; }
    G.player.atk = { t: 0, dur: 0.25, ang: aim, lock: aim, move: 0.6, hit: true };
    G.shoot({ kind: 'arrow', ang: aim, spd: 170 + draw * 140, dmg: w.dmg * (0.45 + draw * 0.9) * st.rangedMult, pierce: draw >= 1 ? 2 : 0, r: 3, life: 1.2, el: w.element, color: '#e8dcc0', trail: draw >= 1 ? '#ffd75a' : null, kb: 60 });
    PQ.Audio.play('bow');
  };
  G.castBolt = function (aim, big) {
    const s = G.save, st = G.stats, w = st.weapon;
    const cost = big ? 20 : 5;
    if (s.mp < cost) { FX.text(G.player.x, G.player.y - 24, 'No mana', '#7a9cff', false, 0.6); PQ.Audio.play('fail'); return; }
    s.mp -= cost;
    const el = w.element || 'fire';
    const col = { fire: '#ff7a2e', ice: '#8fe0ff', shadow: '#b892f0', shock: '#fff26a' }[el];
    G.player.atk = { t: 0, dur: big ? 0.35 : 0.22, ang: aim, lock: aim, move: 0.7, hit: true };
    G.shoot({ kind: 'orb', ang: aim, spd: big ? 140 : 190, dmg: w.dmg * st.magicMult * (big ? 2.6 : 1), r: big ? 6 : 3, life: 1.3, el, color: col, trail: col, glow: big ? 40 : 22, aoe: big ? 30 : 0, pierce: 0 });
    PQ.Audio.play(big ? 'magicBig' : 'magic');
  };
  G.useAbility = function (aim) {
    const s = G.save, p = G.player, st = G.stats;
    const id = s.ability;
    if (!id) { PQ.UI.toast('No active skill yet. Learn Whirlwind, Volley, Frost Nova or Meteor in the Skills menu.'); return; }
    const sk = PQ.Skills.def(id);
    if (p.cd > 0) { FX.text(p.x, p.y - 24, 'Cooldown', '#c8ccd8', false, 0.5); return; }
    const c = sk.cost || {};
    if (c.sta && s.sta < c.sta) { FX.text(p.x, p.y - 24, 'Tired!', '#ffd75a', false, 0.6); return; }
    if (c.mp && s.mp < c.mp) { FX.text(p.x, p.y - 24, 'No mana', '#7a9cff', false, 0.6); return; }
    if (c.sta) s.sta -= c.sta; if (c.mp) s.mp -= c.mp;
    p.cd = sk.cd; p.cdMax = sk.cd;
    const w = st.weapon;
    if (id === 'w_whirl') {
      p.atk = { t: 0, dur: 0.5, ang: aim, arc: Math.PI * 2, range: 34, dir: 1, spin: 1, mult: 2.2, kb: 160, hit: false, hitAt: 0.3, charged: 1 };
      PQ.Audio.play('heavy'); FX.burst(p.x, p.y - 6, '#ffffff', 16, { speed: 90, life: 0.3 });
    } else if (id === 'r_volley') {
      for (let i = -3; i <= 3; i++) G.shoot({ kind: 'arrow', ang: aim + i * 0.13, spd: 260, dmg: (w.wclass === 'bow' ? w.dmg : 8 + s.lvl) * 0.9 * st.rangedMult, r: 3, life: 0.9, pierce: 1, color: '#e8dcc0', trail: '#ffd75a' });
      PQ.Audio.play('bow');
    } else if (id === 'm_nova') {
      FX.hazard({ kind: 'circle', x: p.x, y: p.y, r: 62, delay: 0, dmg: (w.dmg * 0.8 + s.lvl) * st.magicMult, friendly: 1, color: '#a8e8ff', el: 'ice', freeze: 2.5, shake: 0.3, sfx: 'shatter' });
    } else if (id === 'm_meteor') {
      const t = G.nearestEnemy(p.x, p.y, 160, null);
      const tx = t ? t.x : p.x + Math.cos(aim) * 60, ty = t ? t.y : p.y + Math.sin(aim) * 50;
      FX.hazard({ kind: 'circle', x: tx, y: ty, r: 42, delay: 0.9, dmg: (w.dmg * 4 + s.lvl * 4) * st.magicMult, friendly: 1, color: '#ff7a2e', el: 'fire', shake: 0.7, sfx: 'explode' });
      PQ.Audio.play('magicBig');
    }
  };
  G.useHot = function (i) {
    const id = G.save.hot[i];
    if (!id) return;
    if (!Inv.count(G.save, id)) { PQ.UI.toast('You have no ' + D.ITEMS[id].name + ' left.'); return; }
    G.useItem(id);
  };
  G.useItem = function (id) {
    const s = G.save, d = D.ITEMS[id], u = d.use, p = G.player;
    if (!u) return false;
    if (u.bond) { const c = G.ents.find((e) => e.isCritter && e.wild && !e.dead && U.dist(e.x, e.y, p.x, p.y) < 40); if (!c) { PQ.UI.toast('Get close to a wild creature to offer a treat.'); return false; } Inv.remove(s, id, 1); PQ.Creatures.tryBond(G, c, u.bond); return true; }
    if (u.bomb) { Inv.remove(s, id, 1); const a = p.ang; const pr = new Ent.Proj({ x: p.x, y: p.y - 4, vx: Math.cos(a) * 90, vy: Math.sin(a) * 70, friendly: 1, dmg: 0, kind: 'bomb', r: 3, life: 0.65, bomb: 1 }); G.ents.push(pr); PQ.Audio.play('throw'); return true; }
    if (u.recall) { Inv.remove(s, id, 1); G.enterMap('world', 'home_door'); return true; }
    if (u.heal && s.hp >= G.stats.maxHp && !u.mana && !u.buff) { PQ.UI.toast('Already at full health.'); return false; }
    Inv.remove(s, id, 1);
    if (u.heal) G.healPlayer(u.heal);
    if (u.mana) s.mp = Math.min(G.stats.maxMp, s.mp + u.mana);
    if (u.buff) { s.buffs[u.buff.id] = u.buff.dur; G.recalc(); PQ.UI.toast(d.name + ': effect active'); }
    PQ.Audio.play(d.icon === 'potion' ? 'drink' : 'eat');
    FX.burst(p.x, p.y - 8, d.liquid || '#64d86a', 8, { speed: 30, up: 40, grav: -30 });
    return true;
  };
  G.healPlayer = function (n, quiet) {
    const s = G.save; const before = s.hp;
    s.hp = Math.min(G.stats.maxHp, s.hp + n);
    if (!quiet && s.hp > before) FX.text(G.player.x, G.player.y - 22, '+' + Math.round(s.hp - before), '#5fdc6a');
  };

  /* ---------------- damage ---------------- */
  G.damageEnemy = function (e, dmg, o = {}) {
    if (e.dead || e.untargetable) return;
    const st = G.stats;
    let crit = false;
    if (!o.dot && !o.pet) { crit = o.crit || Math.random() * 100 < st.crit; if (crit) dmg *= st.critMult; }
    if (o.el === 'shadow') dmg *= 1.1;
    if (e.weak || e.state === 'stun') dmg *= e.isBoss ? 1.8 : 1.3;
    // frontal guard
    if (e.shield && o.fx != null && !o.heavy && !o.dot) {
      const front = Math.sign(o.fx - e.x) === e.face;
      if (front) { dmg *= 0.25; FX.text(e.x, e.y - 20, 'Block', '#c8d0ff', false, 0.5); PQ.Audio.play('clank'); }
    }
    if (st.passives.has('echo') && !o.dot) { G.echo = (G.echo || 0) + 1; if (G.echo % 4 === 0) { dmg *= 2; FX.text(e.x, e.y - 28, 'ECHO', '#b892f0'); } }
    dmg *= 1 - e.defv / (e.defv + 60);
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    e.flash = 0.12;
    if (!o.dot) {
      FX.text(e.x, e.y - (e.hit_h || 6) * 2 - 6, crit ? dmg + '!' : dmg, crit ? '#ffd75a' : o.el === 'fire' ? '#ff9a5a' : o.el === 'ice' ? '#a8e8ff' : '#ffffff', crit);
      FX.burst(e.x, e.y - (e.hit_h || 6), crit ? ['#ffd75a', '#ffffff'] : ['#ffffff', '#ffe0e0'], crit ? 10 : 6, { speed: 70, life: 0.3 });
      PQ.Audio.play(crit ? 'crit' : 'hit');
      G.hitstop = Math.max(G.hitstop || 0, crit ? 0.07 : o.heavy ? 0.06 : 0.035);
      if (o.heavy || crit) PQ.Render.shake = Math.max(PQ.Render.shake, 0.18);
      if (o.fx != null && o.kb) { const a = Math.atan2(e.y - o.fy, e.x - o.fx); const k = e.isBoss ? 0.15 : e.def.ai === 'tank' ? 0.4 : 1; e.kbx += Math.cos(a) * o.kb * k; e.kby += Math.sin(a) * o.kb * k; }
      if (e.state === 'windup' && o.heavy && !e.isBoss) { e.state = 'recover'; e.st = 0; }
      if (st.passives.has('lifesteal')) G.healPlayer(dmg * 0.04, true);
      if (st.passives.has('burn') || o.el === 'fire') e.status.burn = 3;
      if (st.passives.has('chill') || o.el === 'ice') e.status.chill = 2.5;
      if ((st.passives.has('shock') || o.el === 'shock') && Math.random() < 0.25 && !o.chain) { const n = G.ents.find((x) => x !== e && x.isEnemy && !x.dead && U.dist(x.x, x.y, e.x, e.y) < 60); if (n) { G.damageEnemy(n, dmg * 0.6, { chain: 1, el: 'shock' }); FX.burst(n.x, n.y - 8, '#fff26a', 8, { speed: 60 }); PQ.Audio.play('zap'); } }
      if (o.freeze) e.status.freeze = e.isBoss ? o.freeze * 0.3 : o.freeze;
    }
    if (e.hp <= 0) G.killEnemy(e);
  };
  G.hitCritter = function (c, dmg) {
    const before = c.hp;
    c.hp = Math.max(1, c.hp - Math.round(dmg * 0.5));
    c.flash = 0.12; c.flee = 1.2;
    if (before > 1) FX.text(c.x, c.y - 16, Math.round(before - c.hp), '#7ef0ff');
    if (c.hp === 1 && before > 1) PQ.UI.toast(c.def.name + ' is exhausted. Offer a Bond Treat now!');
    PQ.Audio.play('hit', 0.5);
  };
  G.killEnemy = function (e) {
    e.dead = true; e.deathT = 0;
    const s = G.save;
    FX.burst(e.x, e.y - 6, [e.def.look && e.def.look.color || '#ffffff', '#ffffff', '#c8c8d8'], 18, { speed: 80, life: 0.6 });
    PQ.Audio.play(e.isBoss ? 'bossdie' : 'die');
    if (e.def.split) for (let i = 0; i < 2; i++) G.spawnEnemy(e.def.split, e.x + (i ? 8 : -8), e.y);
    if (e.isBoss) return G.bossDefeated(e);
    s.counters.kills++;
    const tier = D.REGIONS[e.def.region] ? D.REGIONS[e.def.region].tier : (G.map.def ? G.map.def.tier : 1);
    G.gainXp(Math.round((e.def.xp || 10) * (e.elite ? 2.5 : 1)));
    PQ.Creatures.gainXp(G, Math.round((e.def.xp || 10) * 0.6));
    const luck = G.stats.passives.has('treasure') ? 1.3 : 1;
    const gold = U.randi(e.def.gold[0], e.def.gold[1]) * tier * luck * (e.elite ? 3 : 1);
    if (gold) G.dropItem('__gold', Math.round(gold), null, e.x, e.y);
    for (const [it, ch, a, b] of e.def.drops) if (Math.random() < ch * luck) G.dropItem(it, U.randi(a, b), null, e.x, e.y);
    if (Math.random() < (e.elite ? 0.4 : 0.035) * luck) G.dropItem(...G.rollEquip(tier, e.elite ? 1 : 0), e.x, e.y);
    if (G.stats.passives.has('arcane')) s.mp = Math.min(G.stats.maxMp, s.mp + 6);
    PQ.Bus.emit('quest', 'kill', e.def.id, 1);
  };
  G.rollEquip = function (tier, luck = 0) {
    const t = U.clamp(tier - 1 + (Math.random() < 0.25 ? 1 : 0), 0, 5);
    const pool = Object.values(D.ITEMS).filter((d) => Inv.isEquip(d) && !d.unique && (d.tier === t || (d.slot && ['ring', 'necklace', 'acc'].includes(d.slot) && Math.random() < 0.15 && t >= 1)));
    const d = U.pick(pool.length ? pool : [D.ITEMS.sword_1]);
    const inst = Inv.make(d.id, { r: Inv.rollRarity(tier, luck + (G.stats.passives.has('treasure') ? 1 : 0)) });
    return [d.id, 1, inst];
  };
  G.hurtPlayer = function (dmg, status, fx, fy, dot, kb = 120) {
    const p = G.player, s = G.save, st = G.stats;
    if (p.state === 'dead') return;
    if (!dot && (p.inv > 0 || p.hop)) return;
    let el = status === 'burn' ? 'fire' : status === 'chill' ? 'ice' : null;
    if (G.map.id === 'shadow' || (G.bossFight && G.bossFight.bid === 'sovereign')) el = el || 'shadow';
    let d = dmg;
    if (!dot) d *= 1 - st.def / (st.def + 60);
    if (el) d *= 1 - (st[el] || 0) / 100;
    if (st.guard) d *= 1 - st.guard;
    if (G.skill('w_iron') && s.hp < st.maxHp * 0.35) d *= 0.75;
    d = Math.max(1, Math.round(d));
    s.hp -= d;
    FX.text(p.x, p.y - 24, '-' + d, '#ff6a6a', false, 0.8);
    if (!dot) {
      p.inv = 0.7; p.flash = 0.25; p.state = 'hurt';
      PQ.Render.shake = Math.max(PQ.Render.shake, 0.25);
      PQ.Audio.play('hurt');
      if (fx != null) { const a = Math.atan2(p.y - fy, p.x - fx); p.kbx = Math.cos(a) * kb; p.kby = Math.sin(a) * kb; }
      if (status && status !== 'slow') p.status[status] = status === 'chill' ? 2.5 : 4;
      if (PQ.Fishing.active) PQ.Fishing.stop('You were attacked!');
      p.atk = null; p.charging = false;
    }
    if (s.hp <= 0) G.playerDied();
  };
  G.playerDied = function () {
    const p = G.player, s = G.save;
    s.hp = 0; p.state = 'dead';
    PQ.Audio.play('death');
    const lost = Math.floor(s.gold * 0.1);
    s.gold -= lost;
    setTimeout(() => {
      PQ.UI.dialog({ name: 'Fainted', text: 'You collapse... and wake up at home, bruised but alive.' + (lost ? ' You dropped ' + lost + ' gold.' : ''), onClose: () => {
        s.hp = Math.round(G.stats.maxHp * 0.6); s.sta = G.stats.maxSta; p.state = 'idle'; p.status = {};
        G.enterMap('home', 'entry');
      } });
    }, 900);
  };
  G.enemyShoot = function (e, pr, a) {
    const col = { rock: '#858598', web: '#e8e8f0', needle: '#dfe8b0', ice: '#a8e8ff', fire: '#ff7a2e', void: '#b892f0' }[pr.kind];
    G.ents.push(new Ent.Proj({ x: e.x, y: e.y - 6, vx: Math.cos(a) * pr.spd, vy: Math.sin(a) * pr.spd, dmg: e.atk * (pr.dmg || 1), kind: pr.kind === 'rock' || pr.kind === 'web' || pr.kind === 'needle' ? pr.kind : 'orb', color: col, r: 3, life: 2, status: pr.slow ? 'slow' : pr.chill ? 'chill' : pr.burn ? 'burn' : e.def.status, glowR: pr.kind === 'fire' || pr.kind === 'void' || pr.kind === 'ice' ? 16 : 0 }));
    PQ.Audio.play('shoot', 0.5);
  };
  G.explode = function (x, y, friendly) {
    FX.hazard({ kind: 'circle', x, y, r: 28, delay: 0, dmg: 30 + G.save.lvl * 3, friendly: friendly ? 1 : 0, color: '#ff9a2e', shake: 0.5, sfx: 'explode' });
    FX.light(x, y, 80, 1, 0.3);
    FX.burst(x, y, ['#ffe27a', '#ff9a2e', '#2a2a36'], 24, { speed: 90 });
    const m = G.map;
    for (const o of m.objs.slice()) if (o.k === 'ruinwall' && o.crack && U.dist(x, y, o.x * T + 8, o.y * T + 8) < 30) G.crackWall(o);
  };
  G.crackWall = function (o) {
    W2.gone(G.map, o, 0);
    G.map.removeObj(o);
    FX.burst(o.x * T + 8, o.y * T + 8, ['#a8a8b8', '#5d5c6e'], 20, { speed: 70 });
    PQ.UI.toast('The wall crumbles, revealing a secret!');
    PQ.Audio.play('secret');
    G.save.secrets = (G.save.secrets || 0) + 1;
  };
  G.hitSwitch = function (o) {
    if (G.t - (o.lastHit || 0) < 0.6) return;
    o.lastHit = G.t;
    const m = G.map;
    m.barState = m.barState ? 0 : 1;
    W2.flag(m, 'bar', m.barState);
    for (let i = 0; i < m.tiles.length; i++) {
      const t = m.tiles[i];
      if (t === TL.BAR_R || t === TL.BAR_B || t === TL.FLOOR) {
        const orig = m._barOrig && m._barOrig[i];
        if (orig == null && t !== TL.FLOOR) { m._barOrig = m._barOrig || {}; m._barOrig[i] = t; }
      }
    }
    // red barriers solid when barState 0, blue solid when 1
    for (const i in m._barOrig) { const t = m._barOrig[i]; const solid = (t === TL.BAR_R && !m.barState) || (t === TL.BAR_B && m.barState); m.tiles[+i] = solid ? t : TL.FLOOR; }
    m.chunks.clear();
    PQ.Audio.play('switch');
    FX.burst(o.x * T + 8, o.y * T, m.barState ? '#80a8ff' : '#ff8095', 12, { speed: 50 });
  };
  G.applyBars = function (m) {
    if (!m._barOrig) { m._barOrig = {}; for (let i = 0; i < m.tiles.length; i++) if (m.tiles[i] === TL.BAR_R || m.tiles[i] === TL.BAR_B) m._barOrig[i] = m.tiles[i]; }
    for (const i in m._barOrig) { const t = m._barOrig[i]; const solid = (t === TL.BAR_R && !m.barState) || (t === TL.BAR_B && m.barState); m.tiles[+i] = solid ? t : TL.FLOOR; }
    m.chunks.clear();
  };

  /* ---------------- loot ---------------- */
  G.dropItem = function (id, n, inst, x, y) {
    const p = G.player;
    G.ents.push(new Ent.Pickup(x != null ? x : p.x, y != null ? y : p.y, id, n, inst));
  };
  G.giveDrop = function (pk) {
    const s = G.save;
    if (pk.item === '__gold') { s.gold += pk.n; PQ.Audio.play('coin'); FX.text(G.player.x, G.player.y - 26, '+' + pk.n + 'g', '#ffd75a', false, 0.7); return true; }
    const left = Inv.add(s, pk.item, pk.n, pk.inst);
    if (left === pk.n) { if (!G.fullTip || G.t - G.fullTip > 5) { G.fullTip = G.t; PQ.UI.toast('Your bag is full!', 'warn'); } return false; }
    const d = D.ITEMS[pk.item];
    const got = pk.n - left;
    pk.n = left;
    PQ.UI.pickup(d, got, pk.inst);
    PQ.Audio.play(pk.inst && pk.inst.r >= 3 ? 'rare' : 'pickup');
    PQ.Bus.emit('quest', 'gather', pk.item, got);
    return left === 0;
  };
  G.chestLoot = function (o) {
    const s = G.save;
    const tier = o.dtier || (G.map.kind === 'dungeon' ? G.map.def.tier : D.REGIONS[G.map.region(o.x, o.y)].tier);
    const out = [];
    if (o.fixed) for (const [id, n] of o.fixed) out.push([id, n, Inv.isEquip(D.ITEMS[id]) ? Inv.make(id, { r: 3 }) : null]);
    if (!o.key) {
      out.push(['__gold', Math.round(U.randi(15, 40) * tier * (1 + (o.tier || 0) * 0.6))]);
      const mats = { 1: ['wood', 'stone', 'copper_ore', 'greenleaf', 'fiber'], 2: ['iron_ore', 'moonpetal', 'glowcap', 'silk'], 3: ['gold_ore', 'sunbloom', 'sand_glass', 'iron_bar'], 4: ['frost_ore', 'frostbloom', 'frost_pelt', 'sapphire'], 5: ['ember_ore', 'fireroot', 'ember_core', 'ruby'], 6: ['void_shard', 'shadow_essence', 'amethyst', 'void_bar'] }[Math.min(6, tier)] || ['stone'];
      for (let i = 0; i < 1 + (o.tier || 0); i++) out.push([U.pick(mats), U.randi(2, 4), null]);
      if (Math.random() < 0.35 + (o.tier || 0) * 0.25) out.push(G.rollEquip(tier, (o.tier || 0) + 1));
      if (Math.random() < 0.5) out.push([tier >= 4 ? 'hp_large' : 'hp_small', U.randi(1, 2), null]);
    }
    return out;
  };

  /* ---------------- xp ---------------- */
  G.xpNext = (L) => Math.round(60 + 38 * (L - 1) + 9 * (L - 1) * (L - 1));
  G.gainXp = function (n) {
    const s = G.save;
    if (s.lvl >= 50) return;
    s.xp += n;
    FX.text(G.player.x + 10, G.player.y - 30, '+' + n + ' XP', '#c8a8ff', false, 0.7);
    while (s.xp >= G.xpNext(s.lvl) && s.lvl < 50) {
      s.xp -= G.xpNext(s.lvl); s.lvl++; s.sp++;
      G.recalc();
      s.hp = G.stats.maxHp; s.mp = G.stats.maxMp;
      PQ.UI.banner('Level ' + s.lvl + '!', '+1 skill point. Health and mana restored.');
      PQ.Audio.play('levelup');
      FX.burst(G.player.x, G.player.y - 10, ['#ffd75a', '#ffffff', '#c8a8ff'], 30, { speed: 70, up: 80 });
    }
  };

  /* =========================================================
     spawning
     ========================================================= */
  G.spawnEnemy = function (id, x, y, o = {}) {
    const def = D.ENEMIES[id];
    if (!def) return null;
    const dt2 = G.map.def ? G.map.def.tier : 1;
    const tierMul = def.region === 'dungeon' ? 1 + (dt2 - 1) * 0.9 : 1;
    const e = new Ent.Enemy(def, x, y, tierMul);
    if (def.region === 'dungeon') e.atk *= 1 + (dt2 - 1) * 0.7;
    if (o.fixed) e.fixed = 1;
    if (o.elite) e.makeElite();
    G.ents.push(e);
    return e;
  };
  G.spawnTick = function (dt) {
    const m = G.map, p = G.player;
    if (m.kind !== 'overworld') return;
    G.spawnT = (G.spawnT || 0) - dt;
    if (G.spawnT > 0) return;
    G.spawnT = 1.6;
    const ptx = Math.floor(p.x / T), pty = Math.floor(p.y / T);
    // despawn far
    for (const e of G.ents) if ((e.isEnemy && !e.fixed && !e.isBoss) && U.dist(e.x, e.y, p.x, p.y) > 34 * T) e.dead = true;
    const reg = m.region(ptx, pty);
    const night = PQ.Time.isNight();
    const tier = D.REGIONS[reg].tier;
    const cap = 5 + Math.floor(tier / 2) + (night ? 3 : 0);
    const count = G.ents.filter((e) => e.isEnemy && !e.dead && !e.fixed).length;
    const inSafe = (x, y) => m.safe.some(([a, b, c, d]) => x >= a - 3 && x <= c + 3 && y >= b - 3 && y <= d + 3);
    G.safeZone = inSafe(ptx, pty);
    if (count < cap) {
      for (let tries = 0; tries < 8; tries++) {
        const a = Math.random() * 6.28, r = 13 + Math.random() * 8;
        const x = Math.round(ptx + Math.cos(a) * r), y = Math.round(pty + Math.sin(a) * r * 0.75);
        if (!m.inb(x, y) || m.walk(x, y) !== 1 || m.region(x, y) !== reg || inSafe(x, y)) continue;
        const list = D.REGION_ENEMIES[reg].filter((id) => !D.ENEMIES[id].night || night);
        const id = U.pick(list);
        G.spawnEnemy(id, x * T + 8, y * T + 12, { elite: Math.random() < (night ? 0.1 : 0.05) && tier > 1 });
        break;
      }
    }
    // wild creatures
    const crit = G.ents.filter((e) => e.isCritter && e.wild && !e.dead).length;
    if (crit < 2 && Math.random() < 0.5) {
      const pool = D.REGION_CREATURES[reg] || [];
      if (pool.length) {
        const sp = U.weighted(pool.map((id) => [id, [8, 4, 1.5, 0.6, 0.15][D.CREATURES[id].rar]]));
        for (let tries = 0; tries < 6; tries++) {
          const a = Math.random() * 6.28, r = 9 + Math.random() * 7;
          const x = Math.round(ptx + Math.cos(a) * r), y = Math.round(pty + Math.sin(a) * r * 0.75);
          if (!m.inb(x, y) || m.walk(x, y) !== 1 || m.region(x, y) !== reg) continue;
          G.ents.push(new Ent.Critter(sp, x * T + 8, y * T + 12, true));
          break;
        }
      }
    }
  };
  G.spawnCompanion = function () {
    G.ents = G.ents.filter((e) => !(e.isCritter && !e.wild));
    const c = PQ.Creatures.active(G.save);
    G.companion = null;
    if (!c || !G.player) return;
    const ent = new Ent.Critter(c.sp, G.player.x - 10, G.player.y, false, c);
    G.ents.push(ent);
    G.companion = ent;
  };
  /* NPCs with day/night routines */
  G.NPC_NIGHT = { maren: 'maren_home', hilda: 'village_smith', odo: 'village_store', juniper: 'village_potion', oswin: 'village_farm', tilly: 'village_well', pip: 'village_ranch', bram: 'bridge_site' };
  G.spawnNPCs = function () {
    const m = G.map;
    const night = PQ.Time.isNight();
    for (const id in D.NPCS) {
      const d = D.NPCS[id];
      let spot = m.spots[d.spot];
      if (id === 'bram' && G.save.events.bridge) spot = m.spots.village_center ? { x: m.spots.village_center.x + 4, y: m.spots.village_center.y + 2 } : spot;
      if (!spot) continue;
      const n = new Ent.NPC(id);
      n.home = { x: spot.x, y: spot.y };
      n.x = spot.x * T + 8; n.y = spot.y * T + 12;
      if (night && G.NPC_NIGHT[id]) { n.asleep = true; continue; }
      G.ents.push(n);
    }
  };
  PQ.Bus.on('hour', (h) => {
    if (!G.map || G.map.id !== 'world') return;
    if (h === 20) { // villagers head home
      for (const n of G.ents) if (n.isNPC && G.NPC_NIGHT[n.id]) { const sp = G.map.spots[G.NPC_NIGHT[n.id]]; const p = PQ.World.astar(G.map, Math.floor(n.x / T), Math.floor(n.y / T), sp.x, sp.y - 1, (x, y) => (G.map.walk(x, y) === 1 ? 1 : 999), 4000); n.path = p || []; n.leaving = true; setTimeout(() => { n.dead = true; }, 9000); }
    }
    if (h === 6) { G.ents = G.ents.filter((e) => !e.isNPC); G.spawnNPCs(); }
  });

  /* =========================================================
     interaction
     ========================================================= */
  G.target = function () {
    const p = G.player, m = G.map;
    const dir = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[p.face];
    const fx = p.x + dir[0] * 12, fy = p.y - 3 + dir[1] * 11;
    // NPC
    let best = null, bd = 24;
    for (const e of G.ents) if (e.isNPC && !e.dead) { const d = U.dist(fx, fy, e.x, e.y - 4); if (d < bd) { bd = d; best = e; } }
    if (best) return { kind: 'npc', e: best, label: 'Talk' };
    for (const e of G.ents) if (e.isCritter && e.wild && !e.dead && U.dist(fx, fy, e.x, e.y) < 22) return { kind: 'critter', e, label: 'Befriend' };
    // objects: front tile first, then own tile, then neighbours
    const tx = Math.floor(fx / T), ty = Math.floor(fy / T), ptx = Math.floor(p.x / T), pty = Math.floor((p.y - 2) / T);
    const cand = [[tx, ty], [ptx, pty], [ptx + dir[0], pty + dir[1]], [tx, ty - 1]];
    for (const [x, y] of cand) {
      const o = m.obj(x, y);
      if (o && !(o.gone && o.k !== 'tree') && !(o.k === 'tree' && o.gone)) { const l = G.objLabel(o, x, y); if (l) return { kind: 'obj', o, x, y, label: l }; }
      if (m.farm && m.farm.includes(m.idx(x, y)) && m.id === 'world') { const l = G.farmLabel(x, y); if (l) return { kind: 'farm', x, y, label: l }; }
    }
    // home decor pickup handled via objects; water for fishing
    if (Art_isWater(m.t(tx, ty)) && m.t(tx, ty) !== TL.BROKEN) return { kind: 'fish', x: tx, y: ty, label: 'Fish' };
    return null;
  };
  function Art_isWater(t) { return PQ.Art.TINFO[t].water; }
  G.objLabel = function (o) {
    switch (o.k) {
      case 'chest': return o.opened ? null : 'Open';
      case 'sign': return 'Read';
      case 'station': return { bed: 'Sleep', storage: 'Storage', mirror: 'Mirror', workbench: 'Craft', forge: 'Forge', alchemy: 'Brew', cook: 'Cook', altar: 'Altar' }[o.kind];
      case 'door': return o.open ? null : 'Unlock';
      case 'entrance': return 'Enter';
      case 'exit': return 'Leave';
      case 'house': return o.home ? 'Enter' : 'Knock';
      case 'waypoint': return 'Waystone';
      case 'gate': return 'Gate';
      case 'portal': return 'Enter';
      case 'shrine': return 'Pray';
      case 'well': return 'Drink';
      case 'tree': return o.gone ? null : o.kind === 'cactus' ? 'Cut' : 'Chop';
      case 'rock': return o.gone ? null : 'Mine';
      case 'crystal': return o.gone ? null : 'Mine';
      case 'bush': return o.picked && o.kind !== 'berry' ? null : o.picked ? null : 'Gather';
      case 'herb': return o.gone ? null : 'Pick';
      case 'mushroom': return o.gone ? null : 'Pick';
      case 'decor': return 'Pick up';
      case 'ruinwall': return o.crack ? 'Inspect' : null;
      case 'switch': return 'Hit';
      case 'stall': return 'Shop';
      default: return null;
    }
  };
  G.farmLabel = function (x, y) {
    const m = G.map, s = G.save, i = m.idx(x, y), f = s.farm[i], t = m.t(x, y);
    if (f && f.crop) { const def = D.CROPS[f.crop]; if (f.stage >= def.days) return 'Harvest'; if (!f.w) return Inv.count(s, 'can') ? 'Water' : null; return null; }
    if (t === TL.SOIL) return Inv.count(s, 'hoe') ? 'Till' : null;
    if (t === TL.TILLED || t === TL.WET) return s.inv.some((it) => it && D.ITEMS[it.id].type === 'seed') ? 'Plant' : null;
    return null;
  };
  G.contextLabel = function () { const t = G.target(); return t ? t.label : null; };

  G.interact = function () {
    const t = G.target();
    if (!t) return false;
    const p = G.player;
    if (t.kind === 'npc') { PQ.UI.talk(t.e); return true; }
    if (t.kind === 'critter') {
      const has = Inv.count(G.save, 'treat_plus') ? 'treat_plus' : Inv.count(G.save, 'treat') ? 'treat' : null;
      if (!has) { PQ.UI.toast('You need a Bond Treat. Craft them (3 Berries, 1 Slime Gel) or buy them from Pip.'); return true; }
      Inv.remove(G.save, has, 1); PQ.Creatures.tryBond(G, t.e, D.ITEMS[has].use.bond); return true;
    }
    if (t.kind === 'fish') { if (PQ.Fishing.start(G, t.x, t.y)) p.face = Ent.dirOf(Math.atan2(t.y * T + 8 - p.y, t.x * T + 8 - p.x)); return true; }
    if (t.kind === 'farm') return G.farmAct(t.x, t.y);
    return G.useObj(t.o);
  };

  G.gatherSwing = function () { const p = G.player; p.atk = { t: 0, dur: 0.3, ang: p.ang, arc: 1.4, range: 10, dir: 1, mult: 0, hit: true, lock: { left: Math.PI, right: 0, up: -Math.PI / 2, down: Math.PI / 2 }[p.face] }; };
  G.gather = function (o, yields, days, label) {
    const s = G.save;
    G.gatherSwing();
    o.hits = (o.hits || 0) + 1;
    o.hit = 0.15;
    const need = o.need || 1;
    FX.burst(o.x * T + 8, o.y * T + 4, label.color || '#c8b898', 5, { speed: 40, up: 50 });
    PQ.Audio.play(label.sfx || 'chop');
    PQ.Render.shake = Math.max(PQ.Render.shake, 0.06);
    if (o.hits < need) { FX.text(o.x * T + 8, o.y * T - 8, o.hits + '/' + need, '#ffffff', false, 0.4); return true; }
    o.hits = 0;
    const comp = G.companion && G.companion.def.role === 'gatherer';
    for (const [id, a, b] of yields) { let n = U.randi(a, b); if (comp && Math.random() < 0.3) n++; if (n > 0) { G.dropItem(id, n, null, o.x * T + 8, o.y * T + 8); if (label.mine) PQ.Bus.emit('quest', 'mine', id, n); } }
    W2.gone(G.map, o, days);
    G.gainXp(label.xp || 1);
    return true;
  };
  G.useObj = function (o) {
    const s = G.save, m = G.map, p = G.player;
    const pick = (o.k === 'rock' || o.k === 'crystal') ? Math.max(0, ...['pick1', 'pick2', 'pick3', 'pick4', 'pick5'].map((id, i) => (Inv.count(s, id) ? i + 1 : 0))) : 0;
    const axe = Inv.count(s, 'axe2') ? 2 : Inv.count(s, 'axe1') ? 1 : 0;
    switch (o.k) {
      case 'tree': {
        if (o.kind === 'giant' && axe < 2) { PQ.UI.toast('This ancient trunk needs an Iron Axe.'); return true; }
        o.need = Math.max(1, Math.ceil((o.kind === 'giant' ? 6 : o.kind === 'cactus' ? 2 : 3) / (axe ? axe * 1.2 : 0.75)));
        const y = o.kind === 'giant' ? [['wood', 3, 5], ['ancient_wood', 1, 2]] : o.kind === 'cactus' ? [['fiber', 2, 3]] : o.kind === 'apple' ? [['wood', 2, 3], ['berry', 1, 3]] : [['wood', 2, 3]];
        if (Math.random() < 0.15) y.push(['feather', 1, 1]);
        return G.gather(o, y, 3, { sfx: 'chop', color: '#a06a3c', xp: 2 });
      }
      case 'rock': {
        const oreTier = { copper: 1, iron: 2, gold: 2, frost: 3, ember: 4, void: 5 }[o.ore] || 0;
        if (oreTier && pick < oreTier) { PQ.UI.toast('You need a ' + ['', 'Stone', 'Copper', 'Iron', 'Frostsilver', 'Emberite'][oreTier] + ' Pickaxe (or better) to mine this ore.'); return true; }
        o.need = Math.max(1, Math.ceil(3 / (pick ? 1 + pick * 0.4 : 0.75)));
        const y = [['stone', 1, 3]];
        if (o.ore) y.push([o.ore === 'void' ? 'void_shard' : o.ore + '_ore', 1, 2]);
        if (o.ore && Math.random() < 0.08) y.push([U.pick(['ruby', 'sapphire', o.ore === 'void' ? 'amethyst' : 'ruby']), 1, 1]);
        return G.gather(o, y, 2, { sfx: 'mine', color: '#b4b4c4', mine: 1, xp: oreTier * 2 + 1 });
      }
      case 'crystal': {
        if (pick < 2) { PQ.UI.toast('You need a Copper Pickaxe (or better) to mine crystals.'); return true; }
        o.need = 3;
        const y = o.col === 'frost' ? [['sapphire', 0, 1], ['frost_ore', 1, 2]] : o.col === 'ember' ? [['ruby', 0, 1], ['ember_ore', 1, 2]] : [['amethyst', 0, 1], ['void_shard', 1, 2]];
        return G.gather(o, y, 4, { sfx: 'mine', color: '#c8e8ff', mine: 1, xp: 6 });
      }
      case 'bush': { o.need = 1; const y = [['fiber', 1, 2]]; if (o.kind === 'berry' && !o.picked) y.push(['berry', 2, 3]); return G.gather(o, y, 1, { sfx: 'rustle', color: '#64b33f' }); }
      case 'herb': o.need = 1; return G.gather(o, [[o.item, 1, 2]], 1, { sfx: 'rustle', color: D.ITEMS[o.item].color });
      case 'mushroom': o.need = 1; return G.gather(o, [['glowcap', 1, 2]], 2, { sfx: 'rustle', color: '#9a6aff' });
      case 'chest': return G.openChest(o);
      case 'sign': PQ.UI.dialog({ name: 'Sign', text: o.text || 'The writing has faded.' }); return true;
      case 'station':
        if (o.kind === 'bed') { PQ.UI.confirm('Sleep until morning? Your game will be saved.', () => G.sleep()); return true; }
        if (o.kind === 'storage') { PQ.UI.storage(); return true; }
        if (o.kind === 'mirror') { PQ.UI.creator(true); return true; }
        PQ.UI.craft(o.kind); return true;
      case 'stall': PQ.UI.toast('The shopkeeper is standing nearby. Talk to them to trade.'); return true;
      case 'door': return G.tryDoor(o);
      case 'entrance': {
        if (o.needs === 'sun_tablet' && !G.save.bosses.colossus && Inv.count(s, 'sun_tablet') < 3) { PQ.UI.dialog({ name: 'Sealed Door', text: 'Three sun-shaped hollows are carved into the stone. (' + Inv.count(s, 'sun_tablet') + '/3 Sun Tablets)' }); return true; }
        G.enterMap('dng_' + o.dungeon, 'entry'); return true;
      }
      case 'exit': G.enterMap(o.to, o.spot); return true;
      case 'house': if (o.home) { G.enterMap('home', 'entry'); return true; } PQ.UI.toast('Nobody answers. ' + (o.name ? '(' + o.name + ')' : '')); return true;
      case 'waypoint': {
        if (!s.waypoints[o.wid]) { s.waypoints[o.wid] = 1; PQ.UI.toast('Waystone attuned: ' + o.name + '!'); PQ.Audio.play('waystone'); FX.burst(o.x * T + 8, o.y * T - 8, '#7ef0ff', 20, { speed: 60 }); G.gainXp(15); PQ.Bus.emit('quest', 'waypoints', o.wid, 1); G.autosave(); return true; }
        PQ.UI.travel(); return true;
      }
      case 'gate': return G.useGate(o);
      case 'portal': if (G.map.id === 'world') G.enterMap('shadow', 'arrive'); else G.enterMap('world', 'portal'); return true;
      case 'shrine': {
        if (!s.bosses.sovereign) { PQ.UI.dialog({ name: 'Light Shrine', text: 'A dim shrine of pure light. It feels like it is waiting for the darkness to lift.' }); return true; }
        if (!s.events.celestine) { s.events.celestine = 1; G.ents.push(new Ent.Critter('celestine', o.x * T + 8, o.y * T + 40, true)); PQ.UI.banner('Celestine Drake', 'appears in a burst of light!'); PQ.Audio.play('discover'); }
        else PQ.UI.toast('The shrine glows warmly.');
        return true;
      }
      case 'well': G.healPlayer(15); PQ.Audio.play('drink'); PQ.UI.toast('Cool, fresh water.'); return true;
      case 'decor': {
        const i = s.home.decor.findIndex((d) => d.x === o.x && d.y === o.y);
        if (i >= 0) { s.home.decor.splice(i, 1); m.removeObj(o); Inv.add(s, 'd_' + o.decor, 1); PQ.UI.toast('Picked up.'); }
        return true;
      }
      case 'ruinwall': PQ.UI.toast(Inv.count(s, 'bomb') ? 'A cracked wall. Throw a bomb at it (assign Bombs to a quick slot).' : 'A cracked wall. An explosion might open it... Odo sells bombs.'); return true;
      case 'switch': G.hitSwitch(o); return true;
      default: return false;
    }
  };
  G.openChest = function (o) {
    const s = G.save;
    o.opened = 1;
    W2.rec(G.map.id).opened[o.id] = 1;
    s.counters.chests++;
    PQ.Bus.emit('quest', 'chests', o.id, 1);
    PQ.Audio.play('chest');
    FX.burst(o.x * T + 8, o.y * T + 4, ['#ffd75a', '#ffffff'], 16, { speed: 50, up: 70 });
    for (const [id, n, inst] of G.chestLoot(o)) {
      if (id === '__key') { const k = (s.keys[G.map.id] = s.keys[G.map.id] || { key: 0, boss: 0 }); k.key++; PQ.UI.toast('Got a Small Key!', 'r2'); PQ.Audio.play('key'); continue; }
      if (id === '__bosskey') { const k = (s.keys[G.map.id] = s.keys[G.map.id] || { key: 0, boss: 0 }); k.boss = 1; PQ.UI.banner('Boss Key', 'The way to the guardian is open'); PQ.Audio.play('key'); continue; }
      G.dropItem(id, n, inst, o.x * T + 8, o.y * T + 14);
    }
    return true;
  };
  G.tryDoor = function (o) {
    const s = G.save, k = (s.keys[G.map.id] = s.keys[G.map.id] || { key: 0, boss: 0 });
    if (o.lock === 'key') { if (k.key > 0) { k.key--; G.openDoor(o); PQ.UI.toast('Unlocked!'); } else PQ.UI.toast('Locked. A Small Key is hidden somewhere in this dungeon.'); return true; }
    if (o.lock === 'boss') { if (k.boss) { G.openDoor(o); PQ.UI.toast('The great lock turns...'); } else PQ.UI.toast('A heavy lock. You need the Boss Key. (Hint: crystal switches toggle red and blue barriers.)'); return true; }
    if (o.lock === 'plates') { PQ.UI.toast('Sealed by ancient magic. Find and stand on every pressure plate in this room.'); return true; }
    if (o.lock === 'fight') { PQ.UI.toast('Sealed until the battle ends!'); return true; }
    return true;
  };
  G.openDoor = function (o) {
    o.open = 1; o.solid = false;
    W2.flag(G.map, 'open:' + o.id, 1);
    PQ.Audio.play('door');
    FX.burst((o.x + o.w / 2) * T, o.y * T, '#c8b898', 12, { speed: 40 });
  };
  G.sleep = function () {
    const s = G.save;
    PQ.UI.fade(() => {
      if (s.minute > 6 * 60) PQ.Time.newDay();
      s.minute = 6 * 60;
      s.hp = G.stats.maxHp; s.mp = G.stats.maxMp; s.sta = G.stats.maxSta;
      G.autosave();
      PQ.UI.toast('You feel rested. Game saved.');
    });
  };
  G.farmAct = function (x, y) {
    const m = G.map, s = G.save, i = m.idx(x, y), t = m.t(x, y);
    const f = s.farm[i];
    G.gatherSwing();
    if (f && f.crop) {
      const def = D.CROPS[f.crop];
      if (f.stage >= def.days) {
        G.dropItem(f.crop, Math.random() < 0.2 ? 2 : 1, null, x * T + 8, y * T + 8);
        PQ.Bus.emit('quest', 'harvest', f.crop, 1);
        G.gainXp(3);
        PQ.Audio.play('harvest');
        if (def.regrow) { f.stage = def.days - def.regrow; } else { delete s.farm[i]; }
        return true;
      }
      if (!f.w) { f.w = 1; m.set(x, y, TL.WET); W2.setTile(m, x, y, TL.WET); PQ.Audio.play('water'); FX.burst(x * T + 8, y * T + 8, '#86d0f0', 8, { speed: 30 }); return true; }
      return true;
    }
    if (t === TL.SOIL) { m.set(x, y, TL.TILLED); W2.setTile(m, x, y, TL.TILLED); PQ.Audio.play('till'); FX.dust(x * T + 8, y * T + 10); return true; }
    if (t === TL.TILLED || t === TL.WET) {
      const seeds = [...new Set(s.inv.filter((it) => it && D.ITEMS[it.id].type === 'seed').map((it) => it.id))];
      if (!seeds.length) return false;
      const plant = (sid) => { if (!Inv.remove(s, sid, 1)) return; s.farm[i] = { crop: D.ITEMS[sid].crop, stage: 0, w: t === TL.WET ? 1 : 0 }; PQ.Audio.play('plant'); };
      if (seeds.length === 1 || (s.lastSeed && seeds.includes(s.lastSeed) && PQ.Input && PQ.Input.quickPlant)) plant(seeds.includes(s.lastSeed) ? s.lastSeed : seeds[0]);
      else PQ.UI.pickSeed(seeds, (sid) => { s.lastSeed = sid; plant(sid); });
      return true;
    }
    return false;
  };
  G.useGate = function (o) {
    const s = G.save;
    if (s.events.gate) { G.enterMap('shadow', 'arrive'); return true; }
    const ids = ['sigil_verdant', 'sigil_solar', 'sigil_glacial', 'sigil_ember'];
    let placed = 0;
    ids.forEach((id, i) => { if (!s.sigils[i] && Inv.remove(s, id, 1)) { s.sigils[i] = 1; placed++; } });
    G.map.chunks.clear();
    const n = s.sigils.filter(Boolean).length;
    if (placed) { PQ.Audio.play('waystone'); PQ.UI.toast('Placed ' + placed + ' sigil' + (placed > 1 ? 's' : '') + ' in the Ancient Gate (' + n + '/4).'); }
    if (n === 4) { G.worldEvent('gate'); return true; }
    if (!placed) PQ.UI.dialog({ name: 'Ancient Gate', text: 'Four empty sockets glow faintly: green, gold, ice-blue and ember-red. (' + n + '/4 sigils placed)' });
    return true;
  };

  /* =========================================================
     world events & bosses
     ========================================================= */
  G.worldEvent = function (ev) {
    const s = G.save;
    s.events[ev] = 1;
    if (ev === 'bridge') { G.buildBridge(); PQ.UI.banner('The Bridge is Rebuilt', 'The Sunscorch Desert lies to the east'); }
    if (ev === 'home_upgrade') { s.home.upgraded = 1; delete G.maps.home; G.maps.home = PQ.World.genHome(1); W2.apply(G.maps.home); G.placeDecor(); const m = G.maps.world, hp = m.homePlot; if (hp) for (let y = hp.ey0; y <= hp.ey1; y++) for (let x = hp.ex0; x <= hp.ex1; x++) { if (m.t(x, y) !== TL.TILLED && m.t(x, y) !== TL.WET) { m.clearObjs(x, y, x, y); m.set(x, y, TL.SOIL); W2.setTile(m, x, y, TL.SOIL); } if (!m.farm.includes(m.idx(x, y))) m.farm.push(m.idx(x, y)); } s.home.extraFarm = 1; PQ.UI.banner('Home Upgraded', 'Forge, alchemy table, more storage and a bigger farm'); s.storage.push(...new Array(20).fill(null)); }
    if (ev === 'gate') { G.openPortal(); PQ.Bus.emit('quest', 'visit', 'gate_used', 1); PQ.UI.banner('The Seal Breaks', 'A portal to the Shadow Realm opens'); PQ.Render.shake = 0.8; PQ.Audio.play('roar'); }
  };
  G.buildBridge = function (quiet) {
    const m = G.maps.world, b = m.bridge;
    if (!b) return;
    for (let x = b.x0; x <= b.x1; x++) for (const y of [b.y, b.y + 1]) { m.set(x, y, TL.BRIDGE); }
    if (!quiet) PQ.Audio.play('door');
    m._mapDirty = true;
  };
  G.openPortal = function () {
    const m = G.maps.world, sp = m.spots.portal;
    if (!m.objs.find((o) => o.k === 'portal')) m.addObj({ k: 'portal', x: sp.x, y: sp.y + 2, solid: true, light: 1, id: 'world:portal' });
    m.spots.portal = { x: sp.x, y: sp.y + 3 };
  };
  G.placeDecor = function () {
    const m = G.maps.home;
    for (const d of G.save.home.decor) if (!m.obj(d.x, d.y)) m.addObj({ k: 'decor', decor: d.decor, x: d.x, y: d.y, solid: d.decor !== 'rug', id: 'home:decor:' + d.x + ',' + d.y });
  };
  G.bossTick = function () {
    const m = G.map, p = G.player, s = G.save;
    if (m.kind !== 'dungeon' || !m.bossRoom) return;
    const br = m.bossRoom;
    const tx = Math.floor(p.x / T), ty = Math.floor((p.y - 2) / T);
    const inside = tx >= br.x0 && tx <= br.x1 && ty >= br.y0 && ty <= br.y1;
    if (inside && !s.bosses[br.id] && !G.bossFight) {
      const b = new Ent.Boss(br.id, br.cx * T + 8, (br.cy - 2) * T);
      b.awake = false;
      G.ents.push(b); G.bossFight = b;
      // seal the door
      const d = m.objs.find((o) => o.k === 'door' && o.lock === 'boss');
      if (d) { d.open = 0; d.solid = true; d.lockWas = d.lock; d.lock = 'fight'; }
      PQ.UI.banner(D.BOSSES[br.id].name, 'Boss battle!');
      PQ.Audio.music('boss');
      Ent.after(1.5, () => { b.awake = true; });
    }
    if (G.bossFight && G.bossFight.dead && !G.bossFight.done) G.bossFight.done = true;
  };
  G.bossDefeated = function (b) {
    const s = G.save, B = D.BOSSES[b.bid];
    s.bosses[b.bid] = 1;
    PQ.UI.banner(B.name, 'DEFEATED!');
    PQ.Render.shake = 1; PQ.Render.flash = 0.8;
    for (const e of G.ents) if (e.isEnemy && !e.isBoss) { e.dead = true; FX.burst(e.x, e.y, '#ffffff', 6); }
    FX.hazards.length = 0;
    G.gainXp(B.xp);
    PQ.Creatures.gainXp(G, Math.round(B.xp * 0.4));
    G.dropItem('__gold', B.gold, null, b.x, b.y);
    for (const [id, ch, a] of B.drops) G.dropItem(id, a, Inv.isEquip(D.ITEMS[id]) ? Inv.make(id) : null, b.x + (Math.random() - 0.5) * 30, b.y + (Math.random() - 0.5) * 20);
    if (G.map.kind === 'dungeon') {
      const d = G.map.objs.find((o) => o.k === 'door' && (o.lock === 'fight' || o.lockWas === 'boss'));
      if (d) { d.lock = 'boss'; G.openDoor(d); }
      G.map.addObj({ k: 'exit', x: G.map.bossRoom.cx, y: G.map.bossRoom.cy + 2, to: G.map.def.exitMap || 'world', spot: G.map.def.exitSpot, stairs: 1, id: G.map.id + ':bossexit' });
    }
    G.darkPhase = 0;
    G.bossFight = null;
    PQ.Bus.emit('quest', 'boss', b.bid, 1);
    PQ.Audio.music(G.map.music || 'dungeon');
    setTimeout(() => G.autosave(), 1500);
    if (b.bid === 'sovereign') setTimeout(() => PQ.UI.ending(), 3500);
  };
  PQ.Bus.on('quest', (type, a, n) => PQ.Quests.onEvent(type, a, n));
})();
