/**
 * Concept ▸ History: how music came to be written down, printed, encoded for computers and finally written as code,
 * from neumes to music21 and Verovio. Every card cites its sources. Text is [English, Traditional Chinese].
 */
import type { Era, TimelineCard } from "@learnkit/web";

export const ERAS: Era[] = [
  {
    id: "writing",
    title: ["Writing music down", "把音樂寫下來"],
    intro: ["From signs that remind a singer of a tune to notes with exact pitch and length.", "從提醒歌者旋律的符號，到有確切音高與時值的音符。"],
    colour: "sky",
    label: ["Part I", "第一部"],
    short: ["Writing", "書寫"],
  },
  {
    id: "printing",
    title: ["Printing and engraving", "印刷與刻版"],
    intro: ["Music becomes something you can buy: printed parts, then engraved plates.", "音樂成為可以買到的東西：印刷的分譜，然後是刻版。"],
    colour: "violet",
    label: ["Part II", "第二部"],
    short: ["Printing", "印刷"],
  },
  {
    id: "computers",
    title: ["Music meets computers", "音樂遇上電腦"],
    intro: ["Computers make sound, read scores and store performances.", "電腦發出聲音、讀取樂譜、記錄演奏。"],
    colour: "teal",
    label: ["Part III", "第三部"],
    short: ["Computers", "電腦"],
  },
  {
    id: "text",
    title: ["Scores as text and open data", "以文字與開放資料存在的樂譜"],
    intro: ["Notation written as plain text, open formats, and free libraries of public-domain scores.", "以純文字寫下的記譜、開放格式，以及公有領域樂譜的免費資料庫。"],
    colour: "rose",
    label: ["Part IV", "第四部"],
    short: ["Score as code", "樂譜即程式"],
  },
  {
    id: "ai",
    title: ["AI and the score", "AI 與樂譜"],
    intro: ["Machines that read, transcribe and suggest music, and why their output still needs checking.", "會閱讀、轉譜、提出音樂建議的機器，以及為什麼它們的輸出仍需要檢查。"],
    colour: "amber",
    label: ["Part V", "第五部"],
    short: ["AI", "AI"],
  },
];

const wiki = (title: string, label = `${title.replace(/_/g, " ")} (Wikipedia)`) => ({ label, url: `https://en.wikipedia.org/wiki/${title}` });

export const HISTORY: TimelineCard[] = [
  // ── Part I: writing music down ──
  {
    id: "neumes",
    era: "writing",
    year: "800s",
    image: {
      src: "history/neumes.webp",
      alt: [
        "First page of the Easter sequence Laudes Salvatori in a 10th-century manuscript, with neumes above the words",
        "十世紀手抄本中復活節繼抒詠《Laudes Salvatori》的第一頁，歌詞上方寫有紐姆",
      ],
      credit: "Notker Balbulus · Public domain · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Notker_neumes.jpg",
    },
    title: ["Neumes: the shape of a melody", "紐姆：旋律的形狀"],
    body: [
      [
        "The earliest Western music notation that survives is **neumes**: small marks written above the words of a chant. They show whether the melody rises or falls, and how notes group, but not exact pitches or lengths.",
        "現存最早的西方記譜法是**紐姆**：寫在聖歌歌詞上方的小記號。它們標示旋律上行或下行、音符如何分組，但不標示確切的音高或長度。",
      ],
      [
        "So a neume was a reminder for a singer who already knew the tune. A score written as code is the opposite: it says everything exactly, so that a computer can play it.",
        "所以紐姆是給已經會唱這首曲子的歌者的提醒。以程式碼寫的樂譜正好相反：它把一切寫得精確，讓電腦能演奏。",
      ],
    ],
    sources: [wiki("Neume")],
  },
  {
    id: "guido",
    era: "writing",
    year: "c. 1025",
    image: {
      src: "history/guido.webp",
      alt: [
        "A Guidonian hand in a medieval manuscript, with pitch names on the fingers",
        "中世紀手抄本中的圭多之手，手指上標著音名",
      ],
      credit: "Anonymous · Public domain · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Mano_guidoniana.jpg",
    },
    title: ["Guido of Arezzo: lines for pitch", "阿雷佐的圭多：表示音高的線"],
    body: [
      [
        "The Italian monk **Guido of Arezzo** described placing neumes on lines a third apart, with a letter (a clef) marking which line is which pitch, in his treatise *Micrologus*. For the first time a singer could read an unfamiliar melody at sight.",
        "義大利修士**阿雷佐的圭多**在論著《*Micrologus*》中描述：把紐姆放在相隔三度的線上，用一個字母（譜號）標出哪條線是哪個音高。歌者第一次能視唱一段陌生的旋律。",
      ],
      [
        "He also taught the syllables *ut re mi fa sol la*, taken from a hymn, to name the steps of a scale: the ancestor of solfège.",
        "他也用取自一首讚美詩的音節 *ut re mi fa sol la* 來稱呼音階的各級：唱名法的前身。",
      ],
    ],
    sources: [wiki("Guido_of_Arezzo"), wiki("Staff_(music)", "Staff (Wikipedia)")],
  },
  {
    id: "franco",
    era: "writing",
    year: "c. 1280",
    image: {
      src: "history/franco.webp",
      alt: [
        "Two facing pages of the Montpellier Codex (c. 1300), written in mensural notation",
        "《蒙佩利爾抄本》（約 1300 年）的兩面對頁，以定量記譜法寫成",
      ],
      credit: "Unknown author · Public domain · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Montpellier,_Biblioth%C3%A8que_Inter-Universitaire,_Section_M%C3%A9decine,_Ms_H196_fol.23v-24r_Montpellier_Codex_copy.jpg",
    },
    title: ["Mensural notation: the shape of a note is its length", "定量記譜法：音符的形狀就是它的長度"],
    body: [
      [
        "Polyphony needs every singer to know exactly how long each note lasts. The treatise *Ars cantus mensurabilis*, attributed to **Franco of Cologne**, made a note's shape determine its duration.",
        "複音音樂需要每位歌者都確切知道每個音持續多久。歸於**科隆的弗朗柯**名下的論著《*Ars cantus mensurabilis*》，讓音符的形狀決定它的時值。",
      ],
      [
        "This is the step that makes a score something a machine could, in principle, play: pitch from the staff, length from the shape.",
        "這一步讓樂譜原則上成為機器可以演奏的東西：音高來自譜線，長度來自形狀。",
      ],
    ],
    sources: [wiki("Mensural_notation"), wiki("Franco_of_Cologne")],
  },
  {
    id: "ars-nova",
    era: "writing",
    year: "c. 1322",
    image: {
      src: "history/ars-nova.webp",
      alt: [
        "The lai “Talant que j’ai d’obeïr” in the Roman de Fauvel manuscript (c. 1318)",
        "《福韋爾傳奇》手抄本中的抒情曲〈Talant que j’ai d’obeïr〉（約 1318 年）",
      ],
      credit: "Gervais du Bus, Chaillou de Pesstain et al. · Public domain · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Lai_%22Talant_que_j%E2%80%99ai_d%E2%80%99obe%C3%AFr%22,_Roman_du_Fauvel.jpg",
    },
    title: ["Ars nova: dividing time in two or three", "新藝術：把時間分成兩份或三份"],
    body: [
      [
        "The *Ars nova* treatise associated with **Philippe de Vitry** allowed note values to divide into two as well as three, and used signs at the start of the music to say which. These mensuration signs are the ancestors of time signatures; the C for common time comes from them.",
        "與**菲利普・德・維特里**相關的論著《*Ars nova*》允許音符時值分成兩份或三份，並在樂曲開頭用記號說明是哪一種。這些定量記號是拍號的前身；表示四四拍的 C 就來自它們。",
      ],
    ],
    sources: [wiki("Ars_nova"), wiki("Philippe_de_Vitry")],
  },

  // ── Part II: printing and engraving ──
  {
    id: "petrucci",
    era: "printing",
    year: "1501",
    image: {
      src: "history/petrucci.webp",
      alt: [
        "Title page of Petrucci's Harmonice Musices Odhecaton (1504 edition)",
        "佩特魯奇《Harmonice Musices Odhecaton》的書名頁（1504 年版）",
      ],
      credit: "Ottaviano Petrucci · Public domain · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Petrucci-odhecaton-front.jpg",
    },
    title: ["Petrucci prints polyphony", "佩特魯奇印刷複音音樂"],
    body: [
      [
        "In Venice, **Ottaviano Petrucci** published the *Harmonice Musices Odhecaton*, the first book of polyphonic music printed from movable type. Each sheet went through the press more than once: staff lines first, then notes, then words.",
        "在威尼斯，**奧塔維亞諾・佩特魯奇**出版了《*Harmonice Musices Odhecaton*》，這是第一本以活字印刷的複音音樂書。每張紙要進印刷機不只一次：先印譜線，再印音符，再印歌詞。",
      ],
      [
        "Printed music could travel: the same notes, in the same layout, in many cities at once.",
        "印刷的樂譜可以流通：同樣的音符、同樣的排版，同時出現在許多城市。",
      ],
    ],
    sources: [wiki("Ottaviano_Petrucci"), wiki("Harmonice_Musices_Odhecaton")],
  },
  {
    id: "attaingnant",
    era: "printing",
    year: "1528",
    image: {
      src: "history/attaingnant.webp",
      alt: [
        "Title page of the superius part of Janequin's Chansons, printed by Pierre Attaingnant in Paris in 1528",
        "Pierre Attaingnant 於 1528 年在巴黎印刷的 Janequin《Chansons》最高聲部分譜書名頁",
      ],
      credit: "Clément Janequin, Pierre Attaingnant · Public domain · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Janequin_-_Chansons_Attaingnant_1528.jpg",
    },
    title: ["One impression: cheaper printed music", "單次壓印：更便宜的印刷樂譜"],
    body: [
      [
        "In Paris, **Pierre Attaingnant** printed music with type that carried a note and its piece of staff together, so a page needed only one pass through the press. Printing music became much cheaper and spread quickly.",
        "在巴黎，**皮耶・阿坦尼昂**使用把音符和一小段譜線鑄在一起的活字印刷樂譜，一頁只需進印刷機一次。印刷樂譜因此便宜許多，迅速普及。",
      ],
    ],
    sources: [wiki("Pierre_Attaingnant"), wiki("Music_engraving")],
  },
  {
    id: "engraving",
    era: "printing",
    year: "c. 1700–1990",
    image: {
      src: "history/engraving.webp",
      alt: [
        "Tools for engraving a slur into a metal music plate, in a film by G. Henle Verlag",
        "在金屬樂譜版上刻出連線的工具，取自 G. Henle 出版社的影片",
      ],
      credit: "Henleverlag · CC BY 3.0 · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Music_Engraving_on_Metal_Plates_(with_sound).webm",
    },
    title: ["Engraved plates and the craft of layout", "刻版與排版的手藝"],
    body: [
      [
        "For most of three centuries the finest music was **engraved**: notes punched and cut into metal plates by hand, by engravers who decided the spacing, the line breaks and where the pages turn.",
        "近三個世紀裡，最精緻的樂譜都是**刻版**的：刻譜師用手把音符打印、雕刻在金屬版上，由他們決定間距、換行，以及在哪裡翻頁。",
      ],
      [
        "Those decisions are what a modern engraving program (such as Verovio, which this site uses) and Polyphonizer's page-turn planner try to make automatically.",
        "這些決定，正是現代排版程式（例如本站使用的 Verovio）與 Polyphonizer 的翻頁規劃器試圖自動完成的事。",
      ],
    ],
    sources: [wiki("Music_engraving")],
  },

  // ── Part III: music meets computers ──
  {
    id: "music-n",
    era: "computers",
    year: "1957",
    image: {
      src: "history/music-n.webp",
      alt: [
        "Max Mathews in 2011",
        "2011 年的 Max Mathews",
      ],
      credit: "vonguard · CC BY-SA 2.0 · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Max_Mathews_CHM_2011.jpg",
    },
    title: ["MUSIC: a computer makes sound", "MUSIC：電腦發出聲音"],
    body: [
      [
        "At Bell Labs, **Max Mathews** wrote *MUSIC*, a program that computed sound from a list of notes. Its descendants (the MUSIC-N family) shaped computer music for decades: a score file says what to play, an instrument definition says how it sounds.",
        "在貝爾實驗室，**麥克斯・馬修斯**寫出 *MUSIC*，一個從音符列表計算出聲音的程式。它的後代（MUSIC-N 家族）影響電腦音樂數十年：樂譜檔說要演奏什麼，樂器定義說聽起來如何。",
      ],
      [
        "Polyphonizer's playback keeps the same split: the score gives the notes, the sound settings choose the instrument.",
        "Polyphonizer 的播放保留同樣的分工：樂譜提供音符，音色設定選擇樂器。",
      ],
    ],
    sources: [wiki("MUSIC-N"), wiki("Max_Mathews")],
  },
  {
    id: "omr",
    era: "computers",
    year: "1966",
    image: {
      src: "history/omr.webp",
      alt: [
        "The first published digital scan of printed music used for optical music recognition, from David Prerau's 1971 work",
        "第一張公開發表、用於光學樂譜辨識的印刷樂譜數位掃描，出自 David Prerau 1971 年的研究",
      ],
      credit: "David S. Prerau · CC BY-SA 4.0 · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:FirstPublishedDigitalScanOfMusic-Prerau1971.png",
    },
    title: ["The first optical music recognition", "第一個光學樂譜辨識"],
    body: [
      [
        "Research on **optical music recognition** (OMR), turning a picture of printed music into notes a computer understands, began in the 1960s; Dennis Pruslin's work at MIT in 1966 is usually named as the first.",
        "**光學樂譜辨識**（OMR）的研究，也就是把印刷樂譜的圖片變成電腦能理解的音符，始於 1960 年代；1966 年 Dennis Pruslin 在 MIT 的研究通常被視為第一個。",
      ],
      [
        "It is still hard: beams, slurs, chords and crowded pages confuse recognisers, which is why recognised music has to be checked.",
        "這件事至今仍然困難：符槓、圓滑線、和弦與擁擠的頁面都會讓辨識程式混淆，所以辨識出的音樂必須再檢查。",
      ],
    ],
    sources: [wiki("Optical_music_recognition")],
  },
  {
    id: "midi",
    era: "computers",
    year: "1983",
    image: {
      src: "history/midi.webp",
      alt: [
        "MIDI Thru, Out and In ports and a 5-pin DIN MIDI cable",
        "MIDI 的 THRU、OUT、IN 連接埠與 5 針 DIN MIDI 線",
      ],
      credit: "Pretzelpaws · CC BY-SA 3.0 · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Midi_ports_and_cable.jpg",
    },
    title: ["MIDI: performances, not scores", "MIDI：記錄演奏，而非樂譜"],
    body: [
      [
        "**MIDI** let keyboards, synthesisers and computers from different makers talk to each other. A MIDI file records which key was pressed, when and how hard, and which General MIDI instrument plays it.",
        "**MIDI** 讓不同廠牌的鍵盤、合成器與電腦能互相溝通。MIDI 檔記錄按下哪個鍵、何時、多用力，以及由哪個 General MIDI 樂器演奏。",
      ],
      [
        "It does not record notation: a MIDI note 61 could be C♯ or D♭, and there are no clefs, beams or page layout. That is why scores travel as MusicXML, and MIDI is for playback.",
        "它不記錄記譜：MIDI 音符 61 可能是 C♯ 也可能是 D♭，而且沒有譜號、符槓或頁面排版。所以樂譜以 MusicXML 交換，MIDI 用來播放。",
      ],
    ],
    sources: [wiki("MIDI"), wiki("General_MIDI")],
  },
  {
    id: "finale",
    era: "computers",
    year: "1988",
    title: ["Notation on the desktop", "桌上型電腦上的記譜"],
    body: [
      [
        "**Finale** and the notation programs after it brought engraving to personal computers: you place notes with the mouse and keyboard, and the program lays out the page.",
        "**Finale** 與後來的記譜軟體把刻譜帶到個人電腦：你用滑鼠和鍵盤放上音符，程式負責頁面排版。",
      ],
      [
        "Finale itself was discontinued in 2024, a reminder that scores locked in one program's file format can outlive the program.",
        "Finale 本身在 2024 年停止開發，提醒我們：鎖在單一程式檔案格式裡的樂譜，可能比那個程式活得更久。",
      ],
    ],
    sources: [wiki("Finale_(scorewriter)", "Finale (Wikipedia)"), wiki("Scorewriter")],
  },
  {
    id: "humdrum-abc",
    era: "computers",
    year: "c. 1990",
    image: {
      src: "history/humdrum-abc.webp",
      alt: [
        "A tune typeset by the program abcm2ps from a text file in ABC notation",
        "由 abcm2ps 程式從 ABC 記譜法文字檔排版出來的曲調",
      ],
      credit: "Catrin · CC BY-SA 2.0 de · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Abc_beispiel.png",
    },
    title: ["Humdrum and ABC: music as plain text", "Humdrum 與 ABC：以純文字表示音樂"],
    body: [
      [
        "Musicologist **David Huron** built **Humdrum**, a toolkit for analysing music written as plain-text columns (its `**kern` format), using ordinary Unix tools. KernScores still offers thousands of works in this format.",
        "音樂學家**大衛・休倫**建立了 **Humdrum**，一套分析以純文字欄位（它的 `**kern` 格式）寫成的音樂的工具，使用一般的 Unix 工具。KernScores 至今仍以此格式提供數千部作品。",
      ],
      [
        "In 1991 **Chris Walshaw** created **ABC notation**, a compact text format for folk tunes that people could type and email. Both can be imported here, and music21's `tinyNotation` is in the same spirit.",
        "1991 年，**Chris Walshaw** 建立了 **ABC 記譜法**，一種可以打字、可以用電子郵件傳送的民謠精簡文字格式。兩者都能在本站匯入，而 music21 的 `tinyNotation` 也是同樣的精神。",
      ],
    ],
    sources: [wiki("Humdrum"), wiki("ABC_notation"), { label: "KernScores", url: "https://kern.humdrum.org/" }],
  },

  // ── Part IV: scores as text and open data ──
  {
    id: "lilypond",
    era: "text",
    year: "1996",
    image: {
      src: "history/lilypond.webp",
      alt: [
        "A LilyPond input file open in the LilyPond app on macOS, with the Typeset command in the menu",
        "在 macOS 的 LilyPond 應用程式中開啟的 LilyPond 輸入檔，選單中有排版（Typeset）指令",
      ],
      credit: "Cdang · CC BY-SA 4.0 · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Capture_ecran_lilypond_macosx.png",
    },
    title: ["LilyPond: engraving from text", "LilyPond：從文字刻譜"],
    body: [
      [
        "**Han-Wen Nienhuys** and **Jan Nieuwenhuizen** started **LilyPond**, which engraves a score from a text file, aiming at the look of hand-engraved plates. It showed that a score written as text could be beautifully printed.",
        "**Han-Wen Nienhuys** 與 **Jan Nieuwenhuizen** 開始開發 **LilyPond**，從文字檔刻出樂譜，目標是手工刻版的外觀。它證明以文字寫成的樂譜也能印得很漂亮。",
      ],
    ],
    sources: [wiki("LilyPond"), { label: "LilyPond", url: "https://lilypond.org/" }],
  },
  {
    id: "mei",
    era: "text",
    year: "1999",
    title: ["MEI: encoding music for scholars", "MEI：為學者編碼音樂"],
    body: [
      [
        "**Perry Roland** proposed the **Music Encoding Initiative** (MEI), an XML format for scholarly editions: variants between sources, editorial changes, and notation from neumes to modern scores. Verovio, which draws the scores on this site, works in MEI internally.",
        "**Perry Roland** 提出**音樂編碼倡議**（MEI），一種用於學術版本的 XML 格式：不同來源之間的異文、編者的修改，以及從紐姆到現代樂譜的記譜。為本站繪製樂譜的 Verovio，內部就是以 MEI 運作。",
      ],
    ],
    sources: [wiki("Music_Encoding_Initiative"), { label: "MEI", url: "https://music-encoding.org/" }],
  },
  {
    id: "musicxml",
    era: "text",
    year: "2004",
    image: {
      src: "history/musicxml.webp",
      alt: [
        "Middle C as a whole note on a treble staff, rendered from MusicXML code",
        "由 MusicXML 程式碼呈現的高音譜表上的中央 C 全音符",
      ],
      credit: "Plays88keys, JoaoPaulo1511 · CC BY-SA 4.0 · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:MusicXML_C_Whole_Note.svg",
    },
    title: ["MusicXML: one format every program reads", "MusicXML：每個程式都能讀的格式"],
    body: [
      [
        "**Michael Good** designed **MusicXML** so that scores could move between notation programs. Version 1.0 appeared in 2004; it is now developed by a W3C community group and read and written by almost every notation program.",
        "**Michael Good** 設計了 **MusicXML**，讓樂譜能在不同記譜軟體之間移動。1.0 版於 2004 年發佈；現在由 W3C 社群小組維護，幾乎所有記譜軟體都能讀寫。",
      ],
      [
        "It is the hand-off in Polyphonizer: music21 writes MusicXML, Verovio engraves it, and Export ▸ MusicXML gives you the file.",
        "它是 Polyphonizer 裡的交接格式：music21 寫出 MusicXML，Verovio 把它排版，「匯出 ▸ MusicXML」把檔案交給你。",
      ],
    ],
    sources: [wiki("MusicXML"), { label: "MusicXML (W3C Music Notation Community Group)", url: "https://www.w3.org/community/music-notation/" }],
  },
  {
    id: "imslp",
    era: "text",
    year: "2006",
    image: {
      src: "history/imslp.webp",
      alt: [
        "The English main page of IMSLP in 2007",
        "2007 年 IMSLP 的英文首頁",
      ],
      credit: "Leonard Vertighel · CC BY-SA 3.0 · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:International_Music_Score_Library_Project_screenshot,_en.png",
    },
    title: ["IMSLP: a free library of public-domain scores", "IMSLP：公有領域樂譜的免費圖書館"],
    body: [
      [
        "**Edward Guo** founded the **International Music Score Library Project** (IMSLP), a wiki of scanned public-domain scores and parts. It is where many players now find their music.",
        "**Edward Guo**創立了**國際樂譜圖書館計畫**（IMSLP），一個收錄公有領域樂譜與分譜掃描檔的維基。許多演奏者現在都在這裡找樂譜。",
      ],
      [
        "Scans are pictures, not data: to transpose, re-lay out or check them, they first have to become MusicXML, by hand or by optical recognition. Copyright also differs by country, so IMSLP marks each file.",
        "掃描檔是圖片，不是資料：要移調、重新排版或檢查，得先變成 MusicXML，靠人工或光學辨識。各國版權規定不同，所以 IMSLP 會標示每個檔案。",
      ],
    ],
    sources: [wiki("International_Music_Score_Library_Project", "IMSLP (Wikipedia)"), { label: "IMSLP", url: "https://imslp.org/" }],
  },
  {
    id: "music21",
    era: "text",
    year: "2008",
    title: ["music21: scores as Python objects", "music21：以 Python 物件表示樂譜"],
    body: [
      [
        "At MIT, **Michael Scott Cuthbert** began **music21**, a Python toolkit for computer-aided musicology: notes, chords, parts and scores as objects you can build, search, transpose and analyse, with a corpus of works included.",
        "在 MIT，**Michael Scott Cuthbert** 開始開發 **music21**，一套電腦輔助音樂學的 Python 工具：音符、和弦、聲部與總譜都是可以建立、搜尋、移調、分析的物件，並附有作品曲庫。",
      ],
      [
        "Every score on this site is music21 code, running in your browser through Pyodide.",
        "本站的每份樂譜都是 music21 程式碼，透過 Pyodide 在你的瀏覽器中執行。",
      ],
    ],
    sources: [{ label: "music21 documentation", url: "https://www.music21.org/music21docs/" }, { label: "music21 on GitHub", url: "https://github.com/cuthbertLab/music21" }],
  },
  {
    id: "smufl",
    era: "text",
    year: "2013",
    title: ["SMuFL: one layout for music fonts", "SMuFL：音樂字型的統一配置"],
    body: [
      [
        "The **Standard Music Font Layout** (SMuFL), led by **Daniel Spreadbury** at Steinberg, gave every music symbol a fixed place in a font, with Bravura as its reference font. Programs could finally share fonts for clefs, notes and dynamics.",
        "由 Steinberg 的 **Daniel Spreadbury** 主導的**標準音樂字型配置**（SMuFL），為每個音樂符號在字型中指定固定位置，並以 Bravura 為參考字型。各程式終於能共用譜號、音符與力度記號的字型。",
      ],
    ],
    sources: [{ label: "SMuFL", url: "https://www.smufl.org/" }],
  },
  {
    id: "verovio",
    era: "text",
    year: "2014",
    image: {
      src: "history/verovio.webp",
      alt: [
        "The Verovio logo",
        "Verovio 的標誌",
      ],
      credit: "RISM digital · Public domain · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Verovio_Logo.png",
    },
    title: ["Verovio: engraving in the browser", "Verovio：在瀏覽器中刻譜"],
    body: [
      [
        "**Laurent Pugin** and colleagues at RISM built **Verovio**, a fast engraving library that turns MEI or MusicXML into SVG, and runs in the browser as WebAssembly. It draws every score on this site, and gives the timing that lights up the notes as they play.",
        "**Laurent Pugin** 與 RISM 的同事打造了 **Verovio**，一個把 MEI 或 MusicXML 轉成 SVG 的快速刻譜函式庫，能以 WebAssembly 在瀏覽器中執行。本站的每份樂譜都由它繪製，播放時點亮音符的時間資訊也來自它。",
      ],
    ],
    sources: [{ label: "Verovio", url: "https://www.verovio.org/" }, { label: "Verovio on GitHub", url: "https://github.com/rism-digital/verovio" }],
  },
  {
    id: "openscore",
    era: "text",
    year: "2017",
    title: ["OpenScore: public-domain music as data", "OpenScore：把公有領域音樂變成資料"],
    body: [
      [
        "**OpenScore** organised volunteers to transcribe public-domain scores into digital editions that anyone may reuse, starting with scans from IMSLP. A digital edition can be transposed, re-laid out and checked, which a scan cannot.",
        "**OpenScore** 組織志工把公有領域樂譜轉成任何人都能再利用的數位版，從 IMSLP 的掃描檔開始。數位版可以移調、重新排版與檢查，掃描檔則不行。",
      ],
      [
        "That is why Polyphonizer's planned IMSLP import looks for a digital edition (OpenScore, Mutopia, KernScores) before reading the scan.",
        "這就是為什麼 Polyphonizer 規劃中的 IMSLP 匯入，會先找數位版（OpenScore、Mutopia、KernScores），找不到才辨識掃描檔。",
      ],
    ],
    sources: [{ label: "OpenScore", url: "https://openscore.cc/" }, { label: "Mutopia Project", url: "https://www.mutopiaproject.org/" }],
  },

  // ── Part V: AI and the score ──
  {
    id: "deep-omr",
    era: "ai",
    year: "2010s–2020s",
    title: ["Learning to read and transcribe music", "學會閱讀與轉譜"],
    body: [
      [
        "Neural networks made optical music recognition and audio transcription much better: recognisers learn from many pages of engraved music, transcribers from recordings paired with their scores.",
        "神經網路讓光學樂譜辨識與音訊轉譜大幅進步：辨識程式從大量刻譜頁面中學習，轉譜程式從錄音與其對應的樂譜中學習。",
      ],
      [
        "They still make mistakes a musician would not, such as a wrong octave, a missing tie or a bar that does not add up. Rules that check the result, like the ones in Learn to Code, catch many of them.",
        "它們仍會犯音樂家不會犯的錯，例如八度錯誤、漏掉連結線、時值加不滿的小節。像「學寫程式」裡那樣檢查結果的規則，能抓出其中許多錯誤。",
      ],
    ],
    sources: [wiki("Optical_music_recognition"), wiki("Transcription_(music)", "Transcription (music) (Wikipedia)")],
  },
  {
    id: "compose-with",
    era: "ai",
    year: "2020s",
    image: {
      src: "history/compose-with.webp",
      alt: [
        "A two-part tune written by GPT-4 in ABC notation and its score, from a 2023 study of GPT-4",
        "GPT-4 以 ABC 記譜法寫的二聲部曲調及其樂譜，出自 2023 年一項關於 GPT-4 的研究",
      ],
      credit: "Sébastien Bubeck et al. (cropped) · CC BY 4.0 · Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Generating_and_modifying_a_tune_in_ABC_notation_with_GPT-4.png",
    },
    title: ["Composing with a machine, and checking it", "與機器一起作曲，並檢查它"],
    body: [
      [
        "Language models can now write music21 code, and music models can suggest harmonies and melodies. Written as code, their suggestions can be engraved, heard and checked against rules before you keep them.",
        "語言模型現在能寫 music21 程式碼，音樂模型能建議和聲與旋律。以程式碼寫下的建議，可以在你採用之前先排版、聆聽，並依規則檢查。",
      ],
      [
        "That is the idea behind Polyphonizer's AI agent and composer mode on the roadmap: compose *with* you, not instead of you.",
        "這就是 Polyphonizer 路線圖上 AI 代理與作曲模式背後的想法：*和你一起*作曲，而不是取代你。",
      ],
    ],
    sources: [{ label: "music21 documentation", url: "https://www.music21.org/music21docs/" }, { label: "Magenta (Google)", url: "https://magenta.tensorflow.org/" }],
  },
];
