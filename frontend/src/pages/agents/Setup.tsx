/**
 * AI agent ▸ Agent skill (#/agents/skills) and ▸ MCP server (#/agents/mcp): the visitor's own AI coding agent.
 *
 * Polyphonizer has not published its skill (no SKILL.md, no generated/agent files) and has no local runner or MCP
 * server yet, so these pages say what is planned and give a prompt that works today. When the skill and the runner
 * exist, swap in learnkit's SkillSetup and McpSetup the way Formalizer's agents/Setup.tsx does.
 */
import { ShellCommand, TwoLists, useLang } from "@learnkit/web";
import { Callout, List, P, Page, Section, SiteLink, type L, type SectionInfo } from "../kit";

const AI: L = ["AI agent", "AI 代理"];

// ---------------------------------------------------------------- Agent skill

const LOOP: L[] = [
  [
    "Read the task and the rules it is checked by (range, intervals, parallels, the given parts).",
    "讀題目，以及它要用哪些規則檢查（音域、音程、平行、給定聲部）。",
  ],
  [
    "Plan in words first: the key, the shape of the line, where the cadence goes.",
    "先用文字規劃：調性、旋律線的走向、終止式放在哪裡。",
  ],
  [
    "Write the music as score code: `tiny()` for each part, `together()` to join them, and set `score`.",
    "把音樂寫成樂譜程式碼：每個聲部用 `tiny()`，再用 `together()` 合起來，最後設定 `score`。",
  ],
  ["Run it: look at the engraving and listen to it.", "執行：看排版結果，也聽一遍。"],
  ["Check it with the rules; fix one problem at a time and check again.", "用規則檢查；一次修一個問題，修完再檢查。"],
];
const RULES: L[] = [
  ["Score code always leaves its result in `score`.", "樂譜程式碼一定要把結果放在 `score`。"],
  [
    "Never change the given parts of a Learn to Code problem (the cantus firmus, the melody).",
    "絕不修改「學寫程式」的題目裡給定的聲部（定旋律、主旋律）。",
  ],
  [
    "No invented music21 names: use what exists, and run the code to be sure.",
    "不捏造 music21 的名稱：只用真的存在的，並執行程式碼確認。",
  ],
  ["When you are learning: a hint and the reason, not the whole answer.", "你在學習時：給提示與理由，而不是整個答案。"],
  [
    'The rules decide, not the agent: "it sounds fine" is not a check.',
    "由規則決定，而不是代理：「聽起來沒問題」不算檢查。",
  ],
];

const PROMPT: L = [
  `You are helping me with Polyphonizer, a site where a music score is Python code using music21.

Conventions:
- Score code must leave its result in a variable named \`score\` (a music21 Score, Part or Stream).
- All music21 names are already imported (from music21 import *). The helpers tiny, together and load are imported too.
- tiny("c4 d8 e f#2 r4 c'1", name="Flute", key_sig="C", inst="flute", time="4/4") makes a part from tinyNotation: letter = pitch, number = note value, ' and , = octaves, # and - = sharp and flat, r = rest.
- together(part1, part2, title=..., bpm=...) joins parts into a score. load("file.musicxml") reads a file I imported.
- Only use music21 functions that really exist. If you are not sure, say so.

When I am working on a Learn to Code problem:
- Never change the given parts (cantus firmus, melody); only write the part I am asked to write.
- I am learning: give me a hint and the reason, one problem at a time, not the finished answer, unless I ask for it.
- The site's rule checker decides. Tell me which rule a note breaks (for example parallel fifths, a dissonance, out of range) and let me fix it, then I will check again.`,
  `你正在協助我使用 Polyphonizer，這個網站把樂譜寫成使用 music21 的 Python 程式碼。

慣例：
- 樂譜程式碼必須把結果放在名為 \`score\` 的變數（music21 的 Score、Part 或 Stream）。
- music21 的所有名稱都已匯入（from music21 import *），輔助函式 tiny、together、load 也已匯入。
- tiny("c4 d8 e f#2 r4 c'1", name="Flute", key_sig="C", inst="flute", time="4/4") 用 tinyNotation 寫出一個聲部：字母是音高、數字是時值、' 與 , 是八度、# 與 - 是升降記號、r 是休止符。
- together(part1, part2, title=..., bpm=...) 把聲部合成總譜。load("file.musicxml") 讀取我匯入的檔案。
- 只用 music21 真的有的函式。不確定時請直說。

當我在做「學寫程式」的題目時：
- 絕不修改給定的聲部（定旋律、主旋律）；只寫題目要我寫的那個聲部。
- 我正在學習：一次針對一個問題，給我提示和理由，不要直接給完整答案，除非我要求。
- 以網站的規則檢查器為準。告訴我哪個音違反了哪條規則（例如平行五度、不協和音、超出音域），讓我自己修，然後我會再檢查一次。`,
];

const SKILL_PAGE = "agent-skills";
const SKILL_SECTIONS: SectionInfo[] = [
  {
    id: "teaches",
    title: ["What the skill will teach", "這個 skill 將教什麼"],
  },
  { id: "install", title: ["Install it in your agent", "安裝到你的代理"] },
  { id: "today", title: ["Use your agent today", "今天就用你的代理"] },
];

export function SkillsAgent({ section }: { section: string | null }) {
  const { pick } = useLang();
  return (
    <Page
      id={SKILL_PAGE}
      overline={AI}
      title={["Agent skill (coming soon)", "代理 Skill（即將推出）"]}
      intro={[
        "Teach your own AI coding agent (Claude Code, Codex and others) to write music21 scores the Polyphonizer way: the score is code, the rules do the checking, and when you are learning it gives hints instead of answers.",
        "教你自己的 AI 程式代理（Claude Code、Codex 等）用 Polyphonizer 的方式寫 music21 樂譜：樂譜就是程式碼，由規則負責檢查；你在學習時，它給提示而不是答案。",
      ]}
      sections={SKILL_SECTIONS}
      focus={section}
    >
      <Section page={SKILL_PAGE} id="teaches" n={1} title={SKILL_SECTIONS[0].title}>
        <P
          t={[
            "A skill is a short instruction file your agent reads before it works on a task. Polyphonizer's will teach one loop and a few rules.",
            "skill 是一份簡短的說明檔，代理在動手之前會先讀它。Polyphonizer 的 skill 會教一個循環和幾條規則。",
          ]}
        />
        <TwoLists
          left={{ title: pick(["The loop", "循環"]), items: LOOP.map(pick) }}
          right={{ title: pick(["Rules", "規則"]), items: RULES.map(pick) }}
        />
      </Section>

      <Section page={SKILL_PAGE} id="install" n={2} title={SKILL_SECTIONS[1].title}>
        <Callout kind="warn" title={["Not published yet", "尚未發佈"]}>
          <p>
            {pick([
              "The Polyphonizer skill is still being written, so there is nothing to install today. When it is published, this section will have the same install steps as Tensorizer's and Formalizer's skills: pick your agent, then copy one command (or download the skill folder).",
              "Polyphonizer 的 skill 還在撰寫中，所以今天還沒有東西可以安裝。發佈之後，這一節會提供和 Tensorizer、Formalizer 的 skill 相同的安裝步驟：選擇你的代理，然後複製一行指令（或下載 skill 資料夾）。",
            ])}
          </p>
        </Callout>
        <P
          t={[
            "The skill only teaches; it does not run anything. To let the agent run and check scores by itself, it will also need the MCP server.",
            "skill 只負責教，不會執行任何東西。要讓代理自己執行與檢查樂譜，還需要 MCP 伺服器。",
          ]}
        />
        <p>
          <SiteLink to={["agents", "mcp"]} label={["MCP server", "MCP 伺服器"]} />
        </p>
      </Section>

      <Section page={SKILL_PAGE} id="today" n={3} title={SKILL_SECTIONS[2].title}>
        <P
          t={[
            "Until then, paste this at the start of a conversation with any coding agent or chat assistant. It gives the agent the same conventions the skill will.",
            "在那之前，把下面這段貼在你和任何程式代理或聊天助理對話的開頭。它會給代理和 skill 相同的慣例。",
          ]}
        />
        <ShellCommand text={pick(PROMPT)} plain />
        <P
          t={[
            "Then paste your score code and the problem's text, ask your question, and copy the agent's code back into the editor. Press **Check** yourself: the agent cannot see the site, so its \"this is correct\" is a guess until the rules agree.",
            "接著貼上你的樂譜程式碼和題目文字，提出你的問題，再把代理寫的程式碼複製回編輯器。自己按下 **檢查**：代理看不到網站，所以它說「這是對的」只是猜測，要等規則同意才算數。",
          ]}
        />
        <Callout kind="tip" title={["Good questions to ask", "值得問的問題"]}>
          <List
            items={[
              ['"Which rule does bar 3 break, and why?"', "「第 3 小節違反了哪條規則？為什麼？」"],
              [
                '"Give me two options for the next note, not the whole line."',
                "「給我下一個音的兩種選擇，不要整條旋律。」",
              ],
              ['"Explain what this music21 line does."', "「解釋這行 music21 程式碼在做什麼。」"],
            ]}
          />
        </Callout>
      </Section>
    </Page>
  );
}

// ---------------------------------------------------------------- MCP server

const TOOLS: L[] = [
  [
    "`run_score`: run score code; return the summary (parts, bars, key, time) or the error",
    "`run_score`：執行樂譜程式碼；回傳摘要（聲部、小節、調號、拍號）或錯誤訊息",
  ],
  ["`list_problems`: the Learn to Code problem bank", "`list_problems`：學習題庫"],
  [
    "`get_problem`: the task, the given parts and the starting code (never the solution)",
    "`get_problem`：題目、給定聲部與起始程式碼（絕不含解答）",
  ],
  [
    "`check_problem`: the site's rule check: passed or not, and which notes break which rule",
    "`check_problem`：和網站一樣的規則檢查：是否通過，以及哪些音違反了哪條規則",
  ],
  [
    "`plan_pages`: lay a score or one part out on pages, with turns at rests",
    "`plan_pages`：把總譜或單一分譜排成頁面，在休止處翻頁",
  ],
];
const MCP_RULES: L[] = [
  ["Runs on your own computer: nothing leaves it", "在你自己的電腦上執行：沒有東西離開它"],
  [
    "Answers agents on this computer only (localhost); other websites are refused",
    "只回應這台電腦上的代理（localhost）；其他網站一律拒絕",
  ],
  ["The same music21 and the same rules as the site", "和網站相同的 music21、相同的規則"],
  ["Reads the problem bank; never edits your files", "只讀題庫；絕不修改你的檔案"],
];

const MCP_PAGE = "agent-mcp";
const MCP_SECTIONS: SectionInfo[] = [
  { id: "tools", title: ["What it will offer", "它將提供什麼"] },
  {
    id: "runner",
    title: ["A runner on your own computer", "在你自己電腦上的執行器"],
  },
  { id: "connect", title: ["Connect your agent", "連接你的代理"] },
];

export function McpAgent({ section }: { section: string | null }) {
  const { pick } = useLang();
  return (
    <Page
      id={MCP_PAGE}
      overline={AI}
      title={["MCP server (coming soon)", "MCP 伺服器（即將推出）"]}
      intro={[
        "Give your agent Polyphonizer's engine as tools: run score code, check it against the Learn rules and lay it out on pages, through a local MCP server. Planned, not available yet.",
        "把 Polyphonizer 的引擎變成代理的工具：透過本機 MCP 伺服器執行樂譜程式碼、依學習題的規則檢查、排成頁面。已規劃，尚未提供。",
      ]}
      sections={MCP_SECTIONS}
      focus={section}
    >
      <Section page={MCP_PAGE} id="tools" n={1} title={MCP_SECTIONS[0].title}>
        <P
          t={[
            "MCP (Model Context Protocol) is a standard way for an AI agent to call tools. With it, the agent does not have to guess whether its music is right: it runs the code and reads the same verdict you see.",
            "MCP（Model Context Protocol，模型上下文協定）是讓 AI 代理呼叫工具的標準方式。有了它，代理不必猜自己寫的音樂對不對：它會執行程式碼，讀到和你看到的一樣的判定。",
          ]}
        />
        <TwoLists
          left={{
            title: pick(["Tools", "工具"]),
            items: TOOLS.map(pick),
            numbered: false,
          }}
          right={{ title: pick(["Rules", "規則"]), items: MCP_RULES.map(pick) }}
        />
        <P
          t={[
            "The tool names are the plan; they may change before the first release.",
            "工具名稱是目前的規劃，第一版發佈前可能會調整。",
          ]}
        />
      </Section>

      <Section page={MCP_PAGE} id="runner" n={2} title={MCP_SECTIONS[1].title}>
        <P
          t={[
            "Today everything runs in your browser: music21 in Pyodide, Verovio for engraving. An agent in your terminal cannot reach into a browser tab, so the MCP server will live in a small **local runner**: a program you start on your own computer, like Formalizer's runner for Lean.",
            "目前一切都在你的瀏覽器裡執行：music21 跑在 Pyodide 裡，排版用 Verovio。終端機裡的代理無法伸手進瀏覽器分頁，所以 MCP 伺服器會放在一個小小的 **本機執行器** 裡：一個在你自己電腦上啟動的程式，就像 Formalizer 用來跑 Lean 的執行器。",
          ]}
        />
        <List
          items={[
            [
              "It runs the same score code with regular Python and music21, so results match the site.",
              "它用一般的 Python 與 music21 執行同樣的樂譜程式碼，所以結果和網站一致。",
            ],
            [
              "It listens on `localhost` only: agents on your computer can use it, nothing on the internet can.",
              "它只監聽 `localhost`：你電腦上的代理可以使用，網路上的任何東西都不行。",
            ],
            [
              "The same runner will later do the heavy jobs a browser cannot, such as reading printed music from a PDF (OMR).",
              "之後同一個執行器也會處理瀏覽器做不來的重工作，例如從 PDF 辨識印刷樂譜（OMR）。",
            ],
          ]}
        />
      </Section>

      <Section page={MCP_PAGE} id="connect" n={3} title={MCP_SECTIONS[2].title}>
        <Callout kind="warn" title={["Not available yet", "尚未提供"]}>
          <p>
            {pick([
              "There is no local runner or MCP server yet. When there is, this section will have the same connection steps as Formalizer's: start the runner with one command, pick your agent, and copy its MCP config.",
              "目前還沒有本機執行器，也沒有 MCP 伺服器。完成之後，這一節會提供和 Formalizer 相同的連接步驟：用一行指令啟動執行器，選擇你的代理，再複製它的 MCP 設定。",
            ])}
          </p>
        </Callout>
        <P
          t={[
            "Meanwhile, the prompt on the Agent skill page lets any agent write score code you paste into the editor and check yourself.",
            "在那之前，代理 Skill 頁面上的提示詞可以讓任何代理寫出樂譜程式碼，由你貼進編輯器並自己檢查。",
          ]}
        />
        <p className="flex flex-wrap gap-4">
          <SiteLink to={["agents", "skills", "today"]} label={["Use your agent today", "今天就用你的代理"]} />
          <SiteLink to={["agents", "roadmap"]} label={["Product roadmap", "產品路線圖"]} />
        </p>
      </Section>
    </Page>
  );
}
