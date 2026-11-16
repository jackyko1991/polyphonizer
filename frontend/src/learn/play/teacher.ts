/**
 * The AI teacher on Learn to ▸ Play: Claude, called straight from the learner's browser with the learner's own API
 * key (kept only in this browser; Polyphonizer has no server and pays nothing). It is told the lesson and the last
 * attempt note by note, and it can act on the page through two tools: play a passage on the keyboard (with
 * dynamics, so it can show what it means) and set the practice tempo or mode. It runs only when the learner asks.
 */
import type Anthropic from "@anthropic-ai/sdk";
import type { PlayLesson, PlayMode } from "./lessons.ts";
import type { Grade, TargetNote } from "./matcher.ts";

type MessageParam = Anthropic.Beta.Messages.BetaMessageParam;
type Tool = Anthropic.Beta.Messages.BetaTool;

export const MODEL = "claude-opus-5-5";
const KEY = "polyphonizer.ai.key";

export function savedKey(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
export function saveKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY, key);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const name = (midi: number) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

/** the lesson's beats per bar (from M: in its ABC; 4 if none) */
export function beatsPerBar(abc: string): number {
  const m = /^M:\s*(\d+)\/(\d+)/m.exec(abc);
  if (!m) return 4;
  const [n, d] = [Number(m[1]), Number(m[2])];
  return d === 8 && n % 3 === 0 ? n / 3 : n; // 6/8 counts in two
}

/** where a note falls, as "bar 2 beat 3" (beats from 1; halves as 1½) */
export function barBeat(timeMs: number, bpm: number, perBar: number): string {
  const beats = Math.round((timeMs / (60000 / bpm)) * 2) / 2;
  const bar = Math.floor(beats / perBar) + 1;
  const beat = (beats % perBar) + 1;
  return `bar ${bar} beat ${Number.isInteger(beat) ? beat : `${Math.floor(beat)}½`}`;
}

/** the notes of the lesson, numbered from 1, as the tools refer to them (a chord is one numbered step per note) */
export function noteList(target: TargetNote[], bpm: number, perBar: number): string {
  return target.map((t, i) => `${i + 1}. ${name(t.midi)} at ${barBeat(t.time, bpm, perBar)}`).join("\n");
}

/** the last attempt, note by note, for the teacher */
export function attemptReport(target: TargetNote[], grade: Grade, mode: PlayMode, bpm: number, perBar: number, tolerance: number): string {
  const byId = new Map(grade.results.map((r) => [r.id, r]));
  const lines = target.map((t, i) => {
    const r = byId.get(t.id);
    if (!r) return `${i + 1}. ${name(t.midi)} (${barBeat(t.time, bpm, perBar)}): not reached`;
    const off = r.offset !== undefined && mode === "time" ? ` (${r.offset > 0 ? "+" : ""}${Math.round(r.offset)} ms)` : "";
    return `${i + 1}. ${name(t.midi)} (${barBeat(t.time, bpm, perBar)}): ${r.mark}${off}`;
  });
  return [
    `Mode: ${mode === "wait" ? "Wait for me (the music waits for each right note; wrong keys are counted)" : `In time at ♩ = ${bpm} (on time = within ${tolerance} ms; early/late = within ${Math.round(tolerance * 2.5)} ms)`}`,
    `Score: ${grade.score}% (${grade.passed ? "passed" : "not passed yet"}; passing is 80% with nothing missed). Extra notes played: ${grade.extra}.`,
    "Note by note:",
    ...lines,
  ].join("\n");
}

/** the system prompt: who the teacher is and how it answers (the same for every lesson, so it caches) */
export function systemPrompt(zh: boolean): string {
  return [
    "You are the piano teacher in Polyphonizer's Learn to Play: short keyboard lessons played on a virtual keyboard (mouse, computer keys or a MIDI keyboard) and graded note by note.",
    "Your learners are beginners, often children or adults coming back to music. Be warm, specific and brief: at most about 120 words unless asked for more.",
    "When you comment on an attempt, name one or two things to fix first, by bar and beat or note number, say why they went wrong if the data shows it (e.g. always late after the jump to G, rushing the eighths), and give one concrete way to practise (slower tempo, Wait for me first, hands separately, count aloud). Praise what went well, honestly.",
    "Use the tools when they help: play_passage to demonstrate (with dynamics, to show phrasing), set_practice to set a practice tempo or mode for the learner's next try. Say what you are doing when you use them.",
    "Only use the attempt data you are given; never invent results. If there is no attempt yet, help the learner start.",
    zh
      ? "Reply in Traditional Chinese (as used in Hong Kong and Taiwan), using the note names C D E F G A B."
      : "Reply in English.",
  ].join("\n");
}

/** the lesson, for the start of a conversation */
export function lessonContext(lesson: PlayLesson, target: TargetNote[], bpm: number, pick: (l: readonly [string, string]) => string): string {
  const perBar = beatsPerBar(lesson.abc);
  const marked = Number(/Q:1\/4=(\d+)/.exec(lesson.abc)?.[1] ?? 96);
  return [
    `Lesson ${lesson.n}: ${pick(lesson.title)}`,
    `Task: ${pick(lesson.task)}`,
    `How: ${pick(lesson.how)}`,
    `Computer keys: ${lesson.keys}`,
    `The music (ABC, marked ♩ = ${marked}; the learner's tempo now ♩ = ${bpm}):`,
    lesson.abc,
    `The notes, numbered as the tools use them:`,
    noteList(target, bpm, perBar),
  ].join("\n");
}

export const TOOLS: Tool[] = [
  {
    name: "play_passage",
    description:
      "Play notes of this lesson on the learner's keyboard, so they can hear (and see the keys) how it should go. Notes are numbered as in the lesson's note list. Use dynamics to show phrasing or which notes to bring out.",
    input_schema: {
      type: "object",
      properties: {
        from_note: { type: "integer", minimum: 1, description: "first note number to play" },
        to_note: { type: "integer", minimum: 1, description: "last note number to play" },
        bpm: { type: "integer", minimum: 30, maximum: 200, description: "tempo in quarter notes per minute" },
        loudness: {
          type: "array",
          items: { type: "number", minimum: 0.1, maximum: 1 },
          description: "optional: loudness of each note played, 0.1 (very soft) to 1 (loud), one per note from from_note",
        },
      },
      required: ["from_note", "to_note", "bpm"],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
  {
    name: "set_practice",
    description: "Set the lesson's practice tempo and/or mode for the learner's next try (they still press Start themselves).",
    input_schema: {
      type: "object",
      properties: {
        bpm: { type: "integer", minimum: 30, maximum: 200, description: "practice tempo, quarter notes per minute" },
        mode: { type: "string", enum: ["wait", "time"], description: "wait = Wait for me; time = In time" },
      },
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
];

export interface PlayInput {
  from: number;
  to: number;
  bpm: number;
  loudness?: number[];
}
export interface PracticeInput {
  bpm?: number;
  mode?: PlayMode;
}

const int = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi ? v : null);

/** check a play_passage input (tool inputs are streamed, so they are validated here); a string = what is wrong */
export function checkPlay(input: unknown, notes: number): PlayInput | string {
  const o = (input ?? {}) as Record<string, unknown>;
  const from = int(o.from_note, 1, notes);
  const to = int(o.to_note, 1, notes);
  const bpm = int(o.bpm, 30, 200);
  if (from === null || to === null || to < from) return `from_note and to_note must be note numbers 1–${notes}, from ≤ to`;
  if (bpm === null) return "bpm must be a whole number 30–200";
  if (o.loudness !== undefined && (!Array.isArray(o.loudness) || o.loudness.some((x) => typeof x !== "number" || x < 0.1 || x > 1)))
    return "loudness must be numbers 0.1–1";
  return { from, to, bpm, loudness: o.loudness as number[] | undefined };
}
export function checkPractice(input: unknown): PracticeInput | string {
  const o = (input ?? {}) as Record<string, unknown>;
  const bpm = o.bpm === undefined ? undefined : int(o.bpm, 30, 200);
  if (bpm === null) return "bpm must be a whole number 30–200";
  if (o.mode !== undefined && o.mode !== "wait" && o.mode !== "time") return 'mode must be "wait" or "time"';
  if (bpm === undefined && o.mode === undefined) return "give bpm, mode or both";
  return { bpm, mode: o.mode as PlayMode | undefined };
}

export interface TeacherHooks {
  /** a reply's text as it streams in (each round after a tool call is a new reply) */
  onText: (round: number, text: string) => void;
  /** a tool ran: a line for the chat */
  onAction: (what: string) => void;
  play: (p: PlayInput) => Promise<string>;
  practice: (p: PracticeInput) => string;
  notes: number;
}

/**
 * One turn of the conversation: send `history` (ending with the learner's message), run the tools Claude calls,
 * and return the history with Claude's replies (whole content blocks, so thinking blocks travel back unchanged).
 */
export async function teacherTurn(apiKey: string, system: string, history: MessageParam[], hooks: TeacherHooks): Promise<MessageParam[]> {
  const { default: AnthropicClient } = await import("@anthropic-ai/sdk");
  // the key is the learner's own and stays in their browser; the call goes straight to the API
  const client = new AnthropicClient({ apiKey, dangerouslyAllowBrowser: true });
  let messages = history;
  for (let round = 0; round < 4; round++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      system,
      messages,
      tools: TOOLS,
      output_config: { effort: "low" }, // a short, friendly reply; deep thinking isn't needed
      cache_control: { type: "ephemeral" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // if a safety check declines, the API answers with a fallback model instead
    });
    let text = "";
    stream.on("text", (delta) => {
      text += delta;
      hooks.onText(round, text);
    });
    const reply = await stream.finalMessage();
    messages = [...messages, { role: "assistant", content: reply.content }];
    if (reply.stop_reason === "refusal") {
      hooks.onText(round, text || "(The teacher could not answer that.)");
      return messages;
    }
    if (reply.stop_reason === "max_tokens") return messages;
    const uses = reply.content.filter((b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === "tool_use");
    if (reply.stop_reason !== "tool_use" || !uses.length) return messages;
    const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
    for (const u of uses) {
      let out: string;
      let error = false;
      if (u.name === "play_passage") {
        const p = checkPlay(u.input, hooks.notes);
        if (typeof p === "string") [out, error] = [p, true];
        else {
          hooks.onAction(`▶ ${p.from}–${p.to} · ♩ = ${p.bpm}`);
          out = await hooks.play(p);
        }
      } else if (u.name === "set_practice") {
        const p = checkPractice(u.input);
        if (typeof p === "string") [out, error] = [p, true];
        else {
          out = hooks.practice(p);
          hooks.onAction(`⚙ ${out}`);
        }
      } else [out, error] = [`unknown tool ${u.name}`, true];
      results.push({ type: "tool_result", tool_use_id: u.id, content: out, is_error: error });
    }
    messages = [...messages, { role: "user", content: results }];
  }
  return messages;
}
