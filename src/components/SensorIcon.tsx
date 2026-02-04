import { Sensor } from '@/lib/types';
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  Wind, 
  CloudRain, 
  Waves,
  Gauge,
  DoorOpen,
  Battery,
  type LucideIcon,
} from 'lucide-react';

interface SensorIconProps {
  type: Sensor['sensor_type'];
  className?: string;
}

const iconMap: Record<Sensor['sensor_type'], LucideIcon> = {
  wind_speed: Wind,
  air_temperature: Thermometer,
  air_humidity: Droplets,
  air_pressure: Gauge,
  rainfall: CloudRain,
  soil_moisture: Waves,
  soil_temperature: Thermometer,
  cabinet_temperature: Thermometer,
  cabinet_humidity: Droplets,
  solar_voltage: Sun,
  battery_voltage: Battery,
  gate_door: DoorOpen,
};

export function SensorIcon({ type, className }: SensorIconProps) {
  const Icon = iconMap[type] || Thermometer;
  return <Icon className={className} />;
}

export const sensorTypeLabels: Record<Sensor['sensor_type'], string> = {
  wind_speed: 'ความเร็วลม',
  air_temperature: 'อุณหภูมิอากาศ',
  air_humidity: 'ความชื้นอากาศ',
  air_pressure: 'ความดันอากาศ',
  rainfall: 'ปริมาณน้ำฝน',
  soil_moisture: 'ความชื้นในดิน',
  soil_temperature: 'อุณหภูมิดิน',
  cabinet_temperature: 'อุณหภูมิตู้',
  cabinet_humidity: 'ความชื้นในตู้',
  solar_voltage: 'แรงดันโซลาร์เซลล์',
  battery_voltage: 'แรงดันแบตเตอรี่',
  gate_door: 'ประตูรั้ว',
};

export const sensorTypeUnits: Record<Sensor['sensor_type'], string> = {
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
  gate_door: '',
};
