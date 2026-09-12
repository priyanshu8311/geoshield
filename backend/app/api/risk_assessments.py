from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db, is_database_available
from app.models import RiskAssessment, RiskLevel
from app.schemas import (
    RiskAssessmentResponse,
    RiskAssessmentListResponse,
    RiskAssessmentDetailResponse,
    RiskDistributionResponse,
    RiskStatisticsResponse,
    RiskComponentResponse,
)
from app.services.fallback_data import fallback_service
from app.algorithms.risk_engine import (
    assess_all_habitations,
    get_risk_distribution as engine_get_risk_distribution,
    get_risk_statistics as engine_get_risk_statistics,
    assess_habitation_risk,
    RiskWeights,
    RiskThresholds,
    DEFAULT_WEIGHTS,
    DEFAULT_THRESHOLDS,
)

router = APIRouter(prefix="/risk-assessments", tags=["risk-assessments"])


def _get_all_data():
    """Get all data needed for risk assessment."""
    habitations_result = fallback_service.get_habitations(limit=500)
    hazards_result = fallback_service.get_hazards(limit=500)
    infrastructure_result = fallback_service.get_infrastructure(limit=500)
    return habitations_result["habitations"], hazards_result["hazards"], infrastructure_result["infrastructure"]


@router.get("", response_model=RiskAssessmentListResponse)
async def list_risk_assessments(
    risk_level: Optional[RiskLevel] = Query(None),
    habitation_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Optional[Session] = Depends(get_db)
):
    if is_database_available() and db:
        query = db.query(RiskAssessment)

        if risk_level:
            query = query.filter(RiskAssessment.risk_level == risk_level)
        if habitation_id:
            query = query.filter(RiskAssessment.habitation_id == habitation_id)

        total = query.count()
        assessments = query.offset(offset).limit(limit).all()
    else:
        risk_level_val = risk_level.value if risk_level else None
        result = fallback_service.get_risk_assessments(
            risk_level=risk_level_val,
            habitation_id=habitation_id,
            limit=limit,
            offset=offset
        )
        assessments = result["risk_assessments"]
        total = result["total"]

    return RiskAssessmentListResponse(risk_assessments=assessments, total=total)


@router.get("/distribution", response_model=RiskDistributionResponse)
async def get_risk_distribution(db: Optional[Session] = Depends(get_db)):
    """Get risk level distribution across all habitations."""
    habitations, hazards, infrastructure = _get_all_data()
    results = assess_all_habitations(habitations, hazards, infrastructure)
    distribution = engine_get_risk_distribution(results)
    return RiskDistributionResponse(**distribution)


@router.get("/statistics", response_model=RiskStatisticsResponse)
async def get_risk_statistics(db: Optional[Session] = Depends(get_db)):
    """Get aggregate risk statistics."""
    habitations, hazards, infrastructure = _get_all_data()
    results = assess_all_habitations(habitations, hazards, infrastructure)
    stats = engine_get_risk_statistics(results)
    return RiskStatisticsResponse(**stats)


@router.get("/detail/{habitation_id}", response_model=RiskAssessmentDetailResponse)
async def get_risk_assessment_detail(habitation_id: str, db: Optional[Session] = Depends(get_db)):
    """Get detailed risk assessment with component breakdown for a habitation."""
    habitations, hazards, infrastructure = _get_all_data()
    
    habitation = next((h for h in habitations if h.get("id") == habitation_id), None)
    if not habitation:
        raise HTTPException(status_code=404, detail="Habitation not found")
    
    infra = next((i for i in infrastructure if i.get("habitation_id") == habitation_id), None)
    
    result = assess_habitation_risk(habitation, hazards, infra)
    
    return RiskAssessmentDetailResponse(
        habitation_id=result.habitation_id,
        habitation_name=result.habitation_name,
        exposure=RiskComponentResponse(
            score=result.exposure.score,
            factors=result.exposure.factors,
            raw_data=result.exposure.raw_data
        ),
        vulnerability=RiskComponentResponse(
            score=result.vulnerability.score,
            factors=result.vulnerability.factors,
            raw_data=result.vulnerability.raw_data
        ),
        coping_capacity=RiskComponentResponse(
            score=result.coping_capacity.score,
            factors=result.coping_capacity.factors,
            raw_data=result.coping_capacity.raw_data
        ),
        overall_score=result.overall_score,
        risk_level=result.risk_level,
        primary_hazard=result.primary_hazard,
        additional_hazards=result.additional_hazards,
        contributing_factors=result.contributing_factors,
        assessment_version=result.assessment_version,
        weights_used={
            "exposure": result.weights_used.exposure,
            "vulnerability": result.weights_used.vulnerability,
            "coping_capacity": result.weights_used.coping_capacity
        },
        thresholds_used={
            "low_max": result.thresholds_used.low_max,
            "moderate_max": result.thresholds_used.moderate_max,
            "elevated_max": result.thresholds_used.elevated_max,
            "high_max": result.thresholds_used.high_max,
            "critical_min": result.thresholds_used.critical_min
        }
    )


@router.get("/all-detailed", response_model=List[RiskAssessmentDetailResponse])
async def get_all_risk_assessments_detailed(db: Optional[Session] = Depends(get_db)):
    """Get detailed risk assessments for all habitations."""
    habitations, hazards, infrastructure = _get_all_data()
    results = assess_all_habitations(habitations, hazards, infrastructure)
    
    return [
        RiskAssessmentDetailResponse(
            habitation_id=r.habitation_id,
            habitation_name=r.habitation_name,
            exposure=RiskComponentResponse(
                score=r.exposure.score,
                factors=r.exposure.factors,
                raw_data=r.exposure.raw_data
            ),
            vulnerability=RiskComponentResponse(
                score=r.vulnerability.score,
                factors=r.vulnerability.factors,
                raw_data=r.vulnerability.raw_data
            ),
            coping_capacity=RiskComponentResponse(
                score=r.coping_capacity.score,
                factors=r.coping_capacity.factors,
                raw_data=r.coping_capacity.raw_data
            ),
            overall_score=r.overall_score,
            risk_level=r.risk_level,
            primary_hazard=r.primary_hazard,
            additional_hazards=r.additional_hazards,
            contributing_factors=r.contributing_factors,
            assessment_version=r.assessment_version,
            weights_used={
                "exposure": r.weights_used.exposure,
                "vulnerability": r.weights_used.vulnerability,
                "coping_capacity": r.weights_used.coping_capacity
            },
            thresholds_used={
                "low_max": r.thresholds_used.low_max,
                "moderate_max": r.thresholds_used.moderate_max,
                "elevated_max": r.thresholds_used.elevated_max,
                "high_max": r.thresholds_used.high_max,
                "critical_min": r.thresholds_used.critical_min
            }
        )
        for r in results
    ]


@router.get("/by-id/{assessment_id}", response_model=RiskAssessmentResponse)
async def get_risk_assessment(assessment_id: int = Path(..., ge=1), db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        assessment = db.query(RiskAssessment).filter(RiskAssessment.id == assessment_id).first()
    else:
        assessment = fallback_service.get_risk_assessment(assessment_id)

    if not assessment:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    return assessment


@router.get("/habitation/{habitation_id}", response_model=RiskAssessmentResponse)
async def get_risk_assessment_by_habitation(habitation_id: str, db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        assessment = db.query(RiskAssessment).filter(RiskAssessment.habitation_id == habitation_id).first()
    else:
        assessment = fallback_service.get_risk_assessment_by_habitation(habitation_id)

    if not assessment:
        raise HTTPException(status_code=404, detail="Risk assessment not found for habitation")
    return assessment