// API functions that connect to real backend
// Based on API Specification from System Design Document (STEP 7)

import { 
  User, Station, Sensor, SensorData, Alert, Threshold, 
  DashboardSummary, ApiResponse, UserRole, Role, FarmPlot,
  StationDiseaseRisk, PlotDiseaseRisk, AllStationsDiseaseRisk,
  RiskDashboardSummary, PillarSummary
} from './types';
import { apiFetch, apiConfig } from './apiConfig';

// ============ AUTH API ============

/**
 * POST /api/auth/login
 * Login with username and password, returns JWT token
 */
export const login = async (
  username: string, 
  password: string
): Promise<ApiResponse<{ user: User; token: string }>> => {
  try {
    const response = await apiFetch<ApiResponse<{ user: User; token: string }>>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );
    
    // Store token if login successful
    if (response.success && response.data?.token) {
      apiConfig.setToken(response.data.token);
    }
    
    return response;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
};

/**
 * POST /api/auth/logout
 * Logout user (removes token from localStorage)
 */
export const logout = async (): Promise<ApiResponse<void>> => {
  try {
    await apiFetch<ApiResponse<void>>('/auth/logout', {
      method: 'POST',
    });
    
    apiConfig.removeToken();
    
    return { success: true };
  } catch (error) {
    // Even if API call fails, remove token
    apiConfig.removeToken();
    return { success: true };
  }
};

/**
 * GET /api/auth/me
 * Get current user info from token
 */
export const getCurrentUser = async (): Promise<ApiResponse<User>> => {
  try {
    return await apiFetch<ApiResponse<User>>('/auth/me');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user',
    };
  }
};

// ============ ROLES API ============

/**
 * GET /api/roles
 * Get all roles (for dropdown in user management)
 */
export const getRoles = async (): Promise<ApiResponse<Role[]>> => {
  try {
    return await apiFetch<ApiResponse<Role[]>>('/roles');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch roles',
    };
  }
};

// ============ USERS API ============

/**
 * GET /api/users
 * Get all users (Super User only)
 */
export const getUsers = async (): Promise<ApiResponse<User[]>> => {
  try {
    return await apiFetch<ApiResponse<User[]>>('/users');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    };
  }
};

/**
 * GET /api/users/{id}
 * Get user by ID (Super User only)
 */
export const getUserById = async (id: number): Promise<ApiResponse<User>> => {
  try {
    return await apiFetch<ApiResponse<User>>(`/users/${id}`);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user',
    };
  }
};

/**
 * POST /api/users
 * Create new user (Super User only)
 */
export const createUser = async (
  user: { username: string; password: string; email: string; role_id: number }
): Promise<ApiResponse<User>> => {
  try {
    return await apiFetch<ApiResponse<User>>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user',
    };
  }
};

/**
 * PUT /api/users/{id}
 * Update user (Super User only)
 */
export const updateUser = async (
  id: number,
  updates: { username: string; email: string; role_id: number; status: string; password?: string }
): Promise<ApiResponse<User>> => {
  try {
    return await apiFetch<ApiResponse<User>>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    };
  }
};

// ============ STATIONS API ============

/**
 * GET /api/stations
 * Get all stations
 */
export const getStations = async (): Promise<ApiResponse<Station[]>> => {
  try {
    return await apiFetch<ApiResponse<Station[]>>('/stations');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stations',
    };
  }
};

/**
 * GET /api/stations/{id}
 * Get station by ID
 */
export const getStationById = async (id: number): Promise<ApiResponse<Station>> => {
  try {
    return await apiFetch<ApiResponse<Station>>(`/stations/${id}`);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch station',
    };
  }
};

/**
 * GET /api/stations/{id}/data/latest
 * Get latest sensor data for all sensors in a station
 */
export const getStationLatestData = async (
  id: number
): Promise<ApiResponse<any[]>> => {
  try {
    return await apiFetch<ApiResponse<any[]>>(`/stations/${id}/data/latest`);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch station data',
    };
  }
};

/**
 * POST /api/stations
 * Create new station (Manager, Super User)
 */
export const createStation = async (
  station: {
    device_id: string;
    station_name: string;
    province: string;
    latitude: number;
    longitude: number;
  }
): Promise<ApiResponse<Station>> => {
  try {
    return await apiFetch<ApiResponse<Station>>('/stations', {
      method: 'POST',
      body: JSON.stringify(station),
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create station',
    };
  }
};

/**
 * PUT /api/stations/{id}
 * Update station (Manager, Super User)
 */
export const updateStation = async (
  id: number,
  updates: {
    station_name: string;
    province: string;
    latitude: number;
    longitude: number;
    status: string;
  }
): Promise<ApiResponse<Station>> => {
  try {
    return await apiFetch<ApiResponse<Station>>(`/stations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update station',
    };
  }
};

// ============ SENSORS API ============

/**
 * GET /api/sensors
 * Get all sensors
 */
export const getSensors = async (): Promise<ApiResponse<Sensor[]>> => {
  try {
    return await apiFetch<ApiResponse<Sensor[]>>('/sensors');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sensors',
    };
  }
};

/**
 * GET /api/sensors/{id}
 * Get sensor by ID
 */
export const getSensorById = async (id: number): Promise<ApiResponse<Sensor>> => {
  try {
    return await apiFetch<ApiResponse<Sensor>>(`/sensors/${id}`);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sensor',
    };
  }
};

/**
 * GET /api/sensors/{id}/data?from=&to=
 * Get sensor time-series data
 */
export const getSensorData = async (
  id: number,
  from?: string,
  to?: string
): Promise<ApiResponse<SensorData[]>> => {
  try {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return await apiFetch<ApiResponse<SensorData[]>>(`/sensors/${id}/data${query}`);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sensor data',
    };
  }
};

/**
 * POST /api/sensors
 * Create new sensor (Manager, Super User)
 */
export const createSensor = async (
  sensor: {
    station_id: number;
    sensor_type: string;
  }
): Promise<ApiResponse<Sensor>> => {
  try {
    return await apiFetch<ApiResponse<Sensor>>('/sensors', {
      method: 'POST',
      body: JSON.stringify(sensor),
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create sensor',
    };
  }
};

/**
 * PUT /api/sensors/{id}
 * Update sensor (Manager, Super User)
 */
export const updateSensor = async (
  id: number,
  updates: {
    sensor_type: string;
    status: string;
  }
): Promise<ApiResponse<Sensor>> => {
  try {
    return await apiFetch<ApiResponse<Sensor>>(`/sensors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update sensor',
    };
  }
};

/**
 * POST /api/sensors/{id}/data
 * Insert sensor data (Manager, Super User - for testing)
 */
export const insertSensorData = async (
  id: number,
  data: {
    value: number;
    recorded_at?: string;
  }
): Promise<ApiResponse<SensorData>> => {
  try {
    return await apiFetch<ApiResponse<SensorData>>(`/sensors/${id}/data`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to insert sensor data',
    };
  }
};

// ============ ALERTS API ============

/**
 * GET /api/alerts
 * Get all alerts
 */
export const getAlerts = async (limit?: number): Promise<ApiResponse<Alert[]>> => {
  try {
    const query = limit ? `?limit=${limit}` : '';
    return await apiFetch<ApiResponse<Alert[]>>(`/alerts${query}`);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch alerts',
    };
  }
};

/**
 * GET /api/alerts/unacknowledged
 * Get unacknowledged alerts
 */
export const getUnacknowledgedAlerts = async (): Promise<ApiResponse<Alert[]>> => {
  try {
    return await apiFetch<ApiResponse<Alert[]>>('/alerts/unacknowledged');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch alerts',
    };
  }
};

/**
 * GET /api/alerts/{id}
 * Get alert by ID
 */
export const getAlertById = async (id: number): Promise<ApiResponse<Alert>> => {
  try {
    return await apiFetch<ApiResponse<Alert>>(`/alerts/${id}`);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch alert',
    };
  }
};

/**
 * PUT /api/alerts/{id}/ack
 * Acknowledge an alert
 */
export const acknowledgeAlert = async (id: number): Promise<ApiResponse<void>> => {
  try {
    return await apiFetch<ApiResponse<void>>(`/alerts/${id}/ack`, {
      method: 'PUT',
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to acknowledge alert',
    };
  }
};

// ============ THRESHOLDS API ============

/**
 * GET /api/thresholds
 * Get all thresholds
 */
export const getThresholds = async (): Promise<ApiResponse<Threshold[]>> => {
  try {
    return await apiFetch<ApiResponse<Threshold[]>>('/thresholds');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch thresholds',
    };
  }
};

/**
 * POST /api/thresholds
 * Create new threshold (Super User only)
 */
export const createThreshold = async (
  threshold: Partial<Threshold>
): Promise<ApiResponse<Threshold>> => {
  try {
    return await apiFetch<ApiResponse<Threshold>>('/thresholds', {
      method: 'POST',
      body: JSON.stringify(threshold),
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create threshold',
    };
  }
};

/**
 * PUT /api/thresholds/{id}
 * Update threshold (Super User only)
 */
export const updateThreshold = async (
  id: number,
  updates: Partial<Threshold>
): Promise<ApiResponse<Threshold>> => {
  try {
    return await apiFetch<ApiResponse<Threshold>>(`/thresholds/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update threshold',
    };
  }
};

// ============ DASHBOARD API ============

/**
 * Get dashboard summary
 * This is a derived endpoint that combines multiple API calls
 */
export const getDashboardSummary = async (): Promise<ApiResponse<DashboardSummary>> => {
  try {
    const [stationsRes, alertsRes] = await Promise.all([
      getStations(),
      getUnacknowledgedAlerts(),
    ]);
    
    if (!stationsRes.success || !alertsRes.success) {
      throw new Error('Failed to fetch dashboard data');
    }
    
    const stations = stationsRes.data || [];
    const alerts = alertsRes.data || [];
    
    // Calculate summary
    const totalSensors = stations.reduce((sum, s) => sum + (s.sensor_count || 0), 0);
    const normalStations = stations.filter(s => s.status === 'normal').length;
    const warningStations = stations.filter(s => s.status === 'warning').length;
    const criticalStations = stations.filter(s => s.status === 'critical').length;
    
    const summary: DashboardSummary = {
      total_stations: stations.length,
      total_sensors: totalSensors,
      active_alerts: alerts.length,
      normal_stations: normalStations,
      warning_stations: warningStations,
      critical_stations: criticalStations,
    };
    
    return { success: true, data: summary };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard summary',
    };
  }
};

// ============ FARM PLOTS API (UC10, UC11) ============

/**
 * POST /api/plots
 * Register new farm plot (UC10)
 * Access: USER (Farmer)
 */
export const registerFarmPlot = async (
  plot: {
    lat: number;
    lon: number;
    utm_coords?: string;
    land_title_deed?: string;
    area_size_rai?: number;
  }
): Promise<ApiResponse<FarmPlot>> => {
  try {
    return await apiFetch<ApiResponse<FarmPlot>>('/plots', {
      method: 'POST',
      body: JSON.stringify(plot),
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register farm plot',
    };
  }
};

/**
 * GET /api/plots/me
 * Get current user's farm plots
 */
export const getMyFarmPlots = async (): Promise<ApiResponse<FarmPlot[]>> => {
  try {
    return await apiFetch<ApiResponse<FarmPlot[]>>('/plots/me');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch farm plots',
    };
  }
};

/**
 * GET /api/plots
 * Get all farm plots (UC11 - for approval)
 * Access: SUPER_USER only
 */
export const getAllFarmPlots = async (): Promise<ApiResponse<FarmPlot[]>> => {
  try {
    return await apiFetch<ApiResponse<FarmPlot[]>>('/plots');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch all farm plots',
    };
  }
};

/**
 * GET /api/plots/:id
 * Get farm plot by ID
 */
export const getFarmPlotById = async (id: number): Promise<ApiResponse<FarmPlot>> => {
  try {
    return await apiFetch<ApiResponse<FarmPlot>>(`/plots/${id}`);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch farm plot',
    };
  }
};

/**
 * PUT /api/plots/:id/approve
 * Approve or reject farm plot (UC11)
 * Access: SUPER_USER only
 */
export const approveFarmPlot = async (
  id: number,
  status: 'active' | 'rejected',
  nearest_station_id?: number
): Promise<ApiResponse<FarmPlot>> => {
  try {
    return await apiFetch<ApiResponse<FarmPlot>>(`/plots/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ status, nearest_station_id }),
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve farm plot',
    };
  }
};

// ============ DISEASE RISK (BUS ALGORITHM) API (UC12) ============

/**
 * GET /api/disease-risk/station/:station_id
 * Get disease risk (BUS score) for a specific station
 * Access: USER, MANAGER, SUPER_USER
 */
export const getStationDiseaseRisk = async (
  stationId: number,
  days: number = 10
): Promise<ApiResponse<StationDiseaseRisk>> => {
  try {
    return await apiFetch<ApiResponse<StationDiseaseRisk>>(
      `/disease-risk/station/${stationId}?days=${days}`
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch disease risk',
    };
  }
};

/**
 * GET /api/disease-risk/plot/:plot_id
 * Get disease risk (BUS score) for a farm plot based on nearest station
 * Access: USER (own plots), MANAGER, SUPER_USER (all plots)
 */
export const getPlotDiseaseRisk = async (
  plotId: number,
  days: number = 10
): Promise<ApiResponse<PlotDiseaseRisk>> => {
  try {
    return await apiFetch<ApiResponse<PlotDiseaseRisk>>(
      `/disease-risk/plot/${plotId}?days=${days}`
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch plot disease risk',
    };
  }
};

/**
 * GET /api/disease-risk/all-stations
 * Get disease risk summary for all stations
 * Access: MANAGER, SUPER_USER
 */
export const getAllStationsDiseaseRisk = async (
  days: number = 10
): Promise<ApiResponse<AllStationsDiseaseRisk>> => {
  try {
    return await apiFetch<ApiResponse<AllStationsDiseaseRisk>>(
      `/disease-risk/all-stations?days=${days}`
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch disease risk summary',
    };
  }
};

// ============ 4 PILLARS RISK DASHBOARD API ============

/**
 * GET /api/risk/summary
 * Get 4 Pillars Risk Dashboard summary
 * Access: All authenticated users
 */
export const getRiskDashboardSummary = async (
  days: number = 10
): Promise<ApiResponse<RiskDashboardSummary>> => {
  try {
    return await apiFetch<ApiResponse<RiskDashboardSummary>>(
      `/risk/summary?days=${days}`
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch risk dashboard summary',
    };
  }
};

/**
 * GET /api/risk/drought
 * Get detailed Drought risk analysis
 */
export const getDroughtRisk = async (): Promise<ApiResponse<PillarSummary & { pillar: string; title: string }>> => {
  try {
    return await apiFetch<ApiResponse<PillarSummary & { pillar: string; title: string }>>(
      '/risk/drought'
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch drought risk',
    };
  }
};

/**
 * GET /api/risk/flood
 * Get detailed Flood risk analysis
 */
export const getFloodRisk = async (): Promise<ApiResponse<PillarSummary & { pillar: string; title: string }>> => {
  try {
    return await apiFetch<ApiResponse<PillarSummary & { pillar: string; title: string }>>(
      '/risk/flood'
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch flood risk',
    };
  }
};

/**
 * GET /api/risk/storm
 * Get detailed Storm risk analysis
 */
export const getStormRisk = async (): Promise<ApiResponse<PillarSummary & { pillar: string; title: string }>> => {
  try {
    return await apiFetch<ApiResponse<PillarSummary & { pillar: string; title: string }>>(
      '/risk/storm'
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch storm risk',
    };
  }
};

/**
 * GET /api/risk/disease
 * Get detailed Disease risk analysis (BUS Algorithm)
 */
export const getDiseaseRiskSummary = async (
  days: number = 10
): Promise<ApiResponse<PillarSummary & { pillar: string; title: string }>> => {
  try {
    return await apiFetch<ApiResponse<PillarSummary & { pillar: string; title: string }>>(
      `/risk/disease?days=${days}`
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch disease risk summary',
    };
  }
};

// ============ LOCK CONTROL API (UC13) ============

/**
 * POST /api/stations/:id/lock/command
 * Send lock/unlock command to station
 * Access: SUPER_USER only
 */
export const sendLockCommand = async (
  stationId: number,
  action: 'lock' | 'unlock'
): Promise<ApiResponse<any>> => {
  try {
    return await apiFetch<ApiResponse<any>>(
      `/stations/${stationId}/lock/command`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      }
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send lock command',
    };
  }
};

/**
 * GET /api/stations/:id/lock/status
 * Get current lock status from gate_door sensor
 * Access: All authenticated users
 */
export const getLockStatus = async (
  stationId: number
): Promise<ApiResponse<any>> => {
  try {
    return await apiFetch<ApiResponse<any>>(
      `/stations/${stationId}/lock/status`
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get lock status',
    };
  }
};
