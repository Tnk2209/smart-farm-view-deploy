console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📂 seed.ts file loaded successfully');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

import { pool } from './connection.js';
import { hashPassword } from '../utils/auth.js';
import type { SensorType, StatusType } from '../types.js';

/**
 * Seed initial data for testing and development
 */
export async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Seeding database...\n');

    // 1. Insert Roles
    console.log('📝 Inserting roles...');
    await client.query(`
      INSERT INTO role (role_name) VALUES 
      ('USER'), ('MANAGER'), ('SUPER_USER')
      ON CONFLICT (role_name) DO NOTHING
    `);
    console.log('✅ Roles inserted\n');

    // 2. Insert Demo Users with hashed passwords
    console.log('📝 Inserting demo users...');
    
    // Hash passwords for demo users
    const demoPassword = await hashPassword('demo123'); // Same password for all demo users
    
    const users = [
      { username: 'demo', email: 'demo@smartfarm.com', role: 'USER', roleId: 1 },
      { username: 'manager', email: 'manager@smartfarm.com', role: 'MANAGER', roleId: 2 },
      { username: 'admin', email: 'admin@smartfarm.com', role: 'SUPER_USER', roleId: 3 },
    ];

    for (const user of users) {
      await client.query(
        `INSERT INTO "user" (username, password_hash, email, role_id, status) 
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (username) DO NOTHING`,
        [user.username, demoPassword, user.email, user.roleId]
      );
    }
    console.log(`✅ ${users.length} demo users inserted`);
    console.log('   📌 All demo users use password: "demo123"\n');

    // 3. Insert Sample Stations (Real device from site RDS0001)
    console.log('📝 Inserting sample stations...');
    const stations = [
      {
        device_id: 'RDG0001',
        name: 'RDS0001 - Studio 1.0.6 Park Station',
        province: 'Bangkok',
        lat: 13.99185719909398,
        lng: 100.54287798095395,
      },
    ];

    for (const station of stations) {
      await client.query(
        `INSERT INTO station (device_id, station_name, province, latitude, longitude, status) 
         VALUES ($1, $2, $3, $4, $5, 'normal')
         ON CONFLICT (device_id) DO NOTHING`,
        [station.device_id, station.name, station.province, station.lat, station.lng]
      );
    }
    console.log(`✅ ${stations.length} stations inserted\n`);

    // 4. Insert Sensors for each station (Environmental sensors only)
    console.log('📝 Inserting sensors...');
    const sensorTypes: SensorType[] = [
      'wind_speed_ms',
      'air_temp_c',
      'air_rh_pct',
      'air_pressure_kpa',
      'rain_rate_mmph',
      'rain_mm',
      'soil_rh_pct',
      'soil_temp_c',
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
    console.log(`✅ ${sensorCount} sensors inserted`);
    console.log(`   📌 Note: Status/device health data stored separately in station_status table\n`);

    // 5. Insert Thresholds (for environmental sensors only)
    console.log('📝 Inserting thresholds...');
    const thresholds = [
      { type: 'wind_speed_ms', min: 0, max: 25 },
      { type: 'air_temp_c', min: 15, max: 40 },
      { type: 'air_rh_pct', min: 20, max: 95 },
      { type: 'air_pressure_kpa', min: 95, max: 105 },
      { type: 'rain_rate_mmph', min: 0, max: 50 },
      { type: 'rain_mm', min: 0, max: 500 },
      { type: 'soil_rh_pct', min: 20, max: 80 },
      { type: 'soil_temp_c', min: 15, max: 35 },
    ];

    for (const threshold of thresholds) {
      await client.query(
        `INSERT INTO threshold (sensor_type, min_value, max_value, created_by) 
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (sensor_type) DO NOTHING`,
        [threshold.type, threshold.min, threshold.max]
      );
    }
    console.log(`✅ ${thresholds.length} thresholds inserted`);
    console.log(`   📌 Note: Status data (battery, solar, etc.) has no thresholds - monitoring only\n`);

    console.log('🎉 Database seeded successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Users: ${users.length} (password: demo123)`);
    console.log(`   - Stations: ${stations.length}`);
    console.log(`   - Sensors: ${sensorCount}`);
    console.log(`   - Thresholds: ${thresholds.length}`);

  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run seeding if this file is executed directly
  console.log('🚀 Starting seed process...\n');
  seedDatabase()
    .then(() => {
      console.log('\n✅ Seed script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seed script failed:');
      console.error(error);
      process.exit(1);
    });