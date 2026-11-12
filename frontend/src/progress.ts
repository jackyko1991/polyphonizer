/**
 * Compile progress, for the thin line over the score: real progress can't be measured, so it follows stages (Python
 * starting, music21 loading, running the code, engraving, drawing) and the line creeps within each stage's range.
 * The Python side reports its stages (python.ts); the score panel reports engraving and drawing (ScoreView.tsx).
 */
import { useEffect, useState } from "react";

export type Stage = "idle" | "python" | "music21" | "run" | "engrave" | "render" | "done" | "error";

/** each stage's share of the line, in % */
export const RANGE: Record<Stage, [number, number]> = {
  idle: [0, 0],
  python: [0, 20],
  music21: [20, 40],
  run: [40, 70],
  engrave: [70, 90],
  render: [90, 100],
  done: [100, 100],
  error: [100, 100],
};

let stage: Stage = "idle";
let since = 0;
let hide = 0;
const listeners = new Set<(s: Stage, at: number) => void>();

/** move to a stage; "done" and "error" go back to idle after a moment */
export function setStage(next: Stage) {
  // a stage never moves the line back while a compile is under way (e.g. a sheet re-run after the full score)
  if (next !== "done" && next !== "error" && stage !== "idle" && stage !== "done" && stage !== "error" && RANGE[next][0] < RANGE[stage][0]) return;
  stage = next;
  since = performance.now();
  clearTimeout(hide);
  if (next === "done" || next === "error") hide = window.setTimeout(() => setStage("idle"), next === "error" ? 1500 : 450);
  listeners.forEach((f) => f(stage, since));
}

export const currentStage = () => stage;

export function useStage(): [Stage, number] {
  const [s, setS] = useState<[Stage, number]>([stage, since]);
  useEffect(() => {
    const f = (st: Stage, at: number) => setS([st, at]);
    listeners.add(f);
    setS([stage, since]);
    return () => void listeners.delete(f);
  }, []);
  return s;
}
