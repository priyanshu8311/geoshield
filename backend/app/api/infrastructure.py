from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db, is_database_available
from app.models import Infrastructure
from app.schemas import InfrastructureResponse, InfrastructureListResponse
from app.services.fallback_data import fallback_service

router = APIRouter(prefix="/infrastructure", tags=["infrastructure"])


@router.get("", response_model=InfrastructureListResponse)
async def list_infrastructure(
    habitation_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Optional[Session] = Depends(get_db)
):
    if is_database_available() and db:
        query = db.query(Infrastructure)

        if habitation_id:
            query = query.filter(Infrastructure.habitation_id == habitation_id)

        total = query.count()
        infrastructure = query.offset(offset).limit(limit).all()
    else:
        result = fallback_service.get_infrastructure(
            habitation_id=habitation_id,
            limit=limit,
            offset=offset
        )
        infrastructure = result["infrastructure"]
        total = result["total"]

    return InfrastructureListResponse(infrastructure=infrastructure, total=total)


@router.get("/{habitation_id}", response_model=InfrastructureResponse)
async def get_infrastructure(habitation_id: str, db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        infra = db.query(Infrastructure).filter(Infrastructure.habitation_id == habitation_id).first()
    else:
        infra = fallback_service.get_infrastructure_by_habitation(habitation_id)

    if not infra:
        raise HTTPException(status_code=404, detail="Infrastructure not found for habitation")
    return infra