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
pixi run catalog      # rewrite the Library's music21 corpus catalogue
pixi run collections  # rewrite the open-licence collections catalogue
```

Without pixi: `cd frontend && npm install && npm run dev` (Node 24+), and `npm test` there.

## Deploying

`.github/workflows/pages.yml` tests and builds the site on every push and pull request, and deploys `frontend/dist` to
GitHub Pages from `main` (https://jackyko1991.github.io/polyphonizer/). learnkit is a private submodule, so the
checkout needs a read-only deploy key:

1. Add the public key as a read-only deploy key of `jackyko1991/learnkit` (Settings ▸ Deploy keys).
2. Add the private key as the secret `LEARNKIT_DEPLOY_KEY` of this repository (Settings ▸ Secrets ▸ Actions).
3. Settings ▸ Pages ▸ Source: GitHub Actions.
