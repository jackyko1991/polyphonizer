"""Write the Library's catalogue of open-licence score collections (frontend/src/library/collections.json).

    python scripts/collections_catalog.py            # GITHUB_TOKEN in the environment is used if set

The scores themselves are NOT downloaded here: for each repository this reads its file tree (one GitHub API call),
pins every URL to the default branch's current commit, and reads a few small metadata files at that commit
(composers' dates for the eras, the Humdrum editions' title indexes). The browser downloads a score only when someone
opens it (python.worker.ts, fetch_score), and keeps it in the Cache API.

Collections:
  OpenScore Lieder           CC0 1.0          scores/<Composer>/<Set or _>/<N_Title>/lc<id>.mxl
  OpenScore String Quartets  CC0 1.0          scores/<Composer>/<Work>/sq<id>.mxl
  Craig Sapp: Mozart sonatas CC BY-NC-SA 4.0  kern/sonata<NN>-<movement>.krn   (titles from index.hmd)
  Craig Sapp: Joplin         CC BY-NC-SA 4.0  kern/<name>.krn                  (titles from index.hmd)
craigsapp/beethoven-piano-sonatas has no licence statement, so it is left out.

Output: {"sources": {id: {...}}, "works": [row, ...]}. A row has the shape of catalog.json's rows (see
corpus_catalog.py) plus a 14th field, the source id:
  [collection (= source id), URL pinned to a commit, null, title, composer, parts, null, "", era,
   set (song cycle / opus / sonata the work belongs to, shown after the composer), "", instruments, part names, source]
Key and time signature are unknown without reading the score, so they stay empty.
"""

import html
import json
import os
import re
import urllib.request
from pathlib import Path
from urllib.parse import quote

OUT = Path(__file__).resolve().parent.parent / "frontend" / "src" / "library" / "collections.json"

SOURCES = {
    "openscore-lieder": {
        "repo": "OpenScore/Lieder",
        "name": ["OpenScore Lieder", "OpenScore 藝術歌曲"],
        "licence": "CC0",
        "licenceUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
        "credit": "OpenScore Lieder (CC0), openscore.cc",
        "homepage": "https://openscore.cc",
        "nonCommercial": False,
    },
    "openscore-quartets": {
        "repo": "OpenScore/StringQuartets",
        "name": ["OpenScore String Quartets", "OpenScore 弦樂四重奏"],
        "licence": "CC0",
        "licenceUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
        "credit": "OpenScore String Quartets (CC0), openscore.cc",
        "homepage": "https://openscore.cc",
        "nonCommercial": False,
    },
    "sapp-mozart": {
        "repo": "craigsapp/mozart-piano-sonatas",
        "name": ["Mozart piano sonatas (Craig Sapp, Humdrum)", "莫札特鋼琴奏鳴曲（Craig Sapp，Humdrum）"],
        "licence": "CC BY-NC-SA 4.0",
        "licenceUrl": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
        "credit": "Craig Stuart Sapp, mozart-piano-sonatas (CC BY-NC-SA 4.0)",
        "homepage": "https://github.com/craigsapp/mozart-piano-sonatas",
        "nonCommercial": True,
    },
    "sapp-joplin": {
        "repo": "craigsapp/joplin",
        "name": ["Scott Joplin (Craig Sapp, Humdrum)", "喬普林（Craig Sapp，Humdrum）"],
        "licence": "CC BY-NC-SA 4.0",
        "licenceUrl": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
        "credit": "Craig Stuart Sapp, joplin (CC BY-NC-SA 4.0)",
        "homepage": "https://github.com/craigsapp/joplin",
        "nonCommercial": True,
    },
}

# eras the corpus catalogue already gives these composers (one era per composer across the Library)
CORPUS_ERAS = {
    "Johann Sebastian Bach": "Baroque",
    "George Frideric Handel": "Baroque",
    "Wolfgang Amadeus Mozart": "Classical",
    "Joseph Haydn": "Classical",
    "Ludwig van Beethoven": "Classical",
    "Franz Schubert": "Romantic",
    "Robert Schumann": "Romantic",
    "Clara Schumann": "Romantic",
    "Frédéric Chopin": "Romantic",
    "Giuseppe Verdi": "Romantic",
    "Carl Maria von Weber": "Romantic",
    "Amy Beach": "Romantic",
    "Arnold Schoenberg": "20th century",
    "Scott Joplin": "Popular",
}

# folder names that "Surname,_Given" turns into the wrong name, or that must merge with another spelling
NAMES = {
    "Hensel,_Fanny_(Mendelssohn)": "Fanny Hensel",
    "Indy,_Vincent_d’": "Vincent d’Indy",
    "Hardelot,_Guy_d’": "Guy d’Hardelot",
    "Liliuokalani,_Queen_of_the_Hawaiian_Islands": "Liliʻuokalani",
    "Saint-Georges,_Joseph_Bologne": "Joseph Bologne, Chevalier de Saint-Georges",
}


def get(url, api=False):
    req = urllib.request.Request(url, headers={"User-Agent": "polyphonizer-catalog"})
    token = os.environ.get("GITHUB_TOKEN")
    if api and token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def head_sha(repo):
    return json.loads(get(f"https://api.github.com/repos/{repo}/commits/HEAD", api=True))["sha"]


def tree(repo, sha):
    data = json.loads(get(f"https://api.github.com/repos/{repo}/git/trees/{sha}?recursive=1", api=True))
    assert not data["truncated"], f"{repo}: tree truncated"
    return [t["path"] for t in data["tree"] if t["type"] == "blob"]


def raw(repo, sha, path):
    return get(f"https://raw.githubusercontent.com/{repo}/{sha}/{quote(path)}").decode("utf-8")


def pinned(repo, sha, path):
    """the URL main.py shows (readable: accents kept; fetch() percent-encodes them)"""
    return f"https://raw.githubusercontent.com/{repo}/{sha}/{path}"


def words(text):
    return re.sub(r"\s+", " ", text.replace("_", " ")).strip()


def composer_name(folder):
    """'Schubert,_Franz' → 'Franz Schubert'; 'Poldowski' → 'Poldowski'"""
    if folder in NAMES:
        return NAMES[folder]
    if "," in folder:
        surname, given = folder.split(",", 1)
        return words(f"{given} {surname}")
    return words(folder)


def repair_title(title):
    """folder names lost their slashes and colons: 'K.421417b' → 'K.421/417b', 'Hob.III50' → 'Hob. III:50'"""
    title = re.sub(r"Hob\.\s*([IVX]+[a-z]?)(\d)", r"Hob. \1:\2", title)

    def k(m):
        digits, letter = m.group(1), m.group(2)
        for i in range(2, len(digits) - 1):
            first, second = digits[:i], digits[i:]
            if second[0] != "0" and int(first) <= 626 and int(second) < int(first):
                return f"K.{first}/{second}{letter}"
        return m.group(0)

    return re.sub(r"K\.(\d{4,7})([a-z])\b", k, title)


def parse_lied(path):
    """scores/<Composer>/<Set or _>/<N_Title>/lc<id>.mxl → (composer folder, composer, set, title)"""
    _, folder, collection, title, _file = path.split("/")
    number = None
    if collection != "_":
        m = re.match(r"(\d+)_(.*)", title)
        if m:
            number, title = int(m.group(1)), m.group(2)
    group = "" if collection == "_" else words(collection) + (f", No. {number}" if number is not None else "")
    return folder, composer_name(folder), group, repair_title(words(title))


def parse_quartet(path):
    """scores/<Composer>/<Work>/sq<id>.mxl → (composer folder, composer, work)"""
    _, folder, work, _file = path.split("/")
    return folder, composer_name(folder), repair_title(words(work))


def born_years(lieder_yaml, quartets_tsv):
    """composer folder → year of birth, from OpenScore's own metadata"""
    born, folder = {}, None
    for line in lieder_yaml.splitlines():
        m = re.match(r"\s+path:\s*(.+)", line)
        if m:
            folder = m.group(1).strip()
        m = re.match(r"\s+born:\s*(\d{4})", line)
        if m and folder:
            born[folder] = int(m.group(1))
    rows = [line.split("\t") for line in quartets_tsv.splitlines()]
    head = rows[0]
    for r in rows[1:]:
        if len(r) == len(head) and r[head.index("born")].isdigit():
            born[r[head.index("path")]] = int(r[head.index("born")])
    return born


def born_in(folder, born):
    """a composer's year of birth; the metadata's folder can be longer ("Hensel,_Fanny_(Mendelssohn)")"""
    if folder in born:
        return born[folder]
    return next((year for path, year in born.items() if path.startswith(folder + "_")), None)


def era_of(composer, born):
    """the corpus's era if the corpus has the composer, else by when they were active (born + 35)"""
    if composer in CORPUS_ERAS:
        return CORPUS_ERAS[composer]
    if born is None:
        return "Other"
    if born < 1600:
        return "Renaissance"
    if born < 1700:
        return "Baroque"
    if born < 1770:
        return "Classical"
    return "Romantic" if born + 35 < 1900 else "20th century"


def hmd_titles(text):
    """Craig Sapp's index.hmd: file → (work title, movement), sort key → the same"""
    def clean(s):
        s = re.sub(r"K<sup>1</sup>\s*", "K. ", s)
        s = re.sub(r"\s*/\s*K<sup>6</sup>\s*([\w]+)", r" (K⁶ \1)", s)
        s = re.sub(r"<small>NMA</small>\s*", "NMA ", s)
        s = re.sub(r"<not>.*?</not>", lambda m: m.group(0)[5:-6], s)
        s = re.sub(r"<[^>]+>", "", html.unescape(s))
        s = re.sub(r"\bK (\d)", r"K. \1", s)
        return re.sub(r"\s+", " ", s).strip()

    work, out = "", {}
    for line in text.splitlines():
        cols = line.split("\t")
        if len(cols) < 5 or line.startswith(("!", "*")):
            continue
        desc = clean(cols[4])
        if cols[0].startswith("@"):
            work = re.sub(r"\s*\[[^\]]*\d{4}[^\]]*\]$", "", desc)  # drop the year in brackets
            continue
        out[cols[0]] = (work, desc)
        out["sort:" + cols[1]] = (work, desc)
    return out


def main():
    sources, rows = {}, []
    shas = {sid: head_sha(s["repo"]) for sid, s in SOURCES.items()}
    for sid, s in SOURCES.items():
        sources[sid] = {**s, "sha": shas[sid]}

    lieder_sha, sq_sha = shas["openscore-lieder"], shas["openscore-quartets"]
    born = born_years(raw("OpenScore/Lieder", lieder_sha, "data/composers.yaml"), raw("OpenScore/StringQuartets", sq_sha, "data/composers.tsv"))

    # OpenScore Lieder: voice and piano (the piano's two staves are two parts, as music21 reads them)
    for path in sorted(p for p in tree("OpenScore/Lieder", lieder_sha) if p.startswith("scores/") and p.endswith(".mxl")):
        folder, composer, group, title = parse_lied(path)
        rows.append(["openscore-lieder", pinned("OpenScore/Lieder", lieder_sha, path), None, title, composer, 3, None, "",
                     era_of(composer, born_in(folder, born)), group, "", ["voice", "piano", "piano"], [], "openscore-lieder"])

    # OpenScore String Quartets: a work split into several files (one per movement) gets "· 1/4" …, in id order
    quartets = sorted(p for p in tree("OpenScore/StringQuartets", sq_sha) if p.startswith("scores/") and p.endswith(".mxl"))
    by_work = {}
    for p in quartets:
        by_work.setdefault(p.rsplit("/", 1)[0], []).append(p)
    for files in by_work.values():
        files.sort(key=lambda p: int(re.sub(r"\D", "", p.rsplit("/", 1)[1])))
        for i, path in enumerate(files):
            folder, composer, title = parse_quartet(path)
            if len(files) > 1:
                title += f" · {i + 1}/{len(files)}"
            rows.append(["openscore-quartets", pinned("OpenScore/StringQuartets", sq_sha, path), None, title, composer, 4,
                         None, "", era_of(composer, born_in(folder, born)), "", "", ["violin", "violin", "viola", "cello"],
                         ["Violin I", "Violin II", "Viola", "Cello"], "openscore-quartets"])

    # Craig Sapp's Humdrum editions: piano (two staves)
    for sid, composer in (("sapp-mozart", "Wolfgang Amadeus Mozart"), ("sapp-joplin", "Scott Joplin")):
        repo, sha = SOURCES[sid]["repo"], shas[sid]
        titles = hmd_titles(raw(repo, sha, "index.hmd"))
        for path in sorted(p for p in tree(repo, sha) if p.startswith("kern/") and p.endswith(".krn")):
            stem = path[5:-4]
            work, movement = titles.get(path) or titles.get("sort:" + stem) or ("", stem)
            title = f"{work} · {movement}" if work else movement
            rows.append([sid, pinned(repo, sha, path), None, title, composer, 2, None, "", era_of(composer, None), "", "",
                         ["piano", "piano"], [], sid])

    rows.sort(key=lambda r: (r[4], r[9].lower(), r[3].lower(), r[1]))
    OUT.write_text(json.dumps({"sources": sources, "works": rows}, ensure_ascii=False, separators=(",", ":")))
    counts = {sid: sum(1 for r in rows if r[13] == sid) for sid in SOURCES}
    print(f"{len(rows)} works → {OUT}\n{json.dumps(counts)}\n{json.dumps(shas)}")


if __name__ == "__main__":
    main()
