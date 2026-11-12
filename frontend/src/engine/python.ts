/** The page's side of the Python worker: one worker for the whole site, requests answered in order. */
import { useEffect, useState } from "react";
import type { ScoreData } from "./types.ts";

export type Stage = "idle" | "python" | "music21" | "ready";
export interface PyError {
  message: string;
  line: number | null;
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
/** run score code; `part` keeps only that part (for one player's sheet) */
export const runScore = (code: string, part: number | null = null) => ask<ScoreData>({ kind: "run", code, part });
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
