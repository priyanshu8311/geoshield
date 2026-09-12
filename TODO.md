# TODO Checklist

## Part 4 — Professional Dashboard

### Core Components
- [x] Professional dashboard header
- [x] Sidebar navigation
- [x] KPI cards (6 cards: Habitations Monitored, High-Risk Zones, Red-Zone Habitations, Relocation Sites, Available Capacity, Active Alerts)
- [x] Dashboard API integration (fetchDashboardStats, fetchDashboardSummary, fetchHealth)
- [x] Risk overview (LOW, MODERATE, ELEVATED, HIGH, CRITICAL with real data)
- [x] Hazard overview (hazard types and severity from /api/hazards)
- [x] Priority red-zone section (critical risk habitations with relocation recommendations)
- [x] Active alerts (from /api/alerts)
- [x] Relocation capacity (from /api/relocation-sites with utilization calculation)
- [x] Decision-support summary (auto-generated from API data)
- [x] Quick actions (role-aware with coming soon labels)
- [x] System health indicator (from /api/health)

### Authentication & Authorization
- [x] Part 3 authentication integration
- [x] Role-aware navigation (filtered by permissions)
- [x] Logout functionality
- [x] Protected routes with role/permission checks

### UX & Quality
- [x] Loading states (skeleton loaders for all components)
- [x] Error states (graceful error handling in all components)
- [x] Network failure handling
- [x] 401/403 handling (redirect to login, access denied pages)
- [x] Responsive design (desktop, laptop, tablet)
- [x] No critical browser console errors
- [x] Demo-data disclaimer (visible on dashboard)

### Documentation
- [x] docs/DASHBOARD.md created
- [x] roadmap.md updated (Part 4 marked COMPLETE)
- [x] TODO.md created and updated

### Testing
- [x] GET /api/health
- [x] GET /api/dashboard/summary
- [x] GET /api/habitations
- [x] GET /api/hazards
- [x] GET /api/relocation-sites
- [x] GET /api/alerts
- [x] GET /api/relocation-assessments/habitation/{id}
- [x] Login as admin - dashboard loads
- [x] KPI values appear and match API
- [x] Risk section loads with real data
- [x] Hazard section loads with real data
- [x] Red-zone section loads with recommendations
- [x] Alerts load
- [x] Relocation capacity loads with utilization
- [x] System health displays
- [x] Logout works
- [x] Refresh works
- [x] Viewer login works
- [x] Role-based navigation works
- [x] No critical browser console errors
- [x] Part 2 APIs remain functional

---

## Part 5 — Interactive GIS Hazard & Risk Map

### Core Components
- [x] GIS Map page at `/map` integrated with app shell
- [x] Leaflet + React Leaflet + OpenStreetMap base layer
- [x] Sensible initial center/zoom for demo dataset
- [x] Zoom controls and attribution

### Map Layers
- [x] Habitation markers with risk-level color coding
- [x] Hazard zone polygons (MultiPolygon) with hazard-type colors
- [x] Relocation site markers with utilization color coding
- [x] Infrastructure markers at habitation coordinates (with offsets)
- [x] Layer control panel (independent toggles for all 4 layers)

### Map Features
- [x] Professional legend (risk levels, hazard severity, relocation utilization)
- [x] Filters: Risk Level (5 levels), Hazard Type (4 types), Severity (4 levels), Status
- [x] Search: habitation names/IDs, hazard names/IDs, relocation site names/IDs
- [x] Feature details slide-in panel (habitation, hazard, relocation, infrastructure)
- [x] Map statistics panel (real-time filtered counts)
- [x] Demo data disclaimer prominently displayed

### Data Integration
- [x] Uses existing habitation API (`/api/habitations`)
- [x] Uses existing hazard API (`/api/hazards`) with GeoJSON geometry
- [x] Uses existing relocation-sites API (`/api/relocation-sites`)
- [x] Uses existing infrastructure API (`/api/infrastructure`)
- [x] No hardcoded duplicate data

### Authentication & RBAC
- [x] Protected `/map` route (reuses Part 3 auth)
- [x] Permissions: `view_gis_data` / `view_map`
- [x] Role-aware navigation (GIS_ANALYST, VIEWER, ADMIN)
- [x] Existing logout works
- [x] Dashboard authentication unaffected

### UX & Quality
- [x] Loading states (full-screen spinner)
- [x] Error states (per-dataset error messages in sidebar)
- [x] Empty/invalid geometry handled gracefully
- [x] Responsive design (desktop, laptop, tablet, mobile)
- [x] No critical browser console errors
- [x] Frontend build/type-check succeeds

### Documentation
- [x] docs/GIS_MAP.md created with full architecture documentation

### Testing
- [x] Frontend starts successfully
- [x] Backend starts successfully
- [x] Dashboard still works
- [x] Login/logout still works
- [x] `/map` loads
- [x] OpenStreetMap renders
- [x] Habitation markers render
- [x] Hazard polygons render
- [x] Relocation markers render
- [x] Infrastructure layer works where coordinates exist
- [x] Layer controls work
- [x] Legend works
- [x] Filters work
- [x] Search works
- [x] Feature details work
- [x] Map statistics match API data
- [x] Loading/error states work
- [x] No major browser console errors
- [x] Frontend build/type-check succeeds
- [x] Existing Parts 1–4 not broken

---

## Part 6 — Intelligent Risk Assessment Engine

### Core Risk Model
- [x] Explainable weighted risk formula: Risk = (Exposure × 0.50) + (Vulnerability × 0.30) + ((100 - Coping Capacity) × 0.20)
- [x] Configurable weights via RiskWeights class
- [x] Configurable classification thresholds via RiskThresholds class
- [x] Classification: LOW (0-20), MODERATE (21-40), ELEVATED (41-60), HIGH (61-80), CRITICAL (81-100)

### Multi-Hazard Assessment
- [x] Spatial point-in-polygon intersection with hazard zone MultiPolygons
- [x] Primary hazard identification (highest severity)
- [x] Additional hazards detection
- [x] Combined exposure bonus for multiple hazards

### Exposure Score
- [x] Base: habitation hazard_score (primary)
- [x] Population exposure factor
- [x] Spatial hazard intersection bonus
- [x] Explainable factors list

### Vulnerability Score
- [x] Base: habitation vulnerability_score (primary)
- [x] Infrastructure deficits (healthcare, emergency, roads, schools)
- [x] Population vulnerability factors
- [x] Explainable factors list

### Coping Capacity Score
- [x] Base: average infrastructure scores
- [x] Healthcare facilities bonus/penalty
- [x] Emergency response time bonus/penalty
- [x] Road connectivity bonus/penalty
- [x] Water/sanitation/electricity coverage bonuses
- [x] Explainable factors list

### Risk Assessment APIs
- [x] GET /api/risk-assessments/distribution - Risk level counts
- [x] GET /api/risk-assessments/statistics - Aggregate stats (avg, min, max, high+critical)
- [x] GET /api/risk-assessments/detail/{habitation_id} - Full component breakdown
- [x] GET /api/risk-assessments/all-detailed - All habitations with details
- [x] Existing endpoints preserved: /risk-assessments, /risk-assessments/{id}, /risk-assessments/habitation/{id}

### Risk Assessment UI
- [x] Route /risk-assessment integrated with app shell
- [x] Summary statistics cards (total, avg score, high+critical, range, version)
- [x] Risk distribution visualization (counts + percentages for all 5 levels)
- [x] Methodology panel explaining formula and weights
- [x] Habitation risk table (sortable by risk level, with score, classification, primary hazard)
- [x] Loading states (skeleton loaders)
- [x] Error states (graceful API error handling)
- [x] Demo data disclaimer prominently displayed
- [x] Responsive design (desktop, tablet, mobile)

### Authentication & RBAC
- [x] Protected route reuses Part 3 auth
- [x] Permissions: view_risk / view_risk_layers
- [x] Role-aware navigation (GIS_ANALYST, VIEWER, ADMIN)
- [x] Existing logout works
- [x] Dashboard/GIS authentication unaffected

### Data Consistency
- [x] Same source data as Dashboard and GIS Map
- [x] Risk engine produces consistent classifications
- [x] Distribution: CRITICAL=5, HIGH=9, ELEVATED=3, MODERATE=3, LOW=0 (20 total)

### Documentation
- [x] docs/RISK_ASSESSMENT.md created with full methodology

### Testing
- [x] Backend starts successfully
- [x] Frontend builds successfully (TypeScript + Vite)
- [x] API endpoints return 200 with correct data
- [x] GET /api/health
- [x] GET /api/risk-assessments
- [x] GET /api/risk-assessments/distribution
- [x] GET /api/risk-assessments/statistics
- [x] GET /api/risk-assessments/detail/H001
- [x] GET /api/risk-assessments/all-detailed
- [x] GET /api/risk-assessments/habitation/H001
- [x] Dashboard still works
- [x] GIS Map still works
- [x] Login/logout still works
- [x] No critical browser console errors
- [x] Existing Parts 1-5 not broken

---

## Part 7 — Carrying Capacity Assessment

### Core Capacity Model
- [x] Deterministic, explainable carrying capacity assessment engine
- [x] Utilization calculation (Current Population / Total Capacity × 100) with zero-division handling
- [x] Infrastructure component assessment (Water, Housing, Healthcare, School, Road, Electricity, Sanitation, Environmental)
- [x] Configurable weights via CapacityWeights class (Utilization 30%, Water 15%, Housing 15%, Healthcare 15%, School 10%, Road 5%, Electricity 5%, Sanitation 5%)
- [x] Configurable classification thresholds via CapacityThresholds class (Prototype/Demo values)
- [x] Classification: ADEQUATE, LIMITED, STRESSED, INSUFFICIENT

### Capacity Assessment Logic
- [x] Capacity-based infrastructure assessment (capacity vs demand with SUFFICIENT/LIMITED/INSUFFICIENT)
- [x] Binary infrastructure assessment (Electricity, Sanitation)
- [x] Qualitative infrastructure assessment (Road connectivity, Environmental status)
- [x] Weighted capacity score calculation (0-100)
- [x] Status determination based on utilization + critical infrastructure status
- [x] Limiting factors identification
- [x] Explainable factors list for each component

### Capacity Assessment APIs
- [x] GET /api/capacity-assessments - List with filtering (status, site_id)
- [x] GET /api/capacity-assessments/{assessment_id} - By database ID
- [x] GET /api/capacity-assessments/site/{site_id} - By relocation site ID
- [x] GET /api/capacity-assessments/statistics/summary - Aggregate statistics
- [x] Static routes defined before parameterized routes (avoiding route-order bugs)

### Carrying Capacity UI
- [x] Route /carrying-capacity integrated with app shell
- [x] Dashboard summary (total sites, available capacity, overall utilization, avg score)
- [x] Status distribution visualization (counts + percentages for all 4 levels)
- [x] Methodology panel explaining formula and weights
- [x] Relocation site table (sortable by all columns)
- [x] Filtering: Search by name/ID, Status filter, Utilization range filter
- [x] Site detail view with full infrastructure breakdown
- [x] Visual indicators: Utilization bars, Status badges, Score indicators
- [x] Loading states (skeleton loaders)
- [x] Error states (graceful API error handling)
- [x] Demo data disclaimer prominently displayed
- [x] Prototype thresholds disclaimer
- [x] Responsive design (desktop, tablet, mobile)

### Authentication & RBAC
- [x] Protected route reuses Part 3 auth
- [x] Permissions: view_capacity
- [x] Role-aware navigation (GIS_ANALYST, VIEWER, ADMIN, etc.)
- [x] Existing logout works
- [x] Dashboard/GIS/Risk authentication unaffected
- [x] Read-only module (no editing implemented)

### Data Consistency
- [x] Uses existing relocation site data (no duplicate data)
- [x] Capacity engine produces consistent classifications
- [x] Sample data: 3 ADEQUATE, 0 LIMITED, 2 STRESSED, 0 INSUFFICIENT (5 total)

### Documentation
- [x] docs/CARRYING_CAPACITY.md created with full methodology

### Testing
- [x] Backend starts successfully
- [x] Frontend builds successfully (TypeScript + Vite)
- [x] GET /api/health
- [x] GET /api/relocation-sites
- [x] GET /api/capacity-assessments
- [x] GET /api/capacity-assessments/site/R001
- [x] GET /api/capacity-assessments/statistics/summary
- [x] Filter by capacity_status works
- [x] Dashboard still works
- [x] GIS Map still works
- [x] Risk Assessment still works
- [x] Login/logout still works
- [x] No critical browser console errors
- [x] Existing Parts 1-6 not broken