import { test } from "node:test";
import assert from "node:assert/strict";
import { hzToMidi, keyLabel, KEY_OFFSETS, midiToHz, nearestNote, noteName, tapTempo, TUNINGS } from "../src/tools/music.ts";
import { DEFAULT_METRONOME, nextAccent, ticksBetween, withBeats } from "../src/tools/metronomeCore.ts";
import { detectPitch } from "../src/tools/pitch.ts";

test("note names and frequencies, for any A4", () => {
  assert.equal(noteName(60), "C4");
  assert.equal(noteName(61), "C♯4");
  assert.equal(noteName(21), "A0");
  assert.ok(Math.abs(midiToHz(69) - 440) < 1e-9);
  assert.ok(Math.abs(midiToHz(62, 442) - 295.0) < 0.1); // D4 when the orchestra tunes to 442
  assert.ok(Math.abs(midiToHz(60) - 261.6256) < 1e-3);
  assert.ok(Math.abs(hzToMidi(415, 415) - 69) < 1e-9); // Baroque A
  const n = nearestNote(446, 440);
  assert.equal(n.midi, 69);
  assert.ok(Math.abs(n.cents - 23.45) < 0.1);
  assert.equal(nearestNote(midiToHz(55) * 2 ** (-10 / 1200)).cents.toFixed(1), "-10.0");
});

test("Musical Typing: home row white keys from C, top row black keys", () => {
  const base = 60;
  const white = ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK"].map((k) => base + KEY_OFFSETS[k]);
  assert.deepEqual(white, [60, 62, 64, 65, 67, 69, 71, 72]);
  const black = ["KeyW", "KeyE", "KeyT", "KeyY", "KeyU"].map((k) => base + KEY_OFFSETS[k]);
  assert.deepEqual(black, [61, 63, 66, 68, 70]);
  assert.equal(keyLabel(64, 60), "D");
  assert.equal(keyLabel(76, 60), ";");
  assert.equal(keyLabel(59, 60), null);
});

test("tap tempo averages the last taps and forgets old ones", () => {
  let st = tapTempo([], 0);
  assert.equal(st.bpm, null);
  for (const t of [500, 1000, 1500]) st = tapTempo(st.times, t);
  assert.equal(st.bpm, 120);
  st = tapTempo(st.times, 9000); // a long pause starts again
  assert.equal(st.bpm, null);
});

test("tuner presets list strings low to high (ukulele's re-entrant G aside)", () => {
  const violin = TUNINGS.find((t) => t.id === "violin")!;
  assert.deepEqual(violin.notes.map(noteName), ["G3", "D4", "A4", "E5"]);
  const guitar = TUNINGS.find((t) => t.id === "guitar")!;
  assert.deepEqual(guitar.notes.map(noteName), ["E2", "A2", "D3", "G3", "B3", "E4"]);
});

test("metronome ticks: accents on beat 1, subdivisions, windows without gaps or doubles", () => {
  const s = { ...DEFAULT_METRONOME, bpm: 120 };
  const t = ticksBetween(s, 10, 10, 12); // 2 s at 120 bpm = 4 beats
  assert.deepEqual(
    t.map((x) => x.time),
    [10, 10.5, 11, 11.5],
  );
  assert.deepEqual(
    t.map((x) => x.kind),
    ["accent", "normal", "normal", "normal"],
  );
  // consecutive windows join up exactly
  const a = ticksBetween(s, 0, 0, 1.23);
  const b = ticksBetween(s, 0, 1.23, 3);
  assert.deepEqual(
    [...a, ...b].map((x) => x.index),
    [0, 1, 2, 3, 4, 5],
  );
  // 3/4 with triplets: 9 ticks a bar, beats every third
  const tri = ticksBetween({ ...withBeats(s, 3), sub: 3 }, 0, 0, 1.5);
  assert.equal(tri.length, 9);
  assert.deepEqual(tri.map((x) => x.kind).slice(0, 4), ["accent", "sub", "sub", "normal"]);
  assert.equal(tri[3].beat, 1);
  // a muted beat
  const muted = ticksBetween({ ...s, accents: ["accent", "mute", "normal", "normal"] }, 0, 0, 2);
  assert.equal(muted[1].kind, "mute");
  assert.equal(nextAccent("accent"), "normal");
  assert.equal(nextAccent("mute"), "accent");
  assert.deepEqual(withBeats(s, 6).accents, ["accent", "normal", "normal", "normal", "normal", "normal"]);
});

/** a test tone: a sawtooth-ish wave (rich in harmonics, like a bowed string), with optional vibrato */
function tone(hz: number, sr = 48000, n = 2048, vibratoCents = 0): Float32Array {
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const f = hz * 2 ** ((vibratoCents * Math.sin((2 * Math.PI * 5.5 * i) / sr)) / 1200);
    phase += f / sr;
    const p = phase % 1;
    out[i] = 0.3 * (Math.sin(2 * Math.PI * p) + 0.5 * Math.sin(4 * Math.PI * p) + 0.25 * Math.sin(6 * Math.PI * p));
  }
  return out;
}

test("YIN finds the pitch of violin strings, a flute note and a low cello C, within a few cents", () => {
  for (const midi of [55, 62, 69, 76, 79, 36]) {
    const hz = midiToHz(midi);
    const p = detectPitch(tone(hz, 48000, midi < 45 ? 4096 : 2048), 48000);
    assert.ok(p, `no pitch for ${noteName(midi)}`);
    const { midi: got, cents } = nearestNote(p.hz);
    assert.equal(got, midi, noteName(midi));
    assert.ok(Math.abs(cents) < 3, `${noteName(midi)}: ${cents.toFixed(2)} cents`);
    assert.ok(p.clarity > 0.8);
  }
  // 15 cents sharp is reported as 15 cents sharp
  const sharp = detectPitch(tone(midiToHz(69) * 2 ** (15 / 1200)), 48000)!;
  assert.ok(Math.abs(nearestNote(sharp.hz).cents - 15) < 3);
  // silence and noise give no pitch
  assert.equal(detectPitch(new Float32Array(2048), 48000), null);
  const noise = Float32Array.from({ length: 2048 }, () => Math.random() - 0.5);
  assert.equal(detectPitch(noise, 48000), null);
});

test("metronome: the heavy note can be the first of the bar, of every beat, or none; muted beats stay silent", async () => {
  const { ticksBetween, DEFAULT_METRONOME } = await import("../src/tools/metronomeCore.ts");
  const kinds = (heavy: "bar" | "beat" | "none") =>
    ticksBetween({ ...DEFAULT_METRONOME, bpm: 60, sub: 3, heavy, accents: ["accent", "normal", "mute", "normal"] }, 0, 0, 4).map((t) => t.kind);
  assert.deepEqual(kinds("bar"), ["accent", "sub", "sub", "normal", "sub", "sub", "mute", "sub", "sub", "normal", "sub", "sub"]);
  assert.deepEqual(kinds("beat"), ["accent", "sub", "sub", "accent", "sub", "sub", "mute", "sub", "sub", "accent", "sub", "sub"]);
  assert.deepEqual(kinds("none"), ["normal", "sub", "sub", "normal", "sub", "sub", "mute", "sub", "sub", "normal", "sub", "sub"]);
});

test("tuner colours: green within ±5 cents, yellow within ±15, red beyond", async () => {
  const { tuneZone } = await import("../src/tools/music.ts");
  assert.deepEqual([0, 5, -5, 6, 15, -15, 16, -40].map(tuneZone), ["green", "green", "green", "yellow", "yellow", "yellow", "red", "red"]);
});

test("tool tabs: dragging moves a tool to its new place", async () => {
  const { moved } = await import("../src/tools/toolboxState.ts");
  assert.deepEqual(moved(["keyboard", "metronome", "tuner"], "tuner", 0), ["tuner", "keyboard", "metronome"]);
  assert.deepEqual(moved(["keyboard", "metronome", "tuner"], "keyboard", 2), ["metronome", "tuner", "keyboard"]);
  assert.deepEqual(moved(["keyboard", "metronome", "tuner"], "metronome", 9), ["keyboard", "tuner", "metronome"]);
  assert.deepEqual(moved(["keyboard"], "tuner", 0), ["keyboard"]);
});

test("live staff: pitches in ABC, chords from keys pressed together, a grand staff in bars of four", async () => {
  const { abcPitch, groupChords, liveAbc } = await import("../src/tools/liveStaff.ts");
  assert.deepEqual([60, 61, 72, 84, 48, 47, 59].map(abcPitch), ["C", "^C", "c", "c'", "C,", "B,,", "B,"]);
  assert.deepEqual(groupChords([{ midi: 64, time: 0 }, { midi: 60, time: 10 }, { midi: 67, time: 30 }, { midi: 62, time: 500 }]), [[60, 64, 67], [62]]);
  const abc = liveAbc([[60, 64, 67], [48], [62]]);
  assert.match(abc, /V:1\n\[CEG\] z D z \|\]/);
  assert.match(abc, /V:2 clef=bass\nz C, z z \|\]/);
  // it draws: two staves, the notes in the right places
  const { exampleData } = await import("../src/engine/abc.ts");
  assert.match(exampleData(abc), /<staffDef n="2"/);
});

test("keyboard layouts: Musical Typing and two-row piano (two hands, ~2½ octaves)", async () => {
  const { keyMidi, keyAction, keyLabelFor } = await import("../src/tools/keyLayouts.ts");
  const b = { high: 60, low: 48 };
  // Musical Typing: A = C4, W = C♯4, K = C5, Z/X octave, C/V loudness
  assert.deepEqual(["KeyA", "KeyW", "KeyK", "KeyZ"].map((k) => keyMidi("typing", k, b)), [60, 61, 72, null]);
  assert.equal(keyAction("typing", "KeyX"), "octUp");
  assert.equal(keyAction("typing", "KeyV"), "louder");
  // two rows: Z = C3 (left hand), S = C♯3, / = E4; Q = C4 (right hand), 2 = C♯4, ] = G5
  assert.deepEqual(["KeyZ", "KeyS", "KeyM", "Slash", "KeyQ", "Digit2", "KeyU", "KeyI", "BracketRight"].map((k) => keyMidi("tworow", k, b)), [48, 49, 59, 64, 60, 61, 71, 72, 79]);
  // in two rows Z X C V are notes; the arrows move the hands' octaves
  assert.equal(keyAction("tworow", "KeyZ"), null);
  assert.equal(keyAction("tworow", "ArrowDown"), "lowDown");
  assert.equal(keyAction("tworow", "ArrowRight"), "octUp");
  // labels on the virtual keys
  assert.equal(keyLabelFor("tworow", 48, b), "Z");
  assert.equal(keyLabelFor("tworow", 60, b), "Q"); // C4: both hands reach it; the right hand's key is shown
  assert.equal(keyLabelFor("tworow", 63, b), "3");
  assert.equal(keyLabelFor("typing", 60, b), "A");
});

test("live staff: Backspace takes off the last note or chord, a bar is four chords from the first, the staff shows the last two bars", async () => {
  const { chordStarts, dropLast, dropBar, liveAbc, groupChords } = await import("../src/tools/liveStaff.ts");
  // C, then an E-G chord (10 ms apart), then six more single notes: 8 chords = 2 bars
  const ons = [{ midi: 60, time: 0 }, { midi: 64, time: 500 }, { midi: 67, time: 510 }, ...[62, 65, 69, 71, 72, 74].map((m, i) => ({ midi: m, time: 1000 + i * 500 }))];
  assert.deepEqual(chordStarts(ons), [0, 1, 3, 4, 5, 6, 7, 8]);
  assert.equal(dropLast(ons).length, 8); // the last note
  assert.equal(dropLast(ons.slice(0, 3)).length, 1); // the E-G chord goes as one
  assert.equal(dropBar(ons).length, 5); // chords 5-8 (the second bar)
  assert.equal(dropBar(ons.slice(0, 5)).length, 0); // only one bar: all of it
  // a third bar starts at the 9th chord; the staff then shows bars 2 and 3
  const nine = [...ons, { midi: 76, time: 5000 }];
  const abc = liveAbc(groupChords(nine));
  assert.match(abc, /V:1\nA B c d \| e z z z \|\]/); // A4 B4 C5 D5 | E5

});

test("live staff: a chosen chord can be taken off, wherever it is", async () => {
  const { dropChord } = await import("../src/tools/liveStaff.ts");
  const ons = [{ midi: 60, time: 0 }, { midi: 64, time: 500 }, { midi: 67, time: 510 }, { midi: 62, time: 1000 }];
  assert.deepEqual(dropChord(ons, 1).map((e) => e.midi), [60, 62]); // the E-G chord, both notes
  assert.deepEqual(dropChord(ons, 0).map((e) => e.midi), [64, 67, 62]);
  assert.deepEqual(dropChord(ons, 9), ons);
});
