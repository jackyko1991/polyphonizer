# Notes from pictures and recordings

Transcribe (the scores panel, or a PDF, photo, recording or video dropped on the editor) turns a picture of printed
music into notes (optical music recognition, OMR) or a recording into notes (automatic music transcription). The
result is MusicXML or MIDI and is imported like any file. Nothing in the site does it alone: three routes, all
speaking one small protocol, so the site keeps one client (`frontend/src/transcribe/routes.ts`) and an address.

## The protocol

- `GET <base>/status` → `{ "omr": bool, "transcribe": bool, "instruments": ["piano", "other"], "device": "cuda" | "mps" | "cpu" | null, "version": "…" }`
- `POST <base>/omr` or `POST <base>/transcribe[?instrument=piano|other]`: the file is the request body, its name in `X-Filename`
  (URI-encoded), its type in `Content-Type`. The answer is the notes: `application/vnd.recordare.musicxml+xml`,
  `application/vnd.recordare.musicxml` (.mxl) or `audio/midi`; or `{ "error": "…" }` with a 4xx/5xx status
  (501 when that engine is not installed).
- CORS for the site's origins (GitHub Pages, the Vite dev server) and `Access-Control-Allow-Private-Network` so the
  public HTTPS page may call 127.0.0.1.

## The routes (least effort first)

| Route | Does | How | Status |
|---|---|---|---|
| This browser | recordings only | Spotify Basic Pitch (`@spotify/basic-pitch`, Apache-2.0, TF.js) → MIDI; music21 quantises it into a score | next (needs the npm package and its model files, a few MB) |
| My computer | pages and recordings | the local runner, `pixi run runner` on 127.0.0.1:8765: KobiMusic copista (Apache-2.0, CPU, ~5–15 s a page) for OMR (`pixi run -e omr omr-setup`); for recordings `runner/engines/audio.py` (`pixi run -e audio audio-setup`): Transkun (MIT) for piano, Basic Pitch's ONNX model (Apache-2.0) for other instruments, then notation (beat, metre, quantising, two staves, key) → MusicXML; on CUDA or the Apple GPU when there is one | built |
| My server | the same | the same runner on a VPS (Docker; `--build-arg TORCH=cu124` and `--gpus all` for an NVIDIA GPU) or a Mac (native, Apple GPU, through Tailscale), with `PZ_TOKEN`; the site takes its HTTPS address | built |
| Polyphonizer service | the same | the runner's code on our server, as part of Pro | later (Pro) |
| Hugging Face | the same | a Space speaking this protocol, duplicated to the learner's own account (free Spaces now need PRO; ZeroGPU gives callers only minutes a day) | optional |

Left out: LEGATO (weights gated under the Llama licence, ~20 GB GPU); MuScriptor (weights non-commercial, gated);
hosted APIs (Flat.io OMR: credits per page, no free tier; Klangio: on request) have no common interface, so they
would each need an adapter behind the service route. homr, Audiveris (AGPL) and YourMT3+ (GPL) are fine as optional
engines in the runner on the learner's own computer.

No open model goes from audio straight to notation yet: audio → MIDI, then quantising (music21) is the route.

Research, Nov 2026: copista's benchmark (error rate on quartet scans 8.7–11.2 % against LEGATO 58 % and Audiveris 67 %)
is its authors' own; see huggingface.co/kobimusic/copisteria, github.com/spotify/basic-pitch-ts,
github.com/Yujia-Yan/Transkun, huggingface.co/docs/hub/spaces-zerogpu.

Sound to score, Nov 2026 (runner/engines/audio.py). Measured on synthesised test recordings (a Bach chorale, a minuet;
onset F1 with mir_eval): Transkun 0.96–1.00; Basic Pitch 0.93–0.98 with onset 0.6 / frame 0.5 / 150 ms (its defaults
give 0.76–0.78: overtones taken for notes). Basic Pitch's package pins TensorFlow < 2.15.1 (no wheels for Python 3.12+),
so it is installed without dependencies and runs its bundled ONNX model. Transkun on an M-series Mac: 3 min of audio in
~10 s on the GPU (mps), ~25 s on the CPU. The notation step finds the metre and the first beat on these recordings
(4/4 with the chorale's one-beat pickup; the minuet in 3/4); very short clips (a few bars) fall back to 4/4.
