/**
 * One spelling per composer across the Library's sources (composerAliases.json, made by scripts/composer-aliases.ts):
 * "F. Liszt" (Mutopia) is the Franz Liszt of the other sources, IMSLP's "Aleksandr Scriabin" the Library's
 * "Alexander Scriabin".
 */
import ALIASES from "./composerAliases.json" with { type: "json" };
import type { Row } from "./collections.ts";

const A = ALIASES as Record<string, string>;

export const canonicalComposer = (name: string) => A[name] ?? name;

/** a row under its composer's one spelling (the row itself when the spelling is that already) */
export function withCanonicalComposer(r: Row): Row {
  const name = A[r[4]];
  if (!name) return r;
  const out = [...r] as Row;
  out[4] = name;
  return out;
}
