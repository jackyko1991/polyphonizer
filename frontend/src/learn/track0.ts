/**
 * Track 0, "Syntax basics": one idea per lesson, before the problems. Each lesson is a Problem (so the library, the
 * checker and the progress marks treat it like any other) with a `lesson` number; its explanation, with code beside
 * the drawn notes, is in lessons.tsx. Starters have `___` blanks to fill (LearnPage refuses to run a blank and says
 * which line it is on). Every starter fails its rules and every reference solution (tests/learn/solutions.ts) passes.
 * Tunes are public domain: "Ah ! vous dirai-je, maman" (Twinkle), Beethoven's Ode to Joy (1824).
 */
import type { Problem } from "../problems.ts";

const TWINKLE_C4 = [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60];
const ODE = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62];
const ODE_DURS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2];

export const LESSONS: Problem[] = [
  {
    id: "syntax-note",
    lesson: "1",
    category: "syntax",
    level: "L0",
    title: ["A note", "一個音"],
    task: [
      "This line climbs from G3 (`G`, below middle C) to D5 (`d'`) one step at a time. It crosses two octave boundaries, and both Cs are missing: fill each `___` with the right C.",
      "這一行從 G3（`G`，中央 C 下方）一步一步爬到 D5（`d'`）。它跨過兩個八度的分界，而兩個 C 都不見了：在每個 `___` 填入正確的 C。",
    ],
    why: [
      "A pitch is a letter and an octave. tinyNotation writes the octave in the letter itself: capitals below middle C (doubled for each octave down), small letters from middle C up, with a `'` for each octave higher. The octave starts on C, so `B` and `c` are neighbours, and so are `b` and `c'`: steps, not leaps.",
      "音高是音名加上八度。tinyNotation 把八度寫在字母裡：中央 C 以下用大寫（每低一個八度多寫一次），中央 C 起用小寫，每高一個八度加一個 `'`。八度從 C 開始，所以 `B` 和 `c` 是鄰居，`b` 和 `c'` 也是：都是級進，不是跳進。",
    ],
    starter: `# From G3 up to D5, one step at a time. Fill each blank with a C.
score = tiny("G4 A B ___ d e f g a b ___ d'")
`,
    rules: [
      { id: "count", part: 0, count: 12 },
      { id: "pitches", part: 0, midi: [55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74] },
      { id: "lowest", part: 0, midi: 55 },
      { id: "highest", part: 0, midi: 74 },
    ],
  },
  {
    id: "syntax-rhythm-values",
    lesson: "2a",
    category: "syntax",
    level: "L0",
    title: ["Rhythm: note values", "節奏：音符時值"],
    task: [
      "Twinkle, Twinkle: the pitches are written, the lengths are missing. Fill the blanks so each phrase ends on a half note (`2`) and the other notes are quarter notes (`4`). Remember that a number carries on to the next notes until a new one appears.",
      "〈小星星〉：音高寫好了，長度還缺。填入空格，讓每個樂句結束在二分音符（`2`），其他音都是四分音符（`4`）。記得：數字會延續到後面的音，直到出現新的數字。",
    ],
    why: [
      "The number after a pitch is the note value: 1 whole, 2 half, 4 quarter, 8 eighth, 16 sixteenth (bigger number, shorter note). Writing it only when it changes keeps lines short, but it also means a forgotten number silently stretches every note after it.",
      "音高後面的數字是時值：1 全音符、2 二分、4 四分、8 八分、16 十六分（數字越大，音越短）。只在改變時才寫，讓程式碼更短；但忘了寫數字，後面所有的音都會悄悄跟著變長。",
    ],
    starter: `# Twinkle, Twinkle: fill in the note values (4 = quarter, 2 = half).
score = tiny("c4 c g g a a g___ f___ f e e d d c___")
`,
    rules: [
      { id: "pitches", part: 0, midi: TWINKLE_C4 },
      { id: "rhythm", part: 0, durs: [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2] },
      { id: "barsFull" },
    ],
  },
  {
    id: "syntax-rhythm-dots",
    lesson: "2b",
    category: "syntax",
    level: "L0",
    title: ["Rhythm: dots and rests", "節奏：附點與休止"],
    task: [
      "The first line of Beethoven's Ode to Joy ends with a limp: a dotted quarter, an eighth, then a half note. Fill the two blanks (`e4.` is one and a half beats).",
      "貝多芬〈快樂頌〉第一句結尾有個「跛步」：附點四分音符、八分音符，然後二分音符。填入兩個空格（`e4.` 是一拍半）。",
    ],
    why: [
      "A dot adds half the note's value: `c4.` lasts 1½ beats, `c2.` 3 beats. A rest is the letter `r` with a value (`r4`, `r2`): silence has a length too. The dotted quarter and eighth together fill two beats, so the bar still adds up.",
      "附點加上音符一半的時值：`c4.` 是 1½ 拍，`c2.` 是 3 拍。休止符是字母 `r` 加時值（`r4`、`r2`）：沉默也有長度。附點四分加八分剛好兩拍，所以小節仍然完整。",
    ],
    starter: `# Ode to Joy: fill in the dotted ending (a dotted quarter, then an eighth).
score = tiny("e4 e f g g f e d c c d e e___ d___ d2")
`,
    rules: [
      { id: "pitches", part: 0, midi: ODE },
      { id: "rhythm", part: 0, durs: ODE_DURS },
      { id: "barsFull" },
    ],
  },
  {
    id: "syntax-rhythm-bars",
    lesson: "2c",
    category: "syntax",
    level: "L0",
    title: ["Rhythm: ties and full bars", "節奏：連結線與完整的小節"],
    task: [
      "Bar 2 has five beats in a 4/4 bar: the `a2` starts on beat 4 and runs past the barline. Fix it without changing how the tune sounds: split the note at the barline and join the halves with a tie (`~`).",
      "第 2 小節在 4/4 拍裡有五拍：`a2` 從第 4 拍開始，越過了小節線。修正它，但不改變聽起來的樣子：在小節線處把音分開，用連結線（`~`）接起來。",
    ],
    why: [
      "Every bar must add up to its time signature. A note longer than the room left in its bar is written as two notes tied across the barline: `c2~ c4` sounds as one note three beats long. tiny() does not split notes for you; it makes the bar too long, and the checker finds it.",
      "每個小節的總長都必須等於拍號。比小節剩下空間還長的音，要寫成兩個音並以連結線跨過小節線：`c2~ c4` 聽起來是一個三拍長的音。tiny() 不會替你拆開，它會讓小節變得太長，而檢查器會找到它。",
    ],
    starter: `# Bar 2 doesn't add up. Fix it without changing how the tune sounds.
score = tiny("c4 e g c' b2. a2 g4 f e d2 c2")
`,
    rules: [
      { id: "pitches", part: 0, midi: [60, 64, 67, 72, 71, 69, 67, 65, 64, 62, 60] },
      { id: "rhythm", part: 0, durs: [1, 1, 1, 1, 3, 2, 1, 1, 1, 2, 2] },
      { id: "barsFull" },
    ],
  },
  {
    id: "syntax-rhythm-time",
    lesson: "2d",
    category: "syntax",
    level: "L0",
    title: ["Rhythm: time signatures", "節奏：拍號"],
    task: [
      "This little waltz was written in 4/4, so its bars don't add up. Fill in the time signature that makes every bar full: three quarter notes in a bar.",
      "這首小圓舞曲被寫成 4/4，所以小節加起來不對。填入讓每個小節都完整的拍號：每小節三個四分音符。",
    ],
    why: [
      "The time signature says how many beats a bar holds: 4/4 four quarters, 3/4 three (a waltz), 6/8 six eighths felt as two dotted-quarter beats (a jig). The same notes regroup into different bars, and the strong beats move with them.",
      "拍號說明一個小節有幾拍：4/4 是四個四分音符，3/4 是三個（圓舞曲），6/8 是六個八分音符、感覺成兩個附點四分音符的拍子（吉格舞曲）。同樣的音會重新分組成不同的小節，強拍也跟著移動。",
    ],
    starter: `# A waltz: three beats in a bar. Fill in the time signature.
score = tiny("c2 e4 g2 g4 a2 g4 f2.", time="___")
`,
    rules: [
      { id: "timeSig", time: "3/4" },
      { id: "barsFull" },
      { id: "rhythm", part: 0, durs: [2, 1, 2, 1, 2, 1, 3] },
    ],
  },
  {
    id: "syntax-accidentals",
    lesson: "3",
    category: "syntax",
    level: "L0",
    title: ["Sharps and flats", "升記號與降記號"],
    task: [
      "Finish the D major scale, one octave up from `d`: D E F♯ G A B C♯ D. Fill the two blanks with the sharp notes. Careful with the second one: it is in the octave above middle C.",
      "完成 D 大調音階，從 `d` 上行一個八度：D E F♯ G A B C♯ D。在兩個空格填入升記號的音。小心第二個：它在中央 C 上面那個八度。",
    ],
    why: [
      "`#` raises a note a half step, `-` lowers it (`b-` is B♭; `b` alone would be the note B), `n` writes a natural sign. In tinyNotation the octave mark comes before the accidental: `f'#` is F♯5. `f#'` reads as F♯4 followed by a stray mark, so the note lands an octave low.",
      "`#` 把音升高半音，`-` 降低半音（`b-` 是 B♭；單獨的 `b` 是 B 音），`n` 寫出還原記號。在 tinyNotation 裡，八度記號寫在變音記號之前：`f'#` 是 F♯5。`f#'` 會被讀成 F♯4，音會低一個八度。",
    ],
    starter: `# D major: fill the blanks with F sharp and C sharp.
score = tiny("d4 e ___ g a b ___ d'")
`,
    rules: [
      { id: "count", part: 0, count: 8 },
      { id: "pitches", part: 0, midi: [62, 64, 66, 67, 69, 71, 73, 74] },
      { id: "steps", part: 0, semitones: [2, 2, 1, 2, 2, 2, 1] },
    ],
  },
  {
    id: "syntax-part",
    lesson: "4",
    category: "syntax",
    level: "L0",
    title: ["A part", "一個聲部"],
    task: [
      "Make this tune a violin part in G major and 3/4 time: name it `\"Violin\"`, set its instrument to `\"violin\"`, its key signature to `\"G\"` and its time to `\"3/4\"`.",
      "把這段旋律做成 G 大調、3/4 拍的小提琴聲部：命名為 `\"Violin\"`，樂器設為 `\"violin\"`，調號設為 `\"G\"`，拍號設為 `\"3/4\"`。",
    ],
    why: [
      "`tiny()` turns a line of notes into a music21 Part. Its keywords say what a player sees at the start of the part: the name on the left of the staff, the instrument (which also picks the sound), the key signature and the time. The key signature only changes how the notes are printed: you still write `f#` for F♯.",
      "`tiny()` 把一行音符變成 music21 的 Part（聲部）。它的關鍵字參數決定演奏者在聲部開頭看到的東西：譜表左邊的名稱、樂器（也決定音色）、調號和拍號。調號只改變音符的印法：F♯ 仍然要寫成 `f#`。",
    ],
    starter: `# A violin part in G major, three beats in a bar.
score = tiny("d4 g a b2 a4 g2.", name="___", inst="___", key_sig="___", time="___")
`,
    rules: [
      { id: "partName", part: 0, name: "Violin" },
      { id: "instrument", part: 0, program: 40 },
      { id: "keySig", key: "G major" },
      { id: "timeSig", time: "3/4" },
      { id: "barsFull" },
    ],
  },
  {
    id: "syntax-score",
    lesson: "5",
    category: "syntax",
    level: "L0",
    title: ["A score", "一份總譜"],
    task: [
      "Put the two parts together into a score: the flute on top, the cello below, at 72 beats a minute.",
      "把兩個聲部放進一份總譜：長笛在上，大提琴在下，每分鐘 72 拍。",
    ],
    why: [
      "`together(a, b, …)` stacks parts into a score, top to bottom in the order you give them; `bpm=` sets the tempo in quarter notes a minute and `title=` the title. Whatever ends up in the variable `score` is what gets drawn, played and checked, so the last line of every exercise is a `score =` line.",
      "`together(a, b, …)` 把聲部疊成總譜，依你給的順序由上而下；`bpm=` 設定速度（每分鐘幾個四分音符），`title=` 設定標題。最後放在變數 `score` 裡的東西，就是會被畫出、播放和檢查的東西，所以每個練習的最後一行都是 `score =`。",
    ],
    starter: `flute = tiny("e'2 d' c'1", name="Flute", inst="flute")
cello = tiny("C2 GG C1", name="Cello", inst="cello")
# The flute on top, the cello below, 72 beats a minute.
score = together(___, ___, bpm=___)
`,
    rules: [
      { id: "parts", count: 2 },
      { id: "partName", part: 0, name: "Flute" },
      { id: "partName", part: 1, name: "Cello" },
      { id: "tempo", bpm: 72 },
    ],
  },
  {
    id: "syntax-transpose",
    lesson: "6",
    category: "syntax",
    level: "L0",
    title: ["A first music21 call: transpose", "第一個 music21 呼叫：移調"],
    task: [
      "Make the flute play the violin's melody a perfect fifth higher by calling `.transpose()` with the interval's name. A perfect fifth is `\"P5\"`.",
      "用音程名稱呼叫 `.transpose()`，讓長笛演奏小提琴旋律的高完全五度。完全五度寫成 `\"P5\"`。",
    ],
    why: [
      "A part is a music21 object, so it has methods: `part.transpose(\"P5\")` returns a copy moved up a perfect fifth (`\"M2\"` a major second, `\"m3\"` a minor third, `\"P8\"` an octave, `\"-P8\"` an octave down; a number moves by semitones). Every note moves by the same interval, so the tune stays the same tune. This is the whole of the next problem, Ode to Joy for flute and violin, in one line.",
      "聲部是 music21 物件，所以有方法：`part.transpose(\"P5\")` 傳回升高完全五度的副本（`\"M2\"` 大二度、`\"m3\"` 小三度、`\"P8\"` 八度、`\"-P8\"` 低八度；整數則以半音移動）。每個音移動相同的音程，所以旋律還是同一首。下一題〈快樂頌〉給長笛與小提琴，就是這一行的事。",
    ],
    starter: `violin = tiny("c4 d e f g1", name="Violin", inst="violin")
# The flute: the same melody a perfect fifth higher.
flute = violin.transpose("___")
flute.partName = "Flute"
score = together(flute, violin)
`,
    rules: [
      { id: "parts", count: 2 },
      { id: "pitches", part: 1, midi: [60, 62, 64, 65, 67] },
      { id: "transposed", part: 0, from: [60, 62, 64, 65, 67], by: 7 },
    ],
  },
];
