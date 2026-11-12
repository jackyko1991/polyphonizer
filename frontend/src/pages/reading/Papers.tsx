/**
 * Further reading ▸ Papers & projects (#/reading/papers[/<group>]), in Formalizer's way: the papers behind the tools
 * Polyphonizer is built on, the ideas behind engraving and layout, the research on machines that read, hear and write
 * music, and the projects and websites around them. DOIs were checked against Crossref and Zenodo, other links by hand.
 */
import { PageToc, RichText, useLang } from "@learnkit/web";
import { useEffect } from "react";
import { SCROLL, type L } from "../kit.tsx";

interface Paper {
  id: string;
  group: "tools" | "engraving" | "machines" | "projects";
  title: string;
  authors: string;
  /** venue and year, or "repository" / "website" */
  where: string;
  url: string;
  why: L;
}

const PAPER_GROUPS: { id: Paper["group"]; title: L }[] = [
  { id: "tools", title: ["Scores as data", "樂譜即資料"] },
  { id: "engraving", title: ["Engraving and layout", "排版與版面"] },
  { id: "machines", title: ["Machines that read, hear and write music", "會讀譜、聽音樂、寫音樂的機器"] },
  { id: "projects", title: ["Projects and tools", "專案與工具"] },
];

const PAPERS: Paper[] = [
  // Scores as data
  {
    id: "music21",
    group: "tools",
    title: "music21: A Toolkit for Computer-Aided Musicology and Symbolic Music Data",
    authors: "Michael Scott Cuthbert, Christopher Ariza",
    where: "ISMIR 2010",
    url: "https://doi.org/10.5281/zenodo.1416114",
    why: [
      "The paper behind the library every score here is written in: why music should be objects you can query, transform and check in Python.",
      "本站每份樂譜所用程式庫背後的論文：為什麼音樂應該是能在 Python 裡查詢、轉換與檢查的物件。",
    ],
  },
  {
    id: "musicxml",
    group: "tools",
    title: "Using MusicXML for File Interchange",
    authors: "Michael Good, Geri Actor",
    where: "WEDELMUSIC 2003",
    url: "https://doi.org/10.1109/WDM.2003.1233890",
    why: [
      "How MusicXML became the common format between notation programs: the format the editor imports and exports.",
      "MusicXML 如何成為各家記譜軟體之間的共通格式：也就是本站編輯器匯入與匯出所用的格式。",
    ],
  },
  {
    id: "mei",
    group: "tools",
    title: "The Music Encoding Initiative as a Document-Encoding Framework",
    authors: "Andrew Hankinson, Perry Roland, Ichiro Fujinaga",
    where: "ISMIR 2011",
    url: "https://doi.org/10.5281/zenodo.1417609",
    why: [
      "MEI, the scholarly encoding Verovio draws natively: music encoded the way the TEI encodes texts, so editions can record sources and variants.",
      "MEI 是 Verovio 原生繪製的學術編碼格式：仿照 TEI 編碼文本的方式來編碼音樂，讓校訂版能記錄來源與異文。",
    ],
  },
  {
    id: "humdrum",
    group: "tools",
    title: "Music Information Processing Using the Humdrum Toolkit: Concepts, Examples, and Lessons",
    authors: "David Huron",
    where: "Computer Music Journal 26(2), 2002",
    url: "https://doi.org/10.1162/014892602760137158",
    why: [
      "Humdrum treats a score as plain text you can search with small tools: the older cousin of checking a score with code.",
      "Humdrum 把樂譜當成可以用小工具搜尋的純文字：是「用程式碼檢查樂譜」的老前輩。",
    ],
  },
  // Engraving and layout
  {
    id: "verovio",
    group: "engraving",
    title: "Verovio: A Library for Engraving MEI Music Notation into SVG",
    authors: "Laurent Pugin, Rodolfo Zitellini, Perry Roland",
    where: "ISMIR 2014",
    url: "https://doi.org/10.5281/zenodo.1417589",
    why: [
      "The engraver that draws every score on this site, in the browser: how it lays out notes and why it outputs SVG you can style and click.",
      "在瀏覽器中繪出本站每份樂譜的排版引擎：它如何安排音符，以及為什麼輸出可以套樣式、可以點選的 SVG。",
    ],
  },
  {
    id: "knuth-plass",
    group: "engraving",
    title: "Breaking Paragraphs into Lines",
    authors: "Donald E. Knuth, Michael F. Plass",
    where: "Software: Practice and Experience 11(11), 1981",
    url: "https://doi.org/10.1002/spe.4380111102",
    why: [
      "TeX's line breaking: choose all the breaks of a paragraph at once by minimising a total cost. The same idea places system breaks and page turns in a part.",
      "TeX 的換行演算法：把一段文字的所有斷點一起選，讓總成本最小。同樣的想法也能用來安排分譜的換行與翻頁位置。",
    ],
  },
  // Machines that read, hear and write music
  {
    id: "omr-survey",
    group: "machines",
    title: "Understanding Optical Music Recognition",
    authors: "Jorge Calvo-Zaragoza, Jan Hajič Jr., Alexander Pacha",
    where: "ACM Computing Surveys 53(4), 2020",
    url: "https://doi.org/10.1145/3397499",
    why: [
      "What optical music recognition is, why reading a printed score is harder than reading text, and how the field is organised: the map for the roadmap's score scanning.",
      "光學樂譜辨識是什麼、為什麼讀印刷樂譜比讀文字難，以及這個領域的全貌：路線圖中「掃描樂譜」的地圖。",
    ],
  },
  {
    id: "omr-2012",
    group: "machines",
    title: "Optical Music Recognition: State-of-the-Art and Open Issues",
    authors: "Ana Rebelo, Ichiro Fujinaga, Filipe Paszkiewicz, Andre R. S. Marcal, Carlos Guedes, Jaime S. Cardoso",
    where: "International Journal of Multimedia Information Retrieval 1(3), 2012",
    url: "https://doi.org/10.1007/s13735-012-0004-6",
    why: [
      "The classic pipeline before deep learning: staff-line removal, symbol recognition and rebuilding the notation, step by step.",
      "深度學習之前的經典流程：去除譜線、辨識符號、重建記譜，一步一步來。",
    ],
  },
  {
    id: "amt-overview",
    group: "machines",
    title: "Automatic Music Transcription: An Overview",
    authors: "Emmanouil Benetos, Simon Dixon, Zhiyao Duan, Sebastian Ewert",
    where: "IEEE Signal Processing Magazine 36(1), 2019",
    url: "https://doi.org/10.1109/MSP.2018.2869928",
    why: [
      "From recorded sound to notes: what transcription can and cannot do yet, and why turning notes into a readable score is a separate problem.",
      "從錄音到音符：採譜目前做得到與做不到的事，以及為什麼把音符變成好讀的樂譜是另一個問題。",
    ],
  },
  {
    id: "onsets-frames",
    group: "machines",
    title: "Onsets and Frames: Dual-Objective Piano Transcription",
    authors: "Curtis Hawthorne, Erich Elsen, Jialin Song, Adam Roberts, Ian Simon, Colin Raffel, Jesse Engel, Sageev Oore, Douglas Eck",
    where: "ISMIR 2018",
    url: "https://arxiv.org/abs/1710.11153",
    why: [
      "A neural network that hears piano recordings note by note, by predicting where notes start separately from how long they sound.",
      "一個能逐音聽寫鋼琴錄音的神經網路：把「音從哪裡開始」與「音持續多久」分開預測。",
    ],
  },
  {
    id: "basic-pitch",
    group: "machines",
    title: "A Lightweight Instrument-Agnostic Model for Polyphonic Note Transcription and Multipitch Estimation",
    authors: "Rachel M. Bittner, Juan José Bosch, David Rubinstein, Gabriel Meseguer-Brocal, Sebastian Ewert",
    where: "ICASSP 2022",
    url: "https://doi.org/10.1109/ICASSP43922.2022.9746549",
    why: [
      "Basic Pitch: a small model that transcribes any instrument and is light enough to run in a browser, the kind of model the roadmap's transcription needs.",
      "Basic Pitch：一個能為任何樂器採譜的小模型，輕到能在瀏覽器裡執行，正是路線圖中採譜功能需要的那種模型。",
    ],
  },
  {
    id: "coconet",
    group: "machines",
    title: "Counterpoint by Convolution",
    authors: "Cheng-Zhi Anna Huang, Tim Cooijmans, Adam Roberts, Aaron Courville, Douglas Eck",
    where: "ISMIR 2017",
    url: "https://doi.org/10.5281/zenodo.1416370",
    why: [
      "Coconet learns to fill in Bach chorales one note at a time, the way a student revises an exercise: a model to compare with the rule checker in Learn to Code.",
      "Coconet 學會一次一個音地補完巴赫聖詠，就像學生修改習題一樣：可以拿來和「學寫程式」單元的規則檢查器對照。",
    ],
  },
  {
    id: "music-transformer",
    group: "machines",
    title: "Music Transformer: Generating Music with Long-Term Structure",
    authors: "Cheng-Zhi Anna Huang, Ashish Vaswani, Jakob Uszkoreit, Noam Shazeer, Ian Simon, Curtis Hawthorne, Andrew M. Dai, Matthew D. Hoffman, Monica Dinculescu, Douglas Eck",
    where: "ICLR 2019",
    url: "https://arxiv.org/abs/1809.04281",
    why: [
      "The Transformer applied to music, with relative attention so a motif can return many bars later: the start of today's music-writing models.",
      "把 Transformer 用在音樂上，並以相對注意力讓動機能在許多小節之後重現：今日寫音樂的模型由此開始。",
    ],
  },
  // Projects and tools
  {
    id: "music21-repo",
    group: "projects",
    title: "cuthbertLab/music21",
    authors: "",
    where: "repository",
    url: "https://github.com/cuthbertLab/music21",
    why: [
      "The source of music21, with its built-in corpus of Bach chorales and more, which the Library draws on.",
      "music21 的原始碼，附有內建的巴赫聖詠等曲庫，本站「曲庫」即取材於此。",
    ],
  },
  {
    id: "verovio-site",
    group: "projects",
    title: "Verovio",
    authors: "",
    where: "website",
    url: "https://www.verovio.org/",
    why: [
      "The engraving library's home, with an online editor for trying MEI, MusicXML, Humdrum and ABC input.",
      "這個排版程式庫的官網，附有線上編輯器，可以試用 MEI、MusicXML、Humdrum 與 ABC 輸入。",
    ],
  },
  {
    id: "musicxml-spec",
    group: "projects",
    title: "MusicXML 4.0",
    authors: "W3C Music Notation Community Group",
    where: "website",
    url: "https://www.w3.org/2021/06/musicxml40/",
    why: [
      "The full specification of MusicXML, with an example for every element: the place to look when an import goes wrong.",
      "MusicXML 的完整規格，每個元素都附範例：匯入出錯時該查的地方。",
    ],
  },
  {
    id: "mei-site",
    group: "projects",
    title: "Music Encoding Initiative",
    authors: "",
    where: "website",
    url: "https://music-encoding.org/",
    why: ["The MEI guidelines, schema and community.", "MEI 的編碼指引、綱要與社群。"],
  },
  {
    id: "humdrum-site",
    group: "projects",
    title: "The Humdrum Toolkit",
    authors: "",
    where: "website",
    url: "https://www.humdrum.org/",
    why: [
      "Documentation and tools for the kern format, and a large collection of encoded scores.",
      "kern 格式的說明與工具，以及大量已編碼的樂譜。",
    ],
  },
  {
    id: "imslp",
    group: "projects",
    title: "IMSLP / Petrucci Music Library",
    authors: "",
    where: "website",
    url: "https://imslp.org/",
    why: [
      "Public-domain scores, including Fux's Gradus ad Parnassum: material to copy into code, and future input for score scanning.",
      "公版樂譜，包括 Fux 的《Gradus ad Parnassum》：可以轉寫成程式碼的素材，也是將來掃描樂譜的輸入。",
    ],
  },
  {
    id: "lilypond",
    group: "projects",
    title: "LilyPond",
    authors: "",
    where: "website",
    url: "https://lilypond.org/",
    why: [
      "Scores written as text and engraved with TeX-style care: another take on music as code, with notes on good engraving.",
      "以文字寫樂譜、以 TeX 般的講究來排版：「音樂即程式碼」的另一種做法，也有談好排版的文章。",
    ],
  },
  {
    id: "musescore",
    group: "projects",
    title: "MuseScore",
    authors: "",
    where: "website",
    url: "https://musescore.org/",
    why: [
      "Free notation software: open MusicXML exported from the editor here to keep working on it by hand.",
      "免費的記譜軟體：把本站編輯器匯出的 MusicXML 打開，就能用手繼續修改。",
    ],
  },
  {
    id: "basic-pitch-repo",
    group: "projects",
    title: "spotify/basic-pitch",
    authors: "",
    where: "repository",
    url: "https://github.com/spotify/basic-pitch",
    why: ["The open-source Basic Pitch model: audio in, MIDI out.", "開源的 Basic Pitch 模型：輸入音訊、輸出 MIDI。"],
  },
  {
    id: "magenta",
    group: "projects",
    title: "magenta/magenta",
    authors: "",
    where: "repository",
    url: "https://github.com/magenta/magenta",
    why: [
      "Google's research project behind Coconet, Onsets and Frames and Music Transformer.",
      "Google 的研究專案，Coconet、Onsets and Frames 與 Music Transformer 都出自這裡。",
    ],
  },
  {
    id: "omr-datasets",
    group: "projects",
    title: "apacha/OMR-Datasets",
    authors: "",
    where: "repository",
    url: "https://github.com/apacha/OMR-Datasets",
    why: [
      "A list of the datasets used to train and test optical music recognition.",
      "一份用來訓練與測試光學樂譜辨識的資料集清單。",
    ],
  },
];

export default function PapersReading({ section }: { section: string | null }) {
  const { pick } = useLang();
  useEffect(() => {
    const el = section && document.getElementById(`papers-${section}`);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
    else document.getElementById(SCROLL)?.scrollTo({ top: 0 });
  }, [section]);
  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-5 pt-6 pb-10" data-testid="page-papers">
      <PageToc
        scrollRoot={SCROLL}
        title={pick(["On this page", "本頁內容"])}
        className="top-6"
        items={PAPER_GROUPS.map((g, i) => ({ id: `papers-${g.id}`, mark: i + 1, label: pick(g.title) }))}
      />
      <article className="min-w-0 max-w-4xl flex-1 space-y-10">
        <header>
          <p className="text-sm font-medium text-(--lk-accent)">{pick(["Further reading", "延伸閱讀"])}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{pick(["Papers & projects", "論文與專案"])}</h1>
          <p className="mt-3 text-gray-600">
            {pick([
              "The papers behind music21, Verovio and the formats scores travel in, the idea behind laying out lines and pages, the research on machines that read, hear and write music, and the projects Polyphonizer builds on.",
              "music21、Verovio 以及樂譜流通格式背後的論文、安排譜行與頁面背後的想法、讓機器讀譜、聽音樂、寫音樂的研究，以及 Polyphonizer 所依靠的專案。",
            ])}
          </p>
        </header>
        {PAPER_GROUPS.map((g, i) => (
          <section key={g.id} id={`papers-${g.id}`} className="scroll-mt-6">
            <h2 className="flex flex-wrap items-baseline gap-3 text-lg font-semibold text-gray-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--lk-accent) text-sm text-white">{i + 1}</span>
              {pick(g.title)}
            </h2>
            <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {PAPERS.filter((p) => p.group === g.id).map((p) => (
                <li key={p.id} className="px-5 py-4" data-testid={`paper-${p.id}`}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-(--lk-accent) hover:underline"
                    lang="en"
                  >
                    {p.title} ↗
                  </a>
                  <p className="mt-0.5 text-xs text-gray-500" lang="en">
                    {[
                      p.authors,
                      p.where === "repository"
                        ? pick(["repository", "程式庫"])
                        : p.where === "website"
                          ? pick(["website", "網站"])
                          : p.where,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
                    <RichText text={pick(p.why)} />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </article>
    </div>
  );
}
