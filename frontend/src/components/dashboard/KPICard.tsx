import { ReactNode } from 'react';

type Trend = 'up' | 'down' | 'neutral' | 'none';
type Severity = 'normal' | 'warning' | 'critical' | 'info';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: ReactNode;
  trend?: Trend;
  severity?: Severity;
  loading?: boolean;
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-surface-200 rounded ${className}`} />
  );
}

export function KPICard({ title, value, change, icon, trend = 'none', severity = 'normal', loading = false }: KPICardProps) {
  const severityColors = {
    normal: 'text-surface-900',
    warning: 'text-amber-600',
    critical: 'text-red-600',
    info: 'text-blue-600',
  };

  const severityBgColors = {
    normal: 'bg-primary-50 text-primary-600',
    warning: 'bg-amber-50 text-amber-600',
    critical: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-500">{title}</p>
          <p className={`mt-1 text-3xl font-bold ${severityColors[severity]}`}>{value}</p>
          {change && (
            <p className={`mt-2 text-sm font-medium flex items-center gap-1 ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-surface-500'
            }`}>
              {trend === 'up' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>}
              {trend === 'down' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>}
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${severityBgColors[severity]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}