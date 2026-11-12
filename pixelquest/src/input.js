/* PIXEL QUEST — input: keyboard, mouse aiming, touch joystick and buttons */
'use strict';
(function () {
  const I = { keys: new Set(), pressed: new Set(), held: new Set(), mouse: { x: 0, y: 0, moved: -9, down: false }, stick: { id: null, x: 0, y: 0, ox: 0, oy: 0 }, touchMode: false, enabled: false };
  PQ.Input = I;
  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    Space: 'dodge', KeyE: 'interact', Enter: 'interact', KeyJ: 'attack', KeyK: 'dodge', KeyQ: 'ability', KeyF: 'ability', ShiftLeft: 'run', ShiftRight: 'run',
    Digit1: 'q0', Digit2: 'q1', Digit3: 'q2', Digit4: 'q3', KeyI: 'bag', KeyB: 'bag', KeyM: 'map', KeyC: 'skills', KeyL: 'quests', KeyP: 'creatures', Escape: 'esc', Tab: 'menu',
  };
  const ONE_SHOT = ['dodge', 'interact', 'ability', 'q0', 'q1', 'q2', 'q3', 'bag', 'map', 'skills', 'quests', 'creatures', 'esc', 'menu'];

  I.init = function (canvas) {
    I.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const a = KEYMAP[e.code];
      if (!a) return;
      e.preventDefault();
      I.touchMode = false; document.body.classList.remove('touch');
      if (e.repeat) return;
      I.held.add(a); I.pressed.add(a);
      PQ.Audio.init();
      if (['bag', 'map', 'skills', 'quests', 'creatures', 'esc', 'menu'].includes(a)) PQ.UI.hotkey(a);
    }, { passive: false });
    window.addEventListener('keyup', (e) => { const a = KEYMAP[e.code]; if (a) I.held.delete(a); });
    window.addEventListener('blur', () => { I.held.clear(); });
    canvas.addEventListener('mousemove', (e) => { I.mouse.x = e.clientX; I.mouse.y = e.clientY; I.mouse.moved = performance.now(); });
    canvas.addEventListener('mousedown', (e) => {
      if (I.touchMode) return;
      PQ.Audio.init();
      I.mouse.x = e.clientX; I.mouse.y = e.clientY; I.mouse.moved = performance.now();
      if (e.button === 0) { I.held.add('attack'); I.pressed.add('attack'); }
      if (e.button === 2) { I.pressed.add('dodge'); }
      e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) I.held.delete('attack'); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // touch
    const tl = document.getElementById('touch');
    tl.addEventListener('pointerdown', onDown, { passive: false });
    tl.addEventListener('pointermove', onMove, { passive: false });
    tl.addEventListener('pointerup', onUp);
    tl.addEventListener('pointercancel', onUp);
    window.addEventListener('touchstart', () => { if (!I.touchMode) { I.touchMode = true; document.body.classList.add('touch'); } }, { passive: true });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    I.touchMode = matchMedia('(pointer: coarse)').matches;
    document.body.classList.toggle('touch', I.touchMode);
    I.applyLayout();
  };
  I.applyLayout = function () {
    const tl = document.getElementById('touch'); if (!tl) return;
    tl.style.setProperty('--ts', PQ.Settings.touchScale);
    tl.classList.toggle('lefty', !!PQ.Settings.lefty);
  };

  function btn(el) { while (el && el !== document.body) { if (el.dataset && el.dataset.b) return el; el = el.parentElement; } return null; }
  function onDown(e) {
    e.preventDefault();
    PQ.Audio.init();
    I.touchMode = true; document.body.classList.add('touch');
    const b = btn(e.target);
    if (b) {
      const a = b.dataset.b;
      b.classList.add('down'); b._pid = e.pointerId;
      try { b.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      if (['bag', 'map', 'menu'].includes(a)) { PQ.UI.hotkey(a); return; }
      I.held.add(a); I.pressed.add(a);
      if (navigator.vibrate && PQ.Settings.vibrate) { try { navigator.vibrate(6); } catch (er) { /* */ } }
      return;
    }
    const left = PQ.Settings.lefty ? e.clientX > window.innerWidth * 0.5 : e.clientX < window.innerWidth * 0.5;
    if (left && I.stick.id == null) {
      I.stick.id = e.pointerId; I.stick.ox = e.clientX; I.stick.oy = e.clientY; I.stick.x = 0; I.stick.y = 0;
      const s = document.getElementById('stick'); s.hidden = false; s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px';
      document.getElementById('knob').style.transform = 'translate(-50%,-50%)';
    }
  }
  function onMove(e) {
    if (e.pointerId !== I.stick.id) return;
    e.preventDefault();
    const R = 48 * PQ.Settings.touchScale;
    let dx = e.clientX - I.stick.ox, dy = e.clientY - I.stick.oy;
    const d = Math.hypot(dx, dy);
    if (d > R * 1.3) { const k = (d - R * 1.3) / d; I.stick.ox += dx * k; I.stick.oy += dy * k; dx = e.clientX - I.stick.ox; dy = e.clientY - I.stick.oy; const s = document.getElementById('stick'); s.style.left = I.stick.ox + 'px'; s.style.top = I.stick.oy + 'px'; }
    const m = Math.min(1, Math.hypot(dx, dy) / R);
    const a = Math.atan2(dy, dx);
    I.stick.x = m < 0.12 ? 0 : Math.cos(a) * m; I.stick.y = m < 0.12 ? 0 : Math.sin(a) * m;
    const kx = Math.cos(a) * Math.min(d, R), ky = Math.sin(a) * Math.min(d, R);
    document.getElementById('knob').style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
  }
  function onUp(e) {
    if (e.pointerId === I.stick.id) { I.stick.id = null; I.stick.x = 0; I.stick.y = 0; document.getElementById('stick').hidden = true; }
    document.querySelectorAll('#touch [data-b]').forEach((b) => { if (b._pid === e.pointerId) { b.classList.remove('down'); b._pid = null; I.held.delete(b.dataset.b); } });
  }

  /* per-frame snapshot */
  I.sample = function () {
    let mx = 0, my = 0;
    if (I.held.has('left')) mx -= 1; if (I.held.has('right')) mx += 1; if (I.held.has('up')) my -= 1; if (I.held.has('down')) my += 1;
    const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
    if (I.stick.id != null) { mx = I.stick.x; my = I.stick.y; }
    let aim = null;
    const G = PQ.G;
    if (!I.touchMode && performance.now() - I.mouse.moved < 4000 && G.player) {
      const R = PQ.Render, rect = I.canvas.getBoundingClientRect();
      const sx = (G.player.x - R.ox) * R.css, sy = (G.player.y - 8 - R.oy) * R.css;
      aim = Math.atan2(I.mouse.y - rect.top - sy, I.mouse.x - rect.left - sx);
    }
    const press = {}, hold = {};
    for (const a of I.pressed) press[a] = true;
    for (const a of I.held) hold[a] = true;
    I.pressed.clear();
    for (const a of ONE_SHOT) if (a !== 'interact') I.held.delete(a);
    return { mx, my, aim, autoAim: I.touchMode || aim == null, run: hold.run, touch: I.touchMode, press, hold };
  };
  I.clear = function () { I.pressed.clear(); I.held.clear(); I.stick.id = null; I.stick.x = I.stick.y = 0; const s = document.getElementById('stick'); if (s) s.hidden = true; document.querySelectorAll('#touch .down').forEach((b) => b.classList.remove('down')); };
})();
