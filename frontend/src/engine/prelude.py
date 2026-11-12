"""Polyphonizer's prelude: run before every piece of score code (in Pyodide, in a web worker).

Score code is Python with music21. It must leave its result in a variable named `score` (a Score, a Part, or any
Stream). `tiny()` writes a part in music21's tinyNotation: "c4 d8 e f#2 r4 c'1" (letter = pitch, number = note
value, ' and , = octaves, # and - = sharp and flat, r = rest).
"""

import json

from music21 import *  # noqa: F403  (score code uses music21's names directly: note, chord, stream, key, …)
from music21 import converter, instrument, key, meter, stream, tempo
from music21.musicxml.m21ToXml import GeneralObjectExporter

INSTRUMENTS = {
    "violin": instrument.Violin,
    "viola": instrument.Viola,
    "cello": instrument.Violoncello,
    "flute": instrument.Flute,
    "piano": instrument.Piano,
    "voice": instrument.Vocalist,
}


def tiny(notes, time="4/4", name=None, key_sig=None, inst=None, clef_=None):
    """A part from tinyNotation, e.g. tiny("c4 d e f g1", name="Flute", key_sig="C", inst="flute")."""
    part = converter.parse(f"tinyNotation: {time} {notes}")
    first = part.getElementsByClass(stream.Measure).first()
    if inst:
        made = INSTRUMENTS[inst.lower()]()
        part.insert(0, made)
        part.partName = name or made.instrumentName
    if name:
        part.partName = name
    if key_sig and first is not None:
        first.insert(0, key.Key(key_sig))
    if clef_ and first is not None:
        from music21 import clef as _clef

        for old in first.getElementsByClass(_clef.Clef):
            first.remove(old)
        first.insert(0, _clef.clefFromString(clef_))
    return part


def together(*parts, title=None, bpm=None):
    """A score from parts, top to bottom."""
    s = stream.Score()
    for p in parts:
        s.insert(0, p)
    if title:
        s.insert(0, metadata.Metadata(title=title))  # noqa: F405
    if bpm:
        s.parts[0].getElementsByClass(stream.Measure).first().insert(0, tempo.MetronomeMark(number=bpm))
    return s


def _as_score(obj):
    if isinstance(obj, stream.Score):
        return obj
    s = stream.Score()
    if isinstance(obj, stream.Part):
        s.insert(0, obj)
    elif isinstance(obj, stream.Stream):
        p = stream.Part()
        for el in obj.flatten().notesAndRests:
            p.append(el)
        s.insert(0, p.makeMeasures())
    else:
        raise TypeError("`score` must be a music21 Score, Part or Stream (for example tiny('c4 d e f'))")
    return s


def _summary(s):
    """MusicXML plus the facts the checker and the page-turn planner need."""
    xml = GeneralObjectExporter(s).parse().decode("utf-8")
    parts, notes = [], []
    for i, p in enumerate(s.parts):
        parts.append(p.partName or f"Part {i + 1}")
        for n in p.recurse().notesAndRests:
            notes.append(
                {
                    "part": i,
                    "measure": n.measureNumber if n.measureNumber is not None else 0,
                    "offset": float(n.getOffsetInHierarchy(p)),
                    "dur": float(n.quarterLength),
                    "midi": [int(x.midi) for x in n.pitches] if not n.isRest else [],
                    "name": " ".join(x.nameWithOctave for x in n.pitches) if not n.isRest else "rest",
                    "tie": n.tie.type if n.tie is not None else None,
                }
            )
    measures = []
    if s.parts:
        for m in s.parts[0].getElementsByClass(stream.Measure):
            measures.append({"n": m.number, "offset": float(m.offset), "length": float(m.barDuration.quarterLength)})
    mm = s.recurse().getElementsByClass(tempo.MetronomeMark).first()
    ts = s.recurse().getElementsByClass(meter.TimeSignature).first()
    ks = s.recurse().getElementsByClass(key.KeySignature).first()
    return {
        "musicxml": xml,
        "parts": parts,
        "notes": notes,
        "measures": measures,
        "bpm": float(mm.getQuarterBPM()) if mm is not None and mm.number else 96.0,
        "time": ts.ratioString if ts is not None else "4/4",
        "key": str(ks.asKey()) if ks is not None else "",
        "title": (s.metadata.title if s.metadata is not None else "") or "",
    }


def _run(code, part=None):
    ns = {}
    exec(compile("from music21 import *\nfrom __main__ import tiny, together, load\n" + code, "score.py", "exec"), ns)
    if "score" not in ns:
        raise NameError("your code must set a variable named `score`")
    s = _as_score(ns["score"])
    if part is not None:
        s = _as_score(s.parts[part])
    return json.dumps(_summary(s))


def _load_file(path, part=None):
    s = _as_score(converter.parse(path))
    if part is not None:
        s = _as_score(s.parts[part])
    return json.dumps(_summary(s))


def load(name):
    """A file you imported (MusicXML, .mxl, MIDI, ABC, Humdrum …), by its file name."""
    return converter.parse(f"/files/{name}")
