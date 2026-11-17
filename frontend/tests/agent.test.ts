import { test } from "node:test";
import assert from "node:assert/strict";
import { followTurn, readEvents, sendChat, type AgentEvent } from "../src/agent/client.ts";
import { toolLabel, withEvent, withMessage, type Chat } from "../src/agent/chat.ts";
import { counts, diffLines, hunks } from "../src/agent/diff.ts";

const stream = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const s of chunks) c.enqueue(new TextEncoder().encode(s));
      c.close();
    },
  });

test("NDJSON: events split across chunks, keep-alive blank lines and a last line without a newline", async () => {
  const got: AgentEvent[] = [];
  const n = await readEvents(stream('{"type":"turn","id":"t1"}\n{"type":"te', 'xt","delta":"Hi"}\n\n\n{"type":"done"}'), (e) => got.push(e));
  assert.equal(n, 3);
  assert.deepEqual(got, [{ type: "turn", id: "t1" }, { type: "text", delta: "Hi" }, { type: "done" }]);
});

test("a chat request goes to the runner with the token; a refusal's reason comes back; a turn is followed from N", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const ok = (async (url: string, init?: RequestInit) => (calls.push({ url, init }), new Response(stream('{"type":"done"}\n')))) as typeof fetch;
  const req = { agent: "codex" as const, chat: "chat-12345678", message: "hi", files: [{ name: "main.py", code: "score = 1" }] };
  await sendChat("http://127.0.0.1:8765/", req, () => {}, { token: "s3", f: ok });
  assert.equal(calls[0].url, "http://127.0.0.1:8765/api/agents/chat");
  assert.equal((calls[0].init!.headers as Record<string, string>).authorization, "Bearer s3");
  assert.deepEqual(JSON.parse(calls[0].init!.body as string), req);
  await followTurn("http://127.0.0.1:8765", "abc", 7, () => {}, { f: ok });
  assert.equal(calls[1].url, "http://127.0.0.1:8765/api/agents/turns/abc/events?from=7");
  const refuse = (async () => Response.json({ error: "enter your API key" }, { status: 400 })) as typeof fetch;
  await assert.rejects(sendChat("http://x", req, () => {}, { f: refuse }), /enter your API key/);
});

test("the chat as blocks: text joins, tool results find their tool, files wait to be applied, the end clears the turn", () => {
  let c: Chat = withMessage({ id: "c", blocks: [], turn: null }, "Make bar 2 start on A", "bar 2 (Violin)");
  const events: AgentEvent[] = [
    { type: "turn", id: "t1" },
    { type: "text", delta: "I'll " },
    { type: "text", delta: "change it." },
    { type: "tool", id: "x", name: "mcp__polyphonizer__compile", input: { from_bar: 2, to_bar: 3 } },
    { type: "compiled", ok: true },
    { type: "tool_result", id: "x", ok: true, text: "{}" },
    { type: "files", files: { "main.py": "score = 2" }, removed: [] },
    { type: "done", cost_usd: 0.01 },
  ];
  for (const e of events) {
    c = withEvent(c, e);
    if (e.type === "text") assert.equal(c.turn?.seen, events.indexOf(e) + 1);
  }
  assert.deepEqual(
    c.blocks.map((b) => b.kind),
    ["user", "text", "tool", "files"],
  );
  assert.equal((c.blocks[1] as { text: string }).text, "I'll change it.");
  assert.equal((c.blocks[2] as { ok?: boolean }).ok, true);
  assert.equal((c.blocks[3] as { state: string }).state, "new");
  assert.equal(c.turn, null);
  assert.equal(c.cost, 0.01);
  // a question is answered by the next message
  c = withEvent({ ...c, turn: { id: "t2", seen: 1 } }, { type: "question", question: "G or D?", options: ["G", "D"], multi: false });
  c = withMessage(c, "D");
  assert.equal((c.blocks.find((b) => b.kind === "question") as { answered?: boolean }).answered, true);
  // an error or Stop ends the turn too
  assert.equal(withEvent({ ...c, turn: { id: "t3", seen: 1 } }, { type: "cancelled" }).turn, null);
  assert.equal(withEvent({ ...c, turn: { id: "t3", seen: 1 } }, { type: "error", message: "x" }).blocks.at(-1)!.kind, "error");
});

test("tool rows are named simply", () => {
  assert.deepEqual(toolLabel("mcp__polyphonizer__compile", { from_bar: 2, to_bar: 3 }), { verb: "compile", what: "2–3" });
  assert.deepEqual(toolLabel("mcp__polyphonizer__compile", {}), { verb: "compile", what: "" });
  assert.deepEqual(toolLabel("Edit", { file_path: "/tmp/x/score/main.py" }), { verb: "edit", what: "main.py" });
});

test("a line diff, in hunks with context", () => {
  const before = "a\nb\nc\nd\ne\nf\ng\nh\n";
  const after = "a\nb\nC\nd\ne\nf\ng\nh\ni\n";
  const lines = diffLines(before, after);
  assert.deepEqual(counts(lines), { added: 2, removed: 1 });
  assert.deepEqual(
    lines.filter((l) => l.op !== " ").map((l) => l.op + l.text),
    ["-c", "+C", "+i"],
  );
  const h = hunks(lines, 1);
  assert.deepEqual(
    h.map((l) => (l ? l.op + l.text : "…")),
    [" b", "-c", "+C", " d", "…", " h", "+i"],
  );
  assert.deepEqual(diffLines("", "x\n").map((l) => l.op + l.text), ["+x"]); // a new file
  assert.deepEqual(counts(diffLines("same\n", "same\n")), { added: 0, removed: 0 });
});

test("a turn followed twice (a reload) applies each numbered event once", () => {
  const events: AgentEvent[] = [
    { type: "turn", id: "t", n: 0 },
    { type: "tool", id: "a", name: "Read", input: {}, n: 1 },
    { type: "text", delta: "Hi", n: 2 },
    { type: "done", n: 3 },
  ];
  let c: Chat = { id: "c", blocks: [], turn: null };
  c = withEvent(withEvent(c, events[0]), events[1]);
  // the page reloads and follows from 1 while an old stream still delivers from 0
  for (const e of [events[0], events[1], events[1], events[2], events[2], events[3]]) c = withEvent(c, e);
  assert.deepEqual(
    c.blocks.map((b) => b.kind),
    ["tool", "text"],
  );
  assert.equal(c.turn, null);
});
