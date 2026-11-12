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
