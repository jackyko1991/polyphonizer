/**
 * Harmonic analyses from When in Rome (Mark Gotham et al., CC BY-SA 4.0) for the Library's works (analyses.json, made
 * by scripts/harmony_catalog.py): Roman numerals in RomanText, downloaded when the work is opened and written under
 * the bass by with_harmony (prelude.py).
 */
import type { Row } from "./collections.ts";

export interface Analyses {
  sha: string;
  /** Library row key → the analysis's path in the repository */
  works: Record<string, string>;
}

/** a row's key in analyses.json: music21's corpus path, an OpenScore song's lc id, or a sonata movement's file (ASAP,
 * Craig Sapp's Mozart); null for others */
export function analysisKey(r: Row): string | null {
  if (!r[13]) return r[1];
  if (r[13] === "openscore-lieder") return /\/(lc\d+)\.mxl$/.exec(r[1])?.[1] ?? null;
  // piano sonatas (Beethoven's, Mozart's): the row's own file
  if (r[13] === "asap" || r[13] === "sapp-mozart") return r[1];
  return null;
}

export const analysisUrl = (a: Analyses, path: string) => `https://raw.githubusercontent.com/MarkGotham/When-in-Rome/${a.sha}/${path}`;

/** main.py with the analysis added: one line after the score is made (delete it to take the numerals away) */
export function codeWithHarmony(code: string, url: string): string {
  return `${code.replace(/\s*$/, "")}
# Harmony: When in Rome (Mark Gotham et al., CC BY-SA 4.0): Roman numerals under the bass; delete the line to hide them
score = with_harmony(score, fetch_score(${JSON.stringify(url)}))
`;
}
