# Alerts & Reports System

## Overview

The Alerts & Reports module provides decision-support alerting and reporting capabilities for the Disaster Risk & Relocation Platform. It consumes canonical outputs from Parts 6 (Risk Assessment), 7 (Carrying Capacity), and 8 (Relocation Priority & Recommendations) to generate actionable alerts and comprehensive reports.

**Important**: All alert thresholds and report logic are **prototype decision-support rules** and **NOT official government standards**. They are for demonstration purposes only.

---

## Alert Generation Logic

### Prototype Alert Rules

The system generates alerts automatically from current platform data using the following prototype rules:

#### CRITICAL Alerts
- **Risk Threshold**: Habitation risk level = `CRITICAL`
- **Priority Escalation**: Relocation priority = `P1 IMMEDIATE`
- **Capacity Concern**: Relocation site utilization ≥ 90%

#### HIGH Alerts
- **Risk Threshold**: Habitation risk level = `HIGH`
- **Priority Escalation**: Relocation priority = `P2 URGENT`
- **Capacity Concern**: Relocation site utilization ≥ 75%

#### WARNING (MEDIUM) Alerts
- **Risk Threshold**: Habitation risk level = `ELEVATED`
- **Priority Escalation**: Relocation priority = `P3 PLANNED`
- **Capacity Concern**: Relocation site utilization ≥ 50%
- **Hazard Update**: New hazard data requiring reassessment

#### INFO Alerts
- **Priority Escalation**: Relocation priority = `P4 MONITOR`
- **Field Verification**: Field survey data received
- **System Info**: Capacity assessment updates, relocation plan drafts

### Alert Generation Process

1. **Data Collection**: Fetches current habitations, risk scores, priority levels, and relocation site capacities
2. **Rule Evaluation**: Applies prototype rules to each habitation and site
3. **Deduplication**: Checks for existing active alerts of the same type for the same entity
4. **Creation**: Generates new alerts with appropriate severity, type, and metadata
5. **Audit Logging**: Records generation action in audit log

### Alert Data Model

Each alert contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Unique alert identifier |
| `level` | Enum | `CRITICAL`, `HIGH`, `WARNING`, `INFO` |
| `status` | Enum | `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED` |
| `alert_type` | Enum | `RISK_THRESHOLD`, `PRIORITY_ESCALATION`, `CAPACITY_CONCERN`, `HAZARD_UPDATE`, `FIELD_VERIFICATION`, `SYSTEM_INFO`, `RELOCATION_PLAN` |
| `title` | String | Brief alert title |
| `message` | String | Alert message/description |
| `description` | String | Detailed description |
| `habitation_id` | String | Related habitation (optional) |
| `relocation_site_id` | String | Related site (optional) |
| `related_risk_level` | Enum | Related risk level (optional) |
| `priority_level` | Enum | Related priority level (optional) |
| `priority_score` | Float | Related priority score (optional) |
| `source` | String | `AUTO_GENERATED`, `FIELD_REPORT`, `SYSTEM_UPDATE`, `PLANNING` |
| `recommendation` | String | Recommended action |
| `is_read` | Boolean | Read status |
| `acknowledged_at` | DateTime | Acknowledgement timestamp |
| `acknowledged_by` | String | Username who acknowledged |
| `resolved_at` | DateTime | Resolution timestamp |
| `resolved_by` | String | Username who resolved |
| `created_at` | DateTime | Creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

---

## Alert API Endpoints

| Endpoint | Method | Description | Permissions |
|----------|--------|-------------|-------------|
| `/api/alerts` | GET | List alerts with filtering | `view_alerts` |
| `/api/alerts/{alert_id}` | GET | Get alert details | `view_alerts` |
| `/api/alerts/stats/summary` | GET | Basic alert statistics | `view_alerts` |
| `/api/alerts/statistics` | GET | Detailed alert statistics | `view_alerts` |
| `/api/alerts/{alert_id}/acknowledge` | POST | Acknowledge alert | `manage_alerts` |
| `/api/alerts/{alert_id}/resolve` | POST | Resolve alert | `manage_alerts` |
| `/api/alerts/generate` | POST | Generate alerts from current data | `manage_alerts` |

### Filtering Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `level` | Enum | Filter by alert level |
| `status` | Enum | Filter by alert status |
| `alert_type` | Enum | Filter by alert type |
| `habitation_id` | String | Filter by habitation |
| `relocation_site_id` | String | Filter by site |
| `is_read` | Boolean | Filter by read status |
| `search` | String | Search in title, message, habitation, site |

---

## Report API Endpoints

| Endpoint | Method | Description | Permissions |
|----------|--------|-------------|-------------|
| `/api/reports/risk-summary` | GET | Risk distribution summary | `view_reports` |
| `/api/reports/red-zones` | GET | Red-zone/priority summary | `view_reports` |
| `/api/reports/relocation-capacity` | GET | Capacity utilization report | `view_reports` |
| `/api/reports/relocation-recommendations` | GET | Relocation recommendations | `view_reports` |
| `/api/reports/overview` | GET | Comprehensive overview | `view_reports` |

### Report 1: Risk Summary

Shows risk distribution across all habitations:
- Total habitations
- Count by risk level (CRITICAL, HIGH, ELEVATED, MODERATE, LOW)
- Average risk score
- Visual distribution

### Report 2: Red Zone / High-Priority Summary

Shows relocation priority distribution:
- Red zone habitations (P1 + P2)
- Count by priority level (P1, P2, P3, P4)
- Highest priority habitations with scores

### Report 3: Relocation Capacity

Shows site capacity utilization:
- Total sites, capacity, population, available capacity
- Overall utilization percentage
- Capacity status distribution
- Stressed/limited sites list

### Report 4: Relocation Recommendations

Shows recommendations for habitations requiring relocation:
- Habitations needing assessment
- Priority level and score
- Recommended site with match score and suitability
- Limiting factors

---

## Export Functionality

### CSV Export

All reports and alert lists support CSV export:
- Alerts list (with all fields)
- Risk summary (metrics)
- Red zone summary (habitations)
- Relocation capacity (stressed sites)
- Relocation recommendations (recommendations)

### Export Implementation

Client-side CSV generation with proper escaping:
```javascript
const csv = [headers.join(','), ...rows.map(r => 
  r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
)].join('\n');
```

---

## RBAC Permissions

| Role | View Alerts | Acknowledge | Resolve | Generate | View Reports | Export Reports |
|------|-------------|-------------|---------|----------|--------------|----------------|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DISASTER_MANAGEMENT_OFFICER | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GIS_ANALYST | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| PLANNING_OFFICER | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| FIELD_OFFICER | ✅* | ✅* | ❌ | ❌ | ✅ | ✅ |
| VIEWER | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |

*FIELD_OFFICER only sees alerts for assigned habitations

---

## Dashboard Integration

The main Dashboard (`/`) now uses the alerts API for dynamic alert counts:
- **Active Alerts KPI**: Shows unread alert count from `/api/alerts/statistics`
- **Critical Alerts**: Shows critical alert count
- Clicking alert section navigates to `/alerts`

---

## Frontend Pages

### `/alerts` - Alerts Management

Features:
- Alert list with severity/status/type filters
- Search by title, message, habitation, site
- Alert detail modal with full metadata
- Acknowledge/Resolve actions (RBAC controlled)
- Generate alerts button (RBAC controlled)
- CSV export
- Pagination and sorting

### `/reports` - Decision Support Reports

Features:
- Four report sections with summary cards
- Detailed tables with visual indicators
- Last updated timestamp
- CSV export per report
- Refresh all button

---

## Demo Disclaimers

All pages display the following disclaimers:

> **DEMO DATA** — The locations, population, hazard scores, risk assessments and relocation recommendations shown in this prototype are fictional/sample records created for demonstration. They are not official government data or official relocation orders.

> **PROTOTYPE ALERT RULES** — Alerts are generated using prototype decision-support rules (CRITICAL: risk=CRITICAL or P1; HIGH: risk=HIGH or P2 or capacity stressed; WARNING: risk=ELEVATED or P3; INFO: P4). These are NOT official government standards.

> **DECISION-SUPPORT OUTPUTS** — Alerts and reports are prototype decision-support outputs and require validation and approval by authorized authorities.

---

## Architecture

### Data Flow

```
Risk Assessment (Part 6)
         ↓
Relocation Priority (Part 8)
         ↓
Carrying Capacity (Part 7)
         ↓
Alert Engine → Alerts/Reports
```

### Key Principles

1. **Single Source of Truth**: Alert engine consumes canonical outputs from Parts 6-8
2. **No Duplicate Calculations**: Reuses existing calculated values
3. **Modular Monolith**: Simple architecture suitable for SIH prototype
4. **Prototype Rules**: Clearly labeled as decision-support, not official standards

---

## Testing

### Backend Tests

```bash
cd backend
python -m pytest tests/ -v
```

### Frontend Build

```bash
cd frontend
npm run build
```

### API Test Coverage

- ✅ GET `/api/alerts` (with filters)
- ✅ GET `/api/alerts/{alert_id}`
- ✅ GET `/api/alerts/statistics`
- ✅ GET `/api/alerts/stats/summary`
- ✅ POST `/api/alerts/{alert_id}/acknowledge`
- ✅ POST `/api/alerts/{alert_id}/resolve`
- ✅ POST `/api/alerts/generate`
- ✅ GET `/api/reports/risk-summary`
- ✅ GET `/api/reports/red-zones`
- ✅ GET `/api/reports/relocation-capacity`
- ✅ GET `/api/reports/relocation-recommendations`
- ✅ GET `/api/reports/overview`
- ✅ RBAC enforcement on all endpoints
- ✅ Route ordering (static routes before dynamic)

---

## Files Created/Modified

### Backend

**Created:**
- `backend/app/api/reports.py` - Report API endpoints

**Modified:**
- `backend/app/models/__init__.py` - Added AlertStatus, AlertType, enhanced Alert model
- `backend/app/schemas/__init__.py` - Added AlertStatus, AlertType, report schemas
- `backend/app/api/alerts.py` - Enhanced with new endpoints (acknowledge, resolve, generate, statistics)
- `backend/app/algorithms/relocation_engine.py` - Added `generate_alerts_from_data()` function
- `backend/app/algorithms/__init__.py` - Exported new function
- `backend/app/services/fallback_data.py` - Added alert generation and report methods
- `backend/app/api/__init__.py` - Registered reports router

### Frontend

**Created:**
- `frontend/src/pages/Alerts.tsx` - Alerts management page
- `frontend/src/pages/Reports.tsx` - Reports page

**Modified:**
- `frontend/src/App.tsx` - Added Alerts and Reports routes
- `frontend/src/layouts/MainLayout.tsx` - Removed "comingSoon" from Alerts/Reports
- `frontend/src/components/Icons.tsx` - Added missing icons (CheckCircleIcon, XCircleIcon, SearchIcon, FilterIcon, DownloadIcon, RefreshIcon, AlertTriangleIcon, InfoIcon)
- `frontend/src/services/api.ts` - Added report types and API functions

### Documentation

**Created:**
- `docs/ALERTS_AND_REPORTS.md` - This documentation

---

## Future Enhancements (Part 10+)

- Real-time WebSocket notifications
- Email/SMS notification integration
- Scheduled report generation
- PDF export with charts
- Advanced alert correlation
- Historical trend analysis
- Custom alert rule builder
- Integration with external systems