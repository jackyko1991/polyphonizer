/**
 * Page turns: choose where pages break so that every turn falls where the player has a rest long enough to turn.
 *
 * The engraver (Verovio) has already split the music into systems (lines). We keep those lines and choose which
 * page each starts, by dynamic programming over the systems: a page holds at most `perPage` systems; an unfilled
 * page costs its empty space squared (the last page costs little); a turn without enough rest costs a lot, so the
 * plan only accepts one when no layout avoids it, and reports it.
 *
 * Which page ends are turns depends on how the music sits on the stand: one page at a time (every page end is a
 * turn) or as open spreads (pages 1–2 face each other, so the first turn is after page 2, then 4, 6 …), or a part
 * that starts on a right-hand page (turns after pages 1, 3, 5 …).
 */
import type { NoteEvent, MeasureInfo } from "./types.ts";

export type Stand = "single" | "spread" | "spread-right";

export interface PlanInput {
  /** first measure index (into the score's measures) of each system, ascending, starting at 0 */
  systemStarts: number[];
  /** rest available at the start of each measure index, in seconds (see restAtMeasureStarts) */
  restAt: number[];
  perPage: number;
  stand: Stand;
  /** seconds a turn needs */
  minRest: number;
  /** systems that must start a page (the player's own page breaks) */
  forcedStarts?: number[];
}

export interface Turn {
  /** the page after which the player turns (1-based) */
  afterPage: number;
  /** measure index where the next page starts */
  measure: number;
  rest: number;
  ok: boolean;
}

export interface Plan {
  /** index of the first system of each page */
  pageStarts: number[];
  turns: Turn[];
  ok: boolean;
}

export function isTurn(page: number, stand: Stand): boolean {
  if (stand === "single") return true;
  if (stand === "spread") return page % 2 === 0;
  return page % 2 === 1;
}

const BAD_TURN = 10_000;

export function planPages({ systemStarts, restAt, perPage, stand, minRest, forcedStarts = [] }: PlanInput): Plan {
  const n = systemStarts.length;
  const cap = Math.max(1, perPage);
  // best[i][p]: least cost to lay out systems 0..i-1 on p pages (p bounded by n)
  const best: number[][] = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(Infinity));
  const from: number[][] = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(-1));
  best[0][0] = 0;
  const turnCost = (sys: number) => {
    const rest = restAt[systemStarts[sys]] ?? 0;
    return rest >= minRest ? 0 : BAD_TURN + (minRest - rest) * 100;
  };
  for (let i = 1; i <= n; i++) {
    for (let p = 1; p <= i; p++) {
      for (let k = Math.max(0, i - cap); k < i; k++) {
        const prev = best[k][p - 1];
        if (prev === Infinity) continue;
        // a page may not run across a forced page break
        if (forcedStarts.some((f) => f > k && f < i)) continue;
        const empty = cap - (i - k);
        let cost = prev + (i === n ? 0.2 : 1) * empty * empty;
        // the break before page p (after page p-1) is a turn?
        if (p > 1 && isTurn(p - 1, stand)) cost += turnCost(k);
        if (cost < best[i][p]) {
          best[i][p] = cost;
          from[i][p] = k;
        }
      }
    }
  }
  let pages = 1;
  for (let p = 1; p <= n; p++) if (best[n][p] < best[n][pages]) pages = p;
  const pageStarts: number[] = [];
  for (let i = n, p = pages; p > 0; p--) {
    const k = from[i][p];
    pageStarts.unshift(k);
    i = k;
  }
  const turns = turnsAt(
    pageStarts.map((s) => systemStarts[s]),
    restAt,
    stand,
    minRest,
  );
  return { pageStarts: n ? pageStarts : [], turns, ok: turns.every((t) => t.ok) };
}

/** the turns for pages starting at these measure indices (first = page 1) */
export function turnsAt(pageStartMeasures: number[], restAt: number[], stand: Stand, minRest: number): Turn[] {
  const turns: Turn[] = [];
  for (let p = 1; p < pageStartMeasures.length; p++) {
    if (!isTurn(p, stand)) continue;
    const measure = pageStartMeasures[p];
    const rest = restAt[measure] ?? 0;
    turns.push({ afterPage: p, measure, rest, ok: rest >= minRest });
  }
  return turns;
}

/**
 * Seconds of rest around the start of each measure: rests running up to the barline plus rests after it, in the
 * parts given (a turn needs every one of them silent). Index = measure index; one extra entry for the end.
 */
export function restAtMeasureStarts(notes: NoteEvent[], measures: MeasureInfo[], bpm: number, parts: number[]): number[] {
  const sec = 60 / (bpm || 96);
  // sounding spans per part, sorted
  const spans = parts.map((p) =>
    notes
      .filter((n) => n.part === p && n.midi.length)
      .map((n) => [n.offset, n.offset + n.dur] as const)
      .sort((a, b) => a[0] - b[0]),
  );
  const end = measures.length ? measures[measures.length - 1].offset + measures[measures.length - 1].length : 0;
  return [...measures.map((m) => m.offset), end].map((t) => {
    let before = Infinity;
    let after = Infinity;
    for (const s of spans) {
      const lastEnd = Math.max(0, ...s.filter(([, e]) => e <= t + 1e-9).map(([, e]) => e));
      const sounding = s.some(([a, e]) => a < t - 1e-9 && e > t + 1e-9);
      const nextStart = Math.min(end, ...s.filter(([a]) => a >= t - 1e-9).map(([a]) => a));
      before = Math.min(before, sounding ? 0 : t - lastEnd);
      after = Math.min(after, sounding ? 0 : nextStart - t);
    }
    if (!spans.length) return 0;
    return (before + after) * sec;
  });
}
