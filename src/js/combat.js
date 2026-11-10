/* SHATTERPOINT — fighters, moves, hit resolution, projectiles, hazards */
'use strict';
(function () {
  const U = SP.U;
  const G = SP.G;
  const V = () => new THREE.Vector3();
  const _a = V(), _b = V(), _c = V(), _d = V();
  const BUFFER = 0.34;
  const GRAV = 24;

  /* =================================================================
     Fighter
     ================================================================= */
  class Fighter {
    constructor(o) {
      this.o = o;
      this.id = U.uid();
      this.team = o.team;
      this.isPlayer = !!o.isPlayer;
      this.name = o.name || 'Fighter';
      this.decoy = !!o.decoy;
      this.boss = o.boss || null;
      this.arch = o.arch || null;
      this.family = o.family;
      this.W = SP.WEAPONS[o.family];
      this.st = o.stats;
      this.scale = o.scale || 1;
      this.radius = 0.42 * this.scale;
      this.height = 1.85 * this.scale;
      this.pos = new THREE.Vector3(o.x || 0, 0, o.z || 0);
      this.vel = V(); this.kb = V();
      this.vy = 0; this.grounded = true;
      this.yaw = o.yaw || 0;
      this.maxHp = this.st.maxHp; this.hp = this.maxHp;
      this.guardMax = this.st.guardMax; this.guard = this.guardMax;
      this.momentum = 0;
      this.state = 'free'; this.stunT = 0; this.stunKind = '';
      this.move = null; this.moveName = ''; this.moveT = 0; this.hitSets = []; this.moveFlags = {};
      this.comboIdx = 0; this.comboT = 0; this.lastMoves = [];
      this.buf = null; this.time = 0;
      this.blocking = false; this.blockPressT = -9; this.blockReleaseT = -9; this.prevBlock = false;
      this.cd = { skill: 0, ab0: 0, ab1: 0 };
      this.cdMax = { skill: 1, ab0: 1, ab1: 1 };
      this.dodgeMax = (this.W.dodgeCharges || 2);
      this.dodges = this.dodgeMax; this.dodgeT = 0; this.dodgeDir = V(); this.dodgeDur = 0.36; this.dodgeDist = 4.6; this.dodgeInv = [0.02, 0.27];
      this.perfectUsed = false;
      this.buffs = { barrier: 0, overdrive: 0, heal: 0, healRate: 0, counter: 0, invuln: 0, decoyAggro: 0 };
      this.heat = 0; this.overheat = 0; this.lastShot = -9;
      this.comboTaken = 0; this.lastHitTakenT = -9; this.airHits = 0; this.breakT = 0;
      this.lastHitT = -9; this.hitCount = 0;
      this.poiseMax = this.st.poise || 0; this.poise = this.poiseMax;
      this.lastGuardHitT = -9; this.lastCtrl = null;
      this.freeze = 0;
      this.dead = false; this.deadT = 0; this.removed = false;
      this.healUses = 0;
      this.target = null; // current attack target / lock
      this.ai = null;
      this.lastDamagedBy = null;
      this.counterMoveTag = null;
      this.abilities = o.abilities || [null, null];
      this.speed = 0; this.localFwd = 1; this.localSide = 0;
      this.telegraph = 0;

      this.model = new SP.Model({ appearance: o.appearance, weapon: o.family, scale: this.scale, extra: o.extra, weaponColor: o.weaponColor, variant: o.variant });
      this.anim = new SP.Animator(this.model);
      G.scene.add(this.model.root);
      this.trail = new G.Trail(o.weaponColor || o.appearance.colors.accent, 12);
      this.trailL = (this.W.grip === 'dual' || this.W.grip === 'fists') ? new G.Trail(o.weaponColor || o.appearance.colors.accent, 10) : null;
      // telegraph glint
      this.glint = new THREE.Mesh(G.FX.sphGeo, G.addMat('#ffffff', 0.9));
      this.glint.visible = false; this.glint.scale.setScalar(0.18);
      G.fxRoot.add(this.glint);
      // barrier bubble
      this.bubble = null;
      if (this.decoy) this.makeHologram();
      this.syncModel(0);
    }

    makeHologram() {
      this.model.root.traverse((o) => {
        if (o.isMesh) { o.material = G.addMat(this.o.holoColor || '#2fb4ff', 0.45); o.castShadow = false; }
      });
    }

    dispose() {
      G.scene.remove(this.model.root);
      this.trail.dispose(); if (this.trailL) this.trailL.dispose();
      G.fxRoot.remove(this.glint);
      if (this.bubble) G.fxRoot.remove(this.bubble);
      this.removed = true;
    }

    get forward() { return _d.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
    fwd(out) { return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
    chest(out) { return out.set(this.pos.x, this.pos.y + 1.25 * this.scale, this.pos.z); }

    atkSpeed() {
      let s = this.W.speed * (1 + (this.st.wstats && this.st.wstats.speed || 0));
      if (this.buffs.overdrive > 0) s *= 1.25;
      return s * (this.st.atkMult || 1);
    }
    moveSpeed() {
      let s = 5.4 * this.W.moveMult * (1 + (this.st.speed || 0)) * (this.st.moveMult || 1);
      if (this.buffs.overdrive > 0) s *= 1.25;
      if (this.buffs.barrier > 0) s *= 0.8;
      return s;
    }
    parryWindow() {
      return 0.17 + (this.W.parryBonus || 0) + (this.st.parryBonus || 0);
    }
    invulnerable() {
      if (this.buffs.invuln > 0 || this.breakT > 0) return true;
      if (this.state === 'dodge' && this.dodgeT >= this.dodgeInv[0] && this.dodgeT <= this.dodgeInv[1]) return true;
      if (this.state === 'attack' && this.move.invuln && this.moveT >= this.move.invuln[0] && this.moveT <= this.move.invuln[1]) return true;
      return false;
    }
    armored() {
      if (this.st.superArmor) return true;
      if (this.state === 'attack' && this.move.armor && this.moveT >= this.move.armor[0] && this.moveT <= this.move.armor[1]) return true;
      return false;
    }
    inCounterStance() {
      return this.state === 'attack' && this.move.counterStance && this.moveT >= this.move.counterStance[0] && this.moveT <= this.move.counterStance[1];
    }
    isAttacking() { return this.state === 'attack'; }
    /* first hit time of current move (for AI reactions) */
    static firstHitTime(mv) {
      if (mv.hits && mv.hits.length) return mv.hits[0].t[0];
      if (mv.proj && mv.proj.length) return mv.proj[0].t;
      return 0;
    }

    press(a) { this.buf = { a, t: this.time }; }

    /* ---------------------------------------------------------------- */
    update(dt, ctrl, match) {
      if (this.removed) return;
      const realDt = dt;
      if (this.freeze > 0) { this.freeze -= realDt; dt *= 0.06; }
      this.time += dt;
      const b = this.buffs;
      for (const k of ['barrier', 'overdrive', 'counter', 'invuln', 'decoyAggro']) if (b[k] > 0) b[k] -= dt;
      if (b.heal > 0) { b.heal -= dt; if (!this.dead) this.hp = Math.min(this.maxHp, this.hp + b.healRate * dt); }
      if (this.breakT > 0) this.breakT -= dt;
      for (const k in this.cd) if (this.cd[k] > 0) this.cd[k] = Math.max(0, this.cd[k] - dt);
      if (this.dodges < this.dodgeMax) {
        this.dodgeRe = (this.dodgeRe || 0) + dt * (1 + (this.st.dodgeRecharge || 0)) / (this.W.dodgeRecharge || 1);
        if (this.dodgeRe >= 1.25) { this.dodgeRe = 0; this.dodges++; }
      }
      if (this.time - this.lastHitTakenT > 1.25) { this.comboTaken = 0; }
      if (this.grounded) this.airHits = 0;
      if (this.time - this.lastGuardHitT > 1.2) this.guard = Math.min(this.guardMax, this.guard + (this.blocking ? 8 : 30) * dt);
      if (this.comboT > 0 && this.state !== 'attack') { this.comboT -= dt; if (this.comboT <= 0) this.comboIdx = 0; }
      if (this.poiseMax && this.time - this.lastHitTakenT > 2.5) this.poise = this.poiseMax;
      // heat
      if (this.W.heat) {
        if (this.overheat > 0) { this.overheat -= dt; this.heat = Math.max(0, this.heat - 46 * dt); if (this.overheat <= 0) this.heat = 0; }
        else if (this.time - this.lastShot > 0.35) this.heat = Math.max(0, this.heat - 38 * dt);
      }
      // momentum decay when idle out of combat
      if (this.time - Math.max(this.lastHitT, this.lastHitTakenT) > 7) this.momentum = Math.max(0, this.momentum - 2 * dt);

      if (this.dead) { this.deadT += realDt; this.physics(dt, null); this.syncModel(realDt); return; }

      // input buffering
      this.lastCtrl = ctrl;
      if (ctrl) {
        if (ctrl.pressed) for (const a of ctrl.pressed) this.press(a);
        // block press edge -> parry timing
        const wantBlock = !!ctrl.block;
        if (wantBlock && !this.prevBlock) {
          if (this.time - this.blockReleaseT > 0.32) this.blockPressT = this.time; else this.blockPressT = -9;
          if (this.onBlockPress) this.onBlockPress();
        }
        if (!wantBlock && this.prevBlock) this.blockReleaseT = this.time;
        this.prevBlock = wantBlock;
      }
      if (this.buf && this.time - this.buf.t > BUFFER) this.buf = null;

      // state machine
      if (this.state === 'stun') this.updStun(dt, ctrl);
      else if (this.state === 'attack') this.updAttack(dt, ctrl, match);
      else if (this.state === 'dodge') this.updDodge(dt, ctrl);
      if (this.state === 'free') this.updFree(dt, ctrl, match);

      this.physics(dt, ctrl);
      this.syncModel(realDt);
    }

    consume(list) {
      if (!this.buf) return null;
      if (list.includes(this.buf.a)) { const a = this.buf.a; this.buf = null; return a; }
      return null;
    }

    /* ---------------- free state: movement, block, start actions ---- */
    updFree(dt, ctrl, match) {
      const wantBlock = ctrl && ctrl.block && this.grounded;
      this.blocking = !!wantBlock;
      // actions
      const a = this.buf ? this.buf.a : null;
      if (a) {
        if (this.tryAction(a, ctrl, match)) { this.buf = null; return; }
      }
      // movement
      const mx = ctrl ? ctrl.mx : 0, mz = ctrl ? ctrl.mz : 0;
      const mag = Math.min(1, Math.hypot(mx, mz));
      let spd = this.moveSpeed();
      const sprint = ctrl && ctrl.sprint && !this.blocking && mag > 0.3;
      this.sprinting = sprint;
      if (sprint) spd *= 1.48;
      if (this.blocking) spd *= 0.45;
      const tx = mag > 0.01 ? (mx / (mag || 1)) * spd * mag : 0, tz = mag > 0.01 ? (mz / (mag || 1)) * spd * mag : 0;
      const lam = this.grounded ? 13 : 3.5;
      this.vel.x = U.damp(this.vel.x, tx, lam, dt);
      this.vel.z = U.damp(this.vel.z, tz, lam, dt);
      // facing
      const tgt = this.faceTarget();
      if (tgt && !sprint) {
        this.yaw = U.dampAngle(this.yaw, Math.atan2(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z), 12, dt);
      } else if (mag > 0.1) {
        this.yaw = U.dampAngle(this.yaw, Math.atan2(mx, mz), 14, dt);
      }
    }

    faceTarget() {
      if (this.isPlayer) return this.lockTarget && !this.lockTarget.dead ? this.lockTarget : null;
      return this.target && !this.target.dead ? this.target : null;
    }

    tryAction(a, ctrl, match) {
      if (a === 'light') return this.doLight(match);
      if (a === 'heavy') return this.doHeavy(match);
      if (a === 'jump') return this.doJump();
      if (a === 'dodge') return this.doDodge(ctrl);
      if (a === 'skill') return this.doSkill(match);
      if (a === 'ab0' || a === 'ab1') return this.doAbility(a === 'ab0' ? 0 : 1, ctrl, match);
      if (a === 'mom') return this.doMomentum(match);
      return false;
    }

    doLight(match) {
      if (!this.grounded) { return this.startMove('air', match); }
      if (this.W.heat) {
        const near = match.nearestEnemy(this, 2.0, 70);
        if (near) return this.startMove('bash', match);
        if (this.overheat > 0) { if (this.isPlayer) SP.HUD.flashHeat(); return true; }
      }
      if (this.sprinting && this.speed > 6) return this.startMove('dash', match);
      const ch = this.W.chain;
      let idx = this.comboT > 0 ? this.comboIdx : 0;
      if (idx >= ch.length) { if (this.W.loopChain) idx = 0; else idx = 0; }
      const ok = this.startMove(ch[idx], match);
      if (ok) { this.comboIdx = idx + 1; this.comboT = 0.65; }
      return ok;
    }
    doHeavy(match) {
      if (!this.grounded) return this.startMove('plunge', match);
      if (this.W.heat && this.overheat > 0) { if (this.isPlayer) SP.HUD.flashHeat(); return true; }
      const name = this.comboT > 0 && this.comboIdx > 0 ? 'chainHeavy' : 'heavy';
      const ok = this.startMove(name, match);
      if (ok) { this.comboIdx = 0; this.comboT = 0; }
      return ok;
    }
    doJump() {
      if (!this.grounded) return false;
      this.vy = 8.6 * (SP.Game.match && SP.Game.match.lowgrav ? 0.92 : 1);
      this.grounded = false;
      SP.Audio.play('jump');
      return true;
    }
    doDodge(ctrl, dist, dur, inv) {
      if (this.dodges <= 0 && !dist) return false;
      if (!this.grounded && !dist) return false;
      if (!dist) this.dodges--;
      const mx = ctrl ? ctrl.mx : 0, mz = ctrl ? ctrl.mz : 0;
      if (Math.hypot(mx, mz) > 0.2) this.dodgeDir.set(mx, 0, mz).normalize();
      else this.fwd(this.dodgeDir).multiplyScalar(-1);
      this.endMove();
      this.state = 'dodge'; this.dodgeT = 0;
      this.dodgeDur = dur || 0.36;
      this.dodgeDist = dist || 4.6 * (this.W.dodgeDist || 1);
      this.dodgeInv = inv || [0.02, 0.27];
      this.perfectUsed = false;
      this.blocking = false;
      SP.Audio.play('dodge');
      if (this.isPlayer) SP.Bus.emit('playerAction', 'dodge');
      return true;
    }
    doSkill(match) {
      if (this.cd.skill > 0) { if (this.isPlayer) SP.HUD.denied('skill'); return true; }
      const mv = this.W.moves.skill;
      if (!this.startMove('skill', match)) return false;
      let cd = mv.cd;
      if (this.st.mods && this.st.mods.has('tempo')) cd *= 0.8;
      if (this.st.mastery >= 4) cd *= 0.8;
      this.cd.skill = cd; this.cdMax.skill = cd;
      SP.Audio.play('ability');
      return true;
    }
    doAbility(slot, ctrl, match) {
      const ab = this.abilities[slot];
      if (!ab) return true;
      const key = 'ab' + slot;
      if (this.cd[key] > 0) { if (this.isPlayer) SP.HUD.denied(key); return true; }
      const def = SP.ABILITIES[ab.id];
      if (def.heal && this.healUses >= def.uses) { if (this.isPlayer) SP.HUD.popupSelf('NO CHARGES', 'warn'); return true; }
      if (match.constraints && match.constraints.noheal && def.heal) { /* allowed but tracked */ }
      let cd = def.cd * (1 - (this.st.cdr || 0));
      const mk = ab.mk || 1;
      const p = this.chest(_a);
      if (ab.id === 'phase') {
        cd -= (mk - 1);
        this.doDodge(ctrl, 7, 0.18, [0, 0.24]);
        G.glows.emit(p.x, p.y, p.z, 8, { color: this.o.appearance.colors.accent, speed: 2, life: 0.4, gravity: 0 });
        SP.Audio.play('blink');
      } else if (ab.id === 'repair') {
        this.healUses++;
        this.buffs.heal = 3; this.buffs.healRate = this.maxHp * (0.3 + 0.05 * (mk - 1)) / 3;
        if (match.stats && this.isPlayer) match.stats.heals++;
        SP.Audio.play('heal');
        G.glows.emit(p.x, p.y, p.z, 12, { color: '#3ddc84', speed: 2, up: 2, life: 0.8, gravity: -1 });
      } else if (ab.id === 'barrier') {
        this.buffs.barrier = 4 + (mk - 1);
        SP.Audio.play('ability');
      } else if (ab.id === 'pulse') {
        const R = 5.5 + 0.75 * (mk - 1);
        G.FX.ring(this.pos, R, '#2fb4ff', 0.45);
        SP.Audio.play('explosion');
        for (const e of match.enemiesOf(this)) {
          if (e.dead || e.decoy && e.team === this.team) continue;
          const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
          if (d < R + e.radius) {
            if (e.invulnerable()) continue;
            _b.set(e.pos.x - this.pos.x, 0, e.pos.z - this.pos.z).normalize();
            Combat.resolveHit(this, e, { dmg: 5, kb: 7, up: 2, stun: e.boss ? 0.3 : 0.9, guard: 30, unblock: true, ability: true }, null, _b);
          }
        }
      } else if (ab.id === 'decoy') {
        match.spawnDecoy(this, 5 + 1.5 * (mk - 1), mk >= 3);
        SP.Audio.play('blink');
      } else if (ab.id === 'overdrive') {
        this.buffs.overdrive = 6 + 1.5 * (mk - 1);
        SP.Audio.play('ability');
      }
      this.cd[key] = Math.max(1, cd); this.cdMax[key] = Math.max(1, cd);
      if (this.isPlayer) SP.Bus.emit('playerAction', 'ability');
      return true;
    }

    /* what the Momentum button will do right now */
    momentumContext() {
      const finCost = this.st.mods && this.st.mods.has('overclock') ? 75 : 100;
      const extCost = this.st.mastery >= 3 ? 15 : 25;
      if (this.state === 'stun' || (this.time - this.lastHitTakenT < 0.5 && this.state !== 'attack')) {
        return { kind: 'shift', label: 'SHIFT', cost: 35, ok: this.momentum >= 35 };
      }
      if (this.state === 'attack' && this.move && !this.move.finisher && this.moveName !== 'ext' && this.moveName !== 'skill' && this.moveT >= (this.move.chainAt || this.move.dur * 0.5) - 0.06) {
        if (this.momentum >= finCost) return { kind: 'finisher', label: 'FINISHER', cost: finCost, ok: true };
        return { kind: 'ext', label: 'EXTEND', cost: extCost, ok: this.momentum >= extCost };
      }
      return { kind: 'finisher', label: 'FINISHER', cost: finCost, ok: this.momentum >= finCost && this.state !== 'dodge' };
    }
    doMomentum(match) {
      const c = this.momentumContext();
      if (!c.ok) { if (this.isPlayer) SP.HUD.denied('mom'); return true; }
      if (c.kind === 'shift') {
        this.momentum -= c.cost;
        this.state = 'free'; this.stunT = 0; this.endMove();
        const near = match.nearestEnemy(this, 30, 360);
        if (near) _a.set(this.pos.x - near.pos.x, 0, this.pos.z - near.pos.z).normalize(); else this.fwd(_a).multiplyScalar(-1);
        this.doDodge({ mx: _a.x, mz: _a.z }, 5.5, 0.22, [0, 0.22]);
        this.buffs.invuln = 0.7;
        G.FX.ring(this.pos, 4, '#9a5cff', 0.4);
        for (const e of match.enemiesOf(this)) {
          if (e.dead) continue;
          const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
          if (d < 3.2) { _b.set(e.pos.x - this.pos.x, 0, e.pos.z - this.pos.z).normalize(); e.kb.addScaledVector(_b, 7); }
        }
        if (this.isPlayer) SP.HUD.popupSelf('EMERGENCY SHIFT', 'mom');
        SP.Audio.play('momentum');
        return true;
      }
      if (c.kind === 'ext') {
        this.momentum -= c.cost;
        this.endMove();
        this.startMove('ext', match, true);
        if (this.isPlayer) SP.HUD.popupSelf('EXTEND', 'mom');
        SP.Audio.play('momentum');
        return true;
      }
      if (c.kind === 'finisher') {
        this.momentum -= c.cost;
        this.endMove();
        this.startMove('finisher', match, true);
        if (this.isPlayer) { SP.HUD.popupSelf(this.W.moves.finisher.name.toUpperCase(), 'fin'); if (match.stats) match.stats.finishers++; SP.Game.slowmo(0.35, 0.3); }
        SP.Audio.play('finisher');
        return true;
      }
      return false;
    }

    /* ---------------- moves ---------------- */
    startMove(name, match, force) {
      const mv = this.W.moves[name];
      if (!mv) return false;
      if (this.state === 'stun' && !force) return false;
      this.endMove();
      this.state = 'attack'; this.move = mv; this.moveName = name; this.moveT = 0;
      this.hitSets = (mv.hits || []).map(() => new Set());
      this.projFired = (mv.proj || []).map(() => false);
      this.moveFlags = {};
      this.blocking = false;
      // pick target and face it (soft lock)
      const tgt = this.pickAttackTarget(match, mv);
      this.atkTarget = tgt;
      if (tgt) {
        const desired = Math.atan2(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z);
        const diff = Math.abs(U.angDiff(this.yaw, desired));
        if (diff < 2.2 || this.faceTarget() === tgt || !this.isPlayer) this.yaw = U.angNorm(this.yaw + U.angDiff(this.yaw, desired) * 0.85);
      }
      // slow horizontal velocity at attack start
      this.vel.multiplyScalar(mv.mobile ? 0.8 : 0.35);
      if (mv.air) { this.vy = Math.max(this.vy, 2.2); }
      if (mv.plunge) { this.vy = -20; this.moveFlags.plunging = true; }
      this.lastMoves.push(name); if (this.lastMoves.length > 4) this.lastMoves.shift();
      // derive anim timing
      const h0 = Fighter.firstHitTime(mv);
      let hEnd = h0 + 0.1;
      if (mv.hits && mv.hits.length) hEnd = mv.hits[mv.hits.length - 1].t[1];
      if (mv.proj && mv.proj.length) hEnd = Math.max(hEnd, mv.proj[mv.proj.length - 1].t + 0.05);
      this.animA = U.clamp(h0 / mv.dur, 0.05, 0.9);
      this.animB = U.clamp(Math.max(hEnd, h0 + 0.06) / mv.dur, this.animA + 0.03, 0.97);
      if (mv.plunge) { this.animA = 0.15; this.animB = 0.4; }
      if (mv.anim.w === 'blockP') { this.animA = 0.1; this.animB = 0.9; }
      // sounds
      const heavy = (mv.hits && mv.hits[0] && mv.hits[0].dmg >= 16) || name === 'heavy';
      if (mv.hits && mv.hits.length) SP.Audio.play(heavy ? 'swingHeavy' : 'swing');
      if (mv.charge) SP.Audio.play('charge');
      // special at start
      if (mv.special === 'blinkToTarget' && tgt && Combat.dist(this, tgt) < 12) {
        _a.set(this.pos.x - tgt.pos.x, 0, this.pos.z - tgt.pos.z); if (_a.lengthSq() < 0.01) _a.set(0, 0, 1); _a.normalize();
        this.blinkTo(tgt.pos.x + _a.x * 1.6, tgt.pos.z + _a.z * 1.6, tgt);
      }
      // threat notification
      if (mv.hits || mv.proj) Combat.notifyThreat(this, mv, match);
      if (this.isPlayer) SP.Bus.emit('playerAction', name === 'heavy' || name === 'chainHeavy' ? 'heavy' : name.startsWith('l') ? 'light' : name);
      return true;
    }

    blinkTo(x, z, faceT) {
      const p = this.chest(_c);
      G.glows.emit(p.x, p.y, p.z, 6, { color: this.o.weaponColor || this.o.appearance.colors.accent, speed: 2, life: 0.35, gravity: 0 });
      this.pos.x = x; this.pos.z = z;
      G.clampToArena(this.pos, this.radius); G.pushOutObstacles(this.pos, this.radius);
      if (faceT) this.yaw = Math.atan2(faceT.pos.x - this.pos.x, faceT.pos.z - this.pos.z);
      const q = this.chest(_c);
      G.glows.emit(q.x, q.y, q.z, 6, { color: this.o.weaponColor || this.o.appearance.colors.accent, speed: 2, life: 0.35, gravity: 0 });
      SP.Audio.play('blink');
    }

    pickAttackTarget(match, mv) {
      const lock = this.faceTarget();
      if (lock) return lock;
      if (!this.isPlayer) return this.target;
      // prefer enemy in movement / facing direction within 7m
      let best = null, bestScore = 1e9;
      const ctl = this.lastCtrl;
      let dirYaw = this.yaw;
      if (ctl && Math.hypot(ctl.mx, ctl.mz) > 0.3) dirYaw = Math.atan2(ctl.mx, ctl.mz);
      const maxR = this.W.heat ? 20 : 7.5;
      for (const e of match.enemiesOf(this)) {
        if (e.dead) continue;
        const d = Combat.dist(this, e);
        if (d > maxR) continue;
        const ang = Math.abs(U.angDiff(dirYaw, Math.atan2(e.pos.x - this.pos.x, e.pos.z - this.pos.z)));
        const score = d + ang * 3.2;
        if (score < bestScore) { bestScore = score; best = e; }
      }
      return best;
    }

    endMove() {
      if (this.state === 'attack') this.state = 'free';
      this.move = null; this.moveName = '';
    }

    updAttack(dt, ctrl, match) {
      const mv = this.move;
      const t0 = this.moveT;
      if (this.moveFlags.plunging) {
        // freeze timeline at windup until landing
        if (!this.grounded) { this.moveT = Math.min(this.moveT + dt, mv.dur * 0.18); return; }
        this.moveFlags.plunging = false;
        this.moveT = mv.dur * 0.4;
        for (let i = 0; i < mv.hits.length; i++) Combat.sweep(this, mv.hits[i], i, match);
        SP.Audio.play('land', 1.5);
        if (mv.hits[0].fx === 'quake') Combat.quakeFx(this.pos, mv.hits[0].aoe, this.o.weaponColor || this.o.appearance.colors.accent);
        else G.FX.ring(this.pos, mv.hits[0].aoe, this.o.weaponColor || this.o.appearance.colors.accent, 0.35);
        return;
      }
      this.moveT += dt * this.atkSpeed();
      const t = this.moveT;
      // aim tracking during windup (melee) or whole move (ranged/mobile)
      const tgt = this.atkTarget && !this.atkTarget.dead ? this.atkTarget : null;
      const h0 = Fighter.firstHitTime(mv);
      if (tgt && (mv.mobile || t < h0 * 0.8)) {
        const desired = Math.atan2(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z);
        const rate = this.isPlayer ? 10 : (this.st.trackRate || 6);
        this.yaw = U.dampAngle(this.yaw, desired, rate, dt);
      }
      // mobile moves (rifle) allow strafing
      if (mv.mobile && ctrl) {
        const spd = this.moveSpeed() * mv.mobile;
        this.vel.x = U.damp(this.vel.x, ctrl.mx * spd, 10, dt);
        this.vel.z = U.damp(this.vel.z, ctrl.mz * spd, 10, dt);
      } else if (this.grounded) {
        this.vel.x = U.damp(this.vel.x, 0, 10, dt); this.vel.z = U.damp(this.vel.z, 0, 10, dt);
      }
      // lunge
      if (mv.lunge) {
        const [la, lb, ld] = mv.lunge;
        const ov = Math.max(0, Math.min(t, lb) - Math.max(t0, la));
        if (ov > 0) {
          let dist = ld * ov / (lb - la);
          // don't run through the target on ordinary lunges
          if (dist > 0 && tgt && !mv.invuln && Combat.dist(this, tgt) < 0.25 + (mv.hits && mv.hits[0] ? Math.min(1.1, mv.hits[0].range * 0.4) : 1)) dist = 0;
          this.fwd(_a);
          this.pos.addScaledVector(_a, dist);
          if (Math.abs(ld) > 3) {
            const p = this.chest(_b);
            G.sparks.emit(p.x, p.y - 0.4, p.z, 2, { color: this.o.weaponColor || this.o.appearance.colors.accent, speed: 1, life: 0.3, gravity: 0 });
          }
        }
      }
      // specials
      if (mv.special === 'blinkBehind' && !this.moveFlags.blinked && t >= 0.11) {
        this.moveFlags.blinked = true;
        if (tgt && Combat.dist(this, tgt) < 9.5) {
          tgt.fwd(_a);
          this.blinkTo(tgt.pos.x - _a.x * 1.3, tgt.pos.z - _a.z * 1.3, tgt);
        } else { this.fwd(_a); this.blinkTo(this.pos.x + _a.x * 4, this.pos.z + _a.z * 4, null); }
      }
      if (mv.special === 'eclipse' && tgt) {
        for (let i = 0; i < mv.hits.length - 1; i++) {
          const ht = mv.hits[i].t[0] - 0.04;
          if (t0 < ht && t >= ht) {
            const ang = i * 2.4 + 0.5;
            this.blinkTo(tgt.pos.x + Math.sin(ang) * 1.5, tgt.pos.z + Math.cos(ang) * 1.5, tgt);
          }
        }
      }
      if ((mv.special === 'gravityWell' || mv.special === 'singularity') && !this.moveFlags.pulled && t >= (mv.special === 'singularity' ? 0.3 : 0.25)) {
        this.moveFlags.pulled = true;
        const R = mv.special === 'singularity' ? 12 : 8;
        const h = mv.hits[0];
        this.fwd(_a); _b.copy(this.pos).addScaledVector(_a, h.at);
        G.FX.ring(_b, R, this.o.weaponColor || '#b46cff', 0.5, 0.08, 1);
        for (const e of match.enemiesOf(this)) {
          if (e.dead || e.invulnerable()) continue;
          const d = Math.hypot(e.pos.x - _b.x, e.pos.z - _b.z);
          if (d < R && d > 0.6) {
            _c.set(_b.x - e.pos.x, 0, _b.z - e.pos.z).normalize();
            e.kb.addScaledVector(_c, Math.min(16, d * 3.4));
            if (!e.boss) e.applyStun(0.6, 'pull');
          }
        }
        SP.Audio.play('charge');
      }
      if (mv.special === 'vent' && !this.moveFlags.vented) { this.moveFlags.vented = true; this.heat = 0; this.overheat = 0; const p = this.chest(_b); G.sparks.emit(p.x, p.y, p.z, 30, { color: '#e8ecf3', speed: 5, life: 0.6, gravity: -2, up: 2 }); }
      // charge glow
      if (mv.charge && t >= mv.charge[0] && t < mv.charge[1]) {
        const m = this.model.muzzle(_b);
        if (Math.random() < 0.5) G.sparks.emit(m.x, m.y, m.z, 2, { color: this.o.weaponColor || '#3dffb0', speed: 1.5, life: 0.25, gravity: 0 });
      }
      // hits
      if (mv.hits) {
        for (let i = 0; i < mv.hits.length; i++) {
          const h = mv.hits[i];
          if (h.onLand) continue;
          if (t >= h.t[0] && t0 <= h.t[1]) {
            if (!this.hitSets[i].fired) {
              this.hitSets[i].fired = true;
              if (h.fx === 'quake' || h.fx === 'nova') { this.fwd(_a); _b.copy(this.pos).addScaledVector(_a, h.at || 0); Combat.quakeFx(_b, h.aoe || 3, this.o.weaponColor || this.o.appearance.colors.accent, h.fx === 'nova'); }
              else if (h.fx === 'vent') G.FX.ring(this.pos, h.aoe, '#e8ecf3', 0.3);
              else if (h.aoe) { this.fwd(_a); _b.copy(this.pos).addScaledVector(_a, h.at || 0); G.FX.ring(_b, h.aoe, this.o.weaponColor || this.o.appearance.colors.accent, 0.3); }
            }
            Combat.sweep(this, h, i, match);
          }
        }
      }
      // projectiles
      if (mv.proj) {
        for (let i = 0; i < mv.proj.length; i++) {
          const p = mv.proj[i];
          if (!this.projFired[i] && t >= p.t) {
            this.projFired[i] = true;
            if (this.W.heat && p.heat && this.overheat > 0) continue;
            Combat.fire(this, p, mv, match);
            if (this.W.heat && p.heat) {
              this.heat += p.heat; this.lastShot = this.time;
              if (this.heat >= 100) {
                this.heat = 100; this.overheat = 2.2; SP.Audio.play('overheat');
                if (this.isPlayer) { SP.HUD.popupSelf('OVERHEAT', 'warn'); if (match.stats) match.stats.overheats++; }
              }
            }
          }
        }
      }
      // chaining / cancels
      const chainAt = mv.chainAt != null ? mv.chainAt : mv.dur;
      if (t >= chainAt && this.buf && !mv.finisher) {
        const a = this.buf.a;
        if (a === 'mom') { this.buf = null; this.doMomentum(match); return; }
        if (a === 'light' || a === 'heavy' || a === 'skill' || a === 'mom' || a === 'dodge' || a === 'jump' || a === 'ab0' || a === 'ab1') {
          const prevIdx = this.comboIdx;
          this.endMove();
          if (this.tryAction(a, ctrl, match)) { this.buf = null; return; }
          this.comboIdx = prevIdx;
          this.state = 'attack'; this.move = mv; // restore if failed
        }
      }
      // dodge cancel after the last active frame (recovery cancel) for everyone
      if (this.buf && this.buf.a === 'dodge' && mv.hits && t > mv.hits[mv.hits.length - 1].t[1] + 0.05 && !mv.finisher) {
        this.endMove();
        if (this.doDodge(ctrl)) { this.buf = null; return; }
      }
      if (t >= mv.dur) {
        this.endMove();
      }
    }

    updDodge(dt) {
      const t0 = this.dodgeT;
      this.dodgeT += dt;
      const p0 = U.easeOut(Math.min(1, t0 / this.dodgeDur)), p1 = U.easeOut(Math.min(1, this.dodgeT / this.dodgeDur));
      this.pos.addScaledVector(this.dodgeDir, this.dodgeDist * (p1 - p0));
      this.vel.set(0, 0, 0);
      if (this.dodgeDist > 6 && Math.random() < 0.6) { const p = this.chest(_a); G.glows.emit(p.x, p.y, p.z, 1, { color: this.o.appearance.colors.accent, speed: 0.5, life: 0.3, gravity: 0 }); }
      if (this.dodgeT >= this.dodgeDur) this.state = 'free';
    }

    updStun(dt, ctrl) {
      this.blocking = false;
      if (this.buf && this.buf.a === 'mom' && this.momentum >= 35 && this.isPlayer) {
        this.buf = null;
        this.doMomentum(SP.Game.match);
        return;
      }
      if (this.buf && this.buf.a === 'mom' && !this.isPlayer && this.momentum >= 35) { this.buf = null; this.doMomentum(SP.Game.match); return; }
      if (this.grounded) this.stunT -= dt;
      this.vel.x = U.damp(this.vel.x, 0, 8, dt); this.vel.z = U.damp(this.vel.z, 0, 8, dt);
      if (this.stunT <= 0 && this.grounded) { this.state = 'free'; this.stunT = 0; }
    }

    applyStun(t, kind) {
      if (this.dead) return;
      if (this.state === 'attack') this.endMove();
      if (this.state === 'dodge') return;
      this.state = 'stun';
      this.stunT = Math.max(this.stunT, t);
      this.stunKind = kind || 'hit';
      this.blocking = false;
      this.comboIdx = 0;
    }

    physics(dt) {
      const lowg = SP.Game.match && SP.Game.match.lowgrav ? 0.58 : 1;
      let g = GRAV * lowg;
      if (this.state === 'attack' && this.move && this.move.air) g *= 0.25;
      if (this.state === 'stun' && !this.grounded && this.airHits > 0) g *= 0.75;
      if (!this.grounded || this.vy > 0) {
        this.vy -= g * dt;
        this.pos.y += this.vy * dt;
        if (this.pos.y <= 0) {
          this.pos.y = 0;
          if (!this.grounded && this.vy < -6) SP.Audio.play('land', 0.6);
          this.vy = 0; this.grounded = true;
        } else this.grounded = false;
      }
      this.pos.x += (this.vel.x + this.kb.x) * dt;
      this.pos.z += (this.vel.z + this.kb.z) * dt;
      const kd = Math.exp(-6.5 * dt);
      this.kb.x *= kd; this.kb.z *= kd;
      if (G.clampToArena(this.pos, this.radius)) { this.kb.multiplyScalar(0.3); }
      G.pushOutObstacles(this.pos, this.radius);
      this.speed = Math.hypot(this.vel.x, this.vel.z);
      // local movement direction for leg animation
      if (this.speed > 0.2) {
        const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
        this.localFwd = (this.vel.x * s + this.vel.z * c) / this.speed;
        this.localSide = (this.vel.x * c - this.vel.z * s) / this.speed;
      }
    }

    syncModel(dt) {
      const m = this.model;
      m.root.position.copy(this.pos);
      m.root.rotation.y = this.yaw;
      m.blob.position.y = 0.02 - this.pos.y; m.blob.scale.setScalar(Math.max(0.3, 1 - this.pos.y * 0.25) * this.scale);
      const mv = this.move;
      const st = {
        speed: this.speed, grounded: this.grounded, block: this.blocking, sprint: this.sprinting,
        localFwd: this.localFwd, localSide: this.localSide,
        action: this.state === 'attack' && mv ? { anim: mv.anim, p: U.clamp(this.moveT / mv.dur, 0, 1), a: this.animA, b: this.animB } : null,
        stun: this.state === 'stun' ? Math.min(1, this.stunT * 4 + 0.3) : 0,
        dodge: this.state === 'dodge' ? this.dodgeT / this.dodgeDur : 0,
        dead: this.dead, deadT: this.deadT,
      };
      if (this.dodgeDist > 6 && this.state === 'dodge') st.dodge = 0;
      this.anim.update(dt, st);
      // phase dash: hide while blinking
      m.root.visible = !(this.state === 'dodge' && this.dodgeDist > 6 && this.dodgeT > 0.03 && this.dodgeT < this.dodgeDur - 0.03);
      // trails
      const active = this.state === 'attack' && mv && mv.hits && mv.hits.some((h) => !h.onLand && this.moveT >= h.t[0] - 0.06 && this.moveT <= h.t[1] + 0.04);
      if (active || this.trail.fade > 0) {
        if (m.bladePoints(_a, _b, false)) this.trail.push(_a, _b);
        if (this.trailL && m.bladePoints(_a, _b, true)) this.trailL.push(_a, _b);
      }
      this.trail.update(active, dt);
      if (this.trailL) this.trailL.update(active, dt);
      // telegraph glint for enemies: shows parry timing (white) or unblockable (red)
      this.glint.visible = false;
      if (this.team === 1 && this.state === 'attack' && mv && !this.decoy) {
        const h0 = Fighter.firstHitTime(mv);
        const lead = 0.3;
        if (this.moveT > h0 - lead && this.moveT < h0 + 0.02 && (mv.hits || mv.proj)) {
          const unb = (mv.hits && mv.hits[0] && mv.hits[0].unblock) || mv.unblock;
          m.muzzle(_a);
          this.glint.position.copy(_a);
          this.glint.material.color.set(unb ? '#ff2a3d' : '#dff4ff');
          const k = 1 - (h0 - this.moveT) / lead;
          this.glint.scale.setScalar((unb ? 0.35 : 0.22) * (0.6 + k * 0.8) * this.scale);
          this.glint.visible = true;
        }
      }
      // barrier bubble
      if (this.buffs.barrier > 0) {
        if (!this.bubble) { this.bubble = new THREE.Mesh(G.FX.sphGeo, G.addMat('#2fb4ff', 0.18)); G.fxRoot.add(this.bubble); }
        this.bubble.visible = true; this.bubble.position.set(this.pos.x, this.pos.y + 1.0 * this.scale, this.pos.z); this.bubble.scale.setScalar(1.15 * this.scale);
        this.bubble.material.opacity = 0.12 + Math.sin(this.time * 10) * 0.04;
      } else if (this.bubble) this.bubble.visible = false;
      if (this.buffs.overdrive > 0 && Math.random() < 0.3) { const p = this.chest(_a); G.sparks.emit(p.x, p.y - 0.5, p.z, 1, { color: '#ffbf3d', speed: 1, up: 2, life: 0.4, gravity: -2 }); }
      // heat glow
      if (this.W.heat && m.wR && m.wR.parts.heatMat) {
        const c = m.wR.parts.heatMat.color;
        const k = this.heat / 100;
        c.set(this.o.weaponColor || this.o.appearance.colors.accent).lerp(_tmpCol.set(this.overheat > 0 ? '#ff2a3d' : '#ff8a3d'), k);
      }
    }
  }
  const _tmpCol = new THREE.Color();
  SP.Fighter = Fighter;

  /* =================================================================
     Combat resolution
     ================================================================= */
  const Combat = {
    projectiles: [], hazards: [], boltGeo: null,

    dist(a, b) { return Math.max(0, Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) - b.radius); },

    notifyThreat(att, mv, match) {
      for (const e of match.enemiesOf(att)) if (e.ai && !e.dead) e.ai.onThreat(att, mv);
    },

    /* melee sweep for one hit window */
    sweep(att, h, idx, match) {
      const set = att.hitSets[idx];
      const reach = 1 + (att.st.wstats && att.st.wstats.reach || 0);
      const fx = Math.sin(att.yaw), fz = Math.cos(att.yaw);
      for (const e of match.enemiesOf(att)) {
        if (e.dead || set.has(e)) continue;
        const dy = Math.abs((e.pos.y + e.height * 0.5) - (att.pos.y + att.height * 0.5));
        if (dy > 1.4 * Math.max(att.scale, e.scale) + (h.aoe ? 0.4 : 0)) continue;
        let hit = false;
        if (h.aoe) {
          const cx = att.pos.x + fx * (h.at || 0), cz = att.pos.z + fz * (h.at || 0);
          hit = Math.hypot(e.pos.x - cx, e.pos.z - cz) <= h.aoe + e.radius;
        } else {
          const dx = e.pos.x - att.pos.x, dz = e.pos.z - att.pos.z;
          const d = Math.hypot(dx, dz) - e.radius;
          if (d <= h.range * reach * (att.st.rangeMult || 1)) {
            if (h.arc >= 360) hit = true;
            else {
              const ang = Math.abs(U.angDiff(att.yaw, Math.atan2(dx, dz)));
              // generous arc near the attacker so point-blank hits connect
              const half = (h.arc / 2) * Math.PI / 180 + (d < 0.6 ? 0.6 : 0.12);
              hit = ang <= half;
            }
          }
        }
        if (hit) {
          set.add(e);
          _b.set(e.pos.x - att.pos.x, 0, e.pos.z - att.pos.z);
          if (_b.lengthSq() < 1e-4) _b.set(fx, 0, fz); _b.normalize();
          Combat.resolveHit(att, e, h, att.move, _b.clone());
        }
      }
    },

    /* the core: apply a hit from att to tgt. dir = unit vector from attacker toward target */
    resolveHit(att, tgt, h, mv, dir) {
      if (tgt.dead) return 'none';
      const match = SP.Game.match;
      const ranged = !!h.ranged;
      const chestP = tgt.chest(_c);
      const color = att.o.weaponColor || att.o.appearance.colors.accent;
      // dodge
      if (tgt.invulnerable()) {
        if (tgt.state === 'dodge' && !tgt.perfectUsed && !h.ability) {
          tgt.perfectUsed = true;
          Combat.perfectDodge(tgt, att);
        }
        return 'miss';
      }
      // kinetic counter stance
      if (tgt.inCounterStance() && !h.unblock && !h.ability) {
        tgt.endMove();
        tgt.startMove('kcounter', match, true);
        tgt.atkTarget = att;
        tgt.yaw = Math.atan2(att.pos.x - tgt.pos.x, att.pos.z - tgt.pos.z);
        if (!ranged) att.applyStun(0.7, 'countered');
        Combat.gainMomentum(tgt, 18);
        SP.HUD.popup(chestP, 'KINETIC COUNTER', 'parry');
        G.FX.ring(tgt.pos, 2.5, '#ffbf3d', 0.35);
        SP.Audio.play('parry');
        tgt.buffs.counter = 1.2;
        if (tgt.isPlayer && match.stats) match.stats.parries++;
        return 'countered';
      }
      // facing check for guard: attacker in front of target
      tgt.fwd(_d);
      const frontal = -(_d.x * dir.x + _d.z * dir.z) > Math.cos(75 * Math.PI / 180);
      const shieldBlock = tgt.shieldUp && frontal && !h.unblock;
      if ((tgt.blocking && frontal || shieldBlock) && !h.unblock) {
        const parryOk = !h.noParry && !(mv && mv.noParry) && tgt.blocking && (tgt.time - tgt.blockPressT) <= tgt.parryWindow();
        if (parryOk) { Combat.parry(tgt, att, ranged); return 'parry'; }
        // block
        const br = shieldBlock && !tgt.blocking ? 0.92 : tgt.W.blockReduce;
        let chip = h.dmg * (att.st.dmgMult || 1) * (1 - br) * (att.st.power || 1);
        let gd = (h.guard || 10) * (1 + (att.st.wstats && att.st.wstats.guardBreak || 0)) * (att.st.guardMult || 1);
        if (tgt.st.mods && tgt.st.mods.has('bulwark')) gd *= 0.7;
        if (shieldBlock && !tgt.blocking) gd *= 0.6;
        tgt.guard -= gd; tgt.lastGuardHitT = tgt.time;
        tgt.hp -= chip;
        tgt.kb.addScaledVector(dir, (h.kb || 1) * 0.5);
        att.freeze = Math.max(att.freeze, 0.05);
        G.sparks.emit(chestP.x, chestP.y, chestP.z, 8, { color: '#e8f4ff', speed: 6, life: 0.25, gravity: 4 });
        SP.Audio.play('block');
        Combat.gainMomentum(tgt, 2);
        if (tgt.guard <= 0) {
          tgt.guard = 0;
          tgt.applyStun(1.25, 'guardbreak');
          tgt.lastGuardHitT = tgt.time - 0.6;
          SP.HUD.popup(chestP, 'GUARD BREAK', 'break');
          SP.Audio.play('guardBreak');
          Combat.gainMomentum(att, 12);
          G.FX.ring(tgt.pos, 2, '#ffbf3d', 0.35);
          if (att.st.mods && att.st.mods.has('shatter')) Combat.areaDamage(att, tgt.pos, 3, 25, '#ffbf3d');
          if (tgt.ai) tgt.ai.onGuardBreak();
        } else if (tgt.isPlayer || att.isPlayer) SP.HUD.popup(chestP, 'BLOCK', 'block');
        if (tgt.hp <= 0) Combat.kill(tgt, att);
        if (tgt.ai) tgt.ai.onBlocked(att);
        return 'block';
      }
      // ---- damage ----
      let dmg = h.dmg * (att.st.dmgMult || 1) * (att.st.power || 1);
      let tags = [];
      let counter = false;
      if (att.buffs.counter > 0 && !h.ability) {
        let cm = att.W.counterMult || 1.5;
        if (att.st.mastery >= 3) cm += 0.1;
        if (att.st.mods && att.st.mods.has('riposte')) cm += 0.15;
        dmg *= cm; counter = true;
      }
      if (att.W.tipper && !h.closeOk && !ranged && !h.aoe) {
        const d = Combat.dist(att, tgt);
        if (d < 1.0) { dmg *= 0.5; tags.push('weak'); }
        else if (d > 2.3) { dmg *= 1.15; tags.push('tip'); }
      }
      const behind = (_d.x * dir.x + _d.z * dir.z) > 0.45;
      if (behind && !ranged && !h.ability) { dmg *= att.family === 'daggers' ? 1.5 : 1.2; tags.push('back'); }
      if (tgt.state === 'stun' && att.st.mods && att.st.mods.has('executioner')) dmg *= 1.3;
      let crit = false;
      if (att.st.wstats && att.st.wstats.crit && Math.random() < att.st.wstats.crit) { dmg *= 1.5; crit = true; }
      if (mv && mv.finisher && att.st.mastery >= 5) dmg *= 1.3;
      const scale = Math.max(0.45, 1 - Math.max(0, tgt.comboTaken - 4) * 0.06);
      dmg *= scale;
      dmg *= 1 - (tgt.st.def || 0);
      if (tgt.buffs.barrier > 0) dmg *= 0.4;
      if (tgt.buffs.overdrive > 0) dmg *= 1.15;
      if (tgt.st.dmgTakenMult) dmg *= tgt.st.dmgTakenMult;
      // procs
      att.hitCount++;
      let bonus = 0;
      if (att.st.mods && att.st.mods.has('static') && att.hitCount % 4 === 0) { bonus += 8; G.sparks.emit(chestP.x, chestP.y, chestP.z, 10, { color: '#7fd0ff', speed: 8, life: 0.25, gravity: 0 }); }
      dmg += bonus;
      dmg = Math.max(1, dmg);
      tgt.hp -= dmg;
      tgt.lastDamagedBy = att;
      tgt.lastHitTakenT = tgt.time; att.lastHitT = att.time;
      tgt.comboTaken++;
      if (!tgt.grounded) tgt.airHits++;
      if (att.st.mods && att.st.mods.has('siphon')) att.hp = Math.min(att.maxHp, att.hp + dmg * 0.04);
      // momentum
      let mg = 3 + dmg * 0.12;
      const lm = att.lastMoves;
      if (lm.length >= 2 && lm[lm.length - 1] !== lm[lm.length - 2] && !(lm[lm.length - 1][0] === 'l' && lm[lm.length - 2][0] === 'l')) mg += 2.5;
      if (counter) mg += 4;
      if (!(mv && mv.finisher)) Combat.gainMomentum(att, mg);
      Combat.gainMomentum(tgt, 1.5);
      // reaction
      const heavyHit = dmg >= 18 || (h.kb || 0) >= 5;
      const armored = tgt.armored();
      let stun = (h.stun || 0.3);
      if (tgt.comboTaken > 8) stun *= 0.7;
      let flinch = true;
      if (armored) flinch = false;
      if (ranged && !h.aoe && (h.dmg || 0) < 15 && tgt.state === 'attack' && tgt.moveT > 0.06) flinch = false;
      if (tgt.poiseMax) {
        tgt.poise -= dmg * (h.guard >= 25 ? 1.6 : 1);
        if (tgt.poise > 0 && !(mv && mv.finisher)) flinch = false;
        else if (tgt.poise <= 0) { tgt.poise = tgt.poiseMax; stun = Math.max(stun, tgt.boss ? 1.1 : 0.9); SP.HUD.popup(chestP, 'STAGGER', 'break'); if (tgt.ai) tgt.ai.onPoiseBreak(); }
      }
      if (h.ability && tgt.boss) flinch = flinch && tgt.poise <= 0;
      if (flinch) {
        tgt.applyStun(stun, 'hit');
        const kbm = tgt.boss ? 0.35 : 1;
        tgt.kb.addScaledVector(dir, (h.kb || 1) * kbm * (tgt.isPlayer ? 0.85 : 1));
        if (h.up && !tgt.boss) { tgt.vy = Math.max(tgt.vy, h.up); tgt.grounded = false; }
        else if (!tgt.grounded && !tgt.boss) tgt.vy = Math.max(tgt.vy, 1.2);
      } else {
        tgt.kb.addScaledVector(dir, (h.kb || 1) * 0.15);
        if (armored && (att.isPlayer || tgt.isPlayer)) SP.HUD.popup(chestP, 'ARMOR', 'block');
      }
      // combo break (anti-infinite)
      if (tgt.comboTaken >= 13 || tgt.airHits >= 6) {
        tgt.breakT = 0.9; tgt.comboTaken = 0; tgt.airHits = 0;
        tgt.stunT = Math.min(tgt.stunT, 0.12);
        tgt.kb.addScaledVector(dir, 5);
        SP.HUD.popup(chestP, 'BREAK', 'break');
        G.FX.ring(tgt.pos, 2.2, '#e8ecf3', 0.3);
      }
      // feedback
      const hs = heavyHit ? 0.1 : 0.055;
      att.freeze = Math.max(att.freeze, ranged ? 0 : hs); tgt.freeze = Math.max(tgt.freeze, hs);
      G.FX.hit(chestP, crit ? '#ffffff' : color, heavyHit);
      SP.Audio.play(heavyHit ? 'hitHeavy' : 'hit');
      SP.HUD.damage(chestP, dmg, crit || counter, tgt.isPlayer);
      if (counter) {
        if (att.counterMoveTag !== mv) { att.counterMoveTag = mv; if (att.isPlayer && match.stats) match.stats.counters++; SP.HUD.popup(chestP, 'COUNTER', 'counter'); }
      } else if (tags.includes('back') && (att.isPlayer)) SP.HUD.popup(chestP, 'BACKSTAB', 'counter');
      else if (tags.includes('tip') && att.isPlayer && Math.random() < 0.35) SP.HUD.popup(chestP, 'TIPPER', 'tip');
      else if (tags.includes('weak') && att.isPlayer && Math.random() < 0.4) SP.HUD.popup(chestP, 'TOO CLOSE', 'weak');
      if (att.isPlayer || tgt.isPlayer) SP.Game.shake(heavyHit ? 0.32 : 0.1);
      if (att.isPlayer && match.stats) { match.stats.dealt += dmg; match.onPlayerHit(); }
      if (tgt.isPlayer && match.stats) match.stats.taken += dmg;
      if (att.st.mods && att.st.mods.has('echo') && att.hitCount % 6 === 0 && !h.echo) {
        Combat.areaDamage(att, tgt.pos, 2.5, 12, color, true);
      }
      if (tgt.ai) tgt.ai.onHit(att);
      if (att.ai) att.ai.onLanded(tgt);
      if (tgt.hp <= 0) Combat.kill(tgt, att);
      return 'hit';
    },

    gainMomentum(f, amt) {
      if (f.decoy) return;
      const before = f.momentum;
      f.momentum = Math.min(100, f.momentum + amt * (1 + (f.st.momentumGain || 0)));
      if (f.isPlayer && before < 100 && f.momentum >= 100) { SP.Audio.play('momentum'); SP.HUD.popupSelf('MOMENTUM FULL', 'mom'); }
    },

    parry(def, att, ranged) {
      const match = SP.Game.match;
      const p = def.chest(_c);
      if (!ranged) {
        att.applyStun(att.boss ? 0.75 : 0.95, 'parried');
        att.guard = Math.max(0, att.guard - 30);
        att.kb.addScaledVector(_a.set(att.pos.x - def.pos.x, 0, att.pos.z - def.pos.z).normalize(), 2.5);
      }
      def.buffs.counter = 1.6 + (def.st.mods && def.st.mods.has('riposte') ? 1 : 0);
      def.freeze = Math.max(def.freeze, 0.1); att.freeze = Math.max(att.freeze, 0.12);
      Combat.gainMomentum(def, 20);
      G.FX.ring(def.pos, 2.4, '#dff4ff', 0.3, p.y);
      G.FX.flash(p, 1.4, '#9fdcff', 0.2);
      G.sparks.emit(p.x, p.y, p.z, 24, { color: '#dff4ff', speed: 10, life: 0.35, gravity: 2 });
      SP.Audio.play('parry');
      SP.HUD.popup(p, ranged ? 'DEFLECT' : 'PARRY', 'parry');
      if (def.isPlayer || att.isPlayer) { SP.Game.slowmo(0.3, 0.28); SP.Game.shake(0.15); }
      if (def.isPlayer && match.stats) match.stats.parries++;
      if (def.st.mods && def.st.mods.has('shatter')) Combat.areaDamage(def, def.pos, 3, 25, '#ffbf3d');
      if (def.W.autoCounter && !ranged) { def.blocking = false; def.startMove('pcounter', match, true); def.atkTarget = att; }
      if (def.ai) def.ai.onParried(att);
      if (att.ai) att.ai.onGotParried(def);
      if (def.isPlayer) SP.Bus.emit('playerAction', 'parry');
    },

    perfectDodge(f, att) {
      const p = f.chest(_c);
      Combat.gainMomentum(f, 15);
      if (f.st.mods && f.st.mods.has('feedback')) { f.dodges = Math.min(f.dodgeMax, f.dodges + 1); Combat.gainMomentum(f, 10); }
      f.buffs.counter = Math.max(f.buffs.counter, 1.2);
      G.glows.emit(p.x, p.y, p.z, 8, { color: '#9a5cff', speed: 2, life: 0.4, gravity: 0 });
      SP.Audio.play('perfect');
      if (f.isPlayer) {
        SP.HUD.popupSelf('PERFECT DODGE', 'perfect');
        SP.Game.slowmo(0.35, 0.4);
        const m = SP.Game.match; if (m && m.stats) m.stats.perfects++;
      }
    },

    areaDamage(att, pos, r, dmg, color, isEcho) {
      G.FX.ring(pos, r, color, 0.35);
      const match = SP.Game.match;
      for (const e of match.enemiesOf(att)) {
        if (e.dead) continue;
        const d = Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z);
        if (d < r + e.radius) {
          _b.set(e.pos.x - pos.x, 0, e.pos.z - pos.z); if (_b.lengthSq() < 1e-4) _b.set(0, 0, 1); _b.normalize();
          Combat.resolveHit(att, e, { dmg, kb: 2, stun: 0.3, guard: 10, unblock: true, ability: true, echo: isEcho }, null, _b);
        }
      }
    },

    quakeFx(pos, r, color, big) {
      G.FX.ring(pos, r, color, 0.4);
      G.FX.ring(pos, r * 0.6, '#ffffff', 0.25);
      G.sparks.emit(pos.x, 0.2, pos.z, big ? 40 : 22, { color, speed: big ? 9 : 6, up: 4, life: 0.6, gravity: 12, flat: true });
      SP.Audio.play(big ? 'explosion' : 'quake');
      SP.Game.shake(big ? 0.5 : 0.3);
    },

    kill(tgt, att) {
      if (tgt.dead) return;
      tgt.dead = true; tgt.hp = 0; tgt.state = 'dead'; tgt.deadT = 0; tgt.blocking = false;
      tgt.move = null;
      tgt.kb.multiplyScalar(1.5);
      const p = tgt.chest(_c);
      G.sparks.emit(p.x, p.y, p.z, 40, { color: tgt.o.weaponColor || tgt.o.appearance.colors.accent, speed: 8, life: 0.8, gravity: 6 });
      G.FX.flash(p, 2, '#ffffff', 0.25);
      if (!tgt.decoy) SP.Audio.play('death');
      SP.Game.match.onDeath(tgt, att);
    },

    /* ---------------- projectiles ---------------- */
    aimDir(att, out) {
      const tgt = att.atkTarget && !att.atkTarget.dead ? att.atkTarget : null;
      const m = att.model.muzzle(_b);
      if (tgt) {
        out.set(tgt.pos.x - m.x, tgt.pos.y + 1.15 * tgt.scale - m.y, tgt.pos.z - m.z).normalize();
        // never aim more than ~35deg away from facing
        att.fwd(_a);
        if (_a.x * out.x + _a.z * out.z < 0.8) { out.copy(_a); }
      } else { att.fwd(out); out.y = 0; }
      return m;
    },

    fire(att, p, mv, match) {
      const color = att.o.weaponColor || att.o.appearance.colors.accent;
      const dir = V();
      const m = Combat.aimDir(att, dir).clone();
      if (p.kind === 'bolt' || p.kind === 'kunai') {
        if (!Combat.boltGeo) Combat.boltGeo = new THREE.SphereGeometry(1, 8, 6);
        const mesh = new THREE.Mesh(Combat.boltGeo, G.addMat(color, 0.95));
        mesh.scale.set(0.09, 0.09, 0.45);
        G.fxRoot.add(mesh);
        if (p.spread) dir.applyAxisAngle(_a.set(0, 1, 0), p.spread);
        Combat.projectiles.push({ kind: p.kind, owner: att, pos: m, prev: m.clone(), vel: dir.multiplyScalar(p.speed || 34), life: 1.3, dmg: p.dmg, mesh, homing: p.homing || 0, target: att.atkTarget, color, stun: p.stun || 0.14, kb: p.kb || 0.35, unblock: p.unblock, mv });
        SP.Audio.play('shot');
      } else if (p.kind === 'beam') {
        const end = m.clone().addScaledVector(dir, p.range || 16);
        // obstacles stop the beam
        for (let s = 1; s <= 16; s++) {
          _c.copy(m).addScaledVector(dir, (p.range || 16) * s / 16);
          if (G.pushOutObstacles(_d.copy(_c), 0) || G.clampToArena(_d.copy(_c), 0)) { end.copy(_c); break; }
        }
        G.FX.beam(m, end, color, 0.16, 0.32);
        G.FX.flash(m, 0.6, color, 0.15);
        SP.Audio.play('beam');
        const L = m.distanceTo(end);
        for (const e of match.enemiesOf(att)) {
          if (e.dead) continue;
          _c.set(e.pos.x - m.x, 0, e.pos.z - m.z);
          const along = _c.x * dir.x + _c.z * dir.z;
          if (along < 0 || along > L + e.radius) continue;
          const perp = Math.abs(_c.x * dir.z - _c.z * dir.x);
          if (perp < e.radius + 0.35) {
            _d.set(dir.x, 0, dir.z).normalize();
            Combat.resolveHit(att, e, { dmg: p.dmg, stun: p.stun || 0.5, kb: p.kb || 2, guard: 22, ranged: true }, mv, _d.clone());
          }
        }
      } else if (p.kind === 'grenade') {
        const tgt = att.atkTarget && !att.atkTarget.dead ? att.atkTarget : null;
        att.fwd(_a);
        const dest = tgt ? tgt.pos.clone() : att.pos.clone().addScaledVector(_a, 8);
        const flat = Math.hypot(dest.x - att.pos.x, dest.z - att.pos.z);
        if (flat > 12) { dest.sub(att.pos).multiplyScalar(12 / flat).add(att.pos); }
        dest.y = 0;
        const T = 0.75;
        const vel = new THREE.Vector3((dest.x - m.x) / T, (dest.y - m.y + 0.5 * GRAV * T * T) / T, (dest.z - m.z) / T);
        const mesh = new THREE.Mesh(G.FX.sphGeo, G.addMat(color, 0.95)); mesh.scale.setScalar(0.16); G.fxRoot.add(mesh);
        const dec = G.FX.decal(dest, p.radius, color);
        Combat.projectiles.push({ kind: 'grenade', owner: att, pos: m, prev: m.clone(), vel, life: T, T, dmg: p.dmg, radius: p.radius, mesh, color, decal: dec, kb: p.kb, stun: p.stun });
        SP.Audio.play('swing');
      }
    },

    updateProjectiles(dt, match) {
      const list = Combat.projectiles;
      for (let i = list.length - 1; i >= 0; i--) {
        const pr = list[i];
        pr.life -= dt;
        pr.prev.copy(pr.pos);
        if (pr.kind === 'grenade') {
          pr.vel.y -= GRAV * dt;
          pr.pos.addScaledVector(pr.vel, dt);
          pr.mesh.position.copy(pr.pos);
          G.FX.decalProgress(pr.decal, 1 - pr.life / pr.T);
          if (pr.life <= 0 || pr.pos.y <= 0.05) {
            pr.pos.y = 0;
            G.FX.freeDecal(pr.decal);
            Combat.quakeFx(pr.pos, pr.radius, pr.color, true);
            for (const e of match.enemiesOf(pr.owner)) {
              if (e.dead) continue;
              const d = Math.hypot(e.pos.x - pr.pos.x, e.pos.z - pr.pos.z);
              if (d < pr.radius + e.radius) {
                _b.set(e.pos.x - pr.pos.x, 0, e.pos.z - pr.pos.z); if (_b.lengthSq() < 1e-4) _b.set(0, 0, 1); _b.normalize();
                Combat.resolveHit(pr.owner, e, { dmg: pr.dmg, kb: pr.kb || 5, up: 3, stun: pr.stun || 0.8, guard: 30, ranged: true, aoe: true }, null, _b.clone());
              }
            }
            G.fxRoot.remove(pr.mesh); list.splice(i, 1);
          }
          continue;
        }
        if (pr.homing && pr.target && !pr.target.dead) {
          _a.set(pr.target.pos.x - pr.pos.x, pr.target.pos.y + 1.1 - pr.pos.y, pr.target.pos.z - pr.pos.z).normalize();
          const sp = pr.vel.length();
          _b.copy(pr.vel).normalize().lerp(_a, Math.min(1, pr.homing * dt)).normalize();
          pr.vel.copy(_b).multiplyScalar(sp);
        }
        pr.pos.addScaledVector(pr.vel, dt);
        pr.mesh.position.copy(pr.pos);
        pr.mesh.lookAt(_a.copy(pr.pos).add(pr.vel));
        let dead = pr.life <= 0 || pr.pos.y < 0;
        if (!dead && (G.segmentBlocked(pr.prev, pr.pos) || G.clampToArena(_c.copy(pr.pos), -0.5))) {
          dead = true; G.sparks.emit(pr.pos.x, pr.pos.y, pr.pos.z, 6, { color: pr.color, speed: 4, life: 0.25 });
        }
        if (!dead) {
          for (const e of match.enemiesOf(pr.owner)) {
            if (e.dead) continue;
            // segment vs vertical capsule (2D distance + height range)
            const ax = pr.prev.x, az = pr.prev.z, bx = pr.pos.x, bz = pr.pos.z;
            const abx = bx - ax, abz = bz - az, l2 = abx * abx + abz * abz || 1e-6;
            let t = ((e.pos.x - ax) * abx + (e.pos.z - az) * abz) / l2; t = U.clamp(t, 0, 1);
            const cx = ax + abx * t, cz = az + abz * t;
            const cy = pr.prev.y + (pr.pos.y - pr.prev.y) * t;
            if (Math.hypot(cx - e.pos.x, cz - e.pos.z) < e.radius + 0.18 && cy > e.pos.y - 0.1 && cy < e.pos.y + e.height + 0.1) {
              if (e.invulnerable()) {
                if (e.state === 'dodge' && !e.perfectUsed) { e.perfectUsed = true; Combat.perfectDodge(e, pr.owner); }
                continue;
              }
              _b.copy(pr.vel); _b.y = 0; _b.normalize();
              Combat.resolveHit(pr.owner, e, { dmg: pr.dmg, stun: pr.stun, kb: pr.kb, guard: 7, ranged: true, unblock: pr.unblock }, pr.mv, _b.clone());
              dead = true; break;
            }
          }
        }
        if (dead) { G.fxRoot.remove(pr.mesh); pr.mesh.material.dispose(); list.splice(i, 1); }
      }
    },

    /* ---------------- hazards (telegraphed area attacks) ---------------- */
    hazard(o) {
      // o: {kind:'circle'|'ring', pos, r, delay, dmg, owner, color, kb, up, stun, team, speed, r1}
      const hz = Object.assign({ t: 0, done: false, hitSet: new Set(), color: '#ff2a3d', kb: 4, up: 0, stun: 0.6 }, o);
      if (hz.kind === 'circle') hz.decal = G.FX.decal(hz.pos, hz.r, hz.color);
      if (hz.kind === 'ring') { hz.cur = hz.r0 || 0.5; }
      Combat.hazards.push(hz);
      return hz;
    },
    updateHazards(dt, match) {
      const list = Combat.hazards;
      for (let i = list.length - 1; i >= 0; i--) {
        const hz = list[i];
        hz.t += dt;
        if (hz.kind === 'circle') {
          G.FX.decalProgress(hz.decal, Math.min(1, hz.t / hz.delay));
          if (hz.t >= hz.delay) {
            G.FX.freeDecal(hz.decal);
            Combat.quakeFx(hz.pos, hz.r, hz.color, hz.r > 3);
            G.FX.flash(_a.set(hz.pos.x, 0.5, hz.pos.z), hz.r, hz.color, 0.25);
            for (const f of match.fighters) {
              if (f.dead || f.team === hz.team) continue;
              const d = Math.hypot(f.pos.x - hz.pos.x, f.pos.z - hz.pos.z);
              if (d < hz.r + f.radius * 0.5) {
                _b.set(f.pos.x - hz.pos.x, 0, f.pos.z - hz.pos.z); if (_b.lengthSq() < 1e-4) _b.set(0, 0, 1); _b.normalize();
                Combat.resolveHit(hz.owner, f, { dmg: hz.dmg, kb: hz.kb, up: hz.up, stun: hz.stun, guard: 25, unblock: hz.unblock !== false, ability: false, aoe: true, ranged: true }, null, _b.clone());
              }
            }
            list.splice(i, 1);
          }
        } else if (hz.kind === 'ring') {
          if (hz.t < (hz.delay || 0)) continue;
          const prevR = hz.cur;
          hz.cur += hz.speed * dt;
          if (!hz.vis || hz.t - hz.vis > 0.05) { hz.vis = hz.t; G.FX.ring(hz.pos, hz.cur, hz.color, 0.12, 0.08, 0.98); }
          for (const f of match.fighters) {
            if (f.dead || f.team === hz.team || hz.hitSet.has(f)) continue;
            const d = Math.hypot(f.pos.x - hz.pos.x, f.pos.z - hz.pos.z);
            if (d >= prevR - f.radius && d <= hz.cur + f.radius && f.pos.y < 0.45) {
              hz.hitSet.add(f);
              _b.set(f.pos.x - hz.pos.x, 0, f.pos.z - hz.pos.z); if (_b.lengthSq() < 1e-4) _b.set(0, 0, 1); _b.normalize();
              Combat.resolveHit(hz.owner, f, { dmg: hz.dmg, kb: hz.kb, up: 3, stun: hz.stun, guard: 25, unblock: true, aoe: true, ranged: true }, null, _b.clone());
            }
          }
          if (hz.cur >= hz.r1) list.splice(i, 1);
        }
      }
    },

    clear() {
      for (const p of Combat.projectiles) { G.fxRoot.remove(p.mesh); if (p.decal) G.FX.freeDecal(p.decal); }
      for (const h of Combat.hazards) if (h.decal) G.FX.freeDecal(h.decal);
      Combat.projectiles.length = 0; Combat.hazards.length = 0;
    },
  };
  SP.Combat = Combat;
})();
