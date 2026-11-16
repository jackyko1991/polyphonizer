/**
 * Write frontend/src/library/composerAliases.json: one spelling per composer across the Library's sources.
 *
 *     node scripts/composer-aliases.ts          (pixi run aliases; after the catalogues or IMSLP's index change)
 *
 * A composer the Library names itself (with a Chinese name in lexicon.ts) keeps that spelling, and IMSLP's spelling of
 * the same person maps to it; any other name takes IMSLP's spelling when exactly one IMSLP composer fits it
 * (composerMatch.ts). The page and the catalogue database both apply the result, so "F. Liszt" (Mutopia) and
 * "Franz Liszt" (ASAP) are one composer, and a work's editions on IMSLP find it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Row } from "../frontend/src/library/collections.ts";
import { indexBySurname, matchComposer } from "../frontend/src/library/composerMatch.ts";
import { parseImslp } from "../frontend/src/library/imslp.ts";
import { COMPOSER_ZH } from "../frontend/src/library/lexicon.ts";
import { URTEXT } from "../frontend/src/library/urtext.ts";
import type { MutopiaRow } from "../frontend/src/library/mutopia.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIB = join(ROOT, "frontend/src/library");
const read = <T>(p: string) => JSON.parse(readFileSync(p, "utf8")) as T;

export function aliases(): Record<string, string> {
  const core = new Set<string>([
    ...read<{ works: Row[] }>(join(LIB, "catalog.json")).works.map((r) => r[4]),
    ...read<{ works: Row[] }>(join(LIB, "collections.json")).works.map((r) => r[4]),
    ...read<{ works: MutopiaRow[] }>(join(LIB, "mutopia.json")).works.map((r) => r[2]),
  ]);
  const imslp = [...new Set(parseImslp(readFileSync(join(ROOT, "data/imslp.tsv"), "utf8")).works.map((w) => w[1]))];
  const index = indexBySurname(imslp);
  // the Library's own spellings: those it gives a Chinese name, and those its urtext list goes by
  const curated = new Set([...Object.keys(COMPOSER_ZH), ...URTEXT]);
  const out: Record<string, string> = {};
  for (const name of core) {
    const theirs = matchComposer(name, index);
    if (!theirs || /[@^]/.test(theirs)) continue;
    if (curated.has(name)) {
      // the Library's own spelling stays; IMSLP's of the same person comes to it
      if (theirs !== name) out[theirs] = name;
    } else if (theirs !== name) out[name] = theirs;
  }
  // to the end of a chain: "Peter Ilyich Tchaikovsky" → "Pyotr Tchaikovsky" → the Library's "Pyotr Ilyich Tchaikovsky"
  const final = (n: string, seen = new Set<string>()): string => (out[n] && !seen.has(n) ? final(out[n], seen.add(n)) : n);
  for (const k of Object.keys(out)) out[k] = final(k);
  for (const k of Object.keys(out)) if (out[k] === k) delete out[k];
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = aliases();
  writeFileSync(join(LIB, "composerAliases.json"), JSON.stringify(a, Object.keys(a).sort(), 1) + "\n");
  console.log(`${Object.keys(a).length} names → one spelling each`);
  for (const [k, v] of Object.entries(a).slice(0, 400)) console.log(`  ${k} → ${v}`);
}
