"""An agent of the learner's own, outside the site (Claude Code or Codex in a terminal, Claude Desktop, claude.ai, any
MCP client), connected to the score on their page: the runner's MCP tools at <runner>/mcp/<connector token>.

The page asks for a token (POST /api/agents/connector) and shows the URL to give the agent. While the AI panel is open
the page keeps the runner's copy of the score on screen up to date (POST …/sync), and fetches what the agent did
(GET …/events): each file it writes reaches the panel as a change to Apply or Discard, so the page stays the truth.
Tokens are kept as their SHA-256 in ~/.cache/polyphonizer/connectors.json, so an agent stays connected across restarts
of the runner (the copy of the score comes back with the page's next sync).
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import tempfile
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

MAX_EVENTS = 300
FILE_NAME = re.compile(r"^[A-Za-z_][\w-]{0,60}\.py$")
MAX_FILE = 200_000
MAX_FILES = 40
STORE = Path(os.environ.get("PZ_CACHE", Path.home() / ".cache" / "polyphonizer")) / "connectors.json"


@dataclass
class Connector:
    id: str
    workspace: Path
    title: str = ""
    client: str = ""  # the agent's name, from its MCP initialize
    mode: str = "ask"  # the page's mode: in plan mode write_file is refused
    last_seen: float | None = None  # the agent's last MCP request
    events: list = field(default_factory=list)
    seq: int = 0
    lock: threading.Lock = field(default_factory=threading.Lock)

    def emit(self, event: dict) -> None:
        with self.lock:
            self.seq += 1
            self.events.append({**event, "seq": self.seq})
            del self.events[:-MAX_EVENTS]

    def after(self, seq: int) -> list[dict]:
        with self.lock:
            return [e for e in self.events if e["seq"] > seq]


_connectors: dict[str, Connector] = {}  # sha256(token) → connector
_lock = threading.Lock()
_root = Path(tempfile.mkdtemp(prefix="pz-connectors-"))


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _new(cid: str) -> Connector:
    ws = _root / cid / "score"
    ws.mkdir(parents=True, exist_ok=True)
    return Connector(id=cid, workspace=ws)


def _save() -> None:
    try:
        STORE.parent.mkdir(parents=True, exist_ok=True)
        tmp = STORE.with_suffix(".tmp")
        tmp.write_text(json.dumps({h: c.id for h, c in _connectors.items()}))
        os.chmod(tmp, 0o600)
        tmp.replace(STORE)
    except OSError:
        pass  # (no cache folder: the connection lasts as long as the runner)


def load() -> None:
    """the connections made before this runner started"""
    try:
        saved = json.loads(STORE.read_text())
    except (OSError, ValueError):
        return
    with _lock:
        for h, cid in saved.items() if isinstance(saved, dict) else []:
            if isinstance(h, str) and isinstance(cid, str) and re.fullmatch(r"[0-9a-f]{12}", cid) and h not in _connectors:
                _connectors[h] = _new(cid)


def create(previous: str | None = None) -> tuple[str, Connector]:
    """a new connection (its token is shown to the learner once); `previous`: the token it replaces"""
    token = "pzc_" + secrets.token_urlsafe(24)
    with _lock:
        if previous:
            _connectors.pop(_hash(previous), None)
        c = _new(secrets.token_hex(6))
        _connectors[_hash(token)] = c
        _save()
    return token, c


def lookup(token: str | None) -> Connector | None:
    if not token or not token.startswith("pzc_"):
        return None
    with _lock:
        return _connectors.get(_hash(token))


def revoke(token: str) -> bool:
    with _lock:
        gone = _connectors.pop(_hash(token), None) is not None
        if gone:
            _save()
    return gone


def sync(c: Connector, title: str, files: list, mode: str = "ask") -> int:
    """the score on the learner's screen, into the connector's folder (its .py files replaced): how many files"""
    keep = {}
    for f in files[:MAX_FILES] if isinstance(files, list) else []:
        name, code = str((f or {}).get("name", "")), (f or {}).get("code")
        if FILE_NAME.match(name) and isinstance(code, str) and len(code) <= MAX_FILE:
            keep[name] = code
    if "main.py" not in keep:
        raise ValueError("the score's main.py is missing")
    for old in c.workspace.glob("*.py"):
        if old.name not in keep:
            old.unlink()
    for name, code in keep.items():
        (c.workspace / name).write_text(code, encoding="utf-8")
    c.title = str(title or "")[:200]
    c.mode = mode if mode in ("ask", "auto", "plan") else "ask"
    return len(keep)


def status(c: Connector) -> dict:
    seen = c.last_seen
    return {"id": c.id, "client": c.client, "last_seen_s": None if seen is None else round(time.time() - seen), "has_score": (c.workspace / "main.py").exists()}
