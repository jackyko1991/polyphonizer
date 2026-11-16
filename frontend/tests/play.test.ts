import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeInTime, gradeWait, pressWait, startWait, steps, type TargetNote } from "../src/learn/play/matcher.ts";

const tune = (midis: number[], gap = 500): TargetNote[] => midis.map((midi, i) => ({ id: `n${i}`, midi, time: i * gap }));
const marks = (g: { results: { mark: string }[] }) => g.results.map((r) => r.mark).join(" ");

test("in time: a clean performance passes with a full score", () => {
  const t = tune([60, 62, 64, 65, 67]);
  const g = gradeInTime(t, t.map((n) => ({ midi: n.midi, time: n.time + 20 })), 150);
  assert.equal(marks(g), "ok ok ok ok ok");
  assert.equal(g.score, 100);
  assert.ok(g.passed);
});

test("in time: early and late within the window, wrong pitch, missed note", () => {
  const t = tune([60, 62, 64, 65, 67]);
  const played = [
    { midi: 60, time: 0 },
    { midi: 62, time: 500 - 250 }, // early
    { midi: 63, time: 1000 }, // wrong pitch
    // 65 missed
    { midi: 67, time: 2000 + 300 }, // late
  ];
  const g = gradeInTime(t, played, 150);
  assert.equal(marks(g), "ok early wrong missed late");
  assert.equal(g.results[1].offset, -250);
  assert.equal(g.passed, false);
});

test("in time: one extra note doesn't shift the rest out of line", () => {
  const t = tune([60, 62, 64, 65, 67]);
  const played = [{ midi: 60, time: 0 }, { midi: 61, time: 200 }, ...t.slice(1).map((n) => ({ midi: n.midi, time: n.time }))];
  const g = gradeInTime(t, played, 150);
  assert.equal(marks(g), "ok ok ok ok ok");
  assert.equal(g.extra, 1);
  assert.equal(g.score, 95); // a quarter point off for the stray note
});

test("in time: chords match note by note, in any order", () => {
  const t: TargetNote[] = [
    { id: "c", midi: 60, time: 0 },
    { id: "e", midi: 64, time: 0 },
    { id: "g", midi: 67, time: 0 },
    { id: "f", midi: 65, time: 1000 },
  ];
  const g = gradeInTime(t, [{ midi: 67, time: 10 }, { midi: 60, time: 25 }, { midi: 64, time: 0 }, { midi: 65, time: 990 }], 150);
  assert.equal(marks(g), "ok ok ok ok");
});

test("in time: mashing every key doesn't pass", () => {
  const t = tune([60, 62, 64, 65]);
  const played = Array.from({ length: 40 }, (_, i) => ({ midi: 60 + (i % 12), time: i * 50 }));
  assert.equal(gradeInTime(t, played, 150).passed, false);
});

test("wait for me: steps through notes and chords, counting wrong keys", () => {
  const t: TargetNote[] = [
    { id: "a", midi: 60, time: 0 },
    { id: "b1", midi: 64, time: 500 },
    { id: "b2", midi: 67, time: 500 },
    { id: "c", midi: 72, time: 1000 },
  ];
  const plan = steps(t);
  assert.equal(plan.length, 3);
  let s = startWait();
  s = pressWait(s, plan, 60);
  assert.equal(s.step, 1);
  s = pressWait(s, plan, 62); // wrong while the chord was due
  s = pressWait(s, plan, 67);
  assert.equal(s.step, 1); // half the chord: still waiting
  s = pressWait(s, plan, 64);
  assert.equal(s.step, 2);
  s = pressWait(s, plan, 72);
  assert.ok(s.finished);
  const g = gradeWait(s, plan);
  assert.equal(marks(g), "ok wrong wrong ok"); // both chord notes were still due when the wrong key came
  assert.equal(g.score, 50);
  assert.equal(g.passed, false);
});

import createVerovioModule from "verovio/wasm";
import { VerovioToolkit } from "verovio/esm";
import { exampleData, fixAbcKeys } from "../src/engine/abc.ts";
import { PLAY_LESSONS } from "../src/learn/play/lessons.ts";
import { KEY_OFFSETS } from "../src/tools/music.ts";
import { keyLabelFor } from "../src/tools/keyLayouts.ts";

/** the pitches every lesson must contain, in time order (chords low to high) */
const EXPECTED: Record<string, number[]> = {
  "middle-c": [60, 60, 60, 60, 60],
  "five-fingers": [60, 62, 64, 65, 67, 67, 65, 64, 62, 60],
  mary: [64, 62, 60, 62, 64, 64, 64, 62, 62, 62, 64, 67, 67, 64, 62, 60, 62, 64, 64, 64, 64, 62, 62, 64, 62, 60],
  "ode-opening": [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62, 64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60],
  "in-time": [60, 60, 64, 64, 64, 67, 67, 67, 67, 72],
  eighths: [60, 62, 64, 65, 67, 67, 65, 64, 62, 60, 60, 64, 67, 64, 60, 64, 67, 64, 60],
  "black-keys": [67, 69, 71, 72, 74, 72, 71, 69, 67, 66, 67, 69, 67],
  pentatonic: [66, 68, 70, 73, 75, 73, 70, 68, 66, 68, 70, 66],
  scale: [60, 62, 64, 65, 67, 69, 71, 72, 72, 71, 69, 67, 65, 64, 62, 60],
  "two-octaves": [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84],
  chords: [60, 64, 67, 60, 64, 67, 65, 69, 72, 65, 69, 72, 67, 71, 74, 67, 71, 74, 60, 64, 67],
  "melody-bass": [60, 76, 74, 72, 74, 60, 76, 76, 76, 67, 74, 74, 74, 60, 76, 76, 76],
  twinkle: [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60, 67, 67, 65, 65, 64, 64, 62, 67, 67, 65, 65, 64, 64, 62, 60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60],
  "ode-whole": [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62, 64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60],
  // both hands: the left hand's notes (C3 …) sound with the right hand's
  "hands-parallel": [48, 60, 50, 62, 52, 64, 53, 65, 55, 67, 55, 67, 53, 65, 52, 64, 50, 62, 48, 60],
  "hands-contrary": [55, 60, 53, 62, 52, 64, 50, 65, 48, 67, 48, 67, 50, 65, 52, 64, 53, 62, 55, 60],
  "ode-hands": [48, 64, 64, 65, 67, 55, 67, 65, 64, 62, 48, 60, 60, 62, 64, 55, 64, 62, 55, 62, 48, 64, 64, 65, 67, 55, 67, 65, 64, 62, 48, 60, 60, 62, 64, 55, 62, 60, 48, 60],
  "twinkle-hands": [48, 60, 60, 67, 67, 53, 69, 69, 48, 67, 53, 65, 65, 48, 64, 64, 55, 62, 62, 48, 60, 48, 67, 67, 53, 65, 65, 48, 64, 64, 55, 62, 48, 67, 67, 53, 65, 65, 48, 64, 64, 55, 62, 48, 60, 60, 67, 67, 53, 69, 69, 48, 67, 53, 65, 65, 48, 64, 64, 55, 62, 62, 48, 60],
};

test("every Play lesson's music is drawn by Verovio with exactly the expected notes, bars full", async () => {
  const mod = await createVerovioModule();
  assert.deepEqual(Object.keys(EXPECTED).sort(), PLAY_LESSONS.map((l) => l.id).sort());
  for (const l of PLAY_LESSONS) {
    const t = new VerovioToolkit(mod);
    t.setOptions({ header: "none", adjustPageHeight: true, breaks: "auto" });
    // as the app does (engraveSnippet): Verovio's ABC reader carries the previous tune's key over, fixAbcKeys corrects it
    const data = exampleData(l.abc);
    assert.ok(t.loadData(data), l.id);
    if (!data.startsWith("<")) t.loadData(fixAbcKeys(t.getMEI({}), l.abc));
    t.renderToSVG(1);
    const events = (t.renderToTimemap() as { tstamp: number; on?: string[] }[]).flatMap((e) =>
      (e.on ?? []).map((id) => ({ t: e.tstamp, midi: (t.getMIDIValuesForElement(id) as { pitch: number }).pitch })),
    );
    const midi = events.sort((a, b) => a.t - b.t || a.midi - b.midi).map((e) => e.midi);
    assert.deepEqual(midi, EXPECTED[l.id], l.id);
    // the bars add up: the music lasts a whole number of 4/4 bars at the lesson's tempo
    const q = Number(/Q:1\/4=(\d+)/.exec(l.abc)![1]);
    const last = (t.renderToTimemap() as { tstamp: number }[]).at(-1)!.tstamp;
    const bars = (l.abc.match(/\|/g) ?? []).length / (l.abc.includes("V:2") ? 2 : 1);
    assert.ok(Math.abs(last - (bars * 4 * 60000) / q) < 2, `${l.id}: ${last} ms`);
  }
});

test("every lesson fits the computer keys from middle C (both-hands lessons: the two rows, left from C3), except the octave lesson", () => {
  const reach = new Set(Object.values(KEY_OFFSETS).map((o) => 60 + o));
  const twoRows = (m: number) => keyLabelFor("tworow", m, { high: 60, low: 48 }) !== null;
  for (const id of Object.keys(EXPECTED)) {
    if (id === "two-octaves") continue;
    const hands = PLAY_LESSONS.find((l) => l.id === id)!.hands === "two";
    for (const m of EXPECTED[id]) assert.ok(hands ? twoRows(m) : reach.has(m), `${id}: ${m} is out of reach`);
  }
  assert.ok(PLAY_LESSONS.filter((l) => l.hands === "two").length >= 4);
});

import { fingerTokens, meiMidi, shownFingers } from "../src/engine/fingering.ts";

/** an ABC voice's notes and chords (rests and bar lines skipped) */
const events = (body: string) => body.replace(/"[^"]*"|![^!]*!/g, "").match(/\[[^\]:|]+\]|[_^=]*[A-Ga-g][,']*/g) ?? [];

test("every keyboard lesson has one finger per note or chord, 1 to 5", () => {
  for (const l of PLAY_LESSONS.filter((x) => x.instrument === "keyboard")) {
    assert.ok(l.fingers, `${l.id} has no fingering`);
    const body = l.abc.split("\n").filter((line) => !/^[A-Za-z]:/.test(line));
    const voices = l.abc.includes("V:") ? l.abc.split(/^V:.*$/m).slice(1) : [body.join("\n")];
    assert.equal(voices.length, l.fingers!.length, l.id);
    voices.forEach((v, i) => {
      const fingers = fingerTokens(l.fingers![i]);
      assert.equal(fingers.length, events(v).length, `${l.id} voice ${i + 1}`);
      for (const f of fingers) assert.match(f, /^[1-5]+$/, `${l.id}: ${f}`);
    });
  }
});

test("basic fingering shows only where the hand moves", () => {
  // C D E F G A B c: C4 = 28; the thumb passes under on F
  const steps = [28, 29, 30, 31, 32, 33, 34, 35].map((s) => [s]);
  const scale = fingerTokens("1 2 3 1 | 2 3 4 5");
  assert.deepEqual(shownFingers(steps, scale, false, "basic"), ["1", "", "", "1", "", "", "", ""]);
  assert.deepEqual(shownFingers(steps, scale, false, "all"), scale);
  assert.deepEqual(shownFingers(steps, scale, false, "none"), ["", "", "", "", "", "", "", ""]);
  // repeated notes keep their finger; a jump is shown
  assert.deepEqual(shownFingers([[28], [28], [32]], ["1", "1", "5"], false, "basic"), ["1", "", ""]);
  assert.deepEqual(shownFingers([[28], [28], [35]], ["1", "1", "5"], false, "basic"), ["1", "", "5"]);
  // the left hand counts the other way: C3 (21) with 5, then D3 with 4
  assert.deepEqual(shownFingers([[21], [22]], ["5", "4"], true, "basic"), ["5", ""]);
  // chords: when their fingers change
  assert.deepEqual(shownFingers([[28, 30, 32], [31, 33, 35], [28, 30, 32]], ["135", "135", "125"], false, "basic"), ["135", "", "125"]);
});

test("an MEI note's MIDI number, with written or key-signature accidentals (for the Computer keys labels)", () => {
  assert.equal(meiMidi("c", 4), 60);
  assert.equal(meiMidi("f", 4, "s"), 66);
  assert.equal(meiMidi("b", 3, "f"), 58);
  assert.equal(meiMidi("g", 2), 43);
  assert.equal(meiMidi("e", 5, "n"), 76);
});
