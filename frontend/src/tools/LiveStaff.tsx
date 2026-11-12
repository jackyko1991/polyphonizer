/**
 * What the keyboard is playing, on a grand staff: the latest notes and chords (from the mouse, the computer keys or a
 * MIDI keyboard, via noteInput), newest on the right; the notes held now are coloured. Drawn with Verovio through
 * engine/abc.ts.
 */
import { useLang } from "@learnkit/web";
import { useEffect, useRef, useState } from "react";
import { Delete, X } from "lucide-react";
import { addToStaff, chordCount, clearStaff, groupChords, liveAbc, movePick, onStaff, pickedChord, setPick, staffNotes, undoBar, undoStaff } from "./liveStaff.ts";
import { subscribeNotes } from "./noteInput.ts";

export default function LiveStaff({ width = 420 }: { width?: number }) {
  const { pick } = useLang();
  const [held, setHeld] = useState<Set<number>>(new Set());
  const [svg, setSvg] = useState("");
  const [version, setVersion] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      subscribeNotes((e) => {
        if (e.on) addToStaff({ midi: e.midi, time: e.time });
        setHeld((h) => {
          const next = new Set(h);
          if (e.on) next.add(e.midi);
          else next.delete(e.midi);
          return next;
        });
      }),
    [],
  );

  // any change to the staff's notes (a key, Backspace, Esc, Clear) redraws it
  useEffect(() => onStaff(() => setVersion((v) => v + 1)), []);

  // redraw when a note starts (a chord's notes arrive within 40 ms: wait a moment so they draw together)
  useEffect(() => {
    let live = true;
    const id = window.setTimeout(() => {
      const abc = liveAbc(groupChords(staffNotes()));
      void Promise.all([import("../engine/engrave.ts"), import("../engine/abc.ts")])
        .then(([m, a]) => m.engraveSnippet(a.exampleData(abc), width, 34, abc))
        .then((r) => live && setSvg(r.svg));
    }, 45);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [version, width]);

  // while keys are held, colour the newest chord: the rightmost notes, on both staves
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.querySelectorAll(".pz-playing").forEach((n) => n.classList.remove("pz-playing"));
    if (!held.size) return;
    const notes = [...el.querySelectorAll<SVGGElement>("g.note")].map((n) => ({ n, x: n.getBoundingClientRect().left }));
    const right = Math.max(...notes.map((x) => x.x));
    notes.filter((x) => right - x.x < 4).forEach((x) => x.n.classList.add("pz-playing"));
  }, [held, svg]);

  // the events drawn, left to right: the top staff has one note, chord or rest per event; and the first one's index
  const events = () => {
    const el = box.current;
    if (!el) return [] as Element[];
    return [...el.querySelectorAll("g.measure")].flatMap((m) => {
      const top = m.querySelector("g.staff");
      return top ? [...top.querySelectorAll("g.note, g.chord, g.rest")].filter((x) => !(x.matches("g.note") && x.closest("g.chord"))) : [];
    });
  };
  const firstShown = () => Math.max(0, (Math.ceil(chordCount() / 4) - 2) * 4);
  // the picked chord (←/→, or a click), marked in blue on both staves
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.querySelectorAll(".pz-start").forEach((n) => n.classList.remove("pz-start"));
    const p = pickedChord();
    if (p === null) return;
    const ev = events()[p - firstShown()];
    if (!ev) return;
    const x = ev.getBoundingClientRect().left;
    ev.classList.add("pz-start");
    el.querySelectorAll("g.note, g.rest").forEach((n) => Math.abs(n.getBoundingClientRect().left - x) < 6 && n.classList.add("pz-start"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg, version]);

  return (
    <div
      ref={box}
      tabIndex={0}
      data-live-staff
      onKeyDown={(e) => {
        const keys: Record<string, () => unknown> = {
          ArrowLeft: () => movePick(-1),
          ArrowRight: () => movePick(1),
          Backspace: () => (e.shiftKey ? undoBar() : undoStaff()),
          Delete: () => undoBar(),
          Escape: () => (pickedChord() !== null ? setPick(null) : clearStaff()),
        };
        const run = keys[e.key];
        if (!run) return;
        e.preventDefault();
        e.stopPropagation();
        run();
      }}
      onClick={(e) => {
        // a click on a note picks its chord
        const t = (e.target as Element).closest("g.note, g.chord, g.rest");
        if (!t) return;
        const x = t.getBoundingClientRect().left;
        const i = events().findIndex((ev) => Math.abs(ev.getBoundingClientRect().left - x) < 6);
        if (i >= 0 && firstShown() + i < chordCount()) setPick(firstShown() + i);
      }}
      className="pz-score relative flex h-full min-w-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white px-2 outline-none focus-visible:ring-2 focus-visible:ring-(--lk-accent)/40 [&_svg]:h-full [&_svg]:max-h-full [&_svg]:w-auto"
      aria-label={pick([
        "The notes you play, on a staff. ← → pick a note, Backspace takes it off",
        "你彈的音，在五線譜上。← → 選一個音，Backspace 刪除",
      ])}
      data-testid="live-staff"
    >
      {svg ? <div className="h-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="text-xs text-gray-400">♪</p>}
      {/* take off the last note, the last bar, or everything */}
      <div className="absolute top-1 right-1 flex items-center gap-0.5 text-xs text-gray-500" data-testid="staff-clear">
        {(
          [
            [() => undoStaff(), ["Note", "音"], ["Take off the last note or chord (Backspace)", "刪除最後一個音或和弦（Backspace）"], "staff-undo-note", "⌫"],
            [() => undoBar(), ["Bar", "小節"], ["Take off the last bar (Shift+Backspace or Delete)", "刪除最後一個小節（Shift+Backspace 或 Delete）"], "staff-undo-bar", "⇧⌫"],
            [() => clearStaff(), ["All", "全部"], ["Clear the staff (Esc)", "清除五線譜（Esc）"], "staff-clear-all", "Esc"],
          ] as const
        ).map(([run, label, hint, id, key]) => (
          <button
            key={id}
            type="button"
            onClick={run}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-gray-100 hover:text-gray-800"
            title={pick(hint)}
            data-testid={id}
          >
            {id === "staff-clear-all" ? <X className="h-3.5 w-3.5" aria-hidden /> : <Delete className="h-3.5 w-3.5" aria-hidden />}
            {pick(label)}
            <kbd className="rounded border border-gray-300 bg-gray-50 px-1 font-sans text-[10px] leading-4 text-gray-500">{key}</kbd>
          </button>
        ))}
      </div>
    </div>
  );
}
