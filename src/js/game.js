/* SHATTERPOINT — game loop, camera, matches, modes and rewards */
'use strict';
(function () {
  const U = SP.U;
  const G = SP.G;
  const $ = (id) => document.getElementById(id);
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

  const Game = {
    state: 'boot', match: null, timeScale: 1, slowT: 0, slowScale: 1, shakeAmt: 0,
    cam: { yaw: Math.PI, pitch: 0.3, dist: 6.2, pos: new THREE.Vector3(0, 3, -6), look: new THREE.Vector3(), manualT: 0 },
    preview: { yaw: 0.4, zoom: 1, model: null, dirty: true },
    last: 0, fpsT: 0, fpsN: 0, fps: 0, time: 0,
  };
  SP.Game = Game;

  /* environment attacker for arena hazards */
  Game.env = {
    st: { dmgMult: 1, power: 1 }, o: { weaponColor: '#ff8a3d', appearance: { colors: { accent: '#ff8a3d' } } },
    buffs: { counter: 0 }, W: { counterMult: 1 }, hitCount: 0, lastMoves: [], isPlayer: false, freeze: 0, time: 0,
    pos: new THREE.Vector3(), team: -1, family: '', momentum: 0, scale: 1, decoy: true,
  };

  Game.init = function () {
    Game.last = performance.now();
    requestAnimationFrame(Game.frame);
  };

  Game.frame = function (now) {
    requestAnimationFrame(Game.frame);
    let rdt = (now - Game.last) / 1000;
    Game.last = now;
    if (!(rdt > 0)) rdt = 0.016;
    rdt = Math.min(rdt, 0.05);
    Game.time += rdt;
    // fps
    Game.fpsT += rdt; Game.fpsN++;
    if (Game.fpsT >= 0.5) { Game.fps = Math.round(Game.fpsN / Game.fpsT); Game.fpsT = 0; Game.fpsN = 0; const f = $('fps'); if (f) { f.hidden = !SP.Save.data.settings.showFps; f.textContent = Game.fps + ' FPS'; } }
    G.trackFps(rdt);
    try {
      Game.step(rdt);
    } catch (err) {
      console.error(err);
      if (!Game.reported) { Game.reported = true; SP.UI && SP.UI.toast('Something went wrong: ' + err.message); }
    }
    G.render();
  };

  Game.step = function (rdt) {
    // slow motion
    if (Game.slowT > 0) { Game.slowT -= rdt; Game.timeScale = U.damp(Game.timeScale, Game.slowScale, 20, rdt); }
    else Game.timeScale = U.damp(Game.timeScale, 1, 10, rdt);
    if (Game.state === 'playing') {
      const dt = rdt * Game.timeScale;
      const inp = SP.Input.sample(rdt);
      Game.match.update(dt, inp, rdt);
      Game.updateCamera(rdt, inp);
      G.updateArena(dt, Game.time);
      G.FX.update(dt);
      SP.HUD.update(rdt, Game.match);
    } else if (Game.state === 'paused' || Game.state === 'results') {
      G.updateArena(rdt * 0.2, Game.time);
      if (Game.state === 'results' && Game.match) {
        // keep the scene alive in the background
        for (const f of Game.match.fighters) f.syncModel(rdt);
        G.FX.update(rdt);
      }
    } else {
      // menus: animate preview model on stage
      G.updateStage(rdt);
      Game.updatePreview(rdt);
      G.FX.update(rdt);
    }
  };

  Game.slowmo = function (scale, dur) { Game.slowScale = Math.min(scale, Game.slowT > 0 ? Game.slowScale : 1); Game.slowT = Math.max(Game.slowT, dur); };
  Game.shake = function (a) { if (SP.Save.data.settings.screenShake) Game.shakeAmt = Math.min(0.6, Math.max(Game.shakeAmt, a)); };

  /* ---------------- camera ---------------- */
  Game.updateCamera = function (dt, inp) {
    const m = Game.match, p = m.player, cam = Game.cam, S = SP.Save.data.settings;
    const sens = S.camSens;
    if (Math.abs(inp.camDX) + Math.abs(inp.camDY) > 0.0005) cam.manualT = 0.6;
    cam.manualT -= dt;
    cam.yaw -= inp.camDX * sens;
    cam.pitch += inp.camDY * sens * (S.invertY ? -1 : 1);
    if (inp.zoom) S.camDist = U.clamp(S.camDist + inp.zoom * 0.4, 3.5, 10);
    const lt = p.lockTarget && !p.lockTarget.dead ? p.lockTarget : null;
    if (lt) {
      const desired = Math.atan2(lt.pos.x - p.pos.x, lt.pos.z - p.pos.z);
      const k = cam.manualT > 0 ? 1.5 : 6;
      cam.yaw = U.dampAngle(cam.yaw, desired, k, dt);
      if (cam.manualT <= 0) cam.pitch = U.damp(cam.pitch, 0.26 + (lt.boss ? 0.08 : 0), 3, dt);
    }
    cam.pitch = U.clamp(cam.pitch, -0.2, 1.05);
    const dist = S.camDist * (G.camera.aspect < 1 ? 1.25 : 1) * (lt && lt.boss ? 1.15 : 1);
    const tgt = _a.set(p.pos.x, p.pos.y * 0.7 + 1.45 * p.scale, p.pos.z);
    const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    // over-the-shoulder offset keeps the opponent visible beside the player
    const sh = 0.55;
    const rx = -fz, rz = fx; // camera right vector (char's right when facing away)
    const want = _b.set(tgt.x - fx * dist * cp + rx * sh, tgt.y + dist * sp, tgt.z - fz * dist * cp + rz * sh);
    // obstacle occlusion: pull camera in front of pillars
    let blocked = G.segmentBlocked(tgt, want);
    if (blocked) {
      for (let i = 9; i >= 1; i--) {
        _c.lerpVectors(tgt, want, i / 10);
        if (!G.segmentBlocked(tgt, _c)) { want.copy(_c); break; }
      }
    }
    // keep inside walls
    const A = G.arena.def;
    if (A.shape !== 'octagon') G.clampToArena(want, -0.35);
    want.y = Math.max(0.5, want.y);
    cam.pos.x = U.damp(cam.pos.x, want.x, 16, dt); cam.pos.y = U.damp(cam.pos.y, want.y, 16, dt); cam.pos.z = U.damp(cam.pos.z, want.z, 16, dt);
    G.camera.position.copy(cam.pos);
    // look point (bias toward lock target)
    const look = cam.look;
    _c.copy(tgt); _c.x += rx * sh; _c.z += rz * sh;
    if (lt) { _c.x += (lt.pos.x - p.pos.x) * 0.15; _c.z += (lt.pos.z - p.pos.z) * 0.15; _c.y += 0.05; }
    look.x = U.damp(look.x, _c.x, 20, dt); look.y = U.damp(look.y, _c.y, 20, dt); look.z = U.damp(look.z, _c.z, 20, dt);
    G.camera.lookAt(look);
    if (Game.shakeAmt > 0.001) {
      const s = Game.shakeAmt * 0.12;
      G.camera.position.x += (Math.random() - 0.5) * s; G.camera.position.y += (Math.random() - 0.5) * s;
      G.camera.rotation.z += (Math.random() - 0.5) * s * 0.3;
      Game.shakeAmt *= Math.exp(-9 * dt);
    }
    // sun follows the player for shadow coverage
    G.sun.position.set(p.pos.x + 8, 18, p.pos.z + 6); G.sun.target.position.set(p.pos.x, 0, p.pos.z);
  };

  Game.toggleLock = function () {
    const m = Game.match; if (!m) return;
    const p = m.player;
    if (p.lockTarget) { p.lockTarget = null; return; }
    p.lockTarget = Game.bestLockTarget();
  };
  Game.bestLockTarget = function (exclude) {
    const m = Game.match, p = m.player, cam = Game.cam;
    let best = null, bs = 1e9;
    for (const e of m.enemiesOf(p)) {
      if (e.dead || e === exclude || (e.decoy && !e.boss)) continue;
      const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      if (d > 30) continue;
      const ang = Math.abs(U.angDiff(cam.yaw, Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z)));
      const s = d * 0.4 + ang * 6;
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  };

  /* ---------------- menu preview ---------------- */
  Game.updatePreview = function (dt) {
    const pv = Game.preview;
    if (pv.dirty) Game.rebuildPreview();
    if (pv.model) {
      if (!pv.dragging) pv.yaw += dt * (pv.spin ? 0.35 : 0);
      pv.model.root.rotation.y = pv.yaw;
      pv.anim.update(dt, { speed: 0, grounded: true });
    }
    const z = pv.zoom;
    const tx = pv.offsetX || 0;
    const camY = U.lerp(1.15, 1.55, U.clamp((z - 1) / 1.4, 0, 1));
    const want = _a.set(tx * 1.0, camY + 0.2 / z, 4.6 / z);
    G.camera.position.lerp(want, 1 - Math.exp(-8 * dt));
    G.camera.lookAt(tx * 1.0, camY - 0.05, 0);
  };
  Game.rebuildPreview = function () {
    const pv = Game.preview;
    if (pv.model) G.stageRoot.remove(pv.model.root);
    const s = SP.Save.data;
    const lo = SP.Items.loadout(s);
    pv.model = new SP.Model({ appearance: s.appearance, weapon: lo.family, weaponColor: Game.variantColor(lo.family) });
    pv.model.root.traverse((o) => { if (o.isMesh) o.castShadow = G.quality === 'high'; });
    pv.anim = new SP.Animator(pv.model);
    G.stageRoot.add(pv.model.root);
    pv.dirty = false;
  };
  Game.variantColor = function (fam) {
    const v = (SP.Save.data.weaponVariant || {})[fam];
    if (v === 'prism') return '#e8f6ff';
    if (v === 'gold') return '#ffbf3d';
    return null;
  };

  Game.showMenuScene = function () {
    G.clearArena();
    G.stageRoot.visible = true;
    G.scene.fog.color.set('#05060a'); G.scene.fog.near = 12; G.scene.fog.far = 40;
    G.renderer.setClearColor('#05060a', 1);
    G.sun.position.set(4, 10, 6); G.sun.target.position.set(0, 0, 0);
    G.hemi.intensity = 0.75;
    Game.preview.dirty = true;
  };

  /* ---------------- state changes ---------------- */
  Game.start = function (cfg) {
    SP.Audio.init();
    if (Game.match) Game.match.dispose();
    G.stageRoot.visible = false;
    if (Game.preview.model) { G.stageRoot.remove(Game.preview.model.root); Game.preview.model = null; Game.preview.dirty = true; }
    G.FX.clear();
    G.buildArena(cfg.arena);
    Game.match = new Match(cfg);
    Game.cam.yaw = Game.match.player.yaw; Game.cam.pitch = 0.3; Game.cam.manualT = 0;
    const p = Game.match.player;
    Game.cam.pos.set(p.pos.x - Math.sin(p.yaw) * 6, 3, p.pos.z - Math.cos(p.yaw) * 6);
    Game.cam.look.set(p.pos.x, 1.4, p.pos.z);
    SP.HUD.reset(Game.match);
    SP.UI.showGame();
    Game.state = 'playing';
    SP.Input.setActive(true);
    SP.HUD.banner(cfg.title || 'FIGHT', cfg.subtitle || '');
    Game.timeScale = 1; Game.slowT = 0;
  };

  Game.pause = function () {
    if (Game.state !== 'playing') return;
    Game.state = 'paused';
    SP.Input.setActive(false);
    SP.UI.showPause();
  };
  Game.resume = function () {
    if (Game.state !== 'paused') return;
    Game.state = 'playing';
    SP.UI.showGame();
    SP.Input.setActive(true);
  };
  Game.restart = function () {
    const cfg = Game.match.cfg;
    Game.start(cfg);
  };
  Game.quitToMenu = function () {
    if (Game.match) { Game.match.dispose(); Game.match = null; }
    SP.Input.setActive(false);
    Game.state = 'menu';
    Game.showMenuScene();
  };

  /* =================================================================
     Match
     ================================================================= */
  class Match {
    constructor(cfg) {
      this.cfg = cfg;
      this.mode = cfg.mode;
      this.diff = SP.DIFFICULTY[cfg.difficulty || SP.Save.data.settings.difficulty] || SP.DIFFICULTY.normal;
      this.diffId = cfg.difficulty || SP.Save.data.settings.difficulty;
      this.tier = cfg.tier || 1;
      this.fighters = []; this.decoys = [];
      this.time = 0; this.waveIdx = -1; this.waveDelay = 0; this.ended = false; this.endT = 0;
      this.lowgrav = cfg.modifier === 'lowgrav';
      this.stats = { dealt: 0, taken: 0, parries: 0, counters: 0, perfects: 0, finishers: 0, heals: 0, overheats: 0, kills: 0, maxCombo: 0, combo: 0, comboT: 0, wavesCleared: 0, score: 0 };
      this.ventT = 4;
      this.spawnPlayer();
      if (this.mode === 'survival') this.waves = [];
      else this.waves = cfg.waves;
      this.nextWave(true);
    }

    spawnPlayer() {
      const s = SP.Save.data;
      const lo = SP.Items.loadout(s, this.cfg.weapon);
      this.loadout = lo;
      const W = SP.WEAPONS[lo.family];
      const st = {
        maxHp: lo.hp, def: lo.def, dmgMult: 1, power: lo.power, guardMax: W.guardMax + lo.guardBonus,
        speed: lo.speed, cdr: lo.cdr, momentumGain: lo.momentumGain, dodgeRecharge: lo.dodgeRecharge,
        mods: lo.mods, wstats: lo.wstats, mastery: lo.mastery,
      };
      const A = G.arena.def;
      const p = new SP.Fighter({ team: 0, isPlayer: true, name: s.name, appearance: s.appearance, family: lo.family, stats: st, x: 0, z: -A.size * 0.45, yaw: 0, abilities: lo.abilities, weaponColor: Game.variantColor(lo.family) });
      p.lockTarget = null;
      this.player = p;
      this.fighters.push(p);
    }

    enemyAppearance(arch, color) {
      const pickStyle = (slot) => U.pick(SP.STYLES[slot].map((x) => x.id));
      return {
        face: U.randi(0, 4), skin: U.randi(0, 7), hairStyle: U.randi(0, 6), hairColor: U.randi(0, 9), eyeColor: U.randi(0, 6),
        height: U.rand(0.95, 1.06), build: arch && arch.id === 'heavy' ? 1.25 : U.rand(0.9, 1.1), shoulders: U.rand(0.95, 1.12),
        styles: { head: U.pick(['visor', 'helm', 'mask', 'hood', 'band', 'crest']), torso: pickStyle('torso'), arms: pickStyle('arms'), legs: pickStyle('legs'), feet: pickStyle('feet') },
        colors: { primary: U.pick(['#15171f', '#1d1a22', '#20242e', '#1a1418']), secondary: U.pick(['#3a3f4d', '#59606e', '#2c2f38']), accent: color },
      };
    }

    makeEnemy(spec, x, z) {
      const D = this.diff;
      const atk = { easy: 0.86, normal: 0.94, hard: 1, nightmare: 1.04 }[this.diffId] || 0.94;
      const track = { easy: 3, normal: 4.5, hard: 6, nightmare: 8 }[this.diffId] || 4.5;
      let f;
      if (spec.boss) {
        const B = SP.BOSSES[spec.boss];
        const ap = {
          face: 2, skin: spec.boss === 'archon' ? 6 : 3, hairStyle: 0, hairColor: 0, eyeColor: spec.boss === 'phantom' ? 4 : 1, height: 1, build: spec.boss === 'warden' ? 1.3 : 1, shoulders: spec.boss === 'warden' ? 1.25 : 1,
          styles: spec.boss === 'warden' ? { head: 'helm', torso: 'plate', arms: 'plated', legs: 'plated', feet: 'greaves' }
            : spec.boss === 'phantom' ? { head: 'hood', torso: 'coat', arms: 'cyber', legs: 'sleek', feet: 'hover' }
              : { head: 'crest', torso: 'core', arms: 'cyber', legs: 'plated', feet: 'hover' },
          colors: spec.boss === 'warden' ? { primary: '#2a2119', secondary: '#5b4a3a', accent: B.color }
            : spec.boss === 'phantom' ? { primary: '#140f18', secondary: '#2b2033', accent: B.color }
              : { primary: '#e8ecf3', secondary: '#9aa3b2', accent: '#7fd0ff' },
        };
        const hpMult = (spec.hpMult || 1) * D.hp;
        const st = { maxHp: Math.round(B.hp * hpMult), def: 0, dmgMult: 0.8 * D.dmg * (spec.dmgMult || 1), power: 1, guardMax: spec.boss === 'warden' ? 220 : 140, speed: 0, poise: B.poise, mods: new Set(), wstats: {}, mastery: 1, atkMult: atk, trackRate: track, moveMult: spec.boss === 'warden' ? 0.85 : spec.boss === 'phantom' ? 1.15 : 1 };
        f = new SP.Fighter({ team: 1, name: B.name, boss: B.id, appearance: ap, family: B.weapon, stats: st, scale: B.scale, x, z, yaw: Math.PI, extra: spec.boss === 'warden' ? 'shield' : spec.boss === 'archon' ? 'core' : null, weaponColor: B.color === '#ffffff' ? '#7fd0ff' : B.color });
        new SP.BossBrain(f, B, D, this);
      } else {
        const A = SP.ARCHETYPES[spec.arch];
        const fam = spec.weapon || U.pick(A.weapons);
        const W = SP.WEAPONS[fam];
        const tierMul = 1 + 0.15 * (this.tier - 1);
        const st = {
          maxHp: Math.round(150 * A.hp * D.hp * tierMul * (spec.hpMult || 1)), def: 0, dmgMult: 0.85 * D.dmg * (1 + 0.08 * (this.tier - 1)) * (spec.dmgMult || 1), power: 1,
          guardMax: W.guardMax * (this.cfg.modifier === 'shielded' ? 1.5 : 1) * (A.id === 'defensive' ? 1.2 : 1), speed: 0, poise: A.poise || 0, mods: new Set(), wstats: {}, mastery: 1, atkMult: atk * (A.id === 'heavy' ? 0.95 : 1), trackRate: track,
          moveMult: A.id === 'mobile' ? 1.12 : A.id === 'heavy' ? 0.9 : 1,
        };
        if (A.id === 'drone') st.dmgMult = 0;
        f = new SP.Fighter({ team: 1, name: A.name, arch: A.id, appearance: this.enemyAppearance(A, A.color), family: fam, stats: st, scale: A.scale || 1, x, z, yaw: Math.PI, weaponColor: A.color });
        new SP.Brain(f, A, D, this);
      }
      this.fighters.push(f);
      return f;
    }

    spawnEnemyDecoy(boss, x, z) {
      const st = Object.assign({}, boss.st, { maxHp: 1, dmgMult: boss.st.dmgMult * 0.35, poise: 0 });
      const d = new SP.Fighter({ team: 1, name: boss.name, boss: boss.boss, decoy: true, holo: false, appearance: boss.o.appearance, family: boss.family, stats: st, scale: boss.scale, x, z, yaw: boss.yaw, weaponColor: boss.o.weaponColor });
      d.model.blob.visible = false; // the tell: decoys cast no shadow
      d.model.root.traverse((o) => { o.castShadow = false; });
      new SP.Brain(d, Object.assign({}, SP.ARCHETYPES.aggressive, { block: 0, parry: 0, dodge: 0.1 }), this.diff, this);
      d.life = 10;
      G.clampToArena(d.pos, 1);
      this.fighters.push(d);
      return d;
    }

    spawnDecoy(owner, dur, explode) {
      const st = { maxHp: 80, def: 0, dmgMult: 0, power: 1, guardMax: 50, speed: 0, mods: new Set(), wstats: {}, mastery: 1 };
      owner.fwd(_a);
      const d = new SP.Fighter({ team: owner.team, name: 'Decoy', decoy: true, appearance: owner.o.appearance, family: owner.family, stats: st, x: owner.pos.x - _a.x * 1.5, z: owner.pos.z - _a.z * 1.5, yaw: owner.yaw, holoColor: owner.o.appearance.colors.accent });
      d.buffs.decoyAggro = dur; d.life = dur; d.explode = explode;
      this.fighters.push(d);
      G.FX.ring(d.pos, 1.5, owner.o.appearance.colors.accent, 0.4);
    }

    enemiesOf(f) {
      const out = this._eo || (this._eo = []);
      out.length = 0;
      for (const o of this.fighters) if (o.team !== f.team && !o.removed) out.push(o);
      return out.slice();
    }
    nearestEnemy(f, r, arc) {
      let best = null, bd = r;
      for (const e of this.fighters) {
        if (e.team === f.team || e.dead || e.removed) continue;
        const d = SP.Combat.dist(f, e);
        if (d > bd) continue;
        if (arc < 360) { const ang = Math.abs(U.angDiff(f.yaw, Math.atan2(e.pos.x - f.pos.x, e.pos.z - f.pos.z))); if (ang > arc * Math.PI / 360) continue; }
        bd = d; best = e;
      }
      return best;
    }

    /* waves */
    genSurvivalWave(n) {
      const count = Math.min(4, 1 + Math.floor((n - 1) / 3));
      const pool = ['aggressive'];
      if (n >= 2) pool.push('defensive');
      if (n >= 3) pool.push('tactical');
      if (n >= 4) pool.push('mobile');
      if (n >= 5) pool.push('heavy');
      if (n >= 7) pool.push('elite');
      if (n % 10 === 0) {
        const b = ['warden', 'phantom', 'archon'][(n / 10 - 1) % 3];
        return [{ boss: b, hpMult: 0.6 + n * 0.01 }];
      }
      const w = [];
      for (let i = 0; i < count; i++) w.push({ arch: n % 5 === 0 && i === 0 ? 'elite' : U.pick(pool), hpMult: 1 + n * 0.03, dmgMult: 1 + n * 0.015 });
      return w;
    }
    nextWave(first) {
      this.waveIdx++;
      let wave;
      if (this.mode === 'survival') {
        wave = this.genSurvivalWave(this.waveIdx + 1);
        this.tier = Math.min(3, 1 + Math.floor((this.waveIdx + 1) / 6));
      } else wave = this.waves[this.waveIdx];
      if (!wave) return false;
      const n = wave.length;
      const A = G.arena.def;
      wave.forEach((spec, i) => {
        const ang = n === 1 ? 0 : (i / (n - 1) - 0.5) * 1.6;
        const r = A.size * 0.5;
        const x = Math.sin(ang) * r, z = Math.cos(ang) * r;
        const e = this.makeEnemy(spec, x, z);
        e.yaw = Math.atan2(this.player.pos.x - x, this.player.pos.z - z);
        G.FX.ring(e.pos, 1.6, e.o.weaponColor || '#ff4d4d', 0.5);
      });
      if (!first) {
        const label = this.mode === 'survival' ? 'WAVE ' + (this.waveIdx + 1) : this.mode === 'bossrush' ? SP.BOSSES[wave[0].boss].name : 'WAVE ' + (this.waveIdx + 1) + ' / ' + this.waves.length;
        SP.HUD.banner(label, wave[0].boss && this.mode !== 'bossrush' ? SP.BOSSES[wave[0].boss].title : '');
      }
      if (wave[0].boss) SP.Audio.play('bossWarn');
      if (SP.Save.data.settings.autoLock && !this.player.lockTarget) this.pendingLock = 0.6;
      return true;
    }

    aliveEnemies() { return this.fighters.filter((f) => f.team === 1 && !f.dead && !f.decoy); }

    onPlayerHit() {
      const s = this.stats;
      s.combo = s.comboT > 0 ? s.combo + 1 : 1;
      s.comboT = 1.6;
      s.maxCombo = Math.max(s.maxCombo, s.combo);
      SP.HUD.combo(s.combo);
    }

    onDeath(f, killer) {
      if (f.isPlayer) { this.endT = 1.8; this.pendingResult = false; return; }
      if (f.team === 1 && !f.decoy) {
        this.stats.kills++;
        this.stats.score += Math.round(100 * (f.boss ? 10 : (SP.ARCHETYPES[f.arch] || { hp: 1 }).hp) * this.tier);
        // boss death clears its decoys
        if (f.boss) for (const o of this.fighters) if (o.decoy && o.team === 1 && !o.dead) SP.Combat.kill(o, null);
      }
      if (f.decoy && f.team === 0 && f.explode) SP.Combat.areaDamage(f, f.pos, 3.2, 22, f.o.appearance.colors.accent);
      if (this.player.lockTarget === f) {
        this.player.lockTarget = SP.Save.data.settings.autoLock ? Game.bestLockTarget(f) : null;
      }
      f.removeAt = this.time + (f.decoy ? 0.4 : 2.4);
    }

    update(dt, inp, rdt) {
      this.time += dt;
      const p = this.player;
      Game.env.time = this.time;
      // camera-relative movement
      const yaw = Game.cam.yaw;
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      const ctrl = {
        mx: fx * inp.iy - fz * inp.ix, mz: fz * inp.iy + fx * inp.ix,
        sprint: inp.sprint, block: inp.block, pressed: inp.pressed,
      };
      if (this.ended) { ctrl.mx = ctrl.mz = 0; ctrl.pressed = []; ctrl.block = false; }
      if (this.pendingLock != null) {
        this.pendingLock -= dt;
        if (this.pendingLock <= 0) { this.pendingLock = null; if (!p.lockTarget) p.lockTarget = Game.bestLockTarget(); }
      }
      if (p.lockTarget && (p.lockTarget.dead || p.lockTarget.removed)) p.lockTarget = null;
      if (this.stats.comboT > 0) this.stats.comboT -= dt;
      // fighters
      for (const f of this.fighters) {
        if (f.removed) continue;
        let c = null;
        if (f.isPlayer) c = ctrl;
        else if (f.ai) c = this.ended && !f.dead ? { mx: 0, mz: 0, block: false, pressed: [] } : f.ai.update(dt);
        f.update(dt, c, this);
        if (f.life != null && !f.dead) { f.life -= dt; if (f.life <= 0) SP.Combat.kill(f, null); }
      }
      // fighter separation
      for (let i = 0; i < this.fighters.length; i++) {
        const a = this.fighters[i]; if (a.dead || a.removed) continue;
        for (let j = i + 1; j < this.fighters.length; j++) {
          const b = this.fighters[j]; if (b.dead || b.removed) continue;
          if (Math.abs(a.pos.y - b.pos.y) > 1.5) continue;
          const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), m = a.radius + b.radius;
          if (d < m && d > 1e-4) {
            const push = (m - d) / 2, nx = dx / d, nz = dz / d;
            const wa = b.boss ? 1.6 : 1, wb = a.boss ? 1.6 : 1;
            a.pos.x -= nx * push * wa; a.pos.z -= nz * push * wa; b.pos.x += nx * push * wb; b.pos.z += nz * push * wb;
          }
        }
      }
      SP.Combat.updateProjectiles(dt, this);
      SP.Combat.updateHazards(dt, this);
      // vents modifier
      if (this.cfg.modifier === 'vents' && !this.ended) {
        this.ventT -= dt;
        if (this.ventT <= 0) {
          this.ventT = U.rand(3.5, 5.5);
          for (let i = 0; i < 2; i++) {
            const pt = i === 0 ? p.pos.clone().add(_a.set(U.rand(-2, 2), 0, U.rand(-2, 2))) : G.randomPoint(3);
            pt.y = 0; G.clampToArena(pt, 1);
            SP.Combat.hazard({ kind: 'circle', pos: pt, r: 2.3, delay: 1.3, dmg: 14, owner: Game.env, team: -1, color: '#ff8a3d', kb: 3, up: 5 });
          }
        }
      }
      // remove finished
      for (const f of this.fighters) if (f.dead && !f.removed && f.removeAt != null && this.time >= f.removeAt && !f.isPlayer) f.dispose();
      this.fighters = this.fighters.filter((f) => !f.removed);
      // flow
      if (!this.ended) {
        if (p.dead) { this.ended = true; this.victory = false; this.endT = 1.8; }
        else if (this.aliveEnemies().length === 0) {
          if (this.waveDelay <= 0) {
            this.stats.wavesCleared++;
            const hasMore = this.mode === 'survival' || this.waveIdx + 1 < this.waves.length;
            if (hasMore) {
              this.waveDelay = 2.2;
              const heal = this.mode === 'bossrush' ? 0.35 : this.mode === 'survival' ? 0.2 : 0.1;
              p.hp = Math.min(p.maxHp, p.hp + p.maxHp * heal);
              p.healUses = Math.max(0, p.healUses - (this.mode === 'bossrush' ? 1 : 0));
              SP.HUD.popupSelf(this.mode === 'survival' ? 'WAVE ' + (this.waveIdx + 1) + ' CLEARED' : 'WAVE CLEARED', 'mom');
              this.waveTimerArmed = true;
            } else { this.ended = true; this.victory = true; this.endT = 1.4; SP.HUD.banner('VICTORY', ''); SP.Audio.play('victory'); Game.slowmo(0.3, 0.8); }
          }
        }
        if (this.waveTimerArmed) {
          this.waveDelay -= dt;
          if (this.waveDelay <= 0) { this.waveTimerArmed = false; this.waveDelay = 0; this.nextWave(false); }
        }
      } else {
        this.endT -= rdt;
        if (this.endT <= 0 && !this.rewarded) {
          if (!this.victory) SP.Audio.play('defeat');
          this.finish();
        }
      }
    }

    objectiveText() {
      const s = this.stats, t = U.fmtTime(this.time);
      let main = '';
      if (this.mode === 'survival') main = `<b>WAVE ${this.waveIdx + 1}</b> · Score ${U.fmt(s.score)} · ${t}`;
      else if (this.mode === 'bossrush') main = `<b>BOSS ${this.waveIdx + 1} / ${this.waves.length}</b> · ${t}`;
      else main = `<b>${U.esc(this.cfg.title || 'DUEL')}</b> · ${this.waves.length > 1 ? 'Wave ' + (this.waveIdx + 1) + '/' + this.waves.length + ' · ' : ''}${t}`;
      const goal = this.cfg.bonus || this.cfg.goal;
      if (goal) {
        const st = this.goalStatus(goal);
        main += `<div class="goal ${st.state}">${st.state === 'ok' ? '✓' : st.state === 'fail' ? '✕' : '◇'} ${U.esc(this.goalText(goal))}${st.prog ? ' <span>' + st.prog + '</span>' : ''}</div>`;
      }
      if (this.cfg.modifier) main += `<div class="mod">${U.esc(SP.MODIFIERS[this.cfg.modifier].name)}</div>`;
      return main;
    }
    goalText(g) {
      if (g.text) return g.text;
      const ch = SP.CHALLENGES.find((c) => c.goal === g);
      return ch ? ch.desc : '';
    }
    /* state: ok | fail | pending, prog text */
    goalStatus(g) {
      const s = this.stats, p = this.player;
      switch (g.id) {
        case 'noheal': return { state: s.heals > 0 ? 'fail' : (this.ended && this.victory ? 'ok' : 'pending') };
        case 'nooverheat': return { state: s.overheats > 0 ? 'fail' : (this.ended && this.victory ? 'ok' : 'pending') };
        case 'time': return { state: this.time > g.v ? 'fail' : (this.ended && this.victory ? 'ok' : 'pending'), prog: U.fmtTime(Math.max(0, g.v - this.time)) + ' left' };
        case 'parries': return { state: s.parries >= g.v ? 'ok' : 'pending', prog: Math.min(s.parries, g.v) + '/' + g.v };
        case 'counters': return { state: s.counters >= g.v ? 'ok' : 'pending', prog: Math.min(s.counters, g.v) + '/' + g.v };
        case 'perfect': return { state: s.perfects >= g.v ? 'ok' : 'pending', prog: Math.min(s.perfects, g.v) + '/' + g.v };
        case 'finishers': return { state: s.finishers >= g.v ? 'ok' : 'pending', prog: Math.min(s.finishers, g.v) + '/' + g.v };
        case 'dmgTaken': { const r = s.taken / p.maxHp; return { state: r >= g.v ? 'fail' : (this.ended && this.victory ? 'ok' : 'pending'), prog: Math.round(r * 100) + '% lost' }; }
        case 'win': return { state: this.ended && this.victory ? 'ok' : 'pending' };
        default: return { state: 'pending' };
      }
    }
    goalMet(g) { return this.victory && this.goalStatus(g).state === 'ok'; }

    /* ---------------- rewards (applied exactly once) ---------------- */
    finish() {
      if (this.rewarded) return;
      this.rewarded = true;
      const s = SP.Save.data;
      const D = this.diff;
      const v = !!this.victory;
      const R = { victory: v, xp: 0, credits: 0, shards: 0, items: [], notes: [], levelUps: [], mastery: null, firstClear: false, bonusDone: false, mode: this.mode };
      const tier = this.tier;
      const cfg = this.cfg;
      const stats = this.stats;
      s.stats.matches++;
      s.stats.kills += stats.kills; s.stats.parries += stats.parries; s.stats.finishers += stats.finishers;
      s.stats.playTime += this.time;
      if (v) s.stats.wins++;

      if (this.mode === 'campaign') {
        const st = cfg.stage;
        const isBoss = !!st.boss;
        const first = !s.campaign.cleared[st.id];
        R.xp = isBoss ? 380 * tier : 110 + 40 * tier;
        R.credits = isBoss ? 550 * tier : 140 * tier;
        R.shards = isBoss ? 25 * tier : 4 * tier;
        if (v) {
          if (first) { R.firstClear = true; R.xp *= 1.6; R.credits *= 1.6; R.notes.push('First clear bonus'); }
          s.campaign.cleared[st.id] = (s.campaign.cleared[st.id] || 0) + 1;
          if (isBoss) s.campaign.bosses[st.boss] = true;
          if (cfg.bonus && this.goalMet(cfg.bonus)) {
            R.bonusDone = true;
            const firstBonus = !s.campaign.bonus[st.id];
            s.campaign.bonus[st.id] = true;
            R.credits += firstBonus ? 200 * tier : 60 * tier; R.shards += firstBonus ? 12 : 4;
            R.notes.push((firstBonus ? 'Bonus objective complete: ' : 'Bonus objective: ') + cfg.bonus.text);
          }
          const dropChance = isBoss ? 1 : 0.55;
          if (Math.random() < dropChance) R.items.push(SP.Items.rollDrop(s, tier, isBoss ? 1 : 0, isBoss ? (first ? 3 : 2) : 0));
          if (isBoss && first) R.notes.push(SP.BOSSES[st.boss].name + ' defeated');
        }
      } else if (this.mode === 'survival') {
        const w = stats.wavesCleared;
        R.xp = 45 * w; R.credits = 70 * w + Math.round(stats.score / 40); R.shards = 2 * w;
        for (let i = 5; i <= w; i += 5) R.items.push(SP.Items.rollDrop(s, Math.min(3, 1 + Math.floor(i / 6)), i >= 10 ? 1 : 0));
        if (w > s.survival.bestWave || stats.score > s.survival.bestScore) R.notes.push('New personal best!');
        s.survival.bestWave = Math.max(s.survival.bestWave, w);
        s.survival.bestScore = Math.max(s.survival.bestScore, stats.score);
        R.survival = { waves: w, score: stats.score };
      } else if (this.mode === 'bossrush') {
        const n = stats.wavesCleared;
        R.xp = 300 * n; R.credits = 500 * n; R.shards = 18 * n;
        if (v) { R.items.push(SP.Items.rollDrop(s, 3, 2, 3)); s.bossRush.cleared = true; R.notes.push('Boss Rush cleared'); }
        s.bossRush.best = Math.max(s.bossRush.best, n);
      } else if (this.mode === 'duel') {
        const spec = cfg.waves[0][0];
        const practice = spec.arch === 'drone';
        if (practice) { R.notes.push('Training drone: practice only, no rewards'); }
        else if (v) { R.xp = spec.boss ? 200 : 60; R.credits = spec.boss ? 250 : 70; R.shards = spec.boss ? 8 : 2; R.notes.push('Duel Simulator pays reduced rewards'); }
      } else if (this.mode === 'challenge') {
        const ch = cfg.challenge;
        const done = v && this.goalMet(ch.goal);
        const first = done && !(s.challenges[ch.id] && s.challenges[ch.id].done);
        if (done) {
          R.bonusDone = true;
          R.xp = 150; R.credits = first ? ch.reward.credits : Math.round(ch.reward.credits * 0.25); R.shards = first ? ch.reward.shards : Math.round(ch.reward.shards * 0.25);
          if (first) { R.firstClear = true; R.items.push(SP.Items.rollDrop(s, 2, 1, 1)); R.notes.push('Challenge complete: ' + ch.name); }
          else R.notes.push('Challenge repeated (25% reward)');
          s.challenges[ch.id] = { done: true, best: Math.min((s.challenges[ch.id] || {}).best || 1e9, Math.round(this.time)) };
        } else R.notes.push(v ? 'Challenge objective not met' : 'Challenge failed');
      }
      if (!v && this.mode !== 'survival' && this.mode !== 'bossrush') { R.xp *= 0.3; R.credits *= 0.25; R.shards = 0; R.items = []; if (this.mode !== 'duel') R.notes.push('Defeat: consolation rewards'); }
      if (this.mode !== 'duel' || !cfg.waves[0][0].arch || cfg.waves[0][0].arch !== 'drone') {
        R.xp *= D.reward; R.credits *= D.reward; R.shards *= D.reward;
      }
      R.xp = Math.round(R.xp); R.credits = Math.round(R.credits); R.shards = Math.round(R.shards);
      // apply
      s.credits += R.credits; s.shards += R.shards;
      for (const it of R.items) { s.inventory.push(it); if (it.kind === 'armor' && !s.unlockedStyles.includes(it.style)) { s.unlockedStyles.push(it.style); R.notes.push('Style unlocked: ' + styleName(it.slot, it.style)); } }
      // xp & level
      s.xp += R.xp;
      while (s.xp >= SP.xpToNext(s.level) && s.level < 60) {
        s.xp -= SP.xpToNext(s.level); s.level++;
        const bonus = 100 * s.level; s.credits += bonus; s.shards += 5;
        R.levelUps.push({ level: s.level, credits: bonus, unlocks: SP.LEVEL_UNLOCKS[s.level] || [] });
      }
      // mastery (not for loaners or drones)
      const fam = this.loadout.family;
      const mxp = Math.round(stats.dealt * 0.45 + stats.kills * 25 + (v ? 40 : 0));
      if (mxp > 0 && !(cfg.waves && cfg.waves[0] && cfg.waves[0][0] && cfg.waves[0][0].arch === 'drone')) {
        const before = SP.Items.masteryLevel(s.mastery[fam] || 0);
        s.mastery[fam] = (s.mastery[fam] || 0) + mxp;
        const after = SP.Items.masteryLevel(s.mastery[fam]);
        R.mastery = { family: fam, gained: mxp, level: after, up: after > before, perk: after > before ? SP.MASTERY_PERKS[after - 1] : null };
      }
      R.time = this.time;
      R.stats = Object.assign({}, stats);
      this.result = R;
      SP.Save.save();
      Game.state = 'results';
      SP.Input.setActive(false);
      SP.UI.showResults(this, R);
      if (R.levelUps.length) SP.Audio.play('levelup'); else if (v) SP.Audio.play('reward');
    }

    dispose() {
      for (const f of this.fighters) { if (f.ai) f.ai.dispose(); if (!f.removed) f.dispose(); }
      this.fighters = [];
      SP.Combat.clear();
      G.FX.clear();
    }
  }
  function styleName(slot, id) { const s = SP.STYLES[slot].find((x) => x.id === id); return s ? s.name : id; }
  SP.Match = Match;
})();
