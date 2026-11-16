# The learner's own AI agent, through a local runner (planned)

Roadmap item: AI help in Polyphonizer the way Tensorizer does it. The site builds no AI of its own and holds no API
keys: the learner's own coding agent (Claude Code, Codex, OpenCode, Gemini CLI), already logged in on their computer,
does the work through a small **runner** they start locally. One AI panel for the whole site (no inline per-page AI);
the Toolbox launcher opens it like the other tools. Replaces the browser API-key teacher removed in Nov 2026.

## The runner (`runner/`, Python, started with `pixi run runner`)

- FastAPI on `127.0.0.1` (port 8765, falling back to the next free one); CORS only for the site's origins
  (`https://jackyko1991.github.io`, the Vite dev origin) with `allow_private_network`, so the public HTTPS page may call
  localhost (Chrome's Private Network Access).
- `GET /api/agent/status`; `POST /api/agents/scan` only when the learner clicks "Search this computer": which CLIs are
  on PATH, `--version`, and whether a credentials file exists (never read; no paths returned).
- `POST /api/agents/chat` → NDJSON events (`turn`, `text{delta}`, `tool`, `tool_result`, `files`, `question`,
  `done`, `error`); turns run detached with an event log (`GET /api/agents/turns/{id}/events?from=N` to reconnect,
  `POST …/cancel` for Stop). One turn at a time per chat; a couple of chats at once at most.
- Adapters, each with no shell and no web, files only inside a per-chat scratch folder:
  - Claude Code via the Claude Agent SDK (`tools=["Read","Write","Edit","Glob","Grep"]`, a `can_use_tool` check on
    paths, `setting_sources=[]`, the machine's own login);
  - Codex: `codex exec --json --cd <ws> --sandbox workspace-write --ignore-user-config -c features.shell_tool=false
    -c web_search="disabled" -c approval_policy="never" -c mcp_servers.polyphonizer.url=<chat token URL> … -` (prompt
    on stdin); OpenCode and Gemini later, marked experimental.
- An MCP server (Streamable HTTP, `/mcp/<token>`): per-chat tokens for the panel's agent, and a long-lived connector
  token (stored only as a hash) so an agent running elsewhere (Claude Code in a terminal, Claude Desktop, claude.ai
  through a tunnel) can use the same tools; the site mirrors what it does.

## Tools (the MCP server's, used by both routes)

- Scores: `get_score` (the open project's files and the compiled summary), `write_file`, `compile` (runs music21 — in
  the runner's own Python, the same version as Pyodide — and returns errors, measures, parts, rule findings).
- Learn to Code: `get_problem`, `check` (the problem's rules).
- Learn to Play: `get_lesson`, `get_attempt` (the last attempt note by note: pitch, bar and beat, on time / early /
  late / wrong / missed, ms offsets — the report the removed teacher had), `play_passage` (notes with loudness, on the
  learner's keyboard), `set_practice` (tempo, mode).
- `perform` (docs/plans/agent-performance.md): a performance as data, played on the keyboard with expression.
- `ask_user` (a multiple-choice question in the panel).

## The site

- One AI panel (drawer, resizable, full screen), opened from the Toolbox launcher; tabs per context (this score / this
  problem / this lesson); settings: This computer (pick an agent, Search this computer, model), and the MCP connector
  setup (commands for Claude Code, Codex, VS Code …; a token per browser).
- Context bus: pages emit what is on screen (score files, the problem, the lesson and the last attempt, the selection);
  the panel sends it with each message. Edits come back as `files` events and are applied to the editor.
- Replies rendered as Markdown with code and ABC/notation blocks; tool calls as collapsible rows.
- No runner reachable: the panel says how to start it (`pixi run runner`), and nothing else on the site changes.

## Tests

- Runner: stand-in CLIs and FastAPI's `TestClient` (as Tensorizer's `tests/test_codex.py`, `test_agents_modes.py`,
  `test_turns.py`): scan metadata only, token scoping and revocation, path checks, NDJSON turn log and reconnect,
  cancel kills the process.
- Site: the NDJSON reader, the context bus, applying `files` events.
