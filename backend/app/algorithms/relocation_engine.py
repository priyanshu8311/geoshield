"""
Relocation Priority & Recommendation Engine

Implements a decision-support engine for prioritizing vulnerable habitations
and recommending suitable relocation sites.

Priority Score (0-100):
- Risk component: 50% (from Part 6 risk assessment)
- Population/exposure: 20%
- Vulnerability: 15%
- Hazard severity: 10%
- Accessibility/evacuation difficulty: 5%

Priority Levels:
- P1 IMMEDIATE: 90-100
- P2 URGENT: 75-89.99
- P3 PLANNED: 50-74.99
- P4 MONITOR: 0-49.99

Match Score (0-100):
- Capacity suitability: 30%
- Infrastructure suitability: 30%
- Environmental suitability: 15%
- Accessibility: 10%
- Safety/risk suitability: 15%

Site Suitability:
- EXCELLENT: 85-100
- GOOD: 70-84.99
- CONDITIONAL: 50-69.99
- UNSUITABLE: 0-49.99
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum
import math


class PriorityLevel(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


class SiteSuitability(str, Enum):
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    CONDITIONAL = "CONDITIONAL"
    UNSUITABLE = "UNSUITABLE"


@dataclass
class PriorityWeights:
    """Configurable weights for priority score calculation."""
    risk: float = 0.50
    population_exposure: float = 0.20
    vulnerability: float = 0.15
    hazard_severity: float = 0.10
    accessibility: float = 0.05

    def validate(self) -> bool:
        total = self.risk + self.population_exposure + self.vulnerability + self.hazard_severity + self.accessibility
        return abs(total - 1.0) < 0.001


@dataclass
class MatchWeights:
    """Configurable weights for site matching score."""
    capacity: float = 0.30
    infrastructure: float = 0.30
    environmental: float = 0.15
    accessibility: float = 0.10
    safety: float = 0.15

    def validate(self) -> bool:
        total = self.capacity + self.infrastructure + self.environmental + self.accessibility + self.safety
        return abs(total - 1.0) < 0.001


@dataclass
class PriorityThresholds:
    """Configurable priority classification thresholds."""
    p1_min: float = 90.0
    p2_min: float = 75.0
    p3_min: float = 50.0
    p4_max: float = 49.99


@dataclass
class SuitabilityThresholds:
    """Configurable site suitability classification thresholds."""
    excellent_min: float = 85.0
    good_min: float = 70.0
    conditional_min: float = 50.0
    unsuitable_max: float = 49.99


@dataclass
class RelocationPriorityResult:
    """Complete relocation priority assessment for a habitation."""
    habitation_id: str
    habitation_name: str
    risk_score: float
    risk_level: str
    population: int
    exposure_score: float
    vulnerability_score: float
    hazard_score: float
    accessibility_factor: float
    relocation_priority_score: float
    priority_level: PriorityLevel
    priority_reason: str
    contributing_factors: List[str] = field(default_factory=list)
    assessment_version: str = "1.0"
    weights_used: PriorityWeights = field(default_factory=PriorityWeights)
    thresholds_used: PriorityThresholds = field(default_factory=PriorityThresholds)


@dataclass
class SiteRecommendation:
    """Recommendation for a relocation site for a specific habitation."""
    relocation_site_id: str
    site_name: str
    match_score: float
    suitability: SiteSuitability
    available_capacity: int
    utilization_percent: float
    capacity_status: str
    capacity_score: float
    infrastructure_score: float
    environmental_score: float
    accessibility_score: float
    safety_score: float
    recommendation_reasons: List[str] = field(default_factory=list)
    limiting_factors: List[str] = field(default_factory=list)
    distance_km: float = 0.0


@dataclass
class RelocationRecommendationResult:
    """Complete relocation recommendation for a habitation."""
    habitation_id: str
    habitation_name: str
    risk_score: float
    risk_level: str
    population: int
    priority_score: float
    priority_level: PriorityLevel
    priority_reason: str
    recommendations: List[SiteRecommendation]
    primary_recommendation: Optional[SiteRecommendation] = None
    alternative_1: Optional[SiteRecommendation] = None
    alternative_2: Optional[SiteRecommendation] = None


DEFAULT_PRIORITY_WEIGHTS = PriorityWeights()
DEFAULT_MATCH_WEIGHTS = MatchWeights()
DEFAULT_PRIORITY_THRESHOLDS = PriorityThresholds()
DEFAULT_SUITABILITY_THRESHOLDS = SuitabilityThresholds()


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate approximate distance in km between two coordinates using Haversine formula."""
    R = 6371  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)


def classify_priority(score: float, thresholds: PriorityThresholds = DEFAULT_PRIORITY_THRESHOLDS) -> PriorityLevel:
    """Classify a priority score into a priority level."""
    if score >= thresholds.p1_min:
        return PriorityLevel.P1
    elif score >= thresholds.p2_min:
        return PriorityLevel.P2
    elif score >= thresholds.p3_min:
        return PriorityLevel.P3
    else:
        return PriorityLevel.P4


def classify_suitability(score: float, thresholds: SuitabilityThresholds = DEFAULT_SUITABILITY_THRESHOLDS) -> SiteSuitability:
    """Classify a match score into a site suitability level."""
    if score >= thresholds.excellent_min:
        return SiteSuitability.EXCELLENT
    elif score >= thresholds.good_min:
        return SiteSuitability.GOOD
    elif score >= thresholds.conditional_min:
        return SiteSuitability.CONDITIONAL
    else:
        return SiteSuitability.UNSUITABLE


def get_priority_label(level: PriorityLevel) -> str:
    """Get human-readable label for priority level."""
    labels = {
        PriorityLevel.P1: "IMMEDIATE",
        PriorityLevel.P2: "URGENT",
        PriorityLevel.P3: "PLANNED",
        PriorityLevel.P4: "MONITOR",
    }
    return labels.get(level, "UNKNOWN")


def get_suitability_label(level: SiteSuitability) -> str:
    """Get human-readable label for site suitability."""
    labels = {
        SiteSuitability.EXCELLENT: "EXCELLENT",
        SiteSuitability.GOOD: "GOOD",
        SiteSuitability.CONDITIONAL: "CONDITIONAL",
        SiteSuitability.UNSUITABLE: "UNSUITABLE",
    }
    return labels.get(level, "UNKNOWN")


def calculate_priority_score(
    habitation: Dict[str, Any],
    infrastructure: Optional[Dict] = None,
    weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS
) -> tuple[float, List[str]]:
    """
    Calculate relocation priority score (0-100).
    
    Components:
    - Risk score (50%): From Part 6 risk assessment
    - Population/exposure (20%): Based on population and exposure score
    - Vulnerability (15%): From Part 6 vulnerability assessment
    - Hazard severity (10%): From habitation hazard_score
    - Accessibility (5%): Based on road connectivity and emergency response
    """
    factors = []
    
    # Risk component (50%)
    risk_score = habitation.get("risk_score", 0)
    risk_component = risk_score * weights.risk
    factors.append(f"Risk score ({risk_score:.1f}) × {weights.risk:.0%} = {risk_component:.1f}")
    
    # Population/exposure component (20%)
    population = habitation.get("population", 0)
    exposure_score = habitation.get("exposure_score", 0)
    pop_factor = min(population / 5000 * 10, 10)  # Max 10 points for 5000+ pop
    exp_factor = min(exposure_score / 100 * 10, 10)  # Max 10 points for exposure 100
    pop_exp_component = (pop_factor + exp_factor) / 2 * weights.population_exposure * 100 / 10
    factors.append(f"Population/exposure (pop: {population}, exp: {exposure_score:.1f}) × {weights.population_exposure:.0%} = {pop_exp_component:.1f}")
    
    # Vulnerability component (15%)
    vulnerability_score = habitation.get("vulnerability_score", 0)
    vuln_component = vulnerability_score * weights.vulnerability
    factors.append(f"Vulnerability score ({vulnerability_score:.1f}) × {weights.vulnerability:.0%} = {vuln_component:.1f}")
    
    # Hazard severity component (10%)
    hazard_score = habitation.get("hazard_score", 0)
    hazard_component = hazard_score * weights.hazard_severity
    factors.append(f"Hazard score ({hazard_score:.1f}) × {weights.hazard_severity:.0%} = {hazard_component:.1f}")
    
    # Accessibility component (5%)
    accessibility = 50  # Default moderate
    if infrastructure:
        road_conn = infrastructure.get("road_connectivity", "").lower()
        if any(kw in road_conn for kw in ["excellent", "nh", "4-lane", "highway", "good"]):
            accessibility = 80
        elif any(kw in road_conn for kw in ["moderate", "fair", "state highway", "district road", "paved", "coastal"]):
            accessibility = 50
        else:
            accessibility = 20
        
        # Emergency response time factor
        resp_time = infrastructure.get("emergency_response_time")
        if resp_time is not None:
            if resp_time <= 30:
                accessibility = min(accessibility + 10, 100)
            elif resp_time > 120:
                accessibility = max(accessibility - 15, 0)
    
    access_component = accessibility * weights.accessibility
    factors.append(f"Accessibility ({accessibility:.1f}) × {weights.accessibility:.0%} = {access_component:.1f}")
    
    # Total priority score
    priority_score = round(risk_component + pop_exp_component + vuln_component + hazard_component + access_component, 1)
    priority_score = min(max(priority_score, 0), 100)
    
    factors.append(f"Total priority score: {priority_score:.1f}")
    
    return priority_score, factors


def generate_priority_reason(
    habitation: Dict[str, Any],
    priority_score: float,
    priority_level: PriorityLevel,
    factors: List[str]
) -> str:
    """Generate human-readable priority reason."""
    risk_level = habitation.get("risk_level", "UNKNOWN")
    population = habitation.get("population", 0)
    
    if priority_level == PriorityLevel.P1:
        return (f"Critical risk ({risk_level}), high exposure and significant population ({population:,}) "
                f"require immediate relocation planning. Decision-support recommendation requires authority approval.")
    elif priority_level == PriorityLevel.P2:
        return (f"High risk ({risk_level}) with population ({population:,}) and elevated vulnerability "
                f"require urgent relocation planning. Decision-support recommendation requires authority approval.")
    elif priority_level == PriorityLevel.P3:
        return (f"Elevated risk ({risk_level}) requires planned relocation assessment and monitoring. "
                f"Decision-support recommendation requires authority approval.")
    else:
        return (f"Lower risk ({risk_level}); continue monitoring and preparedness. "
                f"Decision-support recommendation requires authority approval.")


def calculate_capacity_suitability(site: Dict[str, Any], habitation_population: int) -> tuple[float, List[str]]:
    """Calculate capacity suitability score (0-100)."""
    reasons = []
    available = site.get("available_capacity", 0)
    utilization = site.get("utilization_percent", 0)
    
    if available >= habitation_population * 2:
        score = 100
        reasons.append(f"Sufficient available capacity ({available:,} vs {habitation_population:,} needed)")
    elif available >= habitation_population:
        score = 85
        reasons.append(f"Adequate available capacity ({available:,} vs {habitation_population:,} needed)")
    elif available >= habitation_population * 0.5:
        score = 60
        reasons.append(f"Limited available capacity ({available:,} vs {habitation_population:,} needed)")
    else:
        score = 30
        reasons.append(f"Insufficient available capacity ({available:,} vs {habitation_population:,} needed)")
    
    # Utilization penalty
    if utilization > 80:
        score = max(score - 20, 0)
        reasons.append(f"High utilization ({utilization:.1f}%)")
    elif utilization > 60:
        score = max(score - 10, 0)
        reasons.append(f"Moderate utilization ({utilization:.1f}%)")
    
    return min(max(score, 0), 100), reasons


def calculate_infrastructure_suitability(site: Dict[str, Any]) -> tuple[float, List[str]]:
    """Calculate infrastructure suitability score (0-100)."""
    reasons = []
    scores = []
    
    # Check each infrastructure component
    infra_checks = [
        ("water_status", "Water supply", 100, 70, 40),
        ("housing_status", "Housing", 100, 70, 40),
        ("healthcare_status", "Healthcare", 100, 70, 40),
        ("school_status", "School", 90, 60, 30),
        ("electricity_status", "Electricity", 100, 50, 0),
        ("sanitation_status", "Sanitation", 100, 50, 0),
    ]
    
    for field_name, label, adequate_score, limited_score, insufficient_score in infra_checks:
        status = site.get(field_name, "UNKNOWN")
        if status == "ADEQUATE":
            scores.append(adequate_score)
            reasons.append(f"✓ Adequate {label.lower()}")
        elif status == "LIMITED":
            scores.append(limited_score)
            reasons.append(f"⚠ Limited {label.lower()}")
        elif status == "INSUFFICIENT":
            scores.append(insufficient_score)
            reasons.append(f"⚠ Insufficient {label.lower()}")
        else:
            scores.append(50)
    
    avg_score = sum(scores) / len(scores) if scores else 50
    return round(min(max(avg_score, 0), 100), 1), reasons


def calculate_environmental_suitability(site: Dict[str, Any]) -> tuple[float, List[str]]:
    """Calculate environmental suitability score (0-100)."""
    reasons = []
    status = site.get("environmental_status", "UNKNOWN")
    
    if status == "ADEQUATE":
        score = 90
        reasons.append("✓ Suitable environmental conditions")
    elif status == "LIMITED":
        score = 60
        reasons.append("⚠ Environmental conditions present moderate risk")
    elif status == "INSUFFICIENT":
        score = 30
        reasons.append("⚠ Environmental conditions are unsuitable")
    else:
        score = 50
        reasons.append("Environmental status unknown")
    
    return score, reasons


def calculate_accessibility_score(site: Dict[str, Any], habitation: Dict[str, Any]) -> tuple[float, List[str]]:
    """Calculate accessibility score (0-100) based on distance and road connectivity."""
    reasons = []
    
    # Distance factor
    distance = calculate_distance(
        habitation.get("latitude", 0), habitation.get("longitude", 0),
        site.get("latitude", 0), site.get("longitude", 0)
    )
    
    if distance <= 10:
        dist_score = 100
        reasons.append(f"Close proximity ({distance:.1f} km)")
    elif distance <= 20:
        dist_score = 80
        reasons.append(f"Moderate distance ({distance:.1f} km)")
    elif distance <= 30:
        dist_score = 60
        reasons.append(f"Longer distance ({distance:.1f} km)")
    else:
        dist_score = 40
        reasons.append(f"Distant site ({distance:.1f} km)")
    
    # Road connectivity factor
    road_conn = site.get("road_connectivity", "").lower()
    if any(kw in road_conn for kw in ["excellent", "nh", "4-lane", "highway", "good"]):
        road_score = 90
        reasons.append("✓ Good road connectivity")
    elif any(kw in road_conn for kw in ["moderate", "fair", "state highway", "district road", "paved", "coastal"]):
        road_score = 60
        reasons.append("⚠ Moderate road access")
    else:
        road_score = 30
        reasons.append("⚠ Poor road access")
    
    # Combined accessibility score
    accessibility_score = round((dist_score * 0.6 + road_score * 0.4), 1)
    return accessibility_score, reasons


def calculate_safety_score(site: Dict[str, Any], habitation: Dict[str, Any]) -> tuple[float, List[str]]:
    """Calculate safety score (0-100) based on site's capacity status and environmental risk."""
    reasons = []
    capacity_status = site.get("capacity_status", "UNKNOWN")
    
    if capacity_status == "ADEQUATE":
        score = 90
        reasons.append("✓ Site has adequate capacity status")
    elif capacity_status == "LIMITED":
        score = 70
        reasons.append("⚠ Site has limited capacity")
    elif capacity_status == "STRESSED":
        score = 50
        reasons.append("⚠ Site is under stress")
    elif capacity_status == "INSUFFICIENT":
        score = 20
        reasons.append("⚠ Site has insufficient capacity")
    else:
        score = 50
    
    # Environmental risk factor
    env_status = site.get("environmental_status", "UNKNOWN")
    if env_status == "ADEQUATE":
        score = min(score + 5, 100)
        reasons.append("✓ Stable environmental conditions")
    elif env_status == "LIMITED":
        score = max(score - 10, 0)
        reasons.append("⚠ Environmental risk present")
    elif env_status == "INSUFFICIENT":
        score = max(score - 20, 0)
        reasons.append("⚠ High environmental risk")
    
    return min(max(score, 0), 100), reasons


def evaluate_site_match(
    site: Dict[str, Any],
    habitation: Dict[str, Any],
    capacity_assessment: Dict[str, Any],
    weights: MatchWeights = DEFAULT_MATCH_WEIGHTS
) -> SiteRecommendation:
    """Evaluate a relocation site for a specific habitation."""
    
    # Calculate component scores
    capacity_score, capacity_reasons = calculate_capacity_suitability(site, habitation.get("population", 0))
    infra_score, infra_reasons = calculate_infrastructure_suitability(capacity_assessment)
    env_score, env_reasons = calculate_environmental_suitability(capacity_assessment)
    access_score, access_reasons = calculate_accessibility_score(site, habitation)
    safety_score, safety_reasons = calculate_safety_score(capacity_assessment, habitation)
    
    # Weighted match score
    match_score = round(
        capacity_score * weights.capacity +
        infra_score * weights.infrastructure +
        env_score * weights.environmental +
        access_score * weights.accessibility +
        safety_score * weights.safety,
        1
    )
    match_score = min(max(match_score, 0), 100)
    
    # Determine suitability
    suitability = classify_suitability(match_score)
    
    # Collect all reasons and limiting factors
    all_reasons = []
    all_limiting = []
    
    for r in capacity_reasons:
        if r.startswith("⚠") or r.startswith("Insufficient"):
            all_limiting.append(r.replace("⚠ ", "").replace("Insufficient ", "Insufficient: "))
        else:
            all_reasons.append(r.replace("✓ ", "").replace("Adequate ", ""))
    
    for r in infra_reasons:
        if r.startswith("⚠"):
            all_limiting.append(r.replace("⚠ ", ""))
        else:
            all_reasons.append(r.replace("✓ ", ""))
    
    for r in env_reasons:
        if r.startswith("⚠"):
            all_limiting.append(r.replace("⚠ ", ""))
        else:
            all_reasons.append(r.replace("✓ ", ""))
    
    for r in access_reasons:
        if r.startswith("⚠"):
            all_limiting.append(r.replace("⚠ ", ""))
        else:
            all_reasons.append(r)
    
    for r in safety_reasons:
        if r.startswith("⚠"):
            all_limiting.append(r.replace("⚠ ", ""))
        else:
            all_reasons.append(r.replace("✓ ", ""))
    
    distance = calculate_distance(
        habitation.get("latitude", 0), habitation.get("longitude", 0),
        site.get("latitude", 0), site.get("longitude", 0)
    )
    
    return SiteRecommendation(
        relocation_site_id=site.get("id", ""),
        site_name=site.get("name", ""),
        match_score=match_score,
        suitability=suitability,
        available_capacity=site.get("available_capacity", 0),
        utilization_percent=site.get("utilization_percent", 0),
        capacity_status=capacity_assessment.get("capacity_status", "UNKNOWN"),
        capacity_score=capacity_assessment.get("capacity_score", 0),
        infrastructure_score=infra_score,
        environmental_score=env_score,
        accessibility_score=access_score,
        safety_score=safety_score,
        recommendation_reasons=all_reasons,
        limiting_factors=all_limiting,
        distance_km=distance
    )


def assess_relocation_priority(
    habitation: Dict[str, Any],
    infrastructure: Optional[Dict] = None,
    weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS,
    thresholds: PriorityThresholds = DEFAULT_PRIORITY_THRESHOLDS
) -> RelocationPriorityResult:
    """
    Calculate relocation priority for a single habitation.
    """
    habitation_id = habitation.get("id", "")
    habitation_name = habitation.get("name", "")
    risk_score = habitation.get("risk_score", 0)
    risk_level = habitation.get("risk_level", "UNKNOWN")
    population = habitation.get("population", 0)
    exposure_score = habitation.get("exposure_score", 0)
    vulnerability_score = habitation.get("vulnerability_score", 0)
    hazard_score = habitation.get("hazard_score", 0)
    
    # Calculate accessibility factor
    accessibility = 50
    if infrastructure:
        road_conn = infrastructure.get("road_connectivity", "").lower()
        if any(kw in road_conn for kw in ["excellent", "nh", "4-lane", "highway", "good"]):
            accessibility = 80
        elif any(kw in road_conn for kw in ["moderate", "fair", "state highway", "district road", "paved", "coastal"]):
            accessibility = 50
        else:
            accessibility = 20
    
    # Calculate priority score
    priority_score, factors = calculate_priority_score(habitation, infrastructure, weights)
    
    # Determine priority level
    priority_level = classify_priority(priority_score, thresholds)
    
    # Generate reason
    priority_reason = generate_priority_reason(habitation, priority_score, priority_level, factors)
    
    return RelocationPriorityResult(
        habitation_id=habitation_id,
        habitation_name=habitation_name,
        risk_score=risk_score,
        risk_level=risk_level,
        population=population,
        exposure_score=exposure_score,
        vulnerability_score=vulnerability_score,
        hazard_score=hazard_score,
        accessibility_factor=accessibility,
        relocation_priority_score=priority_score,
        priority_level=priority_level,
        priority_reason=priority_reason,
        contributing_factors=factors,
        weights_used=weights,
        thresholds_used=thresholds
    )


def get_all_recommendations(
    habitation: Dict[str, Any],
    sites: List[Dict],
    capacity_assessments: Dict[str, Dict],
    weights: MatchWeights = DEFAULT_MATCH_WEIGHTS,
    suitability_thresholds: SuitabilityThresholds = DEFAULT_SUITABILITY_THRESHOLDS
) -> RelocationRecommendationResult:
    """
    Get top 3 relocation site recommendations for a habitation.
    """
    habitation_id = habitation.get("id", "")
    habitation_name = habitation.get("name", "")
    risk_score = habitation.get("risk_score", 0)
    risk_level = habitation.get("risk_level", "UNKNOWN")
    population = habitation.get("population", 0)
    
    # Get priority assessment
    priority_result = assess_relocation_priority(habitation)
    
    # Evaluate all sites
    recommendations = []
    for site in sites:
        site_id = site.get("id", "")
        capacity_assessment = capacity_assessments.get(site_id, {})
        
        # Skip sites with no capacity assessment
        if not capacity_assessment:
            continue
        
        recommendation = evaluate_site_match(site, habitation, capacity_assessment, weights)
        
        # Only include sites that are at least CONDITIONAL
        if recommendation.suitability != SiteSuitability.UNSUITABLE:
            recommendations.append(recommendation)
    
    # Sort by match score descending
    recommendations.sort(key=lambda r: r.match_score, reverse=True)
    
    # Take top 3
    top_recommendations = recommendations[:3]
    
    primary = top_recommendations[0] if len(top_recommendations) > 0 else None
    alternative_1 = top_recommendations[1] if len(top_recommendations) > 1 else None
    alternative_2 = top_recommendations[2] if len(top_recommendations) > 2 else None
    
    return RelocationRecommendationResult(
        habitation_id=habitation_id,
        habitation_name=habitation_name,
        risk_score=risk_score,
        risk_level=risk_level,
        population=population,
        priority_score=priority_result.relocation_priority_score,
        priority_level=priority_result.priority_level,
        priority_reason=priority_result.priority_reason,
        recommendations=top_recommendations,
        primary_recommendation=primary,
        alternative_1=alternative_1,
        alternative_2=alternative_2
    )


def assess_all_priorities(
    habitations: List[Dict],
    infrastructure_data: Optional[List[Dict]] = None,
    weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS,
    thresholds: PriorityThresholds = DEFAULT_PRIORITY_THRESHOLDS
) -> List[RelocationPriorityResult]:
    """Assess relocation priority for all habitations."""
    infra_lookup = {}
    if infrastructure_data:
        for infra in infrastructure_data:
            infra_lookup[infra.get("habitation_id")] = infra
    
    results = []
    for hab in habitations:
        infra = infra_lookup.get(hab.get("id"))
        result = assess_relocation_priority(hab, infra, weights, thresholds)
        results.append(result)
    
    return results


def get_priority_statistics(results: List[RelocationPriorityResult]) -> Dict[str, Any]:
    """Calculate aggregate priority statistics."""
    if not results:
        return {
            "total_habitations": 0,
            "p1_count": 0,
            "p2_count": 0,
            "p3_count": 0,
            "p4_count": 0,
            "average_priority_score": 0.0,
            "total_population_at_risk": 0,
        }
    
    distribution = {level.value: 0 for level in PriorityLevel}
    total_pop_at_risk = 0
    
    for r in results:
        distribution[r.priority_level.value] += 1
        if r.priority_level in [PriorityLevel.P1, PriorityLevel.P2]:
            total_pop_at_risk += r.population
    
    return {
        "total_habitations": len(results),
        "p1_count": distribution.get("P1", 0),
        "p2_count": distribution.get("P2", 0),
        "p3_count": distribution.get("P3", 0),
        "p4_count": distribution.get("P4", 0),
        "average_priority_score": round(sum(r.relocation_priority_score for r in results) / len(results), 1),
        "total_population_at_risk": total_pop_at_risk,
        "priority_distribution": distribution,
    }