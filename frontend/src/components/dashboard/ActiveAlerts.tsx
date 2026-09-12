import { Alert, fetchRecentAlerts } from '../../services/api';
import { useEffect, useState } from 'react';

const ALERT_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-500' },
  HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'text-orange-500' },
  WARNING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500' },
  INFO: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'text-blue-500' },
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

function AlertIcon({ level }: { level: string }) {
  const colors = ALERT_COLORS[level] || ALERT_COLORS.INFO;
  const icons: Record<string, React.ReactNode> = {
    CRITICAL: <svg className={`w-5 h-5 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    HIGH: <svg className={`w-5 h-5 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    WARNING: <svg className={`w-5 h-5 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    INFO: <svg className={`w-5 h-5 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  };
  return icons[level] || icons.INFO;
}

function AlertRow({ alert }: { alert: Alert }) {
  const colors = ALERT_COLORS[alert.level] || ALERT_COLORS.INFO;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${colors.border} ${colors.bg}`}>
      <div className="flex-shrink-0 mt-0.5">
        <AlertIcon level={alert.level} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="font-medium text-surface-900">{alert.title}</h4>
            <p className="text-sm text-surface-600 mt-1">{alert.message}</p>
          </div>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
            {alert.level}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-surface-500">
          <span>{formatDate(alert.created_at)}</span>
          {alert.habitation_id && (
            <span>Habitation: {alert.habitation_id}</span>
          )}
          {alert.relocation_site_id && (
            <span>Site: {alert.relocation_site_id}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-surface-200 rounded ${className}`} />
  );
}

interface ActiveAlertsProps {
  loading?: boolean;
  limit?: number;
}

export function ActiveAlerts({ loading = false, limit = 5 }: ActiveAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const data = await fetchRecentAlerts(limit);
        setAlerts(data.alerts);
      } catch (err) {
        console.error('Failed to load alerts:', err);
        setError('Unable to load alerts');
      }
    }
    loadAlerts();
  }, [limit]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900">Active Alerts</h2>
          <p className="text-xs text-surface-500">Unread Alerts</p>
        </div>
        <div className="text-center py-8 text-surface-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900">Active Alerts</h2>
          <p className="text-xs text-surface-500">Unread Alerts</p>
        </div>
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium text-surface-700">No active alerts</p>
          <p className="text-sm mt-1 text-surface-500">All clear - no unread alerts at this time</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-surface-900">Active Alerts</h2>
        <p className="text-xs text-surface-500">{alerts.length} unread</p>
      </div>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </div>
      {alerts.length >= limit && (
        <div className="mt-4 text-center">
          <span className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all alerts →
          </span>
        </div>
      )}
    </div>
  );
}