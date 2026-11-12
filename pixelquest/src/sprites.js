/* PIXEL QUEST — character, creature, enemy and boss sprite generators */
'use strict';
(function () {
  const Art = PQ.Art, U = PQ.U, P = Art.P;
  const C = Art.C, px = Art.px, R = Art.rect, blob = Art.blob;
  const sh = U.shade;
  const Spr = { cache: {} };
  PQ.Spr = Spr;

  /* =========================================================
     HUMANOIDS — 16x20 base, 4 directions, outlined to 18x22
     ========================================================= */
  Spr.HAIR = ['short', 'long', 'spiky', 'ponytail', 'bob', 'mohawk', 'bun', 'braids', 'bald'];
  Spr.OUTFIT = ['adventurer', 'tunic', 'jacket', 'robe', 'armor'];
  Spr.ACC = ['none', 'glasses', 'headband', 'scarf', 'hat', 'earrings', 'flower', 'hood'];

  function drawHair(g, o, dir, oy) {
    const h = o.hairColor, hd = sh(h, -0.3), hl = sh(h, 0.28);
    const st = o.hair;
    const r = (x, y, w, hh, c) => R(g, x, y + oy, w, hh, c);
    if (st === 'bald') return;
    if (st === 'mohawk') { r(6, 0, 4, 4, h); r(7, 0, 2, 1, hl); if (dir === 'right') r(5, 0, 4, 4, h); return; }
    // cap
    r(5, 1, 6, 1, h); r(4, 2, 8, 1, h); r(3, 3, 10, 2, h);
    r(5, 2, 4, 1, hl); r(4, 3, 3, 1, hl);
    if (dir === 'down') { r(3, 5, 1, 2, h); r(12, 5, 1, 2, h); r(3, 5, 2, 1, h); r(6, 5, 2, 1, h); r(10, 5, 2, 1, h); r(8, 5, 1, 1, hd); }
    else if (dir === 'up') { r(3, 5, 10, 5, h); r(3, 9, 10, 1, hd); r(5, 5, 3, 1, hl); }
    else { r(3, 5, 5, 4, h); r(8, 5, 2, 1, h); r(3, 8, 4, 1, hd); r(11, 3, 2, 2, h); }
    if (st === 'long') { if (dir === 'down') { r(2, 5, 2, 9, h); r(12, 5, 2, 9, h); r(2, 13, 2, 1, hd); r(12, 13, 2, 1, hd); } else if (dir === 'up') r(3, 9, 10, 5, h), r(3, 13, 10, 1, hd); else r(3, 8, 4, 6, h), r(3, 13, 4, 1, hd); }
    if (st === 'spiky') { r(4, 0, 1, 2, h); r(7, 0, 2, 1, h); r(11, 0, 1, 2, h); r(2, 2, 1, 2, h); r(13, 2, 1, 2, h); px(g, 8, oy + 0, hl); }
    if (st === 'ponytail') { if (dir === 'up') { r(7, 6, 2, 7, h); r(7, 12, 2, 1, hd); } else if (dir === 'right') { r(1, 4, 3, 2, h); r(1, 6, 2, 5, h); } else { r(13, 4, 1, 5, h); } r(7, 2, 2, 1, o.accent || '#e8363c'); }
    if (st === 'bob') { if (dir !== 'up') { r(2, 4, 2, 6, h); r(12, 4, 2, 6, h); r(2, 9, 2, 1, hd); r(12, 9, 2, 1, hd); } else r(3, 9, 10, 1, h); }
    if (st === 'bun') { r(6, 0, 4, 2, h); r(7, 0, 2, 1, hl); }
    if (st === 'braids') { if (dir === 'down') { r(2, 6, 2, 8, h); r(12, 6, 2, 8, h); r(2, 12, 2, 1, o.accent || '#e8363c'); r(12, 12, 2, 1, o.accent || '#e8363c'); } else if (dir === 'up') { r(4, 9, 2, 6, h); r(10, 9, 2, 6, h); } else r(3, 8, 2, 6, h); }
  }

  function drawHumanoid(g, o, dir, pose, f) {
    const skin = o.skin, sd = sh(skin, -0.18);
    const top = o.top, td = sh(top, -0.28), tl = sh(top, 0.2);
    const bot = o.bottom, bd = sh(bot, -0.3);
    const acc = o.accent;
    const boot = o.boots || '#4f321f';
    const walk = pose === 'walk' ? f % 4 : 0;
    const bob = pose === 'walk' && (walk === 1 || walk === 3) ? 1 : 0;
    const oy = bob;
    const r = (x, y, w, h, c) => R(g, x, y + oy, w, h, c);
    const side = dir === 'right';
    // ---- legs ----
    const legL = walk === 1 ? -1 : 0, legR = walk === 3 ? -1 : 0;
    if (o.outfit !== 'robe') {
      if (!side) {
        R(g, 5, 16 + legL, 2, 3, bot); R(g, 9, 16 + legR, 2, 3, bot); R(g, 6, 16, 1, 2, bd); R(g, 10, 16, 1, 2, bd);
        R(g, 5, 19 + legL, 2, 1, boot); R(g, 9, 19 + legR, 2, 1, boot);
      } else {
        const a = walk === 1 ? 2 : walk === 3 ? -2 : 0;
        R(g, 7 - a, 16, 2, 3, bd); R(g, 7 - a, 19, 3, 1, sh(boot, -0.2));
        R(g, 7 + a, 16, 2, 3, bot); R(g, 7 + a, 19, 3, 1, boot);
      }
    } else {
      R(g, 5, 19, 2, 1, boot); R(g, 9, 19, 2, 1, boot);
    }
    // ---- body ----
    const bx = side ? 5 : 4, bw = side ? 6 : 8;
    r(bx, 11, bw, 5, top);
    r(bx + bw - 2, 11, 2, 5, td); r(bx, 11, 1, 5, tl);
    if (o.outfit === 'robe') { r(bx - 1, 14, bw + 2, 6 - oy, top); r(bx + bw - 1, 14, 2, 6 - oy, td); r(bx - 1, 18 - oy, bw + 2, 1, acc); if (!side) r(7, 11, 2, 7, acc); }
    if (o.outfit === 'tunic') { r(bx - 1, 15, bw + 2, 1, acc); if (!side) { r(7, 11, 2, 1, acc); } }
    if (o.outfit === 'jacket' && dir === 'down') { r(7, 11, 2, 5, acc); }
    if (o.outfit === 'adventurer') { r(bx, 14, bw, 1, '#4f321f'); if (dir === 'down') { for (let i = 0; i < 4; i++) px(g, 5 + i, 11 + i + oy, acc); } if (dir === 'up') r(5, 11, 6, 4, acc), r(5, 11, 6, 1, sh(acc, 0.2)); }
    if (o.outfit === 'armor') { r(bx, 11, bw, 1, tl); r(bx, 13, bw, 1, td); if (!side) { r(3, 11, 2, 2, tl); r(11, 11, 2, 2, td); } else r(7, 11, 3, 2, tl); r(bx, 15, bw, 1, acc); }
    if (o.outfit !== 'robe' && o.outfit !== 'armor' && o.outfit !== 'adventurer') r(bx, 15, bw, 1, sh(bot, -0.4));
    // ---- arms ----
    const armSwing = pose === 'walk' ? (walk === 1 ? -1 : walk === 3 ? 1 : 0) : 0;
    const atk = pose === 'attack', climb = pose === 'climb';
    if (!side) {
      if (climb) { r(3, 8 + (f % 2), 1, 4, top); r(12, 9 - (f % 2), 1, 4, top); px(g, 3, 7 + (f % 2) + oy, skin); px(g, 12, 8 - (f % 2) + oy, skin); }
      else if (atk && dir === 'down') { r(3, 11, 1, 3, td); r(12, 11, 2, 2, top); r(12, 13, 2, 1, skin); px(g, 3, 14 + oy, skin); }
      else if (atk && dir === 'up') { r(3, 11, 1, 3, td); r(12, 9, 1, 3, top); px(g, 12, 8 + oy, skin); px(g, 3, 14 + oy, skin); }
      else { r(3, 11 + armSwing, 1, 3, dir === 'up' ? td : top); r(12, 11 - armSwing, 1, 3, td); px(g, 3, 14 + armSwing + oy, skin); px(g, 12, 14 - armSwing + oy, skin); }
    } else {
      if (atk) { r(8, 11, 4, 2, top); r(12, 11, 1, 2, skin); }
      else { const ax = 7 + armSwing; r(ax, 11, 2, 3, td); r(ax, 14, 2, 1, skin); }
    }
    // ---- head ----
    const hx = side ? 4 : 3, hw = side ? 9 : 10;
    r(hx + 2, 2, hw - 4, 1, skin); r(hx + 1, 3, hw - 2, 1, skin); r(hx, 4, hw, 6, skin); r(hx + 1, 10, hw - 2, 1, skin);
    r(hx + hw - 2, 4, 2, 6, sd); r(hx + 1, 10, hw - 2, 1, sd);
    if (o.ears) { if (!side) { r(1, 5, 2, 2, skin); r(13, 5, 2, 2, sd); px(g, 0, 4 + oy, skin); px(g, 15, 4 + oy, sd); } else { r(6, 5, 2, 2, sd); px(g, 6, 4 + oy, skin); } }
    if (o.wrapped) { for (let y = 3; y < 11; y += 2) r(hx, y, hw, 1, '#c8bca0'); }
    // face
    if (pose === 'hurt') {
      if (dir === 'down') { px(g, 5, 6 + oy, '#1a1420'); px(g, 6, 7 + oy, '#1a1420'); px(g, 10, 6 + oy, '#1a1420'); px(g, 9, 7 + oy, '#1a1420'); }
      else if (side) { px(g, 10, 6 + oy, '#1a1420'); px(g, 11, 7 + oy, '#1a1420'); }
    } else if (dir === 'down') {
      const blink = o.blink && f % 8 === 7;
      if (blink) { r(5, 7, 2, 1, '#1a1420'); r(9, 7, 2, 1, '#1a1420'); }
      else { r(5, 6, 1, 2, '#1a1420'); r(10, 6, 1, 2, '#1a1420'); px(g, 5, 7 + oy, o.eye); px(g, 10, 7 + oy, o.eye); }
      px(g, 4, 8 + oy, sh(skin, -0.08)); px(g, 11, 8 + oy, sh(skin, -0.25));
      if (o.glow) { px(g, 5, 6 + oy, o.glow); px(g, 10, 6 + oy, o.glow); }
    } else if (side) {
      r(10, 6, 1, 2, '#1a1420'); px(g, 10, 7 + oy, o.eye); px(g, 12, 8 + oy, sd);
      if (o.glow) px(g, 10, 6 + oy, o.glow);
    }
    // hair & headgear
    if (o.helmet) {
      const m = o.helmet, ml = sh(m, 0.25), md = sh(m, -0.3);
      r(hx - 1, 1, hw + 2, 5, m); r(hx, 1, hw, 1, ml); r(hx - 1, 5, hw + 2, 1, md);
      if (dir === 'down') { r(hx, 6, hw, 2, m); r(5, 6, 6, 1, '#120d18'); } else if (dir === 'up') r(hx, 6, hw, 4, m); else { r(hx, 6, 4, 4, m); r(9, 6, 4, 1, '#120d18'); }
      if (o.plume) { r(7, 0, 2, 2, o.plume); }
    } else if (o.acc === 'hood') {
      r(hx - 1, 1, hw + 2, 4, acc); r(hx - 1, 5, 2, 6, acc); r(hx + hw - 1, 5, 2, 6, sh(acc, -0.25)); if (dir === 'up') r(hx, 5, hw, 6, acc);
      r(hx, 1, hw, 1, sh(acc, 0.25));
    } else drawHair(g, o, dir, oy);
    // accessories
    if (o.acc === 'glasses' && dir !== 'up') { if (dir === 'down') { r(4, 6, 3, 2, '#2a2a36'); r(9, 6, 3, 2, '#2a2a36'); r(7, 6, 2, 1, '#2a2a36'); px(g, 5, 6 + oy, '#b8e8ff'); px(g, 10, 6 + oy, '#b8e8ff'); } else { r(9, 6, 3, 2, '#2a2a36'); px(g, 10, 6 + oy, '#b8e8ff'); } }
    if (o.acc === 'headband') { r(hx, 4, hw, 1, acc); if (dir === 'up') r(7, 5, 2, 3, acc); }
    if (o.acc === 'scarf') { r(hx + 1, 10, hw - 2, 2, acc); if (dir !== 'up') r(side ? 5 : 10, 12, 2, 3, sh(acc, -0.2)); }
    if (o.acc === 'hat') { r(hx - 2, 3, hw + 4, 2, acc); r(hx + 1, 0, hw - 2, 3, acc); r(hx + 1, 2, hw - 2, 1, sh(acc, -0.35)); r(hx + 2, 0, 3, 1, sh(acc, 0.3)); }
    if (o.acc === 'earrings' && !side) { px(g, 3, 9 + oy, '#ffd75a'); px(g, 12, 9 + oy, '#ffd75a'); }
    if (o.acc === 'earrings' && side) px(g, 6, 9 + oy, '#ffd75a');
    if (o.acc === 'flower') { r(10, 2, 2, 2, '#ff70b0'); px(g, 10, 2 + oy, '#fff'); }
    if (o.crown) { r(hx + 1, 0, hw - 2, 2, '#e0a92e'); px(g, hx + 1, oy - 1 < 0 ? 0 : oy - 1, '#ffd75a'); px(g, 8, 0 + oy, '#c9323a'); }
  }

  /* sprite sheet: frames keyed dir_pose_frame -> outlined canvases */
  Spr.humanoid = function (o) {
    const key = 'H' + JSON.stringify(o);
    if (Spr.cache[key]) return Spr.cache[key];
    const sheet = {};
    const poses = { idle: 2, walk: 4, attack: 1, hurt: 1, climb: 2 };
    for (const dir of ['down', 'up', 'right']) {
      for (const pose in poses) {
        for (let f = 0; f < poses[pose]; f++) {
          if (pose === 'climb' && dir !== 'up') continue;
          const [c, g] = C(16, 20);
          drawHumanoid(g, Object.assign({}, o, { blink: true }), dir, pose === 'idle' ? 'walk' : pose, pose === 'idle' ? (f ? 0 : 0) : f);
          if (pose === 'idle' && f === 1) { /* breathing frame: shift head down by redrawing body */ }
          let out = Art.outline(c);
          if (o.scale && o.scale > 1) { const [c2, g2] = C(out.width * o.scale, out.height * o.scale); g2.drawImage(out, 0, 0, c2.width, c2.height); out = c2; }
          sheet[dir + '_' + pose + '_' + f] = out;
          sheet['left_' + pose + '_' + f] = null;
          if (dir === 'right') sheet['left_' + pose + '_' + f] = Art.flip(out);
        }
      }
    }
    // idle breathing: second frame = first frame drawn 1px lower at the top half
    for (const dir of ['down', 'up', 'right', 'left']) {
      const a = sheet[dir + '_idle_0'];
      if (!a) continue;
      const [c, g] = C(a.width, a.height);
      const s = o.scale || 1;
      g.drawImage(a, 0, 0, a.width, 13 * s, 0, s, a.width, 13 * s);
      g.drawImage(a, 0, 13 * s, a.width, a.height - 13 * s, 0, 13 * s, a.width, a.height - 13 * s);
      sheet[dir + '_idle_1'] = c;
    }
    sheet.climb = (f) => sheet['up_climb_' + (f % 2)];
    Spr.cache[key] = sheet;
    return sheet;
  };
  Spr.frame = function (sheet, dir, pose, t) {
    let n = pose === 'walk' ? 4 : pose === 'idle' ? 2 : pose === 'climb' ? 2 : 1;
    const f = pose === 'walk' ? Math.floor(t * 8) % n : pose === 'idle' ? Math.floor(t * 1.6) % n : pose === 'climb' ? Math.floor(t * 5) % n : 0;
    if (pose === 'climb') return sheet['up_climb_' + f];
    return sheet[dir + '_' + pose + '_' + f] || sheet[dir + '_walk_0'] || sheet['down_walk_0'];
  };

  /* =========================================================
     CREATURES / ENEMIES (shaded shapes, side view facing right)
     ========================================================= */
  const ramp4 = (c) => [sh(c, -0.45), sh(c, -0.2), c, sh(c, 0.28), sh(c, 0.5)];
  function eye(g, x, y, big, col = '#1a1420', glow) {
    if (big) { R(g, x, y, 2, 2, col); px(g, x, y, '#ffffff'); if (glow) R(g, x, y, 2, 2, glow); }
    else { px(g, x, y, glow || col); }
  }
  function finishFrames(frames, scale = 1) {
    return frames.map((c) => {
      let o = Art.outline(c);
      if (scale > 1) { const [c2, g2] = C(o.width * scale, o.height * scale); g2.drawImage(o, 0, 0, c2.width, c2.height); o = c2; }
      return { r: o, l: Art.flip(o) };
    });
  }

  const GEN = {
    slime(p) { // p.color, p.size
      return [0, 1].map((f) => {
        const s = p.size || 1; const W = Math.round(16 * s), H = Math.round(14 * s);
        const [c, g] = C(W, H);
        const rx = 7 * s + (f ? 0.8 : 0), ry = 5 * s - (f ? 0.8 : 0);
        blob(g, W / 2, H - ry - 1, rx, ry, ramp4(p.color), { bias: 0.05 });
        const ey = Math.round(H - ry - 1);
        eye(g, Math.round(W / 2 - 3 * s), ey - 1, true); eye(g, Math.round(W / 2 + 2 * s), ey - 1, true);
        px(g, W / 2 - 4 * s, ey - 3 * s, '#fff'); px(g, W / 2 - 3 * s, ey - 4 * s, '#fff');
        if (p.crown) { R(g, W / 2 - 3, 0, 6, 2, '#e0a92e'); px(g, W / 2 - 3, 0, '#ffd75a'); }
        if (p.drip) { px(g, W / 2 + 4 * s, H - 2, sh(p.color, 0.3)); }
        return c;
      });
    },
    bat(p) {
      return [0, 1].map((f) => {
        const [c, g] = C(18, 12);
        const col = ramp4(p.color);
        blob(g, 9, 6, 3, 3.5, col);
        const wy = f ? 2 : 6;
        for (let i = 0; i < 6; i++) { R(g, 8 - i - 2, wy + (f ? i * 0.7 : -i * 0.4) + 1, 2, 2, col[1]); R(g, 10 + i, wy + (f ? i * 0.7 : -i * 0.4) + 1, 2, 2, col[1]); }
        R(g, 2, f ? 6 : 3, 1, 3, col[2]); R(g, 15, f ? 6 : 3, 1, 3, col[2]);
        px(g, 7, 2, col[2]); px(g, 11, 2, col[2]);
        eye(g, 8, 5, false, '#000', p.eye || '#ff5050'); eye(g, 10, 5, false, '#000', p.eye || '#ff5050');
        px(g, 8, 8, '#fff'); px(g, 10, 8, '#fff');
        return c;
      });
    },
    quad(p) { // wolf / boar / hound
      return [0, 1, 2, 3].map((f) => {
        const [c, g] = C(24, 18);
        const col = ramp4(p.color);
        const lift = [0, 1, 0, 1][f];
        const lx = [[6, 0], [8, 1], [6, 0], [8, -1]][f];
        // legs (back pair darker)
        for (const [x, ph] of [[7, 0], [15, 1]]) {
          const off = (f + ph) % 2 ? 1 : -1;
          R(g, x + off, 12, 2, 5, col[1]); R(g, x - off + 2, 12, 2, 5, col[0]);
        }
        void lx;
        blob(g, 11, 10 - lift * 0.5, 7, 3.6, col, { bias: 0.02 });
        if (p.belly) for (let x = 7; x < 15; x++) px(g, x, 12 - lift * 0.5, p.belly);
        // head
        const hx = 18, hy = 8 - lift * 0.5;
        blob(g, hx, hy, 3.6, 3, col);
        R(g, hx + 2, hy, 4, 2, col[2]); R(g, hx + 2, hy + 1, 4, 1, col[1]); px(g, hx + 6, hy, '#1a1420');
        if (p.ears !== false) { R(g, hx - 2, hy - 5, 2, 3, col[2]); R(g, hx, hy - 5, 2, 2, col[1]); }
        eye(g, hx + 1, hy - 1, false, '#000', p.eye || '#ffd040');
        if (p.tusk) { R(g, hx + 4, hy + 2, 1, 2, '#f2ead8'); }
        // tail
        if (p.tail !== false) { for (let i = 0; i < 5; i++) px(g, 4 - i * 0.6, 8 - i * 0.6 + (f % 2), col[i < 2 ? 2 : 3]); }
        if (p.mane) for (let i = 0; i < 6; i++) px(g, 8 + i * 1.5, 6 - lift * 0.5 - (i % 2), p.mane);
        if (p.bristle) for (let i = 0; i < 5; i++) px(g, 7 + i * 2, 6 - (i % 2), col[0]);
        return c;
      });
    },
    crawler(p) { // crab / scorpion / beetle / spider
      return [0, 1].map((f) => {
        const [c, g] = C(22, 16);
        const col = ramp4(p.color);
        for (let i = 0; i < 3; i++) { const x = 7 + i * 4; R(g, x, 11 + (f + i) % 2, 1, 4 - (f + i) % 2, col[0]); R(g, x + 1, 13, 2, 1, col[0]); }
        blob(g, 11, 9, 7, 4.5, col, { bias: 0.05 });
        if (p.shell) { for (let x = 5; x < 18; x += 3) px(g, x, 7, col[3]); R(g, 6, 9, 10, 1, col[1]); }
        if (p.claws) { blob(g, 19, 7 + f, 3, 2.5, col); R(g, 17, 9, 2, 2, col[1]); blob(g, 3, 8 - f, 2.5, 2, col); }
        if (p.stinger) { for (let i = 0; i < 6; i++) px(g, 4 - i * 0.3, 7 - i, col[2]); R(g, 2, 0, 3, 2, p.sting || '#c8ff60'); }
        if (p.horn) { R(g, 17, 3, 2, 5, col[3]); px(g, 18, 2, col[4]); }
        eye(g, 15, 7, false, '#000', p.eye || '#fff'); eye(g, 17, 7, false, '#000', p.eye || '#fff');
        return c;
      });
    },
    golem(p) {
      const s = p.size || 1;
      return [0, 1].map((f) => {
        const W = Math.round(24 * s), H = Math.round(26 * s);
        const [c, g] = C(W, H);
        const col = ramp4(p.color);
        const k = (v) => Math.round(v * s);
        blob(g, k(7), k(22), k(3), k(4), col); blob(g, k(17), k(22), k(3), k(4), col);
        blob(g, k(12), k(14), k(8), k(7), col, { bias: 0.02 });
        blob(g, k(3), k(14) + (f ? 1 : 0), k(3), k(5), col); blob(g, k(21), k(14) + (f ? 0 : 1), k(3), k(5), col);
        blob(g, k(12), k(6), k(5), k(4), col);
        R(g, k(9), k(6), k(2), Math.max(1, k(1)), p.eye || '#7ef0ff'); R(g, k(13), k(6), k(2), Math.max(1, k(1)), p.eye || '#7ef0ff');
        if (p.cracks) for (let i = 0; i < 6 * s; i++) { const x = k(6) + ((i * 37) % k(12)), y = k(10) + ((i * 23) % k(9)); R(g, x, y, Math.max(1, k(2)), 1, p.cracks); }
        if (p.moss) for (let i = 0; i < 8 * s; i++) px(g, k(6) + ((i * 29) % k(12)), k(8) + ((i * 11) % k(4)), p.moss);
        if (p.ice) { R(g, k(8), k(1), k(2), k(3), '#e6faff'); R(g, k(15), k(2), k(2), k(2), '#e6faff'); }
        return c;
      });
    },
    blob(p) { // puffer / slug / lurker / eye / ghost / wisp
      return [0, 1].map((f) => {
        const [c, g] = C(20, 18);
        const col = ramp4(p.color || '#888888');
        if (p.kind === 'puffer') {
          const r = f ? 6.5 : 5.5;
          for (let a = 0; a < 10; a++) { const an = a / 10 * 6.28; R(g, 10 + Math.cos(an) * (r + 2), 9 + Math.sin(an) * (r + 2), 1, 1, col[3]); }
          blob(g, 10, 9, r, r, col); eye(g, 8, 7, true); eye(g, 12, 7, true); R(g, 9, 11, 3, 1, col[0]);
          for (let i = 0; i < 4; i++) px(g, 6 + i * 3, 12 - (i % 2) * 6, p.spot || '#ffd0ff');
        } else if (p.kind === 'slug') {
          blob(g, 9, 13 - f * 0.3, 8, 3.5 + f * 0.3, col);
          R(g, 14, 5, 1, 6, col[2]); R(g, 17, 6, 1, 5, col[2]); px(g, 14, 4, '#fff'); px(g, 17, 5, '#fff');
          for (let x = 3; x < 16; x += 3) px(g, x, 11, p.spot || col[4]);
        } else if (p.kind === 'lurker') {
          blob(g, 10, 13, 9, 4, col);
          if (f) { R(g, 6, 8, 8, 4, '#2a0f0f'); for (let x = 6; x < 14; x += 2) { px(g, x, 8, '#fff'); px(g, x + 1, 11, '#fff'); } }
          eye(g, 6, 9 - f * 2, false, '#000', '#ffde40'); eye(g, 13, 9 - f * 2, false, '#000', '#ffde40');
        } else if (p.kind === 'eye') {
          for (let i = 0; i < 5; i++) for (let k = 0; k < 6; k++) px(g, 4 + i * 3 + Math.sin(k + f + i) * 1, 13 + k, col[1]);
          blob(g, 10, 8, 6.5, 6.5, ['#c8b8d8', '#e8e0f0', '#ffffff']);
          blob(g, 11 + f, 8, 3, 3, ['#200a30', p.iris || '#c040ff', '#ff90ff']); R(g, 11 + f, 7, 2, 2, '#000'); px(g, 11 + f, 7, '#fff');
        } else if (p.kind === 'ghost') {
          blob(g, 10, 8, 6, 6, col);
          for (let x = 4; x < 16; x++) R(g, x, 10, 1, 4 + ((x + f) % 3), col[(x + f) % 2 ? 1 : 2]);
          R(g, 7, 6, 2, 3, '#000'); R(g, 12, 6, 2, 3, '#000'); px(g, 7, 6, p.eye || '#ff70ff'); px(g, 12, 6, p.eye || '#ff70ff');
        } else if (p.kind === 'wisp') {
          for (let i = 0; i < 6; i++) blob(g, 10 - i * 0.4 + (f ? 1 : -1) * (i % 2), 9 + i * 1.2, 4 - i * 0.6, 3 - i * 0.4, col);
          blob(g, 10, 8, 4, 4, col); eye(g, 8, 7, false, '#000', '#fff'); eye(g, 11, 7, false, '#000', '#fff');
        } else if (p.kind === 'stump') {
          R(g, 4, 6, 12, 11, P.wood[2]); R(g, 4, 6, 3, 11, P.wood[3]); R(g, 13, 6, 3, 11, P.wood[1]);
          blob(g, 10, 5, 6, 2, [P.wood[1], P.wood[3], P.wood[4]]); for (let a = 0; a < 3; a++) px(g, 8 + a * 2, 5, P.wood[1]);
          if (f) { R(g, 6, 11, 8, 3, '#1a0a05'); for (let x = 6; x < 14; x += 2) px(g, x, 11, '#e8e0c8'); eye(g, 7, 8, true, '#300', '#ffd040'); eye(g, 11, 8, true, '#300', '#ffd040'); }
          R(g, 2, 15, 4, 2, P.wood[1]); R(g, 14, 15, 4, 2, P.wood[1]);
          for (let i = 0; i < 4; i++) px(g, 5 + i * 3, 7 + (i % 2) * 6, P.leaf[3]);
        } else if (p.kind === 'cactus') {
          const cr = ['#1e4a2a', '#2f6e38', '#4c9a47', '#7cc45a'];
          R(g, 6, 4, 8, 13, cr[2]); R(g, 6, 4, 2, 13, cr[3]); R(g, 12, 4, 2, 13, cr[1]); R(g, 7, 3, 6, 1, cr[2]);
          R(g, 2, 8, 4, 3, cr[2]); R(g, 2, 5, 2, 4, cr[2]); R(g, 14, 9, 4, 3, cr[2]); R(g, 16, 6, 2, 4, cr[2]);
          eye(g, 8, 7, false, '#000', '#200'); eye(g, 11, 7, false, '#000', '#200'); R(g, 8, 10 + f, 4, 1 + f, '#2a0f0f');
          R(g, 9, 1, 2, 2, '#ff6fa8');
        } else if (p.kind === 'imp') {
          blob(g, 10, 10, 4, 5, col); blob(g, 10, 5, 3.5, 3, col);
          R(g, 7, 1, 1, 2, col[3]); R(g, 12, 1, 1, 2, col[3]);
          for (let i = 0; i < 5; i++) { px(g, 5 - i, 7 + (f ? -i * 0.5 : i * 0.3), col[1]); px(g, 15 + i, 7 + (f ? -i * 0.5 : i * 0.3), col[1]); R(g, 4 - i * 0.5, 8 + (f ? -i * 0.4 : i * 0.4), 1, 2, col[0]); R(g, 16 + i * 0.5, 8 + (f ? -i * 0.4 : i * 0.4), 1, 2, col[0]); }
          eye(g, 9, 5, false, '#000', '#fff26a'); eye(g, 11, 5, false, '#000', '#fff26a');
          for (let i = 0; i < 4; i++) px(g, 10 + i * 0.5, 15 + i, col[2]);
        } else if (p.kind === 'yeti') {
          blob(g, 10, 11, 7, 6, col); blob(g, 10, 5, 4, 3.5, col); blob(g, 3, 11, 2.5, 4, col); blob(g, 17, 11, 2.5, 4, col);
          R(g, 8, 4, 4, 3, '#6a8cc8'); eye(g, 8, 5, false, '#000', '#1a2a4a'); eye(g, 11, 5, false, '#000', '#1a2a4a'); R(g, 9, 7, 2, 1, '#e8f0ff');
          R(g, 6, 16, 3, 2, col[1]); R(g, 11, 16, 3, 2, col[1]);
        }
        return c;
      });
    },
    critter(p) { // collectible companion: compact & cute
      return [0, 1].map((f) => {
        const [c, g] = C(16, 15);
        const col = ramp4(p.color);
        const by = 9 + (f ? 0.5 : 0);
        if (p.wings) { const wc = p.wingColor || col[3]; R(g, 2, by - 4 - (f ? 1 : -1), 4, 3, wc); R(g, 10, by - 4 - (f ? 1 : -1), 4, 3, wc); }
        if (p.tail === 'fluffy') blob(g, 3, by - 1, 2.6, 2.6, col);
        if (p.tail === 'thin') for (let i = 0; i < 4; i++) px(g, 3 - i * 0.5, by - i, col[1]);
        if (p.tail === 'flame') { for (let i = 0; i < 4; i++) R(g, 2 - i * 0.3, by - 1 - i, 2, 2, i < 2 ? '#ff9a2e' : '#ffe27a'); }
        if (p.tail === 'leaf') { R(g, 1, by - 3, 3, 2, P.leaf[3]); R(g, 2, by - 1, 2, 1, P.leaf[2]); }
        if (p.tail === 'long') for (let i = 0; i < 6; i++) px(g, 3 - i * 0.4, by + 2 - i * 0.2, col[1]);
        const long = p.shape === 'long';
        blob(g, 8, by, long ? 6 : 5, long ? 3.4 : 4.2, col, { bias: 0.08 });
        if (p.belly) for (let x = 6; x < 11; x++) px(g, x, by + 2, p.belly);
        const hx = long ? 12 : 9, hy = long ? by - 2 : by - 4;
        if (p.head !== false) blob(g, hx, hy, 3.5, 3.2, col, { bias: 0.08 });
        const ex = hx - 1, ey = hy - 1;
        if (p.ears === 'cat') { R(g, hx - 3, hy - 4, 2, 2, col[2]); R(g, hx + 1, hy - 4, 2, 2, col[2]); px(g, hx - 2, hy - 5, col[3]); px(g, hx + 2, hy - 5, col[3]); }
        if (p.ears === 'bunny') { R(g, hx - 2, hy - 7, 1, 4, col[3]); R(g, hx + 1, hy - 7, 1, 4, col[3]); }
        if (p.ears === 'round') { blob(g, hx - 2.5, hy - 3, 1.3, 1.3, col); blob(g, hx + 2.5, hy - 3, 1.3, 1.3, col); }
        if (p.ears === 'horns') { R(g, hx - 2, hy - 5, 1, 2, '#f2ead8'); R(g, hx + 2, hy - 5, 1, 2, '#f2ead8'); }
        if (p.ears === 'leaf') { R(g, hx - 1, hy - 6, 3, 2, P.leaf[3]); px(g, hx, hy - 4, P.leaf[2]); }
        if (p.ears === 'flame') { R(g, hx - 1, hy - 6 - f, 2, 3, '#ffb13b'); px(g, hx, hy - 7 - f, '#ffe27a'); }
        if (p.ears === 'crystal') { R(g, hx - 2, hy - 6, 1, 3, '#bfefff'); R(g, hx + 1, hy - 7, 1, 4, '#e6faff'); }
        R(g, ex, ey, 1, 2, '#1a1420'); R(g, ex + 3, ey, 1, 2, '#1a1420'); px(g, ex, ey, '#fff'); px(g, ex + 3, ey, '#fff');
        if (p.glow) px(g, ex + 1, ey + 2, p.glow);
        px(g, ex - 1, ey + 2, sh(p.color, 0.45)); px(g, ex + 4, ey + 2, sh(p.color, 0.45));
        if (p.spots) for (let i = 0; i < 3; i++) px(g, 5 + i * 2, by - 1 + (i % 2), p.spots);
        R(g, 5, by + 3, 2, 1 + (f ? 0 : 1), col[1]); R(g, 9, by + 3, 2, 1 + (f ? 1 : 0), col[1]);
        return c;
      });
    },
  };
  Spr.GEN = GEN;

  /* get an enemy/creature sprite set by def (memoised). returns array of {r,l} */
  Spr.mob = function (def) {
    const key = 'M' + def.id;
    if (Spr.cache[key]) return Spr.cache[key];
    let frames;
    if (def.gen === 'humanoid') {
      const sheet = Spr.humanoid(def.look);
      frames = [{ r: sheet.right_walk_0, l: sheet.left_walk_0 }, { r: sheet.right_walk_1, l: sheet.left_walk_1 }, { r: sheet.right_walk_2, l: sheet.left_walk_2 }, { r: sheet.right_walk_3, l: sheet.left_walk_3 }];
      frames.atk = { r: sheet.right_attack_0, l: sheet.left_attack_0 };
    } else {
      frames = finishFrames(GEN[def.gen](def.look), def.look.scale || 1);
    }
    return (Spr.cache[key] = frames);
  };

  /* =========================================================
     BOSSES (large, drawn from the same primitives)
     ========================================================= */
  Spr.boss = function (id, f = 0) {
    const key = 'B' + id + f;
    if (Spr.cache[key]) return Spr.cache[key];
    let c, g;
    if (id === 'toad') {
      [c, g] = C(44, 34);
      const col = ['#1f3a1a', '#2f5e28', '#4a8a3a', '#7cc45a', '#b8e890'];
      blob(g, 22, 22 - f, 19, 11 + f, col);
      blob(g, 13, 11 - f, 6, 5, col); blob(g, 31, 11 - f, 6, 5, col);
      blob(g, 13, 10 - f, 3, 3, ['#e0c040', '#ffe880', '#fff']); blob(g, 31, 10 - f, 3, 3, ['#e0c040', '#ffe880', '#fff']);
      R(g, 13, 9 - f, 2, 3, '#120d18'); R(g, 31, 9 - f, 2, 3, '#120d18');
      R(g, 9, 24, 26, 2, '#8a2a3a'); R(g, 12, 26, 20, 1, '#5a1a2a');
      for (let i = 0; i < 9; i++) px(g, 8 + i * 3.5, 16 + (i % 3), '#2a4a22');
      for (let x = 8; x < 36; x++) px(g, x, 30, col[3]);
      R(g, 16, 0, 12, 4, '#e0a92e'); for (const x of [16, 21, 26]) R(g, x, -1 + 0, 2, 2, '#ffd75a'); px(g, 21, 2, '#c9323a');
      R(g, 4, 28, 6, 4, col[1]); R(g, 34, 28, 6, 4, col[1]);
    } else if (id === 'guardian') {
      [c, g] = C(64, 72);
      const bark = ['#1c1410', '#3a2a1e', '#5a4230', '#7a5c42', '#9a7a58'];
      for (let y = 30; y < 70; y++) { const w = 12 + (y > 60 ? (y - 60) * 1.2 : 0); for (let x = -w; x < w; x++) px(g, 32 + x, y, bark[x < -w / 2 ? 3 : x > w / 2 ? 1 : 2 + (U.hash2(x, y, 5) > 0.8 ? 1 : 0)]); }
      // arms
      for (let i = 0; i < 16; i++) { R(g, 18 - i, 36 + i * 0.6 - f * (i * 0.15), 4, 4, bark[2]); R(g, 42 + i, 36 + i * 0.6 - f * (i * 0.15), 4, 4, bark[1]); }
      blob(g, 3, 47 - f * 2, 4, 3, P.leaf); blob(g, 61, 47 - f * 2, 4, 3, P.leaf);
      // canopy crown
      for (const b of [[32, 18, 24, 14], [16, 24, 12, 9], [48, 24, 12, 9], [32, 8, 15, 8]]) blob(g, b[0], b[1], b[2], b[3], P.dleaf);
      for (let i = 0; i < 26; i++) px(g, 10 + ((i * 41) % 44), 6 + ((i * 17) % 26), i % 3 ? '#46a083' : '#9dffd0');
      // face
      R(g, 23, 40, 6, 4, '#0a0805'); R(g, 35, 40, 6, 4, '#0a0805'); R(g, 24, 41, 4, 2, '#7dffb0'); R(g, 36, 41, 4, 2, '#7dffb0');
      R(g, 26, 52, 12, 3, '#0a0805'); for (let x = 27; x < 37; x += 3) px(g, x, 52, '#9a7a58');
      for (let i = 0; i < 6; i++) px(g, 22 + i * 4, 34, '#7dffb0');
    } else if (id === 'colossus') {
      c = Art.outline(GEN.golem({ color: '#c4955a', size: 2.1, eye: '#ffd34d', cracks: '#7a4a20' })[f % 2]);
      return (Spr.cache[key] = c);
    } else if (id === 'titan') {
      c = Art.outline(GEN.golem({ color: '#3a2a26', size: 2.3, eye: '#ffef6a', cracks: '#ff6a1e' })[f % 2]);
      return (Spr.cache[key] = c);
    } else if (id === 'dragon') {
      [c, g] = C(80, 60);
      const col = ['#2d4c78', '#4b8ed0', '#8fd4ff', '#c8eeff', '#ffffff'];
      // wings
      const wy = f ? -6 : 4;
      for (const side of [-1, 1]) {
        g.fillStyle = col[1]; g.beginPath(); g.moveTo(40 + side * 6, 24); g.lineTo(40 + side * 38, 4 + wy); g.lineTo(40 + side * 34, 30 + wy * 0.5); g.lineTo(40 + side * 20, 32); g.closePath(); g.fill();
        g.strokeStyle = col[0]; g.lineWidth = 1; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(40 + side * 6, 24); g.lineTo(40 + side * (14 + k * 7), 26 + k * 2 - wy * 0.2); g.stroke(); }
        g.fillStyle = col[3]; g.fillRect(40 + side * 38 - (side > 0 ? 2 : 0), 3 + wy, 2, 2);
      }
      // tail
      for (let i = 0; i < 18; i++) blob(g, 40 + Math.sin(i * 0.35) * 6, 40 + i * 1.1, 4 - i * 0.18, 3 - i * 0.12, col);
      blob(g, 40, 30, 11, 13, col); for (let y = 24; y < 42; y += 3) R(g, 37, y, 6, 1, col[3]);
      blob(g, 40, 13, 7, 6, col); R(g, 37, 17, 6, 4, col[2]); R(g, 38, 20, 4, 1, col[1]);
      R(g, 33, 4, 2, 6, col[4]); R(g, 45, 4, 2, 6, col[4]); px(g, 33, 3, col[4]); px(g, 46, 3, col[4]);
      R(g, 36, 11, 2, 2, '#1a2a4a'); R(g, 42, 11, 2, 2, '#1a2a4a'); px(g, 36, 11, '#a8f0ff'); px(g, 42, 11, '#a8f0ff');
      for (let i = 0; i < 5; i++) R(g, 39, 18 + i * 4, 2, 2, col[4]);
    } else if (id === 'sovereign') {
      [c, g] = C(44, 60);
      // cape
      for (let y = 18; y < 58; y++) { const w = 10 + (y - 18) * 0.42; R(g, 22 - w, y, w * 2, 1, y % 4 === 0 ? '#2b1d45' : '#1e1530'); }
      const body = Spr.humanoid({ skin: '#7a6aa8', hair: 'long', hairColor: '#e8e0ff', eye: '#ff60ff', top: '#2b1d45', bottom: '#1e1530', accent: '#b892f0', outfit: 'robe', acc: 'none', crown: true, glow: '#ff70ff', scale: 2 });
      const fr = body['down_' + (f ? 'attack' : 'walk') + '_0'];
      g.drawImage(fr, 22 - fr.width / 2, 8);
      for (let i = 0; i < 6; i++) blob(g, 6 + i * 6.5, 6 + (i % 2) * 3 - f, 1.6, 1.6, ['#5b3d86', '#b892f0', '#f0e0ff']);
      return (Spr.cache[key] = Art.outline(c));
    }
    c = Art.outline(c);
    return (Spr.cache[key] = c);
  };

  /* player / npc preview helper */
  Spr.look = function (ap) {
    return {
      skin: P.skinTones[ap.skin] || P.skinTones[1], hair: Spr.HAIR[ap.hair] || 'short', hairColor: ap.hairColor, eye: ap.eye,
      top: ap.top, bottom: ap.bottom, accent: ap.accent, outfit: Spr.OUTFIT[ap.outfit] || 'adventurer', acc: Spr.ACC[ap.acc] || 'none', boots: '#4f321f',
    };
  };
})();
