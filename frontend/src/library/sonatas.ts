/**
 * Beethoven's and Mozart's piano sonatas by number, as their catalogue numbers: a title that gives only the number
 * ("Piano Sonata No. 8 · 2", the ASAP dataset's) still finds the same sonata elsewhere (IMSLP's "Op.13").
 * (scripts/harmony_catalog.py has the same lists, by When in Rome's folder names.)
 */
const BEETHOVEN = ["op:2.1", "op:2.2", "op:2.3", "op:7", "op:10.1", "op:10.2", "op:10.3", "op:13", "op:14.1", "op:14.2", "op:22", "op:26", "op:27.1", "op:27.2", "op:28", "op:31.1", "op:31.2", "op:31.3", "op:49.1", "op:49.2", "op:53", "op:54", "op:57", "op:78", "op:79", "op:81", "op:90", "op:101", "op:106", "op:109", "op:110", "op:111"];
const MOZART = [279, 280, 281, 282, 283, 284, 309, 310, 311, 330, 331, 332, 333, 457, 533, 545, 570, 576].map((k) => `k:${k}`);

/** the catalogue number a "Piano Sonata No. N" title by Beethoven or Mozart stands for, or null */
export function sonataId(composer: string, title: string): string | null {
  const n = Number(/^Piano Sonata No\. (\d+)\b/.exec(title)?.[1] ?? 0);
  const list = composer === "Ludwig van Beethoven" ? BEETHOVEN : composer === "Wolfgang Amadeus Mozart" ? MOZART : null;
  return list && n >= 1 && n <= list.length ? list[n - 1] : null;
}
