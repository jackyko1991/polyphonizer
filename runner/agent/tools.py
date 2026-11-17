"""Polyphonizer's tools for the agent, served as an MCP server (Streamable HTTP, JSON answers) at /mcp/<token>.

Every agent reaches them the same way: Claude Code through the Agent SDK's HTTP MCP config, Codex through
`-c mcp_servers.polyphonizer.url=…`. A token belongs to one chat's turn and is revoked when the turn ends, so the tools
only ever see that chat's workspace. A connector token (connector.py) is an agent outside the site connected to the
score on the learner's page: it also gets get_score, read_file and write_file (it has no folder of its own), and its
writes reach the page as changes to apply.

    compile   run the score with the site's prelude (compile_score.py, in a child process) and say what came out:
              parts, bars, key, time, tempo, pages, or the error and its line; optionally the notes of some bars
    ask_user  a multiple-choice question in the chat, when a decision is the learner's

The MCP side is the small part of the protocol a tool server needs (initialize, tools/list, tools/call, ping),
answered as plain JSON, which the Streamable HTTP transport allows.
"""

from __future__ import annotations

import json
import secrets
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from pathlib import Path

from . import connector, turns

PROTOCOL = "2025-06-18"
COMPILE_TIMEOUT_S = 90
COMPILER = Path(__file__).resolve().parent / "compile_score.py"


@dataclass
class Binding:
    workspace: Path
    turn: turns.Turn | connector.Connector  # where its events go (both have emit)
    kind: str = "chat"  # or "connector": an agent outside the site


_tokens: dict[str, Binding] = {}
_lock = threading.Lock()


def token_for(workspace: Path, turn: turns.Turn) -> str:
    token = secrets.token_urlsafe(24)
    with _lock:
        _tokens[token] = Binding(workspace, turn)
    return token


def revoke(token: str) -> None:
    with _lock:
        _tokens.pop(token, None)


def binding(token: str) -> Binding | None:
    with _lock:
        return _tokens.get(token)


FILE_TOOLS = [
    {
        "name": "get_score",
        "description": (
            "The score open on the learner's Polyphonizer page: its title and files (main.py, which must set `score`, "
            "and any other .py modules), with main.py's code. Polyphonizer scores are Python with music21 and the "
            "site's helpers (tiny(), together(), edit_bar() …). Call this first."
        ),
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "read_file",
        "description": "One of the score's .py files as it is now.",
        "inputSchema": {"type": "object", "properties": {"name": {"type": "string", "description": "main.py, or another .py file"}}, "required": ["name"]},
    },
    {
        "name": "write_file",
        "description": (
            "Write one of the score's .py files (all of its code). It is shown on the learner's page as a change "
            "they apply or discard; compile after writing, to be sure it runs."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {"name": {"type": "string"}, "code": {"type": "string"}},
            "required": ["name", "code"],
        },
    },
]
INSTRUCTIONS = (
    "Polyphonizer (music scores as code): these tools work on the score open on the learner's page. Start with "
    "get_score; change files with write_file (the learner applies or discards each change on the page); run compile "
    "after every change and fix what it reports. Keep `score` set in main.py, use only music21 names that exist, and "
    "change only what was asked."
)

TOOLS = [
    {
        "name": "compile",
        "description": (
            "Run the score (main.py and the project's other .py files, as they are now in your folder) with "
            "Polyphonizer's helpers and music21, as the site does. Returns the parts, number of bars, key, time, tempo "
            "and page layout, or the Python error with its file and line. Give `part`, `from_bar` and `to_bar` to also "
            "get those bars' notes in the editor's text form (tinyNotation, chords as <c e g>4). Call it after every "
            "change."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "part": {"type": "string", "description": "a part's name, or its number from 0"},
                "from_bar": {"type": "integer"},
                "to_bar": {"type": "integer"},
            },
        },
    },
    {
        "name": "ask_user",
        "description": (
            "Ask the learner a multiple-choice question in the chat when a decision is theirs (which of two "
            "approaches, how far to change the piece). Give 2-4 short options; they can also type their own answer. "
            "Then end your turn: the answer arrives as the next message."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "question": {"type": "string"},
                "options": {"type": "array", "items": {"type": "string"}},
                "multi": {"type": "boolean", "description": "true: several options may be picked"},
            },
            "required": ["question", "options"],
        },
    },
]


def compile_in(workspace: Path, part=None, first=None, last=None, python: str = sys.executable) -> dict:
    argv = [python, "-I", str(COMPILER), str(workspace)]
    if part is not None and first is not None:
        argv += [str(part), str(int(first)), str(int(last if last is not None else first))]
    try:
        p = subprocess.run(argv, capture_output=True, text=True, timeout=COMPILE_TIMEOUT_S, cwd=workspace, stdin=subprocess.DEVNULL)
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": f"the score took longer than {COMPILE_TIMEOUT_S} s to run"}
    lines = [line for line in (p.stdout or "").splitlines() if line.startswith("{")]
    if not lines:
        tail = (p.stderr or "").strip().splitlines()[-3:]
        return {"ok": False, "error": "\n".join(tail) or f"the compiler stopped (exit {p.returncode})"}
    return json.loads(lines[-1])


def call_tool(b: Binding, name: str, args: dict) -> tuple[str, bool]:
    """(text for the agent, is_error)"""
    if b.kind == "connector":
        if name == "ask_user":
            return "ask the learner in your own chat instead", True
        if name in ("get_score", "read_file", "write_file"):
            text, err, files = file_tool(b, name, args)
            # the tool's row, then what it wrote (shown on the page to apply)
            b.turn.emit({"type": "tool", "name": name, "input": {k: v for k, v in args.items() if k not in ("code", "content")}, "ok": not err})
            if files:
                b.turn.emit(files)
            return text, err
        if not (b.workspace / "main.py").exists():
            return "no score yet: open the AI panel on the learner's page (it sends the score on screen)", True
    if name == "compile":
        r = compile_in(b.workspace, args.get("part"), args.get("from_bar"), args.get("to_bar"))
        if r.get("ok"):
            b.turn.emit({"type": "compiled", "ok": True})
            return json.dumps(r, ensure_ascii=False), False
        where = f"{r.get('file') or 'main.py'}, line {r['line']}: " if r.get("line") is not None else ""
        b.turn.emit({"type": "compiled", "ok": False})
        return where + r.get("error", "failed"), True
    if name == "ask_user":
        options = [str(o)[:80] for o in (args.get("options") or [])][:4]
        question = str(args.get("question") or "").strip()[:500]
        if not question or len(options) < 2:
            return "give a question and 2-4 options", True
        b.turn.emit({"type": "question", "question": question, "options": options, "multi": bool(args.get("multi"))})
        return "The question is shown in the chat. End your turn now; the answer comes as the next message.", False
    return f"no tool named {name}", True


def file_tool(b: Binding, name: str, args: dict) -> tuple[str, bool, dict | None]:
    """get_score, read_file, write_file on a connector's copy of the score: (text, is_error, the files event)"""
    ws = b.workspace
    if not (ws / "main.py").exists():
        return "no score yet: open the AI panel on the learner's page (it sends the score on screen)", True, None
    names = sorted(p.name for p in ws.glob("*.py"))
    if name == "get_score":
        c = b.turn
        return json.dumps({"title": getattr(c, "title", ""), "files": names, "main.py": (ws / "main.py").read_text(encoding="utf-8")}, ensure_ascii=False), False, None
    file = str(args.get("name") or args.get("path") or args.get("file") or "")
    if not connector.FILE_NAME.match(file):
        return "a file name like main.py or parts.py (the `name` argument)", True, None
    if name == "read_file":
        return ((ws / file).read_text(encoding="utf-8"), False, None) if (ws / file).exists() else (f"no file {file}; the files are {', '.join(names)}", True, None)
    if getattr(b.turn, "mode", "ask") == "plan":
        return "the learner's page is in plan mode: describe the change instead of writing it", True, None
    code = args.get("code", args.get("content"))  # (some agents say content)
    if not isinstance(code, str) or len(code) > connector.MAX_FILE:
        return "give the file's whole code in `code` (at most 200 kB)", True, None
    if file not in names and len(names) >= connector.MAX_FILES:
        return "too many files", True, None
    (ws / file).write_text(code, encoding="utf-8")
    return f"{file} written; it is shown on the learner's page to apply. Now compile.", False, {"type": "files", "files": {file: code}, "removed": []}


def handle(token: str, body: bytes) -> tuple[int, dict | None]:
    """one MCP request (a JSON-RPC message or a batch) → (HTTP status, answer or None for 202)"""
    b = binding(token)
    if b is None and (c := connector.lookup(token)) is not None:
        c.last_seen = time.time()
        b = Binding(c.workspace, c, "connector")
    if b is None:
        return 404, {"jsonrpc": "2.0", "id": None, "error": {"code": -32001, "message": "this chat's tools have closed"}}
    try:
        msg = json.loads(body or b"null")
    except json.JSONDecodeError:
        return 400, {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "not JSON"}}
    if isinstance(msg, list):
        answers = [a for m in msg if (a := _one(b, m)) is not None]
        return (200, answers) if answers else (202, None)
    answer = _one(b, msg)
    return (200, answer) if answer is not None else (202, None)


def _one(b: Binding, m) -> dict | None:
    if not isinstance(m, dict) or "method" not in m:
        return None  # a response or junk: nothing to answer
    if "id" not in m:
        return None  # a notification (notifications/initialized …)
    mid, method, params = m["id"], m["method"], m.get("params") or {}
    ok = lambda result: {"jsonrpc": "2.0", "id": mid, "result": result}  # noqa: E731
    if method == "initialize":
        if b.kind == "connector":
            b.turn.client = str((params.get("clientInfo") or {}).get("name") or "")[:60]
            b.turn.emit({"type": "connected", "client": b.turn.client})
        return ok(
            {
                "protocolVersion": params.get("protocolVersion") or PROTOCOL,
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": "polyphonizer", "version": "0.1"},
                **({"instructions": INSTRUCTIONS} if b.kind == "connector" else {}),
            }
        )
    if method == "ping":
        return ok({})
    if method in ("resources/list", "resources/templates/list", "prompts/list"):  # (asked for by some agents anyway)
        return ok({method.split("/")[0] if method != "resources/templates/list" else "resourceTemplates": []})
    if method == "tools/list":
        return ok({"tools": FILE_TOOLS + TOOLS[:1] if b.kind == "connector" else TOOLS})
    if method == "tools/call":
        text, is_error = call_tool(b, str(params.get("name")), params.get("arguments") or {})
        return ok({"content": [{"type": "text", "text": text}], "isError": is_error})
    return {"jsonrpc": "2.0", "id": mid, "error": {"code": -32601, "message": f"no method {method}"}}
