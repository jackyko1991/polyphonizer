/**
 * Every music example on the site's pages (<Notation abc={`…`} />) must be valid: Verovio reads it and draws notes,
 * every character is ABC we understand (Verovio skips unknown ones silently, so a typo would vanish), and every bar
 * adds up to its time signature (a pickup bar, and a last bar that completes it, may be shorter).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import createVerovioModule from "verovio/wasm";
import { exampleData } from "../src/engine/abc.ts";
import { VerovioToolkit } from "verovio/esm";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") || p.endsWith(".ts") ? [p] : [];
  });
}

/** every <Notation abc={`…`} … /> in the source, with where it is */
export function examples(root = "src"): { where: string; abc: string }[] {
  const out: { where: string; abc: string }[] = [];
  for (const f of files(root)) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/<Notation\b[^>]*?\babc=\{`([^`]*)`\}/g)) {
      assert.ok(!m[1].includes("${"), `${f}: Notation abc must not use \${…}`);
      out.push({ where: `${f}:${text.slice(0, m.index).split("\n").length}`, abc: m[1] });
    }
  }
  return out;
}

const frac = (s: string): number => {
  const [a, b] = s.split("/").map(Number);
  return a / b;
};

/** note length in units of L from an ABC length suffix: "", "2", "/2", "3/2", "/" */
function length(suffix: string): number {
  if (!suffix) return 1;
  const m = /^(\d*)(\/+)?(\d*)$/.exec(suffix);
  if (!m) throw new Error(`bad length ${suffix}`);
  const num = m[1] ? Number(m[1]) : 1;
  if (!m[2]) return num;
  const den = m[3] ? Number(m[3]) : 2 ** m[2].length;
  return num / den;
}

/** check one ABC tune; returns problems (empty = fine) */
export function checkAbc(abc: string): string[] {
  const problems: string[] = [];
  let meter = 1;
  let unit = 1 / 8;
  const voices = new Map<string, number[]>();
  let voice = "1";
  const bars = () => voices.get(voice) ?? (voices.set(voice, [0]), voices.get(voice)!);
  for (const raw of abc.split("\n")) {
    const line = raw.replace(/%.*$/, "").trim();
    if (!line) continue;
    const field = /^([A-Za-z]):\s*(.*)$/.exec(line);
    if (field) {
      const [, k, v] = field;
      if (k === "M") meter = v === "C" ? 1 : v === "C|" ? 1 : frac(v);
      if (k === "L") unit = frac(v);
      if (k === "V") voice = v.split(/\s/)[0];
      if (!/^[XTMLKQVCWwNRSOPBDFGHIZ]$/.test(k)) problems.push(`unknown field ${k}:`);
      continue;
    }
    // inline voice switch [V:2] or fields in brackets
    let body = line.replace(/\[V:\s*(\S+)\]/g, (_, v) => ((voice = v), " "));
    // things that take no time: decorations, annotations, grace notes, ties, slurs, spaces, broken-rhythm marks
    body = body.replace(/![^!]*!|"[^"]*"|\{[^}]*\}/g, " ").replace(/[()\-~.]/g, (c) => (c === "(" ? "(" : " "));
    let tuplet = 0;
    let tupletFactor = 1;
    const re = /\(([2-9])|(\[[^\]]+\]|[_^=]*[A-Ga-g][,']*|z|x)([\d/]*)|(\|\]|\|\||\|:|:\||::|\|)|(\s+)|(.)/g;
    for (const m of body.matchAll(re)) {
      if (m[1]) {
        tuplet = Number(m[1]);
        tupletFactor = tuplet === 3 ? 2 / 3 : tuplet === 2 ? 3 / 2 : (tuplet - 1) / tuplet;
      } else if (m[2]) {
        if (m[2].startsWith("[") && !/^\[([_^=]*[A-Ga-g][,']*\d*\s*)+\]$/.test(m[2])) problems.push(`bad chord ${m[2]}`);
        let len = length(m[3]) * unit;
        if (tuplet > 0) {
          len *= tupletFactor;
          tuplet--;
        }
        const b = bars();
        b[b.length - 1] += len;
      } else if (m[4]) {
        bars().push(0);
      } else if (m[6] && m[6] !== "(") {
        problems.push(`unexpected ${JSON.stringify(m[6])}`);
      }
    }
  }
  for (const [v, b] of voices) {
    const full = b.filter((x, i) => !(x === 0 && i === b.length - 1)); // a final barline leaves an empty bar
    full.forEach((len, i) => {
      if (Math.abs(len - meter) < 1e-9) return;
      const pickup = i === 0 && len < meter;
      const completesPickup = i === full.length - 1 && full.length > 1 && Math.abs(len + full[0] - meter) < 1e-9;
      if (!pickup && !completesPickup) problems.push(`voice ${v}, bar ${i + 1}: ${len} of ${meter} (whole notes)`);
    });
  }
  return problems;
}

test("the ABC checker itself catches a short bar and a stray character", () => {
  assert.deepEqual(checkAbc("X:1\nM:4/4\nL:1/4\nK:C\nC D E F | G4 |]"), []);
  assert.equal(checkAbc("X:1\nM:4/4\nL:1/4\nK:C\nC D E F | G A B | c4 |]").length, 1);
  // a short first bar is a pickup, completed by the last bar
  assert.deepEqual(checkAbc("X:1\nM:4/4\nL:1/4\nK:C\nG | c B A G | c3 |]"), []);
  assert.ok(checkAbc("X:1\nM:4/4\nL:1/4\nK:C\nC D E F | G4 @ |]").some((p) => p.includes("unexpected")));
  assert.deepEqual(checkAbc("X:1\nM:3/4\nL:1/8\nK:G\nD2 | G2 (3ABc d2 | g4 |]"), []);
  assert.deepEqual(checkAbc("X:1\nM:4/4\nL:1/4\nK:C\nV:1\n[CEG]2 [DFA]2 | c4 |]\nV:2 clef=bass\nC,4 | C,4 |]"), []);
});

test("two voices become two staves, with key, carried accidentals, triplets and ties", async () => {
  const t = new VerovioToolkit(await createVerovioModule());
  const abc = "X:1\nM:4/4\nL:1/4\nK:D\nV:1\n\"P5\"a2 ^g2 | (3fga d2 [df]2- | [df]4 |]\nV:2 clef=bass\nD,2 E,2 | F,2 =F,2 | D,4 |]";
  assert.ok(t.loadData(exampleData(abc)));
  t.renderToSVG(1);
  const midi = (t.renderToTimemap() as { on?: string[] }[]).flatMap((e) => (e.on ?? []).map((id) => (t.getMIDIValuesForElement(id) as { pitch: number }).pitch));
  // a=A5 81, ^g=G#5 80, (3 f#5 g5 a5, d5, [d5 f#5] tied twice; bass D3 E3 F#3 (key) =F3 D3
  assert.deepEqual(midi.sort((a, b) => a - b), [50, 50, 52, 53, 54, 74, 74, 74, 78, 78, 78, 79, 80, 81, 81]);
});

test("every music example on the pages is valid and drawn by Verovio", async () => {
  const all = examples();
  const t = new VerovioToolkit(await createVerovioModule());
  t.setOptions({ header: "none", adjustPageHeight: true, breaks: "auto" });
  for (const { where, abc } of all) {
    assert.deepEqual(checkAbc(abc), [], `${where}: ${abc}`);
    assert.ok(t.loadData(exampleData(abc)), `${where}: Verovio could not read it`);
    const svg = t.renderToSVG(1);
    const notes = (svg.match(/class="note"/g) ?? []).length;
    assert.ok(notes > 0, `${where}: no notes drawn`);
    // several voices: each on its own staff
    const voices = new Set([...abc.matchAll(/^V:\s*(\S+)/gm)].map((m) => m[1])).size;
    if (voices > 1) assert.ok(/<staffDef n="2"/.test(exampleData(abc)), `${where}: voices not on separate staves`);
  }
});

test("an example in C sounds F natural even right after one in G (Verovio's ABC key leak is corrected)", async () => {
  const { fixAbcKeys } = await import("../src/engine/abc.ts");
  const t = new VerovioToolkit(await createVerovioModule());
  const pitches = (abc: string) => {
    t.loadData(abc);
    t.loadData(fixAbcKeys(t.getMEI({}), abc));
    t.renderToSVG(1);
    return (t.renderToTimemap() as { on?: string[] }[]).flatMap((e) => (e.on ?? []).map((id) => (t.getMIDIValuesForElement(id) as { pitch: number }).pitch));
  };
  assert.deepEqual(pitches("X:1\nM:4/4\nL:1/4\nK:G\nF G A B |]"), [66, 67, 69, 71]);
  assert.deepEqual(pitches("X:1\nM:4/4\nL:1/4\nK:C\nF G A B | F2- F2 |]"), [65, 67, 69, 71, 65, 65]);
  // an accidental written in a bar lasts to its end; the key comes back in the next bar
  assert.deepEqual(pitches("X:1\nM:4/4\nL:1/4\nK:C\n^F F G A | F4 |]"), [66, 66, 67, 69, 65]);
  assert.deepEqual(pitches("X:1\nM:4/4\nL:1/4\nK:D\nF C =F c | F4 |]"), [66, 61, 65, 73, 66]);
});
