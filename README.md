# Polyphonizer

Music scores written as code: Python with music21, engraved and played in the browser, checked by rules
(counterpoint, arranging), and laid out on A4 with page turns moved to rests. Free; everything runs in the browser
(Pyodide + music21 in a web worker, Verovio for engraving, WebAudio for playback).

Part of the learnkit series (Tensorizer, Formalizer, Clifford). learnkit is a private submodule at `vendor/learnkit`.

With [pixi](https://pixi.sh) (Node 24 as CI uses, and Python with music21), from the repo root:

```
pixi run dev          # the site with hot reload (installs frontend/node_modules first)
pixi run test         # unit tests (node --test)
pixi run build        # the static site in frontend/dist
pixi run test-runner  # the transcription runner's tests
pixi run runner       # the transcription runner on 127.0.0.1:8765 (once before, for PDFs: pixi run -e omr omr-setup)
```

The Library is a catalogue of pieces: it lists works from music21's corpus, open collections (OpenScore, Craig Sapp,
ASAP, the Josquin Research Project), the Mutopia Project and IMSLP, and links each to where it is opened or
downloaded. Its catalogue files (readable, in git) are rewritten by:

```
pixi run catalog      # music21's corpus                    frontend/src/library/catalog.json
pixi run collections  # the open collections (GITHUB_TOKEN)  frontend/src/library/collections.json
pixi run mutopia      # the Mutopia Project                  frontend/src/library/mutopia.json
pixi run imslp        # IMSLP's work list (~10 min, paced)   data/imslp.tsv
pixi run harmony      # When in Rome's analyses              frontend/src/library/analyses.json
pixi run aliases      # one spelling per composer            frontend/src/library/composerAliases.json
pixi run library-db   # all of them → library.sqlite and siblings.json (frontend/public/library; built, not in git)
```

`pixi run dev` and `pixi run build` build the database first, and so does the deploy. The page reads it over HTTP range
requests (only the pages a search needs). See docs/plans/open-libraries.md.

Without pixi: `cd frontend && npm install && npm run dev` (Node 24+), and `npm test` there; `node scripts/library-db.ts`
from the repo root builds the database.

## Deploying

`.github/workflows/pages.yml` tests and builds the site on every push and pull request, and deploys `frontend/dist` to
GitHub Pages from `main` (https://jackyko1991.github.io/polyphonizer/). learnkit is a private submodule, so the
checkout needs a read-only deploy key:

1. Add the public key as a read-only deploy key of `jackyko1991/learnkit` (Settings ▸ Deploy keys).
2. Add the private key as the secret `LEARNKIT_DEPLOY_KEY` of this repository (Settings ▸ Secrets ▸ Actions).
3. Settings ▸ Pages ▸ Source: GitHub Actions.
