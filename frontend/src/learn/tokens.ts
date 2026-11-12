/**
 * Code ↔ score for single-part lessons: the notes of a tiny("…") string are its tokens, one note or rest each, in
 * order. tinyNotation never splits a note, so each token starts where its note starts: token durations (the number
 * carries on, dots, trip{…} and quad{…}) give the offsets that match the engine's notes.
 */
import type { NoteEvent } from "../engine/types.ts";

export interface Token {
  /** offsets in the whole code */
  from: number;
  to: number;
  text: string;
  rest: boolean;
  /** quarter notes from the start */
  offset: number;
  dur: number;
}

const NOTE = /^(?:trip\{|quad\{)?(r|[a-g]'*|[A-G]+)(#+|-+|n)?(\d+)?(\.*)(~)?(\})?$/;

/** the tokens of the only tiny("…") call with a literal string; null if there is none or more than one */
export function tinyTokens(code: string): Token[] | null {
  const calls = [...code.matchAll(/\btiny\(\s*(["'])((?:(?!\1)[^\\\n])*)\1/g)];
  const all = [...code.matchAll(/\btiny\(/g)];
  if (calls.length !== 1 || all.length !== 1) return null;
  const m = calls[0];
  const start = m.index + m[0].indexOf(m[1]) + 1;
  const out: Token[] = [];
  let den = 4;
  let factor = 1;
  let t = 0;
  for (const w of m[2].matchAll(/\S+/g)) {
    const text = w[0];
    if (/^\d+\/\d+$/.test(text)) continue; // a time signature inside the string
    const n = NOTE.exec(text);
    if (!n) return null;
    if (text.startsWith("trip{")) factor = 2 / 3;
    if (text.startsWith("quad{")) factor = 3 / 4;
    if (n[3]) den = Number(n[3]);
    let dur = 4 / den;
    let add = dur / 2;
    for (let i = 0; i < n[4].length; i++, add /= 2) dur += add;
    dur *= factor;
    out.push({ from: start + w.index, to: start + w.index + text.length, text, rest: n[1] === "r", offset: t, dur });
    t += dur;
    if (n[6]) factor = 1;
  }
  return out;
}

/** for each of the part's notes and rests (engine order), the index of its token, or -1 */
export function noteTokens(tokens: Token[], notes: NoteEvent[], part = 0): number[] {
  return notes
    .filter((n) => n.part === part)
    .map((n) => tokens.findIndex((tk) => Math.abs(tk.offset - n.offset) < 1e-4 && tk.rest === !n.midi.length));
}
