/**
 * The editor's scores. A visitor keeps ONE score of their own on the community tier (account.ts): a new score, an
 * imported file, or a sample saved as their own ("fork") all fill that slot. Samples (the built-in examples and any
 * library piece opened) are unlimited: each is edited in its own scratch copy, which Reset restores, and never uses
 * the slot unless saved as one's own. Everything stays in this browser (localStorage).
 */
import { OWN_SCORE_LIMIT, currentTier } from "./account.ts";
import { EXAMPLES } from "./examples.ts";
import { MAIN, type Project } from "./project.ts";

/** the sample a first visit opens */
export const DEFAULT_SAMPLE = { key: `ex:${EXAMPLES[0].id}`, label: EXAMPLES[0].title[0], code: EXAMPLES[0].code };

export interface Sample {
  label: string;
  /** main.py as the sample comes */
  original: string;
  /** the scratch copy being edited */
  project: Project;
}
export interface Workspace {
  /** the visitor's own score, if any */
  own: Project | null;
  ownLabel: string;
  /** the own score as last saved on purpose (💾); the working copy keeps saving itself */
  ownSaved?: { project: Project; at: number } | null;
  samples: Record<string, Sample>;
  current: { kind: "own" } | { kind: "sample"; key: string };
}

export const freshProject = (code: string): Project => ({ files: [{ name: MAIN, code }], active: MAIN, layouts: {} });

export type Result = { ok: true; ws: Workspace } | { ok: false; reason: "full" };

/** the project being edited */
export function currentProject(ws: Workspace): Project | null {
  return ws.current.kind === "own" ? ws.own : (ws.samples[ws.current.key]?.project ?? null);
}

/** the edited project goes back where it came from (own score or the sample's scratch copy) */
export function withCurrent(ws: Workspace, p: Project): Workspace {
  if (ws.current.kind === "own") return { ...ws, own: p };
  const key = ws.current.key;
  const s = ws.samples[key];
  return s ? { ...ws, samples: { ...ws.samples, [key]: { ...s, project: p } } } : ws;
}

/** open a sample (example, library piece …): its scratch copy if edited before, else a fresh one */
export function openSample(ws: Workspace, key: string, label: string, code: string): Workspace {
  const s = ws.samples[key];
  const samples = s ? ws.samples : { ...ws.samples, [key]: { label, original: code, project: freshProject(code) } };
  return { ...ws, samples, current: { kind: "sample", key } };
}

/** a sample back to how it came */
export function resetSample(ws: Workspace, key: string): Workspace {
  const s = ws.samples[key];
  return s ? { ...ws, samples: { ...ws.samples, [key]: { ...s, project: freshProject(s.original) } } } : ws;
}

/** whether one more own score fits */
export const hasRoom = (ws: Workspace, limit = OWN_SCORE_LIMIT[currentTier()]) => (ws.own ? 1 : 0) < limit;

/** make `p` the own score: refused when the slot is taken, unless `replace` */
export function setOwn(ws: Workspace, p: Project, label: string, replace = false, limit = OWN_SCORE_LIMIT[currentTier()]): Result {
  if (!replace && !hasRoom(ws, limit)) return { ok: false, reason: "full" };
  return { ok: true, ws: { ...ws, own: p, ownLabel: label, ownSaved: { project: structuredClone(p), at: Date.now() }, current: { kind: "own" } } };
}

/** save the sample being edited as one's own score (a fork) */
export function forkCurrent(ws: Workspace, replace = false, limit?: number): Result {
  if (ws.current.kind !== "sample") return { ok: true, ws };
  const s = ws.samples[ws.current.key];
  return setOwn(ws, structuredClone(s.project), s.label, replace, limit);
}

/** delete the own score (frees the slot); the editor moves to a sample */
export function deleteOwn(ws: Workspace): Workspace {
  const first = Object.keys(ws.samples)[0];
  return { ...ws, own: null, ownLabel: "", ownSaved: null, current: first ? { kind: "sample", key: first } : { kind: "own" } };
}

/** rename the own score (an empty name keeps the old one) */
export function renameOwn(ws: Workspace, label: string): Workspace {
  const name = label.trim().slice(0, 80);
  return name && ws.own ? { ...ws, ownLabel: name } : ws;
}

/** a deliberate save point of the own score */
export function saveOwn(ws: Workspace, at = Date.now()): Workspace {
  return ws.own ? { ...ws, ownSaved: { project: structuredClone(ws.own), at } } : ws;
}

/** whether the own score has changed since its last save point */
export const ownChanged = (ws: Workspace) => !!ws.own && JSON.stringify(ws.own.files) !== JSON.stringify(ws.ownSaved?.project.files ?? null);

// ── storage ──

const KEY = "polyphonizer.workspace";
/** the single-project editor's key: its project becomes the own score */
const OLD_KEY = "polyphonizer.project";

export function loadWorkspace(sample: { key: string; label: string; code: string } = DEFAULT_SAMPLE): Workspace {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Workspace | null;
    if (saved && saved.samples && saved.current) return saved;
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? "null") as Project | null;
    if (old?.files?.length) return { own: { ...old, layouts: old.layouts ?? {} }, ownLabel: "", samples: {}, current: { kind: "own" } };
  } catch {
    /* storage unavailable or unreadable: start afresh */
  }
  return openSample({ own: null, ownLabel: "", samples: {}, current: { kind: "own" } }, sample.key, sample.label, sample.code);
}

export function saveWorkspace(ws: Workspace) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ws));
  } catch {
    /* full or unavailable: the work still stays until the tab closes */
  }
}

/** for other pages (Library): open a piece in the editor as a sample (go("editor") afterwards) */
export function openInEditor(key: string, label: string, code: string) {
  saveWorkspace(openSample(loadWorkspace(), key, label, code));
}
