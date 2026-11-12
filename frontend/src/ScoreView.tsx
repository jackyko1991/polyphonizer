/**
 * The score panel: the engraved score (live, one long page) or the printed pages with planned page turns, a Play
 * button that lights up the notes as they sound, and export.
 */
import { useLang } from "@learnkit/web";
import { useEffect, useRef, useState } from "react";
import { engravePages, engraveScroll, midiFile, type Engraving } from "./engine/engrave.ts";
import type { Stand } from "./engine/pageTurns.ts";
import { play, stop } from "./engine/player.ts";
import type { ScoreData } from "./engine/types.ts";
import { fill } from "./strings.ts";

export type View = "score" | "pages";

export interface ScoreViewProps {
  score: ScoreData | null;
  /** pages view: the sheet for one part (re-run by the parent), null = full score */
  part: number | null;
  onPart?: (part: number | null) => void;
  /** all part names of the full score (the part picker) */
  allParts?: string[];
  /** the code, for "Export ▸ code" */
  code?: string;
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

function printPages(pages: string[], title: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.title = title || "Polyphonizer";
  const style = w.document.createElement("style");
  style.textContent =
    "@page{size:A4;margin:0}body{margin:0}div{width:210mm;height:297mm;page-break-after:always;display:flex}svg{width:100%;height:100%}";
  w.document.head.appendChild(style);
  for (const svg of pages) {
    const div = w.document.createElement("div");
    div.innerHTML = svg; // Verovio's own SVG output
    w.document.body.appendChild(div);
  }
  setTimeout(() => w.print(), 300);
}

export default function ScoreView({ score, part, onPart, allParts, code, pagesView = true, view = "score", onView }: ScoreViewProps) {
  const { t } = useLang();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [eng, setEng] = useState<Engraving | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [stand, setStand] = useState<Stand>("spread");
  const [minRest, setMinRest] = useState(2);
  const [planOn, setPlanOn] = useState(true);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width / 50) * 50));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!score) return setEng(null);
    let live = true;
    setBusy(true);
    stop();
    setPlaying(false);
    (view === "pages"
      ? engravePages(score, { stand, minRest, mode: planOn ? "plan" : "plain" })
      : engraveScroll(score.musicxml, Math.max(320, width - 24))
    )
      .then((e) => live && (setEng(e), setErr(null)))
      .catch((e) => live && setErr(String(e)))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [score, view, width, stand, minRest, planOn]);

  useEffect(() => () => stop(), []);

  const mark = (id: string, on: boolean) =>
    box.current?.querySelector(`[id="${CSS.escape(id)}"]`)?.classList.toggle("pz-playing", on);
  const toggle = () => {
    if (playing) return stop();
    if (!eng) return;
    setPlaying(true);
    void play(eng.sounds, mark).then(() => setPlaying(false));
  };
  const name = (score?.title || "score").replace(/[^\w-]+/g, "_");
  const btn = "rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40";

  return (
    <div className="flex h-full min-h-[24rem] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2">
        {pagesView && (
          <div className="flex rounded-md border border-gray-300 p-0.5 text-sm" role="tablist">
            {(["score", "pages"] as View[]).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => onView?.(v)}
                className={`rounded px-2.5 py-0.5 font-medium ${view === v ? "bg-(--lk-accent) text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                {t(`view.${v}`)}
              </button>
            ))}
          </div>
        )}
        <button onClick={toggle} disabled={!eng || busy} className={btn} data-testid="play">
          {playing ? `■ ${t("stop")}` : `▶ ${t("play")}`}
        </button>
        {busy && <span className="text-xs text-gray-500">{view === "pages" ? t("pages.engraving") : "…"}</span>}
        {eng && view === "pages" && <span className="text-xs text-gray-500">{fill(t("pages.count"), { n: eng.pages.length })}</span>}
        {code !== undefined && (
          <div className="relative ml-auto">
            <button onClick={() => setMenu((m) => !m)} disabled={!score} className={btn} aria-expanded={menu}>
              {t("export")} ▾
            </button>
            {menu && score && (
              <div
                className="absolute right-0 z-20 mt-1 flex w-72 flex-col rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-lg"
                onMouseLeave={() => setMenu(false)}
              >
                {[
                  ["export.musicxml", () => download(`${name}.musicxml`, score.musicxml, "application/vnd.recordare.musicxml+xml")],
                  ["export.midi", async () => download(`${name}.mid`, (await midiFile()) as BlobPart, "audio/midi")],
                  ["export.print", async () => printPages((await engravePages(score, { stand, minRest, mode: planOn ? "plan" : "plain" })).pages, score.title)],
                  ["export.code", () => download(`${name}.py`, code, "text/x-python")],
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
      </div>

      {view === "pages" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          {allParts && allParts.length > 1 && (
            <label className="flex items-center gap-1.5">
              {t("pages.part")}
              <select
                value={part ?? -1}
                onChange={(e) => onPart?.(Number(e.target.value) < 0 ? null : Number(e.target.value))}
                className="rounded border border-gray-300 bg-white px-1.5 py-0.5"
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
        </div>
      )}

      {view === "pages" && eng?.plan && (
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

      <div ref={box} className="pz-score min-h-0 flex-1 overflow-auto bg-gray-100 p-3" data-testid="score">
        {err && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>}
        {!score && !err && <p className="p-6 text-center text-sm text-gray-500">{t("view.empty")}</p>}
        {eng &&
          (view === "pages" ? (
            <div className="flex flex-wrap justify-center gap-4">
              {eng.pages.map((svg, i) => (
                <div key={i} className="relative">
                  <div
                    className="w-[min(100%,420px)] min-w-[280px] bg-white shadow-md [aspect-ratio:210/297] [&>svg]:h-full [&>svg]:w-full"
                    // Verovio's own SVG output
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                  <span className="absolute -bottom-5 left-0 right-0 text-center text-xs text-gray-500">
                    {i + 1}
                    {eng.plan?.turns.some((x) => x.afterPage === i + 1) ? " ↻" : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            eng.pages.map((svg, i) => (
              <div key={i} className="mx-auto bg-white shadow-sm [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
            ))
          ))}
      </div>
    </div>
  );
}
