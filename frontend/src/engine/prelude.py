"""Polyphonizer's prelude: run before every piece of score code (in Pyodide, in a web worker).

Score code is Python with music21. It must leave its result in a variable named `score` (a Score, a Part, or any
Stream). `tiny()` writes a part in music21's tinyNotation: "c4 d8 e f#2 r4 c'1" (letter = pitch, number = note
value, ' and , = octaves, # and - = sharp and flat, r = rest).
"""

import json

from music21 import *  # noqa: F403  (score code uses music21's names directly: note, chord, stream, key, …)
import copy
import re

from music21 import chord, converter, instrument, key, metadata, meter, pitch, spanner, stream, tempo
from music21.musicxml.m21ToXml import GeneralObjectExporter

INSTRUMENTS = {
    "violin": instrument.Violin,
    "viola": instrument.Viola,
    "cello": instrument.Violoncello,
    "flute": instrument.Flute,
    "piano": instrument.Piano,
    "voice": instrument.Vocalist,
}


def _chord_text(notes):
    """tinyNotation has no chords, so each <c e g>4 stands in as its first pitch (c4) and becomes a chord afterwards:
    the text to parse, and {event number: the chord's pitches}."""
    chords, events, out = {}, 0, []
    for tok in re.findall(r"(?:trip\{|quad\{)?<[^>]+>\S*|\S+", notes):
        core = re.sub(r"^(trip|quad)\{|\}$", "", tok)
        cm = re.fullmatch(r"<([^>]+)>(\S*)", core)
        if cm:
            chords[events] = [_text_pitch(x) for x in cm.group(1).split()]
            tok = tok.replace(core, cm.group(1).split()[0] + cm.group(2))
        out.append(tok)
        if not re.fullmatch(r"\d+/\d+", tok):  # a time signature is not an event
            events += 1
    return " ".join(out), chords


def _as_chord(n, pitches):
    c = chord.Chord(pitches)
    c.duration = copy.deepcopy(n.duration)
    c.tie = n.tie
    return c


def tiny(notes, time="4/4", name=None, key_sig=None, inst=None, clef_=None):
    """A part from tinyNotation, e.g. tiny("c4 d e f g1", name="Flute", key_sig="C", inst="flute"); chords are
    written <C E G>2."""
    text, chords = _chord_text(notes)
    part = converter.parse(f"tinyNotation: {time} {text}")
    if chords:
        events = list(part.recurse().notesAndRests)
        for i, pitches in chords.items():
            events[i].activeSite.replace(events[i], _as_chord(events[i], pitches))
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


# ── editing one bar: its notes as text, and replacing them ──

_TYPES = {"whole": "1", "half": "2", "quarter": "4", "eighth": "8", "16th": "16", "32nd": "32", "64th": "64"}
_last = {"score": None}


def _find_part(score, part):
    if isinstance(part, int):
        return score.parts[part]
    for p in score.parts:
        if p.partName == part:
            return p
    raise ValueError(f"no part named {part!r}; the parts are {[p.partName for p in score.parts]}")


def _pitch_text(p):
    """music21 pitch → tinyNotation: c = C4, c' = C5, C = C3, CC = C2; # sharp, - flat."""
    octave = p.octave if p.octave is not None else 4
    text = p.step.lower() + "'" * (octave - 4) if octave >= 4 else p.step * (4 - octave)
    alter = int(p.accidental.alter) if p.accidental is not None else 0
    return text + ("#" * alter if alter > 0 else "-" * -alter)


def _text_pitch(text):
    """tinyNotation pitch → music21 pitch (the inverse of _pitch_text)."""
    m = re.fullmatch(r"(([a-g])'*|([A-G])\3*)(#+|-+|n)?", text)
    if not m:
        raise ValueError(f"{text!r} is not a pitch (try c, c', C, c#, e-)")
    if m.group(2):
        octave = 4 + text.count("'")
        step = m.group(2).upper()
    else:
        octave = 4 - len(m.group(1))
        step = m.group(3)
    acc = (m.group(4) or "").replace("n", "")
    return pitch.Pitch(f"{step}{acc}{octave}")


def _bar_text(part, bar):
    """The notes of one bar as editable text, and what that text leaves out. Uses the last full score run."""
    score = _last["score"]
    if score is None:
        raise ValueError("run the score first")
    m = _find_part(score, part).measure(bar)
    if m is None:
        raise ValueError(f"there is no bar {bar}")
    lost = []
    if m.voices:
        lost.append("voices")
        events = list(m.voices[0].notesAndRests)
    else:
        events = list(m.notesAndRests)
    tokens, in_trip = [], False
    for n in events:
        if n.duration.isGrace:
            lost.append("grace notes")
            continue
        tup = n.duration.tuplets
        trip = bool(tup) and tup[0].numberNotesActual == 3 and tup[0].numberNotesNormal == 2
        if tup and not trip:
            lost.append("tuplets other than triplets")
        dur = _TYPES.get(n.duration.type)
        if dur is None:
            raise ValueError(f"bar {bar} has a {n.duration.type} note, which the text form cannot show")
        dur += "." * n.duration.dots
        if n.isRest:
            tok = "r" + dur
        elif n.isChord:
            tok = "<" + " ".join(_pitch_text(p) for p in n.pitches) + ">" + dur
        else:
            tok = _pitch_text(n.pitch) + dur
        if n.tie is not None and n.tie.type in ("start", "continue"):
            tok += "~"
        if trip and not in_trip:
            tok = "trip{" + tok
            in_trip = True
        elif not trip and in_trip:
            tokens[-1] += "}"
            in_trip = False
        tokens.append(tok)
    if in_trip:
        tokens[-1] += "}"
    if any(sp for n in events for sp in n.getSpannerSites()):
        lost.append("slurs and other lines on these notes")
    if any(n.articulations or n.expressions for n in events if not n.isRest):
        lost.append("articulations and ornaments")
    return json.dumps({"text": " ".join(tokens), "lost": sorted(set(lost))})


def edit_bar(score, part, bar, notes):
    """Replace bar `bar` of `part` (its name, or its index from 0) with `notes` in tinyNotation, plus chords
    written <c e g>4. Clef, key, time and dynamics stay; the notes must fill the bar. Returns the score."""
    p = _find_part(score, part)
    m = p.measure(bar)
    if m is None:
        raise ValueError(f"{p.partName} has no bar {bar}")
    ts = m.getContextByClass(meter.TimeSignature)
    text, chords = _chord_text(notes)
    new = list(converter.parse(f"tinyNotation: {ts.ratioString if ts else '4/4'} {text}").flatten().notesAndRests)
    for i, pitches in chords.items():
        new[i] = _as_chord(new[i], pitches)
    want = m.barDuration.quarterLength - m.paddingLeft - m.paddingRight
    total = sum(n.quarterLength for n in new)
    if abs(total - want) > 1e-6:
        raise ValueError(f"bar {bar} of {p.partName} needs {float(want):g} quarter notes; {notes!r} adds up to {float(total):g}")
    old = list(m.notesAndRests) + [n for v in m.voices for n in v.notesAndRests]
    for sp in list(score.recurse().getElementsByClass(spanner.Spanner)):
        if any(e in old for e in sp.getSpannedElements()):
            sp.activeSite.remove(sp)
    for v in list(m.voices):
        m.remove(v)
    for n in list(m.notesAndRests):
        m.remove(n)
    at = m.paddingLeft
    for n in new:
        m.insert(at, n)
        at += n.quarterLength
    return score


def _program(p):
    """General MIDI program (0-127) of a part. The part's name comes first ("Violin I" is more specific than the
    "string ensemble" some files declare), then its instrument's program; None if neither says."""
    inst = p.getInstrument(returnDefault=False)
    for name in (p.partName, inst.instrumentName if inst is not None else None):
        if not name:
            continue
        try:
            guess = instrument.fromString(name)
        except Exception:  # noqa: BLE001  (music21 raises its own InstrumentException and others)
            continue
        if guess is not None and guess.midiProgram is not None:
            return int(guess.midiProgram)
    if inst is not None and inst.midiProgram is not None:
        return int(inst.midiProgram)
    return None


def _note_marks(n):
    """the markings on a note (bowings, fingerings …); markings.py, loaded after this file, replaces it"""
    return []


def _pedals(s):
    """the sustain pedal's spans; markings.py, loaded after this file, replaces it"""
    return []


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
                    "marks": _note_marks(n),
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
        "programs": [_program(p) for p in s.parts],
        "notes": notes,
        "measures": measures,
        "pedals": _pedals(s),
        "bpm": float(mm.getQuarterBPM()) if mm is not None and mm.number else 96.0,
        "time": ts.ratioString if ts is not None else "4/4",
        "key": str(ks.asKey()) if ks is not None else "",
        "title": (s.metadata.title if s.metadata is not None else "") or "",
    }


HEADER = "from music21 import *\nfrom polyphonizer import tiny, together, load, edit_bar, fetch_score, pages\n"
PROJECT = "/project"


def _expose_helpers():
    """`from polyphonizer import tiny, together, load` works in every file of a project."""
    import sys
    import types

    mod = types.ModuleType("polyphonizer")
    mod.tiny, mod.together, mod.load, mod.edit_bar, mod.fetch_score = tiny, together, load, edit_bar, fetch_score
    mod.pages = pages
    sys.modules["polyphonizer"] = mod


def _set_project(files_json):
    """Write the project's other .py files to /project (each with the same header as the main file) and forget any
    module imported from there before, so an edited file is imported afresh."""
    import importlib
    import os
    import sys

    files = json.loads(files_json)
    os.makedirs(PROJECT, exist_ok=True)
    keep = {f["name"] for f in files}
    for old in os.listdir(PROJECT):
        if old not in keep:
            os.remove(os.path.join(PROJECT, old))
    for f in files:
        with open(os.path.join(PROJECT, f["name"]), "w", encoding="utf-8") as fh:
            fh.write(HEADER + f["code"])
    for name, mod in list(sys.modules.items()):
        if (getattr(mod, "__file__", None) or "").startswith(PROJECT + "/"):
            del sys.modules[name]
    if PROJECT not in sys.path:
        sys.path.insert(0, PROJECT)
    importlib.invalidate_caches()


def _only_part(s, part):
    """One player's part as a score, keeping the piece's title and composer (else music21 calls it "Music21 Fragment")."""
    one = _as_score(s.parts[part])
    one.metadata = copy.deepcopy(s.metadata) if s.metadata is not None else metadata.Metadata()
    return one


# abbreviations for later systems, from the part's name ("Violin I" → "Vln. I")
_ABBR = [
    (r"violoncell|cello", "Vc."), (r"contrabass|double bass", "Cb."), (r"viola\b", "Vla."), (r"violin", "Vln."),
    (r"piccolo", "Picc."), (r"flute", "Fl."), (r"oboe", "Ob."), (r"clarinet", "Cl."), (r"bassoon", "Bsn."),
    (r"horn", "Hn."), (r"trumpet", "Tpt."), (r"trombone", "Tbn."), (r"tuba", "Tba."), (r"piano", "Pno."),
    (r"harpsichord", "Hpd."), (r"organ", "Org."), (r"guitar", "Gtr."), (r"harp\b", "Hp."),
    (r"soprano", "S."), (r"alto", "A."), (r"tenor", "T."), (r"bass\b", "B."), (r"voice", "V."),
]


def _labelled(s):
    """Every part's abbreviation (shown on later systems) comes from its own name; a one-part sheet shows none, as
    printed parts don't. Files often carry a generic one (music21's "Str" for any string instrument)."""
    single = len(s.parts) == 1
    for p in s.parts:
        name = p.partName or ""
        abbr = ""
        if not single:
            for pattern, short in _ABBR:
                if re.search(pattern, name, re.I):
                    number = re.search(r"\s+([IVX]+|\d+)\s*$", name)
                    abbr = short + (" " + number.group(1) if number else "")
                    break
            else:
                abbr = name[:4] + "." if len(name) > 5 else name
        p.partAbbreviation = abbr
        inst = p.getInstrument(returnDefault=False)
        if inst is not None:
            inst.instrumentAbbreviation = abbr
            inst.partAbbreviation = abbr
    return s


def _titled(s):
    """Untitled scores get an empty title instead of music21's placeholder "Music21 Fragment"."""
    if s.metadata is None:
        s.metadata = metadata.Metadata()
    if not s.metadata.title and s.metadata.movementName:
        s.metadata.title = s.metadata.movementName
    if s.metadata.title is None:
        s.metadata.title = ""
    return s


# ── the page setup, written in the score's code: pages(part="Violin I", stand="spread", …) ──

# printing papers, and screens (portrait; orientation="landscape" turns them): the size in mm sets the shape and how
# large the music is relative to the page
_PAPERS = {
    "A4": (210.0, 297.0),
    "Letter": (215.9, 279.4),
    "A3": (297.0, 420.0),
    "B4": (250.0, 353.0),
    "iPad": (180.0, 258.0),
    "iPad Pro 12.9": (196.0, 262.0),
    "Tablet 16:10": (170.0, 272.0),
    "Phone": (70.0, 152.0),
    "Screen 16:9": (180.0, 320.0),
    "Screen 16:10": (200.0, 320.0),
}
_LAYOUTS = []


def pages(
    part=None,
    paper="A4",
    orientation="portrait",
    stand="spread",
    min_rest=2,
    plan_turns=True,
    staff_size=7.0,
    margins_mm=(10, 10, 10, 10),
    page_numbers=True,
    title="first",
    part_name="every",
    bars_per_line=0,
    line_breaks=(),
    page_breaks=(),
):
    """How a sheet is laid out on paper, for the Pages view and printing. One call per sheet: part=None is the full
    score, part="Violin I" one player's part. paper: "A4", "A3", "B4", "Letter" or (width, height) in mm;
    stand: "single" (every page end is a turn), "spread" (open pages: turn after 2, 4 …) or "spread-right";
    min_rest: seconds of rest a turn needs; plan_turns: move page breaks to rests; staff_size: staff height in mm
    (4.8–16; 7 is usual for parts); margins_mm: (top, bottom, left, right); title / part_name: "first", "every" or
    "none"; bars_per_line: 0 = as many as fit; line_breaks / page_breaks: bar numbers (as printed) that start a new
    line / page."""

    def bad(name, why):
        raise ValueError(f"pages(): {name} {why}")

    if part is not None and not isinstance(part, str):
        bad("part", "is the part's name, e.g. part=\"Violin I\" (or leave it out for the full score)")
    if isinstance(paper, str):
        if paper not in _PAPERS:
            bad("paper", f"must be one of {', '.join(_PAPERS)} or (width, height) in mm")
        size = _PAPERS[paper]
    elif isinstance(paper, (tuple, list)) and len(paper) == 2 and all(isinstance(x, (int, float)) and 50 <= x <= 1000 for x in paper):
        size = (float(paper[0]), float(paper[1]))
    else:
        bad("paper", "must be a name such as \"A4\" or (width, height) in mm")
    if orientation not in ("portrait", "landscape"):
        bad("orientation", "must be \"portrait\" or \"landscape\"")
    if stand not in ("single", "spread", "spread-right"):
        bad("stand", "must be \"single\", \"spread\" or \"spread-right\"")
    if not isinstance(min_rest, (int, float)) or not 0 <= min_rest <= 30:
        bad("min_rest", "is seconds of rest, from 0 to 30")
    if not isinstance(staff_size, (int, float)) or not 4.8 <= staff_size <= 16:
        bad("staff_size", "is the staff height in mm, from 4.8 to 16")
    if not (isinstance(margins_mm, (tuple, list)) and len(margins_mm) == 4 and all(isinstance(x, (int, float)) and 0 <= x <= 60 for x in margins_mm)):
        bad("margins_mm", "is (top, bottom, left, right) in mm, each 0–60")
    for name, value in (("title", title), ("part_name", part_name)):
        if value not in ("first", "every", "none"):
            bad(name, "must be \"first\", \"every\" or \"none\"")
    if not isinstance(bars_per_line, int) or not 0 <= bars_per_line <= 16:
        bad("bars_per_line", "is a whole number from 0 (as many as fit) to 16")
    for name, value in (("line_breaks", line_breaks), ("page_breaks", page_breaks)):
        if not isinstance(value, (tuple, list)) or not all(isinstance(x, int) and x > 0 for x in value):
            bad(name, "is a list of bar numbers, e.g. [9, 17]")
    if any(l.get("part") == part for l in _LAYOUTS):
        bad("part", f"{part!r} already has a pages(...) line" if part else "the full score already has a pages(...) line")
    w, h = size
    layout = {
        "part": part,
        "paper": paper if isinstance(paper, str) else [w, h],
        "width_mm": h if orientation == "landscape" else w,
        "height_mm": w if orientation == "landscape" else h,
        "orientation": orientation,
        "stand": stand,
        "min_rest": float(min_rest),
        "plan_turns": bool(plan_turns),
        "staff_size": float(staff_size),
        "margins_mm": [float(x) for x in margins_mm],
        "page_numbers": bool(page_numbers),
        "title": title,
        "part_name": part_name,
        "bars_per_line": bars_per_line,
        "line_breaks": sorted(set(line_breaks)),
        "page_breaks": sorted(set(page_breaks)),
    }
    _LAYOUTS.append(layout)
    return layout


def _run(code, part=None):
    ns = {"__name__": "__score__"}
    _LAYOUTS.clear()
    exec(compile(HEADER + code, "score.py", "exec"), ns)
    if "score" not in ns:
        raise NameError("your code must set a variable named `score`")
    s = _as_score(ns["score"])
    if part is None:
        _last["score"] = s
    else:
        s = _only_part(s, part)
    out = _summary(_labelled(_titled(s)))
    out["layouts"] = list(_LAYOUTS)
    return json.dumps(out)


def _load_file(path, part=None):
    s = _as_score(converter.parse(path))
    if part is not None:
        s = _only_part(s, part)
    return json.dumps(_summary(_labelled(_titled(s))))


def load(name):
    """A file you imported (MusicXML, .mxl, MIDI, ABC, Humdrum …), by its file name."""
    return converter.parse(f"/files/{name}")


# collections fetch_score() reads from (the same list as library/scoreSources.ts); the worker downloads each
# fetch_score("…") of the code before it runs and fills _FETCHED: URL → local file
_SCORE_SOURCES = (
    "https://raw.githubusercontent.com/OpenScore/Lieder/",
    "https://raw.githubusercontent.com/OpenScore/StringQuartets/",
    "https://raw.githubusercontent.com/craigsapp/mozart-piano-sonatas/",
    "https://raw.githubusercontent.com/craigsapp/joplin/",
)
_FETCHED = {}


def _score_url_ok(url):
    if not isinstance(url, str) or not any(url.startswith(p) and len(url) > len(p) for p in _SCORE_SOURCES):
        return False
    return not re.search(r"[?#\\\t\n\r\f\v]|%2e|%2f|%5c", url, re.I) and not re.search(r"(^|/)\.\.?(/|$)", url)


def fetch_score(url):
    """A score from an open collection (OpenScore, Craig Sapp's Humdrum editions), by its URL, e.g.
    fetch_score("https://raw.githubusercontent.com/OpenScore/Lieder/<commit>/scores/…/lc123.mxl"). Write the URL
    in quotes: the page downloads it (once; then it is kept in this browser) before the code runs."""
    if not _score_url_ok(url):
        raise ValueError("fetch_score only reads scores from these collections: " + ", ".join(_SCORE_SOURCES))
    path = _FETCHED.get(url)
    if path is None:
        raise ValueError(f"could not get {url}: it isn't in this browser's cache and could not be downloaded "
                         "(are you offline?). fetch_score needs the URL written out in quotes.")
    return converter.parse(path)


_expose_helpers()
