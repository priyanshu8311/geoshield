import { DashboardStats } from '../../services/api';

const RISK_LEVELS = [
  { key: 'CRITICAL', label: 'Critical', color: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' },
  { key: 'HIGH', label: 'High', color: 'bg-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
  { key: 'ELEVATED', label: 'Elevated', color: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  { key: 'MODERATE', label: 'Moderate', color: 'bg-yellow-500', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
  { key: 'LOW', label: 'Low', color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' },
];

interface RiskOverviewProps {
  stats: DashboardStats;
  loading?: boolean;
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-surface-200 rounded ${className}`} />
  );
}

export function RiskOverview({ stats, loading = false }: RiskOverviewProps) {
  const total = stats.total_habitations || 1;
  const riskData = RISK_LEVELS.map(level => ({
    ...level,
    count: stats.habitations_by_risk?.[level.key] || 0,
    percentage: total > 0 ? ((stats.habitations_by_risk?.[level.key] || 0) / total) * 100 : 0,
  }));

  const maxCount = Math.max(...riskData.map(d => d.count), 1);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-3">
          {RISK_LEVELS.map(() => (
            <div key="skeleton" className="flex items-center gap-4">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-surface-900">Risk Overview</h2>
        <p className="text-xs text-surface-500">Habitations by Risk Level</p>
      </div>
      <div className="space-y-3">
        {riskData.map((level) => (
          <div key={level.key} className="flex items-center gap-4">
            <div className="flex items-center gap-3 w-32 min-w-32">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${level.bgColor}`}>
                <div className={`w-4 h-4 rounded-full ${level.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-900">{level.label}</p>
                <p className="text-xs text-surface-500">{level.count} habitations</p>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${level.textColor}`}>{level.percentage.toFixed(1)}%</span>
                <span className="text-xs text-surface-500">{level.count} / {total}</span>
              </div>
              <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${level.color} transition-all duration-500`}
                  style={{ width: `${(level.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-surface-200">
        <p className="text-xs text-surface-500 text-center">
          Total: {total} habitations monitored
        </p>
      </div>
    </div>
  );
}