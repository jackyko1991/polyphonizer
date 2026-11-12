/**
 * What playback sounds like: the General MIDI instrument of each part (from the score, or chosen in the Pro sound
 * settings), the sample set, tuning and reverb. Settings stay in this browser (localStorage).
 */
import { useEffect, useState } from "react";

/** General MIDI programs 0–127, named as the sample sets (midi-js-soundfonts) name their files */
export const GM = [
  "acoustic_grand_piano", "bright_acoustic_piano", "electric_grand_piano", "honkytonk_piano", "electric_piano_1",
  "electric_piano_2", "harpsichord", "clavinet", "celesta", "glockenspiel", "music_box", "vibraphone", "marimba",
  "xylophone", "tubular_bells", "dulcimer", "drawbar_organ", "percussive_organ", "rock_organ", "church_organ",
  "reed_organ", "accordion", "harmonica", "tango_accordion", "acoustic_guitar_nylon", "acoustic_guitar_steel",
  "electric_guitar_jazz", "electric_guitar_clean", "electric_guitar_muted", "overdriven_guitar", "distortion_guitar",
  "guitar_harmonics", "acoustic_bass", "electric_bass_finger", "electric_bass_pick", "fretless_bass", "slap_bass_1",
  "slap_bass_2", "synth_bass_1", "synth_bass_2", "violin", "viola", "cello", "contrabass", "tremolo_strings",
  "pizzicato_strings", "orchestral_harp", "timpani", "string_ensemble_1", "string_ensemble_2", "synth_strings_1",
  "synth_strings_2", "choir_aahs", "voice_oohs", "synth_choir", "orchestra_hit", "trumpet", "trombone", "tuba",
  "muted_trumpet", "french_horn", "brass_section", "synth_brass_1", "synth_brass_2", "soprano_sax", "alto_sax",
  "tenor_sax", "baritone_sax", "oboe", "english_horn", "bassoon", "clarinet", "piccolo", "flute", "recorder",
  "pan_flute", "blown_bottle", "shakuhachi", "whistle", "ocarina", "lead_1_square", "lead_2_sawtooth",
  "lead_3_calliope", "lead_4_chiff", "lead_5_charang", "lead_6_voice", "lead_7_fifths", "lead_8_bass__lead",
  "pad_1_new_age", "pad_2_warm", "pad_3_polysynth", "pad_4_choir", "pad_5_bowed", "pad_6_metallic", "pad_7_halo",
  "pad_8_sweep", "fx_1_rain", "fx_2_soundtrack", "fx_3_crystal", "fx_4_atmosphere", "fx_5_brightness",
  "fx_6_goblins", "fx_7_echoes", "fx_8_scifi", "sitar", "banjo", "shamisen", "koto", "kalimba", "bagpipe", "fiddle",
  "shanai", "tinkle_bell", "agogo", "steel_drums", "woodblock", "taiko_drum", "melodic_tom", "synth_drum",
  "reverse_cymbal", "guitar_fret_noise", "breath_noise", "seashore", "bird_tweet", "telephone_ring", "helicopter",
  "applause", "gunshot",
] as const;

/** the 16 General MIDI families, 8 programs each: [English, Traditional Chinese] */
export const GM_FAMILIES: readonly (readonly [string, string])[] = [
  ["Piano", "鋼琴"], ["Chromatic percussion", "有音高敲擊樂器"], ["Organ", "風琴"], ["Guitar", "吉他"],
  ["Bass", "低音"], ["Strings", "弦樂"], ["Ensemble", "合奏"], ["Brass", "銅管"], ["Reed", "簧管"],
  ["Pipe", "笛類"], ["Synth lead", "合成主音"], ["Synth pad", "合成襯底"], ["Synth effects", "合成音效"],
  ["Ethnic", "民族樂器"], ["Percussive", "敲擊"], ["Sound effects", "音效"],
];

/** "acoustic_grand_piano" → "Acoustic grand piano" */
export const gmLabel = (program: number) => {
  const s = GM[program].replace(/_+/g, " ");
  return s[0].toUpperCase() + s.slice(1);
};

export type Kit = "MusyngKite" | "FluidR3_GM";
export interface PartSound {
  /** General MIDI program; unset = the score's own instrument */
  program?: number;
  /** 0–1.5, 1 = as written */
  volume?: number;
  mute?: boolean;
}
export interface SoundSettings {
  /** recorded samples (downloaded once, then cached) or the built-in synth (offline) */
  engine: "samples" | "synth";
  kit: Kit;
  /** pitch of A4 in Hz (orchestras often tune to 442; Baroque pitch 415) */
  a4: number;
  /** 0–1 */
  reverb: number;
  /** while playing: a line follows the music; the sounding notes light up */
  cursor?: boolean;
  highlight?: boolean;
  /** by part name, so a choice survives re-running the code */
  parts: Record<string, PartSound>;
}

export const DEFAULT_SOUND: SoundSettings = { engine: "samples", kit: "MusyngKite", a4: 440, reverb: 0.2, parts: {} };
const KEY = "polyphonizer.sound";

let current: SoundSettings = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<SoundSettings> | null;
    return { ...DEFAULT_SOUND, ...saved, parts: { ...saved?.parts } };
  } catch {
    return DEFAULT_SOUND;
  }
})();
const listeners = new Set<(s: SoundSettings) => void>();

export const soundSettings = () => current;

export function setSoundSettings(change: Partial<SoundSettings>) {
  current = { ...current, ...change };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((f) => f(current));
}

export function setPartSound(name: string, change: PartSound | null) {
  const parts = { ...current.parts };
  if (change === null) delete parts[name];
  else parts[name] = { ...parts[name], ...change };
  setSoundSettings({ parts });
}

export function useSoundSettings(): SoundSettings {
  const [s, setS] = useState(current);
  useEffect(() => {
    listeners.add(setS);
    setS(current);
    return () => void listeners.delete(setS);
  }, []);
  return s;
}

/** a guess from the part's name, when the engine gave no program: [pattern, program] */
const BY_NAME: [RegExp, number][] = [
  [/piccolo/i, 72], [/flute|flauto|長笛/i, 73], [/recorder/i, 74], [/oboe/i, 68], [/english horn|cor anglais/i, 69],
  [/clarinet/i, 71], [/bassoon|fagott/i, 70], [/sax/i, 65], [/horn|corno/i, 60], [/trumpet|tromba/i, 56],
  [/trombone/i, 57], [/tuba/i, 58], [/violin|violino|小提琴/i, 40], [/viola|中提琴/i, 41], [/cello|violoncello|大提琴/i, 42],
  [/contrabass|double bass|basso/i, 43], [/harp/i, 46], [/guitar/i, 24], [/harpsichord|cembalo/i, 6], [/organ/i, 19],
  [/soprano|alto|tenor|bass|voice|choir|chorus/i, 52], [/piano|鋼琴/i, 0],
];
const guess = (name: string) => BY_NAME.find(([re]) => re.test(name))?.[1];

/** the program a part plays with: the Pro choice, else the score's, else a guess from its name, else piano */
export const programOf = (name: string, fromScore: number | null | undefined, s = current) =>
  s.parts[name]?.program ?? fromScore ?? guess(name) ?? 0;
