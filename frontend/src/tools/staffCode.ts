/**
 * What was played on the keyboard, as Polyphonizer code: tinyNotation inside tiny("…"), one quarter note per note or
 * chord (as the live staff shows them), chords as <c e g>. Middle C and up is the right hand (treble); below it the
 * left hand (bass), and with both, together(right, left).
 */

/** MIDI → tinyNotation pitch: c = middle C (60), c' = 72, C = 48, CC = 36; black keys as sharps */
export function tinyPitch(midi: number): string {
  const names = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
  const name = names[midi % 12];
  const octave = Math.floor(midi / 12) - 1; // 4 = the octave of middle C
  if (octave >= 4) return name + "'".repeat(octave - 4);
  return name[0].toUpperCase().repeat(4 - octave) + name.slice(1);
}

/** one hand's line: rests where it doesn't play; the length (4 = a quarter) on the first note only, as tinyNotation
 * keeps it for the notes after */
function line(chords: number[][]): string {
  return chords
    .map((c, i) => {
      const len = i === 0 ? "4" : "";
      if (!c.length) return `r${len}`;
      if (c.length === 1) return tinyPitch(c[0]) + len;
      return `<${c.map(tinyPitch).join(" ")}>${len}`;
    })
    .join(" ");
}

/** the code for these chords (as liveStaff.groupChords gives them), or "" when nothing was played */
export function staffCode(chords: number[][]): string {
  if (!chords.length) return "";
  const right = chords.map((c) => c.filter((n) => n >= 60));
  const left = chords.map((c) => c.filter((n) => n < 60));
  const hasRight = right.some((c) => c.length);
  const hasLeft = left.some((c) => c.length);
  if (hasRight && !hasLeft) return `score = tiny("${line(right)}")`;
  if (hasLeft && !hasRight) return `score = tiny("${line(left)}", clef_="bass")`;
  return [`right = tiny("${line(right)}")`, `left = tiny("${line(left)}", clef_="bass")`, "score = together(right, left)"].join("\n");
}
