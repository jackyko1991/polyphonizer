"""Write the Library's catalogue of music21's corpus (frontend/src/library/catalog.json) from music21's own metadata.

Run with the same music21 version the site installs in Pyodide (the latest from PyPI):
    python scripts/corpus_catalog.py

Each work is one row: [collection, path, number, title, composer, parts, key (sharps, negative = flats), time, era,
tradition, original composer, instruments (one per part, e.g. ["violin", "violin", "viola", "cello"]), part names
(as the score names them, e.g. ["Violino I.", "Violino II.", "Violone e Organo"]; empty for single-melody folk tunes)].
Number is set for tunes inside a multi-tune file (ABC books): corpus.parse(path,
number=n). Every work gets a composer spelled one way ("Traditional" for folk tunes, with the tradition alongside;
music21's own spelling is kept as "original composer" for search) and an era. A title that is only a file name or a
number becomes one made from the path ("K458 · movement 1").
"""

import json
import re
from pathlib import Path

import music21
from music21 import corpus

OUT = Path(__file__).resolve().parent.parent / "frontend" / "src" / "library" / "catalog.json"

# composer by folder
COMPOSERS = {
    "bach": "Johann Sebastian Bach",
    "beethoven": "Ludwig van Beethoven",
    "mozart": "Wolfgang Amadeus Mozart",
    "haydn": "Joseph Haydn",
    "palestrina": "Giovanni Pierluigi da Palestrina",
    "monteverdi": "Claudio Monteverdi",
    "josquin": "Josquin des Prez",
    "schumann": "Robert Schumann",
    "schumann_clara": "Clara Schumann",
    "schoenberg": "Arnold Schoenberg",
    "beach": "Amy Beach",
    "chopin": "Frédéric Chopin",
    "ciconia": "Johannes Ciconia",
    "corelli": "Arcangelo Corelli",
    "cpebach": "C. P. E. Bach",
    "luca": "D. Luca",
    "handel": "George Frideric Handel",
    "joplin": "Scott Joplin",
    "verdi": "Giuseppe Verdi",
    "schubert": "Franz Schubert",
    "weber": "Carl Maria von Weber",
}


# folk collections: composer "Traditional", and the tradition
TRADITIONS = {
    "essenFolksong": "German (Essen collection)",
    "oneills1850": "Irish (O'Neill, 1850)",
    "airdsAirs": "Scottish (Aird's Airs)",
    "ryansMammoth": "American (Ryan's Mammoth Collection)",
    "miscFolk": "Various folk songs",
    "nottingham-dataset": "English and American (Nottingham dataset)",
}

ERAS = {
    "Medieval": ["trecento", "ciconia"],
    "Renaissance": ["palestrina", "josquin", "monteverdi"],
    "Baroque": ["bach", "handel", "corelli"],
    "Classical": ["cpebach", "mozart", "haydn", "beethoven"],
    "Romantic": ["schumann", "schumann_clara", "chopin", "schubert", "verdi", "weber", "beach"],
    "20th century": ["schoenberg"],
    "Popular": ["joplin", "leadSheet"],
    "Traditional": list(TRADITIONS),
}
ERA_OF = {folder: era for era, folders in ERAS.items() for folder in folders}

# music21's spellings of composers inside mixed collections → one spelling
SPELLINGS = {
    "Carl Philipp Emanuel Bach": "C. P. E. Bach",
    "O'Carolan": "Turlough O'Carolan",
    "Carolan": "Turlough O'Carolan",
}


def composer_of(collection, original):
    """(composer, tradition) for one work"""
    if collection in COMPOSERS:
        return COMPOSERS[collection], ""
    if collection in TRADITIONS:
        if "Carolan" in original:
            return "Turlough O'Carolan", TRADITIONS[collection]
        return "Traditional", TRADITIONS[collection]
    if collection == "trecento":
        # drop dates, "(opus dubium)" and manuscript sigla such as "F-Pn 568"
        name = re.sub(r"\s*\(.*?\)", "", original)
        name = re.sub(r"\s+[A-Z]{1,3}-[A-Za-z]+.*$|\s+\?.*$", "", name).strip()
        return ("Anonymous" if not name or name.lower().startswith("anon") else SPELLINGS.get(name, name)), ""
    if collection in ("demos", "theoryExercises"):
        real = SPELLINGS.get(original, "")
        return real or "music21 examples", ""
    return SPELLINGS.get(original, original) or "Unknown", ""


# part name or instrument name → one of a small set of instruments (first match wins; order matters: violone and
# violoncello before viola and violin); voices by range (soprano, alto, tenor, bass) or just "voice"
INSTRUMENTS = [
    (r"violoncell|\bcello|\bvlc|\bvc\b", "cello"),
    (r"violone|contrabass|double bass|kontrabass|\bcb\b", "double bass"),
    (r"\bviola\b|\bvla\b|\bva\b|bratsche", "viola"),
    (r"violin|violino|\bvln|\bvn\b|\bvl\b|fiddle|geige", "violin"),
    (r"piccolo|flute|flauto|flöte|\bfl\b", "flute"),
    (r"oboe|hautbois", "oboe"),
    (r"clarinet|klarinette|clarinetto", "clarinet"),
    (r"bassoon|fagott", "bassoon"),
    (r"horn|corno", "horn"),
    (r"trumpet|tromba|trompete", "trumpet"),
    (r"trombone|posaune", "trombone"),
    (r"harpsichord|cembalo|clavecin", "harpsichord"),
    (r"organ|organo|orgel", "organ"),
    (r"piano|klavier|keyboard", "piano"),
    (r"guitar|lute|liuto|laute", "guitar"),
    (r"\bharp|arpa|harfe", "harp"),
    (r"soprano|sopran|cantus|superius|discantus|\bc1\b|\bs\b", "soprano"),
    (r"\balto\b|\balt\b|altus|contratenor|countertenor|\bc2\b|\ba\b", "alto"),
    (r"tenor|\bt\b", "tenor"),
    (r"\bbass\b|bassus|basso|\bb\b", "bass"),
    (r"voice|vocal|canto|quintus|sextus|choir|chor", "voice"),
]
VOCAL = {"palestrina", "monteverdi", "josquin", "trecento", "bach", "ciconia", "luca"}
GENERIC = re.compile(r"^(instrument \d+|aria player|musicxml part|part \d+|p\d+|staff \d+|none|)$", re.I)


def instrument_of(names, collection):
    """the first name that says something wins: the part's own name ("Soprano I") before the sound it was given in
    the file (scores often give voice parts a piano or choir sound)"""
    for name in names:
        if not name or GENERIC.match(name.strip()):
            continue
        for pattern, inst in INSTRUMENTS:
            if re.search(pattern, name.lower()):
                return inst
    return "voice" if collection in VOCAL else "other"


def instruments_of(path, number, collection):
    """(instrument per part, part names) of one work"""
    if collection in TRADITIONS:
        return ["melody"], []
    try:
        s = corpus.parse(path, number=number) if number is not None else corpus.parse(path)
    except Exception:  # noqa: BLE001  (a file music21 cannot read: say so rather than stop)
        return ["other"], []
    out, names = [], []
    for i, part in enumerate(s.parts):
        inst = part.getInstrument(returnDefault=False)
        out.append(instrument_of([part.partName, inst.instrumentName if inst else None, inst.partName if inst else None], collection))
        name = part.partName if part.partName and not GENERIC.match(part.partName.strip()) else None
        if name is None and inst is not None and inst.instrumentName and not GENERIC.match(inst.instrumentName.strip()):
            name = inst.instrumentName
        names.append(clean(name) if name else f"Part {i + 1}")
    return out or ["other"], names


def clean(text):
    return re.sub(r"\s+", " ", str(text)).strip().rstrip(".") if text else ""


def from_path(path):
    """'mozart/k458/movement1.mxl' → 'K458 · movement 1'"""
    parts = re.sub(r"\.\w+$", "", path).split("/")[1:]
    words = [re.sub(r"(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])", " ", p).replace("_", " ") for p in parts]
    return " · ".join(w[:1].upper() + w[1:] for w in words)


def bad_title(title, filename):
    return not title or title == filename or title == "Music21 Fragment" or re.fullmatch(r"[\w.]+\.(mxl|xml|krn|abc|musicxml)", title) or len(title) < 5


def main():
    rows = []
    for entry in corpus.corpora.CoreCorpus().metadataBundle:
        md = entry.metadata
        if md is None:
            continue
        path = str(entry.sourcePath)
        collection = path.split("/")[0]
        filename = path.split("/")[-1]
        title = clean(md.title) or clean(md.movementName)
        if bad_title(title, filename):
            title = from_path(path) if collection in COMPOSERS or collection == "demos" else (title or filename)
        original = clean(md.composer).strip('"')
        composer, tradition = composer_of(collection, original)
        era = ERA_OF.get(collection) or ("Classical" if composer == "C. P. E. Bach" else "Other")
        keys = getattr(md, "keySignatures", None) or []
        times = getattr(md, "timeSignatures", None) or []
        rows.append(
            [
                collection,
                path,
                int(entry.number) if entry.number is not None else None,
                title,
                composer,
                int(getattr(md, "numberOfParts", 0) or 0),
                int(keys[0]) if keys and str(keys[0]).lstrip("-").isdigit() else None,
                str(times[0]) if times else "",
                era,
                tradition,
                original if original != composer else "",
                *instruments_of(path, entry.number, collection),
            ]
        )
    # by composer (Traditional and the anonymous last), then title
    last = {"Traditional": 2, "Anonymous": 1, "music21 examples": 3, "Unknown": 3}
    rows.sort(key=lambda r: (last.get(r[4], 0), r[4], r[3].lower(), r[1], r[2] or 0))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"music21": music21.__version__, "works": rows}, ensure_ascii=False, separators=(",", ":")))
    print(f"{len(rows)} works → {OUT}")


if __name__ == "__main__":
    main()
