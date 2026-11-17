/**
 * Export, the same from the score panel's Export button and from My scores: the score as MusicXML, MIDI or printed
 * pages (or a PDF), the code, the whole project as a .zip (code, the score's files, the files kept with it, its
 * licence), and the files a library wants. The licence (licences.ts) goes into each.
 */
import { MAIN, type Project } from "./project.ts";
import { licenceFile, rightsLine, withRights, type Rights } from "./licences.ts";
import type { ScoreData } from "./engine/types.ts";

export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** a file name from a title: "Quartet No.1, K.80" → "Quartet_No_1_K_80" */
export const fileStem = (title: string) => (title || "score").replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "score";

/** the score's MusicXML with the licence line in its <rights> */
export const musicxmlOf = (score: ScoreData, rights: Rights | null) => (rights ? withRights(score.musicxml, rightsLine(rights)) : score.musicxml);

/** print the engraved pages (or save them as a PDF from the print dialog): page numbers, and the licence under the first */
export function printPages(pages: string[], title: string, opts: { numbers?: boolean; size?: [number, number]; footer?: string } = {}) {
  const { numbers = true, size = [210, 297], footer = "" } = opts;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.title = title || "Polyphonizer";
  const style = w.document.createElement("style");
  style.textContent =
    `@page{size:${size[0]}mm ${size[1]}mm;margin:0}body{margin:0}div{position:relative;width:${size[0]}mm;height:${size[1]}mm;page-break-after:always;display:flex}svg{width:100%;height:100%}` +
    `span{position:absolute;bottom:2.5%;width:100%;text-align:center;font:10pt sans-serif;color:#555}small{position:absolute;bottom:1%;width:100%;text-align:center;font:7pt sans-serif;color:#777}`;
  w.document.head.appendChild(style);
  pages.forEach((svg, i) => {
    const div = w.document.createElement("div");
    div.innerHTML = svg; // Verovio's own SVG output
    if (numbers && pages.length > 1) {
      const n = w.document.createElement("span");
      n.textContent = String(i + 1);
      div.appendChild(n);
    }
    if (footer && i === 0) {
      const f = w.document.createElement("small");
      f.textContent = footer;
      div.appendChild(f);
    }
    w.document.body.appendChild(div);
  });
  setTimeout(() => w.print(), 300);
}

export type ZipEntry = { name: string; code: string } | { name: string; data: Uint8Array };

/**
 * The whole project's files for its .zip: the code at the top (main.py and its modules), the score's MusicXML and MIDI
 * when it has been compiled (score/), the files kept with it in their folders (files/), and LICENSE.txt when it has a
 * licence. `bytes` reads a kept file (null: no longer in this browser, left out and listed in MISSING.txt).
 */
export async function projectEntries(
  p: Project,
  o: { title: string; score?: ScoreData | null; midi?: Uint8Array | null; rights: Rights | null; bytes: (id: string) => Promise<Uint8Array | null> },
): Promise<ZipEntry[]> {
  const stem = fileStem(o.title);
  const out: ZipEntry[] = [...p.files].sort((a, b) => (a.name === MAIN ? -1 : b.name === MAIN ? 1 : 0)).map((f) => ({ name: f.name, code: f.code }));
  if (o.score) out.push({ name: `score/${stem}.musicxml`, code: musicxmlOf(o.score, o.rights) });
  if (o.midi) out.push({ name: `score/${stem}.mid`, data: o.midi });
  const missing: string[] = [];
  for (const m of p.materials ?? []) {
    const b = await o.bytes(m.id);
    if (b) out.push({ name: `files/${m.path}`, data: b });
    else missing.push(m.path);
  }
  if (missing.length) out.push({ name: "files/MISSING.txt", code: `Not in this browser any more:\n${missing.map((x) => `- ${x}`).join("\n")}\n` });
  if (o.rights) out.push({ name: "LICENSE.txt", code: licenceFile(o.rights, o.title) });
  return out;
}
