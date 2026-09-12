from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, Enum, ForeignKey, Index, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
import uuid
from datetime import datetime
from app.database import Base
import enum


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    ELEVATED = "ELEVATED"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class HazardType(str, enum.Enum):
    LANDSLIDE = "Landslide"
    FLOOD = "Flood"
    CLOUDBURST = "Cloudburst"
    COASTAL_EROSION = "Coastal Erosion"


class CapacityStatus(str, enum.Enum):
    ADEQUATE = "ADEQUATE"
    LIMITED = "LIMITED"
    STRESSED = "STRESSED"
    INSUFFICIENT = "INSUFFICIENT"


class PriorityLevel(str, enum.Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


class AlertLevel(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    WARNING = "WARNING"
    INFO = "INFO"


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    DISASTER_MANAGEMENT_OFFICER = "DISASTER_MANAGEMENT_OFFICER"
    GIS_ANALYST = "GIS_ANALYST"
    PLANNING_OFFICER = "PLANNING_OFFICER"
    FIELD_OFFICER = "FIELD_OFFICER"
    VIEWER = "VIEWER"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(Enum(UserRole), default=UserRole.VIEWER, nullable=False)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    audit_logs = relationship("AuditLog", back_populates="user")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=True)
    details = Column(JSON)
    ip_address = Column(String(45))
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")


class Habitation(Base):
    __tablename__ = "habitations"

    id = Column(String(20), primary_key=True)
    name = Column(String(255), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    population = Column(Integer, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    geometry = Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    hazard_type = Column(Enum(HazardType), nullable=False)
    hazard_score = Column(Float, nullable=False)
    exposure_score = Column(Float, nullable=False)
    vulnerability_score = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(Enum(RiskLevel), nullable=False)
    relocation_priority = Column(Enum(PriorityLevel), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    risk_assessments = relationship("RiskAssessment", back_populates="habitation")
    infrastructure = relationship("Infrastructure", back_populates="habitation", uselist=False)
    relocation_assessments = relationship("RelocationAssessment", back_populates="habitation")


class Hazard(Base):
    __tablename__ = "hazards"

    id = Column(String(20), primary_key=True)
    name = Column(String(255), nullable=False)
    hazard_type = Column(Enum(HazardType), nullable=False)
    severity = Column(Float, nullable=False)
    frequency = Column(String(50))
    description = Column(Text)
    geometry = Column(Geometry(geometry_type='MULTIPOLYGON', srid=4326), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Infrastructure(Base):
    __tablename__ = "infrastructure"

    id = Column(Integer, primary_key=True, autoincrement=True)
    habitation_id = Column(String(20), ForeignKey("habitations.id"), unique=True, nullable=False)
    roads_score = Column(Float, default=0)
    water_score = Column(Float, default=0)
    healthcare_score = Column(Float, default=0)
    schools_score = Column(Float, default=0)
    electricity_score = Column(Float, default=0)
    sanitation_score = Column(Float, default=0)
    emergency_services_score = Column(Float, default=0)
    road_connectivity = Column(String(50))
    water_source = Column(String(100))
    healthcare_facilities = Column(Integer, default=0)
    school_count = Column(Integer, default=0)
    electricity_coverage = Column(Float, default=0)
    sanitation_coverage = Column(Float, default=0)
    emergency_response_time = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    habitation = relationship("Habitation", back_populates="infrastructure")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    habitation_id = Column(String(20), ForeignKey("habitations.id"), nullable=False, index=True)
    hazard_score = Column(Float, nullable=False)
    exposure_score = Column(Float, nullable=False)
    vulnerability_score = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(Enum(RiskLevel), nullable=False)
    assessment_date = Column(DateTime, default=datetime.utcnow)
    contributing_factors = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    habitation = relationship("Habitation", back_populates="risk_assessments")


class RelocationSite(Base):
    __tablename__ = "relocation_sites"

    id = Column(String(20), primary_key=True)
    name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    geometry = Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    total_capacity = Column(Integer, nullable=False)
    current_population = Column(Integer, default=0)
    available_capacity = Column(Integer, nullable=False)
    water_capacity = Column(Integer, nullable=False)
    housing_capacity = Column(Integer, nullable=False)
    healthcare_capacity = Column(Integer, nullable=False)
    school_capacity = Column(Integer, nullable=False)
    road_connectivity = Column(String(50))
    electricity = Column(Integer, default=1)
    sanitation = Column(Integer, default=1)
    emergency_services = Column(Integer, default=1)
    environmental_status = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    capacity_assessments = relationship("CapacityAssessment", back_populates="relocation_site")
    relocation_assessments = relationship("RelocationAssessment", back_populates="relocation_site")


class CapacityAssessment(Base):
    __tablename__ = "capacity_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    relocation_site_id = Column(String(20), ForeignKey("relocation_sites.id"), nullable=False, index=True)
    capacity_score = Column(Float, nullable=False)
    capacity_status = Column(Enum(CapacityStatus), nullable=False)
    available_capacity = Column(Integer, nullable=False)
    water_status = Column(Enum(CapacityStatus), nullable=False)
    housing_status = Column(Enum(CapacityStatus), nullable=False)
    healthcare_status = Column(Enum(CapacityStatus), nullable=False)
    road_status = Column(Enum(CapacityStatus), nullable=False)
    assessment_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    relocation_site = relationship("RelocationSite", back_populates="capacity_assessments")


class RelocationAssessment(Base):
    __tablename__ = "relocation_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    habitation_id = Column(String(20), ForeignKey("habitations.id"), nullable=False, index=True)
    relocation_site_id = Column(String(20), ForeignKey("relocation_sites.id"), nullable=False, index=True)
    priority_score = Column(Float, nullable=False)
    priority_level = Column(Enum(PriorityLevel), nullable=False)
    distance_km = Column(Float, nullable=False)
    capacity_available = Column(Integer, nullable=False)
    recommendation = Column(Text)
    reasoning = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    habitation = relationship("Habitation", back_populates="relocation_assessments")
    relocation_site = relationship("RelocationSite", back_populates="relocation_assessments")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    level = Column(Enum(AlertLevel), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    habitation_id = Column(String(20), ForeignKey("habitations.id"), nullable=True, index=True)
    relocation_site_id = Column(String(20), ForeignKey("relocation_sites.id"), nullable=True, index=True)
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


Index("idx_habitations_risk_level", Habitation.risk_level)
Index("idx_habitations_hazard_type", Habitation.hazard_type)
Index("idx_hazards_hazard_type", Hazard.hazard_type)
Index("idx_relocation_sites_available_capacity", RelocationSite.available_capacity)
Index("idx_alerts_level_created", Alert.level, Alert.created_at)