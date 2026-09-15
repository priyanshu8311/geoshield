# GIS Hazard & Risk Map Documentation

## Overview

The GIS Map module (`/map`) provides an interactive geospatial visualization of disaster risk data including habitations, hazard zones, relocation sites, and infrastructure. Built with Leaflet and React Leaflet on top of OpenStreetMap.

## Architecture

### Technology Stack

- **Leaflet 1.9.4** - Core mapping library
- **React Leaflet 4.2.1** - React bindings for Leaflet
- **OpenStreetMap** - Base map tile provider
- **GeoJSON** - Vector data format for hazard polygons

### Component Structure

```text
GISMap (page)
├── MapContainer (react-leaflet)
│   ├── TileLayer (OpenStreetMap)
│   ├── MapRef (internal - gets map instance)
│   ├── GeoJSON (Hazard Zones)
│   ├── FeatureGroup (Habitation Markers)
│   ├── FeatureGroup (Relocation Site Markers)
│   └── FeatureGroup (Infrastructure Markers)
├── LayerControl (sidebar)
├── Legend (sidebar)
├── MapStatistics (sidebar)
├── SearchControl (overlay)
├── RiskFilter / HazardFilter / SeverityFilter / StatusFilter (overlay)
├── DetailsPanel (slide-in panel)
└── Demo Data Disclaimer (overlay)
```

## OpenStreetMap Integration

### Base Layer Configuration

```typescript
<TileLayer
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  maxZoom={19}
/>
```

- **Initial Center**: `[30.32, 78.05]` (Demo District area)
- **Initial Zoom**: 11
- **Attribution**: OSM copyright notice displayed bottom-right
- **Zoom Controls**: Hidden (using custom controls)

## API Data Sources

The map consumes data from the following backend endpoints:

| Layer | API Endpoint | Data Format |
| --- | --- | --- |
| Habitations | `GET /api/habitations` | Point geometries with risk attributes |
| Hazard Zones | `GET /api/hazards` | MultiPolygon geometries with severity |
| Relocation Sites | `GET /api/relocation-sites` | Point geometries with capacity data |
| Infrastructure | `GET /api/infrastructure` | Tabular data linked to habitations |

### Data Models

**Habitation** (Point geometry)

- `id`, `name`, `district`, `state`, `population`
- `latitude`, `longitude`, `geometry` (GeoJSON Point)
- `hazard_type`: Landslide | Flood | Cloudburst | Coastal Erosion
- `risk_score` (0-100), `risk_level`: LOW | MODERATE | ELEVATED | HIGH | CRITICAL
- `relocation_priority`: P1 | P2 | P3 | P4

**Hazard Zone** (MultiPolygon geometry)

- `id`, `name`, `hazard_type`, `severity` (0-100)
- `frequency`, `description`
- `geometry` (GeoJSON MultiPolygon)

**Relocation Site** (Point geometry)

- `id`, `name`, `latitude`, `longitude`, `geometry` (GeoJSON Point)
- `total_capacity`, `current_population`, `available_capacity`
- Infrastructure capacities: water, housing, healthcare, school
- `road_connectivity`, `electricity`, `sanitation`, `emergency_services`
- `environmental_status`

**Infrastructure** (No native geometry - uses habitation coordinates)

- `habitation_id` (foreign key)
- Scores: roads, water, healthcare, schools, electricity, sanitation, emergency
- Details: road_connectivity, water_source, healthcare_facilities, school_count
- Coverage: electricity_coverage, sanitation_coverage
- `emergency_response_time`

## Map Layers

### 1. Habitation Markers

- **Visualization**: Circle markers colored by risk level
- **Colors**:
  - CRITICAL: `#dc2626` (red)
  - HIGH: `#ef4444` (orange-red)
  - ELEVATED: `#f97316` (orange)
  - MODERATE: `#eab308` (yellow)
  - LOW: `#22c55e` (green)
- **Popup**: Name, district, population, risk score, risk level badge, hazard type
- **Click Action**: Opens DetailsPanel with full habitation info + linked infrastructure

### 2. Hazard Zones

- **Visualization**: Polygon overlays with semi-transparent fill
- **Colors by Hazard Type**:
  - Landslide: `#8b5e3c` (brown)
  - Flood: `#3b82f6` (blue)
  - Cloudburst: `#8b5cf6` (purple)
  - Coastal Erosion: `#f97316` (orange)
- **Style**: 2px stroke, 25% fill opacity, 80% stroke opacity
- **Popup**: Name, hazard type, severity score, severity level, frequency, description
- **Click Action**: Opens DetailsPanel with hazard zone details

### 3. Relocation Site Markers

- **Visualization**: Circle markers with white center dot, colored by utilization
- **Utilization Colors**:
  - <40%: `#22c55e` (green - available)
  - 40-60%: `#3b82f6` (blue - moderate)
  - 60-80%: `#f97316` (orange - high)
  - ≥80%: `#dc2626` (red - critical)
- **Popup**: Name, total/current/available capacity, utilization %, road access, environmental status
- **Click Action**: Opens DetailsPanel with full site capacity breakdown

### 4. Infrastructure Markers

- **Visualization**: Emoji icons offset from habitation location
- **Types**: roads (🛣️), water (💧), healthcare (🏥), schools (🏫), electricity (⚡), sanitation (🚰), emergency (🚑)
- **Note**: Infrastructure records lack native coordinates. Markers are placed at associated habitation coordinates with small offsets to prevent overlap.
- **Limitation**: Records without matching habitation are omitted from map (graceful degradation)
- **Popup**: Infrastructure type, habitation name, score, type-specific details

## Layer Control

Independent toggle switches for each layer:

- Habitations (default: on)
- Hazard Zones (default: on)
- Relocation Sites (default: on)
- Infrastructure (default: off)

Located in right sidebar (desktop) or slide-out panel (mobile).

## Legend

Professional legend in right sidebar showing:

- **Risk Levels**: 5 colored circles with labels (Critical → Low)
- **Hazard Severity**: 4 colored circles (Critical, High, Moderate, Low)
- **Relocation Utilization**: 4 colored circles with center dots (Available → Critical)

## Filters

### Risk Level Filter

- Options: All, LOW, MODERATE, ELEVATED, HIGH, CRITICAL
- Filters habitation markers

### Hazard Type Filter

- Options: All, Landslide, Flood, Cloudburst, Coastal Erosion
- Filters both habitation markers and hazard zone polygons

### Hazard Severity Filter

- Options: All, Low, Moderate, High, Critical
- Filters hazard zones by severity classification

### Habitation Status Filter

- Options: All, Safe, Monitor, At Risk, Red Zone, Relocation Required
- Derived from risk level mapping

All filters combine with AND logic and update visible features in real-time.

## Search

Search control in top-left overlay supports:

- Habitation names and IDs
- Hazard zone names and IDs
- Relocation site names and IDs

Selecting a result:

1. Sets search query (applies filters)
2. Flies map to feature location (zoom 13 for points, zoom 11 for hazards)
3. Opens DetailsPanel for the feature

## Feature Details Panel

Slide-in panel from right (full-screen on mobile, 320px on desktop) showing:

**Habitation**: Name, location, population, risk score, risk badge, hazard type, status, relocation priority, road connectivity, infrastructure scores (7 categories)

**Hazard Zone**: Name, hazard type badge, severity score, severity level, frequency, description

**Relocation Site**: Name, total/current/available capacity, utilization %, water/housing/healthcare/school capacities, road access, electricity/sanitation/emergency availability, environmental status

**Infrastructure**: Habitation ID, all 7 infrastructure scores, connectivity/source/facility details, coverage percentages, emergency response time

Close button returns to map view.

## Map Statistics

Compact dashboard in sidebar showing real-time counts:

- Total Habitations (filtered)
- Red Zones (CRITICAL risk)
- High/Critical Risk count
- Total Hazard Zones (filtered)
- Critical Hazards (severity ≥85)
- Total Relocation Sites (filtered)

Values derived from currently filtered data, not raw totals.

## Loading & Error States

- **Loading**: Full-screen spinner with "Loading GIS data..." message
- **API Errors**: Per-dataset error messages in sidebar (red alert boxes)
- **Empty Data**: Layers simply don't render (no crashes)
- **Invalid Geometry**: Features without valid geometry are filtered out silently
- **Partial Failure**: Page loads with available data; failed layers show errors

## Authentication & RBAC

- **Route Protection**: `/map` wrapped in `ProtectedRoute` component
- **Permissions Required**: `view_gis_data` OR `view_map`
- **Roles with Access**:
  - ADMIN (all permissions)
  - GIS_ANALYST (view_gis_data, view_hazards, view_habitations, view_infrastructure, view_risk_layers)
  - VIEWER (view_map, view_dashboard, view_risk)
- **Integration**: Reuses Part 3 AuthContext, no duplicate auth system
- **Logout**: Existing header logout button works normally

## Responsive Design

| Breakpoint | Layout |
| --- | --- |
| Desktop (≥1024px) | Map left (calc(100%-360px)), Sidebar right (360px fixed) |
| Tablet (768-1023px) | Map full width, sidebar as slide-over panel |
| Mobile (<768px) | Map full height, controls as bottom sheets, sidebar as right slide-over |

Map controls (search, filters) collapse into bottom sheets on mobile. Details panel is full-screen on mobile.

## Demo Data Disclaimer

Prominently displayed in two locations:

1. Bottom-left of map (desktop) / bottom sheet (mobile)
2. In mobile controls panel

**Text**: "DEMO DATA — The locations, population, hazard scores, risk assessments and relocation recommendations shown in this prototype are fictional/sample records created for demonstration. They are not official government data or official relocation orders."

Styled with amber background for visibility.

## GeoJSON Handling

- **Hazard Polygons**: Loaded as MultiPolygon from `/api/hazards` with geometry field
- **Coordinate Order**: GeoJSON standard [longitude, latitude] (converted to Leaflet [lat, lng] automatically by react-leaflet)
- **Validation**: Features without geometry filtered out before rendering
- **Projection**: WGS84 / EPSG:4326 (standard for OSM and GeoJSON)

## Limitations

1. **Infrastructure Coordinates**: Infrastructure records lack native geographic coordinates. Markers are synthesized from associated habitation locations with artificial offsets. This is a data limitation, not a code limitation.
2. **Hazard Geometry Bounds**: Search zoom for hazard zones uses a default center since polygon bounds calculation not implemented.
3. **Marker Clustering**: No marker clustering for habitations at high density (acceptable for 20 demo records).
4. **Real-time Updates**: Data loaded once on mount; no WebSocket/polling for live updates.
5. **Print/Export**: No map print or image export functionality.
6. **Measure/Draw Tools**: No distance/area measurement or drawing tools.

## Future Production GIS Integrations

| Feature | Description |
| --- | --- |
| WMS/WMTS Layers | Overlay official hazard maps from government WMS services |
| Vector Tiles | High-performance rendering for large datasets (Mapbox/MapLibre) |
| Clustering | Marker clustering for 1000+ habitations |
| Basemap Options | Satellite, terrain, dark mode basemap toggle |
| Coordinate Display | Live lat/lng display on mouse hover |
| Measure Tool | Distance and area measurement |
| Print Layout | Professional map composition with legend, scale, north arrow |
| Time Slider | Temporal hazard data animation |
| Offline Support | Map tile caching for field use |
| Custom Projections | Support for local coordinate systems (e.g., UTM zones) |

## File Structure

```text
frontend/src/pages/GISMap.tsx          # Main map component (1200+ lines)
frontend/src/services/api.ts           # API types & fetch functions
frontend/src/components/Icons.tsx      # RiskBadge, MapIcon, etc.
frontend/src/index.css                 # Leaflet + custom map styles
docs/GIS_MAP.md                        # This documentation
```

## Testing Checklist

- [x] Frontend builds without TypeScript errors
- [x] Backend API returns geometry fields correctly
- [x] Map renders OpenStreetMap base layer
- [x] Habitation markers render with risk colors
- [x] Hazard polygons render with type colors
- [x] Relocation site markers render with utilization colors
- [x] Infrastructure markers render at habitation locations
- [x] Layer toggles show/hide layers correctly
- [x] Legend displays all symbol categories
- [x] Filters update visible features in real-time
- [x] Search finds features and flies to them
- [x] Details panel opens on click with correct data
- [x] Statistics reflect filtered data
- [x] Loading spinner shows during data fetch
- [x] Error messages display for failed API calls
- [x] Authentication protects `/map` route
- [x] Role-based navigation shows/hides GIS Map link
- [x] Logout works from map page
- [x] Responsive layout works on desktop/tablet/mobile
- [x] Demo data disclaimer visible
- [x] No critical browser console errors
