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

/** which rules only advise */
const ADVICE = new Set<Rule["id"]>(["noDirect", "fewRepeats", "imperfectMostly"]);

function result(rule: Rule, bars: number[], detail?: string): RuleResult {
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

export function checkRule(score: ScoreData, rule: Rule): RuleResult {
  switch (rule.id) {
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

export function check(score: ScoreData, rules: Rule[]): { results: RuleResult[]; passed: boolean } {
  const results = rules.map((r) => checkRule(score, r));
  return { results, passed: results.every((r) => r.ok || r.severity === "advice") };
}
