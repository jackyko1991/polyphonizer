/**
 * The playback cursor: a vertical line over the current system that follows the music. Each onset (a time when
 * notes start) has an x on the page and belongs to a system; between two onsets in the same system the line glides
 * by time, so it moves smoothly through long notes and rests; at a system's end it jumps to the next.
 */

export interface Onset {
  /** ms, at the written tempo */
  time: number;
  /** px in the score panel's content box */
  x: number;
  /** the system it is in: its top and height (px), and its index */
  top: number;
  height: number;
  system: number;
}

/** where the line is at time `t`; `glide` false (reduced motion) steps from onset to onset */
export function cursorAt(onsets: Onset[], t: number, glide = true): Omit<Onset, "time"> | null {
  if (!onsets.length) return null;
  // the last onset at or before t (binary search; onsets are sorted by time)
  let lo = 0;
  let hi = onsets.length - 1;
  if (t <= onsets[0].time) return strip(onsets[0]);
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (onsets[mid].time <= t) lo = mid;
    else hi = mid - 1;
  }
  const a = onsets[lo];
  const b = onsets[lo + 1];
  if (!glide || !b || b.system !== a.system || b.time <= a.time) return strip(a);
  const f = Math.min(1, (t - a.time) / (b.time - a.time));
  return { x: a.x + (b.x - a.x) * f, top: a.top, height: a.height, system: a.system };
}

const strip = ({ x, top, height, system }: Onset) => ({ x, top, height, system });

/** merge elements that start together into one onset per time: the leftmost x, sorted by time */
export function onsetTable(items: { time: number; x: number; top: number; height: number; system: number }[]): Onset[] {
  const byTime = new Map<number, Onset>();
  for (const it of items) {
    const o = byTime.get(it.time);
    if (!o || it.x < o.x) byTime.set(it.time, { ...it });
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}
