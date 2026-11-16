import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { catalogIds } from "../src/library/catalogNumbers.ts";
import { codeFor, idText, type Row, type Source } from "../src/library/collections.ts";
import { isAllowedScoreUrl, localPathFor, SCORE_SOURCES, scoreUrlsIn } from "../src/library/scoreSources.ts";

const data = JSON.parse(readFileSync("src/library/collections.json", "utf8")) as { sources: Record<string, Source>; works: Row[] };
const corpus = JSON.parse(readFileSync("src/library/catalog.json", "utf8")) as { works: Row[] };

/** run the build script's path parsers (Python, standard library only) on sample paths */
function parse(fn: string, paths: string[]): unknown[] {
  const code = `import json, sys; sys.path.insert(0, "../scripts"); import collections_catalog as c; print(json.dumps([c.${fn}(p) for p in json.loads(sys.argv[1])], ensure_ascii=False))`;
  const args = ["-c", code, JSON.stringify(paths)];
  // an x64 Node under Rosetta can't start macOS's universal /usr/bin/python3: ask for the native one
  const run = python()!;
  return JSON.parse(execFileSync(run[0], [...run.slice(1), ...args], { encoding: "utf8" }));
}
let found: string[] | null | undefined;
function python(): string[] | null {
  if (found !== undefined) return found;
  for (const cmd of [["python3"], ["arch", "-arm64", "python3"]]) {
    try {
      execFileSync(cmd[0], [...cmd.slice(1), "-c", "pass"], { stdio: "ignore" });
      return (found = cmd);
    } catch {
      /* try the next */
    }
  }
  return (found = null);
}

test("the build script reads composer, set and title from OpenScore's paths", (t) => {
  if (!python()) return t.skip("no python3");
  assert.deepEqual(
    parse("parse_lied", [
      "scores/Schubert,_Franz/_/Der_Erlkönig,_D.328/lc29062370.mxl",
      "scores/Schubert,_Franz/Winterreise,_D.911/21_Das_Wirthshaus/lc5013945.mxl",
      "scores/Brahms,_Johannes/5_Lieder,_Op.47/1_Botschaft/lc5656522.mxl",
      "scores/Hardelot,_Guy_d’/_/I_hid_my_love/lc1.mxl",
      "scores/Poldowski/_/Dansons_la_gigue/lc2.mxl",
    ]),
    [
      ["Schubert,_Franz", "Franz Schubert", "", "Der Erlkönig, D.328"],
      ["Schubert,_Franz", "Franz Schubert", "Winterreise, D.911, No. 21", "Das Wirthshaus"],
      ["Brahms,_Johannes", "Johannes Brahms", "5 Lieder, Op.47, No. 1", "Botschaft"],
      ["Hardelot,_Guy_d’", "Guy d’Hardelot", "", "I hid my love"],
      ["Poldowski", "Poldowski", "", "Dansons la gigue"],
    ],
  );
  assert.deepEqual(
    parse("parse_quartet", [
      "scores/Mozart,_Wolfgang_Amadeus/String_Quartet_No.15_in_D_minor,_K.421417b_(Op._10,_No._2)/sq7294793.mxl",
      "scores/Haydn,_Joseph/String_Quartet_in_A_major,_Hob.III24,_Op.9_No.6/sq9146376.mxl",
      "scores/Dvořák,_Antonín/String_Quartet_No.12,_Op.96_(“American”)/sq8885439.mxl",
    ]),
    [
      ["Mozart,_Wolfgang_Amadeus", "Wolfgang Amadeus Mozart", "String Quartet No.15 in D minor, K.421/417b (Op. 10, No. 2)"],
      ["Haydn,_Joseph", "Joseph Haydn", "String Quartet in A major, Hob. III:24, Op.9 No.6"],
      ["Dvořák,_Antonín", "Antonín Dvořák", "String Quartet No.12, Op.96 (“American”)"],
    ],
  );
});

test("every collection work has a composer, an era, a licensed source and a URL pinned to a commit", () => {
  assert.ok(data.works.length > 1700);
  for (const r of data.works) {
    const source = data.sources[r[13]!];
    assert.ok(source, `no source: ${r[1]}`);
    assert.ok(source.licence && source.licenceUrl.startsWith("https://creativecommons.org/"), `no licence: ${r[1]}`);
    assert.ok(typeof r[4] === "string" && r[4].length > 0, `no composer: ${r[1]}`);
    assert.ok(r[8], `no era: ${r[1]}`);
    assert.match(source.sha, /^[0-9a-f]{40}$/);
    assert.ok(r[1].startsWith(`https://raw.githubusercontent.com/${source.repo}/${source.sha}/`), r[1]);
    assert.ok(!/\/(main|master|HEAD)\//.test(r[1]), r[1]);
    assert.ok(isAllowedScoreUrl(r[1]), r[1]);
    assert.equal(r[0], r[13]);
    assert.equal((r[11] ?? []).length, r[5]);
  }
  const count = (s: string) => data.works.filter((r) => r[13] === s).length;
  assert.ok(count("openscore-lieder") > 1400);
  assert.ok(count("openscore-quartets") > 190);
  assert.ok(count("sapp-mozart") > 60);
  assert.ok(count("sapp-joplin") > 40);
  assert.ok(count("sapp-haydn") > 20);
  assert.ok(count("sapp-scarlatti") > 60);
  assert.ok(count("asap") > 230);
  assert.ok(count("jrp") > 1300);
  assert.equal(data.sources.jrp.licence, "CC BY-NC 4.0");
  for (const s of ["sapp-haydn", "sapp-scarlatti", "asap", "jrp"]) assert.ok(data.sources[s].nonCommercial, s);
  assert.equal(data.sources["openscore-lieder"].licence, "CC0");
  assert.equal(data.sources["sapp-joplin"].licence, "CC BY-NC-SA 4.0");
  assert.ok(data.sources["sapp-mozart"].nonCommercial && !data.sources["openscore-quartets"].nonCommercial);
});

test("the build script tidies ASAP's titles and reads Humdrum headers", (t) => {
  if (!python()) return t.skip("no python3");
  assert.deepEqual(parse("asap_title", ["Piano_Sonatas_17-3", "Fugue_bwv_846", "Etudes_op_25_10", "Ballades_2", "Scherzos_31", "Miroirs_3_Une_Barque", "Sonata_3_2nd"]), [
    "Piano Sonata No. 17 · 3",
    "Fugue, BWV 846",
    "Etude Op. 25 No. 10",
    "Ballade No. 2",
    "Scherzo, Op. 31",
    "Miroirs · 3. Une Barque",
    "Sonata No. 3 · 2",
  ]);
  const head = "!!!COA: Josquin des Prez\n!!!OTL: Ave Maria\n!!!SCT: K. 1\n!!!SCT: L. 2\n**kern\t**kern\t**text\t**kern\n*-\t*-\t*-\t*-";
  assert.deepEqual(parse("humdrum_header", [head]), [{ COA: "Josquin des Prez", OTL: "Ave Maria", SCT: "K. 1 / L. 2", _voices: 3 }]);
});

test("the new collections: titles, composers (Josquin's attributed works too), no duplicates", () => {
  const find = (s: string, pred: (r: Row) => boolean) => data.works.find((r) => r[13] === s && pred(r));
  assert.ok(find("sapp-haydn", (r) => /^Sonata No\. \d+ in .+ \(Hob\. XVI:\d+\) · \d/.test(r[3])));
  assert.ok(find("sapp-scarlatti", (r) => r[3] === "Sonata in C major, L.1, K.514" && r[4] === "Domenico Scarlatti"));
  assert.ok(find("asap", (r) => r[3] === "Ballade No. 3" && r[4] === "Frédéric Chopin"));
  assert.ok(find("jrp", (r) => r[4] === "Josquin des Prez" && r[9] === "Missa Ave maris stella" && r[3] === "Kyrie"));
  assert.ok(data.works.filter((r) => r[13] === "jrp" && r[4] === "Josquin des Prez").length > 400);
  // the Josquin Research Project links some files into a second folder: each score is listed once
  assert.equal(new Set(data.works.map((r) => r[1])).size, data.works.length);
  assert.ok(!data.works.some((r) => /&\w+;/.test(r[4] + r[3])), "HTML entities left in names");
});

test("composers merge with the corpus's spelling; catalogue numbers come from titles and sets", () => {
  const corpusComposers = new Set(corpus.works.map((r) => r[4]));
  for (const name of ["Wolfgang Amadeus Mozart", "Joseph Haydn", "Ludwig van Beethoven", "Franz Schubert", "Scott Joplin", "Amy Beach", "Clara Schumann"]) {
    assert.ok(corpusComposers.has(name), name);
    assert.ok(data.works.some((r) => r[4] === name), name);
  }
  // one era per composer across the Library (Anonymous is no one composer: its works keep their own eras)
  const eraOf = new Map(corpus.works.map((r) => [r[4], r[8]]));
  for (const r of data.works) if (eraOf.has(r[4]) && r[4] !== "music21 examples" && r[4] !== "Anonymous") assert.equal(r[8], eraOf.get(r[4]), r[4]);
  const ids = (pred: (r: Row) => boolean) => catalogIds(idText(data.works.find(pred)!), data.works.find(pred)![4]);
  assert.deepEqual(ids((r) => r[3].startsWith("String Quartet No.17 in B-flat major, K.458")), ["k:458", "op:10.3"]);
  assert.ok(ids((r) => r[3] === "Der Erlkönig, D.328" && r[4] === "Franz Schubert").includes("d:328"));
  assert.ok(ids((r) => r[3] === "Das Wirthshaus").includes("d:911"));
  assert.ok(ids((r) => r[3] === "Botschaft").includes("op:47.1"));
  assert.ok(ids((r) => r[3].startsWith("Piano Sonata No. 11 in A major") && r[13] === "sapp-mozart").includes("k:331"));
});

test("main.py for a collection's work fetches its pinned URL and credits the source", () => {
  const lied = data.works.find((r) => r[3] === "Der Erlkönig, D.328")!;
  const code = codeFor(lied, data.sources);
  assert.match(code, /^# Franz Schubert: Der Erlkönig, D\.328 — OpenScore Lieder \(CC0\), openscore\.cc\n/);
  assert.ok(code.includes(`score = fetch_score(${JSON.stringify(lied[1])})`));
  assert.deepEqual(scoreUrlsIn(code), [lied[1]]);
  const rag = data.works.find((r) => r[13] === "sapp-joplin" && r[3].startsWith("The Entertainer"))!;
  assert.match(codeFor(rag, data.sources), /Craig Stuart Sapp, joplin \(CC BY-NC-SA 4\.0\), non-commercial use only/);
});

test("the allow-list takes exactly the collections' repositories", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";
  for (const ok of [
    `https://raw.githubusercontent.com/OpenScore/Lieder/${sha}/scores/Schubert,_Franz/_/Der_Erlkönig,_D.328/lc29062370.mxl`,
    `https://raw.githubusercontent.com/OpenScore/StringQuartets/${sha}/scores/Wolf,_Hugo/String_Quartet/sq8823783.mxl`,
    `https://raw.githubusercontent.com/craigsapp/mozart-piano-sonatas/${sha}/kern/sonata01-1.krn`,
    `https://raw.githubusercontent.com/craigsapp/joplin/${sha}/kern/entertainer.krn`,
    `https://raw.githubusercontent.com/craigsapp/haydn-piano-sonatas/${sha}/kern/sonata12-1.krn`,
    `https://raw.githubusercontent.com/craigsapp/scarlatti-keyboard-sonatas/${sha}/kern/L001K514.krn`,
    `https://raw.githubusercontent.com/fosfrancesco/asap-dataset/${sha}/Chopin/Ballades/3/xml_score.musicxml`,
    `https://raw.githubusercontent.com/josquin-research-project/jrp-scores/${sha}/Jos/Jos0301a-Missa_Ave_maris_stella-Kyrie.krn`,
  ])
    assert.ok(isAllowedScoreUrl(ok), ok);
  for (const bad of [
    "https://evil.example/x.mxl",
    `http://raw.githubusercontent.com/OpenScore/Lieder/${sha}/x.mxl`,
    "https://raw.githubusercontent.com/SomeoneElse/Lieder/main/x.mxl",
    "https://raw.githubusercontent.com/OpenScore/LiederEvil/main/x.mxl",
    "https://raw.githubusercontent.com/craigsapp/beethoven-piano-sonatas/main/kern/sonata01-1.krn",
    "https://raw.githubusercontent.com/adactio/TheSession-data/main/abc/tunes.abc",
    "https://raw.githubusercontent.com/OpenScore/Lieder/",
    "https://raw.githubusercontent.com/OpenScore/Lieder/main/../../SomeoneElse/x.mxl",
    "https://raw.githubusercontent.com/OpenScore/Lieder/main/%2e%2e/x.mxl",
    "https://raw.githubusercontent.com/OpenScore/Lieder/main/x.mxl?redirect=https://evil.example",
    "https://raw.githubusercontent.com/OpenScore/Lieder/main/x.mxl\nimport os",
    "https://raw.githubusercontent.com.evil.example/OpenScore/Lieder/main/x.mxl",
    "file:///etc/passwd",
  ])
    assert.ok(!isAllowedScoreUrl(bad), bad);
});

test("prelude.py allows the same collections", () => {
  const prelude = readFileSync("src/engine/prelude.py", "utf8");
  const block = /_SCORE_SOURCES = \(([\s\S]*?)\)/.exec(prelude)![1];
  assert.deepEqual([...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]), SCORE_SOURCES);
  assert.match(prelude, /HEADER = "from music21 import \*\\nfrom polyphonizer import tiny, together, load, edit_bar, fetch_score, pages\\n"/);
});

test("the worker finds fetch_score string literals in the code", () => {
  const code = [
    'a = fetch_score("https://raw.githubusercontent.com/OpenScore/Lieder/x/a.mxl")',
    "b = fetch_score( 'https://raw.githubusercontent.com/craigsapp/joplin/x/kern/b.krn' )",
    'c = fetch_score(r"https://raw.githubusercontent.com/OpenScore/StringQuartets/x/c.mxl")',
    'd = fetch_score("https://raw.githubusercontent.com/OpenScore/Lieder/x/a.mxl")  # again',
    "e = fetch_score(url)  # not a literal",
    'f = my_fetch_score("https://evil.example/f.mxl")',
  ].join("\n");
  assert.deepEqual(scoreUrlsIn(code), [
    "https://raw.githubusercontent.com/OpenScore/Lieder/x/a.mxl",
    "https://raw.githubusercontent.com/craigsapp/joplin/x/kern/b.krn",
    "https://raw.githubusercontent.com/OpenScore/StringQuartets/x/c.mxl",
  ]);
});

test("a fetched score's local file is named by the URL's SHA-1, with its extension", async () => {
  const a = await localPathFor("https://raw.githubusercontent.com/craigsapp/joplin/x/kern/entertainer.krn");
  assert.match(a, /^\/files\/fetched\/[0-9a-f]{40}\.krn$/);
  assert.notEqual(a, await localPathFor("https://raw.githubusercontent.com/craigsapp/joplin/x/kern/bethena.krn"));
  assert.match(await localPathFor("https://raw.githubusercontent.com/OpenScore/Lieder/x/a.mxl"), /\.mxl$/);
});
