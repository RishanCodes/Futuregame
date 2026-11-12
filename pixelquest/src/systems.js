/* PIXEL QUEST — systems: time, weather, inventory, stats, crafting, quests, farming, fishing, creatures, skills, saving */
'use strict';
(function () {
  const U = PQ.U, D = PQ.D, T = PQ.T, TL = PQ.TILE;
  const G = () => PQ.G;

  /* =========================================================
     TIME & WEATHER
     ========================================================= */
  const Time = (PQ.Time = {
    RATE: 2, // game minutes per real second (a full day = 12 minutes)
    update(dt) {
      const s = G().save;
      const before = s.minute;
      s.minute += dt * Time.RATE;
      if (Math.floor(before / 60) !== Math.floor(s.minute / 60)) PQ.Bus.emit('hour', Math.floor(s.minute / 60) % 24);
      if (s.minute >= 1440) { s.minute -= 1440; Time.newDay(); }
    },
    hour() { return Math.floor(G().save.minute / 60) % 24; },
    str() { const m = Math.floor(G().save.minute); const h = Math.floor(m / 60), mm = m % 60; return 'Day ' + G().save.day + '  ' + (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; },
    isNight() { const h = Time.hour(); return h >= 20 || h < 6; },
    darkness() {
      const g = G(); if (!g || !g.save) return 0;
      const m = g.save.minute / 60;
      let d;
      if (m < 5) d = 0.78; else if (m < 6.5) d = 0.78 * (1 - (m - 5) / 1.5); else if (m < 18) d = 0; else if (m < 20) d = 0.45 * ((m - 18) / 2); else if (m < 22) d = 0.45 + 0.33 * ((m - 20) / 2); else d = 0.78;
      if (g.map && g.map.id === 'shadow') d = Math.max(d, 0.42);
      const w = Weather.cur();
      if (w === 'rain' || w === 'storm' || w === 'blizzard' || w === 'sandstorm') d = Math.max(d, 0.18);
      if (g.darkPhase) d = Math.max(d, 0.85);
      if (g.map && g.map.kind === 'interior') d = Math.min(d, 0.3);
      return d;
    },
    nightColor(m) { if (m.kind === 'dungeon') return '#06040c'; if (m.id === 'shadow') return '#100620'; return '#0a0e2a'; },
    tint(m) {
      if (m.kind === 'dungeon' || m.kind === 'interior') return m.theme === 'fire' ? 'rgba(255,90,30,0.06)' : null;
      const h = G().save.minute / 60;
      if (h >= 5 && h < 7.5) return `rgba(255,150,140,${(0.16 * (1 - Math.abs(h - 6.2) / 1.3)).toFixed(3)})`;
      if (h >= 16.5 && h < 20.5) return `rgba(255,120,40,${(0.2 * (1 - Math.abs(h - 18.5) / 2)).toFixed(3)})`;
      const reg = m.region(Math.floor(G().player.x / T), Math.floor(G().player.y / T));
      if (reg === 'volcanic') return 'rgba(255,70,20,0.08)';
      if (reg === 'shadow') return 'rgba(110,40,160,0.12)';
      return null;
    },
    newDay() {
      const s = G().save;
      s.day++;
      Farm.newDay();
      PQ.World2.respawn();
      Weather.roll();
      PQ.UI.toast('A new day dawns: Day ' + s.day);
      PQ.Bus.emit('day', s.day);
    },
  });

  const Weather = (PQ.Weather = {
    drops: [], cur() {
      const g = G(); if (!g || !g.map || g.map.kind !== 'overworld') return 'clear';
      const r = g.map.region(Math.floor(g.player.x / T), Math.floor(g.player.y / T));
      return (g.save.weather && g.save.weather[r]) || 'clear';
    },
    roll() {
      const s = G().save; s.weather = s.weather || {};
      for (const r in D.REGIONS) { let w = U.weighted(D.REGIONS[r].weather); if (w === 'rain' && Math.random() < 0.25) w = 'storm'; s.weather[r] = w; }
      if (s.weather.greenfields === 'rain' || s.weather.greenfields === 'storm') Farm.rainWater();
    },
    draw(g, vw, vh, t, dt) {
      const w = Weather.cur();
      const P = Weather.drops;
      const want = { rain: 140, storm: 220, snow: 110, blizzard: 260, sandstorm: 160, ash: 90, void: 60, fog: 0, clear: 0 }[w] || 0;
      const n = Math.round(want * PQ.FX.budget);
      while (P.length < n) P.push({ x: Math.random() * vw, y: Math.random() * vh, s: 0.5 + Math.random(), p: Math.random() * 6 });
      if (P.length > n) P.length = n;
      if (w === 'rain' || w === 'storm') {
        g.fillStyle = 'rgba(20,30,70,0.14)'; g.fillRect(0, 0, vw, vh);
        g.strokeStyle = 'rgba(180,210,255,0.55)'; g.lineWidth = 1; g.beginPath();
        for (const d of P) { d.x -= 60 * dt * d.s; d.y += 260 * dt * d.s; if (d.y > vh) { d.y = -6; d.x = Math.random() * (vw + 60); } if (d.x < -10) d.x += vw + 20; g.moveTo(d.x, d.y); g.lineTo(d.x - 2, d.y + 6); }
        g.stroke();
        if (w === 'storm' && Math.random() < dt * 0.15) { PQ.Render.flash = 0.6; setTimeout(() => PQ.Audio.play('thunder'), 300); }
      } else if (w === 'snow' || w === 'blizzard') {
        if (w === 'blizzard') { g.fillStyle = 'rgba(230,240,255,0.22)'; g.fillRect(0, 0, vw, vh); }
        g.fillStyle = '#ffffff';
        for (const d of P) { d.p += dt * 2; d.x += (Math.sin(d.p) * 12 + (w === 'blizzard' ? -70 : -6)) * dt; d.y += 26 * dt * d.s * (w === 'blizzard' ? 2 : 1); if (d.y > vh) { d.y = -2; d.x = Math.random() * vw; } if (d.x < -4) d.x += vw + 8; g.fillRect(d.x | 0, d.y | 0, d.s > 1.1 ? 2 : 1, d.s > 1.1 ? 2 : 1); }
      } else if (w === 'sandstorm') {
        g.fillStyle = 'rgba(230,170,90,0.22)'; g.fillRect(0, 0, vw, vh);
        g.fillStyle = 'rgba(255,230,180,0.6)';
        for (const d of P) { d.x -= 240 * dt * d.s; d.y += Math.sin(d.p += dt) * 10 * dt; if (d.x < -10) { d.x = vw + Math.random() * 40; d.y = Math.random() * vh; } g.fillRect(d.x | 0, d.y | 0, 6, 1); }
      } else if (w === 'ash') {
        for (const d of P) { d.p += dt; d.x += Math.sin(d.p) * 8 * dt; d.y += 14 * dt * d.s; if (d.y > vh) { d.y = -2; d.x = Math.random() * vw; } g.fillStyle = d.s > 1.3 ? '#ff9a2e' : '#5a4a45'; g.fillRect(d.x | 0, d.y | 0, 1, 1); }
      } else if (w === 'void') {
        for (const d of P) { d.p += dt; d.x += Math.sin(d.p * 0.7) * 6 * dt; d.y -= 10 * dt * d.s; if (d.y < -2) { d.y = vh + 2; d.x = Math.random() * vw; } g.fillStyle = d.s > 1.2 ? '#d8b8ff' : '#7552ad'; g.fillRect(d.x | 0, d.y | 0, 1, 1); }
      } else if (w === 'fog') {
        const spr = PQ.Art.glowSprite(64, 'rgba(210,220,230,0.35)');
        for (let i = 0; i < 7; i++) { const x = ((i * 97 + t * 8) % (vw + 160)) - 80, y = (i * 53) % vh; g.drawImage(spr, x - 70, y - 40, 140, 80); }
      }
    },
  });

  /* =========================================================
     INVENTORY & ITEMS
     ========================================================= */
  const Inv = (PQ.Inv = {
    SIZE: 36,
    def: (id) => D.ITEMS[id],
    isEquip: (d) => d && (d.type === 'weapon' || d.type === 'armor'),
    rollRarity(tier = 1, luck = 0) {
      const w = [[0, 60 - tier * 4], [1, 26 + tier], [2, 9 + tier * 2 + luck * 6], [3, 2.5 + tier * 1.3 + luck * 3], [4, tier >= 2 ? 0.6 + tier * 0.4 + luck * 2 : 0.1], [5, tier >= 5 ? 0.25 + luck : 0]];
      return U.weighted(w);
    },
    make(id, opts = {}) {
      const d = D.ITEMS[id];
      if (!Inv.isEquip(d)) return { id, n: opts.n || 1 };
      const r = d.fixedRarity != null ? d.fixedRarity : opts.r != null ? opts.r : 0;
      const inst = { id, n: 1, r, aff: {}, uid: U.uid() };
      const pool = d.type === 'weapon' ? ['atk', 'crit', 'spd', 'hp', 'sta'] : ['def', 'hp', 'mp', 'sta', 'crit', 'spd', 'fire', 'ice', 'shadow', 'regen'];
      const n = D.RARITY[r].affixes;
      const tier = (d.tier || 1) + 1;
      for (let i = 0; i < n; i++) {
        const k = U.pick(pool.filter((p) => !(p in inst.aff)));
        if (!k) break;
        const base = { atk: 2 * tier, def: 1.5 * tier, hp: 8 * tier, mp: 6 * tier, sta: 8 + 3 * tier, crit: 2 + tier * 0.6, spd: 2 + tier * 0.5, fire: 6 + tier * 2, ice: 6 + tier * 2, shadow: 6 + tier * 2, regen: 0.3 * tier }[k];
        const v = base * (0.7 + Math.random() * 0.6); inst.aff[k] = k === 'regen' ? Math.round(v * 10) / 10 : Math.max(1, Math.round(v));
      }
      if (D.RARITY[r].passive && !d.unique) inst.aff.passive = U.pick(Object.keys(D.PASSIVES));
      return inst;
    },
    name(inst) { const d = D.ITEMS[inst.id]; return d ? d.name : inst.id; },
    count(save, id) { let n = 0; for (const s of save.inv) if (s && s.id === id) n += s.n; return n; },
    add(save, id, n = 1, inst) {
      const d = D.ITEMS[id];
      if (!d) return n;
      if (Inv.isEquip(d)) {
        let left = n;
        while (left > 0) {
          const i = save.inv.findIndex((s) => !s);
          if (i < 0) return left;
          save.inv[i] = inst && left === n ? inst : Inv.make(id);
          left--;
        }
        return 0;
      }
      let left = n;
      for (const s of save.inv) if (s && s.id === id && s.n < d.stack && left > 0) { const k = Math.min(left, d.stack - s.n); s.n += k; left -= k; }
      while (left > 0) {
        const i = save.inv.findIndex((s) => !s);
        if (i < 0) return left;
        const k = Math.min(left, d.stack); save.inv[i] = { id, n: k }; left -= k;
      }
      save.seen = save.seen || {}; save.seen[id] = 1;
      return 0;
    },
    remove(save, id, n = 1) {
      if (Inv.count(save, id) < n) return false;
      for (let i = save.inv.length - 1; i >= 0 && n > 0; i--) { const s = save.inv[i]; if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (s.n <= 0) save.inv[i] = null; } }
      return true;
    },
    free(save) { return save.inv.filter((s) => !s).length; },
    /* stats of an equipment instance */
    stats(inst) {
      const d = D.ITEMS[inst.id], m = D.RARITY[inst.r || 0].mult;
      const out = {};
      if (d.type === 'weapon') out.dmg = Math.round(d.dmg * m * 10) / 10;
      if (d.def) out.def = Math.round(d.def * m);
      for (const k in d.stats || {}) out[k] = (out[k] || 0) + d.stats[k] * (k === 'crit' || k === 'spd' ? 1 : m);
      for (const k in inst.aff || {}) if (k !== 'passive') out[k] = (out[k] || 0) + inst.aff[k];
      return out;
    },
    passive(inst) { const d = D.ITEMS[inst.id]; return d.unique || (inst.aff && inst.aff.passive) || null; },
    value(inst) { const d = D.ITEMS[inst.id]; return Math.max(1, Math.round(d.value * (inst.r ? D.RARITY[inst.r].mult * (1 + inst.r * 0.4) : 1))); },
  });

  /* =========================================================
     STATS
     ========================================================= */
  const Stats = (PQ.Stats = {
    compute(save) {
      const lvl = save.lvl;
      const sk = (id) => save.skills[id] || 0;
      const s = { lvl, maxHp: 100 + 12 * (lvl - 1), maxMp: 40 + 5 * (lvl - 1), maxSta: 100, atk: (lvl - 1) * 0.6, def: 0, crit: 5, spd: 0, fire: 0, ice: 0, shadow: 0, regen: 0, passives: new Set(), meleeMult: 1, magicMult: 1, rangedMult: 1, critMult: 1.6, staRegen: 1, mpRegen: 1, rollCost: 22, magnet: 36, light: 0 };
      for (const slot in save.eq) {
        const it = save.eq[slot]; if (!it) continue;
        const st = Inv.stats(it);
        for (const k in st) if (k !== 'dmg') s[k] = (s[k] || 0) + st[k];
        const pv = Inv.passive(it); if (pv) s.passives.add(pv);
      }
      s.maxHp = Math.round(s.maxHp + 20 * sk('w_tough') + (s.hp || 0)); s.maxMp = Math.round(s.maxMp + 15 * sk('m_mind') + (s.mp || 0)); s.maxSta = Math.round(s.maxSta + (s.sta || 0));
      s.meleeMult += 0.08 * sk('w_might'); s.staRegen += 0.25 * sk('w_wind'); s.crit += 4 * sk('r_eye'); s.spd += 6 * sk('r_fleet'); s.rollCost *= 1 - 0.15 * sk('r_fleet');
      s.mpRegen += 0.4 * sk('m_flow'); s.magicMult += 0.1 * sk('m_power'); if (sk('r_dead')) s.critMult += 0.6;
      if (s.passives.has('swift')) { s.spd += 10; s.rollCost *= 0.7; }
      if (s.passives.has('bulwark')) s.def *= 1.25;
      // companion passive
      const c = PQ.Creatures.active(save);
      if (c) { const cd = D.CREATURES[c.sp]; const pv = cd.passive; const k = 1 + c.lvl * 0.06; s[pv.stat] = (s[pv.stat] || 0) + pv.v * k; if (cd.role === 'guard') s.guard = 0.08; if (cd.role === 'gatherer') s.magnet = 70; if (cd.role === 'lantern') s.light = 0.6; }
      // buffs
      const b = save.buffs || {};
      if (b.might > 0) { s.meleeMult += 0.15; s.magicMult += 0.15; s.rangedMult += 0.15; }
      if (b.swift > 0) s.spd += 12;
      if (b.fireres > 0) s.fire += 40;
      if (b.iceres > 0) s.ice += 40;
      if (b.regen > 0) s.regen += 2;
      if (b.stamina > 0) s.staRegen *= 2;
      for (const k of ['fire', 'ice', 'shadow']) s[k] = Math.min(75, s[k]);
      s.crit = Math.min(70, s.crit);
      // weapon
      const w = save.eq.weapon;
      if (w) {
        const d = D.ITEMS[w.id], wc = D.WCLASS[d.wclass];
        s.weaponItem = d; s.weapon = Object.assign({}, wc, { wclass: d.wclass, dmg: Inv.stats(w).dmg + s.atk, element: d.element });
        if (wc.crit) s.crit += wc.crit;
      } else {
        s.weaponItem = null; s.weapon = Object.assign({}, D.WCLASS.sword, { wclass: 'fist', dmg: 3 + s.atk, range: 12, arc: 1.4, rate: 3, kb: 30 });
      }
      return s;
    },
  });

  /* =========================================================
     CRAFTING
     ========================================================= */
  const Craft = (PQ.Craft = {
    known(save, r) {
      if (r.lvl && save.lvl < r.lvl) return false;
      const seen = save.seen || {};
      return r.ins.some(([id]) => seen[id]) || r.station === 'workbench';
    },
    list(save, station) { return D.RECIPES.filter((r) => r.station === station); },
    missing(save, r) { return r.ins.filter(([id, n]) => Inv.count(save, id) < n).map(([id, n]) => [id, n - Inv.count(save, id)]); },
    can(save, r) { return Craft.known(save, r) && !Craft.missing(save, r).length && (Inv.free(save) > 0 || Inv.count(save, r.out) > 0 && !Inv.isEquip(D.ITEMS[r.out])); },
    craft(save, r) {
      if (!Craft.can(save, r)) return null;
      for (const [id, n] of r.ins) Inv.remove(save, id, n);
      const d = D.ITEMS[r.out];
      let inst = null;
      if (Inv.isEquip(d)) inst = Inv.make(r.out, { r: U.weighted([[0, 60], [1, 30], [2, 9], [3, 1]]) });
      const left = Inv.add(save, r.out, r.n, inst);
      if (left) PQ.G.dropItem(r.out, left, inst);
      PQ.Bus.emit('quest', 'craft', r.out, r.n);
      PQ.Audio.play('craft');
      return inst || { id: r.out, n: r.n };
    },
  });

  /* =========================================================
     QUESTS
     ========================================================= */
  const Quests = (PQ.Quests = {
    st: (id) => G().save.quests[id],
    reqsDone(q) { return (q.req || []).every((r) => Quests.st(r) && Quests.st(r).st === 'done'); },
    start(id, silent) {
      const s = G().save;
      if (s.quests[id]) return;
      const q = D.QUESTS[id];
      s.quests[id] = { st: 'active', p: q.obj.map(() => 0) };
      if (!silent) { PQ.UI.toast((q.main ? 'Main quest: ' : 'New quest: ') + q.name, 'quest'); PQ.Audio.play('quest'); }
      Quests.check();
    },
    available(npc) { return Object.values(D.QUESTS).filter((q) => q.giver === npc && !q.main && !Quests.st(q.id) && Quests.reqsDone(q)); },
    objDone(q, i) {
      const s = G().save, o = q.obj[i], p = s.quests[q.id].p[i];
      if (o.t === 'have' || o.t === 'deliver') return Inv.count(s, o.item) >= o.n;
      if (o.t === 'species') return Object.keys(s.creatures.seen).length >= o.n;
      return p >= (o.n || 1);
    },
    objProgress(q, i) {
      const s = G().save, o = q.obj[i];
      if (o.t === 'have' || o.t === 'deliver') return Math.min(o.n, Inv.count(s, o.item));
      if (o.t === 'species') return Math.min(o.n, Object.keys(s.creatures.seen).length);
      return Math.min(o.n || 1, s.quests[q.id].p[i]);
    },
    complete(q) { return q.obj.every((_, i) => Quests.objDone(q, i)); },
    needsTurnIn(q) { return q.obj.some((o) => o.t === 'deliver'); },
    onEvent(type, a, n = 1) {
      const s = G().save;
      for (const id in s.quests) {
        const qs = s.quests[id]; if (qs.st !== 'active') continue;
        const q = D.QUESTS[id];
        q.obj.forEach((o, i) => {
          if (o.t !== type) return;
          if ((type === 'gather' || type === 'craft' || type === 'mine') && o.item !== a) return;
          if (type === 'kill' && o.enemy !== a) return;
          if (type === 'talk' && o.npc !== a) return;
          if (type === 'boss' && o.boss !== a) return;
          if (type === 'visit' && o.spot !== a) return;
          if (type === 'talk' && i > 0 && !Quests.objDone(q, i - 1)) return;
          qs.p[i] += n;
        });
      }
      Quests.check();
    },
    check() {
      const s = G().save;
      for (const id in s.quests) {
        const qs = s.quests[id]; if (qs.st !== 'active') continue;
        const q = D.QUESTS[id];
        if (Quests.complete(q) && !Quests.needsTurnIn(q)) Quests.finish(id);
      }
      // auto-start main quests whose requirements are met
      for (const q of Object.values(D.QUESTS)) if (q.main && !s.quests[q.id] && Quests.reqsDone(q)) Quests.start(q.id);
    },
    finish(id) {
      const s = G().save, q = D.QUESTS[id], qs = s.quests[id];
      if (!qs || qs.st === 'done') return;
      for (const o of q.obj) if (o.t === 'deliver') Inv.remove(s, o.item, o.n);
      qs.st = 'done';
      const rw = q.reward;
      if (rw.gold) s.gold += rw.gold;
      if (rw.items) for (const [it, n] of rw.items) { const left = Inv.add(s, it, n, Inv.isEquip(D.ITEMS[it]) ? Inv.make(it, { r: 2 }) : null); if (left) PQ.G.dropItem(it, left); }
      if (rw.xp) PQ.G.gainXp(rw.xp);
      if (rw.event) PQ.G.worldEvent(rw.event);
      PQ.UI.questComplete(q);
      PQ.Audio.play('questdone');
      PQ.G.autosave();
      setTimeout(() => Quests.check(), 50);
    },
    markerFor(npc) {
      const s = G().save;
      for (const id in s.quests) { const qs = s.quests[id]; if (qs.st !== 'active') continue; const q = D.QUESTS[id]; if ((q.giver === npc && Quests.complete(q) && Quests.needsTurnIn(q)) || q.obj.some((o, i) => o.t === 'talk' && o.npc === npc && !Quests.objDone(q, i))) return '?'; }
      if (Quests.available(npc).length) return '!';
      return null;
    },
    tracked() {
      const s = G().save;
      const act = Object.keys(s.quests).filter((id) => s.quests[id].st === 'active').map((id) => D.QUESTS[id]);
      if (!act.length) return null;
      const pin = s.pinned && s.quests[s.pinned] && s.quests[s.pinned].st === 'active' ? D.QUESTS[s.pinned] : null;
      return pin || act.find((q) => q.main) || act[0];
    },
    objText(q, i) { const o = q.obj[i]; const n = o.n || 1; return o.text + (n > 1 ? ' (' + Quests.objProgress(q, i) + '/' + n + ')' : ''); },
    currentObj(q) { const i = q.obj.findIndex((_, k) => !Quests.objDone(q, k)); return i < 0 ? (Quests.needsTurnIn(q) ? 'Return to ' + D.NPCS[q.giver].name : 'Complete!') : Quests.objText(q, i); },
  });

  /* =========================================================
     FARMING
     ========================================================= */
  const Farm = (PQ.Farm = {
    newDay() {
      const g = G(), s = g.save, m = g.maps.world;
      const garden = PQ.Creatures.active(s) && D.CREATURES[PQ.Creatures.active(s).sp].role === 'gardener';
      for (const key in s.farm) {
        const f = s.farm[key];
        if (f.crop && (f.w || garden)) { f.stage++; const def = D.CROPS[f.crop]; if (f.stage > def.days) f.stage = def.days; }
        f.w = 0;
        const i = +key, x = i % m.w, y = (i / m.w) | 0;
        if (m.t(x, y) === TL.WET) { m.set(x, y, TL.TILLED); PQ.World2.setTile(m, x, y, TL.TILLED); }
      }
      if (garden && Object.keys(s.farm).length) PQ.UI.toast('Your Sproutling watered the crops.');
    },
    rainWater() {
      const g = G(), s = g.save, m = g.maps.world;
      for (const key in s.farm) { const f = s.farm[key]; if (f.crop) { f.w = 1; const i = +key; m.set(i % m.w, (i / m.w) | 0, TL.WET); PQ.World2.setTile(m, i % m.w, (i / m.w) | 0, TL.WET); } }
    },
  });

  /* =========================================================
     FISHING (skill-based reel minigame)
     ========================================================= */
  const Fishing = (PQ.Fishing = {
    active: false,
    start(g, tx, ty) {
      const s = g.save;
      const rod = Math.max(Inv.count(s, 'rod1') ? 1 : 0, Inv.count(s, 'rod2') ? 2 : 0);
      if (!rod) { PQ.UI.toast('You need a Fishing Rod (Workbench: 4 Wood, 6 Fiber, or buy one from Odo or Nell).'); return false; }
      this.active = true; this.phase = 'wait'; this.t = 0; this.rod = rod;
      this.wait = 1.4 + Math.random() * 3.2;
      this.bob = { x: tx * T + 8, y: ty * T + 9 };
      g.player.state = 'fish';
      PQ.Audio.play('cast');
      return true;
    },
    pickFish(g) {
      const reg = g.map.id === 'shadow' ? 'shadow' : g.map.region(Math.floor(this.bob.x / T), Math.floor(this.bob.y / T));
      const night = Time.isNight();
      const pool = D.FISH.filter((f) => f.region.includes(reg) && (!f.night || night) && (!f.rare || Math.random() < 0.06 * this.rod));
      const list = pool.length ? pool : D.FISH.filter((f) => f.id === 'minnow');
      return U.weighted(list.map((f) => [f, [10, 6, 3, 1.4, 0.6][f.rar] * (f.rar >= 2 ? this.rod : 1)]));
    },
    update(dt, g, hold, press) {
      if (!this.active) return;
      this.t += dt;
      if (this.phase === 'wait') {
        if (this.t > this.wait) { this.phase = 'bite'; this.t = 0; PQ.Audio.play('bite'); PQ.FX.burst(this.bob.x, this.bob.y, '#d8f6ff', 6, { speed: 30 }); }
        if (press) this.stop('Too early... the fish swam away.');
      } else if (this.phase === 'bite') {
        if (press) { this.phase = 'reel'; this.t = 0; this.fish = this.pickFish(g); this.barY = 0.4; this.barV = 0; this.fishY = 0.5; this.fishV = 0; this.fishT = 0; this.prog = 0.3; this.size = 0.22 + this.rod * 0.04; }
        else if (this.t > 0.75) this.stop('It got away! Press as soon as you see the splash.');
      } else if (this.phase === 'reel') {
        const f = this.fish;
        this.barV += (hold ? 2.6 : -2.2) * dt; this.barV *= 1 - dt * 1.5;
        this.barY = U.clamp(this.barY + this.barV * dt, 0, 1 - this.size); if (this.barY === 0 || this.barY === 1 - this.size) this.barV *= -0.3;
        this.fishT -= dt;
        if (this.fishT <= 0) { this.fishT = 0.4 + Math.random() * (1.4 - f.diff * 0.1); this.fishTarget = Math.random(); }
        this.fishY += (this.fishTarget - this.fishY) * dt * (0.8 + f.diff * 0.35);
        this.fishY = U.clamp(this.fishY + (Math.random() - 0.5) * dt * f.diff * 0.4, 0.03, 0.97);
        const inZone = this.fishY >= this.barY && this.fishY <= this.barY + this.size;
        this.prog += (inZone ? 0.34 : -0.22 - f.diff * 0.015) * dt;
        if (this.prog >= 1) this.catchIt(g);
        else if (this.prog <= 0) this.stop('The ' + f.name + ' escaped!');
      }
    },
    catchIt(g) {
      const f = this.fish, s = g.save;
      const left = Inv.add(s, f.id, 1);
      if (left) g.dropItem(f.id, 1);
      s.fishLog = s.fishLog || {}; s.fishLog[f.id] = (s.fishLog[f.id] || 0) + 1;
      PQ.UI.toast('Caught a ' + f.name + '!', 'r' + Math.min(4, f.rar));
      PQ.Audio.play('catch');
      PQ.Bus.emit('quest', 'fish', f.id, 1);
      g.gainXp(4 + f.rar * 6);
      this.stop();
    },
    stop(msg) { this.active = false; this.bob = null; const g = G(); if (g.player.state === 'fish') g.player.state = 'idle'; if (msg) PQ.UI.toast(msg); },
    drawBob(g, ox, oy, t) {
      if (!this.bob) return;
      const p = G().player;
      const bx = Math.round(this.bob.x - ox), by = Math.round(this.bob.y - oy + (this.phase === 'bite' ? Math.sin(t * 30) * 2 : Math.sin(t * 3)));
      g.strokeStyle = 'rgba(240,240,250,0.8)'; g.beginPath(); g.moveTo(Math.round(p.x - ox) + 6, Math.round(p.y - oy) - 16); g.quadraticCurveTo((bx + p.x - ox) / 2, by - 20, bx, by - 2); g.stroke();
      PQ.Art.rect(g, bx - 2, by - 3, 4, 3, '#e8363c'); PQ.Art.rect(g, bx - 2, by - 1, 4, 1, '#ffffff');
      if (this.phase === 'bite') PQ.Font.draw(g, '!', bx, by - 16, '#ffd75a', 2, 'center', '#120d18');
    },
    drawUI(g, vw, vh) { // in screen space, logical pixels
      if (!this.active || this.phase !== 'reel') return;
      const H = Math.min(110, vh - 60), W = 14, x = Math.round(vw / 2 + 30), y = Math.round(vh / 2 - H / 2);
      g.fillStyle = '#120d18'; g.fillRect(x - 2, y - 2, W + 4 + 8, H + 4);
      g.fillStyle = '#1f3a66'; g.fillRect(x, y, W, H);
      const by = y + H - (this.barY + this.size) * H;
      g.fillStyle = '#5fdc6a'; g.fillRect(x + 1, Math.round(by), W - 2, Math.round(this.size * H));
      g.fillStyle = '#a8f0b0'; g.fillRect(x + 1, Math.round(by), W - 2, 1);
      const fy = y + H - this.fishY * H;
      const fi = PQ.Art.icon(D.ITEMS[this.fish.id]);
      g.drawImage(fi, x - 1, Math.round(fy) - 8);
      g.fillStyle = '#3a2a20'; g.fillRect(x + W + 2, y, 6, H);
      const ph = Math.round(this.prog * H);
      g.fillStyle = this.prog > 0.66 ? '#5fdc6a' : this.prog > 0.33 ? '#ffd75a' : '#ff6a4a'; g.fillRect(x + W + 3, y + H - ph, 4, ph);
      PQ.Font.draw(g, 'HOLD to reel', x + W / 2 + 4, y + H + 5, '#ffffff', 1, 'center', '#120d18');
    },
  });

  /* =========================================================
     CREATURES
     ========================================================= */
  const Creatures = (PQ.Creatures = {
    active(save) { const c = save.creatures; return c.active ? c.owned.find((o) => o.uid === c.active) : null; },
    power(data) { const d = D.CREATURES[data.sp]; return Math.round(d.atk * (1 + data.lvl * 0.18)); },
    xpNext: (lvl) => 30 + lvl * lvl * 12,
    gainXp(g, xp) {
      const c = Creatures.active(g.save); if (!c || c.lvl >= 25) return;
      c.xp += xp;
      while (c.xp >= Creatures.xpNext(c.lvl) && c.lvl < 25) { c.xp -= Creatures.xpNext(c.lvl); c.lvl++; PQ.UI.toast(D.CREATURES[c.sp].name + ' reached level ' + c.lvl + '!'); PQ.Audio.play('levelup'); if (c.lvl === 10 && D.CREATURES[c.sp].evolve) PQ.UI.toast(D.CREATURES[c.sp].name + ' can now evolve at a Creature Altar!'); }
      g.recalc();
    },
    tryBond(g, critter, power) {
      const d = critter.def, r = D.CREATURE_RARITY[d.rar];
      const weak = 1 - critter.hp / critter.maxHp;
      const chance = U.clamp(r.chance * power * (1 + weak * 1.6), 0.03, 0.95);
      const ok = Math.random() < chance;
      PQ.FX.burst(critter.x, critter.y - 8, ok ? ['#ff70b0', '#ffd75a', '#ffffff'] : '#888899', ok ? 24 : 8, { speed: 50 });
      if (!ok) { critter.flee = 2; PQ.UI.toast(d.name + ' is not convinced... (' + Math.round(chance * 100) + '% chance)'); PQ.Audio.play('fail'); return false; }
      const s = g.save;
      const lvl = Math.max(1, (D.REGIONS[d.region] ? D.REGIONS[d.region].tier : 1) * 3 - 2);
      const data = { uid: U.uid(), sp: critter.sp, lvl, xp: 0 };
      s.creatures.owned.push(data); s.creatures.seen[critter.sp] = 1; s.creatures.caught = s.creatures.caught || {}; s.creatures.caught[critter.sp] = 1;
      if (!s.creatures.active) Creatures.setActive(g, data.uid);
      critter.dead = true;
      PQ.UI.toast(d.name + ' joined your party!', 'r' + Math.min(4, d.rar + 1));
      PQ.Audio.play('bond');
      PQ.Bus.emit('quest', 'bond', critter.sp, 1);
      g.autosave();
      return true;
    },
    setActive(g, uid) { g.save.creatures.active = uid; g.spawnCompanion(); g.recalc(); },
    evolve(g, uid) {
      const s = g.save, c = s.creatures.owned.find((o) => o.uid === uid);
      if (!c) return false;
      const d = D.CREATURES[c.sp];
      if (!d.evolve || c.lvl < d.evolve.lvl || !Inv.remove(s, 'evo_stone', 1)) return false;
      c.sp = d.evolve.to; s.creatures.seen[c.sp] = 1; s.creatures.caught = s.creatures.caught || {}; s.creatures.caught[c.sp] = 1;
      PQ.UI.toast(d.name + ' evolved into ' + D.CREATURES[c.sp].name + '!', 'r3');
      PQ.Audio.play('levelup');
      if (s.creatures.active === uid) g.spawnCompanion();
      g.recalc();
      return true;
    },
  });

  /* =========================================================
     SKILLS
     ========================================================= */
  const Skills = (PQ.Skills = {
    def: (id) => D.SKILLS.find((s) => s.id === id),
    rank: (id) => G().save.skills[id] || 0,
    canLearn(id) { const s = Skills.def(id), sv = G().save; return sv.sp > 0 && Skills.rank(id) < s.max && (s.req || []).every((r) => Skills.rank(r) > 0); },
    learn(id) {
      if (!Skills.canLearn(id)) return false;
      const sv = G().save; sv.sp--; sv.skills[id] = (sv.skills[id] || 0) + 1;
      const s = Skills.def(id);
      if (s.active && !sv.ability) sv.ability = id;
      PQ.Audio.play('learn'); G().recalc(); return true;
    },
  });

  /* =========================================================
     SAVE / LOAD (multiple slots, versioned, validated)
     ========================================================= */
  const Fog = (PQ.Fog = function (w, h, b64) {
    const n = Math.ceil((w * h) / 8);
    this.bits = new Uint8Array(n); this.ver = 1; this.w = w; this.h = h;
    if (b64) { try { const s = atob(b64); for (let i = 0; i < Math.min(n, s.length); i++) this.bits[i] = s.charCodeAt(i); } catch (e) { /* ignore corrupt fog */ } }
  });
  Fog.prototype.has = function (i) { return (this.bits[i >> 3] >> (i & 7)) & 1; };
  Fog.prototype.add = function (i) { if (!this.has(i)) { this.bits[i >> 3] |= 1 << (i & 7); this.ver++; } };
  Fog.prototype.reveal = function (cx, cy, r) { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (x >= 0 && y >= 0 && x < this.w && y < this.h && (x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.add(y * this.w + x); };
  Fog.prototype.toB64 = function () { let s = ''; for (let i = 0; i < this.bits.length; i++) s += String.fromCharCode(this.bits[i]); return btoa(s); };
  Fog.prototype.count = function () { let c = 0; for (const b of this.bits) { let v = b; while (v) { c += v & 1; v >>= 1; } } return c; };

  const Save = (PQ.Save = {
    SLOTS: 3,
    key: (slot) => 'pixelquest.slot.' + slot,
    META: 'pixelquest.meta',
    fresh(slot, name, look) {
      const inv = new Array(Inv.SIZE).fill(null);
      return {
        v: PQ.SAVE_VERSION, slot, name, look, created: Date.now(), saved: Date.now(), played: 0,
        seed: (Math.random() * 1e9) | 0,
        lvl: 1, xp: 0, sp: 0, skills: {}, ability: null, hp: 100, mp: 40, sta: 100, gold: 60,
        inv, eq: { weapon: null, helmet: null, chest: null, gloves: null, boots: null, ring: null, necklace: null, acc: null },
        hot: ['hp_small', null, null, null], storage: new Array(40).fill(null),
        quests: {}, bosses: {}, waypoints: {}, fog: {}, seen: {},
        creatures: { owned: [], seen: {}, caught: {}, active: null },
        farm: {}, home: { upgraded: 0, decor: [] }, world: {}, events: {}, sigils: [0, 0, 0, 0],
        day: 1, minute: 6 * 60 + 30, weather: {}, buffs: {}, keys: {},
        pos: null, counters: { chests: 0, kills: 0 }, pinned: null,
      };
    },
    starter(s) {
      s.eq.weapon = Inv.make('sword_0');
      Inv.add(s, 'hoe', 1); Inv.add(s, 'can', 1); Inv.add(s, 'hp_small', 3); Inv.add(s, 'turnip_seed', 6); Inv.add(s, 'bread', 2);
      s.seen = { wood: 1, stone: 1, sword_0: 1 };
    },
    validate(o) {
      if (!o || typeof o !== 'object' || !o.look || !o.name) throw new Error('missing core fields');
      const d = Save.fresh(o.slot, o.name, o.look);
      for (const k in d) if (o[k] === undefined) o[k] = d[k];
      if (!Array.isArray(o.inv)) o.inv = d.inv;
      while (o.inv.length < Inv.SIZE) o.inv.push(null);
      o.inv = o.inv.map((s) => (s && D.ITEMS[s.id] && s.n > 0 ? s : null));
      for (const k in d.eq) { if (!(k in o.eq)) o.eq[k] = null; if (o.eq[k] && !D.ITEMS[o.eq[k].id]) o.eq[k] = null; }
      if (!Array.isArray(o.storage)) o.storage = d.storage;
      o.storage = o.storage.map((s) => (s && D.ITEMS[s.id] && s.n > 0 ? s : null));
      o.lvl = U.clamp(o.lvl | 0, 1, 50); o.gold = Math.max(0, o.gold | 0);
      o.minute = U.clamp(+o.minute || 390, 0, 1439); o.day = Math.max(1, o.day | 0);
      if (!o.creatures || !Array.isArray(o.creatures.owned)) o.creatures = d.creatures;
      o.creatures.owned = o.creatures.owned.filter((c) => c && D.CREATURES[c.sp]);
      if (!Array.isArray(o.sigils)) o.sigils = [0, 0, 0, 0];
      if (!Array.isArray(o.hot)) o.hot = d.hot;
      for (const id in o.quests) if (!D.QUESTS[id]) delete o.quests[id];
      return o;
    },
    write(save, fogs) {
      save.saved = Date.now();
      if (fogs) for (const id in fogs) save.fog[id] = fogs[id].toB64();
      const ok = PQ.Store.set(Save.key(save.slot), JSON.stringify(save));
      if (ok) {
        const meta = Save.meta();
        meta[save.slot] = { name: save.name, lvl: save.lvl, played: save.played, loc: save.locName || 'Greenfields', date: save.saved, look: save.look };
        PQ.Store.set(Save.META, JSON.stringify(meta));
      }
      return ok;
    },
    meta() { try { return JSON.parse(PQ.Store.get(Save.META) || '{}') || {}; } catch (e) { return {}; } },
    read(slot) {
      const raw = PQ.Store.get(Save.key(slot));
      if (!raw) return null;
      try { return Save.validate(JSON.parse(raw)); } catch (e) { PQ.Store.set(Save.key(slot) + '.corrupt', raw); return { corrupt: true }; }
    },
    del(slot) { PQ.Store.del(Save.key(slot)); const meta = Save.meta(); delete meta[slot]; PQ.Store.set(Save.META, JSON.stringify(meta)); },
    latest() { const m = Save.meta(); let best = null; for (const k in m) if (!best || m[k].date > m[best].date) best = k; return best; },
    exportCode(save) { return 'PQ1:' + btoa(unescape(encodeURIComponent(JSON.stringify(save)))); },
    importCode(str, slot) {
      str = (str || '').trim();
      if (!str.startsWith('PQ1:')) throw new Error('That is not a Pixel Quest save code (codes start with PQ1:).');
      let o; try { o = JSON.parse(decodeURIComponent(escape(atob(str.slice(4))))); } catch (e) { throw new Error('The code is damaged or incomplete.'); }
      o.slot = slot; return Save.validate(o);
    },
  });
})();
