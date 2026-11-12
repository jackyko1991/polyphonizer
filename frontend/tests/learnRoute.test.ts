import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLearn } from "../src/learn/route.ts";

test("Learn routes: code and play sub-pages; old addresses mean Code and are rewritten", () => {
  assert.deepEqual(parseLearn("code", "hello-scale"), { tab: "code", id: "hello-scale", redirect: null });
  assert.deepEqual(parseLearn("play", null), { tab: "play", id: null, redirect: null });
  assert.deepEqual(parseLearn("code", undefined), { tab: "code", id: null, redirect: null });
  // before the split: #/learn/<problem> and #/learn
  assert.deepEqual(parseLearn("hello-scale", null), { tab: "code", id: "hello-scale", redirect: "#/learn/code/hello-scale" });
  assert.deepEqual(parseLearn(null, null), { tab: "code", id: null, redirect: "#/learn/code" });
});
