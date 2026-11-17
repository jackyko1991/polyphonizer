/**
 * The AI agent's side of the runner (runner/agent/, docs/plans/local-agent.md): the same runner and address as
 * Transcribe ▸ My computer (transcribe/routes.ts). The site holds no AI and no key of its own: the learner's own agent
 * (Claude Code or Codex, logged in on their computer: free) or their own API key does the work, or, with Pro (coming),
 * the agent included with the Polyphonizer service.
 *
 *   POST /api/agents/scan                      → { agents: [{ id, label, installed, version, logged_in, … }] }
 *   POST /api/agents/chat   (ChatRequest)      → NDJSON events of one turn
 *   GET  /api/agents/turns/<id>/events?from=N  → the same turn from event N (after a reload)
 *   POST /api/agents/turns/<id>/cancel         → Stop
 */

export type AgentId = "claude-code" | "codex" | "claude-api" | "included";
export type Provider = "anthropic" | "openrouter";

/** what GET /status says about the agent (absent: an older runner without it) */
export interface AgentStatus {
  /** this computer's own agents are offered (a runner on the learner's own computer) */
  local: boolean;
  /** the agent included with Pro (the Polyphonizer service) */
  included: boolean;
  models: string[];
  openrouter: string[];
}

export interface FoundAgent {
  id: string;
  label: string;
  installed: boolean;
  version: string | null;
  logged_in: boolean | null;
  experimental: boolean;
  docs: string;
}

/** what is on the learner's screen, sent with each message */
export interface AgentContext {
  title?: string;
  file?: string;
  bars?: { part?: string; from: number; to?: number };
  code?: { file: string; from: number; to: number; text: string };
  error?: string;
  problem?: string;
}

export interface ChatRequest {
  agent: AgentId;
  chat: string;
  message: string;
  model?: string | null;
  provider?: Provider;
  api_key?: string;
  files: { name: string; code: string }[];
  context?: AgentContext;
}

export type AgentEvent = (
  | { type: "turn"; id: string }
  | { type: "text"; delta: string }
  | { type: "tool"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; id: string; ok: boolean; text: string }
  | { type: "compiled"; ok: boolean }
  | { type: "question"; question: string; options: string[]; multi: boolean }
  | { type: "files"; files: Record<string, string>; removed: string[] }
  | { type: "waiting" }
  | { type: "done"; cost_usd?: number | null }
  | { type: "error"; message: string }
  | { type: "cancelled" }
) & {
  /** its number in the turn's log (0 = the turn event) */
  n?: number;
};

/** the learner's choice of agent, remembered in this browser (the API key is not: see loadKey) */
export interface AgentSettings {
  agent: AgentId;
  model: string;
  provider: Provider;
}
const SETTINGS = "polyphonizer.agent";
const KEY = "polyphonizer.agent.key";
export const DEFAULT_SETTINGS: AgentSettings = { agent: "claude-code", model: "", provider: "anthropic" };

export function loadSettings(): AgentSettings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS) ?? "null") as Partial<AgentSettings> | null;
    const agent = (["claude-code", "codex", "claude-api", "included"] as const).find((a) => a === s?.agent) ?? DEFAULT_SETTINGS.agent;
    return { agent, model: typeof s?.model === "string" ? s.model : "", provider: s?.provider === "openrouter" ? "openrouter" : "anthropic" };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
export function saveSettings(s: AgentSettings) {
  try {
    localStorage.setItem(SETTINGS, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}
/** the API key lives only as long as this tab's session (sessionStorage), and goes only to the runner */
export function loadKey(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
export function saveKey(k: string) {
  try {
    if (k) sessionStorage.setItem(KEY, k);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

/** a new chat's id */
export const newChatId = () => `chat-${crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`}`;

const auth = (token?: string): Record<string, string> => (token ? { authorization: `Bearer ${token}` } : {});
const at = (base: string, path: string) => `${base.replace(/\/+$/, "")}${path}`;

async function failure(r: Response): Promise<Error> {
  const msg = await r
    .json()
    .then((j: { error?: string }) => j.error)
    .catch(() => "");
  return new Error(msg || `HTTP ${r.status}`);
}

/** read an NDJSON body, one event per line (blank lines keep the connection alive); returns how many were read */
export async function readEvents(body: ReadableStream<Uint8Array>, onEvent: (e: AgentEvent) => void): Promise<number> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let n = 0;
  const line = (l: string) => {
    if (!l.trim()) return;
    try {
      onEvent(JSON.parse(l) as AgentEvent);
      n++;
    } catch {
      /* not an event */
    }
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      line(buf.slice(0, i));
      buf = buf.slice(i + 1);
    }
  }
  line(buf + dec.decode());
  return n;
}

export async function scanAgents(base: string, token?: string, f: typeof fetch = fetch): Promise<FoundAgent[]> {
  const r = await f(at(base, "/api/agents/scan"), { method: "POST", headers: auth(token) });
  if (!r.ok) throw await failure(r);
  return ((await r.json()) as { agents: FoundAgent[] }).agents;
}

/** send a message; events arrive through onEvent until the turn ends (or the connection drops: then follow it) */
export async function sendChat(base: string, req: ChatRequest, onEvent: (e: AgentEvent) => void, opts: { token?: string; signal?: AbortSignal; f?: typeof fetch } = {}): Promise<number> {
  const r = await (opts.f ?? fetch)(at(base, "/api/agents/chat"), {
    method: "POST",
    headers: { "content-type": "application/json", ...auth(opts.token) },
    body: JSON.stringify(req),
    signal: opts.signal,
  });
  if (!r.ok || !r.body) throw await failure(r);
  return readEvents(r.body, onEvent);
}

/** watch a turn again from event `from` (after a reload, or a dropped connection) */
export async function followTurn(base: string, turn: string, from: number, onEvent: (e: AgentEvent) => void, opts: { token?: string; signal?: AbortSignal; f?: typeof fetch } = {}): Promise<number> {
  const r = await (opts.f ?? fetch)(at(base, `/api/agents/turns/${encodeURIComponent(turn)}/events?from=${from}`), { headers: auth(opts.token), signal: opts.signal });
  if (!r.ok || !r.body) throw await failure(r);
  return readEvents(r.body, onEvent);
}

export async function cancelTurn(base: string, turn: string, token?: string, f: typeof fetch = fetch): Promise<void> {
  await f(at(base, `/api/agents/turns/${encodeURIComponent(turn)}/cancel`), { method: "POST", headers: auth(token) }).catch(() => undefined);
}
