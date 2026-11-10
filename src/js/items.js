/* SHATTERPOINT — items, loot generation, upgrades and loadout stats */
'use strict';
(function () {
  const U = SP.U;
  const PREFIX = [
    ['Standard', 'Issue', 'Basic', 'Field'],
    ['Tuned', 'Honed', 'Refit', 'Calibrated'],
    ['Vanta', 'Cobalt', 'Arc', 'Helix', 'Tempest'],
    ['Nightfall', 'Voidglass', 'Seraph', 'Eclipse', 'Quantum'],
    ['Shatterpoint', 'Godspark', 'Zenith', 'Paragon', 'Aurora'],
  ];
  const ARMOR_NOUN = { head: 'Visor', torso: 'Chassis', arms: 'Bracers', legs: 'Greaves', feet: 'Treads' };
  const ARMOR_STYLE_POOL = {
    head: ['visor', 'band', 'helm', 'crest', 'hood', 'mask'],
    torso: ['runner', 'plate', 'coat', 'core', 'tank'],
    arms: ['wraps', 'guards', 'plated', 'cyber'],
    legs: ['cargo', 'sleek', 'plated'],
    feet: ['boots', 'greaves', 'hover'],
  };

  const Items = {
    makeWeapon(family, rarity) {
      const R = SP.RARITY[rarity];
      const it = { id: U.uid(), kind: 'weapon', family, rarity, level: 1, stats: {}, mods: [] };
      const keys = Object.keys(SP.WSTATS);
      for (let i = 0; i < R.stats; i++) {
        const k = U.pick(keys.filter((x) => !(x in it.stats)));
        const r = SP.WSTATS[k].roll;
        it.stats[k] = +(U.rand(r[0], r[1]) * (1 + rarity * 0.12)).toFixed(3);
      }
      const mk = Object.keys(SP.MODS);
      for (let i = 0; i < R.mods; i++) it.mods.push(U.pick(mk.filter((x) => !it.mods.includes(x))));
      if (R.legendary) it.mods.push(U.pick(Object.keys(SP.LEGENDARY_MODS)));
      it.name = U.pick(PREFIX[rarity]) + ' ' + SP.WEAPONS[family].name;
      return it;
    },

    makeArmor(slot, rarity) {
      const R = SP.RARITY[rarity];
      const it = { id: U.uid(), kind: 'armor', slot, rarity, level: 1, stats: {}, mods: [] };
      const keys = Object.keys(SP.ASTATS).filter((k) => !(k in SP.SLOT_BASE[slot].main));
      for (let i = 0; i < R.stats + (rarity >= 3 ? 1 : 0); i++) {
        const k = U.pick(keys.filter((x) => !(x in it.stats)));
        const r = SP.ASTATS[k].roll;
        it.stats[k] = +(U.rand(r[0], r[1]) * (1 + rarity * 0.12)).toFixed(3);
      }
      it.style = U.pick(ARMOR_STYLE_POOL[slot]);
      it.name = U.pick(PREFIX[rarity]) + ' ' + ARMOR_NOUN[slot];
      return it;
    },

    starterKit() {
      const k = Items.makeWeapon('katana', 0); k.name = 'Rookie Plasma Katana';
      const g = Items.makeWeapon('gauntlets', 0); g.name = 'Rookie Combat Gauntlets';
      const t = Items.makeArmor('torso', 0); t.style = 'runner'; t.name = 'Rookie Chassis';
      const f = Items.makeArmor('feet', 0); f.style = 'boots'; f.name = 'Rookie Treads';
      return [k, g, t, f];
    },

    ensureStarter(save) {
      if (!save.inventory.length) {
        save.inventory = Items.starterKit();
        save.equipped.weapon = save.inventory[0].id;
        save.equipped.torso = save.inventory[2].id;
        save.equipped.feet = save.inventory[3].id;
      }
      // repair dangling equip references
      for (const k in save.equipped) {
        if (save.equipped[k] && !save.inventory.find((i) => i.id === save.equipped[k])) save.equipped[k] = null;
      }
      if (!save.equipped.weapon) {
        const w = save.inventory.find((i) => i.kind === 'weapon');
        if (w) save.equipped.weapon = w.id;
        else { const nw = Items.makeWeapon('katana', 0); save.inventory.push(nw); save.equipped.weapon = nw.id; }
      }
      const owned = save.abilities.owned;
      save.abilities.slots = save.abilities.slots.slice(0, 2).map((s) => (s && owned[s] ? s : null));
      while (save.abilities.slots.length < 2) save.abilities.slots.push(null);
    },

    get(save, id) { return save.inventory.find((i) => i.id === id) || null; },
    ownedFamilies(save) { return [...new Set(save.inventory.filter((i) => i.kind === 'weapon').map((i) => i.family))]; },

    /* level scaling */
    levelMult(it) { return 1 + (it.level - 1) * (it.kind === 'weapon' ? 0.05 : 0.08); },

    weaponPower(it) { return SP.RARITY[it.rarity].mult * Items.levelMult(it); },

    armorStats(it) {
      const out = {};
      const m = SP.RARITY[it.rarity].mult * Items.levelMult(it);
      const main = SP.SLOT_BASE[it.slot].main;
      for (const k in main) out[k] = (out[k] || 0) + main[k] * m;
      for (const k in it.stats) out[k] = (out[k] || 0) + it.stats[k] * Items.levelMult(it);
      return out;
    },

    /* list of {label, value} lines for display */
    describe(it) {
      const lines = [];
      if (it.kind === 'weapon') {
        lines.push({ k: 'power', label: 'Damage', value: Math.round(Items.weaponPower(it) * 100), fmt: (v) => v + '%' });
        for (const k in it.stats) lines.push({ k, label: SP.WSTATS[k].name, value: it.stats[k] * Items.levelMult(it), fmt: SP.WSTATS[k].fmt });
      } else {
        const s = Items.armorStats(it);
        for (const k in s) lines.push({ k, label: SP.ASTATS[k].name, value: s[k], fmt: SP.ASTATS[k].fmt });
      }
      return lines;
    },

    modInfo(id) { return SP.MODS[id] || SP.LEGENDARY_MODS[id]; },

    upgradeCost(it) {
      const r = 1 + it.rarity * 0.5;
      return { credits: Math.round(90 * it.level * r), shards: Math.round(4 * it.level * (1 + it.rarity * 0.6)) };
    },
    canUpgrade(save, it) {
      if (it.level >= SP.RARITY[it.rarity].maxLevel) return false;
      const c = Items.upgradeCost(it);
      return save.credits >= c.credits && save.shards >= c.shards;
    },
    upgrade(save, it) {
      if (!Items.canUpgrade(save, it)) return false;
      const c = Items.upgradeCost(it);
      save.credits -= c.credits; save.shards -= c.shards; it.level++;
      return true;
    },
    salvageValue(it) { return { shards: Math.round(3 * (it.rarity + 1) * (it.rarity + 1) + it.level * 2), credits: 25 * (it.rarity + 1) }; },
    isEquipped(save, it) { return Object.values(save.equipped).includes(it.id); },
    salvage(save, it) {
      if (Items.isEquipped(save, it)) return false;
      const v = Items.salvageValue(it);
      save.shards += v.shards; save.credits += v.credits;
      save.inventory = save.inventory.filter((x) => x !== it);
      return true;
    },

    /* rarity roll for loot. tier: 1..3 sector, plus level gating */
    rollRarity(tier, level, bonus = 0) {
      const w = [
        [0, Math.max(5, 55 - tier * 12 - bonus * 10)],
        [1, 30],
        [2, 12 + tier * 5 + bonus * 6],
        [3, (level >= 6 || tier >= 2) ? 3 + tier * 2.5 + bonus * 3 : 0.5],
        [4, level >= 8 ? 0.6 + tier * 0.9 + bonus * 1.5 : 0],
      ];
      return U.weighted(w);
    },
    rollDrop(save, tier, bonus = 0, minRarity = 0) {
      const rarity = Math.max(minRarity, Items.rollRarity(tier, save.level, bonus));
      if (U.chance(0.4)) {
        const fams = SP.WEAPON_ORDER.filter((f) => save.level >= SP.SHOP_WEAPONS[f].level);
        return Items.makeWeapon(U.pick(fams), rarity);
      }
      return Items.makeArmor(U.pick(SP.SLOTS), rarity);
    },

    /* aggregate player stats from equipment, abilities and mastery */
    loadout(save, forcedWeaponFamily) {
      let w = Items.get(save, save.equipped.weapon);
      if (forcedWeaponFamily && (!w || w.family !== forcedWeaponFamily)) {
        // best owned of that family, or a loaner
        const owned = save.inventory.filter((i) => i.kind === 'weapon' && i.family === forcedWeaponFamily).sort((a, b) => Items.weaponPower(b) - Items.weaponPower(a));
        w = owned[0] || Object.assign(Items.makeWeapon(forcedWeaponFamily, 0), { name: 'Loaner ' + SP.WEAPONS[forcedWeaponFamily].name, loaner: true });
      }
      const st = { hp: 200, def: 0, guard: 0, speed: 0, cdr: 0, momentum: 0, dodge: 0 };
      for (const slot of SP.SLOTS) {
        const a = Items.get(save, save.equipped[slot]);
        if (!a) continue;
        const s = Items.armorStats(a);
        for (const k in s) st[k] += s[k];
      }
      st.def = Math.min(st.def, 0.35);
      st.cdr = Math.min(st.cdr, 0.35);
      const mods = new Set(w.mods);
      const ws = {};
      for (const k in w.stats) ws[k] = w.stats[k] * Items.levelMult(w);
      const mLvl = Items.masteryLevel(save.mastery[w.family] || 0);
      return {
        weaponItem: w, family: w.family, power: Items.weaponPower(w), wstats: ws, mods,
        hp: Math.round(st.hp), def: st.def, guardBonus: st.guard, speed: st.speed, cdr: st.cdr,
        momentumGain: st.momentum + (mods.has('surge') ? 0.25 : 0), dodgeRecharge: st.dodge,
        mastery: mLvl,
        abilities: save.abilities.slots.map((id) => (id ? { id, mk: save.abilities.owned[id] || 1 } : null)),
      };
    },

    masteryLevel(xp) {
      let l = 1;
      for (let i = 0; i < SP.MASTERY_LEVELS.length; i++) if (xp >= SP.MASTERY_LEVELS[i]) l = i + 1;
      return l;
    },
  };
  SP.Items = Items;
})();
