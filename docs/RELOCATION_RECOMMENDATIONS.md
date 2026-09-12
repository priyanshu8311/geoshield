# Relocation Priority & Recommendation Engine

## Purpose

The Relocation Priority & Recommendation Engine provides decision-support for prioritizing vulnerable habitations and identifying suitable relocation sites. It combines risk assessment data from Part 6 with carrying capacity data from Part 7 to generate actionable relocation recommendations.

**Important**: This system provides **decision-support recommendations** only. It does not issue official relocation orders. All recommendations require validation and approval by authorized authorities.

## Inputs

The engine uses the following existing data sources:

### From Habitation Data (Part 2)
- `habitation_id`, `name`, `population`
- `latitude`, `longitude`
- `hazard_type`, `hazard_score`
- `exposure_score`, `vulnerability_score`, `risk_score`, `risk_level`

### From Risk Assessment (Part 6)
- Complete risk assessment with contributing factors
- Risk components: exposure, vulnerability, coping capacity

### From Carrying Capacity (Part 7)
- Relocation site capacity assessments
- Infrastructure assessments (water, housing, healthcare, school, etc.)
- Environmental status and limiting factors

### From Infrastructure Data (Part 2)
- Road connectivity, emergency response times
- Healthcare facilities, school counts

## Relocation Priority Calculation

### Priority Score Formula (0-100)

```
Priority Score = Risk × 0.50 + Population/Exposure × 0.20 + Vulnerability × 0.15 + Hazard Severity × 0.10 + Accessibility × 0.05
```

### Components

| Component | Weight | Source |
|-----------|--------|--------|
| Risk Score | 50% | Part 6 risk assessment (`risk_score`) |
| Population/Exposure | 20% | Habitation `population` + `exposure_score` |
| Vulnerability | 15% | Part 6 vulnerability assessment (`vulnerability_score`) |
| Hazard Severity | 10% | Habitation `hazard_score` |
| Accessibility | 5% | Infrastructure road connectivity + emergency response |

### Priority Levels

| Level | Score Range | Label | Description |
|-------|-------------|-------|-------------|
| **P1** | 90-100 | **IMMEDIATE** | Critical risk requiring immediate relocation planning |
| **P2** | 75-89.99 | **URGENT** | High risk requiring urgent relocation planning |
| **P3** | 50-74.99 | **PLANNED** | Elevated risk requiring planned relocation assessment |
| **P4** | 0-49.99 | **MONITOR** | Lower risk; continue monitoring and preparedness |

> **⚠️ PROTOTYPE THRESHOLDS**: These priority thresholds are prototype/demo values and are NOT official government standards.

### Priority Reason Generation

Human-readable reasons are generated based on priority level:

- **P1**: "Critical risk, high exposure and significant population require immediate relocation planning."
- **P2**: "High risk and significant population exposure require urgent relocation planning."
- **P3**: "Elevated risk requires planned relocation assessment and monitoring."
- **P4**: "Lower risk; continue monitoring and preparedness."

All reasons include the disclaimer: "Decision-support recommendation requires authority approval."

## Site Matching & Recommendation Engine

For each habitation requiring relocation, the engine evaluates all available relocation sites.

### Match Score Formula (0-100)

```
Match Score = Capacity × 0.30 + Infrastructure × 0.30 + Environmental × 0.15 + Accessibility × 0.10 + Safety × 0.15
```

### Components

| Component | Weight | Description |
|-----------|--------|-------------|
| **Capacity Suitability** | 30% | Available capacity vs habitation population |
| **Infrastructure Suitability** | 30% | Water, housing, healthcare, school, electricity, sanitation |
| **Environmental Suitability** | 15% | Environmental risk assessment |
| **Accessibility** | 10% | Distance + road connectivity |
| **Safety** | 15% | Site capacity status + environmental safety |

### Suitability Classification

| Level | Score Range | Description |
|-------|-------------|-------------|
| **EXCELLENT** | 85-100 | Highly suitable for relocation |
| **GOOD** | 70-84.99 | Suitable with minor limitations |
| **CONDITIONAL** | 50-69.99 | Suitable with notable limitations |
| **UNSUITABLE** | 0-49.99 | Not recommended for relocation |

> **⚠️ PROTOTYPE THRESHOLDS**: These suitability thresholds are prototype/demo values and are NOT official government standards.

### Recommendation Reasons

Positive factors (✓):
- Sufficient available capacity
- Adequate healthcare/water/housing/school
- Suitable environmental conditions
- Good road accessibility
- Close proximity

Negative factors (⚠):
- High utilization
- Limited healthcare/water/housing/school
- Poor road access
- Insufficient sanitation
- Environmental limitations

### Top 3 Recommendations

For each habitation, the engine returns:
1. **Primary Recommendation** - Highest match score
2. **Alternative 1** - Second highest match score
3. **Alternative 2** - Third highest match score

If all sites are UNSUITABLE, the response clearly indicates: "No suitable relocation site found."

## API Endpoints

### GET `/api/relocation-priority/statistics`
Get aggregate priority statistics across all habitations.

**Response:**
```json
{
  "total_habitations": 20,
  "p1_count": 0,
  "p2_count": 3,
  "p3_count": 13,
  "p4_count": 4,
  "average_priority_score": 63.7,
  "total_population_at_risk": 4990,
  "priority_distribution": {"P1": 0, "P2": 3, "P3": 13, "P4": 4}
}
```

### GET `/api/relocation-priority`
List all relocation priorities with optional filtering.

**Query Parameters:**
- `priority_level` (optional): P1, P2, P3, P4
- `risk_level` (optional): CRITICAL, HIGH, ELEVATED, MODERATE, LOW
- `limit` (default: 100, max: 500)
- `offset` (default: 0)

**Response:**
```json
{
  "relocation_priorities": [...],
  "total": 20
}
```

### GET `/api/relocation-priority/{habitation_id}`
Get priority assessment for a specific habitation.

**Response:** Full `RelocationPriorityResponse` with all components.

### GET `/api/relocation-priority/{habitation_id}/recommendations`
Get relocation site recommendations for a specific habitation.

**Response:** `RelocationRecommendationResponse` with top 3 site recommendations.

### GET `/api/relocation-priority/recommendations`
Get all relocation recommendations for all habitations.

**Response:** Array of `RelocationRecommendationResponse`.

## Frontend Page: `/relocation`

### Summary KPI Cards
- Total habitations assessed
- P1 — Immediate count
- P2 — Urgent count
- Available relocation capacity

### Priority Habitation Table
Columns:
- Habitation name
- Risk Score
- Risk Level (color-coded badge)
- Population
- Priority Score
- Priority Level (P1-P4 with labels)
- Action (View Recommendations button)

### Filters
- **Priority**: All, P1, P2, P3, P4
- **Risk Level**: All, CRITICAL, HIGH, ELEVATED, MODERATE, LOW
- **Search**: By habitation name or ID

### Sorting
Default sort order:
1. P1 first (IMMEDIATE)
2. P2 second (URGENT)
3. P3 third (PLANNED)
4. P4 last (MONITOR)

Within same priority: highest priority score first.

### Detail View
Clicking "View Recommendations" opens a detailed panel showing:

#### Habitation Information
- Risk score, risk level
- Population
- Priority score, priority level, priority reason

#### Risk Component Breakdown
- Hazard Score
- Exposure Score
- Vulnerability Score
- Accessibility Factor

#### Recommended Relocation Sites (Top 3)
For each site:
- Match score & suitability badge
- Available capacity, utilization %
- Capacity status
- Component scores (capacity, infrastructure, environmental, accessibility, safety)
- Distance
- Reasons (✓)
- Limiting factors (⚠)

### Loading / Error States
- Skeleton loaders for all components
- API error messages with retry option
- Empty state handling

## Authentication & RBAC

Reuses Part 3 authentication. The page requires authentication and respects existing roles:

| Role | Permissions |
|------|-------------|
| DISASTER_MANAGEMENT_OFFICER | view priorities, view recommendations |
| GIS_ANALYST | view priorities, view recommendations |
| PLANNING_OFFICER | view priorities, view recommendations |
| FIELD_OFFICER | view relevant recommendations |
| VIEWER | read-only access |
| ADMIN | full access |

## GIS Integration

The detail view includes "View on Map" actions for:
- Selected habitation
- Recommended relocation sites

These navigate to the existing `/map` route (Part 5) with appropriate filters.

## Demo Data Disclaimer

> **DEMO DATA** — The locations, population, hazard scores, risk assessments, carrying capacity assessments and relocation recommendations shown in this prototype are fictional/sample records created for demonstration. They are not official government data or official relocation orders.

> **DECISION-SUPPORT OUTPUTS** — Recommendations are decision-support outputs and require validation and approval by authorized authorities.

## Limitations

1. **Prototype Thresholds**: All classification thresholds (priority, suitability) are demo values, not official standards
2. **Static Data**: Assessment computed on-demand from static data
3. **No Temporal Analysis**: Does not model priority changes over time
4. **No Cost Modeling**: Does not include relocation cost estimation
5. **Simplified Distance**: Uses straight-line (Haversine) distance, not actual road distance
5. **Single Site Matching**: Does not optimize for multi-habitation site allocation conflicts

## Files Created/Modified

### Backend
- `backend/app/algorithms/relocation_engine.py` — New engine module
- `backend/app/algorithms/__init__.py` — Updated exports
- `backend/app/schemas/__init__.py` — Added new schemas
- `backend/app/api/relocation_priority.py` — New API endpoints
- `backend/app/api/__init__.py` — Registered new router
- `backend/app/services/fallback_data.py` — Added service methods

### Frontend
- `frontend/src/pages/Relocation.tsx` — New page component
- `frontend/src/services/api.ts` — Added types and API functions
- `frontend/src/layouts/MainLayout.tsx` — Removed "Soon" badge
- `frontend/src/App.tsx` — Updated route

### Documentation
- `docs/RELOCATION_RECOMMENDATIONS.md` — This file

## Testing Checklist

### Backend APIs
- [x] GET /api/health
- [x] GET /api/relocation-priority
- [x] GET /api/relocation-priority/statistics
- [x] GET /api/relocation-priority/recommendations
- [x] GET /api/relocation-priority/H001
- [x] GET /api/relocation-priority/H001/recommendations
- [x] Filter by priority_level works
- [x] Filter by risk_level works
- [x] Fixed routes (/statistics, /recommendations) NOT interpreted as {habitation_id}

### Frontend
- [x] Page loads at /relocation
- [x] KPI cards display correct data
- [x] Priority table loads with real data
- [x] Filters work (priority, risk, search)
- [x] Sorting works (P1→P4, then score desc)
- [x] Detail view opens on "View Recommendations"
- [x] Recommendations display correctly
- [x] Loading states work
- [x] Error states work
- [x] No critical TypeScript errors
- [x] npm run build passes

### Compatibility
- [x] Part 1-3: Backend startup, database, auth
- [x] Part 4: Dashboard still works
- [x] Part 5: GIS Map still works
- [x] Part 6: Risk Assessment still works
- [x] Part 7: Carrying Capacity still works
- [x] Login/logout still works