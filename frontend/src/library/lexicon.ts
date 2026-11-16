/**
 * The Library's words: instruments and their groups, voices, collections' names, composers' names in Chinese, eras,
 * ensembles, and how text is folded for search. Shared by the Library page and the catalogue database build
 * (scripts/library-db.ts), so both name things the same way.
 */
import type { L } from "../problems.ts";

/** the catalogue's instruments, in menu order, with their names (singular, plural) */
export const INSTRUMENTS: Record<string, { en: [string, string]; zh: string; group: L }> = {
  soprano: { en: ["soprano", "sopranos"], zh: "女高音", group: ["Voices", "人聲"] },
  alto: { en: ["alto", "altos"], zh: "女低音", group: ["Voices", "人聲"] },
  tenor: { en: ["tenor", "tenors"], zh: "男高音", group: ["Voices", "人聲"] },
  bass: { en: ["bass", "basses"], zh: "男低音", group: ["Voices", "人聲"] },
  voice: { en: ["voice", "voices"], zh: "人聲", group: ["Voices", "人聲"] },
  violin: { en: ["violin", "violins"], zh: "小提琴", group: ["Strings", "弦樂"] },
  viola: { en: ["viola", "violas"], zh: "中提琴", group: ["Strings", "弦樂"] },
  cello: { en: ["cello", "cellos"], zh: "大提琴", group: ["Strings", "弦樂"] },
  "double bass": { en: ["double bass", "double basses"], zh: "低音提琴", group: ["Strings", "弦樂"] },
  flute: { en: ["flute", "flutes"], zh: "長笛", group: ["Winds and brass", "管樂"] },
  oboe: { en: ["oboe", "oboes"], zh: "雙簧管", group: ["Winds and brass", "管樂"] },
  clarinet: { en: ["clarinet", "clarinets"], zh: "單簧管", group: ["Winds and brass", "管樂"] },
  bassoon: { en: ["bassoon", "bassoons"], zh: "低音管", group: ["Winds and brass", "管樂"] },
  horn: { en: ["horn", "horns"], zh: "法國號", group: ["Winds and brass", "管樂"] },
  trumpet: { en: ["trumpet", "trumpets"], zh: "小號", group: ["Winds and brass", "管樂"] },
  trombone: { en: ["trombone", "trombones"], zh: "長號", group: ["Winds and brass", "管樂"] },
  piano: { en: ["piano", "piano"], zh: "鋼琴", group: ["Keyboards, harp, guitar", "鍵盤、豎琴、吉他"] },
  harpsichord: { en: ["harpsichord", "harpsichord"], zh: "大鍵琴", group: ["Keyboards, harp, guitar", "鍵盤、豎琴、吉他"] },
  organ: { en: ["organ", "organ"], zh: "管風琴", group: ["Keyboards, harp, guitar", "鍵盤、豎琴、吉他"] },
  guitar: { en: ["guitar or lute", "guitars or lutes"], zh: "吉他／魯特琴", group: ["Keyboards, harp, guitar", "鍵盤、豎琴、吉他"] },
  harp: { en: ["harp", "harps"], zh: "豎琴", group: ["Keyboards, harp, guitar", "鍵盤、豎琴、吉他"] },
  melody: { en: ["melody (instrument not given)", "melodies"], zh: "旋律（未註明樂器）", group: ["Other", "其他"] },
  other: { en: ["other", "others"], zh: "其他", group: ["Other", "其他"] },
};
export const VOICES = new Set(["soprano", "alto", "tenor", "bass", "voice"]);
/** keyboards are one instrument however many staves they have */
export const ONE_PLAYER = new Set(["piano", "harpsichord", "organ", "harp"]);

/** "2 violins, viola, cello" / "小提琴 ×2、中提琴、大提琴" */
export function instrumentSummary(list: string[], zh: boolean): string {
  const n = new Map<string, number>();
  for (const i of list) n.set(i, (n.get(i) ?? 0) + 1);
  return [...n.entries()]
    .map(([i, k]) => {
      const info = INSTRUMENTS[i] ?? INSTRUMENTS.other;
      const many = k > 1 && !ONE_PLAYER.has(i) && i !== "melody";
      return zh ? `${info.zh}${many ? ` ×${k}` : ""}` : many ? `${k} ${info.en[1]}` : info.en[0];
    })
    .join(zh ? "、" : ", ");
}
/** a work has the instrument (any voice for "voice") */
export const has = (list: string[], inst: string) => (inst === "voice" ? list.some((i) => VOICES.has(i)) : list.includes(inst));

/** the collections' names; others show their folder name */
export const COLLECTIONS: Record<string, L> = {
  bach: ["Bach chorales and more", "巴赫聖詠曲等"],
  beethoven: ["Beethoven string quartets", "貝多芬弦樂四重奏"],
  mozart: ["Mozart quartets and sonata", "莫札特四重奏與奏鳴曲"],
  haydn: ["Haydn quartets", "海頓四重奏"],
  palestrina: ["Palestrina masses", "帕勒斯特里納彌撒曲"],
  monteverdi: ["Monteverdi madrigals", "蒙台威爾第牧歌"],
  josquin: ["Josquin des Prez", "若斯坎・德普雷"],
  trecento: ["Trecento (14th-century Italy)", "十四世紀義大利音樂"],
  essenFolksong: ["Essen folksong collection", "埃森民歌集"],
  oneills1850: ["O'Neill's Music of Ireland (1850)", "歐尼爾愛爾蘭音樂集（1850）"],
  ryansMammoth: ["Ryan's Mammoth Collection", "萊恩大全集"],
  airdsAirs: ["Aird's Airs", "艾爾德曲調集"],
  miscFolk: ["Folk songs", "民歌"],
  leadSheet: ["Lead sheets", "旋律與和弦譜"],
  demos: ["music21 demos", "music21 示範"],
  theoryExercises: ["Theory exercises", "樂理練習"],
};

/** composers' names in Traditional Chinese, for display and search */
export const COMPOSER_ZH: Record<string, string> = {
  "Johann Sebastian Bach": "巴赫",
  "Ludwig van Beethoven": "貝多芬",
  "Wolfgang Amadeus Mozart": "莫札特",
  "Joseph Haydn": "海頓",
  "Giovanni Pierluigi da Palestrina": "帕勒斯特里納",
  "Claudio Monteverdi": "蒙台威爾第",
  "Josquin des Prez": "若斯坎・德普雷",
  "Robert Schumann": "羅伯特・舒曼",
  "Clara Schumann": "克拉拉・舒曼",
  "Arnold Schoenberg": "荀白克",
  "Amy Beach": "艾美・比奇",
  "Frédéric Chopin": "蕭邦",
  "Johannes Ciconia": "奇科尼亞",
  "Arcangelo Corelli": "柯雷利",
  "C. P. E. Bach": "C. P. E. 巴赫",
  "George Frideric Handel": "韓德爾",
  "Scott Joplin": "喬普林",
  "Giuseppe Verdi": "威爾第",
  "Franz Schubert": "舒伯特",
  "Carl Maria von Weber": "韋伯",
  "Francesco Landini": "蘭迪尼",
  "Philippe de Vitry": "維特里",
  "Turlough O'Carolan": "歐卡羅蘭",
  "Irving Berlin": "歐文・柏林",
  "Stephen Foster": "史蒂芬・佛斯特",
  "Johannes Brahms": "布拉姆斯",
  "Felix Mendelssohn": "孟德爾頌",
  "Fanny Hensel": "芬妮・亨塞爾",
  "Hugo Wolf": "沃爾夫",
  "Gustav Mahler": "馬勒",
  "Richard Strauss": "理查・史特勞斯",
  "Richard Wagner": "華格納",
  "Franz Liszt": "李斯特",
  "Claude Debussy": "德布西",
  "Maurice Ravel": "拉威爾",
  "Gabriel Fauré": "佛瑞",
  "Erik Satie": "薩替",
  "Georges Bizet": "比才",
  "Charles Gounod": "古諾",
  "Jules Massenet": "馬斯奈",
  "Hector Berlioz": "白遼士",
  "César Franck": "法朗克",
  "Ernest Chausson": "蕭頌",
  "Cécile Chaminade": "夏米納德",
  "Lili Boulanger": "莉莉・布朗傑",
  "Gioachino Rossini": "羅西尼",
  "Ruggero Leoncavallo": "雷昂卡發洛",
  "Antonín Dvořák": "德弗札克",
  "Bedřich Smetana": "史麥塔納",
  "Leoš Janáček": "楊納傑克",
  "Pyotr Ilyich Tchaikovsky": "柴可夫斯基",
  "Alexander Borodin": "鮑羅定",
  "Mikhail Glinka": "葛令卡",
  "Alexander Glazunov": "葛拉祖諾夫",
  "Edvard Grieg": "葛利格",
  "Carl Nielsen": "尼爾森",
  "Edward Elgar": "艾爾加",
  "Frederick Delius": "戴流士",
  "Arthur Sullivan": "蘇利文",
  "Béla Bartók": "巴爾托克",
  "Alban Berg": "貝爾格",
  "Anton Webern": "魏本",
  "Charles Ives": "艾伍士",
  "Max Reger": "雷格",
  "Ferruccio Busoni": "布梭尼",
  "Luigi Boccherini": "鮑凱里尼",
  "Luigi Cherubini": "凱魯畢尼",
  "Louis Spohr": "史博",
  "Henri Vieuxtemps": "魏奧當",
  "Pauline Viardot": "寶琳・維亞多",
  Traditional: "傳統民謠",
  Anonymous: "佚名",
  "music21 examples": "music21 範例",
};

export const ERAS: Record<string, L> = {
  Medieval: ["Medieval", "中世紀"],
  Renaissance: ["Renaissance", "文藝復興"],
  Baroque: ["Baroque", "巴洛克"],
  Classical: ["Classical", "古典"],
  Romantic: ["Romantic", "浪漫"],
  "20th century": ["20th century", "二十世紀"],
  Popular: ["Popular and ragtime", "流行與散拍"],
  Traditional: ["Traditional (folk)", "傳統民謠"],
  Other: ["Other", "其他"],
};
export const ERA_ORDER = Object.keys(ERAS);

/** ensemble by number of parts */
export const ensembleOf = (parts: number) => (parts <= 0 ? "" : parts <= 1 ? "solo" : parts === 2 ? "duo" : parts === 3 ? "trio" : parts === 4 ? "quartet" : "more");
export const ENSEMBLES: Record<string, L> = {
  solo: ["One part (melody, solo)", "單一聲部（旋律、獨奏）"],
  duo: ["Two parts", "兩個聲部"],
  trio: ["Three parts", "三個聲部"],
  quartet: ["Four parts (quartet, chorale)", "四個聲部（四重奏、聖詠）"],
  more: ["Five or more parts", "五個以上聲部"],
};

/** composers with a few works here but many in the world: say so, and where more will come from */
export const FAMOUS = new Set(["Wolfgang Amadeus Mozart", "Ludwig van Beethoven", "Joseph Haydn", "Frédéric Chopin", "Franz Schubert", "Robert Schumann", "George Frideric Handel"]);

export const PAGE = 100;
export const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export const keyText = (k: number | null) => (k === null ? "" : k === 0 ? "♮" : k > 0 ? `${k}♯` : `${-k}♭`);
