import { test } from "node:test";
import assert from "node:assert/strict";
import { IMSLP, imslpRows, imslpUrl, parseImslp } from "../src/library/imslp.ts";
import { licenceClass } from "../src/library/elsewhere.ts";

const TSV = `#imslp 2026-11-16 3
@0\tLudwig van Beethoven
1001\t0\tSymphony No.5, Op.67\tIB 123
@1\tAnonymous
1002\t1\tGreensleeves\t
1003\t0\tFür Elise, WoO 59\t
`;

test("IMSLP's index: its date and count, composers once, works with page id, title and catalogue number", () => {
  const ix = parseImslp(TSV);
  assert.equal(ix.date, "2026-11-16");
  assert.equal(ix.count, 3);
  assert.deepEqual(ix.works, [
    ["1001", "Ludwig van Beethoven", "Symphony No.5, Op.67", "IB 123"],
    ["1002", "Anonymous", "Greensleeves", ""],
    ["1003", "Ludwig van Beethoven", "Für Elise, WoO 59", ""],
  ]);
  // a damaged line is skipped, not fatal
  assert.equal(parseImslp(TSV + "garbage\nx\t9\n").works.length, 3);
});

test("IMSLP works as Library rows: the page as the link, the era of the composer where the Library knows it, licence to check", () => {
  assert.equal(imslpUrl("1001"), "https://imslp.org/index.php?curid=1001");
  const rows = imslpRows(parseImslp(TSV), new Map([["Ludwig van Beethoven", "Classical"]]));
  assert.equal(rows.length, 3);
  const [five, green] = rows;
  assert.equal(five[0], IMSLP);
  assert.equal(five[13], IMSLP);
  assert.equal(five[1], "https://imslp.org/index.php?curid=1001");
  assert.equal(five[3], "Symphony No.5, Op.67");
  assert.equal(five[4], "Ludwig van Beethoven");
  assert.equal(five[8], "Classical");
  assert.equal(five[9], "IB 123");
  assert.equal(green[8], "Other");
  // each file on IMSLP has its own licence: the filter says to check it there
  assert.equal(licenceClass(five, {}), "varies");
});
