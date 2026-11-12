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
  /** the dock put away (Close): its tools stay open (a ticking metronome keeps ticking) until a tool is opened */
  hidden: boolean;
  /** the dock enlarged to fill the window (remembered) */
  expanded: boolean;
  /** the computer keys play the virtual keyboard (a lesson can switch them on) */
  keyboardArmed: boolean;
  /** keys to outline as the next ones to play (Learn to Play) */
  hint: number[];
  /** a lesson's request: the home-row ("typing") layout with its C here (a counter, so the same value repeats) */
  baseRequest: { c: number; n: number } | null;
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
      hidden: false,
      keyboardArmed: false,
      hint: [],
      baseRequest: null,
      expanded: s?.expanded ?? false,
    };
  } catch {
    return { open: [], active: null, height: 230, running: [], hidden: false, expanded: false, keyboardArmed: false, hint: [], baseRequest: null };
  }
})();
const listeners = new Set<() => void>();

function set(next: ToolboxState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify({ open: state.open, active: state.active, height: state.height, expanded: state.expanded }));
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
  set({ ...state, open: state.open.includes(id) ? state.open : [...state.open, id], active: id, hidden: false });
}
/** the dock as a bottom panel, or filling the window */
export const setExpanded = (expanded: boolean) => set({ ...state, expanded });
/** put the dock away without closing its tools */
export const hideDock = () => set({ ...state, hidden: true });
/** open it, or close it if it is already in front */
export function toggleTool(id: ToolId) {
  if (state.active === id && !state.hidden) closeTool(id);
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

/** `list` with `id` moved to position `to` (clamped) */
export function moved<T>(list: T[], id: T, to: number): T[] {
  const from = list.indexOf(id);
  if (from < 0) return list;
  const rest = list.filter((x) => x !== id);
  const at = Math.max(0, Math.min(rest.length, to));
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}
/** drag a tab: put the tool at position `to` among the open tools (remembered) */
export const moveTool = (id: ToolId, to: number) => set({ ...state, open: moved(state.open, id, to) });

export const armKeyboard = (on: boolean) => state.keyboardArmed !== on && set({ ...state, keyboardArmed: on });
export const setKeyHint = (keys: number[]) => set({ ...state, hint: keys });
export const requestKeyboardBase = (c: number) => set({ ...state, baseRequest: { c, n: (state.baseRequest?.n ?? 0) + 1 } });
