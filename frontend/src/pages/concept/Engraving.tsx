/** Concept ▸ How a score is engraved and checked (#/concept/engraving[/<section>]). Engine: src/engine/. */
import { useLang } from "@learnkit/web";
import { Callout, Figure, List, Notation, P, Page, Py, Section, SiteLink, Sources, Table, TryIn, type L, type SectionInfo } from "../kit.tsx";

const PAGE = "engraving";

const SECTIONS: SectionInfo[] = [
  { id: "pipeline", title: ["From Python to SVG", "從 Python 到 SVG"] },
  { id: "layout", title: ["Systems, pages and spacing", "譜行、頁面與間距"] },
  { id: "turns", title: ["Page turns as an optimisation", "翻頁是一個最佳化問題"] },
  { id: "checker", title: ["How the rules are checked", "規則如何檢查"] },
  { id: "sound", title: ["From timeline to sound", "從時間軸到聲音"] },
];

/** What the engine handed back for a snippet (pasted from a real run of the prelude). */
function Output({ text }: { text: string }) {
  const { pick } = useLang();
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      <p className="border-b border-gray-200 px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
        {pick(["The note list", "音符列表"])}
      </p>
      <pre className="overflow-x-auto px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre text-gray-800">{text}</pre>
    </div>
  );
}

/** One box of a diagram: a title and up to two lines under it. */
function Box({
  x,
  y,
  w,
  h,
  title,
  lines = [],
  tone = "plain",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines?: string[];
  tone?: "plain" | "accent" | "muted";
}) {
  const box =
    tone === "accent" ? "fill-rose-50 stroke-rose-600" : tone === "muted" ? "fill-gray-100 stroke-gray-300" : "fill-white stroke-gray-400";
  const top = y + h / 2 - (lines.length * 13) / 2 + 4;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} className={box} strokeWidth={1.4} />
      <text x={x + w / 2} y={top} textAnchor="middle" className="fill-gray-900 text-[12px] font-semibold">
        {title}
      </text>
      {lines.map((t, i) => (
        <text key={i} x={x + w / 2} y={top + 15 + i * 13} textAnchor="middle" className="fill-gray-500 text-[10px]">
          {t}
        </text>
      ))}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, dashed = false }: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className="stroke-gray-500"
      strokeWidth={1.5}
      strokeDasharray={dashed ? "4 3" : undefined}
      markerEnd="url(#engraving-arrow)"
    />
  );
}

function ArrowHead() {
  return (
    <defs>
      <marker id="engraving-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" className="fill-gray-500" />
      </marker>
    </defs>
  );
}

/** Code → Pyodide + music21 → MusicXML + notes → Verovio → SVG; the notes also feed the checker and the planner. */
function PipelineFigure() {
  const { pick } = useLang();
  return (
    <svg viewBox="0 0 700 250" className="w-full max-w-[700px]" role="img" aria-label={pick(["Polyphonizer's pipeline", "Polyphonizer 的流程"])}>
      <ArrowHead />
      <rect x={136} y={6} width={142} height={96} rx={12} className="fill-none stroke-gray-400" strokeWidth={1.1} strokeDasharray="5 4" />
      <text x={207} y={20} textAnchor="middle" className="fill-gray-500 text-[10px] font-semibold">
        {pick(["web worker", "Web Worker"])}
      </text>
      <Box x={8} y={30} w={112} h={60} title={pick(["Your code", "你的程式碼"])} lines={["score = …"]} />
      <Box x={148} y={30} w={118} h={60} title="Pyodide" lines={["Python + music21", pick(["(WebAssembly)", "（WebAssembly）"])]} />
      <Box x={290} y={30} w={118} h={60} title="MusicXML" lines={[pick(["+ note list", "＋ 音符列表"])]} />
      <Box x={432} y={30} w={118} h={60} title="Verovio" lines={[pick(["engraver", "排版引擎"]), "(WebAssembly)"]} tone="accent" />
      <Box x={574} y={30} w={118} h={60} title={pick(["SVG pages", "SVG 頁面"])} lines={[pick(["what you see", "你看到的樂譜"])]} />
      <Arrow x1={120} y1={60} x2={146} y2={60} />
      <Arrow x1={266} y1={60} x2={288} y2={60} />
      <Arrow x1={408} y1={60} x2={430} y2={60} />
      <Arrow x1={550} y1={60} x2={572} y2={60} />

      <Box x={148} y={170} w={118} h={60} title={pick(["Checker", "檢查器"])} lines={[pick(["rules → ✓ or ✗", "規則 → ✓ 或 ✗"])]} />
      <Box x={330} y={170} w={130} h={60} title={pick(["Page planner", "頁面規劃器"])} lines={[pick(["turns at rests", "在休止處翻頁"])]} />
      <Box x={574} y={170} w={118} h={60} title={pick(["Player", "播放器"])} lines={[pick(["WebAudio", "WebAudio"])]} />
      <Arrow x1={320} y1={92} x2={220} y2={168} />
      <Arrow x1={360} y1={92} x2={392} y2={168} />
      <Arrow x1={440} y1={170} x2={480} y2={94} dashed />
      <text x={488} y={140} className="fill-rose-700 text-[10px]">
        {pick(["page breaks", "換頁位置"])}
      </text>
      <Arrow x1={530} y1={92} x2={618} y2={168} />
      <text x={584} y={128} className="fill-gray-500 font-mono text-[10px]">
        timemap
      </text>
    </svg>
  );
}

/** Two open spreads; the only turn (after page 2) lands on a bar of rest. */
function TurnFigure() {
  const { pick } = useLang();
  const pageW = 120;
  const pageH = 150;
  const page = (x: number, n: number, restAtEnd: boolean) => (
    <g key={n}>
      <rect x={x} y={30} width={pageW} height={pageH} rx={3} className="fill-white stroke-gray-400" strokeWidth={1.2} />
      {[0, 1, 2, 3].map((s) => {
        const y = 48 + s * 30;
        return (
          <g key={s}>
            {[0, 1, 2, 3, 4].map((l) => (
              <line key={l} x1={x + 10} x2={x + pageW - 10} y1={y + l * 3} y2={y + l * 3} className="stroke-gray-300" strokeWidth={0.8} />
            ))}
            {[1, 2, 3].map((b) => (
              <line key={b} x1={x + 10 + (b * (pageW - 20)) / 4} x2={x + 10 + (b * (pageW - 20)) / 4} y1={y} y2={y + 12} className="stroke-gray-300" strokeWidth={0.8} />
            ))}
          </g>
        );
      })}
      {restAtEnd && (
        <g>
          <rect x={x + 10 + (3 * (pageW - 20)) / 4} y={136} width={(pageW - 20) / 4} height={20} rx={2} className="fill-rose-100 stroke-rose-500" strokeWidth={1} />
          <rect x={x + 10 + (3.5 * (pageW - 20)) / 4 - 5} y={142} width={10} height={4} className="fill-rose-700" />
        </g>
      )}
      <text x={x + pageW / 2} y={196} textAnchor="middle" className="fill-gray-500 text-[10.5px]">
        {pick([`page ${n}`, `第 ${n} 頁`])}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 640 250" className="w-full max-w-[640px]" role="img" aria-label={pick(["A page turn on a rest", "在休止處翻頁"])}>
      <ArrowHead />
      <text x={150} y={18} textAnchor="middle" className="fill-gray-600 text-[11px] font-semibold">
        {pick(["open spread 1", "第一組攤開頁"])}
      </text>
      <text x={490} y={18} textAnchor="middle" className="fill-gray-600 text-[11px] font-semibold">
        {pick(["open spread 2", "第二組攤開頁"])}
      </text>
      {page(28, 1, false)}
      {page(152, 2, true)}
      {page(368, 3, false)}
      {page(492, 4, false)}
      <line x1={150} x2={150} y1={28} y2={182} className="stroke-gray-500" strokeWidth={1.5} />
      <line x1={490} x2={490} y1={28} y2={182} className="stroke-gray-500" strokeWidth={1.5} />
      <path d="M262,160 C320,230 330,40 366,56" className="fill-none stroke-rose-600" strokeWidth={2} markerEnd="url(#engraving-arrow)" />
      <text x={318} y={232} textAnchor="middle" className="fill-rose-700 text-[11px] font-semibold">
        {pick(["turn: the player's hand is free here", "翻頁：這裡演奏者的手是空的"])}
      </text>
      <text x={150} y={214} textAnchor="middle" className="fill-gray-500 text-[10px]">
        {pick(["1 → 2: just look across", "1 → 2：眼睛移過去就好"])}
      </text>
      <text x={490} y={214} textAnchor="middle" className="fill-gray-500 text-[10px]">
        {pick(["3 → 4: no turn either", "3 → 4：也不用翻"])}
      </text>
    </svg>
  );
}

const SNIPPET_PIPELINE = `flute = tiny("c'4 d' e' r g'2 r", name="Flute", inst="flute")
score = together(flute, title="Two bars", bpm=80)`;

const OUT_PIPELINE = `part measure offset dur  midi  name
0    1       0.0    1.0  72    C5
0    1       1.0    1.0  74    D5
0    1       2.0    1.0  76    E5
0    1       3.0    1.0  —     rest
0    2       4.0    2.0  79    G5
0    2       6.0    2.0  —     rest`;

const SNIPPET_FIFTHS = `upper = tiny("g4 a b c'", name="Upper")
lower = tiny("c4 d e f", name="Lower")
score = together(upper, lower)`;

const STAND_ROWS: (readonly [L, L, L])[] = [
  [
    ["One page at a time", "一次一頁"],
    ["after every page: 1, 2, 3 …", "每一頁之後：1、2、3…"],
    ["a single loose sheet, or a tablet in portrait", "一張張散頁，或直放的平板"],
  ],
  [
    ["Open spreads", "左右兩頁攤開"],
    ["after pages 2, 4, 6 …", "第 2、4、6… 頁之後"],
    ["a bound part opened flat: page 1 on the left, page 2 facing it", "裝訂好的分譜攤平：第 1 頁在左，第 2 頁在右對著它"],
  ],
  [
    ["Starts on a right page", "從右頁開始"],
    ["after pages 1, 3, 5 …", "第 1、3、5… 頁之後"],
    ["a part that opens on a right-hand page (the left is blank or holds something else)", "從右頁開始的分譜（左頁空白或是別的內容）"],
  ],
];

export default function EngravingConcept({ section }: { section: string | null }) {
  let n = 0;
  return (
    <Page
      id={PAGE}
      title={["How a score is engraved and checked", "樂譜如何排版與檢查"]}
      intro={[
        "You press **Run**, and a moment later there is a score on the screen, a play button, a list of green and red rules, and parts laid out on A4 with turns where the player rests. This page follows your code on the way: Python running in your browser, the hand-off to an engraver, how lines and pages are chosen, how the rules read the music, and how it becomes sound. Nothing is sent to a server.",
        "按下 **執行**，不久畫面上就出現樂譜、播放鍵、一排綠色與紅色的規則，還有排在 A4 紙上、在演奏者休止處翻頁的分譜。這一頁跟著你的程式碼走一趟：Python 在你的瀏覽器裡執行、交給排版引擎、譜行與頁面怎麼決定、規則怎麼讀音樂，以及它怎麼變成聲音。沒有任何東西送到伺服器。",
      ]}
      sections={SECTIONS}
      focus={section}
    >
      <Section page={PAGE} id="pipeline" n={++n} title={SECTIONS[0].title}>
        <P
          t={[
            "Your score code is ordinary Python. It runs in **Pyodide**, a build of Python compiled to WebAssembly, inside a *web worker*: a background thread of the page, so the editor never freezes while music21 thinks. On your first visit the worker downloads Pyodide and installs **music21** from PyPI; after that the browser keeps both in its cache.",
            "你的樂譜程式碼就是一般的 Python。它在 **Pyodide** 裡執行（Pyodide 是編譯成 WebAssembly 的 Python），而且放在一個 *Web Worker* 裡：那是頁面的背景執行緒，所以 music21 在運算時編輯器不會卡住。第一次造訪時，Worker 會下載 Pyodide，並從 PyPI 安裝 **music21**；之後瀏覽器會把兩者都快取起來。",
          ]}
        />
        <Figure
          caption={[
            "One press of Run. Python and Verovio both run in your browser as WebAssembly; the note list feeds the checker and the page planner, whose page breaks go back to Verovio.",
            "按一次執行的流程。Python 與 Verovio 都以 WebAssembly 在你的瀏覽器裡執行；音符列表交給檢查器與頁面規劃器，規劃器選好的換頁位置再交回 Verovio。",
          ]}
        >
          <PipelineFigure />
        </Figure>
        <List
          ordered
          items={[
            [
              "**Run the code.** Before your code, every file gets the same header: `from music21 import *` and the site's helpers `tiny`, `together` and `load`. Your code must leave its result in a variable named `score`: a Score, a Part, or any stream of notes.",
              "**執行程式碼。** 每個檔案在你的程式碼前面都會加上同樣的開頭：`from music21 import *`，以及本站的輔助函式 `tiny`、`together`、`load`。你的程式碼必須把結果留在名為 `score` 的變數裡：一份 Score、一個 Part，或任何音符串流。",
            ],
            [
              "**Hand off.** music21 writes the score as **MusicXML**, the standard exchange format that notation programs read and write. Alongside it goes a plain *note list*: for every note and rest, its part, bar, position, length and pitch. The checker and the page planner read that list; they never look at the picture.",
              "**交接。** music21 把樂譜寫成 **MusicXML**，也就是各種記譜軟體都能讀寫的標準交換格式。同時附上一份單純的 *音符列表*：每個音符與休止符的聲部、小節、位置、長度與音高。檢查器與頁面規劃器讀的是這份列表，從不看畫出來的圖。",
            ],
            [
              "**Engrave.** **Verovio**, an engraving library written in C++ and compiled to WebAssembly, reads the MusicXML (internally it works in **MEI**, an XML encoding for music used in research) and draws the score as SVG. It also produces a *timemap*: when each note starts and stops, which is what the player plays.",
              "**排版。** **Verovio** 是以 C++ 寫成、編譯成 WebAssembly 的排版函式庫。它讀入 MusicXML（內部則使用 **MEI**，一種學術界常用的音樂 XML 編碼），把樂譜畫成 SVG。它也產生一份 *時間對照表*（timemap）：每個音何時開始、何時結束，播放器就照著它演奏。",
            ],
          ]}
        />
        <P
          t={[
            "Here is a two-bar flute line and the note list that comes back with it. Offsets and lengths are in quarter notes (`1.0` = a crotchet); `midi` is the key number, 60 being middle C.",
            "下面是一段兩小節的長笛旋律，以及隨之傳回的音符列表。位置與長度以四分音符為單位（`1.0` = 一個四分音符）；`midi` 是鍵號，60 是中央 C。",
          ]}
        />
        <Py code={SNIPPET_PIPELINE} title="score.py" />
        <Output text={OUT_PIPELINE} />
        <TryIn ids={["hello-scale", "ode-for-flute"]} />
        <Sources
          items={[
            { label: "Pyodide", url: "https://pyodide.org/" },
            { label: "music21 documentation", url: "https://www.music21.org/music21docs/" },
            { label: "MusicXML 4.0 (W3C Community Group)", url: "https://www.w3.org/2021/06/musicxml40/" },
            { label: "Verovio", url: "https://www.verovio.org/" },
            { label: "Music Encoding Initiative (MEI)", url: "https://music-encoding.org/" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="layout" n={++n} title={SECTIONS[1].title}>
        <P
          t={[
            "**Engraving** is the craft of laying music out so it can be read at sight: the word comes from the metal plates scores were once cut into. Most of its rules exist so a player's eye never stumbles. A few of the things an engraver, human or program, has to decide:",
            "**排版**（engraving，原意是「雕版」，樂譜曾經刻在金屬板上）是把音樂排得能一眼讀懂的手藝。它的規矩大多是為了讓演奏者的視線不被絆住。排版者（不論是人還是程式）必須決定的事情包括：",
          ]}
        />
        <List
          items={[
            [
              "**Spacing.** Longer notes get more room, but not in proportion: a half note gets more space than a quarter, yet not twice as much, or slow music would sprawl across the page. Notes that sound together line up vertically across all the staves.",
              "**間距。** 長的音符佔比較多空間，但不是按比例：二分音符比四分音符寬，卻不到兩倍，否則慢的音樂會攤滿整頁。同時發聲的音符在所有譜表上要上下對齊。",
            ],
            [
              "**Line breaks.** A line of music (a *system*) is stretched to fill the width, like justified text. Where to break is a trade-off between lines that are too tight and too loose, and it is best decided for the whole piece at once rather than greedily line by line.",
              "**換行。** 一行音樂（一個 *譜行*，system）會撐滿整個寬度，就像左右對齊的文字。在哪裡換行，是在太擠與太鬆之間取捨，而且最好整首一起考慮，而不是一行一行貪心地填。",
            ],
            [
              "**Collisions.** Accidentals, stems, beams, slurs, dynamics and lyrics all compete for the same few millimetres. The engraver nudges them apart; dense music is where software most often needs a human touch.",
              "**碰撞。** 臨時記號、符桿、符槓、圓滑線、力度記號與歌詞都在爭搶同樣幾毫米的空間。排版者得把它們推開；越密的音樂，軟體越常需要人手修整。",
            ],
          ]}
        />
        <P
          t={[
            "Polyphonizer has two layouts. The editor's live view is a **scroll**: one long page as wide as the panel, with Verovio choosing the line breaks. The **pages** view is A4, built in three passes:",
            "Polyphonizer 有兩種版面。編輯器的即時檢視是 **捲動版面**：一張和面板一樣寬的長頁，由 Verovio 決定換行。**頁面版面** 則是 A4，分三輪排出：",
          ]}
        />
        <List
          ordered
          items={[
            [
              "**Lines.** Verovio breaks the music into systems on its own, unless you fixed a number of bars per line; the line and page breaks you forced yourself are added.",
              "**譜行。** 由 Verovio 自己把音樂斷成譜行，除非你指定了每行固定幾小節；你自己強制的換行與換頁也會加進來。",
            ],
            [
              "**Lines per page.** Those lines are laid out again with breaks set to `line` (keep exactly these lines), to learn how many fit on an A4 page.",
              "**每頁幾行。** 用 `line` 模式（完全照這些譜行）再排一次，看一張 A4 放得下幾行。",
            ],
            [
              "**Pages.** The page planner (next section) chooses which lines start a page. Its choice is written into the MEI as `<sb/>` (system break) and `<pb/>` (page break), and Verovio lays it out a last time with breaks set to `encoded`: exactly as written.",
              "**頁面。** 頁面規劃器（下一節）決定哪些譜行要從新的一頁開始。它的選擇以 `<sb/>`（換行）與 `<pb/>`（換頁）寫進 MEI，Verovio 再以 `encoded` 模式（完全照寫入的位置）排最後一次。",
            ],
          ]}
        />
        <Callout kind="note" title={["The engraver's handbook", "排版者的手冊"]}>
          <P
            t={[
              "The standard modern reference for these conventions is Elaine Gould's *Behind Bars* (Faber Music, 2011): hundreds of pages on spacing, beaming, accidentals, layout and parts. When software and a good printed edition disagree, the printed edition is usually right.",
              "這些慣例的現代標準參考書是 Elaine Gould 的 *Behind Bars*（Faber Music，2011）：數百頁講間距、符槓、臨時記號、版面與分譜。軟體和一份好的印刷版本不一致時，通常是印刷版本對。",
            ]}
          />
        </Callout>
        <Sources
          items={[
            { label: "Wikipedia: Music engraving", url: "https://en.wikipedia.org/wiki/Music_engraving" },
            { label: "Verovio reference book", url: "https://book.verovio.org/" },
            { label: "Knuth & Plass, Breaking paragraphs into lines (1981)", url: "https://doi.org/10.1002/spe.4380111102" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="turns" n={++n} title={SECTIONS[2].title}>
        <P
          t={[
            "A violinist cannot turn a page while playing. In a well-made part, every page turn comes where the player has a rest long enough to reach up, turn and find the place again. Printed parts are laid out this way by hand; Polyphonizer's **page planner** does it as an optimisation problem.",
            "小提琴手沒辦法一邊拉琴一邊翻頁。一份做得好的分譜，每次翻頁都落在演奏者有足夠休止的地方：夠他伸手、翻頁、再找到位置。印刷分譜是靠人工這樣排的；Polyphonizer 的 **頁面規劃器** 則把它當成最佳化問題來解。",
          ]}
        />
        <Figure
          caption={[
            "A part on open spreads: pages 1 and 2 face each other, so the only turn is after page 2, and the planner makes page 2 end on a bar of rest.",
            "攤開兩頁放的分譜：第 1、2 頁左右相對，所以唯一一次翻頁在第 2 頁之後，規劃器讓第 2 頁結束在一個休止的小節上。",
          ]}
        >
          <TurnFigure />
        </Figure>
        <P
          t={[
            "Which page ends are turns depends on how the music sits on the stand. You choose this in the pages view:",
            "哪些頁尾需要翻頁，取決於樂譜怎麼放在譜架上。你可以在頁面檢視裡選：",
          ]}
        />
        <Table
          head={[
            ["On the stand", "譜架上"],
            ["Turns after", "在哪些頁之後翻"],
            ["Typical case", "常見情況"],
          ]}
          rows={STAND_ROWS}
        />
        <P
          t={[
            "**How much rest is there?** For the first bar of every possible page, the planner adds the rest running up to the barline and the rest just after it, converted to seconds at the score's tempo. Every part on the page must be silent: in a full score, one part playing through the barline is enough to spoil the turn. In the flute snippet above at 80 beats a minute, bar 2 starts after one beat of rest and with a note at once: 0.75 s, short of the 2 s the planner asks for by default.",
            "**休止有多長？** 對每個可能成為頁首的小節，規劃器把小節線之前連續的休止和之後的休止加起來，再依樂譜的速度換算成秒。頁面上每個聲部都必須安靜：在總譜裡，只要有一個聲部跨過小節線還在演奏，這次翻頁就不行。以上面每分鐘 80 拍的長笛片段為例，第 2 小節前面只有一拍休止，而且一開始就有音：0.75 秒，不到規劃器預設要求的 2 秒。",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/8
K:G
GABc defg | "^✗"agfe dcBA | z8 | "^✓"G2B2 d4 |]`}
          caption={[
            "At ♩ = 80, a turn before bar 2 (✗) would land mid-run: no rest at all. Before bar 4 (✓) the player has just had a whole bar of rest, 3 seconds.",
            "在 ♩ = 80 時，在第 2 小節前翻頁（✗）會落在一串音的中間：完全沒有休止。在第 4 小節前（✓），演奏者剛休息了整整一小節，3 秒。",
          ]}
          instrument={40}
        />
        <P
          t={[
            "**Choosing the breaks.** The lines are already fixed; the planner only decides which line starts each page. It does this by *dynamic programming*: the best layout of the first $i$ lines on $p$ pages is built from the best layout of fewer lines on $p - 1$ pages, plus one more page. Every candidate page has a cost:",
            "**選擇換頁位置。** 譜行已經定好了；規劃器只決定每一頁從哪一行開始。它用的是 *動態規劃*：前 $i$ 行排成 $p$ 頁的最佳排法，由較少的行排成 $p - 1$ 頁的最佳排法，再加上一頁而得。每個候選頁面都有成本：",
          ]}
        />
        <List
          items={[
            [
              "**Empty space**, squared: a page that holds $s$ lines when $c$ fit costs $(c - s)^2$. Squaring prefers two pages a little short to one page nearly empty. The last page costs only a fifth as much, since it may end where the music ends.",
              "**空白**，取平方：放得下 $c$ 行的頁面只放了 $s$ 行，成本是 $(c - s)^2$。取平方會讓「兩頁各少一點」勝過「一頁幾乎全空」。最後一頁只算五分之一，因為音樂結束在哪裡，它就該結束在哪裡。",
            ],
            [
              "**A bad turn**: if a page end is a turn and the rest there is $r$ seconds, short of the $r_{\\min}$ needed, it costs $10\\,000 + 100\\,(r_{\\min} - r)$. That outweighs any amount of empty space, so the planner accepts a bad turn only when no layout avoids it, and then leans towards more rest. It reports it to you in red.",
              "**不好的翻頁**：如果某個頁尾要翻頁，而那裡的休止只有 $r$ 秒、不足所需的 $r_{\\min}$，成本就是 $10\\,000 + 100\\,(r_{\\min} - r)$。這遠大於任何空白的成本，所以規劃器只有在怎麼排都避不開時才接受不好的翻頁，而且會偏向休止較長的位置，並以紅色標出來告訴你。",
            ],
          ]}
        />
        <P
          t={[
            "The planner picks the layout, and the number of pages, with the least total cost: $C = \\sum_{\\text{pages}} w\\,(c - s)^2 + \\sum_{\\text{turns}} T(r)$, where $w = 1$ (or $0.2$ for the last page) and $T(r)$ is zero when $r \\ge r_{\\min}$. Page breaks you forced yourself are kept: no page may run across one. Switch the planner off and the pages are simply filled; the turns are still listed, so you can see what the planner saves you.",
            "規劃器選出總成本最小的排法（以及頁數）：$C = \\sum_{\\text{頁}} w\\,(c - s)^2 + \\sum_{\\text{翻頁}} T(r)$，其中 $w = 1$（最後一頁為 $0.2$），$r \\ge r_{\\min}$ 時 $T(r)$ 為零。你自己強制的換頁會保留：任何一頁都不能跨過它。把規劃器關掉，頁面就只是一頁頁填滿；翻頁位置仍會列出來，讓你看到規劃器替你省了什麼。",
          ]}
        />
        <Callout kind="tip" title={["Same idea as breaking lines of text", "和文字換行是同一個想法"]}>
          <P
            t={[
              "Knuth and Plass's line breaker for TeX also scores every possible break and finds the best whole paragraph by dynamic programming, instead of filling each line greedily. LilyPond, a text-based engraver, has a page-breaking mode that looks for page turns in the same spirit.",
              "Knuth 與 Plass 為 TeX 設計的換行演算法，也是替每個可能的斷點打分數，再用動態規劃找出整段最好的排法，而不是一行一行貪心地填滿。文字式的排版程式 LilyPond 也有一種以同樣精神尋找翻頁位置的換頁模式。",
            ]}
          />
        </Callout>
        <Sources
          items={[
            { label: "Wikipedia: Dynamic programming", url: "https://en.wikipedia.org/wiki/Dynamic_programming" },
            { label: "Knuth & Plass, Breaking paragraphs into lines (1981)", url: "https://doi.org/10.1002/spe.4380111102" },
            { label: "LilyPond: Page breaking", url: "https://lilypond.org/doc/v2.24/Documentation/notation/page-breaking" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="checker" n={++n} title={SECTIONS[3].title}>
        <P
          t={[
            "Each Learn to Code problem comes with **rules**, written before anyone solves it, the way tests are written before code. A rule is a small function that reads the note list and answers *pass* or *fail*, with the bars where it failed so the score can mark them.",
            "每道「學寫程式」的題目都附有 **規則**，在任何人作答之前就寫好，就像先寫測試再寫程式。一條規則是一個小函式：讀音符列表，回答 *通過* 或 *不通過*，並列出不通過的小節，讓樂譜可以標出來。",
          ]}
        />
        <P
          t={[
            "Before the rules run, each part is boiled down to the notes you *hear*: tied notes are joined into one, rests are dropped, and a chord counts as its top note. Rules about two voices pair each note of the upper part with the note of the lower part sounding at the same moment. Then, for example:",
            "規則執行前，每個聲部都先濃縮成你 *聽到的* 音：延音線連起來的音合併成一個，休止符去掉，和弦只算最高音。兩個聲部的規則，會把上聲部的每個音與同一時刻下聲部正在響的音配成一對。舉例來說：",
          ]}
        />
        <List
          items={[
            [
              "`consonant`: every pair is a unison, third, fifth, sixth or octave (counted in semitones, modulo the octave).",
              "`consonant`：每一對都是同度、三度、五度、六度或八度（以半音計，除去八度）。",
            ],
            [
              "`noParallels`: two pairs in a row may not both be a perfect fifth, or both an octave or unison, when the voices move.",
              "`noParallels`：聲部移動時，相鄰的兩對不能同為完全五度，也不能同為八度或同度。",
            ],
            [
              "`goodLeaps`: no melodic tritone, no seventh, nothing wider than an octave.",
              "`goodLeaps`：旋律中不能有三全音、七度，或超過八度的跳進。",
            ],
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/1
K:C
V:1
"^P8"d | "^M3"A | "^P5"B | "^P5 ✗"A |]
V:2
D | F | E | D |]`}
          caption={[
            "First species above the cantus D F E D. Every pair is consonant, so `consonant` passes; but bars 3–4 move from a fifth to a fifth (E–B, D–A, both falling a step), so `noParallels` fails in bar 4.",
            "在定旋律 D F E D 上方的第一類對位。每一對都協和，所以 `consonant` 通過；但第 3–4 小節從五度走到五度（E–B、D–A，兩者都下行一級），所以 `noParallels` 在第 4 小節不通過。",
          ]}
          instrument={40}
        />
        <P
          t={[
            "This duet has four perfect fifths in a row. `noParallels` fails in bar 1, and the score marks it:",
            "這段二重奏連續出現四個完全五度。`noParallels` 在第 1 小節不通過，樂譜上會標出來：",
          ]}
        />
        <Py
          code={SNIPPET_FIFTHS}
          title="score.py"
          note={["Upper − lower: 67 − 60, 69 − 62, 71 − 64, 72 − 65: seven semitones every time.", "上聲部減下聲部：67 − 60、69 − 62、71 − 64、72 − 65：每次都是七個半音。"]}
        />
        <P
          t={[
            "Rules come in two strengths. An **error** decides the green tick: a parallel fifth in first species is simply wrong. **Advice** is a style hint that does not block it: a leap into a fifth by similar motion (a *hidden* fifth), repeating the same note, or using more perfect than imperfect intervals. Fux would frown, but the exercise still counts.",
            "規則分兩種強度。**錯誤** 決定能不能拿到綠色勾勾：第一類對位裡的平行五度就是錯的。**建議** 是風格上的提醒，不會擋住你：以同向進行跳進到五度（*隱伏* 五度）、重複同一個音，或完全協和音程用得比不完全協和音程多。Fux 看了會皺眉，但題目還是算通過。",
          ]}
        />
        <Callout kind="warn" title={["The checker hears numbers", "檢查器只聽得到數字"]}>
          <P
            t={[
              "Rules read MIDI key numbers, so C♯ and D♭ look the same to them, and so does any spelling mistake. They also cannot hear whether a line is beautiful. A pass means the music follows the rules as written, nothing more.",
              "規則讀的是 MIDI 鍵號，所以 C♯ 和 D♭ 對它們來說一樣，拼錯音名也看不出來。它們也聽不出一條旋律美不美。通過只代表音樂遵守了寫下來的規則，僅此而已。",
            ]}
          />
          <SiteLink to={["concept", "limits"]} label={["Limits of notation", "記譜的限度"]} />
        </Callout>
        <TryIn ids={["species-1-above", "species-1-below", "twinkle-duet"]} />
        <SiteLink to={["skills", "verify"]} label={["Checking your own score", "檢查你自己的樂譜"]} />
        <Sources
          items={[
            { label: "Wikipedia: Counterpoint (species counterpoint)", url: "https://en.wikipedia.org/wiki/Counterpoint" },
            { label: "Wikipedia: Consecutive fifths", url: "https://en.wikipedia.org/wiki/Consecutive_fifths" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="sound" n={++n} title={SECTIONS[4].title}>
        <P
          t={[
            "Playback follows Verovio's timemap, not the code: every note-on in it becomes a sound at its time in milliseconds, with its key number and length. So what you hear is exactly what was engraved, and the note being played lights up on the page.",
            "播放依照的是 Verovio 的時間對照表，而不是程式碼：表裡每個「音開始」都變成一個聲音，帶著它的毫秒時間、鍵號與長度。所以你聽到的就是排出來的那份樂譜，正在播放的音符也會在頁面上亮起來。",
          ]}
        />
        <List
          items={[
            [
              "**Which instrument.** Each part plays one of the 128 **General MIDI** programs. The part's name comes first (\"Violin I\" is more specific than the \"string ensemble\" some files declare), then the instrument music21 found, then a guess; you can override it per part in the sound panel.",
              "**用什麼樂器。** 每個聲部用 128 種 **General MIDI** 音色之一演奏。先看聲部名稱（「Violin I」比某些檔案宣告的「弦樂合奏」更具體），再看 music21 找到的樂器，最後才用猜的；你也可以在聲音面板裡逐個聲部更改。",
            ],
            [
              "**Samples or synth.** By default the browser plays recorded samples of each instrument, downloaded once from free General MIDI sample sets and then cached. Offline, or if a set can't be fetched, a small built-in synthesizer plays instead, with a tone that follows the family: bowed, blown, plucked.",
              "**取樣或合成。** 預設由瀏覽器播放每種樂器的錄音取樣，從免費的 General MIDI 取樣集下載一次後就快取起來。離線時，或某套取樣抓不到時，改由內建的小型合成器演奏，音色依樂器家族而定：弓弦、吹奏、撥弦。",
            ],
            [
              "**Tuning and room.** Pitches are in equal temperament from the A you set (440 Hz by default), with a touch of reverb.",
              "**調音與空間感。** 音高採平均律，以你設定的 A 為準（預設 440 Hz），再加一點殘響。",
            ],
          ]}
        />
        <P
          t={[
            "Verovio also writes the MIDI file you can export. Like the playback, it is a plain reading of the notes: no phrasing, no breath, no rubato.",
            "你可以匯出的 MIDI 檔也是由 Verovio 寫出的。和播放一樣，它只是把音符照字面念出來：沒有分句、沒有呼吸、沒有彈性速度。",
          ]}
        />
        <SiteLink to={["editor"]} label={["Open the editor", "開啟編輯器"]} />
        <Sources
          items={[
            { label: "Wikipedia: General MIDI", url: "https://en.wikipedia.org/wiki/General_MIDI" },
            { label: "gleitz/midi-js-soundfonts", url: "https://github.com/gleitz/midi-js-soundfonts" },
            { label: "danigb/smplr", url: "https://github.com/danigb/smplr" },
            { label: "MDN: Web Audio API", url: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API" },
          ]}
        />
      </Section>
    </Page>
  );
}
