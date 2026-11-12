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
  [1, ["Beats", "拍"]],
  [2, ["Eighths", "八分音符"]],
  [3, ["Triplets", "三連音"]],
  [4, ["Sixteenths", "十六分音符"]],
];
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
          <select
            value={s.sub}
            onChange={(e) => setMetronome({ sub: Number(e.target.value) as 1 | 2 | 3 | 4 })}
            className={FIELD}
            aria-label={pick(["Subdivision", "細分"])}
          >
            {SUBS.map(([v, name]) => (
              <option key={v} value={v}>
                {pick(name)}
              </option>
            ))}
          </select>
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
