import type { TelemetryMessage, SensorType } from '../types.js';
import { TELEMETRY_FIELD_MAPPING } from '../types.js';
import {
  findStationByDeviceId,
  getSensorsByStationId,
  insertSensorData,
  getThresholdBySensorType,
  insertAlert,
  findSensorByStationAndType,
  updateStationStatus
} from '../database/queries.js';
import type { StationStatus } from '../types.js';

export interface ParsedSensorReading {
  sensorType: SensorType;
  value: number;
}

export interface TelemetryIngestResult {
  success: boolean;
  recordsCreated: number;
  alertsTriggered: number;
  stationId: number;
  message: string;
  errors?: string[];
}

/**
 * Parse telemetry message and extract sensor readings
 */
export function parseTelemetryData(telemetry: TelemetryMessage): ParsedSensorReading[] {
  const readings: ParsedSensorReading[] = [];

  for (const [fieldName, value] of Object.entries(telemetry.data)) {
    if (value === null || value === undefined) continue;

    const sensorType = TELEMETRY_FIELD_MAPPING[fieldName];
    if (sensorType && typeof value === 'number') {
      readings.push({ sensorType, value });
    }
  }

  return readings;
}

/**
 * Process telemetry message and save to database
 * This is the main function called when MQTT message arrives
 */
export async function processTelemetryMessage(
  telemetry: TelemetryMessage
): Promise<TelemetryIngestResult> {
  console.log(`📡 Processing telemetry from device: ${telemetry.device_id}`);

  const errors: string[] = [];
  let recordsCreated = 0;
  let alertsTriggered = 0;

  try {
    // STEP 1: Find station by device_id
    const station = await findStationByDeviceId(telemetry.device_id);
    let currentStationStatus: StationStatus = 'normal';
    if (!station) {
      return {
        success: false,
        recordsCreated: 0,
        alertsTriggered: 0,
        stationId: -1,
        message: `Station not found for device_id: ${telemetry.device_id}`,
      };
    }

    console.log(`  ✅ Found station: ${station.station_name} (ID: ${station.station_id})`);

    // STEP 2: Get all sensors for this station
    const sensors = await getSensorsByStationId(station.station_id);
    const sensorMap = new Map(sensors.map(s => [s.sensor_type, s]));

    console.log(`  ✅ Found ${sensors.length} sensors for station`);

    // STEP 3: Parse telemetry data
    const readings = parseTelemetryData(telemetry);
    console.log(`  ✅ Parsed ${readings.length} sensor readings`);

    // STEP 4: Save sensor data and check thresholds
    const recordedAt = new Date(telemetry.ts);

    for (const reading of readings) {
      const sensor = sensorMap.get(reading.sensorType);

      if (!sensor) {
        errors.push(`Sensor type "${reading.sensorType}" not found for station ${station.station_id}`);
        continue;
      }

      try {
        // Insert sensor data
        const sensorData = await insertSensorData(
          sensor.sensor_id,
          reading.value,
          recordedAt
        );
        recordsCreated++;

        // Check threshold and create alert if violated
        const threshold = await getThresholdBySensorType(reading.sensorType);

        // DEBUG LOG
        // console.log(`[DEBUG] Checking threshold for ${reading.sensorType}: val=${reading.value}, th=${JSON.stringify(threshold)}`);

        if (threshold) {
          const isViolation =
            reading.value < threshold.min_value ||
            reading.value > threshold.max_value;

          if (isViolation) {
            console.log(`[VIOLATION] ${reading.sensorType} value ${reading.value} out of range [${threshold.min_value}, ${threshold.max_value}]`);

            let severity: 'low' | 'medium' | 'high' | 'critical' = 'high';

            if (
              reading.value < threshold.min_value * 0.6 ||
              reading.value > threshold.max_value * 1.4
            ) {
              severity = 'critical';
            } else if (
              reading.value < threshold.min_value * 0.8 ||
              reading.value > threshold.max_value * 1.2
            ) {
              severity = 'high';
            }

            // Update station status tracking
            if (severity === 'critical') {
              currentStationStatus = 'critical';
            } else if (severity === 'high' || severity === 'medium') {
              if (currentStationStatus !== 'critical') {
                currentStationStatus = 'warning';
              }
            }

            const message =
              reading.value < threshold.min_value
                ? `${reading.sensorType} is below threshold (${reading.value.toFixed(1)} < ${threshold.min_value})`
                : `${reading.sensorType} is above threshold (${reading.value.toFixed(1)} > ${threshold.max_value})`;

            console.log(`[ALERT] Inserting alert: ${message} (Severity: ${severity})`);

            const alert = await insertAlert(
              station.station_id,
              sensor.sensor_id,
              sensorData.data_id,
              'threshold_violation',
              message,
              severity
            );

            if (alert) {
              console.log(`  ✅ Alert inserted successfully: ID ${alert.alert_id}`);
              alertsTriggered++;
            } else {
              console.log(`  ❌ Alert insertion returned null/undefined`);
            }
          }
        } else {
          // console.log(`[DEBUG] No threshold found for ${reading.sensorType}`);
        }
      } catch (error) {
        console.error(`Error processing ${reading.sensorType}:`, error);
        errors.push(`Error processing ${reading.sensorType}: ${error}`);
      }
    }

    // STEP 5: Update Station Status
    if (station.status !== currentStationStatus) {
      console.log(`  🔄 Updating station status: ${station.status} -> ${currentStationStatus}`);
      await updateStationStatus(station.station_id, currentStationStatus);
    }

    return {
      success: true,
      recordsCreated,
      alertsTriggered,
      stationId: station.station_id,
      message: `Successfully processed telemetry from ${station.station_name}`,
      errors: errors.length > 0 ? errors : undefined,
    };

  } catch (error) {
    console.error('❌ Error processing telemetry:', error);
    return {
      success: false,
      recordsCreated,
      alertsTriggered,
      stationId: -1,
      message: `Error: ${error}`,
      errors,
    };
  }
}

/**
 * Validate telemetry message structure
 */
export function validateTelemetryMessage(payload: any): payload is TelemetryMessage {
  if (!payload || typeof payload !== 'object') return false;
  if (typeof payload.device_id !== 'string') return false;
  if (typeof payload.ts !== 'string') return false;
  if (!payload.data || typeof payload.data !== 'object') return false;
  return true;
}
