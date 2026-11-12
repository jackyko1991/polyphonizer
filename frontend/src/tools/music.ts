/**
 * The toolbox's music arithmetic, kept pure so it can be tested: note names, MIDI ↔ frequency (with any A4),
 * the computer-keyboard layout of the virtual keyboard, keyboard ranges, tap tempo.
 */

const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const mod = (n: number, m: number) => ((n % m) + m) % m;

/** 60 → "C4" (middle C) */
export const noteName = (midi: number) => `${NAMES[mod(midi, 12)]}${Math.floor(midi / 12) - 1}`;
/** the letter only (white keys): 60 → "C" */
export const letter = (midi: number) => NAMES[mod(midi, 12)];
export const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(mod(midi, 12));

/** equal temperament from A4 */
export const midiToHz = (midi: number, a4 = 440) => a4 * 2 ** ((midi - 69) / 12);
export const hzToMidi = (hz: number, a4 = 440) => 69 + 12 * Math.log2(hz / a4);

/** the nearest note to a frequency, and how far off it is in cents (−50 … +50) */
export function nearestNote(hz: number, a4 = 440): { midi: number; cents: number } {
  const x = hzToMidi(hz, a4);
  const midi = Math.round(x);
  return { midi, cents: (x - midi) * 100 };
}

/**
 * Playing with the computer keyboard (the "Musical Typing" layout of music software): the home row is the white
 * keys from C, the row above the black keys. KeyboardEvent.code, so it is the same key on any layout or input method.
 */
export const KEY_OFFSETS: Record<string, number> = {
  KeyA: 0,
  KeyW: 1,
  KeyS: 2,
  KeyE: 3,
  KeyD: 4,
  KeyF: 5,
  KeyT: 6,
  KeyG: 7,
  KeyY: 8,
  KeyH: 9,
  KeyU: 10,
  KeyJ: 11,
  KeyK: 12,
  KeyO: 13,
  KeyL: 14,
  KeyP: 15,
  Semicolon: 16,
  Quote: 17,
};
/** the key letter shown on a virtual key, for a base C */
export function keyLabel(midi: number, baseC: number): string | null {
  const code = Object.entries(KEY_OFFSETS).find(([, off]) => baseC + off === midi)?.[0];
  if (!code) return null;
  return code === "Semicolon" ? ";" : code === "Quote" ? "'" : code.replace("Key", "");
}

/** keyboard sizes and their usual first and last keys */
export const RANGES: Record<number, [number, number]> = { 25: [48, 72], 37: [48, 84], 49: [36, 84], 61: [36, 96], 88: [21, 108] };

/** the keys from `lo` to `hi`, inclusive */
export const keysBetween = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** beats per minute from tap times (ms): the mean of the last intervals, once two taps are close enough */
export function tapTempo(times: number[], now: number): { bpm: number | null; times: number[] } {
  const recent = [...times.filter((t) => now - t < 2500), now].slice(-5);
  if (recent.length < 2) return { bpm: null, times: recent };
  const gaps = recent.slice(1).map((t, i) => t - recent[i]);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return { bpm: Math.round(Math.min(300, Math.max(20, 60000 / mean))), times: recent };
}

/** strings and target notes of the tuner's presets */
export const TUNINGS: { id: string; name: readonly [string, string]; notes: number[] }[] = [
  { id: "violin", name: ["Violin", "小提琴"], notes: [55, 62, 69, 76] },
  { id: "viola", name: ["Viola", "中提琴"], notes: [48, 55, 62, 69] },
  { id: "cello", name: ["Cello", "大提琴"], notes: [36, 43, 50, 57] },
  { id: "bass", name: ["Double bass", "低音提琴"], notes: [28, 33, 38, 43] },
  { id: "guitar", name: ["Guitar", "吉他"], notes: [40, 45, 50, 55, 59, 64] },
  { id: "guitar-dropd", name: ["Guitar, drop D", "吉他（Drop D）"], notes: [38, 45, 50, 55, 59, 64] },
  { id: "ukulele", name: ["Ukulele", "烏克麗麗"], notes: [67, 60, 64, 69] },
  { id: "chromatic", name: ["Any note", "任何音"], notes: [] },
];

/** how close a note is to in tune: green within ±5 cents, yellow within ±15, red beyond */
export type TuneZone = "green" | "yellow" | "red";
export const tuneZone = (cents: number): TuneZone => (Math.abs(cents) <= 5 ? "green" : Math.abs(cents) <= 15 ? "yellow" : "red");
