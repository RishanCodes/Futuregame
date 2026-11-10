/* SHATTERPOINT — procedural sound effects (Web Audio, no external files) */
'use strict';
(function () {
  const A = {
    ctx: null, master: null, sfx: null, noise: null, last: {}, ready: false,

    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { return; }
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.sfx.connect(this.master); this.master.connect(comp); comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.0;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.ready = true;
      this.applySettings();
    },

    applySettings() {
      if (!this.ready) return;
      const s = SP.Save.data.settings;
      this.master.gain.value = s.muted ? 0 : s.master;
      this.sfx.gain.value = s.sfx;
    },

    env(g, t, a, peak, d) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    },
    osc(type, f0, f1, dur, vol, t, dest) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      this.env(g, t, 0.005, vol, dur);
      o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.05);
    },
    nz(filterType, f0, f1, q, dur, vol, t, attack = 0.005) {
      const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      s.buffer = this.noise; f.type = filterType; f.Q.value = q;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
      this.env(g, t, attack, vol, dur);
      s.connect(f); f.connect(g); g.connect(this.sfx);
      s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
    },

    play(name, p = 1) {
      if (!this.ready || SP.Save.data.settings.muted) return;
      const now = this.ctx.currentTime;
      if (this.last[name] && now - this.last[name] < 0.03) return;
      this.last[name] = now;
      const t = now + 0.005;
      const r = 0.92 + Math.random() * 0.16;
      switch (name) {
        case 'swing': this.nz('bandpass', 900 * r, 3200 * r, 1.4, 0.16, 0.25 * p, t, 0.02); break;
        case 'swingHeavy': this.nz('bandpass', 400 * r, 1600 * r, 1.2, 0.3, 0.35 * p, t, 0.05); break;
        case 'hit':
          this.osc('triangle', 180 * r, 60, 0.12, 0.55 * p, t);
          this.nz('lowpass', 3000, 400, 0.8, 0.1, 0.4 * p, t); break;
        case 'hitHeavy':
          this.osc('sine', 120 * r, 35, 0.3, 0.8 * p, t);
          this.nz('lowpass', 2400, 200, 0.7, 0.28, 0.6 * p, t);
          this.osc('square', 70, 40, 0.15, 0.15 * p, t); break;
        case 'block':
          this.osc('square', 820 * r, 600, 0.08, 0.15 * p, t);
          this.osc('triangle', 1640 * r, 1200, 0.18, 0.18 * p, t);
          this.nz('highpass', 3000, 2000, 1, 0.06, 0.2 * p, t); break;
        case 'parry':
          this.osc('sine', 1760, 1760, 0.5, 0.35, t);
          this.osc('sine', 2637, 2637, 0.4, 0.2, t + 0.01);
          this.osc('triangle', 880, 1320, 0.15, 0.25, t);
          this.nz('highpass', 5000, 3000, 1, 0.12, 0.25, t); break;
        case 'guardBreak':
          this.osc('sawtooth', 300, 60, 0.4, 0.3, t);
          this.nz('bandpass', 2000, 300, 1, 0.4, 0.4, t); break;
        case 'dodge': this.nz('bandpass', 600, 2400, 2, 0.18, 0.2, t, 0.03); break;
        case 'perfect':
          this.osc('sine', 520, 1560, 0.25, 0.25, t);
          this.nz('bandpass', 2000, 6000, 3, 0.25, 0.15, t, 0.04); break;
        case 'jump': this.osc('sine', 220, 440, 0.12, 0.12, t); break;
        case 'land': this.nz('lowpass', 600, 100, 0.7, 0.12, 0.25 * p, t); break;
        case 'shot':
          this.osc('sawtooth', 1400 * r, 220, 0.12, 0.18, t);
          this.osc('sine', 700 * r, 120, 0.1, 0.2, t); break;
        case 'beam':
          this.osc('sawtooth', 220, 80, 0.5, 0.3, t);
          this.osc('square', 880, 110, 0.35, 0.12, t);
          this.nz('bandpass', 4000, 500, 2, 0.4, 0.3, t); break;
        case 'charge': this.osc('sine', 200, 900, 0.5, 0.12, t); break;
        case 'explosion':
          this.osc('sine', 90, 30, 0.6, 0.8, t);
          this.nz('lowpass', 1800, 80, 0.6, 0.7, 0.8, t); break;
        case 'quake':
          this.osc('sine', 70, 28, 0.5, 0.9, t);
          this.nz('lowpass', 900, 60, 0.6, 0.5, 0.7, t); break;
        case 'blink':
          this.osc('sine', 1200, 300, 0.18, 0.2, t);
          this.nz('bandpass', 5000, 1500, 4, 0.15, 0.18, t); break;
        case 'ability':
          this.osc('triangle', 440, 880, 0.15, 0.2, t);
          this.osc('sine', 660, 1320, 0.25, 0.12, t + 0.05); break;
        case 'heal': [523, 659, 784].forEach((f, i) => this.osc('sine', f, f, 0.3, 0.14, t + i * 0.07)); break;
        case 'overheat': this.nz('highpass', 3000, 8000, 1, 0.6, 0.3, t, 0.02); this.osc('square', 240, 120, 0.3, 0.12, t); break;
        case 'finisher':
          this.osc('sawtooth', 110, 440, 0.4, 0.2, t);
          this.osc('sine', 880, 1760, 0.5, 0.2, t + 0.1); break;
        case 'momentum': this.osc('sine', 660, 990, 0.12, 0.12, t); this.osc('sine', 990, 1320, 0.12, 0.1, t + 0.08); break;
        case 'warn': this.osc('square', 330, 330, 0.12, 0.08, t); this.osc('square', 330, 330, 0.12, 0.08, t + 0.16); break;
        case 'ui': this.osc('sine', 880, 1100, 0.06, 0.12, t); break;
        case 'uiBack': this.osc('sine', 660, 440, 0.07, 0.12, t); break;
        case 'buy': [784, 1047, 1319].forEach((f, i) => this.osc('triangle', f, f, 0.12, 0.12, t + i * 0.05)); break;
        case 'error': this.osc('square', 180, 140, 0.15, 0.1, t); break;
        case 'death': this.osc('sawtooth', 300, 40, 0.8, 0.25, t); this.nz('lowpass', 3000, 100, 0.6, 0.7, 0.35, t); break;
        case 'victory': [523, 659, 784, 1047, 1319].forEach((f, i) => this.osc('triangle', f, f, 0.35, 0.16, t + i * 0.1)); break;
        case 'defeat': [440, 392, 330, 262].forEach((f, i) => this.osc('triangle', f, f * 0.98, 0.45, 0.16, t + i * 0.16)); break;
        case 'reward': [1047, 1568, 2093].forEach((f, i) => this.osc('sine', f, f, 0.25, 0.1, t + i * 0.06)); break;
        case 'levelup': [523, 659, 784, 1047, 784, 1047, 1568].forEach((f, i) => this.osc('triangle', f, f, 0.25, 0.14, t + i * 0.08)); break;
        case 'bossWarn': this.osc('sawtooth', 80, 80, 0.8, 0.25, t); this.osc('sawtooth', 82, 82, 0.8, 0.2, t); break;
        default: break;
      }
    },
  };
  SP.Audio = A;
})();
