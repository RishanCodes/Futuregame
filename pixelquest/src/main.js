/* PIXEL QUEST — boot, settings, main loop and top-level flow */
'use strict';
(function () {
  const DEF = { music: 0.55, sfx: 0.8, mute: false, particles: 1, zoom: 1, touchScale: 1, lefty: false, vibrate: true, shake: true, fps: false };
  PQ.Settings = Object.assign({}, DEF);
  PQ.saveSettings = () => PQ.Store.set('pixelquest.settings', JSON.stringify(PQ.Settings));
  const M = (PQ.Main = { state: 'boot', fps: 60, acc: 0, last: 0, frames: 0, fpsT: 0 });

  function shell() {
    document.getElementById('app').innerHTML = `
      <canvas id="game"></canvas>
      <div id="touch">
        <div id="stick" hidden><div id="knob"></div></div>
        <div class="tcluster">
          <button class="tbt big" data-b="attack"><span>Attack</span></button>
          <button class="tbt" data-b="dodge"><span>Roll</span></button>
          <button class="tbt" id="bInteract" data-b="interact"><span>Use</span></button>
          <button class="tbt cdb" id="bAbility" data-b="ability"><span>Skill</span></button>
        </div>
        <div class="thot">${[0, 1, 2, 3].map((i) => `<button class="hb" id="th${i}" data-b="q${i}"></button>`).join('')}</div>
        <div class="tmenu"><button class="tm" data-b="bag">Bag</button><button class="tm" data-b="map">Map</button><button class="tm" data-b="menu">Menu</button></div>
      </div>
      <div id="feed"></div>
      <div id="toasts"></div>
      <div id="banner"></div>
      <div id="saveind"></div>
      <div id="ui" hidden></div>
      <div id="dlg" hidden></div>
      <div id="panel" class="panel-wrap"></div>
      <div id="fade"></div>
      <div id="loading" hidden><p>Generating world...</p></div>
      <div id="rotate">Turn your device sideways for the best view</div>`;
  }

  M.boot = function () {
    shell();
    PQ.Store.init();
    try { Object.assign(PQ.Settings, JSON.parse(PQ.Store.get('pixelquest.settings') || '{}')); } catch (e) { /* defaults */ }
    PQ.FX.budget = PQ.Settings.particles;
    PQ.Font.installDOM();
    const cv = document.getElementById('game');
    PQ.Render.init(cv);
    PQ.Input.init(cv);
    PQ.UI.init();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { PQ.Audio.suspend(true); if (M.state === 'game') PQ.G.autosave(); }
      else { PQ.Audio.suspend(false); M.last = performance.now(); }
    });
    window.addEventListener('pagehide', () => { if (M.state === 'game') PQ.G.autosave(); });
    M.toTitle(true);
    M.last = performance.now();
    requestAnimationFrame(M.frame);
    window.__PQ_READY = true;
  };

  M.toTitle = function (first) {
    if (!first && M.state === 'game') PQ.G.autosave();
    M.state = 'title';
    PQ.G.running = false;
    PQ.UI.open = null; document.getElementById('panel').className = 'panel-wrap';
    document.getElementById('dlg').hidden = true; PQ.UI.dlgOpen = false;
    document.body.classList.remove('ingame');
    const latest = PQ.Save.latest();
    const meta = PQ.Save.meta();
    PQ.Title.look = latest ? meta[latest].look : PQ.UI.randLook();
    PQ.UI.titleMenu();
    PQ.Audio.music('title');
  };

  function startGame(fn) {
    const ld = document.getElementById('loading');
    ld.hidden = false;
    document.getElementById('ui').hidden = true;
    setTimeout(() => {
      try { fn(); } catch (e) { console.error(e); PQ.UI.toast('Could not start: ' + e.message, 'warn'); ld.hidden = true; M.toTitle(); return; }
      ld.hidden = true;
      M.state = 'game';
      document.body.classList.add('ingame');
      M.acc = 0;
    }, 40);
  }
  M.newGame = function (slot, name, look) { startGame(() => { PQ.G.newGame(slot, name, look); PQ.G.autosave(); }); };
  M.loadSlot = function (slot) {
    const s = PQ.Save.read(slot);
    if (!s) { PQ.UI.toast('That save slot is empty.'); return; }
    if (s.corrupt) { PQ.UI.corruptNote = 'Save slot ' + slot + ' could not be read. A backup copy was kept; please start a new game or import a save code.'; PQ.UI.close(); PQ.UI.titleMenu(); return; }
    PQ.UI.open = null; document.getElementById('panel').className = 'panel-wrap';
    startGame(() => PQ.G.load(s, false));
  };

  /* previews from the title screen */
  M.preview = function (kind) {
    const k = PQ.Save.latest();
    const s = k ? PQ.Save.read(+k) : null;
    const UI = PQ.UI, D = PQ.D, esc = PQ.U.esc;
    if (!s || s.corrupt) {
      if (kind === 'char') { UI.creator(false, 1); UI.cr.onCancel = () => UI.titleMenu(); return; }
      if (kind === 'coll') { UI.show('preview', `<h2>Creature Collection</h2><p class="hint">0/${Object.keys(D.CREATURES).length} discovered. Start an adventure to fill your journal.</p><div class="journal">${Object.values(D.CREATURES).map((d) => `<div class="jc un"><canvas class="crt sil" data-sp="${d.id}" width="18" height="17"></canvas><b>???</b><small>${esc(D.CREATURE_RARITY[d.rar].name)}</small></div>`).join('')}</div><div class="row"><button class="pb" data-a="close">Back</button></div>`, 'wide tall'); UI.drawCritters(); return; }
      UI.show('preview', '<h2>World Map</h2><p>No adventure yet. The map reveals itself as you explore: start a new game to begin charting the realm.</p><div class="row"><button class="pb gold" data-a="tNew">New Game</button><button class="pb" data-a="close">Back</button></div>');
      return;
    }
    if (kind === 'char') {
      const st = PQ.Stats.compute(s);
      const eq = Object.entries(s.eq).filter(([, v]) => v).map(([k2, v]) => `<li><span style="color:${D.RARITY[v.r || 0].color}">${esc(D.ITEMS[v.id].name)}</span> <small>${k2}</small></li>`).join('');
      UI.show('preview', `<h2>${esc(s.name)}</h2><div class="creator"><div class="crprev"><canvas id="pvC" width="54" height="66"></canvas></div><div><p>Level ${s.lvl} &middot; ${PQ.U.fmt(s.gold)} gold &middot; ${PQ.U.fmtTime(s.played)} played</p><p class="hint">HP ${st.maxHp} &middot; Mana ${st.maxMp} &middot; Attack ${st.weapon.dmg.toFixed(1)} &middot; Defense ${Math.round(st.def)} &middot; Crit ${Math.round(st.crit)}%</p><ul class="objs">${eq || '<li>No equipment</li>'}</ul><p class="hint">Bosses defeated: ${Object.keys(s.bosses).length}/6 &middot; Quests done: ${Object.values(s.quests).filter((q) => q.st === 'done').length}</p></div></div><div class="row"><button class="pb gold" data-a="tContinue">Continue</button><button class="pb" data-a="close">Back</button></div>`, 'wide');
      const g = document.getElementById('pvC').getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(PQ.Spr.humanoid(PQ.Spr.look(s.look)).down_idle_0, 0, 0, 54, 66);
      return;
    }
    if (kind === 'coll') {
      const c = s.creatures;
      UI.show('preview', `<h2>Creature Collection</h2><p class="hint">${esc(s.name)}: ${Object.keys(c.seen).length}/${Object.keys(D.CREATURES).length} discovered, ${c.owned.length} companions.</p><div class="journal">${Object.values(D.CREATURES).map((d) => { const seen = c.seen[d.id]; return `<div class="jc ${seen ? '' : 'un'}"><canvas class="crt ${seen ? '' : 'sil'}" data-sp="${d.id}" width="18" height="17"></canvas><b style="color:${seen ? D.CREATURE_RARITY[d.rar].color : '#777'}">${seen ? esc(d.name) : '???'}</b><small>${esc(D.CREATURE_RARITY[d.rar].name)}</small></div>`; }).join('')}</div><div class="row"><button class="pb" data-a="close">Back</button></div>`, 'wide tall');
      UI.drawCritters();
      return;
    }
    if (kind === 'map') {
      UI.show('preview', `<h2>World Map - ${esc(s.name)}</h2><div class="mapwrap"><canvas id="mapc"></canvas></div><div class="row"><button class="pb" data-a="close">Back</button></div>`, 'wide tall');
      setTimeout(() => {
        const m = PQ.World.genOverworld(s.seed);
        const fog = new PQ.Fog(m.w, m.h, s.fog.world);
        const pos = s.pos && s.pos.map === 'world' ? { x: s.pos.x, y: s.pos.y } : null;
        const prevG = PQ.G.save; PQ.G.save = s;
        try { UI.drawMap(document.getElementById('mapc'), m, fog, s, pos); } finally { PQ.G.save = prevG; }
      }, 30);
    }
  };

  /* ---------------- main loop ---------------- */
  M.frame = function (now) {
    requestAnimationFrame(M.frame);
    let dt = (now - M.last) / 1000;
    M.last = now;
    if (!(dt > 0)) dt = 1 / 60;
    dt = Math.min(dt, 0.1); // clamp after inactivity
    M.frames++; M.fpsT += dt;
    if (M.fpsT >= 1) { M.fps = M.frames; M.frames = 0; M.fpsT = 0; }
    try {
      if (M.state === 'title') { PQ.Title.draw(dt); return; }
      if (M.state !== 'game') return;
      const G = PQ.G;
      const blocked = PQ.UI.blocking();
      if (!blocked) {
        const inp = PQ.Input.sample();
        const step = 1 / 60;
        M.acc += dt;
        let first = true, n = 0;
        while (M.acc >= step && n < 6) {
          G.update(step, first ? inp : Object.assign({}, inp, { press: {} }));
          first = false; M.acc -= step; n++;
        }
        if (n === 6) M.acc = 0;
      } else PQ.Input.sample();
      PQ.Render.draw(G, blocked ? 0 : dt);
      PQ.HUD.draw(PQ.Render.g, G, dt);
      PQ.Render.present();
    } catch (err) {
      console.error(err);
      if (!M.reported) { M.reported = 1; PQ.UI.toast('Error: ' + err.message, 'warn'); }
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', M.boot); else M.boot();
})();
