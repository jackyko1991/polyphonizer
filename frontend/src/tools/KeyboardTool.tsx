/**
 * The virtual keyboard: play with the mouse or a finger, the computer keyboard (home row = white keys, the row above
 * = black keys, Z / X = octave, C / V = softer / louder, held Space = sustain pedal) or a MIDI keyboard. Every note
 * goes out on the note stream (noteInput.ts) for step entry and the Play lessons.
 */
import { FM_PIANO } from "./fm.ts";
import { useLang } from "@learnkit/web";
import { ChevronLeft, ChevronRight, Keyboard as KeysIcon, Music, Music2, Type } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Button, IconButton } from "../Button.tsx";
import { CHECK, FIELD } from "../ui.ts";
import { noteOn, prepare } from "./liveSound.ts";
import { clearStaff, undoBar, undoStaff } from "./liveStaff.ts";
import { keyAction, keyLabelFor, keyMidi, LAYOUTS, layoutHelp, type LayoutId } from "./keyLayouts.ts";
import { isBlack, keysBetween, letter, noteName, RANGES } from "./music.ts";
import { publishNote, type NoteSource } from "./noteInput.ts";
import { armKeyboard, setRunning, useToolbox } from "./toolboxState.ts";

const FloatingStaff = lazy(() => import("./FloatingStaff.tsx"));

/** sounds to play with: General MIDI programs */
export const KEYBOARD_SOUNDS: [number, readonly [string, string]][] = [
  [0, ["Piano", "鋼琴"]],
  [4, ["Electric piano", "電鋼琴"]],
  [FM_PIANO, ["FM piano (DX7-style)", "FM 電鋼琴（DX7 風格）"]],
  [5, ["Electric piano 2 (FM, sampled)", "電鋼琴 2（FM，取樣）"]],
  [6, ["Harpsichord", "大鍵琴"]],
  [19, ["Church organ", "管風琴"]],
  [40, ["Violin", "小提琴"]],
  [41, ["Viola", "中提琴"]],
  [42, ["Cello", "大提琴"]],
  [48, ["String ensemble", "弦樂合奏"]],
  [46, ["Harp", "豎琴"]],
  [73, ["Flute", "長笛"]],
  [68, ["Oboe", "雙簧管"]],
  [71, ["Clarinet", "單簧管"]],
  [56, ["Trumpet", "小號"]],
  [60, ["French horn", "法國號"]],
  [24, ["Nylon guitar", "古典吉他"]],
  [25, ["Steel guitar", "民謠吉他"]],
  [52, ["Choir", "合唱"]],
  [89, ["Warm pad", "溫暖合成音"]],
];

interface KeyboardPrefs {
  size: number;
  low: number;
  names: boolean;
  keys: boolean;
  /** show what is played on a staff beside the keys */
  staff?: boolean;
  program: number;
  baseC: number;
  /** the left hand's C in the two-row layout */
  lowC?: number;
  /** which computer-keyboard layout plays the keys */
  layout?: LayoutId;
  velocity: number;
}
const KEY = "polyphonizer.keyboard";
const DEFAULTS: KeyboardPrefs = { size: 37, low: 48, names: true, keys: true, program: 0, baseC: 60, velocity: 0.8 };
function load(): KeyboardPrefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<KeyboardPrefs> | null) };
  } catch {
    return DEFAULTS;
  }
}

/** how hard a key was pressed: as on a real key, nearer the front (lower on the screen) plays louder, nearer the back
 * softer; a pen's pressure wins when it reports one */
function pressVelocity(e: { clientY: number; pointerType: string; pressure: number; currentTarget: Element }): number {
  if (e.pointerType === "pen" && e.pressure > 0 && e.pressure !== 0.5) return Math.max(0.1, Math.min(1, e.pressure));
  const r = e.currentTarget.getBoundingClientRect();
  const depth = r.height ? Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) : 0.6;
  return Math.round((0.2 + 0.8 * depth) * 100) / 100;
}

/** is the user typing somewhere (then the computer keys don't play). A drop-down doesn't count: after picking a layout
 * or a sound the focus stays on it, and the keys should play straight away */
const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName) || !!t.closest(".cm-editor"));

export default function KeyboardTool() {
  const { pick, index: lang } = useLang();
  const [p, setP] = useState(load);
  const { keyboardArmed: armed, hint, baseRequest } = useToolbox();
  const setArmed = (v: boolean | ((a: boolean) => boolean)) => armKeyboard(typeof v === "function" ? v(armed) : v);
  // a lesson asked for the home-row layout with its C here
  useEffect(() => {
    if (baseRequest) update({ baseC: baseRequest.c, layout: "typing" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRequest]);
  const [lit, setLit] = useState<Set<number>>(new Set());
  const [midiState, setMidiState] = useState<"off" | "on" | "none">("off");
  const held = useRef(new Map<string, () => void>());
  const sustained = useRef(new Map<string, () => void>());
  const sustain = useRef(false);
  const prefs = useRef(p);
  prefs.current = p;

  const update = (c: Partial<KeyboardPrefs>) =>
    setP((old) => {
      const next = { ...old, ...c };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });

  useEffect(() => void prepare(p.program), [p.program]);
  useEffect(() => setRunning("keyboard", armed), [armed]);
  useEffect(() => () => setRunning("keyboard", false), []);

  const light = (midi: number, on: boolean) =>
    setLit((s) => {
      const n = new Set(s);
      if (on) n.add(midi);
      else n.delete(midi);
      return n;
    });

  /** start a note under `id` (a pointer, a key code, a MIDI note) */
  const start = useCallback((id: string, midi: number, source: NoteSource, velocity = prefs.current.velocity) => {
    if (held.current.has(id)) return;
    sustained.current.get(id)?.();
    sustained.current.delete(id);
    held.current.set(id, noteOn(midi, prefs.current.program, velocity));
    light(midi, true);
    publishNote({ midi, on: true, velocity, time: performance.now(), source });
  }, []);
  const end = useCallback((id: string, midi: number, source: NoteSource) => {
    const stop = held.current.get(id);
    if (!stop) return;
    held.current.delete(id);
    if (sustain.current) sustained.current.set(id, stop);
    else stop();
    light(midi, false);
    publishNote({ midi, on: false, velocity: 0, time: performance.now(), source });
  }, []);
  const releaseAll = useCallback(() => {
    held.current.forEach((s) => s());
    sustained.current.forEach((s) => s());
    held.current.clear();
    sustained.current.clear();
    setLit(new Set());
  }, []);

  // the computer keyboard, while armed
  useEffect(() => {
    if (!armed) return;
    const codeMidi = new Map<string, number>();
    const down = (e: KeyboardEvent) => {
      // the live staff handles its own keys while it has focus (← → pick, Backspace removes)
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || (e.target as HTMLElement)?.closest?.("[data-live-staff]")) return;
      // Backspace: the last note off the staff; Shift+Backspace / Delete: the last bar; Esc: all (Esc on an empty staff:
      // computer keys off)
      if (e.code === "Backspace" || e.code === "Delete") {
        e.preventDefault();
        return void (e.code === "Delete" || e.shiftKey ? undoBar() : undoStaff());
      }
      if (e.code === "Escape") return void (clearStaff() || setArmed(false));
      const lay = prefs.current.layout ?? "typing";
      const bases = { high: prefs.current.baseC, low: prefs.current.lowC ?? prefs.current.baseC - 12 };
      const midi = keyMidi(lay, e.code, bases);
      const action = keyAction(lay, e.code);
      const clamp = (m: number) => Math.min(96, Math.max(24, m));
      if (midi !== null) {
        e.preventDefault();
        if (e.repeat) return;
        codeMidi.set(e.code, midi);
        start(e.code, midi, "keys");
      } else if (action) {
        e.preventDefault();
        if (e.repeat) return;
        if (action === "octDown" || action === "octUp") update({ baseC: clamp(prefs.current.baseC + (action === "octUp" ? 12 : -12)) });
        else if (action === "lowDown" || action === "lowUp") update({ lowC: clamp(bases.low + (action === "lowUp" ? 12 : -12)) });
        else update({ velocity: Math.round(Math.min(1, Math.max(0.2, prefs.current.velocity + (action === "louder" ? 0.1 : -0.1))) * 10) / 10 });
      } else if (e.code === "Space") {
        e.preventDefault();
        sustain.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        sustain.current = false;
        sustained.current.forEach((s) => s());
        sustained.current.clear();
        return;
      }
      const midi = codeMidi.get(e.code);
      if (midi !== undefined) end(e.code, midi, "keys");
    };
    const blur = () => releaseAll();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      releaseAll();
    };
  }, [armed, start, end, releaseAll]);

  // a MIDI keyboard, once switched on
  useEffect(() => {
    if (midiState !== "on") return;
    let access: MIDIAccess | null = null;
    const onMessage = (e: MIDIMessageEvent) => {
      const [status, note, vel] = e.data ?? [];
      const cmd = status & 0xf0;
      if (cmd === 0x90 && vel > 0) start(`midi${note}`, note, "midi", vel / 127);
      else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) end(`midi${note}`, note, "midi");
    };
    void navigator.requestMIDIAccess?.().then(
      (a) => {
        access = a;
        a.inputs.forEach((i) => i.addEventListener("midimessage", onMessage as EventListener));
      },
      () => setMidiState("none"),
    );
    return () => access?.inputs.forEach((i) => i.removeEventListener("midimessage", onMessage as EventListener));
  }, [midiState, start, end]);

  const hi = Math.min(108, p.low + (RANGES[p.size]?.[1] ?? 84) - (RANGES[p.size]?.[0] ?? 48));
  const keys = keysBetween(p.low, hi);
  const whites = keys.filter((m) => !isBlack(m));
  const W = whites.length;
  const shift = (d: number) => {
    const span = hi - p.low;
    const low = Math.min(108 - span, Math.max(21, p.low + d));
    update({ low });
  };

  return (
    <div className="flex h-full flex-col gap-2" data-testid="keyboard-tool">
      {/* on a phone: one row that scrolls sideways, so the keys keep the room */}
      <div className="flex items-center gap-2 max-sm:shrink-0 max-sm:overflow-x-auto max-sm:pb-1 max-sm:[scrollbar-width:none] sm:flex-wrap [&>*]:shrink-0">
        <Button
          icon={KeysIcon}
          variant={armed ? "on" : "secondary"}
          onClick={() => setArmed((a) => !a)}
          title={pick(["Play with the computer keyboard (Esc to stop)", "用電腦鍵盤彈奏（Esc 停止）"])}
          aria-pressed={armed}
          data-testid="kb-arm"
        >
          {armed ? pick(["Computer keys on", "電腦鍵盤彈奏中"]) : pick(["Play with computer keys", "用電腦鍵盤彈"])}
        </Button>
        <select
          value={p.layout ?? "typing"}
          onChange={(e) => update({ layout: e.target.value as LayoutId, lowC: p.lowC ?? p.baseC - 12 })}
          className={FIELD}
          aria-label={pick(["Computer-keyboard layout", "電腦鍵盤配置"])}
          title={pick([
            "Two-row piano: two hands, about 2½ octaves (as FL Studio and trackers). Musical Typing: one row, about 1½ octaves (as GarageBand and Ableton).",
            "雙排鋼琴：雙手、約兩個半八度（同 FL Studio 與 tracker）。Musical Typing：單排、約一個半八度（同 GarageBand 與 Ableton）。",
          ])}
          data-testid="kb-layout"
        >
          {LAYOUTS.map((l) => (
            <option key={l} value={l}>
              {l === "tworow" ? pick(["Two-row piano (2 hands)", "雙排鋼琴（雙手）"]) : pick(["Musical Typing (1 row)", "Musical Typing（單排）"])}
            </option>
          ))}
        </select>
        <select
          value={p.program}
          onChange={(e) => update({ program: Number(e.target.value) })}
          className={FIELD}
          aria-label={pick(["Sound", "音色"])}
        >
          {KEYBOARD_SOUNDS.map(([prog, name]) => (
            <option key={prog} value={prog}>
              {pick(name)}
            </option>
          ))}
        </select>
        <select
          value={p.size}
          onChange={(e) => {
            const size = Number(e.target.value);
            update({ size, low: RANGES[size][0] });
          }}
          className={FIELD}
          aria-label={pick(["Keys", "鍵數"])}
        >
          {Object.keys(RANGES).map((n) => (
            <option key={n} value={n}>
              {pick([`${n} keys`, `${n} 鍵`])}
            </option>
          ))}
        </select>
        <IconButton
          icon={ChevronLeft}
          label={pick(["Octave down", "降八度"])}
          variant="secondary"
          onClick={() => shift(-12)}
          disabled={p.low <= 21}
        />
        <IconButton
          icon={ChevronRight}
          label={pick(["Octave up", "升八度"])}
          variant="secondary"
          onClick={() => shift(12)}
          disabled={hi >= 108}
        />
        <label className={CHECK}>
          <input type="checkbox" checked={p.names} onChange={(e) => update({ names: e.target.checked })} />
          <Music2 className="h-4 w-4" aria-hidden /> {pick(["Note names", "音名"])}
        </label>
        <label className={CHECK}>
          <input type="checkbox" checked={p.keys} onChange={(e) => update({ keys: e.target.checked })} />
          <Type className="h-4 w-4" aria-hidden /> {pick(["Key letters", "按鍵字母"])}
        </label>
        <Button
          icon={Music}
          variant={p.staff ? "on" : "secondary"}
          onClick={() => update({ staff: !p.staff })}
          aria-pressed={!!p.staff}
          title={pick(["Show what you play on a staff, in a window you can move and resize", "在可移動、可調整大小的視窗中，以五線譜顯示你彈的音"])}
          data-testid="kb-staff"
        >
          {pick(["Staff", "五線譜"])}
        </Button>
        {"requestMIDIAccess" in navigator && (
          <Button variant={midiState === "on" ? "on" : "secondary"} onClick={() => setMidiState((s) => (s === "on" ? "off" : "on"))}>
            MIDI
          </Button>
        )}
        {midiState === "none" && <span className="text-xs text-red-700">{pick(["No MIDI access", "無法使用 MIDI"])}</span>}
        <span className="ml-auto text-xs text-gray-500 max-sm:hidden">
          {armed
            ? layoutHelp(p.layout ?? "typing", { high: p.baseC, low: p.lowC ?? p.baseC - 12 }, p.velocity, lang === 1)
            : pick(["Click the keys (lower on a key = louder), or turn on the computer keys", "點按琴鍵（按在琴鍵越下方越大聲），或開啟電腦鍵盤彈奏"])}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
      {p.staff && (
        // the staff floats in its own window (move it anywhere, resize it), so the keys keep the whole panel
        <Suspense fallback={null}>
          <FloatingStaff onClose={() => update({ staff: false })} />
        </Suspense>
      )}
      <div
        className="relative min-h-[90px] w-full touch-none select-none"
        style={{ flex: "1 1 0" }}
        role="group"
        aria-label={pick(["Piano keyboard", "鋼琴鍵盤"])}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex h-full">
          {whites.map((m) => (
            <Key
              key={m}
              midi={m}
              lit={lit.has(m)}
              next={hint.includes(m)}
              label={p.names ? `${letter(m)}${m % 12 === 0 ? Math.floor(m / 12) - 1 : ""}` : ""}
              keyLetter={p.keys && armed ? keyLabelFor(p.layout ?? "typing", m, { high: p.baseC, low: p.lowC ?? p.baseC - 12 }) : null}
              middle={m === 60}
              onStart={(id, v) => start(id, m, "mouse", v)}
              onEnd={(id) => end(id, m, "mouse")}
              className="h-full flex-1 rounded-b-md border border-gray-300 bg-white"
            />
          ))}
        </div>
        {keys
          .filter((m) => isBlack(m))
          .map((m) => {
            const before = whites.filter((w) => w < m).length;
            return (
              <Key
                key={m}
                midi={m}
                lit={lit.has(m)}
                next={hint.includes(m)}
                label=""
                keyLetter={p.keys && armed ? keyLabelFor(p.layout ?? "typing", m, { high: p.baseC, low: p.lowC ?? p.baseC - 12 }) : null}
                onStart={(id, v) => start(id, m, "mouse", v)}
                onEnd={(id) => end(id, m, "mouse")}
                className="absolute top-0 h-[60%] -translate-x-1/2 rounded-b-md bg-gray-900"
                style={{ left: `${(before / W) * 100}%`, width: `${(0.62 / W) * 100}%` }}
                black
              />
            );
          })}
      </div>
      </div>
    </div>
  );
}

function Key({
  midi,
  lit,
  next,
  label,
  keyLetter,
  middle,
  black,
  className,
  style,
  onStart,
  onEnd,
}: {
  midi: number;
  lit: boolean;
  /** the key to play next (a Learn to Play hint) */
  next?: boolean;
  label: string;
  keyLetter: string | null;
  middle?: boolean;
  black?: boolean;
  className: string;
  style?: React.CSSProperties;
  /** `velocity`: how hard (from where on the key it was pressed, or a pen's pressure); none = the loudness setting */
  onStart: (id: string, velocity?: number) => void;
  onEnd: (id: string) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${noteName(midi)}${middle ? ", middle C" : ""}`}
      onPointerDown={(e) => {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* the pointer is gone already */
        }
        onStart(`p${e.pointerId}`, pressVelocity(e));
      }}
      onPointerUp={(e) => onEnd(`p${e.pointerId}`)}
      onPointerCancel={(e) => onEnd(`p${e.pointerId}`)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
          e.preventDefault();
          onStart("k");
        }
      }}
      onKeyUp={(e) => (e.key === "Enter" || e.key === " ") && onEnd("k")}
      style={style}
      className={`${className} flex flex-col items-center justify-end pb-1 text-[10px] leading-tight transition-colors duration-75 ${
        lit ? (black ? "bg-(--lk-accent)!" : "bg-rose-200!") : ""
      } ${next && !lit ? "ring-3 ring-sky-400 ring-inset" : ""} ${black ? "z-10 text-white/80" : "text-gray-500"} focus-visible:outline-2 focus-visible:outline-(--lk-accent)`}
    >
      {keyLetter && <span className={`font-mono font-semibold ${black ? "text-white" : "text-gray-800"}`}>{keyLetter}</span>}
      {label && <span className={middle ? "font-semibold text-(--lk-accent)" : ""}>{label}</span>}
    </button>
  );
}
