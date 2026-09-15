from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.api import api_router, relocation_priority
from app.core.deps import get_current_active_user

app = FastAPI(
    title="Hazard Relocation Platform",
    version="0.1.0"
)

# CORS Configuration
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(
    relocation_priority.router,
    prefix="/api",
    dependencies=[Depends(get_current_active_user)],
)


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "hazard-relocation-platform"
    }


@app.get("/")
async def root():
    return {
        "service": "hazard-relocation-platform",
        "version": "0.1.0",
        "status": "running"
    }