from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db, is_database_available
from app.models import PriorityLevel, Habitation, Infrastructure, RelocationSite, CapacityAssessment
from app.schemas import (
    RelocationPriorityResponse,
    RelocationPriorityListResponse,
    RelocationRecommendationResponse,
    PriorityStatisticsResponse,
    RiskLevel,
    SiteSuitability,
    SiteRecommendationResponse,
)
from app.services.fallback_data import fallback_service
from app.algorithms import (
    assess_relocation_priority,
    get_all_recommendations,
    assess_all_priorities,
    get_priority_statistics as algo_get_priority_statistics,
    PriorityLevel as AlgoPriorityLevel,
)

router = APIRouter(prefix="/relocation-priority", tags=["relocation-priority"])


def _map_algo_priority_to_model(level: AlgoPriorityLevel) -> PriorityLevel:
    """Map algorithm PriorityLevel to model PriorityLevel."""
    mapping = {
        AlgoPriorityLevel.P1: PriorityLevel.P1,
        AlgoPriorityLevel.P2: PriorityLevel.P2,
        AlgoPriorityLevel.P3: PriorityLevel.P3,
        AlgoPriorityLevel.P4: PriorityLevel.P4,
    }
    return mapping.get(level, PriorityLevel.P4)


def _convert_priority_result(result) -> RelocationPriorityResponse:
    """Convert RelocationPriorityResult to RelocationPriorityResponse."""
    from app.schemas import RiskLevel
    from datetime import datetime
    
    return RelocationPriorityResponse(
        habitation_id=result.habitation_id,
        habitation_name=result.habitation_name,
        risk_score=result.risk_score,
        risk_level=RiskLevel(result.risk_level),
        population=result.population,
        exposure_score=result.exposure_score,
        vulnerability_score=result.vulnerability_score,
        hazard_score=result.hazard_score,
        accessibility_factor=result.accessibility_factor,
        relocation_priority_score=result.relocation_priority_score,
        priority_level=_map_algo_priority_to_model(result.priority_level),
        priority_reason=result.priority_reason,
        contributing_factors=result.contributing_factors,
    )


def _convert_recommendation_result(result) -> RelocationRecommendationResponse:
    """Convert RelocationRecommendationResult to RelocationRecommendationResponse."""
    from app.schemas import RiskLevel, SiteSuitability, SiteRecommendationResponse, CapacityStatus
    
    # Map old capacity status values to new ones
    def map_capacity_status(status: str) -> str:
        mapping = {
            "SUFFICIENT": "ADEQUATE",
            "LIMITED": "LIMITED",
            "STRESSED": "STRESSED",
            "INSUFFICIENT": "INSUFFICIENT",
        }
        return mapping.get(status, "ADEQUATE")
    
    recommendations = [
        SiteRecommendationResponse(
            relocation_site_id=r.relocation_site_id,
            site_name=r.site_name,
            match_score=r.match_score,
            suitability=SiteSuitability(r.suitability.value),
            available_capacity=r.available_capacity,
            utilization_percent=r.utilization_percent,
            capacity_status=CapacityStatus(map_capacity_status(r.capacity_status)),
            capacity_score=r.capacity_score,
            infrastructure_score=r.infrastructure_score,
            environmental_score=r.environmental_score,
            accessibility_score=r.accessibility_score,
            safety_score=r.safety_score,
            recommendation_reasons=r.recommendation_reasons,
            limiting_factors=r.limiting_factors,
            distance_km=r.distance_km,
        )
        for r in result.recommendations
    ]
    
    return RelocationRecommendationResponse(
        habitation_id=result.habitation_id,
        habitation_name=result.habitation_name,
        risk_score=result.risk_score,
        risk_level=RiskLevel(result.risk_level),
        population=result.population,
        exposure_score=result.exposure_score,
        vulnerability_score=result.vulnerability_score,
        hazard_score=result.hazard_score,
        accessibility_factor=result.accessibility_factor,
        priority_score=result.priority_score,
        priority_level=_map_algo_priority_to_model(result.priority_level),
        priority_reason=result.priority_reason,
        recommendations=recommendations,
    )


@router.get("/statistics", response_model=PriorityStatisticsResponse)
async def get_priority_statistics(db: Optional[Session] = Depends(get_db)):
    """Get aggregate relocation priority statistics."""
    if is_database_available() and db:
        # For database mode, we'd need to compute from stored assessments
        # For now, fall back to computed statistics
        habitations = db.query(Habitation).all()
        hab_dicts = [
            {
                "id": h.id,
                "name": h.name,
                "population": h.population,
                "latitude": h.latitude,
                "longitude": h.longitude,
                "hazard_type": h.hazard_type.value if hasattr(h.hazard_type, 'value') else h.hazard_type,
                "hazard_score": h.hazard_score,
                "exposure_score": h.exposure_score,
                "vulnerability_score": h.vulnerability_score,
                "risk_score": h.risk_score,
                "risk_level": h.risk_level.value if hasattr(h.risk_level, 'value') else h.risk_level,
            }
            for h in habitations
        ]
        infrastructure = db.query(Infrastructure).all()
        infra_dicts = [
            {
                "habitation_id": i.habitation_id,
                "road_connectivity": i.road_connectivity,
                "emergency_response_time": i.emergency_response_time,
            }
            for i in infrastructure
        ]
        results = assess_all_priorities(hab_dicts, infra_dicts)
        stats = algo_get_priority_statistics(results)
    else:
        habitations = fallback_service.habitations
        infrastructure = fallback_service.infrastructure
        results = assess_all_priorities(habitations, infrastructure)
        stats = algo_get_priority_statistics(results)

    return PriorityStatisticsResponse(**stats)


@router.get("/recommendations", response_model=list[RelocationRecommendationResponse])
async def get_all_recommendations_endpoint(db: Optional[Session] = Depends(get_db)):
    """Get relocation recommendations for all habitations."""
    if is_database_available() and db:
        # For database mode, we'd need to compute from stored data
        # For now, fall back to computed recommendations
        habitations = db.query(Habitation).all()
        hab_dicts = [
            {
                "id": h.id,
                "name": h.name,
                "population": h.population,
                "latitude": h.latitude,
                "longitude": h.longitude,
                "hazard_type": h.hazard_type.value if hasattr(h.hazard_type, 'value') else h.hazard_type,
                "hazard_score": h.hazard_score,
                "exposure_score": h.exposure_score,
                "vulnerability_score": h.vulnerability_score,
                "risk_score": h.risk_score,
                "risk_level": h.risk_level.value if hasattr(h.risk_level, 'value') else h.risk_level,
            }
            for h in habitations
        ]
        sites = db.query(RelocationSite).all()
        site_dicts = [
            {
                "id": s.id,
                "name": s.name,
                "latitude": s.latitude,
                "longitude": s.longitude,
                "total_capacity": s.total_capacity,
                "current_population": s.current_population,
                "available_capacity": s.available_capacity,
                "utilization_percent": s.utilization_percent if hasattr(s, 'utilization_percent') else (s.current_population / s.total_capacity * 100 if s.total_capacity > 0 else 0),
                "capacity_status": s.capacity_status.value if hasattr(s.capacity_status, 'value') else s.capacity_status,
                "road_connectivity": s.road_connectivity,
            }
            for s in sites
        ]
        capacity_assessments = db.query(CapacityAssessment).all()
        cap_dict = {}
        for c in capacity_assessments:
            cap_dict[c.relocation_site_id] = {
                "capacity_status": c.capacity_status.value if hasattr(c.capacity_status, 'value') else c.capacity_status,
                "capacity_score": c.capacity_score,
                "water_status": c.water_status.value if hasattr(c.water_status, 'value') else c.water_status,
                "housing_status": c.housing_status.value if hasattr(c.housing_status, 'value') else c.housing_status,
                "healthcare_status": c.healthcare_status.value if hasattr(c.healthcare_status, 'value') else c.healthcare_status,
                "school_status": c.school_status.value if hasattr(c.school_status, 'value') else c.school_status,
                "road_status": c.road_status.value if hasattr(c.road_status, 'value') else c.road_status,
                "electricity_status": c.electricity_status.value if hasattr(c.electricity_status, 'value') else c.electricity_status,
                "sanitation_status": c.sanitation_status.value if hasattr(c.sanitation_status, 'value') else c.sanitation_status,
                "environmental_status": c.environmental_status.value if hasattr(c.environmental_status, 'value') else c.environmental_status,
            }
    else:
        hab_dicts = fallback_service.habitations
        site_dicts = fallback_service.relocation_sites
        cap_dict = {}
        for c in fallback_service.capacity_assessments:
            cap_dict[c["relocation_site_id"]] = c
    
    all_recommendations = []
    for hab in hab_dicts:
        result = get_all_recommendations(hab, site_dicts, cap_dict)
        all_recommendations.append(_convert_recommendation_result(result))
    
    return all_recommendations


@router.get("", response_model=RelocationPriorityListResponse)
async def list_relocation_priorities(
    priority_level: Optional[PriorityLevel] = Query(None),
    risk_level: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Optional[Session] = Depends(get_db)
):
    """List all relocation priorities with optional filtering."""
    if is_database_available() and db:
        habitations = db.query(Habitation).all()
        hab_dicts = [
            {
                "id": h.id,
                "name": h.name,
                "population": h.population,
                "latitude": h.latitude,
                "longitude": h.longitude,
                "hazard_type": h.hazard_type.value if hasattr(h.hazard_type, 'value') else h.hazard_type,
                "hazard_score": h.hazard_score,
                "exposure_score": h.exposure_score,
                "vulnerability_score": h.vulnerability_score,
                "risk_score": h.risk_score,
                "risk_level": h.risk_level.value if hasattr(h.risk_level, 'value') else h.risk_level,
            }
            for h in habitations
        ]
        infrastructure = db.query(Infrastructure).all()
        infra_dicts = [
            {
                "habitation_id": i.habitation_id,
                "road_connectivity": i.road_connectivity,
                "emergency_response_time": i.emergency_response_time,
            }
            for i in infrastructure
        ]
        results = assess_all_priorities(hab_dicts, infra_dicts)
    else:
        habitations = fallback_service.habitations
        infrastructure = fallback_service.infrastructure
        results = assess_all_priorities(habitations, infrastructure)
    
    # Filter by priority_level if provided
    if priority_level:
        algo_map = {
            PriorityLevel.P1: AlgoPriorityLevel.P1,
            PriorityLevel.P2: AlgoPriorityLevel.P2,
            PriorityLevel.P3: AlgoPriorityLevel.P3,
            PriorityLevel.P4: AlgoPriorityLevel.P4,
        }
        target = algo_map.get(priority_level)
        if target:
            results = [r for r in results if r.priority_level == target]
    
    # Filter by risk_level if provided
    if risk_level:
        results = [r for r in results if r.risk_level == risk_level]
    
    total = len(results)
    paginated = results[offset:offset+limit]
    assessments = [_convert_priority_result(r) for r in paginated]
    
    return RelocationPriorityListResponse(relocation_priorities=assessments, total=total)


@router.get("/{habitation_id}", response_model=RelocationPriorityResponse)
async def get_relocation_priority(habitation_id: str, db: Optional[Session] = Depends(get_db)):
    """Get relocation priority for a specific habitation."""
    if is_database_available() and db:
        hab = db.query(Habitation).filter(Habitation.id == habitation_id).first()
        if not hab:
            raise HTTPException(status_code=404, detail="Habitation not found")
        
        hab_dict = {
            "id": hab.id,
            "name": hab.name,
            "population": hab.population,
            "latitude": hab.latitude,
            "longitude": hab.longitude,
            "hazard_type": hab.hazard_type.value if hasattr(hab.hazard_type, 'value') else hab.hazard_type,
            "hazard_score": hab.hazard_score,
            "exposure_score": hab.exposure_score,
            "vulnerability_score": hab.vulnerability_score,
            "risk_score": hab.risk_score,
            "risk_level": hab.risk_level.value if hasattr(hab.risk_level, 'value') else hab.risk_level,
        }
        
        infra = db.query(Infrastructure).filter(Infrastructure.habitation_id == habitation_id).first()
        infra_dict = None
        if infra:
            infra_dict = {
                "habitation_id": infra.habitation_id,
                "road_connectivity": infra.road_connectivity,
                "emergency_response_time": infra.emergency_response_time,
            }
        
        result = assess_relocation_priority(hab_dict, infra_dict)
    else:
        hab = fallback_service.get_habitation(habitation_id)
        if not hab:
            raise HTTPException(status_code=404, detail="Habitation not found")
        
        infra = fallback_service.get_infrastructure_by_habitation(habitation_id)
        result = assess_relocation_priority(hab, infra)
    
    return _convert_priority_result(result)


@router.get("/{habitation_id}/recommendations", response_model=RelocationRecommendationResponse)
async def get_relocation_recommendations(habitation_id: str, db: Optional[Session] = Depends(get_db)):
    """Get relocation site recommendations for a specific habitation."""
    if is_database_available() and db:
        hab = db.query(Habitation).filter(Habitation.id == habitation_id).first()
        if not hab:
            raise HTTPException(status_code=404, detail="Habitation not found")
        
        hab_dict = {
            "id": hab.id,
            "name": hab.name,
            "population": hab.population,
            "latitude": hab.latitude,
            "longitude": hab.longitude,
            "hazard_type": hab.hazard_type.value if hasattr(hab.hazard_type, 'value') else hab.hazard_type,
            "hazard_score": hab.hazard_score,
            "exposure_score": hab.exposure_score,
            "vulnerability_score": hab.vulnerability_score,
            "risk_score": hab.risk_score,
            "risk_level": hab.risk_level.value if hasattr(hab.risk_level, 'value') else hab.risk_level,
        }
        
        sites = db.query(RelocationSite).all()
        site_dicts = [
            {
                "id": s.id,
                "name": s.name,
                "latitude": s.latitude,
                "longitude": s.longitude,
                "total_capacity": s.total_capacity,
                "current_population": s.current_population,
                "available_capacity": s.available_capacity,
                "utilization_percent": s.utilization_percent if hasattr(s, 'utilization_percent') else (s.current_population / s.total_capacity * 100 if s.total_capacity > 0 else 0),
                "capacity_status": s.capacity_status.value if hasattr(s.capacity_status, 'value') else s.capacity_status,
                "road_connectivity": s.road_connectivity,
            }
            for s in sites
        ]
        
        capacity_assessments = db.query(CapacityAssessment).all()
        cap_dict = {}
        for c in capacity_assessments:
            cap_dict[c.relocation_site_id] = {
                "capacity_status": c.capacity_status.value if hasattr(c.capacity_status, 'value') else c.capacity_status,
                "capacity_score": c.capacity_score,
                "water_status": c.water_status.value if hasattr(c.water_status, 'value') else c.water_status,
                "housing_status": c.housing_status.value if hasattr(c.housing_status, 'value') else c.housing_status,
                "healthcare_status": c.healthcare_status.value if hasattr(c.healthcare_status, 'value') else c.healthcare_status,
                "school_status": c.school_status.value if hasattr(c.school_status, 'value') else c.school_status,
                "road_status": c.road_status.value if hasattr(c.road_status, 'value') else c.road_status,
                "electricity_status": c.electricity_status.value if hasattr(c.electricity_status, 'value') else c.electricity_status,
                "sanitation_status": c.sanitation_status.value if hasattr(c.sanitation_status, 'value') else c.sanitation_status,
                "environmental_status": c.environmental_status.value if hasattr(c.environmental_status, 'value') else c.environmental_status,
            }
    else:
        hab = fallback_service.get_habitation(habitation_id)
        if not hab:
            raise HTTPException(status_code=404, detail="Habitation not found")
        
        hab_dict = hab
        site_dicts = fallback_service.relocation_sites
        cap_dict = {}
        for c in fallback_service.capacity_assessments:
            cap_dict[c["relocation_site_id"]] = c
    
    result = get_all_recommendations(hab_dict, site_dicts, cap_dict)
    return _convert_recommendation_result(result)