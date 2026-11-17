import { test } from "node:test";
import assert from "node:assert/strict";
import { IMSLP, imslpPage, imslpRows, imslpUrl, parseImslp, searchImslp, searchableImslp, tidyName } from "../src/library/imslp.ts";
import { licenceClass } from "../src/library/elsewhere.ts";

const TSV = `#imslp 2026-11-16 3
@0\tLudwig van Beethoven\tBeethoven, Ludwig van
1001\t0\tSymphony No.5, Op.67\tIB 123
@1\tAnonymous\tAnonymous
1002\t1\tGreensleeves\t\tGreensleeves (Anonymous, arr. Smith)
1003\t0\tFür Elise, WoO 59\t
`;

test("IMSLP's index: its date and count, composers once, works with page name, title and catalogue number", () => {
  const ix = parseImslp(TSV);
  assert.equal(ix.date, "2026-11-16");
  assert.equal(ix.count, 3);
  assert.deepEqual(ix.works, [
    // (the page name is "<title> (<IMSLP's name>)" unless the line gives it)
    ["Symphony No.5, Op.67 (Beethoven, Ludwig van)", "Ludwig van Beethoven", "Symphony No.5, Op.67", "IB 123"],
    ["Greensleeves (Anonymous, arr. Smith)", "Anonymous", "Greensleeves", ""],
    ["Für Elise, WoO 59 (Beethoven, Ludwig van)", "Ludwig van Beethoven", "Für Elise, WoO 59", ""],
  ]);
  // a damaged line is skipped, not fatal
  assert.equal(parseImslp(TSV + "garbage\nx\t9\n").works.length, 3);
});

test("IMSLP works as Library rows: the page as the link, the era of the composer where the Library knows it, licence to check", () => {
  // linked by page name (IMSLP no longer answers index.php?curid=…), and back
  assert.equal(imslpUrl("Eine kleine Nachtmusik, K.525 (Mozart, Wolfgang Amadeus)"), "https://imslp.org/wiki/Eine_kleine_Nachtmusik,_K.525_(Mozart,_Wolfgang_Amadeus)");
  assert.equal(imslpUrl("Für Elise? #1"), "https://imslp.org/wiki/F%C3%BCr_Elise%3F_%231");
  assert.equal(imslpPage(imslpUrl("Für Elise? #1 (Beethoven, Ludwig van)")), "Für Elise? #1 (Beethoven, Ludwig van)");
  const rows = imslpRows(parseImslp(TSV), new Map([["Ludwig van Beethoven", "Classical"]]));
  assert.equal(rows.length, 3);
  const [five, green] = rows;
  assert.equal(five[0], IMSLP);
  assert.equal(five[13], IMSLP);
  assert.equal(five[1], "https://imslp.org/wiki/Symphony_No.5,_Op.67_(Beethoven,_Ludwig_van)");
  assert.equal(five[3], "Symphony No.5, Op.67");
  assert.equal(five[4], "Ludwig van Beethoven");
  assert.equal(five[8], "Classical");
  assert.equal(five[9], "IB 123");
  assert.equal(green[8], "Other");
  // each file on IMSLP has its own licence: the filter says to check it there
  assert.equal(licenceClass(five, {}), "varies");
});

test("searching IMSLP's index: every word in the title, composer or catalogue number; a composer filter; a limit", () => {
  const fold = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const ix = searchableImslp(parseImslp(TSV), fold);
  assert.deepEqual(searchImslp(ix, ["beethoven"]).map((i) => ix.works[i][2]), ["Symphony No.5, Op.67", "Für Elise, WoO 59"]);
  assert.deepEqual(searchImslp(ix, ["fur", "elise"]).map((i) => ix.works[i][2]), ["Für Elise, WoO 59"]); // accents folded
  assert.deepEqual(searchImslp(ix, ["ib", "123"]).map((i) => ix.works[i][2]), ["Symphony No.5, Op.67"]); // the catalogue number
  assert.deepEqual(searchImslp(ix, [], "Anonymous").map((i) => ix.works[i][2]), ["Greensleeves"]);
  assert.deepEqual(searchImslp(ix, [], ""), []); // nothing asked: nothing listed
  assert.equal(searchImslp(ix, ["o"], "", 1).length, 1);
});

test("IMSLP composers' names tidied: markup left over, a particle with its surname", () => {
  assert.equal(tidyName("Daniel @composer^ Johnson"), "Daniel Johnson");
  assert.equal(tidyName("Vincent d' Indy"), "Vincent d'Indy");
  assert.equal(tidyName("Guy d’ Hardelot"), "Guy d’Hardelot");
  assert.equal(tidyName("Ludwig van Beethoven"), "Ludwig van Beethoven");
});
