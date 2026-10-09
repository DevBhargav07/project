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

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

allowed_origins = [
    "http://localhost:5173",
    "http://localhost:4173",
]

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

if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(messaging.router)