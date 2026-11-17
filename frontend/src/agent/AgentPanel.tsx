/**
 * The AI panel (docs/plans/local-agent.md): one for the whole site, opened from the Toolbox or "Ask AI about this bar",
 * in a window floating over the page as the keyboard's staff is (tools/floatingWindow.ts): dragged by its title bar,
 * resized from any edge or corner, ⤢ (or a double-click on the title bar) to fill the page; where it is and how big
 * are remembered. On a phone it fills the screen. The learner's own agent works on the score on screen through their runner (client.ts):
 * this computer's Claude Code or Codex (free: bring your own agent), their API key, or, with Pro, the agent included
 * with the Polyphonizer service. Its edits come back as a diff to apply (then Undo) or discard; nothing changes the
 * score by itself. The chat survives a reload: a turn still running is followed again.
 */
import { go, RichText, useLang } from "@learnkit/web";
import { Bot, Check, ChevronRight, Copy, ImagePlus, Plug, Maximize2, Minimize2, Plus, RefreshCw, Search, Send, Settings2, Square, Undo2, Wrench, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HANDLES, useFloatingWindow, type Box } from "../tools/floatingWindow.ts";
import { Badge, COMING_SOON, PRO } from "../Badge.tsx";
import { Icon } from "../Button.tsx";
import { backendOk, loadBackend, RUNNER_URL, runnerStatus, saveBackend, type Backend, type RunnerStatus } from "../transcribe/routes.ts";
import { BUTTON, FIELD, PRIMARY } from "../ui.ts";
import { applyFiles, attach as attachTo, clearAttach, closeAgent, detach, scoreOnScreen, usePanel, useScoreOnScreen, useSelection, type PanelState, type Selection } from "./bus.ts";
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
  ConnectionGone,
  connectionEvents,
  createConnection,
  loadConnection,
  mcpUrl,
  revokeConnection,
  saveConnection,
  syncConnection,
  type Connection,
  type ConnectorState,
} from "./client.ts";
import { counts, diffLines, hunks } from "./diff.ts";
import { MAX_PICTURES, picturesIn, readPicture, type Picture } from "./pictures.ts";

type L = readonly [string, string];
const fresh = (): Chat => ({ id: newChatId(), blocks: [], turn: null });
const WINDOW_KEY = "polyphonizer.agent.window";
/** on the right, under the site's header, above the dock when it is open */
function defaultBox(): Box {
  const w = Math.min(420, window.innerWidth - 32);
  const top = 64;
  const dockTop = document.querySelector('[data-testid="tool-dock"]')?.getBoundingClientRect().top ?? window.innerHeight;
  return { x: window.innerWidth - w - 16, y: top, w, h: Math.max(320, Math.min(dockTop, window.innerHeight) - top - 16) };
}

const AGENT_NAME: Record<AgentId, L> = {
  "claude-code": ["Claude Code on this computer", "這台電腦上的 Claude Code"],
  codex: ["Codex on this computer", "這台電腦上的 Codex"],
  "claude-api": ["Claude with your API key", "用你的 API 金鑰使用 Claude"],
  included: ["Included with Pro", "Pro 方案內含"],
};

/** what attached (or selected) bars or code say, one label each, for the chips and the message */
function selectionLabels(a: PanelState["attach"] | Selection, pick: (l: L) => string): { kind: keyof Selection; label: string }[] {
  const out: { kind: keyof Selection; label: string }[] = [];
  if (a?.bars) {
    const { from, to, part, parts } = a.bars;
    const bars = to && to !== from ? pick([`bars ${from}–${to}`, `第 ${from}–${to} 小節`]) : pick([`bar ${from}`, `第 ${from} 小節`]);
    const who = part ?? parts?.join(", ");
    out.push({ kind: "bars", label: who ? `${bars} · ${who}` : bars });
  }
  if (a?.code) {
    const { file, from, to } = a.code;
    out.push({ kind: "code", label: `${file}: ${from === to ? pick([`line ${from}`, `第 ${from} 行`]) : pick([`lines ${from}–${to}`, `第 ${from}–${to} 行`])}` });
  }
  return out;
}
const attachLabel = (a: PanelState["attach"], pick: (l: L) => string): string | null => selectionLabels(a, pick).map((x) => x.label).join(" · ") || null;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** the runner is there but from before the agent: what to do */
function OldRunner() {
  const { pick } = useLang();
  return (
    <p className="my-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-950" data-testid="agent-old-runner">
      <RichText
        text={pick([
          "This runner is running code from before the AI agent. Restart it (Ctrl+C in its terminal, then `pixi run runner`). If this still shows afterwards, update your copy first with `git pull`.",
          "這個執行器跑的是 AI 代理之前的程式碼。請重新啟動它（在它的終端機按 Ctrl+C，再執行 `pixi run runner`）。如果之後仍顯示這段話，請先用 `git pull` 更新你的副本。",
        ])}
      />
    </p>
  );
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
      // (an older runner has no such address: say what to do instead)
      setScanError(/no such path|HTTP 404/.test((e as Error).message) ? pick(["This runner is from before the AI agent: restart it.", "這個執行器比 AI 代理舊：請重新啟動它。"]) : (e as Error).message);
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
          {status && !status.agent && <OldRunner />}
          {local && (
            <button onClick={scan} disabled={scanning || !status?.agent} className="mt-1 ml-1.5 inline-flex items-center gap-1 text-xs font-medium text-(--lk-accent) hover:underline disabled:opacity-50" data-testid="agent-scan">
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

/** Settings ▸ your own agent outside the site (MCP): a token for this page, the URL to give the agent, how to add it */
function Connect({
  backend,
  connection,
  state,
  onConnection,
}: {
  backend: Backend;
  connection: Connection | null;
  state: Omit<ConnectorState, "events"> | null;
  onConnection: (c: Connection | null) => void;
}) {
  const { pick } = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const here = connection && connection.base === backend.url ? connection : null;
  const make = async () => {
    setBusy(true);
    setError("");
    try {
      onConnection(await createConnection(backend.url, backend.token || undefined, here?.token));
    } catch (e) {
      setError(/no such path|HTTP 404/.test((e as Error).message) ? pick(["This runner is too old for this: restart it.", "這個執行器太舊：請重新啟動它。"]) : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const copy = (text: string, what: string) => void navigator.clipboard?.writeText(text).then(() => (setCopied(what), window.setTimeout(() => setCopied(""), 1500)));
  const url = here ? mcpUrl(here) : "";
  const local = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])/.test(backend.url);
  const row = (label: string, cmd: string, id: string) => (
    <div className="mt-1.5">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="mt-0.5 flex items-start gap-1">
        <code className="min-w-0 flex-1 rounded bg-gray-900 px-2 py-1 font-mono text-[11px] break-all text-gray-100">{cmd}</code>
        <button type="button" onClick={() => copy(cmd, id)} title={pick(["Copy", "複製"])} aria-label={pick(["Copy", "複製"])} className="rounded p-1 text-gray-500 hover:bg-gray-100">
          {copied === id ? <Icon icon={Check} className="h-3.5 w-3.5 text-emerald-600" /> : <Icon icon={Copy} className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
  return (
    <section className="border-t border-gray-100 p-3 text-sm" data-testid="agent-connect">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">
        <Icon icon={Plug} className="h-3.5 w-3.5" /> {pick(["Your agent, outside the site (MCP)", "網站外你自己的代理（MCP）"])}
      </h3>
      <p className="mt-1 text-xs text-gray-500">
        {pick([
          "Work from your own terminal or app instead: Claude Code, Codex, Claude Desktop or any MCP client gets tools for the score on this page (read it, write a file, compile). Each change it writes appears here to apply or discard. Keep this panel open while it works.",
          "也可以從你自己的終端機或應用程式操作：Claude Code、Codex、Claude Desktop 或任何 MCP 用戶端，都能取得操作這頁樂譜的工具（讀取、寫入檔案、編譯）。它寫入的每個修改會出現在這裡，讓你套用或捨棄。它工作時請保持這個面板開著。",
        ])}
      </p>
      {!here ? (
        <button type="button" onClick={() => void make()} disabled={busy} className={`${BUTTON} mt-2`} data-testid="agent-connect-make">
          <Icon icon={Plug} /> {busy ? "…" : pick(["Make a connection", "建立連線"])}
        </button>
      ) : (
        <div className="mt-2">
          {row(pick(["The MCP address (it holds the key: keep it to yourself)", "MCP 位址（內含金鑰：請勿外流）"]), url, "url")}
          {row("Claude Code", `claude mcp add --transport http polyphonizer ${url}`, "claude")}
          {row("Codex", `codex mcp add polyphonizer --url ${url}`, "codex")}
          <p className="mt-1.5 text-xs text-gray-600">
            {local
              ? pick([
                  "Claude Desktop and claude.ai connect from the internet, so they need the runner on a server with an HTTPS address (Runner ▸ On a VPS); agents on this computer can use this one.",
                  "Claude Desktop 與 claude.ai 是從網際網路連線，需要放在有 HTTPS 位址的伺服器上的執行器（執行器 ▸ 在 VPS 上）；這台電腦上的代理可以用這個位址。",
                ])
              : pick(["Claude Desktop or claude.ai: Settings ▸ Connectors ▸ Add custom connector, with the address above.", "Claude Desktop 或 claude.ai：設定 ▸ 連接器 ▸ 新增自訂連接器，填入上面的位址。"])}
          </p>
          <p className="mt-2 text-xs" data-testid="agent-connect-state">
            {state?.client || state?.last_seen_s != null ? (
              <span className="text-emerald-700">
                ● {pick(["Connected", "已連線"])}
                {state.client ? `: ${state.client}` : ""}
                {state.last_seen_s != null ? ` · ${pick(["last request", "最近一次請求"])} ${state.last_seen_s < 60 ? `${state.last_seen_s} s` : `${Math.round(state.last_seen_s / 60)} min`} ${pick(["ago", "前"])}` : ""}
              </span>
            ) : (
              <span className="text-gray-500">○ {pick(["Waiting for an agent to connect…", "等待代理連線…"])}</span>
            )}
          </p>
          <div className="mt-2 flex gap-3 text-xs">
            <button type="button" onClick={() => void make()} className="font-medium text-(--lk-accent) hover:underline" title={pick(["The old address stops working", "舊位址會失效"])}>
              {pick(["New address", "換新位址"])}
            </button>
            <button type="button" onClick={() => (void revokeConnection(here, backend.token || undefined), onConnection(null))} className="font-medium text-gray-600 hover:underline" data-testid="agent-connect-off">
              {pick(["Disconnect", "中斷連線"])}
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </section>
  );
}

export default function AgentPanel() {
  const { pick } = useLang();
  const panel = usePanel();
  const selection = useSelection();
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
  // the window: on the right below the site's header by default, as tall as the page allows
  const win = useFloatingWindow(WINDOW_KEY, defaultBox, { w: 320, h: 260 });
  const [max, setMax] = useState(false);
  const [phone, setPhone] = useState(() => window.matchMedia("(max-width: 639px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setPhone(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const [draft, setDraft] = useState("");
  // an agent outside the site (MCP): the connection, what it says, and its work brought into the chat
  const [connection, setConnectionState] = useState<Connection | null>(loadConnection);
  const [connState, setConnState] = useState<Omit<ConnectorState, "events"> | null>(null);
  const setConnection = (c: Connection | null) => (setConnectionState(c), saveConnection(c), setConnState(null));
  const connRef = useRef(connection);
  connRef.current = connection;
  const live = panel.open && connection !== null && connection.base === backend.url && !!status?.agent;
  // the score on screen → the runner's copy (when it changes, a moment later)
  useEffect(() => {
    if (!live || !score || !connection) return;
    const t = window.setTimeout(
      () =>
        void syncConnection(connection, { title: score.title, files: score.files }, backend.token || undefined)
          .then(({ client, last_seen_s, has_score }) => setConnState({ client, last_seen_s, has_score }))
          .catch((e) => e instanceof ConnectionGone && setConnection(null)),
      600,
    );
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, score, connection?.token]);
  // what the agent did: every 2 s while the panel is open
  useEffect(() => {
    if (!live) return;
    const poll = async () => {
      const c = connRef.current;
      if (!c) return;
      try {
        const st = await connectionEvents(c, backend.token || undefined);
        setConnState({ client: st.client, last_seen_s: st.last_seen_s, has_score: st.has_score });
        if (!st.events.length) return;
        const blocks: Block[] = [];
        for (const e of st.events) {
          const who = st.client || "MCP";
          if (e.type === "files") blocks.push({ kind: "files", files: e.files, removed: e.removed ?? [], state: "new" });
          else if (e.type === "tool") blocks.push({ kind: "tool", id: `mcp-${e.seq}`, name: e.name, input: { ...e.input, via: who }, ok: e.ok });
          else if (e.type === "compiled") blocks.push({ kind: "tool", id: `mcp-${e.seq}`, name: "compile", input: { via: who }, ok: e.ok });
        }
        const seq = st.events[st.events.length - 1].seq;
        const next = { ...c, seq };
        setConnectionState(next);
        saveConnection(next);
        if (blocks.length) update((ch) => ({ ...ch, blocks: [...ch.blocks, ...blocks] }));
      } catch (e) {
        if (e instanceof ConnectionGone) setConnection(null);
      }
    };
    void poll();
    const t = window.setInterval(() => void poll(), 2000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, backend.url]);
  // pictures pasted (or chosen) for the next message
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [pictureError, setPictureError] = useState("");
  const pictureInput = useRef<HTMLInputElement>(null);
  const addPictures = async (files: File[]) => {
    setPictureError("");
    const room = MAX_PICTURES - pictures.length;
    if (files.length > room) setPictureError(pick([`At most ${MAX_PICTURES} pictures with a message.`, `每則訊息最多 ${MAX_PICTURES} 張圖片。`]));
    const read = (await Promise.all(files.slice(0, Math.max(0, room)).map((f) => readPicture(f).catch(() => null)))).filter((p): p is Picture => p !== null);
    if (read.length < Math.min(files.length, room)) setPictureError(pick(["PNG, JPEG, GIF or WebP pictures only.", "只接受 PNG、JPEG、GIF 或 WebP 圖片。"]));
    setPictures((p) => [...p, ...read].slice(0, MAX_PICTURES));
  };
  const abort = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const busy = chat.turn !== null;

  const check = useCallback(async (b: Backend = backend) => {
    setChecking(true);
    setStatus(await runnerStatus(b.url, fetch, b.token));
    setChecking(false);
  }, [backend]);
  useEffect(() => {
    if (!panel.open) return;
    void check();
    // while open, look again every few seconds: starting (or restarting) the runner is enough, and the light shows it
    const again = window.setInterval(() => void runnerStatus(backend.url, fetch, backend.token).then(setStatus), 5000);
    return () => window.clearInterval(again);
  }, [panel.open, check, backend]);
  useEffect(() => {
    if (panel.draft) setDraft(panel.draft);
  }, [panel.draft]);
  // the newest message in view
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [chat.blocks]);
  // Esc closes (a window filling the page goes back to its size first)
  useEffect(() => {
    if (!panel.open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (max ? setMax(false) : closeAgent());
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [panel.open, max]);

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
    const sent = pictures;
    update((c) => withMessage(c, text.trim(), label, sent.map((p) => p.thumb)));
    setPictures([]);
    setPictureError("");
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
          images: sent.length ? sent.map(({ name, type, data }) => ({ name, type, data })) : undefined,
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
  const chips = selectionLabels(panel.attach, pick);
  // what is selected in the editor and not attached yet: offered as "+ …"
  const offers = selectionLabels(selection, pick).filter((x) => !same(selection[x.kind], panel.attach?.[x.kind]));
  const noRunner = status === null && !checking;
  // the light in the title bar: green connected, amber an old runner, red nothing there, grey still looking
  const light =
    status?.agent ? { color: "bg-emerald-500", text: pick(["Connected to the runner", "已連上執行器"]) }
    : status ? { color: "bg-amber-500", text: pick(["The runner is from before the AI agent: restart it", "執行器比 AI 代理舊：請重新啟動"]) }
    : checking ? { color: "bg-gray-300", text: pick(["Looking for the runner…", "正在尋找執行器…"]) }
    : { color: "bg-red-500", text: pick(["Not connected: start the runner", "未連線：請啟動執行器"]) };
  const ready = settings.agent !== "claude-api" || apiKey.trim().length > 0;
  return createPortal(
    <aside
      className={`fixed z-[65] flex flex-col overflow-hidden bg-white shadow-2xl ${phone ? "inset-0" : max ? "inset-2 rounded-lg border border-gray-300" : "rounded-lg border border-gray-300"}`}
      style={phone || max ? undefined : { left: win.box.x, top: win.box.y, width: win.box.w, height: win.box.h }}
      role="dialog"
      aria-label={pick(["AI agent", "AI 代理"])}
      data-testid="agent-panel"
    >
      <header
        className={`flex shrink-0 touch-none items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5 select-none ${phone || max ? "" : "cursor-grab active:cursor-grabbing"}`}
        {...(phone || max ? {} : win.handle(null))}
        onDoubleClick={(e) => !phone && !(e.target as HTMLElement).closest("button") && setMax((m) => !m)}
        title={phone || max ? undefined : pick(["Drag to move; double-click to fill the page", "拖曳移動；按兩下填滿頁面"])}
        data-testid="agent-titlebar"
      >
        <Icon icon={Bot} className="ml-1 h-4 w-4 text-(--lk-accent)" />
        <div className="ml-1 min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            {pick(["AI agent", "AI 代理"])}
            <span className={`inline-block h-2 w-2 rounded-full ${light.color}`} title={light.text} role="status" aria-label={light.text} data-testid="agent-light" data-state={status?.agent ? "on" : status ? "old" : checking ? "checking" : "off"} />
          </h2>
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
        <button onClick={() => setMax((m) => !m)} title={max ? pick(["Back to its size", "回到原本大小"]) : pick(["Fill the page", "填滿頁面"])} aria-label={max ? pick(["Back to its size", "回到原本大小"]) : pick(["Fill the page", "填滿頁面"])} className="hidden rounded p-1.5 text-gray-600 hover:bg-gray-100 sm:block" data-testid="agent-max">
          <Icon icon={max ? Minimize2 : Maximize2} />
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
          {status?.agent && <Connect backend={backend} connection={connection} state={connState} onConnection={setConnection} />}
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
            {status && !status.agent && <OldRunner />}
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
                    {b.pictures && (
                      <span className="mb-1 flex flex-wrap gap-1">
                        {b.pictures.map((src, k) => (
                          <img key={k} src={src} alt="" className="h-12 rounded border border-gray-200 object-cover" />
                        ))}
                      </span>
                    )}
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
            {(chips.length > 0 || offers.length > 0) && (
              <div className="mb-1.5 flex flex-wrap gap-1">
                {chips.map((c) => (
                  <span key={c.kind} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-900" data-testid="agent-attach">
                    {c.label}
                    <button type="button" onClick={() => detach(c.kind)} aria-label={pick(["Remove", "移除"])} className="text-rose-700 hover:text-rose-950">
                      <Icon icon={X} className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {/* the editor's selection (lines of code, a clicked bar): one click adds it to the message */}
                {offers.map((o) => (
                  <button
                    key={o.kind}
                    type="button"
                    onClick={() => attachTo({ [o.kind]: selection[o.kind] })}
                    title={pick(["Add the selection to the message", "把選取的內容加到訊息"])}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:border-(--lk-accent) hover:text-rose-900"
                    data-testid={`agent-offer-${o.kind}`}
                  >
                    <Icon icon={Plus} className="h-3 w-3" /> {o.label}
                  </button>
                ))}
              </div>
            )}
            {pictures.length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1.5" data-testid="agent-pictures">
                {pictures.map((p, k) => (
                  <span key={k} className="relative">
                    <img src={p.thumb} alt={p.name} title={p.name} className="h-14 rounded border border-gray-300 object-cover" />
                    <button
                      type="button"
                      onClick={() => setPictures((ps) => ps.filter((_, j) => j !== k))}
                      aria-label={pick(["Remove", "移除"])}
                      className="absolute -top-1.5 -right-1.5 rounded-full bg-gray-700 p-0.5 text-white hover:bg-gray-900"
                    >
                      <Icon icon={X} className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {pictureError && <p className="mb-1 text-xs text-red-700">{pictureError}</p>}
            <div className="flex items-end gap-1.5">
              <button type="button" onClick={() => pictureInput.current?.click()} disabled={pictures.length >= MAX_PICTURES} title={pick(["Add a picture (or paste one)", "加入圖片（或直接貼上）"])} aria-label={pick(["Add a picture", "加入圖片"])} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40" data-testid="agent-picture">
                <Icon icon={ImagePlus} />
              </button>
              <input ref={pictureInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple hidden onChange={(e) => (void addPictures([...(e.target.files ?? [])]), (e.target.value = ""))} />
              <textarea
                onPaste={(e) => {
                  const files = picturesIn(e.clipboardData?.items);
                  if (!files.length) return; // text: pasted as usual
                  e.preventDefault();
                  void addPictures(files);
                }}
                onDrop={(e) => {
                  const files = picturesIn(e.dataTransfer?.items);
                  if (!files.length) return;
                  e.preventDefault();
                  void addPictures(files);
                }}
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
      {/* resize from any edge or corner */}
      {!phone &&
        !max &&
        HANDLES.map((h, i) => <div key={i} className={`absolute z-10 touch-none ${h.className} ${h.cursor}`} {...win.handle(h.edges)} aria-hidden data-testid={i === 5 ? "agent-resize" : undefined} />)}
    </aside>,
    document.body,
  );
}
