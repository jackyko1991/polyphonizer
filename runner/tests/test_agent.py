"""The AI agent in the runner: MCP tools, detached turns, a whole chat turn with a stand-in Codex, and what a runner
on a server may offer. No real agent or API key is used. Run: pixi run test-runner"""

import asyncio
import http.client
import json
import os
import stat
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import server  # noqa: E402
from agent import connector, core, scan, tools, turns  # noqa: E402

SITE = "https://jackyko1991.github.io"
MAIN = 'melody = tiny("c4 d e f g2 g", name="Violin", inst="violin")\nscore = together(melody, title="Test")\n'

# a stand-in for `codex exec --json … -`: reads the prompt on stdin, rewrites main.py in its folder (--cd), calls the
# compile tool of the MCP server it was given (-c mcp_servers.polyphonizer.url=…) and reports as Codex does
FAKE_CODEX = r'''
import json, sys, urllib.request
argv = sys.argv[1:]
cwd = argv[argv.index("--cd") + 1]
url = next(json.loads(a.split("=", 1)[1]) for a in argv if a.startswith("mcp_servers.polyphonizer.url="))
prompt = sys.stdin.read()
def out(e): print(json.dumps(e), flush=True)
out({"type": "thread.started", "thread_id": "th-1"})
code = open(f"{cwd}/main.py").read()
open(f"{cwd}/main.py", "w").write(code.replace("g2 g", "a2 g"))
out({"type": "item.completed", "item": {"id": "f1", "type": "file_change", "changes": [{"path": "main.py", "kind": "update"}], "status": "completed"}})
def rpc(method, params, id=1):
    req = urllib.request.Request(url, json.dumps({"jsonrpc": "2.0", "id": id, "method": method, "params": params}).encode(), {"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req).read())
rpc("initialize", {"protocolVersion": "2025-06-18"})
r = rpc("tools/call", {"name": "compile", "arguments": {"part": "Violin", "from_bar": 2, "to_bar": 2}}, 2)
out({"type": "item.completed", "item": {"id": "m1", "type": "mcp_tool_call", "server": "polyphonizer", "tool": "compile", "arguments": {}, "result": r["result"], "status": "completed"}})
saw = "On the learner's screen" in prompt and "bars 2-3" in prompt
out({"type": "item.completed", "item": {"id": "a1", "type": "agent_message", "text": "Changed bar 2." + (" (saw the context)" if saw else "")}})
out({"type": "turn.completed", "usage": {}})
'''


def ndjson(raw: bytes) -> list[dict]:
    return [json.loads(line) for line in raw.decode().splitlines() if line.strip()]


class Mcp(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.ws = Path(self.tmp.name)
        (self.ws / "main.py").write_text(MAIN)
        self.turn = turns.Turn(id="t", chat="c")
        self.token = tools.token_for(self.ws, self.turn)

    def tearDown(self):
        tools.revoke(self.token)
        self.tmp.cleanup()

    def call(self, method, params=None, id=1):
        return tools.handle(self.token, json.dumps({"jsonrpc": "2.0", "id": id, "method": method, "params": params or {}}).encode())

    def test_handshake_and_tools(self):
        status, r = self.call("initialize", {"protocolVersion": "2025-03-26"})
        self.assertEqual((status, r["result"]["protocolVersion"]), (200, "2025-03-26"))
        self.assertEqual(r["result"]["serverInfo"]["name"], "polyphonizer")
        status, r = tools.handle(self.token, json.dumps({"jsonrpc": "2.0", "method": "notifications/initialized"}).encode())
        self.assertEqual((status, r), (202, None))
        names = [t["name"] for t in self.call("tools/list")[1]["result"]["tools"]]
        self.assertEqual(names, ["compile", "ask_user"])

    def test_compile_reports_the_score_and_bars(self):
        _, r = self.call("tools/call", {"name": "compile", "arguments": {"part": "Violin", "from_bar": 1, "to_bar": 2}})
        self.assertFalse(r["result"]["isError"])
        out = json.loads(r["result"]["content"][0]["text"])
        self.assertEqual((out["parts"], out["bars"], out["title"]), (["Violin"], 2, "Test"))
        self.assertEqual(out["bar_text"]["bars"]["2"]["text"], "g2 g2")
        self.assertEqual(self.turn.events[-1], {"type": "compiled", "ok": True, "n": 0})

    def test_compile_error_names_the_line_as_the_editor_does(self):
        (self.ws / "main.py").write_text("x = 1\nscore = nothing_here\n")
        _, r = self.call("tools/call", {"name": "compile", "arguments": {}})
        self.assertTrue(r["result"]["isError"])
        self.assertIn("main.py, line 2", r["result"]["content"][0]["text"])
        self.assertIn("NameError", r["result"]["content"][0]["text"])

    def test_compile_with_a_module(self):
        (self.ws / "motifs.py").write_text('def head():\n    return tiny("e4 f g a", name="Flute")\n')
        (self.ws / "main.py").write_text("from motifs import head\nscore = together(head())\n")
        out = json.loads(self.call("tools/call", {"name": "compile", "arguments": {}})[1]["result"]["content"][0]["text"])
        self.assertEqual(out["parts"], ["Flute"])

    def test_ask_user_puts_a_question_in_the_chat(self):
        _, r = self.call("tools/call", {"name": "ask_user", "arguments": {"question": "Which key?", "options": ["G", "D"]}})
        self.assertFalse(r["result"]["isError"])
        self.assertEqual(self.turn.events[-1], {"type": "question", "question": "Which key?", "options": ["G", "D"], "multi": False, "n": 0})
        _, r = self.call("tools/call", {"name": "ask_user", "arguments": {"question": "Only one?", "options": ["x"]}})
        self.assertTrue(r["result"]["isError"])

    def test_a_revoked_or_unknown_token_has_no_tools(self):
        tools.revoke(self.token)
        status, r = self.call("tools/list")
        self.assertEqual(status, 404)
        self.assertIn("closed", r["error"]["message"])


class Turns(unittest.TestCase):
    def test_follow_replays_and_waits_until_the_end(self):
        gate = threading.Event()

        async def run(t):
            t.emit({"type": "text", "delta": "a"})
            while not gate.is_set():
                await asyncio.sleep(0.01)
            t.emit({"type": "text", "delta": "b"})
            t.emit({"type": "done"})

        t = turns.start("chat-1", run)
        time.sleep(0.1)
        gate.set()
        got = [e for e in turns.follow(t, 0, wait_s=0.05) if e is not None]
        self.assertEqual([e["type"] for e in got], ["turn", "text", "text", "done"])
        self.assertEqual([e["n"] for e in got], [0, 1, 2, 3])
        self.assertEqual(t.status, "done")
        # from event 2: only what came after (a page reconnecting)
        self.assertEqual([e.get("delta") for e in turns.follow(t, 2) if e], ["b", None])

    def test_cancel_ends_the_turn(self):
        async def run(t):
            await asyncio.sleep(30)

        t = turns.start("chat-2", run)
        time.sleep(0.1)
        self.assertTrue(turns.cancel(t))
        events = [e for e in turns.follow(t, 0, wait_s=0.05) if e is not None]
        self.assertEqual(events[-1], {"type": "cancelled", "n": 1})
        self.assertEqual(t.status, "cancelled")
        self.assertFalse(turns.cancel(t))

    def test_an_error_ends_it_as_failed(self):
        async def run(t):
            raise RuntimeError("boom")

        t = turns.start("chat-3", run)
        events = [e for e in turns.follow(t, 0, wait_s=0.05) if e is not None]
        self.assertEqual(events[-1], {"type": "error", "message": "boom", "n": 1})
        self.assertEqual(t.status, "failed")


class Policy(unittest.TestCase):
    def req(self, **kw):
        return {"agent": "claude-code", "chat": "chat-abcdef", "message": "hi", **kw}

    def test_a_server_offers_no_local_login(self):
        server_env = {"PZ_TOKEN": "s", "PZ_HOST": "0.0.0.0"}
        self.assertFalse(core.local_allowed(server_env))
        self.assertIn("server", core.check(self.req(), server_env))
        self.assertTrue(core.local_allowed({}))
        self.assertTrue(core.local_allowed({**server_env, "PZ_AGENT_AUTH": "local"}))

    def test_keys(self):
        self.assertIn("API key", core.check(self.req(agent="claude-api"), {}))
        self.assertIsNone(core.check(self.req(agent="claude-api", api_key="sk-x"), {}))
        self.assertIn("Pro", core.check(self.req(agent="included"), {}))
        self.assertIsNone(core.check(self.req(agent="included"), {"PZ_AGENT_KEY": "k"}))
        self.assertEqual(core.status({"PZ_AGENT_KEY": "k"})["included"], True)

    def test_pictures(self):
        png = {"type": "image/png", "data": "iVBORw0KGgo="}
        self.assertIsNone(core.check(self.req(agent="claude-api", api_key="k", images=[png]), {}))
        self.assertIn("PNG", core.check(self.req(agent="claude-api", api_key="k", images=[{"type": "image/svg+xml", "data": "x"}]), {}))
        self.assertIn("at most", core.check(self.req(agent="claude-api", api_key="k", images=[png] * 5), {}))
        with tempfile.TemporaryDirectory() as d:
            s = core.Session(id="chat-x", workspace=Path(d))
            (Path(d) / "pictures").mkdir()
            (Path(d) / "pictures" / "old.png").write_bytes(b"x")
            self.assertEqual(core.save_pictures(s, [png, {"type": "image/jpeg", "data": "not base64!"}]), ["pictures/picture-1.png"])
            self.assertEqual(sorted(p.name for p in (Path(d) / "pictures").iterdir()), ["picture-1.png"])  # the last turn's are gone
            self.assertEqual(core.snapshot(s), {})  # pictures are never sent back as score files
        argv = core.codex.command("codex", "/w", None, "sess-1", "http://x/mcp/t", ["/w/pictures/picture-1.png"])
        self.assertEqual(argv[-4:], ["resume", "sess-1", "--image=/w/pictures/picture-1.png", "-"])

    def test_modes(self):
        self.assertIsNone(core.check(self.req(agent="claude-api", api_key="k", mode="plan"), {}))
        self.assertIn("mode", core.check(self.req(agent="claude-api", api_key="k", mode="yolo"), {}))
        # plan mode: Codex can't write
        self.assertIn("read-only", core.codex.command("codex", "/w", None, None, "http://x", plan=True))
        self.assertIn("workspace-write", core.codex.command("codex", "/w", None, None, "http://x"))
        # an outside agent's write_file is refused while the page is in plan mode
        with tempfile.TemporaryDirectory() as d:
            c = connector.Connector(id="abcdefabcdef", workspace=Path(d))
            connector.sync(c, "T", [{"name": "main.py", "code": "score = 1\n"}], "plan")
            text, err, files = tools.file_tool(tools.Binding(Path(d), c, "connector"), "write_file", {"name": "main.py", "code": "x"})
            self.assertTrue(err and files is None and "plan" in text)
            connector.sync(c, "T", [{"name": "main.py", "code": "score = 1\n"}], "auto")
            self.assertFalse(tools.file_tool(tools.Binding(Path(d), c, "connector"), "write_file", {"name": "main.py", "content": "y"})[1])

    def test_bad_requests(self):
        self.assertIn("chat id", core.check(self.req(chat="../x"), {}))
        self.assertIn("empty", core.check(self.req(message=" "), {}))
        self.assertIn("unknown", core.check(self.req(agent="shell"), {}))

    def test_models(self):
        self.assertEqual(core.model_for("claude-code", "anthropic", "gpt"), core.MODELS[0])
        self.assertEqual(core.model_for("claude-api", "openrouter", None), core.OPENROUTER_MODELS[0])
        self.assertIsNone(core.model_for("codex", "anthropic", "rm -rf /"))
        self.assertEqual(core.model_for("codex", "anthropic", "gpt-5.5"), "gpt-5.5")

    def test_files_from_the_page(self):
        with tempfile.TemporaryDirectory() as d:
            s = core.Session("x", Path(d))
            (Path(d) / "old.py").write_text("x")
            kept = core.sync_files(s, [{"name": "main.py", "code": "score = 1"}, {"name": "../evil.py", "code": ""}, {"name": "m.py", "code": "y"}])
            self.assertEqual(sorted(kept), ["m.py", "main.py"])
            self.assertFalse((Path(d) / "old.py").exists())
            with self.assertRaises(ValueError):
                core.sync_files(s, [{"name": "m.py", "code": ""}])
        self.assertEqual(core.changes({"a.py": "1", "b.py": "2"}, {"a.py": "1!", "c.py": "3"}), {"type": "files", "files": {"a.py": "1!", "c.py": "3"}, "removed": ["b.py"]})
        self.assertIsNone(core.changes({"a.py": "1"}, {"a.py": "1"}))

    def test_context(self):
        text = core.context_text({"title": "Minuet", "bars": {"part": "Violin", "from": 3, "to": 5}, "error": "NameError"})
        self.assertIn("Selected: bars 3-5 (Violin)", text)
        self.assertIn("failed: NameError", text)
        self.assertEqual(core.context_text({}), "")


class ChatOverHttp(unittest.TestCase):
    """a whole turn through the runner: the stand-in Codex edits main.py and compiles over MCP"""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        fake = Path(self.tmp.name) / "codex"
        fake.write_text(f"#!{sys.executable}\n{FAKE_CODEX}")
        fake.chmod(fake.stat().st_mode | stat.S_IEXEC)
        self.patches = [
            mock.patch.object(scan, "executable", lambda cli_id: str(fake) if cli_id == "codex" else None),
            mock.patch.object(core, "ROOT", Path(self.tmp.name) / "chats"),
            mock.patch.dict(os.environ, {"PZ_TOKEN": "", "PZ_HOST": "127.0.0.1"}),
        ]
        for p in self.patches:
            p.start()
        self.httpd = server.make_server(("127.0.0.1", 0), server.Config())
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        for p in self.patches:
            p.stop()
        self.tmp.cleanup()

    def post(self, path, body):
        c = http.client.HTTPConnection("127.0.0.1", self.httpd.server_address[1], timeout=60)
        c.request("POST", path, json.dumps(body), {"Origin": SITE, "Content-Type": "application/json"})
        r = c.getresponse()
        return r.status, r.read()

    def test_a_turn_edits_compiles_and_hands_back_the_files(self):
        req = {
            "agent": "codex",
            "chat": "chat-http-1",
            "message": "Make bar 2 start on A",
            "files": [{"name": "main.py", "code": MAIN}],
            "context": {"title": "Test", "bars": {"part": "Violin", "from": 2, "to": 3}},
        }
        status, raw = self.post("/api/agents/chat", req)
        self.assertEqual(status, 200)
        events = ndjson(raw)
        kinds = [e["type"] for e in events]
        self.assertEqual(kinds[0], "turn")
        self.assertIn("compiled", kinds)
        compiled = next(e for e in events if e["type"] == "tool_result" and "bar_text" in e["text"])
        self.assertIn("a2 g2", compiled["text"])
        self.assertIn("saw the context", "".join(e.get("delta", "") for e in events if e["type"] == "text"))
        files = next(e for e in events if e["type"] == "files")
        self.assertEqual(files["files"], {"main.py": MAIN.replace("g2 g", "a2 g")})
        self.assertEqual(kinds[-1], "done")
        # the same turn again from event 1, as after a reload
        c = http.client.HTTPConnection("127.0.0.1", self.httpd.server_address[1], timeout=10)
        c.request("GET", f"/api/agents/turns/{events[0]['id']}/events?from=1", headers={"Origin": SITE})
        again = ndjson(c.getresponse().read())
        self.assertEqual([e["type"] for e in again], kinds[1:])
        # its MCP token died with the turn
        self.assertEqual(tools._tokens, {})

    def test_refusals(self):
        status, raw = self.post("/api/agents/chat", {"agent": "claude-api", "chat": "chat-http-2", "message": "hi"})
        self.assertEqual(status, 400)
        self.assertIn("API key", json.loads(raw)["error"])
        status, _ = self.post("/mcp/not-a-token", {"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
        self.assertEqual(status, 404)

    def test_status_says_what_the_agent_can_do(self):
        c = http.client.HTTPConnection("127.0.0.1", self.httpd.server_address[1], timeout=10)
        c.request("GET", "/status", headers={"Origin": SITE})
        st = json.loads(c.getresponse().read())
        self.assertEqual(st["agent"]["local"], True)
        self.assertEqual(st["agent"]["included"], False)


if __name__ == "__main__":
    unittest.main()


class ConnectorOverHttp(unittest.TestCase):
    """an agent outside the site: a token from the page, the score synced, MCP tools on it, its writes back as events"""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.patches = [mock.patch.object(connector, "STORE", Path(self.tmp.name) / "connectors.json"), mock.patch.dict(os.environ, {"PZ_TOKEN": "", "PZ_HOST": "127.0.0.1"})]
        for p in self.patches:
            p.start()
        self.httpd = server.make_server(("127.0.0.1", 0), server.Config())
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        for p in self.patches:
            p.stop()
        self.tmp.cleanup()

    def call(self, method, path, body=None, headers=None):
        c = http.client.HTTPConnection("127.0.0.1", self.httpd.server_address[1], timeout=120)
        c.request(method, path, None if body is None else json.dumps(body), {"Origin": SITE, "Content-Type": "application/json", **(headers or {})})
        r = c.getresponse()
        raw = r.read()
        return r.status, json.loads(raw) if raw else None

    def rpc(self, token, method, params=None, mid=1):
        # (an agent is no browser: no Origin)
        c = http.client.HTTPConnection("127.0.0.1", self.httpd.server_address[1], timeout=120)
        c.request("POST", f"/mcp/{token}", json.dumps({"jsonrpc": "2.0", "id": mid, "method": method, "params": params or {}}), {"Content-Type": "application/json"})
        r = c.getresponse()
        return r.status, json.loads(r.read() or b"null")

    def test_an_outside_agent_reads_writes_and_compiles_the_score_on_the_page(self):
        status, made = self.call("POST", "/api/agents/connector", {})
        self.assertEqual(status, 200)
        token = made["token"]
        self.assertTrue(token.startswith("pzc_"))
        # the token is kept (hashed) for the next start of the runner
        self.assertNotIn(token, connector.STORE.read_text())
        # before the page syncs, the agent is told to open it
        _, a = self.rpc(token, "tools/call", {"name": "get_score", "arguments": {}})
        self.assertTrue(a["result"]["isError"])
        hdr = {"X-Connector": token}
        status, synced = self.call("POST", "/api/agents/connector/sync", {"title": "Test", "files": [{"name": "main.py", "code": MAIN}]}, hdr)
        self.assertEqual((status, synced["files"]), (200, 1))
        _, init = self.rpc(token, "initialize", {"clientInfo": {"name": "claude-code"}})
        self.assertIn("get_score", init["result"]["instructions"])
        _, tl = self.rpc(token, "tools/list")
        self.assertEqual([t["name"] for t in tl["result"]["tools"]], ["get_score", "read_file", "write_file", "compile"])
        _, got = self.rpc(token, "tools/call", {"name": "get_score", "arguments": {}})
        self.assertEqual(json.loads(got["result"]["content"][0]["text"])["title"], "Test")
        new = MAIN.replace("4/4", "3/4") if "4/4" in MAIN else MAIN + "\n# changed\n"
        _, w = self.rpc(token, "tools/call", {"name": "write_file", "arguments": {"name": "main.py", "code": new}})
        self.assertFalse(w["result"]["isError"], w)
        _, bad = self.rpc(token, "tools/call", {"name": "write_file", "arguments": {"name": "../x.py", "code": "x"}})
        self.assertTrue(bad["result"]["isError"])
        _, comp = self.rpc(token, "tools/call", {"name": "compile", "arguments": {}})
        self.assertIn("isError", comp["result"])
        status, ev = self.call("GET", "/api/agents/connector/events?after=0", None, hdr)
        kinds = [e["type"] for e in ev["events"]]
        self.assertEqual(ev["client"], "claude-code")
        self.assertIn("connected", kinds)
        files = [e for e in ev["events"] if e["type"] == "files"]
        self.assertEqual(files[0]["files"], {"main.py": new})
        self.assertIn("compiled", kinds)
        last = ev["events"][-1]["seq"]
        _, ev2 = self.call("GET", f"/api/agents/connector/events?after={last}", None, hdr)
        self.assertEqual(ev2["events"], [])
        # a connection made earlier works after a restart (the store is read again)
        connector._connectors.clear()
        connector.load()
        self.assertIsNotNone(connector.lookup(token))
        # revoked: gone
        self.call("POST", "/api/agents/connector/revoke", {}, hdr)
        status, _ = self.rpc(token, "tools/list")
        self.assertEqual(status, 404)
        status, _ = self.call("GET", "/api/agents/connector/events", None, hdr)
        self.assertEqual(status, 404)
