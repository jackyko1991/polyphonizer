/** Coding Skills ▸ Checking a score (#/skills/verify[/<section>]). Every example runs as score code (the failing ones on purpose). */
import { useLang } from "@learnkit/web";
import { Callout, Notation, List, P, Page, Py, Section, SiteLink, Sources, Table, TryIn, type L, type SectionInfo } from "../kit";

const PAGE = "verify";

const SECTIONS: SectionInfo[] = [
  { id: "rules", title: ["Rules as tests", "規則就是測試"] },
  { id: "assert", title: ["Your own rules with `assert`", "用 `assert` 寫你自己的規則"] },
  { id: "voices", title: ["Voice leading: intervals and parallels", "聲部進行：音程與平行"] },
  { id: "module", title: ["Keep the checks in a file", "把檢查放在一個檔案裡"] },
  { id: "parts", title: ["Checking parts before printing", "印刷前檢查分譜"] },
  { id: "checklist", title: ["Before you print", "印出之前"] },
];

/** What the editor shows after Compile when a check fails. */
function Says({ where, text }: { where: L; text: string }) {
  const { pick } = useLang();
  return (
    <div className="rounded-lg border border-red-200 bg-white px-3 py-2">
      <p className="text-xs font-medium text-red-700">
        {pick(["Error", "錯誤"])} · {pick(where)}
      </p>
      <pre className="mt-1 font-mono text-xs whitespace-pre-wrap text-gray-800">{text}</pre>
    </div>
  );
}

const CHECKS_V1 = `def full_bars(part):
    """every bar holds exactly what its time signature says (a pickup bar 0 may be short)"""
    for m in part.getElementsByClass(stream.Measure):
        have, need = m.duration.quarterLength, m.barDuration.quarterLength
        assert m.number == 0 or have == need, f"{part.partName}, bar {m.number}: {have} of {need} beats"


def in_range(part, low, high):
    """no note below \`low\` or above \`high\`, e.g. in_range(flute, "C4", "C7")"""
    for n in part.recurse().notes:
        for p in n.pitches:
            assert pitch.Pitch(low) <= p <= pitch.Pitch(high), f"{part.partName}, bar {n.measureNumber}: {p.nameWithOctave}"`;

const FULL_BARS_V2 = `def full_bars(part):
    """every bar is full; a pickup (bar 0) and the last bar may share one bar between them"""
    bars = list(part.getElementsByClass(stream.Measure))
    pickup = bars[0].duration.quarterLength if bars[0].number == 0 else 0
    for m in bars:
        have, need = m.duration.quarterLength, m.barDuration.quarterLength
        if m.number == 0:
            continue
        if m is bars[-1]:
            need -= pickup
        assert have == need, f"{part.partName}, bar {m.number}: {have} of {need} beats"`;

const MUSIC21_VL = {
  label: "music21 documentation: voiceLeading (VoiceLeadingQuartet)",
  url: "https://www.music21.org/music21docs/moduleReference/moduleVoiceLeading.html",
};
const MUSIC21_IV = {
  label: "music21 documentation: interval",
  url: "https://www.music21.org/music21docs/moduleReference/moduleInterval.html",
};

export default function VerifySkill({ section }: { section: string | null }) {
  return (
    <Page
      id={PAGE}
      title={["Checking a score", "檢查樂譜"]}
      intro={[
        "A score that runs can still be wrong: a note out of the instrument's range, a bar one beat short, parallel fifths, a page turn in the middle of a run. Your ears and eyes catch some of these. Rules written as code catch them every time you compile. This page shows how Learn to Code's problems state their rules, how to write your own, and what to check in each part before you print it.",
        "能執行的樂譜仍可能有錯：超出樂器音域的音、少一拍的小節、平行五度，或是剛好在快速音群中間的翻頁。耳朵和眼睛能抓到其中一些；寫成程式碼的規則則在每次編譯時都會抓。這一頁說明「學寫程式」頁的題目怎麼陳述規則、怎麼寫你自己的規則，以及印出每份分譜前要檢查什麼。",
      ]}
      sections={SECTIONS}
      focus={section}
    >
      <Section page={PAGE} id="rules" n={1} title={SECTIONS[0].title}>
        <P
          t={[
            "Every problem in Learn to Code comes with its rules **before** you write a note. The rules are the test: your score passes when every red rule turns green. This is how programmers write tests first: decide what *correct* means, then write the code until it is. Grey rules are advice: good style that the music may break for a reason.",
            "「學寫程式」頁的每道題目，在你寫下任何一個音**之前**就附上了規則。規則就是測試：所有紅色規則都轉綠時，你的樂譜就通過了。這正是程式設計師「先寫測試」的做法：先決定什麼叫*正確*，再寫程式碼直到它正確。灰色規則是建議：好的風格，但音樂可以有理由打破它。",
          ]}
        />
        <Table
          head={[
            ["Rule", "規則"],
            ["What it checks", "檢查什麼"],
          ]}
          rows={[
            [["The given melody, unchanged", "給定的旋律沒有改動"], ["the cantus or given part has exactly its original pitches", "定旋律或給定聲部的音高與原本完全相同"]],
            [["Range", "音域"], ["every note of a part lies between a lowest and a highest note", "聲部的每個音都在最低音與最高音之間"]],
            [["Notes of the key or mode", "調或調式內的音"], ["only the scale's pitch classes (with the raised leading note allowed at the cadence)", "只用音階內的音級（終止處允許升高的導音）"]],
            [["One note against each note", "一音對一音"], ["the two parts have the same rhythm", "兩個聲部節奏相同"]],
            [["Consonant", "協和"], ["each pair of notes sounding together is a unison, third, fifth, sixth or octave", "每對同時發聲的音都是同度、三度、五度、六度或八度"]],
            [["No parallel fifths or octaves", "沒有平行五度或八度"], ["two perfect intervals of the same size in a row, with the voices moving", "聲部移動時，連續兩個同樣大小的完全音程"]],
            [["Reaches the end by step", "以級進到達結尾"], ["the last move of the counterpoint is a step", "對位旋律最後一步是級進"]],
            [["Good leaps", "好的跳進"], ["no tritone, seventh, or leap beyond an octave", "沒有三全音、七度或超過八度的跳進"]],
            [["Mostly imperfect (advice)", "以不完全協和為主（建議）"], ["thirds and sixths outnumber fifths and octaves", "三度與六度多於五度與八度"]],
          ]}
        />
        <P
          t={[
            "A failed rule names the bars where it failed, so you know where to look. Learn to Code's checker reads the notes your code produced, not the code itself: any way of writing the music is fine, as long as the result keeps the rules.",
            "沒通過的規則會標出出錯的小節，讓你知道去哪裡看。「學寫程式」頁的檢查器讀的是你的程式碼產生的音符，而不是程式碼本身：用什麼方式寫音樂都可以，只要結果遵守規則。",
          ]}
        />
        <TryIn ids={["species-1-above", "species-1-below", "twinkle-duet"]} />
      </Section>

      <Section page={PAGE} id="assert" n={2} title={SECTIONS[1].title}>
        <P
          t={[
            "In the editor there are no preset rules, but Python has one word for a rule: `assert`. `assert condition, message` does nothing when the condition is true; when it is false, the run stops with your message. Put the checks after the music and before `score =`, and every Run tests the score.",
            "編輯器裡沒有預設的規則，但 Python 有一個字專門用來寫規則：`assert`。`assert 條件, 訊息` 在條件成立時什麼都不做；不成立時，執行就停下來並顯示你的訊息。把檢查放在音樂之後、`score =` 之前，每次執行都會測試這份樂譜。",
          ]}
        />
        <P t={["**Range.** Every note between the instrument's lowest and highest note:", "**音域。** 每個音都在樂器的最低音與最高音之間："]} />
        <Py
          code={`RANGES = {"Flute": ("C4", "C7"), "Cello": ("C2", "A5")}

flute = tiny("g4 a b c' d'2 g2", name="Flute", inst="flute")
cello = tiny("G2 D GG2 G2", name="Cello", inst="cello", clef_="bass")

for part in [flute, cello]:
    low, high = RANGES[part.partName]
    for n in part.recurse().notes:
        where = f"{part.partName}, bar {n.measureNumber}: {n.nameWithOctave}"
        assert pitch.Pitch(low) <= n.pitch <= pitch.Pitch(high), where

score = together(flute, cello)`}
          note={["passes; write `GGG2` (G1) in the cello and it stops:", "通過；把大提琴寫成 `GGG2`（G1）就會停下來："]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
G A B c | d2 G2 |]`}
          caption={["Flute: inside C4–C7", "長笛：在 C4–C7 之內"]}
          instrument={73}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C clef=bass
G,2 D,2 | G,,2 G,2 |]`}
          caption={["Cello: inside C2–A5", "大提琴：在 C2–A5 之內"]}
          instrument={42}
        />
        <Says where={["line 10", "第 10 行"]} text="AssertionError: Cello, bar 2: G1" />
        <P
          t={[
            "Pitches compare by how high they sound, so `<=` works on them directly. The message says which part, which bar and which note: write messages that tell you where to look.",
            "音高依照聽起來的高低比較，所以可以直接用 `<=`。訊息寫出哪個聲部、哪一小節、哪個音：訊息要寫成能告訴你去哪裡找。",
          ]}
        />
        <P
          t={[
            "**Full bars.** Each bar should hold exactly what its time signature asks for. music21 gives both numbers: `m.duration.quarterLength` (what the bar holds) and `m.barDuration.quarterLength` (what it should hold):",
            "**小節要滿。** 每個小節應該剛好裝下拍號要求的時值。music21 兩個數字都提供：`m.duration.quarterLength`（小節裡實際有多少）與 `m.barDuration.quarterLength`（應該有多少）：",
          ]}
        />
        <Py
          code={`melody = tiny("c4 d e f g a b c' d' e'2", name="Violin")

for m in melody.getElementsByClass(stream.Measure):
    have, need = m.duration.quarterLength, m.barDuration.quarterLength
    assert have == need, f"bar {m.number} has {have} beats, not {need}"

score = melody`}
          note={["fails on purpose: the last bar is a beat short", "故意失敗：最後一小節少了一拍"]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
C D E F | G A B c | d e2 z |]`}
          caption={["As drawn when the check is left out: the missing beat becomes a rest", "沒有檢查時畫出來的樣子：少掉的那一拍變成休止符"]}
          instrument={40}
        />
        <Says where={["line 5", "第 5 行"]} text="AssertionError: bar 3 has 3.0 beats, not 4.0" />
        <Callout kind="note" title={["Why this check matters", "為什麼這個檢查很重要"]}>
          <P
            t={[
              "A short last bar does not cause an error: when the score is drawn, the bar is quietly filled with a rest. Without the check you may never notice the missing beat.",
              "最後一小節太短並不會造成錯誤：畫譜時，這一小節會被悄悄補上休止符。沒有這個檢查，你可能永遠不會發現少了一拍。",
            ]}
          />
        </Callout>
      </Section>

      <Section page={PAGE} id="voices" n={3} title={SECTIONS[2].title}>
        <P
          t={[
            "music21 knows intervals, so rules of counterpoint become a few lines. `interval.Interval(lower, upper)` measures from one note to another; its `simpleName` drops the octaves (a tenth is an `M3`, an octave a `P1`):",
            "music21 懂音程，所以對位規則只要幾行就能寫出來。`interval.Interval(lower, upper)` 量出兩個音之間的音程；它的 `simpleName` 會去掉八度（十度是 `M3`，八度是 `P1`）：",
          ]}
        />
        <Py
          code={`upper = tiny("a1 a g a b c'# d'", name="Counterpoint")
lower = tiny("d1 f e d g a d", name="Cantus")

CONSONANT = {"P1", "m3", "M3", "P5", "m6", "M6"}  # octaves count as P1
for a, b in zip(upper.recurse().notes, lower.recurse().notes):
    iv = interval.Interval(b, a)  # from the lower note up to the upper one
    assert iv.simpleName in CONSONANT, f"bar {a.measureNumber}: {iv.niceName}"

score = together(upper, lower)`}
          note={["passes; change the fifth note to `c'` and it stops:", "通過；把第五個音改成 `c'` 就會停下來："]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/4
K:C
[DA]4 | [FA]4 | [EG]4 | [DA]4 | [GB]4 | [A^c]4 | [Dd]4 |]`}
          caption={["Both voices on one staff, cantus below: every pair consonant", "兩個聲部畫在同一行譜上，定旋律在下：每一對音都協和"]}
          instrument={0}
        />
        <Says where={["line 7", "第 7 行"]} text="AssertionError: bar 5: Perfect Fourth" />
        <P
          t={[
            "Parallel fifths and octaves involve **four** notes: two in each voice, one moment and the next. music21's `voiceLeading.VoiceLeadingQuartet` takes exactly those four and answers questions about the motion:",
            "平行五度與八度牽涉**四個**音：每個聲部兩個，一個時刻接著下一個時刻。music21 的 `voiceLeading.VoiceLeadingQuartet` 正好接收這四個音，回答關於進行方式的問題：",
          ]}
        />
        <Py
          code={`upper = tiny("a1 a g a b c'# d'", name="Counterpoint")
lower = tiny("d1 f e d g a d", name="Cantus")

u = list(upper.recurse().notes)
l = list(lower.recurse().notes)
assert len(u) == len(l), "one note against each note"
for i in range(1, len(u)):
    vlq = voiceLeading.VoiceLeadingQuartet(u[i - 1], u[i], l[i - 1], l[i])
    assert not vlq.parallelFifth(), f"parallel fifths into bar {u[i].measureNumber}"
    assert not vlq.parallelOctave(), f"parallel octaves into bar {u[i].measureNumber}"

score = together(upper, lower)`}
          note={[
            "passes; start with `a1 b` over `d1 e` and the fifth A–D moves to the fifth B–E:",
            "通過；改成 `a1 b` 對 `d1 e` 開頭，五度 A–D 就移到五度 B–E：",
          ]}
        />
        <Says where={["line 9", "第 9 行"]} text="AssertionError: parallel fifths into bar 2" />
        <P
          t={[
            "The same object also answers `hiddenFifth()`, `contraryMotion()`, `voiceCrossing()` and more. A rule you can say in words is usually a few lines away.",
            "同一個物件也能回答 `hiddenFifth()`、`contraryMotion()`、`voiceCrossing()` 等問題。能用文字說清楚的規則，通常只差幾行程式碼。",
          ]}
        />
        <p>
          <SiteLink to={["concept", "theory"]} label={["Music theory as code", "以程式碼表達樂理"]} />
        </p>
        <Sources items={[MUSIC21_IV, MUSIC21_VL]} />
      </Section>

      <Section page={PAGE} id="module" n={4} title={SECTIONS[3].title}>
        <P
          t={[
            "Checks you use often belong in their own file, so `main.py` stays about the music. Add a file `checks.py` to the project:",
            "常用的檢查應該放在自己的檔案裡，讓 `main.py` 只談音樂。在專案裡新增一個 `checks.py`：",
          ]}
        />
        <Py title="checks.py" code={CHECKS_V1} />
        <Py
          title="main.py"
          code={`from checks import full_bars, in_range

flute = tiny("g4 a b c' d'2 g2", name="Flute", inst="flute")
cello = tiny("G2 D GG2 G2", name="Cello", inst="cello", clef_="bass")

full_bars(flute)
full_bars(cello)
in_range(flute, "C4", "C7")
in_range(cello, "C2", "A5")

score = together(flute, cello)`}
        />
        <P
          t={[
            "Now try the same rule on music you didn't write. Bach's chorale starts with a one-beat pickup:",
            "接著把同一條規則用在不是你寫的音樂上。巴哈的聖詠以一拍的弱起開始：",
          ]}
        />
        <Py
          title="main.py"
          code={`from checks import full_bars

chorale = corpus.parse("bach/bwv66.6")
for part in chorale.parts:
    full_bars(part)
score = chorale`}
        />
        <Says where={["checks.py, line 5", "checks.py，第 5 行"]} text="AssertionError: Soprano, bar 9: 3.0 of 4.0 beats" />
        <P
          t={[
            "Is Bach wrong? No: the last bar has three beats because the pickup took one, and together they make a full bar. **The rule was wrong**, and the failure taught you something about the music. Tests are code too; fix the rule:",
            "是巴哈錯了嗎？不是：最後一小節只有三拍，因為弱起用掉了一拍，兩者合起來剛好是一整個小節。**錯的是規則**，而這次失敗讓你學到了關於音樂的一件事。測試也是程式碼；把規則修好：",
          ]}
        />
        <Py title="checks.py" code={FULL_BARS_V2} note={["with this `full_bars`, the chorale passes and the examples above still pass", "換成這個 `full_bars` 之後，聖詠通過了，上面的例子也仍然通過"]} />
      </Section>

      <Section page={PAGE} id="parts" n={5} title={SECTIONS[4].title}>
        <P
          t={[
            "Players read parts, not the score. Open the **Pages** view, choose a part under **Sheet for**, and look at it as the player will:",
            "演奏者讀的是分譜，不是總譜。打開**頁面**視圖，在**樂譜給**底下選一個聲部，用演奏者的眼光看它：",
          ]}
        />
        <List
          items={[
            [
              "**On the stand** sets how the pages sit: *one page at a time*, *open spreads* (pages 1 and 2 face each other, so the first turn is after page 2), or a part that *starts on a right page*.",
              "**譜架上** 設定頁面怎麼擺：*一次一頁*、*左右兩頁*（第 1、2 頁相對，所以第一次翻頁在第 2 頁之後），或是*從右頁開始*的分譜。",
            ],
            [
              "**Rest needed to turn (s)** is how many seconds of rest the player needs to turn a page; at the tempo of the score, Polyphonizer works out how long each rest lasts.",
              "**翻頁需要的休止（秒）** 是演奏者翻一頁需要幾秒休止；Polyphonizer 依樂譜的速度算出每個休止有多長。",
            ],
            [
              "**Move page breaks to rests** chooses where each page ends so that every turn falls in a long enough rest. The list of **page turns** shows each one, and flags a turn with *not enough time to turn*.",
              "**把換頁移到休止處** 會選擇每頁在哪裡結束，讓每次翻頁都落在夠長的休止裡。**翻頁**清單列出每一次翻頁，來不及的會標上*來不及翻頁*。",
            ],
          ]}
        />
        <P
          t={[
            "If no layout gives a safe turn, change the music, not the layout: give the player a rest of a bar or two before the turn, or let another instrument take those notes.",
            "如果沒有任何排版能安全翻頁，就改音樂而不是改排版：在翻頁前給演奏者一兩小節休止，或讓另一個樂器接過那些音。",
          ]}
        />
        <P
          t={[
            "**Cues.** After a long rest, a player is helped by a few small notes from another part, to hear where to come in. music21 prints a note small when its `style.noteSize` is `\"cue\"`:",
            "**提示音。** 長休止之後，從別的聲部借來幾個小音符，能幫演奏者聽出何時進來。music21 把 `style.noteSize` 設為 `\"cue\"` 的音印成小音符：",
          ]}
        />
        <Py
          code={`import copy

flute = tiny("g'4 f' e' d' c'2 d'4 e' c'1", name="Flute", inst="flute")
violin = tiny("r1 r1 e'4 d' c'2", name="Violin", inst="violin")

# the violinist waits two bars: print the flute's bar 2, small, in the violin's bar 2
waiting = violin.measure(2)
waiting.remove(waiting.notesAndRests[0])
for n in flute.measure(2).notesAndRests:
    cue = copy.deepcopy(n)
    cue.style.noteSize = "cue"
    waiting.insert(n.offset, cue)

score = together(flute, violin)`}
        />
        <Callout kind="warn" title={["Cue notes are still notes", "提示音仍然是音符"]}>
          <P
            t={[
              "Playback plays them and your checks see them, as if the violin played them too. Add cues last, when the music is finished and you are printing the parts.",
              "播放時會奏出它們，你的檢查也看得到它們，就像小提琴也演奏了這些音。等音樂寫完、要印分譜時，最後才加上提示音。",
            ]}
          />
        </Callout>
        <P
          t={[
            "**Multi-bar rests.** Four bars of rest are printed in a part as one bar with a **4** above it, which saves space and counting. Mark the rests with a `spanner.MultiMeasureRest`:",
            "**多小節休止。** 分譜裡連續四小節的休止，會印成上方標著 **4** 的一個小節，既省空間也方便數。用 `spanner.MultiMeasureRest` 把這些休止標起來：",
          ]}
        />
        <Py
          code={`violin = tiny("r1 r1 r1 r1 e'4 d' c'2", name="Violin", inst="violin")
bars = violin.getElementsByClass(stream.Measure)
rests = [m.notesAndRests[0] for m in bars[:4]]
violin.insert(0, spanner.MultiMeasureRest(rests))  # bars 1-4 as one rest marked 4
score = violin`}
        />
        <P
          t={[
            "Do this in the part only when every bar in the stretch is a full-bar rest; a full score keeps each bar, because the other parts are playing.",
            "只有在那一段每一小節都是整小節休止時，才在分譜裡這樣做；總譜則保留每一小節，因為其他聲部還在演奏。",
          ]}
        />
        <p>
          <SiteLink to={["concept", "engraving"]} label={["How a score is engraved", "樂譜如何排版"]} />
        </p>
      </Section>

      <Section page={PAGE} id="checklist" n={6} title={SECTIONS[5].title}>
        <List
          ordered
          items={[
            [
              "**Compile with your checks**: ranges, full bars, and the voice-leading rules you care about. No `AssertionError`.",
              "**連同檢查一起編譯**：音域、小節要滿，以及你在意的聲部進行規則。沒有 `AssertionError`。",
            ],
            [
              "**Listen once from start to end**, following the score. Ears catch what rules don't: a wrong octave that is still in range, a missing tie.",
              "**從頭到尾聽一次**，邊聽邊看譜。耳朵抓得到規則抓不到的東西：仍在音域內的錯誤八度、少了的連結線。",
            ],
            [
              "**Read the top of each part**: title, part name, tempo, key and time signatures, clef.",
              "**讀每份分譜的開頭**：標題、聲部名稱、速度、調號與拍號、譜號。",
            ],
            [
              "**Check every page turn** in Pages, for every part, with the stand the player will use.",
              "**檢查每一次翻頁**：在頁面視圖裡，對每個聲部、用演奏者實際的擺法檢查。",
            ],
            [
              "**Cues after long rests; multi-bar rests** where a part waits.",
              "**長休止後加提示音；聲部等待處用多小節休止。**",
            ],
            [
              "**Print or save as PDF** from Export, and give one copy to a player before the rehearsal: the last check is a human reading it.",
              "從匯出選單**列印或存成 PDF**，排練前先給一位演奏者一份：最後一道檢查，是有人真的去讀它。",
            ],
          ]}
        />
        <p className="flex flex-wrap gap-4">
          <SiteLink to={["editor"]} label={["Open the score editor", "開啟樂譜編輯器"]} />
          <SiteLink to={["skills", "errors"]} label={["Reading errors", "讀懂錯誤訊息"]} />
          <SiteLink to={["learn", "code", "species-1-above"]} label={["Try a problem with rules", "試一道有規則的題目"]} />
        </p>
      </Section>
    </Page>
  );
}
