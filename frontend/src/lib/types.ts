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
