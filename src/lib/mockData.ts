import { 
  User, Station, Sensor, SensorData, Alert, Threshold, 
  DashboardSummary, UserRole, AlertSeverity 
} from './types';

// Thailand provinces with approximate coordinates for demo stations
const thailandProvinces = [
  { name: 'Chiang Mai', lat: 18.7883, lng: 98.9853 },
  { name: 'Chiang Rai', lat: 19.9105, lng: 99.8406 },
  { name: 'Lampang', lat: 18.2888, lng: 99.4909 },
  { name: 'Phitsanulok', lat: 16.8211, lng: 100.2659 },
  { name: 'Nakhon Ratchasima', lat: 14.9799, lng: 102.0977 },
  { name: 'Khon Kaen', lat: 16.4322, lng: 102.8236 },
  { name: 'Udon Thani', lat: 17.4138, lng: 102.7872 },
  { name: 'Ubon Ratchathani', lat: 15.2287, lng: 104.8564 },
  { name: 'Nakhon Sawan', lat: 15.7030, lng: 100.1371 },
  { name: 'Phetchabun', lat: 16.4190, lng: 101.1591 },
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018 },
  { name: 'Pathum Thani', lat: 14.0208, lng: 100.5250 },
  { name: 'Ayutthaya', lat: 14.3532, lng: 100.5689 },
  { name: 'Saraburi', lat: 14.5289, lng: 100.9108 },
  { name: 'Lopburi', lat: 14.7995, lng: 100.6534 },
  { name: 'Nakhon Pathom', lat: 13.8196, lng: 100.0443 },
  { name: 'Kanchanaburi', lat: 14.0227, lng: 99.5328 },
  { name: 'Ratchaburi', lat: 13.5283, lng: 99.8134 },
  { name: 'Prachuap Khiri Khan', lat: 11.8126, lng: 99.7975 },
  { name: 'Surat Thani', lat: 9.1382, lng: 99.3214 },
  { name: 'Nakhon Si Thammarat', lat: 8.4304, lng: 99.9631 },
  { name: 'Songkhla', lat: 7.1898, lng: 100.5954 },
  { name: 'Phuket', lat: 7.8804, lng: 98.3923 },
  { name: 'Krabi', lat: 8.0863, lng: 98.9063 },
  { name: 'Trang', lat: 7.5563, lng: 99.6114 },
  { name: 'Chanthaburi', lat: 12.6113, lng: 102.1039 },
  { name: 'Rayong', lat: 12.6814, lng: 101.2816 },
  { name: 'Chonburi', lat: 13.3611, lng: 100.9847 },
  { name: 'Sa Kaeo', lat: 13.8240, lng: 102.0645 },
  { name: 'Prachinburi', lat: 14.0509, lng: 101.3676 },
  { name: 'Nan', lat: 18.7756, lng: 100.7730 },
  { name: 'Phrae', lat: 18.1445, lng: 100.1403 },
  { name: 'Sukhothai', lat: 17.0156, lng: 99.8231 },
  { name: 'Tak', lat: 16.8840, lng: 99.1258 },
  { name: 'Mae Hong Son', lat: 19.3020, lng: 97.9654 },
  { name: 'Lamphun', lat: 18.5744, lng: 99.0087 },
  { name: 'Nong Khai', lat: 17.8783, lng: 102.7420 },
  { name: 'Mukdahan', lat: 16.5447, lng: 104.7236 },
  { name: 'Sakon Nakhon', lat: 17.1545, lng: 104.1348 },
  { name: 'Buriram', lat: 14.9951, lng: 103.1029 },
];

const sensorTypes: Sensor['sensor_type'][] = [
  'temperature', 'humidity', 'soil_moisture', 'light', 'ph', 'wind_speed', 'rainfall'
];

const stationStatuses: Station['status'][] = ['normal', 'warning', 'critical', 'offline'];

// Generate stations (approximately 40 stations as per document)
export const mockStations: Station[] = thailandProvinces.map((province, index) => ({
  station_id: index + 1,
  station_name: `${province.name} Agricultural Station`,
  province: province.name,
  latitude: province.lat + (Math.random() - 0.5) * 0.1,
  longitude: province.lng + (Math.random() - 0.5) * 0.1,
  status: stationStatuses[Math.floor(Math.random() * 10) < 7 ? 0 : Math.floor(Math.random() * 4)],
  created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  sensor_count: Math.floor(Math.random() * 5) + 3,
}));

// Generate sensors (3-7 sensors per station)
let sensorIdCounter = 1;
export const mockSensors: Sensor[] = mockStations.flatMap(station => {
  const sensorCount = station.sensor_count || 5;
  const selectedTypes = [...sensorTypes].sort(() => Math.random() - 0.5).slice(0, sensorCount);
  
  return selectedTypes.map(sensorType => ({
    sensor_id: sensorIdCounter++,
    station_id: station.station_id,
    sensor_type: sensorType,
    status: Math.random() > 0.1 ? 'active' : (Math.random() > 0.5 ? 'inactive' : 'error'),
    installed_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    station_name: station.station_name,
  }));
});

// Generate sensor data (last 24 hours of readings)
const generateSensorValue = (sensorType: Sensor['sensor_type']): number => {
  const ranges: Record<Sensor['sensor_type'], [number, number]> = {
    temperature: [20, 40],
    humidity: [40, 90],
    soil_moisture: [20, 80],
    light: [100, 1000],
    ph: [5.5, 8.5],
    wind_speed: [0, 30],
    rainfall: [0, 50],
  };
  const [min, max] = ranges[sensorType];
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
};

const getUnit = (sensorType: Sensor['sensor_type']): string => {
  const units: Record<Sensor['sensor_type'], string> = {
    temperature: '°C',
    humidity: '%',
    soil_moisture: '%',
    light: 'lux',
    ph: 'pH',
    wind_speed: 'km/h',
    rainfall: 'mm',
  };
  return units[sensorType];
};

let dataIdCounter = 1;
export const mockSensorData: SensorData[] = [];

// Generate 24 hours of data points (every 15 minutes = 96 readings per sensor)
mockSensors.forEach(sensor => {
  const now = Date.now();
  for (let i = 96; i >= 0; i--) {
    mockSensorData.push({
      data_id: dataIdCounter++,
      sensor_id: sensor.sensor_id,
      value: generateSensorValue(sensor.sensor_type),
      recorded_at: new Date(now - i * 15 * 60 * 1000).toISOString(),
      unit: getUnit(sensor.sensor_type),
    });
  }
});

// Generate thresholds for each sensor type
export const mockThresholds: Threshold[] = sensorTypes.map((sensorType, index) => {
  const thresholdRanges: Record<Sensor['sensor_type'], [number, number]> = {
    temperature: [15, 35],
    humidity: [30, 85],
    soil_moisture: [25, 75],
    light: [200, 900],
    ph: [6.0, 7.5],
    wind_speed: [0, 25],
    rainfall: [0, 40],
  };
  const [min, max] = thresholdRanges[sensorType];
  
  return {
    threshold_id: index + 1,
    sensor_type: sensorType,
    min_value: min,
    max_value: max,
    created_by: 1,
    updated_at: new Date().toISOString(),
  };
});

// Generate alerts
let alertIdCounter = 1;
export const mockAlerts: Alert[] = [];

// Create some alerts for sensors with values outside thresholds
mockSensors.slice(0, 30).forEach(sensor => {
  const threshold = mockThresholds.find(t => t.sensor_type === sensor.sensor_type);
  if (!threshold) return;
  
  const recentData = mockSensorData.filter(d => d.sensor_id === sensor.sensor_id).slice(-10);
  
  recentData.forEach(data => {
    if (Math.random() > 0.85) {
      const isHigh = data.value > threshold.max_value;
      const isLow = data.value < threshold.min_value;
      
      if (isHigh || isLow || Math.random() > 0.7) {
        const severity: AlertSeverity = Math.random() > 0.7 ? 'high' : (Math.random() > 0.5 ? 'medium' : 'low');
        
        mockAlerts.push({
          alert_id: alertIdCounter++,
          station_id: sensor.station_id,
          sensor_id: sensor.sensor_id,
          data_id: data.data_id,
          alert_type: isHigh ? 'HIGH_VALUE' : isLow ? 'LOW_VALUE' : 'ANOMALY',
          alert_message: `${sensor.sensor_type} ${isHigh ? 'exceeds maximum' : isLow ? 'below minimum' : 'anomaly detected'} threshold at ${mockStations.find(s => s.station_id === sensor.station_id)?.station_name}`,
          severity,
          is_acknowledged: Math.random() > 0.6,
          created_at: data.recorded_at,
          station_name: mockStations.find(s => s.station_id === sensor.station_id)?.station_name,
          sensor_type: sensor.sensor_type,
        });
      }
    }
  });
});

// Sort alerts by date (newest first)
mockAlerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

// Generate mock users
export const mockUsers: User[] = [
  { user_id: 1, username: 'admin', email: 'admin@smartagri.th', role_id: 3, role: 'SUPER_USER', status: 'active', created_at: '2024-01-01T00:00:00Z' },
  { user_id: 2, username: 'manager1', email: 'manager1@smartagri.th', role_id: 2, role: 'MANAGER', status: 'active', created_at: '2024-02-15T00:00:00Z' },
  { user_id: 3, username: 'manager2', email: 'manager2@smartagri.th', role_id: 2, role: 'MANAGER', status: 'active', created_at: '2024-03-01T00:00:00Z' },
  { user_id: 4, username: 'user1', email: 'user1@smartagri.th', role_id: 1, role: 'USER', status: 'active', created_at: '2024-04-01T00:00:00Z' },
  { user_id: 5, username: 'user2', email: 'user2@smartagri.th', role_id: 1, role: 'USER', status: 'active', created_at: '2024-05-01T00:00:00Z' },
  { user_id: 6, username: 'user3', email: 'user3@smartagri.th', role_id: 1, role: 'USER', status: 'inactive', created_at: '2024-06-01T00:00:00Z' },
];

// Dashboard summary calculation
export const getDashboardSummary = (): DashboardSummary => {
  const today = new Date().toDateString();
  const alertsToday = mockAlerts.filter(a => new Date(a.created_at).toDateString() === today);
  
  return {
    totalStations: mockStations.length,
    totalSensors: mockSensors.length,
    alertsToday: alertsToday.length,
    highSeverityAlerts: alertsToday.filter(a => a.severity === 'high').length,
    stationsByStatus: {
      normal: mockStations.filter(s => s.status === 'normal').length,
      warning: mockStations.filter(s => s.status === 'warning').length,
      critical: mockStations.filter(s => s.status === 'critical').length,
      offline: mockStations.filter(s => s.status === 'offline').length,
    },
  };
};
