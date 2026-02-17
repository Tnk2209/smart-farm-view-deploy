import type { StatusMessage, StatusType } from '../types.js';
import { STATUS_FIELD_MAPPING } from '../types.js';
import {
  findStationByDeviceId,
  insertStationStatus,
} from '../database/queries.js';

export interface ParsedStatusReading {
  statusType: StatusType;
  value: number;
}

export interface StatusIngestResult {
  success: boolean;
  recordsCreated: number;
  stationId: number;
  message: string;
  errors?: string[];
}

/**
 * Parse status message and extract device health readings
 */
export function parseStatusData(status: StatusMessage): ParsedStatusReading[] {
  const readings: ParsedStatusReading[] = [];

  for (const [fieldName, value] of Object.entries(status.data)) {
    if (value === null || value === undefined) continue;

    const statusType = STATUS_FIELD_MAPPING[fieldName];
    if (statusType && typeof value === 'number') {
      readings.push({ statusType, value });
    }
  }

  return readings;
}

/**
 * Validate status message structure
 */
export function validateStatusMessage(message: any): message is StatusMessage {
  if (!message || typeof message !== 'object') return false;
  if (!message.device_id || typeof message.device_id !== 'string') return false;
  if (!message.ts || typeof message.ts !== 'string') return false;
  if (!message.data || typeof message.data !== 'object') return false;
  
  return true;
}

/**
 * Process status message and save to database
 * This is the main function called when MQTT status message arrives
 */
export async function processStatusMessage(
  status: StatusMessage
): Promise<StatusIngestResult> {
  console.log(`🔋 Processing status from device: ${status.device_id}`);

  const errors: string[] = [];
  let recordsCreated = 0;

  try {
    // STEP 1: Find station by device_id
    const station = await findStationByDeviceId(status.device_id);

    if (!station) {
      return {
        success: false,
        recordsCreated: 0,
        stationId: -1,
        message: `Station not found for device_id: ${status.device_id}`,
      };
    }

    console.log(`  ✅ Found station: ${station.station_name} (ID: ${station.station_id})`);

    // STEP 2: Parse status data
    const readings = parseStatusData(status);
    console.log(`  ✅ Parsed ${readings.length} status readings`);

    if (readings.length === 0) {
      return {
        success: false,
        recordsCreated: 0,
        stationId: station.station_id,
        message: `No valid status data found in message`,
      };
    }

    // STEP 3: Prepare data object for insertion
    const recordedAt = new Date(status.ts);
    const statusData: any = {};

    for (const reading of readings) {
      statusData[reading.statusType] = reading.value;
    }

    // STEP 4: Insert station status data
    await insertStationStatus(station.station_id, statusData, recordedAt);
    recordsCreated = 1;

    console.log(`  ✅ Station status record created`);

    return {
      success: true,
      recordsCreated,
      stationId: station.station_id,
      message: `Status data saved successfully for station ${station.station_name}`,
      errors: errors.length > 0 ? errors : undefined,
    };

  } catch (error) {
    console.error('❌ Error processing status message:', error);
    return {
      success: false,
      recordsCreated,
      stationId: -1,
      message: `Error processing status message: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
