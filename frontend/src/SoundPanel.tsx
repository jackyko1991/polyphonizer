/**
 * Pro sound settings (a popover from the score toolbar): samples or synth, sample set, tuning, reverb, and for each
 * part its instrument, volume and mute. Open to everyone for now; marked Pro for when accounts arrive.
 */
import { X } from "lucide-react";
import { Icon } from "./Button.tsx";
import { useLang } from "@learnkit/web";
import { DEFAULT_SOUND, GM_FAMILIES, gmLabel, programOf, setPartSound, setSoundSettings, useSoundSettings, type Kit } from "./engine/sound.ts";
import { fill } from "./strings.ts";

const A4_PRESETS = [415, 430, 440, 441, 442, 443];

export default function SoundPanel({ parts, programs, onClose }: { parts: string[]; programs: (number | null)[]; onClose: () => void }) {
  const { t, pick } = useLang();
  const s = useSoundSettings();
  const field = "rounded border border-gray-300 bg-white px-1.5 py-0.5 text-sm";
  return (
    <div
      className="absolute right-0 z-30 mt-1 w-[min(26rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-lg"
      data-testid="sound-panel"
      role="dialog"
      aria-label={t("sound.title")}
    >
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-gray-900">{t("sound.title")}</h2>
        <span className="rounded-full bg-(--lk-accent) px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">Pro</span>
        <button onClick={onClose} aria-label={t("sound.close")} className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700">
          <Icon icon={X} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
        <span className="text-gray-600">{t("sound.engine")}</span>
        <select value={s.engine} onChange={(e) => setSoundSettings({ engine: e.target.value as "samples" | "synth" })} className={field}>
          <option value="samples">{t("sound.samples")}</option>
          <option value="synth">{t("sound.synth")}</option>
        </select>
        {s.engine === "samples" && (
          <>
            <span className="text-gray-600">{t("sound.kit")}</span>
            <select value={s.kit} onChange={(e) => setSoundSettings({ kit: e.target.value as Kit })} className={field}>
              <option value="MusyngKite">{t("sound.kit.rich")}</option>
              <option value="FluidR3_GM">{t("sound.kit.light")}</option>
            </select>
          </>
        )}
        <span className="text-gray-600">{t("sound.a4")}</span>
        <span className="flex items-center gap-1.5">
          <input
            type="number"
            min={400}
            max={480}
            step={0.5}
            value={s.a4}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 400 && v <= 480) setSoundSettings({ a4: v });
            }}
            className={`${field} w-20`}
            data-testid="a4"
          />
          Hz
          <select value="" onChange={(e) => e.target.value && setSoundSettings({ a4: Number(e.target.value) })} className={`${field} text-gray-500`} aria-label={t("sound.a4")}>
            <option value="">▾</option>
            {A4_PRESETS.map((hz) => (
              <option key={hz} value={hz}>
                {hz} Hz{hz === 415 ? ` · ${t("sound.baroque")}` : ""}
              </option>
            ))}
          </select>
        </span>
        <span className="text-gray-600">{t("sound.reverb")}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={s.reverb}
          onChange={(e) => setSoundSettings({ reverb: Number(e.target.value) })}
          aria-label={t("sound.reverb")}
        />
      </div>

      {parts.length > 0 && (
        <>
          <h3 className="mt-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">{t("sound.parts")}</h3>
          <ul className="mt-2 space-y-2" data-testid="sound-parts">
            {parts.map((name, i) => {
              const ps = s.parts[name] ?? {};
              // the score's instrument (or the guess from the part's name) when nothing is chosen here
              const own = programOf(name, programs[i], { ...s, parts: {} });
              return (
                <li key={`${i}-${name}`} className="rounded-md border border-gray-200 px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium text-gray-800">{name}</span>
                    <label className="flex items-center gap-1 text-xs text-gray-600">
                      <input type="checkbox" checked={!!ps.mute} onChange={(e) => setPartSound(name, { mute: e.target.checked })} />
                      {t("sound.mute")}
                    </label>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <select
                      value={ps.program ?? ""}
                      onChange={(e) => setPartSound(name, { program: e.target.value === "" ? undefined : Number(e.target.value) })}
                      className={`${field} min-w-0 flex-1`}
                      aria-label={fill(t("sound.instrumentOf"), { part: name })}
                    >
                      <option value="">{fill(t("sound.auto"), { name: gmLabel(own) })}</option>
                      {GM_FAMILIES.map((fam, f) => (
                        <optgroup key={f} label={pick(fam)}>
                          {Array.from({ length: 8 }, (_, k) => f * 8 + k).map((p) => (
                            <option key={p} value={p}>
                              {gmLabel(p)}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.05}
                      value={ps.volume ?? 1}
                      onChange={(e) => setPartSound(name, { volume: Number(e.target.value) })}
                      className="w-20"
                      aria-label={fill(t("sound.volumeOf"), { part: name })}
                      title={`${Math.round((ps.volume ?? 1) * 100)}%`}
                    />
                  </div>
                  {programOf(name, own, s) !== own && <p className="mt-0.5 text-[11px] text-gray-400">{fill(t("sound.scoreSays"), { name: gmLabel(own) })}</p>}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
        <span className="flex-1">{t(s.engine === "samples" ? "sound.samplesNote" : "sound.synthNote")}</span>
        <button onClick={() => setSoundSettings({ ...DEFAULT_SOUND, parts: {} })} className="shrink-0 text-(--lk-accent) hover:underline">
          {t("sound.reset")}
        </button>
      </div>
    </div>
  );
}
