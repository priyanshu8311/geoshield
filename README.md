<<<<<<< HEAD
# Disaster Risk & Relocation Intelligence Platform

**Intelligent Identification of Hazard-Based Red Zones, Carrying Capacity Assessment, and Immediate Relocation Needs for Vulnerable Habitations**

A comprehensive decision-support system for disaster management authorities, integrating multi-source geospatial data, demographic statistics, infrastructure inventories, and hazard models to deliver actionable intelligence for disaster risk reduction and relocation planning.

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Leaflet / React Leaflet** for GIS mapping
- **OpenStreetMap** as base map layer

### Backend
- **Python 3.11+** with **FastAPI**
- **PostgreSQL** with **PostGIS** for spatial data
- **SQLAlchemy 2.0** with **GeoAlchemy2** for ORM
- **Pandas / GeoPandas** for data processing
- **Scikit-learn** for machine learning (future phases)
- **JWT + RBAC** for authentication (future phases)

### Deployment
- **Docker / Docker Compose** (future phases)

## Project Structure

```
project-root/
├── frontend/                 # React + Vite + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── layouts/         # Layout components (sidebar, header)
│   │   ├── services/        # API services
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utility functions
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── api/             # API route handlers
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   ├── algorithms/      # Risk/relocation algorithms
│   │   ├── database/        # Database configuration
│   │   └── main.py          # FastAPI app entry point
│   └── requirements.txt
├── data/                     # Data storage
│   ├── raw/                 # Raw input data
│   ├── processed/           # Processed data
│   └── sample/              # Sample datasets
├── docs/                     # Documentation
├── README.md
├── roadmap.md
├── .env.example
└── .gitignore
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL 15+ with PostGIS 3.4+ (optional - fallback mode available)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at **http://localhost:5173**

### Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at **http://localhost:8000**
API documentation at **http://localhost:8000/docs**

### Database Setup (Optional - for PostgreSQL/PostGIS)

```bash
# 1. Create database and enable PostGIS
psql -U postgres
CREATE DATABASE hazard_db;
\c hazard_db
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;

# 2. Configure environment
cp ../.env.example ../.env
# Edit .env with your database credentials

# 3. Seed sample data
cd backend
python -m app.database.seed
```

### Fallback Mode (No Database Required)

If PostgreSQL/PostGIS is not available, the application automatically uses **fallback mode** with sample JSON/GeoJSON data from `data/sample/`. No database setup required!

### Verify Installation

1. Open http://localhost:5173 - you should see the Dashboard
2. Visit http://localhost:8000/api/health - should return `{"status": "ok", "service": "hazard-relocation-platform"}`
3. Test API endpoints:
   - http://localhost:8000/api/habitations
   - http://localhost:8000/api/hazards
   - http://localhost:8000/api/relocation-sites
   - http://localhost:8000/api/risk-assessments
   - http://localhost:8000/api/alerts

## Current Development Status

### Phase 1: Project Foundation ✅ **COMPLETED**
- [x] Project structure created
- [x] Frontend: React + TypeScript + Vite + Tailwind configured
- [x] Frontend: Professional application shell with sidebar navigation
- [x] Frontend: Dashboard page with project overview
- [x] Backend: FastAPI with CORS enabled
- [x] Backend: GET /api/health endpoint
- [x] Documentation: README.md and roadmap.md created

### Phase 2: Database & Sample Data ✅ **IN PROGRESS**
- [x] PostgreSQL + PostGIS architecture with SQLAlchemy/GeoAlchemy2
- [x] SQLAlchemy models for all 10 entities (users, habitations, hazards, infrastructure, risk_assessments, relocation_sites, capacity_assessments, relocation_assessments, alerts, audit_logs)
- [x] Spatial data support (POINT, MULTIPOLYGON geometries, SRID 4326)
- [x] Spatial indexes (GIST) on geometry columns
- [x] Sample datasets (20 habitations, 10 hazard zones, 5 relocation sites, 20 infrastructure records, 20 risk assessments, 5 capacity assessments, 20 relocation assessments, 10 alerts)
- [x] Data ingestion/seed script (`python -m app.database.seed`)
- [x] Fallback mode using sample JSON/GeoJSON files (no database required)
- [x] Environment configuration (.env.example)
- [x] Basic CRUD API endpoints for all entities
- [x] Database documentation (docs/DATABASE.md)

### Upcoming Phases
See [roadmap.md](roadmap.md) for the complete 10-phase plan.

## Key Features (Implemented in Phase 2)

1. **Complete Data Layer** - 10 database entities with relationships
2. **Spatial Data Support** - PostGIS geometries with SRID 4326
3. **Sample Data** - 20 habitations across 4 hazard types and 5 risk levels
4. **Relocation Sites** - 5 sites with capacity assessments
5. **Risk Assessments** - Multi-factor risk scoring with contributing factors
6. **Alerts System** - 4 alert levels (CRITICAL, HIGH, WARNING, INFO)
7. **RESTful APIs** - All entities with filtering, pagination
8. **Fallback Mode** - Runs without PostgreSQL using JSON files
9. **API Documentation** - Auto-generated at /docs

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/habitations` | List habitations (filterable) |
| `GET /api/habitations/{id}` | Get habitation by ID |
| `GET /api/habitations/stats/summary` | Habitation statistics |
| `GET /api/hazards` | List hazard zones |
| `GET /api/hazards/{id}` | Get hazard by ID |
| `GET /api/infrastructure` | List infrastructure |
| `GET /api/infrastructure/{habitation_id}` | Get infrastructure by habitation |
| `GET /api/relocation-sites` | List relocation sites |
| `GET /api/relocation-sites/{id}` | Get site by ID |
| `GET /api/relocation-sites/stats/summary` | Site statistics |
| `GET /api/risk-assessments` | List risk assessments |
| `GET /api/risk-assessments/{id}` | Get assessment by ID |
| `GET /api/risk-assessments/habitation/{id}` | Get by habitation |
| `GET /api/capacity-assessments` | List capacity assessments |
| `GET /api/capacity-assessments/{id}` | Get by ID |
| `GET /api/capacity-assessments/site/{id}` | Get by site |
| `GET /api/relocation-assessments` | List relocation assessments |
| `GET /api/relocation-assessments/{id}` | Get by ID |
| `GET /api/relocation-assessments/habitation/{id}` | Get by habitation |
| `GET /api/alerts` | List alerts |
| `GET /api/alerts/{id}` | Get alert by ID |
| `GET /api/alerts/stats/summary` | Alert statistics |

## Data Disclaimer

> **Demo Mode: Data shown in this prototype is fictional/sample data and does not represent official government risk assessments.**

All sample data (habitations, hazards, relocation sites, etc.) is created for demonstration purposes only. Locations, risk scores, population figures, and assessments are fictional and should not be used for real-world decision making.

## Documentation

- [Database Architecture](docs/DATABASE.md) - Complete database schema, relationships, spatial data, setup instructions
- [Development Roadmap](roadmap.md) - 10-phase development plan

## License

Government of India - Disaster Management Authority
=======
# geoshield
>>>>>>> 18011b412f6b3251e61d64b61504e78f823c3846
