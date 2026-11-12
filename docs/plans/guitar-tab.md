# Guitar tablature (planned)

Roadmap item: any melody or part shown as guitar tab, under the notation or instead of it, with the string and fret
of each note chosen so the hand moves as little as possible. Not started; these are the notes for when it is.

## Rendering

- Verovio draws tablature from MEI tab staves (`staffDef` with `notationtype="tab.guitar"`, `tab.strings`, and
  `@tab.course` / `@tab.fret` on notes).
- Spike first: check how well Verovio reads MusicXML TAB staves (`<staff-details>` with `<staff-lines>6` and
  `<staff-tuning>`, and `<technical><string>` / `<fret>` on notes). If it is weak, write the tab staff into the MEI
  ourselves, the way `engravePages` already writes `<sb/>` / `<pb/>`.
- Notation with tab underneath = two staves of the same part: the normal staff and a tab staff.

## Fingering: a dynamic program, like pageTurns.ts

- State per note: (string, fret) among the positions that sound that pitch in the tuning (and capo).
- Cost of moving from one position to the next: the position shift (fret distance of the hand), string jumps, and
  stretches beyond the allowed span; a small bonus for open strings; a large cost when a requested constraint
  (first position, maximum stretch) is broken.
- Chords: all notes on different strings, within the stretch; choose per chord.
- Unit tests with hand-checked passages (open-position C major scale, a melody that must shift, a chord shape),
  as tests/pageTurns.test.ts does for page turns.

## music21

- `articulations.StringIndication` / `FretIndication` can carry the choice, and music21 writes them to MusicXML
  `<technical>`; `instrument.Guitar` / `ElectricBass` / `Ukulele` give the default tunings.

## Learn

- New checker rules: `playableOn(tuning)`, `maxStretch(frets)`, `position(n)` (every note within frets n…n+3).
- Problems: make this melody playable in first position; choose a fingering with no shifts; transpose a tune so it
  uses the open strings.

## Tunings and instruments

- Standard E A D G B E, drop D, DADGAD, open G; capo 1–7.
- Bass (4 or 5 strings), ukulele (G C E A, re-entrant), lute (later).
