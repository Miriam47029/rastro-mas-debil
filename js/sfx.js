// Efectos de sonido sintetizados con Web Audio (sin archivos externos).
// Los navegadores exigen un gesto del usuario: llama sfx.unlock() en un clic.
let ctx;
const ac = () => (ctx ??= new (window.AudioContext || window.webkitAudioContext)());

function tone(freq, start, dur, { type = "sine", vol = 0.25, slideTo } = {}) {
  const c = ac();
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const sfx = {
  unlock() {
    const c = ac();
    if (c.state === "suspended") c.resume();
    tone(1, 0, 0.01, { vol: 0.0002 });
  },
  /** Alguien pidió la palabra: timbre llamativo de concurso. */
  buzz() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.16, { type: "square", vol: 0.16 }));
    tone(1047, 0.3, 0.45, { type: "triangle", vol: 0.22 });
  },
  correct() {
    tone(880, 0, 0.35, { type: "sine", vol: 0.3 });
    tone(1319, 0.12, 0.6, { type: "sine", vol: 0.28 });
    tone(1760, 0.24, 0.7, { type: "triangle", vol: 0.12 });
  },
  wrong() {
    tone(150, 0, 0.55, { type: "sawtooth", vol: 0.2 });
    tone(155, 0, 0.55, { type: "sawtooth", vol: 0.2 });
  },
  join() {
    tone(660, 0, 0.12, { type: "sine", vol: 0.12, slideTo: 990 });
  },
  open() {
    tone(392, 0, 0.12, { type: "triangle", vol: 0.18 });
    tone(587, 0.1, 0.22, { type: "triangle", vol: 0.18 });
  },
  tick() {
    tone(1200, 0, 0.05, { type: "square", vol: 0.05 });
  },
  fanfare() {
    const n = [523, 659, 784, 1047, 784, 1047];
    const d = [0, 0.15, 0.3, 0.45, 0.75, 0.9];
    n.forEach((f, i) => tone(f, d[i], i > 3 ? 0.9 : 0.2, { type: "triangle", vol: 0.25 }));
    [262, 330, 392].forEach((f) => tone(f, 0.9, 1.2, { type: "sine", vol: 0.12 }));
  },
};

export const vibrate = (p) => navigator.vibrate?.(p);
