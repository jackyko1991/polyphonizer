/**
 * The keyboard's live staff in its own window, floating over the whole page: drag it by its title bar, resize it from
 * the corner, close it with ×; − / + change how many bars it shows (two by default, sized to fit them, just above the
 * Toolbox on the right); Note / Bar / All take notes off; Code shows what was played as code, to copy or to insert
 * into the code editor.
 * Where it is and how big are remembered. It is drawn into document.body (the dock slides with a CSS transform,
 * which would otherwise pin a fixed window to the dock).
 */
import { useLang } from "@learnkit/web";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Code, Copy, CornerDownLeft, Delete, Eraser, GripHorizontal, Minus, Plus, X } from "lucide-react";
import { canInsert, insertCode, onEditors } from "./codeInsert.ts";
import { clearStaff, groupChords, onStaff, staffNotes, undoBar, undoStaff } from "./liveStaff.ts";
import { staffCode } from "./staffCode.ts";
import { useToolbox } from "./toolboxState.ts";

const LiveStaff = lazy(() => import("./LiveStaff.tsx"));

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const KEY = "polyphonizer.liveStaff.window";
const MIN_W = 280;
const MIN_H = 130;
const BAR = 32; // the title bar's height

/** keep the window on screen (at least its title bar), and no bigger than the screen */
export function fitBox(b: Box, vw: number, vh: number): Box {
  // never wider or taller than the screen (that wins over the minimum size, on a small phone)
  const w = Math.min(Math.max(MIN_W, b.w), vw - 16);
  const h = Math.min(Math.max(MIN_H, b.h), vh - 16);
  return { w: Math.round(w), h: Math.round(h), x: Math.round(Math.max(8, Math.min(b.x, vw - w - 8))), y: Math.round(Math.max(8, Math.min(b.y, vh - BAR - 8))) };
}

/** two bars of a grand staff, above the dock on the right */
function defaultBox(): Box {
  const w = Math.min(440, window.innerWidth - 32);
  const h = 210;
  const dockTop = document.querySelector('[data-testid="tool-dock"]')?.getBoundingClientRect().top ?? window.innerHeight;
  return fitBox({ w, h, x: window.innerWidth - w - 24, y: dockTop - h - 12 }, window.innerWidth, window.innerHeight);
}

function load(): Box | null {
  try {
    const b = JSON.parse(localStorage.getItem(KEY) ?? "null") as Box | null;
    return b && [b.x, b.y, b.w, b.h].every(Number.isFinite) ? fitBox(b, window.innerWidth, window.innerHeight) : null;
  } catch {
    return null;
  }
}
function save(b: Box) {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* storage unavailable */
  }
}

const BARS_KEY = "polyphonizer.liveStaff.bars";
const loadBars = () => {
  try {
    const n = Number(localStorage.getItem(BARS_KEY));
    return n >= 1 && n <= 8 ? n : 2;
  } catch {
    return 2;
  }
};
const CODE_H = 104; // the code panel's height

export default function FloatingStaff({ onClose }: { onClose: () => void }) {
  const { pick } = useLang();
  const tools = useToolbox();
  const [box, setBox] = useState<Box>(() => load() ?? defaultBox());
  const [bars, setBars] = useState(loadBars);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [editorThere, setEditorThere] = useState(canInsert);
  const [done, setDone] = useState<"" | "copied" | "inserted">("");
  // until the window is moved or resized, it hugs the drawing (as wide as its bars need at its height); a new bar
  // count re-fits it once either way
  const [fresh, setFresh] = useState(() => load() === null);
  const refit = useRef(false);
  const staffH = (b: Box) => b.h - BAR - (showCode ? CODE_H : 0) - 12;
  const hug = (ratio: number) => {
    if (!fresh && !refit.current) return;
    const keepPlace = !fresh;
    refit.current = false;
    setBox((b) => {
      const w = Math.round(staffH(b) * ratio + 12);
      if (Math.abs(w - b.w) < 4) return b;
      const dockTop = document.querySelector('[data-testid="tool-dock"]')?.getBoundingClientRect().top ?? window.innerHeight;
      const next = fitBox(keepPlace ? { ...b, w } : { ...b, w, x: window.innerWidth - w - 24, y: dockTop - b.h - 12 }, window.innerWidth, window.innerHeight);
      if (keepPlace) save(next);
      return next;
    });
  };
  const changeBars = (n: number) => {
    const v = Math.max(1, Math.min(8, n));
    if (v === bars) return;
    refit.current = true;
    setBars(v);
    try {
      localStorage.setItem(BARS_KEY, String(v));
    } catch {
      /* storage unavailable */
    }
  };
  const toggleCode = () => {
    // the code panel adds to the window's height (and gives it back), so the staff keeps its size
    setBox((b) => fitBox({ ...b, h: b.h + (showCode ? -CODE_H : CODE_H), y: showCode ? b.y : b.y - CODE_H }, window.innerWidth, window.innerHeight));
    setShowCode((s) => !s);
  };
  const drag = useRef<{ kind: "move" | "size"; px: number; py: number; start: Box } | null>(null);

  // the screen got smaller: bring the window back into view
  useEffect(() => {
    const onResize = () => setBox((b) => fitBox(b, window.innerWidth, window.innerHeight));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  // the code follows the staff; Insert is there while a code editor is on the page
  useEffect(() => {
    const update = () => setCode(staffCode(groupChords(staffNotes())));
    update();
    return onStaff(update);
  }, []);
  useEffect(() => onEditors(() => setEditorThere(canInsert())), []);
  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => setDone(""), 1500);
    return () => clearTimeout(id);
  }, [done]);

  // only while the keyboard is the tool in front and the Toolbox is showing
  if (tools.hidden || tools.active !== "keyboard" || !tools.open.includes("keyboard")) return null;

  const begin = (kind: "move" | "size") => (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button") && kind === "move") return;
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* the pointer is gone already */
    }
    drag.current = { kind, px: e.clientX, py: e.clientY, start: box };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    const s = d.start;
    setBox(fitBox(d.kind === "move" ? { ...s, x: s.x + dx, y: s.y + dy } : { ...s, w: s.w + dx, h: s.h + dy }, window.innerWidth, window.innerHeight));
  };
  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    setFresh(false);
    setBox((b) => (save(b), b));
  };

  const wide = box.w >= 520; // room for the buttons' words
  const roomy = box.w >= 400; // room for the shortcut keys (they are in the tooltips too)
  const BTN = "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent";
  const KBD = "rounded border border-gray-300 bg-white px-1 font-sans text-[10px] leading-4 text-gray-500";

  return createPortal(
    <div
      role="dialog"
      aria-label={pick(["Staff: what you play", "五線譜：你彈的音"])}
      className="fixed z-[65] flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-xl"
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
      data-testid="floating-staff"
    >
      <div
        className="flex shrink-0 cursor-grab touch-none items-center gap-1 overflow-hidden border-b border-gray-200 bg-gray-50 px-1.5 text-xs font-medium text-gray-600 select-none active:cursor-grabbing"
        style={{ height: BAR }}
        onPointerDown={begin("move")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        title={pick(["Drag to move", "拖曳移動"])}
        data-testid="floating-staff-bar"
      >
        {roomy && <GripHorizontal className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />}
        {/* how many bars */}
        <span className="flex shrink-0 items-center" data-testid="staff-bars">
          <button type="button" className={BTN} onClick={() => changeBars(bars - 1)} disabled={bars <= 1} aria-label={pick(["Fewer bars", "減少小節"])}>
            <Minus className="h-3.5 w-3.5" aria-hidden />
          </button>
          <span className={`${roomy ? "min-w-[3.2rem]" : "min-w-[2.6rem]"} text-center tabular-nums`} aria-live="polite">
            {pick([`${bars} bar${bars > 1 ? "s" : ""}`, `${bars} 小節`])}
          </span>
          <button type="button" className={BTN} onClick={() => changeBars(bars + 1)} disabled={bars >= 8} aria-label={pick(["More bars", "增加小節"])}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
        {roomy && <span className="mx-0.5 h-4 w-px shrink-0 bg-gray-300" aria-hidden />}
        {/* take off the last note, the last bar, or everything */}
        {(
          [
            [() => undoStaff(), ["Note", "音"], ["Take off the last note or chord (Backspace)", "刪除最後一個音或和弦（Backspace）"], "staff-undo-note", "⌫"],
            [() => undoBar(), ["Bar", "小節"], ["Take off the last bar (Shift+Backspace or Delete)", "刪除最後一個小節（Shift+Backspace 或 Delete）"], "staff-undo-bar", "⇧⌫"],
            [() => clearStaff(), ["All", "全部"], ["Clear the staff (Esc)", "清除五線譜（Esc）"], "staff-clear-all", "Esc"],
          ] as const
        ).map(([run, label, hint, id, key]) => (
          <button key={id} type="button" onClick={run} className={BTN} title={pick(hint)} aria-label={pick(hint)} data-testid={id}>
            {id === "staff-clear-all" ? <Eraser className="h-3.5 w-3.5" aria-hidden /> : <Delete className="h-3.5 w-3.5" aria-hidden />}
            {wide && pick(label)}
            {roomy && <kbd className={KBD}>{key}</kbd>}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleCode}
          className={`${BTN} ml-auto ${showCode ? "bg-(--lk-accent)/10 text-(--lk-accent)" : ""}`}
          aria-pressed={showCode}
          title={pick(["Show what you played as code", "以程式碼顯示你彈的音"])}
          data-testid="staff-code-toggle"
        >
          <Code className="h-3.5 w-3.5" aria-hidden />
          {wide && pick(["Code", "程式碼"])}
        </button>
        <button
          type="button"
          onClick={onClose}
          className={BTN}
          aria-label={pick(["Hide the staff", "隱藏五線譜"])}
          title={pick(["Hide the staff", "隱藏五線譜"])}
          data-testid="floating-staff-close"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 p-1.5">
        <Suspense fallback={null}>
          {/* laid out wide enough for the bars on one line; the drawing is then scaled to the window */}
          <LiveStaff width={Math.max(box.w, 320 * bars)} bars={bars} onAspect={hug} />
        </Suspense>
      </div>
      {showCode && (
        <div className="flex shrink-0 flex-col border-t border-gray-200 bg-gray-50" style={{ height: CODE_H }} data-testid="staff-code">
          <pre className="min-h-0 flex-1 overflow-auto px-2 py-1 font-mono text-xs whitespace-pre-wrap text-gray-800 select-text">
            {code || pick(["# play something: it appears here as code", "# 彈些甚麼：會在這裏顯示為程式碼"])}
          </pre>
          <div className="flex shrink-0 items-center gap-1 px-1.5 pb-1 text-xs text-gray-600">
            <button
              type="button"
              className={BTN}
              disabled={!code}
              onClick={() => void navigator.clipboard?.writeText(code).then(() => setDone("copied"))}
              data-testid="staff-code-copy"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {done === "copied" ? pick(["Copied", "已複製"]) : pick(["Copy", "複製"])}
            </button>
            <button
              type="button"
              className={BTN}
              disabled={!code || !editorThere}
              onClick={() => insertCode(code) && setDone("inserted")}
              title={
                editorThere
                  ? pick(["Put it in the code editor, after the cursor", "放進程式碼編輯器，游標之後"])
                  : pick(["Open the Score editor or a Learn problem to insert it", "開啟樂譜編輯器或「學習」的題目才能插入"])
              }
              data-testid="staff-code-insert"
            >
              <CornerDownLeft className="h-3.5 w-3.5" aria-hidden />
              {done === "inserted" ? pick(["Inserted", "已插入"]) : pick(["Insert into code", "插入程式碼"])}
            </button>
          </div>
        </div>
      )}
      {/* resize from the corner */}
      <div
        className="absolute right-0 bottom-0 h-4 w-4 cursor-nwse-resize touch-none"
        onPointerDown={begin("size")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        aria-hidden
        data-testid="floating-staff-resize"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4 text-gray-400">
          <path d="M14 6 6 14M14 10l-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>,
    document.body,
  );
}
