/**
 * Scores that score code may download with fetch_score("…"): only files of these repositories (open-licence
 * collections, see library/collections.json and scripts/collections_catalog.py). Python can't wait for the network,
 * so the worker finds fetch_score("…") literals in the code before running it, downloads them (Cache API, so a score
 * opened once also opens offline), writes them to Pyodide's /files/fetched/ and tells fetch_score() where they are.
 * prelude.py has the same list (_SCORE_SOURCES); a test keeps the two equal.
 */

export const SCORE_SOURCES = [
  "https://raw.githubusercontent.com/OpenScore/Lieder/",
  "https://raw.githubusercontent.com/OpenScore/StringQuartets/",
  "https://raw.githubusercontent.com/craigsapp/mozart-piano-sonatas/",
  "https://raw.githubusercontent.com/craigsapp/joplin/",
  "https://raw.githubusercontent.com/craigsapp/haydn-piano-sonatas/",
  "https://raw.githubusercontent.com/craigsapp/scarlatti-keyboard-sonatas/",
  "https://raw.githubusercontent.com/fosfrancesco/asap-dataset/",
  "https://raw.githubusercontent.com/josquin-research-project/jrp-scores/",
  "https://raw.githubusercontent.com/MarkGotham/When-in-Rome/",
];

/** the Cache API cache the downloaded scores live in */
export const SCORE_CACHE = "polyphonizer-scores";

/** a file of one of the allowed repositories (https only, no "..", no query or fragment, no line breaks) */
export function isAllowedScoreUrl(url: string): boolean {
  if (!SCORE_SOURCES.some((p) => url.startsWith(p))) return false;
  // (a space is fine: one OpenScore folder name has one)
  if (/[?#\\\t\n\r\f\v]/.test(url) || /(^|\/)\.\.?(\/|$)/.test(url) || /%2e|%2f|%5c/i.test(url)) return false;
  return url.length > SCORE_SOURCES.find((p) => url.startsWith(p))!.length;
}

/** the URLs in fetch_score("…") / fetch_score('…') calls (string literals only) */
export function scoreUrlsIn(code: string): string[] {
  const out = new Set<string>();
  for (const m of code.matchAll(/\bfetch_score\(\s*[rRuU]?(["'])((?:(?!\1)[^\\\n])*)\1/g)) out.add(m[2]);
  return [...out];
}

/** where a downloaded score goes in Pyodide's file system: /files/fetched/<sha-1 of the URL>.<extension> */
export async function localPathFor(url: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(url));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const ext = /\.(mxl|musicxml|xml|krn|abc|mid|midi|mei|txt)$/i.exec(url)?.[1].toLowerCase() ?? "mxl";
  return `/files/fetched/${hex}.${ext}`;
}

/** a score's bytes: from the cache if this browser has it, else downloaded (and cached) */
export async function scoreBytes(url: string): Promise<Uint8Array> {
  const cache = typeof caches !== "undefined" ? await caches.open(SCORE_CACHE).catch(() => null) : null;
  let res = cache ? await cache.match(url) : undefined;
  if (!res) {
    const got = await fetch(url);
    if (!got.ok) throw new Error(`HTTP ${got.status}`);
    if (cache) await cache.put(url, got.clone()).catch(() => undefined);
    res = got;
  }
  return new Uint8Array(await res.arrayBuffer());
}
