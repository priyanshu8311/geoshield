import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  DashboardIcon, MapIcon, RiskIcon, ZoneIcon, CapacityIcon, 
  RelocationIcon, AlertIcon, ReportIcon, LogoIcon, UserIcon, 
  MenuIcon, ChevronDownIcon, SettingsIcon, LogoutIcon, BellIcon 
} from '../components/Icons';
import { getRoleLabel } from '../contexts/AuthContext';
import { fetchAlerts } from '../services/api';

const navItems = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon />, permissions: ['view_dashboard'] },
  { label: 'GIS Map', path: '/map', icon: <MapIcon />, permissions: ['view_gis_data', 'view_map'] },
  { label: 'Risk Assessment', path: '/risk-assessment', icon: <RiskIcon />, permissions: ['view_risk', 'view_risk_layers'] },
  { label: 'Red Zones', path: '/red-zones', icon: <ZoneIcon />, comingSoon: true, permissions: ['view_red_zones', 'view_risk'] },
  { label: 'Carrying Capacity', path: '/carrying-capacity', icon: <CapacityIcon />, permissions: ['view_capacity'] },
  { label: 'Relocation', path: '/relocation', icon: <RelocationIcon />, permissions: ['view_relocation_sites', 'view_relocation_recommendations'] },
  { label: 'Alerts', path: '/alerts', icon: <AlertIcon />, comingSoon: true, permissions: ['view_alerts', 'manage_alerts'] },
  { label: 'Reports', path: '/reports', icon: <ReportIcon />, comingSoon: true, permissions: ['view_reports'] },
];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { user, logout, hasPermission } = useAuth();

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread alerts count for notification badge
  useEffect(() => {
    async function loadNotificationCount() {
      try {
        const data = await fetchAlerts({ is_read: false, limit: 100 });
        setNotificationCount(data.total);
      } catch (err) {
        console.error('Failed to load notification count:', err);
      }
    }
    if (user) {
      loadNotificationCount();
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.permissions || item.permissions.length === 0) return true;
    return item.permissions.some(perm => hasPermission(perm));
  });

  return (
    <div className="min-h-screen bg-surface-50 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-surface-200 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Sidebar navigation"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-surface-200">
            <Link to="/" className="flex items-center gap-3" aria-label="Go to dashboard">
              <LogoIcon className="text-primary-600" />
              <span className="text-lg font-semibold text-surface-900 hidden sm:block">
                Disaster Risk Platform
              </span>
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg text-surface-500 hover:text-surface-700 hover:bg-surface-100"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin" aria-label="Main navigation">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                  }
                  ${item.comingSoon ? 'opacity-60' : ''}
                `}
                title={item.comingSoon ? 'Coming in next phase' : ''}
              >
                <span className="flex-shrink-0" aria-hidden="true">{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {item.comingSoon && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-surface-100 text-surface-500 rounded-full">
                    Soon
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-surface-200">
            <div className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-3">
              System Status
            </div>
            <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
              <span className="text-sm font-medium text-primary-700">All Systems Operational</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 lg:pl-0">
        <header className="sticky top-0 z-40 h-16 bg-white border-b border-surface-200 flex items-center justify-between px-4 lg:px-6">
          <button
            className="lg:hidden p-2 rounded-lg text-surface-500 hover:text-surface-700 hover:bg-surface-100"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            aria-expanded={sidebarOpen}
          >
            <MenuIcon />
          </button>

          <div className="flex-1 lg:flex-none" />

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-sm text-surface-500">
              Last updated: <time dateTime="2026-09-10T10:30:00Z">Sep 10, 2026</time>
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onClick={() => setNotificationOpen(!notificationOpen)}
                aria-expanded={notificationOpen}
                aria-haspopup="true"
                aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
              >
                <div className="relative">
                  <BellIcon className="w-5 h-5 text-surface-600" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </div>
              </button>

              {notificationOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setNotificationOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-surface-200 py-1 z-20 max-h-96 overflow-y-auto">
                    <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-surface-900">Notifications</h3>
                      {notificationCount > 0 && (
                        <button 
                          className="text-xs text-primary-600 hover:text-primary-700"
                          onClick={() => {/* mark all read */}}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="p-4 text-center text-surface-500 text-sm">
                      Click Alerts in sidebar to view all notifications
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="User menu"
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-primary-600" />
                </div>
                <span className="hidden md:block text-sm font-medium text-surface-700">
                  {user?.full_name || user?.username || 'User'}
                </span>
                <ChevronDownIcon className="text-surface-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-surface-200 py-1 z-20">
                    <div className="px-4 py-3 border-b border-surface-200">
                      <p className="text-sm font-medium text-surface-900">{user?.full_name || 'User'}</p>
                      <p className="text-xs text-surface-500">{getRoleLabel(user?.role as any)}</p>
                      <p className="text-xs text-surface-500 truncate">{user?.email}</p>
                    </div>
                    <button className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-2">
                      <SettingsIcon className="w-4 h-4" />
                      Profile
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-2">
                      <SettingsIcon className="w-4 h-4" />
                      Settings
                    </button>
                    <hr className="my-1 border-surface-200" />
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 flex items-center gap-2"
                    >
                      <LogoutIcon className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>

        <footer className="border-t border-surface-200 bg-white px-4 lg:px-6 py-3">
          <p className="text-xs text-surface-500 text-center">
            Disaster Risk & Relocation Intelligence Platform &copy; 2026 Government of India
          </p>
        </footer>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}