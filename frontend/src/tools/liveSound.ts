/**
 * Sound for the toolbox: notes that start on a key press and stop on release (the virtual keyboard), held reference
 * tones (the tuner) and metronome clicks. Same AudioContext and sample sets as playback (engine/player.ts), but its
 * own output, so it sounds whether or not the score is playing. Samples (General MIDI soundfonts, cached in the
 * browser) when the sound settings say so and they load; otherwise a small synth that needs no download.
 */
import { audio, family, type Family } from "../engine/player.ts";
import { GM, soundSettings } from "../engine/sound.ts";
import { midiToHz } from "./music.ts";

type Stop = (time?: number) => void;
type Sampler = { start(e: { note: number; velocity?: number; detune?: number; time?: number }): Stop };

let out: GainNode | null = null;
/** the toolbox's own output (volume 0–1.5) */
function output(): { ac: AudioContext; out: GainNode } {
  const { ac } = audio();
  if (!out) {
    out = ac.createGain();
    out.gain.value = 0.9;
    out.connect(ac.destination);
  }
  void ac.resume();
  return { ac, out };
}
export function setToolVolume(v: number) {
  output().out.gain.value = v;
}

const samplers = new Map<number, Promise<Sampler | null>>();
/** load the samples of a General MIDI program once (null: unavailable, the synth plays instead) */
export function loadInstrument(program: number): Promise<Sampler | null> {
  const s = soundSettings();
  if (s.engine !== "samples") return Promise.resolve(null);
  let p = samplers.get(program);
  if (!p) {
    const { ac, out: dest } = output();
    p = import("smplr")
      .then(async ({ Soundfont, CacheStorage }) => {
        const inst = Soundfont(ac, {
          instrument: GM[program],
          kit: s.kit,
          destination: dest,
          storage: CacheStorage("polyphonizer-sounds"),
        });
        await inst.load;
        return inst as unknown as Sampler;
      })
      .catch(() => {
        samplers.delete(program);
        return null;
      });
    samplers.set(program, p);
  }
  return p;
}
const loaded = new Map<number, Sampler | null>();
/** start loading an instrument now, so its first note already sounds sampled */
export function prepare(program: number): Promise<boolean> {
  return loadInstrument(program).then((i) => (loaded.set(program, i), i !== null));
}

/** start a note now; call the result to release it */
export function noteOn(midi: number, program: number, velocity = 0.8): () => void {
  const { ac, out: dest } = output();
  const a4 = soundSettings().a4;
  const inst = loaded.get(program);
  if (inst === undefined)
    void loadInstrument(program).then((i) => {
      loaded.set(program, i);
    });
  if (inst) {
    const stop = inst.start({ note: midi, velocity: Math.round(velocity * 127), detune: 1200 * Math.log2(a4 / 440) });
    return () => stop();
  }
  return synthVoice(ac, dest, family(program), midiToHz(midi, a4), velocity);
}

/** a held synth note: attack, sustain while held, release on stop */
function synthVoice(ac: AudioContext, dest: AudioNode, f: Family | "sine", hz: number, velocity: number): () => void {
  const now = ac.currentTime;
  const g = ac.createGain();
  g.connect(dest);
  const peak = 0.22 * velocity;
  const decays = f === "plucked" || f === "struck";
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(peak, now + (decays ? 0.005 : f === "sine" ? 0.03 : 0.04));
  if (decays) g.gain.setTargetAtTime(peak * 0.15, now + 0.01, 0.6);
  else g.gain.setTargetAtTime(peak * 0.8, now + 0.05, 0.2);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = f === "sine" ? 8000 : f === "brass" || f === "reed" ? 1800 : 3200;
  lp.connect(g);
  const waves: [OscillatorType, number, number][] =
    f === "sine"
      ? [["sine", 0, 1]]
      : f === "bowed"
        ? [
            ["sawtooth", 0, 0.5],
            ["sawtooth", 6, 0.35],
          ]
        : f === "flute" || f === "voice"
          ? [
              ["sine", 0, 0.9],
              ["triangle", 2, 0.25],
            ]
          : f === "organ"
            ? [
                ["sine", 0, 0.6],
                ["sine", 1200, 0.25],
                ["triangle", 1902, 0.1],
              ]
            : [
                ["triangle", 0, 0.8],
                ["sine", 1200, 0.2],
              ];
  const oscs = waves.map(([type, cents, level]) => {
    const o = ac.createOscillator();
    const lg = ac.createGain();
    o.type = type;
    o.frequency.value = hz;
    o.detune.value = cents;
    lg.gain.value = level;
    o.connect(lg).connect(lp);
    o.start(now);
    return o;
  });
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const t = ac.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0, t, decays ? 0.08 : 0.06);
    oscs.forEach((o) => o.stop(t + 0.5));
  };
}

/** a held reference tone for tuning: a pure sine, a soft organ, or an instrument's samples */
export function tone(hz: number, kind: "sine" | "organ" | number): () => void {
  const { ac, out: dest } = output();
  if (typeof kind === "number") {
    const a4 = soundSettings().a4;
    const midi = 69 + 12 * Math.log2(hz / a4);
    const rounded = Math.round(midi);
    const inst = loaded.get(kind);
    if (inst) {
      const stop = inst.start({ note: rounded, velocity: 90, detune: 1200 * Math.log2(a4 / 440) + (midi - rounded) * 100 });
      return () => stop();
    }
    void loadInstrument(kind).then((i) => loaded.set(kind, i));
    return synthVoice(ac, dest, family(kind), hz, 0.8);
  }
  return synthVoice(ac, dest, kind, hz, 0.7);
}

export type ClickSound = "click" | "wood" | "beep";
/** a metronome tick at `at` (audio clock seconds) */
export function tick(at: number, level: "accent" | "normal" | "sub", sound: ClickSound, volume = 1) {
  const { ac, out: dest } = output();
  const g = ac.createGain();
  g.connect(dest);
  const loud = (level === "accent" ? 0.5 : level === "normal" ? 0.32 : 0.16) * volume;
  if (sound === "wood") {
    // a short filtered noise burst
    const len = Math.round(ac.sampleRate * 0.04);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = level === "accent" ? 2600 : level === "normal" ? 1900 : 1500;
    bp.Q.value = 6;
    src.connect(bp).connect(g);
    g.gain.value = loud * 3;
    src.start(at);
    return;
  }
  const o = ac.createOscillator();
  o.type = sound === "beep" ? "sine" : "square";
  o.frequency.value = level === "accent" ? (sound === "beep" ? 1320 : 1760) : level === "normal" ? (sound === "beep" ? 880 : 1175) : 990;
  const len = sound === "beep" ? 0.09 : 0.05;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(loud * (sound === "beep" ? 0.8 : 0.7), at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g);
  o.start(at);
  o.stop(at + len + 0.01);
}

/** the audio clock (seconds) */
export const now = () => output().ac.currentTime;
