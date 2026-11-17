/**
 * A project's materials: the files a learner keeps with a score (the PDF it was read from, a recording, an imported
 * MusicXML, notes …), in folders they make themselves. The project lists them by path ("sources/edition.pdf"); the
 * bytes are kept in this browser's database (materialStore.ts), by id, since they are too big for localStorage.
 * Paths use "/" between folders; a folder exists while it is listed in `folders` or holds a file.
 */
import type { Project } from "./project.ts";

export interface Material {
  id: string;
  /** "sources/edition.pdf": folders, then the file's name */
  path: string;
  /** its media type ("application/pdf", "audio/mpeg" …) */
  type: string;
  size: number;
  /** when it was added (ms) */
  added: number;
}

export interface TreeNode {
  name: string;
  path: string;
  kind: "folder" | "file";
  children: TreeNode[];
  material?: Material;
}

/** a path tidied: no empty parts, no "." or "..", no characters a file system refuses */
export function cleanPath(path: string): string {
  return path
    .split("/")
    .map((s) => s.replace(/[\\:*?"<>|\u0000-\u001f]+/g, "_").trim())
    .filter((s) => s && s !== "." && s !== "..")
    .join("/");
}
export const parentOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
export const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const within = (path: string, folder: string) => path === folder || path.startsWith(`${folder}/`);

const materialsOf = (p: Project) => p.materials ?? [];
const foldersOf = (p: Project) => p.folders ?? [];
/** every path taken: files, listed folders, and the folders files sit in */
function taken(p: Project): Set<string> {
  const out = new Set<string>([...materialsOf(p).map((m) => m.path), ...foldersOf(p)]);
  for (const m of materialsOf(p)) for (let f = parentOf(m.path); f; f = parentOf(f)) out.add(f);
  return out;
}

/** a free path like the one asked for: "score.pdf", else "score (2).pdf", "score (3).pdf" … */
export function freePath(p: Project, path: string): string {
  const clean = cleanPath(path) || "file";
  const used = taken(p);
  if (!used.has(clean)) return clean;
  const dot = baseName(clean).lastIndexOf(".");
  const [stem, ext] = dot > 0 ? [clean.slice(0, clean.length - (baseName(clean).length - dot)), clean.slice(clean.length - (baseName(clean).length - dot))] : [clean, ""];
  for (let i = 2; ; i++) if (!used.has(`${stem} (${i})${ext}`)) return `${stem} (${i})${ext}`;
}

/** add a file in a folder ("" = the top); its name made free */
export function addMaterial(p: Project, m: Omit<Material, "path"> & { name: string }, folder = ""): Project {
  const { name, ...rest } = m;
  const path = freePath(p, folder ? `${folder}/${name}` : name);
  return { ...p, materials: [...materialsOf(p), { ...rest, path }] };
}

/** a new folder inside another ("" = the top); returns the project and the folder's path */
export function addFolder(p: Project, name: string, inside = ""): { project: Project; path: string } {
  const path = freePath(p, inside ? `${inside}/${name}` : name);
  return { project: { ...p, folders: [...foldersOf(p), path] }, path };
}

/** move a file or a folder (with all it holds) into a folder ("" = the top); a folder can't go inside itself */
export function moveItem(p: Project, from: string, toFolder: string): Project {
  if (within(toFolder, from) && toFolder !== "" && foldersOrHas(p, from)) return p;
  if (parentOf(from) === toFolder) return p;
  const to = freePath(p, toFolder ? `${toFolder}/${baseName(from)}` : baseName(from));
  return renamePath(p, from, to);
}
const foldersOrHas = (p: Project, path: string) => foldersOf(p).includes(path) || materialsOf(p).some((m) => m.path.startsWith(`${path}/`));

/** give a file or folder a new name, in the same folder */
export function renameItem(p: Project, path: string, name: string): Project {
  const clean = cleanPath(name).replace(/\//g, "_");
  if (!clean || clean === baseName(path)) return p;
  const parent = parentOf(path);
  const to = freePath(p, parent ? `${parent}/${clean}` : clean);
  return renamePath(p, path, to);
}

function renamePath(p: Project, from: string, to: string): Project {
  const swap = (x: string) => (within(x, from) ? to + x.slice(from.length) : x);
  return { ...p, materials: materialsOf(p).map((m) => ({ ...m, path: swap(m.path) })), folders: foldersOf(p).map(swap) };
}

/** remove a file, or a folder with everything in it; returns the ids whose bytes can go */
export function removeItem(p: Project, path: string): { project: Project; removed: string[] } {
  const removed = materialsOf(p).filter((m) => within(m.path, path)).map((m) => m.id);
  return {
    project: { ...p, materials: materialsOf(p).filter((m) => !within(m.path, path)), folders: foldersOf(p).filter((f) => !within(f, path)) },
    removed,
  };
}

/** the materials as a tree: folders first, then files, each by name */
export function treeOf(p: Project): TreeNode[] {
  const root: TreeNode = { name: "", path: "", kind: "folder", children: [] };
  const folder = (path: string): TreeNode => {
    if (!path) return root;
    const parent = folder(parentOf(path));
    let node = parent.children.find((c) => c.kind === "folder" && c.path === path);
    if (!node) parent.children.push((node = { name: baseName(path), path, kind: "folder", children: [] }));
    return node;
  };
  for (const f of foldersOf(p)) folder(f);
  for (const m of materialsOf(p)) folder(parentOf(m.path)).children.push({ name: baseName(m.path), path: m.path, kind: "file", children: [], material: m });
  const sort = (n: TreeNode) => {
    n.children.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, undefined, { numeric: true }) : a.kind === "folder" ? -1 : 1));
    n.children.forEach(sort);
  };
  sort(root);
  return root.children;
}

/** every folder path, for a "Move to" list */
export const allFolders = (p: Project) => [...taken(p)].filter((x) => !materialsOf(p).some((m) => m.path === x)).sort();

/** the ids of every material any of these projects lists (the rest of the stored bytes can go) */
export const idsIn = (projects: (Project | null | undefined)[]) => new Set(projects.flatMap((p) => (p?.materials ?? []).map((m) => m.id)));

/** "1.2 MB" */
export function sizeText(n: number): string {
  return n < 1000 ? `${n} B` : n < 1e6 ? `${Math.round(n / 1e3)} kB` : `${(n / 1e6).toFixed(n < 1e7 ? 1 : 0)} MB`;
}
