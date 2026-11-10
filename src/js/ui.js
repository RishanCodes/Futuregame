/* SHATTERPOINT — menus and screens */
'use strict';
(function () {
  const U = SP.U, esc = U.esc;
  const $ = (id) => document.getElementById(id);
  const UI = { cur: null, params: {}, stack: [], sel: {} };
  SP.UI = UI;
  const S = () => SP.Save.data;
  const save = () => { SP.Save.save(); };
  const R = SP.RARITY;

  /* ---------------- helpers ---------------- */
  const cur = () => `<div class="cur"><span class="cr" title="Credits">◆ ${U.fmt(S().credits)}</span><span class="sh" title="Upgrade shards">⬢ ${U.fmt(S().shards)}</span></div>`;
  const topbar = (title, back = true) => `
    <header class="topbar">
      ${back ? '<button class="btn ghost back" data-a="back" aria-label="Back">‹ Back</button>' : ''}
      <h1>${esc(title)}</h1>
      ${cur()}
    </header>`;
  const rar = (r) => `<span class="rar r${r}">${R[r].name}</span>`;
  const bar = (v, cls = '') => `<div class="pbar ${cls}"><i style="width:${(U.clamp(v, 0, 1) * 100).toFixed(1)}%"></i></div>`;
  const itemIcon = (it) => it.kind === 'weapon' ? weaponGlyph(it.family) : ({ head: '◠', torso: '▣', arms: '╫', legs: '║', feet: '▁' }[it.slot]);
  const weaponGlyph = (f) => ({ katana: '╱', hammer: '┳', daggers: '✕', rifle: '═', gauntlets: '◉', spear: '↑' }[f] || '•');
  const itemName = (it) => esc(it.name) + (it.level > 1 ? ` <small>+${it.level - 1}</small>` : '');
  const slotLabel = (it) => it.kind === 'weapon' ? SP.WEAPONS[it.family].name : SP.SLOT_BASE[it.slot].name;

  UI.toast = function (msg, kind) {
    const t = $('toast');
    const el = document.createElement('div');
    el.className = 'toastmsg ' + (kind || '');
    el.textContent = msg;
    t.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  };

  UI.init = function () {
    const root = $('ui');
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
    // drag-rotate preview on canvas
    const cv = $('gl');
    let drag = null;
    cv.addEventListener('pointerdown', (e) => { if (SP.Game.state === 'menu') { drag = { x: e.clientX, id: e.pointerId }; SP.Game.preview.dragging = true; } });
    window.addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.id) { SP.Game.preview.yaw += (e.clientX - drag.x) * 0.012; drag.x = e.clientX; } });
    window.addEventListener('pointerup', (e) => { if (drag && e.pointerId === drag.id) { drag = null; SP.Game.preview.dragging = false; } });
    cv.addEventListener('wheel', (e) => { if (SP.Game.state === 'menu' && UI.cur === 'character') { SP.Game.preview.zoom = U.clamp(SP.Game.preview.zoom - Math.sign(e.deltaY) * 0.15, 0.8, 2.6); e.preventDefault(); } }, { passive: false });
    window.addEventListener('resize', () => { if (SP.Game.state === 'menu') UI.layoutPreview(); });
  };

  UI.go = function (screen, params, noPush) {
    SP.Audio.play('ui');
    if (!noPush && UI.cur && UI.cur !== screen) UI.stack.push([UI.cur, UI.params]);
    UI.cur = screen; UI.params = params || {};
    UI.render();
  };
  UI.back = function () {
    SP.Audio.play('uiBack');
    const p = UI.stack.pop();
    if (p) { UI.cur = p[0]; UI.params = p[1]; } else UI.cur = 'main';
    UI.render();
  };
  UI.home = function () { UI.stack = []; UI.cur = 'main'; UI.params = {}; UI.render(); };

  UI.layoutPreview = function () {
    const pv = SP.Game.preview;
    const wide = window.innerWidth > 820;
    const sideScreens = ['main', 'character', 'equipment', 'weapons', 'title'];
    pv.spin = UI.cur !== 'character';
    if (!sideScreens.includes(UI.cur)) { pv.offsetX = wide ? -2.6 : 0; pv.zoom = 0.9; return; }
    if (UI.cur === 'character') { pv.offsetX = wide ? -0.75 : 0; if (!UI.params.keepZoom) pv.zoom = wide ? 1.15 : 0.95; }
    else if (UI.cur === 'main' || UI.cur === 'title') { pv.offsetX = wide ? -0.9 : 0; pv.zoom = wide ? 1 : 0.85; }
    else { pv.offsetX = wide ? -0.15 : 0; pv.zoom = wide ? 1.1 : 0.9; }
  };

  UI.render = function () {
    const root = $('ui');
    root.hidden = false;
    $('hud').hidden = true; $('touch').hidden = true;
    document.body.classList.remove('in-game');
    document.body.classList.toggle('touch', SP.Input.touchMode);
    const fn = SCREENS[UI.cur] || SCREENS.main;
    root.className = 'ui scr-' + UI.cur;
    root.innerHTML = fn(UI.params);
    UI.layoutPreview();
    const first = root.querySelector('[autofocus]');
    if (first) first.focus();
  };

  UI.showGame = function () {
    $('ui').hidden = true;
    $('hud').hidden = false;
    $('touch').hidden = !SP.Input.touchMode;
    $('modal').hidden = true;
    document.body.classList.add('in-game');
    document.body.classList.toggle('touch', SP.Input.touchMode);
    if (!S().seenTutorial) UI.tutorial(true);
  };
  UI.showPause = function () {
    const m = SP.Game.match;
    UI.modal(`
      <div class="panel modalbox pause">
        <h2>Paused</h2>
        <p class="muted">${esc(m.cfg.title || '')} · ${U.fmtTime(m.time)}</p>
        <div class="stack">
          <button class="btn primary" data-a="resume" autofocus>Resume</button>
          <button class="btn" data-a="restart">Restart fight</button>
          <button class="btn" data-a="howto">How to play</button>
          <button class="btn" data-a="pauseSettings">Settings</button>
          <button class="btn danger" data-a="quitAsk">Quit to menu</button>
        </div>
      </div>`);
  };
  UI.modal = function (html) {
    const m = $('modal');
    m.innerHTML = html;
    m.hidden = false;
    const f = m.querySelector('[autofocus]'); if (f) f.focus();
  };
  UI.closeModal = function () { $('modal').hidden = true; $('modal').innerHTML = ''; };

  UI.tutorial = function (first) {
    const touch = SP.Input.touchMode;
    const kb = S().keybinds, k = SP.Input.keyName;
    const ctl = touch
      ? `<li><b>Left thumb</b> anywhere on the left half: move. Push to the edge to sprint.</li>
         <li><b>Right thumb</b> drag on empty space: camera. <b>◎</b> locks onto a target.</li>
         <li>Buttons on the right: light, heavy, dodge, jump, block, weapon skill, cybernetics and momentum.</li>`
      : `<li><b>${k(kb.forward)}${k(kb.left)}${k(kb.back)}${k(kb.right)}</b> move · <b>Mouse</b> camera (click the arena to capture the mouse) · <b>${k(kb.sprint)}</b> sprint · <b>${k(kb.jump)}</b> jump</li>
         <li><b>${k(kb.light)}</b> light attack · <b>${k(kb.heavy)}</b> heavy · <b>${k(kb.block)}</b> block / parry · <b>${k(kb.dodge)}</b> dodge</li>
         <li><b>${k(kb.skill)}</b> weapon skill · <b>${k(kb.ab0)}</b>/<b>${k(kb.ab1)}</b> cybernetics · <b>${k(kb.mom)}</b> momentum · <b>${k(kb.lock)}</b> lock-on · <b>Esc</b> pause</li>`;
    UI.modal(`
      <div class="panel modalbox howto">
        <h2>How to fight</h2>
        <ul class="ctl">${ctl}</ul>
        <div class="tips">
          <div><h4>Parry</h4><p>Press block just before a hit lands. A <span class="w">white glint</span> on an enemy weapon means the attack can be parried. Parried enemies are stunned and your next hits count as counters.</p></div>
          <div><h4>Unblockable</h4><p>A <span class="r">red glint</span> or red floor marker cannot be blocked. Dodge it. Dodging at the last moment is a perfect dodge: slow motion and bonus Momentum.</p></div>
          <div><h4>Combos</h4><p>Chain light attacks, then finish with heavy for a weapon-specific ender. Light in the air for aerial attacks; heavy in the air to plunge.</p></div>
          <div><h4>Momentum</h4><p>Builds from hits, varied combos, parries and perfect dodges. The button changes with the situation: <b>Extend</b> a combo, <b>Shift</b> out of a hit, or unleash your <b>Finisher</b> at 100.</p></div>
        </div>
        <button class="btn primary" data-a="closeHowto" autofocus>${first ? 'Got it, fight!' : 'Close'}</button>
      </div>`);
    if (first && SP.Game.state === 'playing') { SP.Game.state = 'paused'; UI.tutPaused = true; SP.Input.setActive(false); }
  };

  /* ---------------- campaign helpers ---------------- */
  UI.stageUnlocked = function (si, ti) {
    const s = S();
    if (ti === 0) return si === 0 || !!s.campaign.bosses[SP.CAMPAIGN[si - 1].stages[3].boss];
    return !!s.campaign.cleared[SP.CAMPAIGN[si].stages[ti - 1].id];
  };
  UI.campaignCfg = function (si, ti) {
    const sec = SP.CAMPAIGN[si], st = sec.stages[ti];
    return { mode: 'campaign', arena: sec.arena, waves: st.waves, stage: st, tier: sec.id, title: st.name, subtitle: 'Sector ' + sec.id + ' · ' + sec.name, bonus: st.bonus, modifier: st.modifier, si, ti };
  };
  UI.campaignProgress = function () {
    let n = 0, t = 0;
    SP.CAMPAIGN.forEach((sec) => sec.stages.forEach((st) => { t++; if (S().campaign.cleared[st.id]) n++; }));
    return { n, t };
  };
  const enemyLabel = (spec) => spec.boss ? SP.BOSSES[spec.boss].name : SP.ARCHETYPES[spec.arch].name + (spec.weapon ? ' · ' + SP.WEAPONS[spec.weapon].name : '');

  /* =================================================================
     Screens
     ================================================================= */
  const SCREENS = {};

  SCREENS.title = () => {
    const st = SP.Save.status;
    const note = st === 'unavailable' ? '<p class="warnbox">Browser storage is blocked here, so progress will not be saved between visits. Use Settings → Export save to keep a copy.</p>'
      : st === 'recovered' ? '<p class="warnbox">Your previous save could not be read and a new one was started. A backup of the damaged data was kept.</p>' : '';
    return `
      <div class="title-wrap">
        <div class="logo"><span class="l1">SHATTER</span><span class="l2">POINT</span></div>
        <p class="tag">Arena combat league · Season 1.0</p>
        ${note}
        <button class="btn primary big" data-a="enter" autofocus>${S().stats.matches || st === 'loaded' ? 'Enter the arena' : 'Create your fighter'}</button>
        <p class="muted small">${SP.Input.touchMode ? 'Touch controls detected · play in landscape' : 'Keyboard and mouse · touch supported'}</p>
      </div>`;
  };

  SCREENS.main = () => {
    const s = S();
    const need = SP.xpToNext(s.level);
    const cp = UI.campaignProgress();
    return `
      <div class="main-wrap">
        <div class="panel mainmenu">
          <div class="who">
            <div class="who-name">${esc(s.name)}</div>
            <div class="who-lvl">Level ${s.level}<span>${U.fmt(s.xp)} / ${U.fmt(need)} XP</span></div>
            ${bar(s.xp / need, 'xp')}
            ${cur()}
          </div>
          <nav class="menu">
            <button class="mbtn primary" data-a="go" data-s="play" autofocus><b>Play</b><small>Campaign ${cp.n}/${cp.t} · Survival · Boss Rush · Duel</small></button>
            <button class="mbtn" data-a="go" data-s="character"><b>Character</b><small>Appearance and outfit</small></button>
            <button class="mbtn" data-a="go" data-s="equipment"><b>Equipment</b><small>Gear, upgrades and cybernetics</small></button>
            <button class="mbtn" data-a="go" data-s="weapons"><b>Weapons</b><small>Families, mastery and the armory</small></button>
            <button class="mbtn" data-a="go" data-s="progression"><b>Progression</b><small>Level, records and unlocks</small></button>
            <button class="mbtn" data-a="go" data-s="challenges"><b>Challenges</b><small>${SP.CHALLENGES.filter((c) => (s.challenges[c.id] || {}).done).length}/${SP.CHALLENGES.length} complete</small></button>
            <button class="mbtn" data-a="go" data-s="settings"><b>Settings</b><small>Graphics, audio, controls, save data</small></button>
          </nav>
        </div>
        <div class="hint-drag">Drag to rotate</div>
      </div>`;
  };

  const diffPicker = (cur, act = 'setDiff') => `<div class="seg">${SP.DIFF_ORDER.map((d) => `<button class="${d === cur ? 'on' : ''}" data-a="${act}" data-d="${d}">${SP.DIFFICULTY[d].name}</button>`).join('')}</div>`;

  SCREENS.play = () => {
    const s = S();
    const bossN = Object.keys(s.campaign.bosses).length;
    const cp = UI.campaignProgress();
    return `${topbar('Play')}
      <div class="content">
        <div class="row-between"><h3>Difficulty</h3>${diffPicker(s.settings.difficulty)}</div>
        <p class="muted small">${diffNote(s.settings.difficulty)}</p>
        <div class="cards modes">
          <button class="card mode" data-a="go" data-s="campaign"><h3>Arena Campaign</h3><p>Three sectors, nine fights and three bosses.</p><div class="meta">${cp.n}/${cp.t} cleared</div>${bar(cp.n / cp.t)}</button>
          <button class="card mode" data-a="go" data-s="survival"><h3>Survival</h3><p>Endless waves. Every 5th wave drops gear; every 10th brings a boss.</p><div class="meta">Best: wave ${s.survival.bestWave} · ${U.fmt(s.survival.bestScore)} pts</div></button>
          <button class="card mode ${bossN ? '' : 'locked'}" data-a="${bossN ? 'go' : 'lockedMsg'}" data-s="bossrush" data-m="Defeat a campaign boss to unlock Boss Rush."><h3>Boss Rush</h3><p>Every boss you have beaten, back to back.</p><div class="meta">${bossN ? bossN + ' boss' + (bossN > 1 ? 'es' : '') + ' · best ' + s.bossRush.best : 'Locked: beat a campaign boss'}</div></button>
          <button class="card mode" data-a="go" data-s="duel"><h3>Duel Simulator</h3><p>Pick an opponent, difficulty and arena. Practice and test builds.</p><div class="meta">Reduced rewards</div></button>
          <button class="card mode" data-a="go" data-s="challenges"><h3>Challenges</h3><p>Fights with special objectives and one-time rewards.</p><div class="meta">${SP.CHALLENGES.filter((c) => (s.challenges[c.id] || {}).done).length}/${SP.CHALLENGES.length} complete</div></button>
        </div>
      </div>`;
  };
  const diffNote = (d) => ({
    easy: 'Slower reactions, rarely parries, one attacker at a time. 80% rewards.',
    normal: 'The intended experience. Enemies defend and punish sometimes.',
    hard: 'Sharper reactions, more parries and punishes, varied combos. 135% rewards.',
    nightmare: 'Fast, consistent defence and three simultaneous attackers. 180% rewards.',
  })[d];

  SCREENS.campaign = (p) => {
    const s = S();
    const sel = p.sel || UI.sel.campaign || [0, 0];
    UI.sel.campaign = sel;
    const [si, ti] = sel;
    const sec = SP.CAMPAIGN[si], st = sec.stages[ti];
    const unlocked = UI.stageUnlocked(si, ti);
    const enemies = st.waves.map((w, i) => `<li><b>${st.waves.length > 1 ? 'Wave ' + (i + 1) + ':' : ''}</b> ${w.map(enemyLabel).join(', ')}</li>`).join('');
    const boss = st.boss ? SP.BOSSES[st.boss] : null;
    return `${topbar('Arena Campaign')}
      <div class="content split">
        <div class="col sectors">
          ${SP.CAMPAIGN.map((sc, i) => `
            <section class="sector ${UI.stageUnlocked(i, 0) ? '' : 'locked'}">
              <h3><span>Sector ${sc.id}</span> ${esc(sc.name)}</h3>
              <p class="muted small">${esc(SP.ARENAS[sc.arena].name)} · ${esc(sc.blurb)}</p>
              <div class="stages">
                ${sc.stages.map((stg, j) => {
                  const ul = UI.stageUnlocked(i, j), done = s.campaign.cleared[stg.id], bon = s.campaign.bonus[stg.id];
                  return `<button class="stage ${stg.boss ? 'boss' : ''} ${ul ? '' : 'locked'} ${done ? 'done' : ''} ${i === si && j === ti ? 'sel' : ''}" data-a="selStage" data-si="${i}" data-ti="${j}">
                    <span class="sid">${stg.id}</span><span class="sname">${esc(stg.name)}</span>
                    <span class="sstat">${!ul ? '🔒' : done ? '✓' + (bon ? '★' : '') : ''}</span></button>`;
                }).join('')}
              </div>
            </section>`).join('')}
        </div>
        <div class="col detail panel">
          <div class="eyebrow">Sector ${sec.id} · ${esc(SP.ARENAS[sec.arena].name)}</div>
          <h2>${esc(st.name)}</h2>
          ${boss ? `<p class="bossdesc"><b>${esc(boss.title)}.</b> ${esc(boss.desc)}</p>` : ''}
          <h4>Opponents</h4><ul class="plain">${enemies}</ul>
          ${st.modifier ? `<h4>Special condition</h4><p><b>${esc(SP.MODIFIERS[st.modifier].name)}:</b> ${esc(SP.MODIFIERS[st.modifier].desc)}</p>` : ''}
          <h4>Bonus objective</h4><p>${s.campaign.bonus[st.id] ? '★ ' : '◇ '}${esc(st.bonus.text)}</p>
          ${st.tip ? `<p class="tip">${esc(st.tip)}</p>` : ''}
          <h4>Rewards</h4><p class="muted">${st.boss ? 'Large XP and credits, guaranteed Rare+ gear (Epic on first clear)' : 'XP, credits, shards, 55% gear drop'}${s.campaign.cleared[st.id] ? '' : ' · first clear bonus'}</p>
          <div class="row-between"><span class="muted small">Difficulty: ${SP.DIFFICULTY[s.settings.difficulty].name}</span>
          <button class="btn primary" data-a="${unlocked ? 'startStage' : 'lockedMsg'}" data-m="Clear the previous fight to unlock this one." ${unlocked ? '' : 'aria-disabled="true"'}>${unlocked ? 'Start fight' : 'Locked'}</button></div>
        </div>
      </div>`;
  };

  SCREENS.survival = (p) => {
    const s = S();
    const ar = p.arena || 'sim';
    return `${topbar('Survival')}
      <div class="content narrow">
        <div class="panel">
          <p>Fight endless waves. You recover 20% health after each wave. Gear drops every 5 waves and a boss arrives every 10. Rewards scale with waves cleared, even if you fall.</p>
          <div class="stats3"><div><b>${s.survival.bestWave}</b><span>Best wave</span></div><div><b>${U.fmt(s.survival.bestScore)}</b><span>Best score</span></div><div><b>${SP.DIFFICULTY[s.settings.difficulty].name}</b><span>Difficulty</span></div></div>
          <h4>Arena</h4>
          <div class="seg wrap">${SP.ARENA_ORDER.map((a) => `<button class="${a === ar ? 'on' : ''}" data-a="survArena" data-v="${a}">${esc(SP.ARENAS[a].name)}</button>`).join('')}</div>
          <div class="row-end"><button class="btn primary" data-a="startSurvival" data-v="${ar}">Start survival</button></div>
        </div>
      </div>`;
  };

  SCREENS.bossrush = () => {
    const s = S();
    const bosses = Object.keys(s.campaign.bosses);
    return `${topbar('Boss Rush')}
      <div class="content narrow">
        <div class="panel">
          <p>Face every boss you have defeated in a row. You recover 35% health and one Nano Repair charge between bosses.</p>
          <ul class="plain">${['warden', 'phantom', 'archon'].map((b) => `<li class="${bosses.includes(b) ? '' : 'muted'}">${bosses.includes(b) ? '◆' : '🔒'} ${esc(SP.BOSSES[b].name)} <small class="muted">${esc(SP.BOSSES[b].title)}</small></li>`).join('')}</ul>
          <p class="muted">Best: ${s.bossRush.best} boss${s.bossRush.best === 1 ? '' : 'es'} defeated in one run.</p>
          <div class="row-end"><button class="btn primary" data-a="startBossRush">Start Boss Rush</button></div>
        </div>
      </div>`;
  };

  SCREENS.duel = (p) => {
    const s = S();
    const d = UI.sel.duel || (UI.sel.duel = { opp: 'aggressive', weapon: 'random', diff: s.settings.difficulty, arena: 'sim' });
    const bosses = Object.keys(s.campaign.bosses);
    const opps = SP.ARCH_ORDER.map((a) => ({ id: a, name: SP.ARCHETYPES[a].name, desc: SP.ARCHETYPES[a].desc }))
      .concat(['warden', 'phantom', 'archon'].map((b) => ({ id: b, name: SP.BOSSES[b].name, desc: bosses.includes(b) ? SP.BOSSES[b].title : 'Defeat in the campaign to unlock', boss: true, locked: !bosses.includes(b) })));
    const A = SP.ARCHETYPES[d.opp];
    return `${topbar('Duel Simulator')}
      <div class="content">
        <h4>Opponent</h4>
        <div class="cards opps">${opps.map((o) => `<button class="card opp ${d.opp === o.id ? 'sel' : ''} ${o.locked ? 'locked' : ''}" data-a="${o.locked ? 'lockedMsg' : 'duelOpp'}" data-v="${o.id}" data-m="Defeat this boss in the campaign first."><b>${esc(o.name)}</b><small>${esc(o.desc)}</small></button>`).join('')}</div>
        ${A ? `<h4>Opponent weapon</h4><div class="seg wrap"><button class="${d.weapon === 'random' ? 'on' : ''}" data-a="duelWeapon" data-v="random">Random</button>${A.weapons.map((w) => `<button class="${d.weapon === w ? 'on' : ''}" data-a="duelWeapon" data-v="${w}">${SP.WEAPONS[w].name}</button>`).join('')}</div>` : ''}
        <div class="row-between wrap"><div><h4>Difficulty</h4>${diffPicker(d.diff, 'duelDiff')}</div>
        <div><h4>Arena</h4><div class="seg wrap">${SP.ARENA_ORDER.map((a) => `<button class="${a === d.arena ? 'on' : ''}" data-a="duelArena" data-v="${a}">${esc(SP.ARENAS[a].name)}</button>`).join('')}</div></div></div>
        <div class="row-end"><button class="btn primary" data-a="startDuel">Start duel</button></div>
      </div>`;
  };

  SCREENS.challenges = () => {
    const s = S();
    return `${topbar('Challenges')}
      <div class="content">
        <p class="muted">Each challenge pays a large reward the first time you complete it and 25% on repeats. Difficulty: ${SP.DIFFICULTY[s.settings.difficulty].name}.</p>
        <div class="cards chals">${SP.CHALLENGES.map((c) => {
          const done = (s.challenges[c.id] || {}).done;
          return `<div class="card chal ${done ? 'done' : ''}">
            <div class="row-between"><h3>${esc(c.name)}</h3>${done ? '<span class="badge ok">Complete</span>' : ''}</div>
            <p>${esc(c.desc)}</p>
            <div class="meta">${esc(SP.ARENAS[c.arena].name)}${c.weapon ? ' · ' + SP.WEAPONS[c.weapon].name + ' provided if you lack one' : ''}</div>
            <div class="row-between"><span class="reward">◆ ${c.reward.credits} · ⬢ ${c.reward.shards}${done ? ' (25% repeat)' : ' + gear'}</span>
            <button class="btn small primary" data-a="startChallenge" data-v="${c.id}">Start</button></div>
          </div>`;
        }).join('')}</div>
      </div>`;
  };

  /* ---------------- character creator ---------------- */
  SCREENS.character = (p) => {
    const s = S(), ap = s.appearance;
    const tab = p.tab || 'identity';
    const tabs = [['identity', 'Identity'], ['hair', 'Hair'], ['body', 'Body'], ['outfit', 'Outfit'], ['colors', 'Colors']];
    let body = '';
    const sw = (list, cur, act, key) => `<div class="swatches">${list.map((c, i) => `<button class="sw ${i === cur ? 'on' : ''}" style="--c:${c}" data-a="${act}" data-k="${key}" data-v="${i}" aria-label="${c}"></button>`).join('')}</div>`;
    if (tab === 'identity') {
      body = `
        <label class="fld"><span>Fighter name</span><input id="nameIn" maxlength="14" value="${esc(s.name)}" autocomplete="off"></label>
        <h4>Face</h4><div class="seg wrap">${SP.FACES.map((f, i) => `<button class="${i === ap.face ? 'on' : ''}" data-a="apSet" data-k="face" data-v="${i}">${esc(f.name)}</button>`).join('')}</div>
        <h4>Skin tone</h4>${sw(SP.SKIN_TONES, ap.skin, 'apSet', 'skin')}
        <h4>Eye color</h4>${sw(SP.EYE_COLORS, ap.eyeColor, 'apSet', 'eyeColor')}`;
    } else if (tab === 'hair') {
      body = `<h4>Hairstyle</h4><div class="seg wrap">${SP.HAIR_STYLES.map((h, i) => `<button class="${i === ap.hairStyle ? 'on' : ''}" data-a="apSet" data-k="hairStyle" data-v="${i}">${esc(h.name)}</button>`).join('')}</div>
        <p class="muted small">Helmets and hoods cover hair.</p>
        <h4>Hair color</h4>${sw(SP.HAIR_COLORS, ap.hairColor, 'apSet', 'hairColor')}`;
    } else if (tab === 'body') {
      const sl = (k, label, min, max) => `<label class="fld range"><span>${label}<b>${Math.round(ap[k] * 100)}%</b></span><input type="range" min="${min}" max="${max}" step="0.01" value="${ap[k]}" data-k="${k}" class="apRange"></label>`;
      body = sl('height', 'Height', 0.9, 1.1) + sl('build', 'Build', 0.85, 1.25) + sl('shoulders', 'Shoulders', 0.85, 1.25);
    } else if (tab === 'outfit') {
      body = `<p class="muted small">Outfit is cosmetic. Armor stats come from Equipment, so you can wear any look with any gear. Equipment drops unlock their look here.</p>` +
        SP.SLOTS.map((slot) => `<h4>${SP.SLOT_BASE[slot].name}</h4><div class="seg wrap">${SP.STYLES[slot].map((st) => {
          const owned = s.unlockedStyles.includes(st.id) || !st.cost;
          const on = ap.styles[slot] === st.id;
          return `<button class="${on ? 'on' : ''} ${owned ? '' : 'buy'}" data-a="${owned ? 'styleSet' : 'styleBuy'}" data-k="${slot}" data-v="${st.id}">${esc(st.name)}${owned ? '' : ` <small>◆${st.cost}</small>`}</button>`;
        }).join('')}</div>`).join('');
    } else if (tab === 'colors') {
      const cs = (key, label) => `<h4>${label}</h4><div class="swatches">${SP.PALETTE.map((c) => `<button class="sw ${ap.colors[key] === c ? 'on' : ''}" style="--c:${c}" data-a="colorSet" data-k="${key}" data-v="${c}" aria-label="${c}"></button>`).join('')}<label class="sw custom" title="Custom color"><input type="color" value="${ap.colors[key]}" data-k="${key}" class="colorIn" aria-label="Custom ${label}"></label></div>`;
      body = cs('primary', 'Primary (suit)') + cs('secondary', 'Secondary (armor)') + cs('accent', 'Energy accent (lights and weapon)');
    }
    return `${topbar('Character')}
      <div class="content char">
        <div class="panel charpanel">
          <div class="tabs">${tabs.map(([id, n]) => `<button class="${id === tab ? 'on' : ''}" data-a="charTab" data-v="${id}">${n}</button>`).join('')}</div>
          <div class="tabbody">${body}</div>
          <div class="row-between foot"><button class="btn ghost" data-a="charRevert">Revert</button><button class="btn primary" data-a="charSave">Save & confirm</button></div>
        </div>
        <div class="viewctl"><button class="btn icon" data-a="zoom" data-v="-1" aria-label="Zoom out">−</button><button class="btn icon" data-a="zoom" data-v="1" aria-label="Zoom in">+</button><button class="btn icon" data-a="rot" aria-label="Rotate">⟳</button><span class="muted small">Drag to rotate</span></div>
      </div>`;
  };

  /* ---------------- equipment ---------------- */
  SCREENS.equipment = (p) => {
    const s = S();
    const slot = p.slot || 'weapon';
    const slots = [['weapon', 'Weapon']].concat(SP.SLOTS.map((x) => [x, SP.SLOT_BASE[x].name])).concat([['abilities', 'Cybernetics']]);
    const lo = SP.Items.loadout(s);
    let right = '';
    if (slot === 'abilities') right = abilitiesPanel();
    else {
      const items = s.inventory.filter((i) => slot === 'weapon' ? i.kind === 'weapon' : i.kind === 'armor' && i.slot === slot)
        .sort((a, b) => (b.rarity - a.rarity) || (b.level - a.level));
      const eq = SP.Items.get(s, s.equipped[slot]);
      const selId = p.item || (eq && eq.id) || (items[0] && items[0].id);
      const sel = items.find((i) => i.id === selId);
      right = `
        <div class="inv">
          ${items.length ? items.map((it) => `<button class="itm r${it.rarity} ${it.id === selId ? 'sel' : ''} ${SP.Items.isEquipped(s, it) ? 'eq' : ''}" data-a="selItem" data-v="${it.id}">
            <span class="ico">${itemIcon(it)}</span><span class="nm">${itemName(it)}</span><span class="sub">${slotLabel(it)}</span>${SP.Items.isEquipped(s, it) ? '<span class="eqtag">Equipped</span>' : ''}</button>`).join('') : '<p class="muted">Nothing here yet. Win fights or buy a Data Cache below.</p>'}
        </div>
        ${sel ? itemDetail(sel, eq) : ''}
        <div class="cache"><div><b>Data Cache</b><span class="muted small">A random Uncommon-or-better item.</span></div><button class="btn" data-a="buyCache">Buy ◆${SP.CACHE_COST}</button></div>`;
    }
    const sum = `<div class="loadsum"><div><b>${lo.hp}</b><span>Health</span></div><div><b>${(lo.def * 100).toFixed(1)}%</b><span>Damage reduction</span></div><div><b>${Math.round(lo.power * 100)}%</b><span>Weapon damage</span></div><div><b>${Math.round(lo.cdr * 100)}%</b><span>Cooldown cut</span></div><div><b>+${Math.round(lo.speed * 100)}%</b><span>Move speed</span></div></div>`;
    return `${topbar('Equipment')}
      <div class="content equip">
        <div class="panel slots">
          ${slots.map(([id, n]) => {
            let it = null; let label = '';
            if (id === 'abilities') label = s.abilities.slots.map((a) => a ? SP.ABILITIES[a].name : 'Empty').join(' · ');
            else { it = SP.Items.get(s, s.equipped[id]); label = it ? it.name : 'Empty'; }
            return `<button class="slot ${id === slot ? 'sel' : ''} ${it ? 'r' + it.rarity : ''}" data-a="selSlot" data-v="${id}"><span class="sl">${n}</span><span class="sv">${esc(label)}</span></button>`;
          }).join('')}
          ${sum}
        </div>
        <div class="panel invpanel">${right}</div>
      </div>`;
  };

  function itemDetail(it, eq) {
    const s = S();
    const lines = SP.Items.describe(it);
    const cmp = eq && eq.id !== it.id ? SP.Items.describe(eq) : null;
    const delta = (l) => {
      if (!cmp) return '';
      const o = cmp.find((x) => x.k === l.k);
      const d = l.value - (o ? o.value : 0);
      if (Math.abs(d) < 1e-4) return '<span class="dz">=</span>';
      return `<span class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}</span>`;
    };
    const missing = cmp ? cmp.filter((o) => !lines.find((l) => l.k === o.k)) : [];
    const maxL = R[it.rarity].maxLevel;
    const cost = SP.Items.upgradeCost(it);
    const canUp = SP.Items.canUpgrade(s, it);
    const isEq = SP.Items.isEquipped(s, it);
    const sv = SP.Items.salvageValue(it);
    const W = it.kind === 'weapon' ? SP.WEAPONS[it.family] : null;
    return `
      <div class="detail-item r${it.rarity}">
        <div class="row-between"><h3>${itemName(it)}</h3>${rar(it.rarity)}</div>
        <div class="muted small">${slotLabel(it)} · Level ${it.level}/${maxL}${it.kind === 'armor' ? ' · Look: ' + esc((SP.STYLES[it.slot].find((x) => x.id === it.style) || {}).name || it.style) : ''}</div>
        ${W ? `<p class="small">${esc(W.blurb)}</p>` : ''}
        <table class="stt">${lines.map((l) => `<tr><td>${esc(l.label)}</td><td>${l.fmt(l.value)} ${delta(l)}</td></tr>`).join('')}${missing.map((o) => `<tr class="lost"><td>${esc(o.label)}</td><td>— <span class="dn">▼</span></td></tr>`).join('')}</table>
        ${it.mods.length ? `<div class="mods">${it.mods.map((m) => { const mi = SP.Items.modInfo(m); return `<div class="mod ${SP.LEGENDARY_MODS[m] ? 'leg' : ''}"><b>${esc(mi.name)}</b> ${esc(mi.desc)}</div>`; }).join('')}</div>` : ''}
        ${cmp ? `<p class="muted small">▲▼ compared with equipped ${esc(eq.name)}</p>` : ''}
        <div class="actions">
          <button class="btn primary" data-a="equipItem" data-v="${it.id}" ${isEq ? 'disabled' : ''}>${isEq ? 'Equipped' : 'Equip'}</button>
          <button class="btn" data-a="upgradeItem" data-v="${it.id}" ${it.level >= maxL ? 'disabled' : ''}>${it.level >= maxL ? 'Max level' : `Upgrade ◆${cost.credits} ⬢${cost.shards}`}</button>
          <button class="btn danger ghost" data-a="salvageItem" data-v="${it.id}" ${isEq ? 'disabled' : ''}>Salvage +⬢${sv.shards}</button>
        </div>
        ${!canUp && it.level < maxL ? '<p class="muted small">Not enough credits or shards to upgrade.</p>' : ''}
      </div>`;
  }

  function abilitiesPanel() {
    const s = S();
    return `<p class="muted">Equip two cybernetic modules. Modules have cooldowns; Nano Repair is your only healing.</p>
      <div class="abslots">${[0, 1].map((i) => { const a = s.abilities.slots[i]; return `<div class="abslot"><span class="k">${SP.Input.keyName(s.keybinds['ab' + i])}</span><b>${a ? esc(SP.ABILITIES[a].name) : 'Empty'}</b></div>`; }).join('')}</div>
      <div class="ablist">${SP.ABILITY_ORDER.map((id) => {
        const A = SP.ABILITIES[id], mk = s.abilities.owned[id];
        const locked = s.level < A.level;
        const slotIdx = s.abilities.slots.indexOf(id);
        return `<div class="ab ${mk ? 'own' : ''} ${locked ? 'locked' : ''}">
          <div class="row-between"><h4><span class="aicon">${A.icon}</span> ${esc(A.name)} ${mk ? `<small>Mk ${['I', 'II', 'III'][mk - 1]}</small>` : ''}</h4><span class="muted small">${A.cd}s cooldown</span></div>
          <p class="small">${esc(A.desc)}</p><p class="muted small">${esc(A.mk)}</p>
          <div class="actions">${mk ? `
            <button class="btn small ${slotIdx === 0 ? 'primary' : ''}" data-a="abEquip" data-v="${id}" data-i="0">${slotIdx === 0 ? 'In slot 1' : 'Slot 1'}</button>
            <button class="btn small ${slotIdx === 1 ? 'primary' : ''}" data-a="abEquip" data-v="${id}" data-i="1">${slotIdx === 1 ? 'In slot 2' : 'Slot 2'}</button>
            ${mk < 3 ? `<button class="btn small" data-a="abUp" data-v="${id}">Upgrade ◆${400 * mk} ⬢${15 * mk}</button>` : '<span class="badge ok">Max</span>'}`
            : locked ? `<span class="muted small">Unlocks at level ${A.level}</span>` : `<button class="btn small primary" data-a="abBuy" data-v="${id}">Buy ◆${A.cost}</button>`}</div>
        </div>`;
      }).join('')}</div>`;
  }

  /* ---------------- weapons ---------------- */
  SCREENS.weapons = (p) => {
    const s = S();
    const fam = p.fam || SP.Items.loadout(s).family;
    const W = SP.WEAPONS[fam];
    const owned = SP.Items.ownedFamilies(s);
    const mx = s.mastery[fam] || 0, ml = SP.Items.masteryLevel(mx);
    const next = SP.MASTERY_LEVELS[ml] || null;
    const shop = SP.SHOP_WEAPONS[fam];
    const variant = (s.weaponVariant || {})[fam] || 'default';
    const mvRow = (k, label) => { const m = W.moves[k]; if (!m) return ''; const d = m.hits ? m.hits.reduce((a, h) => a + h.dmg, 0) : m.proj ? m.proj.reduce((a, q) => a + q.dmg, 0) : 0; return `<tr><td>${label}</td><td>${esc(m.name)}</td><td>${d ? Math.round(d) : '—'}</td><td>${m.dur.toFixed(2)}s</td></tr>`; };
    return `${topbar('Weapons')}
      <div class="content split weap">
        <div class="col fams">${SP.WEAPON_ORDER.map((f) => {
          const o = owned.includes(f);
          return `<button class="fam ${f === fam ? 'sel' : ''} ${o ? 'own' : ''}" data-a="selFam" data-v="${f}" style="--wc:${SP.WEAPONS[f].color}"><span class="g">${weaponGlyph(f)}</span><span><b>${SP.WEAPONS[f].name}</b><small>${o ? 'Owned · Mastery ' + SP.Items.masteryLevel(s.mastery[f] || 0) : 'Armory: level ' + SP.SHOP_WEAPONS[f].level}</small></span></button>`;
        }).join('')}</div>
        <div class="col panel famdetail">
          <h2 style="color:${W.color}">${W.name}</h2>
          <p>${esc(W.blurb)}</p>
          <div class="sw2"><div><h4>Strengths</h4><ul class="plain">${W.strengths.map((x) => `<li class="ok">+ ${esc(x)}</li>`).join('')}</ul></div><div><h4>Weaknesses</h4><ul class="plain">${W.weaknesses.map((x) => `<li class="bad">− ${esc(x)}</li>`).join('')}</ul></div></div>
          <h4>Move list</h4>
          <div class="tblwrap"><table class="moves"><tr><th>Input</th><th>Move</th><th>Dmg</th><th>Time</th></tr>
            <tr><td>Light chain</td><td>${W.chain.filter((c, i, a) => a.indexOf(c) === i).map((c) => esc(W.moves[c].name)).join(' → ')}</td><td>${W.chain.reduce((a, c) => a + (W.moves[c].hits ? W.moves[c].hits.reduce((x, h) => x + h.dmg, 0) : W.moves[c].proj[0].dmg), 0)}</td><td>${W.chain.length} hits</td></tr>
            ${mvRow('heavy', 'Heavy')}${mvRow('chainHeavy', 'Light → Heavy')}${mvRow('dash', 'Sprint + Light')}${mvRow('air', 'Air Light')}${mvRow('plunge', 'Air Heavy')}${mvRow('skill', 'Weapon skill')}${mvRow('ext', 'Momentum: Extend')}${mvRow('finisher', 'Momentum: Finisher')}${W.heat ? mvRow('bash', 'Light (point blank)') : ''}
          </table></div>
          <p class="small"><b>${esc(W.moves.skill.name)}:</b> ${esc(W.moves.skill.desc)} (${W.moves.skill.cd}s)</p>
          <h4>Mastery ${ml}/5</h4>
          ${bar(next ? (mx - SP.MASTERY_LEVELS[ml - 1]) / (next - SP.MASTERY_LEVELS[ml - 1]) : 1)}
          <p class="muted small">${next ? U.fmt(mx) + ' / ' + U.fmt(next) + ' mastery XP · earned by dealing damage with this weapon' : 'Fully mastered'}</p>
          <ol class="perks">${SP.MASTERY_PERKS.map((t, i) => `<li class="${ml > i ? 'ok' : 'muted'}">${ml > i ? '✓' : '○'} M${i + 1}: ${esc(t)}</li>`).join('')}</ol>
          <h4>Energy variant</h4>
          <div class="seg"><button class="${variant === 'default' ? 'on' : ''}" data-a="variant" data-f="${fam}" data-v="default">Accent color</button><button class="${variant === 'prism' ? 'on' : ''} ${ml >= 2 ? '' : 'buy'}" data-a="variant" data-f="${fam}" data-v="prism" ${ml >= 2 ? '' : 'data-lock="Reach mastery 2 to unlock Prism."'}>Prism ${ml >= 2 ? '' : '🔒'}</button><button class="${variant === 'gold' ? 'on' : ''} ${ml >= 5 ? '' : 'buy'}" data-a="variant" data-f="${fam}" data-v="gold" ${ml >= 5 ? '' : 'data-lock="Reach mastery 5 to unlock Gold."'}>Gold ${ml >= 5 ? '' : '🔒'}</button></div>
          <div class="row-end">
            ${owned.includes(fam) ? `<button class="btn primary" data-a="equipBestFam" data-v="${fam}">Equip best ${esc(W.name)}</button>` : ''}
            <button class="btn ${owned.includes(fam) ? '' : 'primary'}" data-a="buyWeapon" data-v="${fam}" ${s.level < shop.level ? 'disabled' : ''}>${s.level < shop.level ? 'Requires level ' + shop.level : (owned.includes(fam) ? 'Buy another' : 'Buy') + ' ◆' + shop.cost}</button>
          </div>
        </div>
      </div>`;
  };

  /* ---------------- progression ---------------- */
  SCREENS.progression = () => {
    const s = S();
    const need = SP.xpToNext(s.level);
    const cp = UI.campaignProgress();
    const nextUnlocks = Object.keys(SP.LEVEL_UNLOCKS).map(Number).sort((a, b) => a - b);
    return `${topbar('Progression')}
      <div class="content">
        <div class="panel">
          <div class="row-between"><h2>Level ${s.level}</h2><span class="muted">${U.fmt(s.xp)} / ${U.fmt(need)} XP to level ${s.level + 1}</span></div>
          ${bar(s.xp / need, 'xp')}
          <div class="statgrid">
            <div><b>${cp.n}/${cp.t}</b><span>Campaign fights</span></div>
            <div><b>${Object.keys(s.campaign.bosses).length}/3</b><span>Bosses defeated</span></div>
            <div><b>${Object.keys(s.campaign.bonus).length}</b><span>Bonus objectives</span></div>
            <div><b>${SP.CHALLENGES.filter((c) => (s.challenges[c.id] || {}).done).length}/${SP.CHALLENGES.length}</b><span>Challenges</span></div>
            <div><b>${s.survival.bestWave}</b><span>Survival best wave</span></div>
            <div><b>${s.bossRush.best}</b><span>Boss Rush best</span></div>
            <div><b>${s.stats.wins}/${s.stats.matches}</b><span>Wins / fights</span></div>
            <div><b>${U.fmt(s.stats.kills)}</b><span>Enemies defeated</span></div>
            <div><b>${U.fmt(s.stats.parries)}</b><span>Parries</span></div>
            <div><b>${U.fmt(s.stats.finishers)}</b><span>Finishers</span></div>
            <div><b>${Math.round(s.stats.playTime / 60)}m</b><span>Time in arena</span></div>
            <div><b>${s.inventory.length}</b><span>Items owned</span></div>
          </div>
        </div>
        <div class="split2">
          <div class="panel"><h3>Level rewards</h3><p class="muted small">Every level grants credits and shards. These levels unlock more:</p>
            <ul class="plain unlocks">${nextUnlocks.map((l) => `<li class="${s.level >= l ? 'ok' : ''}"><b>Lv ${l}</b> ${SP.LEVEL_UNLOCKS[l].map(esc).join(' · ')}</li>`).join('')}</ul></div>
          <div class="panel"><h3>Weapon mastery</h3>${SP.WEAPON_ORDER.map((f) => { const x = s.mastery[f] || 0, l = SP.Items.masteryLevel(x), n = SP.MASTERY_LEVELS[l]; return `<div class="mrow"><span>${SP.WEAPONS[f].name}</span><b>M${l}</b>${bar(n ? (x - SP.MASTERY_LEVELS[l - 1]) / (n - SP.MASTERY_LEVELS[l - 1]) : 1)}</div>`; }).join('')}</div>
        </div>
      </div>`;
  };

  /* ---------------- settings ---------------- */
  SCREENS.settings = (p) => {
    const s = S(), st = s.settings;
    const tab = p.tab || 'game';
    const tabs = [['game', 'Game'], ['graphics', 'Graphics'], ['audio', 'Audio'], ['controls', 'Controls'], ['touch', 'Touch'], ['save', 'Save data']];
    const seg = (k, opts) => `<div class="seg wrap">${opts.map(([v, n]) => `<button class="${st[k] === v ? 'on' : ''}" data-a="set" data-k="${k}" data-v="${v}">${n}</button>`).join('')}</div>`;
    const tog = (k, label) => `<label class="tog"><input type="checkbox" data-k="${k}" class="setChk" ${st[k] ? 'checked' : ''}><span>${label}</span></label>`;
    const rng = (k, label, min, max, step, fmt) => `<label class="fld range"><span>${label}<b>${fmt(st[k])}</b></span><input type="range" class="setRng" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${st[k]}"></label>`;
    let body = '';
    if (tab === 'game') body = `<h4>Difficulty</h4>${diffPicker(st.difficulty)}<p class="muted small">${diffNote(st.difficulty)}</p>
      ${tog('autoLock', 'Auto lock-on to the next enemy')}${tog('screenShake', 'Screen shake and vibration')}
      ${rng('camSens', 'Camera sensitivity', 0.3, 2.5, 0.05, (v) => v.toFixed(2))}${tog('invertY', 'Invert camera Y')}${rng('camDist', 'Camera distance', 3.5, 10, 0.1, (v) => v.toFixed(1) + 'm')}
      <button class="btn" data-a="howto">How to play</button>`;
    if (tab === 'graphics') body = `<h4>Quality</h4>${seg('quality', [['auto', 'Auto'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']])}
      <p class="muted small">Auto picks Medium on phones and High on computers, then lowers resolution if the frame rate drops. Low disables shadows and cuts particles and crowd detail.</p>${tog('showFps', 'Show frame rate')}`;
    if (tab === 'audio') body = `${tog('muted', 'Mute all sound')}${rng('master', 'Master volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%')}${rng('sfx', 'Effects volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%')}<button class="btn" data-a="testSound">Play test sound</button>`;
    if (tab === 'controls') {
      const acts = [['forward', 'Move forward'], ['back', 'Move back'], ['left', 'Move left'], ['right', 'Move right'], ['light', 'Light attack'], ['heavy', 'Heavy attack'], ['block', 'Block / parry'], ['dodge', 'Dodge'], ['jump', 'Jump'], ['sprint', 'Sprint'], ['skill', 'Weapon skill'], ['ab0', 'Cybernetic 1'], ['ab1', 'Cybernetic 2'], ['mom', 'Momentum'], ['lock', 'Lock-on'], ['pause', 'Pause'], ['camLeft', 'Camera left'], ['camRight', 'Camera right'], ['camUp', 'Camera up'], ['camDown', 'Camera down']];
      body = `<p class="muted small">Click a binding, then press a key or mouse button. Esc cancels. Binding a key already in use swaps the two.</p>
        <div class="binds">${acts.map(([a, n]) => `<div class="bind"><span>${n}</span><button class="btn small key ${p.remap === a ? 'wait' : ''}" data-a="remap" data-v="${a}">${p.remap === a ? 'Press a key…' : esc(SP.Input.keyName(s.keybinds[a]))}</button></div>`).join('')}</div>
        <button class="btn ghost" data-a="resetKeys">Restore default keys</button>`;
    }
    if (tab === 'touch') body = `<h4>Touch controls</h4>${seg('touch', [['auto', 'Auto'], ['on', 'Always on'], ['off', 'Off']])}
      ${rng('touchScale', 'Button size', 0.75, 1.4, 0.05, (v) => Math.round(v * 100) + '%')}${tog('leftHanded', 'Left-handed layout (buttons on the left)')}
      <div class="row"><button class="btn" data-a="editLayout">Edit button layout</button><button class="btn ghost" data-a="resetLayout">Reset layout</button></div>
      <p class="muted small">In layout editing, drag buttons anywhere and tap Done.</p>`;
    if (tab === 'save') body = `
      <p>Progress saves automatically after every fight and change. ${SP.Store.ok ? 'Saves are stored in this browser only; they do not sync to other devices or other copies of this page.' : '<b>Browser storage is unavailable here.</b> Progress lasts only until you close the page. Export a save code to keep it.'}</p>
      ${SP.Save.lastSaved ? `<p class="muted small">Last saved ${new Date(SP.Save.lastSaved).toLocaleTimeString()}</p>` : ''}
      <div class="row"><button class="btn primary" data-a="manualSave">Save now</button><button class="btn" data-a="exportSave">Export save code</button><button class="btn" data-a="importSave">Import save code</button></div>
      <div id="saveBox"></div>
      <h4>Danger zone</h4><button class="btn danger" data-a="resetAsk">Erase all progress</button>`;
    return `${topbar('Settings')}
      <div class="content narrow">
        <div class="panel">
          <div class="tabs">${tabs.map(([id, n]) => `<button class="${id === tab ? 'on' : ''}" data-a="setTab" data-v="${id}">${n}</button>`).join('')}</div>
          <div class="tabbody">${body}</div>
        </div>
        <p class="muted small center">SHATTERPOINT ${SP.VERSION} · single-player · no online features</p>
      </div>`;
  };

  /* ---------------- results ---------------- */
  UI.showResults = function (match, Rz) {
    const s = S();
    const st = Rz.stats;
    const cfg = match.cfg;
    let next = null;
    if (cfg.mode === 'campaign' && Rz.victory) {
      let si = cfg.si, ti = cfg.ti + 1;
      if (ti >= SP.CAMPAIGN[si].stages.length) { si++; ti = 0; }
      if (si < SP.CAMPAIGN.length && UI.stageUnlocked(si, ti)) next = [si, ti];
    }
    UI.lastNext = next;
    const need = SP.xpToNext(s.level);
    const head = cfg.mode === 'survival' ? `Survived ${Rz.survival.waves} wave${Rz.survival.waves === 1 ? '' : 's'}` : Rz.victory ? 'Victory' : 'Defeat';
    UI.modal(`
      <div class="panel modalbox results ${Rz.victory ? 'win' : 'lose'}">
        <div class="eyebrow">${esc(cfg.title || '')}${cfg.subtitle ? ' · ' + esc(cfg.subtitle) : ''}</div>
        <h2>${head}</h2>
        <div class="statgrid small">
          <div><b>${U.fmtTime(Rz.time)}</b><span>Time</span></div>
          <div><b>${U.fmt(st.dealt)}</b><span>Damage dealt</span></div>
          <div><b>${U.fmt(st.taken)}</b><span>Damage taken</span></div>
          <div><b>${st.maxCombo}</b><span>Best combo</span></div>
          <div><b>${st.parries}</b><span>Parries</span></div>
          <div><b>${st.perfects}</b><span>Perfect dodges</span></div>
          <div><b>${st.counters}</b><span>Counters</span></div>
          <div><b>${st.finishers}</b><span>Finishers</span></div>
          ${cfg.mode === 'survival' ? `<div><b>${U.fmt(Rz.survival.score)}</b><span>Score</span></div>` : ''}
        </div>
        <h4>Rewards</h4>
        <div class="rewards"><span class="xp">+${U.fmt(Rz.xp)} XP</span><span class="cr">◆ +${U.fmt(Rz.credits)}</span><span class="sh">⬢ +${U.fmt(Rz.shards)}</span></div>
        <div class="lvl">Level ${s.level} ${bar(s.xp / need, 'xp')}</div>
        ${Rz.levelUps.map((l) => `<div class="levelup">LEVEL UP → ${l.level} <small>+◆${l.credits} +⬢5</small>${l.unlocks.length ? '<ul>' + l.unlocks.map((u) => '<li>' + esc(u) + '</li>').join('') + '</ul>' : ''}</div>`).join('')}
        ${Rz.mastery ? `<p class="small">${SP.WEAPONS[Rz.mastery.family].name} mastery +${Rz.mastery.gained}${Rz.mastery.up ? ` · <b class="ok">Mastery ${Rz.mastery.level}: ${esc(Rz.mastery.perk)}</b>` : ''}</p>` : ''}
        ${Rz.items.length ? `<h4>Gear acquired</h4><div class="drops">${Rz.items.map((it) => `<div class="itm r${it.rarity}"><span class="ico">${itemIcon(it)}</span><span class="nm">${esc(it.name)}</span><span class="sub">${rar(it.rarity)} ${slotLabel(it)}</span></div>`).join('')}</div>` : ''}
        ${Rz.notes.length ? `<ul class="notes">${Rz.notes.map((n) => '<li>' + esc(n) + '</li>').join('')}</ul>` : ''}
        <div class="actions">
          ${next ? '<button class="btn primary" data-a="nextStage" autofocus>Next fight</button>' : ''}
          <button class="btn ${next ? '' : 'primary'}" data-a="retry" ${next ? '' : 'autofocus'}>${Rz.victory ? 'Fight again' : 'Retry'}</button>
          ${Rz.items.length ? '<button class="btn" data-a="toEquip">Equipment</button>' : ''}
          <button class="btn ghost" data-a="toMenu">Continue</button>
        </div>
      </div>`);
  };

  /* =================================================================
     Actions
     ================================================================= */
  const ACT = {
    back: () => {
      if (UI.cur === 'character' && UI.charSnapshot && UI.charSnapshot !== JSON.stringify(S().appearance)) {
        S().appearance = JSON.parse(UI.charSnapshot); SP.Game.preview.dirty = true; UI.toast('Unsaved appearance changes discarded');
      }
      UI.back();
    },
    go: (d) => UI.go(d.s),
    enter: () => { SP.Audio.init(); if (!S().stats.matches && SP.Save.status !== 'loaded') { UI.stack = ['main'].map((x) => [x, {}]); UI.go('character', { tab: 'identity', fresh: true }, true); } else UI.go('main', {}, true); },
    lockedMsg: (d) => { SP.Audio.play('error'); UI.toast(d.m || 'Locked'); },
    setDiff: (d) => { S().settings.difficulty = d.d; save(); UI.render(); },
    selStage: (d) => { UI.sel.campaign = [+d.si, +d.ti]; UI.params = { sel: UI.sel.campaign }; UI.render(); },
    startStage: () => { const [si, ti] = UI.sel.campaign || [0, 0]; SP.Game.start(UI.campaignCfg(si, ti)); },
    survArena: (d) => { UI.params = { arena: d.v }; UI.render(); },
    startSurvival: (d) => SP.Game.start({ mode: 'survival', arena: d.v, title: 'SURVIVAL', subtitle: SP.ARENAS[d.v].name, tier: 1 }),
    startBossRush: () => {
      const b = ['warden', 'phantom', 'archon'].filter((x) => S().campaign.bosses[x]);
      SP.Game.start({ mode: 'bossrush', arena: 'sim', waves: b.map((x) => [{ boss: x }]), title: 'BOSS RUSH', subtitle: b.length + ' bosses', tier: 3 });
    },
    duelOpp: (d) => { UI.sel.duel.opp = d.v; UI.sel.duel.weapon = 'random'; UI.render(); },
    duelWeapon: (d) => { UI.sel.duel.weapon = d.v; UI.render(); },
    duelDiff: (d) => { UI.sel.duel.diff = d.d; UI.render(); },
    duelArena: (d) => { UI.sel.duel.arena = d.v; UI.render(); },
    startDuel: () => {
      const d = UI.sel.duel;
      const spec = SP.BOSSES[d.opp] ? { boss: d.opp } : { arch: d.opp, weapon: d.weapon === 'random' ? U.pick(SP.ARCHETYPES[d.opp].weapons) : d.weapon };
      SP.Game.start({ mode: 'duel', arena: d.arena, waves: [[spec]], difficulty: d.diff, title: 'DUEL', subtitle: enemyLabel(spec), tier: spec.boss ? 3 : 2 });
    },
    startChallenge: (d) => {
      const c = SP.CHALLENGES.find((x) => x.id === d.v);
      SP.Game.start({ mode: 'challenge', arena: c.arena, waves: c.waves, weapon: c.weapon, goal: c.goal, challenge: c, title: c.name, subtitle: 'Challenge', tier: 2 });
    },
    /* character */
    charTab: (d) => { UI.params = Object.assign({}, UI.params, { tab: d.v, keepZoom: true }); UI.render(); },
    apSet: (d) => { S().appearance[d.k] = +d.v; SP.Game.preview.dirty = true; UI.params.keepZoom = true; UI.render(); },
    styleSet: (d) => { S().appearance.styles[d.k] = d.v; SP.Game.preview.dirty = true; UI.params.keepZoom = true; UI.render(); },
    styleBuy: (d) => {
      const st = SP.STYLES[d.k].find((x) => x.id === d.v);
      if (S().credits < st.cost) { SP.Audio.play('error'); UI.toast(`You need ◆${st.cost} credits for ${st.name}.`); return; }
      S().credits -= st.cost; S().unlockedStyles.push(st.id); S().appearance.styles[d.k] = st.id;
      save(); SP.Audio.play('buy'); UI.toast(st.name + ' unlocked'); SP.Game.preview.dirty = true; UI.params.keepZoom = true; UI.render();
    },
    colorSet: (d) => { S().appearance.colors[d.k] = d.v; SP.Game.preview.dirty = true; UI.params.keepZoom = true; UI.render(); },
    charSave: () => {
      const n = $('nameIn');
      if (n) S().name = sanitizeName(n.value);
      save(); SP.Audio.play('buy'); UI.toast('Fighter saved');
      UI.charSnapshot = JSON.stringify(S().appearance);
      if (UI.params.fresh) UI.home(); else UI.back();
    },
    charRevert: () => {
      if (UI.charSnapshot) { S().appearance = JSON.parse(UI.charSnapshot); SP.Game.preview.dirty = true; UI.params.keepZoom = true; UI.render(); UI.toast('Changes reverted'); }
    },
    zoom: (d) => { SP.Game.preview.zoom = U.clamp(SP.Game.preview.zoom + (+d.v) * 0.25, 0.8, 2.6); },
    rot: () => { SP.Game.preview.yaw += Math.PI / 4; },
    /* equipment */
    selSlot: (d) => { UI.params = { slot: d.v }; UI.render(); },
    selItem: (d) => { UI.params = Object.assign({}, UI.params, { item: d.v }); UI.render(); },
    equipItem: (d) => {
      const it = SP.Items.get(S(), d.v); if (!it) return;
      S().equipped[it.kind === 'weapon' ? 'weapon' : it.slot] = it.id;
      save(); SP.Audio.play('buy'); SP.Game.preview.dirty = true; UI.render();
    },
    upgradeItem: (d) => {
      const it = SP.Items.get(S(), d.v); if (!it) return;
      if (!SP.Items.upgrade(S(), it)) { SP.Audio.play('error'); UI.toast('Not enough credits or shards.'); return; }
      save(); SP.Audio.play('buy'); UI.toast(it.name + ' upgraded to level ' + it.level); UI.render();
    },
    salvageItem: (d) => {
      const it = SP.Items.get(S(), d.v); if (!it) return;
      UI.modal(`<div class="panel modalbox"><h3>Salvage ${esc(it.name)}?</h3><p>You will get ⬢${SP.Items.salvageValue(it).shards} shards and ◆${SP.Items.salvageValue(it).credits} credits. This cannot be undone.</p>
        <div class="actions"><button class="btn danger" data-a="salvageYes" data-v="${it.id}">Salvage</button><button class="btn" data-a="closeModal" autofocus>Keep it</button></div></div>`);
    },
    salvageYes: (d) => { const it = SP.Items.get(S(), d.v); if (it && SP.Items.salvage(S(), it)) { save(); SP.Audio.play('buy'); UI.toast('Salvaged'); } UI.closeModal(); UI.params.item = null; UI.render(); },
    buyCache: () => {
      const s = S();
      if (s.credits < SP.CACHE_COST) { SP.Audio.play('error'); UI.toast(`A Data Cache costs ◆${SP.CACHE_COST}.`); return; }
      s.credits -= SP.CACHE_COST;
      const tier = 1 + Object.keys(s.campaign.bosses).length;
      const it = SP.Items.rollDrop(s, Math.min(3, tier), 1, 1);
      s.inventory.push(it);
      if (it.kind === 'armor' && !s.unlockedStyles.includes(it.style)) s.unlockedStyles.push(it.style);
      save(); SP.Audio.play('reward');
      UI.toast(`Cache opened: ${it.name} (${R[it.rarity].name})`, 'r' + it.rarity);
      UI.params = { slot: it.kind === 'weapon' ? 'weapon' : it.slot, item: it.id }; UI.render();
    },
    abEquip: (d) => {
      const sl = S().abilities.slots, i = +d.i, other = 1 - i;
      if (sl[other] === d.v) sl[other] = sl[i];
      sl[i] = d.v; save(); SP.Audio.play('ui'); UI.render();
    },
    abBuy: (d) => {
      const A = SP.ABILITIES[d.v], s = S();
      if (s.level < A.level) return;
      if (s.credits < A.cost) { SP.Audio.play('error'); UI.toast(`You need ◆${A.cost} credits.`); return; }
      s.credits -= A.cost; s.abilities.owned[d.v] = 1;
      if (!s.abilities.slots[1]) s.abilities.slots[1] = d.v;
      save(); SP.Audio.play('buy'); UI.toast(A.name + ' installed'); UI.render();
    },
    abUp: (d) => {
      const s = S(), mk = s.abilities.owned[d.v];
      const c = 400 * mk, sh = 15 * mk;
      if (s.credits < c || s.shards < sh) { SP.Audio.play('error'); UI.toast(`Upgrading needs ◆${c} and ⬢${sh}.`); return; }
      s.credits -= c; s.shards -= sh; s.abilities.owned[d.v] = mk + 1;
      save(); SP.Audio.play('buy'); UI.toast(SP.ABILITIES[d.v].name + ' Mk ' + ['I', 'II', 'III'][mk]); UI.render();
    },
    /* weapons */
    selFam: (d) => { UI.params = { fam: d.v }; UI.render(); },
    buyWeapon: (d) => {
      const s = S(), sh = SP.SHOP_WEAPONS[d.v];
      if (s.level < sh.level) return;
      if (s.credits < sh.cost) { SP.Audio.play('error'); UI.toast(`You need ◆${sh.cost} credits.`); return; }
      s.credits -= sh.cost;
      const it = SP.Items.makeWeapon(d.v, 0); s.inventory.push(it);
      save(); SP.Audio.play('buy'); UI.toast(it.name + ' added to your inventory'); UI.render();
    },
    equipBestFam: (d) => {
      const s = S();
      const best = s.inventory.filter((i) => i.kind === 'weapon' && i.family === d.v).sort((a, b) => SP.Items.weaponPower(b) - SP.Items.weaponPower(a))[0];
      if (best) { s.equipped.weapon = best.id; save(); SP.Audio.play('buy'); SP.Game.preview.dirty = true; UI.toast(best.name + ' equipped'); UI.render(); }
    },
    variant: (d, el) => {
      if (el.dataset.lock) { SP.Audio.play('error'); UI.toast(el.dataset.lock); return; }
      const s = S(); s.weaponVariant = s.weaponVariant || {}; s.weaponVariant[d.f] = d.v; save(); SP.Game.preview.dirty = true; UI.render();
    },
    /* settings */
    setTab: (d) => { UI.params = { tab: d.v }; UI.render(); },
    set: (d) => {
      const st = S().settings;
      st[d.k] = d.v; save();
      if (d.k === 'quality') { SP.G.applyQuality(); SP.Game.preview.dirty = true; }
      if (d.k === 'touch') { SP.Input.touchMode = d.v === 'on' || (d.v === 'auto' && SP.G.isMobile); }
      UI.render();
    },
    testSound: () => { SP.Audio.init(); SP.Audio.play('parry'); },
    remap: (d) => {
      UI.params = Object.assign({}, UI.params, { remap: d.v }); UI.render();
      SP.Input.remapCb = (code) => {
        const kb = S().keybinds;
        if (code) {
          const other = Object.keys(kb).find((k) => kb[k] === code && k !== d.v);
          if (other) kb[other] = kb[d.v];
          kb[d.v] = code; save();
        }
        UI.params = Object.assign({}, UI.params, { remap: null }); UI.render();
      };
    },
    resetKeys: () => { S().keybinds = SP.defaultKeybinds(); save(); UI.toast('Default keys restored'); UI.render(); },
    editLayout: () => {
      SP.Input.editLayout = true;
      $('ui').hidden = true; $('touch').hidden = false; $('touch').classList.add('editing');
      document.querySelectorAll('#touch .tbtn').forEach((b) => { b.hidden = false; });
      $('layoutDone').hidden = false;
    },
    resetLayout: () => { S().touchLayout = {}; save(); SP.Input.applyTouchLayout(); UI.toast('Touch layout reset'); },
    manualSave: () => { if (SP.Save.save()) UI.toast('Saved'); else UI.toast('Saving is not available in this browser. Export a save code instead.', 'warn'); UI.render(); },
    exportSave: () => {
      const code = SP.Save.exportString();
      $('saveBox').innerHTML = `<label class="fld"><span>Your save code (keep it somewhere safe)</span><textarea id="saveCode" rows="4" readonly>${esc(code)}</textarea></label><button class="btn small" data-a="copySave">Copy code</button>`;
      const ta = $('saveCode'); ta.focus(); ta.select();
    },
    copySave: () => {
      const ta = $('saveCode');
      navigator.clipboard && navigator.clipboard.writeText(ta.value).then(() => UI.toast('Copied'), () => { ta.focus(); ta.select(); UI.toast('Select the text and copy it manually'); });
      if (!navigator.clipboard) { ta.focus(); ta.select(); UI.toast('Select the text and copy it manually'); }
    },
    importSave: () => {
      $('saveBox').innerHTML = `<label class="fld"><span>Paste a save code. This replaces your current progress.</span><textarea id="saveIn" rows="4" placeholder="SP1:..."></textarea></label><button class="btn small primary" data-a="importYes">Import</button>`;
      $('saveIn').focus();
    },
    importYes: () => {
      try { SP.Save.importString($('saveIn').value); SP.G.applyQuality(); SP.Input.applyTouchLayout(); SP.Audio.applySettings(); SP.Game.preview.dirty = true; UI.toast('Save imported'); UI.home(); }
      catch (e) { SP.Audio.play('error'); UI.toast(e.message, 'warn'); }
    },
    resetAsk: () => UI.modal(`<div class="panel modalbox"><h3>Erase all progress?</h3><p>Your fighter, gear, levels and records will be deleted from this browser. Export a save code first if you might want them back.</p>
      <div class="actions"><button class="btn danger" data-a="resetYes">Erase everything</button><button class="btn" data-a="closeModal" autofocus>Cancel</button></div></div>`),
    resetYes: () => { SP.Save.reset(); UI.closeModal(); SP.G.applyQuality(); SP.Input.applyTouchLayout(); SP.Game.preview.dirty = true; UI.stack = []; UI.cur = 'title'; UI.render(); UI.toast('Progress erased'); },
    closeModal: () => UI.closeModal(),
    /* in-game */
    resume: () => { UI.closeModal(); SP.Game.resume(); },
    restart: () => { UI.closeModal(); SP.Game.restart(); },
    howto: () => UI.tutorial(false),
    closeHowto: () => {
      S().seenTutorial = true; save();
      if (SP.Game.state === 'paused' && UI.tutPaused) { UI.tutPaused = false; UI.closeModal(); SP.Game.state = 'playing'; SP.Input.setActive(true); return; }
      if (SP.Game.state === 'paused') { UI.showPause(); return; }
      UI.closeModal();
    },
    pauseSettings: () => {
      UI.modal(`<div class="panel modalbox"><h2>Quick settings</h2>
        <label class="fld range"><span>Camera sensitivity<b>${S().settings.camSens.toFixed(2)}</b></span><input type="range" class="setRng" data-k="camSens" min="0.3" max="2.5" step="0.05" value="${S().settings.camSens}"></label>
        <label class="fld range"><span>Master volume<b>${Math.round(S().settings.master * 100)}%</b></span><input type="range" class="setRng" data-k="master" min="0" max="1" step="0.05" value="${S().settings.master}"></label>
        <label class="tog"><input type="checkbox" class="setChk" data-k="muted" ${S().settings.muted ? 'checked' : ''}><span>Mute</span></label>
        <label class="tog"><input type="checkbox" class="setChk" data-k="screenShake" ${S().settings.screenShake ? 'checked' : ''}><span>Screen shake</span></label>
        <label class="tog"><input type="checkbox" class="setChk" data-k="invertY" ${S().settings.invertY ? 'checked' : ''}><span>Invert camera Y</span></label>
        <div class="seg">${['low', 'medium', 'high'].map((q) => `<button class="${SP.G.quality === q && S().settings.quality !== 'auto' ? 'on' : ''}" data-a="quickQuality" data-v="${q}">${q[0].toUpperCase() + q.slice(1)}</button>`).join('')}</div>
        <button class="btn primary" data-a="pauseBack" autofocus>Back</button></div>`);
    },
    quickQuality: (d) => { S().settings.quality = d.v; save(); SP.G.applyQuality(); ACT.pauseSettings(); },
    pauseBack: () => UI.showPause(),
    quitAsk: () => UI.modal(`<div class="panel modalbox"><h3>Quit this fight?</h3><p>You will forfeit the fight and earn no rewards.</p>
      <div class="actions"><button class="btn danger" data-a="quitYes">Quit</button><button class="btn" data-a="pauseBack" autofocus>Keep fighting</button></div></div>`),
    quitYes: () => { UI.closeModal(); SP.Game.quitToMenu(); UI.render(); },
    nextStage: () => { UI.closeModal(); const [si, ti] = UI.lastNext; UI.sel.campaign = [si, ti]; SP.Game.start(UI.campaignCfg(si, ti)); },
    retry: () => { UI.closeModal(); SP.Game.restart(); },
    toEquip: () => { UI.closeModal(); SP.Game.quitToMenu(); UI.stack = [['main', {}]]; UI.cur = 'equipment'; UI.params = {}; UI.render(); },
    toMenu: () => {
      UI.closeModal();
      const mode = SP.Game.match && SP.Game.match.cfg.mode;
      SP.Game.quitToMenu();
      const target = { campaign: 'campaign', survival: 'survival', bossrush: 'bossrush', duel: 'duel', challenge: 'challenges' }[mode] || 'main';
      UI.stack = target === 'main' ? [] : [['main', {}], ['play', {}]];
      UI.cur = target; UI.params = {}; UI.render();
    },
  };
  UI.ACT = ACT;

  function sanitizeName(v) { v = (v || '').toUpperCase().replace(/[^A-Z0-9 _\-.]/g, '').trim().slice(0, 14); return v || 'NOVA'; }

  function onClick(e) {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const fn = ACT[el.dataset.a];
    if (fn) { e.preventDefault(); fn(el.dataset, el); }
  }
  function onInput(e) {
    const el = e.target;
    if (el.classList.contains('apRange')) {
      S().appearance[el.dataset.k] = +el.value; SP.Game.preview.dirty = true;
      const b = el.parentElement.querySelector('b'); if (b) b.textContent = Math.round(el.value * 100) + '%';
    }
    if (el.classList.contains('setRng')) {
      const k = el.dataset.k; S().settings[k] = +el.value;
      const b = el.parentElement.querySelector('b');
      if (b) b.textContent = k === 'camSens' ? (+el.value).toFixed(2) : k === 'camDist' ? (+el.value).toFixed(1) + 'm' : Math.round(el.value * 100) + '%';
      if (k === 'master' || k === 'sfx') SP.Audio.applySettings();
      if (k === 'touchScale') SP.Input.applyTouchLayout();
    }
    if (el.classList.contains('colorIn')) { S().appearance.colors[el.dataset.k] = el.value; SP.Game.preview.dirty = true; }
    if (el.id === 'nameIn') { /* keep live */ }
  }
  function onChange(e) {
    const el = e.target;
    if (el.classList.contains('setChk')) {
      S().settings[el.dataset.k] = el.checked; save();
      if (el.dataset.k === 'muted') SP.Audio.applySettings();
      if (el.dataset.k === 'leftHanded') SP.Input.applyTouchLayout();
    }
    if (el.classList.contains('setRng') || el.classList.contains('apRange')) save();
    if (el.classList.contains('colorIn')) { save(); UI.params.keepZoom = true; UI.render(); }
    if (el.id === 'nameIn') { S().name = sanitizeName(el.value); }
  }

  /* modal & layout-done listeners (outside #ui) */
  UI.initModal = function () {
    $('modal').addEventListener('click', onClick);
    $('modal').addEventListener('input', onInput);
    $('modal').addEventListener('change', onChange);
    $('layoutDone').addEventListener('click', () => {
      SP.Input.editLayout = false;
      $('touch').classList.remove('editing'); $('touch').hidden = true; $('layoutDone').hidden = true;
      $('ui').hidden = false; UI.toast('Layout saved');
    });
  };

  /* character snapshot for revert */
  const origGo = UI.go;
  UI.go = function (screen, params, noPush) {
    if (screen === 'character') UI.charSnapshot = JSON.stringify(S().appearance);
    origGo(screen, params, noPush);
  };
})();
