import { useEffect, useState } from 'react';
import {
  fetchAllRiskAssessmentsDetailed,
  fetchRiskDistribution,
  fetchRiskStatistics,
  RiskAssessmentDetail,
  RiskDistribution,
  RiskStatistics,
} from '../services/api';
import { RiskBadge } from '../components/Icons';

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

function SectionSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    </div>
  );
}

export default function RiskAssessment() {
  const [assessments, setAssessments] = useState<RiskAssessmentDetail[]>([]);
  const [distribution, setDistribution] = useState<RiskDistribution | null>(null);
  const [statistics, setStatistics] = useState<RiskStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [assessmentsData, distributionData, statisticsData] = await Promise.all([
          fetchAllRiskAssessmentsDetailed(),
          fetchRiskDistribution(),
          fetchRiskStatistics(),
        ]);
        setAssessments(assessmentsData);
        setDistribution(distributionData);
        setStatistics(statisticsData);
      } catch (err) {
        console.error('Failed to load risk assessment data:', err);
        setError('Failed to load risk assessment data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const riskLevelOrder = ['CRITICAL', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW'];
  const sortedAssessments = [...assessments].sort((a, b) => {
    const aIdx = riskLevelOrder.indexOf(a.risk_level);
    const bIdx = riskLevelOrder.indexOf(b.risk_level);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return b.overall_score - a.overall_score;
  });

  const getRiskLevelColor = (level: string): string => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'ELEVATED': return 'bg-amber-500';
      case 'MODERATE': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-surface-500';
    }
  };

  const getRiskLevelTextColor = (level: string): string => {
    switch (level) {
      case 'CRITICAL': return 'text-red-700';
      case 'HIGH': return 'text-orange-700';
      case 'ELEVATED': return 'text-amber-700';
      case 'MODERATE': return 'text-yellow-700';
      case 'LOW': return 'text-green-700';
      default: return 'text-surface-700';
    }
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Risk Assessment</h1>
            <p className="mt-1 text-surface-500">Intelligent multi-hazard risk analysis</p>
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

  const displayDistribution = distribution || { LOW: 0, MODERATE: 0, ELEVATED: 0, HIGH: 0, CRITICAL: 0 };
  const displayStatistics = statistics || { total: 0, average_score: 0, min_score: 0, max_score: 0, distribution: displayDistribution, high_critical_count: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Risk Assessment</h1>
          <p className="mt-1 text-surface-500">Intelligent multi-hazard risk analysis for all habitations</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary-50 text-primary-700">
            <span className="w-2 h-2 rounded-full bg-primary-500" />
            Engine v1.0
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">Total Habitations</p>
          <p className="mt-1 text-3xl font-bold text-surface-900">{displayStatistics.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">Average Risk Score</p>
          <p className="mt-1 text-3xl font-bold text-surface-900">{displayStatistics.average_score.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">High + Critical</p>
          <p className="mt-1 text-3xl font-bold text-red-600">{displayStatistics.high_critical_count}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">Score Range</p>
          <p className="mt-1 text-3xl font-bold text-surface-900">{displayStatistics.min_score.toFixed(1)} - {displayStatistics.max_score.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">Assessment Version</p>
          <p className="mt-1 text-3xl font-bold text-surface-900">1.0</p>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-surface-900">Risk Distribution</h2>
          <div className="flex items-center gap-4 text-sm">
            {riskLevelOrder.map((level) => (
              <div key={level} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${getRiskLevelColor(level)}`} />
                <span className="font-medium capitalize">{level.toLowerCase()}</span>
                <span className={`px-2 py-0.5 rounded-full ${getRiskLevelColor(level)} text-white text-xs font-semibold`}>
                  {displayDistribution[level as keyof RiskDistribution]}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {riskLevelOrder.map((level) => (
            <div key={level} className="text-center p-4 bg-surface-50 rounded-lg">
              <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${getRiskLevelColor(level)} text-white text-2xl font-bold`}>
                {displayDistribution[level as keyof RiskDistribution]}
              </div>
              <p className={`font-medium capitalize ${getRiskLevelTextColor(level)}`}>{level.toLowerCase()}</p>
              <p className="text-sm text-surface-500">
                {displayStatistics.total > 0 
                  ? ((displayDistribution[level as keyof RiskDistribution] / displayStatistics.total) * 100).toFixed(1) + '%'
                  : '0%'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Formula Explanation */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-lg font-semibold text-surface-900 mb-4">Risk Calculation Methodology</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Exposure (50%)</h3>
            <p className="text-blue-700">Hazard score + population exposure + spatial hazard intersection</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="font-medium text-amber-800 mb-2">Vulnerability (30%)</h3>
            <p className="text-amber-700">Base vulnerability + infrastructure deficits + population factors</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2">Coping Capacity (20%)</h3>
            <p className="text-green-700">Infrastructure capacity (healthcare, emergency, roads, utilities) - inverted</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-surface-50 rounded-lg text-sm font-mono text-surface-700">
          Risk = (Exposure × 0.50) + (Vulnerability × 0.30) + ((100 - Coping Capacity) × 0.20)
        </div>
      </div>

      {/* Habitation Risk Table */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        <div className="p-4 border-b border-surface-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-900">Habitation Risk Profiles</h2>
          <span className="text-sm text-surface-500">{sortedAssessments.length} habitations assessed</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Habitation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Primary Hazard</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Risk Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Classification</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {sortedAssessments.map((a) => (
                <tr key={a.habitation_id} className="hover:bg-surface-50">
                  <td className="px-4 py-3 font-medium text-surface-900">{a.habitation_name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                      {a.primary_hazard || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-lg font-semibold text-surface-900">{a.overall_score.toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <RiskBadge level={a.risk_level} />
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Demo Data Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>DEMO DATA —</strong> The locations, population, hazard scores, risk assessments and relocation recommendations shown in this prototype are fictional/sample records created for demonstration. They are not official government data or official relocation orders.
        </p>
      </div>
    </div>
  );
}