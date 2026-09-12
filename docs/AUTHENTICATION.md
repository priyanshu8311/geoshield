# Authentication & RBAC Documentation

## Overview

This document describes the authentication and role-based access control (RBAC) system implemented in Part 3 of the Hazard Relocation Platform.

## Architecture

```
React Frontend
    ↓
JWT Bearer Token (Authorization header)
    ↓
FastAPI Backend
    ↓
JWT Verification → User Lookup → Role/Permission Check
    ↓
Protected Endpoints
```

## Authentication

### JWT Token

- **Algorithm**: HS256
- **Expiration**: 60 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- **Payload**:
  - `sub`: User ID (UUID)
  - `username`: Username
  - `role`: User role
  - `exp`: Expiration timestamp

### Password Hashing

- **Algorithm**: bcrypt (via passlib)
- **Salt**: Automatically generated per password

## API Endpoints

### POST /api/auth/login

Authenticate a user and receive a JWT access token.

**Request:**
```json
{
  "username": "admin",
  "password": "Demo@123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid-string",
    "username": "admin",
    "email": "admin@disaster.gov.in",
    "full_name": "System Administrator",
    "role": "ADMIN",
    "is_active": true,
    "created_at": "2026-09-11T10:00:00Z"
  }
}
```

**Errors:**
- `401`: Incorrect username or password
- `401`: User account is disabled

### GET /api/auth/me

Get the currently authenticated user's information. Requires valid JWT.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "uuid-string",
  "username": "admin",
  "email": "admin@disaster.gov.in",
  "full_name": "System Administrator",
  "role": "ADMIN",
  "is_active": true,
  "created_at": "2026-09-11T10:00:00Z"
}
```

**Errors:**
- `401`: Invalid or missing token
- `401`: Inactive user

### POST /api/auth/logout

Logout endpoint. For JWT, logout is handled client-side by removing the token. This endpoint exists for documentation and API consistency.

**Response (200):**
```json
{
  "message": "Successfully logged out. Please remove the token client-side."
}
```

## User Roles

| Role | Description |
|------|-------------|
| `ADMIN` | Full system access, user management, all permissions |
| `DISASTER_MANAGEMENT_OFFICER` | Risk assessment, red zones, relocation recommendations, alerts management, reports |
| `GIS_ANALYST` | GIS data, hazards, habitations, infrastructure, risk layers |
| `PLANNING_OFFICER` | Carrying capacity, relocation sites, relocation recommendations, reports |
| `FIELD_OFFICER` | Assigned habitations, hazards, alerts, field data submission |
| `VIEWER` | Read-only: dashboard, map, basic risk information |

## Permissions

### Permission Mapping

| Permission | ADMIN | DMO | GIS | PLANNING | FIELD | VIEWER |
|------------|-------|-----|-----|----------|-------|--------|
| all | ✓ | | | | | |
| view_dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| view_map | ✓ | | ✓ | | | ✓ |
| view_risk | ✓ | ✓ | | | | ✓ |
| view_gis_data | ✓ | | ✓ | | | |
| view_habitations | ✓ | ✓ | ✓ | | | |
| view_hazards | ✓ | ✓ | ✓ | | ✓ | |
| view_infrastructure | ✓ | ✓ | ✓ | | | |
| view_red_zones | ✓ | ✓ | | | | |
| view_relocation_sites | ✓ | ✓ | | ✓ | | |
| view_relocation_recommendations | ✓ | ✓ | | ✓ | | |
| view_capacity | ✓ | ✓ | | ✓ | | |
| view_alerts | ✓ | ✓ | | | ✓ | |
| manage_alerts | ✓ | ✓ | | | | |
| view_reports | ✓ | ✓ | | ✓ | | |
| view_assigned_habitations | ✓ | | | | ✓ | |
| submit_field_data | ✓ | | | | ✓ | |

### Using Permissions in Code

```python
from app.core.deps import require_permission, require_role
from app.models import UserRole

# Require specific role
@router.get("/admin-only")
async def admin_endpoint(user: User = Depends(require_role(UserRole.ADMIN))):
    return {"message": "Admin only"}

# Require specific permission
@router.get("/risk-data")
async def risk_data(user: User = Depends(require_permission("view_risk"))):
    return {"data": "risk information"}

# Multiple roles allowed
@router.get("/officer-data")
async def officer_data(user: User = Depends(require_role(UserRole.DISASTER_MANAGEMENT_OFFICER, UserRole.ADMIN))):
    return {"data": "officer information"}
```

## Demo Users

**⚠️ WARNING: These are development/demo credentials. MUST be changed in production!**

| Username | Email | Role | Password |
|----------|-------|------|----------|
| admin | admin@disaster.gov.in | ADMIN | Demo@123 |
| dmo | dmo@disaster.gov.in | DISASTER_MANAGEMENT_OFFICER | Demo@123 |
| gis | gis@disaster.gov.in | GIS_ANALYST | Demo@123 |
| planner | planner@disaster.gov.in | PLANNING_OFFICER | Demo@123 |
| field | field@disaster.gov.in | FIELD_OFFICER | Demo@123 |
| viewer | viewer@disaster.gov.in | VIEWER | Demo@123 |

All passwords are hashed with bcrypt before storage. The plain text password is never stored.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing secret (CHANGE IN PRODUCTION!) | dev-secret-key-change-in-production |
| `ALGORITHM` | JWT algorithm | HS256 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration in minutes | 60 |
| `CORS_ORIGINS` | Comma-separated allowed origins | http://localhost:5173,http://127.0.0.1:5173 |

## Frontend Authentication

### Auth Context

The `AuthProvider` wraps the application and provides:

- `user`: Current user object
- `token`: JWT access token
- `isAuthenticated`: Boolean
- `isLoading`: Boolean (initial auth check)
- `login(username, password)`: Login function
- `logout()`: Logout function
- `hasRole(roles[])`: Check if user has any of the roles
- `hasPermission(permission)`: Check if user has permission

### Protected Routes

```tsx
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

// Protected - requires authentication
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// Protected - requires specific role
<ProtectedRoute allowedRoles={['ADMIN', 'DISASTER_MANAGEMENT_OFFICER']}>
  <AdminPanel />
</ProtectedRoute>

// Protected - requires specific permission
<ProtectedRoute requiredPermission="view_risk">
  <RiskPage />
</ProtectedRoute>

// Public - redirects authenticated users away
<PublicRoute>
  <LoginPage />
</PublicRoute>
```

### API Client

The API client automatically:
- Attaches `Authorization: Bearer <token>` header
- Handles 401 → redirects to `/login`
- Handles 403 → throws "Access denied" error

```typescript
import { setAuthToken } from './services/api';

// Set token after login
setAuthToken(accessToken);

// All subsequent requests include the token
const data = await fetchHabitations();
```

## Security Considerations

### Current Implementation (Prototype)

- JWT tokens stored in localStorage (vulnerable to XSS)
- No refresh token mechanism
- No token blacklisting on logout
- Demo passwords are simple for development
- CORS configured for development origins only

### Production Requirements

1. **Use HttpOnly cookies** for token storage
2. **Implement refresh tokens** with short-lived access tokens
3. **Add token blacklisting** (Redis) for immediate logout
4. **Enforce HTTPS** in production
5. **Use strong SECRET_KEY** (32+ random characters)
6. **Implement rate limiting** on auth endpoints
7. **Add audit logging** for all auth events
8. **Use secure password policies**
9. **Implement MFA** for admin accounts

## Error Responses

### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

### 403 Forbidden
```json
{
  "detail": "Insufficient permissions"
}
```

## Testing Credentials

### Login Tests

```bash
# Admin login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Demo@123"}'

# Get current user (with token)
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### Role-Based Access Tests

```bash
# Admin - should succeed
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <admin_token>"

# Viewer accessing admin endpoint - should fail 403
curl -X GET http://localhost:8000/api/admin-only \
  -H "Authorization: Bearer <viewer_token>"
```

## Frontend Demo Login

1. Navigate to `http://localhost:5173/login`
2. Click any demo user button (auto-fills credentials)
3. Click "Sign In"
4. Redirected to dashboard with role-appropriate navigation

## Disclaimer

> **DEMO DATA — The locations, population, hazard scores, risk assessments and relocation recommendations shown in this prototype are fictional/sample records created for demonstration. They are not official government data or official relocation orders.**

This authentication system is a prototype for demonstration purposes. Demo credentials are not production credentials and must be replaced with secure, properly managed credentials in any production deployment.