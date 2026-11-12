/**
 * The Python editor (CodeMirror): Ctrl/⌘+Enter to run (and Ctrl/⌘+S when the page saves), lint checking as you
 * type, the failing line marked. For Learn's lessons: `___` blanks are highlighted and reported as lint errors, a
 * range (the code of a note clicked in the score) can be marked, and the cursor position is reported.
 */
import { python } from "@codemirror/lang-python";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import { Decoration, EditorView, keymap, MatchDecorator, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { StateEffect, StateField, Prec } from "@codemirror/state";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo, useRef } from "react";
import { lint } from "./engine/lint.ts";
import { blankIssues } from "./learn/blanks.ts";

const setError = StateEffect.define<number | null>();
const errorLine = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setError)) continue;
      if (e.value === null || e.value < 1 || e.value > tr.state.doc.lines) return Decoration.none;
      const line = tr.state.doc.line(e.value);
      return Decoration.set([Decoration.line({ class: "pz-error-line" }).range(line.from)]);
    }
    return tr.docChanged ? Decoration.none : deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/** a marked range: the code of the note selected in the score */
const setMark = StateEffect.define<{ from: number; to: number } | null>();
const markField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setMark)) continue;
      const v = e.value;
      if (!v || v.from >= v.to || v.to > tr.state.doc.length) return Decoration.none;
      return Decoration.set([Decoration.mark({ class: "pz-token" }).range(v.from, v.to)]);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const blankMatcher = new MatchDecorator({ regexp: /_{3,}/g, decoration: Decoration.mark({ class: "pz-blank" }) });
const blankHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = blankMatcher.createDeco(view);
    }
    update(u: ViewUpdate) {
      this.decorations = blankMatcher.updateDeco(u, this.decorations);
    }
  },
  { decorations: (v) => v.decorations },
);

const theme = EditorView.baseTheme({
  ".pz-blank": { backgroundColor: "#fef3c7", outline: "1px dashed #d97706", borderRadius: "2px" },
  ".pz-token": { backgroundColor: "#bae6fd", borderRadius: "2px" },
});

export default function CodePane({
  value,
  onChange,
  onRun,
  onSave,
  errorAt,
  main = true,
  onView,
  blankMessage,
  mark = null,
  onCursor,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  /** Ctrl/⌘+S inside the editor (the browser's Save dialog is suppressed); not bound when absent */
  onSave?: () => void;
  errorAt: number | null;
  /** lint as the main file (which must set `score`) or as one of the project's other files */
  main?: boolean;
  /** the CodeMirror view, once, when the editor is created (to select and scroll from outside) */
  onView?: (view: EditorView) => void;
  /** lessons: `___` blanks are lint errors with this message (by line); absent = blanks are not special */
  blankMessage?: (line: number) => string;
  /** a range to highlight */
  mark?: { from: number; to: number } | null;
  /** the cursor moved (or the selection changed): its position */
  onCursor?: (pos: number) => void;
}) {
  const view = useRef<EditorView | null>(null);
  const run = useRef(onRun);
  run.current = onRun;
  const save = useRef(onSave);
  save.current = onSave;
  const isMain = useRef(main);
  isMain.current = main;
  const blanks = useRef(blankMessage);
  blanks.current = blankMessage;
  const cursor = useRef(onCursor);
  cursor.current = onCursor;
  const extensions = useMemo(
    () => [
      python(),
      errorLine,
      markField,
      blankHighlight,
      theme,
      Prec.highest(
        keymap.of([
          { key: "Mod-Enter", run: () => (run.current(), true) },
          { key: "Mod-s", run: () => (save.current ? (save.current(), true) : false), preventDefault: true },
        ]),
      ),
      EditorView.updateListener.of((u) => {
        if (u.selectionSet && cursor.current) cursor.current(u.state.selection.main.head);
      }),
      EditorView.lineWrapping,
      lintGutter(),
      linter(
        async (v): Promise<Diagnostic[]> => {
          const doc = v.state.doc;
          const at = (line: number, col: number) => {
            if (line > doc.lines) return doc.length;
            const l = doc.line(Math.max(1, line));
            return Math.min(l.to, l.from + Math.max(0, col - 1));
          };
          const code = doc.toString();
          const message = blanks.current;
          const gaps = message ? blankIssues(code) : [];
          const found: Diagnostic[] = gaps.map((b) => ({ from: b.from, to: b.to, severity: "error", source: "blank", message: message!(b.line) }));
          // with blanks left, Python's complaints about them (an undefined name `___`) would only confuse
          const issues = await lint(code, isMain.current);
          for (const d of issues) {
            if (gaps.length && (d.code === "F821" && /___/.test(d.message))) continue;
            if (gaps.length && d.code === "PZ001") continue;
            const from = at(d.line, d.column);
            found.push({ from, to: Math.max(from, at(d.endLine, d.endColumn)), severity: d.severity, source: d.code ?? undefined, message: d.message });
          }
          return found;
        },
        { delay: 400 },
      ),
    ],
    [],
  );
  if (view.current) view.current.dispatch({ effects: [setError.of(errorAt), setMark.of(mark)] });
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      onCreateEditor={(v) => {
        view.current = v;
        v.dispatch({ effects: [setError.of(errorAt), setMark.of(mark)] });
        onView?.(v);
      }}
      basicSetup={{ foldGutter: false, highlightActiveLine: false }}
      className="h-full text-sm [&_.cm-editor]:h-full"
      height="100%"
      data-testid="code"
    />
  );
}
