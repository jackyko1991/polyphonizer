/// <reference lib="webworker" />
/**
 * Python in the browser: Pyodide with music21, in a worker so the page never freezes. Pyodide comes from its CDN,
 * music21 from PyPI (both cached by the browser after the first visit). Messages: run code, add an imported file.
 */
import type { PyodideInterface } from "pyodide";
import prelude from "./prelude.py?raw";

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
    py.FS.mkdirTree("/files");
    postMessage({ type: "status", stage: "ready" });
    return py;
  })();
  return ready;
}

/** keep the useful end of a Python traceback, with line numbers of the user's code */
function pythonError(e: unknown): { message: string; line: number | null } {
  const text = String((e as Error)?.message ?? e);
  const lines = text.trim().split("\n");
  let line: number | null = null;
  for (const l of lines) {
    const m = /File "score\.py", line (\d+)/.exec(l);
    if (m) line = Number(m[1]) - 2; // two prelude import lines come first
  }
  return { message: lines.slice(-1)[0] ?? text, line };
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
      const { code, part } = e.data as { code: string; part: number | null };
      out = py.globals.get("_run")(code, part ?? undefined) as string;
    }
    postMessage({ type: "result", id, ok: true, data: out ? JSON.parse(out) : null });
  } catch (err) {
    postMessage({ type: "result", id, ok: false, error: pythonError(err) });
  }
};
