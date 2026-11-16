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
  },
];
