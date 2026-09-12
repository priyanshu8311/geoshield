from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db, is_database_available
from app.models import RelocationAssessment, PriorityLevel
from app.schemas import RelocationAssessmentResponse, RelocationAssessmentListResponse
from app.services.fallback_data import fallback_service

router = APIRouter(prefix="/relocation-assessments", tags=["relocation-assessments"])


@router.get("", response_model=RelocationAssessmentListResponse)
async def list_relocation_assessments(
    priority_level: Optional[PriorityLevel] = Query(None),
    habitation_id: Optional[str] = Query(None),
    relocation_site_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Optional[Session] = Depends(get_db)
):
    if is_database_available() and db:
        query = db.query(RelocationAssessment)

        if priority_level:
            query = query.filter(RelocationAssessment.priority_level == priority_level)
        if habitation_id:
            query = query.filter(RelocationAssessment.habitation_id == habitation_id)
        if relocation_site_id:
            query = query.filter(RelocationAssessment.relocation_site_id == relocation_site_id)

        total = query.count()
        assessments = query.offset(offset).limit(limit).all()
    else:
        priority_level_val = priority_level.value if priority_level else None
        result = fallback_service.get_relocation_assessments(
            priority_level=priority_level_val,
            habitation_id=habitation_id,
            relocation_site_id=relocation_site_id,
            limit=limit,
            offset=offset
        )
        assessments = result["relocation_assessments"]
        total = result["total"]

    return RelocationAssessmentListResponse(relocation_assessments=assessments, total=total)


@router.get("/{assessment_id}", response_model=RelocationAssessmentResponse)
async def get_relocation_assessment(assessment_id: int, db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        assessment = db.query(RelocationAssessment).filter(RelocationAssessment.id == assessment_id).first()
    else:
        assessment = fallback_service.get_relocation_assessment(assessment_id)

    if not assessment:
        raise HTTPException(status_code=404, detail="Relocation assessment not found")
    return assessment


@router.get("/habitation/{habitation_id}", response_model=RelocationAssessmentListResponse)
async def get_relocation_assessments_by_habitation(habitation_id: str, db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        assessments = db.query(RelocationAssessment).filter(RelocationAssessment.habitation_id == habitation_id).all()
    else:
        assessments = fallback_service.get_relocation_assessments_by_habitation(habitation_id)

    return RelocationAssessmentListResponse(relocation_assessments=assessments, total=len(assessments))