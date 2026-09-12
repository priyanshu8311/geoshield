import { Hazard, fetchHazardZones } from '../../services/api';
import { useEffect, useState } from 'react';

const HAZARD_TYPES = [
  { key: 'Landslide', icon: '🏔️', color: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  { key: 'Flood', icon: '🌊', color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  { key: 'Cloudburst', icon: '⛈️', color: 'bg-indigo-500', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700' },
  { key: 'Coastal Erosion', icon: '🌊', color: 'bg-teal-500', bgColor: 'bg-teal-50', textColor: 'text-teal-700' },
  { key: 'Flash Flood', icon: '💧', color: 'bg-cyan-500', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700' },
  { key: 'River Erosion', icon: '🏞️', color: 'bg-emerald-500', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' },
  { key: 'Earthquake', icon: '🌍', color: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' },
  { key: 'Multi-Hazard', icon: '⚠️', color: 'bg-purple-500', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
];

interface HazardOverviewProps {
  loading?: boolean;
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-surface-200 rounded ${className}`} />
  );
}

export function HazardOverview({ loading = false }: HazardOverviewProps) {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHazards() {
      try {
        const data = await fetchHazardZones();
        setHazards(data.hazards);
      } catch (err) {
        console.error('Failed to load hazards:', err);
        setError('Unable to load hazard zones');
      }
    }
    loadHazards();
  }, []);

  const hazardCounts = HAZARD_TYPES.map(type => {
    const matchingHazards = hazards.filter(h => h.hazard_type === type.key);
    const criticalCount = matchingHazards.filter(h => h.severity >= 85).length;
    return {
      ...type,
      count: matchingHazards.length,
      criticalCount,
      maxSeverity: matchingHazards.length > 0 ? Math.max(...matchingHazards.map(h => h.severity)) : 0,
    };
  }).filter(h => h.count > 0);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {HAZARD_TYPES.slice(0, 4).map(() => (
            <div key="skeleton" className="text-center p-4 bg-surface-50 rounded-lg">
              <Skeleton className="h-12 w-12 rounded-full mx-auto mb-2" />
              <Skeleton className="h-6 w-16 mx-auto mb-1" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900">Hazard Overview</h2>
          <p className="text-xs text-surface-500">Hazard Zones</p>
        </div>
        <div className="text-center py-8 text-surface-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-surface-900">Hazard Overview</h2>
        <p className="text-xs text-surface-500">{hazards.length} hazard zones</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {hazardCounts.map((hazard) => (
          <div key={hazard.key} className="text-center p-4 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${hazard.bgColor} text-2xl`}>
              {hazard.icon}
            </div>
            <p className="text-2xl font-bold text-surface-900">{hazard.count}</p>
            <p className="text-xs text-surface-500 mt-1">{hazard.key}</p>
            {hazard.criticalCount > 0 && (
              <p className="text-xs text-red-600 mt-1">{hazard.criticalCount} critical</p>
            )}
            {hazard.maxSeverity > 0 && (
              <div className="mt-2 flex justify-center">
                <div className={`h-1.5 rounded-full ${hazard.color}`} style={{ width: `${Math.min(hazard.maxSeverity, 100)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}