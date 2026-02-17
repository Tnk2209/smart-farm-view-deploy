// Type definitions based on the ERD from the system design document

export type UserRole = 'USER' | 'MANAGER' | 'SUPER_USER';

export interface Role {
  role_id: number;
  role_name: UserRole;
}

export interface User {
  user_id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  national_id?: string;
  phone_number?: string;
  role_id: number;
  role: UserRole;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Station {
  station_id: number;
  station_name: string;
  device_id: string;
  province: string;
  latitude: number;
  longitude: number;
  status: 'normal' | 'warning' | 'critical' | 'offline';
  created_at: string;
  sensor_count?: number;
  alert_count?: number;
  last_active?: string;
}

// Environmental Sensor Types (matching backend after sensor/status separation)
export type SensorType =
  | 'wind_speed_ms'
  | 'air_temp_c'
  | 'air_rh_pct'
  | 'air_pressure_kpa'
  | 'rain_rate_mmph'
  | 'rain_mm'
  | 'soil_rh_pct'
  | 'soil_temp_c';

export interface Sensor {
  sensor_id: number;
  station_id: number;
  sensor_type: SensorType;
  status: 'active' | 'inactive' | 'error';
  installed_at: string;
  station_name?: string;
}

export interface SensorData {
  data_id: number;
  sensor_id: number;
  value: number;
  recorded_at: string;
  unit?: string;
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  alert_id: number;
  station_id: number;
  sensor_id: number;
  data_id: number;
  alert_type: string;
  alert_message: string;
  severity: AlertSeverity;
  is_acknowledged: boolean;
  created_at: string;
  station_name?: string;
  sensor_type?: string;
}

export interface Threshold {
  threshold_id: number;
  sensor_type: SensorType;
  min_value: number;
  max_value: number;
  created_by: number;
  updated_at: string;
}

// Station Status (Device Health) - New Update
export interface StationStatus {
  status_id: number;
  station_id: number;
  // Cabinet Monitoring
  cbn_rh_pct?: number;
  cbn_temp_c?: number;
  ctrl_temp_c?: number;
  batt_temp_c?: number;
  // Solar Power
  pv_a?: number;
  pv_v?: number;
  // Load & Battery
  load_w?: number;
  load_a?: number;
  load_v?: number;
  chg_a?: number;
  batt_cap?: number;
  batt_v?: number;
  recorded_at: string;
  created_at: string;
}

// Farm Plot for UC10, UC11 (New Update:2)
export interface FarmPlot {
  plot_id: number;
  user_id: number;
  lat: number;
  lon: number;
  utm_coords?: string;
  nearest_station_id?: number;
  land_title_deed?: string;
  area_size_rai?: number;
  status: 'pending' | 'active' | 'rejected';
  created_at: string;
  updated_at: string;
}

// Disease Risk (BUS Algorithm) for UC12 (New Update:2)
export type RiskLevel = 'low' | 'medium' | 'high';

export interface BUSResult {
  bus_score: number;
  risk_level: RiskLevel;
  dew_point_avg: number;
  lwd_hours: number;
  temperature_avg: number;
  humidity_avg: number;
  days_analyzed: number;
}

export interface StationDiseaseRisk extends BUSResult {
  station_id: number;
  station_name: string;
  data_points: number;
}

export interface PlotDiseaseRisk extends BUSResult {
  plot_id: number;
  station_id: number;
  station_name: string;
  data_points: number;
}

export interface DiseaseRiskSummary {
  total_stations: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
}

export interface AllStationsDiseaseRisk {
  summary: DiseaseRiskSummary;
  stations: Array<{
    station_id: number;
    station_name: string;
    province: string;
    bus_score: number;
    risk_level: RiskLevel;
    lwd_hours?: number;
    has_data: boolean;
  }>;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface DashboardSummary {
  total_stations: number;
  total_sensors: number;
  active_alerts: number;
  normal_stations: number;
  warning_stations: number;
  critical_stations: number;
}

// 4 Pillars Risk Dashboard Types (New Update:2)
export interface StationRisk {
  station_id: number;
  station_name: string;
  province: string;
  risk_level: RiskLevel;
  risk_score: number;
  details?: any;
}

export interface PillarSummary {
  risk_level: RiskLevel;
  affected_stations: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  stations: StationRisk[];
}

export interface RiskDashboardSummary {
  drought: PillarSummary;
  flood: PillarSummary;
  storm: PillarSummary;
  disease: PillarSummary;
  total_stations: number;
  last_updated: string;
}

export type PillarType = 'drought' | 'flood' | 'storm' | 'disease';

// Lock Control Types (UC13: Digital Lock Control) (New Update:2)
export type LockAction = 'lock' | 'unlock';
export type LockStatus = 'locked' | 'unlocked';

export interface LockCommandRequest {
  action: LockAction;
}

export interface LockCommandResponse {
  station_id: number;
  station_name: string;
  action: LockAction;
  topic: string;
  timestamp: string;
  user: string;
}

export interface LockStatusData {
  has_lock: boolean;
  station_name?: string;
  status?: LockStatus;
  gate_value?: number;
  last_update?: string;
  last_command?: {
    alert_message: string;
    created_at: string;
  } | null;
  message?: string;
}
