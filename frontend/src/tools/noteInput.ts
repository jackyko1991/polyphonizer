/**
 * Every note played into the app, from any source (the virtual keyboard by mouse or touch, the computer keyboard,
 * a MIDI keyboard, later the microphone), as one stream. Step entry, recording and the Learn to Play lessons listen
 * here, so they don't care where the notes came from.
 */

export type NoteSource = "mouse" | "keys" | "midi" | "mic";
export interface NoteInput {
  midi: number;
  on: boolean;
  /** 0–1 */
  velocity: number;
  /** performance.now() in ms */
  time: number;
  source: NoteSource;
}

const listeners = new Set<(e: NoteInput) => void>();

export function subscribeNotes(f: (e: NoteInput) => void): () => void {
  listeners.add(f);
  return () => void listeners.delete(f);
}

export function publishNote(e: NoteInput) {
  listeners.forEach((f) => f(e));
}
