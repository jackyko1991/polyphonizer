/**
 * The libraries a learner's score can go to, and what each asks for (from each site's own guide, Nov 2026):
 * - IMSLP: a PDF (MusicXML only alongside one); CC0, CC BY 4.0 or CC BY-SA 4.0; an account; uploaded from the work's
 *   page ("Add File"), with the typesetter's name and the source edition.
 * - CPDL: PDF, and MIDI and MusicXML where there are any; the CPDL licence or Creative Commons; through its Add Work form.
 *   (CPDL refuses automated reading, so this is from its guide's titles only: the dialog sends the learner to the guide.)
 * - Mutopia: a LilyPond file with Mutopia's header fields, typeset from an edition published before 1923 of music
 *   whose makers died at least 70 years ago; Public Domain, CC BY 4.0 or CC BY-SA 4.0; a GitHub pull request or e-mail.
 * - MuseScore.com: a MuseScore file (open the MusicXML in MuseScore Studio, then Save online); an account.
 * - OpenScore: no uploads; a correction to one of its scores goes to its GitHub issues (its files are MuseScore files).
 * Nothing is sent from Polyphonizer: the learner downloads the files and uploads them there.
 */
import { matchComposer } from "../library/composerMatch.ts";
import { canonicalComposer } from "../library/composers.ts";

export type SiteId = "imslp" | "cpdl" | "mutopia" | "musescore" | "openscore";
export const SITE_IDS: SiteId[] = ["imslp", "cpdl", "mutopia", "musescore", "openscore"];
/** files the dialog downloads; "ly" is LilyPond with the site's header fields */
export type ShareFile = "musicxml" | "midi" | "pdf" | "ly";
type L = readonly [string, string];

export interface SiteField {
  /** the LilyPond header field */
  key: string;
  label: L;
  required?: boolean;
  hint?: string;
  options?: string[];
  /** filled from the score */
  from?: "title" | "composer";
  value?: string;
}

export interface Site {
  name: L;
  about: L;
  /** what it needs, in the order a learner meets it */
  needs: L[];
  files: ShareFile[];
  fields?: SiteField[];
  /** where an upload starts (the site's page), and the button's words */
  upload: string;
  uploadLabel: L;
  /** the site's own guide */
  guide: string;
}

export const MUTOPIA_LICENCES = ["Public Domain", "Creative Commons Attribution 4.0", "Creative Commons Attribution-ShareAlike 4.0"];
export const MUTOPIA_STYLES = ["Baroque", "Classical", "Folk", "Gospel", "Hymn", "Jazz", "March", "Modern", "Popular / Dance", "Renaissance", "Romantic", "Song", "Technique"];

export const SITES: Record<SiteId, Site> = {
  imslp: {
    name: ["IMSLP", "IMSLP"],
    about: [
      "The largest library of public-domain scores. A typeset edition of yours can go on the work's page beside the scans.",
      "最大的公有領域樂譜庫。你打譜的版本可以放在該作品頁面，和掃描版並列。",
    ],
    needs: [
      ["A PDF: IMSLP takes PDFs; a MusicXML file only alongside one.", "PDF：IMSLP 收 PDF；MusicXML 只能隨 PDF 一起附上。"],
      ["Music in the public domain (or yours), and the edition you typeset it from.", "公有領域（或你自己）的音樂，以及你據以打譜的版本。"],
      ["A licence for your edition: CC0, CC BY 4.0 or CC BY-SA 4.0. It can't be made stricter later.", "你這個版本的授權：CC0、CC BY 4.0 或 CC BY-SA 4.0。之後不能改得更嚴。"],
      ["An IMSLP account. Upload from the work's page (Add File ▸ Add score), not the sidebar's Upload file; you are the typesetter.", "IMSLP 帳號。從作品頁面上傳（Add File ▸ Add score），不要用側欄的 Upload file；打譜者填你自己。"],
    ],
    files: ["pdf", "musicxml"],
    upload: "https://imslp.org/wiki/Main_Page",
    uploadLabel: ["Find the work on IMSLP", "在 IMSLP 找到這首作品"],
    guide: "https://imslp.org/wiki/IMSLP:Score_submission_guide",
  },
  cpdl: {
    name: ["CPDL (Choral Public Domain Library)", "CPDL（合唱公有領域樂譜庫）"],
    about: ["Free choral and vocal scores, edited by their contributors.", "免費的合唱與聲樂樂譜，由貢獻者自行編輯。"],
    needs: [
      ["Choral or vocal music, in the public domain or yours.", "合唱或聲樂作品，屬公有領域或你自己的。"],
      ["A PDF, with MIDI and MusicXML if you have them.", "PDF，有 MIDI 和 MusicXML 的話一併附上。"],
      ["The licence on the score's first page: the CPDL licence or a Creative Commons one.", "授權寫在樂譜第一頁：CPDL 授權或 Creative Commons 授權。"],
      ["A CPDL account; the work is added with its Add Work form. Read its guide first: the details are there.", "CPDL 帳號；用它的 Add Work 表單新增作品。請先讀它的說明，細節都在那裡。"],
    ],
    files: ["pdf", "midi", "musicxml"],
    upload: "https://www.cpdl.org/wiki/index.php/ChoralWiki:Add_Music",
    uploadLabel: ["Add music on CPDL", "到 CPDL 新增樂譜"],
    guide: "https://www.cpdl.org/wiki/index.php/ChoralWiki:Add_Music",
  },
  mutopia: {
    name: ["Mutopia Project", "Mutopia Project"],
    about: [
      "Public-domain scores typeset in LilyPond by volunteers, free to print and share.",
      "由志工以 LilyPond 打譜的公有領域樂譜，可自由列印與分享。",
    ],
    needs: [
      ["Music whose composer, poet and editor died at least 70 years ago, typeset from an edition published before 1923 (name it).", "作曲者、詩人、編者都已過世至少 70 年，並根據 1923 年以前出版的版本打譜（要寫明版本）。"],
      [
        "A LilyPond file. The one here is a draft from music21: open it in Frescobaldi or run LilyPond on it, and tidy it (music21 writes every stem out) before sending.",
        "LilyPond 檔。這裡給的是 music21 產生的草稿：用 Frescobaldi 打開或用 LilyPond 編譯，整理過再送出（music21 會把每個符桿方向都寫出來）。",
      ],
      ["Its header: the fields below. A composer new to Mutopia needs an id from them (ask by e-mail).", "檔頭：下面這些欄位。Mutopia 還沒有的作曲家要先寫信請他們給一個代號。"],
      ["Send it as a GitHub pull request (one per piece), or by e-mail as their page says.", "用 GitHub pull request 送出（一首一個），或依他們頁面上的說明寄電子郵件。"],
    ],
    files: ["ly", "musicxml", "midi"],
    fields: [
      { key: "title", label: ["Title", "標題"], required: true, from: "title" },
      { key: "composer", label: ["Composer", "作曲者"], from: "composer" },
      { key: "mutopiacomposer", label: ["Mutopia's composer id", "Mutopia 作曲家代號"], required: true, hint: "BachJS" },
      { key: "mutopiaopus", label: ["Opus or catalogue number", "作品編號"], hint: "BWV 988" },
      { key: "mutopiainstrument", label: ["Instruments", "樂器"], required: true, hint: "Piano" },
      { key: "source", label: ["Source edition (publisher, year)", "來源版本（出版者、年份）"], required: true, hint: "Breitkopf & Härtel, 1853" },
      { key: "style", label: ["Style", "風格"], required: true, options: MUTOPIA_STYLES },
      { key: "license", label: ["Licence", "授權"], required: true, options: MUTOPIA_LICENCES },
      { key: "maintainer", label: ["You (name, or Anonymous)", "你（姓名，或 Anonymous）"], required: true },
    ],
    upload: "https://www.mutopiaproject.org/contribute.html",
    uploadLabel: ["How to send it to Mutopia", "如何送給 Mutopia"],
    guide: "https://github.com/MutopiaProject/MutopiaProject/wiki/Guidelines-for-new-score-submissions-using-github",
  },
  musescore: {
    name: ["MuseScore.com", "MuseScore.com"],
    about: ["Share a score with MuseScore's community; others can play it, download it and comment.", "與 MuseScore 社群分享樂譜；別人可以播放、下載和留言。"],
    needs: [
      ["A MuseScore file: open the MusicXML in MuseScore Studio (free), check it, then File ▸ Save online.", "MuseScore 檔：用 MuseScore Studio（免費）打開 MusicXML，檢查後選 檔案 ▸ 線上儲存。"],
      ["A MuseScore.com account.", "MuseScore.com 帳號。"],
      ["A licence: Public Domain (CC0) only if the edition is yours to give; otherwise a Creative Commons licence.", "授權：只有版本屬於你時才能選公有領域（CC0）；否則選一種 Creative Commons 授權。"],
    ],
    files: ["musicxml"],
    upload: "https://musescore.com/upload",
    uploadLabel: ["Upload on MuseScore.com", "到 MuseScore.com 上傳"],
    guide: "https://handbook.musescore.org/3/basics/share-scores-online",
  },
  openscore: {
    name: ["OpenScore", "OpenScore"],
    about: [
      "OpenScore's songs and quartets are kept as MuseScore files by its own transcribers, so a fix goes to them as a report: the bars you changed, and your MusicXML to compare.",
      "OpenScore 的歌曲和四重奏由它自己的打譜者以 MuseScore 檔維護，所以修正以回報方式交給他們：你改了哪些小節，附上你的 MusicXML 供比對。",
    ],
    needs: [
      ["A GitHub account, to post the report.", "GitHub 帳號，用來發佈回報。"],
      ["Your MusicXML: download it here, then drag it into the report before you submit.", "你的 MusicXML：在這裡下載，送出回報前拖進回報裡。"],
      ["Check the report's words: it lists the bars changed with Edit notes; describe any other change yourself.", "檢查回報內容：它列出用「編輯音符」改過的小節；其他修改請自己說明。"],
    ],
    files: ["musicxml"],
    upload: "https://github.com/OpenScore",
    uploadLabel: ["OpenScore on GitHub", "GitHub 上的 OpenScore"],
    guide: "https://github.com/OpenScore/Lieder",
  },
};

/** the title and composer written in a MusicXML file */
export function metadataOf(musicxml: string): { title: string; composer: string } {
  const text = (re: RegExp) =>
    (re.exec(musicxml)?.[1] ?? "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();
  return {
    title: text(/<work-title>([^<]*)<\/work-title>/) || text(/<movement-title>([^<]*)<\/movement-title>/),
    composer: text(/<creator type="composer">([^<]*)<\/creator>/),
  };
}

export interface OpenScoreOriginal {
  repo: "OpenScore/Lieder" | "OpenScore/StringQuartets";
  /** the score's id on MuseScore.com (its file is lc<id> or sq<id>) */
  id: string;
  url: string;
  /** the bars changed with Edit notes: edit_bar(score, part, bar, notes) after it was read */
  edits: { part: string; bar: number; notes: string }[];
}

/** the OpenScore score this code reads with fetch_score, and the bars it changes with edit_bar */
export function openScoreOf(code: string): OpenScoreOriginal | null {
  const m = /fetch_score\(\s*["'](https:\/\/raw\.githubusercontent\.com\/OpenScore\/(Lieder|StringQuartets)\/[^"']*\/(?:lc|sq)(\d+)\.\w+)["']/.exec(code);
  if (!m) return null;
  const edits = [...code.matchAll(/\bedit_bar\(\s*\w+\s*,\s*("(?:[^"\\]|\\.)*"|\d+)\s*,\s*(\d+)\s*,\s*("(?:[^"\\]|\\.)*")\s*\)/g)].map((e) => ({
    part: e[1].startsWith('"') ? (JSON.parse(e[1]) as string) : `#${e[1]}`,
    bar: Number(e[2]),
    notes: JSON.parse(e[3]) as string,
  }));
  return { repo: `OpenScore/${m[2] as "Lieder" | "StringQuartets"}`, id: m[3], url: m[1], edits };
}

/** a GitHub new-issue page filled in with the correction (the learner reads it, attaches the MusicXML and submits) */
export function correctionIssueUrl(o: OpenScoreOriginal, title: string): string {
  const lines = [
    `Score: ${title || o.id} — https://musescore.com/score/${o.id}`,
    "",
    o.edits.length ? "Bars I believe are wrong, with what I think they should be (tinyNotation; chords as <c e g>4):" : "What I believe is wrong:",
    ...o.edits.map((e) => `- ${e.part}, bar ${e.bar}: \`${e.notes}\``),
    ...(o.edits.length ? [] : ["- (bar, part, what is printed, what it should be)"]),
    "",
    "Source I checked against: (the edition, and its page)",
    "",
    "My corrected MusicXML is attached.",
    "",
    "(Found while studying the score in Polyphonizer.)",
  ];
  const q = new URLSearchParams({ title: `Correction: ${title || o.id} (${o.id})`, body: lines.join("\n") });
  return `https://github.com/${o.repo}/issues/new?${q.toString()}`;
}

/** Mutopia's id for a composer ("BachJS"), from the folders of the pieces it already lists, or "" */
export function mutopiaComposerId(composer: string, pieces: { composer: string; folder: string }[]): string {
  if (!composer) return "";
  const want = canonicalComposer(composer);
  // the same name or spelling, else the one composer the name fits ("W.A. Mozart": initials), never a guess
  const fits = matchComposer(composer, [...new Set(pieces.map((p) => p.composer))]);
  const hit = pieces.find((p) => p.composer === composer || canonicalComposer(p.composer) === want) ?? pieces.find((p) => p.composer === fits);
  return hit ? (hit.folder.split("/")[0] ?? "") : "";
}
