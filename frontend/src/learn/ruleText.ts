/** How Learn says each rule: the original rules in strings.ts `ruleText`, the Track 0 and scale rules here. */
import type { AnyRule, Rule } from "../engine/checker.ts";
import { midiName } from "../problems.ts";
import { apart, ruleText } from "../strings.ts";

const STEP: Record<number, [string, string]> = { 1: ["H", "半"], 2: ["W", "全"], 3: ["W+H", "增二"] };

/** "W W H W W W H" for one octave's steps; a run up and down is shown as its two halves */
function stepPattern(semis: number[], lang: 0 | 1): string {
  const name = (s: number) => STEP[Math.abs(s)]?.[lang] ?? `${Math.abs(s)}`;
  const up = semis.filter((s) => s > 0);
  const down = semis.filter((s) => s < 0);
  const octave = (xs: number[]) => {
    // the shortest repeating unit of 12 semitones
    let sum = 0;
    let n = 0;
    while (n < xs.length && sum < 12) sum += Math.abs(xs[n++]);
    const unit = xs.slice(0, n);
    const times = sum === 12 && xs.length % n === 0 && xs.every((x, i) => x === unit[i % n]) ? xs.length / n : 1;
    return { text: (times > 1 ? unit : xs).map(name).join(" "), times };
  };
  const u = octave(up);
  const d = octave([...down].reverse().map((s) => -s));
  const times = (t: number) => (t > 1 ? (lang ? ` ×${t}` : ` ×${t}`) : "");
  if (!down.length) return u.text + times(u.times);
  return lang
    ? `上行 ${u.text}${times(u.times)}，下行反過來走 ${d.text}${times(d.times)}`
    : `up ${u.text}${times(u.times)}, then back down through ${d.text}${times(d.times)}`;
}

const MARK_NAMES: Record<string, [string, string]> = {
  staccato: ["Staccato", "斷奏"],
  spiccato: ["Spiccato", "跳弓"],
  pizz: ["Pizzicato", "撥奏"],
  harmonic: ["Harmonics", "泛音"],
  trill: ["Trills", "顫音"],
  breath: ["Breath marks", "換氣記號"],
  tenuto: ["Tenuto", "持音"],
  accent: ["Accents", "重音"],
};

const NOTE = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const QUALITY: Record<string, string> = { "0,4,7": "", "0,3,7": "m", "0,4,7,10": "7", "0,3,6": "dim" };

/** a chord's symbol from its pitch classes, root first: [7, 11, 2] → "G", [9, 0, 4] → "Am"; otherwise its notes */
function chordName(pcs: number[], lang: 0 | 1): string {
  const shape = [...new Set(pcs.map((x) => (x - pcs[0] + 12) % 12))].sort((a, b) => a - b).join(",");
  if (shape in QUALITY) return NOTE[pcs[0]] + QUALITY[shape];
  return pcs.map((x) => NOTE[x]).join(lang ? "、" : ", ");
}
/** "C | F | G | C", or "G throughout" */
function chordList(chords: number[][], lang: 0 | 1): string {
  const names = chords.map((c) => chordName(c, lang));
  if (names.every((n) => n === names[0])) return lang ? `全曲都是 ${names[0]}` : `${names[0]} throughout`;
  return names.join(" | ");
}

export function ruleLabel(rule: AnyRule, parts: string[], lang: 0 | 1): string {
  const p = (i: number) => parts[i] ?? (lang ? `第 ${i + 1} 聲部` : `part ${i + 1}`);
  const pick = (en: string, zh: string) => (lang ? zh : en);
  switch (rule.id) {
    case "rhythm":
      return pick(`${p(rule.part)} has the right rhythm (every note and rest the right length)`, `${p(rule.part)} 的節奏正確（每個音和休止符的長度都對）`);
    case "barsFull":
      return rule.pickup
        ? pick("Every bar adds up to the time signature (a pickup bar may be shorter)", "每個小節加起來都等於拍號（弱起小節可以較短）")
        : pick("Every bar adds up to the time signature", "每個小節加起來都等於拍號");
    case "timeSig":
      return pick(`The time signature is ${rule.time}`, `拍號是 ${rule.time}`);
    case "keySig":
      return pick(`The key signature is ${rule.key}`, `調號是 ${rule.key.replace(" major", " 大調").replace(" minor", " 小調")}`);
    case "tempo":
      return pick(`The tempo is ${rule.bpm} beats a minute`, `速度是每分鐘 ${rule.bpm} 拍`);
    case "partName":
      return pick(`Part ${rule.part + 1} is named "${rule.name}"`, `第 ${rule.part + 1} 聲部名為「${rule.name}」`);
    case "instrument":
      return pick(`${p(rule.part)} plays on the right instrument`, `${p(rule.part)} 用的是正確的樂器`);
    case "highest":
      return pick(`${p(rule.part)}'s highest note is ${midiName(rule.midi)}`, `${p(rule.part)} 的最高音是 ${midiName(rule.midi)}`);
    case "lowest":
      return pick(`${p(rule.part)}'s lowest note is ${midiName(rule.midi)}`, `${p(rule.part)} 的最低音是 ${midiName(rule.midi)}`);
    case "bowAlternates":
      return pick(
        `${p(rule.part)}: every new bow is marked, and down-bows and up-bows take turns`,
        `${p(rule.part)}：每個新的一弓都有標記，下弓與上弓輪流`,
      );
    case "phraseStartsDown":
      return pick(
        `Each phrase starts with a down-bow (note${rule.starts.length > 1 ? "s" : ""} ${rule.starts.join(", ")})`,
        `每個樂句以下弓開始（第 ${rule.starts.join("、")} 個音）`,
      );
    case "slurOneBow":
      return pick(
        `Slurred in one bow: notes ${rule.slurs.map(([a, b]) => `${a}–${b}`).join(", ")}`,
        `以圓滑線一弓奏完：第 ${rule.slurs.map(([a, b]) => `${a}–${b}`).join("、")} 個音`,
      );
    case "marked": {
      const name = MARK_NAMES[rule.mark] ?? [rule.mark, rule.mark];
      return pick(
        `${name[0]} on exactly note${rule.notes.length > 1 ? "s" : ""} ${rule.notes.join(", ")}`,
        `${name[1]}正好在第 ${rule.notes.join("、")} 個音`,
      );
    }
    case "pedalChangesWithHarmony":
      return pick("The pedal changes with the harmony (never held across a chord change)", "踏板隨和聲更換（換和弦時不能一直踩著）");
    case "pedalCovers":
      return pick("Every note sounds under the pedal", "每個音都在踏板下");
    case "breathAtPhraseEnds":
      return pick(
        `Breaths at the ends of phrases (after note${rule.ends.length > 1 ? "s" : ""} ${rule.ends.join(", ")}), not in the middle`,
        `在樂句結尾換氣（第 ${rule.ends.join("、")} 個音之後），不在句中`,
      );
    case "maxBeatsWithoutBreath":
      return pick(`No more than ${rule.beats} beats without a breath`, `不超過 ${rule.beats} 拍不換氣`);
    case "fingered":
      return pick(`Every note of ${p(rule.part)} has a fingering`, `${p(rule.part)} 的每個音都有指法`);
    case "thumbUnder":
      return pick(
        `The thumb (1) passes under on notes ${rule.at.join(", ")}; the other fingers go in order`,
        `拇指（1）在第 ${rule.at.join("、")} 個音穿指；其他手指依序`,
      );
    case "violinFirstPosition":
      return rule.open === false
        ? pick("Every fingering fits first position, with the 4th finger instead of open strings", "每個指法都在第一把位，以第 4 指代替空弦")
        : pick("Every fingering fits first position (0 open, 1–4 fingers)", "每個指法都在第一把位（0 空弦，1–4 手指）");
    case "lyrics":
      return pick(`The words are sung as: ${rule.syllables.join(" ")}`, `歌詞唱成：${rule.syllables.join(" ")}`);
    case "sameShape":
      return pick(`${p(rule.part)} keeps every interval of the melody (in any key)`, `${p(rule.part)} 保留旋律的每個音程（哪個調都可以）`);
    case "chordTones": {
      const list = chordList(rule.chords, lang);
      const same = rule.chords.every((c) => c.join() === rule.chords[0].join());
      if (rule.root && same && rule.chords[0].length < 3) {
        const notes = rule.chords[0].map((x) => NOTE[x]);
        return pick(
          `${p(rule.part)} plays only ${notes.join(" and ")}, with ${notes[0]} at the bottom of every bar`,
          `${p(rule.part)} 只用 ${notes.join(" 和 ")}，每小節最低音是 ${notes[0]}`,
        );
      }
      if (rule.root)
        return pick(
          `Each bar of ${p(rule.part)} has the chord's root at the bottom, and only chord notes: ${list}`,
          `${p(rule.part)} 每小節的最低音是和弦根音，且只用和弦音：${list}`,
        );
      if (rule.all)
        return pick(
          `Each bar of ${p(rule.part)} plays every note of its chord, and nothing else: ${list}`,
          `${p(rule.part)} 每小節彈出和弦的每個音，沒有別的音：${list}`,
        );
      return pick(`Each bar of ${p(rule.part)} uses only its chord's notes: ${list}`, `${p(rule.part)} 每小節只用該和弦的音：${list}`);
    }
    case "fullChords":
      return pick(
        `Wherever a note starts, the chord is complete, with no other notes: ${chordList(rule.chords, 0)}`,
        `每次有音響起時，和弦都完整、沒有多餘的音：${chordList(rule.chords, 1)}`,
      );
    case "alberti":
      return pick(
        `${p(rule.part)} is an Alberti bass: eighth notes in fours, low–high–middle–high`,
        `${p(rule.part)} 是阿爾貝提低音：八分音符四個一組，低、高、中、高`,
      );
    case "contraryMostly":
      return pick(
        `Mostly contrary motion: when ${p(rule.upper)} and ${p(rule.lower)} both move, at least half the time in opposite directions`,
        `以反向進行為主：${p(rule.upper)} 和 ${p(rule.lower)} 都移動時，至少一半是反方向`,
      );
    case "noParallelsAll":
      return pick("No parallel fifths or octaves between any two parts", "任兩個聲部之間都沒有平行五度或八度");
    case "spacing":
      return pick(
        `The parts don't cross, and neighbouring parts stay close (the upper ones within ${apart(rule.maxApart[0], 0)})`,
        `聲部不交叉，相鄰聲部不離太遠（上方聲部相距不超過${apart(rule.maxApart[0], 1)}）`,
      );
    case "steps":
      if (rule.semitones.every((s) => s === 1 || s === 2)) return ruleText(rule, parts, lang);
      return pick(
        `${p(rule.part)} moves by the scale's steps, none skipped or repeated: ${stepPattern(rule.semitones, 0)}`,
        `${p(rule.part)} 依音階步距移動，沒有漏掉或重複的音：${stepPattern(rule.semitones, 1)}`,
      );
    default:
      return ruleText(rule as Rule, parts, lang);
  }
}
