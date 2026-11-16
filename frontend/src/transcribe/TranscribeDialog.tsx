/**
 * Transcribe: a PDF, a photo of a page, a recording or a video becomes notes, through one of three routes (routes.ts):
 * this browser, your own runner, or the Polyphonizer service. The result (MusicXML or MIDI) is imported like any file.
 */
import { useLang } from "@learnkit/web";
import { AudioLines, FileMusic, Laptop, Server, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../Button.tsx";
import { BUTTON, PRIMARY } from "../ui.ts";
import { jobKind, routesFor, RUNNER_URL, runJob, runnerStatus, type RouteId, type RunnerStatus } from "./routes.ts";

const ROUTES: Record<RouteId, { icon: typeof Laptop; name: readonly [string, string]; about: readonly [string, string] }> = {
  browser: {
    icon: AudioLines,
    name: ["This browser", "這個瀏覽器"],
    about: ["Free; the recording never leaves your device. Recordings only, one instrument or voice at a time.", "免費；錄音不會離開你的裝置。只限錄音，一次一種樂器或人聲。"],
  },
  runner: {
    icon: Laptop,
    name: ["My computer (local runner)", "我的電腦（本機執行器）"],
    about: ["Free and private: start it with pixi run runner in the Polyphonizer folder, like Ollama. Reads printed pages and transcribes piano.", "免費且私密：在 Polyphonizer 資料夾執行 pixi run runner 啟動，像 Ollama 一樣。可讀印刷樂譜、為鋼琴採譜。"],
  },
  service: {
    icon: Server,
    name: ["Polyphonizer service", "Polyphonizer 服務"],
    about: ["The same, run for you on our server, as a paid plan. Coming later.", "同樣的功能，由我們的伺服器代為執行，付費方案。之後推出。"],
  },
};
const WHY: Record<string, readonly [string, string]> = {
  "not-here": ["Reading pages needs the runner or the service.", "讀取樂譜頁面需要執行器或服務。"],
  loading: ["The in-browser model is not installed yet (coming next).", "瀏覽器內的模型尚未安裝（即將推出）。"],
  "not-running": ["Not running at 127.0.0.1:8765.", "127.0.0.1:8765 上沒有在執行。"],
  "no-engine": ["Running, but without an engine for this.", "正在執行，但沒有處理這類檔案的引擎。"],
  coming: ["Coming later.", "之後推出。"],
};

export default function TranscribeDialog({ file: initial, onDone, onClose }: { file?: File | null; onDone: (f: File) => void; onClose: () => void }) {
  const { pick } = useLang();
  const [file, setFile] = useState<File | null>(initial ?? null);
  const [runner, setRunner] = useState<RunnerStatus | null>(null);
  const [route, setRoute] = useState<RouteId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void runnerStatus(RUNNER_URL).then(setRunner);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const kind = file ? jobKind(file.name, file.type) : null;
  const routes = kind ? routesFor(kind, { browser: false, runner }) : [];
  const chosen = route && routes.find((r) => r.id === route && r.ready) ? route : routes.find((r) => r.ready)?.id ?? null;
  const take = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setError("");
  };
  const run = async () => {
    if (!file || !kind || chosen !== "runner") return;
    setBusy(true);
    setError("");
    try {
      const out = await runJob(RUNNER_URL, kind, file);
      onDone(new File([out.bytes as BlobPart], out.name));
      onClose();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
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

        {/* the routes */}
        {kind && (
          <fieldset className="mt-3 space-y-2" data-testid="transcribe-routes">
            <legend className="mb-1 text-xs font-medium text-gray-500">{pick(["Where to run it", "在哪裡執行"])}</legend>
            {routes.map((r) => {
              const R = ROUTES[r.id];
              return (
                <label key={r.id} className={`flex gap-2 rounded-lg border p-2.5 text-sm ${r.ready ? "cursor-pointer border-gray-300 hover:border-(--lk-accent)" : "border-gray-200 opacity-60"} ${chosen === r.id ? "border-(--lk-accent) bg-rose-50/50" : ""}`}>
                  <input type="radio" name="route" disabled={!r.ready} checked={chosen === r.id} onChange={() => setRoute(r.id)} className="mt-1" />
                  <Icon icon={R.icon} className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                  <span className="min-w-0">
                    <b className="font-medium text-gray-900">{pick(R.name)}</b>
                    <span className="block text-xs text-gray-600">{pick(R.about)}</span>
                    {!r.ready && r.why && <span className="block text-xs text-amber-800">{pick(WHY[r.why])}</span>}
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}
        {error && <p className="mt-2 rounded bg-red-50 px-2 py-1.5 text-sm text-red-800">{error}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className={BUTTON}>
            {pick(["Cancel", "取消"])}
          </button>
          <button onClick={() => void run()} disabled={!chosen || busy} className={PRIMARY} data-testid="transcribe-run">
            {busy ? pick(["Working…", "處理中…"]) : pick(["Transcribe", "轉成樂譜"])}
          </button>
        </div>
      </div>
    </div>
  );
}
