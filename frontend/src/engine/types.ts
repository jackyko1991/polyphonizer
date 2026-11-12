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
}

export interface MeasureInfo {
  n: number;
  offset: number;
  length: number;
}

export interface ScoreData {
  musicxml: string;
  parts: string[];
  notes: NoteEvent[];
  measures: MeasureInfo[];
  /** quarter notes per minute */
  bpm: number;
  time: string;
  key: string;
  title: string;
}
