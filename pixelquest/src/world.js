/* PIXEL QUEST — maps, chunk rendering, collision and procedural world generation */
'use strict';
(function () {
  const T = PQ.T, TL = PQ.TILE, Art = PQ.Art, U = PQ.U;
  const TI = () => Art.TINFO;
  const CH = 16; // chunk size in tiles
  const REGIONS = ['greenfields', 'darkwood', 'sunscorch', 'frostfall', 'volcanic', 'shadow'];
  PQ.REGIONS = REGIONS;
  const W = {};
  PQ.World = W;

  /* =========================================================
     Map
     ========================================================= */
  class GMap {
    constructor(id, w, h, o = {}) {
      this.id = id; this.w = w; this.h = h;
      this.tiles = new Uint8Array(w * h); this.vari = new Uint8Array(w * h); this.reg = new Uint8Array(w * h);
      this.objAt = new Array(w * h).fill(null); this.objs = [];
      this.spots = {}; this.theme = o.theme || null; this.dark = !!o.dark; this.kind = o.kind || 'overworld';
      this.name = o.name || id; this.chunks = new Map(); this.mobs = []; this.safe = []; this.farm = []; this.music = o.music || null;
      this.outside = o.outside || 0; // tile id used out of bounds
    }
    idx(x, y) { return y * this.w + x; }
    inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    t(x, y) { return this.inb(x, y) ? this.tiles[y * this.w + x] : this.outside; }
    set(x, y, t) { if (!this.inb(x, y)) return; this.tiles[y * this.w + x] = t; this.invalidate(x, y); }
    region(x, y) { return this.inb(x, y) ? REGIONS[this.reg[y * this.w + x]] : REGIONS[0]; }
    invalidate(x, y) {
      const cx = Math.floor(x / CH), cy = Math.floor(y / CH);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        this.chunks.delete(Math.floor(nx / CH) + ',' + Math.floor(ny / CH));
      }
      this.chunks.delete(cx + ',' + cy);
    }
    addObj(o) {
      o.w = o.w || 1; o.h = o.h || 1;
      if (!o.id) o.id = this.id + ':' + o.k + ':' + o.x + ',' + o.y;
      for (let dy = 0; dy < o.h; dy++) for (let dx = 0; dx < o.w; dx++) {
        const X = o.x + dx, Y = o.y - dy;
        if (!this.inb(X, Y)) continue;
        const prev = this.objAt[this.idx(X, Y)];
        if (prev && prev !== o) this.removeObj(prev);
        this.objAt[this.idx(X, Y)] = o;
      }
      this.objs.push(o);
      return o;
    }
    removeObj(o) {
      for (let dy = 0; dy < o.h; dy++) for (let dx = 0; dx < o.w; dx++) {
        const X = o.x + dx, Y = o.y - dy;
        if (this.inb(X, Y) && this.objAt[this.idx(X, Y)] === o) this.objAt[this.idx(X, Y)] = null;
      }
      const i = this.objs.indexOf(o); if (i >= 0) this.objs.splice(i, 1);
    }
    obj(x, y) { return this.inb(x, y) ? this.objAt[y * this.w + x] : null; }
    clearObjs(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const o = this.obj(x, y); if (o) this.removeObj(o); } }
    /* walkability: 0 solid, 1 walk, 2 swim */
    walk(x, y) {
      const t = this.t(x, y);
      let w = TI()[t].walk;
      if (!w) return 0;
      const o = this.obj(x, y);
      if (o && o.solid && !o.gone) return 0;
      return w;
    }
    findSpot(name) { return this.spots[name]; }

    /* ---------------- chunk rendering ---------------- */
    chunk(cx, cy) {
      const key = cx + ',' + cy;
      let c = this.chunks.get(key);
      if (c) { this.chunks.delete(key); this.chunks.set(key, c); return c; }
      c = this.renderChunk(cx, cy);
      this.chunks.set(key, c);
      if (this.chunks.size > 60) { const first = this.chunks.keys().next().value; this.chunks.delete(first); }
      return c;
    }
    renderChunk(cx, cy) {
      const [c, g] = PQ.canvas(CH * T, CH * T);
      const info = TI();
      const FR = [TL.GRASS, TL.DGRASS, TL.SNOW, TL.SAND, TL.DIRT, TL.STONE, TL.ASH, TL.SHADOW, TL.COBBLE, TL.ICE];
      for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
        const x = cx * CH + tx, y = cy * CH + ty;
        const px = tx * T, py = ty * T;
        if (!this.inb(x, y)) { if (this.kind === 'overworld') g.drawImage(Art.tile(this.outside, 0, this.theme), px, py); else { g.fillStyle = '#0a0810'; g.fillRect(px, py, T, T); } continue; }
        const t = this.t(x, y), v = this.vari[this.idx(x, y)];
        const reg = this.region(x, y);
        if (t === TL.CLIFF || t === TL.VINE) {
          const below = this.t(x, y + 1);
          const face = below !== TL.CLIFF && below !== TL.VINE;
          const th = reg === 'frostfall' ? 'snow' : reg === 'volcanic' ? 'ash' : reg === 'sunscorch' ? 'sand' : reg === 'shadow' ? 'shadow' : 'grass';
          g.drawImage(t === TL.VINE ? Art.vine() : Art.cliff(face, th, v % 5), px, py);
          continue;
        }
        g.drawImage(Art.tile(t, v % 4, this.theme), px, py);
        // fringes from higher priority neighbours
        const myP = info[t].pri;
        if (myP > 0 || info[t].water || t === TL.LAVA) {
          for (const [dx, dy, d] of [[0, -1, 'n'], [0, 1, 's'], [-1, 0, 'w'], [1, 0, 'e']]) {
            const nt = this.t(x + dx, y + dy);
            if (nt !== t && FR.includes(nt) && info[nt].pri > myP) g.drawImage(Art.fringeTile(nt, d), px, py);
          }
        }
        // shoreline foam
        if (info[t].water && t !== TL.BROKEN) {
          for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            const nt = this.t(x + dx, y + dy);
            if (!info[nt].water && nt !== TL.BRIDGE) {
              g.fillStyle = 'rgba(216,246,255,0.75)';
              for (let i = 0; i < T; i += 2) {
                const o = (U.hash2(x * 16 + i, y, 3) > 0.5 ? 1 : 0) + 3;
                if (dy === -1) g.fillRect(px + i, py + o, 2, 1); if (dy === 1) g.fillRect(px + i, py + T - o - 1, 2, 1);
                if (dx === -1) g.fillRect(px + o, py + i, 1, 2); if (dx === 1) g.fillRect(px + T - o - 1, py + i, 1, 2);
              }
            }
          }
        }
        if (t === TL.LAVA) {
          for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            const nt = this.t(x + dx, y + dy);
            if (nt !== TL.LAVA) { g.fillStyle = '#ffe27a'; if (dy === -1) g.fillRect(px, py, T, 1); if (dy === 1) g.fillRect(px, py + T - 1, T, 1); if (dx === -1) g.fillRect(px, py, 1, T); if (dx === 1) g.fillRect(px + T - 1, py, 1, T); }
          }
        }
        // shadow under cliff faces
        const up = this.t(x, y - 1);
        if (up === TL.CLIFF || up === TL.VINE) { g.fillStyle = 'rgba(10,8,20,0.35)'; g.fillRect(px, py, T, 3); g.fillStyle = 'rgba(10,8,20,0.18)'; g.fillRect(px, py + 3, T, 2); }
        if (up === TL.WALL && t !== TL.WALL) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(px, py, T, 4); }
        // decor
        this.decor(g, t, x, y, px, py);
      }
      return c;
    }
    decor(g, t, x, y, px, py) {
      const h = U.hash2(x, y, 77);
      if (this.obj(x, y)) return;
      const P = Art.P;
      const flower = (col) => { const fx = px + 4 + Math.floor(U.hash2(x, y, 5) * 8), fy = py + 4 + Math.floor(U.hash2(x, y, 6) * 8); Art.rect(g, fx, fy + 2, 1, 2, P.grass[1]); Art.rect(g, fx - 1, fy, 3, 1, col); Art.rect(g, fx, fy - 1, 1, 3, col); Art.px(g, fx, fy, '#fff3b0'); };
      const tuft = (ramp) => { const fx = px + 3 + Math.floor(U.hash2(x, y, 8) * 9), fy = py + 6 + Math.floor(U.hash2(x, y, 9) * 7); Art.px(g, fx, fy, ramp[4]); Art.px(g, fx + 1, fy - 1, ramp[4]); Art.px(g, fx + 2, fy, ramp[3]); Art.px(g, fx + 1, fy + 1, ramp[1]); Art.px(g, fx + 3, fy - 1, ramp[3]); };
      if (t === TL.GRASS) {
        if (h < 0.035) flower(['#ff70b0', '#ffd75a', '#ffffff', '#8a9cff', '#ff6a4a'][Math.floor(U.hash2(x, y, 4) * 5)]);
        else if (h < 0.13) tuft(P.grass);
        else if (h < 0.14) { Art.rect(g, px + 6, py + 9, 3, 2, P.stone[3]); Art.px(g, px + 6, py + 9, P.stone[4]); }
      } else if (t === TL.DGRASS) {
        if (h < 0.02) { const fx = px + 6, fy = py + 7; Art.rect(g, fx, fy + 2, 1, 3, '#d8ccb0'); Art.rect(g, fx - 1, fy, 3, 2, '#9a6aff'); Art.px(g, fx, fy, '#e0c8ff'); }
        else if (h < 0.12) tuft(P.dgrass);
        else if (h < 0.135) { Art.rect(g, px + 4, py + 8, 4, 1, '#5a3a20'); Art.px(g, px + 5, py + 7, '#a06a3c'); }
      } else if (t === TL.SAND) {
        if (h < 0.012) { Art.rect(g, px + 5, py + 8, 5, 2, '#e8dcc0'); Art.px(g, px + 4, py + 7, '#e8dcc0'); Art.px(g, px + 10, py + 9, '#e8dcc0'); }
        else if (h < 0.03) { Art.rect(g, px + 7, py + 9, 2, 1, P.sand[0]); Art.px(g, px + 7, py + 8, P.sand[1]); }
      } else if (t === TL.SNOW) {
        if (h < 0.05) { Art.px(g, px + 4 + Math.floor(h * 200) % 8, py + 6, '#ffffff'); Art.px(g, px + 9, py + 11, '#e6faff'); }
        else if (h < 0.07) { Art.rect(g, px + 5, py + 8, 3, 2, P.stone[3]); Art.rect(g, px + 5, py + 8, 3, 1, '#ffffff'); }
      } else if (t === TL.ASH) {
        if (h < 0.04) { Art.rect(g, px + 4, py + 7, 3, 1, P.lava[1]); Art.px(g, px + 6, py + 8, P.lava[2]); }
      } else if (t === TL.SHADOW) {
        if (h < 0.03) { Art.px(g, px + 7, py + 6, '#b892f0'); Art.px(g, px + 8, py + 9, '#7552ad'); }
      } else if (t === TL.FLOOR) {
        if (h < 0.03) { Art.rect(g, px + 5, py + 9, 4, 2, '#e8dcc0'); Art.px(g, px + 4, py + 8, '#e8dcc0'); }
        else if (h < 0.06) { Art.rect(g, px + 3, py + 4, 5, 1, 'rgba(0,0,0,0.25)'); Art.rect(g, px + 7, py + 5, 1, 3, 'rgba(0,0,0,0.25)'); }
      }
    }
  }
  W.GMap = GMap;
  W.CH = CH;

  /* =========================================================
     A* pathfinding on a cost function
     ========================================================= */
  W.astar = function (m, sx, sy, ex, ey, cost, maxNodes = 60000) {
    const w = m.w, start = sy * w + sx, goal = ey * w + ex;
    const g = new Map([[start, 0]]), came = new Map();
    const heap = [[0, start]];
    const push = (n) => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let s = i; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === i) break; [heap[s], heap[i]] = [heap[i], heap[s]]; i = s; } } return top; };
    let n = 0;
    while (heap.length && n++ < maxNodes) {
      const [, cur] = pop();
      if (cur === goal) break;
      const cx = cur % w, cy = (cur / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!m.inb(nx, ny)) continue;
        const c = cost(nx, ny);
        if (c >= 999) continue;
        const ni = ny * w + nx, ng = g.get(cur) + c;
        if (!g.has(ni) || ng < g.get(ni)) { g.set(ni, ng); came.set(ni, cur); push([ng + Math.abs(nx - ex) + Math.abs(ny - ey), ni]); }
      }
    }
    if (!came.has(goal) && start !== goal) return null;
    const path = [];
    let c = goal;
    while (c !== start) { path.push([c % w, (c / w) | 0]); c = came.get(c); if (c === undefined) return null; }
    path.push([sx, sy]);
    return path.reverse();
  };

  /* =========================================================
     helpers for placing content
     ========================================================= */
  function treeObj(m, x, y, kind, v) { return m.addObj({ k: 'tree', kind, v, x, y, solid: true, hp: kind === 'giant' ? 6 : 3, tall: 1 }); }
  function fill(m, x0, y0, x1, y1, t) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.set(x, y, t); }
  function clear(m, x0, y0, x1, y1, t) { m.clearObjs(x0, y0, x1, y1); if (t != null) fill(m, x0, y0, x1, y1, t); }
  function house(m, x, y, w, roof, wall, o = {}) { // x,y = bottom-left tile
    const obj = m.addObj(Object.assign({ k: 'house', x, y, w, h: 3, solid: true, roof, wall, tall: 1 }, o));
    const door = { x: x + Math.floor(w / 2), y: y + 1 };
    obj.door = door;
    return obj;
  }
  W.helpers = { fill, clear, house, treeObj };

  /* =========================================================
     OVERWORLD
     ========================================================= */
  W.genOverworld = function (seed) {
    const MW = 224, MH = 192;
    const m = new GMap('world', MW, MH, { kind: 'overworld', outside: TL.DEEP });
    const R = PQ.RNG(seed);
    const N = PQ.Noise(seed), N2 = PQ.Noise(seed + 11), N3 = PQ.Noise(seed + 23), N4 = PQ.Noise(seed + 37);
    const reg = (x, y) => m.reg[m.idx(x, y)];
    const bnY = (x) => 66 + Math.round((N.fbm(x / 30, 3) - 0.5) * 14);
    const rivX = (y) => 150 + Math.round(Math.sin(y * 0.045) * 6 + (N.fbm(4, y / 20) - 0.5) * 8);
    const dwX = (y) => 72 + Math.round((N.fbm(9, y / 25) - 0.5) * 20);
    const fvX = (y) => 140 + Math.round((N.fbm(2, y / 18) - 0.5) * 14);
    // ---- regions ----
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      let r;
      if (y < bnY(x)) r = x < fvX(y) ? 3 : 4;
      else if (x > rivX(y)) r = 2;
      else if (x < dwX(y)) r = 1;
      else r = 0;
      m.reg[m.idx(x, y)] = r;
      m.vari[m.idx(x, y)] = Math.floor(U.hash2(x, y, seed) * 8);
    }
    // ---- base terrain ----
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const r = reg(x, y);
      const n2 = N2.fbm(x / 16, y / 16, 4);
      let t;
      if (r === 0) t = n2 < 0.24 ? (n2 < 0.19 ? TL.DEEP : TL.WATER) : n2 < 0.265 ? TL.SAND : TL.GRASS;
      else if (r === 1) t = n2 < 0.23 ? (n2 < 0.19 ? TL.DEEP : TL.WATER) : TL.DGRASS;
      else if (r === 2) { t = n2 < 0.2 ? TL.WATER : TL.SAND; if (N3.fbm(x / 10, y / 10) > 0.68) t = TL.STONE; }
      else if (r === 3) { t = n2 < 0.27 ? (n2 < 0.2 ? TL.WATER : TL.ICE) : TL.SNOW; if (N3.fbm(x / 9, y / 9) > 0.7) t = TL.STONE; }
      else { t = n2 < 0.3 ? TL.LAVA : TL.ASH; if (N3.fbm(x / 9, y / 9) > 0.68) t = TL.STONE; }
      m.tiles[m.idx(x, y)] = t;
    }
    // ---- coasts & borders ----
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const e = N4.fbm(x / 12, y / 12) * 4;
      const south = MH - 1 - y, east = MW - 1 - x, west = x, north = y;
      const i = m.idx(x, y);
      if (north < 3 + e * 0.5) { m.tiles[i] = TL.CLIFF; continue; }
      if (south < 4 + e || (east < 4 + e && y > 60) || west < 3 + e * 0.6) { m.tiles[i] = TL.DEEP; continue; }
      if ((south < 7 + e || (east < 7 + e && y > 60) || west < 5 + e * 0.6) && m.tiles[i] !== TL.LAVA) m.tiles[i] = reg(x, y) === 3 ? TL.SNOW : TL.SAND;
      if (east < 3 + e && y <= 60) m.tiles[i] = TL.CLIFF;
    }
    // ---- river (greenfields | desert) ----
    for (let y = bnY(150) - 2; y < MH; y++) {
      const cx = rivX(y);
      for (let dx = -3; dx <= 3; dx++) {
        const x = cx + dx; if (!m.inb(x, y)) continue;
        m.tiles[m.idx(x, y)] = Math.abs(dx) <= 1 ? TL.DEEP : Math.abs(dx) === 2 ? TL.WATER : (m.tiles[m.idx(x, y)] === TL.DEEP ? TL.DEEP : TL.SAND);
      }
    }
    // ---- lava moat around the volcanic region ----
    for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
      if (reg(x, y) !== 4) continue;
      let border = false;
      for (let dy = -2; dy <= 2 && !border; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (m.inb(X, Y) && reg(X, Y) !== 4) { border = true; break; } }
      if (border && m.tiles[m.idx(x, y)] !== TL.CLIFF) m.tiles[m.idx(x, y)] = TL.LAVA;
    }
    // ---- cliff ridges with vines (climbable) ----
    for (let y = 6; y < MH - 8; y++) for (let x = 6; x < MW - 6; x++) {
      const r = reg(x, y);
      if (!(r === 3 || (r === 0 && y < 120) || r === 2)) continue;
      const v = N3.fbm(x / 15 + 40, y / 15 + 40);
      if (Math.abs(v - 0.5) < 0.012 && [TL.SNOW, TL.GRASS, TL.SAND, TL.STONE].includes(m.tiles[m.idx(x, y)])) m.tiles[m.idx(x, y)] = U.hash2(x, y, 9) < 0.12 ? TL.VINE : TL.CLIFF;
    }
    // ---- vegetation & resources ----
    for (let y = 2; y < MH - 2; y++) for (let x = 2; x < MW - 2; x++) {
      const t = m.tiles[m.idx(x, y)], r = reg(x, y);
      const F = N3.fbm(x / 11 + 100, y / 11);
      const h = U.hash2(x, y, seed + 5), h2 = U.hash2(x, y, seed + 6);
      const v = Math.floor(h2 * 4);
      if (r === 0 && t === TL.GRASS) {
        if (F > 0.6 && h < 0.42) treeObj(m, x, y, h2 < 0.75 ? 'oak' : h2 < 0.88 ? 'pine' : h2 < 0.96 ? 'apple' : 'autumn', v);
        else if (h < 0.016) treeObj(m, x, y, h2 < 0.6 ? 'oak' : 'apple', v);
        else if (h < 0.034) m.addObj({ k: 'bush', kind: h2 < 0.35 ? 'berry' : 'leaf', v, x, y, solid: true });
        else if (h < 0.046) m.addObj({ k: 'rock', kind: 'grey', ore: h2 < 0.18 ? 'copper' : null, v, x, y, solid: true });
        else if (h < 0.052) m.addObj({ k: 'herb', item: 'greenleaf', x, y });
      } else if (r === 1 && t === TL.DGRASS) {
        if (F > 0.45 && h < 0.5) treeObj(m, x, y, h2 < 0.25 ? 'giant' : 'oak', v);
        else if (h < 0.03) treeObj(m, x, y, 'oak', v);
        else if (h < 0.05) m.addObj({ k: 'bush', kind: h2 < 0.3 ? 'berry' : 'dark', v, x, y, solid: true });
        else if (h < 0.064) m.addObj({ k: 'mushroom', x, y, solid: false });
        else if (h < 0.075) m.addObj({ k: 'rock', kind: 'grey', ore: h2 < 0.3 ? 'iron' : h2 < 0.38 ? 'copper' : null, v, x, y, solid: true });
        else if (h < 0.081) m.addObj({ k: 'herb', item: 'moonpetal', x, y });
      } else if (r === 2 && (t === TL.SAND || t === TL.STONE)) {
        if (h < 0.018) m.addObj({ k: 'tree', kind: 'cactus', v: v % 2, x, y, solid: true, hp: 2, tall: 1 });
        else if (h < 0.034) m.addObj({ k: 'rock', kind: 'sand', ore: h2 < 0.22 ? 'gold' : h2 < 0.3 ? 'iron' : null, v, x, y, solid: true });
        else if (h < 0.039) m.addObj({ k: 'herb', item: 'sunbloom', x, y });
        else if (h < 0.044) treeObj(m, x, y, 'dead', v);
      } else if (r === 3 && (t === TL.SNOW || t === TL.STONE)) {
        if (F > 0.55 && h < 0.4) treeObj(m, x, y, 'snowpine', v);
        else if (h < 0.012) treeObj(m, x, y, 'snowpine', v);
        else if (h < 0.034) m.addObj({ k: 'rock', kind: 'snow', ore: h2 < 0.3 ? 'frost' : h2 < 0.42 ? 'iron' : null, v, x, y, solid: true });
        else if (h < 0.04) m.addObj({ k: 'herb', item: 'frostbloom', x, y });
        else if (h < 0.044) m.addObj({ k: 'crystal', col: 'frost', x, y, solid: true });
        else if (h < 0.052) m.addObj({ k: 'bush', kind: 'snow', v, x, y, solid: true });
      } else if (r === 4 && (t === TL.ASH || t === TL.STONE)) {
        if (h < 0.02) treeObj(m, x, y, 'dead', v);
        else if (h < 0.05) m.addObj({ k: 'rock', kind: 'ash', ore: h2 < 0.35 ? 'ember' : null, v, x, y, solid: true });
        else if (h < 0.056) m.addObj({ k: 'herb', item: 'fireroot', x, y });
        else if (h < 0.059) m.addObj({ k: 'crystal', col: 'ember', x, y, solid: true });
      }
      if ((r === 0 || r === 2) && t === TL.SAND && h < 0.02 && m.t(x, y + 1) !== TL.DEEP) {
        const nearW = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]].some(([dx, dy]) => TI()[m.t(x + dx, y + dy)].water);
        if (nearW && r === 2) treeObj(m, x, y, 'palm', v);
      }
    }
    // ---- landmarks ----
    const S = m.spots;
    const spot = (name, x, y) => (S[name] = { x, y });
    const VX = 112, VY = 148;
    // Willowbrook village
    clear(m, VX - 17, VY - 12, VX + 17, VY + 12, TL.GRASS);
    fill(m, VX - 5, VY - 4, VX + 5, VY + 3, TL.COBBLE);
    m.safe.push([VX - 18, VY - 13, VX + 18, VY + 13]);
    m.addObj({ k: 'well', x: VX - 1, y: VY - 1, w: 2, h: 1, solid: true, tall: 1 });
    house(m, VX - 14, VY - 6, 5, '#7a3a8a', '#d8c8a0', { name: "Elder's House", chimney: 1 });
    house(m, VX + 8, VY - 6, 6, '#4a4a5e', '#a89a80', { name: 'Smithy', chimney: 1, sign: '#ff8a2e' });
    house(m, VX - 15, VY + 7, 4, '#3f5fae', '#d8c8a0', { name: 'Cottage' });
    house(m, VX + 10, VY + 8, 4, '#a8414c', '#e8dcb8', { name: 'Cottage' });
    m.addObj({ k: 'stall', stripe: '#3f97d6', x: VX - 4, y: VY - 6, w: 3, h: 2, solid: true, tall: 1 });
    m.addObj({ k: 'stall', stripe: '#9a5cff', x: VX + 2, y: VY - 6, w: 3, h: 2, solid: true, tall: 1 });
    m.addObj({ k: 'station', kind: 'forge', x: VX + 15, y: VY - 4, solid: true, public: 1 });
    m.addObj({ k: 'station', kind: 'alchemy', x: VX + 6, y: VY - 7, solid: true, public: 1 });
    for (const [lx, ly] of [[VX - 6, VY - 5], [VX + 6, VY - 5], [VX - 6, VY + 4], [VX + 6, VY + 4]]) m.addObj({ k: 'lantern', x: lx, y: ly, solid: true, tall: 1, light: 1 });
    m.addObj({ k: 'sign', x: VX - 2, y: VY + 5, text: 'WILLOWBROOK  - North: Ancient Ruins  West: Darkwood  East: Mossy Hollow', solid: true });
    spot('village_center', VX + 1, VY + 1); spot('village_smith', VX + 11, VY - 4); spot('village_store', VX - 3, VY - 4); spot('village_potion', VX + 3, VY - 4);
    spot('village_well', VX - 3, VY + 1); spot('maren_home', VX - 12, VY - 5);
    // farm & windmill (Oswin)
    fill(m, VX + 5, VY + 3, VX + 12, VY + 6, TL.TILLED);
    for (let x = VX + 5; x <= VX + 12; x++) for (let y = VY + 3; y <= VY + 6; y++) if ((x + y) % 2) m.addObj({ k: 'cropdeco', crop: ['wheat', 'carrot', 'tomato', 'pumpkin'][(x * 3 + y) % 4], x, y });
    m.addObj({ k: 'windmill', x: VX + 13, y: VY + 4, w: 2, h: 2, solid: true, tall: 1 });
    spot('village_farm', VX + 8, VY + 7);
    // ranch (Pip)
    for (let x = VX - 16; x <= VX - 9; x++) { m.addObj({ k: 'fence', x, y: VY + 1, solid: true }); }
    m.addObj({ k: 'station', kind: 'altar', x: VX - 13, y: VY + 3, solid: true, public: 1 });
    spot('village_ranch', VX - 11, VY + 3);
    // pond & dock (Nell)
    const PX = VX + 9, PY = VY + 16;
    for (let y = PY - 3; y <= PY + 3; y++) for (let x = PX - 5; x <= PX + 5; x++) { const d = ((x - PX) / 5.5) ** 2 + ((y - PY) / 3.5) ** 2; if (d < 1) { m.clearObjs(x, y, x, y); m.set(x, y, d < 0.5 ? TL.DEEP : TL.WATER); } else if (d < 1.4) m.set(x, y, TL.SAND); }
    fill(m, PX - 1, PY - 4, PX - 1, PY - 1, TL.BRIDGE);
    spot('village_dock', PX - 2, PY - 4);
    // player home
    const HX = VX - 22, HY = VY + 10;
    clear(m, HX - 3, HY - 6, HX + 12, HY + 7, TL.GRASS);
    m.safe.push([HX - 3, HY - 6, HX + 12, HY + 7]);
    const home = house(m, HX, HY, 5, '#c8603a', '#e8dcb8', { name: 'Your Home', home: 1, chimney: 1 });
    m.addObj({ k: 'sign', x: HX + 5, y: HY + 1, text: 'HOME  - Bed, storage, workbench and cooking pot inside. Farm plot to the east.', solid: true });
    spot('home_door', home.door.x, home.door.y);
    for (let y = HY - 3; y <= HY + 1; y++) for (let x = HX + 7; x <= HX + 11; x++) { m.set(x, y, TL.SOIL); m.farm.push(m.idx(x, y)); }
    for (let x = HX + 6; x <= HX + 12; x++) { m.addObj({ k: 'fence', x, y: HY - 4, solid: true }); }
    spot('farm', HX + 9, HY - 1);
    m.homePlot = { x0: HX + 7, y0: HY - 3, x1: HX + 11, y1: HY + 1, ex0: HX + 7, ey0: HY + 2, ex1: HX + 11, ey1: HY + 4 };
    m.addObj({ k: 'waypoint', wid: 'wp_home', name: 'Home', x: HX - 2, y: HY + 2, solid: true, tall: 1 });
    m.addObj({ k: 'waypoint', wid: 'wp_village', name: 'Willowbrook', x: VX + 4, y: VY + 2, solid: true, tall: 1 });
    // Mossy Hollow (beginner dungeon) east of the village
    const CX = VX + 26, CY = VY - 10;
    clear(m, CX - 3, CY - 3, CX + 3, CY + 2, TL.GRASS);
    m.addObj({ k: 'entrance', dungeon: 'cave', x: CX - 1, y: CY, w: 3, h: 2, solid: true, tall: 1 });
    spot('dng_cave', CX, CY + 1);
    // Ancient ruins + gate north of village
    const GX = VX, GY = VY - 34;
    clear(m, GX - 8, GY - 6, GX + 8, GY + 5, TL.GRASS);
    fill(m, GX - 3, GY - 2, GX + 3, GY + 3, TL.COBBLE);
    for (const [px, py, b] of [[GX - 6, GY - 3, 0], [GX + 6, GY - 3, 1], [GX - 6, GY + 3, 1], [GX + 6, GY + 3, 0], [GX - 8, GY, 1], [GX + 8, GY, 1]]) m.addObj({ k: 'pillar', broken: b, x: px, y: py, solid: true, tall: 1 });
    m.addObj({ k: 'gate', x: GX - 1, y: GY - 1, w: 4, h: 2, solid: true, tall: 1 });
    spot('ancient_gate', GX + 1, GY + 1); spot('portal', GX + 1, GY);
    m.addObj({ k: 'waypoint', wid: 'wp_ruins', name: 'Ancient Ruins', x: GX + 4, y: GY + 3, solid: true, tall: 1 });
    // bridge site
    const BY = VY + 4, BXc = rivX(BY);
    for (let x = BXc - 3; x <= BXc + 3; x++) { m.clearObjs(x, BY, x, BY + 1); m.set(x, BY, TL.BROKEN); m.set(x, BY + 1, TL.BROKEN); }
    m.bridge = { x0: BXc - 3, x1: BXc + 3, y: BY };
    spot('bridge_site', BXc - 5, BY); spot('bridge_w', BXc - 5, BY); spot('bridge_e', BXc + 5, BY);
    clear(m, BXc - 7, BY - 2, BXc - 4, BY + 3, TL.GRASS);
    // Darkwood shrine + temple + secrets
    const DX = 42, DY = 120;
    clear(m, DX - 7, DY - 6, DX + 7, DY + 6, TL.DGRASS);
    fill(m, DX - 2, DY - 2, DX + 2, DY + 2, TL.STONE);
    for (let a = 0; a < 8; a++) m.addObj({ k: 'pillar', broken: a % 3 === 0 ? 1 : 0, x: DX + Math.round(Math.cos(a / 8 * 6.28) * 5), y: DY + Math.round(Math.sin(a / 8 * 6.28) * 4), solid: true, tall: 1, mossy: 1 });
    m.addObj({ k: 'campfire', x: DX, y: DY, solid: true, light: 1 });
    spot('darkwood_shrine', DX + 1, DY + 2);
    m.addObj({ k: 'waypoint', wid: 'wp_shrine', name: 'Darkwood Shrine', x: DX - 3, y: DY + 3, solid: true, tall: 1 });
    m.safe.push([DX - 7, DY - 6, DX + 7, DY + 6]);
    const TX = 22, TY = 96;
    clear(m, TX - 4, TY - 3, TX + 4, TY + 3, TL.DGRASS);
    m.addObj({ k: 'entrance', dungeon: 'forest', x: TX - 1, y: TY, w: 3, h: 2, solid: true, tall: 1 });
    spot('dng_forest', TX, TY + 1);
    // moonlit grove (secret): clearing ringed by giant trees with one gap
    const MX = 30, MY = 152;
    for (let y = MY - 5; y <= MY + 5; y++) for (let x = MX - 6; x <= MX + 6; x++) {
      const d = ((x - MX) / 6) ** 2 + ((y - MY) / 5) ** 2;
      if (d <= 0.75) { m.clearObjs(x, y, x, y); m.set(x, y, TL.DGRASS); }
      else if (d <= 1.25 && !(y === MY + 4 && Math.abs(x - MX) <= 1) && !(y === MY + 5 && Math.abs(x - MX) <= 1)) { m.clearObjs(x, y, x, y); m.set(x, y, TL.DGRASS); treeObj(m, x, y, 'giant', (x + y) % 4); }
    }
    m.addObj({ k: 'chest', tier: 2, fixed: [['u_moonlit', 1], ['moonpetal', 5]], x: MX, y: MY - 1, solid: true });
    m.mobs.push({ e: 'mimic', x: MX - 2, y: MY + 1 }, { e: 'mimic', x: MX + 2, y: MY + 1 });
    m.clearObjs(57, 132, 59, 134);
    m.addObj({ k: 'chest', tier: 1, fixed: [['locket', 1], ['glowcap', 3]], x: 58, y: 133, solid: true, id: 'world:chest:locket' });
    // Dunehaven (desert town)
    const ZX = 184, ZY = 150;
    clear(m, ZX - 12, ZY - 9, ZX + 12, ZY + 8, TL.SAND);
    fill(m, ZX - 4, ZY - 2, ZX + 4, ZY + 2, TL.STONE);
    m.safe.push([ZX - 12, ZY - 9, ZX + 12, ZY + 8]);
    house(m, ZX - 10, ZY - 4, 5, '#c8903a', '#e8d0a0', { name: 'Sandstone House' });
    house(m, ZX + 5, ZY - 4, 5, '#a8414c', '#e8d0a0', { name: 'Sandstone House' });
    house(m, ZX - 10, ZY + 6, 4, '#3f97d6', '#e8d0a0', { name: 'Sandstone House' });
    m.addObj({ k: 'stall', stripe: '#ff8a2e', x: ZX - 2, y: ZY - 4, w: 3, h: 2, solid: true, tall: 1 });
    for (let y = ZY + 3; y <= ZY + 7; y++) for (let x = ZX + 4; x <= ZX + 10; x++) { const d = ((x - ZX - 7) / 3.5) ** 2 + ((y - ZY - 5) / 2.5) ** 2; if (d < 1) m.set(x, y, d < 0.4 ? TL.DEEP : TL.WATER); }
    treeObj(m, ZX + 3, ZY + 6, 'palm', 1); treeObj(m, ZX + 11, ZY + 4, 'palm', 2);
    for (const [lx, ly] of [[ZX - 5, ZY - 3], [ZX + 5, ZY + 3]]) m.addObj({ k: 'lantern', x: lx, y: ly, solid: true, tall: 1, light: 1 });
    spot('desert_town', ZX, ZY + 1); spot('desert_market', ZX, ZY - 2); spot('desert_gate', ZX - 11, ZY + 1);
    m.addObj({ k: 'waypoint', wid: 'wp_desert', name: 'Dunehaven', x: ZX + 2, y: ZY + 2, solid: true, tall: 1 });
    m.addObj({ k: 'station', kind: 'forge', x: ZX + 3, y: ZY - 3, solid: true, public: 1 });
    // desert ruins with Sun Tablets (one behind a cracked wall)
    const ruins = [[168, 112], [204, 176], [206, 112]];
    ruins.forEach(([rx, ry], i) => {
      clear(m, rx - 5, ry - 4, rx + 5, ry + 4, TL.SAND);
      fill(m, rx - 3, ry - 2, rx + 3, ry + 2, TL.STONE);
      for (const [px, py] of [[rx - 4, ry - 3], [rx + 4, ry - 3], [rx - 4, ry + 3], [rx + 4, ry + 3]]) m.addObj({ k: 'pillar', broken: (px + py) % 2, x: px, y: py, solid: true, tall: 1, sand: 1 });
      if (i === 1) {
        for (let x = rx - 2; x <= rx + 2; x++) for (const y of [ry - 2, ry + 2]) m.addObj({ k: 'ruinwall', x, y, solid: true, crack: x === rx && y === ry + 2 });
        for (const x of [rx - 2, rx + 2]) for (let y = ry - 1; y <= ry + 1; y++) m.addObj({ k: 'ruinwall', x, y, solid: true });
      }
      m.addObj({ k: 'chest', tier: 1, fixed: [['sun_tablet', 1], ['gold_ore', 2]], x: rx, y: ry, solid: true, id: 'world:tablet' + i });
      m.mobs.push({ e: i === 2 ? 'sunpriest' : 'mummy', x: rx + 2, y: ry + 3 });
      spot('ruin' + i, rx, ry + 3);
    });
    const PYX = 198, PYY = 136;
    clear(m, PYX - 4, PYY - 4, PYX + 4, PYY + 3, TL.SAND);
    m.addObj({ k: 'entrance', dungeon: 'desert', x: PYX - 1, y: PYY, w: 3, h: 2, solid: true, tall: 1, needs: 'sun_tablet' });
    spot('dng_desert', PYX, PYY + 1);
    // Hearthpeak (frost village)
    const FX = 66, FY = 38;
    clear(m, FX - 10, FY - 7, FX + 10, FY + 7, TL.SNOW);
    fill(m, FX - 3, FY - 2, FX + 3, FY + 2, TL.STONE);
    m.safe.push([FX - 10, FY - 7, FX + 10, FY + 7]);
    house(m, FX - 9, FY - 3, 5, '#e9f2fb', '#8a6a4a', { name: 'Lodge', chimney: 1 });
    house(m, FX + 4, FY - 3, 5, '#c6d9ec', '#77492a', { name: 'Lodge', chimney: 1 });
    m.addObj({ k: 'campfire', x: FX, y: FY, solid: true, light: 1, warm: 1 });
    m.addObj({ k: 'campfire', x: FX - 6, y: FY + 5, solid: true, light: 1, warm: 1 });
    spot('frost_village', FX + 1, FY + 2); spot('frost_hunter', FX - 4, FY + 4);
    m.addObj({ k: 'waypoint', wid: 'wp_frost', name: 'Hearthpeak', x: FX + 3, y: FY + 3, solid: true, tall: 1 });
    m.addObj({ k: 'station', kind: 'alchemy', x: FX + 7, y: FY + 3, solid: true, public: 1 });
    const SX = 44, SY = 16;
    clear(m, SX - 4, SY - 3, SX + 4, SY + 3, TL.SNOW);
    m.addObj({ k: 'entrance', dungeon: 'ice', x: SX - 1, y: SY, w: 3, h: 2, solid: true, tall: 1 });
    spot('dng_ice', SX, SY + 1);
    // warm campfires dotted along the pass
    for (const [cx2, cy2] of [[100, 92], [84, 64], [52, 30]]) { clear(m, cx2 - 2, cy2 - 2, cx2 + 2, cy2 + 2, null); m.addObj({ k: 'campfire', x: cx2, y: cy2, solid: true, light: 1, warm: 1 }); }
    // Ember Outpost inside the volcanic region
    const OX = 178, OY = 40;
    clear(m, OX - 8, OY - 6, OX + 8, OY + 6, TL.ASH);
    fill(m, OX - 3, OY - 2, OX + 3, OY + 2, TL.STONE);
    m.safe.push([OX - 8, OY - 6, OX + 8, OY + 6]);
    house(m, OX - 7, OY - 2, 4, '#3a2a26', '#5a4a45', { name: 'Forgehall', chimney: 1 });
    m.addObj({ k: 'station', kind: 'forge', x: OX + 4, y: OY - 3, solid: true, public: 1 });
    m.addObj({ k: 'campfire', x: OX + 2, y: OY + 3, solid: true, light: 1 });
    spot('ember_outpost', OX, OY + 1);
    m.addObj({ k: 'waypoint', wid: 'wp_ember', name: 'Ember Outpost', x: OX - 2, y: OY + 3, solid: true, tall: 1 });
    const FGX = 200, FGY = 18;
    clear(m, FGX - 4, FGY - 3, FGX + 4, FGY + 3, TL.ASH);
    m.addObj({ k: 'entrance', dungeon: 'fire', x: FGX - 1, y: FGY, w: 3, h: 2, solid: true, tall: 1 });
    spot('dng_fire', FGX, FGY + 1);
    // secret treasures
    const secret = [[[96, 100], 1, [['u_storm', 1]]], [[132, 172], 1, [['ring_gold', 1], ['hp_large', 2]]], [[60, 172], 1, [['bomb', 5], ['treat_plus', 1]]], [[30, 60], 2, [['frost_bar', 3], ['sapphire', 2]]], [[212, 100], 2, [['ruby', 2], ['hp_large', 3]]], [[160, 28], 2, [['ember_bar', 3], ['amulet_moon', 1]]]];
    secret.forEach(([[sx2, sy2], tier, loot], i) => {
      clear(m, sx2 - 2, sy2 - 2, sx2 + 2, sy2 + 2, null);
      const base = m.t(sx2, sy2);
      if (!TI()[base].walk || TI()[base].water) fill(m, sx2 - 2, sy2 - 2, sx2 + 2, sy2 + 2, [TL.GRASS, TL.DGRASS, TL.SAND, TL.SNOW, TL.ASH][reg(sx2, sy2)] || TL.GRASS);
      // ring of cracked rocks around the chest (bomb to enter)
      for (let y = sy2 - 1; y <= sy2 + 1; y++) for (let x = sx2 - 1; x <= sx2 + 1; x++) if (x !== sx2 || y !== sy2) m.addObj({ k: 'ruinwall', x, y, solid: true, crack: y === sy2 + 1 && x === sx2, rock: 1 });
      m.addObj({ k: 'chest', tier, fixed: loot, x: sx2, y: sy2, solid: true, id: 'world:secret' + i });
    });
    // ---- roads (guarantee navigable routes between landmarks) ----
    const pathTile = (x, y) => { const r = reg(x, y); return r === 0 || r === 1 ? TL.DIRT : TL.STONE; };
    const road = (a, b, opts = {}) => {
      const cost = (x, y) => {
        const t = m.tiles[m.idx(x, y)];
        if (t === TL.LAVA) return opts.lava ? 30 : 999;
        if (t === TL.BROKEN) return opts.broken ? 1 : 999;
        if (t === TL.DEEP) return x > 140 && x < 162 && y > 70 ? 999 : 14;
        if (t === TL.CLIFF || t === TL.VINE) return 22;
        let c = TI()[t].water ? 4 : 1;
        const o = m.obj(x, y);
        if (o) c += o.k === 'tree' || o.k === 'rock' || o.k === 'bush' ? 3 : 30;
        if (t === TL.DIRT || t === TL.STONE || t === TL.COBBLE || t === TL.BRIDGE) c *= 0.5;
        return c;
      };
      const p = W.astar(m, a.x, a.y, b.x, b.y, cost);
      if (!p) return false;
      for (const [x, y] of p) {
        const t = m.tiles[m.idx(x, y)];
        const o = m.obj(x, y);
        if (o && (o.k === 'tree' || o.k === 'rock' || o.k === 'bush' || o.k === 'herb' || o.k === 'mushroom' || o.k === 'crystal')) m.removeObj(o);
        if (t === TL.BROKEN || t === TL.LAVA || t === TL.COBBLE || t === TL.BRIDGE) continue;
        if (TI()[t].water) m.tiles[m.idx(x, y)] = TL.BRIDGE;
        else if (t === TL.CLIFF || t === TL.VINE || t === TL.SAND || t === TL.SNOW || t === TL.ICE || t === TL.STONE || t === TL.GRASS || t === TL.DGRASS || t === TL.ASH) {
          if (!(t === TL.SAND && reg(x, y) === 2) || U.hash2(x, y, 1) < 0.85) m.tiles[m.idx(x, y)] = pathTile(x, y);
        }
      }
      return true;
    };
    const roads = [
      ['village_center', 'home_door'], ['village_center', 'dng_cave'], ['village_center', 'ancient_gate'], ['ancient_gate', 'frost_village'], ['frost_village', 'dng_ice'],
      ['village_center', 'darkwood_shrine'], ['darkwood_shrine', 'dng_forest'], ['village_center', 'bridge_w'], ['bridge_e', 'desert_town'], ['desert_town', 'dng_desert'],
      ['desert_town', 'ruin0'], ['desert_town', 'ruin1'], ['desert_town', 'ruin2'], ['ember_outpost', 'dng_fire'], ['village_dock', 'village_center'], ['village_farm', 'village_center'],
    ];
    for (const [a, b] of roads) road(S[a], S[b]);
    // road into the volcanic region (crosses the moat: needs the Glacier Charm)
    road(S.frost_village, S.ember_outpost, { lava: 1 });
    // ---- connectivity pass: open dense forests so every region is navigable ----
    W.ensureConnected(m, S.village_center, (x, y) => [TL.LAVA, TL.BROKEN].includes(m.t(x, y)));
    // restore landmark clearances overwritten by roads
    m.spawnRegionFor = (x, y) => m.region(x, y);
    return m;
  };

  /* flood fill from start; carve gaps toward unreached pockets */
  W.ensureConnected = function (m, start, passExtra) {
    const walkable = (x, y) => { const w = m.walk(x, y); return w === 1 || w === 2 || (passExtra && passExtra(x, y)); };
    const reach = new Uint8Array(m.w * m.h);
    const flood = () => {
      reach.fill(0);
      const st = [m.idx(start.x, start.y)]; reach[st[0]] = 1;
      while (st.length) { const i = st.pop(); const x = i % m.w, y = (i / m.w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (!m.inb(X, Y)) continue; const j = m.idx(X, Y); if (!reach[j] && walkable(X, Y)) { reach[j] = 1; st.push(j); } } }
    };
    flood();
    let fixes = 0;
    for (let y = 2; y < m.h - 2 && fixes < 80; y += 3) for (let x = 2; x < m.w - 2 && fixes < 80; x += 3) {
      if (reach[m.idx(x, y)] || !walkable(x, y)) continue;
      // measure pocket size quickly
      let size = 0; const seen = new Set([m.idx(x, y)]); const st = [m.idx(x, y)];
      while (st.length && size < 12) { const i = st.pop(); size++; const cx = i % m.w, cy = (i / m.w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = cx + dx, Y = cy + dy; const j = m.idx(X, Y); if (m.inb(X, Y) && !seen.has(j) && walkable(X, Y)) { seen.add(j); st.push(j); } } }
      if (size < 12) continue;
      const cost = (X, Y) => { if (reach[m.idx(X, Y)]) return 1; const t = m.t(X, Y); if (t === TL.LAVA || t === TL.VOID || t === TL.WALL) return 999; if (t === TL.DEEP) return 40; if (t === TL.CLIFF) return 30; const o = m.obj(X, Y); return o && o.solid ? (o.k === 'tree' || o.k === 'bush' || o.k === 'rock' ? 4 : 999) : 1; };
      // walk toward nearest reached tile via A* to start (stops early when entering reach)
      const p = W.astar(m, x, y, start.x, start.y, cost, 40000);
      if (!p) continue;
      for (const [X, Y] of p) {
        if (reach[m.idx(X, Y)]) break;
        const o = m.obj(X, Y);
        if (o && (o.k === 'tree' || o.k === 'bush' || o.k === 'rock')) m.removeObj(o);
        if (m.t(X, Y) === TL.CLIFF) m.set(X, Y, TL.VINE);
        if (m.t(X, Y) === TL.DEEP) m.set(X, Y, TL.BRIDGE);
      }
      fixes++;
      flood();
    }
    return fixes;
  };

  /* =========================================================
     HOME INTERIOR
     ========================================================= */
  W.genHome = function (upgraded) {
    const w = upgraded ? 16 : 12, h = 10;
    const m = new GMap('home', w, h, { kind: 'interior', theme: 'home', outside: TL.WALL, name: 'Home', music: 'home' });
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m.tiles[m.idx(x, y)] = (y < 2 || x === 0 || x === w - 1 || y === h - 1) ? TL.WALL : TL.WOOD;
    for (let x = 3; x < w - 3; x++) for (let y = 4; y < 7; y++) m.tiles[m.idx(x, y)] = TL.CARPET;
    const door = Math.floor(w / 2);
    m.tiles[m.idx(door, h - 1)] = TL.WOOD;
    m.addObj({ k: 'exit', x: door, y: h - 1, to: 'world', spot: 'home_door' });
    m.spots.entry = { x: door, y: h - 2 };
    m.addObj({ k: 'station', kind: 'bed', x: 1, y: 3, w: 2, h: 1, solid: true });
    m.addObj({ k: 'station', kind: 'storage', x: 4, y: 2, w: 2, h: 1, solid: true });
    m.addObj({ k: 'station', kind: 'workbench', x: 7, y: 2, w: 2, h: 1, solid: true });
    m.addObj({ k: 'station', kind: 'cook', x: w - 3, y: 3, w: 2, h: 1, solid: true });
    m.addObj({ k: 'station', kind: 'mirror', x: 10 > w - 2 ? w - 2 : 10, y: 2, solid: true });
    if (upgraded) { m.addObj({ k: 'station', kind: 'forge', x: 12, y: 2, w: 2, h: 1, solid: true }); m.addObj({ k: 'station', kind: 'alchemy', x: 1, y: 7, w: 2, h: 1, solid: true }); }
    m.dark = false;
    return m;
  };

  /* =========================================================
     DUNGEONS (connected rooms, keys, switch puzzle, plates, boss)
     ========================================================= */
  W.DUNGEONS = {
    cave: { theme: 'cave', boss: 'toad', grid: [3, 2], region: 'greenfields', enemies: ['slime', 'bat', 'crab', 'skeleton'], tier: 1, exitSpot: 'dng_cave' },
    forest: { theme: 'forest', boss: 'guardian', grid: [3, 3], region: 'darkwood', enemies: ['shadowwolf', 'puffer', 'spider', 'skeleton', 'beetle'], tier: 2, exitSpot: 'dng_forest' },
    desert: { theme: 'desert', boss: 'colossus', grid: [4, 3], region: 'sunscorch', enemies: ['scorpion', 'mummy', 'sunpriest', 'skeleton'], tier: 3, exitSpot: 'dng_desert' },
    ice: { theme: 'ice', boss: 'dragon', grid: [4, 3], region: 'frostfall', enemies: ['frostwolf', 'icewisp', 'snowslime', 'frostgolem'], tier: 4, exitSpot: 'dng_ice' },
    fire: { theme: 'fire', boss: 'titan', grid: [4, 3], region: 'volcanic', enemies: ['magmaslug', 'imp', 'obsidian', 'hound'], tier: 5, exitSpot: 'dng_fire' },
    shadow: { theme: 'shadow', boss: 'sovereign', grid: [4, 3], region: 'shadow', enemies: ['shadowknight', 'voideye', 'shade', 'nightmare'], tier: 6, exitSpot: 'dng_shadow', exitMap: 'shadow' },
  };
  W.genDungeon = function (id, seed) {
    const D = W.DUNGEONS[id];
    const R = PQ.RNG(seed + id.length * 1000 + id.charCodeAt(0) * 7);
    const [GW, GH] = D.grid;
    const RW = 15, RH = 12; // room cell incl. wall
    const mw = GW * RW + 1, mh = GH * RH + 1;
    const m = new GMap('dng_' + id, mw, mh, { kind: 'dungeon', theme: D.theme, dark: true, outside: TL.WALL, name: PQ.Art.THEMES[D.theme].name, music: 'dungeon' });
    m.reg.fill(PQ.REGIONS.indexOf(D.region));
    m.tiles.fill(TL.WALL);
    for (let i = 0; i < m.vari.length; i++) m.vari[i] = Math.floor(R() * 8);
    const cells = [];
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) cells.push({ gx, gy, links: [], dist: -1 });
    const cell = (gx, gy) => cells[gy * GW + gx];
    // spanning tree (randomised DFS) from bottom-middle
    const start = cell(Math.floor(GW / 2), GH - 1);
    const stack = [start]; start.seen = 1;
    while (stack.length) {
      const c = stack[stack.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [c.gx + dx, c.gy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < GW && y < GH && !cell(x, y).seen);
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny] = nb[Math.floor(R() * nb.length)];
      const n = cell(nx, ny); n.seen = 1; n.parent = c;
      c.links.push(n); n.links.push(c);
      stack.push(n);
    }
    // BFS distances
    const q = [start]; start.dist = 0;
    while (q.length) { const c = q.shift(); for (const n of c.links) if (n.dist < 0) { n.dist = c.dist + 1; q.push(n); } }
    const boss = cells.reduce((a, b) => (b.dist > a.dist ? b : a));
    // room interiors
    const roomRect = (c) => ({ x0: c.gx * RW + 1, y0: c.gy * RH + 1, x1: c.gx * RW + RW - 1, y1: c.gy * RH + RH - 1 });
    for (const c of cells) { const r = roomRect(c); fill(m, r.x0, r.y0, r.x1, r.y1, TL.FLOOR); c.r = r; c.cx = Math.floor((r.x0 + r.x1) / 2); c.cy = Math.floor((r.y0 + r.y1) / 2); }
    // doors between linked rooms
    const doors = [];
    const doorBetween = (a, b) => {
      let x, y, horiz;
      if (a.gx !== b.gx) { x = Math.max(a.gx, b.gx) * RW; y = a.cy; horiz = true; for (let dy = -1; dy <= 1; dy++) m.set(x, y + dy, TL.FLOOR); }
      else { y = Math.max(a.gy, b.gy) * RH; x = a.cx; horiz = false; for (let dx = -1; dx <= 1; dx++) m.set(x + dx, y, TL.FLOOR); }
      const d = { a, b, x, y, horiz }; doors.push(d); return d;
    };
    for (const c of cells) for (const n of c.links) if (cells.indexOf(n) > cells.indexOf(c)) doorBetween(c, n);
    // extra loop for exploration
    const extra = cells.filter((c) => c !== boss && c.gx + 1 < GW && !c.links.includes(cell(c.gx + 1, c.gy)) && cell(c.gx + 1, c.gy) !== boss);
    if (extra.length) { const c = extra[Math.floor(R() * extra.length)]; const n = cell(c.gx + 1, c.gy); c.links.push(n); n.links.push(c); doorBetween(c, n); }
    // boss door (big key)
    const bossDoor = doors.find((d) => (d.a === boss || d.b === boss));
    for (const d of doors) if (d.a === boss || d.b === boss) if (d !== bossDoor) { // seal any other boss entrances
      if (d.horiz) for (let dy = -1; dy <= 1; dy++) m.set(d.x, d.y + dy, TL.WALL); else for (let dx = -1; dx <= 1; dx++) m.set(d.x + dx, d.y, TL.WALL);
      d.sealed = 1;
    }
    const lockDoor = (d, lock) => { m.addObj({ k: 'door', lock, horiz: d.horiz, x: d.horiz ? d.x : d.x - 1, y: d.horiz ? d.y + 1 : d.y, w: d.horiz ? 1 : 3, h: d.horiz ? 3 : 1, solid: true, tall: 1, id: m.id + ':door:' + d.x + ',' + d.y }); };
    lockDoor(bossDoor, 'boss');
    // choose puzzle room (big key) and key room
    const others = cells.filter((c) => c !== boss && c !== start).sort((a, b) => b.dist - a.dist);
    const puzzle = others[0] || start;
    // small locked door: on the door entering the puzzle room from its BFS parent side
    const pDoor = doors.find((d) => !d.sealed && d !== bossDoor && ((d.a === puzzle && d.b.dist < puzzle.dist) || (d.b === puzzle && d.a.dist < puzzle.dist)));
    let keyRoom = null;
    if (pDoor) {
      lockDoor(pDoor, 'key');
      const cand = cells.filter((c) => c !== boss && c !== puzzle && c !== start);
      keyRoom = cand.length ? cand[Math.floor(R() * cand.length)] : start;
    }
    const chest = (x, y, o) => m.addObj(Object.assign({ k: 'chest', x, y, solid: true, tier: Math.min(2, Math.floor(D.tier / 2)), dtier: D.tier }, o));
    // big key chest inside switch-barrier puzzle
    const pc = puzzle;
    chest(pc.cx, pc.cy - 2, { tier: 2, key: 'boss', fixed: [['__bosskey', 1]], id: m.id + ':bosskey' });
    for (let dx = -2; dx <= 2; dx++) for (const dy of [-4, 0]) m.set(pc.cx + dx, pc.cy + dy, TL.BAR_R);
    for (const dx of [-2, 2]) for (let dy = -3; dy <= -1; dy++) m.set(pc.cx + dx, pc.cy + dy, TL.BAR_R);
    m.set(pc.cx, pc.cy, TL.BAR_R);
    // crystal switch, protected by blue barriers once the red ones drop
    m.addObj({ k: 'switch', x: pc.cx + 5, y: pc.cy + 2, solid: true, id: m.id + ':switch' });
    for (let dx = 4; dx <= 6; dx++) m.set(pc.cx + dx, pc.cy + 4, TL.BAR_B);
    m.barState = 0; // 0: red up, blue down
    if (keyRoom) chest(keyRoom.cx, keyRoom.cy - 2, { key: 'key', fixed: [['__key', 1]], id: m.id + ':key' });
    // treasure & plates room
    const plateRoom = cells.find((c) => c !== boss && c !== puzzle && c !== keyRoom && c !== start) || null;
    if (plateRoom) {
      const pr = plateRoom;
      for (const [dx, dy] of [[-4, -2], [4, -2], [0, 3]]) m.addObj({ k: 'plate', x: pr.cx + dx, y: pr.cy + dy, group: 'p1', id: m.id + ':plate' + dx + dy });
      // sealed alcove with treasure
      for (let dx = -1; dx <= 1; dx++) m.set(pr.cx + dx, pr.r.y0 + 1, TL.FLOOR);
      chest(pr.cx, pr.r.y0 + 1, { tier: 2, id: m.id + ':platechest' });
      m.addObj({ k: 'door', lock: 'plates', group: 'p1', horiz: false, x: pr.cx - 1, y: pr.r.y0 + 2, w: 3, h: 1, solid: true, tall: 1, id: m.id + ':platedoor' });
      for (const dx of [-2, 2]) m.set(pr.cx + dx, pr.r.y0 + 1, TL.WALL), m.set(pr.cx + dx, pr.r.y0 + 2, TL.WALL);
      for (const dx of [-3, -4, -5, -6, 3, 4, 5, 6]) m.set(pr.cx + dx, pr.r.y0 + 2, TL.WALL);
    }
    // secret room behind a cracked wall on an outer edge
    const edgeRooms = cells.filter((c) => c !== boss && (c.gx === 0 || c.gx === GW - 1));
    if (edgeRooms.length) {
      const c = edgeRooms[Math.floor(R() * edgeRooms.length)];
      const west = c.gx === 0;
      const cxw = west ? c.r.x0 : c.r.x1, inner = west ? cxw + 1 : cxw - 1;
      for (const yy of [c.cy - 1, c.cy + 1]) { m.set(cxw, yy, TL.WALL); m.set(inner, yy, TL.WALL); }
      m.clearObjs(cxw, c.cy, inner, c.cy);
      chest(cxw, c.cy, { tier: 2, dtier: D.tier + 1, id: m.id + ':secret' });
      m.addObj({ k: 'ruinwall', x: inner, y: c.cy, solid: true, crack: true, dungeon: 1, id: m.id + ':crack' });
    }
    // torches & decor
    for (const c of cells) {
      for (const [x, y] of [[c.r.x0 + 1, c.r.y0], [c.r.x1 - 1, c.r.y0]]) if (m.t(x, y + 1) === TL.FLOOR) m.addObj({ k: 'torch', x, y: y + 1, light: 1 });
      if (c !== boss && c !== start && c !== puzzle && R() < 0.6) for (let i = 0; i < 2; i++) { const x = U.clamp(c.cx + Math.floor(R() * 9) - 4, c.r.x0 + 2, c.r.x1 - 2), y = U.clamp(c.cy + Math.floor(R() * 6) - 2, c.r.y0 + 3, c.r.y1 - 2); if (!m.obj(x, y) && m.t(x, y) === TL.FLOOR) m.addObj({ k: 'pillar', broken: R() < 0.5 ? 1 : 0, x, y, solid: true, tall: 1, theme: D.theme }); }
      if (c !== start && c !== boss) {
        const n = 2 + Math.floor(R() * 2) + (D.tier > 2 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const x = U.clamp(c.cx + Math.floor(R() * 9) - 4, c.r.x0 + 1, c.r.x1 - 1), y = U.clamp(c.cy + Math.floor(R() * 7) - 3, c.r.y0 + 2, c.r.y1 - 1);
          if (m.t(x, y) === TL.FLOOR && !m.obj(x, y)) m.mobs.push({ e: D.enemies[Math.floor(R() * D.enemies.length)], x, y, room: cells.indexOf(c) });
        }
        if (R() < 0.35 && c !== puzzle) chest(c.r.x1 - 2, c.r.y1 - 1);
      }
    }
    // start room: exit
    m.addObj({ k: 'exit', x: start.cx, y: start.r.y1, to: D.exitMap || 'world', spot: D.exitSpot, stairs: 1 });
    m.spots.entry = { x: start.cx, y: start.r.y1 - 2 };
    m.bossRoom = { x0: boss.r.x0, y0: boss.r.y0, x1: boss.r.x1, y1: boss.r.y1, cx: boss.cx, cy: boss.cy, id: D.boss };
    m.bossDoor = bossDoor;
    m.def = D; m.dungeonId = id;
    m.rooms = cells.map((c) => c.r);
    return m;
  };

  /* =========================================================
     SHADOW REALM
     ========================================================= */
  W.genShadow = function (seed) {
    const MW = 112, MH = 96;
    const m = new GMap('shadow', MW, MH, { kind: 'overworld', outside: TL.VOID, name: 'Shadow Realm', music: 'shadow' });
    m.reg.fill(5);
    const N = PQ.Noise(seed + 501), N2 = PQ.Noise(seed + 502);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const i = m.idx(x, y);
      const edge = Math.min(x, y, MW - 1 - x, MH - 1 - y);
      const n = N.fbm(x / 13, y / 13);
      m.tiles[i] = edge < 4 || n < 0.33 ? TL.VOID : TL.SHADOW;
      m.vari[i] = Math.floor(U.hash2(x, y, seed) * 8);
      const h = U.hash2(x, y, seed + 9);
      if (m.tiles[i] === TL.SHADOW && edge > 5) {
        if (h < 0.02) treeObj(m, x, y, 'deadshadow', h * 100 % 4 | 0);
        else if (h < 0.032) m.addObj({ k: 'crystal', col: 'void', x, y, solid: true, light: 1 });
        else if (h < 0.05) m.addObj({ k: 'rock', kind: 'shadow', ore: N2.fbm(x / 5, y / 5) > 0.5 ? 'void' : null, v: (h * 1000) % 4 | 0, x, y, solid: true });
      }
    }
    const S = m.spots;
    const arrive = { x: 56, y: 84 }, cit = { x: 56, y: 12 };
    const pad = (p, r, t = TL.SHADOW) => { for (let y = p.y - r; y <= p.y + r; y++) for (let x = p.x - r; x <= p.x + r; x++) { m.clearObjs(x, y, x, y); m.set(x, y, t); } };
    pad(arrive, 4); pad(cit, 4);
    m.addObj({ k: 'portal', x: arrive.x, y: arrive.y - 1, to: 'world', spot: 'portal', solid: true, light: 1 });
    S.arrive = { x: arrive.x, y: arrive.y + 1 }; S.entry = S.arrive;
    m.addObj({ k: 'waypoint', wid: 'wp_shadow', name: 'Shadow Landing', x: arrive.x + 3, y: arrive.y + 2, solid: true, tall: 1 });
    m.addObj({ k: 'entrance', dungeon: 'shadow', x: cit.x - 1, y: cit.y, w: 3, h: 2, solid: true, tall: 1 });
    S.dng_shadow = { x: cit.x, y: cit.y + 1 };
    // light shrine (post-game legendary creature)
    const ls = { x: 16, y: 40 }; pad(ls, 3);
    m.addObj({ k: 'shrine', x: ls.x, y: ls.y, solid: true, light: 1 }); S.light_shrine = { x: ls.x, y: ls.y + 2 };
    // chests
    for (const [x, y] of [[90, 30], [24, 70], [96, 72], [40, 22]]) { pad({ x, y }, 1); m.addObj({ k: 'chest', tier: 2, dtier: 6, x, y, solid: true }); }
    // bridges of light connecting islands
    const cost = (x, y) => { const t = m.t(x, y); if (t === TL.VOID) return 10; const o = m.obj(x, y); return o && o.solid ? 5 : 1; };
    const bridge = (a, b) => { const p = W.astar(m, a.x, a.y, b.x, b.y, cost); if (!p) return; for (const [x, y] of p) { const o = m.obj(x, y); if (o && (o.k === 'tree' || o.k === 'rock' || o.k === 'crystal')) m.removeObj(o); if (m.t(x, y) === TL.VOID) m.set(x, y, TL.BRIDGE); } };
    bridge(S.arrive, S.dng_shadow); bridge(S.arrive, S.light_shrine);
    for (const [x, y] of [[90, 30], [24, 70], [96, 72], [40, 22]]) bridge(S.arrive, { x, y: y + 1 });
    W.ensureConnected(m, S.arrive);
    return m;
  };
})();
