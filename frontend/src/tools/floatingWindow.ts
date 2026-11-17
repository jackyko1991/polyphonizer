/**
 * A window floating over the page, as the keyboard's staff (FloatingStaff.tsx) and the AI panel (agent/AgentPanel.tsx)
 * are: dragged by its title bar, resized from any edge or corner, kept on screen, remembered in this browser.
 * fitBox and resizeBox are pure (tested); useFloatingWindow wires them to pointer events.
 */
import { useEffect, useRef, useState, type PointerEvent } from "react";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** which edges a resize moves: a corner is two */
export type Edges = { l?: boolean; r?: boolean; t?: boolean; b?: boolean };

/** keep a window on screen (at least its title bar `bar` high), and no bigger than the screen */
export function fitBox(b: Box, vw: number, vh: number, min = { w: 280, h: 130 }, bar = 32): Box {
  // never wider or taller than the screen (that wins over the minimum size, on a small phone)
  const w = Math.min(Math.max(min.w, b.w), vw - 16);
  const h = Math.min(Math.max(min.h, b.h), vh - 16);
  return { w: Math.round(w), h: Math.round(h), x: Math.round(Math.max(8, Math.min(b.x, vw - w - 8))), y: Math.round(Math.max(8, Math.min(b.y, vh - bar - 8))) };
}

/** the box after dragging `edges` by (dx, dy): a left or top edge moves the window as it resizes, and stops at the
 * minimum size without pushing the opposite edge */
export function resizeBox(s: Box, edges: Edges, dx: number, dy: number, min = { w: 280, h: 130 }): Box {
  let { x, y, w, h } = s;
  if (edges.r) w = Math.max(min.w, s.w + dx);
  if (edges.b) h = Math.max(min.h, s.h + dy);
  if (edges.l) {
    w = Math.max(min.w, s.w - dx);
    x = s.x + s.w - w;
  }
  if (edges.t) {
    h = Math.max(min.h, s.h - dy);
    y = s.y + s.h - h;
  }
  return { x, y, w, h };
}

function load(key: string): Box | null {
  try {
    const b = JSON.parse(localStorage.getItem(key) ?? "null") as Box | null;
    return b && [b.x, b.y, b.w, b.h].every(Number.isFinite) ? b : null;
  } catch {
    return null;
  }
}
function save(key: string, b: Box) {
  try {
    localStorage.setItem(key, JSON.stringify(b));
  } catch {
    /* storage unavailable */
  }
}

/** a floating window's box, remembered under `key`; `start(edges)` for a resize handle, `start(null)` for the title bar */
export function useFloatingWindow(key: string, initial: () => Box, min = { w: 280, h: 130 }) {
  const fit = (b: Box) => fitBox(b, window.innerWidth, window.innerHeight, min);
  const [box, setBox] = useState<Box>(() => fit(load(key) ?? initial()));
  const drag = useRef<{ edges: Edges | null; px: number; py: number; start: Box } | null>(null);
  // the screen got smaller: bring the window back into view
  useEffect(() => {
    const onResize = () => setBox((b) => fit(b));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const start = (edges: Edges | null) => (e: PointerEvent) => {
    if (edges === null && (e.target as HTMLElement).closest("button, input, select, a")) return;
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* the pointer is gone already */
    }
    drag.current = { edges, px: e.clientX, py: e.clientY, start: box };
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    setBox(fit(d.edges ? resizeBox(d.start, d.edges, dx, dy, min) : { ...d.start, x: d.start.x + dx, y: d.start.y + dy }));
  };
  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    setBox((b) => (save(key, b), b));
  };
  /** pointer handlers for the title bar (null) or a resize handle */
  const handle = (edges: Edges | null) => ({ onPointerDown: start(edges), onPointerMove: move, onPointerUp: end, onPointerCancel: end });
  const place = (b: Box) => {
    const f = fit(b);
    setBox(f);
    save(key, f);
  };
  return { box, handle, place, dragging: () => drag.current !== null };
}

/** the eight resize handles' edges and where each sits (Tailwind classes) */
export const HANDLES: { edges: Edges; className: string; cursor: string }[] = [
  { edges: { t: true }, className: "top-0 left-3 right-3 h-1.5", cursor: "cursor-ns-resize" },
  { edges: { b: true }, className: "bottom-0 left-3 right-3 h-1.5", cursor: "cursor-ns-resize" },
  { edges: { l: true }, className: "left-0 top-3 bottom-3 w-1.5", cursor: "cursor-ew-resize" },
  { edges: { r: true }, className: "right-0 top-3 bottom-3 w-1.5", cursor: "cursor-ew-resize" },
  { edges: { t: true, l: true }, className: "top-0 left-0 h-3 w-3", cursor: "cursor-nwse-resize" },
  { edges: { b: true, r: true }, className: "bottom-0 right-0 h-3 w-3", cursor: "cursor-nwse-resize" },
  { edges: { t: true, r: true }, className: "top-0 right-0 h-3 w-3", cursor: "cursor-nesw-resize" },
  { edges: { b: true, l: true }, className: "bottom-0 left-0 h-3 w-3", cursor: "cursor-nesw-resize" },
];
