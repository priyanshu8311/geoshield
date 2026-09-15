import { useEffect, useState, useMemo } from 'react';
import {
  fetchAlerts,
  fetchAlertStatistics,
  acknowledgeAlert,
  resolveAlert,
  generateAlerts,
  Alert,
  AlertStatistics,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  BellIcon,
  SearchIcon,
  DownloadIcon,
  RefreshIcon,
  AlertTriangleIcon,
  InfoIcon,
  ChevronDownIcon,
  XCircleIcon,
} from '../components/Icons';

const ALERT_LEVEL_COLORS: Record<string, { bg: string; text: string; border: string; icon: string; badge: string }> = {
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-500', badge: 'bg-red-100 text-red-700' },
  HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'text-orange-500', badge: 'bg-orange-100 text-orange-700' },
  WARNING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-700' },
  INFO: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' },
};

const ALERT_STATUS_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  ACTIVE: { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  ACKNOWLEDGED: { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  RESOLVED: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  RISK_THRESHOLD: 'Risk Threshold',
  PRIORITY_ESCALATION: 'Priority Escalation',
  CAPACITY_CONCERN: 'Capacity Concern',
  HAZARD_UPDATE: 'Hazard Update',
  FIELD_VERIFICATION: 'Field Verification',
  SYSTEM_INFO: 'System Info',
  RELOCATION_PLAN: 'Relocation Plan',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function AlertLevelIcon({ level }: { level: string }) {
  const colors = ALERT_LEVEL_COLORS[level] || ALERT_LEVEL_COLORS.INFO;
  const icons: Record<string, React.ReactNode> = {
    CRITICAL: <AlertTriangleIcon className={`w-5 h-5 ${colors.icon}`} />,
    HIGH: <AlertTriangleIcon className={`w-5 h-5 ${colors.icon}`} />,
    WARNING: <AlertTriangleIcon className={`w-5 h-5 ${colors.icon}`} />,
    INFO: <InfoIcon className={`w-5 h-5 ${colors.icon}`} />,
  };
  return icons[level] || icons.INFO;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-200 rounded ${className}`} />;
}

function AlertRow({ alert, onClick }: { alert: Alert; onClick: () => void }) {
  const levelColors = ALERT_LEVEL_COLORS[alert.level] || ALERT_LEVEL_COLORS.INFO;
  const statusColors = ALERT_STATUS_COLORS[alert.status] || ALERT_STATUS_COLORS.ACTIVE;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${levelColors.border} ${levelColors.bg} cursor-pointer hover:bg-surface-50 transition-colors`}
      onClick={onClick}
    >
      <div className="flex-shrink-0 mt-0.5">
        <AlertLevelIcon level={alert.level} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="font-medium text-surface-900">{alert.title}</h4>
            <p className="text-sm text-surface-600 mt-1 line-clamp-2">{alert.message}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${levelColors.badge}`}>
              {alert.level}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors.badge}`}>
              {alert.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-surface-500">
          <span>{formatDate(alert.created_at)}</span>
          {alert.habitation_id && (
            <span>Habitation: {alert.habitation_id}</span>
          )}
          {alert.relocation_site_id && (
            <span>Site: {alert.relocation_site_id}</span>
          )}
          <span className="text-surface-400">{ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}</span>
        </div>
      </div>
      <ChevronDownIcon className="w-5 h-5 text-surface-400 flex-shrink-0 mt-0.5" />
    </div>
  );
}

interface AlertDetailModalProps {
  alert: Alert | null;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: () => void;
  onResolve: () => void;
  canManage: boolean;
  loading: boolean;
}

function AlertDetailModal({ alert, isOpen, onClose, onAcknowledge, onResolve, canManage, loading }: AlertDetailModalProps) {
  if (!isOpen || !alert) return null;

  const levelColors = ALERT_LEVEL_COLORS[alert.level] || ALERT_LEVEL_COLORS.INFO;
  const statusColors = ALERT_STATUS_COLORS[alert.status] || ALERT_STATUS_COLORS.ACTIVE;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-2xl mx-auto mt-20 p-6 bg-white rounded-xl shadow-xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertLevelIcon level={alert.level} />
              <h2 className="text-xl font-bold text-surface-900">{alert.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${levelColors.badge}`}>
                {alert.level}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors.badge}`}>
                {alert.status}
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-surface-100 text-surface-600">
                {ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-surface-500 hover:text-surface-700 hover:bg-surface-100"
            aria-label="Close"
          >
            <XCircleIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-surface-50 rounded-lg p-4">
            <h3 className="font-medium text-surface-900 mb-2">Description</h3>
            <p className="text-surface-700">{alert.description || alert.message}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {alert.habitation_id && (
              <div className="bg-surface-50 rounded-lg p-4">
                <h3 className="font-medium text-surface-900 mb-2">Habitation</h3>
                <p className="text-surface-700">{alert.habitation_id}</p>
              </div>
            )}
            {alert.relocation_site_id && (
              <div className="bg-surface-50 rounded-lg p-4">
                <h3 className="font-medium text-surface-900 mb-2">Relocation Site</h3>
                <p className="text-surface-700">{alert.relocation_site_id}</p>
              </div>
            )}
            {alert.related_risk_level && (
              <div className="bg-surface-50 rounded-lg p-4">
                <h3 className="font-medium text-surface-900 mb-2">Risk Level</h3>
                <p className="text-surface-700">{alert.related_risk_level}</p>
              </div>
            )}
            {alert.priority_level && (
              <div className="bg-surface-50 rounded-lg p-4">
                <h3 className="font-medium text-surface-900 mb-2">Priority</h3>
                <p className="text-surface-700">{alert.priority_level} {alert.priority_score ? `(${alert.priority_score.toFixed(1)})` : ''}</p>
              </div>
            )}
          </div>

          {alert.recommendation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <InfoIcon className="w-5 h-5" />
                Recommended Action
              </h3>
              <p className="text-blue-700">{alert.recommendation}</p>
            </div>
          )}

          <div className="bg-surface-50 rounded-lg p-4">
            <h3 className="font-medium text-surface-900 mb-2">Timeline</h3>
            <div className="space-y-1 text-sm text-surface-600">
              <p><span className="font-medium">Created:</span> {formatFullDate(alert.created_at)}</p>
              <p><span className="font-medium">Updated:</span> {formatFullDate(alert.updated_at)}</p>
              {alert.acknowledged_at && (
                <p><span className="font-medium">Acknowledged:</span> {formatFullDate(alert.acknowledged_at)} by {alert.acknowledged_by}</p>
              )}
              {alert.resolved_at && (
                <p><span className="font-medium">Resolved:</span> {formatFullDate(alert.resolved_at)} by {alert.resolved_by}</p>
              )}
            </div>
          </div>

          {canManage && (alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED') && (
            <div className="flex items-center gap-3 pt-4 border-t border-surface-200">
              {alert.status === 'ACTIVE' && (
                <button
                  onClick={onAcknowledge}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
                >
                  Acknowledge Alert
                </button>
              )}
              <button
                onClick={onResolve}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                Resolve Alert
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Alerts() {
  const { hasPermission } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [statistics, setStatistics] = useState<AlertStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    level: '',
    status: '',
    alert_type: '',
    habitation_id: '',
    search: '',
  });
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const canManageAlerts = hasPermission('manage_alerts');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [alertsData, statsData] = await Promise.all([
          fetchAlerts({ limit: 200 }),
          fetchAlertStatistics(),
        ]);
        setAlerts(alertsData.alerts);
        setStatistics(statsData);
      } catch (err) {
        console.error('Failed to load alerts:', err);
        setError('Failed to load alerts. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleGenerateAlerts = async () => {
    try {
      setGenerating(true);
      const result = await generateAlerts();
      const alertsData = await fetchAlerts({ limit: 200 });
      const statsData = await fetchAlertStatistics();
      setAlerts(alertsData.alerts);
      setStatistics(statsData);
      alert(`Generated ${result.generated_count} new alerts`);
    } catch (err) {
      console.error('Failed to generate alerts:', err);
      alert('Failed to generate alerts');
    } finally {
      setGenerating(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedAlert) return;
    try {
      setDetailLoading(true);
      const updated = await acknowledgeAlert(selectedAlert.id);
      setAlerts(alerts.map(a => a.id === updated.id ? updated : a));
      setSelectedAlert(updated);
      const statsData = await fetchAlertStatistics();
      setStatistics(statsData);
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      alert('Failed to acknowledge alert');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedAlert) return;
    try {
      setDetailLoading(true);
      const updated = await resolveAlert(selectedAlert.id);
      setAlerts(alerts.map(a => a.id === updated.id ? updated : a));
      setSelectedAlert(updated);
      const statsData = await fetchAlertStatistics();
      setStatistics(statsData);
    } catch (err) {
      console.error('Failed to resolve alert:', err);
      alert('Failed to resolve alert');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExportCSV = () => {
    const filtered = filteredAndSortedAlerts;
    if (filtered.length === 0) {
      alert('No alerts to export');
      return;
    }
    const headers = ['ID', 'Level', 'Status', 'Type', 'Title', 'Message', 'Habitation', 'Site', 'Risk Level', 'Priority', 'Priority Score', 'Created At', 'Status Updated'];
    const rows = filtered.map(a => [
      a.id,
      a.level,
      a.status,
      ALERT_TYPE_LABELS[a.alert_type] || a.alert_type,
      a.title,
      a.message,
      a.habitation_id || '',
      a.relocation_site_id || '',
      a.related_risk_level || '',
      a.priority_level || '',
      a.priority_score?.toFixed(1) || '',
      formatFullDate(a.created_at),
      formatFullDate(a.updated_at),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `alerts-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredAndSortedAlerts = useMemo(() => {
    let result = [...alerts];

    if (filters.level) {
      result = result.filter(a => a.level === filters.level);
    }
    if (filters.status) {
      result = result.filter(a => a.status === filters.status);
    }
    if (filters.alert_type) {
      result = result.filter(a => a.alert_type === filters.alert_type);
    }
    if (filters.habitation_id) {
      result = result.filter(a => a.habitation_id?.includes(filters.habitation_id));
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(searchLower) ||
        a.message.toLowerCase().includes(searchLower) ||
        a.habitation_id?.toLowerCase().includes(searchLower) ||
        a.relocation_site_id?.toLowerCase().includes(searchLower)
      );
    }

    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [alerts, filters]);

  const levelOptions = [
    { value: '', label: 'All Levels' },
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'HIGH', label: 'High' },
    { value: 'WARNING', label: 'Warning' },
    { value: 'INFO', label: 'Info' },
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
    { value: 'RESOLVED', label: 'Resolved' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'RISK_THRESHOLD', label: 'Risk Threshold' },
    { value: 'PRIORITY_ESCALATION', label: 'Priority Escalation' },
    { value: 'CAPACITY_CONCERN', label: 'Capacity Concern' },
    { value: 'HAZARD_UPDATE', label: 'Hazard Update' },
    { value: 'FIELD_VERIFICATION', label: 'Field Verification' },
    { value: 'SYSTEM_INFO', label: 'System Info' },
    { value: 'RELOCATION_PLAN', label: 'Relocation Plan' },
  ];

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
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-10 w-1/2 mb-4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-10 w-1/2 mb-4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-10 w-1/2 mb-4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-10 w-1/2 mb-4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          <div className="p-4 border-b border-surface-200">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Alerts & Notifications</h1>
            <p className="mt-1 text-surface-500">Monitor and manage disaster risk alerts</p>
          </div>
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

  const displayStats = statistics || {
    total_alerts: 0,
    by_level: { CRITICAL: 0, HIGH: 0, WARNING: 0, INFO: 0 },
    by_status: { ACTIVE: 0, ACKNOWLEDGED: 0, RESOLVED: 0 },
    by_type: {},
    unread: 0,
    recent_7_days: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Alerts & Notifications</h1>
          <p className="mt-1 text-surface-500">Monitor and manage disaster risk alerts from risk assessments, priority escalations, and capacity concerns</p>
        </div>
        <div className="flex items-center gap-3">
          {canManageAlerts && (
            <button
              onClick={handleGenerateAlerts}
              disabled={generating}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshIcon className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generating...' : 'Generate Alerts'}
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white border border-surface-300 text-surface-700 rounded-lg font-medium hover:bg-surface-50 flex items-center gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">Total Alerts</p>
          <p className="mt-1 text-3xl font-bold text-surface-900">{displayStats.total_alerts}</p>
          <p className="mt-1 text-sm text-surface-500">{displayStats.recent_7_days} in last 7 days</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">Critical Alerts</p>
          <p className="mt-1 text-3xl font-bold text-red-600">{displayStats.by_level.CRITICAL || 0}</p>
          <p className="mt-1 text-sm text-surface-500">{displayStats.by_level.HIGH || 0} High</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">Active Alerts</p>
          <p className="mt-1 text-3xl font-bold text-surface-900">{displayStats.by_status.ACTIVE || 0}</p>
          <p className="mt-1 text-sm text-surface-500">{displayStats.by_status.ACKNOWLEDGED || 0} Acknowledged</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-sm font-medium text-surface-500">Unread Alerts</p>
          <p className="mt-1 text-3xl font-bold text-surface-900">{displayStats.unread}</p>
          <p className="mt-1 text-sm text-surface-500">Requiring attention</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-surface-700 mb-1">Search</label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="text"
                placeholder="Search by title, message, habitation, site..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-40">
            <label className="block text-sm font-medium text-surface-700 mb-1">Level</label>
            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {levelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:w-40">
            <label className="block text-sm font-medium text-surface-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:w-44">
            <label className="block text-sm font-medium text-surface-700 mb-1">Type</label>
            <select
              value={filters.alert_type}
              onChange={(e) => setFilters({ ...filters, alert_type: e.target.value })}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        <div className="p-4 border-b border-surface-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-900">Alerts ({filteredAndSortedAlerts.length})</h2>
          <div className="flex items-center gap-4 text-sm text-surface-500">
            {Object.entries(displayStats.by_level).map(([level, count]) => (
              <span key={level} className={`px-2 py-0.5 rounded-full ${ALERT_LEVEL_COLORS[level]?.badge || ALERT_LEVEL_COLORS.INFO.badge}`}>
                {level}: {count}
              </span>
            ))}
          </div>
        </div>
        <div className="divide-y divide-surface-200">
          {filteredAndSortedAlerts.length === 0 ? (
            <div className="p-12 text-center text-surface-500">
              <BellIcon className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <p className="text-lg font-medium mb-1">No alerts match current filters</p>
              <p className="text-sm">Try adjusting your filters or generate new alerts</p>
            </div>
          ) : (
            filteredAndSortedAlerts.map(alert => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onClick={() => setSelectedAlert(alert)}
              />
            ))
          )}
        </div>
      </div>

      <AlertDetailModal
        alert={selectedAlert}
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onAcknowledge={handleAcknowledge}
        onResolve={handleResolve}
        canManage={canManageAlerts}
        loading={detailLoading}
      />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>DEMO DATA —</strong> The locations, population, hazard scores, risk assessments and relocation recommendations shown in this prototype are fictional/sample records created for demonstration. They are not official government data or official relocation orders.
          <br />
          <strong>PROTOTYPE ALERT RULES —</strong> Alerts are generated using prototype decision-support rules (CRITICAL: risk=CRITICAL or P1; HIGH: risk=HIGH or P2 or capacity stressed; WARNING: risk=ELEVATED or P3; INFO: P4). These are NOT official government standards.
          <br />
          <strong>DECISION-SUPPORT OUTPUTS —</strong> Alerts and reports are prototype decision-support outputs and require validation and approval by authorized authorities.
        </p>
      </div>
    </div>
  );
}