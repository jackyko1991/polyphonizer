"""Write the Library's listing of the Mutopia Project (frontend/src/library/mutopia.json).

    GITHUB_TOKEN=... python scripts/mutopia_catalog.py

Mutopia (mutopiaproject.org) engraves public-domain music with LilyPond and gives each piece away as PDF, MIDI and
LilyPond source, in the public domain or under a Creative Commons licence. Its web site lets no other page download
from it (no CORS), so the Library lists the pieces and links to their files there: the learner downloads one and opens
it in the editor (a MIDI file opens at once; a PDF needs the local runner).

The listing comes from Mutopia's source repository (github.com/MutopiaProject/MutopiaProject): every piece is a folder
under ftp/ that holds <name>.ly or <name>-lys/, and its LilyPond \\header names it (mutopiatitle, mutopiacomposer,
mutopiaopus, mutopiainstrument, style, copyright or license, and footer = "Mutopia-<date>-<id>"). Only those fields are
kept: not the maintainers' names, e-mail addresses or web sites.

Which files a piece has (one MIDI or a zip of several, one A4 PDF or a zip) is not in the source: Mutopia publishes it
in each piece's RDF (ftp/<folder>/<name>.rdf: midFile, pdfFileA4), read here a few at a time.

Output: {"sha": commit, "works": [[id, title, composer, opus, instrument, style, licence (pd | by | by-sa), folder under
ftp/, MIDI file, A4 PDF file], ...]} (a file left empty when the RDF has none).
"""

import json
import os
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import quote

REPO = "MutopiaProject/MutopiaProject"
# Mutopia's composer codes → the names the rest of the Library uses
CANONICAL = {
    "BachJS": "Johann Sebastian Bach", "MozartWA": "Wolfgang Amadeus Mozart", "BeethovenLv": "Ludwig van Beethoven",
    "ChopinFF": "Frédéric Chopin", "SchubertF": "Franz Schubert", "HandelGF": "George Frideric Handel",
    "HaydnFJ": "Joseph Haydn", "SchumannR": "Robert Schumann", "BrahmsJ": "Johannes Brahms", "CzernyC": "Carl Czerny",
    "Traditional": "Traditional", "Anonymous": "Anonymous",
    "HoretzkyF": "Felix Horetzky", "KnjzeF": "František Max Kníže", "CouperinF": "François Couperin",
    "MatiegkaWT": "Wenzel Thomas Matiegka", "ArneT": "Thomas Arne", "CharpentierMA": "Marc-Antoine Charpentier",
    "GottschalkLM": "Louis Moreau Gottschalk", "HanonCL": "Charles-Louis Hanon", "Ippolitov-IvanovM": "Mikhail Ippolitov-Ivanov",
    "SchulzJAP": "Johann Abraham Peter Schulz", "VerdiG": "Giuseppe Verdi", "FaureG": "Gabriel Fauré",
    "Mendelssohn-BartholdyF": "Felix Mendelssohn", "JoplinS": "Scott Joplin", "StraussJJ": "Johann Strauss II",
    "MercadanteS": "Saverio Mercadante", "SzervacA": "Attila Szervác", "KuhnelA": "August Kühnel",
    "GobbaertsL": "Louis Gobbaerts", "FriedrichII": "Frederick the Great", "SchmelzerJH": "Johann Heinrich Schmelzer",
    "GershwinG": "George Gershwin", "RougetdeLisleCJ": "Claude Joseph Rouget de Lisle", "BlumenthalJ": "Jacques Blumenthal", "EmmettDD": "Daniel Decatur Emmett",
}


def from_code(code):
    """'HoretzkyF' → 'F. Horetzky', 'Mendelssohn-BartholdyF' → 'F. Mendelssohn-Bartholdy'; a code that is a name
    already ('Claribel', 'Yaniewicz') stays"""
    m = re.fullmatch(r"([A-Z][a-z]+(?:-[A-Z][a-z]+)?)([A-Z][a-z]?(?:[A-Z][a-z]?)*)", code)
    if not m or not m.group(2):
        return code
    return " ".join(f"{i}." for i in re.findall(r"[A-Z][a-z]?", m.group(2))) + " " + m.group(1)


def clean_name(name):
    """a name without its dates, years before it, 'arr.' notes or shouting: '1839 Felix Mendelssohn Bartholdy
    (1809–1847)' → 'Felix Mendelssohn Bartholdy'; 'G. VERDI.' → 'G. Verdi'; 'Czerny, C.' → 'C. Czerny'"""
    n = re.sub(r"\s*\([^)]*\)", "", name)
    n = re.sub(r"^(ca\.|circa)?\s*\d{3,4}(\s*[–-]\s*\d{2,4})?\s+", "", n)
    n = re.split(r"[;,]?\s*\b(arr\.|arranged)", n, flags=re.I)[0]
    n = re.sub(r",?\s*\d{4}.*$", "", n).strip(" ,")
    if re.fullmatch(r"[^,]+, [^,]+", n):
        surname, given = n.split(", ")
        n = f"{given} {surname}"
    n = re.sub(r"\b([A-ZÀ-Þ])([A-ZÀ-Þ]{2,})\b", lambda m: m.group(1) + m.group(2).lower(), n)
    # a full stop after a word, not after an initial
    n = re.sub(r"(?<=\w\w)\.$", "", n)
    return re.sub(r"\s+", " ", n).strip()


def surname(code):
    m = re.match(r"[A-Z][a-z]+(?:-[A-Z][a-z]+)?", code)
    return m.group(0) if m else code
SITE = "https://www.mutopiaproject.org/ftp"
OUT = Path(__file__).resolve().parent.parent / "frontend" / "src" / "library" / "mutopia.json"


def get(url, api=False):
    req = urllib.request.Request(url, headers={"User-Agent": "polyphonizer-catalog"})
    token = os.environ.get("GITHUB_TOKEN")
    if api and token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def _value(text, key):
    """a header field's string value: key = "…" (with \\" inside)"""
    m = re.search(rf'(?m)^\s*{key}\s*=\s*"((?:[^"\\]|\\.)*)"', text)
    return m.group(1).replace('\\"', '"').strip() if m else None


def parse_header(text):
    """the Mutopia fields of a LilyPond file's header, or None when it has none"""
    if not re.search(r"(?m)^\s*mutopia\w+\s*=", text):
        return None
    # the title: mutopiatitle, or (left empty in older files) the title
    title = _value(text, "mutopiatitle") or _value(text, "title")
    # the id: footer = "Mutopia-<date>-<id>", in older files sometimes in a markup of its own
    m = re.search(r"Mutopia-\d{4}/\d\d/\d\d-(\d+)", _value(text, "footer") or "") or re.search(r"Mutopia-\d{4}/\d\d/\d\d-(\d+)", text)
    if not title or not m:
        return None
    licence = _value(text, "license") or _value(text, "mutopiacopyright") or _value(text, "copyright") or ""
    if not licence:
        # only the tagline says it: its Creative Commons link, or "public domain"
        cc = re.search(r"creativecommons\.org/licenses/([a-z-]+)", text)
        names = {"by": "Creative Commons Attribution", "by-sa": "Creative Commons Attribution-ShareAlike", "publicdomain": "Public Domain"}
        licence = names.get(cc.group(1), "") if cc else ("Public Domain" if re.search(r"public domain", text, re.I) else "")
    # the composer's name only: its first line, without dates, and never contact details some files carry
    composer = (_value(text, "composer") or "").split("\n")[0]
    composer = "" if re.search(r"@|\d{6,}|https?:", composer) else re.sub(r"\s*\([^)]*\d{3,4}[^)]*\)\s*$", "", composer).strip()
    composer = composer or _value(text, "mutopiacomposer") or ""
    return {
        "title": title,
        "composer": composer,
        "opus": _value(text, "mutopiaopus") or _value(text, "opus") or "",
        "instrument": _value(text, "mutopiainstrument") or _value(text, "instrument") or "",
        "style": _value(text, "style") or "",
        "licence": licence,
        "id": int(m.group(1)),
        "code": _value(text, "mutopiacomposer") or "",
        "date": _value(text, "date") or "",
    }


def licence_key(text):
    t = text.lower()
    if "public domain" in t:
        return "pd"
    if "attribution" in t and "sharealike" in t.replace("-", "").replace(" ", ""):
        return "by-sa"
    if "attribution" in t:
        return "by"
    return "other"


def pieces(paths):
    """piece folder → its file name, whether its sources are in <name>-lys/, and the files to read for the header
    (<name>.ly first, then other .ly, then .ily)"""
    files = [p for p in paths if p.startswith("ftp/") and p.endswith((".ly", ".ily"))]
    found = {}
    for p in files:
        folder, file = p.rsplit("/", 1)
        stem = file.rsplit(".", 1)[0]
        if folder.rsplit("/", 1)[1] == stem and file.endswith(".ly"):
            found.setdefault(folder, {"name": stem, "lys": False})
    for p in files:
        m = re.match(r"(.*)/([^/]+)-lys/", p)
        if m and m.group(1).rsplit("/", 1)[1] == m.group(2):
            found[m.group(1)] = {"name": m.group(2), "lys": True}
    out = {}
    for folder, info in sorted(found.items()):
        base = f"{folder}/{info['name']}-lys/" if info["lys"] else f"{folder}/"
        mine = [p for p in files if p.startswith(base) and (info["lys"] or "/" not in p[len(base):])]

        def order(p):
            name = p.rsplit("/", 1)[1]
            return (name != f"{info['name']}.ly", name.endswith(".ily"), p.count("/"), p)

        out[folder] = {**info, "candidates": sorted(mine, key=order)}
    return out


def main():
    sha = json.loads(get(f"https://api.github.com/repos/{REPO}/commits/HEAD", api=True))["sha"]
    tree = json.loads(get(f"https://api.github.com/repos/{REPO}/git/trees/{sha}?recursive=1", api=True))
    assert not tree["truncated"]
    found = pieces([t["path"] for t in tree["tree"] if t["type"] == "blob"])

    def read(item):
        folder, info = item
        for path in info["candidates"][:8]:
            try:
                text = get(f"https://raw.githubusercontent.com/{REPO}/{sha}/{quote(path)}").decode("utf-8", "replace")
            except Exception:
                continue
            h = parse_header(text)
            if h:
                return folder, info, h, max(1, len(re.findall(r"\\score\s*\{", text)))
        return folder, info, None, 0

    with ThreadPoolExecutor(16) as pool:
        results = list(pool.map(read, found.items()))

    def files(item):
        """the piece's MIDI and A4 PDF file names, from its RDF on mutopiaproject.org"""
        folder, info, h, _ = item
        if not h:
            return item, ("", "")
        try:
            # (the folder starts with ftp/, as the site's paths do)
            rdf = get(f"{SITE}/{quote(folder[4:])}/{quote(info['name'])}.rdf").decode("utf-8", "replace")
        except Exception:
            return item, ("", "")
        field = lambda k: (re.search(rf"<mp:{k}>([^<]*)</mp:{k}>", rdf) or [None, ""])[1].strip()
        # a file name only ("empty" and the like mean there is none)
        name = lambda v: v if re.fullmatch(r"[\w.\-]+\.(mid|pdf|zip)", v) else ""
        return item, (name(field("midFile")), name(field("pdfFileA4")))

    # (Mutopia's server: four at a time)
    with ThreadPoolExecutor(4) as pool:
        listed = dict((i[0], f) for i, f in pool.map(files, results))
    # one name per composer (Mutopia's code, "MozartWA"): the Library's spelling where it has one, else the fullest
    # name the pieces give ("Wolfgang Amadeus Mozart" over "W. A. Mozart"; "Czerny, C." turned round)
    # (a name that does not hold the code's surname names someone else, e.g. where a hymn's melody came from: the
    # piece is listed, as on Mutopia, under the code's composer)
    import unicodedata

    def fold(t):
        return unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()

    names = {}
    for _, _, h, _ in results:
        if h and h["composer"] != h["code"]:
            n = clean_name(h["composer"])
            if fold(surname(h["code"]).split("-")[0]) in fold(n):
                names.setdefault(h["code"], set()).add(n)
    best = {code: max(ns, key=lambda n: ("." not in n, len(n.split()), len(n))) for code, ns in names.items()}
    best.update(CANONICAL)
    for _, _, h, _ in results:
        if h and h["code"] not in best:
            best[h["code"]] = from_code(h["code"])
    for _, _, h, _ in results:
        if h:
            h["composer"] = best.get(h["code"], h["composer"])
    works, skipped, seen = [], [], set()
    for folder, info, h, scores in results:
        key = licence_key(h["licence"]) if h else "other"
        if not h or key == "other" or h["id"] in seen:
            skipped.append(folder)
            continue
        seen.add(h["id"])
        mid, pdf = listed.get(folder, ("", ""))
        if not mid and not pdf:
            skipped.append(folder)
            continue
        works.append([h["id"], h["title"], h["composer"], h["opus"], h["instrument"], h["style"], key, folder[4:], mid, pdf])
    works.sort(key=lambda w: (w[2], w[1].lower(), w[0]))
    OUT.write_text(json.dumps({"sha": sha, "works": works}, ensure_ascii=False, separators=(",", ":")))
    print(f"{len(works)} pieces → {OUT}; {len(skipped)} folders without a Mutopia header or licence")


if __name__ == "__main__":
    main()
