import { test } from "node:test";
import assert from "node:assert/strict";
import { getSoundfontNames } from "smplr";
import { GM } from "../src/engine/sound.ts";

test("the 128 General MIDI names match the sample sets' file names", () => {
  assert.equal(GM.length, 128);
  const known = new Set(getSoundfontNames());
  assert.deepEqual(GM.filter((n) => !known.has(n)), []);
});
