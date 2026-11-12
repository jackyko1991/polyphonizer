/**
 * The practice metronome: schedules ticks (metronomeCore.ts) a little ahead on the audio clock, so the beat stays
 * steady even when the page is busy. One metronome for the whole app; it keeps going while you change pages.
 */
import { tick, now, type ClickSound } from "./liveSound.ts";
import { DEFAULT_METRONOME, ticksBetween, type MetronomeSettings, type Tick } from "./metronomeCore.ts";
import { setRunning } from "./toolboxState.ts";

export interface MetronomeState extends MetronomeSettings {
  sound: ClickSound;
  volume: number;
  running: boolean;
}

const KEY = "polyphonizer.metronome";
let state: MetronomeState = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<MetronomeState> | null;
    return { ...DEFAULT_METRONOME, sound: "wood", volume: 1, ...saved, running: false } as MetronomeState;
  } catch {
    return { ...DEFAULT_METRONOME, sound: "wood", volume: 1, running: false } as MetronomeState;
  }
})();
const listeners = new Set<(s: MetronomeState) => void>();
const beatListeners = new Set<(t: Tick) => void>();

export const metronome = () => state;
export function onMetronome(f: (s: MetronomeState) => void) {
  listeners.add(f);
  return () => void listeners.delete(f);
}
/** called at each tick as it sounds (for the visual pulse) */
export function onTick(f: (t: Tick) => void) {
  beatListeners.add(f);
  return () => void beatListeners.delete(f);
}

let timer: number | null = null;
let origin = 0;
let scheduledTo = 0;
const LOOKAHEAD = 0.12;

function schedule() {
  const t = now();
  for (const k of ticksBetween(state, origin, scheduledTo, t + LOOKAHEAD)) {
    if (k.kind !== "mute") tick(k.time, k.kind, state.sound, state.volume);
    window.setTimeout(() => beatListeners.forEach((f) => f(k)), Math.max(0, (k.time - now()) * 1000));
  }
  scheduledTo = t + LOOKAHEAD;
}

export function setMetronome(change: Partial<MetronomeState>) {
  const wasRunning = state.running;
  const tempoChanged = change.bpm !== undefined && change.bpm !== state.bpm;
  state = { ...state, ...change };
  if (state.running && !wasRunning) {
    origin = now() + 0.06;
    scheduledTo = origin;
    schedule();
    timer = window.setInterval(schedule, 25);
  } else if (!state.running && wasRunning && timer !== null) {
    window.clearInterval(timer);
    timer = null;
  } else if (state.running && (tempoChanged || change.sub !== undefined)) {
    // restart the grid from the next tick, so a new tempo takes effect at once without a stumble
    origin = Math.max(now() + 0.03, scheduledTo);
    scheduledTo = origin;
  }
  setRunning("metronome", state.running);
  try {
    const { running: _r, ...keep } = state;
    void _r;
    localStorage.setItem(KEY, JSON.stringify(keep));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((f) => f(state));
}
