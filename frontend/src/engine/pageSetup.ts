/**
 * A sheet's page setup lives in the score's code as a pages(...) call (prelude.py), one per sheet: the full score
 * (no part=) or one player's part. Compiling returns them (ScoreData.layouts); the Pages view applies them, and its
 * controls write the call back into the code, so the setup is saved with the score and shared when it is forked.
 */

export type Stand = "single" | "spread" | "spread-right";
export interface PageSetup {
  part: string | null;
  paper: string | [number, number];
  width_mm: number;
  height_mm: number;
  orientation: "portrait" | "landscape";
  stand: Stand;
  min_rest: number;
  plan_turns: boolean;
  staff_size: number;
  margins_mm: [number, number, number, number];
  page_numbers: boolean;
  title: "first" | "every" | "none";
  part_name: "first" | "every" | "none";
  bars_per_line: number;
  /** bar numbers (as printed) that start a new line / page */
  line_breaks: number[];
  page_breaks: number[];
}

/** printing papers and screens, portrait (keep in step with prelude.py's _PAPERS). "Fit" is no paper: one continuous
 * page as wide as the window (its size here only stands in, e.g. for printing, which uses A4) */
export const FIT = "Fit";
export const PAPERS: Record<string, [number, number]> = {
  [FIT]: [210, 297],
  A4: [210, 297],
  Letter: [215.9, 279.4],
  A3: [297, 420],
  B4: [250, 353],
  iPad: [180, 258],
  "iPad Pro 12.9": [196, 262],
  "Tablet 16:10": [170, 272],
  Phone: [70, 152],
  "Screen 16:9": [180, 320],
  "Screen 16:10": [200, 320],
};
/** which papers are screens (for grouping in the menu) */
export const SCREENS = new Set(["iPad", "iPad Pro 12.9", "Tablet 16:10", "Phone", "Screen 16:9", "Screen 16:10"]);

/** a page shaped like this device's screen, as it is held now: (width, height) in mm, the long side 260 mm */
export function screenPaper(w: number, h: number): [number, number] {
  const long = 260;
  return w >= h ? [long, Math.round((long * h) / w)] : [Math.round((long * w) / h), long];
}

/** pages() with no arguments (keep in step with prelude.py) */
export const DEFAULT_SETUP: PageSetup = {
  part: null,
  paper: "A4",
  width_mm: 210,
  height_mm: 297,
  orientation: "portrait",
  stand: "spread",
  min_rest: 2,
  plan_turns: true,
  staff_size: 7,
  margins_mm: [10, 10, 10, 10],
  page_numbers: true,
  title: "first",
  part_name: "every",
  bars_per_line: 0,
  line_breaks: [],
  page_breaks: [],
};

/** is this setup the continuous, fit-to-window layout (no pages) */
export const isFit = (s: PageSetup) => s.paper === FIT;

/** a sheet with no pages(...) line at all: continuous, fit to the window (a pages() line without paper= is A4) */
export const UNSET_SETUP: PageSetup = { ...DEFAULT_SETUP, paper: FIT };

/** the setup of one sheet (part name, or null for the full score): its pages(...) call, or fit to the window */
export function setupFor(layouts: PageSetup[] | undefined, part: string | null): PageSetup {
  const found = layouts?.find((l) => (l.part ?? null) === part);
  return found ? { ...DEFAULT_SETUP, ...found } : { ...UNSET_SETUP, part };
}

/** the setup with a new paper or orientation: its page size follows */
export function withPaper(s: PageSetup, paper: string | [number, number], orientation = s.orientation): PageSetup {
  if (Array.isArray(paper)) return { ...s, paper, orientation: "portrait", width_mm: paper[0], height_mm: paper[1] };
  const [w, h] = PAPERS[paper] ?? [s.width_mm, s.height_mm];
  return { ...s, paper, orientation, width_mm: orientation === "landscape" ? h : w, height_mm: orientation === "landscape" ? w : h };
}

const py = (v: unknown): string =>
  typeof v === "string" ? JSON.stringify(v) : typeof v === "boolean" ? (v ? "True" : "False") : Array.isArray(v) ? `[${v.map(py).join(", ")}]` : String(v);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const ARGS = ["paper", "orientation", "stand", "min_rest", "plan_turns", "staff_size", "margins_mm", "page_numbers", "title", "part_name", "bars_per_line", "line_breaks", "page_breaks"] as const;

/** the pages(...) call for a setup: only what differs from the defaults */
export function setupCode(s: PageSetup): string {
  const args: string[] = [];
  if (s.part !== null) args.push(`part=${py(s.part)}`);
  for (const k of ARGS) {
    const v = k === "margins_mm" ? s.margins_mm.map((x) => Math.round(x * 10) / 10) : s[k];
    if (!same(v, DEFAULT_SETUP[k])) args.push(`${k}=${k === "margins_mm" ? `(${(v as number[]).join(", ")})` : py(v)}`);
  }
  return `pages(${args.join(", ")})`;
}

const callRe = (part: string | null) =>
  part === null
    ? /^pages\((?![^)\n]*\bpart\s*=)[^\n]*\)[ \t]*$/m
    : new RegExp(String.raw`^pages\([^\n]*\bpart\s*=\s*["']${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^\n]*\)[ \t]*$`, "m");

/** the code with this sheet's pages(...) line replaced, or added after the score = line (else at the end) */
export function writeSetup(code: string, s: PageSetup): string {
  const line = setupCode(s);
  const re = callRe(s.part);
  if (re.test(code)) return code.replace(re, () => line);
  const lines = code.replace(/\s*$/, "").split("\n");
  let at = -1;
  lines.forEach((l, i) => /^score\s*=/.test(l) && (at = i));
  // after the score = statement (and any lines continuing it), and after edit_bar / earlier pages lines
  if (at >= 0) {
    while (at + 1 < lines.length && /^(\s+|\)|edit_bar\(|pages\()/.test(lines[at + 1])) at++;
    lines.splice(at + 1, 0, line);
  } else lines.push(line);
  return `${lines.join("\n")}\n`;
}

/** bar numbers → measure indices (the score's measures), for the engraver */
export const barIndices = (bars: number[], measures: { n: number }[]) =>
  bars.map((n) => measures.findIndex((m) => m.n === n)).filter((i) => i > 0);
/** and back */
export const barNumbers = (indices: number[], measures: { n: number }[]) =>
  indices.map((i) => measures[i]?.n).filter((n): n is number => n !== undefined);
