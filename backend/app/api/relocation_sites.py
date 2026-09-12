from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db, is_database_available
from app.models import RelocationSite, CapacityStatus
from app.schemas import RelocationSiteResponse, RelocationSiteListResponse
from app.services.fallback_data import fallback_service

router = APIRouter(prefix="/relocation-sites", tags=["relocation-sites"])


@router.get("", response_model=RelocationSiteListResponse)
async def list_relocation_sites(
    capacity_status: Optional[CapacityStatus] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Optional[Session] = Depends(get_db)
):
    if is_database_available() and db:
        query = db.query(RelocationSite)

        if capacity_status:
            if capacity_status == CapacityStatus.SUFFICIENT:
                query = query.filter(RelocationSite.available_capacity > 1000)
            elif capacity_status == CapacityStatus.LIMITED:
                query = query.filter(RelocationSite.available_capacity.between(100, 1000))
            elif capacity_status == CapacityStatus.INSUFFICIENT:
                query = query.filter(RelocationSite.available_capacity < 100)

        total = query.count()
        sites = query.offset(offset).limit(limit).all()
    else:
        capacity_status_val = capacity_status.value if capacity_status else None
        result = fallback_service.get_relocation_sites(
            capacity_status=capacity_status_val,
            limit=limit,
            offset=offset
        )
        sites = result["relocation_sites"]
        total = result["total"]

    return RelocationSiteListResponse(relocation_sites=sites, total=total)


@router.get("/{site_id}", response_model=RelocationSiteResponse)
async def get_relocation_site(site_id: str, db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        site = db.query(RelocationSite).filter(RelocationSite.id == site_id).first()
    else:
        site = fallback_service.get_relocation_site(site_id)

    if not site:
        raise HTTPException(status_code=404, detail="Relocation site not found")
    return site


@router.get("/stats/summary")
async def get_relocation_sites_stats(db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        total = db.query(RelocationSite).count()
        total_capacity = db.query(RelocationSite).with_entities(
            __import__('sqlalchemy').func.sum(RelocationSite.total_capacity)
        ).scalar() or 0
        available_capacity = db.query(RelocationSite).with_entities(
            __import__('sqlalchemy').func.sum(RelocationSite.available_capacity)
        ).scalar() or 0

        return {
            "total_sites": total,
            "total_capacity": total_capacity,
            "available_capacity": available_capacity,
        }
    else:
        return fallback_service.get_relocation_sites_stats()