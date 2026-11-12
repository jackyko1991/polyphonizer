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
import { planPages, restAtMeasureStarts, type Plan, type Stand } from "./pageTurns.ts";
import type { ScoreData } from "./types.ts";

let toolkit: Promise<VerovioToolkit> | null = null;
function tk(): Promise<VerovioToolkit> {
  toolkit ??= Promise.all([import("verovio/wasm"), import("verovio/esm")]).then(
    async ([wasm, esm]) => new esm.VerovioToolkit(await wasm.default()),
  );
  return toolkit;
}

/** one note-on in the timeline */
export interface Sound {
  id: string;
  pitch: number;
  /** ms */
  time: number;
  duration: number;
}
export interface Engraving {
  pages: string[];
  sounds: Sound[];
  plan: Plan | null;
}

const BASE = { svgViewBox: true, svgRemoveXlink: true, footer: "none", mmOutput: false } as const;

function timeline(t: VerovioToolkit): Sound[] {
  const out: Sound[] = [];
  for (const ev of t.renderToTimemap() as { on?: string[] }[]) {
    for (const id of ev.on ?? []) {
      const v = t.getMIDIValuesForElement(id) as { pitch: number; time: number; duration: number };
      if (v && v.pitch > 0) out.push({ id, pitch: v.pitch, time: v.time, duration: v.duration });
    }
  }
  return out;
}

export async function engraveScroll(xml: string, widthPx: number, zoom = 40): Promise<Engraving> {
  const t = await tk();
  // Verovio units: pageWidth is in tenths of a staff unit at scale 100; scale it so the page fits the panel
  t.setOptions({
    ...BASE,
    scale: zoom,
    pageWidth: Math.max(800, Math.round((widthPx * 100) / zoom)),
    pageHeight: 60000,
    adjustPageHeight: true,
    breaks: "auto",
    header: "auto",
  });
  t.loadData(xml);
  const pages = Array.from({ length: t.getPageCount() }, (_, i) => t.renderToSVG(i + 1));
  return { pages, sounds: timeline(t), plan: null };
}

export interface PageOptions {
  stand: Stand;
  minRest: number;
  /** "plan" moves page breaks to the rests; "plain" is Verovio's own pagination */
  mode: "plan" | "plain";
}

/** A4 portrait at Verovio's default unit (10 per mm) */
const A4 = { pageWidth: 2100, pageHeight: 2970, pageMarginTop: 80, pageMarginBottom: 80, pageMarginLeft: 100, pageMarginRight: 100 };

export async function engravePages(score: ScoreData, opts: PageOptions): Promise<Engraving> {
  const t = await tk();
  t.setOptions({ ...BASE, ...A4, scale: 50, adjustPageHeight: false, breaks: "auto", header: "auto" });
  t.loadData(score.musicxml);
  // which measures does each system hold, and how many systems fit on a page?
  const parser = new DOMParser();
  const order: string[] = [];
  const systemFirst: string[] = [];
  let perPage = 1;
  for (let p = 1; p <= t.getPageCount(); p++) {
    const doc = parser.parseFromString(t.renderToSVG(p), "image/svg+xml");
    const systems = doc.querySelectorAll("g.system");
    perPage = Math.max(perPage, systems.length);
    systems.forEach((sys) => {
      const ms = [...sys.querySelectorAll("g.measure")].map((m) => m.id);
      if (ms.length) systemFirst.push(ms[0]);
      order.push(...ms);
    });
  }
  if (opts.mode === "plain" || !order.length) {
    const pages = Array.from({ length: t.getPageCount() }, (_, i) => t.renderToSVG(i + 1));
    return { pages, sounds: timeline(t), plan: null };
  }
  const index = new Map(order.map((id, i) => [id, i]));
  const restAt = restAtMeasureStarts(score.notes, score.measures, score.bpm, score.parts.map((_, i) => i));
  const plan = planPages({
    systemStarts: systemFirst.map((id) => index.get(id)!),
    restAt,
    perPage,
    stand: opts.stand,
    minRest: opts.minRest,
  });
  // write the breaks into the MEI and lay out again
  const pageFirst = new Set(plan.pageStarts.slice(1).map((s) => systemFirst[s]));
  const sysFirst = new Set(systemFirst.slice(1));
  const mei = t
    .getMEI({})
    .replace(/<(sb|pb)\b[^>]*\/>/g, "")
    .replace(/<measure\b[^>]*xml:id="([^"]+)"/g, (tag, id: string) =>
      pageFirst.has(id) ? `<pb/>${tag}` : sysFirst.has(id) ? `<sb/>${tag}` : tag,
    );
  t.setOptions({ breaks: "encoded" });
  t.loadData(mei);
  const pages = Array.from({ length: t.getPageCount() }, (_, i) => t.renderToSVG(i + 1));
  return { pages, sounds: timeline(t), plan };
}

/** MIDI file of the last engraved score */
export async function midiFile(): Promise<Uint8Array> {
  const b64 = (await tk()).renderToMIDI();
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
