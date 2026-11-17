/** The page's side of the Python worker: one worker for the whole site, requests answered in order. */
import { useEffect, useState } from "react";
import { setStage } from "../progress.ts";
import type { ScoreData } from "./types.ts";

export type Stage = "idle" | "python" | "music21" | "ready";
export interface PyError {
  message: string;
  line: number | null;
  /** the project file the line is in; null = the main file */
  file?: string | null;
}
/** one of a project's other Python files, importable from the main file (`from motifs import theme`) */
export interface PyModule {
  name: string;
  code: string;
}

let worker: Worker | null = null;
let stage: Stage = "idle";
let next = 1;
const waiting = new Map<number, { ok: (v: unknown) => void; fail: (e: PyError) => void }>();
const listeners = new Set<(s: Stage) => void>();

function get(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./python.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data;
    if (msg.type === "status") {
      stage = msg.stage;
      if (stage === "python" || stage === "music21") setStage(stage);
      listeners.forEach((f) => f(stage));
    } else if (msg.type === "result") {
      const w = waiting.get(msg.id);
      waiting.delete(msg.id);
      if (msg.ok) w?.ok(msg.data);
      else w?.fail(msg.error);
    }
  };
  return worker;
}

function ask<T>(msg: Record<string, unknown>, transfer: Transferable[] = []): Promise<T> {
  const id = next++;
  return new Promise<T>((ok, fail) => {
    waiting.set(id, { ok: ok as (v: unknown) => void, fail });
    get().postMessage({ ...msg, id }, transfer);
  });
}

/** start loading Python and music21 now (they take a while the first time) */
export const bootPython = () => ask<null>({ kind: "boot" });
/** run score code; `part` keeps only that part (for one player's sheet); `modules` are the project's other files */
export function runScore(code: string, part: number | null = null, modules: PyModule[] = []): Promise<ScoreData> {
  // the progress line: still loading Python → those stages first; then running the code
  setStage(stage === "ready" ? "run" : stage === "music21" ? "music21" : "python");
  return ask<ScoreData>({ kind: "run", code, part, modules }).then(
    (r) => (setStage("run"), r),
    (e) => {
      setStage("error");
      throw e;
    },
  );
}
/** one bar of the last full score run, as text for edit_bar(), and what that text leaves out */
export const barText = (part: string, bar: number) => ask<{ text: string; lost: string[] }>({ kind: "bar", part, bar });
/** the last full score run as LilyPond text, with these \\header fields (a draft: tidy before sending to Mutopia) */
export const lilypondText = (header: Record<string, string>) => ask<{ text: string }>({ kind: "lily", header }).then((r) => r.text);
/** make a file available to `load("name")` */
export const addFile = (name: string, bytes: Uint8Array) => ask<null>({ kind: "file", name, bytes });

export function usePythonStage(): Stage {
  const [s, setS] = useState(stage);
  useEffect(() => {
    listeners.add(setS);
    setS(stage);
    return () => void listeners.delete(setS);
  }, []);
  return s;
}
