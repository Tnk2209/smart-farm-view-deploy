

import { pool } from './connection.js';

/**
 * Create all database tables according to ERD
 * Run this migration file to set up the database schema
 */
export async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running database migrations...');

    // Create Role table
    await client.query(`
      CREATE TABLE IF NOT EXISTS Role (
        role_id SERIAL PRIMARY KEY,
        role_name VARCHAR(50) UNIQUE NOT NULL
      )
    `);
    console.log('✅ Table "Role" created');

    // Create user table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        national_id VARCHAR(20),
        phone_number VARCHAR(20),
        role_id INTEGER NOT NULL REFERENCES Role(role_id),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "user" created');

    // Create station table (lowercase)
    await client.query(`
      CREATE TABLE IF NOT EXISTS station (
        station_id SERIAL PRIMARY KEY,
        device_id VARCHAR(100) UNIQUE NOT NULL,
        station_name VARCHAR(255) NOT NULL,
        province VARCHAR(100) NOT NULL,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        status VARCHAR(20) DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'critical', 'offline')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "station" created');

    // Create sensor table (lowercase)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sensor (
        sensor_id SERIAL PRIMARY KEY,
        station_id INTEGER NOT NULL REFERENCES station(station_id) ON DELETE CASCADE,
        sensor_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
        installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(station_id, sensor_type)
      )
    `);
    console.log('✅ Table "sensor" created');

    // Create sensor_data table (lowercase with underscore)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sensor_data (
        data_id BIGSERIAL PRIMARY KEY,
        sensor_id INTEGER NOT NULL REFERENCES sensor(sensor_id) ON DELETE CASCADE,
        value FLOAT NOT NULL,
        recorded_at TIMESTAMP NOT NULL
      )
    `);
    console.log('✅ Table "sensor_data" created');

    // Create index for time-series queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sensor_time 
      ON sensor_data(sensor_id, recorded_at DESC)
    `);
    console.log('✅ Index "idx_sensor_time" created');

    // Create threshold table (lowercase)
    await client.query(`
      CREATE TABLE IF NOT EXISTS threshold (
        threshold_id SERIAL PRIMARY KEY,
        sensor_type VARCHAR(50) UNIQUE NOT NULL,
        min_value FLOAT NOT NULL,
        max_value FLOAT NOT NULL,
        created_by INTEGER REFERENCES "user"(user_id),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (min_value < max_value)
      )
    `);
    console.log('✅ Table "threshold" created');

    // Create alert table (lowercase)
    await client.query(`
      CREATE TABLE IF NOT EXISTS alert (
        alert_id SERIAL PRIMARY KEY,
        station_id INTEGER NOT NULL REFERENCES station(station_id) ON DELETE CASCADE,
        sensor_id INTEGER NOT NULL REFERENCES sensor(sensor_id) ON DELETE CASCADE,
        data_id BIGINT REFERENCES sensor_data(data_id),
        alert_type VARCHAR(50) NOT NULL,
        alert_message TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        is_acknowledged BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "alert" created');

    // Create index for alert queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_station 
      ON alert(station_id, created_at DESC)
    `);
    console.log('✅ Index "idx_alert_station" created');

    // Create farm_plot table (New Update:2 - UC10, UC11)
    await client.query(`
      CREATE TABLE IF NOT EXISTS farm_plot (
        plot_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
        lat DOUBLE PRECISION NOT NULL,
        lon DOUBLE PRECISION NOT NULL,
        utm_coords VARCHAR(50),
        nearest_station_id INTEGER REFERENCES station(station_id) ON DELETE SET NULL,
        land_title_deed VARCHAR(50),
        area_size_rai FLOAT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "farm_plot" created');

    // Create index for farm_plot queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_farm_plot_user 
      ON farm_plot(user_id, created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_farm_plot_station 
      ON farm_plot(nearest_station_id)
    `);
    console.log('✅ Indexes for "farm_plot" created');

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migrations if this file is executed directly
  console.log('🚀 Starting migration process...\n');
  runMigrations()
    .then(() => {
      console.log('\n✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:');
      console.error(error);
      process.exit(1);
    });

