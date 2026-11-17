/**
 * IMSLP's works in the Library: an index (data/imslp.tsv, made by scripts/imslp_catalog.py, built into the Library's
 * database by scripts/library-db.ts). IMSLP's files are not opened here (a copyright notice for the reader's country comes first, and
 * most are scanned PDFs): a work links to its page on IMSLP, where the learner downloads a file and brings it back
 * (Import, or Transcribe for a PDF).
 */
import type { Row, Source } from "./collections.ts";

export const IMSLP = "imslp";

export const IMSLP_SOURCE: Source = {
  repo: "",
  name: ["IMSLP (Petrucci Music Library)", "IMSLP（Petrucci 樂譜圖書館）"],
  licence: "Varies by file",
  licenceUrl: "https://imslp.org/wiki/IMSLP:Copyright_Overview",
  credit: "IMSLP, imslp.org",
  homepage: "https://imslp.org",
  nonCommercial: false,
  sha: "",
};

export interface ImslpIndex {
  date: string;
  count: number;
  /** [page name ("Eine kleine Nachtmusik, K.525 (Mozart, Wolfgang Amadeus)"), composer, title, catalogue number] */
  works: [string, string, string, string][];
}

/** an IMSLP composer's name, tidied: no wiki markup left over ("Daniel @composer^ Johnson"), and a particle kept with
 * its surname when the name was turned round ("Vincent d' Indy" → "Vincent d'Indy") */
export function tidyName(name: string): string {
  return name
    .replace(/@\w+\^\s*/g, "")
    .replace(/\b([dDlL]['’])\s+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** read the index: a header line, composers once (@n name, IMSLP's name), then works (page id, composer n, title,
 * catalogue no., and the page name where it isn't "<title> (<IMSLP's name>)") */
export function parseImslp(tsv: string): ImslpIndex {
  const lines = tsv.split("\n");
  const head = /^#imslp (\S+) (\d+)/.exec(lines[0] ?? "");
  const composers: string[] = [];
  const imslpNames: string[] = [];
  const works: ImslpIndex["works"] = [];
  for (const line of lines.slice(1)) {
    if (line.startsWith("@")) {
      const [n, name, imslpName] = line.slice(1).split("\t");
      composers[Number(n)] = tidyName(name ?? "");
      imslpNames[Number(n)] = imslpName ?? "";
      continue;
    }
    const [id, c, title, cat, page] = line.split("\t");
    if (!/^\d+$/.test(id ?? "") || !title || composers[Number(c)] === undefined) continue;
    works.push([page || `${title} (${imslpNames[Number(c)]})`, composers[Number(c)], title, cat ?? ""]);
  }
  return { date: head?.[1] ?? "", count: Number(head?.[2] ?? works.length), works };
}

const WIKI = "https://imslp.org/wiki/";
/** a work's page on IMSLP, by its page name (IMSLP no longer answers links by page id: index.php?curid=…) */
export const imslpUrl = (page: string) =>
  WIKI + encodeURIComponent(page.replace(/ /g, "_")).replace(/%2C/g, ",").replace(/%3A/g, ":").replace(/%2F/g, "/");
/** the page name back from its link */
export const imslpPage = (url: string) => (url.startsWith(WIKI) ? decodeURIComponent(url.slice(WIKI.length)).replace(/_/g, " ") : url);

/** the works as Library rows; a composer's era is the Library's where it knows the composer */
export function imslpRows(ix: ImslpIndex, eras: Map<string, string>): Row[] {
  return ix.works.map(([page, composer, title, cat]) => [IMSLP, imslpUrl(page), null, title, composer, 0, null, "", eras.get(composer) ?? "Other", cat, "", [], [], IMSLP]);
}

/** the index with each work's search text (title, composer, catalogue number; folded as the Library folds) */
export interface SearchableImslp extends ImslpIndex {
  text: string[];
}
export function searchableImslp(ix: ImslpIndex, fold: (t: string) => string): SearchableImslp {
  return { ...ix, text: ix.works.map(([, composer, title, cat]) => fold(`${title} ${composer} ${cat}`)) };
}

/** the works (their positions) whose text has every word, by the composer when one is given; nothing when neither */
export function searchImslp(ix: SearchableImslp, words: string[], composer = "", limit = Infinity): number[] {
  if (!words.length && !composer) return [];
  const out: number[] = [];
  for (let i = 0; i < ix.works.length && out.length < limit; i++)
    if ((!composer || ix.works[i][1] === composer) && words.every((w) => ix.text[i].includes(w))) out.push(i);
  return out;
}
