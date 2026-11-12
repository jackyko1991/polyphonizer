/** The Python editor (CodeMirror), with Ctrl/⌘+Enter to run and the failing line marked. */
import { python } from "@codemirror/lang-python";
import { Decoration, EditorView, keymap, type DecorationSet } from "@codemirror/view";
import { StateEffect, StateField, Prec } from "@codemirror/state";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo, useRef } from "react";

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

export default function CodePane({
  value,
  onChange,
  onRun,
  errorAt,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  errorAt: number | null;
}) {
  const view = useRef<EditorView | null>(null);
  const run = useRef(onRun);
  run.current = onRun;
  const extensions = useMemo(
    () => [
      python(),
      errorLine,
      Prec.highest(keymap.of([{ key: "Mod-Enter", run: () => (run.current(), true) }])),
      EditorView.lineWrapping,
    ],
    [],
  );
  if (view.current) view.current.dispatch({ effects: setError.of(errorAt) });
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      onCreateEditor={(v) => {
        view.current = v;
        v.dispatch({ effects: setError.of(errorAt) });
      }}
      basicSetup={{ foldGutter: false, highlightActiveLine: false }}
      className="h-full text-sm [&_.cm-editor]:h-full"
      height="100%"
      data-testid="code"
    />
  );
}
