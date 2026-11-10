/* SHATTERPOINT — enemy AI: archetype brains, reactions, adaptation and bosses */
'use strict';
(function () {
  const U = SP.U;
  const G = SP.G;
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  const Fighter = SP.Fighter;

  class Brain {
    constructor(f, arch, diff, match) {
      this.f = f; this.A = arch; this.D = diff; this.match = match;
      f.ai = this;
      this.mode = 'approach'; this.modeT = 0;
      this.decideT = U.rand(0.3, 0.8);
      this.plan = null; this.planStep = 0; this.planWait = 0; this.hasToken = false;
      this.strafeDir = U.chance(0.5) ? 1 : -1;
      this.blockUntil = 0; this.reactions = [];
      this.defFatigue = 0;
      this.stuckT = 0; this.lastPos = f.pos.clone(); this.unstickT = 0; this.unstickDir = new THREE.Vector3();
      this.adapt = { light: 1, heavy: 1, dodge: 1, parry: 1, skill: 1, total: 4 };
      this.pressed = [];
      this.ctrl = { mx: 0, mz: 0, sprint: false, block: false, pressed: this.pressed };
      this.time = 0;
      this.lastAttackEnd = 0;
      this.pressureT = 0;
      if (arch.adapt) {
        this._onAct = (a) => { if (this.adapt[a] != null) { this.adapt[a] += 1; this.adapt.total += 1; } };
        SP.Bus.on('playerAction', this._onAct);
      }
    }

    get tgt() { return this.f.target; }

    chooseTarget() {
      const opp = this.match.enemiesOf(this.f).filter((e) => !e.dead);
      const decoy = opp.find((e) => e.decoy && e.buffs.decoyAggro > 0);
      if (decoy) return decoy;
      return opp.find((e) => e.isPlayer) || opp[0] || null;
    }

    range() {
      const r = this.f.W.aiRange;
      return { min: r[0], max: r[1], ideal: (r[0] + r[1]) / 2 };
    }

    /* ------------------------------------------------------------- */
    update(dt) {
      const f = this.f;
      this.time += dt;
      const c = this.ctrl;
      this.pressed.length = 0;
      c.mx = 0; c.mz = 0; c.sprint = false;
      if (f.dead) return c;
      f.target = this.chooseTarget();
      const t = f.target;
      if (!t) { c.block = false; return c; }
      if (this.A.passive) { c.block = false; this.idleWander(dt, c); return c; }

      const dx = t.pos.x - f.pos.x, dz = t.pos.z - f.pos.z;
      const dist = Math.max(0, Math.hypot(dx, dz) - t.radius - f.radius * 0.5);
      const toT = _a.set(dx, 0, dz).normalize();
      const R = this.range();

      // scheduled reactions
      for (let i = this.reactions.length - 1; i >= 0; i--) {
        const r = this.reactions[i];
        if (this.time >= r.at) {
          if (r.type === 'press') { this.pressed.push(r.a); if (r.a === 'dodge') this.dodgeNow = true; }
          if (r.type === 'block') this.blockUntil = Math.max(this.blockUntil, r.until);
          this.reactions.splice(i, 1);
        }
      }
      c.block = this.time < this.blockUntil && f.state !== 'attack';
      if (this.defFatigue > 0) this.defFatigue = Math.max(0, this.defFatigue - dt * 0.2);
      if (this.pressureT > 0) this.pressureT -= dt;

      // run current attack plan
      if (this.plan) this.runPlan(dt, dist, R);

      // movement intent
      this.modeT -= dt;
      this.decideT -= dt;
      if (this.decideT <= 0 && !this.plan) { this.decide(dist, R); this.decideT = this.D.decide * U.rand(0.7, 1.3); }

      let mx = 0, mz = 0;
      if (this.plan) {
        // close in for the plan
        const need = this.plan.range;
        if (dist > need) { mx = toT.x; mz = toT.z; c.sprint = dist > 6; }
      } else if (this.mode === 'approach') {
        mx = toT.x; mz = toT.z; c.sprint = dist > 8 && this.A.aggr > 0.5;
        if (dist < R.ideal) this.mode = 'strafe';
      } else if (this.mode === 'strafe' || this.mode === 'guard') {
        // circle around the target and correct radial distance
        const px = -toT.z * this.strafeDir, pz = toT.x * this.strafeDir;
        const radial = U.clamp((dist - R.ideal) * 0.7, -1, 1);
        mx = px * (0.55 + this.A.strafe * 0.45) + toT.x * radial;
        mz = pz * (0.55 + this.A.strafe * 0.45) + toT.z * radial;
        if (this.mode === 'guard') { mx *= 0.6; mz *= 0.6; }
      } else if (this.mode === 'retreat') {
        mx = -toT.x; mz = -toT.z;
        const px = -toT.z * this.strafeDir, pz = toT.x * this.strafeDir;
        mx += px * 0.6; mz += pz * 0.6;
        if (dist > R.max + 1) this.mode = 'strafe';
      } else if (this.mode === 'flank') {
        // move to the target's back side
        t.fwd(_b);
        const bx = t.pos.x - _b.x * 2.2 - f.pos.x, bz = t.pos.z - _b.z * 2.2 - f.pos.z;
        const l = Math.hypot(bx, bz) || 1;
        mx = bx / l; mz = bz / l; c.sprint = l > 3;
        if (l < 1) this.mode = 'strafe';
      }
      // separation from allies
      for (const o of this.match.fighters) {
        if (o === f || o.team !== f.team || o.dead) continue;
        const ox = f.pos.x - o.pos.x, oz = f.pos.z - o.pos.z, d = Math.hypot(ox, oz);
        if (d < 2.2 && d > 0.01) { mx += (ox / d) * (2.2 - d) * 0.8; mz += (oz / d) * (2.2 - d) * 0.8; }
      }
      // obstacle steering
      if (G.arena && G.arena.obstacles.length) {
        for (const o of G.arena.obstacles) {
          const ox = f.pos.x - o.x, oz = f.pos.z - o.z, d = Math.hypot(ox, oz);
          const near = o.r + 1.6;
          if (d < near) {
            const k = (near - d) / near;
            mx += (ox / d) * k * 1.5 + (-oz / d) * k * this.strafeDir;
            mz += (oz / d) * k * 1.5 + (ox / d) * k * this.strafeDir;
          }
        }
      }
      // wall avoidance (steer back toward centre)
      const A = G.arena.def;
      const edge = Math.hypot(f.pos.x, f.pos.z) / A.size;
      if (edge > 0.82) { mx -= f.pos.x / A.size * (edge - 0.82) * 6; mz -= f.pos.z / A.size * (edge - 0.82) * 6; if (this.mode === 'retreat') this.mode = 'strafe'; }
      // stuck detection
      this.stuckT += dt;
      if (this.stuckT > 0.8) {
        const moved = f.pos.distanceTo(this.lastPos);
        const wanted = Math.hypot(mx, mz) > 0.4 && f.state === 'free';
        if (wanted && moved < 0.35) {
          this.unstickT = 0.9; this.strafeDir *= -1;
          const ang = Math.atan2(mx, mz) + (Math.PI / 2) * this.strafeDir;
          this.unstickDir.set(Math.sin(ang), 0, Math.cos(ang));
        }
        this.stuckT = 0; this.lastPos.copy(f.pos);
      }
      if (this.unstickT > 0) { this.unstickT -= dt; mx = this.unstickDir.x; mz = this.unstickDir.z; }
      const l = Math.hypot(mx, mz);
      if (l > 1) { mx /= l; mz /= l; }
      c.mx = mx; c.mz = mz;
      if (this.dodgeNow) {
        // sidestep relative to the attacker, slightly backward
        this.dodgeNow = false;
        const s = this.dodgeSide || 1;
        c.mx = -toT.z * s - toT.x * 0.4; c.mz = toT.x * s - toT.z * 0.4;
      }
      if (c.block) { c.sprint = false; }
      return c;
    }

    idleWander(dt, c) {
      this.modeT -= dt;
      if (this.modeT <= 0) { this.modeT = U.rand(1.5, 3); this.wander = U.chance(0.5) ? null : G.randomPoint(4); }
      if (this.wander) {
        const dx = this.wander.x - this.f.pos.x, dz = this.wander.z - this.f.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.5) { c.mx = dx / d * 0.5; c.mz = dz / d * 0.5; }
      }
    }

    tokensInUse() {
      let n = 0;
      for (const o of this.match.fighters) if (o.ai && o.team === this.f.team && !o.dead && o.ai.hasToken) n++;
      return n;
    }
    acquireToken() {
      if (this.hasToken) return true;
      if (this.tokensInUse() < this.D.tokens + (this.f.boss ? 1 : 0)) { this.hasToken = true; return true; }
      return false;
    }
    releaseToken() { this.hasToken = false; }

    decide(dist, R) {
      const f = this.f, t = f.target, A = this.A, D = this.D;
      if (f.state !== 'free') return;
      // punish openings
      const tRecover = t.state === 'attack' && t.move && t.move.hits && t.moveT > t.move.hits[t.move.hits.length - 1].t[1] + 0.05;
      const tOpen = t.state === 'stun' || tRecover;
      if (tOpen && dist < R.max + 1.2 && U.chance(A.punish * D.def)) { this.startPlan(this.makePlan(dist, R, true)); return; }
      // use skill
      if (f.cd.skill <= 0 && U.chance(A.skill * D.variety * 0.5) && this.skillUseful(dist)) { this.startPlan({ steps: ['skill'], range: this.skillRange() }); return; }
      // elite momentum finisher
      if (f.momentum >= 100 && dist < 4 && U.chance(0.6)) { this.startPlan({ steps: ['mom'], range: 3 }); return; }
      const aggr = A.aggr * D.aggr;
      if (dist <= R.max + 2.5 && U.chance(aggr) && this.acquireToken()) { this.startPlan(this.makePlan(dist, R, false)); return; }
      // positioning
      const r = Math.random();
      if (A.kite && dist < R.min) { this.mode = 'retreat'; }
      else if (A.flank && r < 0.35) { this.mode = 'flank'; }
      else if (dist > R.max + 2) { this.mode = 'approach'; }
      else if (r < A.block * D.def * 0.6) { this.mode = 'guard'; this.blockUntil = this.time + U.rand(0.5, 1.2); }
      else { this.mode = 'strafe'; if (U.chance(0.3)) this.strafeDir *= -1; }
      // mobile fighters dash reposition
      if (A.flank && U.chance(0.25) && f.dodges > 1) this.pressed.push('dodge');
    }

    skillUseful(dist) {
      const fam = this.f.family;
      if (fam === 'katana') return dist > 2 && dist < 7;
      if (fam === 'spear') return dist > 3 && dist < 8;
      if (fam === 'daggers') return dist < 8;
      if (fam === 'rifle') return dist > 3 && dist < 11;
      if (fam === 'hammer') return dist < 6;
      if (fam === 'gauntlets') return dist < 2.5 && this.f.target.state === 'attack';
      return false;
    }
    skillRange() {
      const fam = this.f.family;
      return { katana: 6.5, spear: 7.5, daggers: 8, rifle: 11, hammer: 5, gauntlets: 2.5 }[fam] || 3;
    }

    makePlan(dist, R, punish) {
      const A = this.A, D = this.D, W = this.f.W;
      let n = U.randi(A.combo[0], A.combo[1]);
      if (punish) n = Math.max(2, n);
      const steps = [];
      const adaptHeavy = A.adapt ? (this.adapt.parry + this.adapt.dodge * 0.3) / this.adapt.total : 0;
      if (W.heat) {
        for (let i = 0; i < n + 1; i++) steps.push('light');
        if (U.chance(0.35 * D.variety)) steps.push('heavy');
        return { steps, range: R.max, gap: 0 };
      }
      const r = Math.random();
      if (r < 0.18 * D.variety + adaptHeavy * 0.5) steps.push('heavy');
      else {
        for (let i = 0; i < n; i++) steps.push('light');
        if (U.chance(0.35 * D.variety + adaptHeavy)) steps.push('heavy');
      }
      // varied timing to catch dodge-happy players
      const gap = A.adapt && this.adapt.dodge / this.adapt.total > 0.3 ? U.rand(0.1, 0.3) : 0;
      return { steps, range: Math.min(R.max, W.moves.l1 && W.moves.l1.hits ? W.moves.l1.hits[0].range * 0.85 : 2), gap };
    }

    startPlan(p) {
      this.plan = p; this.planStep = 0; this.planWait = 0;
      this.mode = 'approach';
    }

    runPlan(dt, dist, R) {
      const f = this.f, p = this.plan;
      if (f.state === 'stun' || f.dead) { this.endPlan(); return; }
      if (this.planWait > 0) { this.planWait -= dt; return; }
      if (this.planStep >= p.steps.length) {
        if (f.state !== 'attack') this.endPlan();
        return;
      }
      const ready = f.state === 'free' || (f.state === 'attack' && f.move && f.moveT >= (f.move.chainAt || f.move.dur) - 0.04);
      if (!ready) return;
      if (dist > p.range + 0.4 && this.planStep === 0) {
        // give up if it takes too long to reach
        p.chase = (p.chase || 0) + dt;
        if (p.chase > 2.5) this.endPlan();
        return;
      }
      if (this.planStep > 0 && dist > p.range + 1.6 && p.steps[this.planStep] !== 'skill') { this.endPlan(); return; }
      this.pressed.push(p.steps[this.planStep]);
      this.planStep++;
      if (p.gap && this.planStep < p.steps.length) this.planWait = p.gap;
    }

    endPlan() {
      this.plan = null;
      this.releaseToken();
      this.lastAttackEnd = this.time;
      this.mode = this.A.kite ? 'retreat' : 'strafe';
      this.decideT = this.D.decide * U.rand(0.6, 1.2) / Math.max(0.5, this.A.aggr * this.D.aggr);
    }

    /* ---------------- reactions ---------------- */
    onThreat(att, mv) {
      const f = this.f;
      if (f.dead || this.A.passive) return;
      if (f.state === 'attack' && !(f.move && f.move.counterStance)) return; // committed
      if (f.state === 'stun') return;
      if (att !== f.target && !(att.isPlayer)) return;
      const dist = SP.Combat.dist(att, f);
      const firstHit = Fighter.firstHitTime(mv) / att.atkSpeed();
      const isRanged = !!mv.proj;
      const reach = mv.hits && mv.hits[0] ? (mv.hits[0].aoe ? (mv.hits[0].aoe + (mv.hits[0].at || 0)) : mv.hits[0].range) + (mv.lunge ? Math.max(0, mv.lunge[2]) : 0) : 20;
      if (!isRanged && dist > reach + 1.2) return;
      const react = this.D.react * U.rand(0.85, 1.3);
      const D = this.D, A = this.A;
      let fat = Math.max(0.2, 1 - this.defFatigue);
      if (react > firstHit - 0.03) {
        // too fast to react: maybe a pre-emptive guard if defensive
        if (U.chance(A.block * D.def * 0.35 * fat)) this.reactions.push({ type: 'block', at: this.time + 0.02, until: this.time + firstHit + 0.3 });
        return;
      }
      const unblock = mv.hits && mv.hits.some((h) => h.unblock);
      let pParry = A.parry * D.def, pBlock = A.block * D.def, pDodge = A.dodge * D.def;
      if (A.adapt) {
        const lr = this.adapt.light / this.adapt.total, hr = this.adapt.heavy / this.adapt.total;
        pParry += lr * 0.35; pDodge += hr * 0.4;
      }
      if (isRanged) { pParry *= 0.4; pDodge *= 1.2; }
      if (unblock) { pBlock = 0; pParry = 0; pDodge = Math.max(pDodge, 0.35 * D.def); }
      pParry *= fat; pBlock *= fat; pDodge *= fat;
      const hitAt = this.time + firstHit;
      const r = Math.random();
      if (r < pParry) {
        const win = f.parryWindow();
        const at = Math.max(this.time + react, hitAt - win * U.rand(0.35, 0.8));
        this.reactions.push({ type: 'block', at, until: hitAt + 0.25 });
        this.blockUntil = Math.min(this.blockUntil, at - 0.001); // ensure a fresh press edge
        this.defFatigue += 0.3;
      } else if (r < pParry + pBlock) {
        const end = this.time + (mv.dur / att.atkSpeed()) + 0.1;
        this.reactions.push({ type: 'block', at: this.time + react, until: end });
        this.defFatigue += 0.15;
      } else if (r < pParry + pBlock + pDodge && f.dodges > 0) {
        const at = Math.max(this.time + react, hitAt - 0.14);
        this.reactions.push({ type: 'press', a: 'dodge', at });
        // dodge sideways relative to attacker
        this.dodgeSide = U.chance(0.5) ? 1 : -1;
        this.defFatigue += 0.25;
      }
    }

    onHit(att) {
      this.endPlan();
      this.pressureT = 1.5;
      const f = this.f;
      // anticipate the rest of the string: raise guard as soon as hitstun ends
      const g = this.A.block * this.D.def * Math.max(0.3, 1 - this.defFatigue * 0.5);
      if (!this.A.passive && !f.boss && Math.random() < g * 1.15) {
        this.blockUntil = Math.max(this.blockUntil, this.time + f.stunT + U.rand(0.45, 0.95));
        this.defFatigue += 0.12;
      }
      // escape with momentum if being comboed
      if (f.momentum >= 35 && f.comboTaken >= 4 && U.chance(0.25 * this.D.def * (this.A.adapt ? 2 : 1))) this.reactions.push({ type: 'press', a: 'mom', at: this.time + this.D.react });
      if (this.A.kite && U.chance(0.4)) this.mode = 'retreat';
    }
    onBlocked(att) {
      // punish after a blocked string
      if (U.chance(this.A.punish * this.D.def * 0.6) && !this.plan) {
        this.reactions.push({ type: 'block', at: this.time, until: this.time + 0.05 });
        this.startPlan({ steps: ['light', 'light'], range: this.range().max, gap: 0 });
        this.planWait = 0.15;
      }
    }
    onParried() { this.startPlan({ steps: ['light', 'light', 'heavy'], range: this.range().max + 0.5, gap: 0 }); }
    onGotParried() { this.endPlan(); }
    onGuardBreak() { this.endPlan(); }
    onPoiseBreak() {}
    onLanded() {}
    dispose() { if (this._onAct) { const l = SP.Bus.h.playerAction; const i = l.indexOf(this._onAct); if (i >= 0) l.splice(i, 1); } }
  }
  SP.Brain = Brain;

  /* =================================================================
     Bosses
     ================================================================= */
  const H = (t0, t1, o) => Object.assign({ t: [t0, t1], dmg: 10, range: 2.4, arc: 110, kb: 1.2, up: 0, stun: 0.32, guard: 10 }, o);
  SP.BOSS_MOVES = {
    warden: {
      wSlam: { name: 'Seismic Slam', dur: 1.5, armor: [0, 1.0], hits: [H(0.8, 0.9, { dmg: 26, aoe: 3.4, at: 1.8, kb: 6, stun: 0.7, guard: 40, fx: 'quake' })], anim: { w: 'hOverW', s: 'hOverS' }, special: 'wardenRing' },
      wCharge: { name: 'Bulwark Charge', dur: 1.7, armor: [0, 1.3], lunge: [0.55, 1.15, 10], hits: [H(0.55, 1.15, { dmg: 26, range: 2.2, arc: 140, kb: 9, stun: 0.8, guard: 60, unblock: true })], anim: { w: 'blockP', s: 'blockP' } },
      wSweep: { name: 'Iron Sweep', dur: 1.05, armor: [0, 0.6], hits: [H(0.5, 0.64, { dmg: 22, range: 3.8, arc: 220, kb: 5, stun: 0.6, guard: 35 })], anim: { w: 'hWindR', s: 'hSwingR' } },
    },
    phantom: {
      pVolley: { name: 'Kunai Volley', dur: 0.6, proj: [{ t: 0.22, kind: 'kunai', dmg: 8, speed: 30, spread: -0.22 }, { t: 0.24, kind: 'kunai', dmg: 8, speed: 30, spread: 0 }, { t: 0.26, kind: 'kunai', dmg: 8, speed: 30, spread: 0.22 }], anim: { w: 'throwW', s: 'throwS' } },
      pAmbush: { name: 'Ambush', dur: 0.62, hits: [H(0.12, 0.2, { dmg: 16, range: 2.0, arc: 160, kb: 2.5, stun: 0.55, guard: 14 })], anim: { w: 'dCrossW', s: 'dCrossS' } },
    },
    archon: {
      aBurst: { name: 'Photon Burst', dur: 0.8, mobile: 0.3, proj: [0.25, 0.37, 0.49].map((t) => ({ t, kind: 'bolt', dmg: 9, speed: 32 })), anim: { w: 'rAim', s: 'rRecoil' } },
      aOrbs: { name: 'Seeker Orbs', dur: 0.9, proj: [{ t: 0.4, kind: 'bolt', dmg: 12, speed: 11, homing: 1.4 }, { t: 0.5, kind: 'bolt', dmg: 12, speed: 11, homing: 1.4, spread: 0.6 }, { t: 0.6, kind: 'bolt', dmg: 12, speed: 11, homing: 1.4, spread: -0.6 }], anim: { w: 'throwW', s: 'throwS' } },
      aNova: { name: 'Phase Nova', dur: 1.0, invuln: [0, 0.9], armor: [0, 1], hits: [H(0.55, 0.62, { dmg: 14, aoe: 6, at: 0, kb: 10, up: 3, stun: 0.6, guard: 30, unblock: true, fx: 'nova' })], anim: { w: 'stompW', s: 'stompS' } },
    },
  };

  function bossWeapon(fam, bossId) {
    const base = SP.WEAPONS[fam];
    return Object.assign({}, base, { moves: Object.assign({}, base.moves, SP.BOSS_MOVES[bossId]) });
  }
  SP.bossWeapon = bossWeapon;

  class BossBrain extends Brain {
    constructor(f, def, diff, match) {
      super(f, Object.assign({}, SP.ARCHETYPES.elite, { aggr: 0.85, block: 0.35, parry: 0.25, dodge: 0.3, combo: [2, 4], punish: 0.8, skill: 0.6 }), diff, match);
      this.B = def;
      this.phase = 1;
      this.specialT = U.rand(3, 5);
      this.f.W = bossWeapon(def.weapon, def.id);
      if (def.id === 'warden') { this.A = Object.assign({}, this.A, { dodge: 0.02, parry: 0.1, block: 0.6, strafe: 0.2, aggr: 0.75 }); }
      if (def.id === 'phantom') { this.A = Object.assign({}, this.A, { dodge: 0.55, parry: 0.15, block: 0.15, flank: true, strafe: 0.9, aggr: 0.85 }); }
      this.decoys = [];
      this.pending = [];
    }

    update(dt) {
      const f = this.f;
      // pending timed actions
      for (let i = this.pending.length - 1; i >= 0; i--) {
        const p = this.pending[i];
        p.t -= dt;
        if (p.t <= 0) { this.pending.splice(i, 1); if (!f.dead) p.fn(); }
      }
      this.checkPhase();
      // warden keeps shield up when not attacking
      if (this.B.id === 'warden') f.shieldUp = f.state === 'free' && !f.dead;
      if (f.state === 'attack' && f.move && f.move.special === 'wardenRing' && !f.moveFlags.ring && f.moveT >= f.move.hits[0].t[0]) {
        f.moveFlags.ring = true;
        const n = this.phase >= 2 ? 2 : 1;
        f.fwd(_a);
        const c = f.pos.clone().addScaledVector(_a, 1.8);
        for (let i = 0; i < n; i++) SP.Combat.hazard({ kind: 'ring', pos: c.clone(), r0: 1, r1: 15, speed: 9, delay: i * 0.55, dmg: 18, owner: f, team: f.team, color: '#ff8a3d', kb: 4, stun: 0.6 });
      }
      this.specialT -= dt;
      if (this.specialT <= 0 && f.state === 'free' && !this.plan && f.target) {
        this.useSpecial();
      }
      return super.update(dt);
    }

    checkPhase() {
      const f = this.f;
      const r = f.hp / f.maxHp;
      const want = this.B.id === 'archon' ? (r < 0.34 ? 3 : r < 0.67 ? 2 : 1) : (r < 0.5 ? 2 : 1);
      if (want > this.phase && !f.dead) {
        this.phase = want;
        SP.HUD.bossPhase(this.B.name, this.phase);
        SP.Audio.play('bossWarn');
        f.buffs.invuln = 1.2;
        f.endMove(); f.state = 'free';
        f.startMove('aNova' in f.W.moves ? 'aNova' : (f.W.moves.ext ? 'ext' : 'heavy'), this.match, true);
        G.FX.ring(f.pos, 7, this.B.color, 0.6);
        if (this.B.id === 'warden') { f.st.atkMult = (f.st.atkMult || 1) * 1.15; }
        if (this.B.id === 'phantom') { f.st.atkMult = (f.st.atkMult || 1) * 1.15; this.A = Object.assign({}, this.A, { aggr: 1 }); }
        if (this.B.id === 'archon') {
          const fam = this.phase === 2 ? 'katana' : 'hammer';
          this.pending.push({ t: 1.05, fn: () => this.swapWeapon(fam) });
        }
      }
    }

    swapWeapon(fam) {
      const f = this.f;
      f.family = fam;
      f.W = bossWeapon(fam, 'archon');
      f.model.setWeapon(fam);
      f.trail.setColor(this.B.color);
      SP.HUD.popup(f.chest(_a), SP.WEAPONS[fam].name.toUpperCase(), 'break');
    }

    useSpecial() {
      const f = this.f, t = f.target, id = this.B.id;
      const dist = SP.Combat.dist(f, t);
      if (id === 'warden') {
        const r = Math.random();
        if (dist > 6 && r < 0.55) { this.telegraphRed(); f.startMove('wCharge', this.match); }
        else if (dist < 6 && r < 0.6) f.startMove('wSlam', this.match);
        else if (dist < 4.5) f.startMove('wSweep', this.match);
        else if (this.phase >= 2) this.quakeBarrage(3);
        else f.startMove('wSlam', this.match);
        this.specialT = (this.phase >= 2 ? 3.2 : 4.5) * U.rand(0.8, 1.2) * (this.D.decide / 0.38) ** 0.5;
      } else if (id === 'phantom') {
        const r = Math.random();
        const alive = this.decoys.filter((d) => !d.dead).length;
        if (alive === 0 && r < 0.3) this.spawnDecoys(this.phase >= 2 ? 3 : 2);
        else if (r < 0.65) this.ambush();
        else { f.startMove('pVolley', this.match); }
        this.specialT = (this.phase >= 2 ? 2.8 : 3.8) * U.rand(0.8, 1.2) * (this.D.decide / 0.38) ** 0.5;
      } else if (id === 'archon') {
        const r = Math.random();
        if (this.phase === 1) { if (r < 0.6) f.startMove('aBurst', this.match); else this.orbital(2); }
        else if (this.phase === 2) { if (r < 0.6) this.orbital(4); else f.startMove('aBurst', this.match); }
        else { if (r < 0.4) f.startMove('aOrbs', this.match); else if (r < 0.75) this.orbital(5); else f.startMove('aBurst', this.match); }
        this.specialT = (4.2 - this.phase * 0.6) * U.rand(0.8, 1.2) * (this.D.decide / 0.38) ** 0.5;
      }
    }

    telegraphRed() {
      const p = this.f.chest(_a);
      G.FX.flash(p, 2.2, '#ff2a3d', 0.5);
      SP.Audio.play('warn');
    }

    quakeBarrage(n) {
      const f = this.f, t = f.target;
      SP.Audio.play('warn');
      for (let i = 0; i < n; i++) {
        this.pending.push({ t: i * 0.35, fn: () => {
          const p = t.pos.clone(); p.x += U.rand(-1.5, 1.5); p.z += U.rand(-1.5, 1.5); p.y = 0;
          SP.Combat.hazard({ kind: 'circle', pos: p, r: 2.6, delay: 1.0, dmg: 20, owner: f, team: f.team, color: '#ff8a3d', kb: 5, up: 4 });
        } });
      }
      f.startMove('ext', this.match);
    }

    orbital(n) {
      const f = this.f, t = f.target;
      SP.Audio.play('warn');
      SP.HUD.popup(f.chest(_a), 'ORBITAL STRIKE', 'break');
      for (let i = 0; i < n; i++) {
        this.pending.push({ t: i * 0.28, fn: () => {
          const lead = t.vel.clone().multiplyScalar(0.6);
          const p = t.pos.clone().add(lead); p.x += U.rand(-1.2, 1.2) * (i ? 1 : 0); p.z += U.rand(-1.2, 1.2) * (i ? 1 : 0); p.y = 0;
          G.clampToArena(p, 1);
          SP.Combat.hazard({ kind: 'circle', pos: p, r: 2.2, delay: 1.15, dmg: 22, owner: f, team: f.team, color: '#ffffff', kb: 4, up: 3 });
        } });
      }
    }

    ambush() {
      const f = this.f, t = f.target;
      // marker where Phantom will appear (behind the player)
      t.fwd(_a);
      const p = t.pos.clone().addScaledVector(_a, -1.4); p.y = 0;
      G.clampToArena(p, 1);
      const dec = G.FX.decal(p, 0.9, '#ff5cf0');
      const delay = this.phase >= 2 ? 0.5 : 0.65;
      let tt = 0;
      const tick = { t: 0, fn: null };
      const step = () => {
        tt += 0.05;
        G.FX.decalProgress(dec, Math.min(1, tt / delay));
        if (tt < delay) this.pending.push({ t: 0.05, fn: step });
        else {
          G.FX.freeDecal(dec);
          if (f.state === 'stun' || f.dead) return;
          f.blinkTo(p.x, p.z, t);
          f.startMove('pAmbush', this.match, true);
        }
      };
      this.pending.push({ t: 0.05, fn: step });
      SP.Audio.play('blink');
      f.buffs.invuln = Math.max(f.buffs.invuln, delay);
      void tick;
    }

    spawnDecoys(n) {
      const f = this.f;
      SP.HUD.popup(f.chest(_a), 'HOLOGRAPHIC SPLIT', 'break');
      SP.Audio.play('blink');
      for (let i = 0; i < n; i++) {
        const ang = f.yaw + (i - (n - 1) / 2) * 1.6;
        const d = this.match.spawnEnemyDecoy(f, f.pos.x + Math.sin(ang) * 2.5, f.pos.z + Math.cos(ang) * 2.5);
        this.decoys.push(d);
      }
      // the real one repositions
      f.blinkTo(f.pos.x + U.rand(-3, 3), f.pos.z + U.rand(-3, 3), f.target);
    }
  }
  SP.BossBrain = BossBrain;
})();
