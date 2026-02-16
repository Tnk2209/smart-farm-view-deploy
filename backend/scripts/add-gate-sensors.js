// Add gate_door sensors to existing stations
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

console.log('🔐 Adding gate_door sensors to stations...\n');

const client = await pool.connect();

try {
  // Get all stations
  const stationResult = await client.query(
    'SELECT station_id, station_name FROM station ORDER BY station_id'
  );
  
  const stations = stationResult.rows;
  console.log(`📍 Found ${stations.length} stations\n`);

  // Add gate_door sensor to each station
  let addedCount = 0;
  let alreadyExistCount = 0;

  for (const station of stations) {
    const checkResult = await client.query(
      'SELECT sensor_id FROM sensor WHERE station_id = $1 AND sensor_type = $2',
      [station.station_id, 'gate_door']
    );

    if (checkResult.rows.length > 0) {
      console.log(`   ⚠️  Station ${station.station_id} (${station.station_name}) already has gate_door sensor`);
      alreadyExistCount++;
    } else {
      await client.query(
        `INSERT INTO sensor (station_id, sensor_type, status) 
         VALUES ($1, $2, 'active')`,
        [station.station_id, 'gate_door']
      );
      
      // Insert initial sensor data (gate closed = 0)
      const sensorResult = await client.query(
        'SELECT sensor_id FROM sensor WHERE station_id = $1 AND sensor_type = $2',
        [station.station_id, 'gate_door']
      );
      
      const sensorId = sensorResult.rows[0].sensor_id;
      
      await client.query(
        `INSERT INTO sensor_data (sensor_id, value, recorded_at) 
         VALUES ($1, $2, NOW())`,
        [sensorId, 0] // 0 = locked/closed, 1 = unlocked/open
      );

      console.log(`   ✅ Added gate_door sensor to Station ${station.station_id} (${station.station_name})`);
      addedCount++;
    }
  }

  console.log('\n🎉 Done!\n');
  console.log(`📊 Summary:`);
  console.log(`   - New sensors added: ${addedCount}`);
  console.log(`   - Already existed: ${alreadyExistCount}`);
  console.log(`   - Total stations: ${stations.length}`);
  console.log(`\n💡 Tip: Use SUPER_USER account to control locks from Station Detail page\n`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
  process.exit(0);
}
