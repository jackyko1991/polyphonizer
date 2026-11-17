"""One chat turn with the learner's AI agent, on a scratch copy of their score (as Tensorizer's backend/app/agent.py).

Nothing here is an AI of its own. This module only
  * gives each chat its own folder (the project's .py files as the page sent them; deleted after 30 idle minutes),
  * picks the agent: this computer's Claude Code or Codex (their own login: "bring your own agent", free), Claude
    Code with the learner's API key (Anthropic or OpenRouter; for this chat's process only, never stored or logged),
    or, on the Polyphonizer service, Claude Code with the service's own key (included with Pro),
  * gives it Polyphonizer's tools (tools.py: compile, ask_user) over MCP and no shell or web,
  * and turns its output into the events the page draws, ending with the files it changed, which the page shows as
    a diff to apply or not.
"""

from __future__ import annotations

import asyncio
import os
import re
import shutil
import tempfile
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

from . import claude, cli, codex, scan, tools, turns

AGENTS = ("claude-code", "codex", "claude-api", "included")
LOCAL = ("claude-code", "codex")  # use this computer's own login
MODELS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]
# OpenRouter through its Anthropic-compatible endpoint, as it documents for Claude Code
OPENROUTER_BASE = "https://openrouter.ai/api"
OPENROUTER_MODELS = ["anthropic/claude-opus-5.5", "anthropic/claude-sonnet-5.5", "anthropic/claude-haiku-5.5"]
PROVIDERS = {"anthropic": MODELS, "openrouter": OPENROUTER_MODELS}
_CLI_MODEL = re.compile(r"^[\w./:~@-]{1,100}$")
CHAT_ID = re.compile(r"^[\w-]{8,64}$")
FILE_NAME = re.compile(r"^[A-Za-z_][\w-]{0,60}\.py$")
MAX_FILE = 200_000
MAX_FILES = 40
MAX_MESSAGE = 20_000
MAX_TURNS = int(os.environ.get("PZ_AGENT_MAX_TURNS", "24"))
IDLE_S = 30 * 60
ROOT = Path(os.environ.get("PZ_AGENT_WORKSPACES", Path(tempfile.gettempdir()) / "polyphonizer-agent"))
_active = threading.BoundedSemaphore(int(os.environ.get("PZ_AGENT_SESSIONS", "2")))

SYSTEM = """You are the AI agent inside Polyphonizer, a website where a music score is Python code using music21.
You are working on ONE score, whose files are in your working directory: main.py (the score) and the project's other
.py files (modules main.py imports).

Conventions of score code:
- main.py must leave its result in a variable named `score` (a music21 Score, Part or Stream).
- All music21 names are already imported (from music21 import *), and so are Polyphonizer's helpers: tiny, together,
  load, edit_bar, fetch_score, pages, with_harmony. Don't add these imports.
- tiny("c4 d8 e f#2 r4 c'1", name="Flute", key_sig="C", inst="flute", time="4/4") makes a part from tinyNotation:
  letter = pitch, number = note value, ' and , = octaves (c = middle C, c' an octave up, C an octave down),
  # and - = sharp and flat, r = rest, a dot after the number = dotted; chords are written <c e g>4.
- together(part1, part2, title=..., bpm=...) joins parts into a score. load("file.musicxml") reads a file the
  learner imported. edit_bar(score, part, bar, "notes") replaces one bar. fetch_score("<url>") reads a score from an
  open collection. pages(paper="A4", ...) sets the page layout.
- Only use music21 functions that really exist; check by compiling.

How to work:
- Explain music and code clearly and briefly for a learner. Keep answers short and concrete.
- When asked to change the score, edit the files, then call the `compile` tool to check that it runs, and read what
  it reports (parts, bars, key, the notes of the bars you changed). If it fails, read the error, fix it, compile again.
- Change only what was asked. Keep the learner's style, names and comments.
- Your edits are not applied by themselves: the learner sees them as a diff and applies them or not.
- When a choice is really the learner's (which of two approaches, how far to change the piece), call `ask_user` with
  the question and 2-4 short options, then end your turn. Don't ask what you can decide or check yourself.
- When the learner is working on a Learn to Code problem, give a hint and the reason, not the finished answer,
  unless they ask for it. Never change the given parts of a problem (a cantus firmus, a given melody).
- You can only touch the files in this folder; there is no shell and no web."""


def local_allowed(env=os.environ) -> bool:
    """this computer's own agents: on the learner's own computer only (a runner on 127.0.0.1 without a token), unless
    its owner says so (PZ_AGENT_AUTH=local, e.g. their own server)"""
    if env.get("PZ_AGENT_AUTH") == "local":
        return True
    return not env.get("PZ_TOKEN") and env.get("PZ_HOST", "127.0.0.1") in ("127.0.0.1", "localhost", "::1")


def included_key(env=os.environ) -> str | None:
    """the Polyphonizer service's own Anthropic key: the agent included with Pro"""
    return env.get("PZ_AGENT_KEY") or None


def status(env=os.environ) -> dict:
    return {"local": local_allowed(env), "included": bool(included_key(env)), "models": MODELS, "openrouter": OPENROUTER_MODELS}


@dataclass(eq=False)
class Session:
    id: str
    workspace: Path
    claude_session: str | None = None
    cli_session: str | None = None
    cli_agent: str | None = None
    busy: bool = False
    last_used: float = field(default_factory=time.monotonic)


_sessions: dict[str, Session] = {}
_lock = threading.Lock()


def session(chat: str) -> Session:
    with _lock:
        now = time.monotonic()
        for sid, s in list(_sessions.items()):  # a chat left alone for a while: its folder goes
            if not s.busy and now - s.last_used > IDLE_S:
                shutil.rmtree(s.workspace.parent, ignore_errors=True)
                del _sessions[sid]
        s = _sessions.get(chat)
        if s is None:
            ws = ROOT / chat / "score"
            ws.mkdir(parents=True, exist_ok=True)
            s = _sessions[chat] = Session(chat, ws)
        s.last_used = now
        return s


def sync_files(s: Session, files: list[dict]) -> dict[str, str]:
    """the project's .py files as the page has them now (the page is the truth before every turn)"""
    keep: dict[str, str] = {}
    for f in files[:MAX_FILES]:
        name, code = str(f.get("name", "")), f.get("code")
        if FILE_NAME.match(name) and isinstance(code, str) and len(code) <= MAX_FILE:
            keep[name] = code
    if "main.py" not in keep:
        raise ValueError("the score's main.py is missing")
    for old in s.workspace.glob("*.py"):
        if old.name not in keep:
            old.unlink()
    for name, code in keep.items():
        (s.workspace / name).write_text(code, encoding="utf-8")
    return keep


def snapshot(s: Session) -> dict[str, str]:
    out = {}
    for p in sorted(s.workspace.glob("*.py")):
        try:
            if p.stat().st_size <= MAX_FILE:
                out[p.name] = p.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            pass
    return out


def changes(before: dict[str, str], after: dict[str, str]) -> dict | None:
    """the files the agent changed or made, and the ones it deleted"""
    changed = {n: c for n, c in after.items() if before.get(n) != c}
    removed = [n for n in before if n not in after]
    return {"type": "files", "files": changed, "removed": removed} if changed or removed else None


def context_text(ctx: dict) -> str:
    """what is on the learner's screen, said in a few lines before their message"""
    lines = []
    if t := str(ctx.get("title") or "")[:200]:
        lines.append(f"Score: {t}")
    if f := str(ctx.get("file") or "")[:80]:
        lines.append(f"The file open in the editor: {f}")
    sel = ctx.get("bars")
    if isinstance(sel, dict) and isinstance(sel.get("from"), int):
        part = str(sel.get("part") or "all parts")[:80]
        to = sel.get("to") if isinstance(sel.get("to"), int) else sel["from"]
        lines.append(f"Selected: bar{'s' if to != sel['from'] else ''} {sel['from']}{f'-{to}' if to != sel['from'] else ''} ({part})")
    if isinstance(code := ctx.get("code"), dict) and isinstance(code.get("text"), str):
        lines.append(f"Selected code in {str(code.get('file') or 'main.py')[:80]}, lines {code.get('from')}-{code.get('to')}:\n```python\n{code['text'][:4000]}\n```")
    if e := str(ctx.get("error") or "")[:1000]:
        lines.append(f"The last run in the page failed: {e}")
    if p := str(ctx.get("problem") or "")[:4000]:
        lines.append(f"Learn to Code problem (the learner is learning: hints, not answers):\n{p}")
    return ("[On the learner's screen]\n" + "\n".join(lines) + "\n\n") if lines else ""


def model_for(agent: str, provider: str, model: str | None) -> str | None:
    if agent in ("claude-api", "included"):
        models = PROVIDERS.get(provider, MODELS) if agent == "claude-api" else MODELS
        return model if model in models else models[0]
    if agent == "claude-code":
        return model if model in MODELS else MODELS[0]
    return model if model and _CLI_MODEL.match(model) else None


def check(req: dict, env=os.environ) -> str | None:
    """why this request can't be served here, or None"""
    agent = req.get("agent")
    if agent not in AGENTS:
        return f"unknown agent {agent!r}"
    if not CHAT_ID.match(str(req.get("chat", ""))):
        return "a chat id is needed"
    if not isinstance(req.get("message"), str) or not req["message"].strip():
        return "the message is empty"
    if len(req["message"]) > MAX_MESSAGE:
        return f"the message is longer than {MAX_MESSAGE} characters"
    if agent in LOCAL and not local_allowed(env):
        return "this runner is on a server: its computer's own agents aren't offered here; use an API key"
    if agent == "claude-api" and not str(req.get("api_key") or "").strip():
        return "enter your API key in the agent's settings first"
    if agent == "included" and not included_key(env):
        return "the agent included with Pro isn't available on this runner"
    if agent in LOCAL and agent != "claude-code" and scan.executable(agent) is None:
        return f"{agent} wasn't found on this computer: install it, then Search this computer again"
    return None


async def chat(turn: turns.Turn, req: dict, base: str, env=os.environ) -> None:
    """one learner message: runs the agent, emitting its events into the turn's log. `base`: where the agent's
    process reaches this runner (http://127.0.0.1:<port>), for the MCP tools"""
    agent, provider = req["agent"], req.get("provider") if req.get("provider") in PROVIDERS else "anthropic"
    s = session(req["chat"])
    if s.busy:
        turn.emit({"type": "error", "message": "this chat is still answering the previous message"})
        return
    try:
        before = sync_files(s, req.get("files") or [])
    except ValueError as e:
        turn.emit({"type": "error", "message": str(e)})
        return
    message = context_text(req.get("context") or {}) + req["message"]
    key = str(req.get("api_key") or "").strip() if agent == "claude-api" else included_key(env) if agent == "included" else None
    secrets = [key] if key else []
    chosen = model_for(agent, provider, req.get("model"))
    token = tools.token_for(s.workspace, turn)
    mcp_url = f"{base.rstrip('/')}/mcp/{token}"
    s.busy = True
    got = _active.acquire(blocking=False)
    try:
        if not got:  # every agent slot is answering: say so instead of waiting silently
            turn.emit({"type": "waiting"})
            while not _active.acquire(blocking=False):
                await asyncio.sleep(0.5)  # (Stop still works while it waits)
            got = True
        if agent in ("claude-code", "claude-api", "included"):
            stream = _claude(s, agent, provider, key, chosen, message, mcp_url, secrets)
        else:
            stream = _codex(s, chosen, message, mcp_url, token)
        async for event in stream:
            if event["type"] in ("done", "error"):
                if (files := changes(before, snapshot(s))) is not None:
                    turn.emit(files)  # also after an error: what it changed still reaches the page
                    before = snapshot(s)
            turn.emit(_relative(event, s.workspace))
    finally:
        if got:
            _active.release()
        tools.revoke(token)
        s.busy = False
        s.last_used = time.monotonic()
        if (files := changes(before, snapshot(s))) is not None:  # stopped midway
            turn.emit(files)


def _relative(event: dict, ws: Path) -> dict:
    """the chat's folder left out of what is shown: main.py, not /tmp/…/score/main.py"""
    # (longest first: on macOS /var/… is really /private/var/…)
    prefixes = sorted({str(ws) + os.sep, str(ws.resolve()) + os.sep, str(ws.resolve()), str(ws)}, key=len, reverse=True)

    def fix(v):
        if isinstance(v, str):
            for p in prefixes:
                v = v.replace(p, "")
            return v
        if isinstance(v, dict):
            return {k: fix(x) for k, x in v.items()}
        return v

    return {**event, "input": fix(event["input"])} if event.get("type") == "tool" else {**event, "text": fix(event["text"])} if event.get("type") == "tool_result" else event


def _claude(s: Session, agent: str, provider: str, key: str | None, model: str, message: str, mcp_url: str, secrets: list[str]):
    env = {"CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1"}
    if agent != "claude-code":  # an API key: a config folder of its own, so this computer's login is never used
        env["CLAUDE_CONFIG_DIR"] = str(s.workspace.parent / ".claude")
        if provider == "openrouter" and agent == "claude-api":  # the variables OpenRouter documents for Claude Code
            env.update(ANTHROPIC_BASE_URL=OPENROUTER_BASE, ANTHROPIC_AUTH_TOKEN=key or "", ANTHROPIC_API_KEY="")
        else:
            env["ANTHROPIC_API_KEY"] = key or ""
    hint = {
        "claude-code": " (Claude Code isn't logged in on this computer: run `claude` once in a terminal and log in, or use an API key.)",
        "claude-api": " (Check the API key in the agent's settings.)",
        "included": "",
    }[agent]
    return claude.run(s, message, model=model, env=env, system_prompt=SYSTEM, max_turns=MAX_TURNS, mcp_url=mcp_url, secrets=secrets, login_hint=hint)


def _codex(s: Session, model: str | None, message: str, mcp_url: str, token: str):
    exe = scan.executable("codex")
    if s.cli_agent != "codex":
        s.cli_session, s.cli_agent = None, "codex"
    rules = f"{SYSTEM}\n\nThe tools are the MCP tools `compile` and `ask_user` of the `polyphonizer` server.\n\n---\n\n"
    prompt = (rules if s.cli_session is None else "") + message
    mapper = codex.Mapper()
    argv = codex.command(exe, str(s.workspace), model, s.cli_session, mcp_url)

    async def stream():
        try:
            async for event in cli.run(argv, s.workspace, {}, prompt, mapper, asyncio.Queue(), [token], codex.LABEL):
                yield event
        finally:
            s.cli_session = mapper.session or s.cli_session

    return stream()
