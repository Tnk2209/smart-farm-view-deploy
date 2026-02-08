// API functions that connect to real backend
// Based on API Specification from System Design Document (STEP 7)

import { 
  User, Station, Sensor, SensorData, Alert, Threshold, 
  DashboardSummary, ApiResponse, UserRole 
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

// ============ SENSORS API ============

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
