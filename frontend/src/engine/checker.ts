/**
 * The grader: rules a score must pass, like Tensorizer's tests. A problem lists its rules; each rule looks at the
 * notes the engine returned and says pass or fail, with the bars where it failed. "error" rules decide the green
 * tick; "advice" rules are style hints (Fux would frown, but the exercise still counts).
 */
import type { NoteEvent, ScoreData } from "./types.ts";

export type Severity = "error" | "advice";
export interface RuleResult {
  id: string;
  ok: boolean;
  severity: Severity;
  /** bar numbers where it failed */
  bars: number[];
  /** short facts for the message, e.g. "found 7 notes" */
  detail?: string;
}

/** A sounding note: ties joined, rests dropped, chords reduced to their top note. */
export interface Sound {
  midi: number;
  offset: number;
  dur: number;
  measure: number;
}

export function sounds(notes: NoteEvent[], part: number): Sound[] {
  const out: Sound[] = [];
  for (const n of notes) {
    if (n.part !== part || !n.midi.length) continue;
    const midi = Math.max(...n.midi);
    const last = out[out.length - 1];
    if ((n.tie === "stop" || n.tie === "continue") && last && last.midi === midi) {
      last.dur += n.dur;
      continue;
    }
    out.push({ midi, offset: n.offset, dur: n.dur, measure: n.measure });
  }
  return out;
}

const PERFECT = new Set([0, 7]);
const CONSONANT = new Set([0, 3, 4, 7, 8, 9]);
/** melodic leaps first species forbids: tritone, minor and major seventh, beyond an octave */
const BAD_LEAP = (semis: number) => semis === 6 || semis === 10 || semis === 11 || semis > 12;

export type Rule =
  | { id: "parts"; count: number }
  | { id: "count"; part: number; count: number }
  | { id: "pitches"; part: number; midi: number[] } // exactly these pitches, in order
  | { id: "starts"; part: number; midi: number }
  | { id: "ends"; part: number; midi: number }
  | { id: "steps"; part: number; semitones: number[] } // successive intervals
  | { id: "transposed"; part: number; from: number[]; by: number }
  | { id: "sameRhythm"; part: number; durs: number[] }
  | { id: "range"; part: number; low: number; high: number }
  | { id: "scale"; part: number; pcs: number[]; allowLast2?: number[] } // pitch classes allowed (cadence extras)
  | { id: "noteAgainstNote"; a: number; b: number }
  | { id: "consonant"; upper: number; lower: number }
  | { id: "startPerfect"; upper: number; lower: number; above: boolean }
  | { id: "endOctave"; upper: number; lower: number }
  | { id: "cadenceStep"; part: number }
  | { id: "noParallels"; upper: number; lower: number }
  | { id: "noDirect"; upper: number; lower: number }
  | { id: "noCrossing"; upper: number; lower: number; maxApart: number }
  | { id: "goodLeaps"; part: number }
  | { id: "unisonEnds"; upper: number; lower: number }
  | { id: "fewRepeats"; part: number }
  | { id: "imperfectMostly"; upper: number; lower: number };

/**
 * Rules added for Track 0 (syntax lessons) and the longer scales. Kept apart from `Rule` so that code switching over
 * the original rules (strings.ts `ruleText`) stays exhaustive; `AnyRule` is what problems list.
 */
export type LessonRule =
  /** exact durations in quarter notes, ties joined; a rest is a negative length (r4 = -1); trailing rests ignored */
  | { id: "rhythm"; part: number; durs: number[] }
  /** every bar's notes and rests add up to its time signature (the first may be shorter if `pickup`) */
  | { id: "barsFull"; part?: number; pickup?: boolean }
  | { id: "timeSig"; time: string }
  | { id: "keySig"; key: string }
  | { id: "tempo"; bpm: number }
  | { id: "partName"; part: number; name: string }
  /** General MIDI program of the part (40 violin, 42 cello, 73 flute …) */
  | { id: "instrument"; part: number; program: number }
  | { id: "highest"; part: number; midi: number }
  | { id: "lowest"; part: number; midi: number }
  // playing techniques (markings.py); notes are numbered from 1 within the part, rests not counted
  /** every note that starts a bow has a bow mark, and the bows alternate (a rest allows a retake) */
  | { id: "bowAlternates"; part: number }
  /** these notes (phrase starts) are down-bow */
  | { id: "phraseStartsDown"; part: number; starts: number[] }
  /** these spans are slurred, each in one bow: no bow mark inside a slur */
  | { id: "slurOneBow"; part: number; slurs: [number, number][] }
  /** exactly these notes carry the mark (staccato, pizz, harmonic, trill …) */
  | { id: "marked"; part: number; mark: string; notes: number[] }
  /** no pedal is held across a change of harmony (each bar is one harmony: the pitch classes it plays) */
  | { id: "pedalChangesWithHarmony"; part: number }
  /** every note sounds under the pedal */
  | { id: "pedalCovers"; part: number }
  /** a breath after the last note of each phrase but the last, and nowhere else */
  | { id: "breathAtPhraseEnds"; part: number; ends: number[] }
  /** never more than this many beats (quarter notes) between breaths */
  | { id: "maxBeatsWithoutBreath"; part: number; beats: number }
  /** every note has a fingering */
  | { id: "fingered"; part: number }
  /** piano: the thumb (1) on exactly these notes, and the other fingers in order between them */
  | { id: "thumbUnder"; part: number; at: number[] }
  /** violin: each finger fits first position on some string (G D A E); open = false allows 0 only on the low G */
  | { id: "violinFirstPosition"; part: number; open?: boolean }
  /** the sung syllables, in order (one per note, hyphens dropped) */
  | { id: "lyrics"; part: number; syllables: string[] };
export type AnyRule = Rule | LessonRule;

/**
 * The successive intervals of a scale run over `octaves` octaves, up and back down: `up` is one octave's steps going
 * up (major: [2, 2, 1, 2, 2, 2, 1]); `down` is the descending form written upwards (melodic minor descends as the
 * natural minor), default the same as `up`. The top note is played once.
 */
export function scaleRun(up: number[], octaves: number, down: number[] = up): number[] {
  const rise = Array.from({ length: octaves }, () => up).flat();
  const fall = Array.from({ length: octaves }, () => down).flat().reverse().map((s) => -s);
  return [...rise, ...fall];
}

/** Sounding events of a part: ties joined, chords to their top note, rests kept (midi null). */
export interface Event {
  midi: number | null;
  offset: number;
  dur: number;
  measure: number;
}
export function events(notes: NoteEvent[], part: number): Event[] {
  const out: Event[] = [];
  for (const n of notes) {
    if (n.part !== part) continue;
    const midi = n.midi.length ? Math.max(...n.midi) : null;
    const last = out[out.length - 1];
    if (midi !== null && (n.tie === "stop" || n.tie === "continue") && last && last.midi === midi) {
      last.dur += n.dur;
      continue;
    }
    // a rest the exporter laid over a note (an overfull bar) is not the player's
    if (midi === null && last && n.offset < last.offset + last.dur - EPS) continue;
    out.push({ midi, offset: n.offset, dur: n.dur, measure: n.measure });
  }
  return out;
}

const EPS = 1e-6;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-4;
/** quarter notes per bar of a time signature like "3/4" or "6/8" */
export function barLength(time: string): number {
  const m = /^(\d+)\/(\d+)$/.exec(time.trim());
  return m ? (Number(m[1]) * 4) / Number(m[2]) : 4;
}

/** bars whose content doesn't add up to the time signature (overfull anywhere; short except the last and a pickup) */
function badBars(score: ScoreData, part: number, pickup: boolean): { bars: number[]; detail?: string } {
  const byBar = new Map<number, { start: number; end: number }>();
  for (const n of score.notes) {
    if (n.part !== part) continue;
    const b = byBar.get(n.measure) ?? { start: n.offset, end: n.offset };
    b.start = Math.min(b.start, n.offset);
    b.end = Math.max(b.end, n.offset + n.dur);
    byBar.set(n.measure, b);
  }
  const nums = [...byBar.keys()].sort((a, b) => a - b);
  const bars: number[] = [];
  let detail: string | undefined;
  nums.forEach((num, i) => {
    const { start, end } = byBar.get(num)!;
    const length = score.measures.find((m) => m.n === num)?.length ?? barLength(score.time);
    const next = nums[i + 1] !== undefined ? byBar.get(nums[i + 1])!.start : end;
    const span = Math.max(end, next) - start;
    const last = i === nums.length - 1;
    const short = span < length - EPS && !last && !(pickup && i === 0);
    if (span > length + EPS || short) {
      bars.push(num);
      detail ??= `${+span.toFixed(3)} / ${length}`;
    }
  });
  return { bars, detail };
}

/** which rules only advise */
const ADVICE = new Set<AnyRule["id"]>(["noDirect", "fewRepeats", "imperfectMostly"]);

function result(rule: AnyRule, bars: number[], detail?: string): RuleResult {
  return {
    id: rule.id,
    ok: bars.length === 0 && detail === undefined,
    severity: ADVICE.has(rule.id) ? "advice" : "error",
    bars: [...new Set(bars)].sort((x, y) => x - y),
    detail,
  };
}

/** pairs of notes sounding together, by onset in the upper part */
function pairs(score: ScoreData, upper: number, lower: number): [Sound, Sound][] {
  const lo = sounds(score.notes, lower);
  return sounds(score.notes, upper).flatMap((u) => {
    const l = lo.find((x) => x.offset <= u.offset && u.offset < x.offset + x.dur);
    return l ? [[u, l] as [Sound, Sound]] : [];
  });
}

const motion = (a: number, b: number) => Math.sign(b - a);

export function checkRule(score: ScoreData, rule: AnyRule): RuleResult {
  switch (rule.id) {
    case "bowAlternates": {
      const bars: number[] = [];
      let last: "down" | "up" | null = null;
      let rested = false;
      for (const n of score.notes.filter((x) => x.part === rule.part)) {
        if (!n.midi.length) {
          rested = true;
          continue;
        }
        const m = n.marks ?? [];
        if (m.includes("slur:continue") || m.includes("slur:stop")) continue; // the same bow
        const bow = m.includes("down") ? "down" : m.includes("up") ? "up" : null;
        if (!bow || (bow === last && !rested)) bars.push(n.measure);
        last = bow ?? (last === "down" ? "up" : "down");
        rested = false;
      }
      return result(rule, bars);
    }
    case "phraseStartsDown": {
      const ns = numbered(score, rule.part);
      return result(rule, rule.starts.filter((i) => !ns[i - 1]?.marks?.includes("down")).map((i) => ns[i - 1]?.measure ?? 1));
    }
    case "slurOneBow": {
      const ns = numbered(score, rule.part);
      const bars: number[] = [];
      for (const [a, b] of rule.slurs) {
        for (let i = a; i <= b; i++) {
          const m = ns[i - 1]?.marks ?? [];
          const want = i === a ? "slur:start" : i === b ? "slur:stop" : "slur:continue";
          if (!m.includes(want) || (i > a && (m.includes("down") || m.includes("up")))) bars.push(ns[i - 1]?.measure ?? 1);
        }
      }
      return result(rule, bars);
    }
    case "marked": {
      const ns = numbered(score, rule.part);
      const want = new Set(rule.notes);
      const bars = ns.filter((n, i) => (n.marks ?? []).includes(rule.mark) !== want.has(i + 1)).map((n) => n.measure);
      return result(rule, bars);
    }
    case "pedalChangesWithHarmony":
    case "pedalCovers": {
      const pedals = (score.pedals ?? []).filter((p) => p.part === rule.part);
      const ns = numbered(score, rule.part);
      if (rule.id === "pedalCovers") {
        const bare = ns.filter((n) => !pedals.some((p) => p.from <= n.offset + EPS && n.offset < p.to - EPS));
        return result(rule, bare.map((n) => n.measure), pedals.length ? undefined : "—");
      }
      // each bar's harmony: the pitch classes it plays
      const harmony = new Map<number, string>();
      for (const n of ns) {
        const pcs = new Set((harmony.get(n.measure) ?? "").split(",").filter(Boolean));
        n.midi.forEach((m) => pcs.add(String(m % 12)));
        harmony.set(n.measure, [...pcs].sort().join(","));
      }
      const bars: number[] = [];
      for (const p of pedals) {
        const under = [...new Set(ns.filter((n) => p.from <= n.offset + EPS && n.offset < p.to - EPS).map((n) => n.measure))];
        for (let i = 1; i < under.length; i++) if (harmony.get(under[i]) !== harmony.get(under[i - 1])) bars.push(under[i]);
      }
      return result(rule, bars);
    }
    case "breathAtPhraseEnds": {
      const ns = numbered(score, rule.part);
      const ends = new Set(rule.ends);
      const bars = ns
        .filter((n, i) => (n.marks ?? []).includes("breath") !== ends.has(i + 1) && !(i === ns.length - 1 && !ends.has(i + 1)))
        .map((n) => n.measure);
      return result(rule, bars);
    }
    case "maxBeatsWithoutBreath": {
      const ns = numbered(score, rule.part);
      const bars: number[] = [];
      let from = ns[0]?.offset ?? 0;
      let longest = 0;
      for (const n of ns) {
        const end = n.offset + n.dur;
        if (end - from > rule.beats + EPS) bars.push(n.measure);
        longest = Math.max(longest, end - from);
        if ((n.marks ?? []).includes("breath")) from = end;
      }
      return result(rule, [...new Set(bars)].slice(0, 1), bars.length ? `${+longest.toFixed(2)}` : undefined);
    }
    case "fingered": {
      const ns = numbered(score, rule.part);
      return result(rule, ns.filter((n) => finger(n) === null).map((n) => n.measure));
    }
    case "thumbUnder": {
      const ns = numbered(score, rule.part);
      const at = new Set(rule.at);
      const bars: number[] = [];
      ns.forEach((n, i) => {
        const f = finger(n);
        const prev = i > 0 ? finger(ns[i - 1]) : null;
        if ((f === 1) !== at.has(i + 1)) bars.push(n.measure);
        // between thumbs, one finger per step: 1 2 3, then 1 again
        else if (f !== null && f !== 1 && prev !== null && f !== prev + 1 && f !== prev - 1) bars.push(n.measure);
      });
      return result(rule, bars);
    }
    case "violinFirstPosition": {
      const ns = numbered(score, rule.part);
      const reach: Record<number, number[]> = { 0: [0], 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7] };
      const bad = ns.filter((n) => {
        const f = finger(n);
        if (f === null) return false;
        const midi = Math.max(...n.midi);
        if (f === 0 && rule.open === false && midi !== 55) return true;
        return ![55, 62, 69, 76].some((s) => (reach[f] ?? []).includes(midi - s));
      });
      return result(rule, bad.map((n) => n.measure));
    }
    case "lyrics": {
      const sung = numbered(score, rule.part).flatMap((n) => (n.marks ?? []).filter((m) => m.startsWith("lyric:")).map((m) => m.slice(6)));
      const bars = sung.length === rule.syllables.length && sung.every((s, i) => s === rule.syllables[i]) ? undefined : sung.join(" ") || "—";
      return result(rule, [], bars);
    }
    case "rhythm": {
      const ev = events(score.notes, rule.part);
      while (ev.length && ev[ev.length - 1].midi === null) ev.pop();
      const want = [...rule.durs];
      while (want.length && want[want.length - 1] < 0) want.pop();
      const signed = ev.map((e) => (e.midi === null ? -e.dur : e.dur));
      const bars = ev.filter((_, i) => want[i] === undefined || !near(signed[i], want[i])).map((e) => e.measure);
      const shown = signed.slice(0, 16).map((d) => (d < 0 ? `r${+(-d).toFixed(2)}` : `${+d.toFixed(2)}`)).join(" ");
      return result(rule, bars, ev.length === want.length && !bars.length ? undefined : shown + (signed.length > 16 ? " …" : ""));
    }
    case "barsFull": {
      const parts = rule.part !== undefined ? [rule.part] : score.parts.map((_, i) => i);
      const found = parts.map((p) => badBars(score, p, rule.pickup ?? false));
      const bars = found.flatMap((f) => f.bars);
      return result(rule, bars, bars.length ? found.find((f) => f.detail)?.detail : undefined);
    }
    case "timeSig":
      return result(rule, [], score.time === rule.time ? undefined : score.time || "—");
    case "keySig":
      return result(rule, [], score.key === rule.key ? undefined : score.key || "—");
    case "tempo":
      return result(rule, [], near(score.bpm, rule.bpm) ? undefined : `${score.bpm}`);
    case "partName": {
      const name = score.parts[rule.part];
      return result(rule, [], name === rule.name ? undefined : name ?? "—");
    }
    case "instrument": {
      const prog = score.programs[rule.part];
      return result(rule, [], prog === rule.program ? undefined : `${prog ?? "—"}`);
    }
    case "highest":
    case "lowest": {
      const s = sounds(score.notes, rule.part);
      if (!s.length) return result(rule, [], "—");
      const pick = rule.id === "highest" ? Math.max(...s.map((x) => x.midi)) : Math.min(...s.map((x) => x.midi));
      return result(rule, [], pick === rule.midi ? undefined : midiLabel(pick));
    }
    case "parts":
      return result(rule, [], score.parts.length === rule.count ? undefined : `${score.parts.length}`);
    case "count": {
      const n = sounds(score.notes, rule.part).length;
      return result(rule, [], n === rule.count ? undefined : `${n}`);
    }
    case "pitches": {
      const s = sounds(score.notes, rule.part);
      const bars = s.filter((x, i) => x.midi !== rule.midi[i]).map((x) => x.measure);
      return result(rule, bars, s.length === rule.midi.length ? undefined : `${s.length}`);
    }
    case "starts": {
      const s = sounds(score.notes, rule.part)[0];
      return result(rule, s && s.midi === rule.midi ? [] : [s?.measure ?? 1]);
    }
    case "ends": {
      const s = sounds(score.notes, rule.part).at(-1);
      return result(rule, s && s.midi === rule.midi ? [] : [s?.measure ?? 1]);
    }
    case "steps": {
      const s = sounds(score.notes, rule.part);
      const bars: number[] = [];
      for (let i = 1; i < s.length; i++) if (s[i].midi - s[i - 1].midi !== rule.semitones[i - 1]) bars.push(s[i].measure);
      return result(rule, bars, s.length === rule.semitones.length + 1 ? undefined : `${s.length}`);
    }
    case "transposed": {
      const s = sounds(score.notes, rule.part);
      const bars = s.filter((x, i) => x.midi !== rule.from[i] + rule.by).map((x) => x.measure);
      return result(rule, bars, s.length === rule.from.length ? undefined : `${s.length}`);
    }
    case "sameRhythm": {
      const s = sounds(score.notes, rule.part);
      const bars = s.filter((x, i) => x.dur !== rule.durs[i]).map((x) => x.measure);
      return result(rule, bars, s.length === rule.durs.length ? undefined : `${s.length}`);
    }
    case "range": {
      const s = sounds(score.notes, rule.part);
      return result(
        rule,
        s.filter((x) => x.midi < rule.low || x.midi > rule.high).map((x) => x.measure),
      );
    }
    case "scale": {
      const s = sounds(score.notes, rule.part);
      const extra = new Set(rule.allowLast2 ?? []);
      const pcs = new Set(rule.pcs);
      const bars = s
        .filter((x, i) => !pcs.has(x.midi % 12) && !(i >= s.length - 2 && extra.has(x.midi % 12)))
        .map((x) => x.measure);
      return result(rule, bars);
    }
    case "noteAgainstNote": {
      const a = sounds(score.notes, rule.a);
      const b = sounds(score.notes, rule.b);
      const bars = a.filter((x, i) => !b[i] || b[i].offset !== x.offset || b[i].dur !== x.dur).map((x) => x.measure);
      return result(rule, bars, a.length === b.length ? undefined : `${a.length}/${b.length}`);
    }
    case "consonant":
      return result(
        rule,
        pairs(score, rule.upper, rule.lower)
          .filter(([u, l]) => !CONSONANT.has((((u.midi - l.midi) % 12) + 12) % 12))
          .map(([u]) => u.measure),
      );
    case "startPerfect": {
      const [u, l] = pairs(score, rule.upper, rule.lower)[0] ?? [];
      if (!u || !l) return result(rule, [1]);
      const iv = (((u.midi - l.midi) % 12) + 12) % 12;
      // above the cantus: unison, fifth or octave; below it: unison or octave only (a fifth below implies another key)
      const ok = rule.above ? PERFECT.has(iv) : iv === 0;
      return result(rule, ok ? [] : [u.measure]);
    }
    case "endOctave": {
      const [u, l] = pairs(score, rule.upper, rule.lower).at(-1) ?? [];
      return result(rule, u && l && (u.midi - l.midi) % 12 === 0 ? [] : [u?.measure ?? 1]);
    }
    case "cadenceStep": {
      const s = sounds(score.notes, rule.part);
      const [a, b] = s.slice(-2);
      return result(rule, a && b && Math.abs(b.midi - a.midi) <= 2 && a.midi !== b.midi ? [] : [b?.measure ?? 1]);
    }
    case "noParallels": {
      const p = pairs(score, rule.upper, rule.lower);
      const bars: number[] = [];
      for (let i = 1; i < p.length; i++) {
        const [u0, l0] = p[i - 1];
        const [u1, l1] = p[i];
        const iv0 = (((u0.midi - l0.midi) % 12) + 12) % 12;
        const iv1 = (((u1.midi - l1.midi) % 12) + 12) % 12;
        const moved = u0.midi !== u1.midi || l0.midi !== l1.midi;
        if (moved && PERFECT.has(iv1) && iv0 === iv1) bars.push(u1.measure);
      }
      return result(rule, bars);
    }
    case "noDirect": {
      // similar motion into a perfect interval with a leap in the upper voice ("hidden" fifths and octaves)
      const p = pairs(score, rule.upper, rule.lower);
      const bars: number[] = [];
      for (let i = 1; i < p.length; i++) {
        const [u0, l0] = p[i - 1];
        const [u1, l1] = p[i];
        const iv1 = (((u1.midi - l1.midi) % 12) + 12) % 12;
        const iv0 = (((u0.midi - l0.midi) % 12) + 12) % 12;
        const similar = motion(u0.midi, u1.midi) !== 0 && motion(u0.midi, u1.midi) === motion(l0.midi, l1.midi);
        if (similar && PERFECT.has(iv1) && iv0 !== iv1 && Math.abs(u1.midi - u0.midi) > 2) bars.push(u1.measure);
      }
      return result(rule, bars);
    }
    case "noCrossing":
      return result(
        rule,
        pairs(score, rule.upper, rule.lower)
          .filter(([u, l]) => u.midi < l.midi || u.midi - l.midi > rule.maxApart)
          .map(([u]) => u.measure),
      );
    case "goodLeaps": {
      const s = sounds(score.notes, rule.part);
      const bars: number[] = [];
      for (let i = 1; i < s.length; i++) if (BAD_LEAP(Math.abs(s[i].midi - s[i - 1].midi))) bars.push(s[i].measure);
      return result(rule, bars);
    }
    case "unisonEnds": {
      const p = pairs(score, rule.upper, rule.lower);
      return result(
        rule,
        p.filter(([u, l], i) => i > 0 && i < p.length - 1 && u.midi === l.midi).map(([u]) => u.measure),
      );
    }
    case "fewRepeats": {
      const s = sounds(score.notes, rule.part);
      const bars: number[] = [];
      for (let i = 1; i < s.length; i++) if (s[i].midi === s[i - 1].midi) bars.push(s[i].measure);
      return result(rule, bars);
    }
    case "imperfectMostly": {
      const p = pairs(score, rule.upper, rule.lower);
      const perfect = p.filter(([u, l]) => PERFECT.has((((u.midi - l.midi) % 12) + 12) % 12)).length;
      return result(rule, [], perfect * 2 <= p.length ? undefined : `${perfect}/${p.length}`);
    }
  }
}

/** a part's notes numbered as markings.py numbers them: from 1, rests not counted, a chord is one note */
function numbered(score: ScoreData, part: number): NoteEvent[] {
  return score.notes.filter((n) => n.part === part && n.midi.length);
}
const finger = (n: NoteEvent): number | null => {
  const m = (n.marks ?? []).find((x) => x.startsWith("finger:"));
  return m ? Number(m.slice(7)) : null;
};

const LETTERS = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const midiLabel = (m: number) => `${LETTERS[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;

export function check(score: ScoreData, rules: AnyRule[]): { results: RuleResult[]; passed: boolean } {
  const results = rules.map((r) => checkRule(score, r));
  return { results, passed: results.every((r) => r.ok || r.severity === "advice") };
}
