import { fetchHealth } from '../../services/api';
import { useEffect, useState } from 'react';

interface SystemHealthProps {
  loading?: boolean;
}

export function SystemHealth({ loading = false }: SystemHealthProps) {
  const [health, setHealth] = useState<{ status: string; service: string } | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    async function checkHealth() {
      try {
        const data = await fetchHealth();
        setHealth(data);
        setLastChecked(new Date());
      } catch (err) {
        setHealth({ status: 'error', service: 'hazard-relocation-platform' });
      }
    }
    checkHealth();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-60" />
          </div>
        </div>
      </div>
    );
  }

  const isHealthy = health?.status === 'ok';
  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <h2 className="text-lg font-semibold text-surface-900 mb-4">System Health</h2>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isHealthy ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className={`w-6 h-6 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <div className="flex-1">
          <p className={`font-semibold ${isHealthy ? 'text-green-700' : 'text-red-700'}`}>
            {isHealthy ? 'System Healthy' : 'System Degraded'}
          </p>
          <p className="text-sm text-surface-500">{health?.service || 'hazard-relocation-platform'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-surface-400">Last checked</p>
          <p className="text-sm font-medium text-surface-700">{lastChecked ? formatTime(lastChecked) : '—'}</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-surface-200 grid grid-cols-2 gap-4 text-center">
        <div className="bg-surface-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-primary-600">API</p>
          <p className={`text-xs ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
            {isHealthy ? 'Operational' : 'Offline'}
          </p>
        </div>
        <div className="bg-surface-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-primary-600">Auth</p>
          <p className="text-xs text-green-600">Active</p>
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