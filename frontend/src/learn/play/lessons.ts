/**
 * Learn to ▸ Play: keyboard lessons, one idea each. The music is ABC (engraved by Verovio, like the examples on
 * the pages); what you play on the virtual keyboard (mouse, computer keys, a MIDI keyboard) is graded by
 * matcher.ts. With the computer keys from middle C, the home row A S D F G H J K L ; ' is C D E F G A B C D E F
 * and W E T Y U O P are the black keys, so every lesson here fits under the hands without changing octave, except
 * where an octave change (X) is the lesson. Tunes are public domain.
 */
import type { L, Level } from "../../problems.ts";

export type PlayMode = "wait" | "time";

/** the instruments of Learn to Play, as the lesson list groups them (those with no lessons yet show "coming soon") */
export type Instrument = "keyboard" | "violin" | "flute" | "voice";
export const INSTRUMENTS: { id: Instrument; title: L; icon: string }[] = [
  { id: "keyboard", title: ["Keyboard", "鍵盤"], icon: "🎹" },
  { id: "violin", title: ["Violin", "小提琴"], icon: "🎻" },
  { id: "flute", title: ["Flute", "長笛"], icon: "🎵" },
  { id: "voice", title: ["Singing", "歌唱"], icon: "🎤" },
];

export interface PlayLesson {
  id: string;
  /** "P0", "P1a" … */
  n: string;
  instrument: Instrument;
  /** how hard, as in Learn to Code: L0 Beginner, L1 Warm-up, L2 Core, L3 Stretch */
  level: Level;
  title: L;
  /** what to do */
  task: L;
  /** how, and why */
  how: L;
  abc: string;
  /** the mode it opens in */
  mode: PlayMode;
  /** ms a note may be early or late and still be on time ("In time" mode) */
  tolerance: number;
  /** the computer keys this lesson uses, shown as a hint */
  keys: string;
  /** piano fingering, one string per staff: a finger per note or chord, bars as | (engine/fingering.ts) */
  fingers?: string[];
  /** both hands: the keyboard's two-row layout, the left hand's row (Z X C V B …) from C3, the right hand's
   * (Q W E R T …) from middle C; the music has a staff per hand, the left hand's in the bass clef */
  hands?: "two";
}

const head = (q: number, m = "4/4", k = "C") => `X:1\nM:${m}\nL:1/4\nQ:1/4=${q}\nK:${k}\n`;

export const PLAY_LESSONS: PlayLesson[] = [
  {
    id: "middle-c",
    instrument: "keyboard",
    level: "L0",
    n: "P0",
    title: ["Find middle C", "找到中央 C"],
    task: [
      "Play middle C four times, then hold it for a whole bar. On the computer keyboard, middle C is **A**.",
      "彈中央 C 四次，然後按住一整個小節。在電腦鍵盤上，中央 C 是 **A** 鍵。",
    ],
    how: [
      "Middle C sits in the middle of the piano, just left of the two black keys near the centre. Every lesson here starts from it: the home row of your computer keyboard, A S D F G H J K, plays C D E F G A B C.",
      "中央 C 在鋼琴的正中間，就在中間那組兩個黑鍵的左邊。這裡每一課都從它開始：電腦鍵盤的中排 A S D F G H J K，彈的是 C D E F G A B C。",
    ],
    abc: `${head(72)}C C C C | C4 |]`,
    mode: "wait",
    tolerance: 200,
    keys: "A",
    fingers: ["1 1 1 1 | 1"],
  },
  {
    id: "five-fingers",
    instrument: "keyboard",
    level: "L0",
    n: "P1a",
    title: ["Five fingers: C to G", "五指位置：C 到 G"],
    task: [
      "Play up from C to G and back down, one key for each finger: thumb on C, little finger on G. Computer keys **A S D F G**.",
      "從 C 往上彈到 G 再往下，一指一鍵：大拇指放 C，小指放 G。電腦鍵盤 **A S D F G**。",
    ],
    how: [
      "Keeping the hand still and letting each finger own one key is how pianists start: the notes come out evenly, and your eyes can stay on the music.",
      "手不動、每根手指負責一個鍵，是鋼琴入門的方法：音會彈得平均，眼睛也能一直看著樂譜。",
    ],
    abc: `${head(80)}C D E F | G4 | G F E D | C4 |]`,
    mode: "wait",
    tolerance: 200,
    keys: "A S D F G",
    fingers: ["1 2 3 4 | 5 | 5 4 3 2 | 1"],
  },
  {
    id: "mary",
    instrument: "keyboard",
    level: "L0",
    n: "P1b",
    title: ["Mary Had a Little Lamb", "瑪莉有隻小綿羊"],
    task: ["Your first tune, in five fingers: E D C D, E E E.", "你的第一首曲子，五指就夠：E D C D，E E E。"],
    how: [
      "Watch where the tune steps and where it repeats: most melodies move to the next key or stay, and that is what makes them easy to sing.",
      "留意旋律哪裡往旁邊走、哪裡重複：大多數旋律不是往隔壁的鍵走，就是停在原地，所以才容易唱。",
    ],
    abc: `${head(96)}E D C D | E E E2 | D D D2 | E G G2 | E D C D | E E E E | D D E D | C4 |]`,
    mode: "wait",
    tolerance: 180,
    keys: "A S D G",
    fingers: ["3 2 1 2 | 3 3 3 | 2 2 2 | 3 5 5 | 3 2 1 2 | 3 3 3 3 | 2 2 3 2 | 1"],
  },
  {
    id: "ode-opening",
    instrument: "keyboard",
    level: "L0",
    n: "P1c",
    title: ["Ode to Joy", "快樂頌"],
    task: [
      "Beethoven's tune, still in five fingers. The dotted note near the end is a little longer, the next one shorter.",
      "貝多芬的旋律，仍然在五指之內。結尾附近的附點音符長一點，下一個音短一點。",
    ],
    how: [
      "Try **Listen** first, then play along. Hearing the long–short rhythm before you play it is the quickest way to get it right.",
      "先按 **聆聽**，再跟著彈。先聽過長短節奏再彈，是最快彈對的方法。",
    ],
    abc: `${head(100)}E E F G | G F E D | C C D E | E3/2 D/2 D2 | E E F G | G F E D | C C D E | D3/2 C/2 C2 |]`,
    mode: "wait",
    tolerance: 180,
    keys: "A S D F G",
    fingers: ["3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3 2 2 | 3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2 1 1"],
  },
  {
    id: "in-time",
    instrument: "keyboard",
    level: "L1",
    n: "P2",
    title: ["Playing in time", "跟著拍子彈"],
    task: [
      "Now the music doesn't wait: after one bar of clicks, play in time. Quarter notes are one click, half notes two, a whole note four.",
      "現在音樂不會等你：先聽一小節的拍子，然後準時彈。四分音符一拍，二分音符兩拍，全音符四拍。",
    ],
    how: [
      "Count along: one, two, three, four. Each note is graded green when it starts on time, amber when a little early or late. Hold the long notes for their whole length, even though only the start is graded here.",
      "跟著數：一、二、三、四。準時開始的音是綠色，稍早或稍晚是琥珀色。長音要按滿整個時值，雖然這裡只評開頭。",
    ],
    abc: `${head(80)}C2 C2 | E E E2 | G G G G | c4 |]`,
    mode: "time",
    tolerance: 160,
    keys: "A D G K",
    fingers: ["1 1 | 3 3 3 | 5 5 5 5 | 5"],
  },
  {
    id: "eighths",
    instrument: "keyboard",
    level: "L1",
    n: "P2b",
    title: ["Eighth notes", "八分音符"],
    task: [
      "Two eighth notes fit in one beat. Play the up-and-down run in time.",
      "兩個八分音符佔一拍。準時彈出這段上行下行的音群。",
    ],
    how: [
      "Say \"one-and, two-and\": the eighths fall on the number and on \"and\". Keep the beat steady rather than fast.",
      "唸「一 嗒、二 嗒」：八分音符落在數字和「嗒」上。拍子要穩，不必快。",
    ],
    abc: `${head(72)}C/2 D/2 E/2 F/2 G2 | G/2 F/2 E/2 D/2 C2 | C/2 E/2 G/2 E/2 C/2 E/2 G/2 E/2 | C4 |]`,
    mode: "time",
    tolerance: 120,
    keys: "A S D F G",
    fingers: ["1 2 3 4 5 | 5 4 3 2 1 | 1 3 5 3 1 3 5 3 | 1"],
  },
  {
    id: "black-keys",
    instrument: "keyboard",
    level: "L1",
    n: "P3",
    title: ["Black keys: F♯", "黑鍵：F♯"],
    task: [
      "In G major every F is F sharp, the black key just right of F. On the computer keys F♯ is **T**.",
      "在 G 大調裡每個 F 都是升 F，也就是 F 右邊的那個黑鍵。電腦鍵盤上 F♯ 是 **T**。",
    ],
    how: [
      "The sharp in the key signature applies to every F in the piece. Black keys are in groups of two and three: F♯ is the first of the three.",
      "調號裡的升記號作用在曲中每一個 F。黑鍵分成兩個一組和三個一組：F♯ 是三個一組的第一個。",
    ],
    abc: `${head(84, "4/4", "G")}G A B c | d c B A | G F G A | G4 |]`,
    mode: "wait",
    tolerance: 180,
    keys: "G H J K L T",
    fingers: ["1 2 3 4 | 5 4 3 2 | 1 2 1 2 | 1"],
  },
  {
    id: "pentatonic",
    instrument: "keyboard",
    level: "L1",
    n: "P3b",
    title: ["A tune on the black keys only", "只用黑鍵的曲子"],
    task: [
      "The five black keys make a pentatonic scale: everything you play on them sounds good together. Computer keys **T Y U O P**.",
      "五個黑鍵組成五聲音階：只彈黑鍵，怎麼彈都好聽。電腦鍵盤 **T Y U O P**。",
    ],
    how: [
      "Many folk songs, from China to Scotland, use only these five notes. Afterwards, try making up your own tune on them.",
      "從中國到蘇格蘭，許多民歌只用這五個音。彈完之後，試著用它們編一段自己的旋律。",
    ],
    abc: `${head(88)}^F ^G ^A ^c | ^d ^c ^A ^G | ^F ^G ^A2 | ^F4 |]`,
    mode: "wait",
    tolerance: 180,
    keys: "T Y U O P",
    fingers: ["1 2 3 4 | 5 4 3 2 | 1 2 3 | 1"],
  },
  {
    id: "scale",
    instrument: "keyboard",
    level: "L2",
    n: "P4",
    title: ["The C major scale", "C 大調音階"],
    task: [
      "All eight notes from C up to the next C and back. Computer keys **A S D F G H J K**.",
      "從 C 到上面的 C 共八個音，上去再下來。電腦鍵盤 **A S D F G H J K**。",
    ],
    how: [
      "On a real piano the thumb passes under after E (going up) so five fingers can cover eight notes. Here, listen for the half steps between E–F and B–C: they are what make the scale major.",
      "在真的鋼琴上，往上彈到 E 之後大拇指要從下面穿過去，五根手指才能彈完八個音。這裡請聽 E–F 和 B–C 之間的半音：正是它們讓音階成為大調。",
    ],
    abc: `${head(84)}C D E F | G A B c | c B A G | F E D C |]`,
    mode: "time",
    tolerance: 140,
    keys: "A S D F G H J K",
    fingers: ["1 2 3 1 | 2 3 4 5 | 5 4 3 2 | 1 3 2 1"],
  },
  {
    id: "two-octaves",
    instrument: "keyboard",
    level: "L2",
    n: "P4b",
    title: ["Two octaves: change octave with X", "兩個八度：用 X 換八度"],
    task: [
      "Play C D E F G A B, press **X** to move up an octave, and go on to the top C. Press **Z** to come back.",
      "彈 C D E F G A B，按 **X** 升高一個八度，繼續彈到最高的 C。按 **Z** 回到原來的八度。",
    ],
    how: [
      "The computer keys cover a bit more than one octave. X and Z move the whole keyboard up and down, the way a pianist's hand moves along the piano.",
      "電腦鍵盤只涵蓋一個多八度。X 和 Z 把整個鍵盤往上、往下移，就像鋼琴家的手沿著琴鍵移動。",
    ],
    abc: `${head(84)}C D E F | G A B c | d e f g | a b c'2 |]`,
    mode: "wait",
    tolerance: 180,
    keys: "A–J, X, A–K",
    fingers: ["1 2 3 1 | 2 3 4 1 | 2 3 1 2 | 3 4 5"],
  },
  {
    id: "chords",
    instrument: "keyboard",
    level: "L2",
    n: "P5",
    title: ["Three chords: C, F and G", "三個和弦：C、F、G"],
    task: [
      "Press the three notes of each chord together: C E G (**A D G**), F A C (**F H K**), G B D (**G J L**).",
      "每個和弦的三個音一起按：C E G（**A D G**）、F A C（**F H K**）、G B D（**G J L**）。",
    ],
    how: [
      "These three chords can accompany thousands of songs. Each one skips every other key: play one, skip one, play one, skip one, play one.",
      "這三個和弦可以為成千上萬首歌伴奏。每個和弦都是隔一個鍵：彈一個、跳一個、彈一個、跳一個、彈一個。",
    ],
    abc: `${head(72)}[C2E2G2] [C2E2G2] | [F2A2c2] [F2A2c2] | [G2B2d2] [G2B2d2] | [C4E4G4] |]`,
    mode: "wait",
    tolerance: 180,
    keys: "A D G · F H K · G J L",
    fingers: ["135 135 | 135 135 | 135 135 | 135"],
  },
  {
    id: "melody-bass",
    instrument: "keyboard",
    level: "L2",
    n: "P6",
    title: ["Melody and bass", "旋律加低音"],
    task: [
      "Mary Had a Little Lamb an octave up (**K L ;** on the right) over a note held each bar (**A** or **G** on the left). Hold **Space** for the pedal if you like.",
      "高八度的〈瑪莉有隻小綿羊〉（右邊的 **K L ;**），下面每小節按住一個音（左邊的 **A** 或 **G**）。想要的話可以按住**空白鍵**當踏板。",
    ],
    how: [
      "Two hands, two jobs: the melody sings, the bass holds the harmony underneath. Play the bass note together with the first melody note of each bar.",
      "兩隻手、兩件事：旋律在上面唱，低音在下面撐住和聲。每小節的低音和該小節第一個旋律音一起彈。",
    ],
    abc: `${head(80)}V:1\ne d c d | e e e2 | d d d2 | e e e2 |]\nV:2\nC4 | C4 | G4 | C4 |]`,
    mode: "wait",
    tolerance: 180,
    keys: "K L ; · A G",
    fingers: ["3 2 1 2 | 3 3 3 | 2 2 2 | 3 3 3", "5 | 5 | 1 | 5"],
  },
  {
    id: "twinkle",
    instrument: "keyboard",
    level: "L3",
    n: "P7",
    title: ["Twinkle, Twinkle, the whole song", "小星星，全曲"],
    task: ["The whole tune, in time. Three phrases: up, then down twice, then the first again.", "全曲，跟著拍子。三個樂句：先往上，再往下兩次，最後回到第一句。"],
    how: [
      "Mozart wrote twelve variations on this French tune (\"Ah ! vous dirai-je, maman\"). Play it steadily before you play it fast.",
      "莫札特曾為這首法國曲子（〈媽媽，我要告訴你〉）寫了十二段變奏。先彈穩，再彈快。",
    ],
    abc: `${head(96)}C C G G | A A G2 | F F E E | D D C2 | G G F F | E E D2 | G G F F | E E D2 | C C G G | A A G2 | F F E E | D D C2 |]`,
    mode: "time",
    tolerance: 140,
    keys: "A S D F G H",
    fingers: ["1 1 4 4 | 5 5 4 | 4 4 3 3 | 2 2 1 | 5 5 4 4 | 3 3 2 | 5 5 4 4 | 3 3 2 | 1 1 4 4 | 5 5 4 | 4 4 3 3 | 2 2 1"],
  },
  {
    id: "ode-whole",
    instrument: "keyboard",
    level: "L3",
    n: "P8",
    title: ["Ode to Joy, in time", "快樂頌，跟著拍子"],
    task: ["Ode to Joy again, now with the beat: the dotted rhythm must land in time.", "再彈一次快樂頌，這次要跟著拍子：附點節奏要準時落下。"],
    how: [
      "If it is too fast, lower the tempo first (the ♩ field), then raise it as it gets easy. That is how musicians practise.",
      "如果太快，先把速度調慢（♩ 欄位），熟了再加快。音樂家就是這樣練習的。",
    ],
    abc: `${head(96)}E E F G | G F E D | C C D E | E3/2 D/2 D2 | E E F G | G F E D | C C D E | D3/2 C/2 C2 |]`,
    mode: "time",
    tolerance: 130,
    keys: "A S D F G",
    fingers: ["3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3 2 2 | 3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2 1 1"],
  },
  // ---- both hands: the two-row layout, the left hand on the bottom row from C3, the right on the top row from C4
  {
    id: "hands-parallel",
    instrument: "keyboard",
    level: "L1",
    n: "H1",
    hands: "two",
    title: ["Hands together: the same five notes", "雙手一起：同樣的五個音"],
    task: [
      "Both hands play C D E F G and back, an octave apart. Left hand on **Z X C V B**, right hand on **Q W E R T**.",
      "雙手同時彈 C D E F G 再回來，相差一個八度。左手在 **Z X C V B**，右手在 **Q W E R T**。",
    ],
    how: [
      "The hands are mirror images: the right thumb starts on C, the left little finger does. Same notes, different fingers: say the right hand's numbers aloud the first time, the left's the second.",
      "兩手是鏡像：右手由大拇指從 C 開始，左手由小指從 C 開始。同樣的音、不同的手指：第一次念出右手的指法，第二次念左手的。",
    ],
    abc: `${head(72)}V:1\nC D E F | G4 | G F E D | C4 |]\nV:2 clef=bass\nC, D, E, F, | G,4 | G, F, E, D, | C,4 |]`,
    mode: "wait",
    tolerance: 200,
    keys: "Z X C V B + Q W E R T",
    fingers: ["1 2 3 4 | 5 | 5 4 3 2 | 1", "5 4 3 2 | 1 | 1 2 3 4 | 5"],
  },
  {
    id: "hands-contrary",
    instrument: "keyboard",
    level: "L1",
    n: "H2",
    hands: "two",
    title: ["Contrary motion", "反向進行"],
    task: [
      "The hands move apart and come back: the right hand climbs C to G while the left hand falls G to C.",
      "雙手向外分開再回來：右手從 C 往上到 G，同時左手從 G 往下到 C。",
    ],
    how: [
      "Here both hands use the same fingers at the same time (thumbs, then 2, 3 …): easier than it looks. Contrary motion is how two-part music keeps its voices apart.",
      "這裡兩手同時用一樣的手指（大拇指，然後 2、3 …）：比看起來容易。反向進行讓兩個聲部保持分開，是二聲部音樂的基本手法。",
    ],
    abc: `${head(72)}V:1\nC D E F | G4 | G F E D | C4 |]\nV:2 clef=bass\nG, F, E, D, | C,4 | C, D, E, F, | G,4 |]`,
    mode: "wait",
    tolerance: 200,
    keys: "B V C X Z + Q W E R T",
    fingers: ["1 2 3 4 | 5 | 5 4 3 2 | 1", "1 2 3 4 | 5 | 5 4 3 2 | 1"],
  },
  {
    id: "ode-hands",
    instrument: "keyboard",
    level: "L2",
    n: "H3",
    hands: "two",
    title: ["Ode to Joy with a bass", "快樂頌加上低音"],
    task: [
      "The tune in the right hand; under it the left hand holds C or G, one note a bar (two in bars 4 and 8).",
      "右手彈旋律；左手在下面按住 C 或 G，每小節一個音（第 4、8 小節兩個）。",
    ],
    how: [
      "The bass is the harmony: C under the bars that rest on C, G under those that lean towards it. Learn the left hand alone first (it is only two keys, **Z** and **B**), then put the hands together slowly.",
      "低音就是和聲：落在 C 的小節下面放 C，傾向 C 的小節下面放 G。先單獨練左手（只有 **Z** 和 **B** 兩個鍵），再慢慢雙手合起來。",
    ],
    abc: `${head(92)}V:1\nE E F G | G F E D | C C D E | E3/2 D/2 D2 | E E F G | G F E D | C C D E | D3/2 C/2 C2 |]\nV:2 clef=bass\nC,4 | G,4 | C,4 | G,2 G,2 | C,4 | G,4 | C,4 | G,2 C,2 |]`,
    mode: "wait",
    tolerance: 160,
    keys: "Z B + Q W E R T",
    fingers: ["3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3 2 2 | 3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2 1 1", "5 | 1 | 5 | 1 1 | 5 | 1 | 5 | 1 5"],
  },
  {
    id: "twinkle-hands",
    instrument: "keyboard",
    level: "L3",
    n: "H4",
    hands: "two",
    title: ["Twinkle, Twinkle with a bass", "小星星加上低音"],
    task: [
      "The whole tune in the right hand, in time; the left hand changes every half bar between C, F and G.",
      "右手彈全曲並跟著拍子；左手每半小節在 C、F、G 之間換音。",
    ],
    how: [
      "The left hand stays in one place (little finger on C, thumb on G) and plays the three chords' roots, the I, IV and V every simple tune is built on.",
      "左手停在同一個位置（小指在 C，大拇指在 G），彈三個和弦的根音：每首簡單曲子都建立在這三個和弦（I、IV、V）上。",
    ],
    abc: `${head(88)}V:1\nC C G G | A A G2 | F F E E | D D C2 | G G F F | E E D2 | G G F F | E E D2 | C C G G | A A G2 | F F E E | D D C2 |]\nV:2 clef=bass\nC,4 | F,2 C,2 | F,2 C,2 | G,2 C,2 | C,2 F,2 | C,2 G,2 | C,2 F,2 | C,2 G,2 | C,4 | F,2 C,2 | F,2 C,2 | G,2 C,2 |]`,
    mode: "time",
    tolerance: 140,
    keys: "Z V B + Q W E R T Y",
    fingers: [
      "1 1 4 4 | 5 5 4 | 4 4 3 3 | 2 2 1 | 5 5 4 4 | 3 3 2 | 5 5 4 4 | 3 3 2 | 1 1 4 4 | 5 5 4 | 4 4 3 3 | 2 2 1",
      "5 | 2 5 | 2 5 | 1 5 | 5 2 | 5 1 | 5 2 | 5 1 | 5 | 2 5 | 2 5 | 1 5",
    ],
  },
];
