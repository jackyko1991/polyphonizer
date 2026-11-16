import { test } from "node:test";
import assert from "node:assert/strict";
import { AFFILIATE_REL, AMAZON_TAG, urtextUrl } from "../src/library/urtext.ts";
import type { Row } from "../src/library/collections.ts";

const row = (composer: string, title: string, era = "Classical"): Row => ["c", "p", null, title, composer, 2, null, "", era, "", "", [], []];

test("an urtext link: an Amazon UK search for the work's urtext edition, with the store ID", () => {
  assert.equal(AMAZON_TAG, "tensorizer-21");
  assert.equal(AFFILIATE_REL, "sponsored noopener noreferrer");
  const url = new URL(urtextUrl(row("Ludwig van Beethoven", "Piano Sonata No. 8 · 2"))!);
  assert.equal(url.origin, "https://www.amazon.co.uk");
  assert.equal(url.pathname, "/s");
  assert.equal(url.searchParams.get("k"), "Beethoven Piano Sonata No. 8 urtext");
  assert.equal(url.searchParams.get("tag"), "tensorizer-21");
  assert.equal(url.searchParams.get("i"), "stripbooks");
  assert.equal(new URL(urtextUrl(row("Franz Schubert", "Der Erlkönig, D.328", "Romantic"))!).searchParams.get("k"), "Schubert Der Erlkönig urtext");
});

test("urtext links only where urtext editions are published: the concert repertoire, not folk tunes, anonymous or medieval works", () => {
  assert.ok(urtextUrl(row("Johann Sebastian Bach", "Prelude, BWV 846", "Baroque")));
  assert.ok(urtextUrl(row("Frédéric Chopin", "Ballade No. 3", "Romantic")));
  assert.ok(urtextUrl(row("Maurice Ravel", "Miroirs · 3. Une Barque", "20th century")));
  assert.equal(urtextUrl(row("Traditional", "Greensleeves", "Traditional")), null);
  assert.equal(urtextUrl(row("Anonymous", "Kyrie", "Renaissance")), null);
  assert.equal(urtextUrl(row("Barbitonsoris", "19. Sanctus", "Medieval")), null);
  assert.equal(urtextUrl(row("music21 examples", "Demo")), null);
  // a composer the list doesn't know: no link (a search would find nothing useful)
  assert.equal(urtextUrl(row("Jean Japart", "Helas qu'il est a mon gré", "Renaissance")), null);
});
