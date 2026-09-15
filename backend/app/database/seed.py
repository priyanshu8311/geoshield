# pyright: basic, reportOptionalCall=false, reportOptionalMemberAccess=false, reportAttributeAccessIssue=false, reportInvalidTypeForm=false, reportArgumentType=false

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Handle optional dependencies
try:
    from geoalchemy2.shape import from_shape
    from shapely.geometry import Point, MultiPolygon, Polygon
    GEO_AVAILABLE = True
except ImportError:
    GEO_AVAILABLE = False
    from_shape = None
    Point = None
    MultiPolygon = None
    Polygon = None

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

try:
    from sqlalchemy.orm import Session
    from app.database import init_db, is_database_available, get_session_local
    from app.models import (
        Habitation, Hazard, Infrastructure, RiskAssessment,
        RelocationSite, CapacityAssessment, RelocationAssessment, Alert,
        User, UserRole
    )
    from app.core.security import get_password_hash
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    SQLALCHEMY_AVAILABLE = False
    Session = None
    init_db = None
    is_database_available = lambda: False
    get_session_local = lambda: None
    Habitation = Hazard = Infrastructure = RiskAssessment = None
    RelocationSite = CapacityAssessment = RelocationAssessment = Alert = None
    User = None
    UserRole = None
    get_password_hash = lambda p: p


SAMPLE_DATA_DIR = Path(__file__).parent.parent.parent.parent / "data" / "sample"


def load_json(filename: str):
    filepath = SAMPLE_DATA_DIR / filename
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def create_habitation_geometry(lat: float, lon: float):
    if not GEO_AVAILABLE:
        return None
    point = Point(lon, lat)
    return from_shape(point, srid=4326)


def create_hazard_geometry(coords):
    if not GEO_AVAILABLE:
        return None
    polygons = []
    for poly_coords in coords:
        polygons.append(Polygon(poly_coords[0]))
    multipoly = MultiPolygon(polygons)
    return from_shape(multipoly, srid=4326)


def create_relocation_site_geometry(lat: float, lon: float):
    if not GEO_AVAILABLE:
        return None
    point = Point(lon, lat)
    return from_shape(point, srid=4326)


def seed_habitations(db: Session):
    print("Seeding habitations...")
    data = load_json("habitations.json")
    count = 0
    for item in data:
        existing = db.query(Habitation).filter(Habitation.id == item["id"]).first()
        if existing:
            continue
        habitation = Habitation(
            id=item["id"],
            name=item["name"],
            district=item["district"],
            state=item["state"],
            population=item["population"],
            latitude=item["latitude"],
            longitude=item["longitude"],
            geometry=create_habitation_geometry(item["latitude"], item["longitude"]),
            hazard_type=item["hazard_type"],
            hazard_score=item["hazard_score"],
            exposure_score=item["exposure_score"],
            vulnerability_score=item["vulnerability_score"],
            risk_score=item["risk_score"],
            risk_level=item["risk_level"],
            relocation_priority=item["relocation_priority"],
        )
        db.add(habitation)
        count += 1
    db.commit()
    print(f"  Added {count} habitations")


def seed_hazards(db: Session):
    print("Seeding hazards...")
    data = load_json("hazards.geojson")
    count = 0
    for feature in data.get("features", []):
        props = feature["properties"]
        existing = db.query(Hazard).filter(Hazard.id == props["id"]).first()
        if existing:
            continue
        hazard = Hazard(
            id=props["id"],
            name=props["name"],
            hazard_type=props["hazard_type"],
            severity=props["severity"],
            frequency=props.get("frequency"),
            description=props.get("description"),
            geometry=create_hazard_geometry(feature["geometry"]["coordinates"]),
        )
        db.add(hazard)
        count += 1
    db.commit()
    print(f"  Added {count} hazards")


def seed_infrastructure(db: Session):
    print("Seeding infrastructure...")
    data = load_json("infrastructure.json")
    count = 0
    for item in data:
        existing = db.query(Infrastructure).filter(Infrastructure.habitation_id == item["habitation_id"]).first()
        if existing:
            continue
        infra = Infrastructure(
            habitation_id=item["habitation_id"],
            roads_score=item["roads_score"],
            water_score=item["water_score"],
            healthcare_score=item["healthcare_score"],
            schools_score=item["schools_score"],
            electricity_score=item["electricity_score"],
            sanitation_score=item["sanitation_score"],
            emergency_services_score=item["emergency_services_score"],
            road_connectivity=item.get("road_connectivity"),
            water_source=item.get("water_source"),
            healthcare_facilities=item.get("healthcare_facilities", 0),
            school_count=item.get("school_count", 0),
            electricity_coverage=item.get("electricity_coverage", 0),
            sanitation_coverage=item.get("sanitation_coverage", 0),
            emergency_response_time=item.get("emergency_response_time"),
        )
        db.add(infra)
        count += 1
    db.commit()
    print(f"  Added {count} infrastructure records")


def seed_risk_assessments(db: Session):
    print("Seeding risk assessments...")
    data = load_json("risk_assessments.json")
    count = 0
    for item in data:
        existing = db.query(RiskAssessment).filter(
            RiskAssessment.habitation_id == item["habitation_id"]
        ).first()
        if existing:
            continue
        assessment = RiskAssessment(
            habitation_id=item["habitation_id"],
            hazard_score=item["hazard_score"],
            exposure_score=item["exposure_score"],
            vulnerability_score=item["vulnerability_score"],
            risk_score=item["risk_score"],
            risk_level=item["risk_level"],
            assessment_date=datetime.fromisoformat(item["assessment_date"].replace('Z', '+00:00')),
            contributing_factors=item["contributing_factors"],
        )
        db.add(assessment)
        count += 1
    db.commit()
    print(f"  Added {count} risk assessments")


def seed_relocation_sites(db: Session):
    print("Seeding relocation sites...")
    data = load_json("relocation_sites.json")
    count = 0
    for item in data:
        existing = db.query(RelocationSite).filter(RelocationSite.id == item["id"]).first()
        if existing:
            continue
        site = RelocationSite(
            id=item["id"],
            name=item["name"],
            latitude=item["latitude"],
            longitude=item["longitude"],
            geometry=create_relocation_site_geometry(item["latitude"], item["longitude"]),
            total_capacity=item["total_capacity"],
            current_population=item["current_population"],
            available_capacity=item["available_capacity"],
            water_capacity=item["water_capacity"],
            housing_capacity=item["housing_capacity"],
            healthcare_capacity=item["healthcare_capacity"],
            school_capacity=item["school_capacity"],
            road_connectivity=item.get("road_connectivity"),
            electricity=item.get("electricity", 1),
            sanitation=item.get("sanitation", 1),
            emergency_services=item.get("emergency_services", 1),
            environmental_status=item.get("environmental_status"),
        )
        db.add(site)
        count += 1
    db.commit()
    print(f"  Added {count} relocation sites")


def seed_capacity_assessments(db: Session):
    print("Seeding capacity assessments...")
    data = load_json("capacity_assessments.json")
    count = 0
    for item in data:
        existing = db.query(CapacityAssessment).filter(
            CapacityAssessment.relocation_site_id == item["relocation_site_id"]
        ).first()
        if existing:
            continue
        assessment = CapacityAssessment(
            relocation_site_id=item["relocation_site_id"],
            capacity_score=item["capacity_score"],
            capacity_status=item["capacity_status"],
            available_capacity=item["available_capacity"],
            water_status=item["water_status"],
            housing_status=item["housing_status"],
            healthcare_status=item["healthcare_status"],
            road_status=item["road_status"],
            assessment_date=datetime.fromisoformat(item["assessment_date"].replace('Z', '+00:00')),
        )
        db.add(assessment)
        count += 1
    db.commit()
    print(f"  Added {count} capacity assessments")


def seed_relocation_assessments(db: Session):
    print("Seeding relocation assessments...")
    data = load_json("relocation_assessments.json")
    count = 0
    for item in data:
        existing = db.query(RelocationAssessment).filter(
            RelocationAssessment.habitation_id == item["habitation_id"],
            RelocationAssessment.relocation_site_id == item["relocation_site_id"]
        ).first()
        if existing:
            continue
        assessment = RelocationAssessment(
            habitation_id=item["habitation_id"],
            relocation_site_id=item["relocation_site_id"],
            priority_score=item["priority_score"],
            priority_level=item["priority_level"],
            distance_km=item["distance_km"],
            capacity_available=item["capacity_available"],
            recommendation=item["recommendation"],
            reasoning=item["reasoning"],
        )
        db.add(assessment)
        count += 1
    db.commit()
    print(f"  Added {count} relocation assessments")


def seed_alerts(db: Session):
    print("Seeding alerts...")
    data = load_json("alerts.json")
    count = 0
    for item in data:
        existing = db.query(Alert).filter(
            Alert.title == item["title"],
            Alert.created_at == datetime.fromisoformat(item["created_at"].replace('Z', '+00:00'))
        ).first()
        if existing:
            continue
        alert = Alert(
            level=item["level"],
            title=item["title"],
            message=item["message"],
            habitation_id=item.get("habitation_id"),
            relocation_site_id=item.get("relocation_site_id"),
            is_read=item.get("is_read", 0),
            created_at=datetime.fromisoformat(item["created_at"].replace('Z', '+00:00')),
        )
        db.add(alert)
        count += 1
    db.commit()
    print(f"  Added {count} alerts")


def seed_users(db: Session):
    print("Seeding demo users...")
    demo_password = "Demo@123"
    hashed_password = get_password_hash(demo_password)
    
    demo_users = [
        {
            "username": "admin",
            "email": "admin@disaster.gov.in",
            "full_name": "System Administrator",
            "role": UserRole.ADMIN,
            "hashed_password": hashed_password,
        },
        {
            "username": "dmo",
            "email": "dmo@disaster.gov.in",
            "full_name": "Disaster Management Officer",
            "role": UserRole.DISASTER_MANAGEMENT_OFFICER,
            "hashed_password": hashed_password,
        },
        {
            "username": "gis",
            "email": "gis@disaster.gov.in",
            "full_name": "GIS Analyst",
            "role": UserRole.GIS_ANALYST,
            "hashed_password": hashed_password,
        },
        {
            "username": "planner",
            "email": "planner@disaster.gov.in",
            "full_name": "Planning Officer",
            "role": UserRole.PLANNING_OFFICER,
            "hashed_password": hashed_password,
        },
        {
            "username": "field",
            "email": "field@disaster.gov.in",
            "full_name": "Field Officer",
            "role": UserRole.FIELD_OFFICER,
            "assigned_habitation_ids": ["H001", "H002"],
            "hashed_password": hashed_password,
        },
        {
            "username": "viewer",
            "email": "viewer@disaster.gov.in",
            "full_name": "Viewer",
            "role": UserRole.VIEWER,
            "hashed_password": hashed_password,
        },
    ]
    
    count = 0
    for user_data in demo_users:
        user_data.setdefault("assigned_habitation_ids", [])
        existing = db.query(User).filter(User.username == user_data["username"]).first()
        if existing:
            continue
        user = User(
            username=user_data["username"],
            email=user_data["email"],
            full_name=user_data["full_name"],
            role=user_data["role"],
            hashed_password=user_data["hashed_password"],
            assigned_habitation_ids=user_data["assigned_habitation_ids"],
            is_active=1,
        )
        db.add(user)
        count += 1
    db.commit()
    print(f"  Added {count} demo users")
    print(f"  Demo password for all users: {demo_password}")


def main():
    print("=" * 60)
    print("Database Seed Script - Hazard Relocation Platform")
    print("=" * 60)
    print(f"Sample data directory: {SAMPLE_DATA_DIR}")
    print(f"Database available: {is_database_available()}")
    print()

    if not SQLALCHEMY_AVAILABLE:
        print("SQLAlchemy not available - cannot seed database")
        print("Running in fallback mode only")
        print("=" * 60)
        return

    if not is_database_available():
        print("Database not available - skipping seed (fallback mode will be used)")
        print("=" * 60)
        return

    try:
        print("Creating tables...")
        init_db()
        print("Tables created successfully.")
        print()

        session_local = get_session_local()
        if not session_local:
            print("Could not create session - database may not be available")
            return

        db = session_local()
        try:
            seed_habitations(db)
            seed_hazards(db)
            seed_infrastructure(db)
            seed_risk_assessments(db)
            seed_relocation_sites(db)
            seed_capacity_assessments(db)
            seed_relocation_assessments(db)
            seed_alerts(db)
            seed_users(db)

            print()
            print("=" * 60)
            print("Seeding completed successfully!")
            print("=" * 60)
        finally:
            db.close()

    except Exception as e:
        print(f"Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()