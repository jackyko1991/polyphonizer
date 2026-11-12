/**
 * The tuner, two halves: a reference tone to tune by ear (any A4: 440, 442, 415 …; a string of the chosen
 * instrument, two strings together to tune fifths, or any note held as a drone), and Listen, which hears your
 * instrument through the microphone and shows the note and how many cents sharp or flat it is.
 */
import { useLang } from "@learnkit/web";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { setSoundSettings, useSoundSettings } from "../engine/sound.ts";
import { Button } from "../Button.tsx";
import { CHECK, FIELD } from "../ui.ts";
import { listen, type Listening } from "./audioInput.ts";
import { tone } from "./liveSound.ts";
import { midiToHz, nearestNote, noteName, TUNINGS } from "./music.ts";
import { setRunning } from "./toolboxState.ts";

const A4_PRESETS = [440, 442, 443, 415, 432];
type ToneKind = "sine" | "organ" | "instrument";
const INSTRUMENT_PROGRAM: Record<string, number> = {
  violin: 40,
  viola: 41,
  cello: 42,
  bass: 43,
  guitar: 24,
  "guitar-dropd": 24,
  ukulele: 24,
  chromatic: 0,
};

export default function TunerTool() {
  const { pick } = useLang();
  const { a4 } = useSoundSettings();
  const [preset, setPreset] = useState(() => localStorage.getItem("polyphonizer.tuner.preset") ?? "violin");
  const [kind, setKind] = useState<ToneKind>("sine");
  const [fifths, setFifths] = useState(false);
  const [playing, setPlaying] = useState<number[]>([]);
  const [drone, setDrone] = useState(69);
  const stops = useRef<(() => void)[]>([]);
  const tuning = TUNINGS.find((t) => t.id === preset) ?? TUNINGS[0];

  // Listen
  const [mic, setMic] = useState<Listening | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [reading, setReading] = useState<{ midi: number; cents: number; hz: number } | null>(null);
  const [level, setLevel] = useState(0);
  const [inTune, setInTune] = useState<Set<number>>(new Set());
  const smooth = useRef<number[]>([]);
  const steady = useRef<{ midi: number; since: number } | null>(null);

  const stopTone = () => {
    stops.current.forEach((s) => s());
    stops.current = [];
    setPlaying([]);
  };
  const playTone = (notes: number[]) => {
    const same = notes.length === playing.length && notes.every((n) => playing.includes(n));
    stopTone();
    if (same) return;
    const sound = kind === "instrument" ? (INSTRUMENT_PROGRAM[preset] ?? 0) : kind;
    stops.current = notes.map((m) => tone(midiToHz(m, a4), sound));
    setPlaying(notes);
  };
  useEffect(() => stopTone, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // a new A4 or sound: replay what is sounding
    if (playing.length) {
      const notes = playing;
      stops.current.forEach((s) => s());
      const sound = kind === "instrument" ? (INSTRUMENT_PROGRAM[preset] ?? 0) : kind;
      stops.current = notes.map((m) => tone(midiToHz(m, a4), sound));
    }
  }, [a4, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const startMic = async () => {
    setMicError(null);
    try {
      const l = await listen((p, lvl) => {
        setLevel(lvl);
        if (!p || p.clarity < 0.85) {
          smooth.current = [];
          steady.current = null;
          setReading(null);
          return;
        }
        // a short median against vibrato and flicker
        smooth.current = [...smooth.current, p.hz].slice(-5);
        const sorted = [...smooth.current].sort((a, b) => a - b);
        const hz = sorted[Math.floor(sorted.length / 2)];
        const n = nearestNote(hz, a4);
        setReading({ ...n, hz });
        if (Math.abs(n.cents) <= 5) {
          if (steady.current?.midi !== n.midi) steady.current = { midi: n.midi, since: performance.now() };
          else if (performance.now() - steady.current.since > 600) setInTune((s) => (s.has(n.midi) ? s : new Set(s).add(n.midi)));
        } else steady.current = null;
      });
      setMic(l);
    } catch (e) {
      setMicError(e instanceof Error ? e.message : String(e));
    }
  };
  const stopMic = () => {
    mic?.stop();
    setMic(null);
    setReading(null);
    setLevel(0);
  };
  useEffect(() => () => mic?.stop(), [mic]);
  useEffect(() => setRunning("tuner", !!mic || playing.length > 0), [mic, playing.length]);
  useEffect(() => () => setRunning("tuner", false), []);

  const cents = reading?.cents ?? 0;
  const good = reading && Math.abs(cents) <= 5;

  return (
    <div className="grid h-full gap-4 lg:grid-cols-2" data-testid="tuner-tool">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{pick(["Reference tone", "參考音"])}</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
          <label className="flex items-center gap-1.5">
            A4 =
            <input
              type="number"
              min={400}
              max={480}
              step={0.5}
              value={a4}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 400 && v <= 480) setSoundSettings({ a4: v });
              }}
              className={`${FIELD} w-20`}
              aria-label="A4 (Hz)"
              data-testid="tuner-a4"
            />
            Hz
          </label>
          {A4_PRESETS.map((f) => (
            <Button key={f} variant={a4 === f ? "on" : "secondary"} onClick={() => setSoundSettings({ a4: f })} className="px-2!">
              {f}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              setInTune(new Set());
              stopTone();
              try {
                localStorage.setItem("polyphonizer.tuner.preset", e.target.value);
              } catch {
                /* storage unavailable */
              }
            }}
            className={FIELD}
            aria-label={pick(["Instrument", "樂器"])}
          >
            {TUNINGS.map((t) => (
              <option key={t.id} value={t.id}>
                {pick(t.name)}
              </option>
            ))}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value as ToneKind)} className={FIELD} aria-label={pick(["Tone", "音色"])}>
            <option value="sine">{pick(["Pure tone", "純音"])}</option>
            <option value="organ">{pick(["Soft organ", "柔和風琴"])}</option>
            <option value="instrument">{pick(["The instrument", "樂器本身"])}</option>
          </select>
          {tuning.notes.length > 1 && (
            <label className={CHECK}>
              <input type="checkbox" checked={fifths} onChange={(e) => (setFifths(e.target.checked), stopTone())} />
              {pick(["Two strings together", "兩弦同響"])}
            </label>
          )}
        </div>
        <div className="flex flex-wrap gap-2" data-testid="tuner-strings">
          {tuning.notes.length ? (
            (fifths ? tuning.notes.slice(0, -1).map((m, i) => [m, tuning.notes[i + 1]]) : tuning.notes.map((m) => [m])).map((notes) => {
              const on = notes.length === playing.length && notes.every((n) => playing.includes(n));
              return (
                <button
                  key={notes.join("+")}
                  type="button"
                  onClick={() => playTone(notes)}
                  aria-pressed={on}
                  className={`flex h-14 min-w-14 flex-col items-center justify-center rounded-lg border-2 px-3 transition-colors ${
                    on
                      ? "border-(--lk-accent) bg-rose-50 text-(--lk-accent)"
                      : "border-gray-300 bg-white text-gray-800 hover:border-gray-400"
                  }`}
                >
                  <span className="text-base font-semibold">{notes.map((n) => noteName(n).replace(/\d+$/, "")).join(" + ")}</span>
                  <span className="text-[10px] text-gray-500">
                    {notes.map((n) => `${midiToHz(n, a4).toFixed(1)}`).join(" · ")} Hz{" "}
                    {notes.length === 1 && inTune.has(notes[0]) ? "✓" : ""}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={drone}
                onChange={(e) => (setDrone(Number(e.target.value)), stopTone())}
                className={FIELD}
                aria-label={pick(["Note", "音"])}
              >
                {Array.from({ length: 61 }, (_, i) => 36 + i).map((m) => (
                  <option key={m} value={m}>
                    {noteName(m)} · {midiToHz(m, a4).toFixed(2)} Hz
                  </option>
                ))}
              </select>
              <Button icon={Volume2} variant={playing.length ? "on" : "secondary"} onClick={() => playTone([drone])}>
                {playing.length ? pick(["Stop", "停止"]) : pick(["Play (drone)", "播放（持續音）"])}
              </Button>
            </div>
          )}
        </div>
        <p className="text-[11px] text-gray-500">
          {pick([
            "Equal temperament. Strings tuned in pure fifths by ear end slightly wider than these frequencies; that is normal.",
            "以十二平均律計算。用耳朵把弦調成純五度時，會比這些頻率略寬一點，這是正常的。",
          ])}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{pick(["Listen", "聆聽"])}</h3>
          <Button
            icon={mic ? MicOff : Mic}
            variant={mic ? "on" : "secondary"}
            onClick={() => (mic ? stopMic() : void startMic())}
            data-testid="tuner-mic"
          >
            {mic ? pick(["Stop listening", "停止聆聽"]) : pick(["Use the microphone", "使用麥克風"])}
          </Button>
          {mic && <span className="truncate text-xs text-gray-500">{mic.deviceLabel}</span>}
        </div>
        {micError && (
          <p className="text-sm text-red-700">
            {pick(["The microphone is not available: ", "無法使用麥克風："])}
            {micError}
          </p>
        )}
        <div className="flex items-center gap-4">
          <div className="w-28 text-center">
            <p className={`text-4xl font-semibold tabular-nums ${good ? "text-emerald-600" : "text-gray-900"}`} data-testid="tuner-note">
              {reading ? noteName(reading.midi) : "–"}
            </p>
            <p className="text-xs text-gray-500 tabular-nums">
              {reading ? `${reading.hz.toFixed(1)} Hz` : mic ? pick(["play a note", "請拉一個音"]) : ""}
            </p>
          </div>
          {/* the needle: −50 … +50 cents */}
          <div className="relative h-16 flex-1">
            <div className="absolute inset-x-0 top-1/2 h-px bg-gray-300" />
            <div className="absolute top-2 bottom-2 left-1/2 w-[10%] -translate-x-1/2 rounded bg-emerald-100" />
            {[-50, -25, 0, 25, 50].map((c) => (
              <span key={c} className="absolute bottom-0 -translate-x-1/2 text-[10px] text-gray-400" style={{ left: `${50 + c}%` }}>
                {c > 0 ? `+${c}` : c}
              </span>
            ))}
            <div
              className={`absolute top-1 h-10 w-1 -translate-x-1/2 rounded-full transition-[left] duration-100 ${reading ? (good ? "bg-emerald-600" : "bg-(--lk-accent)") : "bg-gray-300"}`}
              style={{ left: `${50 + Math.max(-50, Math.min(50, cents))}%` }}
            />
            <p className="absolute top-0 right-0 text-xs font-medium text-gray-600 tabular-nums">
              {reading
                ? `${cents > 0 ? "+" : ""}${cents.toFixed(0)} ¢ ${cents > 5 ? pick(["sharp", "偏高"]) : cents < -5 ? pick(["flat", "偏低"]) : pick(["in tune", "準"])}`
                : ""}
            </p>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100" aria-label={pick(["Input level", "輸入音量"])}>
          <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-75" style={{ width: `${level * 100}%` }} />
        </div>
        <p className="text-[11px] text-gray-500">
          {pick([
            "One note at a time. Headphones keep the reference tone out of the microphone. An electric violin through an audio interface works too.",
            "一次一個音。戴耳機可避免參考音被麥克風收進去。電子小提琴接上音訊介面也可以。",
          ])}
        </p>
      </section>
    </div>
  );
}
