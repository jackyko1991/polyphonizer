"""The runner's OMR engine: KobiMusic's copisteria reader with the copista-28m detector (Apache-2.0).

    python runner/engines/copista.py <page.pdf|png|jpg> <out.musicxml>

Run in the omr environment (pixi run omr-setup puts the reader in runner/engines/copisteria with its weights). The
reader writes one MusicXML per page; the pages are joined into one score here (with music21: each part's measures one
after another), so the editor gets the whole piece.
"""

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
READER = HERE / "copisteria"
WEIGHTS = [READER / "models" / "evidence-2m.pt", READER / "models" / "small" / "v7_obj-recall-30m_best.pt"]


def installed() -> bool:
    return all(p.exists() for p in WEIGHTS)


def pdf_pages(pdf: Path) -> int:
    """how many pages a PDF has (poppler's pdfinfo)"""
    out = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True).stdout
    m = re.search(r"^Pages:\s+(\d+)", out, re.M)
    return int(m.group(1)) if m else 1


def page_order(path: Path):
    """pages in reading order: the last number in the file name ("score-2" before "score-10")"""
    nums = re.findall(r"\d+", path.stem)
    return (int(nums[-1]) if nums else 0, path.name)


def join_pages(files: list[Path]) -> str:
    """the pages' MusicXML as one score: page 1, then each later page's measures appended part by part (renumbered).
    A page whose parts don't match page 1's is left out (a title page, a page the reader got wrong)."""
    from music21 import converter, musicxml, stream

    scores = [converter.parse(str(f)) for f in files]
    first = scores[0]
    parts = list(first.parts)
    for s in scores[1:]:
        later = list(s.parts)
        if len(later) != len(parts):
            print(f"left out a page with {len(later)} parts (page 1 has {len(parts)})", file=sys.stderr)
            continue
        for p, q in zip(parts, later):
            n = len(p.getElementsByClass(stream.Measure))
            for m in q.getElementsByClass(stream.Measure):
                n += 1
                m.number = n
                p.append(m)
    return musicxml.m21ToXml.GeneralObjectExporter(first).parse().decode("utf-8")


def main(src: str, out: str) -> None:
    src_p, out_p = Path(src).resolve(), Path(out).resolve()
    with tempfile.TemporaryDirectory(prefix="pz-copista-") as tmp:
        cmd = [sys.executable, "-m", "copisteria.pipeline", "--out", tmp]
        cmd += ["--pdf", str(src_p), "--range", f"1-{pdf_pages(src_p)}"] if src_p.suffix.lower() == ".pdf" else [str(src_p)]
        # (run from the reader's folder: it finds its models/ there)
        subprocess.run(cmd, cwd=READER, check=True, stdout=sys.stderr)
        pages = sorted(Path(tmp).glob("*.musicxml"), key=page_order)
        if not pages:
            raise SystemExit("the reader wrote no pages")
        out_p.write_text(pages[0].read_text() if len(pages) == 1 else join_pages(pages))
        print(json.dumps({"pages": len(pages)}), file=sys.stderr)


if __name__ == "__main__":
    main(*sys.argv[1:3])
