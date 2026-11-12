/** Concept ▸ Limits of notation (#/concept/limits[/<section>]). */
import { useLang } from "@learnkit/web";
import { Callout, Figure, List, Notation, P, Page, Py, Section, SiteLink, Sources, Table, TryIn, type L, type SectionInfo } from "../kit.tsx";

const PAGE = "limits";

const SECTIONS: SectionInfo[] = [
  { id: "performance", title: ["The score is not the performance", "樂譜不等於演奏"] },
  { id: "rules", title: ["Rules are not taste", "規則不等於品味"] },
  { id: "editions", title: ["Editions, sources and copyright", "版本、來源與版權"] },
  { id: "machines", title: ["What machines get wrong", "機器會出錯的地方"] },
];

/** Four written eighth notes, equal; the same four swung, long–short. */
function SwingFigure() {
  const { pick } = useLang();
  const row = (y: number, widths: number[], cls: string) => {
    let x = 150;
    return widths.map((w, i) => {
      const r = <rect key={i} x={x + 2} y={y} width={w - 4} height={26} rx={4} className={cls} strokeWidth={1.2} />;
      x += w;
      return r;
    });
  };
  return (
    <svg viewBox="0 0 560 150" className="w-full max-w-[560px]" role="img" aria-label={pick(["Written and swung eighth notes", "記譜與搖擺的八分音符"])}>
      <text x={140} y={42} textAnchor="end" className="fill-gray-900 text-[12px] font-semibold">
        {pick(["written", "譜上寫的"])}
      </text>
      <text x={140} y={102} textAnchor="end" className="fill-rose-700 text-[12px] font-semibold">
        {pick(["played (swing)", "實際演奏（搖擺）"])}
      </text>
      {row(24, [90, 90, 90, 90], "fill-white stroke-gray-400")}
      {row(84, [120, 60, 120, 60], "fill-rose-50 stroke-rose-500")}
      {[150, 330, 510].map((x) => (
        <line key={x} x1={x} x2={x} y1={16} y2={118} className="stroke-gray-300" strokeWidth={1} strokeDasharray="3 3" />
      ))}
      <text x={330} y={140} textAnchor="middle" className="fill-gray-500 text-[10.5px]">
        {pick(["beats stay in place; what happens inside them is not written", "拍點不變；拍子裡面怎麼分，譜上沒寫"])}
      </text>
    </svg>
  );
}

const SNIPPET_PLANING = `planing = stream.Part()
for root in ["C3", "D3", "E3", "D3", "F3", "E3", "D3", "C3"]:
    low = pitch.Pitch(root)
    planing.append(chord.Chord([low, low.transpose("P5"), low.transpose("P8")]))
score = planing.makeMeasures()`;

const SNIPPET_SPELLING = `sharp = note.Note("C#4")
flat = note.Note("D-4")
guess = note.Note(61)  # only a MIDI number: music21 picks a spelling
score = stream.Stream([sharp, flat, guess])`;

const MACHINE_ROWS: (readonly [L, L, L])[] = [
  [
    ["Engraving", "排版"],
    [
      "Collisions in dense music: slurs through accidentals, dynamics on top of lyrics, crowded cross-staff passages.",
      "密集處的碰撞：圓滑線穿過臨時記號、力度記號疊在歌詞上、擠在一起的跨譜表段落。",
    ],
    ["Look at every page before printing; fix by hand or change the layout.", "列印前每一頁都看過；手動修正或改變版面。"],
  ],
  [
    ["Optical recognition (OMR)", "光學辨識（OMR）"],
    [
      "Misread accidentals and dots, ties taken for slurs, missing triplets, voices merged, bars that don't add up.",
      "看錯臨時記號與附點、把延音線當成圓滑線、漏掉三連音、聲部混在一起、拍數加不起來的小節。",
    ],
    ["Proofread against the scan, bar by bar; count the beats.", "對照掃描檔逐小節校對；數一數拍數。"],
  ],
  [
    ["MIDI", "MIDI"],
    [
      "Keys, not notes: no spelling, no distinction between a half note and two tied quarters, no voices, no slurs.",
      "記錄的是琴鍵，不是音符：沒有拼法、分不出二分音符和兩個用延音線連起來的四分音符、沒有聲部、沒有圓滑線。",
    ],
    ["Prefer MusicXML or MEI when a source offers it.", "來源有 MusicXML 或 MEI 時優先使用。"],
  ],
];

export default function LimitsConcept({ section }: { section: string | null }) {
  let n = 0;
  return (
    <Page
      id={PAGE}
      title={["Limits of notation", "記譜的限度"]}
      intro={[
        "A score is a set of instructions, and a program that writes one is a set of instructions for writing instructions. Both leave a great deal unsaid. This page is about what Polyphonizer cannot tell you: how the music should sound, whether it is any good, whose edition you are reading and who owns it, and where the machines in the pipeline make mistakes.",
        "樂譜是一組指示，而寫樂譜的程式，則是「寫指示的指示」。兩者都有很多話沒說。這一頁談 Polyphonizer 無法告訴你的事：音樂該怎麼聽起來、它好不好、你讀的是誰的版本、版權屬於誰，以及流程中的機器會在哪裡出錯。",
      ]}
      sections={SECTIONS}
      focus={section}
    >
      <Section page={PAGE} id="performance" n={++n} title={SECTIONS[0].title}>
        <P
          t={[
            "Notation records pitch and rhythm well and almost everything else roughly. A player turns it into music by adding what the page leaves open:",
            "記譜把音高和節奏記得很好，其他幾乎都只是約略。演奏者把譜上沒說死的部分補上，才把它變成音樂：",
          ]}
        />
        <List
          items={[
            [
              "**Time.** *Rubato* stretches and gives back time within a phrase; the last bar of a piece is rarely played at the written tempo.",
              "**時間。** *彈性速度*（rubato）在樂句裡拉長又還回時間；一首曲子的最後一小節很少照譜上的速度演奏。",
            ],
            [
              "**Intonation.** Strings, winds and singers bend pitch by ear: a leading note pulled up towards its tonic, a third tuned to the chord. A piano and the playback here use equal temperament, where every semitone is the same size.",
              "**音準。** 弦樂、管樂和歌手靠耳朵微調音高：導音往主音靠、三度音依和弦調整。鋼琴與本站的播放則使用平均律，每個半音大小都一樣。",
            ],
            [
              "**Breath, bow and touch.** Where to breathe, which notes share a bow, how a note begins and dies away: partly marked, mostly the player's choice.",
              "**呼吸、弓法與觸鍵。** 在哪裡換氣、哪些音同一弓、一個音怎麼開始又怎麼消失：部分有標記，大多由演奏者決定。",
            ],
            [
              "**Style.** Some conventions were never written at all. In French Baroque music, pairs of equal eighth notes were often played unequal (*notes inégales*); in jazz, written eighths are swung, long–short.",
              "**風格。** 有些慣例從來沒寫下來。法國巴洛克音樂裡，成對的等長八分音符常演奏成不等長（*notes inégales*）；爵士樂裡，寫成八分音符的地方要搖擺，一長一短。",
            ],
          ]}
        />
        <Figure
          caption={[
            "The same four eighth notes as written and as swung. The ratio is not fixed: it changes with tempo, style and player.",
            "同樣四個八分音符，譜上寫的與搖擺演奏的樣子。長短比例並不固定：會隨速度、風格與演奏者而變。",
          ]}
        >
          <SwingFigure />
        </Figure>
        <Notation
          abc={`X:1
M:4/4
L:1/8
K:C
cdef gage | (3c-cd (3e-ef (3g-ga (3g-ge |]`}
          caption={[
            "Bar 1 as written: straight eighths. Bar 2: one common way to spell out how they are swung, as triplets, long–short 2 : 1. Players never read bar 2; they play bar 1 that way.",
            "第 1 小節是譜上寫的：平均的八分音符。第 2 小節：把搖擺奏法寫出來的一種常見方式，用三連音，長短比 2 : 1。演奏者不會讀第 2 小節那種譜；他們看著第 1 小節就那樣演奏。",
          ]}
        />
        <P
          t={[
            "Polyphonizer's playback is deliberately literal: every note at the same loudness (apart from each part's volume), in strict tempo, in equal temperament. It is there to check pitches and rhythms, like proofreading by ear, not to stand in for a performance.",
            "Polyphonizer 的播放刻意照字面演奏：每個音一樣大聲（各聲部音量除外）、速度嚴格固定、採平均律。它的用途是檢查音高和節奏，像是用耳朵校對，而不是取代演奏。",
          ]}
        />
        <Sources
          items={[
            { label: "Wikipedia: Tempo rubato", url: "https://en.wikipedia.org/wiki/Tempo_rubato" },
            { label: "Wikipedia: Equal temperament", url: "https://en.wikipedia.org/wiki/Equal_temperament" },
            { label: "Wikipedia: Notes inégales", url: "https://en.wikipedia.org/wiki/Notes_in%C3%A9gales" },
            { label: "Wikipedia: Swung note", url: "https://en.wikipedia.org/wiki/Swung_note" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="rules" n={++n} title={SECTIONS[1].title}>
        <P
          t={[
            "The rules in Learn to Code come from **species counterpoint**, the teaching method Johann Joseph Fux set out in *Gradus ad Parnassum* (1725). They describe one style, a tidied-up picture of sixteenth-century vocal polyphony, and they are a training method, like scales for a pianist. A green tick means the exercise follows that method. It does not mean the line is beautiful: a melody can pass every rule and still be dull.",
            "「學寫程式」的規則來自 **種類對位**（species counterpoint），也就是 Johann Joseph Fux 在 *Gradus ad Parnassum*（《通往帕納塞斯山之階》，1725）裡提出的教學方法。它們描述的是一種風格（經過整理的十六世紀聲樂複音音樂），也是一種訓練方法，就像鋼琴家練音階。綠色勾勾表示這個練習遵守了那套方法，並不表示旋律很美：一條旋律可以通過所有規則，卻仍然平淡無奇。",
          ]}
        />
        <P
          t={[
            "Outside that style the same rules can be wrong. Parallel fifths are forbidden in species counterpoint because they make two voices sound like one. Later composers used exactly that effect on purpose: Debussy moved whole chords in parallel, fifths and all, and the rock guitarist's power chord is a parallel fifth by design. Here is a chain of open fifths and octaves moving together. Musically it is a texture; to the `noParallels` rule, every step is an error.",
            "離開那個風格，同樣的規則可能就不對了。種類對位禁止平行五度，因為它讓兩個聲部聽起來像一個。後來的作曲家正是刻意要這種效果：德布西讓整個和弦平行移動，五度也不例外；搖滾吉他手的強力和弦（power chord）本來就是平行五度。下面是一串一起移動的空五度加八度。在音樂上它是一種織度；對 `noParallels` 規則來說，每一步都是錯誤。",
          ]}
        />
        <Py
          code={SNIPPET_PLANING}
          title="score.py"
          note={["Each chord is a root, the fifth above and the octave: C–G–C, D–A–D, …", "每個和弦都是根音、上方五度與八度：C–G–C、D–A–D…"]}
        />
        <Callout kind="tip" title={["Use the checker like a spell-checker", "把檢查器當成拼字檢查"]}>
          <P
            t={[
              "That is why some rules here are only *advice*. A rule tells you where to look and what a teacher would ask about. Whether to keep the note is your decision, and knowing the rule is what makes breaking it a choice rather than an accident.",
              "這就是為什麼這裡有些規則只是 *建議*。規則告訴你該看哪裡、老師會問什麼。要不要保留那個音，由你決定；正因為懂規則，打破它才是一種選擇，而不是意外。",
            ]}
          />
          <SiteLink to={["concept", "theory"]} label={["The theory behind the rules", "規則背後的理論"]} />
        </Callout>
        <TryIn ids={["species-1-above", "species-1-below"]} />
        <Sources
          items={[
            { label: "Wikipedia: Gradus ad Parnassum", url: "https://en.wikipedia.org/wiki/Gradus_ad_Parnassum" },
            { label: "Wikipedia: Consecutive fifths", url: "https://en.wikipedia.org/wiki/Consecutive_fifths" },
            { label: "Wikipedia: Power chord", url: "https://en.wikipedia.org/wiki/Power_chord" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="editions" n={++n} title={SECTIONS[2].title}>
        <P
          t={[
            "Behind every printed score are **sources**: the composer's manuscript, copies made by others, the first printed edition, later corrections. They often disagree, and someone has to decide what the composer meant. That someone is the editor, and an edition is the result.",
            "每份印刷樂譜背後都有 **來源**：作曲家的手稿、別人抄的副本、初版印刷、後來的更正。它們常常互相矛盾，總得有人判斷作曲家的本意。這個人就是編者，而版本就是判斷的結果。",
          ]}
        />
        <List
          items={[
            [
              "An **urtext** edition tries to give the text as the composer left it, and says where the sources differ and what the editor chose.",
              "**原典版**（urtext）盡量呈現作曲家留下的樣子，並說明各來源哪裡不同、編者選了什麼。",
            ],
            [
              "A **performing** edition adds an editor's fingerings, bowings, dynamics and phrasing, often without marking which are original. Many older editions are of this kind.",
              "**演奏版** 加上編者的指法、弓法、力度與分句，而且常常沒標出哪些是原有的。許多早期版本屬於這一類。",
            ],
            [
              "Old sources use conventions that need reading, not just copying: C clefs, figured bass, and in older music accidentals that may apply only to the note they stand before. Typing an old print into code is already an act of editing.",
              "舊來源使用的慣例需要解讀，不能只是照抄：C 譜號、數字低音，以及在較早的音樂裡可能只作用於緊接其後那個音的臨時記號。把一份舊印刷譜打成程式碼，本身就已經是編訂。",
            ],
          ]}
        />
        <P
          t={[
            "**Copyright.** A composition is protected for a period after its composer's death: in the UK and the European Union, 70 years; in Taiwan, 50. After that the music is in the **public domain**. But the term differs by country, so a piece can be free in one and protected in another; IMSLP, the large library of free scores, labels its files by country for this reason.",
            "**版權。** 一首作品在作曲家過世後仍受保護一段期間：英國與歐盟是 70 年；臺灣是 50 年。之後這首音樂就進入 **公有領域**。但期限因國家而異，同一首曲子可能在某國已經自由使用、在另一國仍受保護；大型免費樂譜庫 IMSLP 正因如此，按國家標示每個檔案的狀態。",
          ]}
        />
        <P
          t={[
            "**The edition is separate from the music.** An editor's own additions can be protected as new work. In the UK, the *typographical arrangement* of a published edition, the look of the printed page itself, has its own right, which lasts 25 years from the end of the year the edition was first published (Copyright, Designs and Patents Act 1988, section 15). So a recent print of a Bach suite may not be free to photocopy even though Bach is.",
            "**版本與音樂是兩回事。** 編者自己加上的內容可能作為新的創作受到保護。在英國，已出版版本的 *版面編排*（印刷頁面本身的樣子）另有一項權利，期限是從該版本首次出版那一年年底起算 25 年（《1988 年著作權、設計及專利法》第 15 條）。所以巴哈雖然早已不受版權保護，一份新近印刷的巴哈組曲卻未必可以隨意影印。",
          ]}
        />
        <Callout kind="warn" title={["Not legal advice", "不構成法律意見"]}>
          <P
            t={[
              "This section is a rough orientation, not legal advice. Rules differ between countries and change over time. Before you publish, sell or share an arrangement, check the law where you live and the terms of the edition you used.",
              "這一節只是粗略的說明，不構成法律意見。各國規定不同，而且會隨時間改變。在出版、販售或分享編曲之前，請查證你所在地的法律，以及你所用版本的使用條件。",
            ]}
          />
        </Callout>
        <P
          t={[
            "What this means in practice here: write your own music, or work from public-domain sources you have checked. Your code runs in your browser and a file you import stays on your computer, but what you do with the result is up to you.",
            "在本站的實際意義是：寫你自己的音樂，或使用你確認過屬於公有領域的來源。你的程式碼在你的瀏覽器裡執行，匯入的檔案也留在你的電腦上，但怎麼使用成果由你自己負責。",
          ]}
        />
        <SiteLink to={["concept", "history"]} label={["A history of notation", "記譜史"]} />
        <Sources
          items={[
            { label: "Wikipedia: Urtext edition", url: "https://en.wikipedia.org/wiki/Urtext_edition" },
            { label: "UK CDPA 1988, s.12 (duration: literary, musical works …)", url: "https://www.legislation.gov.uk/ukpga/1988/48/section/12" },
            { label: "UK CDPA 1988, s.15 (typographical arrangement of published editions)", url: "https://www.legislation.gov.uk/ukpga/1988/48/section/15" },
            { label: "IMSLP (Petrucci Music Library)", url: "https://imslp.org/" },
            { label: "Wikipedia: Public domain", url: "https://en.wikipedia.org/wiki/Public_domain" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="machines" n={++n} title={SECTIONS[3].title}>
        <P
          t={[
            "Every machine in the chain is good at its job and wrong some of the time. Knowing *how* each one goes wrong tells you where to look.",
            "流程中的每台機器都擅長自己的工作，但總有出錯的時候。知道每一台 *怎麼* 出錯，就知道該往哪裡看。",
          ]}
        />
        <Table
          head={[
            ["Machine", "機器"],
            ["Typical mistakes", "常見錯誤"],
            ["What to do", "怎麼辦"],
          ]}
          rows={MACHINE_ROWS}
        />
        <P
          t={[
            "**Spelling** is the subtlest loss. MIDI stores the key on the keyboard, not the note on the staff: key 61 is C♯4 or D♭4, and nothing in the note says which. (A MIDI file may carry a key signature, but each note still has no name.) The difference matters to a reader: C♯ belongs to A major, D♭ to A♭ major, and a singer or string player may even tune them differently. music21 keeps the spelling when you write a name, and has to guess when you give only a number:",
            "**拼法** 是最不容易察覺的損失。MIDI 記的是鍵盤上的哪個鍵，而不是譜上的哪個音：鍵號 61 可能是 C♯4，也可能是 D♭4，音符本身沒說是哪一個。（MIDI 檔可以帶調號，但每個音仍然沒有名字。）對讀譜的人來說這差別很重要：C♯ 屬於 A 大調，D♭ 屬於降 A 大調，歌手或弦樂手甚至可能把它們調得不一樣高。寫出音名時，music21 會保留拼法；只給數字時，它只能猜：",
          ]}
        />
        <Py
          code={SNIPPET_SPELLING}
          title="score.py"
          note={[
            "Three notes, one key (61). The third one is engraved as C♯4: music21's guess, not a fact about the music.",
            "三個音，同一個鍵（61）。第三個被排成 C♯4：那是 music21 的猜測，不是音樂本身的事實。",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
A, B, "^C♯ = 61"^C D | "^D♭ = 61"_D C _B, _A, |]`}
          caption={[
            "Key 61 twice: as C♯ going up the A major scale (1–2–3–4), then as D♭ coming down the A♭ major scale (4–3–2–1). Same sound, different notes.",
            "鍵號 61 出現兩次：先是 A 大調音階上行（1–2–3–4）裡的 C♯，再是降 A 大調音階下行（4–3–2–1）裡的 D♭。同樣的聲音，不同的音。",
          ]}
        />
        <P
          t={[
            "Polyphonizer's rule checker reads those key numbers too, so it cannot catch a misspelled note. The engraving, which shows the spelling, is where your eyes have to do the work.",
            "Polyphonizer 的規則檢查器讀的也是這些鍵號，所以抓不到拼錯的音。會顯示拼法的是排版結果，那裡就得靠你的眼睛。",
          ]}
        />
        <Callout kind="note" title={["Even good files differ", "就算是好的檔案也不一樣"]}>
          <P
            t={[
              "MusicXML keeps spelling, voices and ties, but two programs may still read the same file differently: a beam regrouped, a layout hint ignored, a part name lost. After importing, play it through and look at every page.",
              "MusicXML 保留了拼法、聲部與延音線，但兩個程式讀同一個檔案的結果仍可能不同：符槓重新分組、版面提示被忽略、聲部名稱不見。匯入之後，從頭播放一遍，每一頁都看過。",
            ]}
          />
          <SiteLink to={["skills", "verify"]} label={["Checking your own score", "檢查你自己的樂譜"]} />
        </Callout>
        <P
          t={[
            "Where the tools are going next, and which of these gaps they may close, is on the roadmap.",
            "這些工具接下來的方向，以及可能補上哪些缺口，請見路線圖。",
          ]}
        />
        <SiteLink to={["agents", "roadmap"]} label={["Roadmap", "路線圖"]} />
        <Sources
          items={[
            { label: "Wikipedia: Optical music recognition", url: "https://en.wikipedia.org/wiki/Optical_music_recognition" },
            { label: "Wikipedia: MIDI", url: "https://en.wikipedia.org/wiki/MIDI" },
            { label: "Wikipedia: Enharmonic equivalence", url: "https://en.wikipedia.org/wiki/Enharmonic_equivalence" },
            { label: "Verovio", url: "https://www.verovio.org/" },
          ]}
        />
      </Section>
    </Page>
  );
}
