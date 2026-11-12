/**
 * Lint checking for score code, in the browser: Ruff (compiled to WebAssembly, loaded on first use) plus one rule of
 * our own (the main file must set `score`). Score code runs with music21's modules and the prelude's helpers already
 * imported (see python.worker.ts), so the linter sees the same names through a one-line header.
 */
import type { Diagnostic as RuffDiagnostic, Workspace } from "@astral-sh/ruff-wasm-web";

/** what `from music21 import *` gives score code (music21.__all__), and the prelude's helpers */
const MUSIC21 = [
  "abcFormat", "alpha", "analysis", "articulations", "audioSearch", "bar", "base", "beam", "braille", "capella",
  "chord", "clef", "common", "configure", "converter", "corpus", "defaults", "derivation", "duration", "dynamics",
  "editorial", "environment", "exceptions21", "expressions", "features", "figuredBass", "freezeThaw", "graph",
  "harmony", "humdrum", "instrument", "interval", "key", "languageExcerpts", "layout", "lily", "mei", "metadata",
  "meter", "midi", "musedata", "musicxml", "noteworthy", "note", "omr", "percussion", "pitch", "prebase", "repeat",
  "roman", "romanText", "scale", "search", "serial", "sieve", "sites", "sorting", "spanner", "stream", "style",
  "tablature", "tempo", "text", "tie", "tinyNotation", "tree", "variant", "vexflow", "voiceLeading", "volpiano",
  "volume",
];
const HELPERS = ["tiny", "together", "load", "edit_bar", "fetch_score"];
/** markings.py: playing techniques */
const MARKINGS = [
  "bowings", "slur", "staccato", "spiccato", "tenuto", "accent", "harmonic", "pizz", "arco", "fingering", "text",
  "pedal", "una_corda", "arpeggio", "breath", "trill", "lyrics",
];
/** one line, so the user's line n is the linted line n + 1 */
const HEADER = `from music21 import ${MUSIC21.join(", ")}; from polyphonizer import ${[...HELPERS, ...MARKINGS].join(", ")}\n`;

export interface LintIssue {
  /** 1-based line and column in the user's code; end is exclusive */
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  severity: "error" | "warning";
  code: string | null;
  message: string;
}

let workspace: Promise<Workspace> | null = null;
function ruff(): Promise<Workspace> {
  workspace ??= import("@astral-sh/ruff-wasm-web").then(async (m) => {
    await m.default();
    return new m.Workspace(
      {
        "line-length": 120,
        lint: {
          // syntax errors, pyflakes (undefined names, unused variables …) and common bugs
          select: ["E4", "E9", "F", "B", "PLE"],
          // the header's star-free imports are fine; music21 code often reuses loop variables
          ignore: ["F401", "F403", "F405", "B007"],
        },
      },
      m.PositionEncoding.Utf16,
    );
  });
  return workspace;
}

/** errors stop the code from running; the rest are warnings */
const isError = (code: string | null) => code === null || code === "invalid-syntax" || code.startsWith("E9") || code === "F821" || code === "F822" || code.startsWith("PLE");

/** lint one file; `main` = the file that must set `score` */
export async function lint(code: string, main: boolean): Promise<LintIssue[]> {
  const ws = await ruff();
  let found: RuffDiagnostic[];
  try {
    found = ws.check(HEADER + code) as RuffDiagnostic[];
  } catch {
    return [];
  }
  const issues: LintIssue[] = found
    .filter((d) => d.start_location.row > 1)
    .map((d) => ({
      line: d.start_location.row - 1,
      column: d.start_location.column,
      endLine: d.end_location.row - 1,
      endColumn: d.end_location.column,
      severity: isError(d.code) ? "error" : "warning",
      code: d.code,
      message: d.message,
    }));
  if (main && !/^\s*score\s*(:[^=]*)?=(?!=)/m.test(code) && !issues.some((i) => i.severity === "error")) {
    issues.push({
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 1,
      severity: "error",
      code: "PZ001",
      message: "Set `score` to your result, e.g. `score = together(violin, cello)`.",
    });
  }
  return issues;
}
