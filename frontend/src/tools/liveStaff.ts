/**
 * The keyboard's live staff, pure part: the notes played most recently (keys pressed together, within ~40 ms, make
 * one chord) as a two-staff example in ABC: treble for middle C and up, bass below; each event a quarter note, in
 * bars of four, the newest last. engine/abc.ts turns it into MEI for Verovio.
 */

/** MIDI → ABC pitch: C = middle C (60), c = 72, C, = 48; black keys as sharps */
export function abcPitch(midi: number): string {
  const names = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"];
  const name = names[midi % 12];
  const octave = Math.floor(midi / 12) - 1; // 4 = the octave of middle C
  const acc = name.startsWith("^") ? "^" : "";
  const letter = name.replace("^", "");
  if (octave >= 5) return acc + letter.toLowerCase() + "'".repeat(octave - 5);
  return acc + letter + ",".repeat(4 - octave);
}

/** a note-on stream grouped into chords: events closer than `gap` ms join the previous chord */
export function groupChords(ons: { midi: number; time: number }[], gap = 40): number[][] {
  const out: { at: number; notes: number[] }[] = [];
  for (const e of ons) {
    const last = out[out.length - 1];
    if (last && e.time - last.at <= gap) {
      if (!last.notes.includes(e.midi)) last.notes.push(e.midi);
    } else out.push({ at: e.time, notes: [e.midi] });
  }
  return out.map((c) => c.notes.sort((a, b) => a - b));
}

const part = (notes: number[]) => (notes.length === 0 ? "z" : notes.length === 1 ? abcPitch(notes[0]) : `[${notes.map(abcPitch).join("")}]`);

/** the chords as a grand-staff ABC example: bars of four quarter notes counted from the first chord (so a bar is
 * always the same four chords), showing the last `show` bars (bars of rests when empty) */
export function liveAbc(chords: number[][], show = 2): string {
  const recent = chords.slice(firstShown(chords.length, show));
  while (recent.length % 4 || recent.length < show * 4) recent.push([]); // always `show` bars, rests to fill
  const line = (pick: (n: number) => boolean) =>
    recent
      .map((c) => part(c.filter(pick)))
      .reduce((acc, x, i) => acc + (i && i % 4 === 0 ? " | " : " ") + x, "")
      .trim() + " |]";
  return ["X:1", "M:4/4", "L:1/4", "K:C", "V:1", line((n) => n >= 60), "V:2 clef=bass", line((n) => n < 60)].join("\n");
}

/** the first chord shown when the staff shows the last `show` bars of `count` chords */
export const firstShown = (count: number, show = 2) => Math.max(0, (Math.ceil(count / 4) - show) * 4);

/** where each chord starts in a note-on stream (notes within `gap` ms of the one before join its chord) */
export function chordStarts(ons: { time: number }[], gap = 40): number[] {
  const out: number[] = [];
  let at = -Infinity;
  ons.forEach((e, i) => {
    if (e.time - at > gap) out.push(i);
    at = out.length && i === out[out.length - 1] ? e.time : at;
  });
  return out;
}
/** `ons` without its last chord */
export function dropLast<T extends { time: number }>(ons: T[], gap = 40): T[] {
  const starts = chordStarts(ons, gap);
  return starts.length ? ons.slice(0, starts[starts.length - 1]) : ons;
}
/** `ons` without chord number `i` (from 0) */
export function dropChord<T extends { time: number }>(ons: T[], i: number, gap = 40): T[] {
  const starts = chordStarts(ons, gap);
  if (i < 0 || i >= starts.length) return ons;
  return [...ons.slice(0, starts[i]), ...ons.slice(starts[i + 1] ?? ons.length)];
}
/** `ons` without its last bar (the chords from the last multiple of four on) */
export function dropBar<T extends { time: number }>(ons: T[], gap = 40): T[] {
  const starts = chordStarts(ons, gap);
  if (!starts.length) return ons;
  return ons.slice(0, starts[Math.floor((starts.length - 1) / 4) * 4]);
}

// the notes on the live staff, shared by the staff (draws them) and the keyboard (Backspace / Esc / Delete)
type On = { midi: number; time: number };
let ons: On[] = [];
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((f) => f());
export const staffNotes = () => ons;
export function onStaff(f: () => void): () => void {
  listeners.add(f);
  return () => void listeners.delete(f);
}
export function addToStaff(e: On) {
  picked = null;
  // keep whole bars when trimming old notes, so the bars stay where they were
  if (ons.length > 400) ons = ons.slice(chordStarts(ons)[Math.min(40, chordStarts(ons).length - 1)] ?? 0);
  ons = [...ons, e];
  changed();
}
/** the chord picked on the staff (←/→ while the staff has focus), or null */
let picked: number | null = null;
export const pickedChord = () => picked;
export const chordCount = () => chordStarts(ons).length;
/** move the pick: from nothing, ← starts at the last chord */
export function movePick(by: 1 | -1) {
  const n = chordCount();
  if (!n) return;
  picked = picked === null ? n - 1 : Math.max(0, Math.min(n - 1, picked + by));
  changed();
}
export function setPick(i: number | null) {
  picked = i;
  changed();
}
/** Backspace: take the picked chord off (or else the last one); false if the staff was empty */
export function undoStaff(): boolean {
  if (!ons.length) return false;
  if (picked !== null) {
    ons = dropChord(ons, picked);
    picked = Math.min(picked, chordCount() - 1) >= 0 ? Math.min(picked, chordCount() - 1) : null;
  } else ons = dropLast(ons);
  changed();
  return true;
}
/** Shift+Backspace / Delete: take the last bar off; false if the staff was empty */
export function undoBar(): boolean {
  if (!ons.length) return false;
  ons = dropBar(ons);
  picked = null;
  changed();
  return true;
}
/** Esc, the All button: empty the staff; false if it was empty already */
export function clearStaff(): boolean {
  if (!ons.length) return false;
  ons = [];
  picked = null;
  changed();
  return true;
}
