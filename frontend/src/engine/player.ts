/**
 * Playback with WebAudio, each part on its own instrument (sound.ts): recorded General MIDI samples (smplr, from the
 * midi-js-soundfonts sets, cached in the browser after the first download), or a small built-in synth whose tone
 * follows the instrument family (bowed, blown, plucked …) and needs no download. Playing notes are coloured in
 * the score.
 */
import type { Sound } from "./engrave.ts";
import { programOf, soundSettings, type Kit, GM } from "./sound.ts";

type Sampler = { start(e: { note: number; time: number; duration: number; velocity: number; detune: number }): unknown; stop(): void };

let ctx: AudioContext | null = null;
/** instruments connect here once; each playback connects the bus to its own output chain */
let bus: GainNode | null = null;
let stopAll: (() => void) | null = null;
const samplers = new Map<string, Promise<Sampler | null>>();

function audio(): { ac: AudioContext; bus: GainNode } {
  ctx ??= new AudioContext();
  bus ??= ctx.createGain();
  return { ac: ctx, bus };
}

/** load (once) the samples for one instrument; null if they can't be fetched (then the synth plays it) */
function sampler(kit: Kit, program: number): Promise<Sampler | null> {
  const key = `${kit}:${program}`;
  let p = samplers.get(key);
  if (!p) {
    const { ac, bus: dest } = audio();
    p = import("smplr")
      .then(async ({ Soundfont, CacheStorage }) => {
        const inst = Soundfont(ac, { instrument: GM[program], kit, destination: dest, storage: CacheStorage("polyphonizer-sounds") });
        await inst.load;
        return inst as unknown as Sampler;
      })
      .catch((e) => {
        console.warn("[polyphonizer] samples unavailable, using the synth:", GM[program], e);
        samplers.delete(key);
        return null;
      });
    samplers.set(key, p);
  }
  return p;
}

/** a decaying noise burst as a room's impulse response */
function room(ac: AudioContext, seconds = 2.2): AudioBuffer {
  const len = Math.round(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  return buf;
}
let impulse: AudioBuffer | null = null;

type Family = "bowed" | "plucked" | "struck" | "flute" | "reed" | "brass" | "voice" | "organ";
function family(program: number): Family {
  if (program === 45 || program === 46 || (program >= 24 && program <= 39) || (program >= 104 && program <= 108)) return "plucked";
  if (program < 16 || program === 47 || program >= 112) return "struck";
  if ((program >= 40 && program <= 51) || program === 110) return "bowed";
  if (program >= 52 && program <= 54) return "voice";
  if (program >= 56 && program <= 63) return "brass";
  if (program >= 64 && program <= 71) return "reed";
  if (program >= 72 && program <= 79) return "flute";
  return "organ";
}

/** one synth note, shaped by its instrument family */
function synthNote(ac: AudioContext, out: AudioNode, f: Family, hz: number, start: number, dur: number, gain: number) {
  const end = start + dur;
  const g = ac.createGain();
  g.connect(out);
  const env = g.gain;
  env.setValueAtTime(0, start);
  const sustained = f !== "plucked" && f !== "struck";
  const attack = { bowed: 0.07, voice: 0.08, flute: 0.05, reed: 0.03, brass: 0.04, organ: 0.01, plucked: 0.004, struck: 0.003 }[f];
  env.linearRampToValueAtTime(gain, start + attack);
  if (sustained) {
    env.setTargetAtTime(gain * 0.75, start + attack, 0.1);
    env.setTargetAtTime(0, end - 0.02, 0.05);
  } else {
    env.setTargetAtTime(0, start + attack, f === "plucked" ? 0.45 : 0.7);
    env.setTargetAtTime(0, end, 0.08);
  }
  // timbre: oscillator shapes, and a low-pass filter that takes the edge off bright waves
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = { bowed: 2600, voice: 1800, flute: 3000, reed: 1700, brass: 1200, organ: 4000, plucked: 3000, struck: 5000 }[f];
  if (f === "brass") lp.frequency.linearRampToValueAtTime(3200, start + 0.12);
  lp.connect(g);
  const waves: [OscillatorType, number, number][] = {
    bowed: [["sawtooth", 0, 0.5], ["sawtooth", 6, 0.35]],
    voice: [["triangle", 0, 0.8], ["sine", 3, 0.4]],
    flute: [["sine", 0, 0.9], ["triangle", 2, 0.25]],
    reed: [["square", 0, 0.4], ["triangle", 3, 0.4]],
    brass: [["sawtooth", 0, 0.6], ["sawtooth", -5, 0.3]],
    organ: [["sine", 0, 0.6], ["sine", 1200, 0.25], ["triangle", 1902, 0.1]],
    plucked: [["triangle", 0, 0.8], ["sine", 1200, 0.2]],
    struck: [["triangle", -3, 0.6], ["sine", 4, 0.6]],
  }[f] as [OscillatorType, number, number][];
  // vibrato for the instruments that use it, after the note has settled
  let lfo: OscillatorNode | null = null;
  const depth = ac.createGain();
  if (f === "bowed" || f === "voice" || f === "flute") {
    lfo = ac.createOscillator();
    lfo.frequency.value = 5.5;
    depth.gain.setValueAtTime(0, start);
    depth.gain.linearRampToValueAtTime(f === "flute" ? 6 : 12, start + Math.min(0.35, dur * 0.6));
    lfo.connect(depth);
    lfo.start(start);
    lfo.stop(end + 0.4);
  }
  for (const [type, cents, level] of waves) {
    const o = ac.createOscillator();
    const lg = ac.createGain();
    lg.gain.value = level;
    o.type = type;
    o.frequency.value = hz;
    o.detune.value = cents;
    if (lfo) depth.connect(o.detune);
    o.connect(lg);
    lg.connect(lp);
    o.start(start);
    o.stop(end + 0.5);
  }
}

/** Learn's practice aids: a click on every beat (louder on the first of the bar), and one passage on a loop. */
export interface Practice {
  click: boolean;
  /** the bars (quarter notes from the start) and the time signature, from the score summary */
  measures: { offset: number; length: number }[];
  time: string;
  /** where the last sounding note ends, in quarter notes: with the engraving's times it gives the length of a beat */
  endQ: number;
  /** play only [from, to) (quarter notes), over and over until stopped */
  loop: { from: number; to: number } | null;
  /** the score's part names: the aids apply only to a playback of this score (not to a page's small examples) */
  parts: string[];
  /** the score's notes with their markings: staccato, spiccato and pizzicato notes play short (pizzicato plucked) */
  notes?: { part: number; offset: number; midi: number[]; marks?: string[] }[];
  /** the sustain pedal held (quarter notes): notes ring on until it is lifted */
  pedals?: { part: number; from: number; to: number }[];
}
let active: Practice | null = null;
/** set (or clear, with null) the practice aids for the next playback */
export function setPractice(p: Practice | null) {
  active = p;
}

/** milliseconds per quarter note, from the engraving's timing and the score's length in quarters */
function quarterMs(sounds: Sound[], practice: Practice): number {
  if ( practice.endQ <= 0 || !sounds.length) return 0;
  return Math.max(...sounds.map((s) => s.time + s.duration)) / practice.endQ;
}

/** how long a note sounds (ms) given its markings and the pedal, and whether it is plucked */
function performed(p: Practice, s: Sound, qMs: number): { ms: number; plucked: boolean } {
  const q = s.time / qMs;
  const note = p.notes?.find((n) => n.part === s.staff && Math.abs(n.offset - q) < 0.02 && n.midi.includes(s.pitch));
  const marks = note?.marks ?? [];
  const plucked = marks.includes("pizz");
  let ms = s.duration;
  if (plucked) ms = Math.min(ms, 0.35 * qMs);
  else if (marks.includes("staccato") || marks.includes("spiccato")) ms *= 0.45;
  const held = p.pedals?.find((d) => d.part === s.staff && d.from <= q + 1e-6 && q < d.to - 1e-6);
  if (held && !plucked) ms = Math.max(ms, held.to * qMs - s.time - 30);
  return { ms, plucked };
}

/** quarter notes per beat: a dotted quarter in 6/8, 9/8 and 12/8, else the bottom number's note */
export function beatLength(time: string): number {
  const m = /^(\d+)\/(\d+)$/.exec(time);
  if (!m) return 1;
  const [top, bottom] = [Number(m[1]), Number(m[2])];
  return bottom === 8 && top % 3 === 0 && top > 3 ? 1.5 : 4 / bottom;
}

/** the beats between two times (ms), each with whether it starts a bar */
function beats(p: Practice, qMs: number, fromMs: number, toMs: number): [number, boolean][] {
  const out: [number, boolean][] = [];
  const unit = beatLength(p.time);
  for (const m of p.measures) {
    for (let q = 0; q < m.length - 1e-6; q += unit) {
      const ms = (m.offset + q) * qMs;
      if (ms >= fromMs - 1 && ms < toMs - 1) out.push([ms, q === 0]);
    }
  }
  return out;
}

/** a short woodblock-like tick */
function click(ac: AudioContext, out: AudioNode, at: number, accent: boolean) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "square";
  o.frequency.value = accent ? 1760 : 1175;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(accent ? 0.35 : 0.2, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + 0.06);
}

export function stop() {
  stopAll?.();
  stopAll = null;
}

export interface PlayOptions {
  /** part names, top to bottom (keys of the per-part sound settings) */
  parts: string[];
  /** General MIDI program per part from the score */
  programs: (number | null)[];
  /** called while samples download */
  onLoading?: (loading: boolean) => void;
}

/** play from `fromMs`; `onNote(id, on)` marks notes; resolves when done or stopped */
export async function play(sounds: Sound[], onNote: (id: string, on: boolean) => void, fromMs = 0, opts: PlayOptions): Promise<void> {
  stop();
  const settings = soundSettings();
  const { ac, bus: input } = audio();
  void ac.resume();
  const staffs = [...new Set(sounds.map((s) => s.staff))];
  const partOf = (staff: number) => {
    const name = opts.parts[staff] ?? `Part ${staff + 1}`;
    const ps = settings.parts[name] ?? {};
    return { program: programOf(name, opts.programs[staff], settings), volume: ps.mute ? 0 : (ps.volume ?? 1) };
  };

  // samples first (they may need downloading); a part whose samples fail falls back to the synth
  const inst = new Map<number, Sampler | null>();
  if (settings.engine === "samples") {
    let cancelled = false;
    stopAll = () => {
      cancelled = true;
    };
    opts.onLoading?.(true);
    await Promise.all(staffs.map(async (st) => inst.set(st, await sampler(settings.kit, partOf(st).program))));
    opts.onLoading?.(false);
    if (cancelled) return;
  }

  // output: master volume, then dry + reverb
  const master = ac.createGain();
  master.gain.value = 1;
  const dry = ac.createGain();
  dry.gain.value = 1 - settings.reverb * 0.5;
  const wet = ac.createGain();
  wet.gain.value = settings.reverb * 0.9;
  const verb = ac.createConvolver();
  impulse ??= room(ac);
  verb.buffer = impulse;
  master.connect(dry).connect(ac.destination);
  master.connect(verb).connect(wet).connect(ac.destination);
  input.connect(master);
  const synthOut = ac.createGain();
  synthOut.gain.value = 0.16;
  synthOut.connect(master);

  const detune = 1200 * Math.log2(settings.a4 / 440);
  const t0 = ac.currentTime + 0.08;
  const timers: number[] = [];
  let end = 0;
  // practice (Learn): one bar on a loop, and a click on every beat
  const practice = active && active.parts.length && active.parts.join("\n") === opts.parts.join("\n") ? active : null;
  const qMs = practice ? quarterMs(sounds, practice) : 0;
  const loop = practice?.loop && qMs ? { from: practice.loop.from * qMs, to: practice.loop.to * qMs } : null;
  const rounds = loop ? Math.max(4, Math.min(32, Math.ceil(40000 / (loop.to - loop.from)))) : 1;
  const span = loop ? loop.to - loop.from : 0;
  const start0 = loop ? loop.from : fromMs;
  const list = loop ? sounds.filter((s) => s.time >= loop.from - 1 && s.time < loop.to - 1) : sounds.filter((s) => s.time + s.duration >= fromMs);
  for (let round = 0; round < rounds; round++) {
    for (const s of list) {
      const part = partOf(s.staff);
      const at = Math.max(0, s.time - start0) + round * span;
      const start = t0 + at / 1000;
      const how = practice && qMs ? performed(practice, s, qMs) : { ms: s.duration, plucked: false };
      const dur = Math.max(0.05, (loop ? Math.min(how.ms, loop.to - s.time) : how.ms) / 1000);
      if (part.volume > 0) {
        const sm = inst.get(s.staff);
        if (sm) sm.start({ note: s.pitch, time: start, duration: dur, velocity: Math.min(127, Math.round(90 * part.volume)), detune });
        else synthNote(ac, synthOut, how.plucked ? "plucked" : family(part.program), settings.a4 * 2 ** ((s.pitch - 69) / 12), start, dur, part.volume);
      }
      timers.push(window.setTimeout(() => onNote(s.id, true), at + 80));
      timers.push(window.setTimeout(() => onNote(s.id, false), at + dur * 1000 + 60));
      end = Math.max(end, at + dur * 1000);
    }
  }
  if (practice?.click && qMs) {
    for (const [beat, accent] of beats(practice, qMs, start0, loop ? start0 + span : start0 + end)) {
      for (let round = 0; round < rounds; round++) click(ac, master, t0 + (beat - start0 + round * span) / 1000, accent);
    }
  }
  return new Promise<void>((done) => {
    const teardown = () => {
      master.gain.setTargetAtTime(0, ac.currentTime, 0.03);
      window.setTimeout(() => {
        input.disconnect(master);
        master.disconnect();
      }, 400);
    };
    const finish = window.setTimeout(() => {
      stopAll = null;
      teardown();
      done();
    }, end + 2500);
    stopAll = () => {
      timers.forEach(clearTimeout);
      clearTimeout(finish);
      inst.forEach((sm) => sm?.stop());
      teardown();
      sounds.forEach((s) => onNote(s.id, false));
      done();
    };
  });
}
