/**
 * What the keyboard is playing, on a grand staff: the latest notes and chords (from the mouse, the computer keys or a
 * MIDI keyboard, via noteInput), newest on the right; the notes held now are coloured. Drawn with Verovio through
 * engine/abc.ts.
 */
import { useLang } from "@learnkit/web";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { clearStaff, groupChords, liveAbc, onClearStaff } from "./liveStaff.ts";
import { subscribeNotes } from "./noteInput.ts";

export default function LiveStaff({ width = 420 }: { width?: number }) {
  const { pick } = useLang();
  const ons = useRef<{ midi: number; time: number }[]>([]);
  const [held, setHeld] = useState<Set<number>>(new Set());
  const [svg, setSvg] = useState("");
  const [version, setVersion] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      subscribeNotes((e) => {
        if (e.on) {
          ons.current = [...ons.current.slice(-40), { midi: e.midi, time: e.time }];
          setVersion((v) => v + 1);
        }
        setHeld((h) => {
          const next = new Set(h);
          if (e.on) next.add(e.midi);
          else next.delete(e.midi);
          return next;
        });
      }),
    [],
  );

  useEffect(
    () =>
      onClearStaff(() => {
        ons.current = [];
        setHeld(new Set());
        setVersion((v) => v + 1);
      }),
    [],
  );

  // redraw when a note starts (a chord's notes arrive within 40 ms: wait a moment so they draw together)
  useEffect(() => {
    let live = true;
    const id = window.setTimeout(() => {
      const abc = liveAbc(groupChords(ons.current));
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

  return (
    <div
      ref={box}
      className="pz-score relative flex h-full min-w-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white px-2 [&_svg]:h-full [&_svg]:max-h-full [&_svg]:w-auto"
      aria-label={pick(["The notes you play, on a staff", "你彈的音，在五線譜上"])}
      data-testid="live-staff"
    >
      {svg ? <div className="h-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="text-xs text-gray-400">♪</p>}
      <button
        type="button"
        onClick={clearStaff}
        className="absolute top-1 right-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        title={pick(["Clear the staff (Backspace or Delete while the computer keys are on)", "清除五線譜（開啟電腦鍵盤彈奏時按 Backspace 或 Delete）"])}
        data-testid="staff-clear"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        {pick(["Clear", "清除"])}
      </button>
    </div>
  );
}
