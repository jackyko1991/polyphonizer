import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { correctionIssueUrl, metadataOf, MUTOPIA_LICENCES, mutopiaComposerId, openScoreOf, SITE_IDS, SITES } from "../src/share/sites.ts";

const LIED = "https://raw.githubusercontent.com/OpenScore/Lieder/38c5db5/scores/Schubert,_Franz/Winterreise/01_Gute_Nacht/lc5012345.mxl";

test("an OpenScore original: the score read with fetch_score, its MuseScore id, and the bars changed with Edit notes", () => {
  const code = `score = fetch_score("${LIED}")
edit_bar(score, "Voice", 9, "e'4 d'8 c'8")
edit_bar(score, 1, 12, "<c e g>2.")
show(score)`;
  const o = openScoreOf(code)!;
  assert.equal(o.repo, "OpenScore/Lieder");
  assert.equal(o.id, "5012345");
  assert.deepEqual(o.edits, [
    { part: "Voice", bar: 9, notes: "e'4 d'8 c'8" },
    { part: "#1", bar: 12, notes: "<c e g>2." },
  ]);
  assert.equal(openScoreOf(code.replace("Lieder", "StringQuartets").replace("lc5012345", "sq77"))?.repo, "OpenScore/StringQuartets");
  // not OpenScore: nothing to correct
  assert.equal(openScoreOf('score = fetch_score("https://raw.githubusercontent.com/craigsapp/joplin/abc/kern/a.krn")'), null);
  assert.equal(openScoreOf("score = corpus.parse('bach/bwv66.6')"), null);
});

test("the correction report: a GitHub new-issue page on the right repository, with the score's page and the bars", () => {
  const o = openScoreOf(`score = fetch_score("${LIED}")\nedit_bar(score, "Voice", 9, "e'4 d'8 c'8")`)!;
  const url = new URL(correctionIssueUrl(o, "Gute Nacht"));
  assert.equal(url.origin + url.pathname, "https://github.com/OpenScore/Lieder/issues/new");
  assert.equal(url.searchParams.get("title"), "Correction: Gute Nacht (5012345)");
  const body = url.searchParams.get("body")!;
  assert.match(body, /https:\/\/musescore\.com\/score\/5012345/);
  assert.match(body, /- Voice, bar 9: `e'4 d'8 c'8`/);
  // no bars edited: a line for the learner to fill in
  assert.match(new URL(correctionIssueUrl({ ...o, edits: [] }, "x")).searchParams.get("body")!, /\(bar, part, what is printed/);
});

test("a MusicXML file's title and composer", () => {
  const xml = `<score-partwise><work><work-title>Ständchen &amp; Lied</work-title></work><identification><creator type="composer">Franz Schubert</creator></identification></score-partwise>`;
  assert.deepEqual(metadataOf(xml), { title: "Ständchen & Lied", composer: "Franz Schubert" });
  assert.deepEqual(metadataOf("<score-partwise><movement-title>Minuet</movement-title></score-partwise>"), { title: "Minuet", composer: "" });
});

test("Mutopia's composer id from the folders of pieces it lists, under any of the composer's spellings", () => {
  const pieces = [
    { composer: "J. S. Bach", folder: "BachJS/BWV988/goldberg" },
    { composer: "Ludwig van Beethoven", folder: "BeethovenLv/O27/moonlight" },
  ];
  assert.equal(mutopiaComposerId("Ludwig van Beethoven", pieces), "BeethovenLv");
  assert.equal(mutopiaComposerId("L. van Beethoven", pieces), "BeethovenLv"); // initials
  assert.equal(mutopiaComposerId("Nobody Known", pieces), "");
  assert.equal(mutopiaComposerId("", pieces), "");
});

test("every site says what it needs, where to upload and its guide; Mutopia's licences are exactly its three", () => {
  for (const id of SITE_IDS) {
    const s = SITES[id];
    assert.ok(s.needs.length >= 2, id);
    assert.ok(s.files.length >= 1, id);
    assert.match(s.upload, /^https:\/\//, id);
    assert.match(s.guide, /^https:\/\//, id);
    for (const n of s.needs) assert.ok(n[0] && n[1], `${id}: both languages`);
  }
  assert.deepEqual(MUTOPIA_LICENCES, ["Public Domain", "Creative Commons Attribution 4.0", "Creative Commons Attribution-ShareAlike 4.0"]);
  assert.ok(SITES.mutopia.files.includes("ly"));
  assert.ok(SITES.imslp.files.includes("pdf"));
});

test("LilyPond for Mutopia: music21's text with the header fields, a version line, and no outdated helper", (t) => {
  try {
    execFileSync("python3", ["-c", "import music21"], { stdio: "ignore" });
  } catch {
    return t.skip("no music21 here");
  }
  const prog = `ns = {}
exec(compile(open("src/engine/prelude.py").read(), "prelude.py", "exec"), ns)
from music21 import converter
ns["_last"]["score"] = converter.parse("tinyNotation: 4/4 c4 d e f g1")
import json
print(json.loads(ns["_lilypond"](json.dumps({"title": 'A "quoted" title', "mutopiacomposer": "BachJS", "license": "Public Domain", "mutopiaopus": ""})))["text"])`;
  const ly = execFileSync("python3", ["-c", prog], { encoding: "utf8" });
  assert.match(ly, /^\\version "2\.24\.0"/);
  assert.match(ly, /title = "A \\"quoted\\" title"/);
  assert.match(ly, /mutopiacomposer = "BachJS"/);
  assert.match(ly, /license = "Public Domain"/);
  assert.doesNotMatch(ly, /mutopiaopus/); // (empty fields left out)
  assert.doesNotMatch(ly, /define-music-function \(parser location/);
  assert.equal((ly.match(/\\header/g) ?? []).length, 1);
  assert.match(ly, /\\score/);
});
