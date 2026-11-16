import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../../scripts/library-db.ts";
import { catalogueInfo, ftsQuery, searchWorks, type Sql } from "../src/library/db.ts";

// one fresh database for these tests, from the catalogue files in the repository
const path = join(mkdtempSync(join(tmpdir(), "pz-db-")), "library.sqlite");
const built = build(path);
const raw = new DatabaseSync(path, { readOnly: true });
const db: Sql = { query: async (sql, params = []) => raw.prepare(sql).all(...params) as never };

test("the words typed become an FTS5 query: each word, the last a beginning, quotes escaped", () => {
  assert.equal(ftsQuery(["der", "erlk"]), '"der" "erlk"*');
  assert.equal(ftsQuery(['say "hi"']), '"say ""hi"""*');
  assert.equal(ftsQuery([" ", ""]), "");
});

test("the catalogue: every source in one database, with its build date and count", async () => {
  const info = await catalogueInfo(db);
  assert.equal(info.works, built.works);
  assert.ok(info.works > 280000, String(info.works));
  assert.match(info.built, /^\d{4}-\d\d-\d\d$/);
  const sources = (await db.query<{ source: string; n: number }>("SELECT source, COUNT(*) n FROM works GROUP BY source")).map((r) => r.source).sort();
  for (const s of ["music21", "openscore-lieder", "mutopia", "imslp", "jrp", "asap"]) assert.ok(sources.includes(s), s);
});

test("search: accents folded, a word's beginning, by source or composer, in the Library's order", async () => {
  const erl = await searchWorks(db, { words: ["erlkonig"], limit: 200 });
  assert.ok(erl.some((w) => w.source === "openscore-lieder" && w.composer === "Franz Schubert"));
  assert.ok(erl.some((w) => w.source === "imslp"));
  assert.deepEqual(erl.map((w) => w.id), [...erl.map((w) => w.id)].sort((a, b) => a - b));
  const imslp = await searchWorks(db, { words: ["erlk"], source: "imslp" });
  assert.ok(imslp.length > 3 && imslp.every((w) => w.source === "imslp" && /^\d+$/.test(w.path)));
  // Chinese composer names are searchable too
  assert.ok((await searchWorks(db, { words: ["舒伯特"], limit: 5 })).every((w) => w.composer === "Franz Schubert"));
  const byComposer = await searchWorks(db, { words: [], composer: "Scott Joplin", limit: 500 });
  assert.ok(byComposer.length > 40 && byComposer.every((w) => w.composer === "Scott Joplin"));
  assert.deepEqual(await searchWorks(db, { words: [] }), []);
});
