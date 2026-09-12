from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db, is_database_available
from app.models import Habitation, RiskLevel, HazardType, PriorityLevel
from app.schemas import HabitationResponse, HabitationListResponse
from app.services.fallback_data import fallback_service

router = APIRouter(prefix="/habitations", tags=["habitations"])


@router.get("", response_model=HabitationListResponse)
async def list_habitations(
    risk_level: Optional[RiskLevel] = Query(None),
    hazard_type: Optional[HazardType] = Query(None),
    relocation_priority: Optional[PriorityLevel] = Query(None),
    district: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Optional[Session] = Depends(get_db)
):
    if is_database_available() and db:
        query = db.query(Habitation)

        if risk_level:
            query = query.filter(Habitation.risk_level == risk_level)
        if hazard_type:
            query = query.filter(Habitation.hazard_type == hazard_type)
        if relocation_priority:
            query = query.filter(Habitation.relocation_priority == relocation_priority)
        if district:
            query = query.filter(Habitation.district.ilike(f"%{district}%"))

        total = query.count()
        habitations = query.offset(offset).limit(limit).all()
    else:
        risk_level_val = risk_level.value if risk_level else None
        hazard_type_val = hazard_type.value if hazard_type else None
        relocation_priority_val = relocation_priority.value if relocation_priority else None
        result = fallback_service.get_habitations(
            risk_level=risk_level_val,
            hazard_type=hazard_type_val,
            relocation_priority=relocation_priority_val,
            district=district,
            limit=limit,
            offset=offset
        )
        habitations = result["habitations"]
        total = result["total"]

    return HabitationListResponse(habitations=habitations, total=total)


@router.get("/{habitation_id}", response_model=HabitationResponse)
async def get_habitation(habitation_id: str, db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        habitation = db.query(Habitation).filter(Habitation.id == habitation_id).first()
    else:
        habitation = fallback_service.get_habitation(habitation_id)

    if not habitation:
        raise HTTPException(status_code=404, detail="Habitation not found")
    return habitation


@router.get("/stats/summary")
async def get_habitation_stats(db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        total = db.query(Habitation).count()
        by_risk = {}
        for level in RiskLevel:
            count = db.query(Habitation).filter(Habitation.risk_level == level).count()
            by_risk[level.value] = count

        by_hazard = {}
        for hazard in HazardType:
            count = db.query(Habitation).filter(Habitation.hazard_type == hazard).count()
            by_hazard[hazard.value] = count

        total_population = db.query(Habitation).with_entities(
            __import__('sqlalchemy').func.sum(Habitation.population)
        ).scalar() or 0

        high_risk = db.query(Habitation).filter(Habitation.risk_level == RiskLevel.HIGH).count()
        critical_risk = db.query(Habitation).filter(Habitation.risk_level == RiskLevel.CRITICAL).count()

        return {
            "total_habitations": total,
            "habitations_by_risk": by_risk,
            "habitations_by_hazard": by_hazard,
            "total_population": total_population,
            "high_risk_count": high_risk,
            "critical_risk_count": critical_risk,
        }
    else:
        return fallback_service.get_habitation_stats()