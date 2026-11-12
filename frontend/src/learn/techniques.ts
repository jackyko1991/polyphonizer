/**
 * Playing techniques (演奏法): the markings a player reads, written with markings.py's helpers, in lessons (T1–T8,
 * by instrument family: strings, piano, winds, voice) and graded exercises. Notes are numbered from 1 within a part,
 * rests not counted, as in markings.py. Explanations are in techniqueLessons.tsx; reference solutions in
 * tests/learn/solutions.ts. Tunes are public domain (Beethoven's Ode to Joy, "Ah ! vous dirai-je, maman").
 */
import type { Problem } from "../problems.ts";

const ODE_TWO_PHRASES = "e4 e f g g f e d c c d e e4. d8 d2 e4 e f g g f e d c c d e d4. c8 c2";
const ODE_FLUTE =
  "b4 b c' d' d' c' b a g g a b b4. a8 a2 b4 b c' d' d' c' b a g g a b a4. g8 g2 " +
  "a4 a b g a b8 c' b4 g a b8 c' b4 a g a d2 b4 b c' d' d' c' b a g g a b a4. g8 g2";

const lesson = (id: string, n: string, rest: Omit<Problem, "id" | "lesson" | "category" | "level">): Problem => ({
  id,
  lesson: n,
  category: "technique",
  level: "L0",
  ...rest,
});

export const TECHNIQUE_LESSONS: Problem[] = [
  lesson("tech-bowing", "T1", {
    uses: ["syntax-part"],
    title: ["Strings: down-bow and up-bow", "弦樂：下弓與上弓"],
    task: [
      "Bow this line so the bows take turns: down, up, down, up … Fill the three blanks with up-bows (`u`).",
      "為這條旋律標上弓法，讓下弓和上弓輪流：下、上、下、上…… 在三個空格填入上弓（`u`）。",
    ],
    why: [
      "A down-bow (⊓) pulls the bow from the frog to the tip and is naturally stronger, so phrases and strong beats usually start down; an up-bow (V) pushes it back. Alternating keeps the bow from running out.",
      "下弓（⊓）把弓從弓根拉到弓尖，天生較有力，所以樂句和強拍通常從下弓開始；上弓（V）把弓推回來。輪流使用，弓才不會用完。",
    ],
    starter: `violin = tiny("d4 e f# g a2 a2", name="Violin", inst="violin")
# Down, up, down, up: fill the up-bows.
bowings(violin, "d ___ d ___ d ___")
score = violin
`,
    rules: [
      { id: "bowAlternates", part: 0 },
      { id: "phraseStartsDown", part: 0, starts: [1] },
    ],
  }),
  lesson("tech-slurs", "T2", {
    uses: ["tech-bowing"],
    title: ["Strings: slurs, notes in one bow", "弦樂：圓滑線，一弓多音"],
    task: [
      "Play the notes in pairs, two in each bow: slur notes 1–2, 3–4, 5–6 and 7–8. Fill the two blanks.",
      "兩個音一弓，成對演奏：把第 1–2、3–4、5–6、7–8 個音連起來。填入兩個空格。",
    ],
    why: [
      "A slur over string notes means one bow for all of them: the bow changes direction only at the next slur. So only the first note of a slur gets a bow mark, and the bows still alternate from slur to slur.",
      "弦樂音符上的圓滑線代表這些音用同一弓：到下一條圓滑線才換弓。所以只有圓滑線的第一個音標弓法，而每條圓滑線之間仍然下上輪流。",
    ],
    starter: `violin = tiny("g4 a b c' d' c' b a g1", name="Violin", inst="violin")
# Two notes in each bow: slur them in pairs.
slur(violin, 1, 2)
slur(violin, 3, ___)
slur(violin, ___, 6)
slur(violin, 7, 8)
bowings(violin, "d - u - d - u - d")
score = violin
`,
    rules: [
      { id: "slurOneBow", part: 0, slurs: [[1, 2], [3, 4], [5, 6], [7, 8]] },
      { id: "bowAlternates", part: 0 },
      { id: "phraseStartsDown", part: 0, starts: [1] },
    ],
  }),
  lesson("tech-strokes", "T3", {
    uses: ["tech-bowing"],
    title: ["Strings: staccato, spiccato, pizzicato", "弦樂：斷奏、跳弓、撥奏"],
    task: [
      "Make bar 1 short and detached (staccato on notes 1–4) and pluck bar 2 (pizzicato). Fill the blanks: the notes as `\"1-4\"`, the bar as a number.",
      "讓第 1 小節短而分開（第 1–4 個音加斷奏），第 2 小節用撥奏。填入空格：音符寫成 `\"1-4\"`，小節寫數字。",
    ],
    why: [
      "Staccato dots shorten notes; on strings, spiccato makes the bow bounce off the string. Pizzicato (\"pizz.\") means plucking with a finger until \"arco\" (with the bow) appears. Playback makes these notes shorter.",
      "斷奏的點讓音變短；弦樂的跳弓讓弓在弦上彈跳。撥奏（「pizz.」）表示用手指撥弦，直到出現「arco」（用弓）為止。播放時這些音會比較短。",
    ],
    starter: `violin = tiny("g4 a b c' d' c' b2", name="Violin", inst="violin")
# Bar 1 staccato, bar 2 pizzicato.
staccato(violin, "___")
pizz(violin, ___)
score = violin
`,
    rules: [
      { id: "marked", part: 0, mark: "staccato", notes: [1, 2, 3, 4] },
      { id: "marked", part: 0, mark: "pizz", notes: [5, 6, 7] },
    ],
  }),
  lesson("tech-violin-fingers", "T4", {
    uses: ["tech-bowing", "syntax-accidentals"],
    title: ["Strings: fingerings, strings and harmonics", "弦樂：指法、弦與泛音"],
    task: [
      "Finger A major in first position on the A and E strings: 0 1 2 3 on the A string, then the same on the E string. Fill the two blanks.",
      "在第一把位、A 弦和 E 弦上為 A 大調標指法：A 弦上 0 1 2 3，E 弦上也一樣。填入兩個空格。",
    ],
    why: [
      "Violin fingers are numbered 1 (index) to 4 (little finger); 0 is the open string. In first position each finger reaches a step or so above the last: on the A string 1 = B, 2 = C♯, 3 = D, and 4 = E, the same note as the open E string.",
      "小提琴的手指編號為 1（食指）到 4（小指）；0 是空弦。在第一把位，每根手指比前一根高約一級：在 A 弦上 1 = B、2 = C♯、3 = D，4 = E，和空弦 E 同音。",
    ],
    starter: `violin = tiny("a4 b c'# d' e' f'# g'# a'", name="Violin", inst="violin")
# A major, first position: 0 1 2 3 on the A string, then on the E string.
fingering(violin, "0 1 2 3 ___ 1 2 ___")
score = violin
`,
    rules: [
      { id: "fingered", part: 0 },
      { id: "violinFirstPosition", part: 0 },
    ],
  }),
  lesson("tech-pedal", "T5", {
    uses: ["syntax-part"],
    title: ["Piano: the sustain pedal", "鋼琴：延音踏板"],
    task: [
      "Each bar is one chord, played note by note. Change the pedal with each chord: press it in bar 1 and change it at bars 2, 3 and 4. Fill the blanks.",
      "每個小節是一個和弦，一個音一個音彈出。隨每個和弦換踏板：第 1 小節踩下，在第 2、3、4 小節換踏板。填入空格。",
    ],
    why: [
      "The sustain pedal lets the strings ring after the keys are released, so a broken chord sounds as a full chord. Held into the next chord, the two harmonies blur; so the pedal is lifted and pressed again (Ped. … ✱, or a change) as the harmony changes.",
      "延音踏板讓放開琴鍵後琴弦繼續振動，於是分解和弦聽起來像完整的和弦。若踩著進入下一個和弦，兩個和聲會混在一起；所以和聲改變時要放開再踩下（Ped. … ✱，或換踏板）。",
    ],
    starter: `piano = tiny("C4 G c e FF C F A GG D G B C G c e", name="Piano", inst="piano")
# One chord a bar: change the pedal with each chord.
pedal(piano, "1 ___ 3 ___")
score = piano
`,
    rules: [
      { id: "pedalChangesWithHarmony", part: 0 },
      { id: "pedalCovers", part: 0 },
    ],
  }),
  lesson("tech-piano-fingers", "T6", {
    uses: ["tech-violin-fingers"],
    title: ["Piano: fingering and the hands", "鋼琴：指法與左右手"],
    task: [
      "Finger C major for the right hand: 1 2 3 on C D E, then the thumb passes under to play F, and 2 3 4 5 finish the octave. Fill the blank.",
      "為右手的 C 大調標指法：C D E 用 1 2 3，然後拇指從下方穿過去彈 F，最後用 2 3 4 5 彈完這個八度。填入空格。",
    ],
    why: [
      "Piano fingers are 1 (thumb) to 5 (little finger) in each hand. A scale is longer than five fingers, so the thumb passes under the hand to start a new group. m.d. (mano destra) and m.s. (mano sinistra) say which hand plays; \"una corda\" asks for the soft pedal.",
      "鋼琴每隻手的手指編號是 1（拇指）到 5（小指）。音階比五根手指長，所以拇指要從手下穿過去開始新的一組。m.d.（右手）和 m.s.（左手）說明用哪隻手彈；「una corda」要求踩弱音踏板。",
    ],
    starter: `right = tiny("c4 d e f g a b c'", name="Piano", inst="piano")
# C major, right hand: the thumb passes under after E.
fingering(right, "1 2 3 ___ 2 3 4 5")
score = right
`,
    rules: [
      { id: "fingered", part: 0 },
      { id: "thumbUnder", part: 0, at: [1, 4] },
    ],
  }),
  lesson("tech-winds", "T7", {
    uses: ["tech-slurs"],
    title: ["Flute: breathing, tonguing and trills", "長笛：換氣、運舌與顫音"],
    task: [
      "This tune has two phrases of two bars. Mark a breath at the end of the first phrase, after the long D (note 6). Fill the blank with the note number.",
      "這首曲子有兩個各兩小節的樂句。在第一句結尾、長音 D（第 6 個音）之後標上換氣。在空格填入音的編號。",
    ],
    why: [
      "Wind players breathe where the music breathes: at the ends of phrases, marked with a comma (,). Each new note is started with the tongue unless it is under a slur; staccato means short tongued notes, and \"tr\" a trill to the note above.",
      "管樂演奏者在音樂「呼吸」的地方換氣：樂句結尾，用逗號（,）標示。除了圓滑線下的音，每個新音都用舌頭起音；斷奏表示短促的吐音，「tr」是與上方音交替的顫音。",
    ],
    starter: `flute = tiny("g'4 a' b' g' a'2 d'2 g'4 a' b' c'' b'2 g'2", name="Flute", inst="flute")
# Breathe at the end of the first phrase, after note 6.
breath(flute, ___)
score = flute
`,
    rules: [{ id: "breathAtPhraseEnds", part: 0, ends: [6] }],
  }),
  lesson("tech-lyrics", "T8", {
    uses: ["syntax-rhythm-values"],
    title: ["Voice: lyrics under the notes", "人聲：音符下的歌詞"],
    task: [
      "Sing Twinkle, Twinkle: one syllable per note. Fill the blank with the missing word, split into its two syllables with a hyphen.",
      "唱〈小星星〉：每個音一個音節。在空格填入缺少的詞，用連字號分成兩個音節。",
    ],
    why: [
      "Lyrics go under the notes, one syllable each; a hyphen joins the syllables of a word. Singers breathe at commas and phrase ends, so `breath()` works for voices too.",
      "歌詞寫在音符下方，每個音一個音節；連字號把同一個字的音節連起來。歌手在逗號和樂句結尾換氣，所以 `breath()` 也適用於人聲。",
    ],
    starter: `voice = tiny("c4 c g g a a g2", name="Voice", inst="voice")
lyrics(voice, "Twin-kle twin-kle ___ star")
score = voice
`,
    rules: [{ id: "lyrics", part: 0, syllables: ["Twin", "kle", "twin", "kle", "lit", "tle", "star"] }],
  }),
];

export const TECHNIQUE_PROBLEMS: Problem[] = [
  {
    id: "bow-ode",
    category: "technique",
    level: "L1",
    uses: ["tech-bowing", "tech-slurs"],
    title: ["Bow Ode to Joy", "為〈快樂頌〉標弓法"],
    task: [
      "Bow both phrases of Ode to Joy for violin. Each phrase starts down-bow (notes 1 and 16), the bows alternate, and the dotted figure near each phrase end is slurred into one bow (notes 13–14 and 28–29). Write `-` for a slurred note in `bowings()`.",
      "為小提琴的〈快樂頌〉兩個樂句標弓法。每句以下弓開始（第 1 和第 16 個音），下上輪流，每句結尾附近的附點音型用圓滑線連成一弓（第 13–14 和 28–29 個音）。在 `bowings()` 裡，圓滑線中的音寫 `-`。",
    ],
    why: [
      "Counting bows ahead is how string players plan a phrase: here the slurred pair makes the second phrase come out down-bow again, without a retake.",
      "預先數弓是弦樂演奏者規劃樂句的方式：這裡的圓滑線讓第二句又剛好從下弓開始，不需要重新起弓。",
    ],
    starter: `violin = tiny("${ODE_TWO_PHRASES}", name="Violin", inst="violin")
bowings(violin, "d u d u")
score = violin
`,
    rules: [
      { id: "phraseStartsDown", part: 0, starts: [1, 16] },
      { id: "bowAlternates", part: 0 },
      { id: "slurOneBow", part: 0, slurs: [[13, 14], [28, 29]] },
    ],
  },
  {
    id: "pedal-progression",
    category: "technique",
    level: "L1",
    uses: ["tech-pedal"],
    title: ["Pedal a chord progression", "為和弦進行踩踏板"],
    task: [
      "C, A minor, F, G, C: one broken chord a bar. The starter holds the pedal through everything, which blurs the chords. Pedal it so every note is under the pedal and the pedal changes with each chord.",
      "C、A 小調、F、G、C：每小節一個分解和弦。起始程式碼一路踩著踏板，和弦全混在一起。重新踩踏板，讓每個音都在踏板下，並隨每個和弦換踏板。",
    ],
    why: [
      "\"Change with the harmony\" is the first rule of pedalling: a new chord, a new pedal. Listen to the starter and your answer one after the other.",
      "「隨和聲換踏板」是踏板的第一條規則：新的和弦，新的踏板。先後聽聽起始程式碼和你的答案。",
    ],
    starter: `piano = tiny("C4 G c e AA E A c FF C F A GG D G B C G c2", name="Piano", inst="piano")
pedal(piano, "1-5")  # held all the way: the chords blur
score = piano
`,
    rules: [
      { id: "pedalChangesWithHarmony", part: 0 },
      { id: "pedalCovers", part: 0 },
    ],
  },
  {
    id: "flute-breathing",
    category: "technique",
    level: "L1",
    uses: ["tech-winds"],
    title: ["Flute breathing", "長笛換氣"],
    task: [
      "Ode to Joy for flute, all four phrases (each four bars). Mark a breath at the end of every phrase but the last (after notes 15, 30 and 47), so you never play more than 16 beats on one breath and never breathe in the middle of a phrase.",
      "長笛的〈快樂頌〉，完整四個樂句（每句四小節）。在除了最後一句之外的每句結尾標上換氣（第 15、30、47 個音之後），讓一口氣不超過 16 拍，也不在句中換氣。",
    ],
    why: [
      "A flutist needs more air than any other wind player, and a breath in the middle of a phrase breaks it in two. Planning breaths is part of learning a piece.",
      "長笛手比其他管樂手更耗氣，而在句中換氣會把樂句切成兩半。規劃換氣是學一首曲子的一部分。",
    ],
    starter: `flute = tiny("${ODE_FLUTE}", name="Flute", inst="flute")
breath(flute, 15)
score = flute
`,
    rules: [
      { id: "breathAtPhraseEnds", part: 0, ends: [15, 30, 47] },
      { id: "maxBeatsWithoutBreath", part: 0, beats: 16 },
    ],
  },
  {
    id: "finger-piano-scale",
    category: "technique",
    level: "L1",
    uses: ["tech-piano-fingers"],
    title: ["Finger a scale (piano)", "為音階標指法（鋼琴）"],
    task: [
      "C major over two octaves, right hand, going up: 1 2 3, thumb under, 1 2 3 4, thumb under, 1 2 3, thumb under, 1 2 3 4 5. Finger every note.",
      "右手上行兩個八度的 C 大調：1 2 3，拇指穿過，1 2 3 4，拇指穿過，1 2 3，拇指穿過，1 2 3 4 5。為每個音標指法。",
    ],
    why: [
      "The groups of three and four fingers line up with the black keys of most scales, which is why this fingering works for so many keys.",
      "三指和四指的分組和大多數音階的黑鍵位置吻合，所以這套指法適用於很多調。",
    ],
    starter: `right = tiny("c4 d e f g a b c' d' e' f' g' a' b' c''2", name="Piano", inst="piano")
fingering(right, "1 2 3")
score = right
`,
    rules: [
      { id: "fingered", part: 0 },
      { id: "thumbUnder", part: 0, at: [1, 4, 8, 11] },
    ],
  },
  {
    id: "finger-violin-scale",
    category: "technique",
    level: "L2",
    uses: ["tech-violin-fingers"],
    title: ["Finger a scale (violin, no open strings)", "為音階標指法（小提琴，不用空弦）"],
    task: [
      "G major from the open G up two octaves, in first position. The starter uses open strings (0); a warmer sound uses the 4th finger instead: replace each open string after the first note with a 4 on the string below.",
      "從空弦 G 上行兩個八度的 G 大調，第一把位。起始程式碼用了空弦（0）；用第 4 指代替會有更溫暖的聲音：把第一個音之後的每個空弦，換成低一條弦上的 4 指。",
    ],
    why: [
      "The 4th finger on a lower string plays the same note as the next open string, but it can use vibrato and blends with the notes around it. It is how violinists keep a scale even.",
      "低一條弦上的第 4 指和下一條空弦同音，但可以加揉音，也和前後的音更融合。小提琴家靠它讓音階聽起來均勻。",
    ],
    starter: `violin = tiny("G4 A B c d e f# g a b c' d' e' f'# g'2", name="Violin", inst="violin")
fingering(violin, "0 1 2 3 0 1 2 3 0 1 2 3 0 1 2")
score = violin
`,
    rules: [
      { id: "fingered", part: 0 },
      { id: "violinFirstPosition", part: 0, open: false },
    ],
  },
];
