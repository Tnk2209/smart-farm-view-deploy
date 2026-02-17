import { pool } from './connection.js';
import type {
  Station, Sensor, SensorData, Alert, Threshold, User, Role, FarmPlot
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
    `SELECT *, 
      (SELECT COUNT(*)::int FROM sensor WHERE sensor.station_id = station.station_id) as sensor_count,
      (SELECT COUNT(*)::int FROM alert WHERE alert.station_id = station.station_id AND alert.is_acknowledged = FALSE) as alert_count,
      (SELECT MAX(sd.recorded_at) 
       FROM sensor_data sd 
       JOIN sensor s ON sd.sensor_id = s.sensor_id 
       WHERE s.station_id = station.station_id) as last_active
     FROM station 
     ORDER BY station_name`
  );
  return result.rows;
}

export async function getStationById(stationId: number): Promise<Station | null> {
  const result = await pool.query<Station>(
    `SELECT *, 
      (SELECT COUNT(*)::int FROM sensor WHERE sensor.station_id = station.station_id) as sensor_count 
     FROM station 
     WHERE station_id = $1`,
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

export async function createStation(
  deviceId: string,
  stationName: string,
  province: string,
  latitude: number,
  longitude: number
): Promise<Station> {
  const result = await pool.query<Station>(
    `INSERT INTO station (device_id, station_name, province, latitude, longitude, status) 
     VALUES ($1, $2, $3, $4, $5, 'normal') 
     RETURNING *`,
    [deviceId, stationName, province, latitude, longitude]
  );
  return result.rows[0];
}

export async function updateStation(
  stationId: number,
  stationName: string,
  province: string,
  latitude: number,
  longitude: number,
  status: Station['status']
): Promise<Station | null> {
  const result = await pool.query<Station>(
    `UPDATE station 
     SET station_name = $1, province = $2, latitude = $3, longitude = $4, status = $5 
     WHERE station_id = $6 
     RETURNING *`,
    [stationName, province, latitude, longitude, status, stationId]
  );
  return result.rows[0] || null;
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

export async function getAllSensors(): Promise<Sensor[]> {
  const result = await pool.query<Sensor>(
    `SELECT s.*, st.station_name 
     FROM sensor s
     LEFT JOIN station st ON s.station_id = st.station_id
     ORDER BY s.station_id, s.sensor_type`
  );
  return result.rows;
}

export async function createSensor(
  stationId: number,
  sensorType: string
): Promise<Sensor> {
  const result = await pool.query<Sensor>(
    `INSERT INTO sensor (station_id, sensor_type, status) 
     VALUES ($1, $2, 'active') 
     RETURNING *`,
    [stationId, sensorType]
  );
  return result.rows[0];
}

export async function updateSensor(
  sensorId: number,
  sensorType: string,
  status: Sensor['status']
): Promise<Sensor | null> {
  const result = await pool.query<Sensor>(
    `UPDATE sensor 
     SET sensor_type = $1, status = $2 
     WHERE sensor_id = $3 
     RETURNING *`,
    [sensorType, status, sensorId]
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
): Promise<Alert[]> {
  const result = await pool.query<Alert>(
    `SELECT a.*, s.station_name, se.sensor_type FROM alert a
     JOIN station s ON a.station_id = s.station_id
     JOIN sensor se ON a.sensor_id = se.sensor_id
     WHERE a.station_id = $1 
     ORDER BY a.created_at DESC `,
    [stationId]
  );
  return result.rows;
}

export async function getRecentAlerts(): Promise<Alert[]> {
  const result = await pool.query<Alert>(
    `SELECT a.*, s.station_name, se.sensor_type FROM alert a
     JOIN station s ON a.station_id = s.station_id
     JOIN sensor se ON a.sensor_id = se.sensor_id
     ORDER BY a.created_at DESC `,
    []
  );
  return result.rows;
}

export async function getAlertById(alertId: number): Promise<Alert | null> {
  const result = await pool.query<Alert>(
    'SELECT * FROM alert WHERE alert_id = $1',
    [alertId]
  );
  return result.rows[0] || null;
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
  roleId: number,
  firstName?: string,
  lastName?: string,
  nationalId?: string,
  phoneNumber?: string
): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO "User" (username, password_hash, email, role_id, first_name, last_name, national_id, phone_number, status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active') 
     RETURNING *`,
    [username, passwordHash, email, roleId, firstName || null, lastName || null, nationalId || null, phoneNumber || null]
  );

  return result.rows[0];
}

export async function updateUser(
  userId: number,
  username: string,
  email: string,
  roleId: number,
  status: User['status'],
  firstName?: string,
  lastName?: string,
  nationalId?: string,
  phoneNumber?: string
): Promise<User | null> {
  const result = await pool.query<User>(
    `UPDATE "User" 
     SET username = $1, email = $2, role_id = $3, status = $4, 
         first_name = $5, last_name = $6, national_id = $7, phone_number = $8
     WHERE user_id = $9 
     RETURNING *`,
    [username, email, roleId, status, firstName || null, lastName || null, nationalId || null, phoneNumber || null, userId]
  );
  return result.rows[0] || null;
}

export async function updateUserPassword(
  userId: number,
  passwordHash: string
): Promise<void> {
  await pool.query(
    'UPDATE "User" SET password_hash = $1 WHERE user_id = $2',
    [passwordHash, userId]
  );
}

// ==================== ROLE QUERIES ====================

export async function getAllRoles(): Promise<Role[]> {
  const result = await pool.query<Role>(
    'SELECT * FROM "Role" ORDER BY role_id'
  );
  return result.rows;
}

export async function getRoleById(roleId: number): Promise<Role | null> {
  const result = await pool.query<Role>(
    'SELECT * FROM "Role" WHERE role_id = $1',
    [roleId]
  );
  return result.rows[0] || null;
}

// ==================== FARM PLOT QUERIES (UC10, UC11) ====================

/**
 * Create new farm plot registration (UC10)
 * Status defaults to 'pending' (requires Super User approval)
 */
export async function createFarmPlot(
  userId: number,
  lat: number,
  lon: number,
  utmCoords?: string,
  landTitleDeed?: string,
  areaSizeRai?: number
): Promise<FarmPlot> {
  const result = await pool.query<FarmPlot>(
    `INSERT INTO farm_plot (user_id, lat, lon, utm_coords, land_title_deed, area_size_rai, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING *`,
    [userId, lat, lon, utmCoords || null, landTitleDeed || null, areaSizeRai || null]
  );
  return result.rows[0];
}

/**
 * Get all farm plots (Super User only for approval)
 */
export async function getAllFarmPlots(): Promise<FarmPlot[]> {
  const result = await pool.query<FarmPlot>(
    `SELECT * FROM farm_plot ORDER BY created_at DESC`
  );
  return result.rows;
}

/**
 * Get farm plots by user (Farmer's own plots)
 */
export async function getFarmPlotsByUserId(userId: number): Promise<FarmPlot[]> {
  const result = await pool.query<FarmPlot>(
    `SELECT * FROM farm_plot WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get farm plot by ID
 */
export async function getFarmPlotById(plotId: number): Promise<FarmPlot | null> {
  const result = await pool.query<FarmPlot>(
    `SELECT * FROM farm_plot WHERE plot_id = $1`,
    [plotId]
  );
  return result.rows[0] || null;
}

/**
 * Update farm plot status (UC11: Approve/Reject by Super User)
 */
export async function updateFarmPlotStatus(
  plotId: number,
  status: 'pending' | 'active' | 'rejected',
  nearestStationId?: number
): Promise<FarmPlot | null> {
  const result = await pool.query<FarmPlot>(
    `UPDATE farm_plot 
     SET status = $1, nearest_station_id = $2, updated_at = CURRENT_TIMESTAMP
     WHERE plot_id = $3
     RETURNING *`,
    [status, nearestStationId || null, plotId]
  );
  return result.rows[0] || null;
}

/**
 * Calculate nearest station for a farm plot
 * Uses Haversine formula for distance calculation
 */
export async function findNearestStation(lat: number, lon: number): Promise<Station | null> {
  const result = await pool.query<Station & { distance: number }>(
    `SELECT *, 
     (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * 
     cos(radians(longitude) - radians($2)) + sin(radians($1)) * 
     sin(radians(latitude)))) AS distance
     FROM station
     WHERE status != 'offline'
     ORDER BY distance
     LIMIT 1`,
    [lat, lon]
  );
  return result.rows[0] || null;
}

// ==================== DISEASE RISK (BUS ALGORITHM) QUERIES ====================

/**
 * Get hourly temperature and humidity data for BUS Algorithm calculation
 * Returns data from the last N days for a specific station
 */
export async function getHourlyTempHumidityData(
  stationId: number,
  days: number = 10
): Promise<Array<{ timestamp: string; temperature: number; humidity: number }>> {
  // Get sensor IDs for air_temperature and air_humidity
  const tempSensor = await findSensorByStationAndType(stationId, 'air_temperature');
  const humSensor = await findSensorByStationAndType(stationId, 'air_humidity');

  if (!tempSensor || !humSensor) {
    return [];
  }

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  // Query to get hourly data by truncating timestamps to the hour
  const result = await pool.query<{ hour: string; temperature: number; humidity: number }>(`
    SELECT 
      DATE_TRUNC('hour', temp_data.recorded_at) AS hour,
      AVG(temp_data.value) AS temperature,
      AVG(hum_data.value) AS humidity
    FROM sensor_data temp_data
    INNER JOIN sensor_data hum_data 
      ON DATE_TRUNC('hour', temp_data.recorded_at) = DATE_TRUNC('hour', hum_data.recorded_at)
    WHERE temp_data.sensor_id = $1
      AND hum_data.sensor_id = $2
      AND temp_data.recorded_at >= $3
      AND hum_data.recorded_at >= $3
    GROUP BY DATE_TRUNC('hour', temp_data.recorded_at)
    ORDER BY hour ASC
  `, [tempSensor.sensor_id, humSensor.sensor_id, fromDate]);

  return result.rows.map(row => ({
    timestamp: row.hour,
    temperature: Number(row.temperature),
    humidity: Number(row.humidity),
  }));
}
