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
  "page.learn": ["Learn to", "學習"],
  "learn.tab.code": ["Code", "寫程式"],
  "learn.tab.play": ["Play", "彈奏"],
  "page.roadmap": ["Roadmap", "路線圖"],
  "page.library": ["Library", "曲庫"],
  "page.concept": ["Concept", "概念"],
  "page.skills": ["Coding Skills", "程式技巧"],
  "page.agents": ["AI agent", "AI 代理"],
  "page.reading": ["Further reading", "延伸閱讀"],
  "reading.books": ["Books", "書籍"],
  "reading.papers": ["Papers & projects", "論文與專案"],
  "tab.method": ["From score to code", "從樂譜到程式碼"],
  "tab.feynman": ["The Feynman technique", "費曼學習法"],
  "tab.theory": ["Music theory as code", "以程式碼表達樂理"],
  "tab.engraving": ["How a score is engraved", "樂譜如何排版"],
  "tab.limits": ["Limits of notation", "記譜的限度"],
  "tab.history": ["History of notation", "記譜史"],
  "skills.first": ["First music21", "第一步 music21"],
  "skills.corpus": ["Finding and importing music", "尋找與匯入樂譜"],
  "skills.structure": ["Structuring a score", "組織樂譜"],
  "skills.errors": ["Reading errors", "讀懂錯誤訊息"],
  "skills.verify": ["Checking a score", "檢查樂譜"],
  "agents.tools": ["AI music tools", "AI 音樂工具"],
  "agents.skills": ["Skills", "Skills"],
  "agents.mcp": ["MCP", "MCP"],
  "agents.roadmap": ["Product roadmap", "產品路線圖"],
  "history.title": ["History of notation", "記譜史"],
  "history.intro": [
    "How music came to be written down, printed, encoded for computers and finally written as code: from neumes to MusicXML, music21 and Verovio. Every card cites its sources.",
    "音樂如何被寫下、印刷、編碼給電腦，最後寫成程式碼：從紐姆到 MusicXML、music21 與 Verovio。每張卡片都附上資料來源。",
  ],
  timeline: ["Timeline", "時間軸"],
  "timeline.open": ["All events", "全部事件"],
  sources: ["Sources", "資料來源"],
  coffee: ["Buy me a coffee", "請我喝杯咖啡"],
  "footer.licence": ["Apache-2.0 · scores in the examples are public domain", "Apache-2.0 · 範例樂譜為公有領域"],

  "py.idle": ["Python not started", "Python 尚未啟動"],
  "py.python": ["Starting Python…", "正在啟動 Python…"],
  "py.music21": ["Loading music21 (first time: ~20 s)…", "正在載入 music21（首次約 20 秒）…"],
  "py.ready": ["Python + music21 ready", "Python + music21 已就緒"],

  run: ["Compile", "編譯"],
  "run.title": ["Build the score from the code ({key})", "由程式碼產生樂譜（{key}）"],
  running: ["Compiling…", "編譯中…"],
  "run.changed": ["Changed since the last compile", "上次編譯後有尚未編譯的修改"],
  scores: ["Scores", "樂譜"],
  "ws.mine": ["My score", "我的樂譜"],
  "ws.new": ["New score of my own…", "新增我的樂譜…"],
  "ws.newLabel": ["My score", "我的樂譜"],
  "ws.sample": ["Sample", "範例"],
  "ws.sampleHint": [
    "Samples are free to edit: your changes stay in a scratch copy of this sample and don't use your one score.",
    "範例可以自由修改：你的修改保存在這份範例的草稿中，不佔用你的一份樂譜。",
  ],
  "ws.reset": ["Reset this sample to how it came", "把這份範例還原"],
  "ws.fork": ["Fork", "另存為我的樂譜"],
  "ws.forkHint": ["Keep this as your own score (Community: one score of your own)", "存成你自己的樂譜（社群版：一份自己的樂譜）"],
  "ws.full": [
    "Community: one score of your own. Replace it, export it first, or Pro (coming) for more.",
    "社群版：一份自己的樂譜。可以取代它、先匯出它，或使用 Pro（即將推出）以保存更多。",
  ],
  "ws.replace": ["Replace my score", "取代我的樂譜"],
  "ws.delete": ["Delete my score", "刪除我的樂譜"],
  "ws.deleteAsk": ["Delete your score? Export it first if you want to keep it.", "要刪除你的樂譜嗎？想保留的話，請先匯出。"],
  "ws.export": ["Export my score", "匯出我的樂譜"],
  "ws.save": ["Save a save point of my score (it also saves itself as you type)", "儲存我的樂譜（輸入時也會自動儲存）"],
  "ws.saveShort": ["Save", "儲存"],
  "tree.new": ["New", "新增"],
  "tree.import": ["Import", "匯入"],
  "pages.setup": ["Page setup", "頁面設定"],
  print: ["Print", "列印"],
  "zoom.title": ["Page size on screen", "頁面顯示大小"],
  "zoom.auto": ["Side by side", "並排"],
  "zoom.width": ["Page width", "頁寬"],
  "zoom.page": ["Whole page", "整頁"],
  "tree.open": ["Show the scores", "顯示樂譜列表"],
  "tree.close": ["Hide the scores", "隱藏樂譜列表"],
  "tree.rename": ["Rename", "重新命名"],
  "tree.noneYet": ["None yet: New, Import, or ⑂ Fork a sample.", "還沒有：新增、匯入，或 ⑂ 另存一份範例。"],
  "tree.openFirst": ["Open your score first", "請先開啟你的樂譜"],
  "tree.export.py": ["Code (.py, or .zip with all files)", "程式碼（.py，或含所有檔案的 .zip）"],
  "tree.export.musicxml": ["MusicXML", "MusicXML"],
  "tree.export.midi": ["MIDI", "MIDI"],
  "tree.deleteAsk": ["Delete “{name}”? This cannot be undone.", "要刪除「{name}」嗎？刪除後無法復原。"],
  "tree.exportFirst": ["Export first", "先匯出"],
  "scores.recent": ["Recently opened", "最近開啟"],
  "scores.browse": ["Browse the library…", "瀏覽曲庫…"],
  "run.saved": ["Saved", "已儲存"],
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
  "view.pages": ["Pages", "頁面"],
  "view.empty": ["Compile to see the score.", "編譯後即可看到樂譜。"],
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

  "learn.intro": [
    "Each problem gives you a task and starter code. The rules below the task are the test, written first: your score passes when every rule in red turns green. Grey rules are style advice.",
    "每道題目給你一個任務和起始程式碼。任務下方的規則就是測試，事先寫好：所有紅色規則轉綠時，你的樂譜就通過了。灰色規則是風格建議。",
  ],
  "level.L0": ["Beginner", "入門"],
  "level.L1": ["Warm-up", "暖身"],
  "level.L2": ["Core", "核心"],
  "level.L3": ["Stretch", "挑戰"],
  "library": ["Problems", "題目"],
  "library.fold": ["Fold the problem list", "收起題目列表"],
  "library.open": ["Open the problem list", "展開題目列表"],
  "search.placeholder": ["Search problems", "搜尋題目"],
  "search.clear": ["Clear the search", "清除搜尋"],
  "search.count": ["{n} found", "找到 {n} 題"],
  "search.none": ["Nothing matches.", "沒有符合的題目。"],
  "series.of": ["{i} of {n}", "第 {i} 題，共 {n} 題"],
  "series.prev": ["Previous problem", "上一題"],
  "series.next": ["Next problem", "下一題"],
  "tab.task": ["Task", "任務"],
  "tab.why": ["Why", "為什麼"],
  "mtab.problem": ["Problem", "題目"],
  "mtab.code": ["Code", "程式碼"],
  "mtab.score": ["Score", "樂譜"],
  "learn.check": ["Check", "檢查"],
  "learn.reset": ["Start again", "重新開始"],
  "learn.passed": ["Passed: every rule holds.", "通過：所有規則都成立。"],
  "learn.failed": ["Not yet: see the rules in red.", "還沒：請看紅色的規則。"],
  "learn.rules": ["Rules (the test)", "規則（測試）"],
  "learn.done": ["Solved", "已完成"],
  "learn.bars": ["bars", "小節"],
  "learn.found": ["found", "得到"],
  "learn.notRun": ["not checked yet", "尚未檢查"],

  "files.add": ["Add a Python file (a module main.py can import)", "新增 Python 檔（main.py 可以匯入的模組）"],
  "files.rename": ["File name", "檔名"],
  "files.delete": ["Delete {name}", "刪除 {name}"],
  "files.main": ["main.py sets `score`", "main.py 設定 `score`"],
  "files.module": ["A module: import it from main.py. Double-click to rename.", "模組：從 main.py 匯入。按兩下可改名。"],
  "layout.barsPerLine": ["Bars per line", "每行小節數"],
  "layout.auto": ["Auto", "自動"],
  "layout.paper": ["Page", "頁面尺寸"],
  "layout.papers": ["Paper (print)", "紙張（列印）"],
  "layout.screens": ["Screens (tablet, phone, monitor)", "螢幕（平板、手機、螢幕）"],
  "layout.fitScreen": ["Fit this screen", "符合這個螢幕"],
  "layout.fit": ["Continuous (fit to the window)", "連續（配合視窗）"],
  "layout.fitNote": [
    "Continuous: the music flows down the window with no pages. Choose a paper or screen to lay it out in pages, with page turns.",
    "連續：樂譜在視窗中一直往下排，不分頁。選擇紙張或螢幕尺寸，才會分頁並計算翻頁。",
  ],
  "layout.musicSize": ["Music size", "樂譜大小"],
  "layout.orientation": ["Orientation", "方向"],
  "layout.portrait": ["Portrait", "直向"],
  "layout.landscape": ["Landscape", "橫向"],
  "layout.turning": ["Page turns", "翻頁"],
  "layout.done": ["Done", "完成"],
  "layout.breaksNeedPages": ["Choose a paper in Page setup to place line and page breaks", "請先在頁面設定選擇紙張，才能設定換行換頁"],
  "layout.scale": ["Staff size", "譜表大小"],
  "layout.edit": ["Edit breaks", "編輯換行換頁"],
  "layout.editHint": ["Click a bar: new line → new page → none.", "點一個小節：換行 → 換頁 → 取消。"],
  "layout.clear": ["Clear breaks", "清除換行換頁"],
  "layout.line": ["New line here", "從這裡換行"],
  "layout.page": ["New page here", "從這裡換頁"],
  "crash.title": ["Something went wrong on this page", "這一頁出了問題"],
  "crash.body": ["The rest of the site still works. Reload, or go to another page.", "網站其他部分仍可使用。請重新載入，或前往其他頁面。"],
  "crash.reload": ["Reload", "重新載入"],
  "lib.title": ["Library", "曲庫"],
  "lib.intro": [
    "Every work in music21's corpus (Bach chorales, quartets by Haydn, Mozart and Beethoven, Renaissance masses and madrigals, thousands of folk tunes), plus open collections: OpenScore's Lieder and string quartets, and Craig Sapp's editions of Mozart's piano sonatas and Joplin's rags. Open one in the editor to play it, lay out a part, or change notes; your changes are kept as lines of code after the original.",
    "music21 曲庫裡的每一部作品（巴赫聖詠曲、海頓、莫札特與貝多芬的四重奏、文藝復興時期的彌撒曲與牧歌、數千首民謠），以及開放授權曲集：OpenScore 的藝術歌曲與弦樂四重奏，和 Craig Sapp 編的莫札特鋼琴奏鳴曲與喬普林散拍曲。在編輯器中開啟一首來播放、排出分譜或修改音符；你的修改會以程式碼的形式寫在原曲之後。",
  ],
  "lib.search": ["Search by title, composer or catalogue number (BWV 66.6, K. 458, Op. 59 No. 2 …)", "以曲名、作曲家或作品編號搜尋（BWV 66.6、K. 458、Op. 59 No. 2 …）"],
  "lib.collection": ["Collection", "曲集"],
  "lib.all": ["All collections", "全部曲集"],
  "lib.composer": ["Composer", "作曲家"],
  "lib.allComposers": ["All composers", "全部作曲家"],
  "lib.era": ["Era", "時期"],
  "lib.allEras": ["All eras", "全部時期"],
  "lib.ensemble": ["Parts", "聲部數"],
  "lib.allEnsembles": ["Any number of parts", "不限聲部數"],
  "lib.allInstruments": ["Any instrument", "不限樂器"],
  "lib.instrumentsHint": ["Works with all the instruments you tick", "包含所有勾選樂器的作品"],
  "lib.clearInstruments": ["Clear the instruments", "清除樂器篩選"],
  "lib.composerChip": ["Composer: {name} ({n})", "作曲家：{name}（{n}）"],
  "lib.clearComposer": ["Clear the composer filter", "清除作曲家篩選"],
  "lib.few": [
    "music21's corpus has only {n} works by {name}. Most of their music will come from importing digital editions (OpenScore, KernScores) and IMSLP, which is on the roadmap.",
    "music21 曲庫只有 {name} 的 {n} 部作品。他們大多數的作品將來會透過匯入數位版（OpenScore、KernScores）與 IMSLP 取得，這已在路線圖上。",
  ],
  "lib.roadmap": ["See the roadmap", "查看路線圖"],
  "lib.loading": ["Loading the catalogue…", "正在載入目錄…"],
  "lib.none": ["Nothing matches.", "沒有符合的作品。"],
  "lib.more": ["Show {n} more", "再顯示 {n} 部"],
  "lib.part": ["{n} part", "{n} 個聲部"],
  "lib.parts": ["{n} parts", "{n} 個聲部"],
  "lib.open": ["Open in editor", "在編輯器開啟"],
  "lib.source": ["Catalogue of music21 {v}'s corpus, from its own metadata. Sources and licences of the works:", "目錄取自 music21 {v} 曲庫的中繼資料。各作品的來源與授權："],
  "lib.sourceLink": ["music21's corpus reference", "music21 曲庫說明"],
  "lib.sourceFilter": ["Source", "來源"],
  "lib.allSources": ["All sources", "全部來源"],
  "lib.licence": ["Licence: {l}", "授權：{l}"],
  "lib.nonCommercial": ["non-commercial use only", "僅限非商業用途"],
  "lib.downloads": ["Downloaded from {source} when you open it, then kept in this browser.", "開啟時從 {source} 下載，之後保存在這個瀏覽器裡。"],
  "lib.creditOpenScore": ["OpenScore Lieder and String Quartets: OpenScore (openscore.cc), CC0.", "OpenScore 藝術歌曲與弦樂四重奏：OpenScore（openscore.cc），CC0。"],
  "lib.creditSapp": [
    "Mozart's piano sonatas and Joplin: Craig Stuart Sapp's Humdrum editions, CC BY-NC-SA 4.0 (attribution, non-commercial, share alike).",
    "莫札特鋼琴奏鳴曲與喬普林：Craig Stuart Sapp 的 Humdrum 版本，CC BY-NC-SA 4.0（姓名標示、非商業性、相同方式分享）。",
  ],
  "src.music21": ["music21 corpus", "music21 曲庫"],
  "reader.prev": ["Previous page (←, Page Up)", "上一頁（←、Page Up）"],
  "reader.next": ["Next page (→, Page Down, Space)", "下一頁（→、Page Down、空白鍵）"],
  "full.enter": ["Full screen", "全螢幕"],
  "full.exit": ["Leave full screen (Esc)", "離開全螢幕（Esc）"],
  "partPlay.label": ["What ▶ plays while one part is shown", "顯示單一聲部時，▶ 播放什麼"],
  "partPlay.part": ["This part only", "只播此聲部"],
  "partPlay.others": ["Others only (play along)", "播放其他聲部（伴奏練習）"],
  "partPlay.all": ["All parts", "全部聲部"],
  "speed.title": ["Playback tempo (quarter notes per minute)", "播放速度（每分鐘四分音符數）"],
  "speed.reset": ["Back to the written tempo", "回到樂譜標示的速度"],
  "click.where": ["{part}, bar {bar}: this score is not written note by note in the code; the line that makes it is selected.", "{part}，第 {bar} 小節：這份樂譜不是在程式碼中逐音寫成的；已選取產生它的那一行。"],
  "click.label": ["Click to jump", "點音符跳轉"],
  "click.hint": [
    "Click a note: play from it, show its code. When on, clicking a note sets where ▶ starts (and jumps there while playing) and selects its code.",
    "點音符：從這裡播放、跳到程式碼。開啟時，點一個音符會設定 ▶ 的起點（播放中則跳到那裡），並選取它的程式碼。",
  ],
  "edit.notes": ["Edit notes", "編輯音符"],
  "edit.hint": [
    "Click a bar to change its notes. Your change is written into main.py as an edit_bar(…) line: the original stays, and deleting the line undoes it.",
    "點一個小節來修改音符。修改會以 edit_bar(…) 寫進 main.py：原曲保持不變，刪掉那一行就能復原。",
  ],
  "edit.title": ["{part}, bar {bar}", "{part}，第 {bar} 小節"],
  "edit.syntax": [
    "c d e = C4 D4 E4 · c' = C5 · C = C3 · # sharp, - flat · 4 quarter, 8 eighth, 2. dotted half · r rest · ~ tie · <c e g>4 chord · trip{c8 d e}",
    "c d e = C4 D4 E4 · c' = C5 · C = C3 · # 升、- 降 · 4 四分、8 八分、2. 附點二分 · r 休止 · ~ 連結線 · <c e g>4 和弦 · trip{c8 d e}",
  ],
  "edit.lost": ["This bar also has {what}; they will be removed if you change it.", "這個小節還有 {what}；修改後它們會被移除。"],
  "edit.apply": ["Apply", "套用"],
  "edit.cancel": ["Cancel", "取消"],
  "play.loading": ["Loading the instruments…", "正在載入樂器…"],
  "sound.button": ["Sound", "音色"],
  "sound.title": ["Sound settings", "音色設定"],
  "sound.close": ["Close", "關閉"],
  "sound.engine": ["Sound", "聲音"],
  "sound.samples": ["Recorded instruments", "錄音樂器"],
  "sound.synth": ["Built-in synth (offline)", "內建合成器（離線）"],
  "sound.kit": ["Sample set", "取樣音色組"],
  "sound.kit.rich": ["Rich (MusyngKite, larger)", "豐富（MusyngKite，較大）"],
  "sound.kit.light": ["Light (FluidR3)", "輕量（FluidR3）"],
  "sound.a4": ["Tuning: A4 =", "調音：A4 ="],
  "sound.baroque": ["Baroque", "巴洛克"],
  "sound.reverb": ["Reverb", "殘響"],
  "sound.cursor": ["Cursor line while playing", "播放時顯示游標線"],
  "sound.highlight": ["Light up the sounding notes", "點亮正在發聲的音符"],
  "sound.parts": ["Parts", "聲部"],
  "sound.mute": ["Mute", "靜音"],
  "sound.auto": ["As in the score: {name}", "依樂譜：{name}"],
  "sound.scoreSays": ["The score says {name}.", "樂譜標示為 {name}。"],
  "sound.instrumentOf": ["Instrument for {part}", "{part} 的樂器"],
  "sound.volumeOf": ["Volume of {part}", "{part} 的音量"],
  "sound.reset": ["Reset", "重設"],
  "sound.samplesNote": [
    "Recorded General MIDI instruments (midi-js-soundfonts), downloaded the first time each is used, then kept in this browser.",
    "錄音的 General MIDI 樂器（midi-js-soundfonts），每種樂器第一次使用時下載，之後保存在這個瀏覽器。",
  ],
  "sound.synthNote": ["A small synth whose tone follows each instrument's family; nothing to download.", "小型合成器，音色依樂器家族而定；不需下載。"],

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

/** a distance in semitones as an interval: 12 → "an octave" */
export function apart(semis: number, lang: 0 | 1): string {
  const names: Record<number, [string, string]> = {
    12: ["an octave", "一個八度"],
    16: ["a tenth", "十度"],
    19: ["a twelfth", "十二度"],
    24: ["two octaves", "兩個八度"],
  };
  return names[semis]?.[lang] ?? (lang ? ` ${semis} 個半音` : `${semis} semitones`);
}

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
    case "transposed": {
      const by = Math.abs(rule.by);
      const how =
        by === 7 ? ["a perfect fifth", "一個完全五度"] : by === 12 ? ["an octave", "一個八度"] : [`${by} semitones`, ` ${by} 個半音`];
      return rule.by < 0
        ? pick(`${p(rule.part)} is the melody moved down ${how[0]}`, `${p(rule.part)} 是旋律降低${how[1]}`)
        : pick(`${p(rule.part)} is the melody moved up ${how[0]}`, `${p(rule.part)} 是旋律升高${how[1]}`);
    }
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
      return pick(
        `The voices don't cross and stay within ${apart(rule.maxApart, 0)}`,
        `聲部不交叉，且相距不超過${apart(rule.maxApart, 1)}`,
      );
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
