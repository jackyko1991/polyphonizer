import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mutopiaLinks, type MutopiaRow } from "../src/library/mutopia.ts";

/** run a function of scripts/mutopia_catalog.py (standard library only) on JSON arguments */
function py(fn: string, ...args: unknown[]): unknown {
  const code = `import json, sys; sys.path.insert(0, "../scripts"); import mutopia_catalog as m; print(json.dumps(m.${fn}(*json.loads(sys.argv[1])), ensure_ascii=False))`;
  for (const cmd of [["python3"], ["arch", "-arm64", "python3"]]) {
    try {
      return JSON.parse(execFileSync(cmd[0], [...cmd.slice(1), "-c", code, JSON.stringify(args)], { encoding: "utf8" }));
    } catch (e) {
      if ((e as { status?: number }).status === 1) throw e;
    }
  }
  return null;
}

const K523 = `\\version "2.4"
\\header {
  title = "Abendempfindung (KV 523)"
  composer = "Wolfgang Amadeus Mozart (1756-1791)"
  mutopiatitle = "Abendempfindung"
  mutopiacomposer = "MozartWA"
  mutopiaopus = "KV 523"
  mutopiainstrument = "Voice and Piano"
  date = "24th June 1787"
  style = "Classical"
  copyright = "Public Domain"
  maintainer = "Maurizio Tomasi"
  maintainerEmail = "someone@example.org"
  footer = "Mutopia-2005/12/09-501"
}`;

test("a Mutopia header gives title, composer, opus, instruments, style, licence and id (no maintainer details)", () => {
  assert.deepEqual(py("parse_header", K523), {
    title: "Abendempfindung",
    composer: "Wolfgang Amadeus Mozart",
    opus: "KV 523",
    instrument: "Voice and Piano",
    style: "Classical",
    licence: "Public Domain",
    id: 501,
    code: "MozartWA",
    date: "24th June 1787",
  });
  // no Mutopia header: nothing
  assert.equal(py("parse_header", '\\header { title = "x" }'), null);
  // a licence given as a LilyPond markup or with odd spacing, and \\" in a value
  const other = K523.replace('copyright = "Public Domain"', 'license = "Creative Commons Attribution-ShareAlike 4.0"').replace('"Abendempfindung"', '"Sonata \\"Pathétique\\""');
  const h = py("parse_header", other) as { licence: string; title: string };
  assert.equal(h.licence, "Creative Commons Attribution-ShareAlike 4.0");
  assert.equal(h.title, 'Sonata "Pathétique"');
  // older headers: an empty mutopiatitle (the title is used), the licence as mutopiacopyright, the id in a markup
  const old = `\\header {
    title = "Ode to Joy"
    mutopiatitle = ""    %  if not set taken from title field
    mutopiacomposer = "BeethovenLv"
    mutopiacopyright = "Creative Commons Attribution-ShareAlike 3.0"
  }
  tsfooter = \\markup { \\line {"Mutopia-2009/08/05-528"} }`;
  const o = py("parse_header", old) as { title: string; composer: string; licence: string; id: number };
  assert.equal(o.title, "Ode to Joy");
  assert.equal(o.composer, "BeethovenLv");
  assert.equal(o.licence, "Creative Commons Attribution-ShareAlike 3.0");
  assert.equal(o.id, 528);
  // no licence field: the tagline's licence link says it
  const tag = K523.replace('copyright = "Public Domain"', 'tagline = \\markup { \\with-url #"http://creativecommons.org/licenses/by-sa/3.0/" x }');
  assert.equal((py("parse_header", tag) as { licence: string }).licence, "Creative Commons Attribution-ShareAlike");
});

test("composer names: dates, years, arrangers and capitals taken off; a bare code spelled out", () => {
  const clean = (n: string) => py("clean_name", n);
  assert.equal(clean("1839 Felix Mendelssohn Bartholdy (1809–1847)"), "Felix Mendelssohn Bartholdy");
  assert.equal(clean("G. VERDI."), "G. Verdi");
  assert.equal(clean("Czerny, C."), "C. Czerny");
  assert.equal(clean("circa 1743 John Francis Wade (1711-1786)"), "John Francis Wade");
  assert.equal(clean("Johann B. Koenig (1691-1758), 1738, arr. William Henry Havergal (1793-1870), 1840"), "Johann B. Koenig");
  assert.equal(clean("Gabriel FAURÉ"), "Gabriel Fauré");
  assert.equal(py("from_code", "HoretzkyF"), "F. Horetzky");
  assert.equal(py("from_code", "SchulzJAP"), "J. A. P. Schulz");
  assert.equal(py("from_code", "Claribel"), "Claribel");
});

test("the licences, short", () => {
  const short = (l: string) => py("licence_key", l);
  assert.equal(short("Public Domain"), "pd");
  assert.equal(short("Creative Commons Attribution 3.0"), "by");
  assert.equal(short("Creative Commons Attribution-ShareAlike 4.0"), "by-sa");
  assert.equal(short("Creative Commons Attribution-ShareAlike 2.5"), "by-sa");
  assert.equal(short("Something else"), "other");
});

test("pieces in the source tree: a folder with <name>.ly or <name>-lys/, and which files hold the header first", () => {
  const paths = [
    "ftp/BachJS/BWV600/bwv600/bwv600.ly",
    "ftp/BachJS/BWV828/4-Partita/4-Partita-lys/bwv828.ly",
    "ftp/BachJS/BWV828/4-Partita/4-Partita-lys/aria.ly",
    "ftp/BachJS/BWV828/4-Partita/4-Partita-lys/defs.ily",
    "ftp/MonteverdiC/O_come_sei_gentile/O_come_sei_gentile.ly",
    "ftp/MozartWA/KV523/k523/k523-lys/k523.ly",
    "ftp/MozartWA/KV523/k523/k523-lys/melody.ly",
    "cc-rdfs/a3.rdf",
  ];
  assert.deepEqual(py("pieces", paths), {
    "ftp/BachJS/BWV600/bwv600": { name: "bwv600", lys: false, candidates: ["ftp/BachJS/BWV600/bwv600/bwv600.ly"] },
    "ftp/BachJS/BWV828/4-Partita": {
      name: "4-Partita",
      lys: true,
      candidates: ["ftp/BachJS/BWV828/4-Partita/4-Partita-lys/aria.ly", "ftp/BachJS/BWV828/4-Partita/4-Partita-lys/bwv828.ly", "ftp/BachJS/BWV828/4-Partita/4-Partita-lys/defs.ily"],
    },
    "ftp/MonteverdiC/O_come_sei_gentile": { name: "O_come_sei_gentile", lys: false, candidates: ["ftp/MonteverdiC/O_come_sei_gentile/O_come_sei_gentile.ly"] },
    "ftp/MozartWA/KV523/k523": { name: "k523", lys: true, candidates: ["ftp/MozartWA/KV523/k523/k523-lys/k523.ly", "ftp/MozartWA/KV523/k523/k523-lys/melody.ly"] },
  });
});

test("download links: Mutopia's page for the piece, and its MIDI and PDF as its RDF names them", () => {
  const one: MutopiaRow = [501, "Abendempfindung", "Wolfgang Amadeus Mozart", "KV 523", "Voice and Piano", "Classical", "pd", "MozartWA/KV523/k523", "k523.mid", "k523-a4.pdf"];
  const l = mutopiaLinks(one);
  assert.equal(l.page, "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=501");
  assert.equal(l.midi, "https://www.mutopiaproject.org/ftp/MozartWA/KV523/k523/k523.mid");
  assert.equal(l.pdf, "https://www.mutopiaproject.org/ftp/MozartWA/KV523/k523/k523-a4.pdf");
  const zips: MutopiaRow = [1652, "Phaéton", "Jean-Baptiste Lully", "LWV 61", "Orchestra", "Baroque", "pd", "LullyJB/LWV61/LWV61Phaeton", "LWV61Phaeton-mids.zip", ""];
  assert.equal(mutopiaLinks(zips).midi, "https://www.mutopiaproject.org/ftp/LullyJB/LWV61/LWV61Phaeton/LWV61Phaeton-mids.zip");
  assert.equal(mutopiaLinks(zips).pdf, "");
});

test("the catalogue, once built: every row has an id, a title, a composer and a known licence", (t) => {
  if (!existsSync("src/library/mutopia.json")) return t.skip("not built");
  const data = JSON.parse(readFileSync("src/library/mutopia.json", "utf8")) as { sha: string; works: MutopiaRow[] };
  assert.ok(data.works.length > 1800, String(data.works.length));
  assert.match(data.sha, /^[0-9a-f]{40}$/);
  const ids = new Set<number>();
  for (const r of data.works) {
    assert.ok(Number.isInteger(r[0]) && r[0] > 0, JSON.stringify(r));
    assert.ok(r[1] && r[2], JSON.stringify(r));
    assert.ok(["pd", "by", "by-sa"].includes(r[6]), JSON.stringify(r));
    assert.ok(!ids.has(r[0]), `id twice: ${r[0]}`);
    ids.add(r[0]);
    assert.ok(!JSON.stringify(r).includes("@"), "no e-mail addresses");
    assert.ok(r[8] || r[9], `no files: ${r[0]}`);
    for (const f of [r[8], r[9]]) assert.ok(!f || /^[\w.\-]+\.(mid|pdf|zip)$/.test(f), f);
  }
});
