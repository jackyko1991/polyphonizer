/**
 * A bridge from the tools to the code editors on the page: each CodePane registers its CodeMirror view; insertCode
 * puts text on new lines after the cursor of the editor used last (or the only one), selects it and scrolls to it.
 */
import type { EditorView } from "@codemirror/view";

const editors = new Set<EditorView>();
let last: EditorView | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((f) => f());

/** an editor appeared; call the result when it goes */
export function registerEditor(v: EditorView): () => void {
  editors.add(v);
  const focus = () => (last = v);
  v.contentDOM.addEventListener("focus", focus);
  changed();
  return () => {
    v.contentDOM.removeEventListener("focus", focus);
    editors.delete(v);
    if (last === v) last = null;
    changed();
  };
}

const target = () => (last && last.dom.isConnected ? last : ([...editors].find((v) => v.dom.isConnected) ?? null));
/** is there an editor to insert into */
export const canInsert = () => target() !== null;
export function onEditors(f: () => void): () => void {
  listeners.add(f);
  return () => void listeners.delete(f);
}

/** the text on its own lines after the cursor's line; false if there is no editor */
export function insertCode(text: string): boolean {
  const v = target();
  if (!v) return false;
  const line = v.state.doc.lineAt(v.state.selection.main.head);
  const at = line.to;
  const before = line.length ? "\n" : "";
  const insert = `${before}${text}\n`;
  v.dispatch({
    changes: { from: at, insert },
    selection: { anchor: at + before.length, head: at + before.length + text.length },
    scrollIntoView: true,
  });
  v.focus();
  return true;
}
