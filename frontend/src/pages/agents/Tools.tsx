/**
 * AI agent ▸ AI music tools (#/agents/tools[/<section>]): what AI can do with written music today — optical music
 * recognition (Audiveris, oemer), transcription from audio (Basic Pitch), composing with a model (Magenta's Coconet),
 * language models writing music21 code — and how Polyphonizer will use each (see RoadmapPage.tsx). The rule checker
 * has the last word on all of them. Repositories and licences were checked on their GitHub/project pages in November 2026.
 */
import { Callout, List, P, Page, Py, Section, SiteLink, Sources, Table, type L, type SectionInfo } from "../kit";

const PAGE = "tools";

const SECTIONS: SectionInfo[] = [
  { id: "idea", title: ["AI proposes, the rules check", "AI 提議，規則檢查"] },
  { id: "omr", title: ["Reading printed music (OMR)", "辨識印刷樂譜（OMR）"] },
  { id: "transcription", title: ["Transcribing a recording", "從錄音轉譜"] },
  { id: "composing", title: ["Composing with a model", "與模型一起作曲"] },
  {
    id: "code",
    title: ["Language models writing music21", "語言模型寫 music21"],
  },
  { id: "summary", title: ["The tools at a glance", "工具一覽"] },
];

const PLAN: L = ["How Polyphonizer will use it", "Polyphonizer 會怎麼用"];

export default function ToolsAgent({ section }: { section: string | null }) {
  return (
    <Page
      id={PAGE}
      overline={["AI agent", "AI 代理"]}
      title={["AI music tools", "AI 音樂工具"]}
      intro={[
        "What AI can and cannot do with written music today: read a printed page, write down a recording, suggest notes, write score code. What each is good for, the mistakes it typically makes, and which of these Polyphonizer will use.",
        "今天 AI 在書面音樂上能做什麼、不能做什麼：讀印刷譜、把錄音寫成譜、建議音符、寫樂譜程式碼。每一種適合做什麼、常犯哪些錯，以及 Polyphonizer 會用到哪些。",
      ]}
      sections={SECTIONS}
      focus={section}
    >
      <Section page={PAGE} id="idea" n={1} title={SECTIONS[0].title}>
        <P
          t={[
            "Every tool on this page makes a *guess*: a note it thinks it saw, heard, or would sound good. Some guesses are very good. None of them is checked by the tool itself.",
            "這一頁上的每個工具都在 *猜*：它以為看到的、聽到的，或覺得好聽的音。有些猜得很準，但沒有一個會自己檢查自己。",
          ]}
        />
        <P
          t={[
            "In Polyphonizer the guess always ends as score code: something you can see engraved, hear, and run through the same rules as your own work (range, intervals, parallels, bar lengths). The AI proposes; you and the rules decide.",
            "在 Polyphonizer 裡，猜測最後都會變成樂譜程式碼：你看得到排版、聽得到聲音，也能用和你自己作品相同的規則檢查（音域、音程、平行、小節長度）。AI 負責提議，你和規則負責決定。",
          ]}
        />
      </Section>

      <Section page={PAGE} id="omr" n={2} title={SECTIONS[1].title}>
        <P
          t={[
            '**Optical music recognition (OMR)** is OCR for scores: from a scan, a PDF or a phone photo to MusicXML. It is the hard part of "import this piece from IMSLP", because most of IMSLP is scans.',
            "**光學樂譜辨識（OMR）** 就是樂譜版的 OCR：把掃描檔、PDF 或手機照片變成 MusicXML。這是「從 IMSLP 匯入這首曲子」裡最難的部分，因為 IMSLP 上大多是掃描檔。",
          ]}
        />
        <List
          items={[
            [
              "**Audiveris**: a long-running open-source OMR application (AGPL-3.0) with an editor for fixing what it misread; exports MusicXML.",
              "**Audiveris**：發展多年的開源 OMR 應用程式（AGPL-3.0），附有修正誤判的編輯介面；可匯出 MusicXML。",
            ],
            [
              "**oemer**: an open-source (MIT) deep-learning OMR system that turns a photo of printed sheet music, even a skewed phone photo, into MusicXML.",
              "**oemer**：開源（MIT）的深度學習 OMR 系統，能把印刷樂譜的照片（即使是拍歪的手機照片）轉成 MusicXML。",
            ],
          ]}
        />
        <P
          t={[
            "**Good for:** clean printed editions, one staff or a few. **Typical errors:** a dot or a tie missed, so a bar is too long or short; an accidental lost or attached to the wrong note; slurs, ornaments and lyrics dropped; voices on one staff mixed up. Handwritten manuscripts mostly fail.",
            "**適合：** 印刷清楚的版本、一行或少數幾行譜表。**常見錯誤：** 漏了附點或連結線，使小節太長或太短；臨時記號遺失或貼到錯的音上；圓滑線、裝飾音與歌詞被丟掉；同一行譜表上的多個聲部混在一起。手寫稿大多辨識不出來。",
          ]}
        />
        <Callout kind="tip" title={PLAN}>
          <P
            t={[
              "Import from an IMSLP link will look for a digital edition first (OpenScore, Mutopia, KernScores), which needs no AI at all; only if there is none will it read the scan with OMR, on a local runner on your own computer. Then the bar-length and range checks point at the bars OMR most likely got wrong, so you fix those first.",
              "從 IMSLP 連結匯入時，會先找數位版（OpenScore、Mutopia、KernScores），完全不需要 AI；找不到才用 OMR 辨識掃描檔，而且在你自己電腦上的本機執行器裡進行。接著，小節長度與音域的檢查會指出 OMR 最可能讀錯的小節，讓你先修那些。",
            ]}
          />
        </Callout>
        <Sources
          items={[
            {
              label: "Audiveris (GitHub)",
              url: "https://github.com/Audiveris/audiveris",
            },
            {
              label: "oemer (GitHub)",
              url: "https://github.com/BreezeWhite/oemer",
            },
          ]}
        />
      </Section>

      <Section page={PAGE} id="transcription" n={3} title={SECTIONS[2].title}>
        <P
          t={[
            "**Automatic music transcription** goes from audio to notes. It happens in two steps: find *which pitches sound when* (pitch tracking), then decide *what was meant*: note values, beats, bars, key and spelling. The first step is now good; the second is still hard.",
            "**自動轉譜** 是從聲音到音符。它分成兩步：先找出 *什麼時候響了哪些音*（音高追蹤），再決定 *原本想寫的是什麼*：時值、拍子、小節、調號與音名拼法。第一步現在已經做得不錯；第二步仍然很難。",
          ]}
        />
        <P
          t={[
            "Spotify's **Basic Pitch** is an open-source (Apache-2.0), lightweight audio-to-MIDI model. It works for many instruments and can handle more than one note at a time. Its output is MIDI, not a score: times in seconds, not quarter notes.",
            "Spotify 的 **Basic Pitch** 是開源（Apache-2.0）、輕量的音訊轉 MIDI 模型。它適用於多種樂器，也能處理同時響起的多個音。它輸出的是 MIDI，而不是樂譜：時間以秒計，不是以四分音符計。",
          ]}
        />
        <P
          t={[
            "**Good for:** a clear recording of one instrument. **Typical errors:** octave jumps; vibrato or a slide split into several notes; a rubato phrase quantised into odd rhythms; C♯ written where D♭ was meant; reverb and accompaniment heard as extra notes.",
            "**適合：** 單一樂器、錄得清楚的錄音。**常見錯誤：** 八度跳錯；顫音或滑音被切成好幾個音；自由速度的樂句被量化成奇怪的節奏；應該是 D♭ 卻寫成 C♯；殘響與伴奏被聽成多餘的音。",
          ]}
        />
        <Callout kind="tip" title={PLAN}>
          <P
            t={[
              "One melodic line first (violin, flute, voice), in the browser. You choose the time signature and tempo, the result arrives as a `tiny()` part you can read and edit, and you check it by ear against the recording.",
              "先做單一旋律（小提琴、長笛、人聲），在瀏覽器中執行。拍號與速度由你決定，結果會是一個你能閱讀、修改的 `tiny()` 聲部，再由你對照錄音用耳朵檢查。",
            ]}
          />
        </Callout>
        <Sources
          items={[
            {
              label: "Basic Pitch (Spotify, GitHub)",
              url: "https://github.com/spotify/basic-pitch",
            },
          ]}
        />
      </Section>

      <Section page={PAGE} id="composing" n={4} title={SECTIONS[3].title}>
        <P
          t={[
            "Models that write notes have been around for years. Google's **Magenta** is an open-source research project on machine learning in music; its **Coconet** model, trained on Bach's four-part chorales, fills in missing notes and harmonises a melody. It is the model behind the 2019 Bach Google Doodle.",
            "會寫音符的模型已經存在好幾年了。Google 的 **Magenta** 是研究機器學習與音樂的開源專案；其中的 **Coconet** 模型以巴哈的四部聖詠訓練，能補上缺少的音、為旋律配和聲。2019 年的巴哈 Google Doodle 背後就是它。",
          ]}
        />
        <P
          t={[
            "**Good for:** ideas — a harmonisation, a countermelody, a variation to react to. **Typical errors:** parallel fifths and octaves, voices out of range or crossing, phrases that wander without a cadence; and a style borrowed from whatever the model was trained on.",
            "**適合：** 點子——一種配和聲、一條對位旋律、一段讓你回應的變奏。**常見錯誤：** 平行五度與八度、聲部超出音域或交錯、樂句四處遊走卻沒有終止式；而且風格來自模型的訓練資料。",
          ]}
        />
        <Callout kind="tip" title={PLAN}>
          <P
            t={[
              'Composer mode is "compose with me", not "generate a song": you write the melody, the model suggests a harmonisation or a countermelody, and you hear it, check it with the counterpoint rules, and keep, change or reject each note.',
              "作曲模式是「和我一起作曲」，而不是「生成一首歌」：你寫旋律，模型建議配和聲或對位旋律，你聆聽、用對位規則檢查，再決定每個音要保留、修改還是捨棄。",
            ]}
          />
        </Callout>
        <Sources
          items={[
            { label: "Magenta", url: "https://magenta.tensorflow.org/" },
            {
              label: "Coconet: the ML model behind today's Bach Doodle (Magenta, 2019)",
              url: "https://magenta.tensorflow.org/coconet",
            },
          ]}
        />
      </Section>

      <Section page={PAGE} id="code" n={5} title={SECTIONS[4].title}>
        <P
          t={[
            "General language models (the ones behind coding agents) can write music21 code, because music21 is a well-documented Python library. That is the closest fit to Polyphonizer: the score already *is* code, so an agent can edit it like any other program.",
            "通用語言模型（程式代理背後的那種）會寫 music21 程式碼，因為 music21 是文件齊全的 Python 函式庫。這和 Polyphonizer 最契合：樂譜本來 *就是* 程式碼，代理可以像改其他程式一樣修改它。",
          ]}
        />
        <Py
          code={`# "Add a cello line a sixth below the flute, then join them"
flute = tiny("e'4 f' g' a' g'2 e'", name="Flute", inst="flute")
cello = tiny("G4 A B c B2 G", name="Cello", inst="cello")
score = together(flute, cello, title="Duet", bpm=80)`}
          note={[
            "Typical agent output. It runs — but is every pair a sixth? Engrave, listen and check before you trust it.",
            "典型的代理輸出。它能執行——但每一對音真的都是六度嗎？先排版、聆聽、檢查，再相信它。",
          ]}
        />
        <P
          t={[
            '**Good for:** the tedious edits — transposing, adding dynamics or bowings, splitting a piano part, arranging for other instruments. **Typical errors:** invented function names; a wrong octave mark in tinyNotation; bars that do not add up; changing a part it was told to leave alone; and claiming "this follows the rules" without checking.',
            "**適合：** 繁瑣的修改——移調、加上力度或弓法、拆開鋼琴聲部、改編給其他樂器。**常見錯誤：** 捏造函式名稱；tinyNotation 的八度記號寫錯；小節拍數不對；修改了被要求不要動的聲部；還有沒檢查就宣稱「這符合規則」。",
          ]}
        />
        <Callout kind="tip" title={PLAN}>
          <P
            t={[
              'An AI agent in the editor that edits the score code with you ("add bowings", "move this bar to the next line", "arrange for violin, flute and piano"), and every change is checked by the same rules as yours. You can already use your own agent today.',
              "編輯器裡的 AI 代理，和你一起修改樂譜程式碼（「加上弓法」、「把這小節移到下一行」、「改編給小提琴、長笛和鋼琴」），每一處修改都用和你相同的規則檢查。今天你就已經可以使用自己的代理。",
            ]}
          />
          <p className="flex flex-wrap gap-4">
            <SiteLink to={["agents", "mcp"]} label={["Your own agent, by MCP", "透過 MCP 使用你自己的代理"]} />
            <SiteLink to={["agents", "roadmap"]} label={["Product roadmap", "產品路線圖"]} />
          </p>
        </Callout>
        <Sources
          items={[
            {
              label: "music21 documentation",
              url: "https://www.music21.org/music21docs/",
            },
          ]}
        />
      </Section>

      <Section page={PAGE} id="summary" n={6} title={SECTIONS[5].title}>
        <Table
          head={[
            ["Task", "任務"],
            ["Input → output", "輸入 → 輸出"],
            ["Example", "例子"],
            ["Open source?", "開源？"],
            ["Typical mistakes", "常見錯誤"],
          ]}
          rows={[
            [
              ["Reading printed music (OMR)", "辨識印刷樂譜（OMR）"],
              ["scan, PDF, photo → MusicXML", "掃描檔、PDF、照片 → MusicXML"],
              ["Audiveris, oemer", "Audiveris、oemer"],
              ["yes (AGPL-3.0; MIT)", "是（AGPL-3.0；MIT）"],
              ["missed dots and ties, lost accidentals, mixed-up voices", "漏掉附點與連結線、臨時記號遺失、聲部混淆"],
            ],
            [
              ["Transcribing audio", "從錄音轉譜"],
              ["audio → MIDI (then a score)", "音訊 → MIDI（再變成樂譜）"],
              ["Basic Pitch", "Basic Pitch"],
              ["yes (Apache-2.0)", "是（Apache-2.0）"],
              ["octave errors, split notes, odd rhythms, wrong spelling", "八度錯誤、音被切開、奇怪的節奏、音名拼錯"],
            ],
            [
              ["Composing with a model", "與模型一起作曲"],
              ["notes → more notes", "音符 → 更多音符"],
              ["Magenta (Coconet)", "Magenta（Coconet）"],
              ["yes", "是"],
              ["parallels, range, no cadence, borrowed style", "平行、音域、沒有終止式、借來的風格"],
            ],
            [
              ["Writing score code", "寫樂譜程式碼"],
              ["words → music21 code", "文字 → music21 程式碼"],
              ["any coding agent", "任何程式代理"],
              ["depends on the model", "視模型而定"],
              [
                "invented names, wrong octaves, bars that don't add up, unchecked claims",
                "捏造名稱、八度錯誤、小節拍數不對、未經檢查的宣稱",
              ],
            ],
          ]}
        />
        <Callout kind="note" title={["The same last step for all four", "四種工具都有同樣的最後一步"]}>
          <P
            t={[
              "Engrave it, listen to it, check it with the rules. Even a tool that is right almost every time leaves a few wrong notes on a page of hundreds; the checks are how you find them.",
              "排版、聆聽、用規則檢查。即使是幾乎每次都對的工具，在一頁幾百個音裡仍會留下幾個錯音；檢查就是找出它們的方法。",
            ]}
          />
        </Callout>
      </Section>
    </Page>
  );
}
