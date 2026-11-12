/* PIXEL QUEST — entities: player, enemies, bosses, NPCs, companions, wild creatures, projectiles, pickups */
'use strict';
(function () {
  const T = PQ.T, TL = PQ.TILE, U = PQ.U, Art = PQ.Art, FX = PQ.FX;
  const E = {};
  PQ.Ent = E;
  const flashCache = new WeakMap();
  function white(spr) { let w = flashCache.get(spr); if (!w) { w = Art.tint(spr, '#ffffff'); flashCache.set(spr, w); } return w; }
  E.white = white;
  function shadow(g, x, y, w) { g.fillStyle = 'rgba(10,8,20,0.32)'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), w, w * 0.4, 0, 0, Math.PI * 2); g.fill(); }
  E.shadow = shadow;
  const dirOf = (a) => { const d = Math.round(a / (Math.PI / 2)); return d === 0 ? 'right' : d === 1 ? 'down' : d === -1 ? 'up' : 'left'; };
  E.dirOf = dirOf;

  /* collision: box of half-width hw, height hh above feet */
  E.blocked = function (m, x, y, hw, hh, fly, ent) {
    const G = PQ.G;
    const pts = [[x - hw, y - hh], [x + hw, y - hh], [x - hw, y], [x + hw, y]];
    for (const [px, py] of pts) {
      const tx = Math.floor(px / T), ty = Math.floor(py / T);
      if (fly) { const t = m.t(tx, ty); if (t === TL.WALL || t === TL.CLIFF || (!m.inb(tx, ty))) return true; const o = m.obj(tx, ty); if (o && o.solid && !o.gone && (o.k === 'house' || o.k === 'door' || o.k === 'ruinwall')) return true; continue; }
      const w = G.walkAt(tx, ty, ent);
      if (w === 0) return true;
      if (w === 2 && ent && !ent.isPlayer) return true; // only the player swims
    }
    return false;
  };
  E.move = function (e, dx, dy, m) {
    const hw = e.hw || 4, hh = e.hh || 4;
    let moved = false;
    if (dx && !E.blocked(m, e.x + dx, e.y, hw, hh, e.fly, e)) { e.x += dx; moved = true; }
    else if (dx && e.isPlayer && !dy) { // corner slide
      for (const s of [3, -3]) if (!E.blocked(m, e.x + dx, e.y + s, hw, hh, e.fly, e) && !E.blocked(m, e.x, e.y + s * 0.5, hw, hh, e.fly, e)) { e.y += s * 0.4; break; }
    }
    if (dy && !E.blocked(m, e.x, e.y + dy, hw, hh, e.fly, e)) { e.y += dy; moved = true; }
    else if (dy && e.isPlayer && !dx) {
      for (const s of [3, -3]) if (!E.blocked(m, e.x + s, e.y + dy, hw, hh, e.fly, e) && !E.blocked(m, e.x + s * 0.5, e.y, hw, hh, e.fly, e)) { e.x += s * 0.4; break; }
    }
    return moved;
  };

  /* =========================================================
     PLAYER
     ========================================================= */
  class Player {
    constructor(look) {
      this.isPlayer = true; this.x = 0; this.y = 0; this.hw = 4; this.hh = 5; this.r = 6;
      this.face = 'down'; this.ang = Math.PI / 2; this.state = 'idle'; this.t = 0; this.animT = 0;
      this.inv = 0; this.flash = 0; this.kbx = 0; this.kby = 0;
      this.atk = null; this.combo = 0; this.comboT = 0; this.charge = 0; this.charging = false;
      this.roll = null; this.hop = null; this.status = {}; this.cd = 0; this.ability = 0;
      this.setLook(look);
    }
    setLook(look) { this.look = look; this.sheet = PQ.Spr.humanoid(PQ.Spr.look(look)); }
    get swimming() { const G = PQ.G; return G.walkAt(Math.floor(this.x / T), Math.floor((this.y - 1) / T), this) === 2; }
    get climbing() { return PQ.G.map.t(Math.floor(this.x / T), Math.floor((this.y - 1) / T)) === TL.VINE; }
    draw(g, ox, oy, t) {
      const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
      let pose = this.state === 'walk' ? 'walk' : 'idle';
      if (this.atk || this.charging) pose = 'attack';
      if (this.flash > 0.15 && this.state === 'hurt') pose = 'hurt';
      const swim = this.swimming && !this.hop, climb = this.climbing && !this.hop;
      if (climb) pose = 'climb';
      const z = this.hop ? Math.sin(this.hop.t / this.hop.dur * Math.PI) * 14 : 0;
      if (!swim) shadow(g, x, y, 6);
      let spr = PQ.Spr.frame(this.sheet, this.face, pose, this.animT);
      if (this.state === 'dead') spr = this.sheet.down_hurt_0;
      const sx = x - spr.width / 2, sy = y - spr.height + 2 - z;
      if (this.inv > 0 && !this.roll && Math.floor(this.inv * 20) % 2) return;
      // weapon behind when facing up
      if (this.atk && this.face === 'up') this.drawWeapon(g, x, y - z, t);
      if (this.roll) {
        g.save(); g.translate(x, y - 8); g.rotate(this.roll.t / this.roll.dur * Math.PI * 2 * (this.roll.dx < 0 ? -1 : 1)); g.drawImage(spr, -spr.width / 2, -spr.height / 2 + 2); g.restore();
      } else if (swim) {
        g.drawImage(spr, 0, 0, spr.width, 14, sx, sy + 6, spr.width, 14);
        g.fillStyle = 'rgba(216,246,255,0.7)'; const w = Math.sin(t * 6) * 1.5; g.fillRect(x - 7 + w, y - 1, 5, 1); g.fillRect(x + 2 - w, y - 1, 5, 1);
      } else g.drawImage(this.flash > 0 ? white(spr) : spr, sx, sy);
      if (this.atk && this.face !== 'up') this.drawWeapon(g, x, y - z, t);
      if (this.charging && this.charge > 0.15) {
        const k = Math.min(1, this.charge / this.chargeMax());
        g.fillStyle = k >= 1 ? '#ffd75a' : '#e8ecf3';
        g.fillRect(x - 8, y - spr.height - 2, Math.round(16 * k), 2);
        if (k >= 1 && Math.floor(t * 12) % 2) FX.spark(this.x + (Math.random() - 0.5) * 12, this.y - 10, '#ffd75a');
      }
      if (this.state === 'fish' && PQ.Fishing.bob) PQ.Fishing.drawBob(g, ox, oy, t);
      if (this.status.chill > 0) { g.fillStyle = 'rgba(160,220,255,0.35)'; g.fillRect(sx + 2, sy + 2, spr.width - 4, spr.height - 4); }
    }
    chargeMax() { const w = PQ.G.stats.weapon; return w.wclass === 'bow' ? 0.8 / (1 + 0.25 * (PQ.G.skill('r_draw'))) : 0.5; }
    drawWeapon(g, x, y, t) {
      const a = this.atk; const it = PQ.G.stats.weaponItem;
      if (!it) return;
      const icon = Art.icon(it);
      const wc = PQ.G.stats.weapon.wclass;
      let ang = a.ang;
      if (wc === 'bow' || wc === 'staff') {
        ang = a.ang; const k = 1;
        g.save(); g.translate(x + Math.cos(ang) * 7, y - 8 + Math.sin(ang) * 5); g.rotate(ang + Math.PI / 4); g.drawImage(icon, -8, -8); g.restore();
        void k; return;
      }
      const p = U.clamp(a.t / a.dur, 0, 1);
      const sw = a.spin ? Math.PI * 2 : a.arc;
      const from = a.ang - (sw / 2) * a.dir, cur = from + sw * U.easeOut(p) * a.dir;
      const reach = a.thrust ? 4 + Math.sin(p * Math.PI) * 10 : 6;
      g.save(); g.translate(x + Math.cos(cur) * reach, y - 7 + Math.sin(cur) * reach * 0.8); g.rotate(cur + Math.PI / 4); g.drawImage(icon, -3, -13); g.restore();
      // slash trail
      if (p < 0.85 && !a.thrust) {
        g.strokeStyle = a.charged ? 'rgba(255,215,90,0.8)' : 'rgba(255,255,255,0.75)'; g.lineWidth = a.charged ? 3 : 2;
        g.beginPath(); g.ellipse(x, y - 7, a.range * 0.9, a.range * 0.7, 0, Math.min(from, cur), Math.max(from, cur)); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y - 7, a.range * 0.7, a.range * 0.55, 0, Math.min(from, cur), Math.max(from, cur)); g.stroke();
      }
    }
  }
  E.Player = Player;

  /* =========================================================
     PICKUPS (loot)
     ========================================================= */
  class Pickup {
    constructor(x, y, item, n = 1, inst) { this.x = x; this.y = y; this.item = item; this.n = n; this.inst = inst; this.z = 6; this.vz = 50 + Math.random() * 40; const a = Math.random() * 6.28; this.vx = Math.cos(a) * 30; this.vy = Math.sin(a) * 20; this.t = 0; this.isPickup = true; this.ysort = -2; }
    update(dt, G) {
      this.t += dt;
      this.vz -= 220 * dt; this.z += this.vz * dt; if (this.z < 0) { this.z = 0; this.vz = Math.abs(this.vz) * 0.35; if (this.vz < 15) this.vz = 0; }
      this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= 1 - dt * 3; this.vy *= 1 - dt * 3;
      const p = G.player;
      const mag = G.stats.magnet;
      const d = U.dist(this.x, this.y, p.x, p.y);
      if (this.t > 0.5 && d < mag) { const k = (1 - d / mag) * 220 + 60; this.x += (p.x - this.x) / d * k * dt; this.y += (p.y - 6 - this.y) / d * k * dt; }
      if (this.t > 0.5 && d < 10) { if (G.giveDrop(this)) this.dead = true; }
      if (this.t > 240) this.dead = true;
    }
    draw(g, ox, oy, t) {
      const it = PQ.D.ITEMS[this.item] || PQ.D.ITEMS[this.item === '__gold' ? 'stone' : 'stone'];
      const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
      shadow(g, x, y, 4);
      const bob = Math.sin(t * 4 + this.x) * 1.5;
      if (this.item === '__gold') { const c = Art.S.coin || (Art.S.coin = Art.icon({ id: '__coin', icon: 'coin' })); g.drawImage(c, x - 6, y - 10 - this.z + bob, 12, 12); return; }
      const ic = Art.icon(it);
      if (this.inst && this.inst.r >= 2) { g.fillStyle = PQ.D.RARITY[this.inst.r].color; g.globalAlpha = 0.35 + 0.2 * Math.sin(t * 5); g.fillRect(x - 6, y - 14 - this.z + bob, 12, 12); g.globalAlpha = 1; }
      g.drawImage(ic, x - 6, y - 14 - this.z + bob, 12, 12);
    }
  }
  E.Pickup = Pickup;

  /* =========================================================
     PROJECTILES
     ========================================================= */
  class Proj {
    constructor(o) { Object.assign(this, { t: 0, life: 1.6, r: 3, pierce: 0, hits: new Set(), ysort: 4 }, o); this.isProj = true; }
    update(dt, G) {
      this.t += dt;
      if (this.homing && this.t > 0.15) { const p = G.player; const a = Math.atan2(p.y - 6 - this.y, p.x - this.x), cur = Math.atan2(this.vy, this.vx), s = Math.hypot(this.vx, this.vy); const na = cur + U.clamp(U.angDiff(cur, a), -this.homing * dt, this.homing * dt); this.vx = Math.cos(na) * s; this.vy = Math.sin(na) * s; }
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.t > this.life) { this.die(G); return; }
      const tx = Math.floor(this.x / T), ty = Math.floor(this.y / T);
      const m = G.map, tt = m.t(tx, ty), o = m.obj(tx, ty);
      if (tt === TL.WALL || tt === TL.CLIFF || (o && o.solid && !o.gone && o.k !== 'herb' && o.k !== 'plate')) {
        if (this.friendly && o && o.k === 'switch') G.hitSwitch(o);
        if (this.friendly && o && o.k === 'ruinwall' && o.crack && this.bomb) G.crackWall(o);
        this.die(G); return;
      }
      if (this.trail && Math.random() < 0.7) FX.burst(this.x, this.y, this.trail, 1, { speed: 6, up: 5, life: 0.3, grav: 0, z: 6 });
      if (this.friendly) {
        for (const e of G.ents) {
          if (!e.isEnemy || e.dead || this.hits.has(e) || e.untargetable) continue;
          if (U.dist(this.x, this.y, e.x, e.y - (e.hit_h || 6)) < this.r + e.r) {
            this.hits.add(e);
            G.damageEnemy(e, this.dmg, { el: this.el, kb: this.kb || 50, fx: this.x - this.vx * 0.05, fy: this.y - this.vy * 0.05, crit: this.crit, ranged: 1 });
            if (this.aoe) { FX.hazard({ kind: 'circle', x: this.x, y: this.y, r: this.aoe, delay: 0, dmg: this.dmg * 0.6, friendly: 1, color: this.color || '#ff9a2e', el: this.el, shake: 0.2 }); }
            if (this.pierce-- <= 0) { this.die(G); return; }
          }
        }
      } else {
        const p = G.player;
        if (U.dist(this.x, this.y, p.x, p.y - 7) < this.r + 5) {
          G.hurtPlayer(this.dmg, this.status, this.x - this.vx * 0.1, this.y - this.vy * 0.1);
          if (this.status === 'slow') p.status.chill = 2;
          this.die(G); return;
        }
        // companions can block shots? no: keep simple
      }
    }
    die(G) {
      this.dead = true;
      FX.burst(this.x, this.y, this.color || '#fff', 5, { speed: 40, life: 0.3 });
      if (this.bomb) { G.explode(this.x, this.y, this.friendly); }
    }
    draw(g, ox, oy, t) {
      const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
      const a = Math.atan2(this.vy, this.vx);
      g.save(); g.translate(x, y - 6);
      if (this.kind === 'arrow') { g.rotate(a); Art.rect(g, -6, 0, 9, 1, '#a06a3c'); Art.rect(g, 3, -1, 3, 3, '#e0e6ee'); Art.rect(g, -7, -1, 2, 3, '#e8363c'); }
      else if (this.kind === 'rock') { Art.rect(g, -2, -2, 4, 4, '#858598'); Art.px(g, -1, -1, '#b4b4c4'); }
      else if (this.kind === 'needle') { g.rotate(a); Art.rect(g, -3, 0, 6, 1, '#dfe8b0'); }
      else if (this.kind === 'web') { g.strokeStyle = '#e8e8f0'; g.beginPath(); g.arc(0, 0, 3, 0, 6.28); g.moveTo(-4, 0); g.lineTo(4, 0); g.moveTo(0, -4); g.lineTo(0, 4); g.stroke(); }
      else if (this.kind === 'bomb') { const z = Math.sin(Math.min(1, this.t / this.life) * Math.PI) * 18; Art.rect(g, -3, -3 - z, 6, 6, '#2a2a36'); Art.px(g, -1, -2 - z, '#6a6a7e'); Art.px(g, 1, -5 - z, Math.floor(t * 20) % 2 ? '#ffd75a' : '#ff6a2e'); }
      else if (this.kind === 'leaf') { g.rotate(t * 8); Art.rect(g, -2, -1, 4, 2, '#64b33f'); Art.px(g, 1, -1, '#9ad655'); }
      else { // magic orb
        const r = this.r + 1, c = this.color || '#7ad8ff';
        g.fillStyle = c; g.globalAlpha = 0.45; g.beginPath(); g.arc(0, 0, r + 2, 0, 6.28); g.fill(); g.globalAlpha = 1;
        g.beginPath(); g.arc(0, 0, r, 0, 6.28); g.fill(); g.fillStyle = '#fff'; g.fillRect(-1, -1, 2, 2);
      }
      g.restore();
      if (this.glowR) FX.light(this.x, this.y, this.glowR, 0.8, 0.05);
    }
  }
  E.Proj = Proj;

  /* =========================================================
     ENEMIES
     ========================================================= */
  class Enemy {
    constructor(def, x, y, lvlMul = 1) {
      this.isEnemy = true; this.def = def; this.x = x; this.y = y; this.hx = x; this.hy = y;
      this.maxHp = Math.round(def.hp * lvlMul); this.hp = this.maxHp; this.atk = def.atk * (0.9 + 0.1 * lvlMul); this.defv = def.def || 0;
      this.r = def.r || 6; this.hw = Math.min(6, this.r - 1); this.hh = 4; this.fly = !!def.flying || def.ai === 'flyer';
      this.state = 'idle'; this.st = 0; this.cd = 1 + Math.random(); this.face = 1; this.flash = 0; this.kbx = 0; this.kby = 0;
      this.status = {}; this.animT = Math.random() * 10; this.dormant = def.ai === 'ambush'; this.wander = { t: 0, a: 0 };
      this.frames = def.gen === 'boss' ? null : PQ.Spr.mob(def); this.hit_h = 6;
      this.elite = false;
    }
    makeElite() { this.elite = true; this.maxHp = Math.round(this.maxHp * 2.2); this.hp = this.maxHp; this.atk *= 1.4; this.r += 1; }
    get spd() { let s = this.def.spd; if (this.status.chill > 0) s *= 0.5; if (this.status.freeze > 0) s = 0; if (this.elite) s *= 1.1; return s; }
    update(dt, G) {
      this.animT += dt; this.st += dt;
      if (this.flash > 0) this.flash -= dt;
      for (const k in this.status) if (this.status[k] > 0) this.status[k] -= dt;
      if (this.status.burn > 0) { this.burnT = (this.burnT || 0) + dt; if (this.burnT > 0.5) { this.burnT = 0; G.damageEnemy(this, Math.max(2, this.maxHp * 0.02), { dot: 1, color: '#ff9a2e' }); if (Math.random() < 0.6) FX.burst(this.x, this.y - 6, ['#ff9a2e', '#ffe27a'], 2, { speed: 10, up: 40, life: 0.4, grav: -40 }); } }
      // knockback
      if (Math.abs(this.kbx) + Math.abs(this.kby) > 1) { E.move(this, this.kbx * dt, this.kby * dt, G.map); this.kbx *= 1 - dt * 9; this.kby *= 1 - dt * 9; }
      if (this.status.freeze > 0 || this.dead) return;
      const p = G.player;
      const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy);
      this.face = dx < 0 ? -1 : 1;
      const aggro = (this.def.night ? 150 : 120) + (this.elite ? 30 : 0);
      const AI = AIS[this.def.ai] || AIS.chase;
      if (p.state === 'dead' || G.safeZone) { this.idleWander(dt, G); return; }
      AI.call(this, dt, G, p, dx, dy, d, aggro);
    }
    idleWander(dt, G) {
      this.wander.t -= dt;
      if (this.wander.t <= 0) { this.wander.t = 1 + Math.random() * 2; this.wander.a = Math.random() < 0.4 ? null : Math.random() * 6.28; }
      if (this.wander.a != null) {
        const back = U.dist(this.x, this.y, this.hx, this.hy) > 60;
        const a = back ? Math.atan2(this.hy - this.y, this.hx - this.x) : this.wander.a;
        E.move(this, Math.cos(a) * this.spd * 0.35 * dt, Math.sin(a) * this.spd * 0.35 * dt, G.map);
      }
    }
    chase(dt, G, tx, ty, mul = 1) {
      const a = Math.atan2(ty - this.y, tx - this.x);
      const s = this.spd * mul * dt;
      if (!E.move(this, Math.cos(a) * s, Math.sin(a) * s, G.map)) {
        // simple obstacle avoidance: try perpendiculars
        const side = (this.avoid = this.avoid || (Math.random() < 0.5 ? 1 : -1));
        E.move(this, Math.cos(a + side * 1.4) * s, Math.sin(a + side * 1.4) * s, G.map);
      }
    }
    telegraph() { return this.state === 'windup'; }
    draw(g, ox, oy, t) {
      const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
      if (this.dormant && this.def.ai === 'ambush' && this.def.gen === 'blob' && this.def.look.kind === 'lurker') {
        // just a twitching dune
        g.fillStyle = '#d6a75f'; g.beginPath(); g.ellipse(x, y - 2 + Math.sin(t * 3) * 0.5, 9, 4, 0, 0, 6.28); g.fill(); g.fillStyle = '#f2d79a'; g.fillRect(x - 4, y - 5, 4, 1); return;
      }
      if (this.dormant && this.def.blink) return;
      const fly = this.fly;
      const bob = fly ? Math.sin(t * 5 + this.hx) * 2 - 6 : this.def.ai === 'hop' ? -Math.abs(Math.sin(this.hopT || 0)) * 6 : 0;
      shadow(g, x, y, this.r * 0.9);
      const fs = this.frames;
      let fr;
      if (this.state === 'windup' && fs.atk) fr = fs.atk;
      else if (this.dormant) fr = fs[0];
      else fr = fs[Math.floor(this.animT * (this.state === 'move' || fly ? 6 : 2.5)) % fs.length];
      if (this.def.look.kind === 'stump' || this.def.look.kind === 'lurker') fr = this.dormant ? fs[0] : fs[1];
      const spr = this.face < 0 ? fr.l : fr.r;
      let sx = x - spr.width / 2, sy = y - spr.height + 2 + bob;
      if (this.state === 'windup' && Math.floor(t * 16) % 2) { g.drawImage(white(spr), sx, sy); }
      else g.drawImage(this.flash > 0 ? white(spr) : spr, sx, sy);
      if (this.elite) { g.globalAlpha = 0.3 + 0.2 * Math.sin(t * 6); g.drawImage(Art.tint(spr, '#ffd75a'), sx, sy); g.globalAlpha = 1; }
      if (this.status.freeze > 0) { g.globalAlpha = 0.55; g.drawImage(Art.tint(spr, '#a8e8ff'), sx, sy); g.globalAlpha = 1; }
      else if (this.status.chill > 0) { g.globalAlpha = 0.3; g.drawImage(Art.tint(spr, '#a8e8ff'), sx, sy); g.globalAlpha = 1; }
      if (this.shield && this.state !== 'stun') { g.fillStyle = 'rgba(200,220,255,0.6)'; g.fillRect(x + this.face * (this.r + 1), y - 10, 2, 9); }
      if (this.hp < this.maxHp && !this.isBoss) {
        const w = 16, k = this.hp / this.maxHp;
        g.fillStyle = '#120d18'; g.fillRect(x - w / 2 - 1, sy - 5, w + 2, 4);
        g.fillStyle = this.elite ? '#ffb52e' : '#e8363c'; g.fillRect(x - w / 2, sy - 4, Math.ceil(w * k), 2);
      }
      if (this.state === 'stun') { for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; Art.px(g, x + Math.cos(a) * 6, sy - 3 + Math.sin(a) * 2, '#ffd75a'); } }
    }
  }
  E.Enemy = Enemy;

  /* ---------------- AI behaviours ---------------- */
  function startWindup(e, dur, next) { e.state = 'windup'; e.st = 0; e.wdur = dur; e.next = next; PQ.Audio.play('windup', 0.4); }
  function meleeHit(e, G, reach, mul = 1) {
    const p = G.player;
    if (U.dist(e.x, e.y, p.x, p.y) < e.r + reach) G.hurtPlayer(e.atk * mul, e.def.status, e.x, e.y);
  }
  const AIS = {
    chase(dt, G, p, dx, dy, d, aggro) {
      if (this.state === 'windup') { if (this.st > this.wdur) { meleeHit(this, G, 14); this.state = 'recover'; this.st = 0; FX.burst(this.x + Math.sign(dx) * 8, this.y - 4, '#fff', 3, { speed: 30 }); } return; }
      if (this.state === 'recover') { if (this.st > 0.6) this.state = 'idle'; return; }
      if (d < aggro) {
        this.state = 'move';
        if (d > this.r + 10) this.chase(dt, G, p.x, p.y);
        else if (this.cd <= 0) { startWindup(this, 0.45); this.cd = 1.2; }
        this.cd -= dt;
      } else { this.state = 'idle'; this.idleWander(dt, G); }
    },
    hop(dt, G, p, dx, dy, d, aggro) {
      this.hopT = this.hopT || 0;
      if (this.hopping) {
        this.hopT += dt * 6;
        const s = this.spd * 2.2 * dt;
        E.move(this, Math.cos(this.ha) * s, Math.sin(this.ha) * s, G.map);
        if (this.hopT >= Math.PI) { this.hopping = false; this.hopT = 0; FX.dust(this.x, this.y); if (d < this.r + 10) meleeHit(this, G, 8); }
        return;
      }
      this.cd -= dt;
      if (this.cd <= 0) {
        this.hopping = true; this.cd = 0.7 + Math.random() * 0.5;
        this.ha = d < aggro ? Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5 : Math.random() * 6.28;
        this.state = 'move';
      }
    },
    flyer(dt, G, p, dx, dy, d, aggro) {
      this.fa = (this.fa || 0) + dt * 3;
      if (this.state === 'swoop') {
        const s = this.spd * 2.4 * dt; E.move(this, Math.cos(this.sa) * s, Math.sin(this.sa) * s, G.map);
        if (U.dist(this.x, this.y, p.x, p.y) < 10) { meleeHit(this, G, 6); this.state = 'move'; this.cd = 1.5; }
        if (this.st > 0.6) { this.state = 'move'; this.cd = 1.2; }
        return;
      }
      if (d < aggro) {
        this.state = 'move';
        const a = Math.atan2(dy, dx) + Math.sin(this.fa) * 1.2;
        const s = this.spd * dt * (d > 40 ? 1 : -0.4);
        E.move(this, Math.cos(a) * s, Math.sin(a) * s, G.map);
        this.cd -= dt;
        if (this.cd <= 0 && d < 70) { this.state = 'swoop'; this.st = 0; this.sa = Math.atan2(dy, dx); }
      } else this.idleWander(dt, G);
    },
    lunge(dt, G, p, dx, dy, d, aggro) {
      if (this.state === 'windup') { if (this.st > this.wdur) { this.state = 'leap'; this.st = 0; this.la = Math.atan2(dy, dx); PQ.Audio.play('swish', 0.5); } return; }
      if (this.state === 'leap') {
        const s = this.spd * 3.4 * dt; E.move(this, Math.cos(this.la) * s, Math.sin(this.la) * s, G.map);
        if (!this.leapHit && U.dist(this.x, this.y, p.x, p.y) < this.r + 6) { this.leapHit = true; G.hurtPlayer(this.atk, this.def.status, this.x, this.y); }
        if (this.st > 0.28) { this.state = 'recover'; this.st = 0; this.leapHit = false; }
        return;
      }
      if (this.state === 'recover') { if (this.st > 0.7) this.state = 'idle'; return; }
      if (d < aggro) {
        this.state = 'move';
        this.cd -= dt;
        if (d > 55) this.chase(dt, G, p.x, p.y);
        else if (this.cd <= 0) { startWindup(this, 0.5); this.cd = 1.6; }
        else { const a = Math.atan2(dy, dx) + Math.PI / 2; E.move(this, Math.cos(a) * this.spd * 0.5 * dt, Math.sin(a) * this.spd * 0.5 * dt, G.map); }
      } else { this.state = 'idle'; this.idleWander(dt, G); }
    },
    charge(dt, G, p, dx, dy, d, aggro) {
      if (this.state === 'windup') {
        if (this.st > this.wdur) { this.state = 'dash'; this.st = 0; PQ.Audio.play('charge', 0.6); }
        return;
      }
      if (this.state === 'dash') {
        const s = this.spd * 4 * dt;
        const ok = E.move(this, Math.cos(this.ca) * s, Math.sin(this.ca) * s, G.map);
        if (Math.random() < 0.5) FX.dust(this.x, this.y);
        if (!this.dashHit && U.dist(this.x, this.y, p.x, p.y) < this.r + 6) { this.dashHit = true; G.hurtPlayer(this.atk * 1.3, this.def.status, this.x, this.y, false, 220); }
        if (!ok) { this.state = 'stun'; this.st = 0; PQ.Render.shake = Math.max(PQ.Render.shake, 0.25); PQ.Audio.play('thud'); FX.burst(this.x, this.y - 6, '#ffd75a', 6); }
        else if (this.st > 1.0) { this.state = 'recover'; this.st = 0; }
        return;
      }
      if (this.state === 'stun') { if (this.st > 1.4) this.state = 'idle'; return; }
      if (this.state === 'recover') { if (this.st > 0.6) this.state = 'idle'; this.dashHit = false; return; }
      this.dashHit = false;
      if (d < aggro + 20) {
        this.state = 'move';
        this.cd -= dt;
        if (this.cd <= 0 && d < 140) {
          this.ca = Math.atan2(dy, dx); startWindup(this, 0.7); this.cd = 2.2;
          FX.hazard({ kind: 'line', x: this.x, y: this.y, ang: this.ca, len: Math.min(150, d + 50), w: this.r * 2 + 4, delay: 0.7, dmg: 0, color: '#ffb0a0' });
        } else if (d > 60) this.chase(dt, G, p.x, p.y, 0.6);
      } else { this.state = 'idle'; this.idleWander(dt, G); }
    },
    tank(dt, G, p, dx, dy, d, aggro) {
      this.shield = true;
      if (this.state === 'windup') { this.shield = false; if (this.st > this.wdur) { FX.hazard({ kind: 'circle', x: this.x, y: this.y, r: this.r + 20, delay: 0, dmg: this.atk * 1.2, color: '#c8b8a8', shake: 0.2 }); this.state = 'stun'; this.st = 0; } return; }
      if (this.state === 'stun') { this.shield = false; if (this.st > 1.1) this.state = 'idle'; return; }
      if (d < aggro) {
        this.state = 'move';
        this.cd -= dt;
        if (d > this.r + 14) this.chase(dt, G, p.x, p.y);
        else if (this.cd <= 0) { startWindup(this, 0.75); this.cd = 2; FX.hazard({ kind: 'circle', x: this.x, y: this.y, r: this.r + 20, delay: 0.75, dmg: 0, color: '#ffb0a0' }); }
      } else { this.state = 'idle'; this.idleWander(dt, G); }
    },
    ambush(dt, G, p, dx, dy, d) {
      if (this.dormant) {
        if (d < (this.def.blink ? 70 : 42)) { this.dormant = false; this.state = 'windup'; this.st = 0; this.wdur = 0.4; PQ.Audio.play('ambush'); FX.burst(this.x, this.y, this.def.look.kind === 'lurker' ? '#e3b871' : '#77492a', 10, { speed: 50 }); }
        return;
      }
      if (this.def.blink) {
        this.cd -= dt;
        if (this.cd <= 0) { // teleport behind the player
          FX.burst(this.x, this.y - 6, '#7552ad', 8, { speed: 40 });
          const a = Math.atan2(p.y - this.y, p.x - this.x);
          const nx = p.x + Math.cos(a) * 26, ny = p.y + Math.sin(a) * 18;
          if (!E.blocked(G.map, nx, ny, 4, 4, true, this)) { this.x = nx; this.y = ny; }
          FX.burst(this.x, this.y - 6, '#b892f0', 8, { speed: 40 });
          this.cd = 2.6; startWindup(this, 0.45);
          return;
        }
      }
      AIS.chase.call(this, dt, G, p, dx, dy, d, 200);
    },
    ranged(dt, G, p, dx, dy, d, aggro) {
      const pr = this.def.proj;
      if (this.state === 'windup') {
        if (this.st > this.wdur) {
          const a = Math.atan2(p.y - this.y, p.x - this.x);
          const shots = pr.burst || 1;
          for (let i = 0; i < shots; i++) setTimeoutGame(i * 0.18, () => { if (!this.dead) G.enemyShoot(this, pr, a + (i - (shots - 1) / 2) * 0.12); });
          this.state = 'recover'; this.st = 0;
        }
        return;
      }
      if (this.state === 'recover') { if (this.st > 0.5) this.state = 'idle'; return; }
      const range = this.def.range || 90;
      if (d < aggro + 30) {
        this.state = 'move';
        this.cd -= dt;
        const a = Math.atan2(dy, dx);
        const want = d < range * 0.6 ? -1 : d > range ? 1 : 0;
        const strafe = Math.sin(this.animT * 0.9) > 0 ? 1 : -1;
        const mx = Math.cos(a) * want + Math.cos(a + Math.PI / 2) * strafe * 0.6, my = Math.sin(a) * want + Math.sin(a + Math.PI / 2) * strafe * 0.6;
        E.move(this, mx * this.spd * 0.8 * dt, my * this.spd * 0.8 * dt, G.map);
        if (this.cd <= 0 && d < range + 20) { startWindup(this, 0.55); this.cd = 1.8 + Math.random() * 0.8; }
      } else { this.state = 'idle'; this.idleWander(dt, G); }
    },
    turret(dt, G, p, dx, dy, d) {
      const pr = this.def.proj;
      if (this.state === 'windup') {
        if (this.st > this.wdur) { const a = Math.atan2(dy, dx); for (let i = 0; i < (pr.spread || 1); i++) G.enemyShoot(this, pr, a + (i - ((pr.spread || 1) - 1) / 2) * 0.25); this.state = 'idle'; }
        return;
      }
      this.cd -= dt;
      if (d < this.def.range && this.cd <= 0) { startWindup(this, 0.5); this.cd = 2.2; }
    },
    caster(dt, G, p, dx, dy, d, aggro) {
      if (this.state === 'windup') { if (this.st > this.wdur) { this.state = 'recover'; this.st = 0; } return; }
      if (this.state === 'recover') { if (this.st > 0.8) this.state = 'idle'; return; }
      if (d < aggro + 20) {
        this.state = 'move';
        this.cd -= dt;
        const a = Math.atan2(dy, dx), want = d < 60 ? -1 : d > 100 ? 1 : 0;
        E.move(this, Math.cos(a) * want * this.spd * dt, Math.sin(a) * want * this.spd * dt, G.map);
        if (this.cd <= 0 && d < (this.def.range || 110)) {
          startWindup(this, 0.9); this.cd = 2.6 + Math.random();
          const el = this.def.element;
          FX.hazard({ kind: 'circle', x: p.x, y: p.y, r: 20, delay: 0.95, dmg: this.atk * 1.1, color: el === 'fire' ? '#ff6a2e' : '#9dffd0', status: el === 'fire' ? 'burn' : 'poison', sfx: 'magic', follow: false });
        }
      } else { this.state = 'idle'; this.idleWander(dt, G); }
    },
    area(dt, G, p, dx, dy, d, aggro) {
      if (this.def.trail) { this.trailT = (this.trailT || 0) + dt; if (this.trailT > 0.6 && this.state === 'move') { this.trailT = 0; FX.hazard({ kind: 'circle', x: this.x, y: this.y, r: 9, delay: 0.05, persist: 2.5, dmg: this.atk * 0.6, color: '#ff6a2e', status: 'burn' }); } }
      if (d < aggro) {
        this.state = 'move';
        this.cd -= dt;
        if (d > 18) this.chase(dt, G, p.x, p.y, 0.8);
        if (this.cd <= 0 && d < 50) {
          this.cd = 3.2;
          if (!this.def.trail) { startWindup(this, 0.6); FX.hazard({ kind: 'circle', x: this.x, y: this.y, r: 30, delay: 0.6, persist: 2.5, dmg: this.atk, color: '#b06aff', status: 'poison', sfx: 'puff' }); }
        }
      } else { this.state = 'idle'; this.idleWander(dt, G); }
      if (this.state === 'windup' && this.st > this.wdur) this.state = 'idle';
    },
    elite(dt, G, p, dx, dy, d, aggro) {
      this.shield = this.state === 'guard';
      if (this.state === 'guard') { if (this.st > 1.0) this.state = 'idle'; return; }
      if (this.state === 'windup') {
        if (this.st > this.wdur) { meleeHit(this, G, 16, this.combo === 2 ? 1.4 : 1); this.combo = (this.combo || 0) + 1; if (this.combo < 3) { this.state = 'windup'; this.st = 0; this.wdur = 0.28; const a = Math.atan2(dy, dx); E.move(this, Math.cos(a) * 6, Math.sin(a) * 6, G.map); } else { this.state = 'recover'; this.st = 0; this.combo = 0; } }
        return;
      }
      if (this.state === 'recover') { if (this.st > 0.9) this.state = 'idle'; return; }
      if (d < aggro + 20) {
        this.state = 'move';
        this.cd -= dt;
        if (d > this.r + 12) this.chase(dt, G, p.x, p.y);
        else if (this.cd <= 0) { this.combo = 0; startWindup(this, 0.5); this.cd = 2; }
        if (G.player.atk && d < 40 && Math.random() < dt * 2) { this.state = 'guard'; this.st = 0; }
      } else { this.state = 'idle'; this.idleWander(dt, G); }
    },
  };
  E.AIS = AIS;

  /* tiny game-time scheduler (respects pause) */
  const timers = [];
  function setTimeoutGame(t, fn) { timers.push({ t, fn }); }
  E.after = setTimeoutGame;
  E.tickTimers = function (dt) { for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } } };
  E.clearTimers = () => { timers.length = 0; };

  /* =========================================================
     BOSSES
     ========================================================= */
  class Boss extends Enemy {
    constructor(id, x, y) {
      const B = PQ.D.BOSSES[id];
      super({ id: 'boss_' + id, name: B.name, hp: B.hp, atk: B.atk, def: B.def, r: B.r, spd: 40, ai: 'boss', gen: 'boss', look: {} }, x, y);
      this.isBoss = true; this.bid = id; this.B = B; this.phase = 1; this.pat = 0; this.cd = 2.2; this.hit_h = B.r;
      this.hw = Math.min(10, B.r - 4); this.hh = 6; this.fly = id === 'dragon';
      this.frames = null;
    }
    update(dt, G) {
      this.animT += dt; this.st += dt;
      if (this.flash > 0) this.flash -= dt;
      for (const k in this.status) if (this.status[k] > 0) this.status[k] -= dt * 1.6;
      if (Math.abs(this.kbx) + Math.abs(this.kby) > 1) { E.move(this, this.kbx * dt * 0.3, this.kby * dt * 0.3, G.map); this.kbx *= 1 - dt * 9; this.kby *= 1 - dt * 9; }
      if (this.dead || !this.awake) return;
      if (this.phase === 1 && this.hp < this.maxHp * 0.5) { this.phase = 2; PQ.UI.banner(this.B.name, 'grows furious!'); PQ.Audio.play('roar'); PQ.Render.shake = 0.6; this.cd = 1; FX.burst(this.x, this.y - 20, this.B.color, 30, { speed: 90 }); }
      if (this.bid === 'sovereign' && this.phase === 2 && this.hp < this.maxHp * 0.25 && !this.p3) { this.p3 = 1; PQ.UI.banner('Shadow Sovereign', 'The light fades...'); G.darkPhase = 1; }
      const fast = this.phase === 2 ? 0.7 : 1;
      if (this.state === 'stun') { if (this.st > 1.6) { this.state = 'idle'; this.st = 0; } return; }
      if (this.state === 'fly') { BOSS.dragonFly.call(this, dt, G); return; }
      if (this.status.freeze > 0) return;
      const p = G.player;
      const d = U.dist(this.x, this.y, p.x, p.y);
      this.face = p.x < this.x ? -1 : 1;
      // drift toward the player between attacks
      if (this.state !== 'busy' && d > 50 && this.bid !== 'sovereign') this.chase(dt, G, p.x, p.y, this.bid === 'toad' ? 0 : 0.5);
      this.cd -= dt;
      if (this.cd <= 0 && this.state !== 'busy') {
        const pats = BOSS[this.bid];
        const f = pats[this.pat % pats.length];
        this.pat++;
        this.state = 'busy'; this.st = 0;
        const dur = f.call(this, G, p, d) || 1.5;
        setTimeoutGame(dur, () => { if (this.state === 'busy') this.state = 'idle'; });
        this.cd = (dur + 0.9 + Math.random() * 0.6) * fast;
      }
    }
    draw(g, ox, oy, t) {
      const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
      if (this.hidden) { shadow(g, x, y, this.r * 1.2); return; }
      shadow(g, x, y, this.r);
      const f = Math.floor(this.animT * (this.bid === 'dragon' ? 4 : 2.5)) % 2;
      let spr = PQ.Spr.boss(this.B.sprite, f);
      const fl = this.face < 0 && this.bid !== 'guardian' && this.bid !== 'dragon' && this.bid !== 'sovereign';
      const hop = this.hopZ || 0;
      const sx = x - spr.width / 2, sy = y - spr.height + 4 - hop - (this.bid === 'dragon' ? 8 : 0);
      if (fl) { spr = Art.S['bflip' + this.B.sprite + f] || (Art.S['bflip' + this.B.sprite + f] = Art.flip(spr)); }
      if (this.alpha != null) g.globalAlpha = this.alpha;
      g.drawImage(this.flash > 0 ? white(spr) : spr, sx, sy);
      g.globalAlpha = 1;
      if (this.state === 'stun') { for (let i = 0; i < 4; i++) { const a = t * 4 + i * 1.6; Art.px(g, x + Math.cos(a) * 12, sy - 2 + Math.sin(a) * 3, '#ffd75a'); } PQ.Font.draw(g, 'WEAK!', x, sy - 12, '#ffd75a', 1, 'center', '#120d18'); }
      if (this.weak) { g.globalAlpha = 0.3 + Math.sin(t * 10) * 0.2; g.drawImage(Art.tint(spr, '#ffd75a'), sx, sy); g.globalAlpha = 1; }
    }
  }
  E.Boss = Boss;

  /* boss attack patterns: each returns its duration */
  const ring = (G, x, y, n, spd, dmg, kind, color, off = 0) => { for (let i = 0; i < n; i++) { const a = off + (i / n) * Math.PI * 2; G.ents.push(new Proj({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg, kind, color, r: 3, life: 3, glowR: kind === 'orb' ? 18 : 0 })); } };
  const BOSS = {
    toad: [
      function (G, p) { // big hop slam
        const sx = this.x, sy = this.y, tx = p.x, ty = p.y;
        FX.hazard({ kind: 'circle', x: tx, y: ty, r: 34, delay: 0.85, dmg: this.atk * 1.4, color: '#7cc45a', shake: 0.5, sfx: 'thud' });
        let k = 0; const step = () => { k += 0.05; this.x = U.lerp(sx, tx, k); this.y = U.lerp(sy, ty, k); this.hopZ = Math.sin(k * Math.PI) * 30; if (k < 1) setTimeoutGame(0.04, step); else this.hopZ = 0; };
        setTimeoutGame(0.05, step); return 1.3;
      },
      function (G, p) { // tongue lash
        const a = Math.atan2(p.y - this.y, p.x - this.x);
        FX.hazard({ kind: 'line', x: this.x, y: this.y - 6, ang: a, len: 120, w: 10, delay: 0.7, dmg: this.atk, color: '#e8607a', sfx: 'whip' });
        if (this.phase === 2) setTimeoutGame(0.5, () => FX.hazard({ kind: 'line', x: this.x, y: this.y - 6, ang: a + 0.5, len: 120, w: 10, delay: 0.7, dmg: this.atk, color: '#e8607a' }));
        return 1.3;
      },
      function (G) { // call slimes
        for (let i = 0; i < (this.phase === 2 ? 3 : 2); i++) G.spawnEnemy('slime', this.x + (i - 1) * 24, this.y + 20);
        PQ.Audio.play('roar'); return 1;
      },
    ],
    guardian: [
      function (G, p) { for (let i = 0; i < (this.phase === 2 ? 5 : 3); i++) setTimeoutGame(i * 0.35, () => FX.hazard({ kind: 'circle', x: p.x + (Math.random() - 0.5) * 10, y: p.y + (Math.random() - 0.5) * 10, r: 18, delay: 0.75, dmg: this.atk, color: '#9a7a58', shake: 0.15, sfx: 'thud' })); return 2; },
      function (G) { ring(G, this.x, this.y - 20, this.phase === 2 ? 16 : 12, 70, this.atk * 0.8, 'leaf', '#64b33f', this.animT); PQ.Audio.play('magic'); if (this.phase === 2) setTimeoutGame(0.6, () => ring(G, this.x, this.y - 20, 16, 70, this.atk * 0.8, 'leaf', '#64b33f', this.animT + 0.2)); return 1.2; },
      function (G, p) { const a = Math.atan2(p.y - this.y, p.x - this.x); FX.hazard({ kind: 'cone', x: this.x, y: this.y, ang: a, r: 70, arc: 1.3, delay: 0.9, dmg: this.atk * 1.4, color: '#7a5c42', shake: 0.4, sfx: 'thud' }); return 1.4; },
      function (G) { G.spawnEnemy('puffer', this.x - 30, this.y + 10); if (this.phase === 2) G.spawnEnemy('puffer', this.x + 30, this.y + 10); return 0.8; },
      function (G) { if (this.phase < 2) return 0.2; const rm = G.map.bossRoom; for (let r = 0; r < 3; r++) setTimeoutGame(r * 0.5, () => { const yy = (rm.y0 + 2 + r * 3 + (this.pat % 2)) * T + 8; FX.hazard({ kind: 'line', x: rm.x0 * T, y: yy, ang: 0, len: (rm.x1 - rm.x0 + 1) * T, w: 14, delay: 1, dmg: this.atk, color: '#9a7a58', sfx: 'thud' }); }); return 2.2; },
    ],
    colossus: [
      function (G) { // slam + expanding rings (roll through them)
        FX.hazard({ kind: 'circle', x: this.x, y: this.y, r: 40, delay: 0.9, dmg: this.atk * 1.5, color: '#ddb579', shake: 0.6, sfx: 'thud' });
        for (let i = 1; i <= (this.phase === 2 ? 4 : 3); i++) setTimeoutGame(0.9 + i * 0.3, () => FX.hazard({ kind: 'circle', x: this.x, y: this.y, r: 40 + i * 26, delay: 0.25, dmg: this.atk * 0.7, color: '#c4955a', ring: 1 }));
        setTimeoutGame(1.1, () => { this.state = 'stun'; this.st = 0; this.weak = true; setTimeoutGame(1.6, () => { this.weak = false; }); });
        return 2.6;
      },
      function (G, p) { const n = this.phase === 2 ? 5 : 3; for (let i = 0; i < n; i++) setTimeoutGame(i * 0.4, () => FX.hazard({ kind: 'circle', x: p.x, y: p.y, r: 22, delay: 1, dmg: this.atk * 1.2, color: '#a87a46', shake: 0.3, sfx: 'thud' })); return 1.6 + n * 0.4; },
      function (G) { // sand vortex: pull + spiral
        G.pull = { x: this.x, y: this.y, t: 2.6, s: 34 };
        for (let i = 0; i < 6; i++) setTimeoutGame(i * 0.4, () => ring(G, this.x, this.y - 10, 6, 60, this.atk * 0.6, 'orb', '#e3b871', i * 0.5));
        PQ.Audio.play('wind'); return 3;
      },
    ],
    dragon: [
      function (G, p) { // ice breath cone
        const a = Math.atan2(p.y - this.y, p.x - this.x);
        FX.hazard({ kind: 'cone', x: this.x, y: this.y - 10, ang: a, r: 110, arc: 0.9, delay: 0.9, dmg: this.atk * 1.2, status: 'chill', color: '#8fd4ff', sfx: 'breath' });
        setTimeoutGame(0.9, () => { for (let i = 0; i < 14; i++) setTimeoutGame(i * 0.05, () => { const aa = a + (Math.random() - 0.5) * 0.8; G.ents.push(new Proj({ x: this.x, y: this.y - 10, vx: Math.cos(aa) * 150, vy: Math.sin(aa) * 150, dmg: 0, kind: 'orb', color: '#c8eeff', r: 2, life: 0.7 })); }); });
        return 1.9;
      },
      function (G, p) { const n = this.phase === 2 ? 12 : 8; for (let i = 0; i < n; i++) setTimeoutGame(i * 0.15, () => FX.hazard({ kind: 'circle', x: p.x + (Math.random() - 0.5) * 90, y: p.y + (Math.random() - 0.5) * 60, r: 14, delay: 0.9, dmg: this.atk, color: '#a8e8ff', status: 'chill', sfx: 'shatter' })); return 2.4; },
      function (G, p) { const a = Math.atan2(p.y - this.y, p.x - this.x); FX.hazard({ kind: 'cone', x: this.x, y: this.y, ang: a + Math.PI, r: 60, arc: 2.4, delay: 0.7, dmg: this.atk * 1.3, color: '#4b8ed0', shake: 0.3 }); FX.hazard({ kind: 'circle', x: this.x, y: this.y, r: 34, delay: 0.7, dmg: this.atk, color: '#4b8ed0' }); return 1.2; },
      function () { if (this.phase < 2) return 0.2; this.state = 'fly'; this.st = 0; this.hidden = true; this.untargetable = true; PQ.Audio.play('wind'); return 5; },
    ],
    titan: [
      function (G, p) { for (let i = 0; i < (this.phase === 2 ? 4 : 3); i++) setTimeoutGame(i * 0.5, () => FX.hazard({ kind: 'circle', x: p.x, y: p.y, r: 22, delay: 0.9, persist: 5, dmg: this.atk, color: '#ff6a2e', status: 'burn', sfx: 'fire' })); return 2.2; },
      function (G, p) { const n = this.phase === 2 ? 16 : 10; for (let i = 0; i < n; i++) setTimeoutGame(i * 0.12, () => FX.hazard({ kind: 'circle', x: p.x + (Math.random() - 0.5) * 120, y: p.y + (Math.random() - 0.5) * 90, r: 16, delay: 1.1, dmg: this.atk * 1.1, color: '#ff9a2e', status: 'burn', shake: 0.15, sfx: 'thud' })); return 2.6; },
      function (G) { const rm = G.map.bossRoom; const vert = this.pat % 2; for (let r = 0; r < 4; r++) setTimeoutGame(r * 0.35, () => { if (vert) FX.hazard({ kind: 'line', x: (rm.x0 + 1 + r * 4 + (this.pat % 3)) * T, y: rm.y0 * T, ang: Math.PI / 2, len: (rm.y1 - rm.y0 + 1) * T, w: 14, delay: 1, dmg: this.atk, color: '#ff4a1e', status: 'burn' }); else FX.hazard({ kind: 'line', x: rm.x0 * T, y: (rm.y0 + 1 + r * 3) * T, ang: 0, len: (rm.x1 - rm.x0 + 1) * T, w: 14, delay: 1, dmg: this.atk, color: '#ff4a1e', status: 'burn' }); }); return 2.4; },
      function (G, p) { const a = Math.atan2(p.y - this.y, p.x - this.x); FX.hazard({ kind: 'cone', x: this.x, y: this.y, ang: a, r: 64, arc: 1.4, delay: 0.75, dmg: this.atk * 1.5, color: '#c8401e', shake: 0.5, sfx: 'thud' }); setTimeoutGame(0.85, () => { this.state = 'stun'; this.st = 0.4; this.weak = true; setTimeoutGame(1.2, () => { this.weak = false; }); }); return 2; },
    ],
    sovereign: [
      function (G, p) { // teleport + spiral
        FX.burst(this.x, this.y - 16, '#7552ad', 16, { speed: 60 });
        const rm = G.map.bossRoom; this.x = (rm.x0 + 2 + Math.random() * (rm.x1 - rm.x0 - 4)) * T; this.y = (rm.y0 + 3 + Math.random() * (rm.y1 - rm.y0 - 6)) * T;
        FX.burst(this.x, this.y - 16, '#b892f0', 16, { speed: 60 }); PQ.Audio.play('blink');
        for (let i = 0; i < (this.phase === 2 ? 10 : 6); i++) setTimeoutGame(0.4 + i * 0.22, () => ring(G, this.x, this.y - 16, 5, 75, this.atk * 0.7, 'orb', '#b892f0', i * 0.35));
        return 2.8;
      },
      function (G) { for (let i = 0; i < 3; i++) { const c = G.spawnEnemy('shade', this.x + Math.cos(i * 2.1) * 40, this.y + Math.sin(i * 2.1) * 30); if (c) { c.dormant = false; c.maxHp = c.hp = 120; } } PQ.Audio.play('roar'); return 1.2; },
      function (G, p) { for (let i = 0; i < 4; i++) setTimeoutGame(i * 0.3, () => { const a = Math.atan2(p.y - this.y, p.x - this.x) + (Math.random() - 0.5) * 0.4; G.ents.push(new Proj({ x: this.x, y: this.y - 16, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, dmg: this.atk * 0.9, kind: 'orb', color: '#ff70ff', r: 4, life: 4, homing: 1.5, glowR: 20 })); }); return 1.8; },
      function (G, p) { const n = this.phase === 2 ? 7 : 5; for (let i = 0; i < n; i++) setTimeoutGame(i * 0.18, () => FX.hazard({ kind: 'circle', x: p.x + (Math.random() - 0.5) * 70, y: p.y + (Math.random() - 0.5) * 50, r: 18, delay: 0.85, dmg: this.atk, color: '#7552ad', sfx: 'magic' })); return 1.8; },
    ],
    dragonFly(dt, G) {
      const p = G.player;
      this.x = U.lerp(this.x, p.x, dt * 1.5); this.y = U.lerp(this.y, p.y, dt * 1.5);
      if (Math.random() < dt * 3) FX.hazard({ kind: 'circle', x: p.x + (Math.random() - 0.5) * 80, y: p.y + (Math.random() - 0.5) * 60, r: 12, delay: 0.8, dmg: this.atk * 0.8, color: '#a8e8ff', status: 'chill' });
      if (this.st > 3.4 && !this.diving) {
        this.diving = true;
        FX.hazard({ kind: 'circle', x: p.x, y: p.y, r: 46, delay: 1, dmg: this.atk * 1.6, color: '#4b8ed0', shake: 0.7, sfx: 'thud' });
        const tx = p.x, ty = p.y;
        setTimeoutGame(1, () => { this.x = tx; this.y = ty; this.hidden = false; this.untargetable = false; this.state = 'stun'; this.st = 0; this.diving = false; this.weak = true; setTimeoutGame(1.6, () => { this.weak = false; }); });
      }
    },
  };
  E.BOSS = BOSS;

  /* =========================================================
     NPC
     ========================================================= */
  class NPC {
    constructor(id) {
      const d = PQ.D.NPCS[id];
      this.isNPC = true; this.id = id; this.d = d; this.x = 0; this.y = 0; this.hw = 4; this.hh = 4; this.r = 7;
      this.sheet = PQ.Spr.humanoid(d.look); this.face = 'down'; this.animT = Math.random() * 5; this.path = null; this.wt = 0; this.moving = false;
    }
    update(dt, G) {
      this.animT += dt;
      if (this.path && this.path.length) {
        const [tx, ty] = this.path[0];
        const px = tx * T + 8, py = ty * T + 12;
        const dx = px - this.x, dy = py - this.y, d = Math.hypot(dx, dy);
        if (d < 2) { this.path.shift(); return; }
        const s = 34 * dt;
        this.x += dx / d * Math.min(s, d); this.y += dy / d * Math.min(s, d);
        this.face = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
        this.moving = true;
        return;
      }
      this.moving = false;
      // idle: look at the player when close
      const p = G.player;
      if (U.dist(p.x, p.y, this.x, this.y) < 40) this.face = dirOf(Math.atan2(p.y - this.y, p.x - this.x));
      else {
        this.wt -= dt;
        if (this.wt <= 0 && this.home) {
          this.wt = 3 + Math.random() * 5;
          const nx = this.home.x + Math.floor(Math.random() * 3) - 1, ny = this.home.y + Math.floor(Math.random() * 3) - 1;
          if (G.map.walk(nx, ny) === 1) this.path = [[nx, ny]];
        }
      }
    }
    draw(g, ox, oy, t) {
      const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
      shadow(g, x, y, 6);
      const spr = PQ.Spr.frame(this.sheet, this.face, this.moving ? 'walk' : 'idle', this.animT);
      g.drawImage(spr, x - spr.width / 2, y - spr.height + 2);
      // quest marker
      const mk = PQ.Quests.markerFor(this.id);
      if (mk) { const b = Math.sin(t * 5) * 1.5; PQ.Font.draw(g, mk, x + 1, y - spr.height - 9 + b, mk === '!' ? '#ffd75a' : '#7ef0ff', 1, 'center', '#120d18'); }
    }
  }
  E.NPC = NPC;

  /* =========================================================
     COMPANION & WILD CREATURES
     ========================================================= */
  class Critter {
    constructor(species, x, y, wild, data) {
      this.def = PQ.D.CREATURES[species]; this.sp = species; this.x = x; this.y = y; this.wild = wild; this.data = data;
      this.isCritter = true; this.hw = 3; this.hh = 3; this.r = 6; this.face = 1; this.animT = Math.random() * 5;
      this.frames = PQ.Spr.mob({ id: 'cr_' + species, gen: 'critter', look: this.def.look });
      this.maxHp = wild ? 30 + this.def.rar * 25 : 1; this.hp = this.maxHp; this.flash = 0; this.wt = 0; this.wa = null; this.flee = 0; this.cd = 0;
      this.glow = this.def.role === 'lantern' ? 34 : this.def.look.glow ? 16 : 0;
    }
    update(dt, G) {
      this.animT += dt; if (this.flash > 0) this.flash -= dt;
      const p = G.player;
      if (this.wild) {
        const d = U.dist(this.x, this.y, p.x, p.y);
        if (!G.save.creatures.seen[this.sp] && d < 120) { G.save.creatures.seen[this.sp] = 1; PQ.UI.toast('New creature spotted: ' + this.def.name + '!'); PQ.Audio.play('discover'); }
        if (this.flee > 0) { this.flee -= dt; const a = Math.atan2(this.y - p.y, this.x - p.x); E.move(this, Math.cos(a) * 60 * dt, Math.sin(a) * 60 * dt, G.map); this.face = Math.cos(a) < 0 ? -1 : 1; return; }
        this.wt -= dt;
        if (this.wt <= 0) { this.wt = 1 + Math.random() * 2.5; this.wa = Math.random() < 0.35 ? null : Math.random() * 6.28; }
        if (this.wa != null) { E.move(this, Math.cos(this.wa) * 18 * dt, Math.sin(this.wa) * 18 * dt, G.map); this.face = Math.cos(this.wa) < 0 ? -1 : 1; }
        if (d > 420) this.dead = true;
        return;
      }
      // companion follow
      const lead = { x: p.x - (p.face === 'right' ? 16 : p.face === 'left' ? -16 : 0), y: p.y - (p.face === 'down' ? 14 : p.face === 'up' ? -10 : 0) };
      let tx = lead.x, ty = lead.y;
      const role = this.def.role;
      this.cd -= dt;
      if (role === 'fighter') {
        let best = null, bd = 90;
        for (const e of G.ents) if (e.isEnemy && !e.dead && !e.dormant && !e.untargetable) { const d = U.dist(e.x, e.y, p.x, p.y); if (d < bd) { bd = d; best = e; } }
        if (best) { tx = best.x - Math.sign(best.x - this.x) * 10; ty = best.y; if (U.dist(this.x, this.y, best.x, best.y) < best.r + 12 && this.cd <= 0) { this.cd = 1.1; G.damageEnemy(best, PQ.Creatures.power(this.data), { kb: 40, fx: this.x, fy: this.y, pet: 1 }); FX.burst(best.x, best.y - 6, this.def.look.color, 4); } }
      } else if (role === 'healer' && G.inCombat && this.cd <= 0) { this.cd = 2; G.healPlayer(Math.max(2, G.stats.maxHp * 0.015 * (1 + this.data.lvl * 0.05)), true); FX.burst(p.x, p.y - 10, '#9dffd0', 4, { speed: 20, up: 30, life: 0.6, grav: -20 }); }
      const d = U.dist(this.x, this.y, tx, ty);
      if (d > 300) { this.x = p.x; this.y = p.y; }
      if (d > 6) { const s = Math.min(d * 3, 120) * dt; const a = Math.atan2(ty - this.y, tx - this.x); this.x += Math.cos(a) * s; this.y += Math.sin(a) * s; this.face = Math.cos(a) < 0 ? -1 : 1; this.moving = true; } else this.moving = false;
      if (role === 'seeker') this.seek(dt, G);
    }
    seek(dt, G) {
      this.st = (this.st || 0) - dt;
      if (this.st > 0) return;
      this.st = 1;
      const m = G.map, p = G.player, px = Math.floor(p.x / T), py = Math.floor(p.y / T);
      let best = null, bd = 13;
      for (const o of m.objs) if (o.k === 'chest' && !o.opened) { const d = Math.hypot(o.x - px, o.y - py); if (d < bd) { bd = d; best = o; } }
      this.target = best;
    }
    draw(g, ox, oy, t) {
      const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
      shadow(g, x, y, 5);
      const fs = this.frames; const fr = fs[Math.floor(this.animT * (this.moving || this.wild ? 5 : 2)) % fs.length];
      const spr = this.face < 0 ? fr.l : fr.r;
      const fly = this.def.look.wings ? Math.sin(t * 6) * 2 - 4 : 0;
      g.drawImage(this.flash > 0 ? white(spr) : spr, x - spr.width / 2, y - spr.height + 2 + fly);
      if (this.wild) {
        const D = PQ.D.CREATURE_RARITY[this.def.rar];
        if (this.hp < this.maxHp) { const k = this.hp / this.maxHp; g.fillStyle = '#120d18'; g.fillRect(x - 7, y - spr.height - 4, 14, 3); g.fillStyle = '#7ef0ff'; g.fillRect(x - 6, y - spr.height - 3, Math.ceil(12 * k), 1); }
        if (this.def.rar >= 2 && Math.floor(t * 3) % 3 === 0) Art.px(g, x + 5, y - spr.height, D.color);
      } else if (this.target && this.def.role === 'seeker') {
        const a = Math.atan2(this.target.y * T + 8 - this.y, this.target.x * T + 8 - this.x);
        const ax = x + Math.cos(a) * 10, ay = y - 14 + Math.sin(a) * 6;
        g.fillStyle = '#ffd75a'; g.fillRect(Math.round(ax) - 1, Math.round(ay) - 1, 3, 3); if (Math.floor(t * 4) % 2) FX.spark(this.x, this.y - 10, '#ffd75a');
      }
    }
  }
  E.Critter = Critter;
})();
