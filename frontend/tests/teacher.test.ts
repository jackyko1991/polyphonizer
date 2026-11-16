/** The AI teacher's pure parts: where notes fall, the attempt report it is given, and checks on its tool inputs. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { attemptReport, barBeat, beatsPerBar, checkPlay, checkPractice, noteList, systemPrompt, TOOLS } from "../src/learn/play/teacher.ts";

test("bars and beats: from ms at a tempo, in the lesson's meter", () => {
  assert.equal(beatsPerBar("X:1\nM:3/4\nK:C"), 3);
  assert.equal(beatsPerBar("X:1\nM:6/8\nK:C"), 2);
  assert.equal(beatsPerBar("X:1\nK:C"), 4);
  assert.equal(barBeat(0, 60, 4), "bar 1 beat 1");
  assert.equal(barBeat(5000, 60, 4), "bar 2 beat 2");
  assert.equal(barBeat(1500, 60, 3), "bar 1 beat 2½");
  assert.equal(noteList([{ id: "a", midi: 60, time: 0 }, { id: "b", midi: 67, time: 1000 }], 60, 4), "1. C4 at bar 1 beat 1\n2. G4 at bar 1 beat 2");
});

test("the attempt report names each note, where it is, and how it went", () => {
  const target = [
    { id: "a", midi: 60, time: 0 },
    { id: "b", midi: 62, time: 500 },
    { id: "c", midi: 64, time: 1000 },
  ];
  const r = attemptReport(
    target,
    { results: [{ id: "a", mark: "ok", offset: 12 }, { id: "b", mark: "late", offset: 140 }, { id: "c", mark: "missed" }], extra: 1, score: 50, passed: false },
    "time",
    120,
    4,
    80,
  );
  assert.match(r, /In time at ♩ = 120 \(on time = within 80 ms; early\/late = within 200 ms\)/);
  assert.match(r, /Score: 50% \(not passed yet/);
  assert.match(r, /Extra notes played: 1/);
  assert.match(r, /2\. D4 \(bar 1 beat 2\): late \(\+140 ms\)/);
  assert.match(r, /3\. E4 \(bar 1 beat 3\): missed/);
});

test("tool inputs are checked before anything plays (they stream in, so they may be cut short)", () => {
  assert.deepEqual(checkPlay({ from_note: 2, to_note: 4, bpm: 60 }, 8), { from: 2, to: 4, bpm: 60, loudness: undefined });
  assert.equal(typeof checkPlay({ from_note: 5, to_note: 3, bpm: 60 }, 8), "string");
  assert.equal(typeof checkPlay({ from_note: 1, to_note: 9, bpm: 60 }, 8), "string");
  assert.equal(typeof checkPlay({ from_note: 1, to_note: 2 }, 8), "string");
  assert.equal(typeof checkPlay({ from_note: 1, to_note: 2, bpm: 60, loudness: [2] }, 8), "string");
  assert.deepEqual(checkPractice({ bpm: 50, mode: "wait" }), { bpm: 50, mode: "wait" });
  assert.equal(typeof checkPractice({}), "string");
  assert.equal(typeof checkPractice({ mode: "fast" }), "string");
  // the tools' schemas are strict objects, and the prompt follows the page's language
  for (const t of TOOLS) assert.equal((t.input_schema as { additionalProperties?: boolean }).additionalProperties, false);
  assert.match(systemPrompt(true), /Traditional Chinese/);
  assert.match(systemPrompt(false), /Reply in English/);
});
