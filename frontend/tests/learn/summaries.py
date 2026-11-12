"""Runs each score code in the JSON list on stdin through prelude.py `_run`; prints {code: summary or {"error": …}}.
The MusicXML is dropped (the checker doesn't read it). Run from frontend/ with a Python that has music21."""

import json
import sys

ns = {}
exec(open("src/engine/prelude.py", encoding="utf-8").read(), ns)
exec(open("src/engine/markings.py", encoding="utf-8").read(), ns)
ns["__name__"] = "__main__"
sys.modules["__main__"].__dict__.update(ns)

out = {}
for code in json.load(sys.stdin):
    try:
        summary = json.loads(ns["_run"](code))
        # kept only where a test draws the markings (Verovio must engrave them)
        if not any(f"{name}(" in code for name in ns["MARKING_HELPERS"]):
            summary["musicxml"] = ""
        out[code] = summary
    except Exception as e:  # noqa: BLE001
        out[code] = {"error": f"{type(e).__name__}: {e}"}
json.dump(out, sys.stdout, indent=1, ensure_ascii=False, sort_keys=True)
