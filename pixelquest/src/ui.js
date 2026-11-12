/* PIXEL QUEST — DOM interface: menus, panels, dialogue, shops, crafting, notifications */
'use strict';
(function () {
  const U = PQ.U, D = PQ.D, Inv = PQ.Inv, esc = U.esc;
  const UI = (PQ.UI = { open: null, sel: null, tab: 'bag' });
  const $ = (id) => document.getElementById(id);
  const G = () => PQ.G;
  const RC = (r) => D.RARITY[r || 0].color;

  /* ---------------- small helpers ---------------- */
  const icon = (id, big) => { const d = D.ITEMS[id]; return d ? `<img class="ic${big ? ' big' : ''}" src="${PQ.Art.iconURL(d)}" alt="">` : ''; };
  const iname = (inst) => { const d = D.ITEMS[inst.id]; const r = Inv.isEquip(d) ? inst.r || 0 : -1; return `<span style="color:${r >= 0 ? RC(r) : '#f2ead8'}">${esc(d.name)}</span>`; };
  const btn = (label, a, extra = '', cls = '') => `<button class="pb ${cls}" data-a="${a}" ${extra}>${label}</button>`;
  UI.blocking = () => !!(UI.open || UI.dlgOpen || UI.fading);

  UI.init = function () {
    document.body.addEventListener('click', onClick);
    document.body.addEventListener('input', onInput);
    $('dlg').addEventListener('click', (e) => { if (!e.target.closest('[data-a]')) UI.dlgAdvance(); });
  };
  function onClick(e) {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const f = ACT[el.dataset.a];
    if (f) { e.preventDefault(); e.stopPropagation(); PQ.Audio.init(); f(el.dataset, el); }
  }
  function onInput(e) {
    const el = e.target;
    if (el.dataset.set) { PQ.Settings[el.dataset.set] = el.type === 'checkbox' ? el.checked : +el.value; PQ.saveSettings(); PQ.Audio.apply(); PQ.Input.applyLayout(); if (el.dataset.set === 'zoom') PQ.Render.resize(); if (el.dataset.set === 'particles') PQ.FX.budget = PQ.Settings.particles; }
    if (el.id === 'crName') { UI.cr.name = el.value.replace(/[^A-Za-z0-9 _'-]/g, '').slice(0, 14); }
  }

  /* ---------------- notifications ---------------- */
  UI.toast = function (msg, cls) {
    const t = $('toasts');
    const d = document.createElement('div'); d.className = 'toast ' + (cls || ''); d.textContent = msg;
    t.appendChild(d);
    while (t.children.length > 4) t.firstChild.remove();
    setTimeout(() => d.classList.add('out'), 3000); setTimeout(() => d.remove(), 3500);
  };
  UI.banner = function (title, sub) {
    const b = $('banner');
    b.innerHTML = `<h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}`;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  };
  UI.fade = function (fn) {
    const f = $('fade'); UI.fading = true; f.classList.add('on');
    setTimeout(() => { try { fn(); } finally { setTimeout(() => { f.classList.remove('on'); UI.fading = false; }, 120); } }, 280);
  };
  UI.saveIndicator = function (ok) { const s = $('saveind'); s.textContent = ok ? 'Saved' : (PQ.Store.ok ? 'Save failed!' : 'Saving unavailable'); s.className = ok ? 'show' : 'show bad'; setTimeout(() => (s.className = ''), 1600); };
  const feed = {};
  UI.pickup = function (d, n, inst) {
    const f = $('feed');
    const key = d.id + (inst ? inst.uid : '');
    let e = feed[key];
    if (e && e.el.isConnected) { e.n += n; e.el.querySelector('b').textContent = '+' + e.n; clearTimeout(e.to); }
    else { const el = document.createElement('div'); el.className = 'fi'; el.innerHTML = `${icon(d.id)}<b>+${n}</b> <span style="color:${inst ? RC(inst.r) : '#f2ead8'}">${esc(d.name)}</span>`; f.appendChild(el); e = feed[key] = { el, n }; while (f.children.length > 5) f.firstChild.remove(); }
    e.to = setTimeout(() => { e.el.classList.add('out'); setTimeout(() => e.el.remove(), 400); delete feed[key]; }, 2200);
  };
  UI.questComplete = function (q) { UI.banner('Quest Complete', q.name); };

  /* ---------------- modal panel ---------------- */
  UI.show = function (name, html, cls = '') {
    UI.open = name;
    document.body.classList.add('panelopen');
    const p = $('panel');
    p.className = 'panel-wrap show ' + cls;
    p.innerHTML = `<div class="pq-panel">${html}</div>`;
    PQ.Input.clear();
    const f = p.querySelector('[autofocus]'); if (f) f.focus();
  };
  UI.close = function () {
    if (UI.open === 'creator' && UI.cr && UI.cr.onCancel) { const c = UI.cr.onCancel; UI.cr = null; UI.open = null; $('panel').className = 'panel-wrap'; $('panel').innerHTML = ''; c(); return; }
    UI.open = null; UI.sel = null;
    document.body.classList.remove('panelopen');
    $('panel').className = 'panel-wrap'; $('panel').innerHTML = '';
    PQ.Audio.play('uiBack');
    PQ.Input.clear();
    if (PQ.Main.state === 'title') UI.titleMenu();
  };
  UI.confirm = function (text, yes, no) {
    UI.show('confirm', `<h3>Are you sure?</h3><p>${esc(text)}</p><div class="row">${btn('Yes', 'cYes', '', 'gold')}${btn('No', 'cNo')}</div>`, 'small');
    UI._yes = yes; UI._no = no;
  };
  UI.hotkey = function (a) {
    if (PQ.Main.state !== 'game') return;
    if (UI.dlgOpen) { if (a === 'esc') UI.dlgClose(); return; }
    if (a === 'esc') { if (UI.open) UI.close(); else UI.menu('system'); return; }
    const map = { bag: 'bag', map: 'map', skills: 'skills', quests: 'quests', creatures: 'creatures', menu: 'bag' };
    if (UI.open === 'menu' && UI.tab === map[a]) { UI.close(); return; }
    if (UI.open && UI.open !== 'menu') return;
    UI.menu(map[a] || 'bag');
  };

  /* =========================================================
     TITLE
     ========================================================= */
  UI.titleMenu = function () {
    const latest = PQ.Save.latest();
    const meta = PQ.Save.meta();
    $('ui').innerHTML = `
      <div class="title-menu">
        <button class="tb gold" data-a="tNew">New Game</button>
        <button class="tb" data-a="tContinue" ${latest ? '' : 'disabled'}>${latest ? 'Continue: ' + esc(meta[latest].name) + ' (Lv ' + meta[latest].lvl + ')' : 'Continue'}</button>
        <button class="tb" data-a="tLoad">Load Game</button>
        <div class="tb-row">
          <button class="tb s" data-a="tChar">Character</button>
          <button class="tb s" data-a="tMap">World Map</button>
          <button class="tb s" data-a="tColl">Collection</button>
        </div>
        <div class="tb-row">
          <button class="tb s" data-a="tSettings">Settings</button>
          <button class="tb s" data-a="tCredits">Credits</button>
        </div>
        ${PQ.Store.ok ? '' : '<p class="warn">Browser storage is blocked here: progress will not be saved between visits. Use System > Export save code to keep it.</p>'}
        ${UI.corruptNote ? '<p class="warn">' + esc(UI.corruptNote) + '</p>' : ''}
      </div>`;
    $('ui').hidden = false;
  };
  UI.slots = function (mode) {
    const meta = PQ.Save.meta();
    let h = `<h2>${mode === 'new' ? 'Choose a save slot' : 'Load game'}</h2><div class="slots">`;
    for (let i = 1; i <= PQ.Save.SLOTS; i++) {
      const m = meta[i];
      h += `<div class="slot ${m ? '' : 'empty'}"><canvas class="slotpv" data-look='${m ? esc(JSON.stringify(m.look)) : ''}' width="18" height="22"></canvas><div class="sinfo">${m ? `<b>${esc(m.name)}</b> Lv ${m.lvl}<br><small>${esc(m.loc || '')} &middot; ${U.fmtTime(m.played)} played<br>${new Date(m.date).toLocaleString()}</small>` : '<b>Empty slot</b>'}</div>
        <div class="sbtn">${mode === 'new' ? btn(m ? 'Overwrite' : 'Start here', 'slotNew', `data-s="${i}"`, m ? '' : 'gold') : m ? btn('Play', 'slotLoad', `data-s="${i}"`, 'gold') : ''}${m ? btn('Delete', 'slotDel', `data-s="${i}"`, 'red') : ''}</div></div>`;
    }
    h += '</div>';
    if (mode === 'load') h += `<details class="imp"><summary>Import a save code</summary><p class="hint">Paste a code exported from System &gt; Export save code.</p><textarea id="impCode" rows="3" placeholder="PQ1:..."></textarea><div class="row"><label>Into slot <select id="impSlot">${[1, 2, 3].map((i) => `<option>${i}</option>`).join('')}</select></label>${btn('Import', 'imp', '', 'gold')}</div></details>`;
    h += `<div class="row">${btn('Back', 'close')}</div>`;
    UI.show('slots', h);
    document.querySelectorAll('.slotpv').forEach((c) => { if (!c.dataset.look) return; try { const sh = PQ.Spr.humanoid(PQ.Spr.look(JSON.parse(c.dataset.look))); c.getContext('2d').drawImage(sh.down_walk_0, 0, 0); } catch (e) { /* */ } });
  };

  /* =========================================================
     CHARACTER CREATOR (also used by the home mirror)
     ========================================================= */
  const HAIRC = ['#141418', '#3b2a20', '#7a4a26', '#c99a5b', '#e6e1d6', '#b3122e', '#2fb4ff', '#9a5cff', '#3ddc84', '#ff70b0'];
  const EYEC = ['#2f6bd6', '#3b2a20', '#2f8a4a', '#8a5cff', '#c9323a', '#1a1a2a', '#e0a92e'];
  const CLOTH = ['#3f5fae', '#a8414c', '#2a6038', '#7a3a8a', '#c8a050', '#e8e0d0', '#2a2a36', '#3f97d6', '#c8603a', '#5a3a2a', '#ff70b0', '#64b33f'];
  UI.randLook = () => ({ skin: U.randi(0, 5), hair: U.randi(0, 7), hairColor: U.pick(HAIRC), eye: U.pick(EYEC), top: U.pick(CLOTH), bottom: U.pick(['#4a3a2a', '#2a3c66', '#3a3a48', '#5a3a2a', '#2a2a36']), accent: U.pick(CLOTH), outfit: U.randi(0, 4), acc: U.randi(0, 6) });
  UI.creator = function (mirror, slot) {
    const s = G() && G().save;
    UI.cr = { mirror, slot, look: mirror ? Object.assign({}, s.look) : UI.randLook(), name: mirror ? s.name : '', t: 0, onCancel: mirror ? null : () => UI.slots('new') };
    UI.renderCreator();
    if (!UI.crTimer) UI.crTimer = setInterval(UI.drawPreview, 60);
  };
  UI.renderCreator = function () {
    const c = UI.cr, L = c.look;
    const opt = (key, label, list, names) => `<div class="crow"><span>${label}</span>${btn('&lt;', 'crPrev', `data-k="${key}" data-n="${list}"`, 'sq')}<b>${esc(names ? names[L[key]] : L[key] + 1)}</b>${btn('&gt;', 'crNext', `data-k="${key}" data-n="${list}"`, 'sq')}</div>`;
    const sw = (key, label, cols) => `<div class="crow"><span>${label}</span><div class="sws">${cols.map((col) => `<button class="sw ${L[key] === col ? 'on' : ''}" style="background:${col}" data-a="crCol" data-k="${key}" data-v="${col}"></button>`).join('')}</div></div>`;
    const skin = `<div class="crow"><span>Skin</span><div class="sws">${PQ.Art.P.skinTones.map((col, i) => `<button class="sw ${L.skin === i ? 'on' : ''}" style="background:${col}" data-a="crSkin" data-v="${i}"></button>`).join('')}</div></div>`;
    UI.show('creator', `
      <h2>${c.mirror ? 'Mirror' : 'Create your hero'}</h2>
      <div class="creator">
        <div class="crprev"><canvas id="crCanvas" width="160" height="72"></canvas><div class="row">${btn('Randomize', 'crRand')}</div></div>
        <div class="crctl">
          ${c.mirror ? '' : `<label class="crow"><span>Name</span><input id="crName" maxlength="14" value="${esc(c.name)}" placeholder="Your name" autocomplete="off"></label>`}
          ${opt('hair', 'Hairstyle', PQ.Spr.HAIR.length, PQ.Spr.HAIR.map((h) => h[0].toUpperCase() + h.slice(1)))}
          ${sw('hairColor', 'Hair color', HAIRC)}
          ${skin}
          ${sw('eye', 'Eyes', EYEC)}
          ${opt('outfit', 'Outfit', PQ.Spr.OUTFIT.length, PQ.Spr.OUTFIT.map((h) => h[0].toUpperCase() + h.slice(1)))}
          ${sw('top', 'Top color', CLOTH)}
          ${sw('bottom', 'Pants color', ['#4a3a2a', '#2a3c66', '#3a3a48', '#5a3a2a', '#2a2a36', '#7a6a5a', '#a8414c', '#2a6038'])}
          ${sw('accent', 'Accent color', CLOTH)}
          ${opt('acc', 'Accessory', PQ.Spr.ACC.length, PQ.Spr.ACC.map((h) => h[0].toUpperCase() + h.slice(1)))}
        </div>
      </div>
      <div class="row">${btn(c.mirror ? 'Done' : 'Begin adventure', 'crOk', '', 'gold')}${btn(c.mirror ? 'Cancel' : 'Back', 'close')}</div>`, 'wide');
  };
  UI.drawPreview = function () {
    const cv = $('crCanvas');
    if (!cv || !UI.cr) { clearInterval(UI.crTimer); UI.crTimer = null; return; }
    UI.cr.t += 0.06;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height);
    const sh = PQ.Spr.humanoid(PQ.Spr.look(UI.cr.look));
    ['down', 'left', 'up', 'right'].forEach((d, i) => { const fr = PQ.Spr.frame(sh, d, 'walk', UI.cr.t); g.drawImage(fr, 4 + i * 39, 6, fr.width * 3 * 0.66, fr.height * 3 * 0.66); });
  };

  /* =========================================================
     IN-GAME MENU
     ========================================================= */
  UI.menu = function (tab) {
    UI.tab = tab || UI.tab || 'bag';
    const tabs = [['bag', 'Bag'], ['skills', 'Skills'], ['quests', 'Quests'], ['creatures', 'Creatures'], ['map', 'Map'], ['system', 'System']];
    const s = G().save;
    const body = { bag: UI.bagHTML, skills: UI.skillsHTML, quests: UI.questsHTML, creatures: UI.creaturesHTML, map: UI.mapHTML, system: UI.systemHTML }[UI.tab]();
    UI.show('menu', `<div class="tabs">${tabs.map(([id, n]) => `<button class="tab ${id === UI.tab ? 'on' : ''}" data-a="tab" data-t="${id}">${n}${id === 'skills' && s.sp ? ' <i class="dot">' + s.sp + '</i>' : ''}</button>`).join('')}<button class="tab x" data-a="close">X</button></div><div class="tabbody">${body}</div>`, 'wide tall');
    if (UI.tab === 'map') UI.drawMap();
    if (UI.tab === 'creatures') UI.drawCritters();
    if (UI.tab === 'bag') UI.drawBagPreview();
  };
  UI.refresh = function () { if (UI.open === 'menu') { const sc = document.querySelector('.tabbody') && document.querySelector('.tabbody').scrollTop; UI.menu(UI.tab); const tb = document.querySelector('.tabbody'); if (tb && sc) tb.scrollTop = sc; } else if (UI.open === 'shop') UI.shop(UI.shopId, UI.shopTab); else if (UI.open === 'craft') UI.craft(UI.station, UI.craftSel); else if (UI.open === 'storage') UI.storage(); };

  /* ---------------- bag ---------------- */
  const SLOTS = [['weapon', 'Weapon'], ['helmet', 'Helmet'], ['chest', 'Chest'], ['gloves', 'Gloves'], ['boots', 'Boots'], ['ring', 'Ring'], ['necklace', 'Necklace'], ['acc', 'Accessory']];
  const slotOf = (d) => (d.type === 'weapon' ? 'weapon' : d.slot);
  UI.cell = function (inst, a, extra, sel) {
    if (!inst) return `<button class="cell" data-a="${a}" ${extra}></button>`;
    const d = D.ITEMS[inst.id];
    const r = Inv.isEquip(d) ? inst.r || 0 : null;
    return `<button class="cell ${sel ? 'sel' : ''} ${r != null ? 'r' + r : ''}" data-a="${a}" ${extra} title="${esc(d.name)}">${icon(inst.id)}${inst.n > 1 ? `<i>${inst.n}</i>` : ''}</button>`;
  };
  UI.bagHTML = function () {
    const s = G().save, st = G().stats;
    const sel = UI.sel;
    let eq = '<div class="eqgrid"><canvas id="bagPv" width="54" height="66"></canvas>';
    for (const [k, n] of SLOTS) eq += `<div class="eqs">${UI.cell(s.eq[k], 'selEq', `data-k="${k}"`, sel && sel.src === 'eq' && sel.k === k)}<small>${n}</small></div>`;
    eq += '</div>';
    const stl = [['HP', Math.ceil(s.hp) + '/' + st.maxHp], ['Mana', Math.floor(s.mp) + '/' + st.maxMp], ['Stamina', Math.floor(s.sta) + '/' + st.maxSta], ['Attack', st.weapon.dmg.toFixed(1)], ['Defense', Math.round(st.def)], ['Crit', Math.round(st.crit) + '%'], ['Speed', '+' + Math.round(st.spd) + '%'], ['Fire res', Math.round(st.fire) + '%'], ['Frost res', Math.round(st.ice) + '%'], ['Shadow res', Math.round(st.shadow) + '%']];
    const stats = `<div class="stats">${stl.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}${[...st.passives].map((p) => `<div class="pv">${esc(D.PASSIVES[p].name)}</div>`).join('')}</div>`;
    let grid = '<div class="grid">';
    s.inv.forEach((it, i) => { grid += UI.cell(it, 'selInv', `data-i="${i}"`, sel && sel.src === 'inv' && sel.i === i); });
    grid += '</div>';
    const free = Inv.free(s);
    return `<div class="bag"><div class="bagl">${eq}${stats}</div><div class="bagr"><div class="gold">${icon('__nope')}<b>${U.fmt(s.gold)} gold</b> <small>${free} free slots</small></div>${grid}<div class="detail">${UI.detailHTML()}</div></div></div>`;
  };
  UI.drawBagPreview = function () {
    const c = $('bagPv'); if (!c) return;
    const sh = PQ.Spr.humanoid(PQ.Spr.look(G().save.look));
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(sh.down_idle_0, 0, 0, 54, 66);
  };
  UI.selItem = function () {
    const s = G().save, sel = UI.sel;
    if (!sel) return null;
    if (sel.src === 'inv') return s.inv[sel.i];
    if (sel.src === 'eq') return s.eq[sel.k];
    if (sel.src === 'store') return s.storage[sel.i];
    return null;
  };
  UI.statLines = function (inst) {
    const d = D.ITEMS[inst.id];
    const st = Inv.stats(inst);
    const lines = [];
    if (st.dmg != null) lines.push(['Damage', st.dmg.toFixed(1), 'dmg']);
    if (st.def) lines.push(['Defense', Math.round(st.def), 'def']);
    for (const k in st) if (k !== 'dmg' && k !== 'def') lines.push([D.STATS[k] ? D.STATS[k].name : k, D.STATS[k] ? D.STATS[k].fmt(st[k]) : st[k], k, st[k]]);
    void d;
    return lines;
  };
  UI.detailHTML = function () {
    const inst = UI.selItem();
    if (!inst) return '<p class="hint">Select an item to see its details. Tap twice to use or equip.</p>';
    const s = G().save, d = D.ITEMS[inst.id], sel = UI.sel;
    let h = `<div class="dhead">${icon(inst.id, true)}<div><b>${iname(inst)}</b><br><small>${Inv.isEquip(d) ? `<span style="color:${RC(inst.r)}">${D.RARITY[inst.r || 0].name}</span> ` : ''}${esc(d.type === 'weapon' ? D.WCLASS[d.wclass].name : d.type === 'armor' ? (d.slot === 'acc' ? 'Accessory' : d.slot[0].toUpperCase() + d.slot.slice(1)) : d.type[0].toUpperCase() + d.type.slice(1))}${d.lvl > 1 ? ' &middot; Lv ' + d.lvl : ''}</small></div></div>`;
    if (Inv.isEquip(d)) {
      const cur = sel.src !== 'eq' ? s.eq[slotOf(d)] : null;
      const curSt = cur ? Inv.stats(cur) : {};
      const st = Inv.stats(inst);
      h += '<table class="st">';
      for (const [n, v, k] of UI.statLines(inst)) {
        let delta = '';
        if (sel.src !== 'eq' && k) { const dv = (st[k] || 0) - (curSt[k] || 0); if (Math.abs(dv) > 0.05) delta = `<i class="${dv > 0 ? 'up' : 'dn'}">${dv > 0 ? '+' : ''}${Math.round(dv * 10) / 10}</i>`; }
        h += `<tr><td>${esc(n)}</td><td>${v} ${delta}</td></tr>`;
      }
      if (cur && sel.src !== 'eq') for (const k in curSt) if (!(k in st) && k !== 'passive') h += `<tr class="lost"><td>${esc(D.STATS[k] ? D.STATS[k].name : k)}</td><td><i class="dn">-${Math.round(curSt[k] * 10) / 10}</i></td></tr>`;
      h += '</table>';
      const pv = Inv.passive(inst);
      if (pv) h += `<p class="pvd"><b>${esc(D.PASSIVES[pv].name)}:</b> ${esc(D.PASSIVES[pv].desc)}</p>`;
      if (cur && sel.src !== 'eq') h += `<p class="hint">Compared with your ${esc(D.ITEMS[cur.id].name)}</p>`;
    }
    h += `<p class="desc">${esc(d.desc || '')}</p><p class="hint">Sells for ${Math.floor(Inv.value(inst) * 0.5)}g</p><div class="acts">`;
    if (sel.src === 'eq') h += btn('Unequip', 'unequip');
    else if (sel.src === 'inv') {
      if (Inv.isEquip(d)) h += btn('Equip', 'equip', '', 'gold');
      if (d.use) h += btn('Use', 'use', '', 'gold');
      if (d.type === 'decor') h += btn('Place', 'place', '', 'gold');
      if (d.use || d.type === 'consumable') h += [0, 1, 2, 3].map((i) => btn('Slot ' + (i + 1), 'hot', `data-i="${i}"`, s.hot[i] === d.id ? 'on' : '')).join('');
      if (d.type !== 'quest') h += btn('Drop', 'drop', '', 'red');
    }
    return h + '</div>';
  };

  /* ---------------- skills ---------------- */
  UI.skillsHTML = function () {
    const s = G().save;
    let h = `<p class="hint">Skill points: <b class="gold">${s.sp}</b> &middot; Earn 1 per level. Active skills go on the ability button (Q). Mix trees for hybrid builds.</p><div class="trees">`;
    for (const tid in D.TREES) {
      const tr = D.TREES[tid];
      h += `<div class="tree"><h3 style="color:${tr.color}">${tr.name}</h3>`;
      for (const sk of D.SKILLS.filter((x) => x.tree === tid)) {
        const r = s.skills[sk.id] || 0, can = PQ.Skills.canLearn(sk.id);
        const locked = (sk.req || []).some((q) => !(s.skills[q] > 0));
        h += `<div class="skill ${r ? 'got' : ''} ${locked ? 'locked' : ''}"><div class="sk1"><b>${esc(sk.name)}</b><span>${r}/${sk.max}</span></div><small>${esc(sk.desc)}</small>${sk.req ? `<small class="req">Needs: ${sk.req.map((q) => esc(PQ.Skills.def(q).name)).join(', ')}</small>` : ''}${sk.active ? `<small class="req">Cost: ${sk.cost.sta ? sk.cost.sta + ' stamina' : sk.cost.mp + ' mana'} &middot; ${sk.cd}s cooldown</small>` : ''}<div class="acts">${r < sk.max ? btn('Learn', 'learn', `data-k="${sk.id}"`, can ? 'gold' : '') : ''}${sk.active && r ? btn(s.ability === sk.id ? 'Equipped' : 'Equip ability', 'setAbility', `data-k="${sk.id}"`, s.ability === sk.id ? 'on' : '') : ''}</div></div>`;
      }
      h += '</div>';
    }
    return h + '</div>';
  };

  /* ---------------- quests ---------------- */
  UI.questsHTML = function () {
    const s = G().save;
    const act = Object.keys(s.quests).filter((id) => s.quests[id].st === 'active').map((id) => D.QUESTS[id]);
    const done = Object.keys(s.quests).filter((id) => s.quests[id].st === 'done').map((id) => D.QUESTS[id]);
    const selId = UI.qsel && s.quests[UI.qsel] ? UI.qsel : act[0] && act[0].id;
    let list = '<div class="qlist"><h4>Active</h4>' + (act.length ? act.map((q) => `<button class="qi ${q.id === selId ? 'sel' : ''} ${q.main ? 'main' : ''}" data-a="qsel" data-k="${q.id}">${q.main ? '* ' : ''}${esc(q.name)}</button>`).join('') : '<p class="hint">No active quests. Look for ! above villagers.</p>');
    list += '<h4>Completed</h4>' + (done.length ? done.map((q) => `<button class="qi done ${q.id === selId ? 'sel' : ''}" data-a="qsel" data-k="${q.id}">${esc(q.name)}</button>`).join('') : '<p class="hint">None yet.</p>') + '</div>';
    let det = '<div class="qdet">';
    if (selId) {
      const q = D.QUESTS[selId], qs = s.quests[selId];
      det += `<h3>${q.main ? '<span class="gold">Main story</span> ' : ''}${esc(q.name)}</h3><p class="hint">From ${esc(D.NPCS[q.giver].name)}</p><p>${esc(q.desc)}</p><ul class="objs">`;
      q.obj.forEach((o, i) => { const ok = qs.st === 'done' || PQ.Quests.objDone(q, i); det += `<li class="${ok ? 'ok' : ''}">${ok ? '[x]' : '[ ]'} ${esc(PQ.Quests.objText(q, i))}</li>`; });
      if (qs.st === 'active' && PQ.Quests.complete(q) && PQ.Quests.needsTurnIn(q)) det += `<li class="ok">Return to ${esc(D.NPCS[q.giver].name)}</li>`;
      det += `</ul><p class="hint">Rewards: ${q.reward.xp ? q.reward.xp + ' XP' : ''}${q.reward.gold ? ', ' + q.reward.gold + ' gold' : ''}${(q.reward.items || []).map(([id, n]) => ', ' + n + 'x ' + esc(D.ITEMS[id].name)).join('')}</p>`;
      if (qs.st === 'active') det += btn(s.pinned === selId ? 'Tracking' : 'Track on HUD', 'qpin', `data-k="${selId}"`, s.pinned === selId ? 'on' : '');
    }
    return `<div class="quests">${list}${det}</div></div>`;
  };

  /* ---------------- creatures ---------------- */
  UI.creaturesHTML = function () {
    const s = G().save, c = s.creatures;
    const all = Object.values(D.CREATURES);
    let h = `<p class="hint">Journal: <b>${Object.keys(c.seen).length}/${all.length}</b> discovered, <b>${Object.keys(c.caught || {}).length}</b> befriended. Befriend wild creatures with a Bond Treat: weaken them first (they never faint), then offer the treat.</p>`;
    h += '<h4>Your party</h4><div class="party">';
    if (!c.owned.length) h += '<p class="hint">No companions yet.</p>';
    for (const o of c.owned) {
      const d = D.CREATURES[o.sp], r = D.CREATURE_RARITY[d.rar];
      h += `<div class="pc ${c.active === o.uid ? 'act' : ''}"><canvas class="crt" data-sp="${o.sp}" width="18" height="17"></canvas><div><b style="color:${r.color}">${esc(d.name)}</b> Lv ${o.lvl}<br><small>${esc(d.el)} &middot; ${esc(d.role[0].toUpperCase() + d.role.slice(1))}: ${esc(D.ROLES[d.role])}</small><br><small>Passive: ${esc(D.STATS[d.passive.stat] ? D.STATS[d.passive.stat].name : d.passive.stat)} +${d.passive.v}</small>${d.evolve ? `<br><small class="req">Evolves at Lv ${d.evolve.lvl} with an Evolution Prism (at a Creature Altar)</small>` : ''}</div>${btn(c.active === o.uid ? 'Following' : 'Make active', 'setPet', `data-k="${o.uid}"`, c.active === o.uid ? 'on' : 'gold')}</div>`;
    }
    h += '</div><h4>Creature journal</h4><div class="journal">';
    for (const d of all) {
      const seen = c.seen[d.id], r = D.CREATURE_RARITY[d.rar];
      h += `<div class="jc ${seen ? '' : 'un'}"><canvas class="crt ${seen ? '' : 'sil'}" data-sp="${d.id}" width="18" height="17"></canvas><b style="color:${seen ? r.color : '#777'}">${seen ? esc(d.name) : '???'}</b><small>${seen ? esc(r.name) + ' ' + esc(d.el) : esc(r.name)}</small>${seen ? `<small>${esc(d.desc)}</small>` : `<small>${d.region === 'evolve' ? 'Evolution' : esc(D.REGIONS[d.region] ? D.REGIONS[d.region].name : '')}</small>`}</div>`;
    }
    return h + '</div>';
  };
  UI.drawCritters = function () {
    document.querySelectorAll('canvas.crt').forEach((cv) => {
      const fr = PQ.Spr.mob({ id: 'cr_' + cv.dataset.sp, gen: 'critter', look: D.CREATURES[cv.dataset.sp].look })[0].r;
      const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
      g.drawImage(cv.classList.contains('sil') ? PQ.Art.tint(fr, '#3a3048') : fr, 0, 0);
    });
  };

  /* ---------------- map ---------------- */
  UI.mapHTML = function () {
    const m = G().map;
    const wps = Object.keys(G().save.waypoints).length;
    return `<div class="mapwrap"><canvas id="mapc"></canvas></div><p class="hint legend"><i style="background:#ffffff"></i>You <i style="background:#7ef0ff"></i>Waystone <i style="background:#ff6a4a"></i>Dungeon <i style="background:#ffd75a"></i>Quest target <i style="background:#c87a5a"></i>Town &middot; ${esc(m.name || '')} &middot; ${Math.round(G().fogs[m.id] ? G().fogs[m.id].count() / (m.w * m.h) * 100 : 0)}% explored ${m.kind === 'overworld' && wps ? '&middot; ' + btn('Fast travel', 'travel') : ''}</p>`;
  };
  UI.drawMap = function (cv, m, fog, save, player) {
    cv = cv || $('mapc'); if (!cv) return;
    const g0 = G();
    m = m || g0.map; fog = fog || g0.fogs[m.id]; save = save || g0.save; player = player || g0.player;
    const wrap = cv.parentElement;
    const scale = 3;
    cv.width = m.w * scale; cv.height = m.h * scale;
    const fit = Math.min((wrap.clientWidth - 8) / cv.width, ((wrap.clientHeight || 300) - 8) / cv.height);
    cv.style.width = Math.floor(cv.width * fit) + 'px'; cv.style.height = Math.floor(cv.height * fit) + 'px';
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(PQ.Render.mapImage(m), 0, 0, cv.width, cv.height);
    if (fog) g.drawImage(PQ.Render.fogImage(m, fog), 0, 0, cv.width, cv.height);
    const mark = (x, y, c, r = 3) => { g.fillStyle = '#120d18'; g.fillRect(x * scale - r - 1, y * scale - r - 1, r * 2 + 2, r * 2 + 2); g.fillStyle = c; g.fillRect(x * scale - r, y * scale - r, r * 2, r * 2); };
    const seen = (x, y) => !fog || fog.has(y * m.w + x);
    for (const o of m.objs) {
      if (o.k === 'waypoint' && (save.waypoints[o.wid] || seen(o.x, o.y))) mark(o.x, o.y, save.waypoints[o.wid] ? '#7ef0ff' : '#5a6a7a');
      if (o.k === 'entrance' && seen(o.x, o.y)) mark(o.x + 1, o.y, '#ff6a4a');
      if ((o.k === 'house' || o.k === 'stall') && seen(o.x, o.y)) mark(o.x + 1, o.y, '#c87a5a', 2);
    }
    const q = PQ.Quests && g0 && g0.save === save ? PQ.Quests.tracked() : null;
    if (q && q.mark && m.spots[q.mark]) mark(m.spots[q.mark].x, m.spots[q.mark].y, '#ffd75a', 4);
    if (player) { const px = player.x / PQ.T, py = player.y / PQ.T; mark(px, py, '#ffffff', 3); g.fillStyle = '#e8363c'; g.fillRect(px * scale - 1, py * scale - 1, 2, 2); }
  };

  /* ---------------- system ---------------- */
  UI.systemHTML = function () {
    const s = G().save;
    return `<div class="sys"><div><h3>Game</h3><p class="hint">${esc(s.name)} &middot; Level ${s.lvl} &middot; Slot ${s.slot} &middot; ${U.fmtTime(s.played)} played &middot; ${PQ.Time.str()}</p>
      <div class="acts">${btn('Save now', 'saveNow', '', 'gold')}${btn('Export save code', 'export')}${btn('Quit to title', 'quit', '', 'red')}</div>
      <p class="hint">${PQ.Store.ok ? 'The game autosaves after quests, bosses, sleeping, area changes and every 90 seconds. Saves live in this browser only.' : 'Browser storage is unavailable: progress lasts only for this visit. Export a save code to keep it.'}</p><div id="codeBox"></div></div>
      <div><h3>Settings</h3>${UI.settingsHTML()}</div>
      <div><h3>Controls</h3><p class="hint">PC: WASD/arrows move &middot; Shift run &middot; Mouse aims &middot; Left click / J attack (hold to charge) &middot; Space / right click dodge &middot; E interact &middot; Q ability &middot; 1-4 quick items &middot; I bag &middot; M map &middot; C skills &middot; L quests &middot; P creatures &middot; Esc menu.<br>Touch: left thumb moves (push fully to run), buttons on the right. Hold Attack to charge.</p></div></div>`;
  };
  UI.settingsHTML = function () {
    const S = PQ.Settings;
    const r = (k, label, min, max, step) => `<label class="set"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${S[k]}" data-set="${k}"></label>`;
    const c = (k, label) => `<label class="set chk"><input type="checkbox" ${S[k] ? 'checked' : ''} data-set="${k}"><span>${label}</span></label>`;
    return r('music', 'Music volume', 0, 1, 0.05) + r('sfx', 'Effects volume', 0, 1, 0.05) + c('mute', 'Mute all') + r('particles', 'Particle effects', 0.2, 1, 0.1) + r('zoom', 'Zoom', 0.8, 1.6, 0.1) + r('touchScale', 'Touch button size', 0.7, 1.4, 0.05) + c('lefty', 'Left-handed touch layout') + c('vibrate', 'Vibration') + c('shake', 'Screen shake') + c('fps', 'Show FPS');
  };

  /* =========================================================
     DIALOGUE & NPC TALK
     ========================================================= */
  UI.dialog = function (o) {
    UI.dlgOpen = true;
    UI.dlg = o;
    const d = $('dlg');
    d.hidden = false;
    d.innerHTML = `<div class="dbox">${o.portrait ? '<canvas id="dportrait" width="18" height="22"></canvas>' : ''}<div class="dmain"><b class="dname">${esc(o.name)}</b><p id="dtext"></p><div class="dopts">${(o.options || []).map((op, i) => btn(op.label, 'dopt', `data-i="${i}"`, op.cls || '')).join('')}</div></div></div>`;
    if (o.portrait) { const g = $('dportrait').getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(o.portrait, 0, 0); }
    const text = (o.text || '').replace(/\{name\}/g, G() && G().save ? G().save.name : 'hero');
    UI.typing = { text, i: 0 };
    clearInterval(UI.typeT);
    UI.typeT = setInterval(() => { const ty = UI.typing; if (!ty) return; ty.i += 2; $('dtext') && ($('dtext').textContent = ty.text.slice(0, ty.i)); if (ty.i >= ty.text.length) { clearInterval(UI.typeT); UI.typing = null; } if (ty.i % 6 === 0) PQ.Audio.play('ui'); }, 22);
    PQ.Input.clear();
  };
  UI.dlgAdvance = function () {
    if (UI.typing) { $('dtext').textContent = UI.typing.text; clearInterval(UI.typeT); UI.typing = null; return; }
    if (!UI.dlg.options || !UI.dlg.options.length) UI.dlgClose();
  };
  UI.dlgClose = function () {
    clearInterval(UI.typeT); UI.typing = null;
    $('dlg').hidden = true; UI.dlgOpen = false;
    const o = UI.dlg; UI.dlg = null;
    PQ.Input.clear();
    if (o && o.onClose) o.onClose();
  };
  const STORY = {
    maren: { m2: 'Tools first, {name}. Chop wood, gather stone, then craft a Stone Pickaxe at the workbench in your home. Mossy Hollow will not open its secrets to bare hands.', m3: 'The tremors come from Mossy Hollow, east of here. Whatever is down there, be careful.', m4: 'The Toad King was a symptom, not the cause. Seek Druid Sylva in the Darkwood to the west. She knows the old legends.', m9: 'The cold of Frostfall kills the unprepared. Wear a Fur Cloak before you climb the northern pass.', m12: 'Four sigils... You have done what the old heroes did. Go to the Ancient Gate north of the village.', m13: 'The Umbral Citadel waits beyond the portal. We are all with you, {name}.' },
    sylva: { m5: 'Long ago the Shadow Sovereign was sealed by four sigils, each guarded by a great spirit. The seal is cracking, and the guardians are going mad. The Forest Guardian holds the Verdant Sigil in Thornheart Temple, north-west of here.' },
    bram: { m6: 'Twelve planks and four iron bars, and I will have that bridge standing by sundown. Iron ore glitters in the Darkwood rocks; you will need a copper pickaxe.' },
    zeya: { m7: 'The Sunken Pyramid only opens for three Sun Tablets. They were hidden in the desert ruins: north-west, south-east and north-east of town. One ruin is sealed behind a cracked wall...', m8: 'The tablets fit! Whatever sleeps in the pyramid is ancient and enormous. Strike when it is stunned.' },
    ilsa: { m10: 'Our dragon guardian has gone mad. The Glacier Sanctum is north-west of Hearthpeak. Dodge through its breath, and strike when it lands.', m11: 'The Glacier Charm cools lava beneath your feet. Cross the burning moat to the east and find Forgemaster Brakka.' },
    brakka: { m11: 'You walked through lava? Ha! The Molten Titan sleeps in the Magma Forge to the north-east. Its fist gets stuck in the ground after a punch. Hit it then.' },
  };
  UI.talk = function (npc) {
    const s = G().save, d = npc.d, id = npc.id;
    PQ.Bus.emit('quest', 'talk', id, 1);
    const opts = [];
    const portrait = PQ.Spr.frame(npc.sheet, 'down', 'idle', 0);
    // turn-ins
    for (const qid in s.quests) {
      const qs = s.quests[qid], q = D.QUESTS[qid];
      if (qs.st === 'active' && q.giver === id && PQ.Quests.needsTurnIn(q)) {
        if (PQ.Quests.complete(q)) opts.push({ label: 'Turn in: ' + q.name, cls: 'gold', fn: () => { PQ.Quests.finish(qid); UI.dialog({ name: d.name, text: 'Wonderful, thank you! This will make all the difference.', portrait }); } });
        else opts.push({ label: 'About: ' + q.name, fn: () => UI.dialog({ name: d.name, text: q.desc + '  (' + PQ.Quests.currentObj(q) + ')', portrait, options: [{ label: 'Back', fn: () => UI.talk(npc) }] }) });
      }
    }
    for (const q of PQ.Quests.available(id)) opts.push({ label: 'Quest: ' + q.name, cls: 'gold', fn: () => UI.dialog({ name: d.name, text: q.desc, portrait, options: [{ label: 'Accept', cls: 'gold', fn: () => { PQ.Quests.start(q.id); UI.dlgClose(); } }, { label: 'Not now', fn: () => UI.dlgClose() }] }) });
    if (d.shop) opts.push({ label: 'Trade', fn: () => { UI.dlgClose(); UI.shop(d.shop); } });
    if (d.station) opts.push({ label: D.STATIONS[d.station], fn: () => { UI.dlgClose(); UI.craft(d.station); } });
    opts.push({ label: 'Bye', fn: () => UI.dlgClose() });
    // pick a line: story line for an active main quest, else idle chatter
    let text = null;
    const st = STORY[id];
    if (st) for (const qid in st) if (s.quests[qid] && s.quests[qid].st === 'active') text = st[qid];
    if (!text) { const T2 = D.TALK[id]; text = PQ.Time.isNight() && T2.night ? T2.night : U.pick(T2.idle); }
    if (id === 'maren' && s.quests.m2 && s.quests.m2.st === 'active' && !text.includes('Tools')) text = STORY.maren.m2;
    UI.dialog({ name: d.name + ' - ' + d.role, text, portrait, options: opts });
  };

  /* =========================================================
     SHOP
     ========================================================= */
  UI.shop = function (id, tab = 'buy') {
    UI.shopId = id; UI.shopTab = tab;
    const s = G().save, sh = D.SHOPS[id];
    let list = '';
    if (tab === 'buy') {
      for (const iid of sh.sells) {
        const d = D.ITEMS[iid]; if (!d) continue;
        const price = Math.ceil(d.value * (Inv.isEquip(d) ? 1.3 : 1.15)) + 1;
        const locked = d.lvl && s.lvl < d.lvl - 2;
        list += `<div class="sr">${icon(iid)}<div class="sn"><b>${esc(d.name)}</b><small>${esc(d.desc || '')}${d.lvl > 1 ? ' (Lv ' + d.lvl + ')' : ''}</small></div><b class="price">${price}g</b>${btn('Buy', 'buy', `data-k="${iid}" data-p="${price}" data-n="1"`, s.gold >= price && !locked ? 'gold' : '')}${d.stack > 1 ? btn('x5', 'buy', `data-k="${iid}" data-p="${price}" data-n="5"`) : ''}</div>`;
      }
    } else {
      s.inv.forEach((it, i) => {
        if (!it) return; const d = D.ITEMS[it.id]; if (d.type === 'quest' || d.type === 'tool' && it.id !== 'rod1') return;
        const price = Math.max(1, Math.floor(Inv.value(it) * 0.5));
        list += `<div class="sr">${icon(it.id)}<div class="sn"><b>${iname(it)}</b>${it.n > 1 ? `<small>x${it.n}</small>` : ''}</div><b class="price">${price}g</b>${btn('Sell', 'sell', `data-i="${i}" data-p="${price}" data-n="1"`, 'gold')}${it.n > 1 ? btn('All', 'sell', `data-i="${i}" data-p="${price}" data-n="${it.n}"`) : ''}</div>`;
      });
      if (!list) list = '<p class="hint">Nothing to sell.</p>';
    }
    UI.show('shop', `<h2>${esc(sh.name)}</h2><div class="tabs">${btn('Buy', 'shopTab', 'data-t="buy"', tab === 'buy' ? 'on' : '')}${btn('Sell', 'shopTab', 'data-t="sell"', tab === 'sell' ? 'on' : '')}<span class="goldtag">${U.fmt(s.gold)}g</span></div><div class="slist">${list}</div><div class="row">${btn('Close', 'close')}</div>`, 'wide tall');
  };

  /* =========================================================
     CRAFTING
     ========================================================= */
  UI.craft = function (station, selIdx) {
    UI.station = station;
    const s = G().save;
    const recs = PQ.Craft.list(s, station);
    UI.craftSel = selIdx != null ? selIdx : UI.craftSel != null && UI.craftSel < recs.length && UI.lastStation === station ? UI.craftSel : recs.findIndex((r) => PQ.Craft.can(s, r));
    UI.lastStation = station;
    if (UI.craftSel < 0) UI.craftSel = 0;
    let list = '';
    recs.forEach((r, i) => {
      const known = PQ.Craft.known(s, r), can = PQ.Craft.can(s, r);
      const d = D.ITEMS[r.out];
      list += `<button class="cr ${i === UI.craftSel ? 'sel' : ''} ${can ? 'can' : ''} ${known ? '' : 'unk'}" data-a="csel" data-i="${i}">${known ? icon(r.out) : '<span class="q">?</span>'}<span>${known ? esc(d.name) + (r.n > 1 ? ' x' + r.n : '') : 'Unknown recipe'}</span></button>`;
    });
    const r = recs[UI.craftSel];
    let det = '';
    if (r) {
      const d = D.ITEMS[r.out], known = PQ.Craft.known(s, r);
      if (!known) det = `<p class="hint">${r.lvl && s.lvl < r.lvl ? 'Requires level ' + r.lvl + '.' : 'Discover one of its materials to learn this recipe: ' + r.ins.map(([id]) => esc(D.ITEMS[id].name)).join(', ') + '.'}</p>`;
      else {
        det = `<div class="dhead">${icon(r.out, true)}<div><b>${esc(d.name)}</b>${r.n > 1 ? ' x' + r.n : ''}<br><small>${esc(d.desc || '')}</small></div></div>`;
        if (Inv.isEquip(d)) { const fake = { id: r.out, r: 0, aff: {} }; det += '<table class="st">' + UI.statLines(fake).map(([n, v]) => `<tr><td>${esc(n)}</td><td>${v}</td></tr>`).join('') + '</table><p class="hint">Crafted gear can roll Uncommon, Rare or even Epic.</p>'; }
        det += '<h4>Needs</h4><ul class="ins">' + r.ins.map(([id, n]) => { const have = Inv.count(s, id); return `<li class="${have >= n ? 'ok' : 'no'}">${icon(id)} ${esc(D.ITEMS[id].name)} <b>${have}/${n}</b></li>`; }).join('') + '</ul>';
        det += `<div class="acts">${btn('Craft', 'doCraft', '', PQ.Craft.can(s, r) ? 'gold' : '')}${!Inv.isEquip(d) ? btn('Craft x5', 'doCraft', 'data-n="5"') : ''}</div>`;
      }
    }
    UI.show('craft', `<h2>${esc(D.STATIONS[station])}</h2><div class="craft"><div class="clist">${list}</div><div class="cdet">${det}</div></div><div class="row">${btn('Close', 'close')}</div>`, 'wide tall');
  };

  /* ---------------- storage ---------------- */
  UI.storage = function () {
    const s = G().save;
    let a = '<div class="grid">'; s.inv.forEach((it, i) => (a += UI.cell(it, 'toStore', `data-i="${i}"`))); a += '</div>';
    let b = '<div class="grid">'; s.storage.forEach((it, i) => (b += UI.cell(it, 'fromStore', `data-i="${i}"`))); b += '</div>';
    UI.show('storage', `<h2>Storage chest</h2><p class="hint">Tap an item to move it. Stacks merge automatically.</p><div class="store"><div><h4>Bag</h4>${a}</div><div><h4>Chest</h4>${b}</div></div><div class="row">${btn('Store all materials', 'storeMats')}${btn('Close', 'close')}</div>`, 'wide tall');
  };

  /* ---------------- travel, seeds ---------------- */
  UI.travel = function () {
    const s = G().save, m = G().maps.world;
    const wps = m.objs.filter((o) => o.k === 'waypoint' && s.waypoints[o.wid]);
    const sh = G().maps.shadow ? G().maps.shadow.objs.filter((o) => o.k === 'waypoint' && s.waypoints[o.wid]) : [];
    const all = wps.map((o) => ['world', o]).concat(sh.map((o) => ['shadow', o]));
    UI.show('travel', `<h2>Waystone network</h2><p class="hint">Travel instantly between attuned waystones.</p><div class="slist">${all.map(([mid, o]) => `<div class="sr"><div class="sn"><b>${esc(o.name)}</b><small>${mid === 'shadow' ? 'Shadow Realm' : esc(D.REGIONS[m.region(o.x, o.y)].name)}</small></div>${btn('Travel', 'goWp', `data-m="${mid}" data-x="${o.x}" data-y="${o.y}"`, 'gold')}</div>`).join('')}</div><div class="row">${btn('Close', 'close')}</div>`, '');
  };
  UI.pickSeed = function (seeds, cb) {
    UI._seedCb = cb;
    UI.show('seeds', `<h3>Plant which seed?</h3><div class="slist">${seeds.map((id) => `<div class="sr">${icon(id)}<div class="sn"><b>${esc(D.ITEMS[id].name)}</b><small>x${Inv.count(G().save, id)}</small></div>${btn('Plant', 'plant', `data-k="${id}"`, 'gold')}</div>`).join('')}</div><div class="row">${btn('Cancel', 'close')}</div>`, 'small');
  };

  /* ---------------- ending ---------------- */
  UI.ending = function () {
    UI.show('ending', `<h2>The Seal is Restored</h2><p>The Shadow Sovereign falls, and light floods back into the realm. Across Willowbrook, Dunehaven, Hearthpeak and the Ember Outpost, people step outside to watch the sky clear.</p><p>Your journey is complete, ${esc(G().save.name)}, but the world is still yours to explore. Rumours speak of a <b>Light Shrine</b> in the Shadow Realm where a legendary creature waits...</p><p class="hint">Thank you for playing PIXEL QUEST.</p><div class="row">${btn('Continue exploring', 'close', '', 'gold')}</div>`, '');
  };

  /* touch hotbar */
  UI.updateTouchHot = function () {
    const s = G().save;
    for (let i = 0; i < 4; i++) {
      const b = $('th' + i); if (!b) continue;
      const id = s.hot[i], n = id ? Inv.count(s, id) : 0;
      const key = (id || '') + ':' + n;
      if (b._k === key) continue;
      b._k = key;
      b.innerHTML = id ? `${icon(id)}<i>${n}</i>` : '';
      b.classList.toggle('empty', !id || !n);
    }
  };

  /* =========================================================
     ACTIONS
     ========================================================= */
  const ACT = {
    close: () => UI.close(),
    cYes: () => { const y = UI._yes; UI._yes = null; UI.open = null; $('panel').className = 'panel-wrap'; $('panel').innerHTML = ''; if (y) y(); },
    cNo: () => { const n = UI._no; UI.close(); if (n) n(); },
    // title
    tNew: () => UI.slots('new'),
    tLoad: () => UI.slots('load'),
    tContinue: () => { const k = PQ.Save.latest(); if (k) PQ.Main.loadSlot(+k); },
    tChar: () => PQ.Main.preview('char'),
    tMap: () => PQ.Main.preview('map'),
    tColl: () => PQ.Main.preview('coll'),
    tSettings: () => UI.show('settings', `<h2>Settings</h2>${UI.settingsHTML()}<div class="row">${btn('Done', 'close', '', 'gold')}</div>`),
    tCredits: () => UI.show('credits', `<h2>Credits</h2><p><b>PIXEL QUEST: ULTIMATE RPG</b> v${PQ.VERSION}</p><p>Design, code, pixel art, music and sound effects were all generated procedurally in this single file: no external assets, libraries or fonts. The pixel font is built into a real TrueType font at runtime.</p><p>Built with HTML5 Canvas, Web Audio and vanilla JavaScript.</p><div class="row">${btn('Back', 'close', '', 'gold')}</div>`),
    slotNew: (d) => { const go = () => UI.creator(false, +d.s); if (PQ.Save.meta()[d.s]) UI.confirm('Overwrite this save slot? The old progress will be lost.', go, () => UI.slots('new')); else go(); },
    slotLoad: (d) => PQ.Main.loadSlot(+d.s),
    slotDel: (d) => UI.confirm('Delete this save permanently?', () => { PQ.Save.del(+d.s); UI.slots('load'); }, () => UI.slots('load')),
    // creator
    crPrev: (d) => { UI.cr.look[d.k] = (UI.cr.look[d.k] - 1 + +d.n) % +d.n; UI.renderCreator(); },
    crNext: (d) => { UI.cr.look[d.k] = (UI.cr.look[d.k] + 1) % +d.n; UI.renderCreator(); },
    crCol: (d) => { UI.cr.look[d.k] = d.v; UI.renderCreator(); },
    crSkin: (d) => { UI.cr.look.skin = +d.v; UI.renderCreator(); },
    crRand: () => { UI.cr.look = UI.randLook(); UI.renderCreator(); },
    crOk: () => {
      const c = UI.cr;
      if (c.mirror) { const s = G().save; s.look = Object.assign({}, c.look); G().player.setLook(s.look); UI.cr = null; UI.close(); G().autosave(); PQ.UI.toast('Looking good!'); return; }
      const nameEl = $('crName'); const name = (nameEl ? nameEl.value : c.name).replace(/[^A-Za-z0-9 _'-]/g, '').trim().slice(0, 14) || 'Hero';
      UI.cr = null; UI.open = null; $('panel').className = 'panel-wrap'; $('panel').innerHTML = '';
      PQ.Main.newGame(c.slot, name, c.look);
    },
    // menu
    tab: (d) => { UI.sel = null; UI.menu(d.t); PQ.Audio.play('ui'); },
    selInv: (d) => { const i = +d.i; const s = G().save; if (UI.sel && UI.sel.src === 'inv' && UI.sel.i === i && s.inv[i]) { const dd = D.ITEMS[s.inv[i].id]; if (Inv.isEquip(dd)) return ACT.equip(); if (dd.use) return ACT.use(); } UI.sel = s.inv[i] ? { src: 'inv', i } : null; UI.refresh(); },
    selEq: (d) => { const s = G().save; if (UI.sel && UI.sel.src === 'eq' && UI.sel.k === d.k && s.eq[d.k]) return ACT.unequip(); UI.sel = s.eq[d.k] ? { src: 'eq', k: d.k } : null; UI.refresh(); },
    equip: () => {
      const s = G().save, it = s.inv[UI.sel.i], d = D.ITEMS[it.id];
      if (d.lvl && s.lvl < d.lvl) { UI.toast('Requires level ' + d.lvl + '.'); PQ.Audio.play('fail'); return; }
      const k = slotOf(d); s.inv[UI.sel.i] = s.eq[k]; s.eq[k] = it; UI.sel = { src: 'eq', k };
      G().recalc(); PQ.Audio.play('ui'); UI.refresh();
    },
    unequip: () => { const s = G().save, k = UI.sel.k, i = s.inv.findIndex((x) => !x); if (i < 0) { UI.toast('Your bag is full.'); return; } s.inv[i] = s.eq[k]; s.eq[k] = null; UI.sel = { src: 'inv', i }; G().recalc(); UI.refresh(); },
    use: () => { const s = G().save, it = s.inv[UI.sel.i]; if (G().useItem(it.id)) { if (!s.inv[UI.sel.i]) UI.sel = null; } UI.refresh(); },
    hot: (d) => { const s = G().save, id = s.inv[UI.sel.i].id; s.hot = s.hot.map((h) => (h === id ? null : h)); s.hot[+d.i] = id; UI.refresh(); },
    drop: () => {
      const s = G().save, i = UI.sel.i, it = s.inv[i];
      const go = () => { s.inv[i] = null; G().dropItem(it.id, it.n, Inv.isEquip(D.ITEMS[it.id]) ? it : null, G().player.x, G().player.y + 12); UI.sel = null; UI.refresh(); };
      if (Inv.isEquip(D.ITEMS[it.id]) && it.r >= 2) UI.confirm('Drop ' + D.ITEMS[it.id].name + '? You can pick it back up.', () => { go(); UI.menu('bag'); }, () => UI.menu('bag')); else go();
    },
    place: () => {
      const g = G(), s = g.save, it = s.inv[UI.sel.i];
      if (g.map.id !== 'home') { UI.toast('Decorations can only be placed inside your home.'); return; }
      const p = g.player, dir = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[p.face];
      const x = Math.floor(p.x / PQ.T) + dir[0], y = Math.floor((p.y - 2) / PQ.T) + dir[1];
      if (g.map.t(x, y) !== PQ.TILE.WOOD && g.map.t(x, y) !== PQ.TILE.CARPET || g.map.obj(x, y)) { UI.toast('Face an empty spot on the floor to place it.'); return; }
      const dec = D.ITEMS[it.id].decor;
      Inv.remove(s, it.id, 1); s.home.decor.push({ decor: dec, x, y }); g.placeDecor(); UI.sel = null; UI.close(); UI.toast('Placed! Interact with it to pick it up again.'); g.autosave();
    },
    learn: (d) => { if (PQ.Skills.learn(d.k)) UI.refresh(); else { PQ.Audio.play('fail'); UI.toast('Not enough skill points, or prerequisites missing.'); } },
    setAbility: (d) => { G().save.ability = d.k; UI.refresh(); },
    qsel: (d) => { UI.qsel = d.k; UI.refresh(); },
    qpin: (d) => { G().save.pinned = d.k; UI.refresh(); },
    setPet: (d) => { PQ.Creatures.setActive(G(), d.k); UI.refresh(); },
    travel: () => UI.travel(),
    goWp: (d) => { UI.close(); G().enterMap(d.m, { x: +d.x * PQ.T + 8, y: (+d.y + 2) * PQ.T + 6 }); },
    saveNow: () => { const ok = G().autosave(); UI.toast(ok ? 'Game saved.' : 'Could not save: browser storage is unavailable. Use Export save code.'); },
    export: () => { const code = PQ.Save.exportCode(G().save); $('codeBox').innerHTML = `<textarea readonly rows="3">${esc(code)}</textarea><p class="hint">Copy this code somewhere safe. Import it from the title screen's Load menu (slot import below the slots) if your browser storage is cleared.</p>`; const ta = $('codeBox').querySelector('textarea'); ta.focus(); ta.select(); },
    quit: () => UI.confirm('Quit to the title screen? Your progress will be saved first.', () => PQ.Main.toTitle(), () => UI.menu('system')),
    dopt: (d) => { const o = UI.dlg.options[+d.i]; if (o && o.fn) o.fn(); },
    // shop
    shopTab: (d) => UI.shop(UI.shopId, d.t),
    buy: (d) => {
      const s = G().save, n = +d.n, cost = +d.p * n;
      if (s.gold < cost) { UI.toast('Not enough gold.'); PQ.Audio.play('fail'); return; }
      const dd = D.ITEMS[d.k];
      const left = Inv.add(s, d.k, n, Inv.isEquip(dd) ? Inv.make(d.k, { r: 0 }) : null);
      if (left === n) { UI.toast('Your bag is full.'); return; }
      s.gold -= +d.p * (n - left); PQ.Audio.play('buy'); UI.refresh();
    },
    sell: (d) => { const s = G().save, i = +d.i, it = s.inv[i]; if (!it) return; const n = Math.min(+d.n, it.n); s.gold += +d.p * n; it.n -= n; if (it.n <= 0) s.inv[i] = null; PQ.Audio.play('sell'); UI.refresh(); },
    // craft
    csel: (d) => UI.craft(UI.station, +d.i),
    doCraft: (d) => {
      const s = G().save, r = PQ.Craft.list(s, UI.station)[UI.craftSel];
      let n = +(d.n || 1), made = 0, last = null;
      while (n-- > 0 && PQ.Craft.can(s, r)) { last = PQ.Craft.craft(s, r); made++; }
      if (!made) { UI.toast('Missing materials.'); PQ.Audio.play('fail'); return; }
      UI.toast('Crafted ' + D.ITEMS[r.out].name + (made > 1 ? ' x' + made : '') + (last && last.r ? ' (' + D.RARITY[last.r].name + '!)' : ''), last && last.r >= 2 ? 'r' + last.r : '');
      UI.craft(UI.station, UI.craftSel);
    },
    // storage
    toStore: (d) => { const s = G().save, it = s.inv[+d.i]; if (!it) return; if (D.ITEMS[it.id].type === 'quest') { UI.toast('Keep quest items with you.'); return; } if (moveTo(s.storage, it)) s.inv[+d.i] = null; else UI.toast('The chest is full.'); UI.storage(); },
    fromStore: (d) => { const s = G().save, it = s.storage[+d.i]; if (!it) return; if (moveTo(s.inv, it)) s.storage[+d.i] = null; else UI.toast('Your bag is full.'); UI.storage(); },
    storeMats: () => { const s = G().save; s.inv.forEach((it, i) => { if (it && D.ITEMS[it.id].type === 'material' && moveTo(s.storage, it)) s.inv[i] = null; }); UI.storage(); },
    plant: (d) => { const cb = UI._seedCb; UI._seedCb = null; UI.open = null; $('panel').className = 'panel-wrap'; $('panel').innerHTML = ''; if (cb) cb(d.k); },
    imp: () => { const ta = $('impCode'); try { const o = PQ.Save.importCode(ta.value, +$('impSlot').value); PQ.Save.write(o); UI.toast('Save imported into slot ' + o.slot + '.'); UI.slots('load'); } catch (e) { UI.toast(e.message, 'warn'); } },
  };
  function moveTo(arr, it) {
    const d = D.ITEMS[it.id];
    if (!Inv.isEquip(d)) {
      for (const s of arr) if (s && s.id === it.id && s.n < d.stack) { const k = Math.min(it.n, d.stack - s.n); s.n += k; it.n -= k; if (!it.n) return true; }
    }
    const i = arr.findIndex((x) => !x);
    if (i < 0) return false;
    arr[i] = it; return true;
  }
  UI.ACT = ACT;
})();
