# FORGEBORN: Legacy of the Forge

An incremental blacksmith RPG that runs in the browser on desktop and mobile. You explore, mine and forage for materials, forge weapons through hands-on minigames, and fight turn-based battles with what you make. Built with React 18; every weapon, enemy, scene and sound is generated in code, so there are no external assets.

## Play

- Open `dist/forgeborn.html` in a browser. It is one self-contained file (React is bundled in) and works offline.
- `dist/forgeborn-artifact.html` is the same game without the page wrapper, for hosting as a Claude Artifact (it loads React from cdnjs).
- To rebuild after editing `src/`: `npm install` once, then `npm run build`.

## The loop

Explore → gather → forge → equip → fight → upgrade → unlock → repeat.

### Forging
A weapon is a **blueprint** (18 across six categories), a **primary material** (14 metals in five tiers, each in Common / Refined / Pristine quality), up to four **components** (25), an optional **enchantment** (8) and your **craftsmanship**. The design screen previews the stat range, rarity range, stages and cost, and explains any missing requirement and where to get it.

Each forging is a sequence of distinct real-time challenges, weighted per recipe:

| Stage | Interaction |
|---|---|
| Circular Precision | A pointer circles a ring; tap inside the green arc (gold = Perfect). Resets each attempt. Later recipes add direction changes, speed wobble and twin targets. |
| Furnace Heat | Hold the bellows to feed a fire that the metal follows with lag. Keep the temperature in a band that shifts, through drift and cold drafts. |
| Hammering Pattern | Strike points light up across the workpiece; hit each as it flashes gold. Heavy points are held and released; enchanted work adds decoy runes. Pattern varies by weapon type. |
| Quenching Pulse | Rings contract (or expand) radially toward the weapon's outline; trigger on alignment. |
| Rune Enchanting | Drag through rune nodes in order without lifting; advanced runes must be memorized and timed. |
| Mana Stabilization | Steer two coupled energies into moving bands with two dampers. |

Stage scores (0–100) combine into craftsmanship: Flawed, Standard, Fine, Superior, Masterwork or Legendary Craftsmanship. Craftsmanship (×0.75–1.25) and material strength are separate multipliers, so a perfect iron sword does not beat an average mithril one. Rarity (Common → Celestial) comes from tier, components, enchantment, quality and craftsmanship, and sets the number of traits. Every weapon is a unique instance with its own name, art, stats and traits.

### World and gathering
Five regions (Emberfall Valley, Ironspine Highlands, Whispering Wilds, Ashen Wastes, Astral Expanse) with 23 locations. Exploring raises a location's progress, reveals hidden locations, blueprints and enchantments, and rolls deposits, foraging spots, ambushes, treasure and 14 narrative events with real choices. Mining is a short active minigame (strike weak points, catch rare pockets; precision sets ore quality) and pickaxe tier gates harder ores. There is no passive resource generation.

### Combat
Turn-based with telegraphed enemy intents. Attack, weapon skills (three per category, unlocked by mastery), Defend, a Forge Fury special, items, weapon swapping, retreat, and a free Inspect. Attacks and blocks have short timing prompts (toggle in Settings). Statuses: burn, frost/freeze, shock, bleed, poison, armor break, stagger, regeneration, with immunity windows that prevent stun loops. 30 enemies with six behaviour types, five elites, five region bosses with unique mechanics (granite plates, thorn reflection, rising heat, phase shifts) and a secret final boss.

### Progression
Character levels and three talent trees (respec available), Blacksmith mastery with unlocks, per-category weapon mastery, eight forge upgrades, three tool lines, smelting, 26 quests, 31 achievements, a Codex with forging records, and prestige: **Rekindling the Eternal Forge**, which explains exactly what resets and grants Legacy Points for permanent perks.

### Saving
Versioned saves autosave to browser storage with a rotating backup, plus manual save, export and import. Unreadable saves are kept aside rather than overwritten, and the game says so when storage is unavailable.

## Source layout

| File | Contents |
|---|---|
| `src/data.js` | All content and balance tables |
| `src/engine.js` | State, saves, crafting math, exploration, quests, prestige |
| `src/combat.js` | Battle engine and enemy AI |
| `src/qte.jsx` | The six forging minigames and combat timing prompts |
| `src/gather.jsx` | Mining and foraging |
| `src/art.jsx` | Procedural SVG art |
| `src/screens/*.jsx`, `src/App.jsx` | Screens and app shell |
