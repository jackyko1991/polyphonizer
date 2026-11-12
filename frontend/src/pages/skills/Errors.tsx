/** Coding Skills ▸ Reading errors (#/skills/errors[/<section>]). Messages are the exact last lines Python and music21 print. */
import { RichText, useLang } from "@learnkit/web";
import { Callout, Notation, List, P, Page, Py, Section, SiteLink, Table, type L, type SectionInfo } from "../kit";

const PAGE = "errors";

const SECTIONS: SectionInfo[] = [
  { id: "where", title: ["Where errors show up", "錯誤出現在哪裡"] },
  { id: "anatomy", title: ["How to read any error", "怎麼讀任何一個錯誤"] },
  { id: "python", title: ["Python errors", "Python 錯誤"] },
  { id: "polyphonizer", title: ["Polyphonizer's own messages", "Polyphonizer 自己的訊息"] },
  { id: "music21", title: ["music21 errors", "music21 錯誤"] },
  { id: "music", title: ["Music that runs but is wrong", "能執行但不對的音樂"] },
  { id: "cheatsheet", title: ["Cheat sheet", "速查表"] },
];

/** What the editor shows after Compile: the message and the line, in a red box. */
function Says({ line, file, text }: { line?: number; file?: string; text: string }) {
  const { pick } = useLang();
  const where: L | null =
    line === undefined ? null : [`${file ? `${file}, ` : ""}line ${line}`, `${file ? `${file}，` : ""}第 ${line} 行`];
  return (
    <div className="rounded-lg border border-red-200 bg-white px-3 py-2">
      <p className="text-xs font-medium text-red-700">
        {pick(["Error", "錯誤"])}
        {where && ` · ${pick(where)}`}
      </p>
      <pre className="mt-1 font-mono text-xs whitespace-pre-wrap text-gray-800">{text}</pre>
    </div>
  );
}

/** A message that itself contains backticks, shown verbatim in code style (RichText cannot nest `code`). */
function Mono({ text }: { text: string }) {
  return <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-gray-800">{text}</code>;
}

/** A short bold label and its explanation. */
function Labeled({ label, t }: { label: L; t: L }) {
  const { pick } = useLang();
  return (
    <p>
      <span className="font-semibold text-gray-900">{pick(label)} </span>
      <RichText text={pick(t)} />
    </p>
  );
}
const MEANS: L = ["What it means:", "意思："];
const FIX: L = ["The fix:", "修法："];
const HEAD: L[] = [
  ["Message", "訊息"],
  ["What it means", "意思"],
  ["The fix", "修法"],
];

export default function ErrorsSkill({ section }: { section: string | null }) {
  return (
    <Page
      id={PAGE}
      title={["Reading errors", "讀懂錯誤訊息"]}
      intro={[
        "When something is wrong, Python and music21 say so in one line of English. The line looks cryptic at first, but there are only a few kinds, and each one names the problem. This page shows the ones you will meet, with the exact text, what it means and the fix; then the harder case: music that runs without an error but is not what you meant.",
        "出錯時，Python 與 music21 會用一行英文告訴你。這行字一開始看起來像天書，但種類其實不多，而且每一種都說出了問題所在。這一頁列出你會遇到的訊息，附上原文、意思與修法；接著是更麻煩的情況：沒有任何錯誤就執行完畢，但音樂不是你想要的。",
      ]}
      sections={SECTIONS}
      focus={section}
    >
      <Section page={PAGE} id="where" n={1} title={SECTIONS[0].title}>
        <P t={["Errors reach you at two moments.", "錯誤會在兩個時間點出現。"]} />
        <List
          items={[
            [
              "**While you type.** The editor checks the code with Ruff, a Python linter running in your browser, and underlines what is surely wrong: a name that was never defined, a bracket left open, a block that is not indented, a `main.py` that never sets `score`. Hover over the underline to read the message. Nothing has run yet.",
              "**輸入的時候。** 編輯器用 Ruff（一個在瀏覽器裡執行的 Python 檢查工具）檢查程式碼，把確定有錯的地方畫上底線：從沒定義過的名稱、沒關上的括號、沒縮排的區塊，或從頭到尾沒設定 `score` 的 `main.py`。把滑鼠移到底線上就能讀訊息。這時程式還沒執行。",
            ],
            [
              "**When you compile** (⟳ Compile, or Ctrl/⌘+S). Python runs your code and stops at the first error. The editor shows the error's last line (the message) with the file and line where your code stopped.",
              "**編譯的時候**（⟳ 編譯，或 Ctrl/⌘+S）。 Python 執行你的程式碼，遇到第一個錯誤就停下來。編輯器會顯示錯誤的最後一行（訊息），並附上程式碼停下來的檔案與行號。",
            ],
          ]}
        />
        <P
          t={[
            "The linter's messages are shorter and catch less: they only see the text, not the music. Some of its messages, as it writes them:",
            "檢查工具的訊息比較短，抓到的也比較少：它只看得到文字，看不到音樂。以下是它的一些訊息原文：",
          ]}
        />
        <Table
          head={[
            ["Underlined with", "底線訊息"],
            ["Because", "原因"],
          ]}
          rows={[
            [<Mono text="Undefined name `melodie`" />, ["a typo, or a name used before it is set", "打錯字，或在設定之前就用了這個名稱"]],
            [
              <Mono text="Expected an indented block after `for` statement" />,
              ["the body of a loop must be indented", "迴圈的內容必須縮排"],
            ],
            [
              <Mono text="Local variable `notes` is assigned to but never used" />,
              ["inside a function you made something and forgot it; often a typo in the next line", "在函式裡做出了某個東西卻忘了用；常常是下一行打錯字"],
            ],
            [
              <Mono text="Set `score` to your result, e.g. `score = together(violin, cello)`." />,
              ["`main.py` has no `score =` line", "`main.py` 沒有 `score =` 這一行"],
            ],
          ]}
        />
      </Section>

      <Section page={PAGE} id="anatomy" n={2} title={SECTIONS[1].title}>
        <List
          ordered
          items={[
            [
              "**Read the word before the colon.** `NameError`, `SyntaxError`, `KeyError`, `PitchException` … it names the *kind* of problem. Sections 3 to 5 cover the common ones.",
              "**讀冒號前面的那個字。** `NameError`、`SyntaxError`、`KeyError`、`PitchException`……它說出問題的*種類*。第 3 到第 5 節介紹常見的幾種。",
            ],
            [
              "**Read the rest as data.** It quotes what went wrong: the misspelled name, the pitch it could not read, the file it could not find.",
              "**把其餘部分當資料讀。** 它會引用出錯的東西：拼錯的名稱、讀不懂的音高、找不到的檔案。",
            ],
            [
              "**Go to the line, then look one line up.** A missing bracket or quote is often reported on the line *after* the mistake, or on the line where the bracket opened.",
              "**跳到那一行，再往上看一行。** 少了括號或引號時，常常回報在錯誤的*下一行*，或括號開始的那一行。",
            ],
            [
              "**Fix the first error, then run again.** Python stops at the first one, so there may be more behind it.",
              "**修好第一個錯誤，再執行一次。** Python 遇到第一個錯誤就停下來，後面可能還有。",
            ],
          ]}
        />
        <Callout kind="warn" title={["Line numbers *inside* a message are off by two", "訊息*裡面*的行號差了二"]}>
          <P
            t={[
              "The editor's *line N* is right. But a few Python messages quote a line number in their text (`detected at line 3`, `after 'for' statement on line 4`), and those count the two import lines added in front of your code: subtract 2.",
              "編輯器標示的「第 N 行」是正確的。但有些 Python 訊息會在文字裡引用行號（`detected at line 3`、`after 'for' statement on line 4`），那些行號把加在你程式碼前面的兩行匯入也算進去了：要減 2。",
            ]}
          />
        </Callout>
      </Section>

      <Section page={PAGE} id="python" n={3} title={SECTIONS[2].title}>
        <P
          t={[
            "The most common error of all: a name Python does not know. Here it is a typo; Python even guesses what you meant.",
            "最常見的錯誤：Python 不認得的名稱。這裡是打錯字；Python 甚至猜出了你想寫什麼。",
          ]}
        />
        <Py
          code={`melody = tiny("c4 d e f g1")
score = melodie`}
        />
        <Says line={2} text="NameError: name 'melodie' is not defined. Did you mean: 'melody'?" />
        <Labeled
          label={MEANS}
          t={[
            "`melodie` was never set. Names are exact: `Melody`, `melody` and `melodie` are three different names.",
            "`melodie` 從沒被設定過。名稱必須完全一樣：`Melody`、`melody` 與 `melodie` 是三個不同的名稱。",
          ]}
        />
        <Labeled label={FIX} t={["use the name you set (`melody`), or set the name before you use it.", "用你設定過的名稱（`melody`），或先設定再使用。"]} />
        <P
          t={[
            "A **SyntaxError** means Python could not even read the code, so nothing ran. A bracket left open is the classic:",
            "**SyntaxError** 表示 Python 連讀都讀不懂這段程式碼，所以什麼都沒執行。沒關上的括號是最典型的例子：",
          ]}
        />
        <Py
          code={`melody = tiny("c4 d e f g1"
score = melody`}
        />
        <Says line={1} text="SyntaxError: '(' was never closed" />
        <P
          t={[
            "Python uses **indentation** (spaces at the start of a line) to know which lines belong to a loop, an `if` or a function. Forget it, and the loop has no body:",
            "Python 用**縮排**（行首的空格）判斷哪幾行屬於迴圈、`if` 或函式。忘了縮排，迴圈就沒有內容：",
          ]}
        />
        <Py
          code={`notes = []
for name in ["C4", "E4", "G4"]:
notes.append(note.Note(name))
score = stream.Stream(notes)`}
        />
        <Says line={3} text="IndentationError: expected an indented block after 'for' statement on line 4" />
        <Labeled
          label={FIX}
          t={[
            "indent line 3 by four spaces. (The *line 4* in the text is your line 2: see the box in section 2.)",
            "把第 3 行縮排四個空格。（訊息文字裡的 *line 4* 是你的第 2 行：見第 2 節的方框。）",
          ]}
        />
        <Table
          head={HEAD}
          rows={[
            [
              ["`NameError: name 'x' is not defined`", "`NameError: name 'x' is not defined`"],
              ["a name used but never set (typo, wrong case, or set later in the file)", "用了從沒設定過的名稱（打錯字、大小寫不對，或在檔案後面才設定）"],
              ["spell it as you set it; set it first", "照設定時的拼法寫；先設定再使用"],
            ],
            [
              ["`SyntaxError: '(' was never closed`", "`SyntaxError: '(' was never closed`"],
              ["a bracket opened on this line is not closed", "這一行開始的括號沒有關上"],
              ["add the `)`, `]` or `}`", "補上 `)`、`]` 或 `}`"],
            ],
            [
              ["`SyntaxError: unterminated string literal (detected at line 3)`", "`SyntaxError: unterminated string literal (detected at line 3)`"],
              ["a string has no closing quote, e.g. `tiny(\"c4 d e f g1)`", "字串少了結尾的引號，例如 `tiny(\"c4 d e f g1)`"],
              ["close the quote before the `)`", "在 `)` 之前補上引號"],
            ],
            [
              ["`SyntaxError: expected ':'`", "`SyntaxError: expected ':'`"],
              ["a `for`, `if` or `def` line must end with a colon", "`for`、`if` 或 `def` 這一行必須以冒號結尾"],
              ["add `:` at the end of the line", "在行尾加上 `:`"],
            ],
            [
              [
                "`SyntaxError: cannot assign to function call here. Maybe you meant '==' instead of '='?`",
                "`SyntaxError: cannot assign to function call here. Maybe you meant '==' instead of '='?`",
              ],
              ["`if len(notes) = 3:` sets instead of compares", "`if len(notes) = 3:` 是設定，不是比較"],
              ["compare with `==`", "比較要用 `==`"],
            ],
            [
              ["`IndentationError: expected an indented block after 'for' statement on line 4`", "`IndentationError: expected an indented block after 'for' statement on line 4`"],
              ["the loop's body is not indented", "迴圈內容沒有縮排"],
              ["indent the body by four spaces", "把內容縮排四個空格"],
            ],
            [
              ["`IndentationError: unexpected indent`", "`IndentationError: unexpected indent`"],
              ["a line starts with spaces where none belong", "某一行在不該縮排的地方開頭有空格"],
              ["remove the spaces at the start of the line", "刪掉行首的空格"],
            ],
            [
              [
                "`AttributeError: 'Part' object has no attribute 'transpoze'. Did you mean: 'transpose'?`",
                "`AttributeError: 'Part' object has no attribute 'transpoze'. Did you mean: 'transpose'?`",
              ],
              ["the object has no method or value with that name", "這個物件沒有那個名稱的方法或屬性"],
              ["check the spelling; the suggestion is usually right", "檢查拼字；它的建議通常是對的"],
            ],
            [
              ["`ModuleNotFoundError: No module named 'motif'`", "`ModuleNotFoundError: No module named 'motif'`"],
              ["`from motif import …` but there is no file `motif.py`", "寫了 `from motif import …`，但沒有 `motif.py` 這個檔案"],
              ["match the file name exactly (`motifs.py` → `from motifs import …`)", "和檔名完全一致（`motifs.py` → `from motifs import …`）"],
            ],
            [
              [
                "`ImportError: cannot import name 'theme' from 'motifs' (/project/motifs.py). Did you mean: 'thema'?`",
                "`ImportError: cannot import name 'theme' from 'motifs' (/project/motifs.py). Did you mean: 'thema'?`",
              ],
              ["the file exists, but sets no `theme`", "檔案存在，但裡面沒有設定 `theme`"],
              ["use the name the module really sets", "使用模組裡真正設定的名稱"],
            ],
          ]}
        />
        <Callout kind="note" title={["An error in another file", "錯誤在別的檔案裡"]}>
          <P
            t={[
              "If `main.py` imports `motifs.py` and the mistake is in `motifs.py`, the editor names that file and its line. Fix it there; `main.py` is fine.",
              "如果 `main.py` 匯入 `motifs.py`，而錯誤在 `motifs.py` 裡，編輯器會標出那個檔案和它的行號。去那裡修；`main.py` 沒有問題。",
            ]}
          />
        </Callout>
      </Section>

      <Section page={PAGE} id="polyphonizer" n={4} title={SECTIONS[3].title}>
        <P
          t={[
            "A few messages come from Polyphonizer itself: from the rule that the code must set `score`, and from its helpers `tiny()`, `together()` and `load()`.",
            "有幾個訊息來自 Polyphonizer 本身：來自「程式碼必須設定 `score`」這條規則，以及它的輔助函式 `tiny()`、`together()` 與 `load()`。",
          ]}
        />
        <Py code={`melody = tiny("c4 d e f g1")`} />
        <Says text="NameError: your code must set a variable named `score`" />
        <Labeled
          label={FIX}
          t={[
            "end with `score = melody`. The code ran, so the error has no line: nothing in it is wrong, something is missing. (The linter already underlined this before you ran it.)",
            "最後加上 `score = melody`。程式碼已經執行完了，所以這個錯誤沒有行號：不是哪一行寫錯，而是少了東西。（在你執行之前，檢查工具就已經畫上底線了。）",
          ]}
        />
        <Table
          head={HEAD}
          rows={[
            [
              <Mono text="TypeError: `score` must be a music21 Score, Part or Stream (for example tiny('c4 d e f'))" />,
              ["`score` was set to something that is not music, such as a number, a string or a list", "`score` 被設成不是音樂的東西，例如數字、字串或串列"],
              ["set `score` to a part or a score; wrap a list of notes in `stream.Stream([...])`", "把 `score` 設成聲部或總譜；一串音符要包成 `stream.Stream([...])`"],
            ],
            [
              ["`FileNotFoundError: Cannot find file in /files/bach.musicxml`", "`FileNotFoundError: Cannot find file in /files/bach.musicxml`"],
              ["`load(\"bach.musicxml\")`, but no file of that name was imported in this tab", "寫了 `load(\"bach.musicxml\")`，但這個分頁沒有匯入那個檔名的檔案"],
              ["import it with **Import file**, and copy the name exactly", "用**匯入檔案**匯入，並一字不差地抄下檔名"],
            ],
            [
              ["`KeyError: 'trumpet'`", "`KeyError: 'trumpet'`"],
              [
                "`tiny(…, inst=\"trumpet\")`: `inst` knows `violin`, `viola`, `cello`, `flute`, `piano` and `voice`",
                "`tiny(…, inst=\"trumpet\")`：`inst` 只認得 `violin`、`viola`、`cello`、`flute`、`piano` 與 `voice`",
              ],
              ["pick one of those, or insert a music21 instrument yourself: `part.insert(0, instrument.Trumpet())`", "從中挑一個，或自己插入 music21 的樂器：`part.insert(0, instrument.Trumpet())`"],
            ],
            [
              ["`ValueError: could not convert string to float: 'fast'`", "`ValueError: could not convert string to float: 'fast'`"],
              ["`together(…, bpm=\"fast\")`: `bpm` is a number of beats per minute", "`together(…, bpm=\"fast\")`：`bpm` 是每分鐘幾拍的數字"],
              ["`bpm=132`", "`bpm=132`"],
            ],
            [
              ["`AssertionError: …`", "`AssertionError: …`"],
              ["one of **your own** checks failed; the text after the colon is the message you wrote", "**你自己寫的**某個檢查沒通過；冒號後面是你寫的訊息"],
              ["fix the music, or the check (see *Checking a score*)", "修正音樂，或修正檢查（見〈檢查樂譜〉）"],
            ],
          ]}
        />
      </Section>

      <Section page={PAGE} id="music21" n={5} title={SECTIONS[4].title}>
        <P
          t={[
            "music21's own errors carry the module they come from: `music21.pitch.PitchException` is about a pitch, `music21.clef.ClefException` about a clef. Most mean that a name of a pitch, key, interval or clef was not one music21 knows.",
            "music21 自己的錯誤會帶上它來自哪個模組：`music21.pitch.PitchException` 和音高有關，`music21.clef.ClefException` 和譜號有關。大多表示某個音高、調、音程或譜號的名稱不是 music21 認得的。",
          ]}
        />
        <Py
          code={`n = note.Note("H4")
score = stream.Stream([n])`}
        />
        <Says line={1} text="music21.pitch.PitchException: Cannot make a step out of 'H'" />
        <Labeled
          label={MEANS}
          t={[
            "the **step** is the letter of a pitch, A to G. In German, H is B (and B is B♭), but music21 uses English names.",
            "**音級**（step）是音高的字母，A 到 G。德文裡 H 是 B（而 B 是 B♭），但 music21 用的是英文音名。",
          ]}
        />
        <Table
          head={HEAD}
          rows={[
            [
              ["`music21.pitch.PitchException: Cannot make a step out of 'H'`", "`music21.pitch.PitchException: Cannot make a step out of 'H'`"],
              ["a pitch name, or a key name such as `key_sig=\"X\"`, does not start with A–G", "音名，或像 `key_sig=\"X\"` 這樣的調名，不是以 A–G 開頭"],
              ["`B4`, `B-4` (B♭), `F#4`", "`B4`、`B-4`（B♭）、`F#4`"],
            ],
            [
              ["`music21.pitch.AccidentalException:  inor is not a supported accidental type`", "`music21.pitch.AccidentalException:  inor is not a supported accidental type`"],
              ["`key_sig=\"D minor\"`: music21 read `D`, then tried `minor` as an accidental", "`key_sig=\"D minor\"`：music21 讀了 `D`，接著把 `minor` 當成升降記號"],
              ["minor keys are lowercase: `key_sig=\"d\"`", "小調用小寫：`key_sig=\"d\"`"],
            ],
            [
              ["`music21.interval.IntervalException: Cannot create a 'Perfect Ninth'`", "`music21.interval.IntervalException: Cannot create a 'Perfect Ninth'`"],
              ["`transpose(\"P9\")`: seconds, thirds, sixths, sevenths and ninths are major or minor, not perfect", "`transpose(\"P9\")`：二、三、六、七、九度是大或小，不是完全"],
              ["`\"M9\"`; perfect is for unisons, fourths, fifths and octaves (`P1`, `P4`, `P5`, `P8`)", "`\"M9\"`；完全只用於同度、四度、五度與八度（`P1`、`P4`、`P5`、`P8`）"],
            ],
            [
              ["`music21.clef.ClefException: Could not find clef alto2`", "`music21.clef.ClefException: Could not find clef alto2`"],
              ["`clef_=` got a name music21 doesn't know", "`clef_=` 收到 music21 不認得的名稱"],
              ["`\"treble\"`, `\"bass\"`, `\"alto\"`, `\"tenor\"`", "`\"treble\"`、`\"bass\"`、`\"alto\"`、`\"tenor\"`"],
            ],
            [
              ["`KeyError: 'Violin'`", "`KeyError: 'Violin'`"],
              ["`score.parts[\"Violin\"]`, but no part has that name", "寫了 `score.parts[\"Violin\"]`，但沒有聲部叫這個名字"],
              ["use the exact part name, or a number: `score.parts[0]`", "用完全相同的聲部名稱，或用編號：`score.parts[0]`"],
            ],
            [
              [
                "`music21.exceptions21.CorpusException: Could not find a work that met this criterion: bach/bwv9999; …`",
                "`music21.exceptions21.CorpusException: Could not find a work that met this criterion: bach/bwv9999; …`",
              ],
              ["no corpus work has that path", "曲庫裡沒有這個路徑的作品"],
              ["find the path with `corpus.search()` (see *Finding and importing music*)", "用 `corpus.search()` 找出路徑（見〈尋找與匯入樂譜〉）"],
            ],
          ]}
        />
      </Section>

      <Section page={PAGE} id="music" n={6} title={SECTIONS[5].title}>
        <P
          t={[
            "The hardest mistakes give no message at all: the code runs, the score appears, and it is not the music you meant. tinyNotation is the usual place, because it skips what it cannot read instead of complaining. Look at the score, listen, and know these traps:",
            "最難抓的錯誤完全沒有訊息：程式碼執行了，樂譜也出現了，卻不是你想要的音樂。最常出事的是 tinyNotation，因為它遇到看不懂的東西會直接略過，而不是抱怨。看譜、聽音，並認得這些陷阱：",
          ]}
        />
        <Table
          head={[
            ["You wrote", "你寫的"],
            ["You get", "得到的"],
            ["Write instead", "應該寫"],
          ]}
          rows={[
            [["`tiny(\"c4 d e h4 g\")`", "`tiny(\"c4 d e h4 g\")`"], ["four notes: `h4` is skipped", "四個音：`h4` 被略過"], ["`b4`", "`b4`"]],
            [["`c3`", "`c3`"], ["nothing: there is no 3rd-note, the word is skipped", "什麼都沒有：沒有「三分音符」，這個詞被略過"], ["`c2.` (dotted half) or `trip{…}`", "`c2.`（附點二分）或 `trip{…}`"]],
            [["`c#'4`", "`c#'4`"], ["C♯4: an octave mark after the accidental is ignored", "C♯4：寫在升降記號後面的八度記號被忽略"], ["`c'#4` (C♯5)", "`c'#4`（C♯5）"]],
            [["`B` meaning the B above middle C", "`B`，想寫中央 C 上方的 B"], ["B3: capitals are the octave *below*", "B3：大寫是*低*一個八度"], ["`b`", "`b`"]],
            [["`f` with `key_sig=\"G\"`", "在 `key_sig=\"G\"` 裡寫 `f`"], ["F natural, printed with a natural sign", "還原的 F，譜上印出還原記號"], ["`f#`", "`f#`"]],
            [["`c2 d e f`", "`c2 d e f`"], ["four half notes: the `2` carries on", "四個二分音符：`2` 延續下去"], ["`c2 d4 e f`", "`c2 d4 e f`"]],
            [["`c2 c2` for one long note", "用 `c2 c2` 表示一個長音"], ["two notes, struck twice", "兩個音，奏兩次"], ["`c2~ c2` (tied)", "`c2~ c2`（連結）"]],
            [["`time=\"3-4\"`", "`time=\"3-4\"`"], ["4/4: an unreadable time signature is ignored", "4/4：讀不懂的拍號被忽略"], ["`time=\"3/4\"`", "`time=\"3/4\"`"]],
            [["a last bar one beat short", "最後一小節少一拍"], ["the bar is quietly filled with a rest when the score is drawn", "畫譜時這一小節會被悄悄補上休止符"], ["complete the bar, or check it (see *Checking a score*)", "把小節補滿，或檢查它（見〈檢查樂譜〉）"]],
          ]}
        />
        <P
          t={[
            "The cure is to say what you expect and let the code check it. One line with `assert` turns a silent mistake into a message:",
            "解法是寫下你預期的結果，讓程式碼去檢查。一行 `assert` 就能把無聲的錯誤變成一則訊息：",
          ]}
        />
        <Py
          code={`melody = tiny("c'#4 d' e' f' g'1", name="Flute", inst="flute")
names = [n.nameWithOctave for n in melody.recurse().notes]
assert names == ["C#5", "D5", "E5", "F5", "G5"], names
score = melody`}
          note={["runs; with `c#'4` instead, it stops at the `assert`:", "可以執行；如果改成 `c#'4`，就會停在 `assert`："]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
^c d e f | g4 |]`}
          caption={["`c'#4`: C♯5, as intended", "`c'#4`：C♯5，正如預期"]}
          instrument={73}
        />
        <Says line={3} text="AssertionError: ['C#4', 'D5', 'E5', 'F5', 'G5']" />
        <p>
          <SiteLink to={["skills", "verify"]} label={["Checking a score: rules for your own music", "檢查樂譜：為你自己的音樂寫規則"]} />
        </p>
      </Section>

      <Section page={PAGE} id="cheatsheet" n={7} title={SECTIONS[6].title}>
        <Table
          head={[
            ["If you see", "如果看到"],
            ["Look for", "找找看"],
          ]}
          rows={[
            [["`NameError`", "`NameError`"], ["a typo or a name set too late; `score` never set", "打錯字，或名稱太晚才設定；從沒設定 `score`"]],
            [["`SyntaxError`, `IndentationError`", "`SyntaxError`、`IndentationError`"], ["brackets, quotes, colons, indentation; also on the line above", "括號、引號、冒號、縮排；也看看上一行"]],
            [["`AttributeError`", "`AttributeError`"], ["a misspelled method; the *Did you mean* is usually right", "拼錯的方法名；*Did you mean* 通常是對的"]],
            [["`KeyError`", "`KeyError`"], ["a part or instrument name that doesn't exist", "不存在的聲部或樂器名稱"]],
            [["`…PitchException`, `…AccidentalException`", "`…PitchException`、`…AccidentalException`"], ["a pitch or key name: letters A–G, `#` and `-`, minor keys lowercase", "音名或調名：字母 A–G、`#` 與 `-`，小調用小寫"]],
            [["`ModuleNotFoundError`, `ImportError`", "`ModuleNotFoundError`、`ImportError`"], ["the file name and the names it sets", "檔名，以及檔案裡設定的名稱"]],
            [["`AssertionError`", "`AssertionError`"], ["your own check: read your message", "你自己的檢查：讀你寫的訊息"]],
            [["no error, wrong music", "沒有錯誤，音樂卻不對"], ["the tinyNotation traps in section 6", "第 6 節的 tinyNotation 陷阱"]],
          ]}
        />
        <p className="flex flex-wrap gap-4">
          <SiteLink to={["editor"]} label={["Open the score editor", "開啟樂譜編輯器"]} />
          <SiteLink to={["skills", "first"]} label={["First music21", "第一步 music21"]} />
          <SiteLink to={["learn", "code", "hello-scale"]} label={["Start the Learn to Code track", "開始學習單元"]} />
        </p>
      </Section>
    </Page>
  );
}
