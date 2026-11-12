import { test } from "node:test";
import assert from "node:assert/strict";
import { check, sounds } from "../src/engine/checker.ts";
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
