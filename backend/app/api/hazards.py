from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db, is_database_available
from app.models import Hazard, HazardType
from app.schemas import HazardResponse, HazardListResponse
from app.services.fallback_data import fallback_service

router = APIRouter(prefix="/hazards", tags=["hazards"])


@router.get("", response_model=HazardListResponse)
async def list_hazards(
    hazard_type: Optional[HazardType] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Optional[Session] = Depends(get_db)
):
    if is_database_available() and db:
        query = db.query(Hazard)

        if hazard_type:
            query = query.filter(Hazard.hazard_type == hazard_type)

        total = query.count()
        hazards = query.offset(offset).limit(limit).all()
    else:
        hazard_type_val = hazard_type.value if hazard_type else None
        result = fallback_service.get_hazards(
            hazard_type=hazard_type_val,
            limit=limit,
            offset=offset
        )
        hazards = result["hazards"]
        total = result["total"]

    return HazardListResponse(hazards=hazards, total=total)


@router.get("/{hazard_id}", response_model=HazardResponse)
async def get_hazard(hazard_id: str, db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        hazard = db.query(Hazard).filter(Hazard.id == hazard_id).first()
    else:
        hazard = fallback_service.get_hazard(hazard_id)

    if not hazard:
        raise HTTPException(status_code=404, detail="Hazard not found")
    return hazard