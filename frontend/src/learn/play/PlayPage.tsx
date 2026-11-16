/**
 * Learn to ▸ Play (#/learn/play/<lesson>): play the music on the virtual keyboard (mouse, computer keys, a MIDI
 * keyboard) and see each note graded on the score. Two ways: "Wait for me" (the music waits for each right note)
 * and "In time" (a bar of clicks, then play along; notes are graded on pitch and timing). Listen plays it first.
 */
import { RichText, useLang } from "@learnkit/web";
import { CircleCheck, Ear, Hourglass, Play, RotateCcw, Square, Timer } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../Button.tsx";
import type { Sound } from "../../engine/engrave.ts";
import { CHECK, FIELD, SEGMENT, SEGMENTS } from "../../ui.ts";
import { noteOn, now, tick } from "../../tools/liveSound.ts";
import { noteName } from "../../tools/music.ts";
import { subscribeNotes } from "../../tools/noteInput.ts";
import { armKeyboard, openTool, requestKeyboardBase, setKeyHint } from "../../tools/toolboxState.ts";
import { PLAY_LESSONS, type PlayLesson, type PlayMode } from "./lessons.ts";
import { gradeInTime, gradeWait, pressWait, startWait, steps, type Grade, type Mark, type TargetNote, type WaitState } from "./matcher.ts";
import { attemptReport, beatsPerBar, lessonContext, type PlayInput, type PracticeInput } from "./teacher.ts";

const Teacher = lazy(() => import("./Teacher.tsx"));

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
  return (
    <div className="flex flex-col bg-white xl:h-full xl:min-h-0 xl:flex-row" data-testid="learn-play">
      <style>{STYLE}</style>
      <div className="border-b border-gray-200 p-3 xl:hidden">
        <select value={lesson.id} onChange={(e) => go(e.target.value)} className={`${FIELD} w-full`} aria-label={pick(["Lesson", "課程"])}>
          {PLAY_LESSONS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.n} · {pick(l.title)} {passed.has(l.id) ? "✓" : ""}
            </option>
          ))}
        </select>
      </div>
      <nav className="hidden w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50/60 p-3 xl:block" aria-label={pick(["Lessons", "課程"])}>
        <p className="px-2 pb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">{pick(["Keyboard", "鍵盤"])}</p>
        <ol className="space-y-0.5">
          {PLAY_LESSONS.map((l) => (
            <li key={l.id}>
              <a
                href={`#/learn/play/${l.id}`}
                aria-current={l.id === lesson.id ? "page" : undefined}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                  l.id === lesson.id ? "bg-white font-medium text-(--lk-accent) shadow-sm ring-1 ring-gray-200" : "text-gray-700 hover:bg-white"
                }`}
              >
                <span className="w-8 shrink-0 text-xs text-gray-400">{l.n}</span>
                <span className="min-w-0 flex-1 truncate">{pick(l.title)}</span>
                {passed.has(l.id) && <span className="text-emerald-600">✓</span>}
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-4 px-2 text-xs leading-relaxed text-gray-500">
          {pick([
            "Violin and flute lessons, played into the microphone and graded on intonation too, come next.",
            "接下來會有小提琴與長笛課程：對著麥克風演奏，連音準也會評分。",
          ])}
        </p>
      </nav>
      <Lesson key={lesson.id} lesson={lesson} onPassed={onPassed} />
    </div>
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

  // the music, engraved
  useEffect(() => {
    let live = true;
    Promise.all([import("../../engine/engrave.ts"), import("../../engine/abc.ts")])
      .then(([e, a]) => e.engraveSnippet(a.exampleData(lesson.abc), 760, 42, lesson.abc))
      .then((r) => live && (setSvg(r.svg), setSounds(r.sounds)));
    return () => {
      live = false;
    };
  }, [lesson.abc]);

  // open the keyboard with the computer keys on, home row from middle C
  useEffect(() => {
    openTool("keyboard");
    armKeyboard(true);
    requestKeyboardBase(60);
    return () => setKeyHint([]);
  }, []);

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

  const attempts = useRef(0);
  const finish = (g: Grade) => {
    clearTimers();
    attempts.current += 1;
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

  // the AI teacher's tools: play notes of the lesson (keys lit, notes marked on the score), set tempo / mode
  const demo = (p: PlayInput) =>
    new Promise<string>((done) => {
      const notes = target.slice(p.from - 1, p.to);
      if (!notes.length || busy) return done(busy ? "not now: the learner is playing" : "no notes there");
      const scale = bpm / p.bpm; // target times are at the lesson's current tempo
      const t0 = notes[0].time;
      const mark = (nid: string, on: boolean) => box.current?.querySelector(`[id="${CSS.escape(nid)}"]`)?.classList.toggle("pz-playing", on);
      const startAt = performance.now() + 150;
      notes.forEach((t, i) => {
        const at = (t.time - t0) * scale;
        const next = notes.slice(i + 1).find((n) => n.time > t.time);
        const len = Math.max(150, ((next ? next.time : t.time + 60000 / bpm) - t.time) * scale * 0.95);
        const vel = p.loudness?.[i] ?? 0.7;
        timers.current.push(
          window.setTimeout(() => {
            const stop = noteOn(t.midi, 0, vel);
            mark(t.id, true);
            setKeyHint([t.midi]);
            window.setTimeout(() => (stop(), mark(t.id, false)), len);
          }, startAt + at - performance.now()),
        );
      });
      const total = (notes[notes.length - 1].time - t0) * scale + 600;
      timers.current.push(window.setTimeout(() => (setKeyHint([]), done(`played notes ${p.from}–${p.to} at ♩ = ${p.bpm}`)), startAt + total - performance.now()));
    });
  const practice = (p: PracticeInput) => {
    if (busy) return "not now: the learner is playing";
    if (p.bpm) setBpm(p.bpm);
    if (p.mode) setMode(p.mode);
    reset();
    return [p.bpm && `♩ = ${p.bpm}`, p.mode && (p.mode === "wait" ? "Wait for me" : "In time")].filter(Boolean).join(", ");
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
        <Suspense fallback={null}>
          <Teacher
            lessonText={() => lessonContext(lesson, target, bpm, pick)}
            attempt={() => (grade ? { report: attemptReport(target, grade, mode, bpm, beatsPerBar(lesson.abc), lesson.tolerance), n: attempts.current } : null)}
            play={demo}
            practice={practice}
            notes={target.length}
          />
        </Suspense>
        <p className="text-xs text-gray-400">
          {pick(["The notes:", "音："])} {plan.map((g) => g.map((t) => noteName(t.midi)).join("+")).join(" ")}
        </p>
      </div>
    </main>
  );
}
