/**
 * "How to start the runner", as Tensorizer's Backend ▸ Local shows it: Windows / macOS / Linux, install pixi, download
 * the runner (a zip published by .github/workflows/runner-release.yml; no git needed), the one-time engine setups,
 * then `pixi run runner`. On the Runner page, in the AI panel when no runner answers, and in Transcribe.
 */
import { ShellCommand, useLang } from "@learnkit/web";
import { useState, type ReactNode } from "react";

type Os = "windows" | "mac" | "linux";
const RELEASES = "https://github.com/jackyko1991/polyphonizer/releases/tag/runner-latest";
const RUNNER_ZIP = "https://github.com/jackyko1991/polyphonizer/releases/download/runner-latest/polyphonizer-runner.zip";
export const PIXI_INSTALL: Record<Os, string> = {
  windows: 'powershell -ExecutionPolicy ByPass -c "irm -useb https://pixi.sh/install.ps1 | iex"',
  mac: "curl -fsSL https://pixi.sh/install.sh | sh",
  linux: "curl -fsSL https://pixi.sh/install.sh | sh",
};
export const DOWNLOAD: Record<Os, string> = {
  windows: `irm ${RUNNER_ZIP} -OutFile polyphonizer-runner.zip; Expand-Archive polyphonizer-runner.zip . -Force; cd polyphonizer-runner`,
  mac: `curl -fsSL -o polyphonizer-runner.zip ${RUNNER_ZIP} && unzip -o polyphonizer-runner.zip && cd polyphonizer-runner`,
  linux: `curl -fsSL -o polyphonizer-runner.zip ${RUNNER_ZIP} && unzip -o polyphonizer-runner.zip && cd polyphonizer-runner`,
};

/** this visitor's system (phones and others: macOS's steps, the same as Linux's) */
function guessOs(): Os {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  return /Windows/i.test(ua) ? "windows" : /Linux|X11/i.test(ua) && !/Android/i.test(ua) ? "linux" : "mac";
}

function Step({ n, label, command, children }: { n: number; label: string; command: string; children?: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-gray-700">
        {n}. {label}
      </p>
      <ShellCommand text={command} />
      {children}
    </div>
  );
}

/**
 * `need`: what the visitor is about to do (reading pages, transcribing recordings), whose one-time setup is shown;
 * both when absent. `open`: unfolded at first.
 */
export default function RunnerSetup({ need, open = false, title }: { need?: ("omr" | "audio")[]; open?: boolean; title?: string }) {
  const { pick } = useLang();
  const [os, setOs] = useState<Os>(guessOs);
  const engines = need ?? ["omr", "audio"];
  return (
    <details className="rounded-lg border border-gray-200 bg-white text-left" open={open} data-testid="runner-setup">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-800">{title ?? pick(["How to start the runner", "如何啟動執行器"])}</summary>
      <div className="space-y-3 border-t border-gray-100 px-3 py-3 text-xs">
        <div className="flex gap-1" role="tablist">
          {(["windows", "mac", "linux"] as const).map((o) => (
            <button
              key={o}
              type="button"
              role="tab"
              aria-selected={os === o}
              onClick={() => setOs(o)}
              className={`rounded px-2 py-0.5 ${os === o ? "bg-rose-50 font-medium text-rose-800" : "text-gray-500 hover:text-gray-800"}`}
            >
              {o === "windows" ? "Windows" : o === "mac" ? "macOS" : "Linux"}
            </button>
          ))}
        </div>
        <Step n={1} label={pick(["Install pixi (once)", "安裝 pixi（一次）"])} command={PIXI_INSTALL[os]} />
        <Step n={2} label={pick(["Download the runner (once)", "下載執行器（一次）"])} command={DOWNLOAD[os]}>
          <p className="text-gray-500">
            {pick(["Or download polyphonizer-runner.zip yourself from", "或自行從以下位置下載 polyphonizer-runner.zip："])}{" "}
            <a href={RELEASES} target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
              GitHub Releases ↗
            </a>
          </p>
        </Step>
        {engines.length > 0 && (
        <div className="space-y-1">
          <p className="text-gray-700">3. {pick(["Set up what you need (once; each downloads its models)", "安裝你需要的功能（一次；各自會下載模型）"])}</p>
          {engines.includes("omr") && (
            <>
              <p className="text-gray-500">{pick(["PDFs and photos of printed music (about 1 GB):", "印刷樂譜的 PDF 與照片（約 1 GB）："])}</p>
              <ShellCommand text="pixi run -e omr omr-setup" />
            </>
          )}
          {engines.includes("audio") && (
            <>
              <p className="text-gray-500">
                {pick([
                  `Recordings and videos (about 2 GB; uses ${os === "mac" ? "the Mac's GPU" : "an NVIDIA GPU when there is one"}):`,
                  `錄音與影片（約 2 GB；${os === "mac" ? "會使用 Mac 的 GPU" : "有 NVIDIA GPU 時會使用"}）：`,
                ])}
              </p>
              <ShellCommand text="pixi run -e audio audio-setup" />
            </>
          )}
          {!need && <p className="text-gray-500">{pick(["The AI agent needs neither.", "AI 代理兩者都不需要。"])}</p>}
        </div>
        )}
        <Step n={engines.length ? 4 : 3} label={pick(["Start the runner (each time, in that folder)", "啟動執行器（每次，在該資料夾中）"])} command="pixi run runner" />
        <p className="text-gray-400">
          {pick([
            "It answers at http://127.0.0.1:8765, where the site looks for it by itself. Already have the repository? pixi run runner in its folder does the same.",
            "它在 http://127.0.0.1:8765 回應，網站會自動在那裡找到它。已經有程式庫？在它的資料夾執行 pixi run runner 也一樣。",
          ])}
        </p>
      </div>
    </details>
  );
}
