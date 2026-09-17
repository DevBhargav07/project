from fastapi import FastAPI
from app.routers import users
from contextlib import asynccontextmanager
from app.auth.permissions import ensure_crud_permissions
from app.database import engine, Base
from app.models import (Base, User, Permission, Group, UserGroup, GroupPermission, UserPermission)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        await ensure_crud_permissions(session)

    yield
    await engine.dispose()

app = FastAPI(title="Project Backend Learning", lifespan=lifespan)

app.include_router(users.router)