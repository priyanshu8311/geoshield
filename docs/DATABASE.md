# Database Architecture Documentation

## Overview

This document describes the database architecture for the Hazard Relocation Platform, including table schemas, relationships, spatial data handling, sample data, and setup instructions.

## Technology Stack

- **Database**: PostgreSQL 15+ with PostGIS 3.4+
- **ORM**: SQLAlchemy 2.0 with GeoAlchemy2
- **Migrations**: Alembic
- **Spatial Reference**: SRID 4326 (WGS 84)

## Entity Relationship Diagram

```text
+-----------------+       +----------------------+       +------------------------+
|  Habitation     |<----->|  Infrastructure      |       |  RiskAssessment        |
|                 |  1:1  |                      |       |                        |
| id (PK)         |       | id (PK)              |       | id (PK)                |
| name            |       | habitation_id        |       | habitation_id (FK)     |
| geometry        |       | roads_score          |       | hazard_score           |
| hazard_type     |       | water_score          |       | exposure_score         |
| risk_score      |       | healthcare_score     |       | vulnerability_score    |
| risk_level      |       | ...                  |       | risk_score             |
| priority        |       +----------------------+       | risk_level             |
+--------+--------+                                        | assessment_date        |
         |                                                 | contributing_factors   |
         | 1:N                                              +------------------------+
         v
+----------------------+       +------------------------+       +----------------------+
| RelocationAssessment |<----->|  RelocationSite        |<----->| CapacityAssessment     |
|                      | N:1   |                        | 1:N   |                      |
| id (PK)              |       | id (PK)                |       | id (PK)              |
| habitation_id (FK)   |       | name                   |       | site_id (FK)         |
| site_id (FK)         |       | geometry (POINT)       |       | capacity_score       |
| priority_score       |       | total_capacity         |       | capacity_status      |
| priority_level       |       | available_capacity     |       | water_status         |
| distance_km          |       | water_capacity         |       | housing_status       |
| recommendation       |       | housing_capacity       |       | healthcare_status    |
| reasoning            |       | healthcare_capacity    |       | road_status          |
+----------------------+       | school_capacity        |       | assessment_date      |
                               | road_connectivity      |       +----------------------+
                               | electricity            |
                               | sanitation             |
                               | emergency_services     |
                               | env_status             |
                               +------------------------+

+----------------------+       +----------------------+
|     Hazard           |       |      Alert           |
|                      |       |                      |
| id (PK)              |       | id (PK)              |
| name                 |       | level                |
| hazard_type          |       | title                |
| severity             |       | message              |
| frequency            |       | habitation_id (FK)   |
| description          |       | site_id (FK)         |
| geometry             |       | is_read              |
| (MULTIPOLYGON)       |       | created_at           |
+----------------------+       +----------------------+

+----------------------+       +----------------------+
|      User            |       |    AuditLog          |
|                      |       |                      |
| id (PK, UUID)        |       | id (PK)              |
| email                |       | user_id (FK)         |
| hashed_password      |       | action               |
| full_name            |       | entity_type          |
| role                 |       | entity_id            |
| is_active            |       | details (JSON)       |
| created_at           |       | ip_address           |
| updated_at           |       | created_at           |
+----------------------+       +----------------------+
```

## Tables

### 1. users

Authentication and authorization table (Phase 3+).

| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| email | VARCHAR(255) | UNIQUE, NOT NULL, INDEX |
| hashed_password | VARCHAR(255) | NOT NULL |
| full_name | VARCHAR(255) | |
| role | VARCHAR(50) | DEFAULT 'viewer' |
| is_active | INTEGER | DEFAULT 1 |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

### 2. habitations

Core entity representing vulnerable habitations.

| Column | Type | Constraints |
| --- | --- | --- |
| id | VARCHAR(20) | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| district | VARCHAR(100) | NOT NULL |
| state | VARCHAR(100) | NOT NULL |
| population | INTEGER | NOT NULL |
| latitude | FLOAT | NOT NULL |
| longitude | FLOAT | NOT NULL |
| geometry | GEOMETRY(POINT, 4326) | NOT NULL, SPATIAL INDEX |
| hazard_type | ENUM | NOT NULL |
| hazard_score | FLOAT | NOT NULL |
| exposure_score | FLOAT | NOT NULL |
| vulnerability_score | FLOAT | NOT NULL |
| risk_score | FLOAT | NOT NULL |
| risk_level | ENUM | NOT NULL, INDEX |
| relocation_priority | ENUM | NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

**Indexes:**

- `idx_habitations_risk_level` ON risk_level
- `idx_habitations_hazard_type` ON hazard_type
- Spatial index on geometry (GIST)

### 3. hazards

Hazard zones with spatial geometry.

| Column | Type | Constraints |
| --- | --- | --- |
| id | VARCHAR(20) | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| hazard_type | ENUM | NOT NULL, INDEX |
| severity | FLOAT | NOT NULL |
| frequency | VARCHAR(50) | |
| description | TEXT | |
| geometry | GEOMETRY(MULTIPOLYGON, 4326) | NOT NULL, SPATIAL INDEX |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

**Indexes:**

- `idx_hazards_hazard_type` ON hazard_type
- Spatial index on geometry (GIST)

### 4. infrastructure

Infrastructure assessment per habitation.

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| habitation_id | VARCHAR(20) | FK(habitations.id), UNIQUE, NOT NULL |
| roads_score | FLOAT | DEFAULT 0 |
| water_score | FLOAT | DEFAULT 0 |
| healthcare_score | FLOAT | DEFAULT 0 |
| schools_score | FLOAT | DEFAULT 0 |
| electricity_score | FLOAT | DEFAULT 0 |
| sanitation_score | FLOAT | DEFAULT 0 |
| emergency_services_score | FLOAT | DEFAULT 0 |
| road_connectivity | VARCHAR(50) | |
| water_source | VARCHAR(100) | |
| healthcare_facilities | INTEGER | DEFAULT 0 |
| school_count | INTEGER | DEFAULT 0 |
| electricity_coverage | FLOAT | DEFAULT 0 |
| sanitation_coverage | FLOAT | DEFAULT 0 |
| emergency_response_time | INTEGER | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

### 5. risk_assessments

Risk assessment records for habitations.

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| habitation_id | VARCHAR(20) | FK(habitations.id), NOT NULL, INDEX |
| hazard_score | FLOAT | NOT NULL |
| exposure_score | FLOAT | NOT NULL |
| vulnerability_score | FLOAT | NOT NULL |
| risk_score | FLOAT | NOT NULL |
| risk_level | ENUM | NOT NULL |
| assessment_date | TIMESTAMP | DEFAULT NOW() |
| contributing_factors | JSON | |
| created_at | TIMESTAMP | DEFAULT NOW() |

### 6. relocation_sites

Potential relocation sites.

| Column | Type | Constraints |
| --- | --- | --- |
| id | VARCHAR(20) | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| latitude | FLOAT | NOT NULL |
| longitude | FLOAT | NOT NULL |
| geometry | GEOMETRY(POINT, 4326) | NOT NULL, SPATIAL INDEX |
| total_capacity | INTEGER | NOT NULL |
| current_population | INTEGER | DEFAULT 0 |
| available_capacity | INTEGER | NOT NULL, INDEX |
| water_capacity | INTEGER | NOT NULL |
| housing_capacity | INTEGER | NOT NULL |
| healthcare_capacity | INTEGER | NOT NULL |
| school_capacity | INTEGER | NOT NULL |
| road_connectivity | VARCHAR(50) | |
| electricity | INTEGER | DEFAULT 1 |
| sanitation | INTEGER | DEFAULT 1 |
| emergency_services | INTEGER | DEFAULT 1 |
| environmental_status | VARCHAR(50) | |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

**Indexes:**

- `idx_relocation_sites_available_capacity` ON available_capacity
- Spatial index on geometry (GIST)

### 7. capacity_assessments

Capacity assessment for relocation sites.

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| relocation_site_id | VARCHAR(20) | FK(relocation_sites.id), NOT NULL, INDEX |
| capacity_score | FLOAT | NOT NULL |
| capacity_status | ENUM | NOT NULL |
| available_capacity | INTEGER | NOT NULL |
| water_status | ENUM | NOT NULL |
| housing_status | ENUM | NOT NULL |
| healthcare_status | ENUM | NOT NULL |
| road_status | ENUM | NOT NULL |
| assessment_date | TIMESTAMP | DEFAULT NOW() |
| created_at | TIMESTAMP | DEFAULT NOW() |

### 8. relocation_assessments

Relocation recommendations linking habitations to sites.

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| habitation_id | VARCHAR(20) | FK(habitations.id), NOT NULL, INDEX |
| relocation_site_id | VARCHAR(20) | FK(relocation_sites.id), NOT NULL, INDEX |
| priority_score | FLOAT | NOT NULL |
| priority_level | ENUM | NOT NULL |
| distance_km | FLOAT | NOT NULL |
| capacity_available | INTEGER | NOT NULL |
| recommendation | TEXT | |
| reasoning | TEXT | |
| created_at | TIMESTAMP | DEFAULT NOW() |

### 9. alerts

System alerts and notifications.

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| level | ENUM | NOT NULL |
| title | VARCHAR(255) | NOT NULL |
| message | TEXT | NOT NULL |
| habitation_id | VARCHAR(20) | FK(habitations.id), INDEX |
| relocation_site_id | VARCHAR(20) | FK(relocation_sites.id), INDEX |
| is_read | INTEGER | DEFAULT 0 |
| created_at | TIMESTAMP | DEFAULT NOW(), INDEX |

**Indexes:**

- `idx_alerts_level_created` ON (level, created_at)

### 10. audit_logs

Audit trail for system actions.

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| user_id | UUID | FK(users.id) |
| action | VARCHAR(100) | NOT NULL |
| entity_type | VARCHAR(50) | NOT NULL |
| entity_id | VARCHAR(50) | |
| details | JSON | |
| ip_address | VARCHAR(45) | |
| created_at | TIMESTAMP | DEFAULT NOW(), INDEX |

## Enums

### RiskLevel

- LOW
- MODERATE
- ELEVATED
- HIGH
- CRITICAL

### HazardType

- LANDSLIDE
- FLOOD
- CLOUDBURST
- COASTAL_EROSION

### CapacityStatus

- SUFFICIENT
- LIMITED
- INSUFFICIENT

### PriorityLevel

- P1 (Immediate Relocation Planning)
- P2 (High Priority)
- P3 (Planned Relocation)
- P4 (Monitor)

### AlertLevel

- CRITICAL
- HIGH
- WARNING
- INFO

## Spatial Data

### Geometry Types

- **habitations.geometry**: POINT (SRID 4326)
- **hazards.geometry**: MULTIPOLYGON (SRID 4326)
- **relocation_sites.geometry**: POINT (SRID 4326)

### Spatial Indexes

All geometry columns have GIST indexes for efficient spatial queries:

```sql
CREATE INDEX idx_habitations_geometry ON habitations USING GIST (geometry);
CREATE INDEX idx_hazards_geometry ON hazards USING GIST (geometry);
CREATE INDEX idx_relocation_sites_geometry ON relocation_sites USING GIST (geometry);
```

### Example Spatial Queries

```sql
-- Find habitations within 10km of a point
SELECT * FROM habitations
WHERE ST_DWithin(geometry, ST_SetSRID(ST_MakePoint(78.03, 30.31), 4326)::geography, 10000);

-- Find hazards intersecting a habitation
SELECT h.* FROM habitations hb
JOIN hazards h ON ST_Intersects(hb.geometry, h.geometry)
WHERE hb.id = 'H001';

-- Find nearest relocation sites
SELECT rs.*, ST_Distance(rs.geometry, hb.geometry)::geography as distance
FROM relocation_sites rs, habitations hb
WHERE hb.id = 'H001'
ORDER BY distance LIMIT 5;
```

## Sample Data

The project includes comprehensive sample data for development and demonstration:

### Habitations (20 records)

- IDs: H001-H020
- Districts: "Demo District"
- States: "Demo State"
- Risk Levels: LOW (2), MODERATE (3), ELEVATED (5), HIGH (7), CRITICAL (2)
- Hazard Types: Landslide (7), Flood (6), Cloudburst (4), Coastal Erosion (3)
- Populations: 540-4,200

### Hazards (10 zones)

- IDs: HZ001-HZ010
- Types: Landslide (3), Flood (3), Cloudburst (2), Coastal Erosion (2)
- Geometries: MULTIPOLYGON covering risk zones

### Relocation Sites (5 sites)

- IDs: R001-R005
- Capacities: 2,500-5,000
- Available: 500-3,800
- Status: SUFFICIENT (3), LIMITED (2)

### Infrastructure (20 records)

- One per habitation
- Scores for: roads, water, healthcare, schools, electricity, sanitation, emergency
- Detailed facility counts and response times

### Risk Assessments (20 records)

- One per habitation
- Contributing factors arrays
- Assessment date: 2024-01-15

### Capacity Assessments (5 records)

- One per relocation site
- Component statuses: water, housing, healthcare, roads

### Relocation Assessments (20 records)

- One per habitation
- Priority levels: P1 (4), P2 (5), P3 (6), P4 (5)
- Distances: 2.1-22.0 km

### Alerts (10 records)

- Levels: CRITICAL (2), HIGH (2), WARNING (2), INFO (4)
- Mix of habitation-specific and system-wide alerts

## Setup Instructions

### Prerequisites

- PostgreSQL 15+
- PostGIS 3.4+
- Python 3.11+

### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and enable PostGIS
CREATE DATABASE hazard_db;
\c hazard_db
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

Example `.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/hazard_db
SQL_ECHO=false
```

### 3. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Run Migrations (Optional - Tables auto-create)

```bash
# Tables are created automatically on startup via init_db()
# For Alembic migrations (future):
# alembic upgrade head
```

### 5. Seed Sample Data

```bash
# From project root
python -m app.database.seed
```

Or from backend directory:

```bash
cd backend
python -m app.database.seed
```

Expected output:

```text
============================================================
Database Seed Script - Hazard Relocation Platform
============================================================
Sample data directory: /path/to/data/sample
Database URL: postgresql://postgres:password@localhost:5432/hazard_db

Creating tables...
Tables created successfully.

Seeding habitations...
  Added 20 habitations
Seeding hazards...
  Added 10 hazards
Seeding infrastructure...
  Added 20 infrastructure records
Seeding risk assessments...
  Added 20 risk assessments
Seeding relocation sites...
  Added 5 relocation sites
Seeding capacity assessments...
  Added 5 capacity assessments
Seeding relocation assessments...
  Added 20 relocation assessments
Seeding alerts...
  Added 10 alerts

============================================================
Seeding completed successfully!
============================================================
```

### 6. Verify Data

```bash
# Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Test endpoints
curl http://localhost:8000/api/health
curl http://localhost:8000/api/habitations
curl http://localhost:8000/api/habitations/H001
curl http://localhost:8000/api/hazards
curl http://localhost:8000/api/relocation-sites
```

## Fallback Mode (No Database)

If PostgreSQL/PostGIS is unavailable, the application runs in **fallback mode** using sample JSON/GeoJSON files.

### Fallback Data Files

Located in `data/sample/`:

- `habitations.json` - 20 habitation records
- `hazards.geojson` - 10 hazard zones (GeoJSON FeatureCollection)
- `relocation_sites.json` - 5 relocation sites
- `infrastructure.json` - 20 infrastructure records
- `risk_assessments.json` - 20 risk assessments
- `capacity_assessments.json` - 5 capacity assessments
- `relocation_assessments.json` - 20 relocation assessments
- `alerts.json` - 10 alerts

### How Fallback Works

1. On startup, `is_database_available()` checks database connectivity
2. If unavailable, API endpoints automatically use `FallbackDataService`
3. Fallback service reads from JSON files in `data/sample/`
4. All API endpoints work identically (same response format)
5. Frontend operates normally without database

### Enabling Fallback Mode

Simply don't configure DATABASE_URL or ensure PostgreSQL is not running:

```bash
# Don't set DATABASE_URL or set to invalid value
# The app will detect and use fallback data
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://postgres:postgres@localhost:5432/hazard_db`)
- `SQL_ECHO`: Enable SQL query logging (default: `false`)

## API Endpoints

### Habitations

- `GET /api/habitations` - List with filters
- `GET /api/habitations/{id}` - Get by ID
- `GET /api/habitations/stats/summary` - Statistics

### Hazards

- `GET /api/hazards` - List with filters
- `GET /api/hazards/{id}` - Get by ID

### Infrastructure

- `GET /api/infrastructure` - List with filters
- `GET /api/infrastructure/{habitation_id}` - Get by habitation

### Relocation Sites

- `GET /api/relocation-sites` - List with filters
- `GET /api/relocation-sites/{id}` - Get by ID
- `GET /api/relocation-sites/stats/summary` - Statistics

### Risk Assessments

- `GET /api/risk-assessments` - List with filters
- `GET /api/risk-assessments/{id}` - Get by ID
- `GET /api/risk-assessments/habitation/{habitation_id}` - Get by habitation

### Capacity Assessments

- `GET /api/capacity-assessments` - List with filters
- `GET /api/capacity-assessments/{id}` - Get by ID
- `GET /api/capacity-assessments/site/{site_id}` - Get by site

### Relocation Assessments

- `GET /api/relocation-assessments` - List with filters
- `GET /api/relocation-assessments/{id}` - Get by ID
- `GET /api/relocation-assessments/habitation/{habitation_id}` - Get by habitation

### Alerts

- `GET /api/alerts` - List with filters
- `GET /api/alerts/{id}` - Get by ID
- `GET /api/alerts/stats/summary` - Statistics

## Development Notes

### Adding New Sample Data

1. Add records to appropriate JSON file in `data/sample/`
2. Run seed script to populate database (if using PostgreSQL)
3. Fallback mode automatically picks up new data

### Spatial Data in Sample Files

- Habitations: Latitude/Longitude in JSON, converted to POINT geometry
- Hazards: GeoJSON FeatureCollection with MULTIPOLYGON geometries
- Relocation Sites: Latitude/Longitude in JSON, converted to POINT geometry

### Data Disclaimer

All sample data is **fictional/demo data** and does not represent official government assessments. The disclaimer "Demo Mode: Data shown in this prototype is fictional/sample data and does not represent official government risk assessments." is displayed in the UI.

## Troubleshooting

### Database Connection Failed

```text
Error: could not connect to server: Connection refused
```

- Ensure PostgreSQL is running: `sudo systemctl start postgresql` (Linux) or check Services (Windows)
- Verify DATABASE_URL in .env
- Check firewall/network access

### PostGIS Not Installed

```text
Error: could not access file "$libdir/postgis-3": No such file or directory
```

- Install PostGIS: `sudo apt-get install postgresql-15-postgis-3` (Ubuntu)
- Run `CREATE EXTENSION postgis;` in database

### Seed Script Fails

- Check database permissions
- Ensure sample data files exist in `data/sample/`
- Check for duplicate primary keys (script skips existing records)

### Fallback Mode Not Working

- Verify `data/sample/` directory exists with JSON files
- Check file permissions
- Ensure Python can read the files
