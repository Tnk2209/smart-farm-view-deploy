// Type definitions based on ERD and telemetry structure

export type UserRole = 'USER' | 'MANAGER' | 'SUPER_USER';
export type AlertSeverity = 'low' | 'medium' | 'high';
export type StationStatus = 'normal' | 'warning' | 'critical' | 'offline';
export type SensorStatus = 'active' | 'inactive' | 'error';

export type SensorType = 
  | 'wind_speed'
  | 'air_temperature'
  | 'air_humidity'
  | 'air_pressure'
  | 'rainfall'
  | 'soil_moisture'
  | 'soil_temperature'
  | 'cabinet_temperature'
  | 'cabinet_humidity'
  | 'solar_voltage'
  | 'battery_voltage';

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
}

export interface Sensor {
  sensor_id: number;
  station_id: number;
  sensor_type: SensorType;
  status: SensorStatus;
  installed_at: string;
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
  role_id: number;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

export interface Role {
  role_id: number;
  role_name: UserRole;
}

// Telemetry Message Structure (from IoT Device)
export interface TelemetryMessage {
  device_id: string;
  ts: string; // ISO 8601 timestamp
  boot_id: number;
  seq: number;
  msg_id: string;
  data: {
    wind_speed_ms?: number;
    air_temp_c?: number;
    air_rh_pct?: number;
    air_pressure_hpa?: number;
    rain_rate_mmph?: number;
    soil_moisture_pct?: number;
    soil_temp_c?: number;
    cabinet_temp_c?: number;
    cabinet_rh_pct?: number;
    solar_v?: number;
    battery_v?: number;
  };
  sim_serial?: string;
  sim_rssi?: number;
}

// Field Mapping for Telemetry → Sensor Type
export const TELEMETRY_FIELD_MAPPING: Record<string, SensorType> = {
  wind_speed_ms: 'wind_speed',
  air_temp_c: 'air_temperature',
  air_rh_pct: 'air_humidity',
  air_pressure_hpa: 'air_pressure',
  rain_rate_mmph: 'rainfall',
  soil_moisture_pct: 'soil_moisture',
  soil_temp_c: 'soil_temperature',
  cabinet_temp_c: 'cabinet_temperature',
  cabinet_rh_pct: 'cabinet_humidity',
  solar_v: 'solar_voltage',
  battery_v: 'battery_voltage',
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

// Sensor Unit Mapping
export const SENSOR_UNITS: Record<SensorType, string> = {
  wind_speed: 'm/s',
  air_temperature: '°C',
  air_humidity: '%',
  air_pressure: 'hPa',
  rainfall: 'mm/h',
  soil_moisture: '%',
  soil_temperature: '°C',
  cabinet_temperature: '°C',
  cabinet_humidity: '%',
  solar_voltage: 'V',
  battery_voltage: 'V',
};
