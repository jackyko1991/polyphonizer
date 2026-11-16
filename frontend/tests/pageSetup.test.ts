import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETUP, setupCode, setupFor, withPaper, writeSetup } from "../src/engine/pageSetup.ts";

test("a setup becomes a pages(...) call with only what differs from the defaults", () => {
  assert.equal(setupCode(DEFAULT_SETUP), "pages()");
  assert.equal(setupCode({ ...DEFAULT_SETUP, part: "Violin I", stand: "single", min_rest: 3, page_breaks: [31] }), 'pages(part="Violin I", stand="single", min_rest=3, page_breaks=[31])');
  assert.equal(setupCode({ ...withPaper(DEFAULT_SETUP, "Letter"), plan_turns: false, margins_mm: [12, 12, 15, 15] }), 'pages(paper="Letter", plan_turns=False, margins_mm=(12, 12, 15, 15))');
});

test("controls ↔ code: the sheet's line is replaced, or added after score =; other sheets' lines stay", () => {
  const code = 'score = corpus.parse("mozart/k80/movement1")\nedit_bar(score, "Violin I", 3, "g\'2 a\'4 b\'4")\n';
  const one = writeSetup(code, { ...DEFAULT_SETUP, part: "Violin I", stand: "single" });
  assert.equal(one, `${code}pages(part="Violin I", stand="single")\n`);
  const two = writeSetup(one, { ...DEFAULT_SETUP, stand: "spread-right" });
  assert.match(two, /^pages\(part="Violin I", stand="single"\)$/m);
  assert.match(two, /^pages\(stand="spread-right"\)$/m);
  const three = writeSetup(two, { ...DEFAULT_SETUP, part: "Violin I", min_rest: 4 });
  assert.match(three, /^pages\(part="Violin I", min_rest=4\)$/m);
  assert.equal(three.match(/^pages\(/gm)?.length, 2);
  // code without score = gets the line at the end
  assert.equal(writeSetup("x = 1\n", DEFAULT_SETUP), "x = 1\npages()\n");
});

test("each sheet finds its own setup, or the defaults", () => {
  const layouts = [{ ...DEFAULT_SETUP, stand: "single" as const }, { ...DEFAULT_SETUP, part: "Cello", min_rest: 5 }];
  assert.equal(setupFor(layouts, null).stand, "single");
  assert.equal(setupFor(layouts, "Cello").min_rest, 5);
  // no pages(...) line: continuous, fit to the window; a pages() line without paper= keeps meaning A4
  assert.deepEqual(setupFor(layouts, "Viola"), { ...DEFAULT_SETUP, paper: "Fit", part: "Viola" });
  assert.equal(setupFor(layouts, null).paper, "A4");
  assert.equal(setupCode({ ...DEFAULT_SETUP, paper: "Fit" }), 'pages(paper="Fit")');
  assert.deepEqual(withPaper(DEFAULT_SETUP, "A4", "landscape").width_mm, 297);
});

test("the papers and screens are the same in Python and TypeScript, and 'fit this screen' keeps its shape", async () => {
  const { PAPERS, screenPaper } = await import("../src/engine/pageSetup.ts");
  const { readFileSync } = await import("node:fs");
  const py = readFileSync("src/engine/prelude.py", "utf8");
  for (const [name, [w, h]] of Object.entries(PAPERS)) assert.ok(py.includes(`"${name}": (${w.toFixed(1)}, ${h.toFixed(1)})`), name);
  assert.deepEqual(screenPaper(1640, 2360), [181, 260]);
  assert.deepEqual(screenPaper(1920, 1080), [260, 146]);
});
