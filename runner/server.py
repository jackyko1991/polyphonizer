"""The Polyphonizer runner: turns a picture of music or a recording into notes on your own computer.

    pixi run runner            # http://127.0.0.1:8765, for the site (Transcribe ▸ My computer)

The site sends a file, the runner hands it to an engine installed here and sends back
MusicXML or MIDI. Nothing leaves the computer. It speaks the protocol of docs/plans/transcription.md:

    GET  /status                      → {"omr": bool, "transcribe": bool, "version": "…"}
    POST /omr        (PDF or image)   → MusicXML           (body: the file; X-Filename: its name)
    POST /transcribe (audio or video) → MusicXML (the built-in engine) or MIDI   (?instrument=piano|other)

An engine is a command with {in} and {out} for the files, so any tool can be used:
    PZ_OMR="audiveris -batch -export -output {outdir} {in}"     (or copista, homr …; see docs/plans/transcription.md)
    PZ_TRANSCRIBE="transkun {in} {out}"
Found by themselves: copista (pixi run -e omr omr-setup) for pages; for recordings the built-in engine
(engines/audio.py: Transkun for piano, Basic Pitch for other instruments, then bars, key and two staves; pixi run -e
audio audio-setup), on the GPU when there is one (CUDA, or the Apple GPU). Else on PATH: transkun, audiveris. A video
is turned into audio first with ffmpeg when it is installed.

It also runs the learner's own AI agent (agent/, docs/plans/local-agent.md):

    POST /api/agents/scan                       → the agent programs on this computer (only when asked)
    POST /api/agents/chat     (JSON)            → NDJSON events of one turn (turn, text, tool, tool_result, question,
                                                  files, done | error | cancelled)
    GET  /api/agents/turns/<id>/events?from=N   → the same turn again from event N (after a reload)
    POST /api/agents/turns/<id>/cancel          → Stop
    POST /mcp/<chat token>                      → Polyphonizer's tools for the agent (MCP), for that turn only
    POST /api/agents/connector                  → a token for an agent outside the site: <runner>/mcp/<token>
    POST /api/agents/connector/sync  (X-Connector) the score on the page → the runner's copy the agent works on
    GET  /api/agents/connector/events?after=N    what that agent did (files written, compiles), for the page

Only the site's own pages may call it (CORS), it listens on 127.0.0.1 only, and it keeps no files. On a server (a VPS
behind HTTPS, a Hugging Face Space; runner/Dockerfile): PZ_HOST=0.0.0.0 with PZ_TOKEN, which the site sends as a bearer
token (Transcribe ▸ address and token). The site's page AI agent ▸ Runner says how.
"""

import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from agent import core as agent_core
from agent import scan as agent_scan
from agent import connector as agent_connector
from agent import tools as agent_tools
from agent import turns as agent_turns

VERSION = "0.1"
HOST = "127.0.0.1"
PORT = 8765
ORIGINS = {"https://jackyko1991.github.io"}
DEV_ORIGIN = re.compile(r"^http://(localhost|127\.0\.0\.1)(:\d+)?$")

OMR_EXT = {".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp"}
AUDIO_EXT = {".wav", ".mp3", ".m4a", ".ogg", ".oga", ".flac", ".aac", ".aif", ".aiff"}
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".mkv", ".webm"}
RESULT = {"omr": ("score.musicxml", "application/vnd.recordare.musicxml+xml"), "transcribe": ("notes.mid", "audio/midi")}


@dataclass
class Config:
    omr: str | None = None
    transcribe: str | None = None
    max_bytes: int = 200_000_000
    timeout: int = 900
    # when set (a runner on a server), every request must carry it: Authorization: Bearer <token>
    token: str | None = None
    # the built-in sound-to-score engine (engines/audio.py): the instruments it takes and where it runs; empty for a
    # command of one's own (PZ_TRANSCRIBE), which takes whatever it takes
    instruments: list = field(default_factory=list)
    device: str | None = None

    @classmethod
    def from_env(cls, env=os.environ, which=shutil.which, copista=None, audio=None):
        """the engines: PZ_OMR / PZ_TRANSCRIBE, else copista (pixi run -e omr omr-setup) and the built-in sound engine
        (pixi run -e audio audio-setup) when installed, else the tools found on PATH"""
        copista = copista if copista is not None else copista_command()
        omr = env.get("PZ_OMR") or copista or ("audiveris -batch -export -output {outdir} {in}" if which("audiveris") else None)
        built_in = None if env.get("PZ_TRANSCRIBE") else (audio if audio is not None else audio_engine())
        if built_in:
            tr, info = built_in
            return cls(omr=omr, transcribe=tr, token=env.get("PZ_TOKEN") or None, instruments=info["instruments"], device=info["device"])
        tr = env.get("PZ_TRANSCRIBE") or ("transkun {in} {out}" if which("transkun") else None)
        return cls(omr=omr, transcribe=tr, token=env.get("PZ_TOKEN") or None)


REPO = Path(__file__).resolve().parent.parent
MAX_CHAT_BYTES = 10_000_000


def bind_host(env=os.environ):
    """where to listen: this computer only, unless PZ_HOST says otherwise (a server, a container), and then only with
    a token, so no one else can use it"""
    host = env.get("PZ_HOST", HOST)
    if host not in ("127.0.0.1", "localhost", "::1") and not env.get("PZ_TOKEN"):
        raise SystemExit(f"PZ_HOST={host} makes the runner reachable from other computers: set PZ_TOKEN too")
    return host


def copista_command():
    """copisteria's command when it is installed (pixi run omr-setup, or the Docker image): the omr environment's Python
    runs the wrapper, or this Python when it has the reader (a container)"""
    sys.path.insert(0, str(Path(__file__).resolve().parent / "engines"))
    try:
        import copista
    finally:
        sys.path.pop(0)
    import importlib.util

    env = REPO / ".pixi" / "envs" / "omr"
    py = env / ("python.exe" if os.name == "nt" else "bin/python")
    if not py.exists() and importlib.util.find_spec("copisteria"):
        py = Path(sys.executable)
    if not (copista.installed() and py.exists()):
        return None
    return f"{shlex.quote(str(py))} {shlex.quote(str(Path(copista.__file__)))} {{in}} {{out}}"


def audio_engine():
    """the built-in sound-to-score engine when it is set up: (its command, {"instruments": […], "device": "…"}), asked
    once of the audio environment's Python (pixi run -e audio audio-setup), or this Python when it has the models (a
    container); None when neither does"""
    engines = Path(__file__).resolve().parent / "engines"
    env = REPO / ".pixi" / "envs" / "audio"
    probe = "import sys, json; sys.path.insert(0, sys.argv[1]); import audio; print(json.dumps({'instruments': audio.engines(), 'device': audio.device()}))"
    for py in (env / ("python.exe" if os.name == "nt" else "bin/python"), Path(sys.executable)):
        if not py.exists():
            continue
        try:
            p = subprocess.run([str(py), "-I", "-W", "ignore", "-c", probe, str(engines)], capture_output=True, text=True, timeout=120)
            info = json.loads(p.stdout.strip().splitlines()[-1]) if p.returncode == 0 and p.stdout.strip() else None
        except (OSError, subprocess.TimeoutExpired, ValueError):
            info = None
        if info and info["instruments"]:
            return f"{shlex.quote(str(py))} -I {shlex.quote(str(engines / 'audio.py'))} {{in}} {{out}}", info
    return None


INSTRUMENTS = {"piano", "other"}
CTYPES = {".musicxml": "application/vnd.recordare.musicxml+xml", ".xml": "application/vnd.recordare.musicxml+xml", ".mxl": "application/vnd.recordare.musicxml", ".mid": "audio/midi", ".midi": "audio/midi"}


def run_engine(template, src, out, outdir, timeout, title="", instrument=""):
    """run an engine's command on the files; the result is {out}, or the first MusicXML/MIDI it wrote in {outdir}. The
    learner's file name is in PZ_TITLE, for the score's title; the instrument asked for in PZ_INSTRUMENT."""
    args = [a.replace("{in}", str(src)).replace("{out}", str(out)).replace("{outdir}", str(outdir)) for a in shlex.split(template)]
    p = subprocess.run(args, capture_output=True, timeout=timeout, env={**os.environ, "PZ_TITLE": title, "PZ_INSTRUMENT": instrument})
    if p.returncode != 0:
        tail = (p.stderr or p.stdout).decode("utf-8", "replace").strip().splitlines()[-1:]
        raise RuntimeError(tail[0] if tail else f"the engine stopped (exit {p.returncode})")
    if out.exists():
        return out
    found = sorted(f for f in outdir.rglob("*") if f.suffix.lower() in {".mxl", ".musicxml", ".xml", ".mid", ".midi"})
    if not found:
        raise RuntimeError("the engine wrote no MusicXML or MIDI")
    return found[0]


def make_server(address, cfg):
    class Handler(BaseHTTPRequestHandler):
        server_version = f"PolyphonizerRunner/{VERSION}"

        def log_message(self, *a):  # quiet: one line per job is printed by the job itself
            pass

        def origin_ok(self):
            o = self.headers.get("Origin")
            return o is None or o in ORIGINS or bool(DEV_ORIGIN.match(o))

        def token_ok(self):
            import hmac

            given = self.headers.get("Authorization", "").removeprefix("Bearer ").strip()
            return not cfg.token or hmac.compare_digest(given, cfg.token)

        def cors(self):
            o = self.headers.get("Origin")
            if o and self.origin_ok():
                self.send_header("Access-Control-Allow-Origin", o)
                self.send_header("Vary", "Origin")

        def reply(self, status, body=b"", ctype="application/json"):
            if isinstance(body, (dict, list)):
                body = json.dumps(body).encode()
            self.send_response(status)
            self.cors()
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self):
            if not self.origin_ok():
                return self.reply(403, {"error": "not this site"})
            self.send_response(204)
            self.cors()
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "content-type, x-filename, authorization, x-connector")
            # Chrome's Private Network Access: a public HTTPS page asking for 127.0.0.1
            if self.headers.get("Access-Control-Request-Private-Network") == "true":
                self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Access-Control-Max-Age", "600")
            self.end_headers()

        def do_GET(self):
            if not self.origin_ok():
                return self.reply(403, {"error": "not this site"})
            if not self.token_ok():
                return self.reply(401, {"error": "a token is needed"})
            url = urlsplit(self.path)
            if url.path.rstrip("/") == "/status":
                return self.reply(200, {"omr": bool(cfg.omr), "transcribe": bool(cfg.transcribe), "instruments": cfg.instruments, "device": cfg.device, "version": VERSION, "agent": agent_core.status()})
            if url.path == "/api/agents/connector/events":
                c = agent_connector.lookup(self.headers.get("X-Connector", ""))
                if c is None:
                    return self.reply(404, {"error": "no such connection: make a new one"})
                after = int((parse_qs(url.query).get("after") or ["0"])[0] or 0)
                return self.reply(200, {"events": c.after(after), **agent_connector.status(c)})
            m = re.fullmatch(r"/api/agents/turns/(\w+)/events", url.path)
            if m:
                turn = agent_turns.get(m.group(1))
                if turn is None:
                    return self.reply(404, {"error": "this turn is no longer here (the runner restarted?)"})
                start = (parse_qs(url.query).get("from") or ["0"])[0]
                return self.stream(turn, int(start) if start.isdigit() else 0)
            self.reply(404, {"error": "no such path"})

        def stream(self, turn, start):
            """a turn's events as NDJSON, live until it ends; a blank line now and then while it is quiet"""
            self.send_response(200)
            self.cors()
            self.send_header("Content-Type", "application/x-ndjson")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.close_connection = True
            try:
                for e in agent_turns.follow(turn, start):
                    self.wfile.write(b"\n" if e is None else (json.dumps(e, ensure_ascii=False) + "\n").encode())
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass  # the page went away: the turn goes on, and can be followed again

        def body_json(self, limit):
            size = int(self.headers.get("Content-Length") or 0)
            if size > limit:
                return None
            try:
                data = json.loads(self.rfile.read(size) or b"{}")
            except json.JSONDecodeError:
                return None
            return data if isinstance(data, dict) else None

        def agent_post(self, path):
            if path == "/api/agents/scan":
                if not agent_core.local_allowed():
                    return self.reply(403, {"error": "this runner is on a server: it doesn't search its computer"})
                return self.reply(200, {"agents": agent_scan.scan()})
            # an agent outside the site, connected to the score on this page (agent/connector.py)
            if path == "/api/agents/connector":
                req = self.body_json(10_000) or {}
                token, c = agent_connector.create(req.get("previous") if isinstance(req.get("previous"), str) else None)
                return self.reply(200, {"token": token, "id": c.id})
            if path in ("/api/agents/connector/sync", "/api/agents/connector/revoke"):
                token = self.headers.get("X-Connector", "")
                if path.endswith("revoke"):
                    return self.reply(200, {"revoked": agent_connector.revoke(token)})
                c = agent_connector.lookup(token)
                if c is None:
                    return self.reply(404, {"error": "no such connection: make a new one"})
                req = self.body_json(MAX_CHAT_BYTES)
                try:
                    n = agent_connector.sync(c, (req or {}).get("title", ""), (req or {}).get("files"))
                except ValueError as e:
                    return self.reply(400, {"error": str(e)})
                return self.reply(200, {"files": n, **agent_connector.status(c)})
            if path == "/api/agents/chat":
                req = self.body_json(MAX_CHAT_BYTES)
                if req is None:
                    return self.reply(400, {"error": "not a chat request"})
                if why := agent_core.check(req):
                    return self.reply(400, {"error": why})
                base = f"http://127.0.0.1:{self.server.server_address[1]}"
                turn = agent_turns.start(req["chat"], lambda t: agent_core.chat(t, req, base))
                return self.stream(turn, 0)
            m = re.fullmatch(r"/api/agents/turns/(\w+)/cancel", path)
            if m:
                turn = agent_turns.get(m.group(1))
                if turn is None:
                    return self.reply(404, {"error": "no such turn"})
                return self.reply(200, {"cancelled": agent_turns.cancel(turn)})
            return self.reply(404, {"error": "no such path"})

        def mcp(self, token):
            """the agent's tools (MCP over HTTP): the chat token in the path is the permission"""
            size = int(self.headers.get("Content-Length") or 0)
            status, answer = agent_tools.handle(token, self.rfile.read(min(size, 1_000_000)))
            if answer is None:
                self.send_response(status)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            self.reply(status, answer)

        def do_POST(self):
            if not self.origin_ok():
                return self.reply(403, {"error": "not this site"})
            path = urlsplit(self.path).path
            if m := re.fullmatch(r"/mcp/([\w-]+)", path):
                return self.mcp(m.group(1))
            if not self.token_ok():
                return self.reply(401, {"error": "a token is needed"})
            if path.startswith("/api/agents/"):
                return self.agent_post(path.rstrip("/"))
            kind = path.strip("/")
            # which sound engine (the built-in one: piano, or any other instrument or voice)
            self.instrument = (parse_qs(urlsplit(self.path).query).get("instrument") or [""])[0]
            if kind == "transcribe" and self.instrument and (self.instrument not in INSTRUMENTS or (cfg.instruments and self.instrument not in cfg.instruments)):
                return self.reply(501, {"error": f"No engine here for {'other instruments' if self.instrument == 'other' else self.instrument or '?'}: run pixi run -e audio audio-setup, then restart the runner"})
            if kind not in RESULT:
                return self.reply(404, {"error": "no such path"})
            size = int(self.headers.get("Content-Length") or 0)
            if size > cfg.max_bytes:
                return self.reply(413, {"error": f"the file is larger than {cfg.max_bytes // 1_000_000} MB"})
            # the name only gives the extension
            given = Path(unquote(self.headers.get("X-Filename", "")))
            ext = given.suffix.lower()
            # (the name, for the score's title only: never a path)
            self.title = re.sub(r"[^\w .,'()-]+", "", given.stem)[:80]
            if ext not in (OMR_EXT if kind == "omr" else AUDIO_EXT | VIDEO_EXT):
                return self.reply(415, {"error": f"{kind} does not take {ext or 'files without an extension'}"})
            body = self.rfile.read(size)
            template = cfg.omr if kind == "omr" else cfg.transcribe
            if not template:
                how = "run pixi run omr-setup, then restart the runner, or set PZ_OMR" if kind == "omr" else "run pixi run -e audio audio-setup, then restart the runner, or set PZ_TRANSCRIBE"
                return self.reply(501, {"error": f"No {'OMR' if kind == 'omr' else 'transcription'} engine here: {how} (see docs/plans/transcription.md)"})
            # the job's files are gone before the answer goes out
            with tempfile.TemporaryDirectory(prefix="pz-runner-") as tmp:
                answer = self.job(kind, template, Path(tmp), ext, body, size)
            self.reply(*answer)

        def job(self, kind, template, d, ext, body, size):
            """run the engine on the file in d: (status, body, content type)"""
            src = d / f"input{ext}"
            src.write_bytes(body)
            if ext in VIDEO_EXT and shutil.which("ffmpeg"):
                wav = d / "input.wav"
                subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(src), "-vn", "-ac", "1", "-ar", "44100", str(wav)], check=False, timeout=cfg.timeout)
                if wav.exists():
                    src = wav
            outdir = d / "out"
            outdir.mkdir()
            name, ctype = RESULT[kind]
            if kind == "transcribe" and cfg.instruments:
                name = "score.musicxml"  # the built-in engine writes the score itself
            try:
                result = run_engine(template, src, outdir / name, outdir, cfg.timeout, self.title, self.instrument if kind == "transcribe" else "")
            except subprocess.TimeoutExpired:
                return 504, {"error": "the engine took too long"}, "application/json"
            except (RuntimeError, OSError) as e:
                return 502, {"error": str(e)}, "application/json"
            data = result.read_bytes()
            ctype = CTYPES.get(result.suffix.lower(), ctype)
            print(f"{kind}: {ext} {size // 1000} kB → {result.suffix} {len(data) // 1000} kB", file=sys.stderr)
            return 200, data, ctype

    return ThreadingHTTPServer(address, Handler)


def port_taken(host, port):
    """what to say when the port is in use: whether a runner answers there (an older one?) and how to stop it"""
    import urllib.request

    who = "another program"
    try:
        with urllib.request.urlopen(f"http://{'127.0.0.1' if host in ('0.0.0.0', '::') else host}:{port}/status", timeout=2) as r:
            st = json.loads(r.read() or b"{}")
        who = "a Polyphonizer runner already" + ("" if st.get("agent") is not None else " (an older one, from before the AI agent)")
    except Exception:
        pass
    pids = ""
    if shutil.which("lsof"):
        pids = " ".join(subprocess.run(["lsof", "-ti", f"tcp:{port}", "-sTCP:LISTEN"], capture_output=True, text=True).stdout.split())
    stop = f"kill {pids}" if pids else (f"stop the program using port {port}")
    return (
        f"Port {port} is in use by {who}" + (f" (process {pids})" if pids else "") + ".\n"
        f"  If it is a runner whose terminal is gone, stop it:  {stop}\n"
        f"  then start this one again, or use another port:    PZ_PORT=8766 pixi run runner"
    )


def main():
    import errno

    cfg = Config.from_env()
    agent_connector.load()  # agents connected before this start stay connected
    port = int(os.environ.get("PZ_PORT", PORT))
    host = bind_host()
    try:
        httpd = make_server((host, port), cfg)
    except OSError as e:
        if e.errno != errno.EADDRINUSE:
            raise
        raise SystemExit(port_taken(host, port))
    print(f"Polyphonizer runner {VERSION} on http://{host}:{port}" + (" (token required)" if cfg.token else ""))
    print(f"  reading pages (OMR): {cfg.omr or 'no engine (pixi run omr-setup, or set PZ_OMR)'}")
    print(f"  transcribing:        " + (f"{', '.join(cfg.instruments)} on {cfg.device} (engines/audio.py)" if cfg.instruments else cfg.transcribe or "no engine (pixi run -e audio audio-setup, or set PZ_TRANSCRIBE)"))
    st = agent_core.status()
    print("  AI agent:            " + ", ".join(w for w, on in (("this computer's Claude Code or Codex", st["local"]), ("an API key", True), ("included (Pro)", st["included"])) if on))
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
