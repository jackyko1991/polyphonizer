"""Compile a chat's score in this computer's Python, with the site's own prelude (frontend/src/engine/prelude.py).

    python compile_score.py <workspace> [<part> <first bar> <last bar>]

Run as a child process by the agent's `compile` tool (tools.py), so score code never runs inside the runner itself
and a slow score can be stopped. The workspace holds the project as the site has it: main.py, its other .py files,
and files/ (scores it load()s). Prints one JSON object: what the agent needs to judge the score (parts, bars, key,
time, tempo, page layout and each bar's notes in the editor's text form when asked) or the error with its file and
line, numbered as the editor numbers them.
"""

import json
import re
import sys
import traceback
import urllib.request
from pathlib import Path

PRELUDE = Path(__file__).resolve().parents[2] / "frontend" / "src" / "engine" / "prelude.py"
CACHE = Path.home() / ".cache" / "polyphonizer" / "scores"
MAX_BARS = 64


def _fetch_all(ns, sources):
    """download the scores the code asks for with fetch_score("…") (the prelude's allowed collections only), as the
    page does before a run; kept in ~/.cache/polyphonizer/scores"""
    for url in sorted({u for s in sources for u in re.findall(r"""fetch_score\(\s*["']([^"']+)["']""", s)}):
        if not ns["_score_url_ok"](url):
            continue
        local = CACHE / re.sub(r"[^\w.-]+", "_", url.split("://", 1)[-1])[-180:]
        if not local.exists():
            try:
                CACHE.mkdir(parents=True, exist_ok=True)
                with urllib.request.urlopen(url, timeout=30) as r:
                    local.write_bytes(r.read())
            except OSError:
                continue  # fetch_score() then says it could not get it, at its line
        ns["_FETCHED"][url] = str(local)


def _error(exc, workspace):
    """the error's last line and where it is: the main file (None) or a module, line numbered as in the editor"""
    file, line = None, None
    for frame in traceback.extract_tb(exc.__traceback__):
        if frame.filename == "score.py":
            file, line = None, frame.lineno - 2
        elif frame.filename.startswith(str(workspace / ".project")):
            file, line = Path(frame.filename).name, frame.lineno - 2
    if isinstance(exc, SyntaxError) and exc.filename:
        file = None if exc.filename == "score.py" else Path(exc.filename).name
        line = (exc.lineno or 2) - 2
    text = traceback.format_exception_only(type(exc), exc)[-1].strip()
    return {"ok": False, "error": text, "file": file, "line": line}


def compile_score(workspace, bars=None):
    workspace = Path(workspace).resolve()
    ns = {"__name__": "polyphonizer_prelude"}
    exec(compile(PRELUDE.read_text(encoding="utf-8"), str(PRELUDE), "exec"), ns)
    # the page keeps the project's modules in /project and imported scores in /files; here they are in the workspace
    ns["PROJECT"] = str(workspace / ".project")
    files_dir = workspace / "files"

    def load(name):
        from music21 import converter

        path = (files_dir / name).resolve()
        if not path.is_relative_to(files_dir.resolve()) or not path.exists():
            raise FileNotFoundError(f"{name} is not among the files the page sent (only the page has it)")
        return converter.parse(str(path))

    ns["load"] = load
    ns["_expose_helpers"]()
    main = (workspace / "main.py").read_text(encoding="utf-8")
    modules = [{"name": p.name, "code": p.read_text(encoding="utf-8")} for p in sorted(workspace.glob("*.py")) if p.name != "main.py"]
    _fetch_all(ns, [main, *(m["code"] for m in modules)])
    try:
        ns["_set_project"](json.dumps(modules))
        out = json.loads(ns["_run"](main))
    except BaseException as e:  # noqa: BLE001 - the learner's code: any error is the answer
        return _error(e, workspace)
    measures = out["measures"]
    result = {
        "ok": True,
        "title": out["title"],
        "parts": out["parts"],
        "key": out["key"],
        "time": out["time"],
        "bpm": out["bpm"],
        "bars": len(measures),
        "notes": len([n for n in out["notes"] if n["midi"]]),
        "pages": [{k: v for k, v in layout.items() if k in ("paper", "bars_per_line", "line_breaks", "page_breaks")} for layout in out["layouts"]],
    }
    if bars:
        part, first, last = bars
        last = min(last, first + MAX_BARS - 1)
        shown = {}
        for n in range(first, last + 1):
            try:
                shown[str(n)] = json.loads(ns["_bar_text"](part, n))
            except Exception as e:  # noqa: BLE001
                shown[str(n)] = {"error": str(e)}
        result["bar_text"] = {"part": part, "bars": shown}
    return result


if __name__ == "__main__":
    args = sys.argv[1:]
    bars = None
    if len(args) == 4:
        part = int(args[1]) if args[1].isdigit() else args[1]
        bars = (part, int(args[2]), int(args[3]))
    print(json.dumps(compile_score(args[0], bars)))
