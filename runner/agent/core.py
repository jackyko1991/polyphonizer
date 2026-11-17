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
import base64
import binascii
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
# how the learner wants changes: ask (they apply each), auto (the page applies them), plan (no changes: a plan)
MODES = ("ask", "auto", "plan")
PLAN = (
    "\n\n[Plan mode: do not change any file (you can't). Read the score, compile it if useful, and answer with a short "
    "plan: what you would change, where (files, bars, parts) and why. The learner switches mode to have it carried out.]"
)
# music attached to the message (the panel's +): score files go to files/ (load() reads them there and on the page);
# a recording is turned into a score first, by the runner's sound engine when it has one (TRANSCRIBE, set by server.py)
MAX_ATTACHMENTS = 4
MAX_ATTACHMENT = 20_000_000
SCORE_EXT = {".musicxml", ".xml", ".mxl", ".mid", ".midi", ".abc", ".krn"}
AUDIO_EXT = {".mp3", ".wav", ".m4a", ".ogg", ".oga", ".flac", ".aac", ".aif", ".aiff"}
TRANSCRIBE = None  # (src: Path, out: Path, title: str) → Path, or None when this runner has no sound engine
# pictures pasted into the message (a screenshot, a photo of a page): kept in the chat's folder for that turn
MAX_PICTURES = 4
MAX_PICTURE = 5_000_000
PICTURE_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp"}
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


def safe_name(name: str) -> str:
    """a file name the learner gave, as a plain name in one folder (no path, no odd characters)"""
    p = Path(str(name).replace("\\", "/")).name
    stem = re.sub(r"[^\w\- ]+", "_", Path(p).stem).strip() or "file"
    return f"{stem[:60]}{Path(p).suffix.lower()}"


async def save_attachments(turn: turns.Turn, s: Session, att: list[dict]) -> list[str]:
    """the message's music in the chat's files/ folder: a line for the agent about each. A recording is transcribed
    to MusicXML (shown as a tool row), and the score sent to the page too ("attached"), so load() works there."""
    folder = s.workspace / "files"
    folder.mkdir(exist_ok=True)
    notes = []
    for i, a in enumerate(att):
        try:
            data = base64.b64decode(a["data"], validate=True)
        except (binascii.Error, ValueError):
            continue
        name = safe_name(a["name"])
        if Path(name).suffix in SCORE_EXT:
            (folder / name).write_bytes(data)
            notes.append(f"files/{name} (a score file: in main.py, load({name!r}) reads it)")
            continue
        (s.workspace / "attachments").mkdir(exist_ok=True)
        src = s.workspace / "attachments" / name
        src.write_bytes(data)
        if TRANSCRIBE is None:
            notes.append(f"attachments/{name} (a recording; this runner has no engine to turn it into notes: say so if it matters)")
            continue
        out = folder / f"{Path(name).stem}.musicxml"
        tid = f"transcribe-{i}"
        turn.emit({"type": "tool", "id": tid, "name": "transcribe", "input": {"file_path": name}})
        try:
            await asyncio.to_thread(TRANSCRIBE, src, out, Path(name).stem)
        except Exception as e:  # noqa: BLE001 - the engine's message, for the learner and the agent
            turn.emit({"type": "tool_result", "id": tid, "ok": False, "text": str(e)[:300]})
            notes.append(f"attachments/{name} (a recording; transcribing it failed: {str(e)[:200]})")
            continue
        turn.emit({"type": "tool_result", "id": tid, "ok": True, "text": f"files/{out.name}"})
        turn.emit({"type": "attached", "name": out.name, "data": base64.b64encode(out.read_bytes()).decode()})
        notes.append(f"files/{out.name} (the recording {name}, transcribed by the runner into a score: piano model, beat, bars and key found automatically, so check what looks odd; load({out.name!r}) reads it)")
    return notes


def save_pictures(s: Session, pics: list[dict]) -> list[str]:
    """the message's pictures in the chat's folder (pictures/, replaced each turn; not .py, so never sent back as a
    change): their paths relative to it"""
    folder = s.workspace / "pictures"
    shutil.rmtree(folder, ignore_errors=True)
    out = []
    for i, p in enumerate(pics, 1):
        try:
            data = base64.b64decode(p["data"], validate=True)
        except (binascii.Error, ValueError):
            continue
        folder.mkdir(exist_ok=True)
        name = f"picture-{i}.{PICTURE_TYPES[p['type']]}"
        (folder / name).write_bytes(data)
        out.append(f"pictures/{name}")
    return out


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
        parts = [str(x)[:80] for x in sel.get("parts") or [] if isinstance(x, str)][:32]
        part = str(sel.get("part") or ", ".join(parts) or "all parts")[:400]
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
    if req.get("mode", "ask") not in MODES:
        return "the mode is ask, auto or plan"
    loaded = req.get("score_files") or []
    if not isinstance(loaded, list) or len(loaded) > 8 or any(not isinstance(f, dict) or Path(str(f.get("name", ""))).suffix.lower() not in SCORE_EXT or not isinstance(f.get("data"), str) for f in loaded):
        return "the score's files must be score files (MusicXML, MIDI, ABC, Humdrum), at most 8"
    att = req.get("attachments") or []
    if not isinstance(att, list) or len(att) > MAX_ATTACHMENTS:
        return f"at most {MAX_ATTACHMENTS} files with a message"
    for a in att:
        ext = Path(str((a or {}).get("name", ""))).suffix.lower() if isinstance(a, dict) else ""
        if ext not in SCORE_EXT | AUDIO_EXT or not isinstance(a.get("data"), str):
            return "attach scores (MusicXML, MIDI, ABC, Humdrum) or recordings (MP3, WAV …)"
        if len(a["data"]) * 3 // 4 > MAX_ATTACHMENT:
            return f"a file is larger than {MAX_ATTACHMENT // 1_000_000} MB"
    pics = req.get("images") or []
    if not isinstance(pics, list) or len(pics) > MAX_PICTURES:
        return f"at most {MAX_PICTURES} pictures with a message"
    for p in pics:
        if not isinstance(p, dict) or p.get("type") not in PICTURE_TYPES or not isinstance(p.get("data"), str):
            return "a picture must be PNG, JPEG, GIF or WebP"
        if len(p["data"]) * 3 // 4 > MAX_PICTURE:
            return f"a picture is larger than {MAX_PICTURE // 1_000_000} MB"
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
    plan = req.get("mode") == "plan"
    # the files the score load()s, as the page has them: compile and the agent read them in files/
    for f in req.get("score_files") or []:
        try:
            (s.workspace / "files").mkdir(exist_ok=True)
            (s.workspace / "files" / safe_name(f["name"])).write_bytes(base64.b64decode(f["data"], validate=True))
        except (binascii.Error, ValueError, OSError):
            pass
    pictures = save_pictures(s, req.get("images") or [])
    message = context_text(req.get("context") or {}) + req["message"]
    if pictures:
        message += "\n\n[The learner pasted " + ("a picture" if len(pictures) == 1 else f"{len(pictures)} pictures") + " with this message (attached to it; also saved as " + ", ".join(pictures) + "). Look at " + ("it" if len(pictures) == 1 else "them") + " before answering.]"
    if att := req.get("attachments"):
        notes = await save_attachments(turn, s, att)
        if notes:
            message += "\n\n[The learner attached with this message: " + "; ".join(notes) + ".]"
    if plan:
        message += PLAN
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
            images = [(p["type"], p["data"]) for p in req.get("images") or []]
            stream = _claude(s, agent, provider, key, chosen, message, mcp_url, secrets, plan, images)
        else:
            stream = _codex(s, chosen, message, mcp_url, token, pictures, plan)
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


def _claude(s: Session, agent: str, provider: str, key: str | None, model: str, message: str, mcp_url: str, secrets: list[str], plan: bool = False, images: list | None = None):
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
    return claude.run(s, message, model=model, env=env, system_prompt=SYSTEM, max_turns=MAX_TURNS, mcp_url=mcp_url, secrets=secrets, login_hint=hint, plan=plan, images=images)


def _codex(s: Session, model: str | None, message: str, mcp_url: str, token: str, pictures: list[str] | None = None, plan: bool = False):
    exe = scan.executable("codex")
    if s.cli_agent != "codex":
        s.cli_session, s.cli_agent = None, "codex"
    rules = f"{SYSTEM}\n\nThe tools are the MCP tools `compile` and `ask_user` of the `polyphonizer` server.\n\n---\n\n"
    prompt = (rules if s.cli_session is None else "") + message
    mapper = codex.Mapper()
    argv = codex.command(exe, str(s.workspace), model, s.cli_session, mcp_url, [str(s.workspace / p) for p in pictures or []], plan)

    async def stream():
        try:
            async for event in cli.run(argv, s.workspace, {}, prompt, mapper, asyncio.Queue(), [token], codex.LABEL):
                yield event
        finally:
            s.cli_session = mapper.session or s.cli_session

    return stream()
