from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db, is_database_available
from app.schemas import (
    RiskSummaryReport,
    RedZoneSummaryReport,
    RelocationCapacityReport,
    RelocationRecommendationReport,
    ReportOverviewResponse,
)
from app.services.fallback_data import fallback_service
from app.core.deps import get_current_active_user

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/risk-summary", response_model=RiskSummaryReport)
async def get_risk_summary_report(
    db: Optional[Session] = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    """Get risk summary report from Part 6 risk assessment data."""
    if is_database_available() and db:
        # For database mode, compute from stored data
        # For now, fall back to computed
        pass
    return fallback_service.get_risk_summary_report()


@router.get("/red-zones", response_model=RedZoneSummaryReport)
async def get_red_zone_summary_report(
    db: Optional[Session] = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    """Get red-zone/high-priority summary report from Part 8 data."""
    if is_database_available() and db:
        # For database mode, compute from stored data
        pass
    return fallback_service.get_red_zone_summary_report()


@router.get("/relocation-capacity", response_model=RelocationCapacityReport)
async def get_relocation_capacity_report(
    db: Optional[Session] = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    """Get relocation capacity report from Part 7 data."""
    if is_database_available() and db:
        # For database mode, compute from stored data
        pass
    return fallback_service.get_relocation_capacity_report()


@router.get("/relocation-recommendations", response_model=RelocationRecommendationReport)
async def get_relocation_recommendation_report(
    db: Optional[Session] = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    """Get relocation recommendations report from Part 8 data."""
    if is_database_available() and db:
        # For database mode, compute from stored data
        pass
    return fallback_service.get_relocation_recommendation_report()


@router.get("/overview", response_model=ReportOverviewResponse)
async def get_report_overview(
    db: Optional[Session] = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    """Get comprehensive report overview combining all reports."""
    if is_database_available() and db:
        # For database mode, compute from stored data
        pass
    return fallback_service.get_report_overview()