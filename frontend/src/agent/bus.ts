/**
 * Between the score editor and the AI panel, which live in different parts of the page (as Tensorizer's agentBus.ts):
 * - the editor publishes the score on screen (its files, the open file, the last error), which the panel sends with
 *   each message; it stays after leaving the editor, so the panel keeps working on that score;
 * - the editor registers how the agent's files are applied (into the project, then run);
 * - anything can open the panel, with bars or code attached ("Ask AI about this bar");
 * - the editor publishes what is selected (lines of code, the bar of a clicked note), which the panel offers to add to
 *   the next message.
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

/** what is selected in the editor now: lines of code, and the bar of the note last clicked in the score */
export type Selection = Pick<AgentContext, "bars" | "code">;

const score = store<ScoreOnScreen | null>(null);
const selection = store<Selection>({});
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

/** the editor's score files (what load() reads): read one for the agent, keep one the agent's message brought */
export interface FileStore {
  read: (name: string) => Promise<Uint8Array | null>;
  keep: (name: string, bytes: Uint8Array) => Promise<void>;
}
let fileStore: FileStore | null = null;
export function registerFileStore(f: FileStore): () => void {
  fileStore = f;
  return () => {
    if (fileStore === f) fileStore = null;
  };
}
export const readScoreFile = (name: string) => fileStore?.read(name) ?? Promise.resolve(null);
export const keepScoreFile = (name: string, bytes: Uint8Array) => fileStore?.keep(name, bytes) ?? Promise.resolve();
/** the files main.py and its modules load(): load("name.musicxml") */
export const loadedNames = (files: { code: string }[]) => [...new Set(files.flatMap((f) => [...f.code.matchAll(/\bload\(\s*["']([^"'\n]+)["']/g)].map((m) => m[1])))];
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

/** the editor's selection changed: only the kinds given are replaced (undefined clears one) */
export const publishSelection = (s: Partial<Selection>) => selection.set({ ...selection.get(), ...s });
export const useSelection = () => useSyncExternalStore(selection.subscribe, selection.get, selection.get);
/** add bars or code to the next message (beside what is already attached) */
export const attach = (a: Selection) => panel.set({ ...panel.get(), attach: { ...(panel.get().attach ?? {}), ...a } });
/** take one kind off the next message */
export function detach(kind: keyof Selection) {
  const rest = { ...(panel.get().attach ?? {}) };
  delete rest[kind];
  panel.set({ ...panel.get(), attach: rest.bars || rest.code ? rest : null });
}
