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
  Craig Sapp: Haydn sonatas  CC BY-NC-SA 4.0  kern/sonata<NN>-<movement>.krn  (titles from each file's header)
  Craig Sapp: Scarlatti      CC BY-NC-SA 4.0  kern/L<NNN>K<NNN>.krn           (titles from each file's header)
  ASAP (piano)               CC BY-NC-SA 4.0  <Composer>/<…>/xml_score.musicxml (titles from metadata.csv)
  Josquin Research Project   CC BY-NC 4.0     <Abc>/<Abc><id>-<Title>.krn     (titles from index.hmd, composer and
                                                                                voices from each file's header)
Left out: repositories with no licence statement (craigsapp/beethoven-piano-sonatas, chopin-preludes,
musedata/humdrum-mozart-quartets); adactio/TheSession-data, whose licence forbids processing it with language models
(Polyphonizer has an AI helper); craigsapp/bach-370-chorales, already in music21's corpus.

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

SOURCES.update({
    "sapp-haydn": {
        "repo": "craigsapp/haydn-piano-sonatas",
        "name": ["Haydn keyboard sonatas (Craig Sapp, Humdrum)", "海頓鍵盤奏鳴曲（Craig Sapp，Humdrum）"],
        "licence": "CC BY-NC-SA 4.0",
        "licenceUrl": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
        "credit": "Craig Stuart Sapp, haydn-piano-sonatas (CC BY-NC-SA 4.0)",
        "homepage": "https://github.com/craigsapp/haydn-piano-sonatas",
        "nonCommercial": True,
    },
    "sapp-scarlatti": {
        "repo": "craigsapp/scarlatti-keyboard-sonatas",
        "name": ["Scarlatti keyboard sonatas (Craig Sapp, Humdrum)", "史卡拉第鍵盤奏鳴曲（Craig Sapp，Humdrum）"],
        "licence": "CC BY-NC-SA 4.0",
        "licenceUrl": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
        "credit": "Craig Stuart Sapp, scarlatti-keyboard-sonatas (CC BY-NC-SA 4.0)",
        "homepage": "https://github.com/craigsapp/scarlatti-keyboard-sonatas",
        "nonCommercial": True,
    },
    "asap": {
        "repo": "fosfrancesco/asap-dataset",
        "name": ["ASAP piano scores", "ASAP 鋼琴樂譜"],
        "licence": "CC BY-NC-SA 4.0",
        "licenceUrl": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
        "credit": "ASAP dataset, Foscarin et al. (CC BY-NC-SA 4.0)",
        "homepage": "https://github.com/fosfrancesco/asap-dataset",
        "nonCommercial": True,
    },
    "jrp": {
        "repo": "josquin-research-project/jrp-scores",
        "name": ["Josquin Research Project", "若斯坎研究計畫"],
        "licence": "CC BY-NC 4.0",
        "licenceUrl": "https://creativecommons.org/licenses/by-nc/4.0/",
        "credit": "The Josquin Research Project, josquin.stanford.edu (CC BY-NC 4.0)",
        "homepage": "https://josquin.stanford.edu",
        "nonCommercial": True,
    },
})

# ASAP's composer folders, and when the composers not in OpenScore's metadata were born (for the eras)
ASAP_NAMES = {
    "Bach": "Johann Sebastian Bach", "Balakirev": "Mily Balakirev", "Beethoven": "Ludwig van Beethoven",
    "Brahms": "Johannes Brahms", "Chopin": "Frédéric Chopin", "Debussy": "Claude Debussy", "Glinka": "Mikhail Glinka",
    "Haydn": "Joseph Haydn", "Liszt": "Franz Liszt", "Mozart": "Wolfgang Amadeus Mozart", "Prokofiev": "Sergei Prokofiev",
    "Rachmaninoff": "Sergei Rachmaninoff", "Ravel": "Maurice Ravel", "Schubert": "Franz Schubert",
    "Schumann": "Robert Schumann", "Scriabin": "Alexander Scriabin",
}
BORN = {"Mily Balakirev": 1837, "Johannes Brahms": 1833, "Claude Debussy": 1862, "Mikhail Glinka": 1804,
        "Franz Liszt": 1811, "Sergei Prokofiev": 1891, "Sergei Rachmaninoff": 1873, "Maurice Ravel": 1875,
        "Alexander Scriabin": 1872, "Domenico Scarlatti": 1685}

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
    # files only: not symbolic links (mode 120000; JRP links some works into a second composer's folder)
    return [t["path"] for t in data["tree"] if t["type"] == "blob" and t["mode"] != "120000"]


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


def humdrum_header(text):
    """a Humdrum file's reference records (!!!KEY: value; a key given twice keeps both, joined by " / ") and its
    number of **kern spines (the voices)"""
    refs = {}
    for line in text.splitlines():
        m = re.match(r"!!!([^!:]+):\s*(.*)", line)
        if m:
            k, v = m.group(1).strip(), m.group(2).strip()
            refs[k] = f"{refs[k]} / {v}" if k in refs else v
        elif line.startswith("**"):
            refs["_voices"] = line.split("\t").count("**kern")
    return refs


def humdrum_name(com):
    """'Haydn, Franz Joseph' → 'Franz Joseph Haydn'"""
    if "," in com:
        surname, given = com.split(",", 1)
        return words(f"{given} {surname}")
    return words(com)


def many(fn, items, threads=16):
    """fn over items, a few at a time (small raw files from GitHub)"""
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(threads) as pool:
        return list(pool.map(fn, items))


def asap_title(t):
    """metadata.csv's title: 'Piano_Sonatas_17-3' → 'Piano Sonata No. 17 · 3'; 'Fugue_bwv_846' → 'Fugue, BWV 846';
    'Etudes_op_25_10' → 'Etude Op. 25 No. 10'; 'Ballades_2' → 'Ballade No. 2'"""
    t = words(t)
    t = re.sub(r"\bbwv (\d+)", r"BWV \1", t, flags=re.I)
    t = re.sub(r"^(Prelude|Fugue) BWV", r"\1, BWV", t)
    t = re.sub(r"\bop (\d+)", r"Op. \1", t, flags=re.I)
    t = re.sub(r"^(\w+ )?(Sonata)s (\d+)-(\d+)$", lambda m: f"{m.group(1) or ''}{m.group(2)} No. {m.group(3)} · {m.group(4)}", t)
    t = re.sub(r"^(\w+?)s (Op\. \d+) (\d+)$", r"\1 \2 No. \3", t)
    t = re.sub(r"^(.*?)s (\d+)$", r"\1 No. \2", t)
    t = re.sub(r"^Sonata (\d+) (\d)\w*$", r"Sonata No. \1 · \2", t)
    t = re.sub(r"^(Scherzo|Polonaise) No\. (\d\d+)$", r"\1, Op. \2", t)  # Chopin's: opus numbers
    t = re.sub(r"\bop\.?(\d+)", r"Op. \1", t, flags=re.I)
    t = re.sub(r"^(\w+) (\d+) (\D.*)$", r"\1 · \2. \3", t)
    return t


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

    # Craig Sapp's Haydn and Scarlatti sonatas: titles from each file's header
    for sid in ("sapp-haydn", "sapp-scarlatti"):
        repo, sha = SOURCES[sid]["repo"], shas[sid]
        paths = sorted(p for p in tree(repo, sha) if p.startswith("kern/") and p.endswith(".krn"))
        for path, h in zip(paths, many(lambda p: humdrum_header(raw(repo, sha, p)), paths)):
            composer = humdrum_name(h.get("COM") or h.get("COA") or "")
            composer = {"Franz Joseph Haydn": "Joseph Haydn"}.get(composer, composer)
            title = h.get("OTL", path[5:-4])
            if sid == "sapp-haydn":
                cat = h.get("SCT", "")
                title = f"{title} ({cat})" if cat else title
                if h.get("OMV"):
                    title += f" · {h['OMV']}. {h.get('OMD', '').rstrip('.')}".rstrip(". ")
            rows.append([sid, pinned(repo, sha, path), None, title, composer, 2, None, "", era_of(composer, BORN.get(composer)),
                         "", "", ["piano", "piano"], [], sid])

    # ASAP: piano scores (one per work; metadata.csv has a row per performance)
    repo, sha = SOURCES["asap"]["repo"], shas["asap"]
    import csv, io

    seen = set()
    for m in csv.DictReader(io.StringIO(raw(repo, sha, "metadata.csv"))):
        path = m["xml_score"]
        if path in seen:
            continue
        seen.add(path)
        composer = ASAP_NAMES.get(m["composer"], m["composer"])
        rows.append(["asap", pinned(repo, sha, path), None, asap_title(m["title"]), composer, 2, None, "",
                     era_of(composer, BORN.get(composer)), "", "", ["piano", "piano"], [], "asap"])

    # The Josquin Research Project: titles from index.hmd (by the file's id), the mass a movement belongs to from its
    # file name, composer and voices from each file's header
    repo, sha = SOURCES["jrp"]["repo"], shas["jrp"]
    titles = {}
    for line in raw(repo, sha, "index.hmd").splitlines():
        cols = line.split("\t")
        if len(cols) >= 5 and not line.startswith(("!", "*")):
            m = re.search(r"<link>(.*)\([^()]*\)</link>", cols[4])
            if m:
                titles[cols[1]] = html.unescape(m.group(1)).strip()
    paths = sorted(p for p in tree(repo, sha) if p.endswith(".krn") and "/" in p)
    headers = many(lambda p: humdrum_header(raw(repo, sha, p)), paths)

    def attribution(h):
        """the header's composer (COM; COA, an attribution, where the authorship is less sure: most of Josquin's), readable:
        entities decoded, one name when the same one is given twice"""
        names = list(dict.fromkeys(humdrum_name(html.unescape(c)) for c in (h.get("COM") or h.get("COA") or "Anonymous").split(" / ")))
        return " / ".join(n.replace("Johannes Johannes", "Johannes") for n in names)

    # a folder is one composer (Agr, Jos …): its name is the attribution most of its files give
    from collections import Counter

    folder_name = {}
    for path, h in zip(paths, headers):
        folder_name.setdefault(path.split("/", 1)[0], Counter())[attribution(h)] += 1
    # a folder no one composer holds most of (Mou: Mouton, Moulu, anonymous) names each work by its own attribution
    folder_name = {f: (c.most_common(1)[0][0] if c.most_common(1)[0][1] >= 0.6 * c.total() else None) for f, c in folder_name.items()}
    folder_name["Ano"] = "Anonymous"
    # short names ("Mouton") → the full name the set uses elsewhere ("Jean Mouton")
    full = {n.split()[-1]: n for n in folder_name.values() if n and " " in n and "/" not in n}
    full.update({"Mouton": "Jean Mouton", "Josquin": "Josquin des Prez"})
    for path, h in zip(paths, headers):
        stem = path.rsplit("/", 1)[1][:-4]
        sid_ = stem.split("-", 1)[0]
        parts = stem.split("-")
        mass = words(parts[1]) if len(parts) > 2 and parts[1].startswith("Missa") else ""
        # (some of index.hmd's titles are escaped twice: "Depart&amp;eacute;s vous")
        title = html.unescape(html.unescape(titles.get(sid_) or h.get("OTL") or words(parts[1] if len(parts) > 1 else stem)))
        composer = folder_name[path.split("/", 1)[0]] or full.get(attribution(h).rstrip("?"), attribution(h))
        # a different or doubtful attribution in the file ("Compere / Josquin?") is kept as the original composer
        said = attribution(h)
        voices = h.get("_voices") or 4
        rows.append(["jrp", pinned(repo, sha, path), None, title, composer, voices, None, "", "Renaissance", mass,
                     "" if said in (composer, "Anonymous") else said,
                     ["voice"] * voices, [], "jrp"])

    rows.sort(key=lambda r: (r[4], r[9].lower(), r[3].lower(), r[1]))
    OUT.write_text(json.dumps({"sources": sources, "works": rows}, ensure_ascii=False, separators=(",", ":")))
    counts = {sid: sum(1 for r in rows if r[13] == sid) for sid in SOURCES}
    print(f"{len(rows)} works → {OUT}\n{json.dumps(counts)}\n{json.dumps(shas)}")


if __name__ == "__main__":
    main()
