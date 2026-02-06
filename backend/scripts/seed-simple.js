// Simple seed script that works without tsx
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'smart_farm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

console.log('🌱 Starting seed...\n');

const client = await pool.connect();

try {
  console.log('📝 Inserting roles...');
  await client.query(`
    INSERT INTO "Role" (role_name) VALUES 
    ('USER'), ('MANAGER'), ('SUPER_USER')
    ON CONFLICT (role_name) DO NOTHING
  `);
  console.log('✅ Roles inserted\n');

  console.log('📝 Inserting sample user...');
  await client.query(`
    INSERT INTO "User" (username, password_hash, email, role_id, status) 
    VALUES ('admin', 'hashed_password_here', 'admin@smartfarm.com', 3, 'active')
    ON CONFLICT (username) DO NOTHING
  `);
  console.log('✅ Sample user inserted\n');

  console.log('📝 Inserting sample stations...');
  const stations = [
    ['IG502-ABC123', 'Chiang Mai Agricultural Station', 'Chiang Mai', 18.7883, 98.9853],
    ['IG502-DEF456', 'Nakhon Ratchasima Research Station', 'Nakhon Ratchasima', 14.9799, 102.0977],
    ['IG502-GHI789', 'Ubon Ratchathani Farm Station', 'Ubon Ratchathani', 15.2287, 104.8564],
  ];

  for (const station of stations) {
    await client.query(
      `INSERT INTO station (device_id, station_name, province, latitude, longitude, status) 
       VALUES ($1, $2, $3, $4, $5, 'normal')
       ON CONFLICT (device_id) DO NOTHING`,
      station
    );
  }
  console.log(`✅ ${stations.length} stations inserted\n`);

  console.log('📝 Inserting sensors...');
  const sensorTypes = [
    'wind_speed', 'air_temperature', 'air_humidity', 'air_pressure', 'rainfall',
    'soil_moisture', 'soil_temperature', 'cabinet_temperature', 'cabinet_humidity',
    'solar_voltage', 'battery_voltage'
  ];

  const stationResult = await client.query('SELECT station_id FROM station');
  const stationIds = stationResult.rows.map(r => r.station_id);

  let sensorCount = 0;
  for (const stationId of stationIds) {
    for (const sensorType of sensorTypes) {
      await client.query(
        `INSERT INTO sensor (station_id, sensor_type, status) 
         VALUES ($1, $2, 'active')
         ON CONFLICT (station_id, sensor_type) DO NOTHING`,
        [stationId, sensorType]
      );
      sensorCount++;
    }
  }
  console.log(`✅ ${sensorCount} sensors inserted\n`);

  console.log('📝 Inserting thresholds...');
  const thresholds = [
    ['wind_speed', 0, 25],
    ['air_temperature', 15, 35],
    ['air_humidity', 30, 85],
    ['air_pressure', 990, 1020],
    ['rainfall', 0, 40],
    ['soil_moisture', 25, 75],
    ['soil_temperature', 20, 32],
    ['cabinet_temperature', 20, 45],
    ['cabinet_humidity', 35, 65],
    ['solar_voltage', 12, 24],
    ['battery_voltage', 11.5, 13.5],
  ];

  for (const threshold of thresholds) {
    await client.query(
      `INSERT INTO threshold (sensor_type, min_value, max_value, created_by) 
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (sensor_type) DO NOTHING`,
      threshold
    );
  }
  console.log(`✅ ${thresholds.length} thresholds inserted\n`);

  console.log('🎉 Database seeded successfully!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Stations: ${stations.length}`);
  console.log(`   - Sensors: ${sensorCount}`);
  console.log(`   - Thresholds: ${thresholds.length}\n`);

} catch (error) {
  console.error('❌ Seed failed:', error.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
  process.exit(0);
}
