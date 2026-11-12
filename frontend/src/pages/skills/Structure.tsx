/** Coding Skills ▸ Structuring a score (#/skills/structure[/<section>]). Every example runs as score code. */
import { Callout, Notation, List, P, Page, Py, Section, SiteLink, Sources, Table, TryIn, type SectionInfo } from "../kit";

const PAGE = "structure";

const SECTIONS: SectionInfo[] = [
  { id: "names", title: ["One name per part, one name per phrase", "每個聲部一個名字，每個樂句一個名字"] },
  { id: "motifs", title: ["Motifs as functions", "動機寫成函式"] },
  { id: "files", title: ["Several files", "多個檔案"] },
  { id: "form", title: ["Form: sections and repeats", "曲式：段落與反覆"] },
  { id: "arranging", title: ["Arranging for other instruments", "改編給其他樂器"] },
  { id: "habits", title: ["Habits that keep a score readable", "讓樂譜保持可讀的習慣"] },
];

const MOTIFS_PY = `import copy


def notes(text):
    """the notes of a tinyNotation string, as a list"""
    return list(tiny(text).recurse().notesAndRests)


def moved(motif, by):
    """the motif moved by an interval: "M2" up a major second, "-P4" down a fourth"""
    return [n.transpose(by) for n in motif]


def line(*pieces, name):
    """one part from several lists of notes, one after another"""
    part = stream.Part()
    for piece in pieces:
        for n in piece:
            part.append(copy.deepcopy(n))
    part = part.makeMeasures()
    part.partName = name
    return part


theme = notes("c8 d e f g4 e")`;

export default function StructureSkill({ section }: { section: string | null }) {
  return (
    <Page
      id={PAGE}
      title={["Structuring a score", "組織樂譜"]}
      intro={[
        "Eight bars fit in one line of code; a whole movement does not. Music is full of repetition: phrases that come back, motifs that move up and down, sections in a form. Code has names, functions, loops and files for exactly that. Use them, and a long score stays as easy to read as the music.",
        "八小節可以寫在一行程式碼裡；一整個樂章就不行了。音樂充滿重複：樂句會回來、動機會上下移動、段落組成曲式。程式碼正好有名字、函式、迴圈與檔案來處理這些。用上它們，長篇樂譜就能和音樂本身一樣好讀。",
      ]}
      sections={SECTIONS}
      focus={section}
    >
      <Section page={PAGE} id="names" n={1} title={SECTIONS[0].title}>
        <P
          t={[
            "Give each phrase a name, then build the melody from the names. The form is now written in the code: here, Beethoven's *Ode to Joy* is A B A C, and you can read that in the last line before you hear it.",
            "替每個樂句取一個名字，再用這些名字組出旋律。曲式就直接寫在程式碼裡了：這裡貝多芬的〈快樂頌〉是 A B A C，看最後一行就讀得出來，不必先聽。",
          ]}
        />
        <Py
          code={`a = "e4 e f g g f e d"         # phrase A
b = "c4 c d e e4. d8 d2"       # phrase B: A's answer
c = "c4 c d e d4. c8 c2"       # phrase C: the close
melody = tiny(" ".join([a, b, a, c]), name="Violin", inst="violin")
score = melody`}
          note={["eight bars from three phrases; `\" \".join` puts the strings one after another", "三個樂句組成八小節；`\" \".join` 把字串一個接一個串起來"]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/8
K:C
E2 E2 F2 G2 | G2 F2 E2 D2 | C2 C2 D2 E2 | E3 D D4 |]`}
          caption={["Phrases A and B, the first four of the eight bars", "A、B 兩個樂句：八小節中的前四小節"]}
          instrument={40}
        />
        <Callout kind="warn" title={["Start each phrase with a duration", "每個樂句都以時值開頭"]}>
          <P
            t={[
              "In tinyNotation a number carries on to the next notes, **across your strings too**: phrase B ends on `d2`, so if A started with a bare `e` it would become a half note. Writing `e4` at the start of every phrase makes each one safe to reuse anywhere.",
              "在 tinyNotation 裡，數字會延續到後面的音，**連跨過字串也一樣**：B 樂句結束在 `d2`，如果 A 開頭只寫 `e`，它就會變成二分音符。每個樂句開頭都寫 `e4`，每一句就能安心放到任何地方重複使用。",
            ]}
          />
        </Callout>
        <P
          t={[
            "The same goes for parts: one variable per part (`violin`, `cello`), named after the player, and one line at the end that stacks them: `score = together(violin, cello)`. When a part is given and must not change, say so in a comment: Learn to Code's problems mark it `# given: don't change`.",
            "聲部也一樣：每個聲部一個變數（`violin`、`cello`），以演奏者命名，最後一行再把它們疊起來：`score = together(violin, cello)`。如果某個聲部是給定的、不能改，就在註解裡寫明：「學寫程式」頁的題目會標上 `# given: don't change`。",
          ]}
        />
      </Section>

      <Section page={PAGE} id="motifs" n={2} title={SECTIONS[1].title}>
        <P
          t={[
            "A string cannot be transposed, but a list of music21 notes can. Three small functions turn a motif into music: `notes()` reads tinyNotation into a list, `moved()` transposes the list, `line()` lays lists end to end into a part with bars. Each copy of the motif comes from **one definition**: change the motif, and every transposition changes with it.",
            "字串不能移調，但一串 music21 的音符可以。三個小函式就能把動機變成音樂：`notes()` 把 tinyNotation 讀成一個串列，`moved()` 把串列移調，`line()` 把幾個串列首尾相接，排成分好小節的聲部。動機的每一份複本都來自**同一個定義**：改了動機，每個移調版本都跟著改。",
          ]}
        />
        <Py
          code={`import copy


def notes(text):
    """the notes of a tinyNotation string, as a list"""
    return list(tiny(text).recurse().notesAndRests)


def moved(motif, by):
    """the motif moved by an interval: "M2" up a major second, "-P4" down a fourth"""
    return [n.transpose(by) for n in motif]


def backwards(motif):
    """the motif in retrograde: last note first"""
    return [copy.deepcopy(n) for n in reversed(motif)]


def line(*pieces, name):
    """one part from several lists of notes, one after another"""
    part = stream.Part()
    for piece in pieces:
        for n in piece:
            part.append(copy.deepcopy(n))
    part = part.makeMeasures()
    part.partName = name
    return part


motif = notes("c8 d e f g4 e")
score = line(motif, moved(motif, "M2"), moved(motif, "M3"), backwards(motif), name="Flute")`}
          note={[
            "a rising sequence (the motif, then a tone and a third higher) and the motif backwards: four bars",
            "上行模進（動機，接著高一個全音、再高一個三度），再加上倒過來的動機：共四小節",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/8
K:C
C D E F G2 E2 | D E ^F G A2 ^F2 | E ^F ^G A B2 ^G2 | E2 G2 F E D C |]`}
          caption={["The motif, a major second higher, a major third higher, and backwards", "動機、高大二度、高大三度，以及倒過來"]}
          instrument={73}
        />
        <List
          items={[
            [
              "**Why `copy.deepcopy`?** A note object can be in a part only once: appending the same object a second time (the motif played twice) stops with `StreamException: the object … is already found in this Stream`. A deep copy is a new note.",
              "**為什麼要 `copy.deepcopy`？** 同一個音符物件在一個聲部裡只能出現一次：把同一個物件再加入一次（例如動機演奏兩次），就會停在 `StreamException: the object … is already found in this Stream`。深拷貝則是一個新的音符。",
            ],
            [
              "**Intervals move by step names**: `moved(motif, \"M2\")` on C D E F G gives D E F♯ G A, a real major second higher, not the next notes of the scale. For a sequence that stays in the key, pick each interval (`\"M2\"`, `\"m2\"`) to match the scale.",
              "**音程是以音名移動的**：對 C D E F G 做 `moved(motif, \"M2\")` 會得到 D E F♯ G A，是真正的大二度，而不是音階上的下一組音。要讓模進留在調內，就依音階挑選每一個音程（`\"M2\"`、`\"m2\"`）。",
            ],
            [
              "A docstring (the `\"\"\"…\"\"\"` line) under each function says what it gives back. You will thank yourself next week.",
              "每個函式底下的說明字串（`\"\"\"…\"\"\"` 那一行）寫清楚它傳回什麼。下週的你會感謝自己。",
            ],
          ]}
        />
      </Section>

      <Section page={PAGE} id="files" n={3} title={SECTIONS[2].title}>
        <P
          t={[
            "When the helpers grow, move them out of the way. A project in the editor can hold several Python files: `main.py` sets `score`; any other file is a **module** that `main.py` imports by its name. Every file gets the same two automatic import lines, so a module can use `tiny`, `stream` and the rest directly.",
            "輔助函式變多時，就把它們移開。編輯器裡的一個專案可以有好幾個 Python 檔：`main.py` 設定 `score`；其他任何檔案都是**模組**，由 `main.py` 用它的名字匯入。每個檔案都會自動加上同樣的兩行匯入，所以模組裡可以直接用 `tiny`、`stream` 等等。",
          ]}
        />
        <Py code={MOTIFS_PY} title="motifs.py" />
        <Py
          title="main.py"
          code={`from motifs import line, moved, theme

flute = line(theme, moved(theme, "P4"), theme, name="Flute")
cello = line(moved(theme, "-P15"), moved(theme, "-P12"), moved(theme, "-P15"), name="Cello")
score = together(flute, cello)`}
          note={["the cello plays the theme two octaves lower, then answers a fourth above that", "大提琴低兩個八度演奏主題，接著在那之上四度回應"]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/8
K:C
C D E F G2 E2 | F G A _B c2 A2 | C D E F G2 E2 |]`}
          caption={["Flute: the theme, a fourth higher, the theme", "長笛：主題、高四度、主題"]}
          instrument={73}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/8
K:C clef=bass
C,, D,, E,, F,, G,,2 E,,2 | F,, G,, A,, _B,, C,2 A,,2 | C,, D,, E,, F,, G,,2 E,,2 |]`}
          caption={["Cello: two octaves lower, then a fourth above that", "大提琴：低兩個八度，接著再高四度"]}
          instrument={42}
        />
        <List
          items={[
            [
              "The file name is the module name: `motifs.py` is imported as `from motifs import …`. Keep names lowercase, without spaces.",
              "檔名就是模組名：`motifs.py` 用 `from motifs import …` 匯入。檔名用小寫、不要有空格。",
            ],
            [
              "An error inside a module is reported with that file's name and line, so you know where to look.",
              "模組裡的錯誤會附上那個檔案的名稱與行號回報，讓你知道要去哪裡找。",
            ],
            [
              "Good candidates for a module: motifs, a progression you reuse, and your checks (see *Checking a score*).",
              "適合放進模組的東西：動機、會重複使用的和聲進行，以及你的檢查（見〈檢查樂譜〉）。",
            ],
          ]}
        />
      </Section>

      <Section page={PAGE} id="form" n={4} title={SECTIONS[3].title}>
        <P
          t={[
            "Form is the order of sections, so write it as a list of names, as in section 1. For a repeat you have two choices:",
            "曲式就是段落的順序，所以像第 1 節那樣，把它寫成一串名字。遇到反覆有兩種選擇：",
          ]}
        />
        <Table
          head={[
            ["", ""],
            ["Written out", "寫出來"],
            ["Repeat signs", "反覆記號"],
          ]}
          rows={[
            [
              ["In code", "程式碼"],
              ["`\" \".join([a, a, b])`", "`\" \".join([a, a, b])`"],
              ["`bar.Repeat(direction=\"start\")` / `\"end\"` on the barlines", "在小節線上放 `bar.Repeat(direction=\"start\")` / `\"end\"`"],
            ],
            [
              ["On the page", "譜面上"],
              ["Every bar printed; more pages, more turns", "每一小節都印出來；頁數多、翻頁也多"],
              ["Printed once; shorter parts", "只印一次；分譜比較短"],
            ],
            [
              ["When", "何時用"],
              ["The repeat changes (a new ending, other dynamics)", "反覆時有變化（不同的結尾、不同的力度）"],
              ["The repeat is identical", "反覆的內容完全相同"],
            ],
          ]}
        />
        <Py
          code={`verse = tiny("g4 e e2 f4 d d2", name="Voice")
bars = verse.getElementsByClass(stream.Measure)
bars.first().leftBarline = bar.Repeat(direction="start")
bars.last().rightBarline = bar.Repeat(direction="end")
score = verse`}
          note={["two bars between repeat signs; playback plays them twice", "兩小節夾在反覆記號之間；播放時會演奏兩次"]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
|: G E E2 | F D D2 :|`}
          caption={["Two bars between repeat signs", "反覆記號之間的兩小節"]}
          instrument={52}
        />
        <Callout kind="note" title={["What reads the repeat", "誰會理會反覆記號"]}>
          <P
            t={[
              "Playback follows the repeat signs. Your own code and Learn to Code's checker see the notes as written, **once**: a loop over `recurse().notes` meets each bar one time. If a rule depends on hearing the section twice (a cadence leading back to the start), write it out or check that join yourself.",
              "播放會依照反覆記號。你自己的程式碼與「學寫程式」頁的檢查器看到的是寫出來的音符，**只有一次**：對 `recurse().notes` 跑迴圈，每個小節只會遇到一次。如果某條規則取決於聽兩次（例如導回開頭的終止式），就把它寫出來，或自己檢查那個銜接處。",
            ]}
          />
        </Callout>
      </Section>

      <Section page={PAGE} id="arranging" n={5} title={SECTIONS[4].title}>
        <P
          t={[
            "Arranging a melody for another instrument is three questions: **does it fit the range**, **which clef reads best**, and **does the instrument read at sounding pitch**. The first two are a transposition by octaves and a `clef_=`:",
            "把旋律改編給另一種樂器，要回答三個問題：**音域放得下嗎**、**哪個譜號最好讀**，以及**這種樂器是否按實際音高讀譜**。前兩個問題靠八度移調與 `clef_=` 解決：",
          ]}
        />
        <Py
          code={`tune = "d'4 b g b d' g'2."
violin = tiny(tune, time="3/4", name="Violin", inst="violin")
viola = tiny(tune, time="3/4", name="Viola", inst="viola", clef_="alto").transpose("-P8")
cello = tiny(tune, time="3/4", name="Cello", inst="cello", clef_="bass").transpose("-P15")
score = together(violin, viola, cello)`}
          note={["one tune, three octaves, three clefs", "一段曲調、三個八度、三種譜號"]}
        />
        <Notation
          abc={`X:1
M:3/4
L:1/4
K:C
d B G | B c d | G3 |]`}
          caption={["Violin", "小提琴"]}
          instrument={40}
        />
        <Notation
          abc={`X:1
M:3/4
L:1/4
K:C clef=alto
D B, G, | B, C D | G,3 |]`}
          caption={["Viola, an octave lower, in the alto clef", "中提琴：低一個八度，中音譜號"]}
          instrument={41}
        />
        <Notation
          abc={`X:1
M:3/4
L:1/4
K:C clef=bass
D, B,, G,, | B,, C, D, | G,,3 |]`}
          caption={["Cello, two octaves lower, in the bass clef", "大提琴：低兩個八度，低音譜號"]}
          instrument={42}
        />
        <Table
          head={[
            ["Instrument", "樂器"],
            ["Lowest note", "最低音"],
            ["Clef", "譜號"],
          ]}
          rows={[
            [["Violin", "小提琴"], ["G3 (open G string)", "G3（G 空弦）"], ["treble", "高音譜號"]],
            [["Viola", "中提琴"], ["C3 (open C string)", "C3（C 空弦）"], ["alto; treble for high passages", "中音譜號；高音段落用高音譜號"]],
            [["Cello", "大提琴"], ["C2 (open C string)", "C2（C 空弦）"], ["bass; tenor and treble higher up", "低音譜號；更高時用次中音與高音譜號"]],
            [["Flute", "長笛"], ["C4 (middle C)", "C4（中央 C）"], ["treble", "高音譜號"]],
          ]}
        />
        <P
          t={[
            "The lowest notes are fixed by the instrument; music21 knows them too (`instrument.Violin().lowestNote` is G3). How high a part can go depends on the player: keep well below the top for students. *Checking a score* shows how to make the range a rule that runs with your code.",
            "最低音由樂器本身決定；music21 也知道（`instrument.Violin().lowestNote` 是 G3）。能寫多高則取決於演奏者：寫給學生時要離最高音遠一點。〈檢查樂譜〉示範如何把音域寫成一條規則，跟著程式碼一起執行。",
          ]}
        />
        <Callout kind="note" title={["Transposing instruments", "移調樂器"]}>
          <P
            t={[
              "Some instruments read notes that are not the notes they sound. A **clarinet in B♭** sounds a major second lower than written, so to hear C the player reads D. Write the music at sounding (concert) pitch, add the instrument, and tell music21 that the notes are sounding pitch; it then prints the part in written pitch:",
              "有些樂器讀的音和發出的音不一樣。**降 B 調單簧管**發出的音比譜上低一個大二度，所以要聽到 C，演奏者讀的是 D。用實際音高（音樂會音高）寫音樂，加上樂器，再告訴 music21 這些音是實際音高；它就會把分譜印成記譜音高：",
            ]}
          />
          <Py
            code={`clarinet = tiny("c4 d e f g1", name="Clarinet in B♭")
clarinet.insert(0, instrument.Clarinet())
clarinet.atSoundingPitch = True  # the notes above are the sounds you want
score = clarinet`}
            note={["the part is printed D E F♯ G A; your code and the checker still see C D E F G", "分譜印出 D E F♯ G A；你的程式碼與檢查器看到的仍是 C D E F G"]}
          />
          <Notation
            abc={`X:1
M:4/4
L:1/4
K:C
D E ^F G | A4 |]`}
            caption={["The clarinet part as printed (written pitch); it sounds a major second lower: C D E F G", "印出來的單簧管分譜（記譜音高）；實際聽到的低一個大二度：C D E F G"]}
            instrument={71}
          />
        </Callout>
        <TryIn ids={["twinkle-duet", "ode-for-flute"]} />
        <Sources
          items={[
            {
              label: "music21 documentation: instrument (lowestNote, transposition)",
              url: "https://www.music21.org/music21docs/moduleReference/moduleInstrument.html",
            },
          ]}
        />
      </Section>

      <Section page={PAGE} id="habits" n={6} title={SECTIONS[5].title}>
        <List
          ordered
          items={[
            [
              "**Name things as a musician would**: `verse`, `chorus`, `cello`, `cadence`, not `x2` or `part_b_final`.",
              "**用音樂家的說法命名**：`verse`、`chorus`、`cello`、`cadence`，而不是 `x2` 或 `part_b_final`。",
            ],
            [
              "**Write each idea once.** If you copy a line and change one note, make a function or a variable instead.",
              "**每個想法只寫一次。** 如果你複製一行再改一個音，就改用函式或變數。",
            ],
            [
              "**Keep `main.py` short**: it should read like the form of the piece, with the details in modules.",
              "**讓 `main.py` 保持簡短**：它讀起來應該像這首曲子的曲式，細節放在模組裡。",
            ],
            [
              "**Comment the music, not the Python**: `# answer, a fifth higher` helps; `# call transpose` does not.",
              "**註解寫音樂，不寫 Python**：`# 回應，高五度` 有幫助；`# 呼叫 transpose` 沒有。",
            ],
            [
              "**Compile often.** Small steps make an error easy to find.",
              "**常常編譯。** 一小步一小步走，錯誤就容易找。",
            ],
          ]}
        />
        <p className="flex flex-wrap gap-4">
          <SiteLink to={["skills", "verify"]} label={["Checking a score", "檢查樂譜"]} />
          <SiteLink to={["skills", "errors"]} label={["Reading errors", "讀懂錯誤訊息"]} />
          <SiteLink to={["concept", "theory"]} label={["Music theory as code", "以程式碼表達樂理"]} />
        </p>
      </Section>
    </Page>
  );
}
