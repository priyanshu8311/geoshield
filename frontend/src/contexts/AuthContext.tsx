import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 
  | 'ADMIN'
  | 'DISASTER_MANAGEMENT_OFFICER'
  | 'GIS_ANALYST'
  | 'PLANNING_OFFICER'
  | 'FIELD_OFFICER'
  | 'VIEWER';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ['all'],
  DISASTER_MANAGEMENT_OFFICER: [
    'view_risk',
    'view_red_zones',
    'view_relocation_recommendations',
    'manage_alerts',
    'view_reports',
    'view_habitations',
    'view_hazards',
    'view_infrastructure',
    'view_relocation_sites',
    'view_capacity',
    'view_dashboard',
  ],
  GIS_ANALYST: [
    'view_gis_data',
    'view_hazards',
    'view_habitations',
    'view_infrastructure',
    'view_risk_layers',
    'view_dashboard',
  ],
  PLANNING_OFFICER: [
    'view_capacity',
    'view_relocation_sites',
    'view_relocation_recommendations',
    'view_reports',
    'view_dashboard',
  ],
  FIELD_OFFICER: [
    'view_assigned_habitations',
    'view_hazards',
    'view_alerts',
    'submit_field_data',
    'view_dashboard',
  ],
  VIEWER: [
    'view_dashboard',
    'view_map',
    'view_risk',
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  DISASTER_MANAGEMENT_OFFICER: 'Disaster Management Officer',
  GIS_ANALYST: 'GIS Analyst',
  PLANNING_OFFICER: 'Planning Officer',
  FIELD_OFFICER: 'Field Officer',
  VIEWER: 'Viewer',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('auth_token', data.access_token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes('all') || permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading, login, logout, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] || role;
}