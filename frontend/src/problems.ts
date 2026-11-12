/**
 * The Learn track. A problem is a short task, starter code, and the rules that grade it (engine/checker.ts):
 * the rules are the test, written first, as in Tensorizer. Melodies are public domain (Fux 1725, Beethoven 1824,
 * the French folk tune "Ah ! vous dirai-je, maman").
 */
import { scaleRun, type AnyRule } from "./engine/checker.ts";
import { TECHNIQUE_LESSONS, TECHNIQUE_PROBLEMS } from "./learn/techniques.ts";
import { LESSONS } from "./learn/track0.ts";

/** [English, Traditional Chinese] */
export type L = readonly [string, string];

export type Level = "L0" | "L1" | "L2" | "L3";
export const LEVELS: Level[] = ["L0", "L1", "L2", "L3"];
export type Category = "syntax" | "basics" | "technique" | "counterpoint" | "arranging";
/** the library's topics, in order: Track 0 (the syntax lessons) first */
export const CATEGORIES: { id: Category; icon: string; title: L }[] = [
  { id: "syntax", icon: "✎", title: ["Syntax basics", "語法基礎"] },
  { id: "basics", icon: "♩", title: ["Writing notes", "寫音符"] },
  { id: "technique", icon: "⌒", title: ["Playing techniques", "演奏法"] },
  { id: "counterpoint", icon: "⇅", title: ["Counterpoint", "對位"] },
  { id: "arranging", icon: "♫", title: ["Arranging", "編曲"] },
];

export interface Problem {
  id: string;
  category: Category;
  level: Level;
  title: L;
  /** what to do, in plain words (a few sentences; `code` in backticks) */
  task: L;
  /** the idea behind it */
  why: L;
  starter: string;
  rules: AnyRule[];
  /** a Track 0 lesson: its number ("1", "2a" …); its explanation is in learn/lessons.tsx */
  lesson?: string;
  /** the lessons (ids) whose syntax this problem uses: shown as "uses: lesson N" chips */
  uses?: string[];
}

const D_DORIAN = [62, 65, 64, 62, 67, 65, 69, 67, 65, 64, 62];
const C_CANTUS = [72, 74, 77, 76, 79, 77, 76, 74, 72];
const ODE = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62];
const ODE_DURS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2];
const TWINKLE = [72, 72, 79, 79, 81, 81, 79, 77, 77, 76, 76, 74, 74, 72];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
/** one octave of steps going up, in semitones */
const MAJOR_STEPS = [2, 2, 1, 2, 2, 2, 1];
const NATURAL_MINOR_STEPS = [2, 1, 2, 2, 1, 2, 2];
const HARMONIC_MINOR_STEPS = [2, 1, 2, 2, 1, 3, 1];
const MELODIC_MINOR_STEPS = [2, 1, 2, 2, 2, 2, 1];

/** a scale over several octaves, up and back down: where it starts and turns, and every step on the way */
function scaleRules(start: number, octaves: number, up: number[], down: number[] = up): AnyRule[] {
  const steps = scaleRun(up, octaves, down);
  return [
    { id: "parts", count: 1 },
    { id: "starts", part: 0, midi: start },
    { id: "highest", part: 0, midi: start + 12 * octaves },
    { id: "ends", part: 0, midi: start },
    { id: "count", part: 0, count: steps.length + 1 },
    { id: "steps", part: 0, semitones: steps },
  ];
}
const SCALE_USES = ["syntax-note", "syntax-accidentals", "syntax-part"];
const DORIAN_D = [2, 4, 5, 7, 9, 11, 0];

/** first species against a cantus: the shared core of the counterpoint problems */
function firstSpecies(upper: number, lower: number, cp: number, above: boolean): AnyRule[] {
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
  ...LESSONS,
  {
    id: "hello-scale",
    category: "basics",
    uses: ["syntax-note", "syntax-rhythm-values"],
    level: "L1",
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
    id: "scale-two-octaves",
    category: "basics",
    level: "L1",
    uses: SCALE_USES,
    title: ["Two octaves up and down", "兩個八度，上行再下行"],
    task: [
      "Play C major over two octaves: up from middle C (`c`) to `c''`, then back down to `c`, one note at a time. Play the top note once and turn. The first octave is written; carry on.",
      "演奏兩個八度的 C 大調：從中央 C（`c`）上行到 `c''`，再下行回到 `c`，一次一個音。最高音只奏一次就轉身。第一個八度已經寫好，接著寫下去。",
    ],
    why: [
      "Scales over two octaves are a daily warm-up on every instrument: the step pattern (whole, whole, half, whole, whole, whole, half) repeats in each octave, and coming down it runs backwards. The checker tests every step, so a skipped or repeated note shows up at its bar.",
      "兩個八度的音階是每種樂器每天的暖身：步距模式（全、全、半、全、全、全、半）在每個八度重複，下行時倒過來走。檢查器檢查每一步，所以漏掉或重複的音會在它的小節被找出來。",
    ],
    starter: `# C major, two octaves: c up to c'' and back down to c.
score = tiny("c4 d e f g a b c'", inst="piano")
`,
    rules: scaleRules(60, 2, MAJOR_STEPS),
  },
  {
    id: "scale-g-violin",
    category: "basics",
    level: "L1",
    uses: SCALE_USES,
    title: ["A violinist's two-octave G major", "小提琴家的兩個八度 G 大調"],
    task: [
      "Write the scale every violinist learns first: G major from the open G string (`G`, the G below middle C) up two octaves to `g'`, and back down. The key signature has one sharp, but tiny() still needs every F♯ written as `f#`.",
      "寫出每位小提琴家最先學的音階：從空弦 G（`G`，中央 C 下方的 G）上行兩個八度到 `g'`，再下行回來。調號有一個升記號，但 tiny() 仍然要把每個 F♯ 寫成 `f#`。",
    ],
    why: [
      "G3 is the lowest note a violin can play, so G major over two octaves uses the whole lower half of the instrument and crosses all four strings. Stay within the violin's range: nothing below the open G.",
      "G3 是小提琴能演奏的最低音，所以兩個八度的 G 大調用到樂器下半部的全部音域，跨過四條弦。保持在小提琴的音域內：不能低於空弦 G。",
    ],
    starter: `# G major for violin, two octaves: G up to g' and back down to G.
score = tiny("G4 A B c d e f# g", name="Violin", inst="violin", key_sig="G")
`,
    rules: [...scaleRules(55, 2, MAJOR_STEPS), { id: "range", part: 0, low: 55, high: 103 }],
  },
  {
    id: "scale-d-two-octaves",
    category: "basics",
    level: "L1",
    uses: SCALE_USES,
    title: ["D major, two octaves", "D 大調，兩個八度"],
    task: [
      "D major from `d` (D4) up to `d''` (D6) and back down, for flute. Two sharps this time: F♯ and C♯, in both octaves.",
      "給長笛的 D 大調：從 `d`（D4）上行到 `d''`（D6）再下行回來。這次有兩個升記號：F♯ 和 C♯，兩個八度都要。",
    ],
    why: [
      "The same step pattern starting on another note needs other black keys: D major's are F♯ and C♯. Mind the octave marks: in the second octave the sharp comes after them, `f'#` and `c''#`.",
      "從另一個音開始的同一步距模式，需要不同的黑鍵：D 大調是 F♯ 和 C♯。注意八度記號：在第二個八度，升記號寫在它們後面，`f'#` 和 `c''#`。",
    ],
    starter: `# D major, two octaves: d up to d'' and back down to d.
score = tiny("d4 e f# g a b c'# d'", name="Flute", inst="flute", key_sig="D")
`,
    rules: scaleRules(62, 2, MAJOR_STEPS),
  },
  {
    id: "scale-c-three-octaves",
    category: "basics",
    level: "L2",
    uses: SCALE_USES,
    title: ["C major, three octaves", "C 大調，三個八度"],
    task: [
      "A pianist's scale: C major from `C` (C3) up three octaves to `c''` (C6) and back down to `C`.",
      "鋼琴家的音階：C 大調從 `C`（C3）上行三個八度到 `c''`（C6），再下行回到 `C`。",
    ],
    why: [
      "Three octaves means three kinds of octave mark in one line: capitals, small letters, then small letters with `'` and `''`. Each change of octave mark is still a single step, from `B` to `c` and from `b` to `c'`.",
      "三個八度代表一行裡有三種八度寫法：大寫、小寫，然後是加 `'` 和 `''` 的小寫。每次換八度記號仍然只是一步：從 `B` 到 `c`，從 `b` 到 `c'`。",
    ],
    starter: `# C major, three octaves: C up to c'' and back down to C.
score = tiny("C4 D E F G A B c", inst="piano")
`,
    rules: scaleRules(48, 3, MAJOR_STEPS),
  },
  {
    id: "scale-a-harmonic-minor",
    category: "basics",
    level: "L2",
    uses: SCALE_USES,
    title: ["A harmonic minor, two octaves", "A 和聲小調，兩個八度"],
    task: [
      "A harmonic minor from `A` (A3) up two octaves to `a'` (A5) and back down: the natural minor with a raised seventh, G♯, both ways.",
      "A 和聲小調：從 `A`（A3）上行兩個八度到 `a'`（A5）再下行回來：自然小調把第七音升高成 G♯，上下行都一樣。",
    ],
    why: [
      "Raising the seventh gives minor keys a leading note a half step below the tonic, but leaves a gap of three half steps (an augmented second) between F and G♯: the sound that makes harmonic minor sound \"exotic\".",
      "升高第七音讓小調有了比主音低半音的導音，但在 F 與 G♯ 之間留下三個半音的空隙（增二度）：這就是和聲小調聽起來「異國風」的原因。",
    ],
    starter: `# A harmonic minor, two octaves: A up to a' and back down to A.
score = tiny("A4 B c d e f g# a", inst="piano")
`,
    rules: scaleRules(57, 2, HARMONIC_MINOR_STEPS),
  },
  {
    id: "scale-a-melodic-minor",
    category: "basics",
    level: "L2",
    uses: SCALE_USES,
    title: ["A melodic minor, two octaves", "A 旋律小調，兩個八度"],
    task: [
      "A melodic minor over two octaves, A3 to A5 and back. Going up, raise the sixth and seventh (F♯, G♯); coming down, play the natural minor (G, F).",
      "兩個八度的 A 旋律小調，A3 到 A5 再回來。上行時升高第六、第七音（F♯、G♯）；下行時演奏自然小調（G、F）。",
    ],
    why: [
      "Melodic minor smooths out harmonic minor's augmented second on the way up, and on the way down drops back to the natural minor, since there is no leading note to pull toward. The checker uses a different step pattern for each direction.",
      "旋律小調上行時把和聲小調的增二度變得平順；下行時沒有需要導向主音的導音，所以回到自然小調。檢查器對上行與下行使用不同的步距模式。",
    ],
    starter: `# A melodic minor, two octaves: up with F sharp and G sharp, down with G and F.
score = tiny("A4 B c d e f# g# a", inst="piano")
`,
    rules: scaleRules(57, 2, MELODIC_MINOR_STEPS, NATURAL_MINOR_STEPS),
  },
  {
    id: "ode-for-flute",
    category: "basics",
    uses: ["syntax-rhythm-dots", "syntax-part", "syntax-score", "syntax-transpose"],
    level: "L1",
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
  ...TECHNIQUE_LESSONS,
  ...TECHNIQUE_PROBLEMS,
  {
    id: "species-1-above",
    category: "counterpoint",
    uses: ["syntax-note", "syntax-score"],
    level: "L2",
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
    category: "counterpoint",
    uses: ["syntax-note", "syntax-score"],
    level: "L2",
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
    category: "arranging",
    uses: ["syntax-rhythm-values", "syntax-part", "syntax-score"],
    level: "L3",
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
