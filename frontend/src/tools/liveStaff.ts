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

/** the last `max` chords as a grand-staff ABC example (bars of four quarter notes, rests to fill) */
export function liveAbc(chords: number[][], max = 8): string {
  const recent = chords.slice(-max);
  while (recent.length % 4 || recent.length === 0) recent.push([]);
  const line = (pick: (n: number) => boolean) =>
    recent
      .map((c) => part(c.filter(pick)))
      .reduce((acc, x, i) => acc + (i && i % 4 === 0 ? " | " : " ") + x, "")
      .trim() + " |]";
  return ["X:1", "M:4/4", "L:1/4", "K:C", "V:1", line((n) => n >= 60), "V:2 clef=bass", line((n) => n < 60)].join("\n");
}
