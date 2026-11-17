/**
 * The AI panel (docs/plans/local-agent.md): one for the whole site, a drawer on the right opened from the Toolbox or
 * "Ask AI about this bar". The learner's own agent works on the score on screen through their runner (client.ts):
 * this computer's Claude Code or Codex (free: bring your own agent), their API key, or, with Pro, the agent included
 * with the Polyphonizer service. Its edits come back as a diff to apply (then Undo) or discard; nothing changes the
 * score by itself. The chat survives a reload: a turn still running is followed again.
 */
import { go, RichText, useLang } from "@learnkit/web";
import { Bot, Check, ChevronRight, Maximize2, Minimize2, Plus, RefreshCw, Search, Send, Settings2, Square, Undo2, Wrench, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Badge, COMING_SOON, PRO } from "../Badge.tsx";
import { Icon } from "../Button.tsx";
import { backendOk, loadBackend, RUNNER_URL, runnerStatus, saveBackend, type Backend, type RunnerStatus } from "../transcribe/routes.ts";
import { BUTTON, FIELD, PRIMARY } from "../ui.ts";
import { applyFiles, clearAttach, closeAgent, scoreOnScreen, usePanel, useScoreOnScreen, type PanelState } from "./bus.ts";
import { loadChat, saveChat, toolLabel, withEvent, withMessage, type Block, type Chat } from "./chat.ts";
import {
  cancelTurn,
  followTurn,
  loadKey,
  loadSettings,
  newChatId,
  saveKey,
  saveSettings,
  scanAgents,
  sendChat,
  type AgentContext,
  type AgentEvent,
  type AgentId,
  type AgentSettings,
  type FoundAgent,
} from "./client.ts";
import { counts, diffLines, hunks } from "./diff.ts";

type L = readonly [string, string];
const fresh = (): Chat => ({ id: newChatId(), blocks: [], turn: null });

const AGENT_NAME: Record<AgentId, L> = {
  "claude-code": ["Claude Code on this computer", "這台電腦上的 Claude Code"],
  codex: ["Codex on this computer", "這台電腦上的 Codex"],
  "claude-api": ["Claude with your API key", "用你的 API 金鑰使用 Claude"],
  included: ["Included with Pro", "Pro 方案內含"],
};

/** what the attached bars or code say, for the chip and the message */
function attachLabel(a: PanelState["attach"], pick: (l: L) => string): string | null {
  if (a?.bars) {
    const { from, to, part } = a.bars;
    const bars = to && to !== from ? pick([`bars ${from}–${to}`, `第 ${from}–${to} 小節`]) : pick([`bar ${from}`, `第 ${from} 小節`]);
    return part ? `${bars} · ${part}` : bars;
  }
  if (a?.code) return `${a.code.file}: ${pick([`lines ${a.code.from}–${a.code.to}`, `第 ${a.code.from}–${a.code.to} 行`])}`;
  return null;
}

/** an answer: code fences as code, the rest as paragraphs and lists with inline Markdown */
function Answer({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let at = 0;
  const prose = (t: string, key: string) => {
    t.split(/\n{2,}/).forEach((para, i) => {
      if (!para.trim()) return;
      const items = para.split("\n");
      if (items.every((l) => /^\s*([-*]|\d+\.)\s/.test(l)))
        parts.push(
          <ul key={`${key}-${i}`} className="my-1.5 list-disc space-y-0.5 pl-5">
            {items.map((l, j) => (
              <li key={j}>
                <RichText text={l.replace(/^\s*([-*]|\d+\.)\s/, "")} />
              </li>
            ))}
          </ul>,
        );
      else
        parts.push(
          <p key={`${key}-${i}`} className="my-1.5 whitespace-pre-wrap">
            <RichText text={para.replace(/^#+\s*/, "")} />
          </p>,
        );
    });
  };
  for (const m of text.matchAll(/```[\w+#.-]*[^\n]*\n?([\s\S]*?)(?:```|$(?![\s\S]))/g)) {
    if (m.index! > at) prose(text.slice(at, m.index), `p${at}`);
    parts.push(
      <pre key={`c${m.index}`} className="my-1.5 overflow-x-auto rounded-md bg-gray-900 px-3 py-2 font-mono text-xs leading-relaxed text-gray-100">
        {m[1].replace(/\n$/, "")}
      </pre>,
    );
    at = m.index! + m[0].length;
  }
  if (at < text.length) prose(text.slice(at), `p${at}`);
  return <div className="text-sm leading-relaxed text-gray-800">{parts}</div>;
}

function ToolRow({ b }: { b: Extract<Block, { kind: "tool" }> }) {
  const { pick } = useLang();
  const [open, setOpen] = useState(false);
  const { verb, what } = toolLabel(b.name, b.input);
  const VERBS: Record<string, L> = {
    compile: ["Compiled the score", "編譯了樂譜"],
    read: ["Read", "讀取"],
    edit: ["Edited", "編輯"],
    write: ["Wrote", "寫入"],
    glob: ["Looked for files", "尋找檔案"],
    grep: ["Searched", "搜尋"],
    list: ["Listed", "列出"],
    ask: ["Asked you", "問了你"],
  };
  const label = VERBS[verb] ? pick(VERBS[verb]) : verb;
  const shown = verb === "compile" && what ? `${label} · ${pick(["bars", "小節"])} ${what}` : `${label}${what ? ` ${what}` : ""}`;
  return (
    <div className="my-1 text-xs" data-testid="agent-tool">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-gray-600 hover:bg-gray-100">
        <Icon icon={ChevronRight} className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <Icon icon={Wrench} className="h-3 w-3 shrink-0 text-gray-400" />
        <span className="min-w-0 flex-1 truncate">{shown}</span>
        {b.ok === undefined ? (
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-gray-400" aria-label={pick(["working", "進行中"])} />
        ) : b.ok ? (
          <Icon icon={Check} className="h-3 w-3 shrink-0 text-emerald-600" />
        ) : (
          <Icon icon={X} className="h-3 w-3 shrink-0 text-red-600" />
        )}
      </button>
      {open && (
        <pre className="mt-0.5 ml-5 max-h-48 overflow-auto rounded bg-gray-50 px-2 py-1 font-mono text-[11px] whitespace-pre-wrap text-gray-700">
          {JSON.stringify(b.input, null, 1)}
          {b.result ? `\n→ ${b.result}` : ""}
        </pre>
      )}
    </div>
  );
}

function FileDiff({ name, before, after }: { name: string; before: string; after: string | null }) {
  const [open, setOpen] = useState(true);
  const lines = diffLines(before, after ?? "");
  const { added, removed } = counts(lines);
  return (
    <div className="border-t border-gray-200 first:border-t-0">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs hover:bg-gray-50">
        <Icon icon={ChevronRight} className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="min-w-0 flex-1 truncate font-mono font-medium text-gray-800">{name}</span>
        {after === null ? <span className="text-red-700">deleted</span> : null}
        <span className="text-emerald-700 tabular-nums">+{added}</span>
        <span className="text-red-700 tabular-nums">−{removed}</span>
      </button>
      {open && (
        <div className="max-h-72 overflow-auto bg-white font-mono text-[11px] leading-[1.45]" data-testid="agent-diff">
          {hunks(lines).map((l, i) =>
            l === null ? (
              <div key={i} className="bg-gray-50 px-2 text-gray-400">
                ⋯
              </div>
            ) : (
              <div key={i} className={`flex whitespace-pre ${l.op === "+" ? "bg-emerald-50 text-emerald-900" : l.op === "-" ? "bg-red-50 text-red-900" : "text-gray-600"}`}>
                <span className="w-8 shrink-0 pr-1 text-right text-gray-400 select-none">{l.b ?? l.a}</span>
                <span className="w-3 shrink-0 select-none">{l.op}</span>
                <span>{l.text}</span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function FilesCard({ b, onChange }: { b: Extract<Block, { kind: "files" }>; onChange: (b: Extract<Block, { kind: "files" }>) => void }) {
  const { pick } = useLang();
  const score = useScoreOnScreen();
  const current = Object.fromEntries((score?.files ?? []).map((f) => [f.name, f.code]));
  const names = [...Object.keys(b.files), ...b.removed];
  const [note, setNote] = useState<string | null>(null);
  const apply = () => {
    const before: Record<string, string | null> = Object.fromEntries(names.map((n) => [n, current[n] ?? null]));
    if (!applyFiles(b.files, b.removed)) return setNote(pick(["Open the score in Scores to apply this.", "請在「樂譜」中開啟這份樂譜再套用。"]));
    setNote(null);
    onChange({ ...b, state: "applied", before });
  };
  const undo = () => {
    const back = b.before ?? {};
    const files = Object.fromEntries(Object.entries(back).filter(([, c]) => c !== null)) as Record<string, string>;
    const removed = Object.entries(back)
      .filter(([, c]) => c === null)
      .map(([n]) => n);
    if (!applyFiles(files, removed)) return setNote(pick(["Open the score in Scores to undo this.", "請在「樂譜」中開啟這份樂譜再復原。"]));
    onChange({ ...b, state: "new", before: undefined });
  };
  return (
    <div className="my-2 overflow-hidden rounded-lg border border-gray-200" data-testid="agent-files">
      <div className="flex items-center gap-2 bg-gray-50 px-2 py-1.5 text-xs">
        <b className="flex-1 text-gray-800">
          {b.state === "applied" ? pick(["Applied to your score", "已套用到你的樂譜"]) : b.state === "discarded" ? pick(["Not applied", "未套用"]) : pick(["Proposed changes", "建議的修改"])}
        </b>
        {b.state === "new" && (
          <>
            <button onClick={() => onChange({ ...b, state: "discarded" })} className="rounded px-2 py-0.5 text-gray-600 hover:bg-gray-200" data-testid="agent-discard">
              {pick(["Discard", "捨棄"])}
            </button>
            <button onClick={apply} className="rounded bg-(--lk-accent) px-2.5 py-0.5 font-medium text-white hover:opacity-90" data-testid="agent-apply">
              {pick(["Apply", "套用"])}
            </button>
          </>
        )}
        {b.state === "applied" && (
          <button onClick={undo} className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-gray-700 hover:bg-gray-200" data-testid="agent-undo">
            <Icon icon={Undo2} className="h-3 w-3" /> {pick(["Undo", "復原"])}
          </button>
        )}
        {b.state === "discarded" && (
          <button onClick={() => onChange({ ...b, state: "new" })} className="rounded px-2 py-0.5 text-gray-600 hover:bg-gray-200">
            {pick(["Show again", "再次顯示"])}
          </button>
        )}
      </div>
      {note && <p className="px-2 py-1 text-xs text-amber-800">{note}</p>}
      {b.state !== "discarded" &&
        names.map((n) => <FileDiff key={n} name={n} before={b.state === "applied" ? (b.before?.[n] ?? "") : (current[n] ?? "")} after={b.removed.includes(n) ? null : b.files[n]} />)}
    </div>
  );
}

function Question({ b, onAnswer, busy }: { b: Extract<Block, { kind: "question" }>; onAnswer: (text: string) => void; busy: boolean }) {
  const { pick } = useLang();
  const [chosen, setChosen] = useState<string[]>([]);
  return (
    <div className="my-2 rounded-lg border border-(--lk-accent)/40 bg-rose-50/40 p-2.5 text-sm" data-testid="agent-question">
      <p className="font-medium text-gray-900">{b.question}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {b.options.map((o) =>
          b.multi ? (
            <label key={o} className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs">
              <input type="checkbox" disabled={b.answered || busy} checked={chosen.includes(o)} onChange={(e) => setChosen((c) => (e.target.checked ? [...c, o] : c.filter((x) => x !== o)))} />
              {o}
            </label>
          ) : (
            <button key={o} disabled={b.answered || busy} onClick={() => onAnswer(o)} className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs hover:border-(--lk-accent) disabled:opacity-50">
              {o}
            </button>
          ),
        )}
        {b.multi && !b.answered && (
          <button disabled={!chosen.length || busy} onClick={() => onAnswer(chosen.join(", "))} className="rounded-md bg-(--lk-accent) px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">
            {pick(["Answer", "回答"])}
          </button>
        )}
      </div>
    </div>
  );
}

function Settings({
  settings,
  onSettings,
  backend,
  onBackend,
  status,
  apiKey,
  onKey,
}: {
  settings: AgentSettings;
  onSettings: (s: AgentSettings) => void;
  backend: Backend;
  onBackend: (b: Backend) => void;
  status: RunnerStatus | null;
  apiKey: string;
  onKey: (k: string) => void;
}) {
  const { pick } = useLang();
  const [found, setFound] = useState<FoundAgent[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [url, setUrl] = useState(backend.url);
  const [token, setToken] = useState(backend.token);
  const agentStatus = status?.agent;
  const local = agentStatus?.local ?? true;
  const models = settings.agent === "claude-api" && settings.provider === "openrouter" ? (agentStatus?.openrouter ?? []) : (agentStatus?.models ?? []);
  const scan = async () => {
    setScanning(true);
    setScanError(null);
    try {
      setFound(await scanAgents(backend.url, backend.token));
    } catch (e) {
      setScanError((e as Error).message);
    } finally {
      setScanning(false);
    }
  };
  const radio = (id: AgentId, disabled: boolean, extra?: ReactNode) => {
    const f = found?.find((a) => a.id === id);
    return (
      <label className={`flex items-start gap-2 rounded-md px-1.5 py-1 text-sm ${disabled ? "opacity-50" : "hover:bg-gray-50"}`}>
        <input type="radio" className="mt-1" name="agent" disabled={disabled} checked={settings.agent === id} onChange={() => onSettings({ ...settings, agent: id, model: "" })} data-testid={`agent-pick-${id}`} />
        <span className="min-w-0 flex-1">
          {pick(AGENT_NAME[id])}
          {extra}
          {f && (
            <span className={`block text-xs ${f.installed ? "text-gray-500" : "text-amber-800"}`}>
              {f.installed
                ? `${pick(["found", "已找到"])}${f.version ? ` · ${f.version}` : ""} · ${f.logged_in === false ? pick(["not logged in: run it once in a terminal", "尚未登入：請先在終端機執行一次"]) : f.logged_in ? pick(["logged in", "已登入"]) : pick(["login not checked", "未檢查登入"])}`
                : pick(["not found on this computer", "這台電腦上找不到"])}
            </span>
          )}
        </span>
      </label>
    );
  };
  return (
    <div className="space-y-4 p-3 text-sm" data-testid="agent-settings">
      <section>
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{pick(["Your own agent (free)", "你自己的代理（免費）"])}</h3>
        <p className="mt-1 text-xs text-gray-500">
          {pick([
            "Polyphonizer has no AI of its own: the agent you already use does the work, through the runner on your computer. It can only touch this score's files, and it has no shell and no web.",
            "Polyphonizer 本身沒有 AI：由你已在使用的代理透過你電腦上的執行器來工作。它只能碰這份樂譜的檔案，沒有終端機也不能上網。",
          ])}
        </p>
        <div className="mt-1.5">
          {radio("claude-code", !local)}
          {radio("codex", !local)}
          {!local && <p className="px-1.5 text-xs text-amber-800">{pick(["This runner is on a server: use an API key here.", "這個執行器在伺服器上：請在這裡使用 API 金鑰。"])}</p>}
          {local && (
            <button onClick={scan} disabled={scanning || !status} className="mt-1 ml-1.5 inline-flex items-center gap-1 text-xs font-medium text-(--lk-accent) hover:underline disabled:opacity-50" data-testid="agent-scan">
              <Icon icon={Search} className="h-3 w-3" /> {scanning ? pick(["Searching…", "搜尋中…"]) : pick(["Search this computer", "搜尋這台電腦"])}
            </button>
          )}
          {scanError && <p className="px-1.5 text-xs text-red-700">{scanError}</p>}
          {radio("claude-api", false)}
          {settings.agent === "claude-api" && (
            <div className="mt-1 ml-7 grid gap-1.5">
              <select value={settings.provider} onChange={(e) => onSettings({ ...settings, provider: e.target.value as AgentSettings["provider"], model: "" })} className={FIELD}>
                <option value="anthropic">Anthropic</option>
                <option value="openrouter">OpenRouter</option>
              </select>
              <input type="password" value={apiKey} onChange={(e) => onKey(e.target.value)} placeholder={pick(["API key", "API 金鑰"])} autoComplete="off" className={FIELD} data-testid="agent-key" />
              <span className="text-xs text-gray-500">
                {pick(["Kept only until you close this tab, and sent only to your runner, which gives it to this chat's agent.", "只保留到你關閉這個分頁，且只傳給你的執行器，由它交給這段對話的代理。"])}
              </span>
            </div>
          )}
        </div>
      </section>
      <section>
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{pick(["Polyphonizer service", "Polyphonizer 服務"])}</h3>
        {radio("included", !agentStatus?.included, (
          <>
            <Badge text={PRO} pro />
            {!agentStatus?.included && <Badge text={COMING_SOON} />}
            <span className="block text-xs text-gray-500">{pick(["The agent comes with the plan: no program to install, no key.", "方案內含代理：不用安裝程式，也不用金鑰。"])}</span>
          </>
        ))}
      </section>
      {settings.agent !== "codex" && models.length > 0 && (
        <label className="grid gap-1">
          <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{pick(["Model", "模型"])}</span>
          <select value={settings.model || models[0]} onChange={(e) => onSettings({ ...settings, model: e.target.value })} className={FIELD} data-testid="agent-model">
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      )}
      {settings.agent === "codex" && (
        <label className="grid gap-1">
          <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{pick(["Model", "模型"])}</span>
          <input value={settings.model} onChange={(e) => onSettings({ ...settings, model: e.target.value })} placeholder={pick(["Codex's default", "Codex 的預設"])} className={FIELD} />
        </label>
      )}
      <section>
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{pick(["Runner", "執行器"])}</h3>
        <p className="mt-1 text-xs text-gray-500">{pick(["The same runner as Transcribe ▸ My computer.", "與「轉成樂譜 ▸ 我的電腦」是同一個執行器。"])}</p>
        <div className="mt-1.5 grid gap-1.5">
          <input value={url} onChange={(e) => setUrl(e.target.value)} className={FIELD} aria-label={pick(["Address", "位址"])} data-testid="agent-runner-url" />
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={pick(["Token (a runner on a server)", "權杖（伺服器上的執行器）"])} className={FIELD} autoComplete="off" />
          <div className="flex gap-2">
            <button
              onClick={() => backendOk(url.trim()) && onBackend({ url: url.trim(), token: token.trim() })}
              disabled={!backendOk(url.trim())}
              className={BUTTON}
            >
              {pick(["Use this runner", "使用這個執行器"])}
            </button>
            {(url !== RUNNER_URL || token) && (
              <button onClick={() => (setUrl(RUNNER_URL), setToken(""), onBackend({ url: RUNNER_URL, token: "" }))} className="text-xs text-gray-600 hover:underline">
                {pick(["Back to this computer", "改回這台電腦"])}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AgentPanel() {
  const { pick } = useLang();
  const panel = usePanel();
  const score = useScoreOnScreen();
  const [chat, setChat] = useState<Chat>(() => loadChat() ?? fresh());
  const chatRef = useRef(chat);
  chatRef.current = chat;
  const update = useCallback((f: (c: Chat) => Chat) => setChat((c) => (chatRef.current = f(c))), []);
  useEffect(() => saveChat(chat), [chat]);
  const [settings, setSettingsState] = useState<AgentSettings>(loadSettings);
  const setSettings = (s: AgentSettings) => (setSettingsState(s), saveSettings(s));
  const [apiKey, setApiKey] = useState(loadKey);
  const [backend, setBackendState] = useState<Backend>(loadBackend);
  const [status, setStatus] = useState<RunnerStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [wide, setWide] = useState(false);
  const [draft, setDraft] = useState("");
  const abort = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const busy = chat.turn !== null;

  const check = useCallback(async (b: Backend = backend) => {
    setChecking(true);
    setStatus(await runnerStatus(b.url, fetch, b.token));
    setChecking(false);
  }, [backend]);
  useEffect(() => {
    if (panel.open) void check();
  }, [panel.open, check]);
  useEffect(() => {
    if (panel.draft) setDraft(panel.draft);
  }, [panel.draft]);
  // the newest message in view
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [chat.blocks]);
  // Esc closes (a wide panel goes back to its width first)
  useEffect(() => {
    if (!panel.open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (wide ? setWide(false) : closeAgent());
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [panel.open, wide]);

  const onEvent = useCallback((e: AgentEvent) => update((c) => withEvent(c, e)), [update]);
  /** follow the running turn until it ends (after a reload, or when the connection dropped) */
  const following = useRef(false);
  const follow = useCallback(async () => {
    if (following.current) return; // one at a time
    following.current = true;
    try {
      for (let tries = 0; chatRef.current.turn && tries < 20; tries++) {
        const t = chatRef.current.turn;
        abort.current = new AbortController();
        try {
          await followTurn(backend.url, t.id, t.seen, onEvent, { token: backend.token, signal: abort.current.signal });
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
          update((c) => ({ ...c, blocks: [...c.blocks, { kind: "note", text: "lost" }], turn: null }));
          return;
        }
      }
    } finally {
      following.current = false;
    }
  }, [backend, onEvent, update]);
  // a turn that was running when the page was left: watch it again
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !chatRef.current.turn) return;
    resumed.current = true;
    void follow();
  }, [follow]);

  const send = async (text: string) => {
    const s = scoreOnScreen();
    if (!text.trim() || busy) return;
    const attach = panel.attach;
    const label = attachLabel(attach, pick) ?? undefined;
    update((c) => withMessage(c, text.trim(), label));
    setDraft("");
    clearAttach();
    if (!s) {
      update((c) => ({ ...c, blocks: [...c.blocks, { kind: "error", text: pick(["Open a score in Scores first: the agent works on the score on screen.", "請先在「樂譜」中開啟一份樂譜：代理會處理畫面上的樂譜。"]) }] }));
      return;
    }
    const context: AgentContext = { title: s.title, file: s.active, error: s.error, ...(attach ?? {}) };
    abort.current = new AbortController();
    try {
      await sendChat(
        backend.url,
        {
          agent: settings.agent,
          chat: chatRef.current.id,
          message: text.trim(),
          model: settings.model || null,
          provider: settings.provider,
          api_key: settings.agent === "claude-api" ? apiKey : undefined,
          files: s.files,
          context,
        },
        onEvent,
        { token: backend.token, signal: abort.current.signal },
      );
      if (chatRef.current.turn) await follow(); // the connection dropped before the end
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = (e as Error).message;
      const unreachable = /fetch|network|load failed/i.test(msg);
      update((c) => ({
        ...c,
        turn: null,
        blocks: [...c.blocks, { kind: "error", text: unreachable ? pick(["The runner isn't answering. Start it with `pixi run runner`, then try again.", "執行器沒有回應。請用 `pixi run runner` 啟動它，再試一次。"]) : msg }],
      }));
      if (unreachable) void check();
    }
  };
  const stop = () => chat.turn && void cancelTurn(backend.url, chat.turn.id, backend.token);
  const newChat = () => {
    abort.current?.abort();
    if (chat.turn) void cancelTurn(backend.url, chat.turn.id, backend.token);
    setChat((chatRef.current = fresh()));
  };
  const setBlock = (i: number, b: Block) => update((c) => ({ ...c, blocks: c.blocks.map((x, j) => (j === i ? b : x)) }));

  if (!panel.open) return null;
  const chip = attachLabel(panel.attach, pick);
  const noRunner = status === null && !checking;
  const ready = settings.agent !== "claude-api" || apiKey.trim().length > 0;
  return (
    <aside
      className={`fixed top-0 right-0 bottom-[var(--pz-dock,0px)] z-[65] flex w-full flex-col border-l border-gray-200 bg-white shadow-xl ${wide ? "sm:w-[min(56rem,100vw)]" : "sm:w-[26rem]"}`}
      aria-label={pick(["AI agent", "AI 代理"])}
      data-testid="agent-panel"
    >
      <header className="flex items-center gap-1 border-b border-gray-200 px-2 py-1.5">
        <Icon icon={Bot} className="ml-1 h-4 w-4 text-(--lk-accent)" />
        <div className="ml-1 min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900">{pick(["AI agent", "AI 代理"])}</h2>
          <p className="truncate text-[11px] text-gray-500">
            {pick(AGENT_NAME[settings.agent])}
            {score ? ` · ${score.title}` : ""}
          </p>
        </div>
        <button onClick={newChat} title={pick(["New chat", "新對話"])} aria-label={pick(["New chat", "新對話"])} className="rounded p-1.5 text-gray-600 hover:bg-gray-100" data-testid="agent-new">
          <Icon icon={Plus} />
        </button>
        <button onClick={() => setShowSettings((s) => !s)} title={pick(["Settings", "設定"])} aria-label={pick(["Settings", "設定"])} aria-pressed={showSettings} className={`rounded p-1.5 hover:bg-gray-100 ${showSettings ? "text-(--lk-accent)" : "text-gray-600"}`} data-testid="agent-settings-button">
          <Icon icon={Settings2} />
        </button>
        <button onClick={() => setWide((w) => !w)} title={pick(["Wider", "加寬"])} aria-label={pick(["Wider", "加寬"])} className="hidden rounded p-1.5 text-gray-600 hover:bg-gray-100 sm:block">
          <Icon icon={wide ? Minimize2 : Maximize2} />
        </button>
        <button onClick={closeAgent} title={pick(["Close", "關閉"])} aria-label={pick(["Close", "關閉"])} className="rounded p-1.5 text-gray-600 hover:bg-gray-100" data-testid="agent-close">
          <Icon icon={X} />
        </button>
      </header>

      {showSettings ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Settings
            settings={settings}
            onSettings={setSettings}
            backend={backend}
            onBackend={(b) => (setBackendState(b), saveBackend(b), void check(b))}
            status={status}
            apiKey={apiKey}
            onKey={(k) => (setApiKey(k), saveKey(k))}
          />
          <div className="border-t border-gray-100 p-3">
            <button onClick={() => setShowSettings(false)} className={PRIMARY}>
              {pick(["Done", "完成"])}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div ref={list} className="min-h-0 flex-1 overflow-y-auto px-3 py-2" data-testid="agent-chat">
            {noRunner && (
              <div className="my-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" data-testid="agent-no-runner">
                <p className="font-medium">{pick(["Start the runner on your computer", "在你的電腦上啟動執行器"])}</p>
                <p className="mt-1">
                  {pick(["The agent works through the Polyphonizer runner. In a copy of the repository:", "代理透過 Polyphonizer 執行器工作。在程式庫的副本中執行："])}
                </p>
                <pre className="mt-1.5 rounded bg-gray-900 px-2 py-1 font-mono text-xs text-gray-100">pixi run runner</pre>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <button onClick={() => void check()} className="inline-flex items-center gap-1 font-medium text-(--lk-accent) hover:underline">
                    <Icon icon={RefreshCw} className="h-3 w-3" /> {pick(["Check again", "再檢查一次"])}
                  </button>
                  <button onClick={() => go("agents", "runner")} className="font-medium text-(--lk-accent) hover:underline">
                    {pick(["How to set it up", "如何設定"])}
                  </button>
                </div>
              </div>
            )}
            {status && !status.agent && (
              <p className="my-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-950">
                {pick(["This runner is older than the AI agent: update your copy (git pull), then restart it.", "這個執行器比 AI 代理舊：請更新你的副本（git pull），再重新啟動。"])}
              </p>
            )}
            {!chat.blocks.length && (
              <div className="py-6 text-center text-sm text-gray-500">
                <p>{score ? pick([`Ask about “${score.title}”, or ask for a change.`, `問關於「${score.title}」的問題，或請它修改。`]) : pick(["Open a score in Scores, then ask about it.", "在「樂譜」中開啟一份樂譜，然後問它。"])}</p>
                {score && (
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {(
                      [
                        ["Explain how this score is built", "解釋這份樂譜是怎麼寫成的"],
                        ["Add dynamics and a tempo marking", "加上力度與速度記號"],
                        ["Why doesn't it run?", "為什麼它無法執行？"],
                      ] as L[]
                    ).map((s) => (
                      <button key={s[0]} onClick={() => setDraft(pick(s))} className="rounded-full border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:border-(--lk-accent)">
                        {pick(s)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {chat.blocks.map((b, i) => {
              if (b.kind === "user")
                return (
                  <div key={i} className="my-2 ml-8 rounded-lg bg-gray-100 px-3 py-2 text-sm whitespace-pre-wrap text-gray-900" data-testid="agent-user">
                    {b.context && <span className="mb-1 block text-[11px] font-medium text-gray-500">↳ {b.context}</span>}
                    {b.text}
                  </div>
                );
              if (b.kind === "text") return <Answer key={i} text={b.text} />;
              if (b.kind === "tool") return <ToolRow key={i} b={b} />;
              if (b.kind === "files") return <FilesCard key={i} b={b} onChange={(nb) => setBlock(i, nb)} />;
              if (b.kind === "question") return <Question key={i} b={b} busy={busy} onAnswer={(t) => void send(t)} />;
              if (b.kind === "error")
                return (
                  <p key={i} className="my-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" data-testid="agent-error">
                    <RichText text={b.text} />
                  </p>
                );
              const NOTES: Record<string, L> = {
                waiting: ["Waiting for a free agent slot…", "等待空出的代理位置…"],
                cancelled: ["Stopped.", "已停止。"],
                lost: ["The runner no longer has this answer (it was restarted?).", "執行器已沒有這個回答（它重新啟動了？）。"],
              };
              return (
                <p key={i} className="my-1.5 text-xs text-gray-500 italic">
                  {pick(NOTES[b.text])}
                </p>
              );
            })}
            {busy && (
              <p className="my-2 flex items-center gap-1.5 text-xs text-gray-500" data-testid="agent-busy">
                <span className="h-2 w-2 animate-pulse rounded-full bg-(--lk-accent)" /> {pick(["Working…", "處理中…"])}
              </p>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
            className="border-t border-gray-200 p-2"
          >
            {chip && (
              <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-900" data-testid="agent-attach">
                {chip}
                <button type="button" onClick={clearAttach} aria-label={pick(["Remove", "移除"])} className="text-rose-700 hover:text-rose-950">
                  <Icon icon={X} className="h-3 w-3" />
                </button>
              </span>
            )}
            <div className="flex items-end gap-1.5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send(draft);
                  }
                }}
                rows={Math.min(6, Math.max(2, draft.split("\n").length))}
                placeholder={ready ? pick(["Ask, or ask for a change… (Enter sends)", "提問，或請它修改…（Enter 送出）"]) : pick(["Enter your API key in Settings first", "請先在設定中輸入 API 金鑰"])}
                className="min-w-0 flex-1 resize-none rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-(--lk-accent) focus:outline-none"
                data-testid="agent-input"
              />
              {busy ? (
                <button type="button" onClick={stop} className={BUTTON} title={pick(["Stop", "停止"])} data-testid="agent-stop">
                  <Icon icon={Square} className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button type="submit" disabled={!draft.trim() || !ready} className={PRIMARY} title={pick(["Send", "送出"])} data-testid="agent-send">
                  <Icon icon={Send} className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {chat.cost && settings.agent === "claude-api" ? <p className="mt-1 text-right text-[10px] text-gray-400">{pick(["last answer", "上一個回答"])}: ${chat.cost.toFixed(3)}</p> : null}
          </form>
        </>
      )}
    </aside>
  );
}
