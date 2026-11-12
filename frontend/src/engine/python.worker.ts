/// <reference lib="webworker" />
/**
 * Python in the browser: Pyodide with music21, in a worker so the page never freezes. Pyodide comes from its CDN,
 * music21 from PyPI (both cached by the browser after the first visit). Messages: run code, add an imported file.
 */
import type { PyodideInterface } from "pyodide";
import prelude from "./prelude.py?raw";
import markings from "./markings.py?raw";
import { isAllowedScoreUrl, localPathFor, scoreBytes, scoreUrlsIn } from "../library/scoreSources.ts";

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/";
let ready: Promise<PyodideInterface> | null = null;

function boot(): Promise<PyodideInterface> {
  ready ??= (async () => {
    postMessage({ type: "status", stage: "python" });
    const { loadPyodide } = (await import(/* @vite-ignore */ `${PYODIDE}pyodide.mjs`)) as typeof import("pyodide");
    const py = await loadPyodide({ indexURL: PYODIDE });
    postMessage({ type: "status", stage: "music21" });
    await py.loadPackage("micropip");
    await py.pyimport("micropip").install("music21");
    py.runPython(prelude);
    // playing techniques (bowings, pedal …): the same namespace, after the prelude
    py.runPython(markings);
    py.FS.mkdirTree("/files");
    postMessage({ type: "status", stage: "ready" });
    return py;
  })();
  return ready;
}

/**
 * Keep the useful end of a Python traceback, with the file and line in the user's code: the deepest frame in one of
 * the project's files (main = score.py, the others in /project). Every file starts with two header lines.
 */
function pythonError(e: unknown): { message: string; line: number | null; file: string | null } {
  const text = String((e as Error)?.message ?? e);
  const lines = text.trim().split("\n");
  let line: number | null = null;
  let file: string | null = null;
  for (const l of lines) {
    const m = /File "(score\.py|\/project\/([^"]+))", line (\d+)/.exec(l);
    if (m) {
      file = m[2] ?? null; // null = the main file
      line = Number(m[3]) - 2;
    }
  }
  // a syntax error in an imported file names it on its own line: '  File "/project/x.py", line 3'
  return { message: lines.slice(-1)[0] ?? text, line, file };
}

/**
 * Before running: download the scores the code asks for with fetch_score("…") (allowed collections only; from the
 * browser's cache when it has them) into /files/fetched/, and tell Python where each one is (_FETCHED). A score that
 * can't be downloaded is left out; fetch_score() then says so, at its line.
 */
async function prefetch(py: PyodideInterface, sources: string[]) {
  const fetched = py.globals.get("_FETCHED");
  const urls = [...new Set(sources.flatMap(scoreUrlsIn))].filter((u) => isAllowedScoreUrl(u) && !fetched.has(u));
  if (!urls.length) return;
  py.FS.mkdirTree("/files/fetched");
  await Promise.all(
    urls.map(async (url) => {
      try {
        const [path, bytes] = await Promise.all([localPathFor(url), scoreBytes(url)]);
        py.FS.writeFile(path, bytes);
        fetched.set(url, path);
      } catch {
        /* offline and not cached, or not found: fetch_score() reports it */
      }
    }),
  );
}

onmessage = async (e: MessageEvent) => {
  const { id, kind } = e.data as { id: number; kind: string };
  try {
    const py = await boot();
    let out: string | null = null;
    if (kind === "boot") out = null;
    else if (kind === "file") {
      const { name, bytes } = e.data as { name: string; bytes: Uint8Array };
      py.FS.writeFile(`/files/${name}`, bytes);
    } else if (kind === "run") {
      const { code, part, modules } = e.data as { code: string; part: number | null; modules?: { name: string; code: string }[] };
      await prefetch(py, [code, ...(modules ?? []).map((m) => m.code)]);
      py.globals.get("_set_project")(JSON.stringify(modules ?? []));
      out = py.globals.get("_run")(code, part ?? undefined) as string;
    }
    else if (kind === "bar") {
      const { part, bar } = e.data as { part: string; bar: number };
      out = py.globals.get("_bar_text")(part, bar) as string;
    }
    postMessage({ type: "result", id, ok: true, data: out ? JSON.parse(out) : null });
  } catch (err) {
    postMessage({ type: "result", id, ok: false, error: pythonError(err) });
  }
};
