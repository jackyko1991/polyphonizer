/**
 * The Mutopia Project's pieces in the Library (mutopia.json, made by scripts/mutopia_catalog.py). Mutopia lets no
 * other page download its files (no CORS), so a piece is not opened here: the Library links to its files on
 * mutopiaproject.org (MIDI, PDF) and its page there; the learner downloads one and opens it in the editor.
 */
import type { L } from "../problems.ts";
import type { Row, Source } from "./collections.ts";

/** [id, title, composer, opus, instrument, style, licence, folder under ftp/, MIDI file, A4 PDF file] (as Mutopia's RDF
 * names them: one file, or a zip of several; empty when there is none) */
export type MutopiaRow = [number, string, string, string, string, string, "pd" | "by" | "by-sa", string, string, string];

const SITE = "https://www.mutopiaproject.org";

export const MUTOPIA_LICENCES: Record<MutopiaRow[6], { name: string; url: string }> = {
  pd: { name: "Public domain", url: "https://creativecommons.org/publicdomain/mark/1.0/" },
  by: { name: "CC BY", url: "https://creativecommons.org/licenses/by/4.0/" },
  "by-sa": { name: "CC BY-SA", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
};

export const MUTOPIA_NAME: L = ["Mutopia Project", "Mutopia 計畫"];

/** a piece's page on Mutopia, and its MIDI and A4 PDF (each one file or a zip; "" when it has none) */
export function mutopiaLinks(r: MutopiaRow): { page: string; midi: string; pdf: string } {
  const file = (f: string) => (f ? `${SITE}/ftp/${r[7]}/${f}` : "");
  return { page: `${SITE}/cgibin/piece-info.cgi?id=${r[0]}`, midi: file(r[8]), pdf: file(r[9]) };
}

export const MUTOPIA = "mutopia";

/** Mutopia as a source in the Library's menus (its works carry their own licences) */
export const MUTOPIA_SOURCE: Source = {
  repo: "MutopiaProject/MutopiaProject",
  name: MUTOPIA_NAME,
  licence: "Public domain / CC BY / CC BY-SA",
  licenceUrl: "https://www.mutopiaproject.org/legal.html",
  credit: "The Mutopia Project, mutopiaproject.org",
  homepage: SITE,
  nonCommercial: false,
  sha: "",
};

/** Mutopia's styles → the Library's eras */
const ERA: Record<string, string> = {
  Medieval: "Medieval", Renaissance: "Renaissance", Baroque: "Baroque", Classical: "Classical", Romantic: "Romantic",
  Modern: "20th century", "Avant-garde": "20th century", Popular: "Popular", "Popular / Dance": "Popular", Jazz: "Popular",
  Ragtime: "Popular", Folk: "Traditional", Traditional: "Traditional", Classique: "Classical", Romantique: "Romantic",
};

/** a Mutopia piece as a Library row: its page as the path, the opus as its set, its instruments as its part names */
export function mutopiaRow(m: MutopiaRow): Row {
  return [MUTOPIA, mutopiaLinks(m).page, null, m[1], m[2], 0, null, "", ERA[m[5]] ?? "Other", m[3], "", [], m[4] ? [m[4]] : [], MUTOPIA, m[6]];
}
