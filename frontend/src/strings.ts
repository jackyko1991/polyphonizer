/** UI strings: one row per key, [English, Traditional Chinese] (the order of LANGS). */
import type { Language } from "@learnkit/web";
import type { Rule } from "./engine/checker.ts";
import { midiName, type L } from "./problems.ts";

export const LANGS: Language[] = [
  { code: "en", name: "English" },
  { code: "zh-Hant", name: "繁體中文" },
];

export const STRINGS = {
  tagline: ["Music scores written as code, checked, played and laid out for the stand", "以程式碼寫樂譜：檢查、播放、排版到譜架上"],
  "page.editor": ["Score editor", "樂譜編輯器"],
  "page.learn": ["Learn", "學習"],
  "page.roadmap": ["Roadmap", "路線圖"],
  coffee: ["Buy me a coffee", "請我喝杯咖啡"],
  "footer.licence": ["Apache-2.0 · scores in the examples are public domain", "Apache-2.0 · 範例樂譜為公有領域"],

  "py.idle": ["Python not started", "Python 尚未啟動"],
  "py.python": ["Starting Python…", "正在啟動 Python…"],
  "py.music21": ["Loading music21 (first time: ~20 s)…", "正在載入 music21（首次約 20 秒）…"],
  "py.ready": ["Python + music21 ready", "Python + music21 已就緒"],

  run: ["Run", "執行"],
  running: ["Running…", "執行中…"],
  play: ["Play", "播放"],
  stop: ["Stop", "停止"],
  import: ["Import file", "匯入檔案"],
  "import.hint": [
    "MusicXML (.musicxml, .xml, .mxl), MIDI, ABC or Humdrum. Many IMSLP and MuseScore scores come as MusicXML.",
    "MusicXML（.musicxml、.xml、.mxl）、MIDI、ABC 或 Humdrum。許多 IMSLP 與 MuseScore 的樂譜提供 MusicXML。",
  ],
  examples: ["Examples", "範例"],
  export: ["Export", "匯出"],
  "export.musicxml": ["MusicXML (for MuseScore, Sibelius, Dorico)", "MusicXML（給 MuseScore、Sibelius、Dorico）"],
  "export.midi": ["MIDI", "MIDI"],
  "export.print": ["Print or save as PDF (the pages)", "列印或存成 PDF（頁面）"],
  "export.code": ["The code (.py)", "程式碼（.py）"],
  "view.score": ["Score", "樂譜"],
  "view.pages": ["Pages & turns", "頁面與翻頁"],
  "view.empty": ["Run the code to see the score.", "執行程式碼即可看到樂譜。"],
  "pages.part": ["Sheet for", "樂譜給"],
  "pages.full": ["Full score", "總譜"],
  "pages.stand": ["On the stand", "譜架上"],
  "stand.single": ["One page at a time", "一次一頁"],
  "stand.spread": ["Open spreads (turn after 2, 4 …)", "左右兩頁（第 2、4… 頁後翻）"],
  "stand.spread-right": ["Starts on a right page (turn after 1, 3 …)", "從右頁開始（第 1、3… 頁後翻）"],
  "pages.minRest": ["Rest needed to turn (s)", "翻頁需要的休止（秒）"],
  "pages.plan": ["Move page breaks to rests", "把換頁移到休止處"],
  "pages.turns": ["Page turns", "翻頁"],
  "pages.noTurns": ["No page turns: it fits on the stand.", "不需翻頁：全部放得下。"],
  "pages.turnAt": ["After page {page}, bar {bar}: {rest} s of rest", "第 {page} 頁之後，第 {bar} 小節：休止 {rest} 秒"],
  "pages.bad": ["not enough time to turn", "來不及翻頁"],
  "pages.count": ["{n} pages", "{n} 頁"],
  "pages.engraving": ["Laying out pages…", "正在排版…"],
  "error.line": ["line {line}", "第 {line} 行"],
  "file.missing": ["Import the file again: imported files stay only in this browser tab.", "請再次匯入檔案：匯入的檔案只保存在這個分頁。"],

  "learn.title": ["Learn by writing music that a checker grades", "寫音樂、讓檢查器評分，從中學習"],
  "learn.intro": [
    "Each problem gives you a task and starter code. The rules below the task are the test, written first: your score passes when every rule in red turns green. Grey rules are style advice.",
    "每道題目給你一個任務和起始程式碼。任務下方的規則就是測試，事先寫好：所有紅色規則轉綠時，你的樂譜就通過了。灰色規則是風格建議。",
  ],
  "learn.level": ["Level {n}", "第 {n} 級"],
  "learn.check": ["Check", "檢查"],
  "learn.reset": ["Start again", "重新開始"],
  "learn.passed": ["Passed: every rule holds.", "通過：所有規則都成立。"],
  "learn.failed": ["Not yet: see the rules in red.", "還沒：請看紅色的規則。"],
  "learn.rules": ["Rules (the test)", "規則（測試）"],
  "learn.why": ["Why", "為什麼"],
  "learn.back": ["All problems", "所有題目"],
  "learn.bars": ["bars", "小節"],
  "learn.found": ["found", "得到"],
  "learn.notRun": ["not checked yet", "尚未檢查"],

  "rm.title": ["Roadmap", "路線圖"],
  "rm.intro": [
    "Polyphonizer is free and runs in your browser. What works now, and what comes next:",
    "Polyphonizer 免費，在你的瀏覽器裡執行。現在能用的，以及接下來的：",
  ],
} satisfies Record<string, L>;

export type Key = keyof typeof STRINGS;

/** fill {name} placeholders */
export const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));

/** what a rule checks, in words; `parts` names the parts */
export function ruleText(rule: Rule, parts: string[], lang: 0 | 1): string {
  const p = (i: number) => parts[i] ?? (lang ? `第 ${i + 1} 聲部` : `part ${i + 1}`);
  const pick = (en: string, zh: string) => (lang ? zh : en);
  switch (rule.id) {
    case "parts":
      return pick(`The score has ${rule.count} part${rule.count > 1 ? "s" : ""}`, `樂譜有 ${rule.count} 個聲部`);
    case "count":
      return pick(`${p(rule.part)} has ${rule.count} notes`, `${p(rule.part)} 有 ${rule.count} 個音`);
    case "pitches":
      return pick(`${p(rule.part)} is the given melody, unchanged`, `${p(rule.part)} 是給定的旋律，沒有改動`);
    case "starts":
      return pick(`${p(rule.part)} starts on ${midiName(rule.midi)}`, `${p(rule.part)} 從 ${midiName(rule.midi)} 開始`);
    case "ends":
      return pick(`${p(rule.part)} ends on ${midiName(rule.midi)}`, `${p(rule.part)} 結束在 ${midiName(rule.midi)}`);
    case "steps":
      return pick(
        `${p(rule.part)} moves by the scale's steps (${rule.semitones.map((s) => (s === 2 ? "whole" : "half")).join(", ")})`,
        `${p(rule.part)} 依音階步距移動（${rule.semitones.map((s) => (s === 2 ? "全" : "半")).join("、")}）`,
      );
    case "transposed":
      return pick(
        `${p(rule.part)} is the melody moved up ${rule.by === 7 ? "a perfect fifth" : `${rule.by} semitones`}`,
        `${p(rule.part)} 是旋律升高${rule.by === 7 ? "一個完全五度" : ` ${rule.by} 個半音`}`,
      );
    case "sameRhythm":
      return pick(`${p(rule.part)} keeps the melody's rhythm`, `${p(rule.part)} 保留旋律的節奏`);
    case "range":
      return pick(
        `${p(rule.part)} stays between ${midiName(rule.low)} and ${midiName(rule.high)}`,
        `${p(rule.part)} 保持在 ${midiName(rule.low)} 與 ${midiName(rule.high)} 之間`,
      );
    case "scale":
      return pick(`${p(rule.part)} uses only the notes of the key or mode`, `${p(rule.part)} 只用調或調式內的音`);
    case "noteAgainstNote":
      return pick(`One note against each note (same rhythm as ${p(rule.b)})`, `一音對一音（與 ${p(rule.b)} 節奏相同）`);
    case "consonant":
      return pick(
        "Every pair is consonant: unison, third, fifth, sixth or octave",
        "每對音都協和：同度、三度、五度、六度或八度",
      );
    case "startPerfect":
      return rule.above
        ? pick("Starts on a unison, fifth or octave", "以同度、五度或八度開始")
        : pick("Starts on a unison or octave", "以同度或八度開始");
    case "endOctave":
      return pick("Ends on a unison or octave", "以同度或八度結束");
    case "cadenceStep":
      return pick(`${p(rule.part)} reaches the last note by step`, `${p(rule.part)} 以級進到達最後一個音`);
    case "noParallels":
      return pick("No parallel fifths or octaves", "沒有平行五度或八度");
    case "noDirect":
      return pick(
        "No hidden fifths or octaves (similar motion into them with a leap on top)",
        "沒有隱伏五度或八度（同向進入且上聲部跳進）",
      );
    case "noCrossing":
      return pick("The voices don't cross and stay within a tenth", "聲部不交叉，且相距不超過十度");
    case "goodLeaps":
      return pick(
        `${p(rule.part)} has no tritone, seventh or leap beyond an octave`,
        `${p(rule.part)} 沒有三全音、七度或超過八度的跳進`,
      );
    case "unisonEnds":
      return pick("Unisons only at the start and the end", "同度只出現在開頭和結尾");
    case "fewRepeats":
      return pick(`${p(rule.part)} doesn't repeat a note`, `${p(rule.part)} 不重複同一個音`);
    case "imperfectMostly":
      return pick("Mostly thirds and sixths (at most half fifths and octaves)", "以三度和六度為主（五度與八度不超過一半）");
  }
}
