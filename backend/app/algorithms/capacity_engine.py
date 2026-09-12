"""
Carrying Capacity Assessment Engine

Implements a deterministic, explainable carrying capacity assessment for relocation sites.

Assessment Factors:
1. Total Capacity vs Current Population (Utilization)
2. Water Availability
3. Housing/Shelter Availability
4. Healthcare Capacity
5. School/Education Capacity
6. Road/Accessibility
7. Electricity
8. Sanitation
9. Environmental Suitability

Status Classification (Prototype/Demo Thresholds):
- ADEQUATE: utilization < 50% AND all infrastructure SUFFICIENT
- LIMITED: utilization 50-75% OR some infrastructure LIMITED
- STRESSED: utilization 75-90% OR critical infrastructure LIMITED
- INSUFFICIENT: utilization > 90% OR critical infrastructure INSUFFICIENT

NOTE: These thresholds are prototype/demo thresholds and are NOT official government standards.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum


class CapacityStatus(str, Enum):
    ADEQUATE = "ADEQUATE"
    LIMITED = "LIMITED"
    STRESSED = "STRESSED"
    INSUFFICIENT = "INSUFFICIENT"


class InfrastructureStatus(str, Enum):
    SUFFICIENT = "SUFFICIENT"
    LIMITED = "LIMITED"
    INSUFFICIENT = "INSUFFICIENT"


@dataclass
class CapacityWeights:
    """Configurable weights for capacity score calculation."""
    utilization: float = 0.30
    water: float = 0.15
    housing: float = 0.15
    healthcare: float = 0.15
    school: float = 0.10
    road: float = 0.05
    electricity: float = 0.05
    sanitation: float = 0.05

    def validate(self) -> bool:
        total = (self.utilization + self.water + self.housing + self.healthcare +
                 self.school + self.road + self.electricity + self.sanitation)
        return abs(total - 1.0) < 0.001


@dataclass
class CapacityThresholds:
    """Configurable classification thresholds (PROTOTYPE/DEMO VALUES)."""
    # Utilization thresholds
    adequate_util_max: float = 50.0
    limited_util_max: float = 75.0
    stressed_util_max: float = 90.0
    # Infrastructure count thresholds for status escalation
    limited_infra_max: int = 2
    stressed_infra_max: int = 1


@dataclass
class InfrastructureAssessment:
    """Assessment of a single infrastructure component."""
    name: str
    status: InfrastructureStatus
    score: float
    capacity: int
    demand: int
    factors: List[str] = field(default_factory=list)
    raw_data: Dict[str, Any] = field(default_factory=dict)
    is_quantitative: bool = False


@dataclass
class CapacityAssessmentResult:
    """Complete carrying capacity assessment result for a relocation site."""
    site_id: str
    site_name: str
    total_capacity: int
    current_population: int
    available_capacity: int
    utilization_percent: float
    capacity_score: float
    capacity_status: CapacityStatus
    infrastructure_assessments: List[InfrastructureAssessment]
    limiting_factors: List[str]
    assessment_version: str = "1.0"
    weights_used: CapacityWeights = field(default_factory=CapacityWeights)
    thresholds_used: CapacityThresholds = field(default_factory=CapacityThresholds)


DEFAULT_WEIGHTS = CapacityWeights()
DEFAULT_THRESHOLDS = CapacityThresholds()


def calculate_utilization(current_population: int, total_capacity: int) -> float:
    """Calculate utilization percentage. Returns 0 if total_capacity is 0."""
    if total_capacity <= 0:
        return 0.0
    return round((current_population / total_capacity) * 100, 1)


def assess_infrastructure_component(
    name: str,
    capacity: int,
    demand: int,
    is_binary: bool = False,
    binary_value: Optional[int] = None,
    description: Optional[str] = None
) -> InfrastructureAssessment:
    """
    Assess a single infrastructure component.
    
    For capacity-based components (water, housing, healthcare, school):
    - SUFFICIENT: capacity >= demand (score 100)
    - LIMITED: capacity >= 50% demand (score 50-99)
    - INSUFFICIENT: capacity < 50% demand (score < 50)
    
    For binary components (electricity, sanitation, emergency_services):
    - SUFFICIENT: 1 (available)
    - INSUFFICIENT: 0 (not available)
    """
    factors = []
    raw_data = {"capacity": capacity, "demand": demand}
    
    if description:
        raw_data["description"] = description
        factors.append(description)
    
    if is_binary:
        if binary_value == 1:
            status = InfrastructureStatus.SUFFICIENT
            score = 100.0
            factors.append(f"{name}: Available")
        else:
            status = InfrastructureStatus.INSUFFICIENT
            score = 0.0
            factors.append(f"{name}: Not available")
    else:
        if demand <= 0:
            status = InfrastructureStatus.SUFFICIENT
            score = 100.0
            factors.append(f"{name}: No demand")
        elif capacity >= demand:
            status = InfrastructureStatus.SUFFICIENT
            score = 100.0
            factors.append(f"{name}: Sufficient ({capacity} >= {demand})")
        elif capacity >= demand * 0.5:
            status = InfrastructureStatus.LIMITED
            score = round((capacity / demand) * 100, 1)
            factors.append(f"{name}: Limited ({capacity} < {demand})")
        else:
            status = InfrastructureStatus.INSUFFICIENT
            score = round((capacity / demand) * 100, 1)
            factors.append(f"{name}: Insufficient ({capacity} << {demand})")
    
    raw_data["score"] = score
    raw_data["status"] = status.value
    
    return InfrastructureAssessment(
        name=name,
        status=status,
        score=score,
        capacity=capacity,
        demand=demand,
        factors=factors,
        raw_data=raw_data
    )


def assess_road_connectivity(road_connectivity: Optional[str]) -> InfrastructureAssessment:
    """Assess road connectivity based on description."""
    factors = []
    raw_data = {"road_connectivity": road_connectivity or "Unknown"}
    
    if not road_connectivity:
        status = InfrastructureStatus.LIMITED
        score = 50.0
        factors.append("Road connectivity: Unknown")
    else:
        conn_lower = road_connectivity.lower()
        if any(kw in conn_lower for kw in ["excellent", "nh access", "4-lane", "highway", "good"]):
            status = InfrastructureStatus.SUFFICIENT
            score = 90.0
            factors.append(f"Road connectivity: Good ({road_connectivity})")
        elif any(kw in conn_lower for kw in ["moderate", "fair", "state highway", "district road", "paved", "coastal"]):
            status = InfrastructureStatus.LIMITED
            score = 60.0
            factors.append(f"Road connectivity: Moderate ({road_connectivity})")
        else:
            status = InfrastructureStatus.INSUFFICIENT
            score = 30.0
            factors.append(f"Road connectivity: Poor ({road_connectivity})")
    
    raw_data["score"] = score
    raw_data["status"] = status.value
    
    return InfrastructureAssessment(
        name="Road Access",
        status=status,
        score=score,
        capacity=0,
        demand=0,
        factors=factors,
        raw_data=raw_data
    )


def assess_environmental_status(environmental_status: Optional[str]) -> InfrastructureAssessment:
    """Assess environmental suitability based on description."""
    factors = []
    raw_data = {"environmental_status": environmental_status or "Unknown"}
    
    if not environmental_status:
        status = InfrastructureStatus.LIMITED
        score = 50.0
        factors.append("Environmental status: Unknown")
    else:
        env_lower = environmental_status.lower()
        if any(kw in env_lower for kw in ["stable", "protected", "no hazard", "no landslide", "no flood"]):
            status = InfrastructureStatus.SUFFICIENT
            score = 90.0
            factors.append(f"Environmental status: Stable ({environmental_status})")
        elif any(kw in env_lower for kw in ["low risk", "elevated", "embankment", "sea wall", "moderate"]):
            status = InfrastructureStatus.LIMITED
            score = 60.0
            factors.append(f"Environmental status: Moderate risk ({environmental_status})")
        else:
            status = InfrastructureStatus.INSUFFICIENT
            score = 30.0
            factors.append(f"Environmental status: High risk ({environmental_status})")
    
    raw_data["score"] = score
    raw_data["status"] = status.value
    
    return InfrastructureAssessment(
        name="Environmental Status",
        status=status,
        score=score,
        capacity=0,
        demand=0,
        factors=factors,
        raw_data=raw_data
    )


def calculate_capacity_score(
    utilization: float,
    infrastructure_assessments: List[InfrastructureAssessment],
    weights: CapacityWeights = DEFAULT_WEIGHTS
) -> float:
    """
    Calculate overall capacity score (0-100).
    
    Higher score = better capacity.
    Utilization is inverted (lower utilization = higher score).
    """
    # Utilization score (inverted: 0% utilization = 100, 100% utilization = 0)
    utilization_score = max(0, 100 - utilization)
    
    # Infrastructure scores
    infra_scores = {}
    for ia in infrastructure_assessments:
        infra_scores[ia.name.lower().replace(" ", "_")] = ia.score
    
    # Weighted calculation
    score = (
        utilization_score * weights.utilization +
        infra_scores.get("water", 50) * weights.water +
        infra_scores.get("housing", 50) * weights.housing +
        infra_scores.get("healthcare", 50) * weights.healthcare +
        infra_scores.get("school", 50) * weights.school +
        infra_scores.get("road_access", 50) * weights.road +
        infra_scores.get("electricity", 50) * weights.electricity +
        infra_scores.get("sanitation", 50) * weights.sanitation
    )
    
    return round(min(max(score, 0), 100), 1)


def determine_capacity_status(
    utilization: float,
    infrastructure_assessments: List[InfrastructureAssessment],
    thresholds: CapacityThresholds = DEFAULT_THRESHOLDS
) -> CapacityStatus:
    """
    Determine overall capacity status based on utilization and infrastructure.
    
    PROTOTYPE/DEMO THRESHOLDS - NOT OFFICIAL GOVERNMENT STANDARDS
    """
    # Critical infrastructure: water, housing, healthcare
    critical_names = {"water", "housing", "healthcare"}
    
    # Count critical infrastructure issues
    critical_limited = sum(1 for ia in infrastructure_assessments 
                          if ia.name.lower() in critical_names and ia.status == InfrastructureStatus.LIMITED)
    critical_insufficient = sum(1 for ia in infrastructure_assessments 
                               if ia.name.lower() in critical_names and ia.status == InfrastructureStatus.INSUFFICIENT)
    
    # Check if any critical infrastructure is insufficient
    if critical_insufficient > 0:
        return CapacityStatus.INSUFFICIENT
    
    # Check utilization and critical infrastructure status
    if utilization <= thresholds.adequate_util_max:
        if critical_limited == 0:
            return CapacityStatus.ADEQUATE
        else:
            return CapacityStatus.LIMITED
    elif utilization <= thresholds.limited_util_max:
        if critical_limited == 0:
            return CapacityStatus.LIMITED
        else:
            return CapacityStatus.STRESSED
    elif utilization <= thresholds.stressed_util_max:
        return CapacityStatus.STRESSED
    else:
        return CapacityStatus.INSUFFICIENT


def identify_limiting_factors(
    utilization: float,
    infrastructure_assessments: List[InfrastructureAssessment]
) -> List[str]:
    """Identify the main limiting factors for capacity."""
    factors = []
    
    # Utilization factor
    if utilization > 75:
        factors.append(f"High utilization ({utilization:.1f}%)")
    elif utilization > 50:
        factors.append(f"Moderate utilization ({utilization:.1f}%)")
    
    # Infrastructure factors - only include LIMITED or INSUFFICIENT
    for ia in infrastructure_assessments:
        if ia.status == InfrastructureStatus.INSUFFICIENT:
            if ia.is_quantitative:
                factors.append(f"Critical: {ia.name} insufficient ({ia.capacity} < {ia.demand} demand)")
            else:
                factors.append(f"Critical: {ia.name} - {_get_qualitative_insufficient_message(ia.name)}")
        elif ia.status == InfrastructureStatus.LIMITED:
            if ia.is_quantitative:
                factors.append(f"Limited: {ia.name} ({ia.capacity} < {ia.demand} demand)")
            else:
                factors.append(f"Limited: {ia.name} - {_get_qualitative_limited_message(ia.name)}")
    
    return factors


def _get_qualitative_limited_message(name: str) -> str:
    """Generate human-readable message for qualitative LIMITED status."""
    messages = {
        "Road Access": "road access is moderate",
        "Electricity": "electricity availability is limited",
        "Sanitation": "sanitation facilities are limited",
        "Environmental Status": "environmental conditions present moderate risk",
    }
    return messages.get(name, "limited")


def _get_qualitative_insufficient_message(name: str) -> str:
    """Generate human-readable message for qualitative INSUFFICIENT status."""
    messages = {
        "Road Access": "road access is poor or unavailable",
        "Electricity": "electricity is unavailable",
        "Sanitation": "sanitation facilities are unavailable",
        "Environmental Status": "environmental conditions are unsuitable",
    }
    return messages.get(name, "insufficient")


def assess_relocation_site_capacity(
    site: Dict[str, Any],
    weights: CapacityWeights = DEFAULT_WEIGHTS,
    thresholds: CapacityThresholds = DEFAULT_THRESHOLDS
) -> CapacityAssessmentResult:
    """
    Perform complete carrying capacity assessment for a relocation site.
    
    This is the main entry point for capacity calculation.
    """
    site_id = site.get("id", "")
    site_name = site.get("name", "")
    total_capacity = site.get("total_capacity", 0)
    current_population = site.get("current_population", 0)
    available_capacity = site.get("available_capacity", 0)
    
    # Calculate utilization (based on total capacity)
    utilization = calculate_utilization(current_population, total_capacity)
    
    # For infrastructure assessment, use current population as actual demand
    # This reflects current status. For planning, total_capacity could be used.
    actual_demand = max(current_population, 1)  # Avoid zero demand
    
    # Assess infrastructure components
    infrastructure_assessments = []
    
    # Water
    water_assessment = assess_infrastructure_component(
        name="Water",
        capacity=site.get("water_capacity", 0),
        demand=actual_demand,
        description=site.get("environmental_status")
    )
    water_assessment.is_quantitative = True
    infrastructure_assessments.append(water_assessment)
    
    # Housing
    housing_assessment = assess_infrastructure_component(
        name="Housing",
        capacity=site.get("housing_capacity", 0),
        demand=actual_demand
    )
    housing_assessment.is_quantitative = True
    infrastructure_assessments.append(housing_assessment)
    
    # Healthcare
    healthcare_assessment = assess_infrastructure_component(
        name="Healthcare",
        capacity=site.get("healthcare_capacity", 0),
        demand=actual_demand
    )
    healthcare_assessment.is_quantitative = True
    infrastructure_assessments.append(healthcare_assessment)
    
    # School
    school_assessment = assess_infrastructure_component(
        name="School",
        capacity=site.get("school_capacity", 0),
        demand=actual_demand
    )
    school_assessment.is_quantitative = True
    infrastructure_assessments.append(school_assessment)
    
    # Road Access
    road_assessment = assess_road_connectivity(site.get("road_connectivity"))
    road_assessment.is_quantitative = False
    infrastructure_assessments.append(road_assessment)
    
    # Electricity (binary)
    electricity_assessment = assess_infrastructure_component(
        name="Electricity",
        capacity=0,
        demand=0,
        is_binary=True,
        binary_value=site.get("electricity", 0)
    )
    electricity_assessment.is_quantitative = False
    infrastructure_assessments.append(electricity_assessment)
    
    # Sanitation (binary)
    sanitation_assessment = assess_infrastructure_component(
        name="Sanitation",
        capacity=0,
        demand=0,
        is_binary=True,
        binary_value=site.get("sanitation", 0)
    )
    sanitation_assessment.is_quantitative = False
    infrastructure_assessments.append(sanitation_assessment)
    
    # Environmental Status
    env_assessment = assess_environmental_status(site.get("environmental_status"))
    env_assessment.is_quantitative = False
    infrastructure_assessments.append(env_assessment)
    
    # Calculate overall score
    capacity_score = calculate_capacity_score(utilization, infrastructure_assessments, weights)
    
    # Determine status
    capacity_status = determine_capacity_status(utilization, infrastructure_assessments, thresholds)
    
    # Identify limiting factors
    limiting_factors = identify_limiting_factors(utilization, infrastructure_assessments)
    
    return CapacityAssessmentResult(
        site_id=site_id,
        site_name=site_name,
        total_capacity=total_capacity,
        current_population=current_population,
        available_capacity=available_capacity,
        utilization_percent=utilization,
        capacity_score=capacity_score,
        capacity_status=capacity_status,
        infrastructure_assessments=infrastructure_assessments,
        limiting_factors=limiting_factors,
        weights_used=weights,
        thresholds_used=thresholds
    )


def assess_all_relocation_sites(
    sites: List[Dict],
    weights: CapacityWeights = DEFAULT_WEIGHTS,
    thresholds: CapacityThresholds = DEFAULT_THRESHOLDS
) -> List[CapacityAssessmentResult]:
    """Assess carrying capacity for all relocation sites."""
    return [assess_relocation_site_capacity(site, weights, thresholds) for site in sites]


def get_capacity_statistics(results: List[CapacityAssessmentResult]) -> Dict[str, Any]:
    """Calculate aggregate capacity statistics."""
    if not results:
        return {
            "total_sites": 0,
            "total_capacity": 0,
            "total_current_population": 0,
            "total_available_capacity": 0,
            "overall_utilization": 0.0,
            "average_capacity_score": 0.0,
            "status_distribution": {s.value: 0 for s in CapacityStatus},
            "adequate_sites": 0,
            "limited_sites": 0,
            "stressed_sites": 0,
            "insufficient_sites": 0,
        }
    
    total_capacity = sum(r.total_capacity for r in results)
    total_population = sum(r.current_population for r in results)
    total_available = sum(r.available_capacity for r in results)
    
    distribution = {s.value: 0 for s in CapacityStatus}
    for r in results:
        distribution[r.capacity_status.value] += 1
    
    return {
        "total_sites": len(results),
        "total_capacity": total_capacity,
        "total_current_population": total_population,
        "total_available_capacity": total_available,
        "overall_utilization": round((total_population / total_capacity * 100) if total_capacity > 0 else 0, 1),
        "average_capacity_score": round(sum(r.capacity_score for r in results) / len(results), 1),
        "status_distribution": distribution,
        "adequate_sites": distribution.get("ADEQUATE", 0),
        "limited_sites": distribution.get("LIMITED", 0),
        "stressed_sites": distribution.get("STRESSED", 0),
        "insufficient_sites": distribution.get("INSUFFICIENT", 0),
    }