/**
 * The metronome's timing, pure: which clicks fall in a time window. The player asks every ~25 ms for the clicks of
 * the next ~120 ms and schedules them on the audio clock, so the beat never drifts with the screen.
 */

export type Accent = "accent" | "normal" | "mute";
export interface MetronomeSettings {
  bpm: number;
  /** beats per bar */
  beats: number;
  /** clicks per beat: 1 (beats), 2 (eighths), 3 (triplets), 4 (sixteenths) */
  sub: 1 | 2 | 3 | 4;
  /** per beat of the bar */
  accents: Accent[];
  /** which note is played heavier: the first of each bar (the beat accents decide), the first of every beat, or
   * none (all beats even); muted beats stay silent either way */
  heavy?: "bar" | "beat" | "none";
}

export interface Tick {
  /** seconds, on the clock the origin was taken from */
  time: number;
  /** running index of the tick since the start */
  index: number;
  /** beat in the bar, 0-based */
  beat: number;
  /** 0 on the beat, 1… for subdivisions */
  sub: number;
  kind: Accent | "sub";
}

export const DEFAULT_METRONOME: MetronomeSettings = { bpm: 96, beats: 4, sub: 1, accents: ["accent", "normal", "normal", "normal"] };

/** the accent of a beat (missing entries: the first beat accented, the others normal) */
export const accentOf = (s: MetronomeSettings, beat: number): Accent => s.accents[beat] ?? (beat === 0 ? "accent" : "normal");

/** the ticks with `from ≤ time < to`, for a metronome started at `origin` */
export function ticksBetween(s: MetronomeSettings, origin: number, from: number, to: number): Tick[] {
  const step = 60 / s.bpm / s.sub;
  const out: Tick[] = [];
  for (let k = Math.max(0, Math.ceil((from - origin) / step - 1e-9)); ; k++) {
    const time = origin + k * step;
    if (time >= to - 1e-12) break;
    const beatIndex = Math.floor(k / s.sub);
    const beat = beatIndex % s.beats;
    const sub = k % s.sub;
    const a = accentOf(s, beat);
    const heavy = s.heavy ?? "bar";
    const kind = sub ? "sub" : a === "mute" || heavy === "bar" ? a : heavy === "beat" ? "accent" : "normal";
    out.push({ time, index: k, beat, sub, kind });
  }
  return out;
}

/** the next accent in the cycle a beat button steps through */
export const nextAccent = (a: Accent): Accent => (a === "accent" ? "normal" : a === "normal" ? "mute" : "accent");

/** settings with a new number of beats: keep the accents that still fit */
export function withBeats(s: MetronomeSettings, beats: number): MetronomeSettings {
  return { ...s, beats, accents: Array.from({ length: beats }, (_, i) => s.accents[i] ?? (i === 0 ? "accent" : "normal")) };
}
