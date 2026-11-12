/**
 * The score editor (#/editor): Python on the left, the score on the right. Imported files (MusicXML, MIDI …) are
 * kept in this browser and read with load("name"). The Pages view lays the score (or one player's part) out on
 * A4 with page turns moved to rests.
 */
import { useLang } from "@learnkit/web";
import { useCallback, useEffect, useRef, useState } from "react";
import CodePane from "./CodePane.tsx";
import { EXAMPLES } from "./examples.ts";
import { addFile, bootPython, runScore, usePythonStage, type PyError } from "./engine/python.ts";
import type { ScoreData } from "./engine/types.ts";
import ScoreView, { type View } from "./ScoreView.tsx";
import { fill } from "./strings.ts";

const CODE_KEY = "polyphonizer.editor.code";
const FILES_KEY = "polyphonizer.editor.files";
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* full or unavailable: the file still works until the tab closes */
  }
};
const toB64 = (b: Uint8Array) => btoa(Array.from(b, (c) => String.fromCharCode(c)).join(""));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** files saved in this browser: name → base64 */
function savedFiles(): Record<string, string> {
  try {
    return JSON.parse(read(FILES_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function PyStatus() {
  const { t } = useLang();
  const stage = usePythonStage();
  const colour = stage === "ready" ? "bg-emerald-500" : stage === "idle" ? "bg-gray-400" : "animate-pulse bg-amber-500";
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-600" data-testid="py-status">
      <span className={`h-2 w-2 rounded-full ${colour}`} />
      {t(`py.${stage}`)}
    </span>
  );
}

export function ErrorBox({ error }: { error: PyError | null }) {
  const { t } = useLang();
  if (!error) return null;
  return (
    <p className="border-t border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800" data-testid="py-error">
      {error.line !== null && <b>{fill(t("error.line"), { line: error.line })}: </b>}
      {error.message}
      {/No such file|FileNotFound|does not exist/i.test(error.message) && <span className="block font-sans">{t("file.missing")}</span>}
    </p>
  );
}

export default function EditorPage() {
  const { t, pick } = useLang();
  const [code, setCode] = useState(() => read(CODE_KEY) ?? EXAMPLES[0].code);
  const [score, setScore] = useState<ScoreData | null>(null);
  const [sheet, setSheet] = useState<ScoreData | null>(null);
  const [part, setPart] = useState<number | null>(null);
  const [view, setView] = useState<View>("score");
  const [error, setError] = useState<PyError | null>(null);
  const [running, setRunning] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const codeRef = useRef(code);
  codeRef.current = code;

  const run = useCallback(async (src = codeRef.current, p: number | null = part) => {
    setRunning(true);
    try {
      const full = await runScore(src);
      setScore(full);
      setSheet(p !== null && p < full.parts.length ? await runScore(src, p) : null);
      setError(null);
    } catch (e) {
      setError(e as PyError);
    } finally {
      setRunning(false);
    }
  }, [part]);

  // restore imported files, then run once Python is ready
  useEffect(() => {
    void (async () => {
      for (const [name, b64] of Object.entries(savedFiles())) await addFile(name, fromB64(b64));
      await bootPython();
      await run();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => write(CODE_KEY, code), [code]);

  const choosePart = (p: number | null) => {
    setPart(p);
    if (p === null) setSheet(null);
    else void runScore(codeRef.current, p).then(setSheet, (e) => setError(e as PyError));
  };

  const onFile = async (f: File) => {
    const bytes = new Uint8Array(await f.arrayBuffer());
    const name = f.name.replace(/[^\w.\- ]+/g, "_");
    await addFile(name, bytes);
    if (bytes.length < 3_000_000) write(FILES_KEY, JSON.stringify({ ...savedFiles(), [name]: toB64(bytes) }));
    const src = `# Imported: ${name}\nscore = load(${JSON.stringify(name)})\n`;
    setCode(src);
    setPart(null);
    void run(src, null);
  };

  const btn = "rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40";
  return (
    <div className="grid lg:h-full lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" data-testid="editor-page">
      <section className="flex min-h-[22rem] flex-col border-r border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-3 py-2">
          <button
            onClick={() => void run()}
            disabled={running}
            className="rounded-md bg-(--lk-accent) px-3 py-1 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            data-testid="run"
            title="Ctrl/⌘+Enter"
          >
            ▶ {running ? t("running") : t("run")}
          </button>
          <button onClick={() => fileInput.current?.click()} className={btn} title={t("import.hint")}>
            ⤓ {t("import")}
          </button>
          <input
            ref={fileInput}
            type="file"
            hidden
            accept=".musicxml,.xml,.mxl,.mid,.midi,.abc,.krn"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
          <select
            value=""
            onChange={(e) => {
              const ex = EXAMPLES.find((x) => x.id === e.target.value);
              if (!ex) return;
              setCode(ex.code);
              setPart(null);
              void run(ex.code, null);
            }}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700"
            aria-label={t("examples")}
          >
            <option value="">{t("examples")} …</option>
            {EXAMPLES.map((x) => (
              <option key={x.id} value={x.id}>
                {pick(x.title)}
              </option>
            ))}
          </select>
          <span className="ml-auto">
            <PyStatus />
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <CodePane value={code} onChange={setCode} onRun={() => void run()} errorAt={error?.line ?? null} />
        </div>
        <ErrorBox error={error} />
      </section>
      <section className="min-h-[28rem] lg:min-h-0">
        <ScoreView
          score={view === "pages" && part !== null ? sheet : score}
          part={part}
          onPart={choosePart}
          allParts={score?.parts}
          code={code}
          view={view}
          onView={setView}
        />
      </section>
    </div>
  );
}
