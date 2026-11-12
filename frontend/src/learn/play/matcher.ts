/**
 * Grading what was played against the music (Learn to ▸ Play). The rules are the test, as in Learn to Code:
 * the right notes, in order, each on time within a tolerance.
 *
 * "In time": the played note-ons are aligned with the target notes by dynamic programming (like a diff), so one
 * wrong or missing note doesn't push every later note out of line. A matched note is "ok" when it starts within the
 * tolerance, "early"/"late" within 2.5× the tolerance, otherwise it counts as wrong; target notes nobody played are
 * "missed", extra notes are counted.
 * "Wait for me": the music waits at each note (or chord) until it is played; wrong keys are counted as mistakes.
 */

export interface TargetNote {
  id: string;
  midi: number;
  /** ms from the first note */
  time: number;
}
export interface PlayedNote {
  midi: number;
  /** ms from the first note's expected time (negative = before it) */
  time: number;
}
export type Mark = "ok" | "early" | "late" | "wrong" | "missed";
export interface NoteResult {
  id: string;
  mark: Mark;
  /** ms, played − expected (only for matched notes) */
  offset?: number;
}
export interface Grade {
  results: NoteResult[];
  /** played notes that matched nothing */
  extra: number;
  /** 0–100: on-time notes count 1, early/late ½ */
  score: number;
  passed: boolean;
}

export const PASS = 80;

function scoreOf(results: NoteResult[], extra: number): number {
  if (!results.length) return 0;
  const pts = results.reduce((s, r) => s + (r.mark === "ok" ? 1 : r.mark === "early" || r.mark === "late" ? 0.5 : 0), 0);
  // extra notes cost a little, so mashing keys doesn't pass
  return Math.max(0, Math.round((100 * (pts - 0.25 * extra)) / results.length));
}

/** grade a performance in time */
export function gradeInTime(target: TargetNote[], played: PlayedNote[], toleranceMs: number): Grade {
  const T = [...target].sort((a, b) => a.time - b.time || a.midi - b.midi);
  // notes played together (a chord, within 60 ms) are put in pitch order, as the target's chords are
  const byTime = [...played].sort((a, b) => a.time - b.time);
  const P: PlayedNote[] = [];
  for (let k = 0; k < byTime.length; ) {
    let e = k + 1;
    while (e < byTime.length && byTime[e].time - byTime[e - 1].time < 60) e++;
    P.push(...byTime.slice(k, e).sort((a, b) => a.midi - b.midi));
    k = e;
  }
  const n = T.length;
  const m = P.length;
  const window = toleranceMs * 2.5;
  // cost of matching target i with played j: 0 when on time, rising to 1 at the edge of the window; wrong pitch or
  // outside the window: not allowed as a match (it is a skip on both sides instead)
  const match = (i: number, j: number) => {
    if (T[i].midi !== P[j].midi) return Infinity;
    const d = Math.abs(P[j].time - T[i].time);
    return d > window ? Infinity : d / window;
  };
  const SKIP = 1;
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity));
  const back: (0 | 1 | 2)[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  cost[0][0] = 0;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (i === 0 && j === 0) continue;
      let best = Infinity;
      let how: 0 | 1 | 2 = 0;
      if (i > 0 && j > 0) {
        const c = cost[i - 1][j - 1] + match(i - 1, j - 1);
        if (c < best) (best = c), (how = 0);
      }
      if (i > 0 && cost[i - 1][j] + SKIP < best) (best = cost[i - 1][j] + SKIP), (how = 1); // target missed
      if (j > 0 && cost[i][j - 1] + SKIP < best) (best = cost[i][j - 1] + SKIP), (how = 2); // extra played note
      cost[i][j] = best;
      back[i][j] = how;
    }
  }
  const byTarget = new Map<number, number>();
  let extra = 0;
  for (let i = n, j = m; i > 0 || j > 0; ) {
    const how = back[i][j];
    if (i > 0 && j > 0 && how === 0) {
      byTarget.set(i - 1, j - 1);
      i--;
      j--;
    } else if (i > 0 && (how === 1 || j === 0)) i--;
    else {
      extra++;
      j--;
    }
  }
  // a played note at a target's time but with the wrong pitch makes that target "wrong" rather than "missed"
  const usedWrong = new Set<number>();
  const results: NoteResult[] = T.map((t, i) => {
    const j = byTarget.get(i);
    if (j !== undefined) {
      const offset = Math.round(P[j].time - t.time);
      const mark: Mark = Math.abs(offset) <= toleranceMs ? "ok" : offset < 0 ? "early" : "late";
      return { id: t.id, mark, offset };
    }
    const near = P.findIndex((p, k) => !usedWrong.has(k) && ![...byTarget.values()].includes(k) && Math.abs(p.time - t.time) <= window);
    if (near >= 0) {
      usedWrong.add(near);
      return { id: t.id, mark: "wrong" };
    }
    return { id: t.id, mark: "missed" };
  });
  const extraLeft = Math.max(0, extra - usedWrong.size);
  const score = scoreOf(results, extraLeft);
  return { results, extra: extraLeft, score, passed: score >= PASS && results.every((r) => r.mark !== "missed") };
}

/** the notes of the target grouped by start time (a chord is one step in "Wait for me") */
export function steps(target: TargetNote[]): TargetNote[][] {
  const out: TargetNote[][] = [];
  for (const t of [...target].sort((a, b) => a.time - b.time || a.midi - b.midi)) {
    const last = out[out.length - 1];
    if (last && Math.abs(last[0].time - t.time) < 5) last.push(t);
    else out.push([t]);
  }
  return out;
}

/** "Wait for me": the state after each key press */
export interface WaitState {
  step: number;
  /** ids already played in the current step */
  done: string[];
  /** mistakes per target id (wrong keys while it was due) */
  mistakes: Record<string, number>;
  finished: boolean;
}
export const startWait = (): WaitState => ({ step: 0, done: [], mistakes: {}, finished: false });

export function pressWait(s: WaitState, plan: TargetNote[][], midi: number): WaitState {
  if (s.finished) return s;
  const due = plan[s.step];
  const hit = due.find((t) => t.midi === midi && !s.done.includes(t.id));
  if (!hit) {
    const mistakes = { ...s.mistakes };
    for (const t of due) if (!s.done.includes(t.id)) mistakes[t.id] = (mistakes[t.id] ?? 0) + 1;
    return { ...s, mistakes };
  }
  const done = [...s.done, hit.id];
  if (done.length < due.length) return { ...s, done };
  const step = s.step + 1;
  return { step, done: [], mistakes: s.mistakes, finished: step >= plan.length };
}

export function gradeWait(s: WaitState, plan: TargetNote[][]): Grade {
  const results: NoteResult[] = plan.flat().map((t) => ({ id: t.id, mark: s.mistakes[t.id] ? "wrong" : "ok" }));
  const score = scoreOf(results, 0);
  return { results, extra: 0, score, passed: s.finished && score >= PASS };
}
