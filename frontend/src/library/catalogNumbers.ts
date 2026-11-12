/**
 * Catalogue numbers (BWV, K./KV, Op. … No., Hob., HWV, D, Wq., H., WoO), read the same way from a work's path and
 * title and from what someone types, so "kv 156", "K. 156" and "k156" all find mozart/k156, and "op 59" finds
 * Op. 59 No. 1, 2 and 3. Ids look like "bwv:66.6", "k:156", "op:59.2", "wq:55.4".
 */

type Scheme = { id: string; re: RegExp; label: (n: string, sub?: string) => string; only?: RegExp };

const NUM = String.raw`(\d+[a-z]?)`;
const SCHEMES: Scheme[] = [
  { id: "bwv", re: new RegExp(String.raw`\bbwv\s*\.?\s*${NUM}(?:\s*[./]\s*(\d+))?`, "gi"), label: (n, s) => `BWV ${n}${s ? `.${s}` : ""}` },
  { id: "k", re: new RegExp(String.raw`\b(?:kv|k)\s*\.?\s*${NUM}\b`, "gi"), label: (n) => `K. ${n}` },
  {
    id: "op",
    re: new RegExp(String.raw`\bop(?:us)?\s*\.?\s*${NUM}(?:\s*[,/\-]?\s*(?:no|nr|n°|#)?\s*\.?\s*(\d+)\b)?`, "gi"),
    label: (n, s) => `Op. ${n}${s ? ` No. ${s}` : ""}`,
  },
  { id: "hob", re: /\bhob\s*\.?\s*([ivxlc]+[a-z]?)\s*[:.\s]\s*(\d+)/gi, label: (n, s) => `Hob. ${n.toUpperCase()}:${s}` },
  { id: "hwv", re: new RegExp(String.raw`\bhwv\s*\.?\s*${NUM}`, "gi"), label: (n) => `HWV ${n}` },
  { id: "wq", re: new RegExp(String.raw`\bwq\s*\.?\s*${NUM}(?:\s*[./]\s*(\d+))?`, "gi"), label: (n, s) => `Wq. ${n}${s ? `/${s}` : ""}` },
  { id: "woo", re: new RegExp(String.raw`\bwoo\s*\.?\s*${NUM}`, "gi"), label: (n) => `WoO ${n}` },
  // one-letter catalogues: only for their composer's works in the catalogue (a typed "h 186" or "d 960" always counts)
  { id: "h", re: new RegExp(String.raw`\bh\s*\.?\s*${NUM}\b`, "gi"), label: (n) => `H. ${n}`, only: /C\. P\. E\. Bach/ },
  { id: "d", re: new RegExp(String.raw`\bd\s*\.?\s*${NUM}\b`, "gi"), label: (n) => `D. ${n}`, only: /Schubert/ },
];

/** "opus59no2" → "opus 59 no 2", "k156" stays (the patterns allow no space), underscores and slashes become spaces */
const prepare = (text: string) =>
  text
    .replace(/[_/]+(?=[a-z])/gi, " ")
    .replace(/(\d)(no|nr)(?=\d)/gi, "$1 $2 ")
    .replace(/\.(mxl|xml|krn|abc|musicxml)\b/gi, " ");

/** catalogue ids found in a text; `composer` limits the one-letter schemes */
export function catalogIds(text: string, composer?: string): string[] {
  const ids = new Set<string>();
  const src = prepare(text);
  for (const s of SCHEMES) {
    if (s.only && composer !== undefined && !s.only.test(composer)) continue;
    for (const m of src.matchAll(s.re)) ids.add(`${s.id}:${m[1].toLowerCase()}${m[2] ? `.${m[2]}` : ""}`);
  }
  // "bwv 66" inside "bwv66.6": keep only the most specific id of each scheme+number
  return [...ids].filter((id) => ![...ids].some((o) => o !== id && o.startsWith(`${id}.`)));
}

/** what someone typed: its catalogue ids, and the words left over */
export function parseQuery(query: string): { ids: string[]; rest: string } {
  const ids: string[] = [];
  let rest = prepare(query);
  for (const s of SCHEMES)
    rest = rest.replace(s.re, (...args: unknown[]) => {
      // after the groups, replace() passes the offset (a number): a scheme without a sub-number has no 2nd group
      const n = args[1] as string;
      const sub = typeof args[2] === "string" ? args[2] : undefined;
      ids.push(`${s.id}:${n.toLowerCase()}${sub ? `.${sub}` : ""}`);
      return " ";
    });
  return { ids, rest: rest.replace(/\s+/g, " ").trim() };
}

/** a typed id finds a work's id when equal, or when the typed one has no sub-number ("op:59" finds "op:59.2") */
export const idMatches = (typed: string, work: string) => work === typed || work.startsWith(`${typed}.`);

/** "k:156" → "K. 156" */
export function idLabel(id: string): string {
  const [scheme, num] = id.split(":");
  const [n, sub] = num.split(".");
  return SCHEMES.find((s) => s.id === scheme)?.label(n, sub) ?? id;
}
