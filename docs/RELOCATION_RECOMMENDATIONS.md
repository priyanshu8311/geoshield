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

```text
Priority Score = Risk × 0.50 + Population/Exposure × 0.20 + Vulnerability × 0.15 + Hazard Severity × 0.10 + Accessibility × 0.05
```

All terms in the formula are transformed component values in the inclusive range
`[0, 100]`; raw values must not be used directly. Define
`clamp100(x) = min(100, max(0, x))`, and apply it after every transformation.
The population reference `POP_REF` and response-time reference `RESPONSE_MAX`
are fixed, positive configuration constants published with each deployment;
they must not be calculated from the current batch of habitations.

The transformations are deterministic:

- **Risk** = `clamp100(risk_score)`, where `risk_score` is required to be a
  numeric value in `[0, 100]`.
- **Population/Exposure** =
  `clamp100((population_norm + exposure_score) / 2)`, where
  `population_norm = clamp100(100 × population / POP_REF)` for a non-negative
  population, and `exposure_score` is required to be numeric in `[0, 100]`.
  Population above `POP_REF` therefore scores 100 rather than increasing the
  final score without bound.
- **Vulnerability** = `clamp100(vulnerability_score)`, where
  `vulnerability_score` is required to be numeric in `[0, 100]`.
- **Hazard Severity** = `clamp100(hazard_score)`, where `hazard_score` is
  required to be numeric in `[0, 100]`.
- **Accessibility** = `clamp100((road_norm + response_norm) / 2)`. Map road
  connectivity to `road_norm` as **Excellent/NH or 4-lane = 100**,
  **Good/paved or state highway = 75**, **Moderate = 50**, **Poor = 25**,
  and **Very poor/none = 0**. Map emergency response time in minutes to
  `response_norm = clamp100(100 × (RESPONSE_MAX - response_time) /
  RESPONSE_MAX)` for a non-negative response time; times at or above
  `RESPONSE_MAX` score 0 and zero minutes score 100. Missing or unrecognized
  inputs are invalid and must not receive an implicit score.

Validate every transformed value is numeric and in `[0, 100]` before applying
the listed weights. Reject the assessment, or return a validation error, if a
required raw value is missing, non-numeric, negative, or outside its declared
range. Because the weights sum to 1.00 and each validated component is in
`[0, 100]`, the resulting Priority Score is also in `[0, 100]`; round only the
displayed value, not the value used for priority-level comparisons.

### Priority Score Components

| Component | Weight | Source |
| --- | --- | --- |
| Risk Score | 50% | Part 6 risk assessment (`risk_score`) |
| Population/Exposure | 20% | Habitation `population` + `exposure_score` |
| Vulnerability | 15% | Part 6 vulnerability assessment (`vulnerability_score`) |
| Hazard Severity | 10% | Habitation `hazard_score` |
| Accessibility | 5% | Infrastructure road connectivity + emergency response |

### Priority Levels

| Level | Score Range | Label | Description |
| --- | --- | --- | --- |
| **P1** | 90-100 | **IMMEDIATE** | Critical risk requiring immediate relocation planning |
| **P2** | 75-89.99 | **URGENT** | High risk requiring urgent relocation planning |
| **P3** | 50-74.99 | **PLANNED** | Elevated risk requiring planned relocation assessment |
| **P4** | 0-49.99 | **MONITOR** | Lower risk; continue monitoring and preparedness |

> **⚠️ PROTOTYPE THRESHOLDS**: These priority thresholds are prototype/demo values and are NOT official government standards.

### Priority Reason Generation

Human-readable reasons must be generated from the assessment's actual
normalized values, not from priority-level text alone. For each assessment,
calculate each component's weighted contribution (`component value × weight`)
and identify the two largest contributions as `dominant_components` (include
ties). The reason must name each selected component and its normalized value:
`Risk=<risk_score>, Population/Exposure=<population_exposure>,
Vulnerability=<vulnerability_score>, Hazard Severity=<hazard_score>, or
Accessibility=<accessibility>`. For Population/Exposure, include
`population_norm` and `exposure_score`; for Accessibility, include `road_norm`
and `response_norm` as the contributing sub-values.

Apply the following recommendation rules after computing the final score and
dominant components:

| Level | Rule | Required reason content |
| --- | --- | --- |
| **P1 / IMMEDIATE** | Score is 90-100; state that the dominant weighted factors require immediate relocation planning. | Actual dominant factor names and normalized values, including their weighted contributions. |
| **P2 / URGENT** | Score is 75-89.99; state that the dominant weighted factors require urgent relocation planning. | Actual dominant factor names and normalized values, including their weighted contributions. |
| **P3 / PLANNED** | Score is 50-74.99; state that the dominant weighted factors require planned relocation assessment and monitoring. | Actual dominant factor names and normalized values, including their weighted contributions. |
| **P4 / MONITOR** | Score is 0-49.99; state that the dominant weighted factors support continued monitoring and preparedness. | Actual dominant factor names and normalized values, including their weighted contributions. |

Use this structure so every reason reflects the data that drove its score:
`<level label>: <rule outcome>; dominant factors: <factor>=<normalized
value> (contribution=<weighted contribution>), <factor>=<normalized value>
(contribution=<weighted contribution>).` Do not substitute generic phrases such
as "high exposure" or "lower risk" when the corresponding normalized values
are unavailable. If a component is tied for a selected contribution, include
all tied factor names and values.

All reasons include the disclaimer: "Decision-support recommendation requires authority approval."

## Site Matching & Recommendation Engine

For each habitation requiring relocation, the engine evaluates all available relocation sites.

### Match Score Formula (0-100)

The `/relocation` Available Relocation Capacity KPI uses
`GET /api/relocation-sites/stats/summary`. Its `available_capacity` value is
the sum of `available_capacity` across all relocation sites, and its
`total_sites` value is the number of those sites. The KPI displays these
response values directly; they are not hardcoded and are independent of the
priority-statistics response.

```text
Match Score = Capacity × 0.30 + Infrastructure × 0.30 + Environmental × 0.15 + Accessibility × 0.10 + Safety × 0.15
```

All formula terms are numeric suitability values in the inclusive range
`[0, 100]`. Define `clamp100(x) = min(100, max(0, x))` and validate every
transformed value is numeric and within that range before applying the weights.
`MAX_DISTANCE_KM` is a fixed, positive configuration constant published with
the deployment; it must not be calculated from the current set of sites.

Use these deterministic transformations:

- **Capacity** = `clamp100(100 × available_capacity / habitation_population)`.
  `habitation_population` must be positive and `available_capacity` must be
  non-negative. Capacity above the habitation population is capped at 100;
  do not allow a ratio above 1.0 to increase the score. Missing, non-numeric,
  or invalid values must produce a validation error rather than a default
  score.
- **Infrastructure** = the equal-weight mean of the six normalized status
  values for water, housing, healthcare, school, electricity, and sanitation:
  `clamp100((water + housing + healthcare + school + electricity + sanitation) /
  6)`. Map each status consistently as **Excellent = 100**, **Good = 80**,
  **Moderate = 60**, **Poor = 30**, and **Very poor/None = 0**. An absent or
  unrecognized status is invalid.
- **Environmental** = `clamp100(environmental_status)`, using the categorical
  mapping **Suitable = 100**, **Moderate limitations = 60**, **Severe
  limitations = 20**, and **Unsuitable = 0**. An absent or unrecognized status
  is invalid.
- **Accessibility** = the equal-weight mean of distance and road connectivity:
  `clamp100((distance_norm + road_norm) / 2)`, where
  `distance_norm = clamp100(100 × (MAX_DISTANCE_KM - distance_km) /
  MAX_DISTANCE_KM)` for a non-negative distance. Zero distance scores 100 and
distance at or above `MAX_DISTANCE_KM` scores 0. Map road connectivity as
  **Excellent/NH or 4-lane = 100**, **Good/paved or state highway = 75**,
  **Moderate = 50**, **Poor = 25**, and **Very poor/None = 0**. Missing or
  unrecognized inputs are invalid.
- **Safety** = `clamp100(0.50 × capacity_status_norm + 0.50 ×
  environmental_safety_norm)`. Map both capacity status and environmental
  safety as **Safe/Available = 100**, **Conditional/Limited = 60**,
  **At risk/Critical = 20**, and **Unsafe/Unavailable = 0**. The two 50%
  subweights must be applied before the 15% overall Safety weight. Missing or
  unrecognized statuses are invalid.

Reject a site assessment, or return a validation error, if a required raw
value is missing, non-numeric, negative, or has an unrecognized category.
Apply suitability thresholds only after all component and subcomponent values
have been transformed and validated. Since the top-level weights sum to 1.00
and every component is bounded to `[0, 100]`, Match Score is also bounded to
`[0, 100]`.

### Match Score Components

| Component | Weight | Description |
| --- | --- | --- |
| **Capacity Suitability** | 30% | Available capacity vs habitation population |
| **Infrastructure Suitability** | 30% | Water, housing, healthcare, school, electricity, sanitation |
| **Environmental Suitability** | 15% | Environmental risk assessment |
| **Accessibility** | 10% | Distance + road connectivity |
| **Safety** | 15% | Site capacity status + environmental safety |

### Suitability Classification

| Level | Score Range | Description |
| --- | --- | --- |
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

For each habitation, the engine evaluates available sites, excludes every site
classified as **UNSUITABLE**, sorts the remaining suitable sites by Match Score
descending, and only then assigns recommendation slots:

1. **Primary Recommendation** - Highest-scoring suitable site
2. **Alternative 1** - Second-highest-scoring suitable site, when available
3. **Alternative 2** - Third-highest-scoring suitable site, when available

If fewer than three suitable sites remain, return only the available suitable
sites and leave the unused recommendation slots empty. If no suitable sites
remain after filtering, return the existing message: "No suitable relocation
site found."

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
| --- | --- |
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
>
> **DECISION-SUPPORT OUTPUTS** — Recommendations are decision-support outputs and require validation and approval by authorized authorities.

## Limitations

1. **Prototype Thresholds**: All classification thresholds (priority, suitability) are demo values, not official standards
2. **Static Data**: Assessment computed on-demand from static data
3. **No Temporal Analysis**: Does not model priority changes over time
4. **No Cost Modeling**: Does not include relocation cost estimation
5. **Simplified Distance**: Uses straight-line (Haversine) distance, not actual road distance
6. **Single Site Matching**: Does not optimize for multi-habitation site allocation conflicts

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

### Frontend UI

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
