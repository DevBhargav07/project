import logging
from typing import List
from datetime import datetime, timezone
from typing_extensions import Annotated

from fastapi import Depends, APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from jose import jwt, JWTError
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, aliased

from app.auth.auth import ALGORITHM, SECRET_KEY
from app.auth.permissions import IsAuthenticated, check_permission
from app.models import ( Conversation, ConversationMember, Message, User, UserRegion, VisibilityLevel )
from app.chat_manager import MESSAGE_TTL, manager
from app.database import get_async_session, AsyncSessionLocal
from app.schemas import ChatUserOut, MessageOut, ConversationOut, OpenDirectRequest

router = APIRouter(prefix="/chat", tags=["chat"])

session_dependency = Annotated[AsyncSession, Depends(get_async_session)]

logger = logging.getLogger(__name__)

def _now() -> datetime:
    return datetime.now(timezone.utc)


#---------------------------------- helpers ----------------------------------------

async def _discoverable_stmt(session: AsyncSession, me):
    """Users that 'me' is allowed to see: visibility 'everyone', or visibility
    'region' with atleast one region in common with me"""
    my_region_ids = (
        await session.scalars(select(UserRegion.region_id).where(UserRegion.user_id == me.id))
    ).all()

    visible = User.visibility == VisibilityLevel.everyone

    if my_region_ids:
        users_in_my_regions = select(UserRegion.user_id).where(
            UserRegion.region_id.in_(my_region_ids)
        )
        visible = or_(
            visible,
            and_(User.visibility == VisibilityLevel.region, User.id.in_(users_in_my_regions)),
        )
    return select(User).where(User.id != me.id, User.is_active.is_(True), visible)

async def _find_direct_conversation_id(session: AsyncSession, user_a: int, user_b: int):
    m1 = aliased(ConversationMember)
    m2 = aliased(ConversationMember)

    stmt = (
        select(Conversation.id)
        .join(m1, m1.conversation_id == Conversation.id)
        .join(m2, m2.conversation_id == Conversation.id)
        .where(Conversation.type == "direct", m1.user_id == user_a, m2.user_id == user_b)
    )
    return await session.scalar(stmt)

async def _require_member(session: AsyncSession, conversation_id: int, user_id: int):
    member = await session.get(ConversationMember, (conversation_id, user_id))
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return member

async def _conversation_out(session: AsyncSession, conv: Conversation, me_id: int):
    """Builds the dict for one conversation row. conv.members (and each
    member's user) must already be loaded."""
    now = _now()
    my_member = next(m for m in conv.members if m.user_id==me_id)
    other = next((m.user for m in conv.members if m.user_id != me_id), None)

    if other is None:
        return None
    
    last = await session.scalar(
        select(Message)
        .where(Message.conversation_id == conv.id, Message.expires_at > now)
        .order_by(Message.sent_at.desc())
        .limit(1)
    )

    unread_stmt = select(func.count(Message.id)).where(
        Message.conversation_id == conv.id,
        Message.sender_id != me_id,
        Message.expires_at > now,
    )

    if my_member.last_read_at:
        unread_stmt = unread_stmt.where(Message.sent_at > my_member.last_read_at)
    unread = await session.scalar(unread_stmt)

    return {
        "id": conv.id,
        "type": conv.type,
        "other_user": {"id": other.id, "username": other.username},
        "last_message": last,
        "unread_count": unread or 0,
        "_sort_key": last.sent_at if last else conv.created_at
    }

async def _load_conversation(session: AsyncSession, conversation_id: int):
    stmt = (
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.members).selectinload(ConversationMember.user))
        .execution_options(populate_existing=True)
    )
    return await session.scalar(stmt)

#------------------------- API ---------------------------------------------

@router.get("/users", response_model=List[ChatUserOut])
async def list_chat_users(
    session: session_dependency,
    current_user= Depends(IsAuthenticated()),
):
    stmt = await _discoverable_stmt(session, current_user)
    result = await session.scalars(stmt.order_by(User.username))
    return result.all()

@router.get("/conversations", response_model=List[ConversationOut])
async def list_conversations(
    session: session_dependency,
    current_user = Depends(IsAuthenticated()),
):
    stmt = (
        select(Conversation)
        .join(ConversationMember, ConversationMember.conversation_id == Conversation.id)
        .where(ConversationMember.user_id == current_user.id)
        .options(selectinload(Conversation.members).selectinload(ConversationMember.user))
    )
    conversations = (await session.scalars(stmt)).all()
    rows = []

    for conv in conversations:
        row = await _conversation_out(session, conv, current_user.id)
        if row:
            rows.append(row)

    rows.sort(key=lambda r: r["_sort_key"], reverse=True)
    return rows

@router.post("/conversations/direct", response_model=ConversationOut)
async def open_direct_conversation(
    payload: OpenDirectRequest,
    session: session_dependency,
    current_user=Depends(IsAuthenticated()),
):
    if payload.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot chat with yourself")

    existing_id = await _find_direct_conversation_id(session, current_user.id, payload.user_id)

    if existing_id is None:
        # Creating a NEW chat: the other person must be visible to me,
        # and I need the start_chat permission (superusers pass automatically).
        discoverable = await _discoverable_stmt(session, current_user)
        target = await session.scalar(discoverable.where(User.id == payload.user_id))
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        if not await check_permission(current_user, "start_chat", session):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to start new chats",
            )

        conv = Conversation(type="direct")
        conv.members = [
            ConversationMember(user_id=current_user.id),
            ConversationMember(user_id=target.id),
        ]
        session.add(conv)
        await session.commit()
        existing_id = conv.id

    conv = await _load_conversation(session, existing_id)
    return await _conversation_out(session, conv, current_user.id)


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageOut])
async def get_messages(
    conversation_id: int,
    session: session_dependency,
    current_user=Depends(IsAuthenticated()),
):
    await _require_member(session, conversation_id, current_user.id)

    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id, Message.expires_at > _now())
        .order_by(Message.sent_at.desc())
        .limit(500)
    )
    newest_first = (await session.scalars(stmt)).all()
    return list(reversed(newest_first))  # oldest first for display


@router.post("/conversations/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    conversation_id: int,
    session: session_dependency,
    current_user=Depends(IsAuthenticated()),
):
    member = await _require_member(session, conversation_id, current_user.id)
    member.last_read_at = _now()
    await session.commit()


# ----------------------------- WebSocket -----------------------------------

async def _user_from_token(token: str, session: AsyncSession):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        return None
    return await session.get(User, user_id)


@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket, token: str = Query(...)):
    # Browsers can't set an Authorization header on a WebSocket, so the JWT
    # arrives as a query parameter and we verify it ourselves.
    async with AsyncSessionLocal() as session:
        user = await _user_from_token(token, session)

    if not user or not user.is_active:
        await websocket.accept()
        await websocket.close(code=4401)  # custom code: "unauthorized", frontend won't retry
        return

    user_id = user.id
    await manager.connect(user_id, websocket)

    try:
        while True:
            try:
                data = await websocket.receive_json()
            except ValueError:
                continue  # ignore malformed (non-JSON) frames

            if not isinstance(data, dict) or data.get("type") != "message":
                continue

            conversation_id = data.get("conversation_id")
            content = (data.get("content") or "").strip()[:4000]
            if not content or not isinstance(conversation_id, int):
                continue

            try:
                async with AsyncSessionLocal() as session:
                    member_ids = (
                        await session.scalars(
                            select(ConversationMember.user_id).where(
                                ConversationMember.conversation_id == conversation_id
                            )
                        )
                    ).all()

                    if user_id not in member_ids:
                        await websocket.send_json(
                            {"type": "error", "detail": "You are not in this conversation"}
                        )
                        continue

                    now = _now()
                    message = Message(
                        conversation_id=conversation_id,
                        sender_id=user_id,
                        content=content,
                        sent_at=now,
                        expires_at=now + MESSAGE_TTL,
                    )
                    session.add(message)
                    await session.commit()
                    await session.refresh(message)
                    out = {
                        "type": "message",
                        "message": MessageOut.model_validate(message).model_dump(mode="json"),
                    }
            except Exception:
                logger.exception("Failed to save chat message")
                await websocket.send_json({"type": "error", "detail": "Message could not be sent"})
                continue
            # Send to everyone in the conversation, including the sender, so all
            # of the sender's open tabs stay in sync.
            for member_id in member_ids:
                await manager.send_to_user(member_id, out)

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id, websocket)