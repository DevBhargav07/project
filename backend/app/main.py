from fastapi import FastAPI
from app.routers import users
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

    yield
    await engine.dispose()

app = FastAPI(title="Project Backend Learning", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(users.router)
app.include_router(auth.router)