/**
 * The licence a score is shared under, written into what it exports: the MusicXML's <rights>, the printed pages'
 * first footer, a LilyPond file's copyright (and Mutopia's licence field), and LICENSE.txt in the project's zip.
 * A learner sets a default for their projects (kept in this browser), and any project can set its own.
 * (Licensing the arrangement or edition is the learner's call; a public-domain work stays free whatever they choose.)
 */

export interface Licence {
  id: string;
  name: readonly [string, string];
  /** what it lets others do, in a line */
  about: readonly [string, string];
  url: string;
  /** Mutopia's licence field, where Mutopia takes it */
  mutopia?: string;
}

export const LICENCES: Licence[] = [
  {
    id: "CC0-1.0",
    name: ["CC0 (public domain)", "CC0（公有領域）"],
    about: ["Anyone may use it for anything, without credit.", "任何人可作任何用途，不必署名。"],
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
    mutopia: "Public Domain",
  },
  {
    id: "CC-BY-4.0",
    name: ["CC BY 4.0 (attribution)", "CC BY 4.0（姓名標示）"],
    about: ["Anyone may use it, with credit to you.", "任何人可使用，但須標示你的姓名。"],
    url: "https://creativecommons.org/licenses/by/4.0/",
    mutopia: "Creative Commons Attribution 4.0",
  },
  {
    id: "CC-BY-SA-4.0",
    name: ["CC BY-SA 4.0 (attribution, share alike)", "CC BY-SA 4.0（姓名標示、相同方式分享）"],
    about: ["Anyone may use it with credit; changed versions under the same licence.", "任何人可使用並須署名；改作須以相同授權分享。"],
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    mutopia: "Creative Commons Attribution-ShareAlike 4.0",
  },
  {
    id: "CC-BY-NC-4.0",
    name: ["CC BY-NC 4.0 (attribution, non-commercial)", "CC BY-NC 4.0（姓名標示、非商業性）"],
    about: ["Anyone may use it with credit, but not to make money.", "任何人可使用並須署名，但不得用於商業。"],
    url: "https://creativecommons.org/licenses/by-nc/4.0/",
  },
  {
    id: "all-rights-reserved",
    name: ["All rights reserved", "保留所有權利"],
    about: ["Others need your permission.", "他人需經你許可才能使用。"],
    url: "",
  },
];
export const licenceOf = (id: string | undefined) => LICENCES.find((l) => l.id === id);

/** who holds the rights, and the licence: a project's, else the learner's default */
export interface Rights {
  licence: string;
  holder: string;
}

const KEY = "polyphonizer.licence";
export function loadDefaultRights(): Rights | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? "null") as Rights | null;
    return r && licenceOf(r.licence) ? r : null;
  } catch {
    return null;
  }
}
export function saveDefaultRights(r: Rights | null) {
  try {
    if (r) localStorage.setItem(KEY, JSON.stringify(r));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
/** the rights a project's exports carry: its own, else the default; none when neither is set */
export const rightsFor = (project: { licence?: string; holder?: string }, fallback: Rights | null = loadDefaultRights()): Rights | null =>
  project.licence && licenceOf(project.licence) ? { licence: project.licence, holder: project.holder ?? fallback?.holder ?? "" } : fallback;

/** the one line printed and written into files: "© 2026 Ana Lee. CC BY 4.0: https://…" */
export function rightsLine(r: Rights, year = new Date().getFullYear()): string {
  const l = licenceOf(r.licence);
  if (!l) return "";
  if (l.id === "CC0-1.0") return `${r.holder ? `${r.holder}: ` : ""}dedicated to the public domain under CC0 1.0: ${l.url}`;
  const who = `© ${year}${r.holder ? ` ${r.holder}` : ""}.`;
  return l.url ? `${who} Licensed under ${l.name[0].replace(/ \(.*\)$/, "")}: ${l.url}` : `${who} All rights reserved.`;
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** the MusicXML with its <rights> set to this line (replacing any there) */
export function withRights(musicxml: string, line: string): string {
  if (!line) return musicxml;
  const rights = `<rights>${esc(line)}</rights>`;
  const out = musicxml.replace(/<rights>[\s\S]*?<\/rights>/, rights);
  if (out !== musicxml) return out;
  if (/<identification>/.test(musicxml)) return musicxml.replace(/<identification>/, `<identification>\n    ${rights}`);
  // no identification yet: it goes after work / movement titles, before the defaults and the part list
  return musicxml.replace(/(<(?:defaults|credit|part-list)\b)/, `<identification>\n    ${rights}\n  </identification>\n  $1`);
}

/** LICENSE.txt for the project's zip */
export function licenceFile(r: Rights, title: string): string {
  const l = licenceOf(r.licence)!;
  return [`${title || "This score"}`, "", rightsLine(r), "", l.about[0], l.url ? `Full text: ${l.url}` : "", ""].join("\n");
}
