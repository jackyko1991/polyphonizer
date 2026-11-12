/**
 * The score panel: the engraved score (live) or the printed pages, for the full score or one player's part; a Play
 * button that lights up the notes as they sound; export. The Pages view is also the layout editor: bars per line,
 * staff size, and line and page breaks set by clicking a bar, with page turns planned around them.
 */
import { ChevronDown, ChevronLeft, ChevronRight, Download, Gauge, Maximize2, Minimize2, Music, PencilLine, Play, RotateCcw, Square, X } from "lucide-react";
import { Icon } from "./Button.tsx";
import { useLang } from "@learnkit/web";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { engravePages, engraveScroll, midiFile, timelineOf, type Engraving } from "./engine/engrave.ts";
import { barIndices, barNumbers, DEFAULT_SETUP, PAPERS, SCREENS, screenPaper, withPaper, type PageSetup, type Stand } from "./engine/pageSetup.ts";
import { play, stop } from "./engine/player.ts";
import type { ScoreData } from "./engine/types.ts";
import { cursorAt, onsetTable, type Onset } from "./engine/cursor.ts";
import { keyTurn, pageSize, pagesPerView, turn, viewOf } from "./engine/reader.ts";
import { useSoundSettings } from "./engine/sound.ts";
import { RANGE, setStage, useStage } from "./progress.ts";
import SoundPanel from "./SoundPanel.tsx";
import { BUTTON, BUTTON_ON, CHECK, FIELD, layoutWidth, SEGMENT, SEGMENTS } from "./ui.ts";
import { fill } from "./strings.ts";

export type View = "score" | "pages";


export interface ScoreViewProps {
  score: ScoreData | null;
  /** pages view: the sheet for one part (re-run by the parent), null = full score */
  part: number | null;
  onPart?: (part: number | null) => void;
  /** all part names of the full score (the part picker) */
  allParts?: string[];
  /** the full score while one part is shown: for playing the other parts along */
  fullScore?: ScoreData | null;
  /** Export ▸ Code (the editor's project files) */
  onExportCode?: () => void;
  /** this sheet's page setup (the score's pages(...) call) and how to change it (the editor rewrites the call) */
  setup?: PageSetup;
  onSetup?: (s: PageSetup) => void;
  /** Score view, editing notes: a bar's notes as text, and writing an edit into the code */
  barText?: (part: string, bar: number) => Promise<{ text: string; lost: string[] }>;
  onEditBar?: (part: string, bar: number, text: string) => void;
  /** a note was clicked (click-note mode): its part, bar number and its place among the part's notes and rests */
  onNoteClick?: (note: { part: string; partIndex: number; bar: number; index: number }) => void;
  /** offer the Pages view (the editor does; Learn does not) */
  pagesView?: boolean;
  view?: View;
  onView?: (v: View) => void;
}

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printPages(pages: string[], title: string, numbers = true, size: [number, number] = [210, 297]) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.title = title || "Polyphonizer";
  const style = w.document.createElement("style");
  style.textContent =
    `@page{size:${size[0]}mm ${size[1]}mm;margin:0}body{margin:0}div{position:relative;width:${size[0]}mm;height:${size[1]}mm;page-break-after:always;display:flex}svg{width:100%;height:100%}span{position:absolute;bottom:2.5%;width:100%;text-align:center;font:10pt sans-serif;color:#555}`;
  w.document.head.appendChild(style);
  pages.forEach((svg, i) => {
    const div = w.document.createElement("div");
    div.innerHTML = svg; // Verovio's own SVG output
    if (numbers && pages.length > 1) {
      const n = w.document.createElement("span");
      n.textContent = String(i + 1);
      div.appendChild(n);
    }
    w.document.body.appendChild(div);
  });
  setTimeout(() => w.print(), 300);
}

export default function ScoreView({
  score,
  part,
  onPart,
  allParts,
  fullScore,
  onExportCode,
  pagesView = true,
  view = "score",
  onView,
  setup,
  onSetup,
  barText,
  onEditBar,
  onNoteClick,
}: ScoreViewProps) {
  const { t } = useLang();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  // full screen only zooms: the layout keeps the width it had when full screen began (no re-flow)
  const [frozenWidth, setFrozenWidth] = useState<number | null>(null);
  // the full-screen page reader (Pages view): the panel's size, and the first page on show
  const [boxW, setBoxW] = useState(800);
  const [boxH, setBoxH] = useState(600);
  const [readerAt, setReaderAt] = useState(0);
  const swipe = useRef<number | null>(null);
  const [eng, setEng] = useState<Engraving | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [full, setFull] = useState(false);
  // the page setup: from the score's code (editor), or kept here (Learn, which has no Pages view)
  const [localSetup, setLocalSetup] = useState<PageSetup>(DEFAULT_SETUP);
  const cur = setup ?? localSetup;
  const update = onSetup ?? setLocalSetup;
  const stand = cur.stand;
  const minRest = cur.min_rest;
  const planOn = cur.plan_turns;
  const setStand = (v: Stand) => update({ ...cur, stand: v });
  const setMinRest = (v: number) => update({ ...cur, min_rest: Math.max(0, Math.min(30, v)) });
  const setPlanOn = (v: boolean) => update({ ...cur, plan_turns: v });
  // breaks: bar numbers in the code, measure indices for the engraver
  const measures = score?.measures ?? [];
  const layout = {
    barsPerLine: cur.bars_per_line,
    lineBreaks: barIndices(cur.line_breaks, measures),
    pageBreaks: barIndices(cur.page_breaks, measures),
  };
  const reading = full && view === "pages";
  const aspect = cur.width_mm / cur.height_mm;
  const perView = pagesPerView(boxW - 112, boxH - 48, aspect);
  const readerPage = pageSize(boxW - 112, boxH - 48, aspect, perView);
  const pageCount = eng?.pages.length ?? 0;
  const goPage = (to: number | 1 | -1 | "first" | "last", by = false) =>
    setReaderAt((at) =>
      to === "first" ? 0 : to === "last" ? turn(pageCount, 1, perView, pageCount) : by ? turn(at, to as 1 | -1, perView, pageCount) : viewOf(to as number, perView),
    );
  const onLayout = (l: { barsPerLine: number; lineBreaks: number[]; pageBreaks: number[] }) =>
    update({ ...cur, bars_per_line: l.barsPerLine, line_breaks: barNumbers(l.lineBreaks, measures), page_breaks: barNumbers(l.pageBreaks, measures) });
  const [menu, setMenu] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [noteEdit, setNoteEdit] = useState(false);
  /** with one part shown: play it alone, the other parts (to play along), or everything */
  const [partPlay, setPartPlay] = useState<"part" | "others" | "all">("part");
  // playback speed (1 = as written), remembered per score; where ▶ starts (ms of the written tempo)
  const speedKey = `polyphonizer.bpm.${score?.title || "untitled"}`;
  const marked = Math.round(score?.bpm || 96);
  const [bpmText, setBpmText] = useState(String(marked));
  const [speed, setSpeedState] = useState(1);
  // ⤢: the panel fills the window (and the screen, where the browser allows it)
  const panel = useRef<HTMLDivElement>(null);
  const [startMs, setStartMs] = useState(0);
  const [startId, setStartId] = useState<string | null>(null);
  const [clickPlay, setClickPlay] = useState(() => {
    try {
      return localStorage.getItem("polyphonizer.clickNote") !== "off";
    } catch {
      return true;
    }
  });
  /** the running playback: when it started (performance.now()), from where, at what speed */
  const running = useRef<{ at: number; from: number; speed: number } | null>(null);
  /** the bar being edited: where the editor opens, which part and bar, its text */
  const [bar, setBar] = useState<{ x: number; y: number; part: string; n: number; text: string; lost: string[]; error?: string } | null>(null);
  /** forced breaks drawn over the pages: page index, position in % of the page, kind */
  const [marks, setMarks] = useState<{ page: number; left: number; top: number; height: number; kind: "line" | "page"; bar: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setWidth(Math.round(e.contentRect.width / 50) * 50);
      setBoxH(Math.round(e.contentRect.height));
      setBoxW(Math.round(e.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!score) return setEng(null);
    let live = true;
    setBusy(true);
    setStage("engrave");
    stop();
    setPlaying(false);
    (view === "pages"
      ? engravePages(score, cur)
      : engraveScroll(score.musicxml, Math.max(320, layoutWidth(width, frozenWidth) - 24))
    )
      .then((e) => {
        if (!live) return;
        setStage("render");
        setEng(e);
        setErr(null);
        // drawn once the browser has painted the new pages
        requestAnimationFrame(() => requestAnimationFrame(() => setStage("done")));
      })
      .catch((e) => live && (setErr(String(e)), setStage("error")))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, view, view === "pages" ? 0 : layoutWidth(width, frozenWidth), JSON.stringify(cur)]);

  // where the forced breaks are on the pages (drawn as markers at the start of their bars)
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || view !== "pages" || !eng?.measureIds.length) return setMarks([]);
    const out: typeof marks = [];
    const pages = [...el.querySelectorAll<HTMLElement>("[data-page]")];
    for (const [kind, list] of [["line", layout.lineBreaks], ["page", layout.pageBreaks]] as const) {
      for (const bar of list) {
        const id = eng.measureIds[bar];
        if (!id) continue;
        pages.forEach((pg, i) => {
          const m = pg.querySelector(`[id="${CSS.escape(id)}"]`);
          if (!m) return;
          const a = pg.getBoundingClientRect();
          const b = m.getBoundingClientRect();
          out.push({ page: i, kind, bar, left: ((b.left - a.left) / a.width) * 100, top: ((b.top - a.top) / a.height) * 100, height: (b.height / a.height) * 100 });
        });
      }
    }
    setMarks(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng, view, width, JSON.stringify(cur.line_breaks), JSON.stringify(cur.page_breaks)]);

  /** Score view, editing notes: a click on a bar of one staff opens its notes as text */
  const onScoreClick = async (e: React.MouseEvent) => {
    if (!noteEdit || !eng || !score || !barText) return;
    const target = e.target as Element;
    const measure = target.closest("g.measure");
    const staff = target.closest("g.staff");
    if (!measure || !staff) return;
    const index = eng.measureIds.indexOf(measure.id);
    const staffNo = [...measure.querySelectorAll(":scope > g.staff")].indexOf(staff);
    const partName = part !== null ? allParts?.[part] : score.parts[staffNo];
    const n = score.measures[index]?.n;
    if (index < 0 || !partName || n === undefined) return;
    const r = box.current!.getBoundingClientRect();
    const at = { x: e.clientX - r.left + box.current!.scrollLeft, y: e.clientY - r.top + box.current!.scrollTop, part: partName, n };
    try {
      setBar({ ...at, ...(await barText(partName, n)) });
    } catch (err) {
      setBar({ ...at, text: "", lost: [], error: (err as { message?: string }).message ?? String(err) });
    }
  };

  /** edit mode: a click on a bar cycles new line → new page → none */
  const onPagesClick = (e: React.MouseEvent) => {
    if (!editing || !eng) return;
    const id = (e.target as Element).closest("g.measure")?.id;
    const bar = id ? eng.measureIds.indexOf(id) : -1;
    if (bar <= 0) return;
    const line = layout.lineBreaks.includes(bar);
    const page = layout.pageBreaks.includes(bar);
    onLayout({
      ...layout,
      lineBreaks: line ? layout.lineBreaks.filter((b) => b !== bar) : page ? layout.lineBreaks : [...layout.lineBreaks, bar],
      pageBreaks: page ? layout.pageBreaks.filter((b) => b !== bar) : line ? [...layout.pageBreaks, bar] : layout.pageBreaks,
    });
  };

  useEffect(() => () => stop(), []);
  const toggleFull = () => {
    if (full) {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      setFull(false);
      setFrozenWidth(null);
    } else {
      setFrozenWidth(width);
      setFull(true);
      panel.current?.requestFullscreen?.().catch(() => undefined);
    }
  };
  useEffect(() => {
    if (!full) return;
    // Esc closes the note editor first, then leaves full screen; leaving browser full screen leaves ours too
    const onKey = (e: KeyboardEvent) => {
      // page turns (arrows, Page Up/Down from a page-turn pedal, Space …), unless typing in a field
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, select, .cm-editor");
      if (view === "pages" && !typing) {
        const k = keyTurn(e.key);
        if (k !== null) {
          e.preventDefault();
          return goPage(k, true);
        }
      }
      if (e.key !== "Escape") return;
      if (bar) return setBar(null);
      setFull(false);
      setFrozenWidth(null);
    };
    const onChange = () => !document.fullscreenElement && (setFull(false), setFrozenWidth(null));
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, bar, view, perView, pageCount]);
  useEffect(() => setReaderAt(0), [eng]);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(speedKey));
      const bpm = saved >= 30 && saved <= 300 ? saved : marked;
      setBpmText(String(bpm));
      setSpeedState(bpm / marked);
    } catch {
      setBpmText(String(marked));
      setSpeedState(1);
    }
    setStartMs(0);
    setStartId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speedKey, marked]);

  const sound = useSoundSettings();
  const showCursor = sound.cursor !== false;
  const showHighlight = sound.highlight !== false;
  const markRaw = (id: string, on: boolean) =>
    box.current?.querySelector(`[id="${CSS.escape(id)}"]`)?.classList.toggle("pz-playing", on);
  const mark = (id: string, on: boolean) => (showHighlight || !on) && markRaw(id, on);
  /** play from `from` ms (of the written tempo) at speed `spd` */
  const playFrom = async (from: number, spd: number) => {
    if (!eng) return;
    stop();
    setPlaying(true);
    let sounds = eng.sounds;
    let parts = score?.parts ?? [];
    let programs = score?.programs ?? [];
    // one part shown, and the others wanted: the full score's sounds for them, this part's own (they light up)
    if (part !== null && partPlay !== "part" && fullScore) {
      const others = (await timelineOf(fullScore.musicxml)).filter((x) => x.staff !== part);
      const mine = eng.sounds.map((x) => ({ ...x, staff: part }));
      sounds = partPlay === "others" ? others : [...others, ...mine].sort((a, b) => a.time - b.time);
      parts = fullScore.parts;
      programs = fullScore.programs ?? [];
    }
    const scaled = sounds.map((x) => ({ ...x, time: x.time / spd, duration: x.duration / spd }));
    const run = { at: performance.now(), from, speed: spd };
    running.current = run;
    void play(scaled, mark, from / spd, { parts, programs, onLoading: setLoading }).then(
      () => running.current === run && (setPlaying(false), (running.current = null)),
      () => (setPlaying(false), setLoading(false)),
    );
  };
  /** where a running playback is now, in ms of the written tempo */
  const position = () => (running.current ? running.current.from + (performance.now() - running.current.at) * running.current.speed : startMs);

  // which page each note is on (the reader turns to it during playback)
  const idPage = useMemo(() => {
    const m = new Map<string, number>();
    eng?.pages.forEach((svg, i) => {
      for (const x of svg.matchAll(/<g id="([^"]+)" class="(?:note|chord|rest)/g)) m.set(x[1], i);
    });
    return m;
  }, [eng]);
  // the playback cursor: an onset table (time → x, system) from the drawn notes, and a line moved every frame
  const cursorEl = useRef<HTMLDivElement>(null);
  const onsets = useRef<(Onset & { page: number })[]>([]);
  const [cursorShown, setCursorShown] = useState(false);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !eng) return void (onsets.current = []);
    const b = el.getBoundingClientRect();
    const systems = [...el.querySelectorAll("g.system")];
    const items: (Onset & { page: number })[] = [];
    for (const snd of eng.sounds) {
      const note = el.querySelector(`[id="${CSS.escape(snd.id)}"]`);
      const sys = note?.closest("g.system");
      if (!note || !sys) continue;
      const r = note.getBoundingClientRect();
      const sr = sys.getBoundingClientRect();
      const page = Number((note.closest("[data-page]") as HTMLElement | null)?.dataset.page ?? 0);
      items.push({
        time: snd.time,
        x: r.left - b.left + el.scrollLeft,
        top: sr.top - b.top + el.scrollTop,
        height: sr.height,
        system: systems.indexOf(sys),
        page,
      });
    }
    onsets.current = onsetTable(items) as (Onset & { page: number })[];
  }, [eng, width, full, view, readerAt, boxH]);
  /** put the line where the music is at `t` (ms, written tempo); scroll it into view if it left */
  const placeCursor = (t: number) => {
    const c = cursorEl.current;
    const el = box.current;
    const glide = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const at = cursorAt(onsets.current, t, glide);
    if (!c || !el || !at) return;
    c.style.transform = `translate(${at.x}px, ${at.top}px)`;
    c.style.height = `${at.height}px`;
    if (at.top < el.scrollTop || at.top + at.height > el.scrollTop + el.clientHeight)
      el.scrollTo({ top: Math.max(0, at.top - 24), behavior: glide ? "smooth" : "auto" });
  };
  useEffect(() => {
    if (!playing || !showCursor) return;
    setCursorShown(true);
    let raf = 0;
    const tick = () => {
      const t = position();
      if (reading && eng) {
        // the reader follows the music: the page of the note sounding now
        let lo = 0;
        while (lo + 1 < eng.sounds.length && eng.sounds[lo + 1].time <= t) lo++;
        const page = idPage.get(eng.sounds[lo]?.id ?? "");
        if (page !== undefined) setReaderAt((at) => (page < at || page >= at + perView ? viewOf(page, perView) : at));
      }
      placeCursor(t);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, showCursor, eng, reading, perView]);
  // stopped: the line stays; a clicked start moves it there
  useEffect(() => {
    if (!playing && cursorShown && showCursor) placeCursor(startMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMs]);
  useEffect(() => setCursorShown(false), [eng]);
  const toggle = () => {
    if (playing) {
      running.current = null;
      setPlaying(false);
      return stop();
    }
    void playFrom(startMs, speed);
  };
  /** the playback tempo, ♩ per minute (30–300); a running playback carries on from where it is */
  const applyBpm = (v: number) => {
    const bpm = Number.isFinite(v) && v > 0 ? Math.min(300, Math.max(30, Math.round(v))) : marked;
    const spd = bpm / marked;
    setBpmText(String(bpm));
    setSpeedState(spd);
    try {
      if (bpm === marked) localStorage.removeItem(speedKey);
      else localStorage.setItem(speedKey, String(bpm));
    } catch {
      /* storage unavailable */
    }
    if (playing && spd !== speed) void playFrom(position(), spd);
  };
  /** click-note mode: start playback at the clicked note and show its code */
  const onNote = (e: React.MouseEvent) => {
    if (!clickPlay || noteEdit || editing || !eng || !score) return;
    const target = e.target as Element;
    let el = target.closest("g.note, g.rest, g.chord, g.mRest");
    if (!el) return;
    if (el.matches("g.note") && el.closest("g.chord")) el = el.closest("g.chord")!;
    // its time: the first sounding note inside it (a rest starts where the next note does)
    const ids = el.matches("g.note") ? [el.id] : [...el.querySelectorAll("g.note")].map((n) => n.id);
    const sound = eng.sounds.find((s) => ids.includes(s.id));
    const measure = el.closest("g.measure");
    const staff = el.closest("g.staff");
    const layer = el.closest("g.layer");
    if (measure && !sound) {
      // a rest: start at the next sound in its bar, else keep the start
      const later = [...measure.querySelectorAll("g.note")].map((n) => eng.sounds.find((s) => s.id === n.id)).filter(Boolean);
      if (later[0]) setStartMs(later[0]!.time);
    } else if (sound) setStartMs(sound.time);
    setStartId(el.id);
    if (sound && playing) void playFrom(sound.time, speed);
    if (!measure || !staff || !layer || !onNoteClick) return;
    const mIndex = eng.measureIds.indexOf(measure.id);
    const staffNo = [...measure.querySelectorAll(":scope > g.staff")].indexOf(staff);
    const partIndex = part !== null ? part : staffNo;
    const partName = part !== null ? allParts?.[part] : score.parts[staffNo];
    const events = [...layer.querySelectorAll("g.note, g.rest, g.chord, g.mRest")].filter((x) => !(x.matches("g.note") && x.closest("g.chord")));
    const inBar = events.indexOf(el);
    const bar = score.measures[mIndex];
    if (!partName || !bar || inBar < 0) return;
    // events of this part before this bar (the sheet's own part is index 0 in its score)
    const p = part !== null ? 0 : staffNo;
    const before = score.notes.filter((n) => n.part === p && n.offset < bar.offset - 1e-9).length;
    onNoteClick({ part: partName, partIndex, bar: bar.n, index: before + inBar });
  };
  useEffect(() => {
    const el = startId ? box.current?.querySelector(`[id="${CSS.escape(startId)}"]`) : null;
    el?.classList.add("pz-start");
    return () => el?.classList.remove("pz-start");
  }, [startId, eng]);
  const name = (score?.title || "score").replace(/[^\w-]+/g, "_");
  const small = `${BUTTON} shadow-sm`;
  const btn = BUTTON;

  return (
    <div ref={panel} className={`flex flex-col bg-white ${full ? "fixed inset-0 z-50" : "h-full min-h-[24rem]"}`} data-testid="score-panel">
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-gray-200 bg-white px-2 py-1.5 lg:flex-wrap lg:overflow-visible">
        {allParts && allParts.length > 1 && (
          <label className="inline-flex shrink-0 items-center" title={t("pages.part")}>
            <select
              value={part ?? -1}
              onChange={(e) => onPart?.(Number(e.target.value) < 0 ? null : Number(e.target.value))}
              className={`${FIELD} max-w-36`}
              aria-label={t("pages.part")}
              data-testid="part-picker"
            >
              <option value={-1}>{t("pages.full")}</option>
              {allParts.map((p, i) => (
                <option key={i} value={i}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        )}
        {part !== null && fullScore && (
          <select
            value={partPlay}
            onChange={(e) => {
              setPartPlay(e.target.value as "part" | "others" | "all");
              if (playing) stop(), setPlaying(false);
            }}
            className={`${FIELD} max-w-36`}
            aria-label={t("partPlay.label")}
            title={t("partPlay.label")}
            data-testid="part-play"
          >
            <option value="part">{t("partPlay.part")}</option>
            <option value="others">{t("partPlay.others")}</option>
            <option value="all">{t("partPlay.all")}</option>
          </select>
        )}
        {pagesView && (
          <div className={SEGMENTS} role="tablist">
            {(["score", "pages"] as View[]).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => onView?.(v)}
                className={`${SEGMENT} ${view === v ? "bg-(--lk-accent) text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                {t(`view.${v}`)}
              </button>
            ))}
          </div>
        )}
        <label className={`${CHECK} gap-1`} title={t("speed.title")}>
          <Icon icon={Gauge} className="text-gray-500" />♩ =
          <input
            type="number"
            min={30}
            max={300}
            step={1}
            value={bpmText}
            disabled={!eng}
            onChange={(e) => setBpmText(e.target.value)}
            onBlur={() => applyBpm(Number(bpmText))}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyBpm(Number(bpmText));
              if ((e.key === "ArrowUp" || e.key === "ArrowDown") && e.shiftKey) {
                e.preventDefault();
                applyBpm(Number(bpmText) + (e.key === "ArrowUp" ? 10 : -10));
              }
            }}
            className={`${FIELD} w-14 px-1 tabular-nums ${speed !== 1 ? "border-(--lk-accent) text-(--lk-accent)" : ""}`}
            aria-label={t("speed.title")}
            data-testid="bpm"
          />
          {speed !== 1 && (
            <button onClick={() => applyBpm(marked)} className="text-gray-400 hover:text-gray-700" title={t("speed.reset")} aria-label={t("speed.reset")}>
              <Icon icon={RotateCcw} className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
        <button onClick={toggle} disabled={!eng || busy} className={btn} data-testid="play">
          <Icon icon={playing ? Square : Play} />
          {playing ? t("stop") : t("play")}
        </button>
        {loading && <span className="text-xs text-gray-500">{t("play.loading")}</span>}

        <div className="relative">
          <button
            onClick={() => setSoundOpen((o) => !o)}
            disabled={!score}
            className={btn}
            aria-expanded={soundOpen}
            data-testid="sound"
            title={t("sound.title")}
          >
            <Icon icon={Music} /> {t("sound.button")}
          </button>
          {soundOpen && score && <SoundPanel parts={score.parts} programs={score.programs ?? []} onClose={() => setSoundOpen(false)} />}
        </div>
        {view === "score" && onEditBar && (
          <button
            onClick={() => (setNoteEdit((x) => !x), setBar(null))}
            disabled={!score}
            aria-pressed={noteEdit}
            className={noteEdit ? BUTTON_ON : BUTTON}
            data-testid="edit-notes"
            title={t("edit.hint")}
          >
            <Icon icon={PencilLine} /> {t("edit.notes")}
          </button>
        )}
        <label className={CHECK} title={t("click.hint")}>
          <input
            type="checkbox"
            checked={clickPlay}
            onChange={(e) => {
              setClickPlay(e.target.checked);
              if (!e.target.checked) setStartId(null);
              try {
                localStorage.setItem("polyphonizer.clickNote", e.target.checked ? "on" : "off");
              } catch {
                /* storage unavailable */
              }
            }}
            data-testid="click-note"
          />
          {t("click.label")}
        </label>
        {busy && <span className="text-xs text-gray-500">{view === "pages" ? t("pages.engraving") : "…"}</span>}
        {eng && view === "pages" && <span className="text-xs text-gray-500">{fill(t("pages.count"), { n: eng.pages.length })}</span>}
      </div>

      {view === "pages" && !reading && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <label className="flex items-center gap-1.5">
            {t("pages.stand")}
            <select value={stand} onChange={(e) => setStand(e.target.value as Stand)} className="rounded border border-gray-300 bg-white px-1.5 py-0.5">
              {(["single", "spread", "spread-right"] as Stand[]).map((s) => (
                <option key={s} value={s}>
                  {t(`stand.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            {t("pages.minRest")}
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={minRest}
              onChange={(e) => setMinRest(Number(e.target.value))}
              className="w-16 rounded border border-gray-300 bg-white px-1.5 py-0.5"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={planOn} onChange={(e) => setPlanOn(e.target.checked)} data-testid="plan-toggle" />
            {t("pages.plan")}
          </label>
          <label className="flex items-center gap-1.5">
            {t("layout.paper")}
            <select
              value={typeof cur.paper === "string" ? cur.paper : ""}
              onChange={(e) =>
                update(e.target.value === "fit" ? withPaper(cur, screenPaper(window.screen.width, window.screen.height)) : withPaper(cur, e.target.value))
              }
              className="rounded border border-gray-300 bg-white px-1.5 py-0.5"
              data-testid="paper"
            >
              {typeof cur.paper !== "string" && <option value="">{`${cur.width_mm} × ${cur.height_mm} mm`}</option>}
              <optgroup label={t("layout.papers")}>
                {Object.keys(PAPERS)
                  .filter((p) => !SCREENS.has(p))
                  .map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
              </optgroup>
              <optgroup label={t("layout.screens")}>
                {Object.keys(PAPERS)
                  .filter((p) => SCREENS.has(p))
                  .map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                <option value="fit">{t("layout.fitScreen")}</option>
              </optgroup>
            </select>
          </label>
          {(
            <>
              <span className="hidden h-5 border-l border-gray-300 sm:block" />
              <label className="flex items-center gap-1.5">
                {t("layout.barsPerLine")}
                <select
                  value={layout.barsPerLine}
                  onChange={(e) => onLayout({ ...layout, barsPerLine: Number(e.target.value) })}
                  className="rounded border border-gray-300 bg-white px-1.5 py-0.5"
                  data-testid="bars-per-line"
                >
                  <option value={0}>{t("layout.auto")}</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5">
                {t("layout.scale")}
                <select
                  value={cur.staff_size}
                  onChange={(e) => update({ ...cur, staff_size: Number(e.target.value) })}
                  className="rounded border border-gray-300 bg-white px-1.5 py-0.5"
                  data-testid="staff-size"
                >
                  {[5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map((mm) => (
                    <option key={mm} value={mm}>
                      {mm} mm
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => setEditing((x) => !x)}
                aria-pressed={editing}
                className={`rounded-md border px-2 py-0.5 ${editing ? "border-(--lk-accent) bg-(--lk-accent) text-white" : "border-gray-300 bg-white hover:bg-gray-100"}`}
                data-testid="edit-breaks"
              >
                <Icon icon={PencilLine} /> {t("layout.edit")}
              </button>
              {(layout.lineBreaks.length > 0 || layout.pageBreaks.length > 0) && (
                <button onClick={() => onLayout({ ...layout, lineBreaks: [], pageBreaks: [] })} className="text-(--lk-accent) hover:underline">
                  {t("layout.clear")}
                </button>
              )}
              {editing && <span className="basis-full text-xs text-gray-500">{t("layout.editHint")}</span>}
            </>
          )}
        </div>
      )}

      {view === "pages" && !reading && eng?.plan && (
        <div className="border-b border-gray-200 bg-white px-3 py-2 text-sm" data-testid="turns">
          <span className="font-medium text-gray-900">{t("pages.turns")}: </span>
          {eng.plan.turns.length === 0 ? (
            <span className="text-gray-600">{t("pages.noTurns")}</span>
          ) : (
            <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
              {eng.plan.turns.map((tu) => (
                <span key={tu.afterPage} className={tu.ok ? "text-emerald-700" : "text-red-700"}>
                  {tu.ok ? "✓" : "✗"}{" "}
                  {fill(t("pages.turnAt"), {
                    page: tu.afterPage,
                    bar: score?.measures[tu.measure]?.n ?? tu.measure + 1,
                    rest: tu.rest.toFixed(1),
                  })}
                  {!tu.ok && ` (${t("pages.bad")})`}
                </span>
              ))}
            </span>
          )}
        </div>
      )}

      <ProgressLine />
      {view === "score" && noteEdit && <p className="border-b border-gray-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-900">{t("edit.hint")}</p>}
      <div ref={box} className={`pz-score relative min-h-0 flex-1 bg-gray-100 p-3 ${reading ? "overflow-hidden" : "overflow-auto"}`} data-testid="score">
        {/* export and full screen: just above the sheet, staying in view while the score scrolls */}
        <div className="pointer-events-none sticky top-0 z-20 -mb-2 flex justify-end gap-1.5 [&>*]:pointer-events-auto" data-testid="score-actions">
          {onExportCode !== undefined && (
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} disabled={!score} className={small} aria-expanded={menu}>
                <Icon icon={Download} /> {t("export")} <Icon icon={ChevronDown} className="h-3.5 w-3.5" />
              </button>
              {menu && score && (
                <div
                  className="absolute right-0 z-20 mt-1 flex w-72 flex-col rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-lg"
                  onMouseLeave={() => setMenu(false)}
                >
                  {[
                    ["export.musicxml", () => download(`${name}.musicxml`, score.musicxml, "application/vnd.recordare.musicxml+xml")],
                    ["export.midi", async () => download(`${name}.mid`, (await midiFile()) as BlobPart, "audio/midi")],
                    ["export.print", async () => printPages((await engravePages(score, cur)).pages, score.title, cur.page_numbers, [cur.width_mm, cur.height_mm])],
                    ["export.code", onExportCode],
                  ].map(([k, f]) => (
                    <button
                      key={k as string}
                      onClick={() => (setMenu(false), void (f as () => unknown)())}
                      className="rounded-md px-3 py-2 text-left hover:bg-gray-100"
                    >
                      {t(k as string)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={toggleFull}
            className={small}
            title={t(full ? "full.exit" : "full.enter")}
            aria-label={t(full ? "full.exit" : "full.enter")}
            aria-pressed={full}
            data-testid="fullscreen"
          >
            <Icon icon={full ? Minimize2 : Maximize2} />
          </button>
        </div>
        {showCursor && cursorShown && (
          <div
            ref={cursorEl}
            className="pointer-events-none absolute top-0 left-0 z-10 w-0.5 rounded-full bg-(--lk-accent) opacity-70"
            aria-hidden
            data-testid="play-cursor"
          />
        )}
        {bar && (
          <BarEditor
            bar={bar}
            onChange={(text) => setBar({ ...bar, text })}
            onApply={() => {
              onEditBar?.(bar.part, bar.n, bar.text.trim());
              setBar(null);
            }}
            onClose={() => setBar(null)}
          />
        )}
        {err && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>}
        {!score && !err && <p className="p-6 text-center text-sm text-gray-500">{t("view.empty")}</p>}
        {eng &&
          (reading ? (
            <div
              className="absolute inset-0 flex touch-pan-y items-center justify-center gap-4 p-3 select-none"
              onPointerDown={(e) => (swipe.current = e.clientX)}
              onPointerUp={(e) => {
                const dx = swipe.current === null ? 0 : e.clientX - swipe.current;
                swipe.current = null;
                if (Math.abs(dx) > 60) goPage(dx < 0 ? 1 : -1, true);
              }}
              onClick={(e) => onNote(e)}
              data-testid="reader"
            >
              {eng.pages.slice(readerAt, readerAt + perView).map((svg, k) => (
                <div key={readerAt + k} className="relative shrink-0" style={{ width: readerPage.w, height: readerPage.h }}>
                  <div
                    data-page={readerAt + k}
                    className={`h-full w-full bg-white shadow-md [&>svg]:h-full [&>svg]:w-full ${clickPlay ? "pz-clickable" : ""}`}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                  {cur.page_numbers && pageCount > 1 && (
                    <span className="pointer-events-none absolute bottom-[2.5%] left-0 w-full text-center text-[11px] text-gray-500">{readerAt + k + 1}</span>
                  )}
                </div>
              ))}
              <button
                onClick={(e) => (e.stopPropagation(), goPage(-1, true))}
                disabled={readerAt === 0}
                className="absolute top-1/2 left-2 flex h-24 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/10 text-gray-700 transition hover:bg-black/25 disabled:opacity-0"
                aria-label={t("reader.prev")}
                title={t("reader.prev")}
                data-testid="reader-prev"
              >
                <Icon icon={ChevronLeft} className="h-7 w-7" />
              </button>
              <button
                onClick={(e) => (e.stopPropagation(), goPage(1, true))}
                disabled={readerAt + perView >= pageCount}
                className="absolute top-1/2 right-2 flex h-24 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/10 text-gray-700 transition hover:bg-black/25 disabled:opacity-0"
                aria-label={t("reader.next")}
                title={t("reader.next")}
                data-testid="reader-next"
              >
                <Icon icon={ChevronRight} className="h-7 w-7" />
              </button>
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/10 px-2 py-0.5 text-xs text-gray-700 tabular-nums" data-testid="reader-at">
                {perView === 2 && readerAt + 1 < pageCount ? `${readerAt + 1}–${readerAt + 2}` : readerAt + 1} / {pageCount}
              </span>
            </div>
          ) : view === "pages" ? (
            <div className={`flex flex-wrap justify-center gap-4 ${editing ? "pz-edit" : clickPlay ? "pz-clickable" : ""}`} onClick={(e) => (editing ? onPagesClick(e) : onNote(e))}>
              {eng.pages.map((svg, i) => (
                <div key={i} className="relative [content-visibility:auto] [contain-intrinsic-size:auto_600px]">
                  <div
                    data-page={i}
                    className={`${full ? "w-[min(100%,calc((100vh-9rem)*210/297))]" : "w-[min(100%,420px)]"} min-w-[280px] bg-white shadow-md [aspect-ratio:210/297] [&>svg]:h-full [&>svg]:w-full`}
                    // Verovio's own SVG output
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                  {marks
                    .filter((m) => m.page === i)
                    .map((m) => (
                      <span
                        key={`${m.kind}-${m.bar}`}
                        className={`pointer-events-none absolute w-1 rounded-full ${m.kind === "page" ? "bg-(--lk-accent)" : "bg-sky-500"}`}
                        style={{ left: `calc(${m.left}% - 3px)`, top: `${m.top}%`, height: `${Math.max(2, m.height)}%` }}
                        title={t(m.kind === "page" ? "layout.page" : "layout.line")}
                        data-testid={`mark-${m.kind}`}
                      />
                    ))}
                  <span className="absolute -bottom-5 left-0 right-0 text-center text-xs text-gray-500">
                    {i + 1}
                    {eng.plan?.turns.some((x) => x.afterPage === i + 1) ? " ↻" : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className={noteEdit ? "pz-edit" : clickPlay ? "pz-clickable" : ""} onClick={(e) => (noteEdit ? void onScoreClick(e) : onNote(e))}>
            {eng.pages.map((svg, i) => (
              <div
                key={i}
                className="mx-auto bg-white shadow-sm [content-visibility:auto] [contain-intrinsic-size:auto_800px] [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ))}
            </div>
          ))}
      </div>
    </div>
  );
}

/** The note editor for one bar: its notes as text (tinyNotation, chords as <c e g>4), applied as an edit_bar() line. */
function BarEditor({
  bar,
  onChange,
  onApply,
  onClose,
}: {
  bar: { x: number; y: number; part: string; n: number; text: string; lost: string[]; error?: string };
  onChange: (text: string) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const { t } = useLang();
  return (
    <div
      className="absolute z-30 w-[min(28rem,calc(100%-1.5rem))] rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-lg"
      style={{ left: Math.max(12, Math.min(bar.x - 40, 9999)), top: bar.y + 14 }}
      role="dialog"
      aria-label={t("edit.title")}
      data-testid="bar-editor"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <b className="text-gray-900">{fill(t("edit.title"), { part: bar.part, bar: bar.n })}</b>
        <button onClick={onClose} aria-label={t("sound.close")} className="ml-auto px-1 text-lg leading-none text-gray-400 hover:text-gray-700">
          <Icon icon={X} />
        </button>
      </div>
      {bar.error ? (
        <p className="mt-2 text-red-700">{bar.error}</p>
      ) : (
        <>
          <input
            autoFocus
            value={bar.text}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onApply();
              if (e.key === "Escape") onClose();
            }}
            spellCheck={false}
            className="mt-2 w-full rounded border border-gray-300 px-2 py-1 font-mono text-sm focus:border-(--lk-accent) focus:outline-none"
            data-testid="bar-text"
          />
          <p className="mt-1.5 text-xs text-gray-500">{t("edit.syntax")}</p>
          {bar.lost.length > 0 && <p className="mt-1 text-xs text-amber-800">⚠ {fill(t("edit.lost"), { what: bar.lost.join(", ") })}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={onClose} className="rounded-md border border-gray-300 px-2.5 py-1 text-gray-700 hover:bg-gray-50">
              {t("edit.cancel")}
            </button>
            <button onClick={onApply} className="rounded-md bg-(--lk-accent) px-3 py-1 font-medium text-white hover:opacity-90" data-testid="bar-apply">
              {t("edit.apply")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** the thin compile-progress line over the score: stage ranges from progress.ts, creeping within a stage */
function ProgressLine() {
  const { pick } = useLang();
  const [stage, since] = useStage();
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (stage === "idle") return setPct(0);
    const [from, to] = RANGE[stage];
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (still || from === to) return setPct(to === 100 && from === 100 ? 100 : from);
    let raf = 0;
    const tick = () => {
      // ease out towards the stage's end, never quite reaching it
      const s = (performance.now() - since) / 1000;
      setPct(from + (to - from) * 0.9 * (1 - Math.exp(-s / 1.5)));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [stage, since]);
  const names: Record<string, [string, string]> = {
    python: ["starting Python", "啟動 Python"],
    music21: ["loading music21", "載入 music21"],
    run: ["running the code", "執行程式碼"],
    engrave: ["engraving", "排版"],
    render: ["drawing the pages", "繪製頁面"],
    done: ["done", "完成"],
    error: ["failed", "失敗"],
  };
  const label = stage === "idle" ? "" : `${pick(["Compiling", "編譯中"])}: ${pick(names[stage])}…`;
  return (
    <div className="relative h-0.5 shrink-0 overflow-hidden bg-transparent" aria-hidden={stage === "idle"}>
      {stage !== "idle" && (
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          title={label}
          data-testid="compile-progress"
          data-stage={stage}
          className={`h-full transition-[width,opacity] duration-300 ${stage === "error" ? "bg-red-600" : "bg-(--lk-accent)"} ${stage === "done" ? "opacity-0 delay-150" : "opacity-100"}`}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
