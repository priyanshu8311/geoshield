const API_BASE = '/api';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (response.status === 403) {
    throw new Error('Access denied: Insufficient permissions');
  }

  return response;
}

export interface Habitation {
  id: string;
  name: string;
  district: string;
  state: string;
  population: number;
  latitude: number;
  longitude: number;
  hazard_type: string;
  hazard_score: number;
  exposure_score: number;
  vulnerability_score: number;
  risk_score: number;
  risk_level: string;
  relocation_priority: string;
}

export interface HabitationListResponse {
  habitations: Habitation[];
  total: number;
}

export interface HabitationStats {
  total_habitations: number;
  habitations_by_risk: Record<string, number>;
  habitations_by_hazard: Record<string, number>;
  total_population: number;
  high_risk_count: number;
  critical_risk_count: number;
}

export interface Hazard {
  id: string;
  name: string;
  hazard_type: string;
  severity: number;
  frequency?: string;
  description?: string;
  geometry?: {
    type: 'MultiPolygon';
    coordinates: number[][][][];
  };
}

export interface HazardListResponse {
  hazards: Hazard[];
  total: number;
}

export interface Infrastructure {
  habitation_id: string;
  roads_score: number;
  water_score: number;
  healthcare_score: number;
  schools_score: number;
  electricity_score: number;
  sanitation_score: number;
  emergency_services_score: number;
  road_connectivity?: string;
  water_source?: string;
  healthcare_facilities: number;
  school_count: number;
  electricity_coverage: number;
  sanitation_coverage: number;
  emergency_response_time?: number;
}

export interface InfrastructureListResponse {
  infrastructure: Infrastructure[];
  total: number;
}

export interface RelocationSite {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  total_capacity: number;
  current_population: number;
  available_capacity: number;
  water_capacity: number;
  housing_capacity: number;
  healthcare_capacity: number;
  school_capacity: number;
  road_connectivity?: string;
  electricity: number;
  sanitation: number;
  emergency_services: number;
  environmental_status?: string;
}

export interface RelocationSiteListResponse {
  relocation_sites: RelocationSite[];
  total: number;
}

export interface RelocationSiteStats {
  total_sites: number;
  total_capacity: number;
  available_capacity: number;
}

export interface RiskAssessment {
  habitation_id: string;
  hazard_score: number;
  exposure_score: number;
  vulnerability_score: number;
  risk_score: number;
  risk_level: string;
  assessment_date: string;
  contributing_factors: string[];
}

export interface RiskAssessmentListResponse {
  risk_assessments: RiskAssessment[];
  total: number;
}

export interface RiskComponent {
  score: number;
  factors: string[];
  raw_data: Record<string, any>;
}

export interface RiskAssessmentDetail {
  habitation_id: string;
  habitation_name: string;
  exposure: RiskComponent;
  vulnerability: RiskComponent;
  coping_capacity: RiskComponent;
  overall_score: number;
  risk_level: string;
  primary_hazard: string | null;
  additional_hazards: string[];
  contributing_factors: string[];
  assessment_version: string;
  weights_used: Record<string, number>;
  thresholds_used: Record<string, number>;
}

export interface RiskDistribution {
  LOW: number;
  MODERATE: number;
  ELEVATED: number;
  HIGH: number;
  CRITICAL: number;
}

export interface RiskStatistics {
  total: number;
  average_score: number;
  min_score: number;
  max_score: number;
  distribution: RiskDistribution;
  high_critical_count: number;
}

export interface InfrastructureAssessmentDetail {
  name: string;
  status: string;
  score: number;
  capacity: number;
  demand: number;
  factors: string[];
}

export interface CapacityAssessment {
  relocation_site_id: string;
  site_name: string;
  capacity_score: number;
  capacity_status: string;
  total_capacity: number;
  current_population: number;
  available_capacity: number;
  utilization_percent: number;
  water_status: string;
  housing_status: string;
  healthcare_status: string;
  school_status: string;
  road_status: string;
  electricity_status: string;
  sanitation_status: string;
  environmental_status: string;
  limiting_factors: string[];
  infrastructure_assessments: InfrastructureAssessmentDetail[];
  assessment_date: string;
}

export interface CapacityAssessmentListResponse {
  capacity_assessments: CapacityAssessment[];
  total: number;
}

export interface CapacityStatistics {
  total_sites: number;
  total_capacity: number;
  total_current_population: number;
  total_available_capacity: number;
  overall_utilization: number;
  average_capacity_score: number;
  status_distribution: Record<string, number>;
  adequate_sites: number;
  limited_sites: number;
  stressed_sites: number;
  insufficient_sites: number;
}

export interface RelocationAssessment {
  habitation_id: string;
  relocation_site_id: string;
  priority_score: number;
  priority_level: string;
  distance_km: number;
  capacity_available: number;
  recommendation: string;
  reasoning: string;
}

export interface RelocationAssessmentListResponse {
  relocation_assessments: RelocationAssessment[];
  total: number;
}

export interface SiteRecommendation {
  relocation_site_id: string;
  site_name: string;
  match_score: number;
  suitability: string;
  available_capacity: number;
  utilization_percent: number;
  capacity_status: string;
  capacity_score: number;
  infrastructure_score: number;
  environmental_score: number;
  accessibility_score: number;
  safety_score: number;
  recommendation_reasons: string[];
  limiting_factors: string[];
  distance_km: number;
}

export interface RelocationPriority {
  habitation_id: string;
  habitation_name: string;
  risk_score: number;
  risk_level: string;
  population: number;
  exposure_score: number;
  vulnerability_score: number;
  hazard_score: number;
  accessibility_factor: number;
  relocation_priority_score: number;
  priority_level: string;
  priority_reason: string;
  contributing_factors: string[];
}

export interface RelocationPriorityListResponse {
  relocation_priorities: RelocationPriority[];
  total: number;
}

export interface RelocationRecommendation {
  habitation_id: string;
  habitation_name: string;
  risk_score: number;
  risk_level: string;
  population: number;
  exposure_score: number;
  vulnerability_score: number;
  hazard_score: number;
  accessibility_factor: number;
  priority_score: number;
  priority_level: string;
  priority_reason: string;
  recommendations: SiteRecommendation[];
}

export interface PriorityStatistics {
  total_habitations: number;
  p1_count: number;
  p2_count: number;
  p3_count: number;
  p4_count: number;
  average_priority_score: number;
  total_population_at_risk: number;
  priority_distribution: Record<string, number>;
}

export interface Alert {
  id: number;
  level: string;
  title: string;
  message: string;
  habitation_id?: string;
  relocation_site_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface AlertListResponse {
  alerts: Alert[];
  total: number;
}

export interface AlertStats {
  total_alerts: number;
  critical: number;
  high: number;
  warning: number;
  info: number;
  unread: number;
}

export interface DashboardStats {
  total_habitations: number;
  habitations_by_risk: Record<string, number>;
  habitations_by_hazard: Record<string, number>;
  total_population: number;
  high_risk_count: number;
  critical_risk_count: number;
  relocation_sites_count: number;
  available_capacity: number;
  active_alerts: number;
  critical_alerts: number;
}

export interface DashboardSummary {
  total_habitations: number;
  red_zone_habitations: number;
  high_risk_habitations: number;
  critical_habitations: number;
  total_hazard_zones: number;
  critical_hazard_zones: number;
  relocation_sites: number;
  available_relocation_capacity: number;
  active_alerts: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function fetchHealth(): Promise<{ status: string; service: string }> {
  const response = await fetchWithAuth(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  return response.json();
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  return response.json();
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await fetchWithAuth(`${API_BASE}/auth/me`);
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
}

export async function logout(): Promise<void> {
  await fetchWithAuth(`${API_BASE}/auth/logout`, { method: 'POST' });
}

export async function fetchHabitations(params?: {
  risk_level?: string;
  hazard_type?: string;
  relocation_priority?: string;
  district?: string;
  limit?: number;
  offset?: number;
}): Promise<HabitationListResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  const response = await fetchWithAuth(`${API_BASE}/habitations?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch habitations');
  return response.json();
}

export async function fetchHabitation(id: string): Promise<Habitation> {
  const response = await fetchWithAuth(`${API_BASE}/habitations/${id}`);
  if (!response.ok) throw new Error('Habitation not found');
  return response.json();
}

export async function fetchHabitationStats(): Promise<HabitationStats> {
  const response = await fetchWithAuth(`${API_BASE}/habitations/stats/summary`);
  if (!response.ok) throw new Error('Failed to fetch habitation stats');
  return response.json();
}

export async function fetchHazards(params?: {
  hazard_type?: string;
  limit?: number;
  offset?: number;
}): Promise<HazardListResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  const response = await fetchWithAuth(`${API_BASE}/hazards?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch hazards');
  return response.json();
}

export async function fetchHazard(id: string): Promise<Hazard> {
  const response = await fetchWithAuth(`${API_BASE}/hazards/${id}`);
  if (!response.ok) throw new Error('Hazard not found');
  return response.json();
}

export async function fetchInfrastructure(params?: {
  habitation_id?: string;
  limit?: number;
  offset?: number;
}): Promise<InfrastructureListResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  const response = await fetchWithAuth(`${API_BASE}/infrastructure?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch infrastructure');
  return response.json();
}

export async function fetchInfrastructureByHabitation(habitationId: string): Promise<Infrastructure> {
  const response = await fetchWithAuth(`${API_BASE}/infrastructure/${habitationId}`);
  if (!response.ok) throw new Error('Infrastructure not found');
  return response.json();
}

export async function fetchRelocationSites(params?: {
  capacity_status?: string;
  limit?: number;
  offset?: number;
}): Promise<RelocationSiteListResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  const response = await fetchWithAuth(`${API_BASE}/relocation-sites?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch relocation sites');
  return response.json();
}

export async function fetchRelocationSite(id: string): Promise<RelocationSite> {
  const response = await fetchWithAuth(`${API_BASE}/relocation-sites/${id}`);
  if (!response.ok) throw new Error('Relocation site not found');
  return response.json();
}

export async function fetchRelocationSiteStats(): Promise<RelocationSiteStats> {
  const response = await fetchWithAuth(`${API_BASE}/relocation-sites/stats/summary`);
  if (!response.ok) throw new Error('Failed to fetch relocation site stats');
  return response.json();
}

export async function fetchRiskAssessments(params?: {
  risk_level?: string;
  habitation_id?: string;
  limit?: number;
  offset?: number;
}): Promise<RiskAssessmentListResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  const response = await fetchWithAuth(`${API_BASE}/risk-assessments?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch risk assessments');
  return response.json();
}

export async function fetchRiskAssessment(id: number): Promise<RiskAssessment> {
  const response = await fetchWithAuth(`${API_BASE}/risk-assessments/${id}`);
  if (!response.ok) throw new Error('Risk assessment not found');
  return response.json();
}

export async function fetchRiskAssessmentByHabitation(habitationId: string): Promise<RiskAssessment> {
  const response = await fetchWithAuth(`${API_BASE}/risk-assessments/habitation/${habitationId}`);
  if (!response.ok) throw new Error('Risk assessment not found');
  return response.json();
}

export async function fetchRiskAssessmentDetail(habitationId: string): Promise<RiskAssessmentDetail> {
  const response = await fetchWithAuth(`${API_BASE}/risk-assessments/detail/${habitationId}`);
  if (!response.ok) throw new Error('Risk assessment detail not found');
  return response.json();
}

export async function fetchRiskDistribution(): Promise<RiskDistribution> {
  const response = await fetchWithAuth(`${API_BASE}/risk-assessments/distribution`);
  if (!response.ok) throw new Error('Failed to fetch risk distribution');
  return response.json();
}

export async function fetchRiskStatistics(): Promise<RiskStatistics> {
  const response = await fetchWithAuth(`${API_BASE}/risk-assessments/statistics`);
  if (!response.ok) throw new Error('Failed to fetch risk statistics');
  return response.json();
}

export async function fetchAllRiskAssessmentsDetailed(): Promise<RiskAssessmentDetail[]> {
  const response = await fetchWithAuth(`${API_BASE}/risk-assessments/all-detailed`);
  if (!response.ok) throw new Error('Failed to fetch detailed risk assessments');
  return response.json();
}

export async function fetchCapacityAssessments(params?: {
  capacity_status?: string;
  relocation_site_id?: string;
  limit?: number;
  offset?: number;
}): Promise<CapacityAssessmentListResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  const response = await fetchWithAuth(`${API_BASE}/capacity-assessments?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch capacity assessments');
  return response.json();
}

export async function fetchCapacityAssessment(id: number): Promise<CapacityAssessment> {
  const response = await fetchWithAuth(`${API_BASE}/capacity-assessments/${id}`);
  if (!response.ok) throw new Error('Capacity assessment not found');
  return response.json();
}

export async function fetchCapacityAssessmentBySite(siteId: string): Promise<CapacityAssessment> {
  const response = await fetchWithAuth(`${API_BASE}/capacity-assessments/site/${siteId}`);
  if (!response.ok) throw new Error('Capacity assessment not found');
  return response.json();
}

export async function fetchCapacityStatistics(): Promise<CapacityStatistics> {
  const response = await fetchWithAuth(`${API_BASE}/capacity-assessments/statistics/summary`);
  if (!response.ok) throw new Error('Failed to fetch capacity statistics');
  return response.json();
}

export async function fetchRelocationAssessments(params?: {
  priority_level?: string;
  habitation_id?: string;
  relocation_site_id?: string;
  limit?: number;
  offset?: number;
}): Promise<RelocationAssessmentListResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  const response = await fetchWithAuth(`${API_BASE}/relocation-assessments?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch relocation assessments');
  return response.json();
}

export async function fetchRelocationAssessment(id: number): Promise<RelocationAssessment> {
  const response = await fetchWithAuth(`${API_BASE}/relocation-assessments/${id}`);
  if (!response.ok) throw new Error('Relocation assessment not found');
  return response.json();
}

export async function fetchRelocationAssessmentsByHabitation(habitationId: string): Promise<RelocationAssessmentListResponse> {
  const response = await fetchWithAuth(`${API_BASE}/relocation-assessments/habitation/${habitationId}`);
  if (!response.ok) throw new Error('Failed to fetch relocation assessments');
  return response.json();
}

export async function fetchPriorityStatistics(): Promise<PriorityStatistics> {
  const response = await fetchWithAuth(`${API_BASE}/relocation-priority/statistics`);
  if (!response.ok) throw new Error('Failed to fetch priority statistics');
  return response.json();
}

export async function fetchAllRecommendations(): Promise<RelocationRecommendation[]> {
  const response = await fetchWithAuth(`${API_BASE}/relocation-priority/recommendations`);
  if (!response.ok) throw new Error('Failed to fetch all recommendations');
  return response.json();
}

export async function fetchRelocationPriorities(params?: {
  priority_level?: string;
  risk_level?: string;
  limit?: number;
  offset?: number;
}): Promise<RelocationPriorityListResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  const response = await fetchWithAuth(`${API_BASE}/relocation-priority?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch relocation priorities');
  return response.json();
}

export async function fetchRelocationPriority(habitationId: string): Promise<RelocationPriority> {
  const response = await fetchWithAuth(`${API_BASE}/relocation-priority/${habitationId}`);
  if (!response.ok) throw new Error('Relocation priority not found');
  return response.json();
}

export async function fetchRelocationRecommendations(habitationId: string): Promise<RelocationRecommendation> {
  const response = await fetchWithAuth(`${API_BASE}/relocation-priority/${habitationId}/recommendations`);
  if (!response.ok) throw new Error('Relocation recommendations not found');
  return response.json();
}

export async function fetchAlerts(params?: {
  level?: string;
  habitation_id?: string;
  relocation_site_id?: string;
  is_read?: boolean;
  limit?: number;
  offset?: number;
}): Promise<AlertListResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  const response = await fetchWithAuth(`${API_BASE}/alerts?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch alerts');
  return response.json();
}

export async function fetchAlert(id: number): Promise<Alert> {
  const response = await fetchWithAuth(`${API_BASE}/alerts/${id}`);
  if (!response.ok) throw new Error('Alert not found');
  return response.json();
}

export async function fetchAlertStats(): Promise<AlertStats> {
  const response = await fetchWithAuth(`${API_BASE}/alerts/stats/summary`);
  if (!response.ok) throw new Error('Failed to fetch alert stats');
  return response.json();
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [habStats, siteStats, alertStats] = await Promise.all([
    fetchHabitationStats(),
    fetchRelocationSiteStats(),
    fetchAlertStats(),
  ]);
  return {
    total_habitations: habStats.total_habitations,
    habitations_by_risk: habStats.habitations_by_risk,
    habitations_by_hazard: habStats.habitations_by_hazard,
    total_population: habStats.total_population,
    high_risk_count: habStats.high_risk_count,
    critical_risk_count: habStats.critical_risk_count,
    relocation_sites_count: siteStats.total_sites,
    available_capacity: siteStats.available_capacity,
    active_alerts: alertStats.unread,
    critical_alerts: alertStats.critical,
  };
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetchWithAuth(`${API_BASE}/dashboard/summary`);
  if (!response.ok) throw new Error('Failed to fetch dashboard summary');
  return response.json();
}

export async function fetchRedZoneHabitations(limit: number = 10): Promise<HabitationListResponse> {
  const response = await fetchWithAuth(`${API_BASE}/habitations?risk_level=CRITICAL&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch red zone habitations');
  return response.json();
}

export async function fetchHighRiskHabitations(limit: number = 10): Promise<HabitationListResponse> {
  const response = await fetchWithAuth(`${API_BASE}/habitations?risk_level=HIGH&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch high risk habitations');
  return response.json();
}

export async function fetchHazardZones(): Promise<{ hazards: Hazard[]; total: number }> {
  const response = await fetchWithAuth(`${API_BASE}/hazards`);
  if (!response.ok) throw new Error('Failed to fetch hazard zones');
  return response.json();
}

export async function fetchRelocationSitesWithCapacity(): Promise<RelocationSiteListResponse> {
  const response = await fetchWithAuth(`${API_BASE}/relocation-sites`);
  if (!response.ok) throw new Error('Failed to fetch relocation sites');
  return response.json();
}

export async function fetchRecentAlerts(limit: number = 10): Promise<AlertListResponse> {
  const response = await fetchWithAuth(`${API_BASE}/alerts?limit=${limit}&is_read=false`);
  if (!response.ok) throw new Error('Failed to fetch recent alerts');
  return response.json();
}