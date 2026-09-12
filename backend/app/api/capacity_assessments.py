from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db, is_database_available
from app.models import CapacityAssessment, CapacityStatus, RelocationSite
from app.schemas import (
    CapacityAssessmentResponse,
    CapacityAssessmentListResponse,
    CapacityStatisticsResponse,
)
from app.services.fallback_data import fallback_service
from app.algorithms import (
    assess_relocation_site_capacity,
    assess_all_relocation_sites,
    get_capacity_statistics as algo_get_capacity_statistics,
    CapacityStatus as AlgoCapacityStatus,
    InfrastructureStatus,
)

router = APIRouter(prefix="/capacity-assessments", tags=["capacity-assessments"])


def _map_algo_status_to_model(status: AlgoCapacityStatus) -> CapacityStatus:
    """Map algorithm CapacityStatus to model CapacityStatus."""
    mapping = {
        AlgoCapacityStatus.ADEQUATE: CapacityStatus.ADEQUATE,
        AlgoCapacityStatus.LIMITED: CapacityStatus.LIMITED,
        AlgoCapacityStatus.STRESSED: CapacityStatus.STRESSED,
        AlgoCapacityStatus.INSUFFICIENT: CapacityStatus.INSUFFICIENT,
    }
    return mapping.get(status, CapacityStatus.LIMITED)


def _map_infra_status_to_model(status: InfrastructureStatus) -> CapacityStatus:
    """Map algorithm InfrastructureStatus to model CapacityStatus."""
    mapping = {
        InfrastructureStatus.SUFFICIENT: CapacityStatus.ADEQUATE,
        InfrastructureStatus.LIMITED: CapacityStatus.LIMITED,
        InfrastructureStatus.INSUFFICIENT: CapacityStatus.INSUFFICIENT,
    }
    return mapping.get(status, CapacityStatus.LIMITED)


def _convert_assessment_result(result) -> CapacityAssessmentResponse:
    """Convert CapacityAssessmentResult to CapacityAssessmentResponse."""
    from app.schemas import InfrastructureAssessmentDetail
    from datetime import datetime
    
    infra_details = [
        InfrastructureAssessmentDetail(
            name=ia.name,
            status=_map_infra_status_to_model(ia.status),
            score=ia.score,
            capacity=ia.capacity,
            demand=ia.demand,
            factors=ia.factors,
        )
        for ia in result.infrastructure_assessments
    ]
    
    return CapacityAssessmentResponse(
        relocation_site_id=result.site_id,
        site_name=result.site_name,
        capacity_score=result.capacity_score,
        capacity_status=_map_algo_status_to_model(result.capacity_status),
        total_capacity=result.total_capacity,
        current_population=result.current_population,
        available_capacity=result.available_capacity,
        utilization_percent=result.utilization_percent,
        water_status=_map_infra_status_to_model(
            next(ia.status for ia in result.infrastructure_assessments if ia.name == "Water")
        ),
        housing_status=_map_infra_status_to_model(
            next(ia.status for ia in result.infrastructure_assessments if ia.name == "Housing")
        ),
        healthcare_status=_map_infra_status_to_model(
            next(ia.status for ia in result.infrastructure_assessments if ia.name == "Healthcare")
        ),
        school_status=_map_infra_status_to_model(
            next(ia.status for ia in result.infrastructure_assessments if ia.name == "School")
        ),
        road_status=_map_infra_status_to_model(
            next(ia.status for ia in result.infrastructure_assessments if ia.name == "Road Access")
        ),
        electricity_status=_map_infra_status_to_model(
            next(ia.status for ia in result.infrastructure_assessments if ia.name == "Electricity")
        ),
        sanitation_status=_map_infra_status_to_model(
            next(ia.status for ia in result.infrastructure_assessments if ia.name == "Sanitation")
        ),
        environmental_status=_map_infra_status_to_model(
            next(ia.status for ia in result.infrastructure_assessments if ia.name == "Environmental Status")
        ),
        limiting_factors=result.limiting_factors,
        infrastructure_assessments=infra_details,
        assessment_date=datetime.utcnow(),
    )


@router.get("", response_model=CapacityAssessmentListResponse)
async def list_capacity_assessments(
    capacity_status: Optional[CapacityStatus] = Query(None),
    relocation_site_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Optional[Session] = Depends(get_db)
):
    if is_database_available() and db:
        query = db.query(CapacityAssessment)

        if capacity_status:
            query = query.filter(CapacityAssessment.capacity_status == capacity_status)
        if relocation_site_id:
            query = query.filter(CapacityAssessment.relocation_site_id == relocation_site_id)

        total = query.count()
        assessments = query.offset(offset).limit(limit).all()
    else:
        # Compute assessments using the capacity engine
        sites = fallback_service.relocation_sites
        if relocation_site_id:
            sites = [s for s in sites if s["id"] == relocation_site_id]
        
        all_results = assess_all_relocation_sites(sites)
        
        # Filter by capacity_status if provided
        if capacity_status:
            algo_status_map = {
                CapacityStatus.ADEQUATE: AlgoCapacityStatus.ADEQUATE,
                CapacityStatus.LIMITED: AlgoCapacityStatus.LIMITED,
                CapacityStatus.STRESSED: AlgoCapacityStatus.STRESSED,
                CapacityStatus.INSUFFICIENT: AlgoCapacityStatus.INSUFFICIENT,
            }
            target_algo_status = algo_status_map.get(capacity_status)
            if target_algo_status:
                all_results = [r for r in all_results if r.capacity_status == target_algo_status]
        
        total = len(all_results)
        paginated_results = all_results[offset:offset+limit]
        assessments = [_convert_assessment_result(r) for r in paginated_results]

    return CapacityAssessmentListResponse(capacity_assessments=assessments, total=total)


@router.get("/{assessment_id}", response_model=CapacityAssessmentResponse)
async def get_capacity_assessment(assessment_id: int, db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        assessment = db.query(CapacityAssessment).filter(CapacityAssessment.id == assessment_id).first()
    else:
        assessment = fallback_service.get_capacity_assessment(assessment_id)

    if not assessment:
        raise HTTPException(status_code=404, detail="Capacity assessment not found")
    return assessment


@router.get("/site/{site_id}", response_model=CapacityAssessmentResponse)
async def get_capacity_assessment_by_site(site_id: str, db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        assessment = db.query(CapacityAssessment).filter(CapacityAssessment.relocation_site_id == site_id).first()
    else:
        # Compute assessment using the capacity engine
        site = fallback_service.get_relocation_site(site_id)
        if not site:
            raise HTTPException(status_code=404, detail="Capacity assessment not found for site")
        
        result = assess_relocation_site_capacity(site)
        return _convert_assessment_result(result)

    if not assessment:
        raise HTTPException(status_code=404, detail="Capacity assessment not found for site")
    return assessment


@router.get("/statistics/summary", response_model=CapacityStatisticsResponse)
async def get_capacity_statistics(db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        # For database mode, we'd need to compute from stored assessments
        # For now, fall back to computed statistics
        sites = db.query(RelocationSite).all()
        site_dicts = [
            {
                "id": s.id,
                "name": s.name,
                "total_capacity": s.total_capacity,
                "current_population": s.current_population,
                "available_capacity": s.available_capacity,
                "water_capacity": s.water_capacity,
                "housing_capacity": s.housing_capacity,
                "healthcare_capacity": s.healthcare_capacity,
                "school_capacity": s.school_capacity,
                "road_connectivity": s.road_connectivity,
                "electricity": s.electricity,
                "sanitation": s.sanitation,
                "environmental_status": s.environmental_status,
            }
            for s in sites
        ]
        results = assess_all_relocation_sites(site_dicts)
        stats = algo_get_capacity_statistics(results)
    else:
        sites = fallback_service.relocation_sites
        results = assess_all_relocation_sites(sites)
        stats = algo_get_capacity_statistics(results)

    return CapacityStatisticsResponse(**stats)