/**
 * AI agent ▸ MCP (#/agents/mcp): an agent of the visitor's own, outside the site (Claude Code or Codex in a terminal,
 * Claude Desktop, claude.ai, any MCP client), connected to the score on their page through the runner
 * (runner/agent/connector.py and tools.py; the panel's Settings ▸ "Your agent, outside the site").
 */
import { ShellCommand, TwoLists, useLang } from "@learnkit/web";
import { Callout, List, P, Page, Section, SiteLink, type L, type SectionInfo } from "../kit";

const AI: L = ["AI agent", "AI 代理"];

const TOOLS: L[] = [
  ["`get_score`: the score on your page: its title, its files and main.py's code", "`get_score`：你頁面上的樂譜：標題、檔案與 main.py 的程式碼"],
  ["`read_file`: one of its .py files", "`read_file`：讀取其中一個 .py 檔"],
  ["`write_file`: a file's new code, shown on your page to apply or discard", "`write_file`：寫入檔案的新程式碼，會顯示在你的頁面上讓你套用或捨棄"],
  [
    "`compile`: run it with music21 and the site's helpers: the parts, bars, key, time and pages, or the error and its line; and some bars' notes as text",
    "`compile`：用 music21 與網站的輔助函式執行：聲部、小節、調號、拍號與頁數，或錯誤與行號；也能取得某幾小節的音符文字",
  ],
];
const RULES: L[] = [
  ["The agent works on a copy of the score on your page; your page is the truth", "代理處理的是你頁面上樂譜的副本；以你的頁面為準"],
  ["Nothing changes until you press Apply", "在你按下「套用」之前，什麼都不會改變"],
  ["The address holds a key: only an agent you gave it can connect", "位址內含金鑰：只有你交給它的代理能連線"],
  ["Disconnect (or make a new address) and the old one stops working", "中斷連線（或換新位址）後，舊位址就失效"],
];

const PAGE = "agent-mcp";
const SECTIONS: SectionInfo[] = [
  { id: "tools", title: ["What your agent gets", "你的代理能得到什麼"] },
  { id: "connect", title: ["Connect it", "連接它"] },
  { id: "where", title: ["Which agent, which runner", "哪種代理、哪個執行器"] },
];

export function McpAgent({ section }: { section: string | null }) {
  const { pick } = useLang();
  return (
    <Page
      id={PAGE}
      overline={AI}
      title={["Your own agent, by MCP", "透過 MCP 使用你自己的代理"]}
      intro={[
        "The AI panel runs an agent for you. If you'd rather work in your own terminal or app (Claude Code, Codex, Claude Desktop, claude.ai), connect it to the score on your page instead: through the runner, it gets tools to read the score, change its files and compile it, and you apply its changes on the page.",
        "AI 面板會替你執行代理。如果你比較想在自己的終端機或應用程式（Claude Code、Codex、Claude Desktop、claude.ai）裡工作，也可以把它連到你頁面上的樂譜：透過執行器，它能取得讀取樂譜、修改檔案、編譯的工具，而你在頁面上套用它的修改。",
      ]}
      sections={SECTIONS}
      focus={section}
    >
      <Section page={PAGE} id="tools" n={1} title={SECTIONS[0].title}>
        <P
          t={[
            "MCP (Model Context Protocol) is the standard way for an AI agent to call tools. With these, your agent doesn't have to guess whether its music is right: it compiles the score and reads the same result you see.",
            "MCP（Model Context Protocol，模型上下文協定）是讓 AI 代理呼叫工具的標準方式。有了這些工具，代理不必猜自己寫的音樂對不對：它會編譯樂譜，讀到和你看到的一樣的結果。",
          ]}
        />
        <TwoLists left={{ title: pick(["Tools", "工具"]), items: TOOLS.map(pick), numbered: false }} right={{ title: pick(["Rules", "規則"]), items: RULES.map(pick) }} />
      </Section>

      <Section page={PAGE} id="connect" n={2} title={SECTIONS[1].title}>
        <List
          items={[
            ["Start the runner (`pixi run runner`), or use one on your server.", "啟動執行器（`pixi run runner`），或使用你伺服器上的執行器。"],
            [
              "Open a score, then the AI panel (toolbox ▸ AI agent) ▸ Settings ▸ **Make a connection**. It shows your MCP address and the command for each agent, ready to copy.",
              "開啟一份樂譜，再打開 AI 面板（工具箱 ▸ AI 代理）▸ 設定 ▸ **建立連線**。它會顯示你的 MCP 位址，以及各種代理可直接複製的指令。",
            ],
            ["Give it to your agent, for example:", "把它交給你的代理，例如："],
          ]}
        />
        <ShellCommand text="claude mcp add --transport http polyphonizer http://127.0.0.1:8765/mcp/pzc_…" plain />
        <ShellCommand text="codex mcp add polyphonizer --url http://127.0.0.1:8765/mcp/pzc_…" plain />
        <P
          t={[
            "Then ask it in your own chat (\"make bar 4 a dotted rhythm, then compile\"). Keep the AI panel open: it sends the score on screen to the runner and shows each change the agent writes, to apply or discard.",
            "接著在你自己的對話裡請它工作（「把第 4 小節改成附點節奏，然後編譯」）。請保持 AI 面板開著：它會把畫面上的樂譜送到執行器，並顯示代理寫入的每個修改，讓你套用或捨棄。",
          ]}
        />
      </Section>

      <Section page={PAGE} id="where" n={3} title={SECTIONS[2].title}>
        <P
          t={[
            "**Agents on your computer** (Claude Code, Codex, Claude Desktop with a local config) reach the runner on your computer at `http://127.0.0.1:8765`.",
            "**你電腦上的代理**（Claude Code、Codex、用本機設定的 Claude Desktop）可以連到你電腦上的執行器 `http://127.0.0.1:8765`。",
          ]}
        />
        <P
          t={[
            "**Agents in the cloud** (claude.ai's custom connectors, ChatGPT) connect from the internet, so they need a runner with an HTTPS address: on a VPS or as a Space. Add the address under Settings ▸ Connectors ▸ Add custom connector.",
            "**雲端上的代理**（claude.ai 的自訂連接器、ChatGPT）是從網際網路連線，所以需要有 HTTPS 位址的執行器：放在 VPS 上或作為 Space。在設定 ▸ 連接器 ▸ 新增自訂連接器中加入這個位址。",
          ]}
        />
        <Callout kind="tip" title={["Kept across restarts", "重新啟動後仍保留"]}>
          <p>
            {pick([
              "The runner remembers your connection (as a hash of its key), so you set your agent up once. Disconnect in the panel when you no longer want it.",
              "執行器會記住你的連線（只存金鑰的雜湊），所以代理只需設定一次。不再需要時，在面板中中斷連線即可。",
            ])}
          </p>
        </Callout>
        <p className="flex flex-wrap gap-4">
          <SiteLink to={["agents", "runner", "vps"]} label={["A runner on a VPS", "VPS 上的執行器"]} />
          <SiteLink to={["agents", "runner", "agent"]} label={["The AI panel", "AI 面板"]} />
        </p>
      </Section>
    </Page>
  );
}
