import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, FeatureGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  fetchHabitations, 
  fetchHazards, 
  fetchRelocationSites, 
  fetchInfrastructure,
  Habitation, 
  Hazard, 
  RelocationSite, 
  Infrastructure 
} from '../services/api';
import { RiskBadge } from '../components/Icons';

interface FeatureDetails {
  type: 'habitation' | 'hazard' | 'relocation' | 'infrastructure';
  data: Habitation | Hazard | RelocationSite | Infrastructure;
}

const RISK_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MODERATE: '#eab308',
  ELEVATED: '#f97316',
  HIGH: '#ef4444',
  CRITICAL: '#dc2626',
};

const RISK_LABELS: Record<string, string> = {
  LOW: 'Low',
  MODERATE: 'Moderate',
  ELEVATED: 'Elevated',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const HAZARD_TYPE_COLORS: Record<string, string> = {
  'Landslide': '#8b5e3c',
  'Flood': '#3b82f6',
  'Cloudburst': '#8b5cf6',
  'Coastal Erosion': '#f97316',
};

const HAZARD_SEVERITY_LEVELS = [
  { key: 'Critical', min: 85, max: 100, color: '#dc2626' },
  { key: 'High', min: 70, max: 84, color: '#ef4444' },
  { key: 'Moderate', min: 50, max: 69, color: '#f97316' },
  { key: 'Low', min: 0, max: 49, color: '#eab308' },
];

function getHazardSeverityLabel(severity: number): string {
  for (const level of HAZARD_SEVERITY_LEVELS) {
    if (severity >= level.min && severity <= level.max) return level.key;
  }
  return 'Low';
}

function getHazardSeverityColor(severity: number): string {
  for (const level of HAZARD_SEVERITY_LEVELS) {
    if (severity >= level.min && severity <= level.max) return level.color;
  }
  return '#eab308';
}

function createRiskMarkerIcon(riskLevel: string) {
  const color = RISK_COLORS[riskLevel] || '#64748b';
  return L.divIcon({
    className: 'risk-marker',
    html: `<div style="width: 16px; height: 16px; border-radius: 50%; background: ${color}; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function createRelocationMarkerIcon(utilization: number) {
  let color = '#22c55e';
  if (utilization >= 80) color = '#dc2626';
  else if (utilization >= 60) color = '#f97316';
  else if (utilization >= 40) color = '#3b82f6';
  
  return L.divIcon({
    className: 'relocation-marker',
    html: `<div style="width: 18px; height: 18px; border-radius: 50%; background: ${color}; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative;">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function createInfrastructureMarkerIcon(type: string) {
  const icons: Record<string, string> = {
    'roads': '🛣️',
    'water': '💧',
    'healthcare': '🏥',
    'schools': '🏫',
    'electricity': '⚡',
    'sanitation': '🚰',
    'emergency': '🚑',
  };
  const emoji = icons[type] || '📍';
  return L.divIcon({
    className: 'infrastructure-marker',
    html: `<div style="font-size: 20px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${emoji}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function SearchControl({ onSearch, placeholder = 'Search habitation, hazard or relocation site...' }: { 
  onSearch: (query: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); }}
          placeholder={placeholder}
          className="w-full sm:w-72 px-4 py-2.5 pr-10 bg-white border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors text-sm"
        />
        <button
          type="submit"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-primary-600"
          aria-label="Search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

function LayerControl({ 
  showHabitations, 
  showHazards, 
  showRelocation, 
  showInfrastructure,
  onToggleHabitations,
  onToggleHazards,
  onToggleRelocation,
  onToggleInfrastructure 
}: {
  showHabitations: boolean;
  showHazards: boolean;
  showRelocation: boolean;
  showInfrastructure: boolean;
  onToggleHabitations: () => void;
  onToggleHazards: () => void;
  onToggleRelocation: () => void;
  onToggleInfrastructure: () => void;
}) {
  return (
    <div className="map-control-panel p-4 space-y-3">
      <h3 className="text-sm font-semibold text-surface-900">Map Layers</h3>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showHabitations}
            onChange={onToggleHabitations}
            className="w-4 h-4 text-primary-600 border-surface-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-surface-700">Habitations</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showHazards}
            onChange={onToggleHazards}
            className="w-4 h-4 text-primary-600 border-surface-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-surface-700">Hazard Zones</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showRelocation}
            onChange={onToggleRelocation}
            className="w-4 h-4 text-primary-600 border-surface-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-surface-700">Relocation Sites</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInfrastructure}
            onChange={onToggleInfrastructure}
            className="w-4 h-4 text-primary-600 border-surface-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-surface-700">Infrastructure</span>
        </label>
      </div>
    </div>
  );
}

function RiskFilter({ 
  selectedRisk, 
  onChange,
  className = ''
}: { 
  selectedRisk: string; 
  onChange: (value: string) => void;
  className?: string;
}) {
  const riskOptions = ['All', 'LOW', 'MODERATE', 'ELEVATED', 'HIGH', 'CRITICAL'];
  return (
    <select
      value={selectedRisk}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 bg-white border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors text-sm ${className}`}
    >
      {riskOptions.map((risk) => (
        <option key={risk} value={risk}>{risk === 'All' ? 'All Risk Levels' : RISK_LABELS[risk] || risk}</option>
      ))}
    </select>
  );
}

function HazardFilter({ 
  selectedHazard, 
  onChange,
  className = ''
}: { 
  selectedHazard: string; 
  onChange: (value: string) => void;
  className?: string;
}) {
  const hazardOptions = ['All', 'Landslide', 'Flood', 'Cloudburst', 'Coastal Erosion'];
  return (
    <select
      value={selectedHazard}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 bg-white border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors text-sm ${className}`}
    >
      {hazardOptions.map((hazard) => (
        <option key={hazard} value={hazard}>{hazard === 'All' ? 'All Hazard Types' : hazard}</option>
      ))}
    </select>
  );
}

function HazardSeverityFilter({ 
  selectedSeverity, 
  onChange,
  className = ''
}: { 
  selectedSeverity: string; 
  onChange: (value: string) => void;
  className?: string;
}) {
  const severityOptions = ['All', 'Low', 'Moderate', 'High', 'Critical'];
  return (
    <select
      value={selectedSeverity}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 bg-white border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors text-sm ${className}`}
    >
      {severityOptions.map((severity) => (
        <option key={severity} value={severity}>{severity === 'All' ? 'All Severities' : severity}</option>
      ))}
    </select>
  );
}

function StatusFilter({ 
  selectedStatus, 
  onChange,
  className = ''
}: { 
  selectedStatus: string; 
  onChange: (value: string) => void;
  className?: string;
}) {
  const statusOptions = ['All', 'Safe', 'Monitor', 'At Risk', 'Red Zone', 'Relocation Required'];
  return (
    <select
      value={selectedStatus}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 bg-white border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors text-sm ${className}`}
    >
      {statusOptions.map((status) => (
        <option key={status} value={status}>{status === 'All' ? 'All Statuses' : status}</option>
      ))}
    </select>
  );
}

function Legend() {
  return (
    <div className="map-control-panel p-4">
      <h3 className="text-sm font-semibold text-surface-900 mb-3">Legend</h3>
      <div className="space-y-2">
        <div className="text-xs font-medium text-surface-500 uppercase tracking-wider">Risk Level</div>
        <div className="space-y-1.5">
          {Object.entries(RISK_LABELS).map(([key, label]) => (
            <div key={key} className="legend-item">
              <div 
                className="w-3 h-3 rounded-full border border-white shadow-sm" 
                style={{ backgroundColor: RISK_COLORS[key] }}
              />
              <span className="text-sm text-surface-700">{label}</span>
            </div>
          ))}
        </div>
        <div className="text-xs font-medium text-surface-500 uppercase tracking-wider mt-2">Hazard Severity</div>
        <div className="space-y-1.5">
          {HAZARD_SEVERITY_LEVELS.map((level) => (
            <div key={level.key} className="legend-item">
              <div 
                className="w-3 h-3 rounded-full border border-white shadow-sm" 
                style={{ backgroundColor: level.color }}
              />
              <span className="text-sm text-surface-700">{level.key}</span>
            </div>
          ))}
        </div>
        <div className="text-xs font-medium text-surface-500 uppercase tracking-wider mt-2">Relocation Site</div>
        <div className="legend-item">
          <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: '#22c55e' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-white mx-auto mt-[1.5px]" />
          </div>
          <span className="text-sm text-surface-700">Available Capacity</span>
        </div>
        <div className="legend-item">
          <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: '#3b82f6' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-white mx-auto mt-[1.5px]" />
          </div>
          <span className="text-sm text-surface-700">Moderate Utilization</span>
        </div>
        <div className="legend-item">
          <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: '#f97316' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-white mx-auto mt-[1.5px]" />
          </div>
          <span className="text-sm text-surface-700">High Utilization</span>
        </div>
        <div className="legend-item">
          <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: '#dc2626' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-white mx-auto mt-[1.5px]" />
          </div>
          <span className="text-sm text-surface-700">Critical Utilization</span>
        </div>
      </div>
    </div>
  );
}

function MapStatistics({ habitations, hazards, relocationSites }: { 
  habitations: Habitation[]; 
  hazards: Hazard[]; 
  relocationSites: RelocationSite[]; 
}) {
  const stats = useMemo(() => {
    const highCritical = habitations.filter(h => h.risk_level === 'HIGH' || h.risk_level === 'CRITICAL').length;
    const redZones = habitations.filter(h => h.risk_level === 'CRITICAL').length;
    const criticalHazards = hazards.filter(h => h.severity >= 85).length;
    return {
      totalHabitations: habitations.length,
      highCritical,
      redZones,
      totalHazardZones: hazards.length,
      criticalHazards,
      totalRelocationSites: relocationSites.length,
    };
  }, [habitations, hazards, relocationSites]);

  return (
    <div className="map-control-panel p-4">
      <h3 className="text-sm font-semibold text-surface-900 mb-3">Map Statistics</h3>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-surface-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-primary-600">{stats.totalHabitations}</p>
          <p className="text-xs text-surface-500">Habitations</p>
        </div>
        <div className="bg-surface-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-red-600">{stats.redZones}</p>
          <p className="text-xs text-surface-500">Red Zones</p>
        </div>
        <div className="bg-surface-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-orange-600">{stats.highCritical}</p>
          <p className="text-xs text-surface-500">High/Critical</p>
        </div>
        <div className="bg-surface-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-surface-600">{stats.totalHazardZones}</p>
          <p className="text-xs text-surface-500">Hazard Zones</p>
        </div>
        <div className="bg-surface-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-red-600">{stats.criticalHazards}</p>
          <p className="text-xs text-surface-500">Critical Hazards</p>
        </div>
        <div className="bg-surface-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-green-600">{stats.totalRelocationSites}</p>
          <p className="text-xs text-surface-500">Relocation Sites</p>
        </div>
      </div>
    </div>
  );
}

function DetailsPanel({ 
  feature, 
  onClose,
  infrastructureMap
}: { 
  feature: FeatureDetails | null; 
  onClose: () => void;
  infrastructureMap: Map<string, Infrastructure>;
}) {
  if (!feature) return null;

  const { type, data } = feature;

  if (type === 'habitation') {
    const h = data as Habitation;
    const infra = infrastructureMap.get(h.id);
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full lg:w-80 bg-white shadow-xl border-l border-surface-200 overflow-y-auto animate-slide-in">
        <div className="p-4 border-b border-surface-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-surface-900">Habitation Details</h3>
          <button onClick={onClose} className="p-1 text-surface-400 hover:text-surface-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-surface-900">{h.name}</h4>
            <p className="text-sm text-surface-500">{h.district}, {h.state}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Population</p>
              <p className="font-semibold text-surface-900">{h.population.toLocaleString()}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Risk Score</p>
              <p className="font-semibold text-surface-900">{h.risk_score}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RiskBadge level={h.risk_level} />
            <span className="text-sm text-surface-500">{h.hazard_type}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-500">Status</span>
              <span className="font-medium text-surface-900">
                {h.risk_level === 'CRITICAL' ? 'RED ZONE' : 
                 h.risk_level === 'HIGH' ? 'AT RISK' : 
                 h.risk_level === 'ELEVATED' ? 'MONITOR' : 'SAFE'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Relocation Priority</span>
              <span className="font-medium text-surface-900">{h.relocation_priority}</span>
            </div>
            {infra && (
              <div className="flex justify-between">
                <span className="text-surface-500">Road Connectivity</span>
                <span className="font-medium text-surface-900">{infra.road_connectivity}</span>
              </div>
            )}
          </div>
          {infra && (
            <div className="pt-4 border-t border-surface-200 space-y-1 text-sm">
              <p className="font-medium text-surface-900">Infrastructure Scores</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-surface-500">Roads:</span> <span className="font-medium">{infra.roads_score}</span></div>
                <div><span className="text-surface-500">Water:</span> <span className="font-medium">{infra.water_score}</span></div>
                <div><span className="text-surface-500">Healthcare:</span> <span className="font-medium">{infra.healthcare_score}</span></div>
                <div><span className="text-surface-500">Schools:</span> <span className="font-medium">{infra.schools_score}</span></div>
                <div><span className="text-surface-500">Electricity:</span> <span className="font-medium">{infra.electricity_score}</span></div>
                <div><span className="text-surface-500">Sanitation:</span> <span className="font-medium">{infra.sanitation_score}</span></div>
                <div><span className="text-surface-500">Emergency:</span> <span className="font-medium">{infra.emergency_services_score}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'hazard') {
    const h = data as Hazard;
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full lg:w-80 bg-white shadow-xl border-l border-surface-200 overflow-y-auto animate-slide-in">
        <div className="p-4 border-b border-surface-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-surface-900">Hazard Zone Details</h3>
          <button onClick={onClose} className="p-1 text-surface-400 hover:text-surface-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-surface-900">{h.name}</h4>
            <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">{h.hazard_type}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Severity</p>
              <p className="font-semibold text-surface-900">{h.severity}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Level</p>
              <p className="font-semibold text-surface-900">{getHazardSeverityLabel(h.severity)}</p>
            </div>
          </div>
          {h.frequency && (
            <div>
              <p className="text-xs text-surface-500">Frequency</p>
              <p className="text-sm text-surface-700">{h.frequency}</p>
            </div>
          )}
          {h.description && (
            <div>
              <p className="text-xs text-surface-500">Description</p>
              <p className="text-sm text-surface-700">{h.description}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'relocation') {
    const r = data as RelocationSite;
    const utilization = r.total_capacity > 0 ? (r.current_population / r.total_capacity) * 100 : 0;
    const utilColor = utilization >= 80 ? 'text-red-600' : utilization >= 60 ? 'text-amber-600' : utilization >= 40 ? 'text-blue-600' : 'text-green-600';
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full lg:w-80 bg-white shadow-xl border-l border-surface-200 overflow-y-auto animate-slide-in">
        <div className="p-4 border-b border-surface-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-surface-900">Relocation Site Details</h3>
          <button onClick={onClose} className="p-1 text-surface-400 hover:text-surface-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-surface-900">{r.name}</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Total Capacity</p>
              <p className="font-semibold text-surface-900">{r.total_capacity.toLocaleString()}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Current Population</p>
              <p className="font-semibold text-surface-900">{r.current_population.toLocaleString()}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Available Capacity</p>
              <p className="font-semibold text-surface-900">{r.available_capacity.toLocaleString()}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Utilization</p>
              <p className={`font-semibold text-surface-900 ${utilColor}`}>{utilization.toFixed(1)}%</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-500">Water Capacity</span>
              <span className="font-medium text-surface-900">{r.water_capacity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Housing Capacity</span>
              <span className="font-medium text-surface-900">{r.housing_capacity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Healthcare Capacity</span>
              <span className="font-medium text-surface-900">{r.healthcare_capacity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">School Capacity</span>
              <span className="font-medium text-surface-900">{r.school_capacity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Road Access</span>
              <span className="font-medium text-surface-900">{r.road_connectivity || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Electricity</span>
              <span className="font-medium text-surface-900">{r.electricity ? 'Available' : 'Not Available'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Sanitation</span>
              <span className="font-medium text-surface-900">{r.sanitation ? 'Available' : 'Not Available'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Emergency Services</span>
              <span className="font-medium text-surface-900">{r.emergency_services ? 'Available' : 'Not Available'}</span>
            </div>
          </div>
          {r.environmental_status && (
            <div className="pt-4 border-t border-surface-200">
              <p className="text-xs text-surface-500">Environmental Status</p>
              <p className="text-sm text-surface-700">{r.environmental_status}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'infrastructure') {
    const i = data as Infrastructure;
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full lg:w-80 bg-white shadow-xl border-l border-surface-200 overflow-y-auto animate-slide-in">
        <div className="p-4 border-b border-surface-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-surface-900">Infrastructure Details</h3>
          <button onClick={onClose} className="p-1 text-surface-400 hover:text-surface-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-surface-900">Habitation: {i.habitation_id}</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Roads Score</p>
              <p className="font-semibold text-surface-900">{i.roads_score}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Water Score</p>
              <p className="font-semibold text-surface-900">{i.water_score}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Healthcare Score</p>
              <p className="font-semibold text-surface-900">{i.healthcare_score}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Schools Score</p>
              <p className="font-semibold text-surface-900">{i.schools_score}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Electricity Score</p>
              <p className="font-semibold text-surface-900">{i.electricity_score}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Sanitation Score</p>
              <p className="font-semibold text-surface-900">{i.sanitation_score}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3">
              <p className="text-xs text-surface-500">Emergency Score</p>
              <p className="font-semibold text-surface-900">{i.emergency_services_score}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm pt-4 border-t border-surface-200">
            <div className="flex justify-between">
              <span className="text-surface-500">Road Connectivity</span>
              <span className="font-medium text-surface-900">{i.road_connectivity || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Water Source</span>
              <span className="font-medium text-surface-900">{i.water_source || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Healthcare Facilities</span>
              <span className="font-medium text-surface-900">{i.healthcare_facilities}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">School Count</span>
              <span className="font-medium text-surface-900">{i.school_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Electricity Coverage</span>
              <span className="font-medium text-surface-900">{i.electricity_coverage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Sanitation Coverage</span>
              <span className="font-medium text-surface-900">{i.sanitation_coverage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Emergency Response Time</span>
              <span className="font-medium text-surface-900">{i.emergency_response_time ? `${i.emergency_response_time} min` : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function MapRef({ setMap }: { setMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    setMap(map);
  }, [map, setMap]);
  return null;
}

export default function GISMap() {
  const [habitations, setHabitations] = useState<Habitation[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [relocationSites, setRelocationSites] = useState<RelocationSite[]>([]);
  const [infrastructure, setInfrastructure] = useState<Infrastructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [map, setMap] = useState<L.Map | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureDetails | null>(null);
  const [showHabitations, setShowHabitations] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [showRelocation, setShowRelocation] = useState(true);
  const [showInfrastructure, setShowInfrastructure] = useState(false);
  const [riskFilter, setRiskFilter] = useState('All');
  const [hazardFilter, setHazardFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const infrastructureMap = useMemo(() => {
    const map = new Map<string, Infrastructure>();
    infrastructure.forEach(i => map.set(i.habitation_id, i));
    return map;
  }, [infrastructure]);

  const filteredHabitations = useMemo(() => {
    return habitations.filter(h => {
      if (riskFilter !== 'All' && h.risk_level !== riskFilter) return false;
      if (hazardFilter !== 'All' && h.hazard_type !== hazardFilter) return false;
      if (statusFilter !== 'All') {
        const status = h.risk_level === 'CRITICAL' ? 'Red Zone' : 
                      h.risk_level === 'HIGH' ? 'At Risk' : 
                      h.risk_level === 'ELEVATED' ? 'Monitor' : 'Safe';
        if (status !== statusFilter) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!h.name.toLowerCase().includes(q) && 
            !h.district.toLowerCase().includes(q) &&
            !h.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [habitations, riskFilter, hazardFilter, statusFilter, searchQuery]);

  const filteredHazards = useMemo(() => {
    return hazards.filter(h => {
      if (hazardFilter !== 'All' && h.hazard_type !== hazardFilter) return false;
      if (severityFilter !== 'All') {
        const severityLabel = getHazardSeverityLabel(h.severity);
        if (severityLabel !== severityFilter) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!h.name.toLowerCase().includes(q) && 
            !h.hazard_type.toLowerCase().includes(q) &&
            !h.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [hazards, hazardFilter, severityFilter, searchQuery]);

  const filteredRelocationSites = useMemo(() => {
    return relocationSites.filter(r => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [relocationSites, searchQuery]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Find and zoom to feature
    const hab = habitations.find(h => 
      h.name.toLowerCase().includes(query.toLowerCase()) || 
      h.id.toLowerCase().includes(query.toLowerCase())
    );
    const haz = hazards.find(h => 
      h.name.toLowerCase().includes(query.toLowerCase()) || 
      h.id.toLowerCase().includes(query.toLowerCase())
    );
    const rel = relocationSites.find(r => 
      r.name.toLowerCase().includes(query.toLowerCase()) || 
      r.id.toLowerCase().includes(query.toLowerCase())
    );

    if (map) {
      if (hab) {
        map.flyTo([hab.latitude, hab.longitude], 13);
        setSelectedFeature({ type: 'habitation', data: hab });
      } else if (haz) {
        // For hazards, we'd need the geometry bounds
        map.flyTo([30.32, 78.05], 11);
        setSelectedFeature({ type: 'hazard', data: haz });
      } else if (rel) {
        map.flyTo([rel.latitude, rel.longitude], 13);
        setSelectedFeature({ type: 'relocation', data: rel });
      }
    }
  }, [habitations, hazards, relocationSites, map]);

  // Load data
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      setErrors({});
      
      const results = await Promise.allSettled([
        fetchHabitations({ limit: 100 }),
        fetchHazards({ limit: 100 }),
        fetchRelocationSites({ limit: 100 }),
        fetchInfrastructure({ limit: 100 }),
      ]);

      if (!mounted) return;

      const [habResult, hazResult, relResult, infraResult] = results;

      if (habResult.status === 'fulfilled') {
        setHabitations(habResult.value.habitations);
      } else {
        setErrors(prev => ({ ...prev, habitations: 'Failed to load habitations' }));
      }

      if (hazResult.status === 'fulfilled') {
        setHazards(hazResult.value.hazards);
      } else {
        setErrors(prev => ({ ...prev, hazards: 'Failed to load hazard zones' }));
      }

      if (relResult.status === 'fulfilled') {
        setRelocationSites(relResult.value.relocation_sites);
      } else {
        setErrors(prev => ({ ...prev, relocation: 'Failed to load relocation sites' }));
      }

      if (infraResult.status === 'fulfilled') {
        setInfrastructure(infraResult.value.infrastructure);
      } else {
        setErrors(prev => ({ ...prev, infrastructure: 'Failed to load infrastructure' }));
      }

      setLoading(false);
    };
    loadData();
    return () => { mounted = false; };
  }, []);

  // Calculate bounds for initial map view
  const bounds = useMemo(() => {
    const coords: [number, number][] = [];
    habitations.forEach(h => coords.push([h.latitude, h.longitude]));
    relocationSites.forEach(r => coords.push([r.latitude, r.longitude]));
    hazards.forEach(() => {
      // We'd need to parse GeoJSON geometry for bounds
    });
    if (coords.length > 0) {
      return L.latLngBounds(coords as any);
    }
    return null;
  }, [habitations, relocationSites, hazards]);

  useEffect(() => {
    if (map && bounds) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 12 });
    }
  }, [map, bounds]);

  // Default center for demo data (Demo District area)
  const defaultCenter: [number, number] = [30.32, 78.05];
  const defaultZoom = 11;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto mb-4" />
          <p className="text-surface-600">Loading GIS data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Map Container */}
      <div className="flex-1 lg:flex-[calc(100%-360px)] relative min-h-[600px]">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
          <MapRef setMap={setMap} />
          
          {/* Hazard Zones Layer */}
          {showHazards && filteredHazards.length > 0 && (
            <GeoJSON
              data={{
                type: 'FeatureCollection',
                features: filteredHazards.map((hazard) => ({
                  type: 'Feature' as const,
                  id: hazard.id,
                  properties: hazard,
                  geometry: (hazard as any).geometry || null,
                })).filter((f) => f.geometry)
              } as any}
              style={(feature) => {
                if (!feature || !feature.properties) {
                  return { color: '#64748b', weight: 2, fillColor: '#64748b', fillOpacity: 0.25, opacity: 0.8 };
                }
                const hazard = feature.properties as Hazard;
                const color = HAZARD_TYPE_COLORS[hazard.hazard_type] || getHazardSeverityColor(hazard.severity);
                return {
                  color: color,
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.25,
                  opacity: 0.8,
                };
              }}
              onEachFeature={(feature, layer) => {
                const hazard = feature.properties as Hazard;
                layer.bindPopup(`
                  <div class="p-1 min-w-[200px]">
                    <h4 class="font-semibold text-surface-900 mb-1">${hazard.name}</h4>
                    <p class="text-xs text-surface-500 mb-1"><span class="font-medium">Type:</span> ${hazard.hazard_type}</p>
                    <p class="text-xs text-surface-500 mb-1"><span className="font-medium">Severity:</span> ${hazard.severity} (${getHazardSeverityLabel(hazard.severity)})</p>
                    ${hazard.frequency ? `<p class="text-xs text-surface-500 mb-1"><span className="font-medium">Frequency:</span> ${hazard.frequency}</p>` : ''}
                    ${hazard.description ? `<p class="text-xs text-surface-500">${hazard.description}</p>` : ''}
                  </div>
                `);
                layer.on('click', () => {
                  setSelectedFeature({ type: 'hazard', data: hazard });
                });
              }}
            />
          )}
          
          {/* Habitations Layer */}
          {showHabitations && filteredHabitations.length > 0 && (
            <FeatureGroup>
              {filteredHabitations.map((habitation) => (
                <Marker
                  key={habitation.id}
                  position={[habitation.latitude, habitation.longitude]}
                  icon={createRiskMarkerIcon(habitation.risk_level)}
                >
                  <Popup>
                    <div className="p-1 min-w-[200px]">
                      <h4 className="font-semibold text-surface-900 mb-1">{habitation.name}</h4>
                      <p className="text-xs text-surface-500 mb-1"><span className="font-medium">District:</span> {habitation.district}</p>
                      <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Population:</span> {habitation.population.toLocaleString()}</p>
                      <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Risk Score:</span> {habitation.risk_score}</p>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="font-medium text-xs text-surface-500">Risk Level:</span>
                        <RiskBadge level={habitation.risk_level} />
                      </div>
                      <p className="text-xs text-surface-500"><span className="font-medium">Hazard:</span> {habitation.hazard_type}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </FeatureGroup>
          )}
          
          {/* Relocation Sites Layer */}
          {showRelocation && filteredRelocationSites.length > 0 && (
            <FeatureGroup>
              {filteredRelocationSites.map((site) => {
                const utilization = site.total_capacity > 0 ? (site.current_population / site.total_capacity) * 100 : 0;
                return (
                  <Marker
                    key={site.id}
                    position={[site.latitude, site.longitude]}
                    icon={createRelocationMarkerIcon(utilization)}
                  >
                    <Popup>
                      <div className="p-1 min-w-[220px]">
                        <h4 className="font-semibold text-surface-900 mb-1">{site.name}</h4>
                        <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Total Capacity:</span> {site.total_capacity.toLocaleString()}</p>
                        <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Current:</span> {site.current_population.toLocaleString()}</p>
                        <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Available:</span> {site.available_capacity.toLocaleString()}</p>
                        <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Utilization:</span> {utilization.toFixed(1)}%</p>
                        <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Road Access:</span> {site.road_connectivity || 'N/A'}</p>
                        <p className="text-xs text-surface-500"><span className="font-medium">Environmental:</span> {site.environmental_status || 'N/A'}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </FeatureGroup>
          )}

          {/* Infrastructure Layer - using habitation coordinates */}
          {showInfrastructure && infrastructure.length > 0 && (
            <FeatureGroup>
              {infrastructure.map((infra) => {
                const hab = habitations.find(h => h.id === infra.habitation_id);
                if (!hab) return null;
                
                // Create multiple markers for different infrastructure types
                const types = [
                  { key: 'roads', score: infra.roads_score },
                  { key: 'water', score: infra.water_score },
                  { key: 'healthcare', score: infra.healthcare_score },
                  { key: 'schools', score: infra.schools_score },
                  { key: 'electricity', score: infra.electricity_score },
                  { key: 'sanitation', score: infra.sanitation_score },
                  { key: 'emergency', score: infra.emergency_services_score },
                ];
                
                return types.map((type, idx) => {
                  // Offset markers slightly to avoid overlap
                  const offsetLat = hab.latitude + (idx % 3 - 1) * 0.005;
                  const offsetLng = hab.longitude + (Math.floor(idx / 3) - 1) * 0.005;
                  
                  return (
                    <Marker
                      key={`${infra.habitation_id}-${type.key}`}
                      position={[offsetLat, offsetLng]}
                      icon={createInfrastructureMarkerIcon(type.key)}
                    >
                      <Popup>
                        <div className="p-1 min-w-[200px]">
                          <h4 className="font-semibold text-surface-900 mb-1">{type.key.charAt(0).toUpperCase() + type.key.slice(1)}</h4>
                          <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Habitation:</span> {hab.name}</p>
                          <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Score:</span> {type.score}</p>
                          {type.key === 'roads' && infra.road_connectivity && (
                            <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Connectivity:</span> {infra.road_connectivity}</p>
                          )}
                          {type.key === 'water' && infra.water_source && (
                            <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Source:</span> {infra.water_source}</p>
                          )}
                          {type.key === 'healthcare' && (
                            <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Facilities:</span> {infra.healthcare_facilities}</p>
                          )}
                          {type.key === 'schools' && (
                            <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Schools:</span> {infra.school_count}</p>
                          )}
                          {type.key === 'electricity' && (
                            <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Coverage:</span> {infra.electricity_coverage}%</p>
                          )}
                          {type.key === 'sanitation' && (
                            <p className="text-xs text-surface-500 mb-1"><span className="font-medium">Coverage:</span> {infra.sanitation_coverage}%</p>
                          )}
                          {type.key === 'emergency' && infra.emergency_response_time && (
                            <p className="text-xs text-surface-500"><span className="font-medium">Response Time:</span> {infra.emergency_response_time} min</p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                });
              })}
            </FeatureGroup>
          )}
        </MapContainer>
        
        {/* Map Controls Overlay */}
        <div className="absolute top-4 left-4 right-4 lg:right-auto lg:w-96 z-20 flex flex-col gap-3">
          {/* Header */}
          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-lg">
            <h2 className="text-xl font-bold text-surface-900">GIS Hazard & Risk Map</h2>
            <p className="text-sm text-surface-500 mt-1">Interactive visualization of demo hazard, habitation, infrastructure and relocation data.</p>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-lg">
            <SearchControl onSearch={handleSearch} />
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Risk Level</label>
                <RiskFilter selectedRisk={riskFilter} onChange={setRiskFilter} />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Hazard Type</label>
                <HazardFilter selectedHazard={hazardFilter} onChange={setHazardFilter} />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Hazard Severity</label>
                <HazardSeverityFilter selectedSeverity={severityFilter} onChange={setSeverityFilter} />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Habitation Status</label>
                <StatusFilter selectedStatus={statusFilter} onChange={setStatusFilter} />
              </div>
            </div>
          </div>
        </div>

        {/* Demo Data Disclaimer */}
        <div className="absolute bottom-4 left-4 right-4 lg:right-auto lg:w-96 z-20">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-800">
              <strong>DEMO DATA —</strong> The locations, population, hazard scores, risk assessments and relocation recommendations shown in this prototype are fictional/sample records created for demonstration. They are not official government data or official relocation orders.
            </p>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Controls & Details */}
      <div className="lg:w-96 flex flex-col border-l border-surface-200 bg-white hidden lg:flex">
        {/* Layer Control */}
        <LayerControl
          showHabitations={showHabitations}
          showHazards={showHazards}
          showRelocation={showRelocation}
          showInfrastructure={showInfrastructure}
          onToggleHabitations={() => setShowHabitations(!showHabitations)}
          onToggleHazards={() => setShowHazards(!showHazards)}
          onToggleRelocation={() => setShowRelocation(!showRelocation)}
          onToggleInfrastructure={() => setShowInfrastructure(!showInfrastructure)}
        />

        {/* Legend */}
        <Legend />

        {/* Map Statistics */}
        <MapStatistics 
          habitations={filteredHabitations} 
          hazards={filteredHazards} 
          relocationSites={filteredRelocationSites} 
        />

        {/* Errors */}
        {Object.keys(errors).length > 0 && (
          <div className="p-4 border-t border-surface-200">
            <div className="space-y-2">
              {Object.entries(errors).map(([key, error]) => (
                <div key={key} className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      <div className="lg:hidden fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-xl border-l border-surface-200 transform transition-transform">
        <div className="p-4 border-b border-surface-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-surface-900">Map Controls</h3>
          <button onClick={() => {}} className="p-1 text-surface-400 hover:text-surface-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <LayerControl
            showHabitations={showHabitations}
            showHazards={showHazards}
            showRelocation={showRelocation}
            showInfrastructure={showInfrastructure}
            onToggleHabitations={() => setShowHabitations(!showHabitations)}
            onToggleHazards={() => setShowHazards(!showHazards)}
            onToggleRelocation={() => setShowRelocation(!showRelocation)}
            onToggleInfrastructure={() => setShowInfrastructure(!showInfrastructure)}
          />
          <Legend />
          <MapStatistics 
            habitations={filteredHabitations} 
            hazards={filteredHazards} 
            relocationSites={filteredRelocationSites} 
          />
        </div>
      </div>

      {/* Details Panel */}
      <DetailsPanel 
        feature={selectedFeature} 
        onClose={() => setSelectedFeature(null)}
        infrastructureMap={infrastructureMap}
      />

      {/* Mobile map controls */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-20 flex flex-col gap-3">
        <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-lg">
          <h2 className="text-lg font-bold text-surface-900">GIS Hazard & Risk Map</h2>
          <p className="text-xs text-surface-500 mt-1">Interactive visualization of demo data.</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-lg">
          <SearchControl onSearch={handleSearch} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Risk Level</label>
              <RiskFilter selectedRisk={riskFilter} onChange={setRiskFilter} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Hazard Type</label>
              <HazardFilter selectedHazard={hazardFilter} onChange={setHazardFilter} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Severity</label>
              <HazardSeverityFilter selectedSeverity={severityFilter} onChange={setSeverityFilter} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Status</label>
              <StatusFilter selectedStatus={statusFilter} onChange={setStatusFilter} className="w-full" />
            </div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-800">
            <strong>DEMO DATA —</strong> The locations, population, hazard scores, risk assessments and relocation recommendations shown in this prototype are fictional/sample records created for demonstration. They are not official government data or official relocation orders.
          </p>
        </div>
      </div>
    </div>
  );
}