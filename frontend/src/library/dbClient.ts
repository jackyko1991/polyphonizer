/**
 * The Library's catalogue database in the page: library.sqlite, read with sql.js-httpvfs over HTTP range requests
 * (only the pages a query needs, a few kB to a few hundred), in a worker. Opened on first use.
 */
import { createDbWorker } from "sql.js-httpvfs";
import workerUrl from "sql.js-httpvfs/dist/sqlite.worker.js?url";
import wasmUrl from "sql.js-httpvfs/dist/sql-wasm.wasm?url";
import type { Sql } from "./db.ts";

let opening: Promise<Sql> | null = null;

export function catalogueDb(): Promise<Sql> {
  opening ??= createDbWorker(
    [{ from: "inline", config: { serverMode: "full", url: new URL(`${import.meta.env.BASE_URL}library/library.sqlite`, location.href).href, requestChunkSize: 4096 } }],
    new URL(workerUrl, location.href).href,
    new URL(wasmUrl, location.href).href,
  ).then((w) => ({ query: <T,>(sql: string, params: (string | number)[] = []) => w.db.query(sql, params) as Promise<T[]> }));
  // (a failure is not kept: the next use tries again)
  opening.catch(() => (opening = null));
  return opening;
}
