"""Playing techniques for score code: bowings, slurs, articulations, fingerings, pedalling, breaths, trills, lyrics.

tinyNotation writes pitches and rhythms only; these helpers add the markings a player reads. Each takes a part (from
tiny()), changes it and returns it, so they can be chained or nested.

Notes are numbered from 1 within the part, in order, rests not counted: in tiny("c4 r d e2~ e4") the notes are
1 = c, 2 = d, 3 = e and 4 = the tied e. A chord counts as one note. Wherever a helper takes `notes`, give a number
(3), a list ([1, 3, 5]) or a string of numbers and ranges ("1 3 5-8"). Bars are numbered as printed, from 1.

Loaded after prelude.py into the same namespace (it uses the prelude's helpers' conventions, not its names).
"""

import re

from music21 import articulations, expressions, spanner, stream
from music21.musicxml import m21ToXml

# ── picking notes and bars ──


def _notes_of(part):
    """The part's notes in order (rests skipped, a chord is one note), numbered from 1 by the helpers."""
    return list(part.recurse().notes)


def _numbers(spec, last):
    """3, [1, 3], "1 3 5-8" → [1, 3, 5, 6, 7, 8] (checked against 1..last)."""
    if isinstance(spec, int):
        out = [spec]
    elif isinstance(spec, (list, tuple, range)):
        out = [int(x) for x in spec]
    else:
        out = []
        for tok in str(spec).replace(",", " ").split():
            m = re.fullmatch(r"(\d+)(?:-(\d+))?", tok)
            if not m:
                raise ValueError(f"{tok!r} is not a note number or a range like 3-6")
            a, b = int(m.group(1)), int(m.group(2) or m.group(1))
            out.extend(range(a, b + 1) if a <= b else range(a, b - 1, -1))
    for x in out:
        if not 1 <= x <= last:
            raise ValueError(f"there is no note {x}: this part has {last} notes (numbered from 1, rests not counted)")
    return out


def _pick(part, notes):
    every = _notes_of(part)
    return [every[i - 1] for i in _numbers(notes, len(every))]


def _measure(part, bar):
    m = part.measure(bar)
    if m is None:
        raise ValueError(f"there is no bar {bar}")
    return m


def _text_at(part, offset, words, placement="above"):
    """a text marking (pizz., sul G …) at a place in the part (quarter notes from its start)"""
    for m in part.getElementsByClass(stream.Measure):
        if m.offset <= offset < m.offset + m.barDuration.quarterLength or m is part.getElementsByClass(stream.Measure).last():
            te = expressions.TextExpression(words)
            te.placement = placement
            m.insert(offset - m.offset, te)
            return te
    raise ValueError("the part has no bars")


# ── bowing and articulation ──

_BOW = {"d": articulations.DownBow, "down": articulations.DownBow, "⊓": articulations.DownBow, "n": articulations.DownBow,
        "u": articulations.UpBow, "up": articulations.UpBow, "v": articulations.UpBow, "V": articulations.UpBow}


def bowings(part, bows):
    """Bow marks on the notes from note 1 on: "d u d u" (or "⊓ V ⊓ V"); "-" leaves a note unmarked (the bow goes on,
    e.g. a slurred note)."""
    for n, tok in zip(_notes_of(part), bows.split()):
        if tok in ("-", ".", "_"):
            continue
        cls = _BOW.get(tok) or _BOW.get(tok.lower())
        if cls is None:
            raise ValueError(f"{tok!r} is not a bow: use d (down, ⊓), u (up, V) or - (no mark)")
        n.articulations.append(cls())
    return part


def slur(part, first, last):
    """A slur from note `first` to note `last` (on strings: in one bow; on winds: tongue only the first note)."""
    if last <= first:
        raise ValueError("a slur needs at least two notes: slur(part, first, last) with last > first")
    sl = spanner.Slur(_pick(part, f"{first}-{last}"))
    part.insert(0, sl)
    return part


def _articulate(cls, name):
    def mark(part, notes):
        for n in _pick(part, notes):
            n.articulations.append(cls())
        return part

    mark.__name__ = mark.__qualname__ = name  # error messages say staccato(), not mark()
    return mark


staccato = _articulate(articulations.Staccato, "staccato")
staccato.__doc__ = "Staccato dots on these notes: short, detached."
spiccato = _articulate(articulations.Spiccato, "spiccato")
spiccato.__doc__ = "Spiccato on these notes: a bouncing bow (strings)."
tenuto = _articulate(articulations.Tenuto, "tenuto")
tenuto.__doc__ = "Tenuto lines on these notes: full length, gently stressed."
accent = _articulate(articulations.Accent, "accent")
accent.__doc__ = "Accents on these notes."
harmonic = _articulate(articulations.StringHarmonic, "harmonic")
harmonic.__doc__ = "Natural harmonics (a small circle) on these notes: touch the string lightly."
breath = _articulate(articulations.BreathMark, "breath")
breath.__doc__ = "A breath mark (a comma) after each of these notes."


def trill(part, notes):
    """A trill (tr) on these notes."""
    for n in _pick(part, notes):
        n.expressions.append(expressions.Trill())
    return part


def arpeggio(part, notes):
    """Roll these chords (a wavy line before each): from the bottom note up."""
    for n in _pick(part, notes):
        n.expressions.append(expressions.ArpeggioMark())
    return part


def fingering(part, fingers, start=1):
    """Fingerings from note `start` on: "1 2 3 1 2 3 4 5" (piano 1 = thumb … 5; strings 0 = open string … 4); "-"
    skips a note."""
    every = _notes_of(part)[start - 1:]
    for n, tok in zip(every, fingers.split()):
        if tok in ("-", ".", "_"):
            continue
        if not re.fullmatch(r"[0-5]", tok):
            raise ValueError(f"{tok!r} is not a finger: use 0–5, or - to skip a note")
        n.articulations.append(articulations.Fingering(int(tok)))
    return part


def text(part, note, words, below=False):
    """Words above (or below) a note: "sul G", "II pos.", "m.d.", "m.s.", "dolce" …"""
    n = _pick(part, note)[0]
    _text_at(part, n.getOffsetInHierarchy(part), words, "below" if below else "above")
    return part


def _bars(spec):
    """"3" → [(3, 3)], "3-4 7" → [(3, 4), (7, 7)]"""
    out = []
    for tok in str(spec).replace(",", " ").split():
        m = re.fullmatch(r"(\d+)(?:-(\d+))?", tok)
        if not m:
            raise ValueError(f"{tok!r} is not a bar or a range of bars like 3-4")
        out.append((int(m.group(1)), int(m.group(2) or m.group(1))))
    return out


def pizz(part, bars):
    """Pizzicato (plucked) in these bars, e.g. "3-4": "pizz." where it starts, "arco" (bow again) after it ends."""
    last = part.getElementsByClass(stream.Measure).last().number
    for a, b in _bars(bars):
        _text_at(part, _measure(part, a).offset, "pizz.")
        for m in part.getElementsByClass(stream.Measure):
            if a <= m.number <= b:
                for n in m.recurse().notes:
                    n.editorial.pz_pizz = True
        if b < last:
            _text_at(part, _measure(part, b + 1).offset, "arco")
    return part


def arco(part, bar):
    """"arco": play with the bow again, from this bar."""
    _text_at(part, _measure(part, bar).offset, "arco")
    return part


def una_corda(part, bars):
    """The soft pedal (piano) in these bars: "una corda" where it starts, "tre corde" after it ends."""
    last = part.getElementsByClass(stream.Measure).last().number
    for a, b in _bars(bars):
        _text_at(part, _measure(part, a).offset, "una corda", "below")
        if b < last:
            _text_at(part, _measure(part, b + 1).offset, "tre corde", "below")
    return part


def lyrics(part, words):
    """Words under the notes, one syllable per note from note 1: "Twin-kle, twin-kle, lit-tle star". A hyphen splits
    a word into syllables; "_" holds the previous syllable over a note (no new syllable)."""
    syllables = []
    for word in words.split():
        if word == "_":
            syllables.append(None)
            continue
        pieces = word.split("-")
        for i, s in enumerate(pieces):
            syllables.append(s + ("-" if i < len(pieces) - 1 else ""))
    every = _notes_of(part)
    if len(syllables) > len(every):
        raise ValueError(f"{len(syllables)} syllables for {len(every)} notes")
    for n, s in zip(every, syllables):
        if s is None:
            continue
        n.addLyric(s.rstrip("-"), applyRaw=True)
    _fix_syllabic(every, syllables)
    return part


def _fix_syllabic(every, syllables):
    """each syllable's place in its word (begin, middle, end, single): drawn as hyphens between syllables"""
    inside = False
    for n, s in zip(every, syllables):
        if s is None or not n.lyrics:
            continue
        ly = n.lyrics[-1]
        ly.text = s.rstrip("-")
        if s.endswith("-"):
            ly.syllabic = "middle" if inside else "begin"
            inside = True
        else:
            ly.syllabic = "end" if inside else "single"
            inside = False


# ── the sustain pedal ──


class PedalMark(expressions.TextExpression):
    """The sustain pedal pressed ("start"), lifted and pressed again ("change") or lifted ("stop"). Written to
    MusicXML as <pedal> (music21 8 has no pedal class of its own; see the exporter patch below)."""

    def __init__(self, kind="start"):
        super().__init__("")
        self.pedalType = kind


_text_to_xml = m21ToXml.MeasureExporter.textExpressionToXml


def _pedal_to_xml(self, te):
    if not isinstance(te, PedalMark):
        return _text_to_xml(self, te)
    mx = m21ToXml.Element("pedal")
    mx.set("type", te.pedalType)
    mx.set("line", "no")
    if te.pedalType != "stop":
        mx.set("sign", "yes")
    direction = self.placeInDirection(mx, te, setSound=False)
    direction.set("placement", "below")
    self.xmlRoot.append(direction)
    return direction


m21ToXml.MeasureExporter.textExpressionToXml = _pedal_to_xml


def _place(part, bar, beat, end):
    """quarter notes from the part's start: bar `bar` at beat `beat` (beats as in the time signature); end=True and no
    beat = the end of the bar"""
    m = _measure(part, bar)
    if beat is None:
        return m.offset + (m.barDuration.quarterLength if end else 0)
    ts = m.getContextByClass("TimeSignature")
    unit = ts.beatDuration.quarterLength if ts is not None else 1
    return m.offset + (beat - 1) * unit


def pedal(part, spans):
    """The sustain pedal (piano), held over spans of bars: "1 2 3-4" presses it at bar 1, changes it (up and straight
    down again) at bars 2 and 3, and lifts it at the end of bar 4. Spans that don't touch lift the pedal in between.
    A span can start or end on a beat: "1:3-2" from bar 1 beat 3 to the end of bar 2; "3-4:3" up at bar 4, beat 3."""
    found = []
    for tok in str(spans).replace(",", " ").split():
        m = re.fullmatch(r"(\d+)(?::(\d+(?:\.\d+)?))?(?:-(\d+)(?::(\d+(?:\.\d+)?))?)?", tok)
        if not m:
            raise ValueError(f"{tok!r} is not a pedal span: use a bar (3), bars (3-4), or bar:beat (3:3-4)")
        a, abeat = int(m.group(1)), float(m.group(2)) if m.group(2) else None
        b = int(m.group(3)) if m.group(3) else a
        bbeat = float(m.group(4)) if m.group(4) else None
        found.append((_place(part, a, abeat, False), _place(part, b, bbeat, True)))
    found.sort()
    marks = []
    for i, (start, stop) in enumerate(found):
        if stop <= start:
            raise ValueError(f"pedal span {i + 1} ends before it starts")
        if marks and abs(marks[-1][0] - start) < 1e-6 and marks[-1][1] == "stop":
            marks[-1] = (start, "change")
        else:
            marks.append((start, "start"))
        marks.append((stop, "stop"))
    measures = list(part.getElementsByClass(stream.Measure))
    for at, kind in marks:
        # a lift at a barline belongs to the bar it ends
        for mi, mm in enumerate(measures):
            length = mm.barDuration.quarterLength
            inside = mm.offset <= at < mm.offset + length or (kind == "stop" and mm.offset < at <= mm.offset + length)
            if inside or mi == len(measures) - 1:
                mm.insert(at - mm.offset, PedalMark(kind))
                break
    return part


# ── what the checker reads ──

_ARTIC = {
    "DownBow": "down", "UpBow": "up", "Staccato": "staccato", "Spiccato": "spiccato", "Tenuto": "tenuto",
    "Accent": "accent", "StringHarmonic": "harmonic", "Harmonic": "harmonic", "BreathMark": "breath",
}


def _note_marks(n):
    """The markings on one note or rest, as short strings: down, up, staccato, spiccato, tenuto, accent, harmonic,
    breath, trill, arpeggio, pizz, finger:3, slur:start / slur:continue / slur:stop, lyric:Twin."""
    out = []
    for a in getattr(n, "articulations", []):
        if isinstance(a, articulations.Fingering):
            out.append(f"finger:{a.fingerNumber}")
            continue
        for cls in type(a).__mro__:
            if cls.__name__ in _ARTIC:
                out.append(_ARTIC[cls.__name__])
                break
    for e in getattr(n, "expressions", []):
        if isinstance(e, expressions.Trill):
            out.append("trill")
        elif isinstance(e, expressions.ArpeggioMark):
            out.append("arpeggio")
    if getattr(n.editorial, "pz_pizz", False):
        out.append("pizz")
    for sp in n.getSpannerSites():
        if isinstance(sp, spanner.Slur):
            out.append("slur:start" if sp.isFirst(n) else "slur:stop" if sp.isLast(n) else "slur:continue")
    for ly in getattr(n, "lyrics", []) or []:
        if ly.text:
            out.append(f"lyric:{ly.text}")
    return out


def _pedals(s):
    """the sustain pedal's spans in each part: [{"part": 0, "from": 0.0, "to": 4.0}, …] (quarter notes)"""
    out = []
    for i, p in enumerate(s.parts):
        down = None
        for pm in sorted(p.recurse().getElementsByClass(PedalMark), key=lambda x: x.getOffsetInHierarchy(p)):
            at = float(pm.getOffsetInHierarchy(p))
            if pm.pedalType in ("change", "stop") and down is not None:
                out.append({"part": i, "from": down, "to": at})
                down = None
            if pm.pedalType in ("start", "change"):
                down = at
    return out


MARKING_HELPERS = [
    "bowings", "slur", "staccato", "spiccato", "tenuto", "accent", "harmonic", "pizz", "arco", "fingering", "text",
    "pedal", "una_corda", "arpeggio", "breath", "trill", "lyrics",
]


def _expose_markings():
    """`from polyphonizer import bowings, slur, …` works in score code and every file of a project."""
    import sys

    mod = sys.modules.get("polyphonizer")
    if mod is not None:
        for name in MARKING_HELPERS:
            setattr(mod, name, globals()[name])


_expose_markings()

# score code imports them like the prelude's helpers: the header stays two lines (error line numbers count on it)
HEADER = HEADER.rstrip("\n") + "".join(f", {name}" for name in MARKING_HELPERS) + "\n"  # noqa: F821 (the prelude's)
