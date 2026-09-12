import { useEffect, useState, useMemo } from 'react';
import {
  fetchRelocationPriorities,
  fetchPriorityStatistics,
  fetchRelocationRecommendations,
  RelocationPriority,
  RelocationRecommendation,
  PriorityStatistics,
} from '../services/api';
import { RiskBadge, UtilizationBar, CapacityBadge } from '../components/Icons';

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
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Habitation</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Risk Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Risk Level</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Population</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Priority Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Recommended Site</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Match Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {[1, 2, 3].map((i) => (
              <tr key={i} className="hover:bg-surface-50">
                <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Relocation() {
  const [priorities, setPriorities] = useState<RelocationPriority[]>([]);
  const [statistics, setStatistics] = useState<PriorityStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHabitation, setSelectedHabitation] = useState<RelocationRecommendation | null>(null);
  const [filters, setFilters] = useState({
    priority: '',
    risk: '',
    search: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [prioritiesData, statisticsData] = await Promise.all([
          fetchRelocationPriorities({ limit: 100 }),
          fetchPriorityStatistics(),
        ]);
        setPriorities(prioritiesData.relocation_priorities);
        setStatistics(statisticsData);
      } catch (err) {
        console.error('Failed to load relocation priority data:', err);
        setError('Failed to load relocation priority data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const priorityOrder = ['P1', 'P2', 'P3', 'P4'];

  const filteredAndSortedPriorities = useMemo(() => {
    let result = [...priorities];

    // Apply filters
    if (filters.priority) {
      result = result.filter((p) => p.priority_level === filters.priority);
    }
    if (filters.risk) {
      result = result.filter((p) => p.risk_level === filters.risk);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.habitation_name.toLowerCase().includes(searchLower) ||
          p.habitation_id.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting - priority first, then score
    result.sort((a, b) => {
      const aPriorityIdx = priorityOrder.indexOf(a.priority_level);
      const bPriorityIdx = priorityOrder.indexOf(b.priority_level);
      if (aPriorityIdx !== bPriorityIdx) {
        return aPriorityIdx - bPriorityIdx;
      }
      // Within same priority, sort by score descending
      return b.relocation_priority_score - a.relocation_priority_score;
    });

    return result;
  }, [priorities, filters]);

  const priorityColors: Record<string, { bg: string; text: string; dot: string }> = {
    P1: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    P2: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
    P3: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    P4: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  };

  const riskColors: Record<string, { bg: string; text: string; dot: string }> = {
    CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
    ELEVATED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    MODERATE: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    LOW: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  };

  const suitabilityColors: Record<string, { bg: string; text: string; dot: string }> = {
    EXCELLENT: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    GOOD: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    CONDITIONAL: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    UNSUITABLE: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
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
            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Relocation Priority & Recommendations</h1>
            <p className="mt-1 text-surface-500">Decision-support for prioritizing vulnerable habitations and identifying suitable relocation sites</p>
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
    total_habitations: 0,
    p1_count: 0,
    p2_count: 0,
    p3_count: 0,
    p4_count: 0,
    average_priority_score: 0,
    total_population_at_risk: 0,
    priority_distribution: { P1: 0, P2: 0, P3: 0, P4: 0 },
  };

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'P1', label: 'P1 — Immediate' },
    { value: 'P2', label: 'P2 — Urgent' },
    { value: 'P3', label: 'P3 — Planned' },
    { value: 'P4', label: 'P4 — Monitor' },
  ];

  const riskOptions = [
    { value: '', label: 'All Risk Levels' },
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'HIGH', label: 'High' },
    { value: 'ELEVATED', label: 'Elevated' },
    { value: 'MODERATE', label: 'Moderate' },
    { value: 'LOW', label: 'Low' },
  ];

  const showDetail = selectedHabitation !== null;

  if (showDetail && selectedHabitation) {
    const rec = selectedHabitation;
    const primary = rec.recommendations[0];
    const alt1 = rec.recommendations[1];
    const alt2 = rec.recommendations[2];
    const priorityColorsLocal = priorityColors[rec.priority_level] || priorityColors.P4;
    const riskColorsLocal = riskColors[rec.risk_level] || riskColors.LOW;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <button
              onClick={() => setSelectedHabitation(null)}
              className="mb-2 text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to List
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">{rec.habitation_name}</h1>
            <p className="mt-1 text-surface-500">Habitation ID: {rec.habitation_id}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${priorityColorsLocal.bg} ${priorityColorsLocal.text}`}
            >
              <span className={`w-2 h-2 rounded-full ${priorityColorsLocal.dot}`} />
              P{rec.priority_level.slice(1)} — {['IMMEDIATE', 'URGENT', 'PLANNED', 'MONITOR'][parseInt(rec.priority_level.slice(1)) - 1]}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${riskColorsLocal.bg} ${riskColorsLocal.text}`}
            >
              <span className={`w-2 h-2 rounded-full ${riskColorsLocal.dot}`} />
              {rec.risk_level}
            </span>
          </div>
        </div>

        {/* Priority Reason */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-lg font-semibold text-surface-900 mb-3">Priority Reason</h2>
          <p className="text-surface-700">{rec.priority_reason}</p>
        </div>

        {/* Habitation Risk Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <p className="text-sm font-medium text-surface-500">Risk Score</p>
            <p className="mt-1 text-3xl font-bold text-surface-900">{rec.risk_score.toFixed(1)}</p>
            <p className="mt-1 text-sm text-surface-500">Level: {rec.risk_level}</p>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <p className="text-sm font-medium text-surface-500">Population</p>
            <p className="mt-1 text-3xl font-bold text-surface-900">{rec.population.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <p className="text-sm font-medium text-surface-500">Priority Score</p>
            <p className="mt-1 text-3xl font-bold text-surface-900">{rec.priority_score.toFixed(1)}</p>
          </div>
        </div>

        {/* Risk Component Breakdown */}
        <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-surface-900 mb-4">Risk Components</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-800 mb-2">Hazard Score</h3>
              <p className="text-2xl font-bold text-red-700">{rec.hazard_score.toFixed(1)}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h3 className="font-medium text-orange-800 mb-2">Exposure Score</h3>
              <p className="text-2xl font-bold text-orange-700">{rec.exposure_score.toFixed(1)}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <h3 className="font-medium text-amber-800 mb-2">Vulnerability Score</h3>
              <p className="text-2xl font-bold text-amber-700">{rec.vulnerability_score.toFixed(1)}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Accessibility</h3>
              <p className="text-2xl font-bold text-blue-700">{rec.accessibility_factor.toFixed(1)}</p>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-surface-900 mb-4">Relocation Site Recommendations</h2>
          
          {rec.recommendations.length === 0 ? (
            <div className="text-center py-12 text-surface-500">
              <p className="text-lg font-medium mb-2">No Suitable Relocation Site Found</p>
              <p>All available sites were evaluated and found unsuitable for this habitation's requirements.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {rec.recommendations.map((site, idx) => {
                const isPrimary = idx === 0;
                const suitColors = suitabilityColors[site.suitability] || suitabilityColors.CONDITIONAL;
                const rankLabel = idx === 0 ? 'PRIMARY RECOMMENDATION' : `ALTERNATIVE ${idx}`;
                const rankColor = idx === 0 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
                
                return (
                  <div key={site.relocation_site_id} className="border border-surface-200 rounded-xl overflow-hidden">
                    <div className={`p-4 ${isPrimary ? 'bg-green-50' : 'bg-surface-50'} border-b border-surface-200 flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${rankColor}`}>
                          {rankLabel}
                        </span>
                        <h3 className="text-lg font-semibold text-surface-900">{site.site_name}</h3>
                        <span className={`px-2 py-1 text-sm font-medium rounded-full ${suitColors.bg} ${suitColors.text}`}>
                          {site.suitability}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-surface-600">
                        <span className="font-medium text-surface-900">Match Score: {site.match_score.toFixed(1)}</span>
                        <span>Distance: {site.distance_km.toFixed(1)} km</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-surface-500">Available Capacity</span>
                            <span className="font-medium text-surface-900">{site.available_capacity.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-surface-500">Utilization</span>
                            <div className="flex items-center gap-2">
                              <UtilizationBar utilization={site.utilization_percent} height="h-1.5" className="w-32" />
                              <span className="text-sm font-medium text-surface-700">{site.utilization_percent.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-surface-500">Capacity Status</span>
                            <CapacityBadge status={site.capacity_status} />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-surface-500">Capacity Score</span>
                            <span className="font-medium text-surface-900">{site.capacity_score.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-surface-500">Infrastructure Score</span>
                            <span className="font-medium text-surface-900">{site.infrastructure_score.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-surface-500">Environmental Score</span>
                            <span className="font-medium text-surface-900">{site.environmental_score.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-surface-500">Accessibility Score</span>
                            <span className="font-medium text-surface-900">{site.accessibility_score.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-surface-500">Safety Score</span>
                            <span className="font-medium text-surface-900">{site.safety_score.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Reasons */}
                      {site.recommendation_reasons.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-surface-700 mb-2">Reasons</h4>
                          <ul className="space-y-1">
                            {site.recommendation_reasons.map((reason, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Limiting Factors */}
                      {site.limiting_factors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-surface-700 mb-2">Limiting Factors</h4>
                          <ul className="space-y-1">
                            {site.limiting_factors.map((factor, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>{factor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Demo Data Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <strong>DEMO DATA —</strong> The locations, population, hazard scores, risk assessments, carrying capacity
            assessments and relocation recommendations shown in this prototype are fictional/sample records created
            for demonstration. They are not official government data or official relocation orders.
            <br />
            <strong>DECISION-SUPPORT OUTPUTS —</strong> Recommendations are decision-support outputs and require
            validation and approval by authorized authorities.
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
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Relocation Priority & Recommendations</h1>
          <p className="mt-1 text-surface-500">Decision-support for prioritizing vulnerable habitations and identifying suitable relocation sites</p>
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
          <p className="text-sm font-medium text-surface-500">Habitations Requiring Relocation</p>
          <p className="mt-1 text-3xl font-bold text-surface-900">{displayStatistics.total_habitations}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">P1 — Immediate</p>
          <p className="mt-1 text-3xl font-bold text-red-600">{displayStatistics.p1_count}</p>
          <p className="mt-1 text-sm text-surface-500">{displayStatistics.p2_count} P2 Urgent</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">Recommended Sites</p>
          <p className="mt-1 text-3xl font-bold text-surface-900">{displayStatistics.p1_count + displayStatistics.p2_count + displayStatistics.p3_count}</p>
          <p className="mt-1 text-sm text-surface-500">For P1-P3 habitations</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">Available Relocation Capacity</p>
          <p className="mt-1 text-3xl font-bold text-surface-900">10,200</p>
          <p className="mt-1 text-sm text-surface-500">Across 5 sites</p>
        </div>
      </div>

      {/* Priority Distribution */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-surface-900">Priority Distribution</h2>
          <div className="flex items-center gap-4 text-sm">
            {priorityOrder.map((priority) => {
              const colors = priorityColors[priority];
              const count = displayStatistics.priority_distribution[priority] || 0;
              const label = priority === 'P1' ? 'P1 — Immediate' : priority === 'P2' ? 'P2 — Urgent' : priority === 'P3' ? 'P3 — Planned' : 'P4 — Monitor';
              return (
                <div key={priority} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${colors.dot}`} />
                  <span className="font-medium">{label}</span>
                  <span className={`px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} text-xs font-semibold`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {priorityOrder.map((priority) => {
            const colors = priorityColors[priority];
            const count = displayStatistics.priority_distribution[priority] || 0;
            const percentage = displayStatistics.total_habitations > 0
              ? ((count / displayStatistics.total_habitations) * 100).toFixed(1)
              : '0';
            const label = priority === 'P1' ? 'P1 — Immediate' : priority === 'P2' ? 'P2 — Urgent' : priority === 'P3' ? 'P3 — Planned' : 'P4 — Monitor';
            return (
              <div key={priority} className="text-center p-4 bg-surface-50 rounded-lg">
                <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${colors.dot} text-white text-2xl font-bold`}>
                  {count}
                </div>
                <p className={`font-medium ${colors.text}`}>{label}</p>
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
              placeholder="Search by habitation name or ID..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-surface-700 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {priorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-surface-700 mb-1">Risk Level</label>
            <select
              value={filters.risk}
              onChange={(e) => setFilters({ ...filters, risk: e.target.value })}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {riskOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Priority Table */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        <div className="p-4 border-b border-surface-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-900">Habitation Priorities</h2>
          <span className="text-sm text-surface-500">{filteredAndSortedPriorities.length} habitations</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider cursor-pointer hover:bg-surface-100">
                  Habitation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Population
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Priority Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Recommended Site
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Match Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {filteredAndSortedPriorities.map((p) => {
                const priorityColorsLocal = priorityColors[p.priority_level] || priorityColors.P4;
                const riskColorsLocal = riskColors[p.risk_level] || riskColors.LOW;
                const primarySite = p.recommendations?.[0];
                
                return (
                  <tr key={p.habitation_id} className="hover:bg-surface-50">
                    <td className="px-4 py-3 font-medium text-surface-900">{p.habitation_name}</td>
                    <td className="px-4 py-3 font-mono text-lg font-semibold text-surface-900">{p.risk_score.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-sm font-medium rounded-full ${riskColorsLocal.bg} ${riskColorsLocal.text}`}>
                        {p.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-700">{p.population.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-lg font-semibold text-surface-900">{p.relocation_priority_score.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-sm font-medium rounded-full ${priorityColorsLocal.bg} ${priorityColorsLocal.text}`}>
                        P{p.priority_level.slice(1)} — {['IMMEDIATE', 'URGENT', 'PLANNED', 'MONITOR'][parseInt(p.priority_level.slice(1)) - 1]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-700">
                      {primarySite?.site_name || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-surface-900">
                      {primarySite ? primarySite.match_score.toFixed(1) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          fetchRelocationRecommendations(p.habitation_id).then(setSelectedHabitation);
                        }}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        View Recommendations
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredAndSortedPriorities.length === 0 && (
          <div className="p-12 text-center text-surface-500">
            <p>No habitations match the current filters</p>
          </div>
        )}
      </div>

      {/* Methodology */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-lg font-semibold text-surface-900 mb-4">Relocation Priority Methodology</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm mb-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-medium text-red-800 mb-2">Risk (50%)</h3>
            <p className="text-red-700">Overall risk score from Part 6 assessment</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-medium text-orange-800 mb-2">Population/Exposure (20%)</h3>
            <p className="text-orange-700">Population size and exposure score</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="font-medium text-amber-800 mb-2">Vulnerability (15%)</h3>
            <p className="text-amber-700">Vulnerability score from risk assessment</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">Hazard Severity (10%)</h3>
            <p className="text-yellow-700">Hazard type severity score</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Accessibility (5%)</h3>
            <p className="text-blue-700">Road connectivity and emergency response</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-surface-50 rounded-lg text-sm font-mono text-surface-700">
          Priority = Risk×0.50 + Pop/Exp×0.20 + Vuln×0.15 + Hazard×0.10 + Access×0.05
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>PROTOTYPE THRESHOLDS:</strong> P1 (90-100), P2 (75-89.99), P3 (50-74.99), P4 (0-49.99). NOT official government standards.
        </div>
      </div>

      {/* Matching Methodology */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-lg font-semibold text-surface-900 mb-4">Site Matching Methodology</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm mb-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2">Capacity (30%)</h3>
            <p className="text-green-700">Available capacity vs habitation population</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Infrastructure (30%)</h3>
            <p className="text-blue-700">Water, housing, healthcare, school, utilities</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-800 mb-2">Environmental (15%)</h3>
            <p className="text-purple-700">Environmental stability and risk</p>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg">
            <h3 className="font-medium text-teal-800 mb-2">Accessibility (10%)</h3>
            <p className="text-teal-700">Distance and road connectivity</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-medium text-indigo-800 mb-2">Safety (15%)</h3>
            <p className="text-indigo-700">Capacity status and environmental safety</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-surface-50 rounded-lg text-sm font-mono text-surface-700">
          Match Score = Capacity×0.30 + Infra×0.30 + Env×0.15 + Access×0.10 + Safety×0.15
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>SUITABILITY THRESHOLDS:</strong> EXCELLENT (85-100), GOOD (70-84.99), CONDITIONAL (50-69.99), UNSUITABLE (0-49.99). NOT official government standards.
        </div>
      </div>

      {/* Demo Data Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>DEMO DATA —</strong> The locations, population, hazard scores, risk assessments, carrying capacity
          assessments and relocation recommendations shown in this prototype are fictional/sample records created
          for demonstration. They are not official government data or official relocation orders.
          <br />
          <strong>DECISION-SUPPORT OUTPUTS —</strong> Recommendations are decision-support outputs and require
          validation and approval by authorized authorities.
        </p>
      </div>
    </div>
  );
}