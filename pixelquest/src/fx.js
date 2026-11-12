/* PIXEL QUEST — particles, floating text, transient lights and telegraphed hazards */
'use strict';
(function () {
  const U = PQ.U, Art = PQ.Art, T = PQ.T;
  const FX = { parts: [], texts: [], lights: [], hazards: [], budget: 1 };
  PQ.FX = FX;

  FX.clear = function () { FX.parts.length = 0; FX.texts.length = 0; FX.lights.length = 0; FX.hazards.length = 0; };

  /* ---------------- particles ---------------- */
  FX.burst = function (x, y, color, n = 8, o = {}) {
    n = Math.max(1, Math.round(n * FX.budget));
    for (let i = 0; i < n && FX.parts.length < 500; i++) {
      const a = o.ang != null ? o.ang + (Math.random() - 0.5) * (o.spread || 1) : Math.random() * Math.PI * 2;
      const s = (o.speed || 60) * (0.4 + Math.random() * 0.8);
      FX.parts.push({ x, y, z: o.z || 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: o.up != null ? o.up * (0.5 + Math.random()) : 40 + Math.random() * 50, life: (o.life || 0.5) * (0.6 + Math.random() * 0.6), max: 0, color: Array.isArray(color) ? U.pick(color) : color, size: o.size || 1, grav: o.grav != null ? o.grav : 160, glow: o.glow });
      FX.parts[FX.parts.length - 1].max = FX.parts[FX.parts.length - 1].life;
    }
  };
  FX.spark = (x, y, c) => FX.burst(x, y, c, 1, { speed: 10, up: 30, life: 0.8, grav: -20 });
  FX.dust = (x, y) => FX.burst(x, y, ['#d8c8a8', '#b8a888'], 3, { speed: 20, up: 15, life: 0.35, grav: 40 });
  FX.update = function (dt) {
    const P = FX.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life -= dt;
      if (p.life <= 0) { P[i] = P[P.length - 1]; P.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= p.grav * dt; p.z += p.vz * dt;
      if (p.z < 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.6; p.vy *= 0.6; }
      p.vx *= 1 - dt * 2; p.vy *= 1 - dt * 2;
    }
    for (let i = FX.texts.length - 1; i >= 0; i--) { const t = FX.texts[i]; t.life -= dt; t.y -= 18 * dt * (t.life / t.max + 0.3); if (t.life <= 0) FX.texts.splice(i, 1); }
    for (let i = FX.lights.length - 1; i >= 0; i--) { const l = FX.lights[i]; l[4] -= dt; if (l[4] <= 0) FX.lights.splice(i, 1); }
    // hazards
    const G = PQ.G;
    for (let i = FX.hazards.length - 1; i >= 0; i--) {
      const h = FX.hazards[i];
      h.t += dt;
      if (h.follow && h.t < h.delay) { h.x = G.player.x; h.y = G.player.y; }
      if (!h.fired && h.t >= h.delay) { h.fired = true; FX.fireHazard(h); }
      if (h.fired && h.persist && h.t < h.delay + h.persist) {
        h.tick = (h.tick || 0) + dt;
        if (h.tick > 0.5) { h.tick = 0; if (FX.inHazard(h, G.player.x, G.player.y)) G.hurtPlayer(h.dmg * 0.4, h.status, h.x, h.y, true); }
        if (Math.random() < 0.3) FX.burst(h.x + (Math.random() - 0.5) * h.r * 1.6, h.y + (Math.random() - 0.5) * h.r, h.color, 1, { speed: 8, up: 30, life: 0.6, grav: -10 });
      }
      if (h.t > h.delay + (h.persist || 0.25)) FX.hazards.splice(i, 1);
    }
  };
  FX.draw = function (g, ox, oy) {
    for (const p of FX.parts) {
      const a = Math.min(1, p.life / p.max * 1.5);
      g.globalAlpha = a; g.fillStyle = p.color;
      g.fillRect(Math.round(p.x - ox), Math.round(p.y - oy - p.z), p.size, p.size);
    }
    g.globalAlpha = 1;
  };
  FX.drawHazards = function (g, ox, oy) {
    for (const h of FX.hazards) {
      const pre = h.t < h.delay;
      const k = pre ? h.t / h.delay : 1;
      const a = pre ? 0.18 + 0.25 * k : Math.max(0, 0.6 - (h.t - h.delay) * 2.4);
      g.save();
      g.translate(Math.round(h.x - ox), Math.round(h.y - oy));
      g.fillStyle = h.persist && !pre ? h.color : '#ff3a3a';
      g.strokeStyle = pre ? '#ffd0d0' : h.color;
      g.globalAlpha = h.persist && !pre ? 0.35 : a;
      g.lineWidth = 1;
      if (h.kind === 'circle' || h.kind === 'ring') {
        g.beginPath(); g.ellipse(0, 0, h.r, h.r * 0.7, 0, 0, Math.PI * 2); g.fill();
        g.globalAlpha = Math.min(1, a + 0.3); g.beginPath(); g.ellipse(0, 0, h.r * (pre ? k : 1), h.r * 0.7 * (pre ? k : 1), 0, 0, Math.PI * 2); g.stroke();
      } else if (h.kind === 'line') {
        g.rotate(h.ang); g.fillRect(0, -h.w / 2, h.len * (pre ? 1 : 1), h.w);
        g.globalAlpha = Math.min(1, a + 0.3); g.strokeRect(0, -h.w / 2, h.len * k, h.w);
      } else if (h.kind === 'cone') {
        g.rotate(h.ang); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, h.r, -h.arc / 2, h.arc / 2); g.closePath(); g.fill();
        g.globalAlpha = Math.min(1, a + 0.3); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, h.r * k, -h.arc / 2, h.arc / 2); g.closePath(); g.stroke();
      }
      g.restore();
    }
  };
  FX.drawText = function (g) {
    const ox = PQ.Render.ox, oy = PQ.Render.oy;
    for (const t of FX.texts) {
      const a = Math.min(1, t.life / t.max * 2.5);
      g.globalAlpha = a;
      PQ.Font.draw(g, t.s, t.x - ox, t.y - oy, t.color, t.big ? 2 : 1, 'center', '#120d18');
    }
    g.globalAlpha = 1;
  };
  FX.text = function (x, y, s, color = '#fff', big = false, life = 0.9) {
    if (FX.texts.length > 40) FX.texts.shift();
    FX.texts.push({ x: x + (Math.random() - 0.5) * 6, y, s: String(s), color, big, life, max: life });
  };
  FX.light = (x, y, r, a = 1, life = 0.2) => FX.lights.push([x, y, r, a, life]);

  /* ---------------- telegraphed hazards ---------------- */
  // {kind:'circle'|'line'|'cone', x,y, r, ang, len, w, arc, delay, dmg, status, persist, color, owner, fx}
  FX.hazard = function (o) {
    const h = Object.assign({ t: 0, delay: 0.8, dmg: 10, color: '#ff6a3a', r: 24 }, o);
    FX.hazards.push(h);
    return h;
  };
  FX.inHazard = function (h, x, y) {
    if (h.kind === 'circle' || h.kind === 'ring') { const dx = x - h.x, dy = (y - h.y) / 0.7; return dx * dx + dy * dy <= h.r * h.r; }
    const dx = x - h.x, dy = y - h.y;
    if (h.kind === 'line') { const c = Math.cos(-h.ang), s = Math.sin(-h.ang); const lx = dx * c - dy * s, ly = dx * s + dy * c; return lx >= 0 && lx <= h.len && Math.abs(ly) <= h.w / 2 + 3; }
    if (h.kind === 'cone') { const d = Math.hypot(dx, dy); if (d > h.r) return false; return Math.abs(U.angDiff(h.ang, Math.atan2(dy, dx))) <= h.arc / 2; }
    return false;
  };
  FX.fireHazard = function (h) {
    const G = PQ.G;
    if (h.onFire) h.onFire(h);
    const col = h.color;
    if (h.kind === 'circle' || h.kind === 'ring') FX.burst(h.x, h.y, [col, '#ffffff', PQ.U.shade(col, 0.3)], 14, { speed: h.r * 3, up: 60, life: 0.5 });
    else if (h.kind === 'line') { for (let i = 0; i < h.len; i += 10) FX.burst(h.x + Math.cos(h.ang) * i, h.y + Math.sin(h.ang) * i, col, 2, { speed: 30, up: 50, life: 0.4 }); }
    else FX.burst(h.x + Math.cos(h.ang) * h.r * 0.5, h.y + Math.sin(h.ang) * h.r * 0.5, col, 16, { speed: h.r * 2, ang: h.ang, spread: h.arc, life: 0.5 });
    if (h.shake) PQ.Render.shake = Math.max(PQ.Render.shake, h.shake);
    if (h.sfx) PQ.Audio.play(h.sfx);
    if (h.friendly) { for (const e of G.ents) if (e.isEnemy && !e.dead && FX.inHazard(h, e.x, e.y)) G.damageEnemy(e, h.dmg, { el: h.el, kb: 60, fx: h.x, fy: h.y, freeze: h.freeze }); return; }
    const p = G.player;
    if (FX.inHazard(h, p.x, p.y)) G.hurtPlayer(h.dmg, h.status, h.x, h.y);
  };
})();
