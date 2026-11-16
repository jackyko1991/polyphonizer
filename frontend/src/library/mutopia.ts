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

const KEYBOARDS = new Set(["piano", "harpsichord", "organ"]);
/** one word (or two) of Mutopia's instrument text → the Library's instruments for it, one a part */
const WORDS: [RegExp, string[]][] = [
  [/^(string quartet|quartet)$/, ["violin", "violin", "viola", "cello"]],
  [/^(string ensemble|strings|string orchestra)$/, ["violin", "viola", "cello"]],
  [/^brass( ensemble)?$/, ["horn", "trumpet", "trombone"]],
  [/^(violine?s?|violino)$/, ["violin"]],
  [/^violas?$/, ["viola"]],
  [/^'?(violon)?cellos?$/, ["cello"]],
  [/^(double ?bass|contrabass|bass)$/, ["double bass"]],
  [/^(classical )?(guitare?s?)$/, ["guitar"]],
  [/^(flutes?|flauto)$/, ["flute"]],
  [/^oboes?$/, ["oboe"]],
  [/^clarinets?$/, ["clarinet"]],
  [/^bassoons?$/, ["bassoon"]],
  [/^(french )?horns?$/, ["horn"]],
  [/^trumpets?$/, ["trumpet"]],
  [/^trombones?$/, ["trombone"]],
  [/^harps?$/, ["harp"]],
  [/^(piano(forte)?|pianos)$/, ["piano"]],
  [/^(harpsichord|clavichord|clavier|cembalo|virginals?|spinet)$/, ["harpsichord"]],
  [/^(organ|orgue|orgel|harmonium)$/, ["organ"]],
];
const VOICE_PART: Record<string, string> = { s: "soprano", a: "alto", t: "tenor", b: "bass" };

/** Mutopia's instrument text ("Voice and Piano", "Voice (SATB)", "2 Guitars") → the Library's instruments, one entry a
 * part (a keyboard is two staves, as music21 reads it); anything not known is "other" */
export function mutopiaInstruments(text: string): string[] {
  const out: string[] = [];
  const keys: string[] = [];
  const t = text.toLowerCase().replace(/^string quartet:.*$/, "string quartet").replace(/^(voice|choir)?,?\s*\(([satb]+)\)/, "$2");
  for (let part of t.split(/,|\band\b|&|\+|:/).map((x) => x.trim()).filter(Boolean)) {
    // a voicing: SATB, TTBB …; a voice named in brackets
    if (/^[satb]{2,}$/.test(part) || (out.length === 0 && keys.length === 0 && /^[satb]$/.test(part) && /\([satb]\)/i.test(text))) {
      out.push(...[...part].map((c) => VOICE_PART[c]));
      continue;
    }
    const voice = /^voice\s*\((soprano|alto|tenor|bass|basso)\)/.exec(part);
    if (voice) {
      out.push(voice[1] === "basso" ? "bass" : voice[1]);
      continue;
    }
    if (/^(voice|voices|song|choir)$/.test(part)) {
      out.push("voice");
      continue;
    }
    if (part === "basso continuo" || part === "continuo") {
      out.push("other");
      continue;
    }
    let n = 1;
    const count = /^(\d+)\s+(.*)$/.exec(part);
    if (count) [n, part] = [Number(count[1]), count[2]];
    const duet = /^(.*) duet$/.exec(part);
    if (duet) [n, part] = [2, duet[1]];
    if (/^violins$/.test(part) && n === 1) n = 2;
    const hit = WORDS.find(([re]) => re.test(part))?.[1] ?? ["other"];
    if (hit.length === 1 && KEYBOARDS.has(hit[0])) keys.push(hit[0]);
    else for (let i = 0; i < n; i++) out.push(...hit);
  }
  // keyboards: alternatives ("Harpsichord, Piano") are one keyboard with either name, two staves
  const kb = [...new Set(keys)];
  return [...out, ...(kb.length === 1 ? [kb[0], kb[0]] : kb.slice(0, 2))];
}

/** a Mutopia piece as a Library row: its page as the path, the opus as its set, its instruments as the Library's */
export function mutopiaRow(m: MutopiaRow): Row {
  const inst = mutopiaInstruments(m[4]);
  return [MUTOPIA, mutopiaLinks(m).page, null, m[1], m[2], inst.length, null, "", ERA[m[5]] ?? "Other", m[3], "", inst, m[4] ? [m[4]] : [], MUTOPIA, m[6]];
}
