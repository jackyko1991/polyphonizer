/**
 * The score editor (#/editor): the project's Python files on the left (main.py sets `score`; other files are modules
 * it imports), the score on the right. Imported files (MusicXML, MIDI …) are kept in this browser and read with
 * load("name"). The score panel shows the full score or one player's part, continuous or on pages chosen in Page setup, with
 * the player's own layout (bars per line, forced breaks) and page turns moved to rests.
 */
import { Download, GitFork, PanelLeft, Pencil, RefreshCw, RotateCcw, Save, X } from "lucide-react";
import { Icon } from "./Button.tsx";
import { go, useLang } from "@learnkit/web";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import CodePane from "./CodePane.tsx";
import { EXAMPLES } from "./examples.ts";
import { addFile, barText, bootPython, runScore, usePythonStage, type PyError, type PyModule } from "./engine/python.ts";
import type { ScoreData } from "./engine/types.ts";
import { OWN_SCORE_LIMIT, currentTier } from "./account.ts";
import { addRecent, MAIN, newFileName, recentScores, validName, zip, type Project } from "./project.ts";
import { setupFor, writeSetup, type PageSetup } from "./engine/pageSetup.ts";
import {
  currentProject,
  deleteOwn,
  forkCurrent,
  freshProject,
  loadWorkspace,
  openSample,
  ownChanged,
  renameOwn,
  resetSample,
  saveOwn,
  saveWorkspace,
  setOwn,
  withCurrent,
  type Workspace,
} from "./workspace.ts";
import { locateNote, type CodeSpot } from "./codeLocate.ts";
import ScoreTree, { type TreePick } from "./ScoreTree.tsx";
import ScoreView from "./ScoreView.tsx";
import { engravePages, midiFile } from "./engine/engrave.ts";
import ExportMenu, { type ExportActions } from "./ExportMenu.tsx";
import MaterialsTree, { type MaterialActions, type Upload } from "./MaterialsTree.tsx";
import { addFolder, addMaterial, allFolders, baseName, idsIn, moveItem, removeItem, renameItem, treeOf, type Material } from "./materials.ts";
import { getBlob, newId, putBlob, readWithProgress, sweep } from "./materialStore.ts";
import { download, fileStem, musicxmlOf, printPages, projectEntries } from "./exporting.ts";
import { licenceOf, loadDefaultRights, rightsFor, rightsLine, saveDefaultRights, type Rights } from "./licences.ts";
import { lilypondText } from "./engine/python.ts";
import type { ShareFile, SiteId } from "./share/sites.ts";
import { fill } from "./strings.ts";
import { fileKind, importCode, type FileKind } from "./library/elsewhere.ts";
import { jobKind } from "./transcribe/routes.ts";
import { publishScore, publishSelection, registerApplier } from "./agent/bus.ts";

const TranscribeDialog = lazy(() => import("./transcribe/TranscribeDialog.tsx"));
const ShareDialog = lazy(() => import("./share/ShareDialog.tsx"));
const LicenceDialog = lazy(() => import("./LicenceDialog.tsx"));
import { BUTTON, FIELD, PRIMARY } from "./ui.ts";

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

/** Python's state: a dot and its text; `compact` shows the text only in the tooltip (and on wide screens) */
export function PyStatus({ compact = false }: { compact?: boolean }) {
  const { t } = useLang();
  const stage = usePythonStage();
  const colour = stage === "ready" ? "bg-emerald-500" : stage === "idle" ? "bg-gray-400" : "animate-pulse bg-amber-500";
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs text-gray-600" data-testid="py-status" title={t(`py.${stage}`)}>
      <span className={`h-2 w-2 rounded-full ${colour}`} />
      <span className={compact ? "hidden 2xl:inline" : ""}>{t(`py.${stage}`)}</span>
    </span>
  );
}

export function ErrorBox({ error }: { error: PyError | null }) {
  const { t } = useLang();
  if (!error) return null;
  return (
    <p className="border-t border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800" data-testid="py-error">
      {error.line !== null && (
        <b>
          {error.file ? `${error.file}, ` : ""}
          {fill(t("error.line"), { line: error.line })}:{" "}
        </b>
      )}
      {error.message}
      {/No such file|FileNotFound|does not exist/i.test(error.message) && <span className="block font-sans">{t("file.missing")}</span>}
    </p>
  );
}

/** main.py of a new, empty score of one's own */
const NEW_SCORE = `# My score: write the parts, then set score.
melody = tiny("c4 d e f g2 g", name="Violin", inst="violin")
score = together(melody, title="My score")
`;

export default function EditorPage() {
  const { t } = useLang();
  // the scores (workspace.ts): one of the visitor's own, and samples edited in scratch copies
  const [ws, setWs] = useState<Workspace>(() => loadWorkspace());
  const wsRef = useRef(ws);
  wsRef.current = ws;
  const project = currentProject(ws) ?? freshProject(EXAMPLES[0].code);
  /** change the project being edited (it goes back into the own score or the sample's scratch copy) */
  const setProject = (u: Project | ((p: Project) => Project)) => {
    const cur = currentProject(wsRef.current) ?? freshProject(EXAMPLES[0].code);
    const w = withCurrent(wsRef.current, typeof u === "function" ? u(cur) : u);
    wsRef.current = w;
    setWs(w);
  };
  /** a "one score of your own" decision waiting for the visitor: replace (after exporting) or cancel */
  const [pending, setPending] = useState<{ kind: "new" | "import" | "fork"; apply: () => void } | null>(null);
  // the score explorer (left), open or a rail; remembered
  const [treeOpen, setTreeOpen] = useState(() => {
    try {
      return localStorage.getItem("polyphonizer.tree") === "open";
    } catch {
      return false;
    }
  });
  const setTree = (open: boolean) => {
    setTreeOpen(open);
    try {
      localStorage.setItem("polyphonizer.tree", open ? "open" : "closed");
    } catch {
      /* storage unavailable */
    }
  };
  const [editingName, setEditingName] = useState(false);
  // phones and tablets show the score or the code (the score first: reading and playing)
  const [mobileView, setMobileView] = useState<"score" | "code">("score");
  const [score, setScore] = useState<ScoreData | null>(null);
  const [sheet, setSheet] = useState<ScoreData | null>(null);
  const [part, setPart] = useState<number | null>(null);
  const [error, setError] = useState<PyError | null>(null);
  const [running, setRunning] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const projectRef = useRef(project);
  projectRef.current = project;
  const partRef = useRef(part);
  partRef.current = part;
  useEffect(() => saveWorkspace(ws), [ws]);
  // the code as it was last run without error: the Run button shows a dot when the code has changed since
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const saveKey = isMac ? "⌘S" : "Ctrl+S";

  const active = project.files.find((f) => f.name === project.active) ?? project.files[0];
  const modules = (p: Project): PyModule[] => p.files.slice(1);
  // the ref changes at once, so a Run straight after typing runs what was typed
  const setCode = (name: string, code: string) => {
    const next = { ...projectRef.current, files: projectRef.current.files.map((f) => (f.name === name ? { ...f, code } : f)) };
    projectRef.current = next;
    setProject(next);
  };

  // each sheet request gets a number; an answer that is no longer the latest request is dropped, so the score
  // never shows one part while the picker names another
  const sheetReq = useRef(0);
  const loadSheet = useCallback(async (p: Project, which: number | null, nParts: number) => {
    const req = ++sheetReq.current;
    setSheet(null);
    if (which === null || which >= nParts) return;
    const s = await runScore(p.files[0].code, which, modules(p));
    if (req === sheetReq.current) setSheet(s);
  }, []);

  const run = useCallback(
    async (p: Project = projectRef.current, which: number | null = partRef.current) => {
      setRunning(true);
      try {
        const full = await runScore(p.files[0].code, null, modules(p));
        setScore(full);
        setLastRun(JSON.stringify(p.files));
        await loadSheet(p, which, full.parts.length);
        setError(null);
      } catch (e) {
        setError(e as PyError);
      } finally {
        setRunning(false);
      }
    },
    [loadSheet],
  );

  // Ctrl/⌘+S anywhere on the page: save (the project is saved on every change; this saves at once) and run
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const w = wsRef.current.current.kind === "own" ? saveOwn(wsRef.current) : wsRef.current;
        wsRef.current = w;
        setWs(w);
        saveWorkspace(w);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1500);
        void run();
      }
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setTreeOpen((o) => {
          try {
            localStorage.setItem("polyphonizer.tree", o ? "closed" : "open");
          } catch {
            /* storage unavailable */
          }
          return !o;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  // restore imported files, then run once Python is ready
  useEffect(() => {
    void (async () => {
      for (const [name, b64] of Object.entries(savedFiles())) await addFile(name, fromB64(b64));
      await bootPython();
      await run();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choosePart = (which: number | null) => {
    setPart(which);
    loadSheet(projectRef.current, which, score?.parts.length ?? 0).catch((e) => setError(e as PyError));
  };
  /** show another score (own or a sample) and compile it */
  const switchTo = (w: Workspace) => {
    wsRef.current = w;
    setWs(w);
    setPart(null);
    const p = currentProject(w);
    if (p) {
      projectRef.current = p;
      void run(p, null);
    }
  };
  /** open a sample: an example or a recent library piece, in its scratch copy */
  const openSampleScore = (key: string, label: string, code: string) => switchTo(openSample(wsRef.current, key, label, code));
  /** make something the visitor's own score; when the slot is taken, ask first (replace after exporting) */
  const makeOwn = (attempt: (replace: boolean) => ReturnType<typeof setOwn>, kind: "new" | "import" | "fork") => {
    const r = attempt(false);
    if (r.ok) return switchTo(r.ws);
    setPending({
      kind,
      apply: () => {
        const again = attempt(true);
        if (again.ok) switchTo(again.ws);
      },
    });
  };
  const limit = OWN_SCORE_LIMIT[currentTier()];
  const switchName = (name: string) => {
    const w = renameOwn(wsRef.current, name);
    wsRef.current = w;
    setWs(w);
  };
  /** 💾: a deliberate save point of the own score (the working copy saves itself all the time) */
  const saveNow = () => {
    const w = saveOwn(wsRef.current);
    wsRef.current = w;
    setWs(w);
    saveWorkspace(w);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };
  const pickFromTree = (p: TreePick) => {
    if (p.kind === "library") return go("library");
    if (p.kind === "own") return switchTo({ ...wsRef.current, current: { kind: "own" } });
    if (p.kind === "recent") {
      const r = recentScores()[p.index];
      if (r) openSampleScore(`recent:${r.label}`, r.label, r.code);
      return;
    }
    const ex = EXAMPLES.find((x) => x.id === p.id);
    if (ex) openSampleScore(`ex:${ex.id}`, ex.title[0], ex.code);
  };
  const isSample = ws.current.kind === "sample";
  const sample = ws.current.kind === "sample" ? ws.samples[ws.current.key] : null;

  // a file that is not a score (a PDF, a recording, anything else): what to do with it instead
  const [importNote, setImportNote] = useState<{ name: string; kind: FileKind; file?: File } | null>(null);
  // the Transcribe dialog, with the file that brought it up (if any)
  const [transcribe, setTranscribe] = useState<{ file: File | null } | null>(null);
  /** keep a file's bytes in this browser; the material to list (in a project's files) */
  // files being added: shown in their folder with a progress circle until they are stored
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const keep = async (f: File | Blob, name: string, onProgress?: (done: number) => void): Promise<Omit<Material, "path"> & { name: string }> => {
    const id = newId();
    // read it (the progress a learner sees), then store it in this browser
    const bytes = await readWithProgress(f, (x) => onProgress?.(x * 0.9));
    await putBlob(id, new Blob([bytes], { type: f.type }));
    onProgress?.(1);
    return { id, name, type: f.type || "application/octet-stream", size: f.size, added: Date.now() };
  };
  /** files from the computer into the open project's files (a folder of them, "" = the top), each listed once stored */
  const keepFiles = async (files: File[], folder = "") => {
    setUploadError(null);
    const batch = files.map((f) => ({ key: newId(), folder, name: f.name, done: 0 }));
    setUploads((u) => [...u, ...batch]);
    await Promise.all(
      files.map(async (f, i) => {
        const key = batch[i].key;
        try {
          const m = await keep(f, f.name, (done) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, done } : x))));
          const p = addMaterial(projectRef.current, m, folder);
          projectRef.current = p;
          setProject(p);
        } catch (e) {
          setUploadError(`${f.name}: ${(e as Error)?.message ?? e}`);
        } finally {
          setUploads((u) => u.filter((x) => x.key !== key));
        }
      }),
    );
  };
  const onFile = async (f: File) => {
    const kind = fileKind(f.name, f.type);
    // a PDF, a recording, anything not a score: kept with the open score, and what it can become
    if (kind !== "score") {
      await keepFiles([f]);
      return setImportNote({ name: f.name, kind, file: jobKind(f.name, f.type) ? f : undefined });
    }
    setImportNote(null);
    const bytes = new Uint8Array(await f.arrayBuffer());
    const name = f.name.replace(/[^\w.\- ]+/g, "_");
    await addFile(name, bytes);
    if (bytes.length < 3_000_000) write(FILES_KEY, JSON.stringify({ ...savedFiles(), [name]: toB64(bytes) }));
    const code = importCode(name);
    addRecent({ label: name, code });
    // an imported file becomes the visitor's own score, the file kept with it
    const fresh = addMaterial(freshProject(code), await keep(f, name));
    makeOwn((replace) => setOwn(wsRef.current, fresh, name, replace), "import");
  };

  // project files
  const addPyFile = () => {
    const name = newFileName(project.files);
    setProject((p) => ({ ...p, files: [...p.files, { name, code: "# A module: define parts, motifs or functions here, then import them in main.py\n# (from <this file's name without .py> import …)\n" }], active: name }));
    setRenaming(name);
  };
  const rename = (from: string, to: string) => {
    setRenaming(null);
    const name = to.endsWith(".py") ? to : `${to}.py`;
    if (name === from || !validName(name) || project.files.some((f) => f.name === name)) return;
    setProject((p) => ({ ...p, active: p.active === from ? name : p.active, files: p.files.map((f) => (f.name === from ? { ...f, name } : f)) }));
  };
  const remove = (name: string) =>
    setProject((p) => ({ ...p, active: p.active === name ? MAIN : p.active, files: p.files.filter((f) => f.name !== name) }));
  const exportCode = () => {
    const p = projectRef.current;
    const title = fileStem(projectTitle());
    if (p.files.length === 1) download(`${title}.py`, p.files[0].code, "text/x-python");
    else download(`${title}.zip`, zip(p.files) as BlobPart, "application/zip");
  };

  /** write (or rewrite) the edit_bar line for this part and bar in main.py, then run */
  const editBar = (partName: string, bar: number, text: string) => {
    const line = `edit_bar(score, ${JSON.stringify(partName)}, ${bar}, ${JSON.stringify(text)})`;
    const same = new RegExp(`^edit_bar\\(score, ${JSON.stringify(partName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}, ${bar}, .*\\)[ \\t]*$`, "m");
    const code = projectRef.current.files[0].code;
    const next = same.test(code) ? code.replace(same, () => line) : `${code.replace(/\s*$/, "")}\n${line}\n`;
    setCode(MAIN, next);
    void run();
  };

  // the AI agent (agent/): the score on screen goes to its panel, which keeps it after the editor closes; the agent's
  // changes come back through the applier (the learner pressed Apply or Undo), then the score runs
  const shownTitle = (ws.current.kind === "own" ? ws.ownLabel : "") || score?.title || "score";
  useEffect(() => {
    publishScore({
      title: shownTitle,
      files: project.files.map((f) => ({ name: f.name, code: f.code })),
      active: project.active,
      error: error ? `${error.file ?? MAIN}${error.line !== null ? `, line ${error.line}` : ""}: ${error.message}` : undefined,
    });
  }, [project.files, project.active, shownTitle, error]);
  useEffect(
    () =>
      registerApplier((files, removed) => {
        const p = projectRef.current;
        const kept = p.files.filter((f) => f.name === MAIN || !removed.includes(f.name)).map((f) => (f.name in files ? { ...f, code: files[f.name] } : f));
        const added = Object.entries(files)
          .filter(([n]) => !p.files.some((f) => f.name === n))
          .map(([name, code]) => ({ name, code }));
        const next = { ...p, files: [...kept, ...added], active: kept.some((f) => f.name === p.active) ? p.active : MAIN };
        projectRef.current = next;
        setProject(next);
        void run(next);
      }),
    [run],
  );

  // click a note → its code: open its file, select it and scroll to it (the editor view comes from CodePane)
  const editorView = useRef<EditorView | null>(null);
  const [pendingSpot, setPendingSpot] = useState<CodeSpot | null>(null);
  const [noteInfo, setNoteInfo] = useState<string | null>(null);
  const showCode = (spot: CodeSpot) => {
    const v = editorView.current;
    if (!v || spot.to > v.state.doc.length) return;
    v.dispatch({ selection: EditorSelection.single(spot.from, spot.to), effects: EditorView.scrollIntoView(spot.from, { y: "center" }) });
    v.focus();
  };
  useEffect(() => {
    if (pendingSpot && pendingSpot.file === active.name) {
      // the file's editor has just opened: select once it shows the file
      const id = window.setTimeout(() => (showCode(pendingSpot), setPendingSpot(null)), 60);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSpot, active.name]);
  const onNoteClick = (n: { part: string; partIndex: number; bar: number; index: number }) => {
    // the clicked note's bar can go to the AI agent with the next message
    publishSelection({ bars: { part: n.part, from: n.bar } });
    const spot = locateNote(projectRef.current.files, n.part, n.partIndex, n.bar, n.index);
    setNoteInfo(spot?.kind === "token" ? null : fill(t("click.where"), { part: n.part, bar: n.bar }));
    if (!spot) return;
    if (spot.file === projectRef.current.active) showCode(spot);
    else {
      setProject((p) => ({ ...p, active: spot.file }));
      setPendingSpot(spot);
    }
  };

  // the layout of the sheet on show
  // the sheet's page setup lives in main.py as pages(...): read it from the compiled score; a change in the Pages
  // view rewrites that line and compiles (the new value shows at once, until the compile comes back)
  const sheetName = part === null ? null : (score?.parts[part] ?? null);
  const [pendingSetup, setPendingSetup] = useState<PageSetup | null>(null);
  useEffect(() => setPendingSetup(null), [score, sheet]);
  const setup = pendingSetup && pendingSetup.part === sheetName ? pendingSetup : setupFor((part !== null ? sheet : score)?.layouts, sheetName);
  const changeSetup = (s: PageSetup) => {
    const next = { ...s, part: sheetName };
    setPendingSetup(next);
    setCode(MAIN, writeSetup(projectRef.current.files[0].code, next));
    void run();
  };

  // ── export, the same from the score panel and from My scores (ExportMenu, exporting.ts) ──
  const [defaultRights, setDefaultRights] = useState<Rights | null>(loadDefaultRights);
  const rights = rightsFor(project, defaultRights);
  const [licenceOpen, setLicenceOpen] = useState(false);
  const [share, setShare] = useState<SiteId | null>(null);
  /** the sheet on show (the full score, or one player's part) */
  const shown = part !== null ? sheet : score;
  const projectTitle = () => (wsRef.current.current.kind === "own" ? wsRef.current.ownLabel : "") || score?.title || "score";
  const bytesOf = async (id: string) => {
    const b = await getBlob(id).catch(() => undefined);
    return b ? new Uint8Array(await b.arrayBuffer()) : null;
  };
  /** a project as a .zip; the score's files only when they were compiled from it as it is */
  const zipProject = async (p: Project, title: string) => {
    const compiled = score && lastRun === JSON.stringify(p.files) ? score : null;
    const entries = await projectEntries(p, { title, score: compiled, midi: compiled ? await midiFile().catch(() => null) : null, rights: rightsFor(p, defaultRights), bytes: bytesOf });
    download(`${fileStem(title)}.zip`, zip(entries) as BlobPart, "application/zip");
  };
  /** the own score as a .zip, open or not (before it is replaced or deleted) */
  const zipOwn = () => ws.own && void zipProject(ws.own, ws.ownLabel || "my-score");
  const printShown = async () => {
    if (!shown) return;
    printPages((await engravePages(shown, setup)).pages, shown.title, {
      numbers: setup.page_numbers,
      size: [setup.width_mm, setup.height_mm],
      footer: rights ? rightsLine(rights) : "",
    });
  };
  const exportActions: ExportActions = {
    ready: !!shown,
    musicxml: () => shown && download(`${fileStem(shown.title)}.musicxml`, musicxmlOf(shown, rights), "application/vnd.recordare.musicxml+xml"),
    midi: async () => {
      if (shown) download(`${fileStem(shown.title)}.mid`, (await midiFile()) as BlobPart, "audio/midi");
    },
    print: printShown,
    zip: () => zipProject(projectRef.current, projectTitle()),
    code: exportCode,
    licence: () => setLicenceOpen(true),
    licenceName: rights ? (licenceOf(rights.licence)?.name[0].replace(/ \(.*\)$/, "") ?? "") : "",
    site: (id) => setShare(id),
  };
  const shareFile = async (kind: ShareFile, header?: Record<string, string>) => {
    if (!shown) return;
    const stem = fileStem(shown.title);
    if (kind === "musicxml") exportActions.musicxml();
    else if (kind === "midi") await exportActions.midi();
    else if (kind === "pdf") await printShown();
    else download(`${stem}.ly`, await lilypondText({ ...(header ?? {}), ...(rights ? { copyright: rightsLine(rights) } : {}) }), "text/x-lilypond");
  };

  // ── the open project's files (materials.ts), under it in the score explorer ──
  // bytes no project lists any more (a deleted score, a removed file) are cleared once the editor opens
  useEffect(() => {
    const w = wsRef.current;
    void sweep(idsIn([w.own, w.ownSaved?.project, ...Object.values(w.samples).map((x) => x.project)])).catch(() => 0);
  }, []);
  const [newFolderAt, setNewFolderAt] = useState<string | null>(null);
  const materialActions: MaterialActions = {
    open: async (m) => {
      const b = await getBlob(m.id).catch(() => undefined);
      if (!b) return;
      const kind = fileKind(m.path, m.type);
      if (kind === "score") return void onFile(new File([b], baseName(m.path), { type: m.type }));
      const url = URL.createObjectURL(b);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    download: async (m) => {
      const b = await getBlob(m.id).catch(() => undefined);
      if (b) download(baseName(m.path), b, m.type);
    },
    transcribe: async (m) => {
      const b = await getBlob(m.id).catch(() => undefined);
      if (b) setTranscribe({ file: new File([b], baseName(m.path), { type: m.type }) });
    },
    rename: (path, name) => setProject((p) => renameItem(p, path, name)),
    move: (path, folder) => setProject((p) => moveItem(p, path, folder)),
    remove: (path) => {
      setProject((p) => removeItem(p, path).project);
      const w = wsRef.current;
      void sweep(idsIn([w.own, w.ownSaved?.project, ...Object.values(w.samples).map((x) => x.project)])).catch(() => 0);
    },
    add: (files, folder) => void keepFiles(files, folder),
    pick: (folder) => {
      addInto.current = folder;
      attachInput.current?.click();
    },
  };
  // Add files: the file picker, into the folder it was asked from
  const attachInput = useRef<HTMLInputElement>(null);
  const addInto = useRef("");
  const newFolder = () => {
    const { project: p, path } = addFolder(projectRef.current, t("tree.newFolderName"));
    projectRef.current = p;
    setProject(p);
    setNewFolderAt(path);
  };
  const materialsTree = <MaterialsTree uploads={uploads} error={uploadError} nodes={treeOf(project)} folders={allFolders(project)} actions={materialActions} startRename={newFolderAt} onRenameStarted={() => setNewFolderAt(null)} addable={ws.current.kind === "own"} />;

  const errorHere = error && (error.file ?? MAIN) === active.name ? error.line : null;
  return (
    <div
      className="relative flex h-[calc(100dvh-var(--pz-dock,0px)-8.75rem)] min-h-[24rem] flex-col lg:grid lg:h-full lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      data-testid="editor-page"
    >
      {transcribe && (
        <Suspense fallback={null}>
          <TranscribeDialog file={transcribe.file} onDone={(f) => void onFile(f)} onClose={() => setTranscribe(null)} />
        </Suspense>
      )}
      {share && shown && (
        <Suspense fallback={null}>
          <ShareDialog site={share} score={shown} code={projectRef.current.files[0].code} rights={rights} onFile={shareFile} onClose={() => setShare(null)} />
        </Suspense>
      )}
      {licenceOpen && (
        <Suspense fallback={null}>
          <LicenceDialog
            own={{ licence: project.licence, holder: project.holder }}
            fallback={defaultRights}
            onSave={(own, makeDefault) => {
              setProject((p) => ({ ...p, licence: own.licence, holder: own.holder }));
              if (makeDefault && own.licence) {
                const d = { licence: own.licence, holder: own.holder ?? "" };
                saveDefaultRights(d);
                setDefaultRights(d);
              }
            }}
            onClose={() => setLicenceOpen(false)}
          />
        </Suspense>
      )}
      {importNote && (
        <div className="absolute top-12 left-1/2 z-40 w-[min(32rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 shadow-lg" role="status" data-testid="import-note">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1">
              <b className="break-all">{importNote.name}</b>: {t(`import.${importNote.kind}`)} {t("import.kept")}
              {importNote.file && (
                <button
                  onClick={() => (setTranscribe({ file: importNote.file! }), setImportNote(null))}
                  className="mt-2 block rounded-md bg-(--lk-accent) px-3 py-1 text-sm font-medium text-white hover:opacity-90"
                  data-testid="import-transcribe"
                >
                  {t("tree.transcribe")}…
                </button>
              )}
            </p>
            <button onClick={() => setImportNote(null)} className="shrink-0 rounded p-0.5 text-amber-700 hover:bg-amber-100" aria-label={t("sound.close")}>
              <Icon icon={X} />
            </button>
          </div>
        </div>
      )}
      {/* phones and tablets: one panel at a time */}
      <div className="flex shrink-0 border-b border-gray-200 bg-white lg:hidden" role="tablist" data-testid="editor-mobile-tabs">
        {/* the scores list, from either tab */}
        <button
          type="button"
          onClick={() => setTree(!treeOpen)}
          className="flex w-11 shrink-0 items-center justify-center border-r border-b-2 border-r-gray-200 border-b-transparent text-gray-500 hover:text-gray-800"
          title={t(treeOpen ? "tree.close" : "tree.open")}
          aria-label={t(treeOpen ? "tree.close" : "tree.open")}
          aria-expanded={treeOpen}
          data-testid="tree-toggle-mobile"
        >
          <Icon icon={PanelLeft} />
        </button>
        {(["score", "code"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={mobileView === v}
            onClick={() => setMobileView(v)}
            className={`flex-1 border-b-2 py-2 text-sm font-medium ${mobileView === v ? "border-(--lk-accent) text-(--lk-accent)" : "border-transparent text-gray-500"}`}
          >
            {v === "score" ? t("mtab.score") : t("mtab.code")}
          </button>
        ))}
      </div>
      <section className={`min-h-0 flex-1 border-r border-gray-200 bg-white lg:flex lg:min-h-[22rem] lg:flex-none ${
          // on the Score tab this panel folds to nothing (the scores drawer, fixed, can still open from it)
          mobileView === "code" ? "flex" : "flex max-lg:h-0 max-lg:min-h-0 max-lg:flex-none max-lg:overflow-hidden max-lg:border-0"
        }`}>
        {/* the score explorer (a drawer on phones); closed, nothing: the toolbar's panel button or ⌘B opens it */}
        {treeOpen && <div className="fixed inset-0 z-[66] bg-black/20 lg:hidden" onClick={() => setTree(false)} aria-hidden />}
        <div
          className={`${treeOpen ? "fixed inset-y-0 left-0 z-[67] w-64 shadow-xl lg:static lg:z-auto lg:w-60 lg:shadow-none" : "hidden"} flex shrink-0 flex-col border-r border-gray-200 bg-gray-50`}
        >
          {treeOpen ? (
            <ScoreTree
              ws={ws}
              limit={limit}
              recents={recentScores()}
              onPick={pickFromTree}
              onNew={() => makeOwn((replace) => setOwn(wsRef.current, freshProject(NEW_SCORE), t("ws.newLabel"), replace), "new")}
              onImport={() => fileInput.current?.click()}
              onTranscribe={() => setTranscribe({ file: null })}
              onRename={(name) => switchName(name)}
              exportMenu={<ExportMenu actions={exportActions} variant="icon" align="left" onOpen={() => ws.current.kind !== "own" && pickFromTree({ kind: "own" })} />}
              onExportZip={zipOwn}
              onNewFolder={newFolder}
              materials={materialsTree}
              onDelete={() => switchTo(deleteOwn(wsRef.current))}
            />
          ) : null}
        </div>
        <input
          ref={attachInput}
          type="file"
          multiple
          className="hidden"
          data-testid="attach-input"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            if (files.length) void keepFiles(files, addInto.current);
          }}
        />
        <input
          ref={fileInput}
          type="file"
          hidden
          // scores open; a PDF or a recording is taken too, to say how it can become notes
          accept=".musicxml,.xml,.mxl,.mid,.midi,.abc,.krn,.mei,.pdf,image/*,audio/*,video/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
        {/* actions on the open score */}
        <div className="relative flex items-center gap-1.5 border-b border-gray-200 px-2 py-1.5">
          <button onClick={() => setTree(!treeOpen)} className={`${BUTTON} w-9 justify-center px-0 max-lg:hidden`} title={`${t(treeOpen ? "tree.close" : "tree.open")} (${isMac ? "⌘" : "Ctrl+"}B)`} aria-label={t(treeOpen ? "tree.close" : "tree.open")} aria-expanded={treeOpen} data-testid="tree-toggle">
            <Icon icon={PanelLeft} />
          </button>
          {isSample ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-medium text-gray-800" title={sample?.label} data-testid="score-name">
                {sample?.label}
              </span>
              <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800" title={t("ws.sampleHint")} data-testid="sample-badge">
                {ws.current.kind === "sample" && (ws.current.key.startsWith("ex:") ? t("ws.sample") : t("page.library"))}
              </span>
              <button
                onClick={() => ws.current.kind === "sample" && switchTo(resetSample(wsRef.current, ws.current.key))}
                className="shrink-0 rounded px-1 text-gray-400 hover:text-gray-700"
                title={t("ws.reset")}
                aria-label={t("ws.reset")}
              >
                <Icon icon={RotateCcw} />
              </button>
            </span>
          ) : editingName ? (
            <input
              autoFocus
              defaultValue={ws.ownLabel || t("ws.newLabel")}
              onBlur={(e) => (switchName(e.target.value), setEditingName(false))}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingName(false);
              }}
              className={`${FIELD} min-w-0 flex-1`}
              aria-label={t("tree.rename")}
              data-testid="score-name-input"
            />
          ) : (
            <button onClick={() => setEditingName(true)} className="min-w-0 truncate rounded px-1 text-left text-sm font-medium text-gray-800 hover:bg-gray-100" title={t("tree.rename")} data-testid="score-name">
              {ws.ownLabel || t("ws.newLabel")} <Icon icon={Pencil} className="ml-1 inline h-3.5 w-3.5 text-gray-400" />
            </button>
          )}
          <span className="ml-auto" />
          {saved && <span className="shrink-0 text-xs text-emerald-700" data-testid="saved">✓ {t("run.saved")}</span>}
          {isSample && (
            <button onClick={() => makeOwn((replace) => forkCurrent(wsRef.current, replace), "fork")} className={BUTTON} title={t("ws.forkHint")} data-testid="fork">
              <Icon icon={GitFork} />
              <span className="hidden xl:inline">{t("ws.fork")}</span>
            </button>
          )}
          {!isSample && (
            <button onClick={saveNow} disabled={!ownChanged(ws)} className={BUTTON} title={t("ws.save")} data-testid="save">
              <Icon icon={Save} />
              <span className="hidden xl:inline">{t("ws.saveShort")}</span>
            </button>
          )}
          <PyStatus compact />
          <button
            onClick={() => {
              void run();
              setMobileView("score");
            }}
            disabled={running}
            className={PRIMARY}
            data-testid="run"
            title={fill(t("run.title"), { key: saveKey })}
          >
            <Icon icon={RefreshCw} className={running ? "animate-spin" : ""} /> {running ? t("running") : t("run")}
            <span className="ml-1 hidden text-[11px] font-normal opacity-80 sm:inline">{saveKey}</span>
            {lastRun !== null && lastRun !== JSON.stringify(project.files) && !running && (
              <span className="ml-1 inline-block h-2 w-2 rounded-full bg-amber-300 align-middle" title={t("run.changed")} data-testid="unrun" />
            )}
          </button>
          {pending && (
            <div className="absolute top-full right-2 z-30 mt-1 w-80 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 shadow-lg" role="alertdialog" data-testid="own-limit">
              <p>{t("ws.full")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ws.own && (
                  <button onClick={zipOwn} className={BUTTON}>
                    <Icon icon={Download} /> {t("ws.export")}
                  </button>
                )}
                <button
                  onClick={() => {
                    pending.apply();
                    setPending(null);
                  }}
                  className={BUTTON}
                  data-testid="own-confirm"
                >
                  {t("ws.replace")}
                </button>
                <button onClick={() => setPending(null)} className={BUTTON}>
                  {t("edit.cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
        {/* the project's files */}
        <div className="flex shrink-0 items-end gap-1 overflow-x-auto border-b border-gray-200 bg-gray-50 px-2 pt-2" role="tablist" data-testid="file-tabs">
          {project.files.map((f) => (
            <span
              key={f.name}
              className={`flex shrink-0 items-center rounded-t-md border border-b-0 font-mono text-xs ${
                active.name === f.name ? "border-gray-200 bg-white text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {renaming === f.name ? (
                <input
                  autoFocus
                  defaultValue={f.name}
                  onBlur={(e) => rename(f.name, e.target.value.trim())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  className="w-28 bg-white px-2 py-1 outline-none"
                  aria-label={t("files.rename")}
                />
              ) : (
                <button
                  role="tab"
                  aria-selected={active.name === f.name}
                  onClick={() => setProject((p) => ({ ...p, active: f.name }))}
                  onDoubleClick={() => f.name !== MAIN && setRenaming(f.name)}
                  title={f.name === MAIN ? t("files.main") : t("files.module")}
                  className="px-2.5 py-1"
                >
                  {f.name}
                  {error && (error.file ?? MAIN) === f.name && <span className="ml-1 text-red-600">●</span>}
                </button>
              )}
              {f.name !== MAIN && renaming !== f.name && (
                <button onClick={() => remove(f.name)} aria-label={fill(t("files.delete"), { name: f.name })} className="pr-1.5 text-gray-400 hover:text-red-600">
                  <Icon icon={X} className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          ))}
          <button onClick={addPyFile} title={t("files.add")} aria-label={t("files.add")} className="mb-0.5 rounded px-2 py-0.5 text-sm text-gray-500 hover:bg-gray-200 hover:text-gray-800" data-testid="add-file">
            +
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <CodePane
            key={active.name}
            value={active.code}
            onChange={(v) => setCode(active.name, v)}
            onRun={() => void run()}
            errorAt={errorHere}
            main={active.name === MAIN}
            onView={(v) => (editorView.current = v)}
            onSelect={(sel) => publishSelection({ code: sel ? { file: active.name, ...sel } : undefined })}
          />
        </div>
        {noteInfo && (
          <p className="border-t border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-900" data-testid="note-info">
            {noteInfo}
          </p>
        )}
        <ErrorBox error={error} />
        </div>
      </section>
      <section className={`min-h-0 flex-1 lg:block lg:min-h-0 ${mobileView === "score" ? "flex flex-col" : "hidden"}`}>
        <ScoreView
          score={part !== null ? sheet : score}
          part={part}
          onPart={choosePart}
          allParts={score?.parts}
          fullScore={part !== null ? score : null}
          exportMenu={<ExportMenu actions={exportActions} />}
          onPrint={printShown}
          setup={setup}
          onSetup={changeSetup}
          barText={barText}
          onEditBar={editBar}
          onNoteClick={onNoteClick}
        />
      </section>
    </div>
  );
}

