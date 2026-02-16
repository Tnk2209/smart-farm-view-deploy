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
  last_active?: string;
}

export interface Sensor {
  sensor_id: number;
  station_id: number;
  device_id: string;
  sensor_type: 'wind_speed' | 'air_temperature' | 'air_humidity' | 'air_pressure' | 'rainfall' | 'soil_moisture' | 'soil_temperature' | 'cabinet_temperature' | 'cabinet_humidity' | 'solar_voltage' | 'battery_voltage' | 'gate_door';
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

export type AlertSeverity = 'low' | 'medium' | 'high';

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
  sensor_type: Sensor['sensor_type'];
  min_value: number;
  max_value: number;
  created_by: number;
  updated_at: string;
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
