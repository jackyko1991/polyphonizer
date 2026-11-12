/** How Learn says each rule: the original rules in strings.ts `ruleText`, the Track 0 and scale rules here. */
import type { AnyRule, Rule } from "../engine/checker.ts";
import { midiName } from "../problems.ts";
import { ruleText } from "../strings.ts";

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
