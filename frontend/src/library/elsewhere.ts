/**
 * Libraries a web page can't open scores from directly (no CORS, a copyright notice to accept, scanned PDFs): the
 * Library links to a search there, the learner downloads the file themselves and opens it here (Open file, or drop
 * it on the editor). A PDF or a recording needs the local runner to become notes (docs/plans/open-libraries.md).
 * Also the Library's licence filter.
 */
import type { L } from "../problems.ts";
import type { Row, Source } from "./collections.ts";

export interface Elsewhere {
  id: "imslp" | "cpdl" | "mutopia";
  name: string;
  home: string;
  /** a search for these words (encoded) */
  search: (q: string) => string;
  /** what you mostly find there */
  gives: L;
}

export const ELSEWHERE: Elsewhere[] = [
  {
    id: "imslp",
    name: "IMSLP",
    home: "https://imslp.org/",
    search: (q) => `https://imslp.org/index.php?title=Special:Search&search=${q}`,
    gives: ["scanned editions (PDF); some MusicXML and MIDI", "樂譜掃描（PDF）；部分有 MusicXML 與 MIDI"],
  },
  {
    id: "cpdl",
    name: "CPDL",
    home: "https://www.cpdl.org/",
    search: (q) => `https://www.cpdl.org/wiki/index.php?title=Special:Search&search=${q}`,
    gives: ["choral music: PDF, often MusicXML or MIDI", "合唱曲：PDF，常附 MusicXML 或 MIDI"],
  },
  {
    id: "mutopia",
    name: "Mutopia",
    home: "https://www.mutopiaproject.org/",
    search: (q) => `https://www.mutopiaproject.org/cgibin/make-table.cgi?searchingfor=${q}`,
    gives: ["engraved editions: PDF and MIDI", "重新排版的樂譜：PDF 與 MIDI"],
  },
];

/** names searched in full (the common name is not the surname) */
const FULL_NAMES = new Set(["Josquin des Prez", "Guillaume Du Fay", "Pierre de la Rue", "Orlande de Lassus", "Tomás Luis de Victoria"]);
const NO_COMPOSER = new Set(["Anonymous", "Traditional", "Unknown", "music21 examples"]);

/** what to search for: the words typed, or the composer's surname and the title without its catalogue numbers and
 * movement ("Der Erlkönig, D.328" → "Der Erlkönig") */
export function searchTerms(w: { composer?: string; title?: string; query?: string }): string {
  if (w.query?.trim()) return w.query.trim().replace(/\s+/g, " ");
  const who = !w.composer || NO_COMPOSER.has(w.composer) ? "" : FULL_NAMES.has(w.composer) ? w.composer : w.composer.split(" ").at(-1)!;
  const what = (w.title ?? "").split(/,| · | \(/)[0].trim();
  return [who, what].filter(Boolean).join(" ");
}

/** a link to each library: a search when there are words, else its front page */
export function elsewhereLinks(terms: string): { id: Elsewhere["id"]; name: string; url: string; gives: L }[] {
  const q = encodeURIComponent(terms.trim());
  return ELSEWHERE.map((s) => ({ id: s.id, name: s.name, url: q ? s.search(q) : s.home, gives: s.gives }));
}

export type FileKind = "score" | "pdf" | "audio" | "other";

/** what a file is: a score the editor opens, a PDF or a recording (notes only through the local runner), or neither */
export function fileKind(name: string, type = ""): FileKind {
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1].toLowerCase();
  if (ext) {
    if (["musicxml", "xml", "mxl", "mid", "midi", "abc", "krn", "mei"].includes(ext)) return "score";
    if (ext === "pdf") return "pdf";
    if (["wav", "mp3", "m4a", "ogg", "oga", "flac", "aac", "webm", "aif", "aiff"].includes(ext)) return "audio";
    return "other";
  }
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("audio/")) return "audio";
  return "other";
}

/** main.py for an imported file; where it came from (a web page only) goes in its first lines */
export function importCode(name: string, from?: string): string {
  const page = from && /^https:\/\/[^\s"'\\]+$/.test(from) ? from : "";
  const head = page ? `# Imported: ${name}, from ${page}\n# Check the file's licence on that page before sharing it.\n` : `# Imported: ${name}\n`;
  return `${head}score = load(${JSON.stringify(name)})\n`;
}

export type LicenceClass = "free" | "attribution" | "nc";
export const LICENCE_CLASSES: [LicenceClass, L][] = [
  ["free", ["Free for any use (public domain, CC0)", "任何用途皆可（公有領域、CC0）"]],
  ["attribution", ["Credit the source (CC BY …)", "需標示來源（CC BY …）"]],
  ["nc", ["Non-commercial only", "僅限非商業用途"]],
];

/** how freely a work may be used: music21's corpus and CC0 are free; CC BY and BY-SA need credit; NC is
 * non-commercial (and a source not known is not assumed free) */
export function licenceClass(r: Row, sources: Record<string, Source>): LicenceClass {
  if (!r[13]) return "free";
  const s = sources[r[13]];
  if (!s || s.nonCommercial || /\bNC\b/.test(s.licence)) return "nc";
  return /^CC0|public domain/i.test(s.licence) ? "free" : "attribution";
}
