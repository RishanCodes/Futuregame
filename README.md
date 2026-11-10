# SHATTERPOINT 1.0

A 3D futuristic arena fighting game with action-RPG progression that runs in the browser on PC and mobile. It's built with Three.js (r128) and vanilla JavaScript. It has no build step, needs no server, and loads no assets. Every character, weapon, arena and sound is generated procedurally.

## Play

- Open `index.html` in a browser. It loads the scripts in `src/`.
- Or open `dist/index.html`, a single self-contained file.
- `dist/shatterpoint.html` is the same build without the page wrapper, for hosting as a Claude Artifact.

Rebuild both single-file versions after editing anything in `src/`:

```sh
node tools/build.mjs
```

## What's in 1.0

**Combat**
- Light chains, heavy attacks, light→heavy enders, sprint attacks, aerial attacks and plunges.
- Block with a guard meter and guard breaks. Timed parry: block just before a hit lands. Dodges have invulnerability frames, and dodging at the last moment is a perfect dodge with slow motion.
- After a parry or perfect dodge you get a counter window. Hitstop, knockback and launches/juggles are in.
- Infinites are prevented by combo damage scaling, diminishing hitstun, and a forced "BREAK" after 13 hits or 6 air hits.
- Enemy telegraphs: a white glint means the attack can be parried. A red glint or red floor marker means it can't be blocked.

**Momentum** builds from hits, varied combos, parries, counters and perfect dodges. One button does whatever fits the moment:
- **Extend** continues a combo during recovery (25).
- **Emergency Shift** escapes while being hit (35).
- **Weapon Finisher** at 100.

**Six weapon families**, each with its own moves, timing, reach, skill, Extend and Finisher:

| Weapon | Strengths | Weaknesses |
|---|---|---|
| Plasma Katana | Fast, wider parry window, counters deal ×1.8 | Modest guard damage |
| Gravity Hammer | Area slams, hyper armor, gravity pull | Slow, shorter dodge |
| Photon Daggers | 6-hit chains, 3 dodge charges, backstabs | Short reach, weak guard |
| Pulse Rifle | Ranged bolts, charged lance, grenade | Heat and overheat lockout, weak up close |
| Combat Gauntlets | Best guard, auto-counter on parry, launchers | Very short reach |
| Energy Spear | Longest reach, tip bonus, sweeping heavy | Half damage at point blank |

**Cybernetics.** Two slots. Pick from Phase Dash, Nano Repair (the only healing, 2 uses per fight), Energy Barrier, Magnetic Pulse, Holographic Decoy and Overdrive. Each upgrades from Mk I to Mk III.

**Enemy AI.** There are six archetypes: Brawler, Sentinel, Marksman, Skirmisher, Juggernaut and Vanguard Elite, plus a passive training drone.
- Enemies use the same move sets as the player.
- They react with blocks, parries and dodges, limited by a reaction delay that depends on difficulty.
- They punish attack recovery, flank, kite, and coordinate through attack tokens so they don't all swing at once.
- They steer around obstacles and get themselves unstuck.
- Elites adapt to how often you use lights, heavies, dodges and parries.
- Four difficulties change reaction time, how often enemies defend, aggression, number of simultaneous attackers and combo variety. Health and damage change only modestly.

**Bosses**
- **IRON WARDEN** blocks frontal hits with a shield and has seismic slams with shockwaves you jump over. It also has an unblockable charge and a quake barrage.
- **PHANTOM-7** has telegraphed blink ambushes, kunai volleys and holographic decoys (the decoys cast no shadow).
- **THE ARCHON** fights in three phases: spear plus photon bursts, then katana plus orbital strikes, then hammer plus homing orbs.

**Modes**
- Arena Campaign: 3 sectors, 12 fights, bonus objectives, and stage conditions (vents, shielded enemies, low gravity).
- Survival: endless waves, a boss every 10 waves, and personal bests.
- Boss Rush.
- Duel Simulator: pick any opponent, difficulty and arena.
- 8 Challenges.

**Progression**
- Fighter levels with unlocks, plus weapon mastery (M1–M5) with real perks.
- Five rarities with stat rolls and modifiers, and Legendary-only effects.
- Upgrades, salvage, Data Caches, the Armory shop and cosmetic purchases.

**Character creator.** Name, face presets, skin, eyes, hairstyle and color, height, build and shoulders. Outfit styles for head, torso, arms, legs and footwear, plus three color channels and custom colors. Looks are separate from armor stats. Changes appear live on a 3D preview you can rotate and zoom.

**Arenas.** Neon Colosseum, Industrial Foundry, Sky Platform and Simulation Chamber.

**Saving**
- Progress autosaves to `localStorage` after every fight and change. There's also a manual save.
- You can export and import a save code. Use it when storage is blocked or to move progress to another browser.
- If save data is corrupted, it's backed up and a new save is started.
- Saves stay in the browser that made them. They don't sync between devices.

## Controls

**PC** (all keys can be remapped in Settings → Controls)

| Action | Key |
|---|---|
| Move | WASD |
| Camera | Mouse (click the arena to capture it), or the arrow keys |
| Light attack | Left click |
| Heavy attack | Right click |
| Block / parry | F |
| Dodge | Q |
| Jump | Space |
| Sprint | Shift |
| Weapon skill | E |
| Cybernetics | R / T |
| Momentum | X |
| Lock-on | Tab |
| Pause | Esc / P |

**Mobile**
- A floating joystick on the left half. Push it to the edge to sprint.
- Drag anywhere else to move the camera.
- Buttons for every action, with cooldown sweeps on the buttons.
- Settings let you resize buttons, switch to a left-handed layout, and drag buttons anywhere.

## Code layout

| File | Contents |
|---|---|
| `src/js/core.js` | Utilities, safe storage, save validation, export and import |
| `src/js/data.js` | All tuning data: weapons and moves, abilities, rarities, enemies, bosses, arenas, campaign, challenges |
| `src/js/items.js` | Item generation, loot, upgrades and loadout stat aggregation |
| `src/js/audio.js` | Procedural Web Audio sound effects |
| `src/js/gfx.js` | Renderer, quality levels and adaptive resolution, particles, effects, trails, arena builders, collision helpers |
| `src/js/model.js` | Procedural fighter and weapon models, pose library and animator |
| `src/js/combat.js` | The `Fighter` state machine, and hit resolution (block, parry, dodge, damage, poise, combo limits), projectiles and hazards |
| `src/js/ai.js` | Archetype brains and boss brains |
| `src/js/input.js` | Keyboard, mouse, touch, remapping and touch layout editing |
| `src/js/hud.js` | Combat HUD |
| `src/js/game.js` | Main loop, camera, matches and waves, rewards |
| `src/js/ui.js` | All menus and screens |
| `src/js/main.js` | Boot |

To add a weapon, add an entry to `SP.WEAPONS` with its move data. Enemies and bosses are data-driven in the same way. The AI and the player share one `Fighter` and control interface, so new content works for both.

## Testing

Testing was done with headless Chromium (SwiftShader WebGL) through Playwright scripts that drive the real game:
- Boot, character creation, menus and screens rendered at 1280×720, 844×390 (phone landscape) and 390×844 (phone portrait).
- 54 simulated fights: all 6 weapons against all 6 archetypes and all 3 bosses, with a scripted bot.
- All 12 campaign stages including multi-wave fights and every boss phase transition.
- Survival through the wave-10 boss, Boss Rush, and all 8 challenges.
- Equipment equip, upgrade and salvage, ability purchase and upgrade, weapon purchase, Data Cache.
- Save persistence across a reload, and recovery from a corrupted save.
- Touch input through real touch events: joystick, a simultaneous camera drag, buttons, and holding block.

None of these runs produced a page error. Game logic costs about 0.13 ms per frame with 4 enemies.

**Not verified.** Frame rate on real phones and GPUs, since headless rendering is software-only. Use Settings → Graphics if a device struggles. Quality "Auto" already lowers resolution when the frame rate drops.

## Not in 1.0

- Online multiplayer, PvP and co-op are out of scope for this version.
- No skeletal mocap animation. Fighters use a procedural pose-blending animator.
