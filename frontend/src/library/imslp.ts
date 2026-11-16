/**
 * IMSLP's works in the Library: an index (public/library/imslp.tsv, made by scripts/imslp_catalog.py) fetched only when
 * IMSLP is asked for. IMSLP's files are not opened here (a copyright notice for the reader's country comes first, and
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
  /** [page id, composer, title, catalogue number] */
  works: [string, string, string, string][];
}

/** read the index: a header line, composers once (@n name), then works (page id, composer n, title, catalogue no.) */
export function parseImslp(tsv: string): ImslpIndex {
  const lines = tsv.split("\n");
  const head = /^#imslp (\S+) (\d+)/.exec(lines[0] ?? "");
  const composers: string[] = [];
  const works: ImslpIndex["works"] = [];
  for (const line of lines.slice(1)) {
    if (line.startsWith("@")) {
      const [n, name] = line.slice(1).split("\t");
      composers[Number(n)] = name ?? "";
      continue;
    }
    const [id, c, title, cat] = line.split("\t");
    if (!/^\d+$/.test(id ?? "") || !title || composers[Number(c)] === undefined) continue;
    works.push([id, composers[Number(c)], title, cat ?? ""]);
  }
  return { date: head?.[1] ?? "", count: Number(head?.[2] ?? works.length), works };
}

export const imslpUrl = (pageId: string) => `https://imslp.org/index.php?curid=${pageId}`;

/** the works as Library rows; a composer's era is the Library's where it knows the composer */
export function imslpRows(ix: ImslpIndex, eras: Map<string, string>): Row[] {
  return ix.works.map(([id, composer, title, cat]) => [IMSLP, imslpUrl(id), null, title, composer, 0, null, "", eras.get(composer) ?? "Other", cat, "", [], [], IMSLP]);
}
