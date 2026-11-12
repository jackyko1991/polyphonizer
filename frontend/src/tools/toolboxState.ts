/**
 * Which tools are open in the bottom dock, which tab is in front, the dock's height, and which tools are busy in the
 * background (metronome ticking, keyboard armed, tuner listening). Remembered in this browser.
 */
import { useSyncExternalStore } from "react";

export type ToolId = "keyboard" | "metronome" | "tuner";
export const TOOL_IDS: ToolId[] = ["keyboard", "metronome", "tuner"];

export interface ToolboxState {
  open: ToolId[];
  active: ToolId | null;
  height: number;
  running: ToolId[];
}

const KEY = "polyphonizer.toolbox";
let state: ToolboxState = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<ToolboxState> | null;
    const open = (s?.open ?? []).filter((t) => TOOL_IDS.includes(t));
    return {
      open,
      active: open.includes(s?.active as ToolId) ? (s!.active as ToolId) : (open[0] ?? null),
      height: s?.height ?? 230,
      running: [],
    };
  } catch {
    return { open: [], active: null, height: 230, running: [] };
  }
})();
const listeners = new Set<() => void>();

function set(next: ToolboxState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify({ open: state.open, active: state.active, height: state.height }));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((f) => f());
}

export const useToolbox = () =>
  useSyncExternalStore(
    (f) => (listeners.add(f), () => void listeners.delete(f)),
    () => state,
  );

/** open a tool (or bring it to the front) */
export function openTool(id: ToolId) {
  set({ ...state, open: state.open.includes(id) ? state.open : [...state.open, id], active: id });
}
/** open it, or close it if it is already in front */
export function toggleTool(id: ToolId) {
  if (state.active === id) closeTool(id);
  else openTool(id);
}
export function closeTool(id: ToolId) {
  const open = state.open.filter((t) => t !== id);
  set({ ...state, open, active: state.active === id ? (open[open.length - 1] ?? null) : state.active });
}
export const setDockHeight = (height: number) =>
  set({ ...state, height: Math.round(Math.min(Math.max(height, 150), window.innerHeight * 0.7)) });

export function setRunning(id: ToolId, on: boolean) {
  if (state.running.includes(id) === on) return;
  set({ ...state, running: on ? [...state.running, id] : state.running.filter((t) => t !== id) });
}
