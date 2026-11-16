/**
 * Piano fingering on a lesson's music (1 = thumb … 5 = little finger), drawn by Verovio as MEI <fing> marks.
 *
 * A lesson writes one finger per note or chord, staff by staff ("1 2 3 | 5"; a chord's fingers low to high, "135";
 * "-" for none). The learner chooses how many to see:
 * - all: every one;
 * - basic: only where the hand moves: the first note, and any finger that does not follow from the one before (a
 *   step up to the next key is the next finger; anything else, a thumb passing under, a jump, a shift, is shown);
 *   chords when their fingers change;
 * - none;
 * - keys: not fingers but the computer key that plays each note, from where the hands are (tools/keyLayouts.ts).
 * Fingers are coloured by hand (the top staff the right hand, amber; the others the left, blue).
 */
export type FingerShow = "none" | "basic" | "all" | "keys";
export const FINGER_SHOWS: FingerShow[] = ["none", "basic", "all", "keys"];

const STEP: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const ALTER: Record<string, number> = { s: 1, f: -1, n: 0, ss: 2, x: 2, ff: -2 };
/** an MEI note's MIDI number: its pname and oct, and its written or key-signature accidental */
export function meiMidi(pname: string, oct: number, accid?: string | null): number {
  return 12 * (oct + 1) + (STEP[pname] ?? 0) + (accid ? (ALTER[accid] ?? 0) : 0);
}

/** a staff's fingers as written: "1 2 3 | 5 4" → ["1", "2", "3", "5", "4"] */
export const fingerTokens = (text: string) => text.split(/[\s|]+/).filter(Boolean);

/**
 * Which fingers to draw. `steps`: each event's diatonic step numbers (C4 = 28, D4 = 29 …), low to high; `left`: the
 * left hand, whose fingers count the other way (its thumb is on the right).
 */
export function shownFingers(steps: number[][], fingers: string[], left: boolean, show: FingerShow): string[] {
  if (show === "none") return fingers.map(() => "");
  const clean = fingers.map((f) => (f === "-" ? "" : f));
  if (show === "all") return clean;
  let prev: { step: number; finger: string } | null = null;
  return clean.map((f, i) => {
    const s = steps[i];
    if (!f || !s?.length) return "";
    let shown = true;
    if (prev) {
      if (f.length === 1 && prev.finger.length === 1) {
        const expected = Number(prev.finger) + (left ? -1 : 1) * (s[0] - prev.step);
        shown = expected !== Number(f);
      } else shown = f !== prev.finger;
    }
    prev = { step: s[0], finger: f };
    return shown ? f : "";
  });
}

const PNAMES = "cdefgab";

/**
 * Write the fingers into Verovio's MEI: per staff (in order, top first), one finger string per note or chord (rests
 * are skipped). The top staff's marks go above, the others' below; the lower staff of two is the left hand.
 */
export function addFingering(mei: string, fingers: string[][], show: FingerShow, keyFor?: (midi: number, hand: "left" | "right") => string): string {
  if (show === "none" || (show !== "keys" && !fingers.length) || (show === "keys" && !keyFor)) return mei;
  const doc = new DOMParser().parseFromString(mei, "application/xml");
  const ns = doc.documentElement.namespaceURI;
  const events = new Map<number, Element[]>();
  for (const st of Array.from(doc.getElementsByTagName("staff"))) {
    const n = Number(st.getAttribute("n"));
    const list = events.get(n) ?? [];
    events.set(n, list);
    for (const el of Array.from(st.getElementsByTagName("*")))
      if (el.localName === "chord" || (el.localName === "note" && el.parentElement?.localName !== "chord")) list.push(el);
  }
  const staves = [...events.keys()].sort((a, b) => a - b);
  staves.forEach((n, i) => {
    const evs = events.get(n)!;
    const notesOf = (el: Element) =>
      (el.localName === "chord" ? Array.from(el.getElementsByTagName("note")) : [el])
        .map((x) => ({ el: x, step: PNAMES.indexOf(x.getAttribute("pname") ?? "c") + 7 * Number(x.getAttribute("oct") ?? 4) }))
        .sort((a, b) => a.step - b.step);
    const left = i > 0 && staves.length > 1;
    const midiOf = (x: Element) => meiMidi(x.getAttribute("pname") ?? "c", Number(x.getAttribute("oct") ?? 4), x.getAttribute("accid") ?? x.getAttribute("accid.ges"));
    const shown =
      show === "keys"
        ? // each note's key, low to high (a chord: one per note)
          evs.map((e) => notesOf(e).map((x) => keyFor!(midiOf(x.el), left ? "left" : "right")))
        : shownFingers(evs.map((e) => notesOf(e).map((x) => x.step)), fingerTokens(fingers[i]?.join(" ") ?? ""), left, show).map((f) => (f ? [...f] : []));
    evs.forEach((ev, k) => {
      const f = shown[k];
      if (!f.length) return;
      const measure = ev.closest("measure");
      if (!measure) return;
      const notes = notesOf(ev);
      // a chord: one mark per note, low to high (a single label for a single note)
      const marks = f.length === notes.length ? notes.map((x, j) => [x.el, f[j]] as const) : [[ev, f.join("")] as const];
      for (const [target, label] of marks) {
        const id = target.getAttribute("xml:id");
        if (!id) continue;
        const fing = doc.createElementNS(ns, "fing");
        fing.setAttribute("startid", `#${id}`);
        fing.setAttribute("staff", String(n));
        fing.setAttribute("place", i === 0 ? "above" : "below");
        // (Verovio adds the type to the mark's class: coloured by hand)
        fing.setAttribute("type", left ? "pz-lh" : "pz-rh");
        fing.textContent = label;
        measure.appendChild(fing);
      }
    });
  });
  return new XMLSerializer().serializeToString(doc);
}
