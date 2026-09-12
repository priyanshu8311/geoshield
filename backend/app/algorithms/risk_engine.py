"""
Risk Assessment Engine

Implements an explainable, weighted multi-hazard risk model for habitation-level
risk assessment.

Risk = Hazard Exposure + Vulnerability + Insufficient Coping Capacity

Default Weights:
- Hazard Exposure: 50%
- Vulnerability: 30%
- Coping Capacity: 20% (inverted: higher capacity reduces risk)

Classification Thresholds:
- LOW: 0-20
- MODERATE: 21-40
- ELEVATED: 41-60
- HIGH: 61-80
- CRITICAL: 81-100
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    ELEVATED = "ELEVATED"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class RiskWeights:
    """Configurable weights for risk calculation."""
    exposure: float = 0.50
    vulnerability: float = 0.30
    coping_capacity: float = 0.20

    def validate(self) -> bool:
        total = self.exposure + self.vulnerability + self.coping_capacity
        return abs(total - 1.0) < 0.001


@dataclass
class RiskThresholds:
    """Configurable classification thresholds."""
    low_max: int = 20
    moderate_max: int = 40
    elevated_max: int = 60
    high_max: int = 80
    critical_min: int = 81


@dataclass
class RiskComponent:
    """Individual risk component with contributing factors."""
    score: float
    factors: List[str] = field(default_factory=list)
    raw_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RiskAssessmentResult:
    """Complete risk assessment result for a habitation."""
    habitation_id: str
    habitation_name: str
    exposure: RiskComponent
    vulnerability: RiskComponent
    coping_capacity: RiskComponent
    overall_score: float
    risk_level: RiskLevel
    primary_hazard: Optional[str] = None
    additional_hazards: List[str] = field(default_factory=list)
    contributing_factors: List[str] = field(default_factory=list)
    assessment_version: str = "1.0"
    weights_used: RiskWeights = field(default_factory=RiskWeights)
    thresholds_used: RiskThresholds = field(default_factory=RiskThresholds)


DEFAULT_WEIGHTS = RiskWeights()
DEFAULT_THRESHOLDS = RiskThresholds()


def classify_risk(score: float, thresholds: RiskThresholds = DEFAULT_THRESHOLDS) -> RiskLevel:
    """Classify a risk score into a risk level."""
    if score <= thresholds.low_max:
        return RiskLevel.LOW
    elif score <= thresholds.moderate_max:
        return RiskLevel.MODERATE
    elif score <= thresholds.elevated_max:
        return RiskLevel.ELEVATED
    elif score <= thresholds.high_max:
        return RiskLevel.HIGH
    else:
        return RiskLevel.CRITICAL


def calculate_exposure_score(
    habitation: Dict[str, Any],
    hazard_data: Optional[List[Dict]] = None,
    weights: RiskWeights = DEFAULT_WEIGHTS
) -> RiskComponent:
    """
    Calculate Hazard Exposure Score (0-100).
    
    Uses the habitation's hazard_score as the primary exposure indicator,
    enhanced by population and spatial hazard intersection data.
    """
    factors = []
    raw_data = {}
    
    # Primary: hazard_score from habitation (this IS the exposure score)
    base_exposure = habitation.get("hazard_score", 0)
    raw_data["base_hazard_score"] = base_exposure
    factors.append(f"Hazard score (primary): {base_exposure:.1f}")
    
    # Population exposure factor (moderate impact)
    population = habitation.get("population", 0)
    pop_factor = min(population / 10000 * 8, 8)  # Max 8 points for 10000+ pop
    raw_data["population"] = population
    raw_data["population_factor"] = pop_factor
    if population > 1000:
        factors.append(f"Population exposure ({population}): +{pop_factor:.1f}")
    
    # Hazard severity from intersecting hazard zones
    hazard_severity_bonus = 0
    if hazard_data:
        hab_lat = habitation.get("latitude")
        hab_lon = habitation.get("longitude")
        if hab_lat and hab_lon:
            for hazard in hazard_data:
                props = hazard.get("properties", {})
                geom = hazard.get("geometry")
                if geom and _point_in_multipolygon(hab_lon, hab_lat, geom):
                    severity = props.get("severity", 0)
                    hazard_severity_bonus = max(hazard_severity_bonus, severity * 0.05)
                    raw_data.setdefault("intersecting_hazards", []).append({
                        "id": props.get("id"),
                        "name": props.get("name"),
                        "severity": severity
                    })
    
    raw_data["hazard_severity_bonus"] = hazard_severity_bonus
    if hazard_severity_bonus > 0:
        factors.append(f"Hazard zone intersection bonus: +{hazard_severity_bonus:.1f}")
    
    # Calculate final exposure (capped at 100)
    exposure_score = min(base_exposure + pop_factor + hazard_severity_bonus, 100)
    raw_data["final_exposure_score"] = exposure_score
    
    return RiskComponent(score=exposure_score, factors=factors, raw_data=raw_data)


def calculate_vulnerability_score(
    habitation: Dict[str, Any],
    infrastructure: Optional[Dict] = None,
    weights: RiskWeights = DEFAULT_WEIGHTS
) -> RiskComponent:
    """
    Calculate Vulnerability Score (0-100).
    
    Uses the habitation's vulnerability_score as the primary indicator,
    enhanced by specific infrastructure and demographic factors.
    """
    factors = []
    raw_data = {}
    
    # Primary: vulnerability_score from habitation
    base_vuln = habitation.get("vulnerability_score", 0)
    raw_data["base_vulnerability_score"] = base_vuln
    factors.append(f"Base vulnerability score: {base_vuln:.1f}")
    
    # Supplementary infrastructure factors (only where base score doesn't capture them)
    infra_supplement = 0
    if infrastructure:
        # No healthcare facility (major vulnerability)
        if infrastructure.get("healthcare_facilities", 0) == 0:
            infra_supplement += 5
            factors.append("No healthcare facilities: +5")
        
        # Very slow emergency response
        if infrastructure.get("emergency_response_time", 0) > 120:
            infra_supplement += 4
            factors.append(f"Slow emergency response: +4")
        
        # Very poor road connectivity
        road_conn = infrastructure.get("road_connectivity", "").lower()
        if "very poor" in road_conn or "no motorable" in road_conn or "footpath" in road_conn:
            infra_supplement += 4
            factors.append("Very poor road connectivity: +4")
        
        # No school
        if infrastructure.get("school_count", 0) == 0:
            infra_supplement += 2
            factors.append("No school: +2")
    
    raw_data["infrastructure_supplement"] = infra_supplement
    
    # Population vulnerability
    pop_vuln = 0
    population = habitation.get("population", 0)
    if population > 3000:
        pop_vuln = 3
        factors.append(f"Large population ({population}): +3")
    elif population < 500:
        pop_vuln = 2
        factors.append(f"Small isolated population ({population}): +2")
    
    raw_data["population_vulnerability"] = pop_vuln
    
    # Calculate final vulnerability (capped at 100)
    vulnerability_score = min(base_vuln + infra_supplement + pop_vuln, 100)
    raw_data["final_vulnerability_score"] = vulnerability_score
    
    return RiskComponent(score=vulnerability_score, factors=factors, raw_data=raw_data)


def calculate_coping_capacity_score(
    habitation: Dict[str, Any],
    infrastructure: Optional[Dict] = None,
    weights: RiskWeights = DEFAULT_WEIGHTS
) -> RiskComponent:
    """
    Calculate Coping Capacity Score (0-100).
    
    Higher score = better capacity = LOWER risk.
    Computed from infrastructure and service availability.
    """
    factors = []
    raw_data = {}
    
    if infrastructure:
        # Base from average of key infrastructure scores
        capacity_scores = [
            infrastructure.get("healthcare_score", 50),
            infrastructure.get("emergency_services_score", 50),
            infrastructure.get("roads_score", 50),
            infrastructure.get("water_score", 50),
            infrastructure.get("electricity_score", 50),
            infrastructure.get("sanitation_score", 50),
        ]
        base_capacity = sum(capacity_scores) / len(capacity_scores)
    else:
        base_capacity = 50  # Default moderate capacity
    
    raw_data["base_capacity"] = base_capacity
    factors.append(f"Base infrastructure capacity: {base_capacity:.1f}")
    
    # Enhancements based on specific capabilities
    capacity_bonus = 0
    
    if infrastructure:
        # Healthcare facilities
        hc_facilities = infrastructure.get("healthcare_facilities", 0)
        if hc_facilities >= 3:
            capacity_bonus += 10
            factors.append(f"Multiple healthcare facilities ({hc_facilities}): +10")
        elif hc_facilities >= 1:
            capacity_bonus += 5
            factors.append(f"Healthcare facility present: +5")
        else:
            factors.append("No healthcare facilities: -5")
            capacity_bonus -= 5
        
        # Emergency response
        resp_time = infrastructure.get("emergency_response_time")
        if resp_time is not None:
            if resp_time <= 20:
                capacity_bonus += 10
                factors.append(f"Fast emergency response ({resp_time} min): +10")
            elif resp_time <= 60:
                capacity_bonus += 5
                factors.append(f"Moderate emergency response ({resp_time} min): +5")
            else:
                factors.append(f"Slow emergency response ({resp_time} min): -5")
                capacity_bonus -= 5
        
        # Road connectivity
        road_conn = infrastructure.get("road_connectivity", "").lower()
        if "excellent" in road_conn or "nh" in road_conn or "4-lane" in road_conn:
            capacity_bonus += 8
            factors.append("Excellent road connectivity: +8")
        elif "good" in road_conn or "paved" in road_conn or "state highway" in road_conn:
            capacity_bonus += 5
            factors.append("Good road connectivity: +5")
        elif "very poor" in road_conn or "no motorable" in road_conn or "footpath" in road_conn:
            factors.append("Very poor road connectivity: -8")
            capacity_bonus -= 8
        
        # Water and sanitation coverage
        if infrastructure.get("water_coverage", infrastructure.get("water_score", 0)) > 80:
            capacity_bonus += 3
            factors.append("Good water coverage: +3")
        if infrastructure.get("sanitation_coverage", infrastructure.get("sanitation_score", 0)) > 80:
            capacity_bonus += 3
            factors.append("Good sanitation coverage: +3")
        
        # Electricity coverage
        if infrastructure.get("electricity_coverage", 0) > 90:
            capacity_bonus += 3
            factors.append("High electricity coverage: +3")
    
    raw_data["capacity_bonus"] = capacity_bonus
    
    # Calculate final coping capacity (capped at 100, minimum 5)
    coping_capacity = min(max(base_capacity + capacity_bonus, 5), 100)
    raw_data["final_coping_capacity"] = coping_capacity
    
    return RiskComponent(score=coping_capacity, factors=factors, raw_data=raw_data)


def calculate_multi_hazard_exposure(
    habitation: Dict[str, Any],
    hazard_data: List[Dict]
) -> Dict[str, Any]:
    """
    Identify all hazards affecting a habitation and calculate multi-hazard exposure.
    
    Returns:
    - primary_hazard: The hazard with highest severity affecting the habitation
    - additional_hazards: Other hazards affecting the habitation
    - combined_exposure: Combined exposure considering all hazards
    """
    hab_lat = habitation.get("latitude")
    hab_lon = habitation.get("longitude")
    hab_hazard_type = habitation.get("hazard_type")
    
    intersecting_hazards = []
    
    if hab_lat and hab_lon:
        for hazard in hazard_data:
            props = hazard.get("properties", {})
            geom = hazard.get("geometry")
            if geom and _point_in_multipolygon(hab_lon, hab_lat, geom):
                intersecting_hazards.append({
                    "id": props.get("id"),
                    "name": props.get("name"),
                    "hazard_type": props.get("hazard_type"),
                    "severity": props.get("severity", 0),
                    "frequency": props.get("frequency"),
                    "description": props.get("description")
                })
    
    # Also consider the habitation's designated hazard type
    if hab_hazard_type and not any(h["hazard_type"] == hab_hazard_type for h in intersecting_hazards):
        intersecting_hazards.append({
            "id": None,
            "name": f"{hab_hazard_type} Zone",
            "hazard_type": hab_hazard_type,
            "severity": habitation.get("hazard_score", 0),
            "frequency": "Designated primary hazard",
            "description": habitation.get("hazard_type")
        })
    
    if not intersecting_hazards:
        return {
            "primary_hazard": hab_hazard_type,
            "additional_hazards": [],
            "combined_exposure_bonus": 0
        }
    
    # Sort by severity
    intersecting_hazards.sort(key=lambda h: h["severity"], reverse=True)
    
    primary = intersecting_hazards[0]
    additional = [h["hazard_type"] for h in intersecting_hazards[1:] if h["hazard_type"]]
    
    # Combined exposure bonus for multiple hazards
    combined_bonus = 0
    if len(intersecting_hazards) > 1:
        # Additional hazard adds up to 10 points based on their severity
        for h in intersecting_hazards[1:]:
            combined_bonus += min(h["severity"] * 0.05, 5)
        combined_bonus = min(combined_bonus, 15)  # Cap at 15
    
    return {
        "primary_hazard": primary["hazard_type"],
        "primary_hazard_details": primary,
        "additional_hazards": additional,
        "all_hazards": intersecting_hazards,
        "combined_exposure_bonus": combined_bonus
    }


def _point_in_multipolygon(lon: float, lat: float, multipolygon: Dict) -> bool:
    """Check if a point is inside a MultiPolygon geometry."""
    coords = multipolygon.get("coordinates", [])
    for polygon in coords:
        for ring in polygon:
            if _point_in_polygon(lon, lat, ring):
                return True
    return False


def _point_in_polygon(lon: float, lat: float, polygon: List[List[float]]) -> bool:
    """Ray casting algorithm to check if point is in polygon."""
    x, y = lon, lat
    inside = False
    n = len(polygon)
    for i in range(n):
        j = (i - 1) % n
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
    return inside


def assess_habitation_risk(
    habitation: Dict[str, Any],
    hazard_data: Optional[List[Dict]] = None,
    infrastructure: Optional[Dict] = None,
    weights: RiskWeights = DEFAULT_WEIGHTS,
    thresholds: RiskThresholds = DEFAULT_THRESHOLDS
) -> RiskAssessmentResult:
    """
    Perform complete risk assessment for a single habitation.
    
    This is the main entry point for risk calculation.
    """
    # Multi-hazard analysis
    multi_hazard = calculate_multi_hazard_exposure(habitation, hazard_data or [])
    
    # Calculate components
    exposure = calculate_exposure_score(habitation, hazard_data, weights)
    vulnerability = calculate_vulnerability_score(habitation, infrastructure, weights)
    coping_capacity = calculate_coping_capacity_score(habitation, infrastructure, weights)
    
    # Apply multi-hazard exposure bonus
    exposure.score = min(exposure.score + multi_hazard.get("combined_exposure_bonus", 0), 100)
    if multi_hazard.get("combined_exposure_bonus", 0) > 0:
        exposure.factors.append(f"Multi-hazard exposure bonus: +{multi_hazard['combined_exposure_bonus']:.1f}")
        exposure.raw_data["multi_hazard_bonus"] = multi_hazard["combined_exposure_bonus"]
    
    # Weighted risk calculation
    # Risk = (Exposure * 0.50) + (Vulnerability * 0.30) + ((100 - CopingCapacity) * 0.20)
    risk_score = (
        exposure.score * weights.exposure +
        vulnerability.score * weights.vulnerability +
        (100 - coping_capacity.score) * weights.coping_capacity
    )
    risk_score = round(min(max(risk_score, 0), 100), 1)
    
    # Classify risk
    risk_level = classify_risk(risk_score, thresholds)
    
    # Collect all contributing factors
    all_factors = []
    all_factors.extend(exposure.factors)
    all_factors.extend(vulnerability.factors)
    all_factors.extend(coping_capacity.factors)
    
    # Add formula explanation
    all_factors.append(
        f"Formula: ({exposure.score:.1f}×{weights.exposure:.0%}) + "
        f"({vulnerability.score:.1f}×{weights.vulnerability:.0%}) + "
        f"((100-{coping_capacity.score:.1f})×{weights.coping_capacity:.0%}) = {risk_score:.1f}"
    )
    
    return RiskAssessmentResult(
        habitation_id=habitation.get("id", ""),
        habitation_name=habitation.get("name", ""),
        exposure=exposure,
        vulnerability=vulnerability,
        coping_capacity=coping_capacity,
        overall_score=risk_score,
        risk_level=risk_level,
        primary_hazard=multi_hazard.get("primary_hazard"),
        additional_hazards=multi_hazard.get("additional_hazards", []),
        contributing_factors=all_factors,
        weights_used=weights,
        thresholds_used=thresholds
    )


def assess_all_habitations(
    habitations: List[Dict],
    hazard_data: Optional[List[Dict]] = None,
    infrastructure_data: Optional[List[Dict]] = None,
    weights: RiskWeights = DEFAULT_WEIGHTS,
    thresholds: RiskThresholds = DEFAULT_THRESHOLDS
) -> List[RiskAssessmentResult]:
    """Assess risk for all habitations."""
    # Build infrastructure lookup
    infra_lookup = {}
    if infrastructure_data:
        for infra in infrastructure_data:
            infra_lookup[infra.get("habitation_id")] = infra
    
    results = []
    for hab in habitations:
        infra = infra_lookup.get(hab.get("id"))
        result = assess_habitation_risk(hab, hazard_data, infra, weights, thresholds)
        results.append(result)
    
    return results


def get_risk_distribution(results: List[RiskAssessmentResult]) -> Dict[str, int]:
    """Get count of habitations by risk level."""
    distribution = {level.value: 0 for level in RiskLevel}
    for r in results:
        distribution[r.risk_level.value] += 1
    return distribution


def get_risk_statistics(results: List[RiskAssessmentResult]) -> Dict[str, Any]:
    """Calculate aggregate risk statistics."""
    if not results:
        return {}
    
    scores = [r.overall_score for r in results]
    distribution = get_risk_distribution(results)
    
    return {
        "total": len(results),
        "average_score": round(sum(scores) / len(scores), 1),
        "min_score": min(scores),
        "max_score": max(scores),
        "distribution": distribution,
        "high_critical_count": distribution.get("HIGH", 0) + distribution.get("CRITICAL", 0),
    }