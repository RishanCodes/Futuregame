/* SHATTERPOINT — procedural fighter model, weapons, poses and animator */
'use strict';
(function () {
  const U = SP.U;
  const G = SP.G;
  /* Character faces +Z. Character's right side is -X.
     Arm joints: rotation.x < 0 swings the arm forward / up; z < 0 raises right arm outward. */

  /* ---------------- poses ---------------- */
  // joints: sp spine[x,y,z], hd head, ru/lu upper arm [x,y,z], rf/lf forearm [x], rh/lh hand [x,y,z], rt/lt thigh [x,z], rs/ls shin [x], cr crouch (hip drop m)
  const P = {
    // katana / one-handed
    kWindR: { sp: [0.1, -0.9, 0], ru: [-1.1, 0, -1.2], rf: [-0.9], rh: [0, 0, -0.3], lu: [-0.4, 0, 0.5], lf: [-1.0] },
    kSlashR: { sp: [0.15, 0.95, 0], ru: [-1.5, 0, 0.5], rf: [-0.2], rh: [0, 0, 0.4], lu: [0.2, 0, 0.4], lf: [-0.6] },
    kWindL: { sp: [0.1, 0.9, 0], ru: [-1.3, 0, 0.6], rf: [-1.2], rh: [0, 0, 0.6], lu: [0.1, 0, 0.3], lf: [-0.8] },
    kSlashL: { sp: [0.15, -0.95, 0], ru: [-1.4, 0, -1.1], rf: [-0.25], rh: [0, 0, -0.5], lu: [-0.6, 0, 0.6], lf: [-0.8] },
    overW: { sp: [-0.25, -0.2, 0], ru: [-2.9, 0, -0.2], rf: [-0.6], rh: [0.3, 0, 0], lu: [-2.6, 0, 0.3], lf: [-0.6] },
    overS: { sp: [0.45, 0, 0], ru: [-0.9, 0, -0.1], rf: [-0.1], rh: [-0.3, 0, 0], lu: [-0.8, 0, 0.2], lf: [-0.4], cr: 0.15 },
    thrustW: { sp: [0, -0.7, 0], ru: [-0.6, 0, -0.5], rf: [-1.6], rh: [0, 0, 0], lu: [-1.2, 0, 0.6], lf: [-0.8], rt: [0.3, 0], lt: [-0.4, 0] },
    thrustS: { sp: [0.2, 0.25, 0], ru: [-1.55, 0, -0.05], rf: [0], rh: [0, 0, 0], lu: [-0.2, 0, 0.6], lf: [-0.4], rt: [0.5, 0], lt: [-0.6, 0], ls: [0.4], cr: 0.12 },
    wideW: { sp: [0.15, -1.3, 0], ru: [-0.6, 0, -1.4], rf: [-0.6], rh: [0, 0, -0.4], lu: [-0.8, 0, 0.5], lf: [-1.0], cr: 0.15 },
    wideS: { sp: [0.2, 1.3, 0], ru: [-1.5, 0, 0.7], rf: [-0.1], rh: [0, 0, 0.5], lu: [0.3, 0, 0.6], lf: [-0.5], cr: 0.1 },
    upW: { sp: [0.35, -0.4, 0], ru: [-0.2, 0, -0.4], rf: [-0.3], rh: [0.6, 0, 0], lu: [-0.4, 0, 0.4], lf: [-0.6], cr: 0.25 },
    upS: { sp: [-0.35, 0.3, 0], ru: [-2.8, 0, -0.2], rf: [-0.2], rh: [0.2, 0, 0], lu: [-0.2, 0, 0.6], lf: [-0.4] },
    drawW: { sp: [0.3, -0.8, 0], ru: [-0.3, 0, 0.5], rf: [-1.2], rh: [0, 0, 1.0], lu: [-0.4, 0, -0.2], lf: [-1.4], cr: 0.3, rt: [-0.6, 0], lt: [0.6, 0] },
    drawS: { sp: [0.25, 1.1, 0], ru: [-1.5, 0, 0.9], rf: [0], rh: [0, 0, 0.6], lu: [0.4, 0, 0.6], lf: [-0.3], cr: 0.25, rt: [-0.8, 0], lt: [0.7, 0] },
    // hammer
    hWindR: { sp: [0.1, -1.2, 0], ru: [-0.8, 0, -1.3], rf: [-0.5], lu: [-1.0, 0, -0.6], lf: [-0.9], rh: [0, 0, 0], cr: 0.15 },
    hSwingR: { sp: [0.25, 1.1, 0], ru: [-1.4, 0, 0.6], rf: [-0.2], lu: [-1.3, 0, 0.9], lf: [-0.4], cr: 0.12 },
    hWindL: { sp: [0.1, 1.1, 0], ru: [-1.2, 0, 0.9], rf: [-0.6], lu: [-1.0, 0, 1.2], lf: [-0.6], cr: 0.15 },
    hSwingL: { sp: [0.25, -1.2, 0], ru: [-1.3, 0, -1.0], rf: [-0.2], lu: [-1.2, 0, -0.3], lf: [-0.5], cr: 0.12 },
    hOverW: { sp: [-0.4, 0, 0], ru: [-3.0, 0, 0.15], rf: [-0.7], lu: [-3.0, 0, -0.15], lf: [-0.7], rh: [0.4, 0, 0], cr: 0.05 },
    hOverS: { sp: [0.65, 0, 0], ru: [-0.9, 0, 0.25], rf: [-0.1], lu: [-0.9, 0, -0.25], lf: [-0.1], rh: [-0.5, 0, 0], cr: 0.35, rt: [-0.5, 0], lt: [0.5, 0], rs: [0.6], ls: [0.3] },
    stompW: { sp: [-0.1, 0, 0], ru: [-0.3, 0, -0.9], rf: [-0.4], lu: [-0.3, 0, 0.9], lf: [-0.4], rt: [-1.3, 0], rs: [1.2] },
    stompS: { sp: [0.3, 0, 0], ru: [0.2, 0, -1.2], rf: [-0.2], lu: [0.2, 0, 1.2], lf: [-0.2], cr: 0.3, rt: [-0.3, 0], rs: [0.4] },
    // daggers
    dWindR: { sp: [0.1, -0.5, 0], ru: [-0.4, 0, -0.4], rf: [-1.8], lu: [-1.2, 0, 0.3], lf: [-1.4] },
    dStabR: { sp: [0.25, 0.4, 0], ru: [-1.5, 0, -0.1], rf: [-0.15], lu: [-0.3, 0, 0.5], lf: [-1.4], cr: 0.1 },
    dWindL: { sp: [0.1, 0.5, 0], ru: [-1.2, 0, -0.3], rf: [-1.4], lu: [-0.4, 0, 0.4], lf: [-1.8] },
    dStabL: { sp: [0.25, -0.4, 0], ru: [-0.3, 0, -0.5], rf: [-1.4], lu: [-1.5, 0, 0.1], lf: [-0.15], cr: 0.1 },
    dCrossW: { sp: [0.2, 0, 0], ru: [-1.6, 0, 0.6], rf: [-1.0], lu: [-1.6, 0, -0.6], lf: [-1.0], cr: 0.15 },
    dCrossS: { sp: [0.25, 0, 0], ru: [-1.1, 0, -1.3], rf: [-0.1], lu: [-1.1, 0, 1.3], lf: [-0.1], cr: 0.2 },
    // fists
    gWindR: { sp: [0.15, -0.5, 0], ru: [-0.6, 0, -0.3], rf: [-2.0], lu: [-1.1, 0, 0.3], lf: [-1.9] },
    gJabR: { sp: [0.2, 0.55, 0], ru: [-1.55, 0, 0.1], rf: [-0.1], lu: [-0.8, 0, 0.3], lf: [-2.0], cr: 0.08 },
    gWindL: { sp: [0.15, 0.5, 0], ru: [-1.1, 0, -0.3], rf: [-1.9], lu: [-0.6, 0, 0.3], lf: [-2.0] },
    gJabL: { sp: [0.2, -0.55, 0], ru: [-0.8, 0, -0.3], rf: [-2.0], lu: [-1.55, 0, -0.1], lf: [-0.1], cr: 0.08 },
    gHookWR: { sp: [0.1, -0.9, 0], ru: [-0.9, 0, -1.3], rf: [-1.6], lu: [-1.1, 0, 0.3], lf: [-1.9] },
    gHookR: { sp: [0.2, 0.9, 0], ru: [-1.4, 0, 0.3], rf: [-1.4], lu: [-0.8, 0, 0.3], lf: [-2.0] },
    gHookWL: { sp: [0.1, 0.9, 0], ru: [-1.1, 0, -0.3], rf: [-1.9], lu: [-0.9, 0, 1.3], lf: [-1.6] },
    gHookL: { sp: [0.2, -0.9, 0], ru: [-0.8, 0, -0.3], rf: [-2.0], lu: [-1.4, 0, -0.3], lf: [-1.4] },
    gUpW: { sp: [0.4, -0.3, 0], ru: [-0.1, 0, -0.3], rf: [-1.8], lu: [-1.1, 0, 0.3], lf: [-1.9], cr: 0.35 },
    gUpS: { sp: [-0.3, 0.3, 0], ru: [-2.7, 0, 0], rf: [-0.5], lu: [-0.6, 0, 0.3], lf: [-1.8] },
    kickW: { sp: [-0.2, 0, 0], ru: [-0.8, 0, -0.5], rf: [-1.0], lu: [-0.4, 0, 0.6], lf: [-1.0], rt: [-0.9, 0], rs: [1.6] },
    kickS: { sp: [-0.35, 0, 0], ru: [-0.6, 0, -0.7], rf: [-0.8], lu: [-0.3, 0, 0.8], lf: [-1.0], rt: [-1.7, 0], rs: [0.0] },
    // rifle
    rAim: { sp: [0.05, 0.2, 0], ru: [-1.45, 0, 0.15], rf: [-0.05], rh: [0, 0, 0], lu: [-1.45, 0, -0.55], lf: [-0.25], hd: [0, -0.2, 0] },
    rRecoil: { sp: [-0.05, 0.2, 0], ru: [-1.65, 0, 0.15], rf: [-0.25], rh: [0, 0, 0], lu: [-1.55, 0, -0.55], lf: [-0.35], hd: [0, -0.2, 0] },
    rBashW: { sp: [0, -0.6, 0], ru: [-1.0, 0, -0.2], rf: [-1.4], lu: [-1.3, 0, -0.2], lf: [-1.2] },
    rBashS: { sp: [0.3, 0.6, 0], ru: [-1.7, 0, 0.4], rf: [-0.6], lu: [-1.6, 0, 0.2], lf: [-0.8], cr: 0.08 },
    throwW: { sp: [-0.2, -0.6, 0], ru: [-0.9, 0, 0.2], rf: [-1.2], lu: [-2.8, 0, -0.4], lf: [-1.0] },
    throwS: { sp: [0.3, 0.5, 0], ru: [-1.3, 0, 0.2], rf: [-0.6], lu: [-1.2, 0, 0.2], lf: [-0.2] },
    // defensive
    blockP: { sp: [0.1, 0, 0], ru: [-1.6, 0, 0.45], rf: [-1.6], lu: [-1.6, 0, -0.45], lf: [-1.6], cr: 0.12, hd: [0.25, 0, 0] },
  };
  SP.POSES = P;

  /* idle stance per grip */
  const STANCE = {
    one: { sp: [0.08, -0.15, 0], ru: [-0.55, 0, -0.25], rf: [-1.0], rh: [0, 0, 0], lu: [-0.2, 0, 0.25], lf: [-0.9], hd: [0, 0.1, 0] },
    two: { sp: [0.12, -0.3, 0], ru: [-0.75, 0, -0.1], rf: [-0.9], rh: [0, 0, 0], lu: [-0.9, 0, -0.5], lf: [-0.9], hd: [0, 0.2, 0] },
    dual: { sp: [0.15, 0, 0], ru: [-0.6, 0, -0.25], rf: [-1.5], rh: [0, 0, 0], lu: [-0.6, 0, 0.25], lf: [-1.5] },
    fists: { sp: [0.12, -0.2, 0], ru: [-0.8, 0, -0.15], rf: [-2.0], rh: [0, 0, 0], lu: [-0.95, 0, 0.15], lf: [-2.0], hd: [0.1, 0.15, 0] },
    spear: { sp: [0.08, -0.3, 0], ru: [-0.5, 0, -0.2], rf: [-1.1], rh: [0, 0, 0], lu: [-0.9, 0, 0.3], lf: [-1.0], hd: [0, 0.25, 0] },
    rifle: { sp: [0.05, 0.1, 0], ru: [-0.9, 0, 0.1], rf: [-0.7], rh: [0, 0, 0], lu: [-1.0, 0, -0.5], lf: [-0.9] },
  };
  const BLOCK = {
    one: { sp: [0.1, 0, 0], ru: [-1.5, 0, 0.6], rf: [-0.9], rh: [0, 0, 1.2], lu: [-0.6, 0, 0.3], lf: [-1.2], cr: 0.1 },
    two: { sp: [0.15, 0, 0], ru: [-1.4, 0, 0.5], rf: [-1.0], rh: [0, 0, 1.3], lu: [-1.4, 0, -0.5], lf: [-1.0], cr: 0.15 },
    dual: { sp: [0.15, 0, 0], ru: [-1.4, 0, 0.6], rf: [-1.5], rh: [0, 0, 0.8], lu: [-1.4, 0, -0.6], lf: [-1.5], lh: [0, 0, -0.8], cr: 0.12 },
    fists: P.blockP,
    spear: { sp: [0.1, 0, 0], ru: [-1.3, 0, 0.5], rf: [-1.0], rh: [0, 0, 1.4], lu: [-1.3, 0, -0.3], lf: [-1.0], cr: 0.12 },
    rifle: { sp: [0.1, 0, 0], ru: [-1.3, 0, 0.6], rf: [-1.2], rh: [0, 0, 1.3], lu: [-1.4, 0, -0.4], lf: [-1.3], cr: 0.12 },
  };
  const JOINTS = ['sp', 'hd', 'ru', 'rf', 'rh', 'lu', 'lf', 'lh', 'rt', 'rs', 'lt', 'ls'];
  const DEF = { sp: [0, 0, 0], hd: [0, 0, 0], ru: [0, 0, -0.1], rf: [0], rh: [0, 0, 0], lu: [0, 0, 0.1], lf: [0], lh: [0, 0, 0], rt: [0, 0], rs: [0], lt: [0, 0], ls: [0], cr: 0 };

  /* ---------------- geometry helpers ---------------- */
  const geoCache = {};
  function geo(key, mk) { return geoCache[key] || (geoCache[key] = mk()); }
  const capsule = (r, h) => geo('cap' + r + '_' + h, () => {
    // lathe capsule centred, extending downward from origin (limb segment)
    const pts = [];
    for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * r, -Math.cos(a) * r - h)); }
    for (let i = 6; i >= 0; i--) { const a = (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * r, Math.cos(a) * r)); }
    pts.reverse();
    return new THREE.LatheGeometry(pts, 10);
  });
  const box = (w, h, d) => geo('box' + w + h + d, () => new THREE.BoxGeometry(w, h, d));
  const sph = (r, ws = 14, hs = 10) => geo('sph' + r + ws, () => new THREE.SphereGeometry(r, ws, hs));
  const cyl = (rt, rb, h, s = 10) => geo('cyl' + rt + rb + h + s, () => new THREE.CylinderGeometry(rt, rb, h, s));

  function mesh(g, m, x = 0, y = 0, z = 0, parent) {
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z);
    o.castShadow = true;
    if (parent) parent.add(o);
    return o;
  }
  function joint(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

  /* ---------------- weapons ---------------- */
  function buildWeapon(family, accent, variant) {
    const g = new THREE.Group();
    const metal = G.mat('#c9d2e3', { metalness: 0.85, roughness: 0.25 });
    const dark = G.mat('#1a1e28', { metalness: 0.6, roughness: 0.4 });
    let col = accent;
    if (variant === 'gold') col = '#ffbf3d';
    const energy = new THREE.MeshBasicMaterial({ color: col });
    const energySoft = G.addMat(col, 0.35);
    const parts = { tip: new THREE.Vector3(0, -1, 0), base: new THREE.Vector3(0, -0.15, 0), energy: [energy, energySoft] };
    // weapons extend along -Y (continuation of forearm)
    if (family === 'katana') {
      mesh(cyl(0.03, 0.03, 0.26, 8), dark, 0, 0.02, 0, g);
      mesh(box(0.16, 0.025, 0.06), metal, 0, -0.12, 0, g);
      const blade = mesh(box(0.035, 1.05, 0.012), energy, 0, -0.66, 0, g);
      blade.castShadow = false;
      mesh(box(0.09, 1.1, 0.03), energySoft, 0, -0.66, 0, g).castShadow = false;
      parts.tip.set(0, -1.2, 0); parts.base.set(0, -0.15, 0);
    } else if (family === 'hammer') {
      mesh(cyl(0.035, 0.035, 1.25, 8), dark, 0, -0.35, 0, g);
      const head = new THREE.Group(); head.position.set(0, -1.0, 0); g.add(head);
      mesh(box(0.34, 0.34, 0.62), G.mat('#2a2f3d', { metalness: 0.8, roughness: 0.3 }), 0, 0, 0, head);
      mesh(box(0.36, 0.08, 0.64), energy, 0, 0.1, 0, head).castShadow = false;
      mesh(box(0.36, 0.08, 0.64), energy, 0, -0.1, 0, head).castShadow = false;
      mesh(sph(0.26, 12, 8), energySoft, 0, 0, 0.36, head).castShadow = false;
      parts.tip.set(0, -1.15, 0); parts.base.set(0, -0.7, 0);
      g.position.y = 0.25; // grip low on the haft
    } else if (family === 'daggers') {
      mesh(cyl(0.025, 0.025, 0.14, 6), dark, 0, 0, 0, g);
      mesh(box(0.1, 0.02, 0.04), metal, 0, -0.08, 0, g);
      mesh(box(0.035, 0.42, 0.01), energy, 0, -0.3, 0, g).castShadow = false;
      mesh(box(0.08, 0.44, 0.02), energySoft, 0, -0.3, 0, g).castShadow = false;
      parts.tip.set(0, -0.52, 0); parts.base.set(0, -0.08, 0);
    } else if (family === 'spear') {
      mesh(cyl(0.03, 0.03, 2.4, 8), G.mat('#2a3142', { metalness: 0.7, roughness: 0.3 }), 0, -0.45, 0, g);
      mesh(cyl(0.05, 0.05, 0.08, 8), energy, 0, -0.2, 0, g).castShadow = false;
      mesh(cyl(0.05, 0.05, 0.08, 8), energy, 0, 0.5, 0, g).castShadow = false;
      const head = mesh(geo('spearhead', () => new THREE.ConeGeometry(0.07, 0.5, 4)), energy, 0, -1.9, 0, g);
      head.rotation.x = Math.PI; head.castShadow = false;
      mesh(geo('spearglow', () => new THREE.ConeGeometry(0.14, 0.62, 6)), energySoft, 0, -1.9, 0, g).rotation.x = Math.PI;
      parts.tip.set(0, -2.15, 0); parts.base.set(0, -1.4, 0);
    } else if (family === 'rifle') {
      const r = new THREE.Group(); r.rotation.x = 0; g.add(r);
      mesh(box(0.1, 0.75, 0.16), G.mat('#2a3142', { metalness: 0.7, roughness: 0.35 }), 0, -0.25, 0.02, r);
      mesh(box(0.05, 0.4, 0.05), dark, 0, -0.78, 0.02, r);
      mesh(box(0.11, 0.08, 0.17), energy, 0, -0.45, 0.02, r).castShadow = false;
      mesh(box(0.06, 0.2, 0.1), dark, 0, 0.2, -0.04, r);
      mesh(cyl(0.035, 0.035, 0.08, 8), energy, 0, -1.0, 0.02, r).castShadow = false;
      parts.tip.set(0, -1.02, 0.02); parts.base.set(0, -0.6, 0.02);
      parts.heatMat = energy;
    } else if (family === 'gauntlets') {
      // gauntlet covers fist; built per hand by caller
      mesh(box(0.15, 0.16, 0.15), G.mat('#2a3142', { metalness: 0.8, roughness: 0.3 }), 0, -0.05, 0, g);
      mesh(box(0.16, 0.04, 0.16), energy, 0, -0.1, 0, g).castShadow = false;
      mesh(sph(0.13, 10, 8), energySoft, 0, -0.1, 0.02, g).castShadow = false;
      parts.tip.set(0, -0.14, 0); parts.base.set(0, 0.1, 0);
    }
    return { group: g, parts };
  }

  /* ---------------- fighter model ---------------- */
  function Model(opts) {
    this.opts = opts;
    this.root = new THREE.Group();
    this.build();
  }
  SP.Model = Model;

  Model.prototype.build = function () {
    const o = this.opts;
    const ap = o.appearance;
    const root = this.root;
    while (root.children.length) root.remove(root.children[0]);
    const skin = G.mat(SP.SKIN_TONES[ap.skin] || ap.skinHex || '#c98e66', { roughness: 0.65, metalness: 0 });
    const prim = G.mat(ap.colors.primary, { roughness: 0.55, metalness: 0.3 });
    const sec = G.mat(ap.colors.secondary, { roughness: 0.45, metalness: 0.5 });
    const dark = G.mat('#12151d', { roughness: 0.6, metalness: 0.3 });
    const glow = new THREE.MeshBasicMaterial({ color: ap.colors.accent });
    this.glowMat = glow;
    const hair = G.mat(SP.HAIR_COLORS[ap.hairColor] || '#141418', { roughness: 0.8 });
    const eyeM = new THREE.MeshBasicMaterial({ color: SP.EYE_COLORS[ap.eyeColor] || '#2fb4ff' });
    const S = ap.styles;
    const bw = ap.build || 1, sh = ap.shoulders || 1;
    const scale = (ap.height || 1) * (o.scale || 1);
    this.scale = scale;

    this.body = new THREE.Group(); root.add(this.body);
    this.body.scale.setScalar(scale);
    const hips = joint(this.body, 0, 0.98, 0); this.hips = hips;
    // pelvis
    mesh(box(0.34 * bw, 0.18, 0.2), S.legs === 'shorts' ? prim : (S.legs === 'plated' ? sec : prim), 0, -0.02, 0, hips);
    const spine = joint(hips, 0, 0.06, 0); this.spine = spine;
    // torso
    const tW = 0.36 * bw, tH = 0.5;
    const chest = new THREE.Group(); spine.add(chest);
    const torsoMat = S.torso === 'tank' ? prim : prim;
    mesh(geo('torso' + bw, () => { const g = new THREE.CylinderGeometry(0.19 * bw * sh, 0.15 * bw, tH, 10); g.translate(0, tH / 2, 0); g.scale(1, 1, 0.68); return g; }), torsoMat, 0, 0, 0, chest);
    // torso style
    if (S.torso === 'runner') {
      mesh(box(tW * 1.02, 0.08, 0.28), sec, 0, 0.42, 0, chest);
      mesh(box(0.04, 0.4, 0.02), glow, -0.06, 0.25, 0.135, chest).castShadow = false;
      mesh(box(0.04, 0.4, 0.02), glow, 0.06, 0.25, 0.135, chest).castShadow = false;
    } else if (S.torso === 'plate') {
      mesh(box(tW * 1.15, 0.32, 0.3), sec, 0, 0.3, 0.01, chest);
      mesh(box(0.12, 0.05, 0.02), glow, 0, 0.32, 0.165, chest).castShadow = false;
      mesh(box(0.2, 0.12, 0.26), sec, -0.22 * sh, 0.46, 0, chest).rotation.z = 0.3;
      mesh(box(0.2, 0.12, 0.26), sec, 0.22 * sh, 0.46, 0, chest).rotation.z = -0.3;
    } else if (S.torso === 'coat') {
      mesh(box(tW * 1.08, 0.5, 0.28), sec, 0, 0.25, 0, chest);
      const tail = mesh(box(tW * 1.1, 0.55, 0.05), sec, 0, -0.2, -0.13, hips); tail.rotation.x = 0.12;
      mesh(box(0.02, 0.45, 0.02), glow, 0, 0.25, 0.145, chest).castShadow = false;
    } else if (S.torso === 'core') {
      mesh(box(tW * 1.05, 0.38, 0.29), dark, 0, 0.28, 0, chest);
      mesh(sph(0.07, 12, 8), glow, 0, 0.32, 0.14, chest).castShadow = false;
      mesh(geo('coreRing', () => new THREE.TorusGeometry(0.1, 0.015, 6, 20)), sec, 0, 0.32, 0.14, chest);
      mesh(box(0.18, 0.1, 0.24), sec, -0.21 * sh, 0.47, 0, chest);
      mesh(box(0.18, 0.1, 0.24), sec, 0.21 * sh, 0.47, 0, chest);
    } else { // tank
      mesh(box(0.03, 0.3, 0.02), glow, 0, 0.28, 0.122, chest).castShadow = false;
    }
    // belt
    mesh(box(0.35 * bw, 0.06, 0.22), dark, 0, 0.02, 0, chest);
    mesh(box(0.06, 0.05, 0.02), glow, 0, 0.02, 0.11, chest).castShadow = false;

    // neck / head
    const neck = joint(chest, 0, tH, 0);
    mesh(cyl(0.055, 0.065, 0.1, 8), skin, 0, 0.04, 0, neck);
    const head = joint(neck, 0, 0.1, 0); this.head = head;
    const face = SP.FACES[ap.face] ? ap.face : 0;
    const hw = [1, 0.94, 1.04, 1.0, 0.96][face], hh = [1, 1.04, 0.98, 1.02, 0.98][face];
    const skull = mesh(sph(0.13, 16, 12), skin, 0, 0.12, 0, head); skull.scale.set(hw * 0.92, hh * 1.06, 1.0);
    // jaw
    const jaw = mesh(box(0.15 * hw, 0.07, 0.14), skin, 0, 0.04, 0.02, head);
    if (face === 2 || face === 3) jaw.scale.set(1.1, 1.1, 1);
    if (face === 4) jaw.scale.set(0.9, 0.9, 0.95);
    // eyes & brows
    const ey = 0.13, ez = 0.118;
    const eyeG = box(0.035, face === 1 ? 0.012 : 0.018, 0.01);
    mesh(eyeG, eyeM, -0.045, ey, ez, head).castShadow = false;
    mesh(eyeG, eyeM, 0.045, ey, ez, head).castShadow = false;
    const brow = box(0.05, 0.012, 0.012);
    const br1 = mesh(brow, hair, -0.045, ey + 0.03, ez, head), br2 = mesh(brow, hair, 0.045, ey + 0.03, ez, head);
    const ba = [0, 0.2, 0, 0.35, -0.15][face];
    br1.rotation.z = -ba; br2.rotation.z = ba;
    mesh(box(0.02, 0.035, 0.02), skin, 0, 0.1, 0.13, head); // nose
    // hair
    const hs = ap.hairStyle;
    const hid = (SP.HAIR_STYLES[hs] || SP.HAIR_STYLES[0]).id;
    if (hid !== 'none' && S.head !== 'helm' && S.head !== 'crest' && S.head !== 'hood') {
      if (hid === 'short') { const c = mesh(sph(0.135, 14, 8), hair, 0, 0.15, -0.01, head); c.scale.set(hw * 0.95, 0.85, 1.02); }
      if (hid === 'mohawk') { mesh(box(0.04, 0.12, 0.26), hair, 0, 0.25, -0.01, head); const c = mesh(sph(0.133, 12, 8), hair, 0, 0.14, -0.01, head); c.scale.set(hw * 0.93, 0.6, 1.0); }
      if (hid === 'spikes') { for (let i = 0; i < 7; i++) { const s = mesh(geo('spike', () => new THREE.ConeGeometry(0.04, 0.14, 5)), hair, Math.sin(i * 0.9) * 0.08, 0.24, Math.cos(i * 0.9) * 0.08 - 0.02, head); s.rotation.set(Math.cos(i * 0.9) * 0.6, 0, -Math.sin(i * 0.9) * 0.6); } const c = mesh(sph(0.135, 12, 8), hair, 0, 0.15, -0.01, head); c.scale.set(hw * 0.95, 0.8, 1.02); }
      if (hid === 'long') { const c = mesh(sph(0.14, 14, 8), hair, 0, 0.15, -0.015, head); c.scale.set(hw * 0.98, 0.9, 1.05); mesh(box(0.26, 0.34, 0.08), hair, 0, -0.03, -0.1, head); }
      if (hid === 'bun') { const c = mesh(sph(0.135, 14, 8), hair, 0, 0.15, -0.01, head); c.scale.set(hw * 0.95, 0.85, 1.02); mesh(sph(0.07, 10, 8), hair, 0, 0.26, -0.08, head); }
      if (hid === 'bob') { const c = mesh(sph(0.145, 14, 8), hair, 0, 0.13, -0.015, head); c.scale.set(hw * 1.0, 0.95, 1.06); mesh(box(0.3, 0.12, 0.2), hair, 0, 0.06, -0.04, head); }
    }
    // head gear
    if (S.head === 'visor') { const v = mesh(box(0.25, 0.05, 0.08), glow, 0, 0.135, 0.09, head); v.castShadow = false; mesh(box(0.27, 0.025, 0.1), dark, 0, 0.165, 0.08, head); }
    if (S.head === 'band') { mesh(geo('band', () => new THREE.TorusGeometry(0.135, 0.015, 6, 24)), glow, 0, 0.19, 0, head).rotation.x = Math.PI / 2; }
    if (S.head === 'helm' || S.head === 'crest') {
      const hm = mesh(sph(0.155, 16, 12), sec, 0, 0.14, 0, head); hm.scale.set(hw, 1.05, 1.08);
      mesh(box(0.24, 0.05, 0.05), glow, 0, 0.13, 0.14, head).castShadow = false;
      if (S.head === 'crest') { mesh(box(0.03, 0.12, 0.3), glow, 0, 0.3, -0.02, head).castShadow = false; mesh(box(0.05, 0.08, 0.32), prim, 0, 0.26, -0.02, head); }
    }
    if (S.head === 'hood') { const h = mesh(sph(0.165, 16, 12), dark, 0, 0.14, -0.015, head); h.scale.set(hw * 1.02, 1.05, 1.1); mesh(box(0.2, 0.03, 0.02), glow, 0, 0.12, 0.155, head).castShadow = false; }
    if (S.head === 'mask') { mesh(box(0.17, 0.09, 0.06), sec, 0, 0.05, 0.11, head); mesh(box(0.12, 0.015, 0.01), glow, 0, 0.06, 0.142, head).castShadow = false; }

    // arms
    const armR = 0.055 * Math.sqrt(bw);
    const mkArm = (side) => {
      const sx = side * -0.215 * sh; // right = -X
      const sho = joint(chest, sx, tH - 0.06, 0);
      mesh(sph(0.075 * bw, 10, 8), S.arms === 'plated' ? sec : prim, 0, 0, 0, sho);
      const upper = joint(sho, 0, 0, 0);
      const armMat = S.arms === 'bare' || S.arms === 'wraps' ? skin : (S.arms === 'cyber' ? sec : prim);
      mesh(capsule(armR, 0.22), armMat, 0, 0, 0, upper);
      if (S.arms === 'plated') { const p = mesh(box(0.12, 0.14, 0.12), sec, 0, -0.08, 0, upper); p.castShadow = true; }
      if (S.arms === 'cyber') mesh(box(0.02, 0.18, 0.02), glow, side * -0.05, -0.12, 0.03, upper).castShadow = false;
      const fore = joint(upper, 0, -0.26, 0);
      mesh(capsule(armR * 0.92, 0.2), S.arms === 'bare' ? skin : (S.arms === 'wraps' ? dark : armMat), 0, 0, 0, fore);
      if (S.arms === 'guards' || S.arms === 'plated' || S.arms === 'cyber') { mesh(box(0.11, 0.15, 0.11), sec, 0, -0.12, 0, fore); mesh(box(0.115, 0.02, 0.115), glow, 0, -0.16, 0, fore).castShadow = false; }
      if (S.arms === 'wraps') mesh(box(0.1, 0.03, 0.1), glow, 0, -0.17, 0, fore).castShadow = false;
      const hand = joint(fore, 0, -0.25, 0);
      mesh(sph(0.05, 8, 6), skin, 0, -0.02, 0, hand);
      return { sho, upper, fore, hand };
    };
    const R = mkArm(1), L = mkArm(-1);
    this.ru = R.upper; this.rf = R.fore; this.rh = R.hand; this.lu = L.upper; this.lf = L.fore; this.lh = L.hand;

    // legs
    const legR = 0.075 * Math.sqrt(bw);
    const mkLeg = (side) => {
      const th = joint(hips, side * -0.1 * bw, -0.06, 0);
      const legMat = S.legs === 'shorts' ? skin : prim;
      mesh(capsule(legR, 0.34), legMat, 0, 0, 0, th);
      if (S.legs === 'shorts') { const s = mesh(capsule(legR * 1.15, 0.12), prim, 0, 0, 0, th); s.castShadow = true; }
      if (S.legs === 'cargo') { mesh(box(0.06, 0.1, 0.12), sec, side * -0.08, -0.2, 0, th); }
      if (S.legs === 'plated') { mesh(box(0.14, 0.2, 0.15), sec, 0, -0.16, 0.01, th); }
      if (S.legs === 'sleek') mesh(box(0.015, 0.3, 0.015), glow, side * -0.075, -0.18, 0, th).castShadow = false;
      const shin = joint(th, 0, -0.42, 0);
      mesh(capsule(legR * 0.85, 0.34), S.legs === 'shorts' ? skin : prim, 0, 0, 0, shin);
      if (S.legs === 'plated') mesh(box(0.11, 0.24, 0.06), sec, 0, -0.16, 0.06, shin);
      // knee
      mesh(sph(legR * 1.05, 8, 6), S.legs === 'plated' ? sec : prim, 0, 0, 0.01, shin);
      // feet
      const foot = joint(shin, 0, -0.42, 0);
      const fm = S.feet === 'sneakers' ? G.mat('#e8ecf3', { roughness: 0.5 }) : sec;
      mesh(box(0.11, 0.08, S.feet === 'greaves' ? 0.24 : 0.22), fm, 0, -0.03, 0.04, foot);
      if (S.feet === 'boots' || S.feet === 'greaves') mesh(box(0.11, 0.16, 0.12), S.feet === 'greaves' ? sec : dark, 0, 0.06, 0, foot);
      if (S.feet === 'greaves') mesh(box(0.115, 0.02, 0.12), glow, 0, 0.1, 0, foot).castShadow = false;
      if (S.feet === 'hover') { const h = mesh(box(0.12, 0.02, 0.2), glow, 0, -0.075, 0.04, foot); h.castShadow = false; }
      if (S.feet === 'sneakers') mesh(box(0.112, 0.02, 0.222), glow, 0, -0.06, 0.04, foot).castShadow = false;
      return { th, shin };
    };
    const RL = mkLeg(1), LL = mkLeg(-1);
    this.rt = RL.th; this.rs = RL.shin; this.lt = LL.th; this.ls = LL.shin;

    // boss / enemy extras
    if (o.extra === 'shield') {
      const shield = new THREE.Group(); this.lf.add(shield); shield.position.set(0.05, -0.18, 0.12);
      mesh(box(0.08, 0.95, 0.6), G.mat('#2a2f3d', { metalness: 0.8, roughness: 0.3 }), 0, 0, 0, shield);
      mesh(box(0.09, 0.08, 0.62), glow, 0, 0.3, 0, shield).castShadow = false;
      mesh(box(0.09, 0.08, 0.62), glow, 0, -0.3, 0, shield).castShadow = false;
      shield.rotation.set(0, 0, 0); this.shield = shield;
    }
    if (o.extra === 'core') {
      mesh(geo('halo', () => new THREE.TorusGeometry(0.28, 0.02, 6, 32)), glow, 0, 0.42, -0.06, this.head).rotation.x = 0.3;
    }

    // weapon
    this.setWeapon(o.weapon || 'katana', o.variant);

    // shadow blob (cheap ground shadow, always visible)
    const blob = new THREE.Mesh(geo('blob', () => { const g = new THREE.CircleGeometry(0.45, 20); g.rotateX(-Math.PI / 2); return g; }), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35, depthWrite: false }));
    blob.position.y = 0.02; root.add(blob); this.blob = blob;

    this.applyPose(Object.assign({}, DEF, STANCE[this.grip]), 0);
  };

  Model.prototype.setWeapon = function (family, variant) {
    if (this.wR) this.rh.remove(this.wR.group);
    if (this.wL) this.lh.remove(this.wL.group);
    this.wR = this.wL = null;
    const accent = this.opts.weaponColor || this.opts.appearance.colors.accent;
    this.family = family;
    this.grip = SP.WEAPONS[family].grip;
    const w = buildWeapon(family, accent, variant);
    this.wR = w; this.rh.add(w.group);
    // orient weapons: blade along -Y of hand = forearm direction
    if (family === 'rifle') { w.group.rotation.set(0, 0, 0); }
    if (family === 'daggers' || family === 'gauntlets') { const w2 = buildWeapon(family, accent, variant); this.wL = w2; this.lh.add(w2.group); }
    if (family === 'spear') w.group.position.y = 0.55;
  };

  Model.prototype.setAccent = function (c) {
    if (this.glowMat) this.glowMat.color.set(c);
  };

  /* apply a pose object to joints */
  Model.prototype.applyPose = function (p) {
    const s = (j, v) => { if (!j) return; j.rotation.x = v[0]; if (v.length > 1) { j.rotation.y = v[1] || 0; j.rotation.z = v[2] || 0; } };
    s(this.spine, p.sp); s(this.head, p.hd);
    s(this.ru, p.ru); this.rf.rotation.x = p.rf[0]; s(this.rh, p.rh);
    s(this.lu, p.lu); this.lf.rotation.x = p.lf[0]; s(this.lh, p.lh);
    this.rt.rotation.x = p.rt[0]; this.rt.rotation.z = p.rt[1] || 0; this.rs.rotation.x = p.rs[0];
    this.lt.rotation.x = p.lt[0]; this.lt.rotation.z = p.lt[1] || 0; this.ls.rotation.x = p.ls[0];
    this.hips.position.y = 0.98 - (p.cr || 0);
  };

  /* ---------------- animator ---------------- */
  function lerpPose(out, a, b, t) {
    for (const j of JOINTS) {
      const va = a[j] || DEF[j], vb = b[j] || DEF[j];
      const o = out[j] || (out[j] = [0, 0, 0]);
      o.length = va.length;
      for (let i = 0; i < va.length; i++) o[i] = va[i] + ((vb[i] == null ? 0 : vb[i]) - va[i]) * t;
    }
    out.cr = (a.cr || 0) + ((b.cr || 0) - (a.cr || 0)) * t;
    return out;
  }
  function fillPose(p, base) {
    const o = {};
    for (const j of JOINTS) o[j] = p[j] || base[j] || DEF[j];
    o.cr = p.cr != null ? p.cr : base.cr || 0;
    return o;
  }

  function Animator(model) {
    this.m = model;
    this.walkPh = 0;
    this.cur = fillPose({}, STANCE[model.grip]);
    this.tmp = {}; this.tmp2 = {}; this.tmp3 = {};
    this.spinYaw = 0;
  }
  SP.Animator = Animator;

  /* state: {speed (m/s), moving dir local, grounded, action: {type, anim, p, a, b, spin}, block, stun, dead, deadT, sprint, air, dodge} */
  Animator.prototype.update = function (dt, st) {
    const m = this.m;
    const stance = st.block ? BLOCK[m.grip] : STANCE[m.grip];
    // locomotion base
    const base = this.tmp;
    lerpPose(base, fillPose(stance, DEF), fillPose(stance, DEF), 0);
    const spd = st.speed || 0;
    const amt = U.clamp(spd / 6, 0, 1.3);
    this.walkPh += dt * (4 + spd * 1.6);
    const ph = this.walkPh;
    let bob = 0;
    if (st.grounded && amt > 0.05) {
      const fwd = st.localFwd == null ? 1 : st.localFwd; // -1..1 forward/back
      const side = st.localSide || 0;
      const sw = Math.sin(ph) * 0.75 * amt;
      base.rt[0] += sw * fwd; base.lt[0] -= sw * fwd;
      base.rt[1] = (base.rt[1] || 0) + Math.sin(ph) * 0.25 * side * amt; base.lt[1] = (base.lt[1] || 0) - Math.sin(ph) * 0.25 * side * amt;
      base.rs[0] += Math.max(0, Math.sin(ph + 1.4)) * 1.1 * amt;
      base.ls[0] += Math.max(0, Math.sin(ph + 1.4 + Math.PI)) * 1.1 * amt;
      if (!st.block && !st.action) {
        base.ru[0] -= sw * 0.35; base.lu[0] += sw * 0.35;
        base.sp[0] += 0.12 * amt * (st.sprint ? 1.8 : 1);
      }
      bob = Math.abs(Math.cos(ph)) * 0.05 * amt;
    } else if (!st.grounded) {
      base.rt[0] = -0.6; base.rs[0] = 1.0; base.lt[0] = -0.1; base.ls[0] = 0.5;
    } else {
      // idle breathing
      const b = Math.sin(ph * 0.4) * 0.025;
      base.sp[0] += b; base.ru[2] -= b * 0.5; base.lu[2] += b * 0.5;
      base.rt[0] = -0.15; base.lt[0] = 0.15; base.rs[0] = 0.25; base.ls[0] = 0.15; base.cr = (base.cr || 0) + 0.04;
    }

    let target = base;
    this.spinYaw = 0;
    const act = st.action;
    if (act && act.anim) {
      const w = fillPose(P[act.anim.w] || {}, base), s = fillPose(P[act.anim.s] || {}, base);
      const a = act.a, b = act.b, p = act.p;
      const out = this.tmp2;
      if (p < a) lerpPose(out, base, w, U.smooth(p / Math.max(a, 0.001)));
      else if (p < b) lerpPose(out, w, s, U.easeOut((p - a) / Math.max(b - a, 0.001)));
      else lerpPose(out, s, base, U.smooth((p - b) / Math.max(1 - b, 0.001)) * 0.85);
      // keep legs from locomotion unless pose specifies
      for (const j of ['rt', 'rs', 'lt', 'ls']) if (!(P[act.anim.w] || {})[j] && !(P[act.anim.s] || {})[j]) out[j] = base[j];
      if (act.anim.spin) {
        const sp = U.clamp((p - a) / Math.max(b - a, 0.001), 0, 1);
        this.spinYaw = U.smooth(sp) * Math.PI * 2 * act.anim.spin;
      }
      target = out;
    }
    if (st.stun) {
      const k = this.tmp3;
      lerpPose(k, base, fillPose({ sp: [-0.45, 0.2, 0.15], hd: [-0.4, 0, 0], ru: [-0.3, 0, -0.9], rf: [-0.5], lu: [-0.3, 0, 0.9], lf: [-0.5], cr: 0.12 }, base), Math.min(1, st.stun));
      target = k;
    }
    if (st.dodge) {
      const k = this.tmp3;
      lerpPose(k, base, fillPose({ sp: [0.7, 0, 0], hd: [0.3, 0, 0], ru: [-1.2, 0, -0.3], rf: [-1.8], lu: [-1.2, 0, 0.3], lf: [-1.8], rt: [-1.4, 0], rs: [2.0], lt: [-1.3, 0], ls: [2.1], cr: 0.45 }, base), Math.sin(Math.min(1, st.dodge) * Math.PI));
      target = k;
    }
    // smooth into target (fast so attacks stay crisp)
    const k = 1 - Math.exp(-(act ? 40 : 18) * dt);
    lerpPose(this.cur, this.cur, target, k);
    m.applyPose(this.cur);
    m.hips.position.y += bob * (st.grounded ? 1 : 0);
    // death
    if (st.dead) {
      const t = U.clamp(st.deadT * 2.2, 0, 1);
      m.body.rotation.x = -U.smooth(t) * 1.45;
      m.body.position.y = U.smooth(t) * 0.12;
    } else { m.body.rotation.x = 0; m.body.position.y = 0; }
    m.body.rotation.y = this.spinYaw;
  };

  /* world-space blade base/tip for trails */
  const _v = new THREE.Vector3();
  Model.prototype.bladePoints = function (outBase, outTip, left) {
    const w = left ? this.wL : this.wR;
    if (!w) return false;
    w.group.updateWorldMatrix(true, false);
    outBase.copy(w.parts.base).applyMatrix4(w.group.matrixWorld);
    outTip.copy(w.parts.tip).applyMatrix4(w.group.matrixWorld);
    return true;
  };
  Model.prototype.muzzle = function (out) {
    if (!this.wR) return out.set(0, 1.4, 0);
    this.wR.group.updateWorldMatrix(true, false);
    return out.copy(this.wR.parts.tip).applyMatrix4(this.wR.group.matrixWorld);
  };
  Model.prototype.headPos = function (out) { this.head.updateWorldMatrix(true, false); return out.setFromMatrixPosition(this.head.matrixWorld); };
})();
