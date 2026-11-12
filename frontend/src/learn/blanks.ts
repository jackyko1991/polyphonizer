/**
 * Fill-in-the-blank lessons: `___` (three or more underscores) marks a gap in the starter code. A blank is found
 * before the code runs, so the student reads "Fill the blank on line N" instead of a Python or tinyNotation error.
 */
import type { L } from "../problems.ts";

export interface Blank {
  /** 1-based line and column; end column exclusive */
  line: number;
  column: number;
  endColumn: number;
  /** offsets in the code */
  from: number;
  to: number;
}

export const BLANK = /_{3,}/g;

/** the line up to a `#` comment (a `#` inside a string, like the sharp in "f#", is not one) */
function withoutComment(line: string): string {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "#") return line.slice(0, i);
  }
  return line;
}

export function blankIssues(code: string): Blank[] {
  const out: Blank[] = [];
  let lineStart = 0;
  code.split("\n").forEach((line, i) => {
    const text = withoutComment(line);
    for (const m of text.matchAll(BLANK)) {
      // a Python name that merely contains underscores (my___var, __init__) is not a blank
      const before = text[m.index - 1] ?? "";
      const after = text[m.index + m[0].length] ?? "";
      if (/\w/.test(before) && /\w/.test(after)) continue;
      out.push({ line: i + 1, column: m.index + 1, endColumn: m.index + m[0].length + 1, from: lineStart + m.index, to: lineStart + m.index + m[0].length });
    }
    lineStart += line.length + 1;
  });
  return out;
}

export const blankMessage = (line: number): L => [`Fill the blank on line ${line}.`, `請填入第 ${line} 行的空格。`];
