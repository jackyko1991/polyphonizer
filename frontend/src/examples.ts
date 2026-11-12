/** Editor examples: all public domain (music21's corpus, or written here). */
import type { L } from "./problems.ts";

export const EXAMPLES: { id: string; title: L; code: string }[] = [
  {
    id: "trio",
    title: ["Trio sketch: flute, violin, piano", "三重奏草稿：長笛、小提琴、鋼琴"],
    code: `# A score is Python with music21. Run it with ▶ Run (or Ctrl/⌘+Enter).
# tiny() writes one part in "tinyNotation": c = middle C, c' = an octave up, C = an octave down,
# the number is the note value (4 = quarter, 2 = half, 1 = whole) and carries on until it changes.
flute = tiny("g'4 a' b' c'' b'2 a' g'1", name="Flute", inst="flute")
violin = tiny("e'4 f' g' a' g'2 f' e'1", name="Violin", inst="violin")
piano = tiny("C2 GG AA EE C1", name="Piano", inst="piano", clef_="bass")
score = together(flute, violin, piano, title="Trio sketch", bpm=88)
`,
  },
  {
    id: "chorale",
    title: ["Bach chorale BWV 66.6", "巴赫聖詠 BWV 66.6"],
    code: `# music21 comes with a corpus of public-domain scores: Bach chorales, Mozart, Beethoven quartets …
score = corpus.parse("bach/bwv66.6")
`,
  },
  {
    id: "mozart",
    title: ["Mozart K. 80, first movement (try Pages & turns)", "莫札特 K. 80 第一樂章（試試「頁面與翻頁」）"],
    code: `# A string quartet: open "Pages & turns" and pick one player's sheet to see where the pages turn.
score = corpus.parse("mozart/k80/movement1")
`,
  },
  {
    id: "transpose",
    title: ["Transpose a chorale for flute and violin", "把聖詠移調給長笛和小提琴"],
    code: `chorale = corpus.parse("bach/bwv66.6")
soprano, alto = chorale.parts[0], chorale.parts[1]
# a whole tone up, so the alto sits well on the violin
duet = together(soprano.transpose("M2"), alto.transpose("M2"), title="Chorale for flute and violin")
duet.parts[0].partName, duet.parts[1].partName = "Flute", "Violin"
score = duet
`,
  },
];
