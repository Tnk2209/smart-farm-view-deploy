import type { SensorType } from '@/lib/types';
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  Wind, 
  CloudRain, 
  Waves,
  Gauge,
  type LucideIcon,
} from 'lucide-react';

interface SensorIconProps {
  type: SensorType;
  className?: string;
}

// Icon mapping for environmental sensor types
const iconMap: Record<SensorType, LucideIcon> = {
  wind_speed_ms: Wind,
  air_temp_c: Thermometer,
  air_rh_pct: Droplets,
  air_pressure_kpa: Gauge,
  rain_rate_mmph: CloudRain,
  rain_mm: CloudRain,
  soil_rh_pct: Waves,
  soil_temp_c: Thermometer,
};

export function SensorIcon({ type, className }: SensorIconProps) {
  const Icon = iconMap[type] || Thermometer;
  return <Icon className={className} />;
}

// Thai labels for sensor types
export const sensorTypeLabels: Record<SensorType, string> = {
  wind_speed_ms: 'ความเร็วลม',
  air_temp_c: 'อุณหภูมิอากาศ',
  air_rh_pct: 'ความชื้นอากาศ',
  air_pressure_kpa: 'ความดันอากาศ',
  rain_rate_mmph: 'อัตราน้ำฝน',
  rain_mm: 'ปริมาณน้ำฝน',
  soil_rh_pct: 'ความชื้นในดิน',
  soil_temp_c: 'อุณหภูมิดิน',
};

// Units for sensor types
export const sensorTypeUnits: Record<SensorType, string> = {
  wind_speed_ms: 'm/s',
  air_temp_c: '°C',
  air_rh_pct: '%',
  air_pressure_kpa: 'kPa',
  rain_rate_mmph: 'mm/h',
  rain_mm: 'mm',
  soil_rh_pct: '%',
  soil_temp_c: '°C',
};
