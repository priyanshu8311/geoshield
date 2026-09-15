from fastapi import APIRouter

from app.api import habitations, hazards, infrastructure, relocation_sites
from app.api import risk_assessments, capacity_assessments, relocation_assessments, alerts, dashboard, auth, reports

api_router = APIRouter()

api_router.include_router(habitations.router)
api_router.include_router(hazards.router)
api_router.include_router(infrastructure.router)
api_router.include_router(relocation_sites.router)
api_router.include_router(risk_assessments.router)
api_router.include_router(capacity_assessments.router)
api_router.include_router(relocation_assessments.router)
api_router.include_router(alerts.router)
api_router.include_router(dashboard.router)
api_router.include_router(auth.router)
api_router.include_router(reports.router)