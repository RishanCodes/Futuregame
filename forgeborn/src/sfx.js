// Tiny synthesized sound effects (WebAudio). Starts only after a user gesture.
let ctx = null; let enabled = true;
export function setSound(on) { enabled = on; }
function ac() {
  if (!enabled) return null;
  try {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (e) { return null; }
}
function tone(freq, dur, type = 'sine', vol = 0.12, slide = 0, delay = 0) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.1, hp = 800) {
  const a = ac(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur); const buf = a.createBuffer(1, n, a.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource(); src.buffer = buf; const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = a.createGain(); g.gain.value = vol; src.connect(f); f.connect(g); g.connect(a.destination); src.start();
}
export const sfx = {
  perfect() { tone(880, 0.12, 'triangle', 0.12); tone(1320, 0.18, 'triangle', 0.09, 0, 0.06); },
  good() { tone(660, 0.12, 'triangle', 0.1); },
  poor() { tone(330, 0.12, 'square', 0.05); },
  miss() { tone(180, 0.2, 'sawtooth', 0.06, -80); },
  clang() { tone(520, 0.25, 'square', 0.05, -200); noise(0.08, 0.08, 2000); },
  strike() { noise(0.06, 0.12, 1200); tone(220, 0.1, 'square', 0.05, -100); },
  steam() { noise(0.35, 0.06, 3000); },
  rune() { tone(740, 0.1, 'sine', 0.08, 200); },
  bad() { tone(140, 0.18, 'sawtooth', 0.06); },
  coin() { tone(988, 0.07, 'square', 0.04); tone(1319, 0.1, 'square', 0.04, 0, 0.06); },
  reveal() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, 0, i * 0.09)); },
  hit() { noise(0.05, 0.1, 600); tone(160, 0.08, 'square', 0.05); },
  rock() { noise(0.07, 0.14, 400); tone(110, 0.08, 'triangle', 0.08); },
  pick() { tone(1200, 0.05, 'sine', 0.06); },
  level() { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.22, 'triangle', 0.08, 0, i * 0.07)); },
};
