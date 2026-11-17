/**
 * Between the score editor and the AI panel, which live in different parts of the page (as Tensorizer's agentBus.ts):
 * - the editor publishes the score on screen (its files, the open file, the last error), which the panel sends with
 *   each message; it stays after leaving the editor, so the panel keeps working on that score;
 * - the editor registers how the agent's files are applied (into the project, then run);
 * - anything can open the panel, with bars or code attached ("Ask AI about this bar").
 */
import { useSyncExternalStore } from "react";
import type { AgentContext } from "./client.ts";

export interface ScoreOnScreen {
  title: string;
  files: { name: string; code: string }[];
  active: string;
  error?: string;
}
export interface PanelState {
  open: boolean;
  /** what the next message is about (a bar, some code), shown as a chip the learner can remove */
  attach: Pick<AgentContext, "bars" | "code"> | null;
  /** a message to put in the box */
  draft?: string;
}

function store<T>(initial: T) {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set: (v: T) => {
      value = v;
      subs.forEach((f) => f());
    },
    subscribe: (f: () => void) => (subs.add(f), () => void subs.delete(f)),
  };
}

const score = store<ScoreOnScreen | null>(null);
const panel = store<PanelState>({ open: false, attach: null });
let applier: ((files: Record<string, string>, removed: string[]) => void) | null = null;

export const publishScore = (s: ScoreOnScreen | null) => score.set(s);
export const scoreOnScreen = score.get;
export const useScoreOnScreen = () => useSyncExternalStore(score.subscribe, score.get, score.get);

/** the editor says how files are applied; returns the function that takes it back (when the editor closes) */
export function registerApplier(f: (files: Record<string, string>, removed: string[]) => void): () => void {
  applier = f;
  return () => {
    if (applier === f) applier = null;
  };
}
export const canApply = () => applier !== null;
/** put the agent's files into the score; false when no editor is open to take them */
export function applyFiles(files: Record<string, string>, removed: string[] = []): boolean {
  if (!applier) return false;
  applier(files, removed);
  return true;
}

export const usePanel = () => useSyncExternalStore(panel.subscribe, panel.get, panel.get);
export const openAgent = (attach: PanelState["attach"] = null, draft?: string) => panel.set({ open: true, attach: attach ?? panel.get().attach, draft });
export const closeAgent = () => panel.set({ ...panel.get(), open: false });
export const toggleAgent = () => panel.set({ ...panel.get(), open: !panel.get().open });
export const clearAttach = () => panel.set({ ...panel.get(), attach: null, draft: undefined });
