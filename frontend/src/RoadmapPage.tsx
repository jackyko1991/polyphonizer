/** Roadmap (#/roadmap): what works now and what comes next. Everything here is free. */
import { useLang } from "@learnkit/web";
import type { L } from "./problems.ts";

const ITEMS: [boolean, L, L][] = [
  [true, ["Score editor: scores as Python (music21)", "樂譜編輯器：以 Python（music21）寫樂譜"], ["Engraved live, played back, exported to MusicXML, MIDI and PDF.", "即時排版、播放，可匯出 MusicXML、MIDI 與 PDF。"]],
  [true, ["Import MusicXML, MIDI, ABC, Humdrum", "匯入 MusicXML、MIDI、ABC、Humdrum"], ["Including the MusicXML files many IMSLP and MuseScore scores come with.", "包括許多 IMSLP 與 MuseScore 樂譜附帶的 MusicXML 檔。"]],
  [true, ["Page turns at rests", "在休止處翻頁"], ["A4 pages for the full score or one player's part, with page breaks moved to where there is time to turn.", "總譜或單一分譜的 A4 頁面，換頁移到來得及翻頁的地方。"]],
  [true, ["Learn to Code: counterpoint and arranging, graded by rules", "學寫程式：對位與編曲，由規則評分"], ["Scales, transposition, first species above and below, a duet in thirds and sixths.", "音階、移調、上方與下方的第一類對位、三六度二重奏。"]],
  [true, ["Library: music21's corpus, searchable", "曲庫：可搜尋的 music21 曲庫"], ["15,000 works, from Bach chorales and Mozart quartets to folk tunes. Open one, then change notes bar by bar; edits are kept as code after the original.", "一萬五千部作品，從巴赫聖詠曲、莫札特四重奏到民謠。開啟一首後可逐小節修改音符；修改以程式碼保存在原曲之後。"]],
  [
    true,
    ["Open collections in the Library", "曲庫裡的開放授權曲集"],
    [
      "OpenScore Lieder and String Quartets (CC0), about 1,650 works; Craig Sapp's Humdrum editions of Mozart's piano sonatas and Joplin (CC BY-NC-SA 4.0, non-commercial). Each score is downloaded when you open it and then kept in your browser.",
      "OpenScore 藝術歌曲與弦樂四重奏（CC0），約一千六百五十部作品；Craig Sapp 編的莫札特鋼琴奏鳴曲與喬普林 Humdrum 版本（CC BY-NC-SA 4.0，非商業用途）。開啟時才下載樂譜，之後保存在你的瀏覽器裡。",
    ],
  ],
  [true, ["Projects with several files, lint checking", "多檔案專案與程式檢查"], ["main.py imports your own modules; mistakes are underlined as you type.", "main.py 可匯入你自己的模組；輸入時就會標出錯誤。"]],
  [true, ["Layout editor for parts", "分譜排版編輯器"], ["Bars per line, staff size, and line and page breaks set by clicking a bar; page turns are planned around them.", "每行小節數、譜表大小，點小節即可設定換行與換頁；翻頁依此規劃。"]],
  [true, ["Playback with real instrument sounds (Pro sound settings)", "以真實樂器音色播放（Pro 音色設定）"], ["Each part plays its own instrument; tuning (A4 = 440, 442, 415 Hz …), reverb, per-part instrument and volume.", "每個聲部用自己的樂器播放；調音（A4 = 440、442、415 Hz …）、殘響、各聲部的樂器與音量。"]],
  [
    false,
    ["More open collections", "更多開放授權曲集"],
    [
      "PDMX (needs a licence-clean subset first); Mutopia (LilyPond only, so it needs a converter); Craig Sapp's Beethoven piano sonatas once they carry a licence; scans that need OCR (IMSLP) after that.",
      "PDMX（需先篩出授權清楚的部分）；Mutopia（只有 LilyPond 檔，需要轉換器）；Craig Sapp 的貝多芬鋼琴奏鳴曲，待其標明授權；之後才是需要光學辨識的掃描譜（IMSLP）。",
    ],
  ],
  [false, ["IMSLP import from a link", "從 IMSLP 連結匯入"], ["Find a digital edition first (OpenScore, Mutopia, KernScores), else read the scan; IMSLP's copyright flag is shown.", "先找數位版（OpenScore、Mutopia、KernScores），否則辨識掃描；顯示 IMSLP 的版權標示。"]],
  [false, ["Read printed music from a photo or PDF", "從照片或 PDF 辨識印刷樂譜"], ["Optical music recognition on your own computer (local runner).", "在你自己的電腦上做光學樂譜辨識（本機執行器）。"]],
  [true, ["AI agent in the editor", "編輯器裡的 AI 代理"], ["Your own agent (Claude Code or Codex on your computer, or your API key) edits the score code with you through the runner; its changes come as a diff to apply or undo. Included with Pro: coming.", "你自己的代理（電腦上的 Claude Code 或 Codex，或你的 API 金鑰）透過執行器和你一起修改樂譜程式碼；修改以差異呈現，可套用或復原。Pro 方案內含：即將推出。"]],
  [false, ["Transcribe a recording", "從錄音轉譜"], ["One melodic line first (violin, flute, voice), in the browser.", "先做單一旋律（小提琴、長笛、人聲），在瀏覽器中執行。"]],
  [
    false,
    ["Guitar tablature", "吉他六線譜（TAB）"],
    [
      "Any melody or part shown as guitar tab, under the notation or instead of it. Polyphonizer chooses the string and fret for each note so the hand moves as little as possible (like the page-turn planner), and you can ask for first position, open strings or a maximum stretch. Other tunings (drop D, DADGAD, capo) and instruments (bass, ukulele, lute). Learn problems: make this melody playable in first position.",
      "任何旋律或聲部都能以吉他六線譜顯示，放在五線譜下方或取代它。Polyphonizer 會為每個音選擇弦與琴格，讓手的移動最少（就像翻頁規劃），你也可以要求第一把位、使用空弦或限制最大伸展。支援其他調弦（Drop D、DADGAD、移調夾）與樂器（貝斯、烏克麗麗、魯特琴）。學習題：讓這段旋律能在第一把位彈奏。",
    ],
  ],
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
