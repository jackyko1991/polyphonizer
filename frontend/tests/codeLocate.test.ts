import { test } from "node:test";
import assert from "node:assert/strict";
import { locateNote, tokens } from "../src/codeLocate.ts";

const text = (files: { name: string; code: string }[], spot: { file: string; from: number; to: number } | null) =>
  spot ? files.find((f) => f.name === spot.file)!.code.slice(spot.from, spot.to) : null;

test("tinyNotation tokens skip trip{ } and a time signature", () => {
  const t = "3/4 c4 d trip{e8 f g} a2";
  assert.deepEqual(tokens(t).map((x) => t.slice(x.from, x.to)), ["c4", "d", "e8", "f", "g", "a2"]);
});

test("a clicked note finds its token, by part name, in any file, through a variable", () => {
  const files = [
    { name: "main.py", code: 'melody = "e4 e f g g f e d"\nviolin = tiny(melody, name="Violin", inst="violin")\nflute = tiny("b4 b c\'\' d\'\'", name="Flute")\nscore = together(flute, violin)\n' },
    { name: "motifs.py", code: 'cello = tiny("C4 D E F", name="Cello")\n' },
  ];
  assert.equal(text(files, locateNote(files, "Violin", 1, 1, 3)), "g");
  assert.equal(text(files, locateNote(files, "Flute", 0, 1, 2)), "c''");
  assert.equal(text(files, locateNote(files, "Cello", 2, 1, 0)), "C4");
});

test("without tiny(), the bar's edit_bar line, else the line that makes the score", () => {
  const files = [{ name: "main.py", code: 'score = corpus.parse("mozart/k80/movement1")\nedit_bar(score, "Violin I", 3, "g\'2 a\'4 b\'4")\n' }];
  assert.match(text(files, locateNote(files, "Violin I", 0, 3, 5))!, /^edit_bar/);
  assert.match(text(files, locateNote(files, "Viola", 2, 7, 0))!, /corpus\.parse/);
});
