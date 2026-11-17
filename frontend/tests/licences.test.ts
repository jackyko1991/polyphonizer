import { test } from "node:test";
import assert from "node:assert/strict";
import { licenceOf, LICENCES, rightsFor, rightsLine, withRights } from "../src/licences.ts";
import { MUTOPIA_LICENCES } from "../src/share/sites.ts";

test("the licence line: who, the year, the licence and its link; CC0 as a dedication; all rights reserved", () => {
  assert.equal(rightsLine({ licence: "CC-BY-SA-4.0", holder: "Ana Lee" }, 2026), "© 2026 Ana Lee. Licensed under CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/");
  assert.equal(rightsLine({ licence: "CC0-1.0", holder: "Ana Lee" }, 2026), "Ana Lee: dedicated to the public domain under CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/");
  assert.equal(rightsLine({ licence: "all-rights-reserved", holder: "" }, 2026), "© 2026. All rights reserved.");
  assert.equal(rightsLine({ licence: "nonsense", holder: "x" }), "");
});

test("the licence into MusicXML: replacing <rights>, or added to <identification>, or a new <identification>", () => {
  assert.equal(withRights("<identification><rights>old</rights></identification>", "new & <ok>"), "<identification><rights>new &amp; &lt;ok&gt;</rights></identification>");
  assert.match(withRights("<identification>\n<creator/></identification>", "L"), /<identification>\n {4}<rights>L<\/rights>\n<creator\/>/);
  const bare = withRights("<score-partwise><work><work-title>T</work-title></work><part-list/></score-partwise>", "L");
  assert.match(bare, /<\/work><identification>\n {4}<rights>L<\/rights>\n {2}<\/identification>\n {2}<part-list\/>/);
  assert.equal(withRights("<x/>", ""), "<x/>");
});

test("a project's own licence first, else the learner's default; Mutopia's names for those it takes", () => {
  const dflt = { licence: "CC-BY-4.0", holder: "Ana" };
  assert.deepEqual(rightsFor({}, dflt), dflt);
  assert.deepEqual(rightsFor({ licence: "CC0-1.0" }, dflt), { licence: "CC0-1.0", holder: "Ana" });
  assert.deepEqual(rightsFor({ licence: "CC0-1.0", holder: "Bo" }, dflt), { licence: "CC0-1.0", holder: "Bo" });
  assert.equal(rightsFor({}, null), null);
  for (const l of LICENCES) if (l.mutopia) assert.ok(MUTOPIA_LICENCES.includes(l.mutopia), l.id);
  assert.equal(licenceOf("CC-BY-NC-4.0")?.mutopia, undefined); // Mutopia takes no non-commercial licence
});
