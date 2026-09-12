import { useEffect, useState, useMemo } from 'react';
import {
  fetchCapacityAssessments,
  fetchCapacityStatistics,
  CapacityAssessment,
  CapacityStatistics,
} from '../services/api';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-200 rounded ${className}`} />;
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-10 w-1/2 mb-4" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div className="p-4 border-b border-surface-200">
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Site</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Total Capacity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Current Population</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Available Capacity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Utilization</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Capacity Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {[1, 2, 3].map((i) => (
              <tr key={i} className="hover:bg-surface-50">
                <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CarryingCapacity() {
  const [assessments, setAssessments] = useState<CapacityAssessment[]>([]);
  const [statistics, setStatistics] = useState<CapacityStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<CapacityAssessment | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    utilizationMin: '',
    utilizationMax: '',
    search: '',
  });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'utilization_percent',
    direction: 'desc',
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [assessmentsData, statisticsData] = await Promise.all([
          fetchCapacityAssessments({ limit: 100 }),
          fetchCapacityStatistics(),
        ]);
        setAssessments(assessmentsData.capacity_assessments);
        setStatistics(statisticsData);
      } catch (err) {
        console.error('Failed to load carrying capacity data:', err);
        setError('Failed to load carrying capacity data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredAndSortedAssessments = useMemo(() => {
    let result = [...assessments];

    // Apply filters
    if (filters.status) {
      result = result.filter((a) => a.capacity_status === filters.status);
    }
    if (filters.utilizationMin) {
      result = result.filter((a) => a.utilization_percent >= parseFloat(filters.utilizationMin));
    }
    if (filters.utilizationMax) {
      result = result.filter((a) => a.utilization_percent <= parseFloat(filters.utilizationMax));
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.site_name.toLowerCase().includes(searchLower) ||
          a.relocation_site_id.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof CapacityAssessment];
      const bVal = b[sortConfig.key as keyof CapacityAssessment];
      if (aVal === undefined || bVal === undefined) return 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return result;
  }, [assessments, filters, sortConfig]);

  const statusOrder = ['INSUFFICIENT', 'STRESSED', 'LIMITED', 'ADEQUATE'];
  const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    ADEQUATE: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    LIMITED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    STRESSED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    INSUFFICIENT: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  };

  const getUtilizationColor = (util: number) => {
    if (util >= 90) return 'bg-red-500';
    if (util >= 75) return 'bg-amber-500';
    if (util >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-1" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Carrying Capacity</h1>
            <p className="mt-1 text-surface-500">Relocation site capacity and infrastructure assessment</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3 text-red-700">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const displayStatistics = statistics || {
    total_sites: 0,
    total_capacity: 0,
    total_current_population: 0,
    total_available_capacity: 0,
    overall_utilization: 0,
    average_capacity_score: 0,
    status_distribution: { ADEQUATE: 0, LIMITED: 0, STRESSED: 0, INSUFFICIENT: 0 },
    adequate_sites: 0,
    limited_sites: 0,
    stressed_sites: 0,
    insufficient_sites: 0,
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'ADEQUATE', label: 'Adequate' },
    { value: 'LIMITED', label: 'Limited' },
    { value: 'STRESSED', label: 'Stressed' },
    { value: 'INSUFFICIENT', label: 'Insufficient' },
  ];

  const showDetail = selectedSite !== null;

  if (showDetail && selectedSite) {
    const site = selectedSite;
    const infra = site.infrastructure_assessments;
    const colors = statusColors[site.capacity_status] || statusColors.LIMITED;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <button
              onClick={() => setSelectedSite(null)}
              className="mb-2 text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to List
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">{site.site_name}</h1>
            <p className="mt-1 text-surface-500">Site ID: {site.relocation_site_id}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}
            >
              <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
              {site.capacity_status}
            </span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <p className="text-sm font-medium text-surface-500">Total Capacity</p>
            <p className="mt-1 text-3xl font-bold text-surface-900">{site.total_capacity.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <p className="text-sm font-medium text-surface-500">Current Population</p>
            <p className="mt-1 text-3xl font-bold text-surface-900">{site.current_population.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <p className="text-sm font-medium text-surface-500">Available Capacity</p>
            <p className="mt-1 text-3xl font-bold text-surface-900">{site.available_capacity.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <p className="text-sm font-medium text-surface-500">Capacity Score</p>
            <p className="mt-1 text-3xl font-bold text-surface-900">{site.capacity_score.toFixed(1)}</p>
          </div>
        </div>

        {/* Utilization & Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-900">Utilization</h2>
              <span className={`px-2 py-1 text-sm font-medium rounded-full ${colors.bg} ${colors.text}`}>
                {site.utilization_percent.toFixed(1)}%
              </span>
            </div>
            <div className="h-4 bg-surface-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getUtilizationColor(site.utilization_percent)} transition-all duration-500`}
                style={{ width: `${Math.min(site.utilization_percent, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-surface-500">
              {site.current_population.toLocaleString()} of {site.total_capacity.toLocaleString()} capacity utilized
            </p>
          </div>

          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Capacity Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                <span className="font-medium text-surface-900">Overall Status</span>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${colors.bg} ${colors.text}`}>
                  {site.capacity_status}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                <span className="font-medium text-surface-900">Capacity Score</span>
                <span className="text-lg font-bold text-surface-900">{site.capacity_score.toFixed(1)} / 100</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                <span className="font-medium text-surface-900">Assessment Date</span>
                <span className="text-sm text-surface-500">{new Date(site.assessment_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Infrastructure Assessment */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-lg font-semibold text-surface-900 mb-4">Infrastructure Assessment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {infra.map((item) => {
              const itemColors = statusColors[item.status] || statusColors.LIMITED;
              return (
                <div key={item.name} className="p-4 bg-surface-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-surface-900">{item.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${itemColors.bg} ${itemColors.text}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="h-2 bg-surface-200 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${getUtilizationColor(100 - item.score)} transition-all duration-500`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <p className="text-sm text-surface-500">Score: {item.score.toFixed(1)}</p>
                  {item.capacity > 0 && item.demand > 0 && (
                    <p className="text-xs text-surface-400 mt-1">
                      {item.capacity.toLocaleString()} / {item.demand.toLocaleString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Infrastructure Details Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Component</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Capacity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Demand</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Key Factors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {infra.map((item) => {
                  const itemColors = statusColors[item.status] || statusColors.LIMITED;
                  return (
                    <tr key={item.name} className="hover:bg-surface-50">
                      <td className="px-4 py-3 font-medium text-surface-900">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${itemColors.bg} ${itemColors.text}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-surface-900">{item.score.toFixed(1)}</td>
                      <td className="px-4 py-3 text-surface-700">
                        {item.capacity > 0 ? item.capacity.toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-surface-700">
                        {item.demand > 0 ? item.demand.toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-600 max-w-xs truncate">
                        {item.factors.join('; ') || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Limiting Factors */}
        {site.limiting_factors.length > 0 && (
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Limiting Factors</h2>
            <ul className="space-y-2">
              {site.limiting_factors.map((factor, idx) => (
                <li key={idx} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-red-700 text-sm">{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Demo Data Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <strong>DEMO DATA —</strong> The locations, population, hazard scores, risk assessments, carrying capacity
            assessments and relocation recommendations shown in this prototype are fictional/sample records created
            for demonstration. They are not official government data or official relocation orders.
            <br />
            <strong>PROTOTYPE THRESHOLDS —</strong> Capacity status thresholds (ADEQUATE/LIMITED/STRESSED/INSUFFICIENT)
            are prototype/demo thresholds and are NOT official government standards.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Carrying Capacity</h1>
          <p className="mt-1 text-surface-500">Relocation site capacity and infrastructure assessment</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary-50 text-primary-700">
            <span className="w-2 h-2 rounded-full bg-primary-500" />
            Engine v1.0
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">Total Relocation Sites</p>
          <p className="mt-1 text-3xl font-bold text-surface-900">{displayStatistics.total_sites}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">Total Available Capacity</p>
          <p className="mt-1 text-3xl font-bold text-surface-900">{displayStatistics.total_available_capacity.toLocaleString()}</p>
          <p className="mt-1 text-sm text-surface-500">of {displayStatistics.total_capacity.toLocaleString()} total</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">Overall Utilization</p>
          <p className="mt-1 text-3xl font-bold text-surface-900">{displayStatistics.overall_utilization.toFixed(1)}%</p>
          <p className="mt-1 text-sm text-surface-500">{displayStatistics.total_current_population.toLocaleString()} displaced population</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">Average Capacity Score</p>
          <p className="mt-1 text-3xl font-bold text-surface-900">{displayStatistics.average_capacity_score.toFixed(1)}</p>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-surface-900">Capacity Status Distribution</h2>
          <div className="flex items-center gap-4 text-sm">
            {statusOrder.map((status) => {
              const colors = statusColors[status];
              const count = displayStatistics.status_distribution[status] || 0;
              return (
                <div key={status} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${colors.dot}`} />
                  <span className="font-medium">{status.charAt(0) + status.slice(1).toLowerCase()}</span>
                  <span className={`px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} text-xs font-semibold`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {statusOrder.map((status) => {
            const colors = statusColors[status];
            const count = displayStatistics.status_distribution[status] || 0;
            const percentage = displayStatistics.total_sites > 0
              ? ((count / displayStatistics.total_sites) * 100).toFixed(1)
              : '0';
            return (
              <div key={status} className="text-center p-4 bg-surface-50 rounded-lg">
                <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${colors.dot} text-white text-2xl font-bold`}>
                  {count}
                </div>
                <p className={`font-medium ${colors.text}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</p>
                <p className="text-sm text-surface-500">{percentage}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-surface-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-surface-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by site name or ID..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-surface-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-surface-700 mb-1">Utilization Min %</label>
            <input
              type="number"
              placeholder="Min %"
              value={filters.utilizationMin}
              onChange={(e) => setFilters({ ...filters, utilizationMin: e.target.value })}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              min="0"
              max="100"
            />
          </div>
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-surface-700 mb-1">Utilization Max %</label>
            <input
              type="number"
              placeholder="Max %"
              value={filters.utilizationMax}
              onChange={(e) => setFilters({ ...filters, utilizationMax: e.target.value })}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              min="0"
              max="100"
            />
          </div>
        </div>
      </div>

      {/* Sites Table */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        <div className="p-4 border-b border-surface-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-900">Relocation Sites</h2>
          <span className="text-sm text-surface-500">{filteredAndSortedAssessments.length} sites</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider cursor-pointer hover:bg-surface-100"
                  onClick={() => handleSort('site_name')}
                >
                  Site {sortConfig.key === 'site_name' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider cursor-pointer hover:bg-surface-100"
                  onClick={() => handleSort('total_capacity')}
                >
                  Total Capacity {sortConfig.key === 'total_capacity' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider cursor-pointer hover:bg-surface-100"
                  onClick={() => handleSort('current_population')}
                >
                  Current Population {sortConfig.key === 'current_population' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider cursor-pointer hover:bg-surface-100"
                  onClick={() => handleSort('available_capacity')}
                >
                  Available Capacity {sortConfig.key === 'available_capacity' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider cursor-pointer hover:bg-surface-100"
                  onClick={() => handleSort('utilization_percent')}
                >
                  Utilization {sortConfig.key === 'utilization_percent' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider cursor-pointer hover:bg-surface-100"
                  onClick={() => handleSort('capacity_score')}
                >
                  Capacity Score {sortConfig.key === 'capacity_score' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider cursor-pointer hover:bg-surface-100"
                  onClick={() => handleSort('capacity_status')}
                >
                  Status {sortConfig.key === 'capacity_status' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {filteredAndSortedAssessments.map((site) => {
                const colors = statusColors[site.capacity_status] || statusColors.LIMITED;
                return (
                  <tr key={site.relocation_site_id} className="hover:bg-surface-50">
                    <td className="px-4 py-3 font-medium text-surface-900">{site.site_name}</td>
                    <td className="px-4 py-3 text-surface-700">{site.total_capacity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-surface-700">{site.current_population.toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-surface-900">{site.available_capacity.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden max-w-xs">
                          <div
                            className={`h-full rounded-full ${getUtilizationColor(site.utilization_percent)} transition-all duration-500`}
                            style={{ width: `${Math.min(site.utilization_percent, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${colors.text} whitespace-nowrap`}>
                          {site.utilization_percent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-lg font-semibold text-surface-900">{site.capacity_score.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-sm font-medium rounded-full ${colors.bg} ${colors.text}`}>
                        {site.capacity_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedSite(site)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredAndSortedAssessments.length === 0 && (
          <div className="p-12 text-center text-surface-500">
            <p>No sites match the current filters</p>
          </div>
        )}
      </div>

      {/* Methodology */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-lg font-semibold text-surface-900 mb-4">Capacity Assessment Methodology</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Utilization (30%)</h3>
            <p className="text-blue-700">Current population / total capacity (lower is better)</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2">Critical Infrastructure (45%)</h3>
            <p className="text-green-700">Water (15%), Housing (15%), Healthcare (15%)</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="font-medium text-amber-800 mb-2">Supporting Infrastructure (25%)</h3>
            <p className="text-amber-700">School (10%), Road (5%), Electricity (5%), Sanitation (5%)</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-800 mb-2">Environmental (Bonus)</h3>
            <p className="text-purple-700">Environmental stability assessment</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-surface-50 rounded-lg text-sm font-mono text-surface-700">
          Capacity Score = Σ(Component Score × Weight) | Status from utilization + infrastructure thresholds
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>PROTOTYPE THRESHOLDS:</strong> {'ADEQUATE (util < 50%, all infra sufficient) | LIMITED (util 50-75% or some infra limited) | STRESSED (util 75-90% or critical infra limited) | INSUFFICIENT (util > 90% or critical infra insufficient). NOT official government standards.'}
        </div>
      </div>

      {/* Demo Data Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>DEMO DATA —</strong> The locations, population, hazard scores, risk assessments, carrying capacity
          assessments and relocation recommendations shown in this prototype are fictional/sample records created
          for demonstration. They are not official government data or official relocation orders.
          <br />
          <strong>PROTOTYPE THRESHOLDS —</strong> Capacity status thresholds (ADEQUATE/LIMITED/STRESSED/INSUFFICIENT)
          are prototype/demo thresholds and are NOT official government standards.
        </p>
      </div>
    </div>
  );
}