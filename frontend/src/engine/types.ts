/** What the Python engine returns for a score (see prelude.py `_summary`). */
export interface NoteEvent {
  /** part index, top to bottom */
  part: number;
  measure: number;
  /** quarter notes from the start of the piece */
  offset: number;
  /** length in quarter notes */
  dur: number;
  /** MIDI numbers (several for a chord, none for a rest) */
  midi: number[];
  /** "C4", "E4 G4" or "rest" */
  name: string;
  tie: "start" | "continue" | "stop" | null;
  /** markings (markings.py `_note_marks`): down, up, staccato, finger:3, slur:start, breath, lyric:Twin … */
  marks?: string[];
}

export interface MeasureInfo {
  n: number;
  offset: number;
  length: number;
}

export interface ScoreData {
  musicxml: string;
  parts: string[];
  /** General MIDI program (0–127) per part, from its instrument or its name; null = unknown */
  programs: (number | null)[];
  notes: NoteEvent[];
  measures: MeasureInfo[];
  /** quarter notes per minute */
  bpm: number;
  time: string;
  key: string;
  title: string;
  /** the sustain pedal held, per part, in quarter notes (markings.py `pedal`) */
  pedals?: { part: number; from: number; to: number }[];
}
