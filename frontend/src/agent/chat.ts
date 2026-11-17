/**
 * A chat with the agent as the panel draws it: a list of blocks built from the runner's events (no React here, so it
 * is tested with node --test). The current chat is kept in this browser, with the turn still running, so a reload
 * picks it up again (followTurn from the number of events already seen).
 */
import type { AgentEvent } from "./client.ts";

export type Block =
  | { kind: "user"; text: string; context?: string; pictures?: string[] }
  | { kind: "text"; text: string }
  | { kind: "tool"; id: string; name: string; input: Record<string, unknown>; ok?: boolean; result?: string }
  | { kind: "question"; question: string; options: string[]; multi: boolean; answered?: boolean }
  /** the files the agent changed: shown as a diff, applied (with the files as they were, for Undo) or discarded */
  | { kind: "files"; files: Record<string, string>; removed: string[]; state: "new" | "applied" | "discarded"; before?: Record<string, string | null> }
  | { kind: "error"; text: string }
  | { kind: "note"; text: "waiting" | "cancelled" | "lost" };

export interface Chat {
  id: string;
  blocks: Block[];
  /** the turn still answering, and how many of its events the panel has seen */
  turn: { id: string; seen: number } | null;
  /** what the last turn cost, when the agent says (an API key) */
  cost?: number | null;
}

/** one event into the chat (a new array; blocks that change are copied) */
export function withEvent(chat: Chat, e: AgentEvent): Chat {
  // an event already applied (the turn followed again after a reload or a dropped connection) changes nothing
  // (and one from a turn already over: a stale stream)
  if (e.type === "turn" ? chat.turn?.id === e.id : e.n !== undefined && (!chat.turn || e.n < chat.turn.seen)) return chat;
  const blocks = chat.blocks.slice();
  const last = blocks[blocks.length - 1];
  const turn = chat.turn ? { ...chat.turn, seen: e.n !== undefined ? e.n + 1 : chat.turn.seen + 1 } : null;
  const next = (b: Block[] = blocks, extra: Partial<Chat> = {}): Chat => ({ ...chat, blocks: b, turn, ...extra });
  switch (e.type) {
    case "turn":
      return { ...chat, turn: { id: e.id, seen: 1 } };
    case "text":
      if (last?.kind === "text") blocks[blocks.length - 1] = { ...last, text: last.text + e.delta };
      else blocks.push({ kind: "text", text: e.delta });
      return next();
    case "tool":
      blocks.push({ kind: "tool", id: e.id, name: e.name, input: e.input ?? {} });
      return next();
    case "tool_result": {
      let i = blocks.length - 1;
      while (i >= 0 && !(blocks[i].kind === "tool" && (blocks[i] as { id: string }).id === e.id)) i--;
      if (i >= 0) blocks[i] = { ...(blocks[i] as Extract<Block, { kind: "tool" }>), ok: e.ok, result: e.text };
      return next();
    }
    case "question":
      blocks.push({ kind: "question", question: e.question, options: e.options, multi: e.multi });
      return next();
    case "files":
      blocks.push({ kind: "files", files: e.files, removed: e.removed ?? [], state: "new" });
      return next();
    case "waiting":
      blocks.push({ kind: "note", text: "waiting" });
      return next();
    case "error":
      blocks.push({ kind: "error", text: e.message });
      return next(blocks, { turn: null });
    case "cancelled":
      blocks.push({ kind: "note", text: "cancelled" });
      return next(blocks, { turn: null });
    case "done":
      return next(blocks, { turn: null, cost: e.cost_usd ?? null });
    default:
      return next();
  }
}

/** the learner's message, before the turn's events */
export const withMessage = (chat: Chat, text: string, context?: string, pictures?: string[]): Chat => ({
  ...chat,
  // (an unanswered question is answered by this message)
  blocks: [...chat.blocks.map((b) => (b.kind === "question" && !b.answered ? { ...b, answered: true } : b)), { kind: "user", text, context, ...(pictures?.length ? { pictures } : {}) }],
  turn: null,
});

/** a short name for a tool row: Read main.py, Compile bars 2–3 … */
export function toolLabel(name: string, input: Record<string, unknown>): { verb: string; what: string } {
  const short = name.replace(/^mcp__polyphonizer__/, "");
  const file = String(input.file_path ?? input.path ?? "").split(/[\\/]/).pop() ?? "";
  if (short === "compile") {
    const from = input.from_bar as number | undefined;
    const to = (input.to_bar as number | undefined) ?? from;
    return { verb: "compile", what: from ? `${from}${to && to !== from ? `–${to}` : ""}` : "" };
  }
  if (short === "ask_user") return { verb: "ask", what: "" };
  return { verb: short.toLowerCase(), what: file || String(input.pattern ?? input.command ?? "") };
}

const KEY = "polyphonizer.agent.chat";
export function loadChat(): Chat | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? "null") as Chat | null;
    return c && typeof c.id === "string" && Array.isArray(c.blocks) ? c : null;
  } catch {
    return null;
  }
}
export function saveChat(c: Chat | null) {
  try {
    if (c && c.blocks.length) localStorage.setItem(KEY, JSON.stringify(c));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage full or unavailable: the chat lives on in the page */
  }
}
