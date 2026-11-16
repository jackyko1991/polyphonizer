/**
 * Piano fingering on a lesson's music (1 = thumb … 5 = little finger), drawn by Verovio as MEI <fing> marks.
 *
 * A lesson writes one finger per note or chord, staff by staff ("1 2 3 | 5"; a chord's fingers low to high, "135";
 * "-" for none). The learner chooses how many to see:
 * - all: every one;
 * - basic: only where the hand moves: the first note, and any finger that does not follow from the one before (a
 *   step up to the next key is the next finger; anything else, a thumb passing under, a jump, a shift, is shown);
 *   chords when their fingers change;
 * - none.
 */
export type FingerShow = "none" | "basic" | "all";
export const FINGER_SHOWS: FingerShow[] = ["none", "basic", "all"];

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
export function addFingering(mei: string, fingers: string[][], show: FingerShow): string {
  if (show === "none" || !fingers.length) return mei;
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
    const want = fingerTokens(fingers[i]?.join(" ") ?? "");
    const shown = shownFingers(evs.map((e) => notesOf(e).map((x) => x.step)), want, i > 0 && staves.length > 1, show);
    evs.forEach((ev, k) => {
      const f = shown[k];
      if (!f) return;
      const measure = ev.closest("measure");
      if (!measure) return;
      const notes = notesOf(ev);
      // a chord: one mark per note, low to high (a single string for a single note)
      const marks = f.length === notes.length ? notes.map((x, j) => [x.el, f[j]] as const) : [[ev, f] as const];
      for (const [target, label] of marks) {
        const id = target.getAttribute("xml:id");
        if (!id) continue;
        const fing = doc.createElementNS(ns, "fing");
        fing.setAttribute("startid", `#${id}`);
        fing.setAttribute("staff", String(n));
        fing.setAttribute("place", i === 0 ? "above" : "below");
        fing.textContent = label;
        measure.appendChild(fing);
      }
    });
  });
  return new XMLSerializer().serializeToString(doc);
}
