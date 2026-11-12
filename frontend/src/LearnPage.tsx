/**
 * Learn to ▾ Code (#/learn/code/<problem>; #/learn and #/learn/<problem> still work) and Play (#/learn/play, a
 * placeholder until the keyboard lessons). Code is in Formalizer's and Tensorizer's Problems layout. Wide screens
 * (≥ xl), three columns at full height:
 *   1. the library (foldable): search, then each topic folds open to its items grouped by level; Track 0, the
 *      syntax lessons, comes first;
 *   2. the lesson or problem: title, chips (and "uses: lesson N" links back), the verdict; tabs below:
 *      a lesson has Lesson (explanation, code beside notes, then the task) / Syntax / Rules;
 *      a problem has Task (with the rules, i.e. the test) / Why / Syntax;
 *   3. the code (Check runs it and grades it; it also redraws itself shortly after typing stops) above the score.
 * Lesson code has `___` blanks: they are highlighted, and a blank stops the run with "Fill the blank on line N".
 * For single-part code, a note clicked in the score selects its token in the code and the cursor in a tiny("…")
 * string lights up its note. Ctrl/⌘+S saves and checks. Nothing is locked. Phones show one part at a time.
 */
import { plainText, RichText, useLang } from "@learnkit/web";
import type { EditorView } from "@codemirror/view";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import CodePane from "./CodePane.tsx";
import { ErrorBox, PyStatus } from "./EditorPage.tsx";
import { check, type RuleResult } from "./engine/checker.ts";
import { setPractice } from "./engine/player.ts";
import { runScore, type PyError } from "./engine/python.ts";
import type { ScoreData } from "./engine/types.ts";
import { blankIssues, blankMessage } from "./learn/blanks.ts";
import { LESSON_BODY, SyntaxSheet, TARGETS } from "./learn/lessons.tsx";
import { LEVEL_STYLE } from "./learn/levels.ts";
import { TECH_BODY, TECH_TARGETS } from "./learn/techniqueLessons.tsx";
import { ruleLabel } from "./learn/ruleText.ts";
import { noteTokens, tinyTokens } from "./learn/tokens.ts";
import { goCode, parseLearn } from "./learn/route.ts";

const PlayPage = lazy(() => import("./learn/play/PlayPage.tsx"));
import { fillIn, UI } from "./learn/ui.ts";
import { CATEGORIES, LEVELS, PROBLEMS, type Problem } from "./problems.ts";
import ScoreView from "./ScoreView.tsx";
import { fill } from "./strings.ts";
import { ArrowRight, ChevronRight, ChevronsLeft, ChevronsRight, CircleCheck, Repeat, RotateCcw, Search, X } from "lucide-react";
import { Button, Icon, IconButton } from "./Button.tsx";
import { CHECK, FIELD } from "./ui.ts";

const codeKey = (id: string) => `polyphonizer.learn.${id}`;
const PASSED = "polyphonizer.learn.passed";
function passedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(PASSED) ?? "[]"));
  } catch {
    return new Set();
  }
}
function savePassed(ids: Set<string>) {
  try {
    localStorage.setItem(PASSED, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable */
  }
}

/** pause after the last keystroke before the score is redrawn and checked */
const AUTO_RUN_MS = 500;
const PANEL_HEAD = "flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-1.5";
const MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const SAVE_KEY = MAC ? "⌘S" : "Ctrl+S";
const ENTER_KEY = MAC ? "⌘↩" : "Ctrl+Enter";

type MobileTab = "problem" | "code" | "score";
const MOBILE_TABS: MobileTab[] = ["problem", "code", "score"];

/** "1 · A note" for a lesson, the title for a problem */
function useTitle() {
  const { pick } = useLang();
  return (p: Problem) => (p.lesson ? `${p.lesson} · ${pick(p.title)}` : pick(p.title));
}

export default function LearnPage({ tab, section }: { tab: string | null; section: string | null }) {
  const route = parseLearn(tab, section);
  // an address from before the split (#/learn/<problem>): show it as #/learn/code/<problem>
  useEffect(() => {
    if (route.redirect) window.location.replace(route.redirect);
  }, [route.redirect]);
  return route.tab === "play" ? (
    <Suspense fallback={<p className="p-10 text-center text-sm text-gray-500">…</p>}>
      <PlayPage id={route.id} />
    </Suspense>
  ) : (
    <CodePage id={route.id} />
  );
}

function CodePage({ id }: { id: string | null }) {
  const { t, pick } = useLang();
  const title = useTitle();
  const problem = PROBLEMS.find((p) => p.id === id) ?? PROBLEMS[0];
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [passed, setPassed] = useState(passedSet);
  const select = (next: string) => goCode(next);
  const onPassed = (pid: string) =>
    setPassed((s) => {
      if (s.has(pid)) return s;
      const next = new Set(s).add(pid);
      savePassed(next);
      return next;
    });
  return (
    <div className="flex flex-col bg-white xl:h-full xl:min-h-0 xl:flex-row" data-testid="learn">
      {/* phones and tablets: a menu instead of the list column */}
      <div className="border-b border-gray-200 p-3 xl:hidden">
        <select
          value={problem.id}
          onChange={(e) => select(e.target.value)}
          aria-label={t("library")}
          data-testid="problem-menu"
          className={`${FIELD} w-full`}
        >
          {CATEGORIES.filter((c) => PROBLEMS.some((p) => p.category === c.id)).map((c) => (
            <optgroup key={c.id} label={pick(c.title)}>
              {PROBLEMS.filter((p) => p.category === c.id).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lesson ? title(p) : `${p.level} · ${pick(p.title)}`}
                  {passed.has(p.id) ? " ✓" : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* 1. The library */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] xl:flex ${libraryOpen ? "w-64" : "w-10"}`}
      >
        <div className="flex h-9 shrink-0 items-center gap-1 border-b border-gray-200 bg-gray-50 px-1.5">
          {libraryOpen && (
            <span className="flex-1 rounded-md bg-(--lk-accent) px-2 py-1 text-center text-xs font-medium text-white shadow-sm">
              {t("library")}
            </span>
          )}
          <IconButton
            onClick={() => setLibraryOpen((o) => !o)}
            icon={libraryOpen ? ChevronsLeft : ChevronsRight}
            label={t(libraryOpen ? "library.fold" : "library.open")}
            className="h-7 w-7"
          />
        </div>
        {libraryOpen ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <ProblemLibrary selected={problem.id} passed={passed} onSelect={select} />
          </div>
        ) : (
          <button
            onClick={() => setLibraryOpen(true)}
            className="flex-1 py-3 text-xs font-medium tracking-wide text-gray-500 [writing-mode:vertical-rl] hover:text-gray-800"
          >
            {t("library")}
          </button>
        )}
      </aside>

      <ProblemView key={problem.id} problem={problem} done={passed.has(problem.id)} onPassed={onPassed} />
    </div>
  );
}

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function ProblemLibrary({ selected, passed, onSelect }: { selected: string; passed: Set<string>; onSelect: (id: string) => void }) {
  const { t, pick } = useLang();
  const title = useTitle();
  const selectedCategory = PROBLEMS.find((p) => p.id === selected)?.category;
  const [open, setOpen] = useState<Set<string>>(() => new Set(CATEGORIES.map((c) => c.id)));
  useEffect(() => {
    if (selectedCategory) setOpen((s) => (s.has(selectedCategory) ? s : new Set(s).add(selectedCategory)));
  }, [selectedCategory]);

  // search: titles and tasks in both languages and the slug; case and accents ignored. "/" focuses the box.
  const [query, setQuery] = useState("");
  const box = useRef<HTMLInputElement>(null);
  const index = useMemo(
    () => PROBLEMS.map((p) => ({ p, text: fold([...p.title, ...p.task, p.id.replace(/-/g, " ")].join(" ")) })),
    [],
  );
  const words = fold(query).split(/\s+/).filter(Boolean);
  const hits = words.length ? index.filter((e) => words.every((w) => e.text.includes(w))).map((e) => e.p) : [];
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest("input, textarea, select, [contenteditable=true], .cm-editor");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        box.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const item = (p: Problem, dot = false) => (
    <li key={p.id}>
      <button
        onClick={() => onSelect(p.id)}
        title={plainText(pick(p.title))}
        aria-current={selected === p.id ? "page" : undefined}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition ${
          selected === p.id ? "bg-rose-50 font-medium text-(--lk-accent)" : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${LEVEL_STYLE[p.level].dot}`} />}
        <span className="min-w-0 flex-1">{title(p)}</span>
        {passed.has(p.id) && <span className="shrink-0 text-xs font-semibold text-emerald-600">✓</span>}
      </button>
    </li>
  );

  return (
    <nav className="space-y-1" data-testid="problem-library">
      {/* stays put while the list scrolls under it */}
      <div className="sticky -top-3 z-10 -mx-3 -mt-3 mb-2 bg-white px-3 pt-3 pb-1">
        <div className="relative">
          <input
            ref={box}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            data-testid="problem-search"
            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pr-7 pl-7 text-sm placeholder:text-gray-400 focus:border-(--lk-accent) focus:outline-none"
          />
          <span className="pointer-events-none absolute top-2 left-2 text-gray-400">
            <Icon icon={Search} />
          </span>
          {query ? (
            <button
              onClick={() => setQuery("")}
              aria-label={t("search.clear")}
              title={t("search.clear")}
              className="absolute top-1.5 right-1.5 rounded p-0.5 text-gray-400 hover:text-gray-700"
            >
              <Icon icon={X} />
            </button>
          ) : (
            <kbd className="absolute top-1.5 right-2 rounded border border-gray-200 px-1 text-[10px] text-gray-400">/</kbd>
          )}
        </div>
      </div>

      {words.length > 0 ? (
        <div data-testid="search-results">
          <p className="px-2 pb-1 text-[11px] text-gray-500">{fill(t("search.count"), { n: hits.length })}</p>
          {hits.length === 0 && <p className="px-2 py-2 text-sm text-gray-400">{t("search.none")}</p>}
          <ul>{hits.map((p) => item(p, true))}</ul>
        </div>
      ) : (
        CATEGORIES.map((cat) => {
          const isOpen = open.has(cat.id);
          const problems = PROBLEMS.filter((p) => p.category === cat.id);
          return (
            <div key={cat.id} data-testid={`category-${cat.id}`}>
              <button
                onClick={() => toggle(cat.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm font-semibold text-gray-800 hover:bg-gray-100"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="text-(--lk-accent)">
                    {cat.icon}
                  </span>
                  {pick(cat.title)}
                </span>
                <span className="flex items-center gap-2 text-xs font-normal text-gray-400">
                  {problems.length || "—"}
                  <Icon icon={ChevronRight} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </span>
              </button>
              {isOpen && (
                <div className="mb-2 ml-2 space-y-2 border-l border-gray-200 pl-2">
                  {LEVELS.map((level) => {
                    const inLevel = problems.filter((p) => p.level === level);
                    if (!inLevel.length) return null;
                    const style = LEVEL_STYLE[level];
                    return (
                      <div key={level} data-testid={`level-${level}`}>
                        <h3 className={`flex items-center gap-1.5 px-2 pt-1 pb-0.5 text-[11px] font-semibold tracking-wide uppercase ${style.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          {level} · {t(`level.${level}`)}
                        </h3>
                        <ul>{inLevel.map((p) => item(p))}</ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </nav>
  );
}

/** the score's notes of part 0 as drawn: the element for the k-th note or rest (single staff only) */
function noteElement(root: HTMLElement, score: ScoreData, k: number): Element | null {
  const notes = score.notes.filter((n) => n.part === 0);
  const n = notes[k];
  if (!n) return null;
  const mIndex = score.measures.findIndex((m) => m.n === n.measure);
  const bar = score.measures[mIndex];
  const measure = root.querySelectorAll("g.measure")[mIndex];
  const layer = measure?.querySelector("g.staff g.layer");
  if (!bar || !layer) return null;
  const events = [...layer.querySelectorAll("g.note, g.rest, g.chord, g.mRest")].filter((x) => !(x.matches("g.note") && x.closest("g.chord")));
  const before = notes.filter((x) => x.offset < bar.offset - 1e-9).length;
  return events[k - before] ?? null;
}

function ProblemView({ problem, done, onPassed }: { problem: Problem; done: boolean; onPassed: (id: string) => void }) {
  const { t, pick, index } = useLang();
  const title = useTitle();
  const isLesson = !!problem.lesson;
  const [code, setCode] = useState(() => {
    try {
      return localStorage.getItem(codeKey(problem.id)) ?? problem.starter;
    } catch {
      return problem.starter;
    }
  });
  /** the score and the code that made it (token positions are only valid for that code) */
  const [score, setScore] = useState<{ data: ScoreData; code: string } | null>(null);
  const [results, setResults] = useState<RuleResult[] | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [error, setError] = useState<PyError | null>(null);
  const [running, setRunning] = useState(false);
  type Tab = "lesson" | "syntax" | "rules" | "task" | "why";
  const [lowerTab, setLowerTab] = useState<Tab>(isLesson ? "lesson" : "task");
  const [mobileTab, setMobileTab] = useState<MobileTab>("problem");
  const [saved, setSaved] = useState(false);
  const onPhone = (tab: MobileTab, display = "xl:flex") => (mobileTab === tab ? "" : `hidden ${display}`);
  const codeRef = useRef(code);
  codeRef.current = code;
  const lang = index === 1 ? 1 : 0;

  useEffect(() => {
    try {
      localStorage.setItem(codeKey(problem.id), code);
    } catch {
      /* storage unavailable */
    }
  }, [code, problem.id]);

  // each run gets a number; only the latest one's answer is shown (typing starts runs faster than they finish)
  const runId = useRef(0);
  const run = async (show = false) => {
    const id = ++runId.current;
    const source = codeRef.current;
    // a blank left in a lesson: say where, instead of a Python or tinyNotation error
    const gap = blankIssues(source)[0];
    if (gap) {
      setError({ message: blankMessage(gap.line)[lang], line: gap.line });
      setResults(null);
      setPassed(null);
      setRunning(false);
      if (show) setMobileTab((tab) => (tab === "code" ? "problem" : tab));
      return;
    }
    setRunning(true);
    try {
      const s = await runScore(source);
      if (id !== runId.current) return;
      setScore({ data: s, code: source });
      setError(null);
      const r = check(s, problem.rules);
      setResults(r.results);
      setPassed(r.passed);
      if (r.passed) onPassed(problem.id);
    } catch (e) {
      if (id !== runId.current) return;
      setError(e as PyError);
      setResults(null);
      setPassed(null);
    } finally {
      if (id === runId.current) setRunning(false);
    }
    // on a phone, a Check from the code tab shows the verdict
    if (show) setMobileTab((tab) => (tab === "code" ? "problem" : tab));
  };
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    void runRef.current();
  }, []);
  // the score follows the code: run again shortly after typing stops (Check, ⌘/Ctrl+S or ⌘/Ctrl+Enter run at once)
  const firstCode = useRef(code);
  useEffect(() => {
    if (code === firstCode.current) return;
    firstCode.current = "";
    const timer = window.setTimeout(() => void runRef.current(), AUTO_RUN_MS);
    return () => clearTimeout(timer);
  }, [code]);

  // Ctrl/⌘+S anywhere on the page: save (the code is saved as it changes; this writes it at once), then check
  const savedTimer = useRef(0);
  const save = () => {
    try {
      localStorage.setItem(codeKey(problem.id), codeRef.current);
    } catch {
      /* storage unavailable */
    }
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 1500);
    void runRef.current(true);
  };
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !(e.metaKey || e.ctrlKey) || e.altKey || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      saveRef.current();
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      clearTimeout(savedTimer.current);
    };
  }, []);

  // practice aid for the score's Play: one bar on a loop (no metronome in Learn to Code; it lives in the Toolbox)
  const [loopBar, setLoopBar] = useState<number | null>(null);
  const data = score?.data ?? null;
  useEffect(() => {
    if (!data) return setPractice(null);
    const bar = loopBar !== null ? data.measures.find((m) => m.n === loopBar) : undefined;
    const next = data.measures.find((m) => bar && m.offset > bar.offset);
    const sounding = data.notes.filter((n) => n.midi.length);
    setPractice({
      click: false,
      measures: data.measures,
      time: data.time,
      endQ: Math.max(0, ...sounding.map((n) => n.offset + n.dur)),
      loop: bar ? { from: bar.offset, to: next ? next.offset : bar.offset + bar.length } : null,
      parts: data.parts,
      notes: data.notes,
      pedals: data.pedals,
    });
  }, [data, loopBar]);
  useEffect(() => () => setPractice(null), []);

  // code ↔ score, for single-part code with one tiny("…") string
  const view = useRef<EditorView | null>(null);
  const scoreBox = useRef<HTMLDivElement>(null);
  const link = useMemo(() => {
    if (!score || score.code !== code || score.data.parts.length !== 1) return null;
    const tokens = tinyTokens(code);
    if (!tokens) return null;
    return { tokens, toToken: noteTokens(tokens, score.data.notes) };
  }, [score, code]);
  const [selected, setSelected] = useState<number | null>(null); // token index
  const mark = link && selected !== null && link.tokens[selected] ? { from: link.tokens[selected].from, to: link.tokens[selected].to } : null;
  const onCursor = (pos: number) => {
    if (!link) return setSelected(null);
    const i = link.tokens.findIndex((tk) => tk.from <= pos && pos <= tk.to);
    setSelected(i >= 0 ? i : null);
  };
  const onNoteClick = (n: { partIndex: number; index: number }) => {
    if (!link || n.partIndex !== 0) return;
    const i = link.toToken[n.index];
    if (i === undefined || i < 0) return;
    const tk = link.tokens[i];
    setSelected(i);
    view.current?.dispatch({ selection: { anchor: tk.from, head: tk.to }, scrollIntoView: true });
  };
  // light up the selected token's note; the score is redrawn now and then, so do it again when it is
  useEffect(() => {
    const root = scoreBox.current;
    if (!root) return;
    const k = link && selected !== null ? link.toToken.indexOf(selected) : -1;
    const paint = () => {
      root.querySelectorAll(".pz-code-note").forEach((el) => el.classList.remove("pz-code-note"));
      if (k >= 0 && score) noteElement(root, score.data, k)?.classList.add("pz-code-note");
    };
    paint();
    const mo = new MutationObserver((changes) => {
      if (changes.some((c) => [...c.addedNodes].some((x) => x instanceof Element && (x.matches("svg") || x.querySelector("svg"))))) paint();
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      root.querySelectorAll(".pz-code-note").forEach((el) => el.classList.remove("pz-code-note"));
    };
  }, [link, selected, score]);

  const parts = data?.parts ?? [];
  const category = CATEGORIES.find((c) => c.id === problem.category)!;
  const level = LEVEL_STYLE[problem.level];
  const Body = LESSON_BODY[problem.id] ?? TECH_BODY[problem.id];
  const Target = TARGETS[problem.id] ?? TECH_TARGETS[problem.id];
  /** what the answer must sound like, beside the task (fill-in lessons): the score panel shows the student's own */
  const target = Target && (
    <div className="space-y-1" data-testid="target">
      <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
        {pick(UI.target)}
        {passed && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700" data-testid="target-match">
            {pick(UI.matches)}
          </span>
        )}
      </p>
      <Target />
    </div>
  );
  const next = PROBLEMS[PROBLEMS.indexOf(problem) + 1];
  const tabs: Tab[] = isLesson ? ["lesson", "syntax", "rules"] : ["task", "why", "syntax"];
  const tabLabel = (tab: Tab) =>
    tab === "lesson" ? pick(UI.tabLesson) : tab === "syntax" ? pick(UI.tabSyntax) : tab === "rules" ? pick(UI.tabRules) : t(`tab.${tab}`);
  const checkTitle = fillIn(pick(UI.checkHint), { save: SAVE_KEY, enter: ENTER_KEY });

  const verdict = passed !== null && (
    <p
      className={`rounded-md border px-3 py-2 text-sm font-medium ${
        passed ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
      data-testid="verdict"
    >
      {passed ? `✓ ${t("learn.passed")}` : t("learn.failed")}
    </p>
  );
  const rules = (
    <div>
      <h2 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{t("learn.rules")}</h2>
      <ul className="mt-2 space-y-1.5 text-sm" data-testid="rules">
        {problem.rules.map((rule, i) => {
          const r = results?.[i];
          const advice = r?.severity === "advice";
          const markText = !r ? "○" : r.ok ? "✓" : advice ? "·" : "✗";
          const colour = !r ? "text-gray-400" : r.ok ? "text-emerald-600" : advice ? "text-gray-400" : "text-red-600";
          return (
            <li key={i} className="flex gap-2">
              <span className={`w-4 shrink-0 text-center font-semibold ${colour}`}>{markText}</span>
              <span className={r && !r.ok && !advice ? "text-red-800" : advice && !r?.ok ? "text-gray-500" : "text-gray-700"}>
                {ruleLabel(rule, parts, lang)}
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
      {error && results === null && (
        <p className="mt-2 text-xs text-red-700" data-testid="rules-error">
          {error.line !== null && `${fill(t("error.line"), { line: error.line })}: `}
          {error.message}
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-gray-500">{t("learn.intro")}</p>
    </div>
  );

  return (
    <>
      <style>{`.pz-score .pz-code-note, .pz-score .pz-code-note * { fill: #0369a1; stroke: #0369a1; } .pz-code-note { filter: drop-shadow(0 0 2px #7dd3fc); }`}</style>
      <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-white xl:hidden" role="tablist">
        {MOBILE_TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={mobileTab === tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 border-b-2 py-2.5 text-sm font-medium ${
              mobileTab === tab ? "border-(--lk-accent) text-(--lk-accent)" : "border-transparent text-gray-500"
            }`}
          >
            {tab === "problem" && isLesson ? pick(UI.lesson) : t(`mtab.${tab}`)}
          </button>
        ))}
      </div>

      {/* 2. The lesson or problem: title and chips pinned; the tabs scroll */}
      <main className={`flex min-w-0 flex-col border-r border-gray-200 xl:min-h-0 xl:flex-1 ${onPhone("problem")}`} data-testid="problem">
        <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-4">
          {isLesson && <p className="text-xs font-medium text-(--lk-accent)">{fillIn(pick(UI.lessonN), { n: problem.lesson! })}</p>}
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">{pick(problem.title)}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-(--lk-accent)">
              {category.icon} {pick(category.title)}
            </span>
            <span className={`flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-medium ${level.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${level.dot}`} />
              {problem.level} · {t(`level.${problem.level}`)}
            </span>
            {done && <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">✓ {t("learn.done")}</span>}
          </div>
          {problem.uses && problem.uses.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs" data-testid="uses">
              <span className="text-gray-500">{pick(UI.uses)}</span>
              {problem.uses.map((u) => {
                const l = PROBLEMS.find((p) => p.id === u);
                if (!l) return null;
                return (
                  <button
                    key={u}
                    onClick={() => goCode(u)}
                    title={plainText(pick(l.title))}
                    className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-800 hover:bg-sky-100"
                  >
                    {fillIn(pick(UI.lessonN), { n: l.lesson ?? "" })} · {pick(l.title)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="@container space-y-4 bg-gray-50/60 p-5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
          {verdict}
          <div role="tablist" className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={lowerTab === tab}
                onClick={() => setLowerTab(tab)}
                data-testid={`tab-${tab}`}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  lowerTab === tab ? "bg-white text-(--lk-accent) shadow-sm ring-1 ring-gray-200" : "text-gray-600 hover:bg-white/70"
                }`}
              >
                {tabLabel(tab)}
              </button>
            ))}
          </div>
          {lowerTab === "lesson" && (
            <div className="space-y-4" data-testid="lesson">
              <div className="space-y-3 text-sm leading-relaxed text-gray-700">{Body ? <Body /> : <RichText text={pick(problem.why)} />}</div>
              <div className="rounded-lg border-2 border-rose-200 bg-white px-4 py-3" data-testid="task">
                <h2 className="text-xs font-semibold tracking-wide text-(--lk-accent) uppercase">{pick(UI.yourTurn)}</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-800">
                  <RichText text={pick(problem.task)} />
                </p>
                {target && <div className="mt-3">{target}</div>}
                <p className="mt-2 text-xs text-gray-500">{pick(UI.linked)}</p>
              </div>
              {next && (
                <div className="flex justify-end">
                  <Button onClick={() => goCode(next.id)} data-testid="next">
                    {pick(UI.next)}: {title(next)}
                    <Icon icon={ArrowRight} />
                  </Button>
                </div>
              )}
            </div>
          )}
          {lowerTab === "task" && (
            <div className="space-y-4" data-testid="task">
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800">
                <RichText text={pick(problem.task)} />
                {target && <div className="mt-3">{target}</div>}
              </div>
              {rules}
            </div>
          )}
          {lowerTab === "rules" && <div className="space-y-4">{rules}</div>}
          {lowerTab === "syntax" && <SyntaxSheet />}
          {lowerTab === "why" && (
            <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-700" data-testid="why">
              <RichText text={pick(problem.why)} />
            </p>
          )}
        </div>
      </main>

      {/* 3. The code, then the score it makes */}
      <section className="flex min-w-0 flex-col xl:min-h-0 xl:w-[48%] xl:shrink-0">
        <div className={`flex min-h-[16rem] flex-col border-b border-gray-200 bg-white xl:min-h-0 xl:flex-[2] ${onPhone("code")}`}>
          <div className={PANEL_HEAD}>
            <Button variant="primary" icon={CircleCheck} onClick={() => void run(true)} disabled={running} data-testid="check" title={checkTitle}>
              {running ? t("running") : t("learn.check")}
            </Button>
            <Button icon={RotateCcw} onClick={() => setCode(problem.starter)}>
              {t("learn.reset")}
            </Button>
            {saved && (
              <span className="text-xs font-medium text-emerald-700" role="status" data-testid="saved">
                ✓ {pick(UI.saved)}
              </span>
            )}
            <span className="ml-auto">
              <PyStatus />
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <CodePane
              value={code}
              onChange={setCode}
              onRun={() => void run(true)}
              onSave={save}
              errorAt={error?.line ?? null}
              blankMessage={(line) => blankMessage(line)[lang]}
              mark={mark}
              onCursor={onCursor}
              onView={(v) => (view.current = v)}
            />
          </div>
          <ErrorBox error={error} />
        </div>
        <div className={`min-h-[20rem] flex-col xl:min-h-0 xl:flex-[3] ${mobileTab === "score" ? "flex" : "hidden xl:flex"}`}>
          <div className={PANEL_HEAD} data-testid="practice">
            <label className={CHECK} title={pick(UI.loopHint)}>
              <Icon icon={Repeat} />
              {pick(UI.loop)}
              <select
                value={loopBar ?? ""}
                onChange={(e) => setLoopBar(e.target.value === "" ? null : Number(e.target.value))}
                className={FIELD}
                data-testid="loop-bar"
              >
                <option value="">{pick(UI.loopOff)}</option>
                {(data?.measures ?? []).map((m) => (
                  <option key={m.n} value={m.n}>
                    {fillIn(pick(UI.loopBar), { n: m.n })}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div ref={scoreBox} className="flex min-h-0 flex-1 flex-col">
            <ScoreView score={data} part={null} pagesView={false} onNoteClick={onNoteClick} />
          </div>
        </div>
      </section>
    </>
  );
}
