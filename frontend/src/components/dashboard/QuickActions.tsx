import { NavLink } from 'react-router-dom';
import { 
  ZoneIcon, MapIcon, AlertIcon, RelocationIcon, 
  ReportIcon, RiskIcon 
} from '../Icons';

interface QuickActionsProps {
  userRole?: string;
}

const actionItems = [
  {
    label: 'View Risk Assessment',
    description: 'Analyze multi-hazard risk scoring',
    path: '/risk-assessment',
    icon: <RiskIcon className="w-5 h-5" />,
    comingSoon: true,
    permissions: ['view_risk', 'view_risk_layers'],
  },
  {
    label: 'View Red Zones',
    description: 'Critical risk habitations map',
    path: '/red-zones',
    icon: <ZoneIcon className="w-5 h-5" />,
    comingSoon: true,
    permissions: ['view_red_zones', 'view_risk'],
  },
  {
    label: 'Open GIS Map',
    description: 'Interactive hazard mapping',
    path: '/gis-map',
    icon: <MapIcon className="w-5 h-5" />,
    comingSoon: true,
    permissions: ['view_gis_data', 'view_map'],
  },
  {
    label: 'Review Alerts',
    description: 'Active and historical alerts',
    path: '/alerts',
    icon: <AlertIcon className="w-5 h-5" />,
    comingSoon: true,
    permissions: ['view_alerts', 'manage_alerts'],
  },
  {
    label: 'View Relocation Sites',
    description: 'Capacity and site details',
    path: '/relocation',
    icon: <RelocationIcon className="w-5 h-5" />,
    comingSoon: true,
    permissions: ['view_relocation_sites', 'view_relocation_recommendations'],
  },
  {
    label: 'Generate Report',
    description: 'Automated report generation',
    path: '/reports',
    icon: <ReportIcon className="w-5 h-5" />,
    comingSoon: true,
    permissions: ['view_reports'],
  },
];

function hasPermission(permissions: string[], userRole?: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    ADMIN: ['all'],
    DISASTER_MANAGEMENT_OFFICER: ['view_risk', 'view_red_zones', 'view_relocation_recommendations', 'manage_alerts', 'view_reports', 'view_habitations', 'view_hazards', 'view_infrastructure', 'view_relocation_sites', 'view_capacity', 'view_dashboard', 'view_map'],
    GIS_ANALYST: ['view_gis_data', 'view_hazards', 'view_habitations', 'view_infrastructure', 'view_risk_layers', 'view_dashboard', 'view_map'],
    PLANNING_OFFICER: ['view_capacity', 'view_relocation_sites', 'view_relocation_recommendations', 'view_reports', 'view_dashboard'],
    FIELD_OFFICER: ['view_assigned_habitations', 'view_hazards', 'view_alerts', 'submit_field_data', 'view_dashboard'],
    VIEWER: ['view_dashboard', 'view_map', 'view_risk'],
  };

  const userPerms = rolePermissions[userRole || 'VIEWER'] || [];
  if (userPerms.includes('all')) return true;
  return permissions.some(p => userPerms.includes(p));
}

function ActionCard({ item, enabled }: { item: typeof actionItems[0]; enabled: boolean }) {
  return (
    <NavLink
      to={item.path}
      className={`flex items-start gap-4 p-4 bg-white rounded-xl border border-surface-200 hover:border-primary-300 transition-colors ${!enabled && !item.comingSoon ? 'opacity-50 cursor-not-allowed' : ''} ${item.comingSoon ? 'opacity-60' : ''}`}
      title={item.comingSoon ? 'Coming in next phase' : !enabled ? 'Insufficient permissions' : ''}
    >
      <div className={`flex-shrink-0 p-3 rounded-xl ${item.comingSoon || !enabled ? 'bg-surface-100 text-surface-400' : 'bg-primary-50 text-primary-600'}`}>
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`text-lg font-semibold ${!enabled && !item.comingSoon ? 'text-surface-400' : 'text-surface-900'}`}>
          {item.label}
        </h3>
        <p className="mt-1 text-sm text-surface-500">{item.description}</p>
        <div className="mt-3 flex items-center gap-2">
          {item.comingSoon && (
            <span className="px-2 py-0.5 text-xs font-medium bg-surface-100 text-surface-500 rounded-full">Soon</span>
          )}
          {!item.comingSoon && !enabled && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 rounded-full">Restricted</span>
          )}
          {enabled && !item.comingSoon && (
            <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full">Accessible</span>
          )}
        </div>
      </div>
      {enabled && !item.comingSoon && (
        <svg className="text-primary-600 hover:text-primary-700 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </NavLink>
  );
}

interface QuickActionsProps {
  userRole?: string;
}

export function QuickActions({ userRole }: QuickActionsProps) {
  const filteredItems = actionItems.filter(item => {
    if (!item.permissions || item.permissions.length === 0) return true;
    return hasPermission(item.permissions, userRole);
  });

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <h2 className="text-lg font-semibold text-surface-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <ActionCard 
            key={item.path} 
            item={item} 
            enabled={!item.comingSoon && hasPermission(item.permissions, userRole)} 
          />
        ))}
      </div>
    </div>
  );
}