/**
 * Draft outlines of the Concept, Coding Skills and AI agent pages: the same menus as Tensorizer and Formalizer
 * (Concept: method, Feynman, the maths, how it is checked, limits, history; Coding Skills: five working skills; AI
 * agent: tools, Skills, MCP, roadmap). Each section lists what it will cover; the text comes later.
 */
import type { DraftOutline } from "./kit.tsx";

const AI: DraftOutline["overline"] = ["AI agent", "AI 代理"];

export const CONCEPT_OUTLINES: Record<string, DraftOutline> = {
  method: {
    id: "method",
    title: ["From score to code", "從樂譜到程式碼"],
    intro: [
      "A score is a program: notes, parts and bars written in Python with music21, then engraved, played and checked. This page is the method behind the site.",
      "樂譜就是程式：用 Python 與 music21 寫下音符、聲部與小節，再排版、播放、檢查。這一頁說明本站背後的方法。",
    ],
    sections: [
      {
        id: "why-code",
        title: ["Why write a score as code?", "為什麼用程式碼寫樂譜？"],
        plan: [
          ["Text you can diff, search, copy and version, like any other code.", "像其他程式碼一樣，可以比對、搜尋、複製、做版本管理的文字。"],
          ["Repetition and transposition as loops and functions, not copy-paste.", "重複與移調寫成迴圈和函式，而不是複製貼上。"],
          ["Where a notation app is still the better tool.", "在哪些情況下，記譜軟體仍是更好的工具。"],
        ],
      },
      {
        id: "loop",
        title: ["Write, engrave, listen, check", "寫、排版、聆聽、檢查"],
        plan: [
          ["The editor's loop: code → music21 → MusicXML → Verovio → SVG and sound.", "編輯器的循環：程式碼 → music21 → MusicXML → Verovio → SVG 與聲音。"],
          ["Rules written first, like tests: what the music must do before you write it.", "先寫規則，像測試一樣：寫音樂之前先說清楚它必須做到什麼。"],
        ],
        tryIn: ["hello-scale"],
      },
      {
        id: "parts",
        title: ["From full score to the player's part", "從總譜到演奏者的分譜"],
        plan: [
          ["One source for the score and every part.", "總譜與每份分譜都來自同一份原始碼。"],
          ["Page turns where the player has a rest.", "在演奏者有休止的地方翻頁。"],
        ],
      },
    ],
  },
  feynman: {
    id: "feynman",
    title: ["The Feynman technique", "費曼學習法"],
    intro: [
      "Learn a piece of theory by explaining it simply, then letting the checker find the gaps, the same way Tensorizer and Formalizer teach.",
      "用簡單的話解釋一段樂理，再讓檢查器找出漏洞來學習，和 Tensorizer、Formalizer 的教法相同。",
    ],
    sections: [
      {
        id: "steps",
        title: ["Four steps", "四個步驟"],
        plan: [
          ["Pick a rule (say, no parallel fifths) and explain it in plain words.", "挑一條規則（例如不可平行五度），用白話解釋它。"],
          ["Write it as a check, then a passage that should pass and one that should fail.", "把它寫成檢查，再寫一段應該通過、一段應該失敗的樂句。"],
          ["Where the checker disagrees with you, you have found a gap.", "檢查器和你意見不同的地方，就是你的漏洞。"],
        ],
      },
      {
        id: "ear",
        title: ["Explain it to the ear too", "也要解釋給耳朵聽"],
        plan: [["Play both versions: hear why the rule exists, not just that it does.", "兩個版本都播放：聽出這條規則為什麼存在，而不只是知道它存在。"]],
        tryIn: ["species-1-above"],
      },
    ],
  },
  theory: {
    id: "theory",
    title: ["Music theory as code", "以程式碼表達樂理"],
    intro: [
      "The small amount of maths under the theory: pitches as numbers, intervals as differences, keys and scales as sets.",
      "樂理底下的一點數學：音高是數字，音程是差值，調與音階是集合。",
    ],
    sections: [
      {
        id: "pitch",
        title: ["Pitch as a number", "音高是數字"],
        plan: [
          ["MIDI numbers, pitch classes (mod 12) and octaves; spelling (C♯ vs D♭) as extra information.", "MIDI 編號、音級（mod 12）與八度；拼法（C♯ 或 D♭）是額外資訊。"],
          ["Frequency: A4 = 440 Hz and 2^(1/12) per semitone; other tunings.", "頻率：A4 = 440 Hz，每個半音乘以 2^(1/12)；其他調音。"],
        ],
      },
      {
        id: "intervals",
        title: ["Intervals and consonance", "音程與協和"],
        plan: [
          ["Interval = difference; consonant sets; why fifths and octaves are 'perfect'.", "音程 = 差值；協和音程的集合；為什麼五度與八度是「完全」音程。"],
          ["Parallel and direct motion as conditions on two voices.", "平行與直接進行是兩個聲部之間的條件。"],
        ],
        tryIn: ["species-1-below"],
      },
      {
        id: "time",
        title: ["Rhythm and metre", "節奏與拍子"],
        plan: [["Durations as fractions of a quarter note; bars, offsets and ties.", "時值是四分音符的分數；小節、位移與連結線。"]],
      },
      {
        id: "keys",
        title: ["Keys, scales and transposition", "調、音階與移調"],
        plan: [["Scales as interval patterns; transposition as adding a constant; modes.", "音階是音程模式；移調是加上一個常數；調式。"]],
        tryIn: ["hello-scale", "ode-for-flute"],
      },
    ],
  },
  engraving: {
    id: "engraving",
    title: ["How a score is engraved and checked", "樂譜如何排版與檢查"],
    intro: [
      "What happens after you press Run: music21 builds the score, Verovio engraves it, the checker reads the notes, and the page planner lays out the parts.",
      "按下執行之後發生什麼：music21 建立樂譜，Verovio 排版，檢查器讀取音符，頁面規劃器排出分譜。",
    ],
    sections: [
      {
        id: "pipeline",
        title: ["From Python to SVG", "從 Python 到 SVG"],
        plan: [["Pyodide runs music21 in your browser; MusicXML is the hand-off; Verovio draws.", "Pyodide 在你的瀏覽器裡執行 music21；以 MusicXML 交接；Verovio 繪製。"]],
      },
      {
        id: "layout",
        title: ["Systems, pages and spacing", "譜行、頁面與間距"],
        plan: [["How an engraver chooses line breaks and note spacing.", "排版程式如何決定換行與音符間距。"]],
      },
      {
        id: "turns",
        title: ["Page turns as an optimisation", "翻頁是一個最佳化問題"],
        plan: [
          ["Dynamic programming over systems: fill pages, but turn only where there is rest.", "在譜行上做動態規劃：頁面要填滿，但只在有休止的地方翻頁。"],
          ["Single pages, open spreads, and parts that start on the right.", "單頁、攤開的兩頁，以及從右頁開始的分譜。"],
        ],
      },
      {
        id: "checker",
        title: ["How the rules are checked", "規則如何檢查"],
        plan: [["Each rule reads the note list (part, bar, offset, pitch); errors versus advice.", "每條規則讀取音符列表（聲部、小節、位置、音高）；錯誤與建議的區別。"]],
      },
    ],
  },
  limits: {
    id: "limits",
    title: ["Limits of notation", "記譜的限度"],
    intro: [
      "What a score — and a program that writes one — cannot say: performance, sound and the reader's judgement.",
      "樂譜，以及寫樂譜的程式，說不出什麼：演奏、聲音與讀譜者的判斷。",
    ],
    sections: [
      {
        id: "performance",
        title: ["The score is not the performance", "樂譜不等於演奏"],
        plan: [["Rubato, intonation, bowing and breath: what players add.", "彈性速度、音準、弓法與呼吸：演奏者加上的東西。"]],
      },
      {
        id: "rules",
        title: ["Rules are not taste", "規則不等於品味"],
        plan: [["Passing every rule is necessary, not sufficient; when composers break them.", "通過所有規則是必要而非充分；作曲家何時打破規則。"]],
      },
      {
        id: "editions",
        title: ["Editions, sources and copyright", "版本、來源與版權"],
        plan: [
          ["Urtext versus edited; reading old sources.", "原典版與編訂版；閱讀古老的來源。"],
          ["Public domain works, new editions and the 25-year UK published-edition right.", "公有領域作品、新版本，以及英國 25 年的出版版本權。"],
        ],
      },
      {
        id: "machines",
        title: ["What machines get wrong", "機器會出錯的地方"],
        plan: [["Engraving collisions, optical recognition errors, MIDI's missing spelling.", "排版碰撞、光學辨識錯誤、MIDI 缺少的拼法。"]],
      },
    ],
  },
};

export const SKILLS_OUTLINES: Record<string, DraftOutline> = {
  first: {
    id: "first",
    title: ["First music21", "第一步 music21"],
    intro: ["The handful of music21 objects that write most scores.", "能寫出大部分樂譜的幾個 music21 物件。"],
    sections: [
      {
        id: "notes",
        title: ["Notes, rests and chords", "音符、休止符與和弦"],
        plan: [["`note.Note`, `note.Rest`, `chord.Chord`; pitch names and durations.", "`note.Note`、`note.Rest`、`chord.Chord`；音名與時值。"]],
        tryIn: ["hello-scale"],
      },
      {
        id: "tiny",
        title: ["tinyNotation: a melody in one line", "tinyNotation：一行寫完一段旋律"],
        plan: [["`tiny(\"c4 d e f g1\")`: numbers for durations, ' and , for octaves, # and - for accidentals.", "`tiny(\"c4 d e f g1\")`：數字代表時值，' 與 , 代表八度，# 與 - 代表升降記號。"]],
      },
      {
        id: "streams",
        title: ["Streams, parts and scores", "Stream、聲部與總譜"],
        plan: [["`stream.Part`, `stream.Score`, `together()`; key, time and tempo marks.", "`stream.Part`、`stream.Score`、`together()`；調號、拍號與速度記號。"]],
      },
    ],
  },
  corpus: {
    id: "corpus",
    title: ["Finding and importing music", "尋找與匯入樂譜"],
    intro: ["Start from music that already exists: music21's corpus, your own files, and public-domain libraries.", "從已經存在的音樂開始：music21 的曲庫、你自己的檔案，以及公有領域的樂譜庫。"],
    sections: [
      {
        id: "corpus",
        title: ["music21's corpus", "music21 的曲庫"],
        plan: [["`corpus.parse(\"bach/bwv66.6\")`, searching the corpus, which works it holds.", "`corpus.parse(\"bach/bwv66.6\")`、搜尋曲庫、曲庫收錄了哪些作品。"]],
      },
      {
        id: "files",
        title: ["Your own files", "你自己的檔案"],
        plan: [["Import MusicXML, MXL, MIDI, ABC or Humdrum, then `load(\"name\")`.", "匯入 MusicXML、MXL、MIDI、ABC 或 Humdrum，再用 `load(\"name\")`。"]],
      },
      {
        id: "libraries",
        title: ["Public-domain libraries", "公有領域樂譜庫"],
        plan: [["OpenScore, Mutopia, KernScores and IMSLP: which have files you can load, and their licences.", "OpenScore、Mutopia、KernScores 與 IMSLP：哪些有可以載入的檔案，以及它們的授權。"]],
      },
    ],
  },
  structure: {
    id: "structure",
    title: ["Structuring a score", "組織樂譜"],
    intro: ["Keep a long score readable: functions for motifs, loops for repeats, one variable per part.", "讓長篇樂譜保持可讀：動機寫成函式，重複寫成迴圈，每個聲部一個變數。"],
    sections: [
      {
        id: "motifs",
        title: ["Motifs as functions", "動機寫成函式"],
        plan: [["A motif, then its transpositions and inversions, from one definition.", "一個動機，以及從同一定義產生的移調與倒影。"]],
      },
      {
        id: "form",
        title: ["Form: sections and repeats", "曲式：段落與反覆"],
        plan: [["Building A–B–A from parts; repeat signs versus written-out repeats.", "用片段組成 A–B–A；反覆記號與寫出來的反覆。"]],
      },
      {
        id: "arranging",
        title: ["Arranging for other instruments", "改編給其他樂器"],
        plan: [["Ranges, transposing instruments and clefs.", "音域、移調樂器與譜號。"]],
        tryIn: ["twinkle-duet"],
      },
    ],
  },
  errors: {
    id: "errors",
    title: ["Reading errors", "讀懂錯誤訊息"],
    intro: ["What Python and music21 tell you when something is wrong, and how to fix the usual cases.", "出錯時 Python 與 music21 告訴你什麼，以及如何修正常見的情況。"],
    sections: [
      {
        id: "python",
        title: ["Python errors", "Python 錯誤"],
        plan: [["Line numbers, `NameError`, `SyntaxError`; forgetting to set `score`.", "行號、`NameError`、`SyntaxError`；忘了設定 `score`。"]],
      },
      {
        id: "music",
        title: ["Music that runs but is wrong", "能執行但不對的音樂"],
        plan: [["Bars that don't add up, wrong octaves in tinyNotation, ties and accidentals.", "時值加不滿的小節、tinyNotation 的八度錯誤、連結線與臨時記號。"]],
      },
    ],
  },
  verify: {
    id: "verify",
    title: ["Checking a score", "檢查樂譜"],
    intro: ["Write rules for your own music the way Learn to Code's problems do, and use them to check a score.", "像「學寫程式」的題目那樣為你自己的音樂寫規則，用它們檢查樂譜。"],
    sections: [
      {
        id: "rules",
        title: ["Rules as tests", "規則就是測試"],
        plan: [["Ranges, voice leading and cadences as checks you can run.", "音域、聲部進行與終止式，寫成可以執行的檢查。"]],
        tryIn: ["species-1-above"],
      },
      {
        id: "parts",
        title: ["Checking parts before printing", "印刷前檢查分譜"],
        plan: [["Page turns, cues, multi-bar rests and a last look at each part.", "翻頁、提示音、多小節休止，以及每份分譜的最後檢查。"]],
      },
    ],
  },
};

export const AGENT_OUTLINES: Record<string, DraftOutline> = {
  tools: {
    id: "tools",
    overline: AI,
    title: ["AI music tools", "AI 音樂工具"],
    intro: [
      "What AI can and cannot do with written music today, and which of these Polyphonizer will use.",
      "今天 AI 在書面音樂上能做什麼、不能做什麼，以及 Polyphonizer 會用到哪些。",
    ],
    sections: [
      {
        id: "omr",
        title: ["Reading printed music (OMR)", "辨識印刷樂譜（OMR）"],
        plan: [["From a photo or PDF to MusicXML; where it fails; checking its output.", "從照片或 PDF 到 MusicXML；它在哪裡失敗；如何檢查輸出。"]],
      },
      {
        id: "transcription",
        title: ["Transcribing a recording", "從錄音轉譜"],
        plan: [["One melodic line first: pitch tracking, then rhythm and bars.", "先做單一旋律：先追蹤音高，再處理節奏與小節。"]],
      },
      {
        id: "composing",
        title: ["Composing with a model", "與模型一起作曲"],
        plan: [["Harmonising and countermelodies you can hear and check, not 'generate a song'.", "可聆聽、可檢查的配和聲與對位旋律，而不是「生成一首歌」。"]],
      },
    ],
  },
  skills: {
    id: "agent-skills",
    overline: AI,
    title: ["Agent skill", "代理 Skill"],
    intro: [
      "Teach your own AI coding agent (Claude Code, Codex and others) to write music21 scores the Polyphonizer way.",
      "教你自己的 AI 程式代理（Claude Code、Codex 等）用 Polyphonizer 的方式寫 music21 樂譜。",
    ],
    sections: [
      {
        id: "teaches",
        title: ["What the skill will teach", "這個 skill 將教什麼"],
        plan: [
          ["The loop: rules first, then the music, then run and check.", "循環：先寫規則，再寫音樂，然後執行與檢查。"],
          ["Rules: never change the given parts; hints, not answers, when you are learning.", "規則：絕不修改給定的聲部；你在學習時給提示而不是答案。"],
        ],
      },
      {
        id: "install",
        title: ["Install it in your agent", "安裝到你的代理"],
        plan: [["The same install steps as Tensorizer and Formalizer (learnkit's agent setup), once the skill is published.", "skill 發佈後，安裝步驟與 Tensorizer、Formalizer 相同（learnkit 的代理設定）。"]],
      },
    ],
  },
  mcp: {
    id: "agent-mcp",
    overline: AI,
    title: ["MCP server", "MCP 伺服器"],
    intro: [
      "Let an agent run your score code, engrave it and check it against the rules, through a local MCP server.",
      "透過本機 MCP 伺服器，讓代理執行你的樂譜程式碼、排版，並依規則檢查。",
    ],
    sections: [
      {
        id: "tools",
        title: ["What it will offer", "它將提供什麼"],
        plan: [["Tools such as run_score, check_problem and plan_pages, on your own computer.", "在你自己的電腦上提供 run_score、check_problem、plan_pages 等工具。"]],
      },
      {
        id: "connect",
        title: ["Connect your agent", "連接你的代理"],
        plan: [["The same connection steps as Formalizer's runner, once the local runner exists.", "本機執行器完成後，連接步驟與 Formalizer 的執行器相同。"]],
      },
    ],
  },
};
