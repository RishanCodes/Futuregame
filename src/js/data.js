/* SHATTERPOINT — game data: weapons, abilities, equipment, enemies, arenas, campaign */
'use strict';

/* ---------------------------------------------------------------------------
   Move definition reference
   dur      seconds at attack speed 1
   hits     [{t:[start,end], dmg, range, arc(deg), kb, up, stun, guard, aoe, at, spin}]
   chainAt  time after which the next attack input is accepted
   lunge    [t0, t1, metres]   forward travel during the move (negative = back)
   armor    [t0, t1]  hyper armor (no flinch)
   invuln   [t0, t1]
   anim     {w: windup pose, s: strike pose, spin: turns}
   proj     [{t, kind, dmg, ...}]
   special  named behaviour hooks handled in combat.js
--------------------------------------------------------------------------- */
const H = (t0, t1, o) => Object.assign({ t: [t0, t1], dmg: 10, range: 2.4, arc: 110, kb: 1.2, up: 0, stun: 0.32, guard: 10 }, o);

SP.WEAPONS = {
  katana: {
    id: 'katana', name: 'Plasma Katana', color: '#2fb4ff', grip: 'one',
    blurb: 'Fast, precise cuts with balanced reach. Rewards clean parries with heavy counter damage.',
    strengths: ['Fast attacks', 'Wide parry window (+50ms)', 'Counters deal x1.8'],
    weaknesses: ['Modest guard damage', 'Few area attacks'],
    speed: 1.0, moveMult: 1.0, blockReduce: 0.8, guardMax: 100, parryBonus: 0.05, counterMult: 1.8,
    aiRange: [1.4, 2.4], dodgeCharges: 2,
    chain: ['l1', 'l2', 'l3', 'l4'],
    moves: {
      l1: { name: 'Flash Cut', dur: 0.42, chainAt: 0.2, lunge: [0, 0.14, 0.7], hits: [H(0.12, 0.2, { dmg: 9, range: 2.5, arc: 120 })], anim: { w: 'kWindR', s: 'kSlashR' } },
      l2: { name: 'Return Cut', dur: 0.42, chainAt: 0.2, lunge: [0, 0.14, 0.7], hits: [H(0.12, 0.2, { dmg: 9, range: 2.5, arc: 120 })], anim: { w: 'kWindL', s: 'kSlashL' } },
      l3: { name: 'Descending Arc', dur: 0.5, chainAt: 0.26, lunge: [0, 0.18, 0.8], hits: [H(0.16, 0.25, { dmg: 11, range: 2.6, arc: 90, kb: 1.6 })], anim: { w: 'overW', s: 'overS' } },
      l4: { name: 'Piercing Thrust', dur: 0.62, chainAt: 0.42, lunge: [0.08, 0.26, 1.6], hits: [H(0.18, 0.28, { dmg: 15, range: 2.9, arc: 70, kb: 4.5, stun: 0.5 })], anim: { w: 'thrustW', s: 'thrustS' } },
      heavy: { name: 'Moonfall', dur: 0.85, chainAt: 0.62, lunge: [0.3, 0.45, 1.2], hits: [H(0.38, 0.5, { dmg: 24, range: 2.8, arc: 160, kb: 3.5, stun: 0.6, guard: 30 })], anim: { w: 'wideW', s: 'wideS' } },
      chainHeavy: { name: 'Rising Moon', dur: 0.7, chainAt: 0.5, lunge: [0.1, 0.3, 0.8], hits: [H(0.22, 0.32, { dmg: 17, range: 2.5, arc: 110, kb: 1, up: 7.5, stun: 0.9, guard: 18 })], anim: { w: 'upW', s: 'upS' } },
      dash: { name: 'Sprint Draw', dur: 0.55, chainAt: 0.4, lunge: [0, 0.26, 4.5], hits: [H(0.1, 0.28, { dmg: 13, range: 2.2, arc: 120, kb: 2 })], anim: { w: 'thrustW', s: 'thrustS' } },
      air: { name: 'Sky Cut', dur: 0.42, chainAt: 0.24, air: true, hits: [H(0.12, 0.22, { dmg: 9, range: 2.4, arc: 130, up: 3.2 })], anim: { w: 'kWindR', s: 'kSlashR' } },
      plunge: { name: 'Falling Star', dur: 0.75, plunge: true, hits: [H(0.0, 0.0, { dmg: 18, aoe: 2.4, kb: 3, stun: 0.6, onLand: true })], anim: { w: 'overW', s: 'overS' } },
      ext: { name: 'Crescent Return', dur: 0.56, chainAt: 0.46, hits: [H(0.1, 0.17, { dmg: 9, range: 2.7, arc: 360 }), H(0.26, 0.34, { dmg: 13, range: 2.9, arc: 360, kb: 4 })], anim: { w: 'kWindR', s: 'kSlashL', spin: 1 } },
      skill: { name: 'Iaido Flash', cd: 6, dur: 0.78, invuln: [0.1, 0.42], lunge: [0.12, 0.38, 7.5], hits: [H(0.14, 0.42, { dmg: 22, range: 1.9, arc: 360, kb: 2, stun: 0.75, guard: 25 })], anim: { w: 'drawW', s: 'drawS' }, desc: 'Dash through enemies with an untouchable draw cut.' },
      finisher: { name: 'Thousand Cuts', dur: 1.75, invuln: [0, 1.75], finisher: true, special: 'blinkToTarget',
        hits: [0.2, 0.36, 0.52, 0.68, 0.84, 1.0].map((t) => H(t, t + 0.06, { dmg: 8, range: 3.4, arc: 360, kb: 0.2, stun: 0.5 })).concat([H(1.3, 1.38, { dmg: 34, range: 3.4, arc: 360, kb: 7, stun: 0.8 })]),
        anim: { w: 'kWindR', s: 'kSlashL', spin: 3 }, desc: 'Blink to your target and unleash a storm of cuts.' },
    },
  },

  hammer: {
    id: 'hammer', name: 'Gravity Hammer', color: '#b46cff', grip: 'two',
    blurb: 'Slow, crushing swings with huge knockback, area slams and hyper armor on heavy attacks.',
    strengths: ['Area damage', 'Hyper armor on heavies', 'Shreds guard'],
    weaknesses: ['Slow recovery', 'Shorter dodge', '-8% move speed'],
    speed: 1.0, moveMult: 0.92, blockReduce: 0.8, guardMax: 110, parryBonus: 0, counterMult: 1.5,
    aiRange: [1.6, 2.7], dodgeCharges: 2, dodgeDist: 0.82,
    chain: ['l1', 'l2', 'l3'],
    moves: {
      l1: { name: 'Gravity Swing', dur: 0.74, chainAt: 0.46, lunge: [0.18, 0.36, 0.9], hits: [H(0.3, 0.42, { dmg: 16, range: 2.9, arc: 150, kb: 3, stun: 0.45, guard: 20 })], anim: { w: 'hWindR', s: 'hSwingR' } },
      l2: { name: 'Back Swing', dur: 0.76, chainAt: 0.48, lunge: [0.18, 0.36, 0.9], hits: [H(0.32, 0.43, { dmg: 17, range: 2.9, arc: 150, kb: 3, stun: 0.45, guard: 20 })], anim: { w: 'hWindL', s: 'hSwingL' } },
      l3: { name: 'Crater', dur: 1.0, chainAt: 0.75, armor: [0.1, 0.55], hits: [H(0.45, 0.55, { dmg: 26, aoe: 3.2, at: 1.9, kb: 5, stun: 0.7, guard: 35, fx: 'quake' })], anim: { w: 'hOverW', s: 'hOverS' } },
      heavy: { name: 'Event Horizon', dur: 1.25, chainAt: 0.95, armor: [0.08, 0.74], hits: [H(0.62, 0.72, { dmg: 38, aoe: 3.8, at: 1.8, kb: 6, up: 3, stun: 0.9, guard: 45, fx: 'quake' })], anim: { w: 'hOverW', s: 'hOverS' } },
      chainHeavy: { name: 'Orbit Swing', dur: 1.0, chainAt: 0.8, armor: [0.1, 0.65], hits: [H(0.3, 0.46, { dmg: 13, range: 3.1, arc: 360, kb: 2.5 }), H(0.47, 0.62, { dmg: 13, range: 3.1, arc: 360, kb: 5 })], anim: { w: 'hWindR', s: 'hSwingL', spin: 1.5 } },
      dash: { name: 'Meteor Charge', dur: 0.82, chainAt: 0.6, armor: [0, 0.45], lunge: [0, 0.36, 3.6], hits: [H(0.3, 0.42, { dmg: 20, range: 2.8, arc: 140, kb: 5, stun: 0.6, guard: 30 })], anim: { w: 'hWindR', s: 'hSwingR' } },
      air: { name: 'Downfall', dur: 0.8, plunge: true, hits: [H(0, 0, { dmg: 26, aoe: 3.2, kb: 5, stun: 0.7, onLand: true, fx: 'quake' })], anim: { w: 'hOverW', s: 'hOverS' } },
      plunge: { name: 'Downfall', dur: 0.8, plunge: true, hits: [H(0, 0, { dmg: 26, aoe: 3.2, kb: 5, stun: 0.7, onLand: true, fx: 'quake' })], anim: { w: 'hOverW', s: 'hOverS' } },
      ext: { name: 'Aftershock', dur: 0.7, chainAt: 0.55, armor: [0, 0.4], hits: [H(0.24, 0.32, { dmg: 18, aoe: 4.6, at: 0, kb: 6, up: 2, stun: 0.6, guard: 25, fx: 'quake' })], anim: { w: 'stompW', s: 'stompS' } },
      skill: { name: 'Gravity Well', cd: 9, dur: 1.2, armor: [0, 1.0], special: 'gravityWell', hits: [H(0.78, 0.86, { dmg: 28, aoe: 3.6, at: 2.2, kb: 4, up: 4, stun: 0.9, guard: 40, fx: 'quake' })], anim: { w: 'hOverW', s: 'hOverS' }, desc: 'Pull nearby enemies into a gravity well, then crush them.' },
      finisher: { name: 'Singularity', dur: 1.8, invuln: [0, 1.4], armor: [0, 1.8], finisher: true, special: 'singularity', hits: [H(1.02, 1.1, { dmg: 60, aoe: 6.5, at: 1.5, kb: 9, up: 7, stun: 1.2, guard: 80, fx: 'nova' })], anim: { w: 'hOverW', s: 'hOverS' }, desc: 'Collapse space around you and detonate it.' },
    },
  },

  daggers: {
    id: 'daggers', name: 'Photon Daggers', color: '#ff5cf0', grip: 'dual',
    blurb: 'Blinding six-hit flurries, blinks and an extra dodge charge. Must stay close to deal damage.',
    strengths: ['Very fast chains', '3 dodge charges', '+10% move speed', 'Backstab bonus'],
    weaknesses: ['Short range', 'Weak guard (65% block)'],
    speed: 1.0, moveMult: 1.1, blockReduce: 0.65, guardMax: 80, parryBonus: 0, counterMult: 1.5,
    aiRange: [0.9, 1.6], dodgeCharges: 3, dodgeRecharge: 0.85,
    chain: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'],
    moves: {
      l1: { name: 'Needle', dur: 0.28, chainAt: 0.13, lunge: [0, 0.1, 0.5], hits: [H(0.07, 0.13, { dmg: 5, range: 1.75, arc: 110, stun: 0.26, kb: 0.4, guard: 5 })], anim: { w: 'dWindR', s: 'dStabR' } },
      l2: { name: 'Needle', dur: 0.28, chainAt: 0.13, lunge: [0, 0.1, 0.5], hits: [H(0.07, 0.13, { dmg: 5, range: 1.75, arc: 110, stun: 0.26, kb: 0.4, guard: 5 })], anim: { w: 'dWindL', s: 'dStabL' } },
      l3: { name: 'Cross', dur: 0.3, chainAt: 0.14, lunge: [0, 0.1, 0.5], hits: [H(0.08, 0.14, { dmg: 6, range: 1.8, arc: 130, stun: 0.28, kb: 0.4, guard: 5 })], anim: { w: 'kWindR', s: 'kSlashR' } },
      l4: { name: 'Cross', dur: 0.3, chainAt: 0.14, lunge: [0, 0.1, 0.5], hits: [H(0.08, 0.14, { dmg: 6, range: 1.8, arc: 130, stun: 0.28, kb: 0.4, guard: 5 })], anim: { w: 'kWindL', s: 'kSlashL' } },
      l5: { name: 'Scissor', dur: 0.32, chainAt: 0.16, lunge: [0, 0.1, 0.6], hits: [H(0.09, 0.16, { dmg: 6, range: 1.8, arc: 120, stun: 0.3, kb: 0.4, guard: 6 })], anim: { w: 'dCrossW', s: 'dCrossS' } },
      l6: { name: 'Pinwheel', dur: 0.48, chainAt: 0.34, hits: [H(0.12, 0.22, { dmg: 9, range: 2.0, arc: 360, kb: 3.5, stun: 0.45, guard: 8 })], anim: { w: 'kWindR', s: 'kSlashL', spin: 1 } },
      heavy: { name: 'Whirlwind', dur: 0.82, chainAt: 0.66, hits: [0.18, 0.32, 0.46, 0.6].map((t, i) => H(t, t + 0.08, { dmg: 6, range: 2.1, arc: 360, kb: i === 3 ? 3 : 0.3, stun: 0.35, guard: 6 })), anim: { w: 'dCrossW', s: 'dCrossS', spin: 2 } },
      chainHeavy: { name: 'Reverse Grip', dur: 0.6, chainAt: 0.46, lunge: [0.3, 0.5, -2.4], hits: [H(0.16, 0.24, { dmg: 13, range: 1.9, arc: 120, kb: 1.5, stun: 0.55, guard: 12 })], anim: { w: 'dCrossW', s: 'dCrossS' } },
      dash: { name: 'Lancer Step', dur: 0.42, chainAt: 0.28, lunge: [0, 0.2, 4.2], hits: [H(0.07, 0.22, { dmg: 9, range: 1.8, arc: 140, kb: 1 })], anim: { w: 'dWindR', s: 'dStabR' } },
      air: { name: 'Swallow', dur: 0.32, chainAt: 0.16, air: true, hits: [H(0.08, 0.16, { dmg: 6, range: 1.9, arc: 140, up: 3.6, stun: 0.35 })], anim: { w: 'dWindR', s: 'dStabR' } },
      plunge: { name: 'Nightfall', dur: 0.55, plunge: true, hits: [H(0, 0, { dmg: 12, aoe: 1.9, kb: 2, stun: 0.5, onLand: true })], anim: { w: 'dCrossW', s: 'dCrossS' } },
      ext: { name: 'Shadow Cut', dur: 0.46, chainAt: 0.32, special: 'blinkBehind', invuln: [0, 0.16], hits: [H(0.15, 0.22, { dmg: 12, range: 2.0, arc: 140, kb: 2, stun: 0.5 })], anim: { w: 'dWindR', s: 'dStabR' } },
      skill: { name: 'Phantom Step', cd: 5, dur: 0.62, invuln: [0, 0.3], special: 'blinkBehind', hits: [H(0.2, 0.28, { dmg: 18, range: 2.1, arc: 160, kb: 2, stun: 0.55, guard: 14 })], anim: { w: 'dCrossW', s: 'dCrossS' }, desc: 'Blink behind your target and stab for backstab damage.' },
      finisher: { name: 'Eclipse', dur: 1.7, invuln: [0, 1.7], finisher: true, special: 'eclipse',
        hits: [0.15, 0.4, 0.65, 0.9, 1.15].map((t) => H(t, t + 0.07, { dmg: 9, range: 2.6, arc: 360, kb: 0.2, stun: 0.5 })).concat([H(1.42, 1.5, { dmg: 30, range: 2.8, arc: 360, kb: 6, stun: 0.8 })]),
        anim: { w: 'dCrossW', s: 'dCrossS', spin: 2 }, desc: 'Strike from five directions at once.' },
    },
  },

  rifle: {
    id: 'rifle', name: 'Pulse Rifle', color: '#3dffb0', grip: 'rifle',
    blurb: 'Precise energy bolts at mid range. Shots build heat; overheating locks the rifle for 2 seconds.',
    strengths: ['Ranged pressure', 'Can strafe while firing', 'Grenade crowd control'],
    weaknesses: ['Heat management', 'Weak in melee', 'Poor guard (70% block)'],
    speed: 1.0, moveMult: 1.0, blockReduce: 0.7, guardMax: 85, parryBonus: 0, counterMult: 1.5,
    aiRange: [5.5, 10], dodgeCharges: 2, heat: true,
    chain: ['l1', 'l1b', 'l1', 'l1b'], loopChain: true,
    moves: {
      l1: { name: 'Pulse Bolt', dur: 0.25, chainAt: 0.16, mobile: 0.55, proj: [{ t: 0.06, kind: 'bolt', dmg: 7, speed: 36, heat: 11 }], anim: { w: 'rAim', s: 'rRecoil' } },
      l1b: { name: 'Pulse Bolt', dur: 0.25, chainAt: 0.16, mobile: 0.55, proj: [{ t: 0.06, kind: 'bolt', dmg: 7, speed: 36, heat: 11 }], anim: { w: 'rAim', s: 'rRecoil' } },
      bash: { name: 'Stock Bash', dur: 0.48, chainAt: 0.36, hits: [H(0.12, 0.2, { dmg: 6, range: 1.9, arc: 120, kb: 4.5, stun: 0.45, guard: 8 })], anim: { w: 'rBashW', s: 'rBashS' } },
      heavy: { name: 'Charged Lance', dur: 0.92, chainAt: 0.8, mobile: 0.25, proj: [{ t: 0.62, kind: 'beam', dmg: 26, heat: 34, range: 16, stun: 0.6, kb: 3 }], anim: { w: 'rAim', s: 'rRecoil' }, charge: [0.05, 0.62] },
      chainHeavy: { name: 'Quick Lance', dur: 0.72, chainAt: 0.6, mobile: 0.25, proj: [{ t: 0.44, kind: 'beam', dmg: 20, heat: 30, range: 15, stun: 0.5, kb: 2.5 }], anim: { w: 'rAim', s: 'rRecoil' }, charge: [0.05, 0.44] },
      dash: { name: 'Slide Shot', dur: 0.52, chainAt: 0.36, lunge: [0, 0.3, 3.6], proj: [{ t: 0.22, kind: 'bolt', dmg: 9, speed: 38, heat: 10 }], anim: { w: 'rAim', s: 'rRecoil' } },
      air: { name: 'Air Burst', dur: 0.32, chainAt: 0.2, air: true, proj: [{ t: 0.08, kind: 'bolt', dmg: 7, speed: 36, heat: 11 }], anim: { w: 'rAim', s: 'rRecoil' } },
      plunge: { name: 'Air Burst', dur: 0.32, chainAt: 0.2, air: true, proj: [{ t: 0.08, kind: 'bolt', dmg: 7, speed: 36, heat: 11 }], anim: { w: 'rAim', s: 'rRecoil' } },
      ext: { name: 'Vent Burst', dur: 0.46, chainAt: 0.34, special: 'vent', hits: [H(0.12, 0.2, { dmg: 10, aoe: 3.3, at: 0, kb: 5.5, stun: 0.5, guard: 10, fx: 'vent' })], anim: { w: 'stompW', s: 'stompS' } },
      skill: { name: 'Concussion Grenade', cd: 8, dur: 0.56, proj: [{ t: 0.24, kind: 'grenade', dmg: 18, radius: 3.6, kb: 6, stun: 0.85 }], anim: { w: 'throwW', s: 'throwS' }, desc: 'Lob a grenade that knocks back and stuns everything in the blast.' },
      finisher: { name: 'Overcharge Barrage', dur: 1.7, armor: [0, 1.7], finisher: true, mobile: 0.2,
        proj: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1].map((t) => ({ t, kind: 'bolt', dmg: 7, speed: 42, heat: 0, homing: 3 })).concat([{ t: 1.38, kind: 'beam', dmg: 30, heat: 0, range: 18, stun: 0.8, kb: 6 }]),
        anim: { w: 'rAim', s: 'rRecoil' }, desc: 'Fire a heat-free volley of homing bolts and a final lance.' },
    },
  },

  gauntlets: {
    id: 'gauntlets', name: 'Combat Gauntlets', color: '#ffbf3d', grip: 'fists',
    blurb: 'Relentless close-range strikes, launchers for juggles, and the best guard in the game.',
    strengths: ['Best guard (90% block)', 'Parries auto-counter', 'Launch & juggle'],
    weaknesses: ['Very short reach', 'Must close distance'],
    speed: 1.0, moveMult: 1.04, blockReduce: 0.9, guardMax: 125, parryBonus: 0.02, counterMult: 1.5, autoCounter: true,
    aiRange: [0.9, 1.5], dodgeCharges: 2,
    chain: ['l1', 'l2', 'l3', 'l4', 'l5'],
    moves: {
      l1: { name: 'Jab', dur: 0.3, chainAt: 0.14, lunge: [0, 0.1, 0.6], hits: [H(0.08, 0.14, { dmg: 7, range: 1.65, arc: 100, stun: 0.3, kb: 0.5, guard: 7 })], anim: { w: 'gWindR', s: 'gJabR' } },
      l2: { name: 'Cross', dur: 0.3, chainAt: 0.14, lunge: [0, 0.1, 0.6], hits: [H(0.08, 0.14, { dmg: 7, range: 1.65, arc: 100, stun: 0.3, kb: 0.5, guard: 7 })], anim: { w: 'gWindL', s: 'gJabL' } },
      l3: { name: 'Hook', dur: 0.34, chainAt: 0.17, lunge: [0, 0.12, 0.6], hits: [H(0.1, 0.17, { dmg: 8, range: 1.7, arc: 130, stun: 0.32, kb: 0.6, guard: 8 })], anim: { w: 'gHookWR', s: 'gHookR' } },
      l4: { name: 'Hook', dur: 0.34, chainAt: 0.17, lunge: [0, 0.12, 0.6], hits: [H(0.1, 0.17, { dmg: 8, range: 1.7, arc: 130, stun: 0.32, kb: 0.6, guard: 8 })], anim: { w: 'gHookWL', s: 'gHookL' } },
      l5: { name: 'Piston', dur: 0.5, chainAt: 0.34, lunge: [0.05, 0.18, 1.2], hits: [H(0.14, 0.22, { dmg: 12, range: 1.95, arc: 90, kb: 4.5, stun: 0.5, guard: 14 })], anim: { w: 'gWindR', s: 'gJabR' } },
      heavy: { name: 'Rising Uppercut', dur: 0.7, chainAt: 0.5, lunge: [0.1, 0.25, 0.8], hits: [H(0.24, 0.32, { dmg: 17, range: 1.8, arc: 110, up: 8.5, kb: 0.8, stun: 0.9, guard: 18 })], anim: { w: 'gUpW', s: 'gUpS' } },
      chainHeavy: { name: 'Hammer Fist', dur: 0.7, chainAt: 0.52, lunge: [0.1, 0.28, 0.8], hits: [H(0.28, 0.36, { dmg: 19, range: 1.85, arc: 110, kb: 2.5, stun: 0.6, guard: 40 })], anim: { w: 'overW', s: 'overS' } },
      dash: { name: 'Rocket Jab', dur: 0.5, chainAt: 0.34, lunge: [0, 0.28, 5], hits: [H(0.08, 0.3, { dmg: 12, range: 1.8, arc: 120, kb: 3 })], anim: { w: 'gWindR', s: 'gJabR' } },
      air: { name: 'Sky Jab', dur: 0.32, chainAt: 0.16, air: true, hits: [H(0.08, 0.15, { dmg: 7, range: 1.8, arc: 120, up: 3.8, stun: 0.35 })], anim: { w: 'gWindR', s: 'gJabR' } },
      plunge: { name: 'Meteor Drop', dur: 0.6, plunge: true, hits: [H(0, 0, { dmg: 16, aoe: 2.3, kb: 3.5, stun: 0.6, onLand: true, fx: 'quake' })], anim: { w: 'overW', s: 'overS' } },
      ext: { name: 'Rapid Barrage', dur: 0.72, chainAt: 0.6, hits: [0.08, 0.18, 0.28, 0.38].map((t) => H(t, t + 0.05, { dmg: 4, range: 1.8, arc: 110, stun: 0.3, kb: 0.1, guard: 5 })).concat([H(0.5, 0.56, { dmg: 9, range: 1.9, arc: 110, kb: 4, stun: 0.5 })]), anim: { w: 'gWindL', s: 'gJabR' } },
      skill: { name: 'Kinetic Counter', cd: 6, dur: 0.9, counterStance: [0.04, 0.78], anim: { w: 'blockP', s: 'blockP' }, desc: 'Brace for 0.75s. If struck, absorb the blow and retaliate with a crushing counter.' },
      kcounter: { name: 'Kinetic Release', dur: 0.55, invuln: [0, 0.4], hits: [H(0.1, 0.18, { dmg: 30, range: 2.4, arc: 140, kb: 6.5, stun: 0.9, guard: 40, fx: 'nova' })], anim: { w: 'gWindR', s: 'gJabR' } },
      pcounter: { name: 'Parry Counter', dur: 0.42, invuln: [0, 0.2], hits: [H(0.06, 0.14, { dmg: 12, range: 2.2, arc: 140, kb: 2.5, stun: 0.6 })], anim: { w: 'gWindL', s: 'gJabL' } },
      finisher: { name: 'Meteor Fist', dur: 1.5, invuln: [0, 1.5], finisher: true, special: 'blinkToTarget',
        hits: [0.15, 0.27, 0.39, 0.51, 0.63, 0.75].map((t) => H(t, t + 0.05, { dmg: 6, range: 2.4, arc: 140, kb: 0.1, stun: 0.5 })).concat([H(1.05, 1.12, { dmg: 36, aoe: 2.8, at: 1.0, kb: 8, up: 5, stun: 0.9, fx: 'nova' })]),
        anim: { w: 'gWindL', s: 'gJabR' }, desc: 'A blistering combo ending in a meteor punch.' },
    },
  },

  spear: {
    id: 'spear', name: 'Energy Spear', color: '#3d8bff', grip: 'spear',
    blurb: 'The longest melee reach. Tip strikes deal bonus damage; enemies hugging you take half damage.',
    strengths: ['Longest reach', 'Tip bonus (+15% beyond 2.6m)', 'Crowd-clearing sweep'],
    weaknesses: ['Half damage within 1.4m', 'Narrow thrust arcs'],
    speed: 1.0, moveMult: 0.98, blockReduce: 0.8, guardMax: 100, parryBonus: 0, counterMult: 1.5, tipper: true,
    aiRange: [2.4, 3.5], dodgeCharges: 2,
    chain: ['l1', 'l2', 'l3'],
    moves: {
      l1: { name: 'Lance', dur: 0.5, chainAt: 0.26, lunge: [0.04, 0.18, 0.6], hits: [H(0.16, 0.24, { dmg: 11, range: 3.8, arc: 40, kb: 1.6, stun: 0.36, guard: 10 })], anim: { w: 'thrustW', s: 'thrustS' } },
      l2: { name: 'Lance', dur: 0.5, chainAt: 0.26, lunge: [0.04, 0.18, 0.6], hits: [H(0.16, 0.24, { dmg: 11, range: 3.8, arc: 40, kb: 1.6, stun: 0.36, guard: 10 })], anim: { w: 'thrustW', s: 'thrustS' } },
      l3: { name: 'Twin Fang', dur: 0.66, chainAt: 0.44, lunge: [0.04, 0.3, 1.0], hits: [H(0.16, 0.22, { dmg: 8, range: 3.8, arc: 40, kb: 0.6, stun: 0.36 }), H(0.32, 0.38, { dmg: 11, range: 3.9, arc: 40, kb: 4, stun: 0.5 })], anim: { w: 'thrustW', s: 'thrustS' } },
      heavy: { name: 'Crescent Sweep', dur: 0.86, chainAt: 0.64, hits: [H(0.3, 0.5, { dmg: 20, range: 3.4, arc: 300, kb: 4, stun: 0.55, guard: 25, closeOk: true })], anim: { w: 'wideW', s: 'wideS', spin: 0.8 } },
      chainHeavy: { name: 'Vault Kick', dur: 0.66, chainAt: 0.5, lunge: [0.3, 0.5, -2.6], hits: [H(0.14, 0.22, { dmg: 9, range: 1.8, arc: 130, kb: 6.5, stun: 0.6, guard: 15, closeOk: true })], anim: { w: 'kickW', s: 'kickS' } },
      dash: { name: 'Comet Charge', dur: 0.72, chainAt: 0.5, lunge: [0, 0.4, 5.2], hits: [H(0.1, 0.4, { dmg: 14, range: 3.4, arc: 50, kb: 3, stun: 0.45 })], anim: { w: 'thrustW', s: 'thrustS' } },
      air: { name: 'Sky Pierce', dur: 0.5, chainAt: 0.3, air: true, hits: [H(0.14, 0.24, { dmg: 11, range: 3.4, arc: 60, up: 2.6, stun: 0.4 })], anim: { w: 'thrustW', s: 'thrustS' } },
      plunge: { name: 'Impaler', dur: 0.72, plunge: true, hits: [H(0, 0, { dmg: 18, aoe: 2.2, kb: 3, stun: 0.6, onLand: true, closeOk: true })], anim: { w: 'overW', s: 'overS' } },
      ext: { name: 'Skewer', dur: 0.62, chainAt: 0.44, lunge: [0.1, 0.26, 1.4], hits: [H(0.2, 0.3, { dmg: 18, range: 4.6, arc: 34, kb: 6, stun: 0.6, guard: 20 })], anim: { w: 'thrustW', s: 'thrustS' } },
      skill: { name: 'Lunge Strike', cd: 7, dur: 0.82, armor: [0.1, 0.5], lunge: [0.15, 0.45, 8], hits: [H(0.15, 0.5, { dmg: 24, range: 3.3, arc: 70, kb: 4, stun: 0.6, guard: 25 })], anim: { w: 'thrustW', s: 'thrustS' }, desc: 'Rocket forward 8m with an armored piercing thrust.' },
      finisher: { name: 'Skewer Storm', dur: 1.7, invuln: [0, 1.7], finisher: true,
        hits: [0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.05].map((t) => H(t, t + 0.06, { dmg: 8, range: 4.4, arc: 70, kb: 0.1, stun: 0.5, closeOk: true })).concat([H(1.35, 1.43, { dmg: 34, range: 4.6, arc: 90, kb: 8, stun: 0.8, closeOk: true })]),
        anim: { w: 'thrustW', s: 'thrustS' }, desc: 'A hail of thrusts capped by a devastating impale.' },
    },
  },
};
SP.WEAPON_ORDER = ['katana', 'gauntlets', 'spear', 'daggers', 'rifle', 'hammer'];

/* ---------- cybernetic abilities ---------- */
SP.ABILITIES = {
  phase: { id: 'phase', name: 'Phase Dash', icon: '»', cd: 7, level: 1, cost: 0, desc: 'Blink 7m in your movement direction, untouchable for the jump.', mk: 'Mk II/III: -1s cooldown each' },
  repair: { id: 'repair', name: 'Nano Repair', icon: '+', cd: 30, level: 1, cost: 0, heal: true, uses: 2, desc: 'Restore 30% health over 3s. Max 2 uses per fight. Counts as healing.', mk: 'Mk II/III: +5% healing each' },
  barrier: { id: 'barrier', name: 'Energy Barrier', icon: '◈', cd: 18, level: 2, cost: 300, desc: 'Take 60% less damage for 4s, but move 20% slower.', mk: 'Mk II/III: +1s duration each' },
  pulse: { id: 'pulse', name: 'Magnetic Pulse', icon: '◎', cd: 14, level: 3, cost: 450, desc: 'Blast enemies within 5.5m away and interrupt their attacks.', mk: 'Mk II/III: +0.75m radius each' },
  decoy: { id: 'decoy', name: 'Holographic Decoy', icon: '◇', cd: 20, level: 5, cost: 600, desc: 'Project a decoy that enemies attack for 5s.', mk: 'Mk II/III: +1.5s duration; Mk III decoy explodes' },
  overdrive: { id: 'overdrive', name: 'Overdrive', icon: '▲', cd: 24, level: 7, cost: 800, desc: '+25% attack and move speed for 6s, but take 15% more damage.', mk: 'Mk II/III: +1.5s duration each' },
};
SP.ABILITY_ORDER = ['phase', 'repair', 'barrier', 'pulse', 'decoy', 'overdrive'];

/* ---------- rarities ---------- */
SP.RARITY = [
  { id: 0, name: 'Common', color: '#9aa3b2', mult: 1.0, maxLevel: 5, stats: 0, mods: 0 },
  { id: 1, name: 'Uncommon', color: '#3ddc84', mult: 1.07, maxLevel: 6, stats: 1, mods: 0 },
  { id: 2, name: 'Rare', color: '#3d8bff', mult: 1.14, maxLevel: 8, stats: 1, mods: 1 },
  { id: 3, name: 'Epic', color: '#b46cff', mult: 1.22, maxLevel: 9, stats: 2, mods: 2 },
  { id: 4, name: 'Legendary', color: '#ffbf3d', mult: 1.32, maxLevel: 10, stats: 2, mods: 2, legendary: 1 },
];

/* weapon side stats */
SP.WSTATS = {
  speed: { name: 'Attack speed', fmt: (v) => '+' + Math.round(v * 100) + '%', roll: [0.04, 0.08] },
  crit: { name: 'Crit chance', fmt: (v) => '+' + Math.round(v * 100) + '%', roll: [0.05, 0.1] },
  guardBreak: { name: 'Guard damage', fmt: (v) => '+' + Math.round(v * 100) + '%', roll: [0.12, 0.22] },
  reach: { name: 'Reach', fmt: (v) => '+' + Math.round(v * 100) + '%', roll: [0.05, 0.09] },
};
/* armor stats */
SP.ASTATS = {
  hp: { name: 'Max health', fmt: (v) => '+' + Math.round(v), roll: [8, 16] },
  def: { name: 'Damage reduction', fmt: (v) => '+' + (v * 100).toFixed(1) + '%', roll: [0.015, 0.03] },
  guard: { name: 'Guard', fmt: (v) => '+' + Math.round(v), roll: [6, 12] },
  speed: { name: 'Move speed', fmt: (v) => '+' + Math.round(v * 100) + '%', roll: [0.02, 0.04] },
  cdr: { name: 'Ability cooldown', fmt: (v) => '-' + Math.round(v * 100) + '%', roll: [0.03, 0.06] },
  momentum: { name: 'Momentum gain', fmt: (v) => '+' + Math.round(v * 100) + '%', roll: [0.05, 0.1] },
  dodge: { name: 'Dodge recharge', fmt: (v) => '+' + Math.round(v * 100) + '%', roll: [0.05, 0.1] },
};
SP.SLOT_BASE = {
  head: { name: 'Head', main: { hp: 10, cdr: 0.03 } },
  torso: { name: 'Torso', main: { hp: 28, def: 0.04 } },
  arms: { name: 'Arms', main: { guard: 14, hp: 6 } },
  legs: { name: 'Legs', main: { hp: 14, speed: 0.02 } },
  feet: { name: 'Footwear', main: { speed: 0.03, dodge: 0.06 } },
};
SP.SLOTS = ['head', 'torso', 'arms', 'legs', 'feet'];

SP.MODS = {
  siphon: { name: 'Siphon', desc: 'Heal 4% of damage you deal.' },
  surge: { name: 'Surge Core', desc: '+25% Momentum gain.' },
  static: { name: 'Static Charge', desc: 'Every 4th hit deals +8 shock damage.' },
  executioner: { name: 'Executioner', desc: '+30% damage to staggered enemies.' },
  riposte: { name: 'Riposte', desc: 'Counter window lasts 1s longer and counters deal +15%.' },
  tempo: { name: 'Tempo', desc: 'Weapon skill cooldown -20%.' },
  feedback: { name: 'Feedback Loop', desc: 'Perfect dodges refund a dodge charge and grant +10 Momentum.' },
  bulwark: { name: 'Bulwark', desc: 'Blocking costs 30% less guard.' },
};
SP.LEGENDARY_MODS = {
  echo: { name: 'Echo Edge', desc: 'Every 6th hit releases a shockwave (12 damage, 2.5m).' },
  shatter: { name: 'Shatterpoint', desc: 'Parries and guard breaks detonate for 25 area damage.' },
  overclock: { name: 'Overclock', desc: 'Weapon Finishers cost 75 Momentum instead of 100.' },
};

/* ---------- cosmetics ---------- */
SP.STYLES = {
  head: [
    { id: 'none', name: 'None' }, { id: 'visor', name: 'Tactical Visor' }, { id: 'band', name: 'Neural Band', cost: 200 },
    { id: 'helm', name: 'Strike Helm', cost: 450 }, { id: 'crest', name: 'Crest Helm', cost: 600 }, { id: 'hood', name: 'Ghost Hood', cost: 500 }, { id: 'mask', name: 'Oni Respirator', cost: 650 },
  ],
  torso: [
    { id: 'tank', name: 'Compression Top' }, { id: 'runner', name: 'Runner Jacket' }, { id: 'plate', name: 'Bastion Plate', cost: 500 },
    { id: 'coat', name: 'Longcoat', cost: 650 }, { id: 'core', name: 'Reactor Rig', cost: 750 },
  ],
  arms: [
    { id: 'bare', name: 'Sleeveless' }, { id: 'wraps', name: 'Combat Wraps' }, { id: 'guards', name: 'Vambraces', cost: 300 },
    { id: 'plated', name: 'Plated Arms', cost: 450 }, { id: 'cyber', name: 'Cyber Limbs', cost: 700 },
  ],
  legs: [
    { id: 'shorts', name: 'Fight Shorts' }, { id: 'cargo', name: 'Cargo Pants' }, { id: 'sleek', name: 'Sleek Suit', cost: 300 }, { id: 'plated', name: 'Plated Greaves', cost: 500 },
  ],
  feet: [
    { id: 'sneakers', name: 'Sneakers' }, { id: 'boots', name: 'Combat Boots' }, { id: 'greaves', name: 'Mag Greaves', cost: 350 }, { id: 'hover', name: 'Hover Soles', cost: 600 },
  ],
};
SP.SKIN_TONES = ['#f6d7c3', '#e8b896', '#c98e66', '#a06a45', '#7a4b2e', '#4f3020', '#b9c6d6', '#8fa3b8'];
SP.HAIR_COLORS = ['#141418', '#3b2a20', '#7a4a26', '#c99a5b', '#e6e1d6', '#b3122e', '#2fb4ff', '#9a5cff', '#3ddc84', '#ff5cf0'];
SP.EYE_COLORS = ['#2fb4ff', '#9a5cff', '#3ddc84', '#ffbf3d', '#ff4d6d', '#e8ecf3', '#5a3d2b'];
SP.HAIR_STYLES = [
  { id: 'none', name: 'Shaved' }, { id: 'short', name: 'Crop' }, { id: 'mohawk', name: 'Mohawk' }, { id: 'spikes', name: 'Spikes' },
  { id: 'long', name: 'Long' }, { id: 'bun', name: 'Top Knot' }, { id: 'bob', name: 'Bob' },
];
SP.FACES = [
  { name: 'Resolute' }, { name: 'Keen' }, { name: 'Stoic' }, { name: 'Fierce' }, { name: 'Soft' },
];
SP.PALETTE = ['#0e1118', '#1b2030', '#2a3142', '#c9d2e3', '#f2f5fa', '#2fb4ff', '#1f6fd1', '#9a5cff', '#5b2bd1', '#ff4d6d', '#ff8a3d', '#ffbf3d', '#3ddc84', '#16a3a3', '#ff5cf0', '#6b7387'];

/* ---------- enemies ---------- */
SP.ARCHETYPES = {
  aggressive: { id: 'aggressive', name: 'Brawler', color: '#ff4d4d', weapons: ['katana', 'gauntlets', 'daggers'], hp: 1.0, aggr: 0.9, block: 0.15, parry: 0.06, dodge: 0.15, combo: [3, 5], strafe: 0.3, skill: 0.5, punish: 0.4, desc: 'Pressures relentlessly with quick strings.' },
  defensive: { id: 'defensive', name: 'Sentinel', color: '#ffd23d', weapons: ['katana', 'spear', 'gauntlets'], hp: 1.05, aggr: 0.35, block: 0.6, parry: 0.3, dodge: 0.2, combo: [1, 3], strafe: 0.5, skill: 0.4, punish: 0.9, desc: 'Turtles up, parries and punishes reckless swings.' },
  tactical: { id: 'tactical', name: 'Marksman', color: '#3dffb0', weapons: ['rifle', 'spear'], hp: 0.95, aggr: 0.55, block: 0.3, parry: 0.1, dodge: 0.35, combo: [2, 4], strafe: 0.7, skill: 0.75, punish: 0.5, kite: true, desc: 'Keeps its distance and controls space.' },
  mobile: { id: 'mobile', name: 'Skirmisher', color: '#ff5cf0', weapons: ['daggers', 'katana'], hp: 0.9, aggr: 0.75, block: 0.1, parry: 0.05, dodge: 0.5, combo: [2, 4], strafe: 0.9, skill: 0.7, punish: 0.5, flank: true, desc: 'Dashes around you and strikes from odd angles.' },
  heavy: { id: 'heavy', name: 'Juggernaut', color: '#ff8a3d', weapons: ['hammer'], hp: 1.6, aggr: 0.6, block: 0.2, parry: 0.0, dodge: 0.05, combo: [1, 3], strafe: 0.2, skill: 0.5, punish: 0.6, poise: 45, scale: 1.14, desc: 'Shrugs off light hits and punishes bad positioning.' },
  elite: { id: 'elite', name: 'Vanguard Elite', color: '#b46cff', weapons: ['katana', 'spear', 'daggers', 'gauntlets', 'hammer', 'rifle'], hp: 1.45, aggr: 0.7, block: 0.45, parry: 0.3, dodge: 0.4, combo: [2, 5], strafe: 0.6, skill: 0.8, punish: 0.85, adapt: true, poise: 25, desc: 'Combines every style and adapts to your habits.' },
  drone: { id: 'drone', name: 'Training Drone', color: '#9aa3b2', weapons: ['katana'], hp: 3.0, aggr: 0, block: 0, parry: 0, dodge: 0, combo: [1, 1], strafe: 0, skill: 0, punish: 0, passive: true, desc: 'A passive sparring target. It never attacks.' },
};
SP.ARCH_ORDER = ['aggressive', 'defensive', 'tactical', 'mobile', 'heavy', 'elite', 'drone'];

SP.DIFFICULTY = {
  easy: { name: 'Easy', react: 0.5, def: 0.45, aggr: 0.7, tokens: 1, variety: 0.4, hp: 0.85, dmg: 0.75, reward: 0.8, decide: 0.55 },
  normal: { name: 'Normal', react: 0.34, def: 0.8, aggr: 1.0, tokens: 2, variety: 0.7, hp: 1.0, dmg: 1.0, reward: 1.0, decide: 0.38 },
  hard: { name: 'Hard', react: 0.26, def: 1.05, aggr: 1.15, tokens: 2, variety: 0.9, hp: 1.1, dmg: 1.04, reward: 1.35, decide: 0.28 },
  nightmare: { name: 'Nightmare', react: 0.2, def: 1.25, aggr: 1.3, tokens: 3, variety: 1.0, hp: 1.2, dmg: 1.12, reward: 1.8, decide: 0.2 },
};
SP.DIFF_ORDER = ['easy', 'normal', 'hard', 'nightmare'];

SP.BOSSES = {
  warden: { id: 'warden', name: 'IRON WARDEN', title: 'Bastion of Sector 1', weapon: 'hammer', hp: 720, scale: 1.55, color: '#ff8a3d', poise: 120, shield: true,
    desc: 'A colossal guardian. Its tower shield blocks frontal hits; strike from the sides or break its guard with heavies. Jump over its shockwaves.' },
  phantom: { id: 'phantom', name: 'PHANTOM-7', title: 'Foundry Assassin', weapon: 'daggers', hp: 640, scale: 1.0, color: '#ff5cf0', poise: 30,
    desc: 'Teleports behind you, splits into holographic decoys and throws kunai volleys. The real Phantom casts a shadow.' },
  archon: { id: 'archon', name: 'THE ARCHON', title: 'Experimental Unit Zero', weapon: 'spear', hp: 1050, scale: 1.3, color: '#ffffff', poise: 80,
    desc: 'Switches weapon technology every phase: spear and rifle, then katana with orbital strikes, then hammer with everything at once.' },
};

/* ---------- arenas ---------- */
SP.ARENAS = {
  colosseum: { id: 'colosseum', name: 'Neon Colosseum', shape: 'circle', size: 17, floor: '#10131c', line: '#2fb4ff', accent: '#9a5cff', fog: '#07080f', sky: '#06070c', obstacles: [] },
  foundry: { id: 'foundry', name: 'Industrial Foundry', shape: 'square', size: 15.5, floor: '#15110e', line: '#ff8a3d', accent: '#ffbf3d', fog: '#0e0806', sky: '#0b0605',
    obstacles: [{ x: -7, z: -7, r: 1.1 }, { x: 7, z: -7, r: 1.1 }, { x: -7, z: 7, r: 1.1 }, { x: 7, z: 7, r: 1.1 }] },
  sky: { id: 'sky', name: 'Sky Platform', shape: 'octagon', size: 16, floor: '#0d1422', line: '#7fd0ff', accent: '#ffffff', fog: '#1a2440', sky: '#0b1328', obstacles: [] },
  sim: { id: 'sim', name: 'Simulation Chamber', shape: 'square', size: 15, floor: '#06090d', line: '#3ddc84', accent: '#2fb4ff', fog: '#020406', sky: '#020406',
    obstacles: [{ x: -5.5, z: 0, r: 1.2, box: true }, { x: 5.5, z: 0, r: 1.2, box: true }] },
};
SP.ARENA_ORDER = ['colosseum', 'foundry', 'sky', 'sim'];

/* ---------- campaign ---------- */
const E = (arch, weapon) => ({ arch, weapon });
SP.CAMPAIGN = [
  { id: 1, name: 'Proving Grounds', arena: 'colosseum', blurb: 'The Neon Colosseum hosts every rookie who wants a licence to fight.',
    stages: [
      { id: '1-1', name: 'First Blood', waves: [[E('aggressive', 'katana')]], bonus: { id: 'time', v: 75, text: 'Win within 75 seconds' } },
      { id: '1-2', name: 'Shield Wall', waves: [[E('defensive', 'gauntlets')]], bonus: { id: 'parries', v: 2, text: 'Land 2 parries' }, tip: 'Sentinels block a lot. Use heavy attacks to break guard, or parry their counters.' },
      { id: '1-3', name: 'Double Trouble', waves: [[E('aggressive', 'daggers'), E('aggressive', 'gauntlets')]], bonus: { id: 'dmgTaken', v: 0.5, text: 'Lose less than 50% health' } },
      { id: '1-B', name: 'IRON WARDEN', boss: 'warden', waves: [[{ boss: 'warden' }]], bonus: { id: 'noheal', text: 'Win without healing' } },
    ] },
  { id: 2, name: 'Molten Circuit', arena: 'foundry', blurb: 'Underground foundry bouts. Vents erupt and the crowd wants fire.',
    stages: [
      { id: '2-1', name: 'Crossfire', waves: [[E('tactical', 'rifle'), E('aggressive', 'katana')]], bonus: { id: 'perfect', v: 2, text: 'Perform 2 perfect dodges' } },
      { id: '2-2', name: 'Pressure Vents', waves: [[E('heavy', 'hammer')]], modifier: 'vents', bonus: { id: 'counters', v: 3, text: 'Land 3 counter hits' }, tip: 'Watch for orange vent markers on the floor.' },
      { id: '2-3', name: 'Shift Change', waves: [[E('mobile', 'daggers'), E('mobile', 'katana')], [E('tactical', 'spear')]], bonus: { id: 'time', v: 130, text: 'Win within 130 seconds' } },
      { id: '2-B', name: 'PHANTOM-7', boss: 'phantom', waves: [[{ boss: 'phantom' }]], bonus: { id: 'dmgTaken', v: 0.6, text: 'Lose less than 60% health' } },
    ] },
  { id: 3, name: 'Zenith Spire', arena: 'sky', blurb: 'A platform above the megacity. Only elites fight here.',
    stages: [
      { id: '3-1', name: 'Vanguard', waves: [[E('elite', 'katana')]], modifier: 'shielded', bonus: { id: 'parries', v: 3, text: 'Land 3 parries' }, tip: 'Shielded: enemies have +50% guard.' },
      { id: '3-2', name: 'Kill Box', waves: [[E('heavy', 'hammer'), E('tactical', 'rifle'), E('defensive', 'spear')]], bonus: { id: 'finishers', v: 1, text: 'Land a Weapon Finisher' } },
      { id: '3-3', name: 'Final Trial', waves: [[E('elite', 'spear')], [E('elite', 'daggers'), E('mobile', 'gauntlets')]], modifier: 'lowgrav', bonus: { id: 'noheal', text: 'Win without healing' }, tip: 'Low gravity: jumps float longer, aerial combos are easier.' },
      { id: '3-B', name: 'THE ARCHON', boss: 'archon', waves: [[{ boss: 'archon' }]], bonus: { id: 'time', v: 240, text: 'Win within 4 minutes' } },
    ] },
];
SP.MODIFIERS = {
  vents: { name: 'Pressure Vents', desc: 'Vents erupt under random spots every few seconds.' },
  shielded: { name: 'Shielded', desc: 'Enemies have +50% guard.' },
  lowgrav: { name: 'Low Gravity', desc: 'Everyone jumps higher and falls slower.' },
};

/* ---------- challenges ---------- */
SP.CHALLENGES = [
  { id: 'clean', name: 'Clean Hands', desc: 'Defeat two Brawlers without healing.', arena: 'colosseum', waves: [[E('aggressive', 'katana'), E('aggressive', 'gauntlets')]], goal: { id: 'noheal' }, reward: { credits: 500, shards: 20 } },
  { id: 'speed', name: 'Speed Trial', desc: 'Defeat three enemies within 90 seconds.', arena: 'sim', waves: [[E('aggressive', 'daggers')], [E('tactical', 'rifle'), E('mobile', 'katana')]], goal: { id: 'time', v: 90 }, reward: { credits: 550, shards: 20 } },
  { id: 'blade', name: 'Blade Discipline', desc: 'Defeat a Sentinel using the Plasma Katana.', arena: 'colosseum', weapon: 'katana', waves: [[E('defensive', 'katana')]], goal: { id: 'win' }, reward: { credits: 400, shards: 15 } },
  { id: 'counter', name: 'Counter Culture', desc: 'Land 5 counter hits in one fight.', arena: 'sim', waves: [[E('aggressive', 'gauntlets')]], goal: { id: 'counters', v: 5 }, reward: { credits: 500, shards: 25 } },
  { id: 'untouch', name: 'Untouchable', desc: 'Defeat a Skirmisher while losing less than 25% health.', arena: 'sky', waves: [[E('mobile', 'daggers')]], goal: { id: 'dmgTaken', v: 0.25 }, reward: { credits: 600, shards: 25 } },
  { id: 'metal', name: 'Heavy Metal', desc: 'Defeat a Juggernaut using the Gravity Hammer.', arena: 'foundry', weapon: 'hammer', waves: [[E('heavy', 'hammer')]], goal: { id: 'win' }, reward: { credits: 450, shards: 20 } },
  { id: 'marks', name: 'Cool Head', desc: 'Defeat a Marksman with the Pulse Rifle without overheating.', arena: 'sim', weapon: 'rifle', waves: [[E('tactical', 'rifle')]], goal: { id: 'nooverheat' }, reward: { credits: 500, shards: 20 } },
  { id: 'momentum', name: 'Momentum Master', desc: 'Land 2 Weapon Finishers against four enemies.', arena: 'colosseum', waves: [[E('aggressive', 'katana'), E('mobile', 'daggers')], [E('defensive', 'spear'), E('aggressive', 'gauntlets')]], goal: { id: 'finishers', v: 2 }, reward: { credits: 700, shards: 30 } },
];

/* ---------- progression ---------- */
SP.xpToNext = (L) => Math.round(140 + 90 * (L - 1) + 14 * (L - 1) * (L - 1));
SP.MASTERY_LEVELS = [0, 200, 550, 1100, 1900];
SP.MASTERY_PERKS = [
  'Base kit',
  'Prism energy variant for this weapon (cosmetic)',
  'Momentum Extension costs 15 instead of 25; counters +10% damage',
  'Weapon skill cooldown -20%',
  'Weapon Finisher +30% damage; Gold energy variant',
];
SP.LEVEL_UNLOCKS = {
  2: ['Energy Barrier module available', 'Energy Spear available in the Armory'],
  3: ['Magnetic Pulse module available', 'Photon Daggers available', 'Better drop chances'],
  4: ['Pulse Rifle available'],
  5: ['Gravity Hammer available', 'Holographic Decoy module available'],
  6: ['Epic drops can appear in Sector 1'],
  7: ['Overdrive module available'],
  8: ['Legendary drops can appear'],
};
SP.SHOP_WEAPONS = {
  katana: { level: 1, cost: 300 }, gauntlets: { level: 1, cost: 300 }, spear: { level: 2, cost: 500 },
  daggers: { level: 3, cost: 650 }, rifle: { level: 4, cost: 800 }, hammer: { level: 5, cost: 900 },
};
SP.CACHE_COST = 650;
