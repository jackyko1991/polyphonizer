/**
 * Playback with WebAudio: a small synth (two detuned oscillators, a soft envelope) per note of Verovio's timeline,
 * and the playing notes coloured in the score. No samples to download, so it works offline.
 */
import type { Sound } from "./engrave.ts";

let ctx: AudioContext | null = null;
let stopAll: (() => void) | null = null;

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function stop() {
  stopAll?.();
  stopAll = null;
}

/** play from `fromMs`; `onNote(id, on)` marks notes; resolves when done or stopped */
export function play(sounds: Sound[], onNote: (id: string, on: boolean) => void, fromMs = 0): Promise<void> {
  stop();
  ctx ??= new AudioContext();
  const ac = ctx;
  void ac.resume();
  const t0 = ac.currentTime + 0.08;
  const master = ac.createGain();
  master.gain.value = 0.18;
  master.connect(ac.destination);
  const timers: number[] = [];
  let end = 0;
  for (const s of sounds) {
    if (s.time + s.duration < fromMs) continue;
    const start = t0 + Math.max(0, s.time - fromMs) / 1000;
    const dur = Math.max(0.05, s.duration / 1000);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(1, start + 0.02);
    g.gain.setTargetAtTime(0.6, start + 0.03, 0.08);
    g.gain.setTargetAtTime(0, start + dur * 0.92, 0.04);
    g.connect(master);
    for (const [type, detune] of [
      ["triangle", -4],
      ["sine", 5],
    ] as const) {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = hz(s.pitch);
      o.detune.value = detune;
      o.connect(g);
      o.start(start);
      o.stop(start + dur + 0.3);
    }
    const onAt = Math.max(0, s.time - fromMs);
    timers.push(window.setTimeout(() => onNote(s.id, true), onAt + 80));
    timers.push(window.setTimeout(() => onNote(s.id, false), onAt + s.duration + 60));
    end = Math.max(end, onAt + s.duration);
  }
  return new Promise<void>((done) => {
    const finish = window.setTimeout(() => {
      stopAll = null;
      done();
    }, end + 400);
    stopAll = () => {
      timers.forEach(clearTimeout);
      clearTimeout(finish);
      master.gain.setTargetAtTime(0, ac.currentTime, 0.03);
      window.setTimeout(() => master.disconnect(), 300);
      sounds.forEach((s) => onNote(s.id, false));
      done();
    };
  });
}
