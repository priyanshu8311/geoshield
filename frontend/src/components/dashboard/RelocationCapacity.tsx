import { RelocationSite, fetchRelocationSitesWithCapacity } from '../../services/api';
import { useEffect, useState } from 'react';

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-surface-200 rounded ${className}`} />
  );
}

interface RelocationCapacityProps {
  loading?: boolean;
}

export function RelocationCapacity({ loading = false }: RelocationCapacityProps) {
  const [sites, setSites] = useState<RelocationSite[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSites() {
      try {
        const data = await fetchRelocationSitesWithCapacity();
        setSites(data.relocation_sites);
      } catch (err) {
        console.error('Failed to load relocation sites:', err);
        setError('Unable to load relocation capacity');
      }
    }
    loadSites();
  }, []);

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return 'bg-red-500';
    if (utilization >= 60) return 'bg-amber-500';
    if (utilization >= 40) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getUtilizationTextColor = (utilization: number) => {
    if (utilization >= 80) return 'text-red-700';
    if (utilization >= 60) return 'text-amber-700';
    if (utilization >= 40) return 'text-blue-700';
    return 'text-green-700';
  };

  const getUtilizationBgColor = (utilization: number) => {
    if (utilization >= 80) return 'bg-red-50';
    if (utilization >= 60) return 'bg-amber-50';
    if (utilization >= 40) return 'bg-blue-50';
    return 'bg-green-50';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 bg-surface-50 rounded-lg">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
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
          <h2 className="text-lg font-semibold text-surface-900">Relocation Capacity</h2>
          <p className="text-xs text-surface-500">Available Sites</p>
        </div>
        <div className="text-center py-8 text-surface-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900">Relocation Capacity</h2>
          <p className="text-xs text-surface-500">Available Sites</p>
        </div>
        <div className="text-center py-8 text-surface-500">
          <p>No relocation sites configured</p>
        </div>
      </div>
    );
  }

  const totalCapacity = sites.reduce((sum, s) => sum + s.total_capacity, 0);
  const totalCurrent = sites.reduce((sum, s) => sum + s.current_population, 0);
  const totalAvailable = sites.reduce((sum, s) => sum + s.available_capacity, 0);
  // const overallUtilization = totalCapacity > 0 ? (totalCurrent / totalCapacity) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-surface-900">Relocation Capacity</h2>
        <p className="text-xs text-surface-500">{sites.length} sites</p>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-50 rounded-lg p-4">
          <p className="text-sm text-surface-500">Total Capacity</p>
          <p className="text-2xl font-bold text-surface-900">{totalCapacity.toLocaleString()}</p>
        </div>
        <div className="bg-surface-50 rounded-lg p-4">
          <p className="text-sm text-surface-500">Current Population</p>
          <p className="text-2xl font-bold text-surface-900">{totalCurrent.toLocaleString()}</p>
        </div>
        <div className="bg-surface-50 rounded-lg p-4">
          <p className="text-sm text-surface-500">Available Capacity</p>
          <p className="text-2xl font-bold text-surface-900">{totalAvailable.toLocaleString()}</p>
        </div>
      </div>

      {/* Sites List */}
      <div className="space-y-3">
        {sites.map((site) => {
          const utilization = site.total_capacity > 0 
            ? (site.current_population / site.total_capacity) * 100 
            : 0;
          const utilColor = getUtilizationColor(utilization);
          const utilTextColor = getUtilizationTextColor(utilization);
          const utilBgColor = getUtilizationBgColor(utilization);

          return (
            <div key={site.id} className="flex items-center gap-4 p-4 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${utilBgColor}`}>
                <svg className={`w-6 h-6 ${utilTextColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-surface-900 truncate">{site.name}</h4>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${utilBgColor} ${utilTextColor}`}>
                    {utilization.toFixed(1)}% utilized
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-surface-500 mt-1 flex-wrap">
                  <span>Total: {site.total_capacity.toLocaleString()}</span>
                  <span>Current: {site.current_population.toLocaleString()}</span>
                  <span className="font-medium text-surface-900">Available: {site.available_capacity.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-surface-200 rounded-full overflow-hidden flex-1 min-w-[150px]">
                  <div
                    className={`h-full rounded-full ${utilColor} transition-all duration-500`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-right min-w-[120px]">
                <p className="text-xs text-surface-500">Status</p>
                <p className={`text-sm font-medium ${utilTextColor}`}>
                  {site.environmental_status || 'Stable'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}