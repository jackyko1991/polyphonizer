/** Coding Skills ▸ Finding and importing music (#/skills/corpus[/<section>]). Every example runs as score code. */
import { Callout, Notation, Figure, List, P, Page, Py, Section, SiteLink, Sources, Table, type SectionInfo } from "../kit";

const PAGE = "corpus";

const SECTIONS: SectionInfo[] = [
  { id: "corpus", title: ["music21's corpus", "music21 的曲庫"] },
  { id: "search", title: ["Searching the corpus", "搜尋曲庫"] },
  { id: "files", title: ["Your own files", "你自己的檔案"] },
  { id: "libraries", title: ["Public-domain libraries", "公有領域樂譜庫"] },
  { id: "licences", title: ["Licences: check each work", "授權：每部作品都要確認"] },
];

/** library → file → Import → load() → your code */
function Flow() {
  const boxes = [
    { x: 0, label: "OpenScore · Mutopia · KernScores · IMSLP" },
    { x: 1, label: ".mxl · .musicxml · .krn · .mid · .abc" },
    { x: 2, label: "Import file" },
    { x: 3, label: 'load("…")' },
  ];
  const w = 150;
  const gap = 34;
  return (
    <svg viewBox={`0 0 ${4 * w + 3 * gap} 64`} className="w-full max-w-2xl" role="img" aria-label="library, file, Import, load">
      {boxes.map((b) => {
        const x = b.x * (w + gap);
        return (
          <g key={b.x}>
            <rect x={x} y={8} width={w} height={44} rx={8} fill="white" stroke="#d1d5db" />
            <text x={x + w / 2} y={34} textAnchor="middle" fontSize={b.x < 2 ? 10 : 13} fill="#374151" fontFamily="ui-monospace, monospace">
              {b.label}
            </text>
            {b.x < 3 && <path d={`M${x + w + 4} 30 h${gap - 12} m-6 -5 l6 5 l-6 5`} fill="none" stroke="#e11d48" strokeWidth={2} />}
          </g>
        );
      })}
    </svg>
  );
}

const CORPUS_DOC = {
  label: "music21 User's Guide, Chapter 11: Corpus Searching",
  url: "https://www.music21.org/music21docs/usersGuide/usersGuide_11_corpusSearching.html",
};
const CORPUS_LIST = {
  label: "music21: List of works found in the music21 corpus",
  url: "https://www.music21.org/music21docs/about/referenceCorpus.html",
};

export default function CorpusSkill({ section }: { section: string | null }) {
  return (
    <Page
      id={PAGE}
      title={["Finding and importing music", "尋找與匯入樂譜"]}
      intro={[
        "You rarely need to type a whole piece. music21 comes with a corpus of encoded works, you can import files you already have, and public-domain libraries offer thousands more. This page shows how to get each kind into your code, and what to check before you use it.",
        "你很少需要把一整首曲子從頭打出來。music21 附有一個已編碼作品的曲庫，你可以匯入手上已有的檔案，公有領域的樂譜庫還有成千上萬首。這一頁說明如何把每一種來源放進你的程式碼，以及使用前要確認什麼。",
      ]}
      sections={SECTIONS}
      focus={section}
    >
      <Section page={PAGE} id="corpus" n={1} title={SECTIONS[0].title}>
        <P
          t={[
            "music21 is installed with its **corpus**: hundreds of works already encoded, as MusicXML, Humdrum and ABC files. They load by path, composer first, with no file to import. Bach's chorale BWV 66.6 is music21's favourite example:",
            "music21 安裝時就附帶它的**曲庫**（corpus）：數百部已經編碼好的作品，格式有 MusicXML、Humdrum 與 ABC。用路徑載入即可，作曲家放前面，不需要匯入檔案。巴哈的聖詠 BWV 66.6 是 music21 最愛用的例子：",
          ]}
        />
        <Py
          code={`chorale = corpus.parse("bach/bwv66.6")
score = chorale`}
          note={["four voices, Soprano to Bass, ten bars counting the pickup", "四個聲部，從女高音到男低音，連弱起小節共十小節"]}
        />
        <P
          t={[
            "A parsed work is an ordinary Score, so everything from *First music21* applies. Take parts by name or number, cut out bars, transpose:",
            "載入的作品就是普通的 Score，所以〈第一步 music21〉的一切都適用。可以用名稱或編號取出聲部、截取小節、移調：",
          ]}
        />
        <Py
          code={`chorale = corpus.parse("bach/bwv66.6")
soprano = chorale.parts["Soprano"]
bass = chorale.parts["Bass"]
outer = together(soprano, bass, title="Outer voices")
score = outer.measures(0, 4)  # the pickup bar (0) and bars 1 to 4`}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/8
K:A
c B | A2 B2 c2 e2 | c2 B2 A2 c2 |]`}
          caption={["BWV 66.6, Soprano: the pickup and bars 1–2", "BWV 66.6 女高音：弱起與第 1–2 小節"]}
          instrument={52}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/8
K:A clef=bass
A, G, | F,2 G,2 A,2 G,2 | A, C, E,2 A,,2 ^E,2 |]`}
          caption={["BWV 66.6, Bass: the same bars", "BWV 66.6 男低音：同樣的小節"]}
          instrument={52}
        />
        <Py
          code={`quartet = corpus.parse("mozart/k80/movement1")
cello = quartet.parts[-1]                  # the last part, the cello
score = cello.measures(1, 8)`}
          note={["Mozart's first string quartet, K. 80: the cello's first eight bars", "莫札特第一號弦樂四重奏 K. 80：大提琴的前八小節"]}
        />
        <Notation
          abc={`X:1
M:3/4
L:1/8
K:G clef=bass
G, G, G, G, G, G, | A, A, A, A, A, G, | F, F, F, F, F, F, | G, G, G, G, G, G, |]`}
          caption={["K. 80, the cello's first four bars", "K. 80，大提琴的前四小節"]}
          instrument={42}
        />
        <P
          t={[
            "What is there: several hundred Bach chorales; string quartets by Haydn, Mozart and Beethoven (`\"beethoven/opus18no1\"` opens the first movement of Op. 18 No. 1); over a thousand pieces by Palestrina; Monteverdi madrigals; and folk-song collections. The full list is on music21's site.",
            "裡面有什麼：數百首巴哈聖詠；海頓、莫札特與貝多芬的弦樂四重奏（`\"beethoven/opus18no1\"` 會開啟作品 18 第 1 號的第一樂章）；超過一千首帕勒斯提那的作品；蒙台威爾第的牧歌；以及民歌集。完整清單在 music21 的網站上。",
          ]}
        />
        <Callout kind="note" title={["The first run takes a moment", "第一次執行要等一下"]}>
          <P
            t={[
              "The corpus comes with music21, which your browser downloads once (about 20 seconds the first time). Parsing a long movement can take a few seconds more: cut it down with `.measures()` while you work.",
              "曲庫隨 music21 一起提供，瀏覽器只需下載一次（第一次約 20 秒）。解析很長的樂章可能還要多幾秒：工作時先用 `.measures()` 把它截短。",
            ]}
          />
        </Callout>
        <Sources items={[CORPUS_LIST]} />
      </Section>

      <Section page={PAGE} id="search" n={2} title={SECTIONS[1].title}>
        <P
          t={[
            "When you don't know the path, search. `corpus.search()` looks through every work's metadata (composer, title, key, time signature …) and returns a list of matches; `.parse()` on a match opens it:",
            "不知道路徑時就搜尋。`corpus.search()` 會查遍每部作品的後設資料（作曲家、標題、調、拍號……），傳回符合的清單；對其中一筆呼叫 `.parse()` 就會開啟它：",
          ]}
        />
        <Py
          code={`found = corpus.search("haydn")          # every work whose data mentions Haydn
first = found[0].parse()                # parse the first one found
score = first.measures(1, 4)`}
        />
        <List
          items={[
            [
              "Narrow a search to one field: `corpus.search(\"3/4\", \"timeSignature\")` finds works in 3/4.",
              "只搜尋一個欄位：`corpus.search(\"3/4\", \"timeSignature\")` 找出 3/4 拍的作品。",
            ],
            [
              "`len(found)` is how many matched; `found[i].sourcePath` is the path to give `corpus.parse()` next time.",
              "`len(found)` 是符合的數量；`found[i].sourcePath` 是下次可以直接交給 `corpus.parse()` 的路徑。",
            ],
            [
              "`corpus.getComposer(\"bach\")` lists every file of one composer.",
              "`corpus.getComposer(\"bach\")` 列出一位作曲家的所有檔案。",
            ],
          ]}
        />
        <Sources items={[CORPUS_DOC]} />
      </Section>

      <Section page={PAGE} id="files" n={3} title={SECTIONS[2].title}>
        <P
          t={[
            "For a file of your own, press **Import file** in the editor and pick it: MusicXML (`.musicxml`, `.xml`, or the compressed `.mxl`), MIDI (`.mid`), ABC or Humdrum (`.krn`). Then open it in code by its file name with `load()`:",
            "要用你自己的檔案，就在編輯器按**匯入檔案**並選取它：MusicXML（`.musicxml`、`.xml`，或壓縮的 `.mxl`）、MIDI（`.mid`）、ABC 或 Humdrum（`.krn`）。接著在程式碼裡用 `load()` 加上檔名開啟它：",
          ]}
        />
        <Py
          code={`song = load("my-song.musicxml")   # the file name as you imported it
score = song`}
        />
        <P
          t={[
            "`load()` returns a music21 Score, so you can keep a part, transpose it, or rename it:",
            "`load()` 傳回一份 music21 的 Score，所以你可以只留一個聲部、移調，或重新命名：",
          ]}
        />
        <Py
          code={`song = load("my-song.musicxml")
melody = song.parts[0].transpose("P8")  # the first part, an octave higher
melody.partName = "Flute"
score = together(melody, title="For flute")`}
        />
        <Figure caption={["From a library to your code: download a data file, import it, `load()` it", "從樂譜庫到你的程式碼：下載資料檔、匯入、用 `load()` 載入"]}>
          <Flow />
        </Figure>
        <Table
          head={[
            ["Format", "格式"],
            ["What you get", "你會得到什麼"],
          ]}
          rows={[
            [
              ["MusicXML, `.mxl`", "MusicXML、`.mxl`"],
              [
                "The best choice: notes, spelling (F♯ or G♭), part names, key, clefs, dynamics and lyrics, as the editor wrote them.",
                "最好的選擇：音符、拼法（F♯ 還是 G♭）、聲部名稱、調號、譜號、力度與歌詞，都照編輯者寫的。",
              ],
            ],
            [
              ["Humdrum `.krn`, ABC", "Humdrum `.krn`、ABC"],
              [
                "Text formats used in research and folk music; notes and spelling come through well.",
                "研究與民歌常用的文字格式；音符與拼法都能好好保留。",
              ],
            ],
            [
              ["MIDI", "MIDI"],
              [
                "A recording of key presses: no part names (you get *Part 1*), sharps and flats guessed, and rhythms that may need cleaning if it was played live.",
                "按鍵的紀錄：沒有聲部名稱（會變成 *Part 1*），升降記號靠猜，如果是現場彈奏的，節奏可能還需要整理。",
              ],
            ],
          ]}
        />
        <Callout kind="warn" title={["Imported files stay in this browser tab", "匯入的檔案只留在這個分頁"]}>
          <P
            t={[
              "Nothing is uploaded: the file stays in your browser. If the editor asks you to import a file again, do so with the same name; `load()` finds files by exact name, so `My Song.musicxml` and `my-song.musicxml` are different files.",
              "沒有任何東西會被上傳：檔案留在你的瀏覽器裡。如果編輯器請你再匯入一次檔案，就用同樣的檔名匯入；`load()` 依完全相同的檔名尋找檔案，所以 `My Song.musicxml` 和 `my-song.musicxml` 是不同的檔案。",
            ]}
          />
        </Callout>
        <p>
          <SiteLink to={["editor"]} label={["Open the score editor", "開啟樂譜編輯器"]} />
        </p>
      </Section>

      <Section page={PAGE} id="libraries" n={4} title={SECTIONS[3].title}>
        <P
          t={[
            "Four libraries hold most of the free music online. The question for Polyphonizer is whether a library gives you a **data file** (notes a program can read) or only a **scan** (a picture of a printed page). Only data files can be imported.",
            "網路上大部分免費的樂譜集中在四個樂譜庫。對 Polyphonizer 來說，關鍵是這個樂譜庫給你的是**資料檔**（程式讀得懂的音符），還是只有**掃描檔**（印刷頁面的圖片）。只有資料檔可以匯入。",
          ]}
        />
        <Table
          head={[
            ["Library", "樂譜庫"],
            ["What it has", "內容"],
            ["Import into Polyphonizer", "匯入 Polyphonizer"],
          ]}
          rows={[
            [
              ["**OpenScore**", "**OpenScore**"],
              [
                "Public-domain works typed in by volunteers, including large collections of Lieder and string quartets; made in MuseScore: open a file in MuseScore (free) and export it as MusicXML.",
                "由志工輸入的公有領域作品，包括大量藝術歌曲與弦樂四重奏；檔案用 MuseScore 製作：用 MuseScore（免費）開啟後匯出成 MusicXML。",
              ],
              ["Yes, as MusicXML", "可以，用 MusicXML"],
            ],
            [
              ["**Mutopia Project**", "**Mutopia Project**"],
              [
                "Typeset editions of classical music in LilyPond, each with a PDF, the LilyPond source and a MIDI file.",
                "用 LilyPond 排版的古典音樂版本，每首附 PDF、LilyPond 原始檔與 MIDI 檔。",
              ],
              [
                "The MIDI file only: music21 does not read LilyPond.",
                "只能用 MIDI 檔：music21 讀不了 LilyPond。",
              ],
            ],
            [
              ["**KernScores**", "**KernScores**"],
              [
                "A large research collection in Humdrum `**kern`: Bach chorales, Renaissance polyphony, string quartets, folk songs.",
                "大型研究用曲庫，格式是 Humdrum `**kern`：巴哈聖詠、文藝復興複音音樂、弦樂四重奏、民歌。",
              ],
              ["Yes, the `.krn` files", "可以，用 `.krn` 檔"],
            ],
            [
              ["**IMSLP**", "**IMSLP**"],
              [
                "The largest library of public-domain scores, almost all as scanned PDFs of printed editions; a few works also have user-made MusicXML or MIDI files.",
                "最大的公有領域樂譜庫，幾乎都是印刷版本掃描成的 PDF；少數作品另有使用者製作的 MusicXML 或 MIDI 檔。",
              ],
              [
                "Scans: no (they would need optical music recognition first). Data files: yes.",
                "掃描檔：不行（得先經過光學樂譜辨識）。資料檔：可以。",
              ],
            ],
          ]}
        />
        <P
          t={[
            "A good habit with any downloaded file: run it once with no changes, then compare a few bars with a printed edition before you build on it. Typed-in scores contain mistakes too.",
            "對任何下載來的檔案都有個好習慣：先不改任何東西執行一次，再拿幾個小節和印刷版比對，然後才在它上面繼續做。人工輸入的樂譜也會有錯。",
          ]}
        />
        <Sources
          items={[
            { label: "OpenScore", url: "https://openscore.cc/" },
            { label: "The Mutopia Project", url: "https://www.mutopiaproject.org/" },
            { label: "KernScores", url: "https://kern.humdrum.org/" },
            { label: "IMSLP / Petrucci Music Library", url: "https://imslp.org/" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="licences" n={5} title={SECTIONS[4].title}>
        <P
          t={[
            "The music of Bach is long out of copyright, but **a file is a new piece of work**: an edition, a typesetting or an encoding can have its own licence. Before you share or publish something built on a file, read the licence that comes with that file:",
            "巴哈的音樂早已不受著作權保護，但**一個檔案是一份新的成果**：一個版本、一次排版或一份編碼，都可能有自己的授權。要分享或發表根據某個檔案做出的東西之前，先讀那個檔案附帶的授權：",
          ]}
        />
        <List
          items={[
            [
              "**Mutopia** gives a licence for every piece: public domain, or a Creative Commons licence that may ask for credit (BY) or that you share alike (BY-SA).",
              "**Mutopia** 每一首都標明授權：公有領域，或可能要求標示出處（BY）或以相同方式分享（BY-SA）的創用 CC 授權。",
            ],
            [
              "**IMSLP** marks each file with its copyright status, and public domain differs by country: a work free in Canada may not be free where you live.",
              "**IMSLP** 為每個檔案標示著作權狀態，而公有領域的範圍各國不同：在加拿大已屬公有領域的作品，在你所在的地方不一定是。",
            ],
            [
              "**KernScores** and **OpenScore** state their terms on their sites; read them for the collection you use.",
              "**KernScores** 與 **OpenScore** 在網站上說明使用條款；用哪一個曲集，就讀那一個的條款。",
            ],
            [
              "Your own arrangement of a public-domain tune is yours; a modern arrangement you downloaded is someone else's.",
              "你自己替公有領域旋律寫的編曲屬於你；你下載的現代編曲則屬於別人。",
            ],
          ]}
        />
        <Callout kind="tip" title={["Note the source in your code", "在程式碼裡記下來源"]}>
          <P
            t={[
              "Put a comment at the top of `main.py`: where the file came from, its URL and its licence. When you export the code, the note goes with it.",
              "在 `main.py` 最上方寫一行註解：檔案從哪裡來、網址與授權。匯出程式碼時，這段註記也會跟著一起帶走。",
            ]}
          />
        </Callout>
        <p className="flex flex-wrap gap-4">
          <SiteLink to={["skills", "structure"]} label={["Structuring a score", "組織樂譜"]} />
          <SiteLink to={["concept", "engraving"]} label={["How a score is engraved", "樂譜如何排版"]} />
        </p>
      </Section>
    </Page>
  );
}
