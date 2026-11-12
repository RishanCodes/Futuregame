/* PIXEL QUEST — canvas HUD and animated title scene */
'use strict';
(function () {
  const F = PQ.Font, Art = PQ.Art, U = PQ.U, D = PQ.D, T = PQ.T;
  const HUD = {};
  PQ.HUD = HUD;
  const OUT = '#120d18';

  function frame(g, x, y, w, h) {
    g.fillStyle = OUT; g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle = '#e8c070'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = '#241f3a'; g.fillRect(x, y, w, h);
  }
  HUD.frame = frame;
  function bar(g, x, y, w, h, k, c1, c2, label) {
    g.fillStyle = OUT; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = '#3a3048'; g.fillRect(x, y, w, h);
    const fw = Math.round(w * U.clamp(k, 0, 1));
    g.fillStyle = c1; g.fillRect(x, y, fw, h);
    g.fillStyle = c2; g.fillRect(x, y, fw, 1);
    if (label) F.draw(g, label, x + w + 4, y + h / 2 - 4, '#f2ead8', 1, 'left', OUT);
  }
  const icon = (id) => Art.icon(D.ITEMS[id]);

  HUD.draw = function (g, G, dt) {
    const vw = PQ.Render.vw, vh = PQ.Render.vh, s = G.save, st = G.stats, t = G.t;
    const touch = PQ.Input.touchMode;
    // vignettes
    if (s.hp < st.maxHp * 0.25) { const a = 0.18 + Math.sin(t * 5) * 0.08; const gr = g.createRadialGradient(vw / 2, vh / 2, vh * 0.3, vw / 2, vh / 2, vh * 0.8); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(200,20,40,${a})`); g.fillStyle = gr; g.fillRect(0, 0, vw, vh); }
    if (G.cold) { const gr = g.createRadialGradient(vw / 2, vh / 2, vh * 0.25, vw / 2, vh / 2, vh * 0.8); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(170,220,255,0.35)'); g.fillStyle = gr; g.fillRect(0, 0, vw, vh); }
    // ---- vitals ----
    let x = 6, y = 6;
    frame(g, x, y, 92, 41);
    F.draw(g, 'Lv ' + s.lvl, x + 3, y + 2, '#ffd75a', 1, 'left');
    bar(g, x + 28, y + 5, 60, 2, s.xp / G.xpNext(s.lvl), '#b892f0', '#e6d0ff');
    bar(g, x + 3, y + 12, 60, 5, s.hp / st.maxHp, '#e8363c', '#ff9a9a');
    bar(g, x + 3, y + 21, 60, 4, s.mp / st.maxMp, '#3f7fe0', '#a8c8ff');
    bar(g, x + 3, y + 29, 60, 4, s.sta / st.maxSta, '#4cbc4a', '#a8f0a0');
    F.draw(g, Math.ceil(s.hp) + '', x + 66, y + 11, '#ffc8c8', 1, 'left');
    F.draw(g, Math.floor(s.mp) + '', x + 66, y + 19, '#c8d8ff', 1, 'left');
    F.draw(g, Math.floor(s.sta) + '', x + 66, y + 27, '#c8f0c8', 1, 'left');
    // gold
    const coin = Art.S.coin || (Art.S.coin = Art.icon({ id: '__coin', icon: 'coin' }));
    g.drawImage(coin, x - 1, y + 43, 10, 10);
    F.draw(g, U.fmt(s.gold), x + 11, y + 44, '#ffd75a', 1, 'left', OUT);
    // buffs & status
    let bx = x + 11 + F.width(U.fmt(s.gold)) + 8;
    const tags = [];
    for (const k in s.buffs) tags.push([{ might: 'MIGHT', swift: 'SWIFT', fireres: 'FIRE RES', iceres: 'FROST RES', regen: 'REGEN', stamina: 'STAMINA' }[k] || k, '#9dffd0', s.buffs[k]]);
    const pst = G.player.status;
    if (pst.poison > 0) tags.push(['POISON', '#b06aff']); if (pst.burn > 0) tags.push(['BURN', '#ff9a2e']); if (pst.chill > 0) tags.push(['CHILL', '#a8e8ff']);
    if (G.cold) tags.push(['FREEZING', '#a8e8ff']);
    for (const [n, c, left] of tags) { F.draw(g, n + (left ? ' ' + Math.ceil(left) : ''), bx, y + 44, c, 1, 'left', OUT); bx += F.width(n + (left ? ' ' + Math.ceil(left) : '')) + 6; }
    // ---- minimap ----
    const MM = touch ? 52 : 60;
    const mx = vw - MM - 7, my = 6;
    frame(g, mx, my, MM, MM);
    HUD.minimap(g, G, mx, my, MM);
    F.draw(g, PQ.Time.str(), mx + MM / 2, my + MM + 4, '#f2ead8', 1, 'center', OUT);
    const w = PQ.Weather.cur();
    const label = G.map.kind === 'overworld' ? (D.REGIONS[G.region] ? D.REGIONS[G.region].name : '') : G.map.name;
    F.draw(g, label, mx + MM / 2, my + MM + 14, '#ffd75a', 1, 'center', OUT);
    if (w !== 'clear' && G.map.kind === 'overworld') F.draw(g, w[0].toUpperCase() + w.slice(1), mx + MM / 2, my + MM + 24, '#a8c8ff', 1, 'center', OUT);
    if (G.map.kind === 'dungeon') { const k = s.keys[G.map.id]; if (k && (k.key || k.boss)) F.draw(g, (k.key ? 'Keys ' + k.key : '') + (k.boss ? (k.key ? ' + ' : '') + 'BOSS KEY' : ''), mx + MM / 2, my + MM + 24, '#ffd75a', 1, 'center', OUT); }
    // ---- quest tracker / boss bar ----
    const cx = Math.round(vw / 2);
    if (G.bossFight && !G.bossFight.dead) {
      const b = G.bossFight, bw = Math.min(200, vw - 220);
      F.draw(g, b.B.name, cx, 6, '#ffd75a', 1, 'center', OUT);
      bar(g, cx - bw / 2, 16, bw, 5, b.hp / b.maxHp, b.phase === 2 ? '#ff4f7a' : '#e8363c', '#ffb0b0');
      if (b.phase === 2) F.draw(g, 'ENRAGED', cx, 24, '#ff4f7a', 1, 'center', OUT);
    } else {
      const q = PQ.Quests.tracked();
      if (q) {
        const tw = Math.min(vw - 230, 220);
        const obj = PQ.Quests.currentObj(q);
        const lines = HUD.wrap(obj, tw);
        g.globalAlpha = 0.75; g.fillStyle = OUT; g.fillRect(cx - tw / 2 - 4, 4, tw + 8, 13 + lines.length * 9); g.globalAlpha = 1;
        F.draw(g, (q.main ? '* ' : '') + q.name, cx, 6, q.main ? '#ffd75a' : '#7ef0ff', 1, 'center');
        lines.forEach((l, i) => F.draw(g, l, cx, 16 + i * 9, '#f2ead8', 1, 'center'));
      }
    }
    // ---- interact prompt / hotbar (desktop) ----
    const lbl = G.contextLabel();
    if (!touch) {
      const hb = 4, sz = 18, gap = 3, totalW = (hb + 1) * (sz + gap) + 4;
      let hx = Math.round(cx - totalW / 2), hy = vh - sz - 8;
      for (let i = 0; i < hb; i++) {
        frame(g, hx, hy, sz, sz);
        const id = s.hot[i];
        if (id) { const n = PQ.Inv.count(s, id); if (!n) g.globalAlpha = 0.3; g.drawImage(icon(id), hx + 1, hy + 1); g.globalAlpha = 1; if (n > 1) F.draw(g, n > 99 ? '99' : '' + n, hx + sz - 1, hy + sz - 8, '#fff', 1, 'right', OUT); }
        F.draw(g, '' + (i + 1), hx + 1, hy + 1, '#ffd75a', 1, 'left', OUT);
        hx += sz + gap;
      }
      hx += 4;
      frame(g, hx, hy, sz, sz);
      if (s.ability) {
        const sk = PQ.Skills.def(s.ability);
        F.draw(g, sk.name.slice(0, 2).toUpperCase(), hx + sz / 2, hy + 5, D.TREES[sk.tree].color, 1, 'center');
        const p = G.player; if (p.cd > 0) { g.globalAlpha = 0.65; g.fillStyle = OUT; g.fillRect(hx, hy + sz * (1 - p.cd / (p.cdMax || 1)), sz, sz * (p.cd / (p.cdMax || 1))); g.globalAlpha = 1; F.draw(g, Math.ceil(p.cd) + '', hx + sz / 2, hy + 5, '#fff', 1, 'center', OUT); }
      } else F.draw(g, '-', hx + sz / 2, hy + 5, '#888', 1, 'center');
      F.draw(g, 'Q', hx + 1, hy + 1, '#ffd75a', 1, 'left', OUT);
      if (lbl) F.draw(g, 'E  ' + lbl, cx, hy - 13, '#ffffff', 1, 'center', OUT);
    }
    // weapon & ammo (small, under vitals)
    const wi = st.weaponItem;
    if (wi) { const ix = 6, iy = 62; g.drawImage(Art.icon(wi), ix, iy); if (wi.wclass === 'bow') F.draw(g, 'x' + PQ.Inv.count(s, 'arrow'), ix + 18, iy + 4, '#f2ead8', 1, 'left', OUT); }
    // fishing ui
    PQ.Fishing.drawUI(g, vw, vh);
    // fps
    if (PQ.Settings.fps) F.draw(g, PQ.Main.fps + ' fps', vw - 4, vh - 10, '#5fdc6a', 1, 'right', OUT);
    // touch interact label
    if (touch && HUD._css !== PQ.Render.css) { HUD._css = PQ.Render.css; document.body.style.setProperty('--hudb', Math.round(82 * PQ.Render.css + 6) + 'px'); }
    if (touch) { const b = document.getElementById('bInteract'); if (b) { const txt = lbl || 'Use'; if (b._l !== txt) { b._l = txt; b.querySelector('span').textContent = txt; } b.classList.toggle('dim', !lbl); } const ab = document.getElementById('bAbility'); if (ab) { const p = G.player; ab.style.setProperty('--cd', p.cd > 0 ? (p.cd / (p.cdMax || 1)).toFixed(3) : 0); const nm = s.ability ? PQ.Skills.def(s.ability).name.split(' ')[0] : 'Skill'; if (ab._l !== nm) { ab._l = nm; ab.querySelector('span').textContent = nm; } } PQ.UI.updateTouchHot(); }
  };

  HUD.wrap = function (text, w) {
    const words = String(text).split(' '); const lines = []; let cur = '';
    for (const wd of words) { const tt = cur ? cur + ' ' + wd : wd; if (F.width(tt) > w && cur) { lines.push(cur); cur = wd; } else cur = tt; }
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  };

  HUD.minimap = function (g, G, x, y, S) {
    const m = G.map, p = G.player;
    const img = PQ.Render.mapImage(m), fog = G.fogs[m.id];
    const ptx = p.x / T, pty = p.y / T;
    const sx = Math.round(U.clamp(ptx - S / 2, 0, Math.max(0, m.w - S))), sy = Math.round(U.clamp(pty - S / 2, 0, Math.max(0, m.h - S)));
    g.save(); g.beginPath(); g.rect(x, y, S, S); g.clip();
    g.fillStyle = '#05030a'; g.fillRect(x, y, S, S);
    g.drawImage(img, sx, sy, S, S, x, y, S, S);
    if (fog) g.drawImage(PQ.Render.fogImage(m, fog), sx, sy, S, S, x, y, S, S);
    // markers
    const mark = (tx, ty, c, sz = 2) => { const px = x + tx - sx, py = y + ty - sy; if (px < x || py < y || px > x + S || py > y + S) return; g.fillStyle = OUT; g.fillRect(px - 1, py - 1, sz + 2, sz + 2); g.fillStyle = c; g.fillRect(px, py, sz, sz); };
    for (const o of m.objs) {
      if (o.k === 'waypoint') mark(o.x, o.y, G.save.waypoints[o.wid] ? '#7ef0ff' : '#5a6a7a');
      else if (o.k === 'entrance') mark(o.x + 1, o.y, '#ff6a4a');
      else if (o.k === 'chest' && !o.opened && G.companion && G.companion.def.role === 'seeker' && Math.hypot(o.x - ptx, o.y - pty) < 14) mark(o.x, o.y, '#ffd75a');
    }
    for (const e of G.ents) { if (e.isNPC) mark(Math.floor(e.x / T), Math.floor(e.y / T), '#7ef0ff', 1); else if (e.isBoss) mark(Math.floor(e.x / T), Math.floor(e.y / T), '#ff4f7a', 3); }
    const q = PQ.Quests.tracked();
    if (q && q.mark && m.spots[q.mark] && Math.floor(G.t * 2) % 2) mark(m.spots[q.mark].x, m.spots[q.mark].y, '#ffd75a', 3);
    g.restore();
    const px = x + ptx - sx, py = y + pty - sy;
    g.fillStyle = '#ffffff'; g.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3); g.fillStyle = '#e8363c'; g.fillRect(Math.round(px), Math.round(py), 1, 1);
    // edge arrow to the tracked quest target
    if (q && q.mark && m.spots[q.mark]) {
      const tx = m.spots[q.mark].x, ty = m.spots[q.mark].y;
      if (tx < sx || ty < sy || tx > sx + S || ty > sy + S) {
        const a = Math.atan2(ty - pty, tx - ptx);
        const ax = x + S / 2 + Math.cos(a) * (S / 2 - 3), ay = y + S / 2 + Math.sin(a) * (S / 2 - 3);
        g.fillStyle = '#ffd75a'; g.fillRect(Math.round(ax) - 1, Math.round(ay) - 1, 3, 3);
      }
    }
  };

  /* ---------------- animated title scene ---------------- */
  const Title = (PQ.Title = { t: 0 });
  Title.draw = function (dt) {
    const R = PQ.Render, g = R.g, vw = R.vw, vh = R.vh;
    Title.t += dt;
    const t = Title.t;
    const day = (Math.sin(t * 0.06) + 1) / 2; // 0 night .. 1 day
    const sky = [U.mix('#0b0f2a', '#4f8fd8', day), U.mix('#2a2050', '#a8d8f0', day), U.mix('#5a3a6a', '#ffd8a8', day)];
    for (let i = 0; i < vh; i += 4) { const k = i / vh; g.fillStyle = k < 0.5 ? U.mix(sky[0], sky[1], k * 2) : U.mix(sky[1], sky[2], (k - 0.5) * 2); g.fillRect(0, i, vw, 4); }
    // stars
    if (day < 0.5) { g.fillStyle = `rgba(255,255,255,${(0.5 - day) * 2})`; for (let i = 0; i < 70; i++) { const x = (i * 97) % vw, y = (i * 53) % (vh * 0.55); if ((i + Math.floor(t * 2)) % 9) g.fillRect(x, y, 1, 1); } }
    // sun / moon
    const sa = t * 0.06 + Math.PI / 2;
    const sx = vw / 2 + Math.cos(sa) * vw * 0.4, sy = vh * 0.7 - Math.abs(Math.sin(sa)) * vh * 0.55;
    const so = Art.glowSprite(32, day > 0.5 ? 'rgba(255,240,180,0.9)' : 'rgba(220,230,255,0.8)');
    g.drawImage(so, sx - 24, sy - 24, 48, 48); g.fillStyle = day > 0.5 ? '#fff3c0' : '#e8ecff'; g.beginPath(); g.arc(sx, sy, 7, 0, 6.28); g.fill();
    // clouds
    for (let i = 0; i < 6; i++) { const cx = ((i * 140 + t * (6 + i * 2)) % (vw + 160)) - 80, cy = 20 + (i * 37) % (vh * 0.35); g.fillStyle = `rgba(255,255,255,${0.35 + day * 0.4})`; for (const [dx, dy, r] of [[0, 0, 10], [12, -4, 12], [26, 0, 9], [14, 4, 10]]) { g.beginPath(); g.arc(cx + dx, cy + dy, r, 0, 6.28); g.fill(); } }
    // mountain layers
    const layer = (base, amp, col, seed, speed) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, vh); for (let x = 0; x <= vw; x += 4) { const wx = x + t * speed; const h = base + Math.sin(wx * 0.013 + seed) * amp + Math.sin(wx * 0.037 + seed * 2) * amp * 0.4; g.lineTo(x, h); } g.lineTo(vw, vh); g.fill(); };
    layer(vh * 0.55, 20, U.mix('#1e1a3a', '#7a8ab8', day), 1, 2);
    // snow caps hint
    layer(vh * 0.64, 14, U.mix('#18263a', '#4f7a6a', day), 3, 5);
    layer(vh * 0.74, 10, U.mix('#14301f', '#3b8a37', day), 5, 9);
    // tree line on the nearest hill
    const tree = Art.S.titleTree || (Art.S.titleTree = Art.makeTree('pine', 1));
    const oak = Art.S.titleOak || (Art.S.titleOak = Art.makeTree('oak', 2));
    for (let i = 0; i < 14; i++) { const x = ((i * 61 - t * 14) % (vw + 60) + vw + 60) % (vw + 60) - 30; const base = vh * 0.74 + Math.sin((x + t * 9) * 0.013 + 5) * 10; const s = i % 3 === 0 ? oak : tree; g.drawImage(s, Math.round(x), Math.round(base - s.height + 6)); }
    // foreground meadow
    g.fillStyle = U.mix('#0f2418', '#43893d', day); g.fillRect(0, vh * 0.86, vw, vh);
    for (let i = 0; i < 40; i++) { const x = ((i * 23 - t * 22) % vw + vw) % vw, y = vh * 0.88 + (i * 13) % (vh * 0.1); g.fillStyle = ['#ff70b0', '#ffd75a', '#ffffff', '#8a9cff'][i % 4]; g.fillRect(Math.round(x), Math.round(y), 2, 2); }
    // fireflies at night
    if (day < 0.6) for (let i = 0; i < 18; i++) { const x = (i * 71 + Math.sin(t + i) * 20) % vw, y = vh * 0.6 + Math.sin(t * 0.7 + i * 2) * 30 + (i * 17) % 40; g.fillStyle = 'rgba(220,255,160,' + (0.5 + Math.sin(t * 3 + i) * 0.5) + ')'; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
    // hero walking
    if (Title.look) { const sh = PQ.Spr.humanoid(PQ.Spr.look(Title.look)); const fr = PQ.Spr.frame(sh, 'right', 'walk', t); g.drawImage(fr, Math.round(vw * 0.18), Math.round(vh * 0.86 - fr.height + 3)); }
    // logo
    const sc = Math.max(2, Math.min(6, Math.floor(vw / 110), Math.floor(vh / 70)));
    const ly = Math.round(vh * 0.12);
    const title = 'PIXEL QUEST';
    F.draw(g, title, vw / 2 + sc, ly + sc, '#120d18', sc, 'center');
    F.draw(g, title, vw / 2, ly - sc * 0, '#5a2a10', sc, 'center');
    F.draw(g, title, vw / 2, ly - sc, '#ffd75a', sc, 'center');
    const sub = 'ULTIMATE RPG';
    const sc2 = Math.max(1, Math.floor(sc / 2));
    F.draw(g, sub, vw / 2, ly + sc * 9, '#f2ead8', sc2, 'center', '#120d18');
    R.present();
  };
})();
