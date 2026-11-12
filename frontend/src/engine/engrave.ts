/**
 * Engraving with Verovio (WebAssembly, in the page): MusicXML in, SVG pages and a playback timeline out.
 *
 * Two layouts:
 * - "scroll": one long page that fits the panel's width (the editor's live view);
 * - "pages": A4 pages, with page breaks chosen by the page-turn planner (pageTurns.ts). Verovio first breaks the
 *   music into systems; we read which measures each system holds, plan the pages, write the breaks into the MEI
 *   (<sb/> and <pb/>) and lay it out again with breaks "encoded".
 */
import type { VerovioToolkit } from "verovio/esm";
import { fixAbcKeys } from "./abc.ts";
import { planPages, restAtMeasureStarts, turnsAt, type Plan, type Stand } from "./pageTurns.ts";
import type { ScoreData } from "./types.ts";

type Module = Awaited<ReturnType<typeof import("verovio/wasm")["default"]>>;
let module: Promise<[Module, typeof import("verovio/esm")]> | null = null;
/** Verovio's WebAssembly, loaded once; each toolkit made from it keeps its own score */
function verovio() {
  module ??= Promise.all([import("verovio/wasm"), import("verovio/esm")]).then(async ([wasm, esm]) => [await wasm.default(), esm]);
  return module;
}
let toolkit: Promise<VerovioToolkit> | null = null;
/** the editor's toolkit (its last score is what Export ▸ MIDI writes) */
function tk(): Promise<VerovioToolkit> {
  toolkit ??= verovio().then(([m, esm]) => new esm.VerovioToolkit(m));
  return toolkit;
}
let snippetTk: Promise<VerovioToolkit> | null = null;

/**
 * A short example for a page (ABC, Humdrum or MusicXML, which Verovio reads itself, so no Python is needed): one SVG
 * at the given width, and its sounds. Uses its own toolkit, so it never disturbs the editor's score.
 */
export async function engraveSnippet(data: string, widthPx: number, zoom = 38, abc?: string): Promise<{ svg: string; sounds: Sound[] }> {
  snippetTk ??= verovio().then(([m, esm]) => new esm.VerovioToolkit(m));
  const t = await snippetTk;
  t.setOptions({
    ...BASE,
    scale: zoom,
    pageWidth: Math.max(600, Math.round((widthPx * 100) / zoom)),
    pageHeight: 60000,
    adjustPageHeight: true,
    breaks: "auto",
    header: "none",
    pageMarginTop: 20,
    pageMarginBottom: 20,
    pageMarginLeft: 20,
    pageMarginRight: 20,
  });
  if (!t.loadData(data)) throw new Error("Verovio could not read this example");
  // single-voice ABC: correct the key that Verovio's ABC reader carries over from the previous example
  if (abc !== undefined && !data.startsWith("<")) t.loadData(fixAbcKeys(t.getMEI({}), abc));
  return { svg: untitled(t.renderToSVG(1)), sounds: timeline(t) };
}

/** one note-on in the timeline */
export interface Sound {
  id: string;
  pitch: number;
  /** ms */
  time: number;
  duration: number;
  /** staff index from the top, 0-based; one staff per music21 part (a piano's two staves are two parts) */
  staff: number;
}
export interface Engraving {
  pages: string[];
  sounds: Sound[];
  plan: Plan | null;
  /** Verovio's id of each measure, by measure index (to click a bar) */
  measureIds: string[];
}

const MEASURE = /<measure\b[^>]*xml:id="([^"]+)"/g;
const BASE = { svgViewBox: true, svgRemoveXlink: true, footer: "none", mmOutput: false } as const;

/** note id → staff index (0-based), read from the MEI's <staff n="…"> elements */
function staffOfNotes(t: VerovioToolkit): Map<string, number> {
  const doc = new DOMParser().parseFromString(t.getMEI({}), "application/xml");
  const out = new Map<string, number>();
  for (const staff of doc.getElementsByTagName("staff")) {
    const n = Number(staff.getAttribute("n") ?? 1) - 1;
    for (const note of staff.getElementsByTagName("note")) {
      const id = note.getAttribute("xml:id");
      if (id) out.set(id, n);
    }
  }
  return out;
}

/** Verovio's SVG names elements in <title> tags, which browsers show as "title" tooltips: drop them */
export const untitled = (svg: string) => svg.replace(/<title\b[^>]*>[^<]*<\/title>/g, "");

function timeline(t: VerovioToolkit): Sound[] {
  const staffOf = staffOfNotes(t);
  const out: Sound[] = [];
  for (const ev of t.renderToTimemap() as { on?: string[] }[]) {
    for (const id of ev.on ?? []) {
      const v = t.getMIDIValuesForElement(id) as { pitch: number; time: number; duration: number };
      if (v && v.pitch > 0) out.push({ id, pitch: v.pitch, time: v.time, duration: v.duration, staff: staffOf.get(id) ?? 0 });
    }
  }
  return out;
}

/**
 * The editor's live view: the score at the panel's width, cut into chunks a screen or two tall (separate SVGs, so a
 * long score only paints what is on screen).
 */
export async function engraveScroll(xml: string, widthPx: number, zoom = 40): Promise<Engraving> {
  const t = await tk();
  // Verovio units: pageWidth is in tenths of a staff unit at scale 100; scale it so the page fits the panel
  t.setOptions({
    ...BASE,
    scale: zoom,
    pageWidth: Math.max(800, Math.round((widthPx * 100) / zoom)),
    pageHeight: 6000,
    adjustPageHeight: true,
    breaks: "auto",
    header: "auto",
  });
  t.loadData(xml);
  const pages = Array.from({ length: t.getPageCount() }, (_, i) => untitled(t.renderToSVG(i + 1)));
  const measureIds = [...t.getMEI({}).matchAll(MEASURE)].map((m) => m[1]);
  return { pages, sounds: timeline(t), plan: null, measureIds };
}

/** The player's own layout of a sheet: kept per sheet (full score, each part) with the project. */
export interface Layout {
  /** bars on every line; 0 = as many as fit */
  barsPerLine: number;
  /** staff size: Verovio's scale, 50 = default */
  scale: number;
  /** measure indices (0-based, into the score's measures) that must start a new line / a new page */
  lineBreaks: number[];
  pageBreaks: number[];
}
export const DEFAULT_LAYOUT: Layout = { barsPerLine: 0, scale: 50, lineBreaks: [], pageBreaks: [] };

export interface PageOptions {
  stand: Stand;
  minRest: number;
  /** "plan" moves page breaks to the rests; "plain" just fills the pages */
  mode: "plan" | "plain";
  layout?: Layout;
}

/** A4 portrait at Verovio's default unit (10 per mm) */
const A4 = { pageWidth: 2100, pageHeight: 2970, pageMarginTop: 80, pageMarginBottom: 80, pageMarginLeft: 100, pageMarginRight: 100 };

/**
 * A4 pages in three passes: (1) Verovio's own line breaks, unless the layout fixes the bars per line; the player's
 * forced breaks are added; (2) those lines with Verovio's page breaks, to learn how many lines fit on a page;
 * (3) the page breaks chosen by the planner (pageTurns.ts), which keeps the forced page breaks.
 */
export async function engravePages(score: ScoreData, opts: PageOptions): Promise<Engraving> {
  const t = await tk();
  const layout = opts.layout ?? DEFAULT_LAYOUT;
  t.setOptions({ ...BASE, ...A4, scale: layout.scale, adjustPageHeight: false, breaks: "auto", header: "auto" });
  t.loadData(score.musicxml);
  const parser = new DOMParser();
  const firstMeasures = (svg: string) =>
    [...parser.parseFromString(svg, "image/svg+xml").querySelectorAll("g.system")].map((sys) => sys.querySelector("g.measure")?.id);
  const mei = t.getMEI({}).replace(/<(sb|pb)\b[^>]*\/>/g, "");
  const ids = [...mei.matchAll(MEASURE)].map((m) => m[1]);
  const index = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;
  if (!n) return { pages: [], sounds: [], plan: null, measureIds: [] };

  // 1. lines
  const autoStarts = new Set<number>();
  if (!layout.barsPerLine)
    for (let p = 1; p <= t.getPageCount(); p++) for (const id of firstMeasures(t.renderToSVG(p))) if (id) autoStarts.add(index.get(id) ?? -1);
  const forcedLine = new Set([...layout.lineBreaks, ...layout.pageBreaks].filter((m) => m > 0 && m < n));
  const starts: number[] = [];
  for (let m = 0, last = 0; m < n; m++) {
    const begin = m === 0 || forcedLine.has(m) || (layout.barsPerLine ? m - last >= layout.barsPerLine : autoStarts.has(m));
    if (begin) {
      starts.push(m);
      last = m;
    }
  }
  const lineStart = new Set(starts.slice(1));
  const withBreaks = (pageStart: Set<number>) =>
    mei.replace(MEASURE, (tag, id: string) => {
      const i = index.get(id) ?? 0;
      return pageStart.has(i) ? `<pb/>${tag}` : lineStart.has(i) ? `<sb/>${tag}` : tag;
    });

  // 2. how many of these lines fit on a page
  t.setOptions({ breaks: "line" });
  t.loadData(withBreaks(new Set()));
  let perPage = 1;
  for (let p = 1; p <= t.getPageCount(); p++) perPage = Math.max(perPage, firstMeasures(t.renderToSVG(p)).length);

  // 3. plan the pages and lay them out
  const restAt = restAtMeasureStarts(score.notes, score.measures, score.bpm, score.parts.map((_, i) => i));
  const forcedPage = new Set(layout.pageBreaks);
  const plan = planPages({
    systemStarts: starts,
    restAt,
    perPage,
    stand: opts.stand,
    // "plain": fill the pages and only report the turns
    minRest: opts.mode === "plan" ? opts.minRest : 0,
    forcedStarts: starts.flatMap((m, s) => (forcedPage.has(m) ? [s] : [])),
  });
  t.setOptions({ breaks: "encoded" });
  t.loadData(withBreaks(new Set(plan.pageStarts.slice(1).map((s) => starts[s]))));
  const pages = Array.from({ length: t.getPageCount() }, (_, i) => untitled(t.renderToSVG(i + 1)));
  // report the turns of the pages as laid out
  const rendered = pages.map((svg) => index.get(firstMeasures(svg)[0] ?? "") ?? -1);
  const turns = rendered.every((m) => m >= 0) ? turnsAt(rendered, restAt, opts.stand, opts.minRest) : plan.turns;
  return { pages, sounds: timeline(t), plan: { ...plan, turns, ok: turns.every((x) => x.ok) }, measureIds: ids };
}

const timelines = new Map<string, Promise<Sound[]>>();
/** the sounds of a score without drawing it (the full score while one part is shown: play-along practice) */
export function timelineOf(xml: string): Promise<Sound[]> {
  let p = timelines.get(xml);
  if (!p) {
    snippetTk ??= verovio().then(([m, esm]) => new esm.VerovioToolkit(m));
    p = snippetTk.then((t) => {
      t.setOptions({ ...BASE, breaks: "none", header: "none" });
      t.loadData(xml);
      return timeline(t);
    });
    timelines.clear(); // keep only the latest score
    timelines.set(xml, p);
  }
  return p;
}

/** MIDI file of the last engraved score */
export async function midiFile(): Promise<Uint8Array> {
  const b64 = (await tk()).renderToMIDI();
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
