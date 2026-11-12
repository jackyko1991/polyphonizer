import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutWidth } from "../src/ui.ts";

test("full screen zooms without re-flowing: the layout width stays what it was", () => {
  const before = layoutWidth(850, null);
  // entering full screen freezes the width; the panel growing to 1500 px changes nothing
  const frozen = before;
  assert.equal(layoutWidth(1500, frozen), before);
  assert.equal(layoutWidth(1920, frozen), before);
  // leaving it: the panel's own width again (normally the same as before, so the same systems)
  assert.equal(layoutWidth(850, null), before);
});
