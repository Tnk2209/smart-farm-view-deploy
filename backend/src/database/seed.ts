console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📂 seed.ts file loaded successfully');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

import { pool } from './connection.js';
import { hashPassword } from '../utils/auth.js';
import type { SensorType } from '../types.js';

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
      INSERT INTO Role (role_name) VALUES 
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
        `INSERT INTO "User" (username, password_hash, email, role_id, status) 
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (username) DO NOTHING`,
        [user.username, demoPassword, user.email, user.roleId]
      );
    }
    console.log(`✅ ${users.length} demo users inserted`);
    console.log('   📌 All demo users use password: "demo123"\n');

    // 3. Insert Sample Stations (3 stations for demo)
    console.log('📝 Inserting sample stations...');
    const stations = [
      {
        device_id: 'IG502-ABC123',
        name: 'Chiang Mai Agricultural Station',
        province: 'Chiang Mai',
        lat: 18.7883,
        lng: 98.9853,
      },
      {
        device_id: 'IG502-DEF456',
        name: 'Nakhon Ratchasima Research Station',
        province: 'Nakhon Ratchasima',
        lat: 14.9799,
        lng: 102.0977,
      },
      {
        device_id: 'IG502-GHI789',
        name: 'Ubon Ratchathani Farm Station',
        province: 'Ubon Ratchathani',
        lat: 15.2287,
        lng: 104.8564,
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

    // 4. Insert Sensors for each station
    console.log('📝 Inserting sensors...');
    const sensorTypes: SensorType[] = [
      'wind_speed',
      'air_temperature',
      'air_humidity',
      'air_pressure',
      'rainfall',
      'soil_moisture',
      'soil_temperature',
      'cabinet_temperature',
      'cabinet_humidity',
      'solar_voltage',
      'battery_voltage',
      'gate_door',
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

    // 5. Insert Thresholds
    console.log('📝 Inserting thresholds...');
    const thresholds = [
      { type: 'wind_speed', min: 0, max: 25 },
      { type: 'air_temperature', min: 15, max: 35 },
      { type: 'air_humidity', min: 30, max: 85 },
      { type: 'air_pressure', min: 990, max: 1020 },
      { type: 'rainfall', min: 0, max: 40 },
      { type: 'soil_moisture', min: 25, max: 75 },
      { type: 'soil_temperature', min: 20, max: 32 },
      { type: 'cabinet_temperature', min: 20, max: 45 },
      { type: 'cabinet_humidity', min: 35, max: 65 },
      { type: 'solar_voltage', min: 12, max: 24 },
      { type: 'battery_voltage', min: 11.5, max: 13.5 },
      { type: 'gate_door', min: 0, max: 1 },
    ];

    for (const threshold of thresholds) {
      await client.query(
        `INSERT INTO threshold (sensor_type, min_value, max_value, created_by) 
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (sensor_type) DO NOTHING`,
        [threshold.type, threshold.min, threshold.max]
      );
    }
    console.log(`✅ ${thresholds.length} thresholds inserted\n`);

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
if (import.meta.url === `file://${process.argv[1]}`) {
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
}
