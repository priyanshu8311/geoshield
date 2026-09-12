from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db, is_database_available
from app.models import Habitation, Hazard, RelocationSite, Alert, RiskLevel
from app.schemas import DashboardStatsResponse
from app.services.fallback_data import fallback_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardStatsResponse)
async def get_dashboard_summary(db: Session = Depends(get_db)):
    if is_database_available() and db:
        total_habitations = db.query(Habitation).count()

        red_zone_habitations = db.query(Habitation).filter(
            Habitation.risk_level == RiskLevel.CRITICAL
        ).count()

        high_risk_habitations = db.query(Habitation).filter(
            Habitation.risk_level == RiskLevel.HIGH
        ).count()

        critical_habitations = red_zone_habitations

        total_hazard_zones = db.query(Hazard).count()

        critical_hazard_zones = db.query(Hazard).filter(
            Hazard.severity >= 85.0
        ).count()

        relocation_sites = db.query(RelocationSite).count()

        available_relocation_capacity = db.query(RelocationSite).with_entities(
            __import__('sqlalchemy').func.sum(RelocationSite.available_capacity)
        ).scalar() or 0

        active_alerts = db.query(Alert).filter(Alert.is_read == 0).count()

        return {
            "total_habitations": total_habitations,
            "red_zone_habitations": red_zone_habitations,
            "high_risk_habitations": high_risk_habitations,
            "critical_habitations": critical_habitations,
            "total_hazard_zones": total_hazard_zones,
            "critical_hazard_zones": critical_hazard_zones,
            "relocation_sites": relocation_sites,
            "available_relocation_capacity": available_relocation_capacity,
            "active_alerts": active_alerts,
        }
    else:
        fallback_stats = fallback_service.get_dashboard_stats()
        return {
            "total_habitations": fallback_stats["total_habitations"],
            "red_zone_habitations": fallback_stats["critical_risk_count"],
            "high_risk_habitations": fallback_stats["high_risk_count"],
            "critical_habitations": fallback_stats["critical_risk_count"],
            "total_hazard_zones": len(fallback_service.hazards),
            "critical_hazard_zones": sum(
                1 for h in fallback_service.hazards
                if h.get("properties", {}).get("severity", 0) >= 85.0
            ),
            "relocation_sites": fallback_stats["relocation_sites_count"],
            "available_relocation_capacity": fallback_stats["available_capacity"],
            "active_alerts": fallback_stats["active_alerts"],
        }