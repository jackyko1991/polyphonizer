/** Concept ▸ From score to code (#/concept/method[/<section>]). Every code example here runs as score code. */
import { useLang } from "@learnkit/web";
import { Callout, Figure, List, Notation, P, Page, Py, Section, SiteLink, Sources, Table, TryIn, type L, type SectionInfo } from "../kit";

const PAGE = "method";

const SECTIONS: SectionInfo[] = [
  { id: "why-code", title: ["Why write a score as code?", "為什麼用程式碼寫樂譜？"] },
  { id: "loop", title: ["Write, engrave, listen, check", "寫、排版、聆聽、檢查"] },
  { id: "rules", title: ["The rules come first", "規則先行"] },
  { id: "parts", title: ["From full score to the player's part", "從總譜到演奏者的分譜"] },
  { id: "import", title: ["Scores you already have", "你手邊已有的樂譜"] },
];

const ROUND = `# "Frère Jacques" as a round: one tune, three players, each entering two bars later.
tune = "c4 d e c c d e c e f g2 e4 f g2"
players = [("Flute", "flute"), ("Violin", "violin"), ("Viola", "viola")]

parts = []
for i, (name, inst) in enumerate(players):
    before = "r1 " * (2 * i)        # wait 2 bars per earlier entry
    after = " r1" * (2 * (2 - i))   # and fill up to the same length
    parts.append(tiny(before + tune + after, name=name, inst=inst))

score = together(*parts, title="Frère Jacques, a round", bpm=120)
`;

const WRONG_SCALE = `# Hello, scale with one wrong note: B-flat instead of B.
score = tiny("c4 d e f g a b- c'", inst="flute")
`;

const ONE_PART = `# One source for everything: the full quartet, or one player's part from it.
quartet = corpus.parse("mozart/k80/movement1")
score = quartet.parts[1]   # the second violin; use quartet for the full score
`;

const CORPUS = `# A Bach chorale from music21's built-in corpus, moved up a whole tone.
chorale = corpus.parse("bach/bwv66.6")
score = chorale.transpose("M2")
`;

/** The pipeline: your code → music21 → MusicXML → Verovio → score and sound; the note list feeds the checker and the page planner. */
function Pipeline() {
  const { pick } = useLang();
  const W = 108;
  const H = 50;
  const Y = 24;
  const x = (i: number) => 8 + i * 128;
  const top: { name: L; sub: L; you?: boolean }[] = [
    { name: ["Your code", "你的程式碼"], sub: ["Python + music21", "Python + music21"], you: true },
    { name: ["music21", "music21"], sub: ["in Pyodide, in the browser", "在瀏覽器的 Pyodide 裡"] },
    { name: ["MusicXML", "MusicXML"], sub: ["the hand-off", "交接格式"] },
    { name: ["Verovio", "Verovio"], sub: ["engraves", "排版"] },
    { name: ["Score + sound", "樂譜 + 聲音"], sub: ["SVG, WebAudio", "SVG、WebAudio"] },
  ];
  const bottom: { name: L; sub: L; at: number }[] = [
    { name: ["Checker", "檢查器"], sub: ["rules pass or fail", "規則通過或失敗"], at: 1 },
    { name: ["Page planner", "頁面規劃器"], sub: ["turns at rests", "在休止處翻頁"], at: 3 },
  ];
  const Y2 = 138;
  return (
    <svg viewBox="0 0 640 200" className="w-full max-w-[640px]" role="img" aria-label={pick(["From code to score and sound", "從程式碼到樂譜與聲音"])}>
      <defs>
        <marker id="pz-method-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-gray-400" />
        </marker>
      </defs>
      {top.map((s, i) => (
        <g key={i}>
          <rect
            x={x(i)}
            y={Y}
            width={W}
            height={H}
            rx={8}
            className={s.you ? "fill-rose-50 stroke-rose-700" : "fill-white stroke-gray-400"}
            strokeWidth={1.5}
          />
          <text x={x(i) + W / 2} y={Y + 21} textAnchor="middle" className="fill-gray-900 text-[12px] font-semibold">
            {pick(s.name)}
          </text>
          <text x={x(i) + W / 2} y={Y + 38} textAnchor="middle" className="fill-gray-600 text-[10px]">
            {pick(s.sub)}
          </text>
          {i < top.length - 1 && (
            <line
              x1={x(i) + W + 2}
              y1={Y + H / 2}
              x2={x(i + 1) - 2}
              y2={Y + H / 2}
              className="stroke-gray-400"
              strokeWidth={1.5}
              markerEnd="url(#pz-method-arrow)"
            />
          )}
        </g>
      ))}
      <text x={x(1) + W / 2 + 8} y={Y2 - 22} className="fill-gray-500 text-[10px]">
        {pick(["note list: part, bar, offset, pitch", "音符列表：聲部、小節、位置、音高"])}
      </text>
      {bottom.map((s, i) => (
        <g key={i}>
          <path
            d={`M ${x(1) + W / 2} ${Y + H + 2} L ${x(1) + W / 2} ${Y2 - 34} L ${x(s.at) + W / 2} ${Y2 - 34} L ${x(s.at) + W / 2} ${Y2 - 2}`}
            className="fill-none stroke-gray-400"
            strokeWidth={1.5}
            markerEnd="url(#pz-method-arrow)"
          />
          <rect x={x(s.at)} y={Y2} width={W} height={H} rx={8} className="fill-sky-50 stroke-sky-400" strokeWidth={1.5} />
          <text x={x(s.at) + W / 2} y={Y2 + 21} textAnchor="middle" className="fill-gray-900 text-[12px] font-semibold">
            {pick(s.name)}
          </text>
          <text x={x(s.at) + W / 2} y={Y2 + 38} textAnchor="middle" className="fill-gray-600 text-[10px]">
            {pick(s.sub)}
          </text>
        </g>
      ))}
      <path
        d={`M ${x(3) + W + 2} ${Y2 + H / 2} L ${x(4) + W / 2} ${Y2 + H / 2} L ${x(4) + W / 2} ${Y + H + 2}`}
        className="fill-none stroke-gray-400"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        markerEnd="url(#pz-method-arrow)"
      />
      <text x={x(4) + W / 2 - 4} y={Y2 + H / 2 + 16} textAnchor="middle" className="fill-gray-500 text-[10px]">
        {pick(["page breaks", "換頁位置"])}
      </text>
    </svg>
  );
}

export default function MethodConcept({ section }: { section: string | null }) {
  return (
    <Page
      id={PAGE}
      title={["From score to code", "從樂譜到程式碼"]}
      intro={[
        "In Polyphonizer a score is a program. You write notes, parts and bars in Python with **music21**; the site engraves the result with **Verovio**, plays it back, checks it against rules, and lays it out into parts with page turns where the player has a rest. This page is the method behind all of that, for musicians who are new to code and for coders who are new to scores.",
        "在 Polyphonizer 裡，樂譜就是程式。你用 Python 和 **music21** 寫下音符、聲部與小節；網站再用 **Verovio** 把結果排版出來、播放、依規則檢查，並排成分譜，在演奏者有休止的地方翻頁。這一頁說明這一切背後的方法，寫給剛接觸程式的音樂人，也寫給剛接觸樂譜的程式人。",
      ]}
      sections={SECTIONS}
      focus={section}
    >
      <Section page={PAGE} id="why-code" n={1} title={SECTIONS[0].title}>
        <P
          t={[
            "A score written as code is plain text. You can search it, copy a phrase from it, compare two versions line by line, and keep its history in Git, exactly like any other program. Nothing is hidden in a binary file that only one app can open.",
            "用程式碼寫的樂譜就是純文字。你可以搜尋它、從中複製一個樂句、逐行比對兩個版本，並用 Git 保存它的歷史，就像任何其他程式一樣。沒有任何東西藏在只有某個軟體才打得開的二進位檔裡。",
          ]}
        />
        <P
          t={[
            "More important for a musician: **the patterns in music become patterns in code**. A repeat is a loop, a transposition is one function call, an entry two bars later is a few rests in front. Here is a three-part round from one line of melody:",
            "對音樂人來說更重要的是：**音樂裡的模式變成程式碼裡的模式**。反覆是迴圈，移調是一次函式呼叫，晚兩小節進入就是在前面加幾個休止符。下面用一行旋律寫出三個聲部的輪唱：",
          ]}
        />
        <Py
          code={ROUND}
          note={[
            "`tiny()` writes one part in music21's *tinyNotation*: a letter is a pitch (`c` is middle C, `c'` an octave up), the number is the note value (4 = quarter, 2 = half, 1 = whole) and carries on until it changes, `r` is a rest.",
            "`tiny()` 用 music21 的 *tinyNotation* 寫一個聲部：字母是音高（`c` 是中央 C，`c'` 高一個八度），數字是音符時值（4 = 四分、2 = 二分、1 = 全音符），會沿用到下次改變為止，`r` 是休止符。",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
V:1
C D E C | C D E C | E F G2 | E F G2 | z4 | z4 |]
V:2
z4 | z4 | C D E C | C D E C | E F G2 | E F G2 |]
V:3
z4 | z4 | z4 | z4 | C D E C | C D E C |]`}
          caption={[
            "The first six bars the loop produces: one `tune`, entering two bars later on each staff.",
            "迴圈產生的前六小節：同一個 `tune`，每個譜表晚兩小節進入。",
          ]}
          instrument={73}
        />
        <P
          t={[
            "Change `tune` once and all three players change with it. Add a fourth player and the loop does the rest. In a notation app you would copy, paste and shift by hand, and fix every copy again after each change.",
            "只要改一次 `tune`，三位演奏者的聲部就一起改變。加入第四位演奏者，迴圈會處理剩下的事。在記譜軟體裡，你得手動複製、貼上、挪位置，而且每次修改後都得把每一份副本再改一遍。",
          ]}
        />
        <Table
          head={[
            ["Task", "工作"],
            ["Code is better", "程式碼較好"],
            ["A notation app is better", "記譜軟體較好"],
          ]}
          rows={[
            [
              ["Entering a new melody", "輸入新旋律"],
              ["when it follows a pattern (scales, sequences, canons)", "旋律有規律時（音階、模進、卡農）"],
              ["when you play it in on a keyboard or sketch by ear", "用鍵盤彈進去或憑聽覺打草稿時"],
            ],
            [
              ["Changing a whole piece", "整首曲子的修改"],
              ["transpose, re-voice, extract parts, all at once", "一次完成移調、重新配聲部、抽出分譜"],
              ["one-off edits to a few notes", "只改幾個音的一次性修改"],
            ],
            [
              ["Checking", "檢查"],
              ["rules run every time, on every bar", "每次都對每個小節執行規則"],
              ["your eye, bar by bar", "靠你的眼睛，一小節一小節看"],
            ],
            [
              ["Final engraving", "最後的排版"],
              ["consistent, automatic layout", "一致的自動排版"],
              ["dragging a slur or a dynamic to exactly the right spot", "把圓滑線或力度記號拖到剛好的位置"],
            ],
          ]}
        />
        <Callout kind="tip" title={["You don't have to choose", "不必二選一"]}>
          <P
            t={[
              "Export your score as MusicXML and open it in MuseScore, Sibelius or Dorico for the final polish. Code is good at structure and checking; an app is good at the last few millimetres of layout.",
              "把樂譜匯出成 MusicXML，再用 MuseScore、Sibelius 或 Dorico 做最後的潤飾。程式碼擅長結構與檢查；記譜軟體擅長版面上最後那幾公釐。",
            ]}
          />
        </Callout>
        <Sources
          items={[
            { label: "music21 documentation", url: "https://www.music21.org/music21docs/" },
            { label: "music21: tinyNotation module", url: "https://www.music21.org/music21docs/moduleReference/moduleTinyNotation.html" },
            { label: "Wikipedia: Scorewriter (notation software)", url: "https://en.wikipedia.org/wiki/Scorewriter" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="loop" n={2} title={SECTIONS[1].title}>
        <P
          t={[
            "Press **⟳ Compile** (or Ctrl/⌘+S) and five things happen, all inside your browser. Nothing is sent to a server.",
            "按下**⟳ 編譯**（或 Ctrl/⌘+S），會發生五件事，全部在你的瀏覽器裡完成。沒有任何東西送到伺服器。",
          ]}
        />
        <List
          ordered
          items={[
            [
              "**Python runs your code.** Pyodide, Python compiled to WebAssembly, runs music21 in the page. Your code must leave its result in a variable named `score`.",
              "**Python 執行你的程式碼。** Pyodide（編譯成 WebAssembly 的 Python）在網頁裡執行 music21。你的程式碼必須把結果放在名為 `score` 的變數裡。",
            ],
            [
              "**music21 writes MusicXML**, the common exchange format of notation software, plus a plain list of every note: its part, bar, offset and pitch.",
              "**music21 寫出 MusicXML**（記譜軟體共通的交換格式），再加上一份所有音符的簡單列表：所屬聲部、小節、位置與音高。",
            ],
            [
              "**Verovio engraves** the MusicXML into SVG: staves, beams, accidentals and spacing.",
              "**Verovio 把 MusicXML 排版**成 SVG：譜表、符槓、臨時記號與間距。",
            ],
            [
              "**You listen.** Verovio also gives a timeline of the notes, which WebAudio plays with each part on its own instrument, colouring the notes as they sound.",
              "**你聆聽。** Verovio 也會給出音符的時間軸，由 WebAudio 播放，每個聲部用自己的樂器，發聲的音符會跟著變色。",
            ],
            [
              "**The rules check** the note list (in Learn to Code), and the page planner uses it to find rests for page turns (in Pages).",
              "**規則檢查**音符列表（在「學寫程式」裡），頁面規劃器也用它找出可以翻頁的休止（在「頁面」裡）。",
            ],
          ]}
        />
        <Figure
          caption={[
            "What happens when you press Compile. You write only the first box; the note list feeds the checker and the page planner.",
            "按下編譯之後發生的事。你只需要寫第一格；音符列表會交給檢查器和頁面規劃器。",
          ]}
        >
          <Pipeline />
        </Figure>
        <P
          t={[
            "The loop is short on purpose: write a bar, compile, look, listen, fix. Hearing a wrong note a second after you typed it is the fastest teacher there is.",
            "這個循環刻意做得很短：寫一小節、編譯、看、聽、修正。打完字一秒後就聽到錯音，是最快的老師。",
          ]}
        />
        <p className="flex flex-wrap gap-4">
          <SiteLink to={["editor"]} label={["Open the editor", "開啟編輯器"]} />
          <SiteLink to={["concept", "engraving"]} label={["How a score is engraved and checked", "樂譜如何排版與檢查"]} />
        </p>
        <Sources
          items={[
            { label: "Pyodide: Python in the browser", url: "https://pyodide.org/" },
            { label: "Verovio: music notation engraving library", url: "https://www.verovio.org/" },
            { label: "Wikipedia: MusicXML", url: "https://en.wikipedia.org/wiki/MusicXML" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="rules" n={3} title={SECTIONS[2].title}>
        <P
          t={[
            "Programmers often write the tests before the code: first say exactly what *correct* means, then write something that passes. Polyphonizer's Learn track works the same way. Each problem's **rules are written first**, before anyone writes the music, and your score passes when every red rule turns green.",
            "程式設計師常常先寫測試再寫程式：先把什麼叫 *正確* 說清楚，再寫出能通過的東西。Polyphonizer 的「學寫程式」也是這樣運作。每道題目的**規則都先寫好**，在任何人寫音樂之前就已確定；所有紅色規則轉綠時，你的樂譜就通過了。",
          ]}
        />
        <P
          t={[
            "Take the first problem, *Hello, scale*: write C major going up one octave. Its rules are:",
            "以第一道題目〈你好，音階〉為例：寫出上行一個八度的 C 大調音階。它的規則是：",
          ]}
        />
        <Table
          head={[
            ["Rule", "規則"],
            ["What it looks at", "它檢查什麼"],
          ]}
          rows={[
            [["One part", "一個聲部"], ["the number of parts", "聲部的數量"]],
            [["8 notes", "8 個音"], ["the number of sounding notes (rests don't count)", "發聲音符的數量（休止符不算）"]],
            [["Starts on C4", "從 C4 開始"], ["the first note's pitch (MIDI 60, middle C)", "第一個音的音高（MIDI 60，中央 C）"]],
            [
              ["Whole, whole, half, whole, whole, whole, half", "全、全、半、全、全、全、半"],
              ["the distance in semitones from each note to the next: 2 2 1 2 2 2 1", "每個音到下一個音的半音數：2 2 1 2 2 2 1"],
            ],
            [["Ends on C5", "結束在 C5"], ["the last note's pitch (MIDI 72)", "最後一個音的音高（MIDI 72）"]],
          ]}
        />
        <P
          t={[
            "The rules test the *pattern*, not the spelling. Try this attempt with one wrong note: it has 8 notes, starts and ends right, and still fails, because A to B♭ is a half step and B♭ to C a whole step, the wrong way round.",
            "規則測的是*模式*，不是拼法。試試下面這個錯了一個音的版本：它有 8 個音，開頭和結尾都對，但仍然不通過，因為 A 到 B♭ 是半音、B♭ 到 C 是全音，順序反了。",
          ]}
        />
        <Py
          code={WRONG_SCALE}
          note={["Runs and engraves; in the Hello, scale problem the steps rule turns red.", "可以執行並排版；在〈你好，音階〉題目中，步距規則會變紅。"]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/8
K:C
CDEF GA_Bc | CDEF GABc |]`}
          caption={[
            "Bar 1: the attempt, ending A–B♭–C (half, whole). Bar 2: the C major scale, ending A–B–C (whole, half). Listen to the top of each.",
            "第 1 小節：錯誤的版本，結尾 A–B♭–C（半音、全音）。第 2 小節：C 大調音階，結尾 A–B–C（全音、半音）。聽聽兩者的頂端。",
          ]}
          instrument={73}
        />
        <Callout kind="note" title={["Errors and advice", "錯誤與建議"]}>
          <P
            t={[
              "Some rules are **errors** (red): the exercise is not done until they pass. Others are **advice** (grey), style points a strict teacher would mention, such as too many repeated notes. Advice never blocks the green tick.",
              "有些規則是**錯誤**（紅色）：沒通過就不算完成。另一些是**建議**（灰色），是嚴格的老師會提醒的風格問題，例如重複音太多。建議不會擋住綠色勾勾。",
            ]}
          />
        </Callout>
        <p className="flex flex-wrap gap-4">
          <SiteLink to={["skills", "verify"]} label={["Coding Skills: checking a score", "程式技巧：檢查樂譜"]} />
        </p>
        <TryIn ids={["hello-scale", "ode-for-flute"]} />
        <Sources items={[{ label: "Wikipedia: Test-driven development", url: "https://en.wikipedia.org/wiki/Test-driven_development" }]} />
      </Section>

      <Section page={PAGE} id="parts" n={4} title={SECTIONS[3].title}>
        <P
          t={[
            "A conductor reads the full score; each player reads only their own **part**. When parts are copied by hand, or kept as separate files, a correction in the score has to be made again in every part, and sooner or later one is missed. Here every part comes from **one source**: the same `score`.",
            "指揮讀的是總譜；每位演奏者只讀自己的**分譜**。分譜若是手抄，或存成各自獨立的檔案，總譜裡的一處修正就得在每份分譜裡再改一次，遲早會漏掉一份。在這裡，每份分譜都來自**同一份原始碼**：同一個 `score`。",
          ]}
        />
        <Py
          code={ONE_PART}
          note={[
            "You rarely need this line: in the **Pages** view, *Sheet for* picks a player's part from the full score.",
            "你很少需要這一行：在**頁面**檢視中，用「樂譜給」就能從總譜選出某位演奏者的分譜。",
          ]}
        />
        <P
          t={[
            "A part has one problem a full score doesn't: the player has both hands on the instrument. A page can only be turned where they have **a rest long enough to turn**. Engravers have always moved page breaks to such places by hand; Polyphonizer plans them for you.",
            "分譜有一個總譜沒有的問題：演奏者兩手都在樂器上。只有在**休止夠長、來得及翻頁**的地方才能翻頁。排版師向來是手動把換頁移到這種地方；Polyphonizer 則替你規劃。",
          ]}
        />
        <List
          items={[
            [
              "**Rest in seconds.** A rest's length depends on the tempo: $\\text{seconds} = \\text{beats} \\times 60 / \\text{bpm}$. Two bars of 3/4 at ♩ = 120 are 6 beats, so 3 seconds. You set how many seconds a turn needs.",
              "**以秒計的休止。** 休止有多長，取決於速度：$\\text{秒數} = \\text{拍數} \\times 60 / \\text{bpm}$。♩ = 120 的 3/4 拍兩小節是 6 拍，也就是 3 秒。翻頁需要幾秒由你設定。",
            ],
            [
              "**How the pages sit on the stand.** One page at a time means every page end is a turn. Open spreads put pages 1 and 2 side by side, so the first turn comes after page 2. A part that starts on a right-hand page turns after pages 1, 3, 5 …",
              "**頁面在譜架上的擺法。** 一次一頁，表示每頁結尾都要翻。左右攤開時，第 1、2 頁並排，第一次翻頁在第 2 頁之後。從右頁開始的分譜，則在第 1、3、5…頁之後翻。",
            ],
            [
              "**The plan.** The planner keeps Verovio's lines of music and chooses which line starts each page: pages as full as possible, turns only where there is enough rest. If no layout avoids a bad turn, it tells you where.",
              "**規劃。** 規劃器保留 Verovio 排好的每一行譜，只決定哪一行開始新的一頁：頁面盡量填滿，只在休止足夠的地方翻頁。如果怎麼排都避不開一個來不及的翻頁，它會告訴你在哪裡。",
            ],
          ]}
        />
        <Notation
          abc={`X:1
M:3/4
L:1/4
K:C
E F G | z3 | z3 | c3 |]`}
          caption={[
            "Two bars of rest in 3/4: 6 beats. At ♩ = 120 that is 3 seconds, enough for a turn before bar 3 or bar 4.",
            "3/4 拍的兩小節休止：6 拍。在 ♩ = 120 時是 3 秒，足夠在第 3 或第 4 小節之前翻頁。",
          ]}
          instrument={40}
        />
        <Callout kind="tip" title={["Try it on a real quartet", "用真正的四重奏試試看"]}>
          <P
            t={[
              "In the editor, open the example *Mozart K. 80*, switch to **Pages**, choose a player under *Sheet for*, and turn on *Move page breaks to rests*. Then change the stand or the seconds a turn needs and watch the breaks move.",
              "在編輯器裡開啟範例〈莫札特 K. 80〉，切換到**頁面**，在「樂譜給」選一位演奏者，再打開「把換頁移到休止處」。接著改變譜架擺法或翻頁需要的秒數，看看換頁位置如何移動。",
            ]}
          />
        </Callout>
        <p className="flex flex-wrap gap-4">
          <SiteLink to={["editor"]} label={["Open the editor", "開啟編輯器"]} />
          <SiteLink to={["concept", "engraving", "turns"]} label={["Page turns as an optimisation", "翻頁是一個最佳化問題"]} />
        </p>
        <Sources
          items={[
            { label: "Wikipedia: Part (music)", url: "https://en.wikipedia.org/wiki/Part_(music)" },
            { label: "Wikipedia: Page turner", url: "https://en.wikipedia.org/wiki/Page_turner" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="import" n={5} title={SECTIONS[4].title}>
        <P
          t={[
            "You don't have to type every note. music21 comes with a **corpus** of public-domain scores (Bach chorales, Mozart and Beethoven quartets and more), and once a score is loaded it is ordinary music21 data: you can transpose it, take out parts, or check it.",
            "你不必每個音都自己打。music21 內建一個公有領域樂譜的**語料庫**（巴赫聖詠、莫札特與貝多芬的四重奏等），樂譜一旦載入，就是一般的 music21 資料：你可以移調、抽出聲部，或檢查它。",
          ]}
        />
        <Py code={CORPUS} />
        <P
          t={[
            "Scores of your own come in through **Import**: MusicXML (from MuseScore, Sibelius, Dorico or many IMSLP pages), MIDI, ABC or Humdrum. In code, `load(\"name.musicxml\")` gives you the imported file as a music21 score. And **Export** takes the result back out as MusicXML, MIDI, a printable PDF, or the code itself.",
            "你自己的樂譜可以從**匯入**進來：MusicXML（來自 MuseScore、Sibelius、Dorico 或許多 IMSLP 頁面）、MIDI、ABC 或 Humdrum。在程式碼裡，`load(\"name.musicxml\")` 會把匯入的檔案變成 music21 樂譜。**匯出**則能把結果再帶出去：MusicXML、MIDI、可列印的 PDF，或程式碼本身。",
          ]}
        />
        <Callout kind="warn" title={["MIDI forgets the spelling", "MIDI 會忘記拼法"]}>
          <P
            t={[
              "A MIDI file stores key numbers, not note names, so C♯ and D♭ arrive as the same number and music21 has to guess the spelling. Prefer MusicXML whenever you have it.",
              "MIDI 檔存的是琴鍵編號而不是音名，所以 C♯ 和 D♭ 進來時是同一個數字，music21 只能猜拼法。手上有 MusicXML 時，優先用它。",
            ]}
          />
        </Callout>
        <p className="flex flex-wrap gap-4">
          <SiteLink to={["skills", "first"]} label={["Coding Skills: first music21", "程式技巧：第一步 music21"]} />
          <SiteLink to={["concept", "history"]} label={["History of notation", "記譜史"]} />
        </p>
        <Sources
          items={[
            { label: "music21 User's Guide", url: "https://www.music21.org/music21docs/usersGuide/index.html" },
            { label: "music21: corpus module", url: "https://www.music21.org/music21docs/moduleReference/moduleCorpus.html" },
          ]}
        />
      </Section>
    </Page>
  );
}
