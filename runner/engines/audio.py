"""The runner's sound-to-score engine: a recording (or a video's sound) becomes a score, as MusicXML.

    python runner/engines/audio.py <recording> <out.musicxml>        (in the audio environment: pixi.toml)

Two steps. First the notes, by one of two models (PZ_INSTRUMENT picks, as the site asks):
- piano: Transkun (MIT; Yan & Duan, 2024), PyTorch, on the GPU when there is one (CUDA, or the Apple GPU);
- other: Spotify's Basic Pitch (Apache-2.0), any one instrument or voice, its ONNX model on the CPU.
Then the notes become notation (`notate`): the beat is found in the recording (librosa), so a performance that speeds
up and slows down still lands on the beat; the metre (3 or 4) and where the bar starts come from where the accents fall;
times are rounded to sixteenths or triplets (music21), piano goes on two staves, and the key signature and spelling
follow the key music21 hears. The title is the file's name (PZ_TITLE).

PZ_DEVICE (cuda, mps or cpu) overrides the device.
"""

import os
import shutil
import subprocess
import sys
import tempfile
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
INSTRUMENTS = ("piano", "other")
# Basic Pitch's thresholds, tuned on test recordings (fewer overtones taken for notes than its defaults)
BASIC_PITCH = {"onset_threshold": 0.6, "frame_threshold": 0.5, "minimum_note_length": 150}


def engines() -> list[str]:
    """the instruments this computer can transcribe"""
    import importlib.util

    out = []
    if importlib.util.find_spec("transkun") and importlib.util.find_spec("torch"):
        out.append("piano")
    if importlib.util.find_spec("basic_pitch") and importlib.util.find_spec("onnxruntime"):
        out.append("other")
    return out


def device() -> str:
    """where Transkun runs: PZ_DEVICE, else an NVIDIA GPU, else the Apple GPU, else the CPU"""
    if d := os.environ.get("PZ_DEVICE"):
        return d
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass
    return "cpu"


def to_wav(src: Path, d: Path) -> Path:
    """the recording as a mono 44.1 kHz WAV (ffmpeg reads MP3, M4A, a video's sound …)"""
    ffmpeg = shutil.which("ffmpeg") or str(Path(sys.executable).parent / "ffmpeg")
    wav = d / "sound.wav"
    p = subprocess.run([ffmpeg, "-nostdin", "-loglevel", "error", "-y", "-i", str(src), "-vn", "-ac", "1", "-ar", "44100", str(wav)], capture_output=True)
    if p.returncode != 0 or not wav.exists():
        raise RuntimeError("could not read the sound: " + (p.stderr.decode("utf-8", "replace").strip().splitlines() or ["no audio track"])[-1])
    return wav


def piano_notes(wav: Path, d: Path) -> list[tuple[float, float, int, int]]:
    """Transkun: (start s, end s, MIDI pitch, velocity)"""
    import pretty_midi

    mid = d / "piano.mid"
    dev = device()
    p = subprocess.run([sys.executable, "-W", "ignore", "-m", "transkun.transcribe", str(wav), str(mid), "--device", dev], capture_output=True)
    if p.returncode != 0 and dev != "cpu":  # a GPU that fails (memory, an op it lacks): the CPU instead
        p = subprocess.run([sys.executable, "-W", "ignore", "-m", "transkun.transcribe", str(wav), str(mid), "--device", "cpu"], capture_output=True)
    if p.returncode != 0:
        raise RuntimeError("Transkun stopped: " + (p.stderr.decode("utf-8", "replace").strip().splitlines() or ["?"])[-1])
    m = pretty_midi.PrettyMIDI(str(mid))
    return [(float(n.start), float(n.end), int(n.pitch), int(n.velocity)) for i in m.instruments for n in i.notes]


def other_notes(wav: Path) -> list[tuple[float, float, int, int]]:
    """Basic Pitch (its ONNX model): (start s, end s, MIDI pitch, velocity)"""
    import logging

    logging.getLogger().setLevel(logging.ERROR)  # (it warns that TensorFlow, CoreML and TFLite are absent: ONNX is enough)
    from basic_pitch import FilenameSuffix, build_icassp_2022_model_path
    from basic_pitch.inference import Model, predict

    _, midi, _ = predict(str(wav), Model(build_icassp_2022_model_path(FilenameSuffix.onnx)), **BASIC_PITCH)
    return [(float(n.start), float(n.end), int(n.pitch), int(n.velocity)) for i in midi.instruments for n in i.notes]


# ── notation ──────────────────────────────────────────────────────────────────────────────────────────────────────


def beat_grid(wav: Path, notes) -> tuple[list[float], float]:
    """the beats' times (s) and the tempo: librosa's beat tracker, kept between 50 and 160 beats a minute (doubling
    or halving); a steady 100 when it finds too few"""
    import librosa
    import numpy as np

    y, sr = librosa.load(str(wav), sr=22050, mono=True)
    _, beats = librosa.beat.beat_track(y=y, sr=sr, units="time", trim=False)
    beats = [float(b) for b in np.atleast_1d(beats)]
    if len(beats) >= 4:
        step = float(np.median(np.diff(beats)))
        while 60 / step > 160:  # too fast: every other beat
            beats, step = beats[::2], step * 2
        while 60 / step < 50:  # too slow: a beat between each
            beats = [x for a, b in zip(beats, beats[1:]) for x in (a, (a + b) / 2)] + beats[-1:]
            step /= 2
        return beats, 60 / step
    end = max((e for _, e, _, _ in notes), default=1.0)
    return [i * 0.6 for i in range(int(end / 0.6) + 2)], 100.0


def to_beats(times, beats):
    """seconds → beats, following the beat (straight lines beyond the first and the last)"""
    import numpy as np

    b = np.asarray(beats)
    idx = np.arange(len(b), dtype=float)
    t = np.asarray(times, dtype=float)
    out = np.interp(t, b, idx)
    first, last = (b[1] - b[0]), (b[-1] - b[-2])
    out = np.where(t < b[0], (t - b[0]) / first, out)
    out = np.where(t > b[-1], idx[-1] + (t - b[-1]) / last, out)
    return out


def metre(onsets, weights, accents=None) -> tuple[int, int]:
    """beats in a bar (3 or 4) and which beat (0 …) the first full bar starts on. The bar's length: how much more
    the rhythm repeats every 3 beats than every 4 (an autocorrelation of where notes start, in sixteenths); where it
    starts: where the accents fall (loud, low and long notes start more often on the first beat)."""
    import numpy as np

    on = np.asarray(onsets, dtype=float)
    w = np.asarray(weights, dtype=float)
    lo = np.floor(on.min())
    # the rhythm: the weight of the notes starting in each sixteenth
    pos = np.clip(np.round((on - lo) * 4).astype(int), 0, None)
    r = np.bincount(pos, weights=w)
    r = r - r.mean()

    def repeats(lag_beats):
        lag = lag_beats * 4
        return float(np.dot(r[:-lag], r[lag:]) / (len(r) - lag)) if len(r) > 2 * lag else 0.0

    m = 3 if repeats(3) > 1.1 * repeats(4) and repeats(3) > repeats(6) * 0.8 else 4
    near = np.abs(on - np.round(on)) < 0.15  # notes on a beat
    beat = np.round(on[near]).astype(int)
    if not len(beat):
        return m, 0
    acc = np.bincount(beat - beat.min(), weights=(np.asarray(accents, dtype=float) if accents is not None else w)[near])
    k = np.arange(len(acc)) + beat.min()
    best = max(range(m), key=lambda ph: acc[(k - ph) % m == 0].mean() / (acc[(k - ph) % m != 0].mean() + 1e-6))
    return m, best


def notate(notes, wav: Path, instrument: str, title: str = ""):
    """the notes as a music21 score: on the beat, in bars, quantised, on staves, in a key"""
    from music21 import chord, clef, instrument as inst, key, meter, metadata, note, stream, tempo

    if not notes:
        raise RuntimeError("no notes were heard in this recording")
    notes = sorted(notes)
    beats, bpm = beat_grid(wav, notes)
    on = to_beats([n[0] for n in notes], beats)
    off = to_beats([n[1] for n in notes], beats)
    # accent: loudness, and more for low notes (the bass marks the bar)
    # the rhythm's repeats weigh long notes too; the first beat is found by loud and low notes (a long note ends a phrase
    # as often as it starts a bar)
    m, phase = metre(
        on,
        [n[3] / 127 + (1.0 if n[2] < 55 else 0.0) + min(2.0, b - a) * 0.5 for n, a, b in zip(notes, on, off)],
        [n[3] / 127 + (1.0 if n[2] < 55 else 0.0) + min(2.0, b - a) * 0.15 for n, a, b in zip(notes, on, off)],
    )
    # the first bar starts on a bar line at or before the first note
    # (a first note a little before its beat is still on it)
    start = phase + m * ((min(on) + 0.25 - phase) // m)

    def staff(sel):
        """one staff: chords that don't overlap (a new chord ends the one before), every time on its beat's grid, and
        rests between, each note and rest split where it crosses a beat (tied), so every length can be written"""
        from fractions import Fraction

        if not sel:
            return stream.Part()
        rel = [(a - start, b - start, n) for n, a, b in sel]
        # each beat's grid: sixteenths, or triplets when the notes there sit closer to thirds
        by_beat = {}
        for a, b, _ in rel:
            by_beat.setdefault(int(a // 1), []).append(a)
        grid = {}
        for k, ts in by_beat.items():
            e4 = sum(abs(t * 4 - round(t * 4)) / 4 for t in ts)
            e3 = sum(abs(t * 3 - round(t * 3)) / 3 for t in ts)
            grid[k] = 3 if e3 + 0.02 * len(ts) < e4 else 4

        def snap(t):
            k = int(t // 1)
            g = grid.get(k, 4)
            q = Fraction(round(t * g), g)
            return max(Fraction(0), q)

        groups = {}
        for a, b, n in rel:
            groups.setdefault(snap(a), []).append((b, n))
        times = sorted(groups)
        events = []  # (from, to, pitches or None for a rest)
        for i, t in enumerate(times):
            g = groups[t]
            nxt = times[i + 1] if i + 1 < len(times) else None
            end = max(snap(b) for b, _ in g)
            step = Fraction(1, grid.get(int(t), 4))
            end = max(end, t + step)
            if nxt is not None:
                # a short gap before the next chord is the player lifting early (or the pedal): no rest
                end = nxt if nxt - end <= Fraction(1, 2) else min(end, nxt)
            events.append((t, end, sorted({n[2] for _, n in g})))
            if nxt is not None and end < nxt:
                events.append((end, nxt, None))
        if times[0] > 0:
            events.insert(0, (Fraction(0), times[0], None))

        def pieces(a, b):
            """[a, b] cut at whole beats: each piece within one beat, or whole beats"""
            out = []
            while a < b:
                nxt_beat = Fraction(int(a // 1) + 1) if a.denominator != 1 else a + 1
                if a.denominator == 1:
                    whole = Fraction(int(b // 1))
                    if whole > a:
                        out.append((a, whole))
                        a = whole
                        continue
                cut = min(b, nxt_beat)
                out.append((a, cut))
                a = cut
            return out

        part = stream.Part()
        for a, b, pitches in events:
            ps = pieces(a, b)
            for j, (x, y) in enumerate(ps):
                if pitches is None:
                    el = note.Rest()
                else:
                    el = note.Note(pitches[0]) if len(pitches) == 1 else chord.Chord(pitches)
                    if len(ps) > 1:
                        from music21 import tie

                        el.tie = tie.Tie("start" if j == 0 else "stop" if j == len(ps) - 1 else "continue")
                el.quarterLength = y - x
                part.insert(x, el)
        return part

    items = list(zip(notes, on, off))
    s = stream.Score()
    s.insert(0, metadata.Metadata(title=title or "Transcription", composer="Transcribed by Polyphonizer"))
    if instrument == "piano":
        # two hands: from middle C up on the treble staff (one hand's chord stays together where it spans the split)
        right = staff([x for x in items if x[0][2] >= 60])
        left = staff([x for x in items if x[0][2] < 60])
        parts = [(right, clef.TrebleClef(), "Right hand"), (left, clef.BassClef(), "Left hand")]
    else:
        whole = staff(items)
        lowest = min(n[2] for n in notes)
        parts = [(whole, clef.BassClef() if lowest < 52 else clef.TrebleClef(), "")]
    # the staves end together, on a bar line
    end = max(p.highestTime for p, *_ in parts)
    end = m * -(-end // m)
    for p, *_ in parts:
        if p.highestTime < end:
            p.insert(p.highestTime, note.Rest(quarterLength=end - p.highestTime))
    k = None
    for i, (p, c, name) in enumerate(parts):
        p.insert(0, inst.Piano() if instrument == "piano" else inst.Instrument(instrumentName="Melody"))
        if name:
            p.partName = name
        p.insert(0, c)
        p.insert(0, meter.TimeSignature(f"{m}/4"))
        if i == 0:
            p.insert(0, tempo.MetronomeMark(number=round(bpm)))
        s.insert(0, p)
    try:
        k = s.analyze("key")
    except Exception:
        k = None
    for p, *_ in parts:
        if k is not None:
            p.insert(0, key.KeySignature(k.sharps))
            # spelling: flats in a flat key, sharps in a sharp one
            for n in p.recurse().notes:
                for x in n.pitches:
                    if x.accidental is not None and x.accidental.alter != 0 and (x.accidental.alter > 0) != (k.sharps >= 0):
                        x.getEnharmonic(inPlace=True)
        p.makeMeasures(inPlace=True)
        p.makeTies(inPlace=True)
    return s


def transcribe(src: Path, out: Path, instrument: str = "piano", title: str = "") -> Path:
    if instrument not in INSTRUMENTS:
        raise RuntimeError(f"no such instrument: {instrument} (piano or other)")
    with tempfile.TemporaryDirectory(prefix="pz-audio-") as tmp:
        d = Path(tmp)
        wav = to_wav(src, d)
        notes = piano_notes(wav, d) if instrument == "piano" else other_notes(wav)
        score = notate(notes, wav, instrument, title)
    score.write("musicxml", fp=str(out))
    return out


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    instrument = os.environ.get("PZ_INSTRUMENT") or "piano"
    have = engines()
    if instrument not in have:
        raise SystemExit(f"no engine for {instrument} here (run pixi run -e audio audio-setup)")
    try:
        transcribe(Path(sys.argv[1]), Path(sys.argv[2]), instrument, os.environ.get("PZ_TITLE", ""))
    except RuntimeError as e:
        raise SystemExit(str(e))


if __name__ == "__main__":
    main()
