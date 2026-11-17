import { test } from "node:test";
import assert from "node:assert/strict";
import { cursorAt, onsetTable } from "../src/engine/cursor.ts";

const table = onsetTable([
  { time: 0, x: 100, top: 10, height: 80, system: 0 },
  { time: 0, x: 96, top: 10, height: 80, system: 0 }, // a chord's lower note, a little to the left
  { time: 1000, x: 300, top: 10, height: 80, system: 0 },
  { time: 3000, x: 500, top: 10, height: 80, system: 0 },
  { time: 4000, x: 80, top: 120, height: 80, system: 1 },
]);

test("onsets merge per time, leftmost first", () => {
  assert.equal(table.length, 4);
  assert.equal(table[0].x, 96);
});

test("the cursor glides between onsets in a system, and jumps to the next system", () => {
  assert.equal(cursorAt(table, -50)!.x, 96);
  assert.equal(cursorAt(table, 500)!.x, 198); // halfway from 96 to 300
  assert.equal(cursorAt(table, 2000)!.x, 400); // halfway through a long note, 300 → 500
  // the last onset of a system holds until the next system starts, then jumps there
  assert.deepEqual(cursorAt(table, 3900), { x: 500, top: 10, height: 80, system: 0 });
  assert.deepEqual(cursorAt(table, 4000), { x: 80, top: 120, height: 80, system: 1 });
  assert.equal(cursorAt(table, 9999)!.x, 80);
  assert.equal(cursorAt([], 0), null);
});

test("reduced motion: step from onset to onset", () => {
  assert.equal(cursorAt(table, 500, false)!.x, 96);
  assert.equal(cursorAt(table, 1000, false)!.x, 300);
});

test("a repeat: the notes played the second time are the drawn ones (the cursor and lit notes follow the repeat)", async () => {
  const { drawnId } = await import("../src/engine/engrave.ts");
  assert.equal(drawnId("cjxj6ul-rend2"), "cjxj6ul");
  assert.equal(drawnId("cjxj6ul-rend12"), "cjxj6ul");
  assert.equal(drawnId("n-render"), "n-render");
  // Verovio plays bar 1 twice (12 onsets for 8 notes); every onset's note, renamed, is one in the drawing
  const createVerovioModule = (await import("verovio/wasm")).default;
  const { VerovioToolkit } = await import("verovio/esm");
  const { readFileSync } = await import("node:fs");
  const tk = new VerovioToolkit(await createVerovioModule());
  tk.loadData(readFileSync(new URL("./fixtures/repeat.musicxml", import.meta.url), "utf8"));
  const svg = tk.renderToSVG(1);
  const ons = (tk.renderToTimemap() as { tstamp: number; on?: string[] }[]).filter((e) => e.on?.length);
  assert.equal(ons.length, 12);
  for (const e of ons) for (const id of e.on!) assert.ok(svg.includes(`id="${drawnId(id)}"`), id);
  // and the repeated bar starts where the first did
  assert.equal(drawnId(ons[4].on![0]), ons[0].on![0]);
});
