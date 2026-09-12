from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError

from app.database import get_db, is_database_available
from app.models import User, UserRole
from app.core.security import decode_token, TokenData
from app.services.fallback_data import fallback_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_fallback_user(user_id: str):
    """Get user from fallback demo users."""
    demo_users = {
        "demo-admin-id": {"id": "demo-admin-id", "username": "admin", "email": "admin@disaster.gov.in", "full_name": "System Administrator", "role": UserRole.ADMIN, "is_active": 1, "created_at": None},
        "demo-dmo-id": {"id": "demo-dmo-id", "username": "dmo", "email": "dmo@disaster.gov.in", "full_name": "Disaster Management Officer", "role": UserRole.DISASTER_MANAGEMENT_OFFICER, "is_active": 1, "created_at": None},
        "demo-gis-id": {"id": "demo-gis-id", "username": "gis", "email": "gis@disaster.gov.in", "full_name": "GIS Analyst", "role": UserRole.GIS_ANALYST, "is_active": 1, "created_at": None},
        "demo-planner-id": {"id": "demo-planner-id", "username": "planner", "email": "planner@disaster.gov.in", "full_name": "Planning Officer", "role": UserRole.PLANNING_OFFICER, "is_active": 1, "created_at": None},
        "demo-field-id": {"id": "demo-field-id", "username": "field", "email": "field@disaster.gov.in", "full_name": "Field Officer", "role": UserRole.FIELD_OFFICER, "is_active": 1, "created_at": None},
        "demo-viewer-id": {"id": "demo-viewer-id", "username": "viewer", "email": "viewer@disaster.gov.in", "full_name": "Viewer", "role": UserRole.VIEWER, "is_active": 1, "created_at": None},
    }
    user_data = demo_users.get(user_id)
    if user_data:
        return type('User', (), user_data)()
    return None


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Optional[Session] = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = decode_token(token)
    if token_data is None or token_data.user_id is None:
        raise credentials_exception
    
    if is_database_available() and db:
        user = db.query(User).filter(User.id == token_data.user_id).first()
    else:
        user = get_fallback_user(token_data.user_id)
    
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


def require_role(*allowed_roles: UserRole):
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker


def require_permission(permission: str):
    """
    Check if user has a specific permission.
    Permissions are mapped from roles.
    """
    def permission_checker(current_user: User = Depends(get_current_active_user)) -> User:
        user_permissions = ROLE_PERMISSIONS.get(current_user.role, [])
        if permission not in user_permissions and "all" not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission} required"
            )
        return current_user
    return permission_checker


# Role-based permissions mapping
ROLE_PERMISSIONS = {
    UserRole.ADMIN: ["all"],
    UserRole.DISASTER_MANAGEMENT_OFFICER: [
        "view_risk",
        "view_red_zones",
        "view_relocation_recommendations",
        "manage_alerts",
        "view_reports",
        "view_habitations",
        "view_hazards",
        "view_infrastructure",
        "view_relocation_sites",
        "view_capacity",
        "view_dashboard",
    ],
    UserRole.GIS_ANALYST: [
        "view_gis_data",
        "view_hazards",
        "view_habitations",
        "view_infrastructure",
        "view_risk_layers",
        "view_dashboard",
    ],
    UserRole.PLANNING_OFFICER: [
        "view_capacity",
        "view_relocation_sites",
        "view_relocation_recommendations",
        "view_reports",
        "view_dashboard",
    ],
    UserRole.FIELD_OFFICER: [
        "view_assigned_habitations",
        "view_hazards",
        "view_alerts",
        "submit_field_data",
        "view_dashboard",
    ],
    UserRole.VIEWER: [
        "view_dashboard",
        "view_map",
        "view_risk",
    ],
}