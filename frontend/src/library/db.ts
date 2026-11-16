/**
 * Queries on the Library's catalogue database (library.sqlite, built by scripts/library-db.ts). Any SQLite will do:
 * the page's reads it over HTTP range requests (sql.js-httpvfs), the tests' is Node's own.
 */

/** something that runs a query and returns its rows */
export interface Sql {
  query<T>(sql: string, params?: (string | number)[]): Promise<T[]>;
}

export interface FoundWork {
  id: number;
  source: string;
  path: string;
  title: string;
  composer: string;
  set_name: string | null;
  era: string | null;
}

/** words typed → an FTS5 query: every word must be there, the last one as a beginning ("erlk" finds Erlkönig) */
export function ftsQuery(words: string[]): string {
  const terms = words.map((w) => w.trim()).filter(Boolean);
  return terms.map((w, i) => `"${w.replace(/"/g, '""')}"${i === terms.length - 1 ? "*" : ""}`).join(" ");
}

/** works whose text has the words (and, if given, from one source or by one composer), in the Library's order */
export async function searchWorks(
  db: Sql,
  o: { words: string[]; source?: string; composer?: string; limit?: number; offset?: number },
): Promise<FoundWork[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (o.words.length) {
    where.push("w.id IN (SELECT rowid FROM works_fts WHERE works_fts MATCH ?)");
    params.push(ftsQuery(o.words));
  }
  if (o.source) {
    where.push("w.source = ?");
    params.push(o.source);
  }
  if (o.composer) {
    where.push("c.name = ?");
    params.push(o.composer);
  }
  if (!where.length) return [];
  params.push(o.limit ?? 50, o.offset ?? 0);
  return db.query<FoundWork>(
    `SELECT w.id, w.source, w.path, w.title, c.name AS composer, w.set_name, w.era
     FROM works w JOIN composers c ON c.id = w.composer
     WHERE ${where.join(" AND ")} ORDER BY w.id LIMIT ? OFFSET ?`,
    params,
  );
}

/** when the database was built and how many works it lists */
export async function catalogueInfo(db: Sql): Promise<{ built: string; works: number }> {
  const rows = await db.query<{ key: string; value: string }>("SELECT key, value FROM meta");
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { built: m.built ?? "", works: Number(m.works ?? 0) };
}
