/**
 * The Library's rows and the open collections (library/collections.json, made by scripts/collections_catalog.py):
 * the row shape, which source a row comes from, the text its catalogue numbers are read from, the Library's order,
 * and the main.py a work opens as.
 */
import type { L } from "../problems.ts";

/** [collection, path, number, title, composer, parts, key, time, era, tradition (or the set a song belongs to),
 * original composer, instrument per part, part names, source, the work's own licence if its source's vary]. A collection's work (collections.json) has its pinned
 * URL as path and its source id last; music21's corpus rows have no source. */
export type Row = [string, string, number | null, string, string, number, number | null, string, string, string, string, string[]?, string[]?, string?, WorkLicence?];
/** a work's own licence, where a source's works differ (Mutopia: public domain, CC BY or CC BY-SA) */
export type WorkLicence = "pd" | "by" | "by-sa";

/** an open collection (collections.json "sources") */
export interface Source {
  repo: string;
  name: L;
  licence: string;
  licenceUrl: string;
  /** "OpenScore Lieder (CC0), openscore.cc": shown with each work and written into main.py */
  credit: string;
  homepage: string;
  nonCommercial: boolean;
  /** the commit every URL is pinned to */
  sha: string;
}
export const MUSIC21 = "music21";
export const sourceOf = (r: Row) => r[13] ?? MUSIC21;
/** the text a work's catalogue numbers are read from: path and title; a collection's work: title and set (its URL's
 * folder names lost their slashes: "K.421417b") */
export const idText = (r: Row) => (r[13] ? `${r[3]} ${r[9]}` : `${r[1]} ${r[3]}`);
/** the corpus's order: by composer (Traditional, Anonymous and examples last), then title */
const LAST: Record<string, number> = { Traditional: 2, Anonymous: 1, "music21 examples": 3, Unknown: 3 };
export const byComposer = (a: Row, b: Row) => {
  const ka = [LAST[a[4]] ?? 0, a[4], a[3].toLowerCase()];
  const kb = [LAST[b[4]] ?? 0, b[4], b[3].toLowerCase()];
  for (let i = 0; i < 3; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
  return 0;
};

/** main.py for one work; a collection's work credits its source in the first line */
export function codeFor(r: Row, sources: Record<string, Source> = {}): string {
  const [, path, number, title, composer] = r;
  const source = r[13] ? sources[r[13]] : undefined;
  if (r[13])
    return [
      `# ${composer}: ${title}${r[9] ? ` (${r[9]})` : ""} — ${source?.credit ?? r[13]}${source?.nonCommercial ? ", non-commercial use only" : ""}`,
      "# Downloaded once, then kept in this browser. To change notes: Score ▸ ✎ Edit notes, or write edit_bar(…) lines",
      "# below; the original stays as it is, and deleting a line undoes that change.",
      `score = fetch_score(${JSON.stringify(path)})`,
      "",
    ].join("\n");
  const args = number === null ? JSON.stringify(path) : `${JSON.stringify(path)}, number=${number}`;
  return [
    `# ${composer}: ${title}`,
    "# From music21's corpus. To change notes: Score ▸ ✎ Edit notes, or write edit_bar(…) lines below;",
    "# the original stays as it is, and deleting a line undoes that change.",
    `score = corpus.parse(${args})`,
    "",
  ].join("\n");
}

