/**
 * The editor's score explorer (left of the code, like an editor's file tree): New and ↑ Import; My scores (the
 * community quota, with rename, export and delete); Samples; Recently opened; and a way to the Library. Arrow keys
 * move through it, Enter opens, ← / → fold and unfold.
 */
import { ChevronRight, Download, Music, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Icon } from "./Button.tsx";
import { useLang } from "@learnkit/web";
import { useRef, useState, type KeyboardEvent } from "react";
import { EXAMPLES } from "./examples.ts";
import type { Recent } from "./project.ts";
import { fill } from "./strings.ts";
import { BUTTON } from "./ui.ts";
import type { Workspace } from "./workspace.ts";

export type TreePick = { kind: "own" } | { kind: "example"; id: string } | { kind: "recent"; index: number } | { kind: "library" };

const GROUPS_KEY = "polyphonizer.tree.groups";

export default function ScoreTree({
  ws,
  limit,
  recents,
  onPick,
  onNew,
  onImport,
  onRename,
  onExport,
  onDelete,
}: {
  ws: Workspace;
  limit: number;
  recents: Recent[];
  onPick: (p: TreePick) => void;
  onNew: () => void;
  onImport: () => void;
  onRename: (name: string) => void;
  /** "py": the code (.py or .zip); "musicxml" / "midi" when the score has been compiled */
  onExport: (format: "py" | "musicxml" | "midi") => void;
  onDelete: () => void;
}) {
  const { t, pick } = useLang();
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      return { mine: true, samples: true, recent: true, ...JSON.parse(localStorage.getItem(GROUPS_KEY) ?? "{}") };
    } catch {
      return { mine: true, samples: true, recent: true };
    }
  });
  const [renaming, setRenaming] = useState(false);
  const [menu, setMenu] = useState<"export" | "delete" | null>(null);
  const tree = useRef<HTMLUListElement>(null);
  const toggle = (g: string) =>
    setOpen((o) => {
      const next = { ...o, [g]: !o[g] };
      try {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });

  const cur = ws.current;
  const isCurrent = (p: TreePick) =>
    p.kind === "own"
      ? cur.kind === "own"
      : p.kind === "example"
        ? cur.kind === "sample" && cur.key === `ex:${p.id}`
        : p.kind === "recent"
          ? cur.kind === "sample" && cur.key === `recent:${recents[p.index]?.label}`
          : false;

  // keyboard: ↑ ↓ through the visible items, Enter opens, ← → fold groups
  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const items = [...(tree.current?.querySelectorAll<HTMLElement>("[data-tree-item]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[Math.max(0, Math.min(items.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
    } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && i >= 0) {
      const group = items[i].dataset.group;
      if (group && (e.key === "ArrowRight") !== !!open[group]) toggle(group);
    }
  };

  const row = (p: TreePick, label: string, title?: string) => (
    <li role="none">
      <button
        role="treeitem"
        aria-selected={isCurrent(p)}
        data-tree-item
        onClick={() => onPick(p)}
        title={title ?? label}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm ${isCurrent(p) ? "bg-rose-50 font-medium text-(--lk-accent)" : "text-gray-700 hover:bg-gray-100"}`}
      >
        <span aria-hidden className="text-gray-400">
          <Icon icon={Music} className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
    </li>
  );
  const group = (id: string, label: string, children: React.ReactNode) => (
    <li role="none">
      <button
        role="treeitem"
        aria-expanded={!!open[id]}
        data-tree-item
        data-group={id}
        onClick={() => toggle(id)}
        className="flex w-full items-center gap-1 rounded px-1 py-1 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase hover:bg-gray-100"
      >
        <Icon icon={ChevronRight} className={`h-3.5 w-3.5 transition-transform ${open[id] ? "rotate-90" : ""}`} />
        {label}
      </button>
      {open[id] && (
        <ul role="group" className="ml-2 border-l border-gray-200 pl-1">
          {children}
        </ul>
      )}
    </li>
  );

  const ownName = ws.ownLabel || t("ws.newLabel");
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="score-tree">
      <div className="flex shrink-0 gap-1.5 border-b border-gray-200 p-2">
        <button onClick={onNew} className={`${BUTTON} flex-1 justify-center`} title={t("ws.new")} data-testid="tree-new">
          <Icon icon={Plus} /> {t("tree.new")}
        </button>
        <button onClick={onImport} className={`${BUTTON} flex-1 justify-center`} title={t("import.hint")} data-testid="upload">
          <Icon icon={Upload} /> {t("tree.import")}
        </button>
      </div>
      <ul ref={tree} role="tree" aria-label={t("scores")} onKeyDown={onKey} className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {group(
          "mine",
          `${t("ws.mine")} · ${ws.own ? 1 : 0}/${limit}`,
          ws.own ? (
            <li role="none" className="relative">
              {renaming ? (
                <input
                  autoFocus
                  defaultValue={ownName}
                  onBlur={(e) => (onRename(e.target.value), setRenaming(false))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setRenaming(false);
                  }}
                  className="w-full rounded border border-(--lk-accent) px-2 py-1 text-sm outline-none"
                  aria-label={t("tree.rename")}
                  data-testid="tree-rename-input"
                />
              ) : (
                <div className="group flex items-center">
                  <div className="min-w-0 flex-1">{row({ kind: "own" }, ownName)}</div>
                  <span className="flex shrink-0 items-center text-xs text-gray-500">
                    <button onClick={() => setRenaming(true)} title={t("tree.rename")} aria-label={t("tree.rename")} className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-gray-200" data-testid="tree-rename">
                      <Icon icon={Pencil} />
                    </button>
                    <button onClick={() => setMenu(menu === "export" ? null : "export")} title={t("ws.export")} aria-label={t("ws.export")} className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-gray-200">
                      <Icon icon={Download} />
                    </button>
                    <button onClick={() => setMenu(menu === "delete" ? null : "delete")} title={t("ws.delete")} aria-label={t("ws.delete")} className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-gray-200" data-testid="tree-delete">
                      <Icon icon={Trash2} />
                    </button>
                  </span>
                </div>
              )}
              {menu === "export" && (
                <div className="mt-1 space-y-0.5 rounded-md border border-gray-200 bg-white p-1 text-sm shadow-sm">
                  {(["py", "musicxml", "midi"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => (onExport(f), setMenu(null))}
                      disabled={f !== "py" && cur.kind !== "own"}
                      title={f !== "py" && cur.kind !== "own" ? t("tree.openFirst") : undefined}
                      className="block w-full rounded px-2 py-1 text-left hover:bg-gray-100 disabled:opacity-40"
                    >
                      {t(`tree.export.${f}`)}
                    </button>
                  ))}
                </div>
              )}
              {menu === "delete" && (
                <div className="mt-1 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-900" role="alertdialog" data-testid="tree-delete-confirm">
                  <p>{fill(t("tree.deleteAsk"), { name: ownName })}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button onClick={() => onExport("py")} className="rounded border border-red-200 bg-white px-2 py-0.5 hover:bg-red-100">
                      <Icon icon={Download} className="inline h-3.5 w-3.5" /> {t("tree.exportFirst")}
                    </button>
                    <button onClick={() => (onDelete(), setMenu(null))} className="rounded bg-red-700 px-2 py-0.5 text-white hover:bg-red-800" data-testid="tree-delete-yes">
                      {t("ws.delete")}
                    </button>
                    <button onClick={() => setMenu(null)} className="rounded px-2 py-0.5 hover:bg-red-100">
                      {t("edit.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ) : (
            <li role="none" className="px-2 py-1 text-xs text-gray-400">
              {t("tree.noneYet")}
            </li>
          ),
        )}
        {group(
          "samples",
          t("ws.sample"),
          EXAMPLES.map((x) => <span key={x.id}>{row({ kind: "example", id: x.id }, pick(x.title))}</span>),
        )}
        {recents.length > 0 &&
          group(
            "recent",
            t("scores.recent"),
            recents.map((r, i) => <span key={r.label}>{row({ kind: "recent", index: i }, r.label)}</span>),
          )}
        <li role="none">
          <button
            role="treeitem"
            data-tree-item
            onClick={() => onPick({ kind: "library" })}
            className="flex w-full items-center gap-1 rounded px-1 py-1 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase hover:bg-gray-100"
          >
            <Icon icon={ChevronRight} className="h-3.5 w-3.5" />
            {t("page.library")} …
          </button>
        </li>
      </ul>
    </div>
  );
}
