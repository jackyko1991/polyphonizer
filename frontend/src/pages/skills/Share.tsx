/** Coding Skills ▸ Sharing your score (#/skills/share[/<site>]): putting a score you made or corrected in a public
 * library, site by site. Export ▸ For a library opens each site's section here ("Step by step"). */
import { Callout, List, P, Page, Section, Sources, Table, type SectionInfo } from "../kit";
import { SITES, type SiteId } from "../../share/sites.ts";

const PAGE = "share";
type L = readonly [string, string];

const SECTIONS: SectionInfo[] = [
  { id: "before", title: ["Before you share", "分享之前"] },
  { id: "imslp", title: ["IMSLP", "IMSLP"] },
  { id: "cpdl", title: ["CPDL", "CPDL"] },
  { id: "mutopia", title: ["Mutopia", "Mutopia"] },
  { id: "musescore", title: ["MuseScore.com", "MuseScore.com"] },
  { id: "openscore", title: ["OpenScore: reporting a correction", "OpenScore：回報更正"] },
];

/** each site's steps, from Polyphonizer's Export to the site's own page */
const STEPS: Record<SiteId, L[]> = {
  imslp: [
    ["In the editor: Export ▸ For a library ▸ IMSLP. Save the PDF (Print, then Save as PDF) and the MusicXML.", "在編輯器：匯出 ▸ 給樂譜庫 ▸ IMSLP。存下 PDF（列印，再選存成 PDF）和 MusicXML。"],
    ["Sign in to IMSLP and find the work's page (search for its title and composer). If the work has no page yet, its guide explains how to make one.", "登入 IMSLP，找到該作品的頁面（搜尋標題和作曲者）。如果還沒有頁面，它的說明會教你怎麼建立。"],
    ["On the work's page: Add File ▸ Add score. Choose the PDF; add the MusicXML as well if you like.", "在作品頁面：Add File ▸ Add score。選 PDF；也可以一併附上 MusicXML。"],
    ["Fill in the form: the file type is Typeset; you are the typesetter (your name, not the program's); name the edition you typeset from; choose CC0, CC BY 4.0 or CC BY-SA 4.0.", "填表：檔案類型選 Typeset；打譜者是你（你的名字，不是軟體名稱）；寫明你據以打譜的版本；授權選 CC0、CC BY 4.0 或 CC BY-SA 4.0。"],
    ["Submit. IMSLP's reviewers check it before it shows; to fix it later, upload a new version of the same file.", "送出。IMSLP 的審核者會先檢查才公開；之後要修正，就上傳同一個檔案的新版本。"],
  ],
  cpdl: [
    ["In the editor: Export ▸ For a library ▸ CPDL. Save the PDF, the MIDI and the MusicXML.", "在編輯器：匯出 ▸ 給樂譜庫 ▸ CPDL。存下 PDF、MIDI 和 MusicXML。"],
    ["Put the licence on the score's first page: in the code, a line of text under the title (Page setup can leave room for it).", "把授權寫在樂譜第一頁：在程式碼裡，於標題下加一行文字（版面設定可以為它留空間）。"],
    ["Read CPDL's submission guide (Their guide), make an account, then add the work with its Add Work form and upload the files there.", "閱讀 CPDL 的投稿說明（他們的說明），建立帳號，然後用 Add Work 表單新增作品並上傳檔案。"],
  ],
  mutopia: [
    ["Check the edition you typeset from: published before 1923, and everyone who made the music died at least 70 years ago.", "確認你據以打譜的版本：1923 年以前出版，而且音樂的所有作者都已過世至少 70 年。"],
    ["In the editor: Export ▸ For a library ▸ Mutopia. Fill in the header (the composer's id is filled in when Mutopia already has their music), then save the LilyPond draft.", "在編輯器：匯出 ▸ 給樂譜庫 ▸ Mutopia。填好檔頭（Mutopia 已收錄的作曲家，代號會自動填上），然後存下 LilyPond 草稿。"],
    ["Tidy the draft: open it in Frescobaldi (free), take out the stem directions music21 writes on every note, and check it compiles at both A4 and Letter with no paper size in the file. Mutopia also wants a \\midi block.", "整理草稿：用 Frescobaldi（免費）打開，刪掉 music21 在每個音上寫的符桿方向，確認不寫紙張大小也能以 A4 和 Letter 編譯。Mutopia 也要求一個 \\midi 區塊。"],
    ["Send it: a pull request on GitHub (one per piece, files under ftp/<composer id>/…), or by e-mail as their contribute page says. Look at their list of pieces in progress first.", "送出：在 GitHub 開 pull request（一首一個，檔案放在 ftp/<作曲家代號>/… 下），或依他們的投稿頁面寄電子郵件。先看看他們正在進行中的曲目清單。"],
  ],
  musescore: [
    ["In the editor: Export ▸ For a library ▸ MuseScore.com. Save the MusicXML.", "在編輯器：匯出 ▸ 給樂譜庫 ▸ MuseScore.com。存下 MusicXML。"],
    ["Open it in MuseScore Studio (free). Check the layout, the title and the composer: a MusicXML file brings the notes, not every detail of the look.", "用 MuseScore Studio（免費）打開。檢查版面、標題和作曲者：MusicXML 帶過去的是音符，不是外觀的每個細節。"],
    ["File ▸ Save online, signed in to your MuseScore.com account. Choose who can see it and its licence.", "登入 MuseScore.com 帳號後，選 檔案 ▸ 線上儲存。選擇誰能看到，以及授權。"],
  ],
  openscore: [
    ["Open the song or quartet from the Library, and correct it with Edit notes: each change is a line edit_bar(…) in the code, which the report lists.", "從曲庫開啟那首歌或四重奏，用「編輯音符」更正：每個修改都是程式碼裡的一行 edit_bar(…)，回報會把它們列出來。"],
    ["Export ▸ For a library ▸ OpenScore: save your MusicXML, then Open a correction report on GitHub.", "匯出 ▸ 給樂譜庫 ▸ OpenScore：存下你的 MusicXML，再按「在 GitHub 開一份更正回報」。"],
    ["On GitHub (signed in): read the report, say which edition you checked against, drag your MusicXML into it, and submit. OpenScore's transcribers make the change in their MuseScore file.", "在 GitHub（已登入）：讀過回報，寫明你對照的版本，把 MusicXML 拖進去，然後送出。OpenScore 的打譜者會在他們的 MuseScore 檔裡修改。"],
  ],
};

function SiteSection({ id, n }: { id: SiteId; n: number }) {
  const s = SITES[id];
  return (
    <Section page={PAGE} id={id} n={n} title={SECTIONS[n - 1].title}>
      <P t={s.about} />
      <P t={["**What it needs**", "**需要什麼**"]} />
      <List items={[...s.needs]} />
      <P t={["**Step by step**", "**逐步說明**"]} />
      <List ordered items={STEPS[id]} />
      <Sources
        items={[
          { label: `${s.name[0]}: guide`, url: s.guide },
          ...(s.upload !== s.guide ? [{ label: `${s.name[0]}: ${s.uploadLabel[0]}`, url: s.upload }] : []),
        ]}
      />
    </Section>
  );
}

export default function ShareSkill({ section }: { section: string | null }) {
  return (
    <Page
      id={PAGE}
      title={["Sharing your score", "分享你的樂譜"]}
      intro={[
        "A score you typeset or corrected can help others: public libraries take new editions of public-domain music, and their editors want to hear about mistakes. Each library asks for different files and rules. **Export ▸ For a library** in the editor gives the files each one wants; this page walks through the rest. Nothing is sent from Polyphonizer: you upload on the library's own site.",
        "你打譜或更正過的樂譜可以幫助別人：公共樂譜庫收錄公有領域音樂的新版本，編者也想知道哪裡有錯。每個樂譜庫要的檔案和規則都不同。編輯器裡的**匯出 ▸ 給樂譜庫**會給出各自需要的檔案；這一頁說明其餘步驟。Polyphonizer 不會替你送出任何東西：你在樂譜庫自己的網站上傳。",
      ]}
      sections={SECTIONS}
      focus={section}
    >
      <Section page={PAGE} id="before" n={1} title={SECTIONS[0].title}>
        <List
          items={[
            ["**Is the music free to share?** The composer, poet and editor of the edition you used should have died long enough ago (70 years in most of the world), or the music is yours.", "**這首音樂可以自由分享嗎？** 你所用版本的作曲者、詩人和編者應已過世夠久（多數地方是 70 年），或者音樂是你自己的。"],
            ["**Name your source.** Every library asks which printed edition you typeset from.", "**寫明來源。** 每個樂譜庫都會問你根據哪個印刷版本打譜。"],
            ["**Proofread.** Play it through and compare it bar by bar with the source (Concept ▸ Limits has a checklist).", "**校對。** 播放一遍，並逐小節與來源比對（概念 ▸ 限制 有一份檢查清單）。"],
            ["**Choose a licence** for your edition: CC0 gives it away; CC BY asks for credit; CC BY-SA asks that changes be shared alike.", "**為你的版本選授權**：CC0 是完全放棄權利；CC BY 要求署名；CC BY-SA 要求修改後以相同授權分享。"],
          ]}
        />
        <Table
          head={[
            ["Library", "樂譜庫"],
            ["Files", "檔案"],
            ["Licences", "授權"],
            ["How", "方式"],
          ]}
          rows={[
            [["IMSLP", "IMSLP"], ["PDF (MusicXML alongside)", "PDF（可附 MusicXML）"], ["CC0, CC BY 4.0, CC BY-SA 4.0", "CC0、CC BY 4.0、CC BY-SA 4.0"], ["upload form on the work's page", "作品頁面的上傳表單"]],
            [["CPDL", "CPDL"], ["PDF, MIDI, MusicXML", "PDF、MIDI、MusicXML"], ["CPDL licence or Creative Commons", "CPDL 授權或 Creative Commons"], ["Add Work form", "Add Work 表單"]],
            [["Mutopia", "Mutopia"], ["LilyPond", "LilyPond"], ["Public Domain, CC BY 4.0, CC BY-SA 4.0", "公有領域、CC BY 4.0、CC BY-SA 4.0"], ["GitHub pull request or e-mail", "GitHub pull request 或電子郵件"]],
            [["MuseScore.com", "MuseScore.com"], ["MuseScore (from your MusicXML)", "MuseScore（由你的 MusicXML 轉成）"], ["your choice", "自行選擇"], ["Save online in MuseScore Studio", "在 MuseScore Studio 線上儲存"]],
            [["OpenScore", "OpenScore"], ["a report, with your MusicXML", "一份回報，附上 MusicXML"], ["CC0 (theirs)", "CC0（他們的）"], ["GitHub issue", "GitHub issue"]],
          ]}
        />
        <Callout kind="note" title={["CPDL's details", "CPDL 的細節"]}>
          <P
            t={[
              "CPDL's site doesn't let programs read it, so its steps here are the outline only; follow its own guide for the details.",
              "CPDL 的網站不讓程式讀取，所以這裡只有它的步驟大綱；細節請依它自己的說明。",
            ]}
          />
        </Callout>
      </Section>
      <SiteSection id="imslp" n={2} />
      <SiteSection id="cpdl" n={3} />
      <SiteSection id="mutopia" n={4} />
      <SiteSection id="musescore" n={5} />
      <SiteSection id="openscore" n={6} />
    </Page>
  );
}
