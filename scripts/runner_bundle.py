"""The runner as one zip, for people who don't use git: download, unzip, `pixi run runner` (as Tensorizer's).

    python scripts/runner_bundle.py [--out dist]

writes <out>/polyphonizer-runner.zip with a polyphonizer-runner/ folder: pixi.toml, pixi.lock, LICENSE, NOTICE, the
runner (its engines' setup scripts, not the engines themselves: omr-setup and audio-setup fetch them), the site's
prelude.py (the AI agent's compile tool runs scores with it), and a short README. The release workflow
(.github/workflows/runner-release.yml) publishes it at a fixed URL:

    https://github.com/jackyko1991/polyphonizer/releases/download/runner-latest/polyphonizer-runner.zip
"""

from __future__ import annotations

import argparse
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOP = "polyphonizer-runner"
FILES = ["pixi.toml", "pixi.lock", "LICENSE", "NOTICE", "frontend/src/engine/prelude.py"]
DIRS = ["runner"]
# (the tests, caches, and an engine installed here by omr-setup stay out)
SKIP = {"__pycache__", ".pytest_cache", ".ruff_cache", "tests", "copisteria"}

README = """# Polyphonizer runner

Turns pages and recordings into scores, and runs your own AI agent, for the website
(https://jackyko1991.github.io/polyphonizer/), on this computer.

1. Install pixi once: https://pixi.sh
2. Once, for what you need (each downloads its models):

   pixi run -e omr omr-setup        # PDFs and photos of printed music
   pixi run -e audio audio-setup    # recordings and videos (uses an NVIDIA GPU or a Mac's GPU when there is one)

3. Each time, in this folder:

   pixi run runner

The website finds it at http://127.0.0.1:8765 by itself (Transcribe, and the AI agent in the score editor).
It listens on this computer only. To run it on a server, see AI agent > Runner on the website.
"""


def members() -> list[Path]:
    paths = [ROOT / f for f in FILES if (ROOT / f).is_file()]
    for d in DIRS:
        for p in sorted((ROOT / d).rglob("*")):
            if p.is_file() and not SKIP & set(p.relative_to(ROOT).parts) and p.suffix != ".pyc":
                paths.append(p)
    return paths


def build(out: Path) -> Path:
    out.mkdir(parents=True, exist_ok=True)
    target = out / f"{TOP}.zip"
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(f"{TOP}/README.md", README)
        for p in members():
            z.write(p, f"{TOP}/{p.relative_to(ROOT).as_posix()}")
    return target


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="dist")
    print(build(Path(parser.parse_args().out)))
