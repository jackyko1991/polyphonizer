"""The transcription runner: protocol, CORS, engines as commands, limits. Run: pixi run test-runner"""

import http.client
import json
import os
import sys
import tempfile
import threading
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import server  # noqa: E402

SITE = "https://jackyko1991.github.io"

# stand-in engines: copy the input's bytes into a result, as a real OMR or transcription tool writes its file
FAKE_OMR = f'{sys.executable} -c "import sys; open(sys.argv[2], \'w\').write(\'<score-partwise>\' + str(len(open(sys.argv[1], \'rb\').read())) + \'</score-partwise>\')" {{in}} {{out}}'
FAKE_MIDI = f'{sys.executable} -c "import sys; open(sys.argv[2], \'wb\').write(b\'MThd\' + open(sys.argv[1], \'rb\').read()[:4])" {{in}} {{out}}'
FAILING = f'{sys.executable} -c "import sys; sys.exit(3)" {{in}} {{out}}'


class Runner(unittest.TestCase):
    def start(self, **engines):
        cfg = server.Config(omr=engines.get("omr"), transcribe=engines.get("transcribe"), max_bytes=engines.get("max_bytes", 1_000_000), token=engines.get("token"))
        self.httpd = server.make_server(("127.0.0.1", 0), cfg)
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.addCleanup(self.httpd.server_close)
        self.addCleanup(self.httpd.shutdown)
        self.port = self.httpd.server_address[1]

    def call(self, method, path, body=None, headers=None):
        c = http.client.HTTPConnection("127.0.0.1", self.port, timeout=20)
        c.request(method, path, body=body, headers={"Origin": SITE, **(headers or {})})
        r = c.getresponse()
        body = r.read()
        c.close()
        return r, body

    def test_status_says_which_engines_are_there(self):
        self.start(omr=FAKE_OMR)
        r, body = self.call("GET", "/status")
        self.assertEqual(r.status, 200)
        s = json.loads(body)
        self.assertEqual((s["omr"], s["transcribe"]), (True, False))
        self.assertTrue(s["version"])

    def test_cors_for_the_site_and_private_network_preflight(self):
        self.start()
        r, _ = self.call("OPTIONS", "/omr", headers={"Access-Control-Request-Method": "POST", "Access-Control-Request-Private-Network": "true"})
        self.assertEqual(r.status, 204)
        self.assertEqual(r.getheader("Access-Control-Allow-Origin"), SITE)
        self.assertEqual(r.getheader("Access-Control-Allow-Private-Network"), "true")
        self.assertIn("x-filename", r.getheader("Access-Control-Allow-Headers").lower())
        # the dev server too
        r, _ = self.call("GET", "/status", headers={"Origin": "http://localhost:5191"})
        self.assertEqual(r.getheader("Access-Control-Allow-Origin"), "http://localhost:5191")
        # any other site: refused, so no page elsewhere can use your computer
        r, _ = self.call("GET", "/status", headers={"Origin": "https://evil.example"})
        self.assertEqual(r.status, 403)
        self.assertIsNone(r.getheader("Access-Control-Allow-Origin"))

    def test_omr_runs_the_engine_on_the_file_and_returns_musicxml(self):
        self.start(omr=FAKE_OMR)
        r, body = self.call("POST", "/omr", body=b"%PDF-1.4 x", headers={"X-Filename": "Erlk%C3%B6nig.pdf", "Content-Type": "application/pdf"})
        self.assertEqual(r.status, 200, body)
        self.assertEqual(r.getheader("Content-Type"), "application/vnd.recordare.musicxml+xml")
        self.assertEqual(body, b"<score-partwise>10</score-partwise>")

    def test_transcribe_returns_midi(self):
        self.start(transcribe=FAKE_MIDI)
        r, body = self.call("POST", "/transcribe", body=b"RIFFxxxx", headers={"X-Filename": "take.wav"})
        self.assertEqual(r.status, 200, body)
        self.assertEqual(r.getheader("Content-Type"), "audio/midi")
        self.assertEqual(body, b"MThdRIFF")

    def test_no_engine_is_501_with_how_to_add_one(self):
        self.start()
        r, body = self.call("POST", "/omr", body=b"%PDF", headers={"X-Filename": "a.pdf"})
        self.assertEqual(r.status, 501)
        self.assertIn("PZ_OMR", json.loads(body)["error"])

    def test_a_failing_engine_is_502_and_files_are_cleaned_up(self):
        self.start(omr=FAILING)
        before = set(Path(tempfile.gettempdir()).glob("pz-runner-*"))
        r, body = self.call("POST", "/omr", body=b"%PDF", headers={"X-Filename": "a.pdf"})
        self.assertEqual(r.status, 502)
        self.assertIn("error", json.loads(body))
        self.assertEqual(set(Path(tempfile.gettempdir()).glob("pz-runner-*")), before)

    def test_limits_size_and_names(self):
        self.start(omr=FAKE_OMR, max_bytes=10)
        r, _ = self.call("POST", "/omr", body=b"x" * 11, headers={"X-Filename": "a.pdf"})
        self.assertEqual(r.status, 413)
        # the name only gives the extension: no paths, no odd characters reach the engine
        self.start(omr=FAKE_OMR)
        r, body = self.call("POST", "/omr", body=b"%PDF", headers={"X-Filename": "..%2F..%2Fetc%2Fpasswd.pdf"})
        self.assertEqual(r.status, 200, body)
        # an unknown kind of file is refused before any engine runs
        r, _ = self.call("POST", "/omr", body=b"MZ", headers={"X-Filename": "tool.exe"})
        self.assertEqual(r.status, 415)
        r, _ = self.call("POST", "/nothing", body=b"x")
        self.assertEqual(r.status, 404)

    def test_engines_are_found_on_path_or_set_by_the_environment(self):
        cfg = server.Config.from_env({"PZ_OMR": "mytool {in} {out}"}, which=lambda name: None, copista="")
        self.assertEqual(cfg.omr, "mytool {in} {out}")
        self.assertIsNone(cfg.transcribe)
        cfg = server.Config.from_env({}, which=lambda name: f"/usr/bin/{name}" if name == "transkun" else None, copista="")
        self.assertEqual(cfg.transcribe, "transkun {in} {out}")
        self.assertIsNone(cfg.omr)

    def test_copista_when_installed_comes_before_audiveris(self):
        cfg = server.Config.from_env({}, which=lambda n: "/x/audiveris", copista="py copista.py {in} {out}")
        self.assertEqual(cfg.omr, "py copista.py {in} {out}")
        cfg = server.Config.from_env({}, which=lambda n: "/x/audiveris" if n == "audiveris" else None, copista="")
        self.assertTrue(cfg.omr.startswith("audiveris"))
        # not set up here: nothing found
        self.assertIn(server.copista_command(), (None,) if not (server.REPO / "runner/engines/copisteria/models/evidence-2m.pt").exists() else (server.copista_command(),))

    def test_a_token_when_set(self):
        self.start(omr=FAKE_OMR, token="s3cret")
        r, _ = self.call("GET", "/status")
        self.assertEqual(r.status, 401)
        r, _ = self.call("GET", "/status", headers={"Authorization": "Bearer wrong"})
        self.assertEqual(r.status, 401)
        r, _ = self.call("GET", "/status", headers={"Authorization": "Bearer s3cret"})
        self.assertEqual(r.status, 200)
        self.assertEqual(server.Config.from_env({"PZ_TOKEN": "t"}, which=lambda n: None, copista="").token, "t")

    def test_binds_to_this_computer_only(self):
        self.assertEqual(server.HOST, "127.0.0.1")


if __name__ == "__main__":
    unittest.main()
