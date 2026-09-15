import { useEffect, useState } from 'react';
import {
  fetchReportOverview,
  RiskSummaryReport,
  RedZoneSummaryReport,
  RelocationCapacityReport,
  RelocationRecommendationReport,
  ReportOverviewResponse,
} from '../services/api';
import {
  DownloadIcon,
  RefreshIcon,
  AlertTriangleIcon,
  ShieldIcon,
  ZoneIcon,
  CapacityIcon,
  RelocationIcon,
} from '../components/Icons';
import { RiskBadge } from '../components/Icons';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-200 rounded ${className}`} />;
}

function StatCard({ title, value, change, icon, severity = 'info' }: {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  severity?: 'info' | 'critical' | 'warning' | 'success';
}) {
  const severityColors: Record<string, { icon: string; value: string }> = {
    info: { icon: 'text-primary-600', value: 'text-surface-900' },
    critical: { icon: 'text-red-600', value: 'text-red-600' },
    warning: { icon: 'text-amber-600', value: 'text-amber-600' },
    success: { icon: 'text-green-600', value: 'text-green-600' },
  };
  const colors = severityColors[severity];

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-500">{title}</p>
          <p className="mt-1 text-3xl font-bold {colors.value}">{value}</p>
          {change && <p className="mt-1 text-sm text-surface-500">{change}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-surface-100 ${colors.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ReportSection({ title, icon, children, lastUpdated }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  lastUpdated?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div className="p-4 border-b border-surface-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg text-primary-600">{icon}</div>
          <h2 className="text-lg font-semibold text-surface-900">{title}</h2>
        </div>
        {lastUpdated && (
          <p className="text-xs text-surface-500">Updated: {formatDate(lastUpdated)}</p>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function RiskSummaryCards({ data }: { data: RiskSummaryReport }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
      <StatCard
        title="Total Habitations"
        value={data.total_habitations.toLocaleString()}
        icon={<ShieldIcon className="w-6 h-6" />}
      />
      <StatCard
        title="Critical"
        value={data.critical}
        severity="critical"
        icon={<AlertTriangleIcon className="w-6 h-6" />}
      />
      <StatCard
        title="High"
        value={data.high}
        severity="critical"
        icon={<AlertTriangleIcon className="w-6 h-6" />}
      />
      <StatCard
        title="Elevated"
        value={data.elevated}
        severity="warning"
        icon={<ZoneIcon className="w-6 h-6" />}
      />
      <StatCard
        title="Moderate"
        value={data.moderate}
        severity="info"
        icon={<ZoneIcon className="w-6 h-6" />}
      />
      <StatCard
        title="Low"
        value={data.low}
        severity="success"
        icon={<ShieldIcon className="w-6 h-6" />}
      />
    </div>
  );
}

function RiskDistributionTable({ data }: { data: RiskSummaryReport }) {
  const rows = [
    { level: 'CRITICAL', count: data.critical, label: 'Critical' },
    { level: 'HIGH', count: data.high, label: 'High' },
    { level: 'ELEVATED', count: data.elevated, label: 'Elevated' },
    { level: 'MODERATE', count: data.moderate, label: 'Moderate' },
    { level: 'LOW', count: data.low, label: 'Low' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-surface-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Risk Level</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Count</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Percentage</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Visual</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-200">
          {rows.map(row => (
            <tr key={row.level} className="hover:bg-surface-50">
              <td className="px-4 py-3">
                <RiskBadge level={row.level} />
              </td>
              <td className="px-4 py-3 font-mono text-lg font-semibold text-surface-900">{row.count}</td>
              <td className="px-4 py-3 text-surface-700">
                {data.total_habitations > 0
                  ? `${((row.count / data.total_habitations) * 100).toFixed(1)}%`
                  : '0%'}
              </td>
              <td className="px-4 py-3">
                <div className="w-32 h-4 bg-surface-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${row.level === 'CRITICAL' ? 'bg-red-500' : row.level === 'HIGH' ? 'bg-orange-500' : row.level === 'ELEVATED' ? 'bg-amber-500' : row.level === 'MODERATE' ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: data.total_habitations > 0 ? `${(row.count / data.total_habitations) * 100}%` : '0%' }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RedZoneSummaryCards({ data }: { data: RedZoneSummaryReport }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <StatCard
        title="Red Zone Habitations"
        value={data.red_zone_habitations}
        severity="critical"
        icon={<ZoneIcon className="w-6 h-6" />}
      />
      <StatCard
        title="P1 Immediate"
        value={data.p1_count}
        severity="critical"
        icon={<AlertTriangleIcon className="w-6 h-6" />}
      />
      <StatCard
        title="P2 Urgent"
        value={data.p2_count}
        severity="critical"
        icon={<AlertTriangleIcon className="w-6 h-6" />}
      />
      <StatCard
        title="P3 Planned"
        value={data.p3_count}
        severity="warning"
        icon={<ZoneIcon className="w-6 h-6" />}
      />
      <StatCard
        title="P4 Monitor"
        value={data.p4_count}
        severity="success"
        icon={<ShieldIcon className="w-6 h-6" />}
      />
    </div>
  );
}

function HighestPriorityTable({ data }: { data: RedZoneSummaryReport }) {
  if (!data.highest_priority_habitations || data.highest_priority_habitations.length === 0) {
    return <p className="text-surface-500 text-center py-8">No high priority habitations</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-surface-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Habitation</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Priority</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Priority Score</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Risk Level</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Risk Score</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Population</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-200">
          {data.highest_priority_habitations.map((hab) => (
            <tr key={hab.habitation_id} className="hover:bg-surface-50">
              <td className="px-4 py-3 font-medium text-surface-900">{hab.habitation_name} ({hab.habitation_id})</td>
              <td className="px-4 py-3">
                <RiskBadge level={hab.priority_level} />
              </td>
              <td className="px-4 py-3 font-mono text-lg font-semibold text-surface-900">{hab.priority_score?.toFixed(1) || 'N/A'}</td>
              <td className="px-4 py-3">
                <RiskBadge level={hab.risk_level} />
              </td>
              <td className="px-4 py-3 font-mono text-surface-900">{hab.risk_score?.toFixed(1) || 'N/A'}</td>
              <td className="px-4 py-3 text-surface-700">{hab.population.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CapacitySummaryCards({ data }: { data: RelocationCapacityReport }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
      <StatCard
        title="Total Sites"
        value={data.total_sites}
        icon={<CapacityIcon className="w-6 h-6" />}
      />
      <StatCard
        title="Total Capacity"
        value={data.total_capacity.toLocaleString()}
        icon={<CapacityIcon className="w-6 h-6" />}
      />
      <StatCard
        title="Current Population"
        value={data.current_population.toLocaleString()}
        icon={<RelocationIcon className="w-6 h-6" />}
      />
      <StatCard
        title="Available Capacity"
        value={data.available_capacity.toLocaleString()}
        severity="success"
        icon={<ShieldIcon className="w-6 h-6" />}
      />
      <StatCard
        title="Utilization"
        value={`${data.overall_utilization.toFixed(1)}%`}
        severity={data.overall_utilization > 75 ? 'critical' : data.overall_utilization > 50 ? 'warning' : 'info'}
        icon={<ZoneIcon className="w-6 h-6" />}
      />
      <StatCard
        title="Avg Capacity Score"
        value={data.average_capacity_score.toFixed(1)}
        icon={<CapacityIcon className="w-6 h-6" />}
      />
    </div>
  );
}

function CapacityStatusTable({ data }: { data: RelocationCapacityReport }) {
  const statusOrder = ['INSUFFICIENT', 'STRESSED', 'LIMITED', 'ADEQUATE'];
  const rows = statusOrder.map(status => ({
    status,
    count: data.status_distribution[status] || 0,
    label: status,
  }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-surface-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Capacity Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Sites</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Percentage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-200">
          {rows.map(row => (
            <tr key={row.status} className="hover:bg-surface-50">
              <td className="px-4 py-3">
                <span className={`px-2 py-1 text-sm font-medium rounded-full ${
                  row.status === 'ADEQUATE' ? 'bg-green-50 text-green-700' :
                  row.status === 'LIMITED' ? 'bg-blue-50 text-blue-700' :
                  row.status === 'STRESSED' ? 'bg-amber-50 text-amber-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {row.label}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-lg font-semibold text-surface-900">{row.count}</td>
              <td className="px-4 py-3 text-surface-700">
                {data.total_sites > 0 ? `${((row.count / data.total_sites) * 100).toFixed(1)}%` : '0%'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StressedSitesTable({ data }: { data: RelocationCapacityReport }) {
  if (!data.stressed_limited_sites || data.stressed_limited_sites.length === 0) {
    return <p className="text-green-600 text-center py-4">No stressed or capacity-limited sites</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-surface-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Site</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Total Capacity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Available</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Utilization</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-200">
          {data.stressed_limited_sites.map(site => (
            <tr key={site.site_id} className="hover:bg-surface-50">
              <td className="px-4 py-3 font-medium text-surface-900">{site.site_name} ({site.site_id})</td>
              <td className="px-4 py-3 text-surface-700">{site.total_capacity.toLocaleString()}</td>
              <td className="px-4 py-3 text-surface-700">{site.available_capacity.toLocaleString()}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 text-sm font-medium rounded-full ${
                  site.utilization_percent >= 90 ? 'bg-red-100 text-red-700' :
                  site.utilization_percent >= 75 ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {site.utilization_percent.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecommendationTable({ data }: { data: RelocationRecommendationReport }) {
  if (!data.recommendations || data.recommendations.length === 0) {
    return <p className="text-surface-500 text-center py-8">No relocation recommendations</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-surface-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Habitation</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Priority</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Priority Score</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Risk Level</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Population</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Recommended Site</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Match Score</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Suitability</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Limiting Factors</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-200">
          {data.recommendations.map(rec => (
            <tr key={rec.habitation_id} className="hover:bg-surface-50">
              <td className="px-4 py-3 font-medium text-surface-900">{rec.habitation_name} ({rec.habitation_id})</td>
              <td className="px-4 py-3">
                <RiskBadge level={rec.priority_level} />
              </td>
              <td className="px-4 py-3 font-mono text-lg font-semibold text-surface-900">{rec.priority_score?.toFixed(1) || 'N/A'}</td>
              <td className="px-4 py-3">
                <RiskBadge level={rec.risk_level} />
              </td>
              <td className="px-4 py-3 text-surface-700">{rec.population.toLocaleString()}</td>
              <td className="px-4 py-3 text-surface-700">{rec.recommended_site_name || 'N/A'}</td>
              <td className="px-4 py-3 font-mono text-surface-900">{rec.match_score?.toFixed(1) || 'N/A'}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 text-sm font-medium rounded-full ${
                  rec.suitability === 'EXCELLENT' ? 'bg-green-100 text-green-700' :
                  rec.suitability === 'GOOD' ? 'bg-blue-100 text-blue-700' :
                  rec.suitability === 'CONDITIONAL' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {rec.suitability || 'N/A'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-surface-600 max-w-xs truncate">
                {rec.limiting_factors?.join(', ') || 'None'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Reports() {
  const [overview, setOverview] = useState<ReportOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchReportOverview();
        setOverview(data);
      } catch (err) {
        console.error('Failed to load reports:', err);
        setError('Failed to load reports. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const data = await fetchReportOverview();
      setOverview(data);
    } catch (err) {
      console.error('Failed to refresh reports:', err);
      alert('Failed to refresh reports');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportCSV = (reportName: string, data: any[]) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(h => `"${String(item[h] ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${reportName}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
          <div className="bg-white rounded-xl border border-surface-200 p-6"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-3 w-2/3" /></div>
          <div className="bg-white rounded-xl border border-surface-200 p-6"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-3 w-2/3" /></div>
          <div className="bg-white rounded-xl border border-surface-200 p-6"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-3 w-2/3" /></div>
          <div className="bg-white rounded-xl border border-surface-200 p-6"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-3 w-2/3" /></div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-6"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-3 w-2/3" /></div>
        <div className="bg-white rounded-xl border border-surface-200 p-6"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-3 w-2/3" /></div>
        <div className="bg-white rounded-xl border border-surface-200 p-6"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-3 w-2/3" /></div>
        <div className="bg-white rounded-xl border border-surface-200 p-6"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-3 w-2/3" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Reports</h1>
            <p className="mt-1 text-surface-500">Decision-support summaries for risk, priority, capacity, and relocation</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3 text-red-700">
            <AlertTriangleIcon className="w-6 h-6 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Reports</h1>
          <p className="mt-1 text-surface-500">Decision-support summaries for risk, priority, capacity, and relocation recommendations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh All
          </button>
        </div>
      </div>

      <ReportSection
        title="Risk Summary Report"
        icon={<ShieldIcon className="w-5 h-5" />}
        lastUpdated={overview.generated_at}
      >
        <RiskSummaryCards data={overview.risk_summary} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-surface-900 mb-3">Risk Distribution</h3>
            <RiskDistributionTable data={overview.risk_summary} />
          </div>
          <div>
            <h3 className="font-medium text-surface-900 mb-3">Summary</h3>
            <div className="bg-surface-50 rounded-lg p-4">
              <p className="text-surface-700">
                <strong>Average Risk Score:</strong> {overview.risk_summary.average_risk_score.toFixed(1)}<br />
                <strong>Total Habitations:</strong> {overview.risk_summary.total_habitations}<br />
                <strong>Critical + High:</strong> {overview.risk_summary.critical + overview.risk_summary.high}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => handleExportCSV('risk-summary', [
              { metric: 'Total Habitations', value: overview.risk_summary.total_habitations },
              { metric: 'Critical', value: overview.risk_summary.critical },
              { metric: 'High', value: overview.risk_summary.high },
              { metric: 'Elevated', value: overview.risk_summary.elevated },
              { metric: 'Moderate', value: overview.risk_summary.moderate },
              { metric: 'Low', value: overview.risk_summary.low },
              { metric: 'Average Risk Score', value: overview.risk_summary.average_risk_score },
            ])}
            className="px-4 py-2 bg-white border border-surface-300 text-surface-700 rounded-lg font-medium hover:bg-surface-50 flex items-center gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </ReportSection>

      <ReportSection
        title="Red Zone / High-Priority Summary"
        icon={<ZoneIcon className="w-5 h-5" />}
        lastUpdated={overview.generated_at}
      >
        <RedZoneSummaryCards data={overview.red_zone_summary} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-surface-900 mb-3">Priority Distribution</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Count</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {['P1', 'P2', 'P3', 'P4'].map(p => (
                    <tr key={p} className="hover:bg-surface-50">
                      <td className="px-4 py-3"><RiskBadge level={p} /></td>
                      <td className="px-4 py-3 font-mono text-lg font-semibold text-surface-900">
                        {overview.red_zone_summary.priority_distribution[p] || 0}
                      </td>
                      <td className="px-4 py-3 text-surface-700">
                        {overview.red_zone_summary.red_zone_habitations + overview.red_zone_summary.p3_count + overview.red_zone_summary.p4_count > 0
                          ? `${(((overview.red_zone_summary.priority_distribution[p] || 0) / (overview.red_zone_summary.p1_count + overview.red_zone_summary.p2_count + overview.red_zone_summary.p3_count + overview.red_zone_summary.p4_count)) * 100).toFixed(1)}%`
                          : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-surface-900 mb-3">Highest Priority Habitations</h3>
            <HighestPriorityTable data={overview.red_zone_summary} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => handleExportCSV('red-zone-summary', overview.red_zone_summary.highest_priority_habitations)}
            className="px-4 py-2 bg-white border border-surface-300 text-surface-700 rounded-lg font-medium hover:bg-surface-50 flex items-center gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </ReportSection>

      <ReportSection
        title="Relocation Capacity Report"
        icon={<CapacityIcon className="w-5 h-5" />}
        lastUpdated={overview.generated_at}
      >
        <CapacitySummaryCards data={overview.capacity_summary} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-surface-900 mb-3">Capacity Status Distribution</h3>
            <CapacityStatusTable data={overview.capacity_summary} />
          </div>
          <div>
            <h3 className="font-medium text-surface-900 mb-3">Stressed / Limited Sites</h3>
            <StressedSitesTable data={overview.capacity_summary} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => handleExportCSV('relocation-capacity', overview.capacity_summary.stressed_limited_sites)}
            className="px-4 py-2 bg-white border border-surface-300 text-surface-700 rounded-lg font-medium hover:bg-surface-50 flex items-center gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </ReportSection>

      <ReportSection
        title="Relocation Recommendations Report"
        icon={<RelocationIcon className="w-5 h-5" />}
        lastUpdated={overview.generated_at}
      >
        <div className="mb-6">
          <StatCard
            title="Habitations Requiring Relocation Assessment"
            value={overview.recommendation_summary.habitations_requiring_relocation}
            icon={<RelocationIcon className="w-6 h-6" />}
          />
        </div>
        <RecommendationTable data={overview.recommendation_summary} />
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => handleExportCSV('relocation-recommendations', overview.recommendation_summary.recommendations)}
            className="px-4 py-2 bg-white border border-surface-300 text-surface-700 rounded-lg font-medium hover:bg-surface-50 flex items-center gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </ReportSection>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>DEMO DATA —</strong> The locations, population, hazard scores, risk assessments and relocation recommendations shown in this prototype are fictional/sample records created for demonstration. They are not official government data or official relocation orders.
          <br />
          <strong>PROTOTYPE REPORT RULES —</strong> Reports are generated from Parts 6-8 canonical calculations using prototype decision-support thresholds. These are NOT official government standards.
          <br />
          <strong>DECISION-SUPPORT OUTPUTS —</strong> Reports are prototype decision-support outputs and require validation and approval by authorized authorities.
        </p>
      </div>
    </div>
  );
}