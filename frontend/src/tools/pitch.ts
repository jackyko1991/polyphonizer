/**
 * Pitch detection for the tuner (and later for playing into the score): the YIN method (de Cheveigné & Kawahara,
 * 2002) on one window of samples. One note at a time: a violin string, a flute note, a voice.
 */

export interface Pitch {
  hz: number;
  /** 0–1: how periodic the window is (1 = a pure tone) */
  clarity: number;
}

export function rms(buf: Float32Array): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

/**
 * The fundamental frequency of `buf`, or null when it is too quiet or not periodic enough. `threshold` is YIN's
 * absolute threshold on the normalised difference function.
 */
export function detectPitch(
  buf: Float32Array,
  sampleRate: number,
  { minHz = 40, maxHz = 2500, threshold = 0.15, gate = 0.01 } = {},
): Pitch | null {
  if (rms(buf) < gate) return null;
  const half = Math.floor(buf.length / 2);
  const maxTau = Math.min(half - 1, Math.floor(sampleRate / minHz));
  const minTau = Math.max(2, Math.floor(sampleRate / maxHz));
  if (maxTau <= minTau) return null;
  // difference function, then its cumulative mean normalised form
  const d = new Float32Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < half; i++) {
      const diff = buf[i] - buf[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }
  const cmnd = new Float32Array(maxTau + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau];
    cmnd[tau] = running ? (d[tau] * tau) / running : 1;
  }
  // the first dip under the threshold (then down to its lowest point), else the lowest value if it is good enough
  let tau = -1;
  for (let t = minTau; t <= maxTau; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 <= maxTau && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) {
    let best = minTau;
    for (let t = minTau; t <= maxTau; t++) if (cmnd[t] < cmnd[best]) best = t;
    if (cmnd[best] > 0.35) return null;
    tau = best;
  }
  // parabolic interpolation around the dip
  let better = tau;
  if (tau > 1 && tau < maxTau) {
    const a = cmnd[tau - 1];
    const b = cmnd[tau];
    const c = cmnd[tau + 1];
    const denom = a + c - 2 * b;
    if (denom !== 0) better = tau + (a - c) / (2 * denom);
  }
  return { hz: sampleRate / better, clarity: Math.max(0, Math.min(1, 1 - cmnd[tau])) };
}
