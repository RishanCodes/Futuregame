/* PIXEL QUEST — renderer: camera, layered y-sorted drawing, lighting, weather, minimap, world map */
'use strict';
(function () {
  const T = PQ.T, TL = PQ.TILE, Art = PQ.Art, U = PQ.U;
  const Rn = { scale: 3, vw: 320, vh: 180, cam: { x: 0, y: 0 }, shake: 0, flash: 0, frameN: 0 };
  PQ.Render = Rn;

  Rn.init = function (canvas) {
    Rn.canvas = canvas;
    Rn.ctx = canvas.getContext('2d');
    [Rn.buf, Rn.g] = PQ.canvas(320, 180);
    [Rn.light, Rn.lg] = PQ.canvas(160, 90);
    Rn.resize();
    window.addEventListener('resize', Rn.resize);
    window.addEventListener('orientationchange', () => setTimeout(Rn.resize, 250));
  };
  Rn.resize = function () {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cw = Math.max(1, Math.floor(window.innerWidth * dpr)), ch = Math.max(1, Math.floor(window.innerHeight * dpr));
    Rn.canvas.width = cw; Rn.canvas.height = ch;
    Rn.canvas.style.width = window.innerWidth + 'px'; Rn.canvas.style.height = window.innerHeight + 'px';
    // pick an integer scale so roughly 24-30 tiles fit across and >= 12 tiles vertically
    const zoom = (PQ.Settings && PQ.Settings.zoom) || 1;
    let s = Math.max(1, Math.round(Math.min(cw / (26 * T), ch / (14.5 * T)) * zoom));
    Rn.scale = s; Rn.css = s / dpr;
    Rn.vw = Math.ceil(cw / s); Rn.vh = Math.ceil(ch / s);
    Rn.buf.width = Rn.vw; Rn.buf.height = Rn.vh; Rn.g = Rn.buf.getContext('2d'); Rn.g.imageSmoothingEnabled = false;
    Rn.light.width = Math.ceil(Rn.vw / 2); Rn.light.height = Math.ceil(Rn.vh / 2); Rn.lg = Rn.light.getContext('2d');
    Rn.ctx.imageSmoothingEnabled = false;
  };

  /* ---------------- object sprites ---------------- */
  const S = Art.S;
  const memo = (key, fn) => S[key] || (S[key] = fn());
  const ramps = { sand: ['#5a3a20', '#8a5e34', '#b0804a', '#d2a46a', '#ecc98f'], mossy: ['#22322a', '#3e5a48', '#5e7a66', '#7e9a84', '#a8c0a8'] };
  Rn.objSprite = function (o, t) {
    const G = PQ.G;
    switch (o.k) {
      case 'tree':
        if (o.gone) return memo('stump' + (o.kind === 'giant' ? 'g' : ''), () => { const [c, g] = PQ.canvas(o.kind === 'giant' ? 14 : 10, 8); const w = c.width; Art.rect(g, 1, 2, w - 2, 5, Art.P.wood[2]); Art.rect(g, 1, 2, w - 2, 2, Art.P.wood[4]); Art.px(g, w >> 1, 3, Art.P.wood[1]); return Art.outline(c); });
        return memo('tree' + o.kind + o.v, () => Art.makeTree(o.kind, o.v));
      case 'bush': return memo('bush' + (o.kind === 'berry' && o.picked ? 'berry0' : o.kind) + o.v, () => Art.makeBush(o.kind === 'berry' && o.picked ? 'berry0' : o.kind, o.v));
      case 'rock': return memo('rock' + o.kind + o.v + (o.ore || ''), () => Art.makeRock(o.kind, o.v, o.ore ? Art.MAT[o.ore === 'void' ? 'void' : o.ore] : null));
      case 'herb': { const it = PQ.D.ITEMS[o.item]; return memo('herb' + o.item, () => Art.makeHerb(it.color)); }
      case 'mushroom': return memo('mush', () => Art.makeMushroom(['#2a1a4a', '#5a2a9a', '#8a5ae0', '#c8a8ff'], '#9dffd0'));
      case 'crystal': return memo('crys' + o.col, () => Art.makeCrystal(Art.MAT[o.col]));
      case 'chest': return memo('chest' + (o.opened ? 1 : 0) + o.tier, () => Art.makeChest(!!o.opened, o.tier || 0));
      case 'sign': return memo('sign', Art.makeSign);
      case 'lantern': return memo('lantern', Art.makeLantern);
      case 'campfire': { const f = Math.floor(t * 8) % 3; return memo('fire' + f, () => Art.makeCampfire(f)); }
      case 'fence': return memo('fence', () => Art.makeFence(false));
      case 'well': return memo('well', Art.makeWell);
      case 'house': { const lit = G && G.time && PQ.Time.darkness() > 0.3 ? 1 : 0; return memo('house' + o.w + o.roof + o.wall + lit + (o.chimney ? 1 : 0) + (o.sign || ''), () => Art.makeHouse(o.w, o.roof, o.wall, { chimney: o.chimney, lit, sign: o.sign })); }
      case 'stall': return memo('stall' + o.stripe, () => Art.makeStall(o.stripe));
      case 'windmill': return memo('windmill', Art.makeWindmill);
      case 'waypoint': { const on = G && G.save && G.save.waypoints[o.wid]; return memo('wp' + (on ? 1 : 0), () => Art.makeWaypoint(!!on)); }
      case 'entrance': { const th = PQ.World.DUNGEONS[o.dungeon].theme; return memo('ent' + th, () => Art.makeEntrance(th)); }
      case 'pillar': { const rp = o.sand ? ramps.sand : o.mossy ? ramps.mossy : o.theme ? [...Art.THEMES[o.theme].wall, PQ.U.shade(Art.THEMES[o.theme].wall[3], 0.3)] : Art.P.stone; return memo('pil' + (o.broken ? 1 : 0) + (o.sand ? 's' : o.mossy ? 'm' : o.theme || ''), () => Art.makePillar(!!o.broken, rp)); }
      case 'gate': { const f = G ? (G.save.sigils || [0, 0, 0, 0]) : [0, 0, 0, 0]; return memo('gate' + f.join(''), () => Art.makeGate(f)); }
      case 'portal': { const f = Math.floor(t * 6) % 6; return memo('portal' + f, () => Art.portalFrame(f * 0.5)); }
      case 'station': return memo('st' + o.kind, () => Art.makeStation(o.kind));
      case 'decor': return memo('dec' + o.decor, () => Art.makeDecor(o.decor));
      case 'cropdeco': return memo('cd' + o.crop, () => Art.makeCrop(PQ.D.CROPS[o.crop], 3));
      case 'torch': { const f = Math.floor(t * 8) % 3; return memo('torch' + f, () => { const [c, g] = PQ.canvas(8, 12); Art.rect(g, 3, 6, 2, 6, Art.P.wood[1]); Art.rect(g, 2, 5, 4, 2, '#3a3a4a'); const fh = [3, 4, 2][f]; Art.rect(g, 2, 5 - fh, 4, fh, '#ff9a2e'); Art.rect(g, 3, 4 - fh, 2, fh, '#ffe27a'); return Art.outline(c); }); }
      case 'door': {
        const open = o.open;
        if (open) return null;
        return memo('door' + o.lock + (o.horiz ? 'h' : 'v') + (PQ.G && PQ.G.map ? PQ.G.map.theme : ''), () => {
          const th = Art.THEMES[(PQ.G && PQ.G.map && PQ.G.map.theme) || 'cave'];
          const w = o.horiz ? 16 : 48, h = o.horiz ? 48 + 8 : 24;
          const [c, g] = PQ.canvas(w, h);
          const col = o.lock === 'boss' ? ['#4a1010', '#8c1c2b', '#c9323a', '#ffd75a'] : o.lock === 'plates' ? [th.wall[0], th.wall[1], th.wall[2], '#9dffd0'] : [Art.P.wood[0], Art.P.wood[1], Art.P.wood[2], Art.P.gold[3]];
          Art.rect(g, 0, 0, w, h, col[1]);
          for (let i = 2; i < (o.horiz ? h : w); i += 5) { if (o.horiz) Art.rect(g, 1, i, w - 2, 2, col[2]); else Art.rect(g, i, 1, 2, h - 2, col[2]); }
          const kx = w / 2 - 2, ky = h / 2 - 3;
          Art.rect(g, kx - 1, ky - 1, 6, 8, col[3]); Art.rect(g, kx + 1, ky + 1, 2, 2, '#120d18'); Art.rect(g, kx + 1.5, ky + 3, 1, 2, '#120d18');
          if (o.lock === 'plates') { Art.rect(g, kx - 1, ky - 1, 6, 8, col[3]); Art.rect(g, kx, ky, 4, 6, '#1a3a2a'); }
          return Art.outline(c);
        });
      }
      case 'switch': { const st = PQ.G && PQ.G.map ? PQ.G.map.barState : 0; return memo('sw' + st, () => { const [c, g] = PQ.canvas(12, 18); Art.rect(g, 2, 13, 8, 4, Art.P.stone[2]); Art.rect(g, 2, 13, 8, 1, Art.P.stone[4]); Art.blob(g, 6, 7, 4, 6, st ? ['#10204a', '#3255c8', '#80a8ff', '#ffffff'] : ['#5a1020', '#c8324a', '#ff8095', '#ffffff']); return Art.outline(c); }); }
      case 'plate': return memo('plate' + (o.on ? 1 : 0), () => { const [c, g] = PQ.canvas(14, 14); Art.rect(g, 1, 1, 12, 12, '#3a3a48'); Art.rect(g, 2, 2, 10, 10, o.on ? '#9dffd0' : '#6a6a7e'); Art.rect(g, 4, 4, 6, 6, o.on ? '#e0fff0' : '#858598'); return c; });
      case 'exit': return o.stairs ? memo('stairs', () => { const [c, g] = PQ.canvas(16, 16); for (let i = 0; i < 4; i++) Art.rect(g, 1, i * 4, 14, 3, Art.P.stone[2 + (i % 2)]); Art.rect(g, 0, 0, 16, 2, '#000'); return c; }) : memo('mat', () => { const [c, g] = PQ.canvas(16, 16); Art.rect(g, 2, 6, 12, 8, '#7a2e3a'); Art.rect(g, 3, 7, 10, 6, '#a8414c'); return c; });
      case 'ruinwall': return memo('rw' + (o.crack ? 1 : 0) + (o.rock ? 'r' : o.dungeon ? 'd' : 's') + (o.dungeon && PQ.G && PQ.G.map ? PQ.G.map.theme : ''), () => {
        const [c, g] = PQ.canvas(16, 20);
        const rp = o.dungeon ? Art.THEMES[(PQ.G && PQ.G.map && PQ.G.map.theme) || 'cave'].wall : o.rock ? Art.P.stone.slice(1) : ['#5a3a20', '#8a5e34', '#b0804a', '#d2a46a'];
        Art.rect(g, 0, 4, 16, 16, rp[1]); Art.rect(g, 0, 0, 16, 5, rp[2]); Art.rect(g, 0, 0, 16, 1, rp[3]);
        for (let y = 7; y < 20; y += 4) Art.rect(g, 0, y, 16, 1, rp[0]);
        if (o.crack) { for (const [x, y] of [[8, 5], [7, 7], [9, 8], [8, 10], [6, 12], [10, 12], [7, 14], [9, 15]]) Art.px(g, x, y, '#0a0608'); Art.px(g, 5, 9, '#0a0608'); Art.px(g, 11, 9, '#0a0608'); }
        return Art.outline(c);
      });
      case 'shrine': return memo('shrine', () => { const [c, g] = PQ.canvas(20, 22); Art.rect(g, 2, 14, 16, 7, Art.P.stone[3]); Art.rect(g, 2, 14, 16, 1, '#fff'); Art.blob(g, 10, 8, 5, 5, ['#a87a1a', '#ffd75a', '#fff3b0', '#ffffff']); return Art.outline(c); });
      default: return null;
    }
  };
  const FLAT = { plate: 1, exit: 1, cropdeco: 0 };

  /* ---------------- main frame ---------------- */
  Rn.draw = function (G, dt) {
    const g = Rn.g, vw = Rn.vw, vh = Rn.vh, m = G.map, t = G.t;
    Rn.frameN++;
    // camera follow
    const p = G.player;
    const tx = p.x - vw / 2, ty = p.y - 8 - vh / 2;
    const lead = 0;
    Rn.cam.x = U.lerp(Rn.cam.x, tx + lead, 1 - Math.exp(-10 * dt));
    Rn.cam.y = U.lerp(Rn.cam.y, ty, 1 - Math.exp(-10 * dt));
    if (G.snapCam) { Rn.cam.x = tx; Rn.cam.y = ty; G.snapCam = false; }
    const maxX = m.w * T - vw, maxY = m.h * T - vh;
    Rn.cam.x = maxX > 0 ? U.clamp(Rn.cam.x, 0, maxX) : maxX / 2;
    Rn.cam.y = maxY > 0 ? U.clamp(Rn.cam.y, 0, maxY) : maxY / 2;
    let sx = 0, sy = 0;
    if (!PQ.Settings.shake) Rn.shake = 0;
    if (Rn.shake > 0) { sx = (Math.random() - 0.5) * Rn.shake * 6; sy = (Math.random() - 0.5) * Rn.shake * 6; Rn.shake = Math.max(0, Rn.shake - dt * 3); }
    const ox = Math.round(Rn.cam.x + sx), oy = Math.round(Rn.cam.y + sy);
    Rn.ox = ox; Rn.oy = oy;
    g.fillStyle = m.outside === TL.VOID ? '#05030a' : m.outside === TL.WALL ? '#0a0810' : '#12224a';
    g.fillRect(0, 0, vw, vh);
    // ---- ground chunks ----
    const CHp = PQ.World.CH * T;
    const c0 = Math.floor(ox / CHp), c1 = Math.floor((ox + vw) / CHp), r0 = Math.floor(oy / CHp), r1 = Math.floor((oy + vh) / CHp);
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) g.drawImage(m.chunk(cx, cy), cx * CHp - ox, cy * CHp - oy);
    // ---- animated tiles (water sparkle, lava glow) ----
    const tx0 = Math.max(0, Math.floor(ox / T)), ty0 = Math.max(0, Math.floor(oy / T)), tx1 = Math.min(m.w - 1, Math.floor((ox + vw) / T)), ty1 = Math.min(m.h - 1, Math.floor((oy + vh) / T));
    const info = Art.TINFO;
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      const tt = m.tiles[y * m.w + x];
      if (info[tt].water && tt !== TL.BROKEN) {
        const h = U.hash2(x, y, 31);
        const ph = (t * 0.8 + h * 6) % 3;
        if (h < 0.45 && ph < 1.4) { const px = x * T - ox + Math.floor(h * 10) + Math.floor(ph * 2), py = y * T - oy + 4 + Math.floor(h * 90) % 8; g.fillStyle = ph < 0.7 ? 'rgba(216,246,255,0.55)' : 'rgba(134,208,240,0.5)'; g.fillRect(px, py, 3, 1); g.fillRect(px + 1, py - 1, 1, 1); }
      } else if (tt === TL.LAVA) {
        const h = U.hash2(x, y, 41);
        const a = 0.25 + 0.25 * Math.sin(t * 2 + h * 9);
        g.fillStyle = `rgba(255,226,122,${a.toFixed(2)})`;
        g.fillRect(x * T - ox + Math.floor(h * 10), y * T - oy + Math.floor(h * 70) % 12, 3, 2);
        if (h < 0.08 && Math.random() < 0.02) PQ.FX.spark(x * T + 8, y * T + 8, '#ff9a2e');
      }
    }
    // ---- farm crops (ground layer under objects) ----
    if (m.id === 'world' && G.save.farm) {
      for (const key in G.save.farm) {
        const f = G.save.farm[key], i = +key, x = i % m.w, y = (i / m.w) | 0;
        if (x < tx0 - 1 || x > tx1 + 1 || y < ty0 - 1 || y > ty1 + 1 || !f.crop) continue;
        const def = PQ.D.CROPS[f.crop];
        const st = f.stage >= def.days ? 3 : f.stage >= Math.ceil(def.days * 0.6) ? 2 : f.stage >= 1 ? 1 : 0;
        const spr = memo('crop' + f.crop + st, () => Art.makeCrop(def, st));
        g.drawImage(spr, x * T - ox + 8 - spr.width / 2, y * T - oy + T - spr.height);
        if (st === 3 && Math.floor(t * 2) % 2) { g.fillStyle = '#fff8d0'; g.fillRect(x * T - ox + 12, y * T - oy + 2, 1, 1); }
      }
    }
    PQ.FX.drawHazards(g, ox, oy);
    // ---- collect drawables ----
    const list = Rn._list || (Rn._list = []);
    list.length = 0;
    const seen = Rn._seen || (Rn._seen = new Set()); seen.clear();
    for (let y = ty0 - 1; y <= Math.min(m.h - 1, ty1 + 4); y++) for (let x = Math.max(0, tx0 - 3); x <= Math.min(m.w - 1, tx1 + 3); x++) {
      const o = m.objAt[y * m.w + x];
      if (!o || seen.has(o)) continue;
      seen.add(o);
      if (o.gone && o.k !== 'tree') continue;
      const spr = Rn.objSprite(o, t);
      if (!spr) continue;
      const bx = o.x * T + (o.w * T) / 2 - spr.width / 2 - ox;
      const by = (o.y + 1) * T - spr.height - oy + (o.k === 'tree' && !o.gone ? 2 : o.k === 'house' ? 3 : 0);
      if (FLAT[o.k]) { g.drawImage(spr, bx, by); continue; }
      list.push({ y: (o.y + 1) * T - 1, o, spr, bx, by });
    }
    for (const e of G.ents) if (!e.dead || e.drawDead) list.push({ y: e.y + (e.ysort || 0), e });
    list.push({ y: p.y, e: p });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) {
      if (d.e) { d.e.draw(g, ox, oy, t); continue; }
      let alpha = 1;
      // fade tall objects that hide the player
      if (d.o.tall && d.o.k !== 'house' && p.y < d.y && p.y > d.y - d.spr.height + 6 && Math.abs(p.x - (d.bx + ox + d.spr.width / 2)) < d.spr.width / 2 - 2) alpha = 0.55;
      if (alpha < 1) g.globalAlpha = alpha;
      g.drawImage(d.spr, d.bx, d.by);
      if (alpha < 1) g.globalAlpha = 1;
      if (d.o.k === 'windmill') { const b = Art.windmillBlades(); g.save(); g.translate(d.bx + d.spr.width / 2, d.by + 16); g.rotate(t * 0.8); g.drawImage(b, -b.width / 2, -b.height / 2); g.restore(); }
      if (d.o.hit > 0) { d.o.hit -= dt; }
    }
    // ---- effects over entities ----
    PQ.FX.draw(g, ox, oy, t);
    // ---- lighting ----
    const dark = m.dark ? 0.82 : PQ.Time.darkness();
    if (dark > 0.02) Rn.drawLight(G, dark, ox, oy, t, tx0, ty0, tx1, ty1);
    // tint (sunset / dawn / region)
    const tint = PQ.Time.tint(m);
    if (tint) { g.fillStyle = tint; g.fillRect(0, 0, vw, vh); }
    // weather
    PQ.Weather.draw(g, vw, vh, t, dt, ox, oy);
    // floating texts (above lighting so they stay readable)
    PQ.FX.drawText(g, ox, oy);
    if (Rn.flash > 0) { g.fillStyle = `rgba(255,255,255,${Math.min(0.6, Rn.flash)})`; g.fillRect(0, 0, vw, vh); Rn.flash -= dt * 3; }
  };
  Rn.present = function () {
    const ctx = Rn.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(Rn.buf, 0, 0, Rn.vw * Rn.scale, Rn.vh * Rn.scale);
  };

  Rn.drawLight = function (G, dark, ox, oy, t, tx0, ty0, tx1, ty1) {
    const lg = Rn.lg, lw = Rn.light.width, lh = Rn.light.height, m = G.map;
    lg.globalCompositeOperation = 'source-over';
    const night = PQ.Time.nightColor(m);
    lg.fillStyle = night; lg.globalAlpha = 1; lg.fillRect(0, 0, lw, lh);
    lg.globalCompositeOperation = 'destination-out';
    const lights = Rn._lights || (Rn._lights = []); lights.length = 0;
    const add = (x, y, r, a = 1) => { lights.push([x, y, r, a]); };
    const p = G.player;
    const pr = (m.dark ? 64 : 46) * (G.stats ? 1 + (G.stats.light || 0) : 1) + (G.companion && G.companion.def.role === 'lantern' ? 40 : 0);
    add(p.x, p.y - 8, pr, 1);
    for (let y = ty0 - 4; y <= ty1 + 4; y++) for (let x = tx0 - 4; x <= tx1 + 4; x++) {
      const o = m.obj(x, y);
      if (!o || o.x !== x || o.y !== y) continue;
      if (o.light || o.k === 'torch' || o.k === 'campfire' || o.k === 'lantern') add(x * T + 8, y * T + (o.k === 'lantern' ? -14 : 4), o.k === 'campfire' ? 70 + Math.sin(t * 9) * 4 : o.k === 'torch' ? 52 + Math.sin(t * 11 + x) * 3 : 44, 1);
      else if (o.k === 'mushroom') add(x * T + 8, y * T + 8, 22, 0.8);
      else if (o.k === 'house' && dark > 0.3) add((x + o.w / 2) * T, y * T, 40, 0.7);
      else if (o.k === 'waypoint' && G.save.waypoints[o.wid]) add(x * T + 8, y * T - 6, 34, 0.8);
      else if (o.k === 'switch') add(x * T + 8, y * T, 26, 0.8);
    }
    for (const e of G.ents) if (e.glow) add(e.x, e.y - 6, e.glow, 0.9);
    for (const pz of PQ.FX.lights) add(pz[0], pz[1], pz[2], pz[3]);
    // lava glow
    for (let y = ty0; y <= ty1; y += 2) for (let x = tx0; x <= tx1; x += 2) if (m.t(x, y) === TL.LAVA) add(x * T + 8, y * T + 8, 30, 0.6);
    const spr = Art.glowSprite(64, 'rgba(255,255,255,1)');
    for (const [x, y, r, a] of lights) {
      const sx = (x - ox) / 2, sy = (y - oy) / 2, rr = r / 2;
      if (sx < -rr || sy < -rr || sx > lw + rr || sy > lh + rr) continue;
      lg.globalAlpha = a; lg.drawImage(spr, sx - rr, sy - rr, rr * 2, rr * 2);
    }
    lg.globalAlpha = 1; lg.globalCompositeOperation = 'source-over';
    const g = Rn.g;
    g.save(); g.imageSmoothingEnabled = true; g.globalAlpha = Math.min(0.92, dark); g.drawImage(Rn.light, 0, 0, Rn.vw, Rn.vh); g.restore();
    g.imageSmoothingEnabled = false;
    // warm glows (additive)
    g.globalCompositeOperation = 'lighter';
    const warm = Art.glowSprite(32, 'rgba(255,170,80,0.5)');
    for (const [x, y, r, a] of lights) { if (r < 30 || (x === p.x && y === p.y - 8)) continue; const s = r * 0.7; g.globalAlpha = 0.35 * a * dark; g.drawImage(warm, x - ox - s, y - oy - s, s * 2, s * 2); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  };

  /* ---------------- minimap & world map ---------------- */
  const TCOL = {};
  Rn.tileColor = function (t, reg) {
    switch (t) {
      case TL.GRASS: return '#4f9a43'; case TL.DGRASS: return '#24503d'; case TL.DIRT: return '#a07850'; case TL.SAND: return '#e6c07a'; case TL.WATER: return '#3f8fd0';
      case TL.DEEP: return '#1f4f8f'; case TL.SNOW: return '#e2ecf6'; case TL.ICE: return '#9fd2ee'; case TL.STONE: return '#8a8a9c'; case TL.CLIFF: case TL.VINE: return reg === 3 ? '#6f86a6' : '#4f4e5e';
      case TL.LAVA: return '#f0602a'; case TL.ASH: return '#4a3c38'; case TL.SHADOW: return '#3c2a5c'; case TL.VOID: return '#08060e'; case TL.BRIDGE: return '#b07a44'; case TL.BROKEN: return '#5a4a3a';
      case TL.COBBLE: return '#9a9aa8'; case TL.WALL: return '#22202a'; case TL.FLOOR: return '#6a6070'; case TL.WOOD: return '#a07040'; default: return '#777';
    }
  };
  Rn.mapImage = function (m) { // 1px per tile base image (cached per map)
    if (m._mapImg && !m._mapDirty) return m._mapImg;
    const [c, g] = PQ.canvas(m.w, m.h);
    const id = g.createImageData(m.w, m.h), d = id.data;
    for (let i = 0; i < m.w * m.h; i++) {
      const col = TCOL[m.tiles[i] + ':' + m.reg[i]] || (TCOL[m.tiles[i] + ':' + m.reg[i]] = U.hexToRgb(Rn.tileColor(m.tiles[i], m.reg[i])));
      let [r, gg, b] = col;
      const o = m.objAt[i];
      if (o && o.k === 'tree' && !o.gone) { r *= 0.7; gg *= 0.8; b *= 0.7; }
      if (o && (o.k === 'house' || o.k === 'stall')) { r = 200; gg = 120; b = 90; }
      d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    m._mapImg = c; m._mapDirty = false;
    return c;
  };
  /* explored mask image (black where unexplored) */
  Rn.fogImage = function (m, fog) {
    const key = '_fog';
    let c = m[key];
    if (!c) { c = m[key] = PQ.canvas(m.w, m.h)[0]; }
    if (m._fogVer === fog.ver) return c;
    const g = c.getContext('2d');
    const id = g.createImageData(m.w, m.h), d = id.data;
    for (let i = 0; i < m.w * m.h; i++) { d[i * 4 + 3] = fog.has(i) ? 0 : 255; d[i * 4] = 8; d[i * 4 + 1] = 6; d[i * 4 + 2] = 14; }
    g.putImageData(id, 0, 0);
    m._fogVer = fog.ver;
    return c;
  };
})();
