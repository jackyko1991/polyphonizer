/**
 * A line diff for the agent's changes (the longest common subsequence of lines), grouped into hunks with a few lines
 * of context, as a code review shows it. Score files are small (a few hundred lines), so the plain O(n·m) table does.
 */

export type DiffLine = { op: " " | "+" | "-"; text: string; a?: number; b?: number };

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  if (a[a.length - 1] === "" && b[b.length - 1] === "") (a.pop(), b.pop());
  const n = a.length;
  const m = b.length;
  // lcs[i][j]: the common lines of a[i:] and b[j:]
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) out.push({ op: " ", text: a[i], a: ++i, b: ++j });
    // (on a tie the old line goes first: - then +, as a review shows a changed line)
    else if (i < n && (j >= m || lcs[i + 1][j] >= lcs[i][j + 1])) out.push({ op: "-", text: a[i], a: ++i });
    else out.push({ op: "+", text: b[j], b: ++j });
  }
  return out;
}

/** the changed lines with `context` lines around them; null between hunks */
export function hunks(lines: DiffLine[], context = 2): (DiffLine | null)[] {
  const keep = new Set<number>();
  lines.forEach((l, i) => {
    if (l.op !== " ") for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) keep.add(k);
  });
  const out: (DiffLine | null)[] = [];
  let prev = -1;
  for (const i of [...keep].sort((x, y) => x - y)) {
    if (prev >= 0 && i > prev + 1) out.push(null);
    out.push(lines[i]);
    prev = i;
  }
  return out;
}

/** lines added and taken away */
export const counts = (lines: DiffLine[]) => ({ added: lines.filter((l) => l.op === "+").length, removed: lines.filter((l) => l.op === "-").length });
