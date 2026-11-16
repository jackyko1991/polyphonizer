import { test } from "node:test";
import assert from "node:assert/strict";
import { matchComposer } from "../src/library/composerMatch.ts";

const IMSLP = [
  "Franz Liszt", "Béla Bartók", "Amy Marcy Beach", "John Parsons Beach", "Camille Saint-Saëns", "Carl Philipp Emanuel Bach",
  "August Wilhelm Bach", "Christoph Bach", "Aleksandr Borodin", "Aleksandr Scriabin", "Yulian Scriabin", "Abraham Johnson",
  "Alice Johnson", "Clément Janequin", "Engelbert Humperdinck", "Johann Sebastian Bach", "Pyotr Tchaikovsky", "Adolphe Adam",
  "Alexandre Adam", "Franz Paul Lachner", "Ignaz Lachner", "Alessandro Rolla", "Antonio Rolla",
];

test("a composer's name matched to IMSLP's: initials, accents, a name left out, transliteration; never a guess", () => {
  const m = (n: string) => matchComposer(n, IMSLP);
  assert.equal(m("F. Liszt"), "Franz Liszt");
  assert.equal(m("Bela Bartok"), "Béla Bartók");
  assert.equal(m("Amy Beach"), "Amy Marcy Beach");
  assert.equal(m("C. Saint-Saens"), "Camille Saint-Saëns");
  assert.equal(m("C. P. E. Bach"), "Carl Philipp Emanuel Bach");
  assert.equal(m("C. Janequin"), "Clément Janequin");
  assert.equal(m("Alexander Borodin"), "Aleksandr Borodin");
  assert.equal(m("Alexander Scriabin"), "Aleksandr Scriabin");
  assert.equal(m("Peter Ilyich Tchaikovsky"), "Pyotr Tchaikovsky");
  assert.equal(m("Adolphe Charles Adam"), "Adolphe Adam");
  // two candidates fit, or none: no match
  assert.equal(m("Franz Lachner"), "Franz Paul Lachner");
  assert.equal(m("A. Rolla"), null); // Alessandro or Antonio
  assert.equal(m("Daniel Johnson"), null);
  assert.equal(m("Allessandro Rolla"), null); // a misspelt given name is not guessed at
  // already IMSLP's spelling: itself
  assert.equal(m("Johann Sebastian Bach"), "Johann Sebastian Bach");
  // no surname to go by
  assert.equal(m("Anonymous"), null);
  assert.equal(m("Traditional"), null);
});
