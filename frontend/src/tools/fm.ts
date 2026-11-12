/**
 * An FM electric piano in the style of the 1983 FM synthesizers' famous "E.Piano" (frequency modulation, as on the
 * Yamaha DX7; our own sound, no samples): two operator pairs. The body: a sine carrier modulated at the same
 * frequency, whose modulation fades so the tone mellows; the tine: a carrier modulated at 14 times the frequency for
 * a short bright "ding". Brightness follows how hard the key is played, and is tamed higher up the keyboard.
 */

/** the FM piano's place in the sound lists (past General MIDI's 0–127) */
export const FM_PIANO = 1000;

export interface FmParams {
  /** modulation depth (Hz) at the start and where it settles, and how fast it settles (s) */
  bodyIndex: [number, number, number];
  tineIndex: [number, number];
  /** loudness of the two pairs, and how long each rings (s, the decay's time constant) */
  bodyLevel: number;
  tineLevel: number;
  bodyRing: number;
  tineRing: number;
  /** cents between the two body carriers (a gentle chorus) */
  detune: number;
}

/** the settings for a note: brighter when played harder, less bright higher up (as the keyboard scaling of FM pianos) */
export function fmParams(hz: number, velocity: number): FmParams {
  const v = Math.max(0.05, Math.min(1, velocity));
  const scale = Math.max(0.35, Math.min(1.6, 330 / hz));
  return {
    bodyIndex: [hz * (0.6 + 1.6 * v) * scale, hz * 0.25 * scale, 0.45],
    tineIndex: [hz * 14 * (0.15 + 0.6 * v) * scale, 0.05],
    bodyLevel: 0.16 * (0.4 + 0.6 * v),
    tineLevel: 0.07 * v * Math.min(1, scale + 0.2),
    bodyRing: 1.4 * Math.max(0.5, Math.min(1.8, 300 / hz)),
    tineRing: 0.25,
    detune: 3,
  };
}

/** play one FM piano note on `dest`; call the result to release it */
export function fmPianoVoice(ac: AudioContext, dest: AudioNode, hz: number, velocity: number): () => void {
  const p = fmParams(hz, velocity);
  const now = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = 1;
  out.connect(dest);
  const oscs: OscillatorNode[] = [];
  const osc = (freq: number, cents = 0) => {
    const o = ac.createOscillator();
    o.frequency.value = freq;
    o.detune.value = cents;
    oscs.push(o);
    return o;
  };
  // one operator pair: a modulator's output (scaled by an envelope, in Hz) drives the carrier's frequency
  const pair = (ratio: number, index: [number, number, number?], level: number, ring: number, cents: number) => {
    const mod = osc(hz * ratio);
    const depth = ac.createGain();
    depth.gain.setValueAtTime(index[0], now);
    depth.gain.setTargetAtTime(index[1], now + 0.002, index[2] ?? 0.05);
    mod.connect(depth);
    const car = osc(hz, cents);
    depth.connect(car.frequency);
    const amp = ac.createGain();
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(level, now + 0.003);
    amp.gain.setTargetAtTime(0, now + 0.004, ring);
    car.connect(amp).connect(out);
  };
  pair(1, p.bodyIndex, p.bodyLevel, p.bodyRing, -p.detune / 2);
  pair(1, [p.bodyIndex[0] * 0.8, p.bodyIndex[1], p.bodyIndex[2]], p.bodyLevel * 0.6, p.bodyRing, p.detune / 2);
  pair(14, [p.tineIndex[0], 0, p.tineIndex[1]], p.tineLevel, p.tineRing, 0);
  oscs.forEach((o) => o.start(now));
  const end = now + p.bodyRing * 6;
  oscs.forEach((o) => o.stop(end));
  return () => {
    const t = ac.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.setTargetAtTime(0, t, 0.08);
    oscs.forEach((o) => {
      try {
        o.stop(t + 0.6);
      } catch {
        /* already stopped */
      }
    });
  };
}
