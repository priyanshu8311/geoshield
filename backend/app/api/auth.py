from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db, is_database_available
from app.models import User, UserRole
from app.schemas import Token, LoginRequest, LogoutResponse, UserResponse
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_active_user

router = APIRouter(prefix="/auth", tags=["auth"])

# Pre-computed PBKDF2-SHA256 hash for "Demo@123" (salt: e0159ecc86511783e503d394224310cf)
DEMO_PASSWORD_HASH = "e0159ecc86511783e503d394224310cf:73da3afa9778bb1f58b8d389e6ebccad418d0a7c429abfee13dd3abbc058db81"


def get_user_by_username(username: str, db: Optional[Session] = None):
    """Get user by username or email from database or fallback."""
    if is_database_available() and db:
        return db.query(User).filter(
            (User.username == username) | (User.email == username)
        ).first()
    else:
        # Fallback mode - check demo users
        demo_users = {
            "admin": {"id": "demo-admin-id", "username": "admin", "email": "admin@disaster.gov.in", "full_name": "System Administrator", "role": UserRole.ADMIN, "hashed_password": DEMO_PASSWORD_HASH, "is_active": 1},
            "dmo": {"id": "demo-dmo-id", "username": "dmo", "email": "dmo@disaster.gov.in", "full_name": "Disaster Management Officer", "role": UserRole.DISASTER_MANAGEMENT_OFFICER, "hashed_password": DEMO_PASSWORD_HASH, "is_active": 1},
            "gis": {"id": "demo-gis-id", "username": "gis", "email": "gis@disaster.gov.in", "full_name": "GIS Analyst", "role": UserRole.GIS_ANALYST, "hashed_password": DEMO_PASSWORD_HASH, "is_active": 1},
            "planner": {"id": "demo-planner-id", "username": "planner", "email": "planner@disaster.gov.in", "full_name": "Planning Officer", "role": UserRole.PLANNING_OFFICER, "hashed_password": DEMO_PASSWORD_HASH, "is_active": 1},
            "field": {"id": "demo-field-id", "username": "field", "email": "field@disaster.gov.in", "full_name": "Field Officer", "role": UserRole.FIELD_OFFICER, "hashed_password": DEMO_PASSWORD_HASH, "is_active": 1},
            "viewer": {"id": "demo-viewer-id", "username": "viewer", "email": "viewer@disaster.gov.in", "full_name": "Viewer", "role": UserRole.VIEWER, "hashed_password": DEMO_PASSWORD_HASH, "is_active": 1},
        }
        user_data = demo_users.get(username) or demo_users.get(username.split('@')[0] if '@' in username else username)
        if user_data:
            return type('User', (), user_data)()
    return None


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: Optional[Session] = Depends(get_db)
):
    user = get_user_by_username(login_data.username, db)
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled",
        )
    
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role.value}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=str(user.id),
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=bool(user.is_active),
            created_at=user.created_at if hasattr(user, 'created_at') else None
        )
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    return UserResponse.model_validate(current_user)


@router.post("/logout", response_model=LogoutResponse)
async def logout():
    # For JWT, logout is handled client-side by removing the token
    # This endpoint exists for documentation and consistency
    return {"message": "Successfully logged out. Please remove the token client-side."}