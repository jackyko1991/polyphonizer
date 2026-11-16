/**
 * Learn to ▸ Play (#/learn/play/<lesson>): play the music on the virtual keyboard (mouse, computer keys, a MIDI
 * keyboard) and see each note graded on the score. Two ways: "Wait for me" (the music waits for each right note)
 * and "In time" (a bar of clicks, then play along; notes are graded on pitch and timing). Listen plays it first.
 */
import { RichText, useLang } from "@learnkit/web";
import { ChevronRight, ChevronsLeft, ChevronsRight, CircleCheck, Ear, Hourglass, Play, RotateCcw, Search, Square, Timer, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, IconButton } from "../../Button.tsx";
import { LEVELS } from "../../problems.ts";
import { LEVEL_STYLE } from "../levels.ts";
import type { Sound } from "../../engine/engrave.ts";
import { CHECK, FIELD, SEGMENT, SEGMENTS } from "../../ui.ts";
import { now, tick } from "../../tools/liveSound.ts";
import { subscribeNotes } from "../../tools/noteInput.ts";
import { armKeyboard, openTool, requestKeyboardBase, setKeyHint } from "../../tools/toolboxState.ts";
import { FINGER_SHOWS, type FingerShow } from "../../engine/fingering.ts";
import { INSTRUMENTS, PLAY_LESSONS, type PlayLesson, type PlayMode } from "./lessons.ts";
import { gradeInTime, gradeWait, pressWait, startWait, steps, type Grade, type Mark, type TargetNote, type WaitState } from "./matcher.ts";


const PASSED = "polyphonizer.play.passed";
const passedSet = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(PASSED) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
};
const go = (id: string) => (window.location.hash = `#/learn/play/${id}`);

/** colours of graded notes in the score */
const STYLE = `
.pz-play .pz-ok, .pz-play .pz-ok * { fill: #059669; stroke: #059669; }
.pz-play .pz-early, .pz-play .pz-early *, .pz-play .pz-late, .pz-play .pz-late * { fill: #d97706; stroke: #d97706; }
.pz-play .pz-wrong, .pz-play .pz-wrong *, .pz-play .pz-missed, .pz-play .pz-missed * { fill: #dc2626; stroke: #dc2626; }
.pz-play .pz-next, .pz-play .pz-next * { fill: #0284c7; stroke: #0284c7; }
`;

export default function PlayPage({ id }: { id: string | null }) {
  const { pick } = useLang();
  const lesson = PLAY_LESSONS.find((l) => l.id === id) ?? PLAY_LESSONS[0];
  const [passed, setPassed] = useState(passedSet);
  const onPassed = (lid: string) =>
    setPassed((s) => {
      const n = new Set(s).add(lid);
      try {
        localStorage.setItem(PASSED, JSON.stringify([...n]));
      } catch {
        /* storage unavailable */
      }
      return n;
    });
  const [libraryOpen, setLibraryOpen] = useState(true);
  return (
    <div className="flex flex-col bg-white xl:h-full xl:min-h-0 xl:flex-row" data-testid="learn-play">
      <style>{STYLE}</style>
      {/* phones and tablets: a menu instead of the list column (as Learn to Code) */}
      <div className="border-b border-gray-200 p-3 xl:hidden">
        <select value={lesson.id} onChange={(e) => go(e.target.value)} className={`${FIELD} w-full`} aria-label={pick(["Lesson", "課程"])} data-testid="play-menu">
          {INSTRUMENTS.filter((i) => PLAY_LESSONS.some((l) => l.instrument === i.id)).map((i) => (
            <optgroup key={i.id} label={pick(i.title)}>
              {PLAY_LESSONS.filter((l) => l.instrument === i.id).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.level} · {l.n} {pick(l.title)} {passed.has(l.id) ? "✓" : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      {/* the lessons, as Learn to Code's problems: search, then each instrument folds open to its lessons by level */}
      <aside className={`hidden shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] xl:flex ${libraryOpen ? "w-64" : "w-10"}`}>
        <div className="flex h-9 shrink-0 items-center gap-1 border-b border-gray-200 bg-gray-50 px-1.5">
          {libraryOpen && (
            <span className="flex-1 rounded-md bg-(--lk-accent) px-2 py-1 text-center text-xs font-medium text-white shadow-sm">{pick(["Lessons", "課程"])}</span>
          )}
          <IconButton
            onClick={() => setLibraryOpen((o) => !o)}
            icon={libraryOpen ? ChevronsLeft : ChevronsRight}
            label={libraryOpen ? pick(["Fold the lessons", "收起課程"]) : pick(["Show the lessons", "顯示課程"])}
            className="h-7 w-7"
          />
        </div>
        {libraryOpen ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <LessonLibrary selected={lesson.id} passed={passed} />
          </div>
        ) : (
          <button
            onClick={() => setLibraryOpen(true)}
            className="flex-1 py-3 text-xs font-medium tracking-wide text-gray-500 [writing-mode:vertical-rl] hover:text-gray-800"
          >
            {pick(["Lessons", "課程"])}
          </button>
        )}
      </aside>
      <Lesson key={lesson.id} lesson={lesson} onPassed={onPassed} />
    </div>
  );
}

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** the lesson list: a search box, then each instrument with its lessons grouped by level (as Learn to Code) */
function LessonLibrary({ selected, passed }: { selected: string; passed: Set<string> }) {
  const { t, pick } = useLang();
  const mine = PLAY_LESSONS.find((l) => l.id === selected)?.instrument;
  const [open, setOpen] = useState<Set<string>>(() => new Set(mine ? [mine] : []));
  const [query, setQuery] = useState("");
  const index = useMemo(() => PLAY_LESSONS.map((l) => ({ l, text: fold([l.n, ...l.title, ...l.task, l.id.replace(/-/g, " ")].join(" ")) })), []);
  const words = fold(query).split(/\s+/).filter(Boolean);
  const hits = words.length ? index.filter((e) => words.every((w) => e.text.includes(w))).map((e) => e.l) : [];
  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const item = (l: PlayLesson, dot = false) => (
    <li key={l.id}>
      <a
        href={`#/learn/play/${l.id}`}
        aria-current={l.id === selected ? "page" : undefined}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition ${
          l.id === selected ? "bg-rose-50 font-medium text-(--lk-accent)" : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${LEVEL_STYLE[l.level].dot}`} />}
        <span className="w-7 shrink-0 text-xs text-gray-400">{l.n}</span>
        <span className="min-w-0 flex-1">{pick(l.title)}</span>
        {passed.has(l.id) && <span className="shrink-0 text-xs font-semibold text-emerald-600">✓</span>}
      </a>
    </li>
  );
  return (
    <nav className="space-y-1" aria-label={pick(["Lessons", "課程"])} data-testid="play-library">
      <div className="sticky -top-3 z-10 -mx-3 -mt-3 mb-2 bg-white px-3 pt-3 pb-1">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder={pick(["Search lessons", "搜尋課程"])}
            aria-label={pick(["Search lessons", "搜尋課程"])}
            data-testid="play-search"
            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pr-7 pl-7 text-sm placeholder:text-gray-400 focus:border-(--lk-accent) focus:outline-none"
          />
          <Search className="pointer-events-none absolute top-2 left-2 h-4 w-4 text-gray-400" aria-hidden />
          {query && (
            <button onClick={() => setQuery("")} aria-label={t("search.clear")} className="absolute top-1.5 right-1.5 rounded p-0.5 text-gray-400 hover:text-gray-700">
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
      {words.length > 0 ? (
        <div data-testid="play-search-results">
          {hits.length === 0 && <p className="px-2 py-2 text-sm text-gray-400">{pick(["Nothing matches.", "沒有符合的課程。"])}</p>}
          <ul>{hits.map((l) => item(l, true))}</ul>
        </div>
      ) : (
        INSTRUMENTS.map((ins) => {
          const isOpen = open.has(ins.id);
          const lessons = PLAY_LESSONS.filter((l) => l.instrument === ins.id);
          return (
            <div key={ins.id} data-testid={`instrument-${ins.id}`}>
              <button
                onClick={() => toggle(ins.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm font-semibold text-gray-800 hover:bg-gray-100"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden>{ins.icon}</span>
                  {pick(ins.title)}
                </span>
                <span className="flex items-center gap-2 text-xs font-normal text-gray-400">
                  {lessons.length || "—"}
                  <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden />
                </span>
              </button>
              {isOpen && (
                <div className="mb-2 ml-2 space-y-2 border-l border-gray-200 pl-2">
                  {lessons.length === 0 && (
                    <p className="px-2 py-1 text-xs text-gray-500">
                      {pick(["Coming soon: played into the microphone and graded on pitch and timing.", "即將推出：對著麥克風演奏，按音準和節奏評分。"])}
                    </p>
                  )}
                  {LEVELS.map((level) => {
                    const inLevel = lessons.filter((l) => l.level === level);
                    if (!inLevel.length) return null;
                    const style = LEVEL_STYLE[level];
                    return (
                      <div key={level} data-testid={`play-level-${level}`}>
                        <h3 className={`flex items-center gap-1.5 px-2 pt-1 pb-0.5 text-[11px] font-semibold tracking-wide uppercase ${style.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          {level} · {t(`level.${level}`)}
                        </h3>
                        <ul>{inLevel.map((l) => item(l))}</ul>
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

const MARK_NAMES: Record<Mark, readonly [string, string]> = {
  ok: ["on time", "準時"],
  early: ["early", "太早"],
  late: ["late", "太晚"],
  wrong: ["wrong note", "彈錯"],
  missed: ["missed", "漏彈"],
};

type Phase = "idle" | "countin" | "playing" | "done";

const FINGERING_KEY = "polyphonizer.play.fingering";

function Lesson({ lesson, onPassed }: { lesson: PlayLesson; onPassed: (id: string) => void }) {
  const { pick } = useLang();
  const box = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [mode, setMode] = useState<PlayMode>(lesson.mode);
  const marked = Number(/Q:1\/4=(\d+)/.exec(lesson.abc)?.[1] ?? 96);
  const [bpm, setBpm] = useState(marked);
  const [click, setClick] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [grade, setGrade] = useState<Grade | null>(null);
  const [listening, setListening] = useState(false);
  const timers = useRef<number[]>([]);
  // the fingering drawn over the notes: none, where the hand moves (basic), or every note; remembered
  const [fingering, setFingeringState] = useState<FingerShow>(() => {
    try {
      const v = localStorage.getItem(FINGERING_KEY) as FingerShow | null;
      return v && FINGER_SHOWS.includes(v) ? v : "basic";
    } catch {
      return "basic";
    }
  });
  const setFingering = (v: FingerShow) => {
    setFingeringState(v);
    try {
      localStorage.setItem(FINGERING_KEY, v);
    } catch {
      /* storage unavailable */
    }
  };

  // the music, engraved
  useEffect(() => {
    let live = true;
    const fingers = lesson.fingers ? { fingers: lesson.fingers.map((f) => [f]), show: fingering } : undefined;
    Promise.all([import("../../engine/engrave.ts"), import("../../engine/abc.ts")])
      .then(([e, a]) => e.engraveSnippet(a.exampleData(lesson.abc), 760, 42, lesson.abc, false, fingers))
      .then((r) => live && (setSvg(r.svg), setSounds(r.sounds)));
    return () => {
      live = false;
    };
  }, [lesson.abc, lesson.fingers, fingering]);

  // open the keyboard with the computer keys on: home row from middle C, or for both hands the two rows (left from C3)
  useEffect(() => {
    openTool("keyboard");
    armKeyboard(true);
    if (lesson.hands === "two") requestKeyboardBase(60, 48);
    else requestKeyboardBase(60);
    return () => setKeyHint([]);
  }, [lesson.hands]);

  /** the target at the chosen tempo (the engraving's times are at the marked tempo) */
  const target: TargetNote[] = useMemo(() => {
    const scale = marked / bpm;
    const first = Math.min(...sounds.map((s) => s.time));
    return sounds.map((s) => ({ id: s.id, midi: s.pitch, time: (s.time - first) * scale }));
  }, [sounds, bpm, marked]);
  const plan = useMemo(() => steps(target), [target]);

  const paint = (marks: Map<string, Mark | "next">) => {
    const root = box.current;
    if (!root) return;
    root.querySelectorAll(".pz-ok,.pz-early,.pz-late,.pz-wrong,.pz-missed,.pz-next").forEach((el) =>
      el.classList.remove("pz-ok", "pz-early", "pz-late", "pz-wrong", "pz-missed", "pz-next"),
    );
    marks.forEach((m, nid) => root.querySelector(`[id="${CSS.escape(nid)}"]`)?.classList.add(`pz-${m}`));
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const reset = () => {
    clearTimers();
    setPhase("idle");
    setGrade(null);
    setKeyHint([]);
    paint(new Map());
  };
  useEffect(() => reset, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (g: Grade) => {
    clearTimers();
    setGrade(g);
    setPhase("done");
    setKeyHint([]);
    paint(new Map(g.results.map((r) => [r.id, r.mark])));
    if (g.passed) onPassed(lesson.id);
  };

  // Wait for me
  const wait = useRef<WaitState>(startWait());
  const showWait = (s: WaitState) => {
    const marks = new Map<string, Mark | "next">();
    plan.forEach((group, i) => {
      for (const t of group) {
        if (i < s.step || (i === s.step && s.done.includes(t.id))) marks.set(t.id, s.mistakes[t.id] ? "wrong" : "ok");
        else if (i === s.step) marks.set(t.id, "next");
      }
    });
    paint(marks);
    setKeyHint(s.finished ? [] : plan[s.step].filter((t) => !s.done.includes(t.id)).map((t) => t.midi));
  };

  // In time: collected note-ons, in ms from the first note's expected time
  const played = useRef<{ midi: number; time: number }[]>([]);
  const startPerf = useRef(0);

  useEffect(() => {
    if (phase !== "playing" && phase !== "countin") return;
    return subscribeNotes((e) => {
      if (!e.on) return;
      if (mode === "wait" && phase === "playing") {
        wait.current = pressWait(wait.current, plan, e.midi);
        showWait(wait.current);
        if (wait.current.finished) finish(gradeWait(wait.current, plan));
      } else if (mode === "time") played.current.push({ midi: e.midi, time: e.time - startPerf.current });
    });
  }, [phase, mode, plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    reset();
    if (!plan.length) return;
    armKeyboard(true);
    if (mode === "wait") {
      wait.current = startWait();
      setPhase("playing");
      showWait(wait.current);
      return;
    }
    // In time: one bar of count-in clicks, then the music's clock starts
    const beat = 60 / bpm;
    const t0 = now() + 0.15;
    const beatsPerBar = 4;
    for (let i = 0; i < beatsPerBar; i++) tick(t0 + i * beat, i === 0 ? "accent" : "normal", "wood");
    const startAudio = t0 + beatsPerBar * beat;
    startPerf.current = performance.now() + (startAudio - now()) * 1000;
    played.current = [];
    setPhase("countin");
    const end = target.length ? Math.max(...target.map((t) => t.time)) : 0;
    if (click) for (let b = 0; b * beat * 1000 <= end + 10; b++) tick(startAudio + b * beat, b % beatsPerBar === 0 ? "accent" : "normal", "wood", 0.6);
    const at = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, Math.max(0, startPerf.current + ms - performance.now())));
    at(-30, () => setPhase("playing"));
    // a moving pointer: the note due now in blue
    plan.forEach((group, i) =>
      at(group[0].time - 40, () => {
        paint(new Map(group.map((t) => [t.id, "next" as const])));
        setKeyHint(group.map((t) => t.midi));
        void i;
      }),
    );
    at(end + beat * 1500, () => finish(gradeInTime(target, played.current, lesson.tolerance)));
  };

  const listen = async () => {
    const player = await import("../../engine/player.ts");
    if (listening) return player.stop();
    setListening(true);
    const scale = marked / bpm;
    const mark = (nid: string, on: boolean) => box.current?.querySelector(`[id="${CSS.escape(nid)}"]`)?.classList.toggle("pz-playing", on);
    const staves = Math.max(1, ...sounds.map((s) => s.staff + 1));
    await player
      .play(
        sounds.map((s) => ({ ...s, time: s.time * scale, duration: s.duration * scale })),
        mark,
        0,
        { parts: [], programs: Array(staves).fill(0) },
      )
      .catch(() => undefined);
    setListening(false);
  };

  const counts = grade
    ? (["ok", "early", "late", "wrong", "missed"] as Mark[]).map((m) => [m, grade.results.filter((r) => r.mark === m).length] as const)
    : [];
  const next = PLAY_LESSONS[PLAY_LESSONS.findIndex((l) => l.id === lesson.id) + 1];
  const busy = phase === "countin" || phase === "playing";

  return (
    <main className="min-w-0 flex-1 overflow-y-auto p-5 xl:p-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <header>
          <p className="text-xs font-medium tracking-wide text-(--lk-accent) uppercase">
            {pick(["Learn to play", "學習彈奏"])} · {lesson.n}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{pick(lesson.title)}</h1>
        </header>
        <p className="text-gray-800">
          <RichText text={pick(lesson.task)} />
        </p>
        <p className="text-sm leading-relaxed text-gray-600">
          <RichText text={pick(lesson.how)} />
        </p>
        <p className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {pick(["Computer keys:", "電腦鍵盤："])}
          <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-gray-800">{lesson.keys}</kbd>
          {pick(["(the keyboard is open at the bottom; Esc stops the computer keys)", "（鍵盤在下方；Esc 停止電腦鍵盤）"])}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <div className={SEGMENTS} role="radiogroup" aria-label={pick(["How to play", "練習方式"])}>
            {(
              [
                ["wait", Hourglass, ["Wait for me", "等我"]],
                ["time", Timer, ["In time", "跟拍子"]],
              ] as const
            ).map(([m, Icon, label]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                disabled={busy}
                onClick={() => (setMode(m), reset())}
                className={`${SEGMENT} gap-1.5 ${mode === m ? "bg-(--lk-accent) text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {pick(label)}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-sm text-gray-700">
            ♩ =
            <input
              type="number"
              min={30}
              max={200}
              value={bpm}
              disabled={busy}
              onChange={(e) => setBpm(Math.min(200, Math.max(30, Number(e.target.value) || marked)))}
              className={`${FIELD} w-16`}
              aria-label="BPM"
            />
          </label>
          {lesson.fingers && (
            <label className="flex items-center gap-1.5 text-sm text-gray-700" title={pick(["Fingers: 1 thumb, 2 index, 3 middle, 4 ring, 5 little", "指法：1 拇指、2 食指、3 中指、4 無名指、5 小指"])}>
              {pick(["Fingering", "指法"])}
              <select
                value={fingering}
                onChange={(e) => setFingering(e.target.value as FingerShow)}
                disabled={busy}
                className={FIELD}
                data-testid="play-fingering"
              >
                <option value="none">{pick(["None", "不顯示"])}</option>
                <option value="basic">{pick(["Basic (where the hand moves)", "基本（換手位處）"])}</option>
                <option value="all">{pick(["All", "全部"])}</option>
              </select>
            </label>
          )}
          {mode === "time" && (
            <label className={CHECK}>
              <input type="checkbox" checked={click} onChange={(e) => setClick(e.target.checked)} disabled={busy} />
              {pick(["Click along", "伴隨拍子聲"])}
            </label>
          )}
          <Button icon={listening ? Square : Ear} onClick={() => void listen()} disabled={busy || !sounds.length}>
            {listening ? pick(["Stop", "停止"]) : pick(["Listen", "聆聽"])}
          </Button>
          <Button variant="primary" icon={busy ? Square : Play} onClick={() => (busy ? reset() : start())} disabled={!sounds.length} data-testid="play-start">
            {busy ? pick(["Stop", "停止"]) : pick(["Start", "開始"])}
          </Button>
          {phase === "done" && (
            <Button icon={RotateCcw} onClick={start}>
              {pick(["Again", "再一次"])}
            </Button>
          )}
          <span className="text-sm text-gray-500" aria-live="polite">
            {phase === "countin"
              ? pick(["One bar of clicks… then play", "一小節的拍子……然後開始彈"])
              : phase === "playing" && mode === "wait"
                ? pick([`Play the blue note${plan[wait.current.step]?.length > 1 ? "s" : ""}`, "彈藍色的音"])
                : ""}
          </span>
        </div>

        <div ref={box} className="pz-play pz-score overflow-x-auto rounded-xl border border-gray-200 bg-white p-3 [&_svg]:h-auto [&_svg]:max-w-full" data-testid="play-score">
          {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="py-10 text-center text-sm text-gray-400">♪ …</p>}
        </div>

        {grade && (
          <section
            className={`rounded-xl border p-4 ${grade.passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
            aria-live="polite"
            data-testid="play-result"
          >
            <p className={`flex items-center gap-2 text-lg font-semibold ${grade.passed ? "text-emerald-800" : "text-amber-900"}`}>
              {grade.passed && <CircleCheck className="h-5 w-5" aria-hidden />}
              {grade.score}% · {grade.passed ? pick(["Passed!", "通過！"]) : pick(["Not yet: try again", "還差一點：再試一次"])}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-gray-700">
              {counts
                .filter(([, n]) => n > 0)
                .map(([m, n]) => (
                  <span key={m}>
                    {pick(MARK_NAMES[m])}{" "}
                    <b>{n}</b>
                  </span>
                ))}
              {grade.extra > 0 && (
                <span>
                  {pick(["extra notes", "多彈的音"])} <b>{grade.extra}</b>
                </span>
              )}
            </p>
            {mode === "time" && (
              <p className="mt-1 text-xs text-gray-600">
                {pick([
                  `Green: within ${lesson.tolerance} ms of the beat; amber: a little early or late. Slower is fine: lower ♩ and try again.`,
                  `綠色：與拍點相差 ${lesson.tolerance} 毫秒以內；琥珀色：稍早或稍晚。慢一點沒關係：把 ♩ 調低再試。`,
                ])}
              </p>
            )}
            {grade.passed && next && (
              <p className="mt-3">
                <Button variant="primary" onClick={() => go(next.id)}>
                  {pick(["Next", "下一課"])}: {next.n} · {pick(next.title)} →
                </Button>
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
