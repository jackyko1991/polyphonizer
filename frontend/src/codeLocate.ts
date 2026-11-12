/**
 * From a note in the score to its code. A clicked note is known by its part's name, its bar and its place among the
 * part's notes and rests (the n-th event). In a tiny("…") part (or tiny(melody, …) with melody = "…") the n-th
 * token is that note; otherwise the best line: the bar's edit_bar(…) line, or the line that makes the score
 * (corpus.parse / load / converter.parse).
 */
import type { ProjectFile } from "./project.ts";

export interface CodeSpot {
  file: string;
  from: number;
  to: number;
  /** "token": exactly that note; "line": the line the note comes from */
  kind: "token" | "line";
}

interface TinyCall {
  file: string;
  /** where the notes text starts, and the text */
  at: number;
  text: string;
  name: string | null;
}

/** every tiny(...) call with literal notes or a variable holding them, in file order */
export function tinyCalls(files: ProjectFile[]): TinyCall[] {
  const out: TinyCall[] = [];
  for (const f of files) {
    const code = f.code;
    for (const m of code.matchAll(/\btiny\(\s*(?:(["'])((?:(?!\1)[^\\\n])*)\1|([A-Za-z_]\w*))([^)]*)\)/g)) {
      const args = m[4] ?? "";
      const name = /\bname\s*=\s*["']([^"']+)["']/.exec(args)?.[1] ?? null;
      if (m[2] !== undefined) {
        out.push({ file: f.name, at: m.index! + m[0].indexOf(m[1]) + 1, text: m[2], name });
      } else if (m[3]) {
        // the variable's last string assignment before the call
        const assign = [...code.slice(0, m.index).matchAll(new RegExp(String.raw`\b${m[3]}\s*=\s*(["'])((?:(?!\1)[^\\\n])*)\1`, "g"))].pop();
        if (assign) out.push({ file: f.name, at: assign.index! + assign[0].indexOf(assign[1]) + 1, text: assign[2], name });
      }
    }
  }
  return out;
}

/** the note and rest tokens of a tinyNotation text, with their positions (trip{ and } are not tokens) */
export function tokens(text: string): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (const m of text.matchAll(/\S+/g)) {
    let from = m.index!;
    let tok = m[0];
    const lead = /^(?:trip|quad)\{/.exec(tok);
    if (lead) {
      from += lead[0].length;
      tok = tok.slice(lead[0].length);
    }
    tok = tok.replace(/\}+$/, "");
    if (!tok || /^\d+\/\d+$/.test(tok)) continue; // a time signature written inside the text
    out.push({ from, to: from + tok.length });
  }
  return out;
}

/** where a note's code is: `index` = its place among the part's notes and rests (from 0) */
export function locateNote(files: ProjectFile[], part: string, partIndex: number, bar: number, index: number): CodeSpot | null {
  const calls = tinyCalls(files);
  const byName = calls.filter((c) => c.name === part);
  const call = byName.length === 1 ? byName[0] : byName.length === 0 && calls.length > partIndex ? calls[partIndex] : null;
  if (call) {
    const tok = tokens(call.text)[index];
    if (tok) return { file: call.file, from: call.at + tok.from, to: call.at + tok.to, kind: "token" };
  }
  // no tiny() for this part: the bar's edit_bar line, else the line that makes the score
  for (const f of files) {
    const re = new RegExp(String.raw`^edit_bar\(\s*score\s*,\s*["']${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']\s*,\s*${bar}\s*,.*$`, "m");
    const m = re.exec(f.code);
    if (m) return { file: f.name, from: m.index, to: m.index + m[0].length, kind: "line" };
  }
  for (const f of files) {
    const m = /^.*\b(?:corpus\.parse|converter\.parse|load)\(.*$/m.exec(f.code);
    if (m) return { file: f.name, from: m.index, to: m.index + m[0].length, kind: "line" };
  }
  return null;
}
