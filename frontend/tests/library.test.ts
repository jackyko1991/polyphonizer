import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { catalogIds, idLabel, idMatches, parseQuery } from "../src/library/catalogNumbers.ts";

const finds = (query: string, path: string, title = "", composer = "") => {
  const { ids } = parseQuery(query);
  const work = catalogIds(`${path} ${title}`, composer);
  return ids.length > 0 && ids.every((q) => work.some((w) => idMatches(q, w)));
};

test("catalogue numbers are read from paths and titles", () => {
  assert.deepEqual(catalogIds("bach/bwv366.krn"), ["bwv:366"]);
  assert.deepEqual(catalogIds("bach/bwv66.6.mxl"), ["bwv:66.6"]);
  assert.deepEqual(catalogIds("mozart/k156/movement4.mxl K 156 · Movement 4"), ["k:156"]);
  assert.deepEqual(catalogIds("beethoven/opus59no2/movement1.mxl Op. 59 No. 2 Movement 1 Score"), ["op:59.2"]);
  assert.deepEqual(catalogIds("corelli/opus3no1/1grave.xml Sonata da Chiesa, No. I (opus 3, no. 1)"), ["op:3.1"]);
  assert.deepEqual(catalogIds("cpebach/h186.mxl H. 186, Wq. 55/4", "C. P. E. Bach").sort(), ["h:186", "wq:55.4"]);
  assert.deepEqual(catalogIds("essenFolksong/han1.abc Die Hochzeit in D 7", "Traditional"), []);
  assert.equal(idLabel("op:59.2"), "Op. 59 No. 2");
  assert.equal(idLabel("k:156"), "K. 156");
});

test("typed catalogue numbers in any common form find the work", () => {
  for (const q of ["bwv 366", "BWV366", "bwv. 366"]) assert.ok(finds(q, "bach/bwv366.krn"), q);
  for (const q of ["kv 156", "k156", "K. 156", "KV156"]) assert.ok(finds(q, "mozart/k156/movement1.mxl"), q);
  for (const q of ["op 59 no 2", "op.59/2", "opus 59 nr 2", "op59-2", "Op. 59, No. 2"]) assert.ok(finds(q, "beethoven/opus59no2/movement1.mxl"), q);
  assert.ok(finds("bwv 66.6", "bach/bwv66.6.mxl"));
  assert.ok(finds("h 186", "cpebach/h186.mxl", "H. 186, Wq. 55/4", "C. P. E. Bach"));
  assert.ok(finds("wq 55/4", "cpebach/h186.mxl", "H. 186, Wq. 55/4", "C. P. E. Bach"));
});

test("numbers match exactly, but a missing No. finds every number of the opus", () => {
  assert.ok(!finds("k 15", "mozart/k155/movement1.mxl"));
  assert.ok(finds("k 155", "mozart/k155/movement1.mxl"));
  for (const n of [1, 2, 3]) assert.ok(finds("op 59", `beethoven/opus59no${n}/movement1.mxl`));
  assert.ok(!finds("op 59 no 2", "beethoven/opus59no1/movement1.mxl"));
  assert.ok(!finds("op 5", "beethoven/opus59no1/movement1.mxl"));
  assert.ok(finds("bwv 66", "bach/bwv66.6.mxl"));
  // other words are left for the text search
  assert.deepEqual(parseQuery("mozart k 458"), { ids: ["k:458"], rest: "mozart" });
  assert.deepEqual(parseQuery("beethoven op 18"), { ids: ["op:18"], rest: "beethoven" });
});

test("the catalogue: every work has a composer and an era; the filters' counts add up", () => {
  const { works } = JSON.parse(readFileSync("src/library/catalog.json", "utf8")) as { works: (string | number | null)[][] };
  assert.ok(works.length > 15000);
  for (const w of works) {
    assert.ok(typeof w[4] === "string" && w[4].length > 0, `no composer: ${w[1]}`);
    assert.ok(typeof w[8] === "string" && w[8].length > 0, `no era: ${w[1]}`);
  }
  const byComposer = new Map<string, number>();
  const byEra = new Map<string, number>();
  for (const w of works) {
    byComposer.set(w[4] as string, (byComposer.get(w[4] as string) ?? 0) + 1);
    byEra.set(w[8] as string, (byEra.get(w[8] as string) ?? 0) + 1);
  }
  const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
  assert.equal(sum(byComposer), works.length);
  assert.equal(sum(byEra), works.length);
  assert.equal(byComposer.get("Wolfgang Amadeus Mozart"), 16);
});

test("every work has its instruments, one per part, and the part names to match", () => {
  const { works } = JSON.parse(readFileSync("src/library/catalog.json", "utf8")) as { works: unknown[][] };
  const counts = new Map<string, number>();
  for (const w of works) {
    const insts = w[11] as string[];
    const names = w[12] as string[];
    assert.ok(Array.isArray(insts) && insts.length > 0, `no instruments: ${w[1]}`);
    assert.ok(names.length === 0 || names.length === insts.length, `${w[1]}: ${names.length} names for ${insts.length} instruments`);
    for (const i of new Set(insts)) counts.set(i, (counts.get(i) ?? 0) + 1);
  }
  // the folk collections are melodies; the string quartets are two violins, viola and cello
  assert.ok((counts.get("melody") ?? 0) > 12000);
  const k80 = works.find((w) => w[1] === "mozart/k80/movement1.mxl")!;
  assert.deepEqual(k80[11], ["violin", "violin", "viola", "cello"]);
});
