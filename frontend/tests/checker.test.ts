import { test } from "node:test";
import assert from "node:assert/strict";
import { check, checkRule, sounds, type AnyRule } from "../src/engine/checker.ts";
import type { NoteEvent, ScoreData } from "../src/engine/types.ts";
import { PROBLEMS } from "../src/problems.ts";

/** a score from parts given as [midi, quarter length][] (0 = rest) */
function score(...parts: [number, number][][]): ScoreData {
  const notes: NoteEvent[] = [];
  parts.forEach((p, part) => {
    let t = 0;
    for (const [m, d] of p) {
      notes.push({ part, measure: Math.floor(t / 4) + 1, offset: t, dur: d, midi: m ? [m] : [], name: "", tie: null });
      t += d;
    }
  });
  return { musicxml: "", parts: parts.map((_, i) => `P${i}`), programs: parts.map(() => null), notes, measures: [], bpm: 96, time: "4/4", key: "", title: "" };
}
const whole = (ms: number[]) => ms.map((m) => [m, 4] as [number, number]);
const quarters = (ms: number[], durs?: number[]) => ms.map((m, i) => [m, durs?.[i] ?? 1] as [number, number]);
const rules = (id: string) => PROBLEMS.find((p) => p.id === id)!.rules;
const failed = (s: ScoreData, id: string) =>
  check(s, rules(id)).results.filter((r) => !r.ok && r.severity === "error").map((r) => r.id);

const D_DORIAN = [62, 65, 64, 62, 67, 65, 69, 67, 65, 64, 62];

test("hello-scale: the C major scale passes, a wrong step fails", () => {
  assert.deepEqual(failed(score(quarters([60, 62, 64, 65, 67, 69, 71, 72])), "hello-scale"), []);
  assert.deepEqual(failed(score(quarters([60, 62, 63, 65, 67, 69, 71, 72])), "hello-scale"), ["steps"]);
  assert.deepEqual(failed(score(quarters([60, 62])), "hello-scale"), ["count", "steps", "ends"]);
});

test("ode-for-flute: the melody a fifth up passes; the starter fails", () => {
  const ode = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62];
  const durs = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2];
  const violin = quarters(ode, durs);
  assert.deepEqual(failed(score(quarters(ode.map((m) => m + 7), durs), violin), "ode-for-flute"), []);
  assert.deepEqual(failed(score(quarters([71, 71]), violin), "ode-for-flute"), ["transposed", "sameRhythm"]);
  // a fourth down instead (same key, wrong octave) is not the task
  assert.ok(failed(score(quarters(ode.map((m) => m - 5), durs), violin), "ode-for-flute").includes("transposed"));
});

test("species-1-above: Fux's own solution passes", () => {
  const fux = [69, 69, 67, 69, 71, 72, 72, 71, 74, 73, 74];
  const r = check(score(whole(fux), whole(D_DORIAN)), rules("species-1-above"));
  assert.ok(r.passed, JSON.stringify(r.results.filter((x) => !x.ok)));
  // advice only: Fux repeats notes twice
  assert.deepEqual(r.results.filter((x) => !x.ok).map((x) => x.id), ["fewRepeats"]);
});

test("species-1-above: parallel fifths, dissonance and a crossing are caught at their bars", () => {
  const bad = [69, 72, 71, 69, 74, 72, 76, 74, 72, 71, 74]; // fifths over d f e d g f a g f e
  const r = check(score(whole(bad), whole(D_DORIAN)), rules("species-1-above"));
  const par = r.results.find((x) => x.id === "noParallels")!;
  assert.equal(par.ok, false);
  assert.deepEqual(par.bars.slice(0, 2), [2, 3]);
  const diss = check(score(whole([69, 66, ...bad.slice(2)]), whole(D_DORIAN)), rules("species-1-above"));
  assert.ok(diss.results.find((x) => x.id === "consonant")!.bars.includes(2));
  const crossed = check(score(whole([60, ...bad.slice(1)]), whole(D_DORIAN)), rules("species-1-above"));
  assert.ok(!crossed.results.find((x) => x.id === "noCrossing")!.ok);
});

test("species-1-below: a correct line passes; a fifth below at the start fails", () => {
  const cantus = [72, 74, 77, 76, 79, 77, 76, 74, 72];
  const cp = [72, 71, 69, 72, 71, 74, 72, 71, 72];
  assert.deepEqual(failed(score(whole(cantus), whole(cp)), "species-1-below"), []);
  assert.ok(failed(score(whole(cantus), whole([65, ...cp.slice(1)])), "species-1-below").includes("startPerfect"));
});

test("twinkle-duet: thirds below pass; the starter fails", () => {
  const tw = [72, 72, 79, 79, 81, 81, 79, 77, 77, 76, 76, 74, 74, 72];
  const durs = [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2];
  const second = [69, 69, 76, 76, 77, 77, 76, 74, 74, 72, 72, 71, 71, 72];
  assert.deepEqual(failed(score(quarters(tw, durs), quarters(second, durs)), "twinkle-duet"), []);
  assert.ok(failed(score(quarters(tw, durs), quarters([69])), "twinkle-duet").includes("noteAgainstNote"));
});

/** a score from parts given as [midi or chord, quarter length][] in bars of `bar` quarter notes (0 or [] = rest) */
function chords(bar: number, ...parts: [number | number[], number][][]): ScoreData {
  const s = score();
  s.parts = parts.map((_, i) => `P${i}`);
  s.notes = parts.flatMap((p, part) => {
    let t = 0;
    return p.map(([m, d]) => {
      const n: NoteEvent = {
        part,
        measure: Math.floor(t / bar) + 1,
        offset: t,
        dur: d,
        midi: [m].flat().filter(Boolean),
        name: "",
        tie: null,
      };
      t += d;
      return n;
    });
  });
  return s;
}
const [C, F, G, AM] = [
  [0, 4, 7],
  [5, 9, 0],
  [7, 11, 2],
  [9, 0, 4],
];
const ruleOk = (s: ScoreData, rule: AnyRule) => checkRule(s, rule);

test("range checks every note of a chord, not just the top", () => {
  const s = chords(4, [[[43, 47, 50], 4]]);
  assert.ok(ruleOk(s, { id: "range", part: 0, low: 36, high: 64 }).ok);
  assert.deepEqual(ruleOk(s, { id: "range", part: 0, low: 45, high: 64 }).bars, [1]);
});

test("sameShape: any transposition passes; a changed interval fails at its bar", () => {
  const from = [60, 62, 64, 65, 67];
  assert.ok(ruleOk(score(whole(from.map((m) => m + 5))), { id: "sameShape", part: 0, from }).ok);
  const r = ruleOk(score(whole([65, 67, 68, 70, 72])), { id: "sameShape", part: 0, from });
  assert.deepEqual(r.bars, [3, 4]);
  assert.equal(ruleOk(score(whole([65, 67])), { id: "sameShape", part: 0, from }).detail, "2");
});

test("chordTones: chord notes only; `all` wants every one; `root` wants it lowest; nothing after the last chord", () => {
  const prog = [C, F, G, C];
  const roots = chords(4, [
    [48, 4],
    [53, 4],
    [43, 4],
    [48, 4],
  ]);
  assert.ok(ruleOk(roots, { id: "chordTones", part: 0, chords: prog, root: true }).ok);
  // E is in the C chord, but not its root
  const third = chords(4, [
    [52, 4],
    [53, 4],
    [43, 4],
    [48, 4],
  ]);
  assert.ok(ruleOk(third, { id: "chordTones", part: 0, chords: prog }).ok);
  assert.deepEqual(ruleOk(third, { id: "chordTones", part: 0, chords: prog, root: true }).bars, [1]);
  // a D in the F bar; a bar missing; a bar too many
  assert.deepEqual(
    ruleOk(
      chords(4, [
        [48, 4],
        [50, 4],
        [43, 4],
        [48, 4],
      ]),
      { id: "chordTones", part: 0, chords: prog },
    ).bars,
    [2],
  );
  assert.deepEqual(
    ruleOk(
      chords(4, [
        [48, 4],
        [53, 4],
        [43, 4],
      ]),
      { id: "chordTones", part: 0, chords: prog },
    ).bars,
    [4],
  );
  assert.deepEqual(
    ruleOk(chords(4, [...roots.notes.map((): [number, number] => [48, 4]), [48, 4]]), { id: "chordTones", part: 0, chords: [C, C, C, C] })
      .bars,
    [5],
  );
  // `all`: an Alberti C G E G has the whole chord; C G C G has no E
  const eighths = (ms: number[]) => ms.map((m) => [m, 0.5] as [number, number]);
  assert.ok(ruleOk(chords(2, eighths([48, 55, 52, 55])), { id: "chordTones", part: 0, chords: [C], all: true }).ok);
  assert.deepEqual(ruleOk(chords(2, eighths([48, 55, 60, 55])), { id: "chordTones", part: 0, chords: [C], all: true }).bars, [1]);
});

test("fullChords: every onset sounds the whole chord and nothing else, across parts", () => {
  const prog = [C, AM, F, G];
  const block = chords(4, [
    [[48, 52, 55], 4],
    [[45, 48, 52], 4],
    [[48, 53, 57], 4],
    [[47, 50, 55], 4],
  ]);
  assert.ok(ruleOk(block, { id: "fullChords", parts: [0], chords: prog }).ok);
  // no third in bar 2; an extra D in bar 4
  const thin = chords(4, [
    [[48, 52, 55], 4],
    [[45, 52], 4],
    [[48, 53, 57], 4],
    [[47, 50, 55, 62, 65], 4],
  ]);
  const r = ruleOk(thin, { id: "fullChords", parts: [0], chords: prog });
  assert.deepEqual(r.bars, [2, 4]);
  assert.equal(r.detail, "A E");
  // split over two parts, a held note counts where the other part moves
  const two = chords(
    4,
    [
      [[64, 67], 2],
      [[64, 67], 2],
    ],
    [[48, 4]],
  );
  assert.ok(ruleOk(two, { id: "fullChords", parts: [0, 1], chords: [C] }).ok);
  assert.ok(!ruleOk(two, { id: "fullChords", parts: [0], chords: [C] }).ok);
  // a bar with no chord
  assert.deepEqual(
    ruleOk(
      chords(4, [
        [[48, 52, 55], 4],
        [0, 4],
      ]),
      { id: "fullChords", parts: [0], chords: [C, C] },
    ).bars,
    [2],
  );
});

test("alberti: low-high-middle-high in eighths", () => {
  const eighths = (ms: number[]) => ms.map((m) => [m, 0.5] as [number, number]);
  assert.ok(ruleOk(chords(2, eighths([48, 55, 52, 55, 48, 57, 53, 57])), { id: "alberti", part: 0 }).ok);
  // a broken chord (low-middle-high-middle), and quarter notes
  assert.deepEqual(ruleOk(chords(2, eighths([48, 55, 52, 55, 48, 52, 55, 52])), { id: "alberti", part: 0 }).bars, [2]);
  assert.deepEqual(ruleOk(chords(2, quarters([48, 55, 52, 55])), { id: "alberti", part: 0 }).bars, [1]);
  assert.equal(ruleOk(chords(2), { id: "alberti", part: 0 }).ok, false);
});

test("contraryMostly: at least half of the moves where both parts move go opposite ways", () => {
  const upper = whole([72, 74, 76, 77, 79]);
  assert.ok(ruleOk(score(upper, whole([72, 71, 69, 67, 64])), { id: "contraryMostly", upper: 0, lower: 1 }).ok);
  const r = ruleOk(score(upper, whole([69, 71, 72, 74, 76])), { id: "contraryMostly", upper: 0, lower: 1 });
  assert.deepEqual([r.ok, r.severity, r.detail], [false, "error", "0/4"]);
  // a held lower note is oblique motion: not counted either way
  assert.ok(ruleOk(score(upper, whole([60, 60, 60, 60, 60])), { id: "contraryMostly", upper: 0, lower: 1 }).ok);
});

test("noParallelsAll and spacing: every pair of a quartet, neighbours within their distance", () => {
  // C to D major in root position, all parts up a step: fifths and octaves everywhere
  const sat = (s: number[], a: number[], t: number[], b: number[]) => score(whole(s), whole(a), whole(t), whole(b));
  const parallel = sat([72, 74], [67, 69], [64, 66], [48, 50]);
  assert.deepEqual(ruleOk(parallel, { id: "noParallelsAll", parts: [0, 1, 2, 3] }).bars, [2]);
  const good = sat([76, 76], [72, 72], [67, 69], [48, 57]);
  assert.ok(ruleOk(good, { id: "noParallelsAll", parts: [0, 1, 2, 3] }).ok);
  assert.ok(ruleOk(good, { id: "spacing", parts: [0, 1, 2, 3], maxApart: [12, 12, 24] }).ok);
  // the viola above violin II; violin II more than an octave below violin I
  assert.deepEqual(
    ruleOk(sat([76, 76], [64, 72], [67, 69], [48, 57]), { id: "spacing", parts: [0, 1, 2, 3], maxApart: [12, 12, 24] }).bars,
    [1],
  );
  assert.deepEqual(
    ruleOk(sat([76, 76], [72, 62], [67, 57], [48, 45]), { id: "spacing", parts: [0, 1, 2, 3], maxApart: [12, 12, 24] }).bars,
    [2],
  );
});

test("ties join into one sound; chords count their top note", () => {
  const s = score();
  s.notes = [
    { part: 0, measure: 1, offset: 0, dur: 4, midi: [60], name: "", tie: "start" },
    { part: 0, measure: 2, offset: 4, dur: 2, midi: [60], name: "", tie: "stop" },
    { part: 0, measure: 2, offset: 6, dur: 2, midi: [60, 64, 67], name: "", tie: null },
  ];
  assert.deepEqual(sounds(s.notes, 0).map((x) => [x.midi, x.dur]), [[60, 6], [67, 2]]);
});

test("every problem's starter is a string and its rules are known", () => {
  for (const p of PROBLEMS) {
    assert.match(p.starter, /score = /);
    assert.ok(p.rules.length > 0);
  }
});
