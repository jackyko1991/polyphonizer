/**
 * The bytes of projects' materials (materials.ts), in this browser's IndexedDB: one record per file, by id. Nothing
 * leaves the browser. Bytes no project lists any more are cleared (sweep), e.g. after a score is deleted.
 */
const DB = "polyphonizer-materials";
const STORE = "files";

let opened: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  opened ??= new Promise((ok, fail) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fail(req.error);
  });
  return opened;
}

function run<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((ok, fail) => {
        const req = f(d.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => ok(req.result);
        req.onerror = () => fail(req.error);
      }),
  );
}

/** a file's bytes, read with progress (0 to 1) */
export function readWithProgress(f: Blob, onProgress: (done: number) => void): Promise<ArrayBuffer> {
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    r.onload = () => (onProgress(1), ok(r.result as ArrayBuffer));
    r.onerror = () => fail(r.error);
    r.readAsArrayBuffer(f);
  });
}

/** a new id for a file */
export const newId = () => (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export const putBlob = (id: string, blob: Blob) => run("readwrite", (s) => s.put(blob, id)).then(() => undefined);
export const getBlob = (id: string) => run<Blob | undefined>("readonly", (s) => s.get(id) as IDBRequest<Blob | undefined>);
export const deleteBlob = (id: string) => run("readwrite", (s) => s.delete(id)).then(() => undefined);

/** clear the bytes no project lists (`keep`: every id still listed) */
export async function sweep(keep: Set<string>): Promise<number> {
  const ids = (await run<IDBValidKey[]>("readonly", (s) => s.getAllKeys())) as string[];
  const gone = ids.filter((id) => !keep.has(id));
  for (const id of gone) await deleteBlob(id);
  return gone.length;
}

/** how much this site may still keep in the browser, if the browser says */
export async function room(): Promise<{ used: number; quota: number } | null> {
  const e = await navigator.storage?.estimate?.().catch(() => null);
  return e?.quota ? { used: e.usage ?? 0, quota: e.quota } : null;
}
