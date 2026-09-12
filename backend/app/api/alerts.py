from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db, is_database_available
from app.models import Alert, AlertLevel
from app.schemas import AlertResponse, AlertListResponse
from app.services.fallback_data import fallback_service

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


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: int, db: Optional[Session] = Depends(get_db)):
    if is_database_available() and db:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
    else:
        alert = fallback_service.get_alert(alert_id)

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


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