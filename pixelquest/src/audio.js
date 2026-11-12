/* PIXEL QUEST — Web Audio: synthesized sound effects and procedural chiptune music */
'use strict';
(function () {
  const A = { ctx: null, ready: false, last: {}, mood: null, step: 0, nextT: 0, timer: null };
  PQ.Audio = A;
  const S = () => PQ.Settings;

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { A.ctx = new AC(); } catch (e) { return; }
    const c = A.ctx;
    A.master = c.createGain(); A.sfx = c.createGain(); A.mus = c.createGain();
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    A.sfx.connect(A.master); A.mus.connect(A.master); A.master.connect(comp); comp.connect(c.destination);
    const len = c.sampleRate;
    A.noise = c.createBuffer(1, len, c.sampleRate);
    const d = A.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.ready = true;
    A.apply();
    A.timer = setInterval(A.schedule, 90);
    if (A.pending) { const m = A.pending; A.pending = null; A.music(m); }
  };
  A.apply = function () {
    if (!A.ready) return;
    const s = S();
    A.master.gain.value = s.mute ? 0 : 1;
    A.sfx.gain.value = s.sfx;
    A.mus.gain.value = s.music * 0.55;
  };
  A.suspend = (on) => { if (!A.ctx) return; if (on) A.ctx.suspend().catch(() => {}); else A.ctx.resume().catch(() => {}); };

  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function osc(type, f0, f1, dur, vol, t, dest, a = 0.005) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, a, vol, dur); o.connect(g); g.connect(dest || A.sfx); o.start(t); o.stop(t + a + dur + 0.05);
  }
  function nz(type, f0, f1, q, dur, vol, t, dest, a = 0.004) {
    const s = A.ctx.createBufferSource(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
    s.buffer = A.noise; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    env(g, t, a, vol, dur); s.connect(f); f.connect(g); g.connect(dest || A.sfx); s.start(t, Math.random() * 0.5); s.stop(t + a + dur + 0.05);
  }
  const arp = (notes, t, step, type = 'square', vol = 0.1, dur = 0.12) => notes.forEach((f, i) => osc(type, f, f, dur, vol, t + i * step));

  A.play = function (name, p = 1) {
    if (!A.ready || S().mute) return;
    const now = A.ctx.currentTime;
    if (A.last[name] && now - A.last[name] < 0.035) return;
    A.last[name] = now;
    const t = now + 0.005, r = 0.93 + Math.random() * 0.14;
    switch (name) {
      case 'swing': nz('bandpass', 1200 * r, 3800, 1.6, 0.11, 0.22 * p, t, null, 0.02); break;
      case 'swingHeavy': nz('bandpass', 500 * r, 1800, 1.2, 0.22, 0.3 * p, t, null, 0.04); break;
      case 'heavy': nz('bandpass', 400, 2600, 1, 0.3, 0.35, t, null, 0.05); osc('sawtooth', 120, 60, 0.25, 0.12, t); break;
      case 'swish': nz('bandpass', 900, 2400, 2, 0.15, 0.2 * p, t, null, 0.03); break;
      case 'hit': osc('square', 220 * r, 70, 0.08, 0.22 * p, t); nz('lowpass', 2800, 400, 0.8, 0.07, 0.25 * p, t); break;
      case 'crit': osc('square', 440 * r, 110, 0.12, 0.25, t); osc('triangle', 880, 1320, 0.1, 0.15, t); nz('highpass', 3000, 1500, 1, 0.1, 0.3, t); break;
      case 'clank': osc('square', 900 * r, 700, 0.05, 0.12, t); osc('triangle', 1800, 1500, 0.15, 0.12, t); break;
      case 'hurt': osc('square', 300, 120, 0.18, 0.22, t); nz('lowpass', 1500, 200, 0.7, 0.12, 0.2, t); break;
      case 'die': osc('square', 400 * r, 60, 0.25, 0.18 * p, t); nz('lowpass', 2000, 100, 0.6, 0.25, 0.2 * p, t); break;
      case 'bossdie': [523, 392, 330, 262, 196].forEach((f, i) => osc('square', f, f * 0.98, 0.25, 0.14, t + i * 0.12)); nz('lowpass', 1500, 60, 0.6, 1.2, 0.4, t); break;
      case 'death': [392, 349, 311, 262].forEach((f, i) => osc('triangle', f, f, 0.35, 0.16, t + i * 0.22)); break;
      case 'windup': osc('triangle', 300, 600, 0.18, 0.06 * p, t); break;
      case 'charge': osc('sawtooth', 120, 260, 0.3, 0.09 * p, t); break;
      case 'charged': osc('square', 880, 1320, 0.06, 0.08, t); osc('square', 1320, 1760, 0.08, 0.08, t + 0.06); break;
      case 'thud': osc('sine', 110, 40, 0.3, 0.5, t); nz('lowpass', 800, 60, 0.6, 0.25, 0.35, t); break;
      case 'ambush': nz('bandpass', 300, 900, 1, 0.3, 0.3, t); osc('square', 140, 90, 0.2, 0.12, t); break;
      case 'magic': osc('sine', 660 * r, 1320, 0.15, 0.13, t); osc('triangle', 990, 1980, 0.12, 0.06, t + 0.03); break;
      case 'magicBig': osc('sawtooth', 220, 880, 0.35, 0.12, t); osc('sine', 440, 1760, 0.4, 0.12, t); break;
      case 'zap': nz('highpass', 3000, 6000, 2, 0.12, 0.2, t); osc('square', 1800, 600, 0.08, 0.06, t); break;
      case 'puff': nz('lowpass', 800, 200, 0.5, 0.35, 0.18, t, null, 0.05); break;
      case 'shoot': osc('square', 700 * r, 300, 0.08, 0.08 * p, t); break;
      case 'bow': nz('bandpass', 1800, 900, 3, 0.1, 0.2, t); osc('triangle', 220, 180, 0.08, 0.1, t); break;
      case 'throw': nz('bandpass', 600, 1200, 1, 0.12, 0.15, t); break;
      case 'explode': osc('sine', 90, 30, 0.6, 0.6, t); nz('lowpass', 2000, 60, 0.6, 0.6, 0.6, t); break;
      case 'roll': nz('bandpass', 500, 1500, 1.5, 0.16, 0.15, t, null, 0.03); break;
      case 'jump': osc('square', 300, 600, 0.12, 0.1, t); break;
      case 'land': nz('lowpass', 700, 120, 0.7, 0.1, 0.2, t); break;
      case 'coin': osc('square', 988, 988, 0.05, 0.08, t); osc('square', 1319, 1319, 0.12, 0.08, t + 0.05); break;
      case 'pickup': osc('square', 660 * r, 990, 0.06, 0.08, t); break;
      case 'rare': arp([784, 988, 1175, 1568], t, 0.06, 'square', 0.08, 0.14); break;
      case 'chest': arp([523, 659, 784, 1047], t, 0.07, 'square', 0.09, 0.14); break;
      case 'key': arp([1047, 1319, 1568, 2093], t, 0.06, 'triangle', 0.12, 0.18); break;
      case 'door': osc('sawtooth', 110, 70, 0.4, 0.12, t); nz('lowpass', 600, 100, 0.6, 0.4, 0.15, t); break;
      case 'switch': osc('square', 440, 880, 0.08, 0.1, t); osc('square', 880, 440, 0.08, 0.08, t + 0.08); break;
      case 'click': osc('square', 1200, 900, 0.04, 0.08, t); break;
      case 'secret': arp([659, 622, 494, 440, 415, 659, 831, 1047], t, 0.09, 'square', 0.07, 0.14); break;
      case 'drink': [0, 0.08, 0.16].forEach((d) => nz('bandpass', 700, 300, 4, 0.06, 0.12, t + d)); break;
      case 'eat': [0, 0.1, 0.2].forEach((d) => nz('lowpass', 1500, 400, 1, 0.06, 0.12, t + d)); break;
      case 'levelup': arp([523, 659, 784, 1047, 784, 1047, 1319], t, 0.08, 'square', 0.1, 0.18); break;
      case 'quest': arp([659, 784, 1047], t, 0.08, 'triangle', 0.14, 0.2); break;
      case 'questdone': arp([523, 659, 784, 1047, 1319, 1568], t, 0.07, 'square', 0.09, 0.2); break;
      case 'craft': osc('square', 440, 440, 0.04, 0.08, t); osc('square', 660, 660, 0.04, 0.08, t + 0.08); osc('triangle', 880, 1320, 0.15, 0.1, t + 0.16); break;
      case 'learn': arp([440, 554, 659, 880], t, 0.06, 'triangle', 0.14, 0.2); break;
      case 'cast': nz('bandpass', 400, 1600, 1, 0.3, 0.15, t, null, 0.05); break;
      case 'bite': nz('bandpass', 800, 400, 2, 0.15, 0.3, t); osc('sine', 300, 200, 0.1, 0.15, t); break;
      case 'catch': arp([784, 1047, 1319, 1568], t, 0.07, 'square', 0.1, 0.2); break;
      case 'fail': osc('square', 200, 150, 0.15, 0.1, t); osc('square', 150, 110, 0.2, 0.1, t + 0.15); break;
      case 'bond': arp([659, 831, 988, 1319, 1661], t, 0.08, 'triangle', 0.14, 0.25); break;
      case 'discover': arp([880, 1109, 1319], t, 0.09, 'sine', 0.14, 0.3); break;
      case 'waystone': osc('sine', 330, 660, 0.6, 0.16, t, null, 0.1); osc('sine', 495, 990, 0.6, 0.1, t + 0.05, null, 0.1); break;
      case 'roar': osc('sawtooth', 90, 50, 0.9, 0.25, t, null, 0.1); nz('lowpass', 900, 200, 0.7, 0.9, 0.3, t, null, 0.1); break;
      case 'blink': osc('sine', 1600, 300, 0.2, 0.12, t); break;
      case 'breath': nz('bandpass', 2000, 600, 0.8, 1.2, 0.25, t, null, 0.2); break;
      case 'shatter': nz('highpass', 4000, 2000, 1, 0.2, 0.25, t); osc('triangle', 2000, 1200, 0.15, 0.08, t); break;
      case 'fire': nz('bandpass', 600, 1200, 0.8, 0.5, 0.18, t, null, 0.1); break;
      case 'whip': nz('bandpass', 1500, 3000, 2, 0.12, 0.2, t); break;
      case 'wind': nz('bandpass', 400, 900, 0.7, 1.5, 0.2, t, null, 0.4); break;
      case 'thunder': nz('lowpass', 900, 50, 0.5, 2.2, 0.6, t, null, 0.02); break;
      case 'chop': nz('bandpass', 1400 * r, 600, 2, 0.08, 0.3, t); osc('square', 180, 120, 0.05, 0.1, t); break;
      case 'mine': osc('square', 1400 * r, 1100, 0.04, 0.12, t); osc('triangle', 2400 * r, 1800, 0.1, 0.1, t); nz('highpass', 3000, 2000, 1, 0.05, 0.2, t); break;
      case 'rustle': nz('highpass', 2000, 4000, 0.6, 0.12, 0.15, t, null, 0.02); break;
      case 'harvest': arp([523, 784], t, 0.07, 'square', 0.09, 0.12); break;
      case 'water': nz('bandpass', 1200, 500, 2, 0.3, 0.18, t, null, 0.05); break;
      case 'till': nz('lowpass', 900, 300, 0.7, 0.12, 0.25, t); break;
      case 'plant': osc('triangle', 600, 900, 0.08, 0.1, t); break;
      case 'ui': osc('square', 880, 880, 0.03, 0.05, t); break;
      case 'uiBack': osc('square', 660, 440, 0.04, 0.05, t); break;
      case 'buy': arp([988, 1319], t, 0.06, 'square', 0.08, 0.1); break;
      case 'sell': arp([1319, 988], t, 0.06, 'square', 0.08, 0.1); break;
      default: break;
    }
  };

  /* ---------------- procedural music ---------------- */
  const MOODS = {
    title: { bpm: 84, root: 220, scale: [0, 2, 4, 7, 9], prog: [0, 3, 4, 2], lead: 'triangle', drums: 0, pad: 1 },
    meadow: { bpm: 104, root: 262, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 3, 4, 0], lead: 'square', drums: 1, pad: 1 },
    forest: { bpm: 88, root: 220, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 3, 4], lead: 'triangle', drums: 0, pad: 1 },
    desert: { bpm: 96, root: 233, scale: [0, 1, 4, 5, 7, 8, 10], prog: [0, 1, 0, 6], lead: 'square', drums: 2, pad: 0 },
    snow: { bpm: 76, root: 294, scale: [0, 2, 4, 7, 9], prog: [0, 2, 3, 1], lead: 'sine', drums: 0, pad: 1 },
    fire: { bpm: 118, root: 165, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 5, 6, 4], lead: 'sawtooth', drums: 2, pad: 0 },
    shadow: { bpm: 72, root: 147, scale: [0, 1, 3, 6, 7, 8, 11], prog: [0, 1, 5, 4], lead: 'triangle', drums: 0, pad: 1 },
    dungeon: { bpm: 80, root: 175, scale: [0, 2, 3, 5, 7, 8, 11], prog: [0, 3, 5, 4], lead: 'triangle', drums: 1, pad: 1 },
    boss: { bpm: 140, root: 147, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 5, 6, 4], lead: 'square', drums: 3, pad: 0 },
    home: { bpm: 70, root: 262, scale: [0, 2, 4, 7, 9], prog: [0, 4, 3, 4], lead: 'sine', drums: 0, pad: 1 },
  };
  const f = (root, semis) => root * Math.pow(2, semis / 12);
  A.music = function (mood) {
    if (!A.ready) { A.pending = mood; return; }
    if (A.mood === mood) return;
    A.mood = mood; A.step = 0; A.nextT = A.ctx.currentTime + 0.2;
    A.seed = PQ.RNG(mood.length * 977 + mood.charCodeAt(0));
    const M = MOODS[mood] || MOODS.meadow;
    // melody motif per mood (16 steps x 4 bars)
    A.motif = [];
    let deg = 4;
    for (let i = 0; i < 64; i++) { if (A.seed() < 0.55) { deg += A.seed.int(-2, 2); deg = PQ.U.clamp(deg, 0, M.scale.length * 2 - 1); A.motif.push(deg); } else A.motif.push(null); }
  };
  A.schedule = function () {
    if (!A.ready || !A.mood || S().music <= 0 || S().mute) return;
    const c = A.ctx, M = MOODS[A.mood] || MOODS.meadow;
    const stepDur = 60 / M.bpm / 4;
    while (A.nextT < c.currentTime + 0.35) {
      const t = A.nextT, i = A.step % 64, bar = Math.floor(i / 16), s16 = i % 16;
      const chordDeg = M.prog[bar % M.prog.length];
      const sc = (d) => M.scale[d % M.scale.length] + 12 * Math.floor(d / M.scale.length);
      // bass
      if (s16 % 4 === 0) osc('triangle', f(M.root / 2, sc(chordDeg)), f(M.root / 2, sc(chordDeg)), stepDur * 3, 0.18, t, A.mus);
      if (M.drums >= 2 && s16 % 4 === 2) osc('triangle', f(M.root / 2, sc(chordDeg + 4)), f(M.root / 2, sc(chordDeg + 4)), stepDur * 1.5, 0.1, t, A.mus);
      // pad chord
      if (M.pad && s16 === 0) for (const k of [0, 2, 4]) osc('sine', f(M.root, sc(chordDeg + k)), f(M.root, sc(chordDeg + k)), stepDur * 15, 0.035, t, A.mus, stepDur * 4);
      // arpeggio
      if (s16 % 2 === 0) { const k = [0, 2, 4, 2, 0, 4, 2, 4][(s16 / 2) % 8]; osc(M.lead === 'sawtooth' ? 'square' : 'square', f(M.root * 2, sc(chordDeg + k)), f(M.root * 2, sc(chordDeg + k)), stepDur * 0.9, 0.025, t, A.mus); }
      // melody
      const md = A.motif[i];
      if (md != null && (A.step >> 6) % 2 === 0) osc(M.lead, f(M.root * 2, sc(md)), f(M.root * 2, sc(md)), stepDur * 1.8, M.lead === 'sine' ? 0.07 : 0.045, t, A.mus);
      if (md != null && (A.step >> 6) % 2 === 1 && s16 % 4 === 0) osc(M.lead, f(M.root * 2, sc(md + 2)), f(M.root * 2, sc(md + 2)), stepDur * 3, 0.035, t, A.mus);
      // drums
      if (M.drums) {
        if (s16 % 8 === 0) osc('sine', 120, 45, 0.12, 0.2, t, A.mus);
        if (M.drums >= 2 && s16 % 8 === 4) nz('bandpass', 1800, 900, 0.8, 0.08, 0.1, t, A.mus);
        if (s16 % 2 === 0) nz('highpass', 7000, 6000, 1, 0.03, M.drums >= 3 ? 0.05 : 0.025, t, A.mus);
        if (M.drums >= 3 && s16 % 4 === 2) osc('sine', 100, 40, 0.1, 0.16, t, A.mus);
      }
      A.nextT += stepDur; A.step++;
    }
  };
})();
