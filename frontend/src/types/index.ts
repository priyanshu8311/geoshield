export interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  avatar?: string;
}

export interface HealthResponse {
  status: string;
  service: string;
}