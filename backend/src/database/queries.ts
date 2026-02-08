import { pool } from './connection.js';
import type { 
  Station, Sensor, SensorData, Alert, Threshold, User, Role 
} from '../types.js';

// ==================== STATION QUERIES ====================

export async function findStationByDeviceId(deviceId: string): Promise<Station | null> {
  const result = await pool.query<Station>(
    'SELECT * FROM station WHERE device_id = $1',
    [deviceId]
  );
  return result.rows[0] || null;
}

export async function getAllStations(): Promise<Station[]> {
  const result = await pool.query<Station>(
    'SELECT * FROM station ORDER BY station_name'
  );
  return result.rows;
}

export async function getStationById(stationId: number): Promise<Station | null> {
  const result = await pool.query<Station>(
    'SELECT * FROM station WHERE station_id = $1',
    [stationId]
  );
  return result.rows[0] || null;
}

export async function updateStationStatus(
  stationId: number, 
  status: Station['status']
): Promise<void> {
  await pool.query(
    'UPDATE station SET status = $1 WHERE station_id = $2',
    [status, stationId]
  );
}

// ==================== SENSOR QUERIES ====================

export async function getSensorsByStationId(stationId: number): Promise<Sensor[]> {
  const result = await pool.query<Sensor>(
    'SELECT * FROM sensor WHERE station_id = $1 ORDER BY sensor_type',
    [stationId]
  );
  return result.rows;
}

export async function getSensorById(sensorId: number): Promise<Sensor | null> {
  const result = await pool.query<Sensor>(
    'SELECT * FROM sensor WHERE sensor_id = $1',
    [sensorId]
  );
  return result.rows[0] || null;
}

export async function findSensorByStationAndType(
  stationId: number,
  sensorType: string
): Promise<Sensor | null> {
  const result = await pool.query<Sensor>(
    'SELECT * FROM sensor WHERE station_id = $1 AND sensor_type = $2',
    [stationId, sensorType]
  );
  return result.rows[0] || null;
}

// ==================== SENSOR DATA QUERIES ====================

export async function insertSensorData(
  sensorId: number,
  value: number,
  recordedAt: Date
): Promise<SensorData> {
  const result = await pool.query<SensorData>(
    `INSERT INTO sensor_data (sensor_id, value, recorded_at) 
     VALUES ($1, $2, $3) 
     RETURNING *`,
    [sensorId, value, recordedAt]
  );
  return result.rows[0];
}

export async function getSensorDataRange(
  sensorId: number,
  fromDate: Date,
  toDate: Date
): Promise<SensorData[]> {
  const result = await pool.query<SensorData>(
    `SELECT * FROM sensor_data 
     WHERE sensor_id = $1 
       AND recorded_at BETWEEN $2 AND $3 
     ORDER BY recorded_at ASC`,
    [sensorId, fromDate, toDate]
  );
  return result.rows;
}

export async function getLatestSensorData(sensorId: number): Promise<SensorData | null> {
  const result = await pool.query<SensorData>(
    `SELECT * FROM sensor_data 
     WHERE sensor_id = $1 
     ORDER BY recorded_at DESC 
     LIMIT 1`,
    [sensorId]
  );
  return result.rows[0] || null;
}

// Get latest data for all sensors in a station
export async function getLatestStationData(stationId: number): Promise<{
  sensor: Sensor;
  latestData: SensorData | null;
}[]> {
  const result = await pool.query(`
    SELECT DISTINCT ON (s.sensor_id)
      s.sensor_id, s.station_id, s.sensor_type, s.status, s.installed_at,
      sd.data_id, sd.value, sd.recorded_at
    FROM sensor s
    LEFT JOIN sensor_data sd ON s.sensor_id = sd.sensor_id
    WHERE s.station_id = $1
    ORDER BY s.sensor_id, sd.recorded_at DESC NULLS LAST
  `, [stationId]);

  return result.rows.map(row => ({
    sensor: {
      sensor_id: row.sensor_id,
      station_id: row.station_id,
      sensor_type: row.sensor_type,
      status: row.status,
      installed_at: row.installed_at,
    },
    latestData: row.data_id ? {
      data_id: row.data_id,
      sensor_id: row.sensor_id,
      value: row.value,
      recorded_at: row.recorded_at,
    } : null,
  }));
}

// ==================== THRESHOLD QUERIES ====================

export async function getThresholdBySensorType(
  sensorType: string
): Promise<Threshold | null> {
  const result = await pool.query<Threshold>(
    'SELECT * FROM threshold WHERE sensor_type = $1',
    [sensorType]
  );
  return result.rows[0] || null;
}

export async function getAllThresholds(): Promise<Threshold[]> {
  const result = await pool.query<Threshold>(
    'SELECT * FROM threshold ORDER BY sensor_type'
  );
  return result.rows;
}

export async function createThreshold(
  sensorType: string,
  minValue: number,
  maxValue: number,
  createdBy: number
): Promise<Threshold> {
  const result = await pool.query<Threshold>(
    `INSERT INTO threshold (sensor_type, min_value, max_value, created_by) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
    [sensorType, minValue, maxValue, createdBy]
  );
  return result.rows[0];
}

export async function updateThreshold(
  thresholdId: number,
  minValue: number,
  maxValue: number
): Promise<Threshold | null> {
  const result = await pool.query<Threshold>(
    `UPDATE threshold 
     SET min_value = $1, max_value = $2, updated_at = CURRENT_TIMESTAMP 
     WHERE threshold_id = $3 
     RETURNING *`,
    [minValue, maxValue, thresholdId]
  );
  return result.rows[0] || null;
}

export async function getThresholdById(
  thresholdId: number
): Promise<Threshold | null> {
  const result = await pool.query<Threshold>(
    'SELECT * FROM threshold WHERE threshold_id = $1',
    [thresholdId]
  );
  return result.rows[0] || null;
}

// ==================== ALERT QUERIES ====================

export async function insertAlert(
  stationId: number,
  sensorId: number,
  dataId: number,
  alertType: string,
  alertMessage: string,
  severity: Alert['severity']
): Promise<Alert> {
  const result = await pool.query<Alert>(
    `INSERT INTO alert 
     (station_id, sensor_id, data_id, alert_type, alert_message, severity) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING *`,
    [stationId, sensorId, dataId, alertType, alertMessage, severity]
  );
  return result.rows[0];
}

export async function getAlertsByStationId(
  stationId: number,
  limit: number = 50
): Promise<Alert[]> {
  const result = await pool.query<Alert>(
    `SELECT * FROM alert 
     WHERE station_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [stationId, limit]
  );
  return result.rows;
}

export async function getRecentAlerts(limit: number = 50): Promise<Alert[]> {
  const result = await pool.query<Alert>(
    `SELECT * FROM alert 
     ORDER BY created_at DESC 
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getUnacknowledgedAlerts(): Promise<Alert[]> {
  const result = await pool.query<Alert>(
    `SELECT * FROM alert 
     WHERE is_acknowledged = FALSE 
     ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function acknowledgeAlert(alertId: number): Promise<void> {
  await pool.query(
    'UPDATE alert SET is_acknowledged = TRUE WHERE alert_id = $1',
    [alertId]
  );
}

// ==================== USER QUERIES ====================

export async function getUserByUsername(username: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT u.*, r.role_name as role 
     FROM "User" u 
     JOIN "Role" r ON u.role_id = r.role_id 
     WHERE u.username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

export async function getUserById(userId: number): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT u.*, r.role_name as role 
     FROM "User" u 
     JOIN "Role" r ON u.role_id = r.role_id 
     WHERE u.user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function getAllUsers(): Promise<User[]> {
  const result = await pool.query<User>(
    `SELECT u.*, r.role_name as role 
     FROM "User" u 
     JOIN "Role" r ON u.role_id = r.role_id 
     ORDER BY u.username`
  );
  return result.rows;
}

export async function createUser(
  username: string,
  passwordHash: string,
  email: string,
  roleId: number
): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO "User" (username, password_hash, email, role_id, status) 
     VALUES ($1, $2, $3, $4, 'active') 
     RETURNING *`,
    [username, passwordHash, email, roleId]
  );
  return result.rows[0];
}
