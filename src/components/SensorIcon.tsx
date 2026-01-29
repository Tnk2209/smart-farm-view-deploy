import { Sensor } from '@/lib/types';
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  Wind, 
  CloudRain, 
  Beaker,
  Waves,
} from 'lucide-react';

interface SensorIconProps {
  type: Sensor['sensor_type'];
  className?: string;
}

const iconMap: Record<Sensor['sensor_type'], typeof Thermometer> = {
  temperature: Thermometer,
  humidity: Droplets,
  soil_moisture: Waves,
  light: Sun,
  ph: Beaker,
  wind_speed: Wind,
  rainfall: CloudRain,
};

export function SensorIcon({ type, className }: SensorIconProps) {
  const Icon = iconMap[type] || Thermometer;
  return <Icon className={className} />;
}

export const sensorTypeLabels: Record<Sensor['sensor_type'], string> = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  soil_moisture: 'Soil Moisture',
  light: 'Light Intensity',
  ph: 'pH Level',
  wind_speed: 'Wind Speed',
  rainfall: 'Rainfall',
};

export const sensorTypeUnits: Record<Sensor['sensor_type'], string> = {
  temperature: '°C',
  humidity: '%',
  soil_moisture: '%',
  light: 'lux',
  ph: 'pH',
  wind_speed: 'km/h',
  rainfall: 'mm',
};
