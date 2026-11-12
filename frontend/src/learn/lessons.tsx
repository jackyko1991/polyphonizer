/**
 * Track 0's explanations: one idea per lesson, code beside the notes it draws. Each <Example> pairs score code with
 * a <Notation> of the same music in ABC; tests/learn.test.ts runs the code through the engine and checks that the
 * drawing has the same pitches at the same times. Plus the Syntax tab: a cheat sheet of tinyNotation and the helpers.
 */
import { RichText, useLang } from "@learnkit/web";
import type { ReactNode } from "react";
import { Callout, Notation, P, Py, Table } from "../pages/kit.tsx";
import type { L } from "../problems.ts";

/** score code on the left, the music it makes on the right (stacked when the column is narrow) */
export function Example({ code, note, children }: { code: string; note?: L; children: ReactNode }) {
  return (
    <div className="grid items-start gap-3 @xl:grid-cols-2" data-testid="lesson-example">
      <Py code={code} note={note} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function H({ t }: { t: L }) {
  const { pick } = useLang();
  return (
    <h3 className="pt-2 text-sm font-semibold text-gray-900">
      <RichText text={pick(t)} />
    </h3>
  );
}

/** a piano keyboard from C2 to C6 with the tinyNotation name of each C under it */
function Keyboard() {
  const { pick } = useLang();
  const W = 13;
  const whites = 29; // C2 … C6
  const names = ["CC", "C", "c", "c'", "c''"];
  const blackAfter = new Set([0, 1, 3, 4, 5]); // C D F G A have a black key to their right
  return (
    <figure className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <svg viewBox={`0 0 ${whites * W + 2} 92`} className="mx-auto block h-auto w-full max-w-xl" role="img" aria-label={pick(["Piano keyboard, C2 to C6", "鋼琴鍵盤，C2 到 C6"])}>
        {Array.from({ length: whites }, (_, i) => (
          <rect key={`w${i}`} x={1 + i * W} y={1} width={W} height={60} rx={1.5} className={i === 14 ? "fill-rose-100" : "fill-white"} stroke="#9ca3af" strokeWidth={0.8} />
        ))}
        {Array.from({ length: whites - 1 }, (_, i) =>
          blackAfter.has(i % 7) ? <rect key={`b${i}`} x={1 + i * W + W * 0.65} y={1} width={W * 0.7} height={37} rx={1} fill="#1f2937" /> : null,
        )}
        {names.map((n, k) => (
          <g key={n}>
            <line x1={1 + k * 7 * W + W / 2} x2={1 + k * 7 * W + W / 2} y1={63} y2={70} stroke="#be123c" strokeWidth={1} />
            <text x={1 + k * 7 * W + W / 2} y={82} textAnchor="middle" className="fill-rose-700 font-mono" fontSize={11}>
              {n}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 text-center text-xs text-gray-500">
        <RichText
          text={pick([
            "Every C on the piano and how tinyNotation writes it: `CC` = C2, `C` = C3, `c` = C4 (middle C, shaded), `c'` = C5, `c''` = C6.",
            "鋼琴上的每個 C 以及 tinyNotation 的寫法：`CC` = C2、`C` = C3、`c` = C4（中央 C，有底色）、`c'` = C5、`c''` = C6。",
          ])}
        />
      </figcaption>
    </figure>
  );
}

function NoteLesson() {
  return (
    <>
      <P
        t={[
          "A note is a letter, `c d e f g a b`, and an octave. tinyNotation, the little language inside `tiny(\"…\")`, puts the octave into the letter: small letters are the octave from middle C up, each `'` adds an octave, capitals are the octave below middle C, and each extra capital goes down one more.",
          "一個音是一個字母 `c d e f g a b`，加上它的八度。tinyNotation（`tiny(\"…\")` 裡的小語言）把八度寫進字母裡：小寫是從中央 C 起的八度，每個 `'` 高一個八度；大寫是中央 C 下面的八度，每多寫一個大寫字母再低一個八度。",
        ]}
      />
      <Keyboard />
      <Notation
        abc={`X:1
M:4/4
L:1/4
K:C
V:1
z2 "^c"C "^c'"c | "^c''"c' z3 |]
V:2 clef=bass
"^CC"C,, "^C"C, z2 | z4 |]`}
        caption={["The five Cs on the grand staff, low to high: `CC C c c' c''`.", "大譜表上的五個 C，由低到高：`CC C c c' c''`。"]}
        instrument={0}
      />
      <H t={["An octave starts on C", "八度從 C 開始"]} />
      <P
        t={[
          "The octave number changes between B and C, so going up from `b` the next note is `c'`, one step higher, not `c`, which is seven steps down. The same happens below middle C: `B` is right under `c`.",
          "八度的編號在 B 和 C 之間改變，所以從 `b` 往上的下一個音是 `c'`，只高一級，而不是 `c`（那是往下七級）。中央 C 以下也一樣：`B` 就在 `c` 的正下方。",
        ]}
      />
      <Example code={`score = tiny("c4 d e f g a b c'")`} note={["`b` to `c'` is a step.", "`b` 到 `c'` 是級進。"]}>
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
"^c"C "^d"D "^e"E "^f"F | "^g"G "^a"A "^b"B "^c'"c |]`}
          instrument={0}
        />
      </Example>
      <Callout kind="warn" title={["A common slip", "常見的錯誤"]}>
        <P
          t={[
            "`c d e f g a b c` goes up seven steps and then jumps back down to where it started: the last `c` is middle C again. Write `c'` to keep climbing.",
            "`c d e f g a b c` 上行七級之後又跳回起點：最後的 `c` 又是中央 C。要繼續往上，寫 `c'`。",
          ]}
        />
      </Callout>
    </>
  );
}

function ValuesLesson() {
  return (
    <>
      <P
        t={[
          "The number after a note is its value, as a fraction of a whole note: `1` whole (4 beats in 4/4), `2` half (2 beats), `4` quarter (1 beat), `8` eighth (½), `16` sixteenth (¼). A bigger number means a shorter note.",
          "音符後面的數字是它的時值，以全音符的幾分之一表示：`1` 全音符（4/4 拍裡 4 拍）、`2` 二分音符（2 拍）、`4` 四分音符（1 拍）、`8` 八分音符（½ 拍）、`16` 十六分音符（¼ 拍）。數字越大，音越短。",
        ]}
      />
      <Example code={`score = tiny("c1 d2 d e4 e e e f8 f f f g16 g g g g g g g")`}>
        <Notation
          abc={`X:1
M:4/4
L:1/16
K:C
"^1"C16 | "^2"D8 D8 | "^4"E4 E4 E4 E4 | "^8"F2 F2 F2 F2 "^16"G G G G G G G G |]`}
          instrument={0}
        />
      </Example>
      <H t={["A number carries on", "數字會延續"]} />
      <P
        t={[
          "You only write the number when it changes: every note without one keeps the last value. Below, `e2` makes `f` a half note too, until `g4` switches back.",
          "只在時值改變時寫數字：沒有數字的音沿用上一個時值。下面的 `e2` 讓 `f` 也成為二分音符，直到 `g4` 才換回來。",
        ]}
      />
      <Example code={`score = tiny("c4 d e2 f g4 r")`} note={["`r4` (here just `r`) is a quarter rest.", "`r4`（這裡只寫 `r`）是四分休止符。"]}>
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
C D E2 | F2 G z |]`}
          instrument={0}
        />
      </Example>
    </>
  );
}

function DotsLesson() {
  return (
    <>
      <P
        t={[
          "A dot after the value adds half of it: `c4.` is a quarter plus an eighth, 1½ beats; `c2.` is 3 beats. A dotted quarter is usually followed by an eighth (`c4. d8`), which completes the two beats.",
          "時值後面的附點加上它的一半：`c4.` 是四分音符加八分音符，1½ 拍；`c2.` 是 3 拍。附點四分音符後面通常接一個八分音符（`c4. d8`），湊滿兩拍。",
        ]}
      />
      <H t={["Rests", "休止符"]} />
      <P
        t={[
          "A rest is `r` with a value, like a note without a pitch: `r4` a quarter rest, `r2` a half rest, `r1` a whole bar of 4/4. Rests can be dotted too.",
          "休止符是 `r` 加時值，就像沒有音高的音符：`r4` 四分休止符、`r2` 二分休止符、`r1` 一整個 4/4 小節。休止符也可以加附點。",
        ]}
      />
      <Example code={`score = tiny("c4. d8 e4. f8 g2. r4")`}>
        <Notation
          abc={`X:1
M:4/4
L:1/8
K:C
C3 D E3 F | G6 z2 |]`}
          instrument={0}
        />
      </Example>
      <P
        t={[
          "Use **Loop bar** above the score to repeat one bar until the rhythm sits.",
          "用樂譜上方的**循環小節**重複某一小節，直到節奏熟悉。",
        ]}
      />
    </>
  );
}

function BarsLesson() {
  return (
    <>
      <P
        t={[
          "tiny() fills bars in order: when the notes add up to the time signature, a new bar starts. A note that is longer than the room left in its bar is not cut for you: the bar just becomes too long, and the score looks wrong.",
          "tiny() 依序填滿小節：音符加起來等於拍號時，就開始新的小節。若一個音比小節剩下的空間還長，它不會替你切開：小節只是變得太長，樂譜看起來就不對。",
        ]}
      />
      <H t={["Ties", "連結線"]} />
      <P
        t={[
          "Split such a note at the barline and join the two halves with `~` after the first: `d4~ d2` is written as two notes but played as one, three beats long. A tie only joins notes of the same pitch.",
          "把這樣的音在小節線處分開，在前半的後面加上 `~` 把兩半接起來：`d4~ d2` 寫成兩個音，但演奏成一個三拍長的音。連結線只能接同一個音高。",
        ]}
      />
      <Example code={`score = tiny("c2. d4~ d2 e2")`}>
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
C3 D- | D2 E2 |]`}
          instrument={0}
        />
      </Example>
    </>
  );
}

function TimeLesson() {
  return (
    <>
      <P
        t={[
          "`tiny(…, time=\"3/4\")` sets the time signature (the default is 4/4). The top number counts beats in a bar, the bottom one says which note gets a beat: 4 a quarter, 8 an eighth.",
          "`tiny(…, time=\"3/4\")` 設定拍號（預設是 4/4）。上面的數字是每小節的拍數，下面的數字說明哪種音符算一拍：4 是四分音符，8 是八分音符。",
        ]}
      />
      <Example code={`score = tiny("c4 e g c'2 g4 e2.", time="3/4")`} note={["3/4: three quarter notes in a bar, a waltz.", "3/4：每小節三個四分音符，圓舞曲。"]}>
        <Notation
          abc={`X:1
M:3/4
L:1/4
K:C
C E G | c2 G | E3 |]`}
          instrument={0}
        />
      </Example>
      <Example code={`score = tiny("c8 d e f g a g4. e4.", time="6/8")`} note={["6/8: six eighths, felt as two beats of three.", "6/8：六個八分音符，感覺成兩拍、每拍三分。"]}>
        <Notation
          abc={`X:1
M:6/8
L:1/8
K:C
C D E F G A | G3 E3 |]`}
          instrument={0}
        />
      </Example>
      <H t={["Triplets", "三連音"]} />
      <Example code={`score = tiny("c4 trip{d8 e f} g2")`} note={["`trip{…}` fits three notes into the time of two.", "`trip{…}` 把三個音放進兩個音的時間裡。"]}>
        <Notation
          abc={`X:1
M:4/4
L:1/8
K:C
C2 (3DEF G4 |]`}
          instrument={0}
        />
      </Example>
      <H t={["A pickup bar", "弱起小節"]} />
      <P
        t={[
          "Many tunes start before the first strong beat, with a short *pickup* bar; the last bar is then short by the same amount. tiny() always starts on beat 1, so for now write the pickup after a rest (`r2 g4 …` in 3/4); the checker's bar rule can allow a real pickup in imported scores.",
          "許多曲子在第一個強拍之前就開始，有一個較短的*弱起*小節；最後一小節則短少同樣的長度。tiny() 總是從第 1 拍開始，所以目前先在休止符後寫弱起（3/4 拍寫成 `r2 g4 …`）；檢查器的小節規則可以允許匯入樂譜中真正的弱起。",
        ]}
      />
      <Notation
        abc={`X:1
M:3/4
L:1/4
K:C
G | c2 E | G2 G | c2 |]`}
        caption={["A pickup of one beat; the last bar has the two beats that complete it.", "一拍的弱起；最後一小節有兩拍，與它湊成完整小節。"]}
        instrument={0}
      />
    </>
  );
}

function AccidentalsLesson() {
  return (
    <>
      <Table
        head={[
          ["Write", "寫法"],
          ["Means", "意思"],
          ["Example", "例子"],
        ]}
        rows={[
          [["`#`", "`#`"], ["sharp: a half step up", "升記號：升高半音"], ["`f#` = F♯4", "`f#` = F♯4"]],
          [["`-`", "`-`"], ["flat: a half step down", "降記號：降低半音"], ["`b-` = B♭4, `e-` = E♭4", "`b-` = B♭4、`e-` = E♭4"]],
          [["`n`", "`n`"], ["natural sign, printed", "還原記號（會印出來）"], ["`bn` = B4 with ♮", "`bn` = 帶 ♮ 的 B4"]],
          [["`##`, `--`", "`##`、`--`"], ["double sharp, double flat", "重升、重降"], ["`f##` = F𝄪4", "`f##` = F𝄪4"]],
        ]}
      />
      <Example code={`score = tiny("f4 f# b- bn c'# e'- f'# r")`}>
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
F ^F _B =B | ^c _e ^f z |]`}
          instrument={0}
        />
      </Example>
      <Callout kind="warn" title={["Octave first, then the accidental", "先寫八度，再寫變音記號"]}>
        <P
          t={[
            "`f'#` is F♯5: letter, octave mark, then sharp. Written `f#'`, tiny() reads F♯4 and drops the stray `'` without a word, so the note sounds an octave lower than you meant. In the score it is easy to spot: the note sits low on the staff.",
            "`f'#` 是 F♯5：字母、八度記號，然後升記號。若寫成 `f#'`，tiny() 會讀成 F♯4，悄悄丟掉多出來的 `'`，所以音比你想的低一個八度。在樂譜上很容易看出來：那個音落在譜表的低處。",
          ]}
        />
      </Callout>
    </>
  );
}

function PartLesson() {
  return (
    <>
      <P
        t={[
          "`tiny(notes, …)` returns a music21 *Part*, one player's line. Its keyword arguments set what the player sees at the start:",
          "`tiny(notes, …)` 傳回 music21 的 *Part*，也就是一位演奏者的旋律線。它的關鍵字參數決定演奏者在開頭看到什麼：",
        ]}
      />
      <Table
        head={[
          ["Keyword", "關鍵字"],
          ["Sets", "設定"],
          ["Values", "可用的值"],
        ]}
        rows={[
          [["`name=`", "`name=`"], ["the name beside the staff", "譜表旁的名稱"], ["any text: `\"Violin I\"`", "任何文字：`\"Violin I\"`"]],
          [["`inst=`", "`inst=`"], ["the instrument (and its sound)", "樂器（以及音色）"], ["`violin viola cello flute piano voice`", "`violin viola cello flute piano voice`"]],
          [["`key_sig=`", "`key_sig=`"], ["the key signature", "調號"], ["`\"G\"`, `\"D\"`, `\"F\"`, `\"a\"` (A minor) …", "`\"G\"`、`\"D\"`、`\"F\"`、`\"a\"`（A 小調）…"]],
          [["`time=`", "`time=`"], ["the time signature", "拍號"], ["`\"4/4\"` (default), `\"3/4\"`, `\"6/8\"` …", "`\"4/4\"`（預設）、`\"3/4\"`、`\"6/8\"` …"]],
        ]}
      />
      <Example code={`score = tiny("g4 a b c' d'2 b", name="Flute", inst="flute", key_sig="G")`}>
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:G
G A B c | d2 B2 |]`}
          instrument={73}
        />
      </Example>
      <Callout kind="note" title={["The key signature doesn't change your notes", "調號不會改變你寫的音"]}>
        <P
          t={[
            "tiny() spells every pitch exactly: in G major you still write `f#`. A plain `f` would be printed with a natural sign.",
            "tiny() 照字面拼出每個音：在 G 大調裡你仍然要寫 `f#`。只寫 `f` 會印出還原記號。",
          ]}
        />
      </Callout>
    </>
  );
}

function ScoreLesson() {
  return (
    <>
      <P
        t={[
          "A piece for several players is a score: `together(part, part, …)` stacks the parts from top to bottom in the order given. Its keywords: `bpm=` the tempo (quarter notes a minute), `title=` the title.",
          "給多位演奏者的曲子是一份總譜：`together(part, part, …)` 依給定順序由上而下疊起聲部。它的關鍵字：`bpm=` 速度（每分鐘幾個四分音符），`title=` 標題。",
        ]}
      />
      <Example
        code={`violin = tiny("g'2 f'# g'1", name="Violin", inst="violin", key_sig="G")
cello = tiny("G2 D GG1", name="Cello", inst="cello", key_sig="G")
score = together(violin, cello, bpm=80)`}
      >
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:G
V:1
g2 f2 | g4 |]
V:2 clef=bass
G,2 D,2 | G,,4 |]`}
          instrument={40}
        />
      </Example>
      <Callout kind="tip" title={["`score =` is the answer", "`score =` 就是答案"]}>
        <P
          t={[
            "Score code can build parts in any order, in variables with any names, but it must end by putting the result in `score`: that is what is drawn, played and checked.",
            "樂譜程式碼可以用任何順序、任何變數名稱建立聲部，但最後必須把結果放進 `score`：被畫出、播放和檢查的就是它。",
          ]}
        />
      </Callout>
    </>
  );
}

function TransposeLesson() {
  return (
    <>
      <P
        t={[
          "`tiny()` and `together()` return music21 objects, and music21 has hundreds of methods for them. The first one worth knowing: `.transpose(interval)` returns a copy with every note moved by the same interval.",
          "`tiny()` 和 `together()` 傳回 music21 物件，而 music21 為它們準備了上百個方法。第一個值得認識的是：`.transpose(interval)` 傳回一份每個音都移動相同音程的副本。",
        ]}
      />
      <Table
        head={[
          ["Interval", "音程"],
          ["Name", "名稱"],
          ["Semitones", "半音數"],
        ]}
        rows={[
          [["`\"m2\"`, `\"M2\"`", "`\"m2\"`、`\"M2\"`"], ["minor, major second", "小二度、大二度"], ["1, 2", "1、2"]],
          [["`\"m3\"`, `\"M3\"`", "`\"m3\"`、`\"M3\"`"], ["minor, major third", "小三度、大三度"], ["3, 4", "3、4"]],
          [["`\"P4\"`, `\"P5\"`", "`\"P4\"`、`\"P5\"`"], ["perfect fourth, fifth", "完全四度、五度"], ["5, 7", "5、7"]],
          [["`\"P8\"`, `\"-P8\"`", "`\"P8\"`、`\"-P8\"`"], ["an octave up, down", "高、低八度"], ["12, −12", "12、−12"]],
        ]}
      />
      <Example code={`melody = tiny("c4 e g c'")
score = together(melody.transpose("M3"), melody)`}>
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
V:1
"^M3"E ^G B e |]
V:2
C E G c |]`}
          instrument={0}
        />
      </Example>
      <P
        t={[
          "Interval names keep the spelling right: a major third above E is G♯, not A♭. A plain number, `.transpose(7)`, moves by semitones and lets music21 choose the spelling.",
          "音程名稱能保持正確的拼法：E 上方的大三度是 G♯，不是 A♭。直接給整數，例如 `.transpose(7)`，則以半音移動，由 music21 決定拼法。",
        ]}
      />
    </>
  );
}

/** each lesson's explanation, by problem id */
export const LESSON_BODY: Record<string, () => ReactNode> = {
  "syntax-note": NoteLesson,
  "syntax-rhythm-values": ValuesLesson,
  "syntax-rhythm-dots": DotsLesson,
  "syntax-rhythm-bars": BarsLesson,
  "syntax-rhythm-time": TimeLesson,
  "syntax-accidentals": AccidentalsLesson,
  "syntax-part": PartLesson,
  "syntax-score": ScoreLesson,
  "syntax-transpose": TransposeLesson,
};

/** the Syntax tab: everything Track 0 teaches, on one page */
export function SyntaxSheet() {
  return (
    <div className="space-y-4 text-sm text-gray-700" data-testid="syntax-sheet">
      <Table
        head={[
          ["tinyNotation", "tinyNotation"],
          ["Means", "意思"],
        ]}
        rows={[
          [["`c d e f g a b`", "`c d e f g a b`"], ["the octave from middle C (C4) up", "從中央 C（C4）起的八度"]],
          [["`c'` `c''`", "`c'` `c''`"], ["one, two octaves higher (C5, C6)", "高一、兩個八度（C5、C6）"]],
          [["`C` `CC`", "`C` `CC`"], ["one, two octaves lower (C3, C2)", "低一、兩個八度（C3、C2）"]],
          [["`#` `-` `n`", "`#` `-` `n`"], ["sharp, flat, natural: after the octave mark (`f'#`)", "升、降、還原：寫在八度記號之後（`f'#`）"]],
          [["`1 2 4 8 16`", "`1 2 4 8 16`"], ["whole, half, quarter, eighth, sixteenth; carries on", "全、二分、四分、八分、十六分；會延續"]],
          [["`c4.`", "`c4.`"], ["dotted: 1½ beats", "附點：1½ 拍"]],
          [["`r4` `r2`", "`r4` `r2`"], ["rests", "休止符"]],
          [["`c2~ c4`", "`c2~ c4`"], ["a tie: one note, three beats", "連結線：一個音，三拍"]],
          [["`trip{c8 d e}`", "`trip{c8 d e}`"], ["a triplet: three in the time of two", "三連音：兩個音的時間奏三個"]],
          [["`<C E G>2`", "`<C E G>2`"], ["a chord: the notes sound together", "和弦：幾個音同時響"]],
        ]}
      />
      <Table
        head={[
          ["Python", "Python"],
          ["Does", "作用"],
        ]}
        rows={[
          [
            ["`tiny(\"c4 d e\", name=, inst=, key_sig=, time=)`", "`tiny(\"c4 d e\", name=, inst=, key_sig=, time=)`"],
            ["a part (one player)", "一個聲部（一位演奏者）"],
          ],
          [["`together(a, b, bpm=, title=)`", "`together(a, b, bpm=, title=)`"], ["a score, parts top to bottom", "總譜，聲部由上而下"]],
          [["`part.transpose(\"P5\")`", "`part.transpose(\"P5\")`"], ["a copy moved by an interval", "移動一個音程的副本"]],
          [["`edit_bar(score, part, bar, \"c4 d e f\")`", "`edit_bar(score, part, bar, \"c4 d e f\")`"], ["replace one bar's notes", "替換一個小節的音"]],
          [["`load(\"file.musicxml\")`", "`load(\"file.musicxml\")`"], ["a file you imported", "你匯入的檔案"]],
          [["`score = …`", "`score = …`"], ["the result: drawn, played and checked", "結果：被畫出、播放和檢查"]],
        ]}
      />
      <Table
        head={[
          ["Markings", "演奏記號"],
          ["Does", "作用"],
        ]}
        rows={[
          [["Notes: `3`, `[1, 3]`, `\"1 3 5-8\"`", "音符：`3`、`[1, 3]`、`\"1 3 5-8\"`"], ["numbered from 1 in the part, rests not counted", "在聲部內從 1 起編號，休止符不算"]],
          [["`bowings(part, \"d u - d\")`", "`bowings(part, \"d u - d\")`"], ["down-bow ⊓, up-bow V, `-` no mark", "下弓 ⊓、上弓 V、`-` 不標"]],
          [["`slur(part, 1, 4)`", "`slur(part, 1, 4)`"], ["a slur from note 1 to note 4", "從第 1 個音到第 4 個音的圓滑線"]],
          [["`staccato` `spiccato` `tenuto` `accent` `harmonic` `trill` `breath` `(part, notes)`", "`staccato` `spiccato` `tenuto` `accent` `harmonic` `trill` `breath` `(part, notes)`"], ["a mark on each of these notes (breath: after it)", "在這些音上加記號（換氣：在音之後）"]],
          [["`pizz(part, \"3-4\")`, `arco(part, 5)`", "`pizz(part, \"3-4\")`、`arco(part, 5)`"], ["pluck these bars; bow again", "這些小節撥奏；恢復用弓"]],
          [["`fingering(part, \"1 2 3 - 5\")`", "`fingering(part, \"1 2 3 - 5\")`"], ["fingers from note 1 (`-` skips)", "從第 1 個音起的指法（`-` 跳過）"]],
          [["`pedal(part, \"1 2 3-4\")`", "`pedal(part, \"1 2 3-4\")`"], ["sustain pedal by bars, changed where spans meet; `\"1:3-2\"` from a beat", "以小節為單位的延音踏板，範圍相接處換踏板；`\"1:3-2\"` 從某拍起"]],
          [["`una_corda(part, \"1-2\")`, `arpeggio(part, notes)`", "`una_corda(part, \"1-2\")`、`arpeggio(part, notes)`"], ["soft pedal; rolled chords", "弱音踏板；琶音和弦"]],
          [["`text(part, note, \"sul G\")`", "`text(part, note, \"sul G\")`"], ["words over a note: sul G, II pos., m.d., m.s.", "音上方的文字：sul G、II pos.、m.d.、m.s."]],
          [["`lyrics(part, \"Twin-kle twin-kle\")`", "`lyrics(part, \"Twin-kle twin-kle\")`"], ["one syllable per note; `_` holds one over", "每個音一個音節；`_` 延續前一個"]],
        ]}
      />
      <Callout kind="tip" title={["Blanks", "空格"]}>
        <P
          t={[
            "In the lessons, `___` marks a gap to fill. The code doesn't run until every blank is filled.",
            "在課程中，`___` 標示要填的空格。所有空格都填好之前，程式碼不會執行。",
          ]}
        />
      </Callout>
    </div>
  );
}

/**
 * The target of each fill-in lesson: the music exactly as the correct answer makes it, shown in the task box so the
 * student compares it with their own result in the score panel. Numbers under notes (1, 2 …) are the blanks, in the
 * order of the `___` in the code. tests/learn.test.ts checks each against the reference solution (pitches, times and
 * lengths; for syntax-transpose only the flute, since the violin is given).
 */
export const TARGETS: Record<string, () => ReactNode> = {
  "syntax-note": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C
G, A, B, "_1"C | D E F G | A B "_2"c d |]`}
      caption={["Blank 1 is C4 (`c`), blank 2 is C5 (`c'`).", "空格 1 是 C4（`c`），空格 2 是 C5（`c'`）。"]}
      instrument={0}
    />
  ),
  "syntax-rhythm-values": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C
C C G G | A A "_1"G2 | "_2"F F E E | D D "_3"C2 |]`}
      caption={["Blanks 1–3 are the lengths of the numbered notes.", "空格 1–3 是有編號的音的長度。"]}
      instrument={0}
    />
  ),
  "syntax-rhythm-dots": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C
E E F G | G F E D | C C D E | "_1"E3/2 "_2"D/2 D2 |]`}
      caption={["Blank 1: the dotted quarter; blank 2: the eighth.", "空格 1：附點四分音符；空格 2：八分音符。"]}
      instrument={0}
    />
  ),
  "syntax-rhythm-bars": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C
C E G c | B3 "_tie"A- | A G F E | D2 C2 |]`}
      caption={["Every bar full: the A is split at the barline and tied.", "每個小節都完整：A 在小節線處分開並以連結線相連。"]}
      instrument={0}
    />
  ),
  "syntax-rhythm-time": () => (
    <Notation
      abc={`X:1
M:3/4
L:1/4
K:C
"_1"C2 E | G2 G | A2 G | F3 |]`}
      caption={["Blank 1 is the time signature: three quarter notes in each bar.", "空格 1 是拍號：每小節三個四分音符。"]}
      instrument={0}
    />
  ),
  "syntax-accidentals": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C
D E "_1"^F G | A B "_2"^c d |]`}
      caption={["Blank 1 is F♯4, blank 2 is C♯5.", "空格 1 是 F♯4，空格 2 是 C♯5。"]}
      instrument={0}
    />
  ),
  "syntax-part": () => (
    <Notation
      abc={`X:1
M:3/4
L:1/4
K:G
D G A | B2 A | G3 |]`}
      caption={[
        "Blanks 1–4: the name Violin, the violin's sound, the key signature (one sharp: G major) and 3/4 time.",
        "空格 1–4：名稱 Violin、小提琴的音色、調號（一個升記號：G 大調）和 3/4 拍。",
      ]}
      instrument={40}
    />
  ),
  "syntax-score": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C
V:1
"1: Flute"e2 d2 | c4 |]
V:2 clef=bass
"2: Cello"C,2 G,,2 | C,4 |]`}
      caption={["Blanks 1 and 2: the flute on top, the cello below; blank 3: 72 beats a minute.", "空格 1 和 2：長笛在上，大提琴在下；空格 3：每分鐘 72 拍。"]}
      instrument={73}
    />
  ),
  "syntax-transpose": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C
"_1"G A B c | d4 |]`}
      caption={["The flute part: every violin note a perfect fifth higher (blank 1 is the interval).", "長笛聲部：小提琴的每個音都高一個完全五度（空格 1 是音程）。"]}
      instrument={73}
    />
  ),
};
