/** Concept ▸ Music theory as code (#/concept/theory[/<section>]). Every code example here runs as score code. */
import { useLang } from "@learnkit/web";
import { Callout, Figure, Notation, P, Page, Py, Section, SiteLink, Sources, Table, TryIn, type L, type SectionInfo } from "../kit";

const PAGE = "theory";

const SECTIONS: SectionInfo[] = [
  { id: "pitch", title: ["Pitch as a number", "音高是數字"] },
  { id: "intervals", title: ["Intervals and consonance", "音程與協和"] },
  { id: "motion", title: ["Two voices: kinds of motion", "兩個聲部：進行的種類"] },
  { id: "time", title: ["Rhythm and metre", "節奏與拍子"] },
  { id: "keys", title: ["Keys, scales and transposition", "調、音階與移調"] },
];

const PITCH = `# Under each note: its MIDI number, then its pitch class (the number mod 12).
line = tiny("c4 c# d- d e f g a b c'2.", name="Piano", inst="piano")
for n in line.recurse().notes:
    n.addLyric(str(n.pitch.midi))
    n.addLyric(str(n.pitch.pitchClass))
score = line
`;

const INTERVALS = `# Name every vertical interval, and its size in semitones, under the upper voice.
upper = tiny("a1 d' c' d'", name="Counterpoint")
lower = tiny("d1 f e d", name="Cantus firmus")
for u, l in zip(upper.recurse().notes, lower.recurse().notes):
    iv = interval.Interval(l.pitch, u.pitch)
    u.lyric = f"{iv.name} = {iv.semitones}"
score = together(upper, lower)
`;

const TIME = `# Under each note: where it starts in its bar, and how long it lasts, in quarter notes.
line = tiny("c4 d8 e f4 g4. a8 trip{b8 c' d'} e'2 d'4~ d'4 c'2", time="3/4", inst="flute")
for n in line.recurse().notes:
    n.lyric = f"{n.offset} + {n.quarterLength}"
score = line
`;

const SCALES = `MAJOR = [2, 2, 1, 2, 2, 2, 1]          # whole, whole, half, whole, whole, whole, half

def scale_from(tonic, steps):
    """MIDI numbers of a scale: start on the tonic, then add each step."""
    out = [tonic]
    for s in steps:
        out.append(out[-1] + s)
    return out

c_major = scale_from(60, MAJOR)                  # 60 = C4
d_dorian = scale_from(62, MAJOR[1:] + MAJOR[:1])  # the same steps, started one later
part = stream.Part()
for m in c_major + d_dorian:
    part.append(note.Note(m, quarterLength=0.5))
score = part.makeMeasures()   # group the notes into 4/4 bars
`;

const TRANSPOSE = `tune = tiny("c4 d e c c d e c e f g2 e4 f g2", name="In C", key_sig="C")
up_a_fifth = tune.transpose("P5")      # every note + 7 semitones, spelled in G
up_a_fifth.partName = "In G"
score = together(tune, up_a_fifth)
`;

/** One octave of the keyboard, C4 to C5, with MIDI numbers and pitch classes. */
function Keyboard() {
  const { pick } = useLang();
  const KW = 44;
  const X0 = 70;
  const whites = [60, 62, 64, 65, 67, 69, 71, 72];
  const names = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
  // black keys sit after these white-key indices
  const blacks: [number, number][] = [
    [0, 61],
    [1, 63],
    [3, 66],
    [4, 68],
    [5, 70],
  ];
  return (
    <svg viewBox="0 0 500 200" className="w-full max-w-[500px]" role="img" aria-label={pick(["An octave of the keyboard with MIDI numbers", "鍵盤上的一個八度與 MIDI 編號"])}>
      <text x={X0 - 8} y={128} textAnchor="end" className="fill-gray-500 text-[10px]">
        MIDI
      </text>
      <text x={X0 - 8} y={152} textAnchor="end" className="fill-gray-500 text-[10px]">
        {pick(["mod 12", "mod 12"])}
      </text>
      {whites.map((m, i) => (
        <g key={m}>
          <rect x={X0 + i * KW} y={20} width={KW} height={120} rx={3} className="fill-white stroke-gray-400" strokeWidth={1} />
          <text x={X0 + i * KW + KW / 2} y={128} textAnchor="middle" className={`text-[12px] font-semibold ${m === 60 || m === 69 ? "fill-rose-700" : "fill-gray-800"}`}>
            {m}
          </text>
          <text x={X0 + i * KW + KW / 2} y={152} textAnchor="middle" className="fill-gray-500 text-[11px]">
            {m % 12}
          </text>
          <text x={X0 + i * KW + KW / 2} y={170} textAnchor="middle" className="fill-gray-700 text-[11px]">
            {names[i]}
          </text>
        </g>
      ))}
      {blacks.map(([after, m]) => (
        <g key={m}>
          <rect x={X0 + (after + 1) * KW - 14} y={20} width={28} height={72} rx={2} className="fill-gray-800" />
          <text x={X0 + (after + 1) * KW} y={82} textAnchor="middle" className="fill-white text-[10px]">
            {m}
          </text>
        </g>
      ))}
      <text x={X0 + KW / 2} y={190} textAnchor="middle" className="fill-rose-700 text-[10px]">
        {pick(["middle C", "中央 C"])}
      </text>
      <text x={X0 + 5 * KW + KW / 2} y={190} textAnchor="middle" className="fill-rose-700 text-[10px]">
        440 Hz
      </text>
    </svg>
  );
}

const KINDS: { name: L; cls: string }[] = [
  { name: ["perfect consonance", "完全協和"], cls: "fill-rose-700" },
  { name: ["imperfect consonance", "不完全協和"], cls: "fill-rose-200" },
  { name: ["dissonance", "不協和"], cls: "fill-gray-200" },
];
/** kind of each interval 0..12 in two-voice counterpoint: 0 perfect, 1 imperfect, 2 dissonant (the fourth counts as dissonant) */
const KIND_OF = [0, 2, 2, 1, 1, 2, 2, 0, 1, 1, 2, 2, 0];
const IV_NAMES = ["P1", "m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7", "P8"];

/** The intervals from 0 to 12 semitones, coloured by how two-voice counterpoint treats them. */
function IntervalStrip() {
  const { pick } = useLang();
  const CW = 40;
  const X0 = 10;
  return (
    <svg viewBox="0 0 540 120" className="w-full max-w-[540px]" role="img" aria-label={pick(["Intervals from 0 to 12 semitones", "0 到 12 個半音的音程"])}>
      {KIND_OF.map((k, i) => (
        <g key={i}>
          <rect x={X0 + i * CW} y={10} width={CW - 4} height={40} rx={4} className={KINDS[k].cls} />
          <text x={X0 + i * CW + (CW - 4) / 2} y={28} textAnchor="middle" className={`text-[12px] font-semibold ${k === 0 ? "fill-white" : "fill-gray-900"}`}>
            {i}
          </text>
          <text x={X0 + i * CW + (CW - 4) / 2} y={43} textAnchor="middle" className={`text-[10px] ${k === 0 ? "fill-white" : "fill-gray-600"}`}>
            {IV_NAMES[i]}
          </text>
        </g>
      ))}
      <text x={X0} y={68} className="fill-gray-500 text-[10px]">
        {pick(["semitones apart, and the interval's short name (TT = tritone)", "相距的半音數與音程簡稱（TT = 三全音）"])}
      </text>
      {KINDS.map((k, i) => (
        <g key={i}>
          <rect x={X0 + i * 170} y={86} width={14} height={14} rx={3} className={k.cls} />
          <text x={X0 + i * 170 + 20} y={97} className="fill-gray-700 text-[11px]">
            {pick(k.name)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function TheoryConcept({ section }: { section: string | null }) {
  return (
    <Page
      id={PAGE}
      title={["Music theory as code", "以程式碼表達樂理"]}
      intro={[
        "Under the theory there is a small amount of very friendly maths: **pitches are numbers**, **intervals are differences**, **durations are fractions**, and **scales and keys are sets**. Once you see them that way, a rule of theory becomes a line of code, and a line of code becomes something you can hear. No maths beyond adding, subtracting and remainders is needed.",
        "樂理底下有一點非常友善的數學：**音高是數字**、**音程是差值**、**時值是分數**、**音階與調是集合**。用這種方式看，一條樂理規則就變成一行程式碼，而一行程式碼又變成你聽得見的東西。只需要加、減和餘數，不需要更多數學。",
      ]}
      sections={SECTIONS}
      focus={section}
    >
      <Section page={PAGE} id="pitch" n={1} title={SECTIONS[0].title}>
        <P
          t={[
            "Number the keys of a piano from left to right, one per semitone, and you have **MIDI note numbers**, the numbering every computer music system shares. Middle C is **60**, the A above it is **69**, and each step up the keyboard, white key or black, adds 1.",
            "把鋼琴的琴鍵從左到右編號，每個半音一號，就得到 **MIDI 音符編號**，所有電腦音樂系統共用的編號方式。中央 C 是 **60**，它上方的 A 是 **69**，在鍵盤上每往上一鍵，不論黑鍵白鍵，就加 1。",
          ]}
        />
        <Figure
          caption={[
            "One octave, C4 to C5. Each key's MIDI number, its pitch class ($n \\bmod 12$) and its name. Twelve steps up, the pitch class comes back to 0.",
            "一個八度，C4 到 C5。每個琴鍵的 MIDI 編號、音級（$n \\bmod 12$）與音名。往上十二步，音級又回到 0。",
          ]}
        >
          <Keyboard />
        </Figure>
        <P
          t={[
            "Two numbers fall out of the MIDI number $n$. The **pitch class** $n \\bmod 12$ says *which note* it is, whatever the octave: every C is 0, every G is 7. The **octave** $\\lfloor n/12 \\rfloor - 1$ says *which one*: $\\lfloor 60/12 \\rfloor - 1 = 4$, hence the name C4.",
            "從 MIDI 編號 $n$ 可以得到兩個數字。**音級** $n \\bmod 12$ 說的是*哪個音*，不管在哪個八度：每個 C 都是 0，每個 G 都是 7。**八度** $\\lfloor n/12 \\rfloor - 1$ 說的是*哪一個*：$\\lfloor 60/12 \\rfloor - 1 = 4$，所以叫 C4。",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
"^C4 = 60"C2 "^C5 = 72"c2 | C D E F | G A B c |]`}
          caption={[
            "Middle C (C4, 60) and the C an octave up (C5, 72): same pitch class, 0, one octave apart. Then the C major scale climbing from one to the other.",
            "中央 C（C4，60）與高一個八度的 C（C5，72）：音級相同，都是 0，相差一個八度。接著是從一個爬到另一個的 C 大調音階。",
          ]}
        />
        <Py
          code={PITCH}
          note={[
            "In tinyNotation `#` is a sharp and `-` a flat. Look at the second and third notes: C♯ and D♭ are both 61.",
            "在 tinyNotation 裡，`#` 是升記號，`-` 是降記號。看第二和第三個音：C♯ 與 D♭ 都是 61。",
          ]}
        />
        <P
          t={[
            "So the number is not the whole story. C♯ and D♭ are the same key but **different notes on paper**, and the difference matters: in D major the leading note is C♯, never D♭. music21 keeps the spelling (`pitch.name`) as well as the number (`pitch.midi`); MIDI files keep only the number.",
            "所以數字並不是全部。C♯ 和 D♭ 是同一個琴鍵，卻是**紙上不同的音**，而且這個差別很重要：在 D 大調裡，導音是 C♯，絕不會是 D♭。music21 同時保存拼法（`pitch.name`）和數字（`pitch.midi`）；MIDI 檔則只保存數字。",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
"^C♯4 = 61"^C2 "^D♭4 = 61"_D2 | B, ^C D2 |]`}
          caption={[
            "Bar 1: one key, 61, written two ways. Bar 2: the top of a D major scale, B–C♯–D: the leading note is written C♯, on the step just below D, never D♭ on the same step as D.",
            "第 1 小節：同一個琴鍵 61，兩種寫法。第 2 小節：D 大調音階的頂端 B–C♯–D：導音寫成 C♯，在 D 下方相鄰的位置，絕不寫成和 D 同一個位置的 D♭。",
          ]}
        />
        <P
          t={[
            "**Frequency.** In equal temperament each semitone multiplies the frequency by $2^{1/12} \\approx 1.0595$, so twelve semitones double it: one octave. With A4 tuned to 440 Hz, note $n$ sounds at $f = 440 \\cdot 2^{(n-69)/12}$ Hz.",
            "**頻率。** 在平均律裡，每個半音把頻率乘以 $2^{1/12} \\approx 1.0595$，所以十二個半音就是加倍：一個八度。把 A4 調到 440 Hz 時，第 $n$ 號音的頻率是 $f = 440 \\cdot 2^{(n-69)/12}$ Hz。",
          ]}
        />
        <P
          t={[
            "Middle C, $n = 60$, is $440 \\cdot 2^{-9/12} \\approx 261.63$ Hz. 440 Hz is the usual modern reference, but not the only one: many orchestras tune a little higher, and Baroque ensembles often play at A = 415 Hz, about a semitone lower. You can change the reference in the editor's sound settings.",
            "中央 C，$n = 60$，是 $440 \\cdot 2^{-9/12} \\approx 261.63$ Hz。440 Hz 是現代通用的標準，但不是唯一的：許多樂團調得稍高一些，巴洛克樂團則常用 A = 415 Hz，大約低一個半音。你可以在編輯器的聲音設定裡更改這個基準。",
          ]}
        />
        <Sources
          items={[
            { label: "Wikipedia: Scientific pitch notation", url: "https://en.wikipedia.org/wiki/Scientific_pitch_notation" },
            { label: "Wikipedia: Piano key frequencies", url: "https://en.wikipedia.org/wiki/Piano_key_frequencies" },
            { label: "Wikipedia: Concert pitch", url: "https://en.wikipedia.org/wiki/Concert_pitch" },
            { label: "music21: pitch module", url: "https://www.music21.org/music21docs/moduleReference/modulePitch.html" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="intervals" n={2} title={SECTIONS[1].title}>
        <P
          t={[
            "If pitches are numbers, an **interval** is a difference: from D4 (62) up to A4 (69) is $69 - 62 = 7$ semitones, a perfect fifth. Take the difference mod 12 and you get the **interval class**, which ignores whole octaves: a twelfth (19 semitones) is a fifth plus an octave, and $19 \\bmod 12 = 7$.",
            "如果音高是數字，**音程**就是差值：從 D4（62）往上到 A4（69）是 $69 - 62 = 7$ 個半音，一個完全五度。差值取 mod 12，就得到**音程類別**，不計整個八度：十二度（19 個半音）是五度加一個八度，而 $19 \\bmod 12 = 7$。",
          ]}
        />
        <Figure
          caption={[
            "The intervals within an octave, as two-voice counterpoint treats them. The fourth (5) is consonant in many contexts, but against the lowest voice it counts as a dissonance.",
            "一個八度內的音程，以及二聲部對位如何看待它們。四度（5）在許多情境下是協和的，但相對於最低聲部，它被當作不協和音程。",
          ]}
        >
          <IntervalStrip />
        </Figure>
        <P
          t={[
            "Why are unison, fifth and octave called **perfect**? Their frequencies stand in the simplest ratios: 1 : 1, 3 : 2 and 2 : 1. Two notes in such a ratio share many overtones and blend almost into one sound. Thirds (5 : 4, 6 : 5) and sixths (5 : 3, 8 : 5) are a little less simple: consonant, but **imperfect**, sweet without merging.",
            "為什麼同度、五度和八度叫作**完全**音程？它們的頻率比最簡單：1 : 1、3 : 2 和 2 : 1。成這種比例的兩個音有許多共同的泛音，幾乎融成一個聲音。三度（5 : 4、6 : 5）和六度（5 : 3、8 : 5）稍微不那麼簡單：協和，但**不完全**，甜美而不融合。",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/2
K:C
"^P8"[Cc] "^P5"[CG] | "^M3"[CE] "^m6"[C_A] | "^M2"[CD] "^P4"[CF] | "^TT"[C^F] "^M7"[CB] |]`}
          caption={[
            "Over C: perfect consonances (P8, P5), imperfect ones (M3, m6), then the dissonances of two-voice counterpoint (M2, P4, tritone, M7). Play it: the last two bars rub.",
            "以 C 為低音：完全協和（P8、P5）、不完全協和（M3、m6），接著是二聲部對位裡的不協和音程（M2、P4、三全音、M7）。播放聽聽：最後兩小節會互相摩擦。",
          ]}
        />
        <Callout kind="note" title={["Equal temperament bends the ratios a little", "平均律把比例稍微拉彎了"]}>
          <P
            t={[
              "A piano's fifth is $2^{7/12} \\approx 1.4983$, not exactly $3/2 = 1.5$: about 2 cents (hundredths of a semitone) narrow, too little for most ears to notice. Thirds are further off, about 14 cents wide. That small compromise is what lets every key sound equally in tune.",
              "鋼琴上的五度是 $2^{7/12} \\approx 1.4983$，不完全是 $3/2 = 1.5$：大約窄了 2 音分（一個半音的百分之一），大多數人的耳朵聽不出來。三度差得更多，大約寬了 14 音分。正是這個小小的妥協，讓每個調聽起來都一樣準。",
            ]}
          />
        </Callout>
        <P
          t={[
            "For a program, all this becomes **sets**. Polyphonizer's checker uses two: the consonant interval classes $\\{0, 3, 4, 7, 8, 9\\}$ and, among them, the perfect ones $\\{0, 7\\}$. *Every pair of notes is consonant* turns into: for each pair, $(u - l) \\bmod 12$ is in the first set. Run this to see music21 name each interval:",
            "對程式來說，這一切都變成**集合**。Polyphonizer 的檢查器用兩個集合：協和的音程類別 $\\{0, 3, 4, 7, 8, 9\\}$，以及其中完全協和的 $\\{0, 7\\}$。*每一對音都協和*就變成：對每一對音，$(u - l) \\bmod 12$ 都在第一個集合裡。執行下面的程式碼，看 music21 為每個音程命名：",
          ]}
        />
        <Py
          code={INTERVALS}
          note={[
            "Shows P5 = 7, M6 = 9, m6 = 8, P8 = 12 under the notes. The name (M6, m6) keeps the spelling; the number does not: an augmented fifth and a minor sixth are both 8.",
            "音符下方會顯示 P5 = 7、M6 = 9、m6 = 8、P8 = 12。名稱（M6、m6）保留了拼法，數字則沒有：增五度和小六度都是 8。",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/1
K:C
V:1
"^P5"A | "^M6"d | "^m6"c | "^P8"d |]
V:2
D | F | E | D |]`}
          caption={[
            "The same two lines engraved: counterpoint A D C D above, cantus D F E D below. P5 = 7, M6 = 9, m6 = 8, P8 = 12 semitones.",
            "同樣兩條旋律的樂譜：上方對位 A D C D，下方定旋律 D F E D。P5 = 7、M6 = 9、m6 = 8、P8 = 12 個半音。",
          ]}
          instrument={40}
        />
        <TryIn ids={["species-1-below", "twinkle-duet"]} />
        <Sources
          items={[
            { label: "Wikipedia: Interval (music)", url: "https://en.wikipedia.org/wiki/Interval_(music)" },
            { label: "Wikipedia: Consonance and dissonance", url: "https://en.wikipedia.org/wiki/Consonance_and_dissonance" },
            { label: "Wikipedia: Equal temperament", url: "https://en.wikipedia.org/wiki/Equal_temperament" },
            { label: "music21: interval module", url: "https://www.music21.org/music21docs/moduleReference/moduleInterval.html" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="motion" n={3} title={SECTIONS[2].title}>
        <P
          t={[
            "Counterpoint rules are about how two voices **move together** from one pair of notes to the next. Call the upper voice's move $\\Delta u$ and the lower voice's $\\Delta l$, in semitones (positive = up). The four kinds of motion are conditions on those two numbers:",
            "對位規則談的是兩個聲部如何從一對音**一起移動**到下一對。把上方聲部的移動記作 $\\Delta u$、下方聲部的記作 $\\Delta l$，單位是半音（正數 = 上行）。四種進行，就是關於這兩個數字的條件：",
          ]}
        />
        <Table
          head={[
            ["Motion", "進行"],
            ["In words", "白話"],
            ["As a condition", "寫成條件"],
          ]}
          rows={[
            [["Contrary", "反向"], ["one goes up, the other down", "一個上行，另一個下行"], ["$\\Delta u \\cdot \\Delta l < 0$", "$\\Delta u \\cdot \\Delta l < 0$"]],
            [["Oblique", "斜向"], ["one moves, the other holds", "一個移動，另一個保持"], ["exactly one of $\\Delta u, \\Delta l$ is 0", "$\\Delta u, \\Delta l$ 恰有一個是 0"]],
            [["Similar", "同向"], ["both go the same way", "兩者往同一方向"], ["$\\Delta u \\cdot \\Delta l > 0$", "$\\Delta u \\cdot \\Delta l > 0$"]],
            [
              ["Parallel", "平行"],
              ["similar, and the interval stays the same", "同向，而且音程不變"],
              ["similar, and the interval class before = after", "同向，且前後的音程類別相同"],
            ],
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/2
K:C
V:1
"^M3"E "^m6"F | "^P5"G "^M6"A | "^P5"G "^m6"c | "^m3"F "^m3"G |]
V:2
C A, | C2 | C E | D E |]`}
          caption={[
            "One bar per row of the table. Bar 1, contrary: up a step against down a third. Bar 2, oblique: the lower C holds. Bar 3, similar: both rise, into a different interval. Bar 4, parallel: both rise a step, a minor third each time.",
            "表格每一列一小節。第 1 小節，反向：上方級進上行，下方三度下行。第 2 小節，斜向：下方的 C 保持不動。第 3 小節，同向：兩者都上行，到另一個音程。第 4 小節，平行：兩者都級進上行，每次都是小三度。",
          ]}
        />
        <P
          t={[
            "With these, the famous rule is one line: **no parallel motion into a perfect interval**. Polyphonizer's checker is a little stricter than that: it flags the same perfect interval class twice in a row whenever either voice moves, so a fifth to a twelfth in contrary motion counts too. *Direct* (or *hidden*) fifths and octaves, similar motion into a perfect interval from a different one, are only advice, and only when the upper voice leaps.",
            "有了這些，那條有名的規則就是一行：**不可以平行進行到完全音程**。Polyphonizer 的檢查器比這稍微嚴格一點：只要任一聲部移動，連續兩次出現相同的完全音程類別就會被標出，所以五度以反向進行到十二度也算。*直接*（或*隱伏*）五度與八度，也就是從不同的音程以同向進行到完全音程，只是建議，而且只在上方聲部跳進時才提出。",
          ]}
        />
        <p>
          <SiteLink to={["concept", "feynman", "fux"]} label={["Fux's four rules of motion, and where the checker differs", "福克斯的四條進行規則，以及檢查器的不同之處"]} />
        </p>
        <TryIn ids={["species-1-above", "species-1-below"]} />
        <Sources
          items={[
            { label: "Wikipedia: Counterpoint (kinds of motion)", url: "https://en.wikipedia.org/wiki/Counterpoint" },
            { label: "Wikipedia: Consecutive fifths", url: "https://en.wikipedia.org/wiki/Consecutive_fifths" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="time" n={4} title={SECTIONS[3].title}>
        <P
          t={[
            "music21 measures time in **quarter notes**: a quarter note lasts 1, a half note 2, an eighth $\\frac12$. A dot multiplies by $\\frac32$; a triplet squeezes three notes into the time of two, so each lasts $\\frac23$ of its written value. These are exact fractions, not rounded decimals, so three triplet eighths add up to exactly 1.",
            "music21 以**四分音符**為時間單位：四分音符長 1，二分音符長 2，八分音符長 $\\frac12$。附點乘以 $\\frac32$；三連音把三個音擠進兩個音的時間，所以每個音是寫出時值的 $\\frac23$。這些都是精確的分數，不是四捨五入的小數，所以三個三連音八分音符加起來剛好是 1。",
          ]}
        />
        <Table
          head={[
            ["tinyNotation", "tinyNotation"],
            ["Note value", "音符"],
            ["Quarter notes", "四分音符數"],
          ]}
          rows={[
            [["`c1`", "`c1`"], ["whole", "全音符"], ["4", "4"]],
            [["`c2`", "`c2`"], ["half", "二分音符"], ["2", "2"]],
            [["`c4`", "`c4`"], ["quarter", "四分音符"], ["1", "1"]],
            [["`c8`", "`c8`"], ["eighth", "八分音符"], ["$\\frac12$", "$\\frac12$"]],
            [["`c4.`", "`c4.`"], ["dotted quarter", "附點四分音符"], ["$1 \\cdot \\frac32 = \\frac32$", "$1 \\cdot \\frac32 = \\frac32$"]],
            [["`trip{c8 d e}`", "`trip{c8 d e}`"], ["triplet eighths", "三連音八分音符"], ["$\\frac12 \\cdot \\frac23 = \\frac13$ each", "每個 $\\frac12 \\cdot \\frac23 = \\frac13$"]],
          ]}
        />
        <P
          t={[
            "Where a note *starts* is its **offset**, also in quarter notes. Inside a bar it counts from the barline; the note list the checker reads counts from the start of the piece. A **time signature** fixes the bar's length: 3/4 means three quarter notes, so 3. A **tie** (`~` in tinyNotation) joins two written notes into one sound, usually across a barline.",
            "音符*從哪裡開始*叫作**位移**（offset），也以四分音符計。在小節內，從小節線起算；檢查器讀的音符列表，則從曲子開頭起算。**拍號**決定小節長度：3/4 表示三個四分音符，也就是 3。**連結線**（tinyNotation 裡的 `~`）把兩個寫出的音符連成一個聲音，通常跨越小節線。",
          ]}
        />
        <Py
          code={TIME}
          note={[
            "Under the triplet you see `2.0 + 1/3`, `7/3 + 1/3`, `8/3 + 1/3`: music21 keeps thirds as fractions. The tied D in bars 3–4 sounds once, for 2 beats.",
            "在三連音下方會看到 `2.0 + 1/3`、`7/3 + 1/3`、`8/3 + 1/3`：music21 以分數保存三分之一。第 3–4 小節連結的 D 只發聲一次，長 2 拍。",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/8
K:C
B8 | B4 B2 BB | B/B/B/B/ (3BBB B4- | B2 B3B B2 |]`}
          caption={[
            "The note values on one pitch. Bar 1: whole (4). Bar 2: half (2), quarter (1), two eighths (½ each). Bar 3: four sixteenths (¼ each), a triplet (⅓ each), a half tied over the barline. Bar 4: the tied quarter, a dotted quarter (3/2), an eighth, a quarter.",
            "同一個音高上的各種時值。第 1 小節：全音符（4）。第 2 小節：二分（2）、四分（1）、兩個八分（各 ½）。第 3 小節：四個十六分（各 ¼）、三連音（各 ⅓）、一個跨小節線連結的二分音符。第 4 小節：被連結的四分、附點四分（3/2）、八分、四分。",
          ]}
          instrument={73}
        />
        <P
          t={[
            "To turn beats into seconds, the **tempo** is all you need: at ♩ = bpm, $\\text{seconds} = \\text{quarter notes} \\times 60 / \\text{bpm}$. That is how the player schedules each note, and how the page planner knows whether a rest is long enough to turn the page.",
            "要把拍數換成秒數，只需要**速度**：在 ♩ = bpm 時，$\\text{秒數} = \\text{四分音符數} \\times 60 / \\text{bpm}$。播放器就是這樣安排每個音的時間，頁面規劃器也是這樣判斷一個休止是否夠長、來得及翻頁。",
          ]}
        />
        <p>
          <SiteLink to={["concept", "method", "parts"]} label={["From full score to the player's part", "從總譜到演奏者的分譜"]} />
        </p>
        <Sources
          items={[
            { label: "music21: duration module", url: "https://www.music21.org/music21docs/moduleReference/moduleDuration.html" },
            { label: "Wikipedia: Tuplet", url: "https://en.wikipedia.org/wiki/Tuplet" },
            { label: "Wikipedia: Metre (music)", url: "https://en.wikipedia.org/wiki/Metre_(music)" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="keys" n={5} title={SECTIONS[4].title}>
        <P
          t={[
            "A **scale** is a pattern of steps. The major scale is whole, whole, half, whole, whole, whole, half, or in semitones $2, 2, 1, 2, 2, 2, 1$ (they add up to 12: one octave). Start on any note and add the steps, and you have that note's major scale.",
            "**音階**是一個步距模式。大調音階是全、全、半、全、全、全、半，以半音表示就是 $2, 2, 1, 2, 2, 2, 1$（加起來是 12：一個八度）。從任何一個音開始，依序加上這些步距，就得到那個音的大調音階。",
          ]}
        />
        <P
          t={[
            "The church **modes** are the same pattern started at a different place. Start the major steps one later, $2, 1, 2, 2, 2, 1, 2$, and from D you get **D Dorian**: the white keys from D to D, the mode of the cantus in Fux's first lesson.",
            "教會**調式**是同一個模式，從不同的位置開始。把大調的步距往後挪一格，$2, 1, 2, 2, 2, 1, 2$，從 D 開始就得到 **D 多利安調式**：從 D 到 D 的白鍵，也就是福克斯第一課裡定旋律所用的調式。",
          ]}
        />
        <Py
          code={SCALES}
          note={[
            "C major, then D Dorian, in eighth notes. `MAJOR[1:] + MAJOR[:1]` moves the first step to the end: a rotation.",
            "先是 C 大調，再是 D 多利安，八分音符。`MAJOR[1:] + MAJOR[:1]` 把第一個步距移到最後：這是一次旋轉。",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/8
K:C
CDEF GABc | A,B,CD EFGA | DEFG ABcd |]`}
          caption={[
            "C major, A natural minor, D Dorian: the same seven white keys started on C, A and D. The half steps (E–F, B–C) land in different places, and that is what gives each its colour.",
            "C 大調、A 自然小調、D 多利安：同樣七個白鍵，分別從 C、A、D 開始。半音（E–F、B–C）落在不同的位置，各自的色彩就由此而來。",
          ]}
        />
        <P
          t={[
            "**Transposition** is adding a constant: $n \\mapsto n + k$ for every note. Because every note moves by the same $k$, every interval stays the same, so the tune is still the tune. A **key** is then a set of pitch classes: C major is $\\{0, 2, 4, 5, 7, 9, 11\\}$, and adding 7 (mod 12) gives $\\{7, 9, 11, 0, 2, 4, 6\\}$, G major. The one new member, 6, is F♯: G major's one sharp.",
            "**移調**就是加上一個常數：每個音都 $n \\mapsto n + k$。因為每個音移動相同的 $k$，每個音程都不變，所以旋律還是同一首旋律。這樣一來，**調**就是一個音級集合：C 大調是 $\\{0, 2, 4, 5, 7, 9, 11\\}$，加 7（mod 12）得到 $\\{7, 9, 11, 0, 2, 4, 6\\}$，也就是 G 大調。唯一的新成員 6 是 F♯：G 大調的那一個升記號。",
          ]}
        />
        <Py
          code={TRANSPOSE}
          note={[
            "`transpose(\"P5\")` moves by a named interval, so music21 spells every note, and the key signature, to match. A plain number of semitones leaves the spelling to a guess: on a C major scale, `transpose(6)` gives F♯ G♯ A♯ B C♯ D♯ **F**, where F♯ major needs E♯. `transpose(\"A4\")` (augmented fourth) spells it right; `transpose(\"d5\")` gives G♭ major instead.",
            "`transpose(\"P5\")` 依具名音程移動，所以 music21 會讓每個音和調號都配合新調的拼法。只給半音數時，拼法就只能用猜的：對 C 大調音階做 `transpose(6)`，會得到 F♯ G♯ A♯ B C♯ D♯ **F**，但 F♯ 大調需要的是 E♯。`transpose(\"A4\")`（增四度）拼法正確；`transpose(\"d5\")`（減五度）則得到 G♭ 大調。",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
C D E C | E F G2 |]`}
          caption={["The opening of the tune in C …", "旋律的開頭，在 C 大調……"]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:G
G A B G | B c d2 |]`}
          caption={[
            "… and the same notes plus 7 semitones, in G: the shape on the staff is the same, the key signature gains G major's one sharp.",
            "……以及每個音加 7 個半音後的 G 大調：在譜表上的形狀不變，調號多了 G 大調的那一個升記號。",
          ]}
        />
        <Callout kind="tip" title={["Why arrangers transpose", "編曲者為什麼要移調"]}>
          <P
            t={[
              "To fit an instrument's range or a singer's voice, or to make a part easier to play. The melody keeps every interval; only the starting point moves. *Ode to Joy for flute and violin* in Learn to Code asks for exactly this, by hand.",
              "為了配合樂器的音域或歌手的嗓音，或讓聲部更好演奏。旋律的每個音程都不變，只有起點移動。「學寫程式」裡〈快樂頌〉長笛與小提琴的題目，要你親手做的正是這件事。",
            ]}
          />
        </Callout>
        <TryIn ids={["hello-scale", "ode-for-flute"]} />
        <p className="flex flex-wrap gap-4">
          <SiteLink to={["skills", "first"]} label={["Coding Skills: first music21", "程式技巧：第一步 music21"]} />
          <SiteLink to={["learn", "code", "ode-for-flute"]} label={["Open the Ode to Joy problem", "開啟〈快樂頌〉題目"]} />
        </p>
        <Sources
          items={[
            { label: "Wikipedia: Major scale", url: "https://en.wikipedia.org/wiki/Major_scale" },
            { label: "Wikipedia: Mode (music)", url: "https://en.wikipedia.org/wiki/Mode_(music)" },
            { label: "Wikipedia: Transposition (music)", url: "https://en.wikipedia.org/wiki/Transposition_(music)" },
            { label: "music21: scale module", url: "https://www.music21.org/music21docs/moduleReference/moduleScale.html" },
          ]}
        />
      </Section>
    </Page>
  );
}
