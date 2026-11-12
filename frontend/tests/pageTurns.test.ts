import { test } from "node:test";
import assert from "node:assert/strict";
import { planPages, restAtMeasureStarts } from "../src/engine/pageTurns.ts";
import type { NoteEvent } from "../src/engine/types.ts";

test("turns move to where the rests are, even if pages are less full", () => {
  // 10 systems of 1 measure each, 4 per page; rests only before measures 3 and 7
  const restAt = [0, 0, 0, 5, 0, 0, 0, 5, 0, 0, 0];
  const plan = planPages({ systemStarts: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], restAt, perPage: 4, stand: "single", minRest: 2 });
  assert.deepEqual(plan.pageStarts, [0, 3, 7]);
  assert.ok(plan.ok);
  assert.deepEqual(plan.turns.map((t) => t.measure), [3, 7]);
});

test("open spreads: only even page ends are turns", () => {
  const restAt = new Array(13).fill(0);
  restAt[8] = 4; // the only good turn: before measure 8
  const plan = planPages({ systemStarts: [...Array(12).keys()], restAt, perPage: 4, stand: "spread", minRest: 2 });
  assert.ok(plan.ok, JSON.stringify(plan));
  assert.equal(plan.turns.length, 1);
  assert.equal(plan.turns[0].afterPage, 2);
  assert.equal(plan.turns[0].measure, 8);
});

test("with no rest anywhere the plan still lays out pages and reports bad turns", () => {
  const plan = planPages({ systemStarts: [0, 1, 2, 3, 4, 5], restAt: new Array(7).fill(0), perPage: 3, stand: "single", minRest: 2 });
  assert.equal(plan.pageStarts.length, 2);
  assert.equal(plan.ok, false);
  assert.equal(plan.turns[0].ok, false);
});

test("rest at a barline counts rests before and after it, in seconds, and every part must rest", () => {
  const n = (part: number, offset: number, dur: number, midi: number[]): NoteEvent => ({
    part, measure: 0, offset, dur, midi, name: "", tie: null,
  });
  const measures = [0, 4, 8].map((offset, i) => ({ n: i + 1, offset, length: 4 }));
  // part 0: plays bar 1 beats 1-2, rests 2 beats, rests bar 2 beat 1, plays from beat 2
  const notes = [n(0, 0, 2, [60]), n(0, 2, 3, []), n(0, 5, 7, [62])];
  const at = restAtMeasureStarts(notes, measures, 60, [0]);
  assert.deepEqual(at.slice(0, 2), [0, 3]); // 2 beats before + 1 after, at 60 bpm = 3 s
  // a second part playing across the barline cancels the turn
  const both = restAtMeasureStarts([...notes, n(1, 3, 2, [50])], measures, 60, [0, 1]);
  assert.equal(both[1], 0);
});
