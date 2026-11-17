"""Detached agent turns: a chat turn keeps going when the page closes or reloads, and can be watched again.

    turn = start(session, run)            # run(turn) is an async function; it runs in its own thread and event loop
    for event in follow(turn, start=0):   # replay from event N, then wait for more until the turn ends
    cancel(turn)                          # the Stop button: the agent's process is ended

As Tensorizer's backend/app/turns.py, kept in memory: the runner is one process on the learner's computer, so a
restart simply forgets the turns (the page then says the turn was lost and the next message starts afresh).
Every log starts with {"type": "turn", "id": …} and ends with done, error or cancelled.
"""

from __future__ import annotations

import asyncio
import secrets
import threading
import time
from collections.abc import Awaitable, Callable, Iterator
from dataclasses import dataclass, field

KEEP_S = 2 * 3600  # a finished turn's log, for a page that reconnects late


@dataclass(eq=False)
class Turn:
    id: str
    chat: str
    events: list[dict] = field(default_factory=list)
    status: str = "running"  # running | done | failed | cancelled
    finished: float | None = None
    cond: threading.Condition = field(default_factory=threading.Condition)
    loop: asyncio.AbstractEventLoop | None = None
    task: asyncio.Task | None = None

    def emit(self, event: dict) -> None:
        """add an event (from the turn's thread, or an MCP request's thread)"""
        with self.cond:
            # numbered, so a page that follows the turn twice (a reload, a dropped connection) applies each once
            self.events.append({**event, "n": len(self.events)})
            self.cond.notify_all()

    def end(self, status: str) -> None:
        with self.cond:
            if self.status == "running":
                self.status = status
                self.finished = time.time()
            self.cond.notify_all()


_turns: dict[str, Turn] = {}
_lock = threading.Lock()


def start(chat: str, run: Callable[[Turn], Awaitable[None]]) -> Turn:
    turn = Turn(id=secrets.token_hex(8), chat=chat)
    turn.emit({"type": "turn", "id": turn.id})
    with _lock:
        for tid, t in list(_turns.items()):  # forget old finished turns
            if t.finished and time.time() - t.finished > KEEP_S:
                del _turns[tid]
        _turns[turn.id] = turn

    def thread() -> None:
        async def main() -> None:
            turn.loop = asyncio.get_running_loop()
            turn.task = asyncio.current_task()
            try:
                await run(turn)
                ended = next((e["type"] for e in reversed(turn.events) if e["type"] in ("done", "error")), "done")
                turn.end("failed" if ended == "error" else "done")
            except asyncio.CancelledError:
                turn.emit({"type": "cancelled"})
                turn.end("cancelled")
            except Exception as e:  # noqa: BLE001 - shown in the chat
                turn.emit({"type": "error", "message": str(e)[:1000]})
                turn.end("failed")

        asyncio.run(main())

    threading.Thread(target=thread, name=f"turn-{turn.id}", daemon=True).start()
    return turn


def get(turn_id: str) -> Turn | None:
    with _lock:
        return _turns.get(turn_id)


def follow(turn: Turn, start: int = 0, wait_s: float = 15.0) -> Iterator[dict | None]:
    """the turn's events from number `start`, then the new ones as they come, until it ends; None now and then while
    nothing happens (a keep-alive for the connection)"""
    i = max(0, start)
    while True:
        with turn.cond:
            if i >= len(turn.events) and turn.status == "running":
                turn.cond.wait(wait_s)
            fresh = turn.events[i:]
            done = turn.status != "running"
        yield from fresh
        i += len(fresh)
        if done and i >= len(turn.events):
            return
        if not fresh:
            yield None


def cancel(turn: Turn) -> bool:
    if turn.status != "running" or turn.loop is None or turn.task is None:
        return False
    turn.loop.call_soon_threadsafe(turn.task.cancel)
    return True
