/**
 * What the keyboard is playing, on a grand staff: the latest notes and chords (from the mouse, the computer keys or a
 * MIDI keyboard, via noteInput), newest on the right; the notes held now are coloured. Drawn with Verovio through
 * engine/abc.ts.
 */
import { useLang } from "@learnkit/web";
import { useEffect, useRef, useState } from "react";
import { addToStaff, chordCount, clearStaff, firstShown as firstOf, groupChords, liveAbc, movePick, onStaff, pickedChord, setPick, staffNotes, undoBar, undoStaff } from "./liveStaff.ts";
import { subscribeNotes } from "./noteInput.ts";

/** `onAspect`: the drawing's width ÷ height, each time it is drawn (the floating window sizes itself to it) */
/** `bars`: how many bars to show (the latest); the Note / Bar / All buttons are the window's (FloatingStaff) */
export default function LiveStaff({ width = 420, bars = 2, onAspect }: { width?: number; bars?: number; onAspect?: (ratio: number) => void }) {
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
      const abc = liveAbc(groupChords(staffNotes()), bars);
      void Promise.all([import("../engine/engrave.ts"), import("../engine/abc.ts")])
        .then(([m, a]) => m.engraveSnippet(a.exampleData(abc), width, 34, abc, true))
        .then((r) => {
          if (!live) return;
          setSvg(r.svg);
          const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(r.svg);
          if (vb && Number(vb[2]) > 0) onAspect?.(Number(vb[1]) / Number(vb[2]));
        });
    }, 45);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [version, width, bars]);

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
  const firstShown = () => firstOf(chordCount(), bars);
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
      className="pz-score relative flex h-full min-w-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white px-2 outline-none focus-visible:ring-2 focus-visible:ring-(--lk-accent)/40 [&_svg]:h-full [&_svg]:w-full"
      aria-label={pick([
        "The notes you play, on a staff. ← → pick a note, Backspace takes it off",
        "你彈的音，在五線譜上。← → 選一個音，Backspace 刪除",
      ])}
      data-testid="live-staff"
    >
      {svg ? <div className="h-full w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="text-xs text-gray-400">♪</p>}
    </div>
  );
}
