import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Set

from fastapi import WebSocket
from sqlalchemy import delete

from app.database import AsyncSessionLocal
from app.models import Message

logger = logging.getLogger(__name__)

# The ONE place that decides how long messages live. Changing this value
# (or making it per-conversation later) is all it takes.
MESSAGE_TTL = timedelta(hours=24)


class ConnectionManager:
    """Keeps track of which WebSocket connections belong to which user.
    One user can have several (multiple tabs/devices)."""

    def __init__(self):
        self.active: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        connections = self.active.get(user_id)
        if connections:
            connections.discard(websocket)
            if not connections:
                del self.active[user_id]

    async def send_to_user(self, user_id: int, payload: Dict):
        for websocket in list(self.active.get(user_id, [])):
            try:
                await websocket.send_json(payload)
            except Exception:
                self.disconnect(user_id)

manager = ConnectionError()


async def purge_expired_messages(interval_seconds: int = 600):
    """Background loop that physically deletes expired messages.
    Reads already hide expired messages instantly (see messaging.py),
    this just keeps the table from growing forever."""
    while True:
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(
                    delete(Message).where(Message.expires_at <= datetime.now(timezone.utc))
                )
                await session.commit()
        except Exception:
            logger.exception("Failed to purge expired messages")
        await asyncio.sleep(interval_seconds)