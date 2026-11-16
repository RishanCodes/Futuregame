// FORGEBORN — static game data: materials, blueprints, components, enchantments,
// enemies, regions, locations, events, quests, talents, upgrades, achievements.

export const QUALITY = ['Common', 'Refined', 'Pristine'];
export const QUALITY_BONUS = [0, 0.05, 0.1];

export const RARITIES = [
  { id: 'common', name: 'Common', color: '#b9b4a8', mult: 1.0, traits: 0 },
  { id: 'uncommon', name: 'Uncommon', color: '#6fcf7a', mult: 1.03, traits: 1 },
  { id: 'rare', name: 'Rare', color: '#5aa8ff', mult: 1.06, traits: 1 },
  { id: 'epic', name: 'Epic', color: '#b06bff', mult: 1.09, traits: 2 },
  { id: 'legendary', name: 'Legendary', color: '#ffae3d', mult: 1.12, traits: 2 },
  { id: 'mythic', name: 'Mythic', color: '#ff5b6e', mult: 1.15, traits: 3 },
  { id: 'celestial', name: 'Celestial', color: '#8ff3ff', mult: 1.18, traits: 3 },
];

// Craftsmanship grades are manufacturing quality, separate from rarity.
export const GRADES = [
  { id: 'flawed', name: 'Flawed', min: 0, color: '#9a7b6a' },
  { id: 'standard', name: 'Standard', min: 35, color: '#c9c1b0' },
  { id: 'fine', name: 'Fine', min: 55, color: '#86d28f' },
  { id: 'superior', name: 'Superior', min: 70, color: '#6cb6ff' },
  { id: 'masterwork', name: 'Masterwork', min: 84, color: '#c38bff' },
  { id: 'legendary', name: 'Legendary Craftsmanship', min: 95, color: '#ffc45a' },
];

export const ELEMENTS = {
  none: { name: 'None', color: '#cfc6b4', status: null },
  fire: { name: 'Fire', color: '#ff7a2e', status: 'burn' },
  frost: { name: 'Frost', color: '#7fd8ff', status: 'frost' },
  storm: { name: 'Storm', color: '#ffe066', status: 'shock' },
  venom: { name: 'Venom', color: '#8be05a', status: 'poison' },
  blood: { name: 'Blood', color: '#e0405a', status: 'bleed' },
  void: { name: 'Void', color: '#a46bff', status: 'armorbreak' },
  light: { name: 'Radiance', color: '#fff2b0', status: 'regen' },
  astral: { name: 'Astral', color: '#9ff0ff', status: 'shock' },
};

// kind: metal (primary-capable), fuel, wood, hide, gem, herb, monster, relic, boss, essence
// power: base material strength for primary metals. hard: required pickaxe tier.
export const MATS = {
  // ---- Tier 1 ----
  iron: { name: 'Iron Ore', kind: 'metal', tier: 1, power: 10, hard: 1, color: '#9aa1ab', dark: '#4c535d', guard: 2, desc: 'Dependable and sturdy. Adds a little guard.', src: 'Mined at Copperbrook Mine and Deepvein Quarry.' },
  copper: { name: 'Copper Ore', kind: 'metal', tier: 1, power: 8, hard: 1, color: '#d9814a', dark: '#7a3e1f', speed: 3, elem: 'storm', desc: 'Light and conductive. Faster, and carries a faint storm affinity.', src: 'Mined at Copperbrook Mine.' },
  silver: { name: 'Silver Ore', kind: 'metal', tier: 1, power: 9, hard: 2, color: '#dfe6ee', dark: '#7d8896', crit: 4, arcana: 3, desc: 'Takes an edge well and holds enchantment. Bonus critical chance.', src: 'Mined at Hollow Cave (needs an Iron Pickaxe).' },
  coal: { name: 'Coal', kind: 'fuel', tier: 1, hard: 1, color: '#3a3a40', dark: '#151518', desc: 'Forge fuel. Every forging and smelting burns some.', src: 'Mined in Emberfall, sold at Hearthstone Forge.' },
  quartz: { name: 'Quartz', kind: 'gem', tier: 1, hard: 1, color: '#f2eefc', dark: '#a9a2c4', desc: 'A clear crystal that focuses arcane energy.', src: 'Rare pocket in Emberfall deposits.' },
  oakwood: { name: 'Oakwood', kind: 'wood', tier: 1, color: '#a8773f', dark: '#5a3d1c', desc: 'Hafts, handles and staves.', src: 'Foraged on Emberwood Trail, sold at Hearthstone Forge.' },
  leather: { name: 'Leather Hide', kind: 'hide', tier: 1, color: '#9a6a43', dark: '#4f341f', desc: 'For grips and wraps.', src: 'Dropped by beasts, sold at Hearthstone Forge.' },
  emberleaf: { name: 'Emberleaf', kind: 'herb', tier: 1, color: '#ff8c4a', dark: '#8a3010', desc: 'A warm red herb used in tonics and fire runes.', src: 'Foraged on Emberwood Trail.' },
  beastfang: { name: 'Beast Fang', kind: 'monster', tier: 1, color: '#efe4c8', dark: '#9b8b63', desc: 'Serrated fangs for bleeding edges.', src: 'Dropped by boars, wolves and Grimjaw.' },
  slimegel: { name: 'Slime Gel', kind: 'monster', tier: 1, color: '#ff9f5a', dark: '#a24a18', desc: 'Volatile gel. Used in Ember enchantments and bombs.', src: 'Dropped by Ember Slimes.' },
  // ---- Tier 2 ----
  steel: { name: 'Steel Ingot', kind: 'metal', tier: 2, power: 18, color: '#b8c2cc', dark: '#56616d', guard: 3, desc: 'Refined from iron and coal. The backbone of serious smithing.', src: 'Smelted at the Material Refinery.' },
  silversteel: { name: 'Silversteel Ingot', kind: 'metal', tier: 2, power: 20, color: '#e9f1ff', dark: '#7f8fa8', crit: 5, arcana: 4, desc: 'Steel folded with silver. Keen and enchantable.', src: 'Smelted at the Material Refinery (level 2).' },
  emberstone: { name: 'Emberstone', kind: 'metal', tier: 2, power: 19, hard: 3, color: '#ff6a2a', dark: '#7a1e08', elem: 'fire', desc: 'Stone that never fully cools. Carries fire.', src: 'Mined at Deepvein Quarry and Magma Rift (needs a Steel Pickaxe).' },
  frostglass: { name: 'Frostglass', kind: 'metal', tier: 2, power: 19, hard: 3, color: '#a6e8ff', dark: '#3a7a9a', elem: 'frost', arcana: 5, desc: 'Glacial crystal hard as steel. Carries frost.', src: 'Mined at Frostpeak Glacier (needs a Steel Pickaxe).' },
  ironwood: { name: 'Ironwood', kind: 'wood', tier: 2, color: '#6d5a48', dark: '#33281e', desc: 'Dense mountain timber for heavy hafts.', src: 'Foraged at Stonegate Pass.' },
  sapphire: { name: 'Sapphire', kind: 'gem', tier: 2, hard: 2, color: '#4f7bff', dark: '#1b2f8a', desc: 'Stabilizes volatile energies.', src: 'Rare pocket at Deepvein Quarry.' },
  wolfpelt: { name: 'Wolf Pelt', kind: 'hide', tier: 2, color: '#b8b2a8', dark: '#5f5a52', desc: 'Thick pelt for warm, sure grips.', src: 'Dropped by Ridge Wolves.' },
  stoneheart: { name: 'Stoneheart', kind: 'monster', tier: 2, color: '#b0a089', dark: '#5e5241', desc: 'The core of a golem. Heavy and stable.', src: 'Dropped by Rock Golems.' },
  frostfeather: { name: 'Frost Feather', kind: 'monster', tier: 2, color: '#d9f6ff', dark: '#6fa8c4', desc: 'Feathers that hold winter.', src: 'Dropped by Frost Harpies.' },
  // ---- Tier 3 ----
  stormite: { name: 'Stormite', kind: 'metal', tier: 3, power: 28, hard: 4, color: '#ffe36a', dark: '#6a5a10', elem: 'storm', speed: 4, desc: 'Lightning frozen into metal. Hums in the hand.', src: 'Mined at Stormcrown Spire (needs a Runic Pickaxe).' },
  mithril: { name: 'Mithril', kind: 'metal', tier: 3, power: 27, hard: 4, color: '#d6fff4', dark: '#4f8c80', speed: 6, crit: 4, arcana: 6, desc: 'Elven metal, light as cloth and harder than steel.', src: 'Mined at the Sunken Elven Ruins (needs a Runic Pickaxe).' },
  spiritwood: { name: 'Spiritwood', kind: 'wood', tier: 3, color: '#9bd6b0', dark: '#2e6648', desc: 'Living wood that channels mana.', src: 'Foraged in the Moonlit Grove.' },
  emerald: { name: 'Verdant Emerald', kind: 'gem', tier: 3, hard: 4, color: '#3fe08a', dark: '#0f6a3a', desc: 'A gem of the wild that hungers for life.', src: 'Rare pocket in the Whispering Wilds.' },
  moonpetal: { name: 'Moonpetal', kind: 'herb', tier: 3, color: '#cfc8ff', dark: '#5f55b0', desc: 'Glows at night. Core reagent for runes.', src: 'Foraged in the Moonlit Grove.' },
  wispessence: { name: 'Wisp Essence', kind: 'monster', tier: 3, color: '#b8ffef', dark: '#2a9c88', desc: 'Captured light of a forest spirit.', src: 'Dropped by Wisps.' },
  venomsac: { name: 'Venom Sac', kind: 'monster', tier: 3, color: '#9be04a', dark: '#3f6a12', desc: 'Concentrated thornling venom.', src: 'Dropped by Thornlings.' },
  runetablet: { name: 'Rune Tablet', kind: 'relic', tier: 2, color: '#c9b37a', dark: '#5f4f28', desc: 'Ancient carved runes. Teaches enchantments when studied.', src: 'Defeat Bandit Captain Varka in Hollow Cave (60% drop), search the Forgotten Shrine event (40%), ask the Elven Echo (Whispering Wilds), or defeat Elven Sentinels (25%).' },
  ancientgear: { name: 'Ancient Gear', kind: 'relic', tier: 2, color: '#c99a5a', dark: '#5f421f', desc: 'Precision clockwork from a lost age.', src: 'Found exploring ruins, dropped by constructs.' },
  // ---- Tier 4 ----
  voidore: { name: 'Void Ore', kind: 'metal', tier: 4, power: 36, hard: 5, color: '#8f5bff', dark: '#24104f', elem: 'void', pierce: 0.12, desc: 'Ore that swallows light. Cuts through armor.', src: 'Mined at Magma Rift and the Void Rift (needs a Mithril Pickaxe).' },
  dragonbone: { name: 'Dragonbone', kind: 'metal', tier: 4, power: 38, hard: 5, color: '#f2e6cc', dark: '#8a7448', guard: 5, crit: 3, desc: 'Fossilized dragon bone. Impossibly strong.', src: 'Excavated at the Dragon Graveyard (needs a Mithril Pickaxe).' },
  ruby: { name: 'Ruby', kind: 'gem', tier: 4, hard: 5, color: '#ff3a5a', dark: '#7a0f22', desc: 'Holds heat and blood alike.', src: 'Rare pocket in the Ashen Wastes.' },
  wyrmhide: { name: 'Wyrmhide', kind: 'hide', tier: 4, color: '#b8503a', dark: '#4f1a10', desc: 'Scaled hide that shrugs off flame.', src: 'Dropped by Salamanders and drakes.' },
  ashbloom: { name: 'Ashbloom', kind: 'herb', tier: 4, color: '#ffb36a', dark: '#7a3a10', desc: 'A flower that only blooms in fresh ash.', src: 'Foraged at Cinderfall Outpost.' },
  embercore: { name: 'Ember Core', kind: 'monster', tier: 4, color: '#ff7a2e', dark: '#8a2a05', desc: 'The burning heart of a fire elemental.', src: 'Dropped by Magma Hounds and Cinder Wraiths.' },
  voidshard: { name: 'Void Shard', kind: 'monster', tier: 4, color: '#b48aff', dark: '#3a1a7a', desc: 'A splinter of nothing.', src: 'Dropped by Void Stalkers and Obsidian Knights.' },
  // ---- Tier 5 ----
  astral: { name: 'Astral Alloy', kind: 'metal', tier: 5, power: 48, hard: 6, color: '#bfe9ff', dark: '#2f5f8f', elem: 'astral', arcana: 6, speed: 3, desc: 'Metal that fell from the stars, still singing.', src: 'Mined at Starfall Crater (needs a Celestial Excavator).' },
  celestial: { name: 'Celestial Crystal', kind: 'metal', tier: 5, power: 46, hard: 6, color: '#e9d8ff', dark: '#6a4fb0', arcana: 14, crit: 4, desc: 'Crystallized starlight. The finest staff material.', src: 'Mined at the Celestial Observatory (needs a Celestial Excavator).' },
  starforged: { name: 'Starforged Metal', kind: 'metal', tier: 5, power: 58, color: '#fff4c8', dark: '#8a6a20', elem: 'astral', crit: 5, guard: 4, desc: 'The pinnacle of smithing. Refined from astral alloy and essence.', src: 'Smelted at the Material Refinery (level 3) with the Legendary Crucible.' },
  starshard: { name: 'Starshard', kind: 'gem', tier: 5, hard: 6, color: '#fffbe0', dark: '#a8973a', desc: 'A fragment of a fallen star.', src: 'Rare pocket in the Astral Expanse.' },
  primordial: { name: 'Primordial Essence', kind: 'essence', tier: 5, color: '#ffffff', dark: '#8a7aff', desc: 'The stuff the world was made from.', src: 'Found in the Void Rift and from Astral bosses.' },
  staressence: { name: 'Star Essence', kind: 'monster', tier: 5, color: '#c8f4ff', dark: '#3a7aa8', desc: 'Light given will.', src: 'Dropped by Star Sentinels and Seraphs.' },
  // ---- Boss materials ----
  alphapelt: { name: "Grimjaw's Cinder Pelt", kind: 'boss', tier: 1, color: '#ff6a3a', dark: '#4a1a0a', desc: 'Still smoulders. Makes legendary grips.', src: 'Grimjaw, the Cinder Alpha.' },
  heartstone: { name: "Warden's Heartstone", kind: 'boss', tier: 2, color: '#d8c08a', dark: '#5a4a28', desc: 'A heart of living granite.', src: 'Korrath the Stone Warden.' },
  thornheart: { name: 'Thornheart', kind: 'boss', tier: 3, color: '#5fe06a', dark: '#1a5a20', desc: 'The seed of the Thornmother.', src: 'Sylvara, the Thornmother.' },
  drakeheart: { name: 'Drakeheart', kind: 'boss', tier: 4, color: '#ff4a1a', dark: '#5a0a00', desc: 'It still beats, slow and hot.', src: 'Pyraxis, the Ember Drake.' },
  crownshard: { name: 'Hollow Crown Shard', kind: 'boss', tier: 5, color: '#e0d0ff', dark: '#30204f', desc: 'A shard of a crown that ruled nothing.', src: 'The Hollow Sovereign.' },
  smithsoul: { name: "First Smith's Ember", kind: 'boss', tier: 5, color: '#ffd27a', dark: '#7a4a10', desc: 'The ember from which every forge was lit.', src: 'Echo of the First Smith.' },
};

export const MAT_KINDS = { metal: 'Metals', fuel: 'Fuel', wood: 'Wood', hide: 'Hides', gem: 'Gems', herb: 'Herbs', monster: 'Monster parts', relic: 'Relics', essence: 'Essences', boss: 'Boss trophies' };

export const CATEGORIES = {
  sword: { name: 'Sword', desc: 'Balanced techniques and counterattacks.' },
  dagger: { name: 'Dagger', desc: 'Fast strikes, critical combinations and evasion.' },
  greatsword: { name: 'Greatsword', desc: 'High-impact blows and charged techniques.' },
  spear: { name: 'Spear', desc: 'Armor penetration and precision.' },
  hammer: { name: 'Warhammer', desc: 'Guard breaking and stagger.' },
  staff: { name: 'Staff', desc: 'Magical attacks and elemental combinations.' },
};

// Stage configs per category describe each QTE's flavor. Weights sum per recipe.
// Stage ids: furnace, circular, hammer, quench, runes, mana
export const BLUEPRINTS = {
  arming: { name: 'Arming Sword', cat: 'sword', tier: 1, ore: 3, extra: { coal: 1, oakwood: 1 }, slots: ['grip', 'guard', 'fitting'], base: { power: 1.0, speed: 10, crit: 5, guard: 4, arcana: 0 }, stages: [['furnace', 1], ['circular', 1.2], ['hammer', 1.2], ['quench', 1]], start: true, desc: 'A reliable one-handed blade. The first thing every smith learns.' },
  dirk: { name: 'Iron Dirk', cat: 'dagger', tier: 1, ore: 2, extra: { coal: 1, leather: 1 }, slots: ['grip', 'fitting'], base: { power: 0.78, speed: 18, crit: 12, guard: 1, arcana: 0 }, stages: [['furnace', 0.8], ['hammer', 1.3], ['circular', 1.2], ['quench', 1]], start: true, desc: 'A short blade for quick, precise work.' },
  huntspear: { name: 'Hunting Spear', cat: 'spear', tier: 1, ore: 3, extra: { coal: 1, oakwood: 2 }, slots: ['grip', 'fitting'], base: { power: 0.95, speed: 11, crit: 7, guard: 3, arcana: 0, pierce: 0.15 }, stages: [['furnace', 1], ['circular', 1.4], ['hammer', 1], ['quench', 1]], desc: 'A leaf-bladed spear. Reach and penetration.' },
  mallet: { name: 'Forge Mallet', cat: 'hammer', tier: 1, ore: 4, extra: { coal: 1, oakwood: 2 }, slots: ['grip', 'fitting'], base: { power: 1.12, speed: 5, crit: 3, guard: 5, arcana: 0 }, stages: [['furnace', 1], ['hammer', 1.5], ['quench', 1]], desc: 'A smith\'s hammer made for heads instead of iron.' },
  appstaff: { name: 'Apprentice Staff', cat: 'staff', tier: 1, ore: 2, extra: { oakwood: 3, quartz: 1 }, slots: ['grip', 'core'], base: { power: 0.7, speed: 9, crit: 5, guard: 2, arcana: 1.0 }, stages: [['furnace', 0.8], ['circular', 1], ['runes', 1.6]], desc: 'An oaken staff capped with metal and a focusing crystal.' },
  longsword: { name: 'Longsword', cat: 'sword', tier: 2, ore: 4, extra: { coal: 2, ironwood: 1 }, slots: ['grip', 'guard', 'fitting'], base: { power: 1.05, speed: 10, crit: 6, guard: 6, arcana: 0 }, stages: [['furnace', 1], ['circular', 1.2], ['hammer', 1.3], ['quench', 1.1]], desc: 'A hand-and-a-half blade with a long fuller.' },
  stiletto: { name: 'Stiletto', cat: 'dagger', tier: 2, ore: 2, extra: { coal: 1, wolfpelt: 1 }, slots: ['grip', 'guard', 'fitting'], base: { power: 0.82, speed: 20, crit: 15, guard: 1, arcana: 0, pierce: 0.1 }, stages: [['furnace', 0.8], ['hammer', 1.3], ['circular', 1.3], ['quench', 1]], desc: 'A needle-thin blade that slips between plates.' },
  claymore: { name: 'Claymore', cat: 'greatsword', tier: 2, ore: 6, extra: { coal: 3, ironwood: 2 }, slots: ['grip', 'guard', 'fitting'], base: { power: 1.38, speed: 4, crit: 6, guard: 7, arcana: 0 }, stages: [['furnace', 1.2], ['hammer', 1.4], ['circular', 1], ['quench', 1.2]], anvil: 1, desc: 'A towering two-handed sword. Slow, devastating.' },
  warpike: { name: 'War Pike', cat: 'spear', tier: 2, ore: 4, extra: { coal: 2, ironwood: 2 }, slots: ['grip', 'guard', 'fitting'], base: { power: 1.0, speed: 11, crit: 8, guard: 4, arcana: 0, pierce: 0.22 }, stages: [['furnace', 1], ['circular', 1.4], ['hammer', 1], ['quench', 1]], desc: 'A long pike with a hardened spike.' },
  warhammer: { name: 'Warhammer', cat: 'hammer', tier: 2, ore: 5, extra: { coal: 2, ironwood: 2 }, slots: ['grip', 'guard', 'fitting'], base: { power: 1.2, speed: 5, crit: 4, guard: 7, arcana: 0 }, stages: [['furnace', 1], ['hammer', 1.6], ['circular', 0.8], ['quench', 1]], anvil: 1, desc: 'A spiked war head on an ironwood haft.' },
  spiritstaff: { name: 'Spiritwood Staff', cat: 'staff', tier: 3, ore: 2, extra: { spiritwood: 3, moonpetal: 1 }, slots: ['grip', 'core', 'fitting'], base: { power: 0.76, speed: 9, crit: 6, guard: 3, arcana: 1.2 }, stages: [['furnace', 0.7], ['circular', 1], ['runes', 1.6], ['mana', 1.3]], desc: 'A living staff that drinks mana from the air.' },
  runeblade: { name: 'Runeblade', cat: 'sword', tier: 3, ore: 4, extra: { coal: 2, spiritwood: 1, runetablet: 1 }, slots: ['grip', 'guard', 'core', 'fitting'], base: { power: 1.08, speed: 11, crit: 8, guard: 6, arcana: 0.45 }, stages: [['furnace', 1], ['circular', 1.1], ['hammer', 1.2], ['runes', 1.3], ['quench', 1]], desc: 'An elven sword etched with channeling runes. Spells flow along its fuller.' },
  shadowkris: { name: 'Shadowfang Kris', cat: 'dagger', tier: 3, ore: 3, extra: { coal: 2, venomsac: 1 }, slots: ['grip', 'guard', 'core', 'fitting'], base: { power: 0.86, speed: 22, crit: 18, guard: 2, arcana: 0, pierce: 0.12 }, stages: [['furnace', 0.8], ['hammer', 1.4], ['circular', 1.3], ['quench', 1.1]], desc: 'A wavy blade that bleeds its victims dry.' },
  stormlance: { name: 'Stormlance', cat: 'spear', tier: 3, ore: 5, extra: { coal: 2, spiritwood: 2, sapphire: 1 }, slots: ['grip', 'guard', 'core', 'fitting'], base: { power: 1.04, speed: 13, crit: 9, guard: 4, arcana: 0.2, pierce: 0.28 }, stages: [['furnace', 1], ['circular', 1.4], ['hammer', 1], ['mana', 1], ['quench', 1]], desc: 'A spear forged to call lightning down its length.' },
  earthshaker: { name: 'Earthshaker Maul', cat: 'hammer', tier: 3, ore: 7, extra: { coal: 3, ironwood: 3, stoneheart: 1 }, slots: ['grip', 'guard', 'core', 'fitting'], base: { power: 1.3, speed: 4, crit: 4, guard: 9, arcana: 0 }, stages: [['furnace', 1.2], ['hammer', 1.7], ['circular', 0.8], ['quench', 1.1]], anvil: 2, desc: 'A maul so heavy the ground flinches when it lands.' },
  dragonsbane: { name: 'Dragonsbane', cat: 'greatsword', tier: 4, ore: 7, extra: { coal: 4, ironwood: 2, wyrmhide: 1 }, slots: ['grip', 'guard', 'core', 'fitting'], base: { power: 1.45, speed: 5, crit: 7, guard: 8, arcana: 0 }, stages: [['furnace', 1.3], ['hammer', 1.4], ['circular', 1], ['runes', 0.8], ['quench', 1.3]], anvil: 2, desc: 'A greatsword made to bring down wyrms.' },
  starfall: { name: 'Starfall Blade', cat: 'sword', tier: 5, ore: 5, extra: { coal: 3, starshard: 1, staressence: 1 }, slots: ['grip', 'guard', 'core', 'fitting'], base: { power: 1.12, speed: 12, crit: 10, guard: 7, arcana: 0.3 }, stages: [['furnace', 1.1], ['circular', 1.2], ['hammer', 1.2], ['mana', 1], ['quench', 1.1]], crucible: true, desc: 'A blade that remembers falling from heaven.' },
  astralscepter: { name: 'Astral Scepter', cat: 'staff', tier: 5, ore: 3, extra: { spiritwood: 2, starshard: 1, staressence: 1 }, slots: ['grip', 'core', 'fitting'], base: { power: 0.8, speed: 10, crit: 8, guard: 4, arcana: 1.4 }, stages: [['furnace', 0.8], ['circular', 1], ['runes', 1.5], ['mana', 1.5]], crucible: true, desc: 'A scepter that bends starlight into spells.' },
  phoenix: { name: 'Phoenix Brand', cat: 'sword', tier: 4, ore: 4, extra: { coal: 3, emberleaf: 4 }, slots: ['grip', 'guard', 'core', 'fitting'], base: { power: 1.1, speed: 12, crit: 9, guard: 6, arcana: 0.25 }, stages: [['furnace', 1.3], ['circular', 1.1], ['hammer', 1.1], ['quench', 1.1]], legacy: true, fixedElem: 'fire', desc: 'A legacy blueprint known only to rekindled smiths. Always carries fire and the Rebirth trait.' },
};

export const TIER_MULT = { 1: 1.0, 2: 1.12, 3: 1.25, 4: 1.33, 5: 1.4 };

// Components fill blueprint slots. Mods: flat stats, mult (power multiplier), special flags.
export const COMPONENTS = {
  leatherwrap: { name: 'Leather Wrap', slot: 'grip', cost: { leather: 1 }, mods: { speed: 2 }, desc: '+2 speed' },
  reinforcedgrip: { name: 'Reinforced Grip', slot: 'grip', cost: { leather: 2, iron: 1 }, mods: { speed: 1, guard: 3 }, desc: '+1 speed, +3 guard' },
  pelgrip: { name: 'Wolfpelt Grip', slot: 'grip', cost: { wolfpelt: 2 }, mods: { speed: 3, crit: 2 }, desc: '+3 speed, +2% crit' },
  spirithandle: { name: 'Spiritwood Handle', slot: 'grip', cost: { spiritwood: 2 }, mods: { arcana: 6, speed: 2 }, desc: '+6 arcana, +2 speed' },
  wyrmgrip: { name: 'Wyrmhide Grip', slot: 'grip', cost: { wyrmhide: 2 }, mods: { speed: 4, crit: 3, guard: 2 }, desc: '+4 speed, +3% crit, +2 guard' },
  cindergrip: { name: 'Cinderpelt Grip', slot: 'grip', cost: { alphapelt: 1, leather: 1 }, mods: { speed: 3, crit: 3 }, status: 0.06, desc: '+3 speed, +3% crit, +6% status chance' },
  ironguard: { name: 'Iron Crossguard', slot: 'guard', cost: { iron: 2 }, mods: { guard: 4 }, desc: '+4 guard' },
  silverhilt: { name: 'Silver Hilt', slot: 'guard', cost: { silver: 2 }, mods: { crit: 4, arcana: 2 }, desc: '+4% crit, +2 arcana' },
  stoneguard: { name: 'Heartstone Guard', slot: 'guard', cost: { heartstone: 1, steel: 1 }, mods: { guard: 9 }, parry: 0.1, desc: '+9 guard, defense timing window +10%' },
  frostguard: { name: 'Frostfeather Guard', slot: 'guard', cost: { frostfeather: 2, steel: 1 }, mods: { guard: 5, speed: 2 }, desc: '+5 guard, +2 speed' },
  dragonhilt: { name: 'Dragonbone Hilt', slot: 'guard', cost: { dragonbone: 1, ruby: 1 }, mods: { guard: 6, crit: 5 }, desc: '+6 guard, +5% crit' },
  quartzfocus: { name: 'Quartz Focus', slot: 'core', cost: { quartz: 2 }, mods: { arcana: 5 }, desc: '+5 arcana' },
  sapphirecore: { name: 'Sapphire Core', slot: 'core', cost: { sapphire: 1, silver: 1 }, mods: { arcana: 8 }, stab: 0.06, desc: '+8 arcana, steadier forging (+6% QTE windows)' },
  wispcore: { name: 'Wisp Core', slot: 'core', cost: { wispessence: 2, quartz: 1 }, mods: { arcana: 10, speed: 2 }, ench: 0.1, desc: '+10 arcana, +10% enchant potency' },
  embercorec: { name: 'Ember Heart Core', slot: 'core', cost: { embercore: 1, ruby: 1 }, mods: { arcana: 10 }, elem: 'fire', status: 0.08, desc: '+10 arcana, fire affinity, +8% status chance' },
  thorncore: { name: 'Thornheart Core', slot: 'core', cost: { thornheart: 1, emerald: 1 }, mods: { arcana: 12 }, lifesteal: 0.06, desc: '+12 arcana, 6% lifesteal' },
  starcore: { name: 'Star Core', slot: 'core', cost: { starshard: 1, staressence: 2 }, mods: { arcana: 18, crit: 3 }, ench: 0.15, desc: '+18 arcana, +3% crit, +15% enchant potency' },
  counterweight: { name: 'Counterweight', slot: 'fitting', cost: { iron: 2 }, mods: { mult: 0.06, speed: -2 }, desc: '+6% power, −2 speed' },
  serrated: { name: 'Serrated Fitting', slot: 'fitting', cost: { beastfang: 3 }, mods: { crit: 2 }, bleed: 0.15, desc: '+2% crit, 15% chance to cause Bleed' },
  stabcrystal: { name: 'Stabilizing Crystal', slot: 'fitting', cost: { quartz: 1, sapphire: 1 }, mods: { guard: 1 }, stab: 0.1, desc: '+1 guard, steadier forging (+10% QTE windows)' },
  runefitting: { name: 'Runesmith Fitting', slot: 'fitting', cost: { copper: 2, runetablet: 1 }, mods: { arcana: 3 }, ench: 0.2, desc: '+3 arcana, +20% enchant potency' },
  gearfitting: { name: 'Clockwork Balance', slot: 'fitting', cost: { ancientgear: 2, steel: 1 }, mods: { speed: 4, crit: 3 }, desc: '+4 speed, +3% crit' },
  voidfitting: { name: 'Void-Etched Fitting', slot: 'fitting', cost: { voidshard: 2 }, mods: { pierce: 0.1 }, desc: '+10% armor pierce' },
  drakefitting: { name: 'Drakeheart Fitting', slot: 'fitting', cost: { drakeheart: 1, dragonbone: 1 }, mods: { mult: 0.1 }, status: 0.05, desc: '+10% power, +5% status chance' },
  crownfitting: { name: 'Crownshard Fitting', slot: 'fitting', cost: { crownshard: 1, starshard: 1 }, mods: { mult: 0.08, crit: 5, arcana: 6 }, desc: '+8% power, +5% crit, +6 arcana' },
};
export const SLOT_NAMES = { grip: 'Grip', guard: 'Guard / Hilt', core: 'Magic Core', fitting: 'Fitting' };

// Enchantments: tier gates chamber level. runes: rune-pattern difficulty.
export const ENCHANTS = {
  ember: { name: 'Ember', elem: 'fire', tier: 1, cost: { emberleaf: 2, slimegel: 2 }, chance: 0.22, bonus: 0.06, runes: { glyphs: 2, nodes: 5 }, desc: 'Strikes may Burn (damage over time).' },
  frost: { name: 'Rime', elem: 'frost', tier: 1, cost: { frostfeather: 2, quartz: 1 }, chance: 0.22, bonus: 0.05, runes: { glyphs: 2, nodes: 5 }, desc: 'Strikes may apply Frost. 3 stacks freeze the target for a turn.' },
  storm: { name: 'Thunder', elem: 'storm', tier: 2, cost: { copper: 3, wispessence: 1 }, chance: 0.25, bonus: 0.07, runes: { glyphs: 3, nodes: 6 }, desc: 'Strikes may Shock: the target takes 25% more from the next hit.' },
  venom: { name: 'Venom', elem: 'venom', tier: 2, cost: { venomsac: 2, moonpetal: 1 }, chance: 0.3, bonus: 0.04, runes: { glyphs: 3, nodes: 6 }, desc: 'Strikes may Poison: damage over time that also weakens healing.' },
  blood: { name: 'Bloodthirst', elem: 'blood', tier: 2, cost: { beastfang: 4, emerald: 1 }, chance: 0.25, bonus: 0.05, lifesteal: 0.06, runes: { glyphs: 3, nodes: 7 }, desc: 'Strikes may Bleed and heal you for 6% of damage dealt.' },
  void: { name: 'Voidrend', elem: 'void', tier: 3, cost: { voidshard: 2, moonpetal: 2 }, chance: 0.2, bonus: 0.08, pierce: 0.1, runes: { glyphs: 3, nodes: 8, memory: true }, desc: 'Strikes may Break armor. Grants 10% armor pierce.' },
  radiance: { name: 'Radiance', elem: 'light', tier: 3, cost: { staressence: 1, moonpetal: 2 }, chance: 0.3, bonus: 0.07, runes: { glyphs: 3, nodes: 8 }, desc: 'Strikes may grant you Regeneration. Bonus damage to void creatures.' },
  starfire: { name: 'Starfire', elem: 'astral', tier: 3, cost: { staressence: 2, primordial: 1 }, chance: 0.28, bonus: 0.12, runes: { glyphs: 4, nodes: 9, memory: true }, desc: 'Strikes may Shock and Burn at once. The strongest enchantment.' },
};

// Traits rolled on forged weapons; strength scales with craft score.
export const TRAITS = {
  keen: { name: 'Keen Edge', desc: (v) => `+${v}% critical chance`, stat: 'crit', min: 3, max: 8 },
  balanced: { name: 'Perfectly Balanced', desc: (v) => `+${v} speed`, stat: 'speed', min: 2, max: 6 },
  tempered: { name: 'Deep Tempered', desc: (v) => `+${v} guard`, stat: 'guard', min: 2, max: 7 },
  brutal: { name: 'Brutal', desc: (v) => `+${v}% critical damage`, stat: 'critDmg', min: 10, max: 30 },
  vampiric: { name: 'Vampiric', desc: (v) => `Heal ${v}% of damage dealt`, stat: 'lifesteal', min: 2, max: 6 },
  resonant: { name: 'Resonant', desc: (v) => `+${v} arcana`, stat: 'arcana', min: 3, max: 10 },
  sundering: { name: 'Sundering', desc: (v) => `${v}% chance to Break armor`, stat: 'sunder', min: 6, max: 15 },
  piercing: { name: 'Piercing', desc: (v) => `+${v}% armor pierce`, stat: 'pierce', min: 4, max: 12 },
  staggering: { name: 'Concussive', desc: (v) => `+${v}% stagger`, stat: 'stagger', min: 10, max: 30 },
  catalyst: { name: 'Catalyst', desc: (v) => `+${v}% status chance`, stat: 'status', min: 4, max: 10 },
  hunter: { name: "Hunter's Mark", desc: (v) => `+${v}% damage to beasts`, stat: 'beast', min: 8, max: 20 },
  warding: { name: 'Warding', desc: (v) => `Start battles with a ${v} HP barrier`, stat: 'barrier', min: 8, max: 30 },
  masterwork: { name: 'Masterwork Grain', desc: (v) => `+${v}% power`, stat: 'mult', min: 3, max: 6, needGrade: 'masterwork' },
  rebirth: { name: 'Rebirth', desc: () => 'Once per battle, rise from a fatal blow at 30% HP', stat: 'rebirth', min: 1, max: 1, fixed: true },
};

// ---- Regions & locations ----
export const REGIONS = {
  emberfall: { name: 'Emberfall Valley', tier: 1, color: '#e08a3c', desc: 'A warm valley of oak forests and copper streams, home to your first forge.', unlock: null },
  ironspine: { name: 'Ironspine Highlands', tier: 2, color: '#8fa0b4', desc: 'Jagged peaks rich with metal, watched by stone guardians.', unlock: 'grimjaw' },
  wilds: { name: 'Whispering Wilds', tier: 3, color: '#5ccf8a', desc: 'An enchanted forest where the trees remember the elves.', unlock: 'korrath' },
  ashen: { name: 'Ashen Wastes', tier: 4, color: '#ff5a2a', desc: 'Volcanic badlands of black glass, dragon bones and fire spirits.', unlock: 'sylvara' },
  astral: { name: 'Astral Expanse', tier: 5, color: '#9fdcff', desc: 'Islands of stone adrift among the stars, where the world was first forged.', unlock: 'pyraxis' },
};

// type: home | mine | wild | ruin | boss | outpost. x,y on a 1000x640 map.
// deposits: [mat, weight]; forage: [mat, weight]; enemies: ids; secrets at progress thresholds.
export const LOCATIONS = {
  hearth: { name: 'Hearthstone Forge', region: 'emberfall', type: 'home', x: 150, y: 520, links: ['copperbrook', 'emberwood'], desc: 'Your forge, a cottage and a merchant who visits every morning. Rest here to recover fully.', start: true },
  copperbrook: { name: 'Copperbrook Mine', region: 'emberfall', type: 'mine', x: 90, y: 400, links: ['hearth', 'hollow'], deposits: [['iron', 5], ['copper', 4], ['coal', 4]], gems: ['quartz'], enemies: ['slime', 'bats'], start: true, desc: 'An old copper mine, reopened by the villagers. Iron and coal run through its walls.' },
  emberwood: { name: 'Emberwood Trail', region: 'emberfall', type: 'wild', x: 270, y: 470, links: ['hearth', 'hollow', 'grimden'], forage: [['oakwood', 5], ['emberleaf', 4], ['leather', 1]], deposits: [['iron', 2], ['copper', 2]], enemies: ['boar', 'bandit', 'slime'], start: true, desc: 'Red-leafed woods along the old road. Boars and bandits both claim it.', secrets: [[40, 'bp:huntspear'], [70, 'loc:grimden']] },
  hollow: { name: 'Hollow Cave', region: 'emberfall', type: 'ruin', x: 190, y: 360, links: ['copperbrook', 'emberwood'], deposits: [['silver', 4], ['iron', 3], ['coal', 2]], gems: ['quartz'], enemies: ['bats', 'slime', 'bandit'], elite: 'varka', desc: 'A cave of glittering silver veins. Something has made a camp in the deeper tunnels.', secrets: [[30, 'bp:mallet'], [60, 'bp:appstaff'], [85, 'ench:ember']], hidden: true },
  grimden: { name: "Grimjaw's Den", region: 'emberfall', type: 'boss', x: 330, y: 380, links: ['emberwood'], boss: 'grimjaw', desc: 'Scorched bones and the smell of smoke. The Cinder Alpha sleeps here.', hidden: true },
  stonegate: { name: 'Stonegate Pass', region: 'ironspine', type: 'wild', x: 230, y: 250, links: ['grimden', 'deepvein', 'frostpeak'], forage: [['ironwood', 5], ['leather', 2], ['wolfpelt', 1]], deposits: [['iron', 3], ['silver', 2]], enemies: ['wolf', 'legionnaire', 'golem'], desc: 'A wind-cut pass over the mountains, guarded by an abandoned legion fort.', secrets: [[35, 'bp:longsword'], [65, 'bp:stiletto']] },
  deepvein: { name: 'Deepvein Quarry', region: 'ironspine', type: 'mine', x: 110, y: 190, links: ['stonegate', 'bastion'], deposits: [['iron', 4], ['silver', 3], ['emberstone', 2], ['coal', 3]], gems: ['sapphire'], enemies: ['golem', 'wolf'], desc: 'A dwarven quarry cut a mile into the mountain. Magma vents glow in the deepest shafts.', secrets: [[40, 'bp:warpike'], [75, 'bp:claymore']] },
  frostpeak: { name: 'Frostpeak Glacier', region: 'ironspine', type: 'mine', x: 330, y: 130, links: ['stonegate', 'bastion'], deposits: [['frostglass', 4], ['silver', 2]], gems: ['sapphire'], forage: [['frostfeather', 2]], enemies: ['harpy', 'wolf'], elite: 'ironclad', desc: 'Blue ice older than the mountains. Harpies nest on the cliffs.', secrets: [[50, 'ench:frost']], hidden: true },
  bastion: { name: "Warden's Bastion", region: 'ironspine', type: 'boss', x: 200, y: 90, links: ['deepvein', 'frostpeak'], boss: 'korrath', desc: 'A fortress carved from a single mountain. Its gate is a giant made of stone.', hidden: true },
  grove: { name: 'Moonlit Grove', region: 'wilds', type: 'wild', x: 520, y: 290, links: ['stonegate', 'elvenruins', 'stormspire'], forage: [['spiritwood', 4], ['moonpetal', 4], ['emberleaf', 1]], enemies: ['wisp', 'thornling', 'treant'], desc: 'A clearing where it is always night and the flowers glow.', secrets: [[30, 'bp:spiritstaff'], [60, 'ench:venom']] },
  elvenruins: { name: 'Sunken Elven Ruins', region: 'wilds', type: 'ruin', x: 610, y: 400, links: ['grove', 'thornheart'], deposits: [['mithril', 4], ['silver', 2]], gems: ['emerald'], forage: [['moonpetal', 2]], enemies: ['sentinel', 'wisp', 'thornling'], elite: 'revenant', desc: 'Half-drowned halls of the elves. Their sentinels still keep watch.', secrets: [[25, 'bp:runeblade'], [55, 'ench:blood'], [80, 'bp:shadowkris']] },
  stormspire: { name: 'Stormcrown Spire', region: 'wilds', type: 'mine', x: 640, y: 200, links: ['grove', 'thornheart'], deposits: [['stormite', 4], ['mithril', 1], ['copper', 2]], gems: ['emerald'], enemies: ['wisp', 'sentinel'], desc: 'A lightning-struck tower of stone. The rock itself is charged.', secrets: [[45, 'ench:storm'], [75, 'bp:stormlance']], hidden: true },
  thornheart: { name: "Thornmother's Heart", region: 'wilds', type: 'boss', x: 740, y: 310, links: ['elvenruins', 'stormspire'], boss: 'sylvara', desc: 'Where the forest grows inward, wrapped in thorns as thick as towers.', hidden: true },
  cinderfall: { name: 'Cinderfall Outpost', region: 'ashen', type: 'outpost', x: 700, y: 520, links: ['thornheart', 'magmarift', 'graveyard'], forage: [['ashbloom', 4], ['ironwood', 1]], enemies: ['hound', 'salamander'], desc: 'The last camp before the ash. Travellers rest here, and so can you.', secrets: [[40, 'bp:earthshaker']] },
  magmarift: { name: 'Magma Rift', region: 'ashen', type: 'mine', x: 830, y: 560, links: ['cinderfall', 'caldera'], deposits: [['emberstone', 4], ['voidore', 3], ['coal', 2]], gems: ['ruby'], enemies: ['hound', 'wraith', 'obsidian'], elite: 'warlord', desc: 'A glowing crack where void ore pushes up through the magma.', secrets: [[55, 'ench:void']] },
  graveyard: { name: 'Dragon Graveyard', region: 'ashen', type: 'ruin', x: 880, y: 440, links: ['cinderfall', 'caldera'], deposits: [['dragonbone', 4], ['voidore', 1]], gems: ['ruby'], forage: [['wyrmhide', 1]], enemies: ['salamander', 'wraith', 'obsidian'], desc: 'Ribcages the size of cathedrals, half-buried in ash.', secrets: [[45, 'bp:dragonsbane']], hidden: true },
  caldera: { name: 'Pyraxis Caldera', region: 'ashen', type: 'boss', x: 930, y: 590, links: ['magmarift', 'graveyard'], boss: 'pyraxis', desc: 'The volcano\'s open mouth, and the drake that sleeps inside it.', hidden: true },
  starfall: { name: 'Starfall Crater', region: 'astral', type: 'mine', x: 790, y: 150, links: ['stormspire', 'observatory', 'voidrift'], deposits: [['astral', 4], ['mithril', 1]], gems: ['starshard'], enemies: ['starsentinel', 'voidstalker'], desc: 'Where a star struck the floating isles. The crater still shines.', secrets: [[40, 'bp:starfall']] },
  observatory: { name: 'Celestial Observatory', region: 'astral', type: 'ruin', x: 900, y: 80, links: ['starfall', 'throne'], deposits: [['celestial', 4]], gems: ['starshard'], forage: [['staressence', 1]], enemies: ['seraph', 'starsentinel'], elite: 'eclipse', desc: 'An observatory built by the first smiths to watch the stars cool.', secrets: [[35, 'ench:radiance'], [70, 'bp:astralscepter']] },
  voidrift: { name: 'The Void Rift', region: 'astral', type: 'wild', x: 940, y: 230, links: ['starfall', 'throne'], deposits: [['voidore', 3]], forage: [['primordial', 1], ['staressence', 1]], enemies: ['voidstalker', 'leviathan'], desc: 'A wound in the sky. Raw essence seeps from its edges.', secrets: [[50, 'ench:starfire']], hidden: true },
  throne: { name: 'Throne of the Hollow Sovereign', region: 'astral', type: 'boss', x: 960, y: 140, links: ['observatory', 'voidrift'], boss: 'sovereign', desc: 'An empty throne, and the crowned shadow that sits on it.', hidden: true },
  sanctum: { name: 'Echo Sanctum', region: 'astral', type: 'boss', x: 850, y: 40, links: ['observatory'], boss: 'echo', desc: 'The first forge in the world. Its fire is still lit.', hidden: true, secretBoss: true },
};

// ---- Enemies ----
// ai: aggressive | defensive | magical | heavy | tactical | swift. moves reference MOVES.
// type tags used for trait bonuses (beast) and radiance (void).
export const MOVES = {
  strike: { name: 'Strike', kind: 'attack', mult: 1.0, icon: 'sword' },
  bite: { name: 'Savage Bite', kind: 'attack', mult: 1.1, status: ['bleed', 0.3], icon: 'fang' },
  gore: { name: 'Tusk Charge', kind: 'heavy', mult: 1.7, icon: 'heavy', tele: 'Lowers its tusks to charge.' },
  flurry: { name: 'Flurry', kind: 'multi', hits: 3, mult: 0.42, icon: 'multi' },
  spit: { name: 'Ember Spit', kind: 'attack', mult: 0.8, status: ['burn', 0.6], icon: 'fire' },
  guard: { name: 'Raise Guard', kind: 'guard', icon: 'shield' },
  riposte: { name: 'Riposte Stance', kind: 'counter', mult: 1.2, icon: 'counter', tele: 'Will counter your next attack.' },
  windup: { name: 'Wind Up', kind: 'charge', next: 'slam', icon: 'charge', tele: 'Gathering strength for a crushing blow.' },
  slam: { name: 'Crushing Slam', kind: 'heavy', mult: 2.2, icon: 'heavy', stagger: true },
  frostbolt: { name: 'Frost Bolt', kind: 'magic', mult: 0.9, status: ['frost', 0.7], icon: 'frost' },
  shock: { name: 'Arc Spark', kind: 'magic', mult: 0.85, status: ['shock', 0.6], icon: 'storm' },
  poison: { name: 'Thorn Barrage', kind: 'magic', mult: 0.7, status: ['poison', 0.8], icon: 'venom' },
  heal: { name: 'Mend', kind: 'heal', amt: 0.15, icon: 'heal' },
  howl: { name: 'War Howl', kind: 'buff', buff: 'empower', icon: 'buff' },
  steal: { name: 'Pickpocket', kind: 'attack', mult: 0.7, steal: true, icon: 'coin' },
  sunder: { name: 'Sunder', kind: 'attack', mult: 0.9, status: ['armorbreak', 1], icon: 'break' },
  fireball: { name: 'Cinder Burst', kind: 'magic', mult: 1.2, status: ['burn', 0.7], icon: 'fire' },
  inhale: { name: 'Deep Inhale', kind: 'charge', next: 'breath', icon: 'charge', tele: 'Drawing breath. Flame Breath next turn.' },
  breath: { name: 'Flame Breath', kind: 'heavy', mult: 2.4, status: ['burn', 1], icon: 'fire' },
  quake: { name: 'Earthquake', kind: 'heavy', mult: 1.9, icon: 'heavy', stagger: true },
  plates: { name: 'Granite Plates', kind: 'plates', icon: 'shield', tele: 'Regrowing stone armor plates.' },
  thorns: { name: 'Thorn Shell', kind: 'thorns', icon: 'thorns', tele: 'Thorns reflect 30% of damage you deal.' },
  starfallm: { name: 'Starfall', kind: 'heavy', mult: 2.6, icon: 'star' },
  phaseshift: { name: 'Phase Shift', kind: 'phase', icon: 'phase', tele: 'Shifting between Astral and Void.' },
  voidlash: { name: 'Void Lash', kind: 'attack', mult: 1.1, status: ['armorbreak', 0.5], icon: 'void' },
  smite: { name: 'Radiant Smite', kind: 'magic', mult: 1.1, icon: 'light' },
  mirror: { name: 'Mirror Forge', kind: 'mirror', icon: 'phase', tele: 'Copying the weapon you carry.' },
};

export const ENEMIES = {
  boar: { name: 'Thornback Boar', region: 'emberfall', hp: 46, atk: 7, def: 4, ai: 'aggressive', tags: ['beast'], moves: ['strike', 'bite', 'gore'], xp: 14, gold: [3, 7], drops: [['leather', 0.7, 1, 2], ['beastfang', 0.5, 1, 2]], art: { shape: 'beast', body: '#7a4a2a', accent: '#e0b070' }, desc: 'A boar with a ridge of thorny bristles. It charges anything that moves.' },
  slime: { name: 'Ember Slime', region: 'emberfall', hp: 36, atk: 6, def: 2, ai: 'magical', elem: 'fire', weak: ['frost'], resist: ['fire'], moves: ['strike', 'spit'], xp: 12, gold: [2, 6], drops: [['slimegel', 0.8, 1, 2], ['coal', 0.4, 1, 1]], art: { shape: 'slime', body: '#ff7a30', accent: '#ffd06a' }, desc: 'A warm blob that spits burning gel. Weak to frost.' },
  bats: { name: 'Cave Bat Swarm', region: 'emberfall', hp: 32, atk: 5, def: 1, ai: 'swift', tags: ['beast'], moves: ['flurry', 'strike'], xp: 12, gold: [1, 5], drops: [['leather', 0.4, 1, 1]], dodge: 0.15, art: { shape: 'bats', body: '#4a3a5a', accent: '#c07aff' }, desc: 'A shrieking cloud of bats. Hard to hit, but fragile.' },
  bandit: { name: 'Highway Bandit', region: 'emberfall', hp: 50, atk: 7, def: 5, ai: 'tactical', moves: ['strike', 'steal', 'guard'], xp: 16, gold: [6, 14], drops: [['leather', 0.4, 1, 1], ['iron', 0.4, 1, 2]], art: { shape: 'humanoid', body: '#6a5040', accent: '#c04040' }, desc: 'Takes coin when it can and guards when hurt.' },
  varka: { name: 'Bandit Captain Varka', region: 'emberfall', elite: true, hp: 120, atk: 10, def: 8, ai: 'tactical', moves: ['strike', 'riposte', 'steal', 'flurry'], xp: 55, gold: [30, 50], drops: [['silver', 1, 2, 3], ['runetablet', 0.6, 1, 1]], art: { shape: 'humanoid', body: '#5a2a2a', accent: '#ffcc40', crown: true }, desc: 'A duelist who counters careless attacks. Watch for her Riposte Stance.' },
  grimjaw: { name: 'Grimjaw, the Cinder Alpha', region: 'emberfall', boss: true, hp: 300, atk: 12, def: 7, ai: 'boss_grimjaw', elem: 'fire', weak: ['frost'], resist: ['fire'], tags: ['beast'], moves: ['bite', 'howl', 'gore', 'spit'], xp: 160, gold: [80, 110], drops: [['alphapelt', 1, 2, 2], ['beastfang', 1, 3, 5]], art: { shape: 'wolf', body: '#4a2015', accent: '#ff6a2a', boss: true }, desc: 'A great wolf with smouldering fur. Below half health its fur ignites and every bite burns. Its howl empowers its next attack.', reward: 'Unlocks the Ironspine Highlands and the Cinderpelt Grip.' },
  wolf: { name: 'Ridge Wolf', region: 'ironspine', hp: 100, atk: 14, def: 10, ai: 'aggressive', tags: ['beast'], moves: ['bite', 'strike', 'flurry'], xp: 32, gold: [8, 16], drops: [['wolfpelt', 0.7, 1, 2], ['beastfang', 0.5, 1, 2]], art: { shape: 'wolf', body: '#6f6a66', accent: '#d8d2c8' }, desc: 'Hunts in packs and goes for the throat.' },
  golem: { name: 'Rock Golem', region: 'ironspine', hp: 160, atk: 16, def: 22, ai: 'heavy', weak: ['storm'], moves: ['strike', 'windup'], xp: 40, gold: [10, 20], drops: [['stoneheart', 0.6, 1, 1], ['iron', 0.6, 2, 3]], art: { shape: 'golem', body: '#8a7a68', accent: '#ffb050' }, desc: 'Slow and very hard. Telegraphs a crushing slam — defend or stagger it.' },
  harpy: { name: 'Frost Harpy', region: 'ironspine', hp: 90, atk: 13, def: 8, ai: 'magical', elem: 'frost', weak: ['fire'], resist: ['frost'], moves: ['strike', 'frostbolt', 'flurry'], xp: 34, gold: [8, 18], drops: [['frostfeather', 0.8, 1, 2]], dodge: 0.1, art: { shape: 'bird', body: '#8ab8d8', accent: '#e8faff' }, desc: 'Screams frost from the cliffs. Weak to fire.' },
  legionnaire: { name: 'Iron Legionnaire', region: 'ironspine', hp: 130, atk: 14, def: 18, ai: 'defensive', moves: ['strike', 'guard', 'riposte', 'sunder'], xp: 38, gold: [12, 24], drops: [['iron', 0.7, 2, 3], ['steel', 0.25, 1, 1]], art: { shape: 'knight', body: '#7a8494', accent: '#c0a050' }, desc: 'A soldier of a fallen legion. Guards and counters.' },
  ironclad: { name: 'Ironclad Champion', region: 'ironspine', elite: true, hp: 300, atk: 19, def: 26, ai: 'defensive', moves: ['strike', 'riposte', 'windup', 'sunder', 'guard'], xp: 120, gold: [60, 90], drops: [['steel', 1, 2, 3], ['ancientgear', 0.7, 1, 2], ['sapphire', 0.5, 1, 1]], art: { shape: 'knight', body: '#5a6474', accent: '#ffd060', crown: true }, desc: 'The legion\'s last champion. Armored, patient, and deadly on the counter.' },
  korrath: { name: 'Korrath the Stone Warden', region: 'ironspine', boss: true, hp: 700, atk: 20, def: 30, ai: 'boss_korrath', weak: ['storm'], moves: ['strike', 'plates', 'windup', 'quake'], xp: 380, gold: [160, 220], drops: [['heartstone', 1, 2, 2], ['stoneheart', 1, 2, 3], ['sapphire', 1, 1, 2]], plates: 3, art: { shape: 'golem', body: '#9a8a70', accent: '#70d0ff', boss: true }, desc: 'A living gate wrapped in granite plates. While plates stand it takes 60% less damage. Armor Break and stagger shatter plates.', reward: 'Unlocks the Whispering Wilds and the Heartstone Guard.' },
  wisp: { name: 'Will-o-Wisp', region: 'wilds', hp: 150, atk: 22, def: 12, ai: 'magical', elem: 'storm', weak: ['void'], moves: ['shock', 'strike', 'shock'], xp: 60, gold: [14, 26], drops: [['wispessence', 0.8, 1, 2]], dodge: 0.18, art: { shape: 'wisp', body: '#7affd8', accent: '#ffffff' }, desc: 'A drifting light that shocks those who chase it. Evasive.' },
  thornling: { name: 'Thornling', region: 'wilds', hp: 180, atk: 22, def: 16, ai: 'aggressive', elem: 'venom', weak: ['fire'], moves: ['poison', 'strike', 'flurry'], xp: 62, gold: [14, 26], drops: [['venomsac', 0.7, 1, 2], ['spiritwood', 0.3, 1, 1]], art: { shape: 'plant', body: '#4a8a3a', accent: '#c0ff5a' }, desc: 'A walking bramble dripping poison. Weak to fire.' },
  treant: { name: 'Corrupted Treant', region: 'wilds', hp: 320, atk: 26, def: 24, ai: 'heavy', weak: ['fire'], moves: ['strike', 'windup', 'heal'], xp: 80, gold: [18, 30], drops: [['spiritwood', 0.8, 2, 3]], art: { shape: 'tree', body: '#4a3a2a', accent: '#8aff6a' }, desc: 'An ancient tree twisted by rot. Heals itself and hits like a landslide.' },
  sentinel: { name: 'Elven Sentinel', region: 'wilds', hp: 240, atk: 24, def: 30, ai: 'defensive', weak: ['storm'], tags: ['construct'], moves: ['strike', 'guard', 'shock', 'riposte'], xp: 74, gold: [16, 30], drops: [['ancientgear', 0.6, 1, 2], ['mithril', 0.3, 1, 1], ['runetablet', 0.25, 1, 1]], art: { shape: 'construct', body: '#b8d8c8', accent: '#5affc0' }, desc: 'A construct of mithril and moonlight that still guards the ruins.' },
  revenant: { name: 'Moonblade Revenant', region: 'wilds', elite: true, hp: 560, atk: 30, def: 28, ai: 'tactical', moves: ['strike', 'riposte', 'shock', 'flurry', 'heal'], xp: 220, gold: [100, 140], drops: [['mithril', 1, 2, 3], ['moonpetal', 1, 2, 3], ['emerald', 0.6, 1, 1]], art: { shape: 'knight', body: '#8a9ac8', accent: '#d0e0ff', crown: true }, desc: 'An elven knight who refused to die. Adapts to how you fight.' },
  sylvara: { name: 'Sylvara, the Thornmother', region: 'wilds', boss: true, hp: 1350, atk: 32, def: 30, ai: 'boss_sylvara', elem: 'venom', weak: ['fire'], resist: ['venom'], moves: ['poison', 'thorns', 'heal', 'strike', 'flurry'], xp: 800, gold: [300, 380], drops: [['thornheart', 1, 2, 2], ['emerald', 1, 1, 2], ['spiritwood', 1, 3, 4]], art: { shape: 'tree', body: '#2a5a2a', accent: '#ff6aff', boss: true }, desc: 'The heart of the forest. Her Thorn Shell reflects 30% of damage — wait it out, Defend, or burn through it. She heals when wounded.', reward: 'Unlocks the Ashen Wastes and the Thornheart Core.' },
  hound: { name: 'Magma Hound', region: 'ashen', hp: 300, atk: 36, def: 26, ai: 'aggressive', elem: 'fire', weak: ['frost'], resist: ['fire'], tags: ['beast'], moves: ['bite', 'spit', 'flurry'], xp: 120, gold: [24, 40], drops: [['embercore', 0.5, 1, 1], ['beastfang', 0.5, 2, 3]], art: { shape: 'wolf', body: '#3a1a10', accent: '#ff8a2a' }, desc: 'A hound with lava in its veins.' },
  wraith: { name: 'Cinder Wraith', region: 'ashen', hp: 260, atk: 40, def: 20, ai: 'magical', elem: 'fire', weak: ['frost', 'light'], resist: ['fire'], moves: ['fireball', 'strike', 'fireball'], xp: 118, gold: [24, 40], drops: [['embercore', 0.6, 1, 1], ['ashbloom', 0.4, 1, 2]], dodge: 0.12, art: { shape: 'wraith', body: '#5a2a1a', accent: '#ffaa3a' }, desc: 'The burning ghost of someone the volcano took.' },
  obsidian: { name: 'Obsidian Knight', region: 'ashen', hp: 420, atk: 38, def: 44, ai: 'defensive', weak: ['storm'], moves: ['strike', 'guard', 'sunder', 'riposte', 'windup'], xp: 135, gold: [28, 46], drops: [['voidshard', 0.5, 1, 1], ['voidore', 0.3, 1, 1]], art: { shape: 'knight', body: '#1a1a22', accent: '#a46bff' }, desc: 'Black glass armor and endless patience.' },
  salamander: { name: 'Salamander', region: 'ashen', hp: 340, atk: 36, def: 30, ai: 'swift', elem: 'fire', resist: ['fire'], tags: ['beast'], moves: ['bite', 'spit', 'strike'], xp: 125, gold: [24, 40], drops: [['wyrmhide', 0.7, 1, 2]], art: { shape: 'lizard', body: '#c0502a', accent: '#ffd040' }, desc: 'A fire lizard the size of a horse.' },
  warlord: { name: 'Ashborn Warlord', region: 'ashen', elite: true, hp: 980, atk: 46, def: 44, ai: 'tactical', elem: 'fire', moves: ['strike', 'howl', 'windup', 'fireball', 'sunder'], xp: 420, gold: [180, 240], drops: [['ruby', 1, 1, 2], ['dragonbone', 0.8, 1, 2], ['embercore', 1, 1, 2]], art: { shape: 'knight', body: '#4a1a10', accent: '#ff5a2a', crown: true }, desc: 'A warlord who rules the ash by fire and fear.' },
  pyraxis: { name: 'Pyraxis, the Ember Drake', region: 'ashen', boss: true, hp: 2500, atk: 50, def: 42, ai: 'boss_pyraxis', elem: 'fire', weak: ['frost'], resist: ['fire'], tags: ['beast'], moves: ['bite', 'inhale', 'fireball', 'flurry'], xp: 1500, gold: [520, 640], drops: [['drakeheart', 1, 2, 2], ['wyrmhide', 1, 2, 3], ['dragonbone', 1, 1, 2]], art: { shape: 'dragon', body: '#7a1a0a', accent: '#ffb03a', boss: true }, desc: 'A drake as old as the volcano. Molten Scales make it immune to Burn. It inhales before Flame Breath — Defend. Each turn past half health the heat rises.', reward: 'Unlocks the Astral Expanse and the Drakeheart Fitting.' },
  starsentinel: { name: 'Star Sentinel', region: 'astral', hp: 560, atk: 54, def: 52, ai: 'defensive', tags: ['construct'], weak: ['void'], moves: ['strike', 'guard', 'smite', 'riposte'], xp: 220, gold: [40, 60], drops: [['staressence', 0.6, 1, 1], ['ancientgear', 0.5, 1, 2]], art: { shape: 'construct', body: '#c8d8ff', accent: '#ffffff' }, desc: 'A guardian of the first forge, built of starlight and brass.' },
  voidstalker: { name: 'Void Stalker', region: 'astral', hp: 480, atk: 60, def: 36, ai: 'swift', elem: 'void', weak: ['light'], resist: ['void'], tags: ['void'], moves: ['voidlash', 'flurry', 'strike'], xp: 215, gold: [40, 60], drops: [['voidshard', 0.8, 1, 2], ['primordial', 0.15, 1, 1]], dodge: 0.15, art: { shape: 'wraith', body: '#1a0a3a', accent: '#b48aff' }, desc: 'A hunter made of absence. Breaks armor.' },
  seraph: { name: 'Astral Seraph', region: 'astral', hp: 520, atk: 56, def: 40, ai: 'magical', elem: 'light', resist: ['light'], moves: ['smite', 'heal', 'shock'], xp: 225, gold: [42, 62], drops: [['staressence', 0.8, 1, 2]], art: { shape: 'bird', body: '#fff2c8', accent: '#9ff0ff' }, desc: 'A winged light that heals its allies and smites intruders.' },
  leviathan: { name: 'Nebula Leviathan', region: 'astral', hp: 900, atk: 64, def: 48, ai: 'heavy', tags: ['beast'], moves: ['strike', 'windup', 'bite'], xp: 300, gold: [60, 90], drops: [['primordial', 0.4, 1, 1], ['staressence', 0.6, 1, 2]], art: { shape: 'dragon', body: '#2a2a6a', accent: '#c8a0ff' }, desc: 'A sky-whale of stars. Slow, enormous, ancient.' },
  eclipse: { name: 'Eclipse Knight', region: 'astral', elite: true, hp: 1800, atk: 72, def: 60, ai: 'tactical', elem: 'void', tags: ['void'], moves: ['voidlash', 'riposte', 'smite', 'windup', 'guard'], xp: 800, gold: [300, 400], drops: [['starshard', 1, 1, 2], ['primordial', 1, 1, 1], ['voidshard', 1, 2, 3]], art: { shape: 'knight', body: '#2a1a4a', accent: '#ffe08a', crown: true }, desc: 'Half light, half void. The Sovereign\'s first knight.' },
  sovereign: { name: 'The Hollow Sovereign', region: 'astral', boss: true, hp: 4800, atk: 78, def: 58, ai: 'boss_sovereign', tags: ['void'], moves: ['phaseshift', 'voidlash', 'smite', 'starfallm', 'strike'], xp: 3200, gold: [1200, 1500], drops: [['crownshard', 1, 2, 2], ['primordial', 1, 2, 3], ['starshard', 1, 2, 2]], art: { shape: 'sovereign', body: '#1a1030', accent: '#e0d0ff', boss: true }, desc: 'A crowned shadow. It shifts between Astral and Void phases each few turns: only the opposite element harms it fully. Starfall counts down — Defend when it lands.', reward: 'Opens the path to Rekindling the Eternal Forge.' },
  echo: { name: 'Echo of the First Smith', region: 'astral', boss: true, hp: 6000, atk: 85, def: 64, ai: 'boss_echo', moves: ['mirror', 'strike', 'slam', 'riposte', 'flurry'], xp: 5000, gold: [2000, 2400], drops: [['smithsoul', 1, 1, 1], ['primordial', 1, 3, 4]], art: { shape: 'smith', body: '#2a1a0a', accent: '#ffd27a', boss: true }, desc: 'The memory of the one who lit the first forge. It copies your weapon\'s element and grows stronger each time you repeat a move.', reward: "The First Smith's Ember, and a place in legend." },
};

// Random region events. Choices may require stats; outcomes are interpreted by the engine.
// outcome fields: mats, gold, xp, hp(±% max), battle, mine, forage, chance + fail, text, progress
export const EVENTS = [
  { id: 'crystals', regions: ['emberfall', 'ironspine', 'wilds'], title: 'Glowing Crystals', text: 'A seam of pale crystals hums in the rock. Their light pulses like breathing.', choices: [
    { label: 'Pry them loose carefully', out: { chance: 0.7, mats: { quartz: 2 }, text: 'You work them free without cracking a single facet.', fail: { hp: -8, mats: { quartz: 1 }, text: 'One shatters and cuts your hand, but you keep a shard.' } } },
    { label: 'Study the light', out: { xp: 20, text: 'You learn something about how crystals hold energy.' } },
    { label: 'Mine the surrounding rock', out: { mine: 'region', text: 'There\'s ore beneath the crystals.' } },
  ] },
  { id: 'merchant', regions: ['emberfall', 'ironspine', 'wilds', 'ashen'], title: 'Travelling Tinker', text: 'A tinker with an overloaded mule waves you down. "Trade? I have odds and ends from every road."', choices: [
    { label: 'Buy a mystery bundle (25 gold)', cost: { gold: 25 }, out: { roll: 'regionmats', text: 'You unwrap the bundle.' } },
    { label: 'Help fix his cart wheel', out: { gold: 12, xp: 10, text: 'He pays you in coin and gratitude.' } },
    { label: 'Move on', out: { text: 'You wish him safe travels.' } },
  ] },
  { id: 'passage', regions: ['emberfall', 'ironspine', 'ashen', 'astral'], title: 'Hidden Passage', text: 'Behind a curtain of roots, a narrow passage slopes downward into the dark.', choices: [
    { label: 'Squeeze through', out: { chance: 0.55, roll: 'regionmats', progress: 10, text: 'The passage opens into an untouched chamber.', fail: { battle: 'region', text: 'Something was already living down here.' } } },
    { label: 'Mark it and explore later', out: { progress: 6, text: 'You chalk the entrance and map the area around it.' } },
  ] },
  { id: 'guardian', regions: ['emberfall', 'ironspine', 'wilds', 'ashen', 'astral'], title: 'Sleeping Guardian', text: 'A creature sleeps on a pile of salvage. Some of it gleams.', choices: [
    { label: 'Fight it for the hoard', out: { battle: 'region', bonus: 'hoard', text: 'It wakes with a roar.' } },
    { label: 'Sneak and grab what you can', req: { stat: 'speed', min: 12 }, out: { chance: 0.75, roll: 'regionmats', text: 'You lift a handful of loot without a sound.', fail: { battle: 'region', text: 'A rock shifts underfoot. It wakes.' } } },
    { label: 'Leave it be', out: { text: 'Not every fight is worth it.' } },
  ] },
  { id: 'shrine', regions: ['emberfall', 'wilds', 'astral'], title: 'Forgotten Shrine', text: 'A moss-covered shrine to a smith-god. An anvil-shaped offering bowl sits empty.', choices: [
    { label: 'Offer 2 coal', cost: { mats: { coal: 2 } }, out: { buff: 'blessing', text: 'Warmth floods your hands. Your next forging feels blessed (+5 craftsmanship).' } },
    { label: 'Pray', out: { hp: 30, text: 'You rest a moment and feel restored.' } },
    { label: 'Search the shrine', out: { chance: 0.4, mats: { runetablet: 1 }, text: 'A loose stone hides a rune tablet.', fail: { text: 'Nothing but dust and old prayers.' } } },
  ] },
  { id: 'wounded', regions: ['emberfall', 'ironspine', 'wilds', 'ashen'], title: 'Wounded Traveller', text: 'A traveller sits against a tree, clutching a gashed leg. "Bandits. Took everything but my boots."', choices: [
    { label: 'Give a Health Tonic', cost: { item: 'tonic' }, out: { gold: 30, xp: 25, rep: 1, text: 'They press a pouch of coin into your hands. "My family\'s savings. Take it."' } },
    { label: 'Bandage the wound', out: { xp: 15, text: 'You do what you can. They thank you.' } },
    { label: 'Track the bandits', out: { battle: 'bandit', text: 'You follow the trail to their camp.' } },
  ] },
  { id: 'vein', regions: ['emberfall', 'ironspine', 'wilds', 'ashen', 'astral'], title: 'Exposed Vein', text: 'A rockslide has exposed a glittering ore vein along the cliff face.', choices: [
    { label: 'Mine the vein', out: { mine: 'region', text: 'You set your pickaxe to the stone.' } },
    { label: 'Survey the whole cliff', out: { deposit: 2, text: 'You mark two promising deposits on your map.' } },
  ] },
  { id: 'herbs', regions: ['emberfall', 'wilds', 'ashen'], title: 'Overgrown Garden', text: 'The remains of a walled garden, gone wild. Herbs grow thick between the stones.', choices: [
    { label: 'Gather herbs', out: { forage: true, text: 'You kneel among the herbs.' } },
    { label: 'Search the cottage ruin', out: { chance: 0.6, gold: 20, text: 'You find a forgotten coin jar.', fail: { battle: 'region', text: 'The ruin has a tenant.' } } },
  ] },
  { id: 'forgegod', regions: ['ironspine', 'ashen'], title: 'Dwarven Forge', text: 'An abandoned dwarven forge, its anvil still sharp-cornered. A plaque lists techniques in runic.', choices: [
    { label: 'Read the plaque', req: { smith: 3 }, out: { smithxp: 60, text: 'You learn a dwarven folding technique. (+Blacksmith mastery)' } },
    { label: 'Salvage the anvil fittings', out: { mats: { iron: 3, coal: 2 }, text: 'You strip what metal you can carry.' } },
  ] },
  { id: 'storm', regions: ['ironspine', 'wilds', 'astral'], title: 'Lightning Strike', text: 'A bolt splits a boulder in front of you. The rock inside is fused and glowing.', choices: [
    { label: 'Grab the fused stone', out: { chance: 0.5, mats: { copper: 3 }, text: 'Still warm, but intact.', fail: { hp: -12, text: 'A second bolt. Your ears ring.' } } },
    { label: 'Take shelter', out: { hp: 10, text: 'You wait out the storm under an overhang.' } },
  ] },
  { id: 'elfspirit', regions: ['wilds', 'astral'], title: 'Elven Echo', text: 'A translucent elf smith appears at an anvil of light, hammering at nothing. It looks up at you.', choices: [
    { label: 'Watch it work', out: { smithxp: 80, text: 'Its rhythm teaches your hands something words could not.' } },
    { label: 'Ask about its runes', out: { chance: 0.5, mats: { runetablet: 1, moonpetal: 1 }, text: 'It traces a rune for you and leaves a tablet behind.', fail: { xp: 30, text: 'It fades mid-sentence. You remember fragments.' } } },
  ] },
  { id: 'ashgeyser', regions: ['ashen'], title: 'Ash Geyser', text: 'The ground shakes. A vent is about to erupt, flinging glowing stones.', choices: [
    { label: 'Catch the stones as they fall', req: { stat: 'speed', min: 14 }, out: { mats: { emberstone: 2, ruby: 1 }, text: 'You snatch two hot stones and a ruby.' } },
    { label: 'Run', out: { text: 'You get clear as the vent blows.' } },
  ] },
  { id: 'meteor', regions: ['astral'], title: 'Falling Star', text: 'A small star streaks overhead and lands just beyond the ridge.', choices: [
    { label: 'Race to the impact', out: { chance: 0.65, mats: { starshard: 1, astral: 1 }, text: 'You reach it first.', fail: { battle: 'region', text: 'Something else got there first.' } } },
    { label: 'Make a wish', out: { buff: 'blessing', text: 'You feel lucky. (+5 craftsmanship next forge)' } },
  ] },
  { id: 'cache', regions: ['emberfall', 'ironspine', 'wilds', 'ashen', 'astral'], title: 'Smuggler\'s Cache', text: 'A loose flagstone, and beneath it a locked iron box.', choices: [
    { label: 'Force the lock', req: { stat: 'power', min: 20 }, out: { roll: 'regionmats', gold: 25, text: 'The lock gives. Inside: coin and materials.' } },
    { label: 'Pick the lock', out: { chance: 0.5, gold: 40, text: 'Click. A purse of gold.', fail: { text: 'The pick snaps. The box won\'t open.' } } },
  ] },
];

// ---- Quests ----
// type: craft | mine | defeat | explore | forage | perfect | grade | mattier | boss | enchant | smelt | mastery | discover | prestige | level
export const QUESTS = [
  { id: 'q1', main: true, name: 'First Sparks', desc: 'Forge your first weapon at Hearthstone Forge.', type: 'craft', n: 1, reward: { gold: 30, xp: 30, mats: { iron: 2, coal: 2 } } },
  { id: 'q2', main: true, name: 'Ore of the Valley', desc: 'Mine 3 deposits. Explore locations to find them.', type: 'mine', n: 3, req: 'q1', reward: { gold: 40, xp: 40, items: { tonic: 2 } } },
  { id: 'q3', main: true, name: 'Trial by Fang', desc: 'Win 5 battles.', type: 'defeat', n: 5, req: 'q2', reward: { gold: 60, xp: 60 } },
  { id: 'q4', main: true, name: 'Silver Lining', desc: 'Upgrade to an Iron Pickaxe and mine silver in Hollow Cave.', type: 'minemat', mat: 'silver', n: 1, req: 'q3', reward: { gold: 50, xp: 50, mats: { coal: 4 } } },
  { id: 'q5', main: true, name: "The Alpha's Shadow", desc: 'Find Grimjaw\'s Den on Emberwood Trail and defeat the Cinder Alpha.', type: 'boss', target: 'grimjaw', n: 1, req: 'q4', reward: { gold: 100, xp: 100 } },
  { id: 'q6', main: true, name: 'Hammer and Steel', desc: 'Smelt steel at the Material Refinery and forge a weapon from it.', type: 'craftmat', mat: 'steel', n: 1, req: 'q5', reward: { gold: 120, xp: 140, mats: { ironwood: 3 } } },
  { id: 'q7', main: true, name: 'Warden of the Pass', desc: 'Defeat Korrath the Stone Warden.', type: 'boss', target: 'korrath', n: 1, req: 'q6', reward: { gold: 200, xp: 250 } },
  { id: 'q8', main: true, name: 'Whispers in the Wood', desc: 'Forge an enchanted weapon.', type: 'enchant', n: 1, req: 'q7', reward: { gold: 220, xp: 300, mats: { moonpetal: 3 } } },
  { id: 'q9', main: true, name: 'Heart of Thorns', desc: 'Defeat Sylvara, the Thornmother.', type: 'boss', target: 'sylvara', n: 1, req: 'q8', reward: { gold: 400, xp: 500 } },
  { id: 'q10', main: true, name: 'Forged in Fire', desc: 'Forge a Superior or better weapon from a tier 4 material.', type: 'gradetier', tier: 4, grade: 'superior', n: 1, req: 'q9', reward: { gold: 500, xp: 700, mats: { ruby: 1 } } },
  { id: 'q11', main: true, name: 'Wings of Cinder', desc: 'Defeat Pyraxis, the Ember Drake.', type: 'boss', target: 'pyraxis', n: 1, req: 'q10', reward: { gold: 700, xp: 1000 } },
  { id: 'q12', main: true, name: 'The Hollow Crown', desc: 'Defeat the Hollow Sovereign.', type: 'boss', target: 'sovereign', n: 1, req: 'q11', reward: { gold: 1500, xp: 2000 } },
  { id: 'q13', main: true, name: 'Rekindle the Eternal Forge', desc: 'Rekindle the Eternal Forge (Legacy tab).', type: 'prestige', n: 1, req: 'q12', reward: { lp: 5 } },
  { id: 's1', name: 'Steady Hands', desc: 'Score 10 Perfect timings in forging.', type: 'perfect', n: 10, reward: { gold: 60, smithxp: 60 } },
  { id: 's2', name: 'Gatherer', desc: 'Forage 8 times.', type: 'forage', n: 8, reward: { gold: 50, xp: 40, mats: { oakwood: 3 } } },
  { id: 's3', name: 'Curious Smith', desc: 'Discover 20 different materials.', type: 'discover', n: 20, reward: { gold: 120, xp: 120 } },
  { id: 's4', name: 'Specialist', desc: 'Reach mastery level 3 with any weapon category.', type: 'mastery', n: 3, reward: { gold: 150, xp: 150 } },
  { id: 's5', name: 'Smelter', desc: 'Smelt 6 ingots at the Material Refinery.', type: 'smelt', n: 6, reward: { gold: 100, mats: { coal: 6 } } },
  { id: 's6', name: 'Bounty: Varka', desc: 'Defeat Bandit Captain Varka in Hollow Cave.', type: 'boss', target: 'varka', n: 1, reward: { gold: 80, xp: 80, items: { bomb: 2 } } },
  { id: 's7', name: 'Bounty: Ironclad Champion', desc: 'Defeat the Ironclad Champion on Frostpeak Glacier.', type: 'boss', target: 'ironclad', n: 1, reward: { gold: 200, xp: 200 } },
  { id: 's8', name: 'Bounty: Moonblade Revenant', desc: 'Defeat the Moonblade Revenant in the Elven Ruins.', type: 'boss', target: 'revenant', n: 1, reward: { gold: 350, xp: 400 } },
  { id: 's9', name: 'Bounty: Ashborn Warlord', desc: 'Defeat the Ashborn Warlord in the Magma Rift.', type: 'boss', target: 'warlord', n: 1, reward: { gold: 500, xp: 600 } },
  { id: 's10', name: 'Bounty: Eclipse Knight', desc: 'Defeat the Eclipse Knight at the Observatory.', type: 'boss', target: 'eclipse', n: 1, reward: { gold: 900, xp: 1000 } },
  { id: 's11', name: 'Deep Delver', desc: 'Find 5 rare pockets while mining.', type: 'pocket', n: 5, reward: { gold: 120, xp: 100 } },
  { id: 's12', name: 'Masterwork', desc: 'Forge a weapon of Masterwork craftsmanship or better.', type: 'grade', grade: 'masterwork', n: 1, reward: { gold: 200, smithxp: 150 } },
  { id: 's13', name: 'The First Forge', desc: 'Defeat the Echo of the First Smith.', type: 'boss', target: 'echo', n: 1, reward: { gold: 3000, xp: 3000, lp: 10 } },
];

// ---- Talents ----
export const TALENT_TREES = {
  forge: { name: 'Forgemaster', color: '#ffb347', desc: 'Weapon creation and craftsmanship.' },
  explore: { name: 'Explorer', color: '#6fd39a', desc: 'Exploration, gathering and discovery.' },
  war: { name: 'Warrior', color: '#ff6a6a', desc: 'Combat proficiency and survival.' },
};
export const TALENTS = {
  steady: { tree: 'forge', row: 0, name: 'Steady Hands', max: 3, desc: (r) => `Perfect zones in forging QTEs are ${r * 4}% wider.` },
  thrifty: { tree: 'forge', row: 0, name: 'Thrifty Smith', max: 2, desc: (r) => `${r * 12}% chance to refund the primary material when forging.` },
  heat: { tree: 'forge', row: 1, name: 'Heat Whisperer', max: 2, desc: (r) => `Furnace temperature drift reduced by ${r * 15}%.` },
  runescholar: { tree: 'forge', row: 1, name: 'Rune Scholar', max: 2, desc: (r) => `Enchantment potency +${r * 10}%.` },
  temper: { tree: 'forge', row: 2, name: 'Tempering Lore', max: 2, desc: (r) => `Weapons forged at Fine or better gain +${r * 3}% power.` },
  salvager: { tree: 'forge', row: 2, name: 'Master Salvager', max: 1, desc: () => 'Salvaging recovers 50% of materials instead of 40%.' },
  legendtouch: { tree: 'forge', row: 3, name: 'Legendary Touch', max: 1, need: 7, desc: () => 'Masterwork and better weapons roll one extra trait.' },
  prospector: { tree: 'explore', row: 0, name: 'Prospector', max: 3, desc: (r) => `Mining yields +${r * 15}% ore.` },
  pathfinder: { tree: 'explore', row: 0, name: 'Pathfinder', max: 2, desc: (r) => `Exploration progress +${r * 25}%.` },
  herbalist: { tree: 'explore', row: 1, name: 'Herbalist', max: 2, desc: (r) => `Foraging lasts ${r}s longer and yields +${r * 20}%.` },
  treasure: { tree: 'explore', row: 1, name: 'Treasure Sense', max: 2, desc: (r) => `Rare pocket chance +${r * 8}%.` },
  geologist: { tree: 'explore', row: 2, name: 'Geologist', max: 2, desc: (r) => `Mining weak points last ${r * 20}% longer.` },
  fieldcamp: { tree: 'explore', row: 2, name: 'Field Camp', max: 1, desc: () => 'Recover 6% HP after each exploration.' },
  fortune: { tree: 'explore', row: 3, name: "Fortune's Favor", max: 1, need: 7, desc: () => 'Rare discoveries and boss drops are more generous (+1 to rolls).' },
  vigor: { tree: 'war', row: 0, name: 'Vigor', max: 3, desc: (r) => `+${r * 10}% maximum HP.` },
  timing: { tree: 'war', row: 0, name: 'Combat Timing', max: 2, desc: (r) => `Combat timing windows ${r * 15}% wider.` },
  ironguard: { tree: 'war', row: 1, name: 'Iron Guard', max: 2, desc: (r) => `Defend reduces damage by ${50 + r * 8}%.` },
  rhythm: { tree: 'war', row: 1, name: 'Battle Rhythm', max: 2, desc: (r) => `+${r * 5} stamina per turn.` },
  reservoir: { tree: 'war', row: 2, name: 'Arcane Reservoir', max: 2, desc: (r) => `+${r * 15} maximum mana, +${r * 2} mana per turn.` },
  executioner: { tree: 'war', row: 2, name: 'Executioner', max: 1, desc: () => '+25% damage to staggered or frozen enemies.' },
  unbroken: { tree: 'war', row: 3, name: 'Unbroken', max: 1, need: 7, desc: () => 'Once per battle, survive a lethal blow with 1 HP.' },
};

// ---- Smith mastery unlocks ----
export const SMITH_UNLOCKS = [
  { lvl: 2, text: 'Material Refinery available to build' },
  { lvl: 3, text: 'Second component slot' },
  { lvl: 4, text: 'Exact stat preview before forging' },
  { lvl: 5, text: 'Primary material cost −1 for blueprints that use 4 or more' },
  { lvl: 6, text: 'Third component slot' },
  { lvl: 8, text: 'Fourth component slot' },
  { lvl: 10, text: 'Master\'s Recovery: one missed QTE round per forging is re-rolled as Poor' },
  { lvl: 12, text: 'Celestial forging: tier 5 materials can be worked' },
];

// ---- Weapon mastery ----
export const SKILLS = {
  sword: [
    { id: 'riposte', lvl: 1, name: 'Riposte Stance', cost: { sta: 20 }, desc: 'Defend, and counter the next attack for 130% damage.', timed: false },
    { id: 'cleave', lvl: 3, name: 'Cleaving Arc', cost: { sta: 30 }, desc: '170% damage. Timed.', timed: true },
    { id: 'bladedance', lvl: 6, name: 'Blade Dance', cost: { sta: 45 }, desc: 'Three strikes of 75%. Each can crit.', timed: true },
  ],
  dagger: [
    { id: 'twinstrike', lvl: 1, name: 'Twin Strike', cost: { sta: 18 }, desc: 'Two strikes of 65% with +20% crit chance.', timed: true },
    { id: 'shadowstep', lvl: 3, name: 'Shadowstep', cost: { sta: 25 }, desc: 'Evade the next attack. Your next hit is a guaranteed critical.', timed: false },
    { id: 'lacerate', lvl: 6, name: 'Lacerate', cost: { sta: 30 }, desc: '90% damage and 2 Bleed stacks.', timed: true },
  ],
  greatsword: [
    { id: 'gather', lvl: 1, name: 'Gather Strength', cost: { sta: 15 }, desc: 'Brace and charge: your next attack deals +120% and you take 25% less damage this turn.', timed: false },
    { id: 'overhead', lvl: 3, name: 'Overhead Smash', cost: { sta: 40 }, desc: '220% damage with heavy stagger. Timed.', timed: true },
    { id: 'whirlwind', lvl: 6, name: 'Whirlwind', cost: { sta: 45 }, desc: '150% damage and Armor Break.', timed: true },
  ],
  spear: [
    { id: 'thrust', lvl: 1, name: 'Piercing Thrust', cost: { sta: 22 }, desc: '130% damage ignoring half of enemy defense. Timed.', timed: true },
    { id: 'impale', lvl: 3, name: 'Impale', cost: { sta: 32 }, desc: '100% damage, Bleed and Armor Break.', timed: true },
    { id: 'vault', lvl: 6, name: 'Vault Strike', cost: { sta: 42 }, desc: '180% damage, then evade the next attack.', timed: true },
  ],
  hammer: [
    { id: 'crush', lvl: 1, name: 'Crushing Blow', cost: { sta: 28 }, desc: '150% damage with double stagger. Timed.', timed: true },
    { id: 'shieldbreak', lvl: 3, name: 'Shield Breaker', cost: { sta: 28 }, desc: '110% damage, removes enemy guard and applies Armor Break for 3 turns.', timed: true },
    { id: 'earthquake', lvl: 6, name: 'Earthquake', cost: { sta: 50 }, desc: '140% damage. Fills the stagger meter by half.', timed: true },
  ],
  staff: [
    { id: 'bolt', lvl: 1, name: 'Arcane Bolt', cost: { mana: 14 }, desc: 'Arcana-scaled bolt, 150%. Double status chance.', timed: true },
    { id: 'surge', lvl: 3, name: 'Elemental Surge', cost: { mana: 24 }, desc: '90% damage and 2 stacks of your weapon element\'s status.', timed: true },
    { id: 'ward', lvl: 6, name: 'Mana Ward', cost: { mana: 20 }, desc: 'Shield yourself for 3× arcana. Restores 15 stamina.', timed: false },
  ],
};
export const MASTERY_PASSIVES = {
  sword: [[2, 'Perfect Defends automatically counter for 80% damage.'], [4, 'Balanced Form: +12% damage while stamina is above half.'], [8, 'Sword Saint: counters are always critical.']],
  dagger: [[2, 'Critical hits refund 8 stamina.'], [4, 'Bleed can stack up to 7.'], [8, 'Assassinate: +50% damage to enemies below 30% HP.']],
  greatsword: [[2, 'Attacks ignore 15% of enemy defense.'], [4, 'Charged attacks stagger twice as hard.'], [8, "Titan's Grip: Gather Strength costs no stamina."]],
  spear: [[2, '+12% armor pierce.'], [4, 'First strike each battle is a critical hit.'], [8, 'Armor Break you apply lasts 2 turns longer.']],
  hammer: [[2, 'Stagger build-up +25%.'], [4, 'Staggered enemies take +30% damage.'], [8, 'Aftershock: staggering an enemy restores 25 stamina.']],
  staff: [[2, '+4 mana per turn.'], [4, 'Elemental Fusion: Burn + Frost on a target detonates as Thermal Shock.'], [8, 'Arcane Echo: spells apply status twice.']],
};

// ---- Upgrades ----
export const FORGE_UPGRADES = {
  anvil: { name: 'Reinforced Anvil', max: 3, desc: 'Wider hammering windows (+6% per level). Level 1 allows greatswords and warhammers; level 2 allows tier 3+ heavy weapons.', costs: [{ gold: 80, mats: { iron: 8 } }, { gold: 300, mats: { steel: 6, stoneheart: 2 } }, { gold: 1200, mats: { dragonbone: 3, heartstone: 1 } }] },
  furnace: { name: 'Advanced Furnace', max: 3, desc: 'Temperature drift −15% per level. Level 1 is required for tier 3 materials, level 2 for tier 4.', costs: [{ gold: 150, mats: { iron: 6, coal: 8 } }, { gold: 500, mats: { emberstone: 4, stoneheart: 2 } }, { gold: 1500, mats: { embercore: 3, drakeheart: 1 } }] },
  hammer: { name: 'Precision Hammer', max: 3, desc: 'Circular Precision perfect zone +6% per level and calmer pointer speed changes.', costs: [{ gold: 100, mats: { iron: 4, copper: 4 } }, { gold: 400, mats: { silversteel: 3, ancientgear: 1 } }, { gold: 1300, mats: { mithril: 4, ancientgear: 3 } }] },
  quench: { name: 'Quenching Trough', max: 2, desc: 'Quenching Pulse tolerance +10% per level.', costs: [{ gold: 90, mats: { iron: 4, quartz: 1 } }, { gold: 600, mats: { frostglass: 4, frostfeather: 3 } }] },
  workbench: { name: 'Runic Workbench', max: 2, desc: 'Unlocks enchanting (tier 1 enchantments). Level 2 enlarges rune nodes.', costs: [{ gold: 120, mats: { oakwood: 4, quartz: 2, runetablet: 1 } }, { gold: 500, mats: { spiritwood: 3, runetablet: 2 } }] },
  chamber: { name: 'Enchantment Chamber', max: 2, desc: 'Level 1 allows tier 2 enchantments, level 2 allows tier 3. Mana drift −15% per level.', costs: [{ gold: 400, mats: { silversteel: 2, sapphire: 2, runetablet: 1 } }, { gold: 1400, mats: { mithril: 3, wispessence: 4, emerald: 2 } }] },
  refinery: { name: 'Material Refinery', max: 3, desc: 'Smelt ingots. L1: Steel. L2: Silversteel. L3: Starforged Metal (with the Crucible).', smith: 2, costs: [{ gold: 100, mats: { iron: 6, coal: 6 } }, { gold: 450, mats: { steel: 4, silver: 4 } }, { gold: 2000, mats: { astral: 4, celestial: 2 } }] },
  crucible: { name: 'Legendary Crucible', max: 1, desc: 'Allows tier 5 blueprints and materials and adds one component slot.', costs: [{ gold: 2500, mats: { drakeheart: 1, ruby: 3, dragonbone: 4 } }] },
};

export const PICKAXES = [
  { name: 'Worn Pickaxe', tier: 1, power: 1.0, swings: 12, cost: null },
  { name: 'Iron Pickaxe', tier: 2, power: 1.25, swings: 13, cost: { gold: 60, mats: { iron: 6, oakwood: 2 } } },
  { name: 'Steel Pickaxe', tier: 3, power: 1.5, swings: 14, cost: { gold: 250, mats: { steel: 4, ironwood: 2 } } },
  { name: 'Runic Pickaxe', tier: 4, power: 1.8, swings: 15, cost: { gold: 700, mats: { silversteel: 3, runetablet: 1, sapphire: 1 } } },
  { name: 'Mithril Pickaxe', tier: 5, power: 2.1, swings: 16, cost: { gold: 1500, mats: { mithril: 5, spiritwood: 2, emerald: 1 } } },
  { name: 'Celestial Excavator', tier: 6, power: 2.5, swings: 18, cost: { gold: 3500, mats: { dragonbone: 4, voidore: 4, drakeheart: 1 } } },
];
export const SICKLES = [
  { name: 'Bare Hands', tier: 0, bonus: 0, cost: null },
  { name: "Forager's Sickle", tier: 1, bonus: 1, cost: { gold: 40, mats: { iron: 2, oakwood: 1 } } },
  { name: 'Silver Sickle', tier: 2, bonus: 2, cost: { gold: 300, mats: { silver: 4, ironwood: 2 } } },
  { name: 'Moonblade Sickle', tier: 3, bonus: 3, cost: { gold: 1200, mats: { mithril: 2, moonpetal: 3 } } },
];
export const LENSES = [
  { name: 'No Lens', tier: 0, cost: null },
  { name: "Surveyor's Lens", tier: 1, cost: { gold: 150, mats: { quartz: 3, copper: 2 } } },
  { name: 'Geomancer\'s Lens', tier: 2, cost: { gold: 900, mats: { sapphire: 2, emerald: 2, ancientgear: 1 } } },
];

export const SMELT = [
  { id: 'steel', out: 'steel', main: 'iron', inputs: { iron: 2, coal: 1 }, lvl: 1, gold: 2 },
  { id: 'silversteel', out: 'silversteel', main: 'steel', inputs: { steel: 1, silver: 2, coal: 1 }, lvl: 2, gold: 8 },
  { id: 'starforged', out: 'starforged', main: 'astral', inputs: { astral: 2, celestial: 1, primordial: 1 }, lvl: 3, crucible: true, gold: 80 },
];

export const CONSUMABLES = {
  tonic: { name: 'Health Tonic', desc: 'Restore 40% HP.', price: 15, heal: 0.4 },
  draught: { name: 'Stamina Draught', desc: 'Restore 50 stamina.', price: 12, sta: 50 },
  vial: { name: 'Mana Vial', desc: 'Restore 40 mana.', price: 14, mana: 40 },
  antidote: { name: 'Purifying Salts', desc: 'Remove all negative statuses.', price: 10, cleanse: true },
  bomb: { name: 'Fire Bomb', desc: 'Deal 25% of the enemy\'s base attack ×8 as fire damage and apply 2 Burn.', price: 25, bomb: true },
  elixir: { name: 'Hero\'s Elixir', desc: 'Restore all HP, stamina and mana.', price: 120, full: true },
};

export const SHOP = [
  { kind: 'item', id: 'tonic' }, { kind: 'item', id: 'draught' }, { kind: 'item', id: 'vial' }, { kind: 'item', id: 'antidote' }, { kind: 'item', id: 'bomb' }, { kind: 'item', id: 'elixir', region: 'wilds' },
  { kind: 'mat', id: 'coal', price: 3 }, { kind: 'mat', id: 'oakwood', price: 4 }, { kind: 'mat', id: 'leather', price: 5 }, { kind: 'mat', id: 'iron', price: 7 },
  { kind: 'mat', id: 'ironwood', price: 14, region: 'ironspine' }, { kind: 'mat', id: 'quartz', price: 18, region: 'ironspine' },
];

// ---- Achievements ----
export const ACHIEVEMENTS = [
  { id: 'a_first', name: 'Apprentice', desc: 'Forge your first weapon.', stat: 'crafted', n: 1 },
  { id: 'a_ten', name: 'Journeyman', desc: 'Forge 10 weapons.', stat: 'crafted', n: 10 },
  { id: 'a_fifty', name: 'Master of the Anvil', desc: 'Forge 50 weapons.', stat: 'crafted', n: 50 },
  { id: 'a_perf1', name: 'Perfect Strike', desc: 'Score your first Perfect timing.', stat: 'perfects', n: 1 },
  { id: 'a_perf50', name: 'Clockwork Hands', desc: 'Score 50 Perfect timings.', stat: 'perfects', n: 50 },
  { id: 'a_fine', name: 'Fine Work', desc: 'Forge a Fine weapon.', stat: 'bestGrade', n: 2 },
  { id: 'a_master', name: 'Masterwork', desc: 'Forge a Masterwork weapon.', stat: 'bestGrade', n: 4 },
  { id: 'a_legend', name: 'Legend of the Forge', desc: 'Achieve Legendary Craftsmanship.', stat: 'bestGrade', n: 5 },
  { id: 'a_epic', name: 'Epic Creation', desc: 'Forge an Epic weapon.', stat: 'bestRarity', n: 3 },
  { id: 'a_mythic', name: 'Myth Made Real', desc: 'Forge a Mythic weapon.', stat: 'bestRarity', n: 5 },
  { id: 'a_celest', name: 'Heaven-Forged', desc: 'Forge a Celestial weapon.', stat: 'bestRarity', n: 6 },
  { id: 'a_mine10', name: 'Rockbreaker', desc: 'Mine 10 deposits.', stat: 'mined', n: 10 },
  { id: 'a_mine50', name: 'Deep Delver', desc: 'Mine 50 deposits.', stat: 'mined', n: 50 },
  { id: 'a_pocket', name: 'Lucky Strike', desc: 'Find a rare pocket.', stat: 'pockets', n: 1 },
  { id: 'a_win10', name: 'Blooded', desc: 'Win 10 battles.', stat: 'wins', n: 10 },
  { id: 'a_win100', name: 'Veteran', desc: 'Win 100 battles.', stat: 'wins', n: 100 },
  { id: 'a_boss1', name: 'Alpha Slayer', desc: 'Defeat Grimjaw.', boss: 'grimjaw' },
  { id: 'a_boss2', name: 'Gatebreaker', desc: 'Defeat Korrath.', boss: 'korrath' },
  { id: 'a_boss3', name: 'Thornbane', desc: 'Defeat Sylvara.', boss: 'sylvara' },
  { id: 'a_boss4', name: 'Drakeslayer', desc: 'Defeat Pyraxis.', boss: 'pyraxis' },
  { id: 'a_boss5', name: 'Kingmaker', desc: 'Defeat the Hollow Sovereign.', boss: 'sovereign' },
  { id: 'a_echo', name: 'Equal to the First', desc: 'Defeat the Echo of the First Smith.', boss: 'echo' },
  { id: 'a_explore', name: 'Cartographer', desc: 'Fully explore 5 locations.', stat: 'fullyExplored', n: 5 },
  { id: 'a_ench', name: 'Runesmith', desc: 'Forge 5 enchanted weapons.', stat: 'enchanted', n: 5 },
  { id: 'a_lvl10', name: 'Seasoned', desc: 'Reach character level 10.', stat: 'level', n: 10 },
  { id: 'a_lvl25', name: 'Hero of the Realm', desc: 'Reach character level 25.', stat: 'level', n: 25 },
  { id: 'a_smith10', name: 'Grandmaster Smith', desc: 'Reach Blacksmith mastery 10.', stat: 'smithLevel', n: 10 },
  { id: 'a_crit', name: 'Overkill', desc: 'Deal 1,000 damage in a single hit.', stat: 'maxHit', n: 1000 },
  { id: 'a_salvage', name: 'Waste Not', desc: 'Salvage 10 weapons.', stat: 'salvaged', n: 10 },
  { id: 'a_prestige', name: 'Rekindled', desc: 'Rekindle the Eternal Forge.', stat: 'prestiges', n: 1 },
  { id: 'a_flawless', name: 'Flawless Forging', desc: 'Score 100 on every stage of a forging.', stat: 'flawless', n: 1 },
];

// ---- Legacy (prestige) perks ----
export const LEGACY_PERKS = {
  hands: { name: 'Ancestral Hands', max: 5, cost: (r) => 3 + r * 2, desc: (r) => `+${r * 1.5} craftsmanship on every forging.` },
  satchel: { name: 'Inherited Satchel', max: 3, cost: (r) => 2 + r * 2, desc: (r) => `Start each life with ${r * 10} iron, coal and oakwood, and ${r * 40} gold.` },
  memory: { name: 'Ember Memory', max: 1, cost: () => 6, desc: () => 'Keep your Material Refinery and Runic Workbench at level 1 after rekindling.' },
  wanderer: { name: "Wanderer's Map", max: 1, cost: () => 6, desc: () => 'Start each life with every Emberfall location revealed and the Iron Pickaxe.' },
  favor: { name: "Merchant's Favor", max: 3, cost: (r) => 3 + r * 2, desc: (r) => `+${r * 15}% gold from all sources.` },
  heirloom: { name: 'Soulbound Heirloom', max: 1, cost: () => 8, desc: () => 'Keep your equipped weapon when you rekindle.' },
  phoenix: { name: 'Phoenix Brand', max: 1, cost: () => 10, desc: () => 'Learn the exclusive Phoenix Brand blueprint, kept forever.' },
  starlit: { name: 'Starlit Flame', max: 1, cost: () => 4, desc: () => 'Cosmetic: your forge burns with blue-violet starfire.' },
  trials: { name: 'Trials of the Forge', max: 1, cost: () => 8, desc: () => 'Unlock Trial Forging: harder QTEs for +30% craftsmanship XP and +1 trait chance.' },
};

// Balance pass: per-region enemy health/attack multipliers, with per-enemy overrides for elites and bosses.
const REGION_SCALE = { emberfall: [1, 1.25], ironspine: [2.3, 1.9], wilds: [3.0, 2.2], ashen: [5.5, 3.2], astral: [4.0, 2.6] };
const SPECIAL_SCALE = { varka: [1.1, 1.2], grimjaw: [1, 1.2], ironclad: [1.6, 1.6], korrath: [1, 1.25], revenant: [2.4, 1.8], sylvara: [1.1, 1.15], warlord: [1.8, 2.7], pyraxis: [1.7, 2.6], eclipse: [2.2, 2.0], sovereign: [1.5, 1.6], echo: [1.0, 1.15] };
for (const id in ENEMIES) {
  const E = ENEMIES[id]; const [h, a] = SPECIAL_SCALE[id] || REGION_SCALE[E.region];
  E.hp = Math.round(E.hp * h); E.atk = Math.round(E.atk * a);
}

// Redeemable codes (Settings → Redeem a code). Each code works once per save, case-insensitive.
export const CODES = {
  RUNESMITH: { desc: '10 Rune Tablets', mats: { runetablet: 10 } },
};
