"""Write the Library's index of IMSLP's works (data/imslp.tsv, built into the Library's database by scripts/library-db.ts).

    python scripts/imslp_catalog.py            # pixi run imslp; about ten minutes, one page a second or so

IMSLP (imslp.org) holds hundreds of thousands of works, mostly scanned editions behind a copyright notice for the
reader's country, so their files are not opened here: the Library lists each work and links to its page on IMSLP,
where the learner downloads it (and Transcribe can turn a PDF into notes). The list comes from IMSLP's public work-list
API (imslp.org/wiki/IMSLP:API), a page of 1,000 works at a time, read one after another with a pause between pages.
Only the title, composer, catalogue number, page id and page name are kept. A work is linked by its page name
(imslp.org/wiki/<name>): IMSLP no longer answers links by page id (index.php?curid=…) or Special:Redirect without a
CAPTCHA. Most page names are "<title> (<composer as IMSLP writes it>)", so the composer's IMSLP name is kept once and
a work's page name only where it differs.

Output: a tab-separated file, loaded by the Library only when IMSLP is asked for:
    #imslp <date> <count>
    @<composer index>\t<composer name>\t<IMSLP's name>   (once per composer: "Ludwig van Beethoven", "Beethoven, Ludwig van")
    <page id>\t<composer index>\t<title>\t<catalogue number>[\t<page name, where not "<title> (<IMSLP's name>)">]
"""

import json
import re
import time
import urllib.request
from datetime import date
from pathlib import Path

API = "https://imslp.org/imslpscripts/API.ISCR.php?account=worklist/disclaimer=accepted/sort=id/type=2/start={start}/retformat=json"
OUT = Path(__file__).resolve().parent.parent / "data" / "imslp.tsv"
AGENT = "polyphonizer-catalog (+https://github.com/jackyko1991/polyphonizer)"
PAUSE = 1.0


def get(start):
    req = urllib.request.Request(API.format(start=start), headers={"User-Agent": AGENT})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read())
        except Exception:
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"IMSLP did not answer for start={start}")


def composer_name(c):
    """IMSLP's 'Beethoven, Ludwig van' → 'Ludwig van Beethoven'; 'Anonymous' stays"""
    c = re.sub(r"@\w+\^\s*", "", re.sub(r"\s+", " ", c or "")).strip()
    if "," in c:
        surname, given = c.split(",", 1)
        given = given.strip()
        # a particle stays with its surname: "Indy, Vincent d'" → "Vincent d'Indy"
        return (f"{given}{surname.strip()}" if re.search(r"[dDlL]['’]$", given) else f"{given} {surname.strip()}").strip()
    return c


def clean(text):
    """one line of text, tabs and line breaks out"""
    return re.sub(r"[\t\r\n]+", " ", text or "").strip()


def work(entry):
    """an API entry → (page id, composer, IMSLP's composer, title, catalogue number, page name), or None for one that
    isn't a work"""
    v = entry.get("intvals") or {}
    pid = str(v.get("pageid") or "").strip()
    title = clean(v.get("worktitle") or re.sub(r"\s*\([^()]*\)$", "", entry.get("id", "")))
    if not pid.isdigit() or not title:
        return None
    raw = clean(v.get("composer") or "")
    return pid, composer_name(raw), raw, title, clean(v.get("icatno") or ""), clean(entry.get("id", ""))


def main():
    works, start = [], 0
    while True:
        page = get(start)
        meta = page.pop("metadata", {})
        works += [w for w in (work(e) for e in page.values()) if w]
        print(f"{start + len(page)} …", flush=True)
        if not meta.get("moreresultsavailable"):
            break
        start += len(page)
        time.sleep(PAUSE)
    composers = {}
    lines = []
    for pid, composer, raw, title, cat, page in works:
        key = (composer, raw)
        if key not in composers:
            composers[key] = len(composers)
            lines.append(f"@{composers[key]}\t{composer}\t{raw}")
        extra = "" if page == f"{title} ({raw})" else f"\t{page}"
        lines.append(f"{pid}\t{composers[key]}\t{title}\t{cat}{extra}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(f"#imslp {date.today().isoformat()} {len(works)}\n" + "\n".join(lines) + "\n", encoding="utf-8")
    print(f"{len(works)} works by {len(composers)} composers → {OUT} ({OUT.stat().st_size // 1_000_000} MB)")


if __name__ == "__main__":
    main()
