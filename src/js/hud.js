/* SHATTERPOINT — combat HUD: bars, cooldowns, floating numbers, popups */
'use strict';
(function () {
  const U = SP.U;
  const $ = (id) => document.getElementById(id);
  const _v = new THREE.Vector3();
  const HUD = { floats: [], bars: new Map(), ghost: 1, comboN: 0, comboT: 0 };
  SP.HUD = HUD;

  HUD.build = function () {
    $('hud').innerHTML = `
      <div class="h-tl">
        <div class="h-name"><span id="hName"></span><span class="h-lvl" id="hLvl"></span></div>
        <div class="bar hp"><i class="ghost" id="hHpG"></i><i class="fill" id="hHp"></i><b id="hHpT"></b></div>
        <div class="bar guard"><i class="fill" id="hGuard"></i></div>
        <div class="mom-row">
          <div class="bar mom"><i class="fill" id="hMom"></i><em style="left:25%"></em><em style="left:35%"></em><em style="left:75%"></em></div>
          <span class="mom-label" id="hMomL">MOMENTUM</span>
        </div>
        <div class="pips" id="hPips"></div>
      </div>
      <div class="h-top">
        <div class="h-obj" id="hObj"></div>
        <div class="boss" id="hBoss" hidden><div class="boss-name"><span id="hBossN"></span><small id="hBossP"></small></div><div class="bar bosshp"><i class="ghost" id="hBossG"></i><i class="fill" id="hBossHp"></i></div></div>
      </div>
      <div class="h-tr" id="hTgt" hidden>
        <div class="tgt-name" id="hTgtN"></div>
        <div class="bar thp"><i class="fill" id="hTgtHp"></i></div>
        <div class="bar tguard"><i class="fill" id="hTgtG"></i></div>
      </div>
      <div class="h-bl" id="hKit">
        <div class="weapon"><span id="hWpn"></span><div class="bar heat" id="hHeatW" hidden><i class="fill" id="hHeat"></i></div></div>
        <div class="cds">
          <div class="cd" id="cdSkill"><i></i><span class="k" id="kSkill"></span><b id="nSkill"></b></div>
          <div class="cd" id="cdAb0"><i></i><span class="k" id="kAb0"></span><b id="nAb0"></b></div>
          <div class="cd" id="cdAb1"><i></i><span class="k" id="kAb1"></span><b id="nAb1"></b></div>
        </div>
      </div>
      <div class="combo" id="hCombo" hidden><b id="hComboN">0</b><span>HITS</span></div>
      <div class="selfpop" id="hSelf"></div>
      <div class="hint" id="hHint"></div>
      <div class="floats" id="hFloats"></div>
      <button class="h-pause" id="hPause" aria-label="Pause">II</button>
      <div class="lowhp" id="hLow"></div>`;
    $('hPause').addEventListener('click', () => SP.Game.pause());
  };

  HUD.reset = function (match) {
    const p = match.player;
    $('hName').textContent = SP.Save.data.name;
    $('hLvl').textContent = 'LV ' + SP.Save.data.level;
    $('hWpn').textContent = p.W.name;
    $('hHeatW').hidden = !p.W.heat;
    const mv = p.W.moves.skill;
    $('nSkill').textContent = mv.name;
    const ab = p.abilities;
    for (let i = 0; i < 2; i++) {
      const el = $('cdAb' + i);
      el.hidden = !ab[i];
      if (ab[i]) $('nAb' + i).textContent = SP.ABILITIES[ab[i].id].name;
    }
    const kb = SP.Save.data.keybinds;
    $('kSkill').textContent = SP.Input.keyName(kb.skill); $('kAb0').textContent = SP.Input.keyName(kb.ab0); $('kAb1').textContent = SP.Input.keyName(kb.ab1);
    $('hBoss').hidden = true;
    $('hTgt').hidden = true;
    $('hCombo').hidden = true;
    for (const [, b] of HUD.bars) b.el.remove();
    HUD.bars.clear();
    $('hFloats').innerHTML = '';
    HUD.floats = [];
    HUD.ghost = 1; HUD.bossGhost = 1;
    HUD.comboN = 0;
    $('hPips').innerHTML = '';
    for (let i = 0; i < p.dodgeMax; i++) $('hPips').insertAdjacentHTML('beforeend', '<i></i>');
    HUD.hint(SP.Input.touchMode ? '' : `${SP.Input.keyName(kb.light)} light · ${SP.Input.keyName(kb.heavy)} heavy · ${SP.Input.keyName(kb.block)} block/parry · ${SP.Input.keyName(kb.dodge)} dodge · ${SP.Input.keyName(kb.mom)} momentum · ${SP.Input.keyName(kb.lock)} lock-on · Esc pause`);
    // touch button labels
    document.querySelectorAll('#touch .tbtn').forEach((b) => {
      const a = b.dataset.act;
      if (a === 'skill') b.querySelector('span').textContent = mv.name.split(' ')[0].toUpperCase();
      if (a === 'ab0' || a === 'ab1') {
        const s = ab[a === 'ab0' ? 0 : 1];
        b.hidden = !s;
        if (s) b.querySelector('span').textContent = SP.ABILITIES[s.id].icon;
      }
    });
  };

  HUD.hint = function (t) { $('hHint').textContent = t; };

  const pct = (v) => (U.clamp(v, 0, 1) * 100).toFixed(1) + '%';

  HUD.update = function (dt, match) {
    const p = match.player;
    const hp = p.hp / p.maxHp;
    $('hHp').style.width = pct(hp);
    HUD.ghost = HUD.ghost > hp ? Math.max(hp, HUD.ghost - dt * 0.35) : hp;
    $('hHpG').style.width = pct(HUD.ghost);
    $('hHpT').textContent = Math.ceil(p.hp) + ' / ' + p.maxHp;
    $('hGuard').style.width = pct(p.guard / p.guardMax);
    $('hMom').style.width = pct(p.momentum / 100);
    const mc = p.momentumContext();
    const ml = $('hMomL');
    ml.textContent = mc.ok ? mc.label + ' READY' : 'MOMENTUM ' + Math.floor(p.momentum);
    ml.classList.toggle('ready', mc.ok);
    $('hMom').parentElement.classList.toggle('full', p.momentum >= 100);
    $('hLow').classList.toggle('on', hp < 0.25 && !p.dead);
    // dodge pips
    const pips = $('hPips').children;
    for (let i = 0; i < pips.length; i++) pips[i].classList.toggle('on', i < p.dodges);
    // heat
    if (p.W.heat) { $('hHeat').style.width = pct(p.heat / 100); $('hHeatW').classList.toggle('over', p.overheat > 0); }
    // cooldowns
    cdEl('cdSkill', p.cd.skill, p.cdMax.skill);
    cdEl('cdAb0', p.cd.ab0, p.cdMax.ab0, p.abilities[0] && SP.ABILITIES[p.abilities[0].id].heal && p.healUses >= 2);
    cdEl('cdAb1', p.cd.ab1, p.cdMax.ab1, p.abilities[1] && SP.ABILITIES[p.abilities[1].id].heal && p.healUses >= 2);
    // touch buttons cooldowns & momentum label
    if (SP.Input.touchMode) {
      touchCd('skill', p.cd.skill, p.cdMax.skill);
      touchCd('ab0', p.cd.ab0, p.cdMax.ab0);
      touchCd('ab1', p.cd.ab1, p.cdMax.ab1);
      const mb = document.querySelector('#touch [data-act="mom"]');
      if (mb) { mb.querySelector('span').textContent = mc.label; mb.classList.toggle('ready', mc.ok); mb.style.setProperty('--cd', (1 - p.momentum / 100).toFixed(3)); }
      const lb = document.querySelector('#touch [data-act="lock"]');
      if (lb) lb.classList.toggle('on', !!p.lockTarget);
      const db = document.querySelector('#touch [data-act="dodge"]');
      if (db) db.classList.toggle('empty', p.dodges <= 0);
    }
    // objective
    $('hObj').innerHTML = match.objectiveText();
    // target
    const t = p.lockTarget && !p.lockTarget.dead ? p.lockTarget : null;
    const tb = $('hTgt');
    if (t && !t.boss) {
      tb.hidden = false;
      $('hTgtN').textContent = t.name;
      $('hTgtHp').style.width = pct(t.hp / t.maxHp);
      $('hTgtG').style.width = pct(t.guard / t.guardMax);
    } else tb.hidden = true;
    // boss
    const boss = match.fighters.find((f) => f.boss && !f.decoy && !f.removed);
    if (boss) {
      $('hBoss').hidden = false;
      $('hBossN').textContent = SP.BOSSES[boss.boss].name;
      const r = boss.hp / boss.maxHp;
      $('hBossHp').style.width = pct(r);
      HUD.bossGhost = HUD.bossGhost > r ? Math.max(r, HUD.bossGhost - dt * 0.25) : r;
      $('hBossG').style.width = pct(HUD.bossGhost);
      $('hBossP').textContent = boss.ai ? 'PHASE ' + boss.ai.phase : '';
    } else $('hBoss').hidden = true;
    // combo
    if (HUD.comboT > 0) { HUD.comboT -= dt; if (HUD.comboT <= 0) { $('hCombo').hidden = true; HUD.comboN = 0; } }
    // floating enemy bars
    const cam = SP.G.camera;
    const W = window.innerWidth, Hh = window.innerHeight;
    const seen = new Set();
    for (const f of match.fighters) {
      if (f.team !== 1 || f.boss && !f.decoy || f.removed) continue;
      if (f.decoy && f.boss) continue;
      seen.add(f);
      let b = HUD.bars.get(f);
      if (!b) {
        const el = document.createElement('div'); el.className = 'fbar';
        el.innerHTML = `<small>${U.esc(f.name)}</small><div><i></i></div>`;
        $('hFloats').appendChild(el);
        b = { el, fill: el.querySelector('i') };
        HUD.bars.set(f, b);
      }
      _v.set(f.pos.x, f.pos.y + f.height + 0.35, f.pos.z).project(cam);
      const vis = _v.z < 1 && !f.dead && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1;
      b.el.style.display = vis ? '' : 'none';
      if (vis) {
        b.el.style.transform = `translate(${((_v.x + 1) / 2 * W).toFixed(1)}px, ${((1 - _v.y) / 2 * Hh).toFixed(1)}px) translate(-50%,-100%)`;
        b.fill.style.width = pct(f.hp / f.maxHp);
        b.el.classList.toggle('locked', f === p.lockTarget);
      }
    }
    for (const [f, b] of HUD.bars) if (!seen.has(f)) { b.el.remove(); HUD.bars.delete(f); }
    // floating texts
    for (let i = HUD.floats.length - 1; i >= 0; i--) {
      const o = HUD.floats[i];
      o.t += dt;
      if (o.t >= o.life) { o.el.remove(); HUD.floats.splice(i, 1); continue; }
      _v.copy(o.pos); _v.y += o.t * 0.9;
      _v.project(cam);
      if (_v.z > 1) { o.el.style.display = 'none'; continue; }
      o.el.style.display = '';
      const k = o.t / o.life;
      o.el.style.opacity = (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3).toFixed(2);
      o.el.style.transform = `translate(${((_v.x + 1) / 2 * W + o.ox).toFixed(1)}px, ${((1 - _v.y) / 2 * Hh).toFixed(1)}px) translate(-50%,-50%) scale(${(k < 0.12 ? 0.6 + k / 0.12 * 0.6 : 1.2 - Math.min(0.2, (k - 0.12)))})`;
    }
  };

  function cdEl(id, cd, max, spent) {
    const el = $(id);
    if (!el || el.hidden) return;
    const r = max > 0 ? cd / max : 0;
    el.querySelector('i').style.height = pct(r);
    el.classList.toggle('ready', cd <= 0 && !spent);
    el.classList.toggle('spent', !!spent);
  }
  function touchCd(act, cd, max) {
    const b = document.querySelector(`#touch [data-act="${act}"]`);
    if (!b) return;
    b.style.setProperty('--cd', (max > 0 ? U.clamp(cd / max, 0, 1) : 0).toFixed(3));
    b.classList.toggle('cooling', cd > 0);
  }

  function addFloat(pos, html, cls, life, ox = 0) {
    if (HUD.floats.length > 40) { const o = HUD.floats.shift(); o.el.remove(); }
    const el = document.createElement('div');
    el.className = 'float ' + cls; el.innerHTML = html;
    $('hFloats').appendChild(el);
    HUD.floats.push({ el, pos: pos.clone(), t: 0, life, ox });
  }
  HUD.damage = function (pos, n, big, onPlayer) {
    addFloat(pos, Math.round(n), (onPlayer ? 'dmg-in' : 'dmg') + (big ? ' big' : ''), 0.8, (Math.random() - 0.5) * 30);
  };
  HUD.popup = function (pos, text, cls) {
    addFloat(pos.clone().add(_v.set(0, 0.5, 0)), U.esc(text), 'pop ' + (cls || ''), 1.0);
  };
  HUD.popupSelf = function (text, cls) {
    const el = $('hSelf');
    const s = document.createElement('div');
    s.className = 'sp ' + (cls || ''); s.textContent = text;
    el.appendChild(s);
    setTimeout(() => s.remove(), 1300);
    while (el.children.length > 3) el.firstChild.remove();
  };
  HUD.combo = function (n) {
    HUD.comboN = n; HUD.comboT = 1.6;
    if (n >= 2) { $('hCombo').hidden = false; $('hComboN').textContent = n; const c = $('hCombo'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  };
  HUD.denied = function (key) {
    const map = { skill: 'cdSkill', ab0: 'cdAb0', ab1: 'cdAb1' };
    const el = map[key] ? $(map[key]) : null;
    if (el) { el.classList.remove('deny'); void el.offsetWidth; el.classList.add('deny'); }
    const tb = document.querySelector(`#touch [data-act="${key}"]`);
    if (tb) { tb.classList.remove('deny'); void tb.offsetWidth; tb.classList.add('deny'); }
    if (key === 'mom') { const m = $('hMomL'); m.classList.remove('deny'); void m.offsetWidth; m.classList.add('deny'); }
    SP.Audio.play('error');
  };
  HUD.flashHeat = function () { const h = $('hHeatW'); h.classList.remove('deny'); void h.offsetWidth; h.classList.add('deny'); SP.Audio.play('error'); };
  HUD.bossPhase = function (name, ph) { HUD.banner(name, 'PHASE ' + ph); };
  HUD.banner = function (title, sub) {
    const b = $('banner');
    b.innerHTML = `<h2>${U.esc(title)}</h2>${sub ? `<p>${U.esc(sub)}</p>` : ''}`;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  };
})();
