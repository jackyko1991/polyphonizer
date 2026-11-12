import { test } from "node:test";
import assert from "node:assert/strict";
import { currentProject, deleteOwn, forkCurrent, freshProject, openSample, resetSample, setOwn, withCurrent, type Workspace } from "../src/workspace.ts";

const empty: Workspace = { own: null, ownLabel: "", samples: {}, current: { kind: "own" } };
const edit = (ws: Workspace, code: string) => withCurrent(ws, { ...currentProject(ws)!, files: [{ name: "main.py", code }] });

test("samples can be edited without limit and never use the own-score slot", () => {
  let ws = openSample(empty, "ex:trio", "Trio", "score = 1\n");
  ws = edit(ws, "score = 2\n");
  ws = openSample(ws, "lib:bach", "Bach", "score = 3\n");
  ws = edit(ws, "score = 4\n");
  assert.equal(ws.own, null);
  // reopening a sample keeps its edits; Reset restores it
  ws = openSample(ws, "ex:trio", "Trio", "score = 1\n");
  assert.equal(currentProject(ws)!.files[0].code, "score = 2\n");
  ws = resetSample(ws, "ex:trio");
  assert.equal(currentProject(ws)!.files[0].code, "score = 1\n");
});

test("one own score on the community tier: a fork counts, a second is refused, replace or delete frees it", () => {
  let ws = openSample(empty, "ex:trio", "Trio", "score = 1\n");
  const forked = forkCurrent(ws);
  assert.ok(forked.ok);
  ws = forked.ok ? forked.ws : ws;
  assert.equal(ws.current.kind, "own");
  assert.equal(ws.ownLabel, "Trio");
  // a second own score (an import, a new score, another fork) is refused
  assert.deepEqual(setOwn(ws, freshProject("score = 9\n"), "Mine"), { ok: false, reason: "full" });
  ws = openSample(ws, "lib:bach", "Bach", "score = 3\n");
  assert.deepEqual(forkCurrent(ws), { ok: false, reason: "full" });
  // unless replacing on purpose
  const replaced = forkCurrent(ws, true);
  assert.ok(replaced.ok && replaced.ws.ownLabel === "Bach");
  // deleting frees the slot
  ws = deleteOwn(replaced.ok ? replaced.ws : ws);
  assert.ok(setOwn(ws, freshProject("score = 9\n"), "Mine").ok);
  // a higher limit (Pro, later) allows more
  assert.ok(setOwn({ ...ws, own: freshProject("x") }, freshProject("y"), "Two", false, 50).ok);
});

test("renaming persists, a save point tracks changes, and delete clears both", async () => {
  const { renameOwn, saveOwn, ownChanged } = await import("../src/workspace.ts");
  let ws = setOwn(empty, freshProject("score = 1\n"), "Mine");
  assert.ok(ws.ok);
  let w = ws.ok ? ws.ws : empty;
  w = renameOwn(w, "  Sonata sketch ");
  assert.equal(w.ownLabel, "Sonata sketch");
  assert.equal(renameOwn(w, "   ").ownLabel, "Sonata sketch");
  assert.ok(!ownChanged(w));
  w = edit(w, "score = 2\n");
  assert.ok(ownChanged(w));
  w = saveOwn(w);
  assert.ok(!ownChanged(w));
  w = deleteOwn(w);
  assert.equal(w.own, null);
  assert.equal(w.ownSaved, null);
});
