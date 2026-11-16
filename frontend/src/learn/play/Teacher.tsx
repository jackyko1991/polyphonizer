/**
 * The AI teacher's panel on a Learn to ▸ Play lesson (see teacher.ts): set up with the learner's own Claude API key
 * (kept only in this browser), then ask "How did I do?" after an attempt, or anything else. It runs only when asked.
 */
import { useLang } from "@learnkit/web";
import type Anthropic from "@anthropic-ai/sdk";
import { GraduationCap, KeyRound, Send, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../../Button.tsx";
import { FIELD } from "../../ui.ts";
import { savedKey, saveKey, systemPrompt, teacherTurn, type PlayInput, type PracticeInput } from "./teacher.ts";

type MessageParam = Anthropic.Beta.Messages.BetaMessageParam;
type Line = { who: "you" | "teacher" | "action"; text: string };

export interface TeacherProps {
  /** the lesson and its notes, for the start of the conversation */
  lessonText: () => string;
  /** the last attempt, note by note, and a number that changes with each attempt; null before the first */
  attempt: () => { report: string; n: number } | null;
  play: (p: PlayInput) => Promise<string>;
  practice: (p: PracticeInput) => string;
  notes: number;
}

export default function Teacher(props: TeacherProps) {
  const { pick, index: lang } = useLang();
  const [key, setKey] = useState(savedKey);
  const [draftKey, setDraftKey] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const history = useRef<MessageParam[]>([]);
  const toldAttempt = useRef(-1);
  const toldLesson = useRef(false);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    setError("");
    // what's new since the last message: the lesson (once), and the latest attempt if there is a new one
    const parts: string[] = [];
    if (!toldLesson.current) parts.push(props.lessonText());
    const a = props.attempt();
    if (a && a.n !== toldAttempt.current) parts.push(`The learner's latest attempt:\n${a.report}`);
    parts.push(`The learner asks: ${question}`);
    const before = history.current;
    const sent: MessageParam[] = [...before, { role: "user", content: parts.join("\n\n") }];
    setLines((l) => [...l, { who: "you", text: question }]);
    setInput("");
    setBusy(true);
    // each reply round is its own bubble; tool actions go between them
    const start = { index: -1, round: -1 };
    try {
      history.current = await teacherTurn(key, systemPrompt(lang === 1), sent, {
        notes: props.notes,
        onText: (round, text) =>
          setLines((l) => {
            if (round !== start.round) {
              start.round = round;
              start.index = l.length;
              return [...l, { who: "teacher", text }];
            }
            const next = [...l];
            next[start.index] = { who: "teacher", text };
            return next;
          }),
        onAction: (what) => setLines((l) => [...l, { who: "action", text: what }]),
        play: props.play,
        practice: props.practice,
      });
      toldLesson.current = true;
      if (a) toldAttempt.current = a.n;
    } catch (e) {
      history.current = before; // the question didn't get through: it can be asked again
      const { default: A } = await import("@anthropic-ai/sdk");
      setError(
        e instanceof A.AuthenticationError
          ? pick(["The API key was not accepted. Check it, or remove it and paste it again.", "API 金鑰無效。請檢查，或移除後重新貼上。"])
          : e instanceof A.RateLimitError
            ? pick(["Too many requests just now: wait a moment and ask again.", "請求太多：稍等一下再問。"])
            : e instanceof A.APIError
              ? `${pick(["The teacher could not answer", "老師無法回答"])} (${e.status ?? "network"}).`
              : pick(["The teacher could not be reached. Check the connection.", "無法連到老師。請檢查網路連線。"]),
      );
    } finally {
      setBusy(false);
    }
  };

  const attempt = props.attempt();

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4" data-testid="teacher">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <GraduationCap className="h-4 w-4 text-(--lk-accent)" aria-hidden />
        {pick(["AI teacher", "AI 老師"])}
        {key && (
          <button
            type="button"
            onClick={() => (saveKey(""), setKey(""), setLines([]), (history.current = []), (toldLesson.current = false))}
            className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            title={pick(["Forget the API key on this browser", "在這個瀏覽器上刪除 API 金鑰"])}
            data-testid="teacher-forget"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {pick(["Remove key", "移除金鑰"])}
          </button>
        )}
      </h2>

      {!key ? (
        <div className="mt-2 space-y-2 text-sm text-gray-700" data-testid="teacher-setup">
          <p>
            {pick([
              "Claude can look at each attempt with you: what to fix first, why it went wrong, how to practise, and it can play passages to show you. It uses your own Claude API key, so you pay Anthropic for what you use (a question costs about a cent or two); Polyphonizer has no server and never sees the key.",
              "Claude 可以和你一起看每次的彈奏：先改甚麼、為甚麼錯、怎樣練，還可以彈一段示範給你聽。它使用你自己的 Claude API 金鑰，費用由你直接付給 Anthropic（每個問題約一兩美分）；Polyphonizer 沒有伺服器，也不會看到金鑰。",
            ])}
          </p>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const k = draftKey.trim();
              if (!k) return;
              saveKey(k);
              setKey(k);
              setDraftKey("");
            }}
          >
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder="sk-ant-…"
              className={`${FIELD} min-w-0 flex-1 font-mono`}
              aria-label={pick(["Your Claude API key", "你的 Claude API 金鑰"])}
              data-testid="teacher-key"
            />
            <Button icon={KeyRound} type="submit" disabled={!draftKey.trim()}>
              {pick(["Use this key", "使用這個金鑰"])}
            </Button>
          </form>
          <p className="text-xs text-gray-500">
            {pick([
              "The key is kept only in this browser (remove it any time) and is sent only to Anthropic's API. Get one at console.anthropic.com; on a shared computer, remove it when you are done.",
              "金鑰只保存在這個瀏覽器（隨時可以移除），也只會傳給 Anthropic 的 API。可在 console.anthropic.com 取得；在共用電腦上，用完請移除。",
            ])}
          </p>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {lines.length > 0 && (
            <ol className="max-h-80 space-y-2 overflow-y-auto pr-1" aria-live="polite" data-testid="teacher-lines">
              {lines.map((l, i) => (
                <li
                  key={i}
                  className={
                    l.who === "you"
                      ? "ml-8 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-800"
                      : l.who === "action"
                        ? "text-xs text-(--lk-accent)"
                        : "mr-8 rounded-lg bg-rose-50 px-3 py-2 text-sm whitespace-pre-wrap text-gray-900"
                  }
                >
                  {l.text}
                </li>
              ))}
            </ol>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void ask(pick(["How did I do? What should I fix first?", "我彈得怎樣？應該先改甚麼？"]))} disabled={busy || !attempt} data-testid="teacher-how">
              {pick(["How did I do?", "我彈得怎樣？"])}
            </Button>
            <Button onClick={() => void ask(pick(["How should I practise this piece?", "這首應該怎樣練？"]))} disabled={busy}>
              {pick(["How to practise?", "怎樣練？"])}
            </Button>
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={busy ? pick(["The teacher is answering…", "老師正在回答……"]) : pick(["Ask the teacher…", "問老師……"])}
              disabled={busy}
              className={`${FIELD} min-w-0 flex-1`}
              aria-label={pick(["Your question", "你的問題"])}
              data-testid="teacher-input"
            />
            <Button icon={Send} type="submit" disabled={busy || !input.trim()} aria-label={pick(["Ask", "發問"])} />
          </form>
        </div>
      )}
    </section>
  );
}
