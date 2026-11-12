/**
 * Track 0 and the scale problems, graded on what the real engine makes of the code (tests/learn/summaries.json, made
 * by prelude.py): every reference solution passes, every starter fails (or, with its blanks emptied, does not run),
 * and the wrong answers fail the rules they should.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { check, checkRule, scaleRun } from "../src/engine/checker.ts";
import type { ScoreData } from "../src/engine/types.ts";
import { PROBLEMS } from "../src/problems.ts";
import { blankIssues } from "../src/learn/blanks.ts";
import { noteTokens, tinyTokens } from "../src/learn/tokens.ts";
import { codes, lessonExamples } from "./learn/codes.ts";
import createVerovioModule from "verovio/wasm";
import { VerovioToolkit } from "verovio/esm";
import { exampleData } from "../src/engine/abc.ts";
import { ruleLabel } from "../src/learn/ruleText.ts";
import { MARKING_DEMOS, SOLUTIONS, WRONG } from "./learn/solutions.ts";

const summaries: Record<string, ScoreData | { error: string }> = JSON.parse(
  readFileSync(new URL("./learn/summaries.json", import.meta.url), "utf8"),
);
function run(code: string): ScoreData | { error: string } {
  const s = summaries[code];
  assert.ok(s, `no engine output for this code; regenerate tests/learn/summaries.json (see tests/learn/solutions.ts):\n${code}`);
  return s;
}
const failing = (s: ScoreData, id: string) =>
  check(s, PROBLEMS.find((p) => p.id === id)!.rules)
    .results.filter((r) => !r.ok && r.severity === "error")
    .map((r) => r.id);

test("the engine outputs are up to date", () => {
  for (const c of codes()) run(c);
});

for (const p of PROBLEMS.filter((q) => q.id in SOLUTIONS)) {
  test(`${p.id}: the reference solution passes; the starter fails`, () => {
    const sol = run(SOLUTIONS[p.id]);
    assert.ok(!("error" in sol), `${p.id}: ${"error" in sol ? sol.error : ""}`);
    const r = check(sol, p.rules);
    assert.ok(r.passed, `${p.id}: ${JSON.stringify(r.results.filter((x) => !x.ok))}`);
    // the starter: a blank stops it before it runs; emptied, it either doesn't run or fails a rule
    if (p.starter.includes("___")) assert.ok(blankIssues(p.starter).length > 0);
    const emptied = run(p.starter.replaceAll("___", ""));
    if (!("error" in emptied)) assert.ok(failing(emptied, p.id).length > 0, `${p.id}: the starter passes`);
  });
}

test("wrong answers fail the rules that catch them", () => {
  for (const [id, cases] of Object.entries(WRONG)) {
    for (const [code, rules] of cases) {
      const s = run(code);
      assert.ok(!("error" in s), code);
      const f = failing(s, id);
      for (const r of rules) assert.ok(f.includes(r), `${id}: expected ${r} to fail for ${code}; failed: ${f}`);
    }
  }
});

test("arranging: the given parts match their MIDI numbers in the starters; the flute starter fails only its range", () => {
  for (const p of PROBLEMS.filter((q) => q.category === "arranging" && q.id in SOLUTIONS)) {
    const s = run(p.starter) as ScoreData;
    for (const r of p.rules.filter((x) => x.id === "pitches")) assert.ok(checkRule(s, r).ok, `${p.id}: the given part`);
  }
  assert.deepEqual(failing(run(PROBLEMS.find((p) => p.id === "arr-flute-key")!.starter) as ScoreData, "arr-flute-key"), ["range"]);
});

test("tiny() writes chords as <C E G>2: one event, all its notes, ties kept", () => {
  const drone = run(SOLUTIONS["arr-drone"]) as ScoreData;
  const cello = drone.notes.filter((n) => n.part === 1);
  assert.equal(cello.length, 8);
  assert.deepEqual(cello[0].midi, [50, 57]);
  const left = (run(SOLUTIONS["arr-block-chords"]) as ScoreData).notes.filter((n) => n.part === 1);
  // bar : length : notes
  assert.deepEqual(
    left.slice(0, 3).map((n) => `${n.measure}:${n.dur}:${n.midi.length}`),
    ["1:3:3", "2:3:3", "3:3:3"],
  );
});

test("Track 0 comes first, and every 'uses' chip names a lesson", () => {
  const track0 = PROBLEMS.filter((p) => p.category === "syntax");
  assert.ok(track0.length >= 6 && track0.every((l) => l.lesson));
  assert.deepEqual(PROBLEMS.slice(0, track0.length), track0);
  const lessons = PROBLEMS.filter((p) => p.lesson);
  for (const p of PROBLEMS) for (const u of p.uses ?? []) assert.ok(lessons.some((l) => l.id === u), `${p.id} uses ${u}`);
  for (const l of lessons) assert.ok(l.category === "syntax" || l.category === "technique", l.id);
});

test("scaleRun: two octaves of major up and down; melodic minor comes down as the natural minor", () => {
  const major = [2, 2, 1, 2, 2, 2, 1];
  const run2 = scaleRun(major, 2);
  assert.equal(run2.length, 28);
  assert.deepEqual(run2.slice(14, 21), [-1, -2, -2, -2, -1, -2, -2]);
  assert.equal(run2.reduce((a, b) => a + b, 0), 0);
  const mel = scaleRun([2, 1, 2, 2, 2, 2, 1], 1, [2, 1, 2, 2, 1, 2, 2]);
  assert.deepEqual(mel, [2, 1, 2, 2, 2, 2, 1, -2, -2, -1, -2, -2, -1, -2]);
});

test("barsFull: an overfull bar is found at its bar; a pickup bar is allowed only when declared", () => {
  const over = run(PROBLEMS.find((p) => p.id === "syntax-rhythm-bars")!.starter) as ScoreData;
  const r = checkRule(over, { id: "barsFull" });
  // bar 2 has five beats, so bar 3 is left with three
  assert.deepEqual(r.bars, [2, 3]);
  const note = (offset: number, dur: number, measure: number) => ({ part: 0, measure, offset, dur, midi: [60], name: "", tie: null });
  const pickup: ScoreData = {
    ...over,
    notes: [note(0, 1, 0), note(1, 4, 1), note(5, 3, 2)],
    measures: [{ n: 0, offset: 0, length: 4 }, { n: 1, offset: 1, length: 4 }, { n: 2, offset: 5, length: 4 }],
  };
  assert.equal(checkRule(pickup, { id: "barsFull" }).ok, false);
  assert.equal(checkRule(pickup, { id: "barsFull", pickup: true }).ok, true);
});

test("rhythm: rests count (as negative lengths), ties join, the engine's trailing rest is ignored", () => {
  const s = run(SOLUTIONS["syntax-rhythm-bars"]) as ScoreData;
  assert.ok(checkRule(s, { id: "rhythm", part: 0, durs: [1, 1, 1, 1, 3, 2, 1, 1, 1, 2, 2] }).ok);
  assert.ok(!checkRule(s, { id: "rhythm", part: 0, durs: [1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 2, 2] }).ok);
  const scale = run(SOLUTIONS["hello-scale"]) as ScoreData; // 8 quarters: no rest
  assert.ok(checkRule(scale, { id: "rhythm", part: 0, durs: [1, 1, 1, 1, 1, 1, 1, 1, -4] }).ok);
});

test("highest, lowest, timeSig, keySig, tempo, partName, instrument", () => {
  const part = run(SOLUTIONS["syntax-part"]) as ScoreData;
  assert.ok(checkRule(part, { id: "highest", part: 0, midi: 71 }).ok);
  assert.ok(checkRule(part, { id: "lowest", part: 0, midi: 62 }).ok);
  assert.equal(checkRule(part, { id: "highest", part: 0, midi: 72 }).detail, "B4");
  assert.ok(checkRule(part, { id: "timeSig", time: "3/4" }).ok);
  assert.ok(checkRule(part, { id: "keySig", key: "G major" }).ok);
  assert.ok(checkRule(part, { id: "partName", part: 0, name: "Violin" }).ok);
  assert.ok(checkRule(part, { id: "instrument", part: 0, program: 40 }).ok);
  const sc = run(SOLUTIONS["syntax-score"]) as ScoreData;
  assert.ok(checkRule(sc, { id: "tempo", bpm: 72 }).ok);
  assert.ok(!checkRule(sc, { id: "tempo", bpm: 96 }).ok);
});

test("every level has a colour and a label in both languages", async () => {
  const { LEVELS } = await import("../src/problems.ts");
  const { LEVEL_STYLE } = await import("../src/learn/levels.ts");
  const { STRINGS } = await import("../src/strings.ts");
  for (const l of LEVELS) {
    assert.ok(LEVEL_STYLE[l]?.dot && LEVEL_STYLE[l]?.text, l);
    const label = (STRINGS as Record<string, readonly string[]>)[`level.${l}`];
    assert.ok(label?.length === 2 && label.every(Boolean), `level.${l}`);
  }
});

test("each lesson example draws what its code makes: same pitches at the same times", async () => {
    const ex = lessonExamples();
  assert.ok(ex.length >= 10);
  for (const { code, abc } of ex) {
    const s = run(code);
    assert.ok(!("error" in s), `${code}: ${"error" in s ? s.error : ""}`);
    // written notes (a tie's second note is drawn, so it counts)
    const fromCode = s.notes.flatMap((n) => n.midi.map((m) => [n.offset, m] as [number, number]));
    const t = new VerovioToolkit(await createVerovioModule()); // fresh: Verovio 6 keeps an ABC key across loads (K:G then K:C still sharpens F)
    assert.ok(t.loadData(exampleData(abc)), abc);
    t.renderToSVG(1);
    const drawn: [number, number][] = [];
    for (const e of t.renderToTimemap() as { tstamp: number; qstamp?: number; on?: string[] }[])
      for (const id of e.on ?? []) drawn.push([e.qstamp ?? 0, (t.getMIDIValuesForElement(id) as { pitch: number }).pitch]);
    const key = (xs: [number, number][]) => xs.map(([q, m]) => `${+q.toFixed(3)}:${m}`).sort();
    assert.deepEqual(key(drawn), key(fromCode), `the drawing doesn't match the code:\n${code}`);
  }
});

test("every rule of every problem and lesson has wording in both languages", () => {
  for (const p of PROBLEMS)
    for (const r of p.rules)
      for (const lang of [0, 1] as const) {
        const text = ruleLabel(r, ["Violin"], lang);
        assert.ok(typeof text === "string" && text.trim().length > 3, `${p.id} ${r.id} [${lang}]`);
      }
});

test("code ↔ score: each token of a single tiny() string finds its note, with ties, dots and triplets", () => {
  let checked = 0;
  for (const code of Object.values(SOLUTIONS).concat(lessonExamples().map((e) => e.code))) {
    const s = run(code);
    if ("error" in s || s.parts.length !== 1) continue;
    const tokens = tinyTokens(code);
    if (!tokens) continue;
    const map = noteTokens(tokens, s.notes);
    // every token is found, in order (only the engine's padding rests at the end have no token)
    const found = map.filter((i) => i >= 0);
    assert.deepEqual(found, tokens.map((_, i) => i), code);
    checked++;
  }
  assert.ok(checked >= 15, `${checked}`);
  const code = `score = tiny("c4 trip{d8 e f} g2~ g4. r8")`;
  assert.deepEqual(
    tinyTokens(code)!.map((tk) => [code.slice(tk.from, tk.to), +tk.offset.toFixed(3), +tk.dur.toFixed(3)]),
    [["c4", 0, 1], ["trip{d8", 1, 0.333], ["e", 1.333, 0.333], ["f}", 1.667, 0.333], ["g2~", 2, 2], ["g4.", 4, 1.5], ["r8", 5.5, 0.5]],
  );
  assert.equal(tinyTokens(`a = tiny("c4")\nb = tiny("d4")`), null);
});

test("blanks: found with their line; names with underscores are not blanks", () => {
  assert.deepEqual(blankIssues(`x = 1\nscore = tiny("c4 ___ e")`).map((b) => [b.line, b.column]), [[2, 18]]);
  assert.deepEqual(blankIssues(`score = tiny("g___ f___")`).length, 2);
  assert.deepEqual(blankIssues(`my___name = 1\nx.__init__`), []);
  // comments are not code; a sharp inside a string is not a comment
  assert.deepEqual(blankIssues(`# fill the ___ below\nscore = tiny("f# ___")  # ___`).map((b) => [b.line, b.column]), [[2, 18]]);
});

/** every TARGETS entry in lessons.tsx: problem id → its ABC */
function targets(): Map<string, string> {
  const text = ["lessons.tsx", "techniqueLessons.tsx"]
    .map((f) => readFileSync(new URL(`../src/learn/${f}`, import.meta.url), "utf8"))
    .map((t) => t.slice(t.indexOf("TARGETS")))
    .join("\n");
  const from = 0;
  return new Map([...text.slice(from).matchAll(/"([\w-]+)": \(\) => \(\s*<Notation\b[^>]*?\babc=\{`([^`]*)`\}/g)].map((m) => [m[1], m[2]]));
}
/** parts of the answer a target leaves out because they are given */
const TARGET_PART: Record<string, number> = { "syntax-transpose": 0 };

test("every fill-in lesson shows its target, which is exactly what the reference solution makes", async () => {
  const all = targets();
  for (const p of PROBLEMS.filter((q) => q.starter.includes("___"))) assert.ok(all.has(p.id), `${p.id} has no target notation`);
    for (const [id, abc] of all) {
    const s = run(SOLUTIONS[id]) as ScoreData;
    const part = TARGET_PART[id];
    const fromCode = s.notes
      .filter((n) => n.midi.length && (part === undefined || n.part === part))
      .flatMap((n) => n.midi.map((m) => `${+n.offset.toFixed(3)}:${m}:${+n.dur.toFixed(3)}`))
      .sort();
    const t = new VerovioToolkit(await createVerovioModule()); // fresh: Verovio 6 keeps an ABC key across loads (K:G then K:C still sharpens F)
    assert.ok(t.loadData(exampleData(abc)), id);
    t.renderToSVG(1);
    const on = new Map<string, number>();
    const drawn: string[] = [];
    for (const e of t.renderToTimemap() as { qstamp: number; on?: string[]; off?: string[] }[]) {
      for (const x of e.on ?? []) on.set(x, e.qstamp);
      for (const x of e.off ?? []) {
        const q = on.get(x)!;
        drawn.push(`${+q.toFixed(3)}:${(t.getMIDIValuesForElement(x) as { pitch: number }).pitch}:${+(e.qstamp - q).toFixed(3)}`);
      }
    }
    assert.deepEqual(drawn.sort(), fromCode, `${id}: the target doesn't match the reference solution`);
  }
});

/** what each markings.py helper must draw: an SVG class Verovio gives it */
const DRAWN: Record<string, string> = {
  bowings: "artic", staccato: "artic", spiccato: "artic", tenuto: "artic", accent: "artic", harmonic: "artic",
  slur: "slur", fingering: "fing", pedal: "pedal", breath: "breath", trill: "trill", lyrics: "syl", arpeggio: "arpeg",
  text: "dir", pizz: "dir", arco: "dir", una_corda: "dir",
};

test("every marking survives MusicXML export and is engraved by Verovio", async () => {
  const used = new Set<string>();
  const all = [...Object.values(SOLUTIONS), ...MARKING_DEMOS].filter((c) => Object.keys(DRAWN).some((h) => c.includes(`${h}(`)));
  for (const code of all) {
    const s = run(code);
    assert.ok(!("error" in s), `${code}: ${"error" in s ? s.error : ""}`);
    assert.ok(s.musicxml.length > 0, "the fixture keeps MusicXML for marking code");
    const t = new VerovioToolkit(await createVerovioModule());
    assert.ok(t.loadData(s.musicxml));
    const svg = t.renderToSVG(1);
    for (const [helper, cls] of Object.entries(DRAWN)) {
      if (!new RegExp(`\\b${helper}\\(`).test(code)) continue;
      used.add(helper);
      assert.match(svg, new RegExp(`class="${cls}[ "]`), `${helper}() draws no ${cls}:\n${code}`);
    }
    if (code.includes("pedal(")) assert.match(svg, /class="pedal[ "]/);
  }
  assert.deepEqual([...used].sort(), Object.keys(DRAWN).sort(), "a helper is never tested");
});

test("markings: notes numbered from 1 without rests; marks and pedals reach the summary", () => {
  const demo = run(MARKING_DEMOS[1]) as ScoreData;
  assert.deepEqual(demo.notes[0].marks, ["arpeggio"]);
  // "1:3-2 3-4:3": down at bar 1 beat 3, changed at bar 3, up at bar 4 beat 3
  assert.deepEqual(demo.pedals, [{ from: 2, part: 0, to: 8 }, { from: 8, part: 0, to: 14 }]);
  const v = run(MARKING_DEMOS[2]) as ScoreData;
  assert.deepEqual(v.notes.map((n) => n.marks), [["lyric:Ah"], [], ["breath", "lyric:vous"], ["lyric:di"], ["lyric:rai"], ["lyric:je"]]);
  const bow = run(SOLUTIONS["bow-ode"]) as ScoreData;
  assert.deepEqual(bow.notes.filter((n) => n.midi.length)[12].marks, ["down", "slur:start"]);
});
