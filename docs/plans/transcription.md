# Notes from pictures and recordings

Transcribe (the scores panel, or a PDF, photo, recording or video dropped on the editor) turns a picture of printed
music into notes (optical music recognition, OMR) or a recording into notes (automatic music transcription). The
result is MusicXML or MIDI and is imported like any file. Nothing in the site does it alone: three routes, all
speaking one small protocol, so the site keeps one client (`frontend/src/transcribe/routes.ts`) and an address.

## The protocol

- `GET <base>/status` → `{ "omr": bool, "transcribe": bool, "version": "…" }`
- `POST <base>/omr` or `POST <base>/transcribe`: the file is the request body, its name in `X-Filename`
  (URI-encoded), its type in `Content-Type`. The answer is the notes: `application/vnd.recordare.musicxml+xml`,
  `application/vnd.recordare.musicxml` (.mxl) or `audio/midi`; or `{ "error": "…" }` with a 4xx/5xx status
  (501 when that engine is not installed).
- CORS for the site's origins (GitHub Pages, the Vite dev server) and `Access-Control-Allow-Private-Network` so the
  public HTTPS page may call 127.0.0.1.

## The routes (least effort first)

| Route | Does | How | Status |
|---|---|---|---|
| This browser | recordings only | Spotify Basic Pitch (`@spotify/basic-pitch`, Apache-2.0, TF.js) → MIDI; music21 quantises it into a score | next (needs the npm package and its model files, a few MB) |
| My computer | pages and recordings | the local runner, `pixi run runner` on 127.0.0.1:8765, like Ollama: KobiMusic copista (Apache-2.0, CPU, ~5–15 s a page) for OMR; Transkun (MIT, CPU) for piano | to build |
| Polyphonizer service | the same | the runner's code on a small CPU server, as a paid plan | later, if wanted |
| Hugging Face | the same | a Space speaking this protocol, duplicated to the learner's own account (free Spaces now need PRO; ZeroGPU gives callers only minutes a day) | optional |

Left out: LEGATO (weights gated under the Llama licence, ~20 GB GPU); MuScriptor (weights non-commercial, gated);
hosted APIs (Flat.io OMR: credits per page, no free tier; Klangio: on request) have no common interface, so they
would each need an adapter behind the service route. homr, Audiveris (AGPL) and YourMT3+ (GPL) are fine as optional
engines in the runner on the learner's own computer.

No open model goes from audio straight to notation yet: audio → MIDI, then quantising (music21) is the route.

Research, Nov 2026: copista's benchmark (error rate on quartet scans 8.7–11.2 % against LEGATO 58 % and Audiveris 67 %)
is its authors' own; see huggingface.co/kobimusic/copisteria, github.com/spotify/basic-pitch-ts,
github.com/Yujia-Yan/Transkun, huggingface.co/docs/hub/spaces-zerogpu.
