/** Concept ▸ The Feynman technique (#/concept/feynman[/<section>]). Every code example here runs as score code. */
import { useLang } from "@learnkit/web";
import { Callout, Figure, List, Notation, P, Page, Py, Section, SiteLink, Sources, Table, TryIn, type L, type SectionInfo } from "../kit";

const PAGE = "feynman";

const SECTIONS: SectionInfo[] = [
  { id: "steps", title: ["Four steps", "四個步驟"] },
  { id: "example", title: ["Worked example: no parallel fifths", "實例：不可平行五度"] },
  { id: "fux", title: ["Compare with the source", "和原始資料對照"] },
  { id: "ear", title: ["Explain it to the ear too", "也要解釋給耳朵聽"] },
  { id: "pitfalls", title: ["Pitfalls and a self-check", "常見陷阱與自我檢查"] },
];

/** the check, first version: "a fifth is 7 semitones" */
const CHECK = `def parallel_fifths(upper, lower):
    """Bars where the two voices go from a fifth to another fifth."""
    u = list(upper.recurse().notes)
    l = list(lower.recurse().notes)
    bars = []
    for i in range(1, len(u)):
        before = u[i - 1].pitch.midi - l[i - 1].pitch.midi   # semitones apart
        now = u[i].pitch.midi - l[i].pitch.midi
        moved = u[i].pitch != u[i - 1].pitch or l[i].pitch != l[i - 1].pitch
        if before == 7 and now == 7 and moved:   # a fifth is 7 semitones
            bars.append(u[i].measureNumber)
    return bars
`;

const TAIL = `
score = together(counterpoint, cantus)
bad = parallel_fifths(counterpoint, cantus)
assert not bad, f"parallel fifths in bars {bad}"
`;

const FAILS = `${CHECK}
cantus = tiny("d1 f e d", name="Cantus firmus")
counterpoint = tiny("a1 c' b a", name="Counterpoint")   # should FAIL: fifths all the way
${TAIL}`;

const PASSES = `${CHECK}
cantus = tiny("d1 f e d", name="Cantus firmus")
counterpoint = tiny("a1 d' c' d'", name="Counterpoint")   # should PASS: 5th, 6th, 6th, octave
${TAIL}`;

const GAP = `${CHECK}
cantus = tiny("d1 f e d", name="Cantus firmus")
counterpoint = tiny("a1 c'' b' a'", name="Counterpoint")   # fifths again, an octave higher
${TAIL}`;

const FIX = `        before = (u[i - 1].pitch.midi - l[i - 1].pitch.midi) % 12   # ignore octaves
        now = (u[i].pitch.midi - l[i].pitch.midi) % 12`;

const EAR = `# Bars 1-4: parallel fifths. Bar 5: silence. Bars 6-9: the same cantus with a better line.
cantus = tiny("d1 f e d r d f e d", name="Cantus firmus", inst="cello")
upper = tiny("a1 c' b a r a d' c' d'", name="Counterpoint", inst="violin")
score = together(upper, cantus, bpm=72)
`;

/** The four steps as a cycle, each with what it becomes in Polyphonizer. */
function StepCycle() {
  const { pick } = useLang();
  const steps: { title: L; here: L }[] = [
    { title: ["1 · Pick a rule", "1 · 挑一條規則"], here: ["say it in one sentence", "用一句話說出來"] },
    { title: ["2 · Explain simply", "2 · 簡單地解釋"], here: ["write it as a check", "寫成一個檢查"] },
    { title: ["3 · Find the gaps", "3 · 找出漏洞"], here: ["passages that should pass or fail", "該過與不該過的樂句"] },
    { title: ["4 · Simplify", "4 · 簡化"], here: ["fix the check, listen again", "修正檢查，再聽一次"] },
  ];
  const w = 140;
  const x = (i: number) => 10 + i * 160;
  return (
    <svg viewBox="0 0 640 210" className="w-full max-w-[640px]" role="img" aria-label={pick(["The four steps as a cycle", "四個步驟形成的循環"])}>
      <defs>
        <marker id="pz-feynman-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-gray-500" />
        </marker>
      </defs>
      <text x={320} y={18} textAnchor="middle" className="fill-gray-500 text-[11px]">
        {pick(["on paper the listener is a person; here it is the checker, and your ear", "在紙上，聽眾是一個人；在這裡，聽眾是檢查器和你的耳朵"])}
      </text>
      {steps.map((s, i) => (
        <g key={i}>
          <rect
            x={x(i)}
            y={30}
            width={w}
            height={84}
            rx={10}
            className={i === 2 ? "fill-amber-50 stroke-amber-400" : "fill-white stroke-rose-700"}
            strokeWidth={1.5}
          />
          <text x={x(i) + w / 2} y={62} textAnchor="middle" className="fill-gray-900 text-[13px] font-semibold">
            {pick(s.title)}
          </text>
          <text x={x(i) + w / 2} y={90} textAnchor="middle" className="fill-gray-600 text-[11px]">
            {pick(s.here)}
          </text>
          {i < 3 && (
            <line
              x1={x(i) + w + 2}
              y1={72}
              x2={x(i + 1) - 2}
              y2={72}
              className="stroke-gray-500"
              strokeWidth={1.5}
              markerEnd="url(#pz-feynman-arrow)"
            />
          )}
        </g>
      ))}
      <path
        d={`M ${x(3) + w / 2} 116 C ${x(3) + w / 2} 180, ${x(1) + w / 2} 180, ${x(1) + w / 2} 116`}
        fill="none"
        className="stroke-rose-700"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        markerEnd="url(#pz-feynman-arrow)"
      />
      <text x={(x(1) + x(3) + w) / 2} y={194} textAnchor="middle" className="fill-rose-700 text-[12px] font-medium">
        {pick(["repeat until the check and your ear agree", "重複，直到檢查和你的耳朵意見一致"])}
      </text>
    </svg>
  );
}

export default function FeynmanConcept({ section }: { section: string | null }) {
  return (
    <Page
      id={PAGE}
      title={["The Feynman technique", "費曼學習法"]}
      intro={[
        "A way of learning named after the physicist Richard Feynman: pick a topic, explain it simply, find the gaps in your explanation, simplify and repeat. Tensorizer and Formalizer use it for code and proofs; here the topic is a rule of music theory, the explanation is a check written in Python, and the listeners who find the gaps are the checker and your own ear.",
        "一種以物理學家理查·費曼命名的學習方法：選一個主題、簡單地解釋它、找出解釋中的漏洞，再簡化並重複。Tensorizer 和 Formalizer 把它用在程式與證明上；在這裡，主題是一條樂理規則，解釋是一段用 Python 寫的檢查，而找出漏洞的聽眾，是檢查器和你自己的耳朵。",
      ]}
      sections={SECTIONS}
      focus={section}
    >
      <Section page={PAGE} id="steps" n={1} title={SECTIONS[0].title}>
        <P
          t={[
            "Pick something you want to understand and try to teach it to someone who has never heard of it. Wherever your explanation stalls, or needs a word you cannot explain, you have found the edge of your understanding. As usually given, the steps are:",
            "挑一件你想弄懂的事，試著把它教給一個從沒聽過的人。解釋卡住的地方、或需要用到一個你自己也說不清楚的詞的地方，就是你理解的邊界。一般常見的步驟是：",
          ]}
        />
        <List
          ordered
          items={[
            ["**Pick a concept** and write down what you already know about it.", "**選一個概念**，寫下你已經知道的東西。"],
            ["**Explain it in plain words**, as if to a newcomer. No jargon you have not explained.", "**用白話解釋**，就像講給新手聽。不用任何你沒解釋過的術語。"],
            [
              "**Find the gaps**: the places where the explanation breaks or leans on jargon. Go back to the source for exactly those points.",
              "**找出漏洞**：解釋斷掉、或得靠術語撐住的地方。針對這些地方回頭查原始資料。",
            ],
            ["**Simplify**, then repeat from step 2 until the explanation runs from start to end without a gap.", "**簡化**，然後從第 2 步重來，直到解釋從頭到尾沒有漏洞。"],
          ]}
        />
        <P
          t={[
            "Music theory is full of rules that everyone can *recite* and fewer people can *explain*: no parallel fifths, resolve the leading note, avoid the tritone. Polyphonizer gives each step a concrete form. Step 2 is a few lines of Python that look at the notes. Step 3 is running that check on passages that should pass and passages that should fail: wherever the check and your expectation disagree, you have found a gap.",
            "樂理裡充滿了人人都*背得出來*、卻少有人*解釋得清楚*的規則：不可平行五度、導音要解決、避開三全音。Polyphonizer 讓每一步都有具體的形式。第 2 步是幾行檢查音符的 Python。第 3 步是把這個檢查拿去跑應該通過和應該失敗的樂句：檢查結果和你的預期不同的地方，就是漏洞。",
          ]}
        />
        <Figure
          caption={[
            "The four steps. Step 3 is where the learning happens: a passage that surprises you, or your check.",
            "四個步驟。第 3 步是真正學到東西的地方：某段樂句或你的檢查讓你意外了。",
          ]}
        >
          <StepCycle />
        </Figure>
        <Callout kind="note" title={["Who named it?", "誰取的名字？"]}>
          <P
            t={[
              'Feynman never wrote down a "Feynman technique"; the four-step recipe is a modern summary of how he worked. An early, dated use of the name is Scott Young\'s blog post *Learn faster with the Feynman technique* (September 2011). Feynman\'s own words are closer to the spirit of this site: on his Caltech blackboard when he died in 1988 was the sentence "What I cannot create, I do not understand."',
              "費曼從未寫下所謂的「費曼學習法」；四步驟的配方是對他工作方式的現代歸納。這個名稱一個較早且有日期的用法，是 Scott Young 的部落格文章 *Learn faster with the Feynman technique*（2011 年 9 月）。費曼自己的話更接近本站的精神：1988 年他去世時，加州理工學院的黑板上寫著「我無法創造的，我就不理解」（What I cannot create, I do not understand）。",
            ]}
          />
        </Callout>
        <p>
          <SiteLink to={["concept", "method"]} label={["From score to code: the rules come first", "從樂譜到程式碼：規則先行"]} />
        </p>
        <Sources
          items={[
            {
              label: "S. H. Young (September 2011), Learn faster with the Feynman technique (blog post)",
              url: "https://www.scotthyoung.com/blog/2011/09/01/learn-faster/",
            },
            { label: "Caltech Archives: Feynman's blackboard at the time of his death (photograph)", url: "https://digital.archives.caltech.edu/collections/Photographs/1.10-3" },
            { label: "The Feynman Lectures on Physics, online edition (Caltech)", url: "https://www.feynmanlectures.caltech.edu/" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="example" n={2} title={SECTIONS[1].title}>
        <P
          t={[
            "**Step 1, the rule.** *Two voices must not move in parallel fifths.* Everyone who has studied harmony has heard it. Can you explain it well enough for a computer?",
            "**第 1 步，規則。** *兩個聲部不可以平行五度進行。* 學過和聲的人都聽過這句話。你能把它解釋到電腦也聽得懂嗎？",
          ]}
        />
        <P
          t={[
            "**Step 2, in plain words.** *Look at each pair of notes sounding together, and the pair after it. If both pairs are a fifth apart, and at least one voice moved, that is parallel fifths.* And what is a fifth? On the keyboard, C up to G, or D up to A: **7 semitones**. That sentence becomes a function:",
            "**第 2 步，用白話說。** *看每一對同時發聲的音，以及它後面那一對。如果兩對都相距五度，而且至少有一個聲部動了，就是平行五度。* 那五度是什麼？在鍵盤上，C 往上到 G，或 D 往上到 A：**7 個半音**。這段話可以變成一個函式：",
          ]}
        />
        <Py
          code={FAILS}
          note={[
            "This one should fail, and does: it stops with `AssertionError: parallel fifths in bars [2, 3, 4]`. An error in the editor is how your own check says *no*.",
            "這段應該失敗，也確實失敗了：它停在 `AssertionError: parallel fifths in bars [2, 3, 4]`。編輯器裡出現錯誤，就是你自己的檢查在說*不行*。",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/1
K:C
V:1
"^P5"A | "^P5"c | "^P5"B | "^P5"A |]
V:2
D | F | E | D |]`}
          caption={[
            "The failing version: counterpoint A C B A over the cantus D F E D, a fifth (7 semitones) in every bar.",
            "失敗的版本：對位 A C B A 在定旋律 D F E D 上方，每一小節都是五度（7 個半音）。",
          ]}
          instrument={40}
        />
        <P
          t={[
            "**Step 3, test it both ways.** A check that never says *no* is useless, and so is one that always does. So we also run a line that should pass: a fifth, then two sixths, then the octave. Same function, new counterpoint:",
            "**第 3 步，正反兩面都要測。** 一個從不說*不*的檢查沒有用，一個永遠說不的也一樣。所以我們也跑一段應該通過的旋律：一個五度、兩個六度，最後是八度。函式不變，換一條對位：",
          ]}
        />
        <Py code={PASSES} note={["Runs and engraves: no parallel fifths found.", "可以執行並排版：沒有找到平行五度。"]} />
        <Notation
          abc={`X:1
M:4/4
L:1/1
K:C
V:1
"^P5"A | "^M6"d | "^m6"c | "^P8"d |]
V:2
D | F | E | D |]`}
          caption={[
            "The corrected line, A D C D: a fifth, two sixths, the octave. No two perfect intervals in a row.",
            "修正後的旋律 A D C D：五度、兩個六度、八度。沒有連續兩個完全音程。",
          ]}
          instrument={40}
        />
        <P
          t={[
            "Now the interesting test. Take the failing line and move the last three notes up an octave. To the ear nothing important changed: they are still fifths, just wider ones (a fifth plus an octave, a *twelfth*). Our check says:",
            "現在來做有意思的測試。把會失敗的那條旋律，最後三個音移高一個八度。聽起來沒有本質上的改變：它們仍然是五度，只是更寬（五度加八度，也就是*十二度*）。我們的檢查卻說：",
          ]}
        />
        <Py
          code={GAP}
          note={[
            "Runs **without** an error. That is the gap: 19 semitones is not 7, so the check never sees these fifths.",
            "執行時**沒有**出錯。這就是漏洞：19 個半音不等於 7，所以檢查完全沒看到這些五度。",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/1
K:C
V:1
"^P5"A | "^P12"c' | "^P12"b | "^P12"a |]
V:2
D | F | E | D |]`}
          caption={[
            "The gap: the failing line with its last three notes an octave up. Twelfths, 19 semitones apart, still fifths to the ear.",
            "漏洞：把失敗的旋律最後三個音移高一個八度。十二度，相距 19 個半音，聽起來仍然是五度。",
          ]}
          instrument={40}
        />
        <P
          t={[
            "**Step 4, simplify.** The explanation said *a fifth*, but meant *any* fifth, in any octave. In numbers, that is the distance **mod 12**: $19 \\bmod 12 = 7$. Change two lines of the function, and the passage fails as it should, in bars 2, 3 and 4:",
            "**第 4 步，簡化。** 解釋裡說的是*五度*，真正的意思是*任何八度裡的*五度。用數字說，就是距離 **mod 12**：$19 \\bmod 12 = 7$。改掉函式裡的兩行，這段樂句就如預期地在第 2、3、4 小節失敗：",
          ]}
        />
        <Py
          code={FIX}
          note={[
            "Only the two changed lines of `parallel_fifths`, not a complete score: put them in place of the two lines starting `before =` and `now =` above.",
            "這只是 `parallel_fifths` 裡改掉的兩行，不是完整的樂譜：用它們取代上面以 `before =` 和 `now =` 開頭的兩行。",
          ]}
        />
        <P
          t={[
            "You did not just fix a bug. You learned something about the rule: *interval* in voice leading means the interval **class**, octaves ignored. Polyphonizer's own checker works the same way: its interval rules (consonance, parallels) compare intervals mod 12.",
            "你不只修好了一個錯誤。你學到了關於這條規則的一件事：聲部進行裡說的*音程*，指的是音程**類別**，八度不計。Polyphonizer 自己的檢查器也是這樣運作的：它的音程規則（協和、平行）都以 mod 12 比較音程。",
          ]}
        />
        <TryIn ids={["species-1-above"]} />
      </Section>

      <Section page={PAGE} id="fux" n={3} title={SECTIONS[2].title}>
        <P
          t={[
            "Step 3 also says: *go back to the source.* For counterpoint the source is Johann Joseph Fux's *Gradus ad Parnassum* (Vienna, 1725), a Latin dialogue between a teacher and a student, studied by Haydn and Beethoven among many others. Fux does not say *no parallel fifths*. He gives four rules of motion between two voices:",
            "第 3 步還說：*回頭查原始資料。* 對位法的原始資料，是福克斯（Johann Joseph Fux）的《Gradus ad Parnassum》（《通往帕納薩斯山之階》，維也納，1725），一部師生對話體的拉丁文著作，海頓和貝多芬等許多人都研讀過它。福克斯並沒有說*不可平行五度*。他給的是兩個聲部之間的四條進行規則：",
          ]}
        />
        <List
          ordered
          items={[
            [
              "From a **perfect** consonance to a **perfect** consonance: contrary or oblique motion only.",
              "從**完全**協和音程到**完全**協和音程：只能用反向或斜向進行。",
            ],
            ["From a perfect consonance to an imperfect one: any motion.", "從完全協和音程到不完全協和音程：任何進行皆可。"],
            [
              "From an **imperfect** consonance to a **perfect** one: contrary or oblique motion only.",
              "從**不完全**協和音程到**完全**協和音程：只能用反向或斜向進行。",
            ],
            ["From an imperfect consonance to an imperfect one: any motion.", "從不完全協和音程到不完全協和音程：任何進行皆可。"],
          ]}
        />
        <P
          t={[
            "(Perfect consonances are the unison, fifth and octave; imperfect ones are thirds and sixths.) Read against our one-sentence explanation, the source shows three more gaps:",
            "（完全協和音程是同度、五度與八度；不完全協和音程是三度與六度。）拿來和我們那一句話的解釋對照，原始資料又揭露了三個漏洞：",
          ]}
        />
        <Table
          head={[
            ["Case", "情況"],
            ["Fux's rules", "福克斯的規則"],
            ["Polyphonizer's checker", "Polyphonizer 的檢查器"],
          ]}
          rows={[
            [
              ["Octave to octave, in the same direction", "八度到八度，同方向"],
              ["forbidden (rule 1): octaves, not only fifths", "禁止（規則 1）：不只五度，八度也是"],
              ["**error**: no parallel fifths *or octaves*", "**錯誤**：不可平行五度*或八度*"],
            ],
            [
              ["Fifth to twelfth, voices moving apart", "五度到十二度，聲部反向分開"],
              ["contrary motion: rule 1 allows it", "反向進行：規則 1 允許"],
              ["**error**: the same perfect interval twice in a row, whenever a voice moves", "**錯誤**：只要有聲部移動，連續兩次相同的完全音程就不行"],
            ],
            [
              ["Third to fifth, both voices rising", "三度到五度，兩個聲部都上行"],
              ["forbidden (rule 3: *direct* or *hidden* fifths)", "禁止（規則 3：*直接*或*隱伏*五度）"],
              ["**advice** only, and only when the upper voice leaps", "只是**建議**，而且只在上方聲部跳進時"],
            ],
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/2
K:C
V:1
"^P8"c "^P8"d | "^P5"G "^P12"d | "^M3"E "^P5"A |]
V:2
C D | C G, | C D |]`}
          caption={[
            "The table's three cases, one per bar. Bar 1: octave to octave, both rising. Bar 2: fifth to twelfth, the voices moving apart. Bar 3: third to fifth, both rising, the upper voice leaping.",
            "表中的三種情況，一小節一種。第 1 小節：八度到八度，兩者都上行。第 2 小節：五度到十二度，兩聲部反向分開。第 3 小節：三度到五度，兩者都上行，上方聲部跳進。",
          ]}
        />
        <P
          t={[
            "So the checker is *stricter* than Fux in one place and *gentler* in another. Neither is a mistake: they are choices, and now you can say what they are and why. That is the difference between reciting a rule and understanding it.",
            "所以檢查器在一處比福克斯*更嚴格*，在另一處又*更寬鬆*。兩者都不是錯誤，而是選擇；現在你說得出它們是什麼，以及為什麼。這就是背出一條規則和理解它的差別。",
          ]}
        />
        <Sources
          items={[
            { label: "J. J. Fux (1725), Gradus ad Parnassum, scans at IMSLP", url: "https://imslp.org/wiki/Gradus_ad_Parnassum_(Fux,_Johann_Joseph)" },
            { label: "Wikipedia: Gradus ad Parnassum", url: "https://en.wikipedia.org/wiki/Gradus_ad_Parnassum" },
            { label: "Wikipedia: Consecutive fifths", url: "https://en.wikipedia.org/wiki/Consecutive_fifths" },
          ]}
        />
      </Section>

      <Section page={PAGE} id="ear" n={4} title={SECTIONS[3].title}>
        <P
          t={[
            "A check tells you *that* a rule is broken. Only listening tells you *why* anyone cared. Play both versions of the same cantus, one after the other:",
            "檢查告訴你規則*被打破了*。只有聆聽能告訴你*為什麼*有人在乎這條規則。把同一個定旋律的兩個版本前後播放：",
          ]}
        />
        <Py code={EAR} note={["Runs and plays: violin over cello, the bad version first.", "可以執行並播放：小提琴在大提琴上方，先播不好的版本。"]} />
        <P
          t={[
            "In the first four bars the violin shadows the cello a fifth above, and the two lines tend to blend into one thicker, hollow line. In the last four the violin moves on its own, and you hear two voices in conversation. The usual explanation is exactly that: perfect intervals blend so well that parallel ones make two voices sound like one, and counterpoint is the art of keeping voices independent.",
            "前四小節，小提琴在大提琴上方五度如影隨形，兩條旋律容易融成一條較厚、較空洞的線。後四小節，小提琴自己走自己的路，你聽到的是兩個聲部在對話。常見的解釋正是如此：完全音程融合得太好，平行進行會讓兩個聲部聽起來像一個；而對位的藝術，就是讓聲部保持獨立。",
          ]}
        />
        <List
          items={[
            [
              "Listen with your eyes closed and count the voices you hear in each half.",
              "閉上眼睛聽，數一數每一半裡你聽到幾個聲部。",
            ],
            [
              "Swap the instruments (`inst=\"flute\"`, `inst=\"viola\"`): does the effect change with the colour of the sound?",
              "換樂器（`inst=\"flute\"`、`inst=\"viola\"`）：效果會隨音色改變嗎？",
            ],
            [
              "Try parallel *thirds* instead: why do they not blend in the same way?",
              "改成平行*三度*試試：為什麼它們不會以同樣的方式融合？",
            ],
          ]}
        />
        <Callout kind="tip" title={["Explain it twice", "解釋兩次"]}>
          <P
            t={[
              "If you can explain a rule to the checker (a function that fails the right passages) **and** to the ear (two versions that sound different for the reason you gave), you understand it.",
              "如果你能把一條規則解釋給檢查器聽（一個讓該失敗的樂句失敗的函式），**也**能解釋給耳朵聽（兩個版本聽起來不同，原因正是你說的那個），你就理解它了。",
            ]}
          />
        </Callout>
        <TryIn ids={["species-1-above", "twinkle-duet"]} />
      </Section>

      <Section page={PAGE} id="pitfalls" n={5} title={SECTIONS[4].title}>
        <P
          t={[
            'In 1974 Feynman told Caltech\'s graduates that the first principle is that "you must not fool yourself", and "you are the easiest person to fool". Three ways that happens here:',
            "1974 年，費曼對加州理工學院的畢業生說，第一個原則是「你絕不能欺騙自己」（you must not fool yourself），而「你是最容易被騙的人」（you are the easiest person to fool）。在這裡，常見的三種情形：",
          ]}
        />
        <P
          t={[
            '**1. "It passes, so it is good."** The rules catch mistakes; they cannot hear music. A line can pass every rule and still be dull. Passing is necessary, not sufficient: play it back and ask whether it sings.',
            "**1.「通過了，所以它很好。」** 規則能抓出錯誤，但聽不見音樂。一條旋律可以通過所有規則，卻依然乏味。通過是必要而非充分：播放出來，問問自己它是否有歌唱性。",
          ]}
        />
        <P
          t={[
            '**2. "My check works, I tried it."** On what? A check tested only on music that passes has never shown it can say *no*. Always keep one passage that must fail, like the octave-higher fifths above.',
            "**2.「我的檢查沒問題，我試過了。」** 用什麼試的？只在會通過的音樂上測過的檢查，從沒證明過它會說*不*。永遠留一段一定要失敗的樂句，例如上面高八度的五度。",
          ]}
        />
        <P
          t={[
            '**3. "I know what a fifth is."** Do you mean C–G, or also C–G♯? A diminished fifth, B–F, is 6 semitones; an augmented fourth, F–B, is also 6. Numbers lose the spelling, names keep it. When your explanation uses a word, ask which one your code is really counting.',
            "**3.「我知道什麼是五度。」** 你指的是 C–G，還是也包括 C–G♯？減五度 B–F 是 6 個半音；增四度 F–B 也是 6 個半音。數字會丟掉拼法，音名會保留。當你的解釋用到某個詞時，問問自己程式碼真正在數的是哪一種。",
          ]}
        />
        <Notation
          abc={`X:1
M:4/4
L:1/2
K:C
"^P5 = 7"[CG] "^A5 = 8"[C^G] | "^d5 = 6"[Bf] "^A4 = 6"[FB] |]`}
          caption={[
            "Names and numbers disagree: C–G and C–G♯ are both *fifths* on paper but 7 and 8 semitones; B–F and F–B are a fifth and a fourth but both 6.",
            "名稱和數字對不上：C–G 與 C–G♯ 在紙上都是*五度*，卻分別是 7 和 8 個半音；B–F 與 F–B 一個是五度、一個是四度，卻都是 6。",
          ]}
        />
        <Callout kind="tip" title={["Self-check: can you tick every box?", "自我檢查：每一項你都能打勾嗎？"]}>
          <List
            items={[
              ["I can state the rule in one plain sentence, with every word explained.", "我能用一句白話說出這條規則，而且每個詞都解釋過。"],
              ["My check fails at least one passage that should fail, and passes one that should pass.", "我的檢查至少讓一段該失敗的樂句失敗，也讓一段該通過的樂句通過。"],
              ["I compared my version with the source (Fux, or a textbook) and can name the differences.", "我把自己的版本和原始資料（福克斯或教科書）對照過，說得出差別在哪。"],
              ["I have heard the rule broken and kept, and can say what changed.", "我聽過這條規則被打破和被遵守的樣子，說得出差別在哪。"],
            ]}
          />
        </Callout>
        <p className="flex flex-wrap gap-4">
          <SiteLink to={["skills", "verify"]} label={["Coding Skills: checking a score", "程式技巧：檢查樂譜"]} />
          <SiteLink to={["concept", "theory"]} label={["Music theory as code", "以程式碼表達樂理"]} />
        </p>
        <TryIn ids={["species-1-below"]} />
        <Sources
          items={[
            {
              label: "R. P. Feynman (1974), Cargo Cult Science (Caltech commencement address), Engineering & Science 37(7)",
              url: "https://calteches.library.caltech.edu/51/2/CargoCult.htm",
            },
          ]}
        />
      </Section>
    </Page>
  );
}
