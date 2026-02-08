// Mock API functions that simulate real backend calls
// Based on API Specification from System Design Document (STEP 7)

import { 
  User, Station, Sensor, SensorData, Alert, Threshold, 
  DashboardSummary, ApiResponse, UserRole 
} from './types';
import { 
  mockStations, mockSensors, mockSensorData, mockAlerts, 
  mockThresholds, mockUsers, getDashboardSummary 
} from './mockData';

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============ AUTH API ============
// POST /api/auth/login
export const login = async (username: string, password: string, role: UserRole): Promise<ApiResponse<User>> => {
  await delay(500);
  
  // Mock login - always succeeds with selected role
  const user: User = {
    user_id: Date.now(),
    username,
    email: `${username}@smartagri.th`,
    role_id: role === 'SUPER_USER' ? 3 : role === 'MANAGER' ? 2 : 1,
    role,
    status: 'active',
    created_at: new Date().toISOString(),
  };
  
  return { data: user, success: true };
};

// ============ STATIONS API ============
// GET /api/stations
export const getStations = async (): Promise<ApiResponse<Station[]>> => {
  await delay(300);
  return { data: mockStations, success: true };
};

// GET /api/stations/{id}
export const getStationById = async (id: number): Promise<ApiResponse<Station | null>> => {
  await delay(200);
  const station = mockStations.find(s => s.station_id === id) || null;
  return { data: station, success: !!station };
};

// POST /api/stations (Manager/Super User only)
export const createStation = async (station: Partial<Station>): Promise<ApiResponse<Station>> => {
  await delay(400);
  const newStation: Station = {
    station_id: mockStations.length + 1,
    station_name: station.station_name || 'New Station',
    province: station.province || 'Unknown',
    latitude: station.latitude || 13.7563,
    longitude: station.longitude || 100.5018,
    status: 'normal',
    created_at: new Date().toISOString(),
    sensor_count: 0,
  };
  mockStations.push(newStation);
  return { data: newStation, success: true };
};

// PUT /api/stations/{id}
export const updateStation = async (id: number, updates: Partial<Station>): Promise<ApiResponse<Station | null>> => {
  await delay(300);
  const index = mockStations.findIndex(s => s.station_id === id);
  if (index === -1) return { data: null, success: false, message: 'Station not found' };
  
  mockStations[index] = { ...mockStations[index], ...updates };
  return { data: mockStations[index], success: true };
};

// DELETE /api/stations/{id}
export const deleteStation = async (id: number): Promise<ApiResponse<boolean>> => {
  await delay(300);
  const index = mockStations.findIndex(s => s.station_id === id);
  if (index === -1) return { data: false, success: false, message: 'Station not found' };
  
  mockStations.splice(index, 1);
  return { data: true, success: true };
};

// ============ SENSORS API ============
// GET /api/sensors
export const getSensors = async (): Promise<ApiResponse<Sensor[]>> => {
  await delay(300);
  return { data: mockSensors, success: true };
};

// GET /api/sensors?station_id={id}
export const getSensorsByStation = async (stationId: number): Promise<ApiResponse<Sensor[]>> => {
  await delay(200);
  const sensors = mockSensors.filter(s => s.station_id === stationId);
  return { data: sensors, success: true };
};

// GET /api/sensors/{id}
export const getSensorById = async (id: number): Promise<ApiResponse<Sensor | null>> => {
  await delay(200);
  const sensor = mockSensors.find(s => s.sensor_id === id) || null;
  return { data: sensor, success: !!sensor };
};

// GET /api/sensors/{id}/data?from=...&to=...
export const getSensorData = async (
  sensorId: number, 
  from?: string, 
  to?: string
): Promise<ApiResponse<SensorData[]>> => {
  await delay(300);
  
  let data = mockSensorData.filter(d => d.sensor_id === sensorId);
  
  if (from) {
    const fromDate = new Date(from);
    data = data.filter(d => new Date(d.recorded_at) >= fromDate);
  }
  
  if (to) {
    const toDate = new Date(to);
    data = data.filter(d => new Date(d.recorded_at) <= toDate);
  }
  
  return { data, success: true };
};

// POST /api/sensors/{id}/data (for ingesting data - demo only)
export const addSensorData = async (sensorId: number, value: number): Promise<ApiResponse<SensorData>> => {
  await delay(200);
  const newData: SensorData = {
    data_id: mockSensorData.length + 1,
    sensor_id: sensorId,
    value,
    recorded_at: new Date().toISOString(),
  };
  mockSensorData.push(newData);
  return { data: newData, success: true };
};

// ============ ALERTS API ============
// GET /api/alerts
export const getAlerts = async (filters?: {
  severity?: string;
  stationId?: number;
  sensorId?: number;
  acknowledged?: boolean;
}): Promise<ApiResponse<Alert[]>> => {
  await delay(300);
  
  let alerts = [...mockAlerts];
  
  if (filters?.severity) {
    alerts = alerts.filter(a => a.severity === filters.severity);
  }
  if (filters?.stationId) {
    alerts = alerts.filter(a => a.station_id === filters.stationId);
  }
  if (filters?.sensorId) {
    alerts = alerts.filter(a => a.sensor_id === filters.sensorId);
  }
  if (filters?.acknowledged !== undefined) {
    alerts = alerts.filter(a => a.is_acknowledged === filters.acknowledged);
  }
  
  return { data: alerts, success: true };
};

// GET /api/alerts/{id}
export const getAlertById = async (id: number): Promise<ApiResponse<Alert | null>> => {
  await delay(200);
  const alert = mockAlerts.find(a => a.alert_id === id) || null;
  return { data: alert, success: !!alert };
};

// PUT /api/alerts/{id}/ack
export const acknowledgeAlert = async (id: number): Promise<ApiResponse<Alert | null>> => {
  await delay(300);
  const alert = mockAlerts.find(a => a.alert_id === id);
  if (!alert) return { data: null, success: false, message: 'Alert not found' };
  
  alert.is_acknowledged = true;
  return { data: alert, success: true };
};

// ============ THRESHOLDS API ============
// GET /api/thresholds
export const getThresholds = async (): Promise<ApiResponse<Threshold[]>> => {
  await delay(200);
  return { data: mockThresholds, success: true };
};

// PUT /api/thresholds/{id}
export const updateThreshold = async (id: number, updates: Partial<Threshold>): Promise<ApiResponse<Threshold | null>> => {
  await delay(300);
  const index = mockThresholds.findIndex(t => t.threshold_id === id);
  if (index === -1) return { data: null, success: false, message: 'Threshold not found' };
  
  mockThresholds[index] = { 
    ...mockThresholds[index], 
    ...updates, 
    updated_at: new Date().toISOString() 
  };
  return { data: mockThresholds[index], success: true };
};

// ============ USERS API ============
// GET /api/users
export const getUsers = async (): Promise<ApiResponse<User[]>> => {
  await delay(300);
  return { data: mockUsers, success: true };
};

// POST /api/users (Super User only)
export const createUser = async (user: Partial<User>): Promise<ApiResponse<User>> => {
  await delay(400);
  const newUser: User = {
    user_id: mockUsers.length + 1,
    username: user.username || 'newuser',
    email: user.email || 'newuser@smartagri.th',
    role_id: user.role_id || 1,
    role: user.role || 'USER',
    status: 'active',
    created_at: new Date().toISOString(),
  };
  mockUsers.push(newUser);
  return { data: newUser, success: true };
};

// PUT /api/users/{id}
export const updateUser = async (id: number, updates: Partial<User>): Promise<ApiResponse<User | null>> => {
  await delay(300);
  const index = mockUsers.findIndex(u => u.user_id === id);
  if (index === -1) return { data: null, success: false, message: 'User not found' };
  
  mockUsers[index] = { ...mockUsers[index], ...updates };
  return { data: mockUsers[index], success: true };
};

// DELETE /api/users/{id}
export const deleteUser = async (id: number): Promise<ApiResponse<boolean>> => {
  await delay(300);
  const index = mockUsers.findIndex(u => u.user_id === id);
  if (index === -1) return { data: false, success: false, message: 'User not found' };
  
  mockUsers.splice(index, 1);
  return { data: true, success: true };
};

// ============ DASHBOARD API ============
// GET /api/dashboard/summary
export const getDashboardData = async (): Promise<ApiResponse<DashboardSummary>> => {
  await delay(300);
  return { data: getDashboardSummary(), success: true };
};
