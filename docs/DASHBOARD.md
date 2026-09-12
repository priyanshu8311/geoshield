# Dashboard Documentation

## Overview

The Dashboard is the central command center of the Disaster Risk & Relocation Intelligence Platform. It provides real-time situational awareness through key performance indicators, risk assessments, hazard monitoring, alert management, and decision-support summaries — all driven by live backend APIs.

## Purpose

- Provide at-a-glance operational status for disaster management officials
- Surface critical risk habitations requiring immediate action
- Monitor hazard zones and relocation capacity
- Deliver automated decision-support insights from real data
- Enable role-based quick actions for authorized workflows

---

## Components

### 1. Dashboard Header
**Location:** `src/layouts/MainLayout.tsx` (header section)
- Sticky top bar with system timestamp
- Notification bell with unread count (from `/api/alerts?is_read=false`)
- User menu with profile, role display, and logout
- Responsive mobile sidebar toggle

### 2. Sidebar Navigation
**Location:** `src/layouts/MainLayout.tsx` (aside section)
- Role-aware filtering via `hasPermission()` from AuthContext
- 8 navigation items: Dashboard, GIS Map, Risk Assessment, Red Zones, Carrying Capacity, Relocation, Alerts, Reports
- Future modules marked with "Soon" badge
- System status indicator at bottom

### 3. KPI Cards (6 Cards)
**Location:** `src/pages/Dashboard.tsx` → `src/components/dashboard/KPICard.tsx`

| Card | Value Source | Description |
|------|-------------|-------------|
| Habitations Monitored | `displayStats.total_habitations` | Total habitations from `/api/habitations/stats/summary` |
| High-Risk Zones | `high_risk_count + critical_risk_count` | Combined HIGH + CRITICAL risk habitations |
| Red-Zone Habitations | `summary.red_zone_habitations` | CRITICAL risk habitations from `/api/dashboard/summary` |
| Relocation Sites | `summary.relocation_sites` | Total relocation sites from `/api/relocation-sites` |
| Available Capacity | `summary.available_relocation_capacity` | Sum of `available_capacity` across all sites |
| Active Alerts | `summary.active_alerts` | Unread alerts from `/api/alerts/stats/summary` |

**Severity Coding:**
- `info` (blue): General monitoring
- `warning` (amber): Elevated attention
- `critical` (red): Immediate action required

### 4. Risk Overview
**Location:** `src/components/dashboard/RiskOverview.tsx`
- Displays 5 risk levels: CRITICAL, HIGH, ELEVATED, MODERATE, LOW
- Data source: `stats.habitations_by_risk` from `/api/habitations/stats/summary`
- Shows count, percentage, and horizontal bar proportional to max count
- Total habitations footer

### 5. Hazard Overview
**Location:** `src/components/dashboard/HazardOverview.tsx`
- Fetches directly from `/api/hazards`
- Groups by hazard type: Landslide, Flood, Cloudburst, Coastal Erosion, Flash Flood, River Erosion, Earthquake, Multi-Hazard
- Shows count, critical count (severity ≥ 85), max severity bar
- Only displays hazard types with count > 0

### 6. Priority Red Zones
**Location:** `src/components/dashboard/RedZoneSection.tsx`
- Fetches CRITICAL risk habitations from `/api/habitations?risk_level=CRITICAL&limit=10`
- For each habitation, fetches relocation assessment from `/api/relocation-assessments/habitation/{id}`
- Displays:
  - Name, district, state
  - Risk level badge, hazard type, population, risk score
  - Priority level (P1–P4) with color coding
  - **Recommended action** from relocation assessment (e.g., "Immediate relocation planning - Critical landslide risk")
  - Recommended relocation site ID
- "Immediate Action" badge for all critical habitations

### 7. Active Alerts
**Location:** `src/components/dashboard/ActiveAlerts.tsx`
- Fetches from `/api/alerts?is_read=false&limit=5`
- Color-coded by level: CRITICAL (red), HIGH (orange), WARNING (amber), INFO (blue)
- Relative time formatting (e.g., "2h ago", "3d ago")
- Shows habitation/site context when available

### 8. Relocation Capacity
**Location:** `src/components/dashboard/RelocationCapacity.tsx`
- Fetches from `/api/relocation-sites`
- Calculates utilization: `current_population / total_capacity * 100`
- Summary cards: Total Capacity, Current Population, Available Capacity
- Per-site rows with:
  - Utilization percentage with color-coded badge (green <40%, blue 40-60%, amber 60-80%, red >80%)
  - Horizontal progress bar
  - Total/Current/Available capacity numbers
  - Environmental status

### 9. Decision Support Summary
**Location:** `src/components/dashboard/DecisionSupportSummary.tsx`
- Auto-generates 5–6 insight statements from `DashboardStats` and `DashboardSummary`
- Insights cover:
  1. Red zone count
  2. High/critical risk count
  3. Hazard zones identified
  4. Relocation sites and available capacity
  5. Active alerts (with critical count)
- Prototype disclaimer footer

### 10. Quick Actions
**Location:** `src/components/dashboard/QuickActions.tsx`
- 6 action cards for future modules
- Role-aware: only shows actions user has permissions for
- Status badges: "Soon" (not implemented), "Restricted" (no permission), "Accessible" (ready)
- NavLink integration for future routing

### 11. System Health
**Location:** `src/components/dashboard/SystemHealth.tsx`
- Polls `/api/health` on mount
- Shows "System Healthy" (green) or "System Degraded" (red)
- Last checked timestamp
- API and Auth status sub-indicators

---

## APIs Used

| Endpoint | Purpose | Called By |
|----------|---------|-----------|
| `GET /api/health` | Backend health check | Dashboard (initial), SystemHealth |
| `GET /api/dashboard/summary` | Aggregated dashboard KPIs | Dashboard (initial) |
| `GET /api/habitations/stats/summary` | Habitation statistics | Dashboard (via fetchDashboardStats) |
| `GET /api/relocation-sites/stats/summary` | Relocation site statistics | Dashboard (via fetchDashboardStats) |
| `GET /api/alerts/stats/summary` | Alert statistics | Dashboard (via fetchDashboardStats), MainLayout (notification count) |
| `GET /api/habitations?risk_level=CRITICAL&limit=10` | Red zone habitations | RedZoneSection |
| `GET /api/relocation-assessments/habitation/{id}` | Relocation recommendation per habitation | RedZoneSection |
| `GET /api/hazards` | Hazard zones with severity | HazardOverview |
| `GET /api/alerts?is_read=false&limit=5` | Unread alerts | ActiveAlerts |
| `GET /api/relocation-sites` | All relocation sites | RelocationCapacity |

---

## KPI Calculations

All KPIs are computed server-side and/or derived from API responses:

- **Habitations Monitored**: `total_habitations` from habitation stats
- **High-Risk Zones**: `high_risk_count + critical_risk_count` (HIGH + CRITICAL)
- **Red-Zone Habitations**: `red_zone_habitations` from dashboard summary (CRITICAL only)
- **Relocation Sites**: Count of relocation sites
- **Available Relocation Capacity**: Sum of `available_capacity` across all sites
- **Active Alerts**: Count of unread alerts (`is_read = false`)

---

## Risk Overview

Displays distribution across 5 risk levels using `habitations_by_risk` from habitation stats:
- CRITICAL (red)
- HIGH (orange)
- ELEVATED (amber)
- MODERATE (yellow)
- LOW (green)

Each row shows: count, percentage of total, and proportional bar.

---

## Hazard Overview

Aggregates hazard zones from `/api/hazards` by `hazard_type`:
- Count per type
- Critical count (severity ≥ 85)
- Max severity indicator bar

Only types with >0 zones are displayed.

---

## Red Zone Section

Shows top 10 CRITICAL risk habitations with:
- Basic habitation info (name, district, population, hazard, risk score)
- Priority level from relocation assessment (P1–P4)
- **Recommended action** text from relocation assessment
- Recommended relocation site ID

Fetches relocation assessments in parallel after habitations load.

---

## Alerts

Shows 5 most recent unread alerts from `/api/alerts?is_read=false`:
- Level badge (CRITICAL/HIGH/WARNING/INFO)
- Title and message
- Relative timestamp
- Associated habitation/site if applicable

---

## Relocation Capacity

From `/api/relocation-sites`:
- **Utilization** = `current_population / total_capacity * 100`
- Color thresholds: <40% green, 40-60% blue, 60-80% amber, >80% red
- Summary totals across all sites
- Per-site breakdown with progress bars

---

## Authentication Integration

- Uses `AuthContext` (JWT in localStorage)
- `ProtectedRoute` wraps all authenticated routes
- `PublicRoute` wraps login page
- Role-based permissions via `ROLE_PERMISSIONS` map
- `hasPermission()` checks for navigation filtering and action cards
- Logout clears localStorage and redirects to login

---

## Error Handling

- All API calls wrapped in try/catch
- Loading states with skeleton UI
- Error states show user-friendly messages (no stack traces)
- 401 → automatic logout + redirect to login
- 403 → access denied page with role/permission info
- Network failures → graceful degradation with error message

---

## Demo Data Disclaimer

Displayed prominently at bottom of dashboard:

> **DEMO DATA —** The locations, population, hazard scores, risk assessments and relocation recommendations shown in this prototype are fictional/sample records created for demonstration. They are not official government data or official relocation orders.

Also appears on login page and in Decision Support Summary footer.

---

## Responsive Design

- Mobile-first Tailwind CSS
- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- Sidebar collapses to drawer on `< lg`
- KPI grid: 1 col mobile → 2 col tablet → 4 col desktop
- Hazard grid: 2 col mobile → 4 col desktop
- All tables/cards stack vertically on mobile

---

## File Structure

```
src/
├── pages/
│   └── Dashboard.tsx          # Main dashboard page
├── layouts/
│   └── MainLayout.tsx         # Shell with sidebar + header
├── components/
│   ├── dashboard/
│   │   ├── KPICard.tsx
│   │   ├── RiskOverview.tsx
│   │   ├── HazardOverview.tsx
│   │   ├── RedZoneSection.tsx
│   │   ├── ActiveAlerts.tsx
│   │   ├── RelocationCapacity.tsx
│   │   ├── DecisionSupportSummary.tsx
│   │   ├── QuickActions.tsx
│   │   ├── SystemHealth.tsx
│   │   └── index.ts
│   ├── ProtectedRoute.tsx
│   └── Icons.tsx
├── contexts/
│   └── AuthContext.tsx
├── services/
│   └── api.ts                 # All API fetch functions
└── App.tsx                    # Route definitions
```