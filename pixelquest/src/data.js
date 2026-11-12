/* PIXEL QUEST — game data: items, recipes, enemies, bosses, creatures, NPCs, quests, skills */
'use strict';
(function () {
  const D = (PQ.D = {});

  /* ---------------- rarities ---------------- */
  D.RARITY = [
    { name: 'Common', color: '#c8ccd8', mult: 1.0, affixes: 0 },
    { name: 'Uncommon', color: '#5fdc6a', mult: 1.12, affixes: 1 },
    { name: 'Rare', color: '#4aa8ff', mult: 1.25, affixes: 2 },
    { name: 'Epic', color: '#c070ff', mult: 1.4, affixes: 3 },
    { name: 'Legendary', color: '#ffb52e', mult: 1.6, affixes: 3, passive: 1 },
    { name: 'Mythic', color: '#ff4f7a', mult: 1.85, affixes: 4, passive: 1 },
  ];
  D.STATS = {
    atk: { name: 'Attack', fmt: (v) => '+' + Math.round(v) },
    def: { name: 'Defense', fmt: (v) => '+' + Math.round(v) },
    hp: { name: 'Max HP', fmt: (v) => '+' + Math.round(v) },
    mp: { name: 'Max Mana', fmt: (v) => '+' + Math.round(v) },
    sta: { name: 'Max Stamina', fmt: (v) => '+' + Math.round(v) },
    crit: { name: 'Crit chance', fmt: (v) => '+' + Math.round(v) + '%' },
    spd: { name: 'Move speed', fmt: (v) => '+' + Math.round(v) + '%' },
    fire: { name: 'Fire resist', fmt: (v) => '+' + Math.round(v) + '%' },
    ice: { name: 'Frost resist', fmt: (v) => '+' + Math.round(v) + '%' },
    shadow: { name: 'Shadow resist', fmt: (v) => '+' + Math.round(v) + '%' },
    regen: { name: 'HP regen', fmt: (v) => '+' + v.toFixed(1) + '/s' },
  };
  D.PASSIVES = {
    lifesteal: { name: 'Vampiric', desc: 'Heal 4% of damage you deal.' },
    burn: { name: 'Searing', desc: 'Hits set enemies on fire.' },
    chill: { name: 'Frostbite', desc: 'Hits slow enemies.' },
    shock: { name: 'Stormcall', desc: '20% chance to arc lightning to a nearby enemy.' },
    swift: { name: 'Zephyr', desc: '+10% speed, dodge rolls cost 30% less stamina.' },
    bulwark: { name: 'Bulwark', desc: '+25% defense.' },
    treasure: { name: 'Fortune', desc: '+30% gold and better loot chance.' },
    wave: { name: 'Moonwave', desc: 'Melee swings at full health launch a crescent wave.' },
    echo: { name: 'Echo', desc: 'Every 4th hit deals double damage.' },
    arcane: { name: 'Arcane Flow', desc: 'Defeating enemies restores 6 mana.' },
  };

  /* ---------------- items ---------------- */
  const I = (D.ITEMS = {});
  const add = (id, o) => { I[id] = Object.assign({ id, stack: 99, value: 1, desc: '' }, o); };
  // materials
  [['wood', 'Wood', 'log', 2, 'Sturdy timber from any tree.'], ['plank', 'Plank', 'plank', 4, 'Cut and smoothed wood.'], ['stone', 'Stone', 'rock', 1, 'Common stone.'],
    ['fiber', 'Plant Fiber', 'fiber', 1, 'Tough strands from tall grass and bushes.'], ['slime_gel', 'Slime Gel', 'gel', 3, 'Wobbly and surprisingly useful.', { color: '#6fd860' }],
    ['pelt', 'Pelt', 'pelt', 6, 'A thick animal hide.', { color: '#7a6a5a' }], ['frost_pelt', 'Frost Pelt', 'pelt', 14, 'Snow-white fur that holds warmth.', { color: '#e8f0ff' }],
    ['bone', 'Bone', 'bone', 4, 'Brittle but strong.'], ['feather', 'Feather', 'feather', 4, 'Light as air.', { color: '#e8e0d0' }], ['silk', 'Spider Silk', 'silk', 8, 'Strong, fine thread.'],
    ['copper_ore', 'Copper Ore', 'ore', 4, 'Reddish ore. Smelt at a forge.', { mat: 'copper' }], ['iron_ore', 'Iron Ore', 'ore', 8, 'Dense grey ore.', { mat: 'iron' }],
    ['gold_ore', 'Gold Ore', 'ore', 14, 'Glittering ore.', { mat: 'gold' }], ['frost_ore', 'Frostsilver Ore', 'ore', 22, 'Cold to the touch. Needs an iron pickaxe.', { mat: 'frost' }],
    ['ember_ore', 'Emberite Ore', 'ore', 32, 'Warm, humming ore. Needs a frostsilver pickaxe.', { mat: 'ember' }], ['void_shard', 'Void Shard', 'shard', 45, 'A sliver of the Shadow Realm.', { mat: 'void' }],
    ['copper_bar', 'Copper Bar', 'bar', 10, 'Smelted copper.', { mat: 'copper' }], ['iron_bar', 'Iron Bar', 'bar', 20, 'Smelted iron.', { mat: 'iron' }], ['gold_bar', 'Gold Bar', 'bar', 34, 'Smelted gold.', { mat: 'gold' }],
    ['frost_bar', 'Frostsilver Bar', 'bar', 50, 'Never melts.', { mat: 'frost' }], ['ember_bar', 'Emberite Bar', 'bar', 72, 'Glows faintly.', { mat: 'ember' }], ['void_bar', 'Voidsteel Bar', 'bar', 100, 'Drinks the light.', { mat: 'void' }],
    ['ruby', 'Ruby', 'gem', 60, 'A fiery gemstone.', { mat: 'ember' }], ['sapphire', 'Sapphire', 'gem', 60, 'A cool blue gemstone.', { mat: 'frost' }], ['amethyst', 'Amethyst', 'gem', 80, 'Hums with shadow.', { mat: 'void' }],
    ['ancient_wood', 'Ancient Wood', 'log', 20, 'Heartwood from a Darkwood giant. Needs an iron axe.'], ['ember_core', 'Ember Core', 'gem', 40, 'Still burning.', { mat: 'ember' }],
    ['dragon_scale', 'Dragon Scale', 'shard', 120, 'Shed by the Frost Dragon.', { mat: 'frost' }], ['shadow_essence', 'Shadow Essence', 'gel', 60, 'Writhing darkness.', { color: '#7552ad' }],
    ['sand_glass', 'Sandglass', 'gem', 12, 'Fused desert sand.', { mat: 'sun' }],
  ].forEach(([id, name, icon, value, desc, extra]) => add(id, Object.assign({ name, type: 'material', icon, value, desc }, extra || {})));
  // herbs & forage
  [['greenleaf', 'Greenleaf', '#64d86a', 3, 'A common healing herb.'], ['moonpetal', 'Moonpetal', '#c8b8ff', 8, 'Glows under moonlight. Darkwood.'], ['sunbloom', 'Sunbloom', '#ffcf4a', 10, 'Thrives in the desert heat.'],
    ['frostbloom', 'Frostbloom', '#8fe0ff', 14, 'Blooms in the snow.'], ['fireroot', 'Fireroot', '#ff6a2e', 18, 'Smoulders even when picked.']].forEach(([id, name, color, value, desc]) => add(id, { name, type: 'material', icon: 'herb', color, value, desc }));
  add('glowcap', { name: 'Glowcap', type: 'material', icon: 'mushroom', color: '#9a6aff', value: 6, desc: 'A softly glowing mushroom.' });
  add('berry', { name: 'Wild Berry', type: 'consumable', icon: 'food', liquid: '#4a50e8', value: 2, use: { heal: 8 }, desc: 'Restores 8 HP.' });
  // crops & seeds
  D.CROPS = {
    turnip: { name: 'Turnip', days: 2, color: '#f2e8f2', shape: 'root', value: 18, seed: 10 },
    carrot: { name: 'Carrot', days: 3, color: '#ff8a2e', shape: 'root', value: 26, seed: 15 },
    wheat: { name: 'Wheat', days: 3, color: '#e8c050', shape: 'grain', value: 22, seed: 12 },
    tomato: { name: 'Tomato', days: 4, color: '#e8363c', shape: 'fruit', value: 34, seed: 22, regrow: 2 },
    pumpkin: { name: 'Pumpkin', days: 6, color: '#ff8a1e', shape: 'big', value: 90, seed: 45 },
    sunmelon: { name: 'Sunmelon', days: 5, color: '#ffd34d', shape: 'big', value: 80, seed: 40 },
    frostberry: { name: 'Frostberry', days: 4, color: '#8fd4ff', shape: 'bush', value: 48, seed: 30, regrow: 2 },
    firepepper: { name: 'Fire Pepper', days: 4, color: '#ff3a1e', shape: 'pepper', value: 55, seed: 34 },
  };
  for (const k in D.CROPS) {
    const c = D.CROPS[k];
    add(k, { name: c.name, type: 'crop', icon: 'crop', color: c.color, shape: c.shape, value: c.value, use: { heal: Math.round(c.value / 3) }, desc: 'Fresh produce. Restores ' + Math.round(c.value / 3) + ' HP. Cook for better effects.' });
    add(k + '_seed', { name: c.name + ' Seeds', type: 'seed', icon: 'seed', color: c.color, value: Math.round(c.seed / 2), crop: k, desc: 'Plant in tilled soil. Ready in ' + c.days + ' days if watered daily.' + (c.regrow ? ' Regrows.' : '') });
  }
  // fish
  D.FISH = [
    { id: 'minnow', name: 'Silver Minnow', color: '#c8d8e8', rar: 0, diff: 1, region: ['greenfields', 'darkwood'], value: 12 },
    { id: 'perch', name: 'River Perch', color: '#8ab04a', rar: 0, diff: 2, region: ['greenfields'], value: 20 },
    { id: 'trout', name: 'Rainbow Trout', color: '#ff9ab0', rar: 1, diff: 3, region: ['greenfields', 'frostfall'], value: 40 },
    { id: 'catfish', name: 'Mud Catfish', color: '#6a5a3a', rar: 1, diff: 3, region: ['darkwood'], value: 45, night: true },
    { id: 'glowfin', name: 'Glowfin', color: '#9dffd0', rar: 2, diff: 4, region: ['darkwood'], value: 80, night: true },
    { id: 'sandeel', name: 'Oasis Eel', color: '#d6a75f', rar: 1, diff: 4, region: ['sunscorch'], value: 55 },
    { id: 'sunfish', name: 'Sunfish', color: '#ffcf4a', rar: 2, diff: 4, region: ['sunscorch'], value: 90 },
    { id: 'icecod', name: 'Ice Cod', color: '#a8d0f0', rar: 1, diff: 4, region: ['frostfall'], value: 60 },
    { id: 'crystalkoi', name: 'Crystal Koi', color: '#e6faff', rar: 3, diff: 6, region: ['frostfall'], value: 180 },
    { id: 'magmaray', name: 'Magma Ray', color: '#ff6a1e', rar: 2, diff: 5, region: ['volcanic'], value: 130 },
    { id: 'voidangler', name: 'Void Angler', color: '#7552ad', rar: 3, diff: 7, region: ['shadow'], value: 260 },
    { id: 'goldkoi', name: 'Golden Koi', color: '#ffd75a', rar: 4, diff: 8, region: ['greenfields', 'darkwood', 'sunscorch', 'frostfall'], value: 500, rare: true },
  ];
  D.FISH.forEach((f) => add(f.id, { name: f.name, type: 'fish', icon: 'fish', color: f.color, value: f.value, use: { heal: Math.round(f.value / 4) }, desc: 'A catch from the waters. Cook it for a meal.', fishRar: f.rar }));
  // consumables
  const potion = (id, name, liquid, value, use, desc) => add(id, { name, type: 'consumable', icon: 'potion', liquid, value, use, desc });
  potion('hp_small', 'Health Tonic', '#e8363c', 20, { heal: 40 }, 'Restores 40 HP.');
  potion('hp_large', 'Health Draught', '#ff4f7a', 60, { heal: 120 }, 'Restores 120 HP.');
  potion('hp_mega', 'Phoenix Elixir', '#ffb52e', 160, { heal: 400 }, 'Restores 400 HP.');
  potion('mp_small', 'Mana Tonic', '#3f97d6', 25, { mana: 40 }, 'Restores 40 mana.');
  potion('mp_large', 'Mana Draught', '#7a5cff', 70, { mana: 120 }, 'Restores 120 mana.');
  potion('sta_tonic', 'Stamina Brew', '#64d86a', 30, { buff: { id: 'stamina', dur: 60 } }, 'Stamina regenerates twice as fast for 60s.');
  potion('fire_tonic', 'Cooling Draught', '#8fe0ff', 50, { buff: { id: 'fireres', dur: 180 } }, '+40% fire resist for 3 minutes.');
  potion('frost_tonic', 'Warming Draught', '#ff8a2e', 50, { buff: { id: 'iceres', dur: 180 } }, '+40% frost resist for 3 minutes.');
  const food = (id, name, shape, liquid, value, use, desc) => add(id, { name, type: 'consumable', icon: 'food', shape, liquid, value, use, desc });
  food('bread', 'Farm Bread', 'bread', '#d8a860', 30, { heal: 50 }, 'Restores 50 HP.');
  food('veg_stew', 'Garden Stew', 'bowl', '#c8603a', 60, { heal: 90, buff: { id: 'regen', dur: 90 } }, 'Restores 90 HP and regenerates health for 90s.');
  food('fish_skewer', 'Fish Skewer', 'skewer', '#e8a060', 45, { heal: 70 }, 'Restores 70 HP.');
  food('pumpkin_pie', 'Pumpkin Pie', 'bread', '#ff8a1e', 140, { heal: 150, buff: { id: 'might', dur: 120 } }, 'Restores 150 HP and +15% damage for 2 minutes.');
  food('spicy_curry', 'Spicy Curry', 'bowl', '#ff3a1e', 120, { heal: 100, buff: { id: 'fireres', dur: 300 } }, 'Restores 100 HP and +40% fire resist for 5 minutes.');
  food('melon_juice', 'Sunmelon Juice', 'round', '#ffd34d', 110, { heal: 60, mana: 60, buff: { id: 'swift', dur: 120 } }, 'Restores HP and mana, +12% speed for 2 minutes.');
  food('frost_sorbet', 'Frostberry Sorbet', 'bowl', '#8fd4ff', 120, { heal: 80, buff: { id: 'iceres', dur: 300 } }, 'Restores 80 HP and +40% frost resist for 5 minutes.');
  food('sushi', 'Golden Sushi', 'round', '#ffd75a', 400, { heal: 300, mana: 100, buff: { id: 'might', dur: 300 } }, 'A feast: big heal, mana and +15% damage for 5 minutes.');
  add('arrow', { name: 'Arrows', type: 'ammo', icon: 'arrow', value: 1, stack: 999, desc: 'Ammunition for bows.' });
  add('bomb', { name: 'Bomb', type: 'consumable', icon: 'misc', color: '#2a2a36', value: 25, use: { bomb: 1 }, desc: 'Throw to blast enemies and crack weak walls.' });
  add('treat', { name: 'Bond Treat', type: 'consumable', icon: 'treat', color: '#ffd75a', value: 30, use: { bond: 1 }, desc: 'Offer to a wild creature to befriend it. Weaker creatures bond more easily.' });
  add('treat_plus', { name: 'Royal Treat', type: 'consumable', icon: 'treat', color: '#ff4f7a', value: 120, use: { bond: 2.2 }, desc: 'A premium treat. Much higher bonding chance.' });
  add('evo_stone', { name: 'Evolution Prism', type: 'material', icon: 'gem', mat: 'moon', value: 150, desc: 'Lets a level 10+ companion evolve at the Creature Altar.' });
  add('return_scroll', { name: 'Hearth Scroll', type: 'consumable', icon: 'scroll', color: '#64d86a', value: 40, use: { recall: 1 }, desc: 'Teleport home.' });
  // tools (never equipped: the best one in your bag is used automatically)
  [['axe1', 'Stone Axe', 'axe', 'stone', 1], ['axe2', 'Iron Axe', 'axe', 'iron', 2], ['pick1', 'Stone Pickaxe', 'pick', 'stone', 1], ['pick2', 'Copper Pickaxe', 'pick', 'copper', 2], ['pick3', 'Iron Pickaxe', 'pick', 'iron', 3],
    ['pick4', 'Frostsilver Pickaxe', 'pick', 'frost', 4], ['pick5', 'Emberite Pickaxe', 'pick', 'ember', 5], ['rod1', 'Fishing Rod', 'rod', 'wood', 1], ['rod2', 'Fine Rod', 'rod', 'gold', 2], ['hoe', 'Hoe', 'hoe', 'iron', 1], ['can', 'Watering Can', 'can', 'iron', 1]]
    .forEach(([id, name, icon, mat, power]) => add(id, { name, type: 'tool', icon, mat, tool: icon === 'axe' ? 'axe' : icon === 'pick' ? 'pick' : icon, power, stack: 1, value: power * 30, desc: icon === 'pick' ? 'Mines rocks and ore up to tier ' + power + '.' : icon === 'axe' ? (power > 1 ? 'Can fell ancient Darkwood trees.' : 'Chops trees.') : icon === 'rod' ? (power > 1 ? 'Hooks rare fish more easily.' : 'Cast into water to fish.') : icon === 'hoe' ? 'Tills farm soil.' : 'Waters crops.' }));
  // quest items
  add('sun_tablet', { name: 'Sun Tablet', type: 'quest', icon: 'tablet', value: 0, stack: 9, desc: 'An ancient tablet engraved with a blazing sun.' });
  add('locket', { name: "Tilly's Locket", type: 'quest', icon: 'necklace', mat: 'gold', gemc: '#ff70b0', value: 0, stack: 1, desc: 'A small silver locket. Tilly will be glad to see it.' });
  [['sigil_verdant', 'Verdant Sigil', '#64d86a'], ['sigil_solar', 'Solar Sigil', '#ffcf4a'], ['sigil_glacial', 'Glacial Sigil', '#8fe0ff'], ['sigil_ember', 'Ember Sigil', '#ff6a2e']]
    .forEach(([id, name, color]) => add(id, { name, type: 'quest', icon: 'sigil', color, value: 0, stack: 1, desc: 'One of four seals of the Ancient Gate.' }));
  add('glacier_charm', { name: 'Glacier Charm', type: 'quest', icon: 'charm', mat: 'frost', gemc: '#8fe0ff', value: 0, stack: 1, desc: 'Lava cools to a walkable crust under your feet while you carry this.' });
  // decor
  [['d_rug', 'Woven Rug', 'rug', 60], ['d_plant', 'Potted Fern', 'plant', 40], ['d_lamp', 'Brass Lamp', 'lamp', 80], ['d_painting', 'Landscape Painting', 'painting', 120], ['d_shelf', 'Bookshelf', 'shelf', 100], ['d_trophy', 'Hero Trophy', 'trophy', 0]]
    .forEach(([id, name, decor, value]) => add(id, { name, type: 'decor', icon: 'decor', decor, value, stack: 9, desc: 'Decoration. Use it inside your home to place it.' }));

  /* ---- equipment ---- */
  D.TIERS = [
    { mat: 'wood', name: 'Wooden', dmg: 6, def: 2, lvl: 1 }, { mat: 'copper', name: 'Copper', dmg: 10, def: 4, lvl: 3 }, { mat: 'iron', name: 'Iron', dmg: 16, def: 7, lvl: 7 },
    { mat: 'frost', name: 'Frostsilver', dmg: 25, def: 11, lvl: 13 }, { mat: 'ember', name: 'Emberite', dmg: 36, def: 16, lvl: 18 }, { mat: 'void', name: 'Voidsteel', dmg: 50, def: 22, lvl: 23 },
  ];
  D.WCLASS = {
    sword: { name: 'Sword', dmg: 1, rate: 2.6, range: 22, arc: 2.0, kb: 90, desc: 'Balanced 3-hit combo. Charge: spin slash.' },
    dagger: { name: 'Dagger', dmg: 0.62, rate: 4.4, range: 16, arc: 1.4, kb: 40, crit: 8, desc: 'Very fast 4-hit combo, +8% crit. Charge: lunge.' },
    greatsword: { name: 'Greatsword', dmg: 1.8, rate: 1.35, range: 28, arc: 2.6, kb: 220, desc: 'Slow, wide, huge knockback. Charge: ground slam.' },
    bow: { name: 'Bow', dmg: 1.05, rate: 2.0, range: 0, ranged: 1, desc: 'Fires arrows. Hold to draw for power shots.' },
    staff: { name: 'Staff', dmg: 1.15, rate: 2.2, range: 0, magic: 1, desc: 'Casts elemental bolts using mana. Charge: big orb.' },
  };
  const TIER_EL = ['', '', '', 'ice', 'fire', 'shadow'];
  D.TIERS.forEach((t, ti) => {
    for (const wc in D.WCLASS) {
      const w = D.WCLASS[wc];
      const id = wc + '_' + ti;
      const mat = wc === 'bow' || wc === 'staff' ? (ti === 0 ? 'wood' : t.mat) : t.mat;
      const name = wc === 'staff' ? ['Oak', 'Copper', 'Iron', 'Frostsilver', 'Emberite', 'Voidsteel'][ti] + ' Staff' : wc === 'bow' ? ['Hunting', 'Copper', 'Iron', 'Frostsilver', 'Emberite', 'Voidsteel'][ti] + ' Bow' : t.name + ' ' + w.name;
      const el = wc === 'staff' ? ['fire', 'fire', 'ice', 'ice', 'fire', 'shadow'][ti] : TIER_EL[ti];
      add(id, { name, type: 'weapon', icon: wc, mat, wclass: wc, tier: ti, dmg: Math.round(t.dmg * w.dmg * 10) / 10, element: el || null, stack: 1, value: 15 + ti * ti * 30 + ti * 20, lvl: t.lvl, gemc: el === 'fire' ? '#ff6a2e' : el === 'ice' ? '#8fe0ff' : el === 'shadow' ? '#b892f0' : '#e8e0d0', desc: w.desc });
    }
    const armor = [['helmet', 'Helm', 0.7], ['chest', 'Cuirass', 1.3], ['gloves', 'Gauntlets', 0.5], ['boots', 'Boots', 0.6]];
    const aname = ['Leather', 'Copper', 'Iron', 'Frostsilver', 'Emberite', 'Voidsteel'][ti];
    for (const [slot, nm, m] of armor) {
      const extra = { 3: { ice: 8 }, 4: { fire: 8 }, 5: { shadow: 8 } }[ti] || {};
      add(slot + '_' + ti, { name: aname + ' ' + (ti === 0 ? { helmet: 'Cap', chest: 'Vest', gloves: 'Gloves', boots: 'Boots' }[slot] : nm), type: 'armor', slot, icon: slot, mat: ti === 0 ? 'leather' : t.mat, tier: ti, def: Math.max(1, Math.round(t.def * m)), stats: extra, stack: 1, value: 12 + ti * ti * 25 + ti * 15, lvl: t.lvl, desc: 'Armor.' });
    }
  });
  // jewelry & accessories
  const jewel = (id, name, slot, icon, mat, gemc, stats, value, desc, extra) => add(id, Object.assign({ name, type: 'armor', slot, icon, mat, gemc, def: 0, stats, stack: 1, value, desc, tier: 1 }, extra || {}));
  jewel('ring_copper', 'Copper Band', 'ring', 'ring', 'copper', '#d9864a', { atk: 2 }, 40, 'A simple ring.');
  jewel('ring_gold', 'Gold Signet', 'ring', 'ring', 'gold', '#ffd75a', { crit: 5 }, 140, 'Fortune favours the bold.');
  jewel('ring_ruby', 'Ruby Ring', 'ring', 'ring', 'gold', '#e8363c', { fire: 20, atk: 4 }, 260, 'Warm to wear.');
  jewel('ring_sapphire', 'Sapphire Ring', 'ring', 'ring', 'gold', '#3f97d6', { ice: 20, mp: 20 }, 260, 'Cool to wear.');
  jewel('amulet_gold', 'Gold Pendant', 'necklace', 'necklace', 'gold', '#ffd75a', { hp: 25 }, 150, 'A sturdy pendant.');
  jewel('amulet_moon', 'Moonstone Amulet', 'necklace', 'necklace', 'moon', '#c8d0ff', { mp: 30, regen: 0.5 }, 320, 'Shimmers at night.');
  jewel('amulet_amethyst', 'Amethyst Choker', 'necklace', 'necklace', 'void', '#b892f0', { shadow: 25, hp: 30 }, 520, 'Wards off the dark.');
  jewel('fur_cloak', 'Fur Cloak', 'acc', 'cloak', 'leather', null, { ice: 30, hp: 10 }, 90, 'Thick and warm. Needed to survive the Frostfall cold.');
  jewel('frost_cloak', 'Frostweave Cloak', 'acc', 'cloak', 'frost', null, { ice: 45, def: 4, hp: 25 }, 300, 'Woven from frost pelts.');
  jewel('ember_charm', 'Ember Charm', 'acc', 'charm', 'ember', '#ff6a2e', { fire: 35, atk: 4 }, 320, 'Heat flows around you.');
  jewel('quiver', 'Hunter Quiver', 'acc', 'charm', 'leather', '#a06a3c', { crit: 6, spd: 4 }, 160, 'For the swift archer.');
  // uniques
  add('u_verdant', { name: 'Verdant Fang', type: 'weapon', icon: 'dagger', mat: 'nature', wclass: 'dagger', tier: 2, dmg: 13, element: null, stack: 1, value: 600, lvl: 5, unique: 'lifesteal', fixedRarity: 4, desc: 'Grown, not forged.' });
  add('u_sunbreaker', { name: 'Sunbreaker', type: 'weapon', icon: 'greatsword', mat: 'sun', wclass: 'greatsword', tier: 3, dmg: 42, element: 'fire', stack: 1, value: 1200, lvl: 9, unique: 'burn', fixedRarity: 4, desc: 'Forged in a buried sun.' });
  add('u_rimefang', { name: 'Rimefang Bow', type: 'weapon', icon: 'bow', mat: 'frost', wclass: 'bow', tier: 4, dmg: 38, element: 'ice', stack: 1, value: 2000, lvl: 14, unique: 'chill', fixedRarity: 4, desc: 'Strung with dragon sinew.' });
  add('u_titanheart', { name: "Titan's Heart", type: 'armor', slot: 'necklace', icon: 'necklace', mat: 'ember', gemc: '#ff6a2e', def: 6, stats: { hp: 60, fire: 25 }, stack: 1, value: 2500, lvl: 18, unique: 'bulwark', fixedRarity: 4, desc: 'It still beats.' });
  add('u_moonlit', { name: 'Moonlit Edge', type: 'weapon', icon: 'sword', mat: 'moon', wclass: 'sword', tier: 3, dmg: 26, element: 'ice', stack: 1, value: 1500, lvl: 8, unique: 'wave', fixedRarity: 4, desc: 'Found where moonlight pools in the Darkwood.' });
  add('u_storm', { name: 'Stormcaller Staff', type: 'weapon', icon: 'staff', mat: 'moon', wclass: 'staff', tier: 3, dmg: 30, element: 'shock', gemc: '#fff26a', stack: 1, value: 1600, lvl: 10, unique: 'shock', fixedRarity: 4, desc: 'Crackles before every storm.' });
  add('u_zephyr', { name: 'Zephyr Feather', type: 'armor', slot: 'acc', icon: 'feather', color: '#bfefff', def: 0, stats: { spd: 8, sta: 30 }, stack: 1, value: 900, lvl: 6, unique: 'swift', fixedRarity: 4, desc: 'Light as a summer wind.' });
  add('u_lucky', { name: 'Lucky Coin', type: 'armor', slot: 'ring', icon: 'ring', mat: 'gold', gemc: '#64d86a', def: 0, stats: { crit: 6 }, stack: 1, value: 700, lvl: 4, unique: 'treasure', fixedRarity: 4, desc: 'Heads, you win.' });
  add('u_crown', { name: 'Umbral Crown', type: 'armor', slot: 'helmet', icon: 'helmet', mat: 'void', def: 30, stats: { mp: 60, shadow: 30, crit: 8 }, stack: 1, value: 6000, lvl: 24, unique: 'arcane', fixedRarity: 5, desc: 'Worn by the Sovereign. Now yours.' });
  add('u_reaver', { name: 'Shadowreaver', type: 'weapon', icon: 'sword', mat: 'void', wclass: 'sword', tier: 5, dmg: 72, element: 'shadow', stack: 1, value: 8000, lvl: 24, unique: 'echo', fixedRarity: 5, desc: 'The blade that sealed the Shadow Realm, and will again.' });

  /* ---------------- crafting recipes ---------------- */
  // station: hand | workbench | forge | alchemy | cook | altar
  const R = (D.RECIPES = []);
  const rec = (out, n, station, ins, o) => R.push(Object.assign({ out, n, station, ins: ins.filter(Boolean) }, o || {}));
  rec('plank', 2, 'workbench', [['wood', 1]]);
  rec('pick1', 1, 'workbench', [['wood', 5], ['stone', 3]]);
  rec('axe1', 1, 'workbench', [['wood', 4], ['stone', 3]]);
  rec('rod1', 1, 'workbench', [['wood', 4], ['fiber', 6]]);
  rec('arrow', 15, 'workbench', [['wood', 2], ['stone', 1], ['feather', 1]]);
  rec('arrow', 8, 'workbench', [['wood', 2], ['stone', 1]], { alt: 1 });
  rec('treat', 2, 'workbench', [['berry', 3], ['slime_gel', 1]]);
  rec('fur_cloak', 1, 'workbench', [['pelt', 5], ['fiber', 6]]);
  rec('frost_cloak', 1, 'workbench', [['frost_pelt', 6], ['silk', 4], ['frost_bar', 1]], { lvl: 12 });
  rec('quiver', 1, 'workbench', [['pelt', 4], ['feather', 6], ['silk', 2]]);
  rec('bow_0', 1, 'workbench', [['wood', 6], ['fiber', 8]]);
  rec('staff_0', 1, 'workbench', [['wood', 6], ['glowcap', 2]]);
  rec('sword_0', 1, 'workbench', [['wood', 8]]);
  rec('helmet_0', 1, 'workbench', [['pelt', 2], ['fiber', 3]]); rec('chest_0', 1, 'workbench', [['pelt', 4], ['fiber', 4]]);
  rec('gloves_0', 1, 'workbench', [['pelt', 2], ['fiber', 2]]); rec('boots_0', 1, 'workbench', [['pelt', 2], ['fiber', 3]]);
  rec('d_rug', 1, 'workbench', [['fiber', 12], ['silk', 2]]); rec('d_plant', 1, 'workbench', [['stone', 4], ['greenleaf', 3]]);
  rec('d_shelf', 1, 'workbench', [['plank', 10]]); rec('d_lamp', 1, 'workbench', [['copper_bar', 2], ['glowcap', 2]]);
  rec('return_scroll', 2, 'workbench', [['fiber', 4], ['moonpetal', 1]]);
  // forge: smelting + gear
  [['copper', 0], ['iron', 0], ['gold', 0], ['frost', 0], ['ember', 0], ['void', 0]].forEach(([m]) => rec(m + '_bar', 1, 'forge', [[m === 'void' ? 'void_shard' : m + '_ore', m === 'void' ? 2 : 3]]));
  rec('pick2', 1, 'forge', [['copper_bar', 4], ['wood', 4]]); rec('pick3', 1, 'forge', [['iron_bar', 5], ['wood', 4]]);
  rec('pick4', 1, 'forge', [['frost_bar', 5], ['plank', 4]]); rec('pick5', 1, 'forge', [['ember_bar', 6], ['plank', 4]]);
  rec('axe2', 1, 'forge', [['iron_bar', 4], ['wood', 4]]); rec('rod2', 1, 'forge', [['gold_bar', 2], ['plank', 4], ['silk', 2]]);
  const barFor = ['wood', 'copper_bar', 'iron_bar', 'frost_bar', 'ember_bar', 'void_bar'];
  for (let ti = 1; ti < 6; ti++) {
    const b = barFor[ti], ex = [null, ['wood', 3], ['plank', 3], ['sapphire', 1], ['ember_core', 1], ['shadow_essence', 2]][ti];
    rec('sword_' + ti, 1, 'forge', [[b, 4], ex]); rec('dagger_' + ti, 1, 'forge', [[b, 3], ex]); rec('greatsword_' + ti, 1, 'forge', [[b, 7], ex]);
    rec('bow_' + ti, 1, 'forge', [[b, 3], ['plank', 4], ['silk', ti]]); rec('staff_' + ti, 1, 'forge', [[b, 3], ['plank', 3], [['glowcap', 'moonpetal', 'sapphire', 'ruby', 'amethyst'][ti - 1], 2]]);
    rec('helmet_' + ti, 1, 'forge', [[b, 4]]); rec('chest_' + ti, 1, 'forge', [[b, 7]]); rec('gloves_' + ti, 1, 'forge', [[b, 3]]); rec('boots_' + ti, 1, 'forge', [[b, 3]]);
  }
  rec('ring_copper', 1, 'forge', [['copper_bar', 2]]); rec('ring_gold', 1, 'forge', [['gold_bar', 2]]); rec('amulet_gold', 1, 'forge', [['gold_bar', 3]]);
  rec('ring_ruby', 1, 'forge', [['gold_bar', 2], ['ruby', 1]]); rec('ring_sapphire', 1, 'forge', [['gold_bar', 2], ['sapphire', 1]]);
  rec('amulet_moon', 1, 'forge', [['gold_bar', 3], ['moonpetal', 4], ['sapphire', 1]]); rec('amulet_amethyst', 1, 'forge', [['void_bar', 2], ['amethyst', 2]]);
  rec('ember_charm', 1, 'forge', [['ember_bar', 2], ['ember_core', 2]]);
  rec('d_trophy', 1, 'forge', [['gold_bar', 3]]);
  rec('sand_glass', 2, 'forge', [['stone', 2], ['sunbloom', 1]]);
  // alchemy
  rec('hp_small', 2, 'alchemy', [['greenleaf', 2], ['slime_gel', 1]]);
  rec('hp_large', 1, 'alchemy', [['greenleaf', 2], ['moonpetal', 2], ['sand_glass', 1]]);
  rec('hp_mega', 1, 'alchemy', [['fireroot', 2], ['frostbloom', 2], ['ember_core', 1]]);
  rec('mp_small', 2, 'alchemy', [['glowcap', 2], ['greenleaf', 1]]);
  rec('mp_large', 1, 'alchemy', [['moonpetal', 3], ['sapphire', 1]]);
  rec('sta_tonic', 2, 'alchemy', [['sunbloom', 2], ['berry', 3]]);
  rec('fire_tonic', 1, 'alchemy', [['frostbloom', 2], ['slime_gel', 2]]);
  rec('frost_tonic', 1, 'alchemy', [['fireroot', 1], ['sunbloom', 2]]);
  rec('bomb', 3, 'alchemy', [['ember_ore', 1], ['fiber', 3], ['stone', 2]]);
  rec('bomb', 2, 'alchemy', [['slime_gel', 3], ['stone', 3], ['sunbloom', 1]], { alt: 1 });
  rec('treat_plus', 1, 'alchemy', [['treat', 2], ['moonpetal', 2], ['gold_bar', 1]]);
  // cooking
  rec('bread', 2, 'cook', [['wheat', 3]]);
  rec('veg_stew', 1, 'cook', [['carrot', 2], ['turnip', 2], ['tomato', 1]]);
  rec('fish_skewer', 1, 'cook', [['minnow', 2], ['wood', 1]]);
  rec('fish_skewer', 1, 'cook', [['perch', 1], ['wood', 1]], { alt: 1 });
  rec('pumpkin_pie', 1, 'cook', [['pumpkin', 1], ['wheat', 2], ['berry', 2]]);
  rec('spicy_curry', 1, 'cook', [['firepepper', 2], ['tomato', 1], ['wheat', 1]]);
  rec('melon_juice', 2, 'cook', [['sunmelon', 1], ['berry', 2]]);
  rec('frost_sorbet', 1, 'cook', [['frostberry', 3], ['berry', 2]]);
  rec('sushi', 1, 'cook', [['goldkoi', 1], ['wheat', 2]]);
  // creature altar
  rec('evo_stone', 1, 'altar', [['sapphire', 1], ['ruby', 1], ['moonpetal', 3]]);
  rec('treat', 3, 'altar', [['berry', 4], ['slime_gel', 1]], { alt: 1 });
  D.STATIONS = { hand: 'Pack', workbench: 'Workbench', forge: 'Forge', alchemy: 'Alchemy Table', cook: 'Cooking Pot', altar: 'Creature Altar' };

  /* ---------------- regions ---------------- */
  D.REGIONS = {
    greenfields: { name: 'Greenfields', tier: 1, music: 'meadow', weather: [['clear', 6], ['rain', 2], ['fog', 1]], col: '#6fb547' },
    darkwood: { name: 'Darkwood Forest', tier: 2, music: 'forest', weather: [['clear', 3], ['fog', 3], ['rain', 2]], col: '#326148' },
    sunscorch: { name: 'Sunscorch Desert', tier: 3, music: 'desert', weather: [['clear', 7], ['sandstorm', 2]], col: '#e3b871' },
    frostfall: { name: 'Frostfall Mountains', tier: 4, music: 'snow', weather: [['snow', 5], ['clear', 2], ['blizzard', 1]], col: '#c6d9ec' },
    volcanic: { name: 'Volcanic Wastelands', tier: 5, music: 'fire', weather: [['ash', 6], ['clear', 1]], col: '#e2471a' },
    shadow: { name: 'Shadow Realm', tier: 6, music: 'shadow', weather: [['void', 5], ['clear', 1]], col: '#7552ad' },
  };

  /* ---------------- enemies (28 variants, 10 behaviour types) ---------------- */
  const E = (D.ENEMIES = {});
  const en = (id, o) => { E[id] = Object.assign({ id, def: 0, spd: 40, r: 6, kb: 1, gold: [1, 4], drops: [], ai: 'chase' }, o); };
  // Greenfields
  en('slime', { name: 'Green Slime', region: 'greenfields', gen: 'slime', look: { color: '#5fcf55' }, hp: 22, atk: 6, xp: 6, ai: 'hop', spd: 34, drops: [['slime_gel', 0.7, 1, 2]] });
  en('bat', { name: 'Meadow Bat', region: 'greenfields', gen: 'bat', look: { color: '#6a4a8a' }, hp: 16, atk: 5, xp: 6, ai: 'flyer', spd: 52, night: 1, drops: [['feather', 0.3, 1, 1]] });
  en('boar', { name: 'Thornboar', region: 'greenfields', gen: 'quad', look: { color: '#7a4a2a', tusk: 1, bristle: 1, ears: false }, hp: 34, atk: 9, xp: 10, ai: 'charge', spd: 36, r: 8, drops: [['pelt', 0.6, 1, 1], ['bone', 0.3, 1, 1]] });
  en('crab', { name: 'Pebble Crab', region: 'greenfields', gen: 'crawler', look: { color: '#8a8a9a', claws: 1, shell: 1 }, hp: 30, atk: 7, def: 6, xp: 9, ai: 'tank', spd: 28, drops: [['stone', 0.8, 1, 3], ['copper_ore', 0.25, 1, 1]] });
  en('goblin', { name: 'Goblin Slinger', region: 'greenfields', gen: 'humanoid', look: { skin: '#7aa84a', hair: 'bald', hairColor: '#000', eye: '#ffde40', top: '#6a4026', bottom: '#3b2417', accent: '#c8a050', outfit: 'tunic', acc: 'none', ears: true }, hp: 24, atk: 6, xp: 9, ai: 'ranged', spd: 38, range: 80, proj: { kind: 'rock', spd: 110, dmg: 1 }, drops: [['fiber', 0.5, 1, 3], ['treat', 0.08, 1, 1]] });
  en('wolf', { name: 'Grey Wolf', region: 'greenfields', gen: 'quad', look: { color: '#6a6a7a', belly: '#a8a8b8' }, hp: 28, atk: 8, xp: 10, ai: 'lunge', spd: 50, night: 1, r: 7, drops: [['pelt', 0.6, 1, 1]] });
  // Darkwood
  en('shadowwolf', { name: 'Darkwood Stalker', region: 'darkwood', gen: 'quad', look: { color: '#2a3a4a', belly: '#46607a', eye: '#7dffb0' }, hp: 62, atk: 13, xp: 20, ai: 'lunge', spd: 56, r: 7, drops: [['pelt', 0.6, 1, 2], ['bone', 0.3, 1, 1]] });
  en('puffer', { name: 'Spore Puffer', region: 'darkwood', gen: 'blob', look: { kind: 'puffer', color: '#8a4ab0', spot: '#ffd0ff' }, hp: 50, atk: 10, xp: 18, ai: 'area', spd: 18, status: 'poison', drops: [['glowcap', 0.6, 1, 2]] });
  en('mimic', { name: 'Mimic Stump', region: 'darkwood', gen: 'blob', look: { kind: 'stump' }, hp: 80, atk: 16, def: 8, xp: 24, ai: 'ambush', spd: 46, drops: [['wood', 1, 3, 5], ['ancient_wood', 0.2, 1, 1]] });
  en('wispshaman', { name: 'Wisp Shaman', region: 'darkwood', gen: 'humanoid', look: { skin: '#4a8a6a', hair: 'long', hairColor: '#9dffd0', eye: '#9dffd0', top: '#22463a', bottom: '#173029', accent: '#9dffd0', outfit: 'robe', acc: 'hood', glow: '#9dffd0' }, hp: 55, atk: 14, xp: 24, ai: 'caster', spd: 30, range: 110, drops: [['moonpetal', 0.5, 1, 2], ['mp_small', 0.15, 1, 1]] });
  en('beetle', { name: 'Briar Beetle', region: 'darkwood', gen: 'crawler', look: { color: '#3a5a2a', shell: 1, horn: 1 }, hp: 70, atk: 12, def: 14, xp: 22, ai: 'tank', spd: 30, drops: [['iron_ore', 0.35, 1, 1], ['silk', 0.3, 1, 1]] });
  en('spider', { name: 'Webspinner', region: 'darkwood', gen: 'crawler', look: { color: '#2a2030', eye: '#ff4040' }, hp: 48, atk: 11, xp: 20, ai: 'ranged', spd: 44, range: 70, proj: { kind: 'web', spd: 90, dmg: 0.6, slow: 1 }, drops: [['silk', 0.7, 1, 2]] });
  // Sunscorch
  en('scorpion', { name: 'Sand Scorpion', region: 'sunscorch', gen: 'crawler', look: { color: '#c8903a', claws: 1, stinger: 1 }, hp: 88, atk: 17, xp: 32, ai: 'chase', spd: 46, status: 'poison', drops: [['bone', 0.4, 1, 1], ['sunbloom', 0.2, 1, 1]] });
  en('lurker', { name: 'Dune Lurker', region: 'sunscorch', gen: 'blob', look: { kind: 'lurker', color: '#d6a75f' }, hp: 110, atk: 22, xp: 38, ai: 'ambush', spd: 40, r: 8, drops: [['sand_glass', 0.5, 1, 2], ['gold_ore', 0.25, 1, 1]] });
  en('cactoid', { name: 'Cactus Spitter', region: 'sunscorch', gen: 'blob', look: { kind: 'cactus' }, hp: 80, atk: 15, def: 4, xp: 30, ai: 'turret', spd: 0, range: 130, proj: { kind: 'needle', spd: 130, dmg: 1, spread: 3 }, drops: [['fiber', 0.6, 2, 4], ['sunbloom', 0.3, 1, 1]] });
  en('mummy', { name: 'Restless Mummy', region: 'sunscorch', gen: 'humanoid', look: { skin: '#d8ccb0', hair: 'bald', hairColor: '#000', eye: '#ffd040', top: '#c8bca0', bottom: '#a89a80', accent: '#8a7a5a', outfit: 'robe', acc: 'none', wrapped: true, glow: '#ffd040' }, hp: 130, atk: 20, def: 6, xp: 40, ai: 'chase', spd: 26, night: 1, drops: [['fiber', 0.6, 2, 3], ['gold_ore', 0.3, 1, 1]] });
  en('sunpriest', { name: 'Sun Cultist', region: 'sunscorch', gen: 'humanoid', look: { skin: '#b27a4e', hair: 'bald', hairColor: '#000', eye: '#ffcf4a', top: '#e0a92e', bottom: '#7a3a10', accent: '#ffffff', outfit: 'robe', acc: 'hood', glow: '#ffcf4a' }, hp: 95, atk: 20, xp: 40, ai: 'caster', spd: 30, range: 120, element: 'fire', drops: [['ruby', 0.08, 1, 1], ['sunbloom', 0.4, 1, 2]] });
  // Frostfall
  en('frostwolf', { name: 'Frost Wolf', region: 'frostfall', gen: 'quad', look: { color: '#c8d8f0', belly: '#ffffff', eye: '#40c0ff' }, hp: 140, atk: 26, xp: 55, ai: 'lunge', spd: 58, r: 7, status: 'chill', drops: [['frost_pelt', 0.6, 1, 2]] });
  en('icewisp', { name: 'Ice Wisp', region: 'frostfall', gen: 'blob', look: { kind: 'wisp', color: '#7ad8ff' }, hp: 100, atk: 22, xp: 50, ai: 'ranged', spd: 40, range: 110, flying: 1, proj: { kind: 'ice', spd: 120, dmg: 1, chill: 1 }, element: 'ice', drops: [['frostbloom', 0.5, 1, 1], ['sapphire', 0.06, 1, 1]] });
  en('yeti', { name: 'Yeti', region: 'frostfall', gen: 'blob', look: { kind: 'yeti', color: '#e9f2fb', scale: 1.3 }, hp: 240, atk: 32, def: 8, xp: 80, ai: 'charge', spd: 40, r: 10, drops: [['frost_pelt', 0.8, 2, 3], ['bone', 0.5, 1, 2]] });
  en('snowslime', { name: 'Snow Slime', region: 'frostfall', gen: 'slime', look: { color: '#bfe4ff', size: 1.2 }, hp: 120, atk: 22, xp: 45, ai: 'hop', spd: 34, status: 'chill', split: 'slime_mini', drops: [['slime_gel', 0.8, 1, 3]] });
  en('slime_mini', { name: 'Snowling', region: 'frostfall', gen: 'slime', look: { color: '#dff2ff', size: 0.7 }, hp: 40, atk: 12, xp: 10, ai: 'hop', spd: 44, r: 4 });
  en('frostgolem', { name: 'Frost Golem', region: 'frostfall', gen: 'golem', look: { color: '#8cbede', ice: 1 }, hp: 260, atk: 30, def: 22, xp: 85, ai: 'tank', spd: 24, r: 10, drops: [['frost_ore', 0.7, 1, 3], ['sapphire', 0.1, 1, 1]] });
  // Volcanic
  en('magmaslug', { name: 'Magma Slug', region: 'volcanic', gen: 'blob', look: { kind: 'slug', color: '#c8401e', spot: '#ffd040' }, hp: 190, atk: 30, def: 6, xp: 80, ai: 'area', spd: 22, status: 'burn', trail: 1, drops: [['ember_ore', 0.4, 1, 2], ['fireroot', 0.4, 1, 1]] });
  en('imp', { name: 'Fire Imp', region: 'volcanic', gen: 'blob', look: { kind: 'imp', color: '#c8321e' }, hp: 150, atk: 30, xp: 85, ai: 'ranged', spd: 54, range: 110, flying: 1, proj: { kind: 'fire', spd: 120, dmg: 1, burn: 1 }, element: 'fire', drops: [['ember_core', 0.2, 1, 1], ['fireroot', 0.3, 1, 1]] });
  en('obsidian', { name: 'Obsidian Golem', region: 'volcanic', gen: 'golem', look: { color: '#2a2226', cracks: '#ff6a1e', eye: '#ffef6a' }, hp: 340, atk: 40, def: 30, xp: 120, ai: 'tank', spd: 22, r: 10, drops: [['ember_ore', 0.8, 1, 3], ['ruby', 0.12, 1, 1]] });
  en('hound', { name: 'Ember Hound', region: 'volcanic', gen: 'quad', look: { color: '#3a1a1a', mane: '#ff7a2e', eye: '#ffef6a' }, hp: 180, atk: 34, xp: 90, ai: 'charge', spd: 50, r: 8, status: 'burn', drops: [['pelt', 0.6, 1, 2], ['ember_core', 0.15, 1, 1]] });
  en('ashshaman', { name: 'Ash Shaman', region: 'volcanic', gen: 'humanoid', look: { skin: '#5a3a3a', hair: 'spiky', hairColor: '#ff6a2e', eye: '#ffef6a', top: '#3a2a26', bottom: '#1a1010', accent: '#ff6a2e', outfit: 'robe', acc: 'none', glow: '#ff6a2e' }, hp: 170, atk: 36, xp: 100, ai: 'caster', spd: 30, range: 120, element: 'fire', drops: [['ember_core', 0.25, 1, 1], ['ruby', 0.08, 1, 1]] });
  // Shadow
  en('shadowknight', { name: 'Umbral Knight', region: 'shadow', gen: 'humanoid', look: { skin: '#444', hair: 'bald', hairColor: '#000', eye: '#f0f', top: '#2b2340', bottom: '#1e1530', accent: '#9b6fd6', outfit: 'armor', acc: 'none', helmet: '#3a3058', plume: '#c040ff', glow: '#ff70ff' }, hp: 360, atk: 48, def: 30, xp: 160, ai: 'elite', spd: 40, r: 8, drops: [['void_shard', 0.6, 1, 2], ['shadow_essence', 0.4, 1, 1]] });
  en('voideye', { name: 'Void Eye', region: 'shadow', gen: 'blob', look: { kind: 'eye', color: '#3a1a5a' }, hp: 260, atk: 40, xp: 140, ai: 'ranged', spd: 30, range: 140, flying: 1, proj: { kind: 'void', spd: 100, dmg: 1, burst: 3 }, element: 'shadow', drops: [['shadow_essence', 0.6, 1, 2], ['amethyst', 0.1, 1, 1]] });
  en('nightmare', { name: 'Nightmare', region: 'shadow', gen: 'quad', look: { color: '#1e1530', mane: '#c040ff', eye: '#ff70ff', belly: '#47306f' }, hp: 300, atk: 46, xp: 150, ai: 'charge', spd: 60, r: 8, drops: [['void_shard', 0.5, 1, 2]] });
  en('shade', { name: 'Shade', region: 'shadow', gen: 'blob', look: { kind: 'ghost', color: '#5b3d86' }, hp: 220, atk: 42, xp: 140, ai: 'ambush', blink: 1, spd: 50, flying: 1, drops: [['shadow_essence', 0.5, 1, 1]] });
  // dungeon-only
  en('skeleton', { name: 'Skeleton Guard', region: 'dungeon', gen: 'humanoid', look: { skin: '#e8dcc0', hair: 'bald', hairColor: '#000', eye: '#ff4040', top: '#a89a80', bottom: '#6e6250', accent: '#5d5c6e', outfit: 'armor', acc: 'none', helmet: '#5d5c6e' }, hp: 60, atk: 12, def: 6, xp: 18, ai: 'elite', spd: 36, drops: [['bone', 0.7, 1, 2]] });
  D.REGION_ENEMIES = {
    greenfields: ['slime', 'slime', 'bat', 'boar', 'crab', 'goblin', 'wolf'], darkwood: ['shadowwolf', 'puffer', 'mimic', 'wispshaman', 'beetle', 'spider'],
    sunscorch: ['scorpion', 'scorpion', 'lurker', 'cactoid', 'mummy', 'sunpriest'], frostfall: ['frostwolf', 'icewisp', 'yeti', 'snowslime', 'frostgolem'],
    volcanic: ['magmaslug', 'imp', 'obsidian', 'hound', 'ashshaman'], shadow: ['shadowknight', 'voideye', 'nightmare', 'shade'],
  };

  /* ---------------- bosses ---------------- */
  D.BOSSES = {
    toad: { name: 'Mossback Toad King', hp: 300, atk: 12, def: 2, xp: 150, sprite: 'toad', r: 16, dungeon: 'cave', drops: [['copper_bar', 1, 3, 3], ['treat', 1, 2, 2]], gold: 80, color: '#7cc45a' },
    guardian: { name: 'Ancient Forest Guardian', hp: 900, atk: 18, def: 6, xp: 450, sprite: 'guardian', r: 22, dungeon: 'forest', drops: [['sigil_verdant', 1, 1, 1], ['u_verdant', 1, 1, 1], ['ancient_wood', 1, 4, 4]], gold: 300, color: '#46a083' },
    colossus: { name: 'Sandstone Colossus', hp: 1700, atk: 28, def: 14, xp: 900, sprite: 'colossus', r: 22, dungeon: 'desert', drops: [['sigil_solar', 1, 1, 1], ['u_sunbreaker', 1, 1, 1], ['gold_bar', 1, 4, 4]], gold: 600, color: '#ddb579' },
    dragon: { name: 'Frost Dragon', hp: 2800, atk: 38, def: 18, xp: 1600, sprite: 'dragon', r: 26, dungeon: 'ice', drops: [['sigil_glacial', 1, 1, 1], ['glacier_charm', 1, 1, 1], ['u_rimefang', 1, 1, 1], ['dragon_scale', 1, 3, 3]], gold: 1000, color: '#8fd4ff' },
    titan: { name: 'Molten Titan', hp: 4200, atk: 50, def: 26, xp: 2600, sprite: 'titan', r: 26, dungeon: 'fire', drops: [['sigil_ember', 1, 1, 1], ['u_titanheart', 1, 1, 1], ['ember_core', 1, 4, 4]], gold: 1600, color: '#ff6a2e' },
    sovereign: { name: 'Shadow Sovereign', hp: 7000, atk: 62, def: 30, xp: 6000, sprite: 'sovereign', r: 18, dungeon: 'shadow', drops: [['u_reaver', 1, 1, 1], ['u_crown', 1, 1, 1], ['d_trophy', 1, 1, 1]], gold: 5000, color: '#b892f0' },
  };

  /* ---------------- creatures (18) ---------------- */
  D.CREATURE_RARITY = [
    { name: 'Common', color: '#c8ccd8', chance: 0.7 }, { name: 'Uncommon', color: '#5fdc6a', chance: 0.5 }, { name: 'Rare', color: '#4aa8ff', chance: 0.32 },
    { name: 'Epic', color: '#c070ff', chance: 0.2 }, { name: 'Legendary', color: '#ffb52e', chance: 0.1 },
  ];
  D.ROLES = {
    fighter: 'Attacks nearby enemies.', gatherer: 'Collects nearby loot and gives +1 extra resource sometimes.', seeker: 'Senses hidden chests nearby and points to them.',
    healer: 'Slowly heals you during fights.', guard: 'Shields you: take 8% less damage.', gardener: 'Waters your crops every morning.', lantern: 'Glows brightly at night and in caves.',
  };
  const CR = (D.CREATURES = {});
  const cr = (id, o) => { CR[id] = Object.assign({ id }, o); };
  cr('puffkin', { name: 'Puffkin', el: 'Air', rar: 0, region: 'greenfields', look: { color: '#ffd75a', ears: 'round', tail: 'fluffy', belly: '#fff8d0' }, role: 'fighter', atk: 4, passive: { stat: 'spd', v: 3 }, desc: 'A round fluffball that loves sunbeams.', evolve: { to: 'galepuff', lvl: 10 } });
  cr('galepuff', { name: 'Galepuff', el: 'Air', rar: 2, region: 'evolve', look: { color: '#ffe680', ears: 'round', tail: 'fluffy', wings: 1, wingColor: '#fffbe0' }, role: 'fighter', atk: 10, passive: { stat: 'spd', v: 8 }, desc: 'Puffkin grown into a gust of courage.' });
  cr('sproutling', { name: 'Sproutling', el: 'Nature', rar: 0, region: 'greenfields', look: { color: '#64b33f', ears: 'leaf', tail: 'leaf' }, role: 'gardener', atk: 3, passive: { stat: 'regen', v: 0.3 }, desc: 'Plants grow faster when it hums.', evolve: { to: 'bloomhorn', lvl: 10 } });
  cr('bloomhorn', { name: 'Bloomhorn', el: 'Nature', rar: 2, region: 'evolve', look: { color: '#3b8a37', ears: 'horns', tail: 'leaf', spots: '#ff70b0' }, role: 'healer', atk: 8, passive: { stat: 'regen', v: 1 }, desc: 'Flowers bloom wherever it walks.' });
  cr('burrowmole', { name: 'Burrowmole', el: 'Earth', rar: 1, region: 'greenfields', look: { color: '#8a6a4a', ears: 'round', shape: 'long', belly: '#d8b890' }, role: 'gatherer', atk: 5, passive: { stat: 'def', v: 3 }, desc: 'Always digging. Often finds something.' });
  cr('glimmerfox', { name: 'Glimmerfox', el: 'Light', rar: 2, region: 'darkwood', look: { color: '#c8b8f0', ears: 'cat', tail: 'fluffy', glow: '#fff26a' }, role: 'seeker', atk: 7, passive: { stat: 'crit', v: 4 }, desc: 'Its tail glows near hidden treasure.' });
  cr('mosshell', { name: 'Mosshell', el: 'Nature', rar: 1, region: 'darkwood', look: { color: '#4c8a5c', ears: 'none', shape: 'long', spots: '#9ad655' }, role: 'guard', atk: 4, passive: { stat: 'hp', v: 20 }, desc: 'Slow, steady and very hard to dent.' });
  cr('wispkit', { name: 'Wispkit', el: 'Spirit', rar: 2, region: 'darkwood', look: { color: '#9dffd0', ears: 'cat', tail: 'thin', glow: '#ffffff' }, role: 'lantern', atk: 8, passive: { stat: 'mp', v: 20 }, desc: 'A playful spirit that lights the way.' });
  cr('sandhopper', { name: 'Sandhopper', el: 'Earth', rar: 0, region: 'sunscorch', look: { color: '#e3b871', ears: 'bunny', tail: 'fluffy' }, role: 'gatherer', atk: 6, passive: { stat: 'spd', v: 4 }, desc: 'Hops across dunes faster than the wind.' });
  cr('sunscale', { name: 'Sunscale', el: 'Fire', rar: 1, region: 'sunscorch', look: { color: '#ff9a2e', ears: 'none', shape: 'long', tail: 'long', spots: '#ffe27a' }, role: 'fighter', atk: 11, passive: { stat: 'fire', v: 10 }, desc: 'Basks all day, bites all night.' });
  cr('dunewyrm', { name: 'Dunewyrm', el: 'Earth', rar: 3, region: 'sunscorch', look: { color: '#c4955a', ears: 'horns', shape: 'long', tail: 'long', belly: '#f2d8a4' }, role: 'fighter', atk: 16, passive: { stat: 'atk', v: 4 }, desc: 'A baby sand dragon. Fiercely loyal.' });
  cr('frostpaw', { name: 'Frostpaw', el: 'Ice', rar: 1, region: 'frostfall', look: { color: '#e9f2fb', ears: 'round', tail: 'fluffy', belly: '#bfe4ff' }, role: 'fighter', atk: 13, passive: { stat: 'ice', v: 12 }, desc: 'A bear cub with frost on its breath.' });
  cr('snowmote', { name: 'Snowmote', el: 'Ice', rar: 0, region: 'frostfall', look: { color: '#dff2ff', ears: 'crystal', tail: 'none' }, role: 'healer', atk: 5, passive: { stat: 'regen', v: 0.6 }, desc: 'A drifting snowflake spirit.' });
  cr('auroraowl', { name: 'Aurora Owl', el: 'Light', rar: 2, region: 'frostfall', look: { color: '#8a9ae8', ears: 'cat', wings: 1, wingColor: '#9dffd0' }, role: 'seeker', atk: 12, passive: { stat: 'crit', v: 6 }, desc: 'Sees through snow and stone alike.' });
  cr('emberpup', { name: 'Emberpup', el: 'Fire', rar: 1, region: 'volcanic', look: { color: '#ff7a2e', ears: 'flame', tail: 'flame', shape: 'long' }, role: 'fighter', atk: 18, passive: { stat: 'fire', v: 15 }, desc: 'Warm, wiggly and slightly on fire.' });
  cr('cindermoth', { name: 'Cindermoth', el: 'Fire', rar: 2, region: 'volcanic', look: { color: '#ffb13b', ears: 'none', wings: 1, wingColor: '#ff5a1e' }, role: 'lantern', atk: 14, passive: { stat: 'atk', v: 5 }, desc: 'Drawn to heat, sheds glowing dust.' });
  cr('voidling', { name: 'Voidling', el: 'Shadow', rar: 3, region: 'shadow', look: { color: '#5b3d86', ears: 'cat', tail: 'thin', glow: '#ff70ff' }, role: 'fighter', atk: 24, passive: { stat: 'shadow', v: 15 }, desc: 'A sliver of the void that chose you.' });
  cr('celestine', { name: 'Celestine Drake', el: 'Light', rar: 4, region: 'shadow', look: { color: '#fff3c0', ears: 'horns', wings: 1, wingColor: '#ffd75a', shape: 'long', tail: 'long', glow: '#ffffff' }, role: 'fighter', atk: 34, passive: { stat: 'atk', v: 10 }, desc: 'Legend says it only appears where light defeats darkness.', secret: 1 });
  D.REGION_CREATURES = { greenfields: ['puffkin', 'sproutling', 'burrowmole'], darkwood: ['glimmerfox', 'mosshell', 'wispkit'], sunscorch: ['sandhopper', 'sunscale', 'dunewyrm'], frostfall: ['frostpaw', 'snowmote', 'auroraowl'], volcanic: ['emberpup', 'cindermoth'], shadow: ['voidling'] };

  /* ---------------- skills ---------------- */
  D.SKILLS = [
    { id: 'w_tough', tree: 'warrior', name: 'Toughness', max: 3, desc: '+20 max HP per rank.' },
    { id: 'w_might', tree: 'warrior', name: 'Heavy Blows', max: 3, req: ['w_tough'], desc: '+8% melee damage per rank.' },
    { id: 'w_wind', tree: 'warrior', name: 'Second Wind', max: 2, req: ['w_tough'], desc: '+25% stamina regeneration per rank.' },
    { id: 'w_whirl', tree: 'warrior', name: 'Whirlwind', max: 1, req: ['w_might'], active: 1, cost: { sta: 35 }, cd: 6, desc: 'Active: spin and strike every enemy around you (220% damage).' },
    { id: 'w_iron', tree: 'warrior', name: 'Unbreakable', max: 1, req: ['w_whirl'], desc: 'Below 35% HP you take 25% less damage.' },
    { id: 'r_eye', tree: 'ranger', name: 'Keen Eye', max: 3, desc: '+4% crit chance per rank.' },
    { id: 'r_draw', tree: 'ranger', name: 'Quickdraw', max: 2, req: ['r_eye'], desc: 'Bows draw 25% faster per rank.' },
    { id: 'r_fleet', tree: 'ranger', name: 'Fleet Foot', max: 2, req: ['r_eye'], desc: '+6% move speed and -15% dodge cost per rank.' },
    { id: 'r_volley', tree: 'ranger', name: 'Volley', max: 1, req: ['r_draw'], active: 1, cost: { sta: 30 }, cd: 5, desc: 'Active: fire a fan of 7 arrows (no ammo needed).' },
    { id: 'r_dead', tree: 'ranger', name: 'Deadeye', max: 1, req: ['r_volley'], desc: 'Critical hits deal +60% more damage.' },
    { id: 'm_mind', tree: 'mage', name: 'Arcane Mind', max: 3, desc: '+15 max mana per rank.' },
    { id: 'm_flow', tree: 'mage', name: 'Mana Flow', max: 2, req: ['m_mind'], desc: '+40% mana regeneration per rank.' },
    { id: 'm_power', tree: 'mage', name: 'Elemental Power', max: 3, req: ['m_mind'], desc: '+10% magic and elemental damage per rank.' },
    { id: 'm_nova', tree: 'mage', name: 'Frost Nova', max: 1, req: ['m_flow'], active: 1, cost: { mp: 30 }, cd: 7, desc: 'Active: freeze every enemy around you for 2.5s.' },
    { id: 'm_meteor', tree: 'mage', name: 'Meteor', max: 1, req: ['m_power', 'm_nova'], active: 1, cost: { mp: 55 }, cd: 10, desc: 'Active: call a meteor onto your target area (400% fire damage).' },
  ];
  D.TREES = { warrior: { name: 'Warrior', color: '#ff7a5a' }, ranger: { name: 'Ranger', color: '#5fdc6a' }, mage: { name: 'Mage', color: '#7a9cff' } };

  /* ---------------- NPCs ---------------- */
  const look = (o) => Object.assign({ skin: '#f2c29b', hair: 'short', hairColor: '#3b2a20', eye: '#3b2a20', top: '#6a8cdc', bottom: '#4a3a2a', accent: '#e8c050', outfit: 'tunic', acc: 'none' }, o);
  D.NPCS = {
    maren: { name: 'Elder Maren', look: look({ skin: '#d99e72', hair: 'bun', hairColor: '#e6e1d6', top: '#5a3a7a', bottom: '#3a2a4a', accent: '#ffd75a', outfit: 'robe', acc: 'glasses' }), spot: 'village_center', role: 'Village Elder' },
    hilda: { name: 'Hilda', look: look({ skin: '#f2c29b', hair: 'braids', hairColor: '#b3122e', top: '#4a4a5a', bottom: '#3a2a20', accent: '#a06a3c', outfit: 'jacket', acc: 'headband' }), spot: 'village_smith', role: 'Blacksmith', shop: 'smith', station: 'forge' },
    odo: { name: 'Odo', look: look({ skin: '#b27a4e', hair: 'short', hairColor: '#141418', top: '#3f8a5f', bottom: '#4a3a2a', accent: '#f2ead8', outfit: 'adventurer', acc: 'hat' }), spot: 'village_store', role: 'General Store', shop: 'general' },
    juniper: { name: 'Juniper', look: look({ skin: '#ffe0c7', hair: 'long', hairColor: '#9a5cff', top: '#7a3a8a', bottom: '#3a2a4a', accent: '#64d86a', outfit: 'robe', acc: 'flower' }), spot: 'village_potion', role: 'Potion Maker', shop: 'potion', station: 'alchemy' },
    oswin: { name: 'Farmer Oswin', look: look({ skin: '#d99e72', hair: 'short', hairColor: '#7a4a26', top: '#c8a050', bottom: '#3f5fae', accent: '#a8414c', outfit: 'tunic', acc: 'hat' }), spot: 'village_farm', role: 'Farmer', shop: 'farm' },
    bram: { name: 'Bram', look: look({ skin: '#f2c29b', hair: 'spiky', hairColor: '#c99a5b', top: '#a8414c', bottom: '#4a3a2a', accent: '#77492a', outfit: 'adventurer', acc: 'none' }), spot: 'bridge_site', role: 'Carpenter', shop: 'carpenter' },
    tilly: { name: 'Tilly', look: look({ skin: '#f2c29b', hair: 'ponytail', hairColor: '#e8c050', top: '#ff70b0', bottom: '#3f5fae', accent: '#ffffff', outfit: 'tunic', acc: 'none' }), spot: 'village_well', role: 'Curious kid', small: 1 },
    nell: { name: 'Nell', look: look({ skin: '#8a5434', hair: 'bob', hairColor: '#141418', top: '#3f97d6', bottom: '#2a3c66', accent: '#ffd75a', outfit: 'jacket', acc: 'hat' }), spot: 'village_dock', role: 'Fisher', shop: 'fish' },
    pip: { name: 'Ranger Pip', look: look({ skin: '#ffe0c7', hair: 'spiky', hairColor: '#3ddc84', top: '#2a6038', bottom: '#4a3a2a', accent: '#ff70b0', outfit: 'adventurer', acc: 'scarf' }), spot: 'village_ranch', role: 'Creature Specialist', shop: 'creature', station: 'altar' },
    sylva: { name: 'Druid Sylva', look: look({ skin: '#a6d4a0', hair: 'long', hairColor: '#326148', top: '#22463a', bottom: '#173029', accent: '#9dffd0', outfit: 'robe', acc: 'flower', ears: true }), spot: 'darkwood_shrine', role: 'Druid' },
    zeya: { name: 'Zeya', look: look({ skin: '#b27a4e', hair: 'ponytail', hairColor: '#141418', top: '#e3b871', bottom: '#77492a', accent: '#c9323a', outfit: 'adventurer', acc: 'glasses' }), spot: 'desert_town', role: 'Archaeologist' },
    kesh: { name: 'Guard Kesh', look: look({ skin: '#8a5434', hair: 'short', hairColor: '#141418', top: '#c4955a', bottom: '#5f3d2b', accent: '#c9323a', outfit: 'armor', acc: 'scarf' }), spot: 'desert_gate', role: 'Town Guard' },
    marlo: { name: 'Marlo', look: look({ skin: '#d99e72', hair: 'mohawk', hairColor: '#ff5cf0', top: '#7a2e8a', bottom: '#2a2a36', accent: '#ffd75a', outfit: 'jacket', acc: 'earrings' }), spot: 'desert_market', role: 'Equipment Merchant', shop: 'gear', station: 'forge' },
    ilsa: { name: 'Priestess Ilsa', look: look({ skin: '#ffe0c7', hair: 'long', hairColor: '#e8f0ff', top: '#e9f2fb', bottom: '#93abc9', accent: '#3f97d6', outfit: 'robe', acc: 'hood' }), spot: 'frost_village', role: 'Priestess', shop: 'frostshop', station: 'alchemy' },
    rurik: { name: 'Rurik', look: look({ skin: '#f2c29b', hair: 'long', hairColor: '#7a4a26', top: '#6a4026', bottom: '#3b2417', accent: '#e9f2fb', outfit: 'jacket', acc: 'hat' }), spot: 'frost_hunter', role: 'Hunter' },
    brakka: { name: 'Forgemaster Brakka', look: look({ skin: '#8a5434', hair: 'braids', hairColor: '#ff6a2e', top: '#3a2a26', bottom: '#1a1010', accent: '#ff6a2e', outfit: 'armor', acc: 'none' }), spot: 'ember_outpost', role: 'Forgemaster', shop: 'ember', station: 'forge' },
  };
  D.SHOPS = {
    smith: { name: "Hilda's Smithy", sells: ['pick2', 'axe1', 'copper_bar', 'iron_bar', 'sword_1', 'dagger_1', 'greatsword_1', 'helmet_1', 'chest_1', 'gloves_1', 'boots_1', 'sword_2', 'ring_copper'] },
    general: { name: "Odo's Goods", sells: ['turnip_seed', 'carrot_seed', 'wheat_seed', 'tomato_seed', 'pumpkin_seed', 'arrow', 'bomb', 'hp_small', 'return_scroll', 'treat', 'd_plant', 'd_painting', 'd_rug', 'rod1', 'fiber', 'stone'] },
    potion: { name: "Juniper's Brews", sells: ['hp_small', 'hp_large', 'mp_small', 'mp_large', 'sta_tonic', 'fire_tonic', 'frost_tonic', 'greenleaf', 'glowcap'] },
    farm: { name: "Oswin's Farm Stand", sells: ['turnip_seed', 'carrot_seed', 'wheat_seed', 'tomato_seed', 'pumpkin_seed', 'bread', 'berry'] },
    carpenter: { name: "Bram's Workshop", sells: ['plank', 'wood', 'd_shelf', 'd_lamp', 'axe2'] },
    fish: { name: "Nell's Tackle", sells: ['rod1', 'rod2', 'fish_skewer'] },
    creature: { name: "Pip's Ranch", sells: ['treat', 'treat_plus', 'evo_stone', 'berry'] },
    gear: { name: "Marlo's Rarities", sells: ['sword_2', 'dagger_2', 'greatsword_2', 'bow_2', 'staff_2', 'helmet_2', 'chest_2', 'gloves_2', 'boots_2', 'ring_gold', 'amulet_gold', 'quiver', 'sunmelon_seed', 'hp_large', 'sand_glass'] },
    frostshop: { name: 'Hearthpeak Supplies', sells: ['frost_tonic', 'hp_large', 'mp_large', 'frostberry_seed', 'pick4', 'frost_bar', 'ring_sapphire', 'frost_cloak'] },
    ember: { name: 'Ember Armory', sells: ['firepepper_seed', 'fire_tonic', 'hp_mega', 'ember_bar', 'sword_4', 'bow_4', 'staff_4', 'chest_4', 'ember_charm', 'pick5'] },
  };

  /* ---------------- quests (28) ---------------- */
  // objective types: talk, gather(item,n counted on pickup), have(item,n in bag), craft(item), kill(enemy), visit(spot), boss(id), deliver(item,n to giver), bond(n), species(n), harvest(n), fish(n), chests(n), waypoints(n), mine(item), upgrade(home)
  const Q = (D.QUESTS = {});
  const q = (id, o) => { Q[id] = Object.assign({ id, req: [], reward: {} }, o); };
  q('m1', { main: 1, name: 'A Restless Earth', giver: 'maren', desc: 'The ground has been trembling at night. Elder Maren wants to speak with you in the village square.', obj: [{ t: 'talk', npc: 'maren', text: 'Talk to Elder Maren in the village square' }], reward: { xp: 20, gold: 20 }, auto: 1, mark: 'village_center' });
  q('m2', { main: 1, name: 'Tools of the Trade', giver: 'maren', req: ['m1'], desc: 'Before facing whatever stirs below, you need proper tools. Gather materials and craft a pickaxe at the workbench in your home.', obj: [{ t: 'gather', item: 'wood', n: 8, text: 'Chop wood' }, { t: 'gather', item: 'stone', n: 5, text: 'Collect stone' }, { t: 'craft', item: 'pick1', n: 1, text: 'Craft a Stone Pickaxe' }], reward: { xp: 50, gold: 40, items: [['hp_small', 3]] }, mark: 'home_door' });
  q('m3', { main: 1, name: 'Tremors Below', giver: 'maren', req: ['m2'], desc: 'The tremors come from Mossy Hollow, a cave east of the village. Find the source and stop it.', obj: [{ t: 'boss', boss: 'toad', text: 'Defeat the creature in Mossy Hollow' }], reward: { xp: 150, gold: 120, items: [['treat', 3]] }, mark: 'dng_cave' });
  q('m4', { main: 1, name: 'Whispers in the Wood', giver: 'maren', req: ['m3'], desc: 'The Toad King was only a symptom. Maren says Druid Sylva of the Darkwood knows the old legends. Find her shrine to the west.', obj: [{ t: 'talk', npc: 'sylva', text: 'Find Druid Sylva in the Darkwood' }], reward: { xp: 80, gold: 60 }, mark: 'darkwood_shrine' });
  q('m5', { main: 1, name: 'Heart of the Forest', giver: 'sylva', req: ['m4'], desc: 'Four seals bind the Shadow Realm. The first, the Verdant Sigil, is held by the Forest Guardian, now maddened by the dark. Free it in Thornheart Temple.', obj: [{ t: 'boss', boss: 'guardian', text: 'Defeat the Ancient Forest Guardian' }], reward: { xp: 400, gold: 250 }, mark: 'dng_forest' });
  q('m6', { main: 1, name: 'Bridge to the Sands', giver: 'bram', req: ['m5'], desc: 'The next seal lies in the Sunscorch Desert, across the river. Bram can rebuild the old bridge with planks and iron.', obj: [{ t: 'deliver', item: 'plank', n: 12, text: 'Bring 12 Planks' }, { t: 'deliver', item: 'iron_bar', n: 4, text: 'Bring 4 Iron Bars (smelt Darkwood iron)' }], reward: { xp: 200, gold: 100, event: 'bridge' }, mark: 'bridge_site' });
  q('m7', { main: 1, name: 'The Buried Sun', giver: 'zeya', req: ['m6'], desc: 'Zeya the archaeologist believes the Sunken Pyramid only opens to those carrying three Sun Tablets, scattered in desert ruins.', obj: [{ t: 'have', item: 'sun_tablet', n: 3, text: 'Find 3 Sun Tablets in desert ruins' }], reward: { xp: 300, gold: 200 }, mark: 'ruin1' });
  q('m8', { main: 1, name: 'Colossus Awakens', giver: 'zeya', req: ['m7'], desc: 'The tablets fit the pyramid door. Something enormous waits inside.', obj: [{ t: 'boss', boss: 'colossus', text: 'Defeat the Sandstone Colossus' }], reward: { xp: 800, gold: 400 }, mark: 'dng_desert' });
  q('m9', { main: 1, name: 'Cold Welcome', giver: 'maren', req: ['m8'], desc: 'The third seal is in Frostfall to the north. The cold there is deadly without warm clothing: craft a Fur Cloak (Workbench: 5 Pelts, 6 Fiber) and wear it. Seek Priestess Ilsa in Hearthpeak.', obj: [{ t: 'talk', npc: 'ilsa', text: 'Reach Hearthpeak and talk to Priestess Ilsa' }], reward: { xp: 300, gold: 200 }, mark: 'frost_village' });
  q('m10', { main: 1, name: 'Wings of Winter', giver: 'ilsa', req: ['m9'], desc: 'The Frost Dragon guards the Glacial Sigil in the Glacier Sanctum high in the peaks.', obj: [{ t: 'boss', boss: 'dragon', text: 'Defeat the Frost Dragon' }], reward: { xp: 1500, gold: 700 }, mark: 'dng_ice' });
  q('m11', { main: 1, name: 'Into the Fire', giver: 'ilsa', req: ['m10'], desc: 'The Glacier Charm lets you walk over cooling lava. Cross into the Volcanic Wastelands, find Forgemaster Brakka, then face the Molten Titan in the Magma Forge.', obj: [{ t: 'talk', npc: 'brakka', text: 'Meet Forgemaster Brakka' }, { t: 'boss', boss: 'titan', text: 'Defeat the Molten Titan' }], reward: { xp: 2500, gold: 1200 }, mark: 'dng_fire' });
  q('m12', { main: 1, name: 'The Shattered Seal', giver: 'maren', req: ['m11'], desc: 'With all four sigils, return to the Ancient Gate in the Greenfields ruins and open the way to the Shadow Realm.', obj: [{ t: 'visit', spot: 'gate_used', text: 'Place the sigils at the Ancient Gate' }], reward: { xp: 500, gold: 0 }, mark: 'ancient_gate' });
  q('m13', { main: 1, name: 'Sovereign of Shadow', giver: 'maren', req: ['m12'], desc: 'Enter the Umbral Citadel and end this.', obj: [{ t: 'boss', boss: 'sovereign', text: 'Defeat the Shadow Sovereign' }], reward: { xp: 5000, gold: 3000, items: [['d_trophy', 1]] }, mark: 'dng_shadow' });
  // side quests
  q('s1', { name: 'Slime Trouble', giver: 'oswin', desc: 'Slimes keep eating my cabbages! Thin them out, would you?', obj: [{ t: 'kill', enemy: 'slime', n: 6, text: 'Defeat Green Slimes' }], reward: { xp: 40, gold: 50, items: [['carrot_seed', 5]] } });
  q('s2', { name: 'First Harvest', giver: 'oswin', req: ['s1'], desc: 'Your farm plot is begging to be used. Grow and harvest some crops.', obj: [{ t: 'harvest', n: 5, text: 'Harvest crops' }], reward: { xp: 80, gold: 100, items: [['pumpkin_seed', 3]] } });
  q('s3', { name: 'Catch of the Day', giver: 'nell', desc: 'Nothing beats a quiet morning by the water. Catch a few fish and you will see.', obj: [{ t: 'fish', n: 3, text: 'Catch fish' }], reward: { xp: 60, gold: 60, items: [['fish_skewer', 2]] } });
  q('s4', { name: 'A New Friend', giver: 'pip', desc: 'Wild creatures roam every region. Offer one a Bond Treat when it is calm and weakened, and it might join you!', obj: [{ t: 'bond', n: 1, text: 'Befriend a creature' }], reward: { xp: 80, gold: 50, items: [['treat', 3]] } });
  q('s5', { name: 'Glowing Gifts', giver: 'juniper', desc: 'Glowcaps grow in the Darkwood. I need them for mana tonics.', obj: [{ t: 'deliver', item: 'glowcap', n: 6, text: 'Bring 6 Glowcaps' }], reward: { xp: 120, gold: 120, items: [['mp_small', 4]] } });
  q('s6', { name: 'The Lost Locket', giver: 'tilly', desc: 'I dropped my locket while chasing a fox into the Darkwood. Please find it!', obj: [{ t: 'deliver', item: 'locket', n: 1, text: "Find Tilly's locket in the Darkwood" }], reward: { xp: 150, gold: 80, items: [['u_lucky', 1]] } });
  q('s7', { name: "Smith's Request", giver: 'hilda', req: ['m3'], desc: 'Show me you can work iron. Forge an Iron Sword and bring it here.', obj: [{ t: 'deliver', item: 'sword_2', n: 1, text: 'Forge and bring an Iron Sword' }], reward: { xp: 200, gold: 250, items: [['ring_copper', 1]] } });
  q('s8', { name: 'Scorpion Sting', giver: 'kesh', desc: 'Scorpions are swarming the trade road. Drive them back.', obj: [{ t: 'kill', enemy: 'scorpion', n: 8, text: 'Defeat Sand Scorpions' }], reward: { xp: 300, gold: 300, items: [['hp_large', 3]] } });
  q('s9', { name: 'Treasure Hunter', giver: 'zeya', desc: 'Every chest tells a story. Open a dozen and tell me about them.', obj: [{ t: 'chests', n: 12, text: 'Open treasure chests' }], reward: { xp: 400, gold: 500, items: [['u_zephyr', 1]] } });
  q('s10', { name: 'Frost Furs', giver: 'rurik', desc: 'Winter is long up here. Bring me frost pelts and I will make it worth your while.', obj: [{ t: 'deliver', item: 'frost_pelt', n: 5, text: 'Bring 5 Frost Pelts' }], reward: { xp: 500, gold: 400, items: [['frost_cloak', 1]] } });
  q('s11', { name: 'Spice of Life', giver: 'brakka', desc: 'Grow me some Fire Peppers. A forge-hand needs a proper curry.', obj: [{ t: 'deliver', item: 'firepepper', n: 4, text: 'Bring 4 Fire Peppers' }], reward: { xp: 700, gold: 600, items: [['spicy_curry', 3]] } });
  q('s12', { name: 'Collector', giver: 'pip', req: ['s4'], desc: 'Fill your creature journal! Discover different species across the realm.', obj: [{ t: 'species', n: 8, text: 'Discover creature species' }], reward: { xp: 600, gold: 400, items: [['treat_plus', 3], ['evo_stone', 1]] } });
  q('s13', { name: 'Ember Hoard', giver: 'brakka', desc: 'Emberite is the only ore that survives my forge. Mine me some.', obj: [{ t: 'mine', item: 'ember_ore', n: 10, text: 'Mine Emberite Ore' }], reward: { xp: 800, gold: 800, items: [['ember_bar', 4]] } });
  q('s14', { name: 'Waystones', giver: 'odo', desc: 'The old waystones still work! Touch them to travel between them instantly. Find a few.', obj: [{ t: 'waypoints', n: 4, text: 'Activate waystones' }], reward: { xp: 150, gold: 150, items: [['return_scroll', 3]] } });
  q('s15', { name: 'Home Sweet Home', giver: 'bram', desc: 'That house of yours could use some work. Bring materials and I will add a forge corner, more storage and a bigger farm.', obj: [{ t: 'deliver', item: 'plank', n: 25, text: 'Bring 25 Planks' }, { t: 'deliver', item: 'stone', n: 20, text: 'Bring 20 Stone' }, { t: 'deliver', item: 'copper_bar', n: 5, text: 'Bring 5 Copper Bars' }], reward: { xp: 200, gold: 0, event: 'home_upgrade' } });

  /* dialogue: by npc, keyed by context. {name} is replaced */
  D.TALK = {
    maren: { idle: ['The earth sings a troubled song lately, {name}.', 'Willowbrook has stood for three hundred years. It will stand longer, with your help.', 'Rest when you need to. Your bed at home restores body and spirit.'], night: 'Late to be wandering, child. Mind the wolves.' },
    hilda: { idle: ['Copper first, then iron. Respect the order of metal.', 'A good blade is half the fight. The other half is not getting hit.'], night: 'Forge is cold. Come back in the morning.' },
    odo: { idle: ['Seeds, bombs, arrows, a lovely potted fern. Odo has it all!', 'Bombs crack weak walls. You did not hear that from me.'], night: 'Closed! Even shopkeepers sleep.' },
    juniper: { idle: ['Greenleaf and slime gel make a fine tonic.', 'Moonpetals only open their secrets in the Darkwood.'], night: 'Shh, the potions are steeping.' },
    oswin: { idle: ['Till the soil, plant the seed, water every day. Rain helps.', 'A Sproutling companion will water your crops for you. Lucky folk, those ranchers.'], night: 'Goodnight! Crops grow while we sleep.' },
    bram: { idle: ['Wood becomes planks at any workbench. Planks become everything else.', 'That bridge went out in the flood years back.'], night: 'Hammer is down for the day.' },
    tilly: { idle: ['Did you know some foxes glow? I saw one in the Darkwood!', 'When I grow up I want a hundred creatures.'], night: 'Mum says I have to be home before dark...' },
    nell: { idle: ['Cast, wait for the splash, then keep the fish inside the green bar.', 'Golden koi bite once in a blue moon. Or so they say.'], night: 'Night fishing? Catfish bite better in the dark.' },
    pip: { idle: ['Weaken a creature a little, then offer a treat. Do not knock it out!', 'Companions grow stronger as you fight together. At level 10 some can evolve at my altar.'], night: 'The critters are asleep. So should we be.' },
    sylva: { idle: ['The forest remembers the old war against the Shadow.', 'Look for where moonlight pools. The Darkwood hides a blade there.'], night: 'At night the glowcaps sing. Listen.' },
    zeya: { idle: ['Sun Tablets were carried into the ruins by the old priests.', 'Some walls in the desert ruins are cracked. A bomb would be very... archaeological.'], night: 'Stars are the best map in the desert.' },
    kesh: { idle: ['Stay on the road. The dunes bite.', 'Lurkers hide under the sand. Watch for twitching dunes.'], night: 'Gate stays open, but I am watching.' },
    marlo: { idle: ['Rare goods for rare adventurers!', 'Gold signets for the lucky, quivers for the quick.'], night: 'Shop is closed, friend.' },
    ilsa: { idle: ['The cold here kills the unprepared. Keep your cloak on.', 'The dragon was once our guardian. Something poisoned its heart.'], night: 'The aurora is beautiful tonight.' },
    rurik: { idle: ['Frost wolves hunt in packs. Never fight three at once.', 'Yetis charge in a straight line. Step aside and strike.'], night: 'Fire is warm, sit a while.' },
    brakka: { idle: ['Emberite needs a frostsilver pick. Funny, eh?', 'The Titan wakes when the mountain groans.'], night: 'Forge never sleeps. I do.' },
  };
})();
