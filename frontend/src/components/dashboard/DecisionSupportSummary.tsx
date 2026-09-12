import { DashboardStats, DashboardSummary } from '../../services/api';
import { useEffect, useState } from 'react';

interface DecisionSupportSummaryProps {
  stats: DashboardStats;
  summary?: DashboardSummary;
}

export function DecisionSupportSummary({ stats, summary }: DecisionSupportSummaryProps) {
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    const newInsights: string[] = [];

    // Red zone insights
    const redZones = summary?.red_zone_habitations ?? stats.critical_risk_count ?? 0;
    if (redZones > 0) {
      newInsights.push(
        `${redZones} habitation${redZones > 1 ? 's' : ''} currently fall within the prototype red-zone classification.`
      );
    } else {
      newInsights.push('No habitations currently fall within the prototype red-zone classification.');
    }

    // High/critical risk insights
    const highRisk = stats.high_risk_count ?? 0;
    const criticalRisk = stats.critical_risk_count ?? 0;
    const totalHighCritical = highRisk + criticalRisk;
    if (totalHighCritical > 0) {
      newInsights.push(
        `${totalHighCritical} habitation${totalHighCritical > 1 ? 's' : ''} ${totalHighCritical > 1 ? 'are' : 'is'} classified as high or critical risk.`
      );
    } else {
      newInsights.push('No habitations are classified as high or critical risk.');
    }

    // Hazard zones insights
    const hazardZones = summary?.total_hazard_zones ?? 0;
    if (hazardZones > 0) {
      newInsights.push(
        `${hazardZones} hazard ${hazardZones > 1 ? 'zones' : 'zone'} ${hazardZones > 1 ? 'have' : 'has'} been identified across the region.`
      );
    }

    // Relocation capacity insights
    const relocationSites = summary?.relocation_sites ?? stats.relocation_sites_count ?? 0;
    const availableCapacity = summary?.available_relocation_capacity ?? stats.available_capacity ?? 0;
    if (relocationSites > 0 && availableCapacity > 0) {
      newInsights.push(
        `${relocationSites} relocation ${relocationSites > 1 ? 'sites are' : 'site is'} available with ${availableCapacity.toLocaleString()} total remaining capacity.`
      );
    } else if (relocationSites > 0) {
      newInsights.push(
        `${relocationSites} relocation ${relocationSites > 1 ? 'sites are' : 'site is'} available but capacity is limited.`
      );
    }

    // Active alerts insights
    const activeAlerts = summary?.active_alerts ?? stats.active_alerts ?? 0;
    const criticalAlerts = stats.critical_alerts ?? 0;
    if (activeAlerts > 0) {
      newInsights.push(
        `${activeAlerts} active alert${activeAlerts > 1 ? 's' : ''} require${activeAlerts > 1 ? '' : 's'} attention${criticalAlerts > 0 ? ` (${criticalAlerts} critical)` : ''}.`
      );
    } else {
      newInsights.push('No active alerts at this time.');
    }

    setInsights(newInsights);
  }, [stats, summary]);

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-surface-900">Decision Support Summary</h2>
        <p className="text-xs text-surface-500">Auto-generated from current data</p>
      </div>
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start gap-3 p-4 bg-surface-50 rounded-lg">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-bold">
              {index + 1}
            </div>
            <p className="text-sm text-surface-700 flex-1">{insight}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">
          <strong>Prototype Decision-Support Output:</strong> Based on demo data. Official decisions require authorized verification.
        </p>
      </div>
    </div>
  );
}