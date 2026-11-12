/**
 * Multi-voice ABC → MEI, for the pages' music examples. Verovio reads ABC itself but puts every voice on one staff,
 * so an example with V:1 / V:2 (counterpoint, two parts) comes here and is written as MEI with one staff per voice,
 * aligned bar by bar. Supported: header fields M L K (K: with modes: Dm, Ddor, Gmix …), V:n with clef=treble|bass|
 * alto|tenor; notes with ^ ^^ _ __ = accidentals (an accidental lasts to the end of its bar, as in print), , and '
 * octaves, lengths (2, /2, 3/2 …), rests z, chords [CEG], ties -, triplets (3, bars | || |] and "annotations" (text
 * above the next note). Anything else is ignored here; tests/notation.test.ts rejects it in the pages.
 */

type Pitch = { step: string; oct: number; accid: number | null };
type Event = { kind: "note" | "rest" | "chord"; pitches: Pitch[]; len: number; tie: boolean; tuplet: number; text: string | null };

const MAJOR_FIFTHS: Record<string, number> = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7 };
const MODES: [RegExp, number][] = [
  [/^(maj|ion)/, 0],
  [/^mix/, -1],
  [/^dor/, -2],
  [/^(m$|min|aeo)/, -3],
  [/^phr/, -4],
  [/^loc/, -5],
  [/^lyd/, 1],
];
const ORDER_SHARPS = "FCGDAEB";

/** "G", "Dm", "D dorian", "Bb", "F#m" → fifths (sharps > 0, flats < 0) */
export function keyFifths(k: string): number {
  const m = /^([A-G])([#b]?)\s*([A-Za-z]*)/.exec(k.trim());
  if (!m) return 0;
  const tonic = m[1] + m[2];
  const mode = m[3].toLowerCase();
  // fifths of the tonic's major key, then shifted by the mode
  const base = MAJOR_FIFTHS[tonic] ?? fifthsOf(tonic);
  const shift = MODES.find(([re]) => re.test(mode))?.[1] ?? 0;
  return base + shift;
}
function fifthsOf(tonic: string): number {
  const steps = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "E#", "B#"];
  const i = steps.indexOf(tonic);
  return i >= 0 ? i : 0;
}
/** the key signature's alteration of each step: { F: 1, C: 1 } for D major */
function keyAlter(fifths: number): Record<string, number> {
  const out: Record<string, number> = {};
  if (fifths > 0) for (const s of ORDER_SHARPS.slice(0, fifths)) out[s] = 1;
  if (fifths < 0) for (const s of [...ORDER_SHARPS].reverse().slice(0, -fifths)) out[s] = -1;
  return out;
}

const frac = (s: string) => {
  const [a, b] = s.split("/").map(Number);
  return b ? a / b : a;
};
function lengthOf(suffix: string): number {
  if (!suffix) return 1;
  const m = /^(\d*)(\/+)?(\d*)$/.exec(suffix);
  if (!m) return 1;
  const num = m[1] ? Number(m[1]) : 1;
  if (!m[2]) return num;
  return num / (m[3] ? Number(m[3]) : 2 ** m[2].length);
}
function pitchOf(tok: string): Pitch {
  const m = /^(\^\^|\^|__|_|=)?([A-Ga-g])([,']*)$/.exec(tok)!;
  const accid = m[1] === undefined ? null : { "^^": 2, "^": 1, __: -2, _: -1, "=": 0 }[m[1]]!;
  const lower = m[2] === m[2].toLowerCase();
  const oct = (lower ? 5 : 4) + [...m[3]].reduce((n, c) => n + (c === "'" ? 1 : -1), 0);
  return { step: m[2].toUpperCase(), oct, accid };
}

/** [count, unit] of M:, the unit length L:, the key's fifths, and per voice: its clef and bars of events */
export function parseAbc(abc: string) {
  let meter = "4/4";
  let unit = 1 / 8;
  let key = 0;
  const voices = new Map<string, { clef: string; bars: Event[][] }>();
  let current = "1";
  const voice = () => voices.get(current) ?? (voices.set(current, { clef: "treble", bars: [[]] }), voices.get(current)!);
  for (const raw of abc.split("\n")) {
    const line = raw.replace(/%.*$/, "").trim();
    if (!line) continue;
    const field = /^([A-Za-z]):\s*(.*)$/.exec(line);
    if (field) {
      const [, k, v] = field;
      if (k === "M") meter = v === "C" ? "4/4" : v === "C|" ? "2/2" : v;
      if (k === "L") unit = frac(v);
      if (k === "K") key = keyFifths(v);
      if (k === "V") {
        current = v.split(/\s/)[0];
        const clef = /clef=(\w+)/.exec(v)?.[1];
        if (clef) voice().clef = clef;
        else voice();
      }
      continue;
    }
    const body = line.replace(/![^!]*!|\{[^}]*\}/g, " ");
    let tuplet = 0;
    let text: string | null = null;
    const re = /"([^"]*)"|\(([2-9])|\[((?:[_^=]*[A-Ga-g][,']*\s*)+)\]([\d/]*)(-?)|([_^=]*[A-Ga-g][,']*)([\d/]*)(-?)|z([\d/]*)|(\|\]|\|\||\|:|:\||::|\|)/g;
    for (const m of body.matchAll(re)) {
      const v = voice();
      const bar = v.bars[v.bars.length - 1];
      // "^P5": the first character says where the text goes (^ above, _ below, < > @ beside); we always put it above
      if (m[1] !== undefined) text = m[1].replace(/^[\^_<>@]/, "");
      else if (m[2]) tuplet = Number(m[2]);
      else if (m[10]) v.bars.push([]);
      else {
        const isChord = m[3] !== undefined;
        const isRest = m[9] !== undefined;
        const suffix = isChord ? m[4] : isRest ? m[9] : m[7];
        const pitches = isChord ? m[3].trim().split(/\s+|(?=[_^=]*[A-Ga-g])/).filter(Boolean).map(pitchOf) : isRest ? [] : [pitchOf(m[6])];
        let len = lengthOf(suffix) * unit;
        const inTuplet = tuplet > 0 ? 3 : 0;
        if (tuplet > 0) {
          len *= tuplet === 3 ? 2 / 3 : tuplet === 2 ? 3 / 2 : (tuplet - 1) / tuplet;
          tuplet--;
        }
        bar.push({ kind: isRest ? "rest" : isChord ? "chord" : "note", pitches, len, tie: (isChord ? m[5] : m[8]) === "-", tuplet: inTuplet, text });
        text = null;
      }
    }
  }
  for (const v of voices.values()) if (v.bars.length > 1 && v.bars[v.bars.length - 1].length === 0) v.bars.pop();
  return { meter, unit, key, voices };
}

const BASES = [1, 1 / 2, 1 / 4, 1 / 8, 1 / 16, 1 / 32, 1 / 64];
/** a length in whole notes → MEI @dur and @dots */
function durOf(len: number): { dur: number; dots: number } {
  for (const base of BASES)
    for (let dots = 0; dots <= 2; dots++) if (Math.abs(base * (2 - 2 ** -dots) - len) < 1e-9) return { dur: Math.round(1 / base), dots };
  return { dur: 4, dots: 0 };
}

const CLEFS: Record<string, [string, number]> = { treble: ["G", 2], bass: ["F", 4], alto: ["C", 3], tenor: ["C", 4] };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const ACCID: Record<number, string> = { 2: "x", 1: "s", 0: "n", [-1]: "f", [-2]: "ff" };

/** MEI for a multi-voice ABC example: one staff per voice */
export function abcToMei(abc: string): string {
  const { meter, key, voices } = parseAbc(abc);
  const [count, unitDen] = meter.split("/").map(Number);
  const names = [...voices.keys()];
  const sig = key === 0 ? "0" : key > 0 ? `${key}s` : `${-key}f`;
  const keyAlt = keyAlter(key);
  const nBars = Math.max(...[...voices.values()].map((v) => v.bars.length));
  const staffDefs = names
    .map((name, i) => {
      const [shape, line] = CLEFS[voices.get(name)!.clef] ?? CLEFS.treble;
      return `<staffDef n="${i + 1}" lines="5" clef.shape="${shape}" clef.line="${line}"/>`;
    })
    .join("");
  let id = 0;
  const measures: string[] = [];
  // tie state per voice: pitches whose tie continues into the next note
  const tied = names.map(() => new Set<string>());
  for (let b = 0; b < nBars; b++) {
    const staves: string[] = [];
    const dirs: string[] = [];
    names.forEach((name, s) => {
      const events = voices.get(name)!.bars[b] ?? [];
      if (!events.length) return staves.push(`<staff n="${s + 1}"><layer n="1"><mRest/></layer></staff>`);
      const carry: Record<string, number> = {};
      let at = 0;
      let open = false;
      const items: string[] = [];
      for (const ev of events) {
        const written = ev.tuplet ? ev.len * 1.5 : ev.len;
        const { dur, dots } = durOf(written);
        const durAttr = `dur="${dur}"${dots ? ` dots="${dots}"` : ""}`;
        if (ev.text !== null)
          dirs.push(`<dir xml:id="d${++id}" staff="${s + 1}" place="above" tstamp="${(1 + at * unitDen).toFixed(4)}">${esc(ev.text)}</dir>`);
        const note = (p: Pitch, withDur: boolean) => {
          const k = `${p.step}${p.oct}`;
          let accid = "";
          if (p.accid !== null) {
            carry[k] = p.accid;
            accid = ` accid="${ACCID[p.accid]}"`;
          } else if (carry[k] !== undefined) accid = ` accid.ges="${ACCID[carry[k]]}"`;
          else if (keyAlt[p.step]) accid = ` accid.ges="${ACCID[keyAlt[p.step]]}"`;
          const was = tied[s].has(k);
          const tie = ev.tie ? (was ? ' tie="m"' : ' tie="i"') : was ? ' tie="t"' : "";
          return `<note xml:id="n${++id}" pname="${p.step.toLowerCase()}" oct="${p.oct}"${withDur ? ` ${durAttr}` : ""}${accid}${tie}/>`;
        };
        let xml: string;
        if (ev.kind === "rest") xml = `<rest xml:id="r${++id}" ${durAttr}/>`;
        else if (ev.kind === "note") xml = note(ev.pitches[0], true);
        else xml = `<chord xml:id="c${++id}" ${durAttr}>${ev.pitches.map((p) => note(p, false)).join("")}</chord>`;
        // remember ties for the next event
        tied[s] = new Set(ev.tie ? ev.pitches.map((p) => `${p.step}${p.oct}`) : []);
        if (ev.tuplet && !open) {
          items.push('<tuplet num="3" numbase="2">');
          open = true;
        } else if (!ev.tuplet && open) {
          items.push("</tuplet>");
          open = false;
        }
        items.push(xml);
        at += ev.len;
        if (open && items.filter((x) => x.startsWith("<note") || x.startsWith("<chord") || x.startsWith("<rest")).length % 3 === 0 && ev.tuplet) {
          // a triplet closes after its third note
          const opened = items.lastIndexOf('<tuplet num="3" numbase="2">');
          if (items.length - opened - 1 === 3) {
            items.push("</tuplet>");
            open = false;
          }
        }
      }
      if (open) items.push("</tuplet>");
      staves.push(`<staff n="${s + 1}"><layer n="1">${items.join("")}</layer></staff>`);
    });
    const right = b === nBars - 1 ? ' right="end"' : "";
    measures.push(`<measure xml:id="m${++id}" n="${b + 1}"${right}>${staves.join("")}${dirs.join("")}</measure>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="4.0.1"><meiHead><fileDesc><titleStmt><title/></titleStmt><pubStmt/></fileDesc></meiHead>
<music><body><mdiv><score><scoreDef meter.count="${count}" meter.unit="${unitDen}" key.sig="${sig}"><staffGrp${names.length > 1 ? ' symbol="bracket"' : ""}>${staffDefs}</staffGrp></scoreDef>
<section>${measures.join("")}</section></score></mdiv></body></music></mei>`;
}

/** what to give Verovio for a page example: the ABC itself, or MEI when it has several voices */
export function exampleData(abc: string): string {
  const voices = new Set([...abc.matchAll(/^V:\s*(\S+)/gm)].map((m) => m[1]));
  return voices.size > 1 ? abcToMei(abc) : abc;
}

/**
 * Verovio's ABC reader leaks the previous tune's key: after a G-major example, a C-major one gets F♯ as a hidden
 * (gestural) accidental on every F, in the sound and the drawing, even in a new toolkit. So after Verovio reads an
 * ABC example, its gestural accidentals are rewritten from the example's own key (K:) and the accidentals written
 * earlier in the same bar, and the corrected MEI is loaded instead. Written accidentals are kept as they are.
 */
export function fixAbcKeys(mei: string, abc: string): string {
  const k = /^K:\s*(.*)$/m.exec(abc)?.[1] ?? "C";
  const key = keyAlter(keyFifths(k.replace(/\s*clef=\S+/, "")));
  return mei.replace(/<measure\b[\s\S]*?<\/measure>/g, (measure) => {
    const carry: Record<string, string> = {};
    return measure.replace(/<note\b([^>]*?)(\/>|>([\s\S]*?)<\/note>)/g, (whole, attrs: string, _end: string, body: string | undefined) => {
      const step = /\bpname="([a-g])"/.exec(attrs)?.[1];
      const oct = /\boct="(\d+)"/.exec(attrs)?.[1];
      if (!step || !oct) return whole;
      const written = /\baccid="(\w+)"/.exec(attrs)?.[1] ?? (body ? /<accid\b[^>]*\baccid="(\w+)"/.exec(body)?.[1] : undefined);
      const clean = (x: string) => x.replace(/\s*accid\.ges="\w+"/g, "");
      let a = clean(attrs);
      const b = body !== undefined ? clean(body) : undefined;
      const id = `${step}${oct}`;
      if (written) carry[id] = written;
      else {
        const alter = carry[id] ?? (key[step.toUpperCase()] ? ACCID[key[step.toUpperCase()]] : undefined);
        if (alter && alter !== "n") a += ` accid.ges="${alter}"`;
      }
      return b !== undefined ? `<note${a}>${b}</note>` : `<note${a}/>`;
    });
  });
}
