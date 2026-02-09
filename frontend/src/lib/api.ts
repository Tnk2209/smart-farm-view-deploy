// API functions that connect to real backend
// Based on API Specification from System Design Document (STEP 7)

import { 
  User, Station, Sensor, SensorData, Alert, Threshold, 
  DashboardSummary, ApiResponse, UserRole, Role 
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
