"""Write which Library works have a harmonic analysis in When in Rome (frontend/src/library/analyses.json).

    GITHUB_TOKEN=... python scripts/harmony_catalog.py          (pixi run harmony)

When in Rome (github.com/MarkGotham/When-in-Rome, Mark Gotham et al., CC BY-SA 4.0) holds Roman-numeral analyses
(RomanText) of over a thousand works. Each analysis sits in a folder that also says which score it analyses: OpenScore
Lieder songs carry their lc<id> (the same id as the OpenScore files the Library lists), and the rest a remote.json
naming the file in music21's corpus ("music21": ["bwv269.mxl"]). Those are matched to the Library's rows here; the
analysis is downloaded only when the work is opened (fetch_score, then with_harmony puts the numerals under the bass).

Output: {"sha": commit, "works": {<Library row path>: <analysis path in the repository>}}: a row path is music21's
corpus path ("bach/bwv269.mxl") or an OpenScore Lieder file's lc<id>.
"""

import json
import os
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import quote

REPO = "MarkGotham/When-in-Rome"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "frontend" / "src" / "library" / "analyses.json"


def get(url, api=False):
    req = urllib.request.Request(url, headers={"User-Agent": "polyphonizer-catalog"})
    token = os.environ.get("GITHUB_TOKEN")
    if api and token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def corpus_key(name, corpus_paths):
    """music21's corpus file named in remote.json ('bwv269.mxl' or 'monteverdi/madrigal.3.1.mxl') → the Library's
    corpus row path, or None"""
    name = name.strip().lstrip("/")
    if name in corpus_paths:
        return name
    hits = [p for p in corpus_paths if p.endswith("/" + name)]
    return hits[0] if len(hits) == 1 else None


def main():
    sha = json.loads(get(f"https://api.github.com/repos/{REPO}/commits/HEAD", api=True))["sha"]
    tree = json.loads(get(f"https://api.github.com/repos/{REPO}/git/trees/{sha}?recursive=1", api=True))
    assert not tree["truncated"]
    paths = [t["path"] for t in tree["tree"] if t["type"] == "blob"]
    folders = sorted({p.rsplit("/", 1)[0] for p in paths if p.startswith("Corpus/") and not p.startswith("Corpus/Resources/") and p.endswith("/analysis.txt")})
    in_folder = {}
    for p in paths:
        if "/" in p:  # (files at the top have no folder)
            folder, name = p.rsplit("/", 1)
            in_folder.setdefault(folder, []).append(name)

    corpus = json.loads((ROOT / "frontend/src/library/catalog.json").read_text())["works"]
    corpus_paths = {w[1] for w in corpus}
    lieder = json.loads((ROOT / "frontend/src/library/collections.json").read_text())["works"]
    lc_ids = {m.group(1) for w in lieder if w[13] == "openscore-lieder" for m in [re.search(r"/(lc\d+)\.mxl$", w[1])] if m}

    def match(folder):
        files = in_folder.get(folder, [])
        lc = next((f[:-5] for f in files if re.fullmatch(r"lc\d+\.mscz", f)), None)
        if lc and lc in lc_ids:
            return [(lc, folder)]
        if "remote.json" not in files:
            return []
        try:
            remote = json.loads(get(f"https://raw.githubusercontent.com/{REPO}/{sha}/{quote(folder)}/remote.json"))
        except Exception:
            return []
        names = remote.get("music21") or []
        names = [names] if isinstance(names, str) else names
        return [(k, folder) for k in (corpus_key(n, corpus_paths) for n in names) if k]

    with ThreadPoolExecutor(16) as pool:
        pairs = [pair for found in pool.map(match, folders) for pair in found]
    works = {key: f"{folder}/analysis.txt" for key, folder in sorted(pairs)}
    OUT.write_text(json.dumps({"sha": sha, "works": works}, ensure_ascii=False, separators=(",", ":")))
    print(f"{len(works)} Library works have an analysis (of {len(folders)}) → {OUT}")


if __name__ == "__main__":
    main()
