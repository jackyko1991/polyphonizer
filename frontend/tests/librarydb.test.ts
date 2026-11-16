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

import ALIASES from "../src/library/composerAliases.json" with { type: "json" };

test("one spelling per composer: aliases end where they point, and the sources' works meet under it", async () => {
  const a = ALIASES as Record<string, string>;
  for (const [from, to] of Object.entries(a)) {
    assert.ok(!(to in a), `${from} → ${to} goes on`);
    assert.ok(!/[@^]/.test(to), to);
  }
  const names = (await db.query<{ name: string }>("SELECT name FROM composers")).map((r) => r.name);
  assert.ok(!names.includes("F. Liszt"));
  const liszt = await db.query<{ source: string }>("SELECT DISTINCT w.source FROM works w JOIN composers c ON c.id = w.composer WHERE c.name = 'Franz Liszt'");
  for (const s of ["asap", "mutopia", "imslp"]) assert.ok(liszt.some((r) => r.source === s), s);
});

import { siblingsOf } from "../../scripts/library-db.ts";
import type { Row } from "../src/library/collections.ts";

test("the same work across sources: one composer and one catalogue number; not within a source; to the work's page", () => {
  const row = (source: string, path: string, title: string, composer: string, set = ""): Row => [source, path, null, title, composer, 2, null, "", "", set, "", [], [], source === "music21" ? undefined : source];
  const rows: Row[] = [
    row("openscore-lieder", "https://raw/lc1.mxl", "Der Erlkönig, D.328", "Franz Schubert"),
    row("imslp", "https://imslp.org/index.php?curid=77", "Erlkönig, D.328", "Franz Schubert"),
    row("mutopia", "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=5", "Erlkönig", "Franz Schubert", "D 328"),
    row("imslp", "https://imslp.org/index.php?curid=78", "Erlkönig, Op.1", "Carl Loewe"), // another composer
    row("asap", "https://raw/a.musicxml", "Piano Sonata No. 11 · 3", "Wolfgang Amadeus Mozart", "K. 331"),
    row("asap", "https://raw/b.musicxml", "Piano Sonata No. 11 · 1", "Wolfgang Amadeus Mozart", "K. 331"), // same source
    row("imslp", "https://imslp.org/index.php?curid=99", "Piano Sonata No.11, K.331/300i", "Wolfgang Amadeus Mozart"),
  ];
  const s = siblingsOf(rows);
  assert.deepEqual(s.get("https://raw/lc1.mxl#")?.map((x) => x[0]).sort(), ["imslp", "mutopia"]);
  assert.equal(s.get("https://raw/lc1.mxl#")?.find((x) => x[0] === "imslp")?.[1], "https://imslp.org/index.php?curid=77");
  assert.deepEqual(s.get("https://raw/a.musicxml#")?.map((x) => x[1]), ["https://imslp.org/index.php?curid=99"]);
  // IMSLP's rows are not keys (only the Library's own works show their editions elsewhere)
  assert.ok(![...s.keys()].some((k) => k.includes("imslp.org")));
});
