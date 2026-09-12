# Risk Assessment Engine Documentation

## Overview

The Risk Assessment Engine provides an intelligent, explainable, habitation-level multi-hazard risk assessment system. It implements a weighted risk model combining Hazard Exposure, Vulnerability, and Coping Capacity into a single 0-100 risk score with clear classification.

**Route**: `/risk-assessment`

This is a **decision-support prototype** — not an official government risk classification system.

---

## Risk Methodology

### Formula

```
Risk Score = (Exposure × 0.50) + (Vulnerability × 0.30) + ((100 - Coping Capacity) × 0.20)
```

- **Exposure (50%)**: Hazard intensity and population exposure
- **Vulnerability (30%)**: Susceptibility to harm
- **Coping Capacity (20%)**: Ability to withstand/respond (inverted: higher capacity = lower risk)

### Classification Thresholds

| Level | Score Range | Description |
|-------|-------------|-------------|
| LOW | 0–20 | Minimal risk |
| MODERATE | 21–40 | Low risk, monitoring recommended |
| ELEVATED | 41–60 | Moderate risk, preparedness needed |
| HIGH | 61–80 | High risk, mitigation planning required |
| CRITICAL | 81–100 | Critical risk, immediate action needed |

Thresholds are configurable via `RiskThresholds` class.

---

## Component Calculations

### 1. Exposure Score (0–100)

**Primary Source**: Habitation `hazard_score` (already normalized 0–100)

**Enhancements**:
- Population exposure: `min(population / 10000 × 8, 8)` points
- Spatial hazard intersection: Up to 5 points from intersecting hazard zone severity

**Factors** (explainable):
- "Hazard score (primary): 92.5"
- "Population exposure (1240): +1.0"
- "Hazard zone intersection bonus: +2.3"

### 2. Vulnerability Score (0–100)

**Primary Source**: Habitation `vulnerability_score` (already normalized 0–100)

**Enhancements**:
- No healthcare facilities: +5
- Slow emergency response (>120 min): +4
- Very poor road connectivity: +4
- No school: +2
- Large population (>3000): +3
- Small isolated population (<500): +2

**Factors** (explainable):
- "Base vulnerability score: 85.0"
- "No healthcare facilities: +5"
- "Large population (1240): +3"

### 3. Coping Capacity Score (0–100)

**Base**: Average of 6 infrastructure scores (healthcare, emergency, roads, water, electricity, sanitation)

**Enhancements**:
- Multiple healthcare facilities (≥3): +10
- Healthcare facility present (≥1): +5
- No healthcare: -5
- Fast emergency response (≤20 min): +10
- Moderate emergency response (≤60 min): +5
- Slow emergency response (>60 min): -5
- Excellent road connectivity (NH/4-lane): +8
- Good road connectivity (paved/state highway): +5
- Very poor road connectivity: -8
- Good water coverage (>80%): +3
- Good sanitation coverage (>80%): +3
- High electricity coverage (>90%): +3

**Factors** (explainable):
- "Base infrastructure capacity: 39.2"
- "No healthcare facilities: -5"
- "Slow emergency response (120 min): -5"
- "Very poor road connectivity: -8"

---

## Multi-Hazard Assessment

The engine identifies all hazard zones spatially intersecting each habitation:

1. **Primary Hazard**: Highest severity intersecting hazard
2. **Additional Hazards**: Other intersecting hazard types
3. **Combined Exposure Bonus**: Up to 15 points for multiple hazards

Uses point-in-polygon test against hazard zone MultiPolygons (GeoJSON).

---

## API Endpoints

All endpoints under `/api/risk-assessments`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | List stored risk assessments (legacy) |
| `/{assessment_id}` | GET | Get assessment by ID (legacy) |
| `/habitation/{habitation_id}` | GET | Get assessment by habitation (legacy) |
| `/detail/{habitation_id}` | GET | **New** - Detailed breakdown with components |
| `/distribution` | GET | **New** - Risk level counts across all habitations |
| `/statistics` | GET | **New** - Aggregate statistics (avg, min, max, counts) |
| `/all-detailed` | GET | **New** - All habitations with full detail |

### Response Example: `/detail/{habitation_id}`

```json
{
  "habitation_id": "H001",
  "habitation_name": "Valley View",
  "exposure": {
    "score": 93.5,
    "factors": ["Hazard score (primary): 92.5", "Population exposure (1240): +1.0"],
    "raw_data": { "base_hazard_score": 92.5, "population": 1240, ... }
  },
  "vulnerability": {
    "score": 90.0,
    "factors": ["Base vulnerability score: 85.0", "No healthcare facilities: +5"],
    "raw_data": { "base_vulnerability_score": 85.0, ... }
  },
  "coping_capacity": {
    "score": 29.2,
    "factors": ["Base infrastructure capacity: 39.2", "No healthcare facilities: -5"],
    "raw_data": { "base_capacity": 39.2, ... }
  },
  "overall_score": 87.9,
  "risk_level": "CRITICAL",
  "primary_hazard": "Landslide",
  "additional_hazards": [],
  "contributing_factors": [...],
  "weights_used": { "exposure": 0.5, "vulnerability": 0.3, "coping_capacity": 0.2 },
  "thresholds_used": { "low_max": 20, "moderate_max": 40, ... }
}
```

---

## UI Functionality

The Risk Assessment page (`/risk-assessment`) provides:

1. **Summary Statistics Cards**: Total habitations, average score, high+critical count, score range
2. **Risk Distribution**: Visual breakdown with counts and percentages for all 5 levels
3. **Methodology Panel**: Explains the formula and component weights
4. **Habitation Risk Table**: Sortable table with habitation name, primary hazard, risk score, classification, and view details
5. **Demo Data Disclaimer**: Prominent notice that data is fictional/sample

### Permissions

Requires: `view_risk` OR `view_risk_layers`
- ADMIN: ✓
- GIS_ANALYST: ✓
- VIEWER: ✓
- Others: ✗

---

## Data Sources

| Data | Source | Endpoint |
|------|--------|----------|
| Habitations | Sample JSON | `/api/habitations` |
| Hazards (with geometry) | Sample GeoJSON | `/api/hazards` |
| Infrastructure | Sample JSON | `/api/infrastructure` |
| Stored Risk Assessments | Sample JSON | `/api/risk-assessments` |

---

## Limitations

1. **Prototype Data**: All data is fictional/sample (20 habitations, 10 hazard zones, 5 relocation sites)
2. **No Real-Time Updates**: Assessments computed on-demand from static sample data
3. **No Temporal Analysis**: Single assessment snapshot, no trend/history
4. **Simplified Vulnerability**: Uses proxy indicators (no demographic breakdown)
5. **Spatial Approximation**: Point-in-polygon for habitation-hazard intersection
6. **No Uncertainty Quantification**: Single deterministic score
7. **Limited Hazard Types**: Landslide, Flood, Cloudburst, Coastal Erosion only

---

## Demo Data Disclaimer

> **DEMO DATA** — The locations, population, hazard scores, risk assessments and relocation recommendations shown in this prototype are fictional/sample records created for demonstration. They are not official government data or official relocation orders.

---

## Future Production Improvements

| Area | Planned Enhancement |
|------|---------------------|
| **Data Integration** | Connect to live hazard feeds, census data, satellite imagery |
| **Model Calibration** | Historical event validation, expert weight tuning |
| **Uncertainty** | Monte Carlo simulation, confidence intervals |
| **Temporal** | Time-series risk trends, seasonal adjustments |
| **Spatial** | High-resolution exposure modeling, evacuation routing |
| **Social** | Demographic vulnerability indices, equity analysis |
| **API** | WebSocket for live updates, batch processing |
| **Export** | PDF reports, GeoJSON, CSV for decision makers |

---

## Files

| File | Purpose |
|------|---------|
| `backend/app/algorithms/risk_engine.py` | Core risk calculation logic |
| `backend/app/api/risk_assessments.py` | REST API endpoints |
| `backend/app/schemas/__init__.py` | Pydantic response models |
| `frontend/src/pages/RiskAssessment.tsx` | Main UI page |
| `frontend/src/services/api.ts` | API client functions |
| `docs/RISK_ASSESSMENT.md` | This documentation |