/**
 * The files kept with a project (materials.ts), under it in the score explorer: folders the learner makes, files
 * dropped or added there. Drag a file or folder onto a folder (or the project) to move it, or drop files from the
 * computer onto one; each has a menu: open, download, rename, move, transcribe (a PDF, photo or recording), delete.
 */
import { useLang } from "@learnkit/web";
import { AudioLines, ChevronRight, File as FileIcon, FileMusic, FileText, Folder, FolderOpen, Image, MoreHorizontal, Video } from "lucide-react";
import { useEffect, useState, type DragEvent, type ReactNode } from "react";
import { Icon } from "./Button.tsx";
import { fileKind } from "./library/elsewhere.ts";
import { sizeText, type Material, type TreeNode } from "./materials.ts";

export interface MaterialActions {
  open: (m: Material) => void;
  download: (m: Material) => void;
  transcribe: (m: Material) => void;
  rename: (path: string, name: string) => void;
  move: (path: string, folder: string) => void;
  remove: (path: string) => void;
  /** files from the computer, into a folder ("" = the project's top) */
  add: (files: File[], folder: string) => void;
  /** the file picker, for a folder */
  pick: (folder: string) => void;
}

/** a file being added: its folder, name and how far along (0 to 1) */
export interface Upload {
  key: string;
  folder: string;
  name: string;
  done: number;
}

/** a progress circle: the ring fills as the file is read and stored, and turns while it waits */
function Progress({ done }: { done: number }) {
  const r = 6;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 shrink-0 ${done < 0.02 ? "animate-spin" : ""}`} role="progressbar" aria-valuenow={Math.round(done * 100)} aria-valuemin={0} aria-valuemax={100} data-testid="upload-progress">
      <circle cx="8" cy="8" r={r} fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke="var(--lk-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(done, 0.25 * Number(done < 0.02)))}
        transform="rotate(-90 8 8)"
        style={{ transition: "stroke-dashoffset 150ms linear" }}
      />
    </svg>
  );
}

const ICON = { score: FileMusic, pdf: FileText, image: Image, audio: AudioLines, video: Video, other: FileIcon } as const;
const DRAG = "application/x-polyphonizer-path";

export default function MaterialsTree({
  uploads = [],
  error,
  nodes,
  folders,
  actions: a,
  startRename,
  onRenameStarted,
  addable = true,
}: {
  /** files being added, each shown in its folder with a progress circle */
  uploads?: Upload[];
  /** a file that could not be kept */
  error?: string | null;
  nodes: TreeNode[];
  folders: string[];
  actions: MaterialActions;
  /** a path to name at once (a folder just made) */
  startRename?: string | null;
  onRenameStarted?: () => void;
  /** files can be added here (your own score; not a sample, whose files, if any, are only listed) */
  addable?: boolean;
}) {
  const { pick } = useLang();
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  useEffect(() => {
    if (!startRename) return;
    setRenaming(startRename);
    onRenameStarted?.();
  }, [startRename, onRenameStarted]);

  // files from the computer being dragged over the page: only then does the drop target show
  const [carrying, setCarrying] = useState(false);
  useEffect(() => {
    let depth = 0;
    const files = (e: globalThis.DragEvent) => [...(e.dataTransfer?.types ?? [])].includes("Files");
    const enter = (e: globalThis.DragEvent) => files(e) && ++depth && setCarrying(true);
    const leave = (e: globalThis.DragEvent) => files(e) && --depth <= 0 && ((depth = 0), setCarrying(false));
    const done = () => ((depth = 0), setCarrying(false));
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", done);
    window.addEventListener("dragend", done);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", done);
      window.removeEventListener("dragend", done);
    };
  }, []);

  // a drop on a folder ("" = the top): a row being moved, or files from the computer
  const dropOn = (folder: string) => ({
    onDragOver: (e: DragEvent) => {
      if (![...e.dataTransfer.types].some((t) => t === DRAG || t === "Files")) return;
      e.preventDefault();
      e.stopPropagation();
      setOver(folder);
    },
    onDragLeave: () => setOver((o) => (o === folder ? null : o)),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOver(null);
      const from = e.dataTransfer.getData(DRAG);
      if (from) a.move(from, folder);
      else if (e.dataTransfer.files.length) a.add([...e.dataTransfer.files], folder);
    },
  });

  const menuFor = (n: TreeNode): ReactNode => {
    const m = n.material;
    const kind = m ? fileKind(n.name, m.type) : null;
    const btn = (label: readonly [string, string], f: () => void, testId?: string) => (
      <button onClick={() => (setMenu(null), f())} className="block w-full rounded px-2 py-1 text-left hover:bg-gray-100" data-testid={testId}>
        {pick(label)}
      </button>
    );
    return (
      <div className="relative z-30 mt-0.5 mb-1 ml-5 space-y-0.5 rounded-md border border-gray-200 bg-white p-1 text-xs shadow-sm" data-testid="material-menu">
        {m && btn(kind === "score" ? ["Open as a score", "開啟為樂譜"] : ["Open", "開啟"], () => a.open(m), "material-open")}
        {m && (kind === "pdf" || kind === "image" || kind === "audio" || kind === "video") && btn(["Transcribe into notes", "轉成音符"], () => a.transcribe(m))}
        {m && btn(["Download", "下載"], () => a.download(m))}
        {!m && btn(["Add files here…", "在這裡加入檔案…"], () => a.pick(n.path))}
        {btn(["Rename", "重新命名"], () => setRenaming(n.path), "material-rename")}
        <label className="flex items-center gap-1 px-2 py-1">
          {pick(["Move to", "移到"])}
          <select
            value=""
            onChange={(e) => (setMenu(null), a.move(n.path, e.target.value === "/" ? "" : e.target.value))}
            className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-1 py-0.5"
            data-testid="material-move"
          >
            <option value="" disabled>
              …
            </option>
            <option value="/">{pick(["(the top)", "（最上層）"])}</option>
            {folders
              .filter((f) => f !== n.path && !f.startsWith(`${n.path}/`))
              .map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
          </select>
        </label>
        {btn(n.kind === "folder" ? ["Delete the folder and its files", "刪除資料夾及其中檔案"] : ["Delete", "刪除"], () => a.remove(n.path), "material-delete")}
      </div>
    );
  };

  const pending = (folder: string, depth: number) =>
    uploads
      .filter((u) => u.folder === folder)
      .map((u) => (
        <li key={u.key} role="none" className="flex items-center gap-1.5 px-1.5 py-1 text-sm text-gray-500" style={{ paddingLeft: depth * 12 + 24 }} data-testid="material-uploading">
          <Progress done={u.done} />
          <span className="min-w-0 flex-1 truncate">{u.name}</span>
          <span className="text-[11px] tabular-nums">{Math.round(u.done * 100)}%</span>
        </li>
      ));
  const rows = (list: TreeNode[], depth: number): ReactNode =>
    list.map((n) => {
      const isFolder = n.kind === "folder";
      const open = isFolder && !closed.has(n.path);
      const kind = n.material ? fileKind(n.name, n.material.type) : "other";
      return (
        <li key={n.path} role="none">
          <div
            className={`group flex items-center rounded ${over === n.path ? "bg-rose-50 ring-1 ring-(--lk-accent)" : "hover:bg-gray-100"}`}
            style={{ paddingLeft: depth * 12 }}
            draggable={renaming !== n.path}
            onDragStart={(e) => (e.dataTransfer.setData(DRAG, n.path), (e.dataTransfer.effectAllowed = "move"))}
            {...(isFolder ? dropOn(n.path) : {})}
            data-testid={isFolder ? "material-folder" : "material-file"}
            data-path={n.path}
          >
            {renaming === n.path ? (
              <input
                autoFocus
                defaultValue={n.name}
                onBlur={(e) => (a.rename(n.path, e.target.value), setRenaming(null))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setRenaming(null);
                }}
                className="m-0.5 w-full rounded border border-(--lk-accent) px-1.5 py-0.5 text-sm outline-none"
                aria-label={pick(["New name", "新名稱"])}
                data-testid="material-rename-input"
              />
            ) : (
              <button
                role="treeitem"
                aria-expanded={isFolder ? open : undefined}
                data-tree-item
                onClick={() =>
                  isFolder
                    ? setClosed((c) => {
                        const next = new Set(c);
                        if (next.has(n.path)) next.delete(n.path);
                        else next.add(n.path);
                        return next;
                      })
                    : n.material && a.open(n.material)
                }
                title={n.material ? `${n.path} · ${sizeText(n.material.size)}` : n.path}
                className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-1 text-left text-sm text-gray-700"
              >
                {isFolder ? (
                  <>
                    <Icon icon={ChevronRight} className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
                    <Icon icon={open ? FolderOpen : Folder} className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  </>
                ) : (
                  <Icon icon={ICON[kind]} className="ml-[18px] h-3.5 w-3.5 shrink-0 text-gray-400" />
                )}
                <span className="min-w-0 flex-1 truncate">{n.name}</span>
              </button>
            )}
            <button
              onClick={() => setMenu(menu === n.path ? null : n.path)}
              aria-label={pick(["More", "更多"])}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-500 opacity-0 group-hover:opacity-100 hover:bg-gray-200 focus:opacity-100"
              data-testid="material-more"
            >
              <Icon icon={MoreHorizontal} className="h-3.5 w-3.5" />
            </button>
          </div>
          {menu === n.path && menuFor(n)}
          {open && (n.children.length > 0 || uploads.some((u) => u.folder === n.path)) && (
            <ul role="group">
              {pending(n.path, depth + 1)}
              {rows(n.children, depth + 1)}
            </ul>
          )}
        </li>
      );
    });

  if (!addable && !nodes.length && !uploads.length && !error) return null;
  return (
    <ul role="group" className={`ml-3 rounded ${over === "" ? "bg-rose-50 ring-1 ring-(--lk-accent)" : ""}`} {...dropOn("")} data-testid="materials">
      {pending("", 0)}
      {rows(nodes, 0)}
      {error && (
        <li role="alert" className="px-2 py-1 text-xs text-red-700" data-testid="upload-error">
          {error}
        </li>
      )}
      {/* files are added here: chosen with the button, or dropped (the target shows only while files are dragged) */}
      {addable &&
        (carrying ? (
          <li role="none" className={`mt-0.5 rounded border border-dashed px-2 py-1.5 text-xs ${over === "" ? "border-(--lk-accent) bg-rose-50 text-rose-900" : "border-gray-300 text-gray-500"}`} data-testid="materials-drop">
            {pick(["Drop files here", "把檔案放到這裡"])}
          </li>
        ) : (
          <li role="none" className="px-2 py-1 text-xs text-gray-500" data-testid="materials-drop">
            {!nodes.length && <span className="block">{pick(["Keep PDFs, recordings and other files with this score.", "把 PDF、錄音和其他檔案與這份樂譜放在一起。"])}</span>}
            <button onClick={() => a.pick("")} className="font-medium text-(--lk-accent) hover:underline" data-testid="materials-add">
              {pick(["Add files…", "加入檔案…"])}
            </button>
          </li>
        ))}
    </ul>
  );
}
