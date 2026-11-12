/**
 * Computer-keyboard layouts for the virtual keyboard (by KeyboardEvent.code, so they work on any keyboard language):
 * - "typing" (Musical Typing, as GarageBand and Ableton): the home row A S D F … = white keys, W E T Y U O P = black
 *   keys, about 1½ octaves from one C; Z / X shift the octave, C / V softer / louder;
 * - "tworow" (as FL Studio and trackers): two rows, two hands. The bottom row Z X C V B N M , . / = white keys with
 *   the black keys on S D G H J L ;, from the left hand's C; the top row Q W E R T Y U I O P [ ] = white keys with
 *   the black keys on the number row, from the right hand's C. About 2½ octaves at once; ↓ / ↑ move the left hand's
 *   octave, ← / → the right hand's.
 */

export type LayoutId = "typing" | "tworow";
export const LAYOUTS: LayoutId[] = ["tworow", "typing"];

const TYPING: Record<string, number> = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11,
  KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
};
/** the left hand: semitones above its C */
const LOW: Record<string, number> = {
  KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5, KeyG: 6, KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11,
  Comma: 12, KeyL: 13, Period: 14, Semicolon: 15, Slash: 16,
};
/** the right hand: semitones above its C */
const HIGH: Record<string, number> = {
  KeyQ: 0, Digit2: 1, KeyW: 2, Digit3: 3, KeyE: 4, KeyR: 5, Digit5: 6, KeyT: 7, Digit6: 8, KeyY: 9, Digit7: 10,
  KeyU: 11, KeyI: 12, Digit9: 13, KeyO: 14, Digit0: 15, KeyP: 16, BracketLeft: 17, Equal: 18, BracketRight: 19,
};

/** where each hand's C is (MIDI): the typing layout uses `high` only */
export interface Bases {
  high: number;
  low: number;
}

/** the MIDI note a key plays in a layout, or null */
export function keyMidi(layout: LayoutId, code: string, b: Bases): number | null {
  if (layout === "typing") return code in TYPING ? b.high + TYPING[code] : null;
  if (code in LOW) return b.low + LOW[code];
  if (code in HIGH) return b.high + HIGH[code];
  return null;
}

export type KeyAction = "octDown" | "octUp" | "lowDown" | "lowUp" | "softer" | "louder";
/** keys that change the octave or the loudness instead of playing */
export function keyAction(layout: LayoutId, code: string): KeyAction | null {
  if (layout === "typing")
    return ({ KeyZ: "octDown", KeyX: "octUp", KeyC: "softer", KeyV: "louder" } as Record<string, KeyAction>)[code] ?? null;
  return ({ ArrowLeft: "octDown", ArrowRight: "octUp", ArrowDown: "lowDown", ArrowUp: "lowUp" } as Record<string, KeyAction>)[code] ?? null;
}

const SHOW: Record<string, string> = { Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/", BracketLeft: "[", BracketRight: "]", Equal: "=" };
const show = (code: string) => SHOW[code] ?? code.replace(/^(Key|Digit)/, "");

/** the computer key shown on a virtual key (the right hand wins where the hands overlap) */
export function keyLabelFor(layout: LayoutId, midi: number, b: Bases): string | null {
  const find = (map: Record<string, number>, base: number) => Object.entries(map).find(([, off]) => base + off === midi)?.[0];
  const code = layout === "typing" ? find(TYPING, b.high) : (find(HIGH, b.high) ?? find(LOW, b.low));
  return code ? show(code) : null;
}

/** the help line for a layout */
export function layoutHelp(layout: LayoutId, b: Bases, velocity: number, zh: boolean): string {
  const c = (m: number) => `C${Math.floor(m / 12) - 1}`;
  if (layout === "typing")
    return zh
      ? `A S D F G H J K = C D E F G A B C · W E T Y U = 黑鍵 · Z/X 換八度（${c(b.high)}）· C/V 音量 ${Math.round(velocity * 100)}% · 空白鍵 = 踏板`
      : `A S D F G H J K = C D E F G A B C · W E T Y U = black keys · Z/X octave (${c(b.high)}) · C/V loudness ${Math.round(velocity * 100)}% · Space = pedal`;
  return zh
    ? `左手 Z X C V B N M（從 ${c(b.low)}，黑鍵在 S D G H J）· 右手 Q W E R T Y U I（從 ${c(b.high)}，黑鍵在 2 3 5 6 7）· ↓/↑ 左手八度 · ←/→ 右手八度 · 空白鍵 = 踏板`
    : `Left hand Z X C V B N M (from ${c(b.low)}, black keys on S D G H J) · right hand Q W E R T Y U I (from ${c(b.high)}, black keys on 2 3 5 6 7) · ↓/↑ left octave · ←/→ right octave · Space = pedal`;
}
