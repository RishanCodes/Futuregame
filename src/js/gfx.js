/* SHATTERPOINT — renderer, quality settings, particles, effects and arenas */
'use strict';
(function () {
  const U = SP.U;
  const G = {
    renderer: null, scene: null, camera: null, quality: 'high', isMobile: false,
    particleBudget: 600, fxRoot: null, arenaRoot: null, stageRoot: null, arena: null,
    pixelRatio: 1, dynScale: 1, fpsSamples: [],
  };
  SP.G = G;

  G.detectMobile = () => /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 900);

  G.init = function (canvas) {
    G.isMobile = G.detectMobile();
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !G.isMobile, powerPreference: 'high-performance' });
    } catch (e) {
      return false;
    }
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x05060a, 1);
    G.renderer = renderer;
    G.scene = new THREE.Scene();
    G.scene.fog = new THREE.Fog(0x07080f, 30, 90);
    G.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);
    G.camera.position.set(0, 3, 8);

    G.hemi = new THREE.HemisphereLight(0x9fb8ff, 0x1a1020, 0.75);
    G.scene.add(G.hemi);
    G.sun = new THREE.DirectionalLight(0xffffff, 0.9);
    G.sun.position.set(8, 18, 6);
    G.sun.shadow.mapSize.set(1024, 1024);
    const sc = G.sun.shadow.camera;
    sc.left = -20; sc.right = 20; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 60;
    G.sun.shadow.bias = -0.0008;
    G.scene.add(G.sun); G.scene.add(G.sun.target);

    G.fxRoot = new THREE.Group(); G.scene.add(G.fxRoot);
    G.arenaRoot = new THREE.Group(); G.scene.add(G.arenaRoot);
    G.stageRoot = new THREE.Group(); G.scene.add(G.stageRoot);

    G.softTex = makeSoftTexture();
    G.sparks = new Particles(900, 0.16);
    G.glows = new Particles(300, 0.9);
    G.FX.init();
    G.buildStage();
    G.applyQuality();
    G.resize();
    window.addEventListener('resize', G.resize);
    window.addEventListener('orientationchange', () => setTimeout(G.resize, 200));
    return true;
  };

  G.applyQuality = function () {
    const s = SP.Save.data.settings;
    let q = s.quality;
    if (q === 'auto') q = G.isMobile ? 'medium' : 'high';
    G.quality = q;
    const dpr = window.devicePixelRatio || 1;
    G.pixelRatio = q === 'low' ? Math.min(dpr, 1) * 0.75 : q === 'medium' ? Math.min(dpr, 1.5) : Math.min(dpr, 2);
    G.particleBudget = q === 'low' ? 0.3 : q === 'medium' ? 0.65 : 1;
    G.renderer.shadowMap.enabled = q === 'high';
    G.sun.castShadow = q === 'high';
    G.dynScale = 1;
    G.resize();
    // force material refresh for shadow toggle
    G.scene.traverse((o) => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach((mm) => (mm.needsUpdate = true)); } });
  };

  G.resize = function () {
    if (!G.renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    G.renderer.setPixelRatio(G.pixelRatio * G.dynScale);
    G.renderer.setSize(w, h, false);
    G.camera.aspect = w / Math.max(1, h);
    G.camera.fov = w < h ? 70 : 58;
    G.camera.updateProjectionMatrix();
  };

  /* adaptive resolution when quality = auto */
  G.trackFps = function (dt) {
    if (SP.Save.data.settings.quality !== 'auto') return;
    G.fpsSamples.push(dt);
    if (G.fpsSamples.length < 90) return;
    const avg = G.fpsSamples.reduce((a, b) => a + b, 0) / G.fpsSamples.length;
    G.fpsSamples.length = 0;
    const fps = 1 / avg;
    if (fps < 42 && G.dynScale > 0.55) { G.dynScale = Math.max(0.55, G.dynScale - 0.12); G.resize(); }
    else if (fps > 57 && G.dynScale < 1) { G.dynScale = Math.min(1, G.dynScale + 0.06); G.resize(); }
  };

  G.render = function () { G.renderer.render(G.scene, G.camera); };

  /* ---------- shared materials ---------- */
  const matCache = {};
  G.mat = function (color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (matCache[key]) return matCache[key];
    const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.2 }, opts));
    matCache[key] = m;
    return m;
  };
  G.glowMat = function (color, opacity = 1) {
    const key = 'g' + color + opacity;
    if (matCache[key]) return matCache[key];
    const m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: true });
    matCache[key] = m;
    return m;
  };
  G.addMat = function (color, opacity = 0.8) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  };

  function makeSoftTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    return t;
  }

  /* ---------- particle system (pooled points, additive) ---------- */
  function Particles(cap, size) {
    this.cap = cap; this.n = 0;
    this.pos = new Float32Array(cap * 3); this.col = new Float32Array(cap * 3);
    this.vel = new Float32Array(cap * 3); this.base = new Float32Array(cap * 3);
    this.life = new Float32Array(cap); this.max = new Float32Array(cap); this.grav = new Float32Array(cap); this.drag = new Float32Array(cap);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({ size, map: G.softTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    G.scene.add(this.points);
    this.geo = geo;
  }
  Particles.prototype.emit = function (x, y, z, count, o) {
    count = Math.max(1, Math.round(count * G.particleBudget));
    const c = new THREE.Color(o.color || '#ffffff');
    const sp = o.speed || 4, life = o.life || 0.5;
    for (let k = 0; k < count; k++) {
      if (this.n >= this.cap) return;
      const i = this.n++;
      this.pos[i * 3] = x + (Math.random() - 0.5) * (o.jitter || 0);
      this.pos[i * 3 + 1] = y + (Math.random() - 0.5) * (o.jitter || 0);
      this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * (o.jitter || 0);
      let vx = Math.random() * 2 - 1, vy = Math.random() * 2 - 1, vz = Math.random() * 2 - 1;
      const l = Math.hypot(vx, vy, vz) || 1;
      const s = sp * (0.4 + Math.random() * 0.6);
      vx = vx / l * s + (o.dx || 0); vy = vy / l * s * (o.flat ? 0.2 : 1) + (o.up || 0); vz = vz / l * s + (o.dz || 0);
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
      this.base[i * 3] = c.r; this.base[i * 3 + 1] = c.g; this.base[i * 3 + 2] = c.b;
      this.max[i] = this.life[i] = life * (0.6 + Math.random() * 0.6);
      this.grav[i] = o.gravity == null ? 9 : o.gravity;
      this.drag[i] = o.drag == null ? 2 : o.drag;
    }
  };
  Particles.prototype.update = function (dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // swap-remove
        const j = --this.n;
        if (i !== j) {
          for (let a = 0; a < 3; a++) {
            this.pos[i * 3 + a] = this.pos[j * 3 + a]; this.vel[i * 3 + a] = this.vel[j * 3 + a]; this.base[i * 3 + a] = this.base[j * 3 + a];
          }
          this.life[i] = this.life[j]; this.max[i] = this.max[j]; this.grav[i] = this.grav[j]; this.drag[i] = this.drag[j];
        }
        continue;
      }
      const d = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= d; this.vel[i * 3 + 2] *= d; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.02) { this.pos[i * 3 + 1] = 0.02; this.vel[i * 3 + 1] *= -0.3; }
      const f = this.life[i] / this.max[i];
      this.col[i * 3] = this.base[i * 3] * f; this.col[i * 3 + 1] = this.base[i * 3 + 1] * f; this.col[i * 3 + 2] = this.base[i * 3 + 2] * f;
      i++;
    }
    this.geo.setDrawRange(0, this.n);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  };
  Particles.prototype.clear = function () { this.n = 0; this.geo.setDrawRange(0, 0); };

  /* ---------- pooled effects ---------- */
  const FX = {
    rings: [], flashes: [], beams: [], decals: [],
    init() {
      this.ringGeo = new THREE.RingGeometry(0.86, 1, 48); this.ringGeo.rotateX(-Math.PI / 2);
      this.discGeo = new THREE.CircleGeometry(1, 40); this.discGeo.rotateX(-Math.PI / 2);
      this.sphGeo = new THREE.SphereGeometry(1, 16, 12);
      this.beamGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true); this.beamGeo.rotateX(Math.PI / 2); this.beamGeo.translate(0, 0, 0.5);
      this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
    },
    _get(pool, mk) {
      for (const o of pool) if (!o.active) return o;
      const o = mk(); pool.push(o); return o;
    },
    ring(pos, radius, color, life = 0.45, y = 0.06, startScale = 0.2) {
      const o = this._get(this.rings, () => { const m = new THREE.Mesh(this.ringGeo, G.addMat('#fff', 0.9)); G.fxRoot.add(m); return { mesh: m }; });
      o.active = true; o.t = 0; o.life = life; o.r = radius; o.s0 = startScale;
      o.mesh.visible = true; o.mesh.material.color.set(color); o.mesh.position.set(pos.x, y, pos.z);
      o.mesh.scale.setScalar(radius * startScale);
    },
    flash(pos, size, color, life = 0.18) {
      const o = this._get(this.flashes, () => { const m = new THREE.Mesh(this.sphGeo, G.addMat('#fff', 0.9)); G.fxRoot.add(m); return { mesh: m }; });
      o.active = true; o.t = 0; o.life = life; o.size = size;
      o.mesh.visible = true; o.mesh.material.color.set(color); o.mesh.position.copy(pos); o.mesh.scale.setScalar(size * 0.3);
    },
    beam(from, to, color, width = 0.12, life = 0.3) {
      const o = this._get(this.beams, () => { const m = new THREE.Mesh(this.beamGeo, G.addMat('#fff', 0.95)); G.fxRoot.add(m); return { mesh: m }; });
      o.active = true; o.t = 0; o.life = life; o.w = width;
      const len = from.distanceTo(to);
      o.mesh.visible = true; o.mesh.material.color.set(color);
      o.mesh.position.copy(from); o.mesh.lookAt(to); o.mesh.scale.set(width, width, len);
    },
    /* telegraph decals for hazards: returns handle */
    decal(pos, radius, color) {
      const o = this._get(this.decals, () => {
        const g = new THREE.Group();
        const fill = new THREE.Mesh(this.discGeo, G.addMat('#fff', 0.35));
        const edge = new THREE.Mesh(this.ringGeo, G.addMat('#fff', 0.9));
        g.add(fill); g.add(edge); G.fxRoot.add(g);
        return { mesh: g, fill, edge };
      });
      o.active = true; o.mesh.visible = true;
      o.fill.material.color.set(color); o.edge.material.color.set(color);
      o.mesh.position.set(pos.x, 0.05, pos.z); o.edge.scale.setScalar(radius); o.fill.scale.setScalar(0.01);
      o.radius = radius;
      return o;
    },
    decalProgress(o, p) { o.fill.scale.setScalar(Math.max(0.01, o.radius * p)); o.fill.material.opacity = 0.18 + 0.3 * p; },
    freeDecal(o) { o.active = false; o.mesh.visible = false; },
    update(dt) {
      for (const o of this.rings) if (o.active) {
        o.t += dt; const p = o.t / o.life;
        if (p >= 1) { o.active = false; o.mesh.visible = false; continue; }
        o.mesh.scale.setScalar(o.r * (o.s0 + (1 - o.s0) * U.easeOut(p)));
        o.mesh.material.opacity = 0.9 * (1 - p);
      }
      for (const o of this.flashes) if (o.active) {
        o.t += dt; const p = o.t / o.life;
        if (p >= 1) { o.active = false; o.mesh.visible = false; continue; }
        o.mesh.scale.setScalar(o.size * (0.3 + 0.7 * U.easeOut(p)));
        o.mesh.material.opacity = 0.9 * (1 - p);
      }
      for (const o of this.beams) if (o.active) {
        o.t += dt; const p = o.t / o.life;
        if (p >= 1) { o.active = false; o.mesh.visible = false; continue; }
        const w = o.w * (1 - p * 0.8);
        o.mesh.scale.x = w; o.mesh.scale.y = w;
        o.mesh.material.opacity = 0.95 * (1 - p);
      }
      G.sparks.update(dt); G.glows.update(dt);
    },
    clear() {
      for (const pool of [this.rings, this.flashes, this.beams, this.decals]) for (const o of pool) { o.active = false; o.mesh.visible = false; }
      G.sparks.clear(); G.glows.clear();
    },
    hit(pos, color, heavy) {
      G.sparks.emit(pos.x, pos.y, pos.z, heavy ? 26 : 14, { color, speed: heavy ? 9 : 6, life: 0.4, gravity: 6 });
      G.glows.emit(pos.x, pos.y, pos.z, heavy ? 4 : 2, { color, speed: 1, life: 0.25, gravity: 0 });
      this.flash(pos, heavy ? 0.75 : 0.45, color, heavy ? 0.16 : 0.1);
    },
  };
  G.FX = FX;

  /* ---------- weapon trail ribbon ---------- */
  G.Trail = function (color, segs = 12) {
    this.segs = segs; this.n = 0;
    this.base = []; this.tip = [];
    for (let i = 0; i < segs; i++) { this.base.push(new THREE.Vector3()); this.tip.push(new THREE.Vector3()); }
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(segs * 2 * 3); this.col = new Float32Array(segs * 2 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < segs - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.frustumCulled = false; this.mesh.visible = false;
    this.geo = geo; this.color = new THREE.Color(color); this.fade = 0;
    G.fxRoot.add(this.mesh);
  };
  G.Trail.prototype.setColor = function (c) { this.color.set(c); };
  G.Trail.prototype.push = function (b, t) {
    for (let i = this.segs - 1; i > 0; i--) { this.base[i].copy(this.base[i - 1]); this.tip[i].copy(this.tip[i - 1]); }
    this.base[0].copy(b); this.tip[0].copy(t);
    if (this.n < this.segs) { for (let i = this.n; i < this.segs; i++) { this.base[i].copy(b); this.tip[i].copy(t); } }
    this.n = this.segs;
  };
  G.Trail.prototype.update = function (active, dt) {
    this.fade = active ? Math.min(1, this.fade + dt * 12) : Math.max(0, this.fade - dt * 6);
    if (this.fade <= 0) { this.mesh.visible = false; this.n = 0; return; }
    this.mesh.visible = true;
    for (let i = 0; i < this.segs; i++) {
      const f = (1 - i / (this.segs - 1)) * this.fade;
      const b = this.base[i], t = this.tip[i];
      this.pos.set([b.x, b.y, b.z, t.x, t.y, t.z], i * 6);
      this.col.set([this.color.r * f * 0.2, this.color.g * f * 0.2, this.color.b * f * 0.2, this.color.r * f, this.color.g * f, this.color.b * f], i * 6);
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
  };
  G.Trail.prototype.dispose = function () { G.fxRoot.remove(this.mesh); this.geo.dispose(); this.mat.dispose(); };

  /* ---------- canvas textures ---------- */
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    t.anisotropy = 4;
    return t;
  }

  /* ---------- menu stage ---------- */
  G.buildStage = function () {
    const r = G.stageRoot;
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.3, 48), G.mat('#11141d', { metalness: 0.6, roughness: 0.35 }));
    podium.position.y = -0.15; podium.receiveShadow = true; r.add(podium);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.025, 8, 64), G.glowMat('#2fb4ff'));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; r.add(ring);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), G.mat('#07080c', { roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.3; floor.receiveShadow = true; r.add(floor);
    for (let i = 0; i < 3; i++) {
      const hr = new THREE.Mesh(new THREE.TorusGeometry(3.2 + i * 1.1, 0.012, 6, 96), G.addMat(i === 1 ? '#9a5cff' : '#2fb4ff', 0.5));
      hr.position.set(0, 1.4 + i * 0.25, -2.5); hr.rotation.x = 0.15 * (i - 1);
      hr.userData.spin = (i % 2 ? -1 : 1) * (0.1 + i * 0.05);
      r.add(hr);
    }
    // backdrop panels
    for (let i = -3; i <= 3; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 6 + Math.abs(i) * 0.8, 0.2), G.mat('#0c0f17', { metalness: 0.5, roughness: 0.4 }));
      p.position.set(i * 2.1, 2.5, -7 - Math.abs(i) * 0.6); p.rotation.y = -i * 0.12; r.add(p);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 5, 0.05), G.glowMat(i % 2 ? '#9a5cff' : '#2fb4ff'));
      s.position.set(i * 2.1 + 0.7, 2.5, -6.85 - Math.abs(i) * 0.6); s.rotation.y = -i * 0.12; r.add(s);
    }
    G.stageLight = new THREE.PointLight(0x2fb4ff, 1.4, 12); G.stageLight.position.set(-2.5, 3, 2.5); r.add(G.stageLight);
    const l2 = new THREE.PointLight(0x9a5cff, 1.2, 12); l2.position.set(2.5, 2.5, -1.5); r.add(l2);
  };
  G.updateStage = function (dt) {
    G.stageRoot.children.forEach((c) => { if (c.userData.spin) c.rotation.z += c.userData.spin * dt; });
  };

  /* ---------- arenas ---------- */
  G.clearArena = function () {
    while (G.arenaRoot.children.length) {
      const c = G.arenaRoot.children.pop();
      c.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    G.arena = null;
    G.anim = [];
  };

  G.buildArena = function (id) {
    G.clearArena();
    const A = SP.ARENAS[id];
    const root = G.arenaRoot;
    const arena = { def: A, obstacles: [], camBlockers: [], vents: [] };
    G.arena = arena;
    G.anim = [];
    G.scene.fog.color.set(A.fog);
    G.renderer.setClearColor(A.sky, 1);
    const hi = G.quality === 'high', lo = G.quality === 'low';
    const q = lo ? 0.4 : G.quality === 'medium' ? 0.7 : 1;

    const lineMat = G.glowMat(A.line), accMat = G.glowMat(A.accent);

    if (id === 'colosseum') {
      G.scene.fog.near = 30; G.scene.fog.far = 95;
      const floorTex = canvasTex(512, 512, (g, w, h) => {
        g.fillStyle = '#0f121b'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(47,180,255,0.10)'; g.lineWidth = 2;
        for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,0.025)';
        for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h, 60, 2);
      }, 6);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(A.size + 1, 72), G.mat('#ffffff', { map: floorTex, roughness: 0.35, metalness: 0.5 }));
      floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
      [4, 9, 14.5].forEach((rr, i) => {
        const m = new THREE.Mesh(new THREE.RingGeometry(rr - 0.05, rr + 0.05, 96), i === 1 ? accMat : lineMat);
        m.rotation.x = -Math.PI / 2; m.position.y = 0.012; root.add(m);
      });
      const emblem = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.9, 6), G.addMat(A.accent, 0.35));
      emblem.rotation.x = -Math.PI / 2; emblem.position.y = 0.015; root.add(emblem);
      G.anim.push((dt) => { emblem.rotation.z += dt * 0.2; });
      // wall
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(A.size + 0.6, A.size + 0.6, 2.4, 72, 1, true), G.mat('#151a26', { side: THREE.BackSide, metalness: 0.6, roughness: 0.4 }));
      wall.position.y = 1.2; root.add(wall);
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(A.size + 0.55, A.size + 0.55, 0.08, 72, 1, true), G.glowMat(A.line));
      stripe.material.side = THREE.BackSide; stripe.position.y = 1.9; root.add(stripe);
      // stands
      for (let t = 0; t < 4; t++) {
        const r0 = A.size + 1.5 + t * 2.4;
        const tier = new THREE.Mesh(new THREE.CylinderGeometry(r0 + 2.4, r0 + 2.4, 1.6, 64, 1, true), G.mat('#0b0d14', { side: THREE.BackSide }));
        tier.position.y = 2.4 + t * 1.6; root.add(tier);
        const cap = new THREE.Mesh(new THREE.RingGeometry(r0, r0 + 2.4, 64), G.mat('#0f121b'));
        cap.rotation.x = -Math.PI / 2; cap.position.y = 1.6 + t * 1.6 + 0.81; root.add(cap);
      }
      // crowd (instanced)
      const crowdN = Math.round(700 * q);
      const crowd = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.62, 0.3), new THREE.MeshBasicMaterial({ color: '#ffffff' }), crowdN);
      const m4 = new THREE.Matrix4(), col = new THREE.Color();
      const cols = ['#2fb4ff', '#9a5cff', '#e8ecf3', '#ff5cf0', '#1d2433', '#1d2433', '#1d2433'];
      for (let i = 0; i < crowdN; i++) {
        const t = i % 4, a = Math.random() * Math.PI * 2, rr = A.size + 2.2 + t * 2.4 + Math.random() * 1.2;
        m4.makeTranslation(Math.cos(a) * rr, 2.9 + t * 1.6, Math.sin(a) * rr);
        crowd.setMatrixAt(i, m4); col.set(U.pick(cols)); col.multiplyScalar(0.32); crowd.setColorAt(i, col);
      }
      root.add(crowd);
      G.anim.push((dt, time) => { crowd.position.y = Math.abs(Math.sin(time * 6)) * 0.04; });
      // light pylons
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const py = new THREE.Mesh(new THREE.BoxGeometry(0.25, 16, 0.25), i % 3 === 0 ? accMat : lineMat);
        py.position.set(Math.cos(a) * (A.size + 12), 8, Math.sin(a) * (A.size + 12)); root.add(py);
      }
      const halo = new THREE.Mesh(new THREE.TorusGeometry(A.size + 6, 0.12, 6, 96), G.addMat(A.line, 0.6));
      halo.rotation.x = Math.PI / 2; halo.position.y = 16; root.add(halo);
      addPoint(root, A.line, 0, 9, 0, 1.0, 40);
      addPoint(root, A.accent, 10, 5, -10, 0.6, 26);
    }

    if (id === 'foundry') {
      G.scene.fog.near = 22; G.scene.fog.far = 70;
      const floorTex = canvasTex(512, 512, (g, w, h) => {
        g.fillStyle = '#17120e'; g.fillRect(0, 0, w, h);
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
          g.fillStyle = (x + y) % 2 ? '#1c1611' : '#191410'; g.fillRect(x * 128 + 3, y * 128 + 3, 122, 122);
          g.fillStyle = '#2b2219'; [[10, 10], [112, 10], [10, 112], [112, 112]].forEach((p) => { g.beginPath(); g.arc(x * 128 + p[0], y * 128 + p[1], 3, 0, 7); g.fill(); });
        }
        g.strokeStyle = 'rgba(255,138,61,0.08)'; g.lineWidth = 6;
        for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(Math.random() * w, 0); g.lineTo(Math.random() * w, h); g.stroke(); }
      }, 4);
      const s = A.size;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(s * 2 + 2, s * 2 + 2), G.mat('#ffffff', { map: floorTex, roughness: 0.7, metalness: 0.4 }));
      floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
      // hazard border
      const border = canvasTex(256, 32, (g, w, h) => { g.fillStyle = '#111'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffbf3d'; for (let i = -2; i < 16; i++) { g.beginPath(); g.moveTo(i * 32, h); g.lineTo(i * 32 + 16, h); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32 + 16, 0); g.fill(); } });
      border.wrapS = THREE.RepeatWrapping; border.repeat.set(12, 1);
      for (let i = 0; i < 4; i++) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(s * 2 + 2, 4, 0.6), G.mat('#211a14', { metalness: 0.7, roughness: 0.5 }));
        const a = (i * Math.PI) / 2;
        w.position.set(Math.sin(a) * (s + 1.0), 2, Math.cos(a) * (s + 1.0)); w.rotation.y = a; root.add(w);
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(s * 2 + 2, 0.4), new THREE.MeshBasicMaterial({ map: border }));
        strip.position.set(Math.sin(a) * (s + 0.69), 0.6, Math.cos(a) * (s + 0.69)); strip.rotation.y = a + Math.PI; root.add(strip);
        const glow = new THREE.Mesh(new THREE.BoxGeometry(s * 2 + 2, 0.06, 0.06), lineMat);
        glow.position.set(Math.sin(a) * (s + 0.68), 3.2, Math.cos(a) * (s + 0.68)); glow.rotation.y = a; root.add(glow);
        // gears
        for (let k = -1; k <= 1; k += 2) {
          const gear = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.5, 6, 12), G.mat('#3a2c20', { metalness: 0.8, roughness: 0.4 }));
          gear.position.set(Math.sin(a) * (s + 3) + Math.cos(a) * k * 7, 6, Math.cos(a) * (s + 3) - Math.sin(a) * k * 7);
          gear.rotation.y = a; root.add(gear);
          const spd = 0.3 * k;
          G.anim.push((dt) => { gear.rotation.z += dt * spd; });
        }
      }
      // molten channels
      const molten = new THREE.Mesh(new THREE.RingGeometry(s * 1.6, s * 2.6, 4, 1), new THREE.MeshBasicMaterial({ color: '#ff6a1a' }));
      molten.rotation.x = -Math.PI / 2; molten.rotation.z = Math.PI / 4; molten.position.y = -0.4; root.add(molten);
      // pillars
      for (const o of A.obstacles) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(o.r, o.r * 1.1, 9, 16), G.mat('#2a2119', { metalness: 0.7, roughness: 0.45 }));
        p.position.set(o.x, 4.5, o.z); p.castShadow = hi; root.add(p);
        arena.camBlockers.push(p);
        for (let b = 0; b < 3; b++) {
          const band = new THREE.Mesh(new THREE.TorusGeometry(o.r + 0.04, 0.06, 6, 24), lineMat);
          band.rotation.x = Math.PI / 2; band.position.set(o.x, 1.2 + b * 2.6, o.z); root.add(band);
        }
        arena.obstacles.push(o);
      }
      // overhead crane
      const crane = new THREE.Mesh(new THREE.BoxGeometry(s * 2.2, 0.6, 1.2), G.mat('#2a2119', { metalness: 0.8 }));
      crane.position.set(0, 11, 0); root.add(crane);
      G.anim.push((dt, time) => { crane.position.z = Math.sin(time * 0.15) * 10; });
      addPoint(root, '#ff8a3d', 0, 7, 0, 1.1, 34);
      addPoint(root, '#ffbf3d', -10, 4, 10, 0.6, 20);
      addPoint(root, '#ff4d1a', 10, 3, -10, 0.7, 20);
    }

    if (id === 'sky') {
      G.scene.fog.near = 40; G.scene.fog.far = 220;
      const s = A.size;
      const platTex = canvasTex(512, 512, (g, w, h) => {
        g.fillStyle = '#0e1626'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(127,208,255,0.12)'; g.lineWidth = 1.5;
        for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 30; i++) g.fillRect(Math.floor(Math.random() * 16) * 32, Math.floor(Math.random() * 16) * 32, 32, 32);
      }, 3);
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(s + 0.8, s - 1.5, 1.6, 8), [G.mat('#1b2438', { metalness: 0.7, roughness: 0.3 }), G.mat('#ffffff', { map: platTex, metalness: 0.5, roughness: 0.35 }), G.mat('#1b2438')]);
      plat.position.y = -0.8; plat.rotation.y = Math.PI / 8; plat.receiveShadow = true; root.add(plat);
      // edge fence
      for (let i = 0; i < 8; i++) {
        const a0 = (i / 8) * Math.PI * 2 + Math.PI / 8, a1 = ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8;
        const R = s + 0.6;
        const x0 = Math.sin(a0) * R, z0 = Math.cos(a0) * R, x1 = Math.sin(a1) * R, z1 = Math.cos(a1) * R;
        const len = Math.hypot(x1 - x0, z1 - z0);
        const f = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.2), G.addMat('#7fd0ff', 0.12));
        f.position.set((x0 + x1) / 2, 0.6, (z0 + z1) / 2); f.rotation.y = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2; root.add(f);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.05), lineMat);
        rail.position.set((x0 + x1) / 2, 1.2, (z0 + z1) / 2); rail.rotation.y = f.rotation.y; root.add(rail);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 8), G.mat('#c9d2e3', { metalness: 0.8, roughness: 0.2 }));
        post.position.set(x0, 0.8, z0); root.add(post);
      }
      const ringL = new THREE.Mesh(new THREE.RingGeometry(5.8, 6, 8), lineMat); ringL.rotation.x = -Math.PI / 2; ringL.rotation.z = Math.PI / 8; ringL.position.y = 0.012; root.add(ringL);
      // city below (instanced)
      const N = Math.round(380 * q);
      const bld = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), G.mat('#ffffff', { roughness: 0.6, metalness: 0.4 }), N);
      const m4 = new THREE.Matrix4(), col = new THREE.Color(), quat = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
      for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI * 2, rr = 30 + Math.random() * 150;
        const hgt = 10 + Math.random() * 70 * (1 - rr / 220);
        ps.set(Math.cos(a) * rr, -70 + hgt / 2, Math.sin(a) * rr);
        sc.set(4 + Math.random() * 8, hgt, 4 + Math.random() * 8);
        m4.compose(ps, quat, sc); bld.setMatrixAt(i, m4);
        col.set(U.pick(['#1a2238', '#141b2e', '#222c48', '#2a3456'])); bld.setColorAt(i, col);
      }
      root.add(bld);
      // window lights as points
      const wN = Math.round(1600 * q), wp = new Float32Array(wN * 3), wc = new Float32Array(wN * 3);
      for (let i = 0; i < wN; i++) {
        const a = Math.random() * Math.PI * 2, rr = 30 + Math.random() * 150;
        wp.set([Math.cos(a) * rr, -70 + Math.random() * 60, Math.sin(a) * rr], i * 3);
        col.set(U.pick(['#7fd0ff', '#ffbf3d', '#ff5cf0', '#ffffff', '#9a5cff'])); wc.set([col.r, col.g, col.b], i * 3);
      }
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(wp, 3)); wg.setAttribute('color', new THREE.BufferAttribute(wc, 3));
      root.add(new THREE.Points(wg, new THREE.PointsMaterial({ size: 0.9, vertexColors: true, map: G.softTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
      // spire towers
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3 + 0.4;
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 3, 120, 6), G.mat('#202a44', { metalness: 0.7 }));
        t.position.set(Math.cos(a) * (60 + i * 15), -20, Math.sin(a) * (60 + i * 15)); root.add(t);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), G.glowMat(i % 2 ? '#ff4d6d' : '#7fd0ff'));
        tip.position.set(t.position.x, 40, t.position.z); root.add(tip);
      }
      // flying traffic
      const carN = Math.round(30 * q);
      const cars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.3, 1.6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), carN);
      const carData = [];
      for (let i = 0; i < carN; i++) { carData.push({ r: 35 + Math.random() * 60, a: Math.random() * 7, y: -15 + Math.random() * 25, s: (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.08) }); cars.setColorAt(i, col.set(U.pick(['#ffbf3d', '#7fd0ff', '#ff4d6d']))); }
      root.add(cars);
      G.anim.push((dt) => {
        for (let i = 0; i < carN; i++) {
          const c = carData[i]; c.a += c.s * dt;
          ps.set(Math.cos(c.a) * c.r, c.y, Math.sin(c.a) * c.r); quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -c.a); sc.set(1, 1, 1);
          m4.compose(ps, quat, sc); cars.setMatrixAt(i, m4);
        }
        cars.instanceMatrix.needsUpdate = true;
      });
      G.hemi.intensity = 0.9;
      addPoint(root, '#7fd0ff', 0, 8, 0, 0.9, 40);
      addPoint(root, '#ffbf3d', -12, 3, 12, 0.5, 24);
    } else { G.hemi.intensity = 0.75; }

    if (id === 'sim') {
      G.scene.fog.near = 20; G.scene.fog.far = 60;
      const s = A.size;
      const gridTex = canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#05080b'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(61,220,132,0.55)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
        g.strokeStyle = 'rgba(61,220,132,0.15)'; g.lineWidth = 1;
        for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
      }, 8);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(s * 2 + 2, s * 2 + 2), G.mat('#ffffff', { map: gridTex, roughness: 0.4, metalness: 0.2, emissive: '#0a1a10', emissiveMap: gridTex }));
      floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
      const wallTex = canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h);
        g.strokeStyle = 'rgba(47,180,255,0.7)'; g.lineWidth = 2;
        for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
      }, 1);
      wallTex.repeat.set(8, 2);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        const w = new THREE.Mesh(new THREE.PlaneGeometry(s * 2 + 2, 8), new THREE.MeshBasicMaterial({ map: wallTex, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        w.position.set(Math.sin(a) * (s + 1), 4, Math.cos(a) * (s + 1)); w.rotation.y = a; root.add(w);
      }
      for (const o of A.obstacles) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(o.r * 1.8, 2.6, o.r * 1.8), new THREE.MeshStandardMaterial({ color: '#0b2a1a', emissive: '#0d3b22', transparent: true, opacity: 0.8 }));
        box.position.set(o.x, 1.3, o.z); root.add(box);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: '#3ddc84' }));
        edges.position.copy(box.position); root.add(edges);
        arena.camBlockers.push(box);
        arena.obstacles.push(o);
      }
      // floating data cubes
      const cubes = [];
      for (let i = 0; i < Math.round(24 * q); i++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), G.addMat(U.pick(['#3ddc84', '#2fb4ff']), 0.5));
        c.position.set(U.rand(-s, s), U.rand(5, 9), U.rand(-s, s)); root.add(c); cubes.push(c);
      }
      G.anim.push((dt, time) => { cubes.forEach((c, i) => { c.rotation.x += dt * 0.6; c.rotation.y += dt * 0.4; c.position.y += Math.sin(time + i) * dt * 0.3; }); });
      addPoint(root, '#3ddc84', 0, 8, 0, 0.9, 30);
      addPoint(root, '#2fb4ff', 8, 4, 8, 0.6, 20);
    }

    G.sun.position.set(8, 18, 6);
    return arena;
  };

  function addPoint(root, color, x, y, z, intensity, dist) {
    if (G.quality === 'low' && intensity < 0.8) return;
    const l = new THREE.PointLight(color, intensity, dist, 1.6);
    l.position.set(x, y, z); root.add(l);
  }

  G.updateArena = function (dt, time) { if (G.anim) for (const f of G.anim) f(dt, time); };

  /* ---------- arena geometry helpers ---------- */
  G.clampToArena = function (p, radius) {
    const A = G.arena ? G.arena.def : null;
    if (!A) return;
    const s = A.size - radius;
    if (A.shape === 'circle') {
      const d = Math.hypot(p.x, p.z);
      if (d > s) { p.x *= s / d; p.z *= s / d; return true; }
    } else if (A.shape === 'octagon') {
      // apothem clamp on 8 planes
      let hit = false;
      const ap = s * Math.cos(Math.PI / 8);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const nx = Math.sin(a), nz = Math.cos(a);
        const d = p.x * nx + p.z * nz;
        if (d > ap) { p.x -= nx * (d - ap); p.z -= nz * (d - ap); hit = true; }
      }
      return hit;
    } else {
      let hit = false;
      if (p.x > s) { p.x = s; hit = true; } if (p.x < -s) { p.x = -s; hit = true; }
      if (p.z > s) { p.z = s; hit = true; } if (p.z < -s) { p.z = -s; hit = true; }
      return hit;
    }
    return false;
  };
  G.pushOutObstacles = function (p, radius) {
    if (!G.arena) return false;
    let hit = false;
    for (const o of G.arena.obstacles) {
      if (o.box) {
        const h = o.r * 0.9 + radius;
        const dx = p.x - o.x, dz = p.z - o.z;
        if (Math.abs(dx) < h && Math.abs(dz) < h) {
          if (h - Math.abs(dx) < h - Math.abs(dz)) p.x = o.x + Math.sign(dx || 1) * h; else p.z = o.z + Math.sign(dz || 1) * h;
          hit = true;
        }
      } else {
        const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), m = o.r + radius;
        if (d < m) { const k = d > 0.001 ? m / d : 0; p.x = o.x + (d > 0.001 ? dx * k : m); p.z = o.z + dz * k; hit = true; }
      }
    }
    return hit;
  };
  G.segmentBlocked = function (a, b) {
    if (!G.arena) return false;
    for (const o of G.arena.obstacles) {
      const abx = b.x - a.x, abz = b.z - a.z, l2 = abx * abx + abz * abz || 1;
      let t = ((o.x - a.x) * abx + (o.z - a.z) * abz) / l2; t = U.clamp(t, 0, 1);
      const cx = a.x + abx * t, cz = a.z + abz * t;
      if (Math.hypot(cx - o.x, cz - o.z) < o.r * (o.box ? 1.1 : 0.95)) return o;
    }
    return false;
  };
  G.randomPoint = function (margin = 3) {
    const A = G.arena.def;
    for (let i = 0; i < 30; i++) {
      const p = new THREE.Vector3(U.rand(-A.size + margin, A.size - margin), 0, U.rand(-A.size + margin, A.size - margin));
      const q = p.clone(); G.clampToArena(q, margin);
      if (q.distanceTo(p) > 0.01) continue;
      if (G.pushOutObstacles(q, 1)) continue;
      return p;
    }
    return new THREE.Vector3();
  };
})();
