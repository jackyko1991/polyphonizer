"""Claude Code adapter: the Claude Agent SDK driving Claude Code on one chat's workspace (from Tensorizer's
backend/app/agents/claude_code.py).

Read / Write / Edit / Glob / Grep confined to the workspace folder, no shell and no web, plus Polyphonizer's tools
(compile, ask_user) from the runner's MCP endpoint. The same code serves this computer's own Claude Code login, the
learner's API key (Anthropic, or OpenRouter's Anthropic-compatible endpoint) and the Polyphonizer service's key
(Pro): they differ only in `env`.
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from pathlib import Path

SERVER = "polyphonizer"
TOOLS = [f"mcp__{SERVER}__compile", f"mcp__{SERVER}__ask_user"]


def inside(path: str, root: Path) -> bool:
    try:
        return (root / path).resolve().is_relative_to(root.resolve())
    except (OSError, ValueError):
        return False


def short(data: dict) -> dict:
    """tool inputs for display: long strings (whole files) trimmed"""
    return {k: (v[:300] + "…" if isinstance(v, str) and len(v) > 300 else v) for k, v in data.items()}


def text_of(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(c.get("text", "") for c in content if isinstance(c, dict))
    return json.dumps(content)[:2000]


def scrub(text: str, secrets: list[str]) -> str:
    for s in secrets:
        if s:
            text = text.replace(s, "***")
    return text


async def run(
    session,
    message: str,
    *,
    model: str,
    env: dict[str, str],
    system_prompt: str,
    max_turns: int,
    mcp_url: str,
    secrets: list[str],
    login_hint: str,
) -> AsyncIterator[dict]:
    """one turn: yields text, tool, tool_result, done {cost_usd} or error"""
    from claude_agent_sdk import (
        AssistantMessage,
        ClaudeAgentOptions,
        ClaudeSDKClient,
        ResultMessage,
        TextBlock,
        ToolResultBlock,
        ToolUseBlock,
        UserMessage,
    )
    from claude_agent_sdk.types import PermissionResultAllow, PermissionResultDeny, StreamEvent

    root = session.workspace

    async def can_use_tool(name: str, data: dict, _context) -> PermissionResultAllow | PermissionResultDeny:
        path = data.get("file_path") or data.get("path") or data.get("notebook_path")
        if path is not None and not inside(path, root):
            return PermissionResultDeny(message="Only the files of this score can be read or changed.")
        return PermissionResultAllow(updated_input=data)

    options = ClaudeAgentOptions(
        cwd=str(root),
        tools=["Read", "Write", "Edit", "Glob", "Grep"],
        disallowed_tools=["Bash", "WebFetch", "WebSearch", "Task"],
        allowed_tools=TOOLS,
        mcp_servers={SERVER: {"type": "http", "url": mcp_url}},
        strict_mcp_config=True,
        can_use_tool=can_use_tool,
        permission_mode="default",
        system_prompt={"type": "preset", "preset": "claude_code", "append": system_prompt},
        model=model,
        max_turns=max_turns,
        include_partial_messages=True,
        setting_sources=[],
        resume=session.claude_session,
        env=env,
    )
    sink: asyncio.Queue = asyncio.Queue()

    async def drive() -> None:
        try:
            async with ClaudeSDKClient(options=options) as client:
                await client.query(message)
                async for m in client.receive_response():
                    await sink.put(("sdk", m))
        except Exception as e:  # noqa: BLE001 - shown to the learner, never with the key
            text = scrub(str(e), secrets)
            if "logged in" in text.lower() or "auth" in text.lower() or "api key" in text.lower():
                text += login_hint
            await sink.put({"type": "error", "message": text[:500]})
        finally:
            await sink.put(None)

    task = asyncio.create_task(drive())
    try:
        while (item := await sink.get()) is not None:
            if isinstance(item, dict):
                yield item
                continue
            m = item[1]
            if isinstance(m, StreamEvent):
                ev = m.event
                if ev.get("type") == "content_block_delta" and ev.get("delta", {}).get("type") == "text_delta":
                    yield {"type": "text", "delta": ev["delta"]["text"]}
            elif isinstance(m, AssistantMessage):
                for b in m.content:
                    if isinstance(b, ToolUseBlock):
                        yield {"type": "tool", "id": b.id, "name": b.name, "input": short(b.input)}
                    elif isinstance(b, TextBlock) and not options.include_partial_messages:
                        yield {"type": "text", "delta": b.text}
            elif isinstance(m, UserMessage) and isinstance(m.content, list):
                for b in m.content:
                    if isinstance(b, ToolResultBlock):
                        yield {"type": "tool_result", "id": b.tool_use_id, "ok": not b.is_error, "text": text_of(b.content)[:2000]}
            elif isinstance(m, ResultMessage):
                session.claude_session = m.session_id
                if m.is_error:
                    text = scrub(str(m.result or (m.errors or [m.subtype])[0] or "Claude Code stopped"), secrets)[:500]
                    if m.subtype == "error_max_turns":
                        text = "It reached the most steps one message may take; send another message to let it go on."
                    elif any(w in text.lower() for w in ("logged in", "auth", "api key", "credit")):
                        text += login_hint
                    yield {"type": "error", "message": text}
                else:
                    yield {"type": "done", "cost_usd": m.total_cost_usd}
    finally:
        task.cancel()  # Stop, or the page went away and the turn was cancelled: end Claude Code too
