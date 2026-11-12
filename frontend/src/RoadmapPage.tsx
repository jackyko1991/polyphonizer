/** Roadmap (#/roadmap): what works now and what comes next. Everything here is free. */
import { useLang } from "@learnkit/web";
import type { L } from "./problems.ts";

const ITEMS: [boolean, L, L][] = [
  [true, ["Score editor: scores as Python (music21)", "樂譜編輯器：以 Python（music21）寫樂譜"], ["Engraved live, played back, exported to MusicXML, MIDI and PDF.", "即時排版、播放，可匯出 MusicXML、MIDI 與 PDF。"]],
  [true, ["Import MusicXML, MIDI, ABC, Humdrum", "匯入 MusicXML、MIDI、ABC、Humdrum"], ["Including the MusicXML files many IMSLP and MuseScore scores come with.", "包括許多 IMSLP 與 MuseScore 樂譜附帶的 MusicXML 檔。"]],
  [true, ["Page turns at rests", "在休止處翻頁"], ["A4 pages for the full score or one player's part, with page breaks moved to where there is time to turn.", "總譜或單一分譜的 A4 頁面，換頁移到來得及翻頁的地方。"]],
  [true, ["Learn: counterpoint and arranging, graded by rules", "學習：對位與編曲，由規則評分"], ["Scales, transposition, first species above and below, a duet in thirds and sixths.", "音階、移調、上方與下方的第一類對位、三六度二重奏。"]],
  [false, ["IMSLP import from a link", "從 IMSLP 連結匯入"], ["Find a digital edition first (OpenScore, Mutopia, KernScores), else read the scan; IMSLP's copyright flag is shown.", "先找數位版（OpenScore、Mutopia、KernScores），否則辨識掃描；顯示 IMSLP 的版權標示。"]],
  [false, ["Read printed music from a photo or PDF", "從照片或 PDF 辨識印刷樂譜"], ["Optical music recognition on your own computer (local runner).", "在你自己的電腦上做光學樂譜辨識（本機執行器）。"]],
  [false, ["AI agent in the editor", "編輯器裡的 AI 代理"], ["Edits the score code with you: \"add bowings\", \"move this bar to the next line\", \"arrange for violin, flute and piano\", checked by the same rules.", "和你一起修改樂譜程式碼：「加上弓法」、「把這小節移到下一行」、「改編給小提琴、長笛和鋼琴」，並用同一套規則檢查。"]],
  [false, ["Transcribe a recording", "從錄音轉譜"], ["One melodic line first (violin, flute, voice), in the browser.", "先做單一旋律（小提琴、長笛、人聲），在瀏覽器中執行。"]],
  [false, ["Composer mode", "作曲模式"], ["Compose with me, not \"generate a song\": harmonisations, countermelodies and arrangements you can hear and check.", "和我一起作曲，而不是「生成一首歌」：可聆聽、可檢查的配和聲、對位旋律與編曲。"]],
];

export default function RoadmapPage() {
  const { t, pick } = useLang();
  return (
    <div className="mx-auto max-w-3xl px-5 py-10" data-testid="roadmap">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{t("rm.title")}</h1>
      <p className="mt-3 text-gray-600">{t("rm.intro")}</p>
      <ul className="mt-6 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
        {ITEMS.map(([now, title, body]) => (
          <li key={title[0]} className="flex gap-3 px-5 py-3.5">
            <span className={`mt-0.5 w-4 shrink-0 text-center font-semibold ${now ? "text-emerald-600" : "text-gray-300"}`}>{now ? "✓" : "–"}</span>
            <span>
              <b className="font-semibold text-gray-900">{pick(title)}</b>
              <span className="block text-sm text-gray-600">{pick(body)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
