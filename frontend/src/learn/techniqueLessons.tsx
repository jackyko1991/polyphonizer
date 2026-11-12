/**
 * The Playing techniques lessons' explanations (techniques.ts has their tasks and rules): code with markings.py's
 * helpers beside the notes it draws, and each fill-in lesson's target. Notes are numbered from 1 within a part, rests
 * not counted. In the drawings, fingerings and pedal marks are written as small text (the page examples are ABC).
 */
import type { ReactNode } from "react";
import { Callout, Notation, P, Table } from "../pages/kit.tsx";
import { Example, H } from "./lessons.tsx";

const NUMBERING = (
  <Callout kind="note" title={["Numbering notes", "音符的編號"]}>
    <P
      t={[
        "The helpers count notes from 1 within the part, skipping rests: in `tiny(\"c4 r d e\")` note 2 is `d`. Give one number (`3`), a list (`[1, 3]`) or a string with ranges (`\"1 3 5-8\"`).",
        "這些輔助函式在聲部內從 1 開始數音符，休止符不算：在 `tiny(\"c4 r d e\")` 裡第 2 個音是 `d`。可以給一個數字（`3`）、一個串列（`[1, 3]`），或含範圍的字串（`\"1 3 5-8\"`）。",
      ]}
    />
  </Callout>
);

function Bowing() {
  return (
    <>
      <P
        t={[
          "tinyNotation writes pitches and rhythms only. The markings a player reads are added afterwards with helpers that take the part: `bowings(part, \"d u d u\")` puts a down-bow (⊓) or an up-bow (V) on each note from note 1; `-` leaves a note without a mark.",
          "tinyNotation 只寫音高和節奏。演奏者讀的記號之後再用輔助函式加到聲部上：`bowings(part, \"d u d u\")` 從第 1 個音起，在每個音標上下弓（⊓）或上弓（V）；`-` 表示該音不標。",
        ]}
      />
      <Example
        code={`v = tiny("g4 a b c'", inst="violin")
bowings(v, "d u d u")
score = v`}
      >
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
!downbow!G !upbow!A !downbow!B !upbow!c |]`}
          instrument={40}
        />
      </Example>
      <Table
        head={[
          ["Write", "寫法"],
          ["Mark", "記號"],
          ["Bow", "弓"],
        ]}
        rows={[
          [["`d` or `⊓`", "`d` 或 `⊓`"], ["⊓", "⊓"], ["down-bow: frog to tip, stronger", "下弓：弓根到弓尖，較有力"]],
          [["`u` or `V`", "`u` 或 `V`"], ["V", "V"], ["up-bow: tip to frog, lighter", "上弓：弓尖到弓根，較輕"]],
          [["`-`", "`-`"], ["—", "—"], ["no mark (inside a slur, the same bow)", "不標（在圓滑線內，同一弓）"]],
        ]}
      />
      {NUMBERING}
    </>
  );
}

function Slurs() {
  return (
    <>
      <P
        t={[
          "`slur(part, first, last)` draws a slur from note `first` to note `last`. On a string instrument the slurred notes share one bow, so the next bow starts after the slur, in the other direction.",
          "`slur(part, first, last)` 從第 `first` 個音畫圓滑線到第 `last` 個音。在弦樂器上，圓滑線內的音共用一弓，所以下一弓從圓滑線之後開始，方向相反。",
        ]}
      />
      <Example
        code={`v = tiny("g4 a b c' d'1", inst="violin")
slur(v, 1, 2)
slur(v, 3, 4)
bowings(v, "d - u - d")
score = v`}
      >
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
(!downbow!G A) (!upbow!B c) | !downbow!d4 |]`}
          instrument={40}
        />
      </Example>
    </>
  );
}

function Strokes() {
  return (
    <>
      <P
        t={[
          "`staccato(part, notes)` puts dots on notes: short and detached. `spiccato(part, notes)` asks a string player to bounce the bow. `pizz(part, \"2\")` writes \"pizz.\" (pluck the string) over bar 2 and \"arco\" (bow again) where the plucking ends; `arco(part, bar)` writes it by hand.",
          "`staccato(part, notes)` 在音上加點：短而分開。`spiccato(part, notes)` 要求弦樂手讓弓彈跳。`pizz(part, \"2\")` 在第 2 小節寫上「pizz.」（撥弦），撥奏結束處寫上「arco」（用弓）；`arco(part, bar)` 則手動寫上。",
        ]}
      />
      <Example
        code={`v = tiny("g4 g d' d' e' e' d'2", inst="violin")
staccato(v, "1-4")
pizz(v, 2)
score = v`}
        note={["Playback shortens staccato and pizzicato notes.", "播放時斷奏和撥奏的音會變短。"]}
      >
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
.G .G .d .d | "^pizz."e e d2 |]`}
          instrument={45}
        />
      </Example>
    </>
  );
}

function ViolinFingers() {
  return (
    <>
      <P
        t={[
          "`fingering(part, \"0 1 2 3\")` writes a finger over each note from note 1 (`-` skips one). On the violin 0 is the open string and 1–4 the fingers. `text(part, note, \"sul G\")` writes words above a note: which string (sul G), which position (II pos.). `harmonic(part, notes)` marks natural harmonics with a small circle.",
          "`fingering(part, \"0 1 2 3\")` 從第 1 個音起在每個音上寫指法（`-` 跳過一個音）。小提琴的 0 是空弦，1–4 是手指。`text(part, note, \"sul G\")` 在音上方寫字：哪條弦（sul G）、哪個把位（II pos.）。`harmonic(part, notes)` 用小圓圈標示自然泛音。",
        ]}
      />
      <Example
        code={`v = tiny("d4 e f# g a1", inst="violin")
fingering(v, "0 1 2 3 4")
text(v, 1, "sul D")
score = v`}
        note={["On the D string: the 4th finger plays A, the same note as the open A string.", "在 D 弦上：第 4 指彈 A，和空弦 A 同音。"]}
      >
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
"^sul D""_0"D "_1"E "_2"^F "_3"G | "_4"A4 |]`}
          instrument={40}
        />
      </Example>
      <Example
        code={`v = tiny("d'2 a'2", inst="violin")
harmonic(v, "1 2")
score = v`}
      >
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
!open!d2 !open!a2 |]`}
          instrument={40}
        />
      </Example>
    </>
  );
}

function Pedal() {
  return (
    <>
      <P
        t={[
          "`pedal(part, \"1 2\")` holds the sustain pedal over bar 1, changes it at bar 2 (up and straight down again) and lifts it at the end of bar 2. Spans that don't touch lift the pedal between them: `\"1 3\"`. A span can start or end on a beat: `\"1:3-2\"` is from bar 1, beat 3 to the end of bar 2.",
          "`pedal(part, \"1 2\")` 在第 1 小節踩住延音踏板，在第 2 小節換踏板（放開再立刻踩下），第 2 小節結束時放開。不相連的範圍之間會放開踏板：`\"1 3\"`。範圍可以從某一拍開始或結束：`\"1:3-2\"` 是從第 1 小節第 3 拍到第 2 小節結尾。",
        ]}
      />
      <Example
        code={`left = tiny("C4 G c e FF C F A", inst="piano")
pedal(left, "1 2")
score = left`}
        note={["Playback holds the notes while the pedal is down.", "踏板踩下時，播放會延續聲音。"]}
      >
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C clef=bass
"_Ped."C, G, C E | "_Ped."F,, C, F, "_✱"A, |]`}
          instrument={0}
        />
      </Example>
    </>
  );
}

function PianoFingers() {
  return (
    <>
      <P
        t={[
          "Piano fingers are 1 (thumb) to 5 (little finger), in either hand: `fingering(part, \"1 2 3 4 5\")`. `text(part, 1, \"m.d.\")` marks the right hand (mano destra; m.s. for the left), `una_corda(part, \"3-4\")` asks for the soft pedal (\"una corda\" … \"tre corde\"), and `arpeggio(part, notes)` rolls chords.",
          "鋼琴兩手的手指都是 1（拇指）到 5（小指）：`fingering(part, \"1 2 3 4 5\")`。`text(part, 1, \"m.d.\")` 標示右手（mano destra；左手是 m.s.），`una_corda(part, \"3-4\")` 要求弱音踏板（「una corda」…「tre corde」），`arpeggio(part, notes)` 讓和弦琶音。",
        ]}
      />
      <Example
        code={`right = tiny("c4 d e f g1", inst="piano")
fingering(right, "1 2 3 4 5")
text(right, 1, "m.d.")
score = right`}
      >
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
"^m.d.""_1"C "_2"D "_3"E "_4"F | "_5"G4 |]`}
          instrument={0}
        />
      </Example>
    </>
  );
}

function Winds() {
  return (
    <>
      <P
        t={[
          "`breath(part, notes)` puts a breath mark (a comma) after each of the notes. Tonguing is shown by what is *not* slurred: every note outside a `slur()` is tongued, `staccato()` makes it short. `trill(part, notes)` writes \"tr\": alternate quickly with the note above.",
          "`breath(part, notes)` 在每個指定的音之後加換氣記號（逗號）。運舌由*沒有*圓滑線的音表示：`slur()` 以外的每個音都要吐音，`staccato()` 讓它短促。`trill(part, notes)` 寫上「tr」：與上方音快速交替。",
        ]}
      />
      <Example
        code={`fl = tiny("g'4 a' b'2 c''4 b' a'2 g'1", inst="flute")
slur(fl, 1, 3)
breath(fl, 3)
staccato(fl, "4 5")
trill(fl, 6)
score = fl`}
      >
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
(g a "^,"b2) | .c' .b !trill!a2 | g4 |]`}
          instrument={73}
        />
      </Example>
    </>
  );
}

function Lyrics() {
  return (
    <>
      <P
        t={[
          "`lyrics(part, \"…\")` puts one syllable under each note from note 1. Split a word into syllables with hyphens (`ma-man`); `_` holds the previous syllable over one more note.",
          "`lyrics(part, \"…\")` 從第 1 個音起，每個音下放一個音節。用連字號把字分成音節（`ma-man`）；`_` 讓前一個音節延續到下一個音。",
        ]}
      />
      <Example
        code={`v = tiny("c4 c g g a a g2", inst="voice")
lyrics(v, "Ah vous di-rai-je ma-man")
score = v`}
        note={["The French song (1761) that Twinkle, Twinkle borrowed its tune from.", "〈小星星〉借用其旋律的法國歌曲（1761）。"]}
      >
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
C C G G | A A G2 |]
w: Ah vous di-rai-je ma-man`}
          instrument={52}
        />
      </Example>
      <H t={["Breathing", "換氣"]} />
      <P
        t={[
          "Singers breathe at the ends of phrases and at commas in the words: `breath(part, notes)` marks it, as for wind players.",
          "歌手在樂句結尾和歌詞的逗號處換氣：用 `breath(part, notes)` 標示，和管樂一樣。",
        ]}
      />
    </>
  );
}

export const TECH_BODY: Record<string, () => ReactNode> = {
  "tech-bowing": Bowing,
  "tech-slurs": Slurs,
  "tech-strokes": Strokes,
  "tech-violin-fingers": ViolinFingers,
  "tech-pedal": Pedal,
  "tech-piano-fingers": PianoFingers,
  "tech-winds": Winds,
  "tech-lyrics": Lyrics,
};

/** each fill-in lesson's target: the answer's music and markings; (1), (2) … are the blanks, in order */
export const TECH_TARGETS: Record<string, () => ReactNode> = {
  "tech-bowing": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C
!downbow!D "^(1)"!upbow!E !downbow!^F "^(2)"!upbow!G | !downbow!A2 "^(3)"!upbow!A2 |]`}
      caption={["Blanks (1)–(3) are the up-bows.", "空格 (1)–(3) 是上弓。"]}
      instrument={40}
    />
  ),
  "tech-slurs": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C
(!downbow!G A) (!upbow!B "^(1)"c) | ("^(2)"!downbow!d c) (!upbow!B A) | !downbow!G4 |]`}
      caption={["Blank (1) ends the second slur, blank (2) starts the third.", "空格 (1) 是第二條圓滑線的結尾，空格 (2) 是第三條的開頭。"]}
      instrument={40}
    />
  ),
  "tech-strokes": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C
"^(1)".G .A .B .c | "^(2) pizz."d c B2 |]`}
      caption={["(1): the staccato notes; (2): the pizzicato bar.", "(1)：斷奏的音；(2)：撥奏的小節。"]}
      instrument={40}
    />
  ),
  "tech-violin-fingers": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C
"_0"A "_1"B "_2"^c "_3"d | "^(1)""_0"e "_1"^f "_2"^g "^(2)""_3"a |]`}
      caption={["Fingers under the notes; (1) and (2) are the blanks.", "音符下方是指法；(1) 和 (2) 是空格。"]}
      instrument={40}
    />
  ),
  "tech-pedal": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C clef=bass
"_Ped."C, G, C E | "_(1) Ped."F,, C, F, A, | "_Ped."G,, D, G, B, | "_(2) Ped."C, G, C "_✱"E |]`}
      caption={["A new pedal with each chord; (1) and (2) are the blanks.", "每個和弦換一次踏板；(1) 和 (2) 是空格。"]}
      instrument={0}
    />
  ),
  "tech-piano-fingers": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C
"_1"C "_2"D "_3"E "^(1)""_1"F | "_2"G "_3"A "_4"B "_5"c |]`}
      caption={["Blank (1): the thumb passes under to play F.", "空格 (1)：拇指穿過去彈 F。"]}
      instrument={0}
    />
  ),
  "tech-winds": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C
g a b g | a2 "^, (1)"d2 | g a b c' | b2 g2 |]`}
      caption={["Blank (1): the breath after the end of the first phrase.", "空格 (1)：第一句結尾之後的換氣。"]}
      instrument={73}
    />
  ),
  "tech-lyrics": () => (
    <Notation
      abc={`X:1
M:4/4
L:1/4
K:C
C C G G | "^(1)"A A G2 |]
w: Twin-kle twin-kle lit-tle star`}
      caption={["Blank (1): the two syllables under the A's.", "空格 (1)：兩個 A 下方的兩個音節。"]}
      instrument={52}
    />
  ),
};
