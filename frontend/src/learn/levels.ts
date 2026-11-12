/** The colour of each level in the Learn library and on problem cards (every Level must have one: tests/learn.test.ts). */
import type { Level } from "../problems.ts";

export const LEVEL_STYLE: Record<Level, { dot: string; text: string }> = {
  L0: { dot: "bg-sky-500", text: "text-sky-700" },
  L1: { dot: "bg-green-500", text: "text-green-700" },
  L2: { dot: "bg-amber-500", text: "text-amber-700" },
  L3: { dot: "bg-red-500", text: "text-red-700" },
};
