import { test } from "node:test";
import assert from "node:assert/strict";
import { ELSEWHERE, elsewhereLinks, fileKind, importCode, licenceClass, searchTerms } from "../src/library/elsewhere.ts";
import type { Row, Source } from "../src/library/collections.ts";

const row = (composer: string, title: string, source?: string): Row => ["c", "p", null, title, composer, 1, null, "", "", "", "", [], [], source];

test("the search terms: the composer's surname and the title without catalogue clutter", () => {
  assert.equal(searchTerms({ composer: "Franz Schubert", title: "Der Erlkönig, D.328" }), "Schubert Der Erlkönig");
  assert.equal(searchTerms({ composer: "Wolfgang Amadeus Mozart", title: "Piano Sonata No. 11 in A major, K. 331 · 3. Alla turca" }), "Mozart Piano Sonata No. 11 in A major");
  assert.equal(searchTerms({ composer: "Josquin des Prez", title: "Kyrie" }), "Josquin des Prez Kyrie");
  assert.equal(searchTerms({ composer: "Ludwig van Beethoven" }), "Beethoven");
  assert.equal(searchTerms({ composer: "Anonymous", title: "Greensleeves" }), "Greensleeves");
  assert.equal(searchTerms({ query: "  ave verum  " }), "ave verum");
  assert.equal(searchTerms({}), "");
});

test("find elsewhere: IMSLP, CPDL and Mutopia searches, the terms encoded", () => {
  assert.deepEqual(
    ELSEWHERE.map((s) => s.id),
    ["imslp", "cpdl", "mutopia", "musescore"],
  );
  const links = elsewhereLinks("Schubert Der Erlkönig");
  assert.equal(links.length, 4);
  assert.equal(links[3].url, "https://musescore.com/sheetmusic?text=Schubert%20Der%20Erlk%C3%B6nig");
  assert.equal(links[0].url, "https://imslp.org/index.php?title=Special:Search&search=Schubert%20Der%20Erlk%C3%B6nig");
  assert.equal(links[1].url, "https://www.cpdl.org/wiki/index.php?title=Special:Search&search=Schubert%20Der%20Erlk%C3%B6nig");
  assert.equal(links[2].url, "https://www.mutopiaproject.org/cgibin/make-table.cgi?searchingfor=Schubert%20Der%20Erlk%C3%B6nig");
  for (const l of links) assert.ok(l.url.startsWith("https://"), l.url);
  // nothing to search: each site's front page
  assert.deepEqual(
    elsewhereLinks("").map((l) => l.url),
    ["https://imslp.org/", "https://www.cpdl.org/", "https://www.mutopiaproject.org/", "https://musescore.com/sheetmusic"],
  );
  // what each gives, to say on the link
  assert.ok(ELSEWHERE.every((s) => s.gives[0] && s.gives[1]));
});

test("a dropped or opened file: a score opens; a PDF or a recording needs the local runner; others are refused", () => {
  for (const n of ["a.musicxml", "a.xml", "a.MXL", "a.mid", "a.midi", "a.abc", "a.krn", "a.mei"]) assert.equal(fileKind(n), "score", n);
  assert.equal(fileKind("Schubert_Erlkonig.pdf"), "pdf");
  for (const n of ["take.wav", "take.mp3", "take.m4a", "take.ogg", "take.flac"]) assert.equal(fileKind(n), "audio", n);
  assert.equal(fileKind("take.webm", "audio/webm"), "audio");
  assert.equal(fileKind("photo.png"), "image");
  for (const n of ["notes.docx", "noext", "x.mscz"]) assert.equal(fileKind(n), "other", n);
  // the browser's type is used when the name has no extension
  assert.equal(fileKind("scan", "application/pdf"), "pdf");
  assert.equal(fileKind("rec", "audio/wav"), "audio");
});

test("main.py for an imported file loads it, and says where it came from when known", () => {
  assert.equal(importCode("lc123.mxl"), '# Imported: lc123.mxl\nscore = load("lc123.mxl")\n');
  assert.equal(
    importCode("Erlkonig.mxl", "https://imslp.org/wiki/Erlk%C3%B6nig,_D.328_(Schubert,_Franz)"),
    '# Imported: Erlkonig.mxl, from https://imslp.org/wiki/Erlk%C3%B6nig,_D.328_(Schubert,_Franz)\n# Check the file\'s licence on that page before sharing it.\nscore = load("Erlkonig.mxl")\n',
  );
  // only a web page counts as a source; anything else is left out (it is written into code)
  assert.equal(importCode("a.mid", 'javascript:alert(1)"\nimport os'), '# Imported: a.mid\nscore = load("a.mid")\n');
});

test("the licence filter: free for any use, attribution, or non-commercial", () => {
  const sources: Record<string, Source> = {
    cc0: { repo: "", name: ["", ""], licence: "CC0", licenceUrl: "", credit: "", homepage: "", nonCommercial: false, sha: "" },
    by: { repo: "", name: ["", ""], licence: "CC BY 4.0", licenceUrl: "", credit: "", homepage: "", nonCommercial: false, sha: "" },
    nc: { repo: "", name: ["", ""], licence: "CC BY-NC-SA 4.0", licenceUrl: "", credit: "", homepage: "", nonCommercial: true, sha: "" },
  };
  // music21's corpus: works in the public domain, shipped with music21
  assert.equal(licenceClass(row("Bach", "Chorale"), sources), "free");
  assert.equal(licenceClass(row("Schubert", "Lied", "cc0"), sources), "free");
  assert.equal(licenceClass(row("X", "Y", "by"), sources), "attribution");
  assert.equal(licenceClass(row("Mozart", "Sonata", "nc"), sources), "nc");
  // a work with its own licence (Mutopia's vary piece by piece)
  const mu = (l: "pd" | "by" | "by-sa"): Row => {
    const r = row("Bach", "Minuet", "mutopia");
    r[14] = l;
    return r;
  };
  assert.equal(licenceClass(mu("pd"), sources), "free");
  assert.equal(licenceClass(mu("by-sa"), sources), "attribution");
  // an unknown source is not assumed free
  assert.equal(licenceClass(row("X", "Y", "missing"), sources), "nc");
});
