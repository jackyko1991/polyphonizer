/**
 * Transcribe: a PDF, a photo of a page, a recording or a video becomes notes, through one of three routes (routes.ts):
 * this browser, your own runner, or the Polyphonizer service. The result (MusicXML or MIDI) is imported like any file.
 */
import { useLang } from "@learnkit/web";
import { AudioLines, FileMusic, Laptop, Server, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../Button.tsx";
import { BUTTON, PRIMARY } from "../ui.ts";
import { backendOk, deviceName, estimateSeconds, jobKind, loadBackend, pdfPageCount, progressAt, routesFor, RUNNER_URL, runJob, runnerStatus, saveBackend, type Backend, type Instrument, type RouteId, type RunnerStatus } from "./routes.ts";
import { Badge, COMING_SOON } from "../Badge.tsx";
import RunnerSetup from "../RunnerSetup.tsx";

const ROUTES: Record<RouteId, { icon: typeof Laptop; name: readonly [string, string]; about: readonly [string, string] }> = {
  browser: {
    icon: AudioLines,
    name: ["This browser", "這個瀏覽器"],
    about: ["Free; the recording never leaves your device. Recordings only, one instrument or voice at a time.", "免費；錄音不會離開你的裝置。只限錄音，一次一種樂器或人聲。"],
  },
  runner: {
    icon: Laptop,
    name: ["My computer or my server", "我的電腦或我的伺服器"],
    about: [
      "Free and private: start the runner with pixi run runner in the Polyphonizer folder (it uses the GPU when there is one: NVIDIA, or a Mac's). Or give the address of the same runner on a server of yours: a VPS with a GPU, a Mac at home, a Space.",
      "免費且私密：在 Polyphonizer 資料夾執行 pixi run runner 啟動執行器（有 GPU 時會使用：NVIDIA 或 Mac 的 GPU）。或填入你自己伺服器上同一個執行器的位址：有 GPU 的 VPS、家裡的 Mac、Space。",
    ],
  },
  service: {
    icon: Server,
    name: ["Polyphonizer service", "Polyphonizer 服務"],
    about: ["The same, run for you on our server, as part of Pro.", "同樣的功能，由我們的伺服器代為執行，屬於 Pro 方案。"],
  },
};
const WHY: Record<string, readonly [string, string]> = {
  "not-here": ["Reading pages needs the runner or the service.", "讀取樂譜頁面需要執行器或服務。"],
  loading: ["The in-browser model is not installed yet (coming next).", "瀏覽器內的模型尚未安裝（即將推出）。"],
  "not-running": [
    "Nothing answers there yet: start the runner (below). This finds it by itself.",
    "那裡還沒有回應：請啟動執行器（見下方）。這裡會自動找到它。",
  ],
  "no-engine": ["Running, but without an engine for this (for recordings: pixi run -e audio audio-setup, then restart it).", "正在執行，但沒有處理這類檔案的引擎（錄音：執行 pixi run -e audio audio-setup，再重新啟動）。"],
  coming: ["Not open yet.", "尚未開放。"],
};

const INSTRUMENT_KEY = "polyphonizer.transcribe.instrument";

export default function TranscribeDialog({ file: initial, onDone, onClose }: { file?: File | null; onDone: (f: File) => void; onClose: () => void }) {
  const { pick } = useLang();
  const [file, setFile] = useState<File | null>(initial ?? null);
  const [runner, setRunner] = useState<RunnerStatus | null>(null);
  // where "my computer or my server" is: the runner on this computer unless changed (kept in this browser)
  const [backend, setBackend] = useState<Backend>(loadBackend);
  const [draft, setDraft] = useState<Backend>(backend);
  const backendRef = useRef(backend);
  backendRef.current = backend;
  const [checking, setChecking] = useState(false);
  const check = async (b: Backend) => {
    setChecking(true);
    setRunner(await runnerStatus(b.url, fetch, b.token));
    setChecking(false);
  };
  const [route, setRoute] = useState<RouteId | null>(null);
  const [busy, setBusy] = useState(false);
  // while it works: how many pages, the estimate, and the seconds gone
  const [job, setJob] = useState<{ pages: number; estimate: number; start: number } | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!job) return;
    const t = window.setInterval(() => setNow(performance.now()), 250);
    return () => window.clearInterval(t);
  }, [job]);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  // a recording: what it is played on (remembered), and how long it is (for the estimate)
  const [instrument, setInstrument] = useState<Instrument>(() => {
    try {
      return localStorage.getItem(INSTRUMENT_KEY) === "other" ? "other" : "piano";
    } catch {
      return "piano";
    }
  });
  const pickInstrument = (i: Instrument) => {
    setInstrument(i);
    try {
      localStorage.setItem(INSTRUMENT_KEY, i);
    } catch {
      /* storage unavailable */
    }
  };
  const [seconds, setSeconds] = useState<number | undefined>(undefined);
  useEffect(() => {
    setSeconds(undefined);
    if (!file || jobKind(file.name, file.type) !== "transcribe") return;
    const url = URL.createObjectURL(file);
    const media = document.createElement(/^video\//.test(file.type) || /\.(mp4|mov|m4v|mkv|webm)$/i.test(file.name) ? "video" : "audio");
    media.preload = "metadata";
    media.onloadedmetadata = () => (Number.isFinite(media.duration) && setSeconds(media.duration), URL.revokeObjectURL(url));
    media.onerror = () => URL.revokeObjectURL(url);
    media.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void check(loadBackend());
    // while open, look again every few seconds: starting the runner is enough
    const again = window.setInterval(() => void runnerStatus(backendRef.current.url, fetch, backendRef.current.token).then(setRunner), 3000);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => (window.removeEventListener("keydown", esc), window.clearInterval(again));
  }, [onClose]);

  const kind = file ? jobKind(file.name, file.type) : null;
  const routes = kind ? routesFor(kind, { browser: false, runner }) : [];
  const takes = (i: Instrument) => !runner?.instruments?.length || runner.instruments.includes(i);
  const chosen = route && routes.find((r) => r.id === route && r.ready) ? route : routes.find((r) => r.ready)?.id ?? null;
  const take = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setError("");
  };
  const run = async () => {
    if (!file || !kind || chosen !== "runner" || (kind === "transcribe" && !takes(instrument))) return;
    setBusy(true);
    setError("");
    const pages = kind === "omr" && /\.pdf$/i.test(file.name) ? pdfPageCount(new Uint8Array(await file.arrayBuffer())) : 1;
    setJob({ pages, estimate: estimateSeconds(kind, pages, { seconds, device: runner?.device, instrument }), start: performance.now() });
    setNow(performance.now());
    try {
      const out = await runJob(backend.url, kind, file, fetch, backend.token, kind === "transcribe" ? instrument : undefined);
      onDone(new File([out.bytes as BlobPart], out.name));
      onClose();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
      setJob(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[68] flex items-center justify-center bg-black/30 p-4" onClick={onClose} data-testid="transcribe">
      <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={pick(["Transcribe", "轉成樂譜"])}>
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-base font-semibold text-gray-900">{pick(["Transcribe into notes", "轉成音符"])}</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label={pick(["Close", "關閉"])}>
            <Icon icon={X} />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {pick(["A PDF or photo of printed music, or a recording (MP3, WAV …) or video: it comes back as a score you can play and edit.", "印刷樂譜的 PDF 或照片，或錄音（MP3、WAV …）、影片：會轉成可以播放與編輯的樂譜。"])}
        </p>

        {/* the drop zone */}
        <div
          onDragOver={(e) => (e.preventDefault(), setOver(true))}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => (e.preventDefault(), setOver(false), take(e.dataTransfer.files[0]))}
          onClick={() => input.current?.click()}
          className={`mt-3 flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-5 text-center text-sm ${over ? "border-(--lk-accent) bg-rose-50" : "border-gray-300 hover:border-gray-400"}`}
          data-testid="transcribe-drop"
        >
          <Icon icon={file ? FileMusic : Upload} className="h-6 w-6 text-gray-400" />
          {file ? (
            <span className="font-medium break-all text-gray-900">{file.name}</span>
          ) : (
            <span className="text-gray-600">{pick(["Drop a PDF, photo, recording or video here, or click to choose", "把 PDF、照片、錄音或影片拖到這裡，或點一下選擇"])}</span>
          )}
          {file && !kind && <span className="text-xs text-red-700">{pick(["This is not a picture of music or a recording.", "這不是樂譜圖片或錄音。"])}</span>}
          <input ref={input} type="file" hidden accept=".pdf,image/*,audio/*,video/*" onChange={(e) => (take(e.target.files?.[0]), (e.target.value = ""))} />
        </div>

        {/* a recording: piano, or another instrument or voice (two different models) */}
        {kind === "transcribe" && (
          <fieldset className="mt-3" data-testid="transcribe-instrument">
            <legend className="mb-1 text-xs font-medium text-gray-500">{pick(["What is playing", "演奏的是什麼"])}</legend>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["piano", ["Piano", "鋼琴"], ["two staves; chords and both hands", "兩行譜；和弦與雙手"]],
                  ["other", ["Another instrument or voice", "其他樂器或人聲"], ["one line: a melody", "單行：旋律"]],
                ] as const
              ).map(([id, name, hint]) => (
                <label key={id} className={`flex flex-1 cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm ${instrument === id ? "border-(--lk-accent) bg-rose-50/50" : "border-gray-300 hover:border-gray-400"} ${takes(id) ? "" : "opacity-50"}`}>
                  <input type="radio" name="instrument" checked={instrument === id} onChange={() => pickInstrument(id)} className="mt-1" data-testid={`instrument-${id}`} />
                  <span>
                    <b className="font-medium text-gray-900">{pick(name)}</b>
                    <span className="block text-xs text-gray-600">{pick(hint)}</span>
                  </span>
                </label>
              ))}
            </div>
            {!takes(instrument) && <p className="mt-1 text-xs text-amber-800">{pick(["This runner has no engine for that yet.", "這個執行器還沒有這種引擎。"])}</p>}
          </fieldset>
        )}

        {/* the routes */}
        {kind && (
          <fieldset className="mt-3 space-y-2" data-testid="transcribe-routes">
            <legend className="mb-1 text-xs font-medium text-gray-500">{pick(["Where to run it", "在哪裡執行"])}</legend>
            {routes.map((r) => {
              const R = ROUTES[r.id];
              return (
                <div key={r.id}>
                <label className={`flex gap-2 rounded-lg border p-2.5 text-sm ${r.ready ? "cursor-pointer border-gray-300 hover:border-(--lk-accent)" : "border-gray-200 opacity-60"} ${chosen === r.id ? "border-(--lk-accent) bg-rose-50/50" : ""}`}>
                  <input type="radio" name="route" disabled={!r.ready} checked={chosen === r.id} onChange={() => setRoute(r.id)} className="mt-1" />
                  <Icon icon={R.icon} className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                  <span className="min-w-0">
                    <b className="font-medium text-gray-900">{pick(R.name)}</b>
                    {/* the paid service, and what isn't ready yet, say so by name */}
                    {r.id === "service" && <Badge text={["Pro", "Pro"]} pro />}
                    {(r.why === "coming" || r.why === "loading") && <Badge text={COMING_SOON} />}
                    <span className="block text-xs text-gray-600">{pick(R.about)}</span>
                    {!r.ready && r.why && <span className="block text-xs text-amber-800">{pick(WHY[r.why])}</span>}

                    {r.id === "runner" && (
                      // the address (and a token, for a server that asks for one)
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5" onClick={(e) => e.preventDefault()}>
                        <input
                          value={draft.url}
                          onChange={(e) => setDraft({ ...draft, url: e.target.value.trim() })}
                          aria-label={pick(["Address", "位址"])}
                          className={`h-8 min-w-0 flex-1 rounded border px-2 font-mono text-xs ${backendOk(draft.url) ? "border-gray-300" : "border-red-400"}`}
                          data-testid="backend-url"
                        />
                        <input
                          value={draft.token}
                          onChange={(e) => setDraft({ ...draft, token: e.target.value.trim() })}
                          type="password"
                          placeholder={pick(["token (if asked)", "權杖（若需要）"])}
                          aria-label={pick(["Token", "權杖"])}
                          className="h-8 w-32 rounded border border-gray-300 px-2 text-xs"
                          data-testid="backend-token"
                        />
                        <button
                          type="button"
                          disabled={!backendOk(draft.url) || checking}
                          onClick={() => (setBackend(draft), saveBackend(draft), void check(draft))}
                          className="h-8 rounded border border-gray-300 px-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                          data-testid="backend-check"
                        >
                          {checking ? "…" : pick(["Connect", "連線"])}
                        </button>
                        {draft.url !== RUNNER_URL && (
                          <button type="button" onClick={() => setDraft({ url: RUNNER_URL, token: "" })} className="text-xs text-(--lk-accent) hover:underline">
                            {pick(["this computer", "這台電腦"])}
                          </button>
                        )}
                        <a href="#/agents/runner" onClick={onClose} className="basis-full text-xs text-(--lk-accent) hover:underline" data-testid="runner-help">
                          {pick(["How to run it on your computer, a server or a Hugging Face Space →", "如何在你的電腦、伺服器或 Hugging Face Space 上執行 →"])}
                        </a>
                        {runner && (
                          <span className="basis-full text-xs text-emerald-700" data-testid="runner-connected">
                            ✓ {pick(["Connected", "已連線"])} · {[runner.omr && pick(["reads pages", "讀譜"]), runner.transcribe && pick(["transcribes", "採譜"])].filter(Boolean).join(" · ") || pick(["no engine yet", "還沒有引擎"])}
                            {runner.transcribe && deviceName(runner.device) && ` · ${pick(["on", "使用"])} ${pick(deviceName(runner.device)!)}`}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </label>
                {/* nothing answers, or no engine for this: how to start (or set up) the runner */}
                {r.id === "runner" && (r.why === "not-running" || r.why === "no-engine") && (
                  <div className="mt-1.5">
                    <RunnerSetup need={[kind === "omr" ? "omr" : "audio"]} />
                  </div>
                )}
                </div>
              );
            })}
          </fieldset>
        )}
        {job && (
          // the estimate fills the bar to 95 %; the answer finishes it
          <div className="mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressAt((now - job.start) / 1000, job.estimate))} data-testid="transcribe-progress">
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-(--lk-accent) transition-[width] duration-300" style={{ width: `${progressAt((now - job.start) / 1000, job.estimate)}%` }} />
            </div>
            <p className="mt-1 flex justify-between text-xs text-gray-600 tabular-nums">
              <span>
                {kind === "omr"
                  ? pick([`Reading ${job.pages} page${job.pages > 1 ? "s" : ""}…`, `正在讀取 ${job.pages} 頁…`])
                  : pick(["Listening and writing the notes…", "正在聆聽並寫下音符…"])}
              </span>
              <span>
                {Math.round((now - job.start) / 1000)} s · {pick(["about", "約"])} {job.estimate >= 90 ? `${Math.round(job.estimate / 60)} min` : `${job.estimate} s`}
              </span>
            </p>
          </div>
        )}
        {error && <p className="mt-2 rounded bg-red-50 px-2 py-1.5 text-sm text-red-800">{error}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className={BUTTON}>
            {pick(["Cancel", "取消"])}
          </button>
          <button onClick={() => void run()} disabled={!chosen || busy || (kind === "transcribe" && !takes(instrument))} className={PRIMARY} data-testid="transcribe-run">
            {busy ? pick(["Working…", "處理中…"]) : pick(["Transcribe", "轉成樂譜"])}
          </button>
        </div>
      </div>
    </div>
  );
}
