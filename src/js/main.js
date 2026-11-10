/* SHATTERPOINT — boot */
'use strict';
(function () {
  function shell() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <canvas id="gl" aria-label="SHATTERPOINT arena"></canvas>
      <div id="hud" class="hud" hidden></div>
      <div id="touch" hidden>
        <div id="stick" hidden><div id="stickKnob"></div></div>
        <button class="tbtn t-light" data-act="light" aria-label="Light attack"><span>LIGHT</span></button>
        <button class="tbtn t-heavy" data-act="heavy" aria-label="Heavy attack"><span>HEAVY</span></button>
        <button class="tbtn t-dodge" data-act="dodge" aria-label="Dodge"><span>DODGE</span></button>
        <button class="tbtn t-jump" data-act="jump" aria-label="Jump"><span>JUMP</span></button>
        <button class="tbtn t-block" data-act="block" aria-label="Block or parry"><span>BLOCK</span></button>
        <button class="tbtn t-skill cdb" data-act="skill" aria-label="Weapon skill"><span>SKILL</span></button>
        <button class="tbtn t-ab0 cdb" data-act="ab0" aria-label="Cybernetic 1"><span>»</span></button>
        <button class="tbtn t-ab1 cdb" data-act="ab1" aria-label="Cybernetic 2"><span>+</span></button>
        <button class="tbtn t-mom cdb" data-act="mom" aria-label="Momentum technique"><span>MOM</span></button>
        <button class="tbtn t-lock" data-act="lock" aria-label="Lock on"><span>◎</span></button>
      </div>
      <button id="layoutDone" class="btn primary" hidden>Done editing</button>
      <div id="banner" class="banner"></div>
      <div id="ui" class="ui"></div>
      <div id="modal" class="modal" hidden></div>
      <div id="toast" class="toast" aria-live="polite"></div>
      <div id="fps" class="fps" hidden></div>
      <div id="rotate" class="rotate">Rotate to landscape for the best experience</div>`;
  }

  function boot() {
    shell();
    SP.Save.load();
    const ok = typeof THREE !== 'undefined' && SP.G.init(document.getElementById('gl'));
    if (!ok) {
      document.getElementById('ui').innerHTML = `<div class="fatal"><h1>SHATTERPOINT</h1><p>This browser could not start 3D graphics (WebGL). Try another browser or enable hardware acceleration.</p></div>`;
      return;
    }
    SP.Input.init(document.getElementById('gl'));
    SP.HUD.build();
    SP.UI.init();
    SP.UI.initModal();
    SP.Bus.on('touchMode', () => { if (SP.Game.state === 'playing') document.getElementById('touch').hidden = false; });
    // unlock audio on first interaction
    const unlock = () => { SP.Audio.init(); };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    // autosave on hide
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { SP.Save.save(); if (SP.Game.state === 'playing') SP.Game.pause(); }
    });
    SP.Game.state = 'menu';
    SP.Game.showMenuScene();
    SP.UI.cur = 'title';
    SP.UI.render();
    SP.Game.init();
    window.__SP_READY = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
