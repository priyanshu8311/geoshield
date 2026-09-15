from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from app.database import get_db, is_database_available
import app.models
from app.models import Alert, AlertLevel, AlertStatus, AlertType, User, UserRole, Habitation, RelocationSite
from app.schemas import AlertResponse, AlertListResponse
from app.services.fallback_data import fallback_service
from app.core.deps import get_current_active_user, require_permission
from app.algorithms import generate_alerts_from_data

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=AlertListResponse)
async def list_alerts(
    level: Optional[AlertLevel] = Query(None),
    habitation_id: Optional[str] = Query(None),
    relocation_site_id: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Optional[Session] = Depends(get_db)
):
    if is_database_available() and db:
        query = db.query(Alert)

        if level:
            query = query.filter(Alert.level == level)
        if habitation_id:
            query = query.filter(Alert.habitation_id == habitation_id)
        if relocation_site_id:
            query = query.filter(Alert.relocation_site_id == relocation_site_id)
        if is_read is not None:
            query = query.filter(Alert.is_read == (1 if is_read else 0))

        query = query.order_by(Alert.created_at.desc())

        total = query.count()
        alerts = query.offset(offset).limit(limit).all()
    else:
        level_val = level.value if level else None
        result = fallback_service.get_alerts(
            level=level_val,
            habitation_id=habitation_id,
            relocation_site_id=relocation_site_id,
            is_read=is_read,
            limit=limit,
            offset=offset
        )
        alerts = result["alerts"]
        total = result["total"]

    return AlertListResponse(alerts=alerts, total=total)


@router.get("/stats/summary")
async def get_alerts_stats(db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        total = db.query(Alert).count()
        critical = db.query(Alert).filter(Alert.level == AlertLevel.CRITICAL).count()
        high = db.query(Alert).filter(Alert.level == AlertLevel.HIGH).count()
        warning = db.query(Alert).filter(Alert.level == AlertLevel.WARNING).count()
        info = db.query(Alert).filter(Alert.level == AlertLevel.INFO).count()
        unread = db.query(Alert).filter(Alert.is_read == 0).count()

        return {
            "total_alerts": total,
            "critical": critical,
            "high": high,
            "warning": warning,
            "info": info,
            "unread": unread,
        }
    else:
        return fallback_service.get_alerts_stats()


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: int,
    db: Optional[Session] = Depends(get_db),
    current_user: User = Depends(require_permission("manage_alerts")),
):
    if is_database_available() and db:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
    else:
        alert = fallback_service.get_alert(alert_id)

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Handle both dict and object access
    def get_status(a):
        return a.status if hasattr(a, 'status') else a.get('status', 'ACTIVE')
    
    def set_status(a, val):
        if hasattr(a, 'status'):
            a.status = val
        else:
            a['status'] = val
    
    def get_level(a):
        return a.level.value if hasattr(a, 'level') and hasattr(a.level, 'value') else (a.level if hasattr(a, 'level') else a.get('level'))

    if get_status(alert) == AlertStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Cannot acknowledge resolved alert")

    if is_database_available() and db:
        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_at = datetime.utcnow()
        alert.acknowledged_by = current_user.username
        alert.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(alert)
    else:
        set_status(alert, AlertStatus.ACKNOWLEDGED.value)
        alert["acknowledged_at"] = datetime.utcnow().isoformat() + "Z"
        alert["acknowledged_by"] = current_user.username
        alert["updated_at"] = datetime.utcnow().isoformat() + "Z"

    # Log audit
    if is_database_available() and db:
        from app.models import AuditLog
        audit = AuditLog(
            user_id=current_user.id,
            action="acknowledge_alert",
            entity_type="alert",
            entity_id=str(alert_id),
            details={"level": get_level(alert)},
        )
        db.add(audit)
        db.commit()

    return alert


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: int,
    db: Optional[Session] = Depends(get_db),
    current_user: User = Depends(require_permission("manage_alerts")),
):
    if is_database_available() and db:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
    else:
        alert = fallback_service.get_alert(alert_id)

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Handle both dict and object access
    def get_level(a):
        return a.level.value if hasattr(a, 'level') and hasattr(a.level, 'value') else (a.level if hasattr(a, 'level') else a.get('level'))
    
    def set_status(a, val):
        if hasattr(a, 'status'):
            a.status = val
        else:
            a['status'] = val

    if is_database_available() and db:
        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = datetime.utcnow()
        alert.resolved_by = current_user.username
        alert.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(alert)
    else:
        set_status(alert, AlertStatus.RESOLVED.value)
        alert["resolved_at"] = datetime.utcnow().isoformat() + "Z"
        alert["resolved_by"] = current_user.username
        alert["updated_at"] = datetime.utcnow().isoformat() + "Z"

    # Log audit
    if is_database_available() and db:
        from app.models import AuditLog
        audit = AuditLog(
            user_id=current_user.id,
            action="resolve_alert",
            entity_type="alert",
            entity_id=str(alert_id),
            details={"level": get_level(alert)},
        )
        db.add(audit)
        db.commit()

    return alert


@router.post("/generate", response_model=dict)
async def generate_alerts(
    db: Optional[Session] = Depends(get_db),
    current_user: User = Depends(require_permission("manage_alerts")),
):
    """Generate alerts from current risk, priority, and capacity data."""
    if is_database_available() and db:
        # For database mode, we'd fetch from DB
        habitations = db.query(app.models.Habitation).all()
        hab_dicts = [
            {
                "id": h.id,
                "name": h.name,
                "population": h.population,
                "risk_score": h.risk_score,
                "risk_level": h.risk_level.value if hasattr(h.risk_level, 'value') else h.risk_level,
                "relocation_priority": h.relocation_priority.value if hasattr(h.relocation_priority, 'value') else h.relocation_priority,
                "hazard_type": h.hazard_type.value if hasattr(h.hazard_type, 'value') else h.hazard_type,
                "hazard_score": h.hazard_score,
            }
            for h in habitations
        ]
        sites = db.query(app.models.RelocationSite).all()
        site_dicts = [
            {
                "id": s.id,
                "name": s.name,
                "total_capacity": s.total_capacity,
                "current_population": s.current_population,
                "available_capacity": s.available_capacity,
            }
            for s in sites
        ]
    else:
        habitations = fallback_service.habitations
        sites = fallback_service.relocation_sites
        hab_dicts = habitations
        site_dicts = sites

    new_alerts = generate_alerts_from_data(hab_dicts, site_dicts)

    if is_database_available() and db:
        for alert_data in new_alerts:
            # Check for existing similar alert to avoid duplicates
            existing = db.query(Alert).filter(
                Alert.habitation_id == alert_data.get("habitation_id"),
                Alert.alert_type == alert_data.get("alert_type"),
                Alert.status == AlertStatus.ACTIVE,
            ).first()
            if not existing:
                alert = Alert(**alert_data)
                db.add(alert)
        db.commit()
        count = len(new_alerts)
    else:
        # For fallback, prepend to alerts list
        for alert_data in reversed(new_alerts):
            alert_data["id"] = len(fallback_service.alerts) + 1
            alert_data["is_read"] = 0
            alert_data["created_at"] = datetime.utcnow().isoformat() + "Z"
            alert_data["updated_at"] = datetime.utcnow().isoformat() + "Z"
            fallback_service.alerts.insert(0, alert_data)
        count = len(new_alerts)

    # Log audit
    if is_database_available() and db:
        from app.models import AuditLog
        audit = AuditLog(
            user_id=current_user.id,
            action="generate_alerts",
            entity_type="alert",
            entity_id=None,
            details={"generated_count": count},
        )
        db.add(audit)
        db.commit()

    return {"message": f"Generated {count} new alerts", "generated_count": count}


@router.get("/statistics", response_model=dict)
async def get_alert_statistics(
    db: Optional[Session] = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get detailed alert statistics for dashboard."""
    if is_database_available() and db:
        total = db.query(Alert).count()
        by_level = {
            "CRITICAL": db.query(Alert).filter(Alert.level == AlertLevel.CRITICAL).count(),
            "HIGH": db.query(Alert).filter(Alert.level == AlertLevel.HIGH).count(),
            "WARNING": db.query(Alert).filter(Alert.level == AlertLevel.WARNING).count(),
            "INFO": db.query(Alert).filter(Alert.level == AlertLevel.INFO).count(),
        }
        by_status = {
            "ACTIVE": db.query(Alert).filter(Alert.status == AlertStatus.ACTIVE).count(),
            "ACKNOWLEDGED": db.query(Alert).filter(Alert.status == AlertStatus.ACKNOWLEDGED).count(),
            "RESOLVED": db.query(Alert).filter(Alert.status == AlertStatus.RESOLVED).count(),
        }
        by_type = {}
        for at in AlertType:
            by_type[at.value] = db.query(Alert).filter(Alert.alert_type == at).count()
        unread = db.query(Alert).filter(Alert.is_read == 0).count()

        # Recent alerts (last 7 days)
        from datetime import timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent = db.query(Alert).filter(Alert.created_at >= week_ago).count()

        return {
            "total_alerts": total,
            "by_level": by_level,
            "by_status": by_status,
            "by_type": by_type,
            "unread": unread,
            "recent_7_days": recent,
        }
    else:
        alerts = fallback_service.alerts
        by_level = {"CRITICAL": 0, "HIGH": 0, "WARNING": 0, "INFO": 0}
        by_status = {"ACTIVE": 0, "ACKNOWLEDGED": 0, "RESOLVED": 0}
        by_type = {}
        for a in alerts:
            by_level[a.get("level", "INFO")] = by_level.get(a.get("level", "INFO"), 0) + 1
            by_status[a.get("status", "ACTIVE")] = by_status.get(a.get("status", "ACTIVE"), 0) + 1
            at = a.get("alert_type", "SYSTEM_INFO")
            by_type[at] = by_type.get(at, 0) + 1
        unread = sum(1 for a in alerts if a.get("is_read", 0) == 0)

        return {
            "total_alerts": len(alerts),
            "by_level": by_level,
            "by_status": by_status,
            "by_type": by_type,
            "unread": unread,
            "recent_7_days": len(alerts),  # Simplified for demo
        }


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: int, db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
    else:
        alert = fallback_service.get_alert(alert_id)

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert