# Carrying Capacity Assessment Module

## Purpose

The Carrying Capacity Assessment module evaluates whether each relocation site has sufficient capacity and infrastructure to accommodate additional displaced population. It provides a comprehensive, deterministic, and explainable assessment of relocation site capacity based on available data.

## Inputs

The assessment uses the following data from existing relocation site records:

### Core Capacity Data
- **Total Capacity**: Maximum population the site can accommodate
- **Current Population**: Currently displaced population at the site
- **Available Capacity**: Remaining capacity (Total - Current)

### Infrastructure Capacity Data
- **Water Capacity**: Water supply capacity (people served)
- **Housing Capacity**: Shelter/housing capacity (people served)
- **Healthcare Capacity**: Healthcare facility capacity (people served)
- **School Capacity**: Education facility capacity (people served)

### Binary Infrastructure Indicators
- **Electricity**: Available (1) / Not Available (0)
- **Sanitation**: Available (1) / Not Available (0)

### Qualitative Infrastructure Data
- **Road Connectivity**: Text description (e.g., "Good - NH access", "Moderate - State highway")
- **Environmental Status**: Text description (e.g., "Stable - No hazard exposure", "Moderate flood risk")

## Capacity Calculation

### Utilization Percentage
```
Utilization = (Current Population / Total Capacity) × 100
```
Division by zero is handled by returning 0% when total capacity is 0.

### Infrastructure Component Assessment

Each infrastructure component is assessed independently:

#### Capacity-Based Components (Water, Housing, Healthcare, School)
- **SUFFICIENT (ADEQUATE)**: Capacity ≥ Demand (Score: 100)
- **LIMITED**: Capacity ≥ 50% Demand (Score: 50-99, proportional)
- **INSUFFICIENT**: Capacity < 50% Demand (Score: <50, proportional)

Demand is based on **current population** (actual demand) rather than total capacity (planning demand).

#### Binary Components (Electricity, Sanitation)
- **SUFFICIENT (ADEQUATE)**: Value = 1 (Available, Score: 100)
- **INSUFFICIENT**: Value = 0 (Not Available, Score: 0)

#### Qualitative Components (Road Access, Environmental Status)
Assessed based on text description keywords:
- **SUFFICIENT (ADEQUATE)**: Keywords like "excellent", "good", "highway", "stable", "protected", "no hazard"
- **LIMITED**: Keywords like "moderate", "fair", "state highway", "district road", "low risk", "elevated"
- **INSUFFICIENT**: Keywords like "poor", "very poor", "footpath", "high risk", "severe"

### Capacity Score Calculation

Overall capacity score (0-100, higher is better) is a weighted sum:

| Component | Weight |
|-----------|--------|
| Utilization (inverted: 100 - utilization%) | 30% |
| Water | 15% |
| Housing | 15% |
| Healthcare | 15% |
| School | 10% |
| Road Access | 5% |
| Electricity | 5% |
| Sanitation | 5% |

**Formula:**
```
Capacity Score = Σ(Component Score × Weight)
```

Note: Utilization is inverted (0% utilization = 100 score, 100% utilization = 0 score).

## Status Classification (Prototype/Demo Thresholds)

| Status | Criteria |
|--------|----------|
| **ADEQUATE** | Utilization < 50% AND all critical infrastructure (water, housing, healthcare) SUFFICIENT |
| **LIMITED** | Utilization 50-75% OR some critical infrastructure LIMITED |
| **STRESSED** | Utilization 75-90% OR critical infrastructure LIMITED with moderate utilization |
| **INSUFFICIENT** | Utilization > 90% OR any critical infrastructure INSUFFICIENT |

### Critical Infrastructure
Water, Housing, and Healthcare are classified as critical infrastructure. Their status has outsized impact on overall classification.

### Threshold Values (Configurable)
- Adequate utilization max: 50%
- Limited utilization max: 75%
- Stressed utilization max: 90%

> **⚠️ IMPORTANT: These thresholds are prototype/demo thresholds and are NOT official government standards.** They are designed for demonstration purposes only and should be calibrated with domain experts for production use.

## Infrastructure Factors

The following infrastructure components are assessed and displayed:

### Quantitative Capacity-vs-Demand Components
These components have explicit capacity values compared against current population demand:

1. **Water** - Water supply capacity vs demand
2. **Housing** - Shelter capacity vs demand
3. **Healthcare** - Healthcare facility capacity vs demand
4. **School** - Education capacity vs demand

### Qualitative Infrastructure Components
These components are assessed based on qualitative descriptions or binary availability, not capacity-vs-demand:

5. **Road Access** - Qualitative road connectivity assessment (text description)
6. **Electricity** - Binary availability (1=Available, 0=Unavailable)
7. **Sanitation** - Binary availability (1=Available, 0=Unavailable)
8. **Environmental Status** - Qualitative environmental risk assessment (text description)

Each component shows:
- Status (ADEQUATE/LIMITED/INSUFFICIENT)
- Score (0-100)
- Capacity vs Demand (quantitative only) or qualitative description
- Contributing factors

## Limiting Factors Generation

Limiting factors are generated differently for quantitative vs qualitative components:

- **Quantitative (Water, Housing, Healthcare, School)**: Show capacity vs demand comparisons (e.g., "Limited: Healthcare (2000 < 2800 demand)")
- **Qualitative (Road Access, Electricity, Sanitation, Environmental Status)**: Show human-readable status descriptions without capacity-vs-demand numbers (e.g., "Limited: Road Access - road access is moderate", "Critical: Sanitation - sanitation facilities are unavailable")

This avoids misleading "(0 vs 0 demand)" messages for components that don't use capacity-based assessment.

## API Endpoints

### GET `/api/capacity-assessments`
List all capacity assessments with optional filtering.

**Query Parameters:**
- `capacity_status` (optional): Filter by status (ADEQUATE, LIMITED, STRESSED, INSUFFICIENT)
- `relocation_site_id` (optional): Filter by site ID
- `limit` (default: 100, max: 500): Page size
- `offset` (default: 0): Pagination offset

**Response:**
```json
{
  "capacity_assessments": [...],
  "total": 5
}
```

### GET `/api/capacity-assessments/{assessment_id}`
Get a specific capacity assessment by database ID.

### GET `/api/capacity-assessments/site/{site_id}`
Get capacity assessment for a specific relocation site.

**Response:** Full `CapacityAssessmentResponse` with all infrastructure details.

### GET `/api/capacity-assessments/statistics/summary`
Get aggregate statistics across all relocation sites.

**Response:**
```json
{
  "total_sites": 5,
  "total_capacity": 18000,
  "total_current_population": 7800,
  "total_available_capacity": 10200,
  "overall_utilization": 43.3,
  "average_capacity_score": 80.8,
  "status_distribution": {
    "ADEQUATE": 3,
    "LIMITED": 0,
    "STRESSED": 2,
    "INSUFFICIENT": 0
  },
  "adequate_sites": 3,
  "limited_sites": 0,
  "stressed_sites": 2,
  "insufficient_sites": 0
}
```

## Frontend Page: `/carrying-capacity`

### Dashboard Summary
- Total relocation sites
- Total available capacity
- Overall utilization percentage
- Average capacity score
- Status distribution visualization (counts and percentages)

### Filtering
- **Search**: By site name or ID
- **Status Filter**: ADEQUATE, LIMITED, STRESSED, INSUFFICIENT, or All
- **Utilization Range**: Min/Max percentage filters

### Site Table
Sortable columns:
- Site Name
- Total Capacity
- Current Population
- Available Capacity
- Utilization % (with visual bar)
- Capacity Score
- Status (color-coded badge)
- Details (navigate to detail view)

### Site Detail View
Comprehensive view showing:
- Key metrics (capacity, population, utilization, score)
- Utilization progress bar with color coding
- Capacity status badge
- Infrastructure assessment grid (8 components)
- Detailed infrastructure table with scores, capacities, demands, and factors
- Limiting factors list (highlighted in red)

## Visual Indicators

- **Utilization Bar**: Green (<50%), Blue (50-75%), Amber (75-90%), Red (>90%)
- **Status Badges**: Green (ADEQUATE), Blue (LIMITED), Amber (STRESSED), Red (INSUFFICIENT)
- **Infrastructure Score Bars**: Color-coded by status
- **Capacity Score**: Large numeric display with context

## Limitations

1. **Prototype Thresholds**: Status classification thresholds are demo values, not official standards
2. **Current Demand Basis**: Infrastructure assessment uses current population as demand, not total capacity
3. **Static Data**: Assessment is computed on-demand from static relocation site data
4. **No Temporal Analysis**: Does not model capacity changes over time
5. **No Scenario Modeling**: Does not support surge capacity or what-if scenarios
6. **Qualitative Assessments**: Road and environmental assessments rely on text keyword matching

## Part 8 Compatibility

The output is designed for use by Part 8 (Relocation Engine):

- `relocation_site_id`: Unique site identifier
- `available_capacity`: Remaining capacity for new arrivals
- `utilization_percent`: Current utilization level
- `capacity_score`: Overall suitability score (0-100)
- `capacity_status`: Classified status (ADEQUATE/LIMITED/STRESSED/INSUFFICIENT)
- `infrastructure_assessments`: Detailed component scores for MCDA
- `limiting_factors`: Human-readable constraints for recommendation reasoning

## Demo Data Disclaimer

> **DEMO DATA** — The locations, population, hazard scores, risk assessments, carrying capacity assessments and relocation recommendations shown in this prototype are fictional/sample records created for demonstration. They are not official government data or official relocation orders.

> **PROTOTYPE THRESHOLDS** — Capacity status thresholds (ADEQUATE/LIMITED/STRESSED/INSUFFICIENT) are prototype/demo thresholds and are NOT official government standards.