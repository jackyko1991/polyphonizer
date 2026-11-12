# Agents that play music (planned)

Roadmap item: let an AI agent — the in-app AI agent panel, or any agent connected through our MCP server — perform
music on Polyphonizer's instruments with expression: choosing how loud each note is, how the tempo breathes, where the
pedal goes, and watching or hearing the virtual keyboard play it. Not started; these are the notes for when it is.

## Where it came from

A first try (Nov 2026): Claude played "Happy Birthday" on the virtual keyboard by sending pointer events to the
on-screen keys from a browser it was driving — F major, a soft waltz left hand, a swell to a held high C on "dear …",
a hushed last line that slows down, a rolled final chord. It worked and people enjoyed it, and it showed:

- The interesting part for an agent is the interpretation (dynamics, rubato, phrasing), not pressing keys; the
  performance should be data the agent writes, and the app plays.
- Faking input is fragile: timers in the page, a 37-key range to fit the arrangement into, a real click needed first
  to unlock audio, and it only works in a browser the agent drives.
- Velocity had to be added for the mouse (the keys now play louder nearer their front, `KeyboardTool.tsx`
  `pressVelocity`); before that every on-screen note was the same loudness.

## 1. A performance format, played by the app

- JSON, small and readable by people and agents:
  `{ tempo, meter, program, events: [{ at, dur, midi, vel }], pedal: [{ at, down }], tempoMap: [{ beat, factor }] }`
  with `at` / `dur` in beats (the tempo map turns beats into seconds, so rubato is separate from the notes).
- A player in `src/tools/` scheduled on the audio clock (`liveSound.ts` `now()`), not `setTimeout`, so the timing is
  exact; it presses the virtual keyboard's keys (lit, and on the live staff via `noteInput.publishNote`) and works for
  any instrument the keyboard has, outside the visible range too (it scrolls or just sounds).
- Loop, stop, and tempo controls; "Play" needs one click from a person (browsers allow sound only after one).
- Tests: the beat → seconds conversion with a tempo map, pedal holding notes, validation of bad input (unknown
  fields, notes out of range, too many events).

## 2. Expressive playback of scores

- The same engine plays a score: read music21's dynamics (`pp`…`ff`), hairpins, fermatas, accents, staccato, tempo
  marks and `rit.` / `accel.` into velocities and the tempo map, instead of playing every note at one loudness and
  speed. Helps every user, not only agents.
- An "Expressive" switch next to Play; plain playback stays the default for checking notes.
- Optional helper in prelude.py, e.g. `perform(score)` → the performance JSON, so code can shape it too.

## 3. Agents

- In-app AI agent panel: a `perform` capability (alongside the panel's other capabilities): the agent proposes a
  performance (JSON, or edits to a score's expression), the person presses Play. The agent can also explain its
  choices ("held the high C to make 'dear …' the peak").
- MCP server: a `perform` tool taking the same JSON (or a score + expression notes), plus `stop`; it plays in the
  person's open Polyphonizer tab through the local runner, so another agent (Claude Code, Claude Desktop, …) can play
  music for someone without driving a browser.
- Limits: a maximum length and note count, no sound without the person's click, the person can stop at any time,
  and nothing runs in the background after the tab closes.

## Learn

- A Learn page on expression: the same melody played flat and with feeling, the parts that make the difference
  (dynamics, rubato, articulation, pedal, voicing), each one switchable so learners hear what it adds.
