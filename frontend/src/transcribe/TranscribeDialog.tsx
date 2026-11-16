/**
 * Transcribe: a PDF, a photo of a page, a recording or a video becomes notes, through one of three routes (routes.ts):
 * this browser, your own runner, or the Polyphonizer service. The result (MusicXML or MIDI) is imported like any file.
 */
import { useLang } from "@learnkit/web";
import { AudioLines, FileMusic, Laptop, Server, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../Button.tsx";
import { BUTTON, PRIMARY } from "../ui.ts";
import { backendOk, jobKind, loadBackend, routesFor, RUNNER_URL, runJob, runnerStatus, saveBackend, type Backend, type RouteId, type RunnerStatus } from "./routes.ts";

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
      "Free and private: start the runner with pixi run runner in the Polyphonizer folder, like Ollama. Or give the address of your own server or Space that speaks the same protocol.",
      "免費且私密：在 Polyphonizer 資料夾執行 pixi run runner 啟動執行器，像 Ollama 一樣；或填入你自己的伺服器或 Space 位址（同樣的協定）。",
    ],
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
  "not-running": ["Nothing answers at that address.", "那個位址沒有回應。"],
  "no-engine": ["Running, but without an engine for this.", "正在執行，但沒有處理這類檔案的引擎。"],
  coming: ["Coming later.", "之後推出。"],
};

export default function TranscribeDialog({ file: initial, onDone, onClose }: { file?: File | null; onDone: (f: File) => void; onClose: () => void }) {
  const { pick } = useLang();
  const [file, setFile] = useState<File | null>(initial ?? null);
  const [runner, setRunner] = useState<RunnerStatus | null>(null);
  // where "my computer or my server" is: the runner on this computer unless changed (kept in this browser)
  const [backend, setBackend] = useState<Backend>(loadBackend);
  const [draft, setDraft] = useState<Backend>(backend);
  const [checking, setChecking] = useState(false);
  const check = async (b: Backend) => {
    setChecking(true);
    setRunner(await runnerStatus(b.url, fetch, b.token));
    setChecking(false);
  };
  const [route, setRoute] = useState<RouteId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void check(loadBackend());
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
      const out = await runJob(backend.url, kind, file, fetch, backend.token);
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
                        {runner && <span className="basis-full text-xs text-emerald-700">✓ {pick(["Connected", "已連線"])} · {[runner.omr && pick(["reads pages", "讀譜"]), runner.transcribe && pick(["transcribes", "採譜"])].filter(Boolean).join(" · ") || pick(["no engine yet", "還沒有引擎"])}</span>}
                      </span>
                    )}
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
