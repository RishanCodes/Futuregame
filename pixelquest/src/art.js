/* PIXEL QUEST — art engine: pixel helpers, outlines, tiles, world objects, item icons */
'use strict';
(function () {
  const T = PQ.T;
  const Art = { S: {}, icons: {}, tiles: {}, fringe: {} };
  PQ.Art = Art;
  const OUT = '#120d18';

  /* ---------------- master palette ---------------- */
  const P = (Art.P = {
    grass: ['#1a3a2a', '#2a6038', '#43893d', '#6fb547', '#a8d85e'],
    dgrass: ['#0f1f1b', '#173029', '#22463a', '#326148', '#4c8a5c'],
    dirt: ['#3f2820', '#5f3d2b', '#83573a', '#a87a4f', '#cfa56e'],
    sand: ['#9a6b40', '#c79556', '#e3b871', '#f2d79a', '#fff0c8'],
    water: ['#12224a', '#173f7a', '#2468b0', '#3f97d6', '#86d0f0', '#d8f6ff'],
    snow: ['#5f7499', '#93abc9', '#c6d9ec', '#e9f2fb', '#ffffff'],
    ice: ['#3d6e9c', '#5e9cc9', '#8cc6e6', '#c2e7f7', '#f0fbff'],
    stone: ['#26252f', '#3f3e4d', '#5d5c6e', '#858598', '#b4b4c4', '#e0e0ea'],
    lava: ['#4a0f12', '#9e1f1b', '#e2471a', '#ff9a2e', '#ffe27a'],
    ash: ['#171314', '#261f20', '#3a302f', '#54453f', '#6e5c52'],
    shadow: ['#0b0814', '#191129', '#2b1d45', '#47306f', '#7552ad', '#b892f0'],
    wood: ['#2e1c12', '#4f321f', '#77492a', '#a06a3c', '#c99558'],
    leaf: ['#173d24', '#24602f', '#3b8a37', '#64b33f', '#9ad655'],
    pine: ['#0f2a22', '#1a4434', '#2a634a', '#3f8a5f'],
    dleaf: ['#0c1f22', '#123236', '#1c4a4a', '#2b6b60', '#46a083'],
    gold: ['#6b4310', '#a8701a', '#e0a92e', '#ffd75a', '#fff3b0'],
    red: ['#4a0e1a', '#8c1c2b', '#c9323a', '#ef6b55', '#ffb3a0'],
    skinTones: ['#ffe0c7', '#f2c29b', '#d99e72', '#b27a4e', '#8a5434', '#5e3722', '#a6d4a0', '#b3b8e6'],
  });

  /* ---------------- low-level pixel helpers ---------------- */
  const C = (Art.C = function (w, h) { return PQ.canvas(w, h); });
  Art.px = function (g, x, y, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1); };
  Art.rect = function (g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };
  /* shaded ellipse using a ramp (dark->light), light from top-left, ordered dithering at band edges */
  Art.blob = function (g, cx, cy, rx, ry, ramp, o = {}) {
    const lx = o.lx != null ? o.lx : -0.55, ly = o.ly != null ? o.ly : -0.8;
    const bias = o.bias || 0;
    for (let y = Math.floor(-ry); y <= Math.ceil(ry); y++) {
      for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
        const nx = (x + 0.5) / (rx + 0.5), ny = (y + 0.5) / (ry + 0.5);
        const d2 = nx * nx + ny * ny;
        if (d2 > 1) continue;
        const nz = Math.sqrt(1 - d2);
        let l = -(nx * lx + ny * ly) * 0.55 + nz * 0.55 + bias;
        const dith = (((x + y) & 1) ? 0.06 : -0.06) * (o.dither === false ? 0 : 1);
        l = PQ.U.clamp(l + dith, 0, 0.999);
        const idx = Math.floor(l * ramp.length);
        g.fillStyle = ramp[PQ.U.clamp(idx, 0, ramp.length - 1)];
        g.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
      }
    }
  };
  /* parse char-grid sprite */
  Art.grid = function (rows, pal, scale = 1) {
    const h = rows.length, w = Math.max(...rows.map((r) => r.length));
    const [c, g] = C(w * scale, h * scale);
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ' || !pal[ch]) continue;
      g.fillStyle = pal[ch]; g.fillRect(x * scale, y * scale, scale, scale);
    }
    return c;
  };
  /* selective outline: transparent pixels next to opaque ones become a darkened version of the neighbour */
  Art.outline = function (src, pad = 1, solid) {
    const w = src.width + pad * 2, h = src.height + pad * 2;
    const [c, g] = C(w, h);
    g.drawImage(src, pad, pad);
    const id = g.getImageData(0, 0, w, h), d = id.data;
    const out = new Uint8ClampedArray(d);
    const [or, og, ob] = PQ.U.hexToRgb(solid || OUT);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] > 40) continue;
      let best = -1;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const j = (Y * w + X) * 4;
        if (d[j + 3] > 40) { best = j; break; }
      }
      if (best >= 0) {
        if (solid) { out[i] = or; out[i + 1] = og; out[i + 2] = ob; }
        else { out[i] = d[best] * 0.28 + or * 0.5; out[i + 1] = d[best + 1] * 0.28 + og * 0.5; out[i + 2] = d[best + 2] * 0.28 + ob * 0.5; }
        out[i + 3] = 255;
      }
    }
    id.data.set(out); g.putImageData(id, 0, 0);
    return c;
  };
  Art.flip = function (src) {
    const [c, g] = C(src.width, src.height);
    g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
    return c;
  };
  Art.tint = function (src, color, alpha = 1) { // silhouette in a single colour
    const [c, g] = C(src.width, src.height);
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.globalAlpha = alpha; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  };
  Art.glowSprite = function (r, color) {
    const key = 'glow' + r + color;
    if (Art.S[key]) return Art.S[key];
    const [c, g] = C(r * 2, r * 2);
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
    return (Art.S[key] = c);
  };

  /* =========================================================
     TERRAIN TILES
     ========================================================= */
  const TL = (PQ.TILE = {
    GRASS: 0, DIRT: 1, SAND: 2, WATER: 3, DEEP: 4, SNOW: 5, ICE: 6, STONE: 7, CLIFF: 8, LAVA: 9, ASH: 10, DGRASS: 11,
    SHADOW: 12, VOID: 13, BRIDGE: 14, WOOD: 15, FLOOR: 16, WALL: 17, SOIL: 18, TILLED: 19, WET: 20, CRUST: 21, COBBLE: 22,
    BAR_R: 23, BAR_B: 24, CARPET: 25, BROKEN: 26, VINE: 27, PIT: 28,
  });
  // walk: 0 solid, 1 walk, 2 swim(slow)
  Art.TINFO = [];
  const def = (id, o) => (Art.TINFO[id] = Object.assign({ walk: 1, pri: 5, name: '' }, o));
  def(TL.GRASS, { pri: 8, name: 'grass' }); def(TL.DIRT, { pri: 5 }); def(TL.SAND, { pri: 4 }); def(TL.WATER, { walk: 2, pri: 2, water: 1 });
  def(TL.DEEP, { walk: 0, pri: 1, water: 1 }); def(TL.SNOW, { pri: 7 }); def(TL.ICE, { pri: 3 }); def(TL.STONE, { pri: 6 });
  def(TL.CLIFF, { walk: 0, pri: 0 }); def(TL.LAVA, { walk: 0, pri: 2, lava: 1 }); def(TL.ASH, { pri: 6 }); def(TL.DGRASS, { pri: 8 });
  def(TL.SHADOW, { pri: 7 }); def(TL.VOID, { walk: 0, pri: 0 }); def(TL.BRIDGE, { pri: 0 }); def(TL.WOOD, { pri: 0 });
  def(TL.FLOOR, { pri: 0 }); def(TL.WALL, { walk: 0, pri: 0 }); def(TL.SOIL, { pri: 0 }); def(TL.TILLED, { pri: 0 }); def(TL.WET, { pri: 0 });
  def(TL.CRUST, { pri: 0 }); def(TL.COBBLE, { pri: 5 }); def(TL.BAR_R, { walk: 0, pri: 0 }); def(TL.BAR_B, { walk: 0, pri: 0 });
  def(TL.CARPET, { pri: 0 }); def(TL.BROKEN, { walk: 0, pri: 2, water: 1 }); def(TL.VINE, { walk: 1, pri: 0, climb: 1 }); def(TL.PIT, { walk: 0, pri: 0 });

  function noiseTile(ramp, seed, opts = {}) {
    const [c, g] = C(T, T);
    const base = opts.base != null ? opts.base : 2;
    g.fillStyle = ramp[base]; g.fillRect(0, 0, T, T);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const h = PQ.U.hash2(x, y, seed);
      if (h < (opts.dark || 0.12)) Art.px(g, x, y, ramp[base - 1]);
      else if (h > 1 - (opts.light || 0.1)) Art.px(g, x, y, ramp[base + 1]);
    }
    return [c, g];
  }

  function makeTile(type, v, theme) {
    const s = type * 31 + v * 7 + 3;
    const R = PQ.RNG(s);
    let c, g;
    switch (type) {
      case TL.GRASS: case TL.DGRASS: {
        const ramp = type === TL.GRASS ? P.grass : P.dgrass;
        [c, g] = noiseTile(ramp, s, { base: 2, dark: 0.08, light: 0.06 });
        for (let i = 0; i < 6; i++) { // grass blades
          const x = R.int(0, 14), y = R.int(2, 15);
          Art.px(g, x, y, ramp[3]); Art.px(g, x, y - 1, ramp[3]); Art.px(g, x + 1, y, ramp[1]);
        }
        if (v === 3) for (let i = 0; i < 3; i++) Art.px(g, R.int(1, 14), R.int(1, 14), ramp[4]);
        break;
      }
      case TL.DIRT: {
        [c, g] = noiseTile(P.dirt, s, { base: 2, dark: 0.14, light: 0.1 });
        for (let i = 0; i < 3; i++) { const x = R.int(1, 13), y = R.int(1, 14); Art.rect(g, x, y, 2, 1, P.dirt[1]); Art.px(g, x, y - 1, P.dirt[3]); }
        break;
      }
      case TL.COBBLE: {
        [c, g] = C(T, T); Art.rect(g, 0, 0, T, T, P.stone[1]);
        const off = v & 1 ? 4 : 0;
        for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) {
          const x = col * 8 + (row & 1 ? 4 : 0) + off % 8, y = row * 4;
          Art.rect(g, x + 1, y + 1, 6, 2, R.chance(0.5) ? P.stone[3] : P.stone[2]); Art.rect(g, x + 1, y + 1, 6, 1, P.stone[4]);
        }
        break;
      }
      case TL.SAND: {
        [c, g] = noiseTile(P.sand, s, { base: 2, dark: 0.1, light: 0.12 });
        if (v % 2 === 0) for (let x = 0; x < T; x++) { const y = 5 + Math.round(Math.sin(x * 0.6 + v) * 1.5); Art.px(g, x, y, P.sand[1]); Art.px(g, x, y + 1, P.sand[3]); }
        break;
      }
      case TL.WATER: case TL.DEEP: case TL.BROKEN: {
        const ramp = P.water;
        [c, g] = C(T, T); Art.rect(g, 0, 0, T, T, type === TL.DEEP ? ramp[1] : ramp[2]);
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (PQ.U.hash2(x, y, s) < 0.07) Art.px(g, x, y, type === TL.DEEP ? ramp[0] : ramp[1]);
        if (type === TL.BROKEN) { // broken bridge stumps
          Art.rect(g, 0, 2, T, 2, P.wood[1]); Art.rect(g, 0, 12, T, 2, P.wood[1]);
          for (let x = 1; x < T; x += 5) { Art.rect(g, x, 1, 2, 4, P.wood[2]); Art.rect(g, x, 11, 2, 4, P.wood[2]); }
        }
        break;
      }
      case TL.SNOW: {
        [c, g] = noiseTile(P.snow, s, { base: 3, dark: 0.1, light: 0.08 });
        for (let i = 0; i < 2; i++) { const x = R.int(1, 12), y = R.int(2, 14); Art.rect(g, x, y, 3, 1, P.snow[2]); Art.rect(g, x, y - 1, 3, 1, P.snow[4]); }
        break;
      }
      case TL.ICE: {
        [c, g] = noiseTile(P.ice, s, { base: 2, dark: 0.05, light: 0.05 });
        for (let i = 0; i < 4; i++) Art.px(g, R.int(0, 15), R.int(0, 15), P.ice[4]);
        const y0 = R.int(2, 13); for (let x = R.int(0, 6); x < 16; x++) { if (R.chance(0.3)) break; Art.px(g, x, y0 + ((x / 4) | 0) % 2, P.ice[3]); }
        break;
      }
      case TL.STONE: {
        [c, g] = noiseTile(P.stone, s, { base: 2, dark: 0.12, light: 0.1 });
        for (let i = 0; i < 2; i++) { const x = R.int(1, 12), y = R.int(2, 13); Art.rect(g, x, y, 3, 2, P.stone[3]); Art.rect(g, x, y + 2, 3, 1, P.stone[1]); }
        break;
      }
      case TL.ASH: case TL.CRUST: {
        [c, g] = noiseTile(P.ash, s, { base: 2, dark: 0.14, light: 0.1 });
        if (type === TL.CRUST) { for (let i = 0; i < 6; i++) { const x = R.int(0, 14), y = R.int(0, 15); Art.rect(g, x, y, 2, 1, P.lava[1]); } }
        else if (v === 1) { Art.px(g, R.int(2, 13), R.int(2, 13), P.lava[2]); }
        break;
      }
      case TL.LAVA: {
        [c, g] = C(T, T); Art.rect(g, 0, 0, T, T, P.lava[2]);
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
          const h = PQ.U.hash2(x >> 1, y >> 1, s);
          if (h < 0.25) Art.px(g, x, y, P.lava[1]); else if (h > 0.85) Art.px(g, x, y, P.lava[3]);
        }
        break;
      }
      case TL.SHADOW: {
        [c, g] = noiseTile(P.shadow, s, { base: 2, dark: 0.15, light: 0.06 });
        if (v === 2) { Art.px(g, R.int(2, 13), R.int(2, 13), P.shadow[5]); }
        for (let i = 0; i < 3; i++) { const x = R.int(0, 14), y = R.int(1, 14); Art.rect(g, x, y, 2, 1, P.shadow[1]); }
        break;
      }
      case TL.VOID: {
        [c, g] = C(T, T); Art.rect(g, 0, 0, T, T, '#05030a');
        for (let i = 0; i < 3; i++) Art.px(g, R.int(0, 15), R.int(0, 15), R.chance(0.5) ? '#3a2a5a' : '#ffffff');
        break;
      }
      case TL.BRIDGE: {
        [c, g] = C(T, T);
        for (let y = 0; y < T; y += 4) { Art.rect(g, 0, y, T, 3, R.chance(0.5) ? P.wood[3] : P.wood[2]); Art.rect(g, 0, y + 3, T, 1, P.wood[0]); Art.px(g, 2, y + 1, P.wood[1]); Art.px(g, 13, y + 1, P.wood[1]); }
        break;
      }
      case TL.WOOD: {
        [c, g] = C(T, T);
        for (let x = 0; x < T; x += 4) { Art.rect(g, x, 0, 4, T, (x / 4 + v) % 2 ? P.wood[3] : P.wood[2]); Art.rect(g, x + 3, 0, 1, T, P.wood[1]); Art.rect(g, x, (x * 3 + v * 5) % 16, 3, 1, P.wood[1]); }
        break;
      }
      case TL.CARPET: {
        [c, g] = C(T, T); Art.rect(g, 0, 0, T, T, '#7a2e3a');
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if ((x + y) % 4 === 0) Art.px(g, x, y, '#9c3d4a');
        break;
      }
      case TL.SOIL: case TL.TILLED: case TL.WET: {
        [c, g] = noiseTile(P.dirt, s, { base: type === TL.WET ? 1 : 2, dark: 0.1, light: 0.06 });
        if (type !== TL.SOIL) { for (let y = 2; y < T; y += 4) { Art.rect(g, 1, y, 14, 1, type === TL.WET ? '#2a1912' : P.dirt[1]); Art.rect(g, 1, y + 1, 14, 1, type === TL.WET ? P.dirt[1] : P.dirt[3]); } }
        if (type === TL.WET) { g.fillStyle = 'rgba(30,40,80,0.18)'; g.fillRect(0, 0, T, T); }
        break;
      }
      case TL.FLOOR: case TL.WALL: case TL.BAR_R: case TL.BAR_B: case TL.PIT: {
        const th = Art.THEMES[theme || 'cave'];
        if (type === TL.FLOOR) {
          [c, g] = noiseTile(th.floor, s, { base: 2, dark: 0.12, light: 0.08 });
          if (th.tiles) { Art.rect(g, 0, 0, T, 1, th.floor[1]); Art.rect(g, 0, 0, 1, T, th.floor[1]); Art.rect(g, 1, 1, T - 1, 1, th.floor[3]); }
        } else if (type === TL.WALL) {
          [c, g] = C(T, T); Art.rect(g, 0, 0, T, T, th.wall[1]);
          for (let y = 0; y < T; y += 4) for (let x = (y / 4) % 2 ? -4 : 0; x < T; x += 8) { Art.rect(g, x + 1, y + 1, 6, 2, th.wall[2]); Art.rect(g, x + 1, y + 1, 6, 1, th.wall[3]); }
        } else if (type === TL.PIT) {
          [c, g] = C(T, T); Art.rect(g, 0, 0, T, T, '#050308'); Art.rect(g, 0, 0, T, 3, th.wall[0]);
        } else {
          [c, g] = noiseTile(th.floor, s, { base: 2 });
          const col = type === TL.BAR_R ? ['#5a1020', '#c8324a', '#ff8095'] : ['#10204a', '#3255c8', '#80a8ff'];
          Art.rect(g, 1, 3, 14, 12, col[0]); Art.rect(g, 2, 2, 12, 11, col[1]); Art.rect(g, 3, 3, 10, 2, col[2]); Art.rect(g, 4, 6, 2, 5, col[2]);
        }
        break;
      }
      default: [c, g] = C(T, T); Art.rect(g, 0, 0, T, T, '#f0f');
    }
    return c;
  }

  Art.THEMES = {
    cave: { floor: ['#1f1a1a', '#2f2826', '#463b36', '#5d4f47', '#7a6a5e'], wall: ['#141012', '#2b2321', '#40342f', '#5c4c43'], light: '#ffb060', name: 'Mossy Hollow' },
    forest: { floor: ['#132420', '#1d362c', '#2a4a3a', '#3b6650', '#5a8a66'], wall: ['#0e1a16', '#223a2e', '#35583f', '#4e7a52'], tiles: 1, light: '#8dffb0', name: 'Thornheart Temple' },
    desert: { floor: ['#6b4a2a', '#9a6e3e', '#c4955a', '#ddb579', '#f2d8a4'], wall: ['#4a301c', '#7a5530', '#a87a46', '#d1a467'], tiles: 1, light: '#ffd070', name: 'Sunken Pyramid' },
    ice: { floor: ['#2c4a6e', '#3f6b96', '#5e93c0', '#8cbede', '#c6e6f6'], wall: ['#1a2c48', '#2d4c78', '#4b74a6', '#79a6d0'], tiles: 1, light: '#a8e8ff', name: 'Glacier Sanctum' },
    fire: { floor: ['#1a1010', '#2b1a17', '#40261f', '#5a352a', '#7a4a36'], wall: ['#100a0a', '#2a1512', '#4a2018', '#6e2f1e'], tiles: 1, light: '#ff7a30', name: 'Magma Forge' },
    shadow: { floor: ['#0d0a16', '#181127', '#251a3b', '#382657', '#523a7e'], wall: ['#08060e', '#1a1230', '#2c1f4c', '#45307a'], tiles: 1, light: '#b88cff', name: 'Umbral Citadel' },
    home: { floor: P.wood, wall: ['#2e1c12', '#5f4a3a', '#7d6550', '#9c8268'], tiles: 0, light: '#ffd28a', name: 'Home' },
  };

  Art.tile = function (type, v = 0, theme) {
    const key = type + ':' + v + ':' + (theme || '');
    let t = Art.tiles[key];
    if (!t) t = Art.tiles[key] = makeTile(type, v, theme);
    return t;
  };

  /* fringe masks: irregular edges drawn from a higher-priority neighbour onto this tile */
  const masks = {};
  function edgeMask(dir) {
    if (masks[dir]) return masks[dir];
    const [c, g] = C(T, T);
    g.fillStyle = '#fff';
    for (let i = 0; i < T; i++) {
      const d = 2 + Math.round(1.5 + Math.sin(i * 1.3) * 1.2 + Math.sin(i * 0.47 + 1) * 1);
      if (dir === 'n') g.fillRect(i, 0, 1, d);
      if (dir === 's') g.fillRect(i, T - d, 1, d);
      if (dir === 'w') g.fillRect(0, i, d, 1);
      if (dir === 'e') g.fillRect(T - d, i, d, 1);
    }
    return (masks[dir] = c);
  }
  Art.fringeTile = function (type, dir) {
    const key = type + dir;
    if (Art.fringe[key]) return Art.fringe[key];
    const [c, g] = C(T, T);
    g.drawImage(Art.tile(type, 0), 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(edgeMask(dir), 0, 0);
    g.globalCompositeOperation = 'source-over';
    // darker/lighter rim to sell the edge
    const id = g.getImageData(0, 0, T, T), d = id.data;
    const ramp = { [TL.GRASS]: P.grass, [TL.DGRASS]: P.dgrass, [TL.SNOW]: P.snow, [TL.SAND]: P.sand, [TL.DIRT]: P.dirt, [TL.STONE]: P.stone, [TL.ASH]: P.ash, [TL.SHADOW]: P.shadow, [TL.COBBLE]: P.stone, [TL.ICE]: P.ice }[type];
    if (ramp) {
      const rim = PQ.U.hexToRgb(ramp[1]);
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const i = (y * T + x) * 4; if (!d[i + 3]) continue;
        const nx = dir === 'e' ? x - 1 : dir === 'w' ? x + 1 : x, ny = dir === 's' ? y - 1 : dir === 'n' ? y + 1 : y;
        if (nx < 0 || ny < 0 || nx >= T || ny >= T || !d[(ny * T + nx) * 4 + 3]) { d[i] = rim[0]; d[i + 1] = rim[1]; d[i + 2] = rim[2]; }
      }
      g.putImageData(id, 0, 0);
    }
    return (Art.fringe[key] = c);
  };

  /* cliff face / top */
  Art.cliff = function (face, theme, v) {
    const key = 'cliff' + face + theme + v;
    if (Art.S[key]) return Art.S[key];
    const ramp = theme === 'snow' ? ['#2c3b56', '#4b6385', '#7189ad', '#9fb6d3', '#dbe8f5'] : theme === 'ash' ? ['#120e0e', '#2a2222', '#3e3332', '#5a4a45', '#776158'] : theme === 'sand' ? ['#5a3a20', '#8a5e34', '#b0804a', '#d2a46a', '#ecc98f'] : theme === 'shadow' ? ['#0a0712', '#1c1430', '#2e2150', '#47337a', '#6a52a6'] : ['#22222c', '#3b3a48', '#575668', '#7a7a8e', '#a2a2b6'];
    const [c, g] = C(T, T);
    if (face) {
      Art.rect(g, 0, 0, T, T, ramp[1]);
      for (let x = 0; x < T; x += 4) { const o = (v * 3 + x) % 5; Art.rect(g, x, o, 1, T - o, ramp[0]); Art.rect(g, x + 1, 0, 2, T, ramp[2]); Art.px(g, x + 1, o + 2, ramp[3]); }
      Art.rect(g, 0, 0, T, 2, ramp[3]); Art.rect(g, 0, 0, T, 1, ramp[4]);
      Art.rect(g, 0, T - 2, T, 2, ramp[0]);
    } else {
      [0, 1].forEach(() => 0);
      Art.rect(g, 0, 0, T, T, ramp[2]);
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const h = PQ.U.hash2(x, y, v + 99); if (h < 0.12) Art.px(g, x, y, ramp[1]); else if (h > 0.9) Art.px(g, x, y, ramp[3]); }
    }
    return (Art.S[key] = c);
  };
  Art.vine = function () {
    if (Art.S.vine) return Art.S.vine;
    const [c, g] = C(T, T);
    g.drawImage(Art.cliff(true, 'grass', 1), 0, 0);
    for (const x of [4, 10]) for (let y = 0; y < T; y++) { Art.px(g, x + (y % 4 < 2 ? 0 : 1), y, P.leaf[2]); if (y % 3 === 0) { Art.px(g, x - 1, y, P.leaf[3]); Art.px(g, x + 2, y + 1, P.leaf[1]); } }
    return (Art.S.vine = c);
  };

  /* =========================================================
     WORLD OBJECTS (procedural, shaded, outlined)
     ========================================================= */
  function finish(c) { return Art.outline(c); }

  Art.makeTree = function (kind, v) {
    const R = PQ.RNG(kind.length * 97 + v * 13);
    let c, g;
    if (kind === 'oak' || kind === 'apple' || kind === 'autumn' || kind === 'giant') {
      const big = kind === 'giant';
      const W = big ? 52 : 34, H = big ? 62 : 42;
      [c, g] = C(W, H);
      const cx = W / 2;
      const trunkW = big ? 10 : 6, trunkTop = big ? 36 : 24;
      const bark = big ? ['#1c1410', '#2e2018', '#46322a', '#5e4638'] : P.wood;
      for (let y = trunkTop; y < H - 1; y++) for (let x = -trunkW / 2; x < trunkW / 2; x++) {
        const l = x < -trunkW / 4 ? 1 : x > trunkW / 4 ? 0 : 2;
        Art.px(g, cx + x, y, bark[l + (PQ.U.hash2(x, y, v) > 0.85 ? 1 : 0)]);
      }
      // roots
      Art.rect(g, cx - trunkW / 2 - 2, H - 3, 3, 2, bark[1]); Art.rect(g, cx + trunkW / 2 - 1, H - 3, 3, 2, bark[1]);
      const ramp = big ? P.dleaf : kind === 'autumn' ? ['#4a1a10', '#8a3216', '#c8601e', '#eb9a32', '#ffd067'] : P.leaf;
      const blobs = big
        ? [[cx, 22, 22, 17], [cx - 13, 28, 12, 9], [cx + 13, 28, 12, 9], [cx, 11, 15, 10]]
        : [[cx, 15, 14, 11], [cx - 8, 19, 8, 7], [cx + 8, 19, 8, 7], [cx + R.int(-2, 2), 8, 9, 7]];
      for (const b of blobs) Art.blob(g, b[0], b[1], b[2], b[3], ramp, { bias: -0.08 });
      // leaf clusters texture
      for (let i = 0; i < (big ? 70 : 34); i++) {
        const b = R.pick(blobs), a = R() * 6.28, r = R() * 0.85;
        const x = Math.round(b[0] + Math.cos(a) * b[2] * r), y = Math.round(b[1] + Math.sin(a) * b[3] * r);
        const top = y < b[1];
        Art.px(g, x, y, ramp[top ? 3 : 1]); Art.px(g, x + 1, y, ramp[top ? 4 : 2]);
      }
      if (kind === 'apple') for (let i = 0; i < 6; i++) { const b = R.pick(blobs); const x = b[0] + R.int(-b[2] + 3, b[2] - 3), y = b[1] + R.int(-2, b[3] - 2); Art.px(g, x, y, '#e8363c'); Art.px(g, x, y - 1, '#ff8a7a'); }
      if (big) for (let i = 0; i < 12; i++) { const b = R.pick(blobs); Art.px(g, b[0] + R.int(-b[2] + 2, b[2] - 2), b[1] + R.int(-b[3] + 2, b[3] - 2), '#9dffd0'); }
    } else if (kind === 'pine' || kind === 'snowpine') {
      const W = 26, H = 44; [c, g] = C(W, H);
      const cx = 13;
      for (let y = 34; y < H - 1; y++) for (let x = -2; x < 2; x++) Art.px(g, cx + x, y, P.wood[x < 0 ? 1 : 2]);
      const tiers = [[6, 16, 5], [14, 24, 8], [22, 35, 11]];
      for (const [top, bot, hw] of tiers) {
        for (let y = top; y <= bot; y++) {
          const w = Math.round(((y - top) / (bot - top)) * hw) + 1;
          for (let x = -w; x <= w; x++) {
            const shade = x < -w / 3 ? 2 : x > w / 3 ? 0 : 1;
            let col = P.pine[shade + (y === bot || (y > bot - 2 && PQ.U.hash2(x, y, v) > 0.5) ? -1 : 0) < 0 ? 0 : shade];
            if (y === bot && PQ.U.hash2(x, y, 7) > 0.5) continue;
            if (kind === 'snowpine' && y - top < 3 + Math.abs(x) * 0.3 && PQ.U.hash2(x, y, v + 3) > 0.25) col = x < 0 ? '#ffffff' : '#c6d9ec';
            Art.px(g, cx + x, y, col);
          }
        }
        if (kind === 'snowpine') for (let x = -hw; x <= hw; x += 2) if (PQ.U.hash2(x, bot, v) > 0.4) Art.px(g, cx + x, bot - 1, '#e9f2fb');
      }
      Art.px(g, cx, 4, kind === 'snowpine' ? '#fff' : P.pine[2]); Art.px(g, cx, 5, P.pine[1]);
    } else if (kind === 'palm') {
      const W = 34, H = 44; [c, g] = C(W, H);
      for (let i = 0; i < 26; i++) { const y = H - 2 - i, x = 17 + Math.round(Math.sin(i * 0.12) * 3); Art.rect(g, x - 2, y, 4, 1, i % 3 === 0 ? P.wood[1] : P.wood[3]); Art.px(g, x - 2, y, P.wood[2]); }
      const top = [20, 16];
      for (let a = 0; a < 7; a++) {
        const ang = -Math.PI + a * (Math.PI / 6) + 0.1;
        for (let r = 0; r < 15; r++) { const x = top[0] + Math.cos(ang) * r, y = top[1] + Math.sin(ang) * r * 0.6 + r * r * 0.025; Art.px(g, x, y, P.leaf[r < 5 ? 3 : 2]); Art.px(g, x, y + 1, P.leaf[1]); }
      }
      Art.blob(g, 18, 18, 2, 2, ['#5a3a1a', '#8a5a2a', '#a87a3a']);
    } else if (kind === 'cactus') {
      [c, g] = C(20, 30);
      const ramp = ['#1e4a2a', '#2f6e38', '#4c9a47', '#7cc45a'];
      const col = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = 0; x < w; x++) Art.px(g, x0 + x, y, ramp[x === 0 ? 0 : x === w - 1 ? 1 : x === 1 ? 3 : 2]); Art.rect(g, x0 + 1, y0 - 1, w - 2, 1, ramp[2]); };
      col(7, 4, 6, 25); col(1, 11, 4, 8); Art.rect(g, 4, 17, 3, 3, ramp[2]); col(15, 8, 4, 9); Art.rect(g, 13, 14, 2, 3, ramp[2]);
      for (let i = 0; i < 10; i++) Art.px(g, 7 + R.int(0, 5), R.int(5, 26), '#dfe8b0');
      if (v === 1) { Art.rect(g, 9, 2, 2, 2, '#ff6fa8'); Art.px(g, 10, 1, '#ffd0e4'); }
    } else if (kind === 'dead' || kind === 'deadshadow') {
      [c, g] = C(28, 38);
      const col = kind === 'dead' ? ['#1a1210', '#2e221c', '#4a3a30'] : ['#120a1e', '#251840', '#3e2a66'];
      const branch = (x, y, ang, len, w) => {
        for (let i = 0; i < len; i++) { x += Math.cos(ang); y += Math.sin(ang); Art.rect(g, x, y, w, w, col[1]); Art.px(g, x, y, col[2]); }
        if (len > 4) { branch(x, y, ang - 0.5 - R() * 0.3, len * 0.6, Math.max(1, w - 1)); branch(x, y, ang + 0.4 + R() * 0.3, len * 0.55, Math.max(1, w - 1)); }
      };
      branch(13, 37, -Math.PI / 2, 15, 3);
      if (kind === 'deadshadow') for (let i = 0; i < 4; i++) Art.px(g, R.int(4, 24), R.int(4, 20), '#c79bff');
    }
    return finish(c);
  };

  Art.makeBush = function (kind, v) {
    const [c, g] = C(18, 14);
    const ramp = kind === 'dark' ? P.dleaf : kind === 'snow' ? ['#2a4a52', '#3f6b6a', '#5e8f82', '#e9f2fb', '#ffffff'] : P.leaf;
    Art.blob(g, 6, 8, 5, 5, ramp); Art.blob(g, 11, 8, 6, 5, ramp); Art.blob(g, 9, 5, 5, 4, ramp);
    if (kind === 'berry' || kind === 'berry0') { const R = PQ.RNG(v + 5); if (kind === 'berry') for (let i = 0; i < 5; i++) { const x = R.int(3, 14), y = R.int(3, 10); Art.px(g, x, y, '#4a50e8'); Art.px(g, x, y - 1, '#a8b0ff'); } }
    return finish(c);
  };

  Art.makeRock = function (kind, v, ore) {
    const [c, g] = C(18, 15);
    const ramp = { grey: P.stone.slice(0, 5), sand: ['#5a3a20', '#8a5e34', '#b0804a', '#d2a46a', '#ecc98f'], snow: ['#4b6385', '#7189ad', '#9fb6d3', '#dbe8f5', '#ffffff'], ash: ['#140f0f', '#2a2222', '#3e3332', '#5a4a45', '#776158'], shadow: ['#0e0a18', '#1c1430', '#2e2150', '#47337a', '#6a52a6'] }[kind] || P.stone;
    const R = PQ.RNG(v * 11 + kind.length);
    Art.blob(g, 9, 9, 8, 5, ramp, { bias: -0.05 }); Art.blob(g, 7 + R.int(0, 3), 7, 5, 4, ramp, { bias: 0.05 });
    Art.px(g, 6 + R.int(0, 6), 9, ramp[0]); Art.px(g, 7 + R.int(0, 6), 10, ramp[0]);
    if (kind === 'snow') { Art.rect(g, 5, 3, 7, 2, '#ffffff'); Art.rect(g, 4, 5, 3, 1, '#e9f2fb'); }
    if (ore) {
      const oc = ore;
      for (let i = 0; i < 4; i++) {
        const x = R.int(4, 13), y = R.int(5, 11);
        Art.px(g, x, y, oc[1]); Art.px(g, x + 1, y, oc[2]); Art.px(g, x, y - 1, oc[2]); Art.px(g, x + 1, y - 1, oc[3] || '#fff');
      }
    }
    return finish(c);
  };

  Art.makeCrystal = function (col) {
    const [c, g] = C(16, 20);
    const prism = (x, h, w) => { for (let y = 0; y < h; y++) { const ww = y < 3 ? Math.ceil((y + 1) * w / 3) : w; for (let i = 0; i < ww; i++) Art.px(g, x + i - (ww >> 1), 19 - h + y, i === 0 ? col[3] : i === ww - 1 ? col[1] : col[2]); } };
    prism(5, 12, 3); prism(10, 16, 4); prism(13, 9, 3);
    Art.px(g, 9, 6, '#fff'); Art.px(g, 4, 10, '#fff');
    return finish(c);
  };
  Art.makeMushroom = function (cap, glow) {
    const [c, g] = C(14, 14);
    Art.rect(g, 6, 8, 3, 5, '#e8dcc8'); Art.px(g, 6, 8, '#fff');
    Art.blob(g, 7, 6, 6, 3.5, cap);
    Art.px(g, 5, 5, '#fff'); Art.px(g, 9, 4, cap[4] || '#fff');
    if (glow) { Art.px(g, 3, 6, glow); Art.px(g, 10, 7, glow); }
    return finish(c);
  };
  Art.makeHerb = function (flower) {
    const [c, g] = C(12, 12);
    for (const [x, h] of [[3, 5], [6, 8], [9, 5]]) for (let y = 0; y < h; y++) Art.px(g, x, 11 - y, P.leaf[y > 2 ? 3 : 2]);
    Art.px(g, 2, 8, P.leaf[3]); Art.px(g, 10, 8, P.leaf[3]); Art.px(g, 5, 6, P.leaf[2]); Art.px(g, 7, 6, P.leaf[2]);
    Art.rect(g, 5, 2, 3, 2, flower); Art.px(g, 6, 1, flower); Art.px(g, 6, 2, '#fff');
    return finish(c);
  };

  Art.makeChest = function (open, tier) {
    const [c, g] = C(16, 14);
    const wood = tier === 2 ? ['#2a1a40', '#4a2e6e', '#6e48a0', '#9a72cc'] : P.wood;
    const band = tier === 0 ? P.stone[3] : tier === 1 ? P.gold[3] : '#d8b8ff';
    Art.rect(g, 1, 5, 14, 8, wood[2]); Art.rect(g, 1, 11, 14, 2, wood[1]); Art.rect(g, 1, 5, 14, 1, wood[3]);
    if (open) { Art.rect(g, 1, 1, 14, 4, wood[1]); Art.rect(g, 2, 2, 12, 3, '#1a0f0a'); Art.rect(g, 3, 3, 10, 2, P.gold[3]); }
    else { Art.rect(g, 1, 1, 14, 5, wood[3]); Art.rect(g, 1, 1, 14, 1, wood[3]); Art.rect(g, 2, 2, 12, 1, PQ.U.shade(wood[3], 0.25)); }
    Art.rect(g, 3, 1, 2, 12, band); Art.rect(g, 11, 1, 2, 12, band); Art.rect(g, 7, 5, 2, 3, P.gold[open ? 2 : 4]);
    return finish(c);
  };

  Art.makeSign = function () {
    const [c, g] = C(14, 16);
    Art.rect(g, 6, 8, 2, 8, P.wood[1]); Art.rect(g, 1, 2, 12, 7, P.wood[3]); Art.rect(g, 1, 8, 12, 1, P.wood[1]); Art.rect(g, 1, 2, 12, 1, P.wood[4]);
    for (const y of [4, 6]) Art.rect(g, 3, y, 8, 1, P.wood[1]);
    return finish(c);
  };
  Art.makeLantern = function () {
    const [c, g] = C(10, 26);
    Art.rect(g, 4, 6, 2, 19, '#2a2a36'); Art.rect(g, 3, 24, 4, 2, '#3a3a4a'); Art.rect(g, 2, 2, 6, 6, '#3a3a4a'); Art.rect(g, 3, 3, 4, 4, '#ffd36b'); Art.px(g, 4, 4, '#fff8d0'); Art.rect(g, 3, 1, 4, 1, '#2a2a36');
    return finish(c);
  };
  Art.makeCampfire = function (f) {
    const [c, g] = C(16, 16);
    for (let a = 0; a < 8; a++) { const x = 8 + Math.cos(a * 0.785) * 6, y = 12 + Math.sin(a * 0.785) * 2.5; Art.rect(g, x - 1, y - 1, 2, 2, P.stone[a % 2 ? 2 : 3]); }
    Art.rect(g, 4, 11, 8, 2, P.wood[1]); Art.rect(g, 6, 10, 4, 1, P.wood[2]);
    const fl = [[8, 4, 3], [6, 6, 2], [10, 7, 2]];
    fl.forEach(([x, y, r], i) => { const yy = y + ((f + i) % 3) - 1; for (let k = 0; k < 12 - yy; k++) { const w = Math.max(0, r - k / 4); Art.rect(g, x - w, yy + k, w * 2 + 1, 1, k < 3 ? '#fff3a0' : k < 6 ? '#ffb13b' : '#e2471a'); } });
    return Art.outline(c);
  };
  Art.makeFence = function (vertical) {
    const [c, g] = C(16, 14);
    if (!vertical) { Art.rect(g, 0, 5, 16, 2, P.wood[3]); Art.rect(g, 0, 9, 16, 2, P.wood[2]); for (const x of [1, 13]) { Art.rect(g, x, 2, 2, 11, P.wood[2]); Art.px(g, x, 2, P.wood[4]); } }
    else { Art.rect(g, 7, 0, 2, 14, P.wood[2]); Art.rect(g, 7, 0, 1, 14, P.wood[3]); }
    return finish(c);
  };
  Art.makeWell = function () {
    const [c, g] = C(24, 28);
    Art.blob(g, 12, 20, 10, 6, P.stone.slice(1, 6)); Art.blob(g, 12, 19, 7, 3.5, ['#0b1430', '#173f7a', '#2468b0']);
    Art.rect(g, 3, 4, 2, 16, P.wood[2]); Art.rect(g, 19, 4, 2, 16, P.wood[2]);
    for (let i = 0; i < 6; i++) Art.rect(g, 2 + i, 4 - i * 0.5, 20 - i * 2, 1, i % 2 ? '#7a2e3a' : '#a8414c');
    Art.rect(g, 11, 7, 2, 7, '#c8b48a'); Art.rect(g, 10, 13, 4, 3, P.wood[1]);
    return finish(c);
  };

  /* buildings: 3/4 top-down house with roof and front wall */
  Art.makeHouse = function (w, roof, wall, opts = {}) {
    const W = w * T, H = (opts.h || 4) * T + 8;
    const [c, g] = C(W, H);
    const roofH = H - 26;
    const wallTop = roofH - 2;
    const wr = [PQ.U.shade(wall, -0.35), PQ.U.shade(wall, -0.15), wall, PQ.U.shade(wall, 0.2)];
    // front wall
    Art.rect(g, 2, wallTop, W - 4, H - wallTop - 1, wr[2]);
    for (let y = wallTop + 3; y < H - 2; y += 4) Art.rect(g, 2, y, W - 4, 1, wr[1]);
    Art.rect(g, 2, wallTop, 2, H - wallTop - 1, wr[0]); Art.rect(g, W - 4, wallTop, 2, H - wallTop - 1, wr[0]);
    Art.rect(g, 2, H - 3, W - 4, 2, wr[0]);
    // door
    const dx = opts.doorX != null ? opts.doorX : (W >> 1) - 5;
    Art.rect(g, dx, H - 16, 10, 14, P.wood[1]); Art.rect(g, dx + 1, H - 15, 8, 13, P.wood[2]); Art.rect(g, dx + 1, H - 15, 8, 1, P.wood[3]); Art.px(g, dx + 7, H - 9, P.gold[3]);
    // windows
    const win = (x) => { Art.rect(g, x, wallTop + 6, 10, 9, P.wood[1]); Art.rect(g, x + 1, wallTop + 7, 8, 7, opts.lit ? '#ffd36b' : '#2a3c66'); Art.rect(g, x + 4, wallTop + 7, 1, 7, P.wood[1]); Art.rect(g, x + 1, wallTop + 10, 8, 1, P.wood[1]); Art.px(g, x + 2, wallTop + 8, opts.lit ? '#fff8d0' : '#6a8cc8'); };
    if (W >= 64) { win(8); win(W - 18); } else win(W - 15);
    // roof (trapezoid with shingles)
    const rr = [PQ.U.shade(roof, -0.45), PQ.U.shade(roof, -0.2), roof, PQ.U.shade(roof, 0.22), PQ.U.shade(roof, 0.4)];
    for (let y = 0; y < roofH; y++) {
      const inset = Math.max(0, 6 - y);
      for (let x = inset; x < W - inset; x++) {
        const row = Math.floor(y / 4);
        const brick = (x + (row % 2) * 4) % 8;
        let col = y % 4 === 3 ? rr[0] : brick === 0 ? rr[1] : y < roofH * 0.3 ? rr[3] : rr[2];
        if (x < 4 + inset) col = rr[1];
        Art.px(g, x, y, col);
      }
    }
    Art.rect(g, 0, roofH - 2, W, 2, rr[0]);
    Art.rect(g, 6, 0, W - 12, 1, rr[4]);
    if (opts.chimney) { Art.rect(g, W - 16, 0, 6, 8, P.stone[2]); Art.rect(g, W - 16, 0, 6, 1, P.stone[4]); }
    if (opts.sign) { Art.rect(g, dx - 12, wallTop + 4, 10, 7, P.wood[3]); Art.rect(g, dx - 10, wallTop + 6, 6, 3, opts.sign); }
    return finish(c);
  };
  Art.makeStall = function (stripe) {
    const [c, g] = C(40, 36);
    Art.rect(g, 3, 12, 2, 22, P.wood[1]); Art.rect(g, 35, 12, 2, 22, P.wood[1]);
    Art.rect(g, 2, 22, 36, 10, P.wood[2]); Art.rect(g, 2, 22, 36, 2, P.wood[4]); Art.rect(g, 2, 31, 36, 2, P.wood[0]);
    for (let x = 0; x < 40; x++) for (let y = 2; y < 13; y++) { const s = Math.floor(x / 5) % 2; Art.px(g, x, y + (y > 10 ? (x % 5 === 2 ? 1 : 0) : 0), s ? stripe : '#f2ead8'); }
    Art.rect(g, 0, 2, 40, 1, PQ.U.shade(stripe, 0.3));
    for (let i = 0; i < 5; i++) Art.rect(g, 6 + i * 6, 19, 4, 3, ['#e8363c', '#ffbf3d', '#64b33f', '#8a5cff', '#ff8a3d'][i]);
    return finish(c);
  };
  Art.makeWindmill = function () {
    const [c, g] = C(40, 60);
    for (let y = 18; y < 58; y++) { const w = 7 + (y - 18) * 0.18; for (let x = -w; x < w; x++) Art.px(g, 20 + x, y, x < -w / 3 ? '#cfc4ae' : x > w / 3 ? '#8f8270' : '#b3a68e'); }
    for (let y = 22; y < 56; y += 6) Art.rect(g, 13, y, 14, 1, '#7a6e5c');
    Art.rect(g, 16, 46, 8, 12, P.wood[1]); Art.rect(g, 17, 47, 6, 11, P.wood[2]);
    for (let y = 8; y < 20; y++) { const w = (y - 6) * 0.8; Art.rect(g, 20 - w, y, w * 2, 1, y % 3 ? '#a8414c' : '#7a2e3a'); }
    return finish(c);
  };
  Art.windmillBlades = function () {
    if (Art.S.blades) return Art.S.blades;
    const [c, g] = C(46, 46);
    g.translate(23, 23);
    for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); Art.rect(g, -1, 2, 2, 20, P.wood[1]); Art.rect(g, 1, 6, 6, 15, '#efe6d2'); Art.rect(g, 1, 6, 6, 1, P.wood[2]); Art.rect(g, 3, 6, 1, 15, '#c8bca4'); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    Art.rect(g, 21, 21, 4, 4, P.wood[2]);
    return (Art.S.blades = c);
  };
  Art.makeWaypoint = function (active) {
    const [c, g] = C(16, 30);
    for (let y = 4; y < 28; y++) { const w = y < 8 ? (y - 3) : 5; for (let x = -w; x < w; x++) Art.px(g, 8 + x, y, x < -w / 2 ? P.stone[3] : x > w / 3 ? P.stone[1] : P.stone[2]); }
    Art.rect(g, 2, 26, 12, 3, P.stone[1]); Art.rect(g, 2, 26, 12, 1, P.stone[3]);
    const rc = active ? '#7ef0ff' : '#3a4a5e';
    Art.rect(g, 7, 11, 2, 9, rc); Art.rect(g, 5, 14, 6, 1, rc); Art.px(g, 6, 12, rc); Art.px(g, 9, 17, rc);
    return finish(c);
  };
  Art.makeEntrance = function (theme) {
    const th = Art.THEMES[theme];
    const [c, g] = C(48, 40);
    if (theme === 'cave' || theme === 'ice' || theme === 'fire') {
      const ramp = theme === 'ice' ? ['#2d4c78', '#4b74a6', '#79a6d0', '#a8c8e6', '#e6f2fb'] : theme === 'fire' ? ['#100a0a', '#2a1512', '#4a2018', '#6e2f1e', '#8a4a30'] : P.stone.slice(0, 5);
      Art.blob(g, 24, 24, 23, 15, ramp); Art.blob(g, 14, 18, 10, 9, ramp); Art.blob(g, 34, 18, 10, 9, ramp);
      for (let y = 0; y < 18; y++) { const w = Math.round(Math.sqrt(1 - Math.pow((y - 17) / 18, 2)) * 9); Art.rect(g, 24 - w, 21 + y, w * 2, 1, '#06040a'); if (y > 14) Art.rect(g, 24 - w, 21 + y, w * 2, 1, '#0e0a10'); }
      if (theme === 'cave') { for (let i = 0; i < 10; i++) Art.px(g, 6 + (i * 37) % 36, 10 + (i * 13) % 14, P.leaf[3]); }
      if (theme === 'fire') { Art.rect(g, 16, 36, 16, 2, P.lava[2]); }
    } else {
      // temple facade
      const w = th.wall;
      Art.rect(g, 2, 8, 44, 31, w[1]);
      for (let y = 10; y < 38; y += 5) for (let x = (y / 5) % 2 ? 0 : 5; x < 44; x += 10) { Art.rect(g, 3 + x, y, 8, 3, w[2]); Art.rect(g, 3 + x, y, 8, 1, w[3]); }
      Art.rect(g, 0, 4, 48, 5, w[2]); Art.rect(g, 0, 4, 48, 1, w[3]);
      for (let i = 0; i < 12; i++) Art.rect(g, 4 + i * 4, 0, 2, 4, w[2]);
      Art.rect(g, 15, 18, 18, 21, '#06040a'); Art.rect(g, 15, 18, 18, 2, w[0]);
      for (const x of [9, 37]) { Art.rect(g, x - 2, 14, 4, 25, w[3]); Art.rect(g, x - 2, 14, 1, 25, w[2]); }
      Art.rect(g, 21, 10, 6, 6, th.light); Art.px(g, 23, 12, '#fff');
    }
    return finish(c);
  };
  Art.makePillar = function (broken, ramp = P.stone) {
    const [c, g] = C(14, 30);
    const top = broken ? 10 : 3;
    Art.rect(g, 1, 26, 12, 4, ramp[2]); Art.rect(g, 1, 26, 12, 1, ramp[4]);
    Art.rect(g, 3, top, 8, 26 - top, ramp[2]); Art.rect(g, 3, top, 2, 26 - top, ramp[3]); Art.rect(g, 9, top, 2, 26 - top, ramp[1]);
    if (!broken) { Art.rect(g, 1, 1, 12, 3, ramp[3]); Art.rect(g, 1, 1, 12, 1, ramp[4]); }
    else { Art.px(g, 4, top - 1, ramp[2]); Art.px(g, 7, top - 2, ramp[3]); }
    Art.px(g, 6, 14, ramp[1]); Art.px(g, 7, 15, ramp[1]);
    return finish(c);
  };
  Art.makeGate = function (filled) { // ancient gate with four sigil sockets
    const [c, g] = C(56, 48);
    const w = P.stone;
    Art.rect(g, 4, 6, 10, 42, w[2]); Art.rect(g, 42, 6, 10, 42, w[2]); Art.rect(g, 4, 6, 3, 42, w[3]); Art.rect(g, 49, 6, 3, 42, w[1]);
    Art.rect(g, 0, 0, 56, 9, w[3]); Art.rect(g, 0, 0, 56, 2, w[4]); Art.rect(g, 0, 8, 56, 2, w[1]);
    const cols = ['#64d86a', '#ffcf4a', '#8fe0ff', '#ff6a2e'];
    [[9, 16], [47, 16], [9, 32], [47, 32]].forEach(([x, y], i) => { Art.rect(g, x - 3, y - 3, 6, 6, w[0]); if (filled[i]) { Art.rect(g, x - 2, y - 2, 4, 4, cols[i]); Art.px(g, x - 1, y - 1, '#fff'); } });
    return finish(c);
  };
  Art.portalFrame = function (t) {
    const [c, g] = C(36, 36);
    for (let r = 16; r > 0; r--) {
      const a = t * 2 + r * 0.6;
      const col = ['#1e1530', '#47306f', '#7552ad', '#b892f0', '#f0e0ff'][r % 5];
      g.fillStyle = col; g.beginPath();
      for (let i = 0; i < 24; i++) { const an = (i / 24) * Math.PI * 2 + a; const rr = r * (1 + Math.sin(an * 3 + t) * 0.06); g.lineTo(18 + Math.cos(an) * rr, 18 + Math.sin(an) * rr * 0.9); }
      g.fill();
    }
    return c;
  };

  /* crafting stations & furniture */
  Art.makeStation = function (kind) {
    const [c, g] = C(24, 22);
    if (kind === 'workbench') {
      Art.rect(g, 1, 8, 22, 5, P.wood[3]); Art.rect(g, 1, 8, 22, 1, P.wood[4]); Art.rect(g, 1, 12, 22, 1, P.wood[1]);
      Art.rect(g, 3, 13, 3, 8, P.wood[1]); Art.rect(g, 18, 13, 3, 8, P.wood[1]);
      Art.rect(g, 5, 5, 6, 3, P.stone[3]); Art.rect(g, 9, 3, 2, 5, P.wood[2]); Art.rect(g, 14, 6, 6, 2, P.stone[2]); Art.px(g, 16, 5, P.wood[4]);
    } else if (kind === 'forge') {
      Art.blob(g, 7, 13, 6, 7, P.stone.slice(0, 5)); Art.rect(g, 4, 13, 6, 4, P.lava[3]); Art.rect(g, 5, 14, 4, 2, P.lava[4]);
      Art.rect(g, 13, 10, 10, 4, P.stone[2]); Art.rect(g, 13, 10, 10, 1, P.stone[4]); Art.rect(g, 16, 14, 4, 4, P.stone[1]); Art.rect(g, 14, 18, 8, 3, P.stone[2]);
    } else if (kind === 'alchemy') {
      Art.rect(g, 1, 10, 22, 4, P.wood[2]); Art.rect(g, 1, 10, 22, 1, P.wood[4]); Art.rect(g, 3, 14, 2, 7, P.wood[1]); Art.rect(g, 19, 14, 2, 7, P.wood[1]);
      const fl = (x, col) => { Art.rect(g, x, 4, 2, 2, '#c8e8f0'); Art.blob(g, x + 1, 7, 2.5, 2.5, ['#222', col, PQ.U.shade(col, 0.3), '#fff']); };
      fl(4, '#e8363c'); fl(10, '#3f97d6'); fl(16, '#64b33f');
    } else if (kind === 'cook') {
      Art.rect(g, 4, 18, 16, 2, P.wood[1]); Art.rect(g, 8, 16, 8, 2, '#ff9a2e'); Art.rect(g, 10, 15, 4, 1, '#ffe27a');
      Art.blob(g, 12, 10, 9, 6, ['#15151c', '#2a2a36', '#3f3e4d', '#5d5c6e']); Art.rect(g, 5, 6, 14, 3, '#7a5a2a'); Art.rect(g, 6, 6, 12, 1, '#c8a050');
      Art.px(g, 9, 3, '#e9f2fb'); Art.px(g, 13, 2, '#e9f2fb');
    } else if (kind === 'altar') {
      Art.rect(g, 3, 12, 18, 9, P.stone[2]); Art.rect(g, 3, 12, 18, 2, P.stone[4]); Art.rect(g, 5, 14, 14, 1, P.stone[1]);
      Art.blob(g, 12, 7, 4, 4, ['#7a1a4a', '#c8327a', '#ff70b0', '#ffd0e8']); Art.px(g, 11, 5, '#fff');
    } else if (kind === 'bed') {
      Art.rect(g, 1, 2, 22, 19, P.wood[2]); Art.rect(g, 2, 3, 20, 5, '#e9f2fb'); Art.rect(g, 2, 8, 20, 12, '#3f5fae'); Art.rect(g, 2, 8, 20, 2, '#6a8cdc');
    } else if (kind === 'storage') {
      Art.rect(g, 1, 6, 22, 14, P.wood[2]); Art.rect(g, 1, 6, 22, 2, P.wood[4]); Art.rect(g, 1, 12, 22, 1, P.wood[1]); Art.rect(g, 10, 10, 4, 4, P.gold[3]);
    } else if (kind === 'mirror') {
      Art.rect(g, 6, 1, 12, 20, P.wood[2]); Art.rect(g, 8, 3, 8, 15, '#9ad0e8'); Art.rect(g, 9, 4, 2, 6, '#e8f8ff'); Art.rect(g, 5, 19, 14, 2, P.wood[1]);
    }
    return finish(c);
  };
  Art.makeDecor = function (kind) {
    const [c, g] = C(16, 16);
    if (kind === 'rug') { Art.rect(g, 0, 3, 16, 10, '#7a2e8a'); Art.rect(g, 1, 4, 14, 8, '#a84ab8'); Art.rect(g, 3, 6, 10, 4, '#ffd36b'); }
    else if (kind === 'plant') { Art.rect(g, 4, 10, 8, 6, '#a0522d'); Art.rect(g, 4, 10, 8, 1, '#c87a4a'); Art.blob(g, 8, 6, 5, 5, P.leaf); }
    else if (kind === 'lamp') { Art.rect(g, 7, 6, 2, 9, '#2a2a36'); Art.rect(g, 4, 14, 8, 2, '#3a3a4a'); Art.blob(g, 8, 4, 4, 3, ['#a87a1a', '#e0a92e', '#ffd75a', '#fff3b0']); }
    else if (kind === 'painting') { Art.rect(g, 1, 2, 14, 11, P.gold[2]); Art.rect(g, 2, 3, 12, 9, '#58b4e6'); Art.rect(g, 2, 8, 12, 4, '#43893d'); Art.blob(g, 11, 5, 1.5, 1.5, ['#ffd75a', '#fff3b0']); }
    else if (kind === 'shelf') { Art.rect(g, 1, 1, 14, 15, P.wood[1]); for (const y of [4, 9, 14]) Art.rect(g, 2, y, 12, 1, P.wood[3]); for (let i = 0; i < 6; i++) Art.rect(g, 3 + i * 2, 1 + (i % 2) * 5, 1, 3, ['#c9323a', '#3f97d6', '#64b33f', '#ffd75a'][i % 4]); }
    else if (kind === 'trophy') { Art.rect(g, 5, 12, 6, 3, P.wood[2]); Art.blob(g, 8, 7, 4, 4, P.gold); Art.rect(g, 7, 10, 2, 2, P.gold[2]); }
    return finish(c);
  };

  /* crops: stage 0..3, shape by kind */
  Art.makeCrop = function (crop, stage) {
    const [c, g] = C(14, 16);
    const leaf = P.leaf;
    if (stage === 0) { for (const [x, y] of [[4, 12], [8, 10], [10, 13]]) Art.px(g, x, y, '#c8a46a'); return c; }
    if (stage === 1) { Art.rect(g, 6, 9, 1, 5, leaf[2]); Art.px(g, 5, 9, leaf[3]); Art.px(g, 7, 10, leaf[3]); return Art.outline(c); }
    const col = crop.color;
    if (crop.shape === 'grain') {
      for (const x of [3, 6, 9, 11]) { Art.rect(g, x, stage === 3 ? 4 : 8, 1, 12, stage === 3 ? '#c8a43a' : leaf[2]); if (stage === 3) { Art.rect(g, x - 1, 2, 3, 4, col); Art.px(g, x, 1, PQ.U.shade(col, 0.3)); } }
    } else if (crop.shape === 'root') {
      for (const [x, h] of [[4, 6], [7, 8], [10, 6]]) Art.rect(g, x, 14 - h, 2, h, leaf[x === 7 ? 3 : 2]);
      if (stage === 3) { Art.rect(g, 5, 12, 5, 3, col); Art.rect(g, 5, 12, 5, 1, PQ.U.shade(col, 0.3)); }
    } else if (crop.shape === 'bush' || crop.shape === 'pepper' || crop.shape === 'fruit') {
      Art.blob(g, 7, 10, 5, 4, leaf);
      if (stage === 3) for (const [x, y] of [[4, 8], [9, 7], [7, 11], [10, 11]]) { if (crop.shape === 'pepper') { Art.rect(g, x, y, 1, 3, col); Art.px(g, x, y - 1, leaf[3]); } else { Art.rect(g, x, y, 2, 2, col); Art.px(g, x, y, PQ.U.shade(col, 0.4)); } }
    } else if (crop.shape === 'big') {
      Art.rect(g, 2, 11, 10, 1, leaf[2]); Art.blob(g, 3, 9, 2, 2, leaf);
      if (stage === 3) { Art.blob(g, 8, 10, 5, 4, [PQ.U.shade(col, -0.4), PQ.U.shade(col, -0.15), col, PQ.U.shade(col, 0.3)]); Art.rect(g, 8, 5, 1, 2, P.wood[2]); }
      else Art.blob(g, 8, 10, 2, 2, [leaf[1], col]);
    }
    return Art.outline(c);
  };

  /* =========================================================
     ITEM ICONS (16x16, generated from item definitions)
     ========================================================= */
  const MAT = (Art.MAT = {
    wood: ['#4f321f', '#77492a', '#a06a3c', '#c99558'], stone: ['#3f3e4d', '#5d5c6e', '#858598', '#b4b4c4'], copper: ['#6b3416', '#a8582a', '#d9864a', '#ffc08a'],
    iron: ['#3a3f4c', '#68707e', '#a3abb8', '#e0e6ee'], gold: ['#6b4310', '#a8701a', '#e0a92e', '#fff3b0'], frost: ['#2d4c78', '#4b8ed0', '#8fd4ff', '#e6faff'],
    ember: ['#5a1414', '#b3261e', '#ff7a2e', '#ffe27a'], void: ['#1e1530', '#47306f', '#9b6fd6', '#e6d0ff'], bone: ['#6e6250', '#a89a80', '#d8ccb0', '#fff8e8'],
    leather: ['#3b2417', '#6a4026', '#9a6a3e', '#c8955e'], cloth: ['#2a3c66', '#3f5fae', '#6a8cdc', '#b0c8ff'], moon: ['#3a3f6a', '#7a84c8', '#c8d0ff', '#ffffff'],
    sun: ['#7a3a10', '#e08a1a', '#ffd34d', '#fffbe0'], nature: ['#1e4a2a', '#3b8a37', '#7cc45a', '#d8ffb0'],
  });
  function ic() { return C(16, 16); }
  const ICON = {
    sword(g, m, d) { for (let i = 0; i < 9; i++) { Art.px(g, 5 + i, 10 - i, m[2]); Art.px(g, 6 + i, 10 - i, m[1]); Art.px(g, 5 + i, 9 - i, m[3]); } Art.rect(g, 3, 10, 5, 2, d.hilt || '#7a5a2a'); Art.rect(g, 5, 8, 2, 5, d.hilt || '#7a5a2a'); Art.rect(g, 2, 12, 2, 2, '#4f321f'); Art.px(g, 1, 14, d.gem || '#c8a050'); },
    dagger(g, m, d) { for (let i = 0; i < 6; i++) { Art.px(g, 7 + i, 8 - i, m[2]); Art.px(g, 8 + i, 8 - i, m[1]); Art.px(g, 7 + i, 7 - i, m[3]); } Art.rect(g, 5, 8, 4, 2, d.hilt || '#7a5a2a'); Art.rect(g, 4, 10, 2, 3, '#4f321f'); },
    greatsword(g, m, d) { for (let i = 0; i < 12; i++) { Art.rect(g, 3 + i, 12 - i, 2, 1, m[2]); Art.px(g, 4 + i, 13 - i, m[1]); Art.px(g, 3 + i, 11 - i, m[3]); } Art.rect(g, 1, 11, 6, 2, d.hilt || '#7a5a2a'); Art.rect(g, 3, 9, 2, 6, d.hilt || '#7a5a2a'); Art.px(g, 1, 14, '#4f321f'); },
    bow(g, m, d) { for (let i = 0; i < 13; i++) { const x = 4 + Math.round(Math.sin((i / 12) * Math.PI) * -3) + i * 0.6, y = 1 + i; Art.px(g, x + 3, y, m[2]); Art.px(g, x + 4, y, m[1]); } for (let y = 1; y < 14; y++) Art.px(g, 4 + y * 0.6 + 2, y, '#e8e0d0'); Art.rect(g, 7, 6, 2, 3, d.hilt || '#7a5a2a'); },
    staff(g, m, d) { for (let i = 0; i < 12; i++) { Art.px(g, 3 + i * 0.8, 14 - i, '#77492a'); Art.px(g, 4 + i * 0.8, 14 - i, '#4f321f'); } Art.blob(g, 12, 3, 2.6, 2.6, [PQ.U.shade(d.gemc || m[2], -0.4), d.gemc || m[2], PQ.U.shade(d.gemc || m[2], 0.4), '#fff']); Art.px(g, 10, 5, m[1]); Art.px(g, 14, 5, m[1]); },
    wand(g, m, d) { for (let i = 0; i < 8; i++) Art.px(g, 4 + i, 13 - i, m[1]); Art.blob(g, 12, 4, 2.5, 2.5, [d.gemc, PQ.U.shade(d.gemc, 0.4), '#fff']); for (const [x, y] of [[14, 1], [9, 2], [14, 7]]) Art.px(g, x, y, '#fff8d0'); },
    axe(g, m) { for (let i = 0; i < 11; i++) Art.px(g, 3 + i * 0.7, 14 - i, '#77492a'); Art.blob(g, 11, 4, 3.5, 3, m); Art.rect(g, 8, 3, 2, 4, m[0]); },
    pick(g, m) { for (let i = 0; i < 11; i++) Art.px(g, 4 + i * 0.6, 14 - i, '#77492a'); for (let i = -5; i <= 5; i++) Art.px(g, 10 + i, 4 + Math.abs(i) * 0.5, i < 0 ? m[2] : m[1]); },
    rod(g) { for (let i = 0; i < 13; i++) Art.px(g, 2 + i, 14 - i, i < 4 ? '#4f321f' : '#a06a3c'); for (let y = 2; y < 12; y++) Art.px(g, 14, y, '#e8e0d0'); Art.rect(g, 13, 11, 3, 2, '#e8363c'); },
    hoe(g, m) { for (let i = 0; i < 11; i++) Art.px(g, 3 + i * 0.7, 14 - i, '#77492a'); Art.rect(g, 9, 2, 5, 3, m[2]); Art.rect(g, 13, 2, 2, 5, m[1]); },
    can(g) { Art.blob(g, 7, 9, 5, 5, ['#2a4a6e', '#3f6b96', '#6a9cc8', '#b0d8f0']); Art.rect(g, 11, 6, 4, 2, '#3f6b96'); Art.rect(g, 4, 3, 6, 2, '#2a4a6e'); },
    helmet(g, m) { Art.blob(g, 8, 8, 6, 5, m); Art.rect(g, 2, 10, 12, 3, m[1]); Art.rect(g, 4, 9, 8, 2, '#141018'); Art.rect(g, 2, 10, 12, 1, m[2]); },
    chest(g, m) { Art.rect(g, 3, 3, 10, 11, m[1]); Art.rect(g, 4, 3, 8, 10, m[2]); Art.rect(g, 1, 3, 3, 5, m[2]); Art.rect(g, 12, 3, 3, 5, m[1]); Art.rect(g, 6, 3, 4, 2, '#141018'); Art.rect(g, 4, 9, 8, 1, m[3]); Art.px(g, 5, 5, m[3]); },
    gloves(g, m) { Art.rect(g, 3, 4, 6, 8, m[2]); Art.rect(g, 3, 4, 6, 1, m[3]); for (let i = 0; i < 3; i++) Art.rect(g, 3 + i * 2, 1, 1, 3, m[2]); Art.rect(g, 9, 6, 2, 3, m[1]); Art.rect(g, 3, 12, 6, 2, m[1]); },
    boots(g, m) { Art.rect(g, 3, 2, 5, 9, m[2]); Art.rect(g, 3, 10, 10, 4, m[1]); Art.rect(g, 3, 2, 5, 1, m[3]); Art.rect(g, 3, 13, 10, 1, '#141018'); Art.rect(g, 8, 10, 4, 1, m[2]); },
    ring(g, m, d) { for (let a = 0; a < 20; a++) { const an = a / 20 * 6.28; Art.px(g, 8 + Math.cos(an) * 4, 10 + Math.sin(an) * 3.5, m[a < 10 ? 2 : 1]); } Art.blob(g, 8, 5, 2.5, 2.5, [d.gemc || '#c9323a', PQ.U.shade(d.gemc || '#c9323a', 0.4), '#fff']); },
    necklace(g, m, d) { for (let a = 0; a < 16; a++) { const an = (a / 15) * Math.PI; Art.px(g, 8 - Math.cos(an) * 6, 2 + Math.sin(an) * 7, m[2]); } Art.blob(g, 8, 11, 2.5, 3, [d.gemc || '#3f97d6', PQ.U.shade(d.gemc || '#3f97d6', 0.4), '#fff']); },
    charm(g, m, d) { Art.blob(g, 8, 9, 5, 5, [PQ.U.shade(d.gemc || m[2], -0.4), d.gemc || m[2], PQ.U.shade(d.gemc || m[2], 0.35), '#fff']); Art.rect(g, 7, 1, 2, 4, m[1]); Art.px(g, 6, 7, '#fff'); },
    cloak(g, m) { for (let y = 2; y < 15; y++) { const w = 2 + y * 0.4; Art.rect(g, 8 - w, y, w * 2, 1, y < 4 ? m[3] : m[y % 3 === 0 ? 1 : 2]); } Art.rect(g, 6, 2, 4, 2, '#e8e0d0'); },
    potion(g, m, d) { Art.rect(g, 6, 1, 4, 2, '#a06a3c'); Art.rect(g, 7, 3, 2, 3, '#c8e8f0'); Art.blob(g, 8, 10, 5, 5, ['#2a2a36', d.liquid, PQ.U.shade(d.liquid, 0.35), '#fff']); Art.px(g, 6, 8, '#fff'); },
    food(g, m, d) {
      if (d.shape === 'bread') { Art.blob(g, 8, 9, 6, 4, ['#7a4a1a', '#b07a3a', '#d8a860', '#f2d090']); for (const x of [5, 8, 11]) Art.px(g, x, 7, '#7a4a1a'); }
      else if (d.shape === 'bowl') { Art.blob(g, 8, 9, 6, 4, [d.liquid, PQ.U.shade(d.liquid, 0.3)]); Art.rect(g, 2, 9, 12, 4, '#c8b48a'); Art.rect(g, 3, 13, 10, 1, '#8a7a5a'); }
      else if (d.shape === 'skewer') { for (let i = 0; i < 12; i++) Art.px(g, 2 + i, 13 - i, '#c8b48a'); for (const k of [0, 1, 2]) Art.blob(g, 5 + k * 3, 10 - k * 3, 2, 2, [PQ.U.shade(d.liquid, -0.3), d.liquid, PQ.U.shade(d.liquid, 0.3)]); }
      else { Art.blob(g, 8, 9, 5, 5, [PQ.U.shade(d.liquid, -0.3), d.liquid, PQ.U.shade(d.liquid, 0.35), '#fff']); }
    },
    crop(g, m, d) {
      const col = d.color;
      if (d.shape === 'grain') { for (const x of [5, 8, 11]) { Art.rect(g, x, 6, 1, 9, '#c8a43a'); Art.rect(g, x - 1, 2, 3, 5, col); } }
      else if (d.shape === 'root') { Art.blob(g, 8, 9, 3, 6, [PQ.U.shade(col, -0.3), col, PQ.U.shade(col, 0.3)]); for (const x of [6, 8, 10]) Art.rect(g, x, 0, 1, 4, '#43893d'); }
      else if (d.shape === 'pepper') { Art.blob(g, 8, 9, 3, 6, [PQ.U.shade(col, -0.3), col, PQ.U.shade(col, 0.35)]); Art.rect(g, 7, 1, 2, 3, '#43893d'); }
      else if (d.shape === 'big') { Art.blob(g, 8, 9, 6, 5, [PQ.U.shade(col, -0.4), PQ.U.shade(col, -0.15), col, PQ.U.shade(col, 0.3)]); Art.rect(g, 7, 2, 2, 3, '#77492a'); }
      else { for (const [x, y] of [[6, 7], [10, 8], [8, 11], [5, 11]]) Art.blob(g, x, y, 2.3, 2.3, [PQ.U.shade(col, -0.3), col, PQ.U.shade(col, 0.4)]); Art.rect(g, 8, 2, 1, 4, '#43893d'); }
    },
    seed(g, m, d) { Art.rect(g, 3, 4, 10, 11, '#d8c8a0'); Art.rect(g, 3, 4, 10, 2, '#a89870'); Art.rect(g, 6, 2, 4, 2, '#d8c8a0'); Art.blob(g, 8, 10, 2.5, 2.5, [PQ.U.shade(d.color, -0.3), d.color, PQ.U.shade(d.color, 0.3)]); },
    fish(g, m, d) { const col = d.color; Art.blob(g, 7, 8, 6, 3.2, [PQ.U.shade(col, -0.4), PQ.U.shade(col, -0.15), col, PQ.U.shade(col, 0.35)]); for (let y = -3; y <= 3; y++) Art.px(g, 13 + Math.abs(y) * 0.5, 8 + y, PQ.U.shade(col, -0.2)); Art.px(g, 3, 7, '#141018'); Art.rect(g, 6, 5, 4, 1, PQ.U.shade(col, 0.4)); },
    ore(g, m) { Art.blob(g, 8, 9, 6, 5, P.stone.slice(1, 5)); for (const [x, y] of [[6, 7], [10, 9], [8, 11]]) { Art.rect(g, x, y, 2, 2, m[2]); Art.px(g, x, y, m[3]); } },
    bar(g, m) { for (let y = 0; y < 5; y++) Art.rect(g, 2 + y, 6 + y, 12 - y, 1, m[y === 0 ? 3 : y < 3 ? 2 : 1]); Art.rect(g, 2, 6, 3, 5, m[1]); },
    gem(g, m) { for (let y = 0; y < 10; y++) { const w = y < 4 ? y + 2 : 10 - y; Art.rect(g, 8 - w, 3 + y, w * 2, 1, y < 2 ? m[3] : m[y % 2 ? 2 : 1]); } Art.px(g, 6, 5, '#fff'); },
    log(g) { Art.rect(g, 1, 6, 12, 6, '#77492a'); Art.rect(g, 1, 6, 12, 1, '#a06a3c'); Art.blob(g, 13, 9, 2.5, 3, ['#a06a3c', '#c99558', '#e8c890']); Art.px(g, 13, 9, '#77492a'); Art.rect(g, 4, 8, 4, 1, '#4f321f'); },
    plank(g) { for (const y of [4, 8, 12]) { Art.rect(g, 1, y, 14, 3, '#a06a3c'); Art.rect(g, 1, y, 14, 1, '#c99558'); Art.px(g, 4, y + 1, '#77492a'); } },
    rock(g) { Art.blob(g, 8, 9, 6, 5, P.stone.slice(1, 6)); },
    fiber(g) { for (let i = 0; i < 5; i++) for (let y = 3; y < 14; y++) Art.px(g, 4 + i * 2 + Math.round(Math.sin(y * 0.5 + i) * 1), y, i % 2 ? '#8ab04a' : '#6a9a3a'); Art.rect(g, 3, 9, 10, 2, '#c8a46a'); },
    gel(g, m, d) { Art.blob(g, 8, 10, 6, 4.5, [PQ.U.shade(d.color, -0.3), d.color, PQ.U.shade(d.color, 0.35), '#fff']); Art.px(g, 5, 8, '#fff'); },
    pelt(g, m, d) { const col = d.color; for (let y = 3; y < 14; y++) { const w = 5 + Math.sin(y * 0.6) * 1.5; Art.rect(g, 8 - w, y, w * 2, 1, y % 2 ? col : PQ.U.shade(col, -0.15)); } Art.rect(g, 2, 4, 2, 3, col); Art.rect(g, 12, 4, 2, 3, col); },
    bone(g) { for (let i = 0; i < 10; i++) Art.rect(g, 3 + i, 12 - i, 2, 2, '#e8dcc0'); for (const [x, y] of [[2, 11], [4, 13], [12, 2], [14, 4]]) Art.blob(g, x, y, 1.6, 1.6, ['#a89a80', '#e8dcc0', '#fff']); },
    feather(g, m, d) { for (let i = 0; i < 12; i++) { Art.px(g, 3 + i, 13 - i, '#e8e0d0'); Art.rect(g, 4 + i - 2, 12 - i - 1, 3, 1, i % 2 ? d.color : PQ.U.shade(d.color, 0.3)); } },
    herb(g, m, d) { Art.rect(g, 7, 6, 2, 9, '#43893d'); Art.blob(g, 5, 8, 3, 2, P.leaf); Art.blob(g, 11, 9, 3, 2, P.leaf); Art.blob(g, 8, 4, 3, 3, [PQ.U.shade(d.color, -0.3), d.color, PQ.U.shade(d.color, 0.4)]); },
    mushroom(g, m, d) { Art.rect(g, 7, 8, 3, 6, '#e8dcc8'); Art.blob(g, 8, 7, 6, 4, [PQ.U.shade(d.color, -0.4), d.color, PQ.U.shade(d.color, 0.35), '#fff']); Art.px(g, 6, 6, '#fff'); },
    shard(g, m) { for (let y = 0; y < 12; y++) { const w = y < 6 ? y / 2 + 1 : (12 - y) / 2; Art.rect(g, 8 - w, 2 + y, w * 2, 1, m[y < 4 ? 3 : 2]); } Art.px(g, 7, 5, '#fff'); },
    silk(g) { Art.blob(g, 8, 9, 6, 5, ['#a8a4b8', '#d8d4e8', '#f4f2ff', '#fff']); for (let i = 0; i < 4; i++) Art.rect(g, 3, 6 + i * 2, 10, 1, '#c0bcd0'); },
    arrow(g) { for (let k = 0; k < 3; k++) for (let i = 0; i < 10; i++) { Art.px(g, 2 + i + k * 2, 13 - i, '#a06a3c'); } for (let k = 0; k < 3; k++) { Art.px(g, 12 + k * 2, 3, '#b4b4c4'); Art.px(g, 2 + k * 2, 13, '#e8363c'); } },
    key(g, m) { Art.blob(g, 5, 5, 3, 3, m); Art.px(g, 5, 5, '#141018'); for (let i = 0; i < 8; i++) Art.px(g, 7 + i * 0.8, 7 + i * 0.8, m[2]); Art.rect(g, 11, 12, 3, 1, m[2]); Art.rect(g, 12, 10, 1, 2, m[2]); },
    treat(g, m, d) { Art.blob(g, 8, 9, 5, 5, ['#8a3a5a', '#d8609a', '#ffa0d0', '#fff']); Art.rect(g, 4, 6, 8, 1, '#fff'); Art.px(g, 8, 4, d.color || '#ffd75a'); },
    sigil(g, m, d) { Art.blob(g, 8, 8, 6, 6, [PQ.U.shade(d.color, -0.5), PQ.U.shade(d.color, -0.2), d.color, PQ.U.shade(d.color, 0.45)]); Art.rect(g, 7, 4, 2, 8, '#fff8e0'); Art.rect(g, 4, 7, 8, 2, '#fff8e0'); },
    scroll(g, m, d) { Art.rect(g, 3, 3, 10, 10, '#e8dcb8'); Art.rect(g, 2, 2, 12, 2, '#c8b48a'); Art.rect(g, 2, 12, 12, 2, '#c8b48a'); for (const y of [6, 8, 10]) Art.rect(g, 5, y, 6, 1, '#8a7a5a'); if (d.color) Art.blob(g, 11, 11, 2, 2, [d.color, '#fff']); },
    tablet(g, m, d) { Art.rect(g, 3, 2, 10, 12, '#c4955a'); Art.rect(g, 3, 2, 10, 1, '#ddb579'); for (const y of [5, 8, 11]) Art.rect(g, 5, y, 6, 1, '#7a5530'); Art.blob(g, 8, 4, 1.5, 1.5, ['#ffd34d', '#fff']); },
    decor(g, m, d) { const s = Art.makeDecor(d.decor); g.drawImage(s, 0, 0, 16, 16); },
    coin(g) { Art.blob(g, 8, 8, 5, 5, P.gold); Art.rect(g, 7, 5, 2, 6, P.gold[1]); },
    misc(g, m, d) { Art.blob(g, 8, 8, 5, 5, [PQ.U.shade(d.color || '#888', -0.3), d.color || '#888', PQ.U.shade(d.color || '#888', 0.4)]); },
  };
  Art.ICON = ICON;
  Art.icon = function (item) {
    if (Art.icons[item.id]) return Art.icons[item.id];
    const [c, g] = ic();
    const m = MAT[item.mat] || MAT.iron;
    const f = ICON[item.icon] || ICON.misc;
    f(g, m, item);
    let out = Art.outline(c, 0);
    // pad to 16 by outlining inside existing bounds (icons leave margin)
    return (Art.icons[item.id] = out);
  };
  const urlCache = {};
  Art.iconURL = function (item) {
    if (urlCache[item.id]) return urlCache[item.id];
    const c = Art.icon(item);
    let url = '';
    try { url = c.toDataURL(); } catch (e) { url = ''; }
    return (urlCache[item.id] = url);
  };
})();
