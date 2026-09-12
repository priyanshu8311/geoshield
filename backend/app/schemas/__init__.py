from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    ELEVATED = "ELEVATED"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class HazardType(str, Enum):
    LANDSLIDE = "Landslide"
    FLOOD = "Flood"
    CLOUDBURST = "Cloudburst"
    COASTAL_EROSION = "Coastal Erosion"


class CapacityStatus(str, Enum):
    ADEQUATE = "ADEQUATE"
    LIMITED = "LIMITED"
    STRESSED = "STRESSED"
    INSUFFICIENT = "INSUFFICIENT"


class PriorityLevel(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


class AlertLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    WARNING = "WARNING"
    INFO = "INFO"


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    DISASTER_MANAGEMENT_OFFICER = "DISASTER_MANAGEMENT_OFFICER"
    GIS_ANALYST = "GIS_ANALYST"
    PLANNING_OFFICER = "PLANNING_OFFICER"
    FIELD_OFFICER = "FIELD_OFFICER"
    VIEWER = "VIEWER"


class GeoJSONPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float]


class GeoJSONMultiPolygon(BaseModel):
    type: str = "MultiPolygon"
    coordinates: List[List[List[List[float]]]]


class HabitationBase(BaseModel):
    id: str
    name: str
    district: str
    state: str
    population: int
    latitude: float
    longitude: float
    geometry: Optional[GeoJSONPoint] = None
    hazard_type: HazardType
    hazard_score: float
    exposure_score: float
    vulnerability_score: float
    risk_score: float
    risk_level: RiskLevel
    relocation_priority: PriorityLevel


class HabitationResponse(HabitationBase):
    model_config = ConfigDict(from_attributes=True)


class HabitationListResponse(BaseModel):
    habitations: List[HabitationResponse]
    total: int


class HazardBase(BaseModel):
    id: str
    name: str
    hazard_type: HazardType
    severity: float
    frequency: Optional[str] = None
    description: Optional[str] = None
    geometry: Optional[GeoJSONMultiPolygon] = None


class HazardResponse(HazardBase):
    model_config = ConfigDict(from_attributes=True)


class HazardListResponse(BaseModel):
    hazards: List[HazardResponse]
    total: int


class InfrastructureBase(BaseModel):
    habitation_id: str
    roads_score: float
    water_score: float
    healthcare_score: float
    schools_score: float
    electricity_score: float
    sanitation_score: float
    emergency_services_score: float
    road_connectivity: Optional[str] = None
    water_source: Optional[str] = None
    healthcare_facilities: int
    school_count: int
    electricity_coverage: float
    sanitation_coverage: float
    emergency_response_time: Optional[int] = None


class InfrastructureResponse(InfrastructureBase):
    model_config = ConfigDict(from_attributes=True)


class InfrastructureListResponse(BaseModel):
    infrastructure: List[InfrastructureResponse]
    total: int


class RiskAssessmentBase(BaseModel):
    habitation_id: str
    hazard_score: float
    exposure_score: float
    vulnerability_score: float
    risk_score: float
    risk_level: RiskLevel
    assessment_date: datetime
    contributing_factors: List[str]


class RiskAssessmentResponse(RiskAssessmentBase):
    model_config = ConfigDict(from_attributes=True)


class RiskAssessmentListResponse(BaseModel):
    risk_assessments: List[RiskAssessmentResponse]
    total: int


class RiskComponentResponse(BaseModel):
    score: float
    factors: List[str] = []
    raw_data: Dict[str, Any] = {}


class RiskAssessmentDetailResponse(BaseModel):
    habitation_id: str
    habitation_name: str
    exposure: RiskComponentResponse
    vulnerability: RiskComponentResponse
    coping_capacity: RiskComponentResponse
    overall_score: float
    risk_level: RiskLevel
    primary_hazard: Optional[str] = None
    additional_hazards: List[str] = []
    contributing_factors: List[str] = []
    assessment_version: str = "1.0"
    weights_used: Dict[str, float] = {}
    thresholds_used: Dict[str, int] = {}


class RiskDistributionResponse(BaseModel):
    LOW: int = 0
    MODERATE: int = 0
    ELEVATED: int = 0
    HIGH: int = 0
    CRITICAL: int = 0


class RiskStatisticsResponse(BaseModel):
    total: int
    average_score: float
    min_score: float
    max_score: float
    distribution: RiskDistributionResponse
    high_critical_count: int


class RelocationSiteBase(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    geometry: Optional[GeoJSONPoint] = None
    total_capacity: int
    current_population: int
    available_capacity: int
    water_capacity: int
    housing_capacity: int
    healthcare_capacity: int
    school_capacity: int
    road_connectivity: Optional[str] = None
    electricity: int
    sanitation: int
    emergency_services: int
    environmental_status: Optional[str] = None


class RelocationSiteResponse(RelocationSiteBase):
    model_config = ConfigDict(from_attributes=True)


class RelocationSiteListResponse(BaseModel):
    relocation_sites: List[RelocationSiteResponse]
    total: int


class InfrastructureAssessmentDetail(BaseModel):
    name: str
    status: CapacityStatus
    score: float
    capacity: int
    demand: int
    factors: List[str] = []


class CapacityAssessmentBase(BaseModel):
    relocation_site_id: str
    site_name: str
    capacity_score: float
    capacity_status: CapacityStatus
    total_capacity: int
    current_population: int
    available_capacity: int
    utilization_percent: float
    water_status: CapacityStatus
    housing_status: CapacityStatus
    healthcare_status: CapacityStatus
    school_status: CapacityStatus
    road_status: CapacityStatus
    electricity_status: CapacityStatus
    sanitation_status: CapacityStatus
    environmental_status: CapacityStatus
    limiting_factors: List[str] = []
    infrastructure_assessments: List[InfrastructureAssessmentDetail] = []
    assessment_date: datetime


class CapacityAssessmentResponse(CapacityAssessmentBase):
    model_config = ConfigDict(from_attributes=True)


class CapacityAssessmentListResponse(BaseModel):
    capacity_assessments: List[CapacityAssessmentResponse]
    total: int


class CapacityStatisticsResponse(BaseModel):
    total_sites: int
    total_capacity: int
    total_current_population: int
    total_available_capacity: int
    overall_utilization: float
    average_capacity_score: float
    status_distribution: Dict[str, int]
    adequate_sites: int
    limited_sites: int
    stressed_sites: int
    insufficient_sites: int


class RelocationAssessmentBase(BaseModel):
    habitation_id: str
    relocation_site_id: str
    priority_score: float
    priority_level: PriorityLevel
    distance_km: float
    capacity_available: int
    recommendation: str
    reasoning: str


class RelocationAssessmentResponse(RelocationAssessmentBase):
    model_config = ConfigDict(from_attributes=True)


class RelocationAssessmentListResponse(BaseModel):
    relocation_assessments: List[RelocationAssessmentResponse]
    total: int


class SiteSuitability(str, Enum):
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    CONDITIONAL = "CONDITIONAL"
    UNSUITABLE = "UNSUITABLE"


class SiteRecommendationBase(BaseModel):
    relocation_site_id: str
    site_name: str
    match_score: float
    suitability: SiteSuitability
    available_capacity: int
    utilization_percent: float
    capacity_status: CapacityStatus
    capacity_score: float
    infrastructure_score: float
    environmental_score: float
    accessibility_score: float
    safety_score: float
    recommendation_reasons: List[str] = []
    limiting_factors: List[str] = []
    distance_km: float


class SiteRecommendationResponse(SiteRecommendationBase):
    model_config = ConfigDict(from_attributes=True)


class RelocationPriorityBase(BaseModel):
    habitation_id: str
    habitation_name: str
    risk_score: float
    risk_level: RiskLevel
    population: int
    exposure_score: float
    vulnerability_score: float
    hazard_score: float
    accessibility_factor: float
    relocation_priority_score: float
    priority_level: PriorityLevel
    priority_reason: str
    contributing_factors: List[str] = []


class RelocationPriorityResponse(RelocationPriorityBase):
    model_config = ConfigDict(from_attributes=True)


class RelocationPriorityListResponse(BaseModel):
    relocation_priorities: List[RelocationPriorityResponse]
    total: int


class RelocationRecommendationBase(BaseModel):
    habitation_id: str
    habitation_name: str
    risk_score: float
    risk_level: RiskLevel
    population: int
    exposure_score: float
    vulnerability_score: float
    hazard_score: float
    accessibility_factor: float
    priority_score: float
    priority_level: PriorityLevel
    priority_reason: str
    recommendations: List[SiteRecommendationResponse] = []


class RelocationRecommendationResponse(RelocationRecommendationBase):
    model_config = ConfigDict(from_attributes=True)


class PriorityStatisticsResponse(BaseModel):
    total_habitations: int
    p1_count: int
    p2_count: int
    p3_count: int
    p4_count: int
    average_priority_score: float
    total_population_at_risk: int
    priority_distribution: Dict[str, int]


class AlertBase(BaseModel):
    level: AlertLevel
    title: str
    message: str
    habitation_id: Optional[str] = None
    relocation_site_id: Optional[str] = None


class AlertResponse(AlertBase):
    id: int
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AlertListResponse(BaseModel):
    alerts: List[AlertResponse]
    total: int


class DashboardStatsResponse(BaseModel):
    total_habitations: int
    red_zone_habitations: int
    high_risk_habitations: int
    critical_habitations: int
    total_hazard_zones: int
    critical_hazard_zones: int
    relocation_sites: int
    available_relocation_capacity: int
    active_alerts: int


class HealthResponse(BaseModel):
    status: str
    service: str


class UserBase(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    role: UserRole


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class LoginRequest(BaseModel):
    username: str
    password: str


class LogoutResponse(BaseModel):
    message: str