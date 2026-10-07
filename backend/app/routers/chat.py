from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from typing_extensions import Annotated
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.models import User, Region, VisibilityLevel
from app.schemas import RegionOut, VisibilityUpdate, MyVisibilityOut
from app.auth.permissions import IsAuthenticated

router = APIRouter(prefix="/chat", tags=["chat"])

session_dependency = Annotated[AsyncSession, Depends(get_async_session)]


@router.get("/regions", response_model=List[RegionOut])
async def list_regions(session: session_dependency):
    result = await session.scalars(select(Region))
    return result.all()


@router.get("/me/visibility", response_model=MyVisibilityOut)
async def get_my_visibility(
    session: session_dependency,
    current_user: User = Depends(IsAuthenticated()),
):
    stmt = (
        select(User)
        .options(selectinload(User.regions))
        .where(User.id == current_user.id)
    )
    user = await session.scalar(stmt)
    return {
        "visibility": user.visibility.value,
        "regions": user.regions,
    }


@router.put("/me/visibility", response_model=MyVisibilityOut)
async def update_my_visibility(
    payload: VisibilityUpdate,
    session: session_dependency,
    current_user: User = Depends(IsAuthenticated()),
):
    if payload.visibility not in {v.value for v in VisibilityLevel}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid visibility value",
        )

    stmt = (
        select(User)
        .options(selectinload(User.regions))
        .where(User.id == current_user.id)
    )
    user = await session.scalar(stmt)

    user.visibility = VisibilityLevel(payload.visibility)

    if payload.visibility == "region":
        if not payload.region_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Select at least one region",
            )
        regions_stmt = select(Region).where(Region.id.in_(payload.region_ids))
        regions = (await session.scalars(regions_stmt)).all()
        user.regions = list(regions)
    else:
        # switching to "everyone" or "nobody" clears any selected regions
        user.regions = []

    await session.commit()
    await session.refresh(user)

    return {
        "visibility": user.visibility.value,
        "regions": user.regions,
    }

