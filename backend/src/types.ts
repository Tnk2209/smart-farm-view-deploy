// Type definitions based on ERD and telemetry structure

export type UserRole = 'USER' | 'MANAGER' | 'SUPER_USER';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type StationStatus = 'normal' | 'warning' | 'critical' | 'offline';
export type SensorStatus = 'active' | 'inactive' | 'error';

export type SensorType =
  | 'wind_speed_ms'
  | 'air_temp_c'
  | 'air_rh_pct'
  | 'air_pressure_kpa'
  | 'rain_rate_mmph'
  | 'rain_mm'
  | 'soil_rh_pct'
  | 'soil_temp_c'
  | 'cbn_rh_pct'
  | 'cbn_temp_c'
  | 'ctrl_temp_c'
  | 'batt_temp_c'
  | 'pv_a'
  | 'pv_v'
  | 'load_w'
  | 'chg_a'
  | 'load_a'
  | 'load_v'
  | 'batt_cap'
  | 'batt_v';

// Database Models
export interface Station {
  station_id: number;
  device_id: string;
  station_name: string;
  province: string;
  latitude: number;
  longitude: number;
  status: StationStatus;
  created_at: string;
  sensor_count?: number;
  alert_count?: number;
  last_active?: string;
}

export interface Sensor {
  sensor_id: number;
  station_id: number;
  sensor_type: SensorType;
  status: SensorStatus;
  installed_at: string;
  station_name?: string;
}

export interface SensorData {
  data_id: number;
  sensor_id: number;
  value: number;
  recorded_at: string;
}

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
}

export interface Threshold {
  threshold_id: number;
  sensor_type: SensorType;
  min_value: number;
  max_value: number;
  created_by: number;
  updated_at: string;
}

export interface User {
  user_id: number;
  username: string;
  password_hash: string;
  email: string;
  first_name?: string;
  last_name?: string;
  national_id?: string;
  phone_number?: string;
  role_id: number;
  role: UserRole; // Role name from join with Role table
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

export interface Role {
  role_id: number;
  role_name: UserRole;
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

// Telemetry Message Structure (from Real IoT Device - RDG0001)
export interface TelemetryMessage {
  schema_ver?: string;
  site_id?: string;
  device_id: string;
  ts: string; // ISO 8601 timestamp
  boot_id: string | number;
  seq: number;
  msg_id: string;
  data: {
    // Weather sensors (from telemetry topic)
    wind_speed_ms?: number;
    air_temp_c?: number;
    air_rh_pct?: number;
    air_pressure_kpa?: number;
    rain_rate_mmph?: number;
    rain_mm?: number;
    soil_rh_pct?: number;
    soil_temp_c?: number;
    // Power/Cabinet sensors (from status topic)
    cbn_rh_pct?: number;
    cbn_temp_c?: number;
    ctrl_temp_c?: number;
    batt_temp_c?: number;
    pv_a?: number;
    pv_v?: number;
    load_w?: number;
    chg_a?: number;
    load_a?: number;
    load_v?: number;
    batt_cap?: number;
    batt_v?: number;
  };
  sim_serial?: string;
  sim_rssi?: number;
}

// Field Mapping for Telemetry → Sensor Type
// (Identity mapping since SensorType now matches field names)
export const TELEMETRY_FIELD_MAPPING: Record<string, SensorType> = {
  wind_speed_ms: 'wind_speed_ms',
  air_temp_c: 'air_temp_c',
  air_rh_pct: 'air_rh_pct',
  air_pressure_kpa: 'air_pressure_kpa',
  rain_rate_mmph: 'rain_rate_mmph',
  rain_mm: 'rain_mm',
  soil_rh_pct: 'soil_rh_pct',
  soil_temp_c: 'soil_temp_c',
  cbn_rh_pct: 'cbn_rh_pct',
  cbn_temp_c: 'cbn_temp_c',
  ctrl_temp_c: 'ctrl_temp_c',
  batt_temp_c: 'batt_temp_c',
  pv_a: 'pv_a',
  pv_v: 'pv_v',
  load_w: 'load_w',
  chg_a: 'chg_a',
  load_a: 'load_a',
  load_v: 'load_v',
  batt_cap: 'batt_cap',
  batt_v: 'batt_v',
};

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface TelemetryIngestResponse {
  success: boolean;
  message: string;
  records_created: number;
  alerts_triggered: number;
  station_id: number;
}

// Sensor Unit Mapping (matching real MQTT payload fields)
export const SENSOR_UNITS: Record<SensorType, string> = {
  wind_speed_ms: 'm/s',
  air_temp_c: '°C',
  air_rh_pct: '%',
  air_pressure_kpa: 'kPa',
  rain_rate_mmph: 'mm/h',
  rain_mm: 'mm',
  soil_rh_pct: '%',
  soil_temp_c: '°C',
  cbn_rh_pct: '%',
  cbn_temp_c: '°C',
  ctrl_temp_c: '°C',
  batt_temp_c: '°C',
  pv_a: 'A',
  pv_v: 'V',
  load_w: 'W',
  chg_a: 'A',
  load_a: 'A',
  load_v: 'V',
  batt_cap: '%',
  batt_v: 'V',
};
