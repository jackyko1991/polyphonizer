/**
 * Build the Library's catalogue database (frontend/public/library/library.sqlite) from the catalogue files:
 *
 *     node scripts/library-db.ts          (pixi run library-db; the deploy runs it before building the site)
 *
 * Polyphonizer is a catalogue of pieces: it holds few scores itself, and lists works from music21's corpus, the open
 * collections (OpenScore, Craig Sapp, ASAP, the Josquin Research Project), the Mutopia Project and IMSLP, each with
 * the way to open or reach it. The catalogue files stay the source (readable, diffable in git): library/catalog.json,
 * collections.json, mutopia.json, analyses.json and data/imslp.tsv. This script turns them into one SQLite database the
 * page queries over HTTP range requests (it never downloads the whole file). It uses the same TypeScript as the page
 * (catalogue numbers, composers' Chinese names, instruments, licences), so both name and match things alike.
 *
 * Tables:
 *   works             one row a work, in the Library's order (by composer, then title); its links and licence class
 *   work_ids          its catalogue numbers ("bwv:66.6", "k:458", "op:59.2"), matched as the page does
 *   work_instruments  its instruments, with "voice" for any voice
 *   works_fts         full-text search: title, composer (both languages), set, original composer, instruments, parts
 *   sources           each source's name, licence and credit (JSON)
 *   meta              when it was built, and counts
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analysisKey, type Analyses } from "../frontend/src/library/analyses.ts";
import { catalogIds } from "../frontend/src/library/catalogNumbers.ts";
import { byComposer, idText, MUSIC21, type Row, type Source } from "../frontend/src/library/collections.ts";
import { licenceClass } from "../frontend/src/library/elsewhere.ts";
import { IMSLP, IMSLP_SOURCE, imslpRows, parseImslp } from "../frontend/src/library/imslp.ts";
import { withCanonicalComposer } from "../frontend/src/library/composers.ts";
import { COLLECTIONS, COMPOSER_ZH, ensembleOf, INSTRUMENTS, VOICES } from "../frontend/src/library/lexicon.ts";
import { MUTOPIA, MUTOPIA_SOURCE, mutopiaLinks, mutopiaRow, type MutopiaRow } from "../frontend/src/library/mutopia.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIB = join(ROOT, "frontend/src/library");
const IMSLP_TSV = join(ROOT, "data/imslp.tsv");
export const DB_PATH = join(ROOT, "frontend/public/library/library.sqlite");

const read = <T>(p: string) => JSON.parse(readFileSync(p, "utf8")) as T;

/** every work, as the Library's rows, with the links a row can't carry (Mutopia's files) */
export function allRows(): { rows: Row[]; sources: Record<string, Source>; mutopia: Map<string, MutopiaRow>; analyses: Analyses } {
  const corpus = read<{ works: Row[] }>(join(LIB, "catalog.json")).works;
  const open = read<{ sources: Record<string, Source>; works: Row[] }>(join(LIB, "collections.json"));
  const mu = read<{ works: MutopiaRow[] }>(join(LIB, "mutopia.json")).works;
  const analyses = read<Analyses>(join(LIB, "analyses.json"));
  const rows = [...corpus, ...open.works, ...mu.map(mutopiaRow)];
  // IMSLP: the era of a composer the Library knows, from the other sources
  const eras = new Map(rows.map((r) => [r[4], r[8]] as const));
  // (a loop, not push(...): a quarter of a million rows are too many arguments for one call)
  if (existsSync(IMSLP_TSV)) for (const r of imslpRows(parseImslp(readFileSync(IMSLP_TSV, "utf8")), eras)) rows.push(r);
  // each composer under one spelling across the sources (scripts/composer-aliases.ts)
  for (let i = 0; i < rows.length; i++) rows[i] = withCanonicalComposer(rows[i]);
  rows.sort(byComposer);
  return { rows, sources: { ...open.sources, [MUTOPIA]: MUTOPIA_SOURCE, [IMSLP]: IMSLP_SOURCE }, mutopia: new Map(mu.map((m) => [mutopiaLinks(m).page, m])), analyses };
}

/** the words a work is found by beyond its title and composer: set, original composer, Chinese name, collection,
 * instruments in both languages, part names */
function extraText(r: Row, sources: Record<string, Source>): string {
  const insts = [...new Set(r[11] ?? [])].map((i) => `${INSTRUMENTS[i]?.en.join(" ") ?? i} ${INSTRUMENTS[i]?.zh ?? ""}${VOICES.has(i) ? " voice voices 人聲" : ""}`);
  const source = r[13] ? sources[r[13]] : undefined;
  return [r[9], r[10], COMPOSER_ZH[r[4]] ?? "", COLLECTIONS[r[0]]?.join(" ") ?? "", source?.name.join(" ") ?? "", ...insts, ...(r[12] ?? [])].join(" ");
}

/** a work's editions in other sources: the same composer and a catalogue number in common (scheme and number, as the
 * page reads them: "d:328", "k:331"), not in its own source. Keyed by the page's row key (path#number); each edition
 * [source, link, title]. Only the Library's own works (not IMSLP's) are keys. */
export function siblingsOf(rows: Row[]): Map<string, [string, string, string][]> {
  const byKey = new Map<string, number[]>();
  const keysOf = rows.map((r, i) => {
    const keys = catalogIds(idText(r), r[4]).map((id) => `${r[4]}|${id}`);
    for (const k of keys) byKey.set(k, [...(byKey.get(k) ?? []), i]);
    return keys;
  });
  const out = new Map<string, [string, string, string][]>();
  rows.forEach((r, i) => {
    const source = r[13] ?? MUSIC21;
    if (source === IMSLP) return;
    const seen = new Set<number>();
    const found: [string, string, string][] = [];
    for (const k of keysOf[i])
      for (const j of byKey.get(k) ?? []) {
        const o = rows[j];
        const other = o[13] ?? MUSIC21;
        if (j === i || other === source || seen.has(j)) continue;
        seen.add(j);
        found.push([other, o[1], o[3]]);
      }
    if (found.length) out.set(`${r[1]}#${r[2] ?? ""}`, found.slice(0, 8));
  });
  return out;
}

export function build(path = DB_PATH): { works: number } {
  const { rows, sources, mutopia, analyses } = allRows();
  if (existsSync(path)) rmSync(path);
  const db = new DatabaseSync(path);
  // small pages: a search reads only the pages it needs over HTTP range requests
  db.exec(`
    PRAGMA page_size = 4096;
    PRAGMA journal_mode = DELETE;
    CREATE TABLE composers (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, zh TEXT, works INTEGER NOT NULL);
    -- (kept small, a quarter of a million rows: the composer by number; a collection only where it differs from the
    -- source; an IMSLP work's path is its page id; empty lists are NULL)
    CREATE TABLE works (
      id INTEGER PRIMARY KEY, source TEXT NOT NULL, collection TEXT, path TEXT NOT NULL, number INTEGER,
      title TEXT NOT NULL, composer INTEGER NOT NULL, parts INTEGER, key INTEGER, time TEXT, era TEXT, set_name TEXT,
      original TEXT, instruments TEXT, part_names TEXT, licence TEXT NOT NULL, work_licence TEXT, ensemble TEXT,
      analysis TEXT, links TEXT
    );
    CREATE TABLE work_ids (work INTEGER NOT NULL, id TEXT NOT NULL);
    CREATE TABLE work_instruments (work INTEGER NOT NULL, instrument TEXT NOT NULL);
    CREATE TABLE sources (id TEXT PRIMARY KEY, json TEXT NOT NULL);
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE VIRTUAL TABLE works_fts USING fts5(title, composer, extra, content='', detail='column', tokenize='unicode61 remove_diacritics 2');
  `);
  const insWork = db.prepare(`INSERT INTO works VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insId = db.prepare(`INSERT INTO work_ids VALUES (?, ?)`);
  const insInst = db.prepare(`INSERT INTO work_instruments VALUES (?, ?)`);
  const insFts = db.prepare(`INSERT INTO works_fts (rowid, title, composer, extra) VALUES (?, ?, ?, ?)`);
  db.exec("BEGIN");
  const composerIds = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r[4], (counts.get(r[4]) ?? 0) + 1);
  const insComposer = db.prepare(`INSERT INTO composers VALUES (?, ?, ?, ?)`);
  for (const [name, n] of counts) {
    composerIds.set(name, composerIds.size + 1);
    insComposer.run(composerIds.size, name, COMPOSER_ZH[name] ?? null, n);
  }
  const list = (x?: string[]) => (x?.length ? JSON.stringify(x) : null);
  rows.forEach((r, i) => {
    const id = i + 1;
    const key = analysisKey(r);
    const source = r[13] ?? MUSIC21;
    const mu = source === MUTOPIA ? mutopia.get(r[1]) : undefined;
    const path = source === IMSLP ? (/curid=(\d+)/.exec(r[1])?.[1] ?? r[1]) : r[1];
    insWork.run(
      id, source, r[0] === source ? null : r[0], path, r[2], r[3], composerIds.get(r[4])!, r[5], r[6], r[7] || null, r[8] || null,
      r[9] || null, r[10] || null, list(r[11]), list(r[12]), licenceClass(r, sources), r[14] ?? null, ensembleOf(r[5]) || null,
      key ? (analyses.works[key] ?? null) : null, mu ? JSON.stringify({ midi: mu[8], pdf: mu[9] }) : null,
    );
    for (const c of catalogIds(idText(r), r[4])) insId.run(id, c);
    const insts = new Set(r[11] ?? []);
    for (const inst of insts) insInst.run(id, inst);
    if ([...insts].some((x) => VOICES.has(x))) insInst.run(id, "voice");
    insFts.run(id, r[3], r[4], extraText(r, sources));
  });
  for (const [k, s] of Object.entries(sources)) db.prepare(`INSERT INTO sources VALUES (?, ?)`).run(k, JSON.stringify(s));
  const meta: Record<string, string> = { built: new Date().toISOString().slice(0, 10), works: String(rows.length), analyses_sha: analyses.sha };
  for (const [k, v] of Object.entries(meta)) db.prepare(`INSERT INTO meta VALUES (?, ?)`).run(k, v);
  db.exec("COMMIT");
  db.exec(`
    CREATE INDEX works_source ON works (source);
    CREATE INDEX works_composer ON works (composer, id);
    CREATE INDEX works_era ON works (era);
    CREATE INDEX work_ids_id ON work_ids (id, work);
    CREATE INDEX work_instruments_inst ON work_instruments (instrument, work);
    INSERT INTO works_fts (works_fts) VALUES ('optimize');
    VACUUM;
  `);
  db.close();
  // each Library work's editions in other sources, for the page (small; fetched with the Library)
  writeFileSync(join(dirname(path), "siblings.json"), JSON.stringify(Object.fromEntries(siblingsOf(rows))));
  return { works: rows.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = Date.now();
  const { works } = build();
  console.log(`${works} works → ${DB_PATH} (${Math.round(readFileSync(DB_PATH).length / 1e6)} MB, ${((Date.now() - t) / 1000).toFixed(1)} s)`);
}
