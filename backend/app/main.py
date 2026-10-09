import os
import asyncio
from fastapi import FastAPI
from app.routers import users, chat, messaging
from app.chat_manager import purge_expired_messages
from app.auth import auth
from contextlib import asynccontextmanager
from app.auth.permissions import ensure_crud_permissions, ensure_default_groups
from app.database import engine, Base
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        await ensure_crud_permissions(session)
        await ensure_default_groups(session)

    purge_task = asyncio.create_task(purge_expired_messages())
    yield
    purge_task.cancel()
    
    await engine.dispose()

app = FastAPI(title="Project Backend Learning", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173", os.environ["FRONTEND_URL"]],
    allow_credentials=True,
    allow_methods=["GET", "PUT", "POST", "PATCH", "DELETE"],
    allow_headers=["*"]
)

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(messaging.router)