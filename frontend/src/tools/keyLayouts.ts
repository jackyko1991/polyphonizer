/**
 * Computer-keyboard layouts for the virtual keyboard (by KeyboardEvent.code, so they work on any keyboard language):
 * - "typing" (Musical Typing, as GarageBand and Ableton): the home row A S D F … = white keys, W E T Y U O P = black
 *   keys, about 1½ octaves from one C; Z / X shift the octave, C / V softer / louder;
 * - "tworow" (as FL Studio and trackers): two rows, two hands. The bottom row Z X C V B N M , . / = white keys with
 *   the black keys on S D G H J L ;, from the left hand's C; the top row Q W E R T Y U I O P [ ] = white keys with
 *   the black keys on the number row, from the right hand's C. About 2½ octaves at once; ↓ / ↑ move the left hand's
 *   octave, ← / → the right hand's. The hands overlap round middle C so neither has to change rows there: the left
 *   hand's , . / are C D E above its octave, the right hand's Tab is the B below its C.
 * In both, holding Shift plays an octave up and holding Option (Alt) an octave down, for as long as it is held (a leap
 * or an arpeggio without moving the hand).
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
  Tab: -1,
};

/** where each hand's C is (MIDI): the typing layout uses `high` only */
export interface Bases {
  high: number;
  low: number;
}

/** Shift or Option (Alt) held while a key is pressed: an octave up or down */
export interface Held {
  shift?: boolean;
  alt?: boolean;
}

/** the MIDI note a key plays in a layout (with Shift or Option held, an octave up or down), or null */
export function keyMidi(layout: LayoutId, code: string, b: Bases, held: Held = {}): number | null {
  const base = layout === "typing" ? (code in TYPING ? b.high + TYPING[code] : null) : code in LOW ? b.low + LOW[code] : code in HIGH ? b.high + HIGH[code] : null;
  return base === null ? null : base + (held.shift ? 12 : held.alt ? -12 : 0);
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

/** every computer key that plays a note: the right hand's first, then the left hand's (where the hands overlap) */
export function keyLabelsFor(layout: LayoutId, midi: number, b: Bases): string[] {
  const find = (map: Record<string, number>, base: number) => Object.entries(map).find(([, off]) => base + off === midi)?.[0];
  const codes = layout === "typing" ? [find(TYPING, b.high)] : [find(HIGH, b.high), find(LOW, b.low)];
  return codes.filter((c): c is string => !!c).map(show);
}

/** the computer key shown on a virtual key (the right hand's where the hands overlap) */
export function keyLabelFor(layout: LayoutId, midi: number, b: Bases): string | null {
  return keyLabelsFor(layout, midi, b)[0] ?? null;
}

/** which hand's keys reach a note: left, right, both (the overlap) or neither */
export function handZone(layout: LayoutId, midi: number, b: Bases): "left" | "right" | "both" | null {
  const has = (map: Record<string, number>, base: number) => Object.values(map).some((off) => base + off === midi);
  const right = has(layout === "typing" ? TYPING : HIGH, b.high);
  const left = layout === "tworow" && has(LOW, b.low);
  return left && right ? "both" : left ? "left" : right ? "right" : null;
}

/** how to play a note from where the hands are: its key (that hand's, else any), the same with Shift or Option held when
 * it is an octave away, or which way to move the hand's octave */
export function reachFor(layout: LayoutId, midi: number, b: Bases, hand: "left" | "right" = "right"): { key: string; mod?: "shift" | "alt" } | { move: "up" | "down" } {
  const find = (m: number, map: Record<string, number>, base: number) => {
    const code = Object.entries(map).find(([, off]) => base + off === m)?.[0];
    return code ? show(code) : null;
  };
  // this hand's keys first (as it is, then with Shift or Option held), the other hand's only after: a right-hand note
  // is not labelled with a left-hand key while the right hand can play it
  const mine: [Record<string, number>, number] = layout === "typing" ? [TYPING, b.high] : hand === "left" ? [LOW, b.low] : [HIGH, b.high];
  const other: [Record<string, number>, number] | null = layout === "typing" ? null : hand === "left" ? [HIGH, b.high] : [LOW, b.low];
  for (const [map, base] of other ? [mine, other] : [mine]) {
    const here = find(midi, map, base);
    if (here) return { key: here };
    const up = find(midi - 12, map, base);
    if (up) return { key: up, mod: "shift" };
    const down = find(midi + 12, map, base);
    if (down) return { key: down, mod: "alt" };
  }
  return { move: midi > mine[1] ? "up" : "down" };
}

/** the help line for a layout */
export function layoutHelp(layout: LayoutId, b: Bases, velocity: number, zh: boolean): string {
  const c = (m: number) => `C${Math.floor(m / 12) - 1}`;
  if (layout === "typing")
    return zh
      ? `A S D F G H J K = C D E F G A B C · W E T Y U = 黑鍵 · Z/X 換八度（${c(b.high)}）· 按住 Shift / Option：高 / 低八度 · C/V 音量 ${Math.round(velocity * 100)}% · 空白鍵 = 踏板`
      : `A S D F G H J K = C D E F G A B C · W E T Y U = black keys · Z/X octave (${c(b.high)}) · hold Shift / Option: an octave up / down · C/V loudness ${Math.round(velocity * 100)}% · Space = pedal`;
  return zh
    ? `左手 Z X C V B N M , . /（從 ${c(b.low)}，黑鍵在 S D G H J）· 右手 Tab Q W E R T Y U I（從 ${c(b.high)}，黑鍵在 2 3 5 6 7）· 按住 Shift / Option：高 / 低八度 · ↓/↑ 左手八度 · ←/→ 右手八度 · 空白鍵 = 踏板`
    : `Left hand Z X C V B N M , . / (from ${c(b.low)}, black keys on S D G H J) · right hand Tab Q W E R T Y U I (from ${c(b.high)}, black keys on 2 3 5 6 7) · hold Shift / Option: an octave up / down · ↓/↑ left octave · ←/→ right octave · Space = pedal`;
}

/** where the hands are now (the keyboard's settings), for pages that label notes with their keys */
export interface KeyboardPlace {
  layout: LayoutId;
  bases: Bases;
}
export const KEYBOARD_PREFS = "polyphonizer.keyboard";
const PLACE_EVENT = "pz-keyboard-place";
export function keyboardPlace(): KeyboardPlace {
  try {
    const p = JSON.parse(localStorage.getItem(KEYBOARD_PREFS) ?? "null") as { layout?: LayoutId; baseC?: number; lowC?: number } | null;
    const high = p?.baseC ?? 60;
    return { layout: p?.layout ?? "typing", bases: { high, low: p?.lowC ?? high - 12 } };
  } catch {
    return { layout: "typing", bases: { high: 60, low: 48 } };
  }
}
/** the keyboard says it has moved (layout, octaves) */
export const announcePlace = () => window.dispatchEvent(new Event(PLACE_EVENT));
export function onPlace(cb: () => void): () => void {
  window.addEventListener(PLACE_EVENT, cb);
  return () => window.removeEventListener(PLACE_EVENT, cb);
}

/** a note's key as a short label: "Q", "⇧I" (hold Shift), "⌥Z" (hold Option), or ↑ / ↓ (move that hand's octave) */
export function reachLabel(r: ReturnType<typeof reachFor>): string {
  if ("move" in r) return r.move === "up" ? "↑" : "↓";
  return `${r.mod === "shift" ? "⇧" : r.mod === "alt" ? "⌥" : ""}${r.key}`;
}
