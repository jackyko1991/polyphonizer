/**
 * The virtual keyboard: play with the mouse or a finger, the computer keyboard (home row = white keys, the row above
 * = black keys, Z / X = octave, C / V = softer / louder, held Space = sustain pedal) or a MIDI keyboard. Every note
 * goes out on the note stream (noteInput.ts) for step entry and the Play lessons.
 */
import { useLang } from "@learnkit/web";
import { ChevronLeft, ChevronRight, Keyboard as KeysIcon, Music2, Type } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, IconButton } from "../Button.tsx";
import { CHECK, FIELD } from "../ui.ts";
import { noteOn, prepare } from "./liveSound.ts";
import { isBlack, KEY_OFFSETS, keyLabel, keysBetween, letter, noteName, RANGES } from "./music.ts";
import { publishNote, type NoteSource } from "./noteInput.ts";
import { setRunning } from "./toolboxState.ts";

/** sounds to play with: General MIDI programs */
export const KEYBOARD_SOUNDS: [number, readonly [string, string]][] = [
  [0, ["Piano", "鋼琴"]],
  [4, ["Electric piano", "電鋼琴"]],
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
  program: number;
  baseC: number;
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

/** is the user typing somewhere (then the computer keys don't play) */
const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!t.closest(".cm-editor"));

export default function KeyboardTool() {
  const { pick } = useLang();
  const [p, setP] = useState(load);
  const [armed, setArmed] = useState(false);
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
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      if (e.code === "Escape") return setArmed(false);
      const off = KEY_OFFSETS[e.code];
      if (off !== undefined) {
        e.preventDefault();
        if (e.repeat) return;
        const midi = prefs.current.baseC + off;
        codeMidi.set(e.code, midi);
        start(e.code, midi, "keys");
      } else if (e.code === "KeyZ" || e.code === "KeyX") {
        e.preventDefault();
        if (!e.repeat) update({ baseC: Math.min(96, Math.max(24, prefs.current.baseC + (e.code === "KeyX" ? 12 : -12))) });
      } else if (e.code === "KeyC" || e.code === "KeyV") {
        e.preventDefault();
        if (!e.repeat)
          update({ velocity: Math.round(Math.min(1, Math.max(0.2, prefs.current.velocity + (e.code === "KeyV" ? 0.1 : -0.1))) * 10) / 10 });
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
      <div className="flex flex-wrap items-center gap-2">
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
        {"requestMIDIAccess" in navigator && (
          <Button variant={midiState === "on" ? "on" : "secondary"} onClick={() => setMidiState((s) => (s === "on" ? "off" : "on"))}>
            MIDI
          </Button>
        )}
        {midiState === "none" && <span className="text-xs text-red-700">{pick(["No MIDI access", "無法使用 MIDI"])}</span>}
        <span className="ml-auto text-xs text-gray-500">
          {armed
            ? pick([
                `A S D F G H J K = C D E F G A B C · W E T Y U = black keys · Z/X octave (C${p.baseC / 12 - 1}) · C/V loudness ${Math.round(p.velocity * 100)}% · Space = pedal`,
                `A S D F G H J K = C D E F G A B C · W E T Y U = 黑鍵 · Z/X 換八度（C${p.baseC / 12 - 1}）· C/V 音量 ${Math.round(p.velocity * 100)}% · 空白鍵 = 踏板`,
              ])
            : pick(["Click the keys, or turn on the computer keys", "點按琴鍵，或開啟電腦鍵盤彈奏"])}
        </span>
      </div>
      <div
        className="relative min-h-[90px] flex-1 touch-none select-none"
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
              label={p.names ? `${letter(m)}${m % 12 === 0 ? Math.floor(m / 12) - 1 : ""}` : ""}
              keyLetter={p.keys && armed ? keyLabel(m, p.baseC) : null}
              middle={m === 60}
              onStart={(id) => start(id, m, "mouse")}
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
                label=""
                keyLetter={p.keys && armed ? keyLabel(m, p.baseC) : null}
                onStart={(id) => start(id, m, "mouse")}
                onEnd={(id) => end(id, m, "mouse")}
                className="absolute top-0 h-[60%] -translate-x-1/2 rounded-b-md bg-gray-900"
                style={{ left: `${(before / W) * 100}%`, width: `${(0.62 / W) * 100}%` }}
                black
              />
            );
          })}
      </div>
    </div>
  );
}

function Key({
  midi,
  lit,
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
  label: string;
  keyLetter: string | null;
  middle?: boolean;
  black?: boolean;
  className: string;
  style?: React.CSSProperties;
  onStart: (id: string) => void;
  onEnd: (id: string) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${noteName(midi)}${middle ? ", middle C" : ""}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onStart(`p${e.pointerId}`);
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
      } ${black ? "z-10 text-white/80" : "text-gray-500"} focus-visible:outline-2 focus-visible:outline-(--lk-accent)`}
    >
      {keyLetter && <span className={`font-mono font-semibold ${black ? "text-white" : "text-gray-800"}`}>{keyLetter}</span>}
      {label && <span className={middle ? "font-semibold text-(--lk-accent)" : ""}>{label}</span>}
    </button>
  );
}
