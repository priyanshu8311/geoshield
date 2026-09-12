import { useEffect, useState } from 'react';
import { 
  fetchHealth, 
  fetchDashboardStats, 
  fetchDashboardSummary,
  DashboardStats, 
  DashboardSummary 
} from '../services/api';
import { 
  KPICard, 
  RiskOverview, 
  HazardOverview, 
  RedZoneSection, 
  ActiveAlerts, 
  RelocationCapacity, 
  DecisionSupportSummary, 
  QuickActions, 
  SystemHealth 
} from '../components/dashboard';
import { ShieldIcon, ZoneIcon, RelocationIcon, AlertIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-surface-200 rounded ${className}`} />
  );
}

function KPICardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-8 w-1/2 mb-4" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [health, setHealth] = useState<{ status: string; service: string } | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [healthData, statsData, summaryData] = await Promise.all([
          fetchHealth(),
          fetchDashboardStats(),
          fetchDashboardSummary(),
        ]);
        setHealth(healthData);
        setStats(statsData);
        setSummary(summaryData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load dashboard data. Using cached values where available.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
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
            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Dashboard</h1>
            <p className="mt-1 text-surface-500">Disaster Risk & Relocation Intelligence Platform</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3 text-red-700">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>{error}</p>
          </div>
          <p className="mt-2 text-sm text-surface-500">Displaying cached data where available.</p>
        </div>
      </div>
    );
  }

  const displayStats = stats || {
    total_habitations: 0,
    habitations_by_risk: { LOW: 0, MODERATE: 0, ELEVATED: 0, HIGH: 0, CRITICAL: 0 },
    habitations_by_hazard: {},
    total_population: 0,
    high_risk_count: 0,
    critical_risk_count: 0,
    relocation_sites_count: 0,
    available_capacity: 0,
    active_alerts: 0,
    critical_alerts: 0,
  };

  const displaySummary = summary || {
    total_habitations: 0,
    red_zone_habitations: 0,
    high_risk_habitations: 0,
    critical_habitations: 0,
    total_hazard_zones: 0,
    critical_hazard_zones: 0,
    relocation_sites: 0,
    available_relocation_capacity: 0,
    active_alerts: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Dashboard</h1>
          <p className="mt-1 text-surface-500">Disaster Risk & Relocation Intelligence Platform</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
            health?.status === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
            {health?.status === 'ok' ? 'System Healthy' : 'System Degraded'}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Habitations Monitored"
          value={displayStats.total_habitations.toLocaleString()}
          change={`${displaySummary.red_zone_habitations ?? displayStats.critical_risk_count ?? 0} critical, ${displaySummary.high_risk_habitations ?? displayStats.high_risk_count ?? 0} high risk`}
          trend="up"
          icon={<ShieldIcon className="w-6 h-6" />}
          severity="info"
        />
        <KPICard
          title="High-Risk Zones"
          value={(displaySummary.high_risk_habitations ?? displayStats.high_risk_count ?? 0) + (displaySummary.critical_habitations ?? displayStats.critical_risk_count ?? 0)}
          change={`${displaySummary.critical_habitations ?? displayStats.critical_risk_count ?? 0} critical, ${displaySummary.high_risk_habitations ?? displayStats.high_risk_count ?? 0} high`}
          trend="up"
          icon={<ZoneIcon className="w-6 h-6" />}
          severity="critical"
        />
        <KPICard
          title="Red-Zone Habitations"
          value={displaySummary.red_zone_habitations ?? displayStats.critical_risk_count ?? 0}
          change="Immediate action required"
          trend="down"
          icon={<ZoneIcon className="w-6 h-6" />}
          severity="critical"
        />
        <KPICard
          title="Relocation Sites"
          value={displaySummary.relocation_sites ?? displayStats.relocation_sites_count ?? 0}
          change={`${(displaySummary.available_relocation_capacity ?? displayStats.available_capacity ?? 0).toLocaleString()} capacity available`}
          trend="neutral"
          icon={<RelocationIcon className="w-6 h-6" />}
          severity="info"
        />
        <KPICard
          title="Available Capacity"
          value={(displaySummary.available_relocation_capacity ?? displayStats.available_capacity ?? 0).toLocaleString()}
          change={`${displaySummary.relocation_sites ?? displayStats.relocation_sites_count ?? 0} sites`}
          trend="neutral"
          icon={<RelocationIcon className="w-6 h-6" />}
          severity="info"
        />
        <KPICard
          title="Active Alerts"
          value={displaySummary.active_alerts ?? displayStats.active_alerts ?? 0}
          change={`${displayStats.critical_alerts ?? 0} critical`}
          trend="down"
          icon={<AlertIcon className="w-6 h-6" />}
          severity={displayStats.critical_alerts && displayStats.critical_alerts > 0 ? 'critical' : 'warning'}
        />
      </div>

      {/* Risk Overview */}
      <RiskOverview stats={displayStats} loading={!stats} />

      {/* Hazard Overview */}
      <HazardOverview loading={!stats} />

      {/* Red Zone Section */}
      <RedZoneSection loading={!stats} />

      {/* Active Alerts */}
      <ActiveAlerts loading={!stats} limit={5} />

      {/* Relocation Capacity */}
      <RelocationCapacity loading={!stats} />

      {/* Decision Support Summary */}
      <DecisionSupportSummary stats={displayStats} summary={displaySummary} />

      {/* Quick Actions */}
      <QuickActions userRole={user?.role} />

      {/* System Health */}
      <SystemHealth loading={!health} />

      {/* Demo Data Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>DEMO DATA —</strong> The locations, population, hazard scores, risk assessments and relocation recommendations shown in this prototype are fictional/sample records created for demonstration. They are not official government data or official relocation orders.
        </p>
      </div>
    </div>
  );
}