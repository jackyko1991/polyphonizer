"""The Polyphonizer runner: turns a picture of music or a recording into notes on your own computer.

    pixi run runner            # http://127.0.0.1:8765, for the site (Transcribe ▸ My computer)

Like Ollama for this one job: the site sends a file, the runner hands it to an engine installed here and sends back
MusicXML or MIDI. Nothing leaves the computer. It speaks the protocol of docs/plans/transcription.md:

    GET  /status                      → {"omr": bool, "transcribe": bool, "version": "…"}
    POST /omr        (PDF or image)   → MusicXML           (body: the file; X-Filename: its name)
    POST /transcribe (audio or video) → MIDI

An engine is a command with {in} and {out} for the files, so any tool can be used:
    PZ_OMR="audiveris -batch -export -output {outdir} {in}"     (or copista, homr …; see docs/plans/transcription.md)
    PZ_TRANSCRIBE="transkun {in} {out}"
Found by themselves when on PATH: transkun (piano recordings), audiveris (printed pages). A video is turned into
audio first with ffmpeg when it is installed.

Only the site's own pages may call it (CORS), it listens on 127.0.0.1 only, and it keeps no files. Run on a server
(behind HTTPS), set PZ_TOKEN: the site sends it as a bearer token (Transcribe ▸ address and token).
"""

import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

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

    @classmethod
    def from_env(cls, env=os.environ, which=shutil.which):
        """the engines: PZ_OMR / PZ_TRANSCRIBE, else the tools found on PATH"""
        omr = env.get("PZ_OMR") or ("audiveris -batch -export -output {outdir} {in}" if which("audiveris") else None)
        tr = env.get("PZ_TRANSCRIBE") or ("transkun {in} {out}" if which("transkun") else None)
        return cls(omr=omr, transcribe=tr, token=env.get("PZ_TOKEN") or None)


def run_engine(template, src, out, outdir, timeout):
    """run an engine's command on the files; the result is {out}, or the first MusicXML/MIDI it wrote in {outdir}"""
    args = [a.replace("{in}", str(src)).replace("{out}", str(out)).replace("{outdir}", str(outdir)) for a in shlex.split(template)]
    p = subprocess.run(args, capture_output=True, timeout=timeout)
    if p.returncode != 0:
        tail = (p.stderr or p.stdout).decode("utf-8", "replace").strip().splitlines()[-3:]
        raise RuntimeError(f"the engine stopped (exit {p.returncode}): " + " / ".join(tail))
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
            self.send_header("Access-Control-Allow-Headers", "content-type, x-filename, authorization")
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
            if self.path.rstrip("/") == "/status":
                return self.reply(200, {"omr": bool(cfg.omr), "transcribe": bool(cfg.transcribe), "version": VERSION})
            self.reply(404, {"error": "no such path"})

        def do_POST(self):
            if not self.origin_ok():
                return self.reply(403, {"error": "not this site"})
            if not self.token_ok():
                return self.reply(401, {"error": "a token is needed"})
            kind = self.path.strip("/")
            if kind not in RESULT:
                return self.reply(404, {"error": "no such path"})
            size = int(self.headers.get("Content-Length") or 0)
            if size > cfg.max_bytes:
                return self.reply(413, {"error": f"the file is larger than {cfg.max_bytes // 1_000_000} MB"})
            # the name only gives the extension
            ext = Path(unquote(self.headers.get("X-Filename", ""))).suffix.lower()
            if ext not in (OMR_EXT if kind == "omr" else AUDIO_EXT | VIDEO_EXT):
                return self.reply(415, {"error": f"{kind} does not take {ext or 'files without an extension'}"})
            body = self.rfile.read(size)
            template = cfg.omr if kind == "omr" else cfg.transcribe
            if not template:
                var = "PZ_OMR" if kind == "omr" else "PZ_TRANSCRIBE"
                return self.reply(501, {"error": f"No {'OMR' if kind == 'omr' else 'transcription'} engine here: install one or set {var} (see docs/plans/transcription.md)"})
            with tempfile.TemporaryDirectory(prefix="pz-runner-") as tmp:
                d = Path(tmp)
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
                try:
                    result = run_engine(template, src, outdir / name, outdir, cfg.timeout)
                except subprocess.TimeoutExpired:
                    return self.reply(504, {"error": "the engine took too long"})
                except (RuntimeError, OSError) as e:
                    return self.reply(502, {"error": str(e)})
                data = result.read_bytes()
                if result.suffix.lower() == ".mxl":
                    ctype = "application/vnd.recordare.musicxml"
                print(f"{kind}: {ext} {size // 1000} kB → {result.suffix} {len(data) // 1000} kB", file=sys.stderr)
                self.reply(200, data, ctype)

    return ThreadingHTTPServer(address, Handler)


def main():
    cfg = Config.from_env()
    port = int(os.environ.get("PZ_PORT", PORT))
    httpd = make_server((HOST, port), cfg)
    print(f"Polyphonizer runner {VERSION} on http://{HOST}:{port}")
    print(f"  reading pages (OMR): {cfg.omr or 'no engine (set PZ_OMR)'}")
    print(f"  transcribing:        {cfg.transcribe or 'no engine (set PZ_TRANSCRIBE)'}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
