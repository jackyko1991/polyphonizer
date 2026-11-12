/**
 * The Learn track. A problem is a short task, starter code, and the rules that grade it (engine/checker.ts):
 * the rules are the test, written first, as in Tensorizer. Melodies are public domain (Fux 1725, Beethoven 1824,
 * the French folk tune "Ah ! vous dirai-je, maman").
 */
import type { Rule } from "./engine/checker.ts";

/** [English, Traditional Chinese] */
export type L = readonly [string, string];

export interface Problem {
  id: string;
  level: 0 | 1 | 2;
  title: L;
  /** what to do, in plain words (a few sentences; `code` in backticks) */
  task: L;
  /** the idea behind it */
  why: L;
  starter: string;
  rules: Rule[];
}

const D_DORIAN = [62, 65, 64, 62, 67, 65, 69, 67, 65, 64, 62];
const C_CANTUS = [72, 74, 77, 76, 79, 77, 76, 74, 72];
const ODE = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62];
const ODE_DURS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2];
const TWINKLE = [72, 72, 79, 79, 81, 81, 79, 77, 77, 76, 76, 74, 74, 72];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const DORIAN_D = [2, 4, 5, 7, 9, 11, 0];

/** first species against a cantus: the shared core of the counterpoint problems */
function firstSpecies(upper: number, lower: number, cp: number, above: boolean): Rule[] {
  return [
    { id: "noteAgainstNote", a: cp, b: cp === upper ? lower : upper },
    { id: "consonant", upper, lower },
    { id: "startPerfect", upper, lower, above },
    { id: "endOctave", upper, lower },
    { id: "cadenceStep", part: cp },
    { id: "noParallels", upper, lower },
    { id: "noCrossing", upper, lower, maxApart: 16 },
    { id: "goodLeaps", part: cp },
    { id: "unisonEnds", upper, lower },
    { id: "noDirect", upper, lower },
    { id: "fewRepeats", part: cp },
    { id: "imperfectMostly", upper, lower },
  ];
}

export const PROBLEMS: Problem[] = [
  {
    id: "hello-scale",
    level: 0,
    title: ["Hello, scale", "你好，音階"],
    task: [
      "Write the C major scale going up, one octave, in quarter notes: C D E F G A B C. The first two notes are done. In `tiny()`, `c` is middle C and `c'` is the C above it.",
      "寫出上行的 C 大調音階，一個八度，四分音符：C D E F G A B C。前兩個音已經寫好。在 `tiny()` 裡，`c` 是中央 C，`c'` 是高八度的 C。",
    ],
    why: [
      "A major scale is a fixed pattern of steps: whole, whole, half, whole, whole, whole, half. The checker tests the pattern, not just the note names.",
      "大調音階是固定的步距模式：全、全、半、全、全、全、半。檢查器測的是這個模式，而不只是音名。",
    ],
    starter: `# Write the rest of the scale: C D E F G A B C, in quarter notes.
score = tiny("c4 d", inst="flute")
`,
    rules: [
      { id: "parts", count: 1 },
      { id: "count", part: 0, count: 8 },
      { id: "starts", part: 0, midi: 60 },
      { id: "steps", part: 0, semitones: [2, 2, 1, 2, 2, 2, 1] },
      { id: "ends", part: 0, midi: 72 },
    ],
  },
  {
    id: "ode-for-flute",
    level: 0,
    title: ["Ode to Joy for flute and violin", "給長笛與小提琴的〈快樂頌〉"],
    task: [
      "The violin plays Beethoven's Ode to Joy in C major. Write the flute part: the same melody a perfect fifth higher, in G major, with the same rhythm. Only change the flute line.",
      "小提琴以 C 大調演奏貝多芬的〈快樂頌〉。寫出長笛聲部：同一旋律高一個完全五度，G 大調，節奏不變。只改長笛那一行。",
    ],
    why: [
      "Moving a melody to another key keeps every interval: each note moves by the same amount (here 7 semitones). It is the first thing an arranger does, to fit an instrument's range or a singer's voice.",
      "把旋律移到另一個調，每個音程都不變：每個音移動相同的距離（這裡是 7 個半音）。這是編曲的第一步，為了配合樂器的音域或歌手的嗓音。",
    ],
    starter: `melody = "e4 e f g g f e d c c d e e4. d8 d2"
violin = tiny(melody, name="Violin", inst="violin")  # given: don't change
flute = tiny("b4 b", name="Flute", inst="flute", key_sig="G")  # yours: a fifth higher
score = together(flute, violin, bpm=100)
`,
    rules: [
      { id: "parts", count: 2 },
      { id: "pitches", part: 1, midi: ODE },
      { id: "transposed", part: 0, from: ODE, by: 7 },
      { id: "sameRhythm", part: 0, durs: ODE_DURS },
      { id: "range", part: 0, low: 60, high: 96 },
    ],
  },
  {
    id: "species-1-above",
    level: 1,
    title: ["First species, above", "第一類對位：在上方"],
    task: [
      "Fux's cantus firmus in D (1725) is given. Write a counterpoint above it: one whole note against each cantus note, every pair consonant, no parallel fifths or octaves, ending on the octave reached by step (C♯ is allowed just before the end).",
      "給定福克斯（1725）的 D 調定旋律。在其上方寫一條對位：每個定旋律音對一個全音符，每對音都要協和，沒有平行五度或八度，最後以級進到達八度（結尾前可以用 C♯）。",
    ],
    why: [
      "Species counterpoint is how composers learned to write independent voices for three centuries. Its rules are exact, so a machine can grade them: the cantus is the statement, your line is the answer.",
      "對位法「類別」是三百年來作曲家學寫獨立聲部的方法。它的規則很精確，所以機器能評分：定旋律是題目，你的旋律是答案。",
    ],
    starter: `cantus = tiny("d1 f e d g f a g f e d", name="Cantus firmus")  # given: don't change
counterpoint = tiny("a1", name="Counterpoint")  # yours: one whole note per cantus note
score = together(counterpoint, cantus, bpm=120)
`,
    rules: [
      { id: "parts", count: 2 },
      { id: "pitches", part: 1, midi: D_DORIAN },
      { id: "scale", part: 0, pcs: DORIAN_D, allowLast2: [1] },
      ...firstSpecies(0, 1, 0, true),
    ],
  },
  {
    id: "species-1-below",
    level: 1,
    title: ["First species, below", "第一類對位：在下方"],
    task: [
      "Now the cantus is on top, in C major. Write the counterpoint below it. Below the cantus you may start only on a unison or an octave: a fifth below would put the piece in another key.",
      "這次定旋律在上方，C 大調。在它下方寫對位。在下方時只能以同度或八度開始：下方五度會讓曲子聽起來在另一個調。",
    ],
    why: [
      "The bass decides the harmony. The same rules apply, but the opening changes, and so does which intervals feel stable.",
      "低音決定和聲。規則相同，但開頭不同，哪些音程聽起來穩定也不同。",
    ],
    starter: `cantus = tiny("c'1 d' f' e' g' f' e' d' c'", name="Cantus firmus")  # given: don't change
counterpoint = tiny("c'1", name="Counterpoint")  # yours, below the cantus
score = together(cantus, counterpoint, bpm=120)
`,
    rules: [
      { id: "parts", count: 2 },
      { id: "pitches", part: 0, midi: C_CANTUS },
      { id: "scale", part: 1, pcs: MAJOR },
      ...firstSpecies(0, 1, 1, false),
    ],
  },
  {
    id: "twinkle-duet",
    level: 2,
    title: ["A second part for Twinkle", "為〈小星星〉寫第二聲部"],
    task: [
      "The flute plays \"Ah ! vous dirai-je, maman\" (Twinkle, Twinkle). Write a violin part below it, note against note, mostly in thirds and sixths, without parallel fifths or octaves, and within the violin's range (from the G below middle C).",
      "長笛演奏〈媽媽，我要告訴你〉（小星星）。在它下方寫小提琴聲部，一音對一音，以三度和六度為主，沒有平行五度或八度，且在小提琴音域內（從中央 C 下方的 G 起）。",
    ],
    why: [
      "Thirds and sixths are the sweet intervals of duets: two players can follow each other closely without the voices merging, the way violin and flute do in Baroque trio sonatas.",
      "三度和六度是二重奏的甜美音程：兩位演奏者可以緊密相隨而聲部不會融成一體，就像巴洛克三重奏鳴曲裡的小提琴與長笛。",
    ],
    starter: `flute = tiny("c'4 c' g' g' a' a' g'2 f'4 f' e' e' d' d' c'2", name="Flute", inst="flute")  # given
violin = tiny("a4", name="Violin", inst="violin")  # yours
score = together(flute, violin, bpm=96)
`,
    rules: [
      { id: "parts", count: 2 },
      { id: "pitches", part: 0, midi: TWINKLE },
      { id: "noteAgainstNote", a: 1, b: 0 },
      { id: "consonant", upper: 0, lower: 1 },
      { id: "noParallels", upper: 0, lower: 1 },
      { id: "noCrossing", upper: 0, lower: 1, maxApart: 16 },
      { id: "range", part: 1, low: 55, high: 100 },
      { id: "endOctave", upper: 0, lower: 1 },
      { id: "imperfectMostly", upper: 0, lower: 1 },
    ],
  },
];

const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
export const midiName = (m: number) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
