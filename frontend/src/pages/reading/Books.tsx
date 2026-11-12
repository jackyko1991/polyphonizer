/**
 * Further reading ▸ Books (#/reading/books[/<group>]), in Formalizer's and Tensorizer's way: books in groups, top
 * picks (★) first, each card with title, authors, publisher and year, a one-line reason, a free official edition when
 * there is one, and the page of this site it goes with. Authors, publishers and years were checked against Open
 * Library when this page was written; links were checked by hand. Title, authors and publisher stay in English.
 */
import { go, PageToc, RichText, useLang } from "@learnkit/web";
import { useEffect } from "react";
import { SCROLL, type L } from "../kit.tsx";

interface Book {
  id: string;
  group: "start" | "theory" | "engraving" | "computers";
  /** a top pick (★): listed first within its group */
  top: boolean;
  title: string;
  edition?: string;
  authors: string;
  /** "online" for books that exist only as a free website */
  publisher: string;
  /** printed books only */
  year?: number;
  why: L;
  /** a free official online edition (or the book itself, when it is online only) */
  free?: string;
  /** what the free link is, when it is not the book itself or a companion */
  freeLabel?: L;
  /** the matching page of this site */
  site: { to: [string, string?, string?]; label: L };
}

const BOOK_GROUPS: { id: Book["group"]; title: L }[] = [
  { id: "start", title: ["Start here (free online)", "從這裡開始（免費線上）"] },
  { id: "theory", title: ["Counterpoint and harmony", "對位與和聲"] },
  { id: "engraving", title: ["Notation, engraving and parts", "記譜、排版與分譜"] },
  { id: "computers", title: ["Computers and music", "電腦與音樂"] },
];

const THEORY: Book["site"] = { to: ["concept", "theory"], label: ["Concept ▸ Music theory as code", "概念 ▸ 以程式碼表達樂理"] };
const ENGRAVING: Book["site"] = { to: ["concept", "engraving"], label: ["Concept ▸ How a score is engraved", "概念 ▸ 樂譜如何排版"] };
const SPECIES: Book["site"] = { to: ["learn", "species-1-above"], label: ["Learn ▸ First species", "學習 ▸ 第一類對位"] };

const BOOKS: Book[] = [
  // Start here (free online)
  {
    id: "omt",
    group: "start",
    top: true,
    title: "Open Music Theory",
    edition: "Version 2",
    authors: "Mark Gotham, Kyle Gullings, Chelsey Hamm, Bryn Hughes, Brian Jarvis, Megan Lavengood, John Peterson",
    publisher: "online",
    why: [
      "A free, open textbook covering the whole theory sequence: notation, intervals, species counterpoint, harmony, form and post-tonal music. The best companion to the Learn to Code track.",
      "一本免費、開放授權的教科書，涵蓋整套樂理課程：記譜、音程、類別對位、和聲、曲式與後調性音樂。是「學寫程式」單元最好的夥伴。",
    ],
    free: "https://viva.pressbooks.pub/openmusictheory/",
    site: THEORY,
  },
  {
    id: "music21-guide",
    group: "start",
    top: true,
    title: "music21 User's Guide",
    authors: "Michael Scott Cuthbert and the music21 contributors",
    publisher: "online",
    why: [
      "The official tutorial for the library every score on this site is written in: notes, streams, chords, keys, the corpus and analysis, chapter by chapter.",
      "本站每份樂譜所用程式庫的官方教學：音符、stream、和弦、調性、內建曲庫與分析，一章一章帶你走。",
    ],
    free: "https://www.music21.org/music21docs/usersGuide/index.html",
    site: { to: ["skills", "first"], label: ["Coding Skills ▸ First music21", "程式技巧 ▸ 第一步 music21"] },
  },
  {
    id: "verovio-book",
    group: "start",
    top: false,
    title: "Verovio Reference Book",
    authors: "The Verovio project (RISM Digital Center)",
    publisher: "online",
    why: [
      "How the engraver behind every score here works: its options for page size, spacing, breaks and fonts, and the formats it reads (MEI, MusicXML, Humdrum, ABC).",
      "本站每份樂譜背後的排版引擎如何運作：頁面大小、間距、換行與字型等選項，以及它能讀的格式（MEI、MusicXML、Humdrum、ABC）。",
    ],
    free: "https://book.verovio.org/",
    site: ENGRAVING,
  },
  {
    id: "mt21c",
    group: "start",
    top: false,
    title: "Music Theory for the 21st-Century Classroom",
    authors: "Robert Hutchinson",
    publisher: "online",
    why: [
      "A short, clear, free textbook of the basics, from reading clefs to four-part voice leading, with listening examples throughout.",
      "一本簡短清楚的免費基礎樂理教科書，從讀譜號到四部聲部進行，處處附有聆聽範例。",
    ],
    free: "https://musictheory.pugetsound.edu/mt21c/frontmatter.html",
    site: THEORY,
  },
  // Counterpoint and harmony
  {
    id: "fux",
    group: "theory",
    top: true,
    title: "The Study of Counterpoint (from Gradus ad Parnassum)",
    authors: "Johann Joseph Fux; translated and edited by Alfred Mann",
    publisher: "W. W. Norton",
    year: 1965,
    why: [
      "The 1725 dialogue between a master and a pupil that defined the species of counterpoint. The rules the Learn checker applies to first species come straight from here.",
      "1725 年一位老師與學生的對話錄，定義了各類對位。「學寫程式」單元檢查第一類對位所用的規則，直接出自這本書。",
    ],
    free: "https://imslp.org/wiki/Gradus_ad_Parnassum_(Fux,_Johann_Joseph)",
    freeLabel: ["The 1725 Latin original on IMSLP", "IMSLP 上的 1725 年拉丁文原版"],
    site: SPECIES,
  },
  {
    id: "jeppesen",
    group: "theory",
    top: false,
    title: "Counterpoint: The Polyphonic Vocal Style of the Sixteenth Century",
    edition: "trans. Glen Haydon",
    authors: "Knud Jeppesen",
    publisher: "Prentice-Hall",
    year: 1939,
    why: [
      "Species counterpoint taught from Palestrina's actual practice rather than from rules alone; still in print as a Dover reprint.",
      "以帕勒斯特里納的實際寫法來教類別對位，而不只是背規則；至今仍有 Dover 重印本。",
    ],
    site: SPECIES,
  },
  {
    id: "schubert",
    group: "theory",
    top: false,
    title: "Modal Counterpoint, Renaissance Style",
    authors: "Peter Schubert",
    publisher: "Oxford University Press",
    year: 1999,
    why: [
      "A modern, hands-on course in Renaissance counterpoint, from two-voice species to imitation and writing in the style of a real motet.",
      "一套現代、動手做的文藝復興對位課程，從兩聲部類別對位一路到模仿，以及仿經文歌風格的寫作。",
    ],
    site: { to: ["learn", "species-1-below"], label: ["Learn ▸ First species below", "學習 ▸ 下方第一類對位"] },
  },
  {
    id: "kennan",
    group: "theory",
    top: false,
    title: "Counterpoint: Based on Eighteenth-Century Practice",
    authors: "Kent Kennan",
    publisher: "Prentice-Hall",
    year: 1959,
    why: [
      "The standard short course in Bach-style tonal counterpoint: two-voice writing, inventions, canon and fugue.",
      "巴赫風格調性對位的標準精簡教材：兩聲部寫作、創意曲、卡農與賦格。",
    ],
    site: { to: ["learn", "twinkle-duet"], label: ["Learn ▸ Duet", "學習 ▸ 二重奏"] },
  },
  {
    id: "aldwell",
    group: "theory",
    top: true,
    title: "Harmony and Voice Leading",
    authors: "Edward Aldwell, Carl Schachter (Allen Cadwallader from the 4th edition)",
    publisher: "Harcourt Brace Jovanovich",
    year: 1978,
    why: [
      "Harmony taught as the movement of lines: the book that explains why the voice-leading rules exist, not just what they are.",
      "把和聲當作線條的運動來教：這本書解釋聲部進行規則「為什麼」存在，而不只是列出規則。",
    ],
    site: { to: ["concept", "theory", "motion"], label: ["Concept ▸ Music theory as code", "概念 ▸ 以程式碼表達樂理"] },
  },
  {
    id: "laitz",
    group: "theory",
    top: false,
    title: "The Complete Musician: An Integrated Approach to Theory, Analysis, and Listening",
    authors: "Steven G. Laitz",
    publisher: "Oxford University Press",
    year: 2003,
    why: [
      "A complete college theory course that ties writing, analysis and listening together; later editions keep it up to date.",
      "一套完整的大學樂理課程，把寫作、分析與聆聽串在一起；後續版本持續更新。",
    ],
    site: THEORY,
  },
  // Notation, engraving and parts
  {
    id: "gould",
    group: "engraving",
    top: true,
    title: "Behind Bars: The Definitive Guide to Music Notation",
    authors: "Elaine Gould",
    publisher: "Faber Music",
    year: 2011,
    why: [
      "The reference for how music should look on the page: spacing, beaming, accidentals, and a whole chapter on preparing parts, including where page turns belong.",
      "樂譜在紙面上應該長什麼樣子的權威參考：間距、符槓、臨時記號，還有整整一章談分譜製作，包括翻頁該放在哪裡。",
    ],
    site: { to: ["concept", "engraving", "turns"], label: ["Concept ▸ Page turns", "概念 ▸ 翻頁"] },
  },
  {
    id: "read",
    group: "engraving",
    top: false,
    title: "Music Notation: A Manual of Modern Practice",
    edition: "2nd ed.",
    authors: "Gardner Read",
    publisher: "Taplinger",
    year: 1969,
    why: [
      "The classic manual before Behind Bars: each symbol of standard notation, how it is written and why.",
      "Behind Bars 之前的經典手冊：標準記譜的每個符號，怎麼寫、為什麼這樣寫。",
    ],
    site: ENGRAVING,
  },
  {
    id: "stone",
    group: "engraving",
    top: false,
    title: "Music Notation in the Twentieth Century: A Practical Guidebook",
    authors: "Kurt Stone",
    publisher: "W. W. Norton",
    year: 1980,
    why: [
      "What to do when standard notation runs out: new signs for new sounds, and the conventions players actually agreed on.",
      "當標準記譜不夠用時該怎麼辦：為新聲響設計的新符號，以及演奏者真正達成共識的慣例。",
    ],
    site: { to: ["concept", "limits"], label: ["Concept ▸ Limits of notation", "概念 ▸ 記譜的限度"] },
  },
  // Computers and music
  {
    id: "muller",
    group: "computers",
    top: true,
    title: "Fundamentals of Music Processing",
    edition: "2nd ed.",
    authors: "Meinard Müller",
    publisher: "Springer",
    year: 2021,
    why: [
      "The textbook of music information retrieval: audio features, chords, tempo, alignment and transcription, the ground under the roadmap's audio-to-score plans.",
      "音樂資訊檢索的教科書：音訊特徵、和弦、速度、對齊與採譜，是路線圖中「音訊轉樂譜」計畫的基礎。",
    ],
    free: "https://www.audiolabs-erlangen.de/FMP",
    freeLabel: ["Free Python notebooks (FMP)", "免費 Python 筆記本（FMP）"],
    site: { to: ["agents", "tools"], label: ["AI agent ▸ AI music tools", "AI 代理 ▸ AI 音樂工具"] },
  },
  {
    id: "beyond-midi",
    group: "computers",
    top: false,
    title: "Beyond MIDI: The Handbook of Musical Codes",
    authors: "Eleanor Selfridge-Field (ed.)",
    publisher: "MIT Press",
    year: 1997,
    why: [
      "A tour of the many ways music has been encoded for computers, from MIDI to DARMS, kern and SCORE: why a score as code is an old idea.",
      "巡覽音樂被編碼給電腦的各種方式，從 MIDI 到 DARMS、kern 與 SCORE：「以程式碼寫樂譜」其實是個古老的想法。",
    ],
    site: { to: ["skills", "corpus"], label: ["Coding Skills ▸ Finding and importing music", "程式技巧 ▸ 尋找與匯入樂譜"] },
  },
  {
    id: "sweet-anticipation",
    group: "computers",
    top: false,
    title: "Sweet Anticipation: Music and the Psychology of Expectation",
    authors: "David Huron",
    publisher: "MIT Press",
    year: 2006,
    why: [
      "Why some notes sound inevitable and others surprising, by the author of the Humdrum toolkit: a reason behind many voice-leading rules.",
      "為什麼有些音聽起來理所當然、有些令人驚訝，作者正是 Humdrum 工具組的作者：許多聲部進行規則背後的理由。",
    ],
    site: { to: ["concept", "feynman", "ear"], label: ["Concept ▸ The Feynman technique", "概念 ▸ 費曼學習法"] },
  },
  {
    id: "temperley",
    group: "computers",
    top: false,
    title: "Music and Probability",
    authors: "David Temperley",
    publisher: "MIT Press",
    year: 2007,
    why: [
      "Key finding, meter and style as probability models: how a program can hear a score the way a listener does.",
      "以機率模型看調性判定、節拍與風格：程式如何像聽者一樣「聽」一份樂譜。",
    ],
    site: { to: ["agents", "tools"], label: ["AI agent ▸ AI music tools", "AI 代理 ▸ AI 音樂工具"] },
  },
];

export default function BooksReading({ section }: { section: string | null }) {
  const { pick } = useLang();
  useEffect(() => {
    const el = section && document.getElementById(`reading-${section}`);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
    else document.getElementById(SCROLL)?.scrollTo({ top: 0 });
  }, [section]);
  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-5 pt-6 pb-10" data-testid="page-books">
      <PageToc
        scrollRoot={SCROLL}
        title={pick(["On this page", "本頁內容"])}
        className="top-6"
        items={BOOK_GROUPS.map((g, i) => ({ id: `reading-${g.id}`, mark: i + 1, label: pick(g.title) }))}
      />
      <article className="min-w-0 max-w-4xl flex-1 space-y-10">
        <header>
          <p className="text-sm font-medium text-(--lk-accent)">{pick(["Further reading", "延伸閱讀"])}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{pick(["Books", "書籍"])}</h1>
          <p className="mt-3 text-gray-600">
            <RichText
              text={pick([
                "Where to go after Polyphonizer: free online books on music theory, music21 and Verovio first, then printed books on counterpoint and harmony, on notation and parts, and on how computers read and hear music. Top picks are marked ★.",
                "離開 Polyphonizer 之後可以去哪裡：先是關於樂理、music21 與 Verovio 的免費線上書，接著是對位與和聲、記譜與分譜，以及電腦如何讀譜與聽音樂的紙本書。首選以 ★ 標示。",
              ])}
            />
          </p>
        </header>
        {BOOK_GROUPS.map((g, i) => (
          <section key={g.id} id={`reading-${g.id}`} className="scroll-mt-6">
            <h2 className="flex flex-wrap items-baseline gap-3 text-lg font-semibold text-gray-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--lk-accent) text-sm text-white">{i + 1}</span>
              {pick(g.title)}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {BOOKS.filter((b) => b.group === g.id)
                .sort((a, b) => Number(b.top) - Number(a.top))
                .map((b) => (
                  <BookCard key={b.id} book={b} />
                ))}
            </div>
          </section>
        ))}
        <p className="border-t border-gray-200 pt-3 text-center text-xs text-gray-400">
          {pick([
            "Books chosen for this site; authors, publishers and years were checked when this page was written. No paid links.",
            "這些書是為本站挑選的；作者、出版社與年份在撰寫本頁時都已核對。沒有付費連結。",
          ])}
        </p>
      </article>
    </div>
  );
}

function BookCard({ book: b }: { book: Book }) {
  const { pick } = useLang();
  const online = b.publisher === "online";
  return (
    <div
      className={`flex flex-col rounded-xl border bg-white p-4 sm:p-5 ${b.top ? "border-amber-300" : "border-gray-200"}`}
      data-testid={`book-${b.id}`}
    >
      {b.top && (
        <span className="mb-2 self-start rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
          ★ {pick(["Top pick", "首選"])}
        </span>
      )}
      <h3 className="leading-snug font-semibold text-gray-900" lang="en">
        {b.title}
        {b.edition && <span className="font-normal text-gray-600"> ({b.edition})</span>}
      </h3>
      <p className="mt-1 text-sm text-gray-600" lang="en">
        {b.authors}
      </p>
      <p className="text-xs text-gray-500" lang={online ? undefined : "en"}>
        {online ? pick(["Free online book", "免費線上書"]) : `${b.publisher}, ${b.year}`}
      </p>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-700">
        <RichText text={pick(b.why)} />
      </p>
      {b.free && (
        <div className="mt-4 text-sm">
          <a href={b.free} target="_blank" rel="noopener noreferrer" className="font-medium text-(--lk-accent) hover:underline">
            {b.freeLabel
              ? pick(b.freeLabel)
              : online
                ? pick(["Read it online", "線上閱讀"])
                : pick(["Free companion online", "免費線上姊妹篇"])}{" "}
            ↗
          </a>
        </div>
      )}
      <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
        {pick(["On this site:", "本站相關："])}{" "}
        <button onClick={() => go(...b.site.to)} className="font-medium text-(--lk-accent) hover:underline">
          {pick(b.site.label)}
        </button>
      </p>
    </div>
  );
}
