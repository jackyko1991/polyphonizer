"""Install the runner's OMR engine (pixi run omr-setup): KobiMusic's copisteria reader, Apache-2.0.

Clones the reader at a pinned commit into runner/engines/copisteria (not in git), installs it into the omr
environment (its dependencies come from pixi.toml), and downloads its weights from Hugging Face (kobimusic/copisteria,
about 131 MB) into the reader's models/ folder, where it looks for them.
"""

import subprocess
import sys
from pathlib import Path

REPO_URL = "https://github.com/kobimusic/copisteria"
COMMIT = "c685f280914d91a694494588d9f6a376d7917eba"  # copisteria 1.3.4
WEIGHTS = "kobimusic/copisteria"
READER = Path(__file__).resolve().parent / "copisteria"


def run(*cmd, cwd=None):
    print("$", " ".join(cmd))
    subprocess.run(cmd, cwd=cwd, check=True)


def main():
    if not (READER / ".git").exists():
        run("git", "clone", "--quiet", REPO_URL, str(READER))
    run("git", "fetch", "--quiet", "origin", COMMIT, cwd=READER)
    run("git", "checkout", "--quiet", COMMIT, cwd=READER)
    # the reader itself only: torch, opencv … are the omr environment's
    import os
    import sysconfig

    # (as a user who can't write to this Python's packages, as in the Docker image: into the user's own)
    user = [] if os.access(sysconfig.get_paths()["purelib"], os.W_OK) else ["--user"]
    run(sys.executable, "-m", "pip", "install", "--quiet", "--no-deps", *user, "-e", str(READER))

    from huggingface_hub import hf_hub_download

    hf_hub_download(WEIGHTS, "evidence-2m.pt", local_dir=READER / "models")
    for f in ("v7_obj-recall-30m_best.pt", "v7_obj-recall_best.pt"):
        hf_hub_download(WEIGHTS, f, local_dir=READER / "models" / "small")
    print(f"copisteria is ready in {READER}; start the runner with: pixi run runner")


if __name__ == "__main__":
    main()
