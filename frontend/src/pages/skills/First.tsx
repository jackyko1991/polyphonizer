/** Coding Skills ▸ First music21 (#/skills/first[/<section>]). Every example runs as score code in the editor. */
import { Callout, Notation, List, P, Page, Py, Section, SiteLink, Sources, Table, TryIn, type SectionInfo } from "../kit";

const PAGE = "first";

const SECTIONS: SectionInfo[] = [
  { id: "file", title: ["A score is a Python file", "樂譜就是一個 Python 檔案"] },
  { id: "notes", title: ["Notes, rests and chords", "音符、休止符與和弦"] },
  { id: "tiny", title: ["tinyNotation: a melody in one line", "tinyNotation：一行寫完一段旋律"] },
  { id: "streams", title: ["Parts and scores", "聲部與總譜"] },
  { id: "change", title: ["Changing music with code", "用程式碼改寫音樂"] },
  { id: "cheatsheet", title: ["Cheat sheet", "速查表"] },
];

const MUSIC21 = { label: "music21 User's Guide", url: "https://www.music21.org/music21docs/usersGuide/index.html" };
const TINY = {
  label: "music21 documentation: tinyNotation",
  url: "https://www.music21.org/music21docs/moduleReference/moduleTinyNotation.html",
};

export default function FirstSkill({ section }: { section: string | null }) {
  return (
    <Page
      id={PAGE}
      title={["First music21", "第一步 music21"]}
      intro={[
        "music21 is a Python library for music, written at MIT and used in music research and teaching. Polyphonizer runs it in your browser: your code builds the music out of music21 objects, and the page engraves, plays and checks the result. A handful of objects write most scores; this page shows them, each in a short example you can paste into the editor and run.",
        "music21 是 MIT 開發的 Python 音樂函式庫，廣泛用於音樂研究與教學。Polyphonizer 在你的瀏覽器裡執行它：你的程式碼用 music21 的物件組出音樂，頁面再把結果排版、播放並檢查。只要幾個物件就能寫出大部分樂譜；這一頁逐一介紹，每個都附上短例，可以貼進編輯器直接執行。",
      ]}
      sections={SECTIONS}
      focus={section}
    >
      <Section page={PAGE} id="file" n={1} title={SECTIONS[0].title}>
        <P
          t={[
            "In the editor, a score is the code in `main.py`. Two lines are added in front of it for you, so you never write them: `from music21 import *` (all of music21's modules: `note`, `chord`, `stream`, `key` …) and a line that imports Polyphonizer's own helpers, such as `tiny`, `together` and `load`. Your code has one duty: **set a variable named `score`**. When you press **Run**, Polyphonizer takes `score` and draws it.",
            "在編輯器裡，樂譜就是 `main.py` 裡的程式碼。前面會自動幫你加上兩行，你不必自己寫：`from music21 import *`（music21 的所有模組：`note`、`chord`、`stream`、`key`……）以及匯入 Polyphonizer 自己的輔助函式（例如 `tiny`、`together` 與 `load`）的一行。你的程式碼只有一個任務：**設定一個名為 `score` 的變數**。按下**執行**，Polyphonizer 就會拿 `score` 來畫出樂譜。",
          ]}
        />
        <Py
          code={`melody = tiny("c4 d e f g1", name="Flute", inst="flute")
score = melody`}
          note={["five notes for flute: four quarters and a whole note, two bars", "給長笛的五個音：四個四分音符和一個全音符，共兩小節"]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
C D E F | G4 |]`}
          caption={["What the code makes", "程式碼產生的音樂"]}
          instrument={73}
        />
        <P
          t={[
            "`score` may be a whole score, one part, or any music21 stream; a single part becomes a score with one staff. The rest of the file is ordinary Python: variables, loops, functions, comments after `#`.",
            "`score` 可以是整份總譜、單一聲部，或任何 music21 的 stream；單一聲部會變成只有一行譜表的總譜。檔案其餘部分就是普通的 Python：變數、迴圈、函式，以及 `#` 之後的註解。",
          ]}
        />
        <Callout kind="tip" title={["Mistakes are underlined as you type", "打字時就會標出錯誤"]}>
          <P
            t={[
              "The editor checks your code while you write (with Ruff, running in the browser): an unknown name, a missing bracket or a file with no `score =` is underlined before you even run it. Hover over the line to read the message.",
              "編輯器會在你輸入時檢查程式碼（用 Ruff，在瀏覽器裡執行）：未知的名稱、少了括號，或檔案裡沒有 `score =`，還沒執行就會畫上底線。把滑鼠移到那一行就能讀訊息。",
            ]}
          />
          <p>
            <SiteLink to={["skills", "errors"]} label={["Reading errors", "讀懂錯誤訊息"]} />
          </p>
        </Callout>
        <p>
          <SiteLink to={["editor"]} label={["Open the score editor", "開啟樂譜編輯器"]} />
        </p>
      </Section>

      <Section page={PAGE} id="notes" n={2} title={SECTIONS[1].title}>
        <P
          t={[
            "Three objects hold every sound and silence. `note.Note(\"G4\")` is one pitch; `note.Rest()` is a silence; `chord.Chord([\"C4\", \"E4\", \"G4\"])` is several pitches at once. Each has a duration, given as `quarterLength`: how many quarter notes it lasts.",
            "三種物件裝下所有的聲音與靜默。`note.Note(\"G4\")` 是一個音高；`note.Rest()` 是一段休止；`chord.Chord([\"C4\", \"E4\", \"G4\"])` 是同時響起的幾個音高。每個物件都有時值，用 `quarterLength` 表示：它持續幾個四分音符。",
          ]}
        />
        <Py
          code={`p = stream.Part()
p.append(meter.TimeSignature("3/4"))
p.append(note.Note("G4", quarterLength=2))     # a half note
p.append(note.Note("A4"))                      # a quarter: quarterLength=1 is the default
p.append(chord.Chord(["C4", "E4", "G4"], quarterLength=2))
p.append(note.Rest())                          # a quarter rest
p.append(note.Note("F#5", quarterLength=1.5))  # a dotted quarter
p.append(note.Note("E-5", quarterLength=0.5))  # E flat, an eighth
p.append(note.Note("D5"))
score = p.makeMeasures()  # group the notes into bars`}
          note={["three bars of 3/4; `makeMeasures()` cuts the line into bars by the time signature", "三小節 3/4 拍；`makeMeasures()` 依拍號把一串音切成小節"]}
        />
        <Notation
          abc={`X:1
M:3/4
L:1/8
K:C
G4 A2 | [CEG]4 z2 | ^f3 _e d2 |]`}
          caption={["Three bars of 3/4: notes, a chord, a rest, a dotted quarter and an eighth", "三小節 3/4 拍：音符、和弦、休止符、附點四分與八分音符"]}
          instrument={0}
        />
        <P
          t={[
            "A **pitch name** is a letter, an optional accidental, and an octave number. Octave 4 starts at **middle C** (`C4`), and the number changes at each C: the B just below middle C is `B3`. Sharps are `#`, flats are `-` (music21 also accepts `Bb4`, but prints `B-4`); `##` and `--` are double sharps and flats.",
            "**音名**由字母、可有可無的升降記號，以及八度編號組成。第 4 個八度從**中央 C**（`C4`）開始，編號在每個 C 改變：中央 C 下方的 B 是 `B3`。升記號寫 `#`，降記號寫 `-`（music21 也接受 `Bb4`，但會印成 `B-4`）；`##` 與 `--` 是重升與重降。",
          ]}
        />
        <Table
          head={[
            ["Note value", "音符"],
            ["`quarterLength`", "`quarterLength`"],
            ["In tinyNotation", "tinyNotation 寫法"],
          ]}
          rows={[
            [["whole", "全音符"], ["`4`", "`4`"], ["`c1`", "`c1`"]],
            [["half", "二分音符"], ["`2`", "`2`"], ["`c2`", "`c2`"]],
            [["dotted quarter", "附點四分音符"], ["`1.5`", "`1.5`"], ["`c4.`", "`c4.`"]],
            [["quarter", "四分音符"], ["`1`", "`1`"], ["`c4`", "`c4`"]],
            [["eighth", "八分音符"], ["`0.5`", "`0.5`"], ["`c8`", "`c8`"]],
            [["sixteenth", "十六分音符"], ["`0.25`", "`0.25`"], ["`c16`", "`c16`"]],
          ]}
        />
        <TryIn ids={["hello-scale"]} />
      </Section>

      <Section page={PAGE} id="tiny" n={3} title={SECTIONS[2].title}>
        <P
          t={[
            "Writing one `note.Note` per note is slow. **tinyNotation**, a small text format built into music21, writes a whole melody in one string, and the helper `tiny()` turns the string into a part with bars:",
            "每個音都寫一個 `note.Note` 太慢了。**tinyNotation** 是 music21 內建的小型文字格式，一個字串就能寫完一整段旋律；輔助函式 `tiny()` 會把字串變成分好小節的聲部：",
          ]}
        />
        <Py
          code={`twinkle = tiny("c4 c g g a a g2 f4 f e e d d c2", name="Violin", inst="violin")
score = twinkle`}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 |]`}
          caption={["*Twinkle, Twinkle, Little Star* from one line of tinyNotation", "一行 tinyNotation 寫出〈小星星〉"]}
          instrument={40}
        />
        <P
          t={[
            "Each word is one note: a letter for the pitch, a number for the value (`4` quarter, `2` half, `8` eighth …). **A number carries on**: `c4 c g g` is four quarters, until the next number changes it. Octaves are marked by case and by `'` and `,`:",
            "每個詞是一個音：字母代表音高，數字代表時值（`4` 四分、`2` 二分、`8` 八分……）。**數字會延續下去**：`c4 c g g` 是四個四分音符，直到下一個數字改變它。八度用大小寫，以及 `'` 與 `,` 標示：",
          ]}
        />
        <Table
          head={[
            ["You write", "你寫"],
            ["You get", "得到"],
          ]}
          rows={[
            [["`c` `d` … `b`", "`c` `d` … `b`"], ["the octave from middle C up: `C4` … `B4`", "從中央 C 往上的八度：`C4` … `B4`"]],
            [["`c'` `c''`", "`c'` `c''`"], ["one or two octaves higher: `C5`, `C6`", "高一或兩個八度：`C5`、`C6`"]],
            [["`C` `CC`", "`C` `CC`"], ["one or two octaves lower: `C3`, `C2`", "低一或兩個八度：`C3`、`C2`"]],
            [["`f#` `b-` `en`", "`f#` `b-` `en`"], ["sharp, flat, a printed natural", "升、降、印出還原記號"]],
            [["`c4.` `trip{c8 d e}`", "`c4.` `trip{c8 d e}`"], ["a dotted note; a triplet", "附點音符；三連音"]],
            [["`r4`", "`r4`"], ["a quarter rest", "四分休止符"]],
            [["`c2~ c8`", "`c2~ c8`"], ["a tie: one sound held across the two notes", "連結線：一個聲音延續過兩個音"]],
          ]}
        />
        <Py
          code={`line = tiny("a4. g8 f4 e f2 r4 d e f g a c#2~ c#8 r8 d4", key_sig="d", name="Flute", inst="flute")
score = line`}
          note={[
            "four bars in D minor (lowercase `d` = minor): a dotted note, a rest, a tie, and C♯ as the leading note",
            "四小節 D 小調（小寫 `d` = 小調）：附點音符、休止符、連結線，以及導音 C♯",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/8
K:Dm
A3 G F2 E2 | F4 z2 D2 | E2 F2 G2 A2 | ^C4- ^C z D2 |]`}
          caption={["D minor: the dotted note, the rest, the tie and the C♯", "D 小調：附點音符、休止符、連結線與 C♯"]}
          instrument={73}
        />
        <P
          t={[
            "`tiny()` takes the notes and, optionally: `time=\"3/4\"` (the time signature, 4/4 if left out), `name=` (the part's name on the score), `key_sig=` (`\"G\"` for G major, `\"e\"` for E minor), `inst=` (one of `violin`, `viola`, `cello`, `flute`, `piano`, `voice`: the sound used for playback) and `clef_=` (`\"treble\"`, `\"bass\"`, `\"alto\"`, `\"tenor\"`).",
            "`tiny()` 接受音符字串，以及可選的：`time=\"3/4\"`（拍號，不寫就是 4/4）、`name=`（譜上的聲部名稱）、`key_sig=`（`\"G\"` 是 G 大調，`\"e\"` 是 e 小調）、`inst=`（`violin`、`viola`、`cello`、`flute`、`piano`、`voice` 之一：播放用的音色）以及 `clef_=`（`\"treble\"`、`\"bass\"`、`\"alto\"`、`\"tenor\"`）。",
          ]}
        />
        <Py code={`waltz = tiny("trip{c8 d e} f4 g e2 r4", time="3/4")
score = waltz`} />
        <Notation
          abc={`X:1
M:3/4
L:1/8
K:C
(3CDE F2 G2 | E4 z2 |]`}
          caption={["A triplet in 3/4", "3/4 拍裡的三連音"]}
          instrument={0}
        />
        <Callout kind="warn" title={["The key signature does not change the letters", "調號不會改變字母"]}>
          <P
            t={[
              "In `tiny(\"g4 f e d\", key_sig=\"G\")` the `f` is F natural, and the score prints a natural sign: the letter says the pitch, the key only draws the signature. In G major write `f#`. Also, a word tinyNotation does not understand is **skipped without an error**: `h4` (German for B) or `c3` (there is no 3rd-note) simply vanish. Count your notes when something seems missing.",
              "在 `tiny(\"g4 f e d\", key_sig=\"G\")` 裡，`f` 是還原的 F，譜上會印出還原記號：字母決定音高，調號只負責畫出記號。在 G 大調要寫 `f#`。另外，tinyNotation 看不懂的詞會**被略過，不會報錯**：`h4`（德文的 B）或 `c3`（沒有「三分音符」）就這樣消失了。覺得少了音時，數一數音符。",
            ]}
          />
        </Callout>
        <Sources items={[TINY]} />
      </Section>

      <Section page={PAGE} id="streams" n={4} title={SECTIONS[3].title}>
        <P
          t={[
            "music21 keeps music in **streams**: containers of notes and markings, each placed at an offset (in quarter notes from the start). The ones you meet are a `stream.Measure` (one bar), a `stream.Part` (one player's line, made of measures) and a `stream.Score` (parts that sound together, top to bottom). `tiny()` returns a Part; the helper `together()` stacks Parts into a Score:",
            "music21 把音樂放在 **stream** 裡：裝著音符與記號的容器，每個元素都放在某個位移（offset，從開頭算起的四分音符數）上。你會碰到的有 `stream.Measure`（一個小節）、`stream.Part`（一位演奏者的聲部，由小節組成）與 `stream.Score`（同時發聲的幾個聲部，由上到下）。`tiny()` 傳回一個 Part；輔助函式 `together()` 把幾個 Part 疊成一份 Score：",
          ]}
        />
        <Py
          code={`violin = tiny("e'4 d' c' d' e' e' e'2", name="Violin", inst="violin")
cello = tiny("C2 GG C2 C", name="Cello", inst="cello", clef_="bass")
score = together(violin, cello, title="Two parts", bpm=88)`}
          note={["`title=` goes on top of the score; `bpm=` puts a tempo mark (quarter = 88) in the first bar", "`title=` 放在總譜最上方；`bpm=` 在第一小節放一個速度記號（四分音符 = 88）"]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
e d c d | e e e2 |]`}
          caption={["Violin", "小提琴"]}
          instrument={40}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C clef=bass
C,2 G,,2 | C,2 C,2 |]`}
          caption={["Cello (bass clef)", "大提琴（低音譜號）"]}
          instrument={42}
        />
        <P
          t={[
            "Without the helpers, the markings are objects too: `key.Key(\"G\")`, `meter.TimeSignature(\"3/4\")` and `tempo.MetronomeMark(number=72)`. Put them at the start of the part, then the notes, then let `makeMeasures()` cut it into bars. This is what `tiny()` and `together()` do for you:",
            "不用輔助函式時，這些記號也都是物件：`key.Key(\"G\")`、`meter.TimeSignature(\"3/4\")` 與 `tempo.MetronomeMark(number=72)`。把它們放在聲部開頭，接著放音符，再用 `makeMeasures()` 切成小節。`tiny()` 與 `together()` 替你做的就是這些：",
          ]}
        />
        <Py
          code={`right = stream.Part()
right.append(key.Key("G"))
right.append(meter.TimeSignature("3/4"))
right.append(tempo.MetronomeMark(number=72))
for name in ["G4", "A4", "B4", "D5", "C5", "B4"]:
    right.append(note.Note(name))
right = right.makeMeasures()
right.partName = "Piano"
score = stream.Score()
score.insert(0, right)`}
          note={[
            "`makeMeasures()` returns a new part, so set the name after it; `insert(0, …)` puts the part at the start of the score",
            "`makeMeasures()` 會傳回新的聲部，所以名稱要在它之後設定；`insert(0, …)` 把聲部放在總譜開頭",
          ]}
        />
        <Notation
          abc={`X:1
M:3/4
L:1/4
K:G
G A B | d c B |]`}
          caption={["G major, 3/4, quarter = 72", "G 大調、3/4 拍、四分音符 = 72"]}
          instrument={0}
        />
        <Callout kind="note" title={["`append` or `insert`?", "`append` 還是 `insert`？"]}>
          <P
            t={[
              "`append` puts an object right after the last one: the way to write a melody. `insert(offset, …)` puts it at a given offset: the way to stack parts in a score, all at `0`.",
              "`append` 把物件接在最後一個後面：寫旋律就用它。`insert(offset, …)` 把物件放在指定的位移：把聲部疊進總譜時用它，全部放在 `0`。",
            ]}
          />
        </Callout>
        <p>
          <SiteLink to={["concept", "theory"]} label={["Music theory as code", "以程式碼表達樂理"]} />
        </p>
      </Section>

      <Section page={PAGE} id="change" n={5} title={SECTIONS[4].title}>
        <P
          t={[
            "Because the music is made of objects, code can change it. `transpose()` moves every note by an interval, written as a quality and a number: `\"P5\"` a perfect fifth up, `\"M2\"` a major second, `\"-P8\"` an octave down. A `for` loop over `recurse().notes` visits every note and chord, wherever it sits in bars and parts:",
            "音樂是由物件組成的，所以程式碼可以改寫它。`transpose()` 把每個音移動一個音程，音程寫成性質加度數：`\"P5\"` 往上完全五度、`\"M2\"` 大二度、`\"-P8\"` 往下一個八度。對 `recurse().notes` 跑 `for` 迴圈，就能走過每一個音符與和弦，不管它在哪個小節、哪個聲部：",
          ]}
        />
        <Py
          code={`theme = tiny("c4 d e c", name="Theme")
answer = theme.transpose("P5")       # every note a perfect fifth higher
answer.partName = "Answer"
for n in answer.recurse().notes:     # walk through the notes and change them
    n.articulations.append(articulations.Staccato())
score = together(answer, theme)`}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
.G .A .B .G |]`}
          caption={["The answer: a fifth higher, staccato", "回應：高五度、斷奏"]}
          instrument={0}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
C D E C |]`}
          caption={["The theme", "主題"]}
          instrument={0}
        />
        <List
          items={[
            [
              "`n.pitch.nameWithOctave` (`\"G4\"`), `n.pitch.midi` (`67`) and `n.quarterLength` read a note.",
              "`n.pitch.nameWithOctave`（`\"G4\"`）、`n.pitch.midi`（`67`）與 `n.quarterLength` 可以讀出一個音的資訊。",
            ],
            [
              "`n.measureNumber` tells which bar a note is in: useful in your own checks.",
              "`n.measureNumber` 告訴你音符在第幾小節：寫自己的檢查時很有用。",
            ],
            [
              "`part.measures(1, 4)` is a copy of bars 1 to 4; `score.parts[0]` is the top part.",
              "`part.measures(1, 4)` 是第 1 到第 4 小節的副本；`score.parts[0]` 是最上面的聲部。",
            ],
          ]}
        />
        <TryIn ids={["ode-for-flute"]} />
        <Sources items={[MUSIC21, { label: "music21 User's Guide, Chapter 6: Streams (II): Hierarchies, Recursion, and Flattening", url: "https://www.music21.org/music21docs/usersGuide/usersGuide_06_stream2.html" }]} />
      </Section>

      <Section page={PAGE} id="cheatsheet" n={6} title={SECTIONS[5].title}>
        <Table
          head={[
            ["To write", "要寫"],
            ["Code", "程式碼"],
          ]}
          rows={[
            [["a melody", "一段旋律"], ["`tiny(\"c4 d e f g1\")`", "`tiny(\"c4 d e f g1\")`"]],
            [["one note, one rest, one chord", "一個音、一個休止、一個和弦"], ["`note.Note(\"G4\")`, `note.Rest()`, `chord.Chord([\"C4\", \"E4\", \"G4\"])`", "`note.Note(\"G4\")`、`note.Rest()`、`chord.Chord([\"C4\", \"E4\", \"G4\"])`"]],
            [["a duration", "時值"], ["`quarterLength=1.5`", "`quarterLength=1.5`"]],
            [["key, time, tempo", "調號、拍號、速度"], ["`key.Key(\"G\")`, `meter.TimeSignature(\"3/4\")`, `tempo.MetronomeMark(number=72)`", "`key.Key(\"G\")`、`meter.TimeSignature(\"3/4\")`、`tempo.MetronomeMark(number=72)`"]],
            [["parts into a score", "把聲部組成總譜"], ["`together(violin, cello, title=\"…\", bpm=88)`", "`together(violin, cello, title=\"…\", bpm=88)`"]],
            [["a transposed copy", "移調後的副本"], ["`part.transpose(\"P5\")`", "`part.transpose(\"P5\")`"]],
            [["every note", "每一個音"], ["`for n in part.recurse().notes:`", "`for n in part.recurse().notes:`"]],
            [["the result", "結果"], ["`score = …`", "`score = …`"]],
          ]}
        />
        <P
          t={[
            "Next: start from music that already exists, or organise a longer piece.",
            "下一步：從已經存在的音樂開始，或是組織一首比較長的曲子。",
          ]}
        />
        <p className="flex flex-wrap gap-4">
          <SiteLink to={["skills", "corpus"]} label={["Finding and importing music", "尋找與匯入樂譜"]} />
          <SiteLink to={["skills", "structure"]} label={["Structuring a score", "組織樂譜"]} />
        </p>
      </Section>
    </Page>
  );
}
