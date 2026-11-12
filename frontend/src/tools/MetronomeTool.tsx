/** The practice metronome's panel: tempo, tap, beats and subdivision, accents, sound, and a pulse to watch. */
import { useLang } from "@learnkit/web";
import { Hand, Minus, Play, Plus, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "../Button.tsx";
import { FIELD } from "../ui.ts";
import { metronome, onMetronome, onTick, setMetronome, type MetronomeState } from "./metronome.ts";
import { nextAccent, withBeats } from "./metronomeCore.ts";
import { tapTempo } from "./music.ts";

const SUBS: [1 | 2 | 3 | 4, readonly [string, string]][] = [
  [1, ["Beats (quarter notes)", "拍（四分音符）"]],
  [2, ["Eighths", "八分音符"]],
  [3, ["Triplets", "三連音"]],
  [4, ["Sixteenths", "十六分音符"]],
];
const HEAVY: ["bar" | "beat" | "none", readonly [string, string]][] = [
  ["bar", ["First note of the bar", "每小節第一拍"]],
  ["beat", ["First note of every beat", "每一拍的第一個音"]],
  ["none", ["None (all even)", "無（全部一樣）"]],
];

/** one beat's notes, drawn: a quarter, two eighths, three eighths under a 3, or four sixteenths (beamed) */
function BeatNotes({ n }: { n: 1 | 2 | 3 | 4 }) {
  const gap = 9;
  const w = 8 + (n - 1) * gap + 6;
  const xs = Array.from({ length: n }, (_, i) => 5 + i * gap);
  const stem = (x: number) => x + 3.3;
  return (
    <svg viewBox={`0 0 ${w} 26`} className="h-6 shrink-0" style={{ width: (w / 26) * 24 }} aria-hidden fill="currentColor">
      {n === 3 && (
        <text x={(stem(xs[0]) + stem(xs[2])) / 2} y="5.5" fontSize="6.5" textAnchor="middle" fontStyle="italic" fontWeight="600">
          3
        </text>
      )}
      {xs.map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="21.5" rx="3.6" ry="2.6" transform={`rotate(-20 ${x} 21.5)`} />
          <rect x={stem(x) - 0.6} y="8" width="1.2" height="13.5" />
        </g>
      ))}
      {n > 1 && <rect x={stem(xs[0]) - 0.6} y="8" width={stem(xs[n - 1]) - stem(xs[0]) + 1.2} height="2.4" />}
      {n === 4 && <rect x={stem(xs[0]) - 0.6} y="12" width={stem(xs[n - 1]) - stem(xs[0]) + 1.2} height="2.4" />}
    </svg>
  );
}
/** Italian tempo names, roughly */
const TEMPO_NAMES: [number, string][] = [
  [40, "Grave"],
  [55, "Largo"],
  [66, "Adagio"],
  [76, "Andante"],
  [108, "Moderato"],
  [120, "Allegretto"],
  [156, "Allegro"],
  [176, "Vivace"],
  [200, "Presto"],
  [999, "Prestissimo"],
];

export default function MetronomeTool() {
  const { pick } = useLang();
  const [s, setS] = useState<MetronomeState>(metronome);
  const [beat, setBeat] = useState<number | null>(null);
  const [flash, setFlash] = useState(0);
  const taps = useRef<number[]>([]);
  useEffect(() => onMetronome(setS), []);
  useEffect(
    () =>
      onTick((t) => {
        if (t.sub) return;
        setBeat(t.beat);
        setFlash((f) => f + 1);
      }),
    [],
  );
  useEffect(() => {
    if (!s.running) setBeat(null);
  }, [s.running]);
  const bpm = (v: number) => setMetronome({ bpm: Math.round(Math.min(300, Math.max(20, v))) });
  const tempoName = TEMPO_NAMES.find(([max]) => s.bpm < max)?.[1] ?? "";

  return (
    <div className="flex h-full flex-wrap items-start gap-x-8 gap-y-3" data-testid="metronome-tool">
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          icon={s.running ? Square : Play}
          onClick={() => setMetronome({ running: !s.running })}
          className="h-12! px-4! text-base!"
          data-testid="metro-start"
        >
          {s.running ? pick(["Stop", "停止"]) : pick(["Start", "開始"])}
        </Button>
        <IconButton icon={Minus} label="−1" variant="secondary" onClick={() => bpm(s.bpm - 1)} />
        <div className="w-24 text-center">
          <input
            type="number"
            min={20}
            max={300}
            value={s.bpm}
            onChange={(e) => bpm(Number(e.target.value) || s.bpm)}
            className="w-full bg-transparent text-center text-4xl font-semibold text-gray-900 tabular-nums outline-none"
            aria-label="BPM"
            data-testid="metro-bpm"
          />
          <p className="text-[11px] text-gray-500">
            BPM · <i>{tempoName}</i>
          </p>
        </div>
        <IconButton icon={Plus} label="+1" variant="secondary" onClick={() => bpm(s.bpm + 1)} />
        <Button
          icon={Hand}
          onClick={() => {
            const r = tapTempo(taps.current, performance.now());
            taps.current = r.times;
            if (r.bpm) bpm(r.bpm);
          }}
          title={pick(["Tap the beat a few times", "跟著拍子點幾下"])}
        >
          {pick(["Tap", "點拍"])}
        </Button>
      </div>

      <div className="flex min-w-[16rem] flex-1 flex-col gap-2">
        <input
          type="range"
          min={20}
          max={300}
          value={s.bpm}
          onChange={(e) => bpm(Number(e.target.value))}
          aria-label="BPM"
          className="w-full accent-(--lk-accent)"
        />
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
          <label className="flex items-center gap-1.5">
            {pick(["Beats per bar", "每小節拍數"])}
            <select value={s.beats} onChange={(e) => setMetronome(withBeats(s, Number(e.target.value)))} className={FIELD}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="inline-flex rounded-md border border-gray-300 p-0.5" role="radiogroup" aria-label={pick(["Subdivision", "細分"])}>
            {SUBS.map(([v, name]) => (
              <button
                key={v}
                role="radio"
                aria-checked={s.sub === v}
                onClick={() => setMetronome({ sub: v })}
                title={pick(name)}
                className={`inline-flex h-8 items-center gap-1 rounded px-2 text-xs ${s.sub === v ? "bg-(--lk-accent) text-white" : "text-gray-700 hover:bg-gray-100"}`}
                data-testid={`sub-${v}`}
              >
                <BeatNotes n={v} />
                <span className="hidden sm:inline">{pick(name).replace(/ \(.*\)|（.*）/, "")}</span>
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
            {pick(["Heavy", "重音"])}
            <select
              value={s.heavy ?? "bar"}
              onChange={(e) => setMetronome({ heavy: e.target.value as "bar" | "beat" | "none" })}
              className={FIELD}
              aria-label={pick(["Which note is played heavier", "哪個音較重"])}
              data-testid="heavy"
            >
              {HEAVY.map(([v, name]) => (
                <option key={v} value={v}>
                  {pick(name)}
                </option>
              ))}
            </select>
          </label>
          <select
            value={s.sound}
            onChange={(e) => setMetronome({ sound: e.target.value as MetronomeState["sound"] })}
            className={FIELD}
            aria-label={pick(["Sound", "聲音"])}
          >
            <option value="wood">{pick(["Woodblock", "木魚"])}</option>
            <option value="click">{pick(["Click", "滴答"])}</option>
            <option value="beep">{pick(["Beep", "嗶聲"])}</option>
          </select>
          <label className="flex items-center gap-1.5">
            {pick(["Volume", "音量"])}
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={s.volume}
              onChange={(e) => setMetronome({ volume: Number(e.target.value) })}
              className="w-24 accent-(--lk-accent)"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[11px] text-gray-500">{pick(["Click a beat: accent · normal · silent", "點拍子：重音 · 一般 · 靜音"])}</p>
        <div className="flex gap-1.5" data-testid="metro-beats">
          {Array.from({ length: s.beats }, (_, i) => {
            const a = s.accents[i] ?? "normal";
            const now = beat === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setMetronome({ accents: s.accents.map((x, j) => (j === i ? nextAccent(x) : x)) })}
                aria-label={`${pick(["Beat", "第"])} ${i + 1}${pick(["", " 拍"])}: ${a}`}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-transform duration-100 ${
                  a === "accent" ? "border-(--lk-accent)" : a === "normal" ? "border-gray-400" : "border-dashed border-gray-300"
                } ${now ? (a === "mute" ? "scale-110 bg-gray-200" : "scale-110 bg-(--lk-accent) text-white") : "bg-white text-gray-600"}`}
              >
                {a === "mute" ? "·" : i + 1}
              </button>
            );
          })}
        </div>
        {/* a big pulse for watching from the stand */}
        <span
          key={flash}
          className={`mt-1 h-1.5 rounded-full ${s.running ? "animate-[pz-pulse_0.25s_ease-out] bg-(--lk-accent)" : "bg-gray-200"}`}
        />
      </div>
    </div>
  );
}
