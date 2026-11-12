# Polyphonizer

Music scores written as code: Python with music21, engraved and played in the browser, checked by rules
(counterpoint, arranging), and laid out on A4 with page turns moved to rests. Free; everything runs in the browser
(Pyodide + music21 in a web worker, Verovio for engraving, WebAudio for playback).

Part of the learnkit series (Tensorizer, Formalizer, Clifford). learnkit is a private submodule at `vendor/learnkit`.

```
cd frontend && npm install && npm run dev   # site
npm test                                    # checker and page-turn planner (node --test)
```
