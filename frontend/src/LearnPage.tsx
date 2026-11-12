/** Learn (#/learn, #/learn/<problem>): the problems, and one problem with its rules, code and score. */
import { go, RichText, useLang } from "@learnkit/web";
import { useEffect, useRef, useState } from "react";
import CodePane from "./CodePane.tsx";
import { ErrorBox, PyStatus } from "./EditorPage.tsx";
import { check, type RuleResult } from "./engine/checker.ts";
import { runScore, type PyError } from "./engine/python.ts";
import type { ScoreData } from "./engine/types.ts";
import { PROBLEMS, type Problem } from "./problems.ts";
import ScoreView from "./ScoreView.tsx";
import { fill, ruleText } from "./strings.ts";

const codeKey = (id: string) => `polyphonizer.learn.${id}`;
const PASSED = "polyphonizer.learn.passed";
function passedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(PASSED) ?? "[]"));
  } catch {
    return new Set();
  }
}
function markPassed(id: string) {
  try {
    localStorage.setItem(PASSED, JSON.stringify([...passedSet(), id]));
  } catch {
    /* storage unavailable */
  }
}

export default function LearnPage({ id }: { id: string | null }) {
  const problem = PROBLEMS.find((p) => p.id === id);
  return problem ? <ProblemView key={problem.id} problem={problem} /> : <ProblemList />;
}

function ProblemList() {
  const { t, pick } = useLang();
  const done = passedSet();
  return (
    <div className="mx-auto max-w-4xl px-5 py-10" data-testid="learn-list">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{t("learn.title")}</h1>
      <p className="mt-3 text-gray-600">{t("learn.intro")}</p>
      <ol className="mt-8 grid gap-3 sm:grid-cols-2">
        {PROBLEMS.map((p) => (
          <li key={p.id}>
            <a
              href={`#/learn/${p.id}`}
              className="block h-full rounded-xl border border-gray-200 bg-white p-5 hover:border-(--lk-accent) hover:shadow-sm"
            >
              <span className="text-xs font-medium tracking-wide text-(--lk-accent) uppercase">
                {fill(t("learn.level"), { n: p.level })}
              </span>
              {done.has(p.id) && <span className="ml-2 text-sm font-semibold text-emerald-600">✓</span>}
              <h2 className="mt-1 font-semibold text-gray-900">{pick(p.title)}</h2>
              <p className="mt-1 line-clamp-3 text-sm text-gray-600">
                <RichText text={pick(p.task)} />
              </p>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ProblemView({ problem }: { problem: Problem }) {
  const { t, pick, index } = useLang();
  const [code, setCode] = useState(() => {
    try {
      return localStorage.getItem(codeKey(problem.id)) ?? problem.starter;
    } catch {
      return problem.starter;
    }
  });
  const [score, setScore] = useState<ScoreData | null>(null);
  const [results, setResults] = useState<RuleResult[] | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [error, setError] = useState<PyError | null>(null);
  const [running, setRunning] = useState(false);
  const codeRef = useRef(code);
  codeRef.current = code;

  useEffect(() => {
    try {
      localStorage.setItem(codeKey(problem.id), code);
    } catch {
      /* storage unavailable */
    }
  }, [code, problem.id]);

  const run = async () => {
    setRunning(true);
    try {
      const s = await runScore(codeRef.current);
      setScore(s);
      setError(null);
      const r = check(s, problem.rules);
      setResults(r.results);
      setPassed(r.passed);
      if (r.passed) markPassed(problem.id);
    } catch (e) {
      setError(e as PyError);
      setResults(null);
      setPassed(null);
    } finally {
      setRunning(false);
    }
  };
  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lang = index === 1 ? 1 : 0;
  const parts = score?.parts ?? [];
  return (
    <div className="grid lg:h-full lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]" data-testid="problem">
      <aside className="space-y-5 overflow-y-auto border-r border-gray-200 bg-white px-5 py-5">
        <button onClick={() => go("learn")} className="text-sm font-medium text-(--lk-accent) hover:underline">
          ← {t("learn.back")}
        </button>
        <div>
          <span className="text-xs font-medium tracking-wide text-(--lk-accent) uppercase">{fill(t("learn.level"), { n: problem.level })}</span>
          <h1 className="text-2xl font-semibold text-gray-900">{pick(problem.title)}</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            <RichText text={pick(problem.task)} />
          </p>
        </div>
        {passed !== null && (
          <p
            className={`rounded-md px-3 py-2 text-sm font-medium ${passed ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
            data-testid="verdict"
          >
            {passed ? `✓ ${t("learn.passed")}` : t("learn.failed")}
          </p>
        )}
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{t("learn.rules")}</h2>
          <ul className="mt-2 space-y-1.5 text-sm" data-testid="rules">
            {problem.rules.map((rule, i) => {
              const r = results?.[i];
              const advice = r?.severity === "advice";
              const mark = !r ? "○" : r.ok ? "✓" : advice ? "·" : "✗";
              const colour = !r ? "text-gray-400" : r.ok ? "text-emerald-600" : advice ? "text-gray-400" : "text-red-600";
              return (
                <li key={i} className="flex gap-2">
                  <span className={`w-4 shrink-0 text-center font-semibold ${colour}`}>{mark}</span>
                  <span className={r && !r.ok && !advice ? "text-red-800" : advice && !r?.ok ? "text-gray-500" : "text-gray-700"}>
                    {ruleText(rule, parts, lang)}
                    {r && !r.ok && r.bars.length > 0 && (
                      <span className="text-xs">
                        {" "}
                        ({t("learn.bars")} {r.bars.join(", ")})
                      </span>
                    )}
                    {r && !r.ok && r.detail && (
                      <span className="text-xs">
                        {" "}
                        ({t("learn.found")} {r.detail})
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{t("learn.why")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            <RichText text={pick(problem.why)} />
          </p>
        </div>
      </aside>
      <div className="grid min-h-0 lg:grid-rows-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="flex min-h-[16rem] flex-col border-b border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-3 py-2">
            <button
              onClick={() => void run()}
              disabled={running}
              className="rounded-md bg-(--lk-accent) px-3 py-1 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              data-testid="check"
              title="Ctrl/⌘+Enter"
            >
              ✓ {running ? t("running") : t("learn.check")}
            </button>
            <button
              onClick={() => setCode(problem.starter)}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              ↺ {t("learn.reset")}
            </button>
            <span className="ml-auto">
              <PyStatus />
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <CodePane value={code} onChange={setCode} onRun={() => void run()} errorAt={error?.line ?? null} />
          </div>
          <ErrorBox error={error} />
        </section>
        <section className="min-h-[20rem] lg:min-h-0">
          <ScoreView score={score} part={null} pagesView={false} />
        </section>
      </div>
    </div>
  );
}
