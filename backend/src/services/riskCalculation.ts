/**
 * 4 Pillars Risk Calculation Service
 * ตาม TOR: Disease ใช้ BUS Algorithm (จริง), อีก 3 pillars ใช้ Mock/Simple logic
 */

import { getAllStations } from '../database/queries.js';
import { getLatestStationData } from '../database/queries.js';
import { calculateBUS } from './busAlgorithm.js';
import { getHourlyTempHumidityData } from '../database/queries.js';

export type RiskLevel = 'low' | 'medium' | 'high';

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

/**
 * Calculate Drought Risk
 * Based on: Rainfall (last 7 days) + Soil Moisture
 * Logic:
 * - If rain < 5mm AND soil_moisture < 30% → HIGH
 * - If rain < 10mm OR soil_moisture < 40% → MEDIUM
 * - Otherwise → LOW
 */
export async function calculateDroughtRisk(): Promise<PillarSummary> {
  const stations = await getAllStations();
  const stationRisks: StationRisk[] = [];

  for (const station of stations) {
    try {
      const latestData = await getLatestStationData(station.station_id);
      
      // ดึงค่า rainfall และ soil_moisture
      const rainfallSensor = latestData.find(d => d.sensor.sensor_type === 'rainfall');
      const soilMoistureSensor = latestData.find(d => d.sensor.sensor_type === 'soil_moisture');

      const rainfall = rainfallSensor?.latestData?.value || 0;
      const soilMoisture = soilMoistureSensor?.latestData?.value || 50;

      // คำนวณความเสี่ยง (simplified)
      // สมมติ rainfall คือค่าเฉลี่ย 7 วัน (ในระบบจริงต้อง query ย้อนหลัง)
      const rainfall7days = rainfall * 7; // mock: สมมติเป็นค่าสะสม 7 วัน

      let risk_level: RiskLevel;
      let risk_score: number;

      if (rainfall7days < 5 && soilMoisture < 30) {
        risk_level = 'high';
        risk_score = 8.5;
      } else if (rainfall7days < 10 || soilMoisture < 40) {
        risk_level = 'medium';
        risk_score = 5.0;
      } else {
        risk_level = 'low';
        risk_score = 2.0;
      }

      stationRisks.push({
        station_id: station.station_id,
        station_name: station.station_name,
        province: station.province,
        risk_level,
        risk_score,
        details: {
          rainfall_7days: Math.round(rainfall7days * 10) / 10,
          soil_moisture: Math.round(soilMoisture * 10) / 10,
        },
      });
    } catch (error) {
      console.error(`Error calculating drought risk for station ${station.station_id}:`, error);
      stationRisks.push({
        station_id: station.station_id,
        station_name: station.station_name,
        province: station.province,
        risk_level: 'low',
        risk_score: 0,
      });
    }
  }

  return summarizePillar(stationRisks);
}

/**
 * Calculate Flood Risk
 * Based on: Heavy Rainfall (24hr) + River Level (mock)
 * Logic:
 * - If rain > 100mm/24hr → HIGH
 * - If rain > 50mm/24hr → MEDIUM
 * - Otherwise → LOW
 */
export async function calculateFloodRisk(): Promise<PillarSummary> {
  const stations = await getAllStations();
  const stationRisks: StationRisk[] = [];

  for (const station of stations) {
    try {
      const latestData = await getLatestStationData(station.station_id);
      
      const rainfallSensor = latestData.find(d => d.sensor.sensor_type === 'rainfall');
      const rainfall = rainfallSensor?.latestData?.value || 0;

      // Mock: rainfall rate (mm/h) → สมมติเป็นค่า 24 ชั่วโมง
      const rainfall24hr = rainfall * 24;
      
      // Mock river level (0-10 scale)
      const riverLevel = Math.random() * 10;

      let risk_level: RiskLevel;
      let risk_score: number;

      if (rainfall24hr > 100 || riverLevel > 8) {
        risk_level = 'high';
        risk_score = 9.0;
      } else if (rainfall24hr > 50 || riverLevel > 6) {
        risk_level = 'medium';
        risk_score = 5.5;
      } else {
        risk_level = 'low';
        risk_score = 2.0;
      }

      stationRisks.push({
        station_id: station.station_id,
        station_name: station.station_name,
        province: station.province,
        risk_level,
        risk_score,
        details: {
          rainfall_24hr: Math.round(rainfall24hr * 10) / 10,
          river_level: Math.round(riverLevel * 10) / 10,
        },
      });
    } catch (error) {
      console.error(`Error calculating flood risk for station ${station.station_id}:`, error);
      stationRisks.push({
        station_id: station.station_id,
        station_name: station.station_name,
        province: station.province,
        risk_level: 'low',
        risk_score: 0,
      });
    }
  }

  return summarizePillar(stationRisks);
}

/**
 * Calculate Storm Risk
 * Based on: Wind Speed + Pressure Drop
 * Logic:
 * - If wind > 20 m/s OR pressure_drop > 10 hPa → HIGH
 * - If wind > 15 m/s OR pressure_drop > 5 hPa → MEDIUM
 * - Otherwise → LOW
 */
export async function calculateStormRisk(): Promise<PillarSummary> {
  const stations = await getAllStations();
  const stationRisks: StationRisk[] = [];

  for (const station of stations) {
    try {
      const latestData = await getLatestStationData(station.station_id);
      
      const windSensor = latestData.find(d => d.sensor.sensor_type === 'wind_speed');
      const pressureSensor = latestData.find(d => d.sensor.sensor_type === 'air_pressure');

      const windSpeed = windSensor?.latestData?.value || 0;
      const pressure = pressureSensor?.latestData?.value || 1013;

      // Mock pressure drop (compare to standard 1013 hPa)
      const pressureDrop = Math.abs(1013 - pressure);

      let risk_level: RiskLevel;
      let risk_score: number;

      if (windSpeed > 20 || pressureDrop > 10) {
        risk_level = 'high';
        risk_score = 8.0;
      } else if (windSpeed > 15 || pressureDrop > 5) {
        risk_level = 'medium';
        risk_score = 4.5;
      } else {
        risk_level = 'low';
        risk_score = 1.5;
      }

      stationRisks.push({
        station_id: station.station_id,
        station_name: station.station_name,
        province: station.province,
        risk_level,
        risk_score,
        details: {
          wind_speed: Math.round(windSpeed * 10) / 10,
          pressure: Math.round(pressure * 10) / 10,
          pressure_drop: Math.round(pressureDrop * 10) / 10,
        },
      });
    } catch (error) {
      console.error(`Error calculating storm risk for station ${station.station_id}:`, error);
      stationRisks.push({
        station_id: station.station_id,
        station_name: station.station_name,
        province: station.province,
        risk_level: 'low',
        risk_score: 0,
      });
    }
  }

  return summarizePillar(stationRisks);
}

/**
 * Calculate Disease Risk (BUS Algorithm)
 * ใช้ BUS Algorithm ที่มีอยู่แล้ว
 */
export async function calculateDiseaseRisk(days: number = 10): Promise<PillarSummary> {
  const stations = await getAllStations();
  const stationRisks: StationRisk[] = [];

  for (const station of stations) {
    try {
      const hourlyData = await getHourlyTempHumidityData(station.station_id, days);
      
      if (hourlyData.length === 0) {
        stationRisks.push({
          station_id: station.station_id,
          station_name: station.station_name,
          province: station.province,
          risk_level: 'low',
          risk_score: 0,
          details: { bus_score: 0, message: 'No data available' },
        });
        continue;
      }

      const busResult = calculateBUS(hourlyData);

      stationRisks.push({
        station_id: station.station_id,
        station_name: station.station_name,
        province: station.province,
        risk_level: busResult.risk_level,
        risk_score: busResult.bus_score,
        details: {
          bus_score: busResult.bus_score,
          lwd_hours: busResult.lwd_hours,
          temperature_avg: busResult.temperature_avg,
          humidity_avg: busResult.humidity_avg,
        },
      });
    } catch (error) {
      console.error(`Error calculating disease risk for station ${station.station_id}:`, error);
      stationRisks.push({
        station_id: station.station_id,
        station_name: station.station_name,
        province: station.province,
        risk_level: 'low',
        risk_score: 0,
      });
    }
  }

  return summarizePillar(stationRisks);
}

/**
 * Summarize pillar data
 */
function summarizePillar(stationRisks: StationRisk[]): PillarSummary {
  const highRiskStations = stationRisks.filter(s => s.risk_level === 'high');
  const mediumRiskStations = stationRisks.filter(s => s.risk_level === 'medium');
  const lowRiskStations = stationRisks.filter(s => s.risk_level === 'low');

  // Overall risk level: ถ้ามี high > 25% → high, มี medium > 50% → medium, อื่นๆ → low
  let overallRisk: RiskLevel = 'low';
  const total = stationRisks.length;
  if (highRiskStations.length > total * 0.25) {
    overallRisk = 'high';
  } else if (mediumRiskStations.length > total * 0.5) {
    overallRisk = 'medium';
  }

  return {
    risk_level: overallRisk,
    affected_stations: highRiskStations.length + mediumRiskStations.length,
    high_risk_count: highRiskStations.length,
    medium_risk_count: mediumRiskStations.length,
    low_risk_count: lowRiskStations.length,
    stations: stationRisks,
  };
}

/**
 * Get complete 4 Pillars summary
 */
export async function getRiskDashboardSummary(days: number = 10): Promise<RiskDashboardSummary> {
  const [drought, flood, storm, disease] = await Promise.all([
    calculateDroughtRisk(),
    calculateFloodRisk(),
    calculateStormRisk(),
    calculateDiseaseRisk(days),
  ]);

  const stations = await getAllStations();

  return {
    drought,
    flood,
    storm,
    disease,
    total_stations: stations.length,
    last_updated: new Date().toISOString(),
  };
}
