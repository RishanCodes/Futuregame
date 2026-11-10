/* SHATTERPOINT — keyboard, mouse and touch input, remapping, touch layout */
'use strict';
(function () {
  const U = SP.U;
  const ACTIONS_PRESS = ['light', 'heavy', 'jump', 'dodge', 'skill', 'ab0', 'ab1', 'mom', 'lock', 'pause'];
  const I = {
    keys: new Set(), pressed: [], camDX: 0, camDY: 0, zoom: 0,
    active: false, locked: false, touchMode: false,
    stick: { x: 0, y: 0, id: null, ox: 0, oy: 0 },
    camTouch: { id: null, x: 0, y: 0 },
    touchBlock: false, remapCb: null, editLayout: false,
    lastInput: 'kb',
  };
  SP.Input = I;

  const KEY_NAMES = { Space: 'Space', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', Tab: 'Tab', Mouse0: 'L-Click', Mouse1: 'M-Click', Mouse2: 'R-Click', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Escape: 'Esc' };
  I.keyName = (code) => KEY_NAMES[code] || (code || '').replace(/^Key/, '').replace(/^Digit/, '');
  I.bind = (a) => SP.Save.data.keybinds[a];
  I.actionFor = (code) => { const kb = SP.Save.data.keybinds; for (const a in kb) if (kb[a] === code) return a; return null; };

  I.init = function (canvas) {
    I.canvas = canvas;
    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { I.keys.clear(); I.touchBlock = false; });
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { if (I.active) { I.zoom += Math.sign(e.deltaY); e.preventDefault(); } }, { passive: false });
    document.addEventListener('pointerlockchange', () => {
      const was = I.locked;
      I.locked = document.pointerLockElement === canvas;
      if (was && !I.locked && I.active && SP.Game.state === 'playing' && !I.suppressPauseOnUnlock) SP.Game.pause();
      I.suppressPauseOnUnlock = false;
    });
    // touch zone handlers
    const tz = document.getElementById('touch');
    tz.addEventListener('pointerdown', onTouchDown, { passive: false });
    tz.addEventListener('pointermove', onTouchMove, { passive: false });
    tz.addEventListener('pointerup', onTouchUp);
    tz.addEventListener('pointercancel', onTouchUp);
    window.addEventListener('touchstart', () => { if (SP.Save.data.settings.touch === 'auto' && !I.touchMode) { I.touchMode = true; SP.Bus.emit('touchMode'); } }, { passive: true });
    I.touchMode = SP.Save.data.settings.touch === 'on' || (SP.Save.data.settings.touch === 'auto' && SP.G.isMobile);
    I.applyTouchLayout();
  };

  function onKeyDown(e) {
    if (I.remapCb) {
      e.preventDefault();
      if (e.code === 'Escape') { const cb = I.remapCb; I.remapCb = null; cb(null); return; }
      const cb = I.remapCb; I.remapCb = null; cb(e.code); return;
    }
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.code === 'Escape' && SP.Game.state === 'playing') { SP.Game.pause(); e.preventDefault(); return; }
    if (!I.active) return;
    I.lastInput = 'kb';
    const a = I.actionFor(e.code);
    if (a) e.preventDefault();
    if (e.repeat) return;
    I.keys.add(e.code);
    if (a && ACTIONS_PRESS.includes(a)) I.press(a);
  }
  function onKeyUp(e) { I.keys.delete(e.code); }
  function onMouseDown(e) {
    const code = 'Mouse' + e.button;
    if (I.remapCb) { const cb = I.remapCb; I.remapCb = null; cb(code); e.preventDefault(); return; }
    if (!I.active) return;
    I.lastInput = 'kb';
    if (!I.locked && !SP.G.isMobile && SP.Game.state === 'playing' && I.canvas.requestPointerLock) {
      try { const r = I.canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* not allowed */ }
    }
    I.keys.add(code);
    const a = I.actionFor(code);
    if (a && ACTIONS_PRESS.includes(a)) I.press(a);
    e.preventDefault();
  }
  function onMouseUp(e) { I.keys.delete('Mouse' + e.button); }
  function onMouseMove(e) {
    if (!I.active || I.touchMode) return;
    if (I.locked || (e.buttons & 4)) {
      I.camDX += e.movementX || 0; I.camDY += e.movementY || 0;
    }
  }

  I.press = function (a) {
    if (a === 'pause') { SP.Game.pause(); return; }
    if (a === 'lock') { SP.Game.toggleLock(); return; }
    I.pressed.push(a);
  };

  I.held = (a) => I.keys.has(SP.Save.data.keybinds[a]);

  /* sample per frame: returns {ix, iy, sprint, block, camDX, camDY, pressed} */
  I.sample = function (dt) {
    let ix = 0, iy = 0;
    if (I.held('forward')) iy += 1;
    if (I.held('back')) iy -= 1;
    if (I.held('right')) ix += 1;
    if (I.held('left')) ix -= 1;
    let sprint = I.held('sprint');
    let block = I.held('block');
    let cdx = I.camDX * 0.0028, cdy = I.camDY * 0.0022;
    const camKey = 2.4 * dt;
    if (I.held('camLeft')) cdx -= camKey;
    if (I.held('camRight')) cdx += camKey;
    if (I.held('camUp')) cdy -= camKey * 0.6;
    if (I.held('camDown')) cdy += camKey * 0.6;
    if (I.touchMode) {
      const s = I.stick;
      if (s.id != null) {
        ix += s.x; iy += s.y;
        if (Math.hypot(s.x, s.y) > 0.93) sprint = true;
      }
      block = block || I.touchBlock;
      cdx += I.tcx * 0.0055; cdy += I.tcy * 0.0045;
    }
    I.tcx = 0; I.tcy = 0;
    const l = Math.hypot(ix, iy);
    if (l > 1) { ix /= l; iy /= l; }
    const out = { ix, iy, sprint, block, camDX: cdx, camDY: cdy, pressed: I.pressed.slice(), zoom: I.zoom };
    I.pressed.length = 0; I.camDX = 0; I.camDY = 0; I.zoom = 0;
    return out;
  };
  I.tcx = 0; I.tcy = 0;

  I.setActive = function (on) {
    I.active = on;
    I.keys.clear(); I.pressed.length = 0; I.touchBlock = false;
    I.stick.id = null; I.camTouch.id = null;
    const st = document.getElementById('stick');
    if (st) st.hidden = true;
    if (!on && I.locked && document.exitPointerLock) { I.suppressPauseOnUnlock = true; document.exitPointerLock(); }
  };

  /* ---------------- touch ---------------- */
  function btnFrom(el) {
    while (el && el !== document.body) { if (el.dataset && el.dataset.act) return el; el = el.parentElement; }
    return null;
  }
  function onTouchDown(e) {
    if (!I.active && !I.editLayout) return;
    e.preventDefault();
    const btn = btnFrom(e.target);
    if (I.editLayout) { if (btn) startDrag(btn, e); return; }
    SP.Audio.init();
    if (btn) {
      const a = btn.dataset.act;
      btn.classList.add('down');
      btn.setPointerCapture && btn.setPointerCapture(e.pointerId);
      btn._pid = e.pointerId;
      if (a === 'block') I.touchBlock = true;
      else I.press(a);
      if (navigator.vibrate && SP.Save.data.settings.screenShake) { try { navigator.vibrate(8); } catch (er) { /* */ } }
      return;
    }
    const left = SP.Save.data.settings.leftHanded ? e.clientX > window.innerWidth * 0.55 : e.clientX < window.innerWidth * 0.45;
    if (left && I.stick.id == null) {
      I.stick.id = e.pointerId; I.stick.ox = e.clientX; I.stick.oy = e.clientY; I.stick.x = 0; I.stick.y = 0;
      const st = document.getElementById('stick');
      st.hidden = false; st.style.left = e.clientX + 'px'; st.style.top = e.clientY + 'px';
      document.getElementById('stickKnob').style.transform = 'translate(-50%,-50%)';
    } else if (I.camTouch.id == null) {
      I.camTouch.id = e.pointerId; I.camTouch.x = e.clientX; I.camTouch.y = e.clientY;
    }
  }
  function onTouchMove(e) {
    if (I.drag) { moveDrag(e); return; }
    if (!I.active) return;
    if (e.pointerId === I.stick.id) {
      e.preventDefault();
      const R = 56 * SP.Save.data.settings.touchScale;
      let dx = e.clientX - I.stick.ox, dy = e.clientY - I.stick.oy;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        // drag the stick origin along so direction changes stay responsive
        const k = (d - R) / d; I.stick.ox += dx * k; I.stick.oy += dy * k;
        dx = e.clientX - I.stick.ox; dy = e.clientY - I.stick.oy;
        const st = document.getElementById('stick'); st.style.left = I.stick.ox + 'px'; st.style.top = I.stick.oy + 'px';
      }
      I.stick.x = dx / R; I.stick.y = -dy / R;
      const dead = 0.12, m = Math.hypot(I.stick.x, I.stick.y);
      if (m < dead) { I.stick.x = 0; I.stick.y = 0; }
      document.getElementById('stickKnob').style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    } else if (e.pointerId === I.camTouch.id) {
      e.preventDefault();
      const s = SP.Save.data.settings.camSens;
      I.tcx += (e.clientX - I.camTouch.x) * s; I.tcy += (e.clientY - I.camTouch.y) * s;
      I.camTouch.x = e.clientX; I.camTouch.y = e.clientY;
    }
  }
  function onTouchUp(e) {
    if (I.drag) { endDrag(e); return; }
    const btn = btnFrom(e.target) || [...document.querySelectorAll('#touch .tbtn')].find((b) => b._pid === e.pointerId);
    if (btn && btn._pid === e.pointerId) {
      btn.classList.remove('down'); btn._pid = null;
      if (btn.dataset.act === 'block') I.touchBlock = false;
    }
    // safety: release any held button with this pointer
    document.querySelectorAll('#touch .tbtn.down').forEach((b) => { if (b._pid === e.pointerId) { b.classList.remove('down'); b._pid = null; if (b.dataset.act === 'block') I.touchBlock = false; } });
    if (e.pointerId === I.stick.id) { I.stick.id = null; I.stick.x = 0; I.stick.y = 0; document.getElementById('stick').hidden = true; }
    if (e.pointerId === I.camTouch.id) I.camTouch.id = null;
  }

  /* ---------------- touch layout editing ---------------- */
  I.applyTouchLayout = function () {
    const s = SP.Save.data.settings;
    const root = document.getElementById('touch');
    if (!root) return;
    root.style.setProperty('--tscale', s.touchScale);
    root.classList.toggle('lefty', !!s.leftHanded);
    const L = SP.Save.data.touchLayout || {};
    root.querySelectorAll('.tbtn').forEach((b) => {
      const p = L[b.dataset.act];
      if (p) { b.style.left = p.x + '%'; b.style.top = p.y + '%'; b.style.right = 'auto'; b.style.bottom = 'auto'; b.classList.add('custom'); }
      else { b.style.left = b.style.top = b.style.right = b.style.bottom = ''; b.classList.remove('custom'); }
    });
  };
  function startDrag(btn, e) {
    const r = btn.getBoundingClientRect();
    I.drag = { btn, id: e.pointerId, dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2) };
    btn.classList.add('dragging');
  }
  function moveDrag(e) {
    if (e.pointerId !== I.drag.id) return;
    e.preventDefault();
    const b = I.drag.btn;
    const x = U.clamp((e.clientX - I.drag.dx) / window.innerWidth * 100, 3, 97), y = U.clamp((e.clientY - I.drag.dy) / window.innerHeight * 100, 4, 96);
    b.style.left = x + '%'; b.style.top = y + '%'; b.style.right = 'auto'; b.style.bottom = 'auto'; b.classList.add('custom');
    I.drag.x = x; I.drag.y = y;
  }
  function endDrag(e) {
    if (!I.drag || e.pointerId !== I.drag.id) return;
    const b = I.drag.btn; b.classList.remove('dragging');
    if (I.drag.x != null) { SP.Save.data.touchLayout[b.dataset.act] = { x: +I.drag.x.toFixed(2), y: +I.drag.y.toFixed(2) }; SP.Save.save(); }
    I.drag = null;
  }
})();
